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
  return text.replace('{they}', p.they).replace('{them}', p.them).replace('{their}', p.their);
}

export function buildCase(seed: number, tier: TierIndex, type: CaseType, attempt: number): BoardCase | null {
  const rng = new Rng(mix(seed, tier, CASE_TYPES.indexOf(type), attempt));
  const murder = type === 'murder';
  const windowed = tier >= 3;
  const fourHours = tier >= 2;
  const hours: Hour[] = murder ? (fourHours ? [7, 8, 9, 10] : [8, 9, 10]) : fourHours ? [8, 9, 10, 11] : [8, 9, 10];
  const h0 = hours[0] as Hour;
  const hL = hours[hours.length - 1] as Hour;

  // The crime hour, the window the office gives, and the hours the means sat at its origin.
  let hc: Hour;
  if (murder) hc = rng.pick(hours.filter((h) => h >= h0 + (windowed ? 2 : 1)));
  // A small case: the party is at the first hour, and the thief leaves and comes back.
  else hc = rng.pick(hours.filter((h) => h >= h0 + 2));
  const window = windowed ? [hc - 1, hc] : [hc];
  const avail = murder ? hours.filter((h) => h < (windowed ? hc - 1 : hc)) : [h0];
  if (avail.length === 0) return null;
  const variant: 'pair' | 'face' | undefined = tier === 5 ? rng.pick(['pair', 'face'] as const) : undefined;

  // --- Places ---------------------------------------------------------------------------------
  const tags = rng.shuffle(ROLES[tier]);
  const bar = rng.pick(K.BARS);
  const rooming = rng.pick(K.ROOMING);
  const u = rng.pick(K.UNWATCHED);
  const names = drawNames(rng, tags.length + 6, `${bar.name} ${rooming.name} ${u.name}`, murder ? tags.length : -1);
  const nm = (i: number) => names[i] as Named;
  const suspectNames = tags.map((_, i) => nm(i));
  const victimName = nm(tags.length);
  const clientName = nm(tags.length + 1);
  const barkeepName = nm(tags.length + 2);
  const landladyName = nm(tags.length + 3);
  const companyName = nm(tags.length + 4);
  const keeperName = nm(tags.length + 5);

  const ci = tags.indexOf('C');
  const cName = nm(ci);
  const places: Place[] = [];
  const all: [Hour, Hour] = [h0, hL];
  const S = 'scene';
  const B = 'bar';
  const O = murder ? 'rooming' : S;
  const R = 'neighbours';
  const U = 'u';
  const H = 'h';
  const petOrItem = type === 'lost-pet' ? rng.pick(K.PETS) : rng.pick(K.ITEMS);
  if (murder) {
    const sc = rng.pick(K.SCENE_HOMES);
    places.push({ id: S, name: `${victimName.family}’s ${sc.tail}`, short: `${victimName.family}’s place`, kind: 'home', open: all, scene: true, street: sc.street });
  } else {
    const sc = rng.pick(K.LOST_SCENES);
    places.push({ id: S, name: `the ${clientName.family} ${sc.tail}`, short: `the ${clientName.family} flat`, kind: 'home', open: all, scene: true, street: sc.street });
  }
  places.push({ id: B, name: bar.name, short: bar.short, kind: bar.kind, open: all, street: bar.street });
  if (murder) places.push({ id: O, name: rooming.name, short: rooming.short, kind: 'home', open: all, street: rooming.street });
  else places.push({ id: R, name: rooming.name, short: rooming.short, kind: 'home', open: all, street: rooming.street });
  if (tier >= 1) places.push({ id: U, name: u.name, short: u.short, kind: u.kind, open: all, street: u.street });
  if (tier >= 4) places.push({ id: H, name: `${cName.family}’s flat on ${rng.pick(['Cannon Street', 'Pitt Street', 'Norfolk Street', 'Suffolk Street'])}`, short: `${cName.family}’s flat`, kind: 'home', open: all, street: 'Norfolk Street' });
  const placeById = new Map(places.map((p) => [p.id, p]));
  const open = (p: PlaceId, h: Hour) => {
    const pl = placeById.get(p);
    return !!pl && h >= pl.open[0] && h <= pl.open[1];
  };

  // --- Rows -----------------------------------------------------------------------------------
  const ids = suspectNames.map((n) => n.family.toLowerCase().replace(/[^a-z]/g, ''));
  const idOf = (t: Tag, k = 0): PersonId => {
    let seen = 0;
    for (let i = 0; i < tags.length; i++) if (tags[i] === t && seen++ === k) return ids[i] as PersonId;
    throw new Error(`no ${t}`);
  };
  const C = idOf('C');
  const V = murder ? victimName.family.toLowerCase().replace(/[^a-z]/g, '') : type === 'lost-pet' ? 'pet' : 'item';
  const W = companyName.family.toLowerCase().replace(/[^a-z]/g, '');
  const KP = keeperName.family.toLowerCase().replace(/[^a-z]/g, '');
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
      } else out[h] = open(prev, h) ? prev : fallback;
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
      a.set(pick(avail), O);
      if (rng.chance(0.5) && tier < 4) {
        lodges.add(C);
        base = O;
      }
      if (tier >= 4) base = H;
    } else if (rng.chance(0.4)) {
      residentAtScene.push(C);
      base = B;
    } else {
      a.set(h0, S);
      guests.add(C);
      base = tier >= 4 ? H : pick([B, R]);
    }
    a.set(hc, S);
    if (hc < hL) a.set(hc + 1, murder ? (tier >= 4 ? H : B) : B);
    // Between the origin and the crime, somewhere they can be seen.
    for (const h of hours) if (h > h0 && h < hc && !a.has(h)) a.set(h, murder ? pick([O, B]) : tier >= 4 ? H : pick([B, R]));
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
      if (windowed) r[hc - 1] = R;
      rows[V] = r;
    }
  }

  // Hard-boiled spreads the innocents so each falls one way, by a different source:
  // face — the face alone at the bar, one rival on the origin's list (or with the neighbour);
  // pair — one rival with a company witness at the unwatched place, one on the origin's list.
  const hbAt = (t: Tag, k: number): PlaceId | undefined => {
    if (tier !== 5) return undefined;
    if (t === 'R' && k === 0) return variant === 'face' ? B : murder ? U : R;
    if (t === 'R' && k === 1) return variant === 'pair' && !murder ? U : murder ? O : R;
    if (t === 'N') return murder ? O : R;
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
  for (const { t, id, k } of others) {
    const a = new Map<Hour, PlaceId>();
    let base: PlaceId = B;
    if (!murder && t !== 'N') {
      a.set(h0, S);
      guests.add(id);
    }
    if (t === 'I') {
      a.set(hc, B);
      if (murder && rng.chance(0.5)) {
        lodges.add(id);
        base = O;
      } else base = murder ? pick([B, O]) : pick([B, R]);
    } else if (t === 'R') {
      if (murder) {
        a.set(pick(avail), O);
        if (rng.chance(0.6)) {
          lodges.add(id);
          base = O;
        }
      } else base = pick([B, R]);
      a.set(hc, hbAt(t, k) ?? B);
    } else if (t === 'N') {
      base = murder ? pick([U, B].filter((p) => placeById.has(p))) : pick([U, R].filter((p) => placeById.has(p)));
      if (tier === 1) {
        a.set(hc, U);
        base = U;
      } else if (tier === 4) {
        // The side remark's speaker: walked over to the bar at the crime hour.
        a.set(hc - 1, murder ? O : R);
        a.set(hc, B);
      } else a.set(hc, hbAt(t, k) ?? B);
    } else if (t === 'L') {
      if (murder) {
        a.set(pick(avail), O);
        if (rng.chance(0.5)) {
          lodges.add(id);
          base = O;
        }
      } else base = pick([B, R]);
      if (variant === 'pair') a.set(hc, B);
      else {
        a.set(hc, U);
        if (windowed) a.set(hc - 1, U);
      }
    }
    rows[id] = evening(a, base, B);
  }

  // Company-only witnesses: a regular at the bar with the rival (Coddled's second route), and at
  // Soft-boiled and up a neighbour who kept the pet for an hour.
  const company: PersonId[] = [];
  if (tier === 1) {
    company.push(W);
    rows[W] = Object.fromEntries(hours.map((h) => [h, B]));
  }
  if (variant === 'pair') {
    company.push(W);
    rows[W] = Object.fromEntries(hours.map((h) => [h, U]));
  }
  if (!murder && windowed) {
    company.push(KP);
    rows[KP] = Object.fromEntries(hours.map((h) => [h, R]));
  }

  // --- Checks on the truth before anything is said about it --------------------------------------
  const suspects = ids;
  const boardPeople = [...suspects, ...(murder ? [V] : []), ...company];
  const at = (p: PersonId, h: Hour) => rows[p]?.[h];
  const withAt = (place: PlaceId, h: Hour, except: PersonId) => boardPeople.filter((x) => x !== except && at(x, h) === place);
  for (const p of suspects) {
    for (const h of hours) {
      const pl = at(p, h) as PlaceId;
      if (!open(pl, h)) return null;
      if (pl === S && p !== C && !(guests.has(p) && h === h0)) return null;
    }
    if (p !== C && moves(rows[p] as Record<Hour, PlaceId>, hours) > 2) return null;
  }
  if (moves(rows[C] as Record<Hour, PlaceId>, hours) > 3) return null;
  // Rule 1: the board's places are the places people were. None sits empty all night.
  for (const pl of places) if (!boardPeople.some((p) => hours.some((h) => at(p, h) === pl.id))) return null;
  if (withAt(S, hc, C).some((x) => x !== V)) return null;
  const N = tags.includes('N') ? idOf('N') : undefined;
  const L = tags.includes('L') ? idOf('L') : undefined;
  if (N && murder && avail.some((h) => at(N, h) === O)) return null;
  if (N && !murder && guests.has(N)) return null;
  if (tier === 1 && N && withAt(U, hc, N).length > 0) return null;
  if (L && variant !== 'pair' && withAt(U, hc, L).length > 0) return null;
  if (tier >= 4 && withAt(H, hc, C).length > 0) return null;
  // Rule 12: at least one innocent at the origin before the crime.
  if (murder && tier >= 1 && !suspects.some((p) => p !== C && avail.some((h) => at(p, h) === O))) return null;
  // Hard-boiled face: somebody innocent at the bar at the crime hour to be the face.
  const faceOf = variant === 'face' ? suspects.find((p) => p !== C && at(p, hc) === B) : undefined;
  if (variant === 'face' && (!faceOf || withAt(B, hc, faceOf).length > 0)) return null;

  // --- Reasons for moves ------------------------------------------------------------------------
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
  function reasonFor(p: PersonId, from: PlaceId, to: PlaceId, h: Hour): string {
    const pl = placeById.get(to) as Place;
    if (p === V && murder) return to === S ? 'went home: he had company coming' : `his usual at ${pl.short}`;
    if (to === S) return p === C ? `went round to ${murder ? victimName.family + '’s' : 'the flat'}` : 'the card party';
    if (from === S) return p === C ? `on to ${pl.short}` : `left the party and went on to ${pl.short}`;
    const fromKind = placeById.get(from)?.kind;
    if (to === B) return fromKind === 'work' ? `closed up at ${fmtHour(h)} and went for a drink` : pick([`went over to ${pl.short} for a drink`, `met a friend at ${pl.short}`, `wanted company, so went to ${pl.short}`]);
    if (to === O || to === R) return lodges.has(p) || from === S ? 'went home' : `went up to ${pl.short} to see a lodger about money`;
    if (to === U) return `went to ${pl.short}`;
    if (to === H) return 'went home';
    return `went to ${pl.short}`;
  }

  // --- People -----------------------------------------------------------------------------------
  const people: Person[] = [];
  const motives = rng.shuffle(murder ? K.MOTIVES : K.SMALL_MOTIVES);
  const jobs = rng.shuffle(K.JOBS);
  const looks = rng.shuffle(K.LOOKS);
  tags.forEach((t, i) => {
    const id = ids[i] as PersonId;
    const n = nm(i);
    const streets = ['Pitt Street', 'Cannon Street', 'Attorney Street', 'Ridge Street', 'Clinton Street', 'Essex Street'];
    const home = lodges.has(id) ? `lodges at ${rooming.short}` : residentAtScene.includes(id) ? `lodges with ${clientName.given} ${clientName.family}` : id === C && tier >= 4 ? `lives at ${(placeById.get(H) as Place).short}` : `lives on ${streets[i % streets.length]}`;
    const last = at(id, hL) as PlaceId;
    people.push({
      id,
      name: `${n.given} ${n.family}`,
      short: n.family,
      role: 'suspect',
      description: [jobs[i] as string, home].filter(Boolean).join('; '),
      look: looks[i] as string,
      foundAt: last === S ? (tier >= 4 && murder ? H : B) : last,
      motive: fill(motives[i % motives.length] as string, n).replace('{victim}', victimName.family),
      ...(t === 'L' ? { secret: fill(variant === 'pair' ? `a card game in the back room at ${bar.short}, sworn off at Easter` : u.secret, n) } : {}),
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
  people.push({ id: barkeep, name: `${barkeepName.given} ${barkeepName.family}`, short: barkeepName.family, role: 'watcher', description: `${bar.job} at ${bar.short}`, foundAt: B });
  const landlady = 'landlady';
  const originWatched = murder && tier >= 1;
  if (originWatched) {
    people.push({ id: landlady, name: `Mrs. ${landladyName.family}`, short: `Mrs. ${landladyName.family}`, role: 'watcher', description: `the landlady at ${rooming.short}, on a chair at the foot of her stairs`, foundAt: O });
  }
  if (company.includes(W)) {
    const atU = variant === 'pair';
    people.push({ id: W, name: `${companyName.given} ${companyName.family}`, short: companyName.family, role: 'company', description: atU ? `keeps ${u.short}` : `a regular at ${bar.short}`, foundAt: atU ? U : B });
  }
  if (company.includes(KP)) people.push({ id: KP, name: `Mrs. ${keeperName.family}`, short: `Mrs. ${keeperName.family}`, role: 'company', description: `a neighbour at ${rooming.short}`, foundAt: R });

  // --- Lies -------------------------------------------------------------------------------------
  const lies: Lie[] = [];
  const claimOverride = new Map<string, Claim>();
  const cClaim: PlaceId = variant === 'pair' || tier === 4 ? H : B;
  lies.push({ person: C, hour: hc, kind: variant === 'pair' ? 'pair' : 'culprit', truth: S, claim: cClaim });
  claimOverride.set(`${C}@${hc}`, {
    place: cClaim,
    company: variant === 'pair' && L ? [L] : [],
    reason: variant === 'pair' && L ? `at home, the two of us, playing gin` : cClaim === H ? 'stayed in, alone, with the wireless' : `at ${bar.short}; ask anybody`,
  });
  if (L && tier >= 2) {
    if (variant === 'pair') {
      lies.push({ person: L, hour: hc, kind: 'pair', truth: at(L, hc) as PlaceId, claim: H });
      claimOverride.set(`${L}@${hc}`, { place: H, company: [C], reason: `at ${cName.family}’s, the two of us, playing gin` });
    } else {
      // The cover story is somewhere watched, so it collides with a list.
      const cover = murder ? pick([B, O]) : company.includes(KP) ? pick([B, R]) : B;
      lies.push({ person: L, hour: hc, kind: 'secret', truth: U, claim: cover });
      claimOverride.set(`${L}@${hc}`, { place: cover, company: [], reason: cover === O ? 'home in my room' : `at ${bar.short}` });
    }
  }

  // --- Accounts -----------------------------------------------------------------------------------
  const accounts: Account[] = [];
  const truthClaim = (p: PersonId, h: Hour): Claim => {
    const place = at(p, h) as PlaceId;
    const r = reasons[p]?.[h];
    return { place, company: withAt(place, h, p), ...(r ? { reason: r } : {}) };
  };
  for (const p of [...suspects, ...company]) {
    const claims: Record<Hour, Claim> = {};
    for (const h of hours) claims[h] = claimOverride.get(`${p}@${h}`) ?? truthClaim(p, h);
    accounts.push({ person: p, claims, remarks: [] });
  }
  const accountOf = (p: PersonId) => accounts.find((a) => a.person === p) as Account;
  // Medium: the side remark. The outsider walked over at the crime hour and passed the culprit.
  if (tier === 4 && N) {
    const sceneStreet = (placeById.get(S) as Place).street;
    accountOf(N).remarks.push({
      text: `Walking over to ${bar.short} at ${fmtHour(hc)} I passed ${cName.family} on ${sceneStreet}, going fast, no hat.`,
      facts: [{ k: 'notAt', p: C, h: hc, place: H }],
      side: true,
    });
  }
  // The pet's keeper: the last sighting away from the scene.
  if (company.includes(KP)) {
    accountOf(KP).remarks.push({
      text: `I had ${petOrItem.short} in my kitchen for his supper at ${fmtHour(hc - 1)}, and put him back in the flat just before ${fmtHour(hc)}.`,
      facts: [{ k: 'at', p: V, h: hc - 1, place: R }],
      side: false,
    });
  }

  // --- Watchers' lists ------------------------------------------------------------------------------
  const chloral = rng.chance(0.6);
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
  const holder = rng.pick(K.HOLDERS);
  const barRemarks: Remark[] = [];
  if (!murder) {
    barRemarks.push({
      text: `${fmtHour(hc + 1)[0]?.toUpperCase()}${fmtHour(hc + 1).slice(1)}: ${cName.family} came in and went straight to ${holder.who}, and something went across the table.`,
      facts: [],
      side: false,
      gives: { whereNow: true, why: true },
    });
  }
  lists.push({ watcher: barkeep, place: B, entries: entriesAt(B), remarks: barRemarks });
  if (originWatched) {
    lists.push({
      watcher: landlady,
      place: O,
      entries: entriesAt(O),
      remarks: [{ text: `The ${chloral ? 'chloral on my hall shelf' : 'revolver in the hall-stand drawer'} was there at ${fmtHour(h0)}. I didn’t look again.`, facts: [], side: false }],
    });
  }

  // --- The means, the finds, the office -------------------------------------------------------------

  const means = murder
    ? {
        kind: chloral ? ('chloral' as const) : ('gun' as const),
        name: chloral ? 'chloral' : 'a revolver',
        origin: O,
        available: avail,
        delay: chloral ? ([20, 60] as [number, number]) : ([0, 0] as [number, number]),
        originText: chloral
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
      text: chloral
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
  const hourText = (h: Hour) => fmtHour(h);
  if (murder) {
    const v = people.find((p) => p.id === V) as Person;
    text.push(`${clientName.family}, the client, is ${v.name}’s ${clientName.female ? 'sister-in-law' : 'brother-in-law'}.`);
    text.push(`${v.short}, ${v.description}, was found dead in ${(placeById.get(S) as Place).name} at half past ${hourText(hL + 1)}, by ${finderName}. The police called it ${chloral ? 'a fall' : 'a robbery gone wrong'}.`);
    if (chloral) text.push(windowed ? `The coroner says chloral in a drink, drunk between ${hourText(hc - 1)} and ${hourText(hc + 1)}; it takes twenty minutes to an hour.` : `The coroner says chloral in a drink, drunk at about ${hourText(hc)}; it takes twenty minutes to an hour.`);
    else text.push(windowed ? `Shot, between ${hourText(hc - 1)} and ${hourText(hc + 1)}. Nobody heard it over the radios.` : `Shot at ${hourText(hc)}: the man downstairs heard it and looked at his clock.`);
  } else {
    const g = [...guests];
    const gNames = g.map((p) => (people.find((x) => x.id === p) as Person).short);
    text.push(`${clientName.family}’s ${type === 'lost-pet' ? 'pet' : 'treasure'}, ${petOrItem.name}, who lives ${petOrItem.where}, is gone.`.replace('who lives', type === 'lost-pet' ? 'who lives' : 'kept'));
    text.push(`${clientName.female ? 'She' : 'He'} had people in at ${hourText(h0)}: ${gNames.join(', ') || 'nobody'}. Nobody else.`);
    if (residentAtScene.length > 0) text.push(`${(people.find((x) => x.id === residentAtScene[0]) as Person).short} lodges there, and has lost ${pron(cName).their} key, so the door was left on the latch.`);
    else text.push('The door was left on the latch for the evening.');
    text.push(
      windowed
        ? `It went some time between ${hourText(hc - 1)} and ${hourText(hc + 1)}. Mrs. ${keeperName.family}, a neighbour at ${rooming.short}, looks in on ${petOrItem.short} of an evening.`
        : `The dog next door went off at ${hourText(hc)}, the way it does when somebody’s on the stairs.`,
    );
    for (const p of g) givensFacts.push({ k: 'at', p, h: h0, place: S });
    for (const p of boardPeople) if (!guests.has(p)) givensFacts.push({ k: 'notAt', p, h: h0, place: S });
  }
  text.push(`${clientName.family} points at ${pointerP.short}: ${pointerP.motive}.`);

  // --- Confrontations -----------------------------------------------------------------------------------
  const confrontations: Confrontation[] = [];
  for (const lie of lies) {
    if (lie.person === C) {
      const alt = [B, murder ? O : R].find((pl) => pl !== lie.claim && lists.some((l) => l.place === pl) && at(C, hc) !== pl);
      const second = alt ? { text: `All right, I wasn’t at ${(placeById.get(lie.claim) as Place).short}. I was at ${(placeById.get(alt) as Place).short}.`, collidesWith: `${(people.find((x) => x.id === lists.find((l) => l.place === alt)?.watcher) as Person).short}’s list at ${hc}` } : undefined;
      if (!murder && tier <= 2) {
        confrontations.push({
          person: C,
          hour: hc,
          response: 'crack',
          text: `${second ? `“${second.text}” It doesn’t hold, and ${pron(cName).they} knows it. ` : ''}“All right. I took it. It’s with ${holder.who}.”`,
          facts: [],
          gives: { whereNow: true, why: true },
          ...(second ? { secondLie: second } : {}),
        });
      } else {
        confrontations.push({
          person: C,
          hour: hc,
          response: second ? 'second-lie' : 'refuse',
          text: second ? `“${second.text}”` : '“I’ve told you where I was.”',
          facts: [],
          ...(second ? { secondLie: second } : {}),
        });
      }
    } else {
      const secret = (people.find((x) => x.id === lie.person) as Person).secret ?? 'something private';
      confrontations.push({
        person: lie.person,
        hour: hc,
        response: 'admit',
        text: `“All right. I wasn’t at ${(placeById.get(lie.claim) as Place).short}. I was at ${(placeById.get(lie.truth) as Place).short}, and I’d thank you not to spread it.” (The secret: ${secret}.)`,
        facts: [{ k: 'at', p: lie.person, h: hc, place: lie.truth }],
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
      ...(murder ? {} : { whereNow: { place: B, text: `with ${holder.who}, at ${bar.short}` } }),
      finder,
    },
    means,
    accounts,
    lists,
    finds,
    confrontations,
    givens: { text, facts: givensFacts, access: residentAtScene, pointer, ...(company.includes(KP) ? { known: [KP] } : {}) },
    lies,
    ...(variant ? { variant } : {}),
    client,
  };
  return c;
}

export function moves(row: Record<Hour, PlaceId>, hours: Hour[]): number {
  let n = 0;
  for (let i = 1; i < hours.length; i++) if (row[hours[i] as Hour] !== row[hours[i - 1] as Hour]) n++;
  return n;
}
