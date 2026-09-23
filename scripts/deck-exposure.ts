/**
 * Deck exposure: where a player will notice a card coming round again.
 *
 *   npx tsx scripts/deck-exposure.ts [--seeds 50] [--people 10] [--configs d2,T0,...]
 *                                    [--json out.json] [--md out.md]
 *
 * Plays many nights through the real engine — the oracle's route, the
 * wanderer's route and the reasoning player (scripts/players.ts) — over every
 * tier and level and the untiered Beat case, and writes down every card any
 * deck dealt: which deck, which card, the key the dealer was asked for, which
 * rung of the ladder it came off, whether the words reached the page and in
 * which paragraph. Findings are written up in docs/22-deck-exposure.md.
 *
 * Read-only. Nothing in the game changes: the dealer is watched by wrapping
 * `Dealer.prototype.draw` for the length of the script, and the three decks
 * that are dealt without the dealer (portraits and portrait-pairs, rolled once
 * a run by `rollCast`; activity, hashed per person and visit by the planner;
 * story, told once a case by `storyOf`) are read back off the run state.
 *
 * Cross-run burning is simulated as a real browser would: each simulated
 * person has one localStorage (a Map), `newRun` and every `stepInput` are
 * handed `loadBurned(store)`, and `addBurned(store, crossRunOnly(...))`
 * follows them, exactly as src/ui/book.ts does. Each person plays a sequence
 * of nights, seed by seed, every config in turn.
 *
 * The key. A ladder rung is a closure, so the key it asks for is read by
 * probing it: take a card the rung accepts (or a synthetic one with every tag
 * `any`), vary one tag at a time over every value the schema and the deck
 * know, and keep the values it accepts. A rung that takes every value of a tag
 * does not constrain it; one that takes one value is `tag=value`. Where a rung
 * takes a set (the case's anchors, a role or `any`), the key a writer fills is
 * the value on the card that was dealt, so that is the key reported.
 */

import { writeFileSync } from 'node:fs';
import { generateCase } from '../src/gen/index.js';
import type { GenerateOptions } from '../src/gen/generate.js';
import type { Case, Id } from '../src/gen/types.js';
import { buildView, gameBudget, type CaseView } from '../src/game/derive.js';
import { choicesFor } from '../src/game/choices.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { fileReport, newRun, stepInput } from '../src/game/reducer.js';
import { scoreReport } from '../src/game/scoring.js';
import { storyCardIds, storyOf } from '../src/game/story.js';
import { addBurned, closingHistory, loadBurned, noteClosing, type KeyValueStore } from '../src/game/storage.js';
import { activityRole } from '../src/game/scene/plan.js';
import { classOf, genderHintOf } from '../src/game/voice/cast.js';
import storyJson from '../content/decks/story.json';
import {
  settleReads,
  DECKS,
  DECK_NAMES,
  Dealer,
  SCHEMA,
  burnTier,
  crossRunOnly,
  deckOf,
  fill,
  slotsOf,
  motifsOf,
  tagIs,
  tagOf,
  tagSpecs,
  validateDecks,
  type Card,
  type DeckName,
  type Match,
  type Slots,
  type TagValue,
} from '../src/game/voice/cards.js';
import { scoreMotifs, type MotifContext } from '../src/game/voice/motifs.js';
import { Rng } from '../src/gen/rng.js';
import type { Page, Report, RunState } from '../src/game/types.js';
import { fileFor, fileReasoned, reasonPicker, type Picker } from './players.js';

/* ------------------------------------------------------------ arguments */

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SEEDS = Number(arg('seeds') ?? 50);
const PEOPLE = Number(arg('people') ?? 10);
const JSON_OUT = arg('json');
const MD_OUT = arg('md');

interface Config {
  label: string;
  opts: GenerateOptions;
}
const ALL_CONFIGS: Config[] = [
  { label: 'd2', opts: { difficulty: 2 } },
  { label: 'T0', opts: { tier: 0 } },
  ...[1, 2, 3, 4, 5].flatMap((tier) =>
    [1, 2, 3].map((level) => ({ label: `T${tier}L${level}`, opts: { tier, level } as GenerateOptions })),
  ),
];
const wanted = arg('configs')?.split(',');
const CONFIGS = wanted ? ALL_CONFIGS.filter((c) => wanted.includes(c.label)) : ALL_CONFIGS;

const PLAYERS = ['oracle', 'wander', 'reason'] as const;
type PlayerId = (typeof PLAYERS)[number];

/* ------------------------------------------------------------- the text */

const words = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

function shingles(ws: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < ws.length; i++) out.push(`${ws[i]} ${ws[i + 1]} ${ws[i + 2]}`);
  return out;
}

interface Para {
  flat: string;
  sh: Set<string>;
}

function parasOf(texts: string[]): Para[] {
  return texts.map((t) => {
    const ws = words(t);
    return { flat: ` ${ws.join(' ')} `, sh: new Set(shingles(ws)) };
  });
}

function pageTexts(page: Page): string[] {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose' || b.kind === 'note') out.push(b.text);
    else if (b.kind === 'presence' && b.text) out.push(b.text);
  }
  return out;
}

/** Where on the page a dealt text landed: paragraph index, or -1 when it did not. */
function locate(paras: Para[], text: string): number {
  const ws = words(text);
  if (ws.length === 0) return -1;
  if (ws.length < 4) {
    const needle = ` ${ws.join(' ')} `;
    return paras.findIndex((p) => p.flat.includes(needle));
  }
  const sh = shingles(ws);
  let best = -1;
  let bestShare = 0;
  paras.forEach((p, i) => {
    let hit = 0;
    for (const s of sh) if (p.sh.has(s)) hit++;
    const share = hit / sh.length;
    if (share > bestShare) {
      bestShare = share;
      best = i;
    }
  });
  return bestShare >= 0.6 ? best : -1;
}

/** Filled text that reads wrong whatever the card: a seam a slot made. */
const LINTS: [string, RegExp][] = [
  ['doubled article', /\b(the|a|an) (the|a|an)\b/i],
  ['a before a vowel', /\ba (?!one\b|once\b|u[bcfhjkmnrstl][aeiou]|eu)[aeiou]\w/i],
  ['an before a consonant', /\ban (?!hour|honest|heir|honou?r)[bcdfgjklmnpqrstvwxyz]\w/i],
  ['unfilled slot', /\{\w+\}/],
  ['doubled word', /\b(\w{3,}) \1\b/i],
  ['space before punctuation', / [,.;:!?]/],
  ['doubled stop', /[.!?]\s*[.]/],
  ['lower-case sentence start', /[.!?] [a-z]/],
];

/* -------------------------------------------------------- the key probe */

const UNSET = Symbol('unset');
const DECK_VALUES = new Map<string, Map<string, TagValue[]>>();

/** Every value a deck's tag can take: the schema's, and whatever its cards carry. */
function axisValues(deck: DeckName, axis: string): TagValue[] {
  let byAxis = DECK_VALUES.get(deck);
  if (!byAxis) {
    byAxis = new Map();
    DECK_VALUES.set(deck, byAxis);
  }
  const have = byAxis.get(axis);
  if (have) return have;
  const spec = tagSpecs(deck)[axis];
  const out = new Set<TagValue>();
  if (spec?.vocab) for (const v of SCHEMA.vocab[spec.vocab] ?? []) out.add(v);
  for (const v of spec?.values ?? []) out.add(v);
  for (const v of spec?.extraValues ?? []) out.add(v);
  for (const c of DECKS[deck]) {
    const v = c.tags[axis];
    if (v !== undefined && !Array.isArray(v)) out.add(v);
  }
  out.delete('any');
  const list = [...out];
  byAxis.set(axis, list);
  return list;
}

function axesOf(deck: DeckName): string[] {
  const own = Object.entries(tagSpecs(deck))
    .filter(([name, s]) => !s.list && !name.startsWith('$'))
    .map(([name]) => name);
  // Tags the ladders read straight off the card without the schema knowing them.
  const extra = new Set<string>();
  for (const c of DECKS[deck]) for (const k of Object.keys(c.tags)) if (!own.includes(k) && k !== 'motifs' && k !== 'weather') extra.add(k);
  return [...own, ...extra];
}

