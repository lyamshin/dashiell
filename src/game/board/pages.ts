/**
 * docs/43 §2 and docs/44: pages, one job each, laid out on sheets.
 *
 * - the office: the givens, in the client's mouth, one quoted line a paragraph;
 * - arriving at a place: the walk, who's here, what they're doing, why I came;
 * - "Where were you tonight?": one whole account;
 * - "Who was here tonight?": one watcher's whole list;
 * - a search: one find;
 * - put it to: their line against the line that breaks it;
 * - the turn: a recap at the first lie caught, as a chapter break;
 * - the report: the form, and where I sat to fill it in.
 *
 * Each writer fills the beats it has (`sheets.ts`): why here, the walk, the
 * arrival, the staging, the ask, the reaction, the job, the thought, the close
 * and the hand-off. The sheet lays them out. About one joke a page (the hand
 * deals one card flagged `joke`, or a callback, and then only plain ones).
 * Every fact on a page is a line the player now holds, said the way that
 * person would say it; the thought (`thought.ts`) says only what those lines
 * add up to, never a verdict.
 */

import { tidyPunctuation, type Card } from './cards.js';
import type { Block, ProseVoice } from './types.js';
import { minutesAfter } from './clock.js';
import type { Line } from './knowledge.js';
import {
  accountOf,
  candidateLines,
  collisionsOf,
  confrontationOf,
  crimeHourKnown,
  judgeLine,
  knownPeople,
  linesHeld,
  listOf,
  peopleAt,
  solveHeld,
  solveRun,
  type Judgement,
} from './knowledge.js';
import { Hand } from './decks.js';
import { spokenAccountLines, spokenListLines, type Manner, type SaidLine } from './tell.js';
import {
  OFFICE,
  andList,
  budgetCalls,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  personOf,
  placeName,
  placeOf,
  pronOf,
  solverHeld,
  suspectsOf,
  thoughtLevel,
  victimOf,
  type BoardCase,
  type BoardDeal,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { movedAt, sourceName, starPlace, starredSteps, walksOnly } from './stars.js';
import { sheetsFor, type Beat, type SheetJob } from './sheets.js';
import { placeThread, sourceOf as sourceOfQ, threadFor, type Pointer } from './thread.js';
import { breakSaid, claimSaid, eliminationOf, shortOther, thoughtOf, type Thought, type ThoughtPart } from './thought.js';
import { walkBetween } from './walk.js';
import { papersLine, whyOrder } from './motives.js';
import { SPARE_KEY } from '../../gen/board/content.js';
import { worldAccountVoice, worldDeck, worldFoundWith, worldListVoice, worldLook, worldManner, worldStaging } from './world.js';
import { PLAN, chapterUnit, markPronoun, newBudget, planSection, stripMarks, type GapSlot, type Item, type Relation, type SituCtx, type Unit } from './plan/index.js';
import type { PageBudget } from './plan/connect.js';

export { breakSaid };

/* ------------------------------------------------------------------ *
 * The writer.
 * ------------------------------------------------------------------ */

type Voice = ProseVoice;

/** docs/49: what a writer hands the microplanner, a fact or a piece of texture (`plan/types.ts`). */
type Part = Item;

export interface Writer {
  d: BoardDeal;
  c: BoardCase;
  /** The run as it stands with this page's question asked. */
  run: BoardRun;
  /** The run as it stood before this page. */
  before: BoardRun;
  hand: Hand;
  blocks: Block[];
  /** The page paid off a role set up earlier (a callback). */
  callback?: boolean;
  told: Set<string>;
  hours: Set<number>;
  people: Set<string>;
  places: Set<string>;
  /** docs/44: the beats filled so far, waiting for the sheet. */
  parts: Partial<Record<Beat, Part[]>>;
  /** The sheet the page was laid out on, and the beats it filled, in order. */
  sheet?: string;
  beats: string[];
  thought?: { text: string; refs: string[] };
  /** The hand-off's words, so the next page needn't give the reason again. */
  handoff?: string;
  /** The recap's clauses: the notebook said aloud, which has to name people. */
  recap?: string;
  /** docs/48 §4: what the arrival and staging beats said, before names were thinned, for the bible's share. */
  said: Partial<Record<Beat, string[]>>;
  /**
   * docs/47 C13: the page's reason was said on the page before (its hand-off named who or where,
   * or the arrival in this room said why), so this page doesn't say it again ("So, Moe’s.",
   * "Alfano it was.", "Mrs. Kowalski was the one I’d come for").
   */
  carried?: boolean;
  /** docs/47 B8: whoever this page's answer put in the room has been placed in a line. */
  placed?: boolean;
  /** docs/49: the skeleton, unit by unit, as the planner laid it out. */
  units: Unit[];
  /** docs/49 §2: what the page has spent of its joins (one "so" chain, one "but"). */
  budget: PageBudget;
  /** docs/49: the last running gag paid off, and the other lines that would have paid it off as well. */
  lastPay?: { id: string; others: { l: string; id: string }[] };
}

export function writer(d: BoardDeal, before: BoardRun, run: BoardRun, page: number): Writer {
  const hand = new Hand(run.seed * 7 + run.tier, page, run.spent);
  // docs/48 §3: a night from the neighbourhood deals the bible's own lines first.
  const deck = worldDeck(d, run);
  if (deck) hand.world = deck;
  return {
    d,
    c: d.kase,
    run,
    before,
    hand,
    blocks: [],
    told: new Set(),
    hours: new Set(),
    people: new Set(),
    places: new Set(),
    parts: {},
    beats: [],
    said: {},
    units: [],
    budget: newBudget(),
  };
}

function tidy(text: string): string {
  return tidyPunctuation(text.replace(/\s+/g, ' ').trim());
}

/** The gap a beat's texture fills, when the writer doesn't say (docs/49 §3). */
const SLOT: Record<Beat, GapSlot> = {
  why: 'why-here',
  walk: 'walk',
  arrival: 'arrival',
  staging: 'staging',
  ask: 'ask',
  reaction: 'reaction',
  job: 'gloss',
  thought: 'gloss',
  close: 'close',
  handoff: 'hand-off',
};

/** What the planner may know about a part: a fact's relation and what it's about, a gap's slot. */
type Meta = Partial<Omit<Item, 'beat' | 'voice' | 'text'>>;

/**
 * Fill a beat with texture (a gap, its card's text the default). Several parts in one beat are
 * several paragraphs, unless the sheet runs the beat into another, or a part runs on.
 */
function put(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator', meta: Meta = {}): void {
  if (!text) return;
  const t = tidy(text);
  if (!t) return;
  // docs/49: a card just dealt, said as dealt, can be traded for another that fitted the draw as
  // well, when the page's rhythm wants a sentence of another length.
  const last = w.hand.last;
  const alts = meta.alts ?? (last && last.text === text && meta.kind !== 'fact' ? altsOf(w, last) : undefined);
  (w.parts[beat] ??= []).push({ kind: 'gap', slot: SLOT[beat], ...meta, beat, voice, text: t, ...(alts ? { alts } : {}) });
}

/** docs/49: the other lines a hand-written aside could have been (`Hand.pick`), as the rhythm's alternatives. */
function pickAlts(w: Writer, text: string): Item['alts'] {
  const p = w.hand.picks.get(text);
  if (!PLAN.ops || !p || p.others.length === 0) return undefined;
  return () => p.others.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: stripMarks(tidy(o.l)), take: () => w.hand.swap(p.id, o.id) }));
}

/**
 * docs/49: the cards that fitted a draw as well as the one dealt (`Hand.last`, taken right after
 * the draw), as the planner's alternatives for the rhythm; `shape` is whatever the writer did to
 * the card it dealt, done to these too. Texture only, and only with the planner on.
 */
function altsOf(w: Writer, last: Hand['last'], shape: (t: string) => string = (t) => t): Item['alts'] {
  if (!PLAN.ops || !last || last.others.length === 0) return undefined;
  return () => last.others.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: tidy(shape(o.text)), take: () => w.hand.swap(last.id, o.id) }));
}

/**
 * docs/51: texture the situated deck may fill: the card just dealt from a family, as it was dealt
 * (not a bible line, a pay-off or a fallback the writer wrote). `lead` is what stays said before
 * the card: a why-here's reason.
 */
function sit(w: Writer, text: string | null | undefined, lead?: string): Pick<Item, 'sit'> {
  const last = w.hand.last;
  if (!text || !last || last.text !== text) return {};
  return { sit: { ...(lead ? { lead: tidy(lead) } : {}), joke: last.joke } };
}

/** Fill a beat with a fact: locked, with what the engine knows about it (docs/49 §3). */
function fact(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice, meta: Meta & { carries: string[] }): void {
  put(w, beat, text, voice, { relation: 'new', ...meta, kind: 'fact' });
}

/** Run a part onto the last one in the beat ("…in the doorway. Up close he was thin…"). */
function putOn(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator'): void {
  if (!text) return;
  const ps = w.parts[beat];
  const last = ps?.[ps.length - 1];
  if (last) {
    last.text = tidy(`${last.text} ${text}`);
    // A card traded for another keeps what was put on after it (the look after the staging).
    const was = last.alts;
    if (was) last.alts = () => was().map((o) => ({ ...o, text: tidy(`${o.text} ${text}`) }));
    // docs/51: and so does a situated card.
    if (last.sit) last.sit.tail = tidy(`${last.sit.tail ?? ''} ${text}`);
  } else put(w, beat, text, voice);
}

/**
 * Lay the page out on one of the job's sheets: paragraphs in the sheet's
 * order, beats that share a paragraph run together when they're short enough
 * to read as one.
 */
function lay(w: Writer, job: SheetJob): void {
  if (job !== 'arrival' && job !== 'office' && job !== 'return' && job !== 'turn') placeNewcomers(w);
  const sheets = sheetsFor(job);
  const sheet = sheets[sheets.length > 1 ? w.hand.rng.int(sheets.length) : 0];
  if (!sheet) return;
  w.sheet = w.sheet ? `${w.sheet}+${sheet.id}` : sheet.id;
  // docs/48 §4: what the arrival and the staging said, before the planner touched a name.
  for (const b of Object.keys(w.parts) as Beat[]) w.said[b] = [...(w.said[b] ?? []), ...(w.parts[b] ?? []).map((p) => stripMarks(p.text))];
  // docs/49: the microplanner lays the beats out by the sheet, and says them.
  const planned = planSection(w.parts, sheet.paras, { c: w.c, budget: w.budget, pick: (k, ls) => w.hand.pick(k, ls), level: thoughtLevel(w.c), run: w.run, said: saidTonight(w), earlier: earlierProse(w), int: (n) => w.hand.rng.int(n), situ: situOf(w, job) }, w.blocks.length);
  w.beats.push(...planned.beats);
  w.blocks.push(...planned.blocks);
  w.units.push(...planned.units);
  // The thought as the page says it, for the measure and the level lint.
  const thought = planned.units.filter((u) => u.kind === 'fact' && u.beat === 'thought' && u.voice === 'thought');
  if (PLAN.ops && w.thought && thought.length) w.thought = { ...w.thought, text: thought.map((u) => u.text).join(' ') };
  // The notebook said aloud, as the page says it: the block its clauses went into.
  const recap = planned.units.find((u) => u.kind === 'fact' && u.beat === 'job' && u.voice === 'recap');
  if (PLAN.ops && recap) {
    const b = w.blocks[recap.para];
    if (b?.kind === 'prose') w.recap = b.text;
  }
  w.parts = {};
}

/** docs/51: the page's situation, for the situated deck: what kind of page, where, whose, and how a put went. */
function situOf(w: Writer, job: SheetJob): SituCtx {
  const c = w.c;
  const fresh = w.run.asked.filter((q) => !w.before.asked.includes(q));
  const lastPut = w.run.puts.length > w.before.puts.length ? w.run.puts[w.run.puts.length - 1] : undefined;
  const q = fresh[fresh.length - 1];
  const subject = q && /^(account|list|motive|confront):/.test(q) ? (q.split(':')[1] ?? '').split('@')[0] : lastPut?.person;
  let put: SituCtx['put'] = 'none';
  if (job === 'put' && lastPut) {
    const k = confrontationOf(c, lastPut.person, lastPut.hour);
    put = !lastPut.landed ? 'held' : lastPut.again ? 'refused' : k?.response === 'admit' ? 'admitted' : k?.response === 'crack' ? 'cracked' : k?.response === 'second-lie' ? 'landed' : 'refused';
  }
  const page: SituCtx['page'] = job === 'check' ? 'admission-check' : job;
  return {
    page,
    place: w.run.at === OFFICE ? 'office' : placeKind(c, w.run.at),
    tier: c.tier,
    put,
    manner: (p) => (personOf(c, p) && !personOf(c, p)?.object ? mannerOf(c, p) : undefined),
    ...(subject ? { subject } : {}),
    leaving: job === 'office',
    jokeFree: w.hand.jokeFree,
    seed: [w.run.seed, w.run.tier, w.before.log.length],
    used: (id) => w.hand.used(id),
    note: (id) => w.hand.note(id),
    swap: (a, b) => w.hand.swap(a, b),
    placeName: w.run.at === OFFICE ? 'the office' : placeOf(c, w.run.at)?.short,
    weather: w.run.weather,
  };
}

/** The narrated sentences of six words or more said on the pages before this one (docs/44's "sentences twice"). */
function saidTonight(w: Writer): Set<string> {
  const out = new Set<string>();
  if (!PLAN.ops) return out;
  for (const pg of w.before.log) {
    for (const b of pg.blocks) {
      if (b.kind !== 'prose' || b.voice === 'answer' || b.voice === 'recap' || b.voice === 'chapter') continue;
      for (const s of b.text.replace(/“[^”]*”/g, ' ').split(/(?<!\b(?:Mrs?|Dr)\.)(?<=[.!?][”’]?)\s+/)) if (s.split(/\s+/).length >= 6) out.add(s.trim());
    }
  }
  return out;
}

