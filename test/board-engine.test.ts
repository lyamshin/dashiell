import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices, pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid } from '../src/game/board/grid.js';
import { collisionsOf, linesHeld } from '../src/game/board/knowledge.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { budgetCalls, dealBoard, parCalls, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer, refusalShortcutCalls } from '../src/game/board/oracle.js';
import { pageStars } from '../src/game/board/choices.js';
import { isOpen } from '../src/game/board/stars.js';
import { breakOptionsShown, scoreBoard, truthReport, whereByOptions } from '../src/game/board/report.js';
import { firstPerson } from '../src/game/board/tell.js';
import { REASONS } from '../src/gen/board/content.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from '../scripts/plain-terms.mjs';

/**
 * docs/43: the third engine, `board`. The oracle at par, the refusal shortcut,
 * the wanderer, the lint, the stars, the picker, the grid and the play CLI.
 * (The full measure, 50 seeds a tier and type, is `npx tsx scripts/board-measure.ts`.)
 */

const SEEDS = 4;
const cases: { tier: TierIndex; type: CaseType }[] = [];
for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier)) cases.push({ tier, type });

describe('board: the oracle walks the designed path through the engine', () => {
  it.each(cases)('solves at par: tier $tier, $type', ({ tier, type }) => {
    for (let s = 1; s <= SEEDS; s++) {
      const d = dealBoard(s, tier, type);
      const o = playBoardOracle(d);
      expect(o.ok, `seed ${s}: ${o.reason}`).toBe(true);
      expect(o.run.used).toBe(parCalls(d));
      expect(parCalls(d)).toBeLessThan(budgetCalls(d));
      // docs/46 §3: solved is the right name on the line that breaks the story.
      const v = scoreBoard(d, o.run, truthReport(d, o.run));
      expect(v.points).toBe(v.asked);
      expect(v.outcome).toBe('solved');
      // The same name on a hunch is right, but you couldn't have known: half on who.
      const hunch = scoreBoard(d, o.run, { ...truthReport(d, o.run), breaks: null });
      expect(hunch.outcome).toBe('lucky');
      expect(hunch.points).toBe(v.asked - 0.5);
    }
  });
});

describe('board: what the player reads', () => {
  const terms = loadPlainTerms();
  it.each(cases)('lint, plain terms and correspondence are clean: tier $tier, $type', ({ tier, type }) => {
    for (let s = 1; s <= SEEDS; s++) {
      const d = dealBoard(s, tier, type);
      for (const run of [playBoardOracle(d).run, playWanderer(d, s).run] as BoardRun[]) {
        expect(lintBoardRun(d, run), `seed ${s}`).toEqual([]);
        for (const t of boardPlayerText(run)) expect(findJargon(t, terms), `seed ${s}: ${t.slice(0, 80)}`).toEqual([]);
      }
    }
  });

  it('a reason in the mover’s mouth: every pool, both sexes', () => {
    for (const pool of Object.values(REASONS)) {
      for (const r of pool) {
        const filled = r.replace(/\{their\}/g, 'her').replace(/\{them\}/g, 'her').replace(/\{they\}/g, 'she').replace(/\{p\}/g, 'the Odessa').replace(/\{x\}/g, 'Feeney').replace(/\{h\}/g, 'nine');
        expect(firstPerson(filled, true)).not.toMatch(/\b(she|her)\b/);
        const m = r.replace(/\{their\}/g, 'his').replace(/\{them\}/g, 'him').replace(/\{they\}/g, 'he').replace(/\{p\}/g, 'the Odessa').replace(/\{x\}/g, 'Feeney').replace(/\{h\}/g, 'nine');
        expect(firstPerson(m, false)).not.toMatch(/\b(he|his|him)\b/);
      }
    }
  });
});

