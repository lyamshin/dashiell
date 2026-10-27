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
import { homeNamed } from './home.js';
import { papersLine, whyOrder } from './motives.js';
import type { HeldWhy } from './bones/types.js';

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
  // docs/47 B9: the watcher saw a coat, not a face. "I didn't know" said of somebody they'd named an
  // hour before was a contradiction (Hard-boiled 8); a back to the room isn't.
  return `somebody ${e.look}, back to the room, I couldn’t swear who`;
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

/**
 * Where somebody says they were, as the page says it: "home" when it's their own (docs/55 1d), and
 * "home at the Delmonico rooms" when their home isn't called after them (docs/59), never "at
 * Thorndike’s flat" for the man who said "home" (round 5, U5).
 */
export function claimWhere(c: BoardCase, p: PersonId, place: PlaceId): string {
  const who = personOf(c, p);
  if (who?.home !== place) return `at ${placeName(c, place)}`;
  return homeNamed(c, p) ? 'home' : `home at ${placeName(c, place)}`;
}

export function claimText(c: BoardCase, p: PersonId, h: Hour, cl: Claim): string {
  const pr = pronOf(c, p);
  const comp = cl.company.map((x) => nameOf(c, x));
  return `${nameOf(c, p)} says ${pr.he} was ${claimWhere(c, p, cl.place)} at ${oclock(h)}, ${comp.length ? `with ${andList(comp)}` : `on ${pr.his} own`}.`;
}

/**
 * A stranger on a watcher's list, as the notebook says it: the watcher's own "I didn’t know" is the
 * watcher's, so the notebook leaves it off and says it after, by name (round 5, U5: "Broadnax: at ten
 * o’clock, Grasso and somebody at the same table I didn’t know were at the Automat").
 */
function strangerNoun(name: string): string {
  return name.replace(/ (?:I didn’t know|nobody could put a name to)$/, '');
}

/**
 * A watcher's hour, as the notebook and the report say it: plainly, in the third person, and no more
 * than the watcher said (round 5, U5). "Alfano: at ten o’clock, only Steinbach, Lanza and Pardo were
 * at Moe’s." "Reinhardt: at ten o’clock, only somebody in a camel coat was at the Odessa; Reinhardt
 * couldn’t say who that was." "Broadnax: at ten o’clock, Grasso was at the Automat, with somebody at
 * the same table; Broadnax didn’t know who that was."
 */
