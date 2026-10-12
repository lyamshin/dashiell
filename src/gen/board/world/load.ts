/**
 * docs/48 §1: reading the bible, and refusing a bad one loudly.
 *
 * `parseBible` takes the two files as they are in `content/neighbourhood/` and
 * returns the bible, or throws one error that lists every problem, each with the
 * entry it's in ("people[rafferty].ties[1]: Sokol has no tie back"). The checks:
 *
 * - every field is there, of the right shape, with values the engine knows
 *   (place kinds, manners, tie kinds, hour bands, weathers);
 * - ids are unique, and every id a place or a person names exists;
 * - the walking minutes are a whole table, the same both ways;
 * - ties are mutual, with the other end's kind (a lodger's landlady);
 * - no two people share a first name or a job;
 * - a watcher lives or works where they watch, and a gag lives at one place;
 * - the places cover what the generator casts a night from (`coverage`).
 */

import {
  TIE_BACK,
  TIE_KINDS,
  WORLD_KINDS,
  WORLD_MANNERS,
  type Bible,
  type BiblePerson,
  type BiblePlace,
} from './types.js';
import { meansOfDetail } from './means.js';

const BANDS = ['early', 'mid', 'late'];
const WEATHERS = ['rain', 'cold', 'clear', 'any'];
const DETAIL_KINDS = ['prop', 'habit', 'gag'];
const AGES = ['20s', '30s', '40s', '50s', '60s'];

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const isHour = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 24;

