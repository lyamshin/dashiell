/**
 * M8 §6 — the bridge: the next lead, named, and why.
 *
 * When a find opens a lead the page says so in terms the reader already has:
 * who to ask (the target clue's source), what about (its subject), why that
 * subject matters (their relation to the victim, to a place, or to the hour),
 * and where the one to ask is found. Golden page 3: "A man in Sweeney's line
 * keeps a secretary, and a secretary knows who has an appointment. His was a
 * woman named Hanrahan. Kreuzer would know where Hanrahan had been tonight."
 *
 * At most one a page: the lead on the spine, else the first opened. Pure.
 */

import type { Clue, Id, Tick } from '../../gen/types.js';
import { spokenClock } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { windowOf } from './thought.js';

export type Tie = 'victim' | 'place' | 'time';

export interface BridgePlan {
  /** The lead's target clue: not yet found, and open once this page is read. */
  targetId: Id;
  /** The clue on this page that opened it. */
  openerId: Id;
  /** Who to ask. Absent when the lead is a room to go through. */
  whoId?: Id;
  /** Whom the question is about, when it is about a person. */
  subjectId?: Id;
  /** What the question is about, as the page says it. */
  subject: string;
  tie: Tie;
  /** The words {tie} is filled with. */
  tieText: string;
  /** Where the one to ask is found, as the notebook's lead list has it. */
  whereId?: Id;
  /** A room to go through rather than a person to ask: the deck's `lead: search`. */
  search?: boolean;
  /** The hour the notebook's window opens on, for a subject already introduced. */
  hour?: string;
}

const fold = (s: string): string => s.toLowerCase().replace(/[’']/g, "'");

/** The first person a generated topic names. */
export function subjectOfTopic(view: CaseView, topic: string): Id | null {
  const hay = fold(topic);
  let best: { at: number; id: Id } | null = null;
  for (const p of view.kase.people) {
    const n = fold(p.surname);
    let from = 0;
    for (;;) {
      const at = hay.indexOf(n, from);
      if (at < 0) break;
      from = at + 1;
      if (/[a-z]/.test(hay.charAt(at - 1)) || /[a-z]/.test(hay.charAt(at + n.length))) continue;
      if (best === null || at < best.at) best = { at, id: p.id };
      break;
    }
  }
  return best?.id ?? null;
}

/**
 * The leads this page opened: targets in the new clues' `leadsTo` that are
 * open once the page is read. In the order the clues and their leads come.
 */
export function openedLeads(view: CaseView, newClues: readonly Clue[], foundAfter: readonly Id[]): Clue[] {
  const have = new Set(foundAfter);
  const out: Clue[] = [];
  for (const clue of newClues) {
    for (const id of clue.leadsTo) {
      if (have.has(id) || out.some((c) => c.id === id)) continue;
      // Not found yet and pointed at by a clue in hand: that is an open lead,
      // exactly as `threadsFor` builds the notebook's list.
      const target = view.findableById.get(id);
      if (target) out.push(target);
    }
  }
  return out;
}

/**
 * The bridge for a page, or null. `at` is where the page happens; a lead to
 * go through this very room needs no bridge, because the room is in front of
 * the reader and the next page's carry line says why.
 */
export function planBridge(
  view: CaseView,
  newClues: readonly Clue[],
  foundAfter: readonly Id[],
  accountsAfter: readonly Id[],
  at: Id,
  opts: { scenesOpening?: boolean } = {},
): BridgePlan | null {
  const opened = openedLeads(view, newClues, foundAfter);
  if (opened.length === 0) return null;
  // §6: the scene's free opening hands over the report and the coroner's note
  // and, with them, most of the night's first leads. When one of them is the
  // room itself, the room is the next thing; the notebook lists the rest.
  if (opts.scenesOpening && opened.some((c) => c.source.type === 'place' && c.place === at)) return null;
  const spine = opened.filter((c) => c.role === 'spine');
  const target = (spine[0] ?? opened[0]) as Clue;
  if (target.source.type === 'place' && target.place === at) return null;
  const opener = newClues.find((c) => c.leadsTo.includes(target.id)) as Clue;

  if (target.source.type === 'place') {
    const place = view.placeById.get(target.source.placeId);
    const name = place?.shortName ?? '';
    return {
      targetId: target.id,
      openerId: opener.id,
      subject: name,
      tie: 'place',
      tieText: name,
      whereId: target.place,
      search: true,
    };
  }

  const whoId = target.source.personId;
  const topic = target.source.topic;
  const named = subjectOfTopic(view, topic);
  const where = view.placeById.has(target.place) ? target.place : undefined;
  const base = {
    targetId: target.id,
    openerId: opener.id,
    whoId,
    ...(where === undefined ? {} : { whereId: where }),
    hour: hourOf(view, foundAfter, accountsAfter),
  };
  if (named !== null && named !== view.victim.id) {
    const person = view.personById.get(named);
    const subject = person?.surname ?? topic;
    if (person?.relationshipToVictim) {
      return { ...base, subjectId: named, subject, tie: 'victim', tieText: person.relationshipToVictim };
    }
    // A fixture matters for the room they keep: "the landlady at the third floor".
    const post = view.placeById.get(person?.foundAt ?? '');
    if (post && person) {
      const role = person.role.replace(/\.$/, '');
      return { ...base, subjectId: named, subject, tie: 'place', tieText: `${role} at ${post.shortName}` };
    }
    return { ...base, subjectId: named, subject, tie: 'time', tieText: hourOf(view, foundAfter, accountsAfter) };
  }
  // The victim, an hour, a room or a thing: the question is about the hour
  // the notebook's window opens on, and {subject} is whatever it is about.
  const place = view.places.find((p) => fold(topic).includes(fold(p.shortName)));
  // M10: somebody's own evening is said with their name, before any pronoun
  // could stand for it: "Zeldin's evening", never "his own evening … Zeldin".
  const asker = view.personById.get(whoId);
  const own = /\b(?:his|her|their) own evening\b/.test(topic) && asker ? `${asker.surname}’s evening` : null;
  const subject =
    named === view.victim.id
      ? view.victim.surname
      : own !== null
        ? own
        : place && named === null
          ? place.shortName
          : topic.replace(/ that evening$/, '');
  return {
    ...base,
    ...(named === view.victim.id ? { subjectId: named } : {}),
    subject,
    tie: 'time',
    tieText: hourOf(view, foundAfter, accountsAfter),
  };
}

/** The hour the notebook's window opens on, as a person says it. */
function hourOf(view: CaseView, found: readonly Id[], accounts: readonly Id[]): string {
  const w = windowOf(view, found, accounts);
  const t = (w[0] ?? view.kase.coronerWindow[0]) as Tick;
  return spokenClock(t);
}
