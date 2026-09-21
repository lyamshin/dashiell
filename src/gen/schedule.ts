import { TICKS, clock, type Id, type Secret, type Tick } from './types.js';
import type { MapGraph } from './graph.js';
import type { Rng } from './rng.js';
import type { Cast } from './cast.js';
import type { SecretTemplate } from './data/secrets.js';
import { LOC } from './data/locations.js';

/* ------------------------------------------------------------------ walking */

function pickWithDwell(rng: Rng, cands: Id[], cur: Id): Id {
  if (cands.includes(cur) && rng.chance(0.5)) return cur;
  return rng.pick(cands);
}

type Allowed = (loc: Id, tick: Tick) => boolean;

function pickNext(rng: Rng, graph: MapGraph, cur: Id, tick: Tick, allowed: Allowed): Id | null {
  const cands = graph.movesInto(cur, tick).filter((l) => allowed(l, tick));
  if (cands.length === 0) return null;
  return pickWithDwell(rng, cands, cur);
}

/**
 * Locations for ticks t1+1 .. t2 inclusive, starting from `loc1` at t1 and
 * landing on `loc2` at t2. Randomised depth-first with a distance prune and a
 * failure memo; the graph is eight nodes wide and twelve ticks deep, so this is
 * cheap and always finds a path when one exists.
 */
function walkBetween(
  rng: Rng,
  graph: MapGraph,
  loc1: Id,
  t1: Tick,
  loc2: Id,
  t2: Tick,
  allowed: Allowed,
): Id[] | null {
  const failed = new Set<string>();
  const path: Id[] = [];

  const rec = (t: Tick, cur: Id): boolean => {
    if (t === t2) return cur === loc2;
    if (graph.dist(cur, loc2) > t2 - t) return false;
    const key = `${t}|${cur}`;
    if (failed.has(key)) return false;
    const raw = graph.movesInto(cur, t + 1);
    const cands = rng.shuffle(raw);
    if (raw.includes(cur) && rng.chance(0.5)) {
      const i = cands.indexOf(cur);
      cands.splice(i, 1);
      cands.unshift(cur);
    }
    for (const c of cands) {
      if (t + 1 === t2) {
        if (c !== loc2) continue;
      } else if (!allowed(c, t + 1)) {
        continue;
      }
      path.push(c);
      if (rec(t + 1, c)) return true;
      path.pop();
    }
    failed.add(key);
    return false;
  };

  if (!rec(t1, loc1)) return null;
  return path;
}

export function fillSchedule(
  rng: Rng,
  graph: MapGraph,
  fixed: Record<number, Id>,
  endTick: Tick,
  allowed: Allowed,
): (Id | null)[] | null {
  const out: (Id | null)[] = new Array(TICKS).fill(null);
  const fixedTicks = Object.keys(fixed)
    .map(Number)
    .filter((t) => t <= endTick)
    .sort((a, b) => a - b);
  for (const t of fixedTicks) out[t] = fixed[t] as Id;

  if (fixedTicks.length === 0) {
    const starts = graph.ids.filter((id) => allowed(id, 0));
    if (starts.length === 0) return null;
    out[0] = rng.pick(starts);
    for (let t = 1; t <= endTick; t++) {
      const c = pickNext(rng, graph, out[t - 1] as Id, t, allowed);
      if (c === null) return null;
      out[t] = c;
    }
    return out;
  }

  const first = fixedTicks[0] as number;
  for (let t = first - 1; t >= 0; t--) {
    const cur = out[t + 1] as Id;
    const cands = graph.movesInto(cur, t + 1).filter((l) => allowed(l, t));
    if (cands.length === 0) return null;
    out[t] = pickWithDwell(rng, cands, cur);
  }

  for (let i = 0; i < fixedTicks.length - 1; i++) {
    const t1 = fixedTicks[i] as number;
    const t2 = fixedTicks[i + 1] as number;
    if (t2 === t1 + 1) {
      if (!graph.movesInto(out[t1] as Id, t2).includes(out[t2] as Id)) return null;
      continue;
    }
    const seg = walkBetween(rng, graph, out[t1] as Id, t1, out[t2] as Id, t2, allowed);
    if (seg === null) return null;
    for (let k = 0; k < seg.length - 1; k++) out[t1 + 1 + k] = seg[k] as Id;
  }

  const last = fixedTicks[fixedTicks.length - 1] as number;
  for (let t = last + 1; t <= endTick; t++) {
    const c = pickNext(rng, graph, out[t - 1] as Id, t, allowed);
    if (c === null) return null;
    out[t] = c;
  }
  return out;
}