/** Structural checks, then the cross-checks. Every problem, not the first. */
export function bibleProblems(placesJson: unknown, peopleJson: unknown, opts: { coverage?: boolean } = {}): string[] {
  const out: string[] = [];
  const err = (where: string, what: string) => out.push(`${where}: ${what}`);
  const places = isObj(placesJson) && Array.isArray(placesJson.places) ? (placesJson.places as unknown[]) : null;
  const people = isObj(peopleJson) && Array.isArray(peopleJson.people) ? (peopleJson.people as unknown[]) : null;
  if (!places) err('places.json', 'wants { "places": [ … ] }');
  if (!people) err('people.json', 'wants { "people": [ … ] }');
  if (!places || !people) return out;

  const placeIds = new Set<string>();
  const personIds = new Set<string>();
  places.forEach((p, i) => {
    const id = isObj(p) && isStr(p.id) ? p.id : `#${i}`;
    if (isObj(p) && isStr(p.id)) {
      if (placeIds.has(p.id)) err(`places[${id}]`, 'the id is used twice');
      placeIds.add(p.id);
    }
  });
  people.forEach((p, i) => {
    const id = isObj(p) && isStr(p.id) ? p.id : `#${i}`;
    if (isObj(p) && isStr(p.id)) {
      if (personIds.has(p.id) || placeIds.has(p.id)) err(`people[${id}]`, personIds.has(p.id) ? 'the id is used twice' : 'the id is also a place’s');
      personIds.add(p.id);
    }
  });

  // --- Places ---------------------------------------------------------------------------------
  places.forEach((raw, i) => {
    const id = isObj(raw) && isStr(raw.id) ? raw.id : `#${i}`;
    const at = `places[${id}]`;
    if (!isObj(raw)) return err(at, 'is not an object');
    if (!isStr(raw.id)) err(at, 'has no id');
    if (!isStr(raw.name)) err(at, 'has no name');
    if (!WORLD_KINDS.includes(raw.kind as never)) err(at, `kind "${String(raw.kind)}" is not one of ${WORLD_KINDS.join(', ')}`);
    if (!isStr(raw.street)) err(at, 'has no street');
    if (typeof raw.number !== 'number') err(at, 'has no number');
    if (raw.hours !== null) {
      if (!isObj(raw.hours) || !isHour(raw.hours.open) || !isHour(raw.hours.close)) err(`${at}.hours`, 'wants { open, close } in clock hours, or null');
    }
    if (raw.watcher !== null) {
      const w = raw.watcher;
      if (!isObj(w)) err(`${at}.watcher`, 'wants an object or null');
      else {
        if (!isStr(w.person)) err(`${at}.watcher`, 'names nobody');
        else if (!personIds.has(w.person)) err(`${at}.watcher`, `"${w.person}" is not a person`);
        for (const k of ['counts', 'sees', 'blind']) if (!isStr(w[k])) err(`${at}.watcher`, `has no ${k}`);
      }
    }
    if (!isObj(raw.minutes)) err(`${at}.minutes`, 'wants a table of minutes to every other place');
    else {
      for (const [to, m] of Object.entries(raw.minutes)) {
        if (!placeIds.has(to)) err(`${at}.minutes`, `"${to}" is not a place`);
        if (to === raw.id) err(`${at}.minutes`, 'has a walk to itself');
        if (typeof m !== 'number' || !(m > 0) || m > 60) err(`${at}.minutes.${to}`, `${String(m)} is not a walk in minutes (1–60)`);
      }
    }
    if (!Array.isArray(raw.arrivals) || raw.arrivals.length === 0) err(`${at}.arrivals`, 'wants at least one');
    else
      raw.arrivals.forEach((a, j) => {
        if (!isObj(a) || !BANDS.includes(a.band as string) || !WEATHERS.includes(a.weather as string) || !isStr(a.text)) err(`${at}.arrivals[${j}]`, 'wants { band: early|mid|late, weather: rain|cold|clear|any, text }');
      });
    if (!Array.isArray(raw.details)) err(`${at}.details`, 'wants a list');
    else {
      const seen = new Set<string>();
      raw.details.forEach((d, j) => {
        if (!isObj(d) || !isStr(d.id) || !DETAIL_KINDS.includes(d.kind as string) || !isStr(d.text)) return err(`${at}.details[${j}]`, 'wants { id, kind: prop|habit|gag, text }');
        if (seen.has(d.id)) err(`${at}.details[${d.id}]`, 'the id is used twice');
        seen.add(d.id);
      });
    }
    if (!Array.isArray(raw.hides) || raw.hides.some((h) => !isStr(h))) err(`${at}.hides`, 'wants a list of strings');
  });

  // --- People ---------------------------------------------------------------------------------
  const firsts = new Map<string, string>();
  const jobs = new Map<string, string>();
  // Two people with one first name or one job: said with the cross-checks, whose shape holds.
  const dupes: string[] = [];
  people.forEach((raw, i) => {
    const id = isObj(raw) && isStr(raw.id) ? raw.id : `#${i}`;
    const at = `people[${id}]`;
    if (!isObj(raw)) return err(at, 'is not an object');
    for (const k of ['first', 'last', 'job', 'home']) if (!isStr(raw[k])) err(at, `has no ${k}`);
    if (raw.honorific !== null && !isStr(raw.honorific)) err(at, 'honorific wants a string or null');
    if (raw.gender !== 'f' && raw.gender !== 'm') err(at, 'gender wants f or m');
    if (!AGES.includes(raw.age as string)) err(at, `age wants one of ${AGES.join(', ')}`);
    if (isStr(raw.home) && !placeIds.has(raw.home)) err(at, `home "${raw.home}" is not a place`);
    if (raw.works !== null) {
      const w = raw.works;
      if (!isObj(w) || !isStr(w.place) || !isHour(w.open) || !isHour(w.close)) err(`${at}.works`, 'wants { place, open, close } or null');
      else if (!placeIds.has(w.place)) err(`${at}.works`, `"${w.place}" is not a place`);
    }
    if (!WORLD_MANNERS.includes(raw.manner as never)) err(at, `manner "${String(raw.manner)}" is not one of ${WORLD_MANNERS.join(', ')}`);
    if (!Array.isArray(raw.doing) || raw.doing.length === 0 || raw.doing.some((d) => !isStr(d))) err(`${at}.doing`, 'wants at least one line');
    if (!Array.isArray(raw.looks) || raw.looks.length === 0) err(`${at}.looks`, 'wants at least one');
    else
      raw.looks.forEach((l, j) => {
        if (!isObj(l) || !isStr(l.setting) || !isStr(l.text)) return err(`${at}.looks[${j}]`, 'wants { setting, text }');
        if (l.setting !== 'any' && !placeIds.has(l.setting)) err(`${at}.looks[${j}]`, `setting "${l.setting}" is not a place or "any"`);
      });
    const v = raw.voice;
    if (!isObj(v)) err(`${at}.voice`, 'is missing');
    else {
      for (const k of ['ask', 'deflect', 'nobodyElse', 'refuse', 'ownUp']) if (!Array.isArray(v[k]) || (v[k] as unknown[]).some((x) => !isStr(x))) err(`${at}.voice.${k}`, 'wants a list of lines');
      if (!isObj(v.hours)) err(`${at}.voice.hours`, 'wants { "<hour>": "line" }');
      else for (const [h, line] of Object.entries(v.hours)) if (!/^\d{1,2}$/.test(h) || !isStr(line)) err(`${at}.voice.hours.${h}`, 'wants an hour and a line');
    }
    if (!Array.isArray(raw.ties)) err(`${at}.ties`, 'wants a list');
    else
      raw.ties.forEach((t, j) => {
        if (!isObj(t) || !isStr(t.to) || !isStr(t.line)) return err(`${at}.ties[${j}]`, 'wants { to, kind, line }');
        if (!TIE_KINDS.includes(t.kind as never)) err(`${at}.ties[${j}]`, `kind "${String(t.kind)}" is not one of ${TIE_KINDS.join(', ')}`);
        if (!personIds.has(t.to)) err(`${at}.ties[${j}]`, `"${t.to}" is not a person`);
        if (t.to === raw.id) err(`${at}.ties[${j}]`, 'is a tie to themselves');
      });
    if (!Array.isArray(raw.secrets)) err(`${at}.secrets`, 'wants a list');
    else
      raw.secrets.forEach((s, j) => {
        if (!isObj(s) || !isStr(s.text) || !isStr(s.place)) return err(`${at}.secrets[${j}]`, 'wants { text, place }');
        if (!placeIds.has(s.place)) err(`${at}.secrets[${j}]`, `place "${s.place}" is not a place`);
      });
    if (!isObj(raw.asVictim) || !isStr(raw.asVictim.why) || !isStr(raw.asVictim.foundWith)) err(`${at}.asVictim`, 'wants { why, foundWith }');
    if (isStr(raw.first)) {
      const other = firsts.get(raw.first);
      if (other) dupes.push(`${at}: shares the first name ${raw.first} with ${other}`);
      firsts.set(raw.first, id);
    }
    if (isStr(raw.job)) {
      const j = raw.job.trim().toLowerCase();
      const other = jobs.get(j);
      if (other) dupes.push(`${at}: shares the job "${raw.job}" with ${other}`);
      jobs.set(j, id);
    }
  });
  if (out.length > 0) return [...out, ...dupes];
  out.push(...dupes);

  // --- Cross-checks, on a bible whose shape holds -----------------------------------------------
  const b = { name: '', places: places as BiblePlace[], people: people as BiblePerson[] };
  out.push(...crossProblems(b));
  if (opts.coverage !== false) out.push(...coverage(b));
  return out;
}

