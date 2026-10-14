/**
 * docs/50 §8: the gap format, phase 2b's contract between the writers of the
 * gap targets, the fine-tune, and the book.
 *
 * One gap is one example. Its prompt puts the page so far first, so that a
 * page's gaps share one cache (`page.ts`): the page is fed once, and each gap
 * adds only its own header, the unit after it, and its draft.
 *
 *   <|eot|> BEFORE <|gap|> <|slot:S|> <|tier:T|> <|kind:K|> <|manner:M|> <|sep|> AFTER <|sep|> TARGET <|endgap|>
 *
 * - BEFORE: the page so far as it will read (the locked units verbatim, the
 *   earlier gaps as written), paragraphs joined by " ¶ ", a paragraph break
 *   before the gap ending it with " ¶"; its last `GAP_BUDGET.before.max`
 *   tokens, cut on a token boundary (the writer re-primes to the last
 *   `before.min` when its window fills, so training cuts it anywhere in
 *   between).
 * - AFTER: the next locked unit's text, at most `GAP_BUDGET.after` tokens; empty
 *   when the gap closes the page.
 * - TARGET: one or two sentences, `GAP_BUDGET.target` tokens, starting with a
 *   space (it follows the page's text), that pass `verifyGap`.
 *
 * The specials' names and ids are `model/tokenizer.py`'s `SPECIALS`; the
 * tokenizer's JSON carries them, and `checkSpecials` holds the two together.
 *
 * Pure: ids and strings.
 */

import { EOT, GAP, SEP, type Tokenizer } from './tokenizer.js';

export const ENDGAP = 4;

export const GAP_SLOTS = ['why-here', 'walk', 'staging', 'ask', 'reaction', 'close', 'hand-off'] as const;
export const GAP_TIERS = ['raw', 'coddled', 'poached', 'soft-boiled', 'medium', 'hard-boiled'] as const;
/** The page's place kind (`PlaceKind` in pages.ts), and the three pages that aren't a place. */
export const GAP_KINDS = ['bar', 'club', 'restaurant', 'theatre', 'rooming', 'scene-murder', 'scene-lost', 'work', 'shift', 'unwatched', 'flat', 'rooms', 'home', 'office', 'sheet', 'street'] as const;
/** The speaker's manner (`WorldManner`), or none when the gap is the narrator's own. */
export const GAP_MANNERS = ['plain', 'terse', 'careful', 'none'] as const;

export type GapSlot = (typeof GAP_SLOTS)[number];
export type GapTier = (typeof GAP_TIERS)[number];
export type GapKind = (typeof GAP_KINDS)[number];
export type GapManner = (typeof GAP_MANNERS)[number];

const SLOT0 = ENDGAP + 1;
const TIER0 = SLOT0 + GAP_SLOTS.length;
const KIND0 = TIER0 + GAP_TIERS.length;
const MANNER0 = KIND0 + GAP_KINDS.length;
/** The first special id the format doesn't use (38): 38–63 are spare. */
export const GAP_SPECIALS_END = MANNER0 + GAP_MANNERS.length;

/** Token budgets, in the tokenizer's tokens. The context is 256: 160 + 6 + 48 + 1 + 40 = 255. */
export const GAP_BUDGET = { before: { min: 120, max: 160 }, after: 48, target: { min: 8, max: 40 } } as const;

export interface GapHeader {
  slot: GapSlot;
  /** 0 Raw … 5 Hard-boiled (`TIER_NAMES`). */
  tier: number;
  kind: GapKind;
  manner: GapManner;
}

function index<T extends string>(xs: readonly T[], x: T, what: string): number {
  const i = xs.indexOf(x);
  if (i < 0) throw new Error(`gap format: no ${what} ${x}`);
  return i;
}

/** <|gap|> <|slot|> <|tier|> <|kind|> <|manner|> <|sep|>. */
export function gapHeaderIds(h: GapHeader): number[] {
  if (!(h.tier >= 0 && h.tier < GAP_TIERS.length)) throw new Error(`gap format: no tier ${h.tier}`);
  return [GAP, SLOT0 + index(GAP_SLOTS, h.slot, 'slot'), TIER0 + h.tier, KIND0 + index(GAP_KINDS, h.kind, 'kind'), MANNER0 + index(GAP_MANNERS, h.manner, 'manner'), SEP];
}

/** The special's name at an id, as the tokenizer's JSON spells it. */
export function specialName(id: number): string {
  if (id === EOT) return '<|eot|>';
  if (id === GAP) return '<|gap|>';
  if (id === SEP) return '<|sep|>';
  if (id === ENDGAP) return '<|endgap|>';
  if (id >= SLOT0 && id < TIER0) return `<|slot:${GAP_SLOTS[id - SLOT0]}|>`;
  if (id >= TIER0 && id < KIND0) return `<|tier:${GAP_TIERS[id - TIER0]}|>`;
  if (id >= KIND0 && id < MANNER0) return `<|kind:${GAP_KINDS[id - KIND0]}|>`;
  if (id >= MANNER0 && id < GAP_SPECIALS_END) return `<|manner:${GAP_MANNERS[id - MANNER0]}|>`;
  return id === 1 ? '<|unk|>' : `<|r${id}|>`;
}

/** Whether a tokenizer's specials are the format's (a tokenizer from before phase 2a isn't). */
export function checkSpecials(specials: readonly string[]): string[] {
  const bad: string[] = [];
  for (let id = 0; id < GAP_SPECIALS_END; id++) if (specials[id] !== specialName(id)) bad.push(`${id}: ${String(specials[id])} ≠ ${specialName(id)}`);
  return bad;
}

export interface GapExample {
  /** <|eot|> before, the header, after, <|sep|>: what the model is given. */
  prompt: number[];
  /** The target and <|endgap|>: what it learns to write. */
  target: number[];
}

/**
 * One example, as the fine-tune reads it and the writer prompts it. `before`
 * is the page so far (cut to its last `beforeTokens`), `after` the next locked
 * unit, `target` the gap as written (a leading space is added if missing).
 */
export function gapExample(tok: Tokenizer, header: GapHeader, before: string, after: string, target: string, beforeTokens: number = GAP_BUDGET.before.max): GapExample {
  const b = tok.encode(before).slice(-beforeTokens);
  const a = after ? tok.encode(after.startsWith(' ') ? after : ` ${after}`).slice(0, GAP_BUDGET.after) : [];
  const t = tok.encode(target.startsWith(' ') ? target : ` ${target}`);
  return { prompt: [EOT, ...b, ...gapHeaderIds(header), ...a, SEP], target: [...t, ENDGAP] };
}

/** An example written out with the specials' names, for reading (the JSONL keeps the fields, not this). */
export function showExample(tok: Tokenizer, ex: GapExample): string {
  return [...ex.prompt, ...ex.target].map((id) => (id < 64 ? specialName(id) : tok.decode([id]))).join('');
}
