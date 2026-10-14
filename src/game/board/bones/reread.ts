/**
 * docs/52 §4: the round trip on the voiced page. A voicing may reorder or fold
 * a composite's arguments, never drop or add a fact. Two checks:
 *
 * - **Voiced composites** (`content/board/voicings.json`): the composite's
 *   words, as its voicing said them, are read back through the voicing's
 *   template to its arguments, and the arguments to propositions, which must
 *   be the composite's. A part folded into the voicing (the watcher of their
 *   own list, the person whose evening is being confirmed, an "admission"
 *   that reads as "had said") is taken from where it was folded: the page's
 *   speaker, its place, the composite itself. A pair's words must be its two
 *   parts', joined as its voicing joins them.
 * - **The writer's own words** (a card, a person's answer, the office): every
 *   person, place and hour the unit's propositions name is named in its words
 *   (by name, by the engine's marked pronoun, as "here", "home", "my place",
 *   "I"), and no person is named that its propositions don't.
 *
 * `VOICED.check` turns the first on (the composer calls `checkVoiced` as it
 * says each composite); `scripts/roundtrip.ts` reads the tally.
 */

import { nameOf, personOf, placeName, pronOf, type BoardCase, type PersonId, type PlaceId } from '../model.js';
import { entryName, listOf } from '../knowledge.js';
import type { Unit } from '../plan/types.js';
import { accessPhrase, shortOther } from './phrase.js';
import { roleOf } from '../plan/refer.js';
import { maskPlaces } from '../plan/measure.js';
import { canon } from './extract.js';
import { lexicon, parsePlain, type Lexicon } from './plain.js';
import type { Composite, Entry, Id, Prop, Shape, Src } from './types.js';
import { SCHEMA, type ArgType } from './schema.js';
import { fill, voicingById } from './voice.js';

export const VOICED: { check: boolean } = { check: false };

const T = { voiced: 0, voicedOk: 0, flesh: 0, fleshOk: 0, misses: [] as string[] };

export function voicedTally(): typeof T {
  return { ...T, misses: [...T.misses] };
}

type P<K extends Prop['k']> = Extract<Prop, { k: K }>;
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lc = (s: string): string => (s ? (s[0] as string).toLowerCase() + s.slice(1) : s);

/** Where the composite was said: the case, the room, whose page it is. */
export interface VCtx {
  c: BoardCase;
  here: PlaceId;
  /** Whose answer or evening the page is (the account's person, the list's watcher), for what a voicing folds. */
  speaker?: PersonId;
}

/* ------------------------------------------------------------------ *
 * Reading the voice's words back: people, places, hours, lists.
 * ------------------------------------------------------------------ */

function personV(c: BoardCase, s: string): Id {
  const m = /^(?:he|she|him|her|his|it|its|He|She|Him|Her|His|It|Its)⁣(\d+)⁤$/.exec(s.trim());
  if (m) {
    const p = c.people[Number(m[1])];
    if (p) return p.id;
  }
  const t = s.trim();
  const p = c.people.find((x) => x.short === t || x.short === t.replace(/^the /, 'The '));
  if (!p) throw new Error(`voiced: nobody "${s}"`);
  return p.id;
}

/** "here", "home", "at the Thalia", "the Thalia". */
function placeV(c: BoardCase, s: string, v: VCtx, who?: Id): PlaceId {
  const t = s.trim().replace(/^[Aa]t /, '');
  if (/^[Hh]ere$/.test(t)) return v.here;
  if (/^[Hh]ome$/.test(t)) {
    const h = who ? personOf(c, who)?.home : undefined;
    if (!h) throw new Error(`voiced: whose home?`);
    return h;
  }
  const p = c.places.find((x) => placeName(c, x.id) === t || placeName(c, x.id).toLowerCase() === t.toLowerCase());
  if (!p) throw new Error(`voiced: no place "${s}"`);
  return p.id;
}

const HOURWORDS: Record<string, number> = { seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

function hourV(s: string): number {
  const t = s.trim().toLowerCase().replace(/ o’clock$/, '');
  const h = HOURWORDS[t];
  if (h === undefined) throw new Error(`voiced: no hour "${s}"`);
  return h;
}

/** A list said "A, B and C" (or "A or B"), split by the items a slot may hold. */
function listV(s: string, one: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`^(${one})(?:, | and | or |$)`);
  let rest = s.trim();
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) throw new Error(`voiced: can't read "${rest}" as a list`);
    out.push(m[1] as string);
    rest = rest.slice((m[0] as string).length);
  }
  return out;
}

const MARK = '(?:he|she|him|her|his|it|its)⁣\\d+⁤';

function hoursV(lx: Lexicon, s: string): number[] {
  return listV(s, `(?:${lx.re.H})(?: o’clock)?`).map(hourV);
}

function namesV(c: BoardCase, lx: Lexicon, s: string): Id[] {
  return listV(s, `${lx.re.NAME}|${MARK}`).map((x) => personV(c, x));
}

/** What a watcher's voice calls the people on a list: names, "Mr. Prentiss telling the room…", "…, still telling it". */
function entryAlt(c: BoardCase): { re: string; of: Map<string, Entry> } {
  const of = new Map<string, Entry>();
  for (const p of c.people) of.set(p.short, p.id);
  for (const o of c.others ?? []) {
    const full = entryName(c, { other: o.id });
    of.set(full, `other:${o.id}`);
    of.set(shortOther(full), `other:${o.id}`);
    const head = full.replace(/ (telling|complaining) .*$/, '');
    of.set(`${head}, still telling it`, `other:${o.id}`);
    of.set(`${head}, still complaining`, `other:${o.id}`);
  }
  const looks = c.lists.flatMap((l) => Object.values(l.entries).flat()).flatMap((e) => ('look' in e ? [e.look] : []));
  for (const l of looks) {
    of.set(entryName(c, { look: l }), `look:${l}`);
    of.set(`somebody ${l}`, `look:${l}`);
  }
  const re = [...of.keys()].sort((a, b) => b.length - a.length).map(esc).join('|');
  return { re, of };
}

