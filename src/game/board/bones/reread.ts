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

import { nameOf, personOf, placeName, pronOf, type BoardCase, type Hour, type PersonId, type PlaceId } from '../model.js';
import { entryName, listExhaustive, listOf, shutAt } from '../knowledge.js';
import type { Unit } from '../plan/types.js';
import { accessPhrase, shortOther, strangerSaid } from './phrase.js';
import { roleOf } from '../plan/refer.js';
import { maskPlaces } from '../plan/measure.js';
import { canon, meansProp } from './extract.js';
import { lexicon, parsePlain, type Lexicon } from './plain.js';
import type { Composite, Entry, Id, Prop, Shape, Src } from './types.js';
import { SCHEMA, mustSay, type ArgType } from './schema.js';
import { fill, voicingById, type Args } from './voice.js';
import { clarityOf } from './clarity.js';

export const VOICED: { check: boolean } = { check: false };

const T = { voiced: 0, voicedOk: 0, flesh: 0, fleshOk: 0, misses: [] as string[], clear: 0, unclear: [] as { id: string; why: string[]; said: string }[] };

export function voicedTally(): typeof T {
  return { ...T, misses: [...T.misses], unclear: [...T.unclear] };
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
    // (docs/66, P6: "a stranger at the same table", in the watcher's mouth.)
    of.set(strangerSaid(shortOther(full).replace(/ nobody could put a name to$/, ' I didn’t know')), `other:${o.id}`);
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
  // (docs/62 item 2: "Bledsoe said she was at Moskowitz’s at ten", "…said he was home at ten".)
  const m = new RegExp(`^(${lx.re.NAME}) said (?:${MARK}|he|she) was (home|at (?:${lx.re.PL})) at (${lx.re.H})$`).exec(s);
  if (!m) throw new Error(`voiced: no claim in "${s}"`);
  const person = personV(c, m[1] as string);
  const place = m[2] === 'home' ? (personOf(c, person)?.home as PlaceId) : placeV(c, (m[2] as string).replace(/^at /, ''), { c, here: '' });
  return { person, place, hour: hourV(m[3] as string) };
}

