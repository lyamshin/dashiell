/**
 * docs/43 §8: the board's own card families, and the hand that deals them.
 *
 * The families live in `content/board/`, in the old decks' shape (id, tags,
 * text, `joke`), and are dealt the old way: a card read tonight isn't dealt
 * again tonight, a page tells about one joke, and a hole with nothing that
 * fits widens to the next key before it goes empty. The four old decks the
 * board uses as they are (`cards.ts`: the office, the client's entrance, the
 * watcher's clause, the look of a trade) are dealt through the same hand.
 */

import { Rng } from '../../gen/board/rng.js';
import { DECKS, fill, type Card, type DeckName, type Slots } from './cards.js';
import officeJson from '../../../content/board/office.json';
import placesJson from '../../../content/board/places.json';
import peopleJson from '../../../content/board/people.json';
import tellingJson from '../../../content/board/telling.json';
import confrontJson from '../../../content/board/confront.json';
import nightJson from '../../../content/board/night.json';
import connectiveJson from '../../../content/board/connective.json';
import stillJson from '../../../content/board/still.json';
import walkJson from '../../../content/board/walk.json';

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
  ...(walkJson as BoardCard[]),
];

const BY_FAMILY = new Map<string, BoardCard[]>();
for (const c of BOARD_CARDS) BY_FAMILY.set(c.family, [...(BY_FAMILY.get(c.family) ?? []), c]);

export function familyCards(family: string): BoardCard[] {
  return BY_FAMILY.get(family) ?? [];
}

/** A tag wanted: a value, or any of several. A card's `any` matches everything. */
export type Want = Record<string, string | undefined>;