export function listText(c: BoardCase, l: WatchList, h: Hour): string {
  const es = l.entries[h] ?? [];
  const where = placeName(c, l.place);
  const W = nameOf(c, l.watcher);
  if (shutAt(c, l.place, h)) return `${W}: ${where} was shut at ${oclock(h)}.`;
  if (es.length === 0) return `${W}: at ${oclock(h)}, nobody was at ${where}.`;
  const known = (e: ListEntry) => !('other' in e) || (c.others?.find((o) => o.id === e.other)?.known ?? true);
  // In the notebook a regular is his name: "Pardo", not "Pardo who buys things" eight times a night (Raw 11's #11).
  const short = (n: string) => n.replace(/^(Lou|Pardo|Benny)\b.*$/, '$1');
  const names = es.filter(known).map((e) => ('look' in e ? `somebody ${e.look}` : short(entryName(c, e))));
  const strangers = es.filter((e) => !known(e)).map((e) => strangerNoun(entryName(c, e)));
  const looks = es.filter((e) => 'look' in e).length;
  const many = (xs: readonly string[]) => xs.length > 1 || /^(?:two|three|four|some) /.test(xs[0] ?? '');
  // docs/53, addendum: "only Feeney and Ashby", never "…, and nobody else".
  const only = listExhaustive(c, l, h) ? 'only ' : '';
  let said: string;
  if (names.length > 0) said = `${only}${andList(names)} ${many(names) ? 'were' : 'was'} at ${where}${strangers.length ? `, with ${andList(strangers)}` : ''}`;
  else said = `${andList(strangers)} ${many(strangers) ? 'were' : 'was'} at ${where}`;
  // Who the watcher couldn't name, said once, after: a face (docs/47 B9: a coat, not a face) or a stranger.
  const unnamed = looks + strangers.length;
  const tail = unnamed === 0 ? '' : `; ${W} ${strangers.length ? 'didn’t know' : 'couldn’t say'} who ${unnamed > 1 || many(strangers) ? 'they were' : 'that was'}`;
  return `${W}: at ${oclock(h)}, ${said}${tail}.`;
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
      text: `${nameOf(c, c.client)}: ${nameOf(c, f.p)} was at ${placeName(c, f.place)} at ${oclock(f.h)}.`,
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
      // docs/47 B7: the papers put nobody's page on top, and say every page's grievance by name,
      // in the notebook as on the page.
      const text = f.gives.why ? `A page on each of them. ${whyOrder(c, suspectsOf(c)).map((p) => papersLine(c, p, true)).join(' ')}` : f.text;
      out.push({ id: `find:${rest}`, q, kind: 'find', place: f.place, about: [], text: `${cap(f.what)} at ${placeName(c, f.place)}: ${text}` });
    } else if (kind === 'confront') {
      const [p, hs] = rest.split('@') as [string, string];
      const h = Number(hs);
      const k = confrontationOf(c, p, h);
      if (!k) continue;
      const lie = c.lies.find((l) => l.person === p && l.hour === h);
      if (k.response === 'admit' && lie) {
        const y = (k.names ?? []).map((x) => nameOf(c, x));
        // (docs/59: the owning up puts whoever it names with them there too, as an account's company does.)
        // Round 7, U2: said as a person would, the way a claim is ("Dandridge owns up: Sokol’s back room
        // at nine o’clock" read as a database row): "Dandridge admits he was at Sokol’s back room at nine
        // o’clock, with Bledsoe." ("now says" is a second story's.)
        out.push({ id: `admit:${p}@${h}`, q, kind: 'admit', speaker: p, hour: h, place: lie.truth, about: [p, ...(k.names ?? [])], text: `${nameOf(c, p)} admits ${pronOf(c, p).he} was ${claimWhere(c, p, lie.truth)} at ${oclock(h)}${y.length ? `, with ${andList(y)}` : ''}.` });
      }
      if (k.secondLie?.place) {
        out.push({ id: `second:${p}@${h}`, q, kind: 'second', speaker: p, hour: h, place: k.secondLie.place, about: [p], text: `${nameOf(c, p)} now says ${pronOf(c, p).he} was at ${placeName(c, k.secondLie.place)} at ${oclock(h)}.` });
      }
    }
  }
  return out;
}

/**
 * docs/55 5: the words a page said for a held line, when the page voiced it (a remark, a crack): the
 * notebook and the report quote what the player read, not the case's own wording of it.
 */
export function saidOnPage(run: Partial<Pick<BoardRun, 'log'>>, carries: string): string | undefined {
  for (const p of run.log ?? []) {
    for (const u of p.board?.units ?? []) {
      if (u.kind !== 'fact' || !u.carries.includes(carries)) continue;
      const t = u.text.replace(/⁣\d+⁤/g, '').trim();
      if (t) return t;
    }
  }
  return undefined;
}

/**
 * A held line as the notebook, the grid's list and the report show it (round 5, U5: they say the
 * same words, and a remark in the words the page quoted). Everything else as `Line.text` says it.
 */
