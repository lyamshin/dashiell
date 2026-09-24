/**
 * M12 Part 1 — the ask, staged.
 *
 * The designer: "it jumps directly to someone answering a question. Write
 * Dashiell actually asking." Every question page (and every confrontation)
 * now has the shape of the designer's own example and the camp golden's §3:
 *
 *   the approach   where he goes and how he settles, from the room and what
 *                  the person is doing ("I took the stool next to …")
 *   the look       one sentence of his read of them, from their trade
 *   the ask        often in reported speech ("I asked her where she'd been")
 *   the try        a drink, a cigarette, a coin, a threat left unsaid — when
 *                  the temper or a second ask calls for it; free, and it
 *                  changes nothing
 *   the outcome    told plainly (the tellings, as before)
 *   the last word  one dry line, the page's one figure, never a verdict
 *
 * This file holds what the planner and the realizer share about it: what kind
 * of room a place is, how somebody is placed in it, and the choices the
 * planner makes without a dealer (reported or direct, a try or not), which
 * are hashed from the run and the page so a test can assert them.
 */

import type { Id, Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { genderHintOf } from '../voice/cast.js';
import { plainAction } from './people.js';
import type { Slots } from '../voice/cards.js';

/** The approach deck's `setting`: the kind of room, read off the place. */
export type Setting = 'bar' | 'counter' | 'street' | 'stair' | 'room' | 'office';

/** The approach deck's `posture`: how the person is placed in it. */
export type Posture = 'seated' | 'standing' | 'behind';

/** What each place template is, for the approach. A place not listed is a room. */
const SETTINGS: Record<string, Setting> = {
  'dolans-bar': 'bar',
  speakeasy: 'bar',
  'pool-hall': 'bar',
  'dance-hall': 'bar',
  automat: 'counter',
  drugstore: 'counter',
  'chop-suey': 'counter',
  pawnshop: 'counter',
  'barber-shop': 'counter',
  'hotel-lobby': 'counter',
  'corner-newsstand': 'street',
  'cab-stand': 'street',
  'el-platform': 'street',
  'square-benches': 'street',
  'ferry-slip': 'street',
  'subway-kiosk': 'street',
  'back-alley': 'street',
  rooftop: 'street',
  'laundry-yard': 'street',
  'pier-shed': 'street',
  'tenement-stairwell': 'stair',
  'hallam-vestibule': 'stair',
  'walkup-flat': 'stair',
};

export function settingOf(view: CaseView, placeId: Id): Setting {
  if (placeId === view.office.id) return 'office';
  return SETTINGS[placeId] ?? 'room';
}

/** Fixtures who work from behind something: a bar, a counter, a stand. */
const BEHIND_ROLES = new Set(['bartender', 'counterman', 'druggist', 'newsstand', 'ticket-taker']);
const SEATED = /\b(?:sitting|seated|sat|at a table|at the table|in a booth|on a stool|on the stool|on a bench|on the bench|slumped|perched|in the good chair|in a chair|in the chair)\b/;
const BEHIND = /\bbehind (?:the|a|his|her) (?:bar|counter|desk|grille|window|register|stand|glass)\b|\b(?:drawing a beer|pouring|rinsing glasses|wiping (?:down )?the (?:bar|counter)|along the length of the bar)\b/;

/**
 * How somebody is placed, read off what they are doing: sitting, behind a bar
 * or a counter, or on their feet. A watcher behind a counter is behind it
 * whatever they are doing; the landlady sits where she can see the stairs.
 */
export function postureOf(person: Person, doing: string | null, setting: Setting): Posture {
  const text = (doing ?? '').toLowerCase();
  if (BEHIND.test(text)) return 'behind';
  if (SEATED.test(text)) return 'seated';
  if (person.kind === 'fixture' && person.fixtureRole && BEHIND_ROLES.has(person.fixtureRole) && setting !== 'office') {
    return 'behind';
  }
  if (person.kind === 'fixture' && (person.fixtureRole === 'landlady' || person.fixtureRole === 'cabbie')) return 'seated';
  if (setting === 'office' || setting === 'bar') return 'seated';
  return 'standing';
}

/** The card slots for one person: surname, pronouns, and `man` or `woman`. */
export function personSlots(person: Person): Slots {
  const she = genderHintOf(person) === 'f';
  return {
    name: person.surname,
    he: she ? 'she' : 'he',
    him: she ? 'her' : 'him',
    his: she ? 'her' : 'his',
    He: she ? 'She' : 'He',
    man: she ? 'woman' : 'man',
  };
}

/** The look deck's `role` for a person: fixture role, else archetype, else `any`. */
export function lookRole(person: Person): string {
  if (person.kind === 'fixture' && person.fixtureRole) return person.fixtureRole;
  return person.archetypeId ?? 'any';
}

/**
 * The approach's {doing}: the plain action only, never the activity's tail —
 * the presence line has told that joke once already (docs/25, after M11).
 */
export function doingClause(doing: string | null): string | null {
  if (doing === null) return null;
  const plain = plainAction(doing.trim().replace(/\.$/, ''));
  const words = plain.split(/\s+/).length;
  if (plain.length === 0 || words < 2 || words > 10) return null;
  return plain;
}

function hash(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x2c;
  }
  return h >>> 0;
}

/** Why a try is made, when one is: the try deck's `why`. */
export type TryWhy = 'guarded' | 'again' | 'easy' | 'press';

/**
 * Whether he tries something before the answer. Somebody guarded gets a try
 * on the first question of a visit; anybody gets one on a question after one
 * that came back with nothing; at a bar, now and then, a friendly one anyway.
 * The try costs nothing and changes nothing: the answer is the case's either
 * way.
 */
export function tryFor(opts: {
  seed: number;
  minutes: number;
  personId: Id;
  temper: string;
  again: boolean;
  afterNothing: boolean;
  setting: Setting;
}): TryWhy | undefined {
  if (opts.afterNothing) return 'again';
  if (opts.temper === 'enigma' && !opts.again) return 'guarded';
  if (opts.again) return undefined;
  const roll = hash(opts.seed, opts.minutes, opts.personId, 'try') % 100;
  if ((opts.setting === 'bar' || opts.setting === 'counter') && roll < 30) return 'easy';
  if (roll < 12) return 'easy';
  return undefined;
}

/**
 * Whether the question is told in his narration ("I asked her where she'd
 * been tonight") or said aloud. Direct quotes are for a question with an
 * edge: to somebody guarded, or asked again. The rest are mixed, about two
 * in three reported.
 */
export function reportedFor(opts: { seed: number; minutes: number; personId: Id; temper: string; again: boolean }): boolean {
  if (opts.temper === 'enigma') return false;
  const roll = hash(opts.seed, opts.minutes, opts.personId, 'reported') % 6;
  // Asked again, the edge is likelier: half and half. Otherwise two in three reported.
  return opts.again ? roll < 3 : roll < 4;
}

/**
 * Before a fact is put to somebody: a threat left unsaid, for somebody
 * guarded, and now and then for anybody. Never on the same visit's second go.
 */
export function pressFor(opts: { seed: number; minutes: number; personId: Id; temper: string; again: boolean }): TryWhy | undefined {
  if (opts.again) return undefined;
  if (opts.temper === 'enigma') return 'press';
  return hash(opts.seed, opts.minutes, opts.personId, 'press') % 3 === 0 ? 'press' : undefined;
}
