/**
 * docs/63: what the fifth round of blind playtests found in the interface, the report and the walks,
 * held to. The testers' own nights (Raw 11 lost item, Poached 5 murder, Medium 14 lost pet,
 * Hard-boiled 8 murder) along their own routes, and each rule over the oracle's nights.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { pickerFor } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { accountOf, lineShown, linesHeld } from '../src/game/board/knowledge.js';
import { OFFICE, budgetCalls, dealBoard, placeName, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { blankRule, boardFields, breakOptionsShown, hoursThatMattered, lineGroupHeads, scoreBoard, spareCalls, truthReport } from '../src/game/board/report.js';
import { TALK_HEADING, notebookText, questionsText, starsNote } from '../src/game/board/text.js';
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
    expect(out).toMatch(/Alfano\s+all asked$/m);
    expect(questionsText({ choices: [{ command: 'a', label: 'a', minutes: 1, lead: false, done: true }, { command: 'b', label: 'b', minutes: 1, lead: false, done: false }] })).toBe('1 question');
  });
});

describe('round 5, U2 and U6: the report says what to type, and what a blank is, once', () => {
  it('“cleared” is a number from the same list', () => {
    const out = cli(HB8)('report', 'Grasso').replace(/\s+/g, ' ');
    expect(out).toContain('If Grasso is the other liar, give “cleared” as a number from this list too.');
    expect(out).not.toMatch(/counts down/);
  });

  it('what a blank goes in as is one sentence, said once, the same in the book', () => {
    for (const n of [RAW11, POACHED5, MEDIUM14, HB8]) {
      const out = cli(n)('report').replace(/\s+/g, ' ');
      expect(out.match(/Leave anything blank/g)?.length, n.type).toBe(1);
      const { d, run } = played(n);
      expect(out).toContain(blankRule(d, run.used >= budgetCalls(d)));
    }
    // (docs/64: in plain words.)
    expect(blankRule(dealBoard(14, 4, 'lost-pet'), false)).toBe('Closing the case is final. Leave anything blank if you’re not sure.');
    expect(blankRule(dealBoard(11, 0, 'lost-item'), true)).toMatch(/^No actions left\. /);
  });
});

describe('round 5, U3: docs/55 5’s wide first group, under a heading that says what it holds', () => {
  it('every line under the heading fits it: at the hours that mattered, about them or a place they said they were tonight', () => {
    for (const { d, run } of NIGHTS) {
      const hours = new Set(hoursThatMattered(d));
      const lines = linesHeld(d.kase, run);
      for (const who of d.kase.people.filter((p) => p.role === 'suspect').map((p) => p.id)) {
        const own = run.asked.includes(`account:${who}`) ? accountOf(d.kase, who) : undefined;
        const theirs = new Set(Object.values(own?.claims ?? {}).map((cl) => cl?.place));
        const head = lineGroupHeads(d, run, who).touching;
        expect(head, `${d.kase.id} ${who}`).toMatch(/^What you know about .+ at .+:$/);
        for (const o of breakOptionsShown(d, run, who).filter((x) => x.touches)) {
          const l = lines.find((x) => x.id === o.value);
          expect(l && l.hour !== undefined && hours.has(l.hour), `${d.kase.id} ${who} ${o.label}`).toBe(true);
          expect(l?.about.includes(who) || (!!own && l?.place !== undefined && theirs.has(l.place)), `${d.kase.id} ${who}: “${o.label}” under “${head}”`).toBe(true);
        }
      }
    }
  });

  it('the testers’ nights: Bellucci’s Kowalski’s ten o’clock fits the heading now, and the line that breaks a story is one of several', () => {
    const out = cli(RAW11)('report', 'Bellucci');
    const { d, run } = played(RAW11);
    const head = lineGroupHeads(d, run, 'bellucci');
    // (docs/64: the heading in plain words, over docs/55 5's same wide group.)
    expect(head.touching).toBe('What you know about Bellucci at ten:');
    const first = out.slice(out.indexOf('What you know about Bellucci at ten:'), out.indexOf('Everything else:'));
    expect(first).toContain('Mrs. Kowalski: at ten o’clock, only Rafferty and Moretti were at');
    expect(first).toContain('Alfano: at ten o’clock, only Steinbach, Lanza and Pardo were at');
    const med = played(MEDIUM14);
    const thorndike = breakOptionsShown(med.d, med.run, 'thorndike').filter((o) => o.touches);
    expect(thorndike.length).toBeGreaterThan(2);
    expect(thorndike[0]?.value).not.toBe('remark:account:pickering#0');
    expect(lineGroupHeads(med.d, med.run, 'thorndike').touching).toBe('What you know about Thorndike at nine or ten:');
    const hb = played(HB8);
    expect(breakOptionsShown(hb.d, hb.run, 'renfro').filter((o) => o.touches).length).toBeGreaterThan(2);
  });
});

describe('round 5, U4: the fences offered are the ones the night named', () => {
  it('a report option for a fence nobody named that night fails', () => {
    for (const { d, run } of NIGHTS.filter((x) => x.d.kase.type !== 'murder')) {
      const said = [...run.log.flatMap((p) => p.blocks.map((b) => ('text' in b ? b.text : ''))), ...linesHeld(d.kase, run).map((l) => l.text)].join('\n');
      const where = boardFields(d, run).find((f) => f.key === 'where');
      for (const o of where?.options.filter((x) => x.value.startsWith('holder:')) ?? []) expect(said, `${d.kase.id} ${o.label}`).toContain(o.label);
      // The truth is still in its own words on the verdict, named or not.
      expect(boardFields(d).find((f) => f.key === 'where')?.options.some((o) => o.value === truthReport(d).where)).toBe(true);
    }
  });

  it('Raw 11 offers Pardo and the flat, not Lou and Benny', () => {
    const { d, run } = played(RAW11);
    expect(boardFields(d, run).find((f) => f.key === 'where')?.options.map((o) => o.label)).toEqual(['Pardo', 'Still at the Marchetti flat']);
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

  it('a claim says “home” where the page did, and the notebook and the report agree word for word', () => {
    const { d, run } = played(MEDIUM14);
    const nb = notebookText(d, run).replace(/\s+/g, ' ');
    expect(nb).toContain('Thorndike says he was home at ten o’clock, on his own.');
    expect(nb).not.toContain('at Thorndike’s flat at ten');
    expect(nb).toContain('Fritz went at nine or ten o’clock.');
    // (The client's lines are under "What my client said", in the office's words.)
    for (const o of breakOptionsShown(d, run, 'thorndike').filter((x) => !x.value.startsWith('given#'))) expect(nb).toContain(o.label.replace(/\s+/g, ' '));
  });

  it('the why form says the reason plainly', () => {
    const d = dealBoard(11, 0, 'lost-item');
    expect(boardFields(d).find((f) => f.key === 'why')?.options.map((o) => o.label)).toContain('Says the late Mr. Marchetti promised them the watch');
  });
});

describe('round 5, U7: the verdict says which call was spare, and the score doesn’t move', () => {
  const filedAs = (n: Night) => {
    const { d, run } = played(n);
    const r = stepBoard(d, run, 'file').run;
    return { d, run: r, v: scoreBoard(d, r, truthReport(d, r)) };
  };

  it('the testers’ one spare call each was a put, and the closing says so', () => {
    const raw = filedAs(RAW11);
    expect(raw.v.outcome).toBe('solved');
    expect(raw.v.closing.join(' ')).toContain('It took me 8 actions. A better detective would have done it in 7. I didn’t need to confront Bellucci: Alfano had already told me where the watch went.');
    for (const [n, who, he] of [[POACHED5, 'Reinhardt', 'she'], [MEDIUM14, 'Thorndike', 'he'], [HB8, 'Grasso', 'she']] as const) {
      const { d, run, v } = filedAs(n);
      expect(spareCalls(d, run)).toHaveLength(1);
      expect(v.closing.join(' ')).toContain(`I didn’t need to confront ${who}: ${he} wouldn’t say, and I had enough to close the case without it.`);
      expect(v.points).toBe(v.asked);
    }
  });

  it('at par there is nothing spare, and never more than the calls over par', () => {
    for (const { d, run } of NIGHTS) {
      expect(spareCalls(d, run), d.kase.id).toEqual([]);
      expect(scoreBoard(d, run, truthReport(d, run)).closing.join(' ')).not.toContain('I didn’t need');
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
    const { d, run } = played(HB8);
    const pk = pickerFor(d, run, 'renfro');
    const labels = (pk?.claims ?? []).flatMap((c) => c.lines.map((l) => l.label)).join('\n');
    expect(labels).toContain('Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt couldn’t say who that was.');
    // (The notebook's words, word for word.)
    for (const l of pk?.claims.flatMap((c) => c.lines) ?? []) expect(linesHeld(d.kase, run).map((x) => lineShown(d.kase, run, x))).toContain(l.label);
    expect(labels).not.toMatch(/was Abramowitz’s/);
  });
});

describe('round 5, U10: at Hard-boiled, page one says its star is the only one', () => {
  it('said on page one, at Hard-boiled only', () => {
    const d = dealBoard(8, 5, 'murder');
    const run = newBoardRun(d);
    expect(starsNote(d, run)).toMatch(/only star/);
    expect(cli({ ...HB8, cmds: [] })('look')).toMatch(/At Hard-boiled this is the only star you get/);
    expect(starsNote(d, stepBoard(d, run, 'go scene').run)).toBeNull();
    expect(starsNote(dealBoard(14, 4, 'lost-pet'), newBoardRun(dealBoard(14, 4, 'lost-pet')))).toBeNull();
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
    expect(page).toMatch(/uptown and east to the Hauck flat/);
    expect(page).not.toMatch(/downtown/);
  });
});