function srcFold(c: BoardCase, name: string, like?: Src): Src {
  const id = personV(c, name);
  if (id === c.client) return { k: 'given' };
  if (personOf(c, id)?.role === 'watcher') return { k: 'list', who: id };
  return { k: like && (like.k === 'admit' || like.k === 'claim') ? like.k : 'claim', who: id };
}

/** "here at eleven, with Feeney", "home at eight and nine", "at the Thalia at ten" (a run of them). */
function spansV(c: BoardCase, lx: Lexicon, s: string, v: VCtx, who: Id): { place: PlaceId; hours: number[]; company?: Id[] }[] {
  const AT = `(?:[Hh]ere|[Hh]ome|(?:[Aa]t )?(?:${lx.re.PL}))`;
  const one = new RegExp(`^(${AT}) at ((?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*)(?:, with ((?:${lx.re.NAME})(?:(?:, | and )(?:${lx.re.NAME}))*))?(?:,? and at ((?:${lx.re.H}))(?:, with ((?:${lx.re.NAME})(?:(?:, | and )(?:${lx.re.NAME}))*))?)?(?:,? and |, |$)`);
  const out: { place: PlaceId; hours: number[]; company?: Id[] }[] = [];
  let rest = s.trim();
  while (rest.length) {
    const m = one.exec(rest);
    if (!m) throw new Error(`voiced: can't read "${rest}" as places and hours`);
    const place = placeV(c, m[1] as string, v, who);
    out.push({ place, hours: listV(m[2] as string, lx.re.H).map(hourV), ...(m[3] ? { company: namesV(c, lx, m[3]) } : {}) });
    if (m[4]) out.push({ place, hours: [hourV(m[4])], ...(m[5] ? { company: namesV(c, lx, m[5]) } : {}) });
    rest = rest.slice((m[0] as string).length);
  }
  return out;
}

/** A collision's claim and its breaker, read back. */
function claimV(c: BoardCase, lx: Lexicon, s: string): { person: Id; place: PlaceId; hour: number } {
  const m = new RegExp(`^(${lx.re.NAME}) said (home|${lx.re.PL}) at (${lx.re.H})$`).exec(s);
  if (!m) throw new Error(`voiced: no claim in "${s}"`);
  const person = personV(c, m[1] as string);
  const place = m[2] === 'home' ? (personOf(c, person)?.home as PlaceId) : placeV(c, m[2] as string, { c, here: '' });
  return { person, place, hour: hourV(m[3] as string) };
}

function breakerV(c: BoardCase, lx: Lexicon, s: string, v: VCtx): Prop {
  const t = s.trim();
  const AT = `(?:here|at (?:${lx.re.PL}))`;
  const E = entryAlt(c);
  let m = new RegExp(`^(${lx.re.NAME}) had (nobody|${MARK}|${lx.re.NAME}|(?:(?:${E.re})(?:(?:, | and )(?:${E.re}))*)) (${AT}) at ((?:${lx.re.H}) o’clock)(, and nobody else)?((?:; .+)*)$`).exec(t);
  if (m) {
    const watcher = personV(c, m[1] as string);
    const place = placeV(c, (m[3] as string).replace(/^at /, ''), v);
    const hour = hourV(m[4] as string);
    const people = m[2] === 'nobody' ? [] : new RegExp(`^(?:${MARK})$`).test(m[2] as string) ? [personV(c, m[2] as string)] : listV(m[2] as string, E.re).map((x) => E.of.get(x) ?? personV(c, x));
    const faces: Record<string, Id> = {};
    for (const f of (m[6] ?? '').split('; ').filter(Boolean)) {
      const k = new RegExp(`^the (.+) was (${lx.re.NAME})’s$`).exec(f);
      if (!k) throw new Error(`voiced: no face in "${f}"`);
      const look = c.lists.flatMap((l) => Object.values(l.entries).flat()).flatMap((e) => ('look' in e ? [e.look] : [])).find((l) => l.replace(/^(in|with) an? /, '') === k[1]);
      if (look) faces[look] = personV(c, k[2] as string);
    }
    return { k: 'LIST', watcher, place, hour, people, ...(m[5] ? { whole: true } : {}), ...(Object.keys(faces).length ? { faces } : {}) };
  }
  m = new RegExp(`^(${lx.re.NAME})(?: says (?:he|she) was (?:at )?|’s own account was )(here|${lx.re.PL}) at ((?:${lx.re.H}) o’clock), (?:with (.+)|alone)$`).exec(t);
  if (m) return { k: 'CLAIM', person: personV(c, m[1] as string), place: placeV(c, m[2] as string, v), hour: hourV(m[3] as string), company: m[4] ? namesV(c, lx, m[4]) : [] };
  m = new RegExp(`^(${lx.re.NAME}) passed (${lx.re.NAME}|${MARK}) on (${lx.re.STREET}) at (${lx.re.H})$`).exec(t);
  if (m) return { k: 'REMARK', speaker: personV(c, m[1] as string), saw: personV(c, m[2] as string), how: 'passed', where: m[3] as string, hour: hourV(m[4] as string) };
  m = new RegExp(`^(${lx.re.NAME}) had (${lx.re.NAME}|${MARK}) at (?:his|her) place at (${lx.re.H})$`).exec(t);
  if (m) {
    const speaker = personV(c, m[1] as string);
    return { k: 'REMARK', speaker, saw: personV(c, m[2] as string), how: 'had', where: (personOf(c, speaker)?.home ?? personOf(c, speaker)?.foundAt) as string, hour: hourV(m[3] as string) };
  }
  m = new RegExp(`^(${lx.re.NAME}|${MARK}) was (${AT}) at ((?:${lx.re.H}) o’clock)$`).exec(t);
  if (m) return { k: 'PLACED', person: personV(c, m[1] as string), place: placeV(c, m[2] as string, v), hour: hourV(m[3] as string), by: { k: 'given' } };
  throw new Error(`voiced: no breaker in "${s}"`);
}

