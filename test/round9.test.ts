/**
 * docs/73, round9-logic: the round-9 blind playtest's rule and screen bugs, and round 8's B1, B4, B6, B9
 * and B10. Each item by rule, in the layer that makes it: the tester's night where it showed, and the rule
 * over nights where it's a rule. The testers' routes are their saves' actions (scratchpad/playtest9-*.json,
 * playtest8-*.json), without `mark`, `report` and `file` unless the item needs them.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { pickerFor, pickerNote } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, boardGridText, meansAsked, meansReasons } from '../src/game/board/grid.js';
import { hingeIssues } from '../src/game/board/hinge-lint.js';
import { hintStep, starReason } from '../src/game/board/stars.js';
import { bearsOn, candidateLines, collisionsOf, judgeLine, linesHeld, storyBreakers } from '../src/game/board/knowledge.js';
import { budgetCalls, clientOf, dealBoard, parCalls, sumsSaid, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { breakOptions, clearOptions, curtainOfBoard, fastestKinds, heldBreakers, lineNumbers, notebookLines, scoreBoard, whereByOptions } from '../src/game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { notebookText, pageBodyText } from '../src/game/board/text.js';
import { breakToFace } from '../src/game/board/bones/phrase.js';
import { isPoison } from '../src/game/board/when.js';
import { setTexture } from '../src/game/board/plan/texture.js';
import { readFileSync } from 'node:fs';

const VOICINGS = JSON.parse(readFileSync(new URL('../content/board/voicings.json', import.meta.url), 'utf8')) as { id: string; requires?: string[]; template: string }[];
/** The reason the hint gives for its step, as its star says it. */
const hintWhy = (d: BoardDeal, run: BoardRun): string => {
  const q = hintStep(d, run);
  return q ? starReason(d.kase, run, q) : '';
};

const route = (d: BoardDeal, cmds: readonly string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) {
    const r = stepBoard(d, run, cmd);
    if (r.error) throw new Error(`${cmd}: ${r.error}`);
    run = r.run;
  }
  return run;
};
const flat = (s: string) => s.replace(/\s+/g, ' ');
const pageOf = (run: BoardRun, q: string) => flat(pageBodyText([...run.log].reverse().find((p) => p.board?.q === q) ?? run.log[0]!));

