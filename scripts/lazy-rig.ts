/**
 * docs/79 (harder puzzles, phase 1): the lazy-player rig.
 *
 *   npx tsx scripts/lazy-rig.ts [--seeds 25] [--tiers 0,1,2,3,4,5] [--worlds dealt,neighbourhood]
 *                               [--strategies all|a,b] [--no-depth] [--json out.json]
 *
 * It plays lazy strategies against many nights through the real game (`dealBoard`, `stepBoard`, the
 * grid and the notebook's own models, `scoreBoard`) and reports, per tier, how often each names the
 * right culprit inside the night's budget, how often that name stands on a true line, how often the
 * whole report is perfect, and how many actions it spent. Nothing here reads the truth to choose a
 * move: every strategy sees only what the book shows a player (the page's choices, the grid, the
 * picker, the hints it asks for). The truth is read only to score.
 *
 * The strategies:
 * - `random`: a suspect at random, on no actions (the floor);
 * - `pointer`: the one the client points at in the office, on no actions;
 * - `means`: the scene, then the list where the means came from, then anybody the grid's means
 *   column says "yes" to, at random (docs/41 rule 9's floor, "anybody with access");
 * - `meansOnly`: the scene, then every watcher's list it can reach, no evenings at all; names the
 *   one with the means whom no list places away at the hours that mattered (ties at random);
 * - `star`: the star follower. Every hint the tier allows (one whenever no star stands), each star,
 *   else the page's first choice; stops when a hint says the report is ready. Names the one a hint
 *   handed it (Raw's walk), else the one the grid points at (`gridPick`);
 * - `firstClash`: the obvious order, room by room: the scene's finds (not the papers), then in each
 *   room the watcher's list, every suspect's evening and anybody else's the page offers, then the next
 *   place the page lists that has something left to ask. It names the first suspect the grid marks ✗ at the hours that mattered
 *   (or at any hour, if the night runs out first; a guess if it never sees one);
 * - `notebook`: the same order, but it also confronts every ✗ with the line the grid sets against
 *   it, asks whoever an owning-up names, pencils every coat or hat onto the one person it's met who
 *   wears it, and reads the dead man's row to drop an hour he was seen alive. It stops as soon as the
 *   grid leaves one suspect standing (the means not "no", and not placed away at every hour left)
 *   and names them;
 * - `signature`: the pattern seen in the nights read by hand (docs/79 §2): sweep as `notebook` does
 *   until two stories break at the hours that mattered, and name the one whose break rests on the
 *   tier's own trick (a passer-by's remark, a coat matched to a name) or, failing that, the one who
 *   claimed an unwatched room; else the first ✗. Short of two, it reads the grid as `notebook` does;
 * - `oracle`: the designed path (`playBoardOracle`), the ceiling.
 *
 * And per night, the proof depth: the fewest answers (one answer is one question: a whole evening,
 * a whole list, one find, one confrontation) that, combined, break the culprit's story at the crime
 * hour (besides their own story), clear each rival at the crime hour, and narrow the hour where the
 * office gave two. Exact, by `minimalSets` over every question the night has, at the tier's
 * techniques, with no pointer gating (it's the logic, not the errand).
 */

import { writeFileSync } from 'node:fs';
import { Rng } from '../src/gen/board/rng.js';
import { innocentLie, minimalSets, oneLiar, rivalsOf } from '../src/gen/board/path.js';
import { questionsOf, solve, key } from '../src/gen/board/solver.js';
import { techniquesUpTo, typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices, pageStars, pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, type BoardGrid } from '../src/game/board/grid.js';
import { hasHints, hintsLeft, hintsUsed, takeHint } from '../src/game/board/hints.js';
import { collisionsOf, knownPeople, knownPlaces, linesHeld, listOf, peopleAt, solveRun, type Line } from '../src/game/board/knowledge.js';
import { OFFICE, budgetCalls, dealBoard, isMurder, parCalls, suspectsOf, tierName, type BoardDeal, type BoardReport, type BoardRun, type Hour, type PersonId, type PlaceId } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { NOBODY, asksOther, boardFields, breakOptions, clearOptions, heldWhereBy, scoreBoard, truthReport } from '../src/game/board/report.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('seeds') ?? 25);
const FROM = Number(val('from') ?? 1);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const worlds = (val('worlds') ?? 'dealt,neighbourhood').split(',');
const ALL = ['random', 'pointer', 'means', 'meansOnly', 'star', 'firstClash', 'notebook', 'signature', 'oracle'] as const;
type Strategy = (typeof ALL)[number];
const pickS = val('strategies');
const strategies: Strategy[] = !pickS || pickS === 'all' ? [...ALL] : (pickS.split(',') as Strategy[]);
const depthOn = !args.includes('--no-depth');
const jsonOut = val('json');
/** `--trace`: each strategy's questions and the name it gave, night by night, on stderr. */
const trace = args.includes('--trace');

