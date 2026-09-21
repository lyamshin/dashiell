import type { FixtureRole, GameObject, Id, Place } from './types.js';
import { NEIGHBORHOODS, PLACE_TEMPLATES, type PlaceTemplate } from './data/places.js';
import { OBJECT_NAMES } from './data/objects.js';
import { METHOD_TEMPLATES, type MethodTemplate } from './data/methods.js';
import { ANCHOR_TEMPLATES, canTimeScene, type AnchorTemplate } from './data/anchors.js';
import type { Rng } from './rng.js';

/** An anchor with a home but not yet a time. Ticks arrive once M is chosen. */
export interface AnchorDraw {
  template: AnchorTemplate;
  placeId?: Id;
}

export interface Setting {
  neighborhood: string;
  places: Place[];
  templates: Record<Id, PlaceTemplate>;
  objects: GameObject[];
  method: MethodTemplate;
  murderPlaceId: Id;
  accessPlaceId: Id;
  nearScene: Id[];
  /** Watchers of the drawn places, in draw order. */
  watchers: { placeId: Id; role: FixtureRole }[];
  hasBeatCop: boolean;
  beatCopRoute: Id[];
  beatCopPhase: number;
  /** The anchor that puts the victim alive at M − 1. Always place-attached. */
  low: AnchorDraw;
  /** The anchor that times the scene at M. */
  high: AnchorDraw;
  /** An optional third anchor, plus the beat cop's pass if he is on tonight. */
  extra: AnchorDraw[];
}

const watched = (t: PlaceTemplate): boolean => t.watcher !== undefined;

/**
 * Six cards off the deck: at least two private, at least three watched, at
 * least one public and unwatched, and the victim's own address among them.
 *
 * A four-watcher draw needs one of the watched places to be private, since six
 * cards will not otherwise stretch to two privates, four watchers and an open
 * public place at once.
 */
function drawPlaces(rng: Rng): PlaceTemplate[] | null {
  const residences = PLACE_TEMPLATES.filter((t) => t.isResidence);
  const publicOpen = PLACE_TEMPLATES.filter((t) => t.kind === 'public' && !watched(t));
  const watchedAny = PLACE_TEMPLATES.filter(watched);
  const privateUnwatched = PLACE_TEMPLATES.filter(
    (t) => t.kind === 'private' && !watched(t) && !t.isResidence,
  );

  const residence = rng.pick(residences);
  const open = rng.pick(publicOpen);

  const wantFour = rng.chance(0.5);
  const chosen: PlaceTemplate[] = [residence, open];
  const usedRoles = new Set<FixtureRole>();

  const takeWatched = (pool: PlaceTemplate[]): PlaceTemplate | null => {
    const free = pool.filter(
      (t) => !chosen.includes(t) && !usedRoles.has(t.watcher as FixtureRole),
    );
    if (free.length === 0) return null;
    const pick = rng.pick(free);
    usedRoles.add(pick.watcher as FixtureRole);
    return pick;
  };

  if (wantFour) {
    const privateWatched = takeWatched(watchedAny.filter((t) => t.kind === 'private'));
    if (!privateWatched) return null;
    chosen.push(privateWatched);
    for (let i = 0; i < 3; i++) {
      const p = takeWatched(watchedAny);
      if (!p) return null;
      chosen.push(p);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const p = takeWatched(watchedAny);
      if (!p) return null;
      chosen.push(p);
    }
    const extraPrivate = privateUnwatched.filter((t) => !chosen.includes(t));
    if (extraPrivate.length === 0) return null;
    chosen.push(rng.pick(extraPrivate));
  }

  if (chosen.length !== 6) return null;
  if (chosen.filter((t) => t.kind === 'private').length < 2) return null;
  if (chosen.filter(watched).length < 3) return null;
  if (!chosen.some((t) => t.kind === 'public' && !watched(t))) return null;
  return rng.shuffle(chosen);
}

interface Scene {
  method: MethodTemplate;
  murderPlaceId: Id;
  accessPlaceId: Id;
}

/**
 * A method needs a place that can host it and a *different* drawn place where
 * its weapon lived, because the access leg of the proof is the killer being
 * seen fetching it.
 */
function chooseScene(rng: Rng, drawn: PlaceTemplate[]): Scene | null {
  const options: Scene[] = [];
  for (const scene of drawn) {
    // A watched place cannot be the scene: the watcher would be standing in
    // the room, which breaks "alone with the victim" and finds the body an
    // hour early.
    if (scene.watcher !== undefined) continue;
    for (const methodId of scene.murderMethods) {
      const method = METHOD_TEMPLATES.find((m) => m.id === methodId);
      if (!method) continue;
      for (const home of drawn) {
        if (home.id === scene.id) continue;
        if (!home.objects.includes(method.evidenceObjectId)) continue;
        options.push({ method, murderPlaceId: scene.id, accessPlaceId: home.id });
      }
    }
  }
  if (options.length === 0) return null;
  // Flatten by scene first so a place that hosts five methods is not five
  // times as likely to be the scene as one that hosts one.
  const scenes = Array.from(new Set(options.map((o) => o.murderPlaceId)));
  const sceneId = rng.pick(scenes);
  return rng.pick(options.filter((o) => o.murderPlaceId === sceneId));
}

