import type { CaseType, FixtureRole, GameObject, Id, PetKind, Place } from './types.js';
import { NEIGHBORHOODS, PLACE_TEMPLATES, type PlaceTemplate } from './data/places.js';
import { LOST_ITEM_IDS, OBJECT_NAMES, PET_OBJECT, SWAG_IDS } from './data/objects.js';
import {
  ITEM_MEANS,
  MEETING_MEANS,
  MISSING_MEANS,
  MURDER_MEANS,
  PET_MEANS,
  ROBBERY_MEANS,
  type MeansTemplate,
} from './data/means.js';
import { ANCHOR_TEMPLATES, canTimeScene, type AnchorTemplate } from './data/anchors.js';
import type { Rng } from './rng.js';
import type { CaseShape } from './shape.js';

/** Which deck the means comes out of, and whether the place has to host it. */
export const MEANS_DECK: Record<CaseType, MeansTemplate[]> = {
  murder: MURDER_MEANS,
  robbery: ROBBERY_MEANS,
  missing: MISSING_MEANS,
  'lost-pet': PET_MEANS,
  'lost-item': ITEM_MEANS,
  affair: MEETING_MEANS,
};

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
  method: MeansTemplate;
  murderPlaceId: Id;
  accessPlaceId: Id;
  nearScene: Id[];
  /** Watchers of the drawn places, in draw order. */
  watchers: { placeId: Id; role: FixtureRole }[];
  hasBeatCop: boolean;
  beatCopRoute: Id[];
  beatCopPhase: number;
  /** Robbery: the thing that was worth taking, put at the scene on purpose. */
  swagId?: Id;
  /** M14, lost pet: what kind of animal it is. */
  pet?: PetKind;
  /** The anchor that puts the victim alive at M − 1. Always place-attached. */
  low: AnchorDraw;
  /** The anchor that times the scene at M. */
  high: AnchorDraw;
  /** An optional third anchor, plus the beat cop's pass if he is on tonight. */
  extra: AnchorDraw[];
  /**
   * The anchor that times the scene is loud enough to bury the killing, so
   * nobody heard it. Decided here, once, and obeyed by the whole derivation.
   */
  soundMasked: boolean;
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

/**
 * M7: any number of cards off the deck, with the shape's count of watchers.
 *
 * The victim's own address is always among them, and every other card that is
 * not watched is somewhere nobody is posted — a scene, a secret's room, an
 * errand. From five places up one of those is a public place with nobody
 * posted at it, as in the six-card draw. Raw and Coddled deal one watcher:
 * with three suspects a second watched room would clear everybody from behind
 * one counter, and the proof would be a single conversation.
 */
function drawPlacesSized(rng: Rng, count: number, watchedRange: [number, number]): PlaceTemplate[] | null {
  const residences = PLACE_TEMPLATES.filter((t) => t.isResidence);
  const publicOpen = PLACE_TEMPLATES.filter((t) => t.kind === 'public' && !watched(t));
  const watchedAny = PLACE_TEMPLATES.filter(watched);
  // The same pools the six-card draw deals from: a semi-public room with
  // nobody posted at it (the union hall, the side chapel) has never been dealt,
  // and its anchors name rooms that would not be in the case.
  const unwatched = PLACE_TEMPLATES.filter(
    (t) => !watched(t) && !t.isResidence && (t.kind === 'private' || t.kind === 'public'),
  );

  const want = Math.min(count - 1, rng.range(watchedRange[0], watchedRange[1]));
  const chosen: PlaceTemplate[] = [rng.pick(residences)];
  const usedRoles = new Set<FixtureRole>();
  for (let i = 0; i < want; i++) {
    const free = watchedAny.filter(
      (t) => !chosen.includes(t) && !usedRoles.has(t.watcher as FixtureRole),
    );
    if (free.length === 0) return null;
    const pick = rng.pick(free);
    usedRoles.add(pick.watcher as FixtureRole);
    chosen.push(pick);
  }
  if (count >= 5 && chosen.length < count) chosen.push(rng.pick(publicOpen));
  while (chosen.length < count) {
    const free = unwatched.filter((t) => !chosen.includes(t));
    if (free.length === 0) return null;
    chosen.push(rng.pick(free));
  }
  return rng.shuffle(chosen);
}

