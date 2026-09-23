/**
 * Temper (A.3) and portraits (A.4), rolled once at case start and then never
 * again. Together with the roll they make the cast sheet: everything about the
 * people in this case that is true of them on every page they appear on.
 *
 * Consistency is the whole point. A stock description feels authored when the
 * split thumbnail is there both times.
 */

import { Rng } from '../../gen/rng.js';
import type { Case, Id, Person } from '../../gen/types.js';
import { ARCHETYPE_BY_ID, VICTIM_ARCHETYPES } from '../../gen/data/cast.js';
import { NAME_POOLS } from '../../gen/data/names.js';
import weightsJson from '../../../content/temper-weights.json';
import { DECKS, fill, leastRead, motifsOf, readCounts, tagIs, tagOf, type Card, type Slots } from './cards.js';
import { tidyPunctuation } from './prose.js';
import { contradictsWeather } from './motifs.js';
import { rollDashiell, type DashiellRoll } from './roll.js';

export type Temper = 'enigma' | 'plain' | 'yap';

export const TEMPERS: Temper[] = ['enigma', 'plain', 'yap'];

interface Weights {
  default: Record<Temper, number>;
  classes: Record<string, Record<Temper, number>>;
  archetypes: Record<string, Record<Temper, number>>;
  fixtures: Record<string, Record<Temper, number>>;
}

export const TEMPER_WEIGHTS = weightsJson as unknown as Weights;

/** The weights that apply to one person, narrowest table first. */
export function weightsFor(person: Person): Record<Temper, number> {
  if (person.fixtureRole) {
    return (
      TEMPER_WEIGHTS.fixtures[person.fixtureRole] ??
      TEMPER_WEIGHTS.fixtures.default ??
      TEMPER_WEIGHTS.default
    );
  }
  const byArchetype = person.archetypeId
    ? TEMPER_WEIGHTS.archetypes[person.archetypeId]
    : undefined;
  if (byArchetype) return byArchetype;
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  const byClass = archetype ? TEMPER_WEIGHTS.classes[archetype.class] : undefined;
  return byClass ?? TEMPER_WEIGHTS.default;
}

function pickWeighted(rng: Rng, weights: Record<Temper, number>): Temper {
  const total = TEMPERS.reduce((n, t) => n + Math.max(0, weights[t] ?? 0), 0);
  if (total <= 0) return 'plain';
  let roll = rng.next() * total;
  for (const t of TEMPERS) {
    roll -= Math.max(0, weights[t] ?? 0);
    if (roll < 0) return t;
  }
  return 'plain';
}

export interface Portrait {
  trait: string;
  habit: string;
  clothing: string;
  /** The card ids, so the burn pile can be told about them. */
  cardIds: string[];
  /** The motifs of the three cards, for the page's motif set (§A.2). */
  motifs: string[];
  /**
   * Hone 1 §B.4 — the pair, when one fits this person.
   *
   * A detail with the reason it is seen, in the person's own pronouns, and the
   * phrase a later page calls them by. Absent when the deck has nothing for
   * their tags, or when the deck is not on disk at all, and then the three
   * components below are what the page has. The page logs the gap either way.
   */
  pair?: { text: string; recall: string; cardId: string; action?: string };
}

export interface CastSheet {
  roll: DashiellRoll;
  temper: Record<Id, Temper>;
  portraits: Record<Id, Portrait>;
  /** Which component of each portrait was shown last, so a repeat varies. */
  order: Record<Id, number>;
}

/**
 * Given names, as the generator's pools have them. The name is the most
 * reliable thing on a person: a fixture has no archetype at all, and a
 * suspect's relationship to the victim can force a gender the archetype's own
 * hint does not have ("opposeVictimGender"). Both of those are decided before
 * the name is drawn, so the name always agrees with the truth and the hint
 * does not.
 */
const GIVEN_NAME_GENDER = ((): Map<string, 'm' | 'f'> => {
  const out = new Map<string, 'm' | 'f'>();
  for (const pool of NAME_POOLS) {
    for (const given of pool.given.male) out.set(given.toLowerCase(), 'm');
    for (const given of pool.given.female) out.set(given.toLowerCase(), 'f');
  }
  return out;
})();

