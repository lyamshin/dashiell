/**
 * The plain register (M5 §1).
 *
 * Every sentence the engine wrote before this file carried an image, because
 * there was no fact for it to carry: a page was a transition, an arrival, a
 * room, a portrait, a simile and an ambient thought, and the one thing that
 * happened was buried in the middle of it. The briefing is the model of the
 * other thing — sixteen declarative sentences, sixteen facts, no images — and
 * this is the register that lets a page stand on it.
 *
 * Three jobs, exactly as the spec lays them out:
 *
 * 1. **Dossier facts as sentences.** The generator's `DossierFact.text` where
 *    it wrote one, and small shapes where it did not.
 * 2. **Connective tissue.** Going somewhere, arriving, somebody being there,
 *    somebody leaving, a half hour passing with nothing in it. Ten to fifteen
 *    shapes each, allowed to repeat, and carrying no motif — a connective that
 *    carried one would be scored and dealt like an image card, which is
 *    precisely the thing it is here not to be.
 * 3. **The reported fact.** A clue's facts in Dashiell's own voice, for when
 *    the utterance deck has no card — which is every robbery and every
 *    disappearance, because the deck was written for a corpse.
 *
 * Nothing in here draws from a deck and nothing in here is scored for motifs.
 * A line from this file is *plain* by construction, and that is what the
 * measurement in `page.ts` counts.
 */

import type { Clue, Id, Person, Tick } from '../../gen/types.js';
import { clock } from '../../gen/types.js';
import type { DossierFact } from '../../gen/types.js';
import { Rng } from '../../gen/rng.js';
import type { CaseView } from '../derive.js';
import { MOTIVE_POOL } from '../derive.js';
import type { Beat } from './facts.js';
import { beatsOf } from './facts.js';
import { tidyPunctuation } from './prose.js';

/* ------------------------------------------------------------------ *
 * 2. Connective tissue.
 *
 * Thirteen of each. They are furniture: they repeat, they are never the
 * point of a page, and no simile is ever hung on one.
 * ------------------------------------------------------------------ */

/** Leaving one place for another. `{place}` is where he is going. */
export const PLAIN_GOING: string[] = [
  'I went over to {place}.',
  'I walked to {place}.',
  'I took the stairs down and went to {place}.',
  'It was four blocks to {place} and I did them at a walk.',
  'I put my hat on and went to {place}.',
  'I went to {place} next.',
  'The next address was {place}, so I went there.',
  'I left and went to {place}.',
  'I got to {place} a little after that.',
  'I made for {place}.',
  'I went up the block to {place}.',
  'I gave the driver {place} and paid him at the kerb.',
  'That left {place}, so I went to {place}.',
];

/** Being there. `{place}` is where he has arrived. */
export const PLAIN_ARRIVING: string[] = [
  'The door at {place} was open.',
  '{place} was where I said it would be.',
  'I went in at {place}.',
  'Nobody stopped me at the door of {place}.',
  'The lights were on at {place}.',
  'I got to {place} and stood in the doorway a moment.',
  'I came in at {place} and let the door shut behind me.',
  'It was warm inside {place} and cold everywhere else.',
  'There was a step down into {place} and I nearly took it wrong.',
  'The door of {place} gave when I pushed it.',
  '{place} was quiet when I came in.',
  'I found the entrance to {place} on the second try.',
  'I let myself into {place}.',
];

/** Somebody being present. `{name}` and `{place}`. */
export const PLAIN_PRESENT: string[] = [
  '{name} was there.',
  '{name} was at {place} and had been a while.',
  '{name} was in the room.',
  'I found {name} at {place}.',
  '{name} was sitting where I could see the door past them.',
  '{name} looked up when I came in.',
  '{name} was in, which saved me a walk.',
  '{name} was standing at {place} and did not move when I came in.',
  '{name} was the one I had come for.',
  '{name} was there and had nothing better to do.',
  'That was {name}.',
  '{name} was at {place}, as advertised.',
  '{name} had not gone home.',
];