function breakerV(c: BoardCase, lx: Lexicon, s: string, v: VCtx): Prop {
  const t = s.trim();
  const AT = `(?:here|at (?:${lx.re.PL}))`;
  const E = entryAlt(c);
  // docs/53, addendum: "Coffin saw him at …", "Coffin said only Feeney and Ashby were at …", "Coffin said nobody was at …".
  let m = new RegExp(`^(${lx.re.NAME}) (?:saw (${MARK}|${lx.re.NAME})|said (only )?(nobody|(?:(?:${E.re})(?:(?:, | and )(?:${E.re}))*)) (?:was|were)) (${AT}) at ((?:${lx.re.H}) o’clock)((?:; .+)*)$`).exec(t);
  if (m) {
    const watcher = personV(c, m[1] as string);
    const place = placeV(c, (m[5] as string).replace(/^at /, ''), v);
    const hour = hourV(m[6] as string);
    const people = m[2] ? [personV(c, m[2])] : m[4] === 'nobody' ? [] : listV(m[4] as string, E.re).map((x) => E.of.get(x) ?? personV(c, x));
    const faces: Record<string, Id> = {};
    for (const f of (m[7] ?? '').split('; ').filter(Boolean)) {
      const k = new RegExp(`^the (.+) was (${lx.re.NAME})’s$`).exec(f);
      if (!k) throw new Error(`voiced: no face in "${f}"`);
      const look = c.lists.flatMap((l) => Object.values(l.entries).flat()).flatMap((e) => ('look' in e ? [e.look] : [])).find((l) => l.replace(/^(in|with) an? /, '') === k[1]);
      if (look) faces[look] = personV(c, k[2] as string);
    }
    return { k: 'LIST', watcher, place, hour, people, ...(m[3] ? { whole: true } : {}), ...(Object.keys(faces).length ? { faces } : {}) };
  }
  m = new RegExp(`^(${lx.re.NAME})(?: says (?:he|she)(?: himself| herself)? was (?:at )?|’s own answer was (?:at )?)(here|${lx.re.PL}) at ((?:${lx.re.H}) o’clock), (?:with (.+)|alone)$`).exec(t);
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
    for (const part of no.split('; ')) {
      // (Round 7, B6: "Vitale didn’t come till nine, too late for it": there, but only once it had to be gone.)
      const late = new RegExp(`^(${NS}) didn’t come(?: to (?:${lx.re.PL}))? till (${lx.re.H}), too late for (?:it|the [\\w ’-]+)$`).exec(part);
      if (late) {
        for (const p of namesV(c, lx, late[1] as string)) out.push({ k: 'ACCESS', person: p, had: false, hour: hourV(late[2] as string) });
        continue;
      }
      const k = new RegExp(`^(${NS}) (${forms.map(esc).join('|')})$`).exec(part);
      if (!k) throw new Error(`voiced: no way in "${part}"`);
      for (const p of namesV(c, lx, k[1] as string)) out.push({ k: 'ACCESS', person: p, had: false });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The voicings, read back: each turns its arguments into propositions.
 * ------------------------------------------------------------------ */

type Unargs = (a: Record<string, string>, comp: Composite, v: VCtx, lx: Lexicon) => Prop[];

const confirmedSpans: Unargs = (a, comp, v, lx) => {
  const x = comp.props[0] as P<'CONFIRMS'>;
  // (docs/53: whose line it was, said as theirs, "Coffin’s list"; or the legacy "Coffin had".)
  const by = a.whose !== undefined ? srcR(v.c, a.whose, x.by) : srcFold(v.c, (a.src ?? '').replace(/ had( said)?$/, ''), x.by);
  return spansV(v.c, lx, a.spans as string, v, x.person).flatMap((sp) => sp.hours.map((h) => ({ k: 'CONFIRMS', person: x.person, place: sp.place, hour: h, ...(sp.company ? { company: sp.company } : {}), by }) as Prop));
};

const confirmedRest: Unargs = (a, comp, v, lx) => {
  const x = comp.props[0] as P<'CONFIRMS'>;
  const who = personV(v.c, a.him as string);
  const by = a.whose !== undefined ? srcR(v.c, a.whose, x.by) : srcFold(v.c, a.by as string, x.by);
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
    // (Round 9: on the keeper's own page, the keeper's own place goes without saying: "She had Broadnax in at nine".)
    return [{ k: 'CONFIRMS', person: personV(v.c, (a.them ?? a.person ?? a.name) as string), place: a.at === undefined ? (listOf(v.c, watcher)?.place as PlaceId) : placeV(v.c, a.at as string, v), hour: hourV(a.hour as string), by: { k: 'list', who: watcher } }];
  },
  'confirmed/list-too': (a, _comp, v) => {
    const watcher = personV(v.c, a.watcher as string);
    const p = personV(v.c, a.name as string);
    if (personV(v.c, a.him as string) !== p) throw new Error('voiced: whom did the list have?');
    return [{ k: 'CONFIRMS', person: p, place: a.at === undefined ? (listOf(v.c, watcher)?.place as PlaceId) : placeV(v.c, a.at as string, v), hour: hourV(a.hour as string), by: { k: 'list', who: watcher } }];
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
    // (docs/62 item 2: each said as a clause: "Hargrove said she was home at eleven, and Tillman said he was at the Odessa at ten".)
    const SAID = `(?:home|at (?:${lx.re.PL})) at (?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*`;
    const out: Prop[] = [];
    const re = new RegExp(`^(${lx.re.NAME}) said (?:${MARK}|he|she) was ((?:${SAID})(?: and (?:${SAID}))?)(?:, and |, | and |$)`);
    let rest = a.owns as string;
    while (rest.length) {
      const m = re.exec(rest);
      if (!m) throw new Error(`voiced: can't read "${rest}"`);
      const p = personV(c, m[1] as string);
      const parts = (m[2] as string).split(/ and (?=home|at )/);
      for (const part of parts) {
        const k = new RegExp(`^(home|at (?:${lx.re.PL})) at (.+)$`).exec(part) as RegExpExecArray;
        const place = k[1] === 'home' ? (personOf(c, p)?.home as PlaceId) : placeV(c, (k[1] as string).replace(/^at /, ''), v);
        for (const h of hoursV(lx, k[2] as string)) out.push({ k: 'CLAIM', person: p, place, hour: h });
      }
      rest = rest.slice((m[0] as string).length);
    }
    return out;
  },
  'placed-set/swear': (a, comp, v, lx) => placedV(a.bits as string, swearSrc(v.c, a.swear as string, comp), v, lx),
  'placed-set/self': (a, _comp, v, lx) => placedV(a.bits as string, { k: 'claim', who: personV(v.c, a.he as string) }, v, lx),
  'placed-set/self-plain': (a, comp, v, lx) => runsV(a.runs as string, (comp.props[0] as P<'PLACED'>).by, v, lx),
  'placed-set/count': (a, _comp, v, lx) => runsV(a.runs as string, { k: 'list', who: personV(v.c, (a.keeper ?? a.his) as string) }, v, lx),
  'placed-set/recap': (a, comp, v, lx) => {
    const c = v.c;
    const bys = listV(srcWords(a.by as string), `${lx.re.NAME}|the office|what the room said`);
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
    const names = new Set(out.map((x) => ((x as P<'PLACED'>).by.k === 'given' ? nameOf(c, c.client) : (x as P<'PLACED'>).by.k === 'find' ? 'what the room said' : nameOf(c, (x as P<'PLACED'>).by.who as Id))));
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
  if (a.hourword !== undefined && (a.hourword === 'hours') !== hours.length > 1) throw new Error('voiced: hour or hours?');
  const who = personV(c, a.who as string);
  // (docs/62 item 2: what they said is a clause, "she was at Moskowitz’s", "he was at the Automat at nine and home at ten".)
  const was = new RegExp(`^(?:${MARK}|he|she) was `).exec(a.what as string);
  const what = was ? (a.what as string).slice(was[0].length).replace(/^at (?!(?:seven|eight|nine|ten|eleven|twelve)\b)/, '').replace(/ and at /g, ' and ').replace(/, at /g, ', ') : (a.what as string);
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
  const m = /^(?:on (.+?)’s (?:word|list)|and (.+?) would (?:swear to it|say so to anybody)|on (.+?) word|by (.+?) count|and (.+?) said so|and (.+?) saw it with (?:\S+) own eyes|by (.+?) own telling)$/.exec(swear);
  if (!m) throw new Error(`voiced: whose word is "${swear}"?`);
  const name = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? m[7]) as string;
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
  // (The hour it narrowed to: "ten o’clock", or "ten" inside a sentence that has its "so".)
  const narrowed = a.narrowed || a.narrowword;
  if (narrowed) out.push({ k: 'NARROWS', hour: hourV(narrowed) });
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
    // Two slots side by side ("{from}{with}"): every place the first may end.
    if (/^\{[A-Za-z][\w-]*(?::[a-z]+)?\}$/.test(next)) {
      for (let j = at; j <= text.length; j++) yield* go(i + 1, j, add(text.slice(at, j)));
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
  // The lost thing, at the head of a sentence: "The watch".
  const thing = c.people.find((p) => p.object && p.short.toLowerCase() === t.toLowerCase());
  if (thing) return thing.id;
  return personV(c, t.replace(/^(?:He|She|Him|Her|His|It|Its)(?=⁣)/, (m) => m.toLowerCase()));
}

function readTyped(c: BoardCase, lx: Lexicon, v: VCtx, type: ArgType, raw: string): Read {
  const s = raw.trim();
  switch (type) {
    case 'person':
      return personR(c, s);
    case 'people': {
      const E = entryAlt(c);
      // (Said whose: "Russo’s, Glick’s or Doyle’s".)
      return listV(s, `(?:${E.re}|${MARK})(?:’s)?`).map((x) => x.replace(/’s$/, '')).map((x) => E.of.get(x) ?? (E.of.get(cap(x)) as string) ?? personR(c, x));
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

/** The places a phrase names, and where: "went up to the wings at the Lyric", "home", "my room". */
function placesIn(c: BoardCase, lx: Lexicon, text: string, who: Id): { id: PlaceId; at: number }[] {
  const out: { id: PlaceId; at: number }[] = [];
  for (const m of text.matchAll(new RegExp(`(?<![\\w’])(?:${lx.re.PL})(?![\\w’])`, 'g'))) {
    const id = placeIdOf(c, m[0]);
    if (id) out.push({ id, at: m.index ?? 0 });
  }
  const home = personOf(c, who)?.home;
  // "went home", "turned in early, home", "back to my room": home as where they went, not "letters home".
  for (const m of text.matchAll(/(?:\b(?:went|came|got|stayed|headed|walked|was|back|at) |, |^)home\b|\bmy room\b/gi)) if (home) out.push({ id: home, at: m.index ?? 0 });
  if (out.length === 0) {
    // A place said by its own name, the way the account's whole-evening check takes it ("round to Sokol’s").
    for (const p of c.places) {
      // (Past a title, as the account takes it: "round to Dr. Hirsch’s" is Dr. Hirsch’s flat.)
      const stem = placeName(c, p.id).replace(/^(?:the|Mrs\.|Mr\.|Miss|Dr\.) /, '').split(' ')[0] ?? '';
      const at = stem.length >= 4 ? text.indexOf(stem) : -1;
      if (at >= 0) out.push({ id: p.id, at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

function placeIdOf(c: BoardCase, name: string): PlaceId | undefined {
  return c.places.find((x) => placeName(c, x.id) === name || placeName(c, x.id).toLowerCase() === name.toLowerCase())?.id;
}

/** The people a phrase names, the places called after somebody aside ("Corrigan’s flat" isn't Corrigan). */
function peopleIn(c: BoardCase, text: string, but: Id[] = [], inPlaces = false): Id[] {
  const t = inPlaces ? text : maskPlaces(c, text);
  return c.people.filter((p) => !p.object && !but.includes(p.id) && p.short.length > 2 && new RegExp(`\\b${esc(p.short)}\\b`).test(t)).map((p) => p.id);
}

/** "home", "home at Rafferty’s", "at work, at the Lyric", "at the Automat": where, from an account's own phrase. */
function whereR(c: BoardCase, lx: Lexicon, s: string, who: Id): PlaceId {
  const t = s.trim();
  if (t === 'home') {
    const h = personOf(c, who)?.home;
    if (!h) throw new Error('voiced: whose home?');
    return h;
  }
  const m = new RegExp(`^(?:home at |at work, at |at )(${lx.re.PL})$`).exec(t);
  if (!m) throw new Error(`voiced: no place in "${s}"`);
  return placeIdOf(c, m[1] as string) as PlaceId;
}

/** A tail of company: ", with Feeney and Ashby (in the house)", ", on my own", or nothing. */
/** docs/60 item 5: the company somebody had the last time tonight they were at a place, before an hour. */
function sameCompany(c: BoardCase, who: Id, place: PlaceId, before: number): Id[] {
  const a = c.accounts.find((x) => x.person === who);
  const hs = c.board.hours.filter((h) => h < before && a?.claims[h as Hour]?.place === place);
  const last = hs[hs.length - 1];
  if (last === undefined) throw new Error('voiced: the same people as when?');
  return [...(a?.claims[last as Hour]?.company ?? [])];
}

function withR(c: BoardCase, lx: Lexicon, s: string | undefined): Id[] | undefined {
  if (s === undefined || s === '') return undefined;
  if (/^, (?:on my own|by myself|alone)(?: again)?$/.test(s)) return [];
  // (docs/62, P7: "…, and Thorndike was there".)
  const there = /^, and (.+?) (?:was|were) there(?: too)?$/.exec(s);
  if (there) return namesV(c, lx, there[1] as string);
  const m = /^, with (.+?)(?: in the house| about the house)?$/.exec(s);
  if (!m) throw new Error(`voiced: no company in "${s}"`);
  return namesV(c, lx, m[1] as string);
}

/** "Abramowitz was with me at eight; at nine it was just me": who was with them, hour by hour. */
function bitsR(c: BoardCase, lx: Lexicon, s: string): { h: number; who: Id[] }[] {
  const out: { h: number; who: Id[] }[] = [];
  for (const part of s.split('; ')) {
    const t = part.trim();
    let m = new RegExp(`^[Aa]t ((?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*) it was just me$`).exec(t);
    if (m) {
      for (const h of hoursV(lx, m[1] as string)) out.push({ h, who: [] });
      continue;
    }
    m = new RegExp(`^(.+) (?:was|were) (?:there|with me) at ((?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*)$`).exec(t);
    if (!m) throw new Error(`voiced: no company in "${t}"`);
    const who = namesV(c, lx, m[1] as string);
    for (const h of hoursV(lx, m[2] as string)) out.push({ h, who });
  }
  return out;
}

/** The hours of a stretch of an evening, from its first and last (or the voicing's fold: the evening's first hour, its last). */
function stretch(c: BoardCase, a: Record<string, Read>, flags: ReadonlySet<string>, reason?: string): number[] {
  const hs = c.board.hours;
  let from = a.from as number | undefined;
  if (from === undefined && flags.has('timed') && reason) from = hoursV(lexicon(c), (/\bat ((?:seven|eight|nine|ten|eleven|twelve))\b/.exec(reason)?.[1] ?? '')).at(0);
  if (from === undefined && flags.has('first')) from = hs[0];
  if (from === undefined) throw new Error('voiced: from when?');
  const to = flags.has('end') ? (hs[hs.length - 1] as number) : flags.has('span') ? (a.to as number | undefined) : from;
  if (to === undefined) throw new Error('voiced: till when?');
  const out: number[] = [];
  for (let h = from; h <= to; h++) out.push(h);
  return out;
}

const READ: Partial<Record<Shape, Reader>> = {
  /**
   * A stretch of somebody's own evening, in their mouth: where (their phrase for it, or their reason,
   * which names it), the hours, and with whom where they say so: by the tail, in the reason, or
   * folded ("by myself" in the voicing's own words, flag `alone`).
   */
  'CLAIM-SPAN': (a, flags, comp, v, lx) => {
    const c = v.c;
    const who = v.speaker ?? (comp.props[0] as P<'CLAIM'>).person;
    // docs/59 item 2: who was with them through one stretch, a clause at a time. The stretch's own
    // ends ("the whole time", "at first", "and stayed") are the clause's hours, folded.
    if (flags.has('who-with')) {
      const CL = (h: number, company: Id[]): Prop => ({ k: 'CLAIM', person: who, hour: h, company });
      // (Round 7, P1: "Then it was just me.", "At first it was just me.": the hours alone at the stretch's end or start, folded.)
      if (flags.has('alone')) return (flags.has('rest') || flags.has('before') ? (comp.props as P<'CLAIM'>[]).map((x) => x.hour) : (a.hours as number[])).map((h) => CL(h, []));
      if (flags.has('singles')) {
        const out: Prop[] = [];
        for (const bit of (a.pairs as string).split(/, | and (?=(?:Mrs\. |Mr\. |Miss |Dr\. )?[A-Z])/)) {
          const m = new RegExp(`^(${lx.re.NAME})(?: came by)? at (${lx.re.H})$`).exec(bit.trim());
          if (!m) throw new Error(`voiced: can't read "${bit}" as who came by when`);
          out.push(CL(hourV(m[2] as string), [personV(c, m[1] as string)]));
        }
        return out;
      }
      const names = namesV(c, lx, a.names as string);
      const own = (comp.props as P<'CLAIM'>[]).map((x) => x.hour);
      let hs: number[];
      // (Round 7, B2: "Renfro was with me at eight": the hours said, and nothing of coming or going.)
      if (flags.has('seen')) hs = (a.hours as number[]) ?? [];
      else if (flags.has('all')) hs = own;
      else if (flags.has('left')) hs = own.filter((h) => h <= (a.to as number));
      else if (flags.has('came')) hs = own.filter((h) => h >= (a.from as number));
      else if (flags.has('mid')) {
        const from = a.from as number;
        const to = flags.has('hour') ? from : (a.to as number);
        if (flags.has('hour') && a.next !== from + 1) throw new Error('voiced: gone by when?');
        hs = [];
        for (let h = from; h <= to; h++) hs.push(h);
      } else throw new Error('voiced: with whom, when?');
      return hs.map((h) => CL(h, names));
    }
    if (flags.has('solo')) {
      const hours = flags.has('all') ? c.board.hours : (a.hours as number[] | undefined);
      if (!hours) throw new Error('voiced: alone when?');
      return hours.map((h) => ({ k: 'CLAIM', person: who, hour: h, company: [] }) as Prop);
    }
    if (flags.has('company')) return bitsR(c, lx, a.bits as string).map((x) => ({ k: 'CLAIM', person: who, hour: x.h, company: x.who }) as Prop);
    const reason = a.reason as string | undefined;
    const hours = stretch(c, a, flags, reason);
    let place: PlaceId | undefined;
    if (flags.has('party')) {
      if (a.client !== c.client) throw new Error('voiced: not the client’s');
      place = c.crime.scene;
    } else if (reason !== undefined) place = placesIn(c, lx, reason, who).at(-1)?.id;
    else if (a.where !== undefined) place = whereR(c, lx, a.where as string, who);
    if (!place) throw new Error('voiced: where?');
    // (docs/60 item 5: "with the same people": whoever was with them the last time they were there tonight.)
    let company = a.with === ', with the same people' ? sameCompany(c, who, place, hours[0] as number) : withR(c, lx, a.with as string | undefined);
    if (company === undefined && flags.has('alone')) company = [];
    if (reason !== undefined && !flags.has('aside')) {
      // (Company the reason names, "to meet Abramowitz", "to Dr. Hirsch’s surgery": named, the writer's flag, counts a place called after them.)
      const named = peopleIn(c, reason, [who], flags.has('named'));
      if (named.length) company = [...(company ?? []), ...named];
    }
    return hours.map((h) => ({ k: 'CLAIM', person: who, place, hour: h, ...(company ? { company } : {}) }) as Prop);
  },
};

/** A watcher's own list: who keeps it, where, and the hours they kept. */
function listOfSpeaker(v: VCtx, comp: Composite): { watcher: Id; place: PlaceId; hours: number[] } {
  const watcher = v.speaker ?? (comp.props[0] as P<'LIST'>).watcher;
  const l = listOf(v.c, watcher);
  if (!l) throw new Error('voiced: whose list?');
  return { watcher, place: l.place, hours: v.c.board.hours.filter((h) => l.entries[h as never] !== undefined) };
}

/** Somebody who isn't a row of the board, by the words a watcher says them in ("Lou the bookmaker", "Pardo"). */
function otherR(c: BoardCase, who: string): string {
  const t = who.trim().toLowerCase();
  const o = (c.others ?? []).find((x) => x.name.toLowerCase().startsWith(t) || shortOther(x.name).toLowerCase() === t);
  if (!o) throw new Error(`voiced: nobody "${who}"`);
  return `other:${o.id}`;
}

/**
 * docs/59 item 2: one clause of a list told by what changed, read back to what it says of the whole:
 * the people it names, at the hours it puts them there; an hour nobody was in; "nobody else", at the
 * hours the watcher could vouch for. `seq` merges the clauses into the list's hours.
 */
function clauseR(a: Record<string, Read>, flags: ReadonlySet<string>, comp: Composite, v: VCtx): Prop[] {
  const { watcher, place, hours } = listOfSpeaker(v, comp);
  const l = listOf(v.c, watcher);
  const open = hours.filter((h) => !shutAt(v.c, place, h as Hour));
  const P = (hs: number[], people: string[], extra: Record<string, unknown> = {}): Prop[] => hs.map((h) => ({ k: 'LIST', watcher, place, hour: h, people, ...extra }) as Prop);
  if (flags.has('nobody')) {
    if (flags.has('some')) return P(a.hours as number[], [], { whole: true });
    return P(open.filter((h) => !!l && (l.entries[h as Hour] ?? []).length > 0 && listExhaustive(v.c, l, h as Hour)), [], { whole: true });
  }
  if (flags.has('empty')) return P(a.hours as number[], []);
  const E = entryAlt(v.c);
  // (A clause may open on its names: "Somebody in a grey fedora came in at eleven", "Two men off the docks…".)
  const said = (a.names as string).replace(/^(?:Somebody|Two|Three|A) /, (x) => x.toLowerCase());
  // (docs/60 item 5: somebody back for a second stint is the engine's marked pronoun.)
  const who = new RegExp(`^${MARK}$`, 'i').test(said.trim()) ? [personV(v.c, said.trim())] : listV(said, E.re).map((n) => E.of.get(n) as string);
  if (flags.has('doing') && !(a.doing as string)?.trim()) throw new Error('voiced: doing what?');
  const from = a.from as number | undefined;
  let hs: number[];
  // (Round 7, B2: "Mosley was here at ten": the hours said, and nothing of coming or going.)
  if (flags.has('seen')) hs = ((a.hours as number[]) ?? []).filter((h) => open.includes(h));
  else if (flags.has('all')) hs = open;
  else if (flags.has('outback')) hs = open.filter((h) => h <= (a.to as number) || h >= (a.back as number));
  else if (flags.has('left')) hs = open.filter((h) => h <= (a.to as number));
  else if (flags.has('came')) hs = open.filter((h) => h >= (from as number));
  else if (flags.has('mid')) {
    const to = flags.has('hour') ? (from as number) : (a.to as number);
    if (flags.has('hour') && a.next !== open[open.indexOf(from as number) + 1]) throw new Error('voiced: gone by when?');
    hs = open.filter((h) => h >= (from as number) && h <= to);
  } else throw new Error('voiced: what kind of clause?');
  if (hs.length === 0) throw new Error('voiced: a clause with no hours');
  return P(hs, who);
}

/** docs/59 item 2: the clauses of a list (or a stretch of company), merged back into the whole: one proposition an hour. */
export function mergeParts(shape: Shape, ps: readonly Prop[]): Prop[] {
  if (shape === 'LIST-HOUR') {
    const by = new Map<string, { base: P<'LIST'>; people: Set<string>; whole: boolean; shut: boolean }>();
    for (const p of ps) {
      if (p.k !== 'LIST') throw new Error('voiced: not a list');
      const k = `${p.watcher}|${p.place}|${p.hour}`;
      const g = by.get(k) ?? { base: p, people: new Set<string>(), whole: false, shut: false };
      for (const e of p.people) g.people.add(e);
      if (p.whole) g.whole = true;
      if (p.shut) g.shut = true;
      by.set(k, g);
    }
    return [...by.values()].map((g) => (g.shut ? { k: 'LIST', watcher: g.base.watcher, place: g.base.place, hour: g.base.hour, people: [], shut: true } : { k: 'LIST', watcher: g.base.watcher, place: g.base.place, hour: g.base.hour, people: [...g.people], ...(g.whole && g.people.size ? { whole: true } : {}) }) as Prop);
  }
  if (shape === 'CLAIM-SPAN') {
    // A stretch's company, clause by clause: one CLAIM an hour, everybody who was with them then.
    const out: Prop[] = [];
    const by = new Map<string, { base: P<'CLAIM'>; company: Set<string> }>();
    for (const p of ps) {
      if (p.k !== 'CLAIM' || p.place !== undefined) {
        out.push(p);
        continue;
      }
      const k = `${p.person}|${p.hour}`;
      const g = by.get(k) ?? { base: p, company: new Set<string>() };
      for (const x of p.company ?? []) g.company.add(x);
      by.set(k, g);
    }
    return [...out, ...[...by.values()].map((g) => ({ k: 'CLAIM', person: g.base.person, hour: g.base.hour, company: [...g.company] }) as Prop)];
  }
  return [...ps];
}

READ['LIST-HOUR'] = (a, flags, comp, v) => {
  if (flags.has('clause')) return clauseR(a, flags, comp, v);
  const { watcher, place, hours } = listOfSpeaker(v, comp);
  const E = entryAlt(v.c);
  const people = (s: string) => listV(s, E.re).map((n) => E.of.get(n) as string);
  if (flags.has('always')) return hours.map((h) => ({ k: 'LIST', watcher, place, hour: h, people: [otherR(v.c, a.who as string)] }) as Prop);
  if (flags.has('shut')) return hours.filter((h) => h >= (a.hour as number)).map((h) => ({ k: 'LIST', watcher, place, hour: h, people: [], shut: true }) as Prop);
  const hs = a.hours as number[] | undefined;
  if (!hs) throw new Error('voiced: when?');
  if (flags.has('empty')) {
    const regs = flags.has('regular') ? people(a.names as string) : [];
    return hs.map((h) => ({ k: 'LIST', watcher, place, hour: h, people: regs, ...(regs.length ? { whole: true } : {}) }) as Prop);
  }
  const ps = people(a.names as string);
  return hs.map((h) => ({ k: 'LIST', watcher, place, hour: h, people: ps, ...(flags.has('whole') ? { whole: true } : {}) }) as Prop);
};

READ.REMARK = (a, flags, comp, v) => {
  const c = v.c;
  const speaker = v.speaker ?? ((comp.props[0] as P<'REMARK'>).speaker ?? (comp.props[0] as P<'SHIFT'>).watcher);
  if (flags.has('shift')) return [{ k: 'SHIFT', watcher: speaker, from: a.from as number }];
  if (flags.has('passed')) return [{ k: 'REMARK', speaker, saw: a.saw as Id, how: 'passed', where: (a.street as string).trim(), hour: a.hour as number, via: a.via as Id }];
  if (flags.has('had')) {
    if (a.back !== (a.hour as number) + 1) throw new Error('voiced: put back when?');
    const where = (personOf(c, speaker)?.home ?? personOf(c, speaker)?.foundAt) as string;
    return [{ k: 'REMARK', speaker, saw: a.saw as Id, how: 'had', where, hour: a.hour as number }];
  }
  if (flags.has('there')) {
    if (!(a.means as string)?.trim() || !(a.still as string)?.trim()) throw new Error('voiced: what was there?');
    const l = listOf(c, speaker);
    return [{ k: 'REMARK', speaker, saw: 'means', how: 'there', where: l?.place ?? '', hour: a.hour as number }];
  }
  throw new Error('voiced: what kind of remark?');
};

READ.HANDOVER = (a, flags, comp, v) => {
  if (flags.has('seen')) {
    const { place } = listOfSpeaker(v, comp);
    return [{ k: 'HANDOVER', to: ((a.holder as string[]) ?? [])[0] as string, place, hour: a.hour as number }];
  }
  // What was under the coat: the watcher's handover, the line before, said again only as what it was
  // (alive, or small). Who it went to, where and when are that line's, folded.
  if (flags.has('coat')) {
    const { place } = listOfSpeaker(v, comp);
    return [{ k: 'HANDOVER', to: 'other:fence', place, hour: v.c.crime.hour + 1, what: flags.has('alive') ? 'alive' : 'small' }];
  }
  if (flags.has('thought')) return [{ k: 'HANDOVER', to: ((a.holder as string[]) ?? [])[0] as string, place: a.place as Id, hour: a.hour as number }];
  // A crack: the thing is with the holder, here (sitting ten feet away) or at a place said.
  if (flags.has('crack')) return [{ k: 'HANDOVER', to: ((a.holder as string[]) ?? [])[0] as string, place: flags.has('here') ? v.here : (a.at as Id), thing: a.thing as Id }];
  throw new Error('voiced: what kind of handover?');
};

/** Whose word, as a sentence may open on it: "The office" is the office. */
function srcWords(s: string): string {
  return s.trim().replace(/^The office\b/, 'the office').replace(/^What the room said\b/, 'what the room said');
}

/** Whose word a line is, by what a page calls it: "Coffin’s list", "Ashby’s story", "Weisglass’s word", "the office". */
function srcR(c: BoardCase, s: string, like?: Src): Src {
  const t = s.trim();
  if (/^the office$/i.test(t) || /^what I had$/i.test(t)) return { k: 'given' };
  if (/^what the room said$/i.test(t)) return { k: 'find' };
  // docs/53, addendum: whose word, by the name of whoever said it ("Coffin", the client): what kind
  // of word it was is the composite's own, folded (a watcher's is what they saw; the client's, the office).
  const bare = c.people.find((p) => p.short === t);
  if (bare) return srcFold(c, t, like);
  // (A watcher by what they are, "the landlady", where the page names them in the next breath.)
  const byRole = c.people.find((p) => p.role === 'watcher' && roleOf(c, p.id) === t);
  if (byRole) return { k: 'list', who: byRole.id };
  const m = /^(.+)’s (list|story|word|own evening|account|own account)$/.exec(t);
  if (!m) throw new Error(`voiced: whose word is "${s}"?`);
  const who = personV(c, m[1] as string);
  // (The client's account is the office's.)
  if (who === c.client && m[2] !== 'list') return { k: 'given' };
  return m[2] === 'list' ? { k: 'list', who } : m[2] === 'word' ? { k: 'admit', who } : { k: 'claim', who };
}

/** "the Thalia at ten and eleven", "the Thalia at ten and the Lyric at eleven", "home at nine": places and their hours. */
function placesAtR(c: BoardCase, lx: Lexicon, s: string, v: VCtx, who?: Id): { place: PlaceId; hour: number }[] {
  const out: { place: PlaceId; hour: number }[] = [];
  const AT = `(?:home|here|${lx.re.PL}) at (?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*`;
  const re = new RegExp(`^(home|here|${lx.re.PL}) at ((?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*?)(?:, | and |$)(?=$|home|here|${lx.re.PL})`);
  // (docs/62 item 2: said as a clause, "she was at the Odessa at ten and home at eleven".)
  let rest = s
    .trim()
    .replace(new RegExp(`^(?:${MARK}|he|she|you) (?:was|were) `), '')
    .replace(new RegExp(`(^|, | and )at (?=(?:${lx.re.PL}))`, 'g'), '$1');
  void AT;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) throw new Error(`voiced: can't read "${rest}" as places and hours`);
    const place = m[1] === 'home' ? (personOf(c, who ?? '')?.home as PlaceId) : placeV(c, m[1] as string, v);
    for (const h of hoursV(lx, m[2] as string)) out.push({ place, hour: h });
    rest = rest.slice((m[0] as string).length);
  }
  return out;
}

READ['WINDOW-MEANS'] = (a, flags, comp) => {
  if (flags.has('when')) {
    if (flags.has('hour') && a.hours === undefined) return [{ k: 'WINDOW', hours: [a.hour as number] }];
    return [{ k: 'WINDOW', hours: a.hours as number[] }];
  }
  if (flags.has('means')) {
    if (!(a.means as string)?.trim()) throw new Error('voiced: which means?');
    return [{ k: 'MEANS', how: 'origin', place: a.origin as Id }];
  }
  throw new Error(`voiced: what kind of window? ${(comp.props[0] as Prop).k}`);
};

READ['ACCESS-SET'] = (a, flags, _comp, v, lx) => {
  if (flags.has('recap') || flags.has('elim')) {
    const yes = flags.has('yes') ? ((a.people as string[]) ?? []) : [];
    const no = flags.has('no') ? ((a.none as string[]) ?? []) : [];
    // (Round 7: the lodger the door was left unlocked for, who knew it without a seat at the table.)
    const lodger = flags.has('lodger') ? ((a.lodger as string[]) ?? []) : [];
    return [...yes.map((p) => ({ k: 'ACCESS', person: p, had: true }) as Prop), ...lodger.map((p) => ({ k: 'ACCESS', person: p, had: true }) as Prop), ...no.map((p) => ({ k: 'ACCESS', person: p, had: false }) as Prop)];
  }
  const r = a as Record<string, string>;
  if (r.nobody !== undefined && r.short !== undefined && r.no === undefined) return accessV(v.c, lx, r.yes ?? '', `${r.nobody} ${r.short}`, v);
  return accessV(v.c, lx, r.yes ?? '', r.no ?? '', v);
};

READ['COLLISION-PAIR'] = (a, flags, comp, v, lx) => {
  const x = comp.props[0] as P<'COLLIDES'>;
  if (flags.has('recap')) {
    const person = a.person as Id;
    const place = flags.has('home') ? (personOf(v.c, person)?.home as PlaceId) : (a.place as PlaceId);
    return [{ k: 'COLLIDES', person, place, hour: a.hour as number, with: srcR(v.c, a.src as string, x.with as Src) }];
  }
  return collisionV(a as Record<string, string>, comp, v, lx).map((y) => (x.second ? { ...(y as P<'COLLIDES'>), second: true } : y));
};

READ.REACTION = (a, flags) => {
  const person = a.person as Id;
  if (flags.has('owned')) return [{ k: 'ADMIT', person, place: a.place as Id, ...(a.witness ? { witness: a.witness as Id } : {}) }];
  if (flags.has('second')) return [{ k: 'SECOND', person, place: a.place as Id }, ...(flags.has('again') ? [{ k: 'REFUSE', person } as Prop] : [])];
  if (flags.has('refused')) return [{ k: 'REFUSE', person }];
  throw new Error('voiced: what kind of reaction?');
};

READ['PLACED-SET'] = (a, flags, comp, v, lx) => {
  const r = a as Record<string, string>;
  if (flags.has('recap-one')) {
    const person = a.person as Id;
    const want = comp.props as P<'PLACED'>[];
    const bys = listV(srcWords(r.src as string), `${lx.re.NAME}|the office|what the room said`);
    const out = placesAtR(v.c, lx, r.at as string, v, person).map((x) => ({ k: 'PLACED', person, place: x.place, hour: x.hour, by: want.find((y) => y.person === person && y.hour === x.hour)?.by ?? { k: 'given' } }) as Prop);
    const names = new Set(out.map((x) => ((x as P<'PLACED'>).by.k === 'given' ? nameOf(v.c, v.c.client) : (x as P<'PLACED'>).by.k === 'find' ? 'what the room said' : nameOf(v.c, (x as P<'PLACED'>).by.who as Id))));
    if (bys.some((b) => !names.has(b)) || [...names].some((n) => !bys.includes(n))) throw new Error('voiced: whose word?');
    return out;
  }
  // (clarity-5b, item 2: several people at one place and hours, on one word.)
  if (flags.has('recap-many')) {
    const want = comp.props as P<'PLACED'>[];
    const bys = listV(srcWords(r.src as string), `${lx.re.NAME}|the office|what the room said`);
    const out = (a.people as Id[]).flatMap((person) => placesAtR(v.c, lx, r.at as string, v, person).map((x) => ({ k: 'PLACED', person, place: x.place, hour: x.hour, by: want.find((y) => y.person === person && y.hour === x.hour)?.by ?? { k: 'given' } }) as Prop));
    const names = new Set(out.map((x) => ((x as P<'PLACED'>).by.k === 'given' ? nameOf(v.c, v.c.client) : (x as P<'PLACED'>).by.k === 'find' ? 'what the room said' : nameOf(v.c, (x as P<'PLACED'>).by.who as Id))));
    if (bys.some((b) => !names.has(b)) || [...names].some((n) => !bys.includes(n))) throw new Error('voiced: whose word?');
    return out;
  }
  if (r.groups !== undefined) return (UNARGS['placed-set/recap'] as Unargs)(r, comp, v, lx);
  if (r.swear !== undefined) return (UNARGS['placed-set/swear'] as Unargs)(r, comp, v, lx);
  if (a.keeper !== undefined) return runsV(r.runs as string, { k: 'list', who: a.keeper as Id }, v, lx);
  if (r.his !== undefined) return (UNARGS['placed-set/count'] as Unargs)(r, comp, v, lx);
  if (r.he !== undefined) return (UNARGS['placed-set/self'] as Unargs)(r, comp, v, lx);
  return (UNARGS['placed-set/self-plain'] as Unargs)(r, comp, v, lx);
};

READ['OWN-WORD'] = (a, flags, comp, v, lx) => {
  const r = a as Record<string, string>;
  if (flags.has('recap-one')) {
    const person = a.person as Id;
    return placesAtR(v.c, lx, r.said as string, v, person).map((x) => ({ k: 'CLAIM', person, place: x.place, hour: x.hour }) as Prop);
  }
  if (r.owns !== undefined) return (UNARGS['own-word/recap'] as Unargs)(r, comp, v, lx);
  return ownWordV(r, v, lx);
};

READ.UNSPOKEN = (a) => [{ k: 'UNSPOKEN', people: (a.people as string[] | undefined) ?? [a.person as string], hours: a.hours as number[] }];

READ.HOLD = (a, flags) => {
  if (flags.has('missing')) return [{ k: 'MISSING', people: a.people as string[] }];
  return [{ k: 'HOLD', evenings: (a.evenings as string[] | undefined) ?? [], lists: (a.lists as string[] | undefined) ?? [] }];
};

const handoverRecap: Reader = (a, flags) => {
  const to = ((a.holder as string[]) ?? [])[0] as string;
  if (flags.has('known')) return [{ k: 'HANDOVER', to, place: a.at as Id, thing: a.thing as Id }];
  return [{ k: 'HANDOVER', to, place: a.at as Id, hour: a.hour as number }];
};
const handoverSeen = READ.HANDOVER as Reader;
READ.HANDOVER = (a, flags, comp, v, lx) => (flags.has('recap') ? handoverRecap(a, flags, comp, v, lx) : handoverSeen(a, flags, comp, v, lx));

READ['WINDOW-ALIVE'] = (a, flags, _comp, v, lx) => {
  // docs/59 item 3: a walk's narrowing, said as the hour it leaves (docs/66, P1: and the link's, "So he went at ten").
  if (flags.has('narrows')) {
    const h = lx.hour.get(String(a.narrowed).replace(/ o’clock$/, '').toLowerCase());
    if (h === undefined) throw new Error('voiced: narrowed to when?');
    return [{ k: 'NARROWS', hour: h }];
  }
  // docs/59 item 3: above a walk, the sighting alone (the office's hours are the office's, said once).
  if (flags.has('link')) {
    const place = a.place !== undefined && a.place !== '' ? placeV(v.c, a.place as string, v) : placeV(v.c, a.at as string, v);
    return [{ k: 'ALIVE', victim: personV(v.c, a.victim as string), place, hour: hourV(a.hour as string) }];
  }
  return windowV(a as Record<string, string>, v, lx);
};
READ.STREET = (a, _flags, _comp, v) => streetV(a as Record<string, string>, v);
READ.CONFIRMED = (a, flags, comp, v, lx) => {
  const r = { ...(a as Record<string, string>) };
  // docs/53: whose word it was, by name ({person}), stands in for the legacy name and pronoun slots.
  const x = comp.props[0] as P<'CONFIRMS'>;
  if (a.person !== undefined && r.pairs === undefined) {
    if (a.person !== x.person) throw new Error('voiced: whose word was confirmed?');
    const nm = nameOf(v.c, a.person as Id);
    r.name ??= nm;
    r.them ??= nm;
    r.him ??= nm;
  }
  if (r.whose !== undefined && r.by === undefined && flags.has('rest')) r.by = '';
  if (r.pairs !== undefined) return (UNARGS['confirmed/list-many'] as Unargs)(r, comp, v, lx);
  if (r.watcher !== undefined && r.name !== undefined) return (UNARGS['confirmed/list-too'] as Unargs)({ ...r, him: r.him ?? r.name }, comp, v, lx);
  if (r.watcher !== undefined) return (UNARGS['confirmed/list'] as Unargs)({ ...r, them: r.them ?? r.him ?? '' }, comp, v, lx);
  if (r.by !== undefined) return confirmedRest({ ...r, him: r.him ?? r.name ?? '' }, comp, v, lx);
  return confirmedSpans(r, comp, v, lx);
};

/* ------------------------------------------------------------------ *
 * Build 2: the thought's own composites, read back.
 * ------------------------------------------------------------------ */

/**
 * A list's hours that mattered, as the thought says them: "Feeney and Ashby at both, and Pardo at
 * eleven, at the Thalia", "nobody at ten", "Rafferty and Lou here": who the list had at which hour.
 */
function listedR(c: BoardCase, lx: Lexicon, s: string, hours: number[], v: VCtx): { place: PlaceId; at: Map<number, string[]> } {
  const E = entryAlt(c);
  const NS = `(?:${E.re})(?:(?:, | and )(?:${E.re}))*`;
  const HS = `(?:${lx.re.H})(?:(?:, | and )(?:${lx.re.H}))*`;
  // docs/53, addendum: "Rafferty and Moretti were at Kowalski’s", "Benny was at the Orpheum at both
  // hours, Bellucci at ten and somebody in a grey fedora at eleven", "nobody was at the Odessa at ten".
  const head = new RegExp(`^(nobody|${NS}) (?:was|were) at (${lx.re.PL})(?: at (both hours|all of them|${HS}))?(?:, and |, | and |$)`).exec(s.trim());
  if (!head) throw new Error(`voiced: can't read "${s}" as a list's hours`);
  const place = placeV(c, head[2] as string, v);
  const at = new Map<number, string[]>(hours.map((h) => [h, []]));
  const names = (t: string) => listV(t, E.re).map((n) => E.of.get(n) as string);
  const put = (who: string, when: string | undefined) => {
    const hs = when === undefined ? (hours.length === 1 ? hours : null) : when === 'both hours' || when === 'all of them' ? hours : hoursV(lx, when);
    if (!hs) throw new Error('voiced: a list’s hours, but which?');
    if (who !== 'nobody') for (const h of hs) at.set(h, [...(at.get(h) ?? []), ...names(who)]);
  };
  put(head[1] as string, head[3]);
  let rest = s.trim().slice((head[0] as string).length);
  const part = new RegExp(`^(nobody|${NS}) at (both hours|all of them|${HS})(?:, and |, | and |$)`);
  while (rest.length) {
    const m = part.exec(rest);
    if (!m) throw new Error(`voiced: can't read "${rest}" as a list's hours`);
    put(m[1] as string, m[2]);
    rest = rest.slice((m[0] as string).length);
  }
  return { place, at };
}

const listHourSpoken = READ['LIST-HOUR'] as Reader;
READ['LIST-HOUR'] = (a, flags, comp, v, lx) => {
  if (!flags.has('thought')) return listHourSpoken(a, flags, comp, v, lx);
  const hours = a.hours as number[];
  // "the list": the page's own list, named in the thought already.
  const watcher = flags.has('named') ? (comp.props.find((x) => x.k === 'LIST') as P<'LIST'>).watcher : (a.watcher as Id);
  const { place, at } = listedR(v.c, lx, a.listed as string, hours, v);
  // docs/55 1a: who had been there the hour before and gone out.
  const gone = flags.has('gone') ? [{ k: 'LIST', watcher, place, hour: a.before as number, people: a.gone as string[] } as Prop] : [];
  return [{ k: 'WINDOW', hours }, ...hours.map((h) => ({ k: 'LIST', watcher, place, hour: h, people: at.get(h) ?? [], ...(flags.has('whole') ? { whole: true } : {}) }) as Prop), ...gone];
};

/**
 * docs/59 item 3: a list's consequence at the hour it happened, read back. The keeper is the page's
 * own list's (folded: the list has just been said); who was there at {hours}, who had gone from
 * {where} then, and (means) who had been there at {before}, where the means was kept, and gone
 * before {first}.
 */
function thenR(a: Record<string, Read>, flags: ReadonlySet<string>, comp: Composite, v: VCtx): Prop[] {
  const x = comp.props.find((p) => p.k === 'PLACED' || p.k === 'AWAY') as P<'PLACED'> | undefined;
  const watcher = v.speaker ?? x?.by.who;
  if (!watcher || !listOf(v.c, watcher)) throw new Error('voiced: whose list?');
  const by: Src = { k: 'list', who: watcher };
  const where = a.where as Id;
  if (listOf(v.c, watcher)?.place !== where) throw new Error('voiced: not the list’s place');
  const there = (a.there as string[] | undefined) ?? [];
  const gone = (a.gone as string[] | undefined) ?? [];
  // (docs/72, B3: who the list had there only later: "Marchetti didn’t get to the Blue Lantern till ten.")
  if (flags.has('late')) {
    const late = (a.late as string[] | undefined) ?? [];
    if (!late.length) throw new Error('voiced: who came later?');
    return late.map((p) => ({ k: 'PLACED', person: p, place: where, hour: a.after as number, by }) as Prop);
  }
  if (flags.has('there') && !there.length) throw new Error('voiced: who was there?');
  if ((flags.has('gone') || flags.has('means')) && !gone.length) throw new Error('voiced: who had gone?');
  const hours = (a.hours as number[] | undefined) ?? [];
  const out: Prop[] = [];
  if (flags.has('means')) {
    const first = a.first as number;
    // (docs/62, P1: `all`, everybody who had been there, without their hours: the answer just said them.)
    if (!flags.has('all')) for (const p of gone) for (const h of (a.before as number[]) ?? []) out.push({ k: 'PLACED', person: p, place: where, hour: h, by });
    if (!(a.kept as string)?.trim()) throw new Error('voiced: where was it kept?');
    out.push({ k: 'MEANS', how: 'origin', place: where });
    if (flags.has('access')) for (const p of gone) out.push({ k: 'ACCESS', person: p, had: true });
    for (const p of gone) out.push({ k: 'AWAY', person: p, place: where, hour: first, by });
  } else for (const p of gone) for (const h of hours) out.push({ k: 'AWAY', person: p, place: where, hour: h, by });
  for (const p of there) for (const h of hours) out.push({ k: 'PLACED', person: p, place: where, hour: h, by });
  return out;
}

const placedSet = READ['PLACED-SET'] as Reader;
READ['PLACED-SET'] = (a, flags, comp, v, lx) => {
  if (flags.has('then')) return thenR(a, flags, comp, v);
  if (!flags.has('elim')) return placedSet(a, flags, comp, v, lx);
  const people = a.people as string[];
  // The passage says the hour once, in its first sentence.
  const hour = (a.hour as number | undefined) ?? (comp.props[0] as P<'PLACED'>).hour;
  const like = (comp.props[0] as P<'PLACED'>).by;
  if (flags.has('mutual')) {
    const [x, y] = people as [Id, Id];
    return [
      { k: 'PLACED', person: x, place: a.place as Id, hour, by: { k: like.k, who: y } as Src },
      { k: 'PLACED', person: y, place: a.place as Id, hour, by: { k: like.k, who: x } as Src },
    ];
  }
  const src = srcWords((a.src as string).trim());
  const by: Src = src === 'the office' ? { k: 'given' } : src === 'what the room said' ? { k: 'find' } : srcFold(v.c, src, like);
  return people.map((p) => ({ k: 'PLACED', person: p, place: a.place as Id, hour, by }) as Prop);
};

READ.LEFT = (a, flags) => {
  if (flags.has('open')) return [{ k: 'LEFT', people: [a.person as Id], hours: [a.from as number, a.to as number] }];
  if (!(a.access as string)?.trim()) throw new Error('voiced: left with what way in?');
  return [{ k: 'LEFT', hours: [a.hour as number], ...(flags.has('seen') ? { seen: true } : {}) }];
};

const windowMeans = READ['WINDOW-MEANS'] as Reader;
READ['WINDOW-MEANS'] = (a, flags, comp, v, lx) => {
  const c = v.c;
  // The way in a small case's scene says: the office's way, as the case keeps it (who knew is folded).
  const means = (): Prop => meansProp(c);
  if (flags.has('scene')) return [{ k: 'WINDOW', hours: a.hours as number[] }, ...(flags.has('murder') || flags.has('murder-said') ? [] : [means()])];
  if (flags.has('find')) {
    // docs/59 item 3: what the find concludes: whoever did it had been there first.
    // (Round 7, B6: and the hour it had to be had by.)
    if (flags.has('first')) return [{ k: 'MEANS', how: 'first', place: a.origin as Id, ...(flags.has('before') ? { before: a.before as number } : {}) }];
    if (flags.has('gun') || flags.has('blade')) return [{ k: 'MEANS', how: 'origin', place: a.origin as Id }, { k: 'WINDOW', hours: a.hours as number[] }];
    if (flags.has('poison')) return [{ k: 'MEANS', how: 'origin', place: a.origin as Id }];
    return [means()];
  }
  return windowMeans(a, flags, comp, v, lx);
};

READ['MOTIVE-SET'] = (a, flags, comp) => {
  if (flags.has('own')) return [{ k: 'MOTIVE', person: a.person as Id }];
  // Whose reason is the sentence before's, folded.
  const who = (comp.props[0] as P<'MOTIVE'>).person;
  if (flags.has('office')) return [{ k: 'MOTIVE', person: who, said: 'office' }];
  if (flags.has('not-office')) return [{ k: 'MOTIVE', person: who, said: 'not-office' }];
  if (flags.has('papers')) return [{ k: 'MOTIVE', person: '*' }, ...(flags.has('tied') ? [{ k: 'MEANS', how: 'origin', place: a.origin as Id } as Prop] : [])];
  throw new Error('voiced: whose reason?');
};

const ownWord = READ['OWN-WORD'] as Reader;
READ['OWN-WORD'] = (a, flags, comp, v, lx) => {
  // docs/59 item 3: nobody but them had said where they were then.
  if (flags.has('unbacked')) return [{ k: 'UNBACKED', person: a.person as Id, hours: a.hours as number[] }];
  if (!flags.has('told')) return ownWord(a, flags, comp, v, lx);
  const person = a.person as Id;
  const got = placesAtR(v.c, lx, a.said as string, v, person);
  const hs = a.hours as number[];
  if (got.map((x) => x.hour).join() !== hs.join()) throw new Error('voiced: which hours?');
  return got.map((x) => ({ k: 'CLAIM', person, place: x.place, hour: x.hour }) as Prop);
};

const collisionPair = READ['COLLISION-PAIR'] as Reader;
READ['COLLISION-PAIR'] = (a, flags, comp, v, lx) => {
  const x = comp.props[0] as P<'COLLIDES'>;
  const person = a.person as Id | undefined;
  // After a put, "a hole in her story" and "her second story had a list against it": whose is said; where, when and against what are the put's own, folded.
  // (docs/53: where and when may be said, and then must be the put's own.)
  if ((flags.has('hole') || flags.has('second-refused') || flags.has('still')) && ((a.place !== undefined && a.place !== x.place) || (a.hour !== undefined && a.hour !== x.hour))) throw new Error('voiced: not the put’s place or hour');
  if (flags.has('hole')) return [{ ...x, person: person as Id }];
  if (flags.has('second-refused')) return [{ ...x, person: person as Id }, ...comp.props.slice(1).filter((y) => y.k === 'REFUSE').map((y) => ({ ...(y as P<'REFUSE'>), person: person as Id }))];
  if (flags.has('still')) return [{ k: 'COLLIDES', person: person as Id, place: x.place, hour: a.hour as number, with: srcR(v.c, a.src as string, x.with as Src) }];
  if (flags.has('second-list')) return [{ k: 'COLLIDES', person: person as Id, place: a.at as Id, hour: a.hour as number, second: true, with: { k: 'list', who: a.watcher as Id } }];
  return collisionPair(a, flags, comp, v, lx);
};

const HELD_BY = ['agreed', 'strangers', 'elsewhere', 'company', 'other-place', 'untrusted'];
const reaction = READ.REACTION as Reader;
READ.REACTION = (a, flags, comp, v, lx) => {
  const c = v.c;
  const person = a.person as Id;
  if (flags.has('if-held')) return [{ k: 'ADMIT', person, place: a.place as Id, hour: a.hour as number, claimed: flags.has('home') ? (personOf(c, person)?.home as Id) : (a.claimed as Id) }];
  if (flags.has('owned-hour')) return [{ k: 'ADMIT', person, place: a.place as Id, hour: a.hour as number }];
  // docs/59 item 3: after a put, where to go next, not the story again.
  if (flags.has('witness-thought')) return [{ k: 'POINTER', from: 'admit', to: a.witness as Id, why: 'witness' }];
  if (flags.has('second-pointer')) return [{ k: 'POINTER', from: 'second', to: flags.has('met') ? (a.watcher as Id) : (a.place as Id), why: 'watcher' }];
  if (flags.has('second-thought')) {
    // Whose second story: the put's own person, folded (the sentence names the place and the hour).
    const who = (comp.props[0] as P<'SECOND'>).person;
    return [
      { k: 'SECOND', person: who, place: a.place as Id, hour: a.hour as number },
      { k: 'POINTER', from: 'second', to: flags.has('met') ? (a.watcher as Id) : (a.place as Id), why: 'watcher' },
    ];
  }
  if (flags.has('refuse-thought')) return [{ k: 'REFUSE', person, hour: a.hour as number }, ...(flags.has('points') ? [{ k: 'CLAIM', person, place: a.near as Id, hour: a.nearHour as number } as Prop] : [])];
  if (flags.has('held')) {
    const code = HELD_BY.find((k) => flags.has(k)) ?? ['face', 'nowhere', 'untouched'].find((k) => flags.has(k));
    const x = comp.props[0] as P<'HELD'>;
    // An hour the reason doesn't say is the put's, folded.
    // (Whose put it was is folded where the reason only says what the line was about.)
    return [{ k: 'HELD', person: person ?? x.person, hour: (a.hour as number | undefined) ?? x.hour, why: (code ?? 'untouched') as P<'HELD'>['why'], ...(code && HELD_BY.includes(code) ? { by: a.by as Id } : {}), ...(code === 'elsewhere' || code === 'other-place' ? { place: a.place as Id } : {}) }];
  }
  return reaction(a, flags, comp, v, lx);
};

/**
 * The office's lines are the case's own words (the client's line for when, the pointer's reason, the
 * scene as found), and a voicing frames them: every one the line's kind says must be read back,
 * whole; what they say is the line's own propositions, by kind (`givenProps`).
 */
READ.OFFICE = (a, flags, comp) => {
  const must = mustSay({ shape: 'OFFICE', requires: [...flags], template: '' });
  for (const alts of must) if (!alts.some((k) => typeof a[k] === 'string' && (a[k] as string).trim().length > 0)) throw new Error(`voiced: the office's line says no {${alts.join('|')}}`);
  return comp.props;
};

/** A put's or a reaction's own words, read back: what they must say is there, and it's theirs; what it says is the put's, folded. */
function folded(comp: Composite, checks: [boolean, string][]): Prop[] {
  for (const [ok, why] of checks) if (!ok) throw new Error(`voiced: ${why}`);
  return comp.props;
}
const said = (x: Read | undefined): boolean => typeof x === 'string' && x.trim().length > 0;

READ.FIND = (_a, _flags, comp) => comp.props;

const motiveSet = READ['MOTIVE-SET'] as Reader;
READ['MOTIVE-SET'] = (a, flags, comp, v) => {
  if (!flags.has('papers-list')) return motiveSet(a, flags, comp, v, lexicon(v.c));
  // "Mrs. Blau: the dead woman had a file on her.", "Zeldin owed him four hundred dollars.": each
  // page's name, opening its sentence (docs/59 note 7).
  const lines = a.lines as string;
  return v.c.people.filter((p) => p.role === 'suspect' && new RegExp(`(?<![\\w’])${esc(p.short)}(?![\\w])`).test(lines)).map((p) => ({ k: 'MOTIVE', person: p.id }) as Prop);
};

const putPair = READ['COLLISION-PAIR'] as Reader;
READ['COLLISION-PAIR'] = (a, flags, comp, v, lx) => {
  if (!flags.has('put')) return putPair(a, flags, comp, v, lx);
  const x = comp.props[0] as P<'COLLIDES'>;
  // (docs/62 item 2: to their face, "you were home at eleven", "you were at the Odessa at ten".)
  const claim = lc((a.claim as string) ?? '').replace(/^you were (?:at (?!home\b))?/, '');
  const at = /^(.+) at (seven|eight|nine|ten|eleven|twelve)$/.exec(claim);
  const place = at?.[1] === 'home' ? personOf(v.c, x.person)?.home : at ? c2place(v.c, at[1] as string) : undefined;
  return folded(comp, [
    [!!at && place === x.place && HOURWORDS[at[2] as string] === x.hour, `the put says "${a.claim}", not their line`],
    [said(a.breaker), 'the put says no line against it'],
    [a.person === undefined || a.person === x.person, 'the put is to somebody else'],
  ]);
};

// docs/59 item 3: the thought on the page that told the line: whose story, where and when, and whose
// line it was; the line itself is the page's own, folded.
const herePair = READ['COLLISION-PAIR'] as Reader;
READ['COLLISION-PAIR'] = (a, flags, comp, v, lx) => {
  if (!flags.has('here')) return herePair(a, flags, comp, v, lx);
  const x = comp.props[0] as P<'COLLIDES'>;
  const w = x.with as Prop;
  const person = a.person as Id;
  const place = flags.has('home') ? (personOf(v.c, person)?.home as PlaceId) : (a.place as PlaceId);
  const src = w.k === 'LIST' ? w.watcher : w.k === 'CLAIM' ? w.person : undefined;
  if (!src || personV(v.c, (a.src as string) ?? '') !== src) throw new Error(`voiced: whose line is "${a.src}"?`);
  if (flags.has('seen') && (w.k !== 'LIST' || a.at !== w.place)) throw new Error('voiced: seen where?');
  if (flags.has('unseen') && (w.k !== 'LIST' || w.people.includes(person))) throw new Error('voiced: never saw them, but the list has them');
  return [{ k: 'COLLIDES', person, place, hour: a.hour as number, with: w }];
};

function c2place(c: BoardCase, name: string): PlaceId | undefined {
  return c.places.find((p) => placeName(c, p.id).toLowerCase() === name.toLowerCase())?.id;
}

const reactionThought = READ.REACTION as Reader;
READ.REACTION = (a, flags, comp, v, lx) => {
  const c = v.c;
  const x = comp.props[0] as Prop;
  const who = (x as { person?: Id }).person;
  const mine = a.person === undefined || a.person === who;
  // (docs/53: an hour said is the put's own.)
  const hourOf = comp.props.map((y) => (y as { hour?: number }).hour).find((h) => h !== undefined);
  if (a.hour !== undefined && hourOf !== undefined && a.hour !== hourOf && (flags.has('held-said') || flags.has('admit') || flags.has('refuse-said'))) throw new Error('voiced: not the put’s hour');
  if (flags.has('held-said')) return folded(comp, [[mine, 'whose put?']]);
  if (flags.has('admit')) {
    const ad = x as P<'ADMIT'>;
    return folded(comp, [
      [mine, 'whose admission?'],
      [said(a.claim) && c2place(c, a.claim as string) === ad.claimed, `not where they said: "${a.claim}"`],
      [a.truth === undefined || c2place(c, a.truth as string) === ad.place, `not where they were: "${a.truth}"`],
      [a.witness === undefined ? !ad.witness || [...flags].some((f) => f.includes(':')) : a.witness === ad.witness, 'not their witness'],
    ]);
  }
  if (flags.has('refuse-said')) {
    const pair = comp.props.find((y) => y.k === 'CLAIM') as P<'CLAIM'> | undefined;
    return folded(comp, [[mine, 'whose refusal?'], [!pair || a.partner === pair.company?.[0], 'not their partner']]);
  }
  if (flags.has('second-said')) return [{ k: 'SECOND', person: who as Id, place: a.place as Id }];
  if (flags.has('crack-said')) {
    const sec = comp.props.find((y) => y.k === 'SECOND') as P<'SECOND'> | undefined;
    return folded(comp, [[mine, 'whose crack?'], [said(a.holder) && said(a.why), 'a crack that doesn’t say with whom, or why'], [!sec || a.place === sec.place, 'not their second story']]);
  }
  return reactionThought(a, flags, comp, v, lx);
};

READ.PRESENT = (a, _flags, _comp, v) => {
  // "my witness", marked with whom it means, or the name.
  const m = /^[Mm]y witness⁣(\d+)⁤$/.exec((a.who as string).trim());
  const person = m ? (v.c.people[Number(m[1])]?.id as Id) : personR(v.c, a.who as string);
  return [{ k: 'PRESENT', person, place: v.here }];
};

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
  // The voicing's flags, and the composite's own form (what the writer knew: the reason names the
  // company, "named"; a "with" that isn't company, "aside"), where the words are to be read.
  const flags = new Set([...(vo.requires ?? []), ...((comp as { flags?: string[] }).flags ?? [])]);
  let last = `${vo.id}: the words don't fit the template`;
  for (const raw of splitsAll(vo.template, text)) {
    try {
      const a: Record<string, Read> = {};
      for (const [k, vals] of Object.entries(raw)) {
        const type = schema[k];
        if (!type) throw new Error(`voiced: ${vo.id} names {${k}}, which ${comp.shape} hasn't`);
        const reads = vals.map((x) => readTyped(v.c, lx, v, type, x));
        // A slot said twice says the same thing twice ("{p}" and "{p:them}" are one person).
        // (Words said twice may be said once with a capital: "{Pthey}" and "{pthey}".)
        const same = (x: Read) => (typeof x === 'string' ? lc(x) : JSON.stringify(x));
        if (reads.some((x) => same(x) !== same(reads[0] as Read))) throw new Error(`voiced: {${k}} is two things`);
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
  // docs/59 item 2: a run of clauses, each in its own voicing: the words are the parts' words, each
  // part reads back to what it says, and what they say adds up to the composite's propositions.
  if (id === 'seq') {
    const parts = (comp.parts ?? []) as (Composite & { said?: string; flags?: string[] })[];
    if (parts.map((p) => p.said ?? '').join(comp.join ?? ' ') !== text) return { ok: false, why: 'seq: the words aren’t its parts’' };
    for (const p of parts) {
      if (p.voicing === 'flesh') {
        // (The speaker's own last words, from the bible, saying nobody else came in.)
        if (!p.said?.trim() || (p.flags?.includes('nobody') && !/\b(?:nobody|no one|lot|everybody|all)\b/i.test(p.said))) return { ok: false, why: `seq: their own words don’t say it: “${p.said}”` };
        continue;
      }
      const r = rereadVoiced(p, v);
      if (!r.ok) return { ok: false, why: `seq: ${r.why}` };
    }
    const got = mergeParts(comp.shape, parts.flatMap((p) => p.props)).map(canon).sort();
    const want = comp.props.map(canon).sort();
    return got.length === want.length && got.every((g, i) => g === want[i]) ? { ok: true } : { ok: false, why: `seq: read ${got.join(' ')}` };
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
      // (The first part may open on the page's join, "So" or "But", which its own words don't say.)
      const opened = (x: string | undefined) => x !== undefined && host !== undefined && /^(?:So|But) /.test(x) && x.replace(/^(?:So|But) /, '').toLowerCase() === host.toLowerCase();
      if ((args.a !== host && !opened(args.a)) || args.b !== lower(b?.said ?? '')) return { ok: false, why: `${id}: not its parts' words` };
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
  // docs/53: and clear, by the dial: every argument in its words, no pronoun for a place, no oblique tag.
  const why = clarityOf(v.c, comp as Composite & { said?: string; args?: Args; voicing?: string }, v.here, v.speaker);
  if (why.length === 0) T.clear++;
  else T.unclear.push({ id: comp.voicing ?? '', why, said: comp.said ?? '' });
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
