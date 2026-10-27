/**
 * docs/72, thin-sums: from Poached up the narration stops doing the sums (the settled hour, the crime hour
 * as a frame, the partition, the means tie on people, the gap pointer); Raw and Coddled keep theirs, and a
 * sum there never leaves anybody out (round 8, B3). The lint (`sum-lint.ts`, `levelIssues`' rule `sum`)
 * a kind at a time, the round-8 nights on the testers' routes and the oracle's, and the rule over nights.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { hingeIssues, sumDrop } from '../src/game/board/hinge-lint.js';
import { engineWords } from '../src/game/board/jargon.js';
import { proseIssues } from '../src/game/board/prose-lint.js';
import type { Block } from '../src/game/board/types.js';
import { levelIssues } from '../src/game/board/lint.js';
import { dealBoard, sumsSaid, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { recapClauses } from '../src/game/board/pages.js';
import { setTexture } from '../src/game/board/plan/texture.js';
import { sumsInSentence, type SumKind } from '../src/game/board/sum-lint.js';
import { notebookText, pageBodyText } from '../src/game/board/text.js';

const route = (d: BoardDeal, cmds: string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) run = stepBoard(d, run, cmd).run;
  return run;
};
const flat = (s: string) => s.replace(/\s+/g, ' ');
const pageOf = (run: BoardRun, q: string) => flat(pageBodyText(run.log.find((p) => p.board?.q === q) ?? run.log[0]!));
const turnOf = (run: BoardRun) => flat(pageBodyText(run.log.find((p) => p.board?.turn) ?? run.log[0]!));
const sums = (run: BoardRun, d: BoardDeal) => levelIssues(d, run).filter((x) => x.rule === 'sum');

// The round-8 testers' routes (their saves, the actions only).
const CODDLED35 = ['go bar', 'ask barkeep list', 'ask margolis evening', 'put margolis 9 list:barkeep@9', 'go rooming', 'ask xwatcher list', 'go u', 'ask bidwell evening', 'go scene', 'search papers'];
const POACHED34 = ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'ask lindemann evening', 'go rooming', 'ask xwatcher list', 'go u', 'ask vogel evening', 'ask bernstein evening'];
const MEDIUM33 = ['go scene', 'search papers', 'search scene', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'go u', 'ask kavanagh evening', 'put kavanagh 10 list:xwatcher@10', 'ask ainsworth evening', 'go h', 'ask hauck evening', 'ask hauck motive', 'go bar', 'ask dandridge motive'];
const HB34 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask pickering evening', 'go u', 'ask steinbach evening', 'ask ukeeper list', 'go h', 'ask hargrove evening', 'put hargrove 10 list:barkeep@10'];

describe('docs/72: the dial', () => {
  it('Raw and Coddled do the sums; from Poached up the narration doesn’t (and the full dial reads as before)', () => {
    expect(([0, 1, 2, 3, 4, 5] as const).map((tier) => sumsSaid({ tier }))).toEqual([true, true, false, false, false, false]);
    setTexture('full');
    try {
      expect(sumsSaid({ tier: 4 })).toBe(true);
    } finally {
      setTexture('lean');
    }
  });
});

describe('docs/72: the sum lint, a kind at a time', () => {
  // Medium 33: an office of nine or ten, laudanum from the Delmonico rooms, Feeney dead.
  const c = dealBoard(33, 4, 'murder').kase;
  const kinds = (s: string): SumKind[] => sumsInSentence(c, s);
  it('1, settled: the hour the facts settle, and the office’s two hours beside the sighting', () => {
    expect(kinds('So it happened at ten.')).toContain('settled');
    expect(kinds('It happened at ten o’clock.')).toContain('settled');
    expect(kinds('At nine, Feeney was still alive at the Bijou, and Abramowitz had said nine or ten.')).toContain('settled');
    expect(kinds('At nine, Feeney was still alive at the Bijou.')).toEqual([]);
    expect(kinds('Abramowitz had given me nine or ten o’clock.')).toEqual([]);
    expect(kinds('It happened at nine or ten o’clock, and I didn’t know which yet.')).toEqual([]);
  });
  it('2, frame: the crime hour as a frame', () => {
    expect(kinds('Mosley was at the Bijou at ten, when Feeney was given the laudanum.')).toContain('frame');
    expect(kinds('Nobody else had said where Hauck was at nine and ten, when it could have happened.')).toContain('frame');
    expect(kinds('Whoever gave Feeney the laudanum had been at the Delmonico rooms for it before nine, the earliest it could have happened.')).toContain('frame');
    expect(kinds('To give Feeney the laudanum, somebody had to go to the Delmonico rooms for it first.')).toEqual([]);
  });
  it('3, partition: who was still there at the hour and who had gone', () => {
    expect(kinds('Mosley was at the Bijou at ten, and by then Kavanagh had left.')).toContain('partition');
    expect(kinds('Dandridge was at the Bijou at ten; Schilling said so.')).toContain('partition');
    expect(kinds('That put Mosley at the Bijou at ten, and Schilling would swear to it.')).toContain('partition');
    expect(kinds('At ten, Schilling didn’t see Hauck, Kavanagh or Mosley at the Bijou.')).toContain('partition');
  });
  it('4, means: the means tie on people, never the way in said as a fact', () => {
    expect(kinds('So Kavanagh, Hauck and Mosley had each been at the Delmonico rooms earlier, where the laudanum was kept, and every one of them had gone by ten.')).toEqual(expect.arrayContaining(['means', 'partition']));
    expect(kinds('Dandridge hadn’t been at the Delmonico rooms before nine, when the laudanum was there to take.')).toContain('means');
    expect(kinds('The laudanum had come from the Delmonico rooms.')).toEqual([]);
  });
  it('5, gap: whose whereabouts nobody has, or nobody has backed', () => {
    expect(kinds('Nobody else had said where Hauck was at ten.')).toContain('gap');
    expect(kinds('I still didn’t know where Hauck was at ten.')).toContain('gap');
    expect(kinds('He said he was at the Palace at ten, and nobody had backed it up.')).toContain('gap');
    expect(kinds('I still had to ask Mosley and Hauck about their evenings.')).toContain('gap');
  });
  it('what stays: what a witness said, an agreement, a collision, the street', () => {
    for (const s of [
      'So she told it the same as Kavanagh: the Palace at ten. That much checked out.',
      'She saw Dandridge at the Delmonico rooms at nine, and the two of them told it the same way.',
      'One thing didn’t fit. Kavanagh had told me he was home at the Delmonico rooms at ten, and Mrs. Pickering never saw him there.',
      'Kavanagh said he was home at ten. Mrs. Pickering said otherwise.',
      'I underlined the street. Ludlow Street was where Feeney lived.',
      'I knew from Schilling and Mrs. Pickering who had come and gone at each place, and I had the evenings as Dandridge and Kavanagh told them.',
      // (Cards, not sums.)
      'Hauck’s flat hadn’t changed while I was gone, which is the nicest thing a place can do for you.',
      'Kavanagh looked at the table for a long while, and when he looked up, the evening he had given me was gone from his face.',
    ])
      for (const x of s.split(/(?<=\.)\s+/)) expect(kinds(x), x).toEqual([]);
  });
});

describe('docs/72: the round-8 nights, from Poached up', () => {
  it('Medium 33 on the oracle’s route: the barkeep’s page says the sighting as a fact, and the hour is the player’s', () => {
    const d = dealBoard(33, 4, 'murder');
    const run = playBoardOracle(d).run;
    const bar = pageOf(run, 'list:barkeep');
    expect(bar).toContain('At nine, Feeney was still alive at the Bijou.');
    expect(bar).not.toMatch(/So it (?:had )?happened at ten|Abramowitz had said nine or ten|when Feeney was given the laudanum|by then Kavanagh had left|there to take/);
    // The landlady's list: her agreement, and no means sum.
    const rooming = pageOf(run, 'list:xwatcher');
    expect(rooming).not.toMatch(/where the laudanum was kept|every one of them had gone/);
    // The find: the way in as a fact of the search.
    expect(pageOf(run, `search:${d.kase.finds.find((f) => f.gives.means)?.id}`)).not.toContain('the earliest it could have happened');
    // The turn: what's held, and nothing open. (Round 9, item 1: and the clash said once, in the thought.)
    const turn = turnOf(run);
    expect(turn).toContain('Kavanagh had told me he was home at the Delmonico rooms at ten, and Mrs. Pickering never saw him there.');
    expect(turn).not.toContain('Mrs. Pickering said otherwise.');
    expect(turn).not.toMatch(/It happened at ten|I still didn’t know|according to Schilling|Schilling said so/);
    expect(sums(run, d)).toEqual([]);
  });
  it('Medium 33 on the tester’s route: no gap after Hauck’s evening, and the motive page doesn’t frame her evening at ten', () => {
    const d = dealBoard(33, 4, 'murder');
    const run = route(d, MEDIUM33);
    expect(pageOf(run, 'account:hauck')).not.toContain('Nobody else had said where Hauck was');
    expect(pageOf(run, 'motive:hauck')).not.toMatch(/When I asked Hauck about ten|For ten, /);
    expect(sums(run, d)).toEqual([]);
  });
  it('Poached 34 on the tester’s route: Bledsoe’s page ends on his answer', () => {
    const d = dealBoard(34, 2, 'murder');
    const run = route(d, POACHED34);
    const p = run.log.find((x) => x.board?.q === 'list:barkeep');
    const last = p?.blocks.filter((b) => b.kind === 'prose').pop();
    expect(last && last.kind === 'prose' ? last.voice : '').toBe('answer');
    expect(sums(run, d)).toEqual([]);
  });
  it('Hard-boiled 34 on the tester’s route: the partition goes, and the turn has no open clause (B5)', () => {
    const d = dealBoard(34, 5, 'murder');
    const run = route(d, HB34);
    const all = run.log.map((p) => flat(pageBodyText(p))).join('\n');
    expect(all).not.toMatch(/by then Hargrove and Steinbach had left|I still had to ask|when it could have happened|nobody had backed it up/);
    // (Round 9, item 1: the refusal is the put's, on this page: the turn doesn't say it again.)
    expect(turnOf(run)).toContain('“I’m not telling you where I was at ten,” she said, “and I’m not telling you why.”');
    expect(turnOf(run)).not.toContain('Hargrove wouldn’t say where else she had been.');
    expect(recapClauses(d, run).map((x) => x.text)).toContain('Faced with it, Hargrove wouldn’t say where she had been instead.');
    expect(notebookText(d, run)).not.toContain('I didn’t have');
    expect(sums(run, d)).toEqual([]);
  });
  it('the notebook from Poached up: what’s held, never who was placed, whose word is alone, or who could have had it', () => {
    for (const [s, tier] of [[33, 4], [34, 5], [34, 2]] as [number, TierIndex][]) {
      const d = dealBoard(s, tier, 'murder');
      const run = playBoardOracle(d).run;
      const keys = recapClauses(d, run).map((x) => x.key.split(':')[0]);
      for (const k of keys) expect(['when', 'means', 'held', 'broken', 'admit', 'second', 'refused', 'where'], `${s} ${tier}: ${k}`).toContain(k);
    }
  });
});

describe('docs/72: the turn and the notebook say what’s held as a person says it (the coordinator’s read)', () => {
  it('it-was: the office’s hours are whose they were, never the time now ("According to Lanza, it was nine o’clock.")', () => {
    const rule = (d: BoardDeal, r: BoardRun) => hingeIssues(d, r).filter((x) => x.rule === 'it-was');
    // Soft-boiled 33 and Poached 34 said it on the build before; Medium 33 said it right.
    for (const [d, run] of [[dealBoard(33, 3, 'murder'), null], [dealBoard(34, 2, 'murder'), POACHED34]] as [BoardDeal, string[] | null][]) {
      const r = run ? route(d, run) : playBoardOracle(d).run;
      const turn = turnOf(r);
      expect(turn).not.toMatch(/According to [^,.]+, it was/);
      expect(turn).toMatch(new RegExp(`\\b${d.kase.people.find((x) => x.id === d.kase.client)?.short} had (?:given me|said) (?:nine|ten)`));
      expect(rule(d, r)).toEqual([]);
      // The rule reads the line the build before said.
      const i = r.log.findIndex((p) => p.board?.turn);
      const bent = { ...r, log: r.log.map((p, k) => (k === i ? { ...p, blocks: [...p.blocks, { kind: 'prose', text: 'According to Lanza, it was nine o’clock. The laudanum had come from the Delmonico rooms.', voice: 'recap' } as Block] } : p)) };
      expect(rule(d, bent).length).toBe(1);
    }
  });
  it('the notebook’s hold line says what the turn says, at Medium and at Hard-boiled, and the notebook is linted for engine words', () => {
    const m = route(dealBoard(33, 4, 'murder'), MEDIUM33);
    const nb = flat(notebookText(dealBoard(33, 4, 'murder'), m));
    // (Round 9, item 1: "I had the evenings as … told them" read like a machine to two testers of three: as a person says it.)
    expect(nb).toContain('Kavanagh, Ainsworth and Hauck had each told me their evening. Mrs. Pickering and Schilling had told me who came and went.');
    expect(nb).not.toMatch(/\blists from\b|\bevenings? from\b|\btold them\b/);
    const hb = route(dealBoard(34, 5, 'murder'), HB34);
    expect(flat(notebookText(dealBoard(34, 5, 'murder'), hb))).toContain('Pickering, Steinbach and Hargrove had each told me their evening. Mrs. Kowalski, Lanza and Coffin had told me who came and went.');
    for (const [d, r] of [[dealBoard(33, 4, 'murder'), m], [dealBoard(34, 5, 'murder'), hb]] as [BoardDeal, BoardRun][]) expect(proseIssues(d, r).filter((x) => x.rule === 'jargon')).toEqual([]);
    // The words the notebook said before are engine words.
    expect(engineWords('I had evenings from Kavanagh, Ainsworth and Hauck, and lists from Mrs. Pickering and Schilling.').map((x) => x.name)).toEqual(expect.arrayContaining(['list', 'evening (as an account)']));
  });
});

describe('docs/72: Raw and Coddled keep their sums, whole (round 8, B3)', () => {
  it('Coddled 35 on the tester’s route: the landlady’s sum keeps Hargrove, in all evening', () => {
    const d = dealBoard(35, 1, 'murder');
    const run = route(d, CODDLED35);
    const p = pageOf(run, 'list:xwatcher');
    expect(p).toContain('had left by nine. Feldman and Hargrove were still in at nine.');
    expect(sumDrop(d.kase, run)).toEqual([]);
  });
  it('who came in after the hour is in the sum too: Raw 9’s Marchetti', () => {
    const d = dealBoard(9, 0, 'murder');
    const run = playBoardOracle(d).run;
    expect(pageOf(run, 'list:barkeep')).toMatch(/Marchetti didn’t (?:get to|come into) the Blue Lantern till ten\./);
    expect(sumDrop(d.kase, run)).toEqual([]);
  });
  it('a sum leaves nobody out, and Raw and Coddled still do the sums, over nights', () => {
    let said = 0;
    for (const world of [undefined, 'neighbourhood'] as const) {
      for (const tier of [0, 1] as TierIndex[]) {
        const types = typesFor(tier);
        for (let s = 1; s <= 8; s++) {
          const d = dealBoard(s, tier, types[s % types.length] as CaseType, world ? { world } : {});
          for (const run of [playBoardOracle(d).run, playWanderer(d, s).run]) {
            expect(sumDrop(d.kase, run), `${world ?? 'dealt'} ${d.kase.id}`).toEqual([]);
            said += run.log.filter((p) => /\b(?:had left|had gone|still in at|by then)\b/.test(pageBodyText(p))).length;
          }
        }
      }
    }
    expect(said).toBeGreaterThan(20);
  });
});

describe('docs/72: the rule over nights', () => {
  it('from Poached up no sum before the report, in both worlds, on the oracle’s, the wanderer’s and the reader’s routes', () => {
    for (const world of [undefined, 'neighbourhood'] as const) {
      for (const tier of [2, 3, 4, 5] as TierIndex[]) {
        const types = typesFor(tier);
        for (let s = 1; s <= 4; s++) {
          const d = dealBoard(s, tier, types[s % types.length] as CaseType, world ? { world } : {});
          for (const run of [playBoardOracle(d).run, playWanderer(d, s).run, playReader(d, s).run]) expect(sums(run, d), `${world ?? 'dealt'} ${d.kase.id}`).toEqual([]);
        }
      }
    }
  });
});
