/**
 * M10 §A.4 and the reader lint: the page is a story, and the book's machinery
 * belongs in the notebook.
 *
 * Read over a whole run, page by page, the way a player reads it:
 *
 * - **Words that never appear in narration or dialogue:** grid, margin, rule,
 *   lead, beat, card (in the sense of the book's own machinery), "the notebook
 *   had…", "put it on the grid", and "the coroner's hours" as a noun phrase.
 * - **Garbled errands** seen in play: "On X's word, I asked X about…", "I came
 *   to put X to Y." — and the empty thought "I wrote it down and thought about
 *   it."
 * - **No quoted generator sentence:** no clue's `text` or `rule` inside
 *   quotation marks on a page.
 * - **No question repeated within a page.**
 * - **At most three fact families told on one page** (§A.3), and at most three
 *   finds on a search.
 * - **Presence described once a visit:** nobody gets a second presence line
 *   between walking into a room and walking out of it, and a recall ("…again")
 *   is used at most once a visit.
 *
 * docs/25's read-through (docs/26), where a text check can see it:
 *
 * - **No verdict from Poached up:** "Brennan was out of it", "That cleared
 *   Weisglass", "I crossed Zeldin off". An explained secret explains a lie.
 * - **An anchor's hour told once a night:** a sentence naming the anchor and
 *   its hour, said on one page and again on a later one, or twice on one page.
 *   The window thought's "if it happened at ten, it happened under the train"
 *   is reasoning, not the hour told again, and is not counted.
 * - **Two anchored sightings, two clauses:** never "at the Automat once and
 *   here once".
 * - **First sight is a description:** never the relation stacked on it ("He
 *   was in Renfro's debt, a man in his fifties").
 * - **A search thought names only whom its find named.**
 * - **The question matches what is told:** a "how do you know them" line
 *   answered with where they were, or the other way about.
 * - **No placeholder question for a nameless topic** ("Tell me about the
 *   key."), and **no slot left unfilled**.
 *
 * M11 (docs/28, Measure):
 *
 * - **No question that frames a person as a mystery:** "Who are you when
 *   nobody is asking?", "Who am I talking to?", "Tell me who you are".
 * - **No "I am 45 years old and…":** the dossier's record read aloud.
 * - **A grounding matches what it grounds:** "who has my keys" only for a
 *   way in, and "I see everybody who comes in" only for something seen.
 * - **At most one enigma in a case.**
 *
 * Pure: it reads the run and returns what it found.
 */

import type { Clue, Id } from '../gen/types.js';
import { spokenClock } from '../gen/types.js';
import type { CaseView } from './derive.js';
import type { Page, RunState } from './types.js';
import { SIGHT, proseTexts, sentencesOf } from './scene/text.js';
import { verdictsOn } from './m9.js';
import { DECKS, tagOf } from './voice/cards.js';
import { thingTopic } from './scene/families.js';

export interface LintIssue {
  page: number;
  rule:
    | 'machinery'
    | 'garbled'
    | 'empty-thought'
    | 'quoted-record'
    | 'repeated-question'
    | 'too-many-families'
    | 'presence-again'
    | 'recall-again'
    /* docs/26 */
    | 'verdict'
    | 'anchor-restated'
    | 'two-places-once'
    | 'stacked-sight'
    | 'search-thought-name'
    | 'question-family'
    | 'placeholder-question'
    | 'unfilled-slot'
    /* M11 */
    | 'mystery-question'
    | 'age-self'
    | 'grounding-family'
    | 'enigma-count';
  detail: string;
}

/**
 * The machinery, as patterns. Each word is banned in the sense the book uses
 * it; the plain senses a noir page needs — the patrolman on the beat, a
 * business card, a card case, "led", a lead pipe — are not.
 */