/** The way in's sentences, read back: who could (by hour, when told) and who couldn't. */
function accessV(c: BoardCase, lx: Lexicon, yes: string, no: string, v: VCtx): Prop[] {
  const out: Prop[] = [];
  const NS = `(?:${lx.re.NAME})(?:(?:, | and )(?:${lx.re.NAME}))*`;
  if (yes) {
    const told = new RegExp(`^(${NS}) heard about (?:the key|the window) at (${lx.re.H})((?:, and (?:${NS}) at (?:${lx.re.H}))*)$`).exec(yes);
    if (told) {
      for (const p of namesV(c, lx, told[1] as string)) out.push({ k: 'ACCESS', person: p, had: true, hour: hourV(told[2] as string) });
      for (const g of (told[3] ?? '').split(', and ').filter(Boolean)) {
        const k = new RegExp(`^(${NS}) at (${lx.re.H})$`).exec(g);
        if (!k) throw new Error(`voiced: no way in "${g}"`);
        for (const p of namesV(c, lx, k[1] as string)) out.push({ k: 'ACCESS', person: p, had: true, hour: hourV(k[2] as string) });
      }
    } else {
      const ph = accessPhrase(c, true, false, v.here);
      const k = new RegExp(`^(${NS}) (${esc(ph)}|${esc(ph.replace(/^was\b/, 'were'))})$`).exec(yes);
      if (!k) throw new Error(`voiced: no way in "${yes}"`);
      for (const p of namesV(c, lx, k[1] as string)) out.push({ k: 'ACCESS', person: p, had: true });
    }
  }
  if (no) {
    const ph = accessPhrase(c, false, false, v.here);
    const forms = [ph, ph.replace(/^was\b/, 'were'), ph.replace(/^wasn’t\b/, 'weren’t'), 'hadn’t', 'wasn’t', 'weren’t', 'never did'];
    const k = new RegExp(`^(${NS}) (${forms.map(esc).join('|')})$`).exec(no);
    if (!k) throw new Error(`voiced: no way in "${no}"`);
    for (const p of namesV(c, lx, k[1] as string)) out.push({ k: 'ACCESS', person: p, had: false });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The voicings, read back: each turns its arguments into propositions.
 * ------------------------------------------------------------------ */

type Unargs = (a: Record<string, string>, comp: Composite, v: VCtx, lx: Lexicon) => Prop[];

const confirmedSpans: Unargs = (a, comp, v, lx) => {
  const x = comp.props[0] as P<'CONFIRMS'>;
  const by = srcFold(v.c, (a.src ?? '').replace(/ had( said)?$/, ''), x.by);
  return spansV(v.c, lx, a.spans as string, v, x.person).flatMap((sp) => sp.hours.map((h) => ({ k: 'CONFIRMS', person: x.person, place: sp.place, hour: h, ...(sp.company ? { company: sp.company } : {}), by }) as Prop));
};

const confirmedRest: Unargs = (a, comp, v, lx) => {
  const x = comp.props[0] as P<'CONFIRMS'>;
  const who = personV(v.c, a.him as string);
  const by = srcFold(v.c, a.by as string, x.by);
  return spansV(v.c, lx, a.spans as string, v, who).flatMap((sp) => sp.hours.map((h) => ({ k: 'CONFIRMS', person: who, place: sp.place, hour: h, ...(sp.company ? { company: sp.company } : {}), by }) as Prop));
};

const UNARGS: Record<string, Unargs> = {
  'list-hour/nobody': (a, comp, v, lx) => {
    const x = comp.props[0] as P<'LIST'>;
    const watcher = v.speaker ?? x.watcher;
    const place = listOf(v.c, watcher)?.place ?? x.place;
    const E = entryAlt(v.c);
    const people = listV(a.names as string, E.re).map((n) => E.of.get(n) as string);
    if (!/^nobody else(?: at all| that hour)?$/.test(a.nobody as string)) throw new Error('voiced: not "nobody else"');
    return hoursV(lx, lc(a.when as string)).map((h) => ({ k: 'LIST', watcher, place, hour: h, people, whole: true }) as Prop);
  },
  'confirmed/so': confirmedSpans,
  'confirmed/which': confirmedSpans,
  'confirmed/rest': confirmedRest,
  'confirmed/rest-held': (a, comp, v, lx) => {
    if (personV(v.c, a.name as string) !== personV(v.c, a.him as string)) throw new Error('voiced: whose evening?');
    return confirmedRest(a, comp, v, lx);
  },
  'confirmed/list': (a, _comp, v) => {
    const watcher = personV(v.c, a.watcher as string);
    return [{ k: 'CONFIRMS', person: personV(v.c, a.them as string), place: placeV(v.c, a.at as string, v), hour: hourV(a.hour as string), by: { k: 'list', who: watcher } }];
  },
  'confirmed/list-too': (a, _comp, v) => {
    const watcher = personV(v.c, a.watcher as string);
    const p = personV(v.c, a.name as string);
    if (personV(v.c, a.him as string) !== p) throw new Error('voiced: whom did the list have?');
    return [{ k: 'CONFIRMS', person: p, place: placeV(v.c, a.at as string, v), hour: hourV(a.hour as string), by: { k: 'list', who: watcher } }];
  },
  'confirmed/list-many': (a, _comp, v, lx) => {
    const watcher = personV(v.c, a.watcher as string);
    const place = listOf(v.c, watcher)?.place as PlaceId;
    return listV(a.pairs as string, `(?:${lx.re.NAME}) at (?:${lx.re.H})`).map((pr) => {
      const m = new RegExp(`^(${lx.re.NAME}) at (${lx.re.H})$`).exec(pr) as RegExpExecArray;
      return { k: 'CONFIRMS', person: personV(v.c, m[1] as string), place, hour: hourV(m[2] as string), by: { k: 'list', who: watcher } } as Prop;
    });
  },
  'collision/two': (a, comp, v, lx) => collisionV(a, comp, v, lx),
  'collision/but': (a, comp, v, lx) => collisionV(a, comp, v, lx),
  'collision/colon': (a, comp, v, lx) => collisionV(a, comp, v, lx),
  'own-word/for': (a, _comp, v, lx) => ownWordV(a, v, lx),
  'own-word/said': (a, _comp, v, lx) => ownWordV(a, v, lx),
  'own-word/recap': (a, _comp, v, lx) => {
    const c = v.c;
    const SAID = `(?:home|${lx.re.PL}) at (?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*`;
    const out: Prop[] = [];
    const re = new RegExp(`^(${lx.re.NAME})(?: said)? ((?:${SAID})(?: and (?:${SAID}))?)(?:, | and |$)`);
    let rest = a.owns as string;
    while (rest.length) {
      const m = re.exec(rest);
      if (!m) throw new Error(`voiced: can't read "${rest}"`);
      const p = personV(c, m[1] as string);
      const parts = (m[2] as string).split(/ and (?=home|[A-Z]|the )/);
      for (const part of parts) {
        const k = new RegExp(`^(home|${lx.re.PL}) at (.+)$`).exec(part) as RegExpExecArray;
        const place = k[1] === 'home' ? (personOf(c, p)?.home as PlaceId) : placeV(c, k[1] as string, v);
        for (const h of hoursV(lx, k[2] as string)) out.push({ k: 'CLAIM', person: p, place, hour: h });
      }
      rest = rest.slice((m[0] as string).length);
    }
    return out;
  },
  'placed-set/swear': (a, comp, v, lx) => placedV(a.bits as string, swearSrc(v.c, a.swear as string, comp), v, lx),
  'placed-set/self': (a, _comp, v, lx) => placedV(a.bits as string, { k: 'claim', who: personV(v.c, a.he as string) }, v, lx),
  'placed-set/self-plain': (a, comp, v, lx) => runsV(a.runs as string, (comp.props[0] as P<'PLACED'>).by, v, lx),
  'placed-set/count': (a, _comp, v, lx) => runsV(a.runs as string, { k: 'list', who: personV(v.c, a.his as string) }, v, lx),
  'placed-set/recap': (a, comp, v, lx) => {
    const c = v.c;
    const bys = listV(a.by as string, `${lx.re.NAME}|the office|what the room said`);
    const out: Prop[] = [];
    const AT = `(?:${lx.re.PL}) at (?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*`;
    const re = new RegExp(`^((?:${lx.re.NAME})(?:(?:, | and )(?:${lx.re.NAME}))*) at ((?:${AT})(?:(?:, | and )(?:${AT}))*?)(?:, | and |$)(?=$|${lx.re.NAME})`);
    let rest = a.groups as string;
    const want = comp.props as P<'PLACED'>[];
    while (rest.length) {
      const m = re.exec(rest);
      if (!m) throw new Error(`voiced: can't read "${rest}"`);
      const who = namesV(c, lx, m[1] as string);
      const ats: { place: PlaceId; hour: number }[] = [];
      for (const at of listV(m[2] as string, AT)) {
        const k = new RegExp(`^(${lx.re.PL}) at (.+)$`).exec(at) as RegExpExecArray;
        for (const h of hoursV(lx, k[2] as string)) ats.push({ place: placeV(c, k[1] as string, v), hour: h });
      }
      for (const p of who) for (const x of ats) out.push({ k: 'PLACED', person: p, place: x.place, hour: x.hour, by: want.find((y) => y.person === p && y.hour === x.hour)?.by ?? { k: 'given' } });
      rest = rest.slice((m[0] as string).length);
    }
    // The sources are said once, for the run: every one of them must be one of the run's.
    const names = new Set(out.map((x) => ((x as P<'PLACED'>).by.k === 'given' ? 'the office' : (x as P<'PLACED'>).by.k === 'find' ? 'what the room said' : nameOf(c, (x as P<'PLACED'>).by.who as Id))));
    if (bys.some((b) => !names.has(b))) throw new Error('voiced: a source the run doesn’t have');
    return out;
  },
  'access-set/two': (a, _c, v, lx) => accessV(v.c, lx, lc(a.yes as string) === a.yes ? (a.yes as string) : (a.yes as string), a.no as string, v),
  'access-set/yes': (a, _c, v, lx) => accessV(v.c, lx, a.yes as string, '', v),
  'access-set/no': (a, _c, v, lx) => accessV(v.c, lx, '', a.no as string, v),
  'access-set/and': (a, _c, v, lx) => accessV(v.c, lx, a.yes as string, `${a.nobody} ${a.short}`, v),
  'access-set/and-but': (a, _c, v, lx) => accessV(v.c, lx, a.yes as string, `${a.nobody} ${a.short}`, v),
  'access-set/but': (a, _c, v, lx) => accessV(v.c, lx, a.yes as string, a.no as string, v),
  'access-set/semi': (a, _c, v, lx) => accessV(v.c, lx, a.yes as string, a.no as string, v),
  'window-alive/two-murder': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/two-murder-so': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/two-murder-walk': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/two-small': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/two-small-so': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/two-small-walk': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/one-murder': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/one-murder-so': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/one-small': (a, _c, v, lx) => windowV(a, v, lx),
  'window-alive/one-small-so': (a, _c, v, lx) => windowV(a, v, lx),
  'street/two-murder': (a, _c, v) => streetV(a, v),
  'street/two-small': (a, _c, v) => streetV(a, v),
  'street/one-murder': (a, _c, v) => streetV(a, v),
  'street/one-small': (a, _c, v) => streetV(a, v),
};

function collisionV(a: Record<string, string>, comp: Composite, v: VCtx, lx: Lexicon): Prop[] {
  const cl = claimV(v.c, lx, a.claim as string);
  const x = comp.props[0] as P<'COLLIDES'>;
  return [{ k: 'COLLIDES', person: cl.person, place: cl.place, hour: cl.hour, ...(x.second ? { second: true } : {}), with: breakerV(v.c, lx, lc(a.breaker as string) === a.breaker ? (a.breaker as string) : (a.breaker as string), v) }];
}

function ownWordV(a: Record<string, string>, v: VCtx, lx: Lexicon): Prop[] {
  const c = v.c;
  const hours = hoursV(lx, a.hs as string);
  if ((a.hourword === 'hours') !== hours.length > 1) throw new Error('voiced: hour or hours?');
  const who = personV(c, a.who as string);
  const what = a.what as string;
  let places: PlaceId[];
  const home = new RegExp(`^home(?:, here)? at (${lx.re.PL})$`).exec(what);
  if (home) {
    const pl = placeV(c, home[1] as string, v);
    if (personOf(c, who)?.home !== pl) throw new Error('voiced: not their home');
    places = hours.map(() => pl);
  } else if (new RegExp(`^(?:${lx.re.PL})$`).test(what) || what === 'home') places = hours.map(() => (what === 'home' ? (personOf(c, who)?.home as PlaceId) : placeV(c, what, v)));
  else {
    const parts = listV(what, `(?:home|${lx.re.PL}) at (?:${lx.re.H})`);
    places = parts.map((x) => {
      const m = new RegExp(`^(home|${lx.re.PL}) at (${lx.re.H})$`).exec(x) as RegExpExecArray;
      return m[1] === 'home' ? (personOf(c, who)?.home as PlaceId) : placeV(c, m[1] as string, v);
    });
  }
  return [{ k: 'WINDOW', hours }, ...hours.map((h, i) => ({ k: 'CLAIM', person: who, place: places[i] as PlaceId, hour: h }) as Prop)];
}

/** Whose word a "That put … , and Ellery would swear to it." is, from the writer's tail. */
function swearSrc(c: BoardCase, swear: string, comp: Composite): Src {
  const m = /^(?:on (.+?)’s word|and (.+?) would (?:swear to it|say so to anybody)|on (.+?) word|by (.+?) count)$/.exec(swear);
  if (!m) throw new Error(`voiced: whose word is "${swear}"?`);
  const name = (m[1] ?? m[2] ?? m[3] ?? m[4]) as string;
  const like = (comp.props[0] as P<'PLACED'>).by;
  if (name === 'the office') return { k: 'given' };
  if (name === 'what the room said') return { k: 'find' };
  return srcFold(c, name, like);
}

/** "Wehrle and Mulcahy here at ten and him at the Thalia at eleven". */
function placedV(bits: string, by: Src, v: VCtx, lx: Lexicon): Prop[] {
  const c = v.c;
  const AT = `(?:here|at (?:${lx.re.PL}))`;
  const one = `(?:(?:${lx.re.NAME}|${MARK})(?:(?:, | and )(?:${lx.re.NAME}))*) ${AT} at (?:${lx.re.H})`;
  return listV(bits, one).flatMap((b) => {
    const m = new RegExp(`^(.+) (${AT}) at (${lx.re.H})$`).exec(b) as RegExpExecArray;
    const place = placeV(c, m[2] as string, v);
    return namesV(c, lx, m[1] as string).map((p) => ({ k: 'PLACED', person: p, place, hour: hourV(m[3] as string), by }) as Prop);
  });
}

/** "Margolis and Grasso were here at ten". */
function runsV(runs: string, by: Src, v: VCtx, lx: Lexicon): Prop[] {
  const c = v.c;
  const AT = `(?:here|at (?:${lx.re.PL}))`;
  const one = `(?:${lx.re.NAME})(?:(?:, | and )(?:${lx.re.NAME}))* (?:was|were) ${AT} at (?:${lx.re.H})`;
  return listV(runs, one).flatMap((b) => {
    const m = new RegExp(`^(.+) (?:was|were) (${AT}) at (${lx.re.H})$`).exec(b) as RegExpExecArray;
    const place = placeV(c, m[2] as string, v);
    return namesV(c, lx, m[1] as string).map((p) => ({ k: 'PLACED', person: p, place, hour: hourV(m[3] as string), by }) as Prop);
  });
}

function windowV(a: Record<string, string>, v: VCtx, lx: Lexicon): Prop[] {
  const c = v.c;
  if (personV(c, a.client as string) !== c.client) throw new Error('voiced: not the client');
  const victim = personV(c, a.victim as string);
  const hours = hoursV(lx, a.opts as string);
  const place = a.place !== undefined && a.place !== '' && !/\{place\}/.test(a.place) ? placeV(c, a.place, v) : placeV(c, a.at as string, v);
  const out: Prop[] = [{ k: 'WINDOW', hours }, { k: 'ALIVE', victim, place, hour: hourV(a.hour as string) }];
  if (a.narrowed) out.push({ k: 'NARROWS', hour: hourV(a.narrowed) });
  return out;
}

function streetV(a: Record<string, string>, v: VCtx): Prop[] {
  const c = v.c;
  const scene = c.places.find((p) => p.street === a.street && p.id === c.crime.scene);
  if (!scene) throw new Error('voiced: not the scene’s street');
  if (personV(c, a.victim as string) !== c.crime.victim) throw new Error('voiced: not the victim');
  return [{ k: 'POINTER', from: 'remark', to: scene.id, why: 'street' }];
}

/* ------------------------------------------------------------------ *
 * The checks.
 * ------------------------------------------------------------------ */

/**
 * Every way a template's slots can take the words (literal pieces fixed, slots between them). A slot
 * named twice (`{p}` and `{p:them}`) gives each of its readings, in order.
 */
function* splitsAll(template: string, text: string): Generator<Record<string, string[]>> {
  const parts = template.split(/(\{[A-Za-z][\w-]*(?::[a-z]+)?\})/).filter((x) => x !== '');
  function* go(i: number, at: number, acc: Record<string, string[]>): Generator<Record<string, string[]>> {
    if (i === parts.length) {
      if (at === text.length) yield acc;
      return;
    }
    const part = parts[i] as string;
    const slot = /^\{([A-Za-z][\w-]*)(?::[a-z]+)?\}$/.exec(part);
    if (!slot) {
      if (text.startsWith(part, at)) yield* go(i + 1, at + part.length, acc);
      return;
    }
    const k = slot[1] as string;
    const key = (k[0] as string).toLowerCase() + k.slice(1);
    const add = (val: string) => ({ ...acc, [key]: [...(acc[key] ?? []), val] });
    const next = parts[i + 1];
    if (next === undefined) {
      yield* go(i + 1, text.length, add(text.slice(at)));
      return;
    }
    for (let j = text.indexOf(next, at); j >= 0; j = text.indexOf(next, j + 1)) yield* go(i + 1, j, add(text.slice(at, j)));
  }
  yield* go(0, 0, {});
}

/** The same, a slot's first reading only (the build-1 voicings name each slot once). */
function* splits(template: string, text: string): Generator<Record<string, string>> {
  for (const a of splitsAll(template, text)) yield Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v[0] as string]));
}

