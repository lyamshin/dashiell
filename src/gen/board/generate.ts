import { Rng } from '../rng.js';
import { NAME_POOLS } from '../data/names.js';
import * as K from './content.js';
import type {
  Account,
  BoardCase,
  CaseType,
  Claim,
  Confrontation,
  Fact,
  Find,
  Hour,
  Lie,
  ListEntry,
  Person,
  PersonId,
  Place,
  PlaceId,
  Remark,
  TierIndex,
  WatchList,
} from './types.js';
import { CASE_TYPES } from './types.js';
import { fmtHour } from './solver.js';

/**
 * docs/42 §1: the truth simulation at board scale, and the lies by the tier
 * ladder. It builds one candidate case from a seed; `index.ts` accepts or
 * rejects it with the solver.
 *
 * Roles (never shown): C the culprit; L the innocent liar (Poached up); R a
 * rival with access; N an outsider without it; I an innocent at Raw, where
 * nobody is taught access.
 *
 * Decided 2026-09-28 (docs/41, docs/42 "Decisions applied"):
 * - some innocent liars refuse, and a watcher's list clears them instead;
 *   the rest admit, and name someone who was with them, whose account is the
 *   check. Either way nothing else places them at the lied hour;
 * - Raw has two watchers, each clearing one rival;
 * - evenings vary: bars, clubs, restaurants, picture houses, work in working
 *   hours, and homes; nobody gives the same reason for a move twice.
 */

type Tag = 'C' | 'L' | 'R' | 'N' | 'I';

const ROLES: Record<TierIndex, Tag[]> = {
  0: ['C', 'I', 'I'],
  1: ['C', 'R', 'N'],
  2: ['C', 'L', 'R', 'N'],
  3: ['C', 'L', 'R', 'N'],
  4: ['C', 'L', 'R', 'N'],
  5: ['C', 'L', 'R', 'R', 'N'],
};

/**
 * The share of innocent liars who refuse when put to it (decided 2026-09-28), tuned by the sweep:
 * the refusal shortcut must never beat par, and admissions must still happen.
 * - Poached: small cases only. A refusal there leaves the confrontation one job, the culprit's
 *   crack (where it is now), so the barman doesn't see the handover. In a Poached murder a refusal
 *   would leave the confrontation nothing to do, and the case would rate Coddled.
 * - Hard-boiled: always. With one route per rival, an admission's check costs a question the
 *   shortcut skips, so an admitting liar lets the shortcut beat par by one. (The pair's liar
 *   covers for the culprit and refuses too.)
 */
export const REFUSE_SHARE: Record<TierIndex, number> = { 0: 0, 1: 0, 2: 0.4, 3: 0.5, 4: 0.5, 5: 1 };

/** Which types each tier can build. A lost item has no honest last sighting to narrow a window. */
export function typesFor(tier: TierIndex): CaseType[] {
  return tier >= 3 ? ['murder', 'lost-pet'] : [...CASE_TYPES];
}