// The round-9 testers' routes, and round 8's where an item is theirs.
const HB39 = ['go bar', 'ask barkeep list', 'ask obermann evening', 'go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go h', 'ask tillman evening', 'put tillman 10 list:barkeep@10', 'go u', 'ask thorndike evening', 'ask feldman evening'];
const POACHED37 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'ask vogel evening', 'put vogel 10 list:xwatcher@10', 'go bar', 'ask barkeep list', 'go u', 'ask brennan evening', 'put brennan 10 list:barkeep@10', 'ask schilling evening'];
const MEDIUM37 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask prentiss evening', 'ask broadnax evening', 'go u', 'ask sirkin evening', 'go h', 'ask ashby evening', 'put ashby 10 remark:account:broadnax#0', 'go u', 'put sirkin 10 list:xwatcher@10'];
const RAW33 = ['go neighbours', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask bidwell evening', 'put bidwell 10 list:barkeep@10', 'go scene', 'search scene'];
const CODDLED35 = ['go bar', 'ask barkeep list', 'ask margolis evening', 'put margolis 9 list:barkeep@9', 'go rooming', 'ask xwatcher list', 'go u', 'ask bidwell evening', 'go scene', 'search papers'];

/** The play CLI on a save in memory: the night's events, then one command. */
function cli(seed: number, tier: number, type: CaseType, events: readonly object[], argv: string[]): string {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  files.set('s.json', JSON.stringify({ game: 'dashiell-play', version: 1, engine: 'board', seed, tier, type, detective: 'Dashiell', events, person: null, picker: null, claim: null }));
  return runPlay([...argv, '--save', 's.json'], io).out;
}
const dos = (cmds: readonly string[]) => cmds.map((x) => ({ do: x }));

/** Nights a tier, both worlds, three routes: the final runs. */
function routesOf(tiers: readonly number[], n: number): { d: BoardDeal; run: BoardRun; tag: string }[] {
  const out: { d: BoardDeal; run: BoardRun; tag: string }[] = [];
  for (const world of [undefined, 'neighbourhood'])
    for (const tier of tiers)
      for (const type of typesFor(tier as TierIndex))
        for (let s = 1; s <= n; s++) {
          const d = dealBoard(s, tier as TierIndex, type, world ? { world } : {});
          const tag = `${world ?? 'dealt'} ${tier} ${type} ${s}`;
          out.push({ d, run: playBoardOracle(d).run, tag: `${tag} oracle` }, { d, run: playWanderer(d, s).run, tag: `${tag} wanderer` }, { d, run: playReader(d, s).run, tag: `${tag} reader` });
        }
  return out;
}

describe('item 1: from Poached up the grid marks the office’s hours and never narrows them', () => {
  it('HB 39: “ten ?” on the first look at the grid, never “ten !”, and the key says whose hours they are', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = route(d, HB39.slice(0, 2));
    const g = boardGrid(d.kase, run);
    expect(g.crimeHour).toBeNull();
    expect(g.window).toEqual([9, 10]);
    const text = boardGridText(d.kase, run);
    expect(text).toMatch(/ nine \? +ten \? /);
    expect(text).not.toMatch(/ten !/);
    expect(text).toContain('? the hours Lefkowitz gave');
    expect(text).not.toContain('! the hour it happened');
    // (And after the whole route, the sighting held: still the office's hours.)
    expect(boardGrid(d.kase, route(d, HB39)).crimeHour).toBeNull();
  });
  it('the rule: the tier test is docs/72’s `sumsSaid`; from Poached up every grid, at every page, keeps the office’s hours; Raw and Coddled still narrow', () => {
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[])
      for (const type of typesFor(tier))
        for (let s = 1; s <= 4; s++) {
          const d = dealBoard(s, tier, type);
          const office = d.kase.givens.window ?? d.kase.crime.window;
          const o = playBoardOracle(d);
          let run = newBoardRun(d);
          for (const cmd of o.commands) {
            run = stepBoard(d, run, cmd).run;
            const g = boardGrid(d.kase, run);
            if (!sumsSaid(d.kase)) {
              expect(g.crimeHour).toBeNull();
              expect(g.window).toEqual([...office]);
              expect(g.givenBy).toBe(clientOf(d.kase).short);
            } else expect(g.givenBy).toBeNull();
          }
          // (Raw and Coddled mark the hour it happened by the end of the designed path, as before.)
          if (sumsSaid(d.kase)) expect(boardGrid(d.kase, run).crimeHour, `${tier} ${type} ${s}`).toBe(d.kase.crime.hour);
        }
    // (The full dial reads as before docs/72, the grid's narrowing with it: Medium 37's sighting settles ten.)
    setTexture('full');
    try {
      const d = dealBoard(37, 4, 'murder');
      expect(boardGrid(d.kase, route(d, MEDIUM37.slice(0, 7))).crimeHour).toBe(10);
    } finally {
      setTexture('lean');
    }
  });
});

describe('item 2: the weapon column says why in the grid itself, and a poisoning’s is the poison', () => {
  it('Medium 37: Broadnax’s “no” from the first look says why, under the grid', () => {
    const d = dealBoard(37, 4, 'murder');
    const run = route(d, MEDIUM37.slice(0, 9));
    const g = boardGrid(d.kase, run);
    expect(g.rows.find((r) => r.id === 'broadnax')?.means).toBe('no');
    expect(meansReasons(g)).toContain('Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it.');
    expect(boardGridText(d.kase, run)).toContain('Why “no”: Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it.');
    expect(meansAsked(g.meansLabel)).toBe('Could they get the weapon?');
  });
  it('the rule: every “no” has its reason; a poisoning asks for the poison, never by name', () => {
    for (const tier of [0, 2, 4, 5] as TierIndex[])
      for (let s = 1; s <= 4; s++) {
        const d = dealBoard(s, tier, 'murder');
        const g = boardGrid(d.kase, playBoardOracle(d).run);
        for (const r of g.rows.filter((x) => x.means === 'no')) expect(meansReasons(g)).toContain(r.meansWhy as string);
        expect(meansAsked(g.meansLabel)).toBe(isPoison(d.kase) ? 'Could they get the poison?' : 'Could they get the weapon?');
        expect(meansAsked(g.meansLabel)).not.toContain(d.kase.means.name.replace(/^(?:a|an|the) /, ''));
      }
    expect(meansAsked(boardGrid(dealBoard(39, 5, 'murder').kase, newBoardRun(dealBoard(39, 5, 'murder'))).meansLabel)).toBe('Could they get the poison?');
  });
});

