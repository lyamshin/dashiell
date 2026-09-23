/**
 * M10 §A.2 — fact families, told together.
 *
 * Facts of one kind arrive in one natural answer, never one question per
 * fact: a person's comings and goings, a door's head counts, the strangers
 * somebody saw, a thing the witness knows about, their own evening. This file
 * only sorts: the clues a page gains, grouped by what a person would say in
 * one breath, in the order the answer reaches them. The reducer reads it to
 * pace a conversation (§A.3, at most three families a page); the planner and
 * the realizer read it to write each family as one telling.
 *
 * Pure. Nothing here deals a card.
 */

import type { Clue, Id } from '../../gen/types.js';
import type { CaseView } from '../derive.js';

export type FamilyKind =
  /** One person's comings and goings, sightings tied to an event among them. */
  | 'movements'
  /** A door's head counts and its "nobody but". */
  | 'counts'
  /** People the witness saw and did not know. */
  | 'strangers'
  /** What anybody at a place at an hour would know, and whether somebody does. */
  | 'event'
  /** Knowing somebody, or not: "Never heard of her." */
  | 'knowing'
  /** When something the whole block times things by happened. */
  | 'timing'
  /** The witness's own evening, start to finish. */
  | 'evening'
  /** Access, means, motive and the rest: said as the thing the witness knows about. */
  | 'thing'
  /** A find in a room: each its own short moment (§A.5). */
  | 'find';

export const FAMILY_KINDS: readonly FamilyKind[] = [
  'movements',
  'counts',
  'strangers',
  'event',
  'knowing',
  'timing',
  'evening',
  'thing',
  'find',
];

export interface Family {
  kind: FamilyKind;
  /** Which family: `movements:p-s2`, `counts:walkup-flat`. */
  key: string;
  clueIds: Id[];
  /** The person the family is about, when it is about one. */
  subjectId?: Id;
  /** The place the family is about, when it is about one. */
  placeId?: Id;
  /** The anchor, for `event` and `timing`. */
  anchorId?: Id;
}

/** §A.3: at most this many families are told on one page. */
export const FAMILY_CAP = 3;

/** The one person a clue is about, besides whoever said it. */
function subjectOf(clue: Clue, speakerId: Id | undefined): Id | undefined {
  if (clue.about) return clue.about;
  for (const f of clue.establishes) {
    if ('personId' in f && f.personId !== speakerId) return f.personId;
    if ('personIds' in f) {
      const other = f.personIds.find((id) => id !== speakerId);
      if (other) return other;
    }
  }
  return undefined;
}

/** Which family one clue belongs to. */
export function familyOf(_view: CaseView, clue: Clue): Omit<Family, 'clueIds'> {
  const speakerId = clue.source.type === 'person' ? clue.source.personId : undefined;
  if (clue.source.type === 'place') return { kind: 'find', key: `find:${clue.id}` };
  const facts = clue.establishes;
  const kinds = new Set(facts.map((f) => f.kind));
  if (clue.kind === 'account' || kinds.has('claims')) {
    return { kind: 'evening', key: `evening:${speakerId ?? ''}`, ...(speakerId ? { subjectId: speakerId } : {}) };
  }
  if (clue.kind === 'watch' || kinds.has('countAt') || kinds.has('absentFrom')) {
    const at = facts.find((f) => f.kind === 'countAt' || f.kind === 'absentFrom');
    const placeId = at && 'place' in at ? at.place : clue.place;
    return { kind: 'counts', key: `counts:${placeId}`, placeId };
  }
  if (facts.length > 0 && facts.every((f) => f.kind === 'describedAt')) {
    const at = facts[0];
    const placeId = at && at.kind === 'describedAt' ? at.place : clue.place;
    return { kind: 'strangers', key: `strangers:${placeId}`, placeId };
  }
  if (kinds.has('anchorAt') && facts.every((f) => f.kind === 'anchorAt')) {
    const a = facts[0];
    const anchorId = a && a.kind === 'anchorAt' ? a.anchorId : undefined;
    return { kind: 'timing', key: `timing:${anchorId ?? clue.id}`, ...(anchorId ? { anchorId } : {}) };
  }
  if (kinds.has('anchorKnowledge') || kinds.has('knows')) {
    const a = facts.find((f) => f.kind === 'anchorKnowledge' || f.kind === 'knows');
    const anchorId = a && 'anchorId' in a ? a.anchorId : undefined;
    return { kind: 'event', key: `event:${anchorId ?? clue.id}`, ...(anchorId ? { anchorId } : {}) };
  }
  const placed = facts.some(
    (f) => f.kind === 'personAt' || f.kind === 'personNotAt' || f.kind === 'personAtAnchor',
  );
  const subjectId = subjectOf(clue, speakerId);
  if (placed && subjectId) {
    return { kind: 'movements', key: `movements:${subjectId}`, subjectId };
  }
  if (facts.length > 0 && facts.every((f) => f.kind === 'acquainted') && subjectId) {
    // Not knowing somebody is said where their comings and goings would be.
    return { kind: 'knowing', key: `movements:${subjectId}`, subjectId };
  }
  if (clue.kind === 'testimony' && subjectId) {
    return { kind: 'movements', key: `movements:${subjectId}`, subjectId };
  }
  return {
    kind: 'thing',
    key: `thing:${clue.kind}:${subjectId ?? clue.id}`,
    ...(subjectId ? { subjectId } : {}),
  };
}

/**
 * The clues, grouped by family in the order the answer reaches them. A family
 * that mixes `knowing` with `movements` is told as `movements`.
 */
export function familiesOf(view: CaseView, clues: readonly Clue[]): Family[] {
  const out: Family[] = [];
  for (const clue of clues) {
    const f = familyOf(view, clue);
    const had = out.find((x) => x.key === f.key);
    if (had) {
      had.clueIds.push(clue.id);
      if (had.kind === 'knowing' && f.kind === 'movements') had.kind = 'movements';
      continue;
    }
    out.push({ ...f, clueIds: [clue.id] });
  }
  return out;
}

/**
 * §A.3: the clues told now and the ones a "Go on" keeps for the next page,
 * a family at a time.
 */
export function paceClues(view: CaseView, clues: readonly Clue[]): { now: Clue[]; later: Clue[] } {
  const families = familiesOf(view, clues);
  if (families.length <= FAMILY_CAP) return { now: [...clues], later: [] };
  const keep = new Set(families.slice(0, FAMILY_CAP).flatMap((f) => f.clueIds));
  return { now: clues.filter((c) => keep.has(c.id)), later: clues.filter((c) => !keep.has(c.id)) };
}