interface Constraint {
  axis: string;
  /** Concrete values the rung accepts. */
  accepted: TagValue[];
  rejected: TagValue[];
}

function withTag(card: Card, axis: string, value: TagValue | typeof UNSET): Card {
  const tags = { ...card.tags };
  if (value === UNSET) delete tags[axis];
  else tags[axis] = value;
  return { ...card, tags };
}

function safe(match: Match, card: Card): boolean {
  try {
    return match(card);
  } catch {
    return false;
  }
}

/** What a rung asks for, as a list of constraints; null when nothing would pass it. */
function probe(deck: DeckName, match: Match, accepted: Card[], dealt: Card | null): Constraint[] | null {
  const axes = axesOf(deck);
  let base: Card | undefined = accepted[0];
  // Nothing on the deck passes the rung: find the card it would take by
  // changing one tag of a real one — the dealt card first, since the tag that
  // has to change is the one the deck has no card for.
  const nudge = (card: Card): Card | undefined => {
    const kept = card.status === 'kept' ? card : { ...card, status: 'kept' };
    if (safe(match, kept)) return kept;
    for (const axis of axes) {
      for (const v of [...axisValues(deck, axis), 'any', UNSET] as (TagValue | typeof UNSET)[]) {
        const c = withTag(kept, axis, v);
        if (safe(match, c)) return c;
      }
    }
    return undefined;
  };
  if (!base && dealt) base = nudge(dealt);
  if (!base) {
    const anyTags: Record<string, TagValue> = {};
    for (const a of axes) anyTags[a] = 'any';
    const texts = ['', ...DECKS[deck].map((c) => c.text)];
    for (const text of texts.slice(0, 60)) {
      const synth: Card = { id: '__probe__', deck, text, tags: anyTags, status: 'kept' };
      if (safe(match, synth)) {
        base = synth;
        break;
      }
    }
  }
  if (!base) for (const c of DECKS[deck].slice(0, 80)) if ((base = nudge(c))) break;
  if (!base) return null;
  const out: Constraint[] = [];
  for (const axis of axes) {
    const values = axisValues(deck, axis);
    if (values.length === 0) continue;
    const acc: TagValue[] = [];
    const rej: TagValue[] = [];
    for (const v of values) (safe(match, withTag(base, axis, v)) ? acc : rej).push(v);
    if (rej.length === 0) continue;
    out.push({ axis, accepted: acc, rejected: rej });
  }
  return out;
}

function fmt(v: TagValue[]): string {
  return v.map(String).sort().join(',');
}

/** The key as a writer fills it: a set narrowed to the dealt card's own value. */
function keyOf(deck: DeckName, cons: Constraint[] | null, card: Card | null): string {
  if (cons === null) return '(nothing passes)';
  const parts: string[] = [];
  for (const c of cons) {
    if (c.accepted.length === 1) parts.push(`${c.axis}=${c.accepted[0]}`);
    else if (c.accepted.length === 0) parts.push(`${c.axis}=—`);
    else {
      const own = card ? tagOf(deck, card, c.axis) : undefined;
      if (own !== undefined && own !== 'any' && c.accepted.includes(own)) parts.push(`${c.axis}=${own}`);
      else if (c.accepted.length <= c.rejected.length) parts.push(`${c.axis}∈{${fmt(c.accepted)}}`);
      else parts.push(`${c.axis}≠{${fmt(c.rejected)}}`);
    }
  }
  return parts.length === 0 ? '(any)' : parts.join(' ');
}

/* -------------------------------------------------------- the recording */

type Outcome = 'fresh' | 'widened' | 'repeat' | 'stale' | 'dropped';

interface Deal {
  deck: DeckName;
  /** The pool the card came from: the rung it was dealt off, probed. */
  key: string;
  /** What the beat asked for: rung 0, probed. */
  ask: string;
  /** Cards on rung 0 that suit the night and whose slots this beat can fill. */
  pool0: number;
  /** Cards on the dealt rung that suit the night, fillable or not. */
  poolRaw: number;
  site: string;
  outcome: Outcome;
  rung: number;
  cardId: string | null;
  text: string | null;
  pool: number;
  fresh: number;
  /** Filled in once the page is read back. */
  para: number;
}

interface Ctx {
  active: boolean;
  deals: Deal[];
  pending: Map<Dealer, { deal: Deal; fn: string }>;
  outside: number;
}
const CTX: Ctx = { active: false, deals: [], pending: new Map(), outside: 0 };

function siteOf(stack: string): { site: string; fn: string } {
  const frames = stack.split('\n').slice(1).map((l) => l.trim());
  const parsed = frames.map((f) => {
    const m = /^at (?:(\S+) )?\(?(.*?):(\d+):\d+\)?$/.exec(f);
    const fn = (m?.[1] ?? '<anon>').replace(/^Dealer\./, '').replace(/^Object\./, '');
    const file = (m?.[2] ?? '').split('/').pop() ?? '';
    return { fn, file, line: m?.[3] ?? '?' };
  });
  let i = parsed.findIndex((f) => f.file !== 'cards.ts' && f.file !== 'deck-exposure.ts' && f.file !== '');
  if (i < 0) return { site: '?', fn: '?' };
  // realize.ts deals through one helper; the caller is the beat.
  if (parsed[i]?.fn === 'deal' && parsed[i + 1]) i++;
  const f = parsed[i] as { fn: string; file: string; line: string };
  return { site: `${f.fn} ${f.file}:${f.line}`, fn: `${f.file}:${f.fn}` };
}

function commitPending(dealer: Dealer): void {
  const p = CTX.pending.get(dealer);
  if (!p) return;
  CTX.pending.delete(dealer);
  CTX.deals.push(p.deal);
}

type DrawFn = (
  this: Dealer,
  deck: DeckName,
  matches: Match[],
  slots?: Slots,
  strict?: boolean,
  ctx?: MotifContext,
) => ReturnType<Dealer['draw']>;
const originalDraw = Dealer.prototype.draw as DrawFn;
const LINT_HITS = new Map<string, { lint: string; text: string; n: number }>();
/** deck|{slot} → the cards on an asked rung that wanted it and never got it. */
const STARVED = new Map<string, { cards: Set<string>; asks: number; sites: Map<string, number> }>();

