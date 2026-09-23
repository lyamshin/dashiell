/**
 * M8 §5 — the thought: what the detective makes of what he just found.
 *
 * Derived, never dealt at random. Each class is read off the structured facts
 * a clue establishes (`Establishes` in `src/gen/types.ts`), the clue's kind and
 * source, and the notebook — what was in hand before this page and what is in
 * hand after it. The deck only supplies the words; which thought a page has,
 * and what it is about, is decided here, and a test can assert it without a
 * sentence of prose.
 *
 * The rule the whole file keeps: a thought never asserts a fact the notebook
 * does not hold. A placement "clears" somebody only against the window the
 * notebook has narrowed, never against the truth's own hour. The one class
 * that reads the truth is `observer-placed`, and it reads it only to refuse:
 * an observation places its observer, but the page says so only when the
 * truth timeline agrees the observer was there, so a lying witness is never
 * handed an alibi by the detective's own reasoning.
 *
 * Pure. Nothing here touches the dealer, the document or the run.
 */

import type { Clue, Fact, Id, Person, Tick } from '../../gen/types.js';
import { spokenClock } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { establishedFrom } from '../derive.js';
import { clearedOnTwo, verdictsOn } from '../m9.js';

const COUNT_WORDS: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

/**
 * An account just taken, against a placement already in hand: the thought
 * Raw and Coddled still print ("It did not match what Kreuzer said").
 */
function contradictionFor(view: CaseView, personId: Id, found: readonly Id[], accountId: Id): Thought | null {
  const claimed = view.claimedOf.get(personId) ?? [];
  for (const id of found) {
    for (const f of view.findableById.get(id)?.establishes ?? []) {
      if ((f.kind !== 'personAt' && f.kind !== 'personNotAt') || f.personId !== personId) continue;
      const claim = claimed[f.tick] ?? null;
      if (claim === null) continue;
      if (f.kind === 'personAt' ? claim !== f.place : claim === f.place) {
        return {
          cls: 'contradicts',
          basis: f.kind === 'personAt' ? 'at' : 'not-at',
          subjectId: personId,
          placeId: f.place,
          tick: f.tick,
          otherPlaceId: claim,
          clueIds: [id, accountId],
          accountIds: [personId],
        };
      }
    }
  }
  return null;
}

export type ThoughtClass =
  | 'clears'
  | 'implicates'
  | 'observer-placed'
  | 'unmentioned'
  | 'contradicts'
  | 'motive'
  | 'method'
  | 'window'
  | 'not-robbery'
  | 'robbery-shape'
  | 'secret'
  | 'dead-end'
  | 'context'
  | 'nothing'
  /* The robbery and missing classes (§5's last paragraph). */
  | 'goods'
  | 'last-seen'
  | 'seen-after'
  /* §4: the detective's view of a person, on arrival. */
  | 'view'
  /* Night Hone 1: what used to fall through to an empty `context`. */
  | 'absent'
  | 'hint'
  /* M9: what a piece of the logic game touches on the grid, never a verdict. */
  | 'touches'
  /* M9: what the detective did with what somebody said when a fact was put to them. */
  | 'confronted';

export const THOUGHT_CLASSES: readonly ThoughtClass[] = [
  'clears',
  'implicates',
  'observer-placed',
  'unmentioned',
  'contradicts',
  'motive',
  'method',
  'window',
  'not-robbery',
  'robbery-shape',
  'secret',
  'dead-end',
  'context',
  'nothing',
  'goods',
  'last-seen',
  'seen-after',
  'view',
  'absent',
  'hint',
  'touches',
  'confronted',
];

