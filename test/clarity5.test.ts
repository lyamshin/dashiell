/**
 * docs/70: clarity-5, round 7's prose and chrome, on the testers' own nights (Raw 23, Poached 17, Medium
 * 21, Hard-boiled 19) along their own routes, and each rule beside it where a night can show it. The
 * rules' lints are `hinge.test.ts`'s; these hold the nights to what this build says.
 */
import { describe, expect, it } from 'vitest';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { FACE_MARK, boardGridText, faceMarkPage } from '../src/game/board/grid.js';
import { hintsNote, takeHint } from '../src/game/board/hints.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader } from '../src/game/board/oracle.js';
import { pageStars } from '../src/game/board/choices.js';
import { hintWords } from '../src/game/board/stars.js';
import { hingeIssues } from '../src/game/board/hinge-lint.js';
import { pageBodyText } from '../src/game/board/text.js';

const route = (d: BoardDeal, cmds: string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) run = cmd === 'hint' ? (takeHint(d, run) as { run: BoardRun }).run : stepBoard(d, run, cmd).run;
  return run;
};
const playReaderRun = (d: BoardDeal, seed: number): BoardRun => playReader(d, seed).run;
const text = (run: BoardRun): string => run.log.map((p) => pageBodyText(p).replace(/\s+/g, ' ')).join('\n');

const P17 = ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'ask callahan evening', 'go u', 'ask dandridge evening', 'put dandridge 9 list:barkeep@9', 'ask bledsoe evening', 'go rooming', 'put callahan 9 list:xwatcher@9'];
const M21 = ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'go bar', 'ask vitale evening', 'go h', 'ask salerno evening', 'go u', 'ask sweeney evening', 'put sweeney 10 list:xwatcher@10', 'ask winslow evening'];
const HB19 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask mosley evening', 'go h', 'ask grasso evening', 'go u', 'ask donnelly evening', 'ask dandridge evening'];

