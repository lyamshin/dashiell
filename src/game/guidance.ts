/**
 * docs/39 — guidance: making the way in visible.
 *
 * Three blind playtesters solved their cases, used every call doing it, and
 * called the game "opaque more than hard". This is the help the designer
 * approved, all of it read from the notebook and (in v2) the deduction graph,
 * never from the truth:
 *
 * - **Confront help, by tier (§1).** At Raw and Coddled a fact in hand that
 *   really breaks somebody's own account is offered ready-made, the fact
 *   named ("Put it to Rafferty: Tillman says you weren't at the Garibaldi at
 *   half past eight."): `readyConfronts`. From Poached up the picker opens on
 *   the facts about that person at the half hours their account covers, and
 *   nothing is marked as the one that breaks it: `pickerFocus`.
 * - **Stars follow the deduction (§2).** In v2 a star marks a choice that
 *   brings a fact an open step of the graph rests on, at most three a page,
 *   nearest the bottleneck first (`graphStars`). The client's pointer is
 *   never starred for being the client's; v1 keeps its leads without it
 *   (`clientPointerOnly`).
 * - **The grid shows what should jump out (§3):** `softMarks`, "? not seen by
 *   Abramowitz" and "counted 1, 3 claim it".
 * - **Teach once (§5):** `TEACH_LINES`, `teachOn`.
 *
 * Pure.
 */

import { contradicts, crimeTicks, culpritOf, placesAt, whyNot } from '../gen/index.js';
import type { Clue, Fact, Id, Person, Tick } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { peopleHereNow } from './derive.js';
import {
  canConfront,
  confessedOf,
  confrontFacts,
  confrontOn,
  displayName,
  judgeConfront,
  lieKeyOf,
  nameKnown,
  solveNotebook,
  partRef,
  partsOf,
  tierNumber,
} from './m9.js';
import type { Profile, TierKey } from './profile.js';
import { followUpOf } from './reducer.js';
import { pronounOf } from './voice/cast.js';
import type { RunState } from './types.js';

/* ------------------------------------------------------------------ *
 * Small helpers.
 * ------------------------------------------------------------------ */

/** docs/40: moved to m9, where the held line reads them too. */
export { claimedNow, spokenWhen, ticksOfFact } from './m9.js';
import { claimedNow, spokenWhen, ticksOfFact } from './m9.js';

/* ------------------------------------------------------------------ *
 * §1. Confront help at Raw and Coddled: the ready-made confrontation.
 * ------------------------------------------------------------------ */

export interface ReadyConfront {
  personId: Id;
  clueId: Id;
  part: number;
  /** "Put it to Rafferty: Tillman says you weren't at the Garibaldi at half past eight." */
  label: string;
  /** The command it issues. */
  command: string;
  /** The second fact of a confrontation that just landed: free. */
  follow: boolean;
}

/** Ready-made confrontations are offered at Raw and Coddled only. */
export function readyOn(view: CaseView): boolean {
  const t = tierNumber(view);
  return t !== null && t <= 1 && view.kase.logic !== undefined && confrontOn(view);
}

/** Who said it, the way the ready-made label names them. */
function sourceName(view: CaseView, state: RunState, clue: Clue): string {
  if (clue.source.type === 'person') return displayName(view, state, clue.source.personId);
  if (clue.kind === 'morgue') return 'the coroner';
  return 'the room';
}

function placeName(view: CaseView, id: Id): string {
  return view.placeById.get(id)?.shortName ?? id;
}

/**
 * The fact, said to the one it is put to: "Tillman says you weren't at the
 * Garibaldi at half past eight". Only the part that is read to them, and only
 * the half hours of it their story covers where it names them.
 */
