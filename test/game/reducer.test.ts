import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import { buildView, leadFor, threadsFor } from '../../src/game/derive.js';
import { clockAfter, minutesAfter, minutesPerAction } from '../../src/game/clock.js';
import { answersTo, newRun, planThread, step, stepInput } from '../../src/game/reducer.js';
import { scoreReport } from '../../src/game/scoring.js';
import { buildNotebook } from '../../src/game/notebook.js';
import type { RunState } from '../../src/game/types.js';

const view = buildView(generateCase(7, { difficulty: 2 }));
const fresh = (): RunState => newRun(view, { detectiveName: 'Humphrey' });

function run(state: RunState, ...inputs: string[]): RunState {
  let s = state;
  for (const input of inputs) s = stepInput(s, input, view).state;
  return s;
}

describe('the opening spread', () => {
  it('deals the three starting clues, free, at the scene', () => {
    const state = fresh();
    expect(state.at).toBe(view.kase.solution.murderPlaceId);
    expect(state.actionsUsed).toBe(0);
    expect(state.found).toEqual(view.kase.starting);
    expect(state.log).toHaveLength(1);
  });

  it('hands the player leads to start from', () => {
    expect(fresh().threads.length).toBeGreaterThan(0);
  });

  it('renders the clue text verbatim and nothing else as a clue', () => {
    const state = fresh();
    const printed = state.log[0]?.blocks.filter((b) => b.kind === 'clue') ?? [];
    expect(printed).toHaveLength(view.kase.starting.length);
    for (const block of printed) {
      const clue = view.findableById.get((block as { clueId: string }).clueId);
      expect((block as { text: string }).text).toBe(clue?.text);
    }
  });
});

describe('what an action costs', () => {
  it('charges one for travel and none for standing still', () => {
    const state = fresh();
    const elsewhere = view.kase.places.find((p) => p.id !== state.at);
    const moved = stepInput(state, `go ${elsewhere?.shortName}`, view);
    expect(moved.page.cost).toBe(1);
    expect(moved.state.at).toBe(elsewhere?.id);
    const again = stepInput(moved.state, `go ${elsewhere?.shortName}`, view);
    expect(again.page.cost).toBe(0);
  });

  it('charges one for a question, answered or not', () => {
    const state = fresh();
    const here = view.peopleAt.get(state.at) ?? [];
    const person = view.personById.get(here[0] ?? '');
    if (!person) return;
    const answered = stepInput(state, `ask ${person.surname} about that evening`, view);
    expect(answered.page.cost).toBe(1);
    const nothing = stepInput(
      answered.state,
      `ask ${person.surname} about ${view.kase.objects[0]?.name}`,
      view,
    );
    expect(nothing.page.cost).toBe(1);
  });

  it('charges one for a search, and nothing the room has left is still one', () => {
    let state = fresh();
    state = run(state, 'examine');
    expect(state.actionsUsed).toBe(1);
    const before = state.found.length;
    state = run(state, 'examine');
    expect(state.actionsUsed).toBe(2);
    expect(state.found.length).toBe(before);
  });

  it('charges nothing for look, notebook or help', () => {
    let state = fresh();
    for (const free of ['look', 'notebook', 'help']) {
      const result = stepInput(state, free, view);
      expect(result.page.cost, free).toBe(0);
      state = result.state;
    }
    expect(state.actionsUsed).toBe(0);
  });
});

describe('clue delivery', () => {
  it('delivers a clue once and only once', () => {
    const doyle = view.kase.people.find((p) => p.fixtureRole === 'bartender');
    if (!doyle) return;
    let state = fresh();
    state = run(state, `go ${view.placeById.get(doyle.foundAt as string)?.shortName}`);
    const topics = [...(view.exactBuckets.get(doyle.id)?.keys() ?? [])];
    const topic = topics[0] as string;
    const first = stepInput(state, `ask ${doyle.surname} about ${topic}`, view);
    expect(first.page.found.length).toBeGreaterThan(0);
    const second = stepInput(first.state, `ask ${doyle.surname} about ${topic}`, view);
    expect(second.page.found).toEqual([]);
    expect(second.page.cost).toBe(1);
  });

  it('gives one question every clue filed under it', () => {
    for (const [personId, byTopic] of view.exactBuckets) {
      for (const [topic, clues] of byTopic) {
        const answers = answersTo(view, personId, { kind: 'exact', personId, topic }, []);
        expect(answers.map((c) => c.id).sort()).toEqual(clues.map((c) => c.id).sort());
      }
    }
  });

  it('gives a room every clue it has left, in one action', () => {
    const scene = view.kase.solution.murderPlaceId;
    const atScene = (view.placeClues.get(scene) ?? []).map((c) => c.id);
    const state = fresh();
    const result = stepInput(state, 'examine', view);
    const expected = atScene.filter((id) => !state.found.includes(id));
    expect(result.page.found.sort()).toEqual(expected.sort());
  });
});