/** The prose of the pages before this one. */
function earlierProse(w: Writer): string {
  if (!PLAN.ops) return '';
  return w.before.log.map((pg) => pg.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n')).join('\n');
}

/** docs/43 §2: the turn's chapter heading, a block and a unit of its own. */
function chapter(w: Writer, text: string): void {
  w.units.push(chapterUnit(text, w.blocks.length));
  w.blocks.push({ kind: 'prose', text, voice: 'chapter' });
  w.beats.push('chapter');
}

/**
 * docs/47 B8: nobody is talkable before a page has put them in the room. Somebody this page's
 * answer named who is in this room (an admission's witness, a companion on a list) is placed here,
 * in a line, on the page that names them: "Ashby, it turned out, was three rows back with her hat
 * over her eyes." Somebody whose evening ended elsewhere had come back.
 */
function placeNewcomers(w: Writer): void {
  const c = w.c;
  const here = w.run.at;
  if (here === OFFICE || w.before.at !== here || w.placed) return;
  w.placed = true;
  const was = new Set(peopleAt(c, w.before, here));
  const fresh = peopleAt(c, w.run, here).filter((p) => !was.has(p) && personOf(c, p)?.role === 'company');
  const last = c.board.hours[c.board.hours.length - 1] as Hour;
  for (const p of fresh) {
    const pr = pronOf(c, p);
    const back = c.board.rows[p]?.[last] !== undefined && c.board.rows[p]?.[last] !== here;
    const spot: Record<string, string> = {
      theatre: `three rows back with ${pr.his} hat over ${pr.his} eyes`,
      bar: 'at the far end of the bar, nursing something',
      restaurant: 'at a table by the wall, behind a menu',
      home: 'in the front room, in the good chair',
      work: 'at the far bench, keeping busy',
      back: 'in the corner, out of the light',
      office: 'by the door',
      any: 'over by the wall',
    };
    const kind = placeOf(c, here)?.kind === 'theatre' ? 'theatre' : stageKind(c, here);
    const at = spot[kind] ?? (spot.any as string);
    // Named twice on the page already (an admission says the name and says it again): "my witness".
    const who = namesFit(w, `${nameOf(c, p)}`) ? nameOf(c, p) : `my witness${markPronoun(c, p)}`;
    fact(w, 'thought', `It turned out ${who} ${back ? 'had come back in and ' : ''}was ${at}.`, 'presence', { about: [p], place: here, carries: [`here:${p}`] });
    w.people.add(p);
  }
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Slots with a capitalised twin for every key: `{name}` and `{Name}`. */
export function withCaps(slots: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...slots };
  for (const [k, v] of Object.entries(slots)) {
    const K = cap(k);
    if (K !== k && out[K] === undefined && v !== undefined) out[K] = cap(v);
  }
  return out;
}

/** A person's slots: name, pronouns, and how Dashiell addresses them ("Mr. Ashby", "Mrs. Cheatham"). */
function who(c: BoardCase, p: PersonId): Record<string, string | undefined> {
  const pr = pronOf(c, p);
  const short = nameOf(c, p);
  const female = personOf(c, p)?.female === true;
  const title = /^Mrs\.|^Mr\.|^Miss |^Dr\. /.test(short) ? short : female ? undefined : `Mr. ${short}`;
  return { name: short, he: pr.he, him: pr.him, his: pr.his, title };
}

/** docs/49: a person's pronouns as the engine writes them in a fact, marked with whom they mean (`plan/refer.ts`). */
function markedPron(c: BoardCase, p: PersonId): ReturnType<typeof pronOf> {
  const pr = pronOf(c, p);
  const m = markPronoun(c, p);
  return { ...pr, he: pr.he + m, him: pr.him + m, his: pr.his + m, He: pr.He + m, His: pr.His + m };
}

/** License what a pointer or a thought names, for the reader lint. */
function license(w: Writer, x: { hours: Hour[]; people: PersonId[]; places: PlaceId[] }): void {
  for (const h of x.hours) w.hours.add(h);
  for (const p of x.people) w.people.add(p);
  for (const p of x.places) if (p) w.places.add(p);
}

/* ------------------------------------------------------------------ *
 * Places and people, by kind.
 * ------------------------------------------------------------------ */

export type PlaceKind = 'bar' | 'club' | 'restaurant' | 'theatre' | 'rooming' | 'scene-murder' | 'scene-lost' | 'work' | 'shift' | 'unwatched' | 'flat' | 'rooms' | 'home';

export function placeKind(c: BoardCase, id: PlaceId): PlaceKind {
  const p = placeOf(c, id);
  if (!p) return 'home';
  const key = p.key ?? '';
  if (p.scene) return isMurder(c) ? 'scene-murder' : 'scene-lost';
  if (key.startsWith('rooming')) return 'rooming';
  if (key.startsWith('work')) return 'work';
  if (key.startsWith('shift')) return 'shift';
  if (key.startsWith('unwatched')) return 'unwatched';
  if (key === 'flat') return 'flat';
  if (key === 'rooms') return 'rooms';
  if (p.kind === 'bar' || p.kind === 'club' || p.kind === 'restaurant' || p.kind === 'theatre') return p.kind;
  return p.kind === 'work' ? 'work' : 'home';
}

/** The staging cards' kinds: where a person sits down to be asked. */
function stageKind(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'office';
  const k = placeKind(c, id);
  if (k === 'club') return 'bar';
  if (k === 'rooming' || k === 'flat' || k === 'rooms' || k === 'home' || k === 'scene-lost' || k === 'scene-murder') return 'home';
  if (k === 'shift') return 'work';
  if (k === 'unwatched') return 'back';
  return k;
}

/** One more kind of card a draw mustn't deal, on top of what the page already avoids. */
function alsoAvoid(base: RegExp | null, more: RegExp): RegExp {
  return base ? new RegExp(`${base.source}|${more.source}`, 'i') : more;
}

/** A theatre with a stage has no pictures: a card that says otherwise isn't dealt there. */
function stageGuard(w: Writer, place: PlaceId): void {
  w.hand.avoid = placeOf(w.c, place)?.stage ? /\bpictures?\b|\bscreen\b|\bnewsreel\b/i : null;
}

/** A watcher's job, from the case's description: "the bartender at the Velvet Room" → `bartender`. */
export function jobKey(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('bartender') || d.includes('barman') || d.includes('barkeep')) return 'bartender';
  if (d.includes('doorkeeper') || d.includes('doorman')) return 'doorkeeper';
  if (d.includes('head waiter')) return 'waiter';
  if (d.includes('change booth')) return 'booth';
  if (d.includes('cashier')) return 'cashier';
  if (d.includes('usher') || d.includes('ticket seller') || d.includes('house manager')) return 'usher';
  if (d.includes('landlady')) return 'landlady';
  if (d.includes('receptionist')) return 'desk';
  if (d.includes('pharmacist') || d.includes('pawnbroker') || d.includes('at the counter')) return 'counter';
  if (d.includes('supervisor') || d.includes('foreman') || d.includes('night editor')) return 'boss';
  if (d.includes('runs the game')) return 'game';
  if (d.includes('slips')) return 'slips';
  if (d.includes('steward')) return 'steward';
  return 'counter';
}

/** "the house manager", from "the house manager at the Thalia". */
function jobWords(desc: string): string {
  return desc.split(/,| at /)[0] ?? desc;
}

/** The old `watch` deck's fixture role for a watcher's job, when there is one. */
const WATCH_ROLE: Record<string, string> = { bartender: 'bartender', doorkeeper: 'doorman', waiter: 'counterman', cashier: 'counterman', usher: 'ticket-taker', landlady: 'landlady', counter: 'druggist' };

/** The character deck's archetype for a job, where one fits exactly (M11's look of a trade). */
const ARCHETYPE: [RegExp, string][] = [
  [/switchboard/, 'arch-switchboard'],
  [/piano teacher/, 'arch-piano-teacher'],
  [/bookmaker/, 'arch-bookmaker'],
  [/sewing-machine/, 'arch-seamstress'],
  [/cab driver/, 'arch-hackman'],
  [/typist/, 'arch-secretary'],
  [/dentist/, 'arch-dentist'],
  [/pawnbroker/, 'arch-pawnman'],
  [/copy reader/, 'arch-reporter'],
  [/bartender/, 'bartender'],
  [/landlady/, 'landlady'],
  [/usher|ticket seller/, 'ticket-taker'],
  [/doorkeeper/, 'doorman'],
  [/pharmacist/, 'druggist'],
  [/insurance agent|night-school teacher/, 'arch-bookkeeper'],
  [/milliner/, 'arch-seamstress'],
  [/takes the slips/, 'arch-runner'],
  [/runs the game/, 'arch-bouncer'],
  [/receptionist/, 'arch-secretary'],
];

function archetypeOf(desc: string): string | undefined {
  return ARCHETYPE.find(([re]) => re.test(desc))?.[1];
}

/** A first look at somebody, from the character deck, when their trade has a card. */
function lookAt(w: Writer, p: PersonId): string | null {
  const who_ = personOf(w.c, p);
  if (!who_) return null;
  const own = worldLook(w.c, w.run, w.hand, p);
  if (own !== undefined) return own;
  const arch = archetypeOf(who_.job ?? who_.description);
  if (!arch) return null;
  const pr = pronOf(w.c, p);
  const drawn = w.hand.drawOld(
    'character',
    (card: Card) => card.tags.role === arch && card.tags.kind === 'look' && !/\{place\}|\{victim\}/.test(card.text) && !w.hand.used(card.id),
    { He: pr.He, he: pr.he, his: pr.his, him: pr.him, His: pr.His, name: who_.short },
    true,
  );
  const trait = drawn?.card.exports?.trait;
  if (trait?.pay?.length) w.run.traits = { ...(w.run.traits ?? {}), [p]: { short: trait.short, pay: trait.pay } };
  return drawn?.text ?? null;
}

/**
 * Set a page up to pay somebody off: their trait, from a first look now if
 * they haven't had one, and the page's joke kept for the last word. Returns
 * the look, when there is one to say.
 */
function setUp(w: Writer, p: PersonId): string | null {
  const look = w.run.traits?.[p] ? null : lookAt(w, p);
  if (hasRole(w, p)) w.hand.hold(true);
  return look;
}

/** Something on this page could be paid off: their trait, or the place's prop. */
function hasRole(w: Writer, p?: PersonId): boolean {
  return (p !== undefined && !!w.run.traits?.[p]) || !!w.run.props?.[w.run.at];
}

/**
 * A callback: a page closes on a line that pays off a role set up earlier
 * tonight (M13's roles): the trait of the person the page is about, or failing
 * that the prop of the place it's in. One a page, each line once a night, and
 * only while the page still has its joke to tell.
 */