describe('board: stars follow what the player holds', () => {
  it('at most three a page, never the client, every one an open step', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 3; s++) {
        const d = dealBoard(s, tier, type);
        const o = playBoardOracle(d);
        let run = newBoardRun(d);
        for (const cmd of ['', ...o.commands]) {
          if (cmd) run = stepBoard(d, run, cmd).run;
          if (run.reportOpen) break;
          const stars = pageStars(d, run);
          expect(stars.length).toBeLessThanOrEqual(3);
          for (const st of stars) {
            expect(st.command).not.toContain(d.kase.client);
            expect(isOpen(d.kase, run, st.q), `${st.q} on seed ${s}`).toBe(true);
            expect(st.why.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('thin by tier (docs/46 §1): one way at Coddled, one a page from Poached, only walks at Medium, the scene on page one at Hard-boiled', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 4; s++) {
        const d = dealBoard(s, tier, type);
        // Along the oracle's route and the reader's (every star, else the first choice).
        for (const commands of [playBoardOracle(d).commands, playReader(d, s).commands]) {
          let run = newBoardRun(d);
          let pageOne = true;
          for (const cmd of ['', ...commands]) {
            if (cmd) {
              run = stepBoard(d, run, cmd).run;
              pageOne = false;
            }
            if (run.reportOpen) break;
            const stars = pageStars(d, run);
            if (tier >= 2) expect(stars.length, `tier ${tier} seed ${s}`).toBeLessThanOrEqual(1);
            // "Put it to …" is starred only at Raw and Coddled.
            if (tier >= 2) for (const st of stars) expect(st.q.startsWith('confront:'), `tier ${tier} seed ${s}: ${st.q}`).toBe(false);
            // Medium: where to go, never which question to ask.
            if (tier === 4) for (const st of stars) expect(st.command.startsWith('go '), `seed ${s}: ${st.command}`).toBe(true);
            // Hard-boiled: one star, the scene, on page one. None after.
            if (tier === 5) {
              if (pageOne) expect(stars.map((x) => x.command)).toEqual([`go ${d.kase.crime.scene}`]);
              else expect(stars).toEqual([]);
            }
          }
        }
      }
    }
  });

  it('a star names the pointer, never what the answer will show, who it clears or who is left', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 3; s++) {
        const d = dealBoard(s, tier, type);
        let run = newBoardRun(d);
        for (const cmd of ['', ...playBoardOracle(d).commands]) {
          if (cmd) run = stepBoard(d, run, cmd).run;
          if (run.reportOpen) break;
          for (const st of pageStars(d, run)) expect(st.why, `tier ${tier} seed ${s}`).not.toMatch(/\bclear|\bleft\b|\bdid it\b|\bguilty\b|\bbreaks?\b|\bwill (show|say|tell)\b|\blying\b|\blie\b/i);
        }
      }
    }
  });
});

