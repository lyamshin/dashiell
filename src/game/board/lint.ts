/**
 * docs/43 "Done means": the reader lint and the correspondence check, for the
 * board. Read over a whole night, page by page, as a player reads it:
 *
 * - **machinery:** the book's own words never in the prose (grid, rule, lead,
 *   beat, …), as `reader-lint.ts` has them;
 * - **verdict:** never "cleared", "out of it", "crossed off", at any tier;
 * - **slots:** no `{slot}` left unfilled, no "undefined";
 * - **hours:** every hour a page names (at nine, ten o'clock, till eleven) is
 *   one the page's own lines license;
 * - **names:** every person a page names is somebody the page licenses: in
 *   the room, in a line it tells, or in the office's givens;
 * - **whole:** an account page says every hour's place and every name of
 *   company; a list page says every name on the list;
 * - **refusal:** the same words for a culprit's refusal as an innocent's.
 *
 * Pure: it reads the night and returns what it found.
 */

import { machineryIn, verdictsIn } from './reader-lint.js';
import type { Page } from './types.js';
import { accountOf, listOf, peopleAt } from './knowledge.js';
import { hourWord, nameOf, placeName, thoughtLevel, type BoardDeal, type BoardRun } from './model.js';

export interface BoardLintIssue {
  page: number;
  rule: 'machinery' | 'verdict' | 'slot' | 'hour' | 'name' | 'whole' | 'quote' | 'level';
  detail: string;
}

const HOUR_WORDS = ['seven', 'eight', 'nine', 'ten', 'eleven'];
const HOUR_OF: Record<string, number> = { seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11 };

/** Hours named as times: "at nine", "ten o’clock", "till eleven", "nine and ten". */
export function hoursNamed(text: string): number[] {
  const out = new Set<number>();
  const w = HOUR_WORDS.join('|');
  // Not a count: "eight years", "ten dollars", "nine of them".
  const notCount = `(?!\\s+(?:dollars|calls|minutes|years|days|weeks|months|of|people|men|women|feet|steps|flights|cents|times|lodgers|rooms|floors|blocks|hours))`;
  const res = [
    new RegExp(`\\b(?:at|till|until|from|by|after|before|since|past|come|then at|and|or)\\s+(${w})\\b${notCount}`, 'gi'),
    new RegExp(`\\b(${w})\\s+o[’']clock\\b`, 'gi'),
    new RegExp(`^(${w})\\b${notCount}`, 'gim'),
    new RegExp(`[“"]\\s*(${w})\\b${notCount}`, 'gi'),
    new RegExp(`[.;,]\\s+(${w}),`, 'gi'),
  ];
  for (const re of res) for (const m of text.matchAll(re)) out.add(HOUR_OF[(m[1] as string).toLowerCase()] as number);
  return [...out];
}

function pageText(p: Page): string {
  return p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n');
}

