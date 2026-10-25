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
import { accountOf, collisionsOf, confrontationOf, judgeLine, lineShown, linesHeld, listOf, saidOnPage, solveHeld, solveRun, type Line } from './knowledge.js';
import type { Lie } from '../../gen/board/types.js';
import {
  andList,
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
} from './model.js';
import { withCaps } from './pages.js';
import { titleClient } from './home.js';
import { motiveForm, motiveSaid, whyOrder } from './motives.js';
import { plainWhy } from './stars.js';
import { poisonAfter, whenQuestion } from './when.js';

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
/** docs/61: the other broken story, as the form asks it (plain: it's an instruction), and as the verdict says it. */
export const OTHER_QUESTION = 'Someone else lied too. Who, and what clears them?';
export const OTHER_LABEL = 'Who else lied';
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

/** Whether the report asks who else lied: only on a night with an innocent liar. */
export function asksOther(d: BoardDeal): boolean {
  return otherLie(d) !== null;
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
  const out: { value: string; label: string }[] = holdersOf(c)
    .map((h) => ({ value: `holder:${h.id}`, label: cap(h.who.split(',')[0] as string) }))
    .filter((o) => named(o.label));
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
 * The hours that mattered, as the form says them: the office's window. Never
 * the hour worked out from it, which is the player's to work out (docs/46 §2).
 */
export function hoursThatMattered(d: BoardDeal): Hour[] {
  return d.kase.givens.window ?? d.kase.crime.window;
}

/**
 * What "What breaks their story?" offers for whoever is named: the lines held
 * that name them or fall at the hours that mattered (the office's window),
 * never their own, in the order they came. With nobody named, only the lines
 * at those hours.
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
  const touches = (l: Line): boolean => who !== null && l.hour !== undefined && hours.has(l.hour) && (l.about.includes(who) || (!!own && l.place !== undefined && (l.place === own.claims[l.hour]?.place || theirs.has(l.place))));
  return linesHeld(c, run)
    .filter((l) => l.kind !== 'find' && (who === null || l.speaker !== who))
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
 * says exactly what `touches` holds, docs/55 5's group: lines at the hours that mattered about them,
 * or about any place they said they were tonight (once their own evening is held). "What I have
 * about where Bellucci said he was at ten" claimed less than that, over Mrs. Kowalski's ten o'clock.
 */
export function lineGroupHeads(d: BoardDeal, run: Pick<BoardRun, 'asked'>, who: PersonId): { touching: string; rest: string } {
  const c = d.kase;
  const N = nameOf(c, who);
  const hs = hoursWords(d);
  const told = run.asked.includes(`account:${who}`);
  // docs/64: plain words over the same groups (docs/55 5's wide first group); less literal than round 5's
  // heading, which is the designer's call.
  void told;
  return {
    touching: `What you know about ${N} at ${hs}:`,
    rest: 'Everything else:',
  };
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

/** A small case's crack, held: the culprit said where it went when it was put to them, in the page's words. */
function crackHeld(d: BoardDeal, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'log'>>): LineOption | null {
  const c = d.kase;
  const k = c.confrontations.find((x) => x.response === 'crack' && x.gives?.whereNow && run.asked.includes(`confront:${x.person}@${x.hour}`));
  if (!k) return null;
  const page = saidOnPage(run, `crack:${k.person}@${k.hour}`);
  const onPage = page ? /“[^”]*took it[^”]*”?/.exec(page)?.[0] : undefined;
  const said = onPage ? (onPage.endsWith('”') ? onPage : `${onPage}”`) : (/“All right\. I took it\.[^”]*”/.exec(k.text)?.[0] ?? '“All right. I took it.”');
  return { value: `crack:${k.person}@${k.hour}`, label: `${nameOf(c, k.person)}, put to it: ${said}` };
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
 * lies, a line the break rests on (the collision the grid shows), a line that
 * lands when it's put to them, or the list that breaks a second story.
 */
export function heldBreakers(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>): Line[] {
  const c = d.kase;
  const p = c.crime.culprit;
  const lines = linesHeld(c, run);
  const out: Line[] = [];
  const add = (l: Line) => {
    if (!out.some((x) => x.id === l.id)) out.push(l);
  };
  const cols = collisionsOf(c, run, p);
  for (const lie of c.lies.filter((l) => l.person === p)) {
    const h = lie.hour;
    for (const b of cols.find((x) => x.hour === h)?.breakers ?? []) add(b);
    for (const l of lines) if (l.hour === h && l.speaker !== p && l.kind !== 'find' && judgeLine(c, run, p, h, l).landed) add(l);
    const k = confrontationOf(c, p, h);
    if (k?.secondLie?.place && run.asked.includes(`confront:${p}@${h}`)) {
      for (const l of lines) if (l.kind === 'list' && l.hour === h && l.place === k.secondLie.place && !l.about.includes(p)) add(l);
    }
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

/** The line that breaks the culprit's story, as the notebook says it: the player's own if they held one, else the designed path's. */
export function trueBreakerText(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>): string {
  const l = (run ? heldBreakers(d, run)[0] : undefined) ?? heldBreakers(d, pathRun(d))[0];
  return l?.text ?? 'nothing on the night’s path';
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

/** The line that cleared the other liar, as the notebook says it: the player's own if they held one, else the designed path's. */
export function trueClearerText(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>): string {
  const l = (run ? heldClearers(d, run)[0] : undefined) ?? heldClearers(d, pathRun(d))[0];
  return l?.text ?? 'nothing on the night’s path';
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
    if (f.key !== 'where') continue;
    // Where it is now: which line put it there. A hunch or the wrong line halves where.
    const ok = !!report.whereBy && heldWhereBy(d, run).some((o) => o.value === report.whereBy);
    if (f.correct && !ok) f.half = true;
    fields.push({ key: 'whereBy', label: WHERE_BY_LABEL, given: lineLabel(d, run, report.whereBy, whereByOptions(d, run)), truth: trueWhereByText(d, run), correct: f.correct && ok, answered: true, line: true });
  }
  const points = scored.reduce((n, f) => n + (f.correct ? (f.half ? 0.5 : 1) : 0), 0);
  const asked = scored.length;
  const outcome: Outcome = !who.answered ? 'cold' : !who.correct ? 'wrong-man' : who.half ? 'lucky' : points === asked ? 'solved' : 'thin';
  const plain: string[] = [];
  if (who.half) plain.push('Right, but you couldn’t have known: half credit on who.');
  // docs/61: the right name, and the other liar not ruled out, said plainly.
  if (other && who.correct && scored.some((f) => f.key === 'other' && !f.correct)) {
    const him = pronOf(d.kase, other.person).him;
    const tail = report.other !== other.person ? '' : report.cleared ? `: what you picked doesn’t clear ${him}` : `: a hunch doesn’t clear ${him}`;
    plain.push(`You had the right name, but you didn’t rule out ${nameOf(d.kase, other.person)}${tail}.`);
  }
  if (scored.some((f) => f.key === 'where' && f.half)) plain.push('Where it is now was right, but not on what showed it: half credit on where.');
  const what = scored.map((f) => (f.key === 'who' ? 'who (and what proves they lied)' : f.key === 'other' ? 'who else lied (and what clears them)' : f.key === 'where' ? 'where (and what proves it)' : f.key));
  const scoreLine = `${pointsText(points)} out of ${asked}: ${andList(what)}.`;
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
  };
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
  const slots = withCaps({ client: cl.short, cHis: pronOf(c, c.client).his });
  const type = isMurder(c) ? 'murder' : 'small';
  const out: string[] = [];
  const end = hand.draw('ending', { outcome, type }, slots, { widen: true });
  if (end) out.push(end);
  const home = whereRight && (outcome === 'solved' || outcome === 'lucky' || outcome === 'thin') ? homecoming(d) : null;
  if (home) out.push(home);
  const par = parCalls(d);
  if (outcome === 'solved') {
    // Round 5, U7: over par, it says which calls the short way didn't need, and why, so the call a
    // page offered ("I could face Bellucci with it now") isn't docked without saying so.
    const spare = run.used > par ? spareCalls(d, run) : [];
    const why = spare.slice(0, 3).map((q) => spareSaid(d, run, q));
    const rest = run.used - par - why.length;
    const tail = why.length === 0 ? '' : ` ${why.join(' ')}${rest > 0 ? ' The rest was the long way round.' : ''}`;
    out.push(run.used <= par ? `It took me ${run.used} actions. A better detective would have needed the same, and there aren’t many of those about.` : `It took me ${run.used} actions. A better detective would have done it in ${par}.${tail}`);
  }
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

/** One spare action, said in the closing's voice: what it was, and why it wasn't needed (docs/64: no unit). */
function spareSaid(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'log'>>, q: string): string {
  const c = d.kase;
  const [kind, rest] = q.split(/:(.*)/s) as [string, string];
  if (kind === 'confront') {
    const [p, h] = rest.split('@') as [string, string];
    const k = confrontationOf(c, p, Number(h));
    const pr = pronOf(c, p);
    const lead = `I didn’t need to confront ${nameOf(c, p)}`;
    if (k?.response === 'refuse') return `${lead}: ${pr.he} wouldn’t say, and I had enough to close the case without it.`;
    // A crack's where-it-went, already said by somebody who saw the handover.
    const by = k?.response === 'crack' ? heldWhereBy(d, run).find((o) => !o.value.startsWith('crack:')) : undefined;
    const who = by ? /^remark:(?:list|account):(.+)#\d+$/.exec(by.value)?.[1] : undefined;
    if (who) return `${lead}: ${nameOf(c, who)} had already told me where ${victimOf(c).short} went.`;
    return `${lead}: I had enough to close the case without it.`;
  }
  if (kind === 'list') return `I didn’t need to ask ${nameOf(c, rest)} who was in tonight.`;
  if (kind === 'account') return `I didn’t need to ask ${nameOf(c, rest)} where ${pronOf(c, rest).he} was tonight.`;
  if (kind === 'motive') return `I didn’t need to ask ${nameOf(c, rest)} about ${victimOf(c).short}.`;
  const f = c.finds.find((x) => x.id === rest);
  return `I didn’t need to search ${f ? f.what.replace(/^[A-Z]/, (x) => x.toLowerCase()) : 'there'}.`;
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
    out.push(
      atOrigin !== undefined
        ? `At ${oclock(atOrigin)} ${short} was at ${placeName(c, c.means.origin)}, and took ${c.means.originText.replace(/, there from .*$/, '').replace(/, open from .*$/, '').replace(new RegExp(` (?:at|from) ${placeName(c, c.means.origin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')}.`
        : `${cap(short)} took ${c.means.originText} while it sat there to be taken.`,
    );
    const moment = meansMoment(c.means.kind, v.short, c.means.name.replace(/^(a|an) /, ''), c.finds.find((f) => f.gives.means)?.text ?? '', pronOf(c, c.crime.victim).his, pronOf(c, c.crime.culprit).he === pronOf(c, c.crime.victim).he);
    // docs/59 note 9: a poisoning's hour is the hour the dose went in, said as the office and the report say it.
    const dose = poisonAfter(c);
    const vp = pronOf(c, c.crime.victim);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} went round to ${placeName(c, c.crime.scene)}, and ${v.short} let ${pr.him} in. ${dose ? `That was when ${vp.he} was poisoned: ${moment.replace(/, and [^,]+ never tasted it\.$/, '').replace(/^The\b/, 'the')}, and ${dose.replace(/^.*?, so /, '')}.` : moment}`);
    const after = c.board.hours.find((h) => h > c.crime.hour);
    if (after !== undefined) out.push(`By ${oclock(after)} ${pr.he} was at ${placeName(c, row[after] ?? '')}, as if ${pr.he} had never left.`);
  } else {
    out.push(`${name} took ${v.short}. ${cap(pastOf(motive ?? ''))}.`);
    if (atOrigin !== undefined) out.push(`${cap(short)} was at ${placeName(c, c.means.origin)} at ${oclock(atOrigin)} and heard about ${c.means.originText.replace(/^[^;]*; /, '')}.`);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} let ${pr.self} into ${placeName(c, c.crime.scene)} and came out with ${v.short}.`);
    if (c.crime.whereNow) out.push(`${cap(v.short)} ended up ${c.crime.whereNow.text}.`);
  }
  if (claim && lie) out.push(`Asked, ${pr.he} said ${pr.he} had been ${claim === 'home' ? 'home' : `at ${claim}`} at ${hourWord(lie.hour)}. ${breakerOf(d)}`);
  return out;
}

function meansMoment(kind: string, victim: string, means = 'it', scene = '', his = 'his', twoOfOneSex = false): string {
  if (kind === 'gun') return `${cap(victim)} was shot across ${his} own table.`;
  if (kind === 'blade') return `When ${victim} turned ${his} back, that was the end of it.`;
  // The scene's own cup, said (Poached 5's #32: the cocoa was planted and never cashed; Hard-boiled 8's #26: "It").
  const vessel = /\bcocoa\b/i.test(scene) ? 'cocoa' : /\brye\b/i.test(scene) ? 'rye' : 'drink';
  // (Right after "let her in", a dead woman's cocoa is the cocoa: "her" could be the one let in.)
  return `The ${means} went into ${twoOfOneSex ? 'the' : his} ${vessel}, and ${victim} never tasted it.`;
}

/** A motive said of tonight, told as a story afterwards: "he is three weeks behind" → "he was". */
function pastOf(s: string): string {
  return s.replace(/\b(he|she) is\b/g, '$1 was').replace(/\b(he|she) has been\b/g, '$1 had been').replace(/\b(he|she) has\b/g, '$1 had').replace(/\b(he|she) owes\b/g, '$1 owed').replace(/\b(he|she) says\b/g, '$1 said').replace(/\btakes things\b/g, 'took things').replace(/\bhaven’t spoken\b/g, 'hadn’t spoken').replace(/\bsings\b/g, 'sang');
}

/** How the lie came out: what it collided with. */
function breakerOf(d: BoardDeal): string {
  const c = d.kase;
  const lie = c.lies.find((l) => l.person === c.crime.culprit);
  if (!lie) return '';
  const T = techniquesUpTo(c.tier);
  const qs = questionsOf(c).map((q) => q.id).filter((q) => !q.startsWith('confront:'));
  const sets = minimalSets(qs, [], (held) => solve(c, held, { techniques: T }).status.get(key(lie.person, lie.hour))?.s === 'broken', 3, true);
  const first = sets[0]?.filter((q) => q !== `account:${lie.person}`) ?? [];
  if (first.length === 0) return 'Nothing true agreed with it.';
  const names = first.map((q) => questionById(c, q)).map((q) => (q?.kind === 'list' || q?.kind === 'account' ? nameOf(c, q.subject) : 'what I found in the room'));
  return `${cap(andList(names))} said otherwise.`;
}

/* ------------------------------------------------------------------ *
 * Behind the curtain: the true board, the path and the lies.
 * ------------------------------------------------------------------ */

/**
 * The curtain. Given the night and what was filed, it also sets the true
 * breaking line beside the player's (docs/46 §3), and for a lost thing the
 * line that put it where it is.
 */
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

export function curtainOfBoard(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>, filed?: BoardReport): string {
  const c = d.kase;
  const out: string[] = [];
  const culprit = c.crime.culprit;
  const lie = c.lies.find((l) => l.person === culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person === culprit);
  out.push('HOW THE LIE CAME OUT');
  if (lie) out.push(`${nameOf(c, culprit)} said ${personOf(c, culprit)?.home === lie.claim ? 'home' : placeName(c, lie.claim)} at ${hourWord(lie.hour)}.`);
  out.push(`  What gave it away: ${trueBreakerText(d, run)}`);
  if (filed && run) {
    const mine = filed.breaks ? (linesHeld(c, run).find((l) => l.id === filed.breaks)?.text ?? filed.breaks) : `${HUNCH.toLowerCase()}.`;
    const ok = filed.who === culprit && !!filed.breaks && heldBreakers(d, run).some((l) => l.id === filed.breaks);
    out.push(`  You picked:        ${filed.who && filed.who !== culprit ? `${nameOf(c, filed.who)}, on ` : ''}${mine}${ok ? '  ✓' : '  ✗'}`);
  }
  // docs/61: the other broken story, and what cleared them, beside what was filed.
  const other = otherLie(d);
  if (other) {
    const p = other.person;
    out.push('');
    out.push('WHO ELSE LIED, AND WHAT CLEARED THEM');
    out.push(`${nameOf(c, p)} said ${personOf(c, p)?.home === other.claim ? 'home' : placeName(c, other.claim)} at ${hourWord(other.hour)}.`);
    const lead = `  What cleared ${pronOf(c, p).him}:`;
    out.push(`${lead} ${trueClearerText(d, run)}`);
    if (filed && run) {
      const named = filed.other && filed.other !== NOBODY ? nameOf(c, filed.other) : null;
      const line = filed.cleared ? (linesHeld(c, run).find((l) => l.id === filed.cleared)?.text ?? filed.cleared) : `${HUNCH.toLowerCase()}.`;
      const mine = named ? `${named}, on ${line}` : filed.other === NOBODY ? 'nobody else.' : 'nobody.';
      const ok = filed.other === p && !!filed.cleared && heldClearers(d, run).some((l) => l.id === filed.cleared);
      out.push(`${'  You picked:'.padEnd(lead.length)} ${mine}${ok ? '  ✓' : '  ✗'}`);
    }
  }
  if (!isMurder(c)) {
    out.push('');
    out.push('WHERE IT WENT');
    out.push(`${cap(victimOf(c).short)} ended up ${c.crime.whereNow?.text ?? 'where it ended up'}.`);
    out.push(`  What said so: ${trueWhereByText(d, run)}`);
    if (filed && run) {
      const mine = filed.whereBy ? (whereByOptions(d, run).find((o) => o.value === filed.whereBy)?.label ?? filed.whereBy) : `${HUNCH.toLowerCase()}.`;
      const ok = !!filed.whereBy && heldWhereBy(d, run).some((o) => o.value === filed.whereBy);
      out.push(`  You picked:   ${mine}${ok ? '  ✓' : '  ✗'}`);
    }
  }
  out.push('');
  const hours = c.board.hours;
  const rows = [...suspectsOf(c), ...c.people.filter((p) => p.role === 'company').map((p) => p.id), ...(isMurder(c) ? [c.crime.victim] : [])];
  const w0 = Math.max(...rows.map((id) => nameOf(c, id).length)) + 3;
  const cw = Math.max(12, ...rows.flatMap((id) => hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').length + 2)));
  out.push('WHERE THEY REALLY WERE');
  out.push(`${''.padEnd(w0)}${hours.map((h) => `${hourWord(h)}`.padEnd(cw)).join('')}`);
  for (const id of rows) {
    const mark = id === c.crime.culprit ? ' *' : id === c.crime.victim ? ' †' : '';
    out.push(`${(nameOf(c, id) + mark).padEnd(w0)}${hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').padEnd(cw)).join('')}`);
  }
  out.push('(* who did it' + (isMurder(c) ? `, † the dead ${victimOf(c).female ? 'woman' : 'man'})` : ')'));
  out.push('');
  out.push('THE LIES');
  for (const l of c.lies) {
    const k = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    const why = l.kind === 'culprit' || l.kind === 'pair' && l.person === c.crime.culprit ? 'to hide the crime' : l.kind === 'pair' ? 'to cover for a friend' : secretWhy(personOf(c, l.person)?.secret);
    const would = k?.response === 'admit' ? 'owned up' : k?.response === 'second-lie' ? 'told another story' : k?.response === 'crack' ? 'cracked' : 'refused to say';
    // Medium 14: "Put to it: refused" read as a put the player never made. Say whether it was.
    const put = !run || run.asked.includes(`confront:${l.person}@${l.hour}`) ? `When you confronted ${pronOf(c, l.person).him}, ${pronOf(c, l.person).he} ${would}.` : `You never confronted ${pronOf(c, l.person).him}; if you had, ${pronOf(c, l.person).he} would have ${wouldHave(k?.response)}.`;
    out.push(`- ${nameOf(c, l.person)} said ${personOf(c, l.person)?.home === l.claim ? 'home' : placeName(c, l.claim)} at ${hourWord(l.hour)}; ${pronOf(c, l.person).he} was at ${placeName(c, l.truth)}, ${why}. ${put}`);
  }
  out.push('');
  // docs/55 7: par, the number the verdict says, and what it's made of; docs/64: "the fastest solve", in actions.
  out.push(`THE FASTEST SOLVE: ${parCalls(d)} actions (${d.analysis.par} questions${d.analysis.motive ? ', a look at the papers for the motive' : ''} and ${d.analysis.walks} walks)`);
  // "who was at Kowalski’s tonight?", not "tonight?." (Raw 11's #27).
  d.analysis.path.forEach((s, i) => out.push(`${i + 1}. ${pathLabel(s.label)}${/[?.!]$/.test(s.label) ? '' : '.'} ${pathWhy(pathSteps(s.why, d.analysis.path), nameOf(c, c.client))}`));
  if (d.analysis.motive) out.push(`+. ${questionById(c, d.analysis.motive)?.label ?? ''}.`);
  return out.join('\n');
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
