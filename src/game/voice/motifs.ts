/**
 * Closeness (M4b §A.2). What a page is *about*, as a set of words, and how
 * near a card is to it.
 *
 * M4's page had words and no attention: every card was dealt against its tags
 * and nothing else, so seven images could arrive in a hundred and fifty words
 * with no thread between any two of them. A motif is the thread. Every card
 * carries one to three of them from a fixed vocabulary (`content/motifs.json`,
 * which the validator enforces and nothing in code may extend), the page
 * builds its own set before it draws a single image card, and a card is scored
 * by how much of that set it already holds.
 *
 * Nothing here draws anything. It turns a case, a place and a clue into a set
 * of words, and a card into a number. `cards.ts` does the dealing; `page.ts`
 * decides which blocks get to spend the budget.
 */

import type { Clue, Id, Person, Place } from '../../gen/types.js';
import motifsJson from '../../../content/motifs.json';
import type { Weather } from './roll.js';

interface MotifFile {
  groups: Record<string, string[]>;
}

const FILE = motifsJson as unknown as MotifFile;

/** The vocabulary, by group, exactly as `content/motifs.json` has it. */
export const MOTIF_GROUPS: Record<string, readonly string[]> = FILE.groups;

/** Every motif there is. A word outside this set is a validator error. */
export const MOTIFS: ReadonlySet<string> = new Set(Object.values(FILE.groups).flat());

/** The motifs that are also weather, and the ones a glue template may carry. */
export const WEATHER_MOTIFS: ReadonlySet<string> = new Set(FILE.groups.weather ?? []);
export const PROP_MOTIFS: ReadonlySet<string> = new Set(FILE.groups.props ?? []);
export const BODY_MOTIFS: ReadonlySet<string> = new Set(FILE.groups.body ?? []);

export function isMotif(word: string): boolean {
  return MOTIFS.has(word);
}

/**
 * The motifs on a card.
 *
 * Canonically a **top-level** `motifs` field, a sibling of `tags`: that is
 * where the two content branches are writing them, and `tags` is for the
 * single-valued things the dealer matches on. `tags.motifs` is read as well,
 * and so is a single string of space- or comma-separated words, because a deck
 * that arrives in the other shape should score rather than silently count as
 * untagged. Anything outside the vocabulary is dropped here and reported by
 * the validator — the engine never scores on a word it does not know.
 */
export function readMotifs(card: { tags?: unknown; motifs?: unknown }): string[] {
  const raw =
    card.motifs ?? (card.tags as Record<string, unknown> | undefined)?.motifs ?? undefined;
  if (raw === undefined || raw === null) return [];
  const words = Array.isArray(raw)
    ? raw.map((w) => String(w))
    : String(raw)
        .split(/[,\s]+/)
        .filter((w) => w.length > 0);
  const out: string[] = [];
  for (const w of words) {
    const word = w.trim().toLowerCase();
    if (MOTIFS.has(word) && !out.includes(word)) out.push(word);
  }
  return out;
}

/** Everything a page is about tonight, and what the page before it used. */
export interface MotifContext {
  /** The night's weather from the roll. A card that contradicts it is out. */
  night: Weather;
  /** The page's own motif set, built before any image card is drawn. */
  page: ReadonlySet<string>;
  /** What the previous page's cards used. */
  previous: ReadonlySet<string>;
  /** The motifs of the block immediately before the one being drawn. */
  before: readonly string[];
}

export const NO_CONTEXT = (night: Weather): MotifContext => ({
  night,
  page: new Set<string>(),
  previous: new Set<string>(),
  before: [],
});

/**
 * What weather a card claims, if it claims any. `any` and an absent field are
 * both "fits whatever the night is".
 *
 * Top-level `weather` first, which is where the tagging pass writes it, then
 * `tags.weather`, which is where the arrivals deck has had it since M4 and
 * where its schema still requires it.
 */
export function weatherOf(card: { tags?: unknown; weather?: unknown }): string | null {
  const raw = card.weather ?? (card.tags as Record<string, unknown> | undefined)?.weather;
  if (typeof raw !== 'string' || raw.length === 0 || raw === 'any') return null;
  return raw;
}

