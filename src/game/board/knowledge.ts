/**
 * docs/43 §4–§5: what the player holds, read off the questions asked.
 *
 * Every answer is a handful of lines: one an hour of a whole account, one an
 * hour of a watcher's list, a remark, a find, an admission or a second story.
 * The grid is built from these lines and nothing else; a confrontation puts
 * one of them against one of a person's claims; the solver (docs/42) says
 * what they add up to. The truth is never read here, only the case's
 * statements and the questions the player asked.
 */

import { solve, type Solved } from '../../gen/board/solver.js';
import { techniquesUpTo } from '../../gen/board/tiers.js';
import type { Account, Claim, Confrontation, Fact, ListEntry, Remark, WatchList } from '../../gen/board/types.js';
import {
  OFFICE,
  andList,
  cap,
  isMurder,
  nameOf,
  oclock,
  personOf,
  placeName,
  pronOf,
  solverHeld,
  suspectsOf,
  type BoardCase,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';

/** One thing the player holds, at the grain a confrontation reads it. */
export interface Line {
  id: string;
  /** The question it came from, or `givens`. */
  q: string;
  kind: 'claim' | 'list' | 'remark' | 'find' | 'admit' | 'second' | 'given';
  /** Whose claim, whose list, who said the remark. */
  speaker?: PersonId;
  hour?: Hour;
  place?: PlaceId;
  /** The people the line puts somewhere, or says weren't there. */
  about: PersonId[];
  /** The line, plainly, as the notebook and the picker say it. */
  text: string;
}

const SOLVED = new Map<string, Solved>();

/** The solver on what's held, at the tier's techniques. Cached: the book asks often. */
export function solveHeld(c: BoardCase, held: readonly string[]): Solved {
  const key = `${c.id}|${[...held].sort().join(',')}`;
  let s = SOLVED.get(key);
  if (!s) {
    s = solve(c, held, { techniques: techniquesUpTo(c.tier) });
    if (SOLVED.size > 400) SOLVED.delete(SOLVED.keys().next().value as string);
    SOLVED.set(key, s);
  }
  return s;
}

export function solveRun(c: BoardCase, run: Pick<BoardRun, 'asked'>): Solved {
  return solveHeld(c, solverHeld(run));
}

/* ------------------------------------------------------------------ *
 * The lines.
 * ------------------------------------------------------------------ */

export function accountOf(c: BoardCase, p: PersonId): Account | undefined {
  return c.accounts.find((a) => a.person === p);
}

export function listOf(c: BoardCase, watcher: PersonId): WatchList | undefined {
  return c.lists.find((l) => l.watcher === watcher);
}

export function confrontationOf(c: BoardCase, p: PersonId, h: Hour): Confrontation | undefined {
  return c.confrontations.find((k) => k.person === p && k.hour === h);
}

/** What a list entry is called: a name, a face, or somebody who isn't on the board. */
export function entryName(c: BoardCase, e: ListEntry): string {
  if ('person' in e) return nameOf(c, e.person);
  if ('other' in e) return c.others?.find((o) => o.id === e.other)?.name ?? e.other;
  return `somebody ${e.look} I didn’t know`;
}

/** Whether a watcher's hour is exhaustive: no stranger the watcher couldn't name. */
export function listExhaustive(c: BoardCase, l: WatchList, h: Hour): boolean {
  return (l.entries[h] ?? []).every((e) => !('other' in e) || (c.others?.find((o) => o.id === e.other)?.known ?? true));
}

/** Whether the watcher's place is shut at that hour (a surgery after hours). */
export function shutAt(c: BoardCase, place: PlaceId, h: Hour): boolean {
  const p = c.places.find((x) => x.id === place);
  return !!p && (h < p.open[0] || h > p.open[1]);
}

export function claimText(c: BoardCase, p: PersonId, h: Hour, cl: Claim): string {
  const pr = pronOf(c, p);
  const comp = cl.company.map((x) => nameOf(c, x));
  return `${nameOf(c, p)} says ${pr.he} was at ${placeName(c, cl.place)} at ${oclock(h)}, ${comp.length ? `with ${andList(comp)}` : `on ${pr.his} own`}.`;
}

export function listText(c: BoardCase, l: WatchList, h: Hour): string {
  const es = l.entries[h] ?? [];
  const where = placeName(c, l.place);
  if (shutAt(c, l.place, h)) return `${nameOf(c, l.watcher)}: ${where} was shut at ${oclock(h)}.`;
  if (es.length === 0) return `${nameOf(c, l.watcher)}: nobody at ${where} at ${oclock(h)}.`;
  const names = es.map((e) => entryName(c, e));
  return `${nameOf(c, l.watcher)}: at ${where} at ${oclock(h)}, ${andList(names)}${listExhaustive(c, l, h) ? ', and nobody else' : ''}.`;
}

function remarkFacts(r: Remark): Fact[] {
  return r.facts;
}

/** Every line the player holds, in the order it came. */
export function linesHeld(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>): Line[] {
  const out: Line[] = [];
  const hours = c.board.hours;
  // The office's hard facts: who was at the party.
  c.givens.facts.forEach((f, i) => {
    if (f.k !== 'at') return;
    out.push({
      id: `given#${i}`,
      q: 'givens',
      kind: 'given',
      hour: f.h,
      place: f.place,
      about: [f.p],
      text: `The office: ${nameOf(c, f.p)} was at ${placeName(c, f.place)} at ${oclock(f.h)}.`,
    });
  });
  for (const q of run.asked) {
    const [kind, rest] = q.split(':') as [string, string];
    if (kind === 'account') {
      const a = accountOf(c, rest);
      if (!a) continue;
      for (const h of hours) {
        const cl = a.claims[h];
        if (!cl) continue;
        out.push({ id: `claim:${rest}@${h}`, q, kind: 'claim', speaker: rest, hour: h, place: cl.place, about: [rest, ...cl.company], text: claimText(c, rest, h, cl) });
      }
      a.remarks.forEach((r, i) => out.push(remarkLine(c, q, rest, r, i)));
    } else if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      if (!l) continue;
      for (const h of hours) {
        if (!l.entries[h]) continue;
        const about = (l.entries[h] ?? []).flatMap((e) => ('person' in e ? [e.person] : []));
        out.push({ id: `list:${rest}@${h}`, q, kind: 'list', speaker: rest, hour: h, place: l.place, about, text: listText(c, l, h) });
      }
      l.remarks.forEach((r, i) => out.push(remarkLine(c, q, rest, r, i)));
    } else if (kind === 'search') {
      const f = c.finds.find((x) => x.id === rest);
      if (!f) continue;
      out.push({ id: `find:${rest}`, q, kind: 'find', place: f.place, about: [], text: `${cap(f.what)} at ${placeName(c, f.place)}: ${f.text}` });
    } else if (kind === 'confront') {
      const [p, hs] = rest.split('@') as [string, string];
      const h = Number(hs);
      const k = confrontationOf(c, p, h);
      if (!k) continue;
      const lie = c.lies.find((l) => l.person === p && l.hour === h);
      if (k.response === 'admit' && lie) {
        const y = (k.names ?? []).map((x) => nameOf(c, x));
        out.push({ id: `admit:${p}@${h}`, q, kind: 'admit', speaker: p, hour: h, place: lie.truth, about: [p], text: `${nameOf(c, p)} owns up: ${placeName(c, lie.truth)} at ${oclock(h)}${y.length ? `, with ${andList(y)}` : ''}.` });
      }
      if (k.secondLie?.place) {
        out.push({ id: `second:${p}@${h}`, q, kind: 'second', speaker: p, hour: h, place: k.secondLie.place, about: [p], text: `${nameOf(c, p)} now says ${pronOf(c, p).he} was at ${placeName(c, k.secondLie.place)} at ${oclock(h)}.` });
      }
    }
  }
  return out;
}

