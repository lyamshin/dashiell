/**
 * docs/80: fewer words, the book's own (the UI half of the text run). A rule is said once, where it's
 * first needed; what the page already shows isn't said again under it.
 *
 * - The running head says who waits at eight on the night's first page and at the last action; the
 *   pages between say the count.
 * - "Close the case" says what pressing it does on the first page only (the book and the CLI).
 * - The CLI prints a step inside a page (somebody's topics, the picker, an hour in it) without the page
 *   again, and counts the hints on the first page, by `hint` and on the form, not under every page.
 * - The picker says the whole of its note the first time a night confronts anybody; after that, how
 *   to pick. The fastest solve agrees with it: confronting isn't what showed the lie.
 * - The rules and the help say each rule once: the teach page's eight lines, then what they don't say.
 * - The curtain's steps give the reason, not the ask their label says.
 */
import { describe, expect, it } from 'vitest';
import { clockStrip, headLeft } from '../src/game/board/clock.js';
import { pickerFor, pickerNote } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { curtainSheet, fastestSolveLines, scoreBoard, storyOfBoard, truthReport } from '../src/game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { CLOSE_NOTE } from '../src/game/board/text.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

const route = (d: BoardDeal, cmds: readonly string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const c of cmds) {
    const r = stepBoard(d, run, c);
    expect(r.error, c).toBeUndefined();
    run = r.run;
  }
  return run;
};

function cli(seed: number, tier: number, type: string) {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  const run = (...args: string[]) => runPlay([...args, '--save', 's'], io);
  const first = run('new', '--seed', String(seed), '--tier', String(tier), '--type', type, '--no-teach');
  return { run, first };
}

const flat = (s: string) => s.replace(/\s+/g, ' ');

describe('docs/80: the running head', () => {
  it('says who waits at eight on the first page and at the last action, the count between', () => {
    const s = (used: number) => clockStrip(used, 14);
    expect(headLeft(s(0), 0, 14, 0)).toBe('Fourteen actions left. The DA charges somebody at eight.');
    expect(headLeft(s(5), 5, 14, 5)).toBe('Nine actions left.');
    expect(headLeft(s(13), 13, 14, 13)).toBe('One action left. The DA charges somebody at eight.');
    expect(headLeft(s(14), 14, 14, 14)).toBe('No actions left. The DA charges somebody at eight.');
    expect(s(5).count).toBe('Nine actions left.');
  });

  it('the CLI says it the same', () => {
    const c = cli(14, 4, 'lost-pet');
    expect(c.first.out).toMatch(/\] [A-Z][a-z-]+ actions left\. .+ wants an answer at eight\./);
    const d = dealBoard(14, 4, 'lost-pet');
    const next = c.run('do', playBoardOracle(d).commands[0] as string).out;
    expect(next).toMatch(/\] [A-Z][a-z-]+ actions left\.\n/);
    expect(next).not.toMatch(/wants an answer at eight/);
  });
});

describe('docs/80: "Close the case" says what it does once', () => {
  it('on the first page of the CLI ("ends the night" and the note), and not after it', () => {
    const d = dealBoard(12, 0);
    const c = cli(12, 0, 'murder');
    expect(flat(c.first.out)).toContain(CLOSE_NOTE);
    const next = c.run('do', playBoardOracle(d).commands[0] as string).out;
    expect(next).toMatch(/\nThe report:\n\s+\d+\. {3}Close the case(?:\n|$)/);
    expect(next).not.toContain('ends the night');
    expect(flat(next)).not.toContain(CLOSE_NOTE);
  });
});

describe('docs/80: the CLI prints what opened, not the page again', () => {
  it('somebody’s topics, the picker and an hour in it come without the page above them', () => {
    const d = dealBoard(153, 2, 'lost-item');
    const cmds = playBoardOracle(d).commands;
    const i = cmds.findIndex((x) => x.startsWith('put '));
    const [, who, hour] = /^put (\S+) (\d+)/.exec(cmds[i] as string) as unknown as [string, string, string];
    const c = cli(153, 2, 'lost-item');
    for (const cmd of cmds.slice(0, i)) {
      const m = /^ask (\S+)/.exec(cmd);
      if (m) expect(c.run('do', `person ${m[1]}`).code).toBe(0);
      expect(c.run('do', cmd).code).toBe(0);
    }
    const page = c.run('look').out;
    const topics = c.run('do', `person ${who}`).out;
    expect(topics).toMatch(/^ASK \S+ ABOUT/);
    expect(topics).not.toContain('════');
    const picker = c.run('do', `picker ${who}`).out;
    expect(picker).toMatch(/^CONFRONT /);
    // (The first confront of the night: the whole note.)
    expect(flat(picker)).toContain('isn’t needed to prove');
    const line = c.run('do', `claim ${hour}`).out;
    expect(line).toMatch(/^CONFRONT /);
    expect(flat(line)).not.toContain('isn’t needed to prove');
    const back = c.run('do', 'back').out;
    expect(back).not.toContain('════');
    expect(c.run('look').out.length).toBeGreaterThan(page.length / 2);
  });

  it('the hints are counted on the first page, by `hint` and on the form; not under later pages', () => {
    const d = dealBoard(11, 1, 'lost-item');
    const c = cli(11, 1, 'lost-item');
    expect(c.first.out).toContain('You have three hints tonight.');
    expect(c.run('hint').out).toContain('Hints: 2 left (`hint`).');
    const next = c.run('do', playBoardOracle(d).commands[0] as string).out;
    expect(next).not.toContain('Hints:');
    expect(c.run('report').out).toContain('Hints: 2 left (`hint`).');
  });
});