describe('threads', () => {
  it('opens a lead for every unfound clue the found ones point at', () => {
    const state = fresh();
    const pointedAt = new Set<string>();
    for (const id of state.found) {
      for (const target of view.findableById.get(id)?.leadsTo ?? []) {
        if (!state.found.includes(target)) pointedAt.add(target);
      }
    }
    const covered = new Set(state.threads.map((t) => t.command));
    for (const id of pointedAt) {
      const clue = view.findableById.get(id);
      if (!clue) continue;
      expect(covered).toContain(leadFor(view, clue).command);
    }
  });

  it('closes a lead once its clue is in hand', () => {
    let state = fresh();
    const thread = state.threads[0];
    if (!thread) return;
    for (const command of planThread(state, thread)) state = run(state, command);
    expect(state.found).toContain(thread.clueId);
    expect(state.threads.some((t) => t.clueId === thread.clueId)).toBe(false);
  });

  it('plans travel first when the lead is in another room, as two actions', () => {
    const state = fresh();
    const elsewhere = state.threads.find((t) => t.placeId !== state.at);
    if (!elsewhere) return;
    expect(planThread(state, elsewhere)).toHaveLength(2);
    const here = state.threads.find((t) => t.placeId === state.at);
    if (here) expect(planThread(state, here)).toHaveLength(1);
  });

  it('collapses two clues one question would answer into one lead', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 10; seed++) {
        const v = buildView(generateCase(seed, { difficulty }));
        const all = v.kase.findable.map((c) => c.id);
        const leads = threadsFor(v, all.slice(0, 0));
        expect(leads).toEqual([]);
        const everything = threadsFor(v, all);
        expect(everything).toEqual([]);
      }
    }
  });
});

describe('the clock', () => {
  it('lands on eight o’clock on the last action, for every budget in 13..20', () => {
    for (let budget = 13; budget <= 20; budget++) {
      expect(minutesAfter(budget, budget)).toBe(480);
      expect(clockAfter(budget, budget)).toBe('8:00 AM');
      expect(minutesAfter(0, budget)).toBe(0);
      expect(clockAfter(0, budget)).toBe('12:00 AM');
      // Monotonic, and never past the deadline.
      let previous = -1;
      for (let used = 0; used <= budget; used++) {
        const now = minutesAfter(used, budget);
        expect(now).toBeGreaterThanOrEqual(previous);
        expect(now).toBeLessThanOrEqual(480);
        expect(now % 5).toBe(0);
        previous = now;
      }
      // The nominal step the running head quotes.
      expect(minutesPerAction(budget) % 5).toBe(0);
      expect(Math.abs(minutesPerAction(budget) - 480 / budget)).toBeLessThanOrEqual(2.5);
    }
  });

  it('opens the report when the budget runs out', () => {
    let state = fresh();
    const elsewhere = view.kase.places.filter((p) => p.id !== state.at);
    let i = 0;
    while (state.actionsUsed < view.kase.budget) {
      const target = elsewhere[i % elsewhere.length];
      state = run(state, `go ${target?.shortName}`);
      i++;
    }
    expect(state.actionsUsed).toBe(view.kase.budget);
    expect(state.reportOpen).toBe(true);
    expect(buildNotebook(view, state).clock.time).toBe('8:00 AM');
    expect(buildNotebook(view, state).clock.actionsLeft).toBe(0);
  });
});

