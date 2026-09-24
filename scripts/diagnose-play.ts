/**
 * Diagnosing play: why a night feels like pushing random buttons.
 *
 *   npx tsx scripts/diagnose-play.ts [--seeds 100] [--configs d1,d2,T0,...] [--json out.json]
 *   npx tsx scripts/diagnose-play.ts --route uniform|leads --seed N --configs T5L2
 *
 * The first prints markdown tables; the second prints one player's route for
 * `npm run read -- --route "…"`. Findings are written up in docs/18-diagnosis.md.
 *
 * Read-only. Generates cases, drives the real reducer through the real choice
 * model with four players, and measures what each action got, where the leads
 * send you, how obvious the elimination is, and where the lies are. Nothing in
 * the game or the generator is changed; everything here reads their exports.
 *
 * Players:
 * - `oracle`   — the existing optimal spine collector (`playOracle`).
 * - `wander`   — the existing imperfect player (`playWandering`).
 * - `uniform`  — the button-pusher: uniformly random among every costed
 *                choice on the page that is not already done (ticked).
 * - `leads`    — the lead-follower: a marked question or search in this room
 *                when there is one, else a marked room, else anything.
 * - `reason`   — M9: the reasoning player. It follows the same marks, but it
 *                reads the notebook with the solver (`solveHeld`, never the
 *                truth): it asks for the evening of anybody whose half hour
 *                of the crime is still open, asks about the people whose cell
 *                is open, puts a fact to somebody when the solver says a fact
 *                in hand breaks what they said, and files what the notebook
 *                settles (`crimeFromHeld`), the full column included.
 *
 * `--design` runs only the three players of the M9 design test — the
 * marks-follower (`leads`), the reasoning player and the button-pusher — and
 * prints the design-test table: who each names, and how often the reasoning
 * player gets who, when and the whole crime column right within the budget.
 *
 * Filing (for every player): `who` is the one suspect the notebook's facts
 * leave uncleared at every half hour still open for the death, when exactly
 * one is left; otherwise the monologue's leading theory (the wanderer's rule).
 * Everything else is filed the way `playWandering` files it.
 */

import { generateCase, type GenerateOptions } from '../src/gen/index.js';
import type { Case, Clue, Fact, Id, Person, Tick } from '../src/gen/types.js';
import { TICKS } from '../src/gen/types.js';
import {
  buildView,
  establishedFrom,
  gameBudget,
  gamePar,
  peopleHereNow,
  topicKey,
  type CaseView,
} from '../src/game/derive.js';
import { allChoices, choicesFor } from '../src/game/choices.js';
import { playerChoices } from './players.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { parse } from '../src/game/parser.js';
import { answersTo, continuationOf, fileReport, newRun, priceOf, stepInput } from '../src/game/reducer.js';
import { scoreReport } from '../src/game/scoring.js';
import { leadingTheory } from '../src/game/voice/reactive.js';
import { Rng } from '../src/gen/rng.js';
import type { Page, Report, RunState } from '../src/game/types.js';
import { writeFileSync } from 'node:fs';
import { culpritOf as solverCulprit, placesAt, solve, type SolverProblem, type SolverRule } from '../src/gen/logic/solver.js';
import { contradicts, crimeFromHeld } from '../src/gen/index.js';
import { applyMark } from '../src/game/grid.js';
import {
  clearsAt,
  deathTicks,
  factsOf,
  fileFor,
  fileReasoned,
  givenFacts,
  reasonPicker,
  settled,
  suspectsOf,
  uncleared,
  type Picker,
} from './players.js';
import {
  accountClueOf,
  canConfront,
  columnAsked,
  columnPeople,
  confessedOf,
  confrontFacts,
  partBreaks,
  partRef,
  partsOf,
  saidRecords,
  solveNotebook,
  truthColumn,
  verdictsOn,
} from '../src/game/m9.js';

/* ---------------------------------------------------- M9: the solver's view */

interface SolverFrame {
  suspects: Id[];
  places: Id[];
  blocks: Record<Id, number>;
  scene: Id;
  victimId: Id;
  murder: boolean;
  givens: Fact[];
  confessions: SolverRule[];
}

/** The grid a case is solved on. A case from before M9 has no blocks: travel is free. */
function solverFrame(kase: Case): SolverFrame {
  return {
    suspects: kase.people.filter((p) => p.kind === 'suspect').map((p) => p.id),
    places: kase.places.map((p) => p.id),
    blocks: { ...(kase.logic?.blocks ?? {}) },
    scene: kase.solution.murderPlaceId,
    victimId: kase.people.find((p) => p.kind === 'victim')?.id as Id,
    murder: kase.act.type === 'murder',
    givens: kase.act.givens.facts,
    confessions: (kase.logic?.confrontations ?? [])
      .filter((k) => k.responses[1].kind === 'admit' || k.responses[1].kind === 'withdraw')
      .map((k) => ({
        id: `confess:${k.personId}:${k.lie.ticks[0]}`,
        facts: (k.responses[1].facts ?? []).filter((f) => f.kind === 'personAt'),
        when: { personId: k.personId, place: k.lie.claimed, ticks: k.lie.ticks, requires: k.lie.accountId },
      })),
  };
}

function solverProblem(frame: SolverFrame, clues: Clue[], probe: boolean, withConfessions?: Case): SolverProblem {
  return {
    suspects: frame.suspects,
    places: frame.places,
    blocks: frame.blocks,
    scene: frame.scene,
    victimId: frame.victimId,
    murder: frame.murder,
    rules: [
      { id: 'given', facts: frame.givens },
      ...clues.map((c) => ({ id: c.id, facts: c.establishes })),
      ...(withConfessions ? frame.confessions : []),
    ],
    exactlyOne: true,
    probe,
  };
}

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SEEDS = Number(arg('seeds') ?? 100);
const JSON_OUT = arg('json');

interface Config {
  label: string;
  opts: GenerateOptions;
}
const ALL_CONFIGS: Config[] = [
  { label: 'd1', opts: { difficulty: 1 } },
  { label: 'd2', opts: { difficulty: 2 } },
  { label: 'd3', opts: { difficulty: 3 } },
  { label: 'T0', opts: { tier: 0 } },
  { label: 'T1L1', opts: { tier: 1, level: 1 } },
  { label: 'T1L2', opts: { tier: 1, level: 2 } },
  { label: 'T3L2', opts: { tier: 3, level: 2 } },
  { label: 'T2L1', opts: { tier: 2, level: 1 } },
  { label: 'T2L2', opts: { tier: 2, level: 2 } },
  { label: 'T2L3', opts: { tier: 2, level: 3 } },
  { label: 'T4L1', opts: { tier: 4, level: 1 } },
  { label: 'T4L2', opts: { tier: 4, level: 2 } },
  { label: 'T4L3', opts: { tier: 4, level: 3 } },
  { label: 'T5L1', opts: { tier: 5, level: 1 } },
  { label: 'T5L2', opts: { tier: 5, level: 2 } },
  { label: 'T5L3', opts: { tier: 5, level: 3 } },
];
const wanted = arg('configs')?.split(',');
// M14: `--type lost-pet` plays every config at that case type (the design test per type).
const TYPE = arg('type') as GenerateOptions['type'] | undefined;
const CONFIGS = (wanted ? ALL_CONFIGS.filter((c) => wanted.includes(c.label)) : ALL_CONFIGS).map((c) =>
  TYPE === undefined ? c : { label: `${c.label}:${TYPE}`, opts: { ...c.opts, type: TYPE } },
);

/* --------------------------------------------------------------- helpers */

const PLAYERS = ['oracle', 'wander', 'uniform', 'leads', 'reason'] as const;
type PlayerId = (typeof PLAYERS)[number];

const mean = (xs: number[]): number => (xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length);
const share = (n: number, d: number): number => (d === 0 ? NaN : n / d);
const pct = (x: number): string => (Number.isNaN(x) ? '—' : `${Math.round(x * 100)}%`);
const num = (x: number, d = 1): string => (Number.isNaN(x) ? '—' : x.toFixed(d));
const median = (xs: number[]): number => {
  if (xs.length === 0) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] as number;
};

function culpritOf(kase: Case): Id | null {
  if (!kase.act.unknowns.includes('who')) return null;
  const p = kase.people.find((x) => x.id === kase.act.actorId);
  return p && p.kind === 'suspect' ? p.id : null;
}

function roleOf(view: CaseView, id: Id): string {
  return view.findableById.get(id)?.role ?? '?';
}

/** "Pickering" from "Pickering’s account" / "Prentiss that evening" / "Carbone and Vitale". */
function subjectOfTopic(view: CaseView, topic: string): Id | null {
  let best: { at: number; id: Id } | null = null;
  const low = topic.toLowerCase();
  for (const p of view.kase.people) {
    const at = low.indexOf(p.surname.toLowerCase());
    if (at < 0) continue;
    if (best === null || at < best.at) best = { at, id: p.id };
  }
  return best?.id ?? null;
}

/** Who a clue is about: its fact subjects. */
function subjectsOf(clue: Clue): Set<Id> {
  const out = new Set<Id>();
  for (const f of clue.establishes) if ('personId' in f) out.add(f.personId);
  return out;
}

/** Everyone a clue names: its source, its subjects, and surnames in its text. */
function peopleIn(view: CaseView, clue: Clue): Set<Id> {
  const out = subjectsOf(clue);
  if (clue.source.type === 'person') out.add(clue.source.personId);
  const text = (clue.textRecord ?? clue.text).toLowerCase();
  for (const p of view.kase.people) if (text.includes(p.surname.toLowerCase())) out.add(p.id);
  return out;
}

/* ---------------------------------------------- logic-game rule types (a) */

type RuleType =
  | 'fixed placement'
  | 'negative placement'
  | 'together/apart'
  | 'relative/sequence'
  | 'conditional'
  | 'numerical/absence'
  | 'identity/attribute'
  | 'time window'
  | 'context (no fact)';

const CLOCK_RE = /\b\d{1,2}:\d{2}\s(?:AM|PM)\b/;

function ruleType(clue: Clue): RuleType {
  const kinds = new Set(clue.establishes.map((f) => f.kind));
  const text = clue.textRecord ?? clue.text;
  if (clue.establishes.length === 0) return 'context (no fact)';
  // A companion refusing an alibi: "Carbone says she was not with Brauer".
  if (clue.kind === 'denial') return 'together/apart';
  if (/\b(nobody|no one|no-one|not a soul|only one)\b/i.test(text) && (kinds.has('personNotAt') || kinds.has('personAt')))
    return 'numerical/absence';
  if (kinds.has('personNotAt')) return 'negative placement';
  if (kinds.has('personAt')) {
    // Timed by an event and not by a clock face is a relative placement.
    return CLOCK_RE.test(text) ? 'fixed placement' : 'relative/sequence';
  }
  if (kinds.has('victimAliveAt') || kinds.has('victimDeadBy') || kinds.has('noiseAt'))
    return CLOCK_RE.test(text) ? 'time window' : 'relative/sequence';
  if (kinds.has('timeOfDeath')) return 'time window';
  return 'identity/attribute';
}