describe('board: putting it to them', () => {
  it('lists only claims that collide; ready-made at Raw and Coddled, picked from Poached up', () => {
    for (const { tier, type } of cases) {
      const d = dealBoard(2, tier, type);
      const o = playBoardOracle(d);
      let run = newBoardRun(d);
      for (const cmd of o.commands) {
        for (const p of d.kase.people.map((x) => x.id)) {
          const pk = pickerFor(d, run, p);
          if (!pk) continue;
          const hours = new Set(collisionsOf(d.kase, run, p).map((x) => x.hour));
          for (const cl of pk.claims) if (!cl.again) expect(hours.has(cl.hour)).toBe(true);
          if (tier <= 1) expect(pk.claims).toEqual([]);
          else expect(pk.ready).toEqual([]);
        }
        run = stepBoard(d, run, cmd).run;
      }
    }
  });

  it('a line that breaks nothing costs the call and says why', () => {
    // Find a night where a liar can be read a line that doesn't break them.
    let checked = 0;
    for (let s = 1; s <= 12 && checked < 3; s++) {
      const d = dealBoard(s, 2, 'murder');
      const o = playBoardOracle(d);
      let run = newBoardRun(d);
      for (const cmd of o.commands) {
        if (cmd.startsWith('put ')) {
          const [, p, h] = cmd.split(' ') as [string, string, string];
          const held = linesHeld(d.kase, run).filter((l) => l.hour === Number(h) && l.speaker !== p && !cmd.endsWith(l.id));
          const wrong = held.find((l) => !collisionsOf(d.kase, run, p).some((x) => x.breakers.some((b) => b.id === l.id)));
          if (wrong) {
            const r = stepBoard(d, run, `put ${p} ${h} ${wrong.id}`);
            expect(r.run.used).toBe(run.used + 1);
            // docs/52 build 2: what they say back is a held-said voicing, in their manner.
            const said = (r.page.board?.units ?? []).flatMap((u) => (u.kind === 'fact' ? (u.bones ?? []).map((b) => b.voicing ?? '') : []));
            expect(said.some((v) => v.startsWith('reaction/held-said')), said.join(', ')).toBe(true);
            expect(r.run.asked).not.toContain(`confront:${p}@${h}`);
            checked++;
          }
        }
        run = stepBoard(d, run, cmd).run;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('a refusal reads the same, guilty or not', () => {
    const words = new Map<string, Set<string>>();
    for (let s = 1; s <= 30; s++) {
      const d = dealBoard(s, 4, 'murder');
      const o = playBoardOracle(d);
      for (const p of o.run.log) {
        if (p.board?.job !== 'confront') continue;
        const who = p.board.q?.slice(9).split('@')[0] ?? '';
        const k = d.kase.confrontations.find((x) => `confront:${x.person}@${x.hour}` === p.board?.q);
        if (k?.response !== 'refuse') continue;
        const fam = who === d.kase.crime.culprit ? 'culprit' : 'innocent';
        for (const id of p.cardsUsed) words.set(fam, new Set([...(words.get(fam) ?? []), id.replace(/-\d+$/, '')]));
      }
    }
    // Both draw from the same families of cards.
    if (words.has('culprit') && words.has('innocent')) expect([...(words.get('culprit') ?? [])].sort()).toEqual([...(words.get('innocent') ?? [])].sort());
  });
});

describe('board: the refusal shortcut and the wanderer', () => {
  it('the shortcut, in questions, never beats par (the generator’s acceptance)', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 3; s++) {
        const d = dealBoard(s, tier, type);
        const sc = refusalShortcutCalls(d);
        if (sc === null) continue;
        // In calls it may save a walk (docs/43 Built: open); never more than one.
        expect(sc.calls, `tier ${tier} ${type} seed ${s}`).toBeGreaterThanOrEqual(parCalls(d) - 1);
      }
    }
  });

  it('the wanderer rarely files solved from Poached up: the name with the line that breaks the story (docs/46 §4)', () => {
    let n = 0;
    let solved = 0;
    for (const tier of [2, 3, 4, 5] as TierIndex[]) {
      for (let s = 1; s <= 10; s++) {
        const d = dealBoard(s, tier);
        n++;
        if (playWanderer(d, s).ok) solved++;
      }
    }
    expect(solved / n).toBeLessThan(0.1);
  });

  it('the reader (every star, else the first choice) is handed the name at Raw and not from Poached up (docs/46 §4)', () => {
    const rate = (tier: TierIndex) => {
      let ok = 0;
      let n = 0;
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 6; s++) {
          n++;
          if (playReader(dealBoard(s, tier, type), s).ok) ok++;
        }
      }
      return ok / n;
    };
    expect(rate(0)).toBeGreaterThan(0.9);
    expect(rate(2)).toBeLessThan(0.5);
    expect(rate(4)).toBeLessThan(0.2);
    expect(rate(5)).toBeLessThan(0.2);
  });

  it('decided 2026-10-11: from Poached up “the first liar you catch did it” does no better than anybody with access, plus ten points', () => {
    let n = 0;
    let first = 0;
    let access = 0;
    for (const tier of [2, 3, 4, 5] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 8; s++) {
          const d = dealBoard(s, tier, type);
          n++;
          if (playReader(d, s, { guess: 'first' }).ok) first++;
          if (playReader(d, s, { guess: 'access' }).ok) access++;
        }
      }
    }
    expect(first / n).toBeLessThanOrEqual(access / n + 0.1);
    expect(first / n).toBeLessThanOrEqual(0.5);
  });
});

