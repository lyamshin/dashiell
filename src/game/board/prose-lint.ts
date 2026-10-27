/**
 * docs/47 C14: the round-three prose lints. Read over a whole night, as a
 * player reads it, and the report form's own words:
 *
 * - **place-tag:** a place's name bolted onto a sentence ("hung in the hall at
 *   the Delmonico rooms") after the paragraph has named it, or one place named
 *   three times in one paragraph of narration;
 * - **phrase:** the board read aloud, game talk and quest-log signposts that
 *   have no place on a page ("with the list under both", "had himself at",
 *   "Which brought me to", "So, Moe’s.", "the report wants", "The next place
 *   worth the walk"), and a British spelling in a New York voice;
 * - **signpost:** more than one where-next sentence on a page;
 * - **gag:** one running gag (a prop, a trait, the street) paid off more than
 *   `GAG_MAX` times a night;
 * - **pet:** a lost pet called "it" ("who took it", "it went at ten"), on a
 *   page or on the form.
 * - **grid** (docs/55 1c): narration that says a story stood up, or that
 *   nothing went against it ("I had nothing to put against it"), on a page
 *   whose person has a line held against them (the grid shows the collision),
 *   or in a paragraph that has just said only their own word stood for an hour;
 * - **turned-out** (docs/55 1e): "It turned out X was…" for somebody who was in
 *   the room all along ("it turned out" is for one who came back in).
 * - **posture** (docs/55 2): standing on the mat, hat in hand, after sitting
 *   down, on the page or on the pages before it in the same room, with no
 *   getting up between;
 * - **inside** (docs/55 2): knocking on a page that isn't the walk in, when the
 *   page before was in the same room.
 * - docs/59, the clarity build (`clarity-lint.ts`): **repeat** (a fact said twice on a page, or two
 *   sentences sharing five content words), **slots** (an evening recited by hour slot), **continuity**
 *   (sitting down twice, arriving twice, asked to sit while sitting, the client at the scene
 *   unexplained, my feet off the desk twice), **tic** (two simile frames a page; "as it turned out",
 *   "which I wrote down", the room asked to help, more than once a night; a running gag on three pages)
 *   and **assembly** ("would spent", "but He threw", a name twice in a sentence, a place said as a
 *   pronoun, "them" for one person in the verdict's why).
 *
 * - docs/62, the hinge lines (`hinge-lint.ts`): **hinge**, one rule a kind (said-place, gloss, bare,
 *   put-lead, put-speech, thought-who, orphan, shift, telling, form, dose, unwatched, pointer,
 *   connector, tail, locative, reason; the verdict's close, epilogue, is read with the report).
 *
 * Pure: it reads the night and returns what it found.
 */

import type { Page } from './types.js';
import { isMurder, type BoardDeal, type BoardRun } from './model.js';
import { collisionsOf } from './knowledge.js';
import { KNOCKED, OWN_WORD_ONLY, SAT, STANDING, STOOD, STOOD_UP, UNCONTRADICTED, seatedAfter } from './plan/situated.js';
import { sentencesOf } from './plan/sentences.js';
import { GAG_MAX, recapClauses } from './pages.js';
import { boardFields } from './report.js';
import { engineWords } from './jargon.js';
import { clarityIssues, verdictIssues } from './clarity-lint.js';
import { hingeIssues, runAt, type HingeRule } from './hinge-lint.js';
import { lean } from './plan/dial.js';
import { motiveSaid } from './motives.js';
import { titleClient } from './home.js';
import { suspectsOf } from './model.js';

export interface ProseIssue {
  page: number;
  rule: 'place-tag' | 'phrase' | 'signpost' | 'gag' | 'pet' | 'grid' | 'turned-out' | 'posture' | 'inside' | 'jargon' | 'repeat' | 'slots' | 'continuity' | 'tic' | 'assembly' | 'hinge';
  /** docs/62: which of the hinge rules (`hinge-lint.ts`). */
  hinge?: HingeRule;
  detail: string;
}

