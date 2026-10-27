/**
 * docs/71: clarity-5b, the slips the read of clarity-5 found, on the five nights read (Poached 17 and Hard-boiled
 * 19 along the testers' routes, Poached 6 and Medium 21 along the oracle's, Raw 23 with a hint on every page),
 * and the grid's key. The rules' lints are `hinge.test.ts`'s; these hold the nights to what this build says.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, boardGridText, placeCodes, placesKey, shownPlaces } from '../src/game/board/grid.js';
import { takeHint } from '../src/game/board/hints.js';
import { hingeIssues } from '../src/game/board/hinge-lint.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { WALK_TAILS } from '../src/game/board/pages.js';
import { curtainOfBoard } from '../src/game/board/report.js';
import { pageBodyText } from '../src/game/board/text.js';

const route = (d: BoardDeal, cmds: string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) run = cmd === 'hint' ? (takeHint(d, run) as { run: BoardRun }).run : stepBoard(d, run, cmd).run;
  return run;
};
const text = (run: BoardRun): string => run.log.map((p) => pageBodyText(p).replace(/\s+/g, ' ')).join('\n');
const turnOf = (run: BoardRun): string => pageBodyText(run.log.find((p) => p.board?.turn) ?? run.log[0]!).replace(/\s+/g, ' ');
const NEW = ['walk-tail', 'turn-drop', 'keeper', 'bare-hour', 'twice', 'hint'];
const newIssues = (d: BoardDeal, run: BoardRun) => hingeIssues(d, run).filter((x) => NEW.includes(x.rule));
/** Each walk tail, how many times the night says it. */
const tails = (all: string) => WALK_TAILS.map((re) => (all.match(new RegExp(re.source, 'g')) ?? []).length);

const P17 = ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'ask callahan evening', 'go u', 'ask dandridge evening', 'put dandridge 9 list:barkeep@9', 'ask bledsoe evening', 'go rooming', 'put callahan 9 list:xwatcher@9'];
const HB19 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask mosley evening', 'go h', 'ask grasso evening', 'go u', 'ask donnelly evening', 'ask dandridge evening'];

describe('docs/71: Poached 17, the testers’ route', () => {
  const d = dealBoard(17, 2, 'murder');
  const run = route(d, P17);
  const all = text(run);
  it('no new slip on the night', () => expect(newIssues(d, run)).toEqual([]));
  it('1: a walk’s tail once a night', () => expect(Math.max(...tails(all))).toBeLessThanOrEqual(1));
  it('2: the turn joins the two Bidwell saw at Moe’s, and keeps Salerno, who could have had the knife (docs/72: from Poached up the turn places nobody)', () => {
    expect(turnOf(run)).not.toMatch(/Renfro (?:and Salerno )?(?:was|were) at Moe’s at nine/);
    expect(turnOf(run)).toContain('Mrs. Nagy said otherwise.');
  });
  it('4: Mrs. Nagy’s line says her place as hers', () => {
    expect(all).toContain('Mrs. Nagy says she had nobody in at nine, not you or anybody else.');
    expect(all).not.toContain('at Mrs. Nagy’s at nine, not you');
  });
  it('5: no bare hour and a comma: Dandridge’s and Bledsoe’s', () => {
    expect(all).toContain('At eight I went to Moe’s to see who was in');
    expect(all).toContain('Come ten, I went home on my own again');
    expect(all).not.toMatch(/(?:“|\. )(?:Eight|Ten), I went/);
  });
  it('6: the papers’ dead man not in two sentences running', () => {
    expect(all).toContain('The dead man had been squeezing Renfro for years. The landlord knew where Dandridge');
  });
  it('7: the grid’s key glosses only the labels its cells show', () => {
    const at = route(d, P17.slice(0, 7));
    const g = boardGrid(d.kase, at);
    expect(shownPlaces(g).has(d.kase.places.find((x) => /Sokol/.test(x.short))?.id ?? '#')).toBe(false);
    expect(boardGridText(d.kase, at)).not.toContain('Sokol’s is Sokol’s back room');
    // (The night's own key, the old way: every place the night has named.)
    expect(placesKey(d.kase, at)).toBe('In the grid, Sokol’s is Sokol’s back room.');
    // Once Dandridge has said Sokol's, the key says it.
    expect(boardGridText(d.kase, run)).toContain('In the grid, Sokol’s is Sokol’s back room.');
  });
  it('8: the fastest solve asks for Dandridge by the hour that matters', () => {
    const c = curtainOfBoard(d, run).replace(/\s+/g, ' ');
    expect(c).toContain('Nobody had said where Dandridge was at nine: ask Dandridge where he was.');
    expect(c).not.toContain('Bidwell saw Dandridge at Moe’s at eight: ask Dandridge');
  });
});

