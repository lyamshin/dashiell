/**
 * Shorter nights (docs/24-shorter-nights.md): a second fact in the same
 * confrontation, for nothing, and the account that comes with the first
 * question. Par counts a confession as one call, an account riding on a
 * question as none, and the tier's par range still holds the M9 walk, so
 * the cases dealt are the cases M9 dealt.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import type { Id, Person } from '../src/gen/types.js';
import { deductionOf, dialsOf, logicSlackFor } from '../src/gen/shape.js';
import { buildView, threadsFor, type CaseView } from '../src/game/derive.js';
import { allChoices, choicesFor } from '../src/game/choices.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { accountClueOf, confessedOf, judgeConfront, lieKeyOf, partRef, pickFacts } from '../src/game/m9.js';
import { playOracle } from '../src/game/oracle.js';
import { lintRun } from '../src/game/reader-lint.js';
import { followUpOf, newRun, stepInput } from '../src/game/reducer.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { renderPageText } from '../src/game/transcript.js';
import type { Page, RunState } from '../src/game/types.js';

const tiered = (seed: number, tier: 0 | 1 | 2 | 3 | 4 | 5, level: 1 | 2 | 3 = 2): CaseView =>
  buildView(generateCase(seed, { tier, level, classic: true }));

const last = (state: RunState): Page => state.log[state.log.length - 1] as Page;

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

/** Walk to where somebody is found, from wherever the run stands. */
function goTo(view: CaseView, state: RunState, person: Person): RunState {
  const at = person.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
  return at && state.at !== person.foundAt ? stepInput(state, `go ${at}`, view).state : state;
}

/** Take every "Go on" a page offers. */
function goOn(view: CaseView, state: RunState): RunState {
  let s = state;
  for (let i = 0; i < 5 && (s.pending ?? []).some((p) => p.personId !== undefined || p.placeId === s.at); i++) {
    const next = stepInput(s, 'go on', view);
    if (next.page.found.length === 0) break;
    s = next.state;
  }
  return s;
}

const suspects = (view: CaseView): Person[] => view.kase.people.filter((p) => p.kind === 'suspect');

