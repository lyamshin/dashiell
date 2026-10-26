import { describe, expect, it } from 'vitest';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { breakOptionsShown, keptPick } from '../src/game/board/report.js';

// Case 5695 (2026-10-26): the proof line picked before the name was dropped for "A hunch" when the
// name was picked, because the list is drawn again for that name.
describe('a line picked before the name', () => {
  const d = dealBoard(5695, 0, 'murder');
  let run: BoardRun = newBoardRun(d);
  for (const cmd of ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'ask donnelly evening', 'go rooming', 'ask xwatcher list']) run = stepBoard(d, run, cmd).run;
  const before = breakOptionsShown(d, run, null);
  const after = breakOptionsShown(d, run, d.kase.crime.culprit);

  it('stays picked when the name is picked, while the line is still offered', () => {
    expect(before.some((o) => o.value === 'list:barkeep@10')).toBe(true);
    expect(keptPick('list:barkeep@10', after)).toBe('list:barkeep@10');
  });

  it('falls back to a hunch only when the line is no longer offered', () => {
    const own = before.find((o) => o.value.startsWith(`claim:${d.kase.crime.culprit}@`));
    expect(own).toBeDefined();
    expect(after.some((o) => o.value === own?.value)).toBe(false);
    expect(keptPick(own?.value, after)).toBe('');
    expect(keptPick(null, after)).toBe('');
    expect(keptPick('', after)).toBe('');
  });
});
