import type { BoardCase, Hour, Person, PersonId, PlaceId, Question } from './types.js';
import { fmtHour, questionsOf } from './solver.js';

/**
 * 4a.2: what motivates a question. The player asks only what something they hold points at:
 * - a search at the scene: the office sends you there;
 * - a watcher's list: anything that names the watcher's place (the scene search's origin, an
 *   account that claims the place, a given, a remark);
 * - an account: anything that names the person (a list, someone's company, an admission, a
 *   given that names them: a guest, a lodger, the finder, the one the client points at);
 * - a confrontation: the account it puts back.
 * The designed path and the suggested order ask only what's been pointed to (`pathMotivated`).
 */

/** `givens`, or a question id. */
export type Source = string;
export const GIVENS: Source = 'givens';

interface Mentions {
  places: Map<PlaceId, string>;
  people: Map<PersonId, string>;
}

export interface PointerIndex {
  questions: Map<string, Question>;
  /** For each question, every source that points at it, with the plain reason it gives. */
  by: Map<string, Map<Source, string>>;
}

const INDEX = new WeakMap<BoardCase, PointerIndex>();

const cap = (s: string) => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

export function pointerIndex(c: BoardCase): PointerIndex {
  const hit = INDEX.get(c);
  if (hit) return hit;
  const person = (id: PersonId) => c.people.find((p) => p.id === id);
  const pn = (id: PersonId) => person(id)?.short ?? id;
  const pl = (id: PlaceId) => c.places.find((p) => p.id === id)?.short ?? id;
  const he = (p: Person | undefined) => (p?.female === undefined ? undefined : p.female ? 'she' : 'he');
  const says = (p: PersonId, place: PlaceId, h: Hour) => {
    const x = he(person(p));
    return x ? `${pn(p)} says ${x} was at ${pl(place)} at ${fmtHour(h)}` : `${pn(p)}’s account has ${pl(place)} at ${fmtHour(h)}`;
  };
  // Prefer the crime's hours when a claim or an entry spans several: that's what a detective follows.
  const hourOrder = (hs: Hour[]) => [...hs].sort((a, b) => Number(c.crime.window.includes(b)) - Number(c.crime.window.includes(a)) || a - b);
  const scene = c.crime.scene;

  const mentions = new Map<Source, Mentions>();
  const m = (src: Source): Mentions => {
    let x = mentions.get(src);
    if (!x) mentions.set(src, (x = { places: new Map(), people: new Map() }));
    return x;
  };
  const addPlace = (src: Source, p: PlaceId, why: string) => {
    const x = m(src);
    if (!x.places.has(p)) x.places.set(p, why);
  };
  const addPerson = (src: Source, p: PersonId, why: string) => {
    const x = m(src);
    if (!x.people.has(p)) x.people.set(p, why);
  };
  const fromRemark = (src: Source, who: string, r: { facts: { p: PersonId; place: PlaceId; k: string }[]; mentions?: { places?: PlaceId[]; people?: PersonId[]; why?: string } }) => {
    for (const f of r.facts) {
      addPerson(src, f.p, `${who} mentions ${pn(f.p)}`);
      addPlace(src, f.place, `${who} mentions ${pl(f.place)}`);
    }
    for (const p of r.mentions?.places ?? []) addPlace(src, p, r.mentions?.why ?? `${who} mentions ${pl(p)}`);
    for (const p of r.mentions?.people ?? []) addPerson(src, p, r.mentions?.why ?? `${who} mentions ${pn(p)}`);
  };

  // The office.
  const client = pn(c.client);
  for (const g of c.givens.points ?? []) (g.kind === 'place' ? addPlace : addPerson)(GIVENS, g.ref, g.text);
  addPlace(GIVENS, scene, 'the office sends you to the scene');
  if (c.crime.finder && c.crime.finder !== c.client) addPerson(GIVENS, c.crime.finder, `${pn(c.crime.finder)} found him`);
  if (c.givens.pointer) addPerson(GIVENS, c.givens.pointer, `${client} points at ${pn(c.givens.pointer)}`);
  for (const p of c.givens.access) addPerson(GIVENS, p, `the office says ${pn(p)} lives at ${pl(scene)}`);
  for (const p of c.givens.known ?? []) addPerson(GIVENS, p, `the office names ${pn(p)}`);
  for (const f of c.givens.facts) {
    if (f.k !== 'at') continue;
    addPerson(GIVENS, f.p, f.place === scene ? `${pn(f.p)} was at ${client}’s at ${fmtHour(f.h)}` : `the office puts ${pn(f.p)} at ${pl(f.place)} at ${fmtHour(f.h)}`);
    addPlace(GIVENS, f.place, `the office puts ${pn(f.p)} at ${pl(f.place)} at ${fmtHour(f.h)}`);
  }

  // The answers.
  for (const f of c.finds) {
    const src = `search:${f.id}`;
    // A murder's scene ties the means to its origin (a label, a registration). A small case's scene
    // only shows the way in; where it was learnt is the office's to say.
    if (f.gives.means && c.means.origin !== scene && c.type === 'murder') {
      addPlace(src, c.means.origin, `the ${c.means.name.replace(/^(a|an|the) /, '')} came from ${pl(c.means.origin)}`);
    }
    fromRemark(src, `the ${f.what}`, f);
  }
  for (const l of c.lists) {
    const src = `list:${l.watcher}`;
    const w = pn(l.watcher);
    const byPerson = new Map<PersonId, Hour[]>();
    for (const [hs, es] of Object.entries(l.entries)) for (const e of es) if ('person' in e) byPerson.set(e.person, [...(byPerson.get(e.person) ?? []), Number(hs)]);
    for (const [p, hs] of byPerson) addPerson(src, p, `${w}’s list has ${pn(p)} at ${pl(l.place)} at ${fmtHour(hourOrder(hs)[0] as Hour)}`);
    for (const r of l.remarks) fromRemark(src, w, r);
  }
  for (const a of c.accounts) {
    const src = `account:${a.person}`;
    const byPlace = new Map<PlaceId, Hour[]>();
    const byMate = new Map<PersonId, Hour[]>();
    for (const [hs, cl] of Object.entries(a.claims)) {
      const h = Number(hs);
      byPlace.set(cl.place, [...(byPlace.get(cl.place) ?? []), h]);
      for (const x of cl.company) byMate.set(x, [...(byMate.get(x) ?? []), h]);
    }
    for (const [p, hs] of byPlace) addPlace(src, p, says(a.person, p, hourOrder(hs)[0] as Hour));
    for (const [x, hs] of byMate) {
      const h = hourOrder(hs)[0] as Hour;
      addPerson(src, x, `${pn(a.person)} says ${pn(x)} was with ${he(person(a.person)) === 'she' ? 'her' : he(person(a.person)) === 'he' ? 'him' : 'them'} at ${pl(a.claims[h]?.place ?? '')} at ${fmtHour(h)}`);
    }
    for (const r of a.remarks) fromRemark(src, pn(a.person), r);
  }
  for (const k of c.confrontations) {
    const src = `confront:${k.person}@${k.hour}`;
    for (const y of k.names ?? []) addPerson(src, y, `${pn(k.person)} names ${pn(y)}`);
    if (k.secondLie?.place) addPlace(src, k.secondLie.place, `${pn(k.person)} now says ${pl(k.secondLie.place)}`);
    const lie = c.lies.find((l) => l.person === k.person && l.hour === k.hour);
    if (k.response === 'admit' && lie) addPlace(src, lie.truth, `${pn(k.person)} owns up to ${pl(lie.truth)}`);
  }

  // Who each question is pointed to by.
  const qs = questionsOf(c);
  const by = new Map<string, Map<Source, string>>();
  for (const q of qs) {
    const out = new Map<Source, string>();
    if (q.kind === 'search') out.set(GIVENS, 'start at the scene');
    else if (q.kind === 'list') {
      for (const [src, x] of mentions) if (src !== q.id && x.places.has(q.at)) out.set(src, x.places.get(q.at) as string);
    } else if (q.kind === 'account') {
      for (const [src, x] of mentions) if (src !== q.id && x.people.has(q.subject)) out.set(src, x.people.get(q.subject) as string);
    } else if (q.kind === 'confront') {
      const cl = c.accounts.find((a) => a.person === q.subject)?.claims[q.hour as Hour];
      if (cl) out.set(`account:${q.subject}`, says(q.subject, cl.place, q.hour as Hour));
    }
    by.set(q.id, out);
  }
  const idx: PointerIndex = { questions: new Map(qs.map((q) => [q.id, q])), by };
  INDEX.set(c, idx);
  return idx;
}