describe('the report', () => {
  const truth = view.kase.solution;

  it('scores five out of five and hangs the killer', () => {
    const verdict = scoreReport(view, fresh(), {
      killerId: truth.killerId,
      methodId: truth.methodId,
      motiveType: truth.motiveType,
      tick: truth.murderTick,
      placeId: truth.murderPlaceId,
    });
    expect(verdict.points).toBe(5);
    expect(verdict.outcome).toBe('solved');
    expect(verdict.closing.join(' ')).toContain('hangs');
  });

  it('hangs the wrong man when the wrong man is named', () => {
    const innocent = view.kase.people.find((p) => p.kind === 'suspect' && !p.isKiller);
    const verdict = scoreReport(view, fresh(), {
      killerId: innocent?.id ?? null,
      methodId: truth.methodId,
      motiveType: truth.motiveType,
      tick: truth.murderTick,
      placeId: truth.murderPlaceId,
    });
    expect(verdict.points).toBe(4);
    expect(verdict.outcome).toBe('wrong-man');
    expect(verdict.closing.join(' ')).toContain('wrong man');
    // It says who really did it.
    expect(verdict.closing.join(' ')).toContain(
      view.personById.get(truth.killerId)?.surname as string,
    );
  });

  it('convicts on a thin case when the killer is right and the rest is not', () => {
    const verdict = scoreReport(view, fresh(), {
      killerId: truth.killerId,
      methodId: null,
      motiveType: null,
      tick: null,
      placeId: truth.murderPlaceId,
    });
    expect(verdict.outcome).toBe('thin');
    expect(verdict.points).toBe(2);
    expect(verdict.closing.join(' ')).toMatch(/thin/);
  });

  it('goes cold when the killer is left blank', () => {
    const verdict = scoreReport(view, fresh(), {
      killerId: null,
      methodId: truth.methodId,
      motiveType: truth.motiveType,
      tick: truth.murderTick,
      placeId: truth.murderPlaceId,
    });
    expect(verdict.outcome).toBe('cold');
    expect(verdict.points).toBe(4);
    expect(verdict.closing.join(' ')).toContain('cold');
  });

  it('compares the night against par', () => {
    const state = fresh();
    const verdict = scoreReport(view, { ...state, actionsUsed: view.kase.par + 3 }, {
      killerId: truth.killerId,
      methodId: truth.methodId,
      motiveType: truth.motiveType,
      tick: truth.murderTick,
      placeId: truth.murderPlaceId,
    });
    expect(verdict.closing.join(' ')).toContain(String(view.kase.par));
  });
});

describe('the notebook', () => {
  it('narrows the time of death as the facts come in', () => {
    const state = fresh();
    const book = buildNotebook(view, state);
    expect(book.established.death).not.toBe('Nothing established yet.');
    expect(book.clock.actionsLeft).toBe(view.kase.budget);
  });

  it('flags a contradiction only once both halves are in hand', () => {
    // Take a claim and then a clue that denies it.
    const killer = view.kase.people.find((p) => p.isKiller);
    if (!killer) return;
    let state = fresh();
    const denial = view.kase.findable.find((c) =>
      c.establishes.some((f) => f.kind === 'personNotAt' && f.personId === killer.id),
    );
    if (!denial || denial.source.type !== 'person') return;
    const teller = view.personById.get(denial.source.personId);
    state = run(
      state,
      `go ${view.placeById.get(teller?.foundAt as string)?.shortName}`,
      `ask ${teller?.surname} about ${denial.source.topic}`,
    );
    const before = buildNotebook(view, state).people.find((p) => p.id === killer.id);
    expect(before?.facts.some((f) => f.contradicts)).toBe(false);

    state = run(
      state,
      `go ${view.placeById.get(killer.foundAt as string)?.shortName}`,
      `ask ${killer.surname} about that evening`,
    );
    const after = buildNotebook(view, state).people.find((p) => p.id === killer.id);
    expect(after?.account).not.toBeNull();
    expect(after?.facts.some((f) => f.contradicts)).toBe(true);
  });
});

describe('every budget in the corpus', () => {
  it('runs the clock and the actions out together', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const v = buildView(generateCase(seed, { difficulty }));
        expect(v.kase.budget).toBeGreaterThanOrEqual(13);
        expect(v.kase.budget).toBeLessThanOrEqual(20);
        expect(clockAfter(v.kase.budget, v.kase.budget)).toBe('8:00 AM');
        expect(clockAfter(v.kase.budget - 1, v.kase.budget)).not.toBe('8:00 AM');
      }
    }
  });
});

describe('step is pure', () => {
  it('leaves the state it was given alone', () => {
    const state = fresh();
    const snapshot = JSON.stringify(state);
    step(state, { kind: 'examine', placeId: state.at }, view);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
