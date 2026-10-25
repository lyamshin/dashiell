/**
 * docs/52 §3: plain realization, and its inverse.
 *
 * A small grammar says a composite in plain English: one sentence a
 * composite, a clause a proposition (or a run of them that share everything
 * but an hour or a name: lists, "eight and nine", "Feeney and Ashby"), the
 * clauses joined by the composite's own connective (", and", "; ", ", but").
 * Places and hours by name. People by name, or by "he", "she" where the
 * planner's reference logic allows it: the subject of the clause before, with
 * nobody else of that sex in that clause. The relations say their own
 * connectives: a confirmation "as she had said", a collision "which collided
 * with". No voice: the **plain page** is every fact, said once.
 *
 * `parsePlain` reads a plain page back to its propositions, clause by clause,
 * with the same lexicon and the same reference rule, so the round trip
 * (`scripts/roundtrip.ts`) can hold the plain page to the bones it came from.
 */

import { andList, cap, hourWord, isMurder, nameOf, placeName, pronOf, victimOf, type BoardCase, type Hour } from '../model.js';
import { sentencesOf } from '../plan/sentences.js';
import type { Block, Page } from '../types.js';
import { shortOther, wayKnown } from './phrase.js';
import { canon } from './extract.js';
import type { Composite, HeldWhy, Id, Prop, Src } from './types.js';
import { remarkStreets } from '../../../gen/board/streets.js';