/* ------------------------------------------------------------------ *
 * What the book shows: the grid, read as a lazy player reads it.
 * ------------------------------------------------------------------ */

/** The hours the grid marks as the ones that mattered: the crime hour once marked, else the office's hours. */
function markedHours(g: BoardGrid): Hour[] {
  return g.crimeHour !== null ? [g.crimeHour] : [...g.window];
}

/** The marked hours, less any the dead man's (or the pet's) own row shows him somewhere else, alive. */
function hoursLeft(d: BoardDeal, g: BoardGrid): Hour[] {
  const hs = markedHours(g);
  const v = g.rows.find((r) => r.victim);
  if (!v || hs.length < 2) return hs;
  const left = hs.filter((h) => {
    const seen = v.cells[h]?.seen;
    return !(seen && seen.place !== d.kase.crime.scene);
  });
  return left.length > 0 ? left : hs;
}

/** Whether the grid has them somewhere other than the scene at hour h: somebody saw them, or their own pencilled face. */
function placedAway(d: BoardDeal, run: BoardRun, g: BoardGrid, p: PersonId, h: Hour): boolean {
  const cell = g.rows.find((r) => r.id === p)?.cells[h];
  if (!cell) return false;
  const scene = d.kase.crime.scene;
  if (cell.seen && cell.seen.place !== scene) return true;
  const mark = run.marks[p]?.[String(h)];
  return !!mark?.at && mark.at !== scene;
}

function suspectRows(d: BoardDeal, g: BoardGrid) {
  const sus = new Set(suspectsOf(d.kase));
  return g.rows.filter((r) => sus.has(r.id));
}

/**
 * Who the grid leaves standing: the means not "no", and not placed away at every hour left. Every
 * suspect the report form lists counts, so one the grid has no row for yet is standing.
 */
function standing(d: BoardDeal, run: BoardRun, g: BoardGrid, hs: Hour[]): PersonId[] {
  return suspectsOf(d.kase).filter((p) => {
    const r = g.rows.find((x) => x.id === p);
    if (!r) return true;
    return r.means !== 'no' && !hs.every((h) => placedAway(d, run, g, p, h));
  });
}

/** Suspects with a ✗ at any of the hours, in row order. */
function clashedAt(d: BoardDeal, g: BoardGrid, hs: readonly Hour[]): PersonId[] {
  return suspectRows(d, g)
    .filter((r) => hs.some((h) => r.cells[h]?.collision))
    .map((r) => r.id);
}

/**
 * Who the grid points at, as a player who reads it and doesn't reason: the one left standing; or, of
 * several standing, the one with a ✗ at the hours left (several: a coin); or anybody standing; or
 * anybody with a ✗; or anybody.
 */
function gridPick(d: BoardDeal, run: BoardRun, rng: Rng): PersonId {
  const g = boardGrid(d.kase, run);
  const hs = hoursLeft(d, g);
  const st = standing(d, run, g, hs);
  if (st.length === 1) return st[0] as PersonId;
  const cl = clashedAt(d, g, hs).filter((p) => st.includes(p));
  if (cl.length > 0) return rng.pick(cl);
  if (st.length > 0) return rng.pick(st);
  const any = clashedAt(d, g, d.kase.board.hours);
  if (any.length > 0) return rng.pick(any);
  return rng.pick(suspectsOf(d.kase));
}

/* ------------------------------------------------------------------ *
 * Moves.
 * ------------------------------------------------------------------ */

interface Sweep {
  /** Confront every ✗ in the room with the grid's own line, and ask whoever an owning-up names. */
  confront: boolean;
  /** Watchers' lists only: no evenings. */
  listsOnly: boolean;
}

/** The grid's line against a claim of theirs, as the picker or the ready-made pair offers it, not yet put. */
function putCommand(d: BoardDeal, run: BoardRun, p: PersonId): string | null {
  const pk = pickerFor(d, run, p);
  if (!pk) return null;
  const made = new Set(run.puts.map((x) => `put ${x.person} ${x.hour} ${x.line}${x.again ? ' again' : ''}`));
  for (const r of pk.ready) if (!made.has(r.command)) return r.command;
  // From Poached up: the claim, then the line the grid's "where they clash" sets against it, or the first offered.
  for (const cl of pk.claims) {
    const col = cl.again ? undefined : collisionsOf(d.kase, run, p).find((x) => x.hour === cl.hour);
    const prefer = col?.breakers[0]?.id;
    const cmds = cl.lines.map((l) => l.command);
    const first = cmds.find((x) => prefer !== undefined && x.startsWith(`put ${p} ${cl.hour} ${prefer}`) && !made.has(x)) ?? cmds.find((x) => !made.has(x));
    if (first) return first;
  }
  return null;
}