/**
 * Does this card contradict the night (§A.5)?
 *
 * Two ways: its `weather` tag names another sky, or it carries a weather motif
 * that is not tonight's. "Wet boots" in a `motifs: ["rain"]` card on a clear
 * night is the same lie as `weather: "rain"`, and the content pass will tag it
 * both ways depending on who is writing.
 */
export function contradictsWeather(
  motifs: readonly string[],
  card: { tags?: unknown; weather?: unknown },
  night: Weather,
): boolean {
  const tagged = weatherOf(card);
  if (tagged !== null && tagged !== night) return true;
  for (const m of motifs) {
    if (WEATHER_MOTIFS.has(m) && m !== night) return true;
  }
  return false;
}

/**
 * §A.2's score, to the letter.
 *
 * The tag match is the hard filter and lives in the dealer's ladder; this is
 * everything after it. `-Infinity` means the card cannot go on this page at
 * all, which is what "− ∞ if its weather contradicts the night" asks for.
 */
export const SHARED_MOTIF_POINTS = 2;
export const ADJACENT_MOTIF_POINTS = 1;
export const STALE_MOTIF_PENALTY = 3;

export function scoreMotifs(
  motifs: readonly string[],
  card: { tags?: unknown; weather?: unknown },
  ctx: MotifContext,
): number {
  if (contradictsWeather(motifs, card, ctx.night)) return -Infinity;
  // A card with no motifs scores neutral: the untagged decks must not be
  // pushed to the back of every ladder while the content pass is running.
  if (motifs.length === 0) return 0;
  let score = 0;
  for (const m of motifs) if (ctx.page.has(m)) score += SHARED_MOTIF_POINTS;
  if (motifs.some((m) => ctx.before.includes(m))) score += ADJACENT_MOTIF_POINTS;
  // No accidental echoes: a motif the page before used, which tonight is not
  // otherwise about, is a repetition rather than a thread.
  if (motifs.some((m) => ctx.previous.has(m) && !ctx.page.has(m))) score -= STALE_MOTIF_PENALTY;
  return score;
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.2 — the body and the props a line has its hands on.
 * ------------------------------------------------------------------ */

/**
 * The words that say what a line is *doing with*, as opposed to what it is
 * about.
 *
 * Motifs are a page's subject; this is narrower and it is about contradiction.
 * A portrait pair that has the client flipping a coin off her thumb the whole
 * time she talks cannot share a page with a beat that has her sitting with
 * both hands folded — not because the two images clash, but because they are
 * claims about the same hands and only one of them can be true.
 *
 * So each of these words maps onto the motif that names the part or the prop,
 * and two lines conflict when the sets meet. The motif tags do most of it —
 * the decks are tagged `hands`, `hat`, `coat` — and the word list catches the
 * lines that carry no tags at all, which is every plain beat in `plain.ts`.
 */
export const BODY_WORDS: Record<string, string> = {
  hand: 'hands',
  hands: 'hands',
  finger: 'hands',
  fingers: 'hands',
  fingernail: 'hands',
  fingernails: 'hands',
  nail: 'hands',
  nails: 'hands',
  thumb: 'hands',
  thumbs: 'hands',
  knuckle: 'hands',
  knuckles: 'hands',
  palm: 'hands',
  palms: 'hands',
  fist: 'hands',
  fists: 'hands',
  wrist: 'hands',
  wrists: 'hands',
  glove: 'hands',
  gloves: 'hands',
  ring: 'hands',
  coin: 'money',
  coins: 'money',
  nickel: 'money',
  dime: 'money',
  bill: 'money',
  bills: 'money',
  banknote: 'money',
  banknotes: 'money',
  money: 'money',
  hat: 'hat',
  hats: 'hat',
  brim: 'hat',
  coat: 'coat',
  coats: 'coat',
  overcoat: 'coat',
  sleeve: 'coat',
  sleeves: 'coat',
  lapel: 'coat',
  lapels: 'coat',
  collar: 'coat',
  pocket: 'coat',
  pockets: 'coat',
  eye: 'eyes',
  eyes: 'eyes',
  mouth: 'mouth',
  lip: 'mouth',
  lips: 'mouth',
  teeth: 'mouth',
  jaw: 'mouth',
  face: 'face',
  shoulder: 'shoulders',
  shoulders: 'shoulders',
  cigarette: 'cigarette',
  cigarettes: 'cigarette',
};

/**
 * The parts and props a line lays a hand on: its own motifs, narrowed to the
 * ones that name a body part or a thing held, plus whatever its words say.
 */
export function bodyWordsOf(text: string, motifs: readonly string[] = []): Set<string> {
  const out = new Set<string>();
  for (const m of motifs) {
    if (BODY_MOTIFS.has(m) || m === 'hat' || m === 'coat' || m === 'money' || m === 'cigarette') {
      out.add(m);
    }
  }
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    const canon = BODY_WORDS[word];
    if (canon !== undefined) out.add(canon);
  }
  return out;
}