describe('item 3: a line the report scores as breaking a story lands when it’s put; the confront offers only what bears on them', () => {
  it('HB 39: Feeney’s pea coat, put to Tillman, lands (she tells another story), and the report scores the same line', () => {
    const d = dealBoard(39, 5, 'murder');
    const before = route(d, HB39.slice(0, 10));
    const pk = pickerFor(d, { ...before, marks: { obermann: { '10': { at: 'bar' } } } } as BoardRun, 'tillman');
    const lines = pk?.claims.find((x) => x.hour === 10)?.lines.map((x) => x.command) ?? [];
    expect(lines).toContain('put tillman 10 list:barkeep@10');
    // (Mrs. Rafferty's list at ten, Thorndike's and Feldman's print shop: nothing of Tillman, her flat or Obermann.)
    expect(lines.some((x) => /list:xwatcher@10|claim:thorndike@10|claim:feldman@10/.test(x))).toBe(false);
    const run = route(d, HB39);
    expect(run.puts.at(-1)).toMatchObject({ person: 'tillman', hour: 10, line: 'list:barkeep@10', landed: true });
    expect(pageOf(run, 'confront:tillman@10')).not.toContain('could only say who was at the Kit Kat');
    expect(heldBreakers(d, run).map((l) => l.id)).toContain('list:barkeep@10');
    // (Obermann's own story, which says just what she said, is never what broke hers: it doesn't land.)
    const agree = linesHeld(d.kase, before).find((l) => l.id === 'claim:obermann@10')!;
    expect(judgeLine(d.kase, before, 'tillman', 10, agree).landed).toBe(false);
    expect(heldBreakers(d, before).map((l) => l.id)).not.toContain('claim:obermann@10');
  });
  it('the rule over nights: the report’s lines and the collisions’ land; the menu’s bear on them', () => {
    for (const { d, run, tag } of routesOf([0, 1, 2, 3, 4, 5], 3)) {
      const c = d.kase;
      for (const l of heldBreakers(d, run)) {
        if (l.kind === 'second' || (l.kind === 'list' && c.confrontations.find((k) => k.person === c.crime.culprit && k.hour === l.hour)?.secondLie?.place === l.place)) continue;
        expect(judgeLine(c, run, c.crime.culprit, l.hour!, l).landed, `${tag}: ${l.id}`).toBe(true);
      }
      for (const col of collisionsOf(c, run, undefined, { all: true })) {
        expect(col.breakers.length, tag).toBeGreaterThan(0);
        for (const b of storyBreakers(c, run, col.person, col.hour)) expect(judgeLine(c, run, col.person, col.hour, b).landed, `${tag}: ${b.id}`).toBe(true);
        for (const x of pickerFor(d, run, col.person)?.claims ?? []) {
          if (x.again) continue;
          for (const ln of x.lines) {
            const l = candidateLines(c, run, col.person, x.hour).find((y) => ln.command.endsWith(` ${y.id}`));
            expect(l && bearsOn(c, col.person, x.hour, l), `${tag}: ${ln.command}`).toBe(true);
          }
        }
      }
    }
  });
});

describe('item 4: the curtain knows every confront made, landed or not', () => {
  it('HB 39: confronted with what broke it, “When you confronted her, she told another story.”', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = route(d, HB39);
    const curtain = curtainOfBoard(d, run);
    expect(curtain).toContain('When you confronted her, she told another story.');
    expect(curtain).not.toMatch(/Tillman said she was home at ten;[^\n]*You never confronted her/);
  });
  it('confronted with something that didn’t land: never “You never confronted her”', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = route(d, [...HB39.slice(0, 10), 'put tillman 10 claim:obermann@10']);
    expect(run.puts.at(-1)?.landed).toBe(false);
    const lie = curtainOfBoard(d, run).split('\n').find((x) => x.startsWith('- Tillman said')) ?? '';
    expect(lie).toContain('You confronted her, but nothing you put to her broke what she said about ten, so she stood by it; with something that did, she would have told another story.');
    expect(lie).not.toContain('never confronted');
  });
});