function remarkLine(c: BoardCase, q: string, speaker: PersonId, r: Remark, i: number): Line {
  const fs = remarkFacts(r);
  const f = fs[0];
  return {
    id: `remark:${q}#${i}`,
    q,
    kind: 'remark',
    speaker,
    ...(f ? { hour: f.h, place: f.place } : {}),
    about: fs.map((x) => x.p),
    text: `${nameOf(c, speaker)}: “${r.text}”`,
  };
}

/* ------------------------------------------------------------------ *
 * Who and where the player knows of.
 * ------------------------------------------------------------------ */

/**
 * People the player has heard of: the office's, everyone an answer names, and
 * everyone met in a room. Company-only witnesses appear only once named.
 */
export function knownPeople(c: BoardCase, run: Pick<BoardRun, 'asked' | 'visited'>): Set<PersonId> {
  const out = new Set<PersonId>();
  const add = (p: PersonId | undefined) => {
    if (p && personOf(c, p)) out.add(p);
  };
  add(c.client);
  add(c.crime.victim);
  add(c.givens.pointer);
  if (isMurder(c)) add(c.crime.finder);
  for (const p of c.givens.access) add(p);
  for (const p of c.givens.known ?? []) add(p);
  for (const f of c.givens.facts) if (f.k === 'at') add(f.p);
  for (const g of c.givens.points ?? []) if (g.kind === 'person') add(g.ref);
  for (const q of run.asked) {
    const [kind, rest] = q.split(':') as [string, string];
    if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      for (const es of Object.values(l?.entries ?? {})) for (const e of es) if ('person' in e) add(e.person);
      for (const r of l?.remarks ?? []) for (const p of [...r.facts.map((f) => f.p), ...(r.mentions?.people ?? [])]) add(p);
    } else if (kind === 'account') {
      const a = accountOf(c, rest);
      for (const cl of Object.values(a?.claims ?? {})) for (const p of cl.company) add(p);
      for (const r of a?.remarks ?? []) for (const p of [...r.facts.map((f) => f.p), ...(r.mentions?.people ?? [])]) add(p);
    } else if (kind === 'confront') {
      const [p, hs] = rest.split('@') as [string, string];
      for (const y of confrontationOf(c, p, Number(hs))?.names ?? []) add(y);
    }
  }
  // Everyone met in a room: suspects and watchers are there to be seen.
  for (const pl of run.visited) {
    for (const p of c.people) if (p.foundAt === pl && (p.role === 'suspect' || p.role === 'watcher')) add(p.id);
  }
  return out;
}

