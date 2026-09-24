/**
 * M11 — people, as the page meets them.
 *
 * What the detective knows of somebody's tie to the case when they are in
 * front of him, and the two sentences that say it: the tie on first sight,
 * and the arrival page's closing observation (golden §2: "The dentist who
 * found the body was reading a newspaper at one in the morning without
 * turning the page."). Both are drawn from the case and from the notebook,
 * never invented: who found the body is the briefing's, whom the client
 * named is the briefing's, and a relation to the victim is the dossier's once
 * the notebook has it.
 */

import { isTheft, type Id, type Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { layerCredit } from '../voice/plain.js';
import { pronounOf } from '../voice/cast.js';
import { relationPlain } from './lines.js';

/** Why somebody in the room matters to the case, as far as the notebook knows. */
export type TieKind = 'finder' | 'pointer' | 'relation' | 'client';

export interface KnownTie {
  kind: TieKind;
  /** Anybody else the tie names (the client, for a pointer). */
  otherId?: Id;
}

/**
 * The tie the detective knows, strongest first: the one who found the body,
 * the one the client told him to start with, a relation the notebook holds,
 * the client. Null when he knows none, and then the page says none.
 */
export function knownTie(view: CaseView, person: Person, found: readonly Id[]): KnownTie | null {
  if (person.id === view.victim.id) return null;
  const bio = view.kase.victimBio;
  if (bio.discovery?.foundById === person.id && person.id !== view.client.id) return { kind: 'finder' };
  if (view.kase.clientBrief.points.personId === person.id) return { kind: 'pointer', otherId: view.client.id };
  if (person.relationshipId && relationPlain(view.kase, person.relationshipId) && layerCredit(view, person.id, found, 2) > 0) {
    return { kind: 'relation' };
  }
  if (person.id === view.client.id) return { kind: 'client' };
  return null;
}

/**
 * What the finder found: the victim, or — in a theft, a lost pet or a lost
 * item — the thing gone. "Who had found Schilling" of a missing watch had the
 * owner lying on the floor.
 */
export function foundWhat(view: CaseView): string {
  const act = view.kase.act;
  if (isTheft(act.type) && act.taken) return `${act.taken.name.replace(/^(a|an) /, 'the ')} gone`;
  return view.victim.surname;
}

/** "She was the one who had found Sirkin." — the tie, as a sentence of its own. */
export function tieSentence(view: CaseView, person: Person, tie: KnownTie): string {
  const she = pronounOf(person) === 'she';
  const He = she ? 'She' : 'He';
  const him = she ? 'her' : 'him';
  const victim = view.victim.surname;
  switch (tie.kind) {
    case 'finder':
      return `${He} was the one who had found ${foundWhat(view)}.`;
    case 'pointer':
      return `${view.client.surname} had told me to start with ${him}.`;
    case 'relation':
      return `${He} ${(relationPlain(view.kase, person.relationshipId) ?? '').split('{V}').join(victim)}.`;
    case 'client':
      return `${He} was the one paying me.`;
  }
}

/** The tie as a clause after "the one who": "who had found Sirkin". */
function tieClause(view: CaseView, person: Person, tie: KnownTie): string {
  const victim = view.victim.surname;
  switch (tie.kind) {
    case 'finder':
      return `who had found ${foundWhat(view)}`;
    case 'pointer':
      return `${view.client.surname} had told me to start with`;
    case 'relation':
      return `who ${(relationPlain(view.kase, person.relationshipId) ?? '').split('{V}').join(victim)}`;
    case 'client':
      return 'who was paying me';
  }
}

/**
 * What somebody was doing, without their name: "Crowninshield was reading a
 * folded newspaper, not turning the page." is "reading a folded newspaper,
 * not turning the page". Null when the activity is not written that way.
 */
export function doingOf(activity: string, surname: string): string | null {
  const m = new RegExp(`^${surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:,[^,]+,)? was (.+?)\\.?$`).exec(activity.trim());
  return m ? (m[1] as string) : null;
}

const HOURS = ['midnight', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** "at one in the morning", "past three in the morning": the clock as he would say it. */
export function hourSaid(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h <= 0) return 'after midnight';
  const word = HOURS[h] ?? 'some hour';
  return minutes % 60 < 15 ? `at ${word} in the morning` : `past ${word} in the morning`;
}

/**
 * Golden rule 6: one observation of Dashiell's own, drawn from what the person
 * is doing and their tie to the case, with the hour in it. "The woman who had
 * found Sirkin was reading a folded newspaper past one in the morning, not
 * turning the page." A trade the reader has been told goes in front of the
 * clause; otherwise it is "the man" or "the woman".
 */
export function observation(
  view: CaseView,
  person: Person,
  tie: KnownTie,
  doing: string,
  minutes: number,
  trade: string | null,
): string {
  const noun = trade ?? (pronounOf(person) === 'she' ? 'woman' : 'man');
  const clause = tieClause(view, person, tie);
  const who = `The ${noun} ${clause}`;
  const hour = hourSaid(minutes);
  // docs/25 (after M11): the presence line has told the activity whole, joke
  // and all. The observation keeps only the plain action, and adds what the
  // presence line did not: the hour, and the tie to the case.
  return `${who} was ${plainAction(doing)} ${hour}.`;
}

/**
 * The plain action of an activity: up to its first comma, and short of a
 * second clause ("tapping ash from a cigarette without breaking a sentence"
 * is "tapping ash from a cigarette"). "reading a folded newspaper, not turning
 * the page" is "reading a folded newspaper".
 */
export function plainAction(doing: string): string {
  const head = (doing.split(',')[0] ?? doing).trim();
  return head.replace(/\s+(?:while|without|as if|as though|like)\b.*$/, '').replace(/\s+and\s+(?=\w+ing\b).*$/, '').trim();
}
