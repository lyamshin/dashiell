import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, nameOf } from '../src/game/board/model.js';
import { playBoardOracle, playReader } from '../src/game/board/oracle.js';
import {
  NOBODY,
  OTHER_LABEL,
  OTHER_QUESTION,
  asksOther,
  boardFields,
  clearOptions,
  curtainOfBoard,
  heldBreakers,
  heldClearers,
  otherLie,
  scoreBoard,
  truthReport,
} from '../src/game/board/report.js';
import { BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

/**
 * docs/61: from Poached up, where the night has an innocent liar, the report asks about the other
 * broken story: who else lied, and what cleared them. Solved needs it; below Poached it isn't asked.
 */

const SEEDS = 4;
const nights: { tier: TierIndex; type: string; seed: number }[] = [];
for (const tier of [2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier)) for (let seed = 1; seed <= SEEDS; seed++) nights.push({ tier, type, seed });

/** The oracle's run, once a night. */
const runs = new Map<string, ReturnType<typeof playBoardOracle>>();
const oracleOf = (d: ReturnType<typeof dealBoard>) => {
  const k = d.kase.id;
  if (!runs.has(k)) runs.set(k, playBoardOracle(d));
  return runs.get(k) as ReturnType<typeof playBoardOracle>;
};

describe('docs/61: who else lied, and what cleared them', () => {
  it('is asked from Poached up, right after who, and never below', () => {
    for (const tier of [0, 1] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        const d = dealBoard(3, tier, type);
        expect(asksOther(d)).toBe(false);
        expect(boardFields(d).map((f) => f.key)).not.toContain('other');
        expect(truthReport(d)).not.toHaveProperty('other');
      }
    }
    for (const { tier, type, seed } of nights) {
      const d = dealBoard(seed, tier, type as never);
      expect(asksOther(d)).toBe(true);
      const fields = boardFields(d);
      expect(fields[1]?.key).toBe('other');
      expect(fields[1]?.label).toBe(OTHER_QUESTION);
      expect(fields[1]?.options.at(-1)).toEqual({ value: NOBODY, label: 'Nobody else' });
    }
  });

  it('the oracle files it solved: the innocent liar, on a line that places them where they were', () => {
    for (const { tier, type, seed } of nights) {
      const d = dealBoard(seed, tier, type as never);
      const o = oracleOf(d);
      const lie = otherLie(d);
      const truth = truthReport(d, o.run);
      expect(truth.other, `${tier} ${type} ${seed}`).toBe(lie?.person);
      expect(truth.cleared, `${tier} ${type} ${seed}`).toBeTruthy();
      const v = scoreBoard(d, o.run, truth);
      expect(v.outcome).toBe('solved');
      expect(v.points).toBe(v.asked);
      expect(v.fields.map((f) => f.key)).toEqual(expect.arrayContaining(['other', 'cleared']));
      expect(v.fields.find((f) => f.key === 'other')?.label).toBe(OTHER_LABEL);
      // What clears them: the check an admission named, or a list; never their own owning up.
      const cleared = heldClearers(d, o.run);
      expect(cleared.length).toBeGreaterThan(0);
      for (const l of cleared) {
        expect(l.speaker).not.toBe(lie?.person);
        expect(['list', 'claim', 'remark', 'given']).toContain(l.kind);
        expect(l.hour).toBe(lie?.hour);
        expect(l.place).toBe(lie?.truth);
      }
      // The form offers it under that name, so `report <Name>` and the book find it.
      expect(clearOptions(d, o.run, truth.other).map((x) => x.value)).toContain(truth.cleared);
    }
  });

  it('a hunch, the wrong line, the wrong name or nobody costs that point, and the verdict says so plainly', () => {
    for (const { tier, type, seed } of nights.filter((x) => x.seed <= 2)) {
      const d = dealBoard(seed, tier, type as never);
      const o = oracleOf(d);
      const truth = truthReport(d, o.run);
      const lie = otherLie(d);
      const name = nameOf(d.kase, lie?.person as string);
      const solved = scoreBoard(d, o.run, truth);
      const hunch = scoreBoard(d, o.run, { ...truth, cleared: null });
      expect(hunch.points).toBe(solved.asked - 1);
      expect(hunch.outcome).toBe('thin');
      expect(hunch.plain.join(' ')).toMatch(new RegExp(`You had the right name, but you didn’t rule out ${name}: a hunch doesn’t clear (him|her)\\.`));
      expect(hunch.fields.find((f) => f.key === 'other')?.why).toMatch(/^the right name, but not what cleared (him|her)$/);
      // The line that shows the culprit lied doesn't clear the other one.
      const culpritLine = heldBreakers(d, o.run)[0]?.id ?? null;
      if (culpritLine && !heldClearers(d, o.run).some((l) => l.id === culpritLine)) {
        const wrongLine = scoreBoard(d, o.run, { ...truth, cleared: culpritLine });
        expect(wrongLine.points).toBe(solved.asked - 1);
        expect(wrongLine.plain.join(' ')).toContain(`didn’t rule out ${name}: the line you picked doesn’t clear`);
      }
      for (const other of [NOBODY, null, d.kase.crime.culprit]) {
        const v = scoreBoard(d, o.run, { ...truth, other, cleared: other === d.kase.crime.culprit ? (heldBreakers(d, o.run)[0]?.id ?? null) : null });
        expect(v.points, String(other)).toBe(solved.asked - 1);
        expect(v.plain.join(' ')).toContain(`You had the right name, but you didn’t rule out ${name}.`);
        const f = v.fields.find((x) => x.key === 'other');
        expect(f?.correct).toBe(false);
        expect(f?.truth).toBe(boardFields(d)[1]?.options.find((x) => x.value === lie?.person)?.label);
      }
      // Nothing the night holds clears the culprit.
      for (const opt of clearOptions(d, o.run, d.kase.crime.culprit)) {
        expect(scoreBoard(d, o.run, { ...truth, other: d.kase.crime.culprit, cleared: opt.value }).fields.find((x) => x.key === 'cleared')?.correct).toBe(false);
      }
    }
  });

  it('the curtain sets what cleared them beside what was filed', () => {
    const d = dealBoard(2, 3, 'murder');
    const o = oracleOf(d);
    const truth = truthReport(d, o.run);
    const right = curtainOfBoard(d, o.run, truth);
    expect(right).toContain('WHO ELSE LIED, AND WHAT CLEARED THEM');
    expect(right).toMatch(/What cleared (him|her): .+/);
    expect(right).toMatch(/You filed: +\S.* ✓/);
    expect(curtainOfBoard(d, o.run, { ...truth, other: NOBODY, cleared: null })).toMatch(/You filed: +nobody else\. +✗/);
    expect(curtainOfBoard(dealBoard(2, 1, 'murder'))).not.toContain('WHO ELSE LIED');
  });

  it('the shortcut readers no longer solve by naming a liar they caught (docs/41 rule 9)', () => {
    let n = 0;
    let last = 0;
    let first = 0;
    let star = 0;
    for (const { tier, type, seed } of nights) {
      const d = dealBoard(seed, tier, type as never);
      n++;
      if (playReader(d, seed, { guess: 'last' }).ok) last++;
      if (playReader(d, seed, { guess: 'first' }).ok) first++;
      if (playReader(d, seed).ok) star++;
    }
    expect(last / n).toBeLessThan(0.1);
    expect(first / n).toBeLessThan(0.1);
    expect(star / n).toBeLessThan(0.1);
  });

  it('the teach page says it, plainly, on a line of its own', () => {
    expect(BOARD_TEACH_LINES).toContain('To close the case you need a name and the fact that proves they lied.');
    expect(BOARD_TEACH_LINES).toContain('When two stories break, you also need what clears the other one.');
  });
});

