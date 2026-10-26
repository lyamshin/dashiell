/**
 * docs/43 §3 and docs/46 §1: stars point, they don't answer.
 *
 * A star marks a question the player has been pointed to by something they
 * hold (4a.2's pointers), on the cheapest way from what they hold to the
 * report: a choice that would give them a fact they don't hold. Its reason
 * names the pointer ("Coffin has Ashby here at eleven"), never what the
 * answer will show, who it clears or who is left. The client is never
 * starred.
 *
 * docs/67: no star appears by itself. A star is a hint the player asked for
 * (`hints.ts`): one step, the nearest open step of a cheapest way on
 * (`hintStep`), starred with its reason, and it stays starred until it's taken
 * or is no longer on a cheapest way (`starredSteps`). Confronts are included:
 * a hint is asked for, so it may give the confront the grid already shows.
 *
 * Before docs/67 the stars thinned by tier (docs/46 §1): every open step at
 * Raw, one cheapest way at Coddled, one star at Poached and Soft-boiled, walks
 * only at Medium, the scene on page one at Hard-boiled. That rule is kept as
 * `routeSteps`, never shown: the way in still says its pointers in that
 * order, so the pages read as they did.
 */

import { minimalSets } from '../../gen/board/path.js';
import { GIVENS, pointerIndex } from '../../gen/board/pointers.js';
import { questionsOf } from '../../gen/board/solver.js';
import type { Question } from '../../gen/board/types.js';
import { accountOf, knownPeople, knownPlaces, linesHeld, meansShown, peopleAt, solveHeld, solveRun } from './knowledge.js';
import { andList, isMurder, nameOf, personOf, placeName, pronOf, solverHeld, suspectsOf, type BoardCase, type BoardDeal, type BoardRun, type Hour, type PersonId } from './model.js';
import { accessPhrase, wayKnown } from './bones/phrase.js';
import { remarkStreet } from '../../gen/board/streets.js';

export interface Star {
  /** The question it serves. */
  q: string;
  /** Why, in the detective's voice: "Tramonti says Lindemann was with her at ten — ask Lindemann". */
  why: string;
}

/** The longest completion searched for. A night past this has wandered far; stars rest then. */
const MAX_REST = 9;

const REST = new Map<string, string[][]>();

/**
 * The cheapest sets of further questions, each pointed to by what's held or by
 * another in the set, that take what's held to a finished report. Empty when
 * it's finished already, or nothing within reach finishes it.
 */
export function completions(d: BoardDeal, run: Pick<BoardRun, 'asked'>): string[][] {
  const c = d.kase;
  const held = solverHeld(run);
  const key = `${c.id}|${held.join(',')}`;
  const hit = REST.get(key);
  if (hit) return hit;
  const heldSet = new Set(held);
  const idx = pointerIndex(c);
  const motive = d.analysis.motive;
  // Asked but not landed confrontations aren't held; a murder's motive search is in the pool (the report asks why).
  const pool = questionsOf(c)
    .map((q) => q.id)
    .filter((q) => !heldSet.has(q));
  const rank = new Map(d.analysis.suggested.map((s, i) => [s.q, i]));
  const pathRank = new Map(d.analysis.path.map((s, i) => [s.q, i]));
  pool.sort((a, b) => (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50) || (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  const reachable = (extra: string[]): string[] => {
    const got = new Set<string>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const q of extra) {
        if (got.has(q)) continue;
        const by = idx.by.get(q);
        if (!by) continue;
        if (by.has(GIVENS) || [...by.keys()].some((s) => heldSet.has(s) || got.has(s))) {
          got.add(q);
          grew = true;
        }
      }
    }
    return extra.filter((q) => got.has(q));
  };
  const needMotive = needsMotive(d, run, heldSet);
  const goal = (x: string[]): boolean => {
    const extra = reachable(x.filter((q) => !heldSet.has(q)));
    if (needMotive && !extra.includes(motive as string)) return false;
    return solveHeld(c, [...held, ...extra]).done;
  };
  let out: string[][] = [];
  if (!goal(held)) out = minimalSets(pool, held, goal, MAX_REST, true).map((s) => s.filter((q) => !heldSet.has(q)));
  if (REST.size > 300) REST.delete(REST.keys().next().value as string);
  REST.set(key, out);
  return out;
}