describe('docs/71: Poached 6, a one-liar night, the oracle’s route', () => {
  const d = dealBoard(6, 2);
  const run = playBoardOracle(d).run;
  const all = text(run);
  it('no new slip on the night', () => expect(newIssues(d, run)).toEqual([]));
  it('1: no tail on a walk that says "good", and each tail once', () => {
    expect(all).not.toContain('It was a good walk, and I took it at a good clip.');
    expect(Math.max(...tails(all))).toBeLessThanOrEqual(1);
  });
  it('2: the turn keeps Crowninshield, who could have had the knife, beside Abramowitz (docs/72: from Poached up the turn places nobody)', () => {
    expect(turnOf(run)).not.toMatch(/(?:Abramowitz|Crowninshield)(?: and \w+)? (?:was|were) at the Bijou at ten/);
  });
  it('5: Rosenbaum’s and Brennan’s hours open their clauses', () => {
    expect(all).toContain('“At seven I went round to Rafferty’s');
    expect(all).toContain('Come ten, I went to Sokol’s back room to meet Rosenbaum.');
    expect(all).toContain('Ten sharp, I went round to Sokol’s');
  });
  it('6: "That much checked out." not on two pages running', () => {
    expect(all).toContain('Sokol’s back room at ten. That much of it stood up.');
  });
});

describe('docs/71: Medium 21, the oracle’s route', () => {
  const d = dealBoard(21, 4);
  const run = playBoardOracle(d).run;
  const all = text(run);
  it('no new slip on the night', () => expect(newIssues(d, run)).toEqual([]));
  it('2: the turn keeps Mosley (docs/72: from Poached up the turn places nobody)', () => expect(turnOf(run)).not.toMatch(/(?:Vitale|Mosley)(?: and \w+)? (?:was|were) at the Blue Lantern at ten/));
  it('3: the way into Salerno’s flat names the place where "her place" would be either woman’s', () => {
    expect(all).toContain('Mrs. Kowalski had seen her at Kowalski’s at seven.');
    expect(all).not.toContain('the landlady’s place');
  });
  it('4: and Mrs. Kowalski’s line in the put', () => expect(all).toContain('Mrs. Kowalski says she had nobody in at ten, not you or anybody else.'));
  it('6: Mosley there the second time is "there too"', () => expect(all).toContain('At ten I had a table at the Blue Lantern, and Mosley was there too.'));
});

describe('docs/71: Hard-boiled 19, the testers’ route', () => {
  const d = dealBoard(19, 5, 'murder');
  const run = route(d, HB19);
  const all = text(run);
  it('no new slip on the night', () => expect(newIssues(d, run)).toEqual([]));
  it('5: "At nine", not "Then nine,"', () => {
    expect(all).toContain('At nine I went up to the card room to do the books');
    expect(all).not.toContain('Then nine, I went');
  });
  it('6: the papers’ dead man not in two sentences running', () => {
    expect(all).toContain('a brother the alderman’s clerk had testified against. The dead man had kept a file on Donnelly');
  });
});

describe('docs/71: Raw 23, a hint on every page', () => {
  const d = dealBoard(23, 0);
  const steps = playBoardOracle(d).commands;
  const run = route(d, steps.flatMap((x) => ['hint', x]));
  const all = text(run);
  it('no new slip on the night, and a walk’s tail once', () => {
    expect(newIssues(d, run)).toEqual([]);
    expect(Math.max(...tails(all))).toBeLessThanOrEqual(1);
  });
});

describe('docs/71, item 7: the book’s grid key', () => {
  it('its sample label is tonight’s (the scene’s), never "Odessa", and its places are the cells’ own', () => {
    const src = readFileSync(new URL('../src/ui/board-book.ts', import.meta.url), 'utf8');
    const key = src.slice(src.indexOf("const key = el('p', { class: 'bgrid-key' })"), src.indexOf('Tap a cell for what was said'));
    expect(key).not.toMatch(/text: '[^']*Odessa/);
    expect(key).toContain('g.codes[c.crime.scene]');
    expect(src).toContain('placesKey(c, run as BoardRun, g.codes, shownPlaces(g, false))');
    expect(placeCodes(dealBoard(17, 2, 'murder').kase)).toMatchObject({ scene: 'Quill’s' });
  });
});
