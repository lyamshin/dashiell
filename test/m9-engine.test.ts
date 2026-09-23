/**
 * M9 — the engine half of "Deduction" (docs/20-m9-deduction.md, build plan
 * item 2; docs/20-m9-gen-notes.md §13).
 *
 * Confront and its outcomes; no verdicts from Poached up; ask topics by who
 * knows whom; exhausted people answer free; the report's crime column,
 * scored cell by cell, with its proofs; the lie rule on the page; and every
 * tiered page — confrontations included — covered and traced.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import type { Id } from '../src/gen/types.js';
import { buildView, peopleHereNow, type CaseView } from '../src/game/derive.js';
import { choicesFor, allChoices } from '../src/game/choices.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { gridFrom } from '../src/game/grid.js';
import {
  canConfront,
  columnAsked,
  confessedOf,
  confrontFacts,
  displayName,
  judgeConfront,
  lieKeyOf,
  nameKnown,
  proofsFor,
  verdictsOn,
} from '../src/game/m9.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { fileReport, newRun, priceOf, stepInput } from '../src/game/reducer.js';
import { columnFor, truthReport } from '../src/game/report-form.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { sameRelation } from '../src/game/scene/realize.js';
import { chooseActivity } from '../src/game/scene/plan.js';
import { scoreReport } from '../src/game/scoring.js';
import { renderPageText } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';
import { HELP_LINES, LIE_RULE } from '../src/game/voice-data.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from '../scripts/plain-terms.mjs';

const tiered = (seed: number, tier: 0 | 1 | 2 | 3 | 4 | 5, level: 1 | 2 | 3 = 2): CaseView =>
  buildView(generateCase(seed, { tier, level }));

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

/** The oracle's route, then every confrontation the case writes out, put right and put wrong. */
function withConfrontations(view: CaseView): RunState {
  let state = play(view, playOracle(view).steps.map((s) => s.command));
  for (const c of view.kase.logic?.confrontations ?? []) {
    const person = view.personById.get(c.personId);
    const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
    if (!person || !at) continue;
    state = stepInput(state, `go ${at}`, view).state;
    state = stepInput(state, 'ask ' + person.surname + ' about that evening', view).state;
    const held = new Set(state.found);
    const right = c.contradictions.flat().filter((id) => held.has(id));
    for (const id of [...right.slice(0, 2), state.found[1] as string]) {
      state = stepInput(state, `put ${id} to ${person.surname}`, view).state;
    }
  }
  return state;
}