/**
 * What gender a card has to be written for to suit this person. Portraits
 * filter on it, and so does business: "folded the newspaper she'd been
 * reading" attached to a man is the whole reason the tag exists.
 */
export function genderHintOf(person: Person): 'm' | 'f' | 'any' {
  const given = person.name.split(/\s+/)[0]?.toLowerCase() ?? '';
  const byName = GIVEN_NAME_GENDER.get(given);
  if (byName) return byName;
  if (person.kind === 'victim') {
    const vic = VICTIM_ARCHETYPES.find((v) => v.id === person.archetypeId);
    return vic?.genderHint ?? 'any';
  }
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  return archetype?.genderHint ?? 'any';
}

export function classOf(person: Person): string {
  if (person.fixtureRole) return 'working';
  const archetype = person.archetypeId ? ARCHETYPE_BY_ID[person.archetypeId] : undefined;
  return archetype?.class ?? 'working';
}

const PORTRAIT_SALT = 0x27d4eb;
const TEMPER_SALT = 0x165667b1;

/**
 * M10 §A.5: the ages a portrait's `ageBand` can be worn at. "A voice thinned
 * with age" on somebody in her thirties was the bug. The bands overlap on
 * purpose: a card tagged young is anything a person under forty-one can carry,
 * an old one needs fifty, and the middle, which is what an untagged portrait
 * reads as, covers everybody from twenty-eight to sixty-four.
 */
export const AGE_BANDS: Record<string, [number, number]> = {
  young: [0, 40],
  middle: [28, 64],
  old: [50, 200],
};

/** Can a person of `age` wear a card tagged `band`? No age known, any card. */
export function ageFits(band: unknown, age: number | undefined): boolean {
  if (age === undefined || typeof band !== 'string') return true;
  const range = AGE_BANDS[band];
  if (range === undefined) return true;
  return age >= range[0] && age <= range[1];
}

/**
 * Every person's temper, as the case has always rolled it.
 *
 * Tempers came off the same stream as the portraits, one draw ahead of each
 * person's cards, so the portraits' draws moved them. docs/25 changes how the
 * portraits are drawn — against the reader's history, and against the rest of
 * tonight's cast — and that would have moved every temper in every case, the
 * goldens' included, and made a temper depend on who is reading. So the old
 * stream is replayed here exactly as it ran for a reader with no history: the
 * same draws in the same order, the cards thrown away, the tempers kept.
 */
function rollTempers(kase: Case, seed: number, weather: DashiellRoll['weather']): Record<Id, Temper> {
  const rng = new Rng((seed * 1103515245 + PORTRAIT_SALT) >>> 0);
  const burned = new Set<string>();
  const deck = DECKS.portraits;
  const pairDeck = DECKS['portrait-pairs'];
  const temper: Record<Id, Temper> = {};
  for (const person of kase.people) {
    if (person.kind !== 'victim') temper[person.id] = pickWeighted(rng, weightsFor(person));
    const gender = genderHintOf(person);
    const klass = classOf(person);
    const age = person.dossier?.age;
    for (const component of ['trait', 'habit', 'clothing'] as const) {
      const fits = (c: Card): boolean =>
        tagIs('portraits', c, 'component', component) &&
        (tagIs('portraits', c, 'gender', gender) || gender === 'any') &&
        ageFits(tagOf('portraits', c, 'ageBand'), age) &&
        !contradictsWeather(motifsOf(c), c, weather);
      const exact = deck.filter((c) => fits(c) && tagIs('portraits', c, 'class', klass));
      const loose = deck.filter(fits);
      const pick =
        rng.shuffle(exact.filter((c) => !burned.has(c.id)))[0] ??
        rng.shuffle(loose.filter((c) => !burned.has(c.id)))[0] ??
        rng.shuffle(exact)[0] ??
        rng.shuffle(loose)[0];
      if (pick) burned.add(pick.id);
    }
    const pairFits = (c: Card): boolean =>
      (gender === 'any' || tagIs('portrait-pairs', c, 'gender', gender)) &&
      ageFits(tagOf('portrait-pairs', c, 'ageBand'), age) &&
      !contradictsWeather(motifsOf(c), c, weather);
    const ladder: ((c: Card) => boolean)[] = [
      (c) =>
        pairFits(c) &&
        tagIs('portrait-pairs', c, 'class', klass) &&
        tagIs('portrait-pairs', c, 'setting', person.isClient === true ? 'office' : 'anywhere'),
      (c) => pairFits(c) && tagIs('portrait-pairs', c, 'class', klass),
      pairFits,
    ];
    for (const rung of ladder) {
      const fits = pairDeck.filter(rung);
      const card = rng.shuffle(fits.filter((c) => !burned.has(c.id)))[0] ?? rng.shuffle(fits)[0];
      if (!card) continue;
      const recall = typeof card.recall === 'string' ? card.recall.trim() : '';
      if (fill(card, pronounSlots(person)) === null || recall.length === 0) continue;
      burned.add(card.id);
      break;
    }
  }
  return temper;
}