function attachable(t: AnchorTemplate, p: PlaceTemplate): boolean {
  if (t.attachesTo !== 'place') return false;
  if (!p.anchorsHosted.includes(t.id)) return false;
  if (t.placeKinds && !t.placeKinds.includes(p.kind)) return false;
  return true;
}

export function buildSetting(rng: Rng): Setting | null {
  const neighborhood = rng.pick(NEIGHBORHOODS);

  const drawn = drawPlaces(rng);
  if (!drawn) return null;

  const scene = chooseScene(rng, drawn);
  if (!scene) return null;

  /* --- who is posted where ------------------------------------------- */
  const watchers = drawn
    .filter(watched)
    .map((t) => ({ placeId: t.id, role: t.watcher as FixtureRole }));
  const hasBeatCop = rng.chance(0.45);
  const copRoutePool = drawn.filter(
    (t) => t.kind !== 'private' && t.id !== scene.murderPlaceId,
  );
  const beatCopRoute = hasBeatCop && copRoutePool.length > 0 ? rng.shuffle(copRoutePool).map((t) => t.id) : [];
  const beatCopPhase = rng.int(3);
  const copOn = hasBeatCop && beatCopRoute.length > 0;

  /* --- nearby the scene ------------------------------------------------ */
  const nearPool = drawn.filter((t) => t.id !== scene.murderPlaceId);
  const nearPreferred = nearPool.filter((t) => t.kind !== 'private');
  const nearScene = rng
    .pickN(nearPreferred.length >= 2 ? nearPreferred : nearPool, 2)
    .map((t) => t.id);

  /* --- anchors ---------------------------------------------------------- */
  const lowOptions: AnchorDraw[] = [];
  for (const p of drawn) {
    if (!watched(p) || p.id === scene.murderPlaceId) continue;
    for (const t of ANCHOR_TEMPLATES) {
      if (t.id === 'cop-pass') continue;
      if (attachable(t, p)) lowOptions.push({ template: t, placeId: p.id });
    }
  }
  if (lowOptions.length === 0) return null;
  const low = rng.pick(lowOptions);

  const highOptions: AnchorDraw[] = [];
  for (const t of ANCHOR_TEMPLATES) {
    if (t.id === low.template.id || t.id === 'cop-pass') continue;
    if (!canTimeScene(t)) continue;
    if (t.attachesTo === 'neighborhood') {
      highOptions.push({ template: t });
      continue;
    }
    for (const p of drawn) {
      if (p.id !== scene.murderPlaceId && !nearScene.includes(p.id)) continue;
      if (attachable(t, p)) highOptions.push({ template: t, placeId: p.id });
    }
  }
  if (highOptions.length === 0) return null;
  const high = rng.pick(highOptions);

  const extra: AnchorDraw[] = [];
  const copTemplate = ANCHOR_TEMPLATES.find((t) => t.id === 'cop-pass') as AnchorTemplate;
  if (copOn) extra.push({ template: copTemplate });
  else if (rng.chance(0.55)) {
    const used = new Set([low.template.id, high.template.id]);
    const spare: AnchorDraw[] = [];
    for (const t of ANCHOR_TEMPLATES) {
      if (used.has(t.id) || t.id === 'cop-pass') continue;
      if (t.attachesTo === 'neighborhood') {
        spare.push({ template: t });
        continue;
      }
      for (const p of drawn) if (attachable(t, p)) spare.push({ template: t, placeId: p.id });
    }
    if (spare.length > 0) extra.push(rng.pick(spare));
  }

  /* --- what is lying about --------------------------------------------- */
  const objects: GameObject[] = [];
  const usedObjects = new Set<Id>();
  objects.push({
    id: scene.method.evidenceObjectId,
    name: OBJECT_NAMES[scene.method.evidenceObjectId] as string,
    homePlace: scene.accessPlaceId,
  });
  usedObjects.add(scene.method.evidenceObjectId);
  for (const t of drawn) {
    const want = rng.range(2, 3);
    const pool = rng.shuffle(t.objects.filter((o) => !usedObjects.has(o)));
    for (const id of pool.slice(0, want)) {
      usedObjects.add(id);
      objects.push({ id, name: OBJECT_NAMES[id] as string, homePlace: t.id });
    }
  }

  const places: Place[] = drawn.map((t) => {
    const place: Place = {
      id: t.id,
      name: t.name,
      kind: t.kind,
      objects: objects.filter((o) => o.homePlace === t.id).map((o) => o.id),
      isResidence: t.isResidence === true,
      nearScene: nearScene.includes(t.id),
    };
    if (t.watcher !== undefined) place.watcher = t.watcher;
    return place;
  });

  const templates: Record<Id, PlaceTemplate> = {};
  for (const t of drawn) templates[t.id] = t;

  return {
    neighborhood,
    places,
    templates,
    objects,
    method: scene.method,
    murderPlaceId: scene.murderPlaceId,
    accessPlaceId: scene.accessPlaceId,
    nearScene,
    watchers,
    hasBeatCop: copOn,
    beatCopRoute,
    beatCopPhase,
    low,
    high,
    extra,
  };
}
