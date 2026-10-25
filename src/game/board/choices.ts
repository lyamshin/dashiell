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

import { minutesAfter } from './clock.js';
import type { OfferedChoice, OfferedGroup } from './types.js';
import { candidateLines, collisionsOf, confrontationOf, judgeLine, knownPeople, knownPlaces, lineShown, linesHeld, listOf, peopleAt, type Line } from './knowledge.js';
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
import { homeNamed } from './home.js';
import { starPlace, starReason, starredSteps, walksOnly } from './stars.js';

/** The minutes the next call moves the clock: what a label says and the engine charges. */
export function callMinutes(d: BoardDeal, run: Pick<BoardRun, 'used'>): number {
  const b = budgetCalls(d);
  return minutesAfter(run.used + 1, b) - minutesAfter(run.used, b);
}

export interface BoardStar {
  q: string;
  why: string;
  /** The command that takes it from here: the topic or search, or the walk to where it waits. */
  command: string;
}

/**
 * The page's stars: at most three, each on the choice that takes its step
 * from where the detective stands. At Medium a star is only ever a walk
 * (docs/46 §1): it says where to go, and why, never what to ask there.
 */
export function pageStars(d: BoardDeal, run: BoardRun): BoardStar[] {
  const c = d.kase;
  const out: BoardStar[] = [];
  const here = new Set(peopleAt(c, run, run.at));
  const places = knownPlaces(c, run);
  const walks = walksOnly(c);
  for (const q of starredSteps(d, run)) {
    if (out.length >= 3) break;
    const [kind, rest] = q.split(':') as [string, string];
    let command: string | null = null;
    void walks;
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
    out.push({ q, why: starReason(c, run, q, command.startsWith('go ')), command });
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
          // docs/47 A6: opening the picker is free to look; confronting them is the action. (docs/64: "Confront", never "Put it to".)
          topics.push({ command: `picker ${p}`, label: `Confront ${person.short}`, minutes: 0, lead: s !== undefined, done: false, ...(s ? { why: s.why } : {}) });
        }
      }
      groups.push({ kind: 'ask', heading: `Ask ${person.short} about`, personId: p, choices: topics });
    }
    const finds = c.finds.filter((f) => f.place === run.at);
    if (finds.length > 0) {
      groups.push({
        kind: 'search',
        heading: 'Search',
        // docs/47 B7: the papers say what they're for, so a letter in the office doesn't make them sound searched.
        choices: finds.map((f) => {
          const ch = choice(`search ${f.id}`, cap(f.what), run.asked.includes(`search:${f.id}`));
          // A starred search says why on its star; an unstarred one says it here.
          return f.gives.why && !ch.lead ? { ...ch, note: 'who had what against him' } : ch;
        }),
      });
    }
  }
  const known = knownPlaces(c, run);
  const people = knownPeople(c, run);
  const places = [...known.keys()].filter((p) => p !== run.at);
  if (run.at !== OFFICE) places.push(OFFICE);
  const go = places.map((p) => {
    const ch = choice(`go ${p}`, placeName(c, p));
    const visited = run.visited.includes(p) || p === OFFICE;
    // Who the player knows of who's there tonight, or why the place is known at all.
    const there = c.people.filter((x) => x.foundAt === p && people.has(x.id) && (x.role === 'suspect' || x.role === 'company')).map((x) => x.short);
    const note = visited ? undefined : there.length > 0 ? `${andList(there)} ${there.length > 1 ? 'are' : 'is'} there` : (known.get(p) ?? 'not been');
    // docs/55 4: a starred walk says its reason once. Its label is the place, so a reason that names
    // the place again ("The laudanum came from the Delmonico rooms") gives way to the note, and the
    // note isn't said beside the star as well.
    if (ch.why) {
      const [ptr, ...rest] = ch.why.split(' — ');
      const act = rest.join(' — ');
      if (act && (ptr ?? '').toLowerCase().includes(placeName(c, p).toLowerCase())) return { ...ch, why: note && note !== 'not been' ? `${note}; ${act}` : act };
      return ch;
    }
    return note ? { ...ch, note } : ch;
  });
  // Stars first; then the rest. More than four places fold under "Other places", and more than
  // three once the room holds five people to ask (decided 2026-10-11: the innocent liar is back in
  // the room they claimed, which can make a crowded bar), so a page stays about eight choices.
  go.sort((a, b) => Number(b.lead) - Number(a.lead));
  const crowd = groups.filter((g) => g.kind === 'ask').length >= 5 ? 2 : 3;
  const shown = go.filter((g, i) => g.lead || i < crowd);
  const more = go.filter((g) => !shown.includes(g));
  groups.push({ kind: 'go', heading: 'Go to', choices: shown, ...(more.length > 0 ? { more } : {}) });
  const free: OfferedChoice[] = [];
  // docs/64: plain words for the free row.
  if (run.at !== OFFICE) free.push({ command: 'recap', label: 'Review my notes', minutes: 0, lead: false, done: false });
  free.push({ command: 'file', label: 'Close the case', minutes: 0, lead: false, done: false });
  groups.push({ kind: 'free', heading: '', choices: free });
  return groups;
}

