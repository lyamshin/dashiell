/**
 * docs/52 §1: the bones, read off the engine's own knowledge. Every
 * proposition here is built from the case's structures (an account's claims,
 * a watcher's entries, a remark's facts, the office's lines by kind), never
 * from the words a page says: the words are flesh, and come after.
 */

import type { GivenLine, Hour, ListEntry, Remark, WatchList } from '../../../gen/board/types.js';
import type { Line } from '../knowledge.js';
import { accountOf, confrontationOf, listExhaustive, listOf, shutAt } from '../knowledge.js';
import { isMurder, type BoardCase, type PersonId, type PlaceId } from '../model.js';
import type { Entry, Prop, Src } from './types.js';
import { remarkStreet } from '../../../gen/board/streets.js';

/** A list entry as a proposition says it: a person's id, `other:<id>`, or `look:<look>`. */
export function entryOf(e: ListEntry): Entry {
  return 'person' in e ? e.person : 'other' in e ? `other:${e.other}` : `look:${e.look}`;
}

/** Whose word a question is: `list:w` a watcher's list, `account:p` their own evening, `confront:p@h` an admission. */
export function srcOfQ(q: string): Src {
  const [kind, rest] = q.split(':') as [string, string];
  if (kind === 'list') return { k: 'list', who: rest };
  if (kind === 'account') return { k: 'claim', who: rest };
  if (kind === 'confront') return { k: 'admit', who: rest.split('@')[0] as string };
  if (kind === 'search') return { k: 'find' };
  return { k: 'given' };
}

