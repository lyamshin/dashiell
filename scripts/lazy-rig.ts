/**
 * docs/79 (harder puzzles, phase 1): the lazy-player rig. docs/82 (phase 2a): ported to the five-answer
 * report (docs/78), with the cross-referencer and the first liar, and the puzzle flags.
 *
 *   npx tsx scripts/lazy-rig.ts [--seeds 25] [--tiers 0,1,2,3,4,5] [--worlds dealt,neighbourhood]
 *                               [--strategies all|a,b] [--no-depth] [--json out.json] [--puzzles A,B]
 *
 * It plays lazy strategies against many nights through the real game (`dealBoard`, `stepBoard`, the
 * grid and the notebook's own models, `scoreBoard`) and reports, per tier, how often each names the
 * right culprit inside the night's budget, how often it also names who caught them out rightly (whose
 * word, held tonight, breaks the culprit's story: the report's second answer), how often the whole
 * report is perfect (five out of five), and how many actions it spent. Nothing here reads the truth to choose a
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
 * - `xref`, the cross-referencer (docs/79 §4.A, docs/82): the notebook reader's sweep, but it makes the
 *   one-lookup join itself and never reads the grid's ✗ or its placements: each claim it holds against
 *   every exhaustive list at that place and hour (and a company witness's evening, and a passer-by's
 *   remark), who is placed where by a list, who could have had the means by the origin's list, and the
 *   hours left by the dead man's sightings. It confronts what its own join breaks, and names whoever
 *   its join leaves standing; of several standing, one its join caught lying (a coin), else a coin;
 * - `elim`, elimination by placement (docs/82): the notebook reader's sweep, but it names whoever the
 *   grid's placements leave standing at the office's hours, reading neither the means column nor the
 *   dead man's row: what's left when nothing tells two broken stories apart. Of several standing, one
 *   with a ✗ (a coin), else a coin;
 * - `firstLiar`: docs/69's and docs/78 §4's shortcut (`playFirstLiar`): the designed path until the
 *   grid shows a lie, then it closes, naming that liar, whoever's word the grid set against them, and
 *   the hour of the lie;
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
import { generateBoard, parsePuzzles, techniquesUpTo, typesFor, type CaseType, type Remark, type TierIndex } from '../src/gen/board/index.js';
import { worldCtx } from '../src/gen/board/world/index.js';
import { boardChoices, pageStars, pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, type BoardGrid } from '../src/game/board/grid.js';
import { hasHints, hintsLeft, hintsUsed, takeHint } from '../src/game/board/hints.js';
import { accountOf, collisionsOf, knownPeople, knownPlaces, linesHeld, listExhaustive, listOf, peopleAt, solveRun, type Line } from '../src/game/board/knowledge.js';
import { OFFICE, budgetCalls, dealBoard, factsOnly, isMurder, parCalls, personOf, suspectsOf, tierName, type BoardDeal, type BoardReport, type BoardRun, type Hour, type PersonId, type PlaceId } from '../src/game/board/model.js';
import { playBoardOracle, playFirstLiar } from '../src/game/board/oracle.js';
import { boardFields, scoreBoard, sourceOfLine, truthReport } from '../src/game/board/report.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('seeds') ?? 25);
const FROM = Number(val('from') ?? 1);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const worlds = (val('worlds') ?? 'dealt,neighbourhood').split(',');
const ALL = ['random', 'pointer', 'means', 'meansOnly', 'star', 'firstClash', 'firstLiar', 'elim', 'notebook', 'xref', 'signature', 'oracle'] as const;
type Strategy = (typeof ALL)[number];
const pickS = val('strategies');
const strategies: Strategy[] = !pickS || pickS === 'all' ? [...ALL] : (pickS.split(',') as Strategy[]);
const depthOn = !args.includes('--no-depth');
const jsonOut = val('json');
/** `--trace`: each strategy's questions and the name it gave, night by night, on stderr. */
const trace = args.includes('--trace');
/** docs/82: `--puzzles B` deals the nights with the harder-puzzle prototypes behind the flag (docs/83: and A). */
const puzzles = parsePuzzles(val('puzzles'));