/** A murder's report asks why: the papers, or the culprit's own reason, until one is held. */
function needsMotive(d: BoardDeal, run: Pick<BoardRun, 'asked'>, heldSet: ReadonlySet<string>): boolean {
  const c = d.kase;
  const motive = d.analysis.motive;
  return isMurder(c) && motive !== undefined && !heldSet.has(motive) && !run.asked.some((q) => q === `motive:${c.crime.culprit}`);
}

/**
 * docs/67: whether what's held already fills the report: the solver done on it, and a murder's why
 * held. (`completions` is empty then; it's empty too when nothing within reach finishes it.)
 */
export function reportReady(d: BoardDeal, run: Pick<BoardRun, 'asked'>): boolean {
  const held = solverHeld(run);
  return !needsMotive(d, run, new Set(held)) && solveHeld(d.kase, held).done;
}

/** A question is open when what's held (or the office) points at it, and a confrontation when its claim is broken. */
export function isOpen(c: BoardCase, run: Pick<BoardRun, 'asked'>, q: string): boolean {
  if (run.asked.includes(q)) return false;
  if (q.startsWith('confront:')) {
    const k = q.slice('confront:'.length);
    return run.asked.includes(`account:${k.split('@')[0]}`) && solveRun(c, run).status.get(k)?.s === 'broken';
  }
  const by = pointerIndex(c).by.get(q);
  if (!by) return false;
  return by.has(GIVENS) || run.asked.some((a) => by.has(a));
}

/** Whether a tier stars where to go only (Medium): the walk, never the question. */
export function walksOnly(c: BoardCase): boolean {
  return c.tier === 4;
}

/**
 * docs/67: the stars on the page: the steps the player's hints gave, in the order they were given,
 * each while it stands: not taken yet, and still on a cheapest way on. When nothing within reach
 * finishes the report (`completions` empty, the report not ready), a hinted step stands while it's
 * open, since it came from the designed path. None once the report is ready.
 */
export function starredSteps(d: BoardDeal, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'at' | 'log' | 'hints'>>): string[] {
  const hinted = [...new Set((run.hints ?? []).map((h) => h.q).filter((q): q is string => !!q))];
  if (hinted.length === 0) return [];
  const c = d.kase;
  const open = hinted.filter((q) => isOpen(c, run, q));
  if (open.length === 0) return [];
  const rest = completions(d, run);
  if (rest.length > 0) {
    // (docs/65 §4: a suspect's evening the hint gave for one the cheapest way runs through, the
    // evidence treating the two the same, is on the way as much as theirs is.)
    const ways = new Set(rest.flat());
    const tied = (q: string) => q.startsWith('account:') && [...ways].some((x) => x.startsWith('account:') && sameStanding(c, run, x.slice(8)).includes(q.slice(8)));
    return open.filter((q) => ways.has(q) || tied(q));
  }
  return reportReady(d, run) ? [] : open;
}

/**
 * docs/67: the command a star on `q` sits on from where the detective stands: the topic, the
 * search or the confront under somebody in the room, or else the walk to where it waits. Null when
 * the place isn't one the player knows of yet.
 */
export function starCommand(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'visited' | 'at'>, q: string): string | null {
  const c = d.kase;
  const [kind, rest] = q.split(':') as [string, string];
  const here = peopleAt(c, run, run.at);
  if ((kind === 'account' || kind === 'list') && here.includes(rest)) return `ask ${rest} ${kind === 'list' ? 'list' : 'evening'}`;
  if (kind === 'search' && c.finds.find((x) => x.id === rest)?.place === run.at) return `search ${rest}`;
  if (kind === 'confront') {
    const [p] = rest.split('@') as [string];
    if (here.includes(p)) return `picker ${p}`;
  }
  const at = starPlace(c, q);
  if (!at || at === run.at || !knownPlaces(c, run).has(at)) return null;
  return `go ${at}`;
}