describe('item 5: after a refusal, the hand-off never claims a witness', () => {
  it('Poached 37: Vogel refuses, and the page says only what’s true', () => {
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, POACHED37.slice(0, 7));
    const page = pageOf(run, 'confront:vogel@10');
    expect(page).not.toMatch(/somebody had seen him/i);
    expect(page).toMatch(/he wasn’t saying where/);
    expect(hingeIssues(d, run).filter((x) => x.rule === 'witness')).toEqual([]);
  });
  it('the rule: no refusal voicing says somebody saw them, and the lint reads the old line', () => {
    const refusals = VOICINGS.filter((v) => v.requires?.includes('refuse-thought'));
    expect(refusals.length).toBeGreaterThan(6);
    for (const v of refusals) expect(v.template, v.id).not.toMatch(/\bsomebody (?:had )?(?:saw|seen)\b|\bwould have seen\b/i);
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, POACHED37.slice(0, 7));
    const old = { ...run, log: run.log.map((p, i) => (i === run.log.length - 1 ? { ...p, blocks: [...p.blocks, { kind: 'prose' as const, voice: 'thought', text: 'But somebody had seen him at ten if he wasn’t home.' }] } : p)) } as BoardRun;
    expect(hingeIssues(d, old).filter((x) => x.rule === 'witness').length).toBe(1);
  });
});

