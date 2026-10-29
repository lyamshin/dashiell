/**
 * docs/63: what the fifth round of blind playtests found in the interface, the report and the walks,
 * held to. The testers' own nights (Raw 11 lost item, Poached 5 murder, Medium 14 lost pet,
 * Hard-boiled 8 murder) along their own routes, and each rule over the oracle's nights.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { lineShown, linesHeld } from '../src/game/board/knowledge.js';
import { OFFICE, budgetCalls, dealBoard, placeName, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { blankRule, boardFields, fastestSolveLines, notebookLines, scoreBoard, spareCalls, truthReport } from '../src/game/board/report.js';
import { TALK_HEADING, notebookText, questionsText } from '../src/game/board/text.js';
import { hintsNote } from '../src/game/board/hints.js';
import { FACE_MARK } from '../src/game/board/grid.js';
import { spot, walkBetween } from '../src/game/board/walk.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

/** The four testers' saves, as they played them (scratchpad playtest5-*.json). */
const RAW11 = { seed: 11, tier: 0, type: 'lost-item', cmds: ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask bellucci evening', 'put bellucci 10 list:barkeep@10'] };
const POACHED5 = { seed: 5, tier: 2, type: 'murder', cmds: ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask reinhardt evening', 'put reinhardt 9 list:barkeep@9', 'go u', 'ask ruggiero evening', 'put ruggiero 9 list:xwatcher@9', 'ask ashby evening'] };
const MEDIUM14 = { seed: 14, tier: 4, type: 'lost-pet', cmds: ['go scene', 'search scene', 'go neighbours', 'ask whitfield evening', 'go bar', 'ask barkeep list', 'ask pickering evening', 'go h', 'ask thorndike evening', 'put thorndike 10 remark:account:pickering#0', 'go u', 'ask alfano evening', 'put alfano 10 list:barkeep@10', 'ask fairbanks evening'] };
const HB8 = { seed: 8, tier: 5, type: 'murder', cmds: ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'ask grasso evening', 'put grasso 10 list:xwatcher@10', 'go bar', 'ask barkeep list', 'ask abramowitz evening', 'go h', 'ask renfro evening', 'go u', 'ask ukeeper list'] };
type Night = typeof RAW11;

const played = (n: Night): { d: BoardDeal; run: BoardRun } => {
  const d = dealBoard(n.seed, n.tier as TierIndex, n.type as 'murder');
  let run = newBoardRun(d);
  for (const c of n.cmds) {
    const r = stepBoard(d, run, c);
    expect(r.error, c).toBeUndefined();
    run = r.run;
  }
  return { d, run };
};

/** The CLI, on a save written with these events. */
const cli = (n: Night, extra: Record<string, unknown> = {}) => {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  runPlay(['new', '--seed', String(n.seed), '--tier', String(n.tier), '--type', n.type, '--save', 's', '--no-teach'], io);
  const save = JSON.parse(files.get('s') as string);
  files.set('s', JSON.stringify({ ...save, events: n.cmds.map((x) => ({ do: x })), ...extra }));
  return (...args: string[]) => runPlay([...args, '--save', 's'], io).out;
};

/** The oracle's nights, a few seeds a tier and type. */
const NIGHTS: { d: BoardDeal; run: BoardRun }[] = [];
for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
  for (const type of typesFor(tier)) {
    for (let seed = 1; seed <= 3; seed++) {
      const d = dealBoard(seed, tier, type);
      NIGHTS.push({ d, run: playBoardOracle(d).run });
    }
  }
}

describe('round 5, U1: picking somebody is free; each question is a call', () => {
  it('the heading says it once, and a person’s row counts the questions still to ask', () => {
    const out = cli(RAW11)('look');
    expect(out).toContain(`${TALK_HEADING}:`);
    expect(out).not.toMatch(/free · \d/);
    expect(out).toMatch(/Lanza\s+1 question$/m);
    // (Round 6, U2 and U4: "nothing left to ask", and a confront doesn't count as a question.)
    expect(out).toMatch(/Alfano\s+nothing left to ask$/m);
    expect(questionsText({ choices: [{ command: 'a', label: 'a', minutes: 1, lead: false, done: true }, { command: 'b', label: 'b', minutes: 1, lead: false, done: false }] })).toBe('1 question');
  });
});

describe('round 5, U2 and U6: the report says what to type, and what a blank is, once', () => {
  it('what a blank goes in as is one sentence, said once (docs/78: the book’s selects say “I don’t know” themselves)', () => {
    for (const n of [RAW11, POACHED5, MEDIUM14, HB8]) {
      const out = cli(n)('report').replace(/\s+/g, ' ');
      expect(out.match(/Leave anything out/g)?.length, n.type).toBe(1);
      const { d, run } = played(n);
      expect(out).toContain(blankRule(d, run.used >= budgetCalls(d)));
    }
    // (docs/64: in plain words.)
    expect(blankRule(dealBoard(14, 4, 'lost-pet'), false)).toBe('Closing the case is final. Leave anything out if you’re not sure: it goes in as “I don’t know”.');
    expect(blankRule(dealBoard(11, 0, 'lost-item'), true)).toMatch(/^No actions left\. /);
  });
});

