/**
 * M9 — the evening, built for a logic game.
 *
 * The pre-M9 builder (`../schedule.ts`) made every innocent doubly watched at
 * the crime's half hour, so that one sentence cleared each of them. This one
 * does the opposite. At the crime's half hour:
 *
 * - at most `directClears` innocents stand where somebody who knows them by
 *   name can say so (a watcher, for a regular of the place);
 * - every other innocent stands where nobody who could name them sees them.
 *   What puts them there is pieces: their own account, corroborated by
 *   somebody who saw them in the same room the half hour before or after; a
 *   stranger's description; an anchor; travel;
 * - at Hard-boiled two of them stand in two different rooms, each seen only by
 *   a stranger, and each fitting the other's description. Neither description
 *   clears anybody. Together they clear both: that is the hypothesis test.
 *
 * Everybody moves on the three blocks of `travel.ts`: nobody crosses the
 * neighbourhood in a half hour.
 *
 * The lies (spec §1): the culprit lies about the crime's block and about
 * fetching the means; an innocent with a secret lies about the secret's half
 * hours; an alibi companion lies about being with somebody. Nobody lies about
 * anybody else. Each false span of an account claims a room different from the
 * spans either side of it, so the account's spans split exactly where the lies
 * start and stop.
 */

import { TICKS, clock, type CaseType, type Id, type LieCover, type Person, type Secret, type Tick } from '../types.js';
import type { Rng } from '../rng.js';
import type { Cast } from '../cast.js';
import type { Setting } from '../setting.js';
import type { SecretTemplate } from '../data/secrets.js';
import type { ScheduleBuild } from '../schedule.js';
import { describeSecret } from '../schedule.js';
import type { DeductionDials } from '../shape.js';
import { reachable, type Blocks } from './travel.js';
import {
  canName,
  describeAs,
  rollAcquaintance,
  tieSecret,
  addSightings,
  type AcqGraph,
} from './acquaint.js';

export interface LieDraft {
  personId: Id;
  ticks: Tick[];
  claimed: Id;
  with?: Id;
  cover: LieCover;
}

export interface Schedule9Build extends ScheduleBuild {
  acq: AcqGraph;
  lieDrafts: LieDraft[];
  /** The one innocent a watcher names at the crime's half hour, if any. */
  directId: Id | null;
  /** Hard-boiled: the two whose descriptions only clear them together. */
  pair: [Id, Id] | null;
  /** Their shared description's grain. */
  pairGrain: 'fine' | 'age' | 'coarse' | null;
}

export interface Schedule9Context {
  rng: Rng;
  setting: Setting;
  cast: Cast;
  murderTick: Tick;
  caseType: CaseType;
  tropeId: Id;
  blocks: Blocks;
  dials: DeductionDials;
  /** Alibi companions over what the tier deals. */
  extraLies: number;
  reject?: (reason: string) => void;
}

function tickRange(ticks: Tick[]): string {
  const sorted = ticks.slice().sort((a, b) => a - b);
  const first = sorted[0] as Tick;
  const last = sorted[sorted.length - 1] as Tick;
  return first === last ? clock(first) : `${clock(first)} to ${clock(last)}`;
}

