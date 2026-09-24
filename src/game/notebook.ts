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
import { dossierKnown } from './voice/plain.js';
import { displayName, saidRecords, verdictsOn } from './m9.js';

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

/**
 * M5 §4 — a person's dossier, by the layer it was learned at. Never a layer
 * that has not been learned: the notebook is what is in hand and nothing else.
 */
export interface NotebookDossier {
  /** Layer 0, the moment they are in the room: sex, rough age, visible trade. */
  onSight: string[];
  /** Layer 1, after `ask X about themselves`. */
  volunteered: string[];
  /** Layer 2, off the observations and the overheard lines about them. */
  fromOthers: string[];
  /** Layer 3, out of the documents. */
  documents: string[];
}

/** A third party a backstory names. Never a person, never interviewable. */
export interface NotebookMention {
  id: Id;
  name: string;
  text: string;
}

export interface NotebookPerson {
  id: Id;
  surname: string;
  role: string;
  foundAt: string | null;
  isClient: boolean;
  /** The victim's own entry (§4). Standing and discovery, no alibi. */
  isVictim: boolean;
  dossier: NotebookDossier;
  /** Third parties this person's tie names, in italics, under them. */
  mentions: NotebookMention[];
  facts: NotebookFact[];
  /** Everything this person said, in the generator's words, in order found. */
  records: NotebookRecord[];
  /** Their own account, once taken down. */
  account: { span: string; place: string }[] | null;
  /**
   * M9: what the book calls them — their surname once somebody who knows them
   * has said it, and until then what anybody can see ("the man in his
   * thirties").
   */
  display: string;
  /** M9: what they said when a fact was put to them, in their words, in order. */
  said: NotebookRecord[];
  /** M9 §4: they have told everything they will; their questions are free. */
  done: boolean;
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
  /**
   * M5 §7: what the board's three lines are called. A robbery has no time of
   * death and nobody near a weapon, and the engine must never say it does.
   */
  deathLabel: string;
  methodLabel: string;
  accessLabel: string;
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

/** `dossierKnown`'s four layers, under the names the notebook prints. */
function layered(known: {
  layer0: string[];
  layer1: string[];
  layer2: string[];
  layer3: string[];
}): NotebookDossier {
  return {
    onSight: known.layer0,
    volunteered: known.layer1,
    fromOthers: known.layer2,
    documents: known.layer3,
  };
}

/**
 * The victim's entry (§4). Everything in it came out of the briefing, which
 * the client delivered on page one, so all of it is in hand from the first
 * page: who they were in this neighbourhood, and how the case came to light.
 */
function victimDossier(
  view: CaseView,
  learned: Parameters<typeof dossierKnown>[2],
): NotebookDossier {
  const bio = view.kase.victimBio;
  const known = layered(dossierKnown(view, view.victim.id, { ...learned, met: [view.victim.id] }));
  const fromOthers = [...known.fromOthers];
  if (bio.discovery) fromOthers.unshift(bio.discovery.foundText);
  if (bio.lastSeen) fromOthers.unshift(bio.lastSeen.text);
  return {
    onSight: [bio.standing, ...known.onSight],
    // A robbery's owner is alive and can be asked about themselves like
    // anybody else; a murder's victim never gives their own account.
    volunteered: known.volunteered,
    fromOthers,
    documents: known.documents,
  };
}

export function buildNotebook(view: CaseView, state: RunState): Notebook {
  const kase = view.kase;
  const est = establishedFrom(view, state.found, state.accounts);
  const visited = new Set<Id>(state.log.map((p) => p.at));
  visited.add(state.at);

  const met = new Set(state.met);
  const learned = {
    found: state.found,
    met: state.met,
    selfTold: state.selfTold,
    gossip: state.gossip,
  };
  const mentionById = new Map(kase.mentions.map((m) => [m.id, m]));
  // §4: the victim has an entry of their own — standing and how the case came
  // to light, both of which the briefing handed over on page one — and no
  // alibi, because an alibi is a thing the living are asked for.
  const people: NotebookPerson[] = kase.people
    .filter((p) => p.kind === 'victim' || met.has(p.id))
    .map((p) => {
      const placements = (est.placements.get(p.id) ?? [])
        .slice()
        .sort((a, b) => a.tick - b.tick);
      // M9 polish: half hours running on from one source, at or not at one
      // place, are one line: "9:00–10:00 PM — not at the third floor (Rafferty)".
      type Run = { from: Tick; to: Tick; key: string; fact: NotebookFact; present: boolean; placeId: Id; order: number };
      const runs: Run[] = [];
      const open = new Map<string, Run>();
      for (const pl of placements) {
        const clue = view.findableById.get(pl.clueId);
        const source =
          clue && clue.source.type === 'person'
            ? personName(view, clue.source.personId)
            : placeName(view, clue?.source.type === 'place' ? clue.source.placeId : null);
        // M9: from Poached up the notebook never flags a contradiction.
        const contradicts = pl.contradicts && verdictsOn(view);
        const key = `${pl.present}|${pl.placeId}|${source}|${contradicts}`;
        const tick = pl.tick as Tick;
        const run = open.get(key);
        if (run && run.to === tick - 1) {
          run.to = tick;
          continue;
        }
        if (run && run.to === tick) continue;
        const fresh: Run = {
          from: tick,
          to: tick,
          key,
          present: pl.present,
          placeId: pl.placeId,
          order: runs.length,
          fact: { text: '', source, contradicts, clueId: pl.clueId },
        };
        runs.push(fresh);
        open.set(key, fresh);
      }
      const facts: NotebookFact[] = runs
        .sort((a, b) => a.from - b.from || a.order - b.order)
        .map((r) => {
          const when = r.from === r.to ? clock(r.from) : `${clock(r.from).replace(/ PM$/, '')}–${clock(r.to)}`;
          return { ...r.fact, text: `${when} — ${r.present ? 'at' : 'not at'} ${placeName(view, r.placeId)}` };
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
        .map((c) => ({ clueId: c.id, text: c.textRecord ?? c.text }));
      const known: NotebookDossier =
        p.kind === 'victim'
          ? victimDossier(view, learned)
          : layered(dossierKnown(view, p.id, learned));
      // A third party is named by a tie, and a tie is layer 2: until somebody
      // has said something about this person, the name has not come up.
      const third = p.dossier?.tie.third;
      const mention = third ? mentionById.get(third) : undefined;
      const mentions: NotebookMention[] =
        mention && known.fromOthers.length > 0
          ? [{ id: mention.id, name: mention.name, text: mention.text }]
          : [];
      // M9: somebody only seen is not named in their own entry either.
      const display = displayName(view, state, p.id);
      if (display !== p.surname) {
        const she = known.onSight.some((l) => /\bShe\b/.test(l)) || p.dossier?.gender === 'f';
        const unname = (l: string): string =>
          l
            .replace(new RegExp(`^${p.surname}\\b`), she ? 'She' : 'He')
            .replace(new RegExp(`\\b${p.surname}\\b`, 'g'), display);
        known.onSight = known.onSight.map(unname);
      }
      const said = saidRecords(view, state)
        .filter((r) => r.personId === p.id)
        .map((r) => ({ clueId: r.id, text: r.text }));
      const mine = view.kase.findable.filter((c) => c.source.type === 'person' && c.source.personId === p.id);
      const done =
        view.kase.logic !== undefined &&
        p.kind !== 'victim' &&
        mine.length > 0 &&
        mine.every((c) => state.found.includes(c.id) || !askableNow(view, state, c));
      return {
        id: p.id,
        surname: p.surname,
        display,
        said,
        done,
        role: p.role,
        foundAt: p.foundAt ? placeName(view, p.foundAt) : null,
        isClient: p.isClient === true,
        isVictim: p.kind === 'victim',
        dossier: known,
        mentions,
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
      .map((c) => ({ clueId: c.id, text: c.textRecord ?? c.text })),
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

  const type = kase.act.type;
  const established: NotebookEstablished = {
    deathLabel:
      type === 'murder'
        ? 'time of death'
        : type === 'robbery'
          ? 'when it was taken'
          : type === 'lost-pet'
            ? 'when it got out'
            : type === 'lost-item'
              ? 'when it went'
              : type === 'affair'
                ? 'the half hour that matters'
                : 'when they were last seen',
    methodLabel: type === 'murder' ? 'method' : 'how it was done',
    accessLabel: type === 'murder' ? 'near the weapon' : 'had the means',
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

/**
 * Could the detective put this clue's question to its source right now: its
 * topic a name the notebook holds, their evening, or an open lead? What is
 * still unasked and askable keeps a person from being done.
 */
function askableNow(view: CaseView, state: RunState, clue: import('../gen/types.js').Clue): boolean {
  if (clue.source.type !== 'person') return false;
  if (clue.kind === 'account') return true;
  if (state.threads.some((t) => t.clueId === clue.id)) return true;
  const about = clue.about ? view.personById.get(clue.about) : undefined;
  if (!about) return false;
  return about.id === view.victim.id || (state.met.includes(about.id) && displayName(view, state, about.id) === about.surname);
}

/* ------------------------------------------------------------------ *
 * M6 §4 — names on hover.
 * ------------------------------------------------------------------ */

/** What a hover card shows: a title line and a few short lines under it. */
export interface HoverCard {
  title: string;
  lines: string[];
}

/** Every word the run has put on paper so far, and every record in hand. */
function onPaper(view: CaseView, state: RunState): string {
  const pages = state.log
    .flatMap((p) => p.blocks)
    .map((b) =>
      b.kind === 'prose' || b.kind === 'note' ? b.text : b.kind === 'presence' ? (b.text ?? '') : '',
    );
  const records = state.found
    .map((id) => view.findableById.get(id))
    .map((c) => (c ? `${c.text}\n${c.textRecord ?? ''}` : ''));
  return [...pages, ...records].join('\n');
}

/**
 * A person's card. Only what the notebook holds: the full name if it has been
 * said, the trade and the look, where they were met or who named them, and
 * the newest line the notebook has about them. Somebody the notebook does not
 * hold yet gets a card that says so and nothing else.
 */
export function personCard(
  view: CaseView,
  state: RunState,
  personId: Id,
  book: Notebook = buildNotebook(view, state),
): HoverCard | null {
  const person = view.personById.get(personId);
  if (!person) return null;
  const entry = book.people.find((p) => p.id === personId);
  if (!entry) return { title: person.surname, lines: ['Not in the notebook yet.'] };

  const title = onPaper(view, state).includes(person.name) ? person.name : person.surname;
  const lines: string[] = [];
  const role = `${entry.role}${entry.isClient ? ', our client' : ''}${entry.isVictim ? ', the victim' : ''}`;
  lines.push(`${role.charAt(0).toUpperCase()}${role.slice(1)}.`);
  const look = entry.dossier.onSight.find((l) =>
    /\b(teens|twenties|thirties|forties|fifties|sixties|seventies)\b/.test(l),
  );
  if (look && !entry.isVictim) lines.push(look);

  // Where they were met, or who named them.
  const metAt = state.log.find((p) =>
    p.blocks.some((b) => b.kind === 'presence' && b.personIds.includes(personId)),
  );
  if (entry.isClient) {
    // The client came up the stairs on page one, before any room's roll.
    lines.push(`Met at ${view.office.shortName}.`);
  } else if (metAt) {
    lines.push(`Met at ${placeName(view, metAt.at)}.`);
  } else if (!entry.isVictim) {
    const namer = state.found
      .map((id) => view.findableById.get(id))
      .find((c) => c !== undefined && (c.textRecord ?? c.text).includes(person.surname));
    if (namer) {
      const by =
        namer.source.type === 'person'
          ? personName(view, namer.source.personId)
          : placeName(view, namer.source.placeId);
      lines.push(`Not met. Named by ${by}.`);
    } else {
      lines.push('Not met.');
    }
  }

  // The newest line the notebook has about them.
  const order = (clueId: Id): number => state.found.indexOf(clueId);
  const candidates: { at: number; text: string }[] = [
    ...entry.facts.map((f) => ({ at: order(f.clueId), text: `${f.text} (${f.source})` })),
    ...entry.records.map((r) => ({ at: order(r.clueId), text: r.text })),
  ];
  const newest = candidates.sort((a, b) => b.at - a.at)[0];
  if (newest) lines.push(newest.text);
  else if (entry.account) {
    lines.push(`Says: ${entry.account.map((a) => `${a.span} ${a.place}`).join('; ')}.`);
  }
  return { title, lines };
}

/** A place's card: what kind of place, who watches it, been or not, leads open here. */
export function placeHoverCard(
  view: CaseView,
  state: RunState,
  placeId: Id,
  book: Notebook = buildNotebook(view, state),
): HoverCard | null {
  const place = book.places.find((p) => p.id === placeId);
  if (!place) return null;
  const lines: string[] = [];
  const kind =
    ({ private: 'Private', semi: 'Semi-public', public: 'Public' } as Record<string, string>)[
      place.kind
    ] ?? place.kind;
  lines.push(`${kind}, ${place.watcher ? `watched by the ${place.watcher}` : 'unwatched'}.`);
  lines.push(place.visited ? 'Been.' : 'Not been.');
  const leads = state.threads.filter((t) => t.placeId === placeId);
  if (leads.length > 0) {
    lines.push(
      `${leads.length === 1 ? 'One lead' : `${leads.length} leads`} open here: ${leads
        .map((l) => l.label)
        .join('; ')}.`,
    );
  }
  return { title: place.shortName, lines };
}
