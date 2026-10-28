/**
 * docs/43 §2, the report: who, when, how and why for a murder; who, when,
 * where it is now and why for a lost thing. Then the ending, "What really
 * happened" (the crime only), and the curtain: the true board, the path and
 * the lies.
 *
 * docs/46 §3: after "who", the report asks what breaks their story: one of
 * the lines held that names them or falls at the hour that mattered, or a
 * hunch. A lost thing's "where it is now" asks which line put it there. The
 * right name on the right line is solved; the right name on a hunch or the
 * wrong line is right, but you couldn't have known, and counts half.
 *
 * docs/61: from Poached up, where the night has an innocent liar, the report
 * asks about the other broken story too: who else lied, and what cleared
 * them (the check on an admission, or the list that places them), or a
 * hunch. That's its own point, and solved needs it.
 *
 * The verdict (`Verdict`) is what the book's verdict page and the play CLI
 * print.
 */

import { ROOMING_MEANS, WORKPLACES } from '../../gen/board/content.js';
import { holdersOf } from './world.js';
import { questionById, key } from '../../gen/board/solver.js';
import { minimalSets } from '../../gen/board/path.js';
import { closure } from '../../gen/board/pointers.js';
import { techniquesUpTo } from '../../gen/board/tiers.js';
import { questionsOf, solve } from '../../gen/board/solver.js';
import { Hand } from './decks.js';
import { clockWords, minutesAfter, NIGHT_MINUTES } from './clock.js';
import { accountOf, agreesWith, bearsOn, confrontationOf, lineShown, linesHeld, listOf, saidOnPage, secondBreakers, solveHeld, solveRun, storyBreakers, type Line } from './knowledge.js';
import type { Lie } from '../../gen/board/types.js';
import {
  andList,
  budgetCalls,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  parCalls,
  personOf,
  placeName,
  pronOf,
  solverHeld,
  suspectsOf,
  victimOf,
  type BoardDeal,
  type BoardReport,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { withCaps } from './pages.js';
import { homeNamed, titleClient } from './home.js';
import { introOf } from './gloss.js';
import { motiveForm, motiveSaid, whyOrder } from './motives.js';
import { hintWords, plainWhy } from './stars.js';
import { poisonAfter, vesselOf, whenQuestion } from './when.js';
import { hasHints, hintsUsed } from './hints.js';

export type FieldKey = 'who' | 'when' | 'how' | 'why' | 'where' | 'breaks' | 'whereBy' | 'other' | 'cleared';

/**
 * How a filed report came out: everything right on the right lines (solved), the right name on a
 * hunch (lucky: right, but you couldn't have known), the right name on its line and some of the
 * rest wrong (thin), the wrong one, or nobody named.
 */
export type Outcome = 'solved' | 'lucky' | 'thin' | 'wrong-man' | 'cold';

export interface FieldResult {
  key: FieldKey;
  label: string;
  given: string;
  truth: string;
  correct: boolean;
  answered: boolean;
  /** Right, but the line under it was a hunch or the wrong one: it counts half. */
  half?: boolean;
  /** A line asked for under another answer (what breaks their story, what puts it there). It scores through that answer, not on its own. */
  line?: boolean;
  /** docs/61: said after the answer in place of "it was …" when it isn't right: "the right name, but not what cleared him". */
  why?: string;
}

/** The report, scored. */
export interface Verdict {
  fields: FieldResult[];
  /** Whole and half points: "3½ out of 4". */
  points: number;
  /** How many the report asked. `points` out of this. */
  asked: number;
  /**
   * docs/47 A2: the score, saying what's scored, so it matches the ticks: "4 out of 4: who (and the
   * line that breaks the story), when, how and why."
   */
  scoreLine: string;
  outcome: Outcome;
  actionsUsed: number;
  par: number;
  /** Said plainly under the score: what counted half, and why. */
  plain: string[];
  /** The closing page, in the book's voice. Paragraphs. */
  closing: string[];
  /** docs/67: the hints taken tonight. They cost nothing; the verdict says how many. */
  hints: number;
  /**
   * docs/67: a perfect report (outcome `solved`) earns a star, and a perfect one with no hint taken
   * a gold star. From Soft-boiled up there are no hints, so every perfect report there is gold.
   */
  star: 'gold' | 'star' | null;
  /** docs/67: the actions, and the hints beside them where the tier has any: "11 actions, 2 hints." */
  tally: string;
}

/** docs/67: the verdict's star, said for a screen reader and beside the glyph: "Gold star: a perfect report, with no hints." */
export function starWords(star: Verdict['star']): string {
  return star === 'gold' ? 'Gold star: a perfect report, with no hints.' : star === 'star' ? 'Star: a perfect report.' : '';
}

/** docs/67: "11 actions, 2 hints.", "11 actions, no hints.", or at a tier without hints "11 actions." */
export function tallyWords(tier: number, actions: number, hints: number): string {
  const a = `${actions} ${actions === 1 ? 'action' : 'actions'}`;
  if (!hasHints(tier)) return `${a}.`;
  return `${a}, ${hints === 0 ? 'no hints' : `${hints} ${hints === 1 ? 'hint' : 'hints'}`}.`;
}

/** "3", "3½", "½". */
export function pointsText(points: number): string {
  const whole = Math.floor(points);
  return points - whole >= 0.5 ? `${whole === 0 ? '' : whole}½` : String(whole);
}

/** The report's new questions, as the form asks them. */
// docs/64: plain words: what proves it, never "what breaks their story" or "the line".
export const BREAKS_LABEL = 'What proves they lied';
export const WHERE_BY_LABEL = 'What proves where it is';
/** Round 7, B8: a pet is "him" or "her" on the form ("Where she is now"), so what proves it is too. */
export function whereByLabel(d: BoardDeal): string {
  return d.kase.type === 'lost-pet' ? `What proves where ${pronOf(d.kase, d.kase.crime.victim).he} is` : WHERE_BY_LABEL;
}
/**
 * docs/61: the other broken story, as the form asks it, and as the verdict says it. Round 7, B9 (the
 * designer): asked as a question, never as news ("Someone else lied too" told the player a second liar
 * existed before they'd found one), on every night from Poached up, "Nobody else" a real answer.
 */
export const OTHER_QUESTION = 'Did anyone else lie? If so, who, and what clears them?';
export const OTHER_LABEL = 'Did anyone else lie?';
export const CLEARED_LABEL = 'What clears them';
/** The form's answer for nobody else. */
export const NOBODY = 'nobody';
export const NOBODY_LABEL = 'Nobody else';

/**
 * docs/61: the other liar: the innocent whose story breaks at the crime hour too (a secret, or the
 * Hard-boiled friend covering for the culprit). Only from Poached up, where rule 9 deals one.
 */
export function otherLie(d: BoardDeal): Lie | null {
  const c = d.kase;
  if (c.tier < 2) return null;
  return c.lies.find((l) => l.person !== c.crime.culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person !== c.crime.culprit) ?? null;
}

/**
 * Whether the report asks whether anyone else lied: round 7, B9, on every night from Poached up, by
 * tier, never by whether the night has an innocent liar (asked only where there was one, the question
 * itself said there was). Where nobody else lied, "Nobody else" is right.
 */
export function asksOther(d: BoardDeal): boolean {
  return d.kase.tier >= 2;
}

export interface FieldSpec {
  key: FieldKey;
  label: string;
  options: { value: string; label: string }[];
}

/** The means the form offers: the night's own, and the others a case of its kind could have had. */
function meansOptions(d: BoardDeal): { value: string; label: string }[] {
  const names = new Set<string>([d.kase.means.name]);
  for (const m of ROOMING_MEANS) names.add(m.name);
  for (const w of WORKPLACES) names.add(w.meansName);
  return [...names].map((n) => ({ value: n, label: cap(n.replace(/^(a|an) /, '')) }));
}

/**
 * Where a lost thing could be: with whoever buys such things, in the places the night has. Round 5,
 * U4: given the run, only the ones the night has named, on a page read or in a line held: a fence
 * nobody mentioned isn't a thread the player missed. Without a run (the truth's labels), all of them.
 */
function whereOptions(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): { value: string; label: string }[] {
  const c = d.kase;
  const said = run ? [...(run.log ?? []).flatMap((p) => p.blocks.map((b) => ('text' in b ? b.text : ''))), ...linesHeld(c, run).map((l) => l.text)].join('\n').replace(/⁣\d+⁤/g, '') : null;
  const named = (who: string) => said === null || new RegExp(`(?<![\\w’])${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`).test(said);
  // Round 6, U5: an answer to "Where it is now" is a place: "With Pardo", never "Pardo" alone.
  const out: { value: string; label: string }[] = holdersOf(c)
    .map((h) => ({ value: `holder:${h.id}`, who: cap(h.who.split(',')[0] as string) }))
    .filter((o) => named(o.who))
    .map((o) => ({ value: o.value, label: `With ${o.who}` }));
  out.push({ value: 'scene', label: `Still at ${placeName(c, c.crime.scene)}` });
  return out;
}

/**
 * The form's questions and their answers. With the run, the answers it offers are the ones the night
 * has given the player (round 5, U4: the fences named); without, every answer (for the truth's words).
 */
export function boardFields(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): FieldSpec[] {
  const c = d.kase;
  const people = suspectsOf(c).map((p) => ({ value: p, label: personOf(c, p)?.name ?? p }));
  const hours = c.board.hours.map((h) => ({ value: String(h), label: `${cap(hourWord(h))} o’clock` }));
  // docs/47 B7: the reasons in an order of their own, and without the suspect's pronoun.
  const why = whyOrder(c, suspectsOf(c)).map((p) => ({ value: p, label: titleClient(c, motiveForm(c, p)) }));
  // docs/47 B9: a lost pet is "him" or "her" on the form too.
  const it = c.type === 'lost-pet' ? pronOf(c, c.crime.victim) : { he: 'it', him: 'it' };
  const out: FieldSpec[] = [
    { key: 'who', label: isMurder(c) ? 'Who did it' : `Who took ${it.him}`, options: people },
    // docs/61: who else lied (the line that cleared them is asked under it).
    ...(asksOther(d) ? [{ key: 'other' as const, label: OTHER_QUESTION, options: [...people, { value: NOBODY, label: NOBODY_LABEL }] }] : []),
    // docs/59 note 9: the question says exactly what it asks: "When was he poisoned?", the hour the dose went in.
    { key: 'when', label: whenQuestion(c), options: hours },
  ];
  if (isMurder(c)) out.push({ key: 'how', label: 'How', options: meansOptions(d) });
  else out.push({ key: 'where', label: `Where ${it.he} is now`, options: whereOptions(d, run) });
  out.push({ key: 'why', label: 'Why', options: why });
  return out;
}

function truthOf(d: BoardDeal, k: FieldKey): string {
  const c = d.kase;
  if (k === 'who') return c.crime.culprit;
  if (k === 'when') return String(c.crime.hour);
  if (k === 'how') return c.means.name;
  if (k === 'why') return c.crime.culprit;
  if (k === 'other') return otherLie(d)?.person ?? NOBODY;
  const h = holdersOf(c).find((x) => c.crime.whereNow?.text.includes(x.who.split(',')[0] as string));
  return h ? `holder:${h.id}` : 'scene';
}

/** The true report. With a run, it cites the lines that run holds: what breaks the story, and what put the thing where it is. */
export function truthReport(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>): BoardReport {
  const breaks = run ? (heldBreakers(d, run)[0]?.id ?? null) : null;
  const whereBy = run && !isMurder(d.kase) ? (heldWhereBy(d, run)[0]?.value ?? null) : null;
  return {
    who: truthOf(d, 'who'),
    when: Number(truthOf(d, 'when')),
    why: truthOf(d, 'why'),
    ...(isMurder(d.kase) ? { how: truthOf(d, 'how') } : { where: truthOf(d, 'where'), whereBy }),
    breaks,
    ...(asksOther(d) ? { other: truthOf(d, 'other'), cleared: run ? (heldClearers(d, run)[0]?.id ?? null) : null } : {}),
  };
}

function given(r: BoardReport, k: FieldKey): string | null {
  const v = k === 'when' ? r.when : (r as unknown as Record<string, string | null | undefined>)[k];
  return v === null || v === undefined ? null : String(v);
}

/** Read a report back from the form's answers: `who=Feldman; when=10; …`. */
export function reportFrom(d: BoardDeal, answers: Partial<Record<FieldKey, string | null>>): BoardReport {
  return {
    who: answers.who ?? null,
    when: answers.when ? Number(answers.when) : null,
    why: answers.why ?? null,
    ...(isMurder(d.kase) ? { how: answers.how ?? null } : { where: answers.where ?? null, whereBy: answers.whereBy ?? null }),
    breaks: answers.breaks ?? null,
    ...(asksOther(d) ? { other: answers.other ?? null, cleared: answers.other && answers.other !== NOBODY ? (answers.cleared ?? null) : null } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * docs/46 §3: what breaks their story, and what put it there.
 * ------------------------------------------------------------------ */

/** One line the report offers: its id, and the line as the notebook says it. */
export interface LineOption {
  value: string;
  label: string;
  /**
   * docs/47 A4: the line touches the named person's own story at the hours that mattered: it says
   * where they were then, or who was at the place they claimed then. The form lists these first,
   * marked; it never says whether they break it.
   */
  touches?: boolean;
}

/** What a line question says for no line at all. */
export const HUNCH = 'A hunch';

/**
 * The line to keep picked when a line question's list is drawn again (the name above it picked or
 * changed): the one picked before, while it's still offered; else none, which is a hunch. A line
 * picked before the name was dropped for a hunch without a word (case 5695, 2026-10-26).
 */
export function keptPick(was: string | null | undefined, options: readonly LineOption[]): string {
  return was && options.some((o) => o.value === was) ? was : '';
}

/**
 * The hours that mattered, as the form says them: the office's window. Never
 * the hour worked out from it, which is the player's to work out (docs/46 §2).
 */
export function hoursThatMattered(d: BoardDeal): Hour[] {
  return d.kase.givens.window ?? d.kase.crime.window;
}

/**
 * What "What breaks their story?" offers for whoever is named: the lines held
 * that name them or fall at the hours that mattered (the office's window),
 * never their own but a story they changed when it was put to them, in the
 * order they came. With nobody named, only the lines at those hours.
 */
export function breakOptions(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, who: PersonId | null): LineOption[] {
  const c = d.kase;
  const hours = new Set(hoursThatMattered(d));
  const own = who !== null && run.asked.includes(`account:${who}`) ? accountOf(c, who) : undefined;
  // docs/47 A4: a line touches their story when it says where they were at an hour that mattered,
  // or who was at the place they claimed then. docs/55 5: or who was, at those hours, at any place
  // their own story names: so the group is the lines a careful reader would check, in the order they
  // were held, and never the one line that breaks it, alone, on top. Round 5, U3 (docs/63): the
  // group's heading says exactly this (`lineGroupHeads`), so every line under it fits it.
  const theirs = new Set<string>(own ? Object.values(own.claims).flatMap((x) => (x?.place ? [x.place] : [])) : []);
  // (Round 9, item 3: and, where company counts (Hard-boiled's pairs), what bears on somebody they said
  // they were with: HB 39's proof, Feeney's pea coat that was Obermann's, sat under "About anybody else".)
  const touches = (l: Line): boolean => who !== null && l.hour !== undefined && hours.has(l.hour) && (l.about.includes(who) || (!!own && l.place !== undefined && (l.place === own.claims[l.hour]?.place || theirs.has(l.place))) || (!!own && bearsOn(c, who, l.hour as Hour, l)));
  // (Case 2312, the owner's ruling: a story changed when it was put to them, "now says…" or
  // "admits…", says the first was false, so it's offered under their name. Left off, the line picked
  // before the name went when the name was picked, and the report filed "A hunch".)
  const changed = (l: Line): boolean => l.kind === 'second' || l.kind === 'admit';
  return linesHeld(c, run)
    .filter((l) => l.kind !== 'find' && (who === null || l.speaker !== who || changed(l)))
    .filter((l) => (l.hour !== undefined && hours.has(l.hour)) || (who !== null && l.about.includes(who)))
    .map((l) => ({ value: l.id, label: lineShown(c, run, l), ...(touches(l) ? { touches: true } : {}) }));
}

/**
 * The same lines as the form shows them (docs/47 A4): the ones that touch the named person's
 * story at the hours that mattered first, then the rest. `breaks=N` counts down this order.
 */
export function breakOptionsShown(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, who: PersonId | null): LineOption[] {
  const all = breakOptions(d, run, who);
  return [...all.filter((o) => o.touches), ...all.filter((o) => !o.touches)];
}

/** The hours that mattered, as the form says them: "ten", "nine or ten". */
export function hoursWords(d: BoardDeal): string {
  const hs = hoursThatMattered(d).map((h) => hourWord(h));
  return hs.length > 1 ? `${hs.slice(0, -1).join(', ')} or ${hs[hs.length - 1]}` : (hs[0] ?? '');
}

/**
 * Round 5, U3 (docs/63): the two groups' headings, as the book and the CLI both say them. The first
 * holds docs/55 5's wide group: lines at the hours that mattered about them, or about any place they
 * said they were tonight (once their own evening is held). Round 6, U5: its heading says only what
 * every line under it is, a line about those hours ("What you know about Renfro at nine or ten" held
 * Grasso's and Abramowitz's own words, three testers); the group stays wide.
 */
export function lineGroupHeads(d: BoardDeal, run: Pick<BoardRun, 'asked'>, who: PersonId): { touching: string; rest: string } {
  // Round 7, U1 (three testers: "Callahan says she was home…" on Dandridge's list "proves nothing
  // about him"): each heading says what's under it, so another person's word reads as theirs. The
  // first group is about them at those hours, or about where they said they were (once their own
  // evening is held); the rest is about anybody else at those hours, or about them at other hours.
  const c = d.kase;
  const N = nameOf(c, who);
  const pr = pronOf(c, who);
  const at = hoursOclock(d);
  const theirs = run.asked.includes(`account:${who}`);
  // (Round 9, item 3: where company counts, the group has what bears on whoever they said they were with.)
  const company = techniquesUpTo(c.tier).has('pair') ? ` anybody ${pr.he} said ${pr.he} was with,` : '';
  return {
    touching: theirs ? `About ${N},${company} or anywhere ${pr.he} said ${pr.he} was tonight, at ${at}:` : `About ${N} at ${at}:`,
    rest: `About anybody else at ${at}, or ${N} at other hours:`,
  };
}

/** The hours that mattered, as the form's headings say them: "nine o’clock", "eight or nine o’clock". */
function hoursOclock(d: BoardDeal): string {
  const hs = hoursThatMattered(d).map((h) => hourWord(h));
  return `${hs.length > 1 ? `${hs.slice(0, -1).join(', ')} or ${hs[hs.length - 1]}` : (hs[0] ?? '')} o’clock`;
}

/**
 * Round 7, U1: one numbering for the night. The same line had a different number on each person's
 * list (Bledsoe was #4 on Dandridge's and #8 on Callahan's, two testers), so every line the form can
 * offer has one number, the same wherever it's listed: the notebook's "What I was told", in the order
 * it was held, then the office's own facts the form can offer, then a crack. `proof=N`, `cleared=N`
 * and `whereproof=N` give that number. Only the numbering: which lines a list offers, and in what
 * order, is `breakOptionsShown`'s and `whereByOptions`'s, as before.
 *
 * Round 8, B1: the numbers come from one list, the notebook's (`notebookLines`), and a number never
 * moves: the office's facts first (they're held from the start), then everything else in the order it
 * was held, a crack where it was said. Raw 33's confession was offered as 12 and never listed, and the
 * next line found took 12 (the crack was numbered after everything, so every line held after it pushed
 * it on), and the office's facts after the lines did the same.
 */
export function lineNumbers(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of notebookLines(d, run)) out.set(o.value, out.size + 1);
  return out;
}

/**
 * Round 8, B1: every line the form can offer, as the notebook lists it, in the order `lineNumbers`
 * numbers it: the office's facts, then each line in the order it was held, with a crack in its place
 * (after the lines held before the confrontation that drew it).
 */
export function notebookLines(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): LineOption[] {
  const c = d.kase;
  const held = linesHeld(c, run);
  const show = (l: Line): LineOption => ({ value: l.id, label: lineShown(c, run, l) });
  const out: LineOption[] = [...held.filter((l) => l.kind === 'given').map(show)];
  const rest = held.filter((l) => l.kind !== 'given');
  const crack = crackHeld(d, run);
  const at = crack ? run.asked.indexOf(crack.value.replace(/^crack:/, 'confront:')) : -1;
  let placed = !crack;
  for (const l of rest) {
    if (!placed && run.asked.indexOf(l.q) > at) {
      out.push(crack as LineOption);
      placed = true;
    }
    out.push(show(l));
  }
  if (!placed && crack) out.push(crack);
  return out;
}

/**
 * Round 5, U6, in docs/64's words: what closing the case does with a blank, said once, the same in
 * the book and the CLI. (A blank answer is still "I don't know", and a blank proof "A hunch": the
 * scoring doesn't change, only what the form says about it.)
 */
export function blankRule(d: BoardDeal, spent: boolean): string {
  void d;
  return `${spent ? 'No actions left. ' : ''}Closing the case is final. Leave anything blank if you’re not sure.`;
}

/**
 * book-look, item 1: the report taken out by choice can be put away again, free, while there are
 * actions left (the engine's `back`). Once the clock has run out it stays out. The book's button and
 * the CLI's `do back` say it in these words.
 */
export const BACK_TO_CASE = 'Back to the case';

/** Whether the report on the desk can still be put away: taken out by choice, not by the clock. */
export function canGoBack(d: BoardDeal, run: Pick<BoardRun, 'reportOpen' | 'filed' | 'used'>): boolean {
  return run.reportOpen && !run.filed && run.used < budgetCalls(d);
}

/** book-look, item 1: a report with every answer "I don't know", said before it's closed. */
export const BLANK_REPORT = 'Every answer is “I don’t know”. Closing the case now charges nobody.';

/** Whether a report names nothing at all: every answer "I don't know" (a proof alone is still a hunch). */
export function blankReport(r: BoardReport): boolean {
  return [r.who, r.when, r.how, r.why, r.where, r.other].every((v) => v === null || v === undefined);
}

/**
 * book-look, item 1: the charge, said back before the case is closed, the same in the book's
 * confirm and the CLI's `close`: "You’re charging Minnie Hurwitz: at ten o’clock, with a revolver.",
 * the reason, what proves they lied, whether anyone else lied, and what's left blank. Plain words
 * (docs/53's addendum: chrome is plain modern English).
 */
export function chargeLines(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, r: BoardReport): string[] {
  const c = d.kase;
  if (blankReport(r)) return [BLANK_REPORT];
  const fields = boardFields(d, run);
  const labelOf = (k: FieldKey, v: string | null | undefined) => (v ? (fields.find((f) => f.key === k)?.options.find((o) => o.value === v)?.label ?? v) : null);
  const lower = (s: string) => s.replace(/^[A-Z](?![A-Z.])/, (x) => x.toLowerCase());
  const it = c.type === 'lost-pet' ? pronOf(c, c.crime.victim).he : 'it';
  const out: string[] = [];
  const parts: string[] = [];
  if (r.when !== null && r.when !== undefined) parts.push(isMurder(c) ? `at ${oclock(r.when as Hour)}` : `${it} went at ${oclock(r.when as Hour)}`);
  if (isMurder(c) && r.how) parts.push(`with ${r.how}`);
  const where = labelOf('where', r.where);
  if (!isMurder(c) && where) parts.push(`${it}’s ${lower(where)}${/^with /i.test(where) ? ' now' : ''}`);
  const facts = parts.length === 0 ? '' : isMurder(c) ? parts.join(', ') : andList(parts);
  const who = r.who ? (personOf(c, r.who)?.name ?? nameOf(c, r.who)) : null;
  out.push(who ? `You’re charging ${who}${facts ? `: ${facts}` : ''}.` : `You’re not naming anybody${facts ? `, but you say ${facts}` : ''}.`);
  if (r.why) {
    // The reason as the verdict says it: a murder's "Petrosino testified against her brother", a small case's own line.
    const said = isMurder(c) && personOf(c, r.why) ? titleClient(c, motiveSaid(c, r.why)) : (labelOf('why', r.why) ?? r.why);
    const end = /[.”]$/.test(said) ? '' : '.';
    out.push(r.why === r.who || !r.who ? `The reason: ${said}${end}` : `The reason you give is ${nameOf(c, r.why)}’s: ${said}${end}`);
  }
  if (r.who) {
    const pr = pronOf(c, r.who);
    out.push(`What proves ${pr.he} lied: ${r.breaks ? lineLabel(d, run, r.breaks, breakOptionsShown(d, run, r.who)) : 'a hunch.'}`);
  }
  if (!isMurder(c) && where) out.push(`What shows where ${it} is: ${r.whereBy ? lineLabel(d, run, r.whereBy, whereByOptions(d, run)) : 'a hunch.'}`);
  if (asksOther(d) && r.other) {
    if (r.other === NOBODY) out.push('Nobody else lied.');
    else {
      const pr = pronOf(c, r.other);
      out.push(`${nameOf(c, r.other)} lied too. What clears ${pr.him}: ${r.cleared ? lineLabel(d, run, r.cleared, clearOptions(d, run, r.other)) : 'a hunch.'}`);
    }
  }
  // What's left as "I don't know", by the form's own questions.
  const left: string[] = [];
  if (!r.who) left.push('who');
  if (asksOther(d) && !r.other) left.push('whether anyone else lied');
  if (r.when === null || r.when === undefined) left.push('when');
  if (isMurder(c) ? !r.how : !r.where) left.push(isMurder(c) ? 'how' : `where ${it} is now`);
  if (!r.why) left.push('why');
  if (left.length) out.push(`You don’t know ${andList(left)}.`);
  return out.map((l) => titleClient(c, l));
}

/** A small case's crack, held: the culprit said where it went when it was put to them, in the page's words. */
function crackHeld(d: BoardDeal, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'log'>>): LineOption | null {
  const c = d.kase;
  const k = c.confrontations.find((x) => x.response === 'crack' && x.gives?.whereNow && run.asked.includes(`confront:${x.person}@${x.hour}`));
  if (!k) return null;
  const page = saidOnPage(run, `crack:${k.person}@${k.hour}`);
  // (Round 7, B8: a pet is "her" or "him" in the crack too: "I took her.")
  const onPage = page ? /“[^”]*\btook (?:it|her|him|them)\b[^”]*”?/.exec(page)?.[0] : undefined;
  const said = onPage ? (onPage.endsWith('”') ? onPage : `${onPage}”`) : (/“All right\. I took it\.[^”]*”/.exec(k.text)?.[0] ?? '“All right. I took it.”');
  // (Round 6, P11, docs/64: never "put to it".)
  return { value: `crack:${k.person}@${k.hour}`, label: `${nameOf(c, k.person)}, when I confronted ${pronOf(c, k.person).him}: ${said}` };
}

/** What "What puts it there?" offers, for a lost thing: every remark and find held, and a crack. */
export function whereByOptions(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): LineOption[] {
  const out: LineOption[] = linesHeld(d.kase, run)
    .filter((l) => l.kind === 'remark' || l.kind === 'find')
    .map((l) => ({ value: l.id, label: lineShown(d.kase, run, l) }));
  const crack = crackHeld(d, run);
  if (crack) out.push(crack);
  return out;
}

/** The remark a remark line came from (`remark:<q>#<i>`). */
function remarkOf(d: BoardDeal, lineId: string): { gives?: { whereNow?: boolean } } | undefined {
  const m = /^remark:(list|account):(.+)#(\d+)$/.exec(lineId);
  if (!m) return undefined;
  const [, kind, who, i] = m as unknown as [string, string, string, string];
  const rs = kind === 'list' ? d.kase.lists.find((l) => l.watcher === who)?.remarks : accountOf(d.kase, who)?.remarks;
  return rs?.[Number(i)];
}

/**
 * The lines held that break the culprit's story: at the hour of one of their
 * lies, the lines that break it (`storyBreakers`: what the collision the grid
 * shows rests on first, then any other that lands when it's put to them), or
 * the list that breaks a second story; and, last, the second story itself.
 * Round 9, item 3: one set with the confront's, so a line scored here lands
 * when it's put to them (HB 39).
 */
export function heldBreakers(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>): Line[] {
  const c = d.kase;
  const p = c.crime.culprit;
  const lines = linesHeld(c, run);
  const out: Line[] = [];
  const add = (l: Line) => {
    if (!out.some((x) => x.id === l.id)) out.push(l);
  };
  for (const lie of c.lies.filter((l) => l.person === p)) {
    const h = lie.hour;
    for (const b of storyBreakers(c, run, p, h, lines)) add(b);
    for (const l of secondBreakers(c, run, p, h, lines)) add(l);
  }
  // (Case 2312, the owner's ruling: a story changed when it was put to them proves the first was a
  // lie. Last, so the line the night turns on, somebody else's word, stays the first.)
  for (const lie of c.lies.filter((l) => l.person === p)) {
    for (const l of lines) if (l.kind === 'second' && l.speaker === p && l.hour === lie.hour) add(l);
  }
  return out;
}

/** The held lines that put a lost thing where it is: the handover the watcher saw, or the culprit's crack. */
export function heldWhereBy(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>): LineOption[] {
  return whereByOptions(d, run).filter((o) => o.value.startsWith('crack:') || !!remarkOf(d, o.value)?.gives?.whereNow);
}

/** The designed path's questions, as a run that asked them: where the true lines come from when the player held none. */
function pathRun(d: BoardDeal): Pick<BoardRun, 'asked' | 'puts'> {
  return { asked: [...d.analysis.path.map((s) => s.q), ...(d.analysis.motive ? [d.analysis.motive] : [])], puts: [] };
}

/**
 * The line that breaks the culprit's story, as the notebook says it: the player's own if they held
 * one (round 6, P11: in the page's words, as the notebook and the form quote it), else the designed
 * path's.
 */
export function trueBreakerText(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): string {
  const mine = run ? heldBreakers(d, run)[0] : undefined;
  if (mine && run) return lineShown(d.kase, run, mine);
  return heldBreakers(d, pathRun(d))[0]?.text ?? 'nothing on the night’s path';
}

/** Round 7, B3: a list line's faces, said with whose they were: " The one in a fur collar was Mosley." */
function faceOwned(d: BoardDeal, l: Line): string {
  if (l.kind !== 'list' || l.hour === undefined) return '';
  const looks = (listOf(d.kase, l.speaker as PersonId)?.entries[l.hour as Hour] ?? []).flatMap((e) => ('look' in e ? [e.look] : []));
  return looks.map((look) => {
    const who = d.kase.people.find((x) => x.look === look);
    return who ? ` The one ${look} was ${nameOf(d.kase, who.id)}.` : '';
  }).join('');
}

/** The line that put the lost thing where it is: the player's own if they held one, else the designed path's. */
export function trueWhereByText(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>): string {
  const o = (run ? heldWhereBy(d, run)[0] : undefined) ?? heldWhereBy(d, pathRun(d))[0];
  return o?.label ?? 'nothing on the night’s path';
}

/* ------------------------------------------------------------------ *
 * docs/61: who else lied, and what cleared them.
 * ------------------------------------------------------------------ */

/**
 * What "what cleared them" offers for whoever is named as the other liar: the same list as "what
 * shows they lied" offers for that name (the lines that touch their story first), so `report <Name>`
 * answers both. Nobody else: no line, only a hunch.
 */
export function clearOptions(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, other: PersonId | null | undefined): LineOption[] {
  if (other === NOBODY) return [];
  return breakOptionsShown(d, run, other ?? null);
}

/**
 * The held lines that clear the other liar: at the hour they lied, a line that puts them where they
 * really were, on somebody's word that holds (a list, a face on a list matched to them, a trusted
 * story they're in, the check an admission named), once what's held places them there. Their own
 * owning up is never one (decided 2026-09-28: an admission is checked, not believed).
 */
export function heldClearers(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>): Line[] {
  const c = d.kase;
  const lie = otherLie(d);
  if (!lie) return [];
  const p = lie.person;
  const h = lie.hour;
  const s = solveRun(c, run);
  if (s.placed.get(`${p}@${h}`)?.place !== lie.truth) return [];
  const look = personOf(c, p)?.look;
  return linesHeld(c, run).filter((l) => {
    if (l.hour !== h || l.place !== lie.truth || l.speaker === p) return false;
    if (l.kind === 'list') return l.about.includes(p) || (!!look && (listOf(c, l.speaker as PersonId)?.entries[h] ?? []).some((e) => 'look' in e && e.look === look));
    if (l.kind === 'claim') return l.about.includes(p) && s.status.get(`${l.speaker}@${h}`)?.s === 'trusted';
    return (l.kind === 'remark' || l.kind === 'given') && l.about.includes(p);
  });
}

/**
 * Decided 2026-10-25 (docs/69 §1.5): "Nobody else" needs proof, like every other answer. On a night where
 * nobody else lied it's the full point only when what's held rules out every other suspect at the
 * hours that mattered: the solver on what's held (`solveRun`) clears every suspect but the culprit,
 * each placed away by a story that stands (nothing breaks it, and a list or somebody's agreeing story
 * confirms it) or by a list, at the office's hours as what's held narrows them, or ruled out by the
 * list where the means was. Without that it's right on a hunch, and counts half.
 */
export function nobodyElseProved(d: BoardDeal, run: Pick<BoardRun, 'asked'>): boolean {
  const c = d.kase;
  const s = solveRun(c, run);
  return suspectsOf(c).every((p) => p === c.crime.culprit || s.cleared.has(p));
}

/** The line that cleared the other liar, as the notebook says it: the player's own if they held one (in the page's words), else the designed path's. */
export function trueClearerText(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>): string {
  const mine = run ? heldClearers(d, run)[0] : undefined;
  if (mine && run) return lineShown(d.kase, run, mine);
  return heldClearers(d, pathRun(d))[0]?.text ?? 'nothing on the night’s path';
}

function lineLabel(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>, id: string | null | undefined, opts: LineOption[]): string {
  if (!id) return HUNCH;
  return opts.find((o) => o.value === id)?.label ?? linesHeld(d.kase, run).find((l) => l.id === id)?.text ?? id;
}

export function scoreBoard(d: BoardDeal, run: BoardRun, report: BoardReport): Verdict {
  const scored: FieldResult[] = boardFields(d).map((f) => {
    const g = given(report, f.key);
    const t = truthOf(d, f.key);
    // docs/59 item 8: the verdict's why is one person's, said with their pronoun ("Rafferty threw her out of a lease"), never "them".
    const label = (v: string | null) => (v === null ? 'I don’t know' : f.key === 'why' && personOf(d.kase, v) ? titleClient(d.kase, motiveSaid(d.kase, v)) : (f.options.find((o) => o.value === v)?.label ?? v));
    return { key: f.key, label: f.label, given: label(g), truth: label(t), correct: g !== null && g === t, answered: g !== null };
  });
  const who = scored[0] as FieldResult;
  // What breaks their story: one of the lines held that breaks the culprit's. A hunch or the wrong line halves who.
  const breaksOk = !!report.breaks && heldBreakers(d, run).some((l) => l.id === report.breaks);
  if (who.correct && !breaksOk) who.half = true;
  const fields: FieldResult[] = [
    who,
    { key: 'breaks', label: BREAKS_LABEL, given: lineLabel(d, run, report.breaks, breakOptions(d, run, report.who)), truth: trueBreakerText(d, run), correct: who.correct && breaksOk, answered: true, line: true },
  ];
  const other = otherLie(d);
  for (const f of scored.slice(1)) {
    fields.push(f);
    // (Round 7, B9: the question as the verdict asks it, whether or not anybody else lied.)
    if (f.key === 'other') f.label = OTHER_LABEL;
    if (f.key === 'other' && other) {
      // docs/61: who else lied, and the line that clears them. Its point needs both; a hunch, the
      // wrong line or the wrong name costs it.
      const named = f.correct;
      const ok = named && !!report.cleared && heldClearers(d, run).some((l) => l.id === report.cleared);
      f.label = OTHER_LABEL;
      if (named && !ok) {
        f.correct = false;
        f.why = `the right name, but not what cleared ${pronOf(d.kase, other.person).him}`;
      }
      fields.push({ key: 'cleared', label: CLEARED_LABEL, given: lineLabel(d, run, report.cleared, clearOptions(d, run, report.other)), truth: trueClearerText(d, run), correct: ok, answered: true, line: true });
      continue;
    }
    // Decided 2026-10-25 (docs/69 §1.5): "Nobody else", right, but not on what's held: half.
    if (f.key === 'other' && f.correct && !nobodyElseProved(d, run)) f.half = true;
    if (f.key !== 'where') continue;
    // Where it is now: which line put it there. A hunch or the wrong line halves where.
    const ok = !!report.whereBy && heldWhereBy(d, run).some((o) => o.value === report.whereBy);
    if (f.correct && !ok) f.half = true;
    fields.push({ key: 'whereBy', label: whereByLabel(d), given: lineLabel(d, run, report.whereBy, whereByOptions(d, run)), truth: trueWhereByText(d, run), correct: f.correct && ok, answered: true, line: true });
  }
  const points = scored.reduce((n, f) => n + (f.correct ? (f.half ? 0.5 : 1) : 0), 0);
  const asked = scored.length;
  const outcome: Outcome = !who.answered ? 'cold' : !who.correct ? 'wrong-man' : who.half ? 'lucky' : points === asked ? 'solved' : 'thin';
  const plain: string[] = [];
  if (who.half) plain.push('Right, but you couldn’t have known: half credit on who.');
  // docs/61: the right name, and the other liar not ruled out, said plainly.
  if (other && who.correct && scored.some((f) => f.key === 'other' && !f.correct)) {
    const pr = pronOf(d.kase, other.person);
    // (Round 9, item 7: what clears them is somebody else's word, never their own. Medium 37 filed
    // Sirkin's own owning up and lost the point, and nothing said why.)
    const own = !!report.cleared && linesHeld(d.kase, run).find((l) => l.id === report.cleared)?.speaker === other.person;
    const tail = report.other !== other.person ? '' : own ? `: ${pr.his} own word doesn’t clear ${pr.him}; somebody else’s has to` : report.cleared ? `: what you picked doesn’t clear ${pr.him}` : `: a hunch doesn’t clear ${pr.him}`;
    plain.push(`You had the right name, but you didn’t rule out ${nameOf(d.kase, other.person)}${tail}.`);
  }
  // (Round 9, item 7: a line that wasn't the one is said as a line, whose word it was: "it was Bledsoe
  // says he was at the print shop…" read as broken grammar.)
  for (const f of fields) if (f.line && !f.correct && !f.why) f.why = `${f.key === 'cleared' && other ? `what cleared ${pronOf(d.kase, other.person).him}` : 'what proved it'}: ${f.truth}`;
  // (Round 7, B9: a night where only one story broke: somebody named as lying too had told the truth.)
  if (!other && report.other && report.other !== NOBODY && scored.some((f) => f.key === 'other')) plain.push(`Nobody else lied: ${nameOf(d.kase, report.other)} had told the truth.`);
  // (Decided 2026-10-25, docs/69 §1.5: and "Nobody else" before everybody else was checked, said as who on a hunch is.)
  if (scored.some((f) => f.key === 'other' && f.half)) plain.push('Right, but you hadn’t checked everyone: half credit on whether anyone else lied.');
  if (scored.some((f) => f.key === 'where' && f.half)) plain.push('Where it is now was right, but not on what showed it: half credit on where.');
  // Round 6, P11: what's scored, plainly, and what counts with it ("4 out of 4: who (and what proves
  // they lied), when, where (and what proves it) and why." read like a form to every tester).
  // (Round 7, B9: "whether anyone else lied", and what clears them only where somebody else did.)
  const what = scored.map((f) => (f.key === 'other' ? 'whether anyone else lied' : f.key));
  const proofs = scored.flatMap((f) => (f.key === 'who' ? ['who'] : f.key === 'where' ? ['where'] : []));
  const clears = scored.some((f) => f.key === 'other') && !!other;
  const scoreLine = `${pointsText(points)} out of ${asked}: ${andList(what)}, with the proof for ${proofs.map((x, i) => (i === 0 ? x : `for ${x}`)).join(' and ')}${clears ? ', and what clears the other liar' : ''}.`;
  return {
    points,
    asked,
    scoreLine,
    outcome,
    fields,
    actionsUsed: run.used,
    par: parCalls(d),
    plain,
    closing: closingOf(d, run, outcome, scored.some((f) => f.key === 'where' && f.correct)),
    ...verdictStar(d, run, outcome),
  };
}

/** docs/67: the star, the hints taken and the tally, for the verdict. */
function verdictStar(d: BoardDeal, run: BoardRun, outcome: Outcome): Pick<Verdict, 'hints' | 'star' | 'tally'> {
  const hints = hintsUsed(run);
  return { hints, star: outcome !== 'solved' ? null : hints === 0 ? 'gold' : 'star', tally: tallyWords(d.kase.tier, run.used, hints) };
}

/**
 * docs/47 C13: the lost thing comes home when the report found it. "By nine Fritz was back in his
 * basket by the stove, smelling of the chop house and not a bit sorry."
 */
function homecoming(d: BoardDeal): string | null {
  const c = d.kase;
  if (isMurder(c) || !c.crime.whereNow) return null;
  const v = victimOf(c);
  const at = placeName(c, c.crime.whereNow.place);
  const where = v.description;
  if (c.type === 'lost-pet') return `By nine ${v.short} was back ${where}, smelling of ${at} and not a bit sorry.`;
  const plural = /^the \w+s$/.test(v.short);
  return `By nine ${v.short} ${plural ? 'were' : 'was'} back ${where}, and ${clientOf(c).short} had stopped looking at the place where ${plural ? 'they weren’t' : 'it wasn’t'}.`;
}

function closingOf(d: BoardDeal, run: BoardRun, outcome: Outcome, whereRight = false): string[] {
  return closingLines(d, run, outcome, whereRight).map((x) => titleClient(d.kase, x));
}

function closingLines(d: BoardDeal, run: BoardRun, outcome: Outcome, whereRight = false): string[] {
  const c = d.kase;
  const hand = new Hand(run.seed * 31 + 7, 999, run.spent, run.seen);
  const cl = clientOf(c);
  // (docs/62 item 10: the client by name once, then the pronoun: "I took Steinbach through it over coffee, and she listened".)
  // (Round 7, B8: an ending that names a time names the clock's: "I closed the case at {closedAt}", said
  // from five, when the city is waking up, and "Eight o’clock came" only when it had.)
  const closedMin = minutesAfter(run.used, budgetCalls(d));
  const slots = withCaps({ client: cl.short, cHis: pronOf(c, c.client).his, cHe: pronOf(c, c.client).he, ...(closedMin >= 300 ? { closedAt: clockWords(closedMin) } : {}), ...(closedMin >= NIGHT_MINUTES ? { eightOclock: 'eight o’clock' } : {}) });
  const type = isMurder(c) ? 'murder' : 'small';
  const out: string[] = [];
  const end = hand.draw('ending', { outcome, type }, slots, { widen: true });
  if (end) out.push(end);
  const home = whereRight && (outcome === 'solved' || outcome === 'lucky' || outcome === 'thin') ? homecoming(d) : null;
  if (home) out.push(home);
  // (book-look, item 5: how many actions it took, and what the fastest solve skips, moved out of the
  // verdict's close to "What really happened": `fastestSolveLines`.)
  // The office's prop, paid off, unless the report page already paid it off with this line.
  const fresh = (run.prop?.pay ?? []).filter((l) => !run.spent.includes(`pay:${l.slice(0, 40)}`));
  if (fresh.length) out.push(hand.rng.pick(fresh));
  return out;
}

/**
 * Round 5, U7: the calls a run made that the short way didn't need: questions it could drop and
 * still have everything par's own test asks for (the solver done on what a detective could be pointed
 * to: `analyse`'s goal), at most as many as it ran over par. Puts first (a refusal, then a crack,
 * then the rest), then questions the short way doesn't ask, then the rest, the latest first within
 * each. Never the score: this only says what it was. The motive search par counts is never one; a suspect's
 * own reason, asked, is one when the papers were read too, or the case has no papers to read.
 */
export function spareCalls(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'used'>): string[] {
  const c = d.kase;
  const over = run.used - parCalls(d);
  if (over <= 0) return [];
  const goal = (held: readonly string[]) => solveHeld(c, closure(c, held)).done;
  let held = solverHeld(run);
  if (!goal(held)) return [];
  const papers = d.analysis.motive;
  const out: string[] = [];
  // A suspect's reason, asked: never what the solver needs; spare when the papers (or the client) said it anyway.
  const reasons = run.asked.filter((q) => q.startsWith('motive:'));
  const freeWhy = !papers || run.asked.includes(papers);
  const path = new Set(d.analysis.path.map((s) => s.q));
  const rank = (q: string): number => {
    // A question the short way asks too is named last: what the curtain's short way skips, first.
    if (!q.startsWith('confront:')) return path.has(q) ? 4 : 3;
    const [p, h] = q.slice(9).split('@') as [string, string];
    const r = confrontationOf(c, p, Number(h))?.response;
    return r === 'refuse' ? 0 : r === 'crack' ? 1 : 2;
  };
  const order = held
    .map((q, i) => ({ q, i }))
    .filter((x) => x.q !== papers)
    .sort((a, b) => rank(a.q) - rank(b.q) || b.i - a.i)
    .map((x) => x.q);
  for (const q of order) {
    if (out.length >= over) break;
    const rest = held.filter((x) => x !== q);
    if (!goal(rest)) continue;
    out.push(q);
    held = rest;
  }
  for (const q of freeWhy ? reasons : reasons.slice(1)) if (out.length < over) out.push(q);
  return out;
}

/**
 * book-look, item 5: how many actions the night took against the fastest solve, said under "What
 * really happened" (the book's panel, the CLI's `story`), no longer as the verdict's last word. Round 5,
 * U7's rule holds: over the fastest solve, it says what that solve skips, so an action a page offered
 * isn't docked without a word. Two more: a night as fast as it can be done isn't scolded ("a better
 * detective"), and a confrontation that landed is never called needless: what it got is said with it.
 */
export function fastestSolveLines(d: BoardDeal, run: BoardRun, outcome: Outcome): string[] {
  const par = parCalls(d);
  const took = `It took me ${run.used} ${run.used === 1 ? 'action' : 'actions'}`;
  if (outcome !== 'solved') return [`${took}. The fastest solve takes ${par}.`];
  if (run.used <= par) return [`${took}, and the fastest solve takes ${par}. It can’t be done in fewer.`];
  const spare = spareCalls(d, run).slice(0, 3);
  // The questions and searches it skips in one sentence ("It doesn’t ask Quill where she was tonight, or
  // search the floor."); a confrontation in its own, with what it got.
  const asks = spare.filter((q) => !q.startsWith('confront:')).map((q) => spareSaid(d, run, q).replace(/^It doesn’t /, '').replace(/\.$/, ''));
  const said = [...(asks.length ? [`It doesn’t ${asks.length > 1 ? `${asks.slice(0, -1).join(', ')}, or ${asks[asks.length - 1]}` : asks[0]}.`] : []), ...spare.filter((q) => q.startsWith('confront:')).map((q) => spareSaid(d, run, q))];
  const rest = run.used - par - spare.length;
  const tail = rest <= 0 ? [] : spare.length ? ['The rest was the long way round.'] : ['I went the long way round.'];
  return [[`${took}; the fastest solve takes ${par}.`, ...said, ...tail].join(' ')];
}

/**
 * One action the fastest solve skips, said plainly (docs/64: no unit; docs/53: no engine words). A
 * question or a search: "It doesn’t ask Lanza where she was tonight." A confrontation that landed:
 * that the fastest solve doesn't confront them, and what confronting them got.
 */
function spareSaid(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, q: string): string {
  const c = d.kase;
  const [kind, rest] = q.split(/:(.*)/s) as [string, string];
  if (kind === 'confront') {
    const [p, h] = rest.split('@') as [string, string];
    const k = confrontationOf(c, p, Number(h));
    const pr = pronOf(c, p);
    const lead = `It doesn’t confront ${nameOf(c, p)}`;
    // A crack's where-it-went, already said by somebody who saw the handover. Round 6, P11: say what
    // they saw, which is what showed it (she saw a coat, not the watch).
    const by = k?.response === 'crack' ? heldWhereBy(d, run).find((o) => !o.value.startsWith('crack:')) : undefined;
    const who = by ? /^remark:(?:list|account):(.+)#\d+$/.exec(by.value)?.[1] : undefined;
    if (who) {
      const holder = holderShort(d);
      const coat = /\bunder a coat\b/.test(by?.label ?? '');
      const hour = hourWord((c.crime.hour + 1) as Hour);
      const saw = coat && holder ? `the coat ${nameOf(c, who)} saw go straight to ${holder} at ${hour}` : `what ${nameOf(c, who)} saw at ${hour}`;
      return `${lead}: ${saw} shows where ${victimOf(c).short} went. Confronting ${pr.him} got ${pr.him} to say it.`;
    }
    if (k?.response === 'refuse') return `${lead}. Confronting ${pr.him} caught ${pr.him} in the lie, even if ${pr.he} wouldn’t say more.`;
    return `${lead}. Confronting ${pr.him} caught ${pr.him} in the lie.`;
  }
  if (kind === 'list') return `It doesn’t ask ${nameOf(c, rest)} who was in tonight.`;
  if (kind === 'account') return `It doesn’t ask ${nameOf(c, rest)} where ${pronOf(c, rest).he} was tonight.`;
  if (kind === 'motive') return `It doesn’t ask ${nameOf(c, rest)} about ${victimOf(c).short}.`;
  const f = c.finds.find((x) => x.id === rest);
  return `It doesn’t search ${f ? f.what.replace(/^[A-Z]/, (x) => x.toLowerCase()) : 'there'}.`;
}

/* ------------------------------------------------------------------ *
 * What really happened: the crime only.
 * ------------------------------------------------------------------ */

export function storyOfBoard(d: BoardDeal): string[] {
  return storyLines(d).map((x) => titleClient(d.kase, x));
}

function storyLines(d: BoardDeal): string[] {
  const c = d.kase;
  const p = c.crime.culprit;
  const pr = pronOf(c, p);
  const name = personOf(c, p)?.name ?? nameOf(c, p);
  const short = nameOf(c, p);
  const v = victimOf(c);
  const out: string[] = [];
  const row = c.board.rows[p] ?? {};
  const atOrigin = c.means.available.find((h) => row[h] === c.means.origin);
  const lie = c.lies.find((l) => l.person === p);
  // "home", not "Thorndike’s flat", of Thorndike (Medium 14's #29).
  const claim = lie ? (personOf(c, p)?.home === lie.claim ? 'home' : placeName(c, lie.claim)) : undefined;
  const motive = personOf(c, p)?.motive;
  if (isMurder(c)) {
    out.push(`${name} did it. The reason was an old one: ${motive}.`);
    // (Round 9, item 6: the weapon as the scene card had it, and nothing it didn't say: "took the landlady’s
    // late husband’s revolver" had a husband nobody had mentioned; the scene said the landlady shows it to
    // any lodger behind with the rent.)
    const scene = c.finds.find((f) => f.gives.means)?.text ?? '';
    const took = c.means.originText
      .replace(/, there from .*$/, '')
      .replace(/, open from .*$/, '')
      .replace(new RegExp(` (?:at|from) ${placeName(c, c.means.origin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      .replace(/^the ((?:[\w’ ]+?’s )+)(?=[a-z])/, (m, owners: string) => (scene.includes(owners.trim()) ? m : 'the '))
      .replace(/^(the [\w ]+), from /, '$1 from ');
    out.push(atOrigin !== undefined ? `At ${oclock(atOrigin)} ${short} was at ${placeName(c, c.means.origin)}, and took ${took}.` : `${cap(short)} took ${took} while it sat there to be taken.`);
    const moment = meansMoment(c.means.kind, v.short, c.means.name.replace(/^(a|an) /, ''), vesselOf(c), pronOf(c, c.crime.victim).his, pronOf(c, c.crime.culprit).he === pronOf(c, c.crime.victim).he);
    // docs/59 note 9: a poisoning's hour is the hour the dose went in, said as the office and the report say it.
    const dose = poisonAfter(c);
    const vp = pronOf(c, c.crime.victim);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} went round to ${placeName(c, c.crime.scene)}, and ${v.short} let ${pr.him} in. ${dose ? `That was when ${vp.he} was poisoned: ${moment.replace(/, and [^,]+ never tasted it\.$/, '').replace(/^The\b/, 'the')}, and ${dose.replace(/^.*?, so /, '')}.` : moment}`);
    const after = c.board.hours.find((h) => h > c.crime.hour);
    // (Round 9, item 9: "as if he had never left" only where he had been there before: "By ten o’clock he
    // was at Moe’s, as if he had never left" of a man who'd never been at Moe's, Coddled and Poached 34.)
    const before = c.board.hours.filter((h) => h < c.crime.hour).pop();
    const back = before !== undefined && after !== undefined && row[before] === row[after];
    if (after !== undefined) out.push(`By ${oclock(after)} ${pr.he} was at ${placeName(c, row[after] ?? '')}${back ? `, as if ${pr.he} had never left` : ''}.`);
  } else {
    out.push(`${name} took ${v.short}. ${cap(pastOf(motive ?? ''))}.`);
    if (atOrigin !== undefined) out.push(`${cap(short)} was at ${placeName(c, c.means.origin)} at ${oclock(atOrigin)} and heard about ${c.means.originText.replace(/^[^;]*; /, '')}.`);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} let ${pr.self} into ${placeName(c, c.crime.scene)} and came out with ${v.short}.`);
    // Round 6, P11: the handover the watcher saw, in the story too (it went straight from the theft to
    // "ended up with Benny", and the eleven o'clock step the player had found wasn't in it).
    const handed = c.lists.some((l) => l.remarks.some((r) => r.gives?.whereNow));
    const holder = c.crime.whereNow ? c.crime.whereNow.text.replace(/^with /, '').replace(/, at [^,]+$/, '') : '';
    const it = /^the \w+s$/.test(v.short) ? 'them' : pronOf(c, c.crime.victim).him;
    if (c.crime.whereNow && handed && holder) out.push(`At ${oclock((c.crime.hour + 1) as Hour)} ${pr.he} carried ${it} into ${placeName(c, c.crime.whereNow.place)} under a coat and handed ${it} to ${holder}.`);
    else if (c.crime.whereNow) out.push(`${cap(v.short)} ended up ${c.crime.whereNow.text}.`);
  }
  if (claim && lie) out.push(`Asked, ${pr.he} said ${pr.he} had been ${claim === 'home' ? 'home' : `at ${claim}`} at ${hourWord(lie.hour)}. ${breakerOf(d)}`);
  return out;
}

/** The fence's name, from where the lost thing ended up: "Pardo", "Benny". */
function holderShort(d: BoardDeal): string | null {
  const t = d.kase.crime.whereNow?.text;
  return t ? (t.replace(/^with /, '').split(',')[0] ?? null) : null;
}

function meansMoment(kind: string, victim: string, means = 'it', vessel = 'drink', his = 'his', twoOfOneSex = false): string {
  if (kind === 'gun') return `${cap(victim)} was shot across ${his} own table.`;
  if (kind === 'blade') return `When ${victim} turned ${his} back, that was the end of it.`;
  // The scene's own cup, said (Poached 5's #32: the cocoa was planted and never cashed; Hard-boiled 8's #26: "It").
  // (Round 9, item 3: `vesselOf`, the one the office's supper line says too.)
  // (Right after "let her in", a dead woman's cocoa is the cocoa: "her" could be the one let in.)
  return `The ${means} went into ${twoOfOneSex ? 'the' : his} ${vessel}, and ${victim} never tasted it.`;
}

/** A motive said of tonight, told as a story afterwards: "he is three weeks behind" → "he was". */
function pastOf(s: string): string {
  return s.replace(/\b(he|she) is\b/g, '$1 was').replace(/\b(he|she) has been\b/g, '$1 had been').replace(/\b(he|she) has\b/g, '$1 had').replace(/\b(he|she) owes\b/g, '$1 owed').replace(/\b(he|she) says\b/g, '$1 said').replace(/\btakes things\b/g, 'took things').replace(/\bhaven’t spoken\b/g, 'hadn’t spoken').replace(/\bsings\b/g, 'sang');
}

/**
 * How the lie came out: what it collided with. Round 6, P11: said as what happened ("Alfano said
 * otherwise" read like a ledger): the watcher who hadn't seen them where they said, or what somebody
 * saw of them; the minimal set's speakers only where the path's breaker is neither.
 */
function breakerOf(d: BoardDeal): string {
  const c = d.kase;
  const lie = c.lies.find((l) => l.person === c.crime.culprit);
  if (!lie) return '';
  const p = lie.person;
  const pr = pronOf(c, p);
  const path = heldBreakers(d, pathRun(d)).filter((l) => l.hour === lie.hour);
  const watched = path.find((l) => l.kind === 'list' && l.place === lie.claim && !l.about.includes(p));
  if (watched?.speaker) {
    const W = nameOf(c, watched.speaker);
    const role = introOf(c, watched.speaker);
    const look = personOf(c, p)?.look;
    const entries = listOf(c, watched.speaker)?.entries[lie.hour] ?? [];
    const faces = entries.flatMap((e) => ('look' in e ? [e.look] : []));
    // (Hard-boiled's face: the stranger said as the watcher saw them, against the coat they wore.)
    const tail = look && faces.length > 0 ? `, ${faces.length === entries.length ? 'only somebody' : 'and the stranger there was'} ${faces[0]}, and ${nameOf(c, p)} was ${look}` : '';
    return `${W}${role ? `, ${role},` : ''} hadn’t seen ${pr.him} there${tail}.`;
  }
  const passed = path.find((l) => l.kind === 'remark' && l.speaker);
  const m = passed ? /\bI passed (?:(?:Mrs\.|Miss|Dr\.) )?\S+ on (.+?), (.+?)\.$/.exec(passed.text.replace(/”$/, '')) : null;
  if (passed?.speaker && m) return `But ${nameOf(c, passed.speaker)} had passed ${pr.him} on ${m[1]} at ${hourWord(lie.hour)}, ${m[2]}.`;
  // Round 7, B3: a pair's story is broken by the face the partner was seen in, never by the partner,
  // who said the same: "Mosley said the same, to cover for her, but Bledsoe, the head waiter, had only
  // somebody in a fur collar at Moskowitz’s at nine, and that was Mosley."
  const partner = lie.kind === 'pair' ? c.lies.find((l) => l.kind === 'pair' && l.person !== p && l.hour === lie.hour)?.person : undefined;
  const look = partner ? personOf(c, partner)?.look : undefined;
  const faced = look ? path.find((l) => l.kind === 'list' && (listOf(c, l.speaker as PersonId)?.entries[lie.hour] ?? []).some((e) => 'look' in e && e.look === look)) : undefined;
  if (partner && look && faced?.speaker) {
    const W = nameOf(c, faced.speaker);
    const role = introOf(c, faced.speaker);
    const only = (listOf(c, faced.speaker)?.entries[lie.hour] ?? []).length === 1 ? 'only ' : '';
    return `${nameOf(c, partner)} said the same, to cover for ${pr.him}, but ${W}${role ? `, ${role},` : ''} had seen ${only}somebody ${look} at ${placeName(c, faced.place ?? '')} at ${hourWord(lie.hour)}, and that was ${nameOf(c, partner)}.`;
  }
  const T = techniquesUpTo(c.tier);
  const qs = questionsOf(c).map((q) => q.id).filter((q) => !q.startsWith('confront:'));
  const sets = minimalSets(qs, [], (held) => solve(c, held, { techniques: T }).status.get(key(lie.person, lie.hour))?.s === 'broken', 3, true);
  // (Round 7, B3: whoever only said what they said isn't somebody who "said otherwise".)
  const agrees = (q: string) => linesHeld(c, { asked: [q], puts: [] }).some((l) => l.hour === lie.hour && agreesWith(c, p, lie.hour, l));
  const first = sets[0]?.filter((q) => q !== `account:${lie.person}` && !agrees(q)) ?? [];
  if (first.length === 0) return 'Nothing true agreed with it.';
  const names = first.map((q) => questionById(c, q)).map((q) => (q?.kind === 'list' || q?.kind === 'account' ? nameOf(c, q.subject) : 'what I found in the room'));
  return `${cap(andList(names))} said otherwise.`;
}

/* ------------------------------------------------------------------ *
 * Behind the curtain: the true board, the path and the lies.
 * ------------------------------------------------------------------ */

/** docs/53, addendum: a step's reason as a person says it: "Shapiro saw Tramonti at …", "(Mrs. Krantz said so)", "confront Grasso" (docs/64). */
function pathWhy(why: string, client: string): string {
  return plainWhy(why, client)
    .replace(/\s*\(the office\):/g, ` (${client} said so):`)
    .replace(/\bput it to ((?:Mrs\.|Miss|Dr\.) )?([A-Z][\w’]*)/g, 'confront $1$2');
}

/** A step as the curtain says it: "Confront Ruggiero: nine o’clock.", never the generator's "Put it to" (docs/64). */
function pathLabel(label: string): string {
  return label.replace(/^Put it to /, 'Confront ');
}

/**
 * What somebody said, as a clause with its verb (docs/62 §1.2, in the curtain too, round 6): "Thorndike
 * said he was home at ten", "Alfano said she was at the chop house at ten", never "said the chop house".
 */
function saidWas(c: BoardDeal['kase'], p: PersonId, place: string, h: Hour): string {
  const s = saidParts(c, p, place, h);
  return `${s.lead}${s.where}${s.tail}`;
}

/**
 * curtain (docs/76): `saidWas` in its three parts, so the web view can strike the claim: "Tillman said
 * she was " + "home" + " at ten".
 */
function saidParts(c: BoardDeal['kase'], p: PersonId, place: string, h: Hour): CurtainSaid {
  const home = personOf(c, p)?.home === place;
  const where = home ? (homeNamed(c, p) ? 'home' : `home at ${placeName(c, place)}`) : `at ${placeName(c, place)}`;
  return { lead: `${nameOf(c, p)} said ${pronOf(c, p).he} was `, where, tail: ` at ${hourWord(h)}` };
}

/** curtain (docs/76): how a pick on the report came out, as the verdict's ledger marks it. */
export type CurtainMark = 'right' | 'wrong' | 'half';

/** What somebody said, in parts: `${lead}${where}${tail}` is the clause ("Tillman said she was home at ten"). */
export interface CurtainSaid {
  lead: string;
  where: string;
  tail: string;
}

/**
 * One of the report's questions set against the truth: how the lie came out, who else lied (or that
 * nobody did), where it went. `head` is in sentence case; the text sets it in capitals.
 */
export interface CurtainSection {
  key: 'lie' | 'nobody' | 'other' | 'where';
  head: string;
  /** What was said, or what was so: "Tillman said she was home at ten." */
  said: string | null;
  /** The line that settled it, under its label ("What gave it away", "What cleared him", "What said so"). */
  proof: { label: string; text: string } | null;
  /** What the report picked, beside it, and how that came out. Only with a run and a filed report. */
  picked: { text: string; mark: CurtainMark } | null;
}

/** A cell of the true board: where they really were, and, where they lied about that hour, what they said. */
export interface CurtainCell {
  hour: Hour;
  place: PlaceId;
  name: string;
  claim?: PlaceId;
}

export interface CurtainRow {
  id: PersonId;
  name: string;
  /** Who did it, or the dead man (a murder's victim has a row; a lost thing's doesn't). */
  mark: 'culprit' | 'victim' | null;
  company: boolean;
  cells: CurtainCell[];
}

/** One lie: who, the hour, what they said and where they were, why, and what came of confronting them. */
export interface CurtainLie {
  person: PersonId;
  hour: Hour;
  claim: PlaceId;
  truth: PlaceId;
  said: CurtainSaid;
  /** "she was at Grasso’s place" */
  was: string;
  /** "to hide the crime", "to cover for a friend", "to keep a secret: …" */
  why: string;
  /** "When you confronted her, she told another story." */
  confronted: string;
}

/** A step of the fastest solve, as the curtain says it: its number ("1", or "+" for the motive), the action, why. */
export interface CurtainStep {
  n: string;
  q: string;
  label: string;
  why: string;
}

/** The curtain as a sheet: the report against the truth, the true board, the lies, the fastest solve. */
export interface CurtainSheet {
  sections: CurtainSection[];
  board: { head: string; hours: Hour[]; rows: CurtainRow[]; dead: string | null };
  lies: { head: string; items: CurtainLie[] };
  fastest: { head: string; par: number; kinds: string; steps: CurtainStep[] };
}

/** The curtain as the CLI prints it: the sheet, said as text (`curtain`, the read tool, the lints). */
export function curtainOfBoard(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, filed?: BoardReport): string {
  return curtainText(curtainSheet(d, run, filed));
}

const MARK_GLYPH: Record<CurtainMark, string> = { right: '✓', wrong: '✗', half: '½' };

/** The sheet as text: the words and the layout the CLI's curtain has always had. */
export function curtainText(sheet: CurtainSheet): string {
  const out: string[] = [];
  sheet.sections.forEach((s, i) => {
    if (i > 0) out.push('');
    out.push(s.head.toUpperCase());
    if (s.said) out.push(s.said);
    if (s.proof) out.push(`  ${s.proof.label}: ${s.proof.text}`);
    if (s.picked) out.push(`  ${'You picked:'.padEnd(s.proof ? s.proof.label.length + 1 : 0)} ${s.picked.text}  ${MARK_GLYPH[s.picked.mark]}`);
  });
  out.push('');
  const { hours, rows } = sheet.board;
  const w0 = Math.max(...rows.map((r) => r.name.length)) + 3;
  const cw = Math.max(12, ...rows.flatMap((r) => r.cells.map((x) => x.name.length + 2)));
  out.push(sheet.board.head.toUpperCase());
  out.push(`${''.padEnd(w0)}${hours.map((h) => `${hourWord(h)}`.padEnd(cw)).join('')}`);
  for (const r of rows) {
    const mark = r.mark === 'culprit' ? ' *' : r.mark === 'victim' ? ' †' : '';
    out.push(`${(r.name + mark).padEnd(w0)}${r.cells.map((x) => x.name.padEnd(cw)).join('')}`);
  }
  out.push(`(* who did it${sheet.board.dead ? `, † ${sheet.board.dead}` : ''})`);
  out.push('');
  out.push(sheet.lies.head.toUpperCase());
  for (const l of sheet.lies.items) out.push(`- ${l.said.lead}${l.said.where}${l.said.tail}; ${l.was}, ${l.why}. ${l.confronted}`);
  out.push('');
  // docs/55 7: par, the number the verdict says, and what it's made of; docs/64: "the fastest solve", in actions.
  out.push(`${sheet.fastest.head.toUpperCase()}: ${sheet.fastest.par} actions (${sheet.fastest.kinds})`);
  for (const s of sheet.fastest.steps) out.push(s.n === '+' ? `+. ${s.label}` : `${s.n}. ${s.label} ${s.why}`);
  return out.join('\n');
}

/**
 * The curtain's sheet. Given the night and what was filed, it also sets the true breaking line beside
 * the player's (docs/46 §3), and for a lost thing the line that put it where it is.
 */
export function curtainSheet(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, filed?: BoardReport): CurtainSheet {
  const c = d.kase;
  const sections: CurtainSection[] = [];
  const culprit = c.crime.culprit;
  const lie = c.lies.find((l) => l.person === culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person === culprit);
  const mark = (ok: boolean): CurtainMark => (ok ? 'right' : 'wrong');
  {
    // (Round 7, B3: a face that gave it away says whose it was: the curtain is where the truth is told.)
    const gave = (run ? heldBreakers(d, run)[0] : undefined) ?? heldBreakers(d, pathRun(d))[0];
    let picked: CurtainSection['picked'] = null;
    if (filed && run) {
      const shown = (id: string) => {
        const l = linesHeld(c, run).find((x) => x.id === id);
        return l ? lineShown(c, run, l) : id;
      };
      const mine = filed.breaks ? shown(filed.breaks) : `${HUNCH.toLowerCase()}.`;
      const ok = filed.who === culprit && !!filed.breaks && heldBreakers(d, run).some((l) => l.id === filed.breaks);
      picked = { text: `${filed.who && filed.who !== culprit ? `${nameOf(c, filed.who)}, on ` : ''}${mine}`, mark: mark(ok) };
    }
    sections.push({ key: 'lie', head: 'How the lie came out', said: lie ? `${saidWas(c, culprit, lie.claim, lie.hour)}.` : null, proof: { label: 'What gave it away', text: `${trueBreakerText(d, run)}${gave ? faceOwned(d, gave) : ''}` }, picked });
  }
  // docs/61: the other broken story, and what cleared them, beside what was filed.
  const other = otherLie(d);
  // (Round 7, B9: asked on every night from Poached up; where nobody else lied, the curtain says so.
  // Decided 2026-10-25, docs/69 §1.5: in a heading that doesn't say somebody did, and "Nobody else"
  // without everybody checked is half, as the verdict has it.)
  if (!other && asksOther(d)) {
    let picked: CurtainSection['picked'] = null;
    if (filed && run) {
      picked =
        filed.other && filed.other !== NOBODY
          ? { text: `${nameOf(c, filed.other)}.`, mark: 'wrong' }
          : filed.other === NOBODY
            ? nobodyElseProved(d, run)
              ? { text: 'nobody else.', mark: 'right' }
              : { text: 'nobody else, but you hadn’t checked everyone.', mark: 'half' }
            : { text: 'nobody.', mark: 'wrong' };
    }
    sections.push({ key: 'nobody', head: 'Did anyone else lie?', said: 'Nobody else lied.', proof: null, picked });
  }
  if (other) {
    const p = other.person;
    const cleared = (run ? heldClearers(d, run)[0] : undefined) ?? heldClearers(d, pathRun(d))[0];
    let picked: CurtainSection['picked'] = null;
    if (filed && run) {
      const named = filed.other && filed.other !== NOBODY ? nameOf(c, filed.other) : null;
      const held = filed.cleared ? linesHeld(c, run).find((l) => l.id === filed.cleared) : undefined;
      const line = filed.cleared ? (held ? lineShown(c, run, held) : filed.cleared) : `${HUNCH.toLowerCase()}.`;
      const mine = named ? `${named}, on ${line}` : filed.other === NOBODY ? 'nobody else.' : 'nobody.';
      const ok = filed.other === p && !!filed.cleared && heldClearers(d, run).some((l) => l.id === filed.cleared);
      picked = { text: mine, mark: mark(ok) };
    }
    sections.push({ key: 'other', head: 'Who else lied, and what cleared them', said: `${saidWas(c, p, other.claim, other.hour)}.`, proof: { label: `What cleared ${pronOf(c, p).him}`, text: `${trueClearerText(d, run)}${cleared ? faceOwned(d, cleared) : ''}` }, picked });
  }
  if (!isMurder(c)) {
    let picked: CurtainSection['picked'] = null;
    if (filed && run) {
      const mine = filed.whereBy ? (whereByOptions(d, run).find((o) => o.value === filed.whereBy)?.label ?? filed.whereBy) : `${HUNCH.toLowerCase()}.`;
      const ok = !!filed.whereBy && heldWhereBy(d, run).some((o) => o.value === filed.whereBy);
      picked = { text: mine, mark: mark(ok) };
    }
    sections.push({ key: 'where', head: 'Where it went', said: `${cap(victimOf(c).short)} ended up ${c.crime.whereNow?.text ?? 'where it ended up'}.`, proof: { label: 'What said so', text: trueWhereByText(d, run) }, picked });
  }
  const hours = c.board.hours;
  const ids = [...suspectsOf(c), ...c.people.filter((p) => p.role === 'company').map((p) => p.id), ...(isMurder(c) ? [c.crime.victim] : [])];
  const rows: CurtainRow[] = ids.map((id) => ({
    id,
    name: nameOf(c, id),
    mark: id === c.crime.culprit ? 'culprit' : id === c.crime.victim ? 'victim' : null,
    company: personOf(c, id)?.role === 'company',
    cells: hours.map((h) => {
      const place = c.board.rows[id]?.[h] ?? '';
      const l = c.lies.find((x) => x.person === id && x.hour === h);
      return { hour: h, place, name: placeName(c, place), ...(l ? { claim: l.claim } : {}) };
    }),
  }));
  const lies: CurtainLie[] = c.lies.map((l) => {
    const k = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    const why = l.kind === 'culprit' || l.kind === 'pair' && l.person === c.crime.culprit ? 'to hide the crime' : l.kind === 'pair' ? 'to cover for a friend' : secretWhy(personOf(c, l.person)?.secret);
    const would = k?.response === 'admit' ? 'owned up' : k?.response === 'second-lie' ? 'told another story' : k?.response === 'crack' ? 'cracked' : 'refused to say';
    // Medium 14: "Put to it: refused" read as a put the player never made. Say whether it was.
    // (Round 9, item 4: every confront made, landed or not. HB 39 confronted Tillman with a line that
    // didn't land, and read "You never confronted her".)
    const pr = pronOf(c, l.person);
    const tried = !!run && run.puts.some((x) => x.person === l.person);
    const confronted =
      !run || run.asked.includes(`confront:${l.person}@${l.hour}`)
        ? `When you confronted ${pr.him}, ${pr.he} ${would}.`
        : tried
          ? `You confronted ${pr.him}, but nothing you put to ${pr.him} broke what ${pr.he} said about ${hourWord(l.hour)}, so ${pr.he} stood by it; with something that did, ${pr.he} would have ${wouldHave(k?.response)}.`
          : `You never confronted ${pr.him}; if you had, ${pr.he} would have ${wouldHave(k?.response)}.`;
    return { person: l.person, hour: l.hour, claim: l.claim, truth: l.truth, said: saidParts(c, l.person, l.claim, l.hour), was: `${pr.he} was at ${placeName(c, l.truth)}`, why, confronted };
  });
  // "who was at Kowalski’s tonight?", not "tonight?." (Raw 11's #27).
  // (docs/66, docs/65's routed item: a suspect's evening is asked for what matters about them, as the star says
  // it now, "Alfano was at the meeting, and nobody had said where she was at ten", never the first hour the
  // generator's pointer had, "Alfano was at Hauck’s at eight". Game-side: the star's own reason on the path so far.)
  const stepWhy = (s: (typeof d.analysis.path)[number], i: number): string => {
    if (!s.q.startsWith('account:')) return pathWhy(pathSteps(s.why, d.analysis.path), nameOf(c, c.client));
    // (clarity-5b, item 8: and by the hour that matters, as the hint says it: "Bidwell saw Dandridge at Moe’s
    // at eight: ask Dandridge where he was" is "Nobody had said where Dandridge was at nine: …".)
    const star = hintWords(c, { asked: d.analysis.path.slice(0, i).map((x) => x.q) }, s.q);
    return star ? `${pathWhy(star.replace(' — ', ': ').replace(/^nobody\b/, 'Nobody'), nameOf(c, c.client))}.` : pathWhy(pathSteps(s.why, d.analysis.path), nameOf(c, c.client));
  };
  const steps: CurtainStep[] = d.analysis.path.map((s, i) => ({ n: String(i + 1), q: s.q, label: `${pathLabel(s.label)}${/[?.!]$/.test(s.label) ? '' : '.'}`, why: stepWhy(s, i) }));
  if (d.analysis.motive) steps.push({ n: '+', q: d.analysis.motive, label: `${questionById(c, d.analysis.motive)?.label ?? ''}.`, why: '' });
  return {
    sections,
    board: { head: 'Where they really were', hours: [...hours], rows, dead: isMurder(c) ? `the dead ${victimOf(c).female ? 'woman' : 'man'}` : null },
    lies: { head: 'The lies', items: lies },
    fastest: { head: 'The fastest solve', par: parCalls(d), kinds: fastestKinds(d), steps },
  };
}

/**
 * Round 8, B6: the fastest solve's actions, counted by kind: "6 questions, a search, a look at the papers
 * for the motive and 5 walks". "10 actions (6 questions, …)" counted the table's search as a question, and
 * listed five (Poached 34). The kinds add up to par (`parCalls`).
 */
export function fastestKinds(d: BoardDeal): string {
  const kinds = d.analysis.path.map((s) => s.q.split(':')[0]);
  const n = (...ks: string[]) => kinds.filter((k) => ks.includes(k as string)).length;
  const count = (k: number, one: string, many = `${one}s`) => (k === 1 ? `a ${one}` : `${k} ${many}`);
  const parts = [
    n('account', 'list') ? count(n('account', 'list'), 'question') : '',
    n('search') ? count(n('search'), 'search', 'searches') : '',
    n('confront') ? count(n('confront'), 'confrontation') : '',
    d.analysis.motive ? 'a look at the papers for the motive' : '',
    d.analysis.walks ? count(d.analysis.walks, 'walk') : '',
  ].filter(Boolean);
  return andList(parts);
}

/** docs/56: a liar's secret, as the curtain says it: a bible secret is a whole sentence ("She lets the attic …"), a dealt one a phrase. */
function secretWhy(secret: string | undefined): string {
  if (!secret) return 'to hide something';
  const s = secret.trim();
  if (/^[A-Z]/.test(s) && /[.!?]$/.test(s)) return `to keep a secret: ${s.charAt(0).toLowerCase()}${s.slice(1).replace(/[.!?]$/, '')}`;
  return `to hide ${s}`;
}

/** What they would have done, put to it, after "would have". */
function wouldHave(response: string | undefined): string {
  return response === 'admit' ? 'owned up' : response === 'second-lie' ? 'told another story' : response === 'crack' ? 'cracked' : 'refused to say';
}

/** docs/56: the path's reasons in the words a player has: who saw whom, not whose list has whom. */
function pathSteps(why: string, path: readonly { label: string }[]): string {
  const asked = (n: string): string | undefined => /^Ask ([^:]+):/.exec(path[Number(n) - 1]?.label ?? '')?.[1];
  return why
    .replace(/, and step (\d+) says otherwise/g, (m, n: string) => (asked(n) ? `, and ${asked(n)} said otherwise` : m))
    .replace(/\s*\(step \d+\)/g, '')
    .replace(/((?:(?:Mr|Mrs|Dr)\. )?[A-Z][\w’'-]+)’s list has /g, '$1 saw ');
}

export type { Hour, PersonId };
export { accountOf };
