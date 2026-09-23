/**
 * What really happened, told as a story.
 *
 * The truth sheet is everything the generator knows: every secret, every lie,
 * every noise branch. This is the other thing the closing page offers — the
 * crime and nothing else, in the detective's voice, looking back: who did it
 * and to whom, the tie between them and why, where the means came from and
 * when, how they came to be alone together, the moment itself and what timed
 * or covered it, where the culprit went after, and who found it.
 *
 * Two halves, and the seam between them is the point:
 *
 *   `storyInput(case)`  the only function here that touches a `Case`. It
 *                       copies out exactly the fields the story may use —
 *                       the culprit's and the victim's truth, the act, the
 *                       means, the anchor that times the scene, the
 *                       discovery — and nothing else. No secrets, no claimed
 *                       evenings, no lies, no clues, no other suspect.
 *   `tellStory(input)`  pure over that input and `content/decks/story.json`.
 *                       It cannot say what it was never handed.
 *
 * Every line carries the facts it asserts (`StoryFact`), and the story test
 * checks each of them against the full case and checks that the words on the
 * line name nobody, nowhere and no hour its facts do not account for.
 */

import deckJson from '../../content/decks/story.json';
import { Rng } from '../gen/rng.js';
import {
  spokenClock,
  type Case,
  type CaseType,
  type Entry,
  type Id,
  type Precinct,
  type Tick,
} from '../gen/types.js';
import { RELATIONSHIP_BY_ID, VICTIM_ARCHETYPE_BY_ID } from '../gen/data/cast.js';
import { MOTIVE_BY_TYPE } from '../gen/data/motives.js';
import { wrap } from './transcript.js';
import { tidyPunctuation } from './voice/prose.js';

/* ------------------------------------------------------------ the input */

export interface StoryPerson {
  id: Id;
  name: string;
  surname: string;
  gender: 'm' | 'f';
  role: string;
  archetypeId?: Id;
}

/**
 * Everything the story is allowed to know. A field that is not here cannot be
 * said: that is the whole of the guarantee, and it is a guarantee by
 * construction rather than by review.
 */
export interface StoryInput {
  seed: number;
  type: CaseType;
  tropeId: Id;
  /** Who did it. For `left`, the one who helped them go. */
  culprit: StoryPerson;
  victim: StoryPerson;
  /** The culprit's tie to the victim, from the culprit's dossier. */
  tie: { relationshipId: Id; text: string; backstory: string } | null;
  /** The culprit's motive. Nobody else's. */
  motive: { type: string; description: string } | null;
  /** The victim's standing on the block, from the victim's dossier. */
  standing: string | null;
  /** What the victim did, up close: the victim's dossier profession detail. */
  victimDetail: string | null;
  /** Short names of the drawn places: names only, nothing about who was there. */
  places: Record<Id, string>;
  means: {
    methodId: Id;
    noise: number;
    objectId: Id;
    objectName: string;
    /** Where the means lived. */
    placeId: Id;
    /** The last half hour before the act the culprit was there, if any. */
    tick: Tick | null;
  };
  act: {
    tick: Tick;
    placeId: Id;
    bodyFoundAt?: Id;
    taken?: { id: Id; name: string };
    entry?: Entry;
    goodsWentTo?: Id;
    whereabouts?: Id | 'gone';
    fate?: 'left' | 'taken' | 'dead';
  };
  /** Where the culprit truly was, every half hour of the evening. */
  culpritTruth: (Id | null)[];
  /** Where the victim truly was. */
  victimTruth: (Id | null)[];
  /** The anchor that times the act, when one falls on it. */
  anchor: { templateId: Id; highTiming: string; masks: boolean; placeId?: Id } | null;
  soundMasked: boolean;
  discovery: { finder: StoryPerson; placeId: Id; tick: Tick; precinct: Precinct } | null;
  lastSeen: { seer: StoryPerson; placeId: Id; tick: Tick } | null;
  culpritIsClient: boolean;
}

function personOf(kase: Case, id: Id): StoryPerson {
  const p = kase.people.find((q) => q.id === id);
  if (!p) throw new Error(`story: no person ${id}`);
  return {
    id: p.id,
    name: p.name,
    surname: p.surname,
    gender: p.gender ?? p.dossier?.gender ?? 'm',
    role: p.role,
    ...(p.archetypeId === undefined ? {} : { archetypeId: p.archetypeId }),
  };
}

function truthOf(kase: Case, id: Id): (Id | null)[] {
  return (kase.schedules.find((s) => s.personId === id)?.truth ?? []).slice();
}

/**
 * The anchor that times the act. The generator deals the low anchor first and
 * the high one second, and the high one is the one that falls on the act's
 * half hour; anything dealt after those two is an extra. Read that way round,
 * with a search as the fallback, so the story names the anchor the case was
 * built on and not a passing one that happens to share the half hour.
 */
function sceneAnchor(kase: Case): StoryInput['anchor'] {
  const M = kase.act.tick;
  const high = kase.anchors[1];
  const hit =
    high !== undefined && high.ticks.includes(M)
      ? high
      : kase.anchors.find((a) => a.ticks.includes(M) && (a.placeId === undefined || a.placeId === kase.act.place));
  if (!hit) return null;
  return {
    templateId: hit.templateId,
    highTiming: hit.highTiming,
    masks: hit.masks,
    ...(hit.placeId === undefined ? {} : { placeId: hit.placeId }),
  };
}

