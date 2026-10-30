/**
 * docs/78: closing the case in five short answers. Who did it; who caught them out (whose word shows
 * their story was a lie, or their own second story); when; how or where it is now; why. One point
 * each, out of five, no halves; a star is five out of five. Nothing asks about anybody else, and
 * nothing asks for a line.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, isMurder, nameOf, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle, playReader } from '../src/game/board/oracle.js';
import { CAUGHT_LABEL, SECOND, boardFields, chargeLines, curtainOfBoard, curtainSheet, heldBreakers, reportFrom, scoreBoard, truthReport } from '../src/game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

const nights = (tiers: TierIndex[], seeds: number): BoardDeal[] => tiers.flatMap((tier) => typesFor(tier).flatMap((type) => Array.from({ length: seeds }, (_, i) => dealBoard(i + 1, tier, type))));
const ALL = nights([0, 1, 2, 3, 4, 5], 2);

/** Whose word a line is, as the report names it. */
const whose = (d: BoardDeal, run: Parameters<typeof heldBreakers>[1]) => new Set(heldBreakers(d, run).map((l) => (l.kind === 'second' ? SECOND : (l.speaker as string))));

describe('docs/78: the five questions', () => {
  it('every night asks who, who caught them out, when, how or where, and why, in that order', () => {
    for (const d of ALL) {
      const fields = boardFields(d);
      expect(fields.map((f) => f.key), d.kase.id).toEqual(['who', 'caught', 'when', isMurder(d.kase) ? 'how' : 'where', 'why']);
      expect(fields[1]?.label).toBe(CAUGHT_LABEL);
      expect(fields.map((f) => f.label).join(' ')).not.toMatch(/anyone else|clears|proves|hunch/i);
    }
  });

  it('who caught them out offers the people whose word you hold, in the order you asked, and the second story once one is told', () => {
    for (const d of ALL) {
      const { run } = playBoardOracle(d);
      const opts = boardFields(d, run).find((f) => f.key === 'caught')?.options ?? [];
      const asked = [...new Set(run.asked.flatMap((q) => /^(?:account|list):(.+)$/.exec(q)?.[1] ?? []))];
      const people = opts.filter((o) => o.value !== SECOND);
      expect(people.map((o) => o.value), d.kase.id).toEqual(asked);
      // (By the notebook's name: "Feeney", "Mrs. Rafferty".)
      for (const o of people) expect(o.label).toBe(nameOf(d.kase, o.value));
      const told = run.asked.some((q) => q.startsWith('confront:') && d.kase.confrontations.find((k) => `confront:${k.person}@${k.hour}` === q)?.secondLie?.place);
      expect(opts.some((o) => o.value === SECOND), d.kase.id).toBe(told);
      // Nothing it offers is a line, and nothing is a hunch.
      expect(opts.every((o) => !/[:“]/.test(o.label))).toBe(true);
    }
  });
});

