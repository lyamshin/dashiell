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
 * Pure: it reads the run and returns what it found.
 */

import type { Clue, Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import type { Page, RunState } from './types.js';
import { proseTexts } from './scene/text.js';

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
    | 'recall-again';
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
    for (const sentence of stripped.split(/(?<=\.)\s+/)) {
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

/** Every issue in a run, page by page. */
export function lintRun(view: CaseView, state: RunState): LintIssue[] {
  const out: LintIssue[] = [];
  const found: Id[] = [];
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
  for (const page of state.log) {
    found.push(...page.found);
    out.push(...lintPage(view, page, found));
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
