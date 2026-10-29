/**
 * 2026-10-29: the verdict's proof rows. The designer filed the right line for where a lost dog was,
 * with the wrong place, and the ledger struck the line through and "corrected" it with the very same
 * line ("what proved it: Kavanagh: “At twelve somebody walked in …”"). What proves where it is asks
 * about the lost thing whatever was answered, so the line is right on its own and the place row says
 * the line said otherwise; the two rows that ask about the person named say whose story the line
 * really broke or cleared. The points don't move.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, nameOf, suspectsOf } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { heldBreakers, heldClearers, heldWhereBy, otherLie, scoreBoard, truthReport } from '../src/game/board/report.js';

const nights = (types: string[], tiers: TierIndex[], seeds: number) =>
  tiers.flatMap((tier) => typesFor(tier).filter((t) => types.includes(t)).flatMap((type) => Array.from({ length: seeds }, (_, i) => dealBoard(i + 1, tier, type))));

describe('the verdict’s proof rows', () => {
  it('a lost thing: the right line with the wrong place is a right line, and the place says the line said otherwise', () => {
    let checked = 0;
    for (const d of nights(['lost-pet', 'lost-item'], [1, 3, 5], 4)) {
      const { run } = playBoardOracle(d);
      const truth = truthReport(d, run);
      if (!truth.whereBy || !heldWhereBy(d, run).length) continue;
      const solved = scoreBoard(d, run, truth);
      const wrong = d.kase.crime.whereNow?.place === d.kase.crime.scene ? null : 'scene';
      if (!wrong) continue;
      const v = scoreBoard(d, run, { ...truth, where: wrong });
      const where = v.fields.find((f) => f.key === 'where')!;
      const by = v.fields.find((f) => f.key === 'whereBy')!;
      expect(where.correct).toBe(false);
      expect(by.correct).toBe(true);
      expect(by.why).toBeUndefined();
      expect(where.why).toMatch(/^it was [a-z].*, as the line you picked says$/);
      expect(where.why).not.toMatch(/^it was With /);
      // The place's point is the one lost, as before.
      expect(v.points).toBe(solved.points - 1);
      // The wrong place on a hunch: the line row is wrong and says what proved it; the place says only where.
      const hunch = scoreBoard(d, run, { ...truth, where: wrong, whereBy: null });
      expect(hunch.fields.find((f) => f.key === 'whereBy')!.why).toMatch(/^what proved it: /);
      expect(hunch.fields.find((f) => f.key === 'where')!.why).toMatch(/^it was [a-z]/);
      expect(hunch.fields.find((f) => f.key === 'where')!.why).not.toMatch(/as the line you picked says/);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });

  it('the line that breaks the culprit’s story, filed against somebody else, says whose story it breaks', () => {
    let checked = 0;
    for (const d of nights(['murder'], [2, 4], 4)) {
      const { run } = playBoardOracle(d);
      const truth = truthReport(d, run);
      const line = heldBreakers(d, run)[0]?.id;
      const wrong = suspectsOf(d.kase).find((p) => p !== d.kase.crime.culprit);
      if (!line || !wrong) continue;
      const v = scoreBoard(d, run, { ...truth, who: wrong, breaks: line });
      const breaks = v.fields.find((f) => f.key === 'breaks')!;
      expect(breaks.correct).toBe(false);
      expect(breaks.why).toBe(`that breaks ${nameOf(d.kase, d.kase.crime.culprit)}’s story, not ${nameOf(d.kase, wrong)}’s`);
      checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });

  it('the line that clears the other liar, filed for somebody else, says whom it clears', () => {
    let checked = 0;
    for (const d of nights(['murder'], [3, 4, 5], 6)) {
      const other = otherLie(d);
      if (!other) continue;
      const { run } = playBoardOracle(d);
      const truth = truthReport(d, run);
      const line = heldClearers(d, run)[0]?.id;
      const wrong = suspectsOf(d.kase).find((p) => p !== d.kase.crime.culprit && p !== other.person);
      if (!line || !wrong) continue;
      const v = scoreBoard(d, run, { ...truth, other: wrong, cleared: line });
      const cleared = v.fields.find((f) => f.key === 'cleared')!;
      expect(cleared.correct).toBe(false);
      expect(cleared.why).toBe(`that clears ${nameOf(d.kase, other.person)}, not ${nameOf(d.kase, wrong)}`);
      checked++;
    }
    expect(checked).toBeGreaterThan(1);
  });
});
