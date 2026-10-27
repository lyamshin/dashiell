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
 * a whole hour, and every place is within an hour of every other. The map
 * itself is the generator's (`src/gen/board/streets.ts`), which puts a side
 * remark's sighting where two walks on it cross (docs/65 §1).
 */

import { OFFICE, placeOf, type BoardCase, type PlaceId } from './model.js';
import { worldMinutes } from './world.js';
import { placeSpot } from '../../gen/board/streets.js';

/** Where a place sits: on the stretch its street runs, at a spot its own name picks (the map is `src/gen/board/streets.ts`). */
export function spot(c: BoardCase, id: PlaceId): { x: number; y: number; street: string } {
  if (id === OFFICE) return { x: 0, y: 0, street: 'Mulberry Street' };
  return placeSpot(placeOf(c, id), id);
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
  // (Round 8, B8: a bearing says the way that matters: Mulberry Street to 12 Ludlow, nine blocks east and
  // two up, is "east", not "uptown and east"; the lesser leg is said only where it’s a quarter of the other or more.)
  const ew = Math.abs(dx) >= 2 && Math.abs(dx) * 4 >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : '';
  const ns = Math.abs(dy) >= 2 && Math.abs(dy) * 4 >= Math.abs(dx) ? (dy > 0 ? 'uptown' : 'downtown') : '';
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