describe('M9 §3: put it to them', () => {
  it('seed 3 at Medium: a right fact brings the case’s own response, a wrong one gets the spec’s line, both cost the half hour', () => {
    const view = tiered(3, 4);
    const route = [
      'go the walk-up',
      'go the third floor',
      'ask Rafferty about Hauck',
      'go the speakeasy',
      'ask Hauck about that evening',
    ];
    let state = play(view, route);
    expect(canConfront(view, state, view.client.id)).toBe(true);
    const before = state.actionsUsed;
    const right = view.kase.logic?.confrontations.find((c) => c.personId === view.client.id);
    expect(right).toBeDefined();
    const held = new Set(state.found);
    const pick = (right?.contradictions ?? []).flat().find((id) => held.has(id)) as Id;
    const judged = judgeConfront(view, state, view.client.id, pick);
    expect(judged.outcome).toBe(right?.responses[0].kind);
    state = stepInput(state, `put ${pick} to Hauck`, view).state;
    expect(state.actionsUsed).toBe(before + 1);
    const page = state.log[state.log.length - 1];
    expect(page?.shape).toBe('confront');
    expect(state.confronts?.[0]?.lieKey).toBe(right ? lieKeyOf(right) : null);
    // Shorter nights §1: a fact that touches nothing, put right after in the
    // same confrontation, ends it with the story standing, for nothing.
    state = stepInput(state, 'put c001 to Hauck', view).state;
    const ended = state.log[state.log.length - 1];
    expect(state.actionsUsed).toBe(before + 1);
    expect(state.confronts?.[1]).toMatchObject({ outcome: 'wrong', follow: true });
    expect(renderPageText(ended!, view, state).replace(/\s+/g, ' ')).toContain('That’s all I’m going to say about it.');
    // Put on its own, a fact that touches nothing she told me costs the half hour.
    const other = confrontFacts(view, state, view.client.id).find(
      (c) => c.id !== 'c001' && c.id !== pick && judgeConfront(view, state, view.client.id, c.id).outcome === 'wrong',
    ) as { id: Id };
    state = stepInput(state, `put ${other.id} to Hauck`, view).state;
    const wrong = state.log[state.log.length - 1];
    expect(state.actionsUsed).toBe(before + 2);
    expect(state.confronts?.[2]?.outcome).toBe('wrong');
    expect(state.confronts?.[2]?.follow).toBeUndefined();
    expect(renderPageText(wrong!, view, state).replace(/\s+/g, ' ')).toContain('That doesn’t touch anything I told you.');
    // The same fact again is read back, free.
    const again = stepInput(state, 'put c001 to Hauck', view);
    expect(again.state.actionsUsed).toBe(state.actionsUsed);
  });

  it('never has the culprit admit, and innocents give it up only on a second fact, over forty cases', () => {
    let admits = 0;
    let culpritLanded = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const tier of [4, 5] as const) {
        const view = tiered(seed, tier);
        const state = withConfrontations(view);
        const killer = view.kase.solution.killerId;
        for (const r of state.confronts ?? []) {
          if (r.personId === killer && r.outcome !== 'wrong') culpritLanded++;
          expect(r.personId === killer && (r.outcome === 'admit' || r.outcome === 'withdraw')).toBe(false);
          if (r.outcome === 'admit') {
            admits++;
            // An innocent gives up the secret only on the second confrontation.
            expect(r.n).toBe(1);
          }
        }
        expect(confessedOf(state)).not.toContain(killer);
      }
    }
    expect(admits).toBeGreaterThan(0);
    expect(culpritLanded).toBeGreaterThan(0);
  }, 180_000);

  it('offers "Put it to" only once their account is written down; never marked', () => {
    // M10 Part B: Raw teaches the verb on the culprit's lie.
    const raw = tiered(2, 0);
    const rawStart = play(raw, [`go ${raw.placeById.get(raw.startId)?.shortName}`]);
    expect(choicesFor(raw, rawStart).some((g) => g.kind === 'confront')).toBe(false);
    const rawState = play(raw, playOracle(raw).steps.map((s) => s.command));
    const rawGroup = choicesFor(raw, rawState).find((g) => g.kind === 'confront' && g.personId === raw.kase.solution.killerId);
    expect(rawGroup?.choices.every((c) => !c.lead)).toBe(true);
    const view = tiered(3, 4);
    const before = play(view, ['go the walk-up', 'go the speakeasy']);
    expect(choicesFor(view, before).some((g) => g.kind === 'confront')).toBe(false);
    const after = stepInput(before, 'ask Hauck about that evening', view).state;
    const group = choicesFor(view, after).find((g) => g.kind === 'confront' && g.personId === view.client.id);
    expect(group).toBeDefined();
    expect(group?.choices.every((c) => !c.lead)).toBe(true);
    expect(group?.choices.length).toBeGreaterThan(0);
  });
});

describe('M9: no automatic verdicts from Poached up', () => {
  it('never prints clears or contradicts, never flags the notebook, never draws "!" — at Raw it still teaches', () => {
    let rawClears = 0;
    for (let seed = 1; seed <= 12; seed++) {
      for (const tier of [2, 3, 4, 5] as const) {
        const view = tiered(seed, tier);
        expect(verdictsOn(view)).toBe(false);
        const runs = [withConfrontations(view), playWandering(view, seed).state];
        for (const state of runs) {
          for (const page of state.log) {
            for (const b of page.beats ?? []) {
              if (b.kind === 'thought') expect(['clears', 'contradicts']).not.toContain(b.tag);
            }
          }
          const book = buildNotebook(view, state);
          expect(book.people.flatMap((p) => p.facts).some((f) => f.contradicts)).toBe(false);
          const grid = gridFrom(view, state, book);
          expect(grid.flags).toBe(false);
          expect([...grid.rows, ...grid.fixtures].some((r) => r.cells.some((c) => c.conflict))).toBe(false);
        }
      }
      const raw = tiered(seed, 0);
      expect(verdictsOn(raw)).toBe(true);
      const state = playOracle(raw).state;
      // M10 A: Raw's "That cleared X" waits for somebody else's word at the
      // crime's half hour itself, which Part B's route does not deal; Raw
      // still concludes, and the lie it catches is the conclusion it teaches.
      rawClears += state.log
        .flatMap((p) => p.beats ?? [])
        .filter((b) => b.kind === 'thought' && (b.tag === 'clears' || b.tag === 'contradicts')).length;
    }
    expect(rawClears).toBeGreaterThan(0);
  }, 180_000);

  it('the monologue takes its theory from the pencil alone', () => {
    const view = tiered(3, 4);
    let state = play(view, ['go the walk-up']);
    expect(state.theory).toBeNull();
    const marks = { [view.kase.solution.killerId]: { '5': { at: view.sceneId } } };
    state = { ...state, marks };
    state = stepInput(state, 'go the speakeasy', view).state;
    expect(state.theory).toBe(view.kase.solution.killerId);
  });
});

