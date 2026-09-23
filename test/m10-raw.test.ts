/**
 * M10 Part B — Raw teaches the real game (docs/23-m10-testimony.md).
 *
 * Raw's job is the one loop the whole game is: somebody lies about where they
 * were, somebody else's word catches it, and you put it to them. So at Raw
 * (and at Coddled, with the method):
 *
 * - the culprit's own account is on the par route and lies about the crime's
 *   half hour, and the watcher of the room it claims says the culprit was not
 *   there; that question carries no mark;
 * - every innocent is cleared by their own account and one sighting inside
 *   it, never by one line and never by an innocent they vouch for;
 * - the client points at an innocent the client knows;
 * - the hand is small, and the page never says "That cleared X" until two
 *   facts agree.
 */

import { describe, expect, it } from 'vitest';
import { clearedBy, crimeTicks, generateCase, solveHeld } from '../src/gen/index.js';
import type { Case, Fact, Id } from '../src/gen/types.js';
import { deductionOf, TIERS } from '../src/gen/shape.js';
import { buildView, gameBudget, gamePar, type CaseView } from '../src/game/derive.js';
import { canConfront, confrontOn, judgeConfront, placedAwayBy } from '../src/game/m9.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { renderPageText } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';

const raw = (seed: number): Case => generateCase(seed, { tier: 0 });
const coddled = (seed: number, level: 1 | 2 = 2): Case => generateCase(seed, { tier: 1, level });

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

function crimeLie(kase: Case) {
  return kase.logic?.lies.find((l) => l.personId === kase.solution.killerId && l.cover === 'crime');
}

describe('M10 Part B: the shape of a Raw night', () => {
  it('turns the lesson on at Raw and Coddled only', () => {
    expect(deductionOf(TIERS[0]).catchTheLie).toBe(true);
    expect(deductionOf(TIERS[1]).catchTheLie).toBe(true);
    for (const t of [2, 3, 4, 5] as const) expect(deductionOf(TIERS[t]).catchTheLie).toBeFalsy();
  });

  it('puts the culprit’s lie about the crime’s half hour on the par route, and the watcher’s word that breaks it, unmarked', () => {
    for (const kase of [...Array.from({ length: 40 }, (_, i) => raw(i + 1)), ...Array.from({ length: 20 }, (_, i) => coddled(i + 1))]) {
      const logic = kase.logic;
      expect(logic).toBeDefined();
      const killer = kase.solution.killerId;
      const M = kase.solution.murderTick;
      const lie = crimeLie(kase);
      expect(lie?.ticks).toContain(M);
      const par = new Set(logic?.solve.parRules ?? []);
      expect(par.has(lie?.accountId as Id)).toBe(true);
      expect(logic?.open).toHaveLength(1);
      const caught = kase.findable.find((c) => c.id === logic?.open?.[0]);
      expect(caught && par.has(caught.id)).toBe(true);
      // One witness, somebody posted at the room the culprit claims.
      const watcher = kase.people.find((p) => p.kind === 'fixture' && p.foundAt === lie?.claimed);
      expect(caught?.source).toMatchObject({ type: 'person', personId: watcher?.id });
      expect(
        caught?.establishes.some(
          (f: Fact) => f.kind === 'personNotAt' && f.personId === killer && f.place === lie?.claimed && lie?.ticks.includes(f.tick),
        ),
      ).toBe(true);
      // Unmarked: nothing leads to it.
      expect(kase.findable.some((c) => c.leadsTo.includes(caught?.id as Id))).toBe(false);
    }
  });

  it('clears every innocent on their own word and one sighting inside it, never on one line, never on each other', () => {
    for (const kase of [...Array.from({ length: 40 }, (_, i) => raw(i + 1)), ...Array.from({ length: 20 }, (_, i) => coddled(i + 1))]) {
      const logic = kase.logic;
      const killer = kase.solution.killerId;
      expect(logic?.solve.clearedByOne).toEqual([]);
      const par = logic?.solve.parRules ?? [];
      const byId = new Map(kase.findable.map((c) => [c.id, c]));
      const innocents = kase.people.filter((p) => p.kind === 'suspect' && p.id !== killer);
      // What the innocents' own words and the sightings clear, before the culprit is asked anything.
      const innocentRoute = par.filter((id) => id !== crimeLie(kase)?.accountId && !(logic?.open ?? []).includes(id));
      const cleared = clearedBy(kase, innocentRoute);
      const leansOn = new Map<Id, Id[]>();
      for (const p of innocents) {
        const rules = cleared[p.id];
        expect(rules, `${kase.seed} ${p.surname}`).toBeDefined();
        expect((rules ?? []).length).toBeGreaterThanOrEqual(2);
        const own = byId.get((rules ?? []).find((id) => byId.get(id)?.kind === 'account' && (byId.get(id)?.source as { personId: Id }).personId === p.id) ?? '');
        expect(own, `${kase.seed} ${p.surname} is cleared on their own word`).toBeDefined();
        leansOn.set(
          p.id,
          (rules ?? [])
            .map((id) => byId.get(id))
            .filter((c) => c?.kind === 'testimony')
            .map((c) => (c?.source as { personId: Id }).personId),
        );
      }
      for (const [p, on] of leansOn) {
        for (const q of on) expect(leansOn.get(q)?.includes(p) ?? false, `${kase.seed}: two innocents clear each other`).toBe(false);
      }
    }
  });

  it('has the client point at an innocent the client knows by name', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const kase = raw(seed);
      const target = kase.clientBrief.points.personId;
      expect(target).not.toBe(kase.solution.killerId);
      expect(target).not.toBe(kase.clientId);
      const edge = kase.logic?.acquaintance.find((e) => e.from === kase.clientId && e.to === target);
      expect(['name', 'relation']).toContain(edge?.strength);
    }
  });

  it('deals a small hand, a short night and a budget near ten', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const kase = raw(seed);
      expect(kase.findable.length).toBeGreaterThanOrEqual(12);
      expect(kase.findable.length).toBeLessThanOrEqual(15);
      expect(kase.findable.some((c) => c.establishes.some((f) => f.kind === 'hasMotive'))).toBe(false);
      expect(gamePar(kase)).toBeLessThanOrEqual(8);
      expect(gameBudget(kase)).toBeLessThanOrEqual(11);
    }
  });
});

