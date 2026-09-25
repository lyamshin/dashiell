/**
 * M9 — the logic game's clues in a witness's mouth.
 *
 * Testimony, accounts, a watcher's door and a stranger's description are the
 * generator's facts; the generator's own sentence ("Rafferty saw Vitale at the
 * third floor from seven o'clock to half past seven…") is the notebook's
 * record and reads as one. On the page the witness says it, the way they know
 * the person (spec, "Who knows whom": a witness introduces people the way they
 * know them, `referenceOf`), with the hours said the way people say them.
 *
 * Every hour and every name here comes out of the clue's facts, so the
 * correspondence checker traces the page to the clue. Pure.
 */

import { referenceOf } from '../../gen/index.js';
import type { Clue, Fact, Id, Person, Tick } from '../../gen/types.js';
import { spokenClock } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { pronounOf } from '../voice/cast.js';
import { spokenSpan } from '../voice/facts.js';

type Him = { he: string; him: string; his: string; He: string };

function pronouns(person: Person | undefined): Him {
  const she = pronounOf(person) === 'she';
  return she ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' };
}

function genderWords(g: 'm' | 'f'): Him {
  return g === 'f' ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Runs of consecutive ticks. */
function runs(ticks: readonly Tick[]): [Tick, Tick][] {
  const out: [Tick, Tick][] = [];
  for (const t of [...ticks].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && t === last[1] + 1) last[1] = t;
    else out.push([t, t]);
  }
  return out;
}