function crossProblems(b: Bible): string[] {
  const out: string[] = [];
  const person = new Map(b.people.map((p) => [p.id, p]));
  // Minutes: every other place, the same both ways.
  for (const p of b.places) {
    for (const q of b.places) {
      if (p.id === q.id) continue;
      const m = p.minutes[q.id];
      if (m === undefined) out.push(`places[${p.id}].minutes: no walk to ${q.id}`);
      else if (q.minutes[p.id] !== undefined && q.minutes[p.id] !== m && p.id < q.id) out.push(`places[${p.id}].minutes.${q.id}: ${m}, but places[${q.id}].minutes.${p.id} is ${q.minutes[p.id]}`);
    }
  }
  // A watcher lives or works where they watch, and watches one place.
  const watching = new Map<string, string>();
  for (const p of b.places) {
    if (!p.watcher) continue;
    const w = person.get(p.watcher.person) as BiblePerson;
    if (w.home !== p.id && w.works?.place !== p.id) out.push(`places[${p.id}].watcher: ${w.id} neither lives nor works there`);
    const other = watching.get(w.id);
    if (other) out.push(`places[${p.id}].watcher: ${w.id} already watches ${other}`);
    watching.set(w.id, p.id);
  }
  // A gag lives at one place only.
  const gags = new Map<string, string>();
  for (const p of b.places) {
    for (const d of p.details) {
      if (d.kind !== 'gag') continue;
      const key = d.text.trim().toLowerCase();
      const other = gags.get(key);
      if (other) out.push(`places[${p.id}].details[${d.id}]: the same gag is at ${other}`);
      gags.set(key, p.id);
    }
  }
  // Ties: mutual, with the other end's kind.
  for (const p of b.people) {
    const seen = new Set<string>();
    p.ties.forEach((t, j) => {
      if (seen.has(t.to)) out.push(`people[${p.id}].ties[${j}]: a second tie to ${t.to}`);
      seen.add(t.to);
      const q = person.get(t.to) as BiblePerson;
      const back = q.ties.find((x) => x.to === p.id);
      if (!back) out.push(`people[${p.id}].ties[${j}]: ${t.to} has no tie back to ${p.id}`);
      else if (back.kind !== TIE_BACK[t.kind]) out.push(`people[${p.id}].ties[${j}]: ${t.kind} to ${t.to}, but ${t.to} has ${back.kind} back (wants ${TIE_BACK[t.kind]})`);
    });
  }
  return out;
}

