/**
 * v2 — the first playable slice of the rewrite (docs/35, docs/36).
 *
 * Behind a flag: `generateCase(seed, { tier, engine: 'v2' })`, `?engine=v2`
 * in the book's URL, `--engine v2` in `npm run read`. The puzzle is built
 * first (techniques, rivals, routes, digging at the level of the world, the
 * complete check, Tatham's rule), then the book is chosen for its graph, and
 * the pages carry it. Without the flag the game is the game as it was.
 */
import { describe, expect, it } from 'vitest';
import { generateCase, type Case } from '../src/gen/index.js';
import { TECH_COST } from '../src/gen/logic/solver.js';
import { rivalWorld } from '../src/gen/v2/unique.js';
import { TIER_CAP, TIER_FLOOR } from '../src/gen/v2/puzzle.js';
import { buildView } from '../src/game/derive.js';
import { columnAsked } from '../src/game/m9.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { deserializeRun, serializeRun } from '../src/game/storage.js';
import { paramsForPick, pickFromParams, pickOfRun, runMatches } from '../src/game/profile.js';
import { scoreReport } from '../src/game/scoring.js';
import { truthReport } from '../src/game/report-form.js';
import { lintRun } from '../src/game/reader-lint.js';
import { BOOK_LINES, fillLine } from '../src/game/v2/book.js';

const TIERS = [0, 2, 4, 5] as const;
const v2 = (seed: number, tier: (typeof TIERS)[number] | 1 | 3): Case =>
  generateCase(seed, { tier, level: tier === 0 ? 1 : 2, engine: 'v2' });

describe('v2: the flag', () => {
  it('leaves v1 untouched: no engine and no graph without the flag', () => {
    for (const tier of TIERS) {
      const k = generateCase(3, { tier, level: 2 });
      expect(k.engine).toBeUndefined();
      expect(k.v2).toBeUndefined();
    }
  });

  it('rides in the URL, the pick and the save, so a v2 night resumes as a v2 night', () => {
    const { seed, pick } = pickFromParams(new URLSearchParams('?seed=3&d=2&t=4&engine=v2'));
    expect(seed).toBe(3);
    expect(pick.engine).toBe('v2');
    expect(paramsForPick(3, pick)).toContain('engine=v2');
    const view = buildView(v2(3, 4));
    const run = newRun(view, { detectiveName: 'Dashiell' });
    expect(run.engine).toBe('v2');
    const back = deserializeRun(serializeRun(run));
    expect(back?.engine).toBe('v2');
    expect(pickOfRun(run).engine).toBe('v2');
    expect(runMatches(run, 3, pick)).toBe(true);
    expect(runMatches(run, 3, { tier: 4, level: 2 })).toBe(false);
  });

  it('asks no column: the report asks only what the tier asks', () => {
    expect(columnAsked(buildView(v2(3, 4)))).toBe(false);
    expect(columnAsked(buildView(generateCase(3, { tier: 4, level: 2 })))).toBe(true);
  });
});

describe('v2: the puzzle', () => {
  it('deals murders and lost pets at every tier, each with a graph and a book', () => {
    const types = new Set<string>();
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 6; seed++) {
        const k = v2(seed, tier);
        types.add(k.act.type);
        expect(['murder', 'lost-pet']).toContain(k.act.type);
        expect(k.engine).toBe('v2');
        expect(k.v2?.graph.steps.length).toBeGreaterThan(0);
        expect(k.v2?.book.title.length).toBeGreaterThan(0);
      }
    }
    expect(types.has('murder') && types.has('lost-pet')).toBe(true);
  });

  it("accepts by Tatham's rule and the complete check", () => {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 5; seed++) {
        const g = v2(seed, tier).v2!.graph;
        expect(g.stats.tatham).toBe(true);
        expect(g.stats.unique).toBe(true);
        const peak = TECH_COST[g.stats.peak];
        expect(peak).toBeLessThanOrEqual(TIER_CAP[tier]);
        const floor = TIER_FLOOR[tier];
        if (floor !== null) expect(peak).toBeGreaterThan(floor);
      }
    }
  });

  it('the complete check finds the true world, and no world for a broken rival', () => {
    const k = v2(3, 4);
    const suspects = k.people.filter((p) => p.kind === 'suspect').map((p) => p.id);
    const blocks: Record<string, number> = { ...(k.logic?.blocks ?? {}) };
    const facts = [...k.act.givens.facts, ...k.findable.flatMap((c) => c.establishes)];
    const problem = { suspects, places: k.places.map((p) => p.id), blocks, scene: k.solution.murderPlaceId, murder: true, facts };
    expect(rivalWorld(problem, { kind: 'who', personId: k.solution.killerId }).ok).toBe(true);
    for (const r of k.v2!.graph.rivals) {
      const ans = rivalWorld(problem, r.kind === 'who' ? { kind: 'who', personId: r.personId! } : { kind: 'when', tick: r.tick! });
      expect(ans.ok).toBe(false);
    }
  });

  it('seed 3 at Medium is the worked example: Sirkin, Marchetti at half past eight, and The Count', () => {
    const k = v2(3, 4);
    expect(k.act.type).toBe('murder');
    expect(k.people.find((p) => p.id === k.solution.killerId)?.surname).toBe('Marchetti');
    expect(k.solution.murderTick).toBe(5);
    expect(k.v2?.book.id).toBe('count');
    expect(k.v2?.book.motif?.name).toBe('the whistle off the river');
    // The count at the third floor at half past eight is findable, and on the road.
    const count = k.findable.find((c) => c.establishes.some((f) => f.kind === 'countAt' && f.tick === 5 && f.count === 1));
    expect(count).toBeDefined();
    // The count breaks Hauck's third floor as well as Marchetti's, as a way of
    // its own that does not lean on her own confession.
    const hauck = k.people.find((p) => p.surname === 'Hauck')?.id;
    const ways = k.logic?.confrontations.find((c) => c.personId === hauck)?.contradictions ?? [];
    expect(ways.some((w) => w.includes(count!.id) && !w.some((id) => id.startsWith('confess:')))).toBe(true);
  });

  it('never counts a liar’s own confession to a lie as a way of breaking that lie', () => {
    for (const tier of [2, 4, 5] as const) {
      for (let seed = 1; seed <= 4; seed++) {
        const k = v2(seed, tier);
        for (const c of k.logic?.confrontations ?? []) {
          for (const w of c.contradictions) expect(w.some((id) => id === `confess:${c.personId}:${c.lie.ticks[0]}`)).toBe(false);
        }
      }
    }
  });
});

