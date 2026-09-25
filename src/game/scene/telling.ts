/**
 * M10 §A.1 — the telling: a family of facts, said once, in the witness's
 * words.
 *
 * This file writes the fact-bearing sentences of a telling, and nothing else:
 * the hours spoken and ordered, places the witness's way ("here" for the room
 * they stand in), and people the way this witness knows them (`referenceOf`).
 * Every hour and every name in them comes out of the family's facts, so the
 * correspondence checker can trace a telling to the clues it tells. The
 * question, the grounding, the follow-up, the tail and the note are dealt
 * around these sentences by the realizer (`realize.ts`), from decks that say
 * no case fact at all.
 *
 * A family's sentences come in two halves where the fact has a natural second
 * half (golden rule 4): a person's comings and goings, then — asked "And the
 * rest of the evening?" — where they were not.
 *
 * Pure. Never quotes a generator sentence: nothing here reads `Clue.text`
 * except the few old clue kinds that have no structured facts, and those it
 * breaks into the short sentences a person says.
 */

import { referenceOf } from '../../gen/index.js';
import type { Clue, Fact, Id, Person, Tick } from '../../gen/types.js';
import { TICKS, spokenClock } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { pronounOf } from '../voice/cast.js';
import { spokenSpan, spokenSpans } from '../voice/facts.js';
import type { Family } from './families.js';
import { ANOTHER_TIME } from '../voice-data.js';

/** Which follow-up question asks for a family's second half. */
export type FollowAsk =
  /** "And the rest of the evening?" — the second half is every other half hour. */
  | 'rest'
  /** "Any other time?" — the second half is some of the other half hours. */
  | 'other'
  /** "You're sure it was her?" — the second half is how the witness knows. */
  | 'sure';

export interface Told {
  /** What the witness says first. */
  first: string[];
  /** What they say when the follow-up asks for it. */
  second: string[];
  follow?: FollowAsk;
  /** The half hours the sentences name, for the correspondence checker. */
  ticks: Tick[];
  /** The people the sentences name or stand for. */
  people: Id[];
  /** How many people a stranger sighting was: for the grounding's number. */
  strangers?: number;
}

type Pro = { he: string; him: string; his: string; He: string };

export function pronounsOf(person: Person | undefined): Pro {
  return pronounOf(person) === 'she'
    ? { he: 'she', him: 'her', his: 'her', He: 'She' }
    : { he: 'he', him: 'him', his: 'his', He: 'He' };
}

function genderPro(g: 'm' | 'f'): Pro {
  return g === 'f' ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' };
}