/** Phrases that read the board aloud, talk like the game, or signpost the route. */
export const BANNED: { name: string; re: RegExp }[] = [
  { name: 'with the list under', re: /\bwith the list under\b/i },
  { name: 'word under it', re: /\bword under (it|them|both)\b|\bwith [A-Z][\w.’]*(?: [A-Z][\w’]*)?’s word under\b/ },
  { name: 'under both', re: /\bunder (both|all of them)\b/ },
  { name: 'had himself at', re: /\bhad (him|her)self at\b/ },
  { name: 'Which brought me to', re: /\bWhich brought me to\b/ },
  { name: 'So, X.', re: /(?:^|[.!?”]\s+)So, (?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)?’?s?\.(?=\s|$)/m },
  { name: 'X it was.', re: /(?:^|[.!?”]\s+)(?!(?:There|That|This|Here|It|So|Which|What) it was)(?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)? it was\.(?=\s|$)/m },
  { name: 'X, then.', re: /(?:^|[.!?”]\s+)(?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)?, then\.(?=\s|$)/m },
  { name: 'That was why I’d come', re: /\bThat was why I’d come\b|\bwas why I’d come\b/ },
  { name: 'the one I’d come for', re: /\bthe one I’d come for\b|\bI’d come for \w+, and \w+ was here\b/ },
  { name: 'reason I’d walked over', re: /\bThat was the reason I’d walked over\b/ },
  { name: 'next place worth the walk', re: /\bThe next place worth the walk\b/ },
  { name: 'next door to knock on', re: /\bthe next door to knock on\b/ },
  { name: 'next stop', re: /\bThe night’s next stop\b/ },
  { name: 'whatever came next', re: /\bWhatever came next, it was waiting\b/ },
  { name: 'the report wants', re: /\bthe report (?:wants|wanted|would want|asks)\b/i },
  { name: 'the where', re: /\bthe where\b/ },
  { name: 'The office had given me', re: /\bThe office had given me\b/ },
  { name: 'in this room', re: /\bhad [^.]* in this room\b/ },
  { name: 'says she says', re: /\bsays (?:she|he) says\b/ },
  { name: 'a man called', re: /\bgo(?:ne)? straight to a man called\b|\bstraight to a pawnbroker’s runner called\b/ },
  { name: 'back on its nail', re: /\bon its nail in the morning\b|\bback on its nail\b/ },
  { name: 'on the way out', re: /\bOn the way out\b/ },
  { name: 'found where I’d left', re: /\bwhere I’d left (?:him|her)\b/ },
  { name: 'British spelling', re: /\b(?:colours?|kerbs?|sympathis\w*|neighbours?|parlours?|programmes?|favours?|honours?|flavours?|apologis\w*|realis\w*|recognis\w*|pavements?|whisky|cosy)\b/i },
  { name: 'British spelling: theatre', re: /\btheatres?\b/ },
];

/** A where-next sentence: one a page may carry its reason in; two is a quest log. */
const SIGNPOST = /\bwas next\b|\bwanted [^.]* next\b|\bnext (?:question|person|place) to\b|\bThe one to ask was\b|\bwas worth the walk\b|\bthe next place\b|\bwas where I wanted to be\b/i;

function narration(p: Page): { text: string; voice: string }[] {
  return p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'answer' && b.voice !== 'recap' && b.voice !== 'chapter' ? [{ text: b.text.replace(/“[^”]*”/g, ' '), voice: b.voice }] : []));
}

function count(text: string, word: string): number {
  return (text.match(new RegExp(`(?<![\\w’])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w’])`, 'gi')) ?? []).length;
}

/** docs/72: the pages after which the notebook may read differently: a question asked, a find, a put. */
const NOTEBOOK_AFTER = new Set(['account', 'list', 'search', 'motive', 'confront']);