/** Somebody leaving. `{name}`, and `{place}` where they can be found after. */
export const PLAIN_LEAVING: string[] = [
  '{name} left.',
  '{name} put a hat on and went out.',
  '{name} was done talking and went.',
  '{name} went out and did not look back.',
  '{name} said what there was to say and left.',
  '{name} got up and left me the chair.',
  '{name} went, and the room was the size it had been before.',
  '{name} left the way they had come in.',
  '{name} had somewhere to be and went there.',
  '{name} took the stairs down.',
  '{name} went out to {place}.',
  '{name} was gone before I had the question finished.',
  '{name} shut the door on the way out.',
];

/** A half hour with nothing in it. No slots at all. */
export const PLAIN_QUIET: string[] = [
  'Nothing happened for a while.',
  'The half hour went by and took nothing with it.',
  'I waited, and nothing came of the waiting.',
  'Nothing moved.',
  'There was nothing to hear.',
  'Half an hour, and no part of it was any use.',
  'I stood there long enough to know there was nothing in it.',
  'Nobody came and nobody went.',
  'The time went and I had nothing to show for it.',
  'It was quiet, and it stayed quiet.',
  'That was all there was to that.',
  'I gave it a minute more than it was worth.',
  'The clock took its half hour and gave nothing back.',
];

export type ConnectiveKind = 'going' | 'arriving' | 'present' | 'leaving' | 'quiet';

const POOLS: Record<ConnectiveKind, string[]> = {
  going: PLAIN_GOING,
  arriving: PLAIN_ARRIVING,
  present: PLAIN_PRESENT,
  leaving: PLAIN_LEAVING,
  quiet: PLAIN_QUIET,
};

export type PlainSlots = Record<string, string | undefined>;