describe('v2: the book on the page', () => {
  it('opens with the title and chapter one, plants the gag, and carries the acts to the turn', () => {
    const view = buildView(v2(3, 4));
    const run = playOracle(view);
    const text = run.state.log.map((p) => p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n'));
    expect(text[0]).toContain('THE COUNT');
    expect(text[0]).toContain('Chapter One');
    const chapters = run.state.log.flatMap((p) => p.blocks.filter((b) => b.kind === 'prose' && b.voice === 'chapter').map((b) => (b as { text: string }).text));
    expect(chapters.some((c) => c.startsWith('Chapter Two'))).toBe(true);
    expect(run.state.v2?.roles.motif).toBeDefined();
    expect(run.state.v2?.roles.gag).toBeDefined();
    // The oracle's route holds the culprit's word and what breaks it: the turn is on the road.
    expect(run.state.v2?.acts).toContain('turn');
  });

  it('closes with the client’s question, the motif and the gag', () => {
    const view = buildView(v2(3, 4));
    const run = playOracle(view);
    const verdict = scoreReport(view, run.state, truthReport(view));
    const last = verdict.closing[verdict.closing.length - 1] ?? '';
    expect(last).toMatch(/river/);
  });

  it('a v1 night gets no chapters', () => {
    const view = buildView(generateCase(3, { tier: 4, level: 2, classic: true }));
    const run = newRun(view, { detectiveName: 'Dashiell' });
    const next = stepInput(run, 'go the walk-up', view).state;
    const chapters = next.log.flatMap((p) => p.blocks.filter((b) => b.kind === 'prose' && b.voice === 'chapter'));
    expect(chapters).toHaveLength(0);
    expect(next.v2).toBeUndefined();
  });

  it('reads clean under the reader lint, at every tier', () => {
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 3; seed++) {
        const view = buildView(v2(seed, tier));
        const run = playOracle(view);
        const issues = lintRun(view, run.state);
        expect(issues, `${tier}/${seed}: ${issues.map((i) => `p${i.page + 1} ${i.rule}: ${i.detail}`).join(' | ')}`).toHaveLength(0);
      }
    }
  });

  it('every book line fills with the slots the engine gives it', () => {
    const slots = {
      liar: 'Hauck', he: 'she', him: 'her', his: 'her', watcher: 'Rafferty', witness: 'Rafferty', place: 'the third floor', hour: 'half past eight',
      k: 'one', n: 'three', motif: 'the whistle off the river', client: 'Hauck', 'she.c': 'she', 'her.c': 'her', 'she.w': 'she', 'her.w': 'her',
      victim: 'Sirkin', desc: 'a man in his thirties', tell: 'one at the third floor',
    };
    const all = [
      ...Object.values(BOOK_LINES.turn).flat(),
      ...BOOK_LINES.turnOpen,
      ...BOOK_LINES.turnMore,
      ...BOOK_LINES.turnNext,
      ...Object.values(BOOK_LINES.books).flatMap((b) => b.turnClose),
      ...Object.values(BOOK_LINES.motifs).flatMap((m) => [...m.plant, ...m.turn, ...m.end]),
      ...Object.values(BOOK_LINES.gags).flatMap((g) => [...g.plant, ...g.end]),
      ...Object.values(BOOK_LINES.purposes).flat(),
      ...Object.values(BOOK_LINES.tell).flatMap((t) => [...t.carry, ...t.pay]),
    ];
    for (const line of all) expect(fillLine(line, slots), line).not.toBeNull();
  });
});
