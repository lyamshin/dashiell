/**
 * docs/44: the walk. Where the board's places sit on the Lower East Side, and
 * how far apart, so a page that changes place can say the street between in a
 * line or two, with the distance where it matters.
 *
 * The streets are real, and so is their order: Mulberry, Mott, Elizabeth, the
 * Bowery, Chrystie and on east to Pitt; Houston, Rivington, Delancey, Broome,
 * Grand, Hester and Canal from north to south. A place on an avenue or a
 * north–south street gets the other coordinate from its own name, so it sits
 * in the same spot all night. Distances are minutes on foot, rounded to five.
 * Nothing on the board depends on them: every hour is a whole hour, and every
 * place is within an hour of every other.
 */

import { OFFICE, placeOf, type BoardCase, type PlaceId } from './model.js';

/** East–west position of a north–south street, in short blocks east of Mulberry Street. */
const X: Record<string, number> = {
  'Park Row': -3,
  'Centre Street': -2,
  'Mulberry Street': 0,
  'Mott Street': 1,
  'Elizabeth Street': 2,
  'the Bowery': 3,
  'Chrystie Street': 4,
  'Second Avenue': 5,
  'Forsyth Street': 5,
  'Eldridge Street': 6,
  'First Avenue': 7,
  'Allen Street': 7,
  'Orchard Street': 8,
  'Ludlow Street': 9,
  'Essex Street': 10,
  'Norfolk Street': 11,
  'Suffolk Street': 12,
  'Clinton Street': 13,
  'Attorney Street': 14,
  'Avenue B': 14,
  'Ridge Street': 15,
  'Pitt Street': 16,
  'Cannon Street': 17,
};

/** North–south position of an east–west street, in blocks north of Grand Street. */
const Y: Record<string, number> = {
  'Stuyvesant Street': 8,
  'East Fourth Street': 6,
  'Houston Street': 4,
  'Rivington Street': 3,
  'Delancey Street': 2,
  'Spring Street': 2,
  'Broome Street': 1,
  'Grand Street': 0,
  'Hester Street': -1,
  'Canal Street': -2,
  'Catherine Street': -4,
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Where a place sits: a street's own coordinate, and the other from the place's name. */
export function spot(c: BoardCase, id: PlaceId): { x: number; y: number; street: string } {
  if (id === OFFICE) return { x: 0, y: 0, street: 'Mulberry Street' };
  const p = placeOf(c, id);
  const street = p?.street ?? '';
  const h = hash(`${p?.name ?? id}`);
  if (street in X) return { x: X[street] as number, y: (h % 7) - 2, street };
  if (street in Y) return { x: (h % 15) + 1, y: Y[street] as number, street };
  return { x: (h % 15) + 1, y: (h >> 4) % 7 - 2, street };
}

export interface Walk {
  minutes: number;
  /** "east", "uptown", "uptown and east", "round the corner". */
  dir: string;
  /** "ten minutes", "a quarter of an hour", "twenty-five minutes". */
  said: string;
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
  const minutes = Math.max(5, Math.min(40, Math.round(raw / 5) * 5));
  const ew = Math.abs(dx) >= 2 ? (dx > 0 ? 'east' : 'west') : '';
  const ns = Math.abs(dy) >= 2 ? (dy > 0 ? 'uptown' : 'downtown') : '';
  const dir = ns && ew ? `${ns} and ${ew}` : ns || ew || 'round the corner';
  const n = NUM[minutes / 5] ?? `${minutes}`;
  const said = minutes === 15 ? 'a quarter of an hour' : minutes === 30 ? 'half an hour' : `${n} minutes`;
  return { minutes, dir, said, from: name(c, from), to: name(c, to), street: b.street };
}

function name(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'the office';
  return placeOf(c, id)?.short ?? id;
}