/** Whether `q` is pointed to by the office or by one of `held`. */
export function pointed(c: BoardCase, q: string, held: Iterable<string>): boolean {
  const by = pointerIndex(c).by.get(q);
  if (!by) return false;
  if (by.has(GIVENS)) return true;
  for (const h of held) if (by.has(h)) return true;
  return false;
}

/**
 * The part of `held` a player could have reached by following pointers from the office. A
 * question nothing points at is never asked, however useful its answer would be.
 */
export function closure(c: BoardCase, held: readonly string[]): string[] {
  const idx = pointerIndex(c);
  const got = new Set<string>();
  for (let grew = true; grew; ) {
    grew = false;
    for (const q of held) {
      if (got.has(q)) continue;
      const by = idx.by.get(q);
      if (!by) continue;
      if (by.has(GIVENS) || [...by.keys()].some((s) => got.has(s))) {
        got.add(q);
        grew = true;
      }
    }
  }
  return held.filter((q) => got.has(q));
}

/** What you do with a question, in plain words: "ask Mrs. Rafferty who was there". */
export function action(c: BoardCase, q: string): string {
  const qq = pointerIndex(c).questions.get(q);
  if (!qq) return q;
  const p = c.people.find((x) => x.id === qq.subject);
  const name = p?.short ?? qq.subject;
  if (qq.kind === 'search') return `search ${c.finds.find((f) => f.id === qq.subject)?.what ?? 'the scene'}`;
  if (qq.kind === 'list') return `ask ${name} who was there`;
  if (qq.kind === 'confront') return `put it to ${name}`;
  const x = p?.female === undefined ? 'they were' : p.female ? 'she was' : 'he was';
  return `ask ${name} where ${x}`;
}

