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
 * The verdict (`Verdict`) is what the book's verdict page and the play CLI
 * print.
 */

import { ROOMING_MEANS, WORKPLACES, HOLDERS } from '../../gen/board/content.js';
import { questionById, key } from '../../gen/board/solver.js';
import { minimalSets } from '../../gen/board/path.js';
import { techniquesUpTo } from '../../gen/board/tiers.js';
import { questionsOf, solve } from '../../gen/board/solver.js';
import { Hand } from './decks.js';
import { accountOf, collisionsOf, confrontationOf, judgeLine, linesHeld, type Line } from './knowledge.js';
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
  suspectsOf,
  victimOf,
  type BoardDeal,
  type BoardReport,
  type BoardRun,
  type Hour,
  type PersonId,
} from './model.js';
import { withCaps } from './pages.js';
import { motiveForm, whyOrder } from './motives.js';

export type FieldKey = 'who' | 'when' | 'how' | 'why' | 'where' | 'breaks' | 'whereBy';

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
export const BREAKS_LABEL = 'What breaks their story';
export const WHERE_BY_LABEL = 'What puts it there';

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

/** Where a lost thing could be: with whoever buys such things, in the places the night has. */
function whereOptions(d: BoardDeal): { value: string; label: string }[] {
  const c = d.kase;
  const out: { value: string; label: string }[] = HOLDERS.map((h) => ({ value: `holder:${h.id}`, label: cap(h.listed) }));
  out.push({ value: 'scene', label: `Still at ${placeName(c, c.crime.scene)}` });
  return out;
}

export function boardFields(d: BoardDeal): FieldSpec[] {
  const c = d.kase;
  const people = suspectsOf(c).map((p) => ({ value: p, label: personOf(c, p)?.name ?? p }));
  const hours = c.board.hours.map((h) => ({ value: String(h), label: `${cap(hourWord(h))} o’clock` }));
  // docs/47 B7: the reasons in an order of their own, and without the suspect's pronoun.
  const why = whyOrder(c, suspectsOf(c)).map((p) => ({ value: p, label: motiveForm(c, p) }));
  // docs/47 B9: a lost pet is "him" or "her" on the form too.
  const it = c.type === 'lost-pet' ? pronOf(c, c.crime.victim) : { he: 'it', him: 'it' };
  const out: FieldSpec[] = [
    { key: 'who', label: isMurder(c) ? 'Who did it' : `Who took ${it.him}`, options: people },
    { key: 'when', label: isMurder(c) ? 'When' : `When ${it.he} went`, options: hours },
  ];
  if (isMurder(c)) out.push({ key: 'how', label: 'How', options: meansOptions(d) });
  else out.push({ key: 'where', label: `Where ${it.he} is now`, options: whereOptions(d) });
  out.push({ key: 'why', label: 'Why', options: why });
  return out;
}