type P<K extends Prop['k']> = Extract<Prop, { k: K }>;

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A word list as a regex alternation, longest first, its first letter either case. */
function alt(xs: readonly string[]): string {
  const uniq = [...new Set(xs.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (uniq.length === 0) return '(?!)';
  return uniq.map((x) => (/^[A-Za-z]/.test(x) ? `[${(x[0] as string).toUpperCase()}${(x[0] as string).toLowerCase()}]${esc(x.slice(1))}` : esc(x))).join('|');
}

/** "A", "A and B", "A, B and C": a list of one alternation. */
function listOf(one: string): string {
  return `(?:${one})(?:, (?:${one}))*(?: and (?:${one}))?`;
}

/* ------------------------------------------------------------------ *
 * The lexicon: the night's names, places, hours, and what a list may hold.
 * ------------------------------------------------------------------ */

export interface Lexicon {
  c: BoardCase;
  person: Map<string, Id>;
  place: Map<string, Id>;
  entry: Map<string, string>;
  find: Map<string, Id>;
  hour: Map<string, number>;
  /** Regex sources (no captures). */
  re: Record<'NAME' | 'PRON' | 'PL' | 'H' | 'HS' | 'HOR' | 'NS' | 'E' | 'ES' | 'STREET' | 'WHAT' | 'THING' | 'MEANS' | 'SRC' | 'ACC' | 'WAY', string>;
}

/** docs/53, addendum: what having the way in was, after "could have": "got the chloral", "known where the key was". */
function accessWords(c: BoardCase): string {
  if (isMurder(c)) return `got the ${meansLabel(c)}`;
  if (/^spare/.test(c.setup?.means ?? '')) return 'got the spare key';
  return `known ${wayKnown(c)}`;
}

const LEX = new WeakMap<BoardCase, Lexicon>();

/** What somebody who isn't a row of the board is called, plainly ("Pardo", "a drummer nobody could put a name to"). */
export function otherLabel(c: BoardCase, id: string): string {
  const o = c.others?.find((x) => x.id === id);
  return o ? shortOther(o.name) : id;
}

export function entryLabel(c: BoardCase, e: string): string {
  if (e.startsWith('other:')) return otherLabel(c, e.slice(6));
  if (e.startsWith('look:')) return `somebody ${e.slice(5)}`;
  return nameOf(c, e);
}

function meansLabel(c: BoardCase): string {
  return isMurder(c) ? c.means.name.replace(/^(a|an|the) /, '') : 'spare key';
}

export function lexicon(c: BoardCase): Lexicon {
  const hit = LEX.get(c);
  if (hit) return hit;
  const person = new Map<string, Id>();
  for (const p of c.people) person.set(p.short, p.id);
  const place = new Map<string, Id>();
  for (const p of c.places) place.set(placeName(c, p.id), p.id);
  const entry = new Map<string, string>();
  for (const p of c.people) entry.set(p.short, p.id);
  for (const o of c.others ?? []) entry.set(otherLabel(c, o.id), `other:${o.id}`);
  for (const p of c.people) if (p.look) entry.set(`somebody ${p.look}`, `look:${p.look}`);
  const looks = c.lists.flatMap((l) => Object.values(l.entries).flat()).flatMap((e) => ('look' in e ? [e.look] : []));
  for (const l of looks) entry.set(`somebody ${l}`, `look:${l}`);
  const find = new Map<string, Id>();
  for (const f of c.finds) find.set(`${f.what} at ${placeName(c, f.place)}`, f.id);
  const hour = new Map<string, number>();
  for (let h = 7; h <= 12; h++) hour.set(hourWord(h as Hour), h);
  const NAME = alt([...person.keys()]);
  const H = alt([...hour.keys()]);
  const E = alt([...entry.keys()]);
  // docs/53, addendum: whose word, by the name of whoever said it (a watcher's is what they saw, the client's the office's).
  const SRC = `(?:(?:${NAME})(?: on owning up| in passing| the second time)?|[Tt]he search|[Aa] witness|[Ss]omebody)`;
  const lx: Lexicon = {
    c,
    person,
    place,
    entry,
    find,
    hour,
    re: {
      NAME,
      PRON: '(?:[Hh]e|[Ss]he|[Ii]t)',
      PL: alt([...place.keys()]),
      H,
      HS: listOf(H),
      HOR: `(?:${H})(?:, (?:${H}))*(?: or (?:${H}))?`,
      NS: listOf(NAME),
      E,
      ES: listOf(E),
      // docs/65 §1: a side remark's street is where two walks cross, not always a place's.
      STREET: alt([...c.places.map((p) => p.street), ...remarkStreets(c)]),
      WHAT: alt(c.finds.map((f) => f.what)),
      THING: alt([victimOf(c).short]),
      MEANS: alt([meansLabel(c)]),
      SRC,
      ACC: esc(accessWords(c)),
      WAY: esc(wayKnown(c)),
    },
  };
  LEX.set(c, lx);
  return lx;
}

/** Split a plain list back into its items ("A, B and C"), by the alternation it was made of. */
function items(s: string, one: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`^(${one})(?:, | and |$)`);
  let rest = s;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) throw new Error(`plain: can't read "${rest}" as a list`);
    out.push(m[1] as string);
    rest = rest.slice((m[0] as string).length);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Reference: a pronoun for the subject of the clause before, when nobody
 * else of that sex was in it.
 * ------------------------------------------------------------------ */

interface Ref {
  subject: Id | null;
  named: Set<Id>;
}

function female(c: BoardCase, id: Id): boolean {
  return pronOf(c, id).he === 'she';
}

/** Somebody a pronoun may stand for: a person (or the pet), not a thing. */
function pronounable(c: BoardCase, id: Id): boolean {
  return pronOf(c, id).he !== 'it' && c.people.some((p) => p.id === id);
}

function mayPronoun(c: BoardCase, ref: Ref, x: Id): boolean {
  return ref.subject === x && pronounable(c, x) && ![...ref.named].some((y) => y !== x && pronounable(c, y) && female(c, y) === female(c, x));
}

function srcPeople(c: BoardCase, s: Src): Id[] {
  // (docs/53, addendum: the office is said as the client, by name.)
  if (s.k === 'given') return [c.client];
  return s.who ? [s.who] : [];
}

/** Everybody a proposition names, for the reference rule (both directions read it off the propositions). */
export function peopleIn(c: BoardCase, p: Prop): Id[] {
  const isPerson = (x: string | undefined): x is Id => !!x && c.people.some((y) => y.id === x);
  switch (p.k) {
    case 'CLAIM':
      return [p.person, ...(p.company ?? [])];
    case 'LIST':
      return [p.watcher, ...p.people.filter(isPerson), ...Object.values(p.faces ?? {})];
    case 'REMARK':
      return [p.speaker, ...(isPerson(p.saw) ? [p.saw] : [])];
    case 'SHIFT':
      return [p.watcher];
    case 'ACCESS':
      return [p.person];
    case 'ALIVE':
      return [p.victim];
    case 'CONFIRMS':
      return [p.person, ...(p.company ?? []), ...srcPeople(c, p.by)];
    case 'COLLIDES':
      return [p.person, ...('k' in p.with && (p.with as Prop).k === (p.with as Prop).k.toUpperCase() ? peopleIn(c, p.with as Prop) : srcPeople(c, p.with as Src))];
    case 'LEFT':
      return [...(p.people ?? [])];
    case 'ADMIT':
      return [p.person, ...(p.witness ? [p.witness] : [])];
    case 'REFUSE':
    case 'SECOND':
    case 'CRACK':
      return [p.person];
    case 'HELD':
      return [p.person, ...(p.by ? [p.by] : [])];
    case 'MOTIVE':
      return p.person === '*' ? [] : [p.person];
    case 'POINTER':
      return isPerson(p.to) ? [p.to] : [];
    case 'HANDOVER':
      return p.thing && isPerson(p.thing) ? [p.thing] : [];
    case 'PLACED':
    case 'AWAY':
      return [p.person, ...srcPeople(c, p.by)];
    case 'UNBACKED':
      return [p.person];
    case 'PRESENT':
      return [p.person];
    case 'UNSPOKEN':
    case 'MISSING':
      return [...p.people];
    case 'HOLD':
      return [...p.evenings, ...p.lists];
    case 'RELATION':
      return [p.client, p.victim];
    case 'FOUND':
      return [p.victim, ...(p.finder ? [p.finder] : [])];
    case 'GONE':
      return isPerson(p.thing) ? [p.thing] : [];
    case 'MEANS':
      return [...(p.how === 'told' || p.how === 'party' ? [c.client] : []), ...(p.who ? [p.who] : [])];
    default:
      return [];
  }
}

function isSrc(x: Prop | Src): x is Src {
  return !(x as Prop).k || (x as Prop).k === (x as Src).k.toLowerCase();
}

/* ------------------------------------------------------------------ *
 * The clauses: each says a proposition (or a run of them) and reads it back.
 * ------------------------------------------------------------------ */

interface Said {
  text: string;
  /** Whom the clause is about: the next clause's pronoun may be theirs. */
  subject: Id | null;
}

interface Rd {
  lx: Lexicon;
  /** The subject a pronoun in this clause stands for. */
  ref: Ref;
}

const WHY: Record<HeldWhy, string> = {
  agreed: 'it agreed with what they had said',
  strangers: 'there were people there nobody could name',
  elsewhere: 'it only covered the one place',
  face: 'a face is not a name',
  company: 'it had them together',
  'other-place': 'it was about somewhere else',
  untrusted: 'nobody had backed it up yet',
  nowhere: 'it put them nowhere else',
  untouched: 'nothing in it touched what they had said',
};

/**
 * docs/53, addendum: whose word a line is, said as the person who said it: "Coffin", the client by
 * name; "Weisglass on owning up", "Ashby in passing", "Grasso the second time"; "the search". What
 * kind of word a bare name is follows from who they are (`srcRead`): a watcher's is what they saw, the
 * client's is the office's, anybody else's is their own account.
 */
function srcSaid(c: BoardCase, s: Src): string {
  const who = s.who ? nameOf(c, s.who) : '';
  switch (s.k) {
    case 'given':
      return nameOf(c, c.client);
    case 'find':
      return 'the search';
    case 'list':
      return who || 'a witness';
    case 'claim':
      return who || 'somebody';
    case 'admit':
      return `${who} on owning up`;
    case 'remark':
      return `${who} in passing`;
    case 'second':
      return `${who} the second time`;
  }
}

function srcRead(lx: Lexicon, s: string): Src {
  if (/^the search$/i.test(s)) return { k: 'find' };
  if (/^a witness$/i.test(s)) return { k: 'list' };
  if (/^somebody$/i.test(s)) return { k: 'claim' };
  const m = /^(.+?)(?: (on owning up|in passing|the second time))?$/.exec(s) as RegExpExecArray;
  const who = person(lx, m[1] as string);
  if (m[2]) return { k: m[2] === 'on owning up' ? 'admit' : m[2] === 'in passing' ? 'remark' : 'second', who };
  if (who === lx.c.client) return { k: 'given' };
  return { k: lx.c.lists.some((l) => l.watcher === who) && !lx.c.accounts.some((a) => a.person === who) ? 'list' : 'claim', who };
}

function person(lx: Lexicon, s: string): Id {
  const id = lx.person.get(s) ?? lx.person.get(cap(s));
  if (!id) throw new Error(`plain: nobody called "${s}"`);
  return id;
}

function place(lx: Lexicon, s: string): Id {
  const id = lx.place.get(s) ?? [...lx.place.entries()].find(([k]) => k.toLowerCase() === s.toLowerCase())?.[1];
  if (id === undefined) throw new Error(`plain: no place "${s}"`);
  return id;
}

function hours(lx: Lexicon, s: string): number[] {
  return items(s, lx.re.H).map((x) => lx.hour.get(x.toLowerCase()) as number);
}

function names(lx: Lexicon, s: string): Id[] {
  return items(s, lx.re.NAME).map((x) => person(lx, x));
}

function entries(lx: Lexicon, s: string): string[] {
  return items(s, lx.re.E).map((x) => lx.entry.get(x) ?? lx.entry.get(cap(x)) ?? x);
}

/** A subject slot: the pronoun (the clause before's subject), or a name. */
function subj(lx: Lexicon, ref: Ref, s: string): Id {
  if (/^(?:he|she|it)$/i.test(s)) {
    if (!ref.subject) throw new Error(`plain: "${s}" with nobody before it`);
    return ref.subject;
  }
  return person(lx, s);
}

interface Clause {
  /** Which propositions it says. */
  kinds: Prop['k'][];
  /** Whether `b` may be said in `a`'s clause (a run that differs in an hour or a name). */
  joins?: (a: Prop, b: Prop, run: Prop[]) => boolean;
  say: (ps: Prop[], c: BoardCase, ref: Ref) => Said;
  /** The grammar, from the lexicon: a regex source with captures, anchored. */
  re: (lx: Lexicon) => string;
  read: (m: RegExpExecArray, r: Rd) => { props: Prop[]; subject: Id | null };
}

/** The subject said: a pronoun where the reference allows it, the name otherwise. */
function S(c: BoardCase, ref: Ref, x: Id): string {
  return mayPronoun(c, ref, x) ? pronOf(c, x).he : nameOf(c, x);
}

const he = (c: BoardCase, x: Id): string => pronOf(c, x).he;
const hs = (xs: readonly number[]): string => andList(xs.map((h) => hourWord(h as Hour)));
const ns = (c: BoardCase, xs: readonly Id[]): string => andList(xs.map((x) => nameOf(c, x)));
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const later = (a: Prop, run: Prop[]): boolean => (a as { hour?: number }).hour !== undefined && (run[run.length - 1] as { hour?: number }).hour !== undefined && ((a as { hour: number }).hour > ((run[run.length - 1] as { hour: number }).hour));

const CLAUSES: Clause[] = [
  // Somebody's own word: "Ashby said he was at the Automat at eight and nine, alone."
  {
    kinds: ['CLAIM'],
    // One place at several hours with the same company; or, where the place isn't said, who was
    // with them hour by hour ("with Abramowitz at eight, alone at nine and with Ashby at ten").
    joins: (a, b, run) => {
      const x = a as P<'CLAIM'>;
      const y = b as P<'CLAIM'>;
      if (x.person !== y.person || !later(b, run)) return false;
      if (x.place === undefined && y.place === undefined) return x.company !== undefined && y.company !== undefined;
      return x.place === y.place && same(x.company, y.company);
    },
    say: (ps, c, ref) => {
      const x = ps[0] as P<'CLAIM'>;
      const who = S(c, ref, x.person);
      const at = hs(ps.map((y) => (y as P<'CLAIM'>).hour));
      const comp = x.company === undefined ? '' : x.company.length ? `, with ${ns(c, x.company)}` : ', alone';
      if (x.place === undefined) {
        // Hours with the same company run together: "alone at nine and eleven".
        const spans: { company: Id[]; hours: number[] }[] = [];
        for (const y of ps as P<'CLAIM'>[]) {
          const last = spans[spans.length - 1];
          if (last && same(last.company, y.company)) last.hours.push(y.hour);
          else spans.push({ company: y.company ?? [], hours: [y.hour] });
        }
        return { text: `${who} said ${he(c, x.person)} was ${andList(spans.map((sp) => `${sp.company.length ? `with ${ns(c, sp.company)}` : 'alone'} at ${hs(sp.hours)}`))}`, subject: x.person };
      }
      return { text: `${who} said ${he(c, x.person)} was at ${placeName(c, x.place)} at ${at}${comp}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) said ${l.re.PRON} was (?:at (${l.re.PL}) at (${l.re.HS})(?:, with (${l.re.NS})|, (alone))?|((?:with (?:${l.re.NS})|alone) at (?:${l.re.HS})(?:(?:, | and )(?:with (?:${l.re.NS})|alone) at (?:${l.re.HS}))*))$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      if (m[2]) {
        const company = m[4] ? names(lx, m[4]) : m[5] ? [] : undefined;
        return { props: hours(lx, m[3] as string).map((h) => ({ k: 'CLAIM', person: p, place: place(lx, m[2] as string), hour: h, ...(company ? { company } : {}) }) as Prop), subject: p };
      }
      const span = new RegExp(`^(?:with (${lx.re.NS})|alone) at (${lx.re.HS})(?:, | and |$)`);
      const out: Prop[] = [];
      let rest = m[6] as string;
      while (rest.length) {
        // (An "and" may join two names or two spans: the longest span that leaves the rest readable.)
        const k = span.exec(rest);
        if (!k) throw new Error(`plain: can't read "${rest}" as company`);
        const company = k[1] ? names(lx, k[1]) : [];
        for (const h of hours(lx, k[2] as string)) out.push({ k: 'CLAIM', person: p, hour: h, company });
        rest = rest.slice((k[0] as string).length);
      }
      return { props: out, subject: p };
    },
  },
  // A watcher's hours, as they said them (docs/53, addendum): "Coffin said only Feeney and Ashby were at the Thalia at eleven."
  {
    kinds: ['LIST'],
    joins: (a, b, run) => {
      const x = a as P<'LIST'>;
      const y = b as P<'LIST'>;
      return x.watcher === y.watcher && x.place === y.place && same(x.people, y.people) && !!x.whole === !!y.whole && !!x.shut === !!y.shut && same(x.faces, y.faces) && later(b, run);
    },
    say: (ps, c, ref) => {
      const x = ps[0] as P<'LIST'>;
      const who = S(c, ref, x.watcher);
      const at = hs(ps.map((y) => (y as P<'LIST'>).hour));
      if (x.shut) return { text: `${who} said ${placeName(c, x.place)} was shut at ${at}`, subject: x.watcher };
      if (x.people.length === 0) return { text: `${who} said nobody was at ${placeName(c, x.place)} at ${at}`, subject: x.watcher };
      const faces = Object.entries(x.faces ?? {}).map(([look, p]) => `${nameOf(c, p)} was the one ${look}`);
      return { text: `${who} said ${x.whole ? 'only ' : ''}${andList(x.people.map((e) => entryLabel(c, e)))} ${x.people.length > 1 ? 'were' : 'was'} at ${placeName(c, x.place)} at ${at}${faces.length ? `, where ${faces.join(' and ')}` : ''}`, subject: x.watcher };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) said (?:(${l.re.PL}) was shut at (${l.re.HS})|nobody() was at (${l.re.PL}) at (${l.re.HS})|(only )?(${l.re.ES}) (?:was|were) at (${l.re.PL}) at (${l.re.HS})(?:, where ((?:${l.re.NAME}) was the one .+))?)$`,
    read: (m, { lx, ref }) => {
      const w = subj(lx, ref, m[1] as string);
      if (m[2]) return { props: hours(lx, m[3] as string).map((h) => ({ k: 'LIST', watcher: w, place: place(lx, m[2] as string), hour: h, people: [], shut: true }) as Prop), subject: w };
      if (m[5]) return { props: hours(lx, m[6] as string).map((h) => ({ k: 'LIST', watcher: w, place: place(lx, m[5] as string), hour: h, people: [] }) as Prop), subject: w };
      const faces: Record<string, Id> = {};
      for (const f of (m[11] ?? '').split(' and ').filter(Boolean)) {
        const k = new RegExp(`^(${lx.re.NAME}) was the one (.+)$`).exec(f);
        if (k) faces[k[2] as string] = person(lx, k[1] as string);
      }
      const people = entries(lx, m[8] as string);
      return {
        props: hours(lx, m[10] as string).map((h) => ({ k: 'LIST', watcher: w, place: place(lx, m[9] as string), hour: h, people, ...(m[7] ? { whole: true } : {}), ...(Object.keys(faces).length ? { faces } : {}) }) as Prop),
        subject: w,
      };
    },
  },
  // A remark: "Ashby said he passed Corrigan on Stuyvesant Street at eleven on the way to the Thalia."
  {
    kinds: ['REMARK'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'REMARK'>;
      const who = S(c, ref, x.speaker);
      if (x.how === 'passed') return { text: `${who} said ${he(c, x.speaker)} passed ${nameOf(c, x.saw)} on ${x.where} at ${hourWord(x.hour as Hour)}${x.via ? ` on the way to ${placeName(c, x.via)}` : ''}`, subject: x.speaker };
      if (x.how === 'had') return { text: `${who} said ${he(c, x.speaker)} had ${nameOf(c, x.saw)} with ${pronOf(c, x.speaker).him} at ${placeName(c, x.where)} at ${hourWord(x.hour as Hour)}`, subject: x.speaker };
      return { text: `${who} said the ${meansLabel(c)} was at ${placeName(c, x.where)} at ${hourWord(x.hour as Hour)}`, subject: x.speaker };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) said (?:${l.re.PRON} passed (${l.re.NAME}) on (${l.re.STREET}) at (${l.re.H})(?: on the way to (${l.re.PL}))?|${l.re.PRON} had (${l.re.NAME}) with (?:him|her|them|it) at (${l.re.PL}) at (${l.re.H})|the (?:${l.re.MEANS}) was at (${l.re.PL}) at (${l.re.H}))$`,
    read: (m, { lx, ref }) => {
      const s = subj(lx, ref, m[1] as string);
      if (m[2]) return { props: [{ k: 'REMARK', speaker: s, saw: person(lx, m[2]), how: 'passed', where: m[3] as string, hour: lx.hour.get(m[4] as string) as number, ...(m[5] ? { via: place(lx, m[5]) } : {}) }], subject: s };
      if (m[6]) return { props: [{ k: 'REMARK', speaker: s, saw: person(lx, m[6]), how: 'had', where: place(lx, m[7] as string), hour: lx.hour.get(m[8] as string) as number }], subject: s };
      return { props: [{ k: 'REMARK', speaker: s, saw: 'means', how: 'there', where: place(lx, m[9] as string), hour: lx.hour.get(m[10] as string) as number }], subject: s };
    },
  },
  {
    kinds: ['SHIFT'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'SHIFT'>;
      return { text: `${S(c, ref, x.watcher)} said ${he(c, x.watcher)} came on at ${hourWord(x.from as Hour)}`, subject: x.watcher };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) said ${l.re.PRON} came on at (${l.re.H})$`,
    read: (m, { lx, ref }) => {
      const w = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'SHIFT', watcher: w, from: lx.hour.get(m[2] as string) as number }], subject: w };
    },
  },
  {
    kinds: ['FIND'],
    say: (ps, c) => {
      const x = ps[0] as P<'FIND'>;
      const f = c.finds.find((y) => y.id === x.find);
      return { text: `I searched ${f?.what ?? x.find} at ${placeName(c, x.place)}`, subject: null };
    },
    re: (l) => `^I searched ((?:${l.re.WHAT}) at (?:${l.re.PL}))$`,
    read: (m, { lx }) => {
      const id = lx.find.get(m[1] as string) ?? [...lx.find.entries()].find(([k]) => k.toLowerCase() === (m[1] as string).toLowerCase())?.[1];
      if (!id) throw new Error(`plain: no search "${m[1]}"`);
      const f = lx.c.finds.find((y) => y.id === id);
      return { props: [{ k: 'FIND', find: id, place: f?.place ?? '' }], subject: null };
    },
  },
  // The way in, as the thing it was (docs/53, addendum): "Feeney and Corrigan could have known where the key was, from eight."
  {
    kinds: ['ACCESS'],
    joins: (a, b) => (a as P<'ACCESS'>).had === (b as P<'ACCESS'>).had && (a as P<'ACCESS'>).hour === (b as P<'ACCESS'>).hour,
    say: (ps, c, ref) => {
      const xs = ps as P<'ACCESS'>[];
      const x = xs[0] as P<'ACCESS'>;
      const who = xs.length === 1 ? S(c, ref, x.person) : ns(c, xs.map((y) => y.person));
      return { text: `${who} could ${x.had ? '' : 'not '}have ${accessWords(c)}${x.hour !== undefined ? `, from ${hourWord(x.hour as Hour)}` : ''}`, subject: xs.length === 1 ? x.person : null };
    },
    re: (l) => `^(${l.re.NS}|${l.re.PRON}) could (not )?have ${l.re.ACC}(?:, from (${l.re.H}))?$`,
    read: (m, { lx, ref }) => {
      const who = /^(?:he|she|it)$/i.test(m[1] as string) ? [subj(lx, ref, m[1] as string)] : names(lx, m[1] as string);
      return { props: who.map((p) => ({ k: 'ACCESS', person: p, had: !m[2], ...(m[3] ? { hour: lx.hour.get(m[3]) as number } : {}) }) as Prop), subject: who.length === 1 ? (who[0] as Id) : null };
    },
  },
  {
    kinds: ['WINDOW'],
    // The hours it could have happened in, said as what happened (docs/53, addendum): "Carbone died at nine or ten", "Fritz went at ten".
    say: (ps, c) => {
      const x = ps[0] as P<'WINDOW'>;
      const ws = x.hours.map((h) => hourWord(h as Hour));
      const or = ws.length > 1 ? `${ws.slice(0, -1).join(', ')} or ${ws[ws.length - 1]}` : (ws[0] ?? '');
      return { text: `${cap(victimOf(c).short)} ${isMurder(c) ? 'died' : 'went'} at ${or}`, subject: c.crime.victim };
    },
    re: (l) => `^(?:${l.re.THING}) (?:died|went) at (${l.re.HOR})$`,
    read: (m, { lx }) => ({ props: [{ k: 'WINDOW', hours: (m[1] as string).split(/, | or /).map((x) => lx.hour.get(x) as number) }], subject: lx.c.crime.victim }),
  },
  {
    kinds: ['ALIVE'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'ALIVE'>;
      return { text: `${S(c, ref, x.victim)} was seen at ${placeName(c, x.place)} at ${hourWord(x.hour as Hour)}`, subject: x.victim };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) was seen at (${l.re.PL}) at (${l.re.H})$`,
    read: (m, { lx, ref }) => {
      const v = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'ALIVE', victim: v, place: place(lx, m[2] as string), hour: lx.hour.get(m[3] as string) as number }], subject: v };
    },
  },
  // A claim confirmed (docs/53, addendum): "Coffin backed up Ashby: he was at the Thalia at eleven, with Feeney."
  {
    kinds: ['CONFIRMS'],
    joins: (a, b, run) => {
      const x = a as P<'CONFIRMS'>;
      const y = b as P<'CONFIRMS'>;
      return x.person === y.person && x.place === y.place && same(x.by, y.by) && same(x.company, y.company) && later(b, run);
    },
    say: (ps, c) => {
      const x = ps[0] as P<'CONFIRMS'>;
      const comp = x.company === undefined ? '' : x.company.length ? `, with ${ns(c, x.company)}` : ', alone';
      return { text: `${cap(srcSaid(c, x.by))} backed up ${nameOf(c, x.person)}: ${he(c, x.person)} was at ${placeName(c, x.place)} at ${hs(ps.map((y) => (y as P<'CONFIRMS'>).hour))}${comp}`, subject: null };
    },
    re: (l) => `^(${l.re.SRC}) backed up (${l.re.NAME}): ${l.re.PRON} was at (${l.re.PL}) at (${l.re.HS})(?:, with (${l.re.NS})|, (alone))?$`,
    read: (m, { lx }) => {
      const by = srcRead(lx, m[1] as string);
      const p = person(lx, m[2] as string);
      const company = m[5] ? names(lx, m[5]) : m[6] ? [] : undefined;
      return { props: hours(lx, m[4] as string).map((h) => ({ k: 'CONFIRMS', person: p, place: place(lx, m[3] as string), hour: h, ...(company ? { company } : {}), by }) as Prop), subject: null };
    },
  },
  // Somebody placed on somebody's word (docs/53, addendum): "According to Coffin, Feeney and Ashby were at the Thalia at eleven."
  {
    kinds: ['PLACED'],
    joins: (a, b, run) => {
      const x = a as P<'PLACED'>;
      const y = b as P<'PLACED'>;
      if (!same(x.by, y.by) || x.place !== y.place) return false;
      const people = new Set(run.map((z) => (z as P<'PLACED'>).person));
      const hoursOf = new Set(run.map((z) => (z as P<'PLACED'>).hour));
      // One of the two lists at a time: the people at one hour, or one person's hours.
      if (hoursOf.size === 1 && x.hour === y.hour && !people.has(y.person)) return true;
      if (people.size === 1 && x.person === y.person && later(b, run)) return true;
      return false;
    },
    say: (ps, c) => {
      const xs = ps as P<'PLACED'>[];
      const x = xs[0] as P<'PLACED'>;
      const people = [...new Set(xs.map((y) => y.person))];
      const hrs = [...new Set(xs.map((y) => y.hour))];
      return { text: `According to ${srcSaid(c, x.by)}, ${ns(c, people)} ${people.length > 1 ? 'were' : 'was'} at ${placeName(c, x.place)} at ${hs(hrs)}`, subject: null };
    },
    re: (l) => `^According to (${l.re.SRC}), (${l.re.NS}) (?:was|were) at (${l.re.PL}) at (${l.re.HS})$`,
    read: (m, { lx }) => {
      const by = srcRead(lx, m[1] as string);
      const who = names(lx, m[2] as string);
      const hrs = hours(lx, m[4] as string);
      const pl = place(lx, m[3] as string);
      const out: Prop[] = who.length > 1 ? who.map((p) => ({ k: 'PLACED', person: p, place: pl, hour: hrs[0] as number, by }) as Prop) : hrs.map((h) => ({ k: 'PLACED', person: who[0] as Id, place: pl, hour: h, by }) as Prop);
      return { props: out, subject: null };
    },
  },
  // docs/59 item 3: somebody gone by an hour, on the word of whoever kept the place: "According to Hauck, Bledsoe was not at Moskowitz’s at ten."
  {
    kinds: ['AWAY'],
    joins: (a, b, run) => {
      const x = a as P<'AWAY'>;
      const y = b as P<'AWAY'>;
      const people = new Set(run.map((z) => (z as P<'AWAY'>).person));
      return same(x.by, y.by) && x.place === y.place && x.hour === y.hour && !people.has(y.person);
    },
    say: (ps, c) => {
      const xs = ps as P<'AWAY'>[];
      const x = xs[0] as P<'AWAY'>;
      const people = xs.map((y) => y.person);
      return { text: `According to ${srcSaid(c, x.by)}, ${ns(c, people)} ${people.length > 1 ? 'were' : 'was'} not at ${placeName(c, x.place)} at ${hourWord(x.hour as Hour)}`, subject: null };
    },
    re: (l) => `^According to (${l.re.SRC}), (${l.re.NS}) (?:was|were) not at (${l.re.PL}) at (${l.re.H})$`,
    read: (m, { lx }) => {
      const by = srcRead(lx, m[1] as string);
      const pl = place(lx, m[3] as string);
      const h = lx.hour.get(m[4] as string) as number;
      return { props: names(lx, m[2] as string).map((p) => ({ k: 'AWAY', person: p, place: pl, hour: h, by }) as Prop), subject: null };
    },
  },
  // docs/59 item 3: hours on somebody's word alone: "Only Bellucci had said where he was at ten."
  {
    kinds: ['UNBACKED'],
    say: (ps, c) => {
      const x = ps[0] as P<'UNBACKED'>;
      return { text: `Only ${nameOf(c, x.person)} had said where ${he(c, x.person)} was at ${hs(x.hours)}`, subject: x.person };
    },
    re: (l) => `^Only (${l.re.NAME}) had said where ${l.re.PRON} was at (${l.re.HS})$`,
    read: (m, { lx }) => {
      const p = person(lx, m[1] as string);
      return { props: [{ k: 'UNBACKED', person: p, hours: hours(lx, m[2] as string) }], subject: p };
    },
  },
  // A collision (docs/53, addendum): "Corrigan said she was at the Corrigan flat at eleven, which did not agree with this: Ashby said…"
  {
    kinds: ['COLLIDES'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'COLLIDES'>;
      const w = x.with;
      const by = isSrc(w) ? `what ${srcSaid(c, w)} said` : `this: ${sayClause(c, [w], { subject: null, named: new Set() }).text}`;
      return { text: `${S(c, ref, x.person)} said${x.second ? ' the second time' : ''} ${he(c, x.person)} was at ${placeName(c, x.place)} at ${hourWord(x.hour as Hour)}, which did not agree with ${by}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) said( the second time)? ${l.re.PRON} was at (${l.re.PL}) at (${l.re.H}), which did not agree with (?:this: (.+)|what (${l.re.SRC}) said)$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      const w: Prop | Src = m[5] ? (readClause(lx, m[5], { subject: null, named: new Set() }).props[0] as Prop) : srcRead(lx, m[6] as string);
      return { props: [{ k: 'COLLIDES', person: p, place: place(lx, m[3] as string), hour: lx.hour.get(m[4] as string) as number, ...(m[2] ? { second: true } : {}), with: w }], subject: p };
    },
  },
  {
    kinds: ['NARROWS'],
    say: (ps) => ({ text: `That made it ${hourWord((ps[0] as P<'NARROWS'>).hour as Hour)}`, subject: null }),
    re: (l) => `^That made it (${l.re.H})$`,
    read: (m, { lx }) => ({ props: [{ k: 'NARROWS', hour: lx.hour.get(m[1] as string) as number }], subject: null }),
  },
  {
    kinds: ['LEFT'],
    say: (ps, c) => {
      const x = ps[0] as P<'LEFT'>;
      if (x.people) return { text: `That left ${ns(c, x.people)}, with the hours still open from ${hourWord(x.hours[0] as Hour)} to ${hourWord(x.hours[x.hours.length - 1] as Hour)}`, subject: null };
      return { text: `That left one person who could have ${accessWords(c)} and had nobody to back them up at ${hs(x.hours)}${x.seen ? ', seen on the street where it happened' : ''}`, subject: null };
    },
    re: (l) => `^That left (?:(${l.re.NS}), with the hours still open from (${l.re.H}) to (${l.re.H})|one person who could have ${l.re.ACC} and had nobody to back them up at (${l.re.HS})(, seen on the street where it happened)?)$`,
    read: (m, { lx }) => {
      if (m[1]) return { props: [{ k: 'LEFT', people: names(lx, m[1]), hours: [lx.hour.get(m[2] as string) as number, lx.hour.get(m[3] as string) as number] }], subject: null };
      return { props: [{ k: 'LEFT', hours: hours(lx, m[4] as string), ...(m[5] ? { seen: true } : {}) }], subject: null };
    },
  },
  {
    kinds: ['ADMIT'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'ADMIT'>;
      return { text: `${S(c, ref, x.person)} owned up to being at ${placeName(c, x.place)}${x.hour !== undefined ? ` at ${hourWord(x.hour as Hour)}` : ''}${x.witness ? ` with ${nameOf(c, x.witness)}` : ''}${x.claimed ? ` instead of ${placeName(c, x.claimed)}` : ''}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) owned up to being at (${l.re.PL})(?: at (${l.re.H}))?(?: with (${l.re.NAME}))?(?: instead of (${l.re.PL}))?$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'ADMIT', person: p, place: place(lx, m[2] as string), ...(m[3] ? { hour: lx.hour.get(m[3]) as number } : {}), ...(m[4] ? { witness: person(lx, m[4]) } : {}), ...(m[5] ? { claimed: place(lx, m[5]) } : {}) }], subject: p };
    },
  },
  {
    kinds: ['REFUSE'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'REFUSE'>;
      return { text: `${S(c, ref, x.person)} would not say where ${he(c, x.person)} was${x.hour !== undefined ? ` at ${hourWord(x.hour as Hour)}` : ''}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) would not say where ${l.re.PRON} was(?: at (${l.re.H}))?$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'REFUSE', person: p, ...(m[2] ? { hour: lx.hour.get(m[2]) as number } : {}) }], subject: p };
    },
  },
  {
    kinds: ['SECOND'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'SECOND'>;
      return { text: `${S(c, ref, x.person)} changed the answer to ${placeName(c, x.place)}${x.hour !== undefined ? ` at ${hourWord(x.hour as Hour)}` : ''}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) changed the answer to (${l.re.PL})(?: at (${l.re.H}))?$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'SECOND', person: p, place: place(lx, m[2] as string), ...(m[3] ? { hour: lx.hour.get(m[3]) as number } : {}) }], subject: p };
    },
  },
  {
    kinds: ['CRACK'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'CRACK'>;
      return { text: `${S(c, ref, x.person)} owned up and said ${victimOf(c).short} was with ${entryLabel(c, x.to)} at ${placeName(c, x.place)}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) owned up and said (?:${l.re.THING}) was with (${l.re.E}) at (${l.re.PL})$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'CRACK', person: p, to: lx.entry.get(m[2] as string) ?? (m[2] as string), place: place(lx, m[3] as string) }], subject: p };
    },
  },
  {
    kinds: ['HELD'],
    say: (ps, c) => {
      const x = ps[0] as P<'HELD'>;
      // docs/53, addendum: what I told them and whose it was, never "the line put to": "Grasso did not
      // budge on ten when I told her what Coffin said about the Thalia (it agreed with what they had said)".
      const told = x.by ? ` when I told ${pronOf(c, x.person).him} what ${nameOf(c, x.by)} said` : x.place ? ` when I told ${pronOf(c, x.person).him} what was said` : '';
      return { text: `${nameOf(c, x.person)} did not budge on ${hourWord(x.hour as Hour)}${told}${x.place ? ` about ${placeName(c, x.place)}` : ''}${x.why ? ` (${WHY[x.why]})` : ''}`, subject: null };
    },
    re: (l) => `^(${l.re.NAME}) did not budge on (${l.re.H})(?: when I told (?:him|her|them|it) what (?:(${l.re.NAME}) said|was said))?(?: about (${l.re.PL}))?(?: \\((.+)\\))?$`,
    read: (m, { lx }) => {
      const why = m[5] ? (Object.entries(WHY).find(([, v]) => v === m[5])?.[0] as HeldWhy | undefined) : undefined;
      if (m[5] && !why) throw new Error(`plain: no reason "${m[5]}"`);
      return {
        props: [{ k: 'HELD', person: person(lx, m[1] as string), hour: lx.hour.get(m[2] as string) as number, ...(why ? { why } : {}), ...(m[3] ? { by: person(lx, m[3]) } : {}), ...(m[4] ? { place: place(lx, m[4]) } : {}) }],
        subject: null,
      };
    },
  },
  {
    kinds: ['MOTIVE'],
    joins: (a, b) => (a as P<'MOTIVE'>).person !== '*' && (b as P<'MOTIVE'>).person !== '*' && (a as P<'MOTIVE'>).said === (b as P<'MOTIVE'>).said,
    say: (ps, c, ref) => {
      const xs = ps as P<'MOTIVE'>[];
      const x = xs[0] as P<'MOTIVE'>;
      if (x.person === '*') return { text: 'Everybody in the papers had a reason', subject: null };
      const who = xs.length === 1 ? S(c, ref, x.person) : ns(c, xs.map((y) => y.person));
      // (docs/53, addendum: the client said it, or didn't, never "the office had given".)
      const cl = nameOf(c, c.client);
      const said = x.said === 'office' ? `, as ${cl} had said` : x.said === 'not-office' ? ` that ${cl} had not mentioned` : '';
      return { text: `${who} had ${xs.length > 1 ? 'reasons' : 'a reason'}${said}`, subject: xs.length === 1 ? x.person : null };
    },
    re: (l) => `^(?:(Everybody) in the papers had a reason|(${l.re.NS}|${l.re.PRON}) had (?:a reason|reasons)(, as (?:${l.re.NAME}) had said| that (?:${l.re.NAME}) had not mentioned)?)$`,
    read: (m, { lx, ref }) => {
      if (m[1]) return { props: [{ k: 'MOTIVE', person: '*' }], subject: null };
      const who = /^(?:he|she|it)$/i.test(m[2] as string) ? [subj(lx, ref, m[2] as string)] : names(lx, m[2] as string);
      const said = m[3]?.startsWith(', as ') ? 'office' : m[3] ? 'not-office' : undefined;
      return { props: who.map((p) => ({ k: 'MOTIVE', person: p, ...(said ? { said } : {}) }) as Prop), subject: who.length === 1 ? (who[0] as Id) : null };
    },
  },
  {
    kinds: ['POINTER'],
    say: (ps, c) => {
      const x = ps[0] as P<'POINTER'>;
      // The street a remark put somebody on is the scene's: said as the street it is.
      // docs/53, addendum: who sent me, never "the office pointed at": "Mrs. Krantz sent me to Feeney",
      // "Mrs. Krantz said Feeney looked after Fritz", "The Prentiss flat was on Stuyvesant Street".
      if (x.why === 'street') return { text: `${cap(placeName(c, x.to))} was on ${c.places.find((p) => p.id === x.to)?.street ?? ''}`, subject: null };
      const to = c.people.some((p) => p.id === x.to) ? nameOf(c, x.to) : placeName(c, x.to);
      const from = x.from === 'office' ? nameOf(c, c.client) : x.from === 'remark' ? 'What I heard in passing' : x.from === 'admit' ? 'The story they owned up to' : 'The place they named instead';
      return { text: x.why === 'keeper' ? `${from} said ${to} looked after ${victimOf(c).short}` : `${from} sent me to ${to}`, subject: null };
    },
    re: (l) => `^(?:(${l.re.NAME}|What I heard in passing|The place they named instead|The story they owned up to) (?:(said) (${l.re.NAME}) looked after (?:${l.re.THING})|sent me to (?:(${l.re.NAME})|(${l.re.PL})))|(${l.re.PL}) was on (?:${l.re.STREET}))$`,
    read: (m, { lx }) => {
      if (m[6]) return { props: [{ k: 'POINTER', from: 'remark', to: place(lx, m[6]), why: 'street' }], subject: null };
      const from = /^What I heard/.test(m[1] as string) ? 'remark' : /^The place they named/.test(m[1] as string) ? 'second' : /^The story they owned up/.test(m[1] as string) ? 'admit' : 'office';
      const to = m[3] ? person(lx, m[3]) : m[4] ? person(lx, m[4]) : place(lx, m[5] as string);
      const why = m[2] ? 'keeper' : from === 'remark' ? 'street' : from === 'second' ? 'watcher' : from === 'admit' ? 'witness' : m[4] ? 'pointer' : 'venue';
      return { props: [{ k: 'POINTER', from, to, why }], subject: null };
    },
  },
  {
    kinds: ['HANDOVER'],
    say: (ps, c) => {
      const x = ps[0] as P<'HANDOVER'>;
      const what = x.thing ? victimOf(c).short : `something${x.what ? ` ${x.what}` : ''}`;
      return { text: `${cap(what)} went to ${entryLabel(c, x.to)} at ${placeName(c, x.place)}${x.hour !== undefined ? ` at ${hourWord(x.hour as Hour)}` : ''}`, subject: null };
    },
    re: (l) => `^(?:(${l.re.THING})|Something( alive| small)?) went to (${l.re.E}) at (${l.re.PL})(?: at (${l.re.H}))?$`,
    read: (m, { lx }) => ({
      props: [
        {
          k: 'HANDOVER',
          to: lx.entry.get(m[3] as string) ?? (m[3] as string),
          place: place(lx, m[4] as string),
          ...(m[5] ? { hour: lx.hour.get(m[5]) as number } : {}),
          ...(m[1] ? { thing: lx.c.crime.victim } : {}),
          ...(m[2] ? { what: (m[2] as string).trim() as 'alive' | 'small' } : {}),
        },
      ],
      subject: null,
    }),
  },
  {
    kinds: ['PRESENT'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'PRESENT'>;
      return { text: `${S(c, ref, x.person)} turned out to be at ${placeName(c, x.place)}`, subject: x.person };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) turned out to be at (${l.re.PL})$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'PRESENT', person: p, place: place(lx, m[2] as string) }], subject: p };
    },
  },
  {
    kinds: ['UNSPOKEN'],
    say: (ps, c) => {
      const x = ps[0] as P<'UNSPOKEN'>;
      return { text: `Nobody had said where ${ns(c, x.people)} ${x.people.length > 1 ? 'were' : 'was'} at ${hs(x.hours)}`, subject: null };
    },
    re: (l) => `^Nobody had said where (${l.re.NS}) (?:was|were) at (${l.re.HS})$`,
    read: (m, { lx }) => ({ props: [{ k: 'UNSPOKEN', people: names(lx, m[1] as string), hours: hours(lx, m[2] as string) }], subject: null }),
  },
  {
    kinds: ['HOLD'],
    // docs/53, addendum: what I knew and from whom, never "evenings from" and "lists from".
    say: (ps, c) => {
      const x = ps[0] as P<'HOLD'>;
      return { text: `I knew ${[x.evenings.length ? `where ${ns(c, x.evenings)} had been` : '', x.lists.length ? `who ${ns(c, x.lists)} had seen` : ''].filter(Boolean).join(' and ')}`, subject: null };
    },
    re: (l) => `^I knew (?:where (${l.re.NS}) had been)?(?: and )?(?:who (${l.re.NS}) had seen)?$`,
    read: (m, { lx }) => ({ props: [{ k: 'HOLD', evenings: m[1] ? names(lx, m[1]) : [], lists: m[2] ? names(lx, m[2]) : [] }], subject: null }),
  },
  {
    kinds: ['MISSING'],
    say: (ps, c) => ({ text: `I did not know yet where ${ns(c, (ps[0] as P<'MISSING'>).people)} had been`, subject: null }),
    re: (l) => `^I did not know yet where (${l.re.NS}) had been$`,
    read: (m, { lx }) => ({ props: [{ k: 'MISSING', people: names(lx, m[1] as string) }], subject: null }),
  },
  {
    kinds: ['RELATION'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'RELATION'>;
      return { text: `${S(c, ref, x.client)} had a tie to ${nameOf(c, x.victim)}`, subject: x.client };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) had a tie to (${l.re.NAME})$`,
    read: (m, { lx, ref }) => {
      const p = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'RELATION', client: p, victim: person(lx, m[2] as string) }], subject: p };
    },
  },
  {
    kinds: ['FOUND'],
    say: (ps, c, ref) => {
      const x = ps[0] as P<'FOUND'>;
      return { text: `${S(c, ref, x.victim)} was found dead at ${placeName(c, x.place)}${x.finder ? ` by ${nameOf(c, x.finder)}` : ''}`, subject: x.victim };
    },
    re: (l) => `^(${l.re.NAME}|${l.re.PRON}) was found dead at (${l.re.PL})(?: by (${l.re.NAME}))?$`,
    read: (m, { lx, ref }) => {
      const v = subj(lx, ref, m[1] as string);
      return { props: [{ k: 'FOUND', victim: v, place: place(lx, m[2] as string), ...(m[3] ? { finder: person(lx, m[3]) } : {}) }], subject: v };
    },
  },
  {
    kinds: ['GONE'],
    say: (ps, c) => {
      const x = ps[0] as P<'GONE'>;
      return { text: `${cap(victimOf(c).short)} was gone from ${placeName(c, x.place)}`, subject: null };
    },
    re: (l) => `^(?:${l.re.THING}) was gone from (${l.re.PL})$`,
    read: (m, { lx }) => ({ props: [{ k: 'GONE', thing: lx.c.crime.victim, place: place(lx, m[1] as string) }], subject: null }),
  },
  {
    kinds: ['MEANS'],
    say: (ps, c) => {
      const x = ps[0] as P<'MEANS'>;
      if (x.how === 'origin') return { text: `The ${meansLabel(c)} came from ${placeName(c, x.place)}`, subject: null };
      // docs/59 item 3: what a find concludes: whoever did it had been there first.
      if (x.how === 'first') return { text: `Whoever did it had been at ${placeName(c, x.place)}${x.hours?.length ? ` at ${hs(x.hours)}` : ''} first`, subject: null };
      if (x.how === 'told') return { text: `${nameOf(c, c.client)} told the room at ${placeName(c, x.place)} ${wayKnown(c)} at ${hs(x.hours ?? [])}`, subject: null };
      if (x.how === 'party') return { text: `${nameOf(c, c.client)} had people in at ${placeName(c, x.place)} at ${hs(x.hours ?? [])}${x.who ? `, where ${nameOf(c, x.who)} lodged` : ''}`, subject: null };
      return { text: `The spare key was at ${placeName(c, x.place)}${x.who ? `, in ${nameOf(c, x.who)}’s keeping` : ''}`, subject: null };
    },
    re: (l) => `^(?:The (?:${l.re.MEANS}) came from (${l.re.PL})|(?:${l.re.NAME}) told the room at (${l.re.PL}) ${l.re.WAY} at (${l.re.HS})|(?:${l.re.NAME}) had people in at (${l.re.PL}) at (${l.re.HS})(?:, where (${l.re.NAME}) lodged)?|The spare key was at (${l.re.PL})(?:, in (${l.re.NAME})’s keeping)?|Whoever did it had been at (${l.re.PL})(?: at (${l.re.HS}))? first)$`,
    read: (m, { lx }) => {
      if (m[9]) return { props: [{ k: 'MEANS', how: 'first', place: place(lx, m[9]), ...(m[10] ? { hours: hours(lx, m[10]) } : {}) }], subject: null };
      if (m[1]) return { props: [{ k: 'MEANS', how: 'origin', place: place(lx, m[1]) }], subject: null };
      if (m[2]) return { props: [{ k: 'MEANS', how: 'told', place: place(lx, m[2]), hours: hours(lx, m[3] as string) }], subject: null };
      if (m[4]) return { props: [{ k: 'MEANS', how: 'party', place: place(lx, m[4]), hours: hours(lx, m[5] as string), ...(m[6] ? { who: person(lx, m[6]) } : {}) }], subject: null };
      return { props: [{ k: 'MEANS', how: 'spare', place: place(lx, m[7] as string), ...(m[8] ? { who: person(lx, m[8]) } : {}) }], subject: null };
    },
  },
];