export function buildSchedules9(ctx: Schedule9Context): Schedule9Build | null {
  const { rng, setting, cast, blocks, dials } = ctx;
  const M = ctx.murderTick;
  const L = setting.murderPlaceId;
  const fail = (reason: string): null => {
    ctx.reject?.(`m9 schedule: ${reason}`);
    return null;
  };
  const walk = (a: Id | null | undefined, b: Id | null | undefined): boolean => reachable(blocks, a, b);
  const gap = (a: Id, b: Id): number => Math.abs((blocks[a] ?? 0) - (blocks[b] ?? 0));

  const placeIds = setting.places.map((p) => p.id);
  const nonScene = placeIds.filter((p) => p !== L);
  const templateOf = (id: Id) => setting.templates[id];
  const watcherAt = (place: Id): Id | undefined => cast.watcherOf[place];
  const isRobbery = ctx.caseType === 'robbery';
  const isMissing = ctx.caseType === 'missing';
  const plainTier = dials.directClears >= cast.innocents.length;

  const blockStart = Math.max(1, M - rng.int(3));

  /* --- fixtures ----------------------------------------------------------- */
  const truth: Record<Id, (Id | null)[]> = {};
  const excursionUsed = new Set<Id>();
  for (const f of cast.fixtures) {
    if (f.id === cast.beatCop?.id) {
      const line: (Id | null)[] = new Array(TICKS).fill(null);
      const route = setting.beatCopRoute;
      let i = 0;
      for (let t = setting.beatCopPhase; t < TICKS; t += 3) {
        line[t] = route[i % route.length] as Id;
        i++;
      }
      truth[f.id] = line;
    } else {
      truth[f.id] = new Array(TICKS).fill(f.foundAt as Id);
    }
  }

  /* --- fixed cells --------------------------------------------------------- */
  const fixed: Record<Id, Record<number, Id>> = {};
  for (const p of cast.suspects) fixed[p.id] = {};
  const victimFixed: Record<number, Id> = {};
  const victimSeenPlace = setting.low.placeId as Id;
  const victimSeenAt = M - 1;
  victimFixed[victimSeenAt] = victimSeenPlace;
  victimFixed[M] = isRobbery ? victimSeenPlace : L;
  if (!isRobbery && !walk(victimSeenPlace, L)) return fail('the victim cannot get from the last sighting to the scene');

  let whereabouts: Id | undefined;
  if (isMissing && M + 1 <= TICKS - 1) {
    const quiet = nonScene.filter((id) => watcherAt(id) === undefined && walk(L, id));
    const pool = quiet.length > 0 ? quiet : nonScene.filter((id) => walk(L, id));
    if (pool.length === 0) return fail('nowhere to go missing to');
    whereabouts = rng.pick(pool);
    for (let t = M + 1; t < TICKS; t++) victimFixed[t] = whereabouts;
  }

  const killer = cast.killer;
  const killerFixed = fixed[killer.id] as Record<number, Id>;
  for (let t = blockStart; t <= M; t++) killerFixed[t] = L;
  if (M + 1 <= TICKS - 1) {
    const after = nonScene.filter((p) => walk(L, p));
    killerFixed[M + 1] =
      ctx.tropeId === 'taken' && whereabouts !== undefined ? whereabouts : rng.pick(after.length > 0 ? after : nonScene);
  }

  /* --- secrets -------------------------------------------------------------- */
  const secrets: Record<Id, Secret> = {};
  const secretCells: Record<Id, Tick[]> = {};
  const secretBlocks: Record<Id, Tick[][]> = {};

  const placesHosting = (type: string): Id[] =>
    placeIds.filter((id) => id !== L && (templateOf(id)?.secretsHosted.includes(type) ?? false));

  const window = (len: number, coversM: boolean, min: Tick, max: Tick): Tick[] | null => {
    const starts: Tick[] = [];
    for (let s = min; s + len - 1 <= max; s++) {
      const run: Tick[] = [];
      for (let k = 0; k < len; k++) run.push(s + k);
      if (coversM !== run.includes(M)) continue;
      starts.push(s);
    }
    if (starts.length === 0) return null;
    const s = rng.pick(starts);
    return Array.from({ length: len }, (_, k) => s + k);
  };

  const assign = (person: Person, template: SecretTemplate, isLiar: boolean): boolean => {
    if (template.type === 'forged-identity') {
      secrets[person.id] = { type: template.type, label: template.label, description: '', cells: [] };
      secretCells[person.id] = [];
      secretBlocks[person.id] = [];
      return true;
    }
    const pool = placesHosting(template.type);
    if (pool.length === 0) return false;
    const place = rng.pick(pool);
    const len = rng.range(template.minTicks, template.maxTicks);
    const maxTick = template.partner === 'victim' ? M - 2 : TICKS - 1;
    if (maxTick < 0) return false;
    const ticks = window(len, isLiar, 0, maxTick);
    if (!ticks) return false;
    const secret: Secret = {
      type: template.type,
      label: template.label,
      description: '',
      cells: ticks.map((t) => ({ tick: t, place })),
    };
    if (template.partner === 'victim') {
      secret.partnerId = cast.victim.id;
      for (const t of ticks) {
        if (victimFixed[t] !== undefined && victimFixed[t] !== place) return false;
        victimFixed[t] = place;
      }
    }
    secrets[person.id] = secret;
    secretCells[person.id] = ticks;
    secretBlocks[person.id] = [ticks.slice()];
    const mine = fixed[person.id] as Record<number, Id>;
    for (const t of ticks) mine[t] = place;
    return true;
  };

  const liars = cast.innocents.filter((p) => cast.mLiarIds.includes(p.id));
  for (const p of liars) {
    if (!assign(p, cast.innocentSecrets[p.id] as SecretTemplate, true)) {
      return fail(`no room for ${cast.innocentSecrets[p.id]?.type} on the crime's half hour`);
    }
  }
  const handled = new Set<Id>(liars.map((p) => p.id));
  const affairs: [Person, Person][] = [];
  for (const p of cast.innocents) {
    if (handled.has(p.id)) continue;
    const template = cast.innocentSecrets[p.id];
    if (!template) continue;
    if (template.type === 'affair') {
      const partner = cast.innocents.find(
        (o) => o.id !== p.id && !handled.has(o.id) && cast.innocentSecrets[o.id]?.type === 'affair',
      );
      if (!partner) return fail('an affair with nobody to have it with');
      if (!assign(p, template, false)) return fail('no free window for the affair');
      const mine = secrets[p.id] as Secret;
      const cells = mine.cells.map((c) => ({ tick: c.tick, place: c.place }));
      secrets[partner.id] = { type: template.type, label: template.label, description: '', cells, partnerId: p.id };
      mine.partnerId = partner.id;
      secretCells[partner.id] = cells.map((c) => c.tick);
      secretBlocks[partner.id] = [cells.map((c) => c.tick)];
      const theirs = fixed[partner.id] as Record<number, Id>;
      for (const c of cells) theirs[c.tick] = c.place;
      handled.add(p.id);
      handled.add(partner.id);
      affairs.push([p, partner]);
      continue;
    }
    if (!assign(p, template, false)) return fail(`no free window for the ${template.type} secret`);
    handled.add(p.id);
  }

  const murderCells: Tick[] = [];
  for (let t = blockStart; t <= M; t++) murderCells.push(t);
  const murderSecret: Secret = {
    type: 'murder',
    label: 'Murder',
    description: '',
    cells: murderCells.map((t) => ({ tick: t, place: L })),
    partnerId: cast.victim.id,
  };
  secrets[killer.id] = murderSecret;
  secretCells[killer.id] = murderCells.slice();

  let coverSecret: Secret | undefined;
  let coverTicks: Tick[] = [];
  if (cast.killerCoverSecret) {
    const t = cast.killerCoverSecret;
    if (t.type === 'forged-identity') {
      coverSecret = { type: t.type, label: t.label, description: '', cells: [] };
    } else {
      const pool = placesHosting(t.type);
      const len = rng.range(t.minTicks, t.maxTicks);
      const ticks = pool.length > 0 && blockStart - 2 >= 0 ? window(len, false, 0, blockStart - 2) : null;
      if (ticks && ticks.every((tk) => killerFixed[tk] === undefined)) {
        const place = rng.pick(pool);
        coverSecret = { type: t.type, label: t.label, description: '', cells: ticks.map((tk) => ({ tick: tk, place })) };
        for (const tk of ticks) killerFixed[tk] = place;
        (secretCells[killer.id] as Tick[]).push(...ticks);
        coverTicks = ticks.slice();
      }
    }
  }

  /* --- the means: fetched before the block, from its own room --------------- */
  const accessPlaceId = setting.accessPlaceId;
  let killerAccessTick = -1;
  for (const t of rng.shuffle(Array.from({ length: blockStart }, (_, i) => i))) {
    if (killerFixed[t] !== undefined) continue;
    if (gap(accessPlaceId, L) > blockStart - t) continue;
    if (killerFixed[t - 1] !== undefined && !walk(killerFixed[t - 1], accessPlaceId)) continue;
    if (killerFixed[t + 1] !== undefined && !walk(accessPlaceId, killerFixed[t + 1])) continue;
    // Not flush against the block, so the lie about it is its own span.
    if (t === blockStart - 1 && blockStart > 1 && rng.chance(0.5)) continue;
    killerFixed[t] = accessPlaceId;
    killerAccessTick = t;
    break;
  }
  if (killerAccessTick < 0) return fail('the culprit has no half hour to fetch the means in');

  let innocentAccess: { personId: Id; tick: Tick } | null = null;
  for (const p of rng.shuffle(cast.innocents)) {
    for (const t of rng.shuffle(Array.from({ length: M }, (_, i) => i))) {
      if ((fixed[p.id] as Record<number, Id>)[t] !== undefined) continue;
      if (t === killerAccessTick) continue;
      (fixed[p.id] as Record<number, Id>)[t] = accessPlaceId;
      innocentAccess = { personId: p.id, tick: t };
      break;
    }
    if (innocentAccess) break;
  }

  /* --- who knows whom, and the crime's half hour --------------------------- */
  const liarIds = new Set(liars.map((p) => p.id));
  const free = cast.innocents.filter((p) => !liarIds.has(p.id));
  const atM: Record<Id, Id> = {};
  atM[killer.id] = L;
  for (const p of liars) atM[p.id] = (fixed[p.id] as Record<number, Id>)[M] as Id;

  // The direct one: a watcher names them. A liar whose secret room is watched
  // first, because their lie then has its first contradiction for free.
  let directId: Id | null = null;
  let directPlace: Id | null = null;
  if (!plainTier && dials.directClears > 0) {
    const shuffledLiars = rng.shuffle(liars);
    const watchedLiar =
      shuffledLiars.find((p) => watcherAt(atM[p.id] as Id) !== undefined) ?? shuffledLiars[0];
    if (watchedLiar) {
      directId = watchedLiar.id;
      directPlace = atM[watchedLiar.id] as Id;
    } else if (free.length > 0) {
      const watched = rng.shuffle(nonScene.filter((p) => watcherAt(p) !== undefined));
      const d = rng.pick(free);
      if (watched.length > 0) {
        directId = d.id;
        directPlace = watched[0] as Id;
        atM[d.id] = directPlace;
      }
    }
  }

  const acq = rollAcquaintance({
    rng,
    cast,
    setting,
    dials,
    ...(directId && directPlace ? { forceRegular: { personId: directId, placeId: directPlace } } : {}),
  });
  for (const [a, b] of affairs) tieSecret(acq, a, b);

  const fixtureAtM = (place: Id): Id[] =>
    cast.fixtures.filter((f) => (truth[f.id] as (Id | null)[])[M] === place).map((f) => f.id);
  const lyingAt = (id: Id, t: Tick): boolean => (secretCells[id] ?? []).includes(t);
  const makeStranger = (from: Id, to: Id): boolean => {
    const e = acq.edges.get(`${from}>${to}`);
    if (!e) return true;
    if (e.basis === 'tie' || e.basis === 'secret') return e.strength === 'stranger';
    const d = describeAs(cast.people.find((p) => p.id === to) as Person, cast.suspects, 'age');
    acq.edges.set(`${from}>${to}`, { ...e, strength: 'stranger', basis: 'none', ref: d.text });
    for (const [place, list] of Object.entries(acq.regulars)) {
      if (cast.watcherOf[place] !== from) continue;
      acq.regulars[place] = list.filter((id) => id !== to);
    }
    return true;
  };

  /**
   * Would anybody standing at `place` at the crime's half hour, and telling
   * the truth about it, name `id`? Or would `id` name any of them?
   */
  const exposed = (id: Id, place: Id): boolean => {
    const here = [
      ...fixtureAtM(place),
      ...Object.entries(atM)
        .filter(([pid, pl]) => pl === place && pid !== id)
        .map(([pid]) => pid),
    ];
    for (const other of here) {
      if (!lyingAt(other, M) && canName(acq, other, id)) return true;
      const otherPerson = cast.people.find((p) => p.id === other);
      if (otherPerson?.kind === 'suspect' && otherPerson.id !== killer.id && !lyingAt(id, M) && canName(acq, id, other)) {
        if (other !== directId) return true;
      }
    }
    return false;
  };

  // A liar named by nobody posted: somebody who knows them stands in the room.
  if (directId && directPlace && liarIds.has(directId) && watcherAt(directPlace) === undefined) {
    const witness = rng.shuffle(free).find((q) => atM[q.id] === undefined && canName(acq, q.id, directId as Id));
    if (!witness) return fail('nobody to see the liar where the secret was');
    atM[witness.id] = directPlace;
  }
  // A liar who is not the direct one is not a regular where the secret was.
  for (const p of liars) {
    if (p.id === directId) continue;
    const w = watcherAt(atM[p.id] as Id);
    if (w && canName(acq, w, p.id)) makeStranger(w, p.id);
  }

  // Hard-boiled: two innocents who fit one description, in two rooms, seen
  // only by strangers at the half hour.
  let pair: [Id, Id] | null = null;
  let pairGrain: 'fine' | 'age' | 'coarse' | null = null;
  const pairCells = new Set<string>();
  if (dials.hypothesis) {
    const candidates = cast.innocents.filter((p) => p.id !== directId);
    const watchedFree = nonScene.filter((p) => watcherAt(p) !== undefined && p !== directPlace);
    search: for (const a of rng.shuffle(candidates)) {
      for (const b of rng.shuffle(candidates)) {
        if (a.id >= b.id) continue;
        for (const grain of ['age', 'coarse', 'fine'] as const) {
          const d = describeAs(a, cast.suspects, grain);
          const m = new Set(d.matches);
          if (m.size !== 2 || !m.has(a.id) || !m.has(b.id)) continue;
          const pa = liarIds.has(a.id) ? (atM[a.id] as Id) : null;
          const pb = liarIds.has(b.id) ? (atM[b.id] as Id) : null;
          const optionsA = pa ? [pa] : rng.shuffle(watchedFree);
          for (const P of optionsA) {
            if (!watcherAt(P)) continue;
            const optionsB = pb ? [pb] : rng.shuffle(watchedFree.filter((q) => q !== P));
            for (const Q of optionsB) {
              if (Q === P || !watcherAt(Q)) continue;
              pair = [a.id, b.id];
              pairGrain = grain;
              atM[a.id] = P;
              atM[b.id] = Q;
              for (const w of [watcherAt(P) as Id, watcherAt(Q) as Id]) {
                makeStranger(w, a.id);
                makeStranger(w, b.id);
              }
              pairCells.add(`${a.id}@${M}`);
              pairCells.add(`${b.id}@${M}`);
              break search;
            }
          }
        }
      }
    }
    if (!pair) return fail('no two innocents fit one description in two watched rooms');
  }

  if (directId && directPlace && !liarIds.has(directId)) atM[directId] = directPlace;

  // Everybody else: somewhere nobody who could name them stands, and a place
  // they were in the half hour before or after too, so their own account has
  // a span that somebody else can corroborate.
  for (const p of rng.shuffle(free)) {
    if (atM[p.id] !== undefined) continue;
    if (plainTier) {
      const watched = nonScene.filter((pl) => watcherAt(pl) !== undefined);
      atM[p.id] = rng.pick(watched.length > 0 && rng.chance(0.7) ? watched : nonScene);
      continue;
    }
    const options = rng.shuffle(nonScene).filter((pl) => !exposed(p.id, pl));
    if (options.length === 0) return fail(`nowhere at the crime's half hour for ${p.surname} that nobody would name`);
    atM[p.id] = options[0] as Id;
  }
  // The liars and the pair must not be exposed either, unless they are the direct one.
  if (!plainTier) {
    for (const [id, place] of Object.entries(atM)) {
      if (id === killer.id || id === directId) continue;
      if (exposed(id, place)) return fail(`somebody at the crime's half hour would name ${id}`);
    }
  }
  for (const [id, place] of Object.entries(atM)) {
    if (id === killer.id) continue;
    (fixed[id] as Record<number, Id>)[M] = place;
  }

  // Corroboration: the half hour next to the crime's, in the same room, where
  // somebody who knows them by name sees them and they are not at the scene.
  if (!plainTier) {
    for (const p of rng.shuffle(free)) {
      if (p.id === directId || pairCells.has(`${p.id}@${M}`)) continue;
      const place = atM[p.id] as Id;
      const mine = fixed[p.id] as Record<number, Id>;
      for (const s of rng.shuffle([M - 1, M + 1].filter((t) => t >= 0 && t < TICKS))) {
        if (mine[s] !== undefined && mine[s] !== place) continue;
        // Somebody who can name them, free at `s`, and able to get there.
        const helpers = rng.shuffle(cast.suspects).filter((q) => {
          if (q.id === p.id) return false;
          if (!canName(acq, q.id, p.id)) return false;
          const theirs = fixed[q.id] as Record<number, Id>;
          if (theirs[s] !== undefined) return false;
          if (lyingAt(q.id, s)) return false;
          const qm = theirs[M];
          if (qm !== undefined && !walk(qm, place)) return false;
          const other = s === M - 1 ? theirs[M - 2] : theirs[M + 2];
          if (other !== undefined && !walk(other, place)) return false;
          return true;
        });
        const q = helpers[0];
        if (!q) continue;
        mine[s] = place;
        (fixed[q.id] as Record<number, Id>)[s] = place;
        break;
      }
    }
  }

  /* --- fill in the rest, one walk at a time ------------------------------- */
  const allowedPlace = (personId: Id, tick: Tick): Id[] => {
    const isKiller = personId === killer.id;
    const isVictim = personId === cast.victim.id;
    return placeIds.filter((p) => {
      if (p !== L) return true;
      if (tick > M) return false;
      if (tick >= blockStart) return isKiller || isVictim;
      return true;
    });
  };
  const weighted = (pool: Id[], personId: Id): Id[] => {
    const out: Id[] = [];
    for (const id of pool) {
      const kind = setting.places.find((p) => p.id === id)?.kind ?? 'public';
      const isHome = id === setting.places.find((p) => p.isResidence)?.id;
      let weight = kind === 'private' ? 1 : 3;
      if (isHome && personId !== cast.victim.id) weight = 1;
      for (let i = 0; i < weight; i++) out.push(id);
    }
    return out;
  };
  const fill = (personId: Id, cells: Record<number, Id>, endTick: Tick): (Id | null)[] | null => {
    const line: (Id | null)[] = new Array(TICKS).fill(null);
    let last: Id | null = null;
    for (let t = 0; t <= endTick; t++) {
      const f = cells[t];
      if (f !== undefined) {
        if (last !== null && !walk(last, f)) return null;
        line[t] = f;
        last = f;
        continue;
      }
      let nextT = -1;
      for (let u = t + 1; u <= endTick; u++) {
        if (cells[u] !== undefined) {
          nextT = u;
          break;
        }
      }
      const pool = allowedPlace(personId, t).filter(
        (p) =>
          (last === null || walk(last, p)) &&
          (nextT < 0 || gap(p, cells[nextT] as Id) <= nextT - t) &&
          // The crime's half hour and the one either side are settled: fill
          // never puts a knower beside somebody the arrangement kept apart.
          true,
      );
      if (pool.length === 0) return null;
      if (last !== null && pool.includes(last) && rng.chance(0.55)) {
        line[t] = last;
      } else {
        line[t] = rng.pick(weighted(pool, personId));
        last = line[t] as Id;
      }
    }
    return line;
  };

  const victimLine = fill(cast.victim.id, victimFixed, ctx.caseType === 'murder' ? M : TICKS - 1);
  if (!victimLine) return fail("the victim's evening does not walk");
  truth[cast.victim.id] = victimLine;
  for (const p of cast.suspects) {
    const line = fill(p.id, fixed[p.id] as Record<number, Id>, TICKS - 1);
    if (!line) return fail(`${p.surname}'s evening does not walk`);
    truth[p.id] = line;
  }

  for (const f of cast.fixtures) {
    if (f.id === cast.beatCop?.id || excursionUsed.has(f.id)) continue;
    if (!rng.chance(0.6)) continue;
    const t = rng.range(1, TICKS - 2);
    if (t >= M - 1 && t <= M + 1) continue;
    const near = nonScene.filter((p) => p !== f.foundAt && walk(p, f.foundAt));
    if (near.length === 0) continue;
    (truth[f.id] as (Id | null)[])[t] = rng.pick(near);
    excursionUsed.add(f.id);
  }

  /* --- who found it ----------------------------------------------------------- */
  let discovery: { placeId: Id; tick: Tick; byId: Id } | undefined;
  if (!isMissing && M + 1 <= TICKS - 1) {
    const placeId = ctx.tropeId === 'body-moved' ? (rng.pick(nonScene) as Id) : L;
    const eligible = cast.people.filter((p) => p.id !== killer.id && p.id !== cast.victim.id);
    let found: { tick: Tick; byId: Id } | undefined;
    for (let t = M + 1; t < TICKS && !found; t++) {
      const here = eligible.find((p) => (truth[p.id] as (Id | null)[])[t] === placeId);
      if (here) found = { tick: t, byId: here.id };
    }
    if (!found) {
      for (let tick = TICKS - 1; tick > M + 1 && !found; tick--) {
        const walkIn = cast.innocents.find((p) => {
          if ((secretCells[p.id] ?? []).includes(tick)) return false;
          const line = truth[p.id] as (Id | null)[];
          if (!walk(line[tick - 1], placeId)) return false;
          if (tick + 1 < TICKS && !walk(placeId, line[tick + 1])) return false;
          return true;
        });
        if (walkIn) {
          (truth[walkIn.id] as (Id | null)[])[tick] = placeId;
          found = { tick, byId: walkIn.id };
        }
      }
    }
    if (found) discovery = { placeId, tick: found.tick, byId: found.byId };
  }
  if (isRobbery && discovery === undefined) {
    const tick = (TICKS - 1) as Tick;
    if (walk((truth[cast.victim.id] as (Id | null)[])[tick - 1], L)) {
      (truth[cast.victim.id] as (Id | null)[])[tick] = L;
      discovery = { placeId: L, tick, byId: cast.victim.id };
    }
  }

  addSightings(acq, cast.people, truth, cast.suspects);

  /* --- lies ----------------------------------------------------------------- */
  const lieDrafts: LieDraft[] = [];
  const claimed: Record<Id, (Id | null)[]> = {};
  const companions: Record<Id, (Id | null)[]> = {};
  const lies: Record<Id, Tick[]> = {};
  for (const p of cast.people) {
    claimed[p.id] = (truth[p.id] as (Id | null)[]).slice();
    companions[p.id] = new Array(TICKS).fill(null);
    lies[p.id] = [];
  }

  /** Somewhere to claim for a false span: not where they were, not the scene, not the spans either side. */
  const claimFor = (personId: Id, block: Tick[], prefer: (c: Id) => number): Id | null => {
    const line = truth[personId] as (Id | null)[];
    const mine = claimed[personId] as (Id | null)[];
    const first = block[0] as Tick;
    const last = block[block.length - 1] as Tick;
    const before = first > 0 ? mine[first - 1] : null;
    const after = last < TICKS - 1 ? mine[last + 1] : null;
    const options = nonScene.filter(
      (c) => !block.some((t) => line[t] === c) && c !== before && c !== after,
    );
    if (options.length === 0) return null;
    const scored = rng.shuffle(options).map((c) => ({ c, s: prefer(c) + (walk(before, c) && walk(c, after) ? 1 : 0) }));
    scored.sort((a, b) => b.s - a.s);
    return scored[0]?.c ?? null;
  };
  const addLie = (d: LieDraft): void => {
    lieDrafts.push(d);
    for (const t of d.ticks) {
      (claimed[d.personId] as (Id | null)[])[t] = d.claimed;
      if (d.with) (companions[d.personId] as (Id | null)[])[t] = d.with;
      (lies[d.personId] as Tick[]).push(t);
    }
  };
  const peopledAt = (place: Id, ticks: Tick[], except: Id): number =>
    cast.people.filter(
      (q) => q.id !== except && q.kind !== 'victim' && ticks.some((t) => (truth[q.id] as (Id | null)[])[t] === place),
    ).length;

  // The culprit: the crime's block. Where the tier wants the culprit's lie
  // broken only by chains, not a room whose watcher would say "not tonight".
  const chains = dials.culpritChains;
  const knowerPosted = (place: Id, id: Id): boolean => {
    const w = watcherAt(place);
    return w !== undefined && canName(acq, w, id);
  };
  const crimeClaim = claimFor(killer.id, murderCells, (c) =>
    (chains ? (knowerPosted(c, killer.id) ? -5 : 0) : knowerPosted(c, killer.id) ? 2 : 0) +
    (peopledAt(c, murderCells, killer.id) > 0 ? 1 : 0),
  );
  if (!crimeClaim) return fail('no room for the culprit to claim');
  addLie({ personId: killer.id, ticks: murderCells.slice(), claimed: crimeClaim, cover: 'crime' });

  if (dials.meansLie) {
    if (chains) {
      // Nobody who can name the culprit sees the means fetched.
      const w = watcherAt(accessPlaceId);
      if (w) makeStranger(w, killer.id);
      for (const q of cast.suspects) {
        if (q.id === killer.id) continue;
        if ((truth[q.id] as (Id | null)[])[killerAccessTick] === accessPlaceId && canName(acq, q.id, killer.id) && !lyingAt(q.id, killerAccessTick)) {
          if (!makeStranger(q.id, killer.id)) return fail('somebody who knows the culprit watched the means go');
        }
      }
    }
    const meansClaim = claimFor(killer.id, [killerAccessTick], (c) => (knowerPosted(c, killer.id) ? (chains ? -5 : 2) : 0));
    if (meansClaim) addLie({ personId: killer.id, ticks: [killerAccessTick], claimed: meansClaim, cover: 'means' });
  }
  if (coverSecret && coverTicks.length > 0) {
    const c = claimFor(killer.id, coverTicks, (x) => (knowerPosted(x, killer.id) ? 1 : 0));
    if (c) addLie({ personId: killer.id, ticks: coverTicks, claimed: c, cover: 'secret' });
  }

  // The innocents with secrets: where a watcher who knows them would say they
  // were not in tonight, so their lie has something plain to break it.
  if (dials.secretLies) {
    for (const p of cast.innocents) {
      for (const block of secretBlocks[p.id] ?? []) {
        if (block.length === 0) continue;
        const c = claimFor(p.id, block, (x) => (knowerPosted(x, p.id) ? 3 : 0) + (peopledAt(x, block, p.id) > 0 ? 1 : 0));
        if (!c) return fail(`no plausible false account for ${p.surname}`);
        addLie({ personId: p.id, ticks: block.slice(), claimed: c, cover: 'secret' });
      }
    }
  }

  // Alibi companions: somebody lies about being with a liar, for the liar's span.
  const wantCompanions = rng.range(dials.companions[0], dials.companions[1]) + (plainTier ? 0 : ctx.extraLies);
  const covered: LieDraft[] = rng.shuffle(lieDrafts.filter((d) => d.cover === 'crime' || (d.cover === 'secret' && d.personId !== killer.id)));
  covered.sort((a, b) => (a.cover === 'crime' ? -1 : 0) - (b.cover === 'crime' ? -1 : 0));
  let madeCompanions = 0;
  for (const d of covered) {
    if (madeCompanions >= wantCompanions) break;
    const options = rng.shuffle(cast.innocents).filter((q) => {
      if (q.id === d.personId) return false;
      if (d.ticks.some((t) => lyingAt(q.id, t) || (lies[q.id] ?? []).includes(t))) return false;
      if (d.ticks.some((t) => (truth[q.id] as (Id | null)[])[t] === d.claimed)) return false;
      const mine = claimed[q.id] as (Id | null)[];
      const first = d.ticks[0] as Tick;
      const last = d.ticks[d.ticks.length - 1] as Tick;
      if (first > 0 && mine[first - 1] === d.claimed) return false;
      if (last < TICKS - 1 && mine[last + 1] === d.claimed) return false;
      // Nobody would lie for a stranger.
      return canName(acq, q.id, d.personId);
    });
    const q = options[0];
    if (!q) continue;
    d.with = q.id;
    for (const t of d.ticks) (companions[d.personId] as (Id | null)[])[t] = q.id;
    addLie({ personId: q.id, ticks: d.ticks.slice(), claimed: d.claimed, with: d.personId, cover: 'companion' });
    madeCompanions++;
  }
  for (const p of cast.people) lies[p.id] = Array.from(new Set(lies[p.id] ?? [])).sort((a, b) => a - b);

  /* --- descriptions of the secrets -------------------------------------------- */
  const nameOf = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? 'someone';
  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.shortName ?? id;
  for (const p of cast.innocents) {
    const template = cast.innocentSecrets[p.id];
    const secret = secrets[p.id];
    if (!template || !secret) continue;
    const ticks = secret.cells.map((c) => c.tick);
    const where = secret.cells.length > 0 ? placeName(secret.cells[0]?.place as Id) : '';
    secret.description = describeSecret(template, p.surname, secret.partnerId ? nameOf(secret.partnerId) : null, where, ticks, cast.victim.surname);
  }
  murderSecret.description = isRobbery
    ? `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, alone with what ${cast.victim.surname} kept there, and takes it at ${clock(M)}.`
    : isMissing
      ? `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, alone with ${cast.victim.surname}, who is not seen again after ${clock(M)}.`
      : `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, alone with ${cast.victim.surname} when it happens at ${clock(M)}.`;
  if (coverSecret && cast.killerCoverSecret) {
    const ticks = coverSecret.cells.map((c) => c.tick);
    const where = coverSecret.cells.length > 0 ? placeName(coverSecret.cells[0]?.place as Id) : '';
    coverSecret.description = describeSecret(cast.killerCoverSecret, killer.surname, null, where, ticks, cast.victim.surname);
  }

  const sawThem = (p: Person): boolean =>
    p.kind !== 'victim' &&
    (truth[p.id] as (Id | null)[])[victimSeenAt] === victimSeenPlace &&
    !(lies[p.id] ?? []).includes(victimSeenAt);
  const lastSeenBy = cast.people.find((p) => p.id !== killer.id && sawThem(p)) ?? cast.people.find(sawThem);

  const build: Schedule9Build = {
    murderTick: M,
    murderPlaceId: L,
    blockStart,
    secrets,
    truth,
    claimed,
    companions,
    lies,
    killerClaimAtM: crimeClaim,
    accessPlaceId,
    killerAccessTick,
    innocentAccess,
    mLiars: liars.map((p) => p.id),
    victimSeenAt,
    victimSeenPlace,
    acq,
    lieDrafts,
    directId,
    pair,
    pairGrain,
  };
  if (coverSecret) build.coverSecret = coverSecret;
  if (whereabouts !== undefined) build.whereabouts = whereabouts;
  if (lastSeenBy) build.lastSeenById = lastSeenBy.id;
  if (discovery) build.discovery = discovery;
  return build;
}