/** Can `loc` be slotted in at `tick` without stranding the neighbouring fixed cells? */
function feasibleInsert(graph: MapGraph, fixed: Record<number, Id>, tick: Tick, loc: Id): boolean {
  if (fixed[tick] !== undefined) return false;
  const ticks = Object.keys(fixed).map(Number);
  let prev = -1;
  let next = TICKS;
  for (const t of ticks) {
    if (t < tick && t > prev) prev = t;
    if (t > tick && t < next) next = t;
  }
  if (prev >= 0 && graph.dist(fixed[prev] as Id, loc) > tick - prev) return false;
  if (next < TICKS && graph.dist(loc, fixed[next] as Id) > next - tick) return false;
  return true;
}

/* ------------------------------------------------------------------- output */

export interface ScheduleBuild {
  murderTick: Tick;
  murderLocationId: Id;
  blockStart: Tick;
  /** suspect id -> secret. The killer's is the murder. */
  secrets: Record<Id, Secret>;
  coverSecret?: Secret;
  truth: Record<Id, (Id | null)[]>;
  claimed: Record<Id, (Id | null)[]>;
  companions: Record<Id, (Id | null)[]>;
  lies: Record<Id, Tick[]>;
  killerClaimAtM: Id;
  accessLocation: Id;
  killerAccessTick: Tick;
  innocentAccess: { personId: Id; tick: Tick };
  /** Innocents whose secret sits on the murder tick. */
  mLiars: Id[];
  victimSeenAt: Tick;
}

export interface ScheduleContext {
  rng: Rng;
  graph: MapGraph;
  cast: Cast;
  accessLocation: Id;
  murderTick: Tick;
  murderLocationId: Id;
  /** Optional sink for the reason an attempt was abandoned. */
  reject?: (reason: string) => void;
}

function tickRange(ticks: Tick[]): string {
  const sorted = ticks.slice().sort((a, b) => a - b);
  const first = sorted[0] as Tick;
  const last = sorted[sorted.length - 1] as Tick;
  return first === last ? clock(first) : `${clock(first)} to ${clock(last)}`;
}

export function describeSecret(
  template: SecretTemplate,
  personName: string,
  partnerName: string | null,
  locationName: string,
  ticks: Tick[],
): string {
  return template.description
    .replace('{P}', personName)
    .replace('{Q}', partnerName ?? 'someone')
    .replace('{L}', locationName)
    .replace('{T}', ticks.length > 0 ? tickRange(ticks) : 'no particular time');
}

/* ------------------------------------------------------------- the builder */