describe('M10 Part B: the page at Raw', () => {
  it('never says "That cleared X" until two facts agree about the crime’s half hour itself', () => {
    let saidOnTwo = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const view = buildView(raw(seed));
      const run = playOracle(view);
      expect(run.ok, `seed ${seed}: ${run.reason}`).toBe(true);
      const found: Id[] = [];
      for (const page of run.state.log) {
        found.push(...page.found);
        const cleared = clearedBy(view.kase, found);
        for (const b of page.beats ?? []) {
          if (b.kind !== 'thought' || b.tag !== 'clears' || !b.rendered) continue;
          const who = b.personIds?.[0] as Id;
          expect((cleared[who] ?? []).length, `seed ${seed} p${page.n}: ${b.text}`).toBeGreaterThanOrEqual(2);
          // M10 A (the coordinator's read of seed 11): somebody else's word has
          // to cover the crime's half hour itself, not a sighting either side.
          for (const t of crimeTicks(solveHeld(view.kase, found))) {
            expect(placedAwayBy(view, found, who, t), `seed ${seed} p${page.n}: ${b.text}`).toBe(true);
          }
          saidOnTwo++;
        }
        const text = renderPageText(page, view, run.state);
        for (const p of view.kase.people) {
          if (!new RegExp(`cleared ${p.surname}\\b`).test(text)) continue;
          expect((cleared[p.id] ?? []).length, `seed ${seed} p${page.n} says it cleared ${p.surname}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
    // The route's corroborating sightings are chosen off the crime's half hour
    // (select.ts, teachTheLie), so on the oracle's route the page does not say
    // it at all today; see docs/23-m10-a-notes.md.
    // eslint-disable-next-line no-console
    console.log(`Raw pages that say "That cleared X": ${saidOnTwo}`);
  }, 120_000);

  it('offers "Put it to" at Raw, and the watcher’s word lands on the culprit, who never admits', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const view = buildView(raw(seed));
      expect(confrontOn(view)).toBe(true);
      const state = play(view, playOracle(view).steps.map((s) => s.command));
      const killer = view.kase.solution.killerId;
      expect(canConfront(view, state, killer)).toBe(true);
      const caught = view.kase.logic?.open?.[0] as Id;
      const judged = judgeConfront(view, state, killer, caught);
      expect(['second-lie', 'quiet']).toContain(judged.outcome);
    }
  });
});