/** One thought, as data: the class, what it is about, and what licensed it. */
export interface Thought {
  cls: ThoughtClass;
  /** The person the thought is about: placed, motivated, cleared, viewed. */
  subjectId?: Id;
  /** The person whose word or whose sight it rests on. */
  sourceId?: Id;
  placeId?: Id;
  tick?: Tick;
  /** clears: the scene. contradicts: the place they claimed. */
  otherPlaceId?: Id;
  anchorId?: Id;
  objectId?: Id;
  /** method: the method the find points to. */
  methodId?: Id;
  /**
   * Deck tags beyond the class. `dead-by` and `alive-at` are a window thought
   * from one end of the night (the victim dead by an hour, or alive at one)
   * that did not move the coroner's hours; `self`, `account` and `outside`
   * say what a context thought is context about.
   */
  basis?:
    | 'placement'
    | 'access'
    | 'anchor'
    | 'coroner'
    | 'dead-by'
    | 'alive-at'
    | 'self'
    | 'account'
    | 'outside'
    | 'placed'
    | 'at'
    | 'not-at'
    /* M9, `touches`: the piece of the logic game it is. */
    | 'described'
    | 'absence'
    | 'count'
    | 'anchored'
    | 'timing'
    | 'stranger'
    | 'together'
    | 'apart'
    | 'said'
    /* M10, `clears`: two facts that agree (Raw and Coddled). */
    | 'two'
    /* M9, `confronted`: what came of it. */
    | 'wrong'
    | 'second-lie'
    | 'quiet'
    | 'admit'
    | 'hold'
    | 'withdraw';
  via?: 'office' | 'account';
  who?: 'watcher' | 'client' | 'known' | 'stranger';
  lied?: boolean;
  /** Clues in the notebook that license it. Every thought has at least one, except `nothing` and `view`. */
  clueIds: Id[];
  /** Accounts taken that it also rests on. */
  accountIds?: Id[];
  /** M9: `{other}` said as words the case has: a description, a count, an anchor. */
  otherText?: string;
  /** M9: the second person of `together` and `apart` (`{name}`). */
  secondId?: Id;
  /**
   * Resting on one witness's word, or on an anchor that only makes an hour
   * possible: the thought may say "if", "might" or "would", and nothing flatter.
   */
  single?: boolean;
}

export interface ThoughtInput {
  view: CaseView;
  /** Clues this page delivered, in order. */
  newClues: Clue[];
  foundBefore: readonly Id[];
  foundAfter: readonly Id[];
  accountsBefore: readonly Id[];
  accountsAfter: readonly Id[];
}

/** How many thoughts a page carries, riders (`unmentioned`) not counted. */
export const THOUGHT_CAP = 2;

/**
 * Which of two candidates is the one a page keeps. A contradiction is the
 * thing a reader most needs said; an observation that places its observer is
 * the golden's own "where the game is"; a placement against the window is the
 * case's working reasoning; the rest are background.
 */
const PRIORITY: ThoughtClass[] = [
  'contradicts',
  'observer-placed',
  'clears',
  'implicates',
  'dead-end',
  'secret',
  'motive',
  'robbery-shape',
  'goods',
  'not-robbery',
  'seen-after',
  'last-seen',
  'absent',
  'window',
  'method',
  'hint',
  'touches',
  'context',
];

/**
 * The order the kept thoughts are written in. Golden page 5 reasons from the
 * placement to what it means for the one placed, and only then turns to what
 * it says about the one who saw it.
 */
const WRITTEN: ThoughtClass[] = [
  'window',
  'not-robbery',
  'robbery-shape',
  'goods',
  'clears',
  'implicates',
  'observer-placed',
  'unmentioned',
  'contradicts',
  'motive',
  'method',
  'secret',
  'dead-end',
  'last-seen',
  'seen-after',
  'absent',
  'hint',
  'touches',
  'confronted',
  'context',
  'nothing',
  'view',
];

/** The notebook's window: the ticks the death (or the act) is still consistent with. */
export function windowOf(view: CaseView, found: readonly Id[], accounts: readonly Id[]): Tick[] {
  const board = establishedFrom(view, [...found], [...accounts]).deathTicks;
  if (board.length > 0) return board;
  // Robbery and missing cases carry the window as a given; the board reads
  // only found clues, so a given window has to be read off the act.
  for (const f of view.kase.act.givens.facts) {
    if (f.kind === 'timeOfDeath') {
      const a = f.ticks[0] as Tick;
      const b = f.ticks[f.ticks.length - 1] as Tick;
      return Array.from({ length: b - a + 1 }, (_, i) => (a + i) as Tick);
    }
  }
  return [];
}

function isSuspect(p: Person | undefined): boolean {
  return p !== undefined && p.kind === 'suspect';
}

/**
 * Did the office page put this person at this place at this hour?
 *
 * The briefing is the only thing the client said in the office, and it is on
 * the case as sentences. A placement counts as said when one sentence names
 * both the place and the hour — the hour as the page says it or as the record
 * does.
 */