(Dealer.prototype as unknown as { draw: DrawFn }).draw = function (deck, matches, slots = {}, strict = false, ctx) {
  if (!CTX.active) {
    CTX.outside++;
    return originalDraw.call(this, deck, matches, slots, strict, ctx);
  }
  const self = this as unknown as { order: string[]; readCount(id: string): number };
  const lenBefore = self.order.length;
  const pool = DECKS[deck] ?? [];
  const weatherOk = (c: Card): boolean => !ctx || scoreMotifs(motifsOf(c), c, ctx) !== -Infinity;
  const rung0 = matches[0];
  const set0 = rung0 ? pool.filter((c) => safe(rung0, c) && weatherOk(c)) : [];
  const { site, fn } = siteOf(new Error().stack ?? '');
  // A card whose slots this beat does not supply is never dealt: the dealer
  // skips it. The pool a player can be dealt from is the fillable part.
  const fillable = (cs: Card[]): number => {
    let n = 0;
    for (const c of cs) {
      if (fill(c, slots) !== null) {
        n++;
        continue;
      }
      // Which slot the beat never hands this card: the engine's side of a gap.
      for (const slot of slotsOf(c)) {
        const v = slots[slot];
        if (v !== undefined && v.length > 0) continue;
        const k = `${deck}|{${slot}}`;
        let e = STARVED.get(k);
        if (!e) STARVED.set(k, (e = { cards: new Set(), asks: 0, sites: new Map() }));
        e.cards.add(c.id);
        e.asks++;
        bump(e.sites, site);
      }
    }
    return n;
  };
  const fresh0 = set0.filter((c) => !this.burned(deck, c.id)).length;

  // A null followed at once by the same deck from the same function is a
  // chain (the transition's three tries), not a dropped beat.
  const pend = CTX.pending.get(this);
  if (pend) {
    if (pend.deal.deck === deck && pend.fn === fn) CTX.pending.delete(this);
    else commitPending(this);
  }

  const res = originalDraw.call(this, deck, matches, slots, strict, ctx);
  const card = res ? (pool.find((c) => c.id === res.cardId) ?? null) : null;
  const cons = rung0 ? probe(deck, rung0, set0, card) : null;
  const ladder: Match[] = strict ? matches : [...matches, () => true];
  const rung = card ? ladder.findIndex((m) => safe(m, card)) : -1;
  const ask = keyOf(deck, cons, card);
  // The pool the card really came from: the rung it matched.
  let key = ask;
  const pool0 = fillable(set0);
  let dealtPool = pool0;
  let poolRaw = set0.length;
  const used = rung > 0 ? ladder[rung] : undefined;
  if (used) {
    const setR = pool.filter((c) => safe(used, c) && weatherOk(c));
    dealtPool = fillable(setR);
    poolRaw = setR.length;
    key = keyOf(deck, probe(deck, used, setR, card), card);
  }
  let outcome: Outcome;
  if (!res) outcome = 'dropped';
  else if (self.order.slice(0, lenBefore).includes(res.cardId)) outcome = 'repeat';
  else if (burnTier(deck) === 'run-to-run' && self.readCount(res.cardId) > 0) outcome = 'stale';
  else if (rung > 0) outcome = 'widened';
  else outcome = 'fresh';
  const deal: Deal = {
    deck,
    key,
    ask,
    pool0,
    poolRaw,
    site,
    outcome,
    rung,
    cardId: res?.cardId ?? null,
    text: res?.text ?? null,
    pool: dealtPool,
    fresh: fresh0,
    para: -1,
  };
  if (res) {
    for (const [lint, re] of LINTS) {
      if (!re.test(res.text)) continue;
      const k = `${res.cardId}|${lint}`;
      const hit = LINT_HITS.get(k);
      if (hit) hit.n++;
      else LINT_HITS.set(k, { lint, text: res.text, n: 1 });
    }
  }
  if (!res) CTX.pending.set(this, { deal, fn });
  else CTX.deals.push(deal);
  return res;
};

function flush(): Deal[] {
  for (const d of [...CTX.pending.keys()]) commitPending(d);
  const out = CTX.deals;
  CTX.deals = [];
  return out;
}

/* ----------------------------------------------------------- the people */