/* ------------------------------------------------------------- the runs */

interface StepRec {
  n: number;
  command: string;
  verb: string;
  costed: boolean;
  action: number;
  from: Id;
  to: Id;
  gained: Id[];
  newAccount: boolean;
  opened: { clueId: Id; placeId: Id; personId: Id | null; subject: Id | null }[];
  openThreads: number;
  offered: number;
  markedOffered: number;
  chosenMarked: boolean;
  bridges: Id[];
  thoughts: string[];
  unclearedAfter: Id[];
  theory: Id | null;
  windowAfter: number;
  windowBefore: number;
  page: Page;
}

interface RunRec {
  player: PlayerId;
  steps: StepRec[];
  state: RunState;
  report: Report;
  whoCorrect: boolean | null;
  solved: boolean;
  /** M9: the deduction the report asks — who, when, the column — all right. */
  deduced: boolean;
  /** Cells of the column right, of those asked. */
  columnRight: number;
  columnAsked: number;
  ownFiling?: { whoCorrect: boolean | null; solved: boolean };
}

function isCosted(before: RunState, after: RunState): boolean {
  return after.actionsUsed > before.actionsUsed || after.waived > before.waived;
}

function verbOf(cmd: string): string {
  return cmd.split(' ')[0] ?? '';
}

function drive(view: CaseView, pick: Picker, rng: Rng, player: PlayerId, maxSteps = 120): RunRec {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  const budget = gameBudget(view.kase);
  const steps: StepRec[] = [];
  let action = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (state.reportOpen || state.actionsUsed >= budget) break;
    // M11 §A.5: "Ask Hauck who's here" is free and tells no fact — the client
    // names the room, and the grid learns nothing from it — so no player
    // spends a step on it. Taking it would add a page, and the page count
    // seeds the volunteer's roll and the dealer; leaving it out is what keeps
    // this test's table line for line where it was.
    const groups = playerChoices(view, state);
    const offered = allChoices(groups).filter((c) => !['notebook', 'file'].includes(c.command));
    const chosen = pick(state, view, rng, groups);
    if (!chosen) break;
    const before = state;
    const beforeThreads = new Set(before.threads.map((t) => t.clueId));
    const first = stepInput(state, chosen.command, view);
    state = first.state;
    // M10 §A.3: every player takes "Go on" when a page offers it — it is free,
    // and the same question asked again would go on too. One step here is the
    // whole answer, however many pages it took.
    const found = [...first.page.found];
    const moreBeats = [...(first.page.beats ?? [])];
    for (let more = continuationOf(view, state); more !== null; more = continuationOf(view, state)) {
      const next = stepInput(state, more, view);
      if (next.page.found.length === 0) break;
      state = next.state;
      found.push(...next.page.found);
      moreBeats.push(...(next.page.beats ?? []));
    }
    const result = { ...first, page: { ...first.page, found, beats: moreBeats } };
    const costed = isCosted(before, state);
    if (costed) action++;
    const opened = state.threads
      .filter((t) => !beforeThreads.has(t.clueId))
      .map((t) => {
        const c = view.findableById.get(t.clueId) as Clue;
        return {
          clueId: t.clueId,
          placeId: t.placeId,
          personId: c.source.type === 'person' ? c.source.personId : null,
          subject: c.source.type === 'person' ? subjectOfTopic(view, c.source.topic) : null,
        };
      });
    const beats = result.page.beats ?? [];
    steps.push({
      n: result.page.n,
      command: chosen.command,
      verb: verbOf(chosen.command),
      costed,
      action,
      from: before.at,
      to: state.at,
      gained: result.page.found,
      newAccount: state.accounts.length > before.accounts.length,
      opened,
      openThreads: state.threads.length,
      offered: offered.filter((c) => !c.done).length,
      markedOffered: offered.filter((c) => c.lead && !c.done).length,
      chosenMarked: chosen.marked,
      bridges: beats.filter((b) => b.kind === 'bridge' && b.targetId).map((b) => b.targetId as Id),
      thoughts: beats.filter((b) => b.kind === 'thought' && b.tag).map((b) => b.tag as string),
      unclearedAfter: uncleared(view.kase, factsOf(view, state.found)),
      theory: leadingTheory(view, establishedFrom(view, state.found, state.accounts)),
      windowAfter: deathTicks(factsOf(view, state.found)).length,
      windowBefore: deathTicks(factsOf(view, before.found)).length,
      page: result.page,
    });
    if (!costed && result.page.found.length === 0 && chosen.command !== '' && i > 60) break;
  }
  const report = player === 'reason' ? fileReasoned(view, state) : fileFor(view, state);
  const scored = score(view, state, report);
  return { player, steps, state, report, ...scored, ...deduction(view, report) };
}

/**
 * M9's design test scores the deduction: who, when (where asked) and every
 * cell of the crime column (from Medium up), all right.
 */
function deduction(view: CaseView, report: Report): { deduced: boolean; columnRight: number; columnAsked: number } {
  const kase = view.kase;
  const unknowns = kase.act.unknowns;
  const who = report.killerId === kase.solution.killerId;
  const when = !unknowns.includes('when') || report.tick === kase.solution.murderTick;
  let columnRight = 0;
  let columnCount = 0;
  if (columnAsked(view)) {
    const truth = truthColumn(view);
    for (const p of columnPeople(view)) {
      columnCount++;
      if ((report.column?.[p.id] ?? null) === (truth[p.id] ?? null)) columnRight++;
    }
  }
  return { deduced: who && when && columnRight === columnCount, columnRight, columnAsked: columnCount };
}

function score(view: CaseView, state: RunState, report: Report): { whoCorrect: boolean | null; solved: boolean } {
  const verdict = scoreReport(view, fileReport(state, report), report);
  const who = verdict.fields.find((f) => f.key === 'who');
  return { whoCorrect: who ? who.correct : null, solved: verdict.outcome === 'solved' };
}

const uniformPicker: Picker = (_state, _view, rng, groups) => {
  // M9: "Put it to …" is one button that opens a picker; the button-pusher
  // presses it as one choice and then reads out any line at all.
  const plain = groups.filter((g) => g.kind !== 'confront');
  const pickers = groups.filter((g) => g.kind === 'confront' && g.choices.some((c) => !c.done));
  const options = allChoices(plain).filter((c) => !c.done && !['notebook', 'file'].includes(c.command));
  const total = options.length + pickers.length;
  if (total === 0) return null;
  const i = rng.int(total);
  if (i >= options.length) {
    const g = pickers[i - options.length] as (typeof groups)[number];
    const c = rng.pick(g.choices.filter((x) => !x.done));
    return { command: c.command, marked: false };
  }
  const c = options[i] as (typeof options)[number];
  return { command: c.command, marked: c.lead };
};

const leadsPicker: Picker = (_state, _view, rng, groups) => {
  // The marks-follower never opens the picker: a fact is never marked.
  const options = allChoices(groups.filter((g) => g.kind !== 'confront')).filter(
    (c) => !c.done && !['notebook', 'file'].includes(c.command),
  );
  if (options.length === 0) return null;
  // A marked question or search in this room first, then a marked room to
  // walk to, then anything.
  const markedHere = options.filter((c) => c.lead && !c.command.startsWith('go '));
  const markedGo = options.filter((c) => c.lead && c.command.startsWith('go '));
  const c = rng.pick(markedHere.length > 0 ? markedHere : markedGo.length > 0 ? markedGo : options);
  return { command: c.command, marked: c.lead };
};

function scripted(all: string[]): Picker {
  // \`drive\` takes every "Go on" itself.
  const commands = all.filter((c) => c !== 'go on');
  let i = 0;
  return (_state, _view, _rng, groups) => {
    const cmd = commands[i++];
    if (cmd === undefined) return null;
    const offered = allChoices(groups);
    const hit = offered.find((c) => c.command === cmd);
    return { command: cmd, marked: hit?.lead ?? false };
  };
}

/* --------------------------------------------- choice usefulness (item 5) */

type ChoiceCat =
  | 'lead (exact topic)'
  | 'ask: evening'
  | 'ask: themselves'
  | 'ask: why hired'
  | 'ask: a person'
  | 'ask: a place'
  | 'ask: a thing'
  | 'ask: anchor'
  | 'search: room'
  | 'search: a thing'
  | 'go';

interface ChoiceTally {
  offered: number;
  yieldsNow: number;
  everYields: number;
  /** M9: could ever return a clue that places somebody, or says they were not there. */
  everFact?: number;
}

/** A fact that goes on the grid: a placement, an absence, a description, a count, company. */
const GRID_FACTS = new Set(['personAt', 'personNotAt', 'personAtAnchor', 'describedAt', 'absentFrom', 'countAt', 'together', 'apart', 'victimAliveAt']);

