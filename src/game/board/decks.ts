/**
 * docs/43 §8: the board's own card families, and the hand that deals them.
 *
 * The new families live in `content/board/` beside the old decks, in the same
 * shape (id, tags, text, `joke`), and are dealt the same way: a card read
 * tonight isn't dealt again tonight, a page tells about one joke, and a hole
 * with nothing that fits widens to the next key before it goes empty. The old
 * decks the board can use as they are (the office, the watcher's clause, the
 * look of a trade) are dealt through the same hand.
 */

import { Rng } from '../../gen/rng.js';
import { DECKS, fill, type Card, type DeckName, type Slots } from '../voice/cards.js';
import officeJson from '../../../content/board/office.json';
import placesJson from '../../../content/board/places.json';
import peopleJson from '../../../content/board/people.json';
import tellingJson from '../../../content/board/telling.json';
import confrontJson from '../../../content/board/confront.json';
import nightJson from '../../../content/board/night.json';
import connectiveJson from '../../../content/board/connective.json';
import stillJson from '../../../content/board/still.json';

/** A board card: an old deck's card shape, with its family. */
export interface BoardCard {
  id: string;
  family: string;
  tags: Record<string, string | string[]>;
  text: string;
  joke?: boolean;
  /** What a later line may call back to: the office's prop. */
  exports?: Card['exports'];
  notes?: string;
}

export const BOARD_CARDS: BoardCard[] = [
  ...(officeJson as BoardCard[]),
  ...(placesJson as BoardCard[]),
  ...(peopleJson as BoardCard[]),
  ...(tellingJson as BoardCard[]),
  ...(confrontJson as BoardCard[]),
  ...(nightJson as BoardCard[]),
  ...(connectiveJson as BoardCard[]),
  ...(stillJson as BoardCard[]),
];

const BY_FAMILY = new Map<string, BoardCard[]>();
for (const c of BOARD_CARDS) BY_FAMILY.set(c.family, [...(BY_FAMILY.get(c.family) ?? []), c]);

export function familyCards(family: string): BoardCard[] {
  return BY_FAMILY.get(family) ?? [];
}

/** A tag wanted: a value, or any of several. A card's `any` matches everything. */
export type Want = Record<string, string | undefined>;

function tagFits(card: BoardCard, name: string, want: string): boolean {
  const have = card.tags[name];
  // A card that doesn't say is for another key: an arrival for a kind isn't an arrival for every place.
  if (have === undefined) return false;
  if (Array.isArray(have)) return have.includes(want) || have.includes('any');
  return have === want || have === 'any';
}

/**
 * The page's hand. One per page, seeded from the night and the page, and told
 * what the night has spent already.
 */
export class Hand {
  readonly rng: Rng;
  private readonly spentSet: Set<string>;
  /** Spent on this page, in order. */
  readonly spent: string[] = [];
  private jokes = 0;
  /** docs/44: cards dealt again tonight because nothing fresh fitted. */
  reuses = 0;
  /** The last board card dealt. */
  private lastId = '';
  /** Card text a page may not use tonight (a Yiddish theatre has no pictures). */
  avoid: RegExp | null = null;

  constructor(seed: number, page: number, spent: readonly string[]) {
    this.rng = new Rng(((seed * 2654435761) ^ (page * 40503 + 0x9e37)) >>> 0);
    this.spentSet = new Set(spent);
  }

  private held = false;

  /** May a card be a joke now: none told yet, and none kept for the page's last word. */
  get mayJoke(): boolean {
    return this.jokes === 0 && !this.held;
  }

  /** No joke told yet, kept or not: the page's last word may still be one. */
  get jokeFree(): boolean {
    return this.jokes === 0;
  }

  /** Keep the page's joke for its last word (a callback), or stop keeping it (M13's `holdJoke`). */
  hold(on: boolean): void {
    this.held = on;
  }

  /** A joke the page told that wasn't a card. */
  joke(): void {
    this.jokes++;
  }

  used(id: string): boolean {
    return this.spentSet.has(id);
  }

  note(id: string): void {
    if (this.spentSet.has(id)) return;
    this.spentSet.add(id);
    this.spent.push(id);
  }