function cap(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function list(items: string[], and = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1] as string}`;
}

/** Runs of consecutive ticks. */
export function runsOf(ticks: readonly Tick[]): [Tick, Tick][] {
  const out: [Tick, Tick][] = [];
  for (const t of [...new Set(ticks)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && t === last[1] + 1) last[1] = t;
    else out.push([t, t]);
  }
  return out;
}

/** "at seven o'clock", "from seven until half past". */
export function whenOf([a, b]: [Tick, Tick]): string {
  return a === b ? `at ${spokenClock(a)}` : spokenSpan(a, b);
}

/** Several runs: "at six o'clock, or from eight until half past". */
function whenRuns(ticks: readonly Tick[], joiner: 'and' | 'or'): string {
  return list(runsOf(ticks).map(whenOf), joiner);
}

/** Where, as the witness standing at `at` says it. */
function whereOf(view: CaseView, placeId: Id, at: Id): string {
  if (placeId === at) return 'here';
  const place = view.placeById.get(placeId);
  return place ? `at ${place.shortName}` : 'somewhere';
}

function placeName(view: CaseView, placeId: Id, at: Id): string {
  if (placeId === at) return 'here';
  return view.placeById.get(placeId)?.shortName ?? 'somewhere';
}

const COUNT: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

/* ------------------------------------------------------------------ *
 * The families.
 * ------------------------------------------------------------------ */

/** One person's comings and goings (golden page 6). */
function movements(view: CaseView, clues: Clue[], speaker: Person, subjectId: Id, at: Id, introduce = false): Told {
  const subject = view.personById.get(subjectId);
  const p = pronounsOf(subject);
  // docs/26: the first sentence names them when the question did not.
  const ref = introduce ? referenceOf(view.kase, speaker.id, subjectId) : null;
  const him = ref ?? p.him;
  const He = ref ? cap(ref) : p.He;
  const facts: Fact[] = clues.flatMap((c) => c.establishes);
  const ticks: Tick[] = [];
  const people = new Set<Id>([subjectId]);
  const first: string[] = [];
  const second: string[] = [];
  let follow: FollowAsk | undefined;

  // Knowing and not knowing.
  const acquainted = facts.find((f) => f.kind === 'acquainted');
  if (acquainted && acquainted.kind === 'acquainted') {
    if (acquainted.strength === 'stranger') first.push(`Never heard of ${him}.`);
    else if (acquainted.strength === 'sight') first.push('I might know the face if I saw it. Not the name.');
  }

  // Where they were seen, in the order of the evening.
  const seen = facts.filter((f): f is Extract<Fact, { kind: 'personAt' }> => f.kind === 'personAt' && f.personId === subjectId);
  const byPlace = new Map<Id, Tick[]>();
  for (const f of seen) byPlace.set(f.place, [...(byPlace.get(f.place) ?? []), f.tick]);
  const stretches: { place: Id; run: [Tick, Tick] }[] = [];
  for (const [place, ts] of byPlace) for (const run of runsOf(ts)) stretches.push({ place, run });
  stretches.sort((a, b) => a.run[0] - b.run[0]);
  let last: Id | null = null;
  for (const [i, s] of stretches.entries()) {
    ticks.push(s.run[0], s.run[1]);
    const when = whenOf(s.run);
    const where = whereOf(view, s.place, at);
    if (i === 0) first.push(`I saw ${him} ${where} ${when}.`);
    // "Back" is back here; anywhere else it is "there again"; a third time is "and again".
    else if (s.place === last) {
      const again = i >= 2 && stretches[i - 2]?.place === s.place;
      first.push(again ? `And again ${when}.` : s.place === at ? `${p.He} was back ${when}.` : `${p.He} was there again ${when}.`);
    }
    else first.push(`${cap(when)} ${p.he} was ${where}.`);
    last = s.place;
  }
  // A sighting tied to something the block times things by: one sentence a
  // place, however many times it came round.
  const anchored = new Map<Id, Id[]>();
  for (const f of facts) {
    if (f.kind !== 'personAtAnchor' || f.personId !== subjectId) continue;
    const places = anchored.get(f.anchorId) ?? [];
    if (!places.includes(f.place)) places.push(f.place);
    anchored.set(f.anchorId, places);
  }
  for (const [anchorId, places] of anchored) {
    const timing = view.anchorById.get(anchorId)?.timing ?? 'that evening';
    // docs/25: two sightings tied to the same thing are two clauses, each with
    // its place — never "at the Automat once and here once".
    const [where, ...others] = places.map((pl) => whereOf(view, pl, at)) as [string, ...string[]];
    first.push(
      stretches.length === 0 && first.length === 0
        ? `I saw ${him} ${where} ${timing}.`
        : `${cap(timing)}, ${p.he} was ${where}.`,
    );
    for (const other of others) first.push(ANOTHER_TIME.split('{he}').join(p.he).split('{where}').join(other));
  }

  // Where they were not.
  const notAt = new Map<Id, Tick[]>();
  for (const f of facts) {
    if (f.kind === 'personNotAt' && f.personId === subjectId) notAt.set(f.place, [...(notAt.get(f.place) ?? []), f.tick]);
  }
  for (const [place, ts] of notAt) {
    ticks.push(...ts);
    const here = byPlace.get(place) ?? [];
    const whole = new Set([...ts, ...here]).size === TICKS;
    const name = placeName(view, place, at);
    if (first.length === 0) {
      // Nothing seen: the absence is the whole answer.
      first.push(
        whole
          ? `${He} wasn’t ${name === 'here' ? 'here' : `at ${name}`}. Not once all evening.`
          : `${He} wasn’t ${name === 'here' ? 'here' : `at ${name}`} ${whenRuns(ts, 'or')}.`,
      );
      continue;
    }
    if (whole && here.length > 0) {
      second.push(name === 'here' ? 'Not here.' : `Not at ${name}.`);
      follow = follow ?? 'rest';
    } else {
      second.push(`${name === 'here' ? 'Not here' : `Not at ${name}`} ${whenRuns(ts, 'or')}.`);
      follow = follow ?? 'other';
    }
  }

  // Two people, and whether they were ever in one room.
  for (const f of facts) {
    if (f.kind === 'apart' && f.personIds.includes(subjectId)) {
      const other = f.personIds.find((id) => id !== subjectId) as Id;
      people.add(other);
      if (other === speaker.id) first.push(`${p.He} and I were never in the same place all evening.`);
      else first.push(`${p.He} and ${referenceOf(view.kase, speaker.id, other)} were never in the same place all evening.`);
    }
    if (f.kind === 'together' && f.personIds.includes(subjectId)) {
      const other = f.personIds.find((id) => id !== subjectId) as Id;
      people.add(other);
      ticks.push(...f.ticks);
      const when = f.ticks.length > 0 ? ` ${whenRuns(f.ticks, 'and')}` : '';
      first.push(
        other === speaker.id
          ? `${p.He} was with me${when}.`
          : `${p.He} was with ${referenceOf(view.kase, speaker.id, other)}${when}.`,
      );
    }
  }

  if (first.length === 0 && second.length === 0) {
    const refused = clues.some((c) => /will not say/.test(c.text));
    first.push(refused ? 'I’d rather not say where I saw anybody tonight.' : `I didn’t see ${him} that evening.`);
  }
  return {
    first,
    second: follow ? second : [],
    ...(follow ? { follow } : {}),
    ticks,
    people: [...people],
  };
}

/** A door's head counts and its "nobody but" (golden page 7). */
function counts(view: CaseView, clues: Clue[], speaker: Person, at: Id): Told {
  const facts = clues.flatMap((c) => c.establishes);
  const people = new Set<Id>();
  const ticks: Tick[] = [];
  type Line = { tick: Tick; text: (first: boolean) => string };
  const lines: Line[] = [];
  const covered = new Set<Tick>();
  for (const f of facts) {
    if (f.kind !== 'absentFrom') continue;
    const others = f.except.filter((id) => id !== speaker.id && id !== f.except[0]);
    for (const id of others) people.add(id);
    ticks.push(...f.ticks);
    const where = placeName(view, f.place, at);
    for (const run of runsOf(f.ticks)) {
      if (others.length > 0) {
        const names = others.map((id) => referenceOf(view.kase, speaker.id, id));
        const p = others.length === 1 ? pronounsOf(view.personById.get(others[0] as Id)) : null;
        const with_ = p ? `nobody with ${p.him}` : 'nobody else';
        const whenSaid = run[0] === run[1] ? `At ${spokenClock(run[0])}` : cap(spokenSpan(run[0], run[1]));
        lines.push({
          tick: run[0],
          text: () =>
            `${whenSaid} it was ${list(names)}${where === 'here' ? '' : ` at ${where}`}, and ${with_}.`,
        });
        for (let t = run[0]; t <= run[1]; t++) covered.add(t as Tick);
        // A head count at the same half hour says the same thing again.
        for (const g of facts) {
          if (g.kind === 'countAt' && g.count === others.length && g.tick >= run[0] && g.tick <= run[1]) covered.add(g.tick);
        }
      } else {
        const into = where === 'here' ? 'in' : `into ${where}`;
        lines.push({ tick: run[0], text: () => `Nobody came ${into} ${whenOf(run)}.` });
      }
    }
  }
  for (const f of facts) {
    if (f.kind !== 'countAt') continue;
    ticks.push(f.tick);
    if (covered.has(f.tick)) continue;
    const where = placeName(view, f.place, at);
    const n = COUNT[f.count] ?? String(f.count);
    const into = where === 'here' ? 'in' : `into ${where}`;
    lines.push({
      tick: f.tick,
      text: (first) => (first ? `${cap(n)} came ${into} at ${spokenClock(f.tick)}.` : `${cap(n)} at ${spokenClock(f.tick)}.`),
    });
  }
  lines.sort((a, b) => a.tick - b.tick);
  const first = lines.map((l, i) => l.text(i === 0));
  if (first.length === 0) first.push('Nobody I could tell you about.');
  return { first, second: [], ticks, people: [...people] };
}

/** People the witness saw and did not know by name. */
function strangers(view: CaseView, clues: Clue[], at: Id): Told {
  type Seen = { text: string; g: 'm' | 'f'; sight: boolean; place: Id; ticks: Tick[] };
  const groups: Seen[] = [];
  const ticks: Tick[] = [];
  for (const clue of clues) {
    const sight = / (?:I know|knew) by sight\b/.test(clue.text);
    for (const f of clue.establishes) {
      if (f.kind !== 'describedAt') continue;
      ticks.push(f.tick);
      const had = groups.find((g) => g.text === f.description.text && g.sight === sight && g.place === f.place && g.ticks.includes((f.tick - 1) as Tick));
      if (had) had.ticks.push(f.tick);
      else groups.push({ text: f.description.text, g: f.description.features.gender, sight, place: f.place, ticks: [f.tick] });
    }
  }
  groups.sort((a, b) => Math.min(...a.ticks) - Math.min(...b.ticks));
  // One sentence a description, in the order they were first seen: "A man in
  // his thirties at half past seven, and one from half past eight until half
  // past nine." — "one", because nothing says whether it was the same man.
  const first: string[] = [];
  const order: string[] = [];
  for (const g of groups) if (!order.includes(`${g.text}|${g.place}`)) order.push(`${g.text}|${g.place}`);
  for (const [i, key] of order.entries()) {
    const same = groups.filter((g) => `${g.text}|${g.place}` === key);
    const head = same[0] as Seen;
    const where = head.place === at ? '' : ` at ${view.placeById.get(head.place)?.shortName ?? 'somewhere'}`;
    const whens = same.map((g) => whenRuns(g.ticks, 'and'));
    const said = [`${whens[0]}`, ...whens.slice(1).map((w) => `one ${w}`)];
    const text = i === 0 ? cap(head.text) : `Then ${head.text}`;
    first.push(`${text}${where} ${list(said)}.`);
  }
  const sights = groups.filter((g) => g.sight).length;
  const only = groups.length === 1 ? genderPro((groups[0] as Seen).g) : null;
  if (sights === 0) {
    first.push(
      only
        ? `I didn’t know ${only.him}.`
        : groups.length === 2
          ? 'I didn’t know either of them.'
          : 'I didn’t know any of them.',
    );
  } else if (sights === groups.length) {
    first.push(only ? `I’d seen ${only.him} around. I couldn’t give you a name.` : 'I knew the faces. Not one of the names.');
  } else {
    first.push('One or two I knew by sight. None of them by name.');
  }
  return { first, second: [], ticks, people: [], strangers: groups.length };
}

/** When something the whole block times things by happened. */
function timing(clues: Clue[]): Told {
  const ticks: Tick[] = [];
  for (const c of clues) for (const f of c.establishes) if (f.kind === 'anchorAt') ticks.push(...f.ticks);
  const times = [...new Set(ticks)].sort((a, b) => a - b).map(spokenClock);
  return {
    first: times.length === 0 ? ['I couldn’t tell you when.'] : [`That was at ${list(times)}.`],
    second: [],
    ticks,
    people: [],
  };
}

/** What anybody there would know, and whether somebody does. */
function event(view: CaseView, clues: Clue[], at: Id): Told {
  const first: string[] = [];
  const ticks: Tick[] = [];
  const people: Id[] = [];
  for (const f of clues.flatMap((c) => c.establishes)) {
    if (f.kind === 'anchorKnowledge') {
      ticks.push(...f.ticks);
      first.push(`Anybody who was ${whereOf(view, f.place, at)} ${whenRuns(f.ticks, 'and')} would know ${f.knowledge}.`);
    }
    if (f.kind === 'knows') {
      people.push(f.personId);
      const anchor = view.anchorById.get(f.anchorId)?.name ?? 'that';
      first.push(f.knows ? `I know what happened with ${anchor}.` : `${cap(anchor)}? I couldn’t tell you what happened.`);
    }
  }
  if (first.length === 0) first.push('I couldn’t tell you.');
  return { first, second: [], ticks, people };
}

/** The witness's own evening, start to finish, as a short story. */
function evening(view: CaseView, clues: Clue[], speaker: Person, at: Id): Told {
  const claims = clues
    .flatMap((c) => c.establishes)
    .filter((f): f is Extract<Fact, { kind: 'claims' }> => f.kind === 'claims')
    .sort((a, b) => (a.ticks[0] ?? 0) - (b.ticks[0] ?? 0));
  const ticks: Tick[] = [];
  const people: Id[] = [speaker.id];
  const first: string[] = [];
  // One place said once while the evening stays there, however many spans the
  // account keeps apart for the notebook: "I was at the stairwell from eight
  // until half past, from nine until half past, and from ten until half past."
  const groups: { place: Id; with?: Id; ticks: Tick[] }[] = [];
  for (const c of claims) {
    const prev = groups[groups.length - 1];
    if (prev && prev.place === c.place && prev.with === c.with) prev.ticks.push(...c.ticks);
    else groups.push({ place: c.place, ...(c.with ? { with: c.with } : {}), ticks: [...c.ticks] });
  }
  for (const [i, c] of groups.entries()) {
    ticks.push(...c.ticks);
    const when = whenRuns(c.ticks, 'and');
    const company = c.with ? ` with ${referenceOf(view.kase, speaker.id, c.with)}` : '';
    if (c.with) people.push(c.with);
    const name = placeName(view, c.place, at);
    if (i === 0) first.push(`I was ${name === 'here' ? 'here' : `at ${name}`}${company} ${when}.`);
    else if (name === 'here') first.push(`${cap(when)} I was here${company}.`);
    else first.push(`Then ${name}${company}, ${when}.`);
  }
  if (first.length === 0) first.push('I was where I was, and I couldn’t tell you the hours of it.');
  return { first, second: [], ticks, people };
}

/** Speech contracts where a record does not. */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bhas not\b/g, 'hasn’t'],
  [/\bhave not\b/g, 'haven’t'],
  [/\bhad not\b/g, 'hadn’t'],
  [/\bwas not\b/g, 'wasn’t'],
  [/\bwere not\b/g, 'weren’t'],
  [/\bis not\b/g, 'isn’t'],
  [/\bdid not\b/g, 'didn’t'],
  [/\bdoes not\b/g, 'doesn’t'],
  [/\bdo not\b/g, 'don’t'],
  [/\bwould not\b/g, 'wouldn’t'],
  [/\bcould not\b/g, 'couldn’t'],
  [/\bcannot\b/g, 'can’t'],
  [/\bwill not\b/g, 'won’t'],
  [/\bit is\b/g, 'it’s'],
  [/\bthat is\b/g, 'that’s'],
  [/\bthere is\b/g, 'there’s'],
  [/\b([A-Z][a-z]+|he|she|it) has (been|had|got|gone|known|seen|done|taken|given|sworn|told|kept|lost|left|never|always)\b/g, '$1’s $2'],
  [/\b(I|you|we|they) have (been|had|got|gone|known|seen|done|taken|given|sworn|told|kept|lost|left|never|always)\b/g, '$1’ve $2'],
  [/\b(I|you|we|they|he|she) would\b/g, '$1’d'],
  [/\b(he|she|it) is\b/g, '$1’s'],
];

/**
 * One of the old clue kinds with no structured telling, said the way the
 * witness says it rather than the way the record has it: the attribution
 * goes ("Rafferty says", "Prentiss on Renfro:"); the witness is "I" and "me";
 * what somebody told somebody else is what the witness heard ("I heard
 * Bidwell tell Winslow…"); the words contract the way speech does; and each
 * clause of the record's long sentence becomes a sentence of its own, with
 * the hours spoken.
 */
export function saidPlainly(text: string, speaker?: Person, view?: CaseView): string[] {
  let said = spokenSpans(text.trim()).replace(/\.$/, '');
  if (speaker) {
    const me = speaker.surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    said = said
      .replace(new RegExp(`^${me}\\s+(?:says|said)\\s+(?:that\\s+)?`, 'i'), '')
      .replace(new RegExp(`^${me}\\s+on\\s+[^:]{1,60}:\\s+`, 'i'), '')
      .replace(new RegExp(`^${me}\\b`), 'I')
      .replace(new RegExp(`\\b${me}[’']s\\b`, 'g'), 'my')
      .replace(new RegExp(`\\b${me}\\b`, 'g'), 'me');
  }
  // What somebody said to somebody else, as the witness heard it.
  said = said
    .replace(/^([A-Z][a-z]+) told me (?:that )?/, '$1 told me ')
    .replace(/^([A-Z][a-z]+) told ([A-Z][a-z]+) (?:that )?/, 'I heard $1 tell $2 ')
    .replace(/^([A-Z][a-z]+) said to ([A-Z][a-z]+) that /, 'I heard $1 say to $2 that ')
    .replace(/^([A-Z][a-z]+) said (?!to\b)/, 'I heard $1 say ');
  // "never Marchetti’s to sell": the second time a name is a possessive, it is theirs.
  for (const p of view?.kase.people ?? []) {
    const name = p.surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const first = said.search(new RegExp(`\\b${name}\\b`));
    if (first < 0) continue;
    const head = said.slice(0, first + p.surname.length);
    const rest = said
      .slice(first + p.surname.length)
      .replace(new RegExp(`\\b${name}[’']s to\\b`, 'g'), `${pronounOf(p) === 'she' ? 'hers' : 'his'} to`);
    said = head + rest;
  }
  for (const [re, to] of CONTRACTIONS) said = said.replace(re, to);
  const clauses = said
    .replace(/ and heard /, '. I heard ')
    .replace(/, (just as|just after|just before|as|while|when) (?=[a-z])/, '. That was $1 ')
    .split(/,\s+and\s+(?=(?:it|he|she|they|there|nobody|somebody|the|a|an|I|[A-Z][a-z]+)\b)|;\s+|,\s+(?=(?:it|he|she|they|there)\s)|(?<!\b(?:Mrs|Mr|Dr|St|Mt))\.\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return clauses.map((c) => `${cap(c)}.`);
}