/**
 * docs/48 §1: what the generator needs. A night casts from these, and without one of them some
 * tier or case type can't be built. Each missing thing is named.
 */
export function coverage(b: Pick<Bible, 'places' | 'people'>): string[] {
  const out: string[] = [];
  const venues = b.places.filter((p) => ['bar', 'club', 'restaurant', 'theatre'].includes(p.kind) && p.watcher);
  if (venues.length < 2) out.push(`coverage: wants two watched night places (a bar with a barman, a club with a doorkeeper, a theatre with an usher); has ${venues.length}`);
  const homes = b.places.filter((p) => p.kind === 'home' && p.watcher);
  if (homes.length < 1) out.push('coverage: wants a watched home (a rooming house with a landlady, flats with a janitor)');
  if (!homes.some((p) => p.details.some((d) => meansOfDetail(d)))) out.push('coverage: wants a watched home with a means among its details (the landlady’s chloral, the hall-stand revolver)');
  const work = b.places.filter((p) => p.kind === 'work' && p.watcher && p.hours);
  if (!work.some((p) => p.details.some((d) => meansOfDetail(d)))) out.push('coverage: wants a workplace with hours, a watcher and a means among its details (the dentist’s cabinet, the pawnshop’s revolver)');
  const hidden = b.places.filter((p) => (p.kind !== 'home' && !p.watcher) || p.hides.length > 0);
  if (hidden.length < 1) out.push('coverage: wants somewhere unwatched to keep a secret (a card room, an Automat, a back room)');
  // Private flats nobody watches: the scene is one, and from Medium up the culprit's own is another
  // (each flat is its own place on the board, whichever building it's in).
  const flats = b.places.filter((p) => p.kind === 'home' && !p.watcher);
  const residents = b.people.filter((x) => flats.some((f) => f.id === x.home));
  if (flats.length < 1) out.push('coverage: wants private flats nobody watches (the scene, and a flat to claim at Medium)');
  else if (residents.length < 3) out.push(`coverage: wants at least three people living in private flats nobody watches (a dead man, an owner, a culprit with a flat of their own); has ${residents.length}`);
  else if (!residents.some((x) => x.gender === 'm')) out.push('coverage: wants a man living in a private flat nobody watches, to be the dead man');
  return out;
}

/** The bible, or one loud error naming every entry that's wrong. */
export function parseBible(name: string, placesJson: unknown, peopleJson: unknown, opts: { coverage?: boolean } = {}): Bible {
  const problems = bibleProblems(placesJson, peopleJson, opts);
  if (problems.length > 0) throw new Error(`The ${name} bible doesn’t hold (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n  ${problems.join('\n  ')}`);
  return { name, places: (placesJson as { places: BiblePlace[] }).places, people: (peopleJson as { people: BiblePerson[] }).people };
}