/* ------------------------------------------------------------------ *
 * Build 2: typed arguments, read back by type.
 * ------------------------------------------------------------------ */

/** A typed slot's words, read back: a person's id, a list's entries, an hour, hours, a place's id, or the words. */
export type Read = string | string[] | number | number[];

function personR(c: BoardCase, s: string): Id {
  const t = s.trim();
  // A role ("the house manager", "my client") is a name the night has for one person.
  const byRole = c.people.find((p) => {
    const r = roleOf(c, p.id);
    return !!r && (r === t || r === lc(t) || `T${r.slice(1)}` === t || (r[0] as string).toUpperCase() + r.slice(1) === t);
  });
  if (byRole) return byRole.id;
  return personV(c, t.replace(/^(?:He|She|Him|Her|His|It|Its)(?=⁣)/, (m) => m.toLowerCase()));
}

function readTyped(c: BoardCase, lx: Lexicon, v: VCtx, type: ArgType, raw: string): Read {
  const s = raw.trim();
  switch (type) {
    case 'person':
      return personR(c, s);
    case 'people': {
      const E = entryAlt(c);
      return listV(s.replace(/^(?:[a-z])/, (m) => m), `${E.re}|${MARK}`).map((x) => E.of.get(x) ?? (E.of.get(cap(x)) as string) ?? personR(c, x));
    }
    case 'hour':
      return hourV(s);
    case 'hours':
      return listV(s.replace(/ o’clock$/, ''), `(?:${lx.re.H})`).map(hourV);
    case 'place':
      return placeV(c, s, v);
    case 'at':
      if (!/^(?:[Hh]ere|[Aa]t )/.test(s)) throw new Error(`voiced: not "here" or "at …": "${s}"`);
      return placeV(c, s, v);
    case 'text':
      return raw;
  }
}

