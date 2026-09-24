/**
 * M9 polish (docs/20-m9-polish-notes.md): the confront picker a fact a line,
 * grouped and filterable, each fact still its clue's; rule lines that say a
 * thing once; the grid's two-letter places and its runs of strikes; the
 * notebook's spans. And every page a picked part writes, covered and traced.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import type { Clue, Id } from '../src/gen/types.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { choicesFor } from '../src/game/choices.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { placeTags } from '../src/game/grid.js';
import { confessedOf, confrontFacts, displayName, judgeConfront, partRef, partsOf, pickFacts } from '../src/game/m9.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle } from '../src/game/oracle.js';
import { parse } from '../src/game/parser.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import type { RunState } from '../src/game/types.js';

const tiered = (seed: number, tier: 2 | 3 | 4 | 5, level: 1 | 2 | 3 = 2): CaseView =>
  buildView(generateCase(seed, { tier, level, classic: true }));

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const c of commands) state = stepInput(state, c, view).state;
  return state;
}

/**
 * The oracle's route, then every lie the case writes out put to its teller a
 * part at a time: the first part that lands, twice where it can, and one that
 * does not.
 */
function withParts(view: CaseView): RunState {
  let state = play(view, playOracle(view).steps.map((s) => s.command));
  for (const c of view.kase.logic?.confrontations ?? []) {
    const person = view.personById.get(c.personId);
    const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
    if (!person || !at) continue;
    state = stepInput(state, `go ${at}`, view).state;
    state = stepInput(state, `ask ${person.surname} about that evening`, view).state;
    for (let k = 0; k < 2; k++) {
      const facts = pickFacts(view, state, person.id);
      const hit = facts.find((f) => judgeConfront(view, state, person.id, f.clueId, f.part).outcome !== 'wrong');
      if (!hit) break;
      state = stepInput(state, `put ${partRef(hit.clueId, hit.part)} to ${person.surname}`, view).state;
    }
    const miss = pickFacts(view, state, person.id).find(
      (f) => judgeConfront(view, state, person.id, f.clueId, f.part).outcome === 'wrong',
    );
    if (miss) state = stepInput(state, `put ${partRef(miss.clueId, miss.part)} to ${person.surname}`, view).state;
  }
  return state;
}

const cases: CaseView[] = [];
for (let seed = 1; seed <= 12; seed++) for (const tier of [4, 5] as const) cases.push(tiered(seed, tier));