/** The only reader of a `Case` in this file. */
export function storyInput(kase: Case): StoryInput {
  const act = kase.act;
  const culpritId = kase.solution.killerId;
  const victimId = (kase.people.find((p) => p.kind === 'victim') as { id: Id }).id;
  const killer = kase.people.find((p) => p.id === culpritId);
  const culpritTruth = truthOf(kase, culpritId);
  const M = act.tick;
  const method = kase.method;
  const object = kase.objects.find((o) => o.id === method.evidenceObjectId);
  const accessPlace = method.accessRequirement.place;
  let accessTick: Tick | null = null;
  for (let t = M - 1; t >= 0; t--) {
    if (culpritTruth[t] === accessPlace) {
      accessTick = t;
      break;
    }
  }
  const places: Record<Id, string> = {};
  for (const p of kase.places) places[p.id] = p.shortName;
  const tie = killer?.dossier?.tie;
  const victimDetail = kase.people.find((p) => p.id === victimId)?.dossier?.profession.detail ?? null;
  const bio = kase.victimBio;
  const discovery = bio.discovery;
  const lastSeen = bio.lastSeen;
  return {
    seed: kase.seed,
    type: act.type,
    tropeId: act.tropeId,
    culprit: personOf(kase, culpritId),
    victim: personOf(kase, victimId),
    tie: tie ? { relationshipId: tie.relationshipId, text: tie.text, backstory: tie.backstory } : null,
    motive: killer?.motive ? { type: killer.motive.type, description: killer.motive.description } : null,
    standing: bio.standing ?? null,
    victimDetail,
    places,
    means: {
      methodId: method.id,
      noise: method.noise,
      objectId: method.evidenceObjectId,
      objectName: object?.name ?? method.name,
      placeId: accessPlace,
      tick: accessTick,
    },
    act: {
      tick: M,
      placeId: act.place,
      ...(act.bodyFoundAt === undefined ? {} : { bodyFoundAt: act.bodyFoundAt }),
      ...(act.taken === undefined ? {} : { taken: { id: act.taken.id, name: act.taken.name } }),
      ...(act.entry === undefined ? {} : { entry: act.entry }),
      ...(act.goodsWentTo === undefined ? {} : { goodsWentTo: act.goodsWentTo }),
      ...(act.whereabouts === undefined ? {} : { whereabouts: act.whereabouts }),
      ...(act.fate === undefined ? {} : { fate: act.fate }),
    },
    culpritTruth,
    victimTruth: truthOf(kase, victimId),
    anchor: sceneAnchor(kase),
    soundMasked: kase.soundMasked,
    discovery: discovery
      ? {
          finder: personOf(kase, discovery.foundById),
          placeId: discovery.foundAt,
          tick: discovery.foundTick,
          precinct: discovery.precinct,
        }
      : null,
    lastSeen: lastSeen ? { seer: personOf(kase, lastSeen.byId), placeId: lastSeen.place, tick: lastSeen.tick } : null,
    culpritIsClient: kase.clientId === culpritId,
  };
}

/* ------------------------------------------------------------ the facts */

/**
 * What one line of the story asserts. The story test reads each of these back
 * against the whole case; the generator attaches them as it fills a card, so
 * a line cannot say a thing without saying which fact it rests on.
 */
export type StoryFact =
  /** The line names this person, or refers to them by pronoun. */
  | { kind: 'names'; personId: Id }
  | { kind: 'gender'; personId: Id; gender: 'm' | 'f' }
  /** The line names this place. */
  | { kind: 'place'; placeId: Id }
  /** The line names this half hour. */
  | { kind: 'time'; tick: Tick }
  /** A third party named in the tie or the motive. */
  | { kind: 'mention'; name: string }
  /** This person truly was at this place at each of these ticks. */
  | { kind: 'at'; personId: Id; placeId: Id; ticks: Tick[] }
  /** ...and was not there the half hour before. */
  | { kind: 'arrived'; personId: Id; placeId: Id; tick: Tick }
  /** Nobody but these people was at the place at the tick. */
  | { kind: 'alone'; placeId: Id; tick: Tick; ids: Id[] }
  | { kind: 'culprit'; personId: Id }
  | { kind: 'act'; placeId: Id; tick: Tick }
  | { kind: 'caseType'; value: CaseType }
  | { kind: 'trope'; value: Id }
  | { kind: 'fate'; value: 'left' | 'taken' }
  | { kind: 'method'; value: Id }
  /** The means lived here. */
  | { kind: 'means'; placeId: Id; objectId: Id }
  | { kind: 'tie'; personId: Id; relationshipId: Id; variant?: number }
  | { kind: 'tieText'; personId: Id; text: string }
  | { kind: 'motive'; personId: Id; value: string }
  | { kind: 'role'; personId: Id; role?: string; archetypeId?: Id }
  | { kind: 'standing'; personId: Id; archetypeId?: Id; variant?: number }
  | { kind: 'detail'; personId: Id; archetypeId: Id; variant: number }
  | { kind: 'anchor'; templateId: Id; tick: Tick }
  | { kind: 'masked' }
  | { kind: 'taken'; objectId: Id }
  | { kind: 'weapon'; objectId: Id }
  | { kind: 'moved'; placeId: Id; byTick: Tick }
  | { kind: 'goods'; placeId: Id }
  | { kind: 'whereabouts'; value: Id | 'gone' }
  | { kind: 'found'; personId: Id; placeId: Id; tick: Tick }
  | { kind: 'precinct'; value: Precinct }
  | { kind: 'lastSeen'; personId: Id; placeId: Id; tick: Tick }
  | { kind: 'client'; personId: Id };