const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** A shape's reader: its typed arguments, read back, to propositions. `flags` are the voicing's own (`requires`). */
type Reader = (a: Record<string, Read>, flags: ReadonlySet<string>, comp: Composite, v: VCtx, lx: Lexicon) => Prop[];

const READ: Partial<Record<Shape, Reader>> = {};

/** Build 2: a shape's reader, registered by the module that writes its arguments (`readers.ts`). */
export function registerReader(shape: Shape, r: Reader): void {
  READ[shape] = r;
}

/** The typed reading of a voiced composite: every way its template splits the words, each slot read by its type. */
function rereadTyped(comp: Composite, vo: { id: string; template: string; requires?: string[] }, text: string, v: VCtx, lx: Lexicon): { ok: boolean; why?: string } {
  const r = READ[comp.shape];
  if (!r) return { ok: false, why: `no reading for ${vo.id}` };
  const schema = SCHEMA[comp.shape].args;
  const want = comp.props.map(canon).sort();
  const flags = new Set(vo.requires ?? []);
  let last = `${vo.id}: the words don't fit the template`;
  for (const raw of splitsAll(vo.template, text)) {
    try {
      const a: Record<string, Read> = {};
      for (const [k, vals] of Object.entries(raw)) {
        const type = schema[k];
        if (!type) throw new Error(`voiced: ${vo.id} names {${k}}, which ${comp.shape} hasn't`);
        const reads = vals.map((x) => readTyped(v.c, lx, v, type, x));
        // A slot said twice says the same thing twice ("{p}" and "{p:them}" are one person).
        if (reads.some((x) => JSON.stringify(x) !== JSON.stringify(reads[0]))) throw new Error(`voiced: {${k}} is two things`);
        a[k] = reads[0] as Read;
      }
      const got = r(a, flags, comp, v, lx).map(canon).sort();
      if (got.length === want.length && got.every((g, i) => g === want[i])) return { ok: true };
      last = `${vo.id}: read ${got.join(' ')}`;
    } catch (e) {
      last = `${vo.id}: ${(e as Error).message}`;
    }
  }
  return { ok: false, why: last };
}