export function officeSaid(view: CaseView, placeId: Id, tick: Tick): boolean {
  const place = view.placeById.get(placeId)?.shortName;
  if (!place) return false;
  const spoken = spokenClock(tick).toLowerCase();
  const bare = spoken.replace(/ o[’']clock$/, '');
  for (const line of view.kase.briefing) {
    const text = (line.spoken ?? line.text).toLowerCase();
    if (!text.includes(place.toLowerCase())) continue;
    if (text.includes(spoken) || new RegExp(`\\b${bare}\\b`).test(text)) return true;
  }
  return false;
}

/** The first tick of a run of placements inside the window, else the first tick. */
function tickIn(ticks: Tick[], window: readonly Tick[]): Tick {
  return ticks.find((t) => window.includes(t)) ?? (ticks[0] as Tick);
}

/** Placements in a clue, folded to one per person, place and polarity. */
interface Placement {
  personId: Id;
  placeId: Id;
  ticks: Tick[];
  present: boolean;
}

function placementsOf(clue: Clue): Placement[] {
  const out: Placement[] = [];
  for (const f of clue.establishes) {
    if (f.kind !== 'personAt' && f.kind !== 'personNotAt') continue;
    const present = f.kind === 'personAt';
    const same = out.find((p) => p.personId === f.personId && p.placeId === f.place && p.present === present);
    if (same) same.ticks.push(f.tick);
    else out.push({ personId: f.personId, placeId: f.place, ticks: [f.tick], present });
  }
  return out;
}

/**
 * Every thought the page's new clues license, before the cap. Exported for the
 * tests, which want to see a class fire and not only survive the cap.
 */
export function candidateThoughts(input: ThoughtInput): Thought[] {
  const { view, newClues } = input;
  const kase = view.kase;
  const victimId = view.victim.id;
  const scene = view.sceneId;
  const out: Thought[] = [];
  const window = windowOf(view, input.foundAfter, input.accountsAfter);
  const windowBefore = windowOf(view, input.foundBefore, input.accountsBefore);
  const givenMethod = kase.act.givens.facts.some((f) => f.kind === 'methodEvidence');
  const accounts = new Set(input.accountsAfter);
  const inHandBefore = new Set(input.foundBefore);
  const missingFromScene = (found: readonly Id[]): boolean =>
    found.some((id) =>
      (view.findableById.get(id)?.establishes ?? []).some(
        (f) => f.kind === 'objectMissing' && f.fromPlace === scene,
      ),
    );
  const lastSeenTick = kase.victimBio.lastSeen?.tick ?? null;
  // M9, "No automatic verdicts from Poached up": no `clears` and no
  // `contradicts`; a placement inside the window is said as what it touches.
  const verdicts = verdictsOn(view);
  // M10 Part B: in a tiered case (Raw and Coddled) "That cleared X" waits for
  // two facts that agree; one placement on its own is what it touches.
  const twoAfter = clearedOnTwo(view, input.foundAfter);
  const clearsNow = (id: Id): boolean => !kase.logic || twoAfter.has(id);
  const anchorName = (id: Id): string => view.anchorById.get(id)?.name ?? 'that';
  const heldAnchor = (id: Id, found: readonly Id[]): Tick[] | null => {
    for (const fid of found) {
      for (const f of view.findableById.get(fid)?.establishes ?? []) {
        if (f.kind === 'anchorAt' && f.anchorId === id) return f.ticks;
      }
    }
    return null;
  };
  const speaker = (clue: Clue): Id | undefined => (clue.source.type === 'person' ? clue.source.personId : undefined);

  for (const clue of newClues) {
    const before = out.length;
    const facts: Fact[] = clue.establishes;

    /* ---------------------------------------------------- placements */
    for (const p of placementsOf(clue)) {
      const person = view.personById.get(p.personId);
      if (p.personId === victimId) {
        if (!p.present) continue;
        const t = p.ticks[0] as Tick;
        if (kase.act.type === 'missing') {
          const after = lastSeenTick !== null && t > lastSeenTick;
          out.push({
            cls: after ? 'seen-after' : 'last-seen',
            placeId: p.placeId,
            tick: t,
            clueIds: [clue.id],
          });
        } else if (
          kase.act.type === 'murder' &&
          p.placeId === scene &&
          !missingFromScene(input.foundAfter)
        ) {
          // §5: the room as found, and nothing carried out of it. The body-at-
          // scene signature is exactly this fact, from the room or from the
          // one who watched its door.
          out.push({ cls: 'not-robbery', placeId: scene, clueIds: [clue.id] });
        } else if (kase.act.type === 'robbery') {
          // The owner somewhere at an hour: one hour of the night accounted for.
          out.push({ cls: 'context', basis: 'placed', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
        }
        continue;
      }
      const t = tickIn(p.ticks, window);
      const inWindow = window.includes(t);
      // A contradiction first: a placement against an evening the person
      // gave, in either direction, at an hour they accounted for.
      if (verdicts && accounts.has(p.personId)) {
        const claim = view.claimedOf.get(p.personId)?.[t] ?? null;
        if (claim !== null && (p.present ? claim !== p.placeId : claim === p.placeId)) {
          out.push({
            cls: 'contradicts',
            basis: p.present ? 'at' : 'not-at',
            subjectId: p.personId,
            placeId: p.placeId,
            tick: t,
            otherPlaceId: claim,
            clueIds: [clue.id],
            accountIds: [p.personId],
          });
        }
      }
      const contradicted = out.some((x) => x.cls === 'contradicts' && x.subjectId === p.personId && x.clueIds.includes(clue.id));
      if (p.present && isSuspect(person) && inWindow) {
        if (p.placeId === scene) {
          out.push({ cls: 'implicates', basis: 'placement', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
        } else if (verdicts && clearsNow(p.personId)) {
          out.push({ cls: 'clears', subjectId: p.personId, placeId: p.placeId, tick: t, otherPlaceId: scene, clueIds: [clue.id] });
        } else {
          out.push({ cls: 'touches', basis: 'placement', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
        }
      } else if (p.present && isSuspect(person) && window.length > 0 && !contradicted) {
        // A placement outside the hours that matter: it clears nobody and
        // hurts nobody, and the thought says so about the one it places.
        out.push({ cls: 'context', basis: 'outside', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
      } else if (p.present && isSuspect(person) && window.length === 0 && !contradicted) {
        // No hours to hold it against yet: it accounts for one hour of theirs.
        out.push({ cls: 'context', basis: 'placed', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
      } else if (!p.present && isSuspect(person) && !contradicted) {
        // "…and says Prentiss was not": somebody is off a room at an hour.
        // Nothing yet says where they claim to have been; if they ever claim
        // this room, it is a lie in hand.
        out.push({ cls: 'absent', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
      }
      // §5: an observation places its observer — only where the truth agrees.
      if (
        p.present &&
        clue.kind === 'observation' &&
        clue.source.type === 'person' &&
        clue.source.personId !== p.personId
      ) {
        const observer = view.personById.get(clue.source.personId);
        const there = view.truthOf.get(clue.source.personId)?.[t] ?? null;
        // Once said, it stays said: a second clue from the same pair of eyes
        // at the same half hour is not a new thought about where they were.
        const eyes = clue.source.personId;
        const already = input.foundBefore.some((id) => {
          const c = view.findableById.get(id);
          if (!c || c.kind !== 'observation' || c.source.type !== 'person' || c.source.personId !== eyes) return false;
          return c.establishes.some(
            (g) => g.kind === 'personAt' && g.place === p.placeId && g.tick === t && g.personId !== eyes,
          );
        });
        if (observer && observer.kind === 'suspect' && inWindow && there === p.placeId && !already) {
          const placed: Thought = {
            cls: 'observer-placed',
            sourceId: observer.id,
            subjectId: p.personId,
            placeId: p.placeId,
            tick: t,
            clueIds: [clue.id],
          };
          out.push(placed);
          // The rider. The client's briefing did not put the client there; or
          // the observer's own told evening has nothing at that hour.
          if (observer.id === view.client.id && !accounts.has(observer.id)) {
            if (!officeSaid(view, p.placeId, t)) {
              out.push({ cls: 'unmentioned', via: 'office', sourceId: observer.id, placeId: p.placeId, tick: t, clueIds: [clue.id] });
            }
          } else if (accounts.has(observer.id) && verdicts) {
            const claim = view.claimedOf.get(observer.id)?.[t] ?? null;
            if (claim === null) {
              out.push({
                cls: 'unmentioned',
                via: 'account',
                sourceId: observer.id,
                placeId: p.placeId,
                tick: t,
                clueIds: [clue.id],
                accountIds: [observer.id],
              });
            } else if (claim !== p.placeId) {
              out.push({
                cls: 'contradicts',
                basis: 'at',
                subjectId: observer.id,
                placeId: p.placeId,
                tick: t,
                otherPlaceId: claim,
                clueIds: [clue.id],
                accountIds: [observer.id],
              });
            }
          }
        }
      }
    }

    /* ------------------------------------------------------- the rest */
    for (const f of facts) {
      switch (f.kind) {
        case 'hasMotive':
          if (f.personId !== victimId) out.push({ cls: 'motive', subjectId: f.personId, clueIds: [clue.id] });
          break;
        case 'hadAccess':
          if (!out.some((t) => t.cls === 'implicates' && t.subjectId === f.personId && t.clueIds.includes(clue.id))) {
            out.push({ cls: 'implicates', basis: 'access', subjectId: f.personId, clueIds: [clue.id] });
          }
          break;
        case 'objectMissing': {
          // A thing gone that is also the means — the weapon from where it
          // lived, the key off its hook, the timetable off the rack — is
          // method, whatever the case is.
          const means = facts.find((g) => g.kind === 'methodEvidence');
          if (means && means.kind === 'methodEvidence') {
            out.push({ cls: 'method', objectId: f.objectId, placeId: f.fromPlace, methodId: means.methodId, clueIds: [clue.id] });
          } else if (f.fromPlace === scene || f.fromPlace === kase.act.place) {
            if (clue.place !== f.fromPlace && kase.act.type === 'robbery') {
              out.push({ cls: 'goods', objectId: f.objectId, placeId: clue.place, clueIds: [clue.id] });
            } else {
              out.push({ cls: 'robbery-shape', objectId: f.objectId, placeId: f.fromPlace, clueIds: [clue.id] });
            }
          } else if (kase.act.type === 'robbery') {
            out.push({ cls: 'goods', objectId: f.objectId, placeId: clue.place, clueIds: [clue.id] });
          } else {
            // A murder's missing thing is its weapon, gone from where it lived.
            out.push({ cls: 'method', objectId: f.objectId, placeId: f.fromPlace, methodId: kase.solution.methodId, clueIds: [clue.id] });
          }
          break;
        }
        case 'methodEvidence':
          if (!givenMethod && !out.some((t) => t.cls === 'method' && t.clueIds.includes(clue.id))) {
            out.push({ cls: 'method', methodId: f.methodId, clueIds: [clue.id] });
          }
          break;
        case 'secretExplained':
          out.push({ cls: clue.role === 'disqualifier' ? 'dead-end' : 'secret', subjectId: f.personId, clueIds: [clue.id] });
          break;
        /* M9: the pieces of the logic game, said as what they touch. */
        case 'claims': {
          if (out.some((x) => x.clueIds.includes(clue.id) && x.subjectId === f.personId && (x.cls === 'touches' || x.cls === 'contradicts'))) break;
          // At Raw and Coddled an account against a placement in hand is still
          // called a contradiction, to teach; above that it is the account.
          const against = verdicts ? contradictionFor(view, f.personId, input.foundBefore, clue.id) : null;
          out.push(
            against ?? { cls: 'touches', basis: 'account', subjectId: f.personId, clueIds: [clue.id], accountIds: [f.personId] },
          );
          break;
        }
        case 'describedAt': {
          if (out.some((x) => x.cls === 'touches' && x.basis === 'described' && x.clueIds.includes(clue.id))) break;
          const by = speaker(clue);
          out.push({
            cls: 'touches',
            basis: 'described',
            ...(by ? { sourceId: by } : {}),
            placeId: f.place,
            tick: f.tick,
            otherText: f.description.text,
            clueIds: [clue.id],
          });
          break;
        }
        case 'absentFrom': {
          const by = f.except[0] ?? speaker(clue);
          out.push({
            cls: 'touches',
            basis: 'absence',
            ...(by ? { sourceId: by } : {}),
            placeId: f.place,
            tick: tickIn(f.ticks, window),
            clueIds: [clue.id],
          });
          break;
        }
        case 'countAt': {
          const by = speaker(clue);
          out.push({
            cls: 'touches',
            basis: 'count',
            ...(by ? { sourceId: by } : {}),
            placeId: f.place,
            tick: f.tick,
            otherText: f.count === 1 ? 'one person' : `${COUNT_WORDS[f.count] ?? String(f.count)} people`,
            clueIds: [clue.id],
          });
          break;
        }
        case 'personAtAnchor': {
          if (f.personId === victimId) break;
          const ticks = heldAnchor(f.anchorId, input.foundAfter);
          if (ticks !== null && ticks.length === 1) {
            const t = ticks[0] as Tick;
            if (window.includes(t) && f.place !== scene && isSuspect(view.personById.get(f.personId))) {
              out.push(
                verdicts && clearsNow(f.personId)
                  ? { cls: 'clears', subjectId: f.personId, placeId: f.place, tick: t, otherPlaceId: scene, clueIds: [clue.id] }
                  : { cls: 'touches', basis: 'placement', subjectId: f.personId, placeId: f.place, tick: t, clueIds: [clue.id] },
              );
              break;
            }
          }
          out.push({
            cls: 'touches',
            basis: 'anchored',
            subjectId: f.personId,
            placeId: f.place,
            anchorId: f.anchorId,
            otherText: anchorName(f.anchorId),
            clueIds: [clue.id],
          });
          break;
        }
        case 'anchorAt': {
          if (f.ticks.length === 0) break;
          out.push({
            cls: 'touches',
            basis: 'timing',
            anchorId: f.anchorId,
            tick: tickIn(f.ticks, window),
            otherText: anchorName(f.anchorId),
            clueIds: [clue.id],
          });
          break;
        }
        case 'acquainted': {
          if (f.strength === 'name' || f.strength === 'relation') break;
          out.push({ cls: 'touches', basis: 'stranger', sourceId: f.personIds[0], subjectId: f.personIds[1], clueIds: [clue.id] });
          break;
        }
        case 'together':
        case 'apart':
          out.push({
            cls: 'touches',
            basis: f.kind,
            subjectId: f.personIds[0],
            secondId: f.personIds[1],
            ...(f.kind === 'together' && f.ticks.length > 0 ? { tick: tickIn(f.ticks, window) } : {}),
            clueIds: [clue.id],
          });
          break;
        default:
          break;
      }
    }

    /* ------------------------------------------------- the window (§5) */
    const narrows = facts.some(
      (f) => f.kind === 'timeOfDeath' || f.kind === 'victimDeadBy' || f.kind === 'victimAliveAt',
    );
    if (narrows && kase.act.type === 'murder' && window.length > 0 && window.join() !== windowBefore.join()) {
      const anchor = anchorInside(view, clue, window);
      out.push(
        anchor
          ? { cls: 'window', basis: 'anchor', anchorId: anchor.id, tick: anchor.tick, clueIds: [clue.id] }
          : { cls: 'window', basis: 'coroner', clueIds: [clue.id] },
      );
    } else if (narrows && kase.act.type !== 'missing') {
      // One end of the night that did not move the coroner's hours still says
      // something plain: dead by this hour, or alive at that one.
      const dead = facts.find((f) => f.kind === 'victimDeadBy');
      const alive = facts.find((f) => f.kind === 'victimAliveAt');
      if (dead && dead.kind === 'victimDeadBy') {
        out.push({ cls: 'window', basis: 'dead-by', tick: dead.tick, clueIds: [clue.id] });
      } else if (alive && alive.kind === 'victimAliveAt') {
        out.push({ cls: 'window', basis: 'alive-at', tick: alive.tick, clueIds: [clue.id] });
      }
    }

    if (out.length === before && clue.aboutSecretOf && clue.aboutSecretOf !== victimId && !inHandBefore.has(clue.id)) {
      // Noise about somebody's secret: they are hiding something, and the
      // detective cannot yet say whether it is this.
      out.push({ cls: 'hint', subjectId: clue.aboutSecretOf, clueIds: [clue.id] });
    }

    if (out.length === before && !inHandBefore.has(clue.id)) {
      out.push({ cls: 'context', clueIds: [clue.id] });
    }
  }
  // M10 Part B: the page that brings the second of two facts that agree says
  // so (basis `two`): their own account, and somebody who saw them inside it.
  if (twoAfter.size > 0 && input.newClues.length > 0 && window.length > 0) {
    const twoBefore = clearedOnTwo(view, input.foundBefore);
    const last = input.newClues[input.newClues.length - 1] as Clue;
    const t = window[0] as Tick;
    for (const [id, source] of twoAfter) {
      if (twoBefore.has(id) || !isSuspect(view.personById.get(id))) continue;
      if (out.some((x) => x.cls === 'clears' && x.subjectId === id)) continue;
      const place = view.claimedOf.get(id)?.[t] ?? null;
      if (place === null || place === scene) continue;
      // "Nobody else had said any of it yet" is no longer so.
      for (let i = out.length - 1; i >= 0; i--) {
        const x = out[i] as Thought;
        if (x.subjectId === id && x.cls === 'touches' && x.basis === 'account') out.splice(i, 1);
      }
      out.push({
        cls: 'clears',
        basis: 'two',
        subjectId: id,
        ...(source ? { sourceId: source } : {}),
        placeId: place,
        tick: t,
        otherPlaceId: scene,
        clueIds: [last.id],
        accountIds: [id],
      });
    }
  }
  return out;
}

/**
 * An anchor that falls inside the window, preferring the one the clue itself
 * leans on and then the one the notebook's window lands on first. The golden:
 * "Kreuzer had given me two hours. The El might give me the minute."
 */
function anchorInside(
  view: CaseView,
  clue: Clue,
  window: readonly Tick[],
): { id: Id; tick: Tick } | null {
  const anchors = view.kase.anchors;
  const ordered = [
    ...anchors.filter((a) => a.templateId === clue.anchorId),
    ...anchors.filter((a) => a.templateId !== clue.anchorId && clueNames(clue, a.name)),
    ...anchors.filter((a) => a.templateId !== clue.anchorId && !clueNames(clue, a.name)),
  ];
  // Only an anchor the notebook has heard of: named by a clue in hand, or
  // the scene report's own sentence about it. An anchor the case never put
  // on paper is not the detective's to reason from.
  for (const a of ordered) {
    if (!clueNames(clue, a.name) && a.templateId !== clue.anchorId && !sceneFactIn(clue, a.sceneFact)) continue;
    const t = a.ticks.find((x) => window.includes(x));
    if (t !== undefined) return { id: a.templateId, tick: t };
  }
  return null;
}

function clueNames(clue: Clue, name: string): boolean {
  const key = name.replace(/^the /, '').split(' ')[0] ?? name;
  return key.length > 2 && (clue.textRecord ?? clue.text).toLowerCase().includes(key.toLowerCase());
}

function sceneFactIn(clue: Clue, sceneFact: string): boolean {
  const head = sceneFact.split('{T}')[0]?.trim() ?? '';
  return head.length > 6 && clue.text.includes(head);
}

/**
 * The thoughts a page keeps, in the order it writes them: at most
 * `THOUGHT_CAP` by priority, with each kept `observer-placed` bringing its
 * `unmentioned` rider along. `nothing` when the page found nothing at all.
 */
/**
 * Is this placement one person's word and nothing more? A room or a paper
 * says it itself; a second clue in the notebook saying the same thing
 * corroborates it.
 */
function singleWord(view: CaseView, clue: Clue, personId: Id, placeId: Id, tick: Tick, found: readonly Id[]): boolean {
  if (clue.source.type === 'place' && (clue.kind === 'physical' || clue.kind === 'document' || clue.kind === 'scene')) return false;
  const others = found.filter((id) => id !== clue.id);
  return !others.some((id) =>
    (view.findableById.get(id)?.establishes ?? []).some(
      (f) => f.kind === 'personAt' && f.personId === personId && f.place === placeId && f.tick === tick,
    ),
  );
}

/** The single-source marks, laid on after the fact. */
function markSingle(input: ThoughtInput, thoughts: Thought[]): Thought[] {
  return thoughts.map((t) => {
    const clue = input.view.findableById.get(t.clueIds[0] ?? '');
    const word = clue?.source.type === 'person';
    if (t.cls === 'window') return t.basis === 'anchor' || word ? { ...t, single: true } : t;
    // Somebody off a room, or placed outside the hours, on one person's say-so.
    if (t.cls === 'absent' || (t.cls === 'context' && t.basis === 'outside')) return word ? { ...t, single: true } : t;
    if (t.cls !== 'clears' && t.cls !== 'implicates') return t;
    // Two facts that agree are not one person's word.
    if (t.basis === 'two') return t;
    if (!clue) return t;
    if (t.basis === 'access' || t.placeId === undefined || t.tick === undefined || t.subjectId === undefined) {
      const physical = clue.source.type === 'place' && (clue.kind === 'physical' || clue.kind === 'document');
      return physical ? t : { ...t, single: true };
    }
    return singleWord(input.view, clue, t.subjectId, t.placeId, t.tick, input.foundAfter) ? { ...t, single: true } : t;
  });
}

export function thoughtsFor(input: ThoughtInput, cap = THOUGHT_CAP): Thought[] {
  return markSingle(input, thoughtsForUnmarked(input, cap));
}

function thoughtsForUnmarked(input: ThoughtInput, cap: number): Thought[] {
  if (input.newClues.length === 0) return [{ cls: 'nothing', clueIds: [] }];
  const all = candidateThoughts(input);
  // One thought per class and subject: two clues placing Hanrahan at the same
  // half hour are one thought about Hanrahan.
  const seen = new Set<string>();
  const unique = all.filter((t) => {
    const key =
      t.cls === 'touches'
        ? `${t.cls}|${t.basis ?? ''}|${t.subjectId ?? ''}|${t.sourceId ?? ''}|${t.placeId ?? ''}|${t.anchorId ?? ''}`
        : `${t.cls}|${t.subjectId ?? ''}|${t.sourceId ?? ''}|${t.objectId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const primaries = unique
    .filter((t) => t.cls !== 'unmentioned')
    .sort((a, b) => rank(PRIORITY, a.cls) - rank(PRIORITY, b.cls));
  const kept: Thought[] = [];
  let count = 0;
  for (const t of primaries) {
    if (count >= cap) break;
    // Context is what a page says when it has nothing better; never beside
    // something better.
    if (t.cls === 'context' && count > 0) continue;
    kept.push(t);
    count++;
    if (t.cls === 'observer-placed') {
      const rider = unique.find(
        (u) => u.cls === 'unmentioned' && u.sourceId === t.sourceId && u.placeId === t.placeId,
      );
      if (rider) kept.push(rider);
    }
  }
  if (kept.length === 0) kept.push({ cls: 'context', clueIds: input.newClues.map((c) => c.id) });
  return kept.sort((a, b) => rank(WRITTEN, a.cls) - rank(WRITTEN, b.cls));
}

/** Which of two thoughts a page keeps first (lower keeps). */
export function thoughtPriority(cls: ThoughtClass): number {
  return rank(PRIORITY, cls);
}

function rank(order: readonly ThoughtClass[], cls: ThoughtClass): number {
  const i = order.indexOf(cls);
  return i < 0 ? order.length : i;
}

/**
 * §4 — the detective's view of a person on arrival. One per person, from
 * their relation to the case, and whether they have been caught in a lie.
 */
export function viewOf(
  view: CaseView,
  person: Person,
  known: boolean,
  found: readonly Id[],
  accounts: readonly Id[],
): Thought {
  const place = view.placeById.get(person.foundAt ?? '');
  const who: Thought['who'] =
    person.id === view.client.id
      ? 'client'
      : person.kind === 'fixture' && place?.watcher !== undefined && person.fixtureRole === place.watcher
        ? 'watcher'
        : known
          ? 'known'
          : 'stranger';
  const lied = hasLied(view, person.id, found, accounts);
  return { cls: 'view', subjectId: person.id, who, lied, clueIds: [], ...(lied ? { accountIds: [person.id] } : {}) };
}

/** Caught in a lie: a placement in hand contradicts an evening they gave. */
export function hasLied(view: CaseView, personId: Id, found: readonly Id[], accounts: readonly Id[]): boolean {
  // M9: from Poached up the page never says who has lied; the grid shows both.
  if (!verdictsOn(view)) return false;
  if (!accounts.includes(personId)) return false;
  const board = establishedFrom(view, [...found], [...accounts]);
  return (board.placements.get(personId) ?? []).some((p) => p.contradicts);
}
