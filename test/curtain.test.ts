/**
 * curtain (docs/76): the curtain as a structured sheet, the replay of how the case came together, and
 * the web view's rules held in the source.
 *
 * - The text is main's, byte for byte: `curtainOfBoard` is the sheet said as text (`curtainText`), and
 *   its words over a spread of nights (every tier and type, both worlds; no run, the oracle's filed
 *   true, a wrong filing and the first liar's; the round-9 testers' saves) hash as they did before the
 *   sheet (main 42463d4). A change to the curtain's words changes the hash: change it on purpose.
 * - The sheet: the board's rows in the CLI's order, each lie in its cell, the sections a night asks.
 * - The replay (`replay.ts`): the fastest solve's steps are the sheet's; every lie is caught out at a
 *   step of it, and the culprit's on the oracle's own night; a night's steps are its paid questions,
 *   searches and confrontations in order, and its caption adds up to the actions used; nobody's guess
 *   is on a replayed grid.
 * - The view (`src/ui/curtain.ts`): a real table, an ordered list of steps with `aria-current`, one
 *   polite status, the track switch pressed, the ledger's words for a pick, Play gone under reduced
 *   motion, 44px targets; the open door isn't the law's red; the old text dump is gone.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { dealBoard, isMurder, suspectsOf, type BoardDeal, type BoardReport, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playFirstLiar } from '../src/game/board/oracle.js';
import { asksOther, curtainOfBoard, curtainSheet, curtainText, otherLie, truthReport } from '../src/game/board/report.js';
import { WHOLE_TRUTH, cellKnown, cellTruth, fastestTrack, nightTrack, positionWords } from '../src/game/board/replay.js';

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

/** Nights over every tier and type, both worlds, seeds 1..n. */
function nights(n: number): { tag: string; d: BoardDeal }[] {
  const out: { tag: string; d: BoardDeal }[] = [];
  for (const world of [undefined, 'neighbourhood']) {
    for (let seed = 1; seed <= n; seed++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (const type of typesFor(tier)) out.push({ tag: `${world ?? 'dealt'}/${tier}/${type}/${seed}`, d: dealBoard(seed, tier, type, world ? { world } : {}) });
      }
    }
  }
  return out;
}

describe('the sheet', () => {
  it('is the text: suspects, company, then the dead; each lie in its cell; the sections the night asks', () => {
    for (const { tag, d } of nights(2)) {
      const c = d.kase;
      const o = playBoardOracle(d);
      const sheet = curtainSheet(d, o.run, truthReport(d, o.run));
      expect(curtainText(sheet), tag).toBe(curtainOfBoard(d, o.run, truthReport(d, o.run)));
      const ids = sheet.board.rows.map((r) => r.id);
      expect(ids.slice(0, suspectsOf(c).length), tag).toEqual(suspectsOf(c));
      expect(ids.includes(c.crime.victim), tag).toBe(isMurder(c));
      expect(sheet.board.rows.find((r) => r.mark === 'culprit')?.id, tag).toBe(c.crime.culprit);
      for (const l of c.lies) {
        const cell = sheet.board.rows.find((r) => r.id === l.person)?.cells.find((x) => x.hour === l.hour);
        expect(cell?.claim, tag).toBe(l.claim);
        expect(cell?.place, tag).toBe(l.truth);
      }
      expect(sheet.board.rows.flatMap((r) => r.cells).filter((x) => x.claim).length, tag).toBe(c.lies.length);
      const keys = sheet.sections.map((x) => x.key);
      expect(keys[0], tag).toBe('lie');
      expect(keys.includes('other'), tag).toBe(!!otherLie(d));
      expect(keys.includes('nobody'), tag).toBe(!otherLie(d) && asksOther(d));
      expect(keys.includes('where'), tag).toBe(!isMurder(c));
      // The oracle's report, on what it held: every pick right.
      expect(sheet.sections.every((x) => x.picked?.mark === 'right'), tag).toBe(true);
      expect(sheet.fastest.steps.map((x) => x.q), tag).toEqual([...d.analysis.path.map((x) => x.q), ...(d.analysis.motive ? [d.analysis.motive] : [])]);
      // No run, no pick.
      expect(curtainSheet(d).sections.every((x) => x.picked === null), tag).toBe(true);
    }
  }, 120_000);
});

