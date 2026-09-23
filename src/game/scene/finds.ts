/**
 * docs/25 read-through, engine prose (docs/26): a search find told, not
 * printed.
 *
 * Most things a search turns up describe themselves — "A lease assignment made
 * out in Dettweiler's name" is what the detective sees, and the page says so in
 * the past tense. Two kinds of find are not things at all but the generator's
 * statements about the night, and printed as narration they read as a record:
 *
 * - **A secret explained** (a disqualifier): "The bank confirms the account:
 *   Brennan has been taking two hundred a month…". Here the page says what the
 *   detective found in the room, and then, from the clue's own facts, where it
 *   put the one whose secret it is. What it means — the reason for a lie, and
 *   nothing about the murder — is the thought's (`thought.ts`, `explained`).
 * - **When something happened**, written down where he searched: "The drunk
 *   singing under the window was at half past seven." Here the page says where
 *   the hour was written, and the hour — once a night. When the night has
 *   already told that hour, the find says it is the hour he already had.
 *
 * Every name and hour here comes out of the clue's facts, so the
 * correspondence checker can trace it. Pure but for the dealer's random.
 */

import type { Clue, Fact, Id, Tick } from '../../gen/types.js';
import { spokenClock } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import type { Rng } from '../../gen/rng.js';
import {
  SEARCH_TIMING,
  SEARCH_TIMING_KNOWN,
  SEARCH_TIMING_MANY,
  SEARCH_TIMING_MORE,
  SECRET_FINDS,
  SECRET_FIND_ANY,
  SECRET_FIND_PUT,
} from '../voice-data.js';
import { runsOf, whenOf } from './telling.js';

/** How the night came to hold an anchor's hour: a fact in the notebook, or only the room's own words. */
export interface AnchorTold {
  ticks: Tick[];
  byFact: boolean;
}

/**
 * The anchors whose hour the pages have already told, from the clues in hand:
 * an `anchorAt` fact, or the scene report's own sentence about the anchor it
 * names ("The singing under the window stopped at half past seven"), which
 * says the hour whether or not the notebook holds it as a fact.
 */
export function anchorsTold(view: CaseView, found: readonly Id[]): Map<Id, AnchorTold> {
  const out = new Map<Id, AnchorTold>();
  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    for (const f of clue.establishes) {
      if (f.kind === 'anchorAt' && f.ticks.length > 0) out.set(f.anchorId, { ticks: [...f.ticks], byFact: true });
    }
    const said = sceneAnchor(view, clue);
    if (said && !out.has(said.anchorId)) out.set(said.anchorId, { ticks: [said.tick], byFact: false });
  }
  return out;
}

/** The anchor a scene report names, and the hour its sentence gives, when it does. */
export function sceneAnchor(view: CaseView, clue: Clue): { anchorId: Id; tick: Tick } | null {
  if (clue.kind !== 'scene' || !clue.anchorId) return null;
  const anchor = view.anchorById.get(clue.anchorId);
  const head = anchor?.sceneFact.split('{T}')[0]?.trim() ?? '';
  const dead = clue.establishes.find((f): f is Extract<Fact, { kind: 'victimDeadBy' }> => f.kind === 'victimDeadBy');
  if (!anchor || head.length <= 6 || !dead || !clue.text.includes(head)) return null;
  return { anchorId: anchor.templateId, tick: dead.tick };
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`;
}

function fillIn(template: string, slots: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(slots)) out = out.split(`{${k}}`).join(v);
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** A secret explained that a search turned up: a disqualifier, from a place. */
export function isSecretFind(clue: Clue): boolean {
  return clue.role === 'disqualifier' && clue.source.type === 'place' && clue.establishes.some((f) => f.kind === 'secretExplained');
}

/** When something happened, written down at a place. */
export function isTimingFind(clue: Clue): boolean {
  return clue.kind === 'timing' && clue.source.type === 'place' && clue.establishes.some((f) => f.kind === 'anchorAt');
}

/**
 * The find as the page tells it, or null for a find that describes itself
 * (the caller says it in the past tense, as before).
 *
 * `told` is the anchors whose hour the night has told before this find.
 */
export function toldFind(view: CaseView, clue: Clue, at: Id, told: ReadonlyMap<Id, AnchorTold>, random: Rng): string | null {
  if (isSecretFind(clue)) return secretFind(view, clue, at, random);
  if (isTimingFind(clue)) return timingFind(view, clue, told, random);
  return null;
}

function secretFind(view: CaseView, clue: Clue, at: Id, random: Rng): string {
  const explained = clue.establishes.filter((f): f is Extract<Fact, { kind: 'secretExplained' }> => f.kind === 'secretExplained');
  const first = explained[0] as Extract<Fact, { kind: 'secretExplained' }>;
  const person = view.personById.get(first.personId);
  const surname = person?.surname ?? 'somebody';
  const pool = SECRET_FINDS[first.secretType] ?? SECRET_FIND_ANY;
  const found = fillIn(random.pick(pool), { P: surname, V: view.victim.surname });
  // Where it put them: each of the people it explains, from its own facts.
  // Partners seen at the same place and hours are said together.
  const ids = [...new Set(explained.map((f) => f.personId))];
  const groups: { ids: Id[]; place: Id; ticks: Tick[] }[] = [];
  for (const id of ids) {
    const byPlace = new Map<Id, Tick[]>();
    for (const f of clue.establishes) {
      if (f.kind === 'personAt' && f.personId === id) byPlace.set(f.place, [...(byPlace.get(f.place) ?? []), f.tick]);
    }
    for (const [place, ticks] of byPlace) {
      const key = [...ticks].sort((a, b) => a - b).join(',');
      const same = groups.find((g) => g.place === place && [...g.ticks].sort((a, b) => a - b).join(',') === key);
      if (same) same.ids.push(id);
      else groups.push({ ids: [id], place, ticks });
    }
  }
  const put = groups.map((g) =>
    fillIn(random.pick(SECRET_FIND_PUT), {
      who: list(g.ids.map((id) => view.personById.get(id)?.surname ?? 'somebody')),
      at: g.place === at ? 'here' : `at ${view.placeById.get(g.place)?.shortName ?? 'somewhere'}`,
      when: list(runsOf(g.ticks).map(whenOf)),
    }),
  );
  return [found, ...put].join(' ');
}

function timingFind(view: CaseView, clue: Clue, told: ReadonlyMap<Id, AnchorTold>, random: Rng): string {
  const f = clue.establishes.find((g): g is Extract<Fact, { kind: 'anchorAt' }> => g.kind === 'anchorAt') as Extract<
    Fact,
    { kind: 'anchorAt' }
  >;
  const anchor = view.anchorById.get(f.anchorId)?.name ?? 'it';
  const before = told.get(f.anchorId);
  // docs/25: an hour the night has told is not told again; only the new ones are.
  const fresh = [...new Set(f.ticks)].filter((t) => !(before?.ticks ?? []).includes(t)).sort((a, b) => a - b);
  if (fresh.length === 0) return fillIn(random.pick(SEARCH_TIMING_KNOWN), { anchor });
  const times = list(fresh.map((t) => spokenClock(t)));
  const pool = fresh.length < new Set(f.ticks).size ? SEARCH_TIMING_MORE : fresh.length > 1 ? SEARCH_TIMING_MANY : SEARCH_TIMING;
  return fillIn(random.pick(pool), { anchor, times });
}