function payOff(w: Writer, p?: PersonId): string | null {
  w.hand.hold(false);
  if (!w.hand.jokeFree) return null;
  const roles: { key: string; pay: string[] }[] = [];
  const t = p !== undefined ? w.run.traits?.[p] : undefined;
  if (t && p !== undefined) roles.push({ key: `pay:${p}`, pay: t.pay });
  const prop = w.run.props?.[w.run.at];
  if (prop) roles.push({ key: `prop:${w.run.at}`, pay: prop.pay });
  for (const r of roles) {
    const all = r.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` }));
    // docs/47 C13: a running gag lands at most twice a night (the short-legged chair four times was three too many).
    if (all.filter((x) => w.hand.used(x.id)).length >= GAG_MAX) continue;
    const fresh = all.filter((x) => !w.hand.used(x.id));
    if (fresh.length === 0) continue;
    const x = fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string };
    w.hand.note(x.id);
    w.hand.joke();
    w.callback = true;
    w.lastPay = { id: x.id, others: fresh.filter((y) => y.id !== x.id) };
    return x.l;
  }
  return null;
}

/** docs/49: the other lines a gag could have been paid off with, as the rhythm's alternatives. */
function payAlts(w: Writer, said: string | null | undefined): Item['alts'] {
  const p = w.lastPay;
  if (!PLAN.ops || !p || !said || p.others.length === 0) return undefined;
  return () => p.others.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: tidy(o.l), take: () => w.hand.swap(p.id, o.id) }));
}

/** docs/49: a hand-written aside with the planner on, one of a few; with it off, as it always was (the first). */
function aside(w: Writer, key: string, lines: readonly string[]): string {
  return PLAN.ops ? w.hand.pick(key, lines) : (lines[0] as string);
}

/** docs/47 C13: how many times a night one running gag (a prop, a trait, the street) may be paid off. */
export const GAG_MAX = 2;

/** The page's close: a callback when there's a role to pay off, or a close card (the joke, if it's still free). */
function closeWith(w: Writer, p: PersonId | undefined, family: string, want: Record<string, string | undefined>, slots: Record<string, string | undefined>): void {
  const pay = payOff(w, p);
  if (pay) {
    // docs/49: where the pay-off would say their name a third time, a plain close of the family.
    const own = payAlts(w, pay);
    const payId = w.lastPay?.id;
    const plain = PLAN.ops && payId ? w.hand.options(family, want, slots, /\{[Nn]ame\}|\{[Hh]e\}|\{[Hh]is\}|\{[Hh]im\}/) : [];
    const alts: Item['alts'] = own || plain.length ? () => [...(own ? own() : []), ...plain.filter((o) => !w.hand.used(o.id)).map((o) => ({ text: tidy(o.text), take: () => w.hand.swap(payId as string, o.id), lastResort: true }))] : undefined;
    put(w, 'close', pay, 'thought', { alts, ...(p ? { about: [p] } : {}) });
    return;
  }
  // A name twice at most a page: a close that would say it a third time isn't dealt.
  const named = slots.name;
  const already = named ? Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0) : 0;
  const avoid = w.hand.avoid;
  if (already >= 2) w.hand.avoid = alsoAvoid(avoid, /\{[Nn]ame\}/);
  const close = w.hand.draw(family, want, slots, { widen: true, joke: true });
  put(w, 'close', close, 'thought', { ...(p ? { about: [p] } : {}), ...sit(w, close) });
  w.hand.avoid = avoid;
}

/* ------------------------------------------------------------------ *
 * The thread: why here, and what next.
 * ------------------------------------------------------------------ */

/** Why the detective asked this, from the pointer that sent him (the star's own reason). */
function whyHere(w: Writer, q: string, kind: string, slots: Record<string, string | undefined>): Pointer {
  const ptr = threadFor(w.c, w.before, q, w.run.at);
  license(w, ptr);
  // Straight after walking in, the arrival has said why already: say only that this is who (or what) I came for.
  const last = w.before.log[w.before.log.length - 1]?.board;
  // The last page's hand-off named them: the reason is said; just turn to them.
  const subject = q.split(':')[1] ?? '';
  const named = personOf(w.c, subject)?.short;
  // docs/47 C13: no quest-log signposts. When the last page's hand-off named them, or the arrival in
  // this room (or any page tonight) has said why already, the page turns straight to them: the
  // reason is carried, not said again ("So, Corrigan.", "Alfano it was.", "X was the one I’d come for").
  if (last?.handoff && named && last.handoff.includes(named)) {
    w.carried = true;
    return ptr;
  }
  // docs/49: the turn's what-next ("I wanted to know what Miss Moskin had passed on the way to
  // Sokol’s at nine") is a hand-off too, for the person it names: their page doesn't say it again.
  // (A place it names keeps its why: the turn said where, not why.)
  const turnHand = PLAN.ops && last?.turn ? (last.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'hand-off').map((u) => stripMarks(u.text)).join(' ') : '';
  if (named && turnHand.includes(named)) {
    w.carried = true;
    return ptr;
  }
  // Said already tonight (the arrival joined it with others): don't say it twice.
  const saidBefore = !!ptr.clause && w.before.log.some((pg) => pg.blocks.some((b) => b.kind === 'prose' && b.text.includes(stripMarks(cap(ptr.clause)))));
  if (((last?.job === 'arrive' && w.before.at === w.run.at) || saidBefore) && ptr.src !== 'presence') {
    w.carried = true;
    // The one the testers kept ("I hadn’t come for the furniture. I’d come for Alfano."), once a night at most.
    if (named && w.hand.jokeFree) put(w, 'why', w.hand.draw('why', { kind: 'carried' }, withCaps(slots), { plain: true, fresh: true }), 'narrator');
    return ptr;
  }
  if (ptr.clause) {
    // The pointer names them already: a frame that names them again says it twice.
    const k = ptr.src === 'presence' ? 'presence' : named && ptr.clause.includes(named) && (kind === 'account' || kind === 'check') ? `${kind}-named` : kind;
    const why = w.hand.draw('why', { kind: k }, withCaps({ ...slots, src: ptr.clause }), { plain: true });
    put(w, 'why', why ?? `${cap(ptr.clause)}.`, 'narrator', sit(w, why, `${cap(ptr.clause)}.`));
    // The reason is in the narration now: the ask needn't say it to their face as well.
    return { ...ptr, face: undefined } as Pointer;
  }
  return ptr;
}

/**
 * The hand-off: what this page makes the detective want next. It is the
 * page's first star, said in his voice, so it always agrees with the starred
 * choice. No star (Hard-boiled after page one, Medium in the room the next
 * step is in), no hand-off. At Medium the star is a walk, so the hand-off
 * says only where to go (docs/46 §1).
 */
function handOff(w: Writer, always = false): void {
  const c = w.c;
  // The turn has its own what-next.
  if (w.run.turn === undefined && collisionsOf(c, w.run).length > 0) return;
  const steps = starredSteps(w.d, w.run);
  const q = steps[0];
  if (!q) return;
  void always;
  const [kind, rest] = q.split(':') as [string, string];
  const at = starPlace(c, q);
  // "That made …" says this page pointed there: only when it did.
  const fromHere = sourceOfQ(c, w.run.asked, q) === (w.run.asked[w.run.asked.length - 1] ?? '') && w.run.asked.length > w.before.asked.length;
  const away = at !== w.run.at ? 'yes' : 'no';
  const slots: Record<string, string | undefined> = { place: placeName(c, at) };
  let k = kind;
  if (walksOnly(c)) {
    if (away === 'no') return;
    w.places.add(at);
    // docs/47 C13 and B10: the walk is said with the star's own reason, not as a quest log ("The next
    // place worth the walk was the chop house"). Somebody out on the street at an hour that mattered
    // is the reason that matters: "Pickering had walked to the chop house at ten. I wanted to know what she'd passed."
    const subject = kind === 'account' ? rest : undefined;
    const mv = subject ? movedAt(c, w.run, subject) : null;
    let said: string | null = null;
    // docs/51: the reason stays; what's said after it is texture.
    let lead: string | undefined;
    if (subject && mv) {
      const pr = markedPron(c, subject);
      said = `${nameOf(c, subject)} had walked from ${placeName(c, mv.from)} to ${placeName(c, mv.to)} at ${hourWord(mv.h)}. I wanted to know what ${pr.he}’d passed on the way.`;
      lead = `${nameOf(c, subject)} had walked from ${placeName(c, mv.from)} to ${placeName(c, mv.to)} at ${hourWord(mv.h)}.`;
      w.people.add(subject);
      w.places.add(mv.from);
      w.places.add(mv.to);
      w.hours.add(mv.h);
    } else {
      // docs/49: the pointer as said from where I stand, not from where it sends me ("Prentiss had sat
      // here telling the room", said in the Delmonico rooms of the Thalia); and the place once.
      const ptr = threadFor(c, w.run, q, PLAN.ops ? w.run.at : at);
      if (ptr.clause && ptr.src !== 'presence') {
        said = PLAN.ops && stripMarks(ptr.clause).includes(placeName(c, at)) ? `${cap(ptr.clause)}, and that was worth the walk.` : `${cap(ptr.clause)}, and that was worth the walk to ${placeName(c, at)}.`;
        if (PLAN.ops && stripMarks(ptr.clause).includes(placeName(c, at))) lead = `${cap(ptr.clause)}.`;
        if (namesFit(w, said)) license(w, ptr);
        else said = null;
      }
    }
    // A name twice at most a page (docs/39 §4): a reason that would say one a third time isn't said;
    // the star still shows the way.
    if (said && !namesFit(w, said)) said = null;
    put(w, 'handoff', said, 'thought', { keepNames: true, ...(said && lead ? { sit: { lead, joke: false } } : {}) });
    if (said) w.handoff = stripMarks(said);
    return;
  }
  if (kind === 'account' || kind === 'list') {
    const p = personOf(c, rest);
    if (!p) return;
    const known = knownPeople(c, w.run).has(rest);
    Object.assign(slots, who(c, rest));
    slots.job = jobWords(p.description);
    if (kind === 'list' && !known) k = 'list-job';
    if (kind === 'account' && threadFor(c, w.run, q, w.run.at).src.startsWith('confront:')) k = 'check';
    for (const x of [rest]) if (known) w.people.add(x);
    if (!known && kind === 'account') return;
  } else if (kind === 'confront') {
    const [p] = rest.split('@') as [string];
    Object.assign(slots, who(c, p));
    k = 'put';
    w.people.add(p);
  } else if (kind === 'search') {
    const f = c.finds.find((x) => x.id === rest);
    slots.what = f?.what;
    k = f?.gives.why ? 'papers' : 'search';
  }
  w.places.add(at);
  const avoid = w.hand.avoid;
  if (!fromHere) w.hand.avoid = alsoAvoid(avoid, /^That\b/);
  // A name twice at most a page (docs/39 §4): a hand-off that would say it a third time is left to the star.
  const named = slots.name;
  if (named) {
    const already = Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0);
    if (already >= 2) return;
  }
  const said = w.hand.draw('handoff', { kind: k, away }, withCaps(slots), { plain: true });
  put(w, 'handoff', said, 'thought', { keepNames: true });
  if (said) w.handoff = stripMarks(said);
  w.hand.avoid = avoid;
}

/** Whether a sentence added to the page keeps everybody's name to twice a page or fewer (docs/39 §4). */
function namesFit(w: Writer, text: string): boolean {
  // A list or an account has to name people, and doesn't count (docs/39 §4's exemption).
  const all = [...Object.values(w.parts).flat().filter((x) => x?.voice !== 'answer').map((x) => x?.text ?? ''), text].join(' ');
  const count = (p: { short: string }) => (all.match(new RegExp(`\\b${esc(p.short)}\\b`, 'g')) ?? []).length;
  // Only the people the new words name: somebody else said three times already isn't this sentence's doing.
  return w.c.people.every((p) => p.object || !new RegExp(`\\b${esc(p.short)}\\b`).test(text) || count(p) <= 2);
}

/** The thought: the engine's, after the job. Recorded for the measure, and licensed for the lint. */
function think(w: Writer, q: string, extra: Thought | null = null): Thought {
  const t = thoughtOf({ c: w.c, before: w.before, run: w.run, q, here: w.run.at, level: thoughtLevel(w.c), pick: (k, ls) => w.hand.pick(k, ls) });
  const parts: ThoughtPart[] = partsOf(t);
  if (extra) {
    t.sentences.unshift(...extra.sentences);
    t.refs.push(...extra.refs);
    t.hours.push(...extra.hours);
    t.people.push(...extra.people);
    t.places.push(...extra.places);
    parts.unshift(...partsOf(extra));
  }
  // docs/47 B11: at Raw the elimination is walked once, on the page after the one that settled it
  // (unless the turn walked it already), so the page with the fact never concludes for the player.
  const el = walkedElimination(w);
  if (el) {
    t.sentences.unshift(...el.sentences);
    t.refs.push(...el.refs);
    t.hours.push(...el.hours);
    t.people.push(...el.people);
    t.places.push(...el.places);
    parts.unshift(...partsOf(el));
  }
  license(w, t);
  if (t.sentences.length) {
    const text = t.sentences.join(' ');
    // docs/49: one fact a sentence, each with what it does; the thought is one paragraph.
    parts.forEach((x, i) => {
      if (x.rule === 'gloss') {
        put(w, 'thought', x.text, 'thought', { slot: 'gloss', about: x.people, runOn: i > 0, alts: pickAlts(w, x.text), sit: { joke: false } });
        return;
      }
      fact(w, 'thought', x.text, 'thought', {
        relation: x.relation,
        about: x.people,
        carries: x.refs.length ? x.refs : [`thought:${x.rule}`],
        ...(x.hours.length === 1 ? { hour: x.hours[0] } : {}),
        ...(x.places.length === 1 && x.places[0] ? { place: x.places[0] } : {}),
        ...(x.core ? { core: x.core } : {}),
        ...(x.joins ? { joins: x.joins } : {}),
        ...(x.agg ? { agg: x.agg } : {}),
        tag: `thought:${x.rule}`,
        runOn: i > 0,
      });
      // The detective's aside after it, with no fact in it: a gap (docs/49 §3).
      if (x.gloss) put(w, 'thought', x.gloss, 'thought', { slot: 'gloss', about: x.people, runOn: true, alts: pickAlts(w, x.gloss), sit: { joke: false } });
    });
    w.thought = { text: stripMarks(tidy(text)), refs: [...new Set(t.refs)] };
  }
  // Whoever this answer put in the room is placed now, before the hand-off counts names (docs/47 B8).
  placeNewcomers(w);
  return t;
}

/**
 * docs/47 B11: the walk's elimination, when it's due: Raw, who settled on what was held before
 * this page, and not walked yet tonight. `now` is for the turn and the report, which may say it on
 * the settling page's own run (the turn is that page's chapter break, after the fact).
 */
function walkedElimination(w: Writer, now = false): Thought | null {
  if (thoughtLevel(w.c) !== 'walk' || w.hand.used('walk:elimination')) return null;
  const settled = solveRun(w.c, now ? w.run : w.before).who !== undefined;
  if (!settled) return null;
  const el = eliminationOf(w.c, w.run, w.run.at);
  if (!el) return null;
  w.hand.note('walk:elimination');
  return el;
}

/** docs/49: the detective's aside in a thought, with no fact in it: a gap, not a fact unit. */
interface Gloss {
  gloss: string;
}

/**
 * A page's own thought: its sentences, the asides among them marked (`{ gloss }`), with what the
 * facts in it do. The words are the sentences joined, as they always were.
 */
function thoughtOnly(sentences: (string | Gloss)[], refs: string[], o: { hours?: Hour[]; people?: PersonId[]; places?: PlaceId[]; rel?: Relation; rule?: string } = {}): Thought {
  const parts = sentences.map(
    (x) =>
      ({
        text: typeof x === 'string' ? x : x.gloss,
        relation: o.rel ?? 'new',
        rule: typeof x === 'string' ? (o.rule ?? 'page') : 'gloss',
        refs,
        hours: o.hours ?? [],
        people: o.people ?? [],
        places: o.places ?? [],
      }) as ThoughtPart,
  );
  return { sentences: sentences.map((x) => (typeof x === 'string' ? x : x.gloss)), refs, hours: o.hours ?? [], people: o.people ?? [], places: o.places ?? [], parts };
}

/** A thought's facts, one a sentence (docs/49): its own parts, or each sentence as a plain new fact. */
function partsOf(t: Thought): ThoughtPart[] {
  if (t.parts && t.parts.length === t.sentences.length) return [...t.parts];
  return t.sentences.map((text) => ({ text, relation: 'new', rule: 'page', refs: t.refs, hours: t.hours, people: t.people, places: t.places }));
}

/* ------------------------------------------------------------------ *
 * The office.
 * ------------------------------------------------------------------ */

const CIRCUMSTANCES = ['behind-on-rent', 'flush', 'hungover', 'bruised', 'sleepless', 'just-paid'];

/** A line about somebody, put in the client's own mouth: "asked me what it was worth", "she and I haven’t spoken". */
function inClientMouth(c: BoardCase, text: string): string {
  const cl = clientOf(c);
  const me = cl.short;
  // The dead man, in the client's mouth, is "he" once the office has named him.
  if (isMurder(c)) text = text.replace(new RegExp(`^${victimOf(c).short}\\b`), 'He');
  return text
    .replace(new RegExp(`\\band ${me} haven’t\\b`), 'and I haven’t')
    .replace(new RegExp(`\\basked ${me}\\b`), 'asked me')
    .replace(new RegExp(`\\bthe late Mr\\. ${me}\\b`), cl.female ? 'my late husband' : 'my late father')
    .replace(new RegExp(`\\bday ${me} brought\\b`), 'day I brought')
    .replace(new RegExp(`\\bwasted on its owner\\b`), 'wasted on me')
    .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my');
}

export function writeOffice(w: Writer): void {
  const { c } = w;
  const cl = clientOf(c);
  const cp = pronOf(c, c.client);
  const circ = CIRCUMSTANCES[(c.seed * 7 + c.tier) % CIRCUMSTANCES.length] as string;
  const open = w.hand.draw('office-open', {}, {}, { widen: true });
  const office = w.hand.drawOld('office', (card) => card.tags.circumstance === circ && (card.weather === undefined || card.weather === w.run.weather || card.weather === 'any'), {}, true);
  if (office?.card.exports?.prop) w.run.prop = { short: office.card.exports.prop.short, pay: office.card.exports.prop.pay ?? [] };
  put(w, 'arrival', [open, office?.text].filter(Boolean).join(' '), 'establish');
  const entrance = w.hand.drawOld('entrances', (card) => (card.tags.gender === 'any' || card.tags.gender === (cl.female ? 'f' : 'm')) && card.tags.familiar !== 'yes' && ['working', 'professional', 'any'].includes(String(card.tags.class)) && !/\{detective\}/.test(card.text), { name: cl.short }, true);
  put(w, 'arrival', [w.hand.draw('knock', {}, {}, { widen: true }), entrance?.text].filter(Boolean).join(' '), 'establish');

  const base = { client: cl.short, cHe: cp.he, cHim: cp.him, cHis: cp.his, thing: victimOf(c).short, victim: victimOf(c).short };
  const lines = c.givens.lines ?? c.givens.text.map((t) => ({ kind: 'found' as const, id: 'text', text: t, vars: {} as Record<string, string> }));
  const gone = lines.find((g) => g.kind === 'gone')?.vars;
  const pthem = gone?.pthem ?? 'it';
  let asked = { when: false, who: false };
  let chair = false;
  const aside = lines.some((g) => g.kind === 'aside');
  let pointerTold = false;
  // docs/44: one quoted line a paragraph. Between them, the detective's own questions and the chair.
  for (const g of lines) {
    // The client's own line, in the client's mouth: "nine or ten, I’d say", "he telephoned me".
    const me = cl.short;
    const line = g.kind === 'found' || g.kind === 'relation' ? g.text : g.text
      .replace(new RegExp(`,? ${me} says\\b`), ', I’d say')
      .replace(new RegExp(`\\btelephoned ${me}\\b`), 'telephoned me')
      .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my')
      .replace(new RegExp(`\\b${me} is out\\b`), 'I’m out');
    const v: Record<string, string | undefined> = { ...base, ...g.vars, line };
    if (v.where) v.whereFrom = v.where.replace(/^(in|on) /, '');
    // The client's own watch: "my late husband’s gold watch", not "a late husband’s" (Raw 11's #23).
    if (v.thingName) v.thingName = v.thingName.replace(/^a late husband’s\b/, 'my late husband’s');
    // "found in his own walk-up", not "found in Dandridge’s walk-up" of Dandridge (Poached 5's #1).
    if (g.kind === 'found' && v.scene && isMurder(c)) v.scene = v.scene.replace(new RegExp(`^${esc(victimOf(c).short)}’s `), 'his own ');
    if (g.kind === 'pointer' && v.motive) v.motive = inClientMouth(c, v.motive);
    // (Poached 5's #2, "He owed Dandridge the rent on a shop, and he was calling it in", two different
    // men in one sentence, is mended in the motive itself: "…and it was being called in".)
    if (g.kind === 'pointer' && v.behaviour) v.behaviour = v.behaviour.replace(new RegExp(`\\b${cl.short}’s\\b`, 'g'), 'my');
    if (v.pthey) v.Pthey = cap(v.pthey);
    if (g.kind === 'means' && v.resident) {
      const res = c.people.find((p) => p.short === v.resident);
      if (res) v.rtheir = pronOf(c, res.id).his;
    }
    // What the office names, the page may name.
    for (const p of c.people) if (g.text.includes(p.short)) w.people.add(p.id);
    if (g.kind === 'aside') {
      // The report asks why: the client's aside gives every reason the pointer didn't, in passing.
      // It runs as talk: two at a time, the second with an "And", and a beat between. The one the
      // client pointed at has had their reason said with the pointer, so they aren't named again.
      const n = Number(v.n ?? 0);
      const pointed = c.givens.pointer ? nameOf(c, c.givens.pointer) : '';
      const said: string[] = [];
      const asideAbout = c.people.filter((x) => Object.entries(v).some(([k, y]) => /^p\d+$/.test(k) && y === x.short)).map((x) => x.id);
      for (let i = 0; i < n; i++) {
        if (pointerTold && v[`p${i}`] === pointed) continue;
        // Somebody named for the first time is said with their trade (Medium 14's #24: "And Pickering, the milliner").
        const who = c.people.find((x) => x.role === 'suspect' && x.short === v[`p${i}`]);
        let m = inClientMouth(c, v[`m${i}`] ?? '');
        if (who?.job) m = m.replace(new RegExp(`\\b${esc(who.short)}\\b`), `${who.short}, ${who.job},`);
        said.push(`${cap(m)}.`);
      }
      if (said.length === 0) continue;
      const groups = said.length <= 2 ? [said] : [said.slice(0, 2), said.slice(2)];
      const talk = (g: string[]) => g.map((x, i) => (i === 0 ? x : `And ${x}`)).join(' ');
      const cs = withCaps({ ...base, ...who(c, c.client) });
      groups.forEach((g, gi) => {
        if (gi === 0) {
          fact(w, 'job', w.hand.draw('aside', {}, withCaps({ ...cs, said: talk(g) }), { widen: true, plain: true }) ?? `“${talk(g)}”`, 'exchange', { about: asideAbout, carries: ['givens:aside'] });
        } else {
          const beat = w.hand.draw('aside-beat', {}, cs, { widen: true, plain: true });
          fact(w, 'job', `${beat ?? ''} “${talk(g)}”`, 'exchange', { about: asideAbout, carries: ['givens:aside'] });
        }
      });
      continue;
    }
    // The detective's questions, where a speech would want one.
    if (!asked.when && (g.kind === 'clock' || g.kind === 'window')) {
      asked = { ...asked, when: true };
      const ask = w.hand.draw('office-ask', { before: 'when', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true });
      put(w, 'job', ask, 'exchange', { slot: 'ask', ...sit(w, ask) });
    }
    if (!asked.who && g.kind === 'pointer') {
      asked = { ...asked, who: true };
      const ask = w.hand.draw('office-ask', { before: 'who', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true });
      put(w, 'job', ask, 'exchange', { slot: 'ask', ...sit(w, ask) });
    }
    let kind: string = g.kind;
    if (g.kind === 'clock' && !isMurder(c)) kind = 'small-clock';
    // A pointer said for what they did, not why: their reason follows in the same breath ("And he lost his job on Friday…").
    let pointerAlso = '';
    if (g.kind === 'pointer' && g.id === 'behaviour' && c.givens.pointer && aside) {
      const pp = personOf(c, c.givens.pointer);
      const reason = pp?.motive ? inClientMouth(c, pp.motive) : '';
      if (reason) pointerAlso = ` And ${reason}.`;
    }
    const want = g.kind === 'pointer' || g.kind === 'gone' || g.kind === 'means' || g.kind === 'keeper' ? { kind, id: g.id } : { kind };
    let text = c.givens.lines ? w.hand.draw('setup', want, withCaps(v), { need: true }) : null;
    if (text && pointerAlso && /”$/.test(text)) {
      text = `${text.slice(0, -1)}${pointerAlso}”`;
      pointerTold = true;
    }
    // docs/49: the scene's pronouns are the dead man's ("found dead in his own flat … by Bidwell, who
    // heard his radio still going"), for the planner to say as him where "his" could be the finder's.
    if (PLAN.ops && text && g.kind === 'found' && isMurder(c)) {
      const vic = victimOf(c).id;
      const pron = pronOf(c, vic).he === 'she' ? /\b(she|her|She|Her)\b/g : /\b(he|his|him|He|His|Him)\b/g;
      text = text.replace(pron, (m) => `${m}${markPronoun(c, vic)}`);
    }
    fact(w, 'job', text ?? `“${g.text}”`, g.kind === 'found' ? 'narrator' : 'exchange', {
      about: c.people.filter((x) => !x.object && g.text.includes(x.short)).map((x) => x.id),
      carries: [`givens:${g.kind}`],
      ...(g.kind === 'clock' || g.kind === 'window' ? { relation: 'narrows' as Relation } : {}),
    });
    // The chair, once the client has said who they are and what's wrong.
    const sat = /\bchair\b|\bsitting\b|\bsat\b/.test(`${entrance?.text ?? ''} ${(w.parts.job ?? []).map((x) => x.text).join(' ')}`);
    if (!chair && (g.kind === 'gone' || g.kind === 'found') && !sat) {
      chair = true;
      const chairLine = w.hand.draw('office-chair', {}, withCaps({ ...base, ...who(c, c.client) }), { widen: true });
      put(w, 'job', chairLine, 'act', { slot: 'staging', about: [c.client], ...sit(w, chairLine) });
    }
  }
  for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  for (const f of c.givens.facts) w.hours.add(f.h);
  const retainer = w.hand.draw('retainer', { type: isMurder(c) ? 'murder' : 'small' }, withCaps(base), { need: true });
  put(w, 'job', retainer, 'exchange', { slot: 'close', about: [c.client] });
  const officeClose = w.hand.draw('office-close', {}, {}, { widen: true });
  put(w, 'close', officeClose, 'exchange', sit(w, officeClose));
  w.beats.push('why');
  lay(w, 'office');
}

/* ------------------------------------------------------------------ *
 * The walk.
 * ------------------------------------------------------------------ */

/** The hours of the night, for cards that only fit some of them: "midnight-2", "2-4", "4-6", "6-8". */
function band(w: Writer): string {
  const m = minutesAfter(w.run.used, budgetCalls(w.d));
  return m < 120 ? 'midnight-2' : m < 240 ? '2-4' : m < 360 ? '4-6' : '6-8';
}

/** The street between: the distance, and a line of the night outside. The first walk sets the street's role up; a later one may pay it off. */
function writeWalk(w: Writer, from: PlaceId, to: PlaceId): void {
  const c = w.c;
  const wk = walkBetween(c, from, to);
  const dest = to === OFFICE ? 'the office' : placeName(c, to);
  const fromName = from === OFFICE ? 'the office' : placeName(c, from);
  // Where it matters: from the scene to where the way in was had, the night turns on who could walk it in an hour.
  const matters = (from === c.crime.scene && to === c.means.origin) || (to === c.crime.scene && from === c.means.origin);
  // docs/47 A1: the walk says how far, never how many minutes: the clock moves a call's worth
  // whatever the walk, and the strip shows it. The way is the direction alone; the place walked
  // from is where the last page stood, and saying it again is the place name bolted on.
  const slots = withCaps({ dest, from: fromName, far: wk.far, way: wk.near ? undefined : wk.dir, street: wk.street, place: dest });
  let frame = w.hand.draw('walk-way', { matters: matters ? 'yes' : 'no', near: wk.near ? 'yes' : 'no' }, slots, { plain: true }) ?? (wk.near ? `${cap(dest)} was round the corner.` : `It was ${wk.far} to ${dest}, ${wk.dir}.`);
  const frameDrawn = w.hand.last;
  // "The Delmonico rooms were", not "was".
  // (With the planner on, only where the rooms are what the sentence is about: "From there to the
  // Delmonico rooms was a long walk" is a walk.)
  const were = (t: string) => (/\brooms$|^the flats\b/i.test(dest) ? t.replace(new RegExp(`${PLAN.ops ? '^' : ''}(${esc(cap(dest))}|${esc(dest)}) was\\b`), '$1 were') : t);
  frame = were(frame);
  // A later walk may pay the street's role off; the first sets it up.
  let line: string | null = null;
  const role = w.run.street;
  if (role && w.hand.jokeFree && w.hand.rng.int(10) < 6) {
    const all = role.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` }));
    const spent = all.filter((x) => w.hand.used(x.id)).length >= GAG_MAX;
    const fresh = spent ? [] : all.filter((x) => !w.hand.used(x.id));
    const x = fresh.length ? (fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string }) : undefined;
    if (x) {
      w.hand.note(x.id);
      w.hand.joke();
      w.callback = true;
      line = x.l;
    }
  }
  // docs/51: a street line is texture the situated deck may fill, unless it sets up the street's role or pays it off.
  let lineSit: Pick<Item, 'sit'> = {};
  if (!line) {
    const drawn = w.hand.drawCard('walk', { weather: w.run.weather, band: band(w) }, slots, {});
    line = drawn?.text ?? null;
    const ex = drawn?.card.exports?.street;
    if (!role && ex?.pay?.length) w.run.street = { short: ex.short, pay: ex.pay };
    else if (!ex?.pay?.length) lineSit = sit(w, line);
  }
  // docs/49: the frame and the street, two pieces of one paragraph.
  put(w, 'walk', frame, 'establish', { alts: altsOf(w, frameDrawn, were) });
  put(w, 'walk', line, 'establish', { runOn: true, ...lineSit });
  w.places.add(to);
  if (from !== OFFICE) w.places.add(from);
}

