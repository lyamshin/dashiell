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
 * (position, after, tier band, manner, place kind, before) until a card fits.
 * The place kind is let go only as far as its family (a bar for a club), and
 * the slot, the page kind, the place's family and the put's outcome are the
 * floor: below it the old deck's card stays. No card is dealt twice a night
 * (the hand's spent list), and the night's seed, the page and the gap pick
 * among the ones that fit. The rhythm may trade the card for another of its
 * key, or of a key that keeps its place kind and what came before.
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
import { similesIn, ticsIn } from '../tics.js';
import { ARRIVAL_MOVES, ASK_SIT, FEET, WALK_ARRIVES } from '../clarity-lint.js';
import { sentencesOf } from './sentences.js';

/**
 * docs/55 1c: texture that says a story stood up, or that nothing went against it. Never dealt where
 * the page's person has a line held against them (the grid shows the collision), nor after a fact
 * that says only their own word stood for an hour ("and nobody else had said so"). The prose lint
 * (`prose-lint.ts`, rule `grid`) holds the pages to the same words.
 */
export const STOOD = /squared (?:up )?(?:neatly )?with|story squared|squares; there|checked out against|held up when I set it|That part held up|stood up, and I let it stand|no reason to doubt|been held up enough|didn’t have to choose between anybody’s word/i;
export const UNCONTRADICTED = new RegExp(`nothing to put against it|nothing against it|nothing I held (?:touched|went against) it|${STOOD.source}`, 'i');

/**
 * docs/55 2: continuity a page keeps. Once I've sat down, I don't stand on the mat with my hat in my
 * hand (until I get up); once I'm inside, I don't knock. The prose lint (`posture`, `inside`) holds
 * the pages to the same words.
 */
export const SAT = /\bI (?:took|pulled up) (?:a |the |an )?(?:[\w’]+ )?(?:chair|stool|seat)\b|\bI sat (?:down|still|on|in|at)\b|(?:^|[.!?”] +)I\b[^.]*\band sat (?:down|on|in|at)\b|(?:^|[.!?”] +)I\b[^.]*\bsat on it\b|\b[Ww]e sat down\b|\bI took the (?:[\w’]+ )?(?:chair|stool)\b/;
export const STOOD_UP = /\bI (?:got|stood) up\b|\bgot to my feet\b/;
export const STANDING = /\b(?:I|and) stood (?:on|in|at|by|with|just|there|in the|on the)\b|\bstayed on my feet\b|\bI stayed standing\b|\bon my feet in\b|\bI kept standing\b|\bI stood\.|\bstood on the mat\b|\bstanding (?:a|in|by|at|on|there)\b/;
export const KNOCKED = /\bI knocked\b|\bthe door took its time\b|\bknocked and waited\b|\bI shut (?:[\w’]+ |\{their\} )?door behind me\b/;

/** Whether text leaves me seated, from where I was: a sit makes it so, a getting up unmakes it. */
export function seatedAfter(text: string, was: boolean): boolean {
  let seated = was;
  for (const s of sentencesOf(stripMarks(text))) {
    if (STOOD_UP.test(s)) seated = false;
    else if (SAT.test(s)) seated = true;
  }
  return seated;
}

/** A fact that says somebody's word stood alone for an hour. */
export const OWN_WORD_ONLY = /nobody else had (?:said so|backed (?:that|it) up)|nobody else’s word for it|the only word I had|on nobody’s word but|nobody but (?:him|her)self had said/i;

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
  /** docs/55 6: 2 when last night dealt the card, 1 when one of the ten before did, 0 when none did. */
  seenBefore?: (id: string) => number;
  note: (id: string) => void;
  swap: (prev: string, next: string) => void;
  /** The place's short name, for `{place}`. */
  placeName?: string;
  /** The night's weather: a card that says it's raining requires `rain`. */
  weather?: string;
  /** Card text not to deal here (a theater's stage, a picture house's screen). */
  avoid?: RegExp;
  /** docs/55 1c: the page's person has a line held against them: no texture says their story stood. */
  crossed?: boolean;
  /** docs/55 2: I'm already inside this room (the page before was here): nothing knocks. */
  inside?: boolean;
  /** docs/55 2: I sat down on the page before, in this room, and haven't got up. */
  seated?: boolean;
  /** docs/59 item 4: whoever the page is about is sitting already (the arrival had them on a chair): nobody asks them to sit. */
  theySit?: boolean;
  /** docs/59 item 7: the running gags set up tonight, by their one word: no card brings them up again. */
  gags?: string[];
  /** docs/59 item 4: the arrival in this room put whoever the page is about somewhere: nobody finds them somewhere else. */
  theyPlaced?: boolean;
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
    // docs/55 8: a suspect is asked by name, not by trade ("I asked the sewing-machine operator…", Poached 5's #25).
    const suspect = c.people.find((x) => x.id === who)?.role === 'suspect';
    if (suspect) out.role = c.people.find((x) => x.id === who)?.short ?? role;
    else if (role) out.role = role + m;
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
  // docs/55 2: where I am in the room, as the page goes: seated or not.
  let seated = s.seated === true;
  // (A gap the deck fills moves the posture on once it's dealt: at the next item.)
  let lastGap: Item | null = null;
  paras.forEach((ps, p) => {
    for (const it of ps) {
      if (lastGap) {
        seated = seatedAfter(lastGap.text, seated);
        lastGap = null;
      }
      if (it.kind !== 'gap' || !it.sit || !(SIT_SLOTS as readonly string[]).includes(it.slot ?? '')) {
        seated = seatedAfter(it.text, seated);
        continue;
      }
      lastGap = it;
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
        // docs/55 1c: a fact that ends on somebody's own word alone ("…and I had nobody else’s word for it") is new, not a confirmation, whatever it opened on.
        before: before ? (OWN_WORD_ONLY.test(stripMarks(before.text)) ? 'new' : (before.relation ?? 'new')) : 'none',
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
      // Since Planner 2 the dead can be a woman: a card that says "the dead man" requires one.
      if (ctx.c.type === 'murder') cond.add(pronOf(ctx.c, ctx.c.crime.victim).he === 'she' ? 'dead-woman' : 'dead-man');
      if (tokens.female === true) cond.add('woman');
      if (tokens.female === false) cond.add('man');
      // A joke only where the page's joke was (the card it replaces), or on a page without one, its close.
      const mayJoke = it.sit.joke === true || (jokeFree && slot === 'close');
      const para = ps.map((x) => stripMarks(x.text)).join(' ');
      // docs/55 1c: nothing that says the story stood, where the grid has it broken, or the paragraph has it on one word.
      const crossed = s.crossed === true;
      const oneWord = OWN_WORD_ONLY.test(para);
      const others = new Set(items.filter((x) => x !== it).flatMap((x) => sentencesOf(stripMarks(x.text)).map(norm)));
      // (Whether the reason it follows on from names whoever the card would call by name.)
      const leadNames = !!it.sit.lead && !!tokens.role && stripMarks(it.sit.lead).includes(stripMarks(tokens.role));
      // (Whether the page has my feet off the desk already.)
      const feetSaid = items.some((x) => x !== it && FEET.test(stripMarks(x.text)));
      // (Whether the page's arrival walks in itself: "I went down to Moskowitz’s…".)
      const arrivalMoves = items.some((x) => x.slot === 'arrival' && ARRIVAL_MOVES.test(stripMarks(x.text).trim()));
      // (The simile frames the rest of the page says already.)
      const pageSimiles = items.filter((x) => x !== it).reduce((n, x) => n + similesIn(x.text), 0);
      const fresh = (text: string) => sentencesOf(stripMarks(text)).every((t) => !others.has(norm(t)) && !(ctx.said && ctx.said.has(stripMarks(t))));
      const rng = new Rng(seedOf(s.seed, salt * 1000 + ordinal));
      /** The cards that fit at a level, filled. */
      const fitting = (level: number): { c: SitCard; text: string }[] => {
        const pool = index()[level]?.get(project(key, level)) ?? [];
        const ok: { c: SitCard; text: string }[] = [];
        for (const c of pool) {
          if (s.used(c.id) || !fits(c, cond)) continue;
          if (c.joke && !mayJoke) continue;
          if (s.avoid && s.avoid.test(c.text)) continue;
          if (s.theySit && ASK_SIT.test(c.text)) continue;
          if (s.theyPlaced && /\bI found (?:\{role\}|\{them\}|her|him) (?:in|at|on|by|behind|out|up)\b/i.test(c.text)) continue;
          if (s.gags?.some((g) => new RegExp(`\\b${g}s?\\b`, 'i').test(c.text))) continue;
          // docs/59 item 8: the reason before it has named them ("Marchetti had seen Stannard…, so"): the card doesn't name them again.
          if (leadNames && /\{role\}/i.test(c.text)) continue;
          // docs/59 item 4: my feet come off the desk once a page.
          if (feetSaid && FEET.test(c.text)) continue;
          // docs/59 item 4: one arrival a visit: where the arrival walks in itself, the walk doesn't arrive too.
          if (slot === 'walk' && arrivalMoves && WALK_ARRIVES.test(c.text)) continue;
          // docs/59 item 7: no tic the night has said once, and no second simile frame on the page.
          if (ticsIn(c.text).some((id) => s.used(id)) || (pageSimiles > 0 && similesIn(c.text) > 0)) continue;
          if ((crossed && UNCONTRADICTED.test(c.text)) || (oneWord && STOOD.test(c.text))) continue;
          if ((seated && (STANDING.test(c.text) || SAT.test(c.text)) && !STOOD_UP.test(c.text)) || (s.inside && KNOCKED.test(c.text))) continue;
          // (Walking in, I don't sit down before anybody's been asked anything: that's the asking page's.)
          if (s.page === 'arrival' && SAT.test(c.text)) continue;
          // {place} at most once a paragraph: a place said twice already is the name bolted on (docs/47 C14).
          if (/\{place\}/i.test(c.text) && s.placeName && para.includes(s.placeName)) continue;
          const text = fillCard(c.text, tokens);
          if (text === null || !fresh(text)) continue;
          ok.push({ c, text });
        }
        return ok;
      };
      for (let level = 0; level <= DROPS.length; level++) {
        const ok = fitting(level);
        if (ok.length === 0) continue;
        // The page's joke, where it was one: a situated joke if one fits here; otherwise the old card stays.
        const jokes = ok.filter((x) => x.c.joke);
        if (it.sit.joke && jokes.length === 0) continue;
        const from0 = it.sit.joke ? jokes : ok;
        // docs/55 6: what the last nights dealt least, never last night's while another fits.
        const seenB = s.seenBefore;
        const least = seenB ? Math.min(...from0.map((x) => seenB(x.c.id))) : 0;
        const from = seenB ? from0.filter((x) => seenB(x.c.id) === least) : from0;
        const pick = from[rng.int(from.length)] as { c: SitCard; text: string };
        s.note(pick.c.id);
        for (const id of ticsIn(pick.text)) s.note(id);
        if (pick.c.joke) jokeFree = false;
        const sit = it.sit;
        sit.card = pick.c.id;
        it.text = compose(sit.lead, pick.text, sit.tail);
        // What the rhythm may trade it for: the cards of its own level, and of the levels below it as
        // far as the place kind and what came before (they stay), so it has cards of another length
        // to choose from (the rhythm picks among them at random).
        const seen = new Set([pick.c.id]);
        const same: { c: SitCard; text: string }[] = [];
        for (let l = level; l <= Math.max(level, DROPS.indexOf('place')); l++) {
          for (const x of l === level ? from : fitting(l)) {
            if (seen.has(x.c.id) || !!x.c.joke !== !!pick.c.joke) continue;
            seen.add(x.c.id);
            same.push(x);
          }
        }
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
        break;
      }
    }
  });
}