/** docs/48 §3: the bible's own lines for a draw (`world.ts`), told which of them the hand dealt. */
export type WorldDeck = ((family: string, want: Want, slots: Slots) => BoardCard[]) & { picked?: (card: BoardCard) => void };

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
  /**
   * docs/48 §3: on a night from the neighbourhood, the bible's own lines for a draw, dealt before
   * the families (`world.ts`). A bible line not yet read tonight wins; once they're all read, the
   * families fill in.
   */
  world?: WorldDeck;
  /** The last bible card dealt, for `drawCard`. */
  private lastWorld: BoardCard | null = null;

  /** The night's spent ids before this page, in the order they were spent. */
  private readonly night: readonly string[];

  /**
   * docs/52 build 2: the voicings' own dice, apart from the cards': which voicing a fact takes doesn't
   * depend on what texture the page dealt (the situated deck on or off says the same facts).
   */
  readonly voiceRng: Rng;

  /**
   * docs/55 6: what the last ten nights dealt (`recent`), and the last night alone (`lastNight`), from
   * the profile. The hand prefers what none of them dealt, and never deals last night's again while
   * anything else fits: the lines a player remembers ("It came off a rack…") don't come round two
   * nights running. Empty, the hand deals as it always did.
   */
  readonly recent: ReadonlySet<string>;
  readonly lastNight: ReadonlySet<string>;

  constructor(seed: number, page: number, spent: readonly string[], seen?: { recent?: readonly string[]; last?: readonly string[] }) {
    this.rng = new Rng(((seed * 2654435761) ^ (page * 40503 + 0x9e37)) >>> 0);
    this.voiceRng = new Rng(((seed * 2246822519) ^ (page * 3266489917 + 0x51ed)) >>> 0);
    this.spentSet = new Set(spent);
    this.night = spent;
    this.recent = new Set(seen?.recent ?? []);
    this.lastNight = new Set(seen?.last ?? []);
  }

  /** docs/55 6: of what fits, what last night didn't deal, and of that what the last ten didn't; as much of that as there is. */
  prefer<T>(xs: T[], id: (x: T) => string): T[] {
    if (this.recent.size === 0 && this.lastNight.size === 0) return xs;
    const notLast = xs.filter((x) => !this.lastNight.has(id(x)));
    const base = notLast.length > 0 ? notLast : xs;
    const unseen = base.filter((x) => !this.recent.has(id(x)));
    return unseen.length > 0 ? unseen : base;
  }

  /** docs/55 6: 2 when last night dealt it, 1 when one of the ten before did, 0 when none did. */
  seenBefore(id: string): number {
    return this.lastNight.has(id) ? 2 : this.recent.has(id) ? 1 : 0;
  }

  /**
   * docs/52 §4: when tonight an id was last spent (`id`, or `id#n` for its n-th use): its place in
   * the night's spent list, or -1 when it never was. The voicings' least-recently-used rule.
   */
  lastUse(id: string): number {
    const hit = (x: string) => x === id || x.startsWith(`${id}#`);
    for (let i = this.spent.length - 1; i >= 0; i--) if (hit(this.spent[i] as string)) return this.night.length + i;
    for (let i = this.night.length - 1; i >= 0; i--) if (hit(this.night[i] as string)) return i;
    return -1;
  }

  /** docs/52 §4: give back an id spent on this page (a voicing whose composite went into another). */
  forget(id: string): void {
    const i = this.spent.indexOf(id);
    if (i < 0) return;
    this.spent.splice(i, 1);
    this.spentSet.delete(id);
  }

  /** docs/52 §4: how many times tonight an id has been spent (`id`, or `id#n`). */
  uses(id: string): number {
    const hit = (x: string) => x === id || x.startsWith(`${id}#`);
    return this.night.filter(hit).length + this.spent.filter(hit).length;
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
    this.lastWorld = null;
    this.last = null;
    if (this.world) {
      const plain = opts.plain === true || (!this.mayJoke && !(opts.joke && this.jokes === 0));
      const ours = this.prefer(
        this.world(family, want, slots)
          .filter((c) => (!plain || !c.joke) && !(this.avoid && this.avoid.test(c.text)) && !this.spentSet.has(c.id))
          .map((c) => ({ c, text: fill(c as unknown as Card, slots) }))
          .filter((x): x is { c: BoardCard; text: string } => x.text !== null),
        (x) => x.c.id,
      );
      if (ours.length > 0) {
        const pick = ours[this.rng.int(ours.length)] as { c: BoardCard; text: string };
        this.lastId = pick.c.id;
        this.lastWorld = pick.c;
        this.note(pick.c.id);
        this.world.picked?.(pick.c);
        if (pick.c.joke) this.jokes++;
        return pick.text;
      }
    }
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
        const from = fresh.length > 0 ? this.prefer(fresh, (x) => x.c.id) : filled;
        const pick = from[this.rng.int(from.length)] as { c: BoardCard; text: string };
        if (fresh.length === 0) this.reuses++;
        this.lastId = pick.c.id;
        this.note(pick.c.id);
        if (pick.c.joke) this.jokes++;
        // docs/49: what else this draw could have dealt, for the microplanner's rhythm.
        this.last = { id: pick.c.id, text: pick.text, joke: !!pick.c.joke, others: fresh.filter((x) => x.c.id !== pick.c.id && !!x.c.joke === !!pick.c.joke).map((x) => ({ id: x.c.id, text: x.text })) };
        return pick.text;
      }
    }
    return null;
  }

  /**
   * docs/49: the last card the families dealt, and the other fresh cards that fitted the same draw
   * as well (same family, same tags, the same joke or none): the microplanner may take one of
   * them instead, for the page's rhythm. Never a card from the bible (its picks have their own
   * bookkeeping), and never one dealt tonight.
   */
  last: { id: string; text: string; joke: boolean; others: { id: string; text: string }[] } | null = null;

  /**
   * docs/49: the fresh plain cards a draw of `family` could deal, without dealing one (no roll, nothing
   * noted): the planner's last resort when a line it was handed can't be said without a name a third
   * time. The deck's cards only, the first rung of `want` that has any.
   */
  options(family: string, want: Want = {}, slots: Slots = {}, avoid?: RegExp): { id: string; text: string }[] {
    const pool = familyCards(family);
    const keys = Object.keys(want).filter((k) => want[k] !== undefined);
    for (let n = keys.length; n >= 0; n--) {
      const rung = keys.slice(0, n);
      const fits = pool.filter((c) => rung.every((k) => tagFits(c, k, want[k] as string)) && !c.joke && !this.spentSet.has(c.id) && !(this.avoid && this.avoid.test(c.text)) && !(avoid && avoid.test(c.text)));
      const filled = fits.map((c) => ({ id: c.id, text: fill(c as unknown as Card, slots) })).filter((x): x is { id: string; text: string } => x.text !== null);
      if (filled.length > 0) return filled;
    }
    return [];
  }

  /** Take `next` instead of `prev`: `prev` is free to be dealt again tonight. */
  swap(prev: string, next: string): void {
    if (this.spentSet.has(prev) && this.spent.includes(prev)) {
      this.spentSet.delete(prev);
      this.spent.splice(this.spent.indexOf(prev), 1);
    }
    this.note(next);
  }

  /** The card itself, for one whose exports the page wants (the office's prop). */
  drawCard(family: string, want: Want = {}, slots: Slots = {}, opts: { widen?: boolean; plain?: boolean; fresh?: boolean; joke?: boolean } = { widen: true }): { card: BoardCard; text: string } | null {
    const text = this.draw(family, want, slots, opts);
    if (text === null) return null;
    const id = this.lastId;
    return { card: this.lastWorld ?? (BOARD_CARDS.find((c) => c.id === id) as BoardCard), text };
  }

  /** Deal from one of the old decks, by a plain match on its tags. */
  drawOld(deck: DeckName, match: (c: Card) => boolean, slots: Slots = {}, plain = false, notLastNight = false): { card: Card; text: string } | null {
    const pool = (DECKS[deck] ?? []).filter((c) => match(c) && (!(plain || !this.mayJoke) || !c.joke) && !(this.avoid && this.avoid.test(c.text)));
    const filled = pool.map((c) => ({ card: c, text: fill(c, slots) })).filter((x): x is { card: Card; text: string } => x.text !== null);
    const fresh = filled.filter((x) => !this.spentSet.has(x.card.id));
    const from = fresh.length > 0 ? this.prefer(fresh, (x) => x.card.id) : filled;
    if (from.length === 0) return null;
    // docs/55 6: a card a player remembers isn't dealt two nights running, even where it's the only one that fits.
    if (notLastNight && from.every((x) => this.lastNight.has(x.card.id))) return null;
    const pick = from[this.rng.int(from.length)] as { card: Card; text: string };
    if (fresh.length === 0) this.reuses++;
    this.note(pick.card.id);
    if (pick.card.joke) this.jokes++;
    return pick;
  }

  /** One of a few hand-written lines, without repeating tonight. Keyed so the night remembers it. */
  pick(key: string, lines: readonly string[]): string {
    const fresh = lines.map((l, i) => ({ l, id: `${key}#${i}` })).filter((x) => !this.spentSet.has(x.id));
    const from = fresh.length > 0 ? this.prefer(fresh, (x) => x.id) : lines.map((l, i) => ({ l, id: `${key}#${i}` }));
    const x = from[this.rng.int(from.length)] as { l: string; id: string };
    this.note(x.id);
    this.picks.set(x.l, { id: x.id, others: lines.map((l, i) => ({ l, id: `${key}#${i}` })).filter((y) => y.id !== x.id) });
    return x.l;
  }

  /** docs/49: what each hand-written line picked on this page could have been instead, for the rhythm. */
  readonly picks = new Map<string, { id: string; others: { l: string; id: string }[] }>();
}