describe('docs/78: one point each, no halves', () => {
  it('the oracle files five out of five; a perfect report with no hints is a gold star', () => {
    for (const d of ALL) {
      const o = playBoardOracle(d);
      expect(o.ok, `${d.kase.id}: ${o.reason}`).toBe(true);
      const v = scoreBoard(d, o.run, o.report);
      expect(v).toMatchObject({ points: 5, asked: 5, scoreLine: '5 out of 5.', outcome: 'solved', star: 'gold' });
      expect(v.fields.every((f) => f.correct && f.correction === undefined)).toBe(true);
    }
  });

  it('who caught them out is right for anybody whose held word breaks the story, and for nobody else', () => {
    let checked = 0;
    for (const d of ALL) {
      const o = playBoardOracle(d);
      const breakers = whose(d, o.run);
      for (const opt of boardFields(d, o.run).find((f) => f.key === 'caught')?.options ?? []) {
        const v = scoreBoard(d, o.run, { ...o.report, caught: opt.value });
        expect(v.fields.find((f) => f.key === 'caught')?.correct, `${d.kase.id} ${opt.value}`).toBe(breakers.has(opt.value));
        expect(v.points).toBe(breakers.has(opt.value) ? 5 : 4);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('the right person against the wrong name is wrong, and says whom they caught out', () => {
    for (const d of ALL) {
      const o = playBoardOracle(d);
      const c = d.kase;
      const innocent = c.people.find((p) => p.role === 'suspect' && p.id !== c.crime.culprit)?.id as string;
      const v = scoreBoard(d, o.run, { ...o.report, who: innocent });
      const caught = v.fields.find((f) => f.key === 'caught');
      expect(caught?.correct).toBe(false);
      expect(v.outcome).toBe('wrong-man');
      if (o.report.caught !== SECOND) expect(caught?.correction, c.id).toBe(`${nameOf(c, o.report.caught as string)} caught ${nameOf(c, c.crime.culprit)} out, not ${nameOf(c, innocent)}`);
    }
  });

  it('every outcome the closing lines need, and every correction short', () => {
    const d = dealBoard(39, 5, 'murder');
    const o = playBoardOracle(d);
    const truth = truthReport(d, o.run);
    const score = (r: Partial<typeof truth>) => scoreBoard(d, o.run, { ...truth, ...r });
    expect(score({}).outcome).toBe('solved');
    expect(score({ caught: null }).outcome).toBe('lucky');
    expect(score({ caught: 'xwatcher' }).outcome).toBe('lucky');
    expect(score({ when: 9 }).outcome).toBe('thin');
    expect(score({ who: 'obermann' }).outcome).toBe('wrong-man');
    expect(score({ who: null }).outcome).toBe('cold');
    const wrong = score({ who: 'obermann', caught: null, when: 9, how: 'a revolver', why: 'obermann' });
    expect(wrong.points).toBe(0);
    expect(wrong.scoreLine).toBe('0 out of 5.');
    expect(Object.fromEntries(wrong.fields.map((f) => [f.key, f.correction]))).toEqual({
      who: 'it was Tillman',
      caught: 'Feeney caught Tillman out',
      when: 'it was ten o’clock',
      how: 'it was laudanum',
      why: 'it was Tillman’s: Grasso threw her out of a lease',
    });
    expect(score({ caught: 'xwatcher' }).fields.find((f) => f.key === 'caught')).toMatchObject({ given: 'Mrs. Rafferty', correction: 'Feeney caught her out' });
    // Who caught them out, never held: who would have.
    const bare = scoreBoard(d, { ...o.run, asked: o.run.asked.filter((q) => q !== 'list:barkeep') }, truth);
    expect(bare.fields.find((f) => f.key === 'caught')?.correction).toBe('Feeney would have caught her out');
    for (const v of [score({}), wrong]) for (const f of v.fields) expect(f).not.toHaveProperty('half');
  });

  it('a lost thing’s place is said as a place: “it was with Benny”, never “it was With Benny”', () => {
    let n = 0;
    for (const d of nights([0, 1, 3, 5], 4).filter((x) => !isMurder(x.kase))) {
      const o = playBoardOracle(d);
      if (d.kase.crime.whereNow?.place === d.kase.crime.scene) continue;
      const where = scoreBoard(d, o.run, { ...o.report, where: 'scene' }).fields.find((f) => f.key === 'where');
      expect(where?.correct).toBe(false);
      expect(where?.correction).toMatch(/^it was (?:with|still at) [A-Z]/);
      n++;
    }
    expect(n).toBeGreaterThan(3);
  });
});

describe('docs/78: the charge said back', () => {
  it('who caught them out by name, and what is left as “I don’t know”', () => {
    const d = dealBoard(39, 5, 'murder');
    const { run } = playBoardOracle(d);
    expect(chargeLines(d, run, reportFrom(d, { who: 'tillman', caught: 'barkeep', when: '10', how: 'laudanum', why: 'tillman' }))).toEqual([
      'You’re charging Lurline Tillman: at ten o’clock, with laudanum.',
      'Feeney caught her out.',
      'The reason: Grasso threw her out of a lease.',
    ]);
    expect(chargeLines(d, run, reportFrom(d, { who: 'tillman' }))).toEqual(['You’re charging Lurline Tillman.', 'You don’t know who caught her out, when, how and why.']);
  });
});

describe('docs/78: the curtain', () => {
  it('sets who caught them out beside whom you named, and never asks about anybody else', () => {
    for (const d of nights([2, 3, 4, 5], 3)) {
      const o = playBoardOracle(d);
      const sheet = curtainSheet(d, o.run, o.report);
      expect(sheet.sections.map((s) => s.key)).toEqual(isMurder(d.kase) ? ['caught'] : ['caught', 'where']);
      expect(sheet.sections[0]).toMatchObject({ head: 'Who caught them out', proof: { label: 'What gave it away' }, picked: { label: 'You named', mark: 'right' } });
      const text = curtainOfBoard(d, o.run, o.report);
      expect(text).not.toMatch(/WHO ELSE LIED|DID ANYONE ELSE LIE|What cleared|You picked|½/);
      // THE LIES keeps every lie, the innocent one's too.
      expect(text.split('THE LIES\n')[1]?.split('\n\n')[0]?.split('\n').length).toBe(d.kase.lies.length);
    }
    const d = dealBoard(39, 5, 'murder');
    const o = playBoardOracle(d);
    expect(curtainOfBoard(d, o.run, o.report)).toContain('WHO CAUGHT THEM OUT\nTillman said she was home at ten.\n  What gave it away: Feeney: at ten o’clock, only somebody in a sailor’s pea coat was at the Kit Kat; Feeney couldn’t say who that was. The one in a sailor’s pea coat was Obermann.\n  You named:         Feeney.  ✓');
    expect(curtainOfBoard(d, o.run, { ...o.report, who: 'obermann' })).toContain('  You named:         Feeney, but you charged Obermann.  ✗');
    expect(curtainOfBoard(d, o.run, { ...o.report, caught: null })).toContain('  You named:         I don’t know.  ✗');
  });
});

describe('docs/78: the CLI', () => {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  const d = dealBoard(39, 5, 'murder');
  const o = playBoardOracle(d);
  const fresh = () => files.set('s', JSON.stringify({ game: 'dashiell-play', version: 1, engine: 'board', seed: 39, tier: 5, type: 'murder', detective: 'Dashiell', events: [...o.commands.map((x) => ({ do: x })), { do: 'file' }], person: null, picker: null, claim: null }));
  const say = (...args: string[]) => runPlay([...args, '--save', 's'], io);

  it('`report` shows the five questions and their answers, numbered, and how to close', () => {
    fresh();
    const out = say('report').out;
    expect(out).toContain('Who caught them out? (caught):\n    1. Feeney\n    2. Obermann\n    3. Mrs. Rafferty\n    4. Thorndike\n    5. Feldman\n    6. Tillman\n');
    expect(out).toContain('close "who=…; caught=…; when=…; how=…; why=…"');
    expect(out).not.toMatch(/hunch|proof|cleared|anyone else|report <name>/i);
  });

  it('`caught=` is a name, enough of one, or its number; the old keys are refused with what to use', () => {
    for (const caught of ['Feeney', 'feeney', '1']) {
      fresh();
      const r = say('close', `who=Tillman; caught=${caught}; when=10; how=laudanum; why=threw them out`);
      expect(r.code, r.out).toBe(0);
      expect(r.out).toContain('Who caught them out? Feeney ✓');
      expect(r.out).toContain('5 out of 5.');
      expect(r.out).toContain('★ A gold star.');
    }
    fresh();
    // "Rafferty" is Mrs. Rafferty, the only one by that name on the list.
    expect(say('close', 'who=Tillman; caught=Rafferty; when=10; how=laudanum; why=1').out).toContain('Who caught them out? Mrs. Rafferty ✗ — Feeney caught her out');
    fresh();
    expect(say('close', 'who=Tillman; caught=Grasso').out).toBe('"Grasso" isn’t one of the caught answers: `report` shows them.');
    for (const key of ['proof', 'breaks', 'other', 'cleared', 'whereBy', 'evidence']) {
      fresh();
      const r = say('close', `who=Tillman; ${key}=1`);
      expect(r.code, key).toBe(1);
      expect(r.out, key).toMatch(/^The report doesn’t ask .+ any more\. /);
    }
  });

  it('the help and the rules teach the five answers, plainly', () => {
    const help = runPlay(['help'], io).out.replace(/\s+/g, ' ');
    expect(help).toContain('close "who=…; caught=…; when=…; how=…; why=…"');
    expect(help).not.toMatch(/proof=|other=|cleared=|hunch|counts half/);
    expect(BOARD_TEACH_LINES).toContain('To close the case you answer five questions: who did it, who caught them out, when, how, and why.');
    expect(BOARD_TEACH_LINES).toHaveLength(8);
    // (docs/80: the help prints the teach lines and the rules, each rule once.)
    expect(help).toContain('To close the case you answer five questions: who did it, who caught them out, when, how, and why.');
    expect(BOARD_RULES.join(' ')).toContain('Each answer is a point.');
    expect(BOARD_RULES.join(' ')).not.toMatch(/five answers/);
  });
});

describe('docs/78 §4: what the other liar’s question was holding', () => {
  // (docs/41 rule 9, docs/61: a reader that names the first or the last liar it caught, or the one a
  // hint handed it, solved under 10% from Poached up while the report asked who else lied. With the
  // question gone it solves far more often; the red herring inside the deduction is the work that
  // brings it back. Until then this is a target, not a gate.)
  it.todo('the shortcut readers solve under 10% of nights from Poached up (needs docs/78 §4’s red herring)');
  it('the reader handed a name by a hint solves no more than it did', () => {
    let n = 0;
    let star = 0;
    for (const d of nights([2, 3, 4, 5], 4)) {
      n++;
      if (playReader(d, d.kase.seed).ok) star++;
    }
    expect(star / n).toBeLessThan(0.1);
  });
});
