/**
 * docs/53, addendum: no engine words in the narration. The lint (`jargon.ts`), the designer's line it
 * was written for, the plain page and the voicings held to it, the hours said with why they matter,
 * and the book's own words (the grid, the notebook, the help) said as a person would.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { engineWords } from '../src/game/board/jargon.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { plainPage } from '../src/game/board/bones/plain.js';
import { voicings } from '../src/game/board/bones/voice.js';
import { isSpeech } from '../src/game/board/bones/clarity.js';
import { whyHours, wayKnown, meansKnew } from '../src/game/board/bones/phrase.js';
import { boardGridText } from '../src/game/board/grid.js';
import { notebookText } from '../src/game/board/text.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import type { Page } from '../src/game/board/types.js';

const RAW11 = ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list'];

describe('docs/53 addendum: the engine’s words out of the narration', () => {
  it('the lint catches the designer’s line, and passes what a person would say', () => {
    const before = 'At ten, the hour that mattered, Mrs. Kowalski’s list had Rafferty and Moretti at Kowalski’s and nobody else; Steinbach and Bellucci had been there at nine and gone out after.';
    const names = engineWords(before).map((h) => h.name);
    expect(names).toEqual(expect.arrayContaining(['list', 'and nobody else', 'the hour that mattered', 'had him at']));
    expect(engineWords('Mrs. Kowalski said that at ten, when the watch went, only Rafferty and Moretti were at Kowalski’s. Steinbach and Bellucci had been in at nine and gone out after.')).toEqual([]);
    // Speech may be colloquial, but no board-speak: "and nobody else at all" in a watcher's mouth.
    expect(engineWords('“Ten o’clock, Feeney and Ashby, and nobody else at all.”').map((h) => h.speech)).toEqual([true]);
    expect(engineWords('“Ten o’clock, only Feeney and Ashby.”')).toEqual([]);
  });

  it('the designer’s page now says the hour and why, and who was there, as the landlady said it', () => {
    const d = dealBoard(11, 0, 'lost-item');
    let run = newBoardRun(d);
    for (const c of RAW11) run = stepBoard(d, run, c).run;
    const page = (run.log[run.log.length - 1] as Page).blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n');
    // (docs/59 item 3: what the list means then, not the list again: who had been where the spare key
    // was kept, and gone, and who was still there.)
    expect(page).toMatch(/Steinbach and Bellucci had been at Kowalski’s at eight and nine, where the spare key was kept,\s+and (?:gone before|had left by) ten/);
    expect(page).not.toMatch(/hour that mattered|nobody else|’s list|had Rafferty/);
  });

  it('every voicing is free of them: narration outright, and speech of board-speak', () => {
    for (const v of voicings()) expect(engineWords(isSpeech(v) && !/“/.test(v.template) ? `“${v.template}”` : v.template), v.id).toEqual([]);
  });

  it('every plain page, and every page as read, is free of them (both worlds, every tier)', () => {
    for (const world of [undefined, 'neighbourhood'] as const) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (let s = 1; s <= 2; s++) {
          const type = typesFor(tier)[s % typesFor(tier).length] as CaseType;
          const d = dealBoard(s, tier, type, world ? { world } : {});
          for (const run of [playBoardOracle(d).run, playWanderer(d, s).run]) {
            for (const p of run.log) {
              for (const b of plainPage(d.kase, p)) if (b.kind === 'prose') expect(engineWords(b.text), `${d.kase.id} p${p.n + 1} plain: ${b.text}`).toEqual([]);
              for (const b of p.blocks) if (b.kind === 'prose' && b.voice !== 'chapter') expect(engineWords(b.voice === 'answer' && !b.text.includes('“') ? `“${b.text}”` : b.text), `${d.kase.id} p${p.n + 1}: ${b.text}`).toEqual([]);
            }
          }
        }
      }
    }
  });

  it('the hours that matter are said with why, and the way in as the thing it was', () => {
    const murder = dealBoard(2, 2, 'murder').kase;
    expect(whyHours(murder, [9])).toMatch(/^when \S.* died$/);
    expect(whyHours(murder, [9, 10])).toMatch(/could have died$/);
    const pet = dealBoard(1, 4, 'lost-pet').kase;
    expect(whyHours(pet, [11])).toMatch(/^when \S+ went$/);
    expect(wayKnown(pet)).not.toMatch(/way in/);
    expect(meansKnew(murder)).toMatch(/^could have got the /);
  });

  it('the book’s own words: the grid, the notebook and the help say it plainly', () => {
    const d = dealBoard(11, 0, 'lost-item');
    const run = playBoardOracle(d).run;
    const grid = boardGridText(d.kase, run);
    expect(grid).not.toMatch(/collid|the way in|\bmeans\b/i);
    // (docs/64: the last column asks its own question.)
    expect(grid).toMatch(/Did they know where the key was\?|Could they get the spare key\?/);
    expect(notebookText(d, run)).not.toMatch(/and nobody else|The office:/);
    for (const l of [...BOARD_RULES, ...BOARD_TEACH_LINES]) expect(l).not.toMatch(/collide|the line that breaks|breaks their story|the board\b/);
  });
});
