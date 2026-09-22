/**
 * Hone 3 — order, redundancy, pronouns in speech, breath tails.
 *
 * `docs/14-hone-3.md` asks five things of the generator, and this file holds
 * it to them over the corpus rather than over one seed:
 *
 * 1. The briefing runs death → standing → found → precinct → tie →
 *    purpose and cost → pointer, per case type, and the record's order is the
 *    spoken order, so the truth sheet prints the same thing.
 * 2. `body-at-scene` states where the body was found and where it happened in
 *    one sentence, and no briefing says the same thing twice.
 * 3. Inside one of the client's turns a person is named once and is a pronoun
 *    after that, unless the turn names somebody else of the same gender.
 * 4. A hand-written breath splits its sentence; it never appends to it.
 * 5. The three things the read of seeds 3, 7 and 12 turned up.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { TROPE_IDS } from '../src/gen/tropes/index.js';
import type { Case, Difficulty } from '../src/gen/types.js';

const SEEDS = 200;
/** Forcing a trope costs a generation each, so the odd shapes get fewer. */
const FORCED_SEEDS = 40;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

const everyDifficulty: Case[] = [];
for (const difficulty of DIFFICULTIES) {
  for (let seed = 1; seed <= SEEDS; seed++) everyDifficulty.push(generateCase(seed, { difficulty }));
}

/**
 * Every trope, forced, because the weights do not deal the rare ones often
 * enough for a rule about all eight to be tested by the natural corpus.
 */
const everyTrope: Case[] = [];
for (const tropeId of TROPE_IDS) {
  for (let seed = 1; seed <= FORCED_SEEDS; seed++) everyTrope.push(generateCase(seed, { tropeId }));
}

/* ------------------------------------------------------------------ *
 * §4 — breath tails.
 * ------------------------------------------------------------------ */

/**
 * The only words `breathe` is allowed to put into a sentence that was not
 * already in it: the leads it writes on a second piece (`breath.ts`'s
 * `JOINTS`) and the copula its robbery discovery shape supplies for "It was
 * ten o'clock." Everything else in a breath has to have come from the spoken
 * form, because a breath is a way of saying the same sentence and not a way
 * of saying more of it.
 */
const BREATH_MAY_ADD = new Set(['but', 'so', 'because', 'it', 'was']);

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z0-9’']+/g) ?? [];

describe('§4 — a breath splits, and never appends', () => {
  it('puts no word into the split that the spoken sentence did not have', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      for (const line of c.briefing) {
        if (line.spoken === null || line.breath === undefined) continue;
        const had = new Set(wordsOf(line.spoken));
        const added = wordsOf(line.breath.join(' ')).filter(
          (w) => !had.has(w) && !BREATH_MAY_ADD.has(w),
        );
        expect(
          added,
          `seed ${c.seed} d${c.difficulty}: the breath added ${added.join(', ')}\n  spoken: ${line.spoken}\n  breath: ${line.breath.join(' | ')}`,
        ).toEqual([]);
      }
    }
  });

  /**
   * The other half of the same rule, and the one Hone 1 already had: nothing
   * is dropped either. Together they say the breath and the sentence are the
   * same words in a different number of pieces.
   */
  it('keeps every word of the spoken sentence in the split', () => {
    const cheap = new Set(['and', 'which', 'is', 'was', 'were', 'are', 'but', 'so', 'it', 'that']);
    for (const c of everyTrope) {
      for (const line of c.briefing) {
        if (line.spoken === null || line.breath === undefined) continue;
        const have = new Set(wordsOf(line.breath.join(' ')));
        const lost = wordsOf(line.spoken).filter((w) => !have.has(w) && !cheap.has(w));
        expect(
          lost,
          `seed ${c.seed} ${c.act.tropeId}: the breath lost ${lost.join(', ')}\n  ${line.spoken}`,
        ).toEqual([]);
      }
    }
  });
});