describe('docs/70: Poached 17, the tester’s route', () => {
  const d = dealBoard(17, 2, 'murder');
  const run = route(d, P17);
  const all = text(run);
  it('P2: the walk says how far and the arrival where (never the place twice, never "the same door as before")', () => {
    expect(all).not.toMatch(/Moe’s was a short walk\. At Moe’s/);
    expect(all).not.toMatch(/the same door as before/);
    expect(all).toMatch(/At Moe’s, a back-room bar behind a cigar store/);
  });
  it('P1: the landlady and the bartender say it as people do', () => {
    expect(all).not.toMatch(/Nine: nobody in\./);
    expect(all).not.toMatch(/drawer: there at seven/);
    expect(all).toMatch(/The carving knife was in my kitchen drawer at seven/);
    expect((all.match(/the start of the evening/g) ?? []).length).toBeLessThanOrEqual(1);
  });
  it('P1 and docs/68 §6: Dandridge’s company one way, and the hours alone after it as a person says them', () => {
    expect(all).toMatch(/Renfro and Quill kept me company at eight\./);
    expect(all).not.toMatch(/Quill was with me at first and left after eight/);
    expect(all).not.toMatch(/At nine and ten I had nobody with me/);
  });
  it('P3: Bledsoe is placed with who she is', () => {
    expect(all).toMatch(/Bledsoe, the woman Dandridge had named, was in the corner/);
    expect(all).not.toMatch(/By then Bledsoe was in the corner/);
  });
  it('P4: Renfro’s no is said by what’s known at Moe’s', () => {
    expect(all).not.toMatch(/while the carving knife was in the kitchen drawer/);
    expect(all).toMatch(/Renfro hadn’t been at Mrs\. Nagy’s before nine, when the carving knife was there to take\./);
  });
  it('P8: "earlier in the evening" once, the knife’s origin once on the pages, the papers’ dead man twice at most', () => {
    expect((all.match(/earlier in the evening/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(all).not.toMatch(/The carving knife had come from Mrs\. Nagy’s\./);
    const papers = run.log.find((p) => p.board?.q === 'search:papers');
    expect((pageBodyText(papers as never).match(/the dead man/g) ?? []).length).toBeLessThanOrEqual(2);
  });
  it('P6: no knees after the desk', () => {
    const papers = run.log.find((p) => p.board?.q === 'search:papers');
    expect(pageBodyText(papers as never)).not.toMatch(/\bknees?\b/);
  });
  it('docs/67: Sokol’s back room says what drew me, and the ask doesn’t say it again to his face', () => {
    const i = run.log.findIndex((p) => p.board?.job === 'arrive' && /Sokol/.test(p.head));
    expect(i).toBeGreaterThan(0);
    expect(run.log[i]?.board?.drew).toBeTruthy();
    expect(pageBodyText(run.log[i + 1] as never)).not.toMatch(/saw you/);
  });
  it('P7 and docs/68 §6: the report page’s hint names the hour that matters, not the pointer’s own', () => {
    const r = route(d, ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'file']);
    const said = takeHint(d, r) as { said: { text: string } };
    expect(said.said.text).toMatch(/nobody had said where Callahan was at nine/);
    expect(said.said.text).not.toMatch(/at seven/);
  });
  it('the hinge lints hold the night at 0', () => {
    expect(hingeIssues(d, run)).toEqual([]);
  });
});

describe('docs/70: Medium 21, the tester’s route', () => {
  const d = dealBoard(21, 4);
  const run = route(d, M21);
  const all = text(run);
  it('P5: the agreement and the street, sentences of their own', () => {
    expect(all).not.toMatch(/the Blue Lantern at ten; the street was what mattered/);
    expect(all).toMatch(/Allen Street was where Mulcahy lived\./);
  });
  it('P1: no committee meeting alone, no letters written twice, no hours fragment', () => {
    expect(all).not.toMatch(/committee meeting, alone/);
    expect((all.match(/to write letters/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(all).not.toMatch(/Seven through eight\. I/);
  });
  it('P2 and P6: the tailor’s once, no song nobody was playing beside the piano, no bar at a table', () => {
    expect(all).not.toMatch(/tailor’s passage to Mulcahy’s rooms behind the tailor’s/);
    expect(all).not.toMatch(/song nobody was playing/);
    expect(all).not.toMatch(/tapped the bar/);
  });
  it('P3: Winslow is placed with who he is', () => {
    expect(all).toMatch(/Winslow, the man Sweeney had named, was/);
  });
  it('the hinge lints hold the night at 0', () => {
    expect(hingeIssues(d, run)).toEqual([]);
  });
});

describe('docs/70: Hard-boiled 19, the tester’s route', () => {
  const d = dealBoard(19, 5, 'murder');
  const run = route(d, HB19);
  it('P9: the office says the dose, and the pointer is a name, not an errand', () => {
    const office = pageBodyText(run.log[0] as never).replace(/\s+/g, ' ');
    expect(office).not.toMatch(/Whichever it was, that’s when he was poisoned/);
    expect(office).toMatch(/that’s when he was given it/);
    expect(office).not.toMatch(/“Ask Mosley, the one who found him/);
  });
  it('U4: the mark line once a night, on the page of the first coat, and on the grid only while that page is open', () => {
    const i = faceMarkPage(d.kase, run);
    expect(i).toBeGreaterThan(0);
    expect(run.log[i]?.board?.q).toBe('list:barkeep');
    for (let k = 0; k < run.log.length; k++) {
      const at = { ...run, log: run.log.slice(0, k + 1) };
      expect(hintsNote(d, at) === FACE_MARK, `page ${k + 1}`).toBe(k === i);
      expect(boardGridText(d.kase, at).includes(FACE_MARK), `grid on page ${k + 1}`).toBe(k === i);
    }
    expect(hintsNote(d, newBoardRun(d))).toBeNull();
  });
  it('the hinge lints hold the night at 0', () => {
    expect(hingeIssues(d, run)).toEqual([]);
  });
});

describe('docs/70: Raw 23, hints and the office', () => {
  const d = dealBoard(23, 0);
  it('P7: a shared reason once, then only the ask; on the question itself, only the reason', () => {
    const run = route(d, ['hint', 'go scene', 'hint', 'search scene', 'hint', 'go bar', 'hint']);
    const said: string[] = [];
    let r = newBoardRun(d);
    for (const cmd of ['hint', 'go scene', 'hint', 'search scene', 'hint', 'go bar', 'hint']) {
      if (cmd === 'hint') {
        const h = takeHint(d, r) as { run: BoardRun; said: { text: string } };
        said.push(h.said.text);
        r = h.run;
      } else r = stepBoard(d, r, cmd).run;
    }
    const shared = said.filter((s) => /knew the door would be unlocked, and nobody had said where any of them was at ten/.test(s));
    expect(shared.length).toBe(1);
    expect(said).toContain('Hint: ask Lindemann where she was.');
    for (const s of pageStars(d, run)) {
      if (!s.command.startsWith('ask ')) continue;
      expect(s.why, s.command).not.toMatch(/— ask/);
    }
    expect(hintWords(d.kase, run, 'account:lindemann', false, true)).toBe('nobody had said where she was at ten');
  });
  it('P9: the office says when the supper was, not how many it was set for', () => {
    const office = pageBodyText(playBoardOracle(d).run.log[0] as never).replace(/\s+/g, ' ');
    expect(office).not.toMatch(/was set at eight/);
  });
  it('the pet’s kind once a night: the office’s "my Persian" said it', () => {
    const all = text(playBoardOracle(d).run);
    expect(all).not.toMatch(/Mimi, the Persian cat,/);
  });
});

describe('docs/70: the rules on other nights', () => {
  it('seed 7: a man’s watch was his late father’s', () => {
    const d = dealBoard(1, 0, 'lost-item');
    expect(d.kase.people.find((x) => x.id === d.kase.client)?.female).toBeFalsy();
    const office = pageBodyText(playBoardOracle(d).run.log[0] as never).replace(/\s+/g, ' ');
    expect(office).toMatch(/my late father’s gold watch/);
    expect(office).not.toMatch(/my late husband’s/);
  });
  it('docs/68 §6: the turn names the lodger who knew, beside the guests at the table', () => {
    const d = dealBoard(2, 1, 'lost-item');
    const run = playBoardOracle(d).run;
    const turn = run.log.find((p) => p.board?.turn);
    const lodger = d.kase.people.find((x) => d.kase.givens.access.includes(x.id))?.short as string;
    expect(pageBodyText(turn as never).replace(/\s+/g, ' ')).toMatch(new RegExp(`and so did ${lodger}, the lodger it was left unlocked for`));
  });
  it('seed 1: "my client" once on the office page', () => {
    const d = dealBoard(14, 4, 'lost-pet');
    const office = pageBodyText(playBoardOracle(d).run.log[0] as never).replace(/“[^”]*”/g, ' ');
    expect((office.match(/\bmy client\b(?!’s)/gi) ?? []).length).toBeLessThanOrEqual(1);
    expect((office.match(/\bmy client\b/gi) ?? []).length).toBeLessThanOrEqual(2);
  });
  it('seed 1: and the client named twice at most, "he said" after his own quotation where he was the last man narrated', () => {
    const d = dealBoard(1, 0, 'lost-item');
    const office = pageBodyText(playBoardOracle(d).run.log[0] as never).replace(/\s+/g, ' ');
    expect(office).toContain('Lathrop, a night-school teacher,” he said.');
    expect((office.replace(/“[^”]*”/g, ' ').match(/\bmy client\b/gi) ?? []).length).toBeLessThanOrEqual(2);
  });
  it('docs/68 §6: a witness’s evening pointed at by the hour that matters (Raw 7: ten, not Bledsoe’s nine)', () => {
    const d = dealBoard(7, 0, 'murder');
    const run = route(d, ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'ask bledsoe evening']);
    expect(hintWords(d.kase, run, 'account:crowninshield')).toBe('nobody had said where Crowninshield was at ten — ask Crowninshield where she was');
  });
  it('the office’s gathering isn’t alone, and leaving it is', () => {
    const d = dealBoard(22, 1, 'lost-item');
    const page = text(playReaderRun(d, 22));
    expect(page).toContain('“Eight, I was at Winslow’s for the meeting. At nine I left the meeting when the gin ran out and went to the Blue Lantern alone,');
  });
});
