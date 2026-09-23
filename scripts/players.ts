/**
 * The players the scripts drive through the real engine, shared so that more
 * than one script can play the same nights: the reasoning player (M9) and the
 * wanderer's filing rule, with the fact helpers they read the notebook with.
 * Moved here unchanged from scripts/diagnose-play.ts, which imports them back.
 */

import type { Case, Fact, Id, Person, Tick } from '../src/gen/types.js';
import { TICKS } from '../src/gen/types.js';
import { establishedFrom, gameBudget, peopleHereNow, type CaseView } from '../src/game/derive.js';
import { followUpOf } from '../src/game/reducer.js';
import type { choicesFor } from '../src/game/choices.js';
import { allChoices } from '../src/game/choices.js';
import { leadingTheory } from '../src/game/voice/reactive.js';
import type { Rng } from '../src/gen/rng.js';
import type { Report, RunState } from '../src/game/types.js';
import type { Clue } from '../src/gen/types.js';
import { placesAt } from '../src/gen/logic/solver.js';
import { contradicts, crimeFromHeld } from '../src/gen/index.js';
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
  verdictsOn,
} from '../src/game/m9.js';

export type Picker = (
  state: RunState,
  view: CaseView,
  rng: Rng,
  groups: ReturnType<typeof choicesFor>,
) => { command: string; marked: boolean } | null;

export function suspectsOf(kase: Case): Id[] {
  return kase.people.filter((p) => p.kind === 'suspect').map((p) => p.id);
}

/** Facts the player holds from page one: the briefing's givens. */
export function givenFacts(kase: Case): Fact[] {
  return kase.act.givens.facts.slice();
}

export function factsOf(view: CaseView, found: readonly Id[]): Fact[] {
  const out: Fact[] = givenFacts(view.kase);
  for (const id of found) out.push(...(view.findableById.get(id)?.establishes ?? []));
  return out;
}

/** The half hours the death is still consistent with, from these facts. */
export function deathTicks(facts: Fact[]): Tick[] {
  let ticks = Array.from({ length: TICKS }, (_, i) => i);
  for (const f of facts) {
    if (f.kind === 'timeOfDeath') {
      const lo = f.ticks[0] as Tick;
      const hi = f.ticks[f.ticks.length - 1] as Tick;
      ticks = ticks.filter((t) => t >= lo && t <= hi);
    } else if (f.kind === 'victimAliveAt') ticks = ticks.filter((t) => t > f.tick);
    else if (f.kind === 'victimDeadBy') ticks = ticks.filter((t) => t <= f.tick);
  }
  return ticks;
}

/** Does this fact, alone, put `s` somewhere other than `scene` at `t`? */
export function clearsAt(f: Fact, s: Id, scene: Id, t: Tick): boolean {
  if (f.kind === 'personAt') return f.personId === s && f.tick === t && f.place !== scene;
  if (f.kind === 'personNotAt') return f.personId === s && f.tick === t && f.place === scene;
  return false;
}

/** Suspects the facts do not clear at every half hour still open. */
export function uncleared(kase: Case, facts: Fact[]): Id[] {
  const ticks = deathTicks(facts);
  const scene = kase.act.place;
  return suspectsOf(kase).filter(
    (s) => !ticks.every((t) => facts.some((f) => clearsAt(f, s, scene, t))),
  );
}

/**
 * The reasoning player's report: what the notebook settles, read with the
 * solver. Where it does not settle a thing, a best guess from the same grid.
 */
