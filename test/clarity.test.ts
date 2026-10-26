/**
 * docs/59: the clarity build, held to. Said once; lists and company told by what changed; the thought
 * gives the consequence; continuity; the office in natural order; the tics; the assembly lints; the
 * designer's nine notes where a rule says them.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { boardFields } from '../src/game/board/report.js';
import { clarityIssues, CAP_PRONOUN, PLACE_PRONOUN, slotClauses, WOULD_PAST } from '../src/game/board/clarity-lint.js';
import { VOICED, voicedTally } from '../src/game/board/bones/reread.js';
import { similesIn, ticsIn } from '../src/game/board/tics.js';
import { contentWords, factAtoms, saysAgain, sharedContent } from '../src/game/board/plan/once.js';
import { papersLine } from '../src/game/board/motives.js';
import { gates } from '../scripts/claudisms.js';
import type { Page } from '../src/game/board/types.js';

const prose = (p: Page) => p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n').replace(/\s+/g, ' ');

afterEach(() => {
  VOICED.check = false;
});

describe('docs/59 item 1: said once', () => {
  it('a fact is one atom whoever says it, and a conclusion drawn from it is another', () => {
    const list = factAtoms({ k: 'LIST', watcher: 'w', place: 'bar', hour: 10, people: ['a', 'b'] });
    expect(list).toEqual(['at|bar|10|a', 'at|bar|10|b']);
    expect(factAtoms({ k: 'CLAIM', person: 'a', place: 'bar', hour: 10, company: [] })).toContain('at|bar|10|a');
    // What the list means at the hour, said by the thought, is not the list's own fact.
    expect(factAtoms({ k: 'PLACED', person: 'a', place: 'bar', hour: 10, by: { k: 'list', who: 'w' } })).toEqual(['placed|a|10']);
    expect(factAtoms({ k: 'AWAY', person: 'a', place: 'bar', hour: 10, by: { k: 'list', who: 'w' } })).toEqual(['away|a|bar|10']);
  });

  it('two sentences sharing five content words say one thing twice, unless the second brings words of its own', () => {
    const a = contentWords('Everybody who drops in at the Delmonico rooms knows the spare is in the sugar tin.');
    const b = contentWords('The key that let them in was the spare, and the spare lived in the sugar tin at the Delmonico rooms.');
    expect(sharedContent(a, b).length).toBeGreaterThanOrEqual(5);
    expect(saysAgain('The key that let them in was the spare, and the spare lived in the sugar tin at the Delmonico rooms.', ['Everybody who drops in at the Delmonico rooms knows the spare is in the sugar tin.'])).toBe(true);
    // A conclusion drawn from what the page said: the street, and whose street it was.
    expect(saysAgain('So he had it right, and Pinsky said the same: the Lyric at ten and at seven; East Houston Street was where Mrs. Krantz lived, and that was what mattered.', ['Pinsky saw you here at seven and eight.', 'At ten, walking over to the Lyric, I passed Glick on East Houston Street, in a hurry and no hat on.'])).toBe(false);
  });

  it('Medium 7’s search says the sugar tin once at most (the office said it), and the thought says what it means', () => {
    const run = playBoardOracle(dealBoard(7, 4, 'lost-pet')).run;
    const find = run.log.find((p) => p.board?.job === 'search') as Page;
    expect((prose(find).match(/sugar tin/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(prose(find)).toMatch(/\b[Tt]he spare\b/);
    expect(prose(find)).toMatch(/(?:Whoever [^.]*|\w+’s (?:visitor|caller)) had been at the Delmonico rooms first/);
    // The scene says no window and no way in again (the office said them).
    const scene = run.log.find((p) => p.board?.job === 'arrive' && p.at === 'scene') as Page;
    expect(prose(scene)).not.toMatch(/sugar tin|ten or eleven/);
  });

  it('a hand-off is said once: the page after doesn’t point at the same step again', () => {
    for (const s of [7, 11, 12]) {
      const run = playBoardOracle(dealBoard(s, 0, 'murder')).run;
      run.log.forEach((p, i) => {
        const prev = run.log[i - 1];
        if (prev?.board?.handoffTo && p.board?.handoffTo) expect(p.board.handoffTo, `seed ${s} p${i + 1}`).not.toBe(prev.board.handoffTo);
      });
    }
  });
});

describe('docs/59 item 2: told by change', () => {
  it('a watcher’s hours are said by who was there throughout, who came and who left, and "nobody else" once', () => {
    const run = playBoardOracle(dealBoard(7, 0, 'murder')).run;
    const list = run.log.find((p) => p.board?.q === 'list:barkeep') ?? run.log.find((p) => p.board?.job === 'list');
    const text = prose(list as Page);
    expect(text).toMatch(/Mosley and Hanrahan were [^.]*all evening\. Bledsoe ate at eight and left\. Rafferty came in at nine, like every night, and was gone by ten\./);
    expect(text).not.toMatch(/Hour by hour|; (?:eight|nine|ten)\b/i);
  });

  it('no quotation recites three bare hour slots', () => {
    expect(slotClauses('Eight o’clock, Mosley and Hanrahan. Nine, Mosley. At ten I had Mosley and Hanrahan, and not another soul.').length).toBeGreaterThanOrEqual(3);
    expect(slotClauses('At eight I was at Moskowitz’s with Mosley and Hanrahan. At nine I went round to Mrs. Nagy’s to borrow a hatpin, and at ten I was back at Moskowitz’s for supper, on my own.').length).toBeLessThan(3);
  });

  it('every voiced list and company clause reads back to its hours exactly (the round trip)', () => {
    VOICED.check = true;
    const before = voicedTally();
    for (const tier of [0, 2, 4] as TierIndex[]) for (const type of typesFor(tier).slice(0, 2) as CaseType[]) playBoardOracle(dealBoard(3, tier, type));
    const after = voicedTally();
    expect(after.misses.slice(before.misses.length)).toEqual([]);
  });
});

describe('docs/59 item 3: the thought gives the consequence', () => {
  it('Raw 7: after Hauck’s hours and Mrs. Nagy’s, what they mean at ten, never the list again', () => {
    const run = playBoardOracle(dealBoard(7, 0, 'murder')).run;
    const all = run.log.map(prose).join('\n');
    expect(all).toMatch(/at ten, when Rafferty died, Mosley was still at Moskowitz’s, and by then Bledsoe had left/i);
    expect(all).toMatch(/Bledsoe had been at Mrs\. Nagy’s at nine, where the revolver was kept, and (?:gone before|had left by) ten/);
    expect(all).not.toMatch(/She said that at ten, when Rafferty died, only/);
  });

  it('the find says whoever did it had been where the means was, first; the papers each grudge with its direction', () => {
    const run = playBoardOracle(dealBoard(7, 0, 'murder')).run;
    const all = run.log.map(prose).join('\n');
    // (docs/60: lean, the short form, "Whoever shot Rafferty had been at Mrs. Nagy’s first" or "Rafferty’s killer …".)
    expect(all).toMatch(/(?:Whoever (?:shot|pulled the trigger on) Rafferty|Rafferty’s killer) had been at Mrs\. Nagy’s first/);
    const d = dealBoard(7, 0, 'murder');
    const lines = d.kase.people.filter((p) => p.role === 'suspect').map((p) => papersLine(d.kase, p.id, true));
    // (An entry a suspect: their name, then the grudge with its direction.)
    for (const l of lines) expect(l).toMatch(/^[A-Z][\w.’ ]+: (?:the dead (?:man|woman) |(?:he|she) owed the dead (?:man|woman) )/);
  });
});

describe('docs/59 item 5 and notes 4–6, 9: the office', () => {
  it('the answer to "when" opens on the hour, and a poisoning says the hour is the dose’s', () => {
    let poison = 0;
    for (const world of [undefined, 'neighbourhood']) {
      for (let s = 1; s <= 8; s++) {
        for (const tier of [0, 3, 5] as TierIndex[]) {
          const d = dealBoard(s, tier, 'murder', world ? { world } : {});
          const office = playBoardOracle(d).run.log[0] as Page;
          const text = prose(office);
          const when = /“((?:Seven|Eight|Nine|Ten|Eleven)[^”]*o’clock[^”]*)”/.exec(text);
          expect(when, `${world ?? 'dealt'} ${s} ${tier}: ${text}`).not.toBeNull();
          if (/coroner says (?:it was )?(?:chloral|laudanum|rat poison|cyanide|arsenic)/.test(text)) {
            poison++;
            // (Round 7, P9: the dose said as the dose: "that’s when he was given it".)
            expect(text).toMatch(/that’s when (?:he|she) was (?:poisoned|given it)/i);
            // (Case 2312, the owner's ruling: the report never names what was done; the rules say a poisoning's when.)
            expect(boardFields(d).find((f) => f.key === 'when')?.label).toBe('When did it happen?');
          }
          // No money before the client pays it; the finder said who they are.
          expect(text.split('“')[0]).not.toMatch(/retainer|\bfee\b|money in the (?:desk )?drawer/);
        }
      }
    }
    expect(poison).toBeGreaterThan(0);
  });

  it('a place said as whose it is is never a pronoun ("The table at her was set at eight")', () => {
    const a = prose(playBoardOracle(dealBoard(4, 1, 'lost-pet')).run.log[0] as Page);
    expect(a).not.toMatch(PLACE_PRONOUN);
    // (Round 7, P9: "set at eight" asked eight people or eight o’clock: the office says when the people were in.)
    expect(a).toMatch(/(?:The table at|there had been people at|The people at) (?:Zeldin’s|her place)/);
    const b = playBoardOracle(dealBoard(10, 5, 'lost-pet', { world: 'neighbourhood' })).run.log.map(prose).join('\n');
    expect(b).not.toMatch(/lived at (?:her|him),/);
  });
});

describe('docs/59 items 4, 7, 8: continuity, tics and assembly', () => {
  it('the clarity lints hold at zero on the oracle’s and the wanderer’s nights, both worlds', () => {
    for (const world of [undefined, 'neighbourhood']) {
      for (const tier of [0, 2, 4] as TierIndex[]) {
        for (const type of typesFor(tier) as CaseType[]) {
          const d = dealBoard(5, tier, type, world ? { world } : {});
          for (const r of [playBoardOracle(d).run, playWanderer(d, 5).run]) expect(clarityIssues(d, r).map((x) => `${x.rule} p${x.page + 1} ${x.detail}`), `${world ?? 'dealt'} ${tier} ${type}`).toEqual([]);
        }
      }
    }
  });

  it('the tics and the assembly slips are what the lints catch', () => {
    expect(similesIn('She nodded toward the tables, as if the tables could help, like a man counting money.')).toBe(2);
    expect(ticsIn('Tillman hadn’t, as it turned out, and I wrote that down.')).toEqual(['tic:turned-out', 'tic:wrote-down']);
    expect(WOULD_PAST.test('I asked where the dead man would spent the evening.')).toBe(true);
    expect(CAP_PRONOUN.test('I don’t like gossip, but He threw her out of a lease.')).toBe(true);
    expect(PLACE_PRONOUN.test('The table at her was set at eight, for cards.')).toBe(true);
    expect(PLACE_PRONOUN.test('Fritz lived at her, in a basket by the stove.')).toBe(true);
    expect(PLACE_PRONOUN.test('I looked at her, and she looked back.')).toBe(false);
  });

  it('the claudisms gates hold over twelve nights: one simile a page, each night tic once, a gag twice', () => {
    expect(gates({ nights: 12 })).toEqual([]);
  }, 120_000);
});