describe('docs/80: the picker says its rule once a night, and the fastest solve agrees with it', () => {
  it('the whole note before anybody is confronted; after, how to pick', () => {
    for (const [seed, tier, type] of [[153, 2, 'lost-item'], [37, 4, 'murder']] as const) {
      const d = dealBoard(seed, tier, type);
      const cmds = playBoardOracle(d).commands;
      const puts = cmds.map((x, i) => [x, i] as const).filter(([x]) => x.startsWith('put '));
      if (puts.length === 0) continue;
      const [cmd, i] = puts[0] as readonly [string, number];
      const who = (/^put (\S+)/.exec(cmd) as RegExpExecArray)[1] as string;
      const before = route(d, cmds.slice(0, i));
      const pk = pickerFor(d, before, who);
      expect(pk, `${seed}`).not.toBeNull();
      expect(pickerNote(d, pk as NonNullable<typeof pk>, before)).toMatch(/takes an action and isn’t needed to prove (?:he|she) lied/);
      // A night that has confronted somebody already: only how to pick (and the last action, when it is).
      const after = { ...before, puts: [{ person: 'x', hour: 10, line: 'x', landed: false }] } as unknown as BoardRun;
      expect(pickerNote(d, pk as NonNullable<typeof pk>, after)).toMatch(/^Pick the hour that doesn’t match, then who says otherwise\.(?: This is your last action: .+)?$/);
    }
  });

  it('a spare confrontation in the fastest solve is never what caught them in the lie', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const tier of [2, 4] as const) {
        const d = dealBoard(seed, tier);
        const o = playBoardOracle(d);
        const v = scoreBoard(d, o.run, o.report);
        const lines = fastestSolveLines(d, o.run, v.outcome).join(' ');
        expect(lines, `${seed}/${tier}`).not.toMatch(/caught (?:him|her|them) in the lie/);
      }
    }
  });
});

describe('docs/80: each rule said once', () => {
  it('the rules say nothing the teach lines say', () => {
    const rules = BOARD_RULES.join(' ');
    expect(rules).not.toMatch(/five answers|five questions|Hint button|the person who told you/);
    expect(BOARD_TEACH_LINES.join(' ')).toMatch(/five questions/);
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
    const help = flat(runPlay(['help'], io).out);
    for (const l of [...BOARD_TEACH_LINES, ...BOARD_RULES]) expect(help.split(flat(l.replace(/\bThe Hint button\b/g, 'The `hint` command'))).length - 1, l).toBe(1);
  });
});

describe('docs/80: the curtain and the story', () => {
  it('a step’s reason doesn’t say again the ask its label says', () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (const tier of [0, 2, 5] as const) {
        const d = dealBoard(seed, tier);
        for (const s of curtainSheet(d).fastest.steps) {
          expect(s.why, `${seed}/${tier} ${s.label}`).not.toMatch(/: (?:ask [^:]*? (?:where (?:he|she) was|who was there)|search [^:]+|confront [^:]+)\.$/);
          if (s.n !== '+') expect(s.why.length, `${seed}/${tier} ${s.label}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('a lost thing’s story says the place once, and the murder’s says the reason plainly', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const d = dealBoard(seed, 1, 'lost-item');
      const st = storyOfBoard(d).join(' ');
      expect(st, `${seed}`).not.toMatch(/told the room at .+? about\b/);
      const m = dealBoard(seed, 2, 'murder');
      expect(storyOfBoard(m).join(' '), `${seed}`).toMatch(/ did it, because /);
      expect(storyOfBoard(m).join(' ')).not.toMatch(/The reason was an old one/);
    }
  });

  it('the truth report still files five out of five on these nights (nothing the report needs went)', () => {
    for (const [seed, tier, type] of [[153, 2, 'lost-item'], [141, 4, 'murder'], [12, 0, 'murder']] as const) {
      const d = dealBoard(seed, tier, type);
      const o = playBoardOracle(d);
      const v = scoreBoard(d, o.run, truthReport(d, o.run));
      expect(v.points).toBe(v.asked);
    }
  });
});
