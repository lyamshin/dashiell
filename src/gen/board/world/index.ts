/**
 * docs/48: the worlds a night can be cast from. The dealt cast is the default
 * and has no world; `neighbourhood` is the bible in `content/neighbourhood/`,
 * behind `?world=neighbourhood` in the book and `--world neighbourhood` in the
 * tools until the designer blesses it.
 *
 * A world is loaded once, checked whole (`load.ts`), and refused loudly if it
 * doesn't hold. Tests may register a bible of their own under a name.
 */

import placesJson from '../../../../content/neighbourhood/places.json';
import peopleJson from '../../../../content/neighbourhood/people.json';
import stubPlaces from '../../../../content/neighbourhood/stub/places.json';
import stubPeople from '../../../../content/neighbourhood/stub/people.json';
import { parseBible } from './load.js';
import type { WorldCtx } from './cast.js';
import type { Bible } from './types.js';

export type { Bible, BiblePerson, BiblePlace } from './types.js';
export type { WorldCtx } from './cast.js';

/** The worlds the tools and the book know by name. */
export const WORLD_NAMES = ['neighbourhood'] as const;
export type WorldName = (typeof WORLD_NAMES)[number];

const SOURCES: Record<string, () => Bible> = {
  /** docs/48 §1: the Lower East Side, ten places and twenty-four people. */
  neighbourhood: () => parseBible('neighbourhood', placesJson, peopleJson),
  /** The loader's own test bible: three places and eight people. It can't cast a night. */
  stub: () => parseBible('stub', stubPlaces, stubPeople, { coverage: false }),
};

const LOADED = new Map<string, Bible>();

/** A bible by name, loaded and checked once. Throws, naming every problem, if it doesn't hold. */
export function worldBible(name: string): Bible {
  const hit = LOADED.get(name);
  if (hit) return hit;
  const src = SOURCES[name];
  if (!src) throw new Error(`No world called "${name}". The worlds are: ${Object.keys(SOURCES).join(', ')}.`);
  const b = src();
  LOADED.set(name, b);
  return b;
}

/** For tests and tools: a bible of their own under a name (it replaces any loaded under that name). */
export function registerWorld(name: string, bible: Bible): void {
  LOADED.set(name, bible);
  SOURCES[name] = () => bible;
}

export function isWorld(name: string | null | undefined): name is string {
  return !!name && (name in SOURCES || LOADED.has(name));
}

/** What the generator needs to cast a night from a world, with the names to keep off tonight. */
export function worldCtx(name: string, avoid?: WorldCtx['avoid']): WorldCtx {
  return { name, bible: worldBible(name), ...(avoid ? { avoid } : {}) };
}