const BY_KIND = new Map<Prop['k'], Clause>();
for (const cl of CLAUSES) for (const k of cl.kinds) BY_KIND.set(k, cl);

/** One clause, said. */
function sayClause(c: BoardCase, ps: Prop[], ref: Ref): Said {
  const cl = BY_KIND.get((ps[0] as Prop).k);
  if (!cl) throw new Error(`plain: no clause for ${(ps[0] as Prop).k}`);
  return cl.say(ps, c, ref);
}

const RE = new WeakMap<Lexicon, { cl: Clause; re: RegExp }[]>();

/** One clause, read back: the first grammar that takes all of it. */
function readClause(lx: Lexicon, text: string, ref: Ref): { props: Prop[]; subject: Id | null } {
  let rs = RE.get(lx);
  if (!rs) {
    rs = CLAUSES.map((cl) => ({ cl, re: new RegExp(cl.re(lx)) }));
    RE.set(lx, rs);
  }
  const t = cap(text);
  for (const { cl, re } of rs) {
    const m = re.exec(t);
    if (m) return cl.read(m, { lx, ref });
  }
  throw new Error(`plain: no grammar reads "${text}"`);
}

/* ------------------------------------------------------------------ *
 * Composites, and pages.
 * ------------------------------------------------------------------ */

