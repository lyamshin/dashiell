/**
 * docs/40 — legible play: "Put it to" says what happened, stars last all
 * night with a reason, and a page offers fewer choices (a person first, then
 * a topic). All on the v2 engine; v1 keeps its own tests.
 */
import { describe, expect, it } from 'vitest';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { contradicts, generateCase } from '../src/gen/index.js';
import { choicesFor, costLabel, allChoices, type ChoiceGroup } from '../src/game/choices.js';
import { clockMinutes, SHORT_MINUTES } from '../src/game/clock.js';
import { buildView, gameBudget, type CaseView } from '../src/game/derive.js';
import { closedSteps, openFacts, REASON_WORDS, STAR_LIMIT } from '../src/game/guidance.js';
import { judgeConfront } from '../src/game/m9.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle } from '../src/game/oracle.js';
import { caseOptions, type TierKey } from '../src/game/profile.js';
import { newRun, priceOf, stepInput } from '../src/game/reducer.js';
import { renderPageBody } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';

const views = new Map<string, CaseView>();
function viewOf(seed: number, tier: TierKey, which: 'v1' | 'v2' = 'v2'): CaseView {
  const engine = which === 'v2' ? ('v2' as const) : undefined;
  const key = `${seed}|${tier}|${which}`;
  let v = views.get(key);
  if (!v) {
    const level = tier === 0 ? 1 : 2;
    v = buildView(generateCase(seed, { ...caseOptions({ tier, level, ...(engine ? { engine } : {}) }), detectiveName: 'Dashiell' }));
    views.set(key, v);
  }
  return v;
}

