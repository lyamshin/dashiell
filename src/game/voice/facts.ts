/**
 * A clue, read as something a person could say out loud.
 *
 * The generator writes a clue's text as a record — "Doyle says Dandridge was
 * at the speakeasy from 9:00 PM to 9:30 PM." The notebook keeps that sentence
 * verbatim and for ever. This file works out what the same clue is as speech,
 * so the page can dramatize it without the player losing a word of it.
 *
 * Three things happen here, all of them pure and derived:
 *
 * 1. **Which facts get said.** `hadAccess` and `methodEvidence` are
 *    inferences the generator draws alongside another fact; no clue's text
 *    states them on their own, so voicing them separately would *add*
 *    information rather than carry it. They are carried implicitly.
 * 2. **Runs are compressed.** A clue that puts one person in one room at
 *    three consecutive ticks is one sentence with a span in it, which is what
 *    the clue's own text says: "from 9:00 PM to 9:30 PM."
 * 3. **The attribution is stripped.** "Doyle says X" and "Colquitt on
 *    Dandridge: X" are the record's way of naming its source. Take the prefix
 *    off and what is left is the sentence the man actually said, which is what
 *    the fallback quotes when no utterance in the deck fits.
 */

import type { Clue, Fact, Id, Person, Tick } from '../../gen/types.js';
import { clock } from '../../gen/types.js';
import { MOTIVE_POOL } from '../derive.js';
import type { CaseView } from '../derive.js';

/** Facts that are never a sentence of their own: they ride on another one. */
export const IMPLICIT_FACTS = new Set(['hadAccess', 'methodEvidence']);

export type FactKind =
  | 'personAt'
  | 'personNotAt'
  | 'denial'
  | 'objectMissing'
  | 'noiseAt'
  | 'timeOfDeath'
  | 'hasMotive'
  | 'hadAccess'
  | 'victimAliveAt'
  | 'victimDeadBy'
  | 'methodEvidence'
  | 'secretExplained';

/** One thing to say, and everything a card needs to say it with. */
export interface Beat {
  kind: FactKind;
  subjectId: Id | null;
  slots: Record<string, string | undefined>;
}

function tickSpan(from: Tick, to: Tick): string {
  return from === to ? clock(from) : `${clock(from)} to ${clock(to)}`;
}

/**
 * The facts of a clue, in the order the clue states them, with consecutive
 * placements of one person in one room folded into a span.
 */
export function beatsOf(view: CaseView, clue: Clue): Beat[] {
  const victim = view.victim;
  const out: Beat[] = [];
  const objectName = (id: Id): string | undefined => view.objectById.get(id)?.name;
  const placeName = (id: Id): string | undefined => view.placeById.get(id)?.shortName;
  const surname = (id: Id): string | undefined => view.personById.get(id)?.surname;

  const facts = clue.establishes.filter((f) => !IMPLICIT_FACTS.has(f.kind));
  for (let i = 0; i < facts.length; i++) {
    const f = facts[i] as Fact;
    switch (f.kind) {
      case 'personAt':
      case 'personNotAt': {
        let last = f.tick;
        // Fold the run: same person, same room, consecutive half hours.
        while (i + 1 < facts.length) {
          const next = facts[i + 1] as Fact;
          if (
            next.kind !== f.kind ||
            next.personId !== f.personId ||
            next.place !== f.place ||
            next.tick !== last + 1
          )
            break;
          last = next.tick;
          i++;
        }
        const kind: FactKind = clue.kind === 'denial' && f.kind === 'personNotAt' ? 'denial' : f.kind;
        out.push({
          kind,
          subjectId: f.personId,
          slots: {
            subject: surname(f.personId),
            name: surname(f.personId),
            place: placeName(f.place),
            time: tickSpan(f.tick, last),
          },
        });
        break;
      }
      case 'noiseAt':
        out.push({
          kind: 'noiseAt',
          subjectId: null,
          slots: { place: placeName(f.place), time: clock(f.tick) },
        });
        break;
      case 'timeOfDeath': {
        const a = f.ticks[0] as Tick;
        const b = f.ticks[f.ticks.length - 1] as Tick;
        out.push({
          kind: 'timeOfDeath',
          subjectId: victim.id,
          slots: {
            subject: victim.surname,
            name: victim.surname,
            window: `between ${clock(a)} and ${clock(b)}`,
          },
        });
        break;
      }
      case 'hasMotive':
        out.push({
          kind: 'hasMotive',
          subjectId: f.personId,
          slots: {
            subject: surname(f.personId),
            name: surname(f.personId),
            motive:
              MOTIVE_POOL.find((m) => m.type === f.motiveType)?.description ?? f.motiveType,
          },
        });
        break;
      case 'victimAliveAt':
      case 'victimDeadBy':
        out.push({
          kind: f.kind,
          subjectId: victim.id,
          slots: { subject: victim.surname, name: victim.surname, time: clock(f.tick) },
        });
        break;
      case 'objectMissing':
        out.push({
          kind: 'objectMissing',
          subjectId: null,
          slots: {
            object: objectName(f.objectId),
            place: placeName(f.fromPlace),
          },
        });
        break;
      case 'secretExplained': {
        const who = view.personById.get(f.personId);
        const secret = who?.secret ?? who?.coverSecret;
        out.push({
          kind: 'secretExplained',
          subjectId: f.personId,
          slots: {
            subject: surname(f.personId),
            name: surname(f.personId),
            secret: (secret?.label ?? f.secretType).toLowerCase(),
          },
        });
        break;
      }
      default:
        break;
    }
  }
  // Where somebody was comes before what it means. The generator files the
  // facts in the order its derivation happened to produce them; a person
  // speaking says the placement first and the conclusion after.
  const rank = (b: Beat): number =>
    b.kind === 'personAt' || b.kind === 'personNotAt' || b.kind === 'denial' ? 0 : 1;
  return out
    .map((b, i) => ({ b, i }))
    .sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i)
    .map((x) => x.b);
}

/**
 * The clue's own sentence with the record's attribution taken off the front,
 * so that what is left is what the person said. Null when the text is written
 * about the speaker rather than by them, which is the case for the anchor
 * knowledge tests: those keep their full text as a record instead.
 */
export function strippedQuote(clue: Clue, speaker: Person | undefined): string | null {
  if (!speaker) return null;
  const text = clue.text;
  const name = speaker.surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const says = new RegExp(`^${name}\\s+says\\s+`, 'i');
  const on = new RegExp(`^${name}\\s+on\\s+[^:]{1,60}:\\s+`, 'i');
  for (const re of [says, on]) {
    const m = re.exec(text);
    if (!m) continue;
    const rest = text.slice(m[0].length).trim();
    if (rest.length === 0) continue;
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return null;
}

/**
 * Which of the four `find` clue kinds a clue is, if it is one of them.
 *
 * M5 §7: the `morgue` kind is how the reducer finds the free opening clues and
 * it keeps its name in the generator, but a robbery has no body and a
 * disappearance has no body either. The opening report on those two is a desk
 * sergeant's, filed, and the deck's document cards are the ones written for a
 * piece of paper in a drawer. A coroner's card on a stolen envelope was the
 * engine saying somebody had died.
 */
export function findKindOf(
  view: CaseView,
  clue: Clue,
): 'physical' | 'document' | 'morgue' | 'scene' | null {
  switch (clue.kind) {
    case 'morgue':
      return view.kase.act.type === 'murder' ? 'morgue' : 'document';
    case 'physical':
    case 'document':
    case 'scene':
      return clue.kind;
    default:
      return null;
  }
}
