/**
 * docs/52 §4: flesh for a bone. A **voicing** is a composite rendered in the
 * voice, a template whose `{args}` the realizer fills
 * (`content/board/voicings.json`):
 *
 * ```
 * { id, shape, manner?, tierBand?, template, requires?, forbids?, joke? }
 * ```
 *
 * `requires` and `forbids` are flags the composer sets on the composite (the
 * connective it took: `so`, `but`; what it is: `murder`, `walk`; where it
 * sits: `first`, `next`; a list of `one` or `many`). A voicing may reorder or
 * fold the composite's arguments but never drop or add a fact (the round trip,
 * `scripts/roundtrip.ts`, reads every voiced composite back through its
 * template). `{Arg}` is the argument with a capital.
 *
 * Build 2: an argument may be **typed** (`Typed`: a person, people, an hour,
 * hours, a place), and a template may say a typed argument in a form:
 *
 * - a person: `{p}` the name, `{p:they}` / `{p:them}` / `{p:their}` the
 *   pronoun (marked with whom it means, for the planner's reference pass),
 *   `{p:role}` the role where the night has one ("the house manager"), the
 *   name where it hasn't;
 * - an hour: `{h}` "ten", `{h:oclock}` "ten o’clock";
 * - hours and people: `{hs}` "eight, nine and ten", `{hs:or}` "ten or eleven"; people
 *   `{ps:poss}` "Russo’s and Glick’s", `{ps:orposs}` "Russo’s or Glick’s".
 *
 * Choice (`say.ts`): the shape's voicings that fit the manner, the tier band
 * and the flags; the most specific wins; among those, least recently used
 * tonight. Nothing fits: the plain rendering (`plain.ts`) is the fallback.
 */

import voicingsJson from '../../../../content/board/voicings.json';
import { andList, hourWord, nameOf, oclock, placeName, pronOf, type BoardCase, type Hour } from '../model.js';
import { markPronoun, roleOf } from '../plan/refer.js';
import { shortOther } from './phrase.js';
import type { Id, Shape } from './types.js';

export interface Voicing {
  id: string;
  shape: Shape;
  /** The speaker's manner (plain, terse, careful); none for the narrator's own, or any speaker's. */
  manner?: string;
  /** low (Raw, Coddled), mid (Poached, Soft-boiled), high (Medium, Hard-boiled). */
  tierBand?: 'low' | 'mid' | 'high';
  template: string;
  requires?: string[];
  forbids?: string[];
  /** Voicings that share a pick key are chosen among by the hand's least-recently-used rule. */
  pick?: string;
  /** The voicing carries a joke: said only where the page may still tell one, and it counts. */
  joke?: boolean;
}

let VOICINGS: Voicing[] = voicingsJson as Voicing[];
const BY_ID = new Map<string, Voicing>();
const BY_SHAPE = new Map<string, Voicing[]>();
function index(): void {
  BY_ID.clear();
  BY_SHAPE.clear();
  for (const v of VOICINGS) {
    BY_ID.set(v.id, v);
    BY_SHAPE.set(v.shape, [...(BY_SHAPE.get(v.shape) ?? []), v]);
  }
}
index();

export function voicings(): readonly Voicing[] {
  return VOICINGS;
}

/** Voice from another set (the tools and the tests); `null` puts the shipped one back. */
export function useVoicings(vs: Voicing[] | null): void {
  VOICINGS = vs ?? (voicingsJson as Voicing[]);
  index();
}

export function voicingById(id: string): Voicing | undefined {
  return BY_ID.get(id);
}

/** How specific a voicing is: the flags it asks for, its manner, its tier band. */
export function specificity(v: Voicing): number {
  return (v.requires?.length ?? 0) + (v.manner ? 1 : 0) + (v.tierBand ? 1 : 0);
}

/**
 * The voicings of a shape that fit, the most specific of them. Given the arguments, a voicing that
 * names one the composite hasn't doesn't fit (the old decks' rule: a card is dealt only when every
 * slot can be filled).
 */