export interface StoryLine {
  beat: string;
  cardId: string;
  text: string;
  facts: StoryFact[];
}

export interface Story {
  paragraphs: StoryLine[][];
}

/* ------------------------------------------------------------ the deck */

export interface StoryCard {
  id: string;
  deck: string;
  text: string;
  tags: Record<string, string | number>;
  status: string;
}

export const STORY_CARDS: StoryCard[] = (deckJson as unknown as StoryCard[]).filter((c) => c.status !== 'cut');

/** Tags whose value on a card is a claim about the case, and the fact it is. */
const CLAIM_TAGS = ['caseType', 'trope', 'fate', 'method', 'precinct', 'anchor'] as const;

/** One slot's words and what they assert. */
interface Slot {
  text: string;
  facts: StoryFact[];
}

type Slots = Record<string, Slot | undefined>;
type Query = Record<string, string | number>;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function cardMatches(card: StoryCard, beat: string, query: Query): boolean {
  if (card.tags.beat !== beat) return false;
  for (const [key, value] of Object.entries(card.tags)) {
    if (key === 'beat' || value === 'any') continue;
    if (!(key in query) || query[key] !== value) return false;
  }
  return true;
}

function specificity(card: StoryCard): number {
  return Object.entries(card.tags).filter(([k, v]) => k !== 'beat' && v !== 'any').length;
}

const SLOT_RE = /\{(\w+)\}/g;

const CARD_TEXT = new Map(STORY_CARDS.map((c) => [c.id, c.text]));

function cardText(id: string): string {
  return CARD_TEXT.get(id) ?? '';
}