describe('item 6 (round 8, B10): the put says only what the line said', () => {
  it('HB 34: “Pickering says he was at the Orpheum at ten, on his own.”, never “and you weren’t there”', () => {
    const d = dealBoard(34, 5, 'murder');
    const run = route(d, ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask pickering evening', 'go u', 'ask steinbach evening', 'ask ukeeper list', 'go h', 'ask hargrove evening', 'put hargrove 10 list:barkeep@10']);
    const l = linesHeld(d.kase, run).find((x) => x.id === 'claim:pickering@10')!;
    expect(breakToFace(d.kase, l, 'hargrove', run.asked)).toBe('Pickering says he was at the Orpheum at ten, on his own');
    expect(pageOf(run, 'confront:hargrove@10')).not.toMatch(/you weren’t there|not with you/);
    expect(hingeIssues(d, run).filter((x) => x.rule === 'restate')).toEqual([]);
  });
  it('HB 39: a keeper’s list at a place they never named doesn’t say “and not you”', () => {
    const d = dealBoard(39, 5, 'murder');
    const run = route(d, HB39.slice(0, 10));
    const l = linesHeld(d.kase, run).find((x) => x.id === 'list:xwatcher@10')!;
    expect(breakToFace(d.kase, l, 'tillman', run.asked)).not.toContain('not you');
  });
});

describe('item 7: the report’s words', () => {
  it('B2: the culprit’s own page says nothing of clearing under the proof; under “Did anyone else lie?” it says it plainly', () => {
    const page = cli(39, 5, 'murder', dos(HB39), ['report', 'Tillman']);
    expect(page).not.toMatch(/lied too|give “cleared”/);
    expect(flat(page)).toContain('Did anyone else lie? If your answer is Tillman, pick what clears her from this same list: somebody else’s word, not her own.');
    expect(page.indexOf('Did anyone else lie?')).toBeGreaterThan(page.indexOf('A hunch: give'));
  });
  it('the form’s keys stay in the command line: no “proof=hunch” or “Give cleared as” in a sentence', () => {
    for (const out of [cli(39, 5, 'murder', dos(HB39), ['report']), cli(39, 5, 'murder', dos(HB39), ['report', 'Obermann'])]) {
      const prose = out.split('\n').filter((x) => !/npm run play -- close/.test(x)).join(' ');
      expect(prose).not.toMatch(/\b(?:proof|cleared|other)=/);
      expect(prose).not.toMatch(/\bGive (?:proof|cleared) as\b|\bFor proof and cleared\b/);
    }
  });
  it('the verdict says a line as a line: “what cleared him: Bledsoe says…”, never “it was Bledsoe says”', () => {
    const d = dealBoard(37, 4, 'murder');
    const run = { ...route(d, MEDIUM37), reportOpen: true };
    const v = scoreBoard(d, run, { who: 'ashby', when: 10, why: 'ashby', how: 'a revolver', breaks: 'remark:account:broadnax#0', other: 'sirkin', cleared: 'admit:sirkin@10' } as never);
    const cleared = v.fields.find((f) => f.key === 'cleared')!;
    expect(cleared.why).toBe('what cleared him: Bledsoe says he was at the print shop at ten o’clock, with Sirkin.');
    expect(v.plain.join(' ')).toContain('his own word doesn’t clear him; somebody else’s has to');
    const out = cli(37, 4, 'murder', [...dos(MEDIUM37), { do: 'file' }, { file: { who: 'ashby', when: 10, why: 'ashby', how: 'a revolver', breaks: 'remark:account:broadnax#0', other: 'sirkin', cleared: 'admit:sirkin@10' } }], ['look']);
    expect(flat(out)).not.toMatch(/it was [A-Z][a-z]+ says/);
  });
  it('what clears the other liar is somebody else’s word: the rules, the help and the report’s prompt say so', () => {
    expect(BOARD_TEACH_LINES).toContain('When two people lied, you also need what clears the innocent one: somebody else’s word, not their own.');
    expect(BOARD_RULES.join(' ')).toContain('and if so, what clears them. What clears them is somebody else’s word, not their own.');
    expect(flat(cli(37, 4, 'murder', dos(MEDIUM37), ['report']))).toContain('Pick what clears them from it: somebody else’s word, not their own.');
    expect(flat(cli(37, 4, 'murder', [], ['help']))).toContain('what clears them: somebody else’s word, not their own');
  });
  it('confronting on the last action says so plainly, and that anybody they name needs another', () => {
    const d = dealBoard(37, 4, 'murder');
    const run = route(d, MEDIUM37.slice(0, 15));
    expect(budgetCalls(d) - run.used).toBe(1);
    const pk = pickerFor(d, run, 'sirkin')!;
    expect(pickerNote(d, pk)).toContain('This is your last action: if he names somebody, asking them would take another, and you won’t have one.');
    const early = pickerFor(d, route(d, MEDIUM37.slice(0, 13)), 'ashby')!;
    expect(pickerNote(d, early)).not.toContain('last action');
  });
});

describe('item 8: the rules say what’s true on every night, a pair night’s included', () => {
  it('“Nobody lies about what they saw” is gone: people lie about their own evening and who was in it', () => {
    expect(BOARD_TEACH_LINES).toContain('People lie about their own evening, and who was in it. Nobody lies about where they saw anybody else.');
    for (const l of [...BOARD_TEACH_LINES, ...BOARD_RULES]) expect(l).not.toMatch(/Nobody lies about what they saw/);
    expect(cli(39, 5, 'murder', [], ['help'])).not.toMatch(/Nobody lies about what they saw/);
  });
});

describe('item 9 (round 8, B1): one numbering, from the notebook’s list', () => {
  it('Raw 33: the confession is in the notebook as 12, and the parlor found after it is 13', () => {
    const d = dealBoard(33, 0, 'lost-item');
    const run = route(d, RAW33);
    const nums = lineNumbers(d, run);
    expect(nums.get('crack:bidwell@10')).toBe(12);
    expect(nums.get('find:scene')).toBe(13);
    const nb = flat(notebookText(d, run));
    expect(nb).toMatch(/12\. Bidwell, when I confronted him: “All right/);
    expect(nb).toMatch(/13\. The parlor at the Mosley flat/);
    expect(flat(cli(33, 0, 'lost-item', dos(RAW33), ['report']))).toMatch(/12\. Bidwell, when I confronted him/);
  });
  it('the rule: every line the form can offer is in the notebook, and a number never moves as the night goes on', () => {
    for (const tier of [0, 1, 2, 4, 5] as TierIndex[])
      for (const type of typesFor(tier))
        for (let s = 1; s <= 3; s++) {
          const d = dealBoard(s, tier, type);
          const o = playBoardOracle(d);
          let run = newBoardRun(d);
          let was = new Map<string, number>();
          for (const cmd of o.commands) {
            run = stepBoard(d, run, cmd).run;
            const nums = lineNumbers(d, run);
            for (const [id, n] of was) expect(nums.get(id), `${tier} ${type} ${s}: ${id}`).toBe(n);
            was = nums;
          }
          const listed = new Set(notebookLines(d, run).map((x) => x.value));
          const offered = [...d.kase.people.filter((p) => p.role === 'suspect').flatMap((p) => [...breakOptions(d, run, p.id), ...clearOptions(d, run, p.id)]), ...(d.kase.type === 'murder' ? [] : whereByOptions(d, run))];
          for (const x of offered) expect(listed.has(x.value), `${tier} ${type} ${s}: ${x.value}`).toBe(true);
        }
  });
});

describe('item 10 (round 8, B6): the fastest solve counts by kind', () => {
  it('Poached 34: a search is a search, not a question', () => {
    const d = dealBoard(34, 2, 'murder');
    expect(fastestKinds(d)).toMatch(/^\d+ questions, a search, a look at the papers for the motive and \d+ walks$/);
    expect(curtainOfBoard(d)).toContain(`THE FASTEST SOLVE: ${parCalls(d)} actions (${fastestKinds(d)})`);
  });
  it('the rule: the kinds add up to the actions', () => {
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[])
      for (const type of typesFor(tier))
        for (let s = 1; s <= 4; s++) {
          const d = dealBoard(s, tier, type);
          const said = fastestKinds(d);
          const n = (re: RegExp) => [...said.matchAll(re)].reduce((k, m) => k + (m[1] === 'a' ? 1 : Number(m[1])), 0);
          const total = n(/\b(a|\d+) (?:questions?|search(?:es)?|confrontations?|walks?)\b/g) + (/the papers for the motive/.test(said) ? 1 : 0);
          expect(total, `${tier} ${type} ${s}: ${said}`).toBe(parCalls(d));
        }
  });
});