/**
 * One portrait pair per person — or, where the pair deck has nothing for them,
 * one trait, one habit and one piece of clothing — drawn against the reader's
 * history so that a player does not meet the same split thumbnail two nights
 * running, and against tonight's cast so that two people never share one.
 * Everything is chosen here, once; the page grammar only ever reads it back.
 */
export function rollCast(
  kase: Case,
  opts?: { seed?: number; persistedBurned?: Iterable<string> },
): CastSheet {
  const seed = opts?.seed ?? kase.seed;
  const rng = new Rng((seed * 1103515245 + TEMPER_SALT) >>> 0);
  // docs/25: how often the reader has met each card on earlier nights, and
  // what tonight's cast has already been given. A card is never handed to a
  // second person tonight while anything else fits; across nights the one the
  // reader has met least often goes first, which reshuffles a key once every
  // card in it has been met.
  const reads = readCounts(opts?.persistedBurned ?? []);
  const tonight = new Set<string>();
  const choose = (cards: Card[]): Card | undefined => {
    const open = cards.filter((c) => !tonight.has(c.id));
    if (open.length === 0) return undefined;
    return rng.shuffle(leastRead(open, (c) => reads.get(c.id) ?? 0))[0];
  };
  const deck = DECKS.portraits;
  // The night is rolled first, because a portrait has to agree with it (§A.5).
  const roll = rollDashiell(kase, opts?.seed === undefined ? {} : { seed: opts.seed });
  const weather = roll.weather;

  // A person's temper is the case's, whoever is reading (see `rollTempers`).
  const temper = rollTempers(kase, seed, weather);
  const portraits: Record<Id, Portrait> = {};
  const order: Record<Id, number> = {};

  for (const person of kase.people) {
    const gender = genderHintOf(person);
    const klass = classOf(person);
    const age = person.dossier?.age;
    const cardIds: string[] = [];
    const motifs: string[] = [];
    const parts: Record<string, string> = {};
    /*
     * §B.4. One pair card is the portrait. The office cards are written for
     * somebody sitting down across a desk, so the client prefers them and
     * everybody else takes what is left.
     *
     * docs/25: nobody else tonight has this pair while anything else fits. The
     * ladder widens before two people share one description; only a deck too
     * thin for the whole cast hands a card round twice.
     */
    const pairDeck = DECKS['portrait-pairs'];
    const wantsOffice = person.isClient === true;
    const pairFits = (c: Card): boolean =>
      (gender === 'any' || tagIs('portrait-pairs', c, 'gender', gender)) &&
      ageFits(tagOf('portrait-pairs', c, 'ageBand'), age) &&
      !contradictsWeather(motifsOf(c), c, weather) &&
      typeof c.recall === 'string' &&
      c.recall.trim().length > 0 &&
      fill(c, pronounSlots(person)) !== null;
    const pairLadder: ((c: Card) => boolean)[] = [
      (c) =>
        pairFits(c) &&
        tagIs('portrait-pairs', c, 'class', klass) &&
        tagIs('portrait-pairs', c, 'setting', wantsOffice ? 'office' : 'anywhere'),
      (c) => pairFits(c) && tagIs('portrait-pairs', c, 'class', klass),
      pairFits,
    ];
    let card: Card | undefined;
    for (const rung of pairLadder) {
      card = choose(pairDeck.filter(rung));
      if (card) break;
    }
    if (!card) {
      const shared = pairLadder.map((rung) => pairDeck.filter(rung)).find((fits) => fits.length > 0) ?? [];
      card = rng.shuffle(leastRead(shared, (c) => reads.get(c.id) ?? 0))[0];
    }
    let pair: Portrait['pair'];
    if (card) {
      tonight.add(card.id);
      cardIds.push(card.id);
      for (const m of motifsOf(card)) if (!motifs.includes(m)) motifs.push(m);
      // M8 §4: the recall as something the person does, filled like the text.
      const action =
        typeof card.recallAction === 'string' ? fillText(card.recallAction, pronounSlots(person)) : null;
      pair = {
        text: tidyPunctuation(fill(card, pronounSlots(person)) as string),
        recall: (card.recall as string).trim(),
        cardId: card.id,
        ...(action ? { action: tidyPunctuation(action.charAt(0).toUpperCase() + action.slice(1)) } : {}),
      };
    }

    /*
     * The three components: one trait, one habit and one piece of clothing.
     * A person the pair deck has nothing for is described by them. Everybody
     * has them rolled, because their motifs are part of the person's motif set
     * the page threads on; but they are counted as read — spent, for the
     * reader's history — only where they are what the page prints. docs/22
     * found about 25 a night burned and never printed.
     */
    for (const component of ['trait', 'habit', 'clothing'] as const) {
      const fits = (c: Card): boolean =>
        tagIs('portraits', c, 'component', component) &&
        (tagIs('portraits', c, 'gender', gender) || gender === 'any') &&
        ageFits(tagOf('portraits', c, 'ageBand'), age) &&
        // §A.5: a portrait whose clothing implies a sky is a portrait for that
        // night only. A collar up and wet boots on a clear night is the tell.
        !contradictsWeather(motifsOf(c), c, weather);
      const exact = deck.filter((c) => fits(c) && tagIs('portraits', c, 'class', klass));
      const loose = deck.filter(fits);
      const pick = choose(exact) ?? choose(loose) ?? rng.shuffle(exact)[0] ?? rng.shuffle(loose)[0];
      if (!pick) continue;
      tonight.add(pick.id);
      if (pair === undefined) cardIds.push(pick.id);
      for (const m of motifsOf(pick)) if (!motifs.includes(m)) motifs.push(m);
      parts[component] = pick.text;
    }

    portraits[person.id] = {
      trait: fragment(parts.trait ?? ''),
      habit: fragment(parts.habit ?? ''),
      clothing: fragment(parts.clothing ?? ''),
      cardIds,
      motifs,
      ...(pair === undefined ? {} : { pair }),
    };
    // Which of habit and clothing goes beside the trait on the first meeting,
    // fixed per person so the callback (§A.6) can repeat it exactly once.
    order[person.id] = hash(person.id) % 2;
  }

  return { roll, temper, portraits, order };
}

