/**
 * docs/51: the situated deck.
 *
 * A gap is the texture between two locked facts. Its **situation** is a key
 * the planner can read off the page as it lays it out:
 *
 * | field | values |
 * |---|---|
 * | slot | why-here, walk, staging, ask, reaction, close, hand-off, gloss |
 * | page kind | office, arrival, return, account, admission-check, list, search, put, motive, turn, report, recap |
 * | place kind | the engine's `PlaceKind`s, office, and street (a walk) |
 * | manner | plain, terse, careful; none for the narrator's own slots |
 * | tier band | low (Raw, Coddled), mid (Poached, Soft-boiled), high (Medium, Hard-boiled) |
 * | before, after | the relation of the nearest fact either side: new, confirms, collides, narrows, none |
 * | put outcome | landed (a second story), held, refused, admitted, cracked, none |
 * | position | the gap's paragraph: first, middle, last |
 *
 * A card in `content/board/situated.json` is written for one key. Realization
 * tries the gap’s own key first, then lets fields go in docs/51’s order
 * (position, after, tier band, manner, place kind, before) until a card fits;
 * the slot, the page kind and the put's outcome are the floor, and below the
 * floor the old deck's card stays. No card is dealt twice a night (the hand's
 * spent list), and the night's seed, the page and the gap pick among the ones
 * that fit.
 *
 * What the deck may fill is marked by the writer (`Item.sit`): a card from a
 * family, as it was dealt, or a hand-written aside. Never a fact, a bible line,
 * a pay-off or a first look, and never what a gap carries besides its texture:
 * a why-here's reason stays as its `lead`, a first look put on the staging as
 * its `tail`.
 *
 * Tokens (`{they} {them} {their} {role} {place} {thing} {means}`) are filled
 * the way the planner refers to people: a pronoun marked with whom it means,
 * so reference (`refer.ts`) says it as the name or the role when a pronoun
 * wouldn't be clear.
 *
 * `SITUATED.on = false` (`?situated=0`, `--situated 0`) deals the old decks
 * only: the page as it read before docs/51, word for word. The keys are
 * computed either way, for the skeleton.
 */

import deckJson from '../../../../content/board/situated.json';
import { fill } from '../cards.js';
import { Rng } from '../../../gen/board/rng.js';
import { pronOf, victimOf, type BoardCase } from '../model.js';
import type { Item, Relation } from './types.js';
import type { PlanCtx } from './index.js';
import { markPronoun, roleOf, stripMarks } from './refer.js';
import { sentencesOf } from './sentences.js';

/** The switch. Off, the old decks only. */
export const SITUATED: { on: boolean } = { on: true };

export const SIT_SLOTS = ['why-here', 'walk', 'staging', 'ask', 'reaction', 'close', 'hand-off', 'gloss'] as const;
export type SitSlot = (typeof SIT_SLOTS)[number];
export const SIT_PAGES = ['office', 'arrival', 'return', 'account', 'admission-check', 'list', 'search', 'put', 'motive', 'turn', 'report', 'recap', 'repeat'] as const;
export type SitPage = (typeof SIT_PAGES)[number];
export type SitManner = 'plain' | 'terse' | 'careful' | 'none';
export type SitTier = 'low' | 'mid' | 'high';
export type SitRel = Relation | 'none';
export type SitPut = 'landed' | 'held' | 'refused' | 'admitted' | 'cracked' | 'none';
export type SitPos = 'first' | 'middle' | 'last';

export interface SitKey {
  slot: SitSlot;
  page: SitPage;
  place: string;
  manner: SitManner;
  tier: SitTier;
  before: SitRel;
  after: SitRel;
  put: SitPut;
  position: SitPos;
}

/** The key's fields, in the order its string spells them. */
export const KEY_FIELDS: readonly (keyof SitKey)[] = ['slot', 'page', 'place', 'manner', 'tier', 'before', 'after', 'put', 'position'];

/**
 * docs/51 §1: the fields let go of, in order, when no card fits. The place kind is let go only as
 * far as its family (a bar for a club, a flat for a rooming house): a card written for a theater's
 * seats doesn't go in a kitchen. The slot, the page kind, the place's family and the put are the
 * floor.
 */