  /**
   * Deal a card of `family`. `want` is written general to particular
   * (`{ kind, key }`, `{ kind, id }`), and tried whole, then with its tags let
   * go one at a time from the last, and then with none only when `widen` is
   * true. Cards whose slots can't all be filled are passed over. Null when
   * nothing fits.
   */
  draw(family: string, want: Want = {}, slots: Slots = {}, opts: { widen?: boolean; plain?: boolean; need?: boolean; fresh?: boolean; joke?: boolean } = {}): string | null {
    const pool = familyCards(family);
    if (pool.length === 0) return null;
    const keys = Object.keys(want).filter((k) => want[k] !== undefined);
    const rungs: string[][] = [];
    for (let n = keys.length; n >= 0; n--) {
      if (n === 0 && keys.length > 0 && !opts.widen) break;
      rungs.push(keys.slice(0, n));
    }
    if (rungs.length === 0) rungs.push([]);
    const plainOnly = opts.plain === true || (!this.mayJoke && !(opts.joke && this.jokes === 0));
    for (const pass of plainOnly && opts.need ? [true, false] : [plainOnly]) {
      for (const rung of rungs) {
        const fits = pool.filter((c) => rung.every((k) => tagFits(c, k, want[k] as string)) && (!pass || !c.joke) && !(this.avoid && this.avoid.test(c.text)));
        const filled = fits.map((c) => ({ c, text: fill(c as unknown as Card, slots) })).filter((x): x is { c: BoardCard; text: string } => x.text !== null);
        if (filled.length === 0) continue;
        const fresh = filled.filter((x) => !this.spentSet.has(x.c.id));
        if (fresh.length === 0 && opts.fresh) continue;
        const from = fresh.length > 0 ? fresh : filled;
        const pick = from[this.rng.int(from.length)] as { c: BoardCard; text: string };
        if (fresh.length === 0) this.reuses++;
        this.lastId = pick.c.id;
        this.note(pick.c.id);
        if (pick.c.joke) this.jokes++;
        return pick.text;
      }
    }
    return null;
  }

  /** The card itself, for one whose exports the page wants (the office's prop). */
  drawCard(family: string, want: Want = {}, slots: Slots = {}, opts: { widen?: boolean; plain?: boolean; fresh?: boolean; joke?: boolean } = { widen: true }): { card: BoardCard; text: string } | null {
    const text = this.draw(family, want, slots, opts);
    if (text === null) return null;
    const id = this.lastId;
    return { card: BOARD_CARDS.find((c) => c.id === id) as BoardCard, text };
  }

  /** Deal from one of the old decks, by a plain match on its tags. */
  drawOld(deck: DeckName, match: (c: Card) => boolean, slots: Slots = {}, plain = false): { card: Card; text: string } | null {
    const pool = (DECKS[deck] ?? []).filter((c) => match(c) && (!(plain || !this.mayJoke) || !c.joke) && !(this.avoid && this.avoid.test(c.text)));
    const filled = pool.map((c) => ({ card: c, text: fill(c, slots) })).filter((x): x is { card: Card; text: string } => x.text !== null);
    const fresh = filled.filter((x) => !this.spentSet.has(x.card.id));
    const from = fresh.length > 0 ? fresh : filled;
    if (from.length === 0) return null;
    const pick = from[this.rng.int(from.length)] as { card: Card; text: string };
    if (fresh.length === 0) this.reuses++;
    this.note(pick.card.id);
    if (pick.card.joke) this.jokes++;
    return pick;
  }

  /** One of a few hand-written lines, without repeating tonight. Keyed so the night remembers it. */
  pick(key: string, lines: readonly string[]): string {
    const fresh = lines.map((l, i) => ({ l, id: `${key}#${i}` })).filter((x) => !this.spentSet.has(x.id));
    const from = fresh.length > 0 ? fresh : lines.map((l, i) => ({ l, id: `${key}#${i}` }));
    const x = from[this.rng.int(from.length)] as { l: string; id: string };
    this.note(x.id);
    return x.l;
  }
}