/** People a room holds for the sweep, as the page lists them. */
function roomWork(d: BoardDeal, run: BoardRun, o: Sweep): string | null {
  const c = d.kase;
  const here = peopleAt(c, run, run.at);
  for (const p of here) {
    const who = c.people.find((x) => x.id === p);
    if (who?.role === 'watcher' && listOf(c, p) && !run.asked.includes(`list:${p}`)) return `ask ${p} list`;
  }
  if (o.listsOnly) return null;
  for (const p of here) {
    const who = c.people.find((x) => x.id === p);
    if (who?.role === 'suspect' && !run.asked.includes(`account:${p}`)) return `ask ${p} evening`;
  }
  // Everybody else the page offers in the room (the neighbour who kept the dog, a friend somebody named).
  for (const p of here) {
    const who = c.people.find((x) => x.id === p);
    if (who?.role === 'company' && !run.asked.includes(`account:${p}`)) return `ask ${p} evening`;
  }
  if (!o.confront) return null;
  for (const p of here) {
    if (c.people.find((x) => x.id === p)?.role !== 'suspect') continue;
    const cmd = putCommand(d, run, p);
    if (cmd) return cmd;
  }
  return null;
}

/** Whether a place has something left for the sweep: never been, or somebody known there with something to ask. */
function placeWork(d: BoardDeal, run: BoardRun, pl: PlaceId, o: Sweep): boolean {
  const c = d.kase;
  if (!run.visited.includes(pl)) return true;
  if (c.finds.some((f) => f.place === pl && !f.gives.why && !run.asked.includes(`search:${f.id}`))) return true;
  if (o.listsOnly) return false;
  const known = knownPeople(c, run);
  return c.people.some((x) => {
    if (x.foundAt !== pl || !known.has(x.id)) return false;
    if (x.role === 'suspect') return !run.asked.includes(`account:${x.id}`) || (o.confront && putCommand(d, run, x.id) !== null);
    if (x.role === 'company') return !run.asked.includes(`account:${x.id}`);
    return false;
  });
}

/** The obvious order: the scene's finds (not the papers), the room's people, then the next place the page lists with something left. */
function sweepNext(d: BoardDeal, run: BoardRun, o: Sweep): string | null {
  const c = d.kase;
  if (run.at === OFFICE) return `go ${c.crime.scene}`;
  for (const f of c.finds) if (f.place === run.at && !f.gives.why && !run.asked.includes(`search:${f.id}`)) return `search ${f.id}`;
  const here = roomWork(d, run, o);
  if (here) return here;
  // The next place, in the order the page lists them (stars first, as the page does).
  const order: PlaceId[] = [];
  for (const g of boardChoices(d, run)) if (g.kind === 'go') for (const ch of [...g.choices, ...(g.more ?? [])]) if (ch.command.startsWith('go ')) order.push(ch.command.slice(3));
  for (const pl of order) if (pl !== OFFICE && pl !== run.at && knownPlaces(c, run).has(pl) && placeWork(d, run, pl, o)) return `go ${pl}`;
  return null;
}

/** The pencil a lazy player draws for a coat or a hat: on the one person met who wears it, if just one. */
function markFaces(d: BoardDeal, run: BoardRun): BoardRun {
  const c = d.kase;
  const known = knownPeople(c, run);
  let marks = run.marks;
  for (const q of run.asked) {
    if (!q.startsWith('list:')) continue;
    const l = listOf(c, q.slice(5));
    if (!l) continue;
    for (const [hs, es] of Object.entries(l.entries)) {
      for (const e of es) {
        if (!('look' in e)) continue;
        const owners = c.people.filter((x) => x.look === e.look && known.has(x.id));
        if (owners.length !== 1) continue;
        const p = (owners[0] as { id: PersonId }).id;
        if (marks[p]?.[hs]?.at) continue;
        marks = { ...marks, [p]: { ...(marks[p] ?? {}), [hs]: { at: l.place } } };
      }
    }
  }
  return marks === run.marks ? run : { ...run, marks };
}

function step(d: BoardDeal, run: BoardRun, cmd: string): BoardRun | null {
  const r = stepBoard(d, run, cmd);
  return r.error ? null : r.run;
}

const live = (d: BoardDeal, run: BoardRun) => !run.reportOpen && !run.filed && run.used < budgetCalls(d);

/* ------------------------------------------------------------------ *
 * The report a lazy player files: the name, and the grid's own lines.
 * ------------------------------------------------------------------ */