export function proseIssues(d: BoardDeal, run: BoardRun): ProseIssue[] {
  const c = d.kase;
  const out: ProseIssue[] = [];
  const places = c.places.map((p) => p.short).filter((s) => s.length >= 4);
  // What was held as each page was read: the questions asked and the puts made by then.
  const askedAt = new Map<string, number>();
  for (const p of run.log) if (p.board?.q && run.asked.includes(p.board.q) && !askedAt.has(p.board.q)) askedAt.set(p.board.q, p.n);
  const heldAt = (i: number) => ({ asked: run.asked.filter((q) => (askedAt.get(q) ?? Infinity) <= i), puts: run.puts.filter((x) => x.page <= i) });
  // docs/55 2: whether I'm sitting down, carried across the pages in one room.
  let seated = false;
  run.log.forEach((p, i) => {
    const prev = run.log[i - 1];
    const inside = !!prev && prev.at === p.at && p.board?.job !== 'arrive' && p.at !== 'office';
    if (!inside) seated = false;
    for (const para of narration(p)) {
      for (const s of sentencesOf(para.text)) {
        if (seated && STANDING.test(s) && !STOOD_UP.test(s)) out.push({ page: i, rule: 'posture', detail: s.trim() });
        else if (seated && SAT.test(s) && !STOOD_UP.test(s)) out.push({ page: i, rule: 'posture', detail: `sat down again: ${s.trim()}` });
        seated = seatedAfter(s, seated);
      }
      const k = inside ? KNOCKED.exec(para.text) : null;
      if (k) out.push({ page: i, rule: 'inside', detail: k[0] });
    }
  });
  run.log.forEach((p, i) => {
    const paras = narration(p);
    // docs/53, the dial: a fact says its place by name, every time ("at the Thalia", never "here"), so
    // the place names counted are the texture's: what's left of a paragraph once its facts are taken out.
    const facts = (p.board?.units ?? []).flatMap((u) => (u.kind === 'fact' ? [u.text.replace(/⁣\d+⁤/g, '').replace(/“[^”]*”/g, ' ')] : []));
    const texture = (t: string) => facts.reduce((x, f) => (f.trim().length > 0 ? x.split(f.trim()).join(' ') : x), t);
    // Place names: bolted onto a sentence after the paragraph has named the place, or three in a paragraph.
    for (const para0 of paras) {
      const para = { ...para0, text: texture(para0.text) };
      for (const pl of places) {
        const n = count(para.text, pl);
        if (n >= 3) out.push({ page: i, rule: 'place-tag', detail: `${pl} ×${n}: ${para.text.slice(0, 80)}` });
        // (Not at "Mrs." or "Dr.": "…with Mrs. Krantz, and at eight" is one sentence.)
        const sentences = para.text.split(/(?<!\b(?:Mrs?|Dr)\.)(?<=[.!?])\s+/);
        sentences.forEach((s, k) => {
          if (k === 0 || !new RegExp(`\\bat ${pl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,.]?$`).test(s.trim())) return;
          if (sentences.slice(0, k).some((x) => x.toLowerCase().includes(pl.toLowerCase())) && /\b(hung|stood|sat|was|were|lay|leaned|ticked|knocked)\b/.test(s) && !/^(It was|I |From|Getting|The walk|[A-Z]\w+ (was|lay) )/.test(s)) out.push({ page: i, rule: 'place-tag', detail: s.trim() });
        });
      }
    }
    // Phrases, over everything the player reads on the page (speech included: a client can say "says she says").
    const all = p.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join('\n');
    for (const b of BANNED) {
      const m = b.re.exec(b.name === 'in this room' || b.name.startsWith('So,') || b.name.startsWith('X') ? paras.map((x) => x.text).join('\n') : all);
      if (m) out.push({ page: i, rule: 'phrase', detail: `${b.name}: “${m[0].trim()}”` });
    }
    // docs/55 1c: the narration never says a story stood where the grid has it broken, nor right after saying it stood on one word.
    const subject = /^(?:account|motive|confront):([^@]+)/.exec(p.board?.q ?? '')?.[1];
    const crossed = subject !== undefined && collisionsOf(c, heldAt(i), subject).length > 0;
    for (const para of paras) {
      const m = crossed ? UNCONTRADICTED.exec(para.text) : OWN_WORD_ONLY.test(para.text) ? STOOD.exec(para.text) : null;
      if (m) out.push({ page: i, rule: 'grid', detail: `${crossed ? 'collision held' : 'own word only'}: “${m[0]}”` });
    }
    // docs/55 1e: "it turned out" is for somebody who came back in, not one who was there all along.
    for (const para of paras) {
      const m = /\b(?:[Aa]s it turned out,|[Ii]t turned out) (?:my witness|[A-Z][\w.’]*(?: [A-Z][\w’]*)?) (?:was|were)\b/.exec(para.text.replace(/⁣\d+⁤/g, ''));
      if (m) out.push({ page: i, rule: 'turned-out', detail: m[0] });
    }
    // Where-next sentences: one a page.
    const sig = paras.flatMap((x) => x.text.split(/(?<=[.!?])\s+/)).filter((s) => SIGNPOST.test(s));
    if (sig.length > 1) out.push({ page: i, rule: 'signpost', detail: sig.join(' | ') });
    // A lost pet is "he" or "she".
    if (c.type === 'lost-pet') {
      const m = /\b(?:[Ii]t went (?:at|missing)|who took it\b|[Ww]here it is now|whoever took it\b|get it back\b)/.exec(all);
      if (m) out.push({ page: i, rule: 'pet', detail: m[0] });
    }
  });
  // docs/53, addendum: no engine words in the narration, and no board-speak in anybody's mouth.
  run.log.forEach((p, i) => {
    for (const b of p.blocks) {
      if (b.kind !== 'prose' || b.voice === 'chapter') continue;
      for (const h of engineWords(b.voice === 'answer' && !b.text.includes('“') ? `“${b.text}”` : b.text)) out.push({ page: i, rule: 'jargon', detail: `${h.name}${h.speech ? ' (speech)' : ''}: “${h.match}”` });
    }
    // (docs/72, the coordinator's read: and the notebook's "How it adds up", as it stood after every page that asked
    // something: "I had evenings from Kavanagh…, and lists from Mrs. Pickering and Schilling" went unread.)
    if (!NOTEBOOK_AFTER.has(p.board?.job ?? '')) return;
    for (const cl of recapClauses(d, runAt(run, i))) for (const h of engineWords(cl.text)) out.push({ page: i, rule: 'jargon', detail: `the notebook, ${h.name}: “${h.match}”` });
  });
  // Running gags: each role's payoffs tonight.
  const roles = [...Object.values(run.props ?? {}), ...Object.values(run.traits ?? {}), ...(run.street ? [run.street] : [])];
  for (const r of roles) {
    const n = r.pay.filter((l) => run.spent.includes(`pay:${l.slice(0, 40)}`)).length;
    if (n > GAG_MAX) out.push({ page: -1, rule: 'gag', detail: `${r.short} ×${n}` });
  }
  // docs/59: the clarity build's rules, and the verdict's why for whoever it names.
  for (const x of clarityIssues(d, run)) out.push({ page: x.page, rule: x.rule, detail: x.detail });
  // docs/62: the hinge lines, said as a person says them (the verdict's close is read with the report, `epilogueIssues`).
  // (Lean only: `texture=full` is the page as it read before the texture budget, and holds to nothing new.)
  if (lean()) for (const x of hingeIssues(d, run)) out.push({ page: x.page, rule: 'hinge', hinge: x.rule, detail: `${x.rule}: ${x.detail}` });
  for (const p of suspectsOf(c)) for (const x of verdictIssues(titleClient(c, motiveSaid(c, p)))) out.push({ page: x.page, rule: x.rule, detail: x.detail });
  // The form says "him" or "her" for a pet too.
  if (c.type === 'lost-pet' && !isMurder(c)) {
    for (const f of boardFields(d)) if (/\bit\b/.test(f.label)) out.push({ page: -1, rule: 'pet', detail: `form: ${f.label}` });
  }
  return out;
}