/** A composite's clauses: its propositions in runs, each run one clause, in order. */
function runsOf(ps: readonly Prop[]): Prop[][] {
  const out: Prop[][] = [];
  for (const p of ps) {
    const run = out[out.length - 1];
    const cl = BY_KIND.get(p.k);
    if (run && (run[0] as Prop).k === p.k && cl?.joins?.(run[0] as Prop, p, run)) run.push(p);
    else out.push([p]);
  }
  return out;
}

const SEP: Record<string, string> = { and: ', and ', rhythm: ', and ', who: ', and ', 'and-he': ', and ', semi: '; ', but: ', but ' };

/** The words a clause may open on that go lower case after a comma (never a name, never "I"). */
const LOWER = /^(?:He|She|It|The|That|Nobody|Everybody|Something|According|What)\b/;

function sayComposite(c: BoardCase, comp: Composite, ref: Ref): string {
  if (comp.parts && comp.parts.length === 2 && (comp.shape === 'PAIR' || comp.shape === 'ATTACH' || comp.shape === 'ADMIT-CHECK')) {
    const a = sayComposite(c, comp.parts[0] as Composite, ref);
    const b = sayComposite(c, comp.parts[1] as Composite, ref);
    return `${a}${SEP[comp.join ?? 'and'] ?? ', and '}${LOWER.test(b) ? (b[0] as string).toLowerCase() + b.slice(1) : b}`;
  }
  const out: string[] = [];
  for (const run of runsOf(comp.props)) {
    const s = sayClause(c, run, ref);
    out.push(out.length ? (LOWER.test(s.text) ? (s.text[0] as string).toLowerCase() + s.text.slice(1) : s.text) : s.text);
    ref.subject = s.subject;
    ref.named = new Set(run.flatMap((p) => peopleIn(c, p)));
  }
  return out.join(', and ');
}