/** A line that puts them somewhere at the hour, in the form's list for them: what a careless player cites as clearing them. */
function placingLine(d: BoardDeal, run: BoardRun, p: PersonId, h: Hour | undefined): string | null {
  const c = d.kase;
  const opts = clearOptions(d, run, p);
  const lines = new Map<string, Line>(linesHeld(c, run).map((l) => [l.id, l]));
  const hit = opts.find((o) => {
    const l = lines.get(o.value);
    return !!l && l.speaker !== p && l.about.includes(p) && (h === undefined || l.hour === h) && l.place !== c.crime.scene && (l.kind === 'list' || l.kind === 'claim');
  });
  return hit?.value ?? opts[0]?.value ?? null;
}

function fileAs(d: BoardDeal, run: BoardRun, who: PersonId, rng: Rng): BoardReport {
  const c = d.kase;
  const s = solveRun(c, run);
  const truth = truthReport(d);
  const fields = boardFields(d, run);
  const guess = (k: string) => {
    const opts = fields.find((f) => f.key === k)?.options ?? [];
    return opts.length > 0 ? rng.pick(opts).value : null;
  };
  const caught = collisionsOf(c, run).filter((x) => suspectsOf(c).includes(x.person));
  const mine = caught.find((x) => x.person === who);
  const g = boardGrid(c, run);
  const hs = hoursLeft(d, g);
  const when = mine?.hour ?? (hs.length === 1 ? hs[0] : g.crimeHour) ?? (hs[0] as Hour);
  const meansSearched = run.asked.some((q) => q === `search:${c.finds.find((f) => f.gives.means)?.id}`);
  const report: BoardReport = {
    who,
    when,
    why: who,
    // The line it put to them, if one landed; else the one the grid sets against them; else the form's first.
    breaks: run.puts.find((x) => x.person === who && x.landed && !x.again)?.line ?? mine?.breakers[0]?.id ?? breakOptions(d, run, who)[0]?.value ?? null,
    ...(isMurder(c) ? { how: s.how || meansSearched ? (truth.how ?? null) : guess('how') } : { where: s.whereNow ? (truth.where ?? null) : guess('where'), whereBy: heldWhereBy(d, run)[0]?.value ?? null }),
  };
  if (asksOther(d)) {
    const other = caught.find((x) => x.person !== who);
    report.other = other?.person ?? NOBODY;
    report.cleared = other ? placingLine(d, run, other.person, other.hour) : null;
  }
  return report;
}

interface Result {
  who: PersonId | null;
  run: BoardRun;
  report?: BoardReport;
  hints?: number;
}

/* ------------------------------------------------------------------ *
 * The strategies.
 * ------------------------------------------------------------------ */

function playRandom(d: BoardDeal, rng: Rng): Result {
  return { who: rng.pick(suspectsOf(d.kase)), run: newBoardRun(d) };
}

/** The one the client points at in the office, on no actions (a mystery's oldest tell, checked). */
function playPointer(d: BoardDeal, rng: Rng): Result {
  return { who: d.kase.givens.pointer ?? rng.pick(suspectsOf(d.kase)), run: newBoardRun(d) };
}

/** The scene's means find, then the list where it came from: the grid's means column, filled. */
function meansRun(d: BoardDeal): BoardRun {
  const c = d.kase;
  let run = newBoardRun(d);
  const f = c.finds.find((x) => x.gives.means) ?? c.finds.find((x) => !x.gives.why);
  const plan: string[] = [];
  if (f) plan.push(`go ${f.place}`, `search ${f.id}`);
  const keeper = c.lists.find((l) => l.place === c.means.origin);
  if (keeper) plan.push(`go ${keeper.place}`, `ask ${keeper.watcher} list`);
  for (const cmd of plan) {
    if (!live(d, run)) break;
    if (cmd.startsWith('go ') && run.at === cmd.slice(3)) continue;
    run = step(d, run, cmd) ?? run;
  }
  return run;
}

function playMeans(d: BoardDeal, rng: Rng): Result {
  const run = meansRun(d);
  const g = boardGrid(d.kase, run);
  const yes = suspectRows(d, g)
    .filter((r) => r.means === 'yes')
    .map((r) => r.id);
  const pool = yes.length > 0 ? yes : suspectsOf(d.kase);
  return { who: rng.pick(pool), run };
}

function playMeansOnly(d: BoardDeal, rng: Rng): Result {
  let run = meansRun(d);
  const o: Sweep = { confront: false, listsOnly: true };
  for (let guard = 0; guard < 60 && live(d, run); guard++) {
    const cmd = sweepNext(d, run, o);
    if (!cmd) break;
    const next = step(d, run, cmd);
    if (!next) break;
    run = next;
  }
  const g = boardGrid(d.kase, run);
  const hs = hoursLeft(d, g);
  const st = standing(d, run, g, hs).filter((p) => suspectRows(d, g).find((r) => r.id === p)?.means === 'yes');
  const pool = st.length > 0 ? st : standing(d, run, g, hs);
  return { who: pool.length > 0 ? rng.pick(pool) : rng.pick(suspectsOf(d.kase)), run };
}

