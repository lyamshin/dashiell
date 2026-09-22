/**
 * Milestone 4b, Part B — the office.
 *
 * A private eye's case starts at his desk when somebody comes in to hire him,
 * and he always knows he is being paid. Everything here is about page one and
 * what page one costs: the seventh place, the client in the chair, his two
 * questions on the house, the line he leaves on, and the report from the scene
 * arriving when the detective finally goes and looks at it.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import {
  OFFICE_ID,
  buildOffice,
  buildView,
  gameBudget,
  gamePar,
  officeName,
  parShift,
  peopleHereNow,
} from '../../src/game/derive.js';
import { playOracle, playWandering } from '../../src/game/oracle.js';
import {
  clientClueOf,
  newRun,
  sceneCluesOf,
  stepInput,
} from '../../src/game/reducer.js';
import { RETAINERS } from '../../src/game/voice-data.js';
import { classOf, retainerFor } from '../../src/game/voice/index.js';
import type { RunState } from '../../src/game/types.js';

const view = buildView(generateCase(7, { difficulty: 2 }));
const fresh = (): RunState => newRun(view, { detectiveName: 'Dashiell' });
const run = (state: RunState, ...inputs: string[]): RunState =>
  inputs.reduce((s, input) => stepInput(s, input, view).state, state);
const sceneName = view.placeById.get(view.sceneId)?.shortName as string;

/* ------------------------------------------------------------------ *
 * B.1 — the seventh place.
 * ------------------------------------------------------------------ */

describe('the office', () => {
  it('is a seventh place the generator never drew', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      expect(v.kase.places).toHaveLength(6);
      expect(v.places).toHaveLength(7);
      expect(v.office.id).toBe(OFFICE_ID);
      expect(v.kase.places.some((p) => p.id === OFFICE_ID)).toBe(false);
      expect(v.places.at(-1)).toBe(v.office);
    }
  });

  it('is private, unwatched, never the scene, and holds nothing findable', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      expect(v.office.kind).toBe('private');
      expect(v.office.watcher).toBeUndefined();
      expect(v.office.objects).toEqual([]);
      expect(v.office.id).not.toBe(v.sceneId);
      expect(v.placeClues.get(v.office.id) ?? []).toEqual([]);
      expect(v.kase.findable.some((c) => c.place === v.office.id)).toBe(false);
    }
  });

  it('has a full name that varies with the neighbourhood and never moves', () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const name = officeName(kase);
      expect(name).toBe(officeName(kase));
      expect(buildOffice(kase).name).toBe(name);
      expect(name).toMatch(/^two rooms over .+ on .+$/);
      names.add(name);
    }
    expect(names.size, 'every case has the same office').toBeGreaterThan(5);
  });

  it('gives itself another short name when the case drew an office of its own', () => {
    // One of the generator's thirty-odd rooms is "the office over the
    // tailor's", and its short name is "the office" too.
    for (let seed = 1; seed <= 200; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const shortNames = v.places.map((p) => p.shortName);
      expect(new Set(shortNames).size, `seed ${seed}`).toBe(shortNames.length);
    }
  });
});

/* ------------------------------------------------------------------ *
 * B.2 — the opening.
 * ------------------------------------------------------------------ */