describe('Shorter nights §2: the account comes with the first question', () => {
  const views = [1, 2, 3, 4, 5, 6].flatMap((seed) => [tiered(seed, 2), tiered(seed, 5)]);

  it('the first question to a suspect, about anybody, ends with their own evening at no extra cost; their evening is then free, done and read back', () => {
    let checked = 0;
    for (const view of views) {
      let state = play(view, [`go ${view.placeById.get(view.startId)?.shortName}`]);
      for (const person of suspects(view).slice(0, 3)) {
        if (person.id === view.client.id) continue;
        const account = accountClueOf(view, person.id);
        if (!account) continue;
        state = goTo(view, state, person);
        if (state.reportOpen) break;
        const before = state.actionsUsed + state.waived;
        state = stepInput(state, `ask ${person.surname} about ${view.victim.surname}`, view).state;
        const page = last(state);
        // One call (or one waived), whatever the answer held.
        expect(state.actionsUsed + state.waived - before, `${view.kase.seed} ${person.surname}`).toBe(1);
        state = goOn(view, state);
        expect(state.found, `${view.kase.seed} ${person.surname}`).toContain(account.id);
        expect(state.accounts).toContain(person.id);
        // Their evening is the last thing told.
        const tellings = state.log.slice(page.n).flatMap((p) => (p.beats ?? []).filter((b) => b.kind === 'telling'));
        expect(tellings[tellings.length - 1]?.tag, `${view.kase.seed} ${person.surname}`).toBe('evening');
        // "Her evening" stays on the buttons, free and marked done.
        const evening = allChoices(choicesFor(view, state)).find(
          (c) => c.command === `ask ${person.surname} about that evening`,
        );
        expect(evening?.done).toBe(true);
        expect(evening?.minutes).toBe(0);
        const again = stepInput(state, `ask ${person.surname} about that evening`, view);
        expect(again.state.actionsUsed).toBe(state.actionsUsed);
        expect(again.page.shape).toBe('repeat');
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('asked about themselves first, a suspect gives their evening after their story', () => {
    let checked = 0;
    for (const view of views) {
      const person = suspects(view).find((p) => p.id !== view.client.id && accountClueOf(view, p.id));
      if (!person) continue;
      let state = play(view, [`go ${view.placeById.get(view.startId)?.shortName}`]);
      state = goTo(view, state, person);
      state = stepInput(state, `ask ${person.surname} about themselves`, view).state;
      state = goOn(view, state);
      expect(state.found).toContain(accountClueOf(view, person.id)?.id);
      checked++;
    }
    expect(checked).toBeGreaterThan(6);
  });

  it('a lead to somebody’s evening sends the detective to them with any question: every first question is marked', () => {
    let checked = 0;
    for (const view of views) {
      for (const person of suspects(view)) {
        const account = accountClueOf(view, person.id);
        const opener = account ? view.kase.findable.find((c) => c.leadsTo.includes(account.id)) : undefined;
        if (!account || !opener || !person.foundAt || person.id === view.client.id) continue;
        const base = newRun(view, { detectiveName: 'Dashiell' });
        const found = [...base.found, opener.id];
        const state: RunState = {
          ...base,
          at: person.foundAt,
          sceneSeen: true,
          clientInOffice: false,
          found,
          met: [...new Set([...base.met, ...view.kase.people.map((p) => p.id)])],
          threads: threadsFor(view, found),
        };
        const lead = state.threads.find((t) => t.clueId === account.id);
        expect(lead?.label).toBe(`Ask ${person.surname} anything`);
        const group = choicesFor(view, state).find((g) => g.kind === 'ask' && g.personId === person.id);
        const costed = [...(group?.choices ?? []), ...(group?.more ?? [])].filter((c) => c.minutes > 0 && !c.done);
        expect(costed.length).toBeGreaterThan(1);
        for (const c of costed) expect(c.lead, `${view.kase.seed} ${c.command}`).toBe(true);
        // Every topic still has its own place: the mark does not fold them into the lead.
        expect(costed.some((c) => c.command === `ask ${person.surname} about ${view.victim.surname}`)).toBe(true);
        checked++;
        break;
      }
    }
    expect(checked).toBeGreaterThan(3);
  });
});

/**
 * Every lie the case writes out: the oracle's route, then the liar asked
 * anything, then the first fact that lands put to them, then — for nothing —
 * `second`: the second fact the judge takes, or one it does not.
 */
function confrontRun(view: CaseView, second: 'right' | 'wrong'): { state: RunState; tried: number; follows: number } {
  // The oracle's route puts the facts in hand; the clock is set back so that
  // every lie the case writes out can be put before the DA is at the door.
  let state = play(view, playOracle(view).steps.map((s) => s.command));
  state = { ...state, actionsUsed: 0, waived: 0 };
  let tried = 0;
  let follows = 0;
  for (const c of view.kase.logic?.confrontations ?? []) {
    const person = view.personById.get(c.personId) as Person;
    if (state.reportOpen) break;
    state = goTo(view, state, person);
    state = goOn(view, stepInput(state, `ask ${person.surname} about that evening`, view).state);
    const facts = pickFacts(view, state, person.id);
    const first = facts.find((f) => {
      if ((state.confronts ?? []).some((r) => r.personId === person.id && r.clueId === f.clueId && r.part === f.part)) return false;
      const j = judgeConfront(view, state, person.id, f.clueId, f.part);
      return j.lieKey === lieKeyOf(c) && j.n === 0 && j.outcome !== 'withdraw' && j.outcome !== 'admit';
    });
    if (!first || state.reportOpen) continue;
    state = stepInput(state, `put ${partRef(first.clueId, first.part)} to ${person.surname}`, view).state;
    tried++;
    const follow = followUpOf(view, state);
    expect(follow?.personId).toBe(person.id);
    // The same picker, for nothing, and still nothing marked.
    const group = choicesFor(view, state).find((g) => g.kind === 'confront' && g.personId === person.id);
    expect(group?.heading.startsWith('Put another fact to')).toBe(true);
    expect(group?.follow).toBe(true);
    for (const ch of group?.choices ?? []) {
      expect(ch.minutes).toBe(0);
      expect(ch.lead).toBe(false);
    }
    const putBefore = (f: { clueId: Id; part: number }): boolean =>
      (state.confronts ?? []).some((r) => r.personId === person.id && r.clueId === f.clueId && r.part === f.part);
    const rest = pickFacts(view, state, person.id).filter((f) => f.clueId !== first.clueId && !putBefore(f));
    const pick = rest.find((f) => {
      const j = judgeConfront(view, state, person.id, f.clueId, f.part, { lieKey: lieKeyOf(c) });
      return second === 'right' ? j.outcome !== 'wrong' : j.outcome === 'wrong';
    });
    if (!pick) {
      // Nothing to put: looking round the room lets the offer go.
      state = stepInput(state, 'look', view).state;
      expect(followUpOf(view, state)).toBeNull();
      continue;
    }
    const before = state.actionsUsed;
    state = stepInput(state, `put ${partRef(pick.clueId, pick.part)} to ${person.surname}`, view).state;
    expect(state.actionsUsed).toBe(before);
    expect(state.confronts?.[state.confronts.length - 1]?.follow).toBe(true);
    expect(followUpOf(view, state)).toBeNull();
    follows++;
  }
  return { state, tried, follows };
}

describe('Shorter nights §1: a second fact in the same confrontation', () => {
  const views = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) => [tiered(seed, 4), tiered(seed, 5)]);

  it('a second real, independent fact brings the confession on that page, for nothing; the culprit never confesses', () => {
    let confessions = 0;
    let culprit = 0;
    let follows = 0;
    for (const view of views) {
      const run = confrontRun(view, 'right');
      follows += run.follows;
      for (const r of run.state.confronts ?? []) {
        if (r.personId === view.kase.solution.killerId) {
          expect(r.outcome === 'admit' || r.outcome === 'withdraw', `${view.kase.seed}`).toBe(false);
          if (r.follow) culprit++;
        } else if (r.follow && (r.outcome === 'admit' || r.outcome === 'withdraw')) {
          confessions++;
          expect(r.n).toBe(1);
          expect(confessedOf(run.state)).toContain(r.personId);
          expect(run.state.log[r.page]?.cost).toBe(0);
        }
      }
    }
    expect(follows).toBeGreaterThan(10);
    expect(confessions).toBeGreaterThan(5);
    expect(culprit).toBeGreaterThan(2);
  }, 120_000);

  it('a wrong second fact ends it with the story standing, and costs nothing more', () => {
    let ended = 0;
    for (const view of views.slice(0, 8)) {
      const run = confrontRun(view, 'wrong');
      for (const r of run.state.confronts ?? []) {
        if (!r.follow) continue;
        expect(r.outcome).toBe('wrong');
        const page = run.state.log[r.page] as Page;
        expect(page.cost).toBe(0);
        expect(renderPageText(page, view, run.state).replace(/\s+/g, ' ')).toContain('That’s all I’m going to say about it.');
        ended++;
      }
      // The story stands: nobody confessed on a wrong second fact.
      for (const r of run.state.confronts ?? []) if (r.follow) expect(r.outcome).toBe('wrong');
    }
    expect(ended).toBeGreaterThan(4);
  }, 120_000);

  it('closes the offer on anything else, and a fact put later costs the half hour again', () => {
    const view = tiered(3, 4);
    let state = play(view, ['go the walk-up', 'go the third floor', 'ask Rafferty about Hauck', 'go the speakeasy', 'ask Hauck about that evening']);
    const c = view.kase.logic?.confrontations.find((x) => x.personId === view.client.id);
    const held = new Set(state.found);
    const pick = (c?.contradictions ?? []).flat().find((id) => held.has(id)) as Id;
    state = stepInput(state, `put ${pick} to Hauck`, view).state;
    expect(followUpOf(view, state)?.personId).toBe(view.client.id);
    // The notebook changes nothing: the offer stands.
    state = stepInput(state, 'notebook', view).state;
    expect(followUpOf(view, state)?.personId).toBe(view.client.id);
    // A question closes it.
    state = stepInput(state, `ask Hauck about ${view.victim.surname}`, view).state;
    expect(followUpOf(view, state)).toBeNull();
    const group = choicesFor(view, state).find((g) => g.kind === 'confront' && g.personId === view.client.id);
    expect(group?.heading.startsWith('Put it to')).toBe(true);
  });

  it('covers every required beat, traces every page and lints clean', () => {
    const issues: string[] = [];
    let pages = 0;
    for (const view of views.slice(0, 10)) {
      for (const second of ['right', 'wrong'] as const) {
        const { state } = confrontRun(view, second);
        const cov = checkRunCoverage(view, state);
        pages += cov.pages;
        // `confrontRun` sets the clock back after the oracle's route, so the
        // page's own hour and the hour the checker adds up from the log's
        // costs disagree by design here; an hour card that names its hour
        // ("It was after four in the morning.") is then flagged against the
        // wrong clock. Everything else is checked.
        for (const i of cov.issues) {
          if (i.rule === 'hour-texture') continue;
          issues.push(`coverage ${view.kase.seed} p${i.page + 1} ${i.rule}: ${i.detail}`);
        }
        for (const v of checkRun(view, state)) issues.push(`correspondence ${view.kase.seed} ${v.where}: ${v.rule} ${v.detail}`);
        for (const l of lintRun(view, state)) issues.push(`lint ${view.kase.seed} ${JSON.stringify(l)}`);
      }
    }
    expect(issues.slice(0, 10)).toEqual([]);
    expect(pages).toBeGreaterThan(100);
  }, 300_000);
});

describe('Shorter nights: par and budget', () => {
  it('counts a confession as one call and an account riding on a question as none; the range holds the M9 walk', () => {
    let shorter = 0;
    let withConfession = 0;
    for (const tier of [0, 2, 4, 5] as const) {
      for (let seed = 1; seed <= 15; seed++) {
        const kase = generateCase(seed, { tier, level: 2 });
        const walk = kase.logic?.solve.walk as number;
        expect(walk).toBeDefined();
        expect(kase.par, `T${tier} ${seed}`).toBeLessThanOrEqual(walk);
        const { shape, ladder } = dialsOf(kase);
        const [lo, hi] = deductionOf(shape).par;
        expect(walk).toBeGreaterThanOrEqual(lo);
        expect(walk).toBeLessThanOrEqual(hi);
        expect(kase.budget).toBe(kase.par + logicSlackFor(shape, ladder, kase.par, walk));
        if (kase.par < walk) shorter++;
        if ((kase.logic?.solve.confessions.length ?? 0) > 0) {
          withConfession++;
          expect(kase.par, `T${tier} ${seed}`).toBeLessThan(walk);
        }
      }
    }
    expect(withConfession).toBeGreaterThan(5);
    expect(shorter).toBeGreaterThan(20);
  }, 120_000);

  it('the oracle still walks the spine within the shorter par', () => {
    for (const tier of [0, 2, 4, 5] as const) {
      for (let seed = 1; seed <= 8; seed++) {
        const r = playOracle(tiered(seed, tier));
        expect(r.ok, `T${tier} ${seed}: ${r.reason}`).toBe(true);
      }
    }
  }, 120_000);
});
