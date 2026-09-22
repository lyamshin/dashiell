import {
  TICKS,
  clock,
  type CaseType,
  type Difficulty,
  type Id,
  type Person,
  type Secret,
  type Tick,
} from './types.js';
import type { Rng } from './rng.js';
import type { Cast } from './cast.js';
import type { Setting } from './setting.js';
import type { SecretTemplate } from './data/secrets.js';

export interface ScheduleBuild {
  murderTick: Tick;
  murderPlaceId: Id;
  blockStart: Tick;
  /** suspect id -> secret. The killer's is the murder. */
  secrets: Record<Id, Secret>;
  coverSecret?: Secret;
  truth: Record<Id, (Id | null)[]>;
  claimed: Record<Id, (Id | null)[]>;
  companions: Record<Id, (Id | null)[]>;
  lies: Record<Id, Tick[]>;
  killerClaimAtM: Id;
  accessPlaceId: Id;
  killerAccessTick: Tick;
  innocentAccess: { personId: Id; tick: Tick };
  /** Innocents whose secret sits on the murder tick. */
  mLiars: Id[];
  /** Where the victim was seen alive, at M − 1. */
  victimSeenAt: Tick;
  victimSeenPlace: Id;
  /* --- M5 ------------------------------------------------------------- */
  /** Missing only: where the person's true schedule continues to, after M. */
  whereabouts?: Id;
  /** Who saw the subject last at M − 1, and will say so. */
  lastSeenById?: Id;
  /** Murder and robbery: who walked in on it, where, and when. */
  discovery?: { placeId: Id; tick: Tick; byId: Id };
}

export interface ScheduleContext {
  rng: Rng;
  setting: Setting;
  cast: Cast;
  difficulty: Difficulty;
  murderTick: Tick;
  /**
   * M5 §2.1: the machinery is the same for all three. What changes is whether
   * the subject's schedule ends at M (murder), carries on as if nothing had
   * happened (robbery: nobody died, the owner had an evening), or carries on
   * somewhere nobody is watching (missing).
   */
  caseType: CaseType;
  tropeId: Id;
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
  placeName: string,
  ticks: Tick[],
  victimName = 'the one who is dead',
): string {
  return template.description
    .split('{P}').join(personName)
    .split('{Q}').join(partnerName ?? 'someone')
    .split('{V}').join(victimName)
    .split('{L}').join(placeName)
    .split('{T}').join(ticks.length > 0 ? tickRange(ticks) : 'no particular time');
}

/* ------------------------------------------------------------- the builder */

