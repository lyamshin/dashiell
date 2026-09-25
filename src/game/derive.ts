/**
 * Everything the game needs that the generator does not hand it.
 *
 * `src/gen/` is consumed read-only. Every function here is pure and derived
 * from a `Case`; none of them changes generator behaviour, and none of them
 * invents a fact. The list of what is derived here, for the milestone notes:
 *
 * 1. **The topic catalogue.** The generator writes a clue's topic as free
 *    prose ("Brauer’s account", "the fight card on the bar radio"). A typed
 *    prompt needs a finite vocabulary, so every topic string is read back into
 *    the player-facing topics the spec lists: a surname, a place, an object,
 *    an anchor, "why I was hired". The exact string survives alongside them so
 *    that a lead the player clicks is unambiguous.
 * 2. **The claimed account.** `ask X about that evening` is answered from
 *    `Schedule.claimed`, which the generator computes but never makes findable.
 *    It is a pseudo-clue: it costs an action, always works, and is how alibis
 *    enter the game.
 * 3. **Threads.** `Clue.leadsTo` is a list of ids; a lead the player can act on
 *    is a sentence and a command, derived from the target clue's source.
 * 4. **Presence.** Who is standing where, from `Person.foundAt`.
 * 5. **The established board.** The coroner's window narrowed by what has been
 *    found, and the contradictions between a claim and an observation.
 * 6. **Clickable nouns.** Where in a clue's text a name, a room, an object or
 *    an anchor appears.
 * 7. **The report's dropdowns.** The six methods and the motive types are the
 *    generator's own data tables, read directly.
 */

import type {
  Anchor,
  Case,
  Clue,
  GameObject,
  Id,
  Person,
  Place,
  Tick,
} from '../gen/types.js';
import { TICKS, clock, isTheft, type CaseType } from '../gen/types.js';
import { Rng } from '../gen/rng.js';
import { METHOD_TEMPLATES } from '../gen/data/methods.js';
import { AFFAIR_MOTIVES, MOTIVE_TEMPLATES, MUNDANE_MOTIVES } from '../gen/data/motives.js';
import { computePar } from '../gen/select.js';
import { OFFICE_KINDS, OFFICE_STREETS, OFFICE_TRADES } from './voice-data.js';
import type { TopicRef } from './types.js';

export const METHOD_POOL = METHOD_TEMPLATES.map((m) => ({ id: m.id, name: m.name }));
/** Every reason the generator can deal, for looking one up by its type. */
export const MOTIVE_POOL = [...MOTIVE_TEMPLATES, ...MUNDANE_MOTIVES, ...AFFAIR_MOTIVES].map((m) => ({
  type: m.type,
  description: m.description,
}));

/**
 * M14: what the notebook calls the person the case is about. Nobody died in a
 * lost-pet or lost-item case, and an affair's is a husband or a wife.
 */
export function victimWord(type: CaseType): string {
  return type === 'lost-pet' || type === 'lost-item' ? 'the owner' : type === 'affair' ? 'the one it is about' : 'the victim';
}

/**
 * M14: the reasons the report offers for a case of this type. A lost dog's
 * report offers spite and pride, not an inheritance; an affair never asks.
 */
export function motivePoolFor(type: CaseType): { type: string; description: string }[] {
  const pick = type === 'lost-pet' || type === 'lost-item' ? MUNDANE_MOTIVES : type === 'affair' ? AFFAIR_MOTIVES : MOTIVE_TEMPLATES;
  return pick.map((m) => ({ type: m.type, description: m.description }));
}

export function topicKey(t: TopicRef): string {
  switch (t.kind) {
    case 'person':
      return `person:${t.id}`;
    case 'place':
      return `place:${t.id}`;
    case 'object':
      return `object:${t.id}`;
    case 'anchor':
      return `anchor:${t.id}`;
    case 'evening':
      return 'evening';
    case 'self':
      return 'self';
    case 'hire':
      return 'hire';
    case 'exact':
      return `exact:${t.personId}|${t.topic}`;
  }
}

