/**
 * The map: where the board's places sit on the Lower East Side (docs/44, round 5's U11). The game's
 * walk (`src/game/board/walk.ts`) says the street between two places from it, and the generator
 * puts a side remark's sighting where two walks could cross on it (docs/65 §1).
 *
 * The streets are real, and so is their order: Mulberry, Mott, Elizabeth, the Bowery, Chrystie and
 * on east to Pitt and Cannon; Houston, Rivington, Delancey, Broome, Grand, Hester and Canal from
 * north to south; the avenues north of Houston. And so is where each one runs. A place on a street
 * sits on the stretch that street really covers, at a spot its own name picks, so it sits in the
 * same spot all night: a flat on Second Avenue is north of Houston Street, where Second Avenue starts.
 */

import type { Place } from './types.js';

/**
 * A north–south street: how far east of Mulberry Street it is (short blocks), and the stretch it
 * runs, in blocks north of Grand Street. The avenues start at Houston Street; below it the streets
 * carry on from them (Second Avenue from Chrystie, First from Allen, A from Essex, B from Clinton).
 */
export const NS: Readonly<Record<string, { x: number; y: [number, number] }>> = {
  'Park Row': { x: -3, y: [-6, -4] },
  'Centre Street': { x: -2, y: [-6, 2] },
  'Mulberry Street': { x: 0, y: [-4, 4] },
  'Mott Street': { x: 1, y: [-4, 4] },
  'Elizabeth Street': { x: 2, y: [-3, 4] },
  'the Bowery': { x: 3, y: [-4, 6] },
  'Third Avenue': { x: 3, y: [6, 9] },
  'Chrystie Street': { x: 4, y: [-2, 4] },
  'Second Avenue': { x: 4, y: [4, 9] },
  'Forsyth Street': { x: 5, y: [-2, 4] },
  'Eldridge Street': { x: 6, y: [-2, 4] },
  'Allen Street': { x: 7, y: [-3, 4] },
  'First Avenue': { x: 7, y: [4, 9] },
  'Orchard Street': { x: 8, y: [-2, 4] },
  'Ludlow Street': { x: 9, y: [-2, 4] },
  'Essex Street': { x: 10, y: [-3, 4] },
  'Avenue A': { x: 10, y: [4, 9] },
  'Norfolk Street': { x: 11, y: [-2, 4] },
  'Suffolk Street': { x: 12, y: [-2, 4] },
  'Clinton Street': { x: 13, y: [-4, 4] },
  'Avenue B': { x: 13, y: [4, 9] },
  'Attorney Street': { x: 14, y: [0, 4] },
  'Ridge Street': { x: 15, y: [0, 4] },
  'Pitt Street': { x: 16, y: [0, 4] },
  'Cannon Street': { x: 17, y: [0, 4] },
};

/** An east–west street: how far north of Grand Street it is (blocks), and the stretch it runs, east of Mulberry. */
export const EW: Readonly<Record<string, { y: number; x: [number, number] }>> = {
  'Stuyvesant Street': { y: 8, x: [3, 4] },
  'East Fifth Street': { y: 7, x: [3, 17] },
  'East Fourth Street': { y: 6, x: [3, 17] },
  'Houston Street': { y: 4, x: [-3, 17] },
  'East Houston Street': { y: 4, x: [3, 17] },
  'Rivington Street': { y: 3, x: [3, 17] },
  'Spring Street': { y: 2, x: [-3, 3] },
  'Kenmare Street': { y: 2, x: [-2, 3] },
  'Delancey Street': { y: 2, x: [3, 17] },
  'Broome Street': { y: 1, x: [-3, 17] },
  'Grand Street': { y: 0, x: [-3, 17] },
  'Hester Street': { y: -1, x: [-2, 10] },
  'Canal Street': { y: -2, x: [-3, 10] },
};

/** Catherine Street runs from Chatham Square down to the river: south of Mulberry Street's foot, and a little east. */
export const DIAGONAL: Readonly<Record<string, { x: number; y: number }[]>> = {
  'Catherine Street': [
    { x: 2, y: -4 },
    { x: 3, y: -5 },
    { x: 4, y: -6 },
  ],
};