export function buildSchedules(ctx: ScheduleContext): ScheduleBuild | null {
  const { rng, setting, cast } = ctx;
  const M = ctx.murderTick;
  const L = setting.murderPlaceId;
  const fail = (reason: string): null => {
    ctx.reject?.(reason);
    return null;
  };

  const placeIds = setting.places.map((p) => p.id);
  const nonScene = placeIds.filter((p) => p !== L);
  const templateOf = (id: Id) => setting.templates[id];
  const watchedIds = setting.places.filter((p) => p.watcher !== undefined).map((p) => p.id);

  const blockStart = Math.max(1, M - rng.int(3));

  /* --- fixtures stand where they are posted ---------------------------- */
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

  /* --- fixed cells ------------------------------------------------------ */
  const fixedByPerson: Record<Id, Record<number, Id>> = {};
  for (const p of cast.suspects) fixedByPerson[p.id] = {};
  const victimFixed: Record<number, Id> = {};

  const victimSeenPlace = setting.low.placeId as Id;
  const victimSeenAt = M - 1;
  victimFixed[victimSeenAt] = victimSeenPlace;

  /*
   * Where the subject is at the tick itself, and what happens to them after.
   *
   * Murder: at the scene, and nowhere after it.
   * Robbery: nowhere near it. Nobody died; the owner had an evening like
   *   anybody else's, and what was at the scene was the goods.
   * Missing: at the scene with whoever saw them off, and then at a place
   *   nobody in this case is watching, for the rest of the night.
   */
  const isRobbery = ctx.caseType === 'robbery';
  const isMissing = ctx.caseType === 'missing';
  victimFixed[M] = isRobbery ? victimSeenPlace : L;

  let whereabouts: Id | undefined;
  if (isMissing && M + 1 <= TICKS - 1) {
    const quiet = nonScene.filter((id) => setting.places.find((p) => p.id === id)?.watcher === undefined);
    whereabouts = rng.pick(quiet.length > 0 ? quiet : nonScene);
    for (let t = M + 1; t < TICKS; t++) victimFixed[t] = whereabouts;
  }

  const killerFixed = fixedByPerson[cast.killer.id] as Record<number, Id>;
  for (let t = blockStart; t <= M; t++) killerFixed[t] = L;
  if (M + 1 <= TICKS - 1) {
    // `taken` puts the one who took them in the same room at M + 1: the room
    // that somebody paid cash for, which is the trope's signature.
    killerFixed[M + 1] =
      ctx.tropeId === 'taken' && whereabouts !== undefined ? whereabouts : rng.pick(nonScene);
  }

  /* --- secrets ---------------------------------------------------------- */
  const secrets: Record<Id, Secret> = {};
  const secretCells: Record<Id, Tick[]> = {};
  // One block per secret, not per run of consecutive ticks: a killer whose
  // cover secret happens to abut the murder block must tell two separate lies
  // about two separate rooms, not one lie spanning both.
  const lieBlocks: Record<Id, Tick[][]> = {};
  const liarPlaces: Id[] = [];

  const placesHosting = (type: string, watchedOnly: boolean): Id[] =>
    placeIds.filter((id) => {
      if (id === L) return false;
      const t = templateOf(id);
      if (!t || !t.secretsHosted.includes(type)) return false;
      if (watchedOnly && t.watcher === undefined) return false;
      return true;
    });

  /** A run of `len` ticks inside [min, max], optionally covering M. */
  const window = (len: number, coversM: boolean, min: Tick, max: Tick): Tick[] | null => {
    const starts: Tick[] = [];
    for (let s = min; s + len - 1 <= max; s++) {
      const run: Tick[] = [];
      for (let k = 0; k < len; k++) run.push(s + k);
      if (coversM && !run.includes(M)) continue;
      if (!coversM && run.includes(M)) continue;
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
      lieBlocks[person.id] = [];
      return true;
    }
    const pool = placesHosting(template.type, isLiar);
    if (pool.length === 0) return false;
    // Two liars in the same room at the murder tick is cheap company: it means
    // one posted watcher covers both of them.
    const preferred = isLiar ? pool.filter((p) => liarPlaces.includes(p)) : [];
    const place = rng.pick(preferred.length > 0 && rng.chance(0.7) ? preferred : pool);
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
    lieBlocks[person.id] = [ticks.slice()];
    const fixed = fixedByPerson[person.id] as Record<number, Id>;
    for (const t of ticks) fixed[t] = place;
    if (isLiar) liarPlaces.push(place);
    return true;
  };

  // Liars first, so that later secrets can be steered into their rooms.
  const liars = cast.innocents.filter((p) => cast.mLiarIds.includes(p.id));
  for (const p of liars) {
    if (!assign(p, cast.innocentSecrets[p.id] as SecretTemplate, true)) {
      return fail(`no room for ${cast.innocentSecrets[p.id]?.type} on the murder tick`);
    }
  }

  const handled = new Set<Id>(liars.map((p) => p.id));
  for (const p of cast.innocents) {
    if (handled.has(p.id)) continue;
    const template = cast.innocentSecrets[p.id] as SecretTemplate;
    if (template.type === 'affair') {
      const partner = cast.innocents.find(
        (o) =>
          o.id !== p.id &&
          !handled.has(o.id) &&
          (cast.innocentSecrets[o.id] as SecretTemplate).type === 'affair',
      );
      if (!partner) return fail('an affair with nobody to have it with');
      if (!assign(p, template, false)) return fail('no free window for the affair');
      const mine = secrets[p.id] as Secret;
      const cells = mine.cells.map((c) => ({ tick: c.tick, place: c.place }));
      secrets[partner.id] = {
        type: template.type,
        label: template.label,
        description: '',
        cells,
        partnerId: p.id,
      };
      mine.partnerId = partner.id;
      secretCells[partner.id] = cells.map((c) => c.tick);
      lieBlocks[partner.id] = [cells.map((c) => c.tick)];
      const fixed = fixedByPerson[partner.id] as Record<number, Id>;
      for (const c of cells) fixed[c.tick] = c.place;
      handled.add(p.id);
      handled.add(partner.id);
      continue;
    }
    if (!assign(p, template, false)) return fail(`no free window for the ${template.type} secret`);
    handled.add(p.id);
  }

  /* --- the murder itself ------------------------------------------------ */
  const murderCells: Tick[] = [];
  for (let t = blockStart; t <= M; t++) murderCells.push(t);
  const murderSecret: Secret = {
    type: 'murder',
    label: 'Murder',
    description: '',
    cells: murderCells.map((t) => ({ tick: t, place: L })),
    partnerId: cast.victim.id,
  };
  secrets[cast.killer.id] = murderSecret;
  secretCells[cast.killer.id] = murderCells.slice();
  lieBlocks[cast.killer.id] = [murderCells.slice()];

  let coverSecret: Secret | undefined;
  if (cast.killerCoverSecret) {
    const t = cast.killerCoverSecret;
    if (t.type === 'forged-identity') {
      coverSecret = { type: t.type, label: t.label, description: '', cells: [] };
    } else {
      const pool = placesHosting(t.type, false);
      const len = rng.range(t.minTicks, t.maxTicks);
      const ticks = pool.length > 0 ? window(len, false, 0, blockStart - 1) : null;
      if (ticks && ticks.every((tk) => killerFixed[tk] === undefined)) {
        const place = rng.pick(pool);
        coverSecret = {
          type: t.type,
          label: t.label,
          description: '',
          cells: ticks.map((tk) => ({ tick: tk, place })),
        };
        for (const tk of ticks) killerFixed[tk] = place;
        (secretCells[cast.killer.id] as Tick[]).push(...ticks);
        (lieBlocks[cast.killer.id] as Tick[][]).push(ticks.slice());
      }
    }
  }

  /* --- where everyone stands at the murder tick ------------------------- */
  const liarIds = cast.mLiarIds;
  const freeInnocents = cast.innocents.filter((p) => !liarIds.includes(p.id));
  const fixturePostAtM: Record<Id, Id | null> = {};
  for (const f of cast.fixtures) fixturePostAtM[f.id] = (truth[f.id] as (Id | null)[])[M] ?? null;

  interface Arrangement {
    innocentPlace: Record<Id, Id>;
    excursions: { fixtureId: Id; place: Id }[];
    claim: Id;
  }

  const arrange = (): Arrangement | null => {
    const hubs = rng.shuffle(
      liarPlaces.length > 0 ? Array.from(new Set(liarPlaces)) : watchedIds.filter((p) => p !== L),
    );
    const spareFixtures = cast.fixtures.filter(
      (f) => f.id !== cast.beatCop?.id && !excursionUsed.has(f.id),
    );

    for (let attempt = 0; attempt < 200; attempt++) {
      const innocentPlace: Record<Id, Id> = {};
      for (const p of liars) innocentPlace[p.id] = (fixedByPerson[p.id] as Record<number, Id>)[M] as Id;

      const hub = hubs.length > 0 ? (hubs[attempt % hubs.length] as Id) : rng.pick(nonScene);
      if (freeInnocents.length < 2 || rng.chance(0.8)) {
        for (const p of freeInnocents) innocentPlace[p.id] = hub;
      } else {
        const pool = rng.shuffle(watchedIds.filter((p) => p !== L && p !== hub));
        const target = (pool[0] ?? hub) as Id;
        const half = Math.ceil(freeInnocents.length / 2);
        freeInnocents.forEach((p, i) => {
          innocentPlace[p.id] = i < half ? hub : target;
        });
      }

      // Who is standing where, before any excursion.
      const truthfulAt = new Map<Id, number>();
      const bump = (place: Id | null, truthful: boolean): void => {
        if (!place) return;
        if (truthful) truthfulAt.set(place, (truthfulAt.get(place) ?? 0) + 1);
      };
      for (const f of cast.fixtures) bump(fixturePostAtM[f.id] ?? null, true);
      for (const p of cast.innocents) bump(innocentPlace[p.id] as Id, !liarIds.includes(p.id));

      // Only the rooms with an innocent standing in them have to be covered.
      // The watcher of such a room is the one witness we cannot spare, so he
      // stays where he is; everybody else's one excursion of the night is
      // available to make up the numbers.
      const excursions: { fixtureId: Id; place: Id }[] = [];
      const inhabited = new Map<Id, Id[]>();
      for (const p of cast.innocents) {
        const place = innocentPlace[p.id] as Id;
        const list = inhabited.get(place) ?? [];
        list.push(p.id);
        inhabited.set(place, list);
      }
      const busy = new Set<Id>(inhabited.keys());
      let ok = true;
      const need = (place: Id): number =>
        (inhabited.get(place) ?? []).some((id) => !liarIds.includes(id)) ? 3 : 2;
      for (const place of Array.from(inhabited.keys())) {
        let have = truthfulAt.get(place) ?? 0;
        const want = need(place);
        while (have < want) {
          const free = spareFixtures.filter(
            (f) =>
              !excursions.some((e) => e.fixtureId === f.id) &&
              !busy.has(fixturePostAtM[f.id] as Id) &&
              fixturePostAtM[f.id] !== place,
          );
          if (free.length === 0) {
            ok = false;
            break;
          }
          const f = rng.pick(free);
          excursions.push({ fixtureId: f.id, place });
          have++;
          truthfulAt.set(place, have);
          const fromPlace = fixturePostAtM[f.id];
          if (fromPlace) truthfulAt.set(fromPlace, (truthfulAt.get(fromPlace) ?? 1) - 1);
        }
        if (!ok) break;
      }
      if (!ok) continue;

      // Re-check every room now that fixtures have moved.
      const finalPlaceOf = (id: Id): Id | null => {
        const e = excursions.find((x) => x.fixtureId === id);
        if (e) return e.place;
        return fixturePostAtM[id] ?? innocentPlace[id] ?? null;
      };
      const truthfulPeople = [
        ...cast.fixtures.map((f) => f.id),
        ...freeInnocents.map((p) => p.id),
      ];
      const truthfulHere = (place: Id, except: Id): number =>
        truthfulPeople.filter((id) => id !== except && finalPlaceOf(id) === place).length;

      let cleared = true;
      for (const p of cast.innocents) {
        const place = innocentPlace[p.id] as Id;
        if (place === L) {
          cleared = false;
          break;
        }
        if (truthfulHere(place, p.id) < 2) {
          cleared = false;
          break;
        }
      }
      if (!cleared) continue;

      const claims = nonScene.filter((c) => truthfulHere(c, cast.killer.id) >= 2);
      if (claims.length === 0) continue;
      return { innocentPlace, excursions, claim: rng.pick(claims) };
    }
    return null;
  };

  const arrangement = arrange();
  if (!arrangement) return fail('no murder-tick arrangement leaves every innocent doubly witnessed');

  for (const p of freeInnocents) {
    (fixedByPerson[p.id] as Record<number, Id>)[M] = arrangement.innocentPlace[p.id] as Id;
  }
  for (const e of arrangement.excursions) {
    (truth[e.fixtureId] as (Id | null)[])[M] = e.place;
    excursionUsed.add(e.fixtureId);
  }
  const killerClaimAtM = arrangement.claim;

  /* --- the weapon ------------------------------------------------------- */
  const accessPlaceId = setting.accessPlaceId;
  const truthfulAtTick = (tick: Tick, place: Id, except: Id): number => {
    let n = 0;
    for (const f of cast.fixtures) {
      if (f.id === except) continue;
      if ((truth[f.id] as (Id | null)[])[tick] === place) n++;
    }
    for (const p of cast.innocents) {
      if (p.id === except) continue;
      if ((secretCells[p.id] ?? []).includes(tick)) continue;
      if ((fixedByPerson[p.id] as Record<number, Id>)[tick] === place) n++;
    }
    return n;
  };

  const freeAt = (p: Person, tick: Tick): boolean =>
    (fixedByPerson[p.id] as Record<number, Id>)[tick] === undefined &&
    !(secretCells[p.id] ?? []).includes(tick);

  let killerAccessTick = -1;
  for (const t of rng.shuffle(Array.from({ length: blockStart }, (_, i) => i))) {
    if (killerFixed[t] !== undefined) continue;
    const spare = cast.innocents.filter((p) => freeAt(p, t));
    const witnesses = truthfulAtTick(t, accessPlaceId, cast.killer.id) + spare.length;
    if (witnesses < 2) continue;
    killerFixed[t] = accessPlaceId;
    let have = truthfulAtTick(t, accessPlaceId, cast.killer.id);
    for (const p of rng.shuffle(spare)) {
      if (have >= 2) break;
      (fixedByPerson[p.id] as Record<number, Id>)[t] = accessPlaceId;
      have++;
    }
    if (have < 2) return fail('nobody could see the killer reach the weapon');
    killerAccessTick = t;
    break;
  }
  if (killerAccessTick < 0) return fail('the killer could not be seen reaching the weapon');

  let innocentAccess: { personId: Id; tick: Tick } | null = null;
  for (const p of rng.shuffle(cast.innocents)) {
    for (const t of rng.shuffle(Array.from({ length: M }, (_, i) => i))) {
      if (!freeAt(p, t)) continue;
      if (truthfulAtTick(t, accessPlaceId, p.id) < 1) continue;
      (fixedByPerson[p.id] as Record<number, Id>)[t] = accessPlaceId;
      innocentAccess = { personId: p.id, tick: t };
      break;
    }
    if (innocentAccess) break;
  }
  if (!innocentAccess) return fail('nobody but the killer could have reached the weapon');

  /* --- fill in the rest of the evening ---------------------------------- */
  const allowedPlace = (personId: Id, tick: Tick): Id[] => {
    const isKiller = personId === cast.killer.id;
    const isVictim = personId === cast.victim.id;
    return placeIds.filter((p) => {
      if (p !== L) return true;
      if (tick > M) return false;
      if (tick >= blockStart) return isKiller || isVictim;
      return true;
    });
  };

  // People drift towards the places people drift towards. Without this
  // weighting a third of the cast spends the evening standing in the victim's
  // parlour, which reads like a bug rather than an evening.
  const weighted = (pool: Id[], personId: Id): Id[] => {
    const out: Id[] = [];
    for (const id of pool) {
      const kind = setting.places.find((p) => p.id === id)?.kind ?? 'public';
      const isHome = id === setting.places.find((p) => p.isResidence)?.id;
      let weight = kind === 'private' ? 1 : kind === 'semi' ? 3 : 3;
      if (isHome && personId !== cast.victim.id) weight = 1;
      for (let i = 0; i < weight; i++) out.push(id);
    }
    return out;
  };

  const fill = (personId: Id, fixed: Record<number, Id>, endTick: Tick): (Id | null)[] => {
    const line: (Id | null)[] = new Array(TICKS).fill(null);
    let last: Id | null = null;
    for (let t = 0; t <= endTick; t++) {
      const f = fixed[t];
      if (f !== undefined) {
        line[t] = f;
        last = f;
        continue;
      }
      const pool = allowedPlace(personId, t);
      if (last !== null && pool.includes(last) && rng.chance(0.55)) {
        line[t] = last;
      } else {
        line[t] = rng.pick(weighted(pool, personId));
        last = line[t] as Id;
      }
    }
    return line;
  };

  // A murder ends the victim's evening at M. A robbery does not end anything,
  // and a disappearance carries on somewhere nobody in this case can see.
  truth[cast.victim.id] = fill(cast.victim.id, victimFixed, ctx.caseType === 'murder' ? M : TICKS - 1);
  for (const p of cast.suspects) {
    truth[p.id] = fill(p.id, fixedByPerson[p.id] as Record<number, Id>, TICKS - 1);
  }

  // One excursion each for the fixtures who did not spend theirs at the murder
  // tick. Never into the scene: they would find the body and end the evening.
  for (const f of cast.fixtures) {
    if (f.id === cast.beatCop?.id || excursionUsed.has(f.id)) continue;
    if (!rng.chance(0.6)) continue;
    const t = rng.range(1, TICKS - 2);
    if (t === M || t === M + 1 || t === M - 1) continue;
    const dest = rng.pick(nonScene.filter((p) => p !== f.foundAt));
    if (dest === undefined) continue;
    (truth[f.id] as (Id | null)[])[t] = dest;
    excursionUsed.add(f.id);
  }

  /* --- who found it, and when -------------------------------------------
   *
   * M5 §1.3. Somebody found the body, or the empty shelf, and the case is
   * only a case because they did. That person has to have been in the room,
   * which means the one exception to "nobody is at the scene after M": the
   * one who walks in and finds it. Everybody else still stays out.
   */
  let discovery: { placeId: Id; tick: Tick; byId: Id } | undefined;
  if (!isMissing && M + 1 <= TICKS - 1) {
    const placeId =
      ctx.tropeId === 'body-moved'
        ? (rng.pick(nonScene) as Id)
        : L;
    const eligible = cast.people.filter((p) => p.id !== cast.killer.id && p.id !== cast.victim.id);
    const ticks: Tick[] = [];
    for (let t = M + 1; t < TICKS; t++) ticks.push(t);
    let found: { tick: Tick; byId: Id } | undefined;
    for (const t of ticks) {
      const here = eligible.find((p) => (truth[p.id] as (Id | null)[])[t] === placeId);
      if (here) {
        found = { tick: t, byId: here.id };
        break;
      }
    }
    if (!found) {
      // Send somebody in. A tick they are not busy lying about, and late.
      const tick = (ticks[ticks.length - 1] ?? M + 1) as Tick;
      // Never a fixture: a fixture gets one excursion a night and it is never
      // into the scene. An innocent who is not lying about that tick.
      const walkIn = cast.innocents.find((p) => !(secretCells[p.id] ?? []).includes(tick));
      if (walkIn) {
        (truth[walkIn.id] as (Id | null)[])[tick] = placeId;
        found = { tick, byId: walkIn.id };
      }
    }
    if (found) discovery = { placeId, tick: found.tick, byId: found.byId };
  }
  if (isRobbery && discovery === undefined) {
    // The owner comes home and finds the shelf empty. Nobody died; they can.
    const tick = (TICKS - 1) as Tick;
    (truth[cast.victim.id] as (Id | null)[])[tick] = L;
    discovery = { placeId: L, tick, byId: cast.victim.id };
  }

  /* --- lies, claims, companions ----------------------------------------- */
  const lies: Record<Id, Tick[]> = {};
  const claimed: Record<Id, (Id | null)[]> = {};
  const companions: Record<Id, (Id | null)[]> = {};
  for (const p of cast.people) {
    const cells = p.kind === 'suspect' ? (secretCells[p.id] ?? []) : [];
    lies[p.id] = Array.from(new Set(cells)).sort((a, b) => a - b);
    claimed[p.id] = (truth[p.id] as (Id | null)[]).slice();
    companions[p.id] = new Array(TICKS).fill(null);
  }

  for (const p of cast.suspects) {
    const blocks = (lieBlocks[p.id] ?? []).filter((b) => b.length > 0);
    if (blocks.length === 0) continue;
    const myTruth = truth[p.id] as (Id | null)[];
    const myClaim = claimed[p.id] as (Id | null)[];
    const myComp = companions[p.id] as (Id | null)[];

    for (const block of blocks) {
      const coversM = p.id === cast.killer.id && block.includes(M);
      let claimPlace: Id;
      if (coversM) {
        claimPlace = killerClaimAtM;
      } else {
        const options = nonScene.filter((c) => !block.some((t) => myTruth[t] === c));
        if (options.length === 0) return fail('no plausible false alibi for a block of lies');
        // Somewhere with people in it: a claim nobody can speak to is no use.
        const peopled = options.filter((c) =>
          block.some((t) => truthfulAtTick(t, c, p.id) >= 1 || occupiedBy(c, t)),
        );
        claimPlace = rng.pick(peopled.length > 0 ? peopled : options);
      }
      for (const t of block) myClaim[t] = claimPlace;

      if (rng.chance(coversM ? 0.6 : 0.4)) {
        const options = cast.suspects.filter(
          (q) => q.id !== p.id && (truth[q.id] as (Id | null)[])[block[0] as Tick] !== claimPlace,
        );
        if (options.length > 0) {
          const q = rng.pick(options);
          for (const t of block) myComp[t] = q.id;
        }
      }
    }
  }

  function occupiedBy(place: Id, tick: Tick): boolean {
    return cast.people.some((q) => (truth[q.id] as (Id | null)[] | undefined)?.[tick] === place);
  }

  if ((claimed[cast.killer.id] as (Id | null)[])[M] !== killerClaimAtM) {
    return fail('the killer could not claim the room the proof needs');
  }

  /* --- descriptions ------------------------------------------------------ */
  // Surnames and short names: the secret descriptions end up in the truth
  // sheet's Secrets and Red herrings sections, which are not where a person or
  // a place gets introduced.
  const nameOf = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? 'someone';
  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.shortName ?? id;

  for (const p of cast.innocents) {
    const template = cast.innocentSecrets[p.id] as SecretTemplate;
    const secret = secrets[p.id] as Secret;
    const ticks = secret.cells.map((c) => c.tick);
    const where = secret.cells.length > 0 ? placeName(secret.cells[0]?.place as Id) : '';
    secret.description = describeSecret(
      template,
      p.surname,
      secret.partnerId ? nameOf(secret.partnerId) : null,
      where,
      ticks,
      cast.victim.surname,
    );
  }
  murderSecret.description = isRobbery
    ? `${cast.killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, ` +
      `alone with what ${cast.victim.surname} kept there, and takes it at ${clock(M)}.`
    : isMissing
      ? `${cast.killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, ` +
        `alone with ${cast.victim.surname}, who is not seen again after ${clock(M)}.`
      : `${cast.killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, ` +
        `alone with ${cast.victim.surname} when it happens at ${clock(M)}.`;
  if (coverSecret && cast.killerCoverSecret) {
    const ticks = coverSecret.cells.map((c) => c.tick);
    const where = coverSecret.cells.length > 0 ? placeName(coverSecret.cells[0]?.place as Id) : '';
    coverSecret.description = describeSecret(
      cast.killerCoverSecret,
      cast.killer.surname,
      null,
      where,
      ticks,
      cast.victim.surname,
    );
  }

  /* --- who saw the subject last, and will say so ------------------------ */
  const lastSeenBy = cast.people.find(
    (p) =>
      p.kind !== 'victim' &&
      (truth[p.id] as (Id | null)[])[victimSeenAt] === victimSeenPlace &&
      !(lies[p.id] ?? []).includes(victimSeenAt),
  );

  const build: ScheduleBuild = {
    murderTick: M,
    murderPlaceId: L,
    blockStart,
    secrets,
    truth,
    claimed,
    companions,
    lies,
    killerClaimAtM,
    accessPlaceId,
    killerAccessTick,
    innocentAccess,
    mLiars: liarIds.slice(),
    victimSeenAt,
    victimSeenPlace,
  };
  if (coverSecret) build.coverSecret = coverSecret;
  if (whereabouts !== undefined) build.whereabouts = whereabouts;
  if (lastSeenBy) build.lastSeenById = lastSeenBy.id;
  if (discovery) build.discovery = discovery;
  return build;
}