/* ------------------------------------------------------------------ *
 * Arriving.
 * ------------------------------------------------------------------ */

export function writeArrive(w: Writer, place: PlaceId): void {
  const { c } = w;
  const first = !w.before.visited.includes(place);
  const pl = placeOf(c, place);
  if (!pl) return;
  stageGuard(w, place);
  const kind = placeKind(c, place);
  // A later visit: somebody here already has a trait, and the page's last word pays it off.
  const again = first ? undefined : peopleAt(c, w.run, place).find((x) => w.run.traits?.[x]);
  const callback = (!first && (again !== undefined || !!w.run.props?.[place])) || (!!w.run.street && w.hand.rng.int(10) < 3);
  if (callback) w.hand.hold(true);
  writeWalk(w, w.before.at, place);
  // `{name}` is the whole name ("the Odessa, a café where the actors eat after the show"); as the
  // subject of a sentence it takes the closing comma its aside needs (`{nameSubj}`).
  const slots = withCaps({ name: pl.name, nameSubj: pl.name.includes(',') ? `${pl.name},` : pl.name, place: pl.short, street: pl.street });
  if (first) {
    const arrive = w.hand.draw('arrive', { kind, key: pl.key }, slots, { need: true }) ?? `I went to ${pl.name}.`;
    // M13's prop: something in the room a later page here can call back to.
    const prop = w.hand.drawCard('prop', { kind }, w.hand.world ? { ...slots, arrived: arrive } : slots);
    const ex = prop?.card.exports?.prop;
    if (prop && ex?.pay?.length) w.run.props = { ...(w.run.props ?? {}), [place]: { short: ex.short, pay: ex.pay } };
    // The arrival has just named the place: the prop needn't say "at the Thalia" again (docs/25, 4b open).
    const propText = prop?.text && arrive.includes(pl.short) ? prop.text.replace(` at ${pl.short}`, '') : prop?.text;
    put(w, 'arrival', arrive, 'establish');
    put(w, 'arrival', propText, 'establish', { runOn: true });
  } else {
    put(w, 'arrival', w.hand.draw('return', {}, slots, { widen: true }) ?? `Back at ${pl.short}.`, 'establish');
  }
  const vict = victimOf(c);
  if (pl.scene && first) {
    if (isMurder(c)) put(w, 'arrival', w.hand.draw('scene-body', { means: c.means.kind }, withCaps({ victim: vict.short }), { need: true, widen: true }), 'establish', { about: [c.crime.victim] });
    // docs/48 §3: and what the bible says he'd be found with.
    if (isMurder(c)) putOn(w, 'arrival', worldFoundWith(c), 'establish');
    else put(w, 'arrival', w.hand.draw('scene-empty', { kind: c.type === 'lost-pet' ? 'pet' : 'item' }, withCaps({ client: clientOf(c).short, thing: vict.short }), { need: true, widen: true }), 'establish', { about: [c.client] });
  }
  // Who's here, and what they're doing.
  const here = peopleAt(c, w.run, place);
  // docs/49: a sentence a person, each a piece of the one paragraph, with the cards it could have been.
  const sentences: { text: string; about: PersonId[]; alts?: Item['alts'] }[] = [];
  // Back in a room: nobody does the same thing twice tonight. Whoever has no fresh line left is
  // "still there", together, in one sentence at the end.
  const stillThere: string[] = [];
  const freshOnly = first ? {} : { fresh: true };
  let watcherLine: string | null = null;
  let looked = false;
  for (const p of here) {
    const person = personOf(c, p);
    if (!person) continue;
    w.people.add(p);
    const s = withCaps(who(c, p));
    if (person.role === 'client') {
      // At a lost thing's flat the client is already in the room's own line.
      if (pl.scene && !isMurder(c) && first) continue;
      const here_ = w.hand.draw('client-here', {}, s, { widen: true, plain: true });
      sentences.push({ text: here_ ?? `${person.short} was there.`, about: [p], alts: here_ ? altsOf(w, w.hand.last) : undefined });
      continue;
    }
    if (person.role === 'watcher') {
      const job = jobKey(person.description);
      const doingW = w.hand.draw('doing', { job }, s, { plain: true, ...freshOnly });
      const doingDrawn = w.hand.last;
      if (doingW === null && !first) {
        stillThere.push(person.short);
        continue;
      }
      sentences.push({ text: doingW ?? `${person.short} was there, ${person.description}.`, about: [p], alts: doingW ? altsOf(w, doingDrawn) : undefined });
      const met = w.before.visited.includes(place);
      if (!met) {
        const look = !looked ? lookAt(w, p) : null;
        if (look) {
          looked = true;
          sentences.push({ text: look, about: [p] });
        }
        watcherLine = w.hand.draw('watcher', { job }, s) ?? oldWatch(w, job, person.short);
      }
      continue;
    }
    const k = kind === 'unwatched' ? 'back' : kind === 'rooming' || kind === 'flat' || kind === 'rooms' ? 'home' : kind === 'shift' ? 'work' : kind;
    // Hard-boiled's face: everybody's look is plain on first sight, so a face on a list can be matched.
    // Decided 2026-10-11: the pair has one too, the culprit's friend at the bar.
    if ((c.variant === 'face' || c.variant === 'pair') && person.role === 'suspect' && person.look) {
      s.name = `${person.short}, ${person.look},`;
      s.Name = s.name;
    }
    const drawn = w.hand.draw('doing', { kind: k }, s, { plain: true, ...freshOnly });
    const doingDrawn = w.hand.last;
    if (drawn === null && !first) {
      stillThere.push(person.short);
      continue;
    }
    const doing = drawn ?? `${person.short} was there.`;
    // One first look a page, at the first suspect met here: more is a parade.
    const look = first && person.role === 'suspect' && !looked ? lookAt(w, p) : null;
    if (look) looked = true;
    sentences.push({ text: doing, about: [p], alts: drawn && !s.name?.includes(',') ? altsOf(w, doingDrawn) : undefined });
    if (look) sentences.push({ text: look, about: [p] });
  }
  if (stillThere.length > 0) sentences.push({ text: `${cap(andList(stillThere))} ${stillThere.length > 1 ? 'were' : 'was'} still there.`, about: here.filter((x) => stillThere.includes(nameOf(c, x))) });
  sentences.forEach((x, i) => put(w, 'arrival', x.text, 'presence', { about: x.about, runOn: i > 0, ...(x.alts ? { alts: x.alts } : {}) }));
  if (sentences.length === 0 && !pl.scene) put(w, 'arrival', `There was nobody there to ask.`, 'presence');
  // Why here: the pointers to what waits in this room, from what's held, the starred one first.
  const lastHand = w.before.log[w.before.log.length - 1]?.board?.handoff;
  const handed = !!lastHand && lastHand.includes(pl.short);
  const ptrs = (pl.scene && first) || handed ? [] : placeThread(c, w.before, place, starredSteps(w.d, w.before), place);
  const sameSubject = (clause: string, before: string) => sameSubjectIn(c, clause, before);
  // The last page's hand-off sent me here, and the walk says I came: no "So, Moe’s." (docs/47 C13).
  if (handed) w.carried = true;
  for (const p of ptrs) license(w, p);
  if (ptrs.length > 0) {
    // Two lines from one list run together: "Mrs. Tramonti’s list had Lathrop there at nine, and Mulcahy at eight and nine."
    const [p0, p1] = ptrs as [Pointer, Pointer | undefined];
    const head = /^(.+?’s list had )/.exec(p0.clause)?.[1];
    const said = /^(.+? had said )/.exec(p0.clause)?.[1];
    // "Grasso had said she was here at seven, with Abramowitz", not "…here at seven, and that
    // Abramowitz was with her here at seven" (Hard-boiled 8's #18).
    const m0 = /^.+? had said (?:he|she)(?:\u2063\d+\u2064)? was (here|at .+?) at (\w+)$/.exec(p0.clause);
    const m1 = p1 && said && p1.src === p0.src ? new RegExp(`^${esc(said)}(.+?) was with (?:him|her)(?:\u2063\\d+\u2064)? (here|at .+?) at (\\w+)$`).exec(p1.clause) : null;
    const src = m0 && m1 && m0[1] === m1[2] && m0[2] === m1[3]
      ? `${p0.clause}, with ${m1[1]}`
      : p1 && head && p1.src === p0.src && p1.clause.startsWith(head)
      ? `${p0.clause}, and ${p1.clause.slice(head.length).replace(/ at the [^,]+? at /, ' at ').replace(new RegExp(` at ${esc(pl.short)} at `), ' at ').replace(p0.places[0] ? new RegExp(` at ${esc(placeName(c, p0.places[0]))} at `) : /$^/, ' at ')}`
      : p1 && said && p1.src === p0.src && p1.clause.startsWith(said)
        ? `${p0.clause}, and that ${p1.clause.slice(said.length)}`
        : ptrs.map((p, i) => (i === 0 ? p.clause : cap(sameSubject(p.clause, p0.clause)))).join('. ');
    const why = w.hand.draw('why', { kind: 'arrive' }, withCaps({ src, place: pl.short }), { plain: true });
    put(w, 'why', why ?? `${cap(src)}.`, 'narrator', sit(w, why, `${cap(src)}.`));
  } else if (pl.scene && !first) {
    put(w, 'why', w.hand.draw('why', { kind: 'scene', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ victim: vict.short, thing: vict.short, client: clientOf(c).short, place: 'here' }), { plain: true }), 'narrator');
  }
  // What the detective thinks on the way in: what a watcher is good for, or the scene against the office's clock.
  if (watcherLine) put(w, 'thought', watcherLine, 'thought', { about: here.filter((x) => personOf(c, x)?.role === 'watcher') });
  else if (first && !c.lists.some((l) => l.place === place)) {
    const none = w.hand.drawOld('watch', (card) => card.tags.watcher === 'none', {}, true);
    put(w, 'thought', none?.text, 'thought');
  }
  if (pl.scene && first) {
    const hs = (c.givens.window ?? c.crime.window).map(hourWord);
    const mode = c.setup?.means ?? '';
    const venue = c.givens.lines?.find((g) => g.kind === 'means')?.vars.venue;
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    // docs/47 B9: the means is named here only when the office named it; otherwise the table says it, a page on.
    const m = c.means.name.replace(/^(a|an) /, '');
    const officeSaid = c.givens.text.some((t) => t.toLowerCase().includes(m.toLowerCase()));
    // A lost pet went as "he" or "she" (docs/47 B9).
    const it = markedPron(c, c.crime.victim);
    const key = SPARE_KEY[c.setup?.means ?? '']?.at.replace('{x}', placeName(c, c.means.origin)) ?? `at ${placeName(c, c.means.origin)}`;
    const t = isMurder(c)
      ? officeSaid
        ? `If it happened at ${andList(hs).replace(' and ', ' or ')}, it happened in this room, and whoever did it had walked in here with the ${m} already in hand.`
        : `If it happened at ${andList(hs).replace(' and ', ' or ')}, it happened in this room, and he’d let whoever did it in.`
      : /^told/.test(mode) && venue
        ? `If ${it.he} went at ${andList(hs).replace(' and ', ' or ')}, the flat had been empty, and anybody who’d heard ${clientOf(c).short} at ${venue} had known the way in. That was a room, more or less. It was a big room.`
        : party
          ? `If ${it.he} went at ${andList(hs).replace(' and ', ' or ')}, ${it.he} went after the ${party.occasion}, and everybody at the ${party.occasion} had known the way in.`
          : `If ${it.he} went at ${andList(hs).replace(' and ', ' or ')}, whoever took ${it.him} had a key, and the spare key lives ${key}.`;
    fact(w, 'thought', t, 'thought', { carries: ['givens:window', 'givens:means'], about: isMurder(c) ? [c.crime.victim] : [c.client], place });
    for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
    w.places.add(c.means.origin);
  }
  if (callback) {
    const pay = payOff(w, again);
    // (docs/49: somebody's own last-I-saw line is about them, for the planner's "him".)
    const theirs = PLAN.ops && again !== undefined && !!pay && (w.run.traits?.[again]?.pay ?? []).includes(pay);
    put(w, 'close', pay, 'thought', { alts: payAlts(w, pay), ...(theirs ? { about: [again] } : {}) });
  }
  if (!(w.parts.close ?? []).length) {
    const close = w.hand.draw('arrive-close', { kind: pl.scene && first ? 'scene' : stageKind(c, place) }, withCaps({ place: pl.short }), { joke: true });
    put(w, 'close', close, 'thought', sit(w, close));
  }
  w.places.add(place);
  lay(w, 'arrival');
  w.hand.avoid = null;
}

