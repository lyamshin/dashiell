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
  GivenLine,
  GivenPoint,
  Hour,
  Lie,
  ListEntry,
  Means,
  Other,
  Person,
  PersonId,
  Place,
  PlaceId,
  Remark,
  Setup,
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
 *
 * 4a.2 (docs/42 "4a.2"):
 * - setups vary three ways, each drawn from a pool: how the thing went missing or how the victim
 *   was reached (the means and its access), what fixes the hour, and why the client points;
 * - motives fit the crime: a small case's culprit sells the thing, and says so;
 * - everyone the case puts at a watched place is on that watcher's list, the fence and the
 *   client included, and somebody the watcher can't name is listed as such;
 * - an errand lasts an hour; a lie claims somewhere the liar would plausibly be; an account's
 *   reasons are the truth's, except at the lied hour.
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

/** Where people are plausibly found with no reason but their own: venues anyone can walk into. */
const PUBLIC = new Set(['bar', 'club', 'restaurant', 'theatre']);

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

const pron = (n: { female: boolean }) =>
  n.female ? { they: 'she', them: 'her', their: 'her' } : { they: 'he', them: 'him', their: 'his' };

function fill(text: string, n: { female: boolean }): string {
  const p = pron(n);
  return text.replace(/\{they\}/g, p.they).replace(/\{them\}/g, p.them).replace(/\{their\}/g, p.their);
}