const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Does `haystack` contain `needle` as a whole word? */
function hasWord(haystack: string, needle: string): boolean {
  if (needle.length === 0) return false;
  const i = haystack.indexOf(needle);
  if (i < 0) return false;
  const before = i === 0 ? ' ' : haystack[i - 1] ?? ' ';
  const after = haystack[i + needle.length] ?? ' ';
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

/* ------------------------------------------------------------------ *
 * M4b §B.1 — the seventh place.
 * ------------------------------------------------------------------ */

/**
 * The office is Dashiell's and it is not the generator's business. It is
 * private, unwatched, never the scene, holds no findable clue, and is not
 * counted against the place slider — the generator still draws six rooms and
 * still computes par over those six. It exists so that a case can start where
 * a case starts: at a desk, at midnight, with somebody on the stairs.
 */
export const OFFICE_ID = 'dashiell-office';

/**
 * Its full name varies with the neighbourhood and with the kind of place it
 * is — "a room at the top of a walk-up on Rivington Street", "two rooms over a
 * tailor's on Rivington Street", "the front room of my flat on Mulberry
 * Street" (`OFFICE_KINDS`) — and is fixed per case, because a detective does
 * not move office between page one and page two. Its own stream, so nothing
 * else in the case moves with it.
 */
export function officeName(kase: Case): string {
  const street = OFFICE_STREETS[kase.neighborhood] ?? 'Great Jones Street';
  const rng = new Rng((kase.seed * 2246822507 + 0x0ff1ce) >>> 0);
  const trade = rng.pick(OFFICE_TRADES);
  // The kind of place on a stream of its own, mixed hard from the seed: the
  // stream above hands neighbouring seeds neighbouring first draws, and three
  // cases running opened on the same kind of room.
  let h = 2166136261 ^ kase.seed;
  for (const c of `office|${kase.seed}|${kase.neighborhood}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const own = new Rng(h >>> 0);
  own.next();
  const kind = own.pick(OFFICE_KINDS);
  return own.pick(kind.names).split('{trade}').join(trade).split('{street}').join(street);
}

export function buildOffice(kase: Case): Place {
  // One of the generator's thirty-odd rooms is "the office over the tailor's",
  // and it is called "the office" too. Two rooms with one short name is a
  // prompt that cannot be typed into, so his own becomes "my office" on the
  // nights the case drew that one. Everywhere else it is what §B.1 asks for.
  const taken = kase.places.some((p) => p.shortName === 'the office');
  return {
    id: OFFICE_ID,
    name: officeName(kase),
    shortName: taken ? 'my office' : 'the office',
    kind: 'private',
    objects: [],
    isResidence: false,
    nearScene: false,
  };
}

/**
 * M5 §6 — where the night's first room is.
 *
 * For every trope but one it is the scene: the room the act happened in, which
 * is where the free scene report and the coroner's note are handed over. For
 * `body-moved` it is the stair or the areaway the body was carried to, because
 * the case is about the fact that those are not the same room. The player
 * starts where the precinct started, and `where` — the fourth unknown that
 * trope asks — is a real question rather than a room he is already standing in.
 */
export function startPlaceOf(kase: Case): Id {
  const act = kase.act;
  if (act.tropeId === 'body-moved' && act.bodyFoundAt && act.bodyFoundAt !== act.place) {
    return act.bodyFoundAt;
  }
  // M14: an affair opens where they said they would be.
  if (act.type === 'affair' && act.claimedAt && act.claimedAt !== act.place) return act.claimedAt;
  return kase.solution.murderPlaceId;
}

/**
 * M4b §B.3, M5 §6 — par and budget in the game.
 *
 * The generator does not change. What changes is that the night opens one room
 * away from everything: the walk from the office to the first room is an
 * action the generator never counted, so the game adds one.
 *
 * And, since M5, the first room is not always the generator's scene. Par is a
 * statement about routes, so when the route starts somewhere else the route is
 * costed again from there, with the generator's own exhaustive search. For
 * every trope but `body-moved` this returns the number the generator wrote
 * down; for `body-moved` it is that number plus whatever the walk to the true
 * scene costs, and the oracle is held to it.
 */
export function caseParFrom(kase: Case, startId: Id): number {
  // M9: a tiered case's par is walked from the night's first room already,
  // over the oracle's groups rather than one clue at a time, and counts the
  // confrontations its par route needs (`src/gen/logic/select.ts`).
  if (kase.logic) return kase.par;
  const spine = kase.findable.filter((c) => c.role === 'spine');
  const starting = new Set(kase.starting);
  const cost = computePar(
    spine,
    starting,
    kase.places.map((p) => p.id),
    startId,
  );
  return Number.isFinite(cost) ? cost : kase.par;
}

/**
 * docs/38: the things the notebook knows are not where they belong — the
 * one the case is about (the cat, the watch), and anything a find in hand
 * says is missing. A room's list of things, and its buttons, leave them out:
 * a page never goes through a bottle it has just said was gone.
 */
export function goneObjects(kase: Case, found: readonly Id[]): Set<Id> {
  const out = new Set<Id>();
  if (kase.act.taken?.id) out.add(kase.act.taken.id);
  const have = new Set(found);
  for (const c of kase.findable) {
    if (!have.has(c.id)) continue;
    for (const f of c.establishes) if (f.kind === 'objectMissing') out.add(f.objectId);
  }
  return out;
}

export function gamePar(kase: Case): number {
  const start = startPlaceOf(kase);
  if (start === kase.solution.murderPlaceId) return kase.par + 1;
  return caseParFrom(kase, start) + 1;
}

/** How much the start moving off the scene cost this case. Zero for seven tropes. */
export function parShift(kase: Case): number {
  return gamePar(kase) - (kase.par + 1);
}

export function gameBudget(kase: Case): number {
  return kase.budget + 1 + parShift(kase);
}

export interface CaseView {
  kase: Case;
  /** Where the act happened. The answer to `where`, when `where` is asked. */
  sceneId: Id;
  /**
   * M5 §6: the room the night opens in and where the free report is handed
   * over. The scene, except for `body-moved`, where it is the stair the body
   * was carried to.
   */
  startId: Id;
  /** The office (§B.1). Not in `kase.places`; always in `view.places`. */
  office: Place;
  /** The case's six rooms and the office, which is the list the game walks. */
  places: Place[];
  victim: Person;
  client: Person;
  placeById: Map<Id, Place>;
  personById: Map<Id, Person>;
  objectById: Map<Id, GameObject>;
  anchorById: Map<Id, Anchor>;
  findableById: Map<Id, Clue>;
  /** Who the detective finds where, the day after. */
  peopleAt: Map<Id, Id[]>;
  /** Findable clues whose source is the room itself. */
  placeClues: Map<Id, Clue[]>;
  /** Findable person clues: who is asked, then the exact topic string. */
  exactBuckets: Map<Id, Map<string, Clue[]>>;
  /** For each findable person clue, every player-facing topic it answers. */
  answers: Map<Id, string[]>;
  /** Claimed schedule, by person. */
  claimedOf: Map<Id, (Id | null)[]>;
  liesOf: Map<Id, Set<Tick>>;
  truthOf: Map<Id, (Id | null)[]>;
}

export function buildView(kase: Case): CaseView {
  const office = buildOffice(kase);
  const places = [...kase.places, office];
  const placeById = new Map(places.map((p) => [p.id, p]));
  const personById = new Map(kase.people.map((p) => [p.id, p]));
  const objectById = new Map(kase.objects.map((o) => [o.id, o]));
  const anchorById = new Map(kase.anchors.map((a) => [a.templateId, a]));
  const findableById = new Map(kase.findable.map((c) => [c.id, c]));
  const victim = kase.people.find((p) => p.kind === 'victim') as Person;
  const client = personById.get(kase.clientId) as Person;

  const peopleAt = new Map<Id, Id[]>();
  for (const p of places) peopleAt.set(p.id, []);
  for (const p of kase.people) {
    if (!p.foundAt) continue;
    peopleAt.get(p.foundAt)?.push(p.id);
  }
  // M5 §7. The generator never gives the victim an address for the next day,
  // because in two cases out of three there is no next day for them. In a
  // robbery there is: the owner of the stolen thing had an evening like
  // anybody else's and is standing somewhere in the morning. In a
  // disappearance there is one too, once somebody has been found — and until
  // then `peopleHereNow` keeps them off the page.
  const victimPerson = kase.people.find((p) => p.kind === 'victim');
  const victimPlace = victimAddress(kase);
  if (victimPerson && victimPlace && peopleAt.has(victimPlace)) {
    (peopleAt.get(victimPlace) as Id[]).push(victimPerson.id);
  }

  const placeClues = new Map<Id, Clue[]>();
  const exactBuckets = new Map<Id, Map<string, Clue[]>>();
  const answers = new Map<Id, string[]>();

  for (const c of kase.findable) {
    if (c.source.type === 'place') {
      const list = placeClues.get(c.place) ?? [];
      list.push(c);
      placeClues.set(c.place, list);
      continue;
    }
    const owned = exactBuckets.get(c.source.personId) ?? new Map<string, Clue[]>();
    const list = owned.get(c.source.topic) ?? [];
    list.push(c);
    owned.set(c.source.topic, list);
    exactBuckets.set(c.source.personId, owned);
  }

  const claimedOf = new Map<Id, (Id | null)[]>();
  const truthOf = new Map<Id, (Id | null)[]>();
  const liesOf = new Map<Id, Set<Tick>>();
  for (const s of kase.schedules) {
    claimedOf.set(s.personId, s.claimed);
    truthOf.set(s.personId, s.truth);
    liesOf.set(s.personId, new Set(s.lies));
  }
  // M9 (gen notes §13.1): a tiered case's account is a clue of its own, and
  // what a person claims is exactly what that clue says — nothing of the
  // schedule it does not print. A person with no account clue claims nothing.
  if (kase.logic) {
    for (const s of kase.schedules) {
      const account = kase.findable.find(
        (c) => c.kind === 'account' && c.source.type === 'person' && c.source.personId === s.personId,
      );
      const claimed: (Id | null)[] = Array.from({ length: TICKS }, () => null);
      for (const f of account?.establishes ?? []) {
        if (f.kind !== 'claims') continue;
        for (const t of f.ticks) if (t >= 0 && t < TICKS) claimed[t] = f.place;
      }
      claimedOf.set(s.personId, claimed);
    }
  }

  const view: CaseView = {
    kase,
    sceneId: kase.solution.murderPlaceId,
    startId: startPlaceOf(kase),
    office,
    places,
    victim,
    client,
    placeById,
    personById,
    objectById,
    anchorById,
    findableById,
    peopleAt,
    placeClues,
    exactBuckets,
    answers,
    claimedOf,
    liesOf,
    truthOf,
  };

  for (const c of kase.findable) {
    if (c.source.type !== 'person') continue;
    answers.set(c.id, topicsAnsweredBy(c, view));
  }
  return view;
}

/**
 * Which player-facing topics a clue answers, read out of the generator's topic
 * prose. The generator writes five shapes: a surname; "<surname>’s account";
 * "<victim> that evening"; "the noise that evening"; an anchor's name; "<A>
 * and <B>"; and "why I was hired". Every one of them is reachable from the
 * vocabulary the spec gives the prompt, and a test asserts that over the
 * corpus: no findable clue is ever unreachable.
 */
export function topicsAnsweredBy(clue: Clue, view: CaseView): string[] {
  if (clue.source.type !== 'person') return [];
  const raw = clue.source.topic;
  const t = fold(raw);
  const out = new Set<string>([`exact:${clue.source.personId}|${raw}`]);

  for (const p of view.kase.people) {
    if (hasWord(t, fold(p.surname))) out.add(`person:${p.id}`);
  }
  for (const a of view.kase.anchors) {
    if (t.includes(fold(a.name))) out.add(`anchor:${a.templateId}`);
  }
  for (const pl of view.places) {
    // A named place's running name is read as a word ("the El" is not "the elevator man").
    if (pl.names ? hasWord(t, fold(pl.shortName)) : t.includes(fold(pl.shortName))) out.add(`place:${pl.id}`);
  }
  for (const o of view.kase.objects) {
    if (t.includes(fold(o.name))) out.add(`object:${o.id}`);
  }
  if (t.includes('why i was hired')) out.add('hire');
  // "the noise that evening" is a shot heard from somewhere else. The thing it
  // is about is the scene, and the scene's short name is what a player types.
  if (t.includes('noise')) {
    out.add(`place:${view.sceneId}`);
    out.add(`person:${view.victim.id}`);
  }
  return [...out];
}

/**
 * Where the victim is the morning after, in the two cases where they are
 * somewhere. A robbery's owner is wherever their evening left them; a missing
 * person is at their whereabouts, if it is a room and not the wind.
 */
export function victimAddress(kase: Case): Id | null {
  const act = kase.act;
  if (isTheft(act.type)) {
    const line = kase.schedules.find((s) => s.personId === kase.people.find((p) => p.kind === 'victim')?.id);
    const last = [...(line?.truth ?? [])].reverse().find((p) => p !== null) ?? null;
    return last ?? kase.places.find((p) => p.isResidence)?.id ?? null;
  }
  if (act.type === 'missing') {
    return act.whereabouts && act.whereabouts !== 'gone' ? act.whereabouts : null;
  }
  return null;
}

/**
 * M5 §7 — can the detective put a question to the victim tonight?
 *
 * A murder's victim never. A robbery's owner always: they are alive, they are
 * at an address, and the engine must never say otherwise. A missing person
 * only once the case has put them somewhere after the hour they vanished —
 * which is what the whole of `left` is about, and is the one door the trope's
 * sightings open.
 */
export function victimReachable(kase: Case, found: readonly Id[]): boolean {
  // M14: the owner of a lost dog or a lost ring is at home and will talk. The
  // one an affair is about does not talk to a detective their husband or wife
  // hired, and is never in a room he walks into.
  if (isTheft(kase.act.type)) return true;
  if (kase.act.type !== 'missing') return false;
  const victimId = kase.people.find((p) => p.kind === 'victim')?.id;
  if (!victimId) return false;
  const byId = new Map(kase.findable.map((c) => [c.id, c]));
  for (const id of found) {
    for (const f of byId.get(id)?.establishes ?? []) {
      if (f.kind === 'personAt' && f.personId === victimId && f.tick > kase.act.tick) return true;
    }
  }
  return false;
}

/** Everyone the detective can walk up to at `placeId`. Never the victim. */
export function peopleHere(view: CaseView, placeId: Id, found: readonly Id[] = []): Person[] {
  return (view.peopleAt.get(placeId) ?? [])
    .map((id) => view.personById.get(id))
    .filter((p): p is Person => p !== undefined)
    .filter((p) => p.kind !== 'victim' || victimReachable(view.kase, found));
}

/**
 * The same, with tonight's one moving part in it: while the client is still in
 * the office, the client is in the office (§B.2). `Person.foundAt` is where
 * the generator says he can be found the next day, and it stays true the
 * moment he walks out.
 */
export function peopleHereNow(
  view: CaseView,
  placeId: Id,
  state: { clientInOffice?: boolean; found?: readonly Id[] },
): Person[] {
  const here = peopleHere(view, placeId, state.found ?? []);
  if (placeId !== view.office.id || state.clientInOffice !== true) return here;
  return here.some((p) => p.id === view.client.id) ? here : [view.client, ...here];
}

/* ------------------------------------------------------------------ *
 * The claimed account — a pseudo-clue, derived, never in the generator.
 * ------------------------------------------------------------------ */

export interface ClaimedAccount {
  personId: Id;
  rows: { tick: Tick; placeId: Id | null }[];
}

export function claimedAccount(view: CaseView, personId: Id): ClaimedAccount | null {
  const claimed = view.claimedOf.get(personId);
  if (!claimed) return null;
  const rows: { tick: Tick; placeId: Id | null }[] = [];
  for (let t = 0; t < TICKS; t++) rows.push({ tick: t, placeId: claimed[t] ?? null });
  return { personId, rows };
}

/** "6:00 PM–7:30 PM at the benches" runs, for printing an account compactly. */
export function accountRuns(
  account: ClaimedAccount,
): { from: Tick; to: Tick; placeId: Id | null }[] {
  const out: { from: Tick; to: Tick; placeId: Id | null }[] = [];
  for (const row of account.rows) {
    const last = out[out.length - 1];
    if (last && last.placeId === row.placeId) last.to = row.tick;
    else out.push({ from: row.tick, to: row.tick, placeId: row.placeId });
  }
  return out;
}

export function spanLabel(from: Tick, to: Tick): string {
  return from === to ? clock(from) : `${clock(from)}–${clock(to)}`;
}

/* ------------------------------------------------------------------ *
 * Threads.
 * ------------------------------------------------------------------ */

export interface ThreadSeed {
  clueId: Id;
  placeId: Id;
  placeLabel: string;
  label: string;
  command: string;
}

/** The command and the sentence that fetch a clue, as the player would type. */
export function leadFor(view: CaseView, clue: Clue): ThreadSeed {
  const placeLabel = view.placeById.get(clue.place)?.shortName ?? clue.place;
  if (clue.source.type === 'place') {
    const place = view.placeById.get(clue.source.placeId);
    const name = place?.shortName ?? clue.source.placeId;
    return {
      clueId: clue.id,
      placeId: clue.place,
      placeLabel,
      label: `Look around ${name}`,
      command: `examine ${name}`,
    };
  }
  const who = view.personById.get(clue.source.personId);
  const surname = who?.surname ?? clue.source.personId;
  // M9: a tiered case's account is asked as the evening, the way a player
  // asks it. Shorter nights §2: it comes with any first question, so the
  // lead sends the detective to the person.
  if (clue.kind === 'account' && view.kase.logic) {
    return {
      clueId: clue.id,
      placeId: clue.place,
      placeLabel,
      label: `Ask ${surname} anything`,
      command: `ask ${surname} about that evening`,
    };
  }
  return {
    clueId: clue.id,
    placeId: clue.place,
    placeLabel,
    label: `Ask ${surname} about ${clue.source.topic}`,
    command: `ask ${surname} about ${clue.source.topic}`,
  };
}

/**
 * Every open lead, recomputed from scratch. Two clues a single question would
 * answer collapse into one lead, because one action fetches both.
 */
export function threadsFor(view: CaseView, found: Id[]): ThreadSeed[] {
  const have = new Set(found);
  const wanted: Clue[] = [];
  for (const id of found) {
    const c = view.findableById.get(id);
    if (!c) continue;
    for (const target of c.leadsTo) {
      if (have.has(target)) continue;
      const t = view.findableById.get(target);
      if (t) wanted.push(t);
    }
  }
  const byCommand = new Map<string, ThreadSeed>();
  for (const c of wanted) {
    const lead = leadFor(view, c);
    if (!byCommand.has(lead.command)) byCommand.set(lead.command, lead);
  }
  return [...byCommand.values()];
}

/* ------------------------------------------------------------------ *
 * The established board.
 * ------------------------------------------------------------------ */

export interface Established {
  /** Ticks the death is still consistent with. Empty until the coroner. */
  deathTicks: Tick[];
  methodEvidence: boolean;
  motives: { personId: Id; motiveType: string }[];
  access: { personId: Id }[];
  /** Every placement learned, per person, newest last. */
  placements: Map<Id, Placement[]>;
  secretsExplained: Id[];
}

export interface Placement {
  personId: Id;
  placeId: Id;
  tick: Tick;
  /** `false` means the clue said they were *not* there. */
  present: boolean;
  clueId: Id;
  /** The clue contradicts this person's own claimed account. */
  contradicts: boolean;
}

export function establishedFrom(view: CaseView, found: Id[], accounts: Id[]): Established {
  const known = new Set(accounts);
  let ticks: Tick[] | null = null;
  let methodEvidence = false;
  const motives: { personId: Id; motiveType: string }[] = [];
  const access: { personId: Id }[] = [];
  const placements = new Map<Id, Placement[]>();
  const secretsExplained: Id[] = [];

  const narrow = (keep: (t: Tick) => boolean): void => {
    const base = ticks ?? Array.from({ length: TICKS }, (_, i) => i);
    ticks = base.filter(keep);
  };

  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    for (const f of clue.establishes) {
      switch (f.kind) {
        case 'timeOfDeath': {
          const [a, b] = [f.ticks[0] as Tick, f.ticks[f.ticks.length - 1] as Tick];
          narrow((t) => t >= a && t <= b);
          break;
        }
        case 'victimAliveAt':
          narrow((t) => t > f.tick);
          break;
        case 'victimDeadBy':
          narrow((t) => t <= f.tick);
          break;
        case 'methodEvidence':
          methodEvidence = true;
          break;
        case 'hasMotive':
          if (!motives.some((m) => m.personId === f.personId && m.motiveType === f.motiveType))
            motives.push({ personId: f.personId, motiveType: f.motiveType });
          break;
        case 'hadAccess':
          if (!access.some((a) => a.personId === f.personId)) access.push({ personId: f.personId });
          break;
        case 'secretExplained':
          if (!secretsExplained.includes(f.personId)) secretsExplained.push(f.personId);
          break;
        case 'personAt':
        case 'personNotAt': {
          const present = f.kind === 'personAt';
          const claimed = view.claimedOf.get(f.personId);
          const claim = claimed?.[f.tick] ?? null;
          const contradicts =
            known.has(f.personId) &&
            claim !== null &&
            (present ? claim !== f.place : claim === f.place);
          const list = placements.get(f.personId) ?? [];
          if (!list.some((p) => p.placeId === f.place && p.tick === f.tick && p.present === present))
            list.push({
              personId: f.personId,
              placeId: f.place,
              tick: f.tick,
              present,
              clueId: clue.id,
              contradicts,
            });
          placements.set(f.personId, list);
          break;
        }
        default:
          break;
      }
    }
  }

  return {
    deathTicks: ticks ?? [],
    methodEvidence,
    motives,
    access,
    placements,
    secretsExplained,
  };
}

/* ------------------------------------------------------------------ *
 * Clickable nouns.
 * ------------------------------------------------------------------ */

export type Noun =
  | { kind: 'person'; id: Id; text: string }
  | { kind: 'place'; id: Id; text: string }
  | { kind: 'object'; id: Id; text: string }
  | { kind: 'anchor'; id: Id; text: string };

export type Segment = { text: string; noun?: Noun };

interface NounEntry {
  needle: string;
  make: (text: string) => Noun;
}

function nounIndex(view: CaseView): NounEntry[] {
  const entries: NounEntry[] = [];
  for (const p of view.kase.people) {
    entries.push({ needle: fold(p.surname), make: (text) => ({ kind: 'person', id: p.id, text }) });
  }
  for (const pl of view.places) {
    entries.push({ needle: fold(pl.name), make: (text) => ({ kind: 'place', id: pl.id, text }) });
    entries.push({
      needle: fold(pl.shortName),
      make: (text) => ({ kind: 'place', id: pl.id, text }),
    });
  }
  for (const o of view.kase.objects) {
    entries.push({ needle: fold(o.name), make: (text) => ({ kind: 'object', id: o.id, text }) });
  }
  for (const a of view.kase.anchors) {
    entries.push({
      needle: fold(a.name),
      make: (text) => ({ kind: 'anchor', id: a.templateId, text }),
    });
  }
  // Longest first, so "the speakeasy under the hat shop" wins over "the speakeasy".
  return entries.sort((x, y) => y.needle.length - x.needle.length);
}

/**
 * Split a clue's text into plain runs and clickable nouns. The text is never
 * altered: the segments concatenate back to exactly what went in.
 */
export function segmentNouns(text: string, view: CaseView): Segment[] {
  const entries = nounIndex(view);
  // fold() collapses whitespace, which would shift the offsets. Only the cheap
  // case-fold happens here, so every index lines up with the original string.
  const lower = text.toLowerCase().replace(/[’']/g, "'");
  const marks: { start: number; end: number; make: (t: string) => Noun }[] = [];
  const taken: boolean[] = new Array(text.length).fill(false);

  for (const e of entries) {
    if (e.needle.length < 3) continue;
    let from = 0;
    for (;;) {
      const i = lower.indexOf(e.needle, from);
      if (i < 0) break;
      from = i + 1;
      const before = i === 0 ? ' ' : (lower[i - 1] as string);
      const after = lower[i + e.needle.length] ?? ' ';
      if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
      let clash = false;
      for (let k = i; k < i + e.needle.length; k++) if (taken[k]) clash = true;
      if (clash) continue;
      for (let k = i; k < i + e.needle.length; k++) taken[k] = true;
      marks.push({ start: i, end: i + e.needle.length, make: e.make });
    }
  }

  marks.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) out.push({ text: text.slice(cursor, m.start) });
    const slice = text.slice(m.start, m.end);
    out.push({ text: slice, noun: m.make(slice) });
    cursor = m.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

/* ------------------------------------------------------------------ *
 * Small helpers the UI and the voice both want.
 * ------------------------------------------------------------------ */

export function placeName(view: CaseView, id: Id | null | undefined): string {
  if (!id) return 'nowhere';
  return view.placeById.get(id)?.shortName ?? id;
}

export function personName(view: CaseView, id: Id | null | undefined): string {
  if (!id) return 'nobody';
  return view.personById.get(id)?.surname ?? id;
}

/** The tick a clue is about, if it is about one. Used to pick a register. */
export function clueTick(clue: Clue): Tick | null {
  for (const f of clue.establishes) {
    if (f.kind === 'personAt' || f.kind === 'personNotAt') return f.tick;
    if (f.kind === 'noiseAt') return f.tick;
    if (f.kind === 'victimAliveAt' || f.kind === 'victimDeadBy') return f.tick;
  }
  return null;
}

/** The person a clue is about, if it is about one. */
export function clueSubject(clue: Clue): Id | null {
  for (const f of clue.establishes) {
    if (f.kind === 'personAt' || f.kind === 'personNotAt') return f.personId;
    if (f.kind === 'hasMotive' || f.kind === 'hadAccess') return f.personId;
    if (f.kind === 'secretExplained') return f.personId;
  }
  return null;
}
