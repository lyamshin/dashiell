/**
 * docs/52 §4, build 2: choosing a voicing.
 *
 * The shape's voicings that fit the composite's flags, the speaker's manner
 * and the tier band, the most specific of them (`voice.ts` `fitting`); then:
 *
 * - **no joke** where the page has told its one (`Hand.mayJoke`), and a
 *   voicing that is one counts as the page's;
 * - **nothing said tonight already**: a sentence of six words or more a page
 *   before this one narrated isn't said again;
 * - **least recently used tonight**: a voicing not yet said tonight first
 *   (one of them, by the page's own dice), and otherwise the one said
 *   longest ago. So no voicing is said twice in a night while another that
 *   fits is still unsaid.
 *
 * The rhythm (`plan/rhythm.ts`) may trade the voicing for another that fitted
 * as well and hasn't been said tonight, of another length (`altsOf`).
 *
 * A use is noted in the night's spent list as `v:<id>#<n>`, so the hand can
 * say when it was last used.
 */

import type { BoardCase } from '../model.js';
import { stripMarks } from '../plan/refer.js';
import { sentencesOf, wordsIn } from '../plan/sentences.js';
import type { Shape } from './types.js';
import { fill, fitting, type Args, type Voicing } from './voice.js';

/** What the chooser needs of the page's hand. */
export interface VoiceHand {
  lastUse(id: string): number;
  uses(id: string): number;
  note(id: string): void;
  swap(prev: string, next: string): void;
  forget(id: string): void;
  readonly mayJoke: boolean;
  joke(): void;
  int(n: number): number;
}

/**
 * The composites voiced, for the tools (`scripts/voicings.ts samples`): shape, flags, arguments,
 * manner, propositions and the words, when `on`.
 */
export const SAMPLES: { on: boolean; list: { shape: string; flags: string[]; args: Args; manner?: string; props: unknown[]; said: string; voicing: string; c: BoardCase; speaker?: string }[] } = { on: false, list: [] };

/** docs/52 §6, voicing variety: every choice, with how many fitted and whether one was said again while another was still unsaid. */
export const VARIETY: { on: boolean; picks: { id: string; shape: string; pool: number; again: boolean; unsaidLeft: boolean }[] } = { on: false, picks: [] };

export interface Picked {
  v: Voicing;
  text: string;
  /** The others that fitted as well and haven't been said tonight, for the rhythm. */
  others: { v: Voicing; text: string }[];
  /** Note the use with the hand (the chooser's preview doesn't). */
  commit: () => string;
}

/**
 * A composite in its first voicing, with no hand: the words a writer keeps as its line before the
 * planner chooses (tools, tests, the notebook). Null where no voicing fits.
 */
export function sayFirst(c: BoardCase, spec: { shape: Shape; flags: readonly string[]; args: Args; manner?: string }): string | null {
  const band = c.tier <= 1 ? 'low' : c.tier <= 3 ? 'mid' : 'high';
  const v = fitting(spec.shape, new Set(spec.flags), { manner: spec.manner, tierBand: band }, spec.args)[0];
  return v ? fill(v.template, spec.args, c) : null;
}

/** The narrated sentences of a text, as `said` holds them. */
function saidBefore(text: string, said: ReadonlySet<string> | undefined): boolean {
  if (!said || said.size === 0) return false;
  return sentencesOf(stripMarks(text).replace(/“[^”]*”/g, ' ')).some((s) => wordsIn(s) >= 6 && said.has(s.trim()));
}

/**
 * The voicing a composite would be said in, without spending it: `commit()` spends it. Null when no
 * voicing fits (the caller says it plainly).
 */
export function preview(
  shape: Shape,
  flags: readonly string[],
  o: { manner?: string; tierBand?: string },
  args: Args,
  ctx: { c: BoardCase; hand?: VoiceHand; said?: ReadonlySet<string> },
): Picked | null {
  const all = fitting(shape, new Set(flags), o, args);
  if (all.length === 0) return null;
  const render = (v: Voicing) => fill(v.template, args, ctx.c);
  const hand = ctx.hand;
  if (!hand) {
    const v = all[0] as Voicing;
    return { v, text: render(v), others: [], commit: () => '' };
  }
  let pool = all.filter((v) => !v.joke || hand.mayJoke);
  if (pool.length === 0) pool = all;
  const fresh = pool.filter((v) => !saidBefore(render(v), ctx.said));
  if (fresh.length > 0) pool = fresh;
  const last = (v: Voicing) => hand.lastUse(`v:${v.id}`);
  const oldest = Math.min(...pool.map(last));
  const best = pool.filter((v) => last(v) === oldest);
  const v = best.length > 1 ? (best[hand.int(best.length)] as Voicing) : (best[0] as Voicing);
  const text = render(v);
  const others = pool.filter((x) => x !== v && last(x) < 0).map((x) => ({ v: x, text: render(x) }));
  return {
    v,
    text,
    others,
    commit: () => {
      const again = last(v) >= 0;
      if (VARIETY.on) VARIETY.picks.push({ id: v.id, shape, pool: all.length, again, unsaidLeft: again && all.some((x) => last(x) < 0) });
      const key = `v:${v.id}#${hand.uses(`v:${v.id}`) + 1}`;
      hand.note(key);
      if (v.joke) hand.joke();
      return key;
    },
  };
}