function classifyChoices(view: CaseView, state: RunState, tally: Map<ChoiceCat, ChoiceTally>): void {
  const present = peopleHereNow(view, state.at, {
    clientInOffice: state.clientInOffice,
    found: state.found,
  }).map((p) => p.id);
  const have = new Set(state.found);
  for (const c of allChoices(choicesFor(view, state))) {
    if (c.done || c.command === 'notebook' || c.command === 'file') continue;
    const parsed = parse(view, state.at, c.command, present, state.found);
    if (!parsed.ok) continue;
    const cmd = parsed.command;
    let cat: ChoiceCat;
    let now = false;
    let ever = false;
    let everFact = false;
    if (cmd.kind === 'go') {
      cat = 'go';
      now = c.lead;
      ever = true;
    } else if (cmd.kind === 'examine') {
      cat = cmd.objectId ? 'search: a thing' : 'search: room';
      const clues = view.placeClues.get(state.at) ?? [];
      const price = priceOf(cmd, state, view);
      now = price.reason !== 'search-again' && clues.some((x) => !have.has(x.id));
      ever = clues.length > 0;
    } else if (cmd.kind === 'ask') {
      const t = cmd.topic;
      // M9: "ask X about Y" resolves to the exact bucket of X's testimony
      // about Y. It is still a question about a person, not a lead.
      const bucket = t.kind === 'exact' ? (view.exactBuckets.get(t.personId)?.get(t.topic) ?? []) : [];
      const aboutPerson = bucket.length > 0 && bucket.every((x) => x.kind === 'testimony');
      cat =
        t.kind === 'exact' && !aboutPerson
          ? 'lead (exact topic)'
          : aboutPerson
            ? 'ask: a person'
          : t.kind === 'evening'
            ? 'ask: evening'
            : t.kind === 'self'
              ? 'ask: themselves'
              : t.kind === 'hire'
                ? 'ask: why hired'
                : t.kind === 'person'
                  ? 'ask: a person'
                  : t.kind === 'place'
                    ? 'ask: a place'
                    : t.kind === 'object'
                      ? 'ask: a thing'
                      : 'ask: anchor';
      if (t.kind === 'evening' || t.kind === 'self') {
        now = false;
        ever = false;
      } else {
        now = answersTo(view, cmd.personId, t, state.found).length > 0;
        const key = topicKey(t);
        const answering = view.kase.findable.filter(
          (x) =>
            x.source.type === 'person' &&
            x.source.personId === cmd.personId &&
            (t.kind === 'exact' ? x.source.topic === t.topic : (view.answers.get(x.id) ?? []).includes(key)),
        );
        ever = answering.length > 0;
        everFact = answering.some((x) => x.establishes.some((f) => GRID_FACTS.has(f.kind)));
      }
    } else continue;
    const row = tally.get(cat) ?? { offered: 0, yieldsNow: 0, everYields: 0, everFact: 0 };
    row.offered++;
    if (now) row.yieldsNow++;
    if (ever) row.everYields++;
    if (everFact) row.everFact = (row.everFact ?? 0) + 1;
    tally.set(cat, row);
  }
}

/* --------------------------------------------------------- aggregation */

interface PlayerAgg {
  runs: number;
  actions: number;
  noClue: number;
  accountOnly: number;
  noiseOnly: number;
  corrobOnly: number;
  withSpine: number;
  firstSpine: number[];
  neverSpine: number;
  whoAsked: number;
  whoCorrect: number;
  murderRuns: number;
  solvedMurder: number;
  ownWhoCorrect: number;
  ownSolvedMurder: number;
  uniqueAtEnd: number;
  uniqueAt: number[];
  opened: number;
  openedHere: number;
  openedJustLeft: number;
  openedVisitedElsewhere: number;
  openedPersonAsked: number;
  openedSameQuestionSubject: number;
  bridges: number;
  bridgeJustLeft: number;
  bridgeVisited: number;
  bridgePersonAsked: number;
  returns: number;
  emptyReturns: number;
  pingPong: number;
  moves: number;
  openThreadSamples: number[];
  markedOfferedSamples: number[];
  offeredSamples: number[];
  zeroMarkedPages: number;
  pages: number;
  clearsThoughtsOnClearFinds: number;
  clearFinds: number;
  clearsWhileWindowOpen: number;
  clearsThoughts: number;
  theoryFirstRight: number[];
  theoryRightAtEnd: number;
  theoryNamedAtEnd: number;
  accountsHeard: number;
  neverStart: number;
  goActions: number;
  firstCulpritContradiction: number[];
  routeDepth: number[];
  routePin: number[];
}

function newAgg(): PlayerAgg {
  return {
    runs: 0,
    actions: 0,
    noClue: 0,
    accountOnly: 0,
    noiseOnly: 0,
    corrobOnly: 0,
    withSpine: 0,
    firstSpine: [],
    neverSpine: 0,
    whoAsked: 0,
    whoCorrect: 0,
    murderRuns: 0,
    solvedMurder: 0,
    ownWhoCorrect: 0,
    ownSolvedMurder: 0,
    uniqueAtEnd: 0,
    uniqueAt: [],
    opened: 0,
    openedHere: 0,
    openedJustLeft: 0,
    openedVisitedElsewhere: 0,
    openedPersonAsked: 0,
    openedSameQuestionSubject: 0,
    bridges: 0,
    bridgeJustLeft: 0,
    bridgeVisited: 0,
    bridgePersonAsked: 0,
    returns: 0,
    emptyReturns: 0,
    pingPong: 0,
    moves: 0,
    openThreadSamples: [],
    markedOfferedSamples: [],
    offeredSamples: [],
    zeroMarkedPages: 0,
    pages: 0,
    clearsThoughtsOnClearFinds: 0,
    clearFinds: 0,
    clearsWhileWindowOpen: 0,
    clearsThoughts: 0,
    theoryFirstRight: [],
    theoryRightAtEnd: 0,
    theoryNamedAtEnd: 0,
    accountsHeard: 0,
    neverStart: 0,
    goActions: 0,
    firstCulpritContradiction: [],
    routeDepth: [],
    routePin: [],
  };
}

interface Example {
  kind: string;
  config: string;
  seed: number;
  player: PlayerId;
  page: number;
  text: string;
}
const examples: Example[] = [];
const exampleCount = new Map<string, number>();
function example(e: Example, cap = 4): void {
  const n = exampleCount.get(e.kind) ?? 0;
  if (n >= cap) return;
  exampleCount.set(e.kind, n + 1);
  examples.push(e);
}