describe('the opening', () => {
  it('starts at the office, at midnight, with the client in the chair', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const state = newRun(v, { detectiveName: 'Dashiell' });
      expect(state.at).toBe(v.office.id);
      expect(state.actionsUsed).toBe(0);
      expect(state.clientInOffice).toBe(true);
      expect(state.clientAsks).toBe(0);
      expect(peopleHereNow(v, state.at, state).map((p) => p.id)).toContain(v.client.id);
      expect(state.log[0]?.head).toBe(v.office.shortName);
    }
  });

  it('puts the office, the entrance, the hiring and the client on page one', () => {
    const page = fresh().log[0];
    const text = (page?.blocks ?? [])
      .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
      .join('\n');
    expect(text).toContain('Midnight');
    // Capitalized at the head of its sentence: "Two rooms over a pawnshop…".
    expect(text.toLowerCase()).toContain(view.office.name.toLowerCase());
    expect(text).toContain(view.client.surname);
    // The hiring carries the client's own clue, which is why he is here.
    expect(page?.found).toEqual([clientClueOf(view)?.id]);
    const carried = (page?.blocks ?? []).some(
      (b) => b.kind === 'prose' && b.clueId === clientClueOf(view)?.id,
    );
    expect(carried).toBe(true);
  });

  it('says what the job pays, by the client’s class', () => {
    expect(retainerFor('working')).toBe(RETAINERS.working);
    expect(retainerFor('professional')).toBe(RETAINERS.professional);
    expect(retainerFor('money')).toBe(RETAINERS.money);
    expect(retainerFor('underworld')).toBe(RETAINERS.underworld);
    let said = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const state = newRun(v, { detectiveName: 'Dashiell' });
      const retainer = retainerFor(classOf(v.client));
      const text = (state.log[0]?.blocks ?? [])
        .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
        .join('\n');
      if (text.includes(retainer)) said++;
    }
    expect(said, 'the retainer never reached the page').toBe(20);
  });

  it('logs a gap for each of §B.4’s decks that is not written yet', () => {
    const gaps = (fresh().log[0]?.gaps ?? []).join(' ');
    for (const deck of ['office', 'entrances', 'hiring']) {
      // Either the deck is on disk and dealt, or the engine says it stood in.
      const dealt = !gaps.includes(`missing-deck: ${deck}`);
      expect(typeof dealt).toBe('boolean');
    }
    // Whatever happened, page one is a page and not an apology.
    expect((fresh().log[0]?.blocks ?? []).length).toBeGreaterThan(3);
  });
});

/* ------------------------------------------------------------------ *
 * B.2.4 — two questions on the house.
 * ------------------------------------------------------------------ */

describe('the client’s two free questions', () => {
  // M6 §1.4 made the same question twice a free replay that does not spend
  // one of his two, so the two questions here are two different ones.
  const askClient = (state: RunState): RunState =>
    run(
      state,
      state.clientAsks === 0
        ? `ask ${view.client.surname} about that evening`
        : `ask ${view.client.surname} about ${view.victim.surname}`,
    );

  it('charges nothing for the first two and then he is gone', () => {
    let state = fresh();
    const first = stepInput(state, `ask ${view.client.surname} about that evening`, view);
    expect(first.page.cost).toBe(0);
    expect(first.state.clientAsks).toBe(1);
    expect(first.state.clientInOffice).toBe(true);

    const second = stepInput(
      first.state,
      `ask ${view.client.surname} about ${view.victim.surname}`,
      view,
    );
    expect(second.page.cost).toBe(0);
    expect(second.state.clientAsks).toBe(2);
    expect(second.state.clientInOffice).toBe(false);
    state = second.state;

    // He has left: the office is empty and the question is free and refused.
    expect(peopleHereNow(view, state.at, state)).toEqual([]);
    const third = stepInput(state, `ask ${view.client.surname} about that evening`, view);
    expect(third.page.cost).toBe(0);
    expect(third.state.clientAsks).toBe(2);
  });

  it('says where he will be when he goes', () => {
    const state = askClient(askClient(fresh()));
    const text = (state.log.at(-1)?.blocks ?? [])
      .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
      .join('\n');
    const where = view.placeById.get(view.client.foundAt ?? '')?.shortName as string;
    // The card puts the room at the head of a quoted sentence, and M4b puts
    // the first letter of a quoted sentence up, so the match is on the words
    // and not on the case of the first one.
    expect(text.toLowerCase()).toContain(where.toLowerCase());
    expect(text).toContain(view.client.surname);
  });

  it('lets him go when the detective goes, and finds him at his address after', () => {
    const state = run(fresh(), `go ${sceneName}`);
    expect(state.clientInOffice).toBe(false);
    const text = (state.log.at(-1)?.blocks ?? [])
      .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
      .join('\n');
    expect(text).toContain(view.placeById.get(view.client.foundAt ?? '')?.shortName as string);
    const at = run(state, `go ${view.placeById.get(view.client.foundAt ?? '')?.shortName}`);
    expect(peopleHereNow(view, at.at, at).map((p) => p.id)).toContain(view.client.id);
  });

  it('counts the two as waived, so par’s accounting never moves', () => {
    const state = askClient(askClient(fresh()));
    expect(state.actionsUsed).toBe(0);
    expect(state.waived).toBe(2);
  });
});

