/**
 * curtain (docs/76): the curtain as a structured sheet, the replay of how the case came together, and
 * the web view's rules held in the source.
 *
 * - The text is main's, byte for byte: `curtainOfBoard` is the sheet said as text (`curtainText`), and
 *   its words over a spread of nights (every tier and type, both worlds; no run, the oracle's filed
 *   true, a wrong filing and the first liar's; the round-9 testers' saves) hash as they did before the
 *   sheet (main 42463d4). A change to the curtain's words changes the hash: change it on purpose.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { dealBoard, type BoardDeal, type BoardReport, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playFirstLiar } from '../src/game/board/oracle.js';
import { curtainOfBoard } from '../src/game/board/report.js';

const route = (d: BoardDeal, cmds: readonly string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) {
    const r = stepBoard(d, run, cmd);
    if (r.error) throw new Error(`${cmd}: ${r.error}`);
    run = r.run;
  }
  return run;
};

const BLANK: BoardReport = { who: null, when: null, how: null, why: null, where: null, breaks: null, whereBy: null, other: null, cleared: null };

// The round-9 testers' saves (scratchpad/playtest9-*.json, round 8's Raw 33), and what they filed.
const HB39 = ['go bar', 'ask barkeep list', 'ask obermann evening', 'go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go h', 'ask tillman evening', 'put tillman 10 list:barkeep@10', 'go u', 'ask thorndike evening', 'ask feldman evening'];
const MEDIUM37 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask prentiss evening', 'ask broadnax evening', 'go u', 'ask sirkin evening', 'go h', 'ask ashby evening', 'put ashby 10 remark:account:broadnax#0', 'go u', 'put sirkin 10 list:xwatcher@10'];
const RAW33 = ['go neighbours', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask bidwell evening', 'put bidwell 10 list:barkeep@10', 'go scene', 'search scene'];
const SAVES: [number, TierIndex, CaseType, string[], Partial<BoardReport>][] = [
  [39, 5, 'murder', HB39, { who: 'tillman', when: 10, why: 'tillman', how: 'laudanum', breaks: 'list:barkeep@10', other: 'obermann', cleared: 'list:barkeep@10' }],
  [37, 4, 'murder', MEDIUM37, { who: 'ashby', when: 10, why: 'ashby', how: 'a revolver', breaks: 'remark:account:broadnax#0', other: 'sirkin', cleared: 'admit:sirkin@10' }],
  [33, 0, 'lost-item', RAW33, { who: 'bidwell', when: 10, why: 'bidwell', where: 'holder:runner', whereBy: 'find:scene', breaks: 'list:barkeep@10' }],
];

/** The spread's curtains, in order, tagged. */
function spread(): [string, string][] {
  const out: [string, string][] = [];
  for (const world of [undefined, 'neighbourhood']) {
    for (let seed = 1; seed <= 2; seed++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (const type of typesFor(tier)) {
          const d = dealBoard(seed, tier, type, world ? { world } : {});
          const tag = `${world ?? 'dealt'}/${tier}/${type}/${seed}`;
          const o = playBoardOracle(d);
          const other = d.kase.people.find((p) => p.role === 'suspect' && p.id !== d.kase.crime.culprit)?.id ?? null;
          const f = playFirstLiar(d, seed);
          out.push([`${tag}/bare`, curtainOfBoard(d)]);
          out.push([`${tag}/oracle`, curtainOfBoard(d, o.run, o.report)]);
          out.push([`${tag}/wrong`, curtainOfBoard(d, o.run, { ...o.report, who: other, breaks: null, other: 'nobody', cleared: null, whereBy: null })]);
          out.push([`${tag}/first`, curtainOfBoard(d, f.run, f.report)]);
        }
      }
    }
  }
  for (const [seed, tier, type, cmds, filed] of SAVES) {
    const d = dealBoard(seed, tier, type);
    const run = route(d, cmds);
    out.push([`save/${tier}/${type}/${seed}/run`, curtainOfBoard(d, run)]);
    out.push([`save/${tier}/${type}/${seed}/filed`, curtainOfBoard(d, run, { ...BLANK, ...filed })]);
  }
  return out;
}

describe('the curtain’s text is main’s', () => {
  it('byte for byte over the spread (hashed as main 42463d4 said it)', () => {
    const all = spread();
    const h = createHash('sha256');
    for (const [tag, text] of all) h.update(`${tag}\n${text}\n\0`);
    expect(`${all.length} ${h.digest('hex').slice(0, 16)}`).toBe('246 89339c6c322f3721');
  }, 120_000);
});
