import { describe, expect, it } from 'vitest';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, meansAsked } from '../src/game/board/grid.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { SECOND, SECOND_LABEL, boardFields, scoreBoard } from '../src/game/board/report.js';
import { whenQuestion } from '../src/game/board/when.js';

// Case 2312 (2026-10-26), Coddled: the client points at Fairbanks by a letter in the desk, and says
// her reason; Stannard did it, and changes his story when Kreuzer's word is put to him.
const d = dealBoard(2312, 1, 'murder');
const play = (cmds: string[]): BoardRun => cmds.reduce((run, cmd) => stepBoard(d, run, cmd).run, newBoardRun(d));

describe('case 2312: the office said her reason', () => {
  it('asked about the dead, the pointer’s reason is what the client said in the office', () => {
    const run = play(['go rooming', 'ask fairbanks motive']);
    const page = JSON.stringify(run.log[run.log.length - 1]);
    expect(page).toContain('"said":"office"');
    expect(page).not.toContain('"said":"not-office"');
  });
});

describe('case 2312: a story changed when it was put to him caught him out', () => {
  const before = play(['go bar', 'ask barkeep list', 'ask stannard evening']);
  const run = play(['go bar', 'ask barkeep list', 'ask stannard evening', 'put stannard 10 list:barkeep@10']);
  const caught = (r: BoardRun) => boardFields(d, r).find((f) => f.key === 'caught')?.options ?? [];

  it('docs/78: “Their own second story” is offered once somebody has told one, and not before', () => {
    expect(caught(before).map((o) => o.value)).not.toContain(SECOND);
    expect(caught(run).at(-1)).toEqual({ value: SECOND, label: SECOND_LABEL });
  });

  it('is right for him, and for nobody else', () => {
    const report = { who: d.kase.crime.culprit, caught: SECOND, when: 10 as const, how: d.kase.means.name, why: d.kase.crime.culprit };
    const v = scoreBoard(d, run, report);
    expect(v.fields.find((x) => x.key === 'caught')).toMatchObject({ given: 'His own second story', correct: true });
    expect(v.outcome).toBe('solved');
    const other = d.kase.people.find((p) => !p.object && p.id !== d.kase.crime.culprit && p.motive)?.id ?? null;
    const wrong = scoreBoard(d, run, { ...report, who: other });
    expect(wrong.fields.find((x) => x.key === 'who')?.correct).toBe(false);
    expect(wrong.fields.find((x) => x.key === 'caught')?.correct).toBe(false);
  });
});

describe('case 2312: the weapon is never named before it’s found', () => {
  it('the report asks when it happened, and the grid asks for the weapon', () => {
    expect(whenQuestion(d.kase)).toBe('When did it happen?');
    const g = boardGrid(d.kase, newBoardRun(d));
    expect(meansAsked(g.meansLabel)).toBe('Could they get the weapon?');
    expect(meansAsked(g.meansLabel)).not.toMatch(/knife/);
  });
});
