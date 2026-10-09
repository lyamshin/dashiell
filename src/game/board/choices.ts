/**
 * docs/43 §3: choices.
 *
 * - People present, then their topics (two clicks): a suspect's "Where were
 *   you tonight?" and the victim or the thing; a watcher's "Who was here
 *   tonight?"; "Put it to …" once one of their claims collides with
 *   something held. A company-only witness is here once named.
 * - Search the finds that exist, where the detective is.
 * - Go to the places the player knows of.
 * - The free row: go over what I have, file the report.
 *
 * Stars (`stars.ts`) go on the topic, search or walk that takes an open
 * step, at most three, each with its reason. Every label's minutes are what
 * the engine charges (docs/38).
 */

import { minutesAfter } from '../clock.js';
import type { OfferedChoice, OfferedGroup } from '../types.js';
import { candidateLines, collisionsOf, confrontationOf, judgeLine, knownPeople, knownPlaces, linesHeld, listOf, peopleAt, type Line } from './knowledge.js';
import {
  OFFICE,
  andList,
  budgetCalls,
  cap,
  hourWord,
  isMurder,
  nameOf,
  personOf,
  placeName,
  pronOf,
  type BoardDeal,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { breakSaid } from './pages.js';
import { starPlace, starReason, starredSteps } from './stars.js';

/** The minutes the next call moves the clock: what a label says and the engine charges. */
export function callMinutes(d: BoardDeal, run: Pick<BoardRun, 'used'>): number {
  const b = budgetCalls(d);
  return minutesAfter(run.used + 1, b) - minutesAfter(run.used, b);
}

/** The usual minutes of a call tonight, for "(rounded)" on the odd one out. */
function usualMinutes(d: BoardDeal): number {
  const b = budgetCalls(d);
  return Math.round(480 / b / 5) * 5;
}

export interface BoardStar {
  q: string;
  why: string;
  /** The command that takes it from here: the topic or search, or the walk to where it waits. */
  command: string;
}

/** The page's stars: at most three, each on the choice that takes its step from where the detective stands. */
export function pageStars(d: BoardDeal, run: BoardRun): BoardStar[] {
  const c = d.kase;
  const out: BoardStar[] = [];
  const here = new Set(peopleAt(c, run, run.at));
  const places = knownPlaces(c, run);
  for (const q of starredSteps(d, run)) {
    if (out.length >= 3) break;
    const [kind, rest] = q.split(':') as [string, string];
    let command: string | null = null;
    if (kind === 'account' || kind === 'list') {
      if (here.has(rest)) command = `ask ${rest} ${kind === 'list' ? 'list' : 'evening'}`;
    } else if (kind === 'search') {
      const f = c.finds.find((x) => x.id === rest);
      if (f && f.place === run.at) command = `search ${rest}`;
    } else if (kind === 'confront') {
      const [p] = rest.split('@') as [string];
      if (here.has(p)) command = `picker ${p}`;
    }
    if (command === null) {
      const at = starPlace(c, q);
      if (!at || at === run.at || !places.has(at)) continue;
      command = `go ${at}`;
      if (out.some((s) => s.command === command)) continue;
    }
    out.push({ q, why: starReason(c, run, q), command });
  }
  return out;
}

/** A topic's label for the victim or the thing: "Weisglass", "Fritz", "the watch". */
export function motiveLabel(d: BoardDeal): string {
  const v = personOf(d.kase, d.kase.crime.victim);
  return v ? cap(v.short) : 'The case';
}

export function boardChoices(d: BoardDeal, run: BoardRun): OfferedGroup[] {
  const c = d.kase;
  if (run.filed || run.reportOpen) return [];
  const mins = callMinutes(d, run);
  const usual = usualMinutes(d);
  const stars = pageStars(d, run);
  const starOf = (command: string) => stars.find((s) => s.command === command);
  const choice = (command: string, label: string, done = false, free = false): OfferedChoice => {
    const s = done ? undefined : starOf(command);
    return {
      command,
      label,
      minutes: done || free ? 0 : mins,
      lead: s !== undefined,
      done,
      ...(s ? { why: s.why } : {}),
      ...(!done && !free && mins !== usual ? { rounded: true as const } : {}),
    };
  };
  const groups: OfferedGroup[] = [];
  if (run.at !== OFFICE) {
    for (const p of peopleAt(c, run, run.at)) {
      const person = personOf(c, p);
      if (!person || person.role === 'client') continue;
      const topics: OfferedChoice[] = [];
      if (person.role === 'watcher') {
        if (listOf(c, p)) topics.push(choice(`ask ${p} list`, 'Who was here tonight?', run.asked.includes(`list:${p}`)));
      } else {
        topics.push(choice(`ask ${p} evening`, 'Where were you tonight?', run.asked.includes(`account:${p}`)));
        if (person.role === 'suspect') topics.push(choice(`ask ${p} motive`, motiveLabel(d), run.asked.includes(`motive:${p}`)));
        if (pickerFor(d, run, p) !== null) {
          const s = starOf(`picker ${p}`);
          topics.push({ command: `picker ${p}`, label: `Put it to ${person.short}`, minutes: 0, lead: s !== undefined, done: false, ...(s ? { why: s.why } : {}), note: 'opens the claims' });
        }
      }
      groups.push({ kind: 'ask', heading: `Ask ${person.short} about`, personId: p, choices: topics });
    }
    const finds = c.finds.filter((f) => f.place === run.at);
    if (finds.length > 0) {
      groups.push({
        kind: 'search',
        heading: 'Search',
        choices: finds.map((f) => choice(`search ${f.id}`, cap(f.what), run.asked.includes(`search:${f.id}`))),
      });
    }
  }
  const known = knownPlaces(c, run);
  const people = knownPeople(c, run);
  const places = [...known.keys()].filter((p) => p !== run.at);
  if (run.at !== OFFICE) places.push(OFFICE);
  const go = places.map((p) => {
    const ch = choice(`go ${p}`, placeName(c, p));
    if (run.visited.includes(p) || p === OFFICE) return ch;
    // Who the player knows of who's there tonight, or why the place is known at all.
    const there = c.people.filter((x) => x.foundAt === p && people.has(x.id) && (x.role === 'suspect' || x.role === 'company')).map((x) => x.short);
    return { ...ch, note: there.length > 0 ? `${andList(there)} ${there.length > 1 ? 'are' : 'is'} there` : (known.get(p) ?? 'not been') };
  });
  // Stars first; then the rest. More than four places fold under "Other places".
  go.sort((a, b) => Number(b.lead) - Number(a.lead));
  const shown = go.filter((g, i) => g.lead || i < 3);
  const more = go.filter((g) => !shown.includes(g));
  groups.push({ kind: 'go', heading: 'Go to', choices: shown, ...(more.length > 0 ? { more } : {}) });
  const free: OfferedChoice[] = [];
  if (run.at !== OFFICE) free.push({ command: 'recap', label: 'Go over what I have', minutes: 0, lead: false, done: false });
  free.push({ command: 'file', label: 'File the report', minutes: 0, lead: false, done: false });
  groups.push({ kind: 'free', heading: '', choices: free });
  return groups;
}

/* ------------------------------------------------------------------ *
 * The confrontation picker (docs/43 §5).
 * ------------------------------------------------------------------ */

export interface PickerClaim {
  hour: Hour;
  /** "the Odessa at ten" — their own line. */
  label: string;
  /** A second story, put back after a second lie. */
  again: boolean;
  /** The lines held for that place and hour, to read them. From Poached up the player picks. */
  lines: { command: string; label: string; source: string }[];
}

export interface Picker {
  person: PersonId;
  /** Raw and Coddled: the pair offered ready-made, one a claim. */
  ready: { command: string; label: string }[];
  /** Poached up: the claims that collide, each with its short list. */
  claims: PickerClaim[];
  /** One sentence and an example, in the book's words. */
  help: string;
  minutes: number;
}

/** Their claims that collide with something held, and what can be put against each. Null when none. */
export function pickerFor(d: BoardDeal, run: BoardRun, p: PersonId): Picker | null {
  const c = d.kase;
  if (!run.asked.includes(`account:${p}`)) return null;
  const lines = linesHeld(c, run);
  const landed = new Set(run.puts.filter((x) => x.landed && !x.again).map((x) => `${x.person}@${x.hour}`));
  const landedAgain = new Set(run.puts.filter((x) => x.landed && x.again).map((x) => `${x.person}@${x.hour}`));
  const claims: PickerClaim[] = [];
  const ready: { command: string; label: string }[] = [];
  for (const col of collisionsOf(c, run, p)) {
    if (landed.has(`${p}@${col.hour}`)) continue;
    const cands = candidateLines(c, run, p, col.hour, lines);
    const label = `${personOf(c, p)?.home === col.claim.place ? 'home' : placeName(c, col.claim.place ?? '')} at ${hourWord(col.hour)}`;
    claims.push({ hour: col.hour, label, again: false, lines: cands.map((l) => lineChoice(d, p, col.hour, l, false, run)) });
    const b = col.breakers[0];
    if (b) ready.push({ command: `put ${p} ${col.hour} ${b.id}`, label: `${cap(nameOf(c, p))} says ${label}. ${cap(breakSaid(c, b, p, run.asked))}.` });
  }
  // A second story, once told, collides with the list where it claims to be.
  for (const put of run.puts.filter((x) => x.person === p && x.landed && !x.again)) {
    const k = confrontationOf(c, p, put.hour);
    const alt = k?.secondLie?.place;
    if (!alt || landedAgain.has(`${p}@${put.hour}`)) continue;
    const at = lines.filter((l) => l.kind === 'list' && l.hour === put.hour && l.place === alt);
    const breaks = at.filter((l) => !l.about.includes(p) && listWhole(d, l));
    if (breaks.length === 0) continue;
    const label = `${placeName(c, alt)} at ${hourWord(put.hour)}, the second story`;
    claims.push({ hour: put.hour, label, again: true, lines: at.map((l) => lineChoice(d, p, put.hour, l, true, run)) });
    ready.push({ command: `put ${p} ${put.hour} ${(breaks[0] as Line).id} again`, label: `${cap(nameOf(c, p))} now says ${placeName(c, alt)} at ${hourWord(put.hour)}. ${cap(breakSaid(c, breaks[0] as Line, p, run.asked))}.` });
  }
  if (claims.length === 0) return null;
  const pr = pronOf(c, p);
  return {
    person: p,
    ready: c.tier <= 1 ? ready : [],
    claims: c.tier <= 1 ? [] : claims,
    help:
      c.tier <= 1
        ? `Read ${pr.him} the line that breaks ${pr.his} story.`
        : `Pick the hour ${pr.his} story can’t live with, then the line that breaks it: say, somebody who saw who was there then, and not ${pr.him}.`,
    minutes: callMinutes(d, run),
  };
}

function listWhole(d: BoardDeal, l: Line): boolean {
  const lst = listOf(d.kase, l.speaker as PersonId);
  return !!lst && (lst.entries[l.hour as Hour] ?? []).every((e) => !('other' in e) || (d.kase.others?.find((o) => o.id === e.other)?.known ?? true));
}

function lineChoice(d: BoardDeal, p: PersonId, h: Hour, l: Line, again: boolean, run: BoardRun): { command: string; label: string; source: string } {
  const c = d.kase;
  return {
    command: `put ${p} ${h} ${l.id}${again ? ' again' : ''}`,
    label: `${cap(breakSaid(c, l, p, run.asked))}.`,
    source: l.kind === 'list' ? `${nameOf(c, l.speaker as PersonId)}’s list` : l.kind === 'claim' ? `${nameOf(c, l.speaker as PersonId)}’s story` : l.kind === 'given' ? 'the office' : `${nameOf(c, l.speaker as PersonId)}`,
  };
}

/** Whether a put would land, for tests and the oracle. Never shown. */
export function putLands(d: BoardDeal, run: BoardRun, p: PersonId, h: Hour, lineId: string): boolean {
  const l = linesHeld(d.kase, run).find((x) => x.id === lineId);
  return !!l && judgeLine(d.kase, run, p, h, l).landed;
}

export { isMurder, PlaceId };