/** The suspects whose faces are known (their evening taken), for a list's looks. */
function facesFor(c: BoardCase, es: readonly ListEntry[], asked: readonly string[] | undefined): Record<string, PersonId> | undefined {
  if (!asked) return undefined;
  const out: Record<string, PersonId> = {};
  for (const e of es) {
    if (!('look' in e)) continue;
    const x = c.people.find((p) => p.look === e.look && p.role === 'suspect' && asked.includes(`account:${p.id}`));
    if (x) out[e.look] = x.id;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * A watcher's hour. `whole`: say whether that was everybody (`auto`: the case's own word on it).
 * `asked`: the faces the player can put a name to.
 */
export function listProp(c: BoardCase, watcher: PersonId, h: Hour, o: { whole?: boolean | 'auto'; asked?: readonly string[] } = {}): Prop {
  const l = listOf(c, watcher) as WatchList;
  const es = l.entries[h] ?? [];
  if (shutAt(c, l.place, h)) return { k: 'LIST', watcher, place: l.place, hour: h, people: [], shut: true };
  // Whether that was everybody is said only when it was (a stranger on the list says the rest).
  const whole = o.whole === 'auto' ? listExhaustive(c, l, h) : o.whole;
  const faces = facesFor(c, es, o.asked);
  // (An empty hour is "nobody": that it was everybody goes without saying.)
  return { k: 'LIST', watcher, place: l.place, hour: h, people: es.map(entryOf), ...(whole && es.length ? { whole: true } : {}), ...(faces ? { faces } : {}) } as Prop;
}

/** Somebody's own word for an hour: where (when said), and with whom (when said). */
export function claimProp(c: BoardCase, p: PersonId, h: Hour, o: { place?: boolean; company?: boolean } = { place: true, company: true }): Prop {
  const cl = accountOf(c, p)?.claims[h];
  return {
    k: 'CLAIM',
    person: p,
    ...(o.place !== false && cl ? { place: cl.place } : {}),
    hour: h,
    ...(o.company && cl ? { company: [...cl.company] } : {}),
  } as Prop;
}

/**
 * A remark's propositions. The generator's remarks are a closed few: the side remark (passed
 * somebody on a street, on the way to where they were going: where the two walks cross, the
 * scene's own street when they cross on it), the keeper's (had the pet at their place), the means
 * seen where it was kept, a watcher who came on late, and the handover.
 */
export function remarkProps(c: BoardCase, speaker: PersonId, r: Remark, list?: WatchList): Prop[] {
  if (r.gives?.whereNow) {
    const fence = (c.others ?? []).find((o) => o.id === 'fence');
    return [{ k: 'HANDOVER', to: fence ? `other:${fence.id}` : 'other:somebody', place: list?.place ?? c.crime.whereNow?.place ?? '', hour: c.crime.hour + 1 }];
  }
  // docs/82 (puzzles B): a sighting that it was done by an hour is said in the speaker's own words.
  if (r.done !== undefined) return [];
  const f = r.facts[0];
  if (f && f.k === 'notAt') {
    // docs/65 §1: the street the remark says, where the two walks could cross (the scene's own, where they can).
    const street = remarkStreet(r.text) ?? c.places.find((p) => p.id === c.crime.scene)?.street ?? '';
    const via = accountOf(c, speaker)?.claims[f.h]?.place;
    return [{ k: 'REMARK', speaker, saw: f.p, how: 'passed', where: street, hour: f.h, ...(via ? { via } : {}) }];
  }
  if (f && f.k === 'at') return [{ k: 'REMARK', speaker, saw: f.p, how: 'had', where: f.place, hour: f.h }];
  if (list && list.place === c.means.origin) return [{ k: 'REMARK', speaker, saw: 'means', how: 'there', where: list.place, hour: c.board.hours[0] as Hour }];
  if (list) {
    const from = Math.min(...Object.keys(list.entries).map(Number));
    return [{ k: 'SHIFT', watcher: list.watcher, from }];
  }
  return [];
}

/** A held line, as the propositions it says (the notebook, a put, a repeat, a collision's breaker). */
export function lineProps(c: BoardCase, l: Line, asked?: readonly string[]): Prop[] {
  if (l.kind === 'claim') return [claimProp(c, l.speaker as PersonId, l.hour as Hour)];
  if (l.kind === 'list') return [listProp(c, l.speaker as PersonId, l.hour as Hour, { whole: 'auto', ...(asked ? { asked } : {}) })];
  if (l.kind === 'remark') {
    const [kind, rest] = l.q.split(':') as [string, string];
    const i = Number(l.id.split('#')[1]);
    if (kind === 'account') {
      const r = accountOf(c, rest)?.remarks[i];
      return r ? remarkProps(c, rest, r) : [];
    }
    const lst = listOf(c, rest);
    const r = lst?.remarks[i];
    return r && lst ? remarkProps(c, rest, r, lst) : [];
  }
  if (l.kind === 'given') return [{ k: 'PLACED', person: l.about[0] as PersonId, place: l.place as PlaceId, hour: l.hour as Hour, by: { k: 'given' } }];
  if (l.kind === 'find') return findProps(c, l.id.slice('find:'.length));
  if (l.kind === 'admit') {
    const [p, hs] = l.id.slice('admit:'.length).split('@') as [string, string];
    const k = confrontationOf(c, p, Number(hs));
    const lie = c.lies.find((x) => x.person === p && x.hour === Number(hs));
    return [{ k: 'ADMIT', person: p, place: l.place as PlaceId, hour: Number(hs), ...(k?.names?.[0] ? { witness: k.names[0] } : {}), ...(lie ? { claimed: lie.claim } : {}) }];
  }
  if (l.kind === 'second') return [{ k: 'SECOND', person: l.speaker as PersonId, place: l.place as PlaceId, hour: l.hour as Hour }];
  return [];
}

/** The line a source and an hour name, as one proposition. */
export function lineProp(c: BoardCase, l: Line, asked?: readonly string[]): Prop {
  return lineProps(c, l, asked)[0] as Prop;
}

/**
 * A line as it's said against somebody's claim (`breakSaid`): a list that has them on it says only
 * that; a remark says whom it passed, where and when, not where its speaker was going.
 */
export function breakerProp(c: BoardCase, l: Line, p: PersonId, asked?: readonly string[]): Prop {
  const x = lineProp(c, l, asked);
  if (x.k === 'LIST' && x.people.includes(p)) return { k: 'LIST', watcher: x.watcher, place: x.place, hour: x.hour, people: [p] };
  if (x.k === 'REMARK') {
    const { via: _via, ...rest } = x;
    void _via;
    return rest;
  }
  return x;
}

/** What a search gave: what was searched, and the way in (the means and where it came from) or everybody's reason. */
export function findProps(c: BoardCase, id: string): Prop[] {
  const f = c.finds.find((x) => x.id === id);
  if (!f) return [];
  const out: Prop[] = [{ k: 'FIND', find: f.id, place: f.place }];
  if (f.gives.why) out.push({ k: 'MOTIVE', person: '*' });
  if (f.gives.means) out.push(meansProp(c));
  return out;
}

/** The way in: a murder's origin; the room told about the key; the party; the spare key. */
export function meansProp(c: BoardCase): Prop {
  const mode = c.setup?.means ?? '';
  if (isMurder(c)) return { k: 'MEANS', how: 'origin', place: c.means.origin };
  if (c.givens.lines?.some((g) => g.kind === 'party')) {
    const h0 = c.board.hours[0] as Hour;
    return { k: 'MEANS', how: 'party', place: c.crime.scene, hours: [h0] };
  }
  if (/^told/.test(mode)) return { k: 'MEANS', how: 'told', place: c.means.origin, hours: [...c.means.available] };
  return { k: 'MEANS', how: 'spare', place: c.means.origin };
}

/**
 * The office's way in, as its line says it: the lodger whose key is lost, or who keeps the spare key
 * (the line's own values, by name).
 */
export function meansLineProp(c: BoardCase, g: GivenLine): Prop {
  const x = meansProp(c) as Extract<Prop, { k: 'MEANS' }>;
  const name = g.vars.resident || (/\{Keeper\}|keeps the spare|spare key lives/.test(g.text) || /^spare/.test(g.id) ? g.vars.keeper : '');
  const who = name ? c.people.find((p) => p.short === name)?.id : undefined;
  return who ? { ...x, who } : x;
}

/** The office's guests at its party, as the client's list: who was there, and nobody else. */
function partyProp(c: BoardCase): Prop {
  const h0 = c.board.hours[0] as Hour;
  const guests = c.givens.facts.filter((f) => f.k === 'at' && f.h === h0 && f.place === c.crime.scene).map((f) => f.p);
  return { k: 'LIST', watcher: c.client, place: c.crime.scene, hour: h0, people: guests, ...(guests.length ? { whole: true } : {}) };
}

/**
 * One line of the office, by kind. `motive`: the pointer line says the pointer's reason (every
 * pointer card but "behaviour" does, and "behaviour" does when the reason is said after it).
 */
export function givenProps(c: BoardCase, g: GivenLine, o: { motive?: boolean; aside?: PersonId[] } = {}): Prop[] {
  switch (g.kind) {
    case 'relation':
      return [{ k: 'RELATION', client: c.client, victim: c.crime.victim }];
    case 'found':
      return [{ k: 'FOUND', victim: c.crime.victim, place: c.crime.scene, ...(c.crime.finder ? { finder: c.crime.finder } : {}) }];
    case 'clock':
    case 'window':
      return [{ k: 'WINDOW', hours: [...(c.givens.window ?? c.crime.window)] }];
    case 'venue': {
      const pl = c.givens.points?.find((x) => x.kind === 'place' && /had been at/.test(x.text))?.ref ?? c.means.origin;
      return [{ k: 'POINTER', from: 'office', to: pl, why: 'venue' }];
    }
    case 'pointer': {
      const p = c.givens.pointer as PersonId;
      return [{ k: 'POINTER', from: 'office', to: p, why: 'pointer' }, ...(o.motive ? [{ k: 'MOTIVE', person: p } as Prop] : [])];
    }
    case 'gone':
      return [{ k: 'GONE', thing: c.crime.victim, place: c.crime.scene }];
    case 'party':
      return [partyProp(c)];
    case 'means':
      return [meansLineProp(c, g)];
    case 'keeper': {
      const kp = c.givens.known?.[0];
      return kp ? [{ k: 'POINTER', from: 'office', to: kp, why: 'keeper' }] : [];
    }
    case 'aside':
      return (o.aside ?? []).map((p) => ({ k: 'MOTIVE', person: p }) as Prop);
  }
  return [];
}

/** Canonical form, for comparing two lists of propositions: keys sorted, lists sorted where order isn't said. */
export function canon(p: Prop): string {
  const norm = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(o)
          .filter((k) => o[k] !== undefined)
          .sort()
          .map((k) => [k, k === 'company' || k === 'people' || k === 'evenings' || k === 'lists' || k === 'hours' ? [...(o[k] as unknown[])].map(norm).sort() : norm(o[k])]),
      );
    }
    return x;
  };
  return JSON.stringify(norm(p));
}