export function fileReasoned(view: CaseView, state: RunState): Report {
  const kase = view.kase;
  const base = fileFor(view, state);
  if (!kase.logic) return base;
  const confessed = confessedOf(state);
  const crime = crimeFromHeld(kase, state.found, { confessed });
  const st = solveNotebook(view, state);
  const tick = crime.ticks.length === 1 ? (crime.ticks[0] as Tick) : (crime.ticks[crime.ticks.length - 1] ?? base.tick ?? null);
  let killerId = crime.culprit;
  if (killerId === null && tick !== null) {
    const can = columnPeople(view).filter((p) => placesAt(st, p.id, tick).includes(view.sceneId));
    // Of those the grid still allows, the one whose own word for that half
    // hour a fact in hand breaks: somebody who lied about the hour it happened.
    const broken = can.filter((p) => {
      const claim = view.claimedOf.get(p.id)?.[tick] ?? null;
      return (
        state.accounts.includes(p.id) &&
        claim !== null &&
        contradicts(kase, state.found, { personId: p.id, place: claim, ticks: [tick] }, { confessed: confessedOf(state), soft: false }).yes
      );
    });
    killerId =
      can.length === 1
        ? (can[0]?.id as Id)
        : (broken[0]?.id ?? can.find((p) => p.id === base.killerId)?.id ?? can[0]?.id ?? base.killerId);
  }
  const column: Record<Id, Id | null> = {};
  if (tick !== null) {
    for (const p of columnPeople(view)) {
      const at = placesAt(st, p.id, tick);
      if (p.id === killerId) column[p.id] = view.sceneId;
      else if (at.length === 1) column[p.id] = at[0] as Id;
      else {
        const claim = view.claimedOf.get(p.id)?.[tick] ?? null;
        column[p.id] = claim !== null && at.includes(claim) ? claim : (at.find((x) => x !== view.sceneId) ?? null);
      }
    }
  }
  const motive = establishedFrom(view, state.found, state.accounts).motives.find((m) => m.personId === killerId);
  return {
    ...base,
    killerId,
    ...(motive ? { motiveType: motive.motiveType } : {}),
    tick: kase.act.unknowns.includes('when') ? tick : base.tick,
    column,
  };
}

/** Has the notebook settled everything the report asks? Then the reasoning player files. */
export function settled(view: CaseView, state: RunState): boolean {
  const kase = view.kase;
  if (!kase.logic) return false;
  const crime = crimeFromHeld(kase, state.found, { confessed: confessedOf(state) });
  if (crime.culprit === null) return false;
  if (kase.act.unknowns.includes('when') && crime.ticks.length !== 1) return false;
  if (columnAsked(view)) {
    if (crime.ticks.length !== 1) return false;
    for (const p of columnPeople(view)) if ((crime.column[p.id] ?? []).length !== 1) return false;
  }
  return true;
}

/**
 * M9: the reasoning player. It never reads the truth: only what it holds,
 * through the solver the generator hands the engine.
 */
