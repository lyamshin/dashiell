/**
 * The right-hand page. Everything here is derived from `RunState` and the
 * case; the notebook keeps no state of its own, so it is never stale.
 *
 * M4 §A.1 moved the record here. A clue's flat text — the generator's
 * sentence, verbatim, never rewritten — is written down under the person or
 * the room it came from, at the moment it is found. The left-hand page
 * dramatizes the same fact; this is the authoritative copy, and it is always
 * one click away. That is what keeps the game fair.
 */

import { clock } from '../gen/types.js';
import type { Id, Tick } from '../gen/types.js';
import { actionsLeft, clockAfter, minutesPerAction } from './clock.js';
import type { CaseView } from './derive.js';
import {
  MOTIVE_POOL,
  accountRuns,
  claimedAccount,
  establishedFrom,
  gameBudget,
  personName,
  placeName,
  spanLabel,
} from './derive.js';
import type { RunState, Thread } from './types.js';

export interface NotebookClock {
  time: string;
  actionsLeft: number;
  budget: number;
  perAction: number;
}

export interface NotebookFact {
  text: string;
  /** The source of the fact, in brackets after it. */
  source: string;
  contradicts: boolean;
  clueId: Id;
}

/** A clue's own sentence, verbatim, under the source it came from. */
export interface NotebookRecord {
  clueId: Id;
  text: string;
}

export interface NotebookPerson {
  id: Id;
  surname: string;
  role: string;
  foundAt: string | null;
  isClient: boolean;
  facts: NotebookFact[];
  /** Everything this person said, in the generator's words, in order found. */
  records: NotebookRecord[];
  /** Their own account, once taken down. */
  account: { span: string; place: string }[] | null;
}

export interface NotebookPlace {
  id: Id;
  shortName: string;
  name: string;
  kind: string;
  watcher: string | null;
  visited: boolean;
  objects: string[];
  /** Everything found in this room, verbatim, in the order it was found. */
  clues: NotebookRecord[];
}

export interface NotebookThreads {
  placeId: Id;
  placeLabel: string;
  here: boolean;
  leads: Thread[];
}

export interface NotebookEstablished {
  death: string;
  method: string | null;
  motives: string[];
  access: string[];
  cleared: string[];
}

export interface Notebook {
  clock: NotebookClock;
  people: NotebookPerson[];
  places: NotebookPlace[];
  threads: NotebookThreads[];
  established: NotebookEstablished;
  foundCount: number;
  findableCount: number;
}

export function buildNotebook(view: CaseView, state: RunState): Notebook {
  const kase = view.kase;
  const est = establishedFrom(view, state.found, state.accounts);
  const visited = new Set<Id>(state.log.map((p) => p.at));
  visited.add(state.at);

  const met = new Set(state.met);
  const people: NotebookPerson[] = kase.people
    .filter((p) => p.kind !== 'victim' && met.has(p.id))
    .map((p) => {
      const placements = (est.placements.get(p.id) ?? [])
        .slice()
        .sort((a, b) => a.tick - b.tick);
      const facts: NotebookFact[] = placements.map((pl) => {
        const clue = view.findableById.get(pl.clueId);
        const source =
          clue && clue.source.type === 'person'
            ? personName(view, clue.source.personId)
            : placeName(view, clue?.source.type === 'place' ? clue.source.placeId : null);
        return {
          text: `${clock(pl.tick as Tick)} — ${pl.present ? 'at' : 'not at'} ${placeName(
            view,
            pl.placeId,
          )}`,
          source,
          contradicts: pl.contradicts,
          clueId: pl.clueId,
        };
      });
      const account = state.accounts.includes(p.id) ? claimedAccount(view, p.id) : null;
      // The record (A.1): every clue this person gave up, in the generator's
      // own words, in the order the player got them.
      const records: NotebookRecord[] = state.found
        .map((id) => view.findableById.get(id))
        .filter(
          (c): c is NonNullable<typeof c> =>
            c !== undefined && c.source.type === 'person' && c.source.personId === p.id,
        )
        .map((c) => ({ clueId: c.id, text: c.text }));
      return {
        id: p.id,
        surname: p.surname,
        role: p.role,
        foundAt: p.foundAt ? placeName(view, p.foundAt) : null,
        isClient: p.isClient === true,
        facts,
        records,
        account: account
          ? accountRuns(account)
              .filter((r) => r.placeId !== null)
              .map((r) => ({
                span: spanLabel(r.from, r.to),
                place: placeName(view, r.placeId),
              }))
          : null,
      };
    });

  const places: NotebookPlace[] = view.places.map((pl) => ({
    id: pl.id,
    shortName: pl.shortName,
    name: pl.name,
    kind: pl.kind,
    watcher: pl.watcher ?? null,
    visited: visited.has(pl.id),
    objects: visited.has(pl.id)
      ? pl.objects.map((o) => view.objectById.get(o)?.name ?? o)
      : [],
    // Only what the room itself gave up. What a person said in this room is
    // written under the person.
    clues: state.found
      .map((id) => view.findableById.get(id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined && c.source.type === 'place' && c.source.placeId === pl.id)
      .map((c) => ({ clueId: c.id, text: c.text })),
  }));

  const byPlace = new Map<Id, Thread[]>();
  for (const t of state.threads) {
    const list = byPlace.get(t.placeId) ?? [];
    list.push(t);
    byPlace.set(t.placeId, list);
  }
  const threads: NotebookThreads[] = [...byPlace.entries()]
    .map(([placeId, leads]) => ({
      placeId,
      placeLabel: placeName(view, placeId),
      here: placeId === state.at,
      leads,
    }))
    .sort((a, b) => Number(b.here) - Number(a.here) || a.placeLabel.localeCompare(b.placeLabel));

  const death =
    est.deathTicks.length === 0
      ? 'Nothing established yet.'
      : est.deathTicks.length === 1
        ? clock(est.deathTicks[0] as Tick)
        : `${clock(est.deathTicks[0] as Tick)}–${clock(
            est.deathTicks[est.deathTicks.length - 1] as Tick,
          )} (${est.deathTicks.length} half-hours still open)`;

  const established: NotebookEstablished = {
    death,
    method: est.methodEvidence ? kase.method.name : null,
    motives: est.motives.map(
      (m) =>
        `${personName(view, m.personId)} — ${
          MOTIVE_POOL.find((x) => x.type === m.motiveType)?.description ?? m.motiveType
        }`,
    ),
    access: est.access.map((a) => personName(view, a.personId)),
    cleared: est.secretsExplained.map((id) => personName(view, id)),
  };

  return {
    clock: {
      time: clockAfter(state.actionsUsed, gameBudget(kase)),
      actionsLeft: actionsLeft(state.actionsUsed, gameBudget(kase)),
      budget: gameBudget(kase),
      perAction: minutesPerAction(gameBudget(kase)),
    },
    people,
    places,
    threads,
    established,
    foundCount: state.found.length,
    findableCount: kase.findable.length,
  };
}