function playFirstClash(d: BoardDeal, rng: Rng): Result {
  const c = d.kase;
  let run = newBoardRun(d);
  const o: Sweep = { confront: false, listsOnly: false };
  for (let guard = 0; guard < 80 && live(d, run); guard++) {
    const g = boardGrid(c, run);
    const cl = clashedAt(d, g, markedHours(g));
    if (cl.length > 0) return { who: rng.pick(cl), run };
    const cmd = sweepNext(d, run, o);
    if (!cmd) break;
    const next = step(d, run, cmd);
    if (!next) break;
    run = next;
  }
  const g = boardGrid(c, run);
  const cl = clashedAt(d, g, markedHours(g));
  if (cl.length > 0) return { who: rng.pick(cl), run };
  const any = clashedAt(d, g, c.board.hours);
  return { who: any.length > 0 ? (any[0] as PersonId) : rng.pick(suspectsOf(c)), run };
}

/** The notebook reader's sweep, shared with `signature`. `stop` says when it has seen enough. */
function notebookSweep(d: BoardDeal, stop: (run: BoardRun, g: BoardGrid) => boolean): BoardRun {
  const c = d.kase;
  let run = newBoardRun(d);
  const o: Sweep = { confront: true, listsOnly: false };
  for (let guard = 0; guard < 80 && live(d, run); guard++) {
    run = markFaces(d, run);
    const g = boardGrid(c, run);
    if (stop(run, g)) break;
    const cmd = sweepNext(d, run, o);
    if (!cmd) break;
    const next = step(d, run, cmd);
    if (!next) break;
    run = next;
  }
  return markFaces(d, run);
}

function playNotebook(d: BoardDeal, rng: Rng): Result {
  // It stops once the grid leaves one standing, and only after it has some evening in hand (an empty grid
  // with one means "yes" isn't the notebook concluding anything).
  const run = notebookSweep(d, (r, g) => r.asked.some((q) => q.startsWith('account:')) && standing(d, r, g, hoursLeft(d, g)).length === 1);
  return { who: gridPick(d, run, rng), run };
}

/** What a broken story rests on, as the grid's "where they clash" shows it: a remark, a face, a list, a story. */
function breakKind(d: BoardDeal, run: BoardRun, p: PersonId, h: Hour): 'remark' | 'face' | 'list' | 'claim' | 'other' {
  const c = d.kase;
  const col = collisionsOf(c, run, p).find((x) => x.hour === h);
  const b = col?.breakers ?? [];
  if (b.some((l) => l.kind === 'remark')) return 'remark';
  if (b.some((l) => l.kind === 'list' && l.hour !== undefined && (listOf(c, l.speaker as PersonId)?.entries[l.hour] ?? []).some((e) => 'look' in e))) return 'face';
  if (b.some((l) => l.kind === 'list')) return 'list';
  if (b.some((l) => l.kind === 'claim')) return 'claim';
  return 'other';
}

/** Whether their own story put them, at hour h, somewhere nobody keeps a list. */
function unwatchedClaim(d: BoardDeal, p: PersonId, h: Hour): boolean {
  const c = d.kase;
  const cl = c.accounts.find((a) => a.person === p)?.claims[h];
  if (!cl) return false;
  return !c.lists.some((l) => l.place === cl.place && (l.entries[h] ?? null) !== null);
}

function playSignature(d: BoardDeal, rng: Rng): Result {
  const c = d.kase;
  // Sweep until two stories break at the hours that matter (or the night runs out).
  const run = notebookSweep(d, (_r, g) => clashedAt(d, g, hoursLeft(d, g)).length >= 2);
  const g = boardGrid(c, run);
  const hs = hoursLeft(d, g);
  const cl = clashedAt(d, g, hs);
  if (cl.length < 2) return { who: cl.length === 1 && standing(d, run, g, hs).length !== 1 ? (cl[0] as PersonId) : gridPick(d, run, rng), run };
  const hourOf = (p: PersonId) => hs.find((h) => g.rows.find((r) => r.id === p)?.cells[h]?.collision) as Hour;
  const trick = cl.filter((p) => {
    const k = breakKind(d, run, p, hourOf(p));
    return k === 'remark' || k === 'face';
  });
  if (trick.length === 1) return { who: trick[0] as PersonId, run };
  // The player can see the claim (the grid's cell), and the page said whether anybody keeps that room.
  const unwatched = cl.filter((p) => unwatchedClaim(d, p, hourOf(p)));
  if (unwatched.length === 1) return { who: unwatched[0] as PersonId, run };
  return { who: cl[0] as PersonId, run };
}