function run(view: CaseView, commands: readonly string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

const lastPage = (view: CaseView, state: RunState): string =>
  renderPageBody(state.log[state.log.length - 1]!, view).replace(/\s+/g, ' ');

function memoryIo(): PlayIo {
  const files = new Map<string, string>();
  return { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** The playtester's night on seed 3 (round 2), up to the put the engine refused. */
const COUNT3 = [
  'ask Hauck about that evening', 'ask Hauck about Steinbach', 'go Sirkin’s place', 'examine Sirkin’s place', 'go the Velvet Room',
  "ask Hauck who's here", 'ask Marchetti about that evening', 'ask Hargrove about the Velvet Room', 'go over what I have',
  'go the third floor', 'ask Rafferty about the third floor', 'ask Rafferty about Marchetti', 'examine the third floor', 'go the Velvet Room',
];

/** A night on seed 3 by hand (docs/40, "Built"): a count put with a face lands, a count alone holds. */
const HAND3 = [
  'ask Hauck about that evening', 'go the Velvet Room', 'ask Hargrove about Steinbach', 'ask Hargrove about Hauck',
  'ask Marchetti about that evening', 'go the third floor', 'ask Rafferty about the third floor', 'go the Velvet Room',
];

const NIGHTS: [number, TierKey][] = [
  [11, 0],
  [2, 2],
  [3, 4],
  [21, 4],
];

describe('§1 "Put it to" says what happened', () => {
  it('a count and a face seen there then break a story together (the playtester’s put on seed 3)', () => {
    const view = viewOf(3, 4);
    const state = run(view, COUNT3);
    const marchetti = view.kase.people.find((p) => p.surname === 'Marchetti')!;
    const judged = judgeConfront(view, state, marchetti.id, 'w108', 0);
    expect(judged.outcome).not.toBe('wrong');
    expect(judged.pair?.fact.kind).toBe('describedAt');
    // The generator's solver, which deals the cases, is unchanged: without
    // the pair it needs the man named first, and the case deals as before.
    const claim = { personId: marchetti.id, place: 'walkup-flat', ticks: [3, 4, 5] as (0 | 3 | 4 | 5)[] };
    expect(contradicts(view.kase, [...state.found], claim, { soft: true }).yes).toBe(false);
    expect(contradicts(view.kase, [...state.found], claim, { soft: true, pairs: true }).yes).toBe(true);
    const after = stepInput(state, 'put w108 part 0 to Marchetti', view).state;
    const page = lastPage(view, after);
    expect(page).toMatch(/Rafferty counted one at the third floor at half past eight\. And the one she saw there then was a man in his thirties\./);
    expect(page).toMatch(/hole in the first story, and she knew it|story had broken/);
  });

  it('a fact that breaks nothing ends on one plain line saying why', () => {
    const view = viewOf(3, 4);
    let state = run(view, [...HAND3, 'ask Hargrove about the Velvet Room', 'ask Crowninshield about that evening']);
    const crown = view.kase.people.find((p) => p.surname === 'Crowninshield')!;
    // Hargrove's count at the Velvet Room at half past eight, where she says she was.
    const count = state.found
      .map((id) => view.findableById.get(id)!)
      .find((c) => c.establishes.some((f) => f.kind === 'countAt' && f.place === 'speakeasy' && f.tick === 5))!;
    expect(count).toBeDefined();
    const part = (count.ruleParts ?? []).findIndex((p) => p.facts.some((k) => {
      const f = count.establishes[k];
      return f?.kind === 'countAt' && f.tick === 5;
    }));
    const cmd = `put ${count.id} part ${Math.max(0, part)} to Crowninshield`;
    expect(judgeConfront(view, state, crown.id, count.id, Math.max(0, part)).outcome).toBe('wrong');
    state = stepInput(state, cmd, view).state;
    expect(lastPage(view, state)).toMatch(/A count of three doesn’t say who\. I’d have to put three others at the Velvet Room at half past eight first\./);
  });

  it('every put on the oracle’s nights and a sweep of wrong ones ends on a line that says what happened', () => {
    for (const [seed, tier] of NIGHTS) {
      const view = viewOf(seed, tier);
      let state = newRun(view, { detectiveName: 'Dashiell' });
      let wrong = 0;
      for (const s of playOracle(view).steps) {
        state = stepInput(state, s.command, view).state;
        if (state.reportOpen) break;
        // Put the first fact on the page to everybody here whose story is written down.
        const put = choicesFor(view, state).find((g) => g.kind === 'confront');
        if (!put || wrong >= 3) continue;
        const fact = put.choices.find((c) => !c.done);
        if (!fact) continue;
        const r = stepInput(state, fact.command, view);
        const page = renderPageBody(r.page, view).replace(/\s+/g, ' ');
        const record = (r.state.confronts ?? [])[(r.state.confronts ?? []).length - 1];
        if (record?.outcome === 'wrong') {
          wrong++;
          // The line after their words is the detective's why, never empty.
          expect(page, `${seed}/${tier}: ${fact.command}`).toMatch(/“That doesn’t touch anything I told you\.”|That’s all I’m going to say about it/);
          const why = page.split(/”\s+/).slice(1).join(' ');
          expect(why.length, page).toBeGreaterThan(20);
        } else if (record) {
          expect(page).toMatch(/knew it|refusal|Silence|kept to it|kept to the story|hole/);
        }
      }
    }
  });
});

describe('§2 stars last while their step is open, with a reason', () => {
  it('at most three a page; every star has a reason of eight words or fewer; a star is only ever on an open step', () => {
    for (const [seed, tier] of NIGHTS) {
      const view = viewOf(seed, tier);
      let state = newRun(view, { detectiveName: 'Dashiell' });
      let pagesWithStars = 0;
      let pages = 0;
      for (const s of playOracle(view).steps) {
        if (state.reportOpen) break;
        const all = allChoices(choicesFor(view, state));
        const starred = all.filter((c) => c.lead);
        expect(starred.length).toBeLessThanOrEqual(STAR_LIMIT);
        for (const c of starred) {
          expect(c.why, c.command).toBeDefined();
          expect((c.why ?? '').split(/\s+/).length, c.why).toBeLessThanOrEqual(REASON_WORDS);
        }
        if (openFacts(view, state).size > 0) {
          pages++;
          if (starred.length > 0) pagesWithStars++;
        }
        state = stepInput(state, s.command, view).state;
      }
      // Stars no longer run out with the leads: while anything is open, a page has one.
      expect(pagesWithStars / Math.max(1, pages), `${seed}/${tier}`).toBeGreaterThan(0.8);
    }
  });

  it('a step the notebook has closed stars nothing', () => {
    const view = viewOf(3, 4);
    const state = run(view, playOracle(view).steps.map((s) => s.command));
    const closed = closedSteps(view, state);
    expect(closed.has('when::5:8')).toBe(true);
    const graph = view.kase.v2!.graph;
    const open = openFacts(view, state);
    for (const [, o] of open) expect(closed.has(o.step)).toBe(false);
    for (const s of graph.steps.filter((x) => closed.has(x.id))) for (const f of s.facts) expect(open.get(f)?.step).not.toBe(s.id);
  });

  it('"Go over what I have" says what is open (when, while it is) and the starred questions that would move it', () => {
    for (const [seed, tier] of NIGHTS) {
      const view = viewOf(seed, tier);
      const steps = playOracle(view).steps.map((s) => s.command);
      const state = run(view, steps.slice(0, 3));
      if (state.at === view.office.id || state.reportOpen) continue;
      const stars = allChoices(choicesFor(view, state)).filter((c) => c.lead);
      const after = stepInput(state, 'go over what I have', view).state;
      const page = lastPage(view, after);
      if (stars.length > 0) {
        expect(page, `${seed}/${tier}`).toMatch(/(One thing|Two things|Three things) would move it\./);
        for (const c of stars) expect(page).toContain(c.why as string);
      }
      if (view.kase.act.unknowns.includes('when')) expect(page).toMatch(/I still didn’t know/);
    }
  });
});

describe('§3 a person first, then a topic', () => {
  it('no page of the four nights offers more than fourteen first-level choices, and the median is twelve or under', () => {
    for (const [seed, tier] of NIGHTS) {
      const io = memoryIo();
      const save = ['--save', 'n.json'];
      runPlay(['new', '--seed', String(seed), '--tier', String(tier), '--engine', 'v2', '--no-teach', ...save], io);
      const counts: number[] = [];
      const view = viewOf(seed, tier);
      for (const c of playOracle(view).steps.map((s) => s.command)) {
        const out = runPlay(['look', ...save], io).out;
        const menu = out.slice(out.indexOf('WHAT NEXT'));
        if (out.includes('WHAT NEXT')) counts.push(menu.split('\n').filter((l) => /^\s{0,4}\d+\.\s/.test(l)).length);
        runPlay(['do', c, ...save], io);
      }
      const sorted = [...counts].sort((a, b) => a - b);
      expect(Math.max(...counts), `${seed}/${tier} ${counts.join(' ')}`).toBeLessThanOrEqual(14);
      expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(12);
    }
  });

  it('a person opens their topics and "back" shuts them, for nothing; a topic by number takes it', () => {
    const io = memoryIo();
    const save = ['--save', 'p.json'];
    runPlay(['new', '--seed', '3', '--tier', '4', '--engine', 'v2', '--no-teach', ...save], io);
    const page = runPlay(['look', ...save], io).out;
    expect(page).toMatch(/Talk to \(choosing somebody opens what to ask them; that is free\):/);
    expect(page).not.toMatch(/Ask Hauck about:/);
    const hauck = /^\s+(\d+)\.\s+\*?\s*Hauck\b/m.exec(page)?.[1] as string;
    const list = runPlay(['do', hauck, ...save], io).out;
    expect(list).toMatch(/^ASK HAUCK ABOUT$/m);
    expect(list).toMatch(/Back to the page/);
    const before = JSON.parse(io.read('p.json') as string).events.length;
    expect(runPlay(['do', 'back', ...save], io).out).toContain('WHAT NEXT');
    expect(JSON.parse(io.read('p.json') as string).events.length).toBe(before);
    runPlay(['do', hauck, ...save], io);
    const taken = runPlay(['do', '1', ...save], io).out;
    expect(taken).toContain('WHAT NEXT');
    expect(JSON.parse(io.read('p.json') as string).events.length).toBe(before + 1);
  });

  it('a name the witness turns out not to know costs five minutes, goes in the notebook, and is not offered again', () => {
    const view = viewOf(3, 4);
    const state = run(view, ['ask Hauck about that evening', 'go the Velvet Room']);
    const topics = (st: RunState): ChoiceGroup | undefined =>
      choicesFor(view, st).find((g) => g.kind === 'ask' && g.personId === view.kase.people.find((p) => p.surname === 'Hargrove')!.id);
    const steinbach = allChoices([topics(state)!]).find((c) => c.command === 'ask Hargrove about Steinbach')!;
    const hauck = allChoices([topics(state)!]).find((c) => c.command === 'ask Hargrove about Hauck')!;
    // Both name topics say both prices; neither says which.
    expect(costLabel(steinbach)).toBe(costLabel(hauck));
    expect(costLabel(steinbach)).toMatch(/^\d+ min( \(rounded\))? or 5$/);
    expect(steinbach.minutes).toBe(SHORT_MINUTES);
    const budget = gameBudget(view.kase);
    const after = stepInput(state, 'ask Hargrove about Steinbach', view).state;
    expect(clockMinutes(after.actionsUsed, budget, after.shortMinutes ?? 0) - clockMinutes(state.actionsUsed, budget, state.shortMinutes ?? 0)).toBe(5);
    expect(after.actionsUsed).toBe(state.actionsUsed);
    const book = buildNotebook(view, after);
    const hargrove = book.people.find((p) => p.id === view.kase.people.find((q) => q.surname === 'Hargrove')!.id);
    expect(JSON.stringify(hargrove)).toMatch(/Hargrove might know Steinbach's face, but not the name/);
    const g = topics(after)!;
    expect(allChoices([g]).some((c) => c.command === 'ask Hargrove about Steinbach')).toBe(false);
    expect(g.unknown).toEqual(['Steinbach']);
  });

  it('five minutes on the tally become a call when they reach one, and the clock moves five each time', () => {
    const view = viewOf(3, 4);
    const budget = gameBudget(view.kase);
    let state = run(view, ['ask Hauck about that evening', 'go the Velvet Room']);
    // Every name Hargrove doesn't know, asked in turn.
    const names = ['Steinbach', 'Crowninshield', 'Marchetti', 'Vitale'];
    for (const n of names) {
      const cmd = `ask Hargrove about ${n}`;
      const parsed = priceOf({ kind: 'ask', personId: view.kase.people.find((p) => p.surname === 'Hargrove')!.id, topic: { kind: 'exact', personId: view.kase.people.find((p) => p.surname === 'Hargrove')!.id, topic: n } }, state, view);
      if (parsed.reason !== 'short') continue;
      const before = clockMinutes(state.actionsUsed, budget, state.shortMinutes ?? 0);
      state = stepInput(state, cmd, view).state;
      expect(clockMinutes(state.actionsUsed, budget, state.shortMinutes ?? 0) - before).toBe(5);
      expect(state.shortMinutes ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it('v1 keeps its page as it was: every topic listed, the things in a room, and the notebook', () => {
    const view = viewOf(5, 2, 'v1');
    const state = run(view, [`go ${view.places.find((p) => p.id !== view.office.id)!.shortName}`]);
    const groups = choicesFor(view, state);
    expect(groups.find((g) => g.kind === 'free')?.choices.some((c) => c.command === 'notebook')).toBe(true);
    for (const c of allChoices(groups)) expect(c.nameCost).toBeUndefined();
  });
});