/* ------------------------------------------------------------------ *
 * What the book shows: the grid, read as a lazy player reads it.
 * ------------------------------------------------------------------ */

/** The hours the grid marks as the ones that mattered: the crime hour once marked, else the office's hours. */
function markedHours(g: BoardGrid): Hour[] {
  return g.crimeHour !== null ? [g.crimeHour] : [...g.window];
}

/**
 * docs/82: the hour by which a held remark says it was done (the boy saw him on his floor, the basket
 * empty), as the page said it.
 */
function doneBy(d: BoardDeal, run: Pick<BoardRun, 'asked'>): Hour | undefined {
  const c = d.kase;
  let out: Hour | undefined;
  for (const q of run.asked) {
    const [kind, rest] = q.split(':') as [string, string];
    const rs: Remark[] = kind === 'list' ? (listOf(c, rest)?.remarks ?? []) : kind === 'account' ? (accountOf(c, rest)?.remarks ?? []) : [];
    for (const r of rs) if (r.done !== undefined && (out === undefined || r.done < out)) out = r.done;
  }
  return out;
}

/** The marked hours, less any the dead man's (or the pet's) own row shows him somewhere else, alive, and (docs/82) any by which somebody saw it done. */
function hoursLeft(d: BoardDeal, g: BoardGrid, run?: Pick<BoardRun, 'asked'>): Hour[] {
  const hs = markedHours(g);
  const v = g.rows.find((r) => r.victim);
  if (hs.length < 2) return hs;
  const done = run ? doneBy(d, run) : undefined;
  const left = hs.filter((h) => {
    const seen = v?.cells[h]?.seen;
    return !(seen && seen.place !== d.kase.crime.scene) && !(done !== undefined && h >= done);
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
  const hs = hoursLeft(d, g, run);
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
  // (docs/83: only a claim the grid marks ✗, or a second story it marks ✗ too: with puzzles A the picker
  // offers every hour of anybody's evening, and the grid marks nothing.)
  const g = boardGrid(d.kase, run);
  const cell = (h: Hour) => g.rows.find((r) => r.id === p)?.cells[h];
  for (const cl of pk.claims) {
    if (!(cl.again ? cell(cl.hour)?.secondClash : cell(cl.hour)?.collision)) continue;
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

/**
 * docs/78's five answers, as a lazy player fills them: the name; who caught them out, whoever's word was
 * in the line it put to them, if that landed, else the line the grid sets against them (`caughtBy`, for
 * a strategy that makes its own join), else the first person the form offers; the hour their story
 * broke at, else the one hour left, else the first; how (or where it is now) if the night told it, else
 * a guess off the form; and the named one's own reason.
 */
function fileAs(d: BoardDeal, run: BoardRun, who: PersonId, rng: Rng, own?: { caught?: string | null; when?: Hour }): BoardReport {
  const c = d.kase;
  const s = solveRun(c, run);
  const truth = truthReport(d);
  const fields = boardFields(d, run);
  const guess = (k: string) => {
    const opts = fields.find((f) => f.key === k)?.options ?? [];
    return opts.length > 0 ? rng.pick(opts).value : null;
  };
  // (docs/83: with puzzles A the grid sets no line against anybody and marks no hour: what's left is the
  // line it put to them, if that landed.)
  const caught = factsOnly(c) ? [] : collisionsOf(c, run).filter((x) => suspectsOf(c).includes(x.person));
  const mine = caught.find((x) => x.person === who);
  const g = boardGrid(c, run);
  const hs = hoursLeft(d, g, run);
  const when = own?.when ?? mine?.hour ?? (hs.length === 1 ? hs[0] : g.crimeHour) ?? (hs[0] as Hour);
  const meansSearched = run.asked.some((q) => q === `search:${c.finds.find((f) => f.gives.means)?.id}`);
  const put = run.puts.find((x) => x.person === who && x.landed && !x.again);
  const caughtBy = own?.caught !== undefined ? own.caught : sourceOfLine(d, run, put?.line ?? mine?.breakers[0]?.id);
  return {
    who,
    caught: caughtBy ?? fields.find((f) => f.key === 'caught')?.options[0]?.value ?? null,
    when,
    why: who,
    ...(isMurder(c) ? { how: s.how || meansSearched ? (truth.how ?? null) : guess('how') } : { where: s.whereNow ? (truth.where ?? null) : guess('where') }),
  };
}

interface Result {
  who: PersonId | null;
  run: BoardRun;
  report?: BoardReport;
  hints?: number;
  /** A strategy that makes its own join files its own who-caught-them-out and hour. */
  own?: { caught?: string | null; when?: Hour };
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
  const hs = hoursLeft(d, g, run);
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

/** docs/82: elimination by placement alone: no means column, no dead man's row, the office's hours. */
function playElim(d: BoardDeal, rng: Rng): Result {
  const c = d.kase;
  const left = (run: BoardRun, g: BoardGrid) => suspectsOf(c).filter((p) => !g.window.every((h) => placedAway(d, run, g, p, h)));
  const run = notebookSweep(d, (r, g) => r.asked.some((q) => q.startsWith('account:')) && left(r, g).length === 1);
  const g = boardGrid(c, run);
  const st = left(run, g);
  const cl = clashedAt(d, g, g.window).filter((p) => st.includes(p));
  return { who: st.length === 1 ? (st[0] as PersonId) : cl.length > 0 ? rng.pick(cl) : st.length > 0 ? rng.pick(st) : rng.pick(suspectsOf(c)), run };
}

function playNotebook(d: BoardDeal, rng: Rng): Result {
  // It stops once the grid leaves one standing, and only after it has some evening in hand (an empty grid
  // with one means "yes" isn't the notebook concluding anything).
  const run = notebookSweep(d, (r, g) => r.asked.some((q) => q.startsWith('account:')) && standing(d, r, g, hoursLeft(d, g, r)).length === 1);
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
  const run = notebookSweep(d, (r, g) => clashedAt(d, g, hoursLeft(d, g, r)).length >= 2);
  const g = boardGrid(c, run);
  const hs = hoursLeft(d, g, run);
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

/* ------------------------------------------------------------------ *
 * The cross-referencer's own join (docs/79 §4.A, docs/82).
 * ------------------------------------------------------------------ */

interface Join {
  /** `p@h` → where a list, a company witness's evening, the office or a remark puts them. */
  placed: Map<string, PlaceId>;
  /** The claims its join breaks, with the line and whose word it is. */
  clashes: { person: PersonId; hour: Hour; line: string; source: string | null }[];
  /** The office's hours, less those the dead man was seen elsewhere, or by which it was seen done. */
  hours: Hour[];
  /** Who could have had the means, by the origin's own list: yes, no, or not known. */
  access: Map<PersonId, 'yes' | 'no'>;
}

/** A held remark's facts, by its line id (`remark:<q>#<i>`). */
function remarkOfLine(d: BoardDeal, id: string): Remark | undefined {
  const m = /^remark:(list|account):(.+)#(\d+)$/.exec(id);
  if (!m) return undefined;
  const rs = m[1] === 'list' ? listOf(d.kase, m[2] as string)?.remarks : accountOf(d.kase, m[2] as string)?.remarks;
  return rs?.[Number(m[3])];
}

/** The join a careful player makes for themselves from what's held, reading no ✗ and no placement off the grid. */
function joinOf(d: BoardDeal, run: BoardRun): Join {
  const c = d.kase;
  const lines = linesHeld(c, run);
  const placed = new Map<string, PlaceId>();
  // Every source at a place and hour that names everybody there: a whole list's hour, a company witness's evening.
  const whole = new Map<string, { line: Line; named: Set<PersonId>; looks: string[] }[]>();
  const push = (k: string, v: { line: Line; named: Set<PersonId>; looks: string[] }) => whole.set(k, [...(whole.get(k) ?? []), v]);
  for (const f of c.givens.facts) if (f.k === 'at') placed.set(`${f.p}@${f.h}`, f.place);
  for (const l of lines) {
    if (l.kind === 'list' && l.hour !== undefined && l.place !== undefined) {
      const lst = listOf(c, l.speaker as PersonId);
      const es = lst?.entries[l.hour] ?? [];
      const named = new Set(es.flatMap((e) => ('person' in e ? [e.person] : [])));
      for (const p of named) placed.set(`${p}@${l.hour}`, l.place);
      if (lst && listExhaustive(c, lst, l.hour)) push(`${l.place}@${l.hour}`, { line: l, named, looks: es.flatMap((e) => ('look' in e ? [e.look] : [])) });
    } else if (l.kind === 'claim' && l.hour !== undefined && l.place !== undefined && personOf(c, l.speaker as PersonId)?.role === 'company') {
      const named = new Set<PersonId>([l.speaker as PersonId, ...(accountOf(c, l.speaker as PersonId)?.claims[l.hour]?.company ?? [])]);
      for (const p of named) placed.set(`${p}@${l.hour}`, l.place);
      push(`${l.place}@${l.hour}`, { line: l, named, looks: [] });
    } else if (l.kind === 'remark') {
      for (const f of remarkOfLine(d, l.id)?.facts ?? []) if (f.k === 'at') placed.set(`${f.p}@${f.h}`, f.place);
    }
  }
  const met = new Set(run.asked.filter((q) => q.startsWith('account:')).map((q) => q.slice(8)));
  const sus = suspectsOf(c);
  const clashes: Join['clashes'] = [];
  for (const l of lines) {
    if ((l.kind !== 'claim' && l.kind !== 'second') || l.hour === undefined || l.place === undefined || !sus.includes(l.speaker as PersonId)) continue;
    const p = l.speaker as PersonId;
    const h = l.hour;
    const pl = l.place;
    let hit: Line | undefined;
    // Somebody's list or evening puts them somewhere else then.
    const elsewhere = placed.get(`${p}@${h}`);
    if (elsewhere !== undefined && elsewhere !== pl) hit = lines.find((x) => (x.kind === 'list' || x.kind === 'claim') && x.hour === h && x.place === elsewhere && x.speaker !== p && x.about.includes(p));
    // Every whole list at that place and hour that hasn't got them (a coat on it might be theirs).
    if (!hit) {
      for (const src of whole.get(`${pl}@${h}`) ?? []) {
        if (src.line.speaker === p || src.named.has(p)) continue;
        if (src.looks.length > 0 && (!met.has(p) || src.looks.includes(personOf(c, p)?.look ?? ''))) continue;
        hit = src.line;
        break;
      }
    }
    // A passer-by who saw them somewhere else, or not where they said.
    if (!hit) hit = lines.find((x) => x.kind === 'remark' && x.speaker !== p && (remarkOfLine(d, x.id)?.facts ?? []).some((f) => f.p === p && f.h === h && (f.k === 'notAt' ? f.place === pl : f.place !== pl)));
    if (hit && !clashes.some((x) => x.person === p && x.hour === h && x.line === hit?.id)) clashes.push({ person: p, hour: h, line: hit.id, source: sourceOfLine(d, run, hit.id) });
  }
  // The hours: the dead man's own sightings, and the hour somebody saw it done by.
  const office = c.givens.window ?? c.crime.window;
  const done = doneBy(d, run);
  const left = office.filter((h) => {
    const v = placed.get(`${c.crime.victim}@${h}`);
    return !(v !== undefined && v !== c.crime.scene) && !(done !== undefined && h >= done);
  });
  const hours = left.length > 0 ? left : [...office];
  // The means: who the origin's own list (or the office) has there while it was, and who it hasn't.
  const access = new Map<PersonId, 'yes' | 'no'>();
  const known = !isMurder(c) || run.asked.some((q) => q === `search:${c.finds.find((f) => f.gives.means)?.id}`);
  if (known) {
    const origin = c.means.origin;
    const party = c.setup?.means && c.givens.facts.some((f) => f.k === 'at' && f.place === c.crime.scene);
    for (const p of sus) {
      if (c.givens.access.includes(p) || c.means.available.some((h) => placed.get(`${p}@${h}`) === origin)) access.set(p, 'yes');
      else if (party && origin === c.crime.scene) access.set(p, 'no');
      else if (c.means.available.every((h) => (placed.get(`${p}@${h}`) ?? origin) !== origin || (whole.get(`${origin}@${h}`) ?? []).some((src) => !src.named.has(p) && src.looks.length === 0))) access.set(p, 'no');
    }
  }
  return { placed, clashes, hours, access };
}

/** Who the cross-referencer's join leaves standing: the means not "no", and not placed away from the scene at every hour left. */
function joinStanding(d: BoardDeal, j: Join): PersonId[] {
  const scene = d.kase.crime.scene;
  return suspectsOf(d.kase).filter((p) => j.access.get(p) !== 'no' && !j.hours.every((h) => (j.placed.get(`${p}@${h}`) ?? scene) !== scene));
}

function playXref(d: BoardDeal, rng: Rng): Result {
  const c = d.kase;
  let run = newBoardRun(d);
  const o: Sweep = { confront: false, listsOnly: false };
  const puts = (r: BoardRun): string | null => {
    const j = joinOf(d, r);
    const here = new Set(peopleAt(c, r, r.at));
    const made = new Set(r.puts.map((x) => `${x.person}@${x.hour}`));
    for (const x of j.clashes) if (here.has(x.person) && !made.has(`${x.person}@${x.hour}`) && r.asked.includes(`account:${x.person}`)) return `put ${x.person} ${x.hour} ${x.line}`;
    return null;
  };
  for (let guard = 0; guard < 80 && live(d, run); guard++) {
    const j = joinOf(d, run);
    if (run.asked.some((q) => q.startsWith('account:')) && joinStanding(d, j).length === 1) break;
    const cmd = run.at !== OFFICE ? (roomWork(d, run, o) ?? puts(run) ?? sweepNext(d, run, o)) : sweepNext(d, run, o);
    if (!cmd) break;
    const next = step(d, run, cmd);
    if (!next) break;
    run = next;
  }
  const j = joinOf(d, run);
  const st = joinStanding(d, j);
  const clashed = (ps: PersonId[]) => ps.filter((p) => j.clashes.some((x) => x.person === p && j.hours.includes(x.hour)));
  const who = st.length === 1 ? (st[0] as PersonId) : clashed(st).length > 0 ? rng.pick(clashed(st)) : st.length > 0 ? rng.pick(st) : clashed(suspectsOf(c)).length > 0 ? rng.pick(clashed(suspectsOf(c))) : rng.pick(suspectsOf(c));
  const mine = j.clashes.filter((x) => x.person === who).sort((a, b) => Number(j.hours.includes(b.hour)) - Number(j.hours.includes(a.hour)))[0];
  return { who, run, own: { caught: mine?.source ?? null, ...(mine ? { when: mine.hour } : j.hours.length === 1 ? { when: j.hours[0] as Hour } : {}) } };
}

/** docs/69 §3, docs/78 §4: the "first liar" shortcut, through the engine as the oracle module plays it. */
function playFirstLiarStrategy(d: BoardDeal, seed: number): Result {
  const p = playFirstLiar(d, seed);
  return { who: p.report.who, run: p.run, report: p.report };
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
  /** Par in actions (walks included), the budget, and par in questions (docs/41 rule 16's 5 to 9). */
  par: number;
  budget: number;
  parQ: number;
  oneLiar: boolean;
  culprit: PersonId;
  /** The innocent liar, if the night has one, and how they answer when it's put to them. */
  innocent?: { person: PersonId; response: string };
  suspects: number;
  /** docs/82: the generator on this seed: whether it dealt it (else the next seed's night is measured), and the attempts it took. */
  gen: { ok: boolean; attempts: number };
  /** docs/82: a two-hour window, and the crime at its earlier hour. */
  windowed: boolean;
  early: boolean;
  /** docs/82 (puzzles B): what tells the two stories apart, and the Hard-boiled variant. */
  discriminator?: string;
  variant?: string;
  /**
   * Per strategy: the name, right or not, who caught them out named rightly (`proof`, the report's
   * second answer), perfect (five out of five), actions, and whether it heard the culprit's own evening.
   */
  results: Record<string, { who: PersonId | null; right: boolean; proof: boolean; perfect: boolean; actions: number; heard: boolean; hints?: number }>;
  depth?: Depth;
}

const nights: NightRow[] = [];
const t0 = Date.now();
for (const world of worlds) {
  for (const tier of tiers) {
    for (const type of typesFor(tier) as CaseType[]) {
      for (let s = FROM; s < FROM + N; s++) {
        // (docs/82: the generator's own rate on this seed; a seed it can't build deals the next, as the book does.)
        const g = generateBoard(s, tier, { type, ...(world === 'dealt' ? {} : { world: worldCtx(world) }), ...(puzzles.length ? { puzzles } : {}) });
        const d: BoardDeal = g ? { kase: g.kase, analysis: g.analysis } : dealBoard(s, tier, type, { ...(world === 'dealt' ? {} : { world }), ...(puzzles.length ? { puzzles } : {}) });
        const c = d.kase;
        const il = innocentLie(c);
        const ik = il ? c.confrontations.find((k) => k.person === il.person && k.hour === il.hour) : undefined;
        const win = c.givens.window ?? c.crime.window;
        const row: NightRow = {
          world,
          tier,
          type,
          seed: s,
          par: parCalls(d),
          budget: budgetCalls(d),
          parQ: d.analysis.par,
          oneLiar: oneLiar(c),
          culprit: c.crime.culprit,
          ...(il ? { innocent: { person: il.person, response: ik?.response ?? '' } } : {}),
          suspects: suspectsOf(c).length,
          gen: { ok: !!g, attempts: g?.attempts ?? 0 },
          windowed: win.length > 1,
          early: win.length > 1 && c.crime.hour === win[0],
          ...(c.discriminator ? { discriminator: c.discriminator } : {}),
          ...(c.variant ? { variant: c.variant } : {}),
          results: {},
        };
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
                      : st === 'firstLiar'
                        ? playFirstLiarStrategy(d, s)
                        : st === 'elim'
                          ? playElim(d, rng)
                        : st === 'notebook'
                          ? playNotebook(d, rng)
                          : st === 'xref'
                            ? playXref(d, rng)
                            : st === 'signature'
                              ? playSignature(d, rng)
                              : playOracle(d);
          const right = r.who === c.crime.culprit;
          let proof = false;
          let perfect = false;
          if (r.who) {
            const report = r.report ?? fileAs(d, r.run, r.who, rng, r.own);
            const filed = r.run.reportOpen || r.run.filed ? r.run : (stepBoard(d, r.run, 'file').run ?? r.run);
            const v = scoreBoard(d, filed, report);
            // docs/78: who caught them out, named rightly (right only with the right culprit).
            proof = !!v.fields.find((f) => f.key === 'caught')?.correct;
            perfect = v.outcome === 'solved';
          }
          row.results[st] = { who: r.who, right, proof, perfect, actions: r.run.used, heard: r.run.asked.includes(`account:${c.crime.culprit}`), ...(r.hints !== undefined ? { hints: r.hints } : {}) };
          if (trace) process.stderr.write(`${world} ${tierName(tier)} ${type} ${s} ${st}: ${r.run.asked.join(' ')} -> ${r.who}${right ? ' (right)' : ` (culprit ${c.crime.culprit})`}${proof ? ', and who caught them out' : ''}\n`);
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
  firstLiar: 'first liar',
  elim: 'elimination by placement',
  notebook: 'notebook reader',
  xref: 'cross-referencer',
  signature: 'the tier’s trick',
  oracle: 'oracle',
};
out.push(`Nights: ${nights.length} (${worlds.join(' + ')}, seeds ${FROM}–${FROM + N - 1} a tier and type${puzzles.length ? `; puzzles ${puzzles.join(',')}` : ''}).`);
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
out.push('The same name and who caught them out named rightly (docs/78’s second answer), and the perfect report (five out of five), by tier:');
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
// docs/82: the same, split by nights with one liar and nights with two, from Poached up.
const split = tiers.filter((t) => t >= 2);
if (split.length > 0) {
  for (const [title, f] of [
    ['Right culprit, nights with one liar / with two (n), from Poached up:', (r: NightRow['results'][string]) => r.right],
    ['Perfect report, nights with one liar / with two, from Poached up:', (r: NightRow['results'][string]) => r.perfect],
  ] as const) {
    out.push('');
    out.push(title);
    out.push('');
    out.push(`| strategy | ${split.map((t) => tierName(t)).join(' | ')} |`);
    out.push(`|---|${split.map(() => '---').join('|')}|`);
    for (const st of strategies) {
      const cells = split.map((t) => {
        const of = (one: boolean) => nights.filter((n) => n.tier === t && n.oneLiar === one).map((n) => n.results[st]).filter((x): x is NonNullable<typeof x> => !!x);
        const a = of(true);
        const b = of(false);
        return `${pct(a.filter(f).length, a.length)} / ${pct(b.filter(f).length, b.length)} (${a.length}/${b.length})`;
      });
      out.push(`| ${label[st]} | ${cells.join(' | ')} |`);
    }
  }
}
// docs/82: the deal itself: the generator's rate and attempts, the crime at the window's earlier hour, the one-liar share.
out.push('');
out.push('The deal, by tier: seeds the generator dealt (else the next seed’s night), attempts (mean), the crime at the earlier hour (of two-hour nights), one-liar nights, par and budget:');
out.push('');
out.push(`| | ${tiers.map((t) => tierName(t)).join(' | ')} |`);
out.push(`|---|${tiers.map(() => '---').join('|')}|`);
const by = (f: (ns: NightRow[]) => string) => tiers.map((t) => f(nights.filter((n) => n.tier === t))).join(' | ');
out.push(`| dealt on the seed | ${by((ns) => pct(ns.filter((n) => n.gen.ok).length, ns.length))} |`);
out.push(`| attempts | ${by((ns) => mean(ns.filter((n) => n.gen.ok).map((n) => n.gen.attempts)))} |`);
out.push(`| crime at the earlier hour | ${by((ns) => { const w = ns.filter((n) => n.windowed); return w.length ? `${pct(w.filter((n) => n.early).length, w.length)} (${w.length})` : '—'; })} |`);
out.push(`| one-liar nights | ${by((ns) => pct(ns.filter((n) => n.oneLiar).length, ns.length))} |`);
out.push(`| par, actions (mean, min–max) | ${by((ns) => (ns.length ? `${mean(ns.map((n) => n.par))} (${Math.min(...ns.map((n) => n.par))}–${Math.max(...ns.map((n) => n.par))})` : '—'))} |`);
out.push(`| par, questions (mean, min–max) | ${by((ns) => (ns.length ? `${mean(ns.map((n) => n.parQ))} (${Math.min(...ns.map((n) => n.parQ))}–${Math.max(...ns.map((n) => n.parQ))})` : '—'))} |`);
out.push(`| budget, actions (mean) | ${by((ns) => mean(ns.map((n) => n.budget)))} |`);
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