/** The picker command a star or the first choice opens: the ready pair, or the first claim's first line, not yet made. */
function pickerCommand(d: BoardDeal, run: BoardRun, p: PersonId): string | null {
  const pk = pickerFor(d, run, p);
  if (!pk) return null;
  const made = new Set(run.puts.map((x) => `put ${x.person} ${x.hour} ${x.line}${x.again ? ' again' : ''}`));
  for (const r of pk.ready) if (!made.has(r.command)) return r.command;
  for (const cl of pk.claims) for (const l of cl.lines) if (!made.has(l.command)) return l.command;
  return null;
}

function firstChoice(d: BoardDeal, run: BoardRun): string | null {
  for (const g of boardChoices(d, run)) {
    if (g.kind === 'free') continue;
    for (const ch of [...g.choices, ...(g.more ?? [])]) {
      if (ch.done) continue;
      if (ch.command.startsWith('picker ')) {
        const cmd = pickerCommand(d, run, ch.command.slice(7));
        if (cmd) return cmd;
        continue;
      }
      if (ch.command === `go ${OFFICE}`) continue;
      return ch.command;
    }
  }
  return null;
}

function playStar(d: BoardDeal, rng: Rng): Result {
  const c = d.kase;
  let run = newBoardRun(d);
  let asking = hasHints(c.tier);
  let ready = false;
  let told: PersonId | null = null;
  const said = (text: string) => {
    if (/That left one person who/.test(text)) told = solveRun(c, run).who ?? told;
    const m = /That left (\S+?)(?:,| and)/.exec(text);
    const hit = m ? c.people.find((p) => p.role === 'suspect' && p.short === m[1]) : undefined;
    if (hit) told = hit.id;
  };
  for (let guard = 0; guard < 80 && live(d, run) && !ready; guard++) {
    if (asking && hintsLeft(run) > 0 && pageStars(d, run).length === 0) {
      const h = takeHint(d, run);
      if ('error' in h) asking = false;
      else {
        if (h.said.spent) run = h.run;
        said(h.said.text);
        if (h.said.kind === 'ready') {
          ready = true;
          break;
        }
      }
    }
    const star = pageStars(d, run)[0];
    const cmd = star ? (star.command.startsWith('picker ') ? pickerCommand(d, run, star.command.slice(7)) : star.command) : firstChoice(d, run);
    if (!cmd) break;
    const next = step(d, run, cmd);
    if (!next) break;
    run = next;
  }
  if (!ready && asking && hintsLeft(run) > 0 && !run.filed) {
    const h = takeHint(d, run);
    if (!('error' in h)) {
      if (h.said.spent) run = h.run;
      said(h.said.text);
    }
  }
  return { who: told ?? gridPick(d, run, rng), run, hints: hintsUsed(run) };
}

function playOracle(d: BoardDeal): Result {
  const o = playBoardOracle(d);
  return { who: o.report.who, run: o.run, report: o.report };
}

/* ------------------------------------------------------------------ *
 * Proof depth.
 * ------------------------------------------------------------------ */

interface Depth {
  /** Fewest other answers that break the culprit's story at the crime hour (their own story besides). */
  brk: number | null;
  /** What those answers are, by kind: list, account, search, confront. */
  brkKinds: string[];
  /** Per rival: fewest answers that place them away at the crime hour. */
  clear: Record<PersonId, number | null>;
  /** Fewest answers that narrow a two-hour window to the crime hour (0 where the office gave one). */
  hour: number | null;
}

function proofDepth(d: BoardDeal): Depth {
  const c = d.kase;
  const T = techniquesUpTo(c.tier);
  const motive = c.finds.find((f) => f.gives.why);
  const all = questionsOf(c)
    .map((q) => q.id)
    .filter((q) => q !== `search:${motive?.id}`);
  const own = `account:${c.crime.culprit}`;
  const ck = key(c.crime.culprit, c.crime.hour);
  const brokeGoal = (held: string[]) => solve(c, held, { techniques: T }).status.get(ck)?.s === 'broken';
  const brkPool = all.filter((q) => q !== own && !q.startsWith(`confront:${c.crime.culprit}@`));
  const bs = minimalSets(brkPool, [own], brokeGoal, 5, true);
  const brk = bs.length > 0 ? (bs[0] as string[]).length : null;
  const brkKinds = bs.length > 0 ? (bs[0] as string[]).map((q) => q.split(':')[0] as string) : [];
  const clear: Record<PersonId, number | null> = {};
  for (const r of rivalsOf(c)) {
    const g = (held: string[]) => solve(c, held, { techniques: T, forceHours: [c.crime.hour] }).cleared.has(r);
    const sets = minimalSets(all, [], g, 5, true);
    clear[r] = sets.length > 0 ? (sets[0] as string[]).length : null;
  }
  const win = c.givens.window ?? c.crime.window;
  let hour: number | null = 0;
  if (win.length > 1) {
    const hg = (held: string[]) => {
      const s = solve(c, held, { techniques: T });
      return s.possibleHours.length === 1 && s.possibleHours[0] === c.crime.hour;
    };
    const hsets = minimalSets(all, [], hg, 4, true);
    hour = hsets.length > 0 ? (hsets[0] as string[]).length : null;
  }
  return { brk, brkKinds, clear, hour };
}