describe('M9 §4 and "Who knows whom": the ask buttons', () => {
  it('offers no rooms or things but as leads, names only people the detective can name, and shows a stranger as what shows', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const view = tiered(seed, 4);
      const run = playOracle(view);
      let state = newRun(view, { detectiveName: 'Dashiell' });
      for (const step of run.steps) {
        state = stepInput(state, step.command, view).state;
        for (const g of choicesFor(view, state)) {
          if (g.kind !== 'ask' || !g.personId) continue;
          const person = view.personById.get(g.personId);
          expect(g.heading).toBe(`Ask ${displayName(view, state, g.personId)} about`);
          if (!nameKnown(view, state, g.personId)) expect(g.heading).not.toContain(person?.surname ?? '§');
          for (const c of [...g.choices, ...(g.more ?? [])]) {
            if (c.lead) continue;
            const topic = c.command.replace(/^ask \S+ about /, '');
            const place = view.places.some((p) => p.shortName === topic);
            const thing = view.kase.objects.some((o) => o.name === topic);
            expect(place || thing, `seed ${seed} ${c.command}`).toBe(false);
            const named = view.kase.people.find((p) => p.surname === topic);
            if (named) expect(nameKnown(view, state, named.id), `seed ${seed} ${c.command}`).toBe(true);
          }
        }
      }
    }
  }, 120_000);

  it('answers a question that would get nothing new for free, and says so', () => {
    const view = tiered(3, 4);
    const state = play(view, ['go the walk-up', 'go the third floor']);
    const rafferty = view.kase.people.find((p) => p.surname === 'Rafferty') as { id: Id };
    const price = priceOf({ kind: 'ask', personId: rafferty.id, topic: { kind: 'evening' } }, state, view);
    expect(price.cost).toBe(0);
    expect(price.reason).toBe('told');
    const next = stepInput(state, 'ask Rafferty about that evening', view);
    expect(next.state.actionsUsed).toBe(state.actionsUsed);
    // M10: Rafferty has told the detective nothing yet, so he does not say he has.
    expect(renderPageText(next.page, view, next.state).replace(/\s+/g, ' ')).toContain('I can’t help you there.');
  });

  it('a witness who does not know somebody says so, in plain words', () => {
    let heard = 0;
    for (let seed = 1; seed <= 10 && heard === 0; seed++) {
      const view = tiered(seed, 4);
      const stranger = view.kase.findable.find((c) =>
        c.kind === 'testimony' && c.establishes.some((f) => f.kind === 'acquainted' && f.strength === 'stranger'),
      );
      if (!stranger || stranger.source.type !== 'person') continue;
      const who = view.personById.get(stranger.source.personId);
      const about = view.personById.get(stranger.about ?? '');
      if (!who?.foundAt || !about) continue;
      const route = [`go ${view.placeById.get(who.foundAt)?.shortName}`, `ask ${who.surname} about ${about.surname}`];
      const state = play(view, route);
      if (!state.found.includes(stranger.id)) continue;
      expect(renderPageText(state.log[state.log.length - 1]!, view, state).replace(/\s+/g, ' ')).toMatch(/Never heard of (him|her)\./);
      heard++;
    }
    expect(heard).toBe(1);
  });
});

describe('M9 §5 and §8: the report', () => {
  it('asks the full crime column from Medium up, scores it a cell at a time, and says which the detective got', () => {
    const medium = tiered(3, 4);
    expect(columnAsked(medium)).toBe(true);
    expect(columnAsked(tiered(3, 3))).toBe(false);
    const specs = columnFor(medium);
    expect(specs.length).toBe(medium.kase.people.filter((p) => p.kind === 'suspect').length);
    const state = playOracle(medium).state;
    const truth = truthReport(medium);
    const right = scoreReport(medium, fileReport(state, truth), truth);
    expect(right.column.every((c) => c.correct)).toBe(true);
    expect(right.outcome).toBe('solved');
    expect(right.closing.join(' ')).toContain('The DA went down the column');
    // One cell wrong: the name is right, and that is partial credit.
    const first = specs[0] as { personId: Id };
    const other = medium.kase.places.find((p) => p.id !== truth.column?.[first.personId])?.id as Id;
    const off = { ...truth, column: { ...truth.column, [first.personId]: other } };
    const partial = scoreReport(medium, fileReport(state, off), off);
    expect(partial.points).toBe(right.points - 1);
    expect(partial.outcome).toBe('thin');
    expect(partial.closing.join(' ')).toContain('partial credit');
  });

  it('behind the curtain, a rule chain for who, when and every cell of the column', () => {
    for (let seed = 1; seed <= 8; seed++) {
      const view = tiered(seed, 4);
      const proofs = proofsFor(view);
      expect(proofs.who?.rules.length ?? 0).toBeGreaterThan(0);
      for (const p of columnFor(view)) expect(proofs.column[p.personId]).not.toBeNull();
    }
  }, 60_000);
});