/**
 * The fact-bearing sentences of one family, or null for a family the old
 * utterance deck still speaks (a clue kind with no telling of its own here).
 */
export function toldOf(
  view: CaseView,
  family: Family,
  clues: Clue[],
  speaker: Person,
  at: Id,
  /**
   * docs/26: nobody has named the one this family is about yet — the question
   * was about a place or a thing — so the witness says who, not "her".
   */
  introduce = false,
): Told | null {
  if (!view.kase.logic) return null;
  switch (family.kind) {
    case 'movements':
    case 'knowing':
      return family.subjectId ? movements(view, clues, speaker, family.subjectId, at, introduce) : null;
    case 'counts':
      return counts(view, clues, speaker, at);
    case 'strangers':
      return strangers(view, clues, at);
    case 'timing':
      return timing(clues);
    case 'event':
      return event(view, clues, at);
    case 'evening':
      return evening(view, clues, speaker, at);
    default:
      return null;
  }
}

/**
 * M9 §3 with M10 §A.1: the fact put to somebody, said by the detective in his
 * own words from its facts — never the record read out in quotation marks.
 * `you` for the one it is put to; the source named, because a fact put is
 * somebody's word.
 */
export function putSaid(view: CaseView, clue: Clue, person: Person, factIdx?: ReadonlySet<number>): string {
  // "It happened between eight and half past eight" once, however many facts say so.
  const facts = clue.establishes.filter((_, i) => factIdx === undefined || factIdx.size === 0 || factIdx.has(i));
  const source = clue.source.type === 'person' ? view.personById.get(clue.source.personId) : undefined;
  const from = clue.source.type === 'place' ? view.placeById.get(clue.source.placeId) : undefined;
  const who = (id: Id): string => (id === person.id ? 'you' : (view.personById.get(id)?.surname ?? 'somebody'));
  const at = (place: Id): string => `at ${view.placeById.get(place)?.shortName ?? 'somewhere'}`;
  const out: string[] = [];
  const seen = new Map<string, Tick[]>();
  const not = new Map<string, Tick[]>();
  for (const f of facts) {
    if (f.kind === 'personAt') seen.set(`${f.personId}|${f.place}`, [...(seen.get(`${f.personId}|${f.place}`) ?? []), f.tick]);
    if (f.kind === 'personNotAt') not.set(`${f.personId}|${f.place}`, [...(not.get(`${f.personId}|${f.place}`) ?? []), f.tick]);
  }
  const by = source ? `${source.surname} puts` : from ? `What turned up ${at(from.id)} puts` : 'I have';
  for (const [key, ticks] of seen) {
    const [id, place] = key.split('|') as [Id, Id];
    out.push(`${by} ${who(id)} ${at(place)} ${whenRuns(ticks, 'and')}.`);
  }
  for (const [key, ticks] of not) {
    const [id, place] = key.split('|') as [Id, Id];
    const says = source ? `${source.surname} says` : 'I have it that';
    const was = id === person.id ? 'you weren’t' : `${who(id)} wasn’t`;
    out.push(`${says} ${was} ${at(place)} ${whenRuns(ticks, 'or')}.`);
  }
  for (const f of facts) {
    const says = source ? `${source.surname} says` : 'I have it that';
    switch (f.kind) {
      case 'personAtAnchor':
        out.push(`${by} ${who(f.personId)} ${at(f.place)} ${view.anchorById.get(f.anchorId)?.timing ?? 'that evening'}.`);
        break;
      case 'describedAt':
        out.push(`${source?.surname ?? 'Somebody'} saw ${f.description.text} ${at(f.place)} at ${spokenClock(f.tick)}.`);
        break;
      case 'countAt':
        out.push(`${source?.surname ?? 'Somebody'} counted ${COUNT[f.count] ?? String(f.count)} ${at(f.place)} at ${spokenClock(f.tick)}.`);
        break;
      case 'absentFrom': {
        const others = f.except.slice(1).map(who);
        out.push(
          others.length > 0
            ? `${says} nobody but ${list(others)} went in ${at(f.place)} ${whenRuns(f.ticks, 'and')}.`
            : `${says} nobody went in ${at(f.place)} ${whenRuns(f.ticks, 'and')}.`,
        );
        break;
      }
      case 'claims':
        out.push(
          `${f.personId === person.id ? 'You told me you were' : `${who(f.personId)} says ${pronounsOf(view.personById.get(f.personId)).he} was`} ${at(f.place)} ${whenRuns(f.ticks, 'and')}.`,
        );
        break;
      case 'anchorAt':
        out.push(`${cap(view.anchorById.get(f.anchorId)?.name ?? 'It')}: that was at ${list([...f.ticks].sort((a, b) => a - b).map(spokenClock))}.`);
        break;
      case 'timeOfDeath': {
        const a = f.ticks[0];
        const b = f.ticks[f.ticks.length - 1];
        if (a !== undefined && b !== undefined) {
          out.push(
            a === b
              ? `It happened at ${spokenClock(a)}, as near as anybody can say.`
              : `It happened between ${spokenClock(a).replace(/ o[’']clock$/, '')} and ${spokenClock(b)}, as near as anybody can say.`,
          );
        }
        break;
      }
      case 'hasMotive':
        if (f.personId !== view.victim.id) out.push(`${f.personId === person.id ? 'You' : who(f.personId)} had a reason.`);
        break;
      case 'hadAccess':
        out.push(`${f.personId === person.id ? 'You' : who(f.personId)} could have got at it.`);
        break;
      case 'objectMissing': {
        const thing = view.objectById.get(f.objectId)?.name ?? 'It';
        out.push(`${cap(thing)} went missing ${at(f.fromPlace)}.`);
        break;
      }
      case 'noiseAt':
        out.push(`${source?.surname ?? 'Somebody'} heard something ${at(f.place)} at ${spokenClock(f.tick)}.`);
        break;
      case 'together':
        out.push(`${says} ${who(f.personIds[0])} and ${who(f.personIds[1])} were together ${whenRuns(f.ticks, 'and')}.`);
        break;
      case 'apart':
        out.push(`${says} ${who(f.personIds[0])} and ${who(f.personIds[1])} were never in the same place.`);
        break;
      case 'victimAliveAt':
        if (!out.some((l) => /alive/.test(l))) out.push(`${view.victim.surname} was alive at ${spokenClock(f.tick)}.`);
        break;
      case 'victimDeadBy':
        out.push(`It was over by ${spokenClock(f.tick)}.`);
        break;
      default:
        break;
    }
  }
  // Nothing the facts can say in words: the detective puts it without reading it.
  if (out.length === 0) return '';
  return out.join(' ');
}