describe('board: the grid is the board', () => {
  it('rows are the people known; a caught lie is a collision; the hour is marked once known', () => {
    const d = dealBoard(4, 2, 'lost-pet');
    const o = playBoardOracle(d);
    const g = boardGrid(d.kase, o.run);
    expect(g.rows.length).toBeGreaterThan(0);
    expect(g.crimeHour).toBe(d.kase.crime.hour);
    const lie = d.kase.lies.find((l) => l.person === d.kase.crime.culprit);
    const row = g.rows.find((r) => r.id === d.kase.crime.culprit);
    expect(row?.cells[lie?.hour as number]?.collision).toBe(true);
    const first = boardGrid(d.kase, newBoardRun(d));
    // Before anything is asked, only those the office names are on it.
    expect(first.rows.length).toBeLessThan(g.rows.length + 1);
  });
});

describe('board: the page asks a handful of things', () => {
  it('about eight first-level choices a page, or fewer', () => {
    let most = 0;
    for (const { tier, type } of cases) {
      const d = dealBoard(1, tier, type);
      let run = newBoardRun(d);
      for (const cmd of ['', ...playBoardOracle(d).commands]) {
        if (cmd) run = stepBoard(d, run, cmd).run;
        if (run.reportOpen) break;
        let n = 0;
        for (const g of boardChoices(d, run)) n += g.kind === 'ask' ? 1 : g.choices.length + ((g.more ?? []).length ? 1 : 0);
        most = Math.max(most, n);
      }
    }
    expect(most).toBeLessThanOrEqual(10);
  });
});