export function lineShown(c: BoardCase, run: Partial<Pick<BoardRun, 'log'>>, l: Line): string {
  if (l.kind !== 'remark' || !l.speaker) return l.text;
  const said = saidOnPage(run, l.id);
  if (!said) return l.text;
  const q = said.replace(/^“|”$/g, '').replace(/”\s*$/, '').trim();
  return `${nameOf(c, l.speaker)}: “${q}”`;
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
    // (docs/47 B7: the papers name every suspect, a page each, but a name on a page isn't somebody
    // the night has met: nobody joins the notebook, the grid or the walks from the papers alone.)
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
  add(c.crime.scene, isMurder(c) ? `where ${pronOf(c, c.crime.victim).he} died` : 'where it went missing');
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

/**
 * Claims of `p` that collide with something held: broken, and not yet put to them with a line that lands.
 * As the player is shown them: a break that rests on a face not yet matched to a name (docs/65 §3) is
 * left out, unless `all` (the oracle's own puts, and the report's score, which read what's held).
 */
export function collisionsOf(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'> & Partial<Pick<BoardRun, 'marks'>>, p?: PersonId, opts: { all?: boolean } = {}): Collision[] {
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
    if (!opts.all && faceUnmatched(c, run, who, h)) continue;
    out.push({ person: who, hour: h, claim, breakers: breakersOf(c, run, who, h, lines, st.deps) });
  }
  return out.sort((a, b) => a.hour - b.hour);
}

/**
 * The held lines at that hour that the solver's break rests on: what broke the story first, in the
 * order the questions were asked (docs/65 §2). A line held later that breaks it too doesn't take
 * its place: once a refuser's keeper says where they really were, the solver's break rests on that
 * list, which is also what clears them, and the collision would hand it over.
 */
function breakersOf(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, lines: Line[], deps: string[]): Line[] {
  // (Round 9, item 3: only a line that bears on their story and doesn't agree with it. The solver's break
  // rests on whole answers, so a passer-by's own evening beside her remark, or the partner's story that
  // says just what the claim said, rode in with the line that broke it.)
  const cands = candidateLines(c, run, p, h, lines).filter((l) => bearsOn(c, p, h, l) && !agreesWith(c, p, h, l));
  const on = (ds: readonly string[]) => cands.filter((l) => ds.includes(l.q) && l.q !== `account:${p}`);
  const first = on(firstBreak(c, run, p, h) ?? []);
  if (first.length > 0) return first;
  const hit = on(deps);
  return hit.length > 0 ? hit : cands.filter((l) => breakRests(c, run, p, h, l));
}

/** The people whose look is on a list's hour: who the faces on it were. */
function faceOwners(c: BoardCase, l: Line): PersonId[] {
  if (l.kind !== 'list' || l.hour === undefined) return [];
  const looks = (listOf(c, l.speaker as PersonId)?.entries[l.hour] ?? []).flatMap((e) => ('look' in e ? [e.look] : []));
  return c.people.filter((x) => !!x.look && looks.includes(x.look)).map((x) => x.id);
}

/**
 * Round 9, item 3: whether a held line bears on what `p` said of hour `h`: it's at that hour, somebody
 * else's, and says something of them, or of the place they named, or (where the solver reads company,
 * Hard-boiled's pairs) of somebody they said they were with, a face that was theirs or that somebody's
 * included. The confront offers these lines and no others; a line that bears may still not break it
 * (it agrees, or its word doesn't stand up yet), and `judgeLine` says why.
 */
export function bearsOn(c: BoardCase, p: PersonId, h: Hour, l: Line): boolean {
  if (l.hour !== h || l.speaker === p || l.kind === 'second' || l.kind === 'admit' || l.kind === 'find') return false;
  const claim = accountOf(c, p)?.claims[h];
  const who = [p, ...(techniquesUpTo(c.tier).has('pair') ? (claim?.company ?? []) : [])];
  if (who.some((q) => l.about.includes(q))) return true;
  if (claim && l.place === claim.place) return true;
  return faceOwners(c, l).some((q) => who.includes(q));
}

/**
 * The old core of a put that lands: the solver has the claim broken, and the line is one of what the
 * break rests on, or the break needs it, or it breaks the claim on its own.
 */