/** Why a place is known, for the "Go to" label's aside. The first reason wins. */
export function knownPlaces(c: BoardCase, run: Pick<BoardRun, 'asked' | 'visited'>): Map<PlaceId, string> {
  const out = new Map<PlaceId, string>();
  const add = (p: PlaceId | undefined, why: string) => {
    if (!p || p === OFFICE || out.has(p) || !c.places.some((x) => x.id === p)) return;
    out.set(p, why);
  };
  add(c.crime.scene, isMurder(c) ? 'where he died' : 'where it went missing');
  for (const g of c.givens.points ?? []) if (g.kind === 'place') add(g.ref, g.text);
  for (const f of c.givens.facts) if (f.k === 'at') add(f.place, 'the office');
  const people = knownPeople(c, run);
  for (const q of run.asked) {
    const [kind, rest] = q.split(':') as [string, string];
    if (kind === 'search') {
      const f = c.finds.find((x) => x.id === rest);
      if (f?.gives.means && isMurder(c) && c.means.origin !== c.crime.scene) add(c.means.origin, `where the ${c.means.name.replace(/^(a|an|the) /, '')} came from`);
    } else if (kind === 'list') {
      const l = c.lists.find((x) => x.watcher === rest);
      for (const r of l?.remarks ?? []) {
        for (const f of r.facts) add(f.place, `${nameOf(c, rest)} mentioned it`);
        for (const p of r.mentions?.places ?? []) add(p, r.mentions?.why ?? `${nameOf(c, rest)} mentioned it`);
      }
    } else if (kind === 'account') {
      const a = accountOf(c, rest);
      for (const cl of Object.values(a?.claims ?? {})) add(cl.place, `${nameOf(c, rest)} says ${pronOf(c, rest).he} was there`);
      for (const r of a?.remarks ?? []) for (const p of r.mentions?.places ?? []) add(p, `${nameOf(c, rest)} mentioned it`);
    } else if (kind === 'confront') {
      const [p, hs] = rest.split('@') as [string, string];
      const k = confrontationOf(c, p, Number(hs));
      const lie = c.lies.find((l) => l.person === p && l.hour === Number(hs));
      if (k?.response === 'admit' && lie) add(lie.truth, `${nameOf(c, p)} owned up to it`);
      if (k?.secondLie?.place) add(k.secondLie.place, `${nameOf(c, p)}’s second story`);
    }
  }
  // Where the people the player has heard of can be found tonight.
  for (const p of people) {
    const who = personOf(c, p);
    if (!who || who.role === 'victim' || who.role === 'client') continue;
    if (who.role === 'company' && !people.has(p)) continue;
    add(who.foundAt, `${who.short} is there`);
  }
  for (const pl of run.visited) add(pl, 'been there');
  return out;
}