/** The first word of a card, or the slot it opens on. */
function opener(text: string): string {
  return (/^(\{\w+\}|[A-Za-z’']+)/.exec(text)?.[1] ?? '').toLowerCase();
}

function slotNames(text: string): string[] {
  return [...text.matchAll(SLOT_RE)].map((m) => m[1] as string);
}

/** Every sentence starts with a capital, whatever slot it opened on. */
function capitalise(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, c: string) => `${lead}${c.toUpperCase()}`);
}

/* ------------------------------------------------------------ helpers */

function definite(name: string): string {
  return name.replace(/^(a|an)\s+/i, 'the ');
}

function pronouns(gender: 'm' | 'f'): { he: string; his: string; him: string; himself: string } {
  return gender === 'f'
    ? { he: 'she', his: 'her', him: 'her', himself: 'herself' }
    : { he: 'he', his: 'his', him: 'him', himself: 'himself' };
}

/** A template with `{slot}`s, read back against the sentence it made. */
function parseTemplate(template: string, text: string): Record<string, string> | null {
  const names: string[] = [];
  const pattern = template
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (m) {
        names.push(m[1] as string);
        return '(.+?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  const body = text.trim().replace(/\.$/, '');
  const hit = new RegExp(`^${pattern}$`, 'i').exec(body);
  if (!hit) return null;
  const out: Record<string, string> = {};
  names.forEach((name, i) => {
    const value = hit[i + 1] as string;
    if (out[name] === undefined) out[name] = value;
  });
  return out;
}

/** Where somebody was, as runs: `[place, from, to]`, skipping the blanks. */
function runs(truth: (Id | null)[], from: Tick, to: Tick): { placeId: Id; from: Tick; to: Tick }[] {
  const out: { placeId: Id; from: Tick; to: Tick }[] = [];
  for (let t = from; t <= to; t++) {
    const here = truth[t];
    if (here === null || here === undefined) continue;
    const last = out[out.length - 1];
    if (last && last.placeId === here && last.to === t - 1) last.to = t;
    else out.push({ placeId: here, from: t, to: t });
  }
  return out;
}

/** The first tick of the unbroken stretch at `place` that ends at `end`. */
function stretchStart(truth: (Id | null)[], place: Id, end: Tick): Tick | null {
  if (truth[end] !== place) return null;
  let t = end;
  while (t > 0 && truth[t - 1] === place) t--;
  return t;
}

/** Half hours as somebody says a length of time: "an hour and a half". */
export function spanText(halfHours: number): string {
  const whole = Math.floor(halfHours / 2);
  const half = halfHours % 2 === 1;
  if (whole === 0) return 'half an hour';
  const hours = whole === 1 ? 'an hour' : `${['two', 'three', 'four', 'five'][whole - 2] ?? String(whole)} hours`;
  if (!half) return hours;
  return whole === 1 ? 'an hour and a half' : `${hours.replace(' hours', '')} and a half hours`;
}

function ticks(from: Tick, to: Tick): Tick[] {
  const out: Tick[] = [];
  for (let t = from; t <= to; t++) out.push(t);
  return out;
}

/* ------------------------------------------------------------ telling */

class Teller {
  private readonly lines: StoryLine[][] = [[]];
  /** Whose name the last line of this paragraph opened on, and whether as a pronoun. */
  private lead: { who: 'culprit' | 'victim'; pronoun: boolean } | null = null;
  private readonly base: Slots;
  private readonly context: Query;

  constructor(readonly input: StoryInput) {
    const { culprit, victim } = input;
    const a = pronouns(culprit.gender);
    const v = pronouns(victim.gender);
    const cNames: StoryFact[] = [{ kind: 'names', personId: culprit.id }];
    const vNames: StoryFact[] = [{ kind: 'names', personId: victim.id }];
    const cG: StoryFact[] = [...cNames, { kind: 'gender', personId: culprit.id, gender: culprit.gender }];
    const vG: StoryFact[] = [...vNames, { kind: 'gender', personId: victim.id, gender: victim.gender }];
    this.base = {
      actor: { text: culprit.surname, facts: cNames },
      actorFull: { text: culprit.name, facts: cNames },
      he: { text: a.he, facts: cG },
      his: { text: a.his, facts: cG },
      him: { text: a.him, facts: cG },
      himself: { text: a.himself, facts: cG },
      victim: { text: victim.surname, facts: vNames },
      victimFull: { text: victim.name, facts: vNames },
      vhe: { text: v.he, facts: vG },
      vhis: { text: v.his, facts: vG },
      vhim: { text: v.him, facts: vG },
      scene: this.place(input.act.placeId),
    };
    this.context = {
      caseType: input.type,
      trope: input.tropeId,
      method: input.means.methodId,
      ...(input.act.fate === 'left' || input.act.fate === 'taken' ? { fate: input.act.fate } : {}),
    };
    if (input.act.taken) {
      const taken: StoryFact[] = [{ kind: 'taken', objectId: input.act.taken.id }];
      this.base.aTaken = { text: input.act.taken.name, facts: taken };
      this.base.taken = { text: definite(input.act.taken.name), facts: taken };
    }
  }

  place(id: Id | undefined): Slot | undefined {
    if (id === undefined) return undefined;
    const name = this.input.places[id];
    return name === undefined ? undefined : { text: name, facts: [{ kind: 'place', placeId: id }] };
  }

  time(tick: Tick): Slot {
    return { text: spokenClock(tick), facts: [{ kind: 'time', tick }] };
  }

  paragraph(): void {
    if ((this.lines[this.lines.length - 1] ?? []).length > 0) this.lines.push([]);
    this.lead = null;
  }

  /**
   * Deal one card for a beat and put it on the page. The most specific card
   * that fits the case and whose slots can all be filled wins; ties are broken
   * off the seed, so one case always tells the same story.
   */
  say(beat: string, extra: Query = {}, slots: Slots = {}, facts: StoryFact[] = [], avoidEcho = false): boolean {
    const made = this.compose(beat, extra, slots, facts);
    if (made === null) return false;
    // Colour that says again what this paragraph has already said — the
    // bootlegger's four bars, twice — is left out rather than repeated.
    if (avoidEcho && this.echoes(made.line.text)) return false;
    (this.lines[this.lines.length - 1] as StoryLine[]).push(made.line);
    this.lead = made.lead;
    return true;
  }

  /** The line a beat would say, without saying it. */
  peek(beat: string, extra: Query = {}, slots: Slots = {}): string | null {
    return this.compose(beat, extra, slots, [])?.line.text ?? null;
  }

  private compose(
    beat: string,
    extra: Query,
    slots: Slots,
    facts: StoryFact[],
  ): { line: StoryLine; lead: { who: 'culprit' | 'victim'; pronoun: boolean } | null } | null {
    const query: Query = { ...this.context, ...extra };
    const all: Slots = { ...this.base, ...slots };
    const fits = STORY_CARDS.filter(
      (c) => cardMatches(c, beat, query) && slotNames(c.text).every((s) => all[s] !== undefined),
    );
    if (fits.length === 0) return null;
    const best = Math.max(...fits.map(specificity));
    let pool = fits.filter((c) => specificity(c) === best);
    // Two lines running do not open on the same word: "By half past seven
    // she was at the fourth floor. By half past seven he was at the cab stand."
    const paragraph = this.lines[this.lines.length - 1] ?? [];
    const last = paragraph[paragraph.length - 1];
    const lastOpener = last === undefined ? null : opener(cardText(last.cardId));
    const varied = pool.filter((c) => opener(c.text) !== lastOpener);
    if (varied.length > 0) pool = varied;
    const rng = new Rng(hash(`${this.input.seed}:${beat}:${JSON.stringify(extra)}`));
    const card = rng.pick(pool);
    const used: StoryFact[] = [];
    // A line that opens on the same person the last one opened on says "he"
    // or "she" the second time, and the name again the third: "Grasso rented
    // the rooms... He had lost his business..." rather than a paragraph of
    // sentences that all begin with the same surname. Only where the name is
    // the subject on its own: "Grasso, Sweeney and Quill were..." keeps it.
    let source = card.text;
    const opens = /^\{(actor|actorFull|he|victim|victimFull|vhe)\}(?= [a-z])(?! and )/.exec(source);
    const who = opens === null ? null : /^(actor|actorFull|he)$/.test(opens[1] as string) ? 'culprit' : 'victim';
    let pronoun = opens !== null && (opens[1] === 'he' || opens[1] === 'vhe');
    if (who !== null && this.lead?.who === who && !this.lead.pronoun && !pronoun) {
      source = source.replace(/^\{\w+\}/, who === 'culprit' ? '{he}' : '{vhe}');
      pronoun = true;
    }
    let text = source;
    for (const name of new Set(slotNames(source))) {
      const slot = all[name] as Slot;
      text = text.split(`{${name}}`).join(slot.text);
      used.push(...slot.facts);
    }
    for (const key of CLAIM_TAGS) {
      const value = card.tags[key];
      if (value === undefined || value === 'any') continue;
      used.push(claimOf(key, String(value), this.input));
    }
    return {
      line: {
        beat,
        cardId: card.id,
        text: capitalise(tidyPunctuation(text)),
        facts: dedupe([...used, ...facts]),
      },
      lead: who === null ? null : { who: who as 'culprit' | 'victim', pronoun },
    };
  }

  /** Does this share three words running with a line already in the paragraph? */
  private echoes(text: string): boolean {
    const names = new Set([this.input.culprit.surname, this.input.victim.surname].map((n) => n.toLowerCase()));
    const shingles = (t: string): Set<string> => {
      const words = t.toLowerCase().replace(/[^a-z’' ]/g, ' ').split(/\s+/).filter((w) => w.length > 0 && !names.has(w));
      const out = new Set<string>();
      for (let i = 0; i + 2 < words.length; i++) out.add(words.slice(i, i + 3).join(' '));
      return out;
    };
    const mine = shingles(text);
    const said = (this.lines[this.lines.length - 1] ?? []).map((l) => l.text).join(' ');
    for (const s of shingles(said)) if (mine.has(s)) return true;
    return false;
  }

  story(): Story {
    return { paragraphs: this.lines.filter((p) => p.length > 0) };
  }
}

function claimOf(key: (typeof CLAIM_TAGS)[number], value: string, input: StoryInput): StoryFact {
  switch (key) {
    case 'caseType':
      return { kind: 'caseType', value: value as CaseType };
    case 'trope':
      return { kind: 'trope', value };
    case 'fate':
      return { kind: 'fate', value: value as 'left' | 'taken' };
    case 'method':
      return { kind: 'method', value };
    case 'precinct':
      return { kind: 'precinct', value: value as Precinct };
    case 'anchor':
      return { kind: 'anchor', templateId: value, tick: input.act.tick };
  }
}

function dedupe(facts: StoryFact[]): StoryFact[] {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = JSON.stringify(f);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The story of one case, from the fields `storyInput` copied out of it. */
export function tellStory(input: StoryInput): Story {
  const s = new Teller(input);
  const { culprit, victim, act, means } = input;
  const M = act.tick;
  const cid = culprit.id;
  const vid = victim.id;
  const isMissing = input.type === 'missing';
  const isRobbery = input.type === 'robbery';
  const culpritFacts: StoryFact[] = [{ kind: 'culprit', personId: cid }];

  /* 1. Who did it, to whom. ------------------------------------------- */
  s.say('open');
  s.say('headline', {}, {}, culpritFacts);
  s.paragraph();

  /* 2. Who they were to each other, and why. --------------------------- */
  const standing = standingOf(input);
  // The victim's line of work, unless the standing is about to say it again:
  // "the landlord of three tenements" and "owned three tenements" are one fact.
  const standingText = standing
    ? s.peek('standing', { archetype: standing.archetypeId, variant: standing.variant })
    : null;
  if (standingText === null || !sharesThree(victim.role, standingText)) {
    s.say('vrole', {}, { vrole: { text: victim.role, facts: [] } }, [{ kind: 'role', personId: vid, role: victim.role }]);
  }
  if (standing) {
    s.say(
      'standing',
      { archetype: standing.archetypeId, variant: standing.variant },
      {},
      [{ kind: 'standing', personId: vid, archetypeId: standing.archetypeId, variant: standing.variant }],
    );
  }
  const detail = detailOf(input);
  if (detail) {
    s.say('vdetail', { archetype: detail.archetypeId, variant: detail.variant }, {}, [
      { kind: 'detail', personId: vid, archetypeId: detail.archetypeId, variant: detail.variant },
    ], true);
  }
  const archetype = culprit.archetypeId ?? '-';
  s.say('role', { archetype }, { role: { text: culprit.role, facts: [] } }, [
    { kind: 'role', personId: cid, role: culprit.role, archetypeId: archetype },
  ]);
  const tie = tieOf(input);
  if (tie) {
    s.say('tie', { relationship: tie.relationshipId, variant: tie.variant }, tie.slots, [
      { kind: 'tie', personId: cid, relationshipId: tie.relationshipId, variant: tie.variant },
    ]);
  } else if (input.tie) {
    s.say('tie', { relationship: '-', variant: -1 }, { tie: { text: input.tie.text, facts: [] } }, [
      { kind: 'tieText', personId: cid, text: input.tie.text },
    ]);
  }
  if (input.motive) {
    const third = motiveThird(input);
    s.say(
      'motive',
      { motive: input.motive.type },
      third ? { third: { text: third, facts: [{ kind: 'mention', name: third }] } } : {},
      [{ kind: 'motive', personId: cid, value: input.motive.type }],
    );
    s.say(
      'motive-color',
      { motive: input.motive.type },
      third ? { third: { text: third, facts: [{ kind: 'mention', name: third }] } } : {},
      [{ kind: 'motive', personId: cid, value: input.motive.type }],
    );
    if (act.fate === 'left') s.say('why-left', {}, {}, culpritFacts);
  }
  s.paragraph();

  /* 3. The means, and how they came to be there. ----------------------- */
  const meansFacts: StoryFact[] = [{ kind: 'means', placeId: means.placeId, objectId: means.objectId }];
  if (means.tick !== null) {
    s.say(
      'means',
      {},
      { place: s.place(means.placeId), time: s.time(means.tick) },
      [...meansFacts, { kind: 'at', personId: cid, placeId: means.placeId, ticks: [means.tick] }],
    );
  }
  s.say('key', {}, { place: s.place(means.placeId) }, meansFacts);
  const kFrom = stretchStart(input.culpritTruth, act.placeId, M) ?? M;
  const withVictim = !isRobbery;
  const vFrom = withVictim ? (stretchStart(input.victimTruth, act.placeId, M) ?? M) : M;
  // How the culprit got there: from where the means lived, from somewhere
  // else, or there from the start of the evening.
  const came = kFrom > 0 ? runs(input.culpritTruth, 0, kFrom - 1).pop() : undefined;
  const fromMeans = came !== undefined && came.placeId === means.placeId && came.to === means.tick;
  const via = came === undefined || came.to !== kFrom - 1 ? 'start' : fromMeans ? 'means' : 'elsewhere';
  const culpritCame: StoryFact[] = [
    { kind: 'at', personId: cid, placeId: act.placeId, ticks: ticks(kFrom, M) },
    { kind: 'arrived', personId: cid, placeId: act.placeId, tick: kFrom },
    ...(came && via !== 'start' ? [{ kind: 'at' as const, personId: cid, placeId: came.placeId, ticks: [came.to] }] : []),
  ];
  if (via !== 'start' || kFrom < M) {
    s.say(
      'from',
      { via, when: kFrom < M ? 'early' : 'act' },
      { place: came ? s.place(came.placeId) : undefined, time: s.time(kFrom) },
      culpritCame,
    );
  }
  const seenAt = input.victimTruth[M - 1];
  if (input.tropeId === 'payroll' && M > 0 && typeof seenAt === 'string') {
    s.say('carried', {}, { place: s.place(seenAt), time: s.time(M - 1) }, [
      { kind: 'at', personId: vid, placeId: seenAt, ticks: [M - 1] },
    ]);
  }
  if (isMissing && input.lastSeen) {
    const ls = input.lastSeen;
    s.say(
      'lastseen',
      {},
      {
        seer: { text: ls.seer.surname, facts: [{ kind: 'names', personId: ls.seer.id }] },
        place: s.place(ls.placeId),
        time: s.time(ls.tick),
      },
      [{ kind: 'lastSeen', personId: ls.seer.id, placeId: ls.placeId, tick: ls.tick }],
    );
  }
  // How the victim got there, set against the culprit.
  let victimArrived = false;
  if (withVictim && (kFrom < M || vFrom < M)) {
    const order = kFrom < vFrom ? 'culprit-first' : vFrom < kFrom ? 'victim-first' : 'together';
    const span = { text: spanText(Math.abs(vFrom - kFrom)), facts: [] };
    victimArrived = s.say('arrive', { order }, { time: s.time(kFrom), vtime: s.time(vFrom), span }, [
      { kind: 'at', personId: vid, placeId: act.placeId, ticks: ticks(vFrom, M) },
      { kind: 'arrived', personId: vid, placeId: act.placeId, tick: vFrom },
      { kind: 'arrived', personId: cid, placeId: act.placeId, tick: kFrom },
    ]);
  }
  // Where the victim came from, when the story has not already said so.
  if (withVictim && vFrom > 0) {
    const before = runs(input.victimTruth, 0, vFrom - 1).pop();
    const ls = isMissing ? input.lastSeen : null;
    const told = ls !== null && before !== undefined && ls.placeId === before.placeId && ls.tick >= before.from && ls.tick <= before.to;
    if (before && before.to === vFrom - 1 && before.placeId !== act.placeId && !told) {
      s.say(
        'before',
        { arrived: victimArrived ? 'yes' : 'no', stay: before.to > before.from ? 'yes' : 'no' },
        { place: s.place(before.placeId), time: s.time(before.from), until: s.time(before.to) },
        [
          { kind: 'at', personId: vid, placeId: before.placeId, ticks: ticks(before.from, before.to) },
          { kind: 'arrived', personId: vid, placeId: act.placeId, tick: vFrom },
        ],
      );
    }
  }
  const alone: StoryFact = { kind: 'alone', placeId: act.placeId, tick: M, ids: withVictim ? [cid, vid] : [cid] };
  s.paragraph();

  /* 4. The moment. ----------------------------------------------------- */
  const actFacts: StoryFact[] = [{ kind: 'act', placeId: act.placeId, tick: M }];
  const anchor = input.anchor;
  if (anchor) {
    s.say('moment', { timed: 'yes' }, { time: s.time(M), timing: { text: anchor.highTiming, facts: [] } }, [
      ...actFacts,
      { kind: 'anchor', templateId: anchor.templateId, tick: M },
    ]);
  } else {
    s.say('moment', { timed: 'no' }, { time: s.time(M) }, actFacts);
  }
  s.say('alone', { order: withVictim ? 'pair' : 'solo' }, {}, [alone]);
  s.say('act', {}, {}, [...actFacts, ...culpritFacts]);
  const ownerAt = input.victimTruth[M];
  if (isRobbery && input.tropeId !== 'payroll' && typeof ownerAt === 'string' && ownerAt !== act.placeId) {
    s.say('owner', {}, { place: s.place(ownerAt), time: s.time(M) }, [
      { kind: 'at', personId: vid, placeId: ownerAt, ticks: [M] },
    ]);
  }
  if (anchor && input.soundMasked && anchor.masks && means.noise > 0) {
    s.say('cover', { anchor: anchor.templateId }, { anchorPlace: s.place(anchor.placeId) }, [{ kind: 'masked' }]);
  }
  s.say('frame', {}, { weapon: { text: definite(means.objectName), facts: [{ kind: 'weapon', objectId: means.objectId }] } });
  s.paragraph();

  /* 5. Afterwards. ----------------------------------------------------- */
  if (act.bodyFoundAt !== undefined && act.bodyFoundAt !== act.placeId && input.discovery) {
    s.say(
      'moved',
      {},
      { found: s.place(act.bodyFoundAt), time: s.time(input.discovery.tick) },
      [{ kind: 'moved', placeId: act.bodyFoundAt, byTick: input.discovery.tick }],
    );
  }
  // Where the missing person went comes first: it is their night.
  let heldAt: Tick | null = null;
  if (isMissing && act.whereabouts !== undefined) {
    const where = act.whereabouts;
    if (where === 'gone') {
      s.say('whereabouts', { gone: 'yes' }, {}, [{ kind: 'whereabouts', value: 'gone' }]);
    } else {
      const both = act.fate === 'taken' ? afterTick(M, (t) => input.victimTruth[t] === where && input.culpritTruth[t] === where) : null;
      const alone2 = afterTick(M, (t) => input.victimTruth[t] === where);
      const whereFacts: StoryFact[] = [{ kind: 'whereabouts', value: where }];
      if (both !== null) {
        let until = both;
        while (until + 1 < 12 && input.victimTruth[until + 1] === where && input.culpritTruth[until + 1] === where) until++;
        heldAt = until;
        s.say(
          'whereabouts',
          { with: 'yes', timed: 'yes', stay: until > both ? 'yes' : 'no' },
          { where: s.place(where), time: s.time(both), until: s.time(until) },
          [
            ...whereFacts,
            { kind: 'at', personId: vid, placeId: where, ticks: ticks(both, until) },
            { kind: 'at', personId: cid, placeId: where, ticks: ticks(both, until) },
          ],
        );
      } else if (alone2 !== null) {
        s.say('whereabouts', { with: 'no', timed: 'yes' }, { where: s.place(where), time: s.time(alone2) }, [
          ...whereFacts,
          { kind: 'at', personId: vid, placeId: where, ticks: [alone2] },
        ]);
      } else {
        s.say('whereabouts', { timed: 'no' }, { where: s.place(where) }, whereFacts);
      }
    }
  }
  const later = runs(input.culpritTruth, M + 1, input.culpritTruth.length - 1);
  const goods = isRobbery ? act.goodsWentTo : undefined;
  let goodsTold = false;
  let told = 0;
  for (const run of later) {
    if (goods !== undefined && !goodsTold && run.placeId === goods) {
      s.say('goods', { with: 'yes' }, { goods: s.place(goods), time: s.time(run.from) }, [
        { kind: 'goods', placeId: goods },
        { kind: 'at', personId: cid, placeId: goods, ticks: [run.from] },
      ]);
      goodsTold = true;
      continue;
    }
    if (heldAt !== null && run.to <= heldAt) continue;
    if (told >= 3) continue;
    const at: StoryFact = { kind: 'at', personId: cid, placeId: run.placeId, ticks: ticks(run.from, run.to) };
    const step = run.placeId === act.placeId && run.from === M + 1 ? 'stayed' : told === 0 ? 'first' : 'later';
    s.say(
      'after',
      { step, stay: run.to > run.from || step === 'stayed' ? 'yes' : 'no' },
      { place: s.place(run.placeId), time: s.time(run.from), until: s.time(run.to) },
      [at],
    );
    told++;
  }
  if (goods !== undefined && !goodsTold) s.say('goods', { with: 'no' }, { goods: s.place(goods) }, [{ kind: 'goods', placeId: goods }]);
  s.paragraph();

  /* 6. Who found it. ---------------------------------------------------- */
  const d = input.discovery;
  if (d && !isMissing) {
    const finderIsCulprit = d.finder.id === cid;
    s.say(
      'found',
      { finder: finderIsCulprit ? 'culprit' : 'other' },
      {
        finder: { text: d.finder.surname, facts: [{ kind: 'names', personId: d.finder.id }] },
        found: s.place(d.placeId),
        time: s.time(d.tick),
      },
      [{ kind: 'found', personId: d.finder.id, placeId: d.placeId, tick: d.tick }],
    );
    if (d.tick > M) {
      s.say('since', {}, { span: { text: spanText(d.tick - M), facts: [] } }, [
        { kind: 'found', personId: d.finder.id, placeId: d.placeId, tick: d.tick },
        { kind: 'act', placeId: act.placeId, tick: M },
      ]);
    }
    s.say('precinct', { precinct: d.precinct });
  }
  if (isMissing) s.say('behind');
  if (input.culpritIsClient) s.say('hired', {}, {}, [{ kind: 'client', personId: cid }]);
  s.paragraph();
  s.say('close');
  return s.story();
}

/** Do two texts share three words running? */
function sharesThree(a: string, b: string): boolean {
  const grams = (t: string): string[] => {
    const w = t.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((x) => x.length > 0);
    return w.slice(0, -2).map((_x, i) => w.slice(i, i + 3).join(' '));
  };
  const mine = new Set(grams(a));
  return grams(b).some((g) => mine.has(g));
}

function afterTick(M: Tick, test: (t: Tick) => boolean): Tick | null {
  for (let t = M + 1; t < 12; t++) if (test(t)) return t;
  return null;
}

/** Which of the victim's standing templates the case drew, if it can be read back. */
function standingOf(input: StoryInput): { archetypeId: Id; variant: number } | null {
  const id = input.victim.archetypeId;
  const card = id === undefined ? undefined : VICTIM_ARCHETYPE_BY_ID[id];
  if (!card || input.standing === null) return null;
  const variant = card.standing.findIndex(
    (t) => parseTemplate(`${input.victim.surname} ${t}`, input.standing as string) !== null,
  );
  return variant < 0 ? null : { archetypeId: id as Id, variant };
}

/** Which of the victim's profession details the case drew. */
function detailOf(input: StoryInput): { archetypeId: Id; variant: number } | null {
  const id = input.victim.archetypeId;
  const card = id === undefined ? undefined : VICTIM_ARCHETYPE_BY_ID[id];
  if (!card || input.victimDetail === null) return null;
  const variant = card.professionDetails.findIndex((t) => parseTemplate(t, input.victimDetail as string) !== null);
  return variant < 0 ? null : { archetypeId: id as Id, variant };
}

/** Which backstory template the tie was drawn from, and what filled it. */
function tieOf(input: StoryInput): { relationshipId: Id; variant: number; slots: Slots } | null {
  const tie = input.tie;
  if (!tie) return null;
  const rel = RELATIONSHIP_BY_ID[tie.relationshipId];
  if (!rel) return null;
  for (let variant = 0; variant < rel.backstory.length; variant++) {
    const got = parseTemplate(rel.backstory[variant] as string, tie.backstory);
    if (!got) continue;
    if (got.person !== undefined && got.person !== input.culprit.surname) continue;
    if (got.victim !== undefined && got.victim !== input.victim.surname) continue;
    const slots: Slots = {
      spouse: { text: input.culprit.gender === 'f' ? 'wife' : 'husband', facts: [] },
    };
    if (got.year !== undefined) slots.year = { text: got.year, facts: [] };
    if (got.third !== undefined) slots.third = { text: got.third, facts: [{ kind: 'mention', name: got.third }] };
    if (got.place !== undefined) {
      const placeId = Object.keys(input.places).find((k) => input.places[k] === got.place);
      slots.tplace = { text: got.place, facts: placeId ? [{ kind: 'place', placeId }] : [] };
    }
    return { relationshipId: tie.relationshipId, variant, slots };
  }
  return null;
}

/** The third party a jealousy or a protect-another motive turns on. */
function motiveThird(input: StoryInput): string | null {
  const m = input.motive;
  const template = m ? MOTIVE_BY_TYPE[m.type]?.descriptionTemplate : undefined;
  if (!m || !template || !template.includes('{O}')) return null;
  return parseTemplate(template, m.description)?.O ?? null;
}

/* ------------------------------------------------------------ outputs */

export function storyOf(kase: Case): Story {
  return tellStory(storyInput(kase));
}

/** The story as paragraphs of plain text, for the page. */
export function storyParagraphs(story: Story): string[] {
  return story.paragraphs.map((p) => p.map((l) => l.text).join(' '));
}

export function storyWords(story: Story): number {
  return storyParagraphs(story).reduce((n, p) => n + p.split(/\s+/).filter((w) => w.length > 0).length, 0);
}

/** For `npm run read` and `npm run story`. */
export function renderStoryText(story: Story): string {
  const out: string[] = ['WHAT REALLY HAPPENED', '═'.repeat(76), ''];
  for (const paragraph of storyParagraphs(story)) out.push(wrap(paragraph), '');
  return out.join('\n');
}
