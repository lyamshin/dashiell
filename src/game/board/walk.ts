/**
 * docs/44: the walk. Where the board's places sit on the Lower East Side, and
 * how far apart, so a page that changes place can say the street between in a
 * line or two, with the distance where it matters.
 *
 * The streets are real, and so is their order: Mulberry, Mott, Elizabeth, the
 * Bowery, Chrystie and on east to Pitt and Cannon; Houston, Rivington, Delancey,
 * Broome, Grand, Hester and Canal from north to south; the avenues north of
 * Houston. Round 5, U11: and so is where each one runs. A place on a street
 * sits on the stretch that street really covers, at a spot its own name picks,
 * so it sits in the same spot all night: a flat on Second Avenue is north of
 * Houston Street, where Second Avenue starts, and the walk there from Mulberry
 * Street is uptown and east, never downtown (Medium 14). Distances are minutes
 * on foot, rounded to five. Nothing on the board depends on them: every hour is
 * a whole hour, and every place is within an hour of every other.
 */

import { OFFICE, placeOf, type BoardCase, type PlaceId } from './model.js';
import { worldMinutes } from './world.js';

/**
 * A north–south street: how far east of Mulberry Street it is (short blocks), and the stretch it
 * runs, in blocks north of Grand Street. The avenues start at Houston Street; below it the streets
 * carry on from them (Second Avenue from Chrystie, First from Allen, A from Essex, B from Clinton).
 */
const NS: Record<string, { x: number; y: [number, number] }> = {
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
const EW: Record<string, { y: number; x: [number, number] }> = {
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
const DIAGONAL: Record<string, { x: number; y: number }[]> = {
  'Catherine Street': [
    { x: 2, y: -4 },
    { x: 3, y: -5 },
    { x: 4, y: -6 },
  ],
};

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
export function spot(c: BoardCase, id: PlaceId): { x: number; y: number; street: string } {
  if (id === OFFICE) return { x: 0, y: 0, street: 'Mulberry Street' };
  const p = placeOf(c, id);
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

export interface Walk {
  minutes: number;
  /** "east", "uptown", "uptown and east", "round the corner". */
  dir: string;
  /** "ten minutes", "a quarter of an hour", "twenty-five minutes". */
  said: string;
  /**
   * docs/47 A1: the distance without a minute count, since the clock moves a call's worth whatever
   * the walk: "a couple of blocks", "a few blocks", "a good walk", "a long walk"; "round the corner" when near.
   */
  far: string;
  near: boolean;
  from: string;
  to: string;
  street: string;
}

const NUM = ['', 'five', 'ten', 'fifteen', 'twenty', 'twenty-five', 'half an hour', 'thirty-five', 'forty'];

/** The walk from one place to another, as the detective would put it. */
export function walkBetween(c: BoardCase, from: PlaceId, to: PlaceId): Walk {
  const a = spot(c, from);
  const b = spot(c, to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // A short block east–west is about a minute and a half; north–south nearer two.
  const raw = Math.abs(dx) * 1.5 + Math.abs(dy) * 2;
  // docs/48 §1: between two places of the neighbourhood, the bible's own minutes.
  const own = worldMinutes(c, from, to);
  const minutes = Math.max(5, Math.min(40, Math.round((own ?? raw) / 5) * 5));
  const ew = Math.abs(dx) >= 2 ? (dx > 0 ? 'east' : 'west') : '';
  const ns = Math.abs(dy) >= 2 ? (dy > 0 ? 'uptown' : 'downtown') : '';
  const dir = ns && ew ? `${ns} and ${ew}` : ns || ew || 'round the corner';
  const n = NUM[minutes / 5] ?? `${minutes}`;
  const said = minutes === 15 ? 'a quarter of an hour' : minutes === 30 ? 'half an hour' : `${n} minutes`;
  const near = dir === 'round the corner' || minutes <= 5;
  const far = near ? 'round the corner' : minutes <= 10 ? 'a couple of blocks' : minutes <= 15 ? 'a few blocks' : minutes <= 20 ? 'several blocks' : minutes <= 30 ? 'a good walk' : 'a long walk';
  return { minutes, dir, said, far, near, from: name(c, from), to: name(c, to), street: b.street };
}

function name(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'the office';
  return placeOf(c, id)?.short ?? id;
}