function pageText(page: Page): string {
  return page.blocks
    .filter((b) => b.kind === 'prose' || b.kind === 'note')
    .map((b) => (b as { text: string }).text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function analyseRun(view: CaseView, run: RunRec, agg: PlayerAgg, cfg: string): void {
  const kase = view.kase;
  const starting = new Set(kase.starting);
  const culprit = culpritOf(kase);
  agg.runs++;
  let firstSpine: number | null = null;
  const visited = new Set<Id>([view.office.id]);
  const askedPeople = new Set<Id>();
  const askedSubjects = new Map<Id, Set<Id>>();
  let prevPlace: Id | null = null;
  let visit: { place: Id; gained: number; isReturn: boolean; page: number } | null = null;
  const moveTrail: Id[] = [view.office.id];
  let uniqueAt: number | null = null;
  let theoryRight: number | null = null;
  let firstContra: number | null = null;

  const closeVisit = (): void => {
    if (visit && visit.isReturn) {
      agg.returns++;
      if (visit.gained === 0) {
        agg.emptyReturns++;
        example({
          kind: 'empty-return',
          config: cfg,
          seed: kase.seed,
          player: run.player,
          page: visit.page + 1,
          text: `went back to ${view.placeById.get(visit.place)?.shortName} and left with nothing new`,
        });
      }
    }
  };

  for (const s of run.steps) {
    agg.pages++;
    agg.offeredSamples.push(s.offered);
    agg.markedOfferedSamples.push(s.markedOffered);
    if (s.markedOffered === 0) agg.zeroMarkedPages++;
    agg.openThreadSamples.push(s.openThreads);

    if (s.verb === 'go' && s.from !== s.to) {
      closeVisit();
      agg.moves++;
      const isReturn = visited.has(s.to);
      visit = { place: s.to, gained: 0, isReturn, page: s.n };
      if (moveTrail.length >= 2 && moveTrail[moveTrail.length - 2] === s.to) agg.pingPong++;
      prevPlace = s.from;
      moveTrail.push(s.to);
      visited.add(s.to);
    }
    if (visit) visit.gained += s.gained.length + (s.newAccount ? 1 : 0);

    if (s.costed) {
      agg.actions++;
      const gained = s.gained.filter((id) => !starting.has(id) || s.verb !== 'go');
      const roles = s.gained.map((id) => roleOf(view, id));
      const nonStartSpine = s.gained.some((id) => roleOf(view, id) === 'spine' && !starting.has(id));
      if (s.gained.length === 0 && !s.newAccount) {
        agg.noClue++;
      } else if (s.gained.length === 0 && s.newAccount) {
        agg.accountOnly++;
      } else if (roles.some((r) => r === 'spine')) {
        agg.withSpine++;
      } else if (roles.some((r) => r === 'corroboration')) {
        agg.corrobOnly++;
      } else {
        agg.noiseOnly++;
      }
      void gained;
      if (firstSpine === null && nonStartSpine) firstSpine = s.action;
    }

    // Leads this step opened: where do they send you?
    for (const o of s.opened) {
      agg.opened++;
      if (o.placeId === s.to) agg.openedHere++;
      else if (prevPlace !== null && o.placeId === prevPlace) {
        agg.openedJustLeft++;
        example({
          kind: 'lead-to-place-just-left',
          config: cfg,
          seed: kase.seed,
          player: run.player,
          page: s.n + 1,
          text: `at ${view.placeById.get(s.to)?.shortName}, "${s.command}" opened a lead back at ${view.placeById.get(o.placeId)?.shortName}, the room just left`,
        });
      } else if (visited.has(o.placeId)) agg.openedVisitedElsewhere++;
      if (o.personId && askedPeople.has(o.personId)) agg.openedPersonAsked++;
      if (o.personId && o.subject && askedSubjects.get(o.personId)?.has(o.subject)) {
        agg.openedSameQuestionSubject++;
        example({
          kind: 'lead-repeats-a-question',
          config: cfg,
          seed: kase.seed,
          player: run.player,
          page: s.n + 1,
          text: `a new lead asks ${view.personById.get(o.personId)?.surname} about ${view.personById.get(o.subject)?.surname} again (${(view.findableById.get(o.clueId)?.source as { topic: string }).topic})`,
        });
      }
    }
    for (const b of s.bridges) {
      const t = view.findableById.get(b);
      if (!t) continue;
      agg.bridges++;
      if (prevPlace !== null && t.place === prevPlace && t.place !== s.to) agg.bridgeJustLeft++;
      if (visited.has(t.place) && t.place !== s.to) agg.bridgeVisited++;
      if (t.source.type === 'person' && askedPeople.has(t.source.personId)) agg.bridgePersonAsked++;
    }

    if (s.verb === 'ask' && s.costed) {
      const parsedPerson = view.kase.people.find((p) =>
        s.command.toLowerCase().startsWith(`ask ${p.surname.toLowerCase()} `),
      );
      if (parsedPerson) {
        askedPeople.add(parsedPerson.id);
        const topic = s.command.slice(`ask ${parsedPerson.surname} about `.length);
        const subj = subjectOfTopic(view, topic);
        if (subj) {
          const set = askedSubjects.get(parsedPerson.id) ?? new Set<Id>();
          set.add(subj);
          askedSubjects.set(parsedPerson.id, set);
        }
      }
    }

    // The engine drawing the conclusion for you.
    const scene = kase.act.place;
    const M = kase.act.tick;
    for (const id of s.gained) {
      const c = view.findableById.get(id);
      if (!c) continue;
      const clearing = suspectsOf(kase).some((sp) => sp !== culprit && c.establishes.some((f) => clearsAt(f, sp, scene, M)));
      if (clearing) {
        agg.clearFinds++;
        if (s.thoughts.includes('clears')) {
          agg.clearsThoughtsOnClearFinds++;
          const beat = s.page.beats?.find((b) => b.kind === 'thought' && b.tag === 'clears');
          if (beat?.text)
            example({
              kind: 'engine-clears-for-you',
              config: cfg,
              seed: kase.seed,
              player: run.player,
              page: s.n + 1,
              text: `${c.textRecord ?? c.text}  →  thought: "${beat.text}"`,
            });
        }
      }
    }
    if (culprit && uniqueAt === null && s.unclearedAfter.length === 1 && s.unclearedAfter[0] === culprit) {
      uniqueAt = s.action;
    }
    for (const tag of s.thoughts) {
      if (tag !== 'clears') continue;
      agg.clearsThoughts++;
      if (s.windowAfter > 1) {
        agg.clearsWhileWindowOpen++;
        const beat = s.page.beats?.find((b) => b.kind === 'thought' && b.tag === 'clears');
        if (beat?.text)
          example({
            kind: 'clears-while-the-window-is-open',
            config: cfg,
            seed: kase.seed,
            player: run.player,
            page: s.n + 1,
            text: `${s.windowAfter} half hours still open for the death, and the page says: "${beat.text}"`,
          });
      }
    }
    if (culprit && theoryRight === null && s.theory === culprit) theoryRight = s.action;
    if (culprit && firstContra === null) {
      const claim = view.claimedOf.get(culprit)?.[kase.act.tick] ?? null;
      const hit = s.gained.some((id) =>
        (view.findableById.get(id)?.establishes ?? []).some(
          (f) =>
            (f.kind === 'personNotAt' && f.personId === culprit && f.tick === kase.act.tick && f.place === claim) ||
            (f.kind === 'personAt' && f.personId === culprit && f.tick === kase.act.tick && f.place !== claim),
        ),
      );
      if (hit) firstContra = s.action;
    }

    // Asks that got nothing: what did the witness say?
    if (s.verb === 'ask' && s.costed && s.gained.length === 0 && !s.newAccount && !/about (themselves|himself|herself)$/.test(s.command)) {
      const ex = s.page.beats?.find((b) => b.kind === 'exchange');
      example(
        {
          kind: 'ask-nothing',
          config: cfg,
          seed: kase.seed,
          player: run.player,
          page: s.n + 1,
          text: `"${s.command}" → ${ex?.text ?? pageText(s.page).slice(0, 260)}`,
        },
        8,
      );
    }
  }
  closeVisit();
  // M9: an account is a clue of its own kind now, on the par route; before
  // M9 it was only ever "their evening", which the oracle never asked.
  agg.accountsHeard +=
    run.state.accounts.length +
    run.state.found.filter((id) => view.findableById.get(id)?.kind === 'account' && !run.state.accounts.includes((view.findableById.get(id)?.source as { personId?: Id }).personId ?? '')).length;
  if (!run.steps.some((s) => s.to === view.startId)) agg.neverStart++;
  agg.goActions += run.steps.filter((s) => s.costed && s.verb === 'go').length;
  if (culprit) {
    if (theoryRight !== null) agg.theoryFirstRight.push(theoryRight);
    const last = run.steps[run.steps.length - 1];
    if (last?.theory === culprit) agg.theoryRightAtEnd++;
    if (last?.theory) agg.theoryNamedAtEnd++;
    if (firstContra !== null) agg.firstCulpritContradiction.push(firstContra);
    const pin = minTickPin(kase, run.state.found.map((id) => view.findableById.get(id)).filter((c): c is Clue => c !== undefined));
    if (Number.isFinite(pin)) {
      agg.routePin.push(pin);
      agg.routeDepth.push((pin === 0 ? 0 : pin === 1 ? 1 : 2) + 2);
    }
  }
  if (firstSpine === null) agg.neverSpine++;
  else agg.firstSpine.push(firstSpine);
  if (culprit) {
    agg.whoAsked++;
    if (run.whoCorrect) agg.whoCorrect++;
    if (run.ownFiling?.whoCorrect) agg.ownWhoCorrect++;
    const last = run.steps[run.steps.length - 1];
    if (last && last.unclearedAfter.length === 1 && last.unclearedAfter[0] === culprit) agg.uniqueAtEnd++;
    if (uniqueAt !== null) agg.uniqueAt.push(uniqueAt);
  }
  if (kase.act.unknowns.every((u) => ['who', 'how', 'why', 'when', 'where'].includes(u))) {
    agg.murderRuns++;
    if (run.solved) agg.solvedMurder++;
    if (run.ownFiling?.solved) agg.ownSolvedMurder++;
  }
}

/* ---------------------------------------------- per-case static analysis */

interface CaseAgg {
  cases: number;
  whoCases: number;
  // rule types (a)
  ruleMix: Map<RuleType, number>;
  clues: number;
  // obviousness (b), (c), item 3
  innocents: number;
  innocentsOneClue: number;
  innocentsUnclearable: number;
  directClearers: number[];
  clearedAtStart: number[];
  tickGivenExact: number;
  tickPinClues: number[];
  tickUnpinnable: number;
  killerDirectContradictions: number[];
  killerContradictedAtAll: number;
  clientPointsAtCulprit: number;
  clientCulprit: number;
  minCluesToCulprit: number[];
  inferenceDepth: number[];
  pairRequired: number;
  // leads graph (item 2)
  edges: number;
  edgesTravel: number;
  edgesPersonLinked: number;
  edgesSameTickM: number;
  casesWithCycle: number;
  twoCycles: number;
  outDegree: number[];
  // lies (item 4)
  lieCells: number;
  lieCellsKiller: number;
  lieCellsInnocent: number;
  lieCellsClient: number;
  lieCellsAtM: number;
  lieCellsContradictedFindable: number;
  lieCellsContradictedCandidates: number;
  liarsPerCase: number[];
  killerLieContradicted: number;
  killerLiesTotal: number;
  falseFindableFacts: number;
  findableFacts: number;
  falseCompanions: number;
  companionClaims: number;
  clientTellsFalse: number;
  knowledgeTests: number;
  lieTickOffsets: Map<number, number>;
  contradictingPairs: number;
  caughtAtM: number[];
  culpritOnlyCaughtAtM: number;
  /* --- M9: measured by the solver, on the old cases as on the new ------- */
  /** Innocents one findable clue on its own keeps off the scene at the crime's half hour. */
  solverOneClue: number;
  solverInnocents: number;
  /** The par route's culprit, and its deepest conclusion, in the solver's rounds. */
  parCulpritDepth: number[];
  parDepth: number[];
  /** Cases where some innocent or the half hour needs two or more clues put together. */
  combination: number;
  /** Account spans on the par route, and how many of them are false. */
  parAccountSpans: number;
  parFalseSpans: number;
  /** Par routes that need a hypothesis tested. */
  parHypothesis: number;
  /** The first and second responses when a lie is put to the liar. */
  confrontFirst: { culprit: number; culpritLies: number; innocent: number; innocentLies: number };
}

function newCaseAgg(): CaseAgg {
  return {
    solverOneClue: 0,
    solverInnocents: 0,
    parCulpritDepth: [],
    parDepth: [],
    combination: 0,
    parAccountSpans: 0,
    parFalseSpans: 0,
    parHypothesis: 0,
    confrontFirst: { culprit: 0, culpritLies: 0, innocent: 0, innocentLies: 0 },
    cases: 0,
    whoCases: 0,
    ruleMix: new Map(),
    clues: 0,
    innocents: 0,
    innocentsOneClue: 0,
    innocentsUnclearable: 0,
    directClearers: [],
    clearedAtStart: [],
    tickGivenExact: 0,
    tickPinClues: [],
    tickUnpinnable: 0,
    killerDirectContradictions: [],
    killerContradictedAtAll: 0,
    clientPointsAtCulprit: 0,
    clientCulprit: 0,
    minCluesToCulprit: [],
    inferenceDepth: [],
    pairRequired: 0,
    edges: 0,
    edgesTravel: 0,
    edgesPersonLinked: 0,
    edgesSameTickM: 0,
    casesWithCycle: 0,
    twoCycles: 0,
    outDegree: [],
    lieCells: 0,
    lieCellsKiller: 0,
    lieCellsInnocent: 0,
    lieCellsClient: 0,
    lieCellsAtM: 0,
    lieCellsContradictedFindable: 0,
    lieCellsContradictedCandidates: 0,
    liarsPerCase: [],
    killerLieContradicted: 0,
    killerLiesTotal: 0,
    falseFindableFacts: 0,
    findableFacts: 0,
    falseCompanions: 0,
    companionClaims: 0,
    clientTellsFalse: 0,
    knowledgeTests: 0,
    lieTickOffsets: new Map(),
    contradictingPairs: 0,
    caughtAtM: [],
    culpritOnlyCaughtAtM: 0,
  };
}

function factTrue(kase: Case, f: Fact): boolean | null {
  const truth = (id: Id): (Id | null)[] => kase.schedules.find((s) => s.personId === id)?.truth ?? [];
  switch (f.kind) {
    case 'personAt':
      return truth(f.personId)[f.tick] === f.place;
    case 'personNotAt':
      return truth(f.personId)[f.tick] !== f.place;
    case 'victimAliveAt':
      return kase.act.tick > f.tick;
    case 'victimDeadBy':
      return kase.act.tick <= f.tick;
    case 'timeOfDeath':
      return kase.act.tick >= (f.ticks[0] as Tick) && kase.act.tick <= (f.ticks[f.ticks.length - 1] as Tick);
    default:
      return null;
  }
}

/** Minimum clues (from `pool`) whose time facts, with the givens, pin the death to one tick. */
function minTickPin(kase: Case, pool: Clue[]): number {
  const base = givenFacts(kase);
  if (deathTicks(base).length === 1) return 0;
  const timing = pool.filter((c) =>
    c.establishes.some((f) => f.kind === 'timeOfDeath' || f.kind === 'victimAliveAt' || f.kind === 'victimDeadBy'),
  );
  for (let k = 1; k <= 3; k++) {
    const combos = choose(timing, k);
    for (const combo of combos) {
      const facts = [...base, ...combo.flatMap((c) => c.establishes)];
      if (deathTicks(facts).length === 1) return k;
    }
  }
  return Infinity;
}

function choose<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (xs.length < k) return [];
  const [head, ...rest] = xs as [T, ...T[]];
  return [...choose(rest, k - 1).map((c) => [head, ...c]), ...choose(rest, k)];
}

function tarjanHasCycle(clues: Clue[]): { cycle: boolean; twoCycles: number } {
  const byId = new Map(clues.map((c) => [c.id, c]));
  let index = 0;
  const idx = new Map<Id, number>();
  const low = new Map<Id, number>();
  const onStack = new Set<Id>();
  const stack: Id[] = [];
  let cycle = false;
  const strong = (v: Id): void => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of byId.get(v)?.leadsTo ?? []) {
      if (!byId.has(w)) continue;
      if (!idx.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v) as number, low.get(w) as number));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v) as number, idx.get(w) as number));
    }
    if (low.get(v) === idx.get(v)) {
      let size = 0;
      for (;;) {
        const w = stack.pop() as Id;
        onStack.delete(w);
        size++;
        if (w === v) break;
      }
      if (size > 1) cycle = true;
    }
  };
  for (const c of clues) if (!idx.has(c.id)) strong(c.id);
  let two = 0;
  for (const c of clues)
    for (const t of c.leadsTo) if (byId.get(t)?.leadsTo.includes(c.id) && c.id < t) two++;
  return { cycle, twoCycles: two };
}