describe('round 5, U4: the fences offered are the ones the night named', () => {
  it('a report option for a fence nobody named that night fails', () => {
    for (const { d, run } of NIGHTS.filter((x) => x.d.kase.type !== 'murder')) {
      const said = [...run.log.flatMap((p) => p.blocks.map((b) => ('text' in b ? b.text : ''))), ...linesHeld(d.kase, run).map((l) => l.text)].join('\n');
      const where = boardFields(d, run).find((f) => f.key === 'where');
      // (Round 6, U5: the option is "With Pardo"; the night named Pardo.)
      for (const o of where?.options.filter((x) => x.value.startsWith('holder:')) ?? []) expect(said, `${d.kase.id} ${o.label}`).toContain(o.label.replace(/^With /, ''));
      // The truth is still in its own words on the verdict, named or not.
      expect(boardFields(d).find((f) => f.key === 'where')?.options.some((o) => o.value === truthReport(d).where)).toBe(true);
    }
  });

  it('Raw 11 offers Pardo and the flat, not Lou and Benny', () => {
    const { d, run } = played(RAW11);
    expect(boardFields(d, run).find((f) => f.key === 'where')?.options.map((o) => o.label)).toEqual(['With Pardo', 'Still at the Marchetti flat']);
  });
});

describe('round 5, U5: the notebook and the report say the line plainly, and as the page did', () => {
  it('a watcher’s line is in the third person, and says no more than the watcher did', () => {
    const { d, run } = played(HB8);
    const texts = linesHeld(d.kase, run).map((l) => lineShown(d.kase, run, l));
    expect(texts).toContain('Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt couldn’t say who that was.');
    expect(texts).toContain('Broadnax: at ten o’clock, Grasso was at the Automat, with somebody at the same table; Broadnax didn’t know who that was.');
    for (const { d: d2, run: r2 } of NIGHTS) {
      for (const l of linesHeld(d2.kase, r2).filter((x) => x.kind === 'list')) expect(l.text, d2.kase.id).not.toMatch(/\bI (?:didn’t|couldn’t)\b|back to the room/);
    }
  });

  it('a claim says “home” where the page did, and the notebook says each line as the page did', () => {
    const { d, run } = played(MEDIUM14);
    const nb = notebookText(d, run).replace(/\s+/g, ' ');
    expect(nb).toContain('Thorndike says he was home at ten o’clock, on his own.');
    expect(nb).not.toContain('at Thorndike’s flat at ten');
    expect(nb).toContain('Fritz went at nine or ten o’clock.');
    // (The client's lines are under "What my client said", in the office's words.)
    for (const o of notebookLines(d, run).filter((x) => !x.value.startsWith('given#'))) expect(nb).toContain(o.label.replace(/\s+/g, ' '));
  });

  it('the why form says the reason plainly', () => {
    const d = dealBoard(11, 0, 'lost-item');
    // (Round 6, U6: in her own mouth, no "them" for one woman; the verdict says her.)
    expect(boardFields(d).find((f) => f.key === 'why')?.options.map((o) => o.label)).toContain('Says “the late Mr. Marchetti promised me the watch”');
  });
});

describe('round 5, U7: the verdict says which call was spare, and the score doesn’t move', () => {
  const filedAs = (n: Night) => {
    const { d, run } = played(n);
    const r = stepBoard(d, run, 'file').run;
    return { d, run: r, v: scoreBoard(d, r, truthReport(d, r)) };
  };

  // (book-look, item 5: said under "What really happened" now, `fastestSolveLines`, never in the
  // verdict's close; and a confrontation that landed is never called needless: what it got is said.)
  it('the testers’ one spare call each was a put, and the fastest solve says so', () => {
    const raw = filedAs(RAW11);
    expect(raw.v.outcome).toBe('solved');
    // (Round 6, P11: what showed it, the coat, not "Alfano had already told me".)
    expect(fastestSolveLines(raw.d, raw.run, raw.v.outcome).join(' ')).toBe('It took me 8 actions; the fastest solve takes 7. It doesn’t confront Bellucci: the coat Alfano saw go straight to Pardo at eleven shows where the watch went. Confronting him got him to say it.');
    expect(raw.v.closing.join(' ')).not.toMatch(/It took me|better detective|didn’t need/);
    for (const [n, who, him, he] of [[POACHED5, 'Reinhardt', 'her', 'she'], [MEDIUM14, 'Thorndike', 'him', 'he'], [HB8, 'Grasso', 'her', 'she']] as const) {
      const { d, run, v } = filedAs(n);
      expect(spareCalls(d, run)).toHaveLength(1);
      expect(fastestSolveLines(d, run, v.outcome).join(' ')).toContain(`It doesn’t confront ${who}. Confronting ${him} caught ${him} in the lie, even if ${he} wouldn’t say more.`);
      expect(v.closing.join(' ')).not.toMatch(/It took me|didn’t need/);
      expect(v.points).toBe(v.asked);
    }
  });

  it('at par there is nothing spare, and never more than the calls over par; a night at par isn’t scolded', () => {
    for (const { d, run } of NIGHTS) {
      expect(spareCalls(d, run), d.kase.id).toEqual([]);
      const v = scoreBoard(d, run, truthReport(d, run));
      expect(v.closing.join(' ')).not.toContain('I didn’t need');
      const fast = fastestSolveLines(d, run, v.outcome).join(' ');
      if (v.outcome === 'solved') expect(fast, d.kase.id).toMatch(/^It took me \d+ actions?, and the fastest solve takes \d+\. It can’t be done in fewer\.$/);
      expect(fast).not.toMatch(/better detective|didn’t need|needless/);
    }
  });
});