export function reasonPicker(): Picker {
  const put = new Set<string>();
  const asked = new Set<string>();
  return (state, view, rng, groups) => {
    const kase = view.kase;
    if (settled(view, state)) return null;
    const options = allChoices(groups).filter((c) => !c.done && !['notebook', 'file'].includes(c.command));
    if (options.length === 0) return null;
    const here = peopleHereNow(view, state.at, { clientInOffice: state.clientInOffice, found: state.found });
    const confessed = confessedOf(state);
    // 0. The room it happened in first: the briefing names it.
    if (!state.sceneSeen && state.at !== view.startId) {
      const start = view.placeById.get(view.startId)?.shortName;
      const go = options.find((c) => c.command === `go ${start}`);
      if (go) return { command: go.command, marked: go.lead };
    }
    // 1. A fact in hand that the solver says breaks what somebody said: put
    // it to them if they are here, walk to them if they are not.
    // Shorter nights §1: a second fact goes in the same visit for nothing, so
    // a first confrontation with only one fact in hand can wait while there
    // is other work: `deferred` is taken when there is none.
    let deferred: { command: string; marked: boolean } | null = null;
    if (kase.logic) {
      const said = saidRecords(view, state);
      const hereIds = new Set(here.map((p) => p.id));
      const stC = solveNotebook(view, state);
      const windowC = establishedFrom(view, state.found, state.accounts).deathTicks;
      // Shorter nights §1: right after a fact landed, a second one goes to
      // the same person for nothing. Them first; a paid confrontation with
      // anybody else would close it.
      const follow = followUpOf(view, state);
      const order = columnPeople(view).sort((a, b) => Number(b.id === follow?.personId) - Number(a.id === follow?.personId));
      for (const person of order) {
        if (!state.accounts.includes(person.id)) continue;
        // Only somebody the grid still has open at the crime's half hours:
        // breaking a story the notebook has no use for is a half hour lost.
        if (windowC.length > 0 && windowC.every((t) => placesAt(stC, person.id, t).length === 1)) continue;
        if (
          process.env.REASON_VARIANT === 'h' &&
          windowC.length > 0 &&
          !windowC.some((t) => placesAt(stC, person.id, t).includes(view.sceneId))
        )
          continue;
        if (!canConfront(view, { ...state, at: person.foundAt ?? state.at }, person.id)) continue;
        const facts = new Set(confrontFacts(view, state, person.id).map((c) => c.id));
        // What they say now: a second story replaces the first for its hours,
        // and what they gave up is not theirs to be caught on again.
        const mine = said.filter((x) => x.personId === person.id);
        // What they gave up is not theirs to be caught on again.
        const moved = new Set<Tick>();
        for (const x of mine) {
          if (x.outcome !== 'admit' && x.outcome !== 'withdraw') continue;
          for (const f of x.facts) if (f.kind === 'personAt') moved.add(f.tick);
        }
        const claims: { place: Id; ticks: Tick[] }[] = [];
        for (const f of accountClueOf(view, person.id)?.establishes ?? []) {
          if (f.kind === 'claims' && !f.ticks.some((t) => moved.has(t))) claims.push({ place: f.place, ticks: f.ticks });
        }
        const done = mine.some((x) => x.outcome === 'admit' || x.outcome === 'withdraw');
        for (const x of mine) {
          if (x.outcome !== 'second-lie' || done) continue;
          for (const f of x.facts) if (f.kind === 'claims') claims.push({ place: f.place, ticks: f.ticks });
        }
        // A second time needs a second, independent way: what still breaks
        // the claim with the facts already put to them set aside.
        const unused = state.found.filter((id) => !put.has(`${person.id}|${id}`));
        // M9 polish: a story about hours nowhere near the crime's is not worth
        // a half hour: breaking it says nothing about who was in the room.
        // The claims that touch the notebook's window, or the half hour
        // either side of it (travel reaches that far), are.
        const nearCrime = (ticks: Tick[]): boolean =>
          process.env.REASON_ALL_CLAIMS === '1' ||
          windowC.length === 0 ||
          ticks.some((t) => windowC.some((w) => Math.abs(w - t) <= 1));
        for (const claim of claims.filter((c) => nearCrime(c.ticks))) {
          for (const soft of [false, true]) {
            const res = contradicts(kase, unused, { personId: person.id, ...claim }, { confessed, soft });
            if (!res.yes) continue;
            const pick = res.rules.find((id) => facts.has(id) && !put.has(`${person.id}|${id}`));
            if (!pick) continue;
            const landed = (state.confronts ?? []).some((r) => r.personId === person.id && r.outcome !== 'wrong');
            // It waits only while there is time to come back for it.
            const left = gameBudget(kase) - state.actionsUsed;
            if (!landed && process.env.REASON_NO_WAIT !== '1' && left > Number(process.env.REASON_WAIT_LEFT ?? 3)) {
              const second = contradicts(kase, unused.filter((id) => id !== pick), { personId: person.id, ...claim }, { confessed, soft });
              if (!second.yes || !second.rules.some((id) => facts.has(id) && id !== pick)) {
                if (deferred === null) {
                  if (hereIds.has(person.id)) {
                    const clue = view.findableById.get(pick) as Clue;
                    const part = partsOf(clue).findIndex((_, i) => partBreaks(view, unused, person.id, pick, i, claim, confessed));
                    if (part >= 0) deferred = { command: `put ${partRef(pick, part)} to ${person.surname}`, marked: false };
                  } else {
                    const where = view.placeById.get(person.foundAt ?? '')?.shortName;
                    const go = options.find((c) => c.command === `go ${where}`);
                    if (go) deferred = { command: go.command, marked: go.lead };
                  }
                }
                continue;
              }
            }
            if (hereIds.has(person.id)) {
              // The picker offers one fact at a time: the part of the line
              // the solver's proof rests on.
              const clue = view.findableById.get(pick) as Clue;
              const part = partsOf(clue).findIndex((_, i) => partBreaks(view, unused, person.id, pick, i, claim, confessed));
              put.add(`${person.id}|${pick}`);
              if (part < 0) continue;
              return { command: `put ${partRef(pick, part)} to ${person.surname}`, marked: false };
            }
            const where = view.placeById.get(person.foundAt ?? '')?.shortName;
            const go = options.find((c) => c.command === `go ${where}`);
            if (go) return { command: go.command, marked: go.lead };
          }
        }
      }
    }
    const pick = (c: { command: string; lead: boolean }): { command: string; marked: boolean } => {
      asked.add(c.command);
      return { command: c.command, marked: c.lead };
    };
    const notConfront = options.filter((c) => !c.command.startsWith('put '));
    // A lead about somebody whose every half hour of the crime the notebook
    // already settles can wait: the grid has what it would give.
    const st0 = kase.logic ? solveNotebook(view, state) : null;
    const window0 = establishedFrom(view, state.found, state.accounts).deathTicks;
    const settledRow = (id: Id | undefined): boolean =>
      st0 !== null &&
      id !== undefined &&
      window0.length > 0 &&
      columnPeople(view).some((p) => p.id === id) &&
      window0.every((t) => placesAt(st0, id, t).length === 1);
    const worth = (command: string): boolean => {
      if (process.env.REASON_VARIANT === 'a') return true;
      const t = state.threads.find((x) => x.command === command || `go ${x.placeLabel}` === command);
      if (!t) return true;
      const leadsHere = state.threads.filter((x) => (command.startsWith('go ') ? `go ${x.placeLabel}` === command : x.command === command));
      return leadsHere.some((x) => !settledRow(view.findableById.get(x.clueId)?.about));
    };
    // 2. A marked question or search in this room.
    const markedHere = notConfront.filter((c) => c.lead && !c.command.startsWith('go ') && worth(c.command));
    if (markedHere.length > 0) {
      const first = markedHere[0] as (typeof options)[number];
      // Shorter nights §2: a lead to somebody's evening is taken by any first
      // question to them. Ask them about somebody the grid still has open.
      const m = /^ask (.+) about that evening$/.exec(first.command);
      const who = m ? here.find((p) => p.surname === m[1]) : undefined;
      if (kase.logic && who && !state.accounts.includes(who.id)) {
        const st1 = solveNotebook(view, state);
        const w1 = establishedFrom(view, state.found, state.accounts).deathTicks;
        const open1 = columnPeople(view).filter(
          (p) => p.id !== who.id && (w1.length === 0 || w1.some((t) => placesAt(st1, p.id, t).length > 1)),
        );
        for (const target of [...open1, view.victim]) {
          const c = notConfront.find((x) => x.command === `ask ${who.surname} about ${target.surname}` && x.minutes > 0);
          if (c && !asked.has(c.command)) return pick(c);
        }
      }
      return pick(first);
    }
    // 3. The room, once.
    const search = notConfront.find((c) => c.command.startsWith('examine ') && !c.done);
    if (search && !(state.searched ?? []).includes(state.at)) return pick(search);
    const VARIANT = process.env.REASON_VARIANT ?? 'g';
    const markedGo0 = notConfront.filter((c) => c.lead && c.command.startsWith('go ') && worth(c.command));
    const early = process.env.REASON_ACCOUNTS_EARLY === '1';
    // 3b. A room a lead points at (after the evenings here, shorter nights).
    if (!early && VARIANT !== 'b' && VARIANT !== 'f' && markedGo0.length > 0) return pick(markedGo0[0] as (typeof options)[number]);
    // 3c. A confrontation that waited for a second fact, once the marks here
    // and the room are done (shorter nights §1).
    const takeDeferred = (): { command: string; marked: boolean } | null => {
      if (deferred === null) return null;
      const m = /^put (\S+)(?: part \d+)? to (.+)$/.exec(deferred.command);
      if (m) {
        const who = view.kase.people.find((p) => p.surname === m[2]);
        if (who) put.add(`${who.id}|${m[1]}`);
      }
      return deferred;
    };
    if (process.env.REASON_DEFER_LATE !== '1') {
      const d = takeDeferred();
      if (d) return d;
    }
    // 4. The evening of anybody here whose crime half hour is still open, and
    // 5. what the people here saw of the people whose cell is still open.
    const st = kase.logic ? solveNotebook(view, state) : null;
    const window = establishedFrom(view, state.found, state.accounts).deathTicks;
    const open = (id: Id): boolean =>
      st === null || window.length === 0 || window.some((t) => placesAt(st, id, t).length > 1);
    const standing = new Set(
      saidRecords(view, state)
        .filter((x) => x.outcome === 'second-lie')
        .map((x) => x.personId)
        .filter((id) => !confessed.includes(id)),
    );
    // Who could still have been in the room it happened in: the questions
    // worth a half hour are about them, and about anybody whose second story
    // is still standing.
    const couldBe = (id: Id): boolean =>
      st === null || window.length === 0 || window.some((t) => placesAt(st, id, t).includes(view.sceneId));
    const openSuspects = columnPeople(view)
      .filter((p) => (open(p.id) && couldBe(p.id)) || standing.has(p.id))
      .sort((a, b) => Number(standing.has(b.id)) - Number(standing.has(a.id)));
    const askedOf = (who: Person): number => [...asked].filter((c) => c.startsWith(`ask ${who.surname} about `)).length;
    // 4. The evening of anybody here whose crime half hour is still open.
    // Shorter nights §2: it comes with the first question, so the question
    // is about somebody else the grid still has open, and the evening rides
    // along; their evening alone only when there is nobody to ask about.
    for (const person of here) {
      if (person.kind !== 'suspect' || !open(person.id) || state.accounts.includes(person.id)) continue;
      if (kase.logic) {
        for (const target of [...openSuspects, view.victim]) {
          if (target.id === person.id) continue;
          const c = notConfront.find((x) => x.command === `ask ${person.surname} about ${target.surname}` && x.minutes > 0);
          if (c && !asked.has(c.command)) return pick(c);
        }
      }
      const c = notConfront.find((x) => x.command === `ask ${person.surname} about that evening`);
      if (c && c.minutes > 0) return pick(c);
    }
    // 3b. A room a lead points at. Shorter nights §2: after the evenings of
    // the people standing here, which cost nothing extra now that they come
    // with a question worth asking anyway.
    if (early && VARIANT !== 'b' && VARIANT !== 'f' && markedGo0.length > 0) return pick(markedGo0[0] as (typeof options)[number]);
    // 4b. The evening of anybody in the notebook who could still have been in
    // the room it happened in: the notebook says where they are found.
    if (kase.logic && process.env.REASON_VARIANT !== 'e') {
      for (const p of columnPeople(view)) {
        if (state.accounts.includes(p.id) || !state.met.includes(p.id) || !couldBe(p.id)) continue;
        if (here.some((h) => h.id === p.id)) continue;
        const where = view.placeById.get(p.foundAt ?? '')?.shortName;
        const go = notConfront.find((c) => c.command === `go ${where}`);
        if (go) return pick(go);
      }
    }
    if (VARIANT === 'f' && markedGo0.length > 0) return pick(markedGo0[0] as (typeof options)[number]);
    // Somebody posted at a door saw everybody who came through it: ask them first.
    const byPost = [...here]
      .sort((a, b) => Number(b.kind === 'fixture') - Number(a.kind === 'fixture'))
      .filter((p) => VARIANT !== 'c' || p.kind === 'fixture' || standing.size > 0);
    for (const person of byPost) {
      if (askedOf(person) >= 3 && person.kind !== 'fixture') continue;
      if (VARIANT === 'g' && person.kind !== 'fixture' && standing.size === 0) continue;
      for (const target of [...openSuspects, view.victim]) {
        if (target.id === person.id) continue;
        const c = notConfront.find((x) => x.command === `ask ${person.surname} about ${target.surname}` && x.minutes > 0);
        if (c && !asked.has(c.command)) return pick(c);
      }
    }
    if (process.env.REASON_DEFER_LATE === '1') {
      const d = takeDeferred();
      if (d) return d;
    }
    // 6. A marked room, then a room with somebody not yet asked, then anywhere new.
    const markedGo = notConfront.filter((c) => c.lead && c.command.startsWith('go '));
    if (markedGo.length > 0) return pick(markedGo[0] as (typeof options)[number]);
    const gos = notConfront.filter((c) => c.command.startsWith('go ') && !c.command.endsWith(view.office.shortName));
    const unvisited = gos.filter((c) => c.note === 'not been');
    if (unvisited.length > 0) return pick(rng.pick(unvisited));
    const rest = notConfront.filter((c) => c.minutes > 0 && !asked.has(c.command));
    if (rest.length > 0) return pick(rng.pick(rest));
    return gos.length > 0 ? pick(rng.pick(gos)) : null;
  };
}

export function fileFor(view: CaseView, state: RunState): Report {
  const kase = view.kase;
  const est = establishedFrom(view, state.found, state.accounts);
  const facts = factsOf(view, state.found);
  const left = uncleared(kase, facts);
  // M9: from Poached up the monologue has no theory of its own — only the
  // player's pencil — so a player who does not reason guesses among the ones
  // the notebook's plain placements leave standing.
  const guess = left.length > 0 ? (left[kase.seed % left.length] as Id) : null;
  const killerId =
    left.length === 1 ? (left[0] as Id) : verdictsOn(view) ? leadingTheory(view, est) : (state.theory ?? guess);
  const ticks = deathTicks(facts);
  const motive = est.motives.find((m) => m.personId === killerId) ?? est.motives[0];
  return {
    killerId,
    methodId: est.methodEvidence || givenFacts(kase).some((f) => f.kind === 'methodEvidence') ? kase.method.id : null,
    motiveType: motive?.motiveType ?? null,
    tick: ticks.length === 1 ? (ticks[0] as Tick) : null,
    placeId: kase.solution.murderPlaceId,
    entry: null,
    whereabouts: null,
    fate: null,
    goodsPlaceId: null,
  };
}
