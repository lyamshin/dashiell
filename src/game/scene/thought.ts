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
  | 'view';

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
  /** Deck tags beyond the class. */
  basis?: 'placement' | 'access' | 'anchor' | 'coroner';
  via?: 'office' | 'account';
  who?: 'watcher' | 'client' | 'known' | 'stranger';
  lied?: boolean;
  /** Clues in the notebook that license it. Every thought has at least one, except `nothing` and `view`. */
  clueIds: Id[];
  /** Accounts taken that it also rests on. */
  accountIds?: Id[];
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
  'window',
  'method',
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
        }
        continue;
      }
      const t = tickIn(p.ticks, window);
      const inWindow = window.includes(t);
      // A contradiction first: a placement against an evening the person
      // gave, in either direction, at an hour they accounted for.
      if (accounts.has(p.personId)) {
        const claim = view.claimedOf.get(p.personId)?.[t] ?? null;
        if (claim !== null && (p.present ? claim !== p.placeId : claim === p.placeId)) {
          out.push({
            cls: 'contradicts',
            subjectId: p.personId,
            placeId: p.placeId,
            tick: t,
            otherPlaceId: claim,
            clueIds: [clue.id],
            accountIds: [p.personId],
          });
        }
      }
      if (p.present && isSuspect(person) && inWindow) {
        if (p.placeId === scene) {
          out.push({ cls: 'implicates', basis: 'placement', subjectId: p.personId, placeId: p.placeId, tick: t, clueIds: [clue.id] });
        } else {
          out.push({ cls: 'clears', subjectId: p.personId, placeId: p.placeId, tick: t, otherPlaceId: scene, clueIds: [clue.id] });
        }
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
          } else if (accounts.has(observer.id)) {
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
          if (facts.some((g) => g.kind === 'methodEvidence')) {
            out.push({ cls: 'method', objectId: f.objectId, placeId: f.fromPlace, clueIds: [clue.id] });
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
            out.push({ cls: 'method', objectId: f.objectId, placeId: f.fromPlace, clueIds: [clue.id] });
          }
          break;
        }
        case 'methodEvidence':
          if (!givenMethod && !out.some((t) => t.cls === 'method' && t.clueIds.includes(clue.id))) {
            out.push({ cls: 'method', clueIds: [clue.id] });
          }
          break;
        case 'secretExplained':
          out.push({ cls: clue.role === 'disqualifier' ? 'dead-end' : 'secret', subjectId: f.personId, clueIds: [clue.id] });
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
    }

    if (out.length === before && !inHandBefore.has(clue.id)) {
      out.push({ cls: 'context', clueIds: [clue.id] });
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
export function thoughtsFor(input: ThoughtInput): Thought[] {
  if (input.newClues.length === 0) return [{ cls: 'nothing', clueIds: [] }];
  const all = candidateThoughts(input);
  // One thought per class and subject: two clues placing Hanrahan at the same
  // half hour are one thought about Hanrahan.
  const seen = new Set<string>();
  const unique = all.filter((t) => {
    const key = `${t.cls}|${t.subjectId ?? ''}|${t.sourceId ?? ''}|${t.objectId ?? ''}`;
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
    if (count >= THOUGHT_CAP) break;
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
  if (!accounts.includes(personId)) return false;
  const board = establishedFrom(view, [...found], [...accounts]);
  return (board.placements.get(personId) ?? []).some((p) => p.contradicts);
}
