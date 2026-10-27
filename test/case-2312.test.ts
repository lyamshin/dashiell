import { describe, expect, it } from 'vitest';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, meansAsked } from '../src/game/board/grid.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { breakOptionsShown, keptPick, scoreBoard } from '../src/game/board/report.js';
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

describe('case 2312: a story changed when it was put to him is proof', () => {
  const run = play(['go bar', 'ask barkeep list', 'ask stannard evening', 'put stannard 10 list:barkeep@10']);
  const second = `second:${d.kase.crime.culprit}@10`;

  it('is offered under his name, and stays picked when the name is picked', () => {
    expect(breakOptionsShown(d, run, null).some((o) => o.value === second)).toBe(true);
    const his = breakOptionsShown(d, run, d.kase.crime.culprit);
    expect(his.some((o) => o.value === second)).toBe(true);
    expect(keptPick(second, his)).toBe(second);
  });

  it('scores as proof for him, and for nobody else', () => {
    const report = { who: d.kase.crime.culprit, when: 10 as const, how: d.kase.means.name, why: d.kase.crime.culprit, breaks: second };
    const v = scoreBoard(d, run, report);
    const who = v.fields.find((x) => x.key === 'who');
    expect(who?.correct).toBe(true);
    expect(who?.half).toBeFalsy();
    expect(v.outcome).toBe('solved');
    const other = d.kase.people.find((p) => !p.object && p.id !== d.kase.crime.culprit && p.motive)?.id ?? null;
    expect(scoreBoard(d, run, { ...report, who: other }).fields.find((x) => x.key === 'who')?.correct).toBe(false);
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