describe('the replay', () => {
  it('every lie is caught out at a step of the fastest solve, and the culprit’s on the oracle’s night; the night adds up', () => {
    for (const { tag, d } of nights(3)) {
      const c = d.kase;
      const sheet = curtainSheet(d);
      const fast = fastestTrack(d, sheet);
      expect(fast.steps.map((x) => [x.n, x.label, x.why]), tag).toEqual(sheet.fastest.steps.map((x) => [x.n, x.label, x.why]));
      for (const l of c.lies) expect(fast.steps.some((x) => x.broke.includes(`${l.person}@${l.hour}`)), `${tag} ${l.person}@${l.hour}`).toBe(true);
      const o = playBoardOracle(d);
      const night = nightTrack(d, o.run);
      const lie = c.lies.find((l) => l.person === c.crime.culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person === c.crime.culprit);
      expect(night.steps.some((x) => x.broke.includes(`${lie?.person}@${lie?.hour}`)), tag).toBe(true);
      // Its steps are the night's paid questions, searches and confrontations, in order.
      expect(night.steps.map((x) => x.q), tag).toEqual(o.run.log.filter((p) => p.cost > 0 && ['account', 'list', 'search', 'motive', 'confront'].includes(p.board.job)).map((p) => p.board.q));
      // The caption: the actions used, and the kinds add up to them.
      const m = /^(\d+) actions? \((.*)\)$/.exec(night.caption);
      expect(Number(m?.[1]), tag).toBe(o.run.used);
      const kinds = (m?.[2] ?? '').split(/, | and /).map((x) => (/^an? /.test(x) ? 1 : Number(x.split(' ')[0])));
      expect(kinds.reduce((a, b) => a + b, 0), tag).toBe(o.run.used);
    }
  }, 180_000);

  it('HB 39: the fastest solve catches Obermann out at step 3 and Tillman at step 7; the night says what the confrontation got', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = route(d, HB39);
    const sheet = curtainSheet(d, run);
    const fast = fastestTrack(d, sheet);
    expect(fast.caption).toBe('13 actions (6 questions, a search, a look at the papers for the motive and 5 walks)');
    expect(fast.steps[2]?.broke).toEqual(['obermann@10']);
    expect(fast.steps[6]?.broke).toEqual(['tillman@10']);
    expect(fast.steps[6]?.added).toEqual(['tillman@7', 'tillman@8', 'tillman@9', 'tillman@10']);
    expect([positionWords(fast, 2), positionWords(fast, 7), positionWords(fast, 8)]).toEqual(['Step 3 of 7', 'The motive', WHOLE_TRUTH]);
    expect(cellTruth(d, sheet, 'tillman', 10)).toBe('Tillman said she was home at ten; she was at Grasso’s place, with Grasso.');
    expect(cellTruth(d, sheet, 'tillman', 7)).toBe('She was at Rafferty’s, with Abramowitz and Obermann.');
    expect(cellKnown(d, sheet, fast, 'tillman', 10)).toBe('She was caught out at step 7.');
    expect(cellKnown(d, sheet, fast, 'tillman', 7)).toBe('Known from step 4.');
    expect(cellKnown(d, sheet, fast, 'tillman', 9)).toBe('Only her own word, from step 7.');
    const night = nightTrack(d, run);
    expect(night.caption).toBe('14 actions (6 questions, a search, a confrontation, a look at the papers for the motive and 5 walks)');
    expect(night.steps[6]).toMatchObject({ n: '7', label: 'Confront Tillman: ten o’clock.', why: 'She told another story.' });
    // A confrontation that didn't land: she stood by it.
    const missed = nightTrack(d, route(d, [...HB39.slice(0, 10), 'put tillman 10 claim:obermann@10', 'ask tillman motive']));
    expect(missed.steps.at(-2)).toMatchObject({ label: 'Confront Tillman: ten o’clock.', why: 'She stood by her story.', added: [] });
    expect(missed.steps.at(-1)?.label).toBe('Ask Tillman about Grasso.');
  });

  it('nobody’s guess is on a replayed grid, though the night marked some', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = { ...route(d, HB39), marks: { tillman: { '10': { at: 'bar' } } } };
    for (const t of [fastestTrack(d), nightTrack(d, run)]) {
      for (const s of t.steps) {
        for (const r of s.grid.rows) {
          for (const h of s.grid.hours) {
            expect(r.cells[h]?.pencil).toBeUndefined();
            expect(r.cells[h]?.lines.some((l) => l.startsWith('Your guess:'))).toBe(false);
          }
        }
      }
    }
  });
});

describe('the view', () => {
  const src = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const view = src('src/ui/curtain.ts');
  const css = src('src/ui/board.css');
  it('a table with its headers, the steps an ordered list with aria-current, one polite status, the switch pressed', () => {
    expect(view).toContain("el('table', { class: 'bgrid bgrid--curtain'");
    expect(view).toContain("scope: 'row'");
    expect(view).toContain("scope: 'col'");
    expect(view).toContain("el('ol', { class: 'curtain-steps' })");
    expect(view).toContain("setAttribute('aria-current', 'step')");
    expect(view.match(/role: 'status'/g)?.length).toBe(1);
    expect(view).toContain("'aria-pressed'");
    // (A pick's mark is the ledger's word, never a glyph.)
    expect(view).toContain('MARK_WORD[state]');
    expect(view).not.toMatch(/['`]½|['`]✓|['`]✗/);
  });
  it('Play goes under reduced motion; every control is a thumb’s; the jade means what a step added', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s+\.curtain-play \{\s+display: none;/);
    expect(view).toContain('if (reducedMotion()) return;');
    expect(css).toMatch(/\.curtain-ctl,\s+\.curtain-track \{\s+min-height: 44px;/);
    expect(css).toMatch(/\.curtain-step \{[^}]*min-height: 44px;/);
    expect((css.split('behind the curtain')[1] ?? '').match(/var\(--jade\)/g)?.length).toBeGreaterThan(0);
    for (const block of (css.split('behind the curtain')[1] ?? '').split('\n}')) if (/--jade/.test(block)) expect(block, block).toMatch(/is-added|k-added|curtain-lit/);
  });
  it('the text dump is gone, and the open door is ink and nickel, not the law’s red', () => {
    expect(src('src/ui/report.ts')).not.toContain("el('pre'");
    expect(src('src/ui/book.css')).not.toContain('.ending-curtain pre');
    const open = /\.ending-toggle\[aria-expanded='true'\] \{([^}]*)\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    expect(open).toMatch(/--nickel/);
    expect(open).not.toMatch(/--accent/);
  });
});