/* ------------------------------------------------------------------ *
 * The confrontation picker (docs/43 §5).
 * ------------------------------------------------------------------ */

export interface PickerClaim {
  hour: Hour;
  /** "at the Odessa at ten", "home at the Delmonico rooms at ten" — where they said they were. */
  label: string;
  /**
   * Round 6, U2: what they said, as a sentence, the same in the book and the CLI: "She said she was
   * home at the Delmonico rooms at ten", never "Grasso says home (the Delmonico rooms) at ten".
   */
  said: string;
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
  const pr = pronOf(c, p);
  for (const col of collisionsOf(c, run, p)) {
    if (landed.has(`${p}@${col.hour}`)) continue;
    const cands = candidateLines(c, run, p, col.hour, lines);
    // docs/55 1d: "home" says which place, where the grid calls it by another name. Round 6, U2: as a
    // clause, "home at the Delmonico rooms at ten", never "home (the Delmonico rooms) at ten".
    const label = `${personOf(c, p)?.home === col.claim.place ? (homeNamed(c, p) ? 'home' : `home at ${placeName(c, col.claim.place ?? '')}`) : `at ${placeName(c, col.claim.place ?? '')}`} at ${hourWord(col.hour)}`;
    claims.push({ hour: col.hour, label, said: `${pr.He} said ${pr.he} was ${label}`, again: false, lines: cands.map((l) => lineChoice(d, p, col.hour, l, false, run)) });
    const b = col.breakers[0];
    if (b) ready.push({ command: `put ${p} ${col.hour} ${b.id}`, label: `${cap(nameOf(c, p))} said ${pr.he} was ${label}. ${cap(factSaid(c, b, p))}.` });
  }
  // A second story, once told, collides with the list where it claims to be.
  for (const put of run.puts.filter((x) => x.person === p && x.landed && !x.again)) {
    const k = confrontationOf(c, p, put.hour);
    const alt = k?.secondLie?.place;
    if (!alt || landedAgain.has(`${p}@${put.hour}`)) continue;
    const at = lines.filter((l) => l.kind === 'list' && l.hour === put.hour && l.place === alt);
    const breaks = at.filter((l) => !l.about.includes(p) && listWhole(d, l));
    if (breaks.length === 0) continue;
    const label = `at ${placeName(c, alt)} at ${hourWord(put.hour)}`;
    claims.push({ hour: put.hour, label, said: `Then ${pr.he} said ${pr.he} was ${label}`, again: true, lines: at.map((l) => lineChoice(d, p, put.hour, l, true, run)) });
    ready.push({ command: `put ${p} ${put.hour} ${(breaks[0] as Line).id} again`, label: `${cap(nameOf(c, p))} then said ${pr.he} was ${label}. ${cap(factSaid(c, breaks[0] as Line, p))}.` });
  }
  if (claims.length === 0) return null;
  return {
    person: p,
    ready: c.tier <= 1 ? ready : [],
    claims: c.tier <= 1 ? [] : claims,
    // docs/64: what you tell them, and what you were told, never "the line that breaks it". Round 6,
    // U1: what to pick, said as what it is: somebody who saw them somewhere else, or everybody at the
    // place they named and not them.
    help:
      c.tier <= 1
        ? `Pick what you’ll tell ${pr.him}.`
        : `Pick the hour where what ${pr.he} told you doesn’t match, then what you’ll tell ${pr.him}: somebody who saw ${pr.him} somewhere else, or somebody who saw everyone at the place ${pr.he} named, and not ${pr.him}.`,
    minutes: callMinutes(d, run),
  };
}