/**
 * docs/67: the step a hint gives: the nearest open step of a cheapest way on, by docs/46's
 * Poached rule (one in this room first, then the commonest across the cheapest ways, then path
 * order), confronts included. Never one already starred (`starred`), nor one whose star would sit on
 * a choice a star already sits on (the same walk), so pressing again gives a new choice. Among
 * suspects the held evidence treats the same (docs/65 §4, `sameStanding`) it's the first by name.
 * Where nothing within reach finishes the report, the designed path's next open step (and a
 * murder's papers). Null when the report is ready, or nothing new can be starred.
 *
 * `commands`: false on the report page, where no choice shows and the hint says the step in words.
 */
export function hintStep(d: BoardDeal, run: Pick<BoardRun, 'asked' | 'visited' | 'at'>, starred: readonly string[] = [], commands = true): string | null {
  const c = d.kase;
  if (reportReady(d, run)) return null;
  const pathRank = new Map(d.analysis.path.map((s, i) => [s.q, i]));
  const byPath = (a: string, b: string) => (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50);
  const taken = new Set(commands ? starred.map((q) => starCommand(d, run, q)).filter((x): x is string => !!x) : []);
  const fits = (q: string) => !starred.includes(q) && isOpen(c, run, q) && (!commands || (() => {
    const cmd = starCommand(d, run, q);
    return !!cmd && !taken.has(cmd);
  })());
  const first = (open: readonly string[]): string | null => {
    for (const q of open) {
      if (!q.startsWith('account:')) {
        if (fits(q)) return q;
        continue;
      }
      // docs/65 §4: the first by name of those the held evidence treats the same, that can still be starred.
      const tie = sameStanding(c, run, q.slice(8)).map((p) => `account:${p}`).find(fits);
      if (tie) return tie;
    }
    return null;
  };
  const rest = completions(d, run);
  if (rest.length > 0) {
    const count = new Map<string, number>();
    for (const s of rest) for (const q of s) count.set(q, (count.get(q) ?? 0) + 1);
    const here = (q: string) => (starPlace(c, q) === run.at ? 0 : 1);
    const got = first([...count.keys()].filter((q) => isOpen(c, run, q)).sort((a, b) => here(a) - here(b) || (count.get(b) as number) - (count.get(a) as number) || byPath(a, b)));
    // (Everything on the cheapest ways starred already: nothing new to give.)
    if (got || starred.length > 0) return got;
  }
  // Out of reach of a cheapest way (past MAX_REST), or none of its steps can be starred from here:
  // the designed path, in order, and the papers.
  return first([...d.analysis.path.map((s) => s.q), ...(d.analysis.motive ? [d.analysis.motive] : [])].filter((q) => !run.asked.includes(q)));
}

/**
 * docs/46 §1's stars, by tier, as they were before docs/67. Never shown now: the way in says its
 * pointers in this order (`placeThread`), so a page reads the same whether or not a hint was taken,
 * and the wanderer sees the choices in the order it always did. `at` is where the detective stands,
 * for "the nearest"; `log` says whether this is still page one, for Hard-boiled's one star.
 */