/** The people in a room, as the page shows them: suspects, watchers, company once named, the client. */
export function peopleAt(c: BoardCase, run: Pick<BoardRun, 'asked' | 'visited'>, place: PlaceId): PersonId[] {
  if (place === OFFICE) return [c.client];
  const known = knownPeople(c, run);
  return c.people
    .filter((p) => p.foundAt === place && p.role !== 'victim' && (p.role !== 'company' || known.has(p.id)))
    .sort((a, b) => order(a.role) - order(b.role))
    .map((p) => p.id);
  function order(r: string): number {
    return r === 'watcher' ? 0 : r === 'suspect' ? 1 : r === 'company' ? 2 : 3;
  }
}

/* ------------------------------------------------------------------ *
 * Collisions: a person's claim against what the player holds.
 * ------------------------------------------------------------------ */

export interface Collision {
  person: PersonId;
  hour: Hour;
  /** The claim's line (or the second story's, after a second lie). */
  claim: Line;
  /** Lines held that break it, by the solver's own account of why. */
  breakers: Line[];
}

/** Claims of `p` that collide with something held: broken, and not yet put to them with a line that lands. */
export function collisionsOf(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p?: PersonId): Collision[] {
  const s = solveRun(c, run);
  const lines = linesHeld(c, run);
  const out: Collision[] = [];
  for (const [k, st] of s.status) {
    if (st.s !== 'broken') continue;
    const [who, hs] = k.split('@') as [string, string];
    if (p !== undefined && who !== p) continue;
    const h = Number(hs);
    const claim = lines.find((l) => l.id === `claim:${who}@${h}`);
    if (!claim) continue;
    out.push({ person: who, hour: h, claim, breakers: breakersOf(c, run, who, h, lines, st.deps) });
  }
  return out.sort((a, b) => a.hour - b.hour);
}

/** The held lines at that hour that the solver's break rests on. */
function breakersOf(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, lines: Line[], deps: string[]): Line[] {
  const cands = candidateLines(c, run, p, h, lines);
  const hit = cands.filter((l) => deps.includes(l.q) && l.q !== `account:${p}`);
  return hit.length > 0 ? hit : cands.filter((l) => judgeLine(c, run, p, h, l).landed);
}

/**
 * docs/43 §5: the short list a confrontation's breaking line is picked from:
 * the lines held for that place and that hour, and any that put them
 * somewhere else then. Never their own claim.
 */
export function candidateLines(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, lines = linesHeld(c, run)): Line[] {
  // Everything held at that hour, the lines about their place or about them first: the player
  // has to see which one their story can't live with.
  const claimed = lines.find((l) => l.id === `claim:${p}@${h}`)?.place;
  const near = (l: Line) => (l.place === claimed || l.about.includes(p) ? 0 : 1);
  return lines
    .filter((l) => l.hour === h && l.speaker !== p && l.kind !== 'second' && l.kind !== 'admit')
    .sort((a, b) => near(a) - near(b));
}

export interface Judgement {
  landed: boolean;
  /** When it doesn't: one plain line saying why, in the detective's voice. */
  why?: string;
  /** When it does: the other lines the break rests on, said with it ("and Lindemann says the same"). */
  with?: Line[];
}

/**
 * Does this line, with what's held, break their claim at that hour? It does
 * when the solver has the claim broken and the line is one of what the break
 * rests on, or the break needs it. Read from what's held, never the truth.
 */
