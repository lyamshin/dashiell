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

import { TICKS, clock, isTheft, machineOf, type CaseType, type Id, type LieCover, type Person, type Secret, type Tick } from '../types.js';
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
  type Grain,
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
  pairGrain: Grain | null;
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
  // M14: a lost pet and a lost item are thefts to the schedule, and an
  // affair is a meeting — the one it is about at the scene at the half hour,
  // alive before and after, and nobody walking in on anything.
  const isRobbery = isTheft(ctx.caseType);
  const isMissing = ctx.caseType === 'missing';
  const isMeeting = machineOf(ctx.caseType) === 'meeting';
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
  // M10 Part B: at Raw and Coddled the culprit's half hour after is left
  // open, so that the culprit can be the one who sees an innocent there.
  const teach = dials.catchTheLie === true;
  if (M + 1 <= TICKS - 1 && !teach) {
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

  let farLiar = false;
  const assign = (person: Person, template: SecretTemplate, isLiar: boolean): boolean => {
    if (template.type === 'forged-identity') {
      secrets[person.id] = { type: template.type, label: template.label, description: '', cells: [] };
      secretCells[person.id] = [];
      secretBlocks[person.id] = [];
      return true;
    }
    const pool = placesHosting(template.type);
    if (pool.length === 0) return false;
    // A secret on the crime's half hour stays within a walk of the scene, but
    // for one: otherwise a sighting next to it would clear the liar alone.
    const near = pool.filter((p) => gap(p, L) <= 1);
    const place = isLiar && (farLiar || rng.chance(0.75)) && near.length > 0 ? rng.pick(near) : rng.pick(pool);
    if (isLiar && gap(place, L) >= 2) {
      if (farLiar) return false;
      farLiar = true;
    }
    // A secret on the crime's half hour runs past it where it can, so that
    // somebody can see the liar there at a half hour that clears nobody.
    const len = rng.range(isLiar ? Math.min(template.maxTicks, Math.max(2, template.minTicks)) : template.minTicks, template.maxTicks);
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
  const fetchTicks = rng.shuffle(Array.from({ length: blockStart }, (_, i) => i)).filter((t) => {
    if (killerFixed[t] !== undefined) return false;
    if (gap(accessPlaceId, L) > blockStart - t) return false;
    if (killerFixed[t - 1] !== undefined && !walk(killerFixed[t - 1], accessPlaceId)) return false;
    if (killerFixed[t + 1] !== undefined && !walk(accessPlaceId, killerFixed[t + 1])) return false;
    return true;
  });
  // Not flush against the block where there is a choice, so the lie about it
  // is its own span.
  fetchTicks.sort((a, b) => (a === blockStart - 1 ? 1 : 0) - (b === blockStart - 1 ? 1 : 0));
  if (fetchTicks.length > 0) {
    killerAccessTick = fetchTicks[0] as Tick;
    killerFixed[killerAccessTick] = accessPlaceId;
  }
  if (killerAccessTick < 0) return fail('the culprit has no half hour to fetch the means in');

  let innocentAccess: { personId: Id; tick: Tick } | null = null;
  for (const p of rng.shuffle(cast.innocents)) {
    for (const t of rng.shuffle(Array.from({ length: Math.max(0, M - 1) }, (_, i) => i))) {
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

  const acq = rollAcquaintance({ rng, cast, setting, dials });
  for (const [a, b] of affairs) tieSecret(acq, a, b);

  const fixtureAtM = (place: Id): Id[] =>
    cast.fixtures.filter((f) => (truth[f.id] as (Id | null)[])[M] === place).map((f) => f.id);
  const lyingAt = (id: Id, t: Tick): boolean => (secretCells[id] ?? []).includes(t);
  const setEdge = (from: Id, to: Id, strength: 'stranger' | 'sight' | 'name', basis: 'none' | 'regular' | 'roll'): boolean => {
    const e = acq.edges.get(`${from}>${to}`);
    if (!e) return true;
    if (e.strength === strength) return true;
    if (e.basis === 'tie' || e.basis === 'secret') return false;
    const target = cast.people.find((p) => p.id === to) as Person;
    const ref =
      strength === 'name'
        ? target.name
        : strength === 'sight'
          ? `${describeAs(target, cast.suspects, 'age').text} I know by sight`
          : describeAs(target, cast.suspects, 'age').text;
    acq.edges.set(`${from}>${to}`, { ...e, strength, basis, ref });
    for (const [place, list] of Object.entries(acq.regulars)) {
      if (cast.watcherOf[place] !== from) continue;
      acq.regulars[place] = strength === 'name' ? Array.from(new Set([...list, to])) : list.filter((id) => id !== to);
    }
    return true;
  };
  // At Raw and Coddled nobody is a stranger (the tier deals no descriptions):
  // somebody who must not name a person knows only the face.
  const makeStranger = (from: Id, to: Id): boolean => setEdge(from, to, teach ? 'sight' : 'stranger', 'none');

  // The direct one: the one innocent somebody names at the crime's half hour.
  // A liar first, if one can be: their lie then has its first contradiction
  // for free. One whose secret room is across the neighbourhood from the
  // scene has to be, because a sighting near it clears them anyway.
  let directId: Id | null = null;
  let directPlace: Id | null = null;
  let directWitness: Id | null = null;
  if (!plainTier && dials.directClears > 0) {
    const far = liars.filter((p) => gap(atM[p.id] as Id, L) >= 2);
    if (far.length > 1) return fail('two liars are across the neighbourhood from the scene');
    const order = [
      ...far,
      ...rng.shuffle(liars.filter((p) => !far.includes(p) && watcherAt(atM[p.id] as Id) !== undefined)),
      ...rng.shuffle(liars.filter((p) => !far.includes(p) && watcherAt(atM[p.id] as Id) === undefined)),
      ...rng.shuffle(free),
    ];
    for (const d of order) {
      if (liarIds.has(d.id)) {
        const S = atM[d.id] as Id;
        const w = watcherAt(S);
        if (w) {
          if (!setEdge(w, d.id, 'name', 'regular')) continue;
          directId = d.id;
          directPlace = S;
          break;
        }
        const witness = rng.shuffle(free).find((q) => canName(acq, q.id, d.id));
        if (!witness) continue;
        directId = d.id;
        directPlace = S;
        directWitness = witness.id;
        atM[witness.id] = S;
        break;
      }
      const watched = rng.shuffle(nonScene.filter((p) => watcherAt(p) !== undefined));
      const W = watched[0];
      if (!W || !setEdge(watcherAt(W) as Id, d.id, 'name', 'regular')) continue;
      directId = d.id;
      directPlace = W;
      atM[d.id] = W;
      break;
    }
    if (far.length > 0 && directId !== far[0]?.id) return fail('a liar across the neighbourhood cannot be the one named');
  }

  /**
   * Who at `place` at the crime's half hour, telling the truth about it,
   * would name `id`; and whom there `id` would name. Somebody allowed to be
   * named (the direct one) never counts.
   */
  const namers = (id: Id, place: Id): [Id, Id][] => {
    const here = [
      ...fixtureAtM(place),
      ...Object.entries(atM)
        .filter(([pid, pl]) => pl === place && pid !== id)
        .map(([pid]) => pid),
    ];
    const out: [Id, Id][] = [];
    for (const other of here) {
      if (id !== directId && !lyingAt(other, M) && canName(acq, other, id)) out.push([other, id]);
      const otherPerson = cast.people.find((p) => p.id === other);
      if (
        otherPerson?.kind === 'suspect' &&
        other !== killer.id &&
        other !== directId &&
        !lyingAt(id, M) &&
        canName(acq, id, other)
      ) {
        out.push([id, other]);
      }
    }
    // The direct one's own witness is meant to name them.
    return out.filter(([from, to]) => !(to === directId && (from === directWitness || from === watcherAt(directPlace ?? ''))));
  };
  const exposed = (id: Id, place: Id): boolean => namers(id, place).length > 0;
  /** Unname whoever would name somebody here, where the knowing is not a tie. */
  const quieten = (id: Id, place: Id): boolean => {
    for (const [from, to] of namers(id, place)) if (!makeStranger(from, to)) return false;
    return !exposed(id, place);
  };

  // A liar who is not the direct one: nobody names them where the secret
  // was, and from Medium up somebody who does not know them sees them there.
  for (const p of liars) {
    if (p.id === directId) continue;
    const S = atM[p.id] as Id;
    const w = watcherAt(S);
    if (w) makeStranger(w, p.id);
    if (w || dials.strangers === 0) continue;
    const stranger = rng
      .shuffle(free)
      .find((q) => atM[q.id] === undefined && !canName(acq, q.id, p.id) && walk(S, S));
    if (stranger && !exposed(stranger.id, S) && gap(S, L) <= 1) atM[stranger.id] = S;
  }

  // Hard-boiled: two innocents who fit one description, in two rooms, seen
  // only by strangers at the half hour.
  let pair: [Id, Id] | null = null;
  let pairGrain: Grain | null = null;
  const pairCells = new Set<string>();
  /** The pair's two rooms, and who else fits the description: kept out of them. */
  const pairRooms: Id[] = [];
  const pairOthers: Id[] = [];
  if (dials.hypothesis) {
    // Two who tell the truth about the crime's half hour (a liar's claim,
    // once broken, would place them without any hypothesis at all).
    const candidates = free.filter((p) => p.id !== directId && atM[p.id] === undefined);
    const rooms = nonScene.filter((p) => p !== directPlace);
    // Who sees them there without knowing them: the watcher, or else another
    // innocent standing in the room who is a stranger to both.
    const witnessFor = (X: Id, a: Person, b: Person, taken: Set<Id>): Id | null => {
      const w = watcherAt(X);
      if (w) return w;
      const other = rng
        .shuffle(free)
        .find(
          (q) =>
            q.id !== a.id &&
            q.id !== b.id &&
            q.id !== directId &&
            atM[q.id] === undefined &&
            !taken.has(q.id) &&
            [a, b].every((x) => {
              const e1 = acq.edges.get(`${q.id}>${x.id}`);
              const e2 = acq.edges.get(`${x.id}>${q.id}`);
              return e1?.basis !== 'tie' && e1?.basis !== 'secret' && e2?.basis !== 'tie' && e2?.basis !== 'secret';
            }),
        );
      return other?.id ?? null;
    };
    search: for (const a of rng.shuffle(candidates)) {
      for (const b of rng.shuffle(candidates)) {
        if (a.id >= b.id) continue;
        for (const grain of ['age', 'band', 'coarse', 'fine'] as const) {
          const d = describeAs(a, cast.suspects, grain);
          const m = new Set(d.matches);
          if (!m.has(a.id) || !m.has(b.id)) continue;
          // Anybody else it fits must be shown somewhere else at the half
          // hour on their own: another innocent, by their own settled
          // evening; the culprit, by both watchers knowing the culprit and
          // saying the culprit was not in.
          const others = [...m].filter((id) => id !== a.id && id !== b.id);
          const culpritFits = others.includes(killer.id);
          // Where the culprit is while lying, a watcher who knew the culprit
          // would break the lie in one line; those rooms cannot say "not in".
          const culpritRooms = new Set<Id>([accessPlaceId, ...coverTicks.map((t) => killerFixed[t] as Id)]);
          const ruleOut = (X: Id): boolean => !!watcherAt(X) && !culpritRooms.has(X);
          for (const P of rng.shuffle(rooms)) {
            if (others.some((id) => atM[id] === P)) continue;
            if (culpritFits && !ruleOut(P)) continue;
            for (const Q of rng.shuffle(rooms.filter((q) => q !== P))) {
              if (others.some((id) => atM[id] === Q)) continue;
              if (culpritFits && !ruleOut(Q)) continue;
              // The half hour either side: one room, within a walk of both
              // and of the scene, so that travel settles nothing.
              const R = rng
                .shuffle(nonScene)
                .find((r) => r !== P && r !== Q && walk(r, P) && walk(r, Q) && walk(r, L));
              if (!R) continue;
              const cellsOk = [a, b].every((x) =>
                [M - 1, M + 1].every((t) => t < 0 || t >= TICKS || (fixed[x.id] as Record<number, Id>)[t] === undefined),
              );
              if (!cellsOk) continue;
              const taken = new Set<Id>();
              const wP = witnessFor(P, a, b, taken);
              if (!wP) continue;
              taken.add(wP);
              const wQ = witnessFor(Q, a, b, taken);
              if (!wQ) continue;
              pair = [a.id, b.id];
              pairGrain = grain;
              atM[a.id] = P;
              atM[b.id] = Q;
              pairRooms.push(P, Q);
              pairOthers.push(...others.filter((id) => id !== killer.id));
              if (culpritFits) {
                for (const X of [P, Q]) setEdge(watcherAt(X) as Id, killer.id, 'name', 'regular');
              }
              for (const [w, X] of [[wP, P], [wQ, Q]] as [Id, Id][]) {
                if (!watcherAt(X)) atM[w] = X;
                for (const x of [a, b]) {
                  makeStranger(w, x.id);
                  makeStranger(x.id, w);
                }
              }
              for (const x of [a, b]) {
                for (const t of [M - 1, M + 1]) if (t >= 0 && t < TICKS) (fixed[x.id] as Record<number, Id>)[t] = R;
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

  // Everybody else: within a walk of the scene (from across the
  // neighbourhood one sighting the half hour either side would clear them on
  // its own), where nobody who could name them stands. From Medium up, a room
  // with a watcher who does not know them is better: a description is a piece.
  for (const p of rng.shuffle(free)) {
    if (atM[p.id] !== undefined) continue;
    if (plainTier) {
      const watched = nonScene.filter((pl) => watcherAt(pl) !== undefined);
      atM[p.id] = rng.pick(watched.length > 0 && rng.chance(0.7) ? watched : nonScene);
      continue;
    }
    const options = rng
      .shuffle(nonScene)
      .filter((pl) => gap(pl, L) <= 1)
      .filter((pl) => !(pairOthers.includes(p.id) && pairRooms.includes(pl)))
      .map((pl) => {
        const w = watcherAt(pl);
        const pieces = dials.strangers > 0 && w !== undefined && !canName(acq, w, p.id) ? 1 : 0;
        // Raw and Coddled: the client stands alone at the crime's half hour.
        // Two who share a room then would clear each other, which is the night
        // M10 took away, and the client must go on knowing, by name, the one
        // the client points at. Others who share a room there know only each
        // other's faces (`quieten`, below).
        const shared =
          teach &&
          Object.entries(atM).some(
            ([id, at]) => at === pl && id !== killer.id && (id === cast.client.id || p.id === cast.client.id),
          )
            ? -20
            : 0;
        return { pl, s: (exposed(p.id, pl) ? -10 : 0) + pieces + shared };
      })
      .sort((a, b) => b.s - a.s);
    const pick = options[0];
    if (!pick) return fail(`nowhere at the crime's half hour for ${p.surname}`);
    if (teach && pick.s <= -20) return fail('two innocents would share a room at the crime\'s half hour');
    atM[p.id] = pick.pl;
  }
  if (!plainTier) {
    for (const [id, place] of Object.entries(atM)) {
      if (id === killer.id || id === directId) continue;
      // The pair's half hours either side are fixed within a walk of the
      // scene, so their own rooms may be anywhere.
      if (gap(place, L) >= 2 && !pairCells.has(`${id}@${M}`)) {
        return fail(`${id} is across the neighbourhood from the scene at the crime's half hour`);
      }
      if (!quieten(id, place)) return fail(`somebody at the crime's half hour would name ${id}`);
    }
  }
  for (const [id, place] of Object.entries(atM)) {
    if (id === killer.id) continue;
    (fixed[id] as Record<number, Id>)[M] = place;
  }

  // Corroboration: a half hour near the crime's, in the same room, where
  // somebody who knows them by name sees them. Their account's span then
  // runs from there through the crime's half hour, and stands.
  /** Raw and Coddled: who corroborates whom, so that no two innocents clear each other. */
  const corroboratedBy = new Map<Id, Id>();
  if (!plainTier) {
    for (const p of rng.shuffle(free)) {
      if (p.id === directId || pairCells.has(`${p.id}@${M}`)) continue;
      const place = atM[p.id] as Id;
      const mine = fixed[p.id] as Record<number, Id>;
      for (const s of [...rng.shuffle([M - 1, M + 1]), ...rng.shuffle([M - 2, M + 2])]) {
        if (s < 0 || s >= TICKS) continue;
        const between: Tick[] = [];
        for (let u = Math.min(s, M) + 1; u < Math.max(s, M); u++) between.push(u);
        if ([s, ...between].some((u) => mine[u] !== undefined && mine[u] !== place)) continue;
        if (between.some((u) => lyingAt(p.id, u))) continue;
        const helpers = rng.shuffle(cast.suspects).filter((q) => {
          if (q.id === p.id) return false;
          const theirs = fixed[q.id] as Record<number, Id>;
          if (theirs[s] !== undefined) return false;
          if (lyingAt(q.id, s)) return false;
          // Never somebody in the same room at the crime's half hour: they
          // would name them there, and that is a conclusion.
          if (theirs[M] === place) return false;
          for (const u of [s - 1, s + 1]) {
            const there = theirs[u];
            if (there !== undefined && !walk(there, place)) return false;
          }
          // Raw and Coddled: two innocents never clear each other.
          if (teach && corroboratedBy.get(q.id) === p.id) return false;
          return true;
        });
        // Somebody who knows them already, or somebody who can: a neighbour
        // is a neighbour whatever the roll said, where no tie says otherwise.
        helpers.sort((a, b) => (canName(acq, b.id, p.id) ? 1 : 0) - (canName(acq, a.id, p.id) ? 1 : 0));
        // Raw and Coddled: the culprit first. What the culprit says about
        // anybody else is true, and an innocent's word is best kept off
        // another innocent's alibi.
        if (teach) helpers.sort((a, b) => (b.id === killer.id ? 1 : 0) - (a.id === killer.id ? 1 : 0));
        const q = helpers.find((h) => canName(acq, h.id, p.id) || setEdge(h.id, p.id, 'name', 'roll'));
        if (!q) continue;
        for (const u of [s, ...between]) mine[u] = place;
        (fixed[q.id] as Record<number, Id>)[s] = place;
        corroboratedBy.set(p.id, q.id);
        break;
      }
    }
  }

  // A secret is a lie waiting to be broken, twice (spec §3). Somebody who
  // knows the one keeping it sees them where the secret was, at a half hour
  // of it that is not the crime's.
  if (dials.secretLies && !plainTier) {
    const guardedIds = new Set(cast.innocents.map((p) => p.id).filter((id) => id !== directId));
    for (const p of rng.shuffle(cast.innocents)) {
      for (const block of secretBlocks[p.id] ?? []) {
        const S = secrets[p.id]?.cells[0]?.place;
        if (!S) continue;
        const partner = secrets[p.id]?.partnerId;
        let planted = false;
        for (const t of rng.shuffle(block.filter((u) => u !== M))) {
          const helpers = rng.shuffle(cast.suspects).filter((q) => {
            if (q.id === p.id || q.id === partner) return false;
            const theirs = fixed[q.id] as Record<number, Id>;
            if (theirs[t] !== undefined) return false;
            if (lyingAt(q.id, t)) return false;
            if (guardedIds.has(q.id) && (t === M - 1 || t === M + 1) && gap(S, L) >= 2) return false;
            for (const u of [t - 1, t + 1]) {
              const there = theirs[u];
              if (there !== undefined && !walk(there, S)) return false;
            }
            // Nobody who would then name them at the crime's half hour.
            if (theirs[M] !== undefined && theirs[M] === atM[p.id] && p.id !== directId) return false;
            return true;
          });
          helpers.sort((a, b) => (canName(acq, b.id, p.id) ? 1 : 0) - (canName(acq, a.id, p.id) ? 1 : 0));
          const q = helpers.find((h) => canName(acq, h.id, p.id) || setEdge(h.id, p.id, 'name', 'roll'));
          if (!q) continue;
          (fixed[q.id] as Record<number, Id>)[t] = S;
          planted = true;
          break;
        }
        void planted;
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
          // An innocent nobody may name at the crime's half hour is not across
          // the neighbourhood from the scene the half hour either side of it.
          !(guarded.has(personId) && (t === M - 1 || t === M + 1) && gap(p, L) >= 2),
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

  const guarded = new Set<Id>(plainTier ? [] : cast.innocents.map((p) => p.id).filter((id) => id !== directId));
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
  if (!isMissing && !isMeeting && M + 1 <= TICKS - 1) {
    const placeId = ctx.tropeId === 'body-moved' ? (rng.pick(nonScene) as Id) : L;
    const eligible = cast.people.filter((p) => p.id !== killer.id && p.id !== cast.victim.id);
    let found: { tick: Tick; byId: Id } | undefined;
    for (let t = M + 1; t < TICKS && !found; t++) {
      const here = eligible.find((p) => (truth[p.id] as (Id | null)[])[t] === placeId);
      if (here) found = { tick: t, byId: here.id };
    }
    if (!found) {
      for (let tick = TICKS - 1; tick >= M + 1 && !found; tick--) {
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
    // A case is only a case because somebody walked in on it (M5 §1.3).
    else if (!isRobbery) return fail('nobody could walk in on it');
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
  const claimFor = (personId: Id, block: Tick[], prefer: (c: Id) => number, strictWalk = false): Id | null => {
    const line = truth[personId] as (Id | null)[];
    const mine = claimed[personId] as (Id | null)[];
    const first = block[0] as Tick;
    const last = block[block.length - 1] as Tick;
    const before = first > 0 ? mine[first - 1] : null;
    const after = last < TICKS - 1 ? mine[last + 1] : null;
    const options = nonScene.filter((c) => !block.some((t) => line[t] === c));
    if (options.length === 0) return null;
    // A claim that runs straight on from the span before or after it is a
    // seam the account has to show; somewhere else is better where there is one.
    const scored = rng.shuffle(options).map((c) => ({
      c,
      s: prefer(c) + (walk(before, c) && walk(c, after) ? 1 : strictWalk ? -8 : 0) - (c === before || c === after ? 10 : 0),
    }));
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
  // Raw and Coddled: the culprit claims a room somebody is posted at, and the
  // one posted there knows the culprit, so that one plain word breaks it.
  const postedThrough = (c: Id): boolean => {
    const w = watcherAt(c);
    return w !== undefined && murderCells.every((t) => (truth[w] as (Id | null)[])[t] === c);
  };
  const crimeClaim = claimFor(killer.id, murderCells, (c) =>
    (chains ? (knowerPosted(c, killer.id) ? -5 : 0) : knowerPosted(c, killer.id) ? 2 : 0) +
    (peopledAt(c, murderCells, killer.id) > 0 ? 1 : 0) +
    (teach && postedThrough(c) ? 20 : 0),
    chains,
  );
  if (!crimeClaim) return fail('no room for the culprit to claim');
  if (teach) {
    const w = watcherAt(crimeClaim);
    if (!w || !postedThrough(crimeClaim)) return fail('nobody posted where the culprit claims to have been');
    if (!setEdge(w, killer.id, 'name', 'regular')) return fail('the watcher cannot know the culprit');
  }
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
    const meansClaim = claimFor(killer.id, [killerAccessTick], (c) => (knowerPosted(c, killer.id) ? (chains ? -5 : 2) : 0), chains);
    if (meansClaim) addLie({ personId: killer.id, ticks: [killerAccessTick], claimed: meansClaim, cover: 'means' });
  }
  if (coverSecret && coverTicks.length > 0) {
    const c = claimFor(killer.id, coverTicks, (x) => (knowerPosted(x, killer.id) ? 1 : 0));
    if (c) addLie({ personId: killer.id, ticks: coverTicks, claimed: c, cover: 'secret' });
  }

  // Where the tier wants the culprit's lies broken only by chains: nobody
  // who can name the culprit stands in the claimed room, sees the culprit
  // anywhere else at those half hours, or sees the culprit the half hour
  // either side somewhere across the neighbourhood from the claim.
  if (chains) {
    for (const d of lieDrafts.filter((x) => x.personId === killer.id)) {
      for (const t of d.ticks) {
        for (const q of cast.people) {
          if (q.id === killer.id || q.kind === 'victim') continue;
          if (lyingAt(q.id, t) || (lies[q.id] ?? []).includes(t)) continue;
          const here = (truth[q.id] as (Id | null)[])[t];
          if (!here) continue;
          const sawThere = here === d.claimed || here === (truth[killer.id] as (Id | null)[])[t];
          if (sawThere && canName(acq, q.id, killer.id) && !makeStranger(q.id, killer.id)) {
            return fail('somebody who knows the culprit would break the lie in one line');
          }
        }
        for (const u of [t - 1, t + 1]) {
          if (u < 0 || u >= TICKS || d.ticks.includes(u)) continue;
          const kAt = (truth[killer.id] as (Id | null)[])[u];
          if (!kAt || gap(kAt, d.claimed) < 2) continue;
          for (const q of cast.people) {
            if (q.id === killer.id || q.kind === 'victim') continue;
            if ((truth[q.id] as (Id | null)[])[u] !== kAt || (lies[q.id] ?? []).includes(u)) continue;
            if (canName(acq, q.id, killer.id) && !makeStranger(q.id, killer.id)) {
              return fail('the culprit is seen across the neighbourhood from the claim');
            }
          }
        }
      }
    }
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
        // A room with somebody posted at it knows its regulars, and a regular
        // who was not in is the plainest way a lie breaks.
        const w = watcherAt(c);
        const atCrime = (truth[p.id] as (Id | null)[])[M];
        if (w && !block.some((t) => (truth[p.id] as (Id | null)[])[t] === c) && (atCrime !== c || p.id === directId)) {
          setEdge(w, p.id, 'name', 'regular');
        }
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
      // Lying about the crime's half hour costs a companion their own way
      // clear of the scene, unless a watcher names them there anyway.
      if (d.ticks.includes(M) && q.id !== directId && !plainTier) return false;
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
    const w = watcherAt(d.claimed);
    if (w && ((truth[q.id] as (Id | null)[])[M] !== d.claimed || q.id === directId)) setEdge(w, q.id, 'name', 'regular');
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
  murderSecret.description = isMeeting
    ? `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, and ${cast.victim.surname} is there with ${killer.surname} at ${clock(M)}.`
    : ctx.caseType === 'lost-pet'
      ? `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, and ${cast.victim.surname}’s animal goes out of it at ${clock(M)}.`
      : ctx.caseType === 'lost-item'
        ? `${killer.surname} is at ${placeName(L)} from ${tickRange(murderCells)}, alone with what ${cast.victim.surname} kept there, and it goes at ${clock(M)}.`
        : isRobbery
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