/* ------------------------------------------------------------------ *
 * The run.
 * ------------------------------------------------------------------ */

interface NightRow {
  world: string;
  tier: TierIndex;
  type: CaseType;
  seed: number;
  par: number;
  budget: number;
  oneLiar: boolean;
  culprit: PersonId;
  /** The innocent liar, if the night has one, and how they answer when it's put to them. */
  innocent?: { person: PersonId; response: string };
  suspects: number;
  /** Per strategy: the name, right or not, on a true line, perfect, actions, and whether it heard the culprit's own evening. */
  results: Record<string, { who: PersonId | null; right: boolean; proof: boolean; perfect: boolean; actions: number; heard: boolean; hints?: number }>;
  depth?: Depth;
}

const nights: NightRow[] = [];
const t0 = Date.now();
for (const world of worlds) {
  for (const tier of tiers) {
    for (const type of typesFor(tier) as CaseType[]) {
      for (let s = FROM; s < FROM + N; s++) {
        const d = dealBoard(s, tier, type, world === 'dealt' ? {} : { world });
        const c = d.kase;
        const il = innocentLie(c);
        const ik = il ? c.confrontations.find((k) => k.person === il.person && k.hour === il.hour) : undefined;
        const row: NightRow = { world, tier, type, seed: s, par: parCalls(d), budget: budgetCalls(d), oneLiar: oneLiar(c), culprit: c.crime.culprit, ...(il ? { innocent: { person: il.person, response: ik?.response ?? '' } } : {}), suspects: suspectsOf(c).length, results: {} };
        for (const st of strategies) {
          const rng = new Rng((s * 2654435761 + tier * 97 + st.length * 7919 + (world === 'dealt' ? 0 : 13)) >>> 0);
          const r: Result =
            st === 'random'
              ? playRandom(d, rng)
              : st === 'pointer'
                ? playPointer(d, rng)
                : st === 'means'
                ? playMeans(d, rng)
                : st === 'meansOnly'
                  ? playMeansOnly(d, rng)
                  : st === 'star'
                    ? playStar(d, rng)
                    : st === 'firstClash'
                      ? playFirstClash(d, rng)
                      : st === 'notebook'
                        ? playNotebook(d, rng)
                        : st === 'signature'
                          ? playSignature(d, rng)
                          : playOracle(d);
          const right = r.who === c.crime.culprit;
          let proof = false;
          let perfect = false;
          if (r.who) {
            const report = r.report ?? fileAs(d, r.run, r.who, rng);
            const filed = r.run.reportOpen || r.run.filed ? r.run : (stepBoard(d, r.run, 'file').run ?? r.run);
            const v = scoreBoard(d, filed, report);
            proof = !!v.fields[0]?.correct && !v.fields[0]?.half;
            perfect = v.outcome === 'solved';
          }
          row.results[st] = { who: r.who, right, proof, perfect, actions: r.run.used, heard: r.run.asked.includes(`account:${c.crime.culprit}`), ...(r.hints !== undefined ? { hints: r.hints } : {}) };
          if (trace) process.stderr.write(`${world} ${tierName(tier)} ${type} ${s} ${st}: ${r.run.asked.join(' ')} -> ${r.who}${right ? ' (right)' : ` (culprit ${c.crime.culprit})`}${proof ? ', on a true line' : ''}\n`);
        }
        if (depthOn) row.depth = proofDepth(d);
        nights.push(row);
      }
      process.stderr.write(`${world} ${tierName(tier)} ${type}: ${N} nights (${Math.round((Date.now() - t0) / 1000)} s)\n`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * The tables.
 * ------------------------------------------------------------------ */

const pct = (k: number, n: number) => (n === 0 ? '—' : `${Math.round((100 * k) / n)}%`);
const mean = (xs: number[]) => (xs.length === 0 ? '—' : (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1));
const out: string[] = [];
const label: Record<Strategy, string> = {
  random: 'random suspect',
  pointer: 'the client’s pointer',
  means: 'anybody with the means',
  meansOnly: 'means and lists only',
  star: 'star follower',
  firstClash: 'first clash',
  notebook: 'notebook reader',
  signature: 'the tier’s trick',
  oracle: 'oracle',
};
out.push(`Nights: ${nights.length} (${worlds.join(' + ')}, seeds ${FROM}–${FROM + N - 1} a tier and type).`);
out.push('');
out.push('Right culprit inside the budget (and actions spent, mean), by tier:');
out.push('');
out.push(`| strategy | ${tiers.map((t) => tierName(t)).join(' | ')} |`);
out.push(`|---|${tiers.map(() => '---').join('|')}|`);
for (const st of strategies) {
  const cells = tiers.map((t) => {
    const rs = nights.filter((n) => n.tier === t).map((n) => n.results[st]).filter((x): x is NonNullable<typeof x> => !!x);
    return `${pct(rs.filter((r) => r.right).length, rs.length)} (${mean(rs.map((r) => r.actions))})`;
  });
  out.push(`| ${label[st]} | ${cells.join(' | ')} |`);
}
out.push(`| *budget, mean (par)* | ${tiers.map((t) => { const ns = nights.filter((n) => n.tier === t); return `${mean(ns.map((n) => n.budget))} (${mean(ns.map((n) => n.par))})`; }).join(' | ')} |`);
out.push(`| *suspects; one-liar nights* | ${tiers.map((t) => { const ns = nights.filter((n) => n.tier === t); return `${mean(ns.map((n) => n.suspects))}; ${pct(ns.filter((n) => n.oneLiar).length, ns.length)}`; }).join(' | ')} |`);
out.push('');
out.push('The same name on a true line (the report’s “what proves they lied”), and the perfect report (every point), by tier:');
out.push('');
out.push(`| strategy | ${tiers.map((t) => tierName(t)).join(' | ')} |`);
out.push(`|---|${tiers.map(() => '---').join('|')}|`);
for (const st of strategies) {
  const cells = tiers.map((t) => {
    const rs = nights.filter((n) => n.tier === t).map((n) => n.results[st]).filter((x): x is NonNullable<typeof x> => !!x);
    return `${pct(rs.filter((r) => r.proof).length, rs.length)} / ${pct(rs.filter((r) => r.perfect).length, rs.length)}`;
  });
  out.push(`| ${label[st]} | ${cells.join(' | ')} |`);
}
if (depthOn) {
  out.push('');
  out.push('Proof depth (fewest answers combined; one answer is one whole evening, list, find or confrontation):');
  out.push('');
  out.push('| tier | nights | culprit’s story breaks on 1 answer | 2 | 3+ | what the one answer is (list : account : search : other) | rivals | a rival clears on 1 answer | 2 | 3 | 4+ | rivals, mean | hour narrowed on 1 answer (of two-hour nights) |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const t of tiers) {
    const ns = nights.filter((n) => n.tier === t && n.depth);
    const b = ns.map((n) => n.depth?.brk ?? 99);
    const one = ns.filter((n) => n.depth?.brk === 1);
    const kinds = { list: 0, account: 0, search: 0, other: 0 };
    for (const n of one) {
      const k = n.depth?.brkKinds[0] ?? 'other';
      if (k === 'list' || k === 'account' || k === 'search') kinds[k]++;
      else kinds.other++;
    }
    const rv = ns.flatMap((n) => Object.values(n.depth?.clear ?? {}).map((x) => x ?? 99));
    const hourNights = ns.filter((n) => (n.depth?.hour ?? 0) !== 0);
    out.push(
      `| ${tierName(t)} | ${ns.length} | ${pct(b.filter((x) => x === 1).length, b.length)} | ${pct(b.filter((x) => x === 2).length, b.length)} | ${pct(b.filter((x) => x >= 3).length, b.length)} | ${kinds.list} : ${kinds.account} : ${kinds.search} : ${kinds.other} | ${rv.length} | ${pct(rv.filter((x) => x === 1).length, rv.length)} | ${pct(rv.filter((x) => x === 2).length, rv.length)} | ${pct(rv.filter((x) => x === 3).length, rv.length)} | ${pct(rv.filter((x) => x >= 4).length, rv.length)} | ${mean(rv.filter((x) => x < 99))} | ${hourNights.length ? pct(hourNights.filter((n) => n.depth?.hour === 1).length, hourNights.length) : '—'} |`,
    );
  }
}
process.stdout.write(`${out.join('\n')}\n`);
process.stderr.write(`done in ${Math.round((Date.now() - t0) / 1000)} s\n`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ args, nights }, null, 1));