export function judgeLine(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, line: Line): Judgement {
  const held = solverHeld(run);
  const s = solveHeld(c, held);
  const st = s.status.get(`${p}@${h}`);
  const claim = accountOf(c, p)?.claims[h];
  const pr = pronOf(c, p);
  const who = nameOf(c, p);
  // The line itself has to touch the claim: say something of them then, or of the place they named
  // then. Another line from the same answer (Tillman's own evening, beside her remark) doesn't.
  const touches = line.about.includes(p) || line.place === claim?.place;
  if (st?.s === 'broken' && line.q !== `account:${p}` && touches) {
    const rests = st.deps.includes(line.q);
    const needed = !rests && solveHeld(c, held.filter((q) => q !== line.q)).status.get(`${p}@${h}`)?.s !== 'broken';
    const alone = !rests && !needed && solveHeld(c, [`account:${p}`, line.q]).status.get(`${p}@${h}`)?.s === 'broken';
    if (rests || needed || alone) {
      const lines = linesHeld(c, run);
      const others = lines.filter((l) => l.id !== line.id && l.hour === h && st.deps.includes(l.q) && l.q !== `account:${p}` && l.q !== line.q && (l.place === claim?.place || l.about.includes(p)));
      return { landed: true, with: others };
    }
  }
  // Why it doesn't: in terms of the rules, from the line and what they claim.
  if (!claim) return { landed: false, why: `Nothing in it touched where ${who} said ${pr.he} was.` };
  const where = placeName(c, claim.place);
  if (line.kind === 'list') {
    const l = listOf(c, line.speaker as PersonId);
    const es = l?.entries[h] ?? [];
    if (es.some((e) => 'person' in e && e.person === p)) return { landed: false, why: `${nameOf(c, line.speaker as PersonId)} had ${who} there at ${oclock(h)}. That agreed with ${pr.him}.` };
    if (l && !listExhaustive(c, l, h)) {
      return { landed: false, why: `${nameOf(c, line.speaker as PersonId)} had people there at ${oclock(h)} ${l.watcher === line.speaker ? 'whose names' : 'whose names'} nobody knew. One of them could have been ${who}.` };
    }
    if (l && l.place !== claim.place) return { landed: false, why: `${nameOf(c, line.speaker as PersonId)} could only say who was at ${placeName(c, l.place)}. ${who} hadn’t said ${pr.he} was there.` };
    if (es.some((e) => 'look' in e)) return { landed: false, why: `A face nobody could put a name to isn’t a name. It might have been ${who}’s, and it might not.` };
  }
  if (line.kind === 'claim') {
    const sp = line.speaker as PersonId;
    const spSt = s.status.get(`${sp}@${h}`);
    const spCl = accountOf(c, sp)?.claims[h];
    if (spCl?.company.includes(p)) return { landed: false, why: `${nameOf(c, sp)} had ${who} with ${pronOf(c, sp).him} at ${oclock(h)}. That agreed with ${pr.him}.` };
    if (spCl && spCl.place !== claim.place) return { landed: false, why: `${nameOf(c, sp)} had ${pronOf(c, sp).self} at ${placeName(c, spCl.place)} at ${oclock(h)}. That said nothing about who was at ${where}.` };
    if (spSt?.s !== 'trusted') return { landed: false, why: `That was ${nameOf(c, sp)}’s word against ${who}’s, and nothing under ${nameOf(c, sp)}’s yet. A story has to stand up before it can knock another one down.` };
  }
  if (line.kind === 'remark' || line.kind === 'given') return { landed: false, why: `It didn’t put ${who} anywhere at ${oclock(h)} but where ${pr.he} said.` };
  return { landed: false, why: `Nothing in it touched where ${who} said ${pr.he} was at ${oclock(h)}.` };
}

/* ------------------------------------------------------------------ *
 * What's settled.
 * ------------------------------------------------------------------ */

/** The crime hour, once the player can know it: the office's one hour, or a window narrowed to one. */
export function crimeHourKnown(c: BoardCase, run: Pick<BoardRun, 'asked'>): Hour | null {
  const s = solveRun(c, run);
  const hs = s.possibleHours;
  return hs.length === 1 ? (hs[0] as Hour) : null;
}

/** Suspects the solver has cleared, and how. */
export function clearedOf(c: BoardCase, run: Pick<BoardRun, 'asked'>): Map<PersonId, string> {
  const s = solveRun(c, run);
  const out = new Map<PersonId, string>();
  for (const [p, x] of s.cleared) if (suspectsOf(c).includes(p)) out.set(p, x.how);
  return out;
}
