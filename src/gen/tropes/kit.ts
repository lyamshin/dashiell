import {
  clock,
  type Act,
  type CaseType,
  type Clue,
  type Entry,
  type Fact,
  type GameObject,
  type Givens,
  type Id,
  type Method,
  type Person,
  type Tick,
  type Unknown,
} from '../types.js';
import type { Cast } from '../cast.js';
import type { Setting } from '../setting.js';
import type { ScheduleBuild } from '../schedule.js';
import type { MeansTemplate } from '../data/means.js';
import type { Requirement } from '../select.js';
import type { Rng } from '../rng.js';

/**
 * M5 §2.3. Each trope adds one signature clue pattern, so that a case reads as
 * its own kind of story rather than as the same machine with a different label
 * on it: the body that was moved leaves marks on the stairs and a cab that
 * took a heavy fare; the locked room has one key and somebody who had it; the
 * frame plants the weapon and a provenance clue unwinds it.
 *
 * A signature is two clues from two independent sources carrying one essential
 * fact, declared as a `Requirement` so the selector puts one of them in the
 * spine and the other in the corroboration. That is deliberately cheap: the
 * spine already runs to eleven or twelve clues against a cap of fifteen, and a
 * signature that cost four would push it over.
 */

/** Everything a trope needs to shape the act, once the schedules are built. */
export interface ShapeContext {
  rng: Rng;
  setting: Setting;
  cast: Cast;
  build: ScheduleBuild;
  method: Method;
  means: MeansTemplate;
  objects: GameObject[];
  coronerWindow: [Tick, Tick];
}

export interface TropeShape {
  bodyFoundAt?: Id;
  taken?: GameObject;
  entry?: Entry;
  goodsWentTo?: Id;
  whereabouts?: Id | 'gone';
  fate?: 'left' | 'taken' | 'dead';
}

/** Everything a trope needs to write its givens and its signature clues. */
export interface TropeContext extends ShapeContext {
  act: Act;
  /** Short name. Always: the full name of a place is a sheet thing. */
  placeName: (id: Id | null | undefined) => string;
  /** Surname. */
  who: (id: Id) => string;
  /** Where the detective finds this person tomorrow. */
  foundAt: (id: Id) => Id;
  /** Where somebody truly was. */
  at: (id: Id, t: Tick) => Id | null;
  /** Is this person telling the truth about this tick? */
  truthful: (id: Id, t: Tick) => boolean;
  /** Mint a clue. Ids are `t001`..., distinct from the main pool's `c001`. */
  add: (
    kind: Clue['kind'],
    source: Clue['source'],
    place: Id,
    establishes: Fact[],
    text: string,
  ) => Clue;
}

export interface Signature {
  clues: Clue[];
  /** The essential fact this trope's proof turns on. */
  requirement: Requirement;
}

export interface Trope {
  id: Id;
  type: CaseType;
  /** Relative frequency at the default settings. */
  weight: number;
  /** One line for the sheet's header. */
  label: string;
  /** Exactly what the report asks. Everything else is a given. */
  unknowns: Unknown[];
  shape: (ctx: ShapeContext) => TropeShape;
  givens: (ctx: TropeContext) => Givens;
  signature: (ctx: TropeContext) => Signature;
}

/* ---------------------------------------------------------------- helpers */

/** "9:00 PM to 10:00 PM", or a single time when the window is one tick. */
export function window(lo: Tick, hi: Tick): string {
  return lo === hi ? clock(lo) : `${clock(lo)} and ${clock(hi)}`;
}

/** A drawn place that is not the scene, preferring one nobody is posted at. */
export function elsewhere(ctx: ShapeContext, exclude: Id[] = []): Id {
  const banned = new Set([ctx.build.murderPlaceId, ...exclude]);
  const all = ctx.setting.places.filter((p) => !banned.has(p.id));
  const quiet = all.filter((p) => p.watcher === undefined);
  const pool = quiet.length > 0 ? quiet : all;
  return (ctx.rng.pick(pool.length > 0 ? pool : ctx.setting.places) as { id: Id }).id;
}

/**
 * What the thief came for. A robbery has one thing at the scene that is worth
 * the trouble — the setting puts it there on purpose, because a case about a
 * theft cannot turn on whatever the room deck happened to deal.
 */
export function stealable(ctx: ShapeContext): GameObject {
  const swag = ctx.objects.find((o) => o.id === ctx.setting.swagId);
  if (swag) return swag;
  const here = ctx.objects.filter(
    (o) => o.homePlace === ctx.build.murderPlaceId && o.id !== ctx.method.evidenceObjectId,
  );
  if (here.length > 0) return ctx.rng.pick(here);
  const any = ctx.objects.filter((o) => o.id !== ctx.method.evidenceObjectId);
  return ctx.rng.pick(any.length > 0 ? any : ctx.objects);
}

/** Two people who are not the actor and can each carry one signature clue. */
export function twoSources(ctx: TropeContext): [Person, Person] {
  const pool = ctx.cast.people.filter(
    (p) => p.kind === 'fixture' || (p.kind === 'suspect' && p.id !== ctx.cast.killer.id),
  );
  const shuffled = ctx.rng.shuffle(pool);
  const a = shuffled[0] as Person;
  const b = (shuffled[1] ?? a) as Person;
  return [a, b];
}

/** One requirement, two routes, over the clues a signature just minted. */
export function essential(id: string, label: string, clues: Clue[]): Requirement {
  return {
    id: `trope:${id}`,
    label,
    routes: Math.min(2, new Set(clues.map((c) => c.id)).size),
    parts: [{ key: `trope:${id}`, clues }],
  };
}