export function buildSchedules(ctx: ScheduleContext): ScheduleBuild | null {
  const { rng, graph, cast, accessLocation } = ctx;
  const M = ctx.murderTick;
  const L = ctx.murderLocationId;
  const fail = (reason: string): null => {
    ctx.reject?.(reason);
    return null;
  };

  const blockStart = Math.max(1, M - rng.int(3));
  const murderCells: Tick[] = [];
  for (let t = blockStart; t <= M; t++) murderCells.push(t);

  /* --- fixtures ------------------------------------------------------- */
  const fixtureSchedule = (post: Id, rawAway: Id[]): (Id | null)[] => {
    // A fixture must never step into the murder room: at the murder tick it
    // would break "the killer and the victim, alone", and afterwards it would
    // find the body and end the evening early.
    const away = rawAway.filter((l) => l !== L);
    const arr: (Id | null)[] = new Array(TICKS).fill(post);
    const excursions = rng.range(1, 2);
    for (let i = 0; i < excursions; i++) {
      const t = rng.range(1, TICKS - 2);
      if (t === M || t === M - 1) continue;
      // One tick away and straight back, so the step either side of the
      // excursion is still a legal move. Two excursions on adjacent ticks
      // would otherwise let a fixture cross the hotel in one step.
      if (arr[t - 1] !== post || arr[t + 1] !== post) continue;
      if (away.length === 0) break;
      const dest = rng.pick(away);
      if (graph.adjacentOrSame(post, dest)) arr[t] = dest;
    }
    return arr;
  };
  const truth: Record<Id, (Id | null)[]> = {};
  truth[cast.doorman.id] = fixtureSchedule(LOC.lobby, [LOC.street, LOC.frontDesk]);
  truth[cast.bartender.id] = fixtureSchedule(LOC.bar, [LOC.kitchen, LOC.lobby]);

  const fixtureIds = [cast.doorman.id, cast.bartender.id];

  /* --- where the victim is last seen alive ---------------------------- */
  const witnessCandidates = [LOC.lobby, LOC.bar].filter(
    (w) => w !== L && graph.movesInto(w, M).includes(L),
  );
  if (witnessCandidates.length === 0) {
    return fail('no witnessed room leads to the scene at the murder tick');
  }
  const victimSeenLoc = rng.pick(witnessCandidates);
  const victimSeenAt = M - 1;

  const victimFixed: Record<number, Id> = { [M]: L, [victimSeenAt]: victimSeenLoc };

  /* --- secret cells ---------------------------------------------------- */
  const reserved = new Set<string>();
  for (const t of murderCells) reserved.add(`${t}|${L}`);

  const secrets: Record<Id, Secret> = {};
  const secretCellsByPerson: Record<Id, Tick[]> = {};
  const fixedByPerson: Record<Id, Record<number, Id>> = {};
  for (const p of cast.suspects) fixedByPerson[p.id] = {};

  const allocate = (
    template: SecretTemplate,
    locations: Id[],
    mustIncludeM: boolean,
    minTick: Tick,
    maxTick: Tick,
  ): { location: Id; ticks: Tick[] } | null => {
    const len = rng.range(template.minTicks, template.maxTicks);
    for (let attempt = 0; attempt < 60; attempt++) {
      const location = rng.pick(locations);
      if (location === L) continue;
      let start: Tick;
      if (mustIncludeM) start = M - rng.int(len);
      else start = rng.range(minTick, maxTick);
      const ticks: Tick[] = [];
      for (let k = 0; k < len; k++) ticks.push(start + k);
      if (ticks.some((t) => t < minTick || t > maxTick)) continue;
      if (!mustIncludeM && ticks.includes(M)) continue;
      const isPrivate = !graph.loc(location).isPublic;
      if (isPrivate && ticks.some((t) => reserved.has(`${t}|${location}`))) continue;
      if (isPrivate) for (const t of ticks) reserved.add(`${t}|${location}`);
      return { location, ticks };
    }
    return null;
  };

  // Pick the innocents who will lie about the murder tick.
  const witnessable = cast.innocents.filter((p) => {
    const t = cast.innocentSecrets[p.id] as SecretTemplate;
    return t.witnessLocations.some((w) => w !== L);
  });
  if (witnessable.length < 2) {
    return fail('fewer than two innocents could hide a secret at the murder tick');
  }
  const wantLiars = Math.min(witnessable.length, rng.range(2, 3));
  const mLiars = rng.shuffle(witnessable).slice(0, wantLiars);
  const mLiarIds = mLiars.map((p) => p.id);

  const handled = new Set<Id>();

  for (const person of cast.innocents) {
    if (handled.has(person.id)) continue;
    const template = cast.innocentSecrets[person.id] as SecretTemplate;

    if (template.type === 'forged-identity') {
      secrets[person.id] = { type: template.type, description: '', cells: [] };
      secretCellsByPerson[person.id] = [];
      handled.add(person.id);
      continue;
    }

    if (template.type === 'affair') {
      const partner = cast.innocents.find(
        (o) =>
          o.id !== person.id &&
          !handled.has(o.id) &&
          (cast.innocentSecrets[o.id] as SecretTemplate).type === 'affair',
      );
      if (!partner) return fail('an affair with nobody to have it with');
      const alloc = allocate(template, template.locations, false, 0, TICKS - 1);
      if (!alloc) return fail('no free window for the affair');
      for (const [who, other] of [
        [person, partner],
        [partner, person],
      ] as const) {
        secrets[who.id] = {
          type: template.type,
          description: '',
          cells: alloc.ticks.map((t) => ({ tick: t, location: alloc.location })),
          partnerId: other.id,
        };
        secretCellsByPerson[who.id] = alloc.ticks;
        for (const t of alloc.ticks) (fixedByPerson[who.id] as Record<number, Id>)[t] = alloc.location;
        handled.add(who.id);
      }
      continue;
    }

    const isLiar = mLiarIds.includes(person.id);
    const locations = isLiar
      ? template.witnessLocations.filter((w) => w !== L)
      : template.locations.filter((w) => w !== L);
    if (locations.length === 0) {
      return fail(`${template.type} has nowhere to happen away from the scene`);
    }

    // Blackmail drags the victim along, so it has to finish before the victim
    // goes downstairs to be seen alive for the last time.
    const maxTick = template.partner === 'victim' ? M - 2 : TICKS - 1;
    if (maxTick < 0) return fail('the blackmail cannot finish before the murder');
    const alloc = allocate(template, locations, isLiar, 0, maxTick);
    if (!alloc) return fail(`no free window for the ${template.type} secret`);

    const secret: Secret = {
      type: template.type,
      description: '',
      cells: alloc.ticks.map((t) => ({ tick: t, location: alloc.location })),
    };
    if (template.partner === 'victim') {
      secret.partnerId = cast.victim.id;
      for (const t of alloc.ticks) victimFixed[t] = alloc.location;
    }
    secrets[person.id] = secret;
    secretCellsByPerson[person.id] = alloc.ticks;
    for (const t of alloc.ticks) (fixedByPerson[person.id] as Record<number, Id>)[t] = alloc.location;
    handled.add(person.id);
  }

  /* --- the killer ------------------------------------------------------ */
  const murderSecret: Secret = {
    type: 'murder',
    description: '',
    cells: murderCells.map((t) => ({ tick: t, location: L })),
    partnerId: cast.victim.id,
  };
  secrets[cast.killer.id] = murderSecret;
  secretCellsByPerson[cast.killer.id] = murderCells.slice();
  for (const t of murderCells) (fixedByPerson[cast.killer.id] as Record<number, Id>)[t] = L;

  // The killer leaves the scene on the next tick. Without this they wander off
  // at their leisure and, because their lies stop at the murder tick, they
  // cheerfully tell the detective they were standing in the room with the body
  // half an hour after it became a body.
  if (M + 1 <= TICKS - 1) {
    const exits = graph
      .movesInto(L, M + 1)
      .filter((loc) => loc !== L && loc !== LOC.suite);
    if (exits.length === 0) return fail('the killer has no way out of the scene');
    (fixedByPerson[cast.killer.id] as Record<number, Id>)[M + 1] = rng.pick(exits);
  }

  // Access requirement: the killer had to be where the weapon lived, and be
  // seen there, before the murder.
  const killerFixed = fixedByPerson[cast.killer.id] as Record<number, Id>;
  const accessTicks = rng.shuffle(
    Array.from({ length: blockStart }, (_, i) => i).filter((t) => t < blockStart),
  );
  let killerAccessTick = -1;
  for (const t of accessTicks) {
    if (!feasibleInsert(graph, killerFixed, t, accessLocation)) continue;
    const watched = fixtureIds.some((f) => graph.canSee(truth[f]?.[t] as Id, accessLocation));
    if (!watched) continue;
    killerAccessTick = t;
    break;
  }
  if (killerAccessTick < 0) {
    return fail('the killer could not be seen reaching the weapon before the murder');
  }
  killerFixed[killerAccessTick] = accessLocation;

  let coverSecret: Secret | undefined;
  if (cast.killerCoverSecret && cast.killerCoverSecret.type !== 'forged-identity') {
    const t = cast.killerCoverSecret;
    const locations = t.locations.filter((w) => w !== L);
    if (locations.length > 0) {
      const alloc = allocate(t, locations, false, 0, TICKS - 1);
      if (
        alloc &&
        !alloc.ticks.some((tk) => killerFixed[tk] !== undefined) &&
        alloc.ticks.every((tk) => feasibleInsert(graph, killerFixed, tk, alloc.location))
      ) {
        coverSecret = {
          type: t.type,
          description: '',
          cells: alloc.ticks.map((tk) => ({ tick: tk, location: alloc.location })),
        };
        for (const tk of alloc.ticks) killerFixed[tk] = alloc.location;
        (secretCellsByPerson[cast.killer.id] as Tick[]).push(...alloc.ticks);
      }
    }
  } else if (cast.killerCoverSecret) {
    coverSecret = { type: cast.killerCoverSecret.type, description: '', cells: [] };
  }

  /* --- where everyone stands at the murder tick ------------------------ */
  const liesAtM = new Set<Id>([cast.killer.id, ...mLiarIds]);
  const placementPool = [LOC.lobby, LOC.bar, LOC.street, LOC.frontDesk, LOC.kitchen].filter(
    (l) => l !== L,
  );
  const needPlacement = cast.innocents.filter((p) => !mLiarIds.includes(p.id));

  let killerClaimAtM: Id | null = null;
  let placed = false;
  for (let attempt = 0; attempt < 200 && !placed; attempt++) {
    const trial: Record<Id, Id> = {};
    for (const p of needPlacement) {
      const pool = rng.chance(0.6) ? [LOC.lobby, LOC.bar].filter((l) => l !== L) : placementPool;
      trial[p.id] = rng.pick(pool.length > 0 ? pool : placementPool);
    }

    const whereAtM = (id: Id): Id | null => {
      if (id === cast.killer.id || id === cast.victim.id) return L;
      if (fixtureIds.includes(id)) return (truth[id]?.[M] ?? null) as Id | null;
      const fixedLoc = (fixedByPerson[id] as Record<number, Id>)[M];
      if (fixedLoc !== undefined) return fixedLoc;
      return trial[id] ?? null;
    };

    const seenBy = (target: Id, subjectId: Id): number => {
      let n = 0;
      for (const q of cast.people) {
        if (q.id === subjectId || q.id === cast.victim.id) continue;
        if (liesAtM.has(q.id)) continue;
        const qLoc = whereAtM(q.id);
        if (qLoc && graph.canSee(qLoc, target)) n++;
      }
      return n;
    };

    let ok = true;
    for (const p of cast.innocents) {
      const loc = whereAtM(p.id);
      if (!loc || loc === L) {
        ok = false;
        break;
      }
      if (seenBy(loc, p.id) < 2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const claimCandidates = graph.ids.filter(
      (c) => graph.loc(c).isPublic && c !== L && seenBy(c, cast.killer.id) >= 2,
    );
    if (claimCandidates.length === 0) continue;

    for (const p of needPlacement) {
      (fixedByPerson[p.id] as Record<number, Id>)[M] = trial[p.id] as Id;
    }
    killerClaimAtM = rng.pick(claimCandidates);
    placed = true;
  }
  if (!placed || killerClaimAtM === null) {
    return fail('no murder-tick arrangement leaves every innocent doubly witnessed');
  }

  /* --- somebody else could have reached the weapon too ----------------- */
  let innocentAccess: { personId: Id; tick: Tick } | null = null;
  for (const person of rng.shuffle(cast.innocents)) {
    const fixed = fixedByPerson[person.id] as Record<number, Id>;
    for (const t of rng.shuffle(Array.from({ length: M }, (_, i) => i))) {
      if (secretCellsByPerson[person.id]?.includes(t)) continue;
      if (!feasibleInsert(graph, fixed, t, accessLocation)) continue;
      const watched = fixtureIds.some((f) => graph.canSee(truth[f]?.[t] as Id, accessLocation));
      if (!watched) continue;
      fixed[t] = accessLocation;
      innocentAccess = { personId: person.id, tick: t };
      break;
    }
    if (innocentAccess) break;
  }
  if (!innocentAccess) {
    return fail('nobody but the killer could have reached the weapon');
  }

  /* --- fill in the rest of everyone's evening -------------------------- */
  const allowedFor = (personId: Id): Allowed => {
    const isKiller = personId === cast.killer.id;
    const isVictim = personId === cast.victim.id;
    return (loc, tick) => {
      if (loc === LOC.suite) return false;
      if (loc === L && tick >= blockStart && !isKiller && !isVictim) return false;
      // Nobody revisits the scene once the murder has happened, the killer
      // least of all.
      if (loc === L && tick > M) return false;
      return true;
    };
  };

  const victimTruth = fillSchedule(rng, graph, victimFixed, M, allowedFor(cast.victim.id));
  if (!victimTruth) return fail("the victim's evening does not join up");
  for (let t = M + 1; t < TICKS; t++) victimTruth[t] = null;
  truth[cast.victim.id] = victimTruth;

  for (const person of cast.suspects) {
    const arr = fillSchedule(
      rng,
      graph,
      fixedByPerson[person.id] as Record<number, Id>,
      TICKS - 1,
      allowedFor(person.id),
    );
    if (!arr) return fail("a suspect's evening does not join up");
    truth[person.id] = arr;
  }

  /* --- lies, claims, companions ---------------------------------------- */
  const lies: Record<Id, Tick[]> = {};
  const claimed: Record<Id, (Id | null)[]> = {};
  const companions: Record<Id, (Id | null)[]> = {};

  for (const p of cast.people) {
    const cells = p.kind === 'suspect' ? (secretCellsByPerson[p.id] ?? []) : [];
    const sorted = Array.from(new Set(cells)).sort((a, b) => a - b);
    lies[p.id] = sorted;
    claimed[p.id] = (truth[p.id] as (Id | null)[]).slice();
    companions[p.id] = new Array(TICKS).fill(null);
  }

  for (const p of cast.suspects) {
    const lieTicks = lies[p.id] as Tick[];
    if (lieTicks.length === 0) continue;
    const myTruth = truth[p.id] as (Id | null)[];
    const myClaim = claimed[p.id] as (Id | null)[];
    const myComp = companions[p.id] as (Id | null)[];

    const blocks: Tick[][] = [];
    for (const t of lieTicks) {
      const last = blocks[blocks.length - 1];
      if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
      else blocks.push([t]);
    }

    for (const block of blocks) {
      const a = block[0] as Tick;
      const b = block[block.length - 1] as Tick;
      const anchorBefore = a > 0 ? (myTruth[a - 1] as Id) : null;
      const anchorAfter = b < TICKS - 1 ? (myTruth[b + 1] as Id) : null;
      const mustWitnessM = p.id === cast.killer.id && block.includes(M);

      const base = graph.ids.filter((c) => {
        if (!graph.loc(c).isPublic) return false;
        if (c === L) return false;
        for (const t of block) if (myTruth[t] === c) return false;
        if (mustWitnessM && c !== killerClaimAtM) return false;
        return true;
      });

      const tiers: Id[][] = [
        base.filter(
          (c) =>
            (anchorBefore === null || graph.adjacentOrSame(anchorBefore, c)) &&
            (anchorAfter === null || graph.adjacentOrSame(c, anchorAfter)),
        ),
        base.filter((c) => anchorBefore === null || graph.adjacentOrSame(anchorBefore, c)),
        base,
      ];
      const tier = tiers.find((t) => t.length > 0);
      if (!tier) return fail('no plausible false alibi for a block of lies');
      const claimLoc = rng.pick(tier);
      for (const t of block) myClaim[t] = claimLoc;

      const nameCompanion = mustWitnessM ? rng.chance(0.65) : rng.chance(0.45);
      if (nameCompanion) {
        const options = cast.suspects.filter(
          (q) => q.id !== p.id && (truth[q.id] as (Id | null)[])[a] !== claimLoc,
        );
        if (options.length > 0) {
          const q = rng.pick(options);
          for (const t of block) myComp[t] = q.id;
        }
      }
    }
  }

  // The killer's claim for the murder tick is the one the proof leans on.
  const killerClaim = (claimed[cast.killer.id] as (Id | null)[])[M];
  if (killerClaim !== killerClaimAtM) {
    return fail('the killer could not claim the room the proof needs');
  }

  /* --- descriptions ---------------------------------------------------- */
  const nameOf = (id: Id): string => cast.people.find((p) => p.id === id)?.name ?? 'someone';

  for (const p of cast.innocents) {
    const template = cast.innocentSecrets[p.id] as SecretTemplate;
    const secret = secrets[p.id] as Secret;
    const ticks = secret.cells.map((c) => c.tick);
    const locName = secret.cells.length > 0 ? graph.name(secret.cells[0]?.location as Id) : '';
    secret.description = describeSecret(
      template,
      p.name,
      secret.partnerId ? nameOf(secret.partnerId) : null,
      locName,
      ticks,
    );
  }
  murderSecret.description = `${cast.killer.name} is alone with ${cast.victim.name} in the ${graph.name(L)} from ${tickRange(murderCells)}, and kills ${cast.victim.name} at ${clock(M)}.`;
  if (coverSecret && cast.killerCoverSecret) {
    const ticks = coverSecret.cells.map((c) => c.tick);
    const locName = coverSecret.cells.length > 0 ? graph.name(coverSecret.cells[0]?.location as Id) : '';
    coverSecret.description = describeSecret(
      cast.killerCoverSecret,
      cast.killer.name,
      null,
      locName,
      ticks,
    );
  }

  const build: ScheduleBuild = {
    murderTick: M,
    murderLocationId: L,
    blockStart,
    secrets,
    truth,
    claimed,
    companions,
    lies,
    killerClaimAtM,
    accessLocation,
    killerAccessTick,
    innocentAccess,
    mLiars: mLiarIds,
    victimSeenAt,
  };
  if (coverSecret) build.coverSecret = coverSecret;
  return build;
}