/** A composite's own words (as its voicing said them) read back to propositions; null when no reading fits. */
export function rereadVoiced(comp: Composite & { said?: string; args?: Record<string, string> }, v: VCtx): { ok: boolean; why?: string } {
  const id = comp.voicing;
  const text = comp.said;
  if (!id || id === 'flesh' || text === undefined) return { ok: true };
  // Said plainly (no voicing fitted): the plain page's own parser reads it back.
  if (id === 'plain') {
    try {
      const got = parsePlain(v.c, [{ kind: 'prose', text, voice: 'narrator' }]).map(canon).sort();
      const want = comp.props.map(canon).sort();
      return got.length === want.length && got.every((g, i) => g === want[i]) ? { ok: true } : { ok: false, why: `plain: read ${got.join(' ')}` };
    } catch (e) {
      return { ok: false, why: `plain: ${(e as Error).message}` };
    }
  }
  const vo = voicingById(id);
  if (!vo) return { ok: false, why: `no voicing ${id}` };
  const lx = lexicon(v.c);
  // A pair, an attachment, a confirmation with somebody else: its words are its parts', joined as the voicing joins them.
  if (comp.parts && (comp.shape === 'PAIR' || comp.shape === 'ADMIT-CHECK' || comp.shape === 'ATTACH' || comp.shape === 'CONFIRMED-WITH')) {
    const [a, b] = comp.parts as (Composite & { said?: string })[];
    const args = comp.args ?? {};
    if (fill(vo.template, args) !== text) return { ok: false, why: `${id}: the words aren't the voicing's` };
    const host = a?.said?.replace(/\.$/, '');
    if (comp.shape === 'PAIR' || comp.shape === 'ADMIT-CHECK') {
      const lower = (s: string) => (/^(?:He|She|It|They|We|You|There|Nobody|Somebody|Everybody|Anybody|Nothing|Everything|That|This|The|A|An|His|Her|My|Their|Its|Every|Each|No|Some|All|Both|Most|One|By|For|At|In|On|Under|Over|Behind|Above|Below|Through|Outside|Inside|Across|Along|Beside|Near|Upstairs|Downstairs|Somewhere|Overhead|Down|Up|Whatever|Whoever|Whether|If|When|Fewer|Plenty|Two|Three|Like|As|Just|With|Past|Which|Then|Once)\b/.test(s) ? lc(s) : s);
      if (args.a !== host || args.b !== lower(b?.said ?? '')) return { ok: false, why: `${id}: not its parts' words` };
      return { ok: true };
    }
    if (args.host !== undefined && args.host !== host) return { ok: false, why: `${id}: not its host's words` };
    if (args.confirmed !== undefined && args.confirmed !== host) return { ok: false, why: `${id}: not its confirmation's words` };
    if (comp.shape === 'ATTACH') {
      // The access said of the person: the same person, the same way in.
      const w = (b?.props ?? []) as P<'ACCESS'>[];
      const said = accessV(v.c, lx, (w[0] as P<'ACCESS'>).had ? `${nameOf(v.c, (w[0] as P<'ACCESS'>).person)} ${args.of}` : '', (w[0] as P<'ACCESS'>).had ? '' : `${nameOf(v.c, (w[0] as P<'ACCESS'>).person)} ${args.of}`, v);
      if (said.map(canon).join() !== w.map(canon).join()) return { ok: false, why: `${id}: the way in isn't theirs` };
      return { ok: true };
    }
    // CONFIRMED-WITH: the others the same list places, at the same place and hour.
    const placed = (b?.props ?? []) as P<'PLACED'>[];
    const x = (a?.props[0] ?? {}) as P<'CONFIRMS'>;
    let got: Prop[] = [];
    try {
      if (args.others !== undefined) got = namesV(v.c, lx, args.others.replace(/ and /g, ', ').replace(/, ([^,]+)$/, ' and $1')).map((p) => ({ k: 'PLACED', person: p, place: x.place, hour: x.hour, by: (placed[0] as P<'PLACED'>).by }) as Prop);
      else if (args.placed !== undefined) {
        const AT = `(?:here|at (?:${lx.re.PL}))`;
        got = (args.placed as string).split(/ and (?=(?:[A-Z]))/).length ? placedV(args.placed.replace(new RegExp(`((?:${lx.re.NAME})) at (${lx.re.H})`, 'g'), (_m, n: string, h: string) => `${n} ${x.place === v.here ? 'here' : `at ${placeName(v.c, x.place)}`} at ${h}`), (placed[0] as P<'PLACED'>).by, v, lx) : [];
        void AT;
      }
    } catch (e) {
      return { ok: false, why: `${id}: ${(e as Error).message}` };
    }
    const want = new Set(placed.map(canon));
    if (got.length !== placed.length || got.some((g) => !want.has(canon(g)))) return { ok: false, why: `${id}: the others aren't the list's` };
    return { ok: true };
  }
  const un = UNARGS[id];
  // Build 2: a voicing over typed arguments is read back by type, through its shape's reader.
  if (!un) return rereadTyped(comp, vo, text, v, lx);
  // A voicing may reorder its arguments: the same propositions, in any order.
  const want = comp.props.map(canon).sort();
  let last = '';
  for (const args of splits(vo.template, text)) {
    try {
      const got = un(args, comp, v, lx).map(canon).sort();
      if (got.length === want.length && got.every((g, i) => g === want[i])) return { ok: true };
      last = `read ${got.join(' ')}`;
    } catch (e) {
      last = (e as Error).message;
    }
  }
  return { ok: false, why: `${id}: ${last}` };
}