function breakRests(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, line: Line): boolean {
  const held = solverHeld(run);
  const st = solveHeld(c, held).status.get(`${p}@${h}`);
  if (st?.s !== 'broken' || line.q === `account:${p}`) return false;
  if (st.deps.includes(line.q)) return true;
  if (solveHeld(c, held.filter((q) => q !== line.q)).status.get(`${p}@${h}`)?.s !== 'broken') return true;
  return solveHeld(c, [`account:${p}`, line.q]).status.get(`${p}@${h}`)?.s === 'broken';
}

/**
 * Round 9, item 3: the held lines that break what `p` said of hour `h`, the one set both the confront
 * and the report read: a line here lands when it's put to them (`judgeLine`), and a line the report
 * scores as breaking the culprit's story is one of these (`heldBreakers`). What broke it first comes
 * first (the collision's `breakers`), then any other line that bears on it and breaks it too. Never a
 * line that agrees with the claim, nor one that doesn't bear on them (HB 39: the report took Feeney's
 * pea coat as the proof against Tillman, and the same line, put to her, "could only say who was at the
 * Kit Kat").
 */
export function storyBreakers(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, lines = linesHeld(c, run)): Line[] {
  const st = solveRun(c, run).status.get(`${p}@${h}`);
  if (st?.s !== 'broken' || !lines.some((l) => l.id === `claim:${p}@${h}`)) return [];
  const first = breakersOf(c, run, p, h, lines, st.deps);
  const more = candidateLines(c, run, p, h, lines).filter((l) => !first.some((x) => x.id === l.id) && bearsOn(c, p, h, l) && !agreesWith(c, p, h, l) && breakRests(c, run, p, h, l));
  return [...first, ...more];
}

/**
 * The held lines that break a second story, told when the first was put to them: a keeper's list for the
 * place and hour it names, without them on it. One set for the put made again (it lands on these), the
 * report (it scores them) and, round 8's B9, the grid's ✗ on the second story.
 */
export function secondBreakers(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts'>, p: PersonId, h: Hour, lines = linesHeld(c, run)): Line[] {
  const alt = confrontationOf(c, p, h)?.secondLie?.place;
  if (!alt || !run.asked.includes(`confront:${p}@${h}`)) return [];
  return lines.filter((l) => l.kind === 'list' && l.hour === h && l.place === alt && !l.about.includes(p));
}

/**
 * Round 7, B3: what broke a story is never the line that agrees with it. On a pair night the break
 * rests on the partner's own story too ("Mosley says he was at Grasso’s flat at nine, with Grasso"),
 * which says just what Grasso said; what broke it is the face at Moskowitz’s that was Mosley's. A
 * line that puts them where they said, then, comes after the lines that don't: the collision's first
 * line, the curtain's "What gave it away", the oracle's put and the readers' proof are the break.
 * Round 9, item 3: and it isn't one of the breakers at all: put to them, it doesn't land, and the
 * report doesn't score it.
 */
export function agreesWith(c: BoardCase, p: PersonId, h: Hour, l: Line): boolean {
  const claimed = accountOf(c, p)?.claims[h]?.place;
  return claimed !== undefined && l.place === claimed && l.about.includes(p) && (l.kind === 'claim' || l.kind === 'list' || l.kind === 'given' || l.kind === 'admit');
}

/**
 * Could they get the means, as the grid's last column shows it from what's held: yes (the office
 * says they live there, or somebody's word has them where it was while it was there), no (somebody's
 * word has them elsewhere every hour it was there), or not known. A murder's means is known once the
 * search that finds it is held.
 */