/**
 * The pronouns a portrait-pair card is written with (§B.4).
 *
 * The cards are written for one person at a time — "She kept her left hand in
 * the pocket" — so the deck writes `{He}` `{he}` `{his}` `{him}` and the
 * engine fills them from the gender the name already settled. The capitalised
 * form is the writer's choice of where a sentence starts.
 */
export function pronounSlots(person: Person): Slots {
  const female = genderHintOf(person) === 'f';
  return {
    He: female ? 'She' : 'He',
    he: female ? 'she' : 'he',
    his: female ? 'her' : 'his',
    him: female ? 'her' : 'him',
    name: person.surname,
  };
}

/** Fill a card's second text field the way `fill` fills its text. */
function fillText(template: string, slots: Slots): string | null {
  let out = template;
  for (const m of new Set(template.match(/\{(\w+)\}/g) ?? [])) {
    const value = slots[m.slice(1, -1)];
    if (value === undefined || value.length === 0) return null;
    out = out.split(m).join(value);
  }
  return out;
}

/** A stable small number off an id, so a choice can be made without state. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1024;
}

export function temperOf(cast: CastSheet, personId: Id): Temper {
  return cast.temper[personId] ?? 'plain';
}

/**
 * Every portrait card the cast sheet spent, for the burn pile, once each.
 * A deck too thin for the cast gives two people the same detail; the pile
 * still only wants to hear about the card once.
 */