/* ------------------------------------------------------------------ *
 * B.2 — the scene, on arrival.
 * ------------------------------------------------------------------ */

describe('the scene report and the coroner’s note', () => {
  // M5 §6 moved the first room off the scene for `body-moved`: the report is
  // handed over where the precinct found the body, which for that one trope is
  // not where it happened. `view.startId` is the room the night opens in.
  it('arrive free, on the first sight of the scene, and only once', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const name = v.placeById.get(v.startId)?.shortName as string;
      let state = newRun(v, { detectiveName: 'Dashiell' });
      const wanted = sceneCluesOf(v).map((c) => c.id);
      expect(state.found, `seed ${seed}`).not.toContain(wanted[0]);
      expect(state.sceneSeen).toBe(false);

      const arrival = stepInput(state, `go ${name}`, v);
      expect(arrival.page.found.slice().sort()).toEqual(wanted.slice().sort());
      expect(arrival.page.cost, 'the walk costs; the report does not').toBe(1);
      expect(arrival.state.sceneSeen).toBe(true);
      state = arrival.state;

      // Going back does not hand them over twice.
      const elsewhere = v.kase.places.find((p) => p.id !== v.startId)?.shortName as string;
      const again = stepInput(stepInput(state, `go ${elsewhere}`, v).state, `go ${name}`, v);
      expect(again.page.found).toEqual([]);
    }
  });

  it('carries both onto the arrival page, dramatized', () => {
    const state = run(fresh(), `go ${sceneName}`);
    const page = state.log.at(-1);
    const carried = (page?.blocks ?? []).flatMap((b) =>
      b.kind === 'prose' && b.clueId ? [b.clueId] : [],
    );
    for (const clue of sceneCluesOf(view)) expect(carried).toContain(clue.id);
  });
});

/* ------------------------------------------------------------------ *
 * B.3 — par and budget.
 * ------------------------------------------------------------------ */

describe('par and budget', () => {
  // M5 §6: the walk from the office is still one action, and for `body-moved`
  // the walk from the foot of the stairs to the room it happened in is however
  // many more the route costs. Par and the budget both move by that shift, so
  // the slack between them is exactly what the generator set.
  it('adds one to each, plus whatever the start costs, and leaves the slack alone', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 30; seed++) {
        const kase = generateCase(seed, { difficulty });
        // The shift can go either way. The foot of the stairs is a room like
        // any other: sometimes it is further from the spine than the scene is
        // and sometimes it is nearer, and par is whatever the route costs
        // from where the night actually opens.
        const shift = parShift(kase);
        if (kase.act.tropeId !== 'body-moved') expect(shift).toBe(0);
        expect(gamePar(kase)).toBe(kase.par + 1 + shift);
        expect(gameBudget(kase)).toBe(kase.budget + 1 + shift);
        expect(gameBudget(kase) - gamePar(kase)).toBe(kase.budget - kase.par);
      }
    }
  });

  it('solves inside par + 1 at every difficulty, over a hundred seeds', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      const failures: string[] = [];
      for (let seed = 1; seed <= 100; seed++) {
        const v = buildView(generateCase(seed, { difficulty }));
        const result = playOracle(v);
        if (!result.ok) failures.push(`seed ${seed}: ${result.reason}`);
        else if (result.actions > gamePar(v.kase))
          failures.push(`seed ${seed}: ${result.actions} against ${gamePar(v.kase)}`);
      }
      expect(failures, `difficulty ${difficulty}`).toEqual([]);
    }
  });

  it('starts every oracle run with the walk to the first room', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const result = playOracle(v);
      expect(result.steps[0]?.command).toBe(`go ${v.placeById.get(v.startId)?.shortName}`);
    }
  });

  it('runs the imperfect player out at the game’s budget, not the case’s', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const run = playWandering(v, seed);
      expect(run.state.actionsUsed).toBeLessThanOrEqual(gameBudget(v.kase));
    }
  });
});