describe('M9 polish: rule lines say a thing once', () => {
  it('folds "still alive" into "alive until at least", a stranger’s half hours into one span, a person’s places under one name', () => {
    let alive = 0;
    let strangers = 0;
    for (const view of cases) {
      for (const c of view.kase.findable) {
        const rule = c.rule ?? '';
        expect(rule, c.id).not.toMatch(/Still alive at/);
        expect(rule.match(/was alive until at least/g)?.length ?? 0, `${c.id} ${rule}`).toBeLessThanOrEqual(1);
        if (/was alive until at least/.test(rule)) alive++;
        // One statement per description and place: "A man in his thirties, a stranger to Rafferty: the third floor, 8:30–9:30".
        const heads = [...rule.matchAll(/([^.]*?), (?:a stranger to|known to) [A-Z][a-z]+(?: by sight only)?: /g)].map((m) => m[1]);
        if (heads.length > 0) strangers++;
        expect(new Set(heads).size, `${c.id} ${rule}`).toBe(heads.length);
        expect(rule, c.id).not.toMatch(/Somebody who fits .*Somebody who fits/);
        // A person's placements come under their name once a line.
        for (const p of view.kase.people) {
          const n = rule.match(new RegExp(`\\b${p.surname}: `, 'g'))?.length ?? 0;
          expect(n, `${c.id} ${rule}`).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(alive).toBeGreaterThan(0);
    expect(strangers).toBeGreaterThan(0);
  });

  it('splits every rule into parts that hold each of the clue’s facts exactly once', () => {
    for (const view of cases) {
      for (const c of view.kase.findable) {
        if ((c.rule ?? '') === '') continue;
        const parts = c.ruleParts ?? [];
        expect(parts.length, `${c.id} ${c.rule}`).toBeGreaterThan(0);
        const seen = parts.flatMap((p) => p.facts).sort((a, b) => a - b);
        expect(seen, `${c.id} ${c.rule}`).toEqual(c.establishes.map((_, i) => i));
        for (const p of parts) expect(p.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('M9 polish: the confront picker', () => {
  it('offers every clue in hand a part at a time, grouped, the one confronted first, their own word for reference, and nothing marked', () => {
    let groups = 0;
    for (const view of cases.slice(0, 8)) {
      const base = play(view, playOracle(view).steps.map((s) => s.command));
      const c = view.kase.logic?.confrontations[0];
      const person = c ? view.personById.get(c.personId) : undefined;
      const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
      if (!person || !at) continue;
      const state = stepInput(stepInput(base, `go ${at}`, view).state, `ask ${person.surname} about that evening`, view).state;
      for (const g of choicesFor(view, state)) {
        if (g.kind !== 'confront' || !g.personId) continue;
        groups++;
        const facts = pickFacts(view, state, g.personId);
        expect(g.choices.length).toBe(facts.length);
        const clues = new Set(facts.map((f) => f.clueId));
        expect(clues).toEqual(new Set(confrontFacts(view, state, g.personId).map((c) => c.id)));
        expect(g.choices.every((c) => !c.lead)).toBe(true);
        expect((g.reference ?? []).length).toBeGreaterThan(0);
        // Sections run together: a heading is never picked up again later.
        const order = g.choices.map((c) => c.section);
        const runs = order.filter((s, i) => i === 0 || s !== order[i - 1]);
        expect(new Set(runs).size).toBe(runs.length);
        // The one being confronted heads the list when anything is about them.
        const own = displayName(view, state, g.personId);
        if (runs.includes(own)) expect(runs[0]).toBe(own);
        // Every command is one part of one clue in hand.
        for (const c of g.choices) {
          const parsed = parse(view, state.at, c.command, undefined, state.found);
          expect(parsed.ok, c.command).toBe(true);
          if (parsed.ok && parsed.command.kind === 'confront') {
            const clue = view.findableById.get(parsed.command.clueId) as Clue;
            expect(partsOf(clue)[parsed.command.part ?? -1]).toBeDefined();
          }
        }
        // The filter names only people some fact names.
        for (const f of g.filters ?? []) expect(g.choices.some((c) => (c.people ?? []).includes(f.personId))).toBe(true);
      }
    }
    expect(groups).toBeGreaterThan(0);
  }, 240_000);

  it('judges the part put: the fact that breaks the story lands, a line beside it in the same clue does not', () => {
    let landed = 0;
    let besideMissed = 0;
    for (const view of cases.slice(0, 10)) {
      const state = play(view, playOracle(view).steps.map((s) => s.command));
      for (const c of view.kase.logic?.confrontations ?? []) {
        const person = view.personById.get(c.personId);
        const at = person?.foundAt ? view.placeById.get(person.foundAt)?.shortName : undefined;
        if (!person || !at) continue;
        const s = stepInput(stepInput(state, `go ${at}`, view).state, `ask ${person.surname} about that evening`, view).state;
        for (const clue of confrontFacts(view, s, person.id)) {
          const parts = partsOf(clue);
          if (parts.length < 2) continue;
          if (judgeConfront(view, s, person.id, clue.id).outcome === 'wrong') continue;
          const outcomes = parts.map((_, i) => judgeConfront(view, s, person.id, clue.id, i).outcome);
          if (outcomes.some((o) => o !== 'wrong')) landed++;
          if (outcomes.some((o) => o === 'wrong')) besideMissed++;
        }
      }
    }
    expect(landed).toBeGreaterThan(0);
    expect(besideMissed).toBeGreaterThan(0);
  }, 240_000);

  it('parses "put x012 part 2 to Hauck" and "confront Hauck with x012 part 2"', () => {
    const view = tiered(3, 4);
    const state = play(view, ['go the walk-up', 'go the speakeasy', 'ask Hauck about that evening']);
    const id = state.found[state.found.length - 1] as Id;
    for (const typed of [`put ${id} part 0 to Hauck`, `confront Hauck with ${id} part 0`]) {
      const p = parse(view, state.at, typed, undefined, state.found);
      expect(p.ok).toBe(true);
      if (p.ok) expect(p.command).toMatchObject({ kind: 'confront', clueId: id, part: 0 });
    }
    const whole = parse(view, state.at, `put ${id} to Hauck`, undefined, state.found);
    expect(whole.ok && whole.command.kind === 'confront' && whole.command.part === undefined).toBe(true);
  });

  it('still never has the culprit admit when facts are put a part at a time', () => {
    let admits = 0;
    for (const view of cases) {
      const state = withParts(view);
      expect(confessedOf(state)).not.toContain(view.kase.solution.killerId);
      admits += (state.confronts ?? []).filter((r) => r.outcome === 'admit' || r.outcome === 'withdraw').length;
      for (const r of state.confronts ?? []) if (r.outcome === 'admit') expect(r.n).toBe(1);
    }
    expect(admits).toBeGreaterThan(0);
  }, 240_000);

  it('covers and traces every page a part put writes', () => {
    const issues: string[] = [];
    let confronts = 0;
    for (const view of cases.slice(0, 12)) {
      const state = withParts(view);
      confronts += state.log.filter((p) => p.shape === 'confront').length;
      for (const i of checkRunCoverage(view, state).issues) issues.push(`${view.kase.seed} p${i.page + 1} ${i.rule}: ${i.detail}`);
      for (const v of checkRun(view, state)) issues.push(`${view.kase.seed} ${v.where} ${v.rule}: ${v.detail}`);
    }
    expect(issues.slice(0, 10)).toEqual([]);
    expect(confronts).toBeGreaterThan(0);
  }, 240_000);
});

describe('M9 polish: the grid and the notebook', () => {
  it('tags every place with two letters, unique in the case', () => {
    for (const view of cases) {
      const tags = [...placeTags(view.places).values()];
      expect(new Set(tags).size).toBe(tags.length);
      for (const t of tags) expect(t).toMatch(/^[A-Z][A-Z0-9]$/);
    }
    const t = placeTags([
      { id: 'a', shortName: 'the third floor' },
      { id: 'b', shortName: 'the speakeasy' },
      { id: 'c', shortName: 'my office' },
      { id: 'd', shortName: 'Mrs. Teague’s' },
      { id: 'e', shortName: 'the subway kiosk' },
      { id: 'f', shortName: 'the suite' },
    ]);
    expect([...t.values()]).toEqual(['TF', 'SP', 'MO', 'MT', 'SK', 'SU']);
  });

  it('writes half hours running on, from one source, at or not at one place, as one line', () => {
    let spans = 0;
    for (const view of cases.slice(0, 8)) {
      const state = play(view, playOracle(view).steps.map((s) => s.command));
      for (const p of buildNotebook(view, state).people) {
        spans += p.facts.filter((f) => /–/.test(f.text)).length;
        const keys = p.facts.map((f) => `${f.text.replace(/^[^—]+— /, '')}|${f.source}`);
        const starts = p.facts.map((f) => f.text.split(' — ')[0] as string);
        // No two lines that one span would have held: same place, presence and source, back to back.
        for (let i = 0; i < p.facts.length; i++) {
          for (let j = 0; j < p.facts.length; j++) {
            if (i === j || keys[i] !== keys[j]) continue;
            const end = (starts[i] as string).split('–').pop() as string;
            const next = (starts[j] as string).split('–')[0] as string;
            expect(adjacent(end, next), `${p.surname}: ${p.facts[i]?.text} / ${p.facts[j]?.text}`).toBe(false);
          }
        }
      }
    }
    expect(spans).toBeGreaterThan(0);
  }, 120_000);
});

/** "9:00 PM" then "9:30 PM": the second half hour right after the first. */
function adjacent(end: string, next: string): boolean {
  const mins = (s: string): number => {
    const m = /(\d+):(\d+)/.exec(s);
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  return mins(next) - mins(end) === 30;
}