export const DROPS: readonly (keyof SitKey)[] = ['position', 'after', 'tier', 'manner', 'place', 'before'];

/** Place kinds that can stand in for each other, once the place kind is let go. */
const PLACE_FAMILY: Record<string, string> = { bar: 'drink', club: 'drink', rooming: 'lodging', flat: 'lodging', rooms: 'lodging', home: 'lodging', work: 'work', shift: 'work' };

export function keyString(k: SitKey): string {
  return KEY_FIELDS.map((f) => k[f]).join('|');
}

export function parseKey(s: string): SitKey {
  const v = s.split('|');
  const k = Object.fromEntries(KEY_FIELDS.map((f, i) => [f, v[i] ?? ''])) as unknown as SitKey;
  return k;
}

/**
 * Fields a slot never lets go of, because they say what the gap is for: the office's question
 * before the clock is "when", before the pointer "who"; a gloss after a story that held isn't one
 * after a story that broke.
 */
const KEEP: Record<string, readonly (keyof SitKey)[]> = { 'ask|office': ['after'], gloss: ['before'] };

/** The key with the first `level` of `DROPS` let go ("*"; the place kind to its family). */
export function project(k: SitKey, level: number): string {
  const keep = [...(KEEP[`${k.slot}|${k.page}`] ?? []), ...(KEEP[k.slot] ?? [])];
  const dropped = new Set(DROPS.slice(0, level).filter((f) => !keep.includes(f)));
  return KEY_FIELDS.map((f) => (!dropped.has(f) ? k[f] : f === 'place' ? `~${PLACE_FAMILY[k.place] ?? k.place}` : '*')).join('|');
}

export function tierBand(tier: number): SitTier {
  return tier <= 1 ? 'low' : tier <= 3 ? 'mid' : 'high';
}

/** A card of the situated deck. */
export interface SitCard {
  id: string;
  key: string;
  text: string;
  /**
   * Where it may go: `quote-before` (the unit before is speech), `woman` or `man` (the person
   * the page is about), `leaving` (the detective leaves where he is after this page: the office),
   * the night's weather (`rain`, `fog`, `cold`, `clear`) for a card that says it, and the case
   * (`murder`, `lost-pet`, `lost-item`) for one that only fits a dead man, a dog or a thing.
   */
  requires?: string[];
  /** Where it may not: the same words. `forbids: leaving` is a card that has him staying put. */
  forbids?: string[];
  joke?: boolean;
  /** The gap it was written for: `world/seed/tier/type/route#page.unit`. */
  source?: string;
}

let DECK: SitCard[] = deckJson as SitCard[];
let INDEX: Map<string, SitCard[]>[] | null = null;

export function situatedDeck(): readonly SitCard[] {
  return DECK;
}

/** Deal from another deck (the tools and the tests); `null` puts the shipped one back. */
export function useDeck(cards: SitCard[] | null): void {
  DECK = cards ?? (deckJson as SitCard[]);
  INDEX = null;
}

function index(): Map<string, SitCard[]>[] {
  if (INDEX) return INDEX;
  const out: Map<string, SitCard[]>[] = [];
  const keys = DECK.map((c) => parseKey(c.key));
  for (let level = 0; level <= DROPS.length; level++) {
    const m = new Map<string, SitCard[]>();
    DECK.forEach((c, i) => {
      const k = project(keys[i] as SitKey, level);
      const xs = m.get(k);
      if (xs) xs.push(c);
      else m.set(k, [c]);
    });
    out.push(m);
  }
  INDEX = out;
  return out;
}

/** What the planner needs from the page to key and deal its gaps (`pages.ts` builds it in `lay`). */
export interface SituCtx {
  page: SitPage;
  /** The page's place kind, or `office`. A walk is `street` whatever the page. */
  place: string;
  tier: number;
  put: SitPut;
  /** The manner of somebody the page may stage, ask or watch react; undefined for nobody. */
  manner: (p: string) => SitManner | undefined;
  /** Whom the page is about (the account's, the list's, the put's person), for the tokens. */
  subject?: string;
  /** The detective leaves where he is after this page. */
  leaving: boolean;
  /** No joke told on the page yet: one situated joke may go on its close. */
  jokeFree: boolean;
  /** Seeds the deal: the night's seed, the tier, the page. */
  seed: readonly [number, number, number];
  used: (id: string) => boolean;
  note: (id: string) => void;
  swap: (prev: string, next: string) => void;
  /** The place's short name, for `{place}`. */
  placeName?: string;
  /** The night's weather: a card that says it's raining requires `rain`. */
  weather?: string;
}