export interface Spot {
  x: number;
  y: number;
  street: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A spot on a stretch, picked by the place's own hash. */
const along = (h: number, [a, b]: readonly [number, number]): number => a + (h % (b - a + 1));

/** Where a place sits: on the stretch its street runs, at a spot its own name picks. */
export function placeSpot(p: Pick<Place, 'street' | 'name' | 'world'> | undefined, id: string): Spot {
  const street = p?.street ?? '';
  // docs/48: a place of the neighbourhood sits in the same spot every night, whoever's rooms it holds.
  const h = hash(`${p?.world ?? p?.name ?? id}`);
  const ns = NS[street];
  if (ns) return { x: ns.x, y: along(h, ns.y), street };
  const ew = EW[street];
  if (ew) return { x: along(h, ew.x), y: ew.y, street };
  const diag = DIAGONAL[street];
  if (diag) return { ...(diag[h % diag.length] as { x: number; y: number }), street };
  // A street the map doesn't know: somewhere between Canal and Houston, east of the Bowery.
  return { x: (h % 14) + 3, y: ((h >> 4) % 7) - 2, street };
}

/* ------------------------------------------------------------------ *
 * Where two walks can cross (docs/65 §1).
 * ------------------------------------------------------------------ */

/** The ground a walk covers: the blocks between its two ends, and one either side. */
export interface Ground {
  x: [number, number];
  y: [number, number];
}

/** "Plausibly near": a block either side of the way between two places. */
const NEAR = 1;

export function groundOf(a: Spot, b: Spot): Ground {
  return { x: [Math.min(a.x, b.x) - NEAR, Math.max(a.x, b.x) + NEAR], y: [Math.min(a.y, b.y) - NEAR, Math.max(a.y, b.y) + NEAR] };
}

/** The ground two walks share, if they share any. */
export function sharedGround(p: Ground, q: Ground): Ground | undefined {
  const x: [number, number] = [Math.max(p.x[0], q.x[0]), Math.min(p.x[1], q.x[1])];
  const y: [number, number] = [Math.max(p.y[0], q.y[0]), Math.min(p.y[1], q.y[1])];
  return x[0] <= x[1] && y[0] <= y[1] ? { x, y } : undefined;
}

const overlaps = (a: readonly [number, number], b: readonly [number, number]) => a[0] <= b[1] && b[0] <= a[1];
const clamp = (v: number, [a, b]: readonly [number, number]) => Math.max(a, Math.min(b, v));

/**
 * How far a street, where it runs through the ground, comes to a spot (blocks); undefined when it
 * doesn't run through the ground at all, or the map doesn't know it.
 */
export function streetReach(street: string, g: Ground, to: { x: number; y: number }): number | undefined {
  const ns = NS[street];
  if (ns) {
    if (ns.x < g.x[0] || ns.x > g.x[1] || !overlaps(ns.y, g.y)) return undefined;
    const lo = Math.max(ns.y[0], g.y[0]);
    const hi = Math.min(ns.y[1], g.y[1]);
    return Math.abs(ns.x - to.x) + Math.abs(clamp(to.y, [lo, hi]) - to.y);
  }
  const ew = EW[street];
  if (ew) {
    if (ew.y < g.y[0] || ew.y > g.y[1] || !overlaps(ew.x, g.x)) return undefined;
    const lo = Math.max(ew.x[0], g.x[0]);
    const hi = Math.min(ew.x[1], g.x[1]);
    return Math.abs(ew.y - to.y) + Math.abs(clamp(to.x, [lo, hi]) - to.x);
  }
  const d = DIAGONAL[street];
  if (d) {
    const ds = d.filter((q) => q.x >= g.x[0] && q.x <= g.x[1] && q.y >= g.y[0] && q.y <= g.y[1]).map((q) => Math.abs(q.x - to.x) + Math.abs(q.y - to.y));
    return ds.length ? Math.min(...ds) : undefined;
  }
  return undefined;
}

/** Every street the map knows. */
export const STREETS: readonly string[] = [...Object.keys(NS), ...Object.keys(EW), ...Object.keys(DIAGONAL)];

/**
 * docs/65 §1: where a passer-by walking `walker` could have passed somebody going to or from `scene`
 * by one of `theirs`: the scene's own street when the two walks can cross on it, else the street
 * nearest the scene that runs through the ground they share (by name, on a tie). Undefined when the
 * two walks never come near each other.
 */
export function crossingStreet(walker: [Spot, Spot], scene: Spot, theirs: [Spot, Spot][]): string | undefined {
  const mine = groundOf(walker[0], walker[1]);
  const shared = theirs.map(([a, b]) => sharedGround(mine, groundOf(a, b))).filter((g): g is Ground => !!g);
  if (shared.length === 0) return undefined;
  const reach = (st: string) => {
    const ds = shared.map((g) => streetReach(st, g, scene)).filter((x): x is number => x !== undefined);
    return ds.length ? Math.min(...ds) : undefined;
  };
  if (reach(scene.street) !== undefined) return scene.street;
  let best: { st: string; d: number } | undefined;
  for (const st of [...STREETS].sort()) {
    const d = reach(st);
    if (d !== undefined && (best === undefined || d < best.d)) best = { st, d };
  }
  return best?.st;
}

/** The street a side remark puts its sighting on ("…I passed Thorndike on Broome Street, going fast…"). */
export function remarkStreet(text: string): string | undefined {
  return / I passed .+? on (.+?), /.exec(text)?.[1];
}

/** Every street the night's side remarks name: a name, like a place's street, though not always one. */
export function remarkStreets(c: { accounts: { remarks: { text: string }[] }[] }): string[] {
  return c.accounts.flatMap((a) => a.remarks.map((r) => remarkStreet(r.text))).filter((x): x is string => !!x);
}