/** A second pointer that opens on somebody the first just named opens on "he" or "she" instead. */
function sameSubjectIn(c: BoardCase, clause: string, before: string): string {
  for (const p of c.people) {
    if (p.object || !clause.startsWith(`${p.short} `) || !before.includes(p.short)) continue;
    const others = c.people.filter((x) => x !== p && !x.object && x.female === p.female && before.includes(x.short));
    if (others.length) return clause;
    return `${pronOf(c, p.id).he}${clause.slice(p.short.length)}`;
  }
  return clause;
}

function oldWatch(w: Writer, job: string, name: string): string | null {
  const role = WATCH_ROLE[job];
  if (!role) return null;
  return w.hand.drawOld('watch', (card) => card.tags.watcher === role, { watcher: name })?.text ?? null;
}

/** Back to the office: the walk, the room, and why (there's nothing to ask there). */
export function writeReturn(w: Writer): void {
  writeWalk(w, w.before.at, OFFICE);
  put(w, 'arrival', 'I went back up to the office. It had kept my chair warm for nobody.', 'establish');
  const why = w.hand.draw('why', { kind: 'return' }, {}, { plain: true });
  put(w, 'why', why, 'narrator', sit(w, why));
  lay(w, 'return');
}

/* ------------------------------------------------------------------ *
 * "Where were you tonight?"
 * ------------------------------------------------------------------ */

const MANNERS: Manner[] = ['plain', 'plain', 'terse', 'careful'];

export function mannerOf(c: BoardCase, p: PersonId): Manner {
  let h = 0;
  for (const ch of `${c.id}|${p}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return worldManner(c, p) ?? (MANNERS[h % MANNERS.length] as Manner);
}

/**
 * Staging, the ask and the reaction, the same for everybody of a manner in a
 * place of a kind: the reaction never knows whether they're about to lie.
 */
function stageAndAsk(w: Writer, p: PersonId, job: 'account' | 'check' | 'list' | 'motive', ptr: Pointer | null, extra: Record<string, string | undefined> = {}): void {
  const c = w.c;
  const s = withCaps({ ...who(c, p), ...extra });
  const manner = personOf(c, p)?.role === 'watcher' ? 'watcher' : mannerOf(c, p);
  const look = setUp(w, p);
  // Somebody met on an earlier page has moved, or hasn't: where they are now, before I sit down.
  const seenBefore = personOf(c, p)?.role !== 'watcher' && w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive') && !(w.before.log[w.before.log.length - 1]?.board?.job === 'arrive' && w.before.at === w.run.at);
  // The why has named them already: where they are now would be the second name before a word is asked.
  const namedInWhy = (w.parts.why ?? []).some((x) => x.text.includes(nameOf(c, p)));
  if (seenBefore && !namedInWhy) put(w, 'staging', w.hand.draw('still', { kind: stageKind(c, w.run.at) }, s), 'act', { about: [p] });
  // A watcher is staged by the job: a club's doorkeeper isn't behind a bar.
  const watcher = personOf(c, p)?.role === 'watcher';
  const sk = stageKind(c, w.run.at);
  const kind = watcher && sk === 'bar' && jobKey(personOf(c, p)?.description ?? '') !== 'bartender' ? 'any' : sk;
  // Met on the way in: they've already opened the door to me.
  const metHere = w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive');
  const avoidStage = w.hand.avoid;
  if (metHere) w.hand.avoid = alsoAvoid(avoidStage, /\bdoor\b/);
  // docs/48 §3: the bible first (what they're doing, the place's own habit); the deck fills what's left.
  const own = worldStaging(c, w.run, w.hand, p);
  const staged = own ?? w.hand.draw('staging', { kind, who: watcher ? 'watcher' : 'person', manner }, s);
  put(w, 'staging', staged, 'act', { about: [p], ...(own ? {} : sit(w, staged)) });
  w.hand.avoid = avoidStage;
  putOn(w, 'staging', look, 'act');
  const face = ptr?.face && job === 'account' ? ptr.face : undefined;
  // "Mr. Ashby." to his face is a name too: not when the why has said it.
  const avoid = w.hand.avoid;
  // An evening with a side remark in it will name them again in the thought (the collision it makes): no "Mr. Stannard." to their face as well (docs/39 §4).
  const remarks = job === 'account' && (accountOf(c, p)?.remarks.length ?? 0) > 0;
  // docs/49: with the planner on, not when the staging has just said the name either: the thought will want it.
  const namedInStaging = PLAN.ops && (w.parts.staging ?? []).some((x) => x.text.includes(nameOf(c, p)));
  if (namedInWhy || remarks || namedInStaging) w.hand.avoid = alsoAvoid(avoid, /\{Title\}/);
  const asked = w.hand.draw('ask', { job, face: face ? 'yes' : 'no' }, withCaps({ ...s, reason: face }));
  // (An ask that says the reason to their face carries it: it stays.)
  put(w, 'ask', asked, 'exchange', { about: [p], ...(face ? {} : sit(w, asked)) });
  w.hand.avoid = avoid;
  const reaction = w.hand.draw('reaction', { job: job === 'check' ? 'account' : job, manner }, s);
  put(w, 'reaction', reaction, 'act', { about: [p], ...sit(w, reaction) });
}

export function writeAccount(w: Writer, p: PersonId): void {
  const { c } = w;
  const a = accountOf(c, p);
  if (!a) return;
  stageGuard(w, w.run.at);
  const q = `account:${p}`;
  const s = withCaps(who(c, p));
  const check = (sourceOfQ(c, w.before.asked, q) ?? '').startsWith('confront:');
  const ptr = whyHere(w, q, check ? 'check' : 'account', s);
  stageAndAsk(w, p, check ? 'check' : 'account', ptr);
  const said = spokenAccountLines(c, a, mannerOf(c, p), c.seed % 4);
  // docs/48 §3: the evening is the engine's, exactly; how they open and close it is their own.
  const v = worldAccountVoice(c, w.hand, p);
  // Their line for an hour goes after the part of the evening that tells that hour.
  const told: (SaidLine | { voice: string })[] = [...said];
  if (v.coda) {
    const at = said.findIndex((x) => new RegExp(`\\b${hourWord(v.codaHour as Hour)}\\b`, 'i').test(x.text));
    told.splice(at < 0 ? told.length : at + 1, 0, { voice: v.coda });
  }
  // docs/49: the answer a line a fact (the hours it tells), their own voice lines gaps, one quotation.
  answer(
    w,
    [...(v.open ? [{ voice: v.open }] : []), ...told].map((x) =>
      'voice' in x
        ? { text: x.voice, gap: true }
        : {
            text: x.text,
            about: [...new Set([p, ...(x.remark !== undefined ? (x.people ?? []) : x.hours.flatMap((h) => a.claims[h as Hour]?.company ?? []))])],
            carries: x.remark !== undefined ? [`remark:account:${p}#${x.remark}`] : x.hours.map((h) => `claim:${p}@${h}`),
          },
    ),
  );
  for (const h of c.board.hours) {
    w.told.add(`claim:${p}@${h}`);
    w.hours.add(h);
    for (const x of a.claims[h]?.company ?? []) w.people.add(x);
    w.places.add(a.claims[h]?.place ?? '');
  }
  a.remarks.forEach((r, i) => {
    w.told.add(`remark:account:${p}#${i}`);
    for (const f of r.facts) {
      w.hours.add(f.h);
      w.people.add(f.p);
    }
  });
  think(w, q);
  handOff(w, check);
  closeWith(w, p, 'account-close', {}, s);
  lay(w, check ? 'check' : 'account');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * "Who was here tonight?"
 * ------------------------------------------------------------------ */

