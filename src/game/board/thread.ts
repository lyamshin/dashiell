/**
 * docs/44: the thread. Each page opens on the pointer that sent the detective
 * there, the same one the star showed (`stars.ts`'s `starReason`): the latest
 * thing held that points at the question, or the office. Said as the detective
 * tells it to himself ("Coffin’s list had Ashby here at eleven"), and, where it
 * can't tip anybody off, to the person's face ("Coffin has you here at nine").
 *
 * The hand-off is the other end of the same thread: what this page makes him
 * want next, which is the page's first star.
 */

import { GIVENS, pointerIndex } from '../../gen/board/pointers.js';
import { accountOf, confrontationOf, listOf } from './knowledge.js';
import {
  andList,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  personOf,
  placeName,
  placeOf,
  pronOf,
  victimOf,
  type BoardCase,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';

export interface Pointer {
  /** The question or `givens` that pointed, or `presence` when nothing did and they were simply there. */
  src: string;
  /** The pointer as the detective tells it to himself, lower case, no full stop: "Coffin’s list had Ashby here at eleven". */
  clause: string;
  /** Said to their face, a whole sentence, only where it can't tip them off: "Coffin has you here at nine." */
  face?: string;
  /** The held lines (or `givens:<kind>`) it rests on. */
  refs: string[];
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
}

/** The source the star showed for `q`: the latest thing held that points at it, or the office. */
export function sourceOf(c: BoardCase, asked: readonly string[], q: string): string | null {
  const by = pointerIndex(c).by.get(q);
  if (!by) return null;
  for (let i = asked.length - 1; i >= 0; i--) if (by.has(asked[i] as string)) return asked[i] as string;
  return by.has(GIVENS) ? GIVENS : null;
}

/** "eleven", "eight and nine", or "all evening". */
function hoursSaid(c: BoardCase, hs: Hour[]): string {
  if (hs.length === c.board.hours.length && hs.length > 1) return 'all evening';
  return `at ${andList(hs.map(hourWord))}`;
}

function at(c: BoardCase, place: PlaceId, here: PlaceId): string {
  return place === here ? 'here' : `at ${placeName(c, place)}`;
}

/** The hours of a crime window the office gave: a face reason never names them (a liar would lie around it). */
function windowOf(c: BoardCase): Hour[] {
  return c.givens.window ?? c.crime.window;
}

/**
 * The pointer from `src` to the question `q`, said. `here` is where the
 * detective stands as the page is read.
 */
export function pointerSaid(c: BoardCase, src: string, q: string, here: PlaceId): Pointer | null {
  const [qk, qrest] = q.split(':') as [string, string];
  const [sk, srest] = src.split(':') as [string, string];
  const out = (clause: string, refs: string[], o: Partial<Pointer> = {}): Pointer => ({ src, clause, refs, hours: [], people: [], places: [], ...o });
  if (qk === 'account') {
    const p = qrest as PersonId;
    const P = nameOf(c, p);
    if (sk === 'list') {
      const l = listOf(c, srest);
      if (l) {
        const hs = c.board.hours.filter((h) => (l.entries[h] ?? []).some((e) => 'person' in e && e.person === p));
        if (hs.length > 0) {
          const safe = hs.filter((h) => !windowOf(c).includes(h));
          const W = nameOf(c, l.watcher);
          return out(`${W}’s list had ${P} ${at(c, l.place, here)} ${hoursSaid(c, hs)}`, hs.map((h) => `list:${l.watcher}@${h}`), {
            ...(safe.length > 0 ? { face: `${W} has you ${at(c, l.place, here)} ${hoursSaid(c, safe)}.` } : {}),
            hours: hs,
            people: [p, l.watcher],
            places: [l.place],
          });
        }
        const r = l.remarks.findIndex((x) => x.facts.some((f) => f.p === p) || (x.mentions?.people ?? []).includes(p));
        if (r >= 0) return out(`${nameOf(c, l.watcher)} had mentioned ${P}`, [`remark:list:${l.watcher}#${r}`], { people: [p, l.watcher] });
      }
    }
    if (sk === 'account') {
      const a = accountOf(c, srest);
      if (a) {
        const A = nameOf(c, a.person);
        const pa = pronOf(c, a.person);
        const hs = c.board.hours.filter((h) => a.claims[h]?.company.includes(p));
        if (hs.length > 0) {
          const h0 = [...hs].sort((x, y) => Number(windowOf(c).includes(y)) - Number(windowOf(c).includes(x)) || x - y)[0] as Hour;
          const pl = a.claims[h0]?.place as PlaceId;
          const own = personOf(c, a.person)?.home === pl;
          const where = own ? `${pa.his} place` : at(c, pl, here) === 'here' ? 'here' : placeName(c, pl);
          const safe = hs.filter((h) => !windowOf(c).includes(h) && a.claims[h]?.place === pl);
          return out(`${A} had said ${P} was with ${pa.him} ${where === 'here' ? 'here' : `at ${where}`} at ${hourWord(h0)}`, [`claim:${a.person}@${h0}`], {
            ...(safe.length > 0 ? { face: `${A} says you were with ${pa.him} ${where === 'here' ? 'here' : `at ${where}`} ${hoursSaid(c, safe)}.` } : {}),
            hours: [h0],
            people: [p, a.person],
            places: [pl],
          });
        }
        const r = a.remarks.findIndex((x) => x.facts.some((f) => f.p === p) || (x.mentions?.people ?? []).includes(p));
        if (r >= 0) {
          const rm = a.remarks[r];
          const m = /^Walking over to (.+?) at (\w+) I passed (\S+) on (.+?), (.+?)\.$/.exec(rm?.text ?? '');
          if (m) {
            const h = rm?.facts[0]?.h as Hour;
            return out(`${A} had passed ${P} on ${m[4]} at ${m[2]}, ${m[5]}`, [`remark:account:${a.person}#${r}`], { hours: [h], people: [p, a.person] });
          }
          return out(`${A} had mentioned ${P}`, [`remark:account:${a.person}#${r}`], { people: [p, a.person] });
        }
      }
    }
    if (sk === 'confront') {
      const [x, hs] = srest.split('@') as [string, string];
      const h = Number(hs) as Hour;
      const lie = c.lies.find((l) => l.person === x && l.hour === h);
      const X = nameOf(c, x);
      if (lie) {
        return out(`${X} had named ${P}: ${placeName(c, lie.truth)} at ${hourWord(h)}, the two of them`, [`admit:${x}@${h}`], { hours: [h], people: [p, x], places: [lie.truth] });
      }
      return out(`${X} had named ${P}`, [], { people: [p, x] });
    }
    if (sk === 'search') {
      const f = c.finds.find((x) => x.id === srest);
      return out(`${f?.what ?? 'the room'} had named ${P}`, [`find:${srest}`], { people: [p] });
    }
    if (src === GIVENS) return givenPointer(c, p, here);
  }

  if (qk === 'list') {
    const l = listOf(c, qrest);
    if (!l) return null;
    const L = l.place;
    if (sk === 'search') {
      if (isMurder(c)) return out(`the ${c.means.name.replace(/^(a|an) /, '')} had come from ${at(c, L, here)}`, [`find:${srest}`], { places: [L] });
      return out(`the way in at ${placeName(c, c.crime.scene)} had been learnt ${at(c, L, here)}`, [`find:${srest}`], { places: [L, c.crime.scene] });
    }
    if (sk === 'account') {
      const a = accountOf(c, srest);
      const hs = c.board.hours.filter((h) => a?.claims[h]?.place === L);
      if (a && hs.length > 0) {
        const A = nameOf(c, a.person);
        return out(`${A} had said ${pronOf(c, a.person).he} was ${at(c, L, here)} ${hoursSaid(c, hs)}`, hs.map((h) => `claim:${a.person}@${h}`), { hours: hs, people: [a.person], places: [L] });
      }
      if (a) return out(`${nameOf(c, a.person)} had mentioned ${placeName(c, L)}`, [], { people: [a.person], places: [L] });
    }
    if (sk === 'list') return out(`${nameOf(c, srest)} had mentioned ${placeName(c, L)}`, [], { people: [srest], places: [L] });
    if (sk === 'confront') {
      const [x, hs] = srest.split('@') as [string, string];
      const h = Number(hs) as Hour;
      const k = confrontationOf(c, x, h);
      const X = nameOf(c, x);
      if (k?.secondLie?.place === L) return out(`${X}’s second story had ${pronOf(c, x).him} ${at(c, L, here)} at ${hourWord(h)}`, [`second:${x}@${h}`], { hours: [h], people: [x], places: [L] });
      return out(`${X} had owned up to ${placeName(c, L)}`, [`admit:${x}@${h}`], { people: [x], places: [L] });
    }
    if (src === GIVENS) return givenPlace(c, L, here);
  }

  if (qk === 'search') {
    const f = c.finds.find((x) => x.id === qrest);
    if (f?.gives.why) return out(`the report wanted a why, and a man’s papers are where he keeps the people who wanted something from him`, ['givens:found'], { places: [f.place] });
    if (isMurder(c)) return out(`${victimOf(c).short} had died ${at(c, c.crime.scene, here)}`, ['givens:found'], { people: [c.crime.victim], places: [c.crime.scene] });
    return out(`${victimOf(c).short} had gone from ${at(c, c.crime.scene, here)}`, ['givens:gone'], { places: [c.crime.scene] });
  }

  if (qk === 'confront') {
    const [p, hs] = qrest.split('@') as [string, string];
    const h = Number(hs) as Hour;
    return out(`${nameOf(c, p)}’s ${hourWord(h)} o’clock had something held against it`, [`claim:${p}@${h}`], { hours: [h], people: [p] });
  }
  return null;
}

/** The office, pointing at a person. */
function givenPointer(c: BoardCase, p: PersonId, here: PlaceId): Pointer {
  const P = nameOf(c, p);
  const cl = clientOf(c).short;
  const cp = pronOf(c, c.client);
  const base = (clause: string, refs: string[], extra: Partial<Pointer> = {}): Pointer => ({ src: GIVENS, clause, refs, hours: [], people: [p], places: [], ...extra });
  const lines = c.givens.lines ?? [];
  if (c.givens.pointer === p) {
    const pl = lines.find((g) => g.kind === 'pointer');
    const behaviour = pl?.vars.behaviour;
    if (behaviour) return base(`${cl} had pointed me at ${P}, who ${behaviour.replace(new RegExp(`\\b${cl}’s\\b`, 'g'), cp.his)}`, ['givens:pointer'], { people: [p, c.client] });
    return base(`${cl} had pointed me at ${P}`, ['givens:pointer'], { people: [p, c.client] });
  }
  if (c.crime.finder === p) return base(`${P} had found ${victimOf(c).short}`, ['givens:found'], { people: [p, c.crime.victim] });
  if (c.givens.access.includes(p)) return base(`${P} lodged at ${at(c, c.crime.scene, here) === 'here' ? 'the flat' : placeName(c, c.crime.scene)}`, ['givens:means']);
  if ((c.givens.known ?? []).includes(p)) {
    const k = lines.find((g) => g.kind === 'keeper');
    const verb = k?.id === 'borrows' ? `borrowed ${victimOf(c).short} most evenings` : k?.id === 'looks-in' ? `looked in on ${victimOf(c).short} of an evening` : `minded ${victimOf(c).short} when ${cl} was out`;
    return base(`${cl} had said ${P} ${verb}`, ['givens:keeper'], { people: [p, c.client] });
  }
  const f = c.givens.facts.find((x) => x.k === 'at' && x.p === p);
  if (f) {
    const party = lines.find((g) => g.kind === 'party')?.vars;
    if (party && f.place === c.crime.scene) return base(`${P} had been at ${cl}’s at ${hourWord(f.h)}, for the ${party.occasion}`, ['givens:party'], { hours: [f.h], people: [p, c.client] });
    return base(`${cl} had put ${P} at ${placeName(c, f.place)} at ${hourWord(f.h)}`, ['givens:facts'], { hours: [f.h], places: [f.place], people: [p, c.client] });
  }
  return base(`${cl} had named ${P}`, ['givens:pointer'], { people: [p, c.client] });
}

/** The office, pointing at a place. */
function givenPlace(c: BoardCase, L: PlaceId, here: PlaceId): Pointer {
  const cl = clientOf(c).short;
  const cp = pronOf(c, c.client);
  const base = (clause: string, refs: string[], extra: Partial<Pointer> = {}): Pointer => ({ src: GIVENS, clause, refs, hours: [], people: [], places: [L], ...extra });
  const lines = c.givens.lines ?? [];
  const means = lines.find((g) => g.kind === 'means');
  const mode = c.setup?.means ?? '';
  if (/^told/.test(mode)) {
    const what = mode === 'told-window' ? `${cp.his} parlour window` : `${cp.his} key`;
    return base(`${cl} had sat ${at(c, L, here)} telling the room about ${what}`, ['givens:means'], { people: [c.client] });
  }
  if (/^spare/.test(mode)) return base(`the spare key hung ${at(c, L, here)}`, ['givens:means']);
  if (lines.some((g) => g.kind === 'venue') && isMurder(c)) return base(`${victimOf(c).short} had been ${at(c, L, here)} earlier in the evening`, ['givens:venue'], { people: [c.crime.victim] });
  const f = c.givens.facts.find((x) => x.k === 'at' && x.place === L);
  if (f) return base(`${cl} had put ${nameOf(c, f.p)} ${at(c, L, here)} at ${hourWord(f.h)}`, ['givens:facts'], { hours: [f.h], people: [f.p, c.client] });
  void means;
  return base(`${cl} had named ${placeName(c, L)}`, ['givens:means'], { people: [c.client] });
}

/**
 * The pointer that sent the detective to `q`, from what was held before the
 * page: the same source the star showed. When nothing points (a wanderer's
 * question), the plain truth: they were in the room.
 */
export function threadFor(c: BoardCase, before: Pick<BoardRun, 'asked'>, q: string, here: PlaceId): Pointer {
  const src = sourceOf(c, before.asked, q);
  const said = src ? pointerSaid(c, src, q, here) : null;
  if (said) return said;
  const [qk, qrest] = q.split(':') as [string, string];
  if (qk === 'account' || qk === 'list' || qk === 'motive') {
    const P = nameOf(c, qrest);
    const pr = pronOf(c, qrest);
    return {
      src: 'presence',
      clause: qk === 'list' ? `${P} had been ${here === personOf(c, qrest)?.foundAt ? 'here' : 'there'} all night, and nobody had asked ${pr.him} yet` : `${P} was in the room, and I hadn’t heard from ${pr.him} yet`,
      refs: [],
      hours: [],
      people: [qrest],
      places: [],
    };
  }
  return { src: 'presence', clause: '', refs: [], hours: [], people: [], places: [] };
}

/**
 * Why the detective walked into a place: the pointers to the questions that
 * wait there, from what's held, the starred one first. Up to two, joined, as
 * the golden's Delmonico rooms join three earlier lines.
 */
export function placeThread(c: BoardCase, before: Pick<BoardRun, 'asked'>, place: PlaceId, starred: readonly string[], here: PlaceId): Pointer[] {
  const idx = pointerIndex(c);
  const qs = [...idx.questions.values()].filter((q) => q.at === place && !before.asked.includes(q.id) && q.kind !== 'confront');
  qs.sort((a, b) => Number(starred.includes(b.id)) - Number(starred.includes(a.id)) || order(a.kind) - order(b.kind));
  const out: Pointer[] = [];
  const seen = new Set<string>();
  const take = (src: string, q: string) => {
    if (out.length >= 2) return;
    const p = pointerSaid(c, src, q, here);
    if (!p || !p.clause || seen.has(p.clause)) return;
    // Two pointers from the office say the same office twice: one is enough.
    if (src === GIVENS && out.some((x) => x.src === GIVENS)) return;
    seen.add(p.clause);
    out.push(p);
  };
  // The star's own reason first: the latest thing held that points into this room.
  for (const q of qs) {
    const src = sourceOf(c, before.asked, q.id);
    if (src) {
      take(src, q.id);
      break;
    }
  }
  // Then the other lines held that point here, latest first, and the office: the golden's Delmonico rooms join three.
  for (const q of qs) {
    const by = idx.by.get(q.id);
    if (!by) continue;
    for (let i = before.asked.length - 1; i >= 0; i--) if (by.has(before.asked[i] as string)) take(before.asked[i] as string, q.id);
    if (by.has(GIVENS)) take(GIVENS, q.id);
  }
  return out;
  function order(k: string): number {
    return k === 'list' ? 0 : k === 'search' ? 1 : 2;
  }
}

export { cap, placeOf };