export function portraitCardIds(cast: CastSheet): string[] {
  return [...new Set(Object.values(cast.portraits).flatMap((p) => p.cardIds))];
}

/**
 * Portrait cards arrive as sentences ("A split thumbnail he kept looking at.").
 * On the page they are joined mid-sentence, so they are stored as fragments:
 * lower-case start, no full stop of their own. Otherwise the page reads
 * "Hanrahan, and Hands that stayed folded..".
 */
function fragment(p: string): string {
  return p.trim().replace(/[.!?]+$/, '').replace(/^([A-Z])(?![A-Z])/, (m) => m.toLowerCase());
}

function sentence(p: string): string {
  const t = p.trim();
  return t.length === 0 ? '' : `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
}

/* ------------------------------------------------------------------ *
 * Tense.
 *
 * The three portrait components are three different parts of speech, and the
 * weaving templates have to know it. A trait is a noun phrase ("a callus in the
 * web of the thumb"), so is a piece of clothing ("a tie held with a dime-store
 * pin"), and a habit is a present-tense verb phrase ("whistles two bars of the
 * same tune between sentences"). Dropping a habit into a template written for a
 * noun gives "Doyle came with a callus in the web of the thumb, and whistles two
 * bars of the same tune the whole time", which is two tenses and a category
 * error in one sentence.
 *
 * A habit therefore goes in one of two shapes only: as a sentence of its own
 * after a colon or a stop, where a present-tense fragment is exactly right and
 * reads as a standing fact about the man, or turned into the past tense and put
 * in the same clause as everything else. The turning is done off a table, and
 * only off a table: a habit whose verb is not in it takes the colon shape
 * rather than an invented word.
 * ------------------------------------------------------------------ */

/** Third person singular to simple past, for the verbs the habit deck uses. */
export const PAST_TENSE: Record<string, string> = {
  /* irregular */
  bites: 'bit',
  runs: 'ran',
  holds: 'held',
  keeps: 'kept',
  sits: 'sat',
  stands: 'stood',
  takes: 'took',
  makes: 'made',
  goes: 'went',
  does: 'did',
  says: 'said',
  tells: 'told',
  feels: 'felt',
  finds: 'found',
  leaves: 'left',
  comes: 'came',
  gets: 'got',
  puts: 'put',
  sets: 'set',
  lets: 'let',
  cuts: 'cut',
  hits: 'hit',
  sticks: 'stuck',
  sweeps: 'swept',
  draws: 'drew',
  blows: 'blew',
  throws: 'threw',
  catches: 'caught',
  brings: 'brought',
  thinks: 'thought',
  hangs: 'hung',
  digs: 'dug',
  rings: 'rang',
  sings: 'sang',
  swings: 'swung',
  wrings: 'wrung',
  sends: 'sent',
  spends: 'spent',
  bends: 'bent',
  builds: 'built',
  lights: 'lit',
  lays: 'laid',
  pays: 'paid',
  writes: 'wrote',
  rides: 'rode',
  slides: 'slid',
  hides: 'hid',
  shakes: 'shook',
  wakes: 'woke',
  wears: 'wore',
  tears: 'tore',
  sees: 'saw',
  speaks: 'spoke',
  breaks: 'broke',
  wets: 'wet',
  /* regular, and spelled out rather than derived: the -s → -ed rule is only
   * safe where somebody has checked the result is a word */
  adjusts: 'adjusted',
  blinks: 'blinked',
  buttons: 'buttoned',
  chews: 'chewed',
  clears: 'cleared',
  clicks: 'clicked',
  counts: 'counted',
  cracks: 'cracked',
  drums: 'drummed',
  drops: 'dropped',
  examines: 'examined',
  folds: 'folded',
  hums: 'hummed',
  licks: 'licked',
  looks: 'looked',
  pats: 'patted',
  picks: 'picked',
  polishes: 'polished',
  presses: 'pressed',
  repeats: 'repeated',
  rolls: 'rolled',
  rubs: 'rubbed',
  shifts: 'shifted',
  sighs: 'sighed',
  smooths: 'smoothed',
  sniffs: 'sniffed',
  snaps: 'snapped',
  straightens: 'straightened',
  studies: 'studied',
  sucks: 'sucked',
  taps: 'tapped',
  tucks: 'tucked',
  tugs: 'tugged',
  turns: 'turned',
  twists: 'twisted',
  whistles: 'whistled',
  wipes: 'wiped',
};

/**
 * A habit in the past tense, or null when the leading word is not a verb this
 * table knows. Null is the honest answer and the caller has a shape for it.
 */
export function pastTenseHabit(habit: string): string | null {
  const text = habit.trim();
  const m = /^([A-Za-z]+)(.*)$/s.exec(text);
  if (!m) return null;
  const verb = (m[1] as string).toLowerCase();
  const past = PAST_TENSE[verb];
  if (past === undefined) return null;
  return `${past}${m[2] as string}`;
}

/**
 * M4b §A.4 — portraits are woven, not listed.
 *
 * M4 printed "Ainsworth: a birthmark the shape of a thumbprint; tucks loose
 * hair behind one ear; shoes a half-size large" and called it a description.
 * Three details separated by semicolons is a catalogue entry: the reader is
 * handed three things to remember about somebody who has not yet done
 * anything, and remembers none of them.
 *
 * So: **trait plus one of habit and clothing**, never all three, in a sentence
 * that also says what the person is doing. Three templates, and the choice of
 * which second component goes with the trait is fixed per person, so the
 * callback below can repeat it exactly once.
 */
export const PORTRAIT_TEMPLATES: {
  second: 'habit' | 'clothing' | 'none';
  /** The second component goes in as a past-tense clause, not as it is written. */
  past?: boolean;
  text: string;
}[] = [
  { second: 'habit', past: true, text: '{Surname} had {trait}, and {second} while {pronoun} waited.' },
  { second: 'clothing', text: '{Surname}: {trait}. {Second}.' },
  { second: 'none', text: '{Trait} — that was {Surname}.{business}' },
  { second: 'habit', text: '{Surname}: {trait}. {Second}.' },
  { second: 'clothing', text: '{Second}, and above it {trait}. {Surname}.' },
];

export interface WeaveInput {
  cast: CastSheet;
  personId: Id;
  surname: string;
  /** How many pages this person has already been portrayed on. */
  times: number;
  /** What their hands are doing, when the page has a business beat for it. */
  business?: string | undefined;
  pronoun: 'he' | 'she';
  /** A number off the page, so two people on one page do not weave alike. */
  nth: number;
}

/**
 * One person, woven. First meeting: two components and a verb. Later: one
 * component as a clause, and the same one as last time exactly once (§A.6's
 * callback — a repeated detail is what makes a stock detail feel authored),
 * then a different one each time after that.
 */
export function describePerson(input: WeaveInput): string {
  const { cast, personId, surname, times, pronoun } = input;
  const portrait = cast.portraits[personId];
  if (!portrait) return surname;

  /*
   * §B.4. Where a pair fits this person, it is the portrait: one detail with
   * the reason it is seen, followed for two or three sentences, in place of
   * the trait-and-one-more list. Every meeting after the first calls them by
   * the phrase the pair left behind — "the woman with the broken finger" —
   * which is the callback the three components were doing by repetition and
   * is now doing with the same noun the reader already has.
   */
  const pair = portrait.pair;
  if (pair) {
    if (times === 0) return pair.text;
    return `${surname}, the ${pronoun === 'she' ? 'woman' : 'man'} with ${recallClause(pair.recall)}.`;
  }
  const has = { trait: portrait.trait, habit: portrait.habit, clothing: portrait.clothing };
  const parts = (['trait', 'habit', 'clothing'] as const).filter((k) => has[k].length > 0);
  if (parts.length === 0) return surname;

  // Which second component belongs to this person, fixed at case start.
  const pick = cast.order[personId] ?? 0;
  const secondName: 'habit' | 'clothing' =
    has.habit.length > 0 && (pick === 0 || has.clothing.length === 0) ? 'habit' : 'clothing';

  if (times > 0) {
    // The callback: the second meeting repeats the first meeting's component,
    // and after that it varies. Never two components at once, ever.
    const later = times === 1 ? secondName : (parts[(times - 1) % parts.length] as keyof typeof has);
    const which = has[later].length > 0 ? later : (parts[0] as keyof typeof has);
    const one = has[which];
    // "Doyle, and whistles two bars of the same tune" hangs a present-tense
    // verb off an appositive. The habit takes the colon instead, where a
    // present-tense fragment is a standing fact about the man and reads right.
    if (which === 'habit') return `${surname}: ${one}.`;
    return `${surname}, and ${one}.`;
  }

  const business = (input.business ?? '').trim();
  const usable = PORTRAIT_TEMPLATES.filter(
    (t) =>
      (t.second === 'none' ? true : has[t.second].length > 0) &&
      has.trait.length > 0 &&
      (t.second !== 'none' || business.length > 0) &&
      // A template that puts the habit in the same clause as the rest needs
      // the verb turned; where it cannot be turned the template is not usable.
      (t.past !== true || pastTenseHabit(has[t.second as 'habit' | 'clothing']) !== null),
  );
  const pool = usable.filter((t) => t.second === secondName || t.second === 'none');
  const chosen =
    (pool.length > 0 ? pool[input.nth % pool.length] : usable[input.nth % Math.max(1, usable.length)]) ??
    null;
  if (!chosen) return `${surname}, and ${has[parts[0] as keyof typeof has]}.`;

  const raw = chosen.second === 'none' ? '' : has[chosen.second];
  const second = chosen.past === true ? (pastTenseHabit(raw) ?? raw) : raw;
  return chosen.text
    .split('{Surname}')
    .join(surname)
    .split('{trait}')
    .join(has.trait)
    .split('{Trait}')
    .join(sentence(has.trait))
    .split('{second}')
    .join(second)
    .split('{Second}')
    .join(sentence(second))
    .split('{pronoun}')
    .join(pronoun)
    // The business beat is a sentence of its own here, not a clause hung off
    // "that was Carbone": the business deck writes both tenses and half of it
    // is present ("A hat goes round in two hands"), which a comma would put
    // inside a past-tense sentence.
    .split('{business}')
    .join(business.length > 0 ? ` ${sentence(business)}` : '');
}

/**
 * A recall phrase as it goes after "with": the deck writes "the broken
 * finger" and the clause wants it whole. A phrase already written as a
 * possessive or a bare noun is left exactly as the writer wrote it.
 */
export function recallClause(recall: string): string {
  return recall.trim().replace(/[.!?]+$/, '');
}

/** He or she, for the weaving templates. */
export function pronounOf(person: Person | undefined): 'he' | 'she' {
  return person && genderHintOf(person) === 'f' ? 'she' : 'he';
}

/** His or her. */
export function possessiveOf(person: Person | undefined): 'his' | 'her' {
  return person && genderHintOf(person) === 'f' ? 'her' : 'his';
}

/**
 * Man or woman.
 *
 * The engine has a handful of sentences it assembles in code around a noun
 * rather than a pronoun — "a man hiring you", "the wrong man" — and half the
 * cast is not a man. The dossier says which, and every person in the case has
 * one, so there is no reason for the engine to guess.
 */
export function nounOf(person: Person | undefined): 'man' | 'woman' {
  return person && genderHintOf(person) === 'f' ? 'woman' : 'man';
}