function analyseCase(view: CaseView, agg: CaseAgg, cfg: string): void {
  const kase = view.kase;
  const findable = kase.findable;
  const culprit = culpritOf(kase);
  const scene = kase.act.place;
  const M = kase.act.tick;
  agg.cases++;

  // (a) rule types
  for (const c of findable) {
    const rt = ruleType(c);
    agg.ruleMix.set(rt, (agg.ruleMix.get(rt) ?? 0) + 1);
    example({ kind: `rule: ${rt}`, config: cfg, seed: kase.seed, player: 'oracle', page: 0, text: c.textRecord ?? c.text }, 3);
    agg.clues++;
  }

  // truthfulness of every findable fact
  for (const c of findable) {
    for (const f of c.establishes) {
      const t = factTrue(kase, f);
      if (t === null) continue;
      agg.findableFacts++;
      if (!t) agg.falseFindableFacts++;
    }
  }
  // two findable clues that cannot both be true (same person, same tick, two places)
  const at = new Map<string, Set<Id>>();
  for (const c of findable)
    for (const f of c.establishes)
      if (f.kind === 'personAt') {
        const k = `${f.personId}@${f.tick}`;
        const s = at.get(k) ?? new Set<Id>();
        s.add(f.place);
        at.set(k, s);
      }
  for (const s of at.values()) if (s.size > 1) agg.contradictingPairs++;
  for (const f of kase.clientBrief.tells) if (factTrue(kase, f) === false) agg.clientTellsFalse++;
  agg.knowledgeTests += findable.filter((c) => /names the wrong|gets it wrong|wrong man|wrong song|wrong/i.test(c.textRecord ?? c.text) && c.establishes.some((f) => f.kind === 'personNotAt')).length;

  if (culprit) {
    agg.whoCases++;
    const suspects = suspectsOf(kase);
    const innocents = suspects.filter((s) => s !== culprit);
    // 3 / (b): per innocent, clues that clear them at M on their own.
    let oneClueAll = true;
    for (const s of innocents) {
      agg.innocents++;
      const direct = findable.filter((c) => c.establishes.some((f) => clearsAt(f, s, scene, M)));
      agg.directClearers.push(direct.length);
      if (direct.length > 0) agg.innocentsOneClue++;
      else {
        agg.innocentsUnclearable++;
        oneClueAll = false;
      }
    }
    // Cleared by the opening alone (the scene, the coroner, the client, the givens).
    const opening = factsOf(view, kase.starting);
    const clearedOpen = suspects.filter(
      (s) => s !== culprit && !uncleared(kase, opening).includes(s),
    ).length;
    agg.clearedAtStart.push(clearedOpen);
    // Time of death.
    const pin = minTickPin(kase, findable);
    if (pin === 0) agg.tickGivenExact++;
    if (Number.isFinite(pin)) agg.tickPinClues.push(pin);
    else agg.tickUnpinnable++;
    // (c) minimum clues to reach the culprit by elimination, and inference depth.
    if (oneClueAll && Number.isFinite(pin)) {
      // A clue can clear several innocents only if it names several (never, since M2b).
      agg.minCluesToCulprit.push(innocents.length + pin);
      // depth: tick (0 given, 1 one clue, 2 two clues intersected) → clear (tick+1) → culprit (+1)
      const tickDepth = pin === 0 ? 0 : pin === 1 ? 1 : 2;
      agg.inferenceDepth.push(tickDepth + 2);
      if (pin >= 2) agg.pairRequired++;
    }
    // The killer's own account at M, contradicted by one clue.
    const claimed = kase.schedules.find((s) => s.personId === culprit)?.claimed ?? [];
    const claim = claimed[M] ?? null;
    const contra = findable.filter((c) =>
      c.establishes.some(
        (f) =>
          (f.kind === 'personNotAt' && f.personId === culprit && f.tick === M && f.place === claim) ||
          (f.kind === 'personAt' && f.personId === culprit && f.tick === M && f.place !== claim),
      ),
    );
    agg.killerDirectContradictions.push(contra.length);
    // Everybody whose own claim for the crime's half hour a findable clue breaks.
    const caught = suspects.filter((sp) => {
      const cl = kase.schedules.find((x) => x.personId === sp)?.claimed[M] ?? null;
      return findable.some((c) =>
        c.establishes.some(
          (f) =>
            (f.kind === 'personNotAt' && f.personId === sp && f.tick === M && f.place === cl) ||
            (f.kind === 'personAt' && f.personId === sp && f.tick === M && f.place !== cl),
        ),
      );
    });
    agg.caughtAtM.push(caught.length);
    if (caught.length === 1 && caught[0] === culprit) agg.culpritOnlyCaughtAtM++;
    if (contra.length > 0) agg.killerContradictedAtAll++;
    if (kase.clientBrief.points.personId === culprit) agg.clientPointsAtCulprit++;
    if (kase.clientId === culprit) agg.clientCulprit++;
  }

  // leads graph
  const deg: number[] = [];
  for (const c of findable) {
    deg.push(c.leadsTo.length);
    const mentioned = peopleIn(view, c);
    for (const t of c.leadsTo) {
      const target = view.findableById.get(t);
      if (!target) continue;
      agg.edges++;
      if (target.place !== c.place) agg.edgesTravel++;
      const tPeople = new Set<Id>([...subjectsOf(target)]);
      if (target.source.type === 'person') tPeople.add(target.source.personId);
      if ([...tPeople].some((p) => mentioned.has(p) && p !== view.victim.id)) agg.edgesPersonLinked++;
      if (target.establishes.some((f) => 'tick' in f && f.tick === M)) agg.edgesSameTickM++;
    }
  }
  agg.outDegree.push(mean(deg));
  const cyc = tarjanHasCycle(findable);
  if (cyc.cycle) agg.casesWithCycle++;
  agg.twoCycles += cyc.twoCycles;

  // lies
  let liars = 0;
  for (const s of kase.schedules) {
    const person = view.personById.get(s.personId);
    if (!person || person.kind !== 'suspect') continue;
    const lieTicks = s.lies.filter((t) => s.claimed[t] !== s.truth[t] || s.claimedCompanion[t] !== null);
    if (s.lies.length > 0) liars++;
    for (let t = 0; t < TICKS; t++) {
      if (s.claimedCompanion[t]) {
        agg.companionClaims++;
        const comp = s.claimedCompanion[t] as Id;
        const compTruth = kase.schedules.find((x) => x.personId === comp)?.truth[t];
        if (compTruth !== s.truth[t]) agg.falseCompanions++;
      }
    }
    for (const t of lieTicks) {
      if (s.claimed[t] === s.truth[t]) continue;
      agg.lieCells++;
      const off = t - M;
      agg.lieTickOffsets.set(off, (agg.lieTickOffsets.get(off) ?? 0) + 1);
      if (person.isKiller) agg.lieCellsKiller++;
      else agg.lieCellsInnocent++;
      if (person.id === kase.clientId) agg.lieCellsClient++;
      if (t === M) agg.lieCellsAtM++;
      const claim = s.claimed[t];
      const contradicts = (c: Clue): boolean =>
        c.establishes.some(
          (f) =>
            (f.kind === 'personAt' && f.personId === person.id && f.tick === t && f.place !== claim) ||
            (f.kind === 'personNotAt' && f.personId === person.id && f.tick === t && f.place === claim),
        );
      const inFindable = findable.some(contradicts);
      if (inFindable) agg.lieCellsContradictedFindable++;
      if (kase.candidates.some(contradicts)) agg.lieCellsContradictedCandidates++;
      if (person.isKiller) {
        agg.killerLiesTotal++;
        if (inFindable) agg.killerLieContradicted++;
      }
      if (!inFindable)
        example({
          kind: 'uncontradicted-lie',
          config: cfg,
          seed: kase.seed,
          player: 'oracle',
          page: 0,
          text: `${person.surname}${person.isKiller ? ' (culprit)' : ''} claims ${view.placeById.get(claim ?? '')?.shortName ?? 'nowhere'} at tick ${t} (crime tick ${M}); truth ${view.placeById.get(s.truth[t] ?? '')?.shortName}; no findable clue says otherwise`,
        });
    }
  }
  agg.liarsPerCase.push(liars);

  // M9: the solver's reading of the same case. Old cases have no blocks, so
  // travel constrains nothing; everything else reads the same facts.
  if (culprit) {
    const frame = solverFrame(kase);
    const startingClues = kase.starting.map((id) => view.findableById.get(id)).filter((c): c is Clue => !!c);
    const innocents = suspectsOf(kase).filter((s) => s !== culprit);
    const oneClue = new Set<Id>();
    for (const c of findable) {
      if (kase.starting.includes(c.id)) continue;
      const st = solve(solverProblem(frame, [...startingClues, c], false)).state;
      if (st.contradiction) continue;
      for (const s of innocents) if (!placesAt(st, s, M).includes(scene)) oneClue.add(s);
    }
    agg.solverInnocents += innocents.length;
    agg.solverOneClue += oneClue.size;
    const pin = minTickPin(kase, findable);
    if (oneClue.size < innocents.length || pin >= 2) agg.combination++;
    const spine = findable.filter((c) => c.role === 'spine');
    const hyp = kase.logic?.solve.hypothesis ?? false;
    const parState = solve(solverProblem(frame, spine, hyp, kase)).state;
    const who = solverCulprit(parState);
    if (who) agg.parCulpritDepth.push(who.why.depth);
    let deepest = 0;
    for (const w of parState.why) if (w && w.depth > deepest) deepest = w.depth;
    agg.parDepth.push(Math.max(deepest, who?.why.depth ?? 0));
    if (parState.usedProbe) agg.parHypothesis++;
    for (const c of spine) {
      for (const f of c.establishes) {
        if (f.kind !== 'claims') continue;
        agg.parAccountSpans++;
        const truth = kase.schedules.find((s) => s.personId === f.personId)?.truth ?? [];
        if (f.ticks.some((t) => truth[t] !== f.place)) agg.parFalseSpans++;
      }
    }
    for (const k of kase.logic?.confrontations ?? []) {
      const lied = k.responses[0].kind === 'second-lie' ? 1 : 0;
      if (k.personId === culprit) {
        agg.confrontFirst.culprit++;
        agg.confrontFirst.culpritLies += lied;
      } else if (k.lie.cover === 'secret') {
        agg.confrontFirst.innocent++;
        agg.confrontFirst.innocentLies += lied;
      }
    }
  }
}