/** Do these two lines claim the same hands, the same hat, the same coat? */
export function bodyConflict(
  words: ReadonlySet<string>,
  text: string,
  motifs: readonly string[] = [],
): boolean {
  if (words.size === 0) return false;
  for (const w of bodyWordsOf(text, motifs)) if (words.has(w)) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * Building the page's set.
 * ------------------------------------------------------------------ */

/** What each of the generator's sixteen anchors puts in the air. */
export const ANCHOR_MOTIFS: Record<string, string[]> = {
  'bar-radio': ['radio', 'bar'],
  'regular-stool': ['drink', 'bar'],
  'cop-pass': ['footsteps', 'law'],
  'piano-lesson': ['piano'],
  'el-train': ['el', 'traffic'],
  'church-bells': ['bells', 'church'],
  'last-edition': ['paper', 'street'],
  fuse: ['lamp'],
  rain: ['rain'],
  'milk-wagon': ['traffic', 'dawn'],
  'theater-out': ['theater', 'street'],
  'garage-shift': ['machinery', 'work'],
  'drunk-singing': ['singing'],
  dumbwaiter: ['stairs', 'machinery'],
  'ice-delivery': ['work', 'cold'],
  'steam-whistle': ['machinery', 'work'],
};

/** What the person posted in a room has around them. §A.2's "bar → drink…". */
export const WATCHER_MOTIFS: Record<string, string[]> = {
  bartender: ['drink', 'glass', 'counter'],
  doorman: ['door', 'street'],
  newsstand: ['paper', 'street'],
  counterman: ['counter', 'food'],
  'ticket-taker': ['theater', 'paper'],
  'elevator-man': ['door', 'stairs'],
  landlady: ['stairs', 'keys'],
  'beat-cop': ['law', 'footsteps'],
  cabbie: ['traffic', 'street'],
  druggist: ['medicine', 'counter'],
};

export const PLACE_KIND_MOTIFS: Record<string, string[]> = {
  private: ['room', 'door'],
  semi: ['room', 'stairs'],
  public: ['street', 'traffic'],
};

/**
 * What a room's own name says about it. The generator's place cards are the
 * neighbourhood's furniture and their short names are concrete — "the
 * speakeasy", "the benches", "the el platform" — so the cheapest reading of a
 * place is the words it is called by.
 */
const NAME_MOTIFS: [RegExp, string[]][] = [
  [/speakeas|saloon|\bbar\b|barroom|dolan/i, ['bar', 'drink']],
  [/pool hall|pool room/i, ['gambling']],
  [/pawn/i, ['money']],
  [/drug|pharmac/i, ['medicine']],
  [/automat|chop suey|lunch|diner|bakery/i, ['food']],
  [/movie|theat|dance hall/i, ['theater']],
  [/newsstand|news/i, ['paper']],
  [/cab stand|garage/i, ['traffic']],
  [/\bel\b|platform|subway|ferry|slip|station/i, ['station', 'el']],
  [/pier|ferry/i, ['sea']],
  [/chapel|church/i, ['church']],
  [/stairwell|stairs|vestibule/i, ['stairs']],
  [/alley|yard|back lot/i, ['alley']],
  [/roof/i, ['roof']],
  [/cellar|basement/i, ['cellar']],
  [/kitchen/i, ['kitchen']],
  [/bench|square|corner|street|avenue/i, ['street']],
  [/office/i, ['office']],
  [/laundry|union hall|shed|barber/i, ['work']],
  [/lobby|parlor|parlour|room|flat|house|teague/i, ['room']],
];

export function placeMotifs(place: Place | undefined): string[] {
  if (!place) return [];
  const out = new Set<string>(PLACE_KIND_MOTIFS[place.kind] ?? []);
  for (const m of WATCHER_MOTIFS[place.watcher ?? ''] ?? []) out.add(m);
  const text = `${place.shortName} ${place.name}`;
  for (const [re, motifs] of NAME_MOTIFS) {
    if (re.test(text)) for (const m of motifs) out.add(m);
  }
  return [...out].filter((m) => MOTIFS.has(m));
}

/** What kind of thing a clue is, as an image. */
export const CLUE_KIND_MOTIFS: Record<string, string[]> = {
  physical: ['hands'],
  document: ['paper'],
  morgue: ['medicine', 'hands'],
  scene: ['room', 'door'],
  observation: ['eyes'],
  overheard: ['voice'],
  denial: ['mouth', 'voice'],
  client: ['money'],
  anchor: ['quiet'],
};

/** And what the fact inside it is about. Money for a motive, hands for a trace. */
export const FACT_KIND_MOTIFS: Record<string, string[]> = {
  hasMotive: ['money'],
  methodEvidence: ['hands'],
  timeOfDeath: ['clock'],
  victimAliveAt: ['clock'],
  victimDeadBy: ['clock'],
  noiseAt: ['footsteps'],
  objectMissing: ['keys'],
  denial: ['mouth'],
  secretExplained: ['memory'],
};

export interface PageMotifInput {
  night: Weather;
  /** `templateId` of every anchor the case drew. */
  anchorIds: readonly string[];
  place: Place | undefined;
  /** The clue this page is about, if it is about one. */
  clue: Clue | null;
  /** Whose portrait is on the page: their portrait cards' motifs. */
  subjectMotifs: readonly string[];
  /** The object the page names, by its own name. */
  objectName?: string | undefined;
  /** What the previous page used. A motif may carry across a page turn, once. */
  previous: readonly string[];
}

const OBJECT_MOTIFS: [RegExp, string[]][] = [
  [/ledger|book|register/i, ['ledger', 'paper']],
  [/letter|note|paper|receipt|ticket|card/i, ['paper']],
  [/glass|bottle|flask|decanter/i, ['glass', 'drink']],
  [/key/i, ['keys']],
  [/hat|coat|scarf|glove/i, ['coat', 'hat']],
  [/lamp|lantern|light/i, ['lamp']],
  [/clock|watch/i, ['clock']],
  [/telephone|phone/i, ['telephone']],
  [/photograph|picture|portrait/i, ['photograph']],
  [/mirror/i, ['mirror']],
  [/cigarette|cigar|ashtray|match/i, ['cigarette']],
  [/money|bill|purse|wallet|roll/i, ['money']],
  [/window|sash|latch/i, ['window']],
  [/door|lock/i, ['door']],
];

export function objectMotifs(name: string | undefined): string[] {
  if (!name) return [];
  const out: string[] = [];
  for (const [re, motifs] of OBJECT_MOTIFS) {
    if (!re.test(name)) continue;
    for (const m of motifs) if (!out.includes(m) && MOTIFS.has(m)) out.push(m);
  }
  return out;
}

/**
 * The page's motif set, built before any image card is drawn (§A.2). Five
 * sources: the night, the anchors, the room, the clue's subject, and one
 * carry-over from the page before.
 */
export function pageMotifSet(input: PageMotifInput): Set<string> {
  const out = new Set<string>();
  const add = (words: readonly string[]): void => {
    for (const w of words) if (MOTIFS.has(w)) out.add(w);
  };

  add([input.night]);
  for (const id of input.anchorIds) add(ANCHOR_MOTIFS[id] ?? []);
  add(placeMotifs(input.place));
  add(input.subjectMotifs);
  add(objectMotifs(input.objectName));
  if (input.clue) {
    add(CLUE_KIND_MOTIFS[input.clue.kind] ?? []);
    for (const fact of input.clue.establishes) add(FACT_KIND_MOTIFS[fact.kind] ?? []);
  }
  // A motif may carry across a page turn, once: it is in the set, so a card
  // that shares it scores; it is also in `previous`, so a card that shares
  // nothing else is not penalized for it.
  add(input.previous);
  return out;
}

/** The portrait motifs of the person a page is about, for `subjectMotifs`. */
export function subjectOf(clue: Clue | null, speaker: Person | undefined): Id | null {
  if (speaker) return speaker.id;
  if (!clue) return null;
  for (const f of clue.establishes) if ('personId' in f) return f.personId;
  if (clue.source.type === 'person') return clue.source.personId;
  return null;
}