describe('M9 §1: the lie rule, taught', () => {
  it('is in the help, and Poached’s title line is the one the spec gives', () => {
    expect(LIE_RULE).toBe('People lie about themselves. Nobody lies about what they saw.');
    expect(HELP_LINES.some((l) => l.command.startsWith('put '))).toBe(true);
    expect(generateCase(1, { tier: 2, level: 2 }).shape?.rule).toBe('This time: somebody else is lying too.');
  });
});

describe('M9: every tiered page covered, traced and plain — confrontations included', () => {
  const runs: { label: string; view: CaseView; state: RunState }[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    for (const tier of [2, 4, 5] as const) {
      const view = tiered(seed, tier);
      runs.push({ label: `T${tier} s${seed} oracle+confront`, view, state: withConfrontations(view) });
      runs.push({ label: `T${tier} s${seed} wander`, view, state: playWandering(view, seed).state });
    }
  }

  it('covers every required beat on every night page', () => {
    const issues: string[] = [];
    let pages = 0;
    let covered = 0;
    let confronts = 0;
    for (const r of runs) {
      const c = checkRunCoverage(r.view, r.state);
      pages += c.pages;
      covered += c.covered;
      confronts += r.state.log.filter((p) => p.shape === 'confront').length;
      for (const i of c.issues) issues.push(`${r.label} p${i.page + 1} ${i.shape} ${i.rule}: ${i.detail}`);
    }
    // eslint-disable-next-line no-console
    console.log(`M9 beat coverage: ${covered} of ${pages} night pages, ${confronts} confrontations`);
    expect(issues.slice(0, 10)).toEqual([]);
    expect(confronts).toBeGreaterThan(0);
  }, 240_000);

  it('traces every thought, with zero correspondence violations', () => {
    const all: string[] = [];
    for (const r of runs) for (const v of checkRun(r.view, r.state)) all.push(`${r.label} ${v.where} ${v.rule}: ${v.detail}`);
    expect(all.slice(0, 10)).toEqual([]);
  }, 240_000);

  it('uses no banned genre term on any page', () => {
    const terms = loadPlainTerms();
    const hits: string[] = [];
    for (const r of runs) {
      for (const page of r.state.log) {
        for (const h of findJargon(renderPageText(page, r.view, r.state, { gaps: false }), terms)) hits.push(`${r.label} p${page.n + 1}: ${JSON.stringify(h)}`);
      }
    }
    expect(hits.slice(0, 10)).toEqual([]);
  }, 120_000);
});

describe('M9: the page bugs from Night Hone 1', () => {
  it('deals a card that belongs to one room only in that room', () => {
    const view = buildView(generateCase(12, { difficulty: 2 }));
    const counterman = view.kase.people.find((p) => p.kind === 'fixture' && p.fixtureRole === 'counterman');
    for (let visit = 0; visit < 40; visit++) {
      for (const place of ['pawnshop', 'chop-suey', 'barber-shop', 'hotel-garage']) {
        if (!counterman) break;
        const a = chooseActivity(view, counterman, place, 60, visit, 3);
        expect(a.text).not.toMatch(/\bcues?\b|\bchips\b/);
      }
    }
  });

  it('does not say a relation twice: the question said it', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    expect(sameRelation('“Lindemann owed Dandridge money.”', 'He has owed Dandridge money since ’23.', view)).toBe(true);
    expect(sameRelation('“Sweeney had a secretary. Hanrahan.”', 'She keeps Sweeney’s diary and knows which of the entries are true.', view)).toBe(false);
  });

  it('puts every person present in a presence line or the crowd, and a stranger’s button under what shows', () => {
    const view = tiered(3, 4);
    const state = play(view, ['go the walk-up', 'go the speakeasy']);
    const here = peopleHereNow(view, state.at, state);
    const asks = choicesFor(view, state).filter((g) => g.kind === 'ask');
    expect(asks.length).toBe(here.length);
    const unnamed = here.filter((p) => !nameKnown(view, state, p.id));
    for (const p of unnamed) {
      const g = asks.find((x) => x.personId === p.id);
      expect(g?.heading).not.toContain(p.surname);
    }
    expect(allChoices(choicesFor(view, state)).length).toBeGreaterThan(0);
  });
});