export function meansShown(c: BoardCase, run: Pick<BoardRun, 'asked'>, p: PersonId): 'yes' | 'no' | '?' {
  const s = solveRun(c, run);
  const known = !isMurder(c) || run.asked.some((q) => q.startsWith('search:') && !!c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (!known) return '?';
  if (c.givens.access.includes(p) || c.means.available.some((h) => s.placed.get(`${p}@${h}`)?.place === c.means.origin)) return 'yes';
  const no = c.means.available.every((h) => {
    const x = s.placed.get(`${p}@${h}`);
    return (x && x.place !== c.means.origin) || s.notPlaced.get(`${p}@${h}`)?.has(c.means.origin);
  });
  return no ? 'no' : '?';
}

/**
 * Round 7, B6: somebody what's held puts where the means was kept, but only once it had to be gone:
 * the first such hour. A windowed murder's means had to be taken before the window's first hour, the
 * earliest it could have happened (`generate.ts`: the hours it was there are those before it), so
 * Vitale at Kowalski’s at nine, with the knife there at seven and the window nine or ten, came too
 * late for it. Undefined where they couldn't be ruled out on it, or were never there.
 */
export function meansLate(c: BoardCase, run: Pick<BoardRun, 'asked'>, p: PersonId): Hour | undefined {
  // (A thing there for the taking: a murder's means, or a spare key. Who came after a room was told
  // about the window never heard it, and says so already.)
  if (!(isMurder(c) || /^spare/.test(c.setup?.means ?? ''))) return undefined;
  if (meansShown(c, run, p) !== 'no' || c.means.available.length === 0) return undefined;
  const s = solveRun(c, run);
  const after = Math.max(...c.means.available);
  return c.board.hours.find((h) => h > after && s.placed.get(`${p}@${h}`)?.place === c.means.origin);
}

/** Round 7, B6: the hour a windowed murder's means had to be had by: the earliest it could have happened. */
export function meansBy(c: BoardCase): Hour | undefined {
  const w = c.givens.window ?? c.crime.window;
  return isMurder(c) && w.length > 1 ? (w[0] as Hour) : undefined;
}

const FACELESS = new Map<string, Solved>();

/**
 * docs/65 §3 (round 6): a break that rests on putting a name to a face is the player's to make. At
 * Hard-boiled a watcher may see only "somebody in a camel coat", and the one in the camel coat walked
 * in past the player. A claim that breaks only once the solver matches that coat to a name isn't
 * shown as a clash (the grid's ✗, the put picker's claim) until the player has shown the match: a
 * pencil mark that puts the face's owner there then, or the claimant not there; or the line, read
 * to the claimant, landing. Below Hard-boiled no list carries a face, so nothing is held back.
 */
export function faceUnmatched(c: BoardCase, run: Pick<BoardRun, 'asked'> & Partial<Pick<BoardRun, 'marks'>>, p: PersonId, h: Hour): boolean {
  const T = techniquesUpTo(c.tier);
  if (!T.has('face')) return false;
  const held = solverHeld(run);
  if (solveHeld(c, held).status.get(`${p}@${h}`)?.s !== 'broken') return false;
  if (held.includes(`confront:${p}@${h}`)) return false;
  const key = `${c.id}|${[...held].sort().join(',')}`;
  let without = FACELESS.get(key);
  if (!without) {
    without = solve(c, held, { techniques: new Set([...T].filter((t) => t !== 'face')) });
    if (FACELESS.size > 200) FACELESS.delete(FACELESS.keys().next().value as string);
    FACELESS.set(key, without);
  }
  if (without.status.get(`${p}@${h}`)?.s === 'broken') return false;
  // The match, shown: a face seen at that hour put on its owner, or the claimant pencilled out of the place.
  const claimed = accountOf(c, p)?.claims[h]?.place;
  const marks = run.marks ?? {};
  if (claimed && marks[p]?.[String(h)]?.notAt?.includes(claimed)) return false;
  for (const l of c.lists) {
    if (!held.includes(`list:${l.watcher}`)) continue;
    for (const e of l.entries[h] ?? []) {
      if (!('look' in e)) continue;
      const owner = c.people.find((x) => x.look === e.look);
      if (owner && marks[owner.id]?.[String(h)]?.at === l.place) return false;
    }
  }
  return true;
}

/** docs/65 §2: what the break rested on when it first broke, asking the held questions in order. */
function firstBreak(c: BoardCase, run: Pick<BoardRun, 'asked'>, p: PersonId, h: Hour): string[] | undefined {
  const held = solverHeld(run);
  for (let i = 1; i <= held.length; i++) {
    const st = solveHeld(c, held.slice(0, i)).status.get(`${p}@${h}`);
    if (st?.s === 'broken') return st.deps;
  }
  return undefined;
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
  /** docs/52: the same reason, as the bones say it (`HELD.why`). */
  code?: HeldWhy;
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
  // Round 9, item 3: it lands when it's one of the lines that break the story (`storyBreakers`), the
  // set the report scores too. The line itself has to bear on the claim: say something of them then,
  // of the place they named then, or of somebody they said they were with. Another line from the same
  // answer (Tillman's own evening, beside her remark) doesn't, and a line that agrees with them never breaks it.
  if (st?.s === 'broken' && storyBreakers(c, run, p, h).some((l) => l.id === line.id)) {
    const lines = linesHeld(c, run);
    const others = lines.filter((l) => l.id !== line.id && l.hour === h && st.deps.includes(l.q) && l.q !== `account:${p}` && l.q !== line.q && (l.place === claim?.place || l.about.includes(p)) && !agreesWith(c, p, h, l));
    return { landed: true, with: others };
  }
  // Why it doesn't: in terms of the rules, from the line and what they claim.
  if (!claim) return { landed: false, code: 'untouched', why: `Nothing in it touched where ${who} said ${pr.he} was.` };
  const where = placeName(c, claim.place);
  if (line.kind === 'list') {
    const l = listOf(c, line.speaker as PersonId);
    const es = l?.entries[h] ?? [];
    if (es.some((e) => 'person' in e && e.person === p)) return { landed: false, code: 'agreed', why: `${nameOf(c, line.speaker as PersonId)} had ${who} there at ${oclock(h)}. That agreed with ${pr.him}.` };
    if (l && !listExhaustive(c, l, h)) {
      return { landed: false, code: 'strangers', why: `${nameOf(c, line.speaker as PersonId)} had people there at ${oclock(h)} ${l.watcher === line.speaker ? 'whose names' : 'whose names'} nobody knew. One of them could have been ${who}.` };
    }
    if (l && l.place !== claim.place) return { landed: false, code: 'elsewhere', why: `${nameOf(c, line.speaker as PersonId)} could only say who was at ${placeName(c, l.place)}. ${who} hadn’t said ${pr.he} was there.` };
    if (es.some((e) => 'look' in e)) return { landed: false, code: 'face', why: `A face nobody could put a name to isn’t a name. It might have been ${who}’s, and it might not.` };
  }
  if (line.kind === 'claim') {
    const sp = line.speaker as PersonId;
    const spSt = s.status.get(`${sp}@${h}`);
    const spCl = accountOf(c, sp)?.claims[h];
    if (spCl?.company.includes(p)) return { landed: false, code: 'company', why: `${nameOf(c, sp)} had ${who} with ${pronOf(c, sp).him} at ${oclock(h)}. That agreed with ${pr.him}.` };
    if (spCl && spCl.place !== claim.place) return { landed: false, code: 'other-place', why: `${nameOf(c, sp)} says ${pronOf(c, sp).he} was at ${placeName(c, spCl.place)} at ${oclock(h)}. That said nothing about who was at ${where}.` };
    if (spSt?.s !== 'trusted') return { landed: false, code: 'untrusted', why: `That was ${nameOf(c, sp)}’s word against ${who}’s, and nothing under ${nameOf(c, sp)}’s yet. A story has to stand up before it can knock another one down.` };
  }
  if (line.kind === 'remark' || line.kind === 'given') return { landed: false, code: 'nowhere', why: `It didn’t put ${who} anywhere at ${oclock(h)} but where ${pr.he} said.` };
  return { landed: false, code: 'untouched', why: `Nothing in it touched where ${who} said ${pr.he} was at ${oclock(h)}.` };
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