/* ------------------------------------------------------------------ main */

interface ConfigResult {
  label: string;
  caseAgg: CaseAgg;
  players: Record<PlayerId, PlayerAgg>;
  choiceTally: Map<ChoiceCat, ChoiceTally>;
  par: number[];
  budget: number[];
  oracleUniqueAt: number[];
  oracleActions: number[];
  unknowns: Map<string, number>;
  types: Map<string, number>;
  design: DesignAgg;
}

/* ------------------------------------------------ M9: the design test */

interface DesignSide {
  runs: number;
  who: number;
  deduced: number;
  columnRight: number;
  columnAsked: number;
  actions: number;
  confronts: number;
  confrontsLanded: number;
  /** Calls used, for each run the player solved (who, when and the column right). */
  solvedCalls: number[];
  /** The budget of each case. */
  budgets: number[];
  /** The par of each case (the game's, walked from the first room). */
  pars: number[];
}

interface DesignAgg {
  leads: DesignSide;
  uniform: DesignSide;
  reason: DesignSide;
}

function newSide(): DesignSide {
  return { runs: 0, who: 0, deduced: 0, columnRight: 0, columnAsked: 0, actions: 0, confronts: 0, confrontsLanded: 0, solvedCalls: [], budgets: [], pars: [] };
}

function newDesign(): DesignAgg {
  return { leads: newSide(), uniform: newSide(), reason: newSide() };
}

function tallyDesign(agg: DesignAgg, view: CaseView, runs: { leads: RunRec; uniform: RunRec; reason: RunRec }): void {
  for (const k of ['leads', 'uniform', 'reason'] as const) {
    const r = runs[k];
    const side = agg[k];
    side.runs++;
    if (r.report.killerId === view.kase.solution.killerId) side.who++;
    if (r.deduced) side.deduced++;
    if (r.deduced) side.solvedCalls.push(r.state.actionsUsed);
    side.budgets.push(gameBudget(view.kase));
    side.pars.push(gamePar(view.kase));
    side.columnRight += r.columnRight;
    side.columnAsked += r.columnAsked;
    side.actions += r.state.actionsUsed;
    side.confronts += (r.state.confronts ?? []).length;
    side.confrontsLanded += (r.state.confronts ?? []).filter((c) => c.outcome !== 'wrong').length;
  }
}

/*
 * `--route uniform|leads --seed N --configs LABEL` prints that player's
 * commands for one case, ready for `npm run read -- --seed N ... --route "…"`,
 * so any number in the tables can be read as a transcript.
 */
const ROUTE_OF = arg('route');
if (ROUTE_OF !== undefined) {
  const seed = Number(arg('seed') ?? 1);
  const cfg = CONFIGS[0] as Config;
  const view = buildView(generateCase(seed, cfg.opts));
  const picker = ROUTE_OF === 'leads' ? leadsPicker : ROUTE_OF === 'reason' ? reasonPicker() : uniformPicker;
  const rng = new Rng(
    ROUTE_OF === 'leads'
      ? (seed * 104729 + 7) >>> 0
      : ROUTE_OF === 'reason'
        ? (seed * 15485863 + 3) >>> 0
        : (seed * 7919 + 13) >>> 0,
  );
  const run = drive(view, picker, rng, ROUTE_OF === 'leads' ? 'leads' : ROUTE_OF === 'reason' ? 'reason' : 'uniform');
  process.stdout.write(run.steps.map((s) => s.command).join('; ') + '\n');
  if (argv.includes('--why')) {
    const kase = view.kase;
    const par = new Set(kase.logic?.solve.parRules ?? []);
    const held = new Set(run.state.found);
    process.stdout.write(`par held ${[...par].filter((id) => held.has(id)).length}/${par.size}; missing ${[...par].filter((id) => !held.has(id)).join(' ')}\n`);
    const lf = drive(view, leadsPicker, new Rng((seed * 104729 + 7) >>> 0), 'leads');
    const lheld = new Set(lf.state.found);
    process.stdout.write(`(the marks-follower holds ${[...par].filter((id) => lheld.has(id)).length}/${par.size} of par)\n`);
    process.stdout.write(`filed ${JSON.stringify(run.report)}\ntruth killer ${kase.solution.killerId} tick ${kase.solution.murderTick} column ${JSON.stringify(truthColumn(view))}\n`);
    process.stdout.write(`confessions needed ${JSON.stringify(kase.logic?.solve.confessions)}; confronts ${JSON.stringify(run.state.confronts)}\n`);
  }
  process.exit(0);
}

const DESIGN_ONLY = argv.includes('--design');
// Shorter nights: where the reasoning player's calls go, per config — moves,
// searches, questions for an evening alone, other questions, facts put.
if (argv.includes('--reason-costs')) {
  for (const cfg of CONFIGS) {
    const tally = new Map<string, number>();
    let runs = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, cfg.opts));
      const r = drive(view, reasonPicker(), new Rng((seed * 15485863 + 3) >>> 0), 'reason');
      runs++;
      for (const st of r.steps) {
        const kind = st.command.startsWith('go ')
          ? 'go'
          : st.command.startsWith('examine ')
            ? 'search'
            : st.command.startsWith('put ')
              ? st.costed
                ? 'put (paid)'
                : 'put (free)'
              : / about that evening$/.test(st.command)
                ? 'ask: evening'
                : 'ask: other';
        const key = `${kind}${st.costed || kind === 'put (free)' ? '' : ' [free]'}`;
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
    }
    process.stdout.write(`${cfg.label}: ${[...tally.entries()].sort().map(([k, v]) => `${k} ${(v / runs).toFixed(2)}`).join(' · ')}\n`);
  }
  process.exit(0);
}
if (argv.includes('--reason-debug')) {
  for (const cfg of CONFIGS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const view = buildView(generateCase(seed, cfg.opts));
      const kase = view.kase;
      const r = drive(view, reasonPicker(), new Rng((seed * 15485863 + 3) >>> 0), 'reason');
      const par = kase.logic?.solve.parRules ?? [];
      const held = new Set(r.state.found);
      const need = kase.logic?.solve.confessions ?? [];
      const got = confessedOf(r.state);
      process.stdout.write(
        `${cfg.label} ${seed}: ${r.deduced ? 'OK ' : 'bad'} who ${r.report.killerId === kase.solution.killerId ? 'y' : 'n'} col ${r.columnRight}/${r.columnAsked} par ${par.filter((id) => held.has(id)).length}/${par.length} conf ${need.filter((x) => got.includes(x)).length}/${need.length} acts ${r.state.actionsUsed}/${gameBudget(kase)} settled ${settled(view, r.state) ? 'y' : 'n'}\n`,
      );
    }
  }
  process.exit(0);
}
if (DESIGN_ONLY) {
  const t1 = Date.now();
  const rows: string[][] = [];
  const all: { label: string; design: DesignAgg }[] = [];
  for (const cfg of CONFIGS) {
    const design = newDesign();
    for (let seed = 1; seed <= SEEDS; seed++) {
      let kase: Case;
      try {
        kase = generateCase(seed, cfg.opts);
      } catch (e) {
        process.stderr.write(`${cfg.label} seed ${seed}: ${(e as Error).message}\n`);
        continue;
      }
      const view = buildView(kase);
      const u = drive(view, uniformPicker, new Rng((seed * 7919 + 13) >>> 0), 'uniform');
      const l = drive(view, leadsPicker, new Rng((seed * 104729 + 7) >>> 0), 'leads');
      const r = drive(view, reasonPicker(), new Rng((seed * 15485863 + 3) >>> 0), 'reason');
      tallyDesign(design, view, { leads: l, uniform: u, reason: r });
    }
    all.push({ label: cfg.label, design });
    process.stderr.write(`${cfg.label}: done (${Math.round((Date.now() - t1) / 1000)}s)\n`);
  }
  for (const { label, design } of all) {
    const d = design;
    rows.push([
      label,
      pct(share(d.leads.who, d.leads.runs)),
      `${pct(share(d.reason.deduced, d.reason.runs))} (who ${pct(share(d.reason.who, d.reason.runs))}, column ${pct(share(d.reason.columnRight, d.reason.columnAsked))})`,
      pct(share(d.uniform.who, d.uniform.runs)),
      `${num(d.reason.confronts / Math.max(1, d.reason.runs))} (${pct(share(d.reason.confrontsLanded, d.reason.confronts))} landed)`,
      num(d.reason.actions / Math.max(1, d.reason.runs)),
      `${num(median(d.reason.solvedCalls), 0)} (budget ${num(median(d.reason.budgets), 0)})`,
      `${num(median(d.reason.pars), 0)} / ${num(median(d.reason.budgets), 0)}`,
    ]);
  }
  const lines: string[] = [];
  lines.push(`## The design test (${SEEDS} seeds a config)`);
  lines.push('');
  lines.push('| config | marks-follower names the culprit | reasoning player: who, when and the column all right, within budget | button-pusher names the culprit | reasoning player: facts put to somebody / run | reasoning player: actions | reasoning player: median calls to solve | median par / budget |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) lines.push(`| ${r.join(' | ')} |`);
  lines.push('');
  lines.push('Target: the marks-follower at 50% or under while the reasoning player is at 80% or over, per tier.');
  process.stdout.write(lines.join('\n') + '\n');
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ seeds: SEEDS, design: all }, null, 2));
  process.exit(0);
}