describe('board: the play CLI', () => {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
  it('plays a night by number and files it, showing nothing of the truth before', () => {
    const save = 'board.json';
    const first = runPlay(['new', '--seed', '4', '--tier', '2', '--save', save, '--no-teach'], io);
    expect(first.code).toBe(0);
    expect(first.out).toContain('WHAT NEXT');
    const d = dealBoard(4, 2);
    const o = playBoardOracle(d);
    for (const cmd of o.commands) {
      // Take each command by its words, through the page, a person's topics, or the picker.
      const page = runPlay(['look', '--save', save], io).out;
      expect(page).not.toMatch(/par\b|\[gap|oracle/);
      if (cmd.startsWith('ask ')) {
        const p = cmd.split(' ')[1] as string;
        const name = d.kase.people.find((x) => x.id === p)?.short as string;
        expect(runPlay(['do', name, '--save', save], io).code).toBe(0);
        expect(runPlay(['do', cmd, '--save', save], io).code).toBe(0);
      } else if (cmd.startsWith('put ')) {
        const [, p, h] = cmd.split(' ') as [string, string, string];
        const name = d.kase.people.find((x) => x.id === p)?.short as string;
        const opened = runPlay(['confront', name, '--save', save], io);
        expect(opened.code).toBe(0);
        if (/Which of (her|his) claims\?/.test(opened.out)) expect(runPlay(['do', `claim ${h}`, '--save', save], io).code).toBe(0);
        const r = runPlay(['do', cmd, '--save', save], io);
        expect(r.code, r.out).toBe(0);
      } else {
        expect(runPlay(['do', cmd, '--save', save], io).code, cmd).toBe(0);
      }
    }
    // docs/46 §3: the report asks what breaks their story. `report <name>` lists the lines; breaks counts down them.
    // The night's own answers, by id (the boards are dealt, not hand-written).
    const culprit = d.kase.people.find((x) => x.id === d.kase.crime.culprit)?.short as string;
    const form = runPlay(['report', culprit, '--save', save], io);
    expect(form.code).toBe(0);
    expect(form.out).toContain('What breaks their story (breaks):');
    expect(form.out).toContain('A hunch');
    const o2 = playBoardOracle(d);
    const truth = truthReport(d, o2.run);
    const n = breakOptionsShown(d, o2.run, d.kase.crime.culprit).findIndex((x) => x.value === truth.breaks) + 1;
    const wn = whereByOptions(d, o2.run).findIndex((x) => x.value === truth.whereBy) + 1;
    expect(n).toBeGreaterThan(0);
    const filed = runPlay(['file', `who=${d.kase.crime.culprit}; breaks=${n}; when=${d.kase.crime.hour}; where=${truth.where}; whereBy=${wn}; why=${d.kase.crime.culprit}`, '--save', save], io);
    expect(filed.code, filed.out).toBe(0);
    expect(filed.out).toContain('THE VERDICT');
    expect(filed.out).toContain('4 out of 4: who (and the line that breaks the story)');
    // The save records the line, so a measure can tell deduced from guessed.
    expect(JSON.parse(files.get(save) as string).events.at(-1).file.breaks).toBe(truth.breaks);
    expect(runPlay(['story', '--save', save], io).out.length).toBeGreaterThan(100);
    expect(runPlay(['curtain', '--save', save], io).out).toContain('WHAT BROKE THE STORY');
  });

  it('files the right name on a hunch as right, but you couldn’t have known: half on who', () => {
    const save = 'hunch.json';
    expect(runPlay(['new', '--seed', '4', '--tier', '2', '--save', save, '--no-teach'], io).code).toBe(0);
    const d = dealBoard(4, 2);
    // The same route, by the engine's own commands: a put goes through its picker.
    for (const cmd of playBoardOracle(d).commands) {
      if (cmd.startsWith('put ')) {
        const [, p, h] = cmd.split(' ') as [string, string, string];
        const opened = runPlay(['confront', d.kase.people.find((x) => x.id === p)?.short as string, '--save', save], io);
        if (/Which of (her|his) claims\?/.test(opened.out)) runPlay(['do', `claim ${h}`, '--save', save], io);
      } else if (cmd.startsWith('ask ')) runPlay(['do', d.kase.people.find((x) => x.id === cmd.split(' ')[1])?.short as string, '--save', save], io);
      expect(runPlay(['do', cmd, '--save', save], io).code, cmd).toBe(0);
    }
    const where = truthReport(d).where;
    const filed = runPlay(['file', `who=${d.kase.crime.culprit}; breaks=hunch; when=${d.kase.crime.hour}; where=${where}; whereBy=hunch; why=${d.kase.crime.culprit}`, '--save', save], io);
    expect(filed.code, filed.out).toBe(0);
    expect(filed.out).toContain('right, but you couldn’t have known');
    expect(filed.out).toContain('3 out of 4: who (and the line that breaks the story)');
    expect(filed.out).toContain('half credit on who');
    const curtain = runPlay(['curtain', '--save', save], io).out;
    expect(curtain).toMatch(/What broke it: .+/);
    expect(curtain).toContain('You filed:     a hunch.');
  });
});

describe('board: the only engine', () => {
  it('a save from the engines before the board is refused plainly, and left as it was', () => {
    const v1 = JSON.stringify({ game: 'dashiell-play', version: 1, seed: 3, tier: 4, level: 2, events: [{ do: 'go the third floor' }] });
    const v2 = JSON.stringify({ game: 'dashiell-play', version: 1, seed: 3, tier: 4, level: 2, engine: 'v2', events: [] });
    const files = new Map<string, string>([
      ['v1.json', v1],
      ['v2.json', v2],
      ['junk.json', 'not json'],
    ]);
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
    for (const [path, was] of [['v1.json', v1], ['v2.json', v2], ['junk.json', 'not json']] as const) {
      for (const cmd of ['look', 'notebook', 'grid', 'report']) {
        const r = runPlay([cmd, '--save', path], io);
        expect(r.code, `${cmd} ${path}`).toBe(1);
        expect(r.out, `${cmd} ${path}`).toMatch(/engine that’s gone|isn’t a save/);
      }
      expect(runPlay(['do', '1', '--save', path], io).code).toBe(1);
      expect(files.get(path)).toBe(was);
    }
  });

  it('takes no engine flag: a new night is a board night', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
    const r = runPlay(['new', '--seed', '3', '--tier', '4', '--save', 'n.json', '--no-teach'], io);
    expect(r.code, r.out).toBe(0);
    expect(JSON.parse(files.get('n.json') as string).engine).toBe('board');
    expect(r.out).not.toMatch(/flag only|new engine/);
    expect(runPlay(['new', '--seed', '3', '--tier', '5', '--type', 'lost-item', '--save', 'x.json'], io).code).toBe(1);
  });
});