describe('item 11 (round 8, B9): a second story is marked against the list where it claims to be', () => {
  it('Medium 37: Ashby’s “the Orpheum”, after the put, ✗ against Alfano’s list, in the grid and under the clash', () => {
    const d = dealBoard(37, 4, 'murder');
    const run = route(d, MEDIUM37);
    const cell = boardGrid(d.kase, run).rows.find((r) => r.id === 'ashby')?.cells[10];
    expect(cell?.secondClash).toBe(true);
    const text = boardGridText(d.kase, run);
    expect(text).toContain('"Ashby’s"✗→"Orpheum"✗');
    expect(text).toContain('→"Y"✗ where that clashes too');
    expect(text.slice(text.indexOf('Ashby, ten:'))).toContain('Alfano: at ten o’clock, only Prentiss and Broadnax were at the Orpheum.');
  });
  it('Coddled 35: Margolis’s “Kowalski’s” against Mrs. Kowalski’s list', () => {
    const d = dealBoard(35, 1, 'murder');
    expect(boardGridText(d.kase, route(d, CODDLED35))).toContain('"Moe’s"✗→"Kowalski’s"✗');
  });
});

describe('item 12 (round 8, B4): the hint says what’s missing once anything is done', () => {
  it('Raw 33: six actions in, “you haven’t seen where it went missing yet”; at the office, “start where it went missing”', () => {
    const d = dealBoard(33, 0, 'lost-item');
    const run = route(d, RAW33.slice(0, 6));
    expect(hintWhy(d, run)).toBe('you haven’t seen where it went missing yet');
    expect(hintWhy(d, newBoardRun(d))).toBe('start where it went missing');
  });
  it('the rule: “start” only before anything is done; at the scene, not searched, “you haven’t searched where he died yet”', () => {
    let seen = 0;
    for (const tier of [0, 1, 2] as TierIndex[])
      for (let s = 1; s <= 6; s++) {
        const d = dealBoard(s, tier, 'murder');
        const why = hintWhy(d, route(d, ['go scene']));
        expect(why).not.toMatch(/^start where/);
        if (/where (?:he|she) died/.test(why)) {
          expect(why).toMatch(/^you haven’t searched where (?:he|she) died yet$/);
          seen++;
        }
      }
    expect(seen).toBeGreaterThan(0);
  });
});