/** A composite said plainly, as one sentence. */
export function plainComposite(c: BoardCase, comp: Composite, ref: Ref = { subject: null, named: new Set() }): string {
  return `${cap(sayComposite(c, comp, ref))}.`;
}

/** The plain page: every fact the page says, a sentence a composite, a paragraph as the page has them. */
export function plainPage(c: BoardCase, page: Page): Block[] {
  const ref: Ref = { subject: null, named: new Set() };
  const out: Block[] = [];
  let at = -1;
  for (const u of page.board?.units ?? []) {
    if (u.kind !== 'fact') continue;
    const said = (u.bones ?? []).map((b) => plainComposite(c, b, ref)).join(' ');
    if (!said) continue;
    if (u.para !== at) {
      out.push({ kind: 'prose', text: said, voice: 'narrator' });
      at = u.para;
    } else {
      const b = out[out.length - 1] as Block & { kind: 'prose' };
      b.text = `${b.text} ${said}`;
    }
  }
  return out;
}

/** The bones a page says, in order: what its plain page must read back to. */
export function bonesOfPage(page: Page): Prop[] {
  return (page.board?.units ?? []).flatMap((u) => (u.kind === 'fact' ? (u.bones ?? []).flatMap((b) => b.props) : []));
}

/** A plain page read back to its propositions, clause by clause, with the same reference rule. */
export function parsePlain(c: BoardCase, blocks: readonly Block[]): Prop[] {
  const lx = lexicon(c);
  const ref: Ref = { subject: null, named: new Set() };
  const out: Prop[] = [];
  for (const b of blocks) {
    if (b.kind !== 'prose') continue;
    for (const s of sentencesOf(b.text)) {
      const body = s.replace(/\.$/, '');
      for (const clause of body.split(/, and |; |, but /)) {
        const r = readClause(lx, clause, ref);
        out.push(...r.props);
        ref.subject = r.subject;
        ref.named = new Set(r.props.flatMap((p) => peopleIn(c, p)));
      }
    }
  }
  return out;
}

/** The round trip on one page: what the bones say, what the plain page reads back to, and whether they're the same. */
export function roundTrip(c: BoardCase, page: Page): { ok: boolean; bones: string[]; read: string[]; error?: string } {
  const bones = bonesOfPage(page).map(canon);
  try {
    const read = parsePlain(c, plainPage(c, page)).map(canon);
    return { ok: bones.length === read.length && bones.every((x, i) => x === read[i]), bones, read };
  } catch (e) {
    return { ok: false, bones, read: [], error: (e as Error).message };
  }
}

export type { Ref };