/**
 * The reason to ask `q`, given what came before (`earlier`, in order, as numbered steps): the
 * latest earlier step that points at it, or the office. Null when nothing does.
 */
export function reasonFor(c: BoardCase, q: string, earlier: readonly string[], label = (i: number) => `step ${i + 1}`): { by: Source; text: string } | null {
  const by = pointerIndex(c).by.get(q);
  if (!by) return null;
  // Where the means came from is the strongest reason to ask a watcher: cite the scene first.
  if (q.startsWith('list:')) {
    const i = earlier.findIndex((s) => s.startsWith('search:') && by.has(s));
    if (i >= 0) return { by: earlier[i] as string, text: `${cap(by.get(earlier[i] as string) as string)} (${label(i)}): ${action(c, q)}.` };
  }
  for (let i = earlier.length - 1; i >= 0; i--) {
    const s = earlier[i] as string;
    const why = by.get(s);
    if (why) return { by: s, text: `${cap(why)} (${label(i)}): ${action(c, q)}.` };
  }
  const g = by.get(GIVENS);
  if (g) return { by: GIVENS, text: q.startsWith('search:') || /\bthe office\b/.test(g) ? `${cap(g)}: ${action(c, q)}.` : `${cap(g)} (the office): ${action(c, q)}.` };
  return null;
}