/** The composer's hook: a composite just said in a voicing, held to its propositions. */
export function checkVoiced(comp: Composite & { said?: string; args?: Record<string, string> }, v: VCtx): void {
  if (!VOICED.check || !comp.voicing || comp.voicing === 'flesh') return;
  T.voiced++;
  const r = rereadVoiced(comp, v);
  if (r.ok) T.voicedOk++;
  else if (T.misses.length < 200) T.misses.push(`voiced ${v.c.id}: ${r.why}\n   said: ${comp.said}\n   bones: ${comp.props.map(canon).join(' ')}`);
}

/* ------------------------------------------------------------------ *
 * The writer's own words: everybody, everywhere and every hour the bones name is named.
 * ------------------------------------------------------------------ */

/** The people, places and hours a proposition names. */
function namedBy(p: Prop): { people: Id[]; places: Id[]; hours: number[] } {
  const out = { people: [] as Id[], places: [] as Id[], hours: [] as number[] };
  const walk = (x: Prop | Src) => {
    for (const [k, val] of Object.entries(x)) {
      if (k === 'k') continue;
      if (k === 'with' && val && typeof val === 'object') walk(val as Prop);
      else if (k === 'by' && val && typeof val === 'object') walk(val as Src);
      else if (k === 'by' && typeof val === 'string') out.people.push(val);
      else if ((k === 'person' || k === 'watcher' || k === 'speaker' || k === 'victim' || k === 'client' || k === 'finder' || k === 'witness' || k === 'who' || k === 'saw' || k === 'to' || k === 'thing') && typeof val === 'string' && val !== '*' && !val.includes(':')) out.people.push(val);
      else if ((k === 'company' || k === 'evenings' || k === 'lists') && Array.isArray(val)) out.people.push(...(val as Id[]));
      else if (k === 'people' && Array.isArray(val)) out.people.push(...(val as string[]).filter((e) => !e.includes(':')));
      else if ((k === 'place' || k === 'via' || k === 'claimed') && typeof val === 'string') out.places.push(val);
      else if ((k === 'hour' || k === 'from') && typeof val === 'number') out.hours.push(val);
      else if (k === 'hours' && Array.isArray(val)) out.hours.push(...(val as number[]));
    }
  };
  walk(p);
  return out;
}