/** "at ten o'clock", "from ten until half past", "at six and again at seven". */
export function whenSaid(ticks: readonly Tick[]): string {
  const parts = runs(ticks).map(([a, b]) => (a === b ? `at ${spokenClock(a)}` : spokenSpan(a, b)));
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and again ${parts[parts.length - 1]}`;
}

/** How somebody from the block says a place: "here" when it is where they stand. */
function placeWord(view: CaseView, placeId: Id, speaker: Person, spoken: (p: { name: string; shortName: string }) => string): string {
  if (speaker.foundAt === placeId) return 'here';
  const place = view.placeById.get(placeId);
  return place ? `at ${spoken(place)}` : 'somewhere';
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The answer, as a quoted line, or null when this clue is not one of the
 * logic game's own kinds (the old kinds keep the exchange deck's voice).
 */
export function m9Answer(
  view: CaseView,
  clue: Clue,
  speaker: Person,
  spoken: (p: { name: string; shortName: string }) => string,
): string | null {
  if (!view.kase.logic || clue.source.type !== 'person') return null;
  const facts = clue.establishes;
  switch (clue.kind) {
    case 'testimony':
      return testimony(view, clue, speaker, facts, spoken);
    case 'account':
      return account(view, speaker, facts, spoken);
    case 'watch':
      return watch(view, speaker, facts, spoken);
    case 'observation':
      return facts.every((f) => f.kind === 'describedAt') && facts.length > 0
        ? described(view, speaker, facts, spoken)
        : null;
    case 'anchor': {
      // The conditional: what anybody there knew, and somebody who did not.
      const premise = facts.find((f) => f.kind === 'anchorKnowledge');
      if (premise && premise.kind === 'anchorKnowledge') {
        return `“Anybody who was ${placeWord(view, premise.place, speaker, spoken)} ${whenSaid(premise.ticks)} would know that ${premise.knowledge}.”`;
      }
      const test = facts.find((f) => f.kind === 'knows');
      if (test && test.kind === 'knows') {
        const anchor = view.anchorById.get(test.anchorId)?.name ?? 'that';
        return test.knows ? `“I know what happened with ${anchor}.”` : `“${cap(anchor)}? I couldn’t tell you what happened.”`;
      }
      return null;
    }
    default:
      return null;
  }
}

function testimony(
  view: CaseView,
  clue: Clue,
  speaker: Person,
  facts: Fact[],
  spoken: (p: { name: string; shortName: string }) => string,
): string {
  const aboutId = clue.about ?? null;
  const about = aboutId ? view.personById.get(aboutId) : undefined;
  const p = pronouns(about);
  const acquainted = facts.find((f) => f.kind === 'acquainted');
  if (acquainted && acquainted.kind === 'acquainted') {
    if (acquainted.heard) {
      return acquainted.strength === 'sight'
        ? `“I know the name. I might know the face too, but I couldn’t tell you which face goes with it.”`
        : `“I know the name. I couldn’t put a face to it.”`;
    }
    return acquainted.strength === 'stranger'
      ? `“Never heard of ${p.him}. I don’t know anybody called ${about?.surname ?? 'that'}.”`
      : `“I might know the face if I saw it. Not the name.”`;
  }
  const sentences: string[] = [];
  // Who they are to the witness, once, when it is a relation and not a name.
  if (about && aboutId && about.id !== view.victim.id) {
    const ref = referenceOf(view.kase, speaker.id, aboutId);
    if (/^(my|the|a|an|one of) /i.test(ref)) sentences.push(`${p.He}’s ${ref}.`);
  }
  // What they saw, a place at a time.
  const seen = new Map<Id, Tick[]>();
  const anchored: { place: Id; anchorId: Id }[] = [];
  const notAt = new Map<Id, Tick[]>();
  let apart = false;
  for (const f of facts) {
    if (f.kind === 'personAt' && f.personId === aboutId) seen.set(f.place, [...(seen.get(f.place) ?? []), f.tick]);
    if (f.kind === 'personAtAnchor' && f.personId === aboutId) anchored.push({ place: f.place, anchorId: f.anchorId });
    if (f.kind === 'personNotAt' && f.personId === aboutId) notAt.set(f.place, [...(notAt.get(f.place) ?? []), f.tick]);
    if (f.kind === 'apart') apart = true;
  }
  const saw: string[] = [];
  for (const [place, ticks] of seen) saw.push(`${placeWord(view, place, speaker, spoken)} ${whenSaid(ticks)}`);
  for (const a of anchored) {
    const anchor = view.anchorById.get(a.anchorId);
    saw.push(`${placeWord(view, a.place, speaker, spoken)} ${anchor?.timing ?? 'that evening'}`);
  }
  if (saw.length > 0) sentences.push(`I saw ${p.him} ${list(saw)}.`);
  for (const [place, ticks] of notAt) {
    const word = placeWord(view, place, speaker, spoken);
    const allOthers = seen.size > 0 || anchored.length > 0;
    sentences.push(
      ticks.length >= 6
        ? `${allOthers ? 'The rest of the evening' : 'All evening'} ${p.he} wasn’t ${word === 'here' ? 'here' : word}.`
        : `${p.He} wasn’t ${word === 'here' ? 'here' : word} ${whenSaid(ticks)}.`,
    );
  }
  if (apart) sentences.push(`${p.He} and I were never in the same place all evening.`);
  if (sentences.length === 0 || (saw.length === 0 && notAt.size === 0 && !apart)) {
    if (/will not say/.test(clue.text)) return '“I’d rather not say where I saw anybody tonight.”';
    sentences.push(`I didn’t see ${p.him} that evening.`);
  }
  return `“${sentences.join(' ')}”`;
}

function account(
  view: CaseView,
  speaker: Person,
  facts: Fact[],
  spoken: (p: { name: string; shortName: string }) => string,
): string {
  const claims = facts.filter((f): f is Extract<Fact, { kind: 'claims' }> => f.kind === 'claims');
  if (claims.length === 0) return '“I was where I was, and I couldn’t tell you the hours of it.”';
  const sorted = [...claims].sort((a, b) => (a.ticks[0] ?? 0) - (b.ticks[0] ?? 0));
  const parts = sorted.map((c) => {
    const place = view.placeById.get(c.place);
    const where = place ? spoken(place) : 'somewhere';
    const company = c.with ? ` with ${referenceOf(view.kase, speaker.id, c.with)}` : '';
    return `${where}${company} ${whenSaid(c.ticks)}`;
  });
  const [first, ...rest] = parts;
  const tail = rest.length > 0 ? `, then ${rest.join(', then ')}` : '';
  return `“I was at ${first}${tail}.”`;
}

function watch(
  view: CaseView,
  speaker: Person,
  facts: Fact[],
  spoken: (p: { name: string; shortName: string }) => string,
): string {
  const sentences: string[] = [];
  for (const f of facts) {
    if (f.kind === 'absentFrom') {
      const others = f.except.filter((id) => id !== speaker.id && id !== f.except[0]);
      const names = others.map((id) => referenceOf(view.kase, speaker.id, id));
      const word = placeWord(view, f.place, speaker, spoken);
      const into = word === 'here' ? 'in here' : `into ${word.replace(/^at /, '')}`;
      sentences.push(
        names.length > 0
          ? `Nobody but ${list(names)} came ${into} ${whenSaid(f.ticks)}.`
          : `Nobody came ${into} ${whenSaid(f.ticks)}.`,
      );
    } else if (f.kind === 'countAt') {
      const word = placeWord(view, f.place, speaker, spoken);
      const into = word === 'here' ? 'in here' : `into ${word.replace(/^at /, '')}`;
      const n = f.count === 1 ? 'One person' : `${cap(COUNT[f.count] ?? String(f.count))} people`;
      sentences.push(`${n} came ${into} at ${spokenClock(f.tick)}, and nobody else.`);
    }
  }
  if (sentences.length === 0) return '“Nobody I could tell you about.”';
  return `“${sentences.join(' ')}”`;
}

const COUNT: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

function described(
  view: CaseView,
  speaker: Person,
  facts: Fact[],
  spoken: (p: { name: string; shortName: string }) => string,
): string {
  const byPlace = new Map<Id, { text: string; g: 'm' | 'f'; ticks: Tick[] }>();
  for (const f of facts) {
    if (f.kind !== 'describedAt') continue;
    const key = `${f.place}|${f.description.text}`;
    const had = byPlace.get(key) ?? { text: f.description.text, g: f.description.features.gender, ticks: [] };
    had.ticks.push(f.tick);
    byPlace.set(key, had);
  }
  const sentences: string[] = [];
  for (const [key, d] of byPlace) {
    const place = key.split('|')[0] as Id;
    const word = placeWord(view, place, speaker, spoken);
    const p = genderWords(d.g);
    sentences.push(`There was ${d.text} ${word} ${whenSaid(d.ticks)}. I didn’t know ${p.his} name.`);
  }
  return `“${sentences.join(' ')}”`;
}