export function readySentence(
  view: CaseView,
  state: RunState,
  person: Person,
  clue: Clue,
  part: number,
  claim: { place: Id; ticks: Tick[] } | undefined,
): string {
  const who = sourceName(view, state, clue);
  const says = who === 'the room' ? 'The room shows' : `${who} says`;
  const parts = partsOf(clue);
  const facts = (parts[part]?.facts ?? []).map((k) => clue.establishes[k]).filter((f): f is Fact => f !== undefined);
  const inClaim = (ts: readonly Tick[]): Tick[] => {
    const hit = claim ? ts.filter((t) => claim.ticks.includes(t)) : [];
    return hit.length > 0 ? hit : [...ts];
  };
  const nameList = (ids: Id[]): string => {
    const names = ids.map((id) => (id === person.id ? 'you' : displayName(view, state, id)));
    return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  };
  const mine = (f: Fact): boolean => ('personId' in f && f.personId === person.id);
  // The fact about them first, then one about the place they said.
  const ordered = [...facts.filter(mine), ...facts.filter((f) => !mine(f))];
  for (const f of ordered) {
    switch (f.kind) {
      case 'personNotAt':
        if (f.personId !== person.id) break;
        return `${says} you weren’t at ${placeName(view, f.place)} ${spokenWhen(inClaim(facts.filter((g) => g.kind === 'personNotAt' && g.personId === person.id && g.place === f.place).map((g) => (g as { tick: Tick }).tick)))}`;
      case 'personAt': {
        // docs/40: somebody else seen, said with their name (the fallback
        // below read "Abramowitz: the Garibaldi, 8:00", and lost whom).
        const at = facts.filter((g) => g.kind === 'personAt' && g.personId === f.personId && g.place === f.place).map((g) => (g as { tick: Tick }).tick);
        if (f.personId !== person.id) {
          if (ordered.some((g) => mine(g))) break;
          return `${who === 'the room' ? `The room puts ${nameList([f.personId])}` : `${who} saw ${nameList([f.personId])}`} at ${placeName(view, f.place)} ${spokenWhen(at)}`;
        }
        return `${who === 'the room' ? 'The room puts you' : `${who} saw you`} at ${placeName(view, f.place)} ${spokenWhen(inClaim(at))}`;
      }
      case 'absentFrom': {
        const others = f.except.slice(1);
        const when = spokenWhen(inClaim(f.ticks));
        return others.length === 0
          ? `${says} nobody was at ${placeName(view, f.place)} ${when}`
          : `${says} nobody but ${nameList(others)} was at ${placeName(view, f.place)} ${when}`;
      }
      case 'countAt': {
        const n = ['nobody', 'one', 'two', 'three', 'four', 'five', 'six'][f.count] ?? String(f.count);
        return `${who} counted ${n} at ${placeName(view, f.place)} ${spokenWhen([f.tick])}, besides the one who works there`;
      }
      case 'together':
      case 'apart': {
        const [a, b] = f.personIds;
        return f.kind === 'together'
          ? `${says} ${nameList([a])} and ${nameList([b])} were together ${spokenWhen(inClaim(f.ticks))}`
          : `${says} ${nameList([a])} and ${nameList([b])} were never in the same place ${spokenWhen(inClaim(f.ticks))}`;
      }
      default:
        break;
    }
  }
  // Anything else: the line as the notebook has it.
  const text = parts[part]?.text ?? clue.rule ?? clue.text;
  return `${who === 'the room' ? 'The room' : who}: ${text.replace(/^[^:]+:\s*/, '')}`;
}

/**
 * At Raw and Coddled, for each person in the room whose own account is
 * written down: the fact in hand, one part of it, that truly breaks it — the
 * same judgement the reducer makes when the fact is put (`judgeConfront`),
 * so a ready-made confrontation always lands. One a person; a fact behind a
 * grid mark first, so the mark and the button agree.
 */
