/**
 * docs/52 §4: flesh for a bone. A **voicing** is a composite rendered in the
 * voice, a template whose `{args}` the realizer fills
 * (`content/board/voicings.json`):
 *
 * ```
 * { id, shape, manner?, tierBand?, template, requires?, forbids?, pick? }
 * ```
 *
 * `requires` and `forbids` are flags the composer sets on the composite (the
 * connective it took: `so`, `but`; what it is: `murder`, `walk`; where it
 * sits: `rest`). A voicing may reorder or fold the composite's arguments but
 * never drop or add a fact (the round trip, `scripts/roundtrip.ts`, runs on
 * the voiced composites too). `{Arg}` is the argument with a capital.
 *
 * Choice: the shape's voicings that fit the manner, the tier band and the
 * flags; the most specific wins; several of one `pick` key are chosen among by
 * the hand's least-recently-used rule (`ctx.pick`). Nothing fits: the plain
 * rendering (`plain.ts`) is the fallback (inside somebody's answer, their own
 * words).
 *
 * Build 1's set is minimal: one voicing per shape, manner and form, taken from
 * the planner's own phrasings (docs/49), so the voiced page reads as
 * Planner 2's did.
 */

import voicingsJson from '../../../../content/board/voicings.json';
import type { Shape } from './types.js';

export interface Voicing {
  id: string;
  shape: Shape;
  /** The speaker's manner (plain, terse, careful, watcher); none for the narrator's own. */
  manner?: string;
  /** low (Raw, Coddled), mid (Poached, Soft-boiled), high (Medium, Hard-boiled). */
  tierBand?: 'low' | 'mid' | 'high';
  template: string;
  requires?: string[];
  forbids?: string[];
  /** Voicings that share a pick key are chosen among by the hand's least-recently-used rule. */
  pick?: string;
}

let VOICINGS: Voicing[] = voicingsJson as Voicing[];
const BY_ID = new Map<string, Voicing>();
function index(): void {
  BY_ID.clear();
  for (const v of VOICINGS) BY_ID.set(v.id, v);
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

/** The voicings of a shape that fit, most specific first. */
export function fitting(shape: Shape, flags: ReadonlySet<string>, o: { manner?: string; tierBand?: string } = {}): Voicing[] {
  const out = VOICINGS.filter(
    (v) =>
      v.shape === shape &&
      (v.manner === undefined || v.manner === o.manner) &&
      (v.tierBand === undefined || v.tierBand === o.tierBand) &&
      (v.requires ?? []).every((r) => flags.has(r)) &&
      !(v.forbids ?? []).some((f) => flags.has(f)),
  );
  const spec = (v: Voicing) => (v.requires?.length ?? 0) + (v.manner ? 1 : 0) + (v.tierBand ? 1 : 0);
  const best = Math.max(-1, ...out.map(spec));
  return out.filter((v) => spec(v) === best);
}

const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** A template filled: `{arg}` as given, `{Arg}` with a capital. A missing argument leaves the slot (and fails the round trip). */
export function fill(template: string, args: Record<string, string>): string {
  return template.replace(/\{([A-Za-z][\w-]*)\}/g, (m, k: string) => {
    if (args[k] !== undefined) return args[k] as string;
    const lower = k[0]?.toLowerCase() + k.slice(1);
    if (k !== lower && args[lower] !== undefined) return cap(args[lower] as string);
    return m;
  });
}

/** The slots a template names, in order (lower-cased first letter: `{He}` is `he`). */
export function slotsOf(template: string): string[] {
  return [...template.matchAll(/\{([A-Za-z][\w-]*)\}/g)].map((m) => {
    const k = m[1] as string;
    return (k[0] as string).toLowerCase() + k.slice(1);
  });
}