export function lintBoardRun(d: BoardDeal, run: BoardRun): BoardLintIssue[] {
  const c = d.kase;
  const out: BoardLintIssue[] = [];
  const surnames = c.people.filter((p) => !p.object).map((p) => p.short);
  const officeText = c.givens.text.join(' ');
  const officeHours = new Set(hoursNamed(officeText));
  // The office's lines, and the hour the body was found, may be named anywhere: the night is about them.
  for (const h of c.givens.window ?? c.crime.window) officeHours.add(h);
  run.log.forEach((p, i) => {
    const text = pageText(p);
    for (const m of machineryIn(text)) out.push({ page: i, rule: 'machinery', detail: m });
    for (const v of verdictsIn(text, surnames)) out.push({ page: i, rule: 'verdict', detail: v });
    if (/\{\w+\}|\bundefined\b|\bnull\b|\bNaN\b/.test(text)) out.push({ page: i, rule: 'slot', detail: (/[^.]*(?:\{\w+\}|undefined|\bnull\b|NaN)[^.]*/.exec(text) ?? [''])[0] });
    if (/["']/.test(text.replace(/[A-Za-z]'[A-Za-z]/g, ''))) out.push({ page: i, rule: 'quote', detail: (/[^.]*["'][^.]*/.exec(text) ?? [''])[0].slice(0, 120) });
    const b = p.board;
    if (!b) return;
    // Hours.
    const licensed = new Set<number>([...b.hours, ...(b.job === 'office' ? officeHours : [])]);
    for (const h of hoursNamed(text)) {
      if (!licensed.has(h) && !officeHours.has(h)) out.push({ page: i, rule: 'hour', detail: `names ${hourWord(h)}, which nothing on the page tells` });
    }
    // Names (a place called after somebody, "Mrs. Nagy’s", isn't naming her).
    const here = new Set(peopleAt(c, { asked: run.asked, visited: run.visited }, p.at));
    let bare = text;
    for (const pl of [...c.places].sort((x, y) => y.name.length - x.name.length)) bare = bare.split(pl.name).join(' ').split(pl.short).join(' ');
    for (const person of c.people) {
      if (person.object) continue;
      const re = new RegExp(`\\b${person.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!re.test(bare)) continue;
      const ok = b.people.includes(person.id) || here.has(person.id) || person.id === c.client || person.id === c.crime.victim || officeText.includes(person.short) || b.job === 'office';
      if (!ok) out.push({ page: i, rule: 'name', detail: `names ${person.short}` });
    }
    // Whole: an account says every hour, with every name of company; a list every name.
    if (b.job === 'account' && b.q) {
      const who = b.q.slice('account:'.length);
      const a = accountOf(c, who);
      const answer = p.blocks.find((x) => x.kind === 'prose' && x.voice === 'answer');
      const said = answer && answer.kind === 'prose' ? answer.text : '';
      for (const h of c.board.hours) {
        const cl = a?.claims[h];
        if (!cl) continue;
        const place = placeName(c, cl.place);
        const ownHome = c.people.find((x) => x.id === who)?.home === cl.place;
        const party = cl.place === c.crime.scene && said.includes(`${c.people.find((x) => x.id === c.client)?.short}’s`);
        // The place said whole, or by its own name ("round to Sokol’s" for Sokol’s back room).
        // (Past a title too, as the account says it: "round to Dr. Hirsch’s" is Dr. Hirsch’s flat.)
        const stem = place.replace(/^(?:the|Mrs\.|Mr\.|Miss|Dr\.) /, '').split(' ')[0] ?? place;
        if (!said.includes(place) && !(stem.length >= 4 && said.includes(stem)) && !party && !(ownHome && /\bhome\b|\bmy room\b/.test(said)) && !/the rest of the evening|all evening/.test(said)) out.push({ page: i, rule: 'whole', detail: `${nameOf(c, who)}’s account leaves out ${place} at ${h}` });
        for (const x of cl.company) if (!said.includes(nameOf(c, x))) out.push({ page: i, rule: 'whole', detail: `${nameOf(c, who)}’s account leaves out ${nameOf(c, x)} at ${h}` });
      }
    }
    if (b.job === 'list' && b.q) {
      const l = listOf(c, b.q.slice('list:'.length));
      const answer = p.blocks.find((x) => x.kind === 'prose' && x.voice === 'answer');
      const said = answer && answer.kind === 'prose' ? answer.text : '';
      for (const es of Object.values(l?.entries ?? {})) {
        for (const e of es) if ('person' in e && !said.includes(nameOf(c, e.person))) out.push({ page: i, rule: 'whole', detail: `the list leaves out ${nameOf(c, e.person)}` });
      }
    }
  });
  // docs/46 §2: the thought's level.
  out.push(...levelIssues(d, run));
  return out;
}

/** Every word a player reads on a board night, for the plain-terms check. */
export function boardPlayerText(run: BoardRun): string[] {
  return run.log.map(pageText);
}

/* ------------------------------------------------------------------ *
 * docs/46 §2: thoughts stop at the link.
 * ------------------------------------------------------------------ */

/** What a thought above walk level may never say: who's cleared, who's left, how many remain. */
export const OVERSTEP: { name: string; re: RegExp }[] = [
  { name: 'that left', re: /\bthat left\b/i },
  { name: 'only … left', re: /\bonly\b[^.?!]*\bleft\b(?! (?:the|his|her|my|at|for|it|them|him|by|before|after|early|alone|over))/i },
  { name: 'cleared', re: /\bclear(?:ed|s)\b/i },
  { name: 'who’s left', re: /\bwho[’']s left\b|\b(?:one|two|three|four|five|nobody) (?:was |were )?left\b(?! (?:the|his|her|my|at|for|it|them|him|by|before|after|early|alone|over))/i },
  { name: 'how many remain', re: /\b(?:one|two|three|four|five) (?:people|names|of them) (?:left|to go|remained|still in it)\b/i },
];

/** A sentence that says who did it: their name and a verdict in one breath. */
const DID_IT = /\b(?:did it|done it|killed (?:him|her)|took (?:it|him|her)|was the one|had to be|must have|nobody else could|guilty|the one who)\b/i;

/** The question a thought's ref came from: a line's, a question's own id, or the office's. */
function refQuestion(ref: string): string {
  if (ref.startsWith('givens')) return 'givens';
  const [kind, rest = ''] = ref.split(':') as [string, string];
  if (kind === 'claim') return `account:${rest.split('@')[0]}`;
  if (kind === 'list') return `list:${rest.split('@')[0]}`;
  if (kind === 'find') return `search:${rest}`;
  if (kind === 'admit' || kind === 'second') return `confront:${rest}`;
  if (kind === 'remark') return ref.slice('remark:'.length).replace(/#\d+$/, '');
  return ref;
}

/**
 * The level lint. Above walk level (Coddled up) no thought, turn or "Go over
 * what I have" before the report says "that left", "only … left", "cleared",
 * how many remain, or who did it. At fact level (Hard-boiled) a thought ties
 * to nothing but this page's own lines and the office.
 */
export function levelIssues(d: BoardDeal, run: BoardRun): BoardLintIssue[] {
  const c = d.kase;
  const level = thoughtLevel(c);
  if (level === 'walk') return [];
  const out: BoardLintIssue[] = [];
  const culprit = nameOf(c, c.crime.culprit);
  run.log.forEach((p, i) => {
    const b = p.board;
    if (!b || b.job === 'nothing') return;
    const texts = [b.thought?.text ?? '', ...p.blocks.filter((x) => x.kind === 'prose' && (x.voice === 'recap' || x.voice === 'thought')).map((x) => (x.kind === 'prose' ? x.text : ''))].filter(Boolean);
    for (const t of new Set(texts)) {
      for (const { name, re } of OVERSTEP) {
        const m = re.exec(t);
        if (m) out.push({ page: i, rule: 'level', detail: `${name}: “…${t.slice(Math.max(0, m.index - 40), m.index + 40)}…”` });
      }
      for (const s of t.split(/(?<=[.!?])\s+/)) if (s.includes(culprit) && DID_IT.test(s)) out.push({ page: i, rule: 'level', detail: `names who did it: “${s.slice(0, 100)}”` });
    }
    if (level === 'fact' && b.thought) {
      const mine = new Set([b.q ?? '', 'givens']);
      for (const r of b.thought.refs) if (!mine.has(refQuestion(r)) && !(b.told ?? []).includes(r)) out.push({ page: i, rule: 'level', detail: `ties to an earlier page: ${r}` });
    }
  });
  return out;
}