describe('docs/61: the play CLI files it', () => {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };

  it('takes other and cleared, and refuses cleared without a name or on a night that doesn’t ask', () => {
    const save = 'o.json';
    expect(runPlay(['new', '--seed', '2', '--tier', '3', '--type', 'murder', '--save', save, '--no-teach'], io).code).toBe(0);
    const d = dealBoard(2, 3, 'murder');
    for (const cmd of playBoardOracle(d).commands) {
      if (cmd.startsWith('put ')) {
        const [, p, h] = cmd.split(' ') as [string, string, string];
        const opened = runPlay(['confront', d.kase.people.find((x) => x.id === p)?.short as string, '--save', save], io);
        if (/Which part of (her|his) evening\?/.test(opened.out)) runPlay(['do', `claim ${h}`, '--save', save], io);
      } else if (cmd.startsWith('ask ')) runPlay(['do', d.kase.people.find((x) => x.id === cmd.split(' ')[1])?.short as string, '--save', save], io);
      expect(runPlay(['do', cmd, '--save', save], io).code, cmd).toBe(0);
    }
    const o = playBoardOracle(d);
    const truth = truthReport(d, o.run);
    const other = d.kase.people.find((x) => x.id === truth.other)?.short as string;
    const listed = runPlay(['report', other, '--save', save], io).out;
    expect(listed.replace(/\s+/g, ' ')).toContain(`If ${other} is the other liar, give “cleared” as a number from this list too.`);
    const bad = runPlay(['file', `who=${d.kase.crime.culprit}; cleared=1`, '--save', save], io);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('Name who else lied first');
    // Filing a wrong line under the right name: the point goes, and the verdict says why.
    const lineIds = clearOptions(d, o.run, truth.other).map((x) => x.value);
    const wrong = lineIds.findIndex((id) => !heldClearers(d, o.run).some((l) => l.id === id)) + 1;
    expect(wrong).toBeGreaterThan(0);
    const filed = runPlay(['file', `who=${d.kase.crime.culprit}; breaks=hunch; other=${other}; cleared=${wrong}; when=${d.kase.crime.hour}; how=${truth.how}; why=${d.kase.crime.culprit}`, '--save', save], io);
    expect(filed.code, filed.out).toBe(0);
    expect(filed.out).toMatch(/Who else lied: .+ ✗ — the right name, but not what\s+cleared (him|her)/);
    expect(filed.out).toMatch(/You had the right name, but you didn’t rule out \w+: the line you\s+picked doesn’t clear (him|her)\./);
    expect(JSON.parse(files.get(save) as string).events.at(-1).file.other).toBe(truth.other);

    const raw = 'r.json';
    expect(runPlay(['new', '--seed', '2', '--tier', '0', '--save', raw, '--no-teach'], io).code).toBe(0);
    const no = runPlay(['file', 'who=1; cleared=1', '--save', raw], io);
    expect(no.code).toBe(1);
    expect(no.out).toContain('doesn’t ask who else lied');
    expect(runPlay(['report', '--save', raw], io).out).not.toContain('Somebody else’s story');
  });
});