interface Scene {
  method: MeansTemplate;
  murderPlaceId: Id;
  accessPlaceId: Id;
}

/**
 * A means needs a place that can host it and a *different* drawn place where
 * the thing it needs lived, because the access leg of the proof is the actor
 * being seen fetching it.
 *
 * M5: only a murder is gated on `murderMethods`. A room can be broken into or
 * walked out of whether or not anybody could be killed in it; what still has
 * to be true is that the actor was alone there, which is why a watched place
 * is never the scene in any of the three.
 */
function chooseScene(
  rng: Rng,
  drawn: PlaceTemplate[],
  means: MeansTemplate[],
  gated: boolean,
  home = false,
  away = false,
): Scene | null {
  const options: Scene[] = [];
  for (const scene of drawn) {
    // M14: a pet goes missing from where it lives, which is the owner's.
    if (home && scene.isResidence !== true) continue;
    // M14: and an affair is never carried on at home, where the client lives.
    if (away && scene.isResidence === true) continue;
    // A watched place cannot be the scene: the watcher would be standing in
    // the room, which breaks "alone with the victim" and finds the body an
    // hour early.
    if (scene.watcher !== undefined) continue;
    const allowed = gated
      ? means.filter((m) => scene.murderMethods.includes(m.id))
      : means;
    for (const method of allowed) {
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

export function buildSetting(
  rng: Rng,
  caseType: CaseType = 'murder',
  tropeId = 'body-at-scene',
  shape?: CaseShape,
): Setting | null {
  const neighborhood = rng.pick(NEIGHBORHOODS);

  // M7: six cards is today's draw, untouched. Any other count is the sized one.
  const drawn =
    shape === undefined || shape.places === 6
      ? drawPlaces(rng)
      : drawPlacesSized(rng, shape.places, shape.watched);
  if (!drawn) return null;

  // M14: the animal comes first, because the way out has to suit it.
  let pet: PetKind | undefined;
  if (caseType === 'lost-pet') {
    const roll = rng.next();
    pet = roll < 0.45 ? 'dog' : roll < 0.75 ? 'cat' : roll < 0.95 ? 'parrot' : 'goat';
  }
  const deck = MEANS_DECK[caseType].filter((m) => pet === undefined || m.pets === undefined || m.pets.includes(pet));
  const scene = chooseScene(rng, drawn, deck, caseType === 'murder', caseType === 'lost-pet', caseType === 'affair');
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
  // M5: a theft needs something worth stealing, and the room deck does not
  // deal one reliably. A robbery puts exactly one at the scene, on purpose.
  let swagId: Id | undefined;
  if (caseType === 'robbery') {
    swagId = tropeId === 'payroll' ? 'obj-payroll' : rng.pick(SWAG_IDS.slice(1));
    objects.push({
      id: swagId,
      name: OBJECT_NAMES[swagId] as string,
      homePlace: scene.murderPlaceId,
    });
    usedObjects.add(swagId);
  }
  // M14: the animal, or the ring, is at the scene on purpose too. Neither is
  // on any place card, so no other draw moves.
  if (caseType === 'lost-pet' || caseType === 'lost-item') {
    swagId = pet !== undefined ? PET_OBJECT[pet] : rng.pick(LOST_ITEM_IDS);
    objects.push({ id: swagId, name: OBJECT_NAMES[swagId] as string, homePlace: scene.murderPlaceId });
    usedObjects.add(swagId);
  }
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
      shortName: t.shortName,
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
    soundMasked: high.template.masks,
    ...(swagId === undefined ? {} : { swagId }),
    ...(pet === undefined ? {} : { pet }),
  };
}