export function routeSteps(d: BoardDeal, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'at' | 'log'>>): string[] {
  const c = d.kase;
  if (c.tier === 5) {
    // Hard-boiled: the scene, on page one. None after.
    if ((run.log?.length ?? 0) > 1 || run.asked.length > 0) return [];
    const scene = d.analysis.path.find((s) => s.q.startsWith('search:'))?.q;
    return scene && isOpen(c, run, scene) ? [scene] : [];
  }
  const rest = completions(d, run);
  if (rest.length === 0) return [];
  const pathRank = new Map(d.analysis.path.map((s, i) => [s.q, i]));
  const byPath = (a: string, b: string) => (pathRank.get(a) ?? 50) - (pathRank.get(b) ?? 50);
  if (c.tier === 0) {
    // Raw: every open step of every cheapest way on, the commonest first.
    const count = new Map<string, number>();
    for (const s of rest) for (const q of s) count.set(q, (count.get(q) ?? 0) + 1);
    return withTies(c, run, [...count.keys()].filter((q) => isOpen(c, run, q)).sort((a, b) => (count.get(b) as number) - (count.get(a) as number) || byPath(a, b)));
  }
  if (c.tier === 1) {
    // Coddled: the open steps of one cheapest way on.
    return withTies(c, run, [...(rest[0] as string[])].sort(byPath).filter((q) => isOpen(c, run, q)));
  }
  // Poached up: one star, the nearest open step of any cheapest way, and never a put.
  const count = new Map<string, number>();
  for (const s of rest) for (const q of s) count.set(q, (count.get(q) ?? 0) + 1);
  const open = [...count.keys()].filter((q) => !q.startsWith('confront:') && isOpen(c, run, q));
  const here = (q: string) => (run.at !== undefined && starPlace(c, q) === run.at ? 0 : 1);
  open.sort((a, b) => here(a) - here(b) || (count.get(b) as number) - (count.get(a) as number) || byPath(a, b));
  let best = open[0];
  if (best === undefined) return [];
  // docs/65 §4: one star, so among suspects the held evidence treats the same it goes to the first by
  // name, whoever the cheapest way runs through.
  if (best.startsWith('account:')) best = `account:${sameStanding(c, run, best.slice(8))[0]}`;
  // docs/55 4: Medium stars where to go, and, in the room with the person the step is about, the
  // question itself (Medium 14 sat across from Pickering with no star on her).
  return [best];
}

/**
 * docs/65 §4 (round 6, Raw 11): a star never picks out one of several suspects the held evidence
 * treats the same. The cheapest way on runs through the culprit's evening, because their story is
 * the one that has to break, so a star on one of two suspects with the same standing named the
 * culprit more often than chance. What's held says the same of two suspects when it gives them the
 * same means (had it, didn't, or not known), puts them in the same place (or nowhere) at each hour
 * it could have been, clears both or neither, and has neither out on the street at an hour that
 * mattered (`movedAt`, the passer-by's own reason). The group is the starred suspect and every other
 * suspect like them whose evening isn't held and whom something held points at, by name.
 */
export function sameStanding(c: BoardCase, run: Pick<BoardRun, 'asked'>, p: PersonId): PersonId[] {
  const suspects = suspectsOf(c);
  if (!suspects.includes(p) || p === c.client) return [p];
  const s = solveRun(c, run);
  const lines = linesHeld(c, { asked: run.asked, puts: [] });
  // What's held at each hour it could have been: where it places them, and what else is said of them then.
  const at = (x: PersonId, h: Hour) => `${s.placed.get(`${x}@${h}`)?.place ?? '-'}:${lines.filter((l) => l.hour === h && l.speaker !== x && l.about.includes(x)).map((l) => l.kind).sort().join('+')}`;
  const standing = (x: PersonId) => [meansShown(c, run, x), s.possibleHours.map((h) => at(x, h)).join(','), s.cleared.has(x) ? 'c' : '', movedAt(c, run, x) ? 'm' : ''].join('|');
  const mine = standing(p);
  const family = (x: PersonId) => (personOf(c, x)?.short ?? x).replace(/^(?:Mrs\.|Miss|Dr\.|Mr\.) /, '');
  return suspects
    .filter((q) => q === p || (q !== c.client && !run.asked.includes(`account:${q}`) && isOpen(c, run, `account:${q}`) && standing(q) === mine))
    .sort((a, b) => family(a).localeCompare(family(b)));
}

/**
 * Raw and Coddled star every step they offer, so a suspect's evening brings the evenings of those
 * with the same standing (docs/65 §4): all of them starred, the ones in the room first (the page's
 * hand-off says the first), then by name.
 */