const results: ConfigResult[] = [];
const t0 = Date.now();
for (const cfg of CONFIGS) {
  const res: ConfigResult = {
    label: cfg.label,
    caseAgg: newCaseAgg(),
    players: { oracle: newAgg(), wander: newAgg(), uniform: newAgg(), leads: newAgg(), reason: newAgg() },
    design: newDesign(),
    choiceTally: new Map(),
    par: [],
    budget: [],
    oracleUniqueAt: [],
    oracleActions: [],
    unknowns: new Map(),
    types: new Map(),
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    let kase: Case;
    try {
      kase = generateCase(seed, cfg.opts);
    } catch (e) {
      process.stderr.write(`${cfg.label} seed ${seed}: ${(e as Error).message}\n`);
      continue;
    }
    const view = buildView(kase);
    res.par.push(gamePar(kase));
    res.budget.push(gameBudget(kase));
    const uk = kase.act.unknowns.join('+');
    res.unknowns.set(uk, (res.unknowns.get(uk) ?? 0) + 1);
    res.types.set(kase.act.tropeId, (res.types.get(kase.act.tropeId) ?? 0) + 1);
    analyseCase(view, res.caseAgg, cfg.label);

    // oracle
    const oracle = playOracle(view);
    const oracleRun = drive(view, scripted(oracle.steps.map((s) => s.command)), new Rng(1), 'oracle');
    analyseRun(view, oracleRun, res.players.oracle, cfg.label);
    res.oracleActions.push(oracleRun.steps.filter((s) => s.costed).length);

    // wanderer: replay its commands, and score its own filing too
    const w = playWandering(view, seed);
    const wanderRun = drive(view, scripted(w.steps.map((s) => s.command)), new Rng(1), 'wander');
    wanderRun.ownFiling = score(view, w.state, w.report);
    analyseRun(view, wanderRun, res.players.wander, cfg.label);

    // button-pushers
    const u = drive(view, uniformPicker, new Rng((seed * 7919 + 13) >>> 0), 'uniform');
    analyseRun(view, u, res.players.uniform, cfg.label);
    // choice usefulness, over every page the button-pusher stood on
    {
      let st = newRun(view, { detectiveName: 'Dashiell' });
      classifyChoices(view, st, res.choiceTally);
      for (const s of u.steps) {
        st = stepInput(st, s.command, view).state;
        for (let more = continuationOf(view, st); more !== null; more = continuationOf(view, st)) {
          const next = stepInput(st, more, view);
          if (next.page.found.length === 0) break;
          st = next.state;
        }
        if (!st.reportOpen) classifyChoices(view, st, res.choiceTally);
      }
    }
    const l = drive(view, leadsPicker, new Rng((seed * 104729 + 7) >>> 0), 'leads');
    analyseRun(view, l, res.players.leads, cfg.label);
    const r = drive(view, reasonPicker(), new Rng((seed * 15485863 + 3) >>> 0), 'reason');
    analyseRun(view, r, res.players.reason, cfg.label);
    tallyDesign(res.design, view, { leads: l, uniform: u, reason: r });
  }
  results.push(res);
  process.stderr.write(`${cfg.label}: done (${Math.round((Date.now() - t0) / 1000)}s)\n`);
}

/* ---------------------------------------------------------------- output */

const out: string[] = [];
const table = (head: string[], rows: string[][]): void => {
  out.push(`| ${head.join(' | ')} |`);
  out.push(`| ${head.map(() => '---').join(' | ')} |`);
  for (const r of rows) out.push(`| ${r.join(' | ')} |`);
  out.push('');
};