export function readyConfronts(view: CaseView, state: RunState, prefer: ReadonlySet<Id> = new Set()): ReadyConfront[] {
  if (!readyOn(view)) return [];
  const logic = view.kase.logic;
  if (!logic) return [];
  const here = peopleHereNow(view, state.at, { clientInOffice: state.clientInOffice, found: state.found });
  const follow = followUpOf(view, state);
  const held = new Set(state.found);
  const confessed = confessedOf(state);
  const out: ReadyConfront[] = [];
  for (const person of here) {
    if (!canConfront(view, state, person.id)) continue;
    const mine = logic.confrontations.filter((c) => c.personId === person.id);
    if (mine.length === 0) continue;
    // Candidates, cheaply: the written-out ways of breaking each lie that are
    // in hand, what contradicts a second story, and what the solver says
    // breaks the claim. The judgement below is the last word.
    const candidates = new Set<Id>();
    for (const c of mine) {
      for (const g of c.contradictions) for (const id of g) if (held.has(id)) candidates.add(id);
      for (const r of c.responses) for (const id of r.contradictedBy ?? []) if (held.has(id)) candidates.add(id);
      const claims = [{ place: c.lie.claimed, ticks: c.lie.ticks }, ...c.responses.flatMap((r) => (r.claims ? [{ place: r.claims.place, ticks: r.claims.ticks }] : []))];
      for (const claim of claims) {
        for (const soft of [true, false]) {
          const res = contradicts(view.kase, [...state.found], { personId: person.id, ...claim }, { confessed: [...confessed], soft, pairs: true });
          if (res.yes) for (const id of res.rules) if (held.has(id)) candidates.add(id);
        }
      }
    }
    const facts = confrontFacts(view, state, person.id).filter((c) => candidates.has(c.id));
    facts.sort((a, b) => Number(prefer.has(b.id)) - Number(prefer.has(a.id)));
    const followHere = follow?.personId === person.id;
    let found: ReadyConfront | null = null;
    for (const clue of facts) {
      const n = partsOf(clue).length;
      for (let part = 0; part < n; part++) {
        const judged = judgeConfront(view, state, person.id, clue.id, part, followHere && follow ? { lieKey: follow.lieKey } : {});
        if (judged.outcome === 'wrong') continue;
        const sentence = readySentence(view, state, person, clue, part, judged.claimed);
        const name = displayName(view, state, person.id);
        found = {
          personId: person.id,
          clueId: clue.id,
          part,
          label: `Put it to ${name}: ${sentence.replace(/[.\s]+$/, '')}.`,
          command: `put ${partRef(clue.id, part)} to ${person.surname}`,
          follow: followHere,
        };
        break;
      }
      if (found) break;
    }
    if (found) out.push(found);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * §1. From Poached up: the picker's first view.
 * ------------------------------------------------------------------ */

export interface FocusInfo {
  /** The first of their claimed half hours the fact touches. */
  tick: Tick;
  /** "8:30 · she says the Garibaldi" */
  section: string;
}

/** The picker opens on the focused view from Poached up. */
export function focusOn(view: CaseView): boolean {
  const t = tierNumber(view);
  return t !== null && t >= 2 && view.kase.logic !== undefined;
}

function hm(t: Tick): string {
  const h = 6 + Math.floor(t / 2);
  return `${h}:${t % 2 === 0 ? '00' : '30'}`;
}

/**
 * Is this part of a clue a fact about `personId` at a half hour their own
 * account covers — about them, about the room they said, or placing somebody
 * they said they were with? Null when it is not. Nothing here says whether
 * it breaks anything.
 */
export function pickerFocus(
  view: CaseView,
  state: RunState,
  person: Person,
  clue: Clue,
  part: number,
  claimed: Map<Tick, { place: Id; with?: Id }> = claimedNow(view, state, person.id),
): FocusInfo | null {
  if (claimed.size === 0) return null;
  const facts = (partsOf(clue)[part]?.facts ?? []).map((k) => clue.establishes[k]).filter((f): f is Fact => f !== undefined);
  let best: Tick | null = null;
  const take = (t: Tick): void => {
    if (best === null || t < best) best = t;
  };
  for (const f of facts) {
    for (const t of ticksOfFact(f)) {
      const c = claimed.get(t);
      if (!c) continue;
      const about = ('personId' in f && f.personId === person.id) || ('personIds' in f && (f.personIds as Id[]).includes(person.id));
      const atPlace = 'place' in f && (f as { place: Id }).place === c.place;
      const companion =
        c.with !== undefined &&
        (('personId' in f && f.personId === c.with) || ('personIds' in f && (f.personIds as Id[]).includes(c.with)));
      if (about || atPlace || companion) take(t);
    }
  }
  if (best === null) return null;
  const t: Tick = best;
  const c = claimed.get(t) as { place: Id; with?: Id };
  const she = pronounOf(person) === 'she';
  const withWho = c.with ? `, with ${displayName(view, state, c.with)}` : '';
  return { tick: t, section: `${hm(t)} · ${she ? 'she' : 'he'} says ${placeName(view, c.place)}${withWho}` };
}

/* ------------------------------------------------------------------ *
 * §2. Stars follow the deduction.
 * ------------------------------------------------------------------ */

/** One choice the star pass weighs. */
export interface StarCandidate {
  command: string;
  /** What it would bring, if taken now (for a walk, what is to be had there). */
  gains: readonly Id[];
  go: boolean;
  /** "Ask X about that evening": the one that takes an account by name. */
  evening: boolean;
  /** "Ask <watcher> about <this place>", on the first visit. */
  watcherFirst: boolean;
  done: boolean;
}

/** At most this many stars on a page. */
export const STAR_LIMIT = 3;

/** What an open fact serves: the step (or a rival's route) it is ranked by. */
export interface OpenFact {
  rank: number;
  /** A graph step's id, or a rival's (for a fact on one of its other routes). */
  step: string;
  rival?: true;
}

const CLOSED = new WeakMap<CaseView, Map<string, { closed: Set<string>; window: Tick[] }>>();

/**
 * docs/40 §2: the steps of the deduction graph the notebook has closed. A
 * star stays on a choice while the step it serves is open, and only that
 * long. Read with the solver on what is held (and the confrontations that
 * landed), never the truth:
 *
 * - a place or a "not" step, once the solver places them (or strikes it);
 * - when, once the half hour is one; a half hour ruled out, once it is;
 * - a lie, once what is in hand breaks it, or a fact put to it landed;
 * - who, once the solver names them; a leg of the report, once one of its
 *   facts is held.
 */
export function closedSteps(view: CaseView, state: Pick<RunState, 'found' | 'confronts'>): Set<string> {
  const graph = view.kase.v2?.graph;
  const out = new Set<string>();
  if (!graph) return out;
  const key = `${state.found.join(',')}|${(state.confronts ?? []).map((r) => `${r.lieKey}:${r.outcome}`).join(',')}`;
  let memo = CLOSED.get(view);
  if (!memo) {
    memo = new Map();
    CLOSED.set(view, memo);
  }
  const hit = memo.get(key);
  if (hit) return hit.closed;
  const held = new Set(state.found);
  const st = solveNotebook(view, state);
  const culprit = culpritOf(st)?.id ?? null;
  const ticks = crimeTicks(st);
  const landed = new Set(
    (state.confronts ?? []).filter((r) => r.outcome !== 'wrong' && r.lieKey !== null).map((r) => `${r.personId}|${r.lieKey}`),
  );
  const confessed = confessedOf(state);
  for (const s of graph.steps) {
    const who = s.personId;
    const at = s.ticks ?? [];
    let closed = false;
    switch (s.kind) {
      case 'place':
        closed =
          who !== undefined &&
          s.place !== undefined &&
          at.every((t) => {
            const p = placesAt(st, who, t);
            return p.length === 1 && p[0] === s.place;
          });
        break;
      case 'not':
        closed = who !== undefined && s.place !== undefined && at.every((t) => whyNot(st, who, t, s.place as Id) !== null);
        break;
      case 'when':
        closed = ticks.length === 1;
        break;
      case 'tick':
        closed = at.every((t) => !ticks.includes(t));
        break;
      case 'lie': {
        if (who === undefined || s.place === undefined) break;
        const put = (view.kase.logic?.confrontations ?? []).some(
          (c) => c.personId === who && c.lie.claimed === s.place && c.lie.ticks.join() === at.join() && landed.has(`${who}|${lieKeyOf(c)}`),
        );
        // A lie is caught when it is put to them and lands. Holding what
        // breaks it is the player's to see, and the star stays till then.
        closed = put;
        break;
      }
      case 'confess':
        closed = who !== undefined && confessed.includes(who);
        break;
      case 'who':
        closed = culprit !== null && culprit === who;
        break;
      case 'leg':
        // A leg's facts say more than the leg (the chloral gone, a noise at
        // half past eight): each is its own until held.
        closed = s.facts.every((f) => held.has(f));
        break;
    }
    if (closed) out.add(s.id);
  }
  if (memo.size > 64) memo.clear();
  memo.set(key, { closed: out, window: ticks });
  return out;
}

/** The half hours the notebook still holds open for the crime (read with `closedSteps`'s solve). */
function heldWindow(view: CaseView, state: Pick<RunState, 'found' | 'confronts'>): Tick[] {
  closedSteps(view, state);
  const key = `${state.found.join(',')}|${(state.confronts ?? []).map((r) => `${r.lieKey}:${r.outcome}`).join(',')}`;
  return CLOSED.get(view)?.get(key)?.window ?? [];
}

/**
 * Each fact the graph's open steps rest on, ranked: lower is nearer the
 * bottleneck. Steps under the bottleneck step by their distance from it;
 * then the lies in the order a player can first catch them; then every step
 * under the report's targets by distance; then the rest; then the facts of
 * a rival's other routes, not yet held in full. Held facts, the givens, and
 * the facts of a step the notebook has closed (`closedSteps`) are not in it.
 */
export function openFactRanks(view: CaseView, found: readonly Id[], confronts: RunState['confronts'] = []): Map<Id, number> {
  const out = new Map<Id, number>();
  for (const [id, o] of openFacts(view, { found: [...found], confronts })) out.set(id, o.rank);
  return out;
}

/** `openFactRanks`, with the step each fact serves. */
export function openFacts(view: CaseView, state: Pick<RunState, 'found' | 'confronts'>): Map<Id, OpenFact> {
  const graph = view.kase.v2?.graph;
  const out = new Map<Id, OpenFact>();
  if (!graph) return out;
  const held = new Set(state.found);
  const closed = closedSteps(view, state);
  const byId = new Map(graph.steps.map((s) => [s.id, s]));
  const bfs = (roots: readonly string[]): Map<string, number> => {
    const d = new Map<string, number>();
    const queue: string[] = [];
    for (const r of roots) if (byId.has(r) && !d.has(r)) {
      d.set(r, 0);
      queue.push(r);
    }
    while (queue.length > 0) {
      const id = queue.shift() as string;
      const s = byId.get(id);
      for (const n of s?.needs ?? []) {
        if (d.has(n) || !byId.has(n)) continue;
        d.set(n, (d.get(id) ?? 0) + 1);
        queue.push(n);
      }
    }
    return d;
  };
  const fromBottleneck = bfs(graph.bottleneckStep ? [graph.bottleneckStep] : []);
  const fromTargets = bfs(graph.targets);
  const lieIndex = new Map(graph.lies.map((id, i) => [id, i]));
  for (const s of graph.steps) {
    if (closed.has(s.id)) continue;
    const rank = fromBottleneck.has(s.id)
      ? (fromBottleneck.get(s.id) as number)
      : lieIndex.has(s.id)
        ? 20 + (lieIndex.get(s.id) as number)
        : fromTargets.has(s.id)
          ? 40 + (fromTargets.get(s.id) as number)
          : 80;
    for (const f of s.facts) {
      if (held.has(f) || graph.classes[f] === 'given') continue;
      const had = out.get(f);
      if (had === undefined || rank < had.rank) out.set(f, { rank, step: s.id });
    }
  }
  // A rival's other routes are the deduction too: a fact on a route not yet
  // held in full breaks somebody the steps above may not reach first.
  for (const r of graph.rivals) {
    if (closed.has(r.step)) continue;
    for (const route of r.routeFacts) {
      if (route.every((f) => held.has(f))) continue;
      for (const f of route) {
        if (held.has(f) || graph.classes[f] === 'given' || out.has(f)) continue;
        out.set(f, { rank: 60, step: r.id, rival: true });
      }
    }
  }
  return out;
}

/** One star: the choice, and the fact and step it is for. */
export interface Star {
  command: string;
  fact: Id;
  step: string;
  rival?: true;
}

/**
 * The commands to star: of the candidates (the caller passes what each would
 * bring), those that bring a fact an open step or an open route rests on, at
 * most three, a question here before a walk, the fact nearest the bottleneck
 * first, and never two stars for one fact (a first question to somebody
 * brings their evening whatever it is about; the evening itself carries the
 * star). On the first visit to a watched room, asking the watcher about it
 * comes first when it brings anything an open step rests on.
 */
export function graphStars(
  view: CaseView,
  state: Pick<RunState, 'found' | 'confronts'>,
  candidates: readonly StarCandidate[],
): Map<string, Star> {
  const facts = openFacts(view, state);
  const out = new Map<string, Star>();
  if (facts.size === 0) return out;
  const rankOf = (id: Id): number => (facts.get(id) as OpenFact).rank;
  // What can be had without walking is never a reason to walk.
  const here = new Set(candidates.filter((c) => !c.go && !c.done).flatMap((c) => c.gains));
  const scored = candidates
    .map((c, i) => {
      const useful = c.gains.filter((id) => facts.has(id) && !(c.go && here.has(id)));
      const rank = useful.length === 0 ? Infinity : Math.min(...useful.map(rankOf));
      return { c, i, useful, rank: c.watcherFirst && useful.length > 0 ? -1 : rank };
    })
    .filter((x) => !x.c.done && x.useful.length > 0)
    .sort(
      (a, b) =>
        Number(a.c.go) - Number(b.c.go) ||
        a.rank - b.rank ||
        b.useful.length - a.useful.length ||
        Number(b.c.evening) - Number(a.c.evening) ||
        a.i - b.i,
    );
  const covered = new Set<Id>();
  for (const x of scored) {
    if (out.size >= STAR_LIMIT) break;
    const fresh = x.useful.filter((id) => !covered.has(id));
    if (fresh.length === 0) continue;
    // The star is for the fact nearest the bottleneck this choice brings that
    // no other star is already for.
    // A question's own answer before the evening that rides along with it.
    const own = x.c.evening ? fresh : fresh.filter((id) => view.findableById.get(id)?.kind !== 'account');
    const pool = own.length > 0 ? own : fresh;
    const best = pool.reduce((b, id) => (rankOf(id) < rankOf(b) ? id : b), pool[0] as Id);
    const o = facts.get(best) as OpenFact;
    out.set(x.c.command, { command: x.c.command, fact: best, step: o.step, ...(o.rival ? { rival: true as const } : {}) });
    for (const id of x.useful) covered.add(id);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * docs/40 §2: why a star, in eight words or fewer.
 * ------------------------------------------------------------------ */

/** The longest a star's reason may run, in words. */
export const REASON_WORDS = 8;

/**
 * The reason a star carries, in the detective's voice, from the step it
 * serves and what the choice would bring: "she counts that room", "who saw
 * him last?", "Hauck's story against Hargrove's eyes". It says why the fact
 * would matter, never what it is, and names only who the notebook names.
 */
export function starReason(
  view: CaseView,
  state: Pick<RunState, 'found' | 'confronts' | 'accounts' | 'log'>,
  star: Star,
  go: boolean,
): string {
  const graph = view.kase.v2?.graph;
  const clue = view.findableById.get(star.fact);
  const step = star.rival ? undefined : graph?.steps.find((s) => s.id === star.step);
  const rival = star.rival ? graph?.rivals.find((r) => r.id === star.step) : undefined;
  const person = (id: Id | undefined): Person | undefined => (id === undefined ? undefined : view.personById.get(id));
  const known = (id: Id | undefined): string | null => {
    if (id === undefined || !nameKnown(view, state, id)) return null;
    return view.personById.get(id)?.surname ?? null;
  };
  const she = (p: Person | undefined): string => (p && pronounOf(p) === 'she' ? 'she' : 'he');
  const her = (p: Person | undefined): string => (p && pronounOf(p) === 'she' ? 'her' : 'his');
  const him = (p: Person | undefined): string => (p && pronounOf(p) === 'she' ? 'her' : 'him');
  const source = clue && clue.source.type === 'person' ? person(clue.source.personId) : undefined;
  const kind = rival ? (rival.kind === 'when' ? 'tick' : 'not') : step?.kind;
  const who = rival?.personId ?? step?.personId;
  const ticks = rival?.tick !== undefined ? [rival.tick] : (step?.ticks ?? []);
  const time = ticks.length > 0 ? spokenWhen([ticks[0] as Tick]) : '';
  const fits = (s: string, fallback = 'it bears on what’s still open'): string =>
    s.split(/\s+/).length <= REASON_WORDS ? s : fallback;

  // What kind of fact it brings, first: that is what the player can act on.
  if (clue) {
    const facts = clue.establishes;
    if (facts.some((f) => f.kind === 'victimAliveAt' || (f.kind === 'personAt' && f.personId === view.victim.id))) {
      return `who saw ${him(view.victim)} last?`;
    }
    if (clue.kind === 'watch' || facts.some((f) => f.kind === 'countAt' || f.kind === 'absentFrom')) {
      return go || !source ? 'somebody there counts heads' : `${she(source)} counts that room`;
    }
    if (facts.some((f) => f.kind === 'describedAt')) {
      return go || !source ? 'somebody there notices faces' : `${she(source)} knows faces, if not names`;
    }
    // A sighting: said of whom it saw, at the hour that matters to the step
    // when it covers it.
    const seen = facts.find(
      (f): f is Extract<Fact, { personId: Id }> =>
        (f.kind === 'personAt' || f.kind === 'personNotAt' || f.kind === 'personAtAnchor') && f.personId !== view.victim.id,
    );
    if (seen && clue.kind !== 'account') {
      const p = seen.personId;
      const n = known(p);
      const told = (state.accounts ?? []).includes(p);
      const src = known(source?.id);
      if (kind === 'lie' && who === p && told && n && src && n !== src) {
        return fits(`${n}’s story against ${src}’s eyes`, `does ${n}’s story hold up?`);
      }
      const theirs = facts.flatMap((f) => ('personId' in f && f.personId === p && 'tick' in f ? [f.tick] : []));
      // The step's own hour; else an hour the notebook still holds open for
      // the crime; else the first the fact names.
      const open = heldWindow(view, state);
      const gap = (t: number): number => (open.length === 0 ? 0 : Math.min(...open.map((o) => Math.abs(o - t))));
      const nearest = [...theirs].sort((a, b) => gap(a) - gap(b) || b - a)[0];
      const at = ticks.find((t) => theirs.includes(t)) ?? nearest;
      const when = at === undefined ? '' : spokenWhen([at]);
      if (n && when) return fits(`where was ${n} ${when}?`, `who was where ${when}?`);
      return when ? `who was where ${when}?` : 'who was where, and when?';
    }
    if (clue.kind === 'account' && clue.source.type === 'person') {
      const p = person(clue.source.personId);
      const n = known(p?.id);
      return fits(go && n ? `${n}’s story, to check` : `${her(p)} story, to check against the others`);
    }
  }
  switch (kind) {
    case 'when':
    case 'tick':
      return 'when did it happen, exactly?';
    case 'leg':
      if (step?.id === 'leg:how') return 'how was it done?';
      if (step?.id === 'leg:entry') return 'who could have got in?';
      if (step?.id === 'leg:why') return 'who had a reason?';
      return 'what the report still asks';
    case 'lie': {
      const liar = known(who);
      const src = known(source?.id);
      // Only a story the notebook has can be checked; before that, the hour.
      const told = who !== undefined && (state.accounts ?? []).includes(who);
      if (told && liar && src && liar !== src) return fits(`${liar}’s story against ${src}’s eyes`, `does ${liar}’s story hold up?`);
      if (told && liar) return `does ${liar}’s story hold up?`;
      if (liar && time) return fits(`where was ${liar} ${time}?`, `who was where ${time}?`);
      return time ? `who was where ${time}?` : 'who was where, and when?';
    }
    case 'who':
      return fits(`who was at ${view.placeById.get(view.sceneId)?.shortName ?? 'the scene'} then?`, 'who was there when it happened?');
    case 'confess': {
      const n = known(who);
      return n ? `what ${n} is keeping back` : 'what somebody is keeping back';
    }
    default: {
      const n = known(who);
      return fits(n && time ? `where was ${n} ${time}?` : time ? `who was where ${time}?` : 'who was where, and when?', time ? `who was where ${time}?` : 'who was where, and when?');
    }
  }
}

/**
 * v1: the leads the client's own pointer opened ("start with Fairbanks"),
 * and no other found clue: they stay offered, and are not starred for being
 * the client's. The room it happened in, which the briefing names, keeps its
 * star.
 */
export function clientPointerOnly(view: CaseView, found: readonly Id[]): Set<Id> {
  const have = new Set(found);
  const fromClient = new Set<Id>();
  const fromOthers = new Set<Id>();
  for (const id of found) {
    const c = view.findableById.get(id);
    if (!c) continue;
    for (const t of c.leadsTo) {
      if (have.has(t)) continue;
      if (c.kind === 'client') fromClient.add(t);
      else fromOthers.add(t);
    }
  }
  const out = new Set<Id>();
  for (const t of fromClient) {
    if (fromOthers.has(t)) continue;
    const target = view.findableById.get(t);
    if (target && target.source.type === 'person') out.add(t);
  }
  return out;
}

/** Is this the first visit to the room the detective is in? */
export function firstVisit(state: Pick<RunState, 'log' | 'at'>): boolean {
  let i = state.log.length - 1;
  while (i >= 0 && state.log[i]?.at === state.at) i--;
  for (let k = i; k >= 0; k--) if (state.log[k]?.at === state.at) return false;
  return true;
}

/** The watcher posted at this room, if the room has one and they are at their post. */
export function watcherOf(view: CaseView, placeId: Id): Person | null {
  const place = view.placeById.get(placeId);
  if (!place?.watcher) return null;
  return (
    view.kase.people.find((p) => p.kind === 'fixture' && p.fixtureRole === place.watcher && p.foundAt === placeId) ?? null
  );
}

/* ------------------------------------------------------------------ *
 * §3. Soft marks on the grid.
 * ------------------------------------------------------------------ */

export interface SoftMark {
  kind: 'unseen' | 'count';
  personId: Id;
  tick: Tick;
  placeId: Id;
  /** "? not seen by Abramowitz", "counted 1, 3 claim it". */
  text: string;
  /** The witness, for `unseen`. */
  by?: Id;
  /** The clues the mark rests on. */
  clueIds: Id[];
}

/**
 * The marks to think about, not verdicts:
 *
 * - **A missing sighting.** A witness shown to have been at a place at a half
 *   hour by something in the notebook that is not their own account (what
 *   they said they saw there then — a count, a face, somebody by name — or
 *   somebody else's sighting of them), who knows the claimant by name (the
 *   notebook holds their sightings of that person), and whose sightings of
 *   that person leave out this place and half hour: "? not seen by
 *   Abramowitz". Never from anybody's own word about where they were (a
 *   story, true or broken, puts nobody anywhere), never where the witness
 *   could not have put a name to them, and never where the witness's own
 *   story has them somewhere else then (they may be keeping it back). Where
 *   the witness said outright that they were not there, the grid already has
 *   it in ink, and no mark is added. (Playtest round 2.)
 * - **A count that doesn't add up.** A head count at a place and half hour
 *   lower than the number who claim to have been there: every claimant's
 *   cell gets "counted 1, 3 claim it". A "nobody but …" is not a count here:
 *   whoever it leaves out is already struck in ink.
 */
export function softMarks(view: CaseView, state: RunState): SoftMark[] {
  if (!view.kase.logic) return [];
  const found = state.found
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined);
  const people = view.kase.people.filter((p) => p.kind !== 'victim');
  // Who claims where, half hour by half hour.
  const claims = new Map<Id, Map<Tick, { place: Id; with?: Id }>>();
  for (const p of people) {
    const c = claimedNow(view, state, p.id);
    if (c.size > 0) claims.set(p.id, c);
  }
  const out: SoftMark[] = [];
  const name = (id: Id): string => displayName(view, state, id);

  // Where each witness was, shown by what they saw there then, or by
  // somebody else's sighting of them. Never their post alone, and never their
  // own account of their evening.
  const presence = (w: Id, place: Id, t: Tick): boolean =>
    found.some((c) => {
      if (c.kind === 'account') return false;
      const own = c.source.type === 'person' && c.source.personId === w;
      return c.establishes.some((f) => {
        if (f.kind === 'personAt' && f.place === place && f.tick === t) return f.personId === w ? !own : own;
        if (!own) return false;
        if (f.kind === 'countAt' || f.kind === 'describedAt') return f.place === place && f.tick === t;
        if (f.kind === 'absentFrom') return f.place === place && f.ticks.includes(t);
        return false;
      });
    });
  // What each witness has said: facts sourced by them.
  const bySource = new Map<Id, Clue[]>();
  for (const c of found) {
    if (c.source.type !== 'person' || c.kind === 'account') continue;
    const list = bySource.get(c.source.personId) ?? [];
    list.push(c);
    bySource.set(c.source.personId, list);
  }
  const SIGHTING = new Set<Fact['kind']>(['personAt', 'personNotAt', 'personAtAnchor']);
  for (const [claimant, map] of claims) {
    for (const [t, claim] of map) {
      for (const [w, clues] of bySource) {
        if (w === claimant) continue;
        // Their own story has them somewhere else then: they may be keeping back what they saw.
        const own = claims.get(w)?.get(t);
        if (own && own.place !== claim.place) continue;
        if (!presence(w, claim.place, t)) continue;
        const facts = clues.flatMap((c) => c.establishes.map((f) => ({ f, c })));
        // They know the claimant by name: the notebook has their sightings of them.
        const aboutClaimant = facts.filter(
          ({ f, c }) =>
            c.about === claimant &&
            ((SIGHTING.has(f.kind) && 'personId' in f && f.personId === claimant) || (f.kind === 'apart' && f.personIds.includes(claimant))),
        );
        if (aboutClaimant.length === 0) continue;
        const saw = facts.some(({ f }) => f.kind === 'personAt' && f.personId === claimant && f.place === claim.place && f.tick === t);
        const saidNot = facts.some(
          ({ f }) =>
            (f.kind === 'personNotAt' && f.personId === claimant && f.place === claim.place && f.tick === t) ||
            (f.kind === 'personAt' && f.personId === claimant && f.tick === t && f.place !== claim.place) ||
            (f.kind === 'absentFrom' && f.place === claim.place && f.ticks.includes(t) && !f.except.includes(claimant)),
        );
        // A stranger the witness saw there may be them: that is the player's link to make.
        const stranger = facts.some(({ f }) => f.kind === 'describedAt' && f.place === claim.place && f.tick === t);
        if (saw || saidNot || stranger) continue;
        const ids = [...new Set(aboutClaimant.map(({ c }) => c.id))];
        out.push({ kind: 'unseen', personId: claimant, tick: t, placeId: claim.place, by: w, text: `? not seen by ${name(w)}`, clueIds: ids });
      }
    }
  }

  // Counts lower than the claimants.
  const counts = new Map<string, { place: Id; tick: Tick; count: number; clueIds: Id[] }>();
  for (const c of found) {
    for (const f of c.establishes) {
      const add = (place: Id, tick: Tick, count: number): void => {
        const key = `${place}|${tick}`;
        const had = counts.get(key);
        if (!had || count < had.count) counts.set(key, { place, tick, count, clueIds: [c.id] });
        else if (had.count === count && !had.clueIds.includes(c.id)) had.clueIds.push(c.id);
      };
      if (f.kind === 'countAt') add(f.place, f.tick, f.count);
    }
  }
  for (const k of counts.values()) {
    const watcher = watcherOf(view, k.place);
    const claimants = [...claims.entries()]
      .filter(([id, m]) => id !== watcher?.id && m.get(k.tick)?.place === k.place)
      .map(([id]) => id);
    if (claimants.length <= k.count) continue;
    for (const id of claimants) {
      out.push({
        kind: 'count',
        personId: id,
        tick: k.tick,
        placeId: k.place,
        text: `counted ${k.count}, ${claimants.length} claim it`,
        clueIds: k.clueIds,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * §5. Teach once.
 * ------------------------------------------------------------------ */

/** The teaching page: four lines in the detective's voice. */
export const TEACH_TITLE = 'Before the office';

export const TEACH_LINES: readonly string[] = [
  'People lie about themselves. Nobody lies about what they saw. A man will tell you where he was all night, and the only part you can take to the bank is what he says he saw of somebody else.',
  'The ones who work a room, the landlady on the stairs and the barman at the taps, count who comes in. They don’t always get the names. They always get the number.',
  'When somebody’s story and somebody else’s eyes don’t agree, that’s worth putting to them. Read them the fact that breaks it and watch what they do.',
  'The grid in the back of the notebook is where it all goes: everybody, every half hour. Pencil in what you think. When a cell won’t sit still, that’s the one to look at.',
];

/**
 * Whether the teaching page comes before the office tonight: a profile's
 * first night, and every night on the first tier until the first clean
 * report.
 */
export function teachOn(profile: Pick<Profile, 'runs' | 'wins'>, tier: TierKey | undefined): boolean {
  if (profile.wins > 0) return false;
  return profile.runs === 0 || tier === 0;
}