class MemStore implements KeyValueStore {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

interface Person {
  id: string;
  player: PlayerId;
  store: MemStore;
  /** Card ids this person has read on a page, and the run they first read it in. */
  seen: Map<string, number>;
  runs: number;
  /** Per key: the run this person first met a card they had read in an earlier night. */
  firstStale: Map<string, number>;
  /** Per key: distinct cards read. */
  keySeen: Map<string, Set<string>>;
}

const people: Record<PlayerId, Person[]> = {
  oracle: [],
  wander: [],
  reason: [],
};
for (const p of PLAYERS)
  for (let i = 0; i < PEOPLE; i++)
    people[p].push({ id: `${p}-${i}`, player: p, store: new MemStore(), seen: new Map(), runs: 0, firstStale: new Map(), keySeen: new Map() });

/* ------------------------------------------------------------ aggregates */

interface KeyAgg {
  deck: DeckName;
  key: string;
  attempts: number;
  outcomes: Record<Outcome, number>;
  poolSum: number;
  poolRawSum: number;
  poolN: number;
  poolMin: number;
  visible: number;
  firstPara: number;
  /** Visible deals of a card already read on an earlier page this run. */
  visRepeats: number;
  /** Visible deals of a card this person read in an earlier run (and not yet this run). */
  visStale: number;
  visStaleLate: number;
  visLate: number;
  perRun: Map<number, number>;
  runsWithRepeat: Set<number>;
  cards: Map<string, number>;
  sites: Map<string, number>;
  runs: Set<number>;
  /** On an asked key: the keys the dealer actually dealt it from. */
  to: Map<string, number>;
}

interface DeckAgg {
  deck: DeckName;
  attempts: number;
  outcomes: Record<Outcome, number>;
  dealt: number;
  visible: number;
  firstPara: number;
  visRepeats: number;
  visStale: number;
  visStaleLate: number;
  visLate: number;
  perRun: Map<number, number>;
  pagesPerRun: Map<number, Set<number>>;
  runsWithRepeat: Set<number>;
  cards: Map<string, number>;
  sites: Map<string, number>;
}

const KEYS = new Map<string, KeyAgg>();
/** The same, by what the beat asked for (rung 0): fallback lives here. */
const ASKS = new Map<string, KeyAgg>();
const DECKAGG = new Map<DeckName, DeckAgg>();
const zero = (): Record<Outcome, number> => ({ fresh: 0, widened: 0, repeat: 0, stale: 0, dropped: 0 });

function deckAgg(deck: DeckName): DeckAgg {
  let a = DECKAGG.get(deck);
  if (!a) {
    a = {
      deck,
      attempts: 0,
      outcomes: zero(),
      dealt: 0,
      visible: 0,
      firstPara: 0,
      visRepeats: 0,
      visStale: 0,
      visStaleLate: 0,
      visLate: 0,
      perRun: new Map(),
      pagesPerRun: new Map(),
      runsWithRepeat: new Set(),
      cards: new Map(),
      sites: new Map(),
    };
    DECKAGG.set(deck, a);
  }
  return a;
}

function keyAgg(deck: DeckName, key: string, map = KEYS): KeyAgg {
  const k = `${deck}\u0000${key}`;
  let a = map.get(k);
  if (!a) {
    a = {
      deck,
      key,
      attempts: 0,
      outcomes: zero(),
      poolSum: 0,
      poolRawSum: 0,
      poolN: 0,
      poolMin: Infinity,
      visible: 0,
      firstPara: 0,
      visRepeats: 0,
      visStale: 0,
      visStaleLate: 0,
      visLate: 0,
      perRun: new Map(),
      runsWithRepeat: new Set(),
      cards: new Map(),
      sites: new Map(),
      runs: new Set(),
      to: new Map(),
    };
    map.set(k, a);
  }
  return a;
}

const bump = <K>(m: Map<K, number>, k: K, n = 1): void => {
  m.set(k, (m.get(k) ?? 0) + n);
};

/** A person's second ten nights: the window staleness is measured in. */
const LATE = 10;
const LATE_END = 20;

let RUN = 0;
/** Engine-side repetition the key tables do not show on their own. */
const EXTRA = {
  pairTwiceNights: 0,
  activityAgain: 0,
  activityAgainNights: 0,
  /** A person's recall action on two pages of one visit (docs/25 keeps it to one). */
  recallTwiceVisit: 0,
  recallTwiceVisitNights: 0,
  recallVisits: 0,
};
/** Nights played inside the stale window, over every person. */
let LATE_RUNS = 0;
const RUN_CONFIG: string[] = [];
const RUN_PAGES: number[] = [];

/**
 * One deal, read back against the page and the person. `page` is the page's
 * index in the run; -1 for the closing page and the story.
 */
function account(person: Person, deal: Deal, page: number, runSeen: Map<string, number>, runIndex: number): void {
  const d = deckAgg(deal.deck);
  const k = keyAgg(deal.deck, deal.key);
  const a = keyAgg(deal.deck, deal.ask, ASKS);
  d.attempts++;
  k.attempts++;
  a.attempts++;
  d.outcomes[deal.outcome]++;
  k.outcomes[deal.outcome]++;
  a.outcomes[deal.outcome]++;
  a.runs.add(RUN);
  bump(a.sites, deal.site);
  if (deal.cardId) bump(a.to, deal.key);
  if (deal.pool0 >= 0) {
    a.poolSum += deal.pool0;
    a.poolN++;
    a.poolMin = Math.min(a.poolMin, deal.pool0);
  }
  if (deal.pool >= 0) {
    k.poolSum += deal.pool;
    k.poolRawSum += deal.poolRaw;
    k.poolN++;
    k.poolMin = Math.min(k.poolMin, deal.pool);
  }
  k.runs.add(RUN);
  bump(d.sites, deal.site);
  bump(k.sites, deal.site);
  if (!deal.cardId) return;
  d.dealt++;
  if (deal.para < 0) return;
  d.visible++;
  k.visible++;
  bump(d.cards, deal.cardId);
  bump(k.cards, deal.cardId);
  bump(d.perRun, RUN);
  bump(k.perRun, RUN);
  if (page >= 0) {
    let pages = d.pagesPerRun.get(RUN);
    if (!pages) d.pagesPerRun.set(RUN, (pages = new Set()));
    pages.add(page);
  }
  if (deal.para === 0) {
    d.firstPara++;
    k.firstPara++;
  }
  const late = runIndex >= LATE && runIndex < LATE_END;
  if (late) {
    d.visLate++;
    k.visLate++;
  }
  if (runSeen.has(deal.cardId)) {
    d.visRepeats++;
    k.visRepeats++;
    d.runsWithRepeat.add(RUN);
    k.runsWithRepeat.add(RUN);
  } else {
    const before = person.seen.get(deal.cardId);
    if (before !== undefined && before < runIndex) {
      d.visStale++;
      k.visStale++;
      if (late) {
        d.visStaleLate++;
        k.visStaleLate++;
      }
      const fk = `${deal.deck}\u0000${deal.key}`;
      if (!person.firstStale.has(fk)) person.firstStale.set(fk, runIndex + 1);
      const dk = `${deal.deck}\u0000*`;
      if (!person.firstStale.has(dk)) person.firstStale.set(dk, runIndex + 1);
    }
  }
  runSeen.set(deal.cardId, (runSeen.get(deal.cardId) ?? 0) + 1);
  const fk = `${deal.deck}\u0000${deal.key}`;
  let ks = person.keySeen.get(fk);
  if (!ks) person.keySeen.set(fk, (ks = new Set()));
  ks.add(deal.cardId);
}

/* ------------------------------------------------------------- one night */

/** Deals the dealer never sees: the portraits rolled for the cast, the activities, the story. */
function castDeals(state: RunState, kase: Case): { deal: Deal; texts: string[] }[] {
  const out: { deal: Deal; texts: string[] }[] = [];
  for (const person of kase.people) {
    const portrait = state.cast.portraits[person.id];
    if (!portrait) continue;
    const gender = genderHintOf(person);
    for (const id of portrait.cardIds) {
      const deck = deckOf(id);
      if (deck !== 'portraits' && deck !== 'portrait-pairs') continue;
      const card = DECKS[deck].find((c) => c.id === id) as Card;
      let key: string;
      let text: string;
      if (deck === 'portraits') {
        const component = String(tagOf('portraits', card, 'component'));
        key = `component=${component} gender=${gender} class=${classOf(person)}`;
        text = (portrait as unknown as Record<string, string>)[component] ?? card.text;
      } else {
        key = `class=${classOf(person)} gender=${gender} setting=${person.isClient ? 'office' : 'anywhere'}`;
        text = portrait.pair?.text ?? card.text;
      }
      const texts = [text];
      // A pair is read whole only where the old weave describes somebody (the
      // client, at the office); the scene recalls it by its action instead.
      if (deck === 'portrait-pairs' && portrait.pair?.action) texts.push(portrait.pair.action);
      out.push({
        deal: { deck, key, ask: key, pool0: -1, poolRaw: -1, site: 'rollCast cast.ts', outcome: 'fresh', rung: 0, cardId: id, text, pool: -1, fresh: 0, para: -1 },
        texts,
      });
    }
  }
  return out;
}

interface NightResult {
  pages: number;
}

function playNight(person: Person, view: CaseView, cfg: string, seed: number): NightResult {
  const kase = view.kase;
  const runIndex = person.runs;
  person.runs++;
  if (runIndex >= LATE && runIndex < LATE_END) LATE_RUNS++;
  RUN++;
  RUN_CONFIG[RUN] = cfg;
  const store = person.store;
  const runSeen = new Map<string, number>();
  const pageParas: Para[][] = [];
  const pageVisit: number[] = [];

  const readBack = (deals: Deal[], paras: Para[], pageIdx: number): void => {
    for (const deal of deals) {
      if (deal.text) deal.para = locate(paras, deal.text);
      if (process.env.DEBUG_EXPOSURE && deal.text && deal.para < 0)
        process.stderr.write(`MISS p${pageIdx} ${deal.deck} ${deal.cardId} ${deal.site}: ${deal.text}\n  PAGE: ${paras.map((p) => p.flat.slice(0, 400)).join(' // ')}\n`);
      account(person, deal, pageIdx, runSeen, runIndex);
      if (deal.para >= 0 && deal.cardId && !person.seen.has(deal.cardId)) person.seen.set(deal.cardId, runIndex);
    }
  };

  // The route, worked out first: the oracle and the wanderer play their own
  // night to find it, and those deals are not this person's.
  const budget = gameBudget(kase);
  let commands: string[] | null = null;
  let wanderReport: Report | null = null;
  if (person.player === 'oracle') commands = playOracle(view).steps.map((s) => s.command);
  else if (person.player === 'wander') {
    const w = playWandering(view, seed);
    commands = w.steps.map((s) => s.command);
    wanderReport = w.report;
  }

  // Page one: the office.
  CTX.active = true;
  let state = newRun(view, { detectiveName: 'Dashiell', persistedBurned: loadBurned(store) });
  addBurned(store, crossRunOnly(state.burned), settleReads);
  const openDeals = flush();
  const firstPage = state.log[state.log.length - 1] as Page;
  const firstParas = parasOf(pageTexts(firstPage));
  pageParas.push(firstParas);
  pageVisit.push(0);
  readBack(openDeals, firstParas, 0);

  const castPending = castDeals(state, kase);
  // Two people handed the same pair card in one night: the roll's fallback
  // reaches for a burned card without asking whether tonight already has it.
  {
    const pairIds = castPending.filter((x) => x.deal.deck === 'portrait-pairs').map((x) => x.deal.cardId as string);
    if (new Set(pairIds).size < pairIds.length) EXTRA.pairTwiceNights++;
  }
  const doneBy = new Map<Id, Set<string>>();
  let sameAgain = false;
  let activities = new Map<Id, string>();

  const picker: Picker | null = person.player === 'reason' ? reasonPicker() : null;
  const rng = new Rng((seed * 15485863 + 3) >>> 0);
  let pageIdx = 0;
  for (let i = 0; i < 120; i++) {
    if (state.reportOpen || state.actionsUsed >= budget) break;
    let command: string | null;
    if (commands) command = commands[i] ?? null;
    else command = (picker as Picker)(state, view, rng, choicesFor(view, state))?.command ?? null;
    if (command === null) break;
    const before = state;
    const result = stepInput(state, command, view, loadBurned(store));
    state = result.state;
    addBurned(store, crossRunOnly(result.page.cardsUsed), settleReads);
    const deals = flush();
    pageIdx++;
    const paras = parasOf(pageTexts(result.page));
    pageParas.push(paras);
    pageVisit.push(state.scene?.visit ?? 0);
    // The activity a person is doing, chosen by the planner off the seed.
    const now = new Map<Id, string>();
    const acts = state.scene?.activities ?? {};
    for (const [pid, act] of Object.entries(acts)) {
      const sig = `${act.visit}|${act.placeId}|${act.cardId}`;
      now.set(pid, sig);
      if (!act.cardId || activities.get(pid) === sig) continue;
      const who = view.personById.get(pid);
      const card = DECKS.activity.find((c) => c.id === act.cardId);
      if (!who || !card) continue;
      let mine = doneBy.get(pid);
      if (!mine) doneBy.set(pid, (mine = new Set()));
      if (mine.has(act.cardId)) {
        EXTRA.activityAgain++;
        sameAgain = true;
      }
      mine.add(act.cardId);
      const kind = view.placeById.get(act.placeId)?.kind ?? 'semi';
      deals.push({
        deck: 'activity',
        key: `role=${activityRole(who)} placeKind=${kind}`,
        ask: `role=${activityRole(who)} placeKind=${kind}`,
        pool0: -1,
        poolRaw: -1,
        site: 'chooseActivity plan.ts',
        outcome: 'fresh',
        rung: 0,
        cardId: act.cardId,
        text: act.text,
        pool: -1,
        fresh: 0,
        para: -1,
      });
    }
    activities = now;
    readBack(deals, paras, pageIdx);
    const costed = state.actionsUsed > before.actionsUsed || state.waived > before.waived;
    if (!costed && result.page.found.length === 0 && i > 60) break;
  }
  RUN_PAGES[RUN] = pageIdx + 1;
  if (sameAgain) EXTRA.activityAgainNights++;

  // The portraits: read wherever they reached a page this night.
  let recallTwiceTonight = false;
  for (const { deal, texts } of castPending) {
    let found = -1;
    const recalls: number[] = [];
    pageParas.forEach((paras, pi) => {
      if (found < 0) {
        for (const t of texts) {
          const at = locate(paras, t);
          if (at >= 0) {
            found = at;
            break;
          }
        }
      }
      if (texts[1] !== undefined && locate(paras, texts[1]) >= 0) recalls.push(pi);
    });
    deal.para = found;
    account(person, deal, -1, runSeen, runIndex);
    if (found >= 0 && deal.cardId && !person.seen.has(deal.cardId)) person.seen.set(deal.cardId, runIndex);
    // The recall action, page by page: the callback said again on every visit.
    const recallSeen = new Map<string, number>();
    for (const pi of recalls) {
      const again: Deal = { ...deal, key: 'recall action (callback, every visit)', site: 'presenceLine realize.ts', para: 1, text: texts[1] ?? null };
      account(person, again, pi, recallSeen, runIndex);
    }
    // Once a visit is the rule: count the visits that said it on two pages.
    const byVisit = new Map<number, number>();
    for (const pi of recalls) {
      const visit = pageVisit[pi] ?? pi;
      byVisit.set(visit, (byVisit.get(visit) ?? 0) + 1);
    }
    EXTRA.recallVisits += byVisit.size;
    for (const n of byVisit.values()) {
      if (n < 2) continue;
      EXTRA.recallTwiceVisit++;
      recallTwiceTonight = true;
    }
  }
  if (recallTwiceTonight) EXTRA.recallTwiceVisitNights++;

  // The report, and the closing page's last line.
  const report =
    person.player === 'reason' ? fileReasoned(view, state) : person.player === 'wander' ? (wanderReport ?? fileFor(view, state)) : fileReasoned(view, state);
  const filed = fileReport(state, report);
  // The closing page and the story, dealt against the history as it stood
  // before this case's closing was read, and counted once, as the book does.
  const closingKey = `${RUN}`;
  const history = closingHistory(store, closingKey);
  const verdict = scoreReport(view, filed, report, history);
  const story = storyOf(kase, history);
  noteClosing(store, closingKey, [...crossRunOnly(verdict.cardsUsed ?? []), ...storyCardIds(story)], settleReads);
  const closing = flush();
  for (const d of closing) {
    d.para = d.text ? 99 : -1;
    d.site = 'closing page scoring.ts';
    account(person, d, -1, runSeen, runIndex);
    if (d.cardId && !person.seen.has(d.cardId)) person.seen.set(d.cardId, runIndex);
  }
  CTX.active = false;

  // The story, told once a case (the closing page's second button).
  story.paragraphs.forEach((para, pi) =>
    para.forEach((line) => {
      const deal: Deal = {
        deck: 'story' as DeckName,
        key: `beat=${line.beat}`,
        ask: `beat=${line.beat}`,
        pool0: -1,
        poolRaw: -1,
        site: 'tellStory story.ts',
        outcome: 'fresh',
        rung: 0,
        cardId: line.cardId,
        text: line.text,
        pool: -1,
        fresh: 0,
        para: 100 + pi,
      };
      account(person, deal, -1, runSeen, runIndex);
      if (!person.seen.has(line.cardId)) person.seen.set(line.cardId, runIndex);
    }),
  );
  return { pages: pageIdx + 1 };
}

/* ---------------------------------------------------------------- the run */

const t0 = Date.now();
const caseFacts: { cfg: string; places: { kind: string; watcher: string; empty: boolean }[] }[] = [];
for (let n = 1; n <= SEEDS; n++) {
  for (const [ci, cfg] of CONFIGS.entries()) {
    // A seed of its own for every config: the night's weather, the
    // detective's circumstance and much of the voice roll off the seed alone,
    // so seed 7 at every tier would hand one person seventeen nights with the
    // same sky, and a real player's seeds are all different.
    const seed = ALL_CONFIGS.findIndex((c) => c.label === cfg.label) * 1000 + n;
    let kase: Case;
    try {
      kase = generateCase(seed, cfg.opts);
    } catch (e) {
      process.stderr.write(`${cfg.label} seed ${seed}: ${(e as Error).message}\n`);
      continue;
    }
    const view = buildView(kase);
    caseFacts.push({
      cfg: cfg.label,
      places: kase.places.map((p) => ({
        kind: p.kind,
        watcher: p.watcher ?? 'none',
        empty: (view.peopleAt.get(p.id) ?? []).length === 0,
      })),
    });
    for (const player of PLAYERS) {
      const person = people[player][(n - 1 + ci) % PEOPLE] as Person;
      try {
        playNight(person, view, cfg.label, seed);
      } catch (e) {
        CTX.active = false;
        flush();
        process.stderr.write(`${cfg.label} seed ${seed} ${player}: ${(e as Error).stack}\n`);
      }
    }
  }
  if (n % 5 === 0) process.stderr.write(`seed ${n}/${SEEDS} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
}


/* ------------------------------------------------------------- reporting */

const RUNS = RUN;
const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const quant = (xs: number[], q: number): number => {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] as number;
};
const perRunAll = (m: Map<number, number>): number[] => {
  const out: number[] = [];
  for (let r = 1; r <= RUNS; r++) out.push(m.get(r) ?? 0);
  return out;
};
const pct = (x: number): string => (Number.isFinite(x) ? `${(x * 100).toFixed(x < 0.1 && x > 0 ? 1 : 0)}%` : '—');
const num = (x: number, d = 1): string => (Number.isFinite(x) ? x.toFixed(d) : '—');

const STORY_COUNT = (storyJson as { status: string }[]).filter((c) => c.status !== 'cut').length;
const deckCards = (deck: DeckName): number => (deck === ('story' as DeckName) ? STORY_COUNT : DECKS[deck].length);
const burnOf = (deck: DeckName): string => SCHEMA.decks[deck]?.burn ?? 'free';
const RECALL = 'recall action (callback, every visit)';
const allPeople = Object.values(people).flat();

/** Nights one person plays. */
const personRuns = PEOPLE > 0 ? Math.round((SEEDS / PEOPLE) * CONFIGS.length) : 0;

/** The night a person first reads, from this key (or deck), a card they read on an earlier night: the median person. */
function firstStaleOf(fk: string, met: (p: Person) => boolean): { median: number | null; share: number } {
  const who = allPeople.filter(met);
  const nights = who.map((p) => p.firstStale.get(fk)).filter((n): n is number => n !== undefined);
  if (who.length === 0) return { median: null, share: 0 };
  // Everybody who never met a stale card ran out of nights first: they count as later than any.
  const all = [...nights, ...Array<number>(who.length - nights.length).fill(Infinity)];
  return { median: quant(all, 0.5), share: nights.length / who.length };
}
const nightStr = (n: number | null): string => (n === null ? '—' : Number.isFinite(n) ? String(n) : `>${personRuns}`);

/**
 * Where a line sits. The closing page and the story are read once, at the
 * end, after the verdict: a repeat there counts a quarter of one in the body
 * of the night.
 */
const placeWeight = (sites: Map<string, number>): number => {
  const [top] = [...sites.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  return /closing page|tellStory/.test(top) ? 0.25 : 1;
};

interface KeyRow {
  deck: DeckName;
  key: string;
  burn: string;
  pool: number;
  /** Cards on the rung this beat cannot fill: dead to it. */
  starved: number;
  distinct: number;
  visible: number;
  meanRun: number;
  p90: number;
  p95: number;
  repeatRuns: number;
  repeatDeals: number;
  staleLate: number;
  staleLatePerNight: number;
  firstPara: number;
  dealerRepeat: number;
  exhaustRuns: number;
  firstStale: number | null;
  score: number;
  weight: number;
  sites: string;
  addWithin: number;
  addCross: number;
  topCard: { id: string; n: number; ratio: number } | null;
}

/** Cards in a deck that carry every `tag=value` of a key (a card's `any` counts). */
function poolFromKey(deck: DeckName, key: string): number {
  if (deck === ('story' as DeckName)) {
    const beat = /beat=(\S+)/.exec(key)?.[1];
    return (storyJson as { tags: Record<string, unknown>; status: string }[]).filter(
      (c) => c.status !== 'cut' && c.tags.beat === beat,
    ).length;
  }
  if (key === RECALL) return DECKS[deck].length;
  if (deck === 'activity') {
    // The planner's ladder: the person's own role first, at the place kind;
    // the role-less cards only where the role has none.
    const role = /role=(\S+)/.exec(key)?.[1];
    const kind = /placeKind=(\S+)/.exec(key)?.[1] as string;
    const own = DECKS.activity.filter((c) => tagOf('activity', c, 'role') === role && tagIs('activity', c, 'placeKind', kind)).length;
    return own > 0 ? own : DECKS.activity.filter((c) => tagOf('activity', c, 'role') === 'any' && tagOf('activity', c, 'placeKind') === kind).length;
  }
  const parts = key
    .split(' ')
    .map((p) => /^(\w+)=(.+)$/.exec(p))
    .filter((m): m is RegExpExecArray => m !== null);
  return DECKS[deck].filter((c) =>
    parts.every(([, axis, v]) => {
      const have = tagOf(deck, c, axis as string);
      return have === 'any' || String(have) === v;
    }),
  ).length;
}

function keyRows(): KeyRow[] {
  const rows: KeyRow[] = [];
  for (const k of KEYS.values()) {
    if (k.visible === 0 && k.outcomes.dropped === k.attempts) continue;
    const per = perRunAll(k.perRun);
    const meanRun = mean(per);
    const pool = k.poolN > 0 ? k.poolSum / k.poolN : poolFromKey(k.deck, k.key);
    const fk = `${k.deck}\u0000${k.key}`;
    const firstStale = firstStaleOf(fk, (p) => p.keySeen.has(fk)).median;
    const p95 = quant(per, 0.95);
    const firstPara = k.visible === 0 ? 0 : k.firstPara / k.visible;
    const staleLatePerNight = LATE_RUNS === 0 ? 0 : k.visStaleLate / LATE_RUNS;
    const weight = placeWeight(k.sites);
    // Player-visible repetition, per night: a repeat inside a night counts in
    // full; a card the person read on an earlier night, counted over their
    // second ten nights, a third (the reader has slept since). A line that
    // opens its page counts double; the closing page and the story a quarter.
    const score = (k.visRepeats / RUNS + staleLatePerNight / 3) * (1 + firstPara) * weight;
    // Targets. Inside a night the dealer does not repeat a card while the key
    // has one unread (burned decks by rule, free decks because it sorts unread
    // first), so the key wants as many cards as the 95th-centile night reads,
    // with a fifth again for `any` cards a sibling key spends first and cards
    // the hour or slot filters refuse. Across nights: ten nights' reading.
    // A key read at most once a night cannot repeat inside one, whatever it holds.
    const needWithin = p95 <= 1 ? p95 : Math.ceil(p95 * 1.2);
    const needCross = Math.ceil(10 * meanRun);
    let top: KeyRow['topCard'] = null;
    if (k.visible >= 30 && k.cards.size > 1) {
      const n = Math.max(1, Math.round(pool));
      const [id, c] = [...k.cards.entries()].sort((a, b) => b[1] - a[1])[0] as [string, number];
      top = { id, n: c, ratio: c / (k.visible / n) };
    }
    rows.push({
      deck: k.deck,
      key: k.key,
      burn: burnOf(k.deck),
      pool,
      starved: k.poolN > 0 ? (k.poolRawSum - k.poolSum) / k.poolN : 0,
      distinct: k.cards.size,
      visible: k.visible,
      meanRun,
      p90: quant(per, 0.9),
      p95,
      repeatRuns: k.runsWithRepeat.size / RUNS,
      repeatDeals: k.visRepeats / RUNS,
      staleLate: k.visLate === 0 ? 0 : k.visStaleLate / k.visLate,
      staleLatePerNight,
      firstPara,
      dealerRepeat: k.attempts === 0 ? 0 : k.outcomes.repeat / k.attempts,
      exhaustRuns: meanRun > 0 ? pool / meanRun : Infinity,
      firstStale,
      score,
      weight,
      sites: [...k.sites.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x).slice(0, 2).join('; '),
      addWithin: Math.max(0, needWithin - Math.floor(pool)),
      addCross: Math.max(0, needCross - Math.floor(pool)),
      topCard: top,
    });
  }
  return rows;
}

const rows = keyRows();
const out: string[] = [];
const table = (head: string[], body: string[][]): void => {
  out.push(`| ${head.join(' | ')} |`);
  out.push(`| ${head.map(() => '---').join(' | ')} |`);
  for (const r of body) out.push(`| ${r.join(' | ')} |`);
  out.push('');
};
const code = (s: string): string => `\`${s}\``;

out.push(`# Deck exposure — ${SEEDS} seeds × ${CONFIGS.length} configs × ${PLAYERS.length} players = ${RUNS} nights`);
out.push('');
out.push(
  `Configs: ${CONFIGS.map((c) => c.label).join(', ')}. ${allPeople.length} simulated people, ${personRuns} nights each, one localStorage each. Mean pages a night: ${num(mean(RUN_PAGES.filter((x) => x !== undefined)))}. Stale is measured over each person's nights 11–20 (${LATE_RUNS} nights). Draws made while the oracle and the wanderer find their routes are not counted (${CTX.outside}).`,
);
out.push('');

/* -- per deck */
out.push('## Per deck');
out.push('');
const allDecks = [...DECK_NAMES, 'story' as DeckName];
const deckSummary: Record<string, unknown>[] = [];
const deckRows: string[][] = [];
const deckScores: { deck: DeckName; score: number }[] = [];
for (const deck of allDecks) {
  const a = DECKAGG.get(deck);
  const cards = deckCards(deck);
  if (!a || a.attempts === 0) {
    deckRows.push([deck, burnOf(deck), String(cards), '0', '—', '—', '—', '—', '—', '—', '—', '—', '—', String(cards)]);
    deckSummary.push({ deck, cards, dealt: 0 });
    continue;
  }
  const per = perRunAll(a.perRun);
  const pages: number[] = [];
  for (let r = 1; r <= RUNS; r++) pages.push((a.pagesPerRun.get(r)?.size ?? 0) / (RUN_PAGES[r] ?? 1));
  const never = cards - a.cards.size;
  const asks = [...ASKS.values()].filter((x) => x.deck === deck);
  const askN = asks.reduce((n, x) => n + x.attempts, 0);
  const widened = asks.reduce((n, x) => n + x.outcomes.widened, 0);
  const dropped = asks.reduce((n, x) => n + x.outcomes.dropped, 0);
  const firstPara = a.visible === 0 ? 0 : a.firstPara / a.visible;
  const fs = firstStaleOf(`${deck}\u0000*`, (p) => [...p.keySeen.keys()].some((k) => k.startsWith(`${deck}\u0000`)));
  const staleLatePerNight = LATE_RUNS === 0 ? 0 : a.visStaleLate / LATE_RUNS;
  const weight = placeWeight(a.sites);
  const recall = deck === 'portrait-pairs' ? (KEYS.get(`${deck}\u0000${RECALL}`)?.visRepeats ?? 0) : 0;
  deckScores.push({ deck, score: ((a.visRepeats - recall) / RUNS + staleLatePerNight / 3) * (1 + firstPara) * weight });
  deckRows.push([
    deck,
    burnOf(deck),
    String(cards),
    num(mean(per)),
    String(quant(per, 0.9)),
    pct(mean(pages)),
    pct(firstPara),
    pct(a.runsWithRepeat.size / RUNS),
    pct(a.visLate === 0 ? 0 : a.visStaleLate / a.visLate),
    nightStr(fs.median),
    pct(askN === 0 ? 0 : widened / askN),
    pct(askN === 0 ? 0 : dropped / askN),
    pct(a.dealt === 0 ? 0 : a.visible / a.dealt),
    String(never),
  ]);
  deckSummary.push({
    deck,
    cards,
    meanRun: mean(per),
    p90: quant(per, 0.9),
    pagesShare: mean(pages),
    firstPara,
    repeatRuns: a.runsWithRepeat.size / RUNS,
    staleLate: a.visLate === 0 ? 0 : a.visStaleLate / a.visLate,
    firstStale: fs.median,
    widened: askN === 0 ? 0 : widened / askN,
    dropped: askN === 0 ? 0 : dropped / askN,
    reached: a.dealt === 0 ? 0 : a.visible / a.dealt,
    never,
    sites: [...a.sites.entries()].sort((x, y) => y[1] - x[1]),
  });
}
table(
  ['deck', 'burn', 'cards', 'read / night', 'p90', 'share of pages', 'opens its page', 'nights with a repeat', 'stale (nights 11–20)', 'first stale night', 'widened', 'dropped', 'dealt that reached the page', 'never read'],
  deckRows,
);
out.push("`opens its page` is the share of reads that land in the page's first paragraph. `nights with a repeat`: the same card read twice in one night. `stale`: reads of a card the person read on an earlier night, over their nights 11–20. `first stale night`: the median person's first such read. `widened`/`dropped`: asks the dealer answered off a wider rung, or not at all.");
out.push('');

/* -- ranking */
const ranked = rows.filter((r) => r.score > 0 && r.key !== RECALL).sort((a, b) => b.score - a.score);
out.push('## Ranking: player-visible repetition');
out.push('');
out.push("Score per night = (same-night repeats + ⅓ × stale reads a night over nights 11–20) × (1 + share that opens a page) × (¼ on the closing page and the story, else 1). The portrait-pair recall action — a person's callback, said again on every visit by design — is left out and reported below.");
out.push('');
out.push('### By deck');
out.push('');
table(
  ['#', 'deck', 'score'],
  deckScores
    .sort((a, b) => b.score - a.score)
    .filter((d) => d.score > 0)
    .map((d, i) => [String(i + 1), d.deck, num(d.score, 2)]),
);
out.push('### By key');
out.push('');
table(
  ['#', 'deck', 'key', 'burn', 'cards', 'read / night', 'p95', 'nights with a repeat', 'repeats / night', 'stale (11–20)', 'first stale night', 'opens page', 'score'],
  ranked.slice(0, 60).map((r, i) => [
    String(i + 1),
    r.deck,
    code(r.key),
    r.burn,
    num(r.pool, 0),
    num(r.meanRun, 2),
    String(r.p95),
    pct(r.repeatRuns),
    num(r.repeatDeals, 2),
    pct(r.staleLate),
    nightStr(r.firstStale),
    pct(r.firstPara),
    num(r.score, 3),
  ]),
);
const recallRow = rows.find((r) => r.key === RECALL);
if (recallRow) {
  out.push(
    `Recall actions: ${num(recallRow.meanRun, 2)} a night; ${pct(recallRow.repeatRuns)} of nights say one person's action twice or more (${num(recallRow.repeatDeals, 2)} repeats a night).`,
  );
  out.push('');
}

out.push(
  `Two people given the same portrait-pair card in one night: ${pct(EXTRA.pairTwiceNights / RUNS)} of nights. One person doing the same activity card on two visits in one night: ${pct(EXTRA.activityAgainNights / RUNS)} of nights (${num(EXTRA.activityAgain / RUNS, 2)} a night). A recall action said on two pages of one visit: ${num(EXTRA.recallTwiceVisit, 0)} of ${num(EXTRA.recallVisits, 0)} visits that had one, in ${pct(EXTRA.recallTwiceVisitNights / RUNS)} of nights.`,
);
out.push('');

/* -- per key */
out.push('## Per key');
out.push('');
out.push("The key is the rung the card was dealt from, probed; `cards` is how many cards that rung holds that suit the night's weather and whose slots the beat fills, averaged over the deals; `+ unfillable` is how many more the rung holds that ask for a slot the beat never supplies, so the dealer skips them. `nights to read all` is cards ÷ reads a night. `dealer repeat` is the dealer reaching back inside the night because the rung was spent. `add` columns are the targets (see below).");
out.push('');
for (const deck of allDecks) {
  const rs = rows.filter((r) => r.deck === deck).sort((a, b) => b.meanRun - a.meanRun);
  if (rs.length === 0) continue;
  out.push(`### ${deck} (${burnOf(deck)}, ${deckCards(deck)} cards)`);
  out.push('');
  const shown = rs.filter((r) => r.meanRun >= 0.02).slice(0, 40);
  table(
    ['key', 'cards', '+ unfillable', 'read / night', 'p90', 'p95', 'nights with a repeat', 'stale (11–20)', 'nights to read all', 'first stale night', 'dealer repeat', 'opens page', 'add (night)', 'add (10 nights)'],
    shown.map((r) => [
      code(r.key),
      num(r.pool, 0),
      r.starved >= 0.5 ? num(r.starved, 0) : '',
      num(r.meanRun, 2),
      String(r.p90),
      String(r.p95),
      pct(r.repeatRuns),
      pct(r.staleLate),
      Number.isFinite(r.exhaustRuns) ? num(r.exhaustRuns, 1) : '∞',
      nightStr(r.firstStale),
      pct(r.dealerRepeat),
      pct(r.firstPara),
      String(r.addWithin),
      String(r.addCross),
    ]),
  );
  if (rs.length > shown.length) out.push(`(${rs.length - shown.length} more keys, each read under ${num(shown[shown.length - 1]?.meanRun ?? 0.02, 2)} times a night.)\n`);
}

/* -- fallback by what was asked */
out.push('## Fallback: what the beat asked for, and what it got');
out.push('');
out.push('By asked key (rung 0). Only asks made at least once in twenty nights with a fallback of 10% or more. Some ladders widen by design — a band-specific rung before the `any` band, a card that names the motive before one that does not — the rest are thin keys.');
out.push('');
const askRows = [...ASKS.values()]
  .map((a) => ({
    a,
    perNight: a.attempts / RUNS,
    widened: a.attempts === 0 ? 0 : a.outcomes.widened / a.attempts,
    dropped: a.attempts === 0 ? 0 : a.outcomes.dropped / a.attempts,
    pool0: a.poolN > 0 ? a.poolSum / a.poolN : -1,
  }))
  .filter((x) => x.perNight >= 0.05 && x.widened + x.dropped >= 0.1)
  .sort((x, y) => y.perNight * (y.widened + y.dropped) - x.perNight * (x.widened + x.dropped));
table(
  ['deck', 'asked', 'rung-0 cards', 'asks / night', 'widened', 'dropped', 'mostly dealt from'],
  askRows.slice(0, 50).map((x) => [
    x.a.deck,
    code(x.a.key),
    x.pool0 < 0 ? '—' : num(x.pool0, 1),
    num(x.perNight, 2),
    pct(x.widened),
    pct(x.dropped),
    code([...x.a.to.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? '—'),
  ]),
);

/* -- targets, by writing batch */
const BATCHES: [string, string[]][] = [
  ['A. reasoning voice', ['thought', 'bridge', 'carry', 'answer', 'decide', 'confront']],
  ['B. places', ['establish', 'place-ambient', 'search-act', 'return', 'watch', 'crowd', 'activity']],
  ['C. people and dialogue', ['utterances', 'witness', 'portraits', 'portrait-pairs', 'business', 'entrances', 'hiring', 'office', 'frames']],
  ['D. clock, texture, endings', ['hours', 'transitions', 'arrivals', 'ambient', 'asides', 'similes', 'endings', 'errand', 'story', 'places', 'find', 'dashiell-lines']],
  // M10's testimony decks, written after docs/22 drew up the batches.
  ['E. testimony (M10)', ['telling', 'grounding', 'followup', 'tail', 'note']],
];
out.push('## Targets by writing batch');
out.push('');
out.push('`night` = cards the key needs so that fewer than one night in twenty runs it dry: 1.2 × the 95th-centile night (just the 95th centile when that is one). `10 nights` = ten nights of reading before a person has read the whole key: 10 × the mean night. `add` is the larger shortfall. Keys read less than once in fifty nights are left out.');
out.push('');
const targets: Record<string, unknown>[] = [];
for (const [batch, decks] of BATCHES) {
  const rs = rows
    .filter((r) => decks.includes(r.deck) && r.meanRun >= 0.02 && r.key !== RECALL)
    .map((r) => ({ r, add: Math.max(r.addWithin, r.addCross) }))
    .filter((x) => x.add > 0)
    .sort((a, b) => b.r.score - a.r.score || b.add - a.add);
  const total = rs.reduce((n, x) => n + x.add, 0);
  const must = rs.reduce((n, x) => n + x.r.addWithin, 0);
  out.push(`### ${batch}: ${total} cards (${must} of them to stop repeats inside a night)`);
  out.push('');
  table(
    ['deck', 'key', 'cards now', '+ unfillable', 'read / night', 'p95', 'nights with a repeat', 'stale (11–20)', 'add (night)', 'add (10 nights)', 'add'],
    rs.map(({ r, add }) => [
      r.deck,
      code(r.key),
      num(r.pool, 0),
      r.starved >= 0.5 ? num(r.starved, 0) : '',
      num(r.meanRun, 2),
      String(r.p95),
      pct(r.repeatRuns),
      pct(r.staleLate),
      String(r.addWithin),
      String(r.addCross),
      String(add),
    ]),
  );
  targets.push({
    batch,
    total,
    must,
    keys: rs.map(({ r, add }) => ({
      deck: r.deck,
      key: r.key,
      now: r.pool,
      unfillable: r.starved,
      meanRun: r.meanRun,
      p95: r.p95,
      repeatRuns: r.repeatRuns,
      staleLate: r.staleLate,
      add,
      addWithin: r.addWithin,
      addCross: r.addCross,
      score: r.score,
    })),
  });
}

/* -- dealer bias */
out.push('## Dealer bias: cards read far more than their siblings');
out.push('');
out.push('Keys read at least 30 times whose most-read card got three times its fair share (reads ÷ cards on the rung) or more.');
out.push('');
const bias = rows
  .filter((r) => r.topCard !== null && (r.topCard as NonNullable<KeyRow['topCard']>).ratio >= 3 && r.key !== RECALL)
  .sort((a, b) => (b.topCard?.ratio ?? 0) - (a.topCard?.ratio ?? 0));
table(
  ['deck', 'key', 'cards', 'reads', 'top card', 'its reads', '× fair share', 'text'],
  bias.slice(0, 40).map((r) => {
    const t = r.topCard as NonNullable<KeyRow['topCard']>;
    const card =
      r.deck === ('story' as DeckName)
        ? (storyJson as { id: string; text: string }[]).find((c) => c.id === t.id)
        : DECKS[r.deck].find((c) => c.id === t.id);
    return [r.deck, code(r.key), num(r.pool, 0), String(r.visible), t.id, String(t.n), num(t.ratio, 1), (card?.text ?? '').slice(0, 90).replace(/\|/g, '/')];
  }),
);

/* -- slot starvation */
out.push('## Slots a beat never supplies');
out.push('');
out.push('Cards the ladder chose but the dealer had to skip, because the card asks for a slot the beat does not hand it. A card skipped on every ask is dead however well it is tagged: the fix is in the engine (supply the slot) or in the card (drop it).');
out.push('');
table(
  ['deck', 'slot', 'cards that want it', 'skips / night', 'where'],
  [...STARVED.entries()]
    .sort((a, b) => b[1].asks - a[1].asks)
    .filter(([, e]) => e.asks / RUNS >= 0.02)
    .map(([k, e]) => {
      const [deck, slot] = k.split('|') as [string, string];
      const ids = [...e.cards];
      return [
        deck,
        code(slot),
        `${ids.length} (${ids.slice(0, 6).join(' ')}${ids.length > 6 ? ' …' : ''})`,
        num(e.asks / RUNS, 2),
        [...e.sites.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '',
      ];
    }),
);

/* -- lints */
out.push('## Filled cards that read wrong');
out.push('');
const lints = [...LINT_HITS.entries()].sort((a, b) => b[1].n - a[1].n);
table(
  ['card', 'problem', 'times', 'as filled'],
  lints.slice(0, 60).map(([k, v]) => [k.split('|')[0] as string, v.lint, String(v.n), v.text.slice(0, 160).replace(/\|/g, '/')]),
);

/* -- validator gaps */
out.push("## The validator's empty tag combinations: reachable?");
out.push('');
const report = validateDecks();
const gapRows: string[][] = [];
const combos = new Map<string, number>();
for (const c of caseFacts) for (const p of c.places) bump(combos, `${p.kind}|${p.watcher}`);
const totalPlaces = caseFacts.reduce((n, c) => n + c.places.length, 0);
for (const r of report) {
  for (const gap of r.gaps) {
    const m = /^(.*?): (.*)$/.exec(gap);
    if (!m) continue;
    const axes = (m[1] as string).split(' × ');
    const vals = (m[2] as string).split(' × ');
    let asks = 0;
    for (const a of ASKS.values()) {
      if (a.deck !== r.deck) continue;
      if (axes.every((ax, i) => a.key.split(' ').includes(`${ax}=${vals[i]}`))) asks += a.attempts;
    }
    const world = r.deck === 'places' ? `${combos.get(`${vals[0]}|${vals[1]}`) ?? 0} of ${totalPlaces} places` : '—';
    gapRows.push([r.deck, `${m[1]}: ${m[2]}`, String(asks), world]);
  }
}
table(['deck', 'empty combination', 'asks in play', 'in the generated world'], gapRows);
out.push(
  `Every place kind × watcher the generator dealt: ${[...combos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k.replace('|', ' × ')} ${n}`)
    .join('; ')}.`,
);
out.push('');

/* -- never read */
out.push('## Cards never read');
out.push('');
for (const deck of DECK_NAMES) {
  const read = new Set(DECKAGG.get(deck)?.cards.keys() ?? []);
  const never = DECKS[deck].filter((c) => !read.has(c.id)).map((c) => c.id);
  if (never.length === 0) continue;
  out.push(`- **${deck}** ${never.length}/${DECKS[deck].length}: ${never.slice(0, 30).join(' ')}${never.length > 30 ? ' …' : ''}`);
}
out.push('');

const md = out.join('\n');
if (MD_OUT) writeFileSync(MD_OUT, md);
else process.stdout.write(md + '\n');
if (JSON_OUT) {
  writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        seeds: SEEDS,
        configs: CONFIGS.map((c) => c.label),
        runs: RUNS,
        people: allPeople.length,
        decks: deckSummary,
        keys: rows,
        asks: askRows.map((x) => ({ deck: x.a.deck, key: x.a.key, perNight: x.perNight, widened: x.widened, dropped: x.dropped, pool0: x.pool0 })),
        targets,
        extra: EXTRA,
        starved: [...STARVED.entries()].map(([k, e]) => ({ key: k, cards: [...e.cards], asks: e.asks })),
        lints: lints.map(([k, v]) => ({ card: k.split('|')[0], ...v })),
      },
      (_k, v) => (v === Infinity ? 'Infinity' : v),
      1,
    ),
  );
}
process.stderr.write(`done: ${RUNS} nights in ${Math.round((Date.now() - t0) / 1000)}s\n`);