/** Fill a shape, or return the empty string when a slot has nothing in it. */
export function fillPlain(template: string, slots: PlainSlots): string {
  let out = template;
  for (const name of new Set(out.match(/\{(\w+)\}/g) ?? [])) {
    const key = name.slice(1, -1);
    const value = slots[key];
    if (value === undefined || value.length === 0) return '';
    out = out.split(name).join(value);
  }
  // A shape that opens on a slot gets its capital here: the place names are
  // written lower case — "the speakeasy" — and a sentence is not.
  if (/^\{/.test(template)) out = out.charAt(0).toUpperCase() + out.slice(1);
  return tidyPunctuation(out);
}

/**
 * One connective sentence. Repetition is allowed — that is what the register
 * is for — but not twice running out of the same pool, so `avoid` carries the
 * last one and the draw walks past it.
 */
export function connective(
  rng: Rng,
  kind: ConnectiveKind,
  slots: PlainSlots = {},
  avoid: string | null = null,
): string {
  const pool = POOLS[kind];
  const start = rng.int(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const template = pool[(start + i) % pool.length] as string;
    if (template === avoid) continue;
    const text = fillPlain(template, slots);
    if (text.length > 0) return text;
  }
  return '';
}

/* ------------------------------------------------------------------ *
 * 1. Dossier facts as sentences.
 * ------------------------------------------------------------------ */

const DECADES: Record<number, string> = {
  1: 'teens',
  2: 'twenties',
  3: 'thirties',
  4: 'forties',
  5: 'fifties',
  6: 'sixties',
  7: 'seventies',
};

/** "He is in his forties." The band, never the number, when it is on sight. */
export function ageBandSentence(person: Person): string {
  const d = person.dossier;
  if (!d) return '';
  const decade = DECADES[Math.floor(d.age / 10)];
  const their = d.gender === 'f' ? 'her' : 'his';
  const they = d.gender === 'f' ? 'She' : 'He';
  return decade ? `${they} is in ${their} ${decade}.` : `${they} is ${d.age}.`;
}

/**
 * A dossier fact as one plain sentence.
 *
 * The generator wrote most of them and its text wins — it is the text the
 * truth sheet prints and the correspondence checker has already passed. Where
 * it wrote a fragment ("A longshoreman.", "A man.") the shape here makes a
 * sentence of it with the person's name in front, because a notebook entry
 * that says only "A man." is a fact about nobody.
 */
export function dossierSentence(person: Person, fact: DossierFact): string {
  const text = fact.text.trim();
  const surname = person.surname;
  const gender = person.dossier?.gender ?? person.gender ?? 'm';
  const they = gender === 'f' ? 'She' : 'He';
  switch (fact.kind) {
    case 'gender':
      return `${surname} is a ${gender === 'f' ? 'woman' : 'man'}.`;
    case 'age':
      return ageBandSentence(person) || `${surname} is ${person.dossier?.age ?? 40}.`;
    case 'profession': {
      // "A longshoreman." is a fragment the sheet prints under a heading.
      const role = text.replace(/^A[n]?\s+/i, '').replace(/\.$/, '');
      return role.length > 0 ? `${surname} is a ${role}.` : '';
    }
    default:
      break;
  }
  if (text.length === 0) return '';
  // Anything else the generator wrote is already a sentence about this person.
  if (/^[A-Z]/.test(text) && text.includes(surname)) return endStop(text);
  if (/^(a|an|the)\s/i.test(text)) return endStop(`${surname} is ${lower(text)}`);
  if (/^(wants|is|was|has|had|does|did)\b/i.test(text)) return endStop(`${surname} ${lower(text)}`);
  if (/^[A-Z]/.test(text)) return endStop(text);
  return endStop(`${they} ${text}`);
}

function lower(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function endStop(text: string): string {
  const t = text.trim();
  if (t.length === 0) return '';
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/**
 * Layer 0 as one sentence rather than three.
 *
 * The three facts a look at somebody gives up — man or woman, roughly how old,
 * and the trade if the trade shows — are three entries in the notebook and one
 * sentence on the page. "Hanrahan is a woman. She is in her forties. She is a
 * private secretary." is a form being filled in; "Hanrahan is a private
 * secretary in her forties" is somebody looking at somebody.
 */
export function onSightSentence(person: Person): string {
  const d = person.dossier;
  if (!d) return '';
  const layer = (person.dossier?.layers ?? []).filter((f) => f.layer === 0);
  const has = (kind: string): boolean => layer.some((f) => f.kind === kind);
  const decade = DECADES[Math.floor(d.age / 10)];
  const noun = d.gender === 'f' ? 'woman' : 'man';
  const their = d.gender === 'f' ? 'her' : 'his';
  const age = has('age') && decade ? `in ${their} ${decade}` : '';
  const trade = has('profession')
    ? d.profession.role.replace(/^A[n]?\s+/i, '').replace(/\.$/, '')
    : '';
  // The trade where the trade shows, else what a look gives up on its own.
  const what = trade.length > 0 ? trade : has('gender') ? noun : '';
  if (what.length === 0) return '';
  const article = /^[aeiou]/i.test(what) ? 'an' : 'a';
  return endStop(`${person.surname} is ${article} ${what}${age.length > 0 ? ` ${age}` : ''}`);
}

/** Every dossier fact this person carries at one layer, as sentences. */
export function layerSentences(person: Person, layer: 0 | 1 | 2 | 3): string[] {
  const facts = (person.dossier?.layers ?? []).filter((f) => f.layer === layer);
  const out: string[] = [];
  for (const f of facts) {
    const line = dossierSentence(person, f);
    if (line.length > 0 && !out.includes(line)) out.push(line);
  }
  return out;
}

/**
 * What somebody says when they are asked about themselves (§3).
 *
 * The generator writes the self-account in the third person, so that one
 * string serves the sheet, the dossier and the briefing. In a person's own
 * mouth it goes into the first: "Feeney is 31 years old and a longshoreman"
 * is "I'm 31 years old and a longshoreman."
 */
export function firstPerson(person: Person, sentence: string): string {
  const surname = person.surname;
  const given = person.name.split(/\s+/)[0] ?? surname;
  let text = sentence.trim();
  const names = [person.name, `${surname}’s`, `${surname}'s`, surname, given];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const possessive = /[’']s$/.test(name);
    text = text.replace(new RegExp(`\\b${escaped}`, 'g'), possessive ? 'my' : 'I');
  }
  if (!/\bI\b|\bmy\b/.test(text)) return endStop(capitalize(text));

  // The pronouns in the phrase were the person's own: "has not worked since
  // her marriage" is "I have not worked since my marriage". Both sets go,
  // whatever the dossier says the speaker is — a handful of the generator's
  // profession details are written with a "he" in them and are handed to
  // whoever drew the archetype, and in a person's own mouth it is "I" either
  // way.
  text = text
    .replace(/\b(?:he|she)\b/g, 'I')
    .replace(/\b(?:his|her)\b/g, 'my')
    .replace(/\b(?:him|hers)\b/g, 'me');

  // The generator writes the details as subjectless verb phrases in the third
  // person — "writes the tickets behind the grille and knows what a thing is
  // worth" — so every clause in the sentence opens on a verb that has to be
  // conjugated, not just the first. The clause heads are the word after "I",
  // after "and", and after a comma.
  text = text.replace(
    /(^|\bI\s+|,\s+and\s+|\s+and\s+|,\s+)([a-z][a-z'’]*)\b/g,
    (_m, head: string, verb: string) => `${head}${conjugate(verb)}`,
  );
  return endStop(capitalize(text.replace(/^i\b/, 'I')));
}

/** The irregulars, and then the rule. */
const CONJUGATED: Record<string, string> = {
  is: 'am',
  has: 'have',
  does: 'do',
  goes: 'go',
  was: 'was',
  its: 'its',
  this: 'this',
  hours: 'hours',
  cases: 'cases',
  rooms: 'rooms',
  years: 'years',
  columns: 'columns',
  letters: 'letters',
  nights: 'nights',
  coats: 'coats',
  bundles: 'bundles',
  pupils: 'pupils',
  floors: 'floors',
  buildings: 'buildings',
};

/**
 * A third-person singular verb in the first person. `is` becomes `am`, a `-es`
 * after a sibilant loses both letters, a `-ies` becomes `-y`, and anything
 * else loses its `s`. Words that are not verbs — `his`, `this`, a plural noun
 * that opens a clause — are left where they are.
 */
export function conjugate(word: string): string {
  const known = CONJUGATED[word];
  if (known !== undefined) return known;
  if (!word.endsWith('s')) return word;
  if (/(ss|us|is|as|ous)$/.test(word)) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.slice(0, -2);
  return word.slice(0, -1);
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/* ------------------------------------------------------------------ *
 * 3. The reported fact.
 * ------------------------------------------------------------------ */

/**
 * Does the utterance deck know how to say this fact for this case?
 *
 * The three fact kinds that close the time — `timeOfDeath`, `victimAliveAt`,
 * `victimDeadBy` — are the same three in all three case types, because the
 * machinery behind them is the same machinery (Phase 1's first hard thing).
 * The cards written for them are not: every one of them is about a body. So a
 * robbery or a disappearance says them plainly instead, which is exactly what
 * §1's third bullet and §7 ask for.
 */
export const BODY_FACT_KINDS: ReadonlySet<string> = new Set([
  'timeOfDeath',
  'victimAliveAt',
  'victimDeadBy',
]);

export function deckKnows(view: CaseView, kind: string): boolean {
  return view.kase.act.type === 'murder' || !BODY_FACT_KINDS.has(kind);
}

/**
 * One fact, plainly, in Dashiell's voice. The alternative is the clue's own
 * record text dropped on the page unattributed, which is what the engine did
 * before and which reads as a paragraph nobody wrote.
 */
export function plainBeat(view: CaseView, beat: Beat): string {
  const type = view.kase.act.type;
  const s = beat.slots;
  const name = s.subject ?? s.name ?? 'somebody';
  const place = s.place ?? 'the address';
  const time = s.time ?? 'that evening';
  const thing = view.kase.act.taken?.name ?? 'it';
  switch (beat.kind) {
    case 'personAt':
      return `${name} was at ${place} at ${time}.`;
    case 'personNotAt':
      return `${name} was not at ${place} at ${time}.`;
    case 'denial':
      return `${name} says they were not at ${place} at ${time}.`;
    case 'noiseAt':
      return `Something was heard at ${place} at ${time}.`;
    case 'timeOfDeath':
      return type === 'murder'
        ? `The coroner puts it ${s.window ?? 'that evening'}.`
        : type === 'robbery'
          ? `The precinct puts it ${s.window ?? 'that evening'}.`
          : `Nobody can put it closer than ${s.window ?? 'that evening'}.`;
    case 'victimAliveAt':
      // §7: the owner of a stolen thing is alive. What the fact closes is when
      // the thing was last where it belonged, and that is what it says.
      return type === 'robbery'
        ? `${name} still had ${thing} at ${time}.`
        : type === 'missing'
          ? `${name} was still about at ${time}.`
          : `${name} was still alive at ${time}.`;
    case 'victimDeadBy':
      return type === 'robbery'
        ? `${thing} was gone by ${time}.`
        : type === 'missing'
          ? `${name} was gone by ${time}.`
          : `${name} was dead by ${time}.`;
    case 'hasMotive':
      return endStop(`${name} ${s.motive ?? 'had a reason'}`);
    case 'objectMissing':
      return `${capitalize(s.object ?? 'the thing')} is gone from ${place}.`;
    case 'secretExplained':
      return `${name}’s ${s.secret ?? 'business'} is accounted for, and it is not this.`;
    default:
      return '';
  }
}

/**
 * How a plainly-reported fact is introduced: the person said it, the detective
 * writes down what it amounts to. Not a quotation — nobody said these words —
 * and not the record's reluctant lead either, because there was nothing hard
 * about getting it.
 */
export const PLAIN_LEADS: string[] = [
  '{name} told me, and it comes to this:',
  '{name} had it straight, and it amounts to this:',
  'What {name} gave me was plain enough:',
  '{name} said it without being pressed:',
  'From {name}, and no trouble getting it:',
];

/** A whole clue, plainly. One sentence a fact, in the order the clue states them. */
export function plainClue(view: CaseView, clue: Clue): string[] {
  return beatsOf(view, clue)
    .map((b) => plainBeat(view, b))
    .filter((s) => s.length > 0);
}

/**
 * The motive as a plain sentence, for a notebook entry or a report menu that
 * has the case in hand. `MOTIVE_POOL`'s description is the object-free
 * category; a person's own `motive.description` names its object.
 */
export function plainMotive(view: CaseView, personId: Id, motiveType: string): string {
  const person = view.personById.get(personId);
  const own = person?.motive;
  if (own && own.type === motiveType) return endStop(own.description);
  const pool = MOTIVE_POOL.find((m) => m.type === motiveType);
  return endStop(`${person?.surname ?? 'somebody'} ${pool?.description ?? motiveType}`);
}

/* ------------------------------------------------------------------ *
 * The measurement (§1).
 * ------------------------------------------------------------------ */

/**
 * How many sentences a run of prose is.
 *
 * Deliberately crude: a full stop, a bang or a query, with whitespace or the
 * end of the line after it. An abbreviation inside a card ("Mrs. Teague's")
 * would be over-counted, and would be over-counted the same way on both sides
 * of the ratio, so it does not move the number that is being measured.
 */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const hits = trimmed.match(/[.!?…]+(?=["”’')\]]*(\s|$))/g);
  return Math.max(1, hits?.length ?? 1);
}

export interface PlainCount {
  plain: number;
  image: number;
}

export function plainRatio(count: PlainCount): number {
  const total = count.plain + count.image;
  return total === 0 ? 1 : count.plain / total;
}

/** The floor the page assembler enforces, and the target it is measured against. */
export const PLAIN_FLOOR = 0.5;
export const PLAIN_TARGET = 0.55;

/** A person's layer-2 facts, for the ride-along on an observation (§3). */
export function layerTwoAbout(person: Person): string[] {
  return layerSentences(person, 2);
}

/* ------------------------------------------------------------------ *
 * What has been learned about somebody, by layer (§3, §4).
 *
 * Derived, never stored: the notebook and the page both read it, so neither
 * can be stale and neither can disagree with the other.
 * ------------------------------------------------------------------ */

export interface DossierKnown {
  layer0: string[];
  layer1: string[];
  layer2: string[];
  layer3: string[];
}

/** Which clue kinds carry which layer about the person they are about. */
const LAYER_BY_KIND: Record<string, 2 | 3> = {
  observation: 2,
  overheard: 2,
  denial: 2,
  document: 3,
};

/** Which layer a clue of this kind hands over about the person it is about. */
export function layerOfClue(clue: Clue): 2 | 3 | null {
  return LAYER_BY_KIND[clue.kind] ?? null;
}

/** The person a clue is about, for the ride-along. */
export function clueAbout(clue: Clue): Id | null {
  for (const f of clue.establishes) {
    if ('personId' in f) return f.personId;
  }
  return clue.aboutSecretOf ?? null;
}

/**
 * How many clues of a layer-bearing kind about this person are in hand. The
 * nth such clue hands over the nth fact of that layer, so the dossier fills in
 * as the case does and never faster.
 */
export function layerCredit(
  view: CaseView,
  personId: Id,
  found: readonly Id[],
  layer: 2 | 3,
): number {
  let n = 0;
  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    if (LAYER_BY_KIND[clue.kind] !== layer) continue;
    if (clueAbout(clue) !== personId) continue;
    n++;
  }
  return n;
}

/**
 * Everything learned about one person, by layer. Layer 0 the moment they are
 * met; layer 1 when they have been asked about themselves; layer 2 and layer 3
 * as the clues that carry them come in.
 */
export interface Learned {
  found: readonly Id[];
  met: readonly Id[];
  /** People who have been asked about themselves. */
  selfTold: readonly Id[];
  /** People a yapper has given up a layer-2 fact about, unasked. */
  gossip: readonly Id[];
}

export function dossierKnown(view: CaseView, personId: Id, learned: Learned): DossierKnown {
  const person = view.personById.get(personId);
  if (!person) return { layer0: [], layer1: [], layer2: [], layer3: [] };
  const seen = learned.met.includes(personId);
  const gossiped = learned.gossip.filter((id) => id === personId).length;
  return {
    layer0: seen ? layerSentences(person, 0) : [],
    layer1: learned.selfTold.includes(personId) ? layerSentences(person, 1) : [],
    layer2: layerSentences(person, 2).slice(
      0,
      layerCredit(view, personId, learned.found, 2) + gossiped,
    ),
    layer3: layerSentences(person, 3).slice(0, layerCredit(view, personId, learned.found, 3)),
  };
}

/**
 * Who a yapper talks about when they have finished talking about themselves,
 * and which fact they give up: the next one nobody has yet, about somebody
 * whose dossier still has something in it. Deterministic, and never about the
 * speaker, because §3 asks for a fact about somebody *else*.
 */
export function gossipTarget(
  view: CaseView,
  speakerId: Id,
  learned: Learned,
): { personId: Id; text: string } | null {
  const order = view.kase.people.filter(
    (p) => p.id !== speakerId && p.kind === 'suspect' && learned.met.includes(p.id),
  );
  const pool = order.length > 0 ? order : view.kase.people.filter((p) => p.id !== speakerId && p.kind === 'suspect');
  for (const person of pool) {
    const known = dossierKnown(view, person.id, learned);
    const all = layerSentences(person, 2);
    const next = all[known.layer2.length];
    if (next !== undefined) return { personId: person.id, text: next };
  }
  return null;
}

/**
 * The self-account in the person's own mouth, cut to their temper (§3).
 *
 * An enigma gives two sentences and stops. A plain talker gives the account.
 * A yapper gives the account and then a fact about somebody else, because that
 * is what a yapper is for.
 */
export function selfAccountFor(
  person: Person,
  temper: 'enigma' | 'plain' | 'yap',
): string[] {
  const account = (person.dossier?.selfAccount ?? []).map((s) => firstPerson(person, s));
  if (temper === 'enigma') return account.slice(0, 2);
  return account;
}

/**
 * Dashiell asking somebody to account for themselves. The `dashiell-lines`
 * deck has no `ask-self` kind yet, so these stand in and the page logs the gap.
 */
export const SELF_QUESTIONS: string[] = [
  '"Tell me about yourself," I said. "Start anywhere."',
  '"Who am I talking to?" I said.',
  '"Before anything else," I said. "You. Who are you when nobody is asking?"',
  '"What do you do with your days?" I said.',
  '"Let us start with you," I said.',
  '"Tell me who you are," I said, "and I will tell you what I want."',
];

/*
 * There was a pool of leads here — "She gave it to me in the third person, as
 * though it had happened to somebody she knew" — because the generator wrote
 * the briefing with the client's own name in it and the page had to excuse the
 * register. The generator now writes the client's own words alongside the
 * record's, so the page has nothing to excuse and the line is gone.
 */

/** The second time. It costs nothing and it gets nothing. */
export const SELF_ALREADY: string[] = [
  '{name} had told me already, and told me so.',
  '"You have had that," {name} said, and was right.',
  '{name} gave me the same account in fewer words and looked at the door.',
  'I had it in the book already, in {name}\u2019s own words.',
];

/** The ticks a plain sentence may legally print, for the checker's context. */
export function beatTicks(view: CaseView, clue: Clue): Tick[] {
  const out: Tick[] = [];
  for (const f of clue.establishes) {
    if ('tick' in f) out.push(f.tick);
    if (f.kind === 'timeOfDeath') for (const t of f.ticks) out.push(t);
  }
  void view;
  return out;
}

/* ------------------------------------------------------------------ *
 * §6 and §7 — the first room, and what the precinct found in it.
 * ------------------------------------------------------------------ */

/**
 * The note that heads the first sight of the scene.
 *
 * It said "They found Martin Sweeney here and then they found a telephone" in
 * every case the engine had ever rendered, including the ones where nobody had
 * died. Three case types and one moved body need four sentences:
 *
 * - **A murder at the scene**: what it always said.
 * - **A body that was moved** (§6): what was found here, and the trope's own
 *   given — that this room does not agree with it. The room it happened in is
 *   somewhere else and is the fourth thing the report will ask.
 * - **A robbery** (§7): the shelf the thing came off. The owner is alive, and
 *   the note says where they are rather than what the coroner thought.
 * - **A disappearance** (§7): the last place anybody saw them.
 */
export function openingNote(view: CaseView, placeId: Id): string {
  const kase = view.kase;
  const act = kase.act;
  const place = view.placeById.get(placeId);
  const head = `${capitalize(place?.name ?? 'the address')}, ${kase.neighborhood}.`;
  const victim = view.victim;
  switch (act.type) {
    case 'robbery': {
      const taken = act.taken?.name ?? 'what was taken';
      const owner = victim.surname;
      const where = victimAddressName(view);
      // §7: the free report here is the shelf and the way in, not a coroner.
      const entry =
        act.givens.text.find((t) => /forced|lock|key|window|let in|combination/i.test(t)) ?? '';
      return `${head} ${capitalize(taken)} came off a shelf in this room, and ${owner} is alive and at ${where}, which is the first thing anybody says about it. ${entry}`.trim();
    }
    case 'missing':
      return `${head} This is where ${victim.surname} was last seen, and nobody in this neighbourhood has seen ${victim.surname} since.`;
    default: {
      if (act.bodyFoundAt && act.bodyFoundAt !== act.place && placeId === act.bodyFoundAt) {
        // The trope's own given, which is the thing the room will not support.
        const disagrees = act.givens.text.find((t) => t.includes(' not ')) ?? '';
        return `${head} They found ${victim.name} here and then they found a telephone. ${disagrees}`.trim();
      }
      return `${head} They found ${victim.name} here and then they found a telephone.`;
    }
  }
}

/** Where a robbery's owner can be found, for the note above. */
function victimAddressName(view: CaseView): string {
  const here = view.peopleAt;
  for (const [placeId, ids] of here) {
    if (ids.includes(view.victim.id)) return view.placeById.get(placeId)?.shortName ?? 'an address';
  }
  return 'an address of their own';
}

/** "9:00 PM", for a plain sentence that has to name an hour. */
export function at(tick: Tick): string {
  return clock(tick);
}