export function fitting(shape: Shape, flags: ReadonlySet<string>, o: { manner?: string; tierBand?: string } = {}, args?: Args): Voicing[] {
  const out = (BY_SHAPE.get(shape) ?? []).filter(
    (v) =>
      (v.manner === undefined || v.manner === o.manner) &&
      (v.tierBand === undefined || v.tierBand === o.tierBand) &&
      (v.requires ?? []).every((r) => flags.has(r)) &&
      !(v.forbids ?? []).some((f) => flags.has(f)) &&
      (!args || slotsOf(v.template).every((k) => args[k] !== undefined || args[(k[0] as string).toUpperCase() + k.slice(1)] !== undefined)),
  );
  const best = Math.max(-1, ...out.map(specificity));
  return out.filter((v) => specificity(v) === best);
}

/* ------------------------------------------------------------------ *
 * Typed arguments, and their forms.
 * ------------------------------------------------------------------ */

/** An argument the realizer says, and the round trip reads back, by its type. */
export type Typed =
  | { t: 'person'; id: Id }
  /** A list's people: ids, `other:<id>`, `look:<look>`. */
  | { t: 'people'; ids: string[] }
  | { t: 'hour'; h: number }
  | { t: 'hours'; hs: number[] }
  /** A place by name: "the Thalia". */
  | { t: 'place'; id: Id }
  /** A place where the detective may be standing: "here", or "at the Thalia". */
  | { t: 'at'; id: Id; here: Id };

export type ArgV = string | Typed;
export type Args = Record<string, ArgV>;

/** A slot: `{name}` or `{name:form}`. */
export const SLOT = /\{([A-Za-z][\w-]*)(?::([a-z]+))?\}/g;

const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);
const lc1 = (s: string): string => (s ? (s[0] as string).toLowerCase() + s.slice(1) : s);

function orList(xs: readonly string[]): string {
  return xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : (xs[0] ?? '');
}

/** A list entry by what a page calls it: a name, "Pardo", "somebody in a camel coat". */
export function entrySaid(c: BoardCase, e: string): string {
  if (e.startsWith('other:')) return shortOther(c.others?.find((o) => o.id === e.slice(6))?.name ?? e.slice(6));
  if (e.startsWith('look:')) return `somebody ${e.slice(5)}`;
  return nameOf(c, e);
}

/** A typed argument in a form. */
export function renderTyped(c: BoardCase, x: Typed, form?: string): string {
  switch (x.t) {
    case 'person': {
      const pr = pronOf(c, x.id);
      const m = markPronoun(c, x.id);
      if (form === 'they') return pr.he + m;
      if (form === 'them') return pr.him + m;
      if (form === 'their') return pr.his + m;
      if (form === 'role') return roleOf(c, x.id) ?? nameOf(c, x.id);
      return nameOf(c, x.id);
    }
    case 'people': {
      const ns = x.ids.map((e) => entrySaid(c, e)).map((n) => (form === 'poss' || form === 'orposs' ? `${n}’s` : n));
      return form === 'or' || form === 'orposs' ? orList(ns) : andList(ns);
    }
    case 'hour':
      return form === 'oclock' ? oclock(x.h as Hour) : hourWord(x.h as Hour);
    case 'hours': {
      const ws = x.hs.map((h) => hourWord(h as Hour));
      const s = form === 'or' ? orList(ws) : andList(ws);
      return form === 'oclock' ? `${s} o’clock` : s;
    }
    case 'place':
      return placeName(c, x.id);
    case 'at':
      // docs/53, the dial: the place by name, even the one I'm standing in.
      return `at ${placeName(c, x.id)}`;
  }
}

/**
 * A template filled: `{arg}` as given (a string, or a typed argument said by name), `{Arg}` with a
 * capital, `{arg:form}` a typed argument in a form. A missing argument leaves the slot (and fails the
 * round trip).
 */
export function fill(template: string, args: Args, c?: BoardCase): string {
  return template.replace(SLOT, (m, k: string, form: string | undefined) => {
    const lower = lc1(k);
    const v = args[k] ?? args[lower];
    if (v === undefined) return m;
    let s: string;
    if (typeof v === 'string') s = v;
    else if (c) s = renderTyped(c, v, form);
    else return m;
    return k !== lower ? cap(s) : s;
  });
}

/** The slots a template names, in order (lower-cased first letter: `{He}` is `he`), forms dropped. */
export function slotsOf(template: string): string[] {
  return [...template.matchAll(SLOT)].map((m) => lc1(m[1] as string));
}

/** The slots a template names with their forms: `p:they`. */
export function formsOf(template: string): { key: string; form?: string }[] {
  return [...template.matchAll(SLOT)].map((m) => ({ key: lc1(m[1] as string), ...(m[2] ? { form: m[2] } : {}) }));
}