/**
 * The picker's note, as the book and the CLI both say it: how to use it, what it costs, and (round 5,
 * U7) that it isn't needed for the report: what you were told counts there whether you tell them or
 * not, so confronting them is for what they say back. docs/64: in plain words. Round 6, U1 (all four
 * testers: "the report counts it", counts what?): the cost and the choice said outright, no bare "it".
 */
export function pickerNote(d: BoardDeal, pk: Picker): string {
  const pr = pronOf(d.kase, pk.person);
  // Round 7, B7: "You don’t have to: the report takes what proves he lied either way" wasn't quite true:
  // confronting the innocent liar is how you learn who clears them. From Poached up, where an innocent
  // liar can be dealt, it says so; below, there's nobody to clear, and what they say back tells you more.
  const back = d.kase.tier >= 2 ? `${pr.he} may name somebody who can clear ${pr.him}` : `${pr.he} may tell you more`;
  return `${pk.help} Confronting ${pr.him} takes an action and isn’t needed to prove ${pr.he} lied, but ${back}.`;
}

function listWhole(d: BoardDeal, l: Line): boolean {
  const lst = listOf(d.kase, l.speaker as PersonId);
  return !!lst && (lst.entries[l.hour as Hour] ?? []).every((e) => !('other' in e) || (d.kase.others?.find((o) => o.id === e.other)?.known ?? true));
}

/**
 * A ready-made pair's line (Raw and Coddled): what the line says, and nothing worked out from it.
 * Round 5, U9: never "the camel coat was Abramowitz’s", the face matched to a name, which is a
 * deduction the player makes (docs/46 §2); the put itself still says it, once it's read
 * (`breakSaid` with what's asked). With nothing asked, `breakSaid` matches no face.
 */
function factSaid(c: BoardDeal['kase'], l: Line, p: PersonId): string {
  return breakSaid(c, l, p, []);
}

/**
 * A line the player picks to read them (Poached up): as the notebook and the report have it, word
 * for word (round 5, U5 and U9: one wording for a line everywhere it's offered, and never more
 * than it says).
 */
function lineChoice(d: BoardDeal, p: PersonId, h: Hour, l: Line, again: boolean, run: BoardRun): { command: string; label: string; source: string } {
  const c = d.kase;
  return {
    command: `put ${p} ${h} ${l.id}${again ? ' again' : ''}`,
    label: lineShown(c, run, l),
    source: l.kind === 'list' ? `who ${nameOf(c, l.speaker as PersonId)} saw` : l.kind === 'claim' ? `what ${nameOf(c, l.speaker as PersonId)} said` : l.kind === 'given' ? 'the office' : `${nameOf(c, l.speaker as PersonId)}`,
  };
}

/** Whether a put would land, for tests and the oracle. Never shown. */
export function putLands(d: BoardDeal, run: BoardRun, p: PersonId, h: Hour, lineId: string): boolean {
  const l = linesHeld(d.kase, run).find((x) => x.id === lineId);
  return !!l && judgeLine(d.kase, run, p, h, l).landed;
}

export { isMurder, PlaceId };