export const MACHINERY: { name: string; re: RegExp }[] = [
  { name: 'grid', re: /\bgrids?\b/i },
  { name: 'margin', re: /\bmargins?\b/i },
  { name: 'rule', re: /\brules?\b(?! of thumb)/i },
  {
    name: 'lead',
    re: /\b(?:a|the|that|this|one|another|no|any|new|open|next|other|first|second|good|every|each|my|his|her|their|two|three) leads?\b(?! (?:pipe|weight|singer|actor|role))|\bleads? (?:to follow|that|pointed|opened|went)\b/i,
  },
  { name: 'beat', re: /\b(?:a|this|that|next|one|every|each|the) beats?\b(?<!on the beat)(?! cop| patrolman)/i },
  {
    // The book's own cards — dealt, drawn, in a deck — never a business card
    // or the one a man turns down the corner of.
    name: 'card',
    re: /\b(?:the|this|that) cards? (?:said|says|told|gave|dealt|was dealt)\b|\bcards? in the (?:notebook|deck)\b|\bdea(?:l|lt|ls) (?:a|the|another) card\b/i,
  },
  { name: 'the notebook had', re: /\bthe notebook had\b/i },
  { name: 'put it on the grid', re: /\bput (?:it|them|\w+) (?:on|in) the grid\b/i },
  { name: 'the coroner’s hours', re: /\bthe coroner[’']s hours\b/i },
];

/** Plain senses the patterns above would otherwise catch. */
const ALLOWED = [
  /\bon the beat\b/i,
  /\b(?:business|registration|calling|playing|union|index|dance|visiting|library|ration|punch|time) cards?\b/i,
  /\bcard case\b/i,
  // A patrolman walks his beat; an adjuster carries a folding rule.
  /\b(?:walks?|walked|walking) (?:a|the|his|her|my) beat\b/i,
  /\b(?:folding|steel|carpenter[’']s) rule\b/i,
  // The house's own rules on a card by the door.
  /\bhouse rules?\b/i,
  // A page's own margin, where somebody wrote on a paper.
  /\b(?:written|pencilled|scrawled|noted|jotted) in the margins?\b/i,
];

/** Narration and dialogue: every word of prose a page prints. */
function textsOf(page: Page): string[] {
  return proseTexts(page);
}

/** Quoted spans on a page, the curly and the straight. */
function quotedSpans(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/“([^”]*)”/g)) out.push(m[1] as string);
  for (const m of text.matchAll(/"([^"]*)"/g)) out.push(m[1] as string);
  return out;
}

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The generator's sentences a clue could be quoted by: its text, its record
 * and its rule line, whole and a sentence at a time (six words or more), with
 * the "Rafferty says" that opens a record taken off.
 */
export function recordSentences(clue: Clue, view: CaseView): string[] {
  const out = new Set<string>();
  for (const raw of [clue.text, clue.textRecord, clue.rule, ...(clue.ruleParts ?? []).map((p) => p.text)]) {
    if (!raw) continue;
    const speaker = clue.source.type === 'person' ? view.personById.get(clue.source.personId)?.surname : undefined;
    const stripped = speaker ? raw.replace(new RegExp(`^${speaker}\\s+says\\s+(?:that\\s+)?`, 'i'), '') : raw;
    for (const whole of [raw, stripped]) {
      const n = norm(whole);
      if (n.split(' ').length >= 6) out.add(n);
    }
    // A sentence at a time, where the record has more than one. Short
    // stretches like "then the garage at half past seven" are how anybody
    // says an hour and a place, and are not the record's own sentence.
    for (const sentence of stripped.split(/(?<!\b(?:Mrs|Mr|Dr|St|Mt)\.)(?<=\.)\s+/)) {
      const n = norm(sentence);
      if (n.split(' ').length >= 8) out.add(n);
    }
  }
  return [...out];
}

function lintPage(view: CaseView, page: Page, found: readonly Id[]): LintIssue[] {
  const out: LintIssue[] = [];
  const add = (rule: LintIssue['rule'], detail: string): void => {
    out.push({ page: page.n, rule, detail });
  };
  const texts = textsOf(page);

  /* The machinery. */
  for (const text of texts) {
    let bare = text;
    for (const re of ALLOWED) bare = bare.replace(new RegExp(re.source, 'gi'), ' ');
    // A patrolman on the beat, a card case: the role and the object are the case's.
    for (const p of view.kase.people) bare = bare.split(p.role).join(' ');
    for (const { name, re } of MACHINERY) {
      const m = re.exec(bare);
      if (m) add('machinery', `${name}: “…${bare.slice(Math.max(0, m.index - 40), m.index + 40)}…”`);
    }
  }

  /* Garbled errands and empty thoughts. */
  for (const text of texts) {
    for (const m of text.matchAll(/\bOn ([A-Z][\w’'-]+)[’']s word, I asked ([A-Z][\w’'-]+)\b/g)) {
      if (m[1] === m[2]) add('garbled', m[0]);
    }
    const put = /\bI came to put ([A-Z][\w’'-]+) to ([A-Z][\w’'-]+)\b/.exec(text);
    if (put) add('garbled', put[0]);
    if (/\bI wrote it down and thought about it\b/.test(text)) add('empty-thought', 'I wrote it down and thought about it.');
  }

  /* No quoted generator sentence. */
  const quoted = texts.flatMap(quotedSpans).map(norm);
  if (quoted.length > 0) {
    for (const id of found) {
      const clue = view.findableById.get(id);
      if (!clue) continue;
      for (const sentence of recordSentences(clue, view)) {
        const hit = quoted.find((q) => q.includes(sentence));
        if (hit) add('quoted-record', `${id}: “${sentence}”`);
      }
    }
  }

  /* No question said twice on one page. */
  const questions = new Map<string, number>();
  for (const q of texts.flatMap(quotedSpans)) {
    if (!/\?\s*$/.test(q.trim())) continue;
    const key = norm(q);
    questions.set(key, (questions.get(key) ?? 0) + 1);
  }
  for (const [q, n] of questions) if (n > 1) add('repeated-question', `“${q}” ×${n}`);

  /* At most three families a page. */
  const beats = page.beats ?? [];
  const tellings = beats.filter((b) => b.kind === 'telling' && b.rendered).length;
  if (tellings > 3) add('too-many-families', `${tellings} families told`);
  if (page.shape === 'search') {
    const finds = beats.filter((b) => b.kind === 'find' && b.rendered).length;
    if (finds > 3) add('too-many-families', `${finds} finds on one search`);
  }
  if (page.shape === 'ask' && tellings === 0) {
    // An ask page without tellings (a self-account, nothing to say) tells one answer at most.
    const answered = new Set(page.found).size;
    const families = beats.filter((b) => b.kind === 'find' && b.rendered).length;
    if (families > 3 && answered > 3) add('too-many-families', `${answered} facts, no telling`);
  }
  return out;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * docs/25: a verdict, said of somebody by name. Checked only from Poached up,
 * where the pages give none; Raw and Coddled teach one once two facts agree.
 */
export function verdictsIn(text: string, surnames: readonly string[]): string[] {
  const out: string[] = [];
  if (/\bwas out of it\b/.test(text)) out.push('was out of it');
  for (const raw of surnames) {
    const s = esc(raw);
    const patterns = [
      new RegExp(`\\b(?:took|takes|taking) ${s} (?:out of it|off my list)\\b`),
      new RegExp(`\\b(?:That|It|This) cleared ${s}\\b`),
      new RegExp(`\\bcleared ${s} of\\b`),
      new RegExp(`\\bcrossed ${s} off\\b`),
      new RegExp(`\\bclosed ${s} off\\b`),
      new RegExp(`\\bclosed the door on ${s}\\b`),
      new RegExp(`\\bI let ${s} go\\b`),
      new RegExp(`\\bsettled ${s}, in the negative\\b`),
      new RegExp(`\\b${s} couldn[’']t have done it\\b`),
    ];
    for (const re of patterns) {
      const m = re.exec(text);
      if (m) out.push(m[0]);
    }
  }
  return out;
}

/** The ask-person lines whose words are the placeholder's {topic}. */
const PLACEHOLDER_ASKS = new Set(
  (DECKS['dashiell-lines'] ?? [])
    .filter((c) => tagOf('dashiell-lines', c, 'kind') === 'ask-person' && c.text.includes('{topic}'))
    .map((c) => c.id),
);

/** What each ask-person line asks: where somebody was, or how the witness knows them. */
const ASKS = new Map<string, string>(
  (DECKS['dashiell-lines'] ?? []).map((c) => [c.id, String(tagOf('dashiell-lines', c, 'asks') ?? 'any')]),
);

/**
 * An anchor's hour told again: a sentence naming the anchor (or its scene
 * sentence) with an hour of it that an earlier sentence tonight already told,
 * outside the window thought. `told` carries the hours told so far, by anchor.
 */
function anchorRestated(view: CaseView, page: Page, told: Map<Id, Set<string>>): string[] {
  const out: string[] = [];
  const reasoning = (page.beats ?? [])
    .filter((b) => b.kind === 'thought' && b.tag === 'window' && b.text)
    .flatMap((b) => sentencesOf(b.text as string));
  const sentences = proseTexts(page)
    .flatMap((t) => sentencesOf(t))
    .filter((x) => !reasoning.some((r) => x.includes(r) || r.includes(x)));
  for (const sentence of sentences) {
    const low = sentence.toLowerCase();
    for (const a of view.kase.anchors) {
      const name = a.name.toLowerCase();
      const head = (a.sceneFact.split('{T}')[0] ?? '').trim().toLowerCase();
      if (!low.includes(name) && !(head.length > 6 && low.includes(head))) continue;
      const hours = [...new Set(a.ticks)]
        .map((t) => spokenClock(t).toLowerCase())
        .filter((h) => new RegExp(`\\b${esc(h)}\\b`).test(low));
      const before = told.get(a.templateId) ?? new Set<string>();
      const again = hours.filter((h) => before.has(h));
      if (again.length > 0 && page.shape !== 'confront') out.push(`${a.name} at ${again.join(', ')}, told again: “${sentence}”`);
      for (const h of hours) before.add(h);
      told.set(a.templateId, before);
    }
  }
  return out;
}

/** docs/26: the read-through's checks on one page. */
function lintProse(view: CaseView, page: Page): LintIssue[] {
  const out: LintIssue[] = [];
  const add = (rule: LintIssue['rule'], detail: string): void => {
    out.push({ page: page.n, rule, detail });
  };
  const texts = textsOf(page);
  const beats = page.beats ?? [];

  if (!verdictsOn(view)) {
    const names = view.kase.people.filter((p) => p.id !== view.victim.id).map((p) => p.surname);
    for (const text of texts) for (const v of verdictsIn(text, names)) add('verdict', v);
  }
  for (const text of texts) {
    const twice = /\bonce and (?:here|at [^.,;”]+?) once\b/.exec(text);
    if (twice) add('two-places-once', twice[0]);
    const slot = /\{[a-zA-Z]+\}/.exec(text);
    if (slot) add('unfilled-slot', slot[0]);
  }
  // First sight: a description, not the relation stacked on it.
  for (const b of beats) {
    if (b.kind !== 'presence' || !b.rendered || !b.text) continue;
    for (const id of b.personIds ?? []) {
      const rel = view.personById.get(id)?.relationshipToVictim;
      if (!rel) continue;
      for (const sentence of sentencesOf(b.text)) {
        if (sentence.toLowerCase().includes(rel.toLowerCase()) && SIGHT.test(sentence)) add('stacked-sight', sentence);
      }
    }
  }
  // A search thought names only whom its find named.
  if (page.shape === 'search') {
    for (const b of beats) {
      if (b.kind !== 'thought' || !b.rendered || !b.text || (b.clueIds ?? []).length === 0) continue;
      const finds = beats
        .filter((f) => f.kind === 'find' && f.rendered && (f.clueIds ?? []).some((id) => (b.clueIds ?? []).includes(id)))
        .map((f) => f.text ?? '')
        .join(' ');
      if (finds.length === 0) continue;
      const victimToo = b.tag === 'last-seen' || b.tag === 'seen-after';
      for (const p of view.kase.people) {
        if (p.id === view.victim.id && !victimToo) continue;
        const re = new RegExp(`\\b${esc(p.surname)}\\b`);
        if (re.test(b.text) && !re.test(finds)) add('search-thought-name', `${b.tag}: ${p.surname}: “${b.text}”`);
      }
    }
  }
  // The question matches what is told, and a nameless topic is not asked with the placeholder.
  if (page.shape === 'ask') {
    const exchange = beats.find((b) => b.kind === 'exchange' && b.rendered);
    const first = beats.find((b) => b.kind === 'telling' && b.rendered);
    for (const id of page.cardsUsed) {
      const asks = ASKS.get(id);
      if (first && asks === 'who' && first.tag === 'movements') add('question-family', `${id} asks how they know them; told where they were`);
      if (first && asks === 'where' && first.tag === 'knowing') add('question-family', `${id} asks where they were; told whether they know them`);
      if (PLACEHOLDER_ASKS.has(id) && exchange && (exchange.personIds ?? []).length <= 1) {
        add('placeholder-question', `${id} for a topic that names nobody`);
      }
    }
  }
  return out;
}

/** M11: the questions that framed a person as a mystery instead of asking about a life. */
export const MYSTERY_QUESTIONS: RegExp[] = [
  /\bwho are you when nobody\b/i,
  /\bwho am I talking to\b/i,
  /\btell me who you are\b/i,
  /\btell me about yourself\b/i,
  /\bwhat do you do with your days\b/i,
  /\blet us start with you\b/i,
  /\bwho are you,? really\b/i,
  /\bwhat are you hiding\b/i,
];

/** M11: "I am 45 years old and the landlady." */
export const AGE_SELF = /\bI(?: am|['’]m) \d{1,3} years old\b/;

/** M11 §A.7: what each grounding says it rests on, read off its words. */
const KEYS_GROUNDING = /\b(?:my keys|the keys|a key|keys)\b/i;
const SIGHT_GROUNDING =
  /\bI see (?:everybody|everyone|who|them|all)\b|\bwithout I see\b|\bsee who\b|\bnotice who\b|\bI watch the (?:door|street|stairs|room|corner)\b/i;
const SEEN = new Set(['movements', 'counts', 'strangers', 'event']);

function lintPeople(view: CaseView, page: Page): LintIssue[] {
  const out: LintIssue[] = [];
  const add = (rule: LintIssue['rule'], detail: string): void => {
    out.push({ page: page.n, rule, detail });
  };
  for (const text of textsOf(page)) {
    for (const q of quotedSpans(text)) {
      for (const re of MYSTERY_QUESTIONS) if (re.test(q)) add('mystery-question', `“${q.trim()}”`);
      if (AGE_SELF.test(q)) add('age-self', `“${q.trim().slice(0, 80)}”`);
    }
  }
  for (const b of page.beats ?? []) {
    if (b.kind !== 'telling' || !b.rendered) continue;
    const grounding = b.parts?.grounding;
    if (!grounding) continue;
    const clues = (b.clueIds ?? []).map((id) => view.findableById.get(id)).filter((c): c is Clue => c !== undefined);
    if (KEYS_GROUNDING.test(grounding) && (b.tag !== 'thing' || thingTopic(clues) !== 'keys')) {
      add('grounding-family', `${b.tag}/${b.tag === 'thing' ? thingTopic(clues) : '-'}: “${grounding}”`);
    }
    if (SIGHT_GROUNDING.test(grounding) && !SEEN.has(b.tag ?? '') && !/\bI saw\b/.test((b.parts?.told ?? []).join(' '))) {
      add('grounding-family', `${b.tag}: “${grounding}”`);
    }
  }
  return out;
}

/** Every issue in a run, page by page. */
export function lintRun(view: CaseView, state: RunState): LintIssue[] {
  const out: LintIssue[] = [];
  const found: Id[] = [];
  /** docs/26: each anchor's hours told so far tonight. */
  const hoursTold = new Map<Id, Set<string>>();
  // Presence and recall, a visit at a time: a visit runs from walking into a
  // room to walking out of it.
  let visitAt: Id | null = null;
  let described = new Set<Id>();
  let recalls = new Map<string, number>();
  const recallOf = new Map<Id, string>();
  for (const [id, portrait] of Object.entries(state.cast.portraits)) {
    const action = portrait.pair?.action;
    if (action) recallOf.set(id, action.trim());
  }
  // M11 §A.4: one guarded person in a room of talkers is a character; more is a pattern.
  const enigmas = Object.entries(state.cast.temper).filter(([, t]) => t === 'enigma');
  if (enigmas.length > 1) {
    out.push({
      page: 0,
      rule: 'enigma-count',
      detail: `${enigmas.length} enigmas: ${enigmas.map(([id]) => view.personById.get(id)?.surname ?? id).join(', ')}`,
    });
  }
  for (const page of state.log) {
    found.push(...page.found);
    out.push(...lintPage(view, page, found));
    out.push(...lintProse(view, page));
    out.push(...lintPeople(view, page));
    // The tiered game only: the untiered game's marks are the generator's own
    // sentences ("The ice being brought in was at half past eight, and…").
    if (view.kase.logic) {
      for (const detail of anchorRestated(view, page, hoursTold)) out.push({ page: page.n, rule: 'anchor-restated', detail });
    }
    if (page.at !== visitAt) {
      visitAt = page.at;
      described = new Set();
      recalls = new Map();
    }
    const presence = (page.beats ?? []).filter((b) => b.kind === 'presence' && b.rendered);
    for (const b of presence) {
      for (const id of b.personIds ?? []) {
        if (described.has(id)) out.push({ page: page.n, rule: 'presence-again', detail: `${view.personById.get(id)?.surname ?? id} described again this visit` });
        described.add(id);
      }
    }
    const all = textsOf(page).join(' ');
    for (const [id, action] of recallOf) {
      if (action.length === 0) continue;
      let n = 0;
      for (let at = all.indexOf(action); at >= 0; at = all.indexOf(action, at + 1)) n++;
      if (n === 0) continue;
      const total = (recalls.get(id) ?? 0) + n;
      recalls.set(id, total);
      if (total > 1) out.push({ page: page.n, rule: 'recall-again', detail: `${view.personById.get(id)?.surname ?? id}: “${action}” ×${total} this visit` });
    }
  }
  return out;
}