function truthOf(d: BoardDeal, k: FieldKey): string {
  const c = d.kase;
  if (k === 'who') return c.crime.culprit;
  if (k === 'when') return String(c.crime.hour);
  if (k === 'how') return c.means.name;
  if (k === 'why') return c.crime.culprit;
  const h = HOLDERS.find((x) => c.crime.whereNow?.text.includes(x.who.split(',')[0] as string));
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
export function breakOptions(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>, who: PersonId | null): LineOption[] {
  const c = d.kase;
  const hours = new Set(hoursThatMattered(d));
  const own = who !== null && run.asked.includes(`account:${who}`) ? accountOf(c, who) : undefined;
  // docs/47 A4: a line touches their story when it says where they were at an hour that mattered,
  // or who was at the place they claimed then.
  const touches = (l: Line): boolean => who !== null && l.hour !== undefined && hours.has(l.hour) && (l.about.includes(who) || (!!own && l.place !== undefined && l.place === own.claims[l.hour]?.place));
  return linesHeld(c, run)
    .filter((l) => l.kind !== 'find' && (who === null || l.speaker !== who))
    .filter((l) => (l.hour !== undefined && hours.has(l.hour)) || (who !== null && l.about.includes(who)))
    .map((l) => ({ value: l.id, label: l.text, ...(touches(l) ? { touches: true } : {}) }));
}

/**
 * The same lines as the form shows them (docs/47 A4): the ones that touch the named person's
 * story at the hours that mattered first, then the rest. `breaks=N` counts down this order.
 */
export function breakOptionsShown(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>, who: PersonId | null): LineOption[] {
  const all = breakOptions(d, run, who);
  return [...all.filter((o) => o.touches), ...all.filter((o) => !o.touches)];
}

/** A small case's crack, held: the culprit said where it went when it was put to them. */
function crackHeld(d: BoardDeal, run: Pick<BoardRun, 'asked'>): LineOption | null {
  const c = d.kase;
  const k = c.confrontations.find((x) => x.response === 'crack' && x.gives?.whereNow && run.asked.includes(`confront:${x.person}@${x.hour}`));
  if (!k) return null;
  const said = /“All right\. I took it\.[^”]*”/.exec(k.text)?.[0] ?? '“All right. I took it.”';
  return { value: `crack:${k.person}@${k.hour}`, label: `${nameOf(c, k.person)}, put to it: ${said}` };
}

/** What "What puts it there?" offers, for a lost thing: every remark and find held, and a crack. */
export function whereByOptions(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>): LineOption[] {
  const out: LineOption[] = linesHeld(d.kase, run)
    .filter((l) => l.kind === 'remark' || l.kind === 'find')
    .map((l) => ({ value: l.id, label: l.text }));
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

function lineLabel(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'puts'>, id: string | null | undefined, opts: LineOption[]): string {
  if (!id) return HUNCH;
  return opts.find((o) => o.value === id)?.label ?? linesHeld(d.kase, run).find((l) => l.id === id)?.text ?? id;
}

export function scoreBoard(d: BoardDeal, run: BoardRun, report: BoardReport): Verdict {
  const scored: FieldResult[] = boardFields(d).map((f) => {
    const g = given(report, f.key);
    const t = truthOf(d, f.key);
    const label = (v: string | null) => (v === null ? 'I don’t know' : (f.options.find((o) => o.value === v)?.label ?? v));
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
  for (const f of scored.slice(1)) {
    fields.push(f);
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
  if (scored.some((f) => f.key === 'where' && f.half)) plain.push('Where it is now was right, but not on the line that put it there: half credit on where.');
  const what = scored.map((f) => (f.key === 'who' ? 'who (and the line that breaks the story)' : f.key === 'where' ? 'where (and what puts it there)' : f.key));
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
  const c = d.kase;
  const hand = new Hand(run.seed * 31 + 7, 999, run.spent);
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
    out.push(run.used <= par ? `It took me ${run.used} calls. A better detective would have needed the same, and there aren’t many of those about.` : `It took me ${run.used} calls. A better detective would have done it in ${par}.`);
  }
  // The office's prop, paid off, unless the report page already paid it off with this line.
  const fresh = (run.prop?.pay ?? []).filter((l) => !run.spent.includes(`pay:${l.slice(0, 40)}`));
  if (fresh.length) out.push(hand.rng.pick(fresh));
  return out;
}

/* ------------------------------------------------------------------ *
 * What really happened: the crime only.
 * ------------------------------------------------------------------ */

export function storyOfBoard(d: BoardDeal): string[] {
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
  const claim = lie ? placeName(c, lie.claim) : undefined;
  const motive = personOf(c, p)?.motive;
  if (isMurder(c)) {
    out.push(`${name} did it. The reason was an old one: ${motive}.`);
    out.push(
      atOrigin !== undefined
        ? `At ${oclock(atOrigin)} ${short} was at ${placeName(c, c.means.origin)}, and took ${c.means.originText.replace(/, there from .*$/, '').replace(/, open from .*$/, '').replace(new RegExp(` (?:at|from) ${placeName(c, c.means.origin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')}.`
        : `${cap(short)} took ${c.means.originText} while it sat there to be taken.`,
    );
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} went round to ${placeName(c, c.crime.scene)}, and ${v.short} let ${pr.him} in. ${meansMoment(c.means.kind, v.short)}`);
    const after = c.board.hours.find((h) => h > c.crime.hour);
    if (after !== undefined) out.push(`By ${oclock(after)} ${pr.he} was at ${placeName(c, row[after] ?? '')}, as if ${pr.he} had never left.`);
  } else {
    out.push(`${name} took ${v.short}. ${cap(pastOf(motive ?? ''))}.`);
    if (atOrigin !== undefined) out.push(`${cap(short)} learned the way in at ${placeName(c, c.means.origin)} at ${oclock(atOrigin)}: ${c.means.originText.replace(/^[^;]*; /, '')}.`);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} let ${pr.self} into ${placeName(c, c.crime.scene)} and came out with ${v.short}.`);
    if (c.crime.whereNow) out.push(`${cap(v.short)} ended up ${c.crime.whereNow.text}.`);
  }
  if (claim && lie) out.push(`Asked, ${pr.he} said ${pr.he} had been at ${claim} at ${hourWord(lie.hour)}. ${breakerOf(d)}`);
  return out;
}

function meansMoment(kind: string, victim: string): string {
  if (kind === 'gun') return `${cap(victim)} was shot across his own table.`;
  if (kind === 'blade') return `When ${victim} turned his back, that was the end of it.`;
  return `It went into ${victim}’s drink, and ${victim} never knew.`;
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
  const names = first.map((q) => questionById(c, q)).map((q) => (q?.kind === 'list' ? `${nameOf(c, q.subject)}’s list` : q?.kind === 'account' ? `${nameOf(c, q.subject)}’s own evening` : 'the room'));
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
export function curtainOfBoard(d: BoardDeal, run?: Pick<BoardRun, 'asked' | 'puts'>, filed?: BoardReport): string {
  const c = d.kase;
  const out: string[] = [];
  const culprit = c.crime.culprit;
  const lie = c.lies.find((l) => l.person === culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person === culprit);
  out.push('WHAT BROKE THE STORY');
  if (lie) out.push(`${nameOf(c, culprit)} said ${personOf(c, culprit)?.home === lie.claim ? 'home' : placeName(c, lie.claim)} at ${hourWord(lie.hour)}.`);
  out.push(`  What broke it: ${trueBreakerText(d, run)}`);
  if (filed && run) {
    const mine = filed.breaks ? (linesHeld(c, run).find((l) => l.id === filed.breaks)?.text ?? filed.breaks) : `${HUNCH.toLowerCase()}.`;
    const ok = filed.who === culprit && !!filed.breaks && heldBreakers(d, run).some((l) => l.id === filed.breaks);
    out.push(`  You filed:     ${filed.who && filed.who !== culprit ? `${nameOf(c, filed.who)}, on ` : ''}${mine}${ok ? '  ✓' : '  ✗'}`);
  }
  if (!isMurder(c)) {
    out.push('');
    out.push('WHAT PUT IT THERE');
    out.push(`${cap(victimOf(c).short)} ended up ${c.crime.whereNow?.text ?? 'where it ended up'}.`);
    out.push(`  What said so: ${trueWhereByText(d, run)}`);
    if (filed && run) {
      const mine = filed.whereBy ? (whereByOptions(d, run).find((o) => o.value === filed.whereBy)?.label ?? filed.whereBy) : `${HUNCH.toLowerCase()}.`;
      const ok = !!filed.whereBy && heldWhereBy(d, run).some((o) => o.value === filed.whereBy);
      out.push(`  You filed:    ${mine}${ok ? '  ✓' : '  ✗'}`);
    }
  }
  out.push('');
  const hours = c.board.hours;
  const rows = [...suspectsOf(c), ...c.people.filter((p) => p.role === 'company').map((p) => p.id), ...(isMurder(c) ? [c.crime.victim] : [])];
  const w0 = Math.max(...rows.map((id) => nameOf(c, id).length)) + 3;
  const cw = Math.max(12, ...rows.flatMap((id) => hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').length + 2)));
  out.push('THE TRUE BOARD');
  out.push(`${''.padEnd(w0)}${hours.map((h) => `${hourWord(h)}`.padEnd(cw)).join('')}`);
  for (const id of rows) {
    const mark = id === c.crime.culprit ? ' *' : id === c.crime.victim ? ' †' : '';
    out.push(`${(nameOf(c, id) + mark).padEnd(w0)}${hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').padEnd(cw)).join('')}`);
  }
  out.push('(* who did it' + (isMurder(c) ? ', † the dead man)' : ')'));
  out.push('');
  out.push('THE LIES');
  for (const l of c.lies) {
    const k = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    const why = l.kind === 'culprit' || l.kind === 'pair' && l.person === c.crime.culprit ? 'to hide the crime' : l.kind === 'pair' ? 'to cover for a friend' : `to hide ${personOf(c, l.person)?.secret ?? 'something'}`;
    const would = k?.response === 'admit' ? 'owned up' : k?.response === 'second-lie' ? 'a second story' : k?.response === 'crack' ? 'cracked' : 'refused';
    // Medium 14: "Put to it: refused" read as a put the player never made. Say whether it was.
    const put = !run || run.asked.includes(`confront:${l.person}@${l.hour}`) ? `Put to it: ${would}.` : `Never put to ${pronOf(c, l.person).him}; put, it would have been: ${would}.`;
    out.push(`- ${nameOf(c, l.person)} said ${placeName(c, l.claim)} at ${hourWord(l.hour)}; ${pronOf(c, l.person).he} was at ${placeName(c, l.truth)}, ${why}. ${put}`);
  }
  out.push('');
  out.push(`THE PATH (par ${d.analysis.par} questions${d.analysis.motive ? ' and the motive search' : ''}, ${d.analysis.walks} walks)`);
  // "who was at Kowalski’s tonight?", not "tonight?." (Raw 11's #27).
  d.analysis.path.forEach((s, i) => out.push(`${i + 1}. ${s.label}${/[?.!]$/.test(s.label) ? '' : '.'} ${s.why.replace(/\s*\(step \d+\)/g, '').replace(/\s*\(the office\):/g, ' (the office said so):')}`));
  if (d.analysis.motive) out.push(`+. ${questionById(c, d.analysis.motive)?.label ?? ''}.`);
  return out.join('\n');
}

export type { Hour, PersonId };
export { accountOf };
