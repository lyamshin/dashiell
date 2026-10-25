/**
 * docs/68: round 7's bugs and wrong facts (the digest's B1–B8), each on the tester's own night, along
 * the tester's own route, and each rule beside it where a night can show it. Raw 23 (the Persian
 * cat), Poached 17, Medium 21 and Hard-boiled 19 (a pair night), played on main 04b40d7.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices, pageStars, pickerFor, pickerNote } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid } from '../src/game/board/grid.js';
import { meansLate, peopleAt } from '../src/game/board/knowledge.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { namePlural } from '../src/game/board/pages.js';
import { boardFields, curtainOfBoard, scoreBoard, storyOfBoard, truthReport, whereByLabel } from '../src/game/board/report.js';
import { clockWords } from '../src/game/board/clock.js';
import { notebookText, officeLines, pageBodyText } from '../src/game/board/text.js';
import { replaySave, runPlay, type PlayIo } from '../src/cli/play-lib.js';

type Ev = { do: string } | { mark: { person: string; hour: number; action: 'at'; place: string } };
const save = (seed: number, tier: number, type: string | undefined, events: Ev[]) => JSON.stringify({ game: 'dashiell-play', version: 1, engine: 'board', seed, tier, ...(type ? { type } : {}), detective: 'Dashiell', events, person: null, picker: null, claim: null });
const dos = (...cmds: string[]): Ev[] => cmds.map((x) => ({ do: x }));

/** The testers' routes, from their saves (scratchpad playtest7-*.json), up to closing the case. */
const RAW23 = save(23, 0, undefined, dos('go scene', 'search scene', 'go bar', 'ask barkeep list', 'ask winslow evening', 'go neighbours', 'ask xwatcher list', 'ask ashby motive', 'go bar', 'put winslow 10 list:xwatcher@10'));
const POACHED17 = save(17, 2, 'murder', [...dos('go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'ask callahan evening', 'go u', 'ask dandridge evening', 'put dandridge 9 list:barkeep@9', 'ask bledsoe evening'), { mark: { person: 'callahan', hour: 9, action: 'at', place: 'scene' } }, ...dos('go rooming', 'put callahan 9 list:xwatcher@9')]);
const MEDIUM21 = save(21, 4, undefined, dos('go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'go bar', 'ask vitale evening', 'go h', 'ask salerno evening', 'go u', 'ask sweeney evening', 'put sweeney 10 list:xwatcher@10', 'ask winslow evening'));
const HB19_EVENTS: Ev[] = [...dos('go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask mosley evening', 'go h', 'ask grasso evening', 'go u', 'ask donnelly evening', 'ask dandridge evening'), { mark: { person: 'mosley', hour: 9, action: 'at', place: 'bar' } }];
const HB19 = save(19, 5, 'murder', HB19_EVENTS);

const night = (text: string): { d: BoardDeal; run: BoardRun } => {
  const r = replaySave(text);
  return { d: r.d, run: r.run };
};
const pages = (run: BoardRun): string[] => run.log.map((p) => pageBodyText(p).replace(/\s+/g, ' '));
const all = (run: BoardRun): string => pages(run).join('\n');
const memIo = (files: Map<string, string>): PlayIo => ({ read: (p) => files.get(p) ?? null, write: (p, x) => void files.set(p, x) });

describe('B1: confronting somebody is done in the room with them (the CLI)', () => {
  it('Hard-boiled 19: `confront Mosley` from the card room says where he is, and opens nothing', () => {
    const files = new Map([['hb19.json', HB19]]);
    const io = memIo(files);
    const r = runPlay(['confront', 'Mosley', '--save', 'hb19.json'], io);
    expect(r.code).toBe(1);
    expect(r.out).toBe('Mosley isn’t here. He’s at Moskowitz’s, and confronting him takes a walk there first.');
    expect(JSON.parse(files.get('hb19.json') as string).picker).toBeNull();
    // In the room with him, it opens (a shorter way round, with an action left to confront him).
    files.set('hb19.json', save(19, 5, 'murder', [...dos('go scene', 'search scene', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask mosley evening', 'go h', 'ask grasso evening'), { mark: { person: 'mosley', hour: 9, action: 'at', place: 'bar' } }, ...dos('go bar')]));
    const there = runPlay(['confront', 'Mosley', '--save', 'hb19.json'], io);
    expect(there.code).toBe(0);
    expect(there.out).toMatch(/CONFRONT MOSLEY/);
  });

  it('a command the engine turns down is said, and never kept in the save', () => {
    // A save from before the fix: the picker opened on Mosley from the card room.
    const old = { ...JSON.parse(HB19), picker: 'mosley', claim: 9 };
    const files = new Map([['old.json', JSON.stringify(old)]]);
    const r = runPlay(['do', '1', '--save', 'old.json'], memIo(files));
    expect(r.code).toBe(1);
    expect(r.out).toBe('Mosley isn’t here.');
    expect(JSON.parse(files.get('old.json') as string).events).toHaveLength(old.events.length);
  });

  it('the book offers a confrontation only in the room: nobody away is ever on the page’s picker', () => {
    for (const tier of [2, 3, 4, 5] as TierIndex[]) {
      for (let seed = 1; seed <= 4; seed++) {
        for (const type of typesFor(tier)) {
          const d = dealBoard(seed, tier, type);
          let run = newBoardRun(d);
          for (const cmd of playBoardOracle(d).commands) {
            for (const g of boardChoices(d, run)) for (const ch of g.choices) if (ch.command.startsWith('picker ')) expect(peopleAt(d.kase, run, run.at)).toContain(ch.command.slice(7));
            run = stepBoard(d, run, cmd).run;
          }
        }
      }
    }
  });
});

describe('B2: a telling by change says a coming or going only where the board has it', () => {
  it('Hard-boiled 19, Bledsoe: the fur collar and Mosley are one man, there both hours', () => {
    const { run } = night(HB19);
    const p = pages(run).find((x) => x.includes('Somebody in a fur collar')) as string;
    expect(p).toContain('Somebody in a fur collar came in for a bite at nine. Mosley was here at ten.');
    expect(p).not.toMatch(/gone by ten|Mosley came in at ten/);
  });

  it('Poached 17, Dandridge: Renfro, at Moe’s all evening, never "left after eight"', () => {
    const { run } = night(POACHED17);
    const p = pages(run).find((x) => x.includes('Start with seven')) as string;
    expect(p).not.toMatch(/Renfro and Quill were with me at first and left after eight/);
    expect(p).toContain('Renfro kept me company at eight. Quill was with me at first and left after eight.');
  });
});

describe('B3: on a pair night, what broke the story is the face, never the partner who said the same', () => {
  it('Hard-boiled 19: the curtain, the story and the clash list cite Bledsoe’s fur collar', () => {
    const { d, run } = night(HB19);
    const curtain = curtainOfBoard(d, run);
    expect(curtain).toContain('What gave it away: Bledsoe: at nine o’clock, only somebody in a fur collar was at Moskowitz’s; Bledsoe couldn’t say who that was. The one in a fur collar was Mosley.');
    expect(curtain).not.toMatch(/What gave it away: Mosley says/);
    const story = storyOfBoard(d).join(' ');
    expect(story).toContain('Mosley said the same, to cover for her, but Bledsoe, the head waiter, had seen only somebody in a fur collar at Moskowitz’s at nine, and that was Mosley.');
    expect(story).not.toMatch(/Bledsoe and Mosley said otherwise/);
    const g = boardGrid(d.kase, run);
    for (const id of ['mosley', 'grasso']) {
      const lines = g.rows.find((r) => r.id === id)?.cells[9]?.lines ?? [];
      expect(lines.some((l) => l.startsWith('Bledsoe: at nine o’clock, only somebody in a fur collar')), id).toBe(true);
      expect(lines, id).toContain('Your guess: Mosley at Moskowitz’s at nine.');
    }
    expect(g.rows.find((r) => r.id === 'mosley')?.cells[9]?.lines).not.toContain('Grasso says she was home at nine o’clock, with Mosley.');
    expect(g.rows.find((r) => r.id === 'grasso')?.cells[9]?.lines).not.toContain('Mosley says he was at Grasso’s flat at nine o’clock, with Grasso.');
  });
});

describe('B4: a star asks who somebody passed only where a passer-by can be had, and says the walk', () => {
  it('Hard-boiled 19: the fastest solve asks Grasso where she was, on Mosley’s word', () => {
    const { d, run } = night(HB19);
    const step = curtainOfBoard(d, run).split('\n').find((x) => x.startsWith('7. ')) as string;
    expect(step).toBe('7. Ask Grasso: where were you tonight? Mosley says Grasso was with him at Grasso’s flat at nine: ask Grasso where she was.');
  });

  it('Medium 21: Vitale walked over, and the star says so before it asks who she passed', () => {
    const d = dealBoard(21, 4);
    let run = newBoardRun(d);
    for (const c of ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list']) run = stepBoard(d, run, c).run;
    expect(pageStars(d, run).map((s) => s.why)).toEqual(['Vitale walked over from Kowalski’s at ten — ask Vitale who she passed on the way']);
  });
});

describe('B5: "at the supper" only of who sat at the table', () => {
  it('Raw 23: the lodger the door was left unlocked for is never at the supper', () => {
    const { d, run } = night(RAW23);
    const text = all(run);
    expect(text).not.toMatch(/Lindemann(?: and [A-Z]\w+)? (?:were|was) at the supper/);
    expect(text).toContain('His lodger, Lindemann, a shoe clerk, was out, and had lost her key again.');
    expect(text).toContain('Whoever it was knew the door would be unlocked: one of his guests at the supper at the Thorndike flat, or the lodger it was left unlocked for.');
    expect(text).toContain('That left one person: somebody who knew that the door was left unlocked');
    const office = newBoardRun(d);
    expect(pageStars(d, office).map((s) => s.why)).toEqual([
      'start where it went missing',
      'Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten — ask Ashby where she was',
      'Ashby, Lindemann and Winslow knew the door would be unlocked, and nobody had said where any of them was at ten — ask Lindemann where she was',
    ]);
  });
});

describe('B6: a windowed murder’s means had to be had before the earliest hour, and the page says so', () => {
  it('Medium 21: the find says before nine, and Vitale, at Kowalski’s at nine, came too late for it', () => {
    const { d, run } = night(MEDIUM21);
    const text = all(run);
    expect(text).toContain('Whoever stabbed Mulcahy had been at Kowalski’s for the knife before nine, the earliest it could have happened.');
    expect(text).toContain('Vitale didn’t come till nine, too late for it.');
    expect(text).not.toMatch(/Vitale hadn’t, though/);
    expect(meansLate(d.kase, run, 'vitale')).toBe(9);
    expect(boardGrid(d.kase, run).rows.find((r) => r.id === 'vitale')?.meansWhy).toBe('Vitale didn’t come to Kowalski’s till nine, too late for it.');
  });

  it('Hard-boiled 19: the chloral before eight', () => {
    expect(all(night(HB19).run)).toContain('Whoever gave Vitale the chloral had been at the Delmonico rooms for it before eight, the earliest it could have happened.');
  });
});

describe('B7: the confront box is true, and shorter', () => {
  it('from Poached up it says confronting may name who clears them; below, that they may tell you more', () => {
    const { d, run } = night(save(17, 2, 'murder', dos('go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'ask callahan evening')));
    const pk = pickerFor(d, run, 'callahan');
    expect(pickerNote(d, pk as NonNullable<typeof pk>)).toMatch(/Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her\.$/);
    const r = night(save(23, 0, undefined, dos('go scene', 'search scene', 'go bar', 'ask barkeep list', 'ask winslow evening', 'go neighbours', 'ask xwatcher list')));
    const pr = pickerFor(r.d, r.run, 'winslow');
    expect(pickerNote(r.d, pr as NonNullable<typeof pr>)).toMatch(/Confronting him takes an action and isn’t needed to prove he lied, but he may tell you more\.$/);
  });
});

describe('B9: whether anyone else lied is asked, never told, on every night from Poached up', () => {
  it('asked by tier: every night from Poached up, never below', () => {
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
      for (let seed = 1; seed <= 4; seed++) {
        for (const type of typesFor(tier)) {
          const d = dealBoard(seed, tier, type);
          expect(boardFields(d).some((f) => f.key === 'other'), `${tier} ${type} ${seed}`).toBe(tier >= 2);
        }
      }
    }
  });

  it('a night where only one story broke (a deal with the innocent liar’s lie taken out): "Nobody else" is right', () => {
    // No dealt night has one yet (every Poached+ night deals an innocent liar), so the deal is made one
    // here: Poached 17 with Dandridge's lie struck from `lies`, the way a one-liar deal would have it.
    const d0 = dealBoard(17, 2, 'murder');
    const d: BoardDeal = { ...d0, kase: { ...d0.kase, lies: d0.kase.lies.filter((l) => l.person === d0.kase.crime.culprit) } };
    const f = boardFields(d).find((x) => x.key === 'other');
    expect(f?.label).toBe('Did anyone else lie? If so, who, and what clears them?');
    expect(f?.options.at(-1)).toEqual({ value: 'nobody', label: 'Nobody else' });
    const run = playBoardOracle(d0).run;
    const truth = truthReport(d, run);
    expect(truth.other).toBe('nobody');
    expect(truth.cleared).toBeNull();
    const right = scoreBoard(d, structuredClone(run), truth);
    expect(right.fields.find((x) => x.key === 'other')).toMatchObject({ label: 'Did anyone else lie?', given: 'Nobody else', correct: true });
    expect(right.fields.some((x) => x.key === 'cleared')).toBe(false);
    expect(right.scoreLine).toMatch(/^5 out of 5: who, whether anyone else lied, when, how and why, with the proof for who\.$/);
    expect(right.outcome).toBe('solved');
    const wrong = scoreBoard(d, structuredClone(run), { ...truth, other: 'dandridge', cleared: null });
    expect(wrong.fields.find((x) => x.key === 'other')?.correct).toBe(false);
    expect(wrong.plain).toContain('Nobody else lied: Dandridge had told the truth.');
    const curtain = curtainOfBoard(d, run, truth);
    expect(curtain).toContain('DID ANYONE ELSE LIE?\nNobody else.\n  You picked: nobody else.  ✓');
    expect(curtain).not.toContain('WHO ELSE LIED');
  });
});

describe('B8: the small slips', () => {
  it('the verdict closes at the clock’s time', () => {
    expect([clockWords(480), clockWords(465), clockWords(335), clockWords(15)]).toEqual(['eight', 'a quarter to eight', 'twenty-five to six', 'a quarter past midnight']);
    const { d, run } = night(POACHED17);
    const closing = scoreBoard(d, structuredClone(run), truthReport(d, run)).closing.join(' ');
    expect(closing).toContain('I closed the case at eight and went home the long way.');
  });

  it('Raw 23: Mimi is "her", in the crack and on the form', () => {
    const { d, run } = night(RAW23);
    expect(all(run)).toContain('“All right. I took her. She’s with Pardo, a man who buys things and asks nothing.');
    expect(all(run)).not.toMatch(/I took it\. It’s with/);
    expect(whereByLabel(d)).toBe('What proves where she is');
    expect(boardFields(d, run).find((f) => f.key === 'where')?.label).toBe('Where she is now');
    expect(whereByLabel(dealBoard(11, 0, 'lost-item'))).toBe('What proves where it is');
  });

  it('Raw 23: the neighbors’ word is only what the client couldn’t know himself', () => {
    const { d, run } = night(RAW23);
    expect(all(run)).toContain('He lost his job on Friday. I had that from the neighbors, and they hear most things. And he asked me what Mimi was worth.”');
    expect(officeLines(d)).toContain('Thorndike points at Winslow: he asked Thorndike what Mimi was worth, and the neighbors say he lost his job on Friday.');
    expect(notebookText(d, run)).not.toMatch(/neighbors say [^.]*asked Thorndike/);
  });

  it('a plural name takes "were": never "Mrs. Nagy’s rooms on East Fourth Street was"', () => {
    expect(['Mrs. Nagy’s rooms on East Fourth Street', 'the Delmonico rooms over the fish market', 'the flats over Lipsky’s', 'the wings at the Lyric', 'Abramowitz’s two rooms over the bakery on Hester Street'].map(namePlural)).toEqual([true, true, true, true, true]);
    expect(['Moe’s, a back-room bar behind a cigar store', 'Rafferty’s rooming house on Mott Street', 'the Grand Street chop house', 'Mrs. Nagy’s', 'the back of Sokol’s bakery on Rivington Street, where the numbers are taken'].map(namePlural)).toEqual([false, false, false, false, false]);
    const text = all(night(POACHED17).run);
    expect(text).not.toMatch(/Mrs\. Nagy’s rooms on East Fourth Street was\b/);
  });

  it('two people "had both been", never "had all been"', () => {
    const text = all(night(POACHED17).run);
    expect(text).toContain('So Dandridge and Callahan had both been at Mrs. Nagy’s, where the carving knife was kept, and had both left by nine.');
    expect(all(night(MEDIUM21).run)).toContain('Salerno and Sweeney had both been at Kowalski’s');
  });
});