/** What a filled card is filled with, for one gap. */
export interface Tokens {
  they?: string;
  them?: string;
  their?: string;
  role?: string;
  place?: string;
  thing?: string;
  means?: string;
  female?: boolean;
}

const TOKEN = /\{(they|them|their|role|place|thing|means)\}/gi;

/** Fill a card's tokens; null when one has nothing to go in it. */
export function fillCard(text: string, t: Tokens): string | null {
  const slots: Record<string, string | undefined> = { they: t.they, them: t.them, their: t.their, role: t.role, place: t.place, thing: t.thing, means: t.means };
  const lower = text.replace(TOKEN, (m) => m.toLowerCase());
  return fill({ text: lower }, slots);
}

/** Whether a card's requires and forbids hold where it would go. */
export function fits(c: SitCard, cond: ReadonlySet<string>): boolean {
  return (c.requires ?? []).every((r) => cond.has(r)) && !(c.forbids ?? []).some((f) => cond.has(f));
}

function seedOf(s: readonly [number, number, number], salt: number): number {
  let h = 0x811c9dc5;
  for (const x of [...s, salt]) {
    h ^= x & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= x >>> 16;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const norm = (s: string): string =>
  stripMarks(s)
    .toLowerCase()
    .replace(/[^a-z’' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function isPerson(c: BoardCase, id: string | undefined): id is string {
  const p = id ? c.people.find((x) => x.id === id) : undefined;
  return !!p && !p.object;
}

/** The tokens for a gap: its one person (or the page's), the place, the thing, the means once it's been said. */
/** Whom a gap's tokens mean: its one person, or, when it's about nobody, the page's. */
export function referentOf(it: Item, c: BoardCase, subject: string | undefined): string | undefined {
  const people = (it.about ?? []).filter((x) => isPerson(c, x));
  return people.length === 1 ? people[0] : people.length === 0 && isPerson(c, subject) ? subject : undefined;
}

function tokensFor(it: Item, ctx: PlanCtx, said: string): Tokens {
  const c = ctx.c;
  const s = ctx.situ as SituCtx;
  const who = referentOf(it, c, s.subject);
  const out: Tokens = {};
  if (who) {
    const pr = pronOf(c, who);
    const m = markPronoun(c, who);
    out.they = pr.he + m;
    out.them = pr.him + m;
    out.their = pr.his + m;
    out.female = pr.he === 'she';
    const role = roleOf(c, who);
    if (role) out.role = role + m;
  }
  if (s.placeName) out.place = s.placeName;
  if (c.type !== 'murder') out.thing = victimOf(c).short;
  const means = c.means.name.replace(/^(a|an|the) /, '');
  if (c.type === 'murder' && means && said.toLowerCase().includes(means.toLowerCase())) out.means = means;
  return out;
}

/** "The reason." + the card + "the look put on it". */
function compose(lead: string | undefined, card: string, tail: string | undefined): string {
  return [lead, card, tail].filter((x) => x && x.trim()).join(' ');
}

/**
 * docs/51: key every gap the deck may fill, and, with the deck on, deal it a situated card. In
 * place, on one section's paragraphs, after they're laid out and before the rhythm and the
 * reference (so a card can be traded for another of its key, and its pronouns are the planner's).
 */
export function situate(paras: Item[][], ctx: PlanCtx, salt = 0): void {
  const s = ctx.situ;
  if (!s) return;
  const items = paras.flat();
  const n = paras.length;
  const said = `${ctx.earlier ?? ''}\n${items.map((x) => x.text).join(' ')}`;
  let ordinal = 0;
  let jokeFree = s.jokeFree;
  paras.forEach((ps, p) => {
    for (const it of ps) {
      if (it.kind !== 'gap' || !it.sit || !(SIT_SLOTS as readonly string[]).includes(it.slot ?? '')) continue;
      const i = items.indexOf(it);
      const before = items.slice(0, i).reverse().find((x) => x.kind === 'fact');
      const after = items.slice(i + 1).find((x) => x.kind === 'fact');
      const slot = it.slot as SitSlot;
      const people = (it.about ?? []).filter((x) => isPerson(ctx.c, x));
      const who = people.length === 1 ? people[0] : undefined;
      const manner = slot === 'staging' || slot === 'ask' || slot === 'reaction' ? ((who ? s.manner(who) : undefined) ?? 'none') : 'none';
      const key: SitKey = {
        slot,
        page: s.page,
        place: slot === 'walk' ? 'street' : s.place,
        manner,
        tier: tierBand(s.tier),
        before: before ? (before.relation ?? 'new') : 'none',
        after: after ? (after.relation ?? 'new') : 'none',
        put: s.put,
        position: p === 0 ? 'first' : p === n - 1 ? 'last' : 'middle',
      };
      it.sit.key = keyString(key);
      const ref = referentOf(it, ctx.c, s.subject);
      if (ref) it.sit.who = ref;
      ordinal++;
      if (!SITUATED.on) continue;
      const prev = items[i - 1];
      const quoteBefore = !!prev && (prev.speech === true || /”\s*$/.test(stripMarks(prev.text)));
      const tokens = tokensFor(it, ctx, said);
      const cond = new Set<string>();
      if (quoteBefore) cond.add('quote-before');
      if (s.leaving) cond.add('leaving');
      if (s.weather) cond.add(s.weather);
      cond.add(ctx.c.type);
      if (tokens.female === true) cond.add('woman');
      if (tokens.female === false) cond.add('man');
      // A joke only where the page's joke was (the card it replaces), or on a page without one, its close.
      const mayJoke = it.sit.joke === true || (jokeFree && slot === 'close');
      const para = ps.map((x) => stripMarks(x.text)).join(' ');
      const others = new Set(items.filter((x) => x !== it).flatMap((x) => sentencesOf(stripMarks(x.text)).map(norm)));
      const fresh = (text: string) => sentencesOf(stripMarks(text)).every((t) => !others.has(norm(t)) && !(ctx.said && ctx.said.has(stripMarks(t))));
      const rng = new Rng(seedOf(s.seed, salt * 1000 + ordinal));
      let dealt = false;
      for (let level = 0; level <= DROPS.length && !dealt; level++) {
        const pool = index()[level]?.get(project(key, level)) ?? [];
        const ok: { c: SitCard; text: string }[] = [];
        for (const c of pool) {
          if (s.used(c.id) || !fits(c, cond)) continue;
          if (c.joke && !mayJoke) continue;
          // {place} at most once a paragraph: a place said twice already is the name bolted on (docs/47 C14).
          if (/\{place\}/i.test(c.text) && s.placeName && para.includes(s.placeName)) continue;
          const text = fillCard(c.text, tokens);
          if (text === null || !fresh(text)) continue;
          ok.push({ c, text });
        }
        if (ok.length === 0) continue;
        // The page's joke, where it was one: a situated joke if one fits here; otherwise the old card stays.
        const jokes = ok.filter((x) => x.c.joke);
        if (it.sit.joke && jokes.length === 0) continue;
        const from = it.sit.joke ? jokes : ok;
        const pick = from[rng.int(from.length)] as { c: SitCard; text: string };
        s.note(pick.c.id);
        if (pick.c.joke) jokeFree = false;
        const sit = it.sit;
        sit.card = pick.c.id;
        it.text = compose(sit.lead, pick.text, sit.tail);
        const same = from.filter((x) => x !== pick && !!x.c.joke === !!pick.c.joke);
        it.alts =
          same.length > 0
            ? () =>
                same
                  .filter((x) => !s.used(x.c.id))
                  .map((x) => ({
                    text: compose(sit.lead, x.text, sit.tail),
                    take: () => {
                      s.swap(sit.card as string, x.c.id);
                      sit.card = x.c.id;
                    },
                  }))
            : undefined;
        dealt = true;
      }
    }
  });
}