out.push(`# diagnose-play — seeds 1–${SEEDS}`);
out.push('');
out.push('## Configs');
out.push('');
table(
  ['config', 'par (median)', 'budget (median)', 'slack', 'report asks (top)', 'tropes'],
  results.map((r) => [
    r.label,
    num(median(r.par), 0),
    num(median(r.budget), 0),
    num(median(r.budget.map((b, i) => b - (r.par[i] as number))), 0),
    [...r.unknowns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(', '),
    [...r.types.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '),
  ]),
);

out.push('## 1. What each costed action gets');
out.push('');
for (const p of PLAYERS) {
  out.push(`### ${p}`);
  out.push('');
  table(
    ['config', 'actions/run', 'no clue', 'account only', 'noise only', 'corrob. only', 'has spine', '1st spine at (mean)', 'never spine', 'travel share', 'never reached the scene', 'who right', 'solved (who/how/why/when/where cases)', 'own filing who / solved', 'culprit unique at end'],
    results.map((r) => {
      const a = r.players[p];
      return [
        r.label,
        num(a.actions / a.runs),
        pct(share(a.noClue, a.actions)),
        pct(share(a.accountOnly, a.actions)),
        pct(share(a.noiseOnly, a.actions)),
        pct(share(a.corrobOnly, a.actions)),
        pct(share(a.withSpine, a.actions)),
        num(mean(a.firstSpine)),
        pct(share(a.neverSpine, a.runs)),
        pct(share(a.goActions, a.actions)),
        pct(share(a.neverStart, a.runs)),
        pct(share(a.whoCorrect, a.whoAsked)),
        pct(share(a.solvedMurder, a.murderRuns)),
        p === 'wander' ? `${pct(share(a.ownWhoCorrect, a.whoAsked))} / ${pct(share(a.ownSolvedMurder, a.murderRuns))}` : '',
        pct(share(a.uniqueAtEnd, a.whoAsked)),
      ];
    }),
  );
}

out.push('## 2. Loops');
out.push('');
out.push('### Where newly opened leads send you, and returns');
out.push('');
for (const p of PLAYERS) {
  out.push(`#### ${p}`);
  out.push('');
  table(
    ['config', 'leads opened/run', 'here', 'the room just left', 'another room already visited', 'a person already questioned', 'same person, same subject again', 'bridges', 'bridge → room just left', 'bridge → visited room', 'bridge → person already questioned', 'moves/run', 'returns', 'empty returns', 'A→B→A'],
    results.map((r) => {
      const a = r.players[p];
      return [
        r.label,
        num(a.opened / a.runs),
        pct(share(a.openedHere, a.opened)),
        pct(share(a.openedJustLeft, a.opened)),
        pct(share(a.openedVisitedElsewhere, a.opened)),
        pct(share(a.openedPersonAsked, a.opened)),
        pct(share(a.openedSameQuestionSubject, a.opened)),
        num(a.bridges / a.runs),
        pct(share(a.bridgeJustLeft, a.bridges)),
        pct(share(a.bridgeVisited, a.bridges)),
        pct(share(a.bridgePersonAsked, a.bridges)),
        num(a.moves / a.runs),
        num(a.returns / a.runs),
        pct(share(a.emptyReturns, a.returns)),
        num(a.pingPong / a.runs),
      ];
    }),
  );
}
out.push('### Open leads and marked choices per page');
out.push('');
for (const p of ['uniform', 'leads', 'wander'] as PlayerId[]) {
  out.push(`#### ${p}`);
  out.push('');
  table(
    ['config', 'open leads (mean)', 'pages with 0 open', 'pages with ≥5 open', 'max', 'marked choices on page (mean)', 'pages with 0 marked', 'choices on page (mean)'],
    results.map((r) => {
      const a = r.players[p];
      return [
        r.label,
        num(mean(a.openThreadSamples)),
        pct(share(a.openThreadSamples.filter((x) => x === 0).length, a.openThreadSamples.length)),
        pct(share(a.openThreadSamples.filter((x) => x >= 5).length, a.openThreadSamples.length)),
        String(Math.max(...a.openThreadSamples)),
        num(mean(a.markedOfferedSamples)),
        pct(share(a.zeroMarkedPages, a.pages)),
        num(mean(a.offeredSamples)),
      ];
    }),
  );
}
out.push('### The lead graph (`leadsTo`)');
out.push('');
table(
  ['config', 'edges/case', 'out-degree', 'edge needs travel', 'target shares a person with source', 'target is about the crime tick', 'cases with a cycle', '2-cycles/case'],
  results.map((r) => {
    const c = r.caseAgg;
    return [
      r.label,
      num(c.edges / c.cases),
      num(mean(c.outDegree), 2),
      pct(share(c.edgesTravel, c.edges)),
      pct(share(c.edgesPersonLinked, c.edges)),
      pct(share(c.edgesSameTickM, c.edges)),
      pct(share(c.casesWithCycle, c.cases)),
      num(c.twoCycles / c.cases, 2),
    ];
  }),
);

out.push('## 3. Obviousness');
out.push('');
table(
  ['config', 'innocents', 'cleared by ONE clue', 'not clearable', 'clearing clues per innocent', 'innocents cleared by the opening', 'time of death given exactly', 'clues to pin the tick (mean)', 'min clues to culprit (mean)', 'inference depth (mean)', 'cases needing a 2-clue combination', 'oracle: culprit alone at action (mean) / oracle actions', 'client points at culprit', 'culprit contradicted by one clue'],
  results.map((r) => {
    const c = r.caseAgg;
    const o = r.players.oracle;
    return [
      r.label,
      num(c.innocents / c.whoCases),
      pct(share(c.innocentsOneClue, c.innocents)),
      pct(share(c.innocentsUnclearable, c.innocents)),
      num(mean(c.directClearers)),
      num(mean(c.clearedAtStart)),
      pct(share(c.tickGivenExact, c.whoCases)),
      num(mean(c.tickPinClues)),
      num(mean(c.minCluesToCulprit)),
      num(mean(c.inferenceDepth)),
      pct(share(c.pairRequired, c.whoCases)),
      `${num(mean(o.uniqueAt))} / ${num(mean(r.oracleActions))} (${pct(share(o.uniqueAt.length, o.whoAsked))} reach it)`,
      pct(share(c.clientPointsAtCulprit, c.whoCases)),
      pct(share(c.killerContradictedAtAll, c.whoCases)),
    ];
  }),
);
out.push('### Who else is caught lying at the crime half hour');
out.push('');
table(
  ['config', 'suspects whose crime-tick claim a findable clue breaks (mean)', 'culprit is the only one'],
  results.map((r) => [r.label, num(mean(r.caseAgg.caughtAtM)), pct(share(r.caseAgg.culpritOnlyCaughtAtM, r.caseAgg.whoCases))]),
);
out.push('### The route, the monologue and the lies you hear');
out.push('');
table(
  ['config', 'player', 'route: clues to pin tick', 'route: inference depth', '1st clue breaking culprit alibi (action)', 'monologue first names culprit (action)', 'monologue names culprit at end', 'evening accounts heard/run'],
  results.flatMap((r) =>
    PLAYERS.map((p) => {
      const a = r.players[p];
      return [
        r.label,
        p,
        num(mean(a.routePin)),
        num(mean(a.routeDepth)),
        `${num(mean(a.firstCulpritContradiction))} (${pct(share(a.firstCulpritContradiction.length, a.whoAsked))})`,
        `${num(mean(a.theoryFirstRight))} (${pct(share(a.theoryFirstRight.length, a.whoAsked))})`,
        pct(share(a.theoryRightAtEnd, a.whoAsked)),
        num(a.accountsHeard / a.runs),
      ];
    }),
  ),
);
out.push('### The engine states the conclusion');
out.push('');
table(
  ['config', 'player', 'finds that clear an innocent', 'with a `clears` thought on the page', '`clears` thoughts written while >1 half hour is still open for the death'],
  results.flatMap((r) =>
    (['oracle', 'uniform'] as PlayerId[]).map((p) => [
      r.label,
      p,
      String(r.players[p].clearFinds),
      pct(share(r.players[p].clearsThoughtsOnClearFinds, r.players[p].clearFinds)),
      pct(share(r.players[p].clearsWhileWindowOpen, r.players[p].clearsThoughts)),
    ]),
  ),
);
out.push('### Logic-game rule types of the findable clues');
out.push('');
const RULES: RuleType[] = ['fixed placement', 'negative placement', 'together/apart', 'relative/sequence', 'conditional', 'numerical/absence', 'identity/attribute', 'time window', 'context (no fact)'];
table(
  ['config', ...RULES],
  results.map((r) => [r.label, ...RULES.map((k) => pct(share(r.caseAgg.ruleMix.get(k) ?? 0, r.caseAgg.clues)))]),
);

out.push('## 4. Lies');
out.push('');
table(
  ['config', 'liars/case', 'lie cells/case', 'culprit', 'innocent', 'client', 'at the crime tick', 'contradicted by a findable clue', 'by any candidate', 'culprit lies contradicted', 'false findable facts', 'findable personAt clashes', 'false companions / claims', 'client tells false'],
  results.map((r) => {
    const c = r.caseAgg;
    return [
      r.label,
      num(mean(c.liarsPerCase)),
      num(c.lieCells / c.cases),
      num(c.lieCellsKiller / c.cases),
      num(c.lieCellsInnocent / c.cases),
      num(c.lieCellsClient / c.cases),
      pct(share(c.lieCellsAtM, c.lieCells)),
      pct(share(c.lieCellsContradictedFindable, c.lieCells)),
      pct(share(c.lieCellsContradictedCandidates, c.lieCells)),
      pct(share(c.killerLieContradicted, c.killerLiesTotal)),
      `${c.falseFindableFacts} of ${c.findableFacts}`,
      String(c.contradictingPairs),
      `${c.falseCompanions} / ${c.companionClaims}`,
      String(c.clientTellsFalse),
    ];
  }),
);
out.push('Lie cells by offset from the crime tick (all configs):');
out.push('');
{
  const all = new Map<number, number>();
  for (const r of results) for (const [k, v] of r.caseAgg.lieTickOffsets) all.set(k, (all.get(k) ?? 0) + v);
  const total = [...all.values()].reduce((a, b) => a + b, 0);
  table(
    ['offset', ...[...all.keys()].sort((a, b) => a - b).map(String)],
    [['share', ...[...all.keys()].sort((a, b) => a - b).map((k) => pct(share(all.get(k) as number, total)))]],
  );
}

out.push('## 5. Choices that never pay');
out.push('');
out.push('Every costed, not-done choice offered on every page the button-pusher stood on.');
out.push('');
const CATS: ChoiceCat[] = ['lead (exact topic)', 'ask: evening', 'ask: themselves', 'ask: why hired', 'ask: a person', 'ask: a place', 'ask: a thing', 'ask: anchor', 'search: room', 'search: a thing', 'go'];
{
  const all = new Map<ChoiceCat, ChoiceTally>();
  for (const r of results)
    for (const [k, v] of r.choiceTally) {
      const row = all.get(k) ?? { offered: 0, yieldsNow: 0, everYields: 0 };
      row.offered += v.offered;
      row.yieldsNow += v.yieldsNow;
      row.everYields += v.everYields;
      all.set(k, row);
    }
  const total = [...all.values()].reduce((a, b) => a + b.offered, 0);
  table(
    ['choice', 'share of offered', 'yields a clue now', 'could ever yield a clue'],
    CATS.filter((k) => all.has(k)).map((k) => {
      const v = all.get(k) as ChoiceTally;
      return [k, pct(share(v.offered, total)), pct(share(v.yieldsNow, v.offered)), k === 'go' ? '(marked)' : pct(share(v.everYields, v.offered))];
    }),
  );
  table(
    ['config', 'ask a person/place/thing: yields now', '… could ever yield'],
    results.map((r) => {
      const rows = (['ask: a person', 'ask: a place', 'ask: a thing'] as ChoiceCat[]).map((k) => r.choiceTally.get(k) ?? { offered: 0, yieldsNow: 0, everYields: 0 });
      const off = rows.reduce((a, b) => a + b.offered, 0);
      return [r.label, pct(share(rows.reduce((a, b) => a + b.yieldsNow, 0), off)), pct(share(rows.reduce((a, b) => a + b.everYields, 0), off))];
    }),
  );
}

/*
 * M9 (docs/20-m9-deduction.md, "Targets"). Every row is measured the same way
 * on a case from before M9 as on one after; where the diagnosis's own
 * definition and the solver's differ, both are printed, the diagnosis's first.
 */
out.push('## Targets (docs/20-m9-deduction.md)');
out.push('');
{
  const suspectsPer = (r: ConfigResult): number => r.caseAgg.innocents / Math.max(1, r.caseAgg.whoCases) + 1;
  const rows: [string, (r: ConfigResult) => string, string][] = [
    [
      'innocents cleared by one clue (diagnosis facts / solver)',
      (r) => `${pct(share(r.caseAgg.innocentsOneClue, r.caseAgg.innocents))} / ${pct(share(r.caseAgg.solverOneClue, r.caseAgg.solverInnocents))}`,
      '≤30%',
    ],
    [
      'inference depth of the par route (diagnosis formula / solver)',
      (r) => `${num(mean(r.players.oracle.routeDepth))} / ${num(mean(r.caseAgg.parCulpritDepth))}`,
      '≥4',
    ],
    [
      'cases that need a two-clue combination',
      (r) => pct(share(r.caseAgg.combination, r.caseAgg.whoCases)),
      '100%',
    ],
    [
      'false statements among self-accounts on the par route',
      (r) => `${pct(share(r.caseAgg.parFalseSpans, r.caseAgg.parAccountSpans))} (${r.caseAgg.parFalseSpans}/${r.caseAgg.parAccountSpans} spans)`,
      '20–30%',
    ],
    ['evening accounts on the oracle’s route', (r) => num(r.players.oracle.accountsHeard / r.players.oracle.runs), '≥2'],
    [
      '"ask about a person" that can pay (any clue / a grid fact)',
      (r) => {
        const t = r.choiceTally.get('ask: a person') ?? { offered: 0, yieldsNow: 0, everYields: 0, everFact: 0 };
        return `${pct(share(t.everYields, t.offered))} / ${pct(share(t.everFact ?? 0, t.offered))}`;
      },
      '≥60%',
    ],
    ['lead edges sharing a person with their source', (r) => pct(share(r.caseAgg.edgesPersonLinked, r.caseAgg.edges)), '≥80%'],
    ['button-pusher actions with no clue', (r) => pct(share(r.players.uniform.noClue, r.players.uniform.actions)), '≤40%'],
    ['a player who only follows the marks names the culprit', (r) => pct(share(r.players.leads.whoCorrect, r.players.leads.whoAsked)), '≤50%'],
    [
      'the client points at the culprit (1 / suspects)',
      (r) => `${pct(share(r.caseAgg.clientPointsAtCulprit, r.caseAgg.whoCases))} (${pct(1 / suspectsPer(r))})`,
      '≤ 1 / suspects',
    ],
    [
      'pages with 5 or more open leads (wanderer / lead-follower)',
      (r) =>
        `${pct(share(r.players.wander.openThreadSamples.filter((x) => x >= 5).length, r.players.wander.openThreadSamples.length))} / ${pct(share(r.players.leads.openThreadSamples.filter((x) => x >= 5).length, r.players.leads.openThreadSamples.length))}`,
      '≤10%',
    ],
    ['par routes that need a hypothesis tested', (r) => pct(share(r.caseAgg.parHypothesis, r.caseAgg.whoCases)), 'Hard-boiled: 100%'],
    [
      'first confrontation brings a second lie (culprit / innocents)',
      (r) => {
        const k = r.caseAgg.confrontFirst;
        return `${pct(share(k.culpritLies, k.culprit))} / ${pct(share(k.innocentLies, k.innocent))}`;
      },
      'within 10 points',
    ],
  ];
  table(
    ['measure', ...results.map((r) => r.label), 'target'],
    rows.map(([label, f, target]) => [label, ...results.map(f), target]),
  );
}

out.push('## The design test');
out.push('');
table(
  ['config', 'marks-follower names the culprit', 'reasoning player: who, when, column all right', 'button-pusher names the culprit'],
  results.map((r) => [
    r.label,
    pct(share(r.design.leads.who, r.design.leads.runs)),
    `${pct(share(r.design.reason.deduced, r.design.reason.runs))} (who ${pct(share(r.design.reason.who, r.design.reason.runs))})`,
    pct(share(r.design.uniform.who, r.design.uniform.runs)),
  ]),
);
out.push('');

out.push('## Examples');
out.push('');
for (const kind of [...new Set(examples.map((e) => e.kind))]) {
  out.push(`### ${kind}`);
  out.push('');
  for (const e of examples.filter((x) => x.kind === kind)) {
    out.push(`- ${e.config} seed ${e.seed}, ${e.player}${e.page ? `, page ${e.page}` : ''}: ${e.text}`);
  }
  out.push('');
}

process.stdout.write(out.join('\n') + '\n');
if (JSON_OUT) {
  const plain = results.map((r) => ({
    label: r.label,
    caseAgg: { ...r.caseAgg, ruleMix: Object.fromEntries(r.caseAgg.ruleMix), lieTickOffsets: Object.fromEntries(r.caseAgg.lieTickOffsets) },
    players: Object.fromEntries(
      Object.entries(r.players).map(([k, v]) => [k, { ...v, openThreadSamples: undefined, markedOfferedSamples: undefined, offeredSamples: undefined }]),
    ),
    choiceTally: Object.fromEntries(r.choiceTally),
  }));
  writeFileSync(JSON_OUT, JSON.stringify({ seeds: SEEDS, results: plain, examples }, null, 2));
}
