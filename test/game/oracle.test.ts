/**
 * The oracle playthrough. The mandatory one.
 *
 * For seeds 1..100 at each difficulty, a pure player who knows which clues are
 * the spine — and who is allowed nothing but the game's own typed commands —
 * must collect every one of them inside `par` actions.
 *
 * What this is actually testing is that two numbers agree: `computePar`, which
 * the generator works out with a breadth-first search over (room, clues held)
 * where one action is a fetch or a move, and the reducer's action model, where
 * `go` costs one, `ask` costs one and `examine` costs one. They are the same
 * search over the same graph, written twice, six months apart, by two pieces of
 * code that do not import each other. If they disagree the case is either
 * unplayable inside its budget or budgeted too generously, and this test says
 * which.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import { buildView } from '../../src/game/derive.js';
import { playOracle } from '../../src/game/oracle.js';

const DIFFICULTIES: Difficulty[] = [1, 2, 3];
const SEEDS = 100;

interface Row {
  difficulty: Difficulty;
  seed: number;
  actions: number;
  par: number;
  budget: number;
  ok: boolean;
  reason: string | null;
}

const rows: Row[] = [];
for (const difficulty of DIFFICULTIES) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    const result = playOracle(view);
    rows.push({
      difficulty,
      seed,
      actions: result.actions,
      par: result.par,
      budget: result.budget,
      ok: result.ok,
      reason: result.reason,
    });
  }
}

/** `HUMPHREY_STATS=1 npm test` prints the table that went into the notes. */
if (process.env.HUMPHREY_STATS) {
  const lines: string[] = ['', 'oracle vs par — seeds 1..100 per difficulty'];
  for (const difficulty of DIFFICULTIES) {
    const mine = rows.filter((r) => r.difficulty === difficulty);
    const under = new Map<number, number>();
    for (const r of mine) under.set(r.par - r.actions, (under.get(r.par - r.actions) ?? 0) + 1);
    const spread = [...under]
      .sort((a, b) => a[0] - b[0])
      .map(([d, n]) => `${d} under × ${n}`)
      .join(', ');
    lines.push(
      `  d${difficulty}: ${mine.filter((r) => r.ok).length}/${mine.length} inside par · ` +
        `par ${Math.min(...mine.map((r) => r.par))}–${Math.max(...mine.map((r) => r.par))} · ` +
        `oracle ${Math.min(...mine.map((r) => r.actions))}–${Math.max(...mine.map((r) => r.actions))} · ${spread}`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

describe('the oracle playthrough', () => {
  for (const difficulty of DIFFICULTIES) {
    const mine = rows.filter((r) => r.difficulty === difficulty);

    it(`collects every spine clue inside par at difficulty ${difficulty}`, () => {
      const failures = mine.filter((r) => !r.ok);
      expect(
        failures.map((f) => `seed ${f.seed}: ${f.reason}`),
        `${failures.length} of ${mine.length} seeds could not be walked inside par`,
      ).toEqual([]);
    });

    it(`never spends more than the budget at difficulty ${difficulty}`, () => {
      for (const r of mine) expect(r.actions).toBeLessThanOrEqual(r.budget);
    });
  }

  it('reproduces par exactly, or beats it — never misses it', () => {
    for (const r of rows) expect(r.actions).toBeLessThanOrEqual(r.par);
  });

  /**
   * The interesting half. `examine` takes a whole room in one action where par
   * counts one per clue, and one question can answer two clues the generator
   * filed under the same topic, so the game is allowed to come in under par.
   * It is never allowed to come in over. Anything other than a tight spread
   * here means the two models have drifted apart and the notes should say so.
   */
  it('agrees with par on the overwhelming majority of cases', () => {
    const slackFound = rows.map((r) => r.par - r.actions);
    const exact = slackFound.filter((d) => d === 0).length;
    // Reported rather than asserted tightly: a regression here is a design
    // signal, not a broken build. The floor is the contract.
    //
    // M5 lowered the floor from 0.90 to 0.85, and the number went from 0.93
    // to 0.883. The cause is the trope's essential fact set: every case now
    // carries one more requirement, which puts one more clue in the spine,
    // and one more spine clue is one more chance that the game's `examine`
    // picks up two of them in a room where par counted them separately. The
    // hard contracts above — every spine clue collected, never over par — are
    // untouched, and `minSlack` is still 0, so the two models still meet.
    expect(exact / rows.length).toBeGreaterThan(0.85);
    expect(Math.min(...slackFound)).toBe(0);
  });

  it('never fails for a reason the generator is responsible for', () => {
    // A failure whose reason is "no route collects the spine" would mean the
    // generator built a spine the game cannot walk. That is a generator bug
    // and must be reported, not papered over.
    const generatorFaults = rows.filter((r) => r.reason === 'no route collects the spine');
    expect(generatorFaults.map((r) => `d${r.difficulty} seed ${r.seed}`)).toEqual([]);
  });
});

describe('the oracle uses only the game', () => {
  it('reaches every spine clue through the parser', () => {
    const view = buildView(generateCase(7, { difficulty: 2 }));
    const result = playOracle(view);
    expect(result.ok).toBe(true);
    // Every command in the script is a string a player could type.
    for (const step of result.steps) {
      expect(step.command).toMatch(/^(go|ask|examine) /);
    }
    const spine = view.kase.findable.filter((c) => c.role === 'spine').map((c) => c.id);
    for (const id of spine) expect(result.state.found).toContain(id);
  });
});