export function writeList(w: Writer, watcher: PersonId): void {
  const { c } = w;
  const l = listOf(c, watcher);
  if (!l) return;
  stageGuard(w, w.run.at);
  const q = `list:${watcher}`;
  const s = withCaps({ ...who(c, watcher), job: jobWords(personOf(c, watcher)?.description ?? '') });
  whyHere(w, q, 'list', s);
  stageAndAsk(w, watcher, 'list', null, { job: s.job });
  // docs/48 §3: in the watcher's own words at either end.
  const lines = spokenListLines(c, l, c.seed % 4);
  const said = worldListVoice(c, w.hand, watcher, lines.map((x) => x.text), c.board.hours.filter((h) => l.entries[h] !== undefined), l.remarks.length);
  // docs/49: a line a fact (the hours it tells); the watcher's own opening line a gap. A line the
  // watcher says their own way keeps their words, and isn't aggregated.
  const opened = said.length === lines.length + 1;
  answer(
    w,
    said.map((text, i) => {
      const x = lines[opened ? i - 1 : i];
      if (!x) return { text, gap: true };
      const ppl = x.remark !== undefined ? (x.people ?? []) : x.hours.flatMap((h) => (l.entries[h as Hour] ?? []).flatMap((e) => ('person' in e ? [e.person] : [])));
      return {
        text,
        about: [watcher, ...ppl],
        carries: x.remark !== undefined ? [`remark:list:${watcher}#${x.remark}`] : x.hours.map((h) => `list:${watcher}@${h}`),
        place: l.place,
        ...(x.hour && text === x.text ? { agg: { key: 'list-hour', data: { ...x.hour }, hour: x.hours[0] } } : {}),
      };
    }),
    true,
  );
  // The handover: what was under the coat is the question anybody would ask, and the answer says no more than the watcher saw.
  if (l.remarks.some((r) => r.gives?.whereNow)) {
    const what = c.type === 'lost-pet' ? 'pet' : 'item';
    put(w, 'job', w.hand.draw('coat-q', {}, {}, { widen: true, plain: true }), 'exchange', { slot: 'ask' });
    const r = l.remarks.findIndex((x) => x.gives?.whereNow);
    fact(w, 'job', w.hand.draw('coat-a', { what }, withCaps({ ...s }), { plain: true }), 'answer', { about: [watcher], carries: [`remark:list:${watcher}#${r}`] });
  }
  for (const h of c.board.hours) {
    if (!l.entries[h]) continue;
    w.told.add(`list:${watcher}@${h}`);
    w.hours.add(h);
    for (const e of l.entries[h] ?? []) if ('person' in e) w.people.add(e.person);
  }
  l.remarks.forEach((r, i) => {
    w.told.add(`remark:list:${watcher}#${i}`);
    for (const f of r.facts) w.hours.add(f.h);
    for (const p of r.mentions?.people ?? []) w.people.add(p);
    for (const p of r.mentions?.places ?? []) w.places.add(p);
  });
  // A remark may name hours of its own ("I came on at ten", "the chloral … at seven").
  for (const h of c.board.hours) if (l.remarks.some((r) => r.text.includes(hourWord(h)))) w.hours.add(h);
  w.places.add(l.place);
  // A second story told earlier, and this list is where it said: they aren't on it.
  const extra: string[] = [];
  const refs: string[] = [];
  // The second story was an earlier page: at fact level the grid shows the collision, the thought doesn't.
  for (const putx of thoughtLevel(c) === 'fact' ? [] : w.run.puts.filter((x) => x.landed && !x.again)) {
    const k = confrontationOf(c, putx.person, putx.hour);
    if (k?.secondLie?.place !== l.place) continue;
    const es = l.entries[putx.hour] ?? [];
    if (es.some((e) => 'person' in e && e.person === putx.person)) continue;
    extra.push(`${nameOf(c, putx.person)}’s second story had ${markedPron(c, putx.person).him} ${l.place === w.run.at ? 'here' : `at ${placeName(c, l.place)}`} at ${oclock(putx.hour)}. ${nameOf(c, l.watcher)} didn’t have ${markedPron(c, putx.person).him}.`);
    refs.push(`second:${putx.person}@${putx.hour}`);
    w.hours.add(putx.hour);
    w.people.add(putx.person);
  }
  think(w, q, extra.length ? thoughtOnly(extra, refs) : null);
  handOff(w);
  closeWith(w, watcher, 'list-close', {}, s);
  lay(w, 'list');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * A search.
 * ------------------------------------------------------------------ */

function pastTense(s: string): string {
  return s.replace(/\bis\b/g, 'was').replace(/There’s/g, 'There was').replace(/\bhangs\b/g, 'hung');
}

export function writeSearch(w: Writer, findId: string): void {
  const { c } = w;
  const f = c.finds.find((x) => x.id === findId);
  if (!f) return;
  const vict = victimOf(c);
  const q = `search:${findId}`;
  const what = f.gives.why ? 'papers' : /table/.test(f.what) ? 'table' : /floor/.test(f.what) ? 'floor' : 'parlour';
  if (hasRole(w)) w.hand.hold(true);
  whyHere(w, q, f.gives.why ? 'papers' : 'search', withCaps({ client: clientOf(c).short, victim: vict.short, thing: vict.short }));
  const act = w.hand.draw('search-act', { what }, withCaps({ client: clientOf(c).short, victim: vict.short }), { widen: true });
  put(w, 'staging', act, 'act', { about: [c.crime.victim], ...sit(w, act) });
  // The client is at the scene, and watches: the page's reaction beat.
  if (!f.gives.why) {
    const watch = w.hand.draw('search-watch', { type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...who(c, c.client), client: clientOf(c).short, thing: vict.short }));
    put(w, 'reaction', watch, 'act', { about: [c.client], ...sit(w, watch) });
  }
  w.told.add(`find:${findId}`);
  if (f.gives.why) {
    // docs/47 B7: a page on each of them, a grievance on each page by name, and nobody's on top.
    // (docs/46 had the pages name nobody, which made the report's why a guess; before that, the one
    // on top named who.) At every tier: the papers say why, never who.
    fact(w, 'job', w.hand.draw('find-papers', { top: 'none' }, {}, { need: true }) ?? 'He had a page on every one of them, and a reason on every page.', 'find', { about: [c.crime.victim], carries: [`find:${findId}`] });
    const ps = whyOrder(c, suspectsOf(c));
    fact(w, 'job', ps.map((p) => papersLine(c, p, PLAN.ops)).join(' '), 'find', { about: ps, carries: ps.map((p) => `motive:${p}`), keepNames: true });
    for (const p of ps) w.people.add(p);
    w.people.add(c.crime.victim);
    const m = c.means.name.replace(/^(a|an) /, '');
    const V = vict.short;
    // Below Hard-boiled the reasons are set against the way to the means, by its place, when the
    // table has said where it came from; at fact level the thought stays on this page (docs/46 §2).
    const origin = placeName(c, c.means.origin);
    const tied = thoughtLevel(c) !== 'fact' && w.before.asked.some((x) => x.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === x)?.gives.means) && c.means.origin !== c.crime.scene;
    think(
      w,
      q,
      thoughtOnly(
        [
          tied
            ? w.hand.pick('papers-tied', [`Everybody in ${V}’s box had a reason. Fewer of them had been at ${origin} to get the ${m}.`, `A reason is the easy half. The other half was a way to the ${m}, and that was at ${origin}.`, `I put the pages back in their box. A grudge on paper is a long way from ${origin} and the ${m}.`])
            : w.hand.pick('papers-even', [`Everybody in ${V}’s box had a reason. A reason isn’t a hand on the ${m}.`, `A reason is the easy half. Everybody in ${V}’s box had one.`, `I put ${V}’s pages back in their box. A grudge on paper is a long way from the ${m}.`]),
        ],
        tied ? ['givens:found', `find:${c.finds.find((f) => f.gives.means)?.id ?? 'scene'}`] : ['givens:found'],
        { people: [c.crime.victim], places: tied ? [c.means.origin] : [] },
      ),
    );
    handOff(w);
    closeWith(w, undefined, 'search-close', {}, {});
    lay(w, 'search');
    return;
  }
  const origin = placeName(c, c.means.origin);
  const empty = isMurder(c) ? '' : pastTense(thingEmpty(c));
  const text = w.hand.draw('find', { means: c.setup?.means }, withCaps({ x: origin, victim: vict.short, empty, thing: vict.short }), { need: true });
  fact(w, 'job', text ?? f.text, 'find', { about: [c.crime.victim], carries: [`find:${findId}`], place: c.means.origin });
  w.places.add(c.means.origin);
  // What it means: where it came from, and that whoever used it had been there first.
  const hs = c.means.available;
  const win = (c.givens.window ?? c.crime.window).map(hourWord);
  let lead: string;
  let refs: string[];
  if (isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    lead =
      c.means.kind === 'gun'
        ? `So the gun came from ${origin}. ${vict.short} died at ${andList(win).replace(' and ', ' or ')}, and whoever fired it had been at ${origin} before that, to take it.`
        : c.means.kind === 'blade'
          ? `So the knife came from ${origin}. ${vict.short} died at ${andList(win).replace(' and ', ' or ')}, and whoever used it had been at ${origin} before that, to take it.`
          : `So the ${m} came from ${origin}, and ${m} takes ${c.means.delay[1] >= 60 ? 'twenty minutes to an hour' : 'a few minutes'} to do its work. Whoever brought it to ${vict.short} had been at ${origin} earlier, to get it.`;
    refs = ['givens:clock', 'givens:found'];
    for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  } else {
    const mode = c.setup?.means ?? '';
    const vars = c.givens.lines?.find((g) => g.kind === 'means')?.vars ?? {};
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    if (party) {
      lead = `So whoever it was knew the way in, and the people who knew were the ones at the ${party.occasion} in ${placeName(c, c.crime.scene)} at ${party.h0}. ${clientOf(c).short} had given me their names.`;
      w.hours.add(hs[0] as Hour);
    } else if (/^told/.test(mode)) {
      lead = `So it was somebody who’d heard ${clientOf(c).short} at ${vars.venue ?? placeName(c, c.means.origin)} between ${vars.h0} and ${vars.h2}, and had come here after. That made ${vars.venue ?? placeName(c, c.means.origin)} the place to start counting.`;
      for (const h of hs) w.hours.add(h);
      w.hours.add(Math.max(...hs) + 1);
    } else {
      // Raw 11's #14: "whoever it was" once a page is plenty, and the key is where the office said it was.
      const key = SPARE_KEY[mode]?.at.replace('{x}', origin) ?? `at ${origin}`;
      lead = `So the key that let them in was the spare, and the spare lived ${key}.`;
    }
    refs = ['givens:means'];
  }
  think(w, q, thoughtOnly([lead], refs, { places: [c.means.origin] }));
  handOff(w);
  closeWith(w, undefined, 'search-close', {}, {});
  lay(w, 'search');
}

function thingEmpty(c: BoardCase): string {
  const line = c.finds.find((f) => f.gives.means)?.text ?? '';
  // The find's first sentence is the empty basket or dome.
  return line.split(/(?<=\.)\s/)[0] ?? '';
}

/* ------------------------------------------------------------------ *
 * The victim, or the thing: a suspect's reason, in their own words.
 * ------------------------------------------------------------------ */

export function writeMotive(w: Writer, p: PersonId): void {
  const { c } = w;
  const person = personOf(c, p);
  if (!person) return;
  const vict = victimOf(c);
  const cl = clientOf(c);
  const vars = c.givens.lines?.find((g) => g.kind === 'gone')?.vars ?? {};
  const s = withCaps({ ...who(c, p), victim: vict.short, thing: vict.short, client: cl.short, breed: vars.breed, pthem: vars.pthem ?? 'it' });
  const q = `motive:${p}`;
  const ptr = threadFor(c, w.before, `account:${p}`, w.run.at);
  license(w, ptr);
  // (docs/49: the card's "how he felt" is theirs, whoever else its pointer names.)
  const msrc = ptr.clause || `${person.short} was in the room`;
  const mwhy = w.hand.draw('why', { kind: 'motive' }, withCaps({ ...s, src: msrc }), { plain: true });
  put(w, 'why', mwhy, 'narrator', { ...(PLAN.ops ? { about: [p] } : {}), ...sit(w, mwhy, `${cap(msrc)}.`) });
  const look = setUp(w, p);
  const staged = w.hand.draw('staging', { kind: stageKind(c, w.run.at), who: 'person', manner: mannerOf(c, p) }, s);
  put(w, 'staging', staged, 'act', { about: [p], ...sit(w, staged) });
  putOn(w, 'staging', look, 'act');
  const mask = w.hand.draw('motive-ask', {}, s, { widen: true });
  put(w, 'ask', mask, 'act', { about: [p], ...sit(w, mask) });
  const mreact = w.hand.draw('reaction', { job: 'motive', manner: mannerOf(c, p) }, s);
  put(w, 'reaction', mreact, 'act', { about: [p], ...sit(w, mreact) });
  fact(w, 'job', w.hand.draw('motive', { id: person.motiveId }, s, { need: true }) ?? `“${cap(person.motive ?? 'Nothing')}.”`, 'answer', { about: [p], carries: [`motive:${p}`] });
  // The thought: the reason against what the office said, and against the hours that matter.
  const aside = c.givens.lines?.find((g) => g.kind === 'aside');
  const inAside = !!aside && Object.entries(aside.vars).some(([k, v]) => /^p\d+$/.test(k) && v === person.short);
  const pointerSaid = c.givens.pointer === p && /motive|gossip/.test(c.setup?.pointer ?? '');
  const sentences: (string | Gloss)[] = [`That was ${person.short}’s reason, in ${markedPron(c, p).his} own words.`];
  const refs: string[] = [];
  // docs/47 C13: said as a detective thinks it, never as the form asks it ("the report wants both").
  const notHour = w.hand.pick('reason-hour', ['A reason isn’t an hour, though.', 'Plenty of people have a reason. Fewer have the hour to go with it.', 'A reason is the easy half.']);
  if (inAside || pointerSaid) {
    sentences.push(`It was what ${cl.short} had said in the office, near enough.`, { gloss: notHour });
    refs.push(pointerSaid ? 'givens:pointer' : 'givens:aside');
  } else {
    sentences.push(`${cl.short} hadn’t mentioned it.`, { gloss: notHour });
    refs.push('givens:pointer');
  }
  w.people.add(c.client);
  // At fact level the thought doesn't reach back to their evening, an earlier page.
  if (w.run.asked.includes(`account:${p}`) && thoughtLevel(c) !== 'fact') {
    const hc = crimeHourKnown(c, w.run);
    const hs = hc !== null ? [hc] : (c.givens.window ?? c.crime.window);
    sentences.push(`For ${andList(hs.map(hourWord))}, ${markedPron(c, p).he} had told me ${andList(hs.map((h) => claimSaid(c, p, h)))}.`);
    refs.push(...hs.map((h) => `claim:${p}@${h}`));
    for (const h of hs) w.hours.add(h);
    for (const h of hs) w.places.add(accountOf(c, p)?.claims[h]?.place ?? '');
  }
  think(w, q, thoughtOnly(sentences, refs, { rel: inAside || pointerSaid ? 'confirms' : 'new', people: [p, c.client] }));
  closeWith(w, p, 'motive-close', {}, s);
  w.people.add(c.crime.victim);
  lay(w, 'motive');
}

/* ------------------------------------------------------------------ *
 * Put it to them.
 * ------------------------------------------------------------------ */

