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
  Fact,
  GameObject,
  Id,
  Person,
  Place,
  Tick,
} from '../gen/types.js';
import { TICKS, clock } from '../gen/types.js';
import { METHOD_TEMPLATES } from '../gen/data/methods.js';
import { MOTIVE_TEMPLATES } from '../gen/data/motives.js';
import type { TopicRef } from './types.js';

export const METHOD_POOL = METHOD_TEMPLATES.map((m) => ({ id: m.id, name: m.name }));
export const MOTIVE_POOL = MOTIVE_TEMPLATES.map((m) => ({
  type: m.type,
  description: m.description,
}));

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

export interface CaseView {
  kase: Case;
  sceneId: Id;
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
  const placeById = new Map(kase.places.map((p) => [p.id, p]));
  const personById = new Map(kase.people.map((p) => [p.id, p]));
  const objectById = new Map(kase.objects.map((o) => [o.id, o]));
  const anchorById = new Map(kase.anchors.map((a) => [a.templateId, a]));
  const findableById = new Map(kase.findable.map((c) => [c.id, c]));
  const victim = kase.people.find((p) => p.kind === 'victim') as Person;
  const client = personById.get(kase.clientId) as Person;

  const peopleAt = new Map<Id, Id[]>();
  for (const p of kase.places) peopleAt.set(p.id, []);
  for (const p of kase.people) {
    if (!p.foundAt) continue;
    peopleAt.get(p.foundAt)?.push(p.id);
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

  const view: CaseView = {
    kase,
    sceneId: kase.solution.murderPlaceId,
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
  for (const pl of view.kase.places) {
    if (t.includes(fold(pl.shortName))) out.add(`place:${pl.id}`);
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

/** Everyone the detective can walk up to at `placeId`. Never the victim. */
export function peopleHere(view: CaseView, placeId: Id): Person[] {
  return (view.peopleAt.get(placeId) ?? [])
    .map((id) => view.personById.get(id))
    .filter((p): p is Person => p !== undefined);
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

export function factsOf(view: CaseView, found: Id[]): Fact[] {
  const out: Fact[] = [];
  for (const id of found) {
    const c = view.findableById.get(id);
    if (c) out.push(...c.establishes);
  }
  return out;
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
  for (const pl of view.kase.places) {
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
  const folded = fold(text);
  // fold() collapses whitespace, which would shift indices. Only do the cheap
  // case-fold here so offsets stay aligned with the original string.
  const lower = text.toLowerCase().replace(/[’']/g, "'");
  const marks: { start: number; end: number; make: (t: string) => Noun }[] = [];
  const taken: boolean[] = new Array(text.length).fill(false);
  void folded;

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

/** Everything the player may type after `ask <person> about`. */
export function topicVocabulary(view: CaseView): { label: string; ref: TopicRef }[] {
  const out: { label: string; ref: TopicRef }[] = [];
  for (const p of view.kase.people) {
    if (p.kind === 'victim') continue;
    out.push({ label: p.surname, ref: { kind: 'person', id: p.id } });
  }
  out.push({ label: 'the victim', ref: { kind: 'person', id: view.victim.id } });
  for (const pl of view.kase.places) out.push({ label: pl.shortName, ref: { kind: 'place', id: pl.id } });
  for (const o of view.kase.objects) out.push({ label: o.name, ref: { kind: 'object', id: o.id } });
  for (const a of view.kase.anchors)
    out.push({ label: a.name, ref: { kind: 'anchor', id: a.templateId } });
  out.push({ label: 'that evening', ref: { kind: 'evening' } });
  out.push({ label: 'why I was hired', ref: { kind: 'hire' } });
  return out;
}