/** Fill `{key}` slots from `vars`; `{Key}` takes the value capitalised. */
function tpl(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (m, k: string) => {
    if (vars[k] !== undefined) return vars[k] as string;
    const lower = (k[0] as string).toLowerCase() + k.slice(1);
    if (lower !== k && vars[lower] !== undefined) return cap(vars[lower] as string);
    return m;
  });
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
  // A small case: the thief learns the way in, goes about the evening, and comes back.
  else hc = rng.pick(hours.filter((h) => h >= h0 + 2));
  const window = windowed ? [hc - 1, hc] : [hc];

  // --- Places, and the setup ------------------------------------------------------------------
  const tags = rng.shuffle(ROLES[tier]);
  const venue = rng.pick(K.VENUES);
  const rooming = rng.pick(K.ROOMING);
  const u = rng.pick(K.UNWATCHED.filter((x) => x.short !== venue.short));
  // The origin in working hours: a surgery, a pharmacy, a pawnshop or a studio that shuts before the crime.
  const work = murder && (tier === 1 || tier === 4) && rng.chance(0.5) ? rng.pick(K.WORKPLACES) : undefined;
  // Small cases at Raw and Coddled: the second watched place can be a night shift or another venue.
  const secondPool = [...K.NIGHT_SHIFTS, ...K.VENUES.filter((v) => v.kind === 'restaurant' || v.kind === 'theatre')].filter((v) => v.kind !== venue.kind);
  const second = !murder && tier <= 1 && rng.chance(0.6) ? rng.pick(secondPool) : undefined;
  const xRooming = !work && !second;
  // 4a.2: how a small case's thing went missing (the spare key needs a neighbour's house).
  const sm = murder ? undefined : rng.pick(K.SMALL_MEANS.filter((d) => d.mode !== 'spare' || xRooming));
  const mode = sm?.mode;
  const rm = murder && !work ? rng.pick(K.ROOMING_MEANS) : undefined;

  // The hours the means was there to be had.
  const avail: Hour[] = murder
    ? hours.filter((h) => h < (windowed ? hc - 1 : hc))
    : mode === 'party'
      ? [h0]
      : mode === 'told'
        ? [h0, h0 + 1].filter((h) => h < hc)
        : hours.filter((h) => h < hc);
  if (avail.length === 0) return veto('no hours for the means');

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
  const N = tags.includes('N') ? idOf('N') : undefined;
  const L = hasL ? idOf('L') : undefined;

  const places: Place[] = [];
  const all: [Hour, Hour] = [h0, hL];
  const S = 'scene';
  const B = 'bar';
  const X = murder ? 'rooming' : 'neighbours';
  const U = 'u';
  const H = 'h';
  const YH = 'yhome';
  const pet = type === 'lost-pet' ? rng.pick(K.PETS) : undefined;
  const item = type === 'lost-item' ? rng.pick(K.ITEMS) : undefined;
  const thing = (pet ?? item) as { name: string; short: string; where: string; empty: string };
  if (murder) {
    const sc = rng.pick(K.SCENE_HOMES);
    places.push({ id: S, name: `${victimName.family}’s ${sc.tail}`, short: `${victimName.family}’s place`, kind: 'home', open: all, scene: true, street: sc.street, key: `scene:${K.SCENE_HOMES.indexOf(sc)}` });
  } else {
    const sc = rng.pick(K.LOST_SCENES);
    places.push({ id: S, name: `the ${clientName.family} ${sc.tail}`, short: `the ${clientName.family} flat`, kind: 'home', open: all, scene: true, street: sc.street, key: `lost:${K.LOST_SCENES.indexOf(sc)}` });
  }
  places.push({ id: B, name: venue.name, short: venue.short, kind: venue.kind, open: all, street: venue.street, key: `venue:${K.VENUES.indexOf(venue)}` });
  if (work && worker) {
    const owner = (nameOf(worker) as Named).family;
    places.push({ id: X, name: work.name.replace('{owner}', owner), short: work.short.replace('{owner}', owner), kind: 'work', open: [h0, Math.max(...avail)], street: work.street, key: `work:${K.WORKPLACES.indexOf(work)}` });
  } else if (second) {
    places.push({ id: X, name: second.name, short: second.short, kind: second.kind, open: all, street: second.street, key: K.NIGHT_SHIFTS.includes(second) ? `shift:${K.NIGHT_SHIFTS.indexOf(second)}` : `venue:${K.VENUES.indexOf(second)}` });
  } else {
    places.push({ id: X, name: rooming.name, short: rooming.short, kind: 'home', open: all, street: rooming.street, key: `rooming:${K.ROOMING.indexOf(rooming)}` });
  }
  if (tier >= 1) places.push({ id: U, name: u.name, short: u.short, kind: u.kind, open: all, street: u.street, key: `unwatched:${K.UNWATCHED.indexOf(u)}` });
  if (tier >= 4) {
    const street = rng.pick(['Cannon Street', 'Pitt Street', 'Norfolk Street', 'Suffolk Street']);
    places.push({ id: H, name: `${cName.family}’s flat on ${street}`, short: `${cName.family}’s flat`, kind: 'home', open: all, street, key: 'flat' });
  }
  if (admits) places.push({ id: YH, name: `${yName.family}’s rooms on Broome Street`, short: `${yName.family}’s rooms`, kind: 'home', open: all, street: 'Broome Street', offBoard: true, key: 'rooms' });
  const placeById = new Map(places.map((p) => [p.id, p]));
  const open = (p: PlaceId, h: Hour) => {
    const pl = placeById.get(p);
    return !!pl && h >= pl.open[0] && h <= pl.open[1];
  };
  const kindOf = (p: PlaceId) => placeById.get(p)?.kind;
  const short_ = (pl: PlaceId) => (placeById.get(pl) as Place).short;
  // Nobody drops in on a night shift or a surgery they don't work at, except as a patient.
  const visitX = kindOf(X) !== 'work';
  // Who can say who was at X: the origin's landlady or desk (murder), or at Raw–Poached a second watcher.
  const xWatched = murder || tier <= 2;
  // The origin: where the means was, or where the way in was learnt.
  const origin: PlaceId = murder ? X : mode === 'party' ? S : mode === 'told' ? B : X;

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
  // A party setup that needs a lodger at the scene: the culprit, or an innocent with access.
  const resident = sm?.resident ? (rng.chance(0.5) ? C : pick(ids.filter((p, i) => p !== C && tags[i] !== 'N'))) : undefined;
  if (resident) residentAtScene.push(resident);
  // In a small case, the access anchor for a non-outsider: the party, the venue while the client
  // talked, or the neighbour's house where the key hangs.
  const smallAccess = (id: PersonId, a: Map<Hour, PlaceId>, hours_: Hour[]) => {
    if (id === resident) return;
    if (mode === 'party') {
      a.set(h0, S);
      guests.add(id);
    } else if (hours_.length > 0) a.set(pick(hours_), mode === 'told' ? B : X);
  };

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
    } else {
      if (mode === 'spare' && !secretLiar && tier < 4 && rng.chance(0.4)) {
        lodges.add(C);
        base = X;
      } else smallAccess(C, a, avail);
      if (base !== X) base = tier >= 4 ? H : pick(visitX ? [B, X] : [B]);
      // With an innocent liar, the culprit hears it at one hour and is gone the next, so the liar
      // can hear it apart from them.
      if (mode === 'told' && secretLiar) {
        const away = avail.find((h) => !a.has(h));
        if (away !== undefined) a.set(away, tier >= 4 ? H : visitX ? X : U);
      }
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
  // An innocent liar lodges at the rooming house sometimes, so a cover story there is a lie about
  // their own home (4a.2: a lie claims somewhere the liar would plausibly be).
  const lLodges = !!L && xRooming && variant !== 'pair' && rng.chance(0.5);
  for (const { t, id, k } of others) {
    const a = new Map<Hour, PlaceId>();
    let base: PlaceId = B;
    // The liar hears or takes it apart from the culprit.
    const accessHours = t === 'L' && secretLiar && origin !== S ? avail.filter((h) => rows[C]?.[h] !== origin) : avail;
    if (!murder && t !== 'N') {
      if (t === 'L' && accessHours.length === 0 && id !== resident) return veto('the liar can’t learn the way in apart from the culprit');
      smallAccess(id, a, accessHours);
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
      if (where === X && !murder && kindOf(X) === 'home') {
        base = X;
        lodges.add(id);
      }
    } else if (t === 'N') {
      // The outsider never goes where the way in was learnt.
      const bases = (murder ? [U, B] : [U, ...(visitX ? [X] : []), B]).filter((p) => p !== origin);
      base = pick(bases);
      if (tier === 1) {
        a.set(hc, U);
        base = U;
      } else if (tier === 4) {
        // The side remark's speaker: walked over to the venue at the crime hour.
        a.set(hc - 1, open(X, hc - 1) && X !== origin ? X : U);
        a.set(hc, B);
      } else a.set(hc, hbAt(t, k) ?? B);
    } else if (t === 'L') {
      if (murder && worker !== id) {
        // At the origin while the means was there, but never when the culprit was.
        if (accessHours.length === 0) return veto('the liar can’t reach the origin apart from the culprit');
        a.set(pick(accessHours), X);
      }
      if (lLodges) {
        lodges.add(id);
        base = X;
      }
      if (variant === 'pair') {
        if (murder && !work && rng.chance(0.5)) {
          lodges.add(id);
          base = X;
        }
        a.set(hc, B);
      } else {
        if (!murder && !lLodges) base = pick(visitX ? [B, X] : [B]);
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
        if (a.has(h) || row[h] !== cRow[h] || (mode === 'party' && h === h0)) return;
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
  if (N && murder && avail.some((h) => at(N, h) === X)) return veto('the outsider had access');
  if (N && !murder && (guests.has(N) || residentAtScene.includes(N) || avail.some((h) => at(N, h) === origin))) return veto('the outsider had access');
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
  const jobs = rng.shuffle(K.JOBS);
  const looks = rng.shuffle(K.LOOKS);
  const namedOf = new Map<PersonId, Named>();
  // Motives (4a.2: they fit the crime). In a small case the culprit sells it, and the motive says
  // why they need the money; the fence they sell to fits the motive and sits in the venue.
  const holderOk = (id: string) => (K.HOLDERS.find((x) => x.id === id) as (typeof K.HOLDERS)[number]).kinds.includes(venue.kind);
  const smallPool = murder
    ? []
    : rng.shuffle(K.SMALL_MOTIVES.filter((m) => m.types.includes(type as 'lost-item' | 'lost-pet') && (!m.species || (pet && m.species.includes(pet.species)))));
  const cMotive = murder ? undefined : smallPool.find((m) => m.kind === 'money' && (!m.holder || holderOk(m.holder)));
  if (!murder && !cMotive) return veto('no motive fits');
  const holder = murder ? undefined : cMotive?.holder ? (K.HOLDERS.find((x) => x.id === cMotive.holder) as (typeof K.HOLDERS)[number]) : rng.pick(K.HOLDERS.filter((x) => x.id !== 'Lou' && x.kinds.includes(venue.kind)));
  const murderMotives = rng.shuffle(K.MOTIVES);
  const restSmall = smallPool.filter((m) => m !== cMotive && !m.holder);
  const motiveKind = new Map<PersonId, string>();
  const thingVars = (n: Named): Record<string, string> => ({
    thing: thing.short,
    pet: thing.short,
    breed: pet?.breed ?? '',
    pthem: pet ? (pet.male ? 'him' : 'her') : 'it',
    client: clientName.family,
    victim: victimName.family,
    ...pron(n),
  });
  let otherIdx = 0;
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
    const secondWorker = !!second?.workerJob && at(id, hc) === X;
    const job = id === worker && work ? work.workerJob : secondWorker ? second?.workerJob : (jobs[i] as string);
    const last = at(id, hL) as PlaceId;
    let motive: string;
    let motiveId: string;
    if (murder) {
      const m = murderMotives[i % murderMotives.length] as (typeof K.MOTIVES)[number];
      motive = fill(m.text, n).replace('{victim}', victimName.family);
      motiveKind.set(id, m.kind);
      motiveId = `m${K.MOTIVES.indexOf(m)}`;
    } else {
      const m = id === C ? cMotive : restSmall[otherIdx++ % Math.max(restSmall.length, 1)];
      motive = m ? tpl(m.text, thingVars(n)) : '';
      motiveKind.set(id, m?.kind ?? 'money');
      motiveId = m ? `s${K.SMALL_MOTIVES.indexOf(m)}` : '';
    }
    people.push({
      id,
      name: `${n.given} ${n.family}`,
      short: n.family,
      role: 'suspect',
      description: [job, home].filter(Boolean).join('; '),
      ...(job ? { job } : {}),
      ...(motiveId ? { motiveId } : {}),
      look: looks[i] as string,
      foundAt: last === S ? (tier >= 4 && murder ? H : B) : last,
      motive,
      female: n.female,
      ...(lodges.has(id) ? { home: X } : residentAtScene.includes(id) ? { home: S } : id === C && tier >= 4 ? { home: H } : {}),
      ...((id === worker && work) || (secondWorker && kindOf(X) === 'work') ? { works: X } : {}),
      ...(t === 'L' ? { secret: fill(variant === 'pair' ? `covering for ${cName.family}, who is owed a favour` : u.secret, n) } : {}),
    });
  });
  if (murder) {
    people.push({ id: V, name: `${victimName.given} ${victimName.family}`, short: victimName.family, role: 'victim', description: rng.pick(K.VICTIM_JOBS), foundAt: S, female: false });
  } else {
    people.push({ id: V, name: thing.name, short: thing.short, role: 'victim', description: thing.where, foundAt: S, object: true });
  }
  const client = 'client';
  const relation = rng.pick(K.RELATIONS);
  people.push({
    id: client,
    name: `${clientName.female ? 'Mrs.' : 'Mr.'} ${clientName.given} ${clientName.family}`,
    short: clientName.family,
    role: 'client',
    description: murder ? `${victimName.family}’s ${clientName.female ? relation.female : relation.male}` : type === 'lost-pet' ? 'the owner' : `the owner, ${clientName.female ? 'a widow' : 'a widower'}`,
    foundAt: S,
    female: clientName.female,
  });
  const barkeep = 'barkeep';
  people.push({ id: barkeep, name: `${barkeepName.given} ${barkeepName.family}`, short: barkeepName.family, role: 'watcher', description: `${venue.job} at ${venue.short}`, foundAt: B, female: barkeepName.female });
  const xw = 'xwatcher';
  const xPlace = placeById.get(X) as Place;
  const xJob = work ? work.job : second ? second.job : 'the landlady, on a chair at the foot of her stairs';
  const landlady = !work && !second;
  const xwName = landlady ? `Mrs. ${rooming.landlady ?? xWatcherName.family}` : `${xWatcherName.given} ${xWatcherName.family}`;
  if (xWatched) {
    people.push({
      id: xw,
      name: xwName,
      short: landlady ? xwName : xWatcherName.family,
      role: 'watcher',
      description: `${xJob} at ${xPlace.short}`,
      foundAt: X,
      female: landlady ? true : xWatcherName.female,
    });
  }
  const uk = 'ukeeper';
  if (refuses) people.push({ id: uk, name: `${uKeeperName.given} ${uKeeperName.family}`, short: uKeeperName.family, role: 'watcher', description: `${u.keeper}, at ${u.short}`, foundAt: U, female: uKeeperName.female });
  if (company.includes(W)) {
    const pl = staticAt.get(W) as PlaceId;
    people.push({ id: W, name: `${companyName.given} ${companyName.family}`, short: companyName.family, role: 'company', description: companyDesc(pl, true), foundAt: pl, female: companyName.female, ...companyHome(pl) });
  }
  if (company.includes(W2)) people.push({ id: W2, name: `${company2Name.given} ${company2Name.family}`, short: company2Name.family, role: 'company', description: companyDesc(X, false), foundAt: X, female: company2Name.female, ...companyHome(X) });
  if (company.includes(KP)) people.push({ id: KP, name: `Mrs. ${keeperName.family}`, short: `Mrs. ${keeperName.family}`, role: 'company', description: `a neighbour at ${xPlace.short}`, foundAt: X, female: true, home: X });
  if (company.includes(Y) && L) {
    people.push({ id: Y, name: `${yName.given} ${yName.family}`, short: yName.family, role: 'company', description: `was with ${(namedOf.get(L) as Named).family} at ${u.short}; nobody else knows it`, foundAt: (people.find((x) => x.id === L)?.foundAt ?? B), female: yName.female, home: YH });
  }
  function companyDesc(pl: PlaceId, first: boolean): string {
    if (pl === U) return `keeps ${u.short}`;
    const p = placeById.get(pl) as Place;
    if (p.kind === 'home') return `a lodger at ${p.short}, who sat up in the parlour`;
    if (p.kind === 'work') return `works the next bench at ${p.short}`;
    if (p.kind === 'theatre') return `a regular at ${p.short}, who sits through every show twice`;
    return first ? `a regular at ${p.short}` : `a regular at ${p.short}, at the same table every night`;
  }
  function companyHome(pl: PlaceId): Partial<Person> {
    const k = kindOf(pl);
    return k === 'home' ? { home: pl } : k === 'work' ? { works: pl } : {};
  }
  const keeperShort = xWatched && landlady ? xwName : `Mrs. ${keeperName.family}`;
  const pnamed = (p: PersonId): Named => namedOf.get(p) ?? (p === W ? companyName : p === W2 ? company2Name : p === KP ? keeperName : p === Y ? yName : victimName);
  const personOf = (p: PersonId) => people.find((x) => x.id === p) as Person;

  // --- Reasons for moves (rule 3; decided 2026-09-28: no two people give the same one) --------------
  const drawn = new Set<string>();
  const draw = (pool: string | string[], p: PersonId, vars: Record<string, string>, ok: (t: string) => boolean = () => true): string | null => {
    const left = (typeof pool === 'string' ? (K.REASONS[pool] ?? []) : pool).filter((x) => !drawn.has(x) && ok(x));
    if (left.length === 0) return null;
    const t = rng.pick(left);
    drawn.add(t);
    let out = fill(t, pnamed(p));
    for (const [k, v] of Object.entries(vars)) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    return out;
  };
  // How long a stint lasts from `h` in someone's row (or their account's claims).
  const stint = (row: Record<Hour, PlaceId>, h: Hour) => {
    let n = 0;
    for (const x of hours) if (x >= h && row[x] === row[h]) n++;
    else if (x > h) break;
    return n;
  };
  let uHonestUsed = false;
  let ranDry = false;
  // 4b: who went on an errand to which house at which hour, and from where. A second person on an
  // errand to the same house at the same hour went along with the first, or the case is refused.
  const errandAt = new Map<string, { p: PersonId; from: PlaceId }>();
  let errandClash = false;
  function reasonFor(p: PersonId, from: PlaceId, to: PlaceId, h: Hour, len: number, truth = false): string {
    const pl = placeById.get(to) as Place;
    if (p === V && murder) return to === S ? 'went home: he had company coming' : `his usual at ${pl.short}`;
    // The culprit's own move to the scene is never said; it's here for the designer.
    if (to === S) return p === C ? `went round to ${murder ? victimName.family + '’s' : 'the flat'}` : 'the party';
    const vars = { p: pl.short, h: fmtHour(h) };
    // 4b: a reason that says how long it lasts fits the stint ("for two hours", "to bed").
    const fits = (t: string) => K.reasonFits(t, len, h + len - 1 >= hL);
    let dest: string | null;
    const own = personOf(p)?.home === to;
    if (p === Y && to === U && L) dest = `went to ${pl.short} to meet ${(namedOf.get(L) as Named).family}`;
    else if (to === U && !uHonestUsed) {
      uHonestUsed = true;
      dest = fill(u.honest, pnamed(p));
    } else if (to === U) dest = draw(u.more, p, vars, fits);
    else if (own || to === YH) dest = draw('home', p, vars, fits);
    // 4a.2: an hour at somebody else's home is an errand; longer is a visit.
    else if (pl.kind === 'home' && len <= 1) {
      const first = truth ? errandAt.get(`${to}@${h}`) : undefined;
      if (first && first.from === from) {
        // Going along: they left with the first, so the first's leaving says it for both.
        const along = draw('along', p, { ...vars, x: pnamed(first.p).family }, fits);
        if (along !== null) return along;
        dest = null;
      } else {
        if (first) errandClash = true;
        dest = draw('errand', p, vars, fits);
        if (truth) errandAt.set(`${to}@${h}`, { p, from });
      }
    } else if (pl.kind === 'home') dest = draw('visit', p, vars, fits);
    else if (pl.kind === 'work') dest = to === X && work && p !== worker ? draw(work.visit, p, vars, fits) : draw('work', p, vars, fits);
    else dest = draw(pl.kind, p, vars, fits);
    if (dest === null) {
      ranDry = true;
      return `went to ${pl.short}`;
    }
    // Leaving the office's party, or closing up at work.
    const lead =
      from === S && mode === 'party' && guests.has(p) && h === h0 + 1
        ? draw('party', p, vars)
        : kindOf(from) === 'work' && (p === worker || staticAt.has(p) || at(p, hc) === from)
          ? draw('closed', p, vars)
          : null;
    return lead ? `${lead} and ${dest}` : dest;
  }
  for (const p of [...suspects, ...company, ...(murder ? [V] : [])]) {
    reasons[p] = {};
    const row = rows[p] as Record<Hour, PlaceId>;
    for (let i = 1; i < hours.length; i++) {
      const h = hours[i] as Hour;
      const prev = at(p, hours[i - 1] as Hour) as PlaceId;
      const cur = at(p, h) as PlaceId;
      if (prev === cur) continue;
      (reasons[p] as Record<Hour, string>)[h] = reasonFor(p, prev, cur, h, stint(row, h), true);
    }
  }
  if (errandClash) return veto('two errands to one house in one hour, from different places');

  // --- Lies (decided 2026-09-28: the culprit and the innocent liar never claim the same place) --------
  const lies: Lie[] = [];
  const claimOverride = new Map<string, Claim>();
  // A claim collides only where somebody can say who was there: a list, or a company witness there all night.
  const listed = new Set<PlaceId>([B, ...(xWatched ? [X] : []), ...(refuses ? [U] : [])]);
  const checkable = (pl: PlaceId, h: Hour) => open(pl, h) && kindOf(pl) !== 'work' && (listed.has(pl) || [...staticAt.values()].includes(pl));
  // 4a.2: a lie claims somewhere the liar would plausibly be: a venue, their own home, their work
  // in its hours, or a home in the company of somebody who lives there.
  const plausible = (p: PersonId, pl: PlaceId, h: Hour, comp: PersonId[] = []) => {
    const k = kindOf(pl) as string;
    const who = personOf(p);
    if (PUBLIC.has(k)) return true;
    if (who.home === pl) return true;
    if (who.works === pl && open(pl, h)) return true;
    return k === 'home' && comp.some((x) => personOf(x)?.home === pl);
  };
  let cClaim: PlaceId;
  if (variant === 'pair' || tier === 4) cClaim = H;
  else {
    let cands = [B, X].filter((pl) => checkable(pl, hc) && plausible(C, pl, hc));
    if (tier === 1 && cands.some((pl) => pl !== rAtHc)) cands = cands.filter((pl) => pl !== rAtHc);
    if (cands.length === 0) return veto('nowhere checkable and plausible for the culprit to claim');
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
      const cands = [B, X].filter((pl) => pl !== cClaim && checkable(pl, hc) && plausible(L, pl, hc));
      if (cands.length === 0) return veto('nowhere checkable and plausible for the liar’s cover');
      const cover = pick(cands);
      lies.push({ person: L, hour: hc, kind: 'secret', truth: U, claim: cover });
      claimOverride.set(`${L}@${hc}`, { place: cover, company: [] });
    }
  }

  // --- Accounts -----------------------------------------------------------------------------------
  // 4a.2: an account's reasons are the truth's. A move the person really made gives the truth's
  // reason; a move that's only a move because of a lie gives the reason for the stint it rejoins
  // (or "went back" when the account has already been there); a lie's own move gets a fresh one.
  const back = ['went back to {p}', 'came back to {p}', 'went back to {p} after all', 'looked in at {p} again'];
  const accounts: Account[] = [];
  for (const p of [...suspects, ...company]) {
    const claims: Record<Hour, Claim> = {};
    const row = rows[p] as Record<Hour, PlaceId>;
    let prevPlace: PlaceId | undefined;
    hours.forEach((h, i) => {
      const ov = claimOverride.get(`${p}@${h}`);
      const place = ov?.place ?? (at(p, h) as PlaceId);
      const comp = ov ? ov.company : withAt(place, h, p);
      let reason: string | undefined = ov?.reason;
      if (reason === undefined && prevPlace !== undefined && place !== prevPlace) {
        if (ov) {
          // A lie's move: how long the claim runs on in the account.
          let len = 1;
          for (const x of hours.slice(i + 1)) {
            if ((claimOverride.get(`${p}@${x}`)?.place ?? at(p, x)) === place) len++;
            else break;
          }
          reason = reasonFor(p, prevPlace, place, h, len);
        } else if (reasons[p]?.[h] !== undefined) reason = reasons[p]?.[h];
        else {
          let s = i;
          while (s > 0 && row[hours[s - 1] as Hour] === row[h]) s--;
          const start = hours[s] as Hour;
          const said = hours.slice(s, i).some((x) => claims[x]?.place === place);
          if (said) reason = draw(back, p, { p: short_(place) }) ?? `went back to ${short_(place)}`;
          else reason = reasons[p]?.[start] ?? reasonFor(p, prevPlace, place, h, stint(row, h));
        }
      }
      claims[h] = { place, company: comp, ...(reason ? { reason } : {}) };
      prevPlace = place;
    });
    accounts.push({ person: p, claims, remarks: [] });
  }
  if (ranDry) return veto('ran out of reasons');
  // The culprit and the innocent liar never claim the same place at the same hour (the office's
  // party, which everybody there shares, aside).
  if (L && variant !== 'pair') {
    const ca = accounts.find((a) => a.person === C) as Account;
    const la = accounts.find((a) => a.person === L) as Account;
    for (const h of hours) {
      if (mode === 'party' && h === h0 && guests.has(C) && guests.has(L)) continue;
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
  if (company.includes(KP) && pet) {
    accountOf(KP).remarks.push({
      text: `I had ${pet.short} at my place at ${fmtHour(hc - 1)}, ${pet.keep}, and put ${pet.male ? 'him' : 'her'} back in the flat just before ${fmtHour(hc)}.`,
      facts: [{ k: 'at', p: V, h: hc - 1, place: X }],
      side: false,
    });
  }

  // --- People at watched places who aren't rows (4a.2: the lists leave nobody out) -----------------
  const otherList: Other[] = [];
  if (holder) otherList.push({ id: 'fence', name: holder.listed, at: Object.fromEntries(hours.map((h) => [h, B])), known: true });
  if (mode === 'told') otherList.push({ id: 'client', name: `${clientName.female ? 'Mrs.' : 'Mr.'} ${clientName.family} telling the room about ${pron(clientName).their} ${sm?.id === 'told-window' ? 'window' : 'key'}`, at: Object.fromEntries(avail.map((h) => [h, B])), known: true });
  if (refuses && L && u.companion) {
    const lRow = rows[L] as Record<Hour, PlaceId>;
    otherList.push({ id: 'companion', name: u.companion, at: Object.fromEntries(hours.filter((h) => h >= hc - (windowed ? 1 : 0) && lRow[h] === U).map((h) => [h, U])), known: false });
  }

  // --- Watchers' lists ------------------------------------------------------------------------------
  const lists: WatchList[] = [];
  const entriesAt = (place: PlaceId): Record<Hour, ListEntry[]> => {
    const out: Record<Hour, ListEntry[]> = {};
    for (const h of hours) {
      out[h] = [
        ...boardPeople
          .filter((x) => at(x, h) === place)
          .map((x): ListEntry => (faceOf && x === faceOf && h === hc && place === B ? { look: personOf(x).look as string } : { person: x })),
        ...otherList.filter((o) => o.at[h] === place).map((o): ListEntry => ({ other: o.id })),
      ];
    }
    return out;
  };
  const barRemarks: Remark[] = [];
  // At Poached a refusing innocent leaves the culprit's crack as the only word on where it is now.
  if (holder && !(tier <= 2 && refuses)) {
    barRemarks.push({
      // 4b: the handover is seen, not who made it: a name here would settle who on one line (rule 15).
      text: `${cap(fmtHour(hc + 1))}: somebody came in with something under a coat and went straight to ${holder.who.split(',')[0]}, and it changed hands. I was watching the coat, not the face.`,
      facts: [],
      side: false,
      gives: { whereNow: true, why: true },
    });
  }
  // A refusing innocent is cleared by the keeper of the place they were really at. Something has to
  // send the player there without placing them (4a.2): the barman knows where they go.
  if (refuses && L) {
    const lN = namedOf.get(L) as Named;
    barRemarks.push({
      text: `${lN.family}? ${cap(pron(lN).they)} goes on to ${u.short} most nights, if it’s ${lN.family} you’re after.`,
      facts: [],
      side: false,
      mentions: { places: [U], people: [L], why: `${barkeepName.family} says ${lN.family} goes on to ${u.short} most nights` },
    });
  }
  lists.push({ watcher: barkeep, place: B, entries: entriesAt(B), remarks: barRemarks });

  // --- The means ------------------------------------------------------------------------------------
  const delayText = (d: [number, number]) => (d[1] <= 15 ? 'it acts in minutes' : 'it takes twenty minutes to an hour');
  let md: { kind: Means['kind']; name: string; shelf: string; origin: string; scene: string; what: string; police: string; delay: [number, number]; id: string } | undefined;
  if (murder && work) {
    const kind: Means['kind'] = work.means === 'gun' ? 'gun' : work.means === 'chloral' ? 'chloral' : 'poison';
    const delay: [number, number] = kind === 'gun' ? [0, 0] : kind === 'chloral' ? [20, 60] : [1, 15];
    md = {
      id: `work:${work.short.replace('{owner}’s ', '')}`,
      kind,
      name: work.meansName,
      shelf: work.shelf,
      origin: `${work.shelf} at ${xPlace.short}, open from ${fmtHour(h0)} until ${fmtHour(Math.max(...avail) + 1)}`,
      scene: `${kind === 'chloral' ? 'Two glasses; one smells sweet and chemical. ' : ''}${work.label.replace('{place}', xPlace.short)}`,
      what: kind === 'gun' ? 'the floor' : 'the table',
      police: kind === 'gun' ? 'a robbery gone wrong' : kind === 'chloral' ? 'a fall' : 'his heart',
      delay,
    };
  } else if (murder && rm) {
    md = { ...rm, origin: rm.origin.replace(/\{x\}/g, rooming.short) + `, there from ${fmtHour(avail[0] as Hour)}`, scene: rm.scene.replace(/\{x\}/g, rooming.short) };
  }
  if (xWatched) {
    lists.push({
      watcher: xw,
      place: X,
      entries: entriesAt(X),
      remarks: md ? [{ text: `${cap(md.shelf)} was there at ${fmtHour(h0)}. I didn’t look again.`, facts: [], side: false }] : mode === 'spare' && landlady ? [{ text: `The spare key for the ${clientName.family} flat was on its nail at ${fmtHour(h0)}, and on its nail in the morning.`, facts: [], side: false }] : [],
    });
  }
  if (refuses) {
    // The keeper comes on at the lied hour: before that, the place is anybody's.
    const e = entriesAt(U);
    for (const h of hours) if (h < hc) delete e[h];
    lists.push({ watcher: uk, place: U, entries: e, remarks: [{ text: `I came on at ${fmtHour(hc)}. Before that I couldn’t tell you.`, facts: [], side: false }] });
  }

  const occasion = rng.pick(K.OCCASIONS);
  const residentN = resident ? (namedOf.get(resident) as Named) : undefined;
  const smVars: Record<string, string> = {
    client: clientName.family,
    cthey: pron(clientName).they,
    ctheir: pron(clientName).their,
    resident: residentN?.family ?? '',
    rtheir: residentN ? pron(residentN).their : '',
    venue: venue.short,
    h0: fmtHour(h0),
    h2: fmtHour(Math.max(...avail) + 1),
    x: xPlace.short,
    keeper: keeperShort,
    occasion: occasion.noun,
  };
  const means: Means = md
    ? { kind: md.kind, name: md.name, origin: X, available: avail, delay: md.delay, originText: md.origin }
    : {
        kind: type === 'lost-pet' ? 'pet' : 'item',
        name: mode === 'spare' ? 'the spare key' : 'the way in',
        origin,
        available: avail,
        delay: [0, 0],
        originText: `${thing.name}, ${thing.where}; ${tpl((sm as (typeof K.SMALL_MEANS)[number]).origin, smVars)}`,
      };
  const finds: Find[] = [];
  if (md) {
    finds.push({ id: 'scene', place: S, what: md.what, text: md.scene, gives: { means: true }, facts: [] });
    const c = personOf(C);
    finds.push({ id: 'papers', place: S, what: 'his papers', text: `A page on each of them. The one on top: ${c.short}; ${c.motive}.`, gives: { why: true }, facts: [] });
  } else {
    finds.push({ id: 'scene', place: S, what: 'the parlour', text: `${thing.empty} ${tpl((sm as (typeof K.SMALL_MEANS)[number]).scene, smVars)}`, gives: { means: true }, facts: [] });
  }

  // --- The office -------------------------------------------------------------------------------------
  const finderPool = suspects.filter((p) => p !== C && at(p, hL) !== S);
  const finder = murder ? rng.pick(finderPool) : client;
  const finderName = personOf(finder)?.short ?? '';
  const pointer = rng.chance(0.25) ? C : rng.pick(suspects.filter((p) => p !== C));
  const pointerP = personOf(pointer);
  const pointerN = namedOf.get(pointer) as Named;
  const givensFacts: Fact[] = [];
  const points: GivenPoint[] = [];
  const text: string[] = [];
  // 4b: each office line by what it says, with the values it was filled from, so the book can
  // put it in the client's mouth without reading the sentence back.
  const lines: GivenLine[] = [];
  const say = (kind: GivenLine['kind'], id: string, vars: Record<string, string>, line: string) => {
    text.push(line);
    lines.push({ kind, id, text: line, vars });
  };
  const programme = rng.pick(K.PROGRAMMES);
  const hourVars = { hc: fmtHour(hc), a: fmtHour(hc - 1), b: fmtHour(hc), programme, client: clientName.family };
  const who = { client: clientName.family, clientFull: `${clientName.given} ${clientName.family}` };
  let clockId: string;
  let pointerKind: string;
  // The window is said in the board's own hours (a board hour is the hour from that o'clock).
  if (murder && md) {
    const v = personOf(V);
    const rel = clientName.female ? relation.female : relation.male;
    say('relation', 'relation', { ...who, victim: v.short, victimFull: v.name, relation: rel }, `${clientName.family}, the client, is ${v.name}’s ${rel}.`);
    const finderWhy = rng.pick(K.FINDER_WHY);
    const foundVars = { ...who, victim: v.short, job: v.description, scene: (placeById.get(S) as Place).name, sceneShort: (placeById.get(S) as Place).short, found: `half past ${fmtHour(hL + 1)}`, finder: finderName, finderWhy, police: md.police };
    say('found', 'found', foundVars, `${v.short}, ${v.description}, was found dead in ${foundVars.scene} at ${foundVars.found}, by ${finderName}, ${finderWhy}. The police called it ${md.police}.`);
    const clocks = K.MURDER_CLOCKS.filter((x) => x.windowed === windowed && x.kinds.includes(md.kind));
    const clock = rng.pick(clocks);
    clockId = clock.id;
    const sound = md.kind === 'gun' ? 'a shot' : md.kind === 'blade' ? 'a fall' : 'a glass break';
    const clockVars = { ...hourVars, means: md.name.replace(/^a /, ''), delay: delayText(md.delay), sound, kind: md.kind, windowed: windowed ? 'yes' : 'no' };
    say('clock', clock.id, clockVars, tpl(clock.text, clockVars));
    // Where he'd been: it sends the player to that watcher (rule 18, and 4a.2's pointers).
    if (hours.some((h) => h < hc && at(V, h) === B)) {
      say('venue', 'venue', { ...who, venue: venue.short, victim: v.short }, `He’d been at ${venue.short} earlier in the evening, his usual.`);
      points.push({ kind: 'place', ref: B, text: `${v.short} had been at ${venue.short} earlier` });
    }
    const pk = rng.pick(K.MURDER_POINTERS);
    pointerKind = pk.kind === 'motive' ? (motiveKind.get(pointer) as string) : pk.kind;
    const pv = { Client: clientName.family, P: pointerP.short, pthem: pron(pointerN).them, motive: pointerP.motive as string };
    say('pointer', pk.kind, { ...who, P: pointerP.short, pthey: pron(pointerN).they, pthem: pron(pointerN).them, ptheir: pron(pointerN).their, motive: pv.motive, victim: v.short }, tpl(pk.text, pv));
  } else {
    const def = sm as (typeof K.SMALL_MEANS)[number];
    const g = [...guests];
    const gNames = g.map((p) => personOf(p).short);
    const thingVars = { ...who, thing: thing.short, thingName: thing.name, where: thing.where, breed: pet?.breed ?? '', pet: pet ? 'yes' : 'no', pthey: pet ? (pet.male ? 'he' : 'she') : 'it', pthem: pet ? (pet.male ? 'him' : 'her') : 'it', ptheir: pet ? (pet.male ? 'his' : 'her') : 'its' };
    const form = rng.pick([0, 1]);
    say(
      'gone',
      pet ? 'pet' : 'item',
      thingVars,
      pet
        ? form === 0
          ? `${clientName.family}’s ${pet.breed}, ${pet.short}, is gone from ${pet.where.replace(/^(in|on) /, '')}.`
          : `${pet.name}, who lives ${pet.where}, is gone; ${pet.male ? 'he' : 'she'} belongs to ${clientName.family}.`
        : form === 0
          ? `${clientName.family}’s ${(item as (typeof K.ITEMS)[number]).name.replace(/^an? /, '')}, kept ${thing.where}, is gone.`
          : `${cap(thing.short)}, which ${clientName.family} keeps ${thing.where}, is gone.`,
    );
    if (mode === 'party') {
      say('party', occasion.noun, { ...who, h0: fmtHour(h0), says: occasion.says, occasion: occasion.noun, guests: listWords(gNames) }, `${clientName.family} had people in at ${fmtHour(h0)} ${occasion.says}: ${gNames.join(', ') || 'nobody'}. Nobody else.`);
    }
    say('means', def.id, { ...smVars, ...thingVars }, tpl(def.office, smVars));
    if (mode === 'told') points.push({ kind: 'place', ref: B, text: `${clientName.family} told the room at ${venue.short}` });
    if (mode === 'spare') points.push({ kind: 'place', ref: X, text: `the spare key hangs at ${xPlace.short}` });
    if (resident) points.push({ kind: 'person', ref: resident, text: `${personOf(resident).short} lodges at the flat` });
    if (windowed) {
      const wl = rng.pick(K.WINDOW_LINES);
      clockId = wl.id;
      say('window', wl.id, { ...hourVars, ...thingVars }, tpl(wl.text, hourVars));
      if (pet) {
        const kp = rng.pick(K.KEEPERS);
        const kv = { Keeper: `Mrs. ${keeperName.family}`, x: xPlace.short, pet: pet.short, client: clientName.family };
        say('keeper', kp.id, { ...thingVars, ...kv, keeper: kv.Keeper }, tpl(kp.intro, kv));
      }
    } else {
      const sc = rng.pick(K.SMALL_CLOCKS);
      clockId = sc.id;
      const cv = { ...hourVars, dog: pet?.species === 'dog' ? 'terrier' : 'dog' };
      say('clock', sc.id, { ...cv, ...thingVars }, tpl(sc.text, cv));
    }
    // Why the client points: the person's motive, or something they did that the office saw.
    const behaviour =
      mode === 'party' && guests.has(pointer)
        ? `${pet ? pet.asks : fill((item as (typeof K.ITEMS)[number]).weigh, pointerN)} at the ${occasion.noun}`
        : mode === 'told' && avail.some((h) => at(pointer, h) === B)
          ? `stood at ${clientName.family}’s elbow at ${venue.short} the whole time`
          : mode === 'spare' && lodges.has(pointer)
            ? `lodges at ${xPlace.short}, where the spare key is kept`
            : mode === 'spare' && avail.some((h) => at(pointer, h) === X)
              ? `was in at ${xPlace.short} this evening, where the spare key is kept`
              : undefined;
    const pks = K.SMALL_POINTERS.filter((x) => x.kind !== 'behaviour' || behaviour);
    const pk = rng.pick(pks);
    pointerKind = pk.kind === 'motive' ? (motiveKind.get(pointer) as string) : pk.kind;
    say(
      'pointer',
      pk.kind,
      { ...who, ...thingVars, P: pointerP.short, pthey: pron(pointerN).they, pthem: pron(pointerN).them, ptheir: pron(pointerN).their, motive: pointerP.motive as string, behaviour: behaviour ?? '' },
      tpl(pk.text, { Client: clientName.family, P: pointerP.short, motive: pointerP.motive as string, behaviour: behaviour ?? '' }),
    );
    for (const p of g) givensFacts.push({ k: 'at', p, h: h0, place: S });
    if (mode === 'party') for (const p of boardPeople) if (!guests.has(p)) givensFacts.push({ k: 'notAt', p, h: h0, place: S });
  }
  const setup: Setup = {
    means: murder ? (md as NonNullable<typeof md>).id : (sm as (typeof K.SMALL_MEANS)[number]).id,
    clock: clockId,
    pointer: pointerKind,
  };

  // --- Confrontations -----------------------------------------------------------------------------------
  const confrontations: Confrontation[] = [];
  for (const lie of lies) {
    if (lie.person === C) {
      // The second lie goes somewhere else watched and plausible, but never where the innocent liar claims.
      const coverL = lies.find((l) => l.kind === 'secret')?.claim;
      const alt = [B, X].find((pl) => pl !== lie.claim && pl !== coverL && lists.some((l) => l.place === pl) && at(C, hc) !== pl && checkable(pl, hc) && plausible(C, pl, hc));
      const second2 = alt
        ? { text: `All right, I wasn’t at ${short_(lie.claim)}. I was at ${short_(alt)}.`, collidesWith: `${personOf(lists.find((l) => l.place === alt)?.watcher as string).short}’s list at ${hc}`, place: alt }
        : undefined;
      if (!murder && tier <= 2) {
        confrontations.push({
          person: C,
          hour: hc,
          response: 'crack',
          text: `${second2 ? `“${second2.text}” It doesn’t hold, and ${pron(cName).they} knows it. ` : ''}“All right. I took it. It’s with ${(holder as (typeof K.HOLDERS)[number]).who}.”`,
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
        text: `“Where I was is my own business. I didn’t ${murder ? 'kill anybody' : 'take anything'}.” (The secret, worse to ${pron(pnamed(lie.person)).them} than the suspicion: ${personOf(lie.person).secret}.)`,
        facts: [],
      });
    } else {
      const secret = personOf(lie.person).secret ?? 'something private';
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

  // 4b: the first hour has a reason too, where it needs one. Nobody is at somebody else's home,
  // or a back room, at seven o'clock for no reason. Drawn last, on a stream of its own, so nothing
  // else about the case moves.
  {
    const r2 = new Rng(mix(seed, tier, CASE_TYPES.indexOf(type), attempt, 0x4b));
    for (const p of [...suspects, ...company]) {
      const row = rows[p] as Record<Hour, PlaceId>;
      const pl = row[h0] as PlaceId;
      const where = placeById.get(pl) as Place;
      const who = personOf(p);
      if (pl === S || who.home === pl || who.works === pl || pl === YH) continue;
      if (PUBLIC.has(where.kind) && pl !== U) continue;
      const len = stint(row, h0);
      const toEnd = h0 + len - 1 >= hL;
      const vars = { p: where.short, h: fmtHour(h0) };
      let pool: string[];
      if (pl === U) pool = uHonestUsed ? u.more : [u.honest];
      else if (where.kind === 'home') pool = (K.REASONS[len <= 1 ? 'errand' : 'visit'] ?? []).filter((t) => !t.includes('{x}'));
      else if (where.kind === 'work' && work && p !== worker) pool = work.visit;
      else pool = K.REASONS[where.kind] ?? [];
      const left = pool.filter((t) => !drawn.has(t) && K.reasonFits(t, len, toEnd));
      if (left.length === 0) continue;
      const t = r2.pick(left);
      drawn.add(t);
      if (pl === U) uHonestUsed = true;
      let why = fill(t, pnamed(p));
      for (const [k, v] of Object.entries(vars)) why = why.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      (reasons[p] as Record<Hour, string>)[h0] = why;
      const cl = accountOf(p).claims[h0];
      if (cl && cl.place === pl && !cl.reason) cl.reason = why;
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
      why: personOf(C).motive as string,
      ...(holder ? { whereNow: { place: B, text: `with ${holder.who}, at ${venue.short}` } } : {}),
      finder,
    },
    means,
    accounts,
    lists,
    finds,
    confrontations,
    givens: {
      text,
      lines,
      facts: givensFacts,
      access: residentAtScene,
      pointer,
      window: [...window],
      ...(company.includes(KP) ? { known: [KP] } : {}),
      ...(points.length ? { points } : {}),
    },
    lies,
    ...(variant ? { variant } : {}),
    client,
    ...(otherList.length ? { others: otherList } : {}),
    setup,
  };
  return c;
}

const cap = (s: string) => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** "Fairbanks, Sweeney and Sirkin". */
function listWords(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? 'nobody') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

export function moves(row: Record<Hour, PlaceId>, hours: Hour[]): number {
  let n = 0;
  for (let i = 1; i < hours.length; i++) if (row[hours[i] as Hour] !== row[hours[i - 1] as Hour]) n++;
  return n;
}