describe('round 5, U8: the CLI’s head says the time, and a page turned back to says which', () => {
  it('no “page N of N” in the head', () => {
    const say = cli(RAW11);
    expect(say('look')).not.toMatch(/page \d+ of \d+/);
    expect(say('page', '2')).toMatch(/A page turned back to: page 2 of 9\./);
  });
});

describe('round 5, U9: the picker says what a line says, never the face matched to a name', () => {
  it('Hard-boiled 8: Reinhardt’s camel coat isn’t Abramowitz’s on the picker, which says the line as the notebook does', () => {
    const played8 = played(HB8);
    const d = played8.d;
    // (docs/65 §3: Renfro's ten is a clash once the camel coat is matched; the tester marked Abramowitz at the Odessa at ten.)
    const run: BoardRun = { ...played8.run, marks: { abramowitz: { '10': { at: 'bar' } } } };
    const pk = pickerFor(d, run, 'renfro');
    const labels = (pk?.claims ?? []).flatMap((c) => c.lines.map((l) => l.label)).join('\n');
    expect(labels).toContain('Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt couldn’t say who that was.');
    // (The notebook's words, word for word.)
    for (const l of pk?.claims.flatMap((c) => c.lines) ?? []) expect(linesHeld(d.kase, run).map((x) => lineShown(d.kase, run, x))).toContain(l.label);
    expect(labels).not.toMatch(/was Abramowitz’s/);
  });
});

describe('round 5, U10, docs/67 and round 7, U4: at Hard-boiled the mark line is said once, on the page of the first coat; the only-star note is gone', () => {
  it('not on page one, at Hard-boiled only', () => {
    const d = dealBoard(8, 5, 'murder');
    const run = newBoardRun(d);
    expect(hintsNote(d, run)).toBeNull();
    void FACE_MARK;
    expect(cli({ ...HB8, cmds: [] })('look')).not.toMatch(/only star/);
    expect(hintsNote(d, stepBoard(d, run, 'go scene').run)).toBeNull();
    expect(hintsNote(dealBoard(14, 4, 'lost-pet'), newBoardRun(dealBoard(14, 4, 'lost-pet')))).toBeNull();
  });
});

describe('round 5, U11: the streets where they really run', () => {
  it('a place on an avenue is north of Houston Street, and the walk there from Mulberry Street is uptown', () => {
    for (const { d } of NIGHTS) {
      for (const p of d.kase.places.filter((x) => /Avenue/.test(x.street ?? ''))) {
        expect(spot(d.kase, p.id).y, `${d.kase.id} ${placeName(d.kase, p.id)}`).toBeGreaterThanOrEqual(4);
        expect(walkBetween(d.kase, OFFICE, p.id).dir, `${d.kase.id} ${placeName(d.kase, p.id)}`).toMatch(/^uptown/);
      }
    }
  });

  it('Medium 14: from Mulberry Street to Second Avenue is uptown and east', () => {
    const { run } = played(MEDIUM14);
    const page = run.log[1]?.blocks.map((b) => ('text' in b ? b.text : '')).join(' ') ?? '';
    // (docs/66, P7: the bearing on the night's first walk, in whichever card says it.)
    // (Round 7, P2: the walk says how far and which way, and the arrival names the place.)
    // (docs/71, item 1: no tail on a walk that says "good": "I set off uptown and east. It was a good walk.")
    expect(page).toMatch(/uptown and east,? (?:to|and I was at) the Hauck flat|Hauck flat (?:was|lay) [^.]* uptown and east|^(?:It was [^.]* uptown and east\b|I set off uptown and east\.)[^]*[Tt]he Hauck flat/);
    expect(page).not.toMatch(/downtown/);
  });
});