/**
 * A fact unit in the writer's own words (a card, an answer, the office): the people its bones name
 * are the people its words name. Named means by name, by role ("the house manager", "my client"),
 * or, for whoever the unit is about, by a pronoun or the speaker's own "I". Nobody else is named:
 * the client and the victim (or the lost thing) may be, as the night's own.
 */
export function rereadFlesh(c: BoardCase, u: Unit & { kind: 'fact' }, speaker?: PersonId): { ok: boolean; why?: string } {
  // The writer's words as the voicing gave them, before the reference pass: names, and the engine's marked pronouns.
  const words = (u.bones ?? []).map((b) => (b as { said?: string }).said ?? '').join(' ') || u.text;
  const marked = new Set([...words.matchAll(/⁣(\d+)⁤/g)].map((m) => c.people[Number(m[1])]?.id).filter((x): x is Id => !!x));
  // (A place called after somebody, "Mrs. Nagy’s", isn't Mrs. Nagy.)
  const text = maskPlaces(c, words.replace(/⁣\d+⁤/g, ''));
  const bones = (u.bones ?? []).flatMap((b) => b.props);
  const want = new Set(bones.flatMap((p) => namedBy(p).people.filter((x) => c.people.some((y) => y.id === x))));
  const said = new Set<Id>();
  for (const p of c.people) {
    if (p.short.length > 2 && new RegExp(`\\b${esc(p.short)}\\b`).test(text)) said.add(p.id);
    // A role, not an appositive after a name ("Lou the bookmaker").
    const role = roleOf(c, p.id);
    if (role && new RegExp(`(?<![A-Z][\\w’.]* )\\b${esc(role)}\\b`, 'i').test(text)) said.add(p.id);
  }
  // "The list" is its watcher's.
  if (/\bthe list\b/i.test(text)) for (const p of bones) if (p.k === 'LIST') said.add(p.watcher);
  // Named at all, a place called after them included ("went to Dr. Hirsch’s surgery").
  const raw = words.replace(/⁣\d+⁤/g, '');
  const anywhere = (p: Id) => said.has(p) || marked.has(p) || new RegExp(`\\b${esc(c.people.find((x) => x.id === p)?.short ?? '\u0000')}\\b`).test(raw);
  const pron = (p: Id) => new RegExp(pronOf(c, p).he === 'she' ? '\\b(?:she|her|hers|herself)\\b' : pronOf(c, p).he === 'he' ? '\\b(?:he|him|his|himself)\\b' : '\\b(?:it|its)\\b', 'i').test(text);
  // (The client and the victim, or the lost thing, are the night's own: the office says them every way there is.)
  // Whom the unit is about may be folded ("A second story, and the Shamrock…" is theirs).
  const missing = [...want].filter((p) => !anywhere(p) && p !== speaker && p !== c.client && p !== c.crime.victim && p !== u.about[0] && !(u.about.includes(p) && pron(p)));
  const extra = [...said].filter((p) => !want.has(p) && p !== speaker && p !== c.client && p !== c.crime.victim);
  if (missing.length || extra.length) return { ok: false, why: `${missing.length ? `missing ${missing.join(',')}` : ''}${extra.length ? ` named but not in the bones ${extra.join(',')}` : ''}` };
  return { ok: true };
}

export function tallyFlesh(ok: boolean, line: string): void {
  T.flesh++;
  if (ok) T.fleshOk++;
  else if (T.misses.length < 400) T.misses.push(line);
}