function withTies(c: BoardCase, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'at'>>, steps: string[]): string[] {
  const here = (p: PersonId) => (run.at !== undefined && personOf(c, p)?.foundAt === run.at ? 0 : 1);
  const out: string[] = [];
  for (const q of steps) {
    const group = q.startsWith('account:') ? [...sameStanding(c, run, q.slice(8))].sort((a, b) => here(a) - here(b)).map((p) => `account:${p}`) : [q];
    for (const x of group) if (!out.includes(x)) out.push(x);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The reason, in a few plain words.
 * ------------------------------------------------------------------ */

/**
 * docs/47 B10: the reason that matters about somebody, from what's held. Somebody else's word has
 * them at one place the hour before an hour that mattered and at another place then: so they were
 * out on the street at that hour, and may have passed something. Neither place is the scene.
 */
export function movedAt(c: BoardCase, run: Pick<BoardRun, 'asked'>, p: PersonId): { from: string; to: string; h: number } | null {
  const at = new Map<number, string>();
  for (const l of linesHeld(c, { asked: run.asked, puts: [] })) {
    if (l.speaker === p || !l.about.includes(p) || l.place === undefined || l.hour === undefined) continue;
    if (l.kind !== 'list' && l.kind !== 'claim' && l.kind !== 'given') continue;
    if (!at.has(l.hour)) at.set(l.hour, l.place);
  }
  for (const h of c.givens.window ?? c.crime.window) {
    const a = at.get(h - 1);
    const b = at.get(h);
    if (a && b && a !== b && a !== c.crime.scene && b !== c.crime.scene) return { from: a, to: b, h };
  }
  return null;
}

/** "Pickering walked from the Delmonico rooms to the chop house at ten". */
export function movedSaid(c: BoardCase, p: PersonId, mv: { from: string; to: string; h: number }): string {
  return `${nameOf(c, p)} walked from ${placeName(c, mv.from)} to ${placeName(c, mv.to)} at ${hourWords(mv.h)}`;
}

/** "ask Brauer who was there", "ask Lindemann where she was", "search the table", "confront Hargrove" (docs/64). */
export function actionWords(c: BoardCase, q: Question): string {
  const p = c.people.find((x) => x.id === q.subject);
  const name = p?.short ?? q.subject;
  if (q.kind === 'search') return `search ${c.finds.find((f) => f.id === q.subject)?.what ?? 'the room'}`;
  if (q.kind === 'list') return `ask ${name} who was there`;
  if (q.kind === 'confront') return `confront ${name}`;
  return `ask ${name} where ${pronOf(c, q.subject).he} was`;
}

/**
 * Why a step is starred: what points at it, the latest thing held that does
 * (or the office), and what to do about it. Never what the answer will show.
 * As a walk (Medium), what to do is only where to go: "Coffin has Ashby at
 * the Thalia at eleven — go to the Thalia".
 */
export function starReason(c: BoardCase, run: Pick<BoardRun, 'asked'>, qid: string, walk = false): string {
  const q = questionsOf(c).find((x) => x.id === qid);
  if (!q) return '';
  // docs/55 4: a walk's star names the person and the question, as any star does: the choice it
  // sits on (the walk) says where. (`walk`: this star sits on a walk.)
  if (q.kind === 'confront') {
    const [p, hs] = q.subject === undefined ? ['', ''] : [q.subject, String(q.hour)];
    const st = solveRun(c, run).status.get(`${p}@${hs}`);
    const by = st?.deps.find((d) => d !== `account:${p}` && d !== qid);
    const src = by ? sourceName(c, by) : '';
    // docs/53, addendum: what they said and who said otherwise, never "her story against Coffin’s list".
    const cl = accountOf(c, p)?.claims[Number(hs) as Hour];
    const said = cl ? (personOf(c, p)?.home === cl.place ? 'home' : placeName(c, cl.place)) : '';
    return `${nameOf(c, p)} said ${said ? `${said} at ` : ''}${hourWords(Number(hs))}, and ${src || 'something I had'} said otherwise`;
  }
  if (q.kind === 'search') {
    const f = c.finds.find((x) => x.id === q.subject);
    if (f?.gives.why) return `who had what against ${pronOf(c, c.crime.victim).him}`;
    return isMurder(c) ? `start where ${pronOf(c, c.crime.victim).he} died` : 'start where it went missing';
  }
  const by = pointerIndex(c).by.get(qid);
  if (!by) return '';
  // docs/47 B10: the reason that matters first. Somebody out on the street at an hour that mattered
  // may have passed something; that, not who they were with an hour before, is why to ask.
  // Round 7, B4: only at Medium, where a passer-by's word is a thing an evening can hold, and said as
  // what's known, the walk, and where it went: "ask Grasso who she passed on the way over at nine" was
  // a star on a walk home, at Hard-boiled, where nobody passes anybody, and named no pointer at all.
  if (q.kind === 'account' && walksOnly(c)) {
    const mv = movedAt(c, run, q.subject);
    // docs/55 4: the person and the question: "Pickering walked over from the Delmonico rooms at ten —
    // ask Pickering who she passed on the way".
    // (Docs/69 §5, Medium 16: only where the walk passed somebody: "ask Brauer who she passed on the way"
    // of somebody who passed nobody sent the player for nothing. Else the reasons below.)
    const passed = !!mv && (accountOf(c, q.subject)?.remarks ?? []).some((r) => !!remarkStreet(r.text) && r.facts.some((f) => f.h === mv.h));
    if (mv && passed) {
      const N = nameOf(c, q.subject);
      const home = personOf(c, q.subject)?.home === mv.to;
      return `${N} walked ${home ? 'home' : 'over'} from ${placeName(c, mv.from)} at ${hourWords(mv.h)} — ask ${N} who ${pronOf(c, q.subject).he} passed on the way`;
    }
  }
  // A watcher not met yet is asked for by the job ("ask the bartender who was there").
  let act = actionWords(c, q);
  if (q.kind === 'list' && !knownPeople(c, { asked: run.asked, visited: (run as Partial<BoardRun>).visited ?? [] }).has(q.subject)) {
    const job = (c.people.find((x) => x.id === q.subject)?.description ?? '').split(/,| at /)[0];
    if (job) act = act.replace(nameOf(c, q.subject), job);
  }
  // docs/65 §5 (round 6, Medium 14): a suspect's evening is asked for what matters about them, not an
  // hour that doesn't. Where the grid has them able to get the means and nothing held puts them
  // anywhere at the hours it could have been, the reason says so, of everybody the held evidence
  // treats the same (§4): "Alfano was at the meeting, and nobody had said where she was at ten";
  // "Bellucci and Steinbach could have had the spare key, and nobody had said where either of them
  // was at ten". Else the latest pointer that has them at one of those hours; else the latest.
  const s = q.kind === 'account' && suspectsOf(c).includes(q.subject) ? solveRun(c, run) : undefined;
  const hours = s?.possibleHours ?? [];
  const saidOf = s ? linesHeld(c, { asked: run.asked, puts: [] }).filter((l) => l.hour !== undefined && hours.includes(l.hour) && l.speaker !== q.subject && l.about.includes(q.subject)) : [];
  if (s && meansShown(c, run, q.subject) === 'yes' && hours.length > 0 && saidOf.length === 0 && hours.every((h) => !s.placed.has(`${q.subject}@${h}`))) {
    const group = sameStanding(c, run, q.subject);
    const many = group.length > 1;
    const party = !isMurder(c) ? c.givens.lines?.find((g) => g.kind === 'party')?.vars.occasion : undefined;
    // Round 7, B5: "were at the supper" only of a group who were all at it. The lodger the door was
    // left unlocked for knew it without a seat at the table ("Ashby, Lindemann and Winslow were at the
    // supper" had her at it): a group with her in it is said by what they all knew.
    const atTable = !!party && group.every((p) => !c.givens.access.includes(p));
    // (Never "left unlocked" in a star's reason: a reason doesn't say who's left, docs/46 §1.)
    const had = atTable ? `${many ? 'were' : 'was'} at the ${party}` : party ? `knew ${wayKnown(c).replace(/^that the door was left unlocked$/, 'the door would be unlocked')}` : accessPhrase(c, true, true);
    const whose = many ? (group.length === 2 ? 'either of them' : 'any of them') : pronOf(c, q.subject).he;
    // A walk to where they all are goes to them all; otherwise the star is on one question.
    const all = many && walk && group.every((p) => personOf(c, p)?.foundAt === q.at);
    return `${andList(group.map((p) => nameOf(c, p)))} ${had}, and nobody had said where ${whose} was at ${hoursOr(hours)} — ${all ? 'ask them where they were' : act}`;
  }
  let why: string | undefined;
  if (q.kind === 'account') for (let i = run.asked.length - 1; i >= 0 && why === undefined; i--) if (by.has(run.asked[i] as string)) why = saidAt(c, run.asked[i] as string, q.subject, hours);
  for (let i = run.asked.length - 1; i >= 0 && why === undefined; i--) why = by.get(run.asked[i] as string);
  why ??= by.get(GIVENS);
  if (!why) return '';
  // (Round 6: the reason follows the choice it sits on, "Kowalski’s — the spare key is in the sugar
  // tin there", so it keeps the pointer's own capitals and adds none.)
  return `${shorten(why, nameOf(c, c.client))} — ${act}`;
}

/** The shared part of a group's reason (docs/65 §5): "Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten". */
const GROUP_WHY = /^.+?, and nobody had said where (?:any|either) of them was at (.+)$/;

/**
 * Round 7, P7: a hint's words, and a starred choice's. The star's reason (`starReason`) is the curtain's
 * and the fastest solve's; on the page it was long and the same seven times over three pages (Raw 23:
 * "Ashby, Lindemann and Winslow were at the supper, and nobody had said where any of them was at ten —
 * ask Ashby where she was", on every star). So:
 *
 * - **one short clause**: a pointer to a suspect's evening at an hour that doesn't matter ("Bidwell saw
 *   Callahan at Moe’s at seven", which read as if seven did, docs/68 §6) is what does matter, plainly:
 *   "nobody had said where Callahan was at nine";
 * - **a shared reason once**: where several hints share a reason, the first says it, and the rest say
 *   only the ask: "ask Lindemann where she was";
 * - **on the choice it asks** (`onAsk`, the question itself, not the walk to it) the choice is the ask:
 *   only the reason, and for a shared one already said, the person's own clause: "nobody had said where
 *   she was at ten".
 *
 * The star reasons still never name an outcome (docs/46 §1).
 */
export function hintWords(c: BoardCase, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'hints' | 'visited' | 'log'>>, qid: string, walk = false, onAsk = false): string {
  const full = starReason(c, run, qid, walk);
  const cut = full.indexOf(' — ');
  if (cut < 0) return full;
  let why = full.slice(0, cut);
  const act = full.slice(cut + 3);
  const q = questionsOf(c).find((x) => x.id === qid);
  const p = q?.subject as PersonId | undefined;
  // (Anybody's evening, a suspect's or a witness's: "Bledsoe says Crowninshield was with her at Mrs. Nagy’s
  // at nine" on Raw 7, where ten is the hour.)
  const s = q?.kind === 'account' && p && !personOf(c, p)?.object ? solveRun(c, run) : undefined;
  const hours = s?.possibleHours ?? [];
  // (A pointer's own hour, where it isn't one that matters and nothing places them at one that does.)
  const ownHour = /\bat (seven|eight|nine|ten|eleven|twelve)$/.exec(why)?.[1];
  const HW = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  if (s && p && ownHour && hours.length > 0 && !hours.includes(HW.indexOf(ownHour)) && hours.every((h) => !s.placed.has(`${p}@${h}`))) why = `nobody had said where ${nameOf(c, p)} was at ${hoursOr(hours)}`;
  // (Said already: an earlier hint tonight gave a step with this reason.)
  const group = GROUP_WHY.exec(why);
  const hs = run.hints ?? [];
  const mine = hs.findIndex((h) => h.q === qid);
  const before = (mine < 0 ? hs : hs.slice(0, mine)).filter((h) => h.q && h.q !== qid);
  // (And the first one's own star says it on the page it was given: on a later page, the ask.)
  const given = mine >= 0 ? hs[mine] : undefined;
  const said =
    !!group &&
    ((!!given && run.log !== undefined && run.log.length - 1 > given.page) ||
      before.some((h) => {
        const r = starReason(c, run, h.q as string, false);
        return r.slice(0, r.indexOf(' — ')) === why;
      }));
  if (onAsk) return said && group && p ? `nobody had said where ${pronOf(c, p).he} was at ${group[1]}` : why;
  return said ? act : `${why} — ${act}`;
}

/**
 * What a held answer says of somebody at the first of `hours` it says anything, as a pointer: a
 * watcher who saw them ("Ellery saw Marchetti at the chop house at ten"), an account that had them
 * for company ("Thorndike says Alfano was with him at the chop house at ten"), a passer-by
 * ("Pickering passed Thorndike on Second Avenue at ten"). Undefined when it says nothing of them then.
 */
function saidAt(c: BoardCase, src: string, p: PersonId, hours: readonly number[]): string | undefined {
  const [kind, rest] = src.split(':') as [string, string];
  for (const h of hours) {
    if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      if (l && (l.entries[h as Hour] ?? []).some((e) => 'person' in e && e.person === p)) return `${nameOf(c, rest)} saw ${nameOf(c, p)} at ${placeName(c, l.place)} at ${hourWords(h)}`;
    }
    if (kind === 'account') {
      const a = accountOf(c, rest);
      const cl = a?.claims[h as Hour];
      if (cl?.company.includes(p)) return `${nameOf(c, rest)} says ${nameOf(c, p)} was with ${pronOf(c, rest).him} at ${placeName(c, cl.place)} at ${hourWords(h)}`;
      for (const r of a?.remarks ?? []) {
        const street = remarkStreet(r.text);
        if (street && r.facts.some((f) => f.p === p && f.h === h)) return `${nameOf(c, rest)} passed ${nameOf(c, p)} on ${street} at ${hourWords(h)}`;
      }
    }
  }
  return undefined;
}

/** "ten", "nine or ten". */
function hoursOr(hs: readonly number[]): string {
  const ws = hs.map(hourWords);
  return ws.length <= 1 ? (ws[0] ?? '') : `${ws.slice(0, -1).join(', ')} or ${ws[ws.length - 1]}`;
}

function hourWords(h: number): string {
  return ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'][h % 12] ?? String(h);
}

/**
 * Whose answer a question id is, by the name of whoever gave it: "Shapiro", "Tramonti", the client
 * (docs/53, addendum: never "Shapiro’s list", "Tramonti’s story", "the office"); a search is "what the room said".
 */
export function sourceName(c: BoardCase, q: string): string {
  const [kind, rest] = q.split(':') as [string, string];
  if (kind === 'list' || kind === 'account') return nameOf(c, rest);
  if (kind === 'search') return 'what the room said';
  if (kind === 'confront') return nameOf(c, rest.split('@')[0] as string);
  return nameOf(c, c.client);
}

/**
 * The pointer's own words, said as a person would (docs/53, addendum): "Shapiro’s list has Tramonti at
 * the Odessa at ten" → "Shapiro saw Tramonti at the Odessa at ten"; "the office puts Feeney at …" →
 * "Mrs. Krantz says Feeney was at …".
 */
export function plainWhy(why: string, client: string): string {
  return why
    .replace(/^(.+?)’s list has (.+?) at /, '$1 saw $2 at ')
    .replace(/^(.+?)’s account has /, '$1 said ')
    .replace(/^[Tt]he office names /, `${client} mentioned `)
    .replace(/^[Tt]he office puts (.+?) at /, `${client} says $1 was at `)
    .replace(/^[Tt]he office says /, `${client} says `)
    .replace(/^[Tt]he office /, '');
}
const shorten = plainWhy;

/** A star's place in the page: where its question is asked. */
export function starPlace(c: BoardCase, qid: string): string {
  return questionsOf(c).find((x) => x.id === qid)?.at ?? '';
}

export function placeWords(c: BoardCase, id: string): string {
  return placeName(c, id);
}

export type { PersonId };