export function writeConfront(w: Writer, p: PersonId, h: Hour, line: Line, j: Judgement, again: boolean): void {
  const { c } = w;
  if (hasRole(w, p)) w.hand.hold(true);
  const s = withCaps({ ...who(c, p) });
  const claimLine = again ? `${placeName(c, confrontationOf(c, p, h)?.secondLie?.place ?? '')} at ${hourWord(h)}` : claimSaid(c, p, h);
  // Why: their line and what's held against it.
  const src = line.q === 'givens' ? 'the office' : sourceName(c, line.q).replace(/’s story$/, '’s own evening');
  const psrc = `${nameOf(c, p)} had told me ${claimLine}, and ${src} said otherwise`;
  const pwhy = w.hand.draw('why', { kind: 'put' }, withCaps({ ...s, src: psrc, claim: claimLine }), { plain: true });
  put(w, 'why', pwhy, 'narrator', { about: [p], ...sit(w, pwhy, `${cap(psrc)}.`) });
  const pstage = w.hand.draw('put-stage', {}, s);
  put(w, 'staging', pstage, 'act', { about: [p], ...sit(w, pstage) });
  // Said to their face: "Tillman passed you on Avenue B", not "passed Hargrove".
  const toYou = (t: string) => t.replace(new RegExp(`\\b(passed|had|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '$1 you');
  // Two people who give each other for company are said once: "Rosenbaum and Broadnax had each other at the Blue Lantern at ten o’clock."
  const other = (j.with ?? [])[0];
  const mutual =
    (j.with ?? []).length === 1 && other && line.kind === 'claim' && other.kind === 'claim' && line.place === other.place && line.hour === other.hour && line.about.includes(other.speaker as string) && other.about.includes(line.speaker as string);
  const breaker = mutual
    ? `${nameOf(c, line.speaker as string)} and ${nameOf(c, other.speaker as string)} had each other at ${placeName(c, line.place as string)} at ${oclock(line.hour as Hour)}.`
    : toYou(`${cap(breakSaid(c, line, p, w.run.asked))}.${(j.with ?? []).length > 0 ? ` ${cap(andList((j.with ?? []).map((x) => breakSaid(c, x, p, w.run.asked))))}.` : ''}`);
  fact(w, 'ask', w.hand.draw('put', {}, withCaps({ ...s, claim: claimLine, breaker }), { widen: true, plain: true }) ?? `“You told me ${claimLine},” I said. “${breaker}”`, 'exchange', {
    relation: 'collides',
    about: [p, ...c.people.filter((x) => !x.object && breaker.includes(x.short)).map((x) => x.id)],
    hour: h,
    carries: [`claim:${p}@${h}`, line.id, ...(j.with ?? []).map((x) => x.id)],
  });
  w.hours.add(h);
  w.people.add(p);
  // A face the breaker names ("the only one in a fur collar was Steinbach") came from a held evening.
  for (const x of c.people) if (!x.object && breaker.includes(x.short)) w.people.add(x.id);
  for (const x of [line, ...(j.with ?? [])]) {
    for (const y of x.about) w.people.add(y);
    if (x.speaker) w.people.add(x.speaker);
    if (x.place) w.places.add(x.place);
    w.told.add(x.id);
  }
  const lineRef = [line.id];
  const done = (family: string, thought: (string | Gloss)[], refs: string[], rel: Relation = 'new') => {
    think(w, `confront:${p}@${h}`, thoughtOnly(thought, refs, { rel, people: [p] }));
    handOff(w);
    closeWith(w, p, family, {}, s);
    lay(w, 'put');
  };
  if (!j.landed) {
    const how = w.hand.draw('react', { response: 'held' }, s, { widen: true });
    react(w, p, how ?? `${nameOf(c, p)} heard me out.`, '“That doesn’t touch anything I told you.”', `held:${p}@${h}`, 'new', sit(w, how));
    done('held-close', [j.why ?? ''].filter(Boolean), lineRef);
    return;
  }
  const k = confrontationOf(c, p, h);
  if (!k) return;
  const lie = c.lies.find((l) => l.person === p && l.hour === h);
  const pr = markedPron(c, p);
  if (again) {
    // A second story put back: the culprit holds to it, as a refusal.
    const how = w.hand.draw('react', { response: 'refuse' }, s, { widen: true });
    const howSit = sit(w, how);
    react(w, p, how ?? '', w.hand.draw('refuse-words', { who: 'culprit' }, s, { widen: true }) ?? '“I’ve told you where I was.”', `refused:${p}@${h}`, 'new', howSit);
    done('refuse-close', [`${nameOf(c, p)}’s second story had a list against it now, and ${pr.he} had nothing to put in its place.`, { gloss: aside(w, 'silence', ['Silence isn’t a confession. It isn’t an evening either.', 'Silence isn’t an evening.', 'Saying nothing isn’t a confession, and it isn’t an evening either.']) }], lineRef);
    return;
  }
  if (k.response === 'admit' && lie) {
    const y = (k.names ?? [])[0];
    const ys = y ? withCaps({ witness: nameOf(c, y), wthem: pronOf(c, y).him }) : {};
    const words = w.hand.draw('admit-words', { place: placeOf(c, lie.truth)?.key }, withCaps({ ...s, ...ys, claim: placeName(c, lie.claim), truth: placeName(c, lie.truth) }), { need: true });
    const how = w.hand.draw('react', { response: 'admit' }, s, { widen: true });
    react(w, p, how ?? '', words ?? '', `admit:${p}@${h}`, 'new', sit(w, how));
    if (y) w.people.add(y);
    w.places.add(lie.truth);
    w.places.add(lie.claim);
    const claimWhere = personOf(c, p)?.home === lie.claim ? 'home' : placeName(c, lie.claim);
    done(
      'admit-close',
      y
        ? [
            `That was a hole in ${nameOf(c, p)}’s story, all right.`,
            { gloss: aside(w, 'owned-up', ['I wasn’t sure yet it was the one I was looking for. An owned-up story is only as good as whoever’s in it with you.', 'An owned-up story is only as good as whoever’s in it with you.', 'I wasn’t sure yet it was the one I wanted.', 'Whether it was the hole I was looking for, I couldn’t say yet. A story like that leans on whoever’s in it with you.']) },
            `If it held, ${pr.he} had been at ${placeName(c, lie.truth)} at ${hourWord(h)}, not ${claimWhere === 'home' ? 'home' : `at ${claimWhere}`}.`,
          ]
        : [`${nameOf(c, p)} owned up to ${placeName(c, lie.truth)} at ${hourWord(h)}. Nobody had said so but ${pr.him}.`],
      lineRef,
    );
    return;
  }
  if (k.response === 'second-lie' && k.secondLie?.place) {
    const alt = placeName(c, k.secondLie.place);
    const how = w.hand.draw('react', { response: 'second-lie' }, s, { widen: true });
    react(w, p, how ?? '', `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${alt}.”`, `second:${p}@${h}`, 'new', sit(w, how));
    w.places.add(k.secondLie.place);
    const watcher = c.lists.find((l) => l.place === k.secondLie?.place)?.watcher;
    const met = watcher ? knownPeople(c, w.run).has(watcher) : false;
    done('second-close', [`A second story, and ${alt} at ${hourWord(h)} was a place with somebody paid to watch it. ${met && watcher ? `${nameOf(c, watcher)} would know.` : `Whoever kept the room at ${alt} would know.`}`], lineRef);
    if (met && watcher) w.people.add(watcher);
    return;
  }
  if (k.response === 'crack') {
    const holder = c.crime.whereNow?.text.replace(/, at .*$/, '').replace(/^with /, '') ?? 'somebody';
    const first = k.secondLie?.place ? `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${placeName(c, k.secondLie.place)}.” It was thin, and ${pr.he} knew it. ` : '';
    const how = w.hand.draw('react', { response: 'crack' }, s, { widen: true });
    react(w, p, how ?? '', `${first}“All right. I took it. It’s with ${holder}. ${crackWhy(c, p)}”`, `crack:${p}@${h}`, 'narrows', sit(w, how));
    if (k.secondLie?.place) w.places.add(k.secondLie.place);
    w.places.add(c.crime.whereNow?.place ?? '');
    // Raw 11's #8: no "the where", and when the holder is in this room, the page looks at him.
    const holderHere = c.crime.whereNow?.place === w.run.at;
    done(
      'crack-close',
      [`So ${victimOf(c).short} was with ${shortOther(holder).replace(/,.*$/, '')}, ${holderHere ? 'who was sitting ten feet away and hadn’t looked up once' : `at ${placeName(c, c.crime.whereNow?.place ?? '')}`}.`, { gloss: `That was what ${clientOf(c).short} had paid for.` }],
      ['givens:gone'],
      'narrows',
    );
    w.people.add(c.client);
    return;
  }
  // A refusal: the same words and the same weight, guilty or not.
  // The pair's liar says whose flat it was, as the story had it; everybody else draws from one pool.
  const pairMate = lie?.kind === 'pair' ? accountOf(c, p)?.claims[h]?.company[0] : undefined;
  const partner = pairMate ? nameOf(c, pairMate) : undefined;
  const words = w.hand.draw('refuse-words', { who: partner ? 'pair' : 'any' }, withCaps({ ...s, crime: isMurder(c) ? 'kill anybody' : 'take anything', partner }), { need: true });
  const how = w.hand.draw('react', { response: 'refuse' }, s, { widen: true });
  react(w, p, how ?? '', words ?? '“I’ve told you where I was.”', `refused:${p}@${h}`, 'new', sit(w, how));
  if (pairMate) w.people.add(pairMate);
  // docs/47 B10: a refusal points somewhere. Wherever they really were, somebody saw them there.
  const claimed = personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? accountOf(c, p)?.claims[h]?.place ?? '')}`;
  done(
    'refuse-close',
    [
      `${nameOf(c, p)}’s ${hourWord(h)} o’clock still had ${src} against it, and nothing new beside it.`,
      { gloss: aside(w, 'refusal', ['A refusal isn’t a confession.', 'Saying nothing isn’t saying it.', 'A refusal is only a refusal, whoever makes it.']) },
      `But if ${pr.he} wasn’t ${claimed} at ${hourWord(h)}, somebody saw ${pr.him} where ${pr.he} was, and if nobody had, that would say something too.`,
    ],
    lineRef,
  );
}

/**
 * docs/49: an answer, one quotation, a line a unit: the lines that tell an hour or a remark are
 * facts (exempt from the name count, as a list or an account has to name people), their own voice
 * lines inside the quotation are gaps.
 */
function answer(w: Writer, lines: { text: string; gap?: boolean; about?: string[]; carries?: string[]; place?: string; agg?: Item['agg'] }[], list = false): void {
  const kept = lines.filter((x) => x.text);
  kept.forEach((x, i) => {
    const text = `${i === 0 ? '“' : ''}${x.text}${i === kept.length - 1 ? '”' : ''}`;
    const run = i > 0;
    if (x.gap) put(w, 'job', text, 'answer', { slot: 'voice', exempt: true, speech: true, runOn: run, ...(list ? { barrier: true } : {}) });
    else
      fact(w, 'job', text, 'answer', {
        about: x.about ?? [],
        carries: x.carries ?? [],
        ...(x.place ? { place: x.place } : {}),
        ...(x.agg ? { agg: x.agg } : {}),
        speech: true,
        exempt: true,
        runOn: run,
        ...(list ? { barrier: true } : {}),
      });
  });
}

/**
 * How they take it (a card, texture) and what they say (the fact: an admission, a refusal, a second
 * story, a crack). docs/49: the two are a gap and a fact, in one paragraph.
 */
function react(w: Writer, p: PersonId, how: string, said: string, carries: string, relation: Relation = 'new', howSit: Pick<Item, 'sit'> = {}): void {
  put(w, 'reaction', how, 'exchange', { about: [p], ...howSit });
  fact(w, 'reaction', said, 'exchange', { about: [p], carries: [carries], relation, runOn: (w.parts.reaction ?? []).length > 0 });
}

/** A small case's culprit, cracking: why, in a word or two of their own. */
function crackWhy(c: BoardCase, p: PersonId): string {
  const m = personOf(c, p)?.motive ?? '';
  const head = m.split(/, and /)[0] ?? m;
  const female = personOf(c, p)?.female === true;
  let s = head
    .replace(/^(he|she) is\b/, 'I’m')
    .replace(/^(he|she) owes\b/, 'I owe')
    // docs/48: a reason from the bible starts the same way.
    .replace(/^(he|she) has\b/, 'I’ve')
    .replace(/^(he|she) says\b/, 'I say')
    .replace(/^(he|she) works\b/, 'I work')
    .replace(/^(he|she) lost\b/, 'I lost');
  s = female ? s.replace(/\bher\b/g, 'my') : s.replace(/\bhis\b/g, 'my');
  return `${cap(s)}.`;
}

/* ------------------------------------------------------------------ *
 * A question already asked: read back, free.
 * ------------------------------------------------------------------ */

export function writeRepeat(w: Writer, q: string): void {
  const { c } = w;
  const [kind, rest] = q.split(':') as [string, string];
  const lines = linesHeld(c, w.run).filter((l) => l.q === q);
  put(w, 'why', kind === 'search' ? 'I’d been over it already. What it had to say was in the notebook.' : `I’d asked ${nameOf(c, rest)} that already. It was in the notebook, as ${pronOf(c, rest).he} said it:`, 'narrator');
  const text = lines.map((l) => l.text).join(' ');
  fact(w, 'job', text, 'narrator', { about: [...new Set(lines.flatMap((l) => [...l.about, ...(l.speaker ? [l.speaker] : [])]))], carries: lines.map((l) => l.id), keepNames: true });
  for (const l of lines) {
    w.told.add(l.id);
    if (l.hour !== undefined) w.hours.add(l.hour);
    for (const p of l.about) w.people.add(p);
    if (l.speaker) w.people.add(l.speaker);
    if (l.place) w.places.add(l.place);
  }
  lay(w, 'repeat');
}

/* ------------------------------------------------------------------ *
 * The report: the form, and where I sat to fill it in.
 * ------------------------------------------------------------------ */

export function writeReport(w: Writer): void {
  const c = w.c;
  const s = solveRun(c, w.run);
  const at = w.run.at;
  const rstage = w.hand.draw('report-stage', { kind: stageKind(c, at) }, withCaps({ place: at === OFFICE ? 'the office' : placeName(c, at) }), { plain: true });
  put(w, 'staging', rstage ?? 'I sat down with the form.', 'act', sit(w, rstage));
  // Whether what's held is enough is the player's to say above a walk (docs/46 §2): the form gets no hint.
  // (docs/51: at a walk the why says whether it's enough, and it stays.)
  const rwhy = w.hand.draw('report-why', { done: thoughtLevel(c) !== 'walk' ? 'open' : s.done ? 'yes' : 'no' }, {}, { plain: true });
  put(w, 'why', rwhy, 'narrator', thoughtLevel(c) !== 'walk' ? sit(w, rwhy) : {});
  // At Raw, the elimination not walked yet tonight is walked here, before the form (docs/47 B11).
  const el = walkedElimination(w, true);
  if (el) {
    license(w, el);
    fact(w, 'thought', el.sentences.join(' '), 'thought', { relation: 'narrows', about: el.people, carries: el.refs });
  }
  // The office's prop, paid off: the night began there.
  const prop = w.run.prop;
  const fresh = prop?.pay.filter((l) => !w.hand.used(`pay:${l.slice(0, 40)}`)) ?? [];
  if (prop && fresh.length && w.hand.jokeFree) {
    const l = fresh[w.hand.rng.int(fresh.length)] as string;
    w.hand.note(`pay:${l.slice(0, 40)}`);
    w.hand.joke();
    w.callback = true;
    put(w, 'close', l, 'thought');
  } else {
    const rclose = w.hand.draw('report-close', {}, {}, { widen: true, joke: true });
    put(w, 'close', rclose, 'thought', sit(w, rclose));
  }
  lay(w, 'report');
}


/* ------------------------------------------------------------------ *
 * The recap: "Go over what I have", and the turn.
 * ------------------------------------------------------------------ */

export interface Clause {
  key: string;
  text: string;
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
}

/**
 * What the notebook adds up to, clause by clause. Never a verdict: placed,
 * said, couldn't say. docs/46 §2: at link level the hour stops at the link
 * (the office's two hours and the sighting), and at fact level it's only what's
 * held and what's open, with nothing joined to anything.
 */
export function recapClauses(d: BoardDeal, run: BoardRun): Clause[] {
  const c = d.kase;
  const level = thoughtLevel(c);
  if (level === 'fact') return factClauses(d, run);
  const s = solveHeld(c, solverHeld(run));
  const out: Clause[] = [];
  const hc = s.possibleHours.length === 1 ? (s.possibleHours[0] as Hour) : null;
  // A lost pet went, as "he" or "she"; a thing went, as "it" (docs/47 B9).
  const what = isMurder(c) ? 'It happened' : `${pronOf(c, c.crime.victim).He} went`;
  const office = c.givens.window ?? c.crime.window;
  // docs/47 B8: only the people the night has named are in the notebook's sentences.
  const known = knownPeople(c, run);
  const named = suspectsOf(c).filter((p) => known.has(p));
  // Narrowed from the office's two hours by a sighting: above a walk, the two side by side.
  const gone = hc !== null && office.length > 1 && level === 'link' ? office.filter((h) => h !== hc).map((h) => ({ h, x: s.placed.get(`${c.crime.victim}@${h}`) })).find((y) => y.x && y.x.place !== c.crime.scene) : undefined;
  if (gone?.x) {
    const v = victimOf(c).short;
    const two = `${hourWord(office[0] as Hour)} or ${hourWord(office[1] as Hour)}`;
    // The client said the hours, in the office (Medium 14's #9: "Hauck said it, not the office").
    const cl = clientOf(c).short;
    out.push({
      key: 'when',
      text: isMurder(c) ? `${cl} had said ${two}, and ${v} was at ${placeName(c, gone.x.place)} at ${hourWord(gone.h)}, alive.` : `${cl} had said ${two}, and at ${hourWord(gone.h)} ${v} was at ${placeName(c, gone.x.place)}.`,
      hours: [...office],
      people: [c.crime.victim, c.client],
      places: [gone.x.place],
    });
  } else
    out.push(
      hc !== null
        ? { key: 'when', text: `${what} at ${oclock(hc)}.`, hours: [hc], people: [], places: [] }
        : { key: 'when', text: `${what} at ${hourWord(s.possibleHours[0] as Hour)} or ${oclock(s.possibleHours[1] as Hour)}, and I didn’t know which yet.`, hours: [...s.possibleHours], people: [], places: [] },
    );
  const meansHeld = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (meansHeld && isMurder(c)) {
    out.push({ key: 'means', text: `The ${c.means.name.replace(/^(a|an) /, '')} came from ${placeName(c, c.means.origin)}, so whoever used it had been there first.`, hours: [], people: [], places: [c.means.origin] });
  }
  if (c.tier >= 1 && (s.accessYes.size > 0 || s.accessNo.size > 0)) {
    const yes = named.filter((p) => s.accessYes.has(p)).map((p) => nameOf(c, p));
    const no = named.filter((p) => s.accessNo.has(p)).map((p) => nameOf(c, p));
    const at = placeName(c, c.means.origin);
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    const told = /^told/.test(c.setup?.means ?? '');
    const were = (xs: string[]) => (xs.length > 1 ? 'were' : 'was');
    const bits: string[] = [];
    if (isMurder(c)) {
      // Plain speech, not the board read aloud ("while the laudanum was there", Poached 5).
      if (yes.length) bits.push(`${andList(yes)} had been at ${at} earlier, when the ${c.means.name.replace(/^(a|an) /, '')} was there for the taking`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    } else if (party) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at the ${party.occasion} and knew the way in`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else if (told) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at ${at} while ${clientOf(c).short} told the room`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else {
      if (yes.length) bits.push(`${andList(yes)} had been in at ${at} earlier, when the spare key was there for the taking`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    }
    if (bits.length) out.push({ key: 'access', text: `${cap(bits.join('; '))}.`, hours: [], people: named.filter((p) => s.accessYes.has(p) || s.accessNo.has(p)), places: [c.means.origin] });
  }
  // Above a walk, when the office gave two hours, every clause is about both: which one it was is the player's to say.
  const twoHours = level === 'link' && office.length > 1;
  const hs = twoHours ? [...office] : hc !== null ? [hc] : [...s.possibleHours];
  // Whose word a placement rests on, as people say it: "Alfano said so", "Mrs. Whitfield and Ellery said so".
  const saidSo = (qs: string[]) => {
    const who = [...new Set(qs.map((q) => sourceName(c, q).replace(/’s (list|story|word)$/, '')))];
    return `${andList(who)} said so`;
  };
  // Nobody's word yet, for several people at the same hours: one clause, not one each (Poached 5's #15).
  const open: PersonId[] = [];
  for (const p of named) {
    const placed = hs.map((h) => ({ h, x: s.placed.get(`${p}@${h}`) })).filter((y) => y.x && y.x.place !== c.crime.scene && y.x.deps.some((dq) => dq !== `account:${p}`));
    const st = hs.map((h) => ({ h, st: s.status.get(`${p}@${h}`) })).find((y) => y.st?.s === 'broken');
    if (st) {
      const cl = accountOf(c, p)?.claims[st.h];
      const by = st.st?.deps.find((dq) => dq !== `account:${p}` && !dq.startsWith('confront:'));
      out.push({ key: `broken:${p}`, text: `${nameOf(c, p)} had told me ${personOf(c, p)?.home === cl?.place ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(st.h)}, and ${by ? sourceName(c, by) : 'what I had'} said otherwise.`, hours: [st.h], people: [p, ...sourcePeople(by)], places: [cl?.place ?? ''] });
      const k = c.confrontations.find((x) => x.person === p && x.hour === st.h);
      if (k && run.asked.includes(`confront:${p}@${st.h}`)) {
        const lie = c.lies.find((l) => l.person === p && l.hour === st.h);
        if (k.response === 'admit' && lie) {
          const y = (k.names ?? [])[0];
          const checked = y ? run.asked.includes(`account:${y}`) : false;
          out.push({ key: `admit:${p}`, text: `${nameOf(c, p)} owned up to ${placeName(c, lie.truth)}${y ? `, with ${nameOf(c, y)}` : ''}${y && !checked ? `, and ${nameOf(c, y)} could say whether that was so` : ''}.`, hours: [], people: [p, ...(y ? [y] : [])], places: [lie.truth] });
        } else if (k.response === 'second-lie' && k.secondLie?.place) {
          const again = run.puts.some((x) => x.person === p && x.hour === st.h && x.again && x.landed);
          out.push({
            key: `second:${p}`,
            text: again
              ? `Put to it, ${nameOf(c, p)} had a second story, ${placeName(c, k.secondLie.place)}; that didn’t hold either, and ${pronOf(c, p).he} wouldn’t say more.`
              : `Put to it, ${nameOf(c, p)} had a second story: ${placeName(c, k.secondLie.place)}.`,
            hours: [],
            people: [p],
            places: [k.secondLie.place],
          });
        } else if (k.response !== 'crack') {
          out.push({ key: `refused:${p}`, text: `${nameOf(c, p)} wouldn’t say where ${pronOf(c, p).he} had been instead.`, hours: [], people: [p], places: [] });
        }
      }
      continue;
    }
    const pl = placed[0];
    if (twoHours) {
      const P = nameOf(c, p);
      if (pl?.x) {
        // Placed at one of the two hours or both, by somebody else's word.
        const bys = [...new Set(placed.map((y) => y.x?.deps.find((dq) => dq !== `account:${p}`) as string))];
        const same = placed.length > 1 && placed.every((y) => y.x?.place === pl.x?.place);
        const at = same ? `${placeName(c, pl.x.place)} at ${andList(placed.map((y) => hourWord(y.h)))}` : andList(placed.map((y) => `${placeName(c, y.x?.place ?? '')} at ${hourWord(y.h)}`));
        out.push({
          key: `placed:${p}`,
          text: `${P} was at ${at}; ${saidSo(bys)}.`,
          hours: placed.map((y) => y.h),
          people: [p, ...bys.flatMap((by) => sourcePeople(by))],
          places: placed.map((y) => y.x?.place ?? ''),
        });
      } else if (!run.asked.includes(`account:${p}`)) {
        open.push(p);
      } else {
        // "Home at nine and ten", not "Thorndike’s flat at nine and Thorndike’s flat at ten" (Medium 14's #29).
        const wh = hs.map((h) => claimSaid(c, p, h).replace(/ at \w+$/, ''));
        const said = wh.every((x) => x === wh[0]) ? `${wh[0]} at ${andList(hs.map(hourWord))}` : andList(hs.map((h) => claimSaid(c, p, h)));
        out.push({ key: `own:${p}`, text: `${P} said ${said}, and nobody else had said so yet.`, hours: [...hs], people: [p], places: hs.map((h) => accountOf(c, p)?.claims[h]?.place ?? '') });
      }
      continue;
    }
    if (pl?.x && placed.length === hs.length) {
      const by = pl.x.deps.find((dq) => dq !== `account:${p}`) as string;
      out.push({ key: `placed:${p}`, text: `${nameOf(c, p)} was at ${placeName(c, pl.x.place)} at ${hourWord(pl.h)}; ${saidSo([by])}.`, hours: [pl.h], people: [p, ...sourcePeople(by)], places: [pl.x.place] });
    } else if (hc !== null && !run.asked.includes(`account:${p}`)) {
      open.push(p);
    } else if (hc !== null) {
      out.push({ key: `own:${p}`, text: `${nameOf(c, p)} said ${claimSaid(c, p, hc)}, and nobody else had said so yet.`, hours: [hc], people: [p], places: [accountOf(c, p)?.claims[hc]?.place ?? ''] });
    }
  }
  const ohs = twoHours ? [...office] : hc !== null ? [hc] : [];
  if (open.length > 0 && ohs.length > 0) {
    const at = ohs.length > 1 ? `${hourWord(ohs[0] as Hour)} or ${hourWord(ohs[1] as Hour)}` : hourWord(ohs[0] as Hour);
    const one = open.length === 1 ? (open[0] as PersonId) : undefined;
    out.push({
      key: `open:${open.join(',')}`,
      text: one
        ? `${nameOf(c, one)} hadn’t told me where ${pronOf(c, one).he} was at ${at}, and nobody else had either.`
        : `${andList(open.map((p) => nameOf(c, p)))} hadn’t told me where they were at ${at}, and nobody else had either.`,
      hours: ohs,
      people: [...open],
      places: [],
    });
  }
  if (!isMurder(c) && s.whereNow && c.crime.whereNow) {
    const v = victimOf(c).short;
    // Said only as far as it's held (docs/44): a crack says whose it is; the watcher saw a coat.
    const cracked = c.confrontations.some((k) => k.response === 'crack' && run.asked.includes(`confront:${k.person}@${k.hour}`));
    const holder = shortOther(c.crime.whereNow.text.replace(/^with /, '').replace(/, at .*$/, ''));
    const remark = c.lists.flatMap((l) => l.remarks).find((r) => r.gives?.whereNow);
    const hh = /^(\w+):/.exec(remark?.text ?? '')?.[1]?.toLowerCase();
    out.push(
      cracked || !hh
        ? { key: 'where', text: `${cap(v)} ${/^the \w+s$/.test(v) ? 'were' : 'was'} ${c.crime.whereNow.text}.`, hours: [], people: [c.crime.victim], places: [c.crime.whereNow.place] }
        : { key: 'where', text: `And whatever it was had gone to ${holder} at ${placeName(c, c.crime.whereNow.place)} at ${hh}.`, hours: hh === 'eleven' ? [11] : hh === 'ten' ? [10] : [], people: [], places: [c.crime.whereNow.place] },
    );
  }
  return out;
}

/**
 * docs/46 §2, fact level (Hard-boiled): what's held and what's open, and
 * nothing joined to anything. The office's hours, where the means came from,
 * whose evenings and lists I had, what anybody said when it was put to them,
 * and whose evenings I still didn't have.
 */
function factClauses(d: BoardDeal, run: BoardRun): Clause[] {
  const c = d.kase;
  const out: Clause[] = [];
  const office = c.givens.window ?? c.crime.window;
  const cl = clientOf(c).short;
  out.push({ key: 'when', text: office.length > 1 ? `${cl} had said ${hourWord(office[0] as Hour)} or ${oclock(office[1] as Hour)}.` : `${cl} had said ${oclock(office[0] as Hour)}.`, hours: [...office], people: [c.client], places: [] });
  const meansHeld = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (meansHeld && isMurder(c)) out.push({ key: 'means', text: `The ${c.means.name.replace(/^(a|an) /, '')} had come from ${placeName(c, c.means.origin)}.`, hours: [], people: [], places: [c.means.origin] });
  const evenings = run.asked.filter((q) => q.startsWith('account:')).map((q) => q.slice(8));
  const lists = run.asked.filter((q) => q.startsWith('list:')).map((q) => q.slice(5));
  const bits: string[] = [];
  if (evenings.length) bits.push(`${evenings.length > 1 ? 'evenings' : 'an evening'} from ${andList(evenings.map((p) => nameOf(c, p)))}`);
  if (lists.length) bits.push(`${lists.length > 1 ? 'lists' : 'a list'} from ${andList(lists.map((p) => nameOf(c, p)))}`);
  if (bits.length) out.push({ key: 'held', text: `I had ${bits.join(', and ')}.`, hours: [], people: [...evenings, ...lists], places: [] });
  for (const putx of run.puts.filter((x) => x.landed && !x.again)) {
    const k = confrontationOf(c, putx.person, putx.hour);
    if (!k) continue;
    const name = nameOf(c, putx.person);
    const again = run.puts.some((x) => x.person === putx.person && x.hour === putx.hour && x.again && x.landed);
    if (k.response === 'second-lie' && k.secondLie?.place) out.push({ key: `second:${putx.person}`, text: again ? `Put to it, ${name} had a second story, ${placeName(c, k.secondLie.place)}, and when that was put back ${pronOf(c, putx.person).he} wouldn’t say more.` : `Put to it, ${name} had a second story: ${placeName(c, k.secondLie.place)}.`, hours: [], people: [putx.person], places: [k.secondLie.place] });
    else if (k.response !== 'crack' && k.response !== 'admit') out.push({ key: `refused:${putx.person}`, text: `Put to it, ${name} wouldn’t say where ${pronOf(c, putx.person).he} had been instead.`, hours: [], people: [putx.person], places: [] });
  }
  // docs/47 B8: only the people the night has named.
  const known = knownPeople(c, run);
  const open = suspectsOf(c).filter((p) => !evenings.includes(p) && known.has(p));
  const owners = open.map((p) => `${nameOf(c, p)}’s`);
  const orList = owners.length > 1 ? `${owners.slice(0, -1).join(', ')} or ${owners[owners.length - 1]}` : (owners[0] ?? '');
  if (open.length) out.push({ key: 'open', text: `I didn’t have ${orList} evening${open.length > 1 ? 's' : ''} yet.`, hours: [], people: open, places: [] });
  return out;
}

/** Whose word a question is: the watcher, or the person whose evening it is. */
function sourcePeople(q: string | undefined): PersonId[] {
  if (!q) return [];
  const [kind, rest] = q.split(':') as [string, string];
  return kind === 'list' || kind === 'account' ? [rest] : kind === 'confront' ? [rest.split('@')[0] as string] : [];
}

/**
 * The notebook said aloud, a clause a fact (docs/49): one paragraph, the clauses running on, and
 * the whole of it exempt from the name count (it has to name people).
 */
function recapFacts(w: Writer, clauses: Clause[], lead?: string): void {
  // docs/49: the lead ("Here’s what I had.") carries no fact: a gap of its own, before them.
  const ownLead = PLAN.ops && !!lead && clauses.length > 0;
  if (ownLead) put(w, 'job', lead, 'recap', { exempt: true });
  clauses.forEach((cl, i) =>
    fact(w, 'job', i === 0 && lead && !ownLead ? `${lead} ${cl.text}` : cl.text, 'recap', {
      relation: /^(when|open)/.test(cl.key) ? 'narrows' : 'new',
      about: cl.people,
      carries: [`clause:${cl.key}`],
      ...(cl.hours.length === 1 ? { hour: cl.hours[0] } : {}),
      exempt: true,
      runOn: i > 0 || ownLead,
      agg: { key: `clause:${cl.key.split(':')[0]}`, data: { clause: cl } },
    }),
  );
  if (clauses.length === 0 && lead) fact(w, 'job', lead, 'recap', { carries: [], exempt: true });
  w.recap = (w.parts.job ?? []).map((x) => x.text).join(' ');
}

export function writeRecap(w: Writer, starsLine: string | null): void {
  const ropen = w.hand.draw('recap-open', {}, {}, { widen: true });
  put(w, 'why', ropen, 'recap', { slot: 'staging', ...sit(w, ropen) });
  const clauses = recapClauses(w.d, w.run);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  recapFacts(w, clauses);
  if (starsLine) put(w, 'handoff', starsLine, 'recap', { keepNames: true });
  lay(w, 'recap');
}

/**
 * docs/43 §2: the turn, at the first lie caught. A chapter break, a recap, and
 * what next: put it to them now, or find out first what the star points at.
 */
export function writeTurn(w: Writer): void {
  const c = w.c;
  const title = w.hand.draw('turn-title', {}, {}, { widen: true, plain: true }) ?? 'Two Stories';
  chapter(w, `The Turn: ${title}`);
  const topen = w.hand.draw('turn-open', {}, {}, { widen: true });
  put(w, 'staging', topen, 'recap', sit(w, topen));
  // docs/47 B11: at Raw, when who is settled by now, the turn walks the elimination instead of
  // reading the notebook back: once, and after the page's own fact, never in its thought.
  const el = walkedElimination(w, true);
  if (el) {
    license(w, el);
    fact(w, 'job', `Here’s what I had. ${el.sentences.join(' ')}`, 'recap', { relation: 'narrows', about: el.people, carries: el.refs, exempt: true });
  } else {
    const clauses = recapClauses(w.d, w.run);
    for (const cl of clauses) {
      for (const h of cl.hours) w.hours.add(h);
      for (const p of cl.people) w.people.add(p);
      for (const p of cl.places) w.places.add(p);
    }
    recapFacts(w, clauses, 'Here’s what I had.');
  }
  w.recap = (w.parts.job ?? []).map((x) => x.text).join(' ');
  // What next, by the stars (docs/46 §1): "put it to them now" only where a put is starred
  // (Raw and Coddled); from Poached up, the one star; at Medium, only where to go; none at Hard-boiled.
  const caught = collisionsOfRun(w)[0];
  const steps = starredSteps(w.d, w.run).filter((q) => !q.startsWith('confront:'));
  const next = steps[0];
  if (caught) {
    const name = nameOf(c, caught);
    let first = '';
    const [nk, nrest] = (next ?? '').split(':') as [string, string];
    const mv = next && nk === 'account' ? movedAt(c, w.run, nrest) : null;
    if (next && mv) {
      // The reason that matters, not a stop on a route (docs/47 B10).
      first = `know what ${nameOf(c, nrest)} had passed on the way to ${placeName(c, mv.to)} at ${hourWord(mv.h)}`;
      w.people.add(nrest);
      w.places.add(mv.to);
      w.hours.add(mv.h);
    } else if (next && walksOnly(c)) {
      first = `get over to ${placeName(c, starPlace(c, next))}`;
      w.places.add(starPlace(c, next));
    } else if (next) {
      const [k, rest] = next.split(':') as [string, string];
      const p = personOf(c, rest);
      if (k === 'account' && p && knownPeople(c, w.run).has(rest)) first = `find out first what ${p.short} had to say for ${pronOf(c, rest).self}`;
      else if (k === 'list' && p) first = knownPeople(c, w.run).has(rest) ? `find out first who ${p.short} had seen at ${placeName(c, starPlace(c, next))}` : `find out first from ${jobWords(p.description)} at ${placeName(c, starPlace(c, next))} who’d been in`;
      else if (k === 'search') first = `go over ${c.finds.find((f) => f.id === rest)?.what ?? 'the room'} first`;
      if (p && knownPeople(c, w.run).has(rest)) w.people.add(rest);
      w.places.add(starPlace(c, next));
    }
    const said = c.tier <= 1 ? (first ? `I could put it to ${name} now. Or I could ${first}.` : `I could put it to ${name} now.`) : first ? `Before I did anything about it, I wanted to ${first.replace(/ first$/, '').replace(/^find out first /, 'find out ')}.` : undefined;
    if (c.tier <= 1) w.people.add(caught);
    put(w, 'handoff', said, 'recap', { keepNames: true });
  }
  const tclose = w.hand.draw('turn-close', {}, {}, { widen: true, joke: true });
  put(w, 'close', tclose, 'recap', sit(w, tclose));
  lay(w, 'turn');
}

function collisionsOfRun(w: Writer): PersonId[] {
  return [...new Set(collisionsOf(w.c, w.run).map((x) => x.person))];
}

/** For the confrontation picker: the lines held for that place and hour. */
export { candidateLines, judgeLine, knownPeople, OFFICE };
