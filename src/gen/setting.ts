import type { GameObject, Id, Location } from './types.js';
import { LOCATION_TEMPLATES, OPTIONAL_EDGES } from './data/locations.js';
import { OBJECT_TEMPLATES } from './data/objects.js';
import type { MethodTemplate } from './data/methods.js';
import { HOTEL_NAMES } from './data/roles.js';
import type { Rng } from './rng.js';

export interface Setting {
  hotelName: string;
  locations: Location[];
  objects: GameObject[];
  /** Where the method's evidence object lives; also the access requirement. */
  accessLocation: Id;
  evidenceObject: GameObject;
  /** Flavour note about the extra edge, if one was added. */
  extraEdgeNote?: string;
}

export function buildSetting(rng: Rng, method: MethodTemplate): Setting {
  const hotelName = rng.pick(HOTEL_NAMES);

  const locations: Location[] = LOCATION_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    adjacent: t.adjacent.slice(),
    sightlines: t.sightlines.slice(),
    noiseCarriesTo: t.noiseCarriesTo.slice(),
    isPublic: t.isPublic,
    objects: [],
  }));
  const byId: Record<Id, Location> = {};
  for (const l of locations) byId[l.id] = l;

  let extraEdgeNote: string | undefined;
  if (rng.chance(0.6)) {
    const edge = rng.pick(OPTIONAL_EDGES);
    const a = byId[edge.a] as Location;
    const b = byId[edge.b] as Location;
    if (!a.adjacent.includes(b.id)) {
      a.adjacent.push(b.id);
      b.adjacent.push(a.id);
      extraEdgeNote = edge.note;
    }
  }

  // The evidence object decides the access requirement, so place it first.
  const evidenceTemplate = OBJECT_TEMPLATES.find((o) => o.id === method.evidenceObjectId);
  if (!evidenceTemplate) throw new Error(`no object template for ${method.evidenceObjectId}`);
  const allowedHomes = evidenceTemplate.homes.filter((h) => method.accessLocations.includes(h));
  const accessLocation = rng.pick(allowedHomes.length > 0 ? allowedHomes : method.accessLocations);

  const objects: GameObject[] = [
    { id: evidenceTemplate.id, name: evidenceTemplate.name, homeLocation: accessLocation },
  ];

  const others = rng.shuffle(OBJECT_TEMPLATES.filter((o) => o.id !== evidenceTemplate.id));
  const flavourCount = rng.range(7, 10);
  for (const t of others.slice(0, flavourCount)) {
    objects.push({ id: t.id, name: t.name, homeLocation: rng.pick(t.homes) });
  }

  for (const o of objects) {
    const l = byId[o.homeLocation];
    if (l) l.objects.push(o.id);
  }

  const setting: Setting = {
    hotelName,
    locations,
    objects,
    accessLocation,
    evidenceObject: objects[0] as GameObject,
  };
  if (extraEdgeNote !== undefined) setting.extraEdgeNote = extraEdgeNote;
  return setting;
}