function mix(...xs: number[]): number {
  let h = 0x811c9dc5;
  for (const x of xs) {
    h ^= x & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= x >>> 16;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

interface Named {
  given: string;
  family: string;
  female: boolean;
}

function drawNames(rng: Rng, n: number, avoid: string, maleAt = -1): Named[] {
  const out: Named[] = [];
  const used = new Set<string>();
  while (out.length < n) {
    const pool = rng.pick(NAME_POOLS);
    const family = rng.pick(pool.family);
    if (used.has(family) || avoid.includes(family)) continue;
    used.add(family);
    const female = out.length === maleAt ? false : rng.chance(0.5);
    out.push({ given: rng.pick(female ? pool.given.female : pool.given.male), family, female });
  }
  return out;
}

const pron = (n: Named) =>
  n.female ? { they: 'she', them: 'her', their: 'her' } : { they: 'he', them: 'him', their: 'his' };

function fill(text: string, n: Named): string {
  const p = pron(n);
  return text.replace(/\{they\}/g, p.they).replace(/\{them\}/g, p.them).replace(/\{their\}/g, p.their);
}

const idOfName = (n: Named) => n.family.toLowerCase().replace(/[^a-z]/g, '');

/** Why the last `buildCase` gave up, for the reading tool and the sweep. */
export let lastVeto = '';
function veto(why: string): null {
  lastVeto = why;
  return null;
}

export function buildCase(seed: number, tier: TierIndex, type: CaseType, attempt: number): BoardCase | null {
  const rng = new Rng(mix(seed, tier, CASE_TYPES.indexOf(type), attempt));
  const murder = type === 'murder';
  const windowed = tier >= 3;
  const fourHours = tier >= 2;
  const hours: Hour[] = murder ? (fourHours ? [7, 8, 9, 10] : [8, 9, 10]) : fourHours ? [8, 9, 10, 11] : [8, 9, 10];
  const h0 = hours[0] as Hour;
  const hL = hours[hours.length - 1] as Hour;

  const variant: 'pair' | 'face' | undefined = tier === 5 ? rng.pick(['pair', 'face'] as const) : undefined;
  // An innocent liar with a secret (Poached up, not the Hard-boiled pair).
  const secretLiar = tier >= 2 && variant !== 'pair';

  // The crime hour, the window the office gives, and the hours the means sat at its origin. In a
  // murder with an innocent liar the means sits there two hours or more, so the culprit and the
  // liar can each have had it without ever being in one place at one hour.
  let hc: Hour;
  if (murder) hc = rng.pick(hours.filter((h) => h >= h0 + (windowed ? 2 : 1) + (secretLiar ? 1 : 0)));
  // A small case: the party is at the first hour, and the thief leaves and comes back.
  else hc = rng.pick(hours.filter((h) => h >= h0 + 2));
  const window = windowed ? [hc - 1, hc] : [hc];
  const avail = murder ? hours.filter((h) => h < (windowed ? hc - 1 : hc)) : [h0];
  if (avail.length === 0) return veto('no hours for the means');

  // --- Places ---------------------------------------------------------------------------------
  const tags = rng.shuffle(ROLES[tier]);
  const venue = rng.pick(K.VENUES);
  const rooming = rng.pick(K.ROOMING);
  const u = rng.pick(K.UNWATCHED.filter((x) => x.short !== venue.short));
  // The origin in working hours: a surgery, a pharmacy or a pawnshop that shuts before the crime.
  const work = murder && (tier === 1 || tier === 4) && rng.chance(0.5) ? rng.pick(K.WORKPLACES) : undefined;
  // Small cases at Raw and Coddled: the second watched place can be a night shift or another venue.
  const secondPool = [...K.NIGHT_SHIFTS, ...K.VENUES.filter((v) => v.kind === 'restaurant' || v.kind === 'theatre')].filter((v) => v.kind !== venue.kind);
  const second = !murder && tier <= 1 && rng.chance(0.6) ? rng.pick(secondPool) : undefined;
  const hasL = tags.includes('L');
  const refuses = hasL && variant !== 'pair' && !(tier === 2 && murder) && rng.chance(REFUSE_SHARE[tier]);
  const admits = hasL && variant !== 'pair' && !refuses;
  const names = drawNames(rng, tags.length + 9, `${venue.name} ${rooming.name} ${u.name} ${second?.name ?? ''} ${work?.name ?? ''}`, murder ? tags.length : -1);
  const nm = (i: number) => names[i] as Named;
  const n0 = tags.length;
  const suspectNames = tags.map((_, i) => nm(i));
  const victimName = nm(n0);
  const clientName = nm(n0 + 1);
  const barkeepName = nm(n0 + 2);
  const xWatcherName = nm(n0 + 3);
  const companyName = nm(n0 + 4);
  const keeperName = nm(n0 + 5);
  const company2Name = nm(n0 + 6);
  const uKeeperName = nm(n0 + 7);
  const yName = nm(n0 + 8);

  const ids = suspectNames.map(idOfName);
  const idOf = (t: Tag, k = 0): PersonId => {
    let seen = 0;
    for (let i = 0; i < tags.length; i++) if (tags[i] === t && seen++ === k) return ids[i] as PersonId;
    throw new Error(`no ${t}`);
  };
  const nameOf = (p: PersonId): Named | undefined => {
    const i = ids.indexOf(p);
    if (i >= 0) return nm(i);
    return undefined;
  };
  const C = idOf('C');
  const cName = nm(tags.indexOf('C'));
  const worker = work ? rng.pick(ids.filter((_, i) => tags[i] !== 'N')) : undefined;

  const places: Place[] = [];
  const all: [Hour, Hour] = [h0, hL];
  const S = 'scene';
  const B = 'bar';
  const X = murder ? 'rooming' : 'neighbours';
  const U = 'u';
  const H = 'h';
  const YH = 'yhome';
  const petOrItem = type === 'lost-pet' ? rng.pick(K.PETS) : rng.pick(K.ITEMS);
  if (murder) {
    const sc = rng.pick(K.SCENE_HOMES);
    places.push({ id: S, name: `${victimName.family}’s ${sc.tail}`, short: `${victimName.family}’s place`, kind: 'home', open: all, scene: true, street: sc.street });
  } else {
    const sc = rng.pick(K.LOST_SCENES);
    places.push({ id: S, name: `the ${clientName.family} ${sc.tail}`, short: `the ${clientName.family} flat`, kind: 'home', open: all, scene: true, street: sc.street });
  }
  places.push({ id: B, name: venue.name, short: venue.short, kind: venue.kind, open: all, street: venue.street });
  if (work && worker) {
    const owner = (nameOf(worker) as Named).family;
    places.push({ id: X, name: work.name.replace('{owner}', owner), short: work.short.replace('{owner}', owner), kind: 'work', open: [h0, Math.max(...avail)], street: work.street });
  } else if (second) {
    places.push({ id: X, name: second.name, short: second.short, kind: second.kind, open: all, street: second.street });
  } else {
    places.push({ id: X, name: rooming.name, short: rooming.short, kind: 'home', open: all, street: rooming.street });
  }
  if (tier >= 1) places.push({ id: U, name: u.name, short: u.short, kind: u.kind, open: all, street: u.street });
  if (tier >= 4) {
    const street = rng.pick(['Cannon Street', 'Pitt Street', 'Norfolk Street', 'Suffolk Street']);
    places.push({ id: H, name: `${cName.family}’s flat on ${street}`, short: `${cName.family}’s flat`, kind: 'home', open: all, street });
  }
  if (admits) places.push({ id: YH, name: `${yName.family}’s rooms on Broome Street`, short: `${yName.family}’s rooms`, kind: 'home', open: all, street: 'Broome Street', offBoard: true });
  const placeById = new Map(places.map((p) => [p.id, p]));
  const open = (p: PlaceId, h: Hour) => {
    const pl = placeById.get(p);
    return !!pl && h >= pl.open[0] && h <= pl.open[1];
  };
  const kindOf = (p: PlaceId) => placeById.get(p)?.kind;
  // Nobody drops in on a night shift or a surgery they don't work at, except as a patient.
  const visitX = kindOf(X) !== 'work';
  // Who can say who was at X: the origin's landlady or desk (murder), or at Raw–Poached a second watcher.
  const xWatched = murder || tier <= 2;

  // --- Rows -----------------------------------------------------------------------------------
  const V = murder ? idOfName(victimName) : type === 'lost-pet' ? 'pet' : 'item';
  const W = idOfName(companyName);
  const W2 = idOfName(company2Name);
  const KP = idOfName(keeperName);
  const Y = idOfName(yName);
  const rows: Record<PersonId, Record<Hour, PlaceId>> = {};
  const reasons: Record<PersonId, Record<Hour, string>> = {};

  // Fill an evening from its anchors: stay put where you can, start from base, never linger at the scene.
  const evening = (anchors: Map<Hour, PlaceId>, base: PlaceId, fallback: PlaceId): Record<Hour, PlaceId> => {
    const out: Record<Hour, PlaceId> = {};
    for (const h of hours) if (anchors.has(h)) out[h] = anchors.get(h) as PlaceId;
    for (let i = 0; i < hours.length; i++) {
      const h = hours[i] as Hour;
      if (out[h] !== undefined) continue;
      const prev = i > 0 ? out[hours[i - 1] as Hour] : undefined;
      if (prev === undefined || prev === S) {
        const next = hours.slice(i).map((x) => anchors.get(x)).find((x) => x !== undefined && x !== S);
        out[h] = prev === undefined ? (open(base, h) ? base : (next ?? fallback)) : open(base, h) ? base : fallback;
      } else out[h] = open(prev, h) ? prev : open(base, h) ? base : fallback;
    }
    return out;
  };

  const lodges = new Set<PersonId>();
  const guests = new Set<PersonId>();
  const residentAtScene: PersonId[] = [];
  const pick = <T>(xs: T[]) => rng.pick(xs);

  // The culprit.
  {
    const a = new Map<Hour, PlaceId>();
    let base: PlaceId = B;
    if (murder) {
      if (worker === C) for (const h of avail) a.set(h, X);
      else a.set(pick(avail), X);
      if (!work && !secretLiar && rng.chance(0.5) && tier < 4) {
        lodges.add(C);
        base = X;
      }
      if (tier >= 4) base = H;
    } else if (rng.chance(0.4)) {
      residentAtScene.push(C);
      base = B;
    } else {
      a.set(h0, S);
      guests.add(C);
      base = tier >= 4 ? H : pick(visitX ? [B, X] : [B]);
    }
    a.set(hc, S);
    if (hc < hL) a.set(hc + 1, murder && tier >= 4 ? H : B);
    // Between the origin and the crime, somewhere they can be seen.
    for (const h of hours) {
      if (h <= h0 || h >= hc || a.has(h)) continue;
      const opts = (murder ? (tier >= 4 ? [X, B, H] : [X, B]) : tier >= 4 ? [H] : visitX ? [B, X] : [B]).filter((p) => open(p, h));
      a.set(h, pick(opts.length ? opts : [B]));
    }
    rows[C] = evening(a, base, B);
  }

  // The victim, or the lost thing.
  {
    const a = new Map<Hour, PlaceId>();
    if (murder) {
      a.set(hc, S);
      if (windowed || rng.chance(0.5)) a.set(hc - 1, B);
      for (const h of hours) if (h > hc) a.set(h, S);
      rows[V] = evening(a, pick([S, B]), S);
      // The dead don't leave; before the crime the victim may be anywhere sensible.
      for (const h of hours) if (h < hc - 1 && !a.has(h)) (rows[V] as Record<Hour, PlaceId>)[h] = pick([S, B]);
    } else {
      const r: Record<Hour, PlaceId> = {};
      for (const h of hours) r[h] = h <= hc ? S : B;
      if (windowed) r[hc - 1] = X;
      rows[V] = r;
    }
  }

  // Hard-boiled spreads the innocents so each falls one way, by a different source:
  // face — the face alone at the bar, one rival on the origin's list (or with the neighbour);
  // pair — one rival with a company witness at the unwatched place, one on the origin's list.
  const hbAt = (t: Tag, k: number): PlaceId | undefined => {
    if (tier !== 5) return undefined;
    if (t === 'R' && k === 0) return variant === 'face' ? B : murder ? U : X;
    if (t === 'R' && k === 1) return variant === 'pair' && !murder ? U : X;
    if (t === 'N') return X;
    return undefined;
  };
  const seenTag = new Map<Tag, number>();
  const others = tags
    .map((t, i) => ({ t, id: ids[i] as PersonId }))
    .filter((x) => x.t !== 'C')
    .map((x) => {
      const k = seenTag.get(x.t) ?? 0;
      seenTag.set(x.t, k + 1);
      return { ...x, k };
    });
  // Where the Coddled rival is at the crime hour: X if it's open then, so the culprit's lie and the
  // rival's alibi sit on different lists.
  const rAtHc = tier === 1 && open(X, hc) ? X : B;
  for (const { t, id, k } of others) {
    const a = new Map<Hour, PlaceId>();
    let base: PlaceId = B;
    if (!murder && t !== 'N') {
      a.set(h0, S);
      guests.add(id);
    }
    if (worker === id) for (const h of avail) a.set(h, X);
    if (t === 'I') {
      // Raw: two watchers, each clearing one rival (decided 2026-09-28).
      const where = k === 0 ? B : X;
      a.set(hc, where);
      if (where === X) {
        base = X;
        if (kindOf(X) === 'home') lodges.add(id);
      } else base = pick(visitX ? [B, X] : [B]);
    } else if (t === 'R') {
      if (murder) {
        if (worker !== id) a.set(pick(avail), X);
        if (!work && rng.chance(0.6)) {
          lodges.add(id);
          base = X;
        }
      } else base = pick(visitX ? [B, X] : [B]);
      const where = hbAt(t, k) ?? (tier === 1 ? rAtHc : B);
      a.set(hc, where);
      if (tier === 1 && where === X && !murder) base = X;
    } else if (t === 'N') {
      base = murder ? pick([U, B]) : pick([U, ...(visitX ? [X] : []), B]);
      if (tier === 1) {
        a.set(hc, U);
        base = U;
      } else if (tier === 4) {
        // The side remark's speaker: walked over to the venue at the crime hour.
        a.set(hc - 1, open(X, hc - 1) ? X : U);
        a.set(hc, B);
      } else a.set(hc, hbAt(t, k) ?? B);
    } else if (t === 'L') {
      if (murder && worker !== id) {
        // At the origin while the means was there, but never when the culprit was.
        const free = avail.filter((h) => !secretLiar || rows[C]?.[h] !== X);
        if (free.length === 0) return veto('the liar can’t reach the origin apart from the culprit');
        a.set(pick(free), X);
      }
      if (variant === 'pair') {
        if (murder && !work && rng.chance(0.5)) {
          lodges.add(id);
          base = X;
        }
        a.set(hc, B);
      } else {
        if (!murder) base = pick(visitX ? [B, X] : [B]);
        a.set(hc, U);
        if (windowed) a.set(hc - 1, U);
      }
    }
    rows[id] = evening(a, base, B);
    // Decided 2026-09-28: the culprit and the innocent liar are never in one place at one hour
    // (the office's party aside), so their stories never claim one.
    if (t === 'L' && secretLiar) {
      const row = rows[id] as Record<Hour, PlaceId>;
      const cRow = rows[C] as Record<Hour, PlaceId>;
      hours.forEach((h, i) => {
        if (a.has(h) || row[h] !== cRow[h] || (!murder && h === h0)) return;
        const prev = i > 0 ? row[hours[i - 1] as Hour] : undefined;
        const alts = [prev, B, ...(visitX ? [X] : []), U].filter((p): p is PlaceId => !!p && p !== cRow[h] && p !== S && placeById.has(p) && open(p, h));
        if (alts.length > 0) row[h] = alts[0] as PlaceId;
      });
    }
  }

  // Company-only witnesses:
  // - Raw: a regular at the venue and one at X, each the second route for one rival;
  // - Coddled: a regular with the rival at the crime hour;
  // - Hard-boiled pair: the keeper of the unwatched place;
  // - small cases from Soft-boiled: a neighbour who kept the pet for an hour;
  // - an admitting innocent liar: whoever was with them, at home before and after.
  const company: PersonId[] = [];
  const staticAt = new Map<PersonId, PlaceId>();
  const stay = (p: PersonId, pl: PlaceId) => {
    company.push(p);
    staticAt.set(p, pl);
    rows[p] = Object.fromEntries(hours.map((h) => [h, pl]));
  };
  if (tier === 0) {
    stay(W, B);
    stay(W2, X);
  }
  if (tier === 1) stay(W, rAtHc);
  if (variant === 'pair') stay(W, U);
  if (!murder && windowed) stay(KP, X);
  if (admits) {
    company.push(Y);
    rows[Y] = Object.fromEntries(hours.map((h) => [h, h === hc ? U : YH]));
  }

  // --- Checks on the truth before anything is said about it --------------------------------------
  const suspects = ids;
  const boardPeople = [...suspects, ...(murder ? [V] : []), ...company];
  const at = (p: PersonId, h: Hour) => rows[p]?.[h];
  const withAt = (place: PlaceId, h: Hour, except: PersonId) => boardPeople.filter((x) => x !== except && at(x, h) === place);
  for (const p of [...suspects, ...company]) {
    for (const h of hours) {
      const pl = at(p, h) as PlaceId;
      if (!open(pl, h)) return veto(`somebody at ${pl}, closed`);
      if (pl === S && p !== C && !(guests.has(p) && h === h0)) return veto('an innocent lingers at the scene');
    }
    if (suspects.includes(p) && p !== C && moves(rows[p] as Record<Hour, PlaceId>, hours) > 2) return veto('an innocent moves too often');
  }
  if (moves(rows[C] as Record<Hour, PlaceId>, hours) > 3) return veto('the culprit moves too often');
  // Rule 1: the board's places are the places people were. None sits empty all night.
  for (const pl of places) if (!boardPeople.some((p) => hours.some((h) => at(p, h) === pl.id))) return veto('a place sits empty');
  if (withAt(S, hc, C).some((x) => x !== V)) return veto('company at the scene at the crime');
  const N = tags.includes('N') ? idOf('N') : undefined;
  const L = hasL ? idOf('L') : undefined;
  if (N && murder && avail.some((h) => at(N, h) === X)) return veto('the outsider had access');
  if (N && !murder && guests.has(N)) return veto('the outsider was a guest');
  if (tier === 1 && N && withAt(U, hc, N).length > 0) return veto('the outsider had company');
  // Decided 2026-09-28: nothing but the resolution places the innocent liar at the lied hour.
  if (L && variant !== 'pair' && withAt(U, hc, L).some((x) => x !== Y)) return veto('somebody else at the secret place');
  if (tier >= 4 && withAt(H, hc, C).length > 0) return veto('somebody at the culprit’s flat');
  // Rule 12: at least one innocent at the origin before the crime.
  if (murder && tier >= 1 && !suspects.some((p) => p !== C && avail.some((h) => at(p, h) === X))) return veto('no innocent at the origin');
  // Hard-boiled face: somebody innocent at the bar at the crime hour to be the face.
  const faceOf = variant === 'face' ? suspects.find((p) => p !== C && at(p, hc) === B) : undefined;
  if (variant === 'face' && (!faceOf || withAt(B, hc, faceOf).length > 0)) return veto('no face');

  // --- People (needed for pronouns in the reasons) ------------------------------------------------
  const people: Person[] = [];
  const motives = rng.shuffle(murder ? K.MOTIVES : K.SMALL_MOTIVES);
  const jobs = rng.shuffle(K.JOBS);
  const looks = rng.shuffle(K.LOOKS);
  const namedOf = new Map<PersonId, Named>();
  tags.forEach((t, i) => {
    const id = ids[i] as PersonId;
    const n = nm(i);
    namedOf.set(id, n);
    const streets = ['Pitt Street', 'Cannon Street', 'Attorney Street', 'Ridge Street', 'Clinton Street', 'Essex Street'];
    const home = lodges.has(id)
      ? `lodges at ${(placeById.get(X) as Place).short}`
      : residentAtScene.includes(id)
        ? `lodges with ${clientName.given} ${clientName.family}`
        : id === C && tier >= 4
          ? `lives at ${(placeById.get(H) as Place).short}`
          : `lives on ${streets[i % streets.length]}`;
    const job = id === worker && work ? work.workerJob : second?.workerJob && at(id, hc) === X ? second.workerJob : (jobs[i] as string);
    const last = at(id, hL) as PlaceId;
    people.push({
      id,
      name: `${n.given} ${n.family}`,
      short: n.family,
      role: 'suspect',
      description: [job, home].filter(Boolean).join('; '),
      look: looks[i] as string,
      foundAt: last === S ? (tier >= 4 && murder ? H : B) : last,
      motive: fill(motives[i % motives.length] as string, n).replace('{victim}', victimName.family),
      ...(t === 'L' ? { secret: fill(variant === 'pair' ? `covering for ${cName.family}, who is owed a favour` : u.secret, n) } : {}),
    });
  });
  if (murder) {
    people.push({ id: V, name: `${victimName.given} ${victimName.family}`, short: victimName.family, role: 'victim', description: rng.pick(K.VICTIM_JOBS), foundAt: S });
  } else {
    people.push({ id: V, name: petOrItem.name, short: petOrItem.short, role: 'victim', description: petOrItem.where, foundAt: S, object: true });
  }
  const client = 'client';
  people.push({
    id: client,
    name: `${clientName.female ? 'Mrs.' : 'Mr.'} ${clientName.given} ${clientName.family}`,
    short: clientName.family,
    role: 'client',
    description: murder ? `${victimName.family}’s ${clientName.female ? 'sister-in-law' : 'brother-in-law'}` : type === 'lost-pet' ? 'the owner' : 'the owner, a widow',
    foundAt: S,
  });
  const barkeep = 'barkeep';
  people.push({ id: barkeep, name: `${barkeepName.given} ${barkeepName.family}`, short: barkeepName.family, role: 'watcher', description: `${venue.job} at ${venue.short}`, foundAt: B });
  const xw = 'xwatcher';
  const xPlace = placeById.get(X) as Place;
  const xJob = work ? work.job : second ? second.job : 'the landlady, on a chair at the foot of her stairs';
  if (xWatched) {
    const landlady = !work && !second;
    people.push({
      id: xw,
      name: landlady ? `Mrs. ${rooming.landlady ?? xWatcherName.family}` : `${xWatcherName.given} ${xWatcherName.family}`,
      short: landlady ? `Mrs. ${rooming.landlady ?? xWatcherName.family}` : xWatcherName.family,
      role: 'watcher',
      description: `${xJob} at ${xPlace.short}`,
      foundAt: X,
    });
  }
  const uk = 'ukeeper';
  if (refuses) people.push({ id: uk, name: `${uKeeperName.given} ${uKeeperName.family}`, short: uKeeperName.family, role: 'watcher', description: `${u.keeper}, at ${u.short}`, foundAt: U });
  if (company.includes(W)) {
    const pl = staticAt.get(W) as PlaceId;
    people.push({ id: W, name: `${companyName.given} ${companyName.family}`, short: companyName.family, role: 'company', description: companyDesc(pl, true), foundAt: pl });
  }
  if (company.includes(W2)) people.push({ id: W2, name: `${company2Name.given} ${company2Name.family}`, short: company2Name.family, role: 'company', description: companyDesc(X, false), foundAt: X });
  if (company.includes(KP)) people.push({ id: KP, name: `Mrs. ${keeperName.family}`, short: `Mrs. ${keeperName.family}`, role: 'company', description: `a neighbour at ${xPlace.short}`, foundAt: X });
  if (company.includes(Y) && L) {
    people.push({ id: Y, name: `${yName.given} ${yName.family}`, short: yName.family, role: 'company', description: `was with ${(namedOf.get(L) as Named).family} at ${u.short}; nobody else knows it`, foundAt: YH });
  }
  function companyDesc(pl: PlaceId, first: boolean): string {
    if (pl === U) return `keeps ${u.short}`;
    const p = placeById.get(pl) as Place;
    if (p.kind === 'home') return `a lodger at ${p.short}, who sat up in the parlour`;
    if (p.kind === 'work') return `works the next bench at ${p.short}`;
    if (p.kind === 'theatre') return `a regular at ${p.short}, who sits through every show twice`;
    return first ? `a regular at ${p.short}` : `a regular at ${p.short}, at the same table every night`;
  }
  const pnamed = (p: PersonId): Named => namedOf.get(p) ?? (p === W ? companyName : p === W2 ? company2Name : p === KP ? keeperName : p === Y ? yName : victimName);

  // --- Reasons for moves (rule 3; decided 2026-09-28: no two people give the same one) --------------
  const drawn = new Set<string>();
  const draw = (pool: string | string[], p: PersonId, vars: Record<string, string>): string | null => {
    const left = (typeof pool === 'string' ? (K.REASONS[pool] ?? []) : pool).filter((x) => !drawn.has(x));
    if (left.length === 0) return null;
    const t = rng.pick(left);
    drawn.add(t);
    let out = fill(t, pnamed(p));
    for (const [k, v] of Object.entries(vars)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    return out;
  };
  let uHonestUsed = false;
  let ranDry = false;
  function reasonFor(p: PersonId, from: PlaceId, to: PlaceId, h: Hour): string {
    const pl = placeById.get(to) as Place;
    if (p === V && murder) return to === S ? 'went home: he had company coming' : `his usual at ${pl.short}`;
    // The culprit's own moves to and from the scene are never said; they're here for the designer.
    if (to === S) return p === C ? `went round to ${murder ? victimName.family + '’s' : 'the flat'}` : 'the party';
    if (from === S && p === C) return `on to ${pl.short}`;
    const vars = { p: pl.short, h: fmtHour(h) };
    let dest: string | null;
    if (p === Y && to === U && L) dest = `went to ${pl.short} to meet ${(namedOf.get(L) as Named).family}`;
    else if (to === U && !uHonestUsed) {
      uHonestUsed = true;
      dest = fill(u.honest, pnamed(p));
    } else if (to === YH || (to === H && p === C) || (to === X && lodges.has(p))) dest = draw('home', p, vars);
    else if (pl.kind === 'home') dest = draw('visit', p, vars);
    else if (pl.kind === 'work') dest = to === X && work && p !== worker ? draw(work.visit, p, vars) : draw('work', p, vars);
    else dest = draw(pl.kind, p, vars);
    if (dest === null) {
      ranDry = true;
      return `went to ${pl.short}`;
    }
    const lead = from === S ? draw('party', p, vars) : kindOf(from) === 'work' && (p === worker || staticAt.has(p) || at(p, hc) === from) ? draw('closed', p, vars) : null;
    return lead ? `${lead} and ${dest}` : dest;
  }
  for (const p of [...suspects, ...company, ...(murder ? [V] : [])]) {
    reasons[p] = {};
    for (let i = 1; i < hours.length; i++) {
      const h = hours[i] as Hour;
      const prev = at(p, hours[i - 1] as Hour) as PlaceId;
      const cur = at(p, h) as PlaceId;
      if (prev === cur) continue;
      (reasons[p] as Record<Hour, string>)[h] = reasonFor(p, prev, cur, h);
    }
  }

  // --- Lies (decided 2026-09-28: the culprit and the innocent liar never claim the same place) --------
  const lies: Lie[] = [];
  const claimOverride = new Map<string, Claim>();
  // A claim collides only where somebody can say who was there: a list, or a company witness there all night.
  const listed = new Set<PlaceId>([B, ...(xWatched ? [X] : []), ...(refuses ? [U] : [])]);
  const checkable = (pl: PlaceId, h: Hour) => open(pl, h) && kindOf(pl) !== 'work' && (listed.has(pl) || [...staticAt.values()].includes(pl));
  let cClaim: PlaceId;
  if (variant === 'pair' || tier === 4) cClaim = H;
  else {
    let cands = [B, X].filter((pl) => checkable(pl, hc));
    if (tier === 1 && cands.some((pl) => pl !== rAtHc)) cands = cands.filter((pl) => pl !== rAtHc);
    if (cands.length === 0) return veto('nowhere checkable for the culprit to claim');
    cClaim = pick(cands);
  }
  lies.push({ person: C, hour: hc, kind: variant === 'pair' ? 'pair' : 'culprit', truth: S, claim: cClaim });
  claimOverride.set(`${C}@${hc}`, {
    place: cClaim,
    company: variant === 'pair' && L ? [L] : [],
    ...(variant === 'pair' ? { reason: 'had a game of gin at home' } : {}),
  });
  if (L && tier >= 2) {
    if (variant === 'pair') {
      lies.push({ person: L, hour: hc, kind: 'pair', truth: at(L, hc) as PlaceId, claim: H });
      claimOverride.set(`${L}@${hc}`, { place: H, company: [C], reason: `went round to ${cName.family}’s for a game of gin` });
    } else {
      // The cover story is somewhere watched, so it collides; never where the culprit claims.
      const cands = [B, X].filter((pl) => pl !== cClaim && checkable(pl, hc));
      if (cands.length === 0) return veto('nowhere checkable for the liar’s cover');
      const cover = pick(cands);
      lies.push({ person: L, hour: hc, kind: 'secret', truth: U, claim: cover });
      claimOverride.set(`${L}@${hc}`, { place: cover, company: [] });
    }
  }

  // --- Accounts -----------------------------------------------------------------------------------
  // Reasons follow the story as told: a move the person claims gets a reason, and a lie's move a
  // fresh one.
  const accounts: Account[] = [];
  for (const p of [...suspects, ...company]) {
    const claims: Record<Hour, Claim> = {};
    let prevPlace: PlaceId | undefined;
    let prevTrue = true;
    for (const h of hours) {
      const ov = claimOverride.get(`${p}@${h}`);
      const place = ov?.place ?? (at(p, h) as PlaceId);
      const comp = ov ? ov.company : withAt(place, h, p);
      let reason: string | undefined = ov?.reason;
      if (reason === undefined && prevPlace !== undefined && place !== prevPlace) {
        reason = !ov && prevTrue ? reasons[p]?.[h] : reasonFor(p, prevPlace, place, h);
      }
      claims[h] = { place, company: comp, ...(reason ? { reason } : {}) };
      prevPlace = place;
      prevTrue = !ov;
    }
    accounts.push({ person: p, claims, remarks: [] });
  }
  if (ranDry) return veto('ran out of reasons');
  // The culprit and the innocent liar never claim the same place at the same hour (the office's
  // party, which everybody there shares, aside).
  if (L && variant !== 'pair') {
    const ca = accounts.find((a) => a.person === C) as Account;
    const la = accounts.find((a) => a.person === L) as Account;
    for (const h of hours) {
      if (!murder && h === h0 && guests.has(C) && guests.has(L)) continue;
      if (ca.claims[h]?.place === la.claims[h]?.place) return veto(`the culprit and the liar both claim one place at ${h}`);
    }
  }
  const accountOf = (p: PersonId) => accounts.find((a) => a.person === p) as Account;
  // Medium: the side remark. The outsider walked over at the crime hour and passed the culprit.
  if (tier === 4 && N) {
    const sceneStreet = (placeById.get(S) as Place).street;
    accountOf(N).remarks.push({
      text: `Walking over to ${venue.short} at ${fmtHour(hc)} I passed ${cName.family} on ${sceneStreet}, going fast, no hat.`,
      facts: [{ k: 'notAt', p: C, h: hc, place: H }],
      side: true,
    });
  }
  // The pet's keeper: the last sighting away from the scene.
  if (company.includes(KP)) {
    accountOf(KP).remarks.push({
      text: `I had ${petOrItem.short} in my kitchen for his supper at ${fmtHour(hc - 1)}, and put him back in the flat just before ${fmtHour(hc)}.`,
      facts: [{ k: 'at', p: V, h: hc - 1, place: X }],
      side: false,
    });
  }

  // --- Watchers' lists ------------------------------------------------------------------------------
  const chloral = work ? work.means === 'chloral' : rng.chance(0.6);
  const lists: WatchList[] = [];
  const entriesAt = (place: PlaceId): Record<Hour, ListEntry[]> => {
    const out: Record<Hour, ListEntry[]> = {};
    for (const h of hours) {
      out[h] = boardPeople
        .filter((x) => at(x, h) === place)
        .map((x): ListEntry => (faceOf && x === faceOf && h === hc && place === B ? { look: (people.find((q) => q.id === x) as Person).look as string } : { person: x }));
    }
    return out;
  };
  const holder = rng.pick(K.HOLDERS.filter((x) => x.kinds.includes(venue.kind)));
  const barRemarks: Remark[] = [];
  // At Poached a refusing innocent leaves the culprit's crack as the only word on where it is now.
  if (!murder && !(tier <= 2 && refuses)) {
    barRemarks.push({
      text: `${cap(fmtHour(hc + 1))}: ${cName.family} came in and went straight to ${holder.who}, and something changed hands.`,
      facts: [],
      side: false,
      gives: { whereNow: true, why: true },
    });
  }
  lists.push({ watcher: barkeep, place: B, entries: entriesAt(B), remarks: barRemarks });
  const shelf = work ? work.shelf : chloral ? 'the chloral on my hall shelf' : 'the revolver in the hall-stand drawer';
  if (xWatched) {
    lists.push({
      watcher: xw,
      place: X,
      entries: entriesAt(X),
      remarks: murder ? [{ text: `${cap(shelf)} was there at ${fmtHour(h0)}. I didn’t look again.`, facts: [], side: false }] : [],
    });
  }
  if (refuses) {
    // The keeper comes on at the lied hour: before that, the place is anybody's.
    const e = entriesAt(U);
    for (const h of hours) if (h < hc) delete e[h];
    lists.push({ watcher: uk, place: U, entries: e, remarks: [{ text: `I came on at ${fmtHour(hc)}. Before that I couldn’t tell you.`, facts: [], side: false }] });
  }

  // --- The means, the finds, the office -------------------------------------------------------------
  const means = murder
    ? {
        kind: chloral ? ('chloral' as const) : ('gun' as const),
        name: chloral ? 'chloral' : 'a revolver',
        origin: X,
        available: avail,
        delay: chloral ? ([20, 60] as [number, number]) : ([0, 0] as [number, number]),
        originText: work
          ? `${work.shelf} at ${xPlace.short}, open from ${fmtHour(h0)} until ${fmtHour(Math.max(...avail) + 1)}`
          : chloral
            ? `the chloral bottle off the hall shelf at ${rooming.short}, there from ${fmtHour(avail[0] as Hour)}`
            : `the landlady’s late husband’s revolver, from the hall-stand drawer at ${rooming.short}, there from ${fmtHour(avail[0] as Hour)}`,
      }
    : {
        kind: type === 'lost-pet' ? ('pet' as const) : ('item' as const),
        name: 'the door on the latch',
        origin: S,
        available: [h0],
        delay: [0, 0] as [number, number],
        originText: `${petOrItem.name}, ${petOrItem.where}; the door left on the latch, which only someone who’d been in the flat tonight knew`,
      };
  const finds: Find[] = [];
  if (murder) {
    finds.push({
      id: 'scene',
      place: S,
      what: chloral ? 'the table' : 'the floor',
      text: work
        ? `${chloral ? 'Two glasses; one smells sweet and chemical. ' : ''}${work.label.replace('{place}', xPlace.short)}`
        : chloral
          ? `Two glasses; one smells sweet and chemical. Under the table an empty bottle, labelled from ${rooming.short}. The lodgers keep it on the hall shelf.`
          : `A revolver under the chair, one chamber fired. It belongs in the hall-stand drawer at ${rooming.short}.`,
      gives: { means: true },
      facts: [],
    });
    const c = people.find((p) => p.id === C) as Person;
    finds.push({ id: 'papers', place: S, what: 'his papers', text: `A page on each of them. The one on top: ${c.short}; ${c.motive}.`, gives: { why: true }, facts: [] });
  } else {
    finds.push({ id: 'scene', place: S, what: 'the parlour', text: `${petOrItem.empty} The door was on the latch; no marks on it.`, gives: { means: true }, facts: [] });
  }

  const finderPool = suspects.filter((p) => p !== C && at(p, hL) !== S);
  const finder = murder ? rng.pick(finderPool) : client;
  const finderName = people.find((p) => p.id === finder)?.short ?? '';
  const pointer = rng.chance(0.25) ? C : rng.pick(suspects.filter((p) => p !== C));
  const pointerP = people.find((p) => p.id === pointer) as Person;
  const givensFacts: Fact[] = [];
  const text: string[] = [];
  // The window is said in the board's own hours (a board hour is the hour from that o'clock).
  const windowSaid = window.length === 1 ? `at ${fmtHour(hc)} o’clock` : `at ${fmtHour(hc - 1)} or ${fmtHour(hc)} o’clock`;
  if (murder) {
    const v = people.find((p) => p.id === V) as Person;
    text.push(`${clientName.family}, the client, is ${v.name}’s ${clientName.female ? 'sister-in-law' : 'brother-in-law'}.`);
    text.push(`${v.short}, ${v.description}, was found dead in ${(placeById.get(S) as Place).name} at half past ${fmtHour(hL + 1)}, by ${finderName}. The police called it ${chloral ? 'a fall' : 'a robbery gone wrong'}.`);
    if (chloral) text.push(`The coroner says chloral in a drink, drunk ${windowSaid}; it takes twenty minutes to an hour.`);
    else text.push(windowed ? `Shot ${windowSaid}. Nobody heard it over the radios.` : `Shot ${windowSaid}: the man downstairs heard it and looked at his clock.`);
  } else {
    const g = [...guests];
    const gNames = g.map((p) => (people.find((x) => x.id === p) as Person).short);
    text.push(`${clientName.family}’s ${type === 'lost-pet' ? 'pet' : 'treasure'}, ${petOrItem.name}, who lives ${petOrItem.where}, is gone.`.replace('who lives', type === 'lost-pet' ? 'who lives' : 'kept'));
    text.push(`${clientName.female ? 'She' : 'He'} had people in at ${fmtHour(h0)}: ${gNames.join(', ') || 'nobody'}. Nobody else.`);
    if (residentAtScene.length > 0) text.push(`${(people.find((x) => x.id === residentAtScene[0]) as Person).short} lodges there, and has lost ${pron(cName).their} key, so the door was left on the latch.`);
    else text.push('The door was left on the latch for the evening.');
    text.push(
      windowed
        ? `It went ${windowSaid}. Mrs. ${keeperName.family}, a neighbour at ${xPlace.short}, looks in on ${petOrItem.short} of an evening.`
        : `The dog next door went off ${windowSaid}, the way it does when somebody’s on the stairs.`,
    );
    for (const p of g) givensFacts.push({ k: 'at', p, h: h0, place: S });
    for (const p of boardPeople) if (!guests.has(p)) givensFacts.push({ k: 'notAt', p, h: h0, place: S });
  }
  text.push(`${clientName.family} points at ${pointerP.short}: ${pointerP.motive}.`);

  // --- Confrontations -----------------------------------------------------------------------------------
  const confrontations: Confrontation[] = [];
  const short_ = (pl: PlaceId) => (placeById.get(pl) as Place).short;
  for (const lie of lies) {
    if (lie.person === C) {
      // The second lie goes somewhere else watched, but never where the innocent liar claims.
      const coverL = lies.find((l) => l.kind === 'secret')?.claim;
      const alt = [B, X].find((pl) => pl !== lie.claim && pl !== coverL && lists.some((l) => l.place === pl) && at(C, hc) !== pl && checkable(pl, hc));
      const second2 = alt
        ? { text: `All right, I wasn’t at ${short_(lie.claim)}. I was at ${short_(alt)}.`, collidesWith: `${(people.find((x) => x.id === lists.find((l) => l.place === alt)?.watcher) as Person).short}’s list at ${hc}`, place: alt }
        : undefined;
      if (!murder && tier <= 2) {
        confrontations.push({
          person: C,
          hour: hc,
          response: 'crack',
          text: `${second2 ? `“${second2.text}” It doesn’t hold, and ${pron(cName).they} knows it. ` : ''}“All right. I took it. It’s with ${holder.who}.”`,
          facts: [],
          gives: { whereNow: true, why: true },
          ...(second2 ? { secondLie: second2 } : {}),
        });
      } else {
        confrontations.push({
          person: C,
          hour: hc,
          response: second2 ? 'second-lie' : 'refuse',
          text: second2 ? `“${second2.text}”` : '“I’ve told you where I was.”',
          facts: [],
          ...(second2 ? { secondLie: second2 } : {}),
        });
      }
    } else if (lie.kind === 'pair') {
      // Covering for a friend: they stick to it.
      confrontations.push({ person: lie.person, hour: hc, response: 'refuse', text: `“I told you. We were at ${cName.family}’s, playing gin.”`, facts: [] });
    } else if (refuses) {
      confrontations.push({
        person: lie.person,
        hour: hc,
        response: 'refuse',
        text: `“Where I was is my own business. I didn’t ${murder ? 'kill anybody' : 'take anything'}.” (The secret, worse to ${pron(pnamed(lie.person)).them} than the suspicion: ${(people.find((x) => x.id === lie.person) as Person).secret}.)`,
        facts: [],
      });
    } else {
      const secret = (people.find((x) => x.id === lie.person) as Person).secret ?? 'something private';
      confrontations.push({
        person: lie.person,
        hour: hc,
        response: 'admit',
        text: `“All right. I wasn’t at ${short_(lie.claim)}. I was at ${short_(lie.truth)}, with ${yName.given} ${yName.family}. Ask ${pron(yName).them}, and I’d thank you not to spread it.” (The secret: ${secret}.)`,
        facts: [],
        names: [Y],
      });
    }
  }

  const c: BoardCase = {
    id: `board-${seed}-${tier}-${type}`,
    seed,
    tier,
    type,
    people,
    places,
    board: { hours, rows, reasons },
    crime: {
      culprit: C,
      hour: hc,
      window,
      scene: S,
      victim: V,
      why: murder ? ((people.find((p) => p.id === C) as Person).motive as string) : holder.why.replace(/^he /, `${pron(cName).they} `),
      ...(murder ? {} : { whereNow: { place: B, text: `with ${holder.who}, at ${venue.short}` } }),
      finder,
    },
    means,
    accounts,
    lists,
    finds,
    confrontations,
    givens: { text, facts: givensFacts, access: residentAtScene, pointer, window: [...window], ...(company.includes(KP) ? { known: [KP] } : {}) },
    lies,
    ...(variant ? { variant } : {}),
    client,
  };
  return c;
}

const cap = (s: string) => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

export function moves(row: Record<Hour, PlaceId>, hours: Hour[]): number {
  let n = 0;
  for (let i = 1; i < hours.length; i++) if (row[hours[i] as Hour] !== row[hours[i - 1] as Hour]) n++;
  return n;
}
