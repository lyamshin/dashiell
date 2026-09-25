/**
 * M9 — the engine half of "Deduction" (`docs/20-m9-deduction.md`,
 * `docs/20-m9-gen-notes.md` §13).
 *
 * Everything here reads a case dealt with a tier (`kase.logic` is set) and the
 * run. A case without `logic` — the no-options case, and every save from
 * before M9 — gets exactly the old behaviour from every function: verdicts on,
 * no confront, names always known, no crime column.
 *
 * Pure. Nothing here touches the dealer or the document.
 */

import {
  clearedBy,
  contradicts,
  solveHeld,
  whyNot,
  whyPlaced,
  crimeTicks,
  culpritOf,
  placesAt,
  type SolverState,
  type Why,
} from '../gen/index.js';
import type {
  Clue,
  ConfrontResponse,
  Confrontation,
  Description,
  Fact,
  Id,
  Logic,
  Person,
  Tick,
} from '../gen/types.js';
import { deductionOf, dialsOf, type DeductionDials } from '../gen/shape.js';
import type { RulePart } from '../gen/logic/lines.js';
import type { CaseView } from './derive.js';
import type { RunState } from './types.js';
import { genderHintOf, possessiveOf } from './voice/cast.js';

/* ------------------------------------------------------------------ *
 * What the tier turns on.
 * ------------------------------------------------------------------ */

export function logicOf(view: CaseView): Logic | null {
  return view.kase.logic ?? null;
}

/** The deduction dials, for a tiered case; null for the no-options case. */
export function dialsFor(view: CaseView): DeductionDials | null {
  if (!view.kase.logic) return null;
  return deductionOf(dialsOf(view.kase).shape);
}

/** The tier as a number, Over easy as 6; null for an untiered case. */
export function tierNumber(view: CaseView): number | null {
  const t = view.kase.shape?.tier;
  if (t === undefined || t === 'custom') return view.kase.logic ? 5 : null;
  return t === 'over-easy' ? 6 : t;
}

/**
 * Spec, "No automatic verdicts from Poached up": the pages may state a
 * conclusion ("That cleared Weisglass.") and the notebook may flag a
 * contradiction only at Raw and Coddled, to teach. Every case without the
 * logic game keeps them.
 */
export function verdictsOn(view: CaseView): boolean {
  const d = dialsFor(view);
  return d === null || d.verdicts;
}

/**
 * Spec §2 "Tiering": Poached adds lies about secrets and the confront verb.
 * M10 Part B: Raw and Coddled teach the verb on the culprit's one lie; the
 * generator says so with `DeductionDials.confront`.
 */
export function confrontOn(view: CaseView): boolean {
  const d = dialsFor(view);
  return d !== null && (d.confront ?? d.secretLies);
}

/**
 * M10 Part B: at Raw and Coddled a page may say "That cleared X", but only
 * once two facts in the notebook agree that X was somewhere else (the
 * generator's `clearedBy`: their own account and a sighting inside it, say).
 * The suspects this notebook clears that way, each with the one whose word
 * agreed with theirs: the source of a clue it rests on that is not their own.
 * Empty for a case without the logic game, and where verdicts are off.
 */
export function clearedOnTwo(view: CaseView, found: readonly Id[]): Map<Id, Id | null> {
  const out = new Map<Id, Id | null>();
  if (!view.kase.logic || !verdictsOn(view)) return out;
  const ticks = crimeTicks(solveHeld(view.kase, [...found]));
  for (const [id, rules] of Object.entries(clearedBy(view.kase, [...found]))) {
    if (rules.length < 2) continue;
    // Two facts agree only where they are about the same half hour: their own
    // word is one, and the other must be somebody else's (or the room's) and
    // cover the crime's half hour itself — a sighting at eight and at ten
    // corroborates nothing about half past nine.
    if (!ticks.every((t) => placedAwayBy(view, found, id, t))) continue;
    const other = rules
      .map((r) => view.findableById.get(r))
      .find((c) => c && c.source.type === 'person' && c.source.personId !== id);
    out.set(id, other && other.source.type === 'person' ? other.source.personId : null);
  }
  return out;
}

/**
 * docs/38: the notebook's ESTABLISHED panel, "accounted for": everybody the
 * notebook's facts keep out of the room it happened in, at every half hour it
 * could have happened in, on two facts that agree — M10's rule (the
 * generator's `clearedBy` with two clues or more: their own account and a
 * sighting inside it, say), at every tier. The pages' own "That cleared X"
 * (`clearedOnTwo`) is stricter still — the second fact must be about the
 * half hour itself — and is said only at Raw and Coddled; the panel is a
 * fact in the notebook at every tier, and used to stay "nobody yet" all
 * night because it only ever listed secrets explained.
 */
export function accountedFor(view: CaseView, found: readonly Id[]): Id[] {
  if (!view.kase.logic) return [];
  return Object.entries(clearedBy(view.kase, [...found]))
    .filter(([, rules]) => rules.length >= 2)
    .map(([id]) => id);
}

/**
 * A fact in hand, not the person's own word, that puts them somewhere other
 * than the scene at this half hour, or keeps them out of it: somebody saw
 * them elsewhere then, saw they were not at the scene then, or kept the
 * scene's door then and names everybody who came in without them.
 */
export function placedAwayBy(view: CaseView, found: readonly Id[], personId: Id, tick: Tick): boolean {
  const scene = view.kase.solution.murderPlaceId;
  return found.some((cid) => {
    const clue = view.findableById.get(cid);
    if (!clue) return false;
    if (clue.source.type === 'person' && clue.source.personId === personId) return false;
    return clue.establishes.some(
      (f) =>
        (f.kind === 'personAt' && f.personId === personId && f.tick === tick && f.place !== scene) ||
        (f.kind === 'personNotAt' && f.personId === personId && f.tick === tick && f.place === scene) ||
        (f.kind === 'absentFrom' && f.place === scene && f.ticks.includes(tick) && !f.except.includes(personId)),
    );
  });
}

/** Spec §5: the full crime column is asked from Medium up. */
export function columnAsked(view: CaseView): boolean {
  const t = tierNumber(view);
  // v2 (docs/35): "where was everyone" is dropped; the report asks only what the tier asks.
  return view.kase.logic !== undefined && t !== null && t >= 4 && view.kase.engine !== 'v2';
}

/* ------------------------------------------------------------------ *
 * Who knows whom: names, and what to call somebody without one.
 * ------------------------------------------------------------------ */

const DECADES: Record<number, string> = {
  1: 'teens',
  2: 'twenties',
  3: 'thirties',
  4: 'forties',
  5: 'fifties',
  6: 'sixties',
  7: 'seventies',
};

/** "a woman in her forties": what anybody can see. */
export function sightPhrase(person: Person): string {
  const d = person.dossier;
  const decade = d ? DECADES[Math.floor(d.age / 10)] : undefined;
  const she = genderHintOf(person) === 'f';
  return decade ? `a ${she ? 'woman' : 'man'} in ${possessiveOf(person)} ${decade}` : `a ${she ? 'woman' : 'man'}`;
}

function surnameIn(text: string, surname: string): boolean {
  return new RegExp(`\\b${surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

/**
 * Does the detective have this person's name? Spec, "Who knows whom": the
 * detective learns names from the people who know them. On a page it is
 * every name the run has put on paper — a page's prose, a record in the
 * notebook — plus the client and the victim, whom the office named.
 */
export function nameKnown(view: CaseView, state: Pick<RunState, 'log' | 'found'>, personId: Id): boolean {
  if (!view.kase.logic) return true;
  const person = view.personById.get(personId);
  if (!person) return false;
  if (person.id === view.victim.id || person.id === view.client.id) return true;
  for (const id of state.found) {
    const c = view.findableById.get(id);
    if (c && (surnameIn(c.textRecord ?? c.text, person.surname) || surnameIn(c.text, person.surname))) return true;
  }
  for (const page of state.log) {
    for (const b of page.blocks) {
      const text = b.kind === 'prose' || b.kind === 'note' ? b.text : b.kind === 'presence' ? (b.text ?? '') : '';
      if (text && surnameIn(text, person.surname)) return true;
    }
  }
  return false;
}

/** What the book calls somebody: their surname, or what anybody can see. */
export function displayName(view: CaseView, state: Pick<RunState, 'log' | 'found'>, personId: Id): string {
  const person = view.personById.get(personId);
  if (!person) return personId;
  if (nameKnown(view, state, personId)) return person.surname;
  return sightPhrase(person).replace(/^a /, 'the ');
}

/* ------------------------------------------------------------------ *
 * Accounts.
 * ------------------------------------------------------------------ */

/** A person's own account, as a clue: `kind: 'account'`, sourced by them. */
export function accountClueOf(view: CaseView, personId: Id): Clue | null {
  if (!view.kase.logic) return null;
  return (
    view.kase.findable.find(
      (c) => c.kind === 'account' && c.source.type === 'person' && c.source.personId === personId,
    ) ?? null
  );
}

/** A claims-only schedule, from an account clue: null where it says nothing. */
export function claimedFromClue(clue: Clue): (Id | null)[] {
  const out: (Id | null)[] = Array.from({ length: 12 }, () => null);
  for (const f of clue.establishes) {
    if (f.kind !== 'claims') continue;
    for (const t of f.ticks) if (t >= 0 && t < 12) out[t] = f.place;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Confront.
 * ------------------------------------------------------------------ */

/** One confrontation, as the run keeps it. */
export interface ConfrontRecord {
  personId: Id;
  /** The notebook fact put to them: a found clue's id. */
  clueId: Id;
  /**
   * M9 polish: which of the clue's parts (`Clue.ruleParts`) was read to them,
   * one fact at a time. Absent when the whole line was put, as older saves
   * and typed commands without a part do.
   */
  part?: number;
  /** The lie it touched (`accountId|firstTick`), or null for a fact that touched nothing. */
  lieKey: string | null;
  /** What came of it. */
  outcome: ConfrontResponse['kind'] | 'wrong';
  /** Which of the lie's two responses was given (0 or 1); absent for `wrong`. */
  n?: 0 | 1;
  /** The page it happened on. */
  page: number;
  /**
   * Shorter nights §1: the second fact put in the same confrontation, free
   * ("Put another fact to her"). A `wrong` one ends it with the story standing.
   */
  follow?: true;
}

export function lieKeyOf(c: Confrontation): string {
  return `${c.lie.accountId}|${c.lie.ticks[0] ?? 0}`;
}

/** The people who have given up where they really were: two confrontations that landed. */
export function confessedOf(state: Pick<RunState, 'confronts'>): Id[] {
  return [
    ...new Set(
      (state.confronts ?? [])
        .filter((r) => r.outcome === 'admit' || r.outcome === 'withdraw')
        .map((r) => r.personId),
    ),
  ];
}

/** Solve what the notebook holds: the clues in hand and the confessions heard. */
export function solveNotebook(view: CaseView, state: Pick<RunState, 'found' | 'confronts'>, soft = true): SolverState {
  return solveHeld(view.kase, state.found, { confessed: confessedOf(state), soft });
}

/**
 * The facts a player may put to somebody: every clue in hand that states a
 * rule, but their own account. Nothing is filtered by whether it touches
 * anything: choosing is the player's work (spec, "A verb for catching lies").
 */
export function confrontFacts(view: CaseView, state: Pick<RunState, 'found'>, personId: Id): Clue[] {
  return state.found
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined)
    .filter((c) => (c.rule ?? '').length > 0)
    .filter((c) => !(c.kind === 'account' && c.source.type === 'person' && c.source.personId === personId));
}

/** Can this person be confronted at all yet? Their own account is in the notebook. */
export function canConfront(view: CaseView, state: Pick<RunState, 'accounts' | 'found'>, personId: Id): boolean {
  if (!confrontOn(view)) return false;
  if (!state.accounts.includes(personId)) return false;
  return confrontFacts(view, state, personId).length > 0;
}

/** A clue's rule, one fact at a time: its `ruleParts`, or the whole line as one part. */
export function partsOf(clue: Clue): RulePart[] {
  if (clue.ruleParts && clue.ruleParts.length > 0) return clue.ruleParts;
  if ((clue.rule ?? '').length === 0) return [];
  return [{ text: (clue.rule as string).replace(/\.$/, ''), facts: clue.establishes.map((_, i) => i), people: [], place: null }];
}

/**
 * One fact the picker offers: a part of a clue in hand, with whom and where
 * it is about for the picker's groups. Nothing here says whether it touches
 * anything.
 */
export interface PickFact {
  clueId: Id;
  part: number;
  text: string;
  /** Who said it or where it was found, as the grid brackets it. */
  source: string;
  people: Id[];
  place: Id | null;
  /** About the place first (a watcher's "nobody but …"), not the people it names. */
  byPlace: boolean;
  /** The first half hour it names, for ordering; 99 when it names none. */
  first: number;
}

function firstTickOf(facts: Fact[]): number {
  let t = 99;
  for (const f of facts) {
    if ('tick' in f) t = Math.min(t, f.tick);
    if ('ticks' in f && f.ticks.length > 0) t = Math.min(t, ...f.ticks);
  }
  return t;
}

/** Every fact the picker offers against `personId`: each clue in hand, a part at a time. */
export function pickFacts(view: CaseView, state: Pick<RunState, 'found'>, personId: Id): PickFact[] {
  const out: PickFact[] = [];
  for (const clue of confrontFacts(view, state, personId)) {
    const source =
      clue.source.type === 'person'
        ? (view.personById.get(clue.source.personId)?.surname ?? clue.source.personId)
        : clue.kind === 'morgue'
          ? 'the coroner'
          : (view.placeById.get(clue.source.placeId)?.shortName ?? clue.source.placeId);
    partsOf(clue).forEach((p, i) => {
      out.push({
        clueId: clue.id,
        part: i,
        text: p.text,
        source,
        people: p.people,
        byPlace: p.byPlace === true,
        place: p.place,
        first: firstTickOf(p.facts.map((k) => clue.establishes[k]).filter((f): f is Fact => f !== undefined)),
      });
    });
  }
  return out;
}

/** "x012 part 2": the command form of one part of a clue. */
export function partRef(clueId: Id, part: number | undefined): string {
  return part === undefined ? clueId : `${clueId} part ${part}`;
}

type Claim = { place: Id; ticks: Tick[] };

function breaksWith(
  kase: CaseView['kase'],
  hand: readonly Id[],
  personId: Id,
  claim: Claim,
  confessed: readonly Id[],
): Set<Id> {
  const out = new Set<Id>();
  for (const soft of [true, false]) {
    const res = contradicts(kase, [...hand], { personId, ...claim }, { confessed: [...confessed], soft });
    if (res.yes) for (const id of res.rules) out.add(id);
  }
  return out;
}

/** The case with one clue's facts narrowed to those `keep` allows. */
function narrowed(kase: CaseView['kase'], clueId: Id, keep: (i: number) => boolean): CaseView['kase'] {
  return {
    ...kase,
    findable: kase.findable.map((c) => (c.id === clueId ? { ...c, establishes: c.establishes.filter((_, i) => keep(i)) } : c)),
  };
}

/** Does this fact name the person, or the place at one of the claim's half hours? */
function factTouches(f: Fact, personId: Id, claim: Claim): boolean {
  if ('personId' in f && f.personId === personId) return true;
  if ('personIds' in f && (f.personIds as Id[]).includes(personId)) return true;
  if (f.kind === 'absentFrom' || f.kind === 'anchorKnowledge') return f.place === claim.place && f.ticks.some((t) => claim.ticks.includes(t));
  if ('place' in f && 'tick' in f) return f.place === claim.place && claim.ticks.includes(f.tick);
  return false;
}

/**
 * Is this one part of a clue what breaks the claim, and not just a line that
 * sits beside the fact that does? Read with the solver alone, never the truth:
 * the part lands when the clue narrowed to it still breaks the claim, or when
 * the clue without it no longer does. A clue that breaks the claim only as a
 * member of a written-out chain the solver's proof did not use lands on a
 * part that names the person, or their claimed place at the claimed hour.
 */
export function partBreaks(
  view: CaseView,
  hand: readonly Id[],
  personId: Id,
  clueId: Id,
  part: number,
  claim: Claim,
  confessed: readonly Id[],
): boolean {
  const clue = view.findableById.get(clueId);
  if (!clue) return false;
  const parts = partsOf(clue);
  const mine = parts[part];
  if (!mine) return false;
  if (parts.length <= 1) return true;
  const facts = new Set(mine.facts);
  if (breaksWith(view.kase, hand, personId, claim, confessed).has(clueId)) {
    if (breaksWith(narrowed(view.kase, clueId, (i) => facts.has(i)), hand, personId, claim, confessed).has(clueId)) return true;
    return !breaksWith(narrowed(view.kase, clueId, (i) => !facts.has(i)), hand, personId, claim, confessed).has(clueId);
  }
  return clue.establishes.some((f, i) => facts.has(i) && factTouches(f, personId, claim));
}

export interface ConfrontJudgement {
  outcome: ConfrontRecord['outcome'];
  lieKey: string | null;
  n?: 0 | 1;
  confrontation?: Confrontation;
  response?: ConfrontResponse;
  /** What they claimed, for the page: the place and the half hours the fact touched. */
  claimed?: { place: Id; ticks: Tick[] };
}

/**
 * What happens when `clueId` is put to `personId`, given what the notebook
 * holds. The generator's `contradicts` decides whether what is held breaks
 * the claim; the pick lands when it is one of the facts that do it — a rule
 * the solver's proof rests on, or a member of one of the lie's written-out
 * ways of breaking it that is all in hand. A second confrontation must land
 * with something independent of the first: a second lie is broken only by
 * what breaks it (`contradictedBy`), and a lie that held is broken again only
 * by a fact outside the first pick's way of breaking it.
 */
export function judgeConfront(
  view: CaseView,
  state: Pick<RunState, 'found' | 'confronts'>,
  personId: Id,
  clueId: Id,
  part?: number,
  /**
   * Shorter nights §1: the second fact of the same confrontation is judged
   * against the story that confrontation was about, and nothing else.
   */
  opts: { lieKey?: string } = {},
): ConfrontJudgement {
  const logic = view.kase.logic;
  if (!logic) return { outcome: 'wrong', lieKey: null };
  const held = new Set(state.found);
  const records = state.confronts ?? [];
  const confessed = new Set(confessedOf(state));
  const groupHeld = (g: Id[]): boolean =>
    g.every((id) => (id.startsWith('confess:') ? confessed.has(id.split(':')[1] ?? '') : held.has(id)));
  // What breaks a claim, by the solver, reading others' accounts as it may
  // (soft) and as it may not: a fact that does it either way counts.
  const breaks = (hand: readonly Id[], claim: { place: Id; ticks: Tick[] }): Set<Id> => {
    const out = new Set<Id>();
    for (const soft of [true, false]) {
      const res = contradicts(view.kase, [...hand], { personId, ...claim }, { confessed: [...confessed], soft });
      if (res.yes) for (const id of res.rules) out.add(id);
    }
    return out;
  };
  // M9 polish: a part put on its own lands only when it is what breaks the
  // claim, not a line beside it (`partBreaks`). The whole line, put without a
  // part, is judged as before.
  const partOk = (hand: readonly Id[], claim: Claim): boolean =>
    part === undefined || partBreaks(view, hand, personId, clueId, part, claim, [...confessed]);
  if (part !== undefined) {
    const clue = view.findableById.get(clueId);
    if (!clue || !partsOf(clue)[part]) return { outcome: 'wrong', lieKey: null };
  }
  for (const c of logic.confrontations) {
    if (c.personId !== personId) continue;
    const key = lieKeyOf(c);
    if (opts.lieKey !== undefined && key !== opts.lieKey) continue;
    const landed = records.filter((r) => r.lieKey === key && r.outcome !== 'wrong');
    const k = landed.length;
    const before = landed.map((r) => r.clueId);
    const first = c.responses[0];
    const onSecondLie = k >= 1 && first.kind === 'second-lie' && first.claims !== undefined;
    const lie = { place: c.lie.claimed, ticks: c.lie.ticks };
    let touches = false;
    let claimed: { place: Id; ticks: Tick[] } = lie;
    if (!held.has(clueId) || before.includes(clueId)) continue;
    if (k === 0) {
      // The first time: a fact the solver's proof rests on, or one of the
      // lie's written-out ways of breaking it that is all in hand.
      const ways = c.contradictions.filter((g) => g.includes(clueId) && groupHeld(g));
      touches = (ways.length > 0 || breaks(state.found, lie).has(clueId)) && partOk(state.found, lie);
    } else {
      // The second time has to be something new (spec §3, "a second,
      // independent fact contradicts them"): what still breaks the first
      // story with the first fact set aside, or — after a second story —
      // what breaks the second story.
      if (onSecondLie && first.claims) {
        claimed = { place: first.claims.place, ticks: first.claims.ticks };
        touches =
          ((first.contradictedBy ?? []).includes(clueId) || breaks(state.found, claimed).has(clueId)) &&
          partOk(state.found, claimed);
      }
      if (!touches) {
        const rest = state.found.filter((id) => !before.includes(id));
        const ways = c.contradictions.filter(
          (g) => g.includes(clueId) && groupHeld(g) && !before.some((b) => g.includes(b)),
        );
        touches = (ways.length > 0 || breaks(rest, lie).has(clueId)) && partOk(rest, lie);
      }
    }
    if (!touches) continue;
    const n: 0 | 1 = k === 0 ? 0 : 1;
    const response = c.responses[n];
    return { outcome: response.kind, lieKey: key, n, confrontation: c, response, claimed };
  }
  return { outcome: 'wrong', lieKey: null };
}

/**
 * What a person has said under pressure, for the notebook and the grid: a
 * second story (claims), an admission or a withdrawal (facts). Each is keyed
 * `said:<personId>:<lieKey>:<n>` and carries the generator's own line.
 */
export interface SaidRecord {
  id: Id;
  personId: Id;
  text: string;
  rule: string;
  facts: Fact[];
  outcome: ConfrontResponse['kind'];
}

export const SAID_PREFIX = 'said:';

export function saidRecords(view: CaseView, state: Pick<RunState, 'confronts'>): SaidRecord[] {
  const logic = view.kase.logic;
  if (!logic) return [];
  const out: SaidRecord[] = [];
  for (const r of state.confronts ?? []) {
    if (r.outcome === 'wrong' || r.lieKey === null || r.n === undefined) continue;
    const c = logic.confrontations.find((x) => x.personId === r.personId && lieKeyOf(x) === r.lieKey);
    if (!c) continue;
    const resp = c.responses[r.n];
    const facts: Fact[] = resp.claims ? [resp.claims] : (resp.facts ?? []);
    const id = `${SAID_PREFIX}${r.personId}:${r.lieKey}:${r.n}`;
    if (out.some((s) => s.id === id)) continue;
    out.push({ id, personId: r.personId, text: resp.text, rule: resp.rule, facts, outcome: resp.kind });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The monologue reads the pencil.
 * ------------------------------------------------------------------ */

/**
 * Spec, "the monologue reads only the player's pencil marks": the suspect the
 * player has pencilled in at the scene at a half hour the notebook still
 * holds open for the crime, if exactly one. Never computed from the facts.
 */
export function markedTheory(view: CaseView, marks: RunState['marks'], window: readonly Tick[]): Id | null {
  if (!marks) return null;
  const scene = view.sceneId;
  const hours = window.length > 0 ? window : Array.from({ length: 12 }, (_, i) => i);
  const who = new Set<Id>();
  for (const [personId, cells] of Object.entries(marks)) {
    const person = view.personById.get(personId);
    if (!person || person.kind !== 'suspect') continue;
    for (const t of hours) if (cells[String(t)]?.at === scene) who.add(personId);
  }
  return who.size === 1 ? ([...who][0] as Id) : null;
}

/* ------------------------------------------------------------------ *
 * The report's column, and the curtain's proofs.
 * ------------------------------------------------------------------ */

/** The suspects the column asks about, in the case's order. */
export function columnPeople(view: CaseView): Person[] {
  return view.kase.people.filter((p) => p.kind === 'suspect');
}

/** Where each suspect truly was at the crime's half hour. */
export function truthColumn(view: CaseView): Record<Id, Id | null> {
  const out: Record<Id, Id | null> = {};
  const t = view.kase.solution.murderTick;
  for (const p of columnPeople(view)) out[p.id] = view.truthOf.get(p.id)?.[t] ?? null;
  return out;
}

export interface Proof {
  /** What is proved, in one plain line. */
  what: string;
  /** The rule lines it rests on, in order, one per clue. */
  rules: string[];
  depth: number;
  hypothesis: boolean;
}

function ruleLines(view: CaseView, ids: readonly Id[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (id.startsWith('confess:')) {
      const who = view.personById.get(id.split(':')[1] ?? '')?.surname ?? 'Somebody';
      out.push(`${who}, put to twice, said where ${who} really was.`);
      continue;
    }
    const c = view.findableById.get(id);
    const line = c?.rule ?? '';
    if (line && !out.includes(line)) out.push(line);
  }
  return out;
}

function whyIds(st: SolverState, w: Why): Id[] {
  return w.rules.map((r) => st.problem.rules[r]?.id as Id).filter((id) => id !== undefined && id !== 'given');
}

/**
 * Behind the curtain: the rule chain that proves each thing the report asks
 * — who, when, and each cell of the column — over the par route's rules,
 * which is the cheapest set the solver needs (`Case.logic.solve.parRules`).
 */
export function proofsFor(view: CaseView): { who: Proof | null; when: Proof | null; column: Record<Id, Proof | null> } {
  const logic = view.kase.logic;
  const column: Record<Id, Proof | null> = {};
  if (!logic) return { who: null, when: null, column };
  const st = solveHeld(view.kase, logic.solve.parRules);
  const name = (id: Id): string => view.personById.get(id)?.surname ?? id;
  const place = (id: Id): string => view.placeById.get(id)?.shortName ?? id;
  const culprit = culpritOf(st);
  const who: Proof | null = culprit
    ? {
        what: `${name(culprit.id)} was the only one who could have been at ${place(view.sceneId)} when it happened.`,
        // M10 Part B: at Raw and Coddled the proof ends on the lie, what the
        // culprit said and the word that broke it (`Logic.open`).
        rules: ruleLines(view, [
          ...whyIds(st, culprit.why),
          ...(logic.open && logic.open.length > 0
            ? [accountClueOf(view, culprit.id)?.id, ...logic.open].filter((id): id is Id => id !== undefined)
            : []),
        ]),
        depth: culprit.why.depth,
        hypothesis: culprit.why.hyp,
      }
    : null;
  const ticks = crimeTicks(st);
  const t = ticks.length === 1 ? (ticks[0] as Tick) : view.kase.solution.murderTick;
  const when: Proof | null =
    ticks.length === 1
      ? {
          what: `It happened in the half hour from ${clockOf(t)}.`,
          rules: ruleLines(view, logic.solve.crimeTick.rules),
          depth: logic.solve.crimeTick.depth,
          hypothesis: logic.solve.crimeTick.hypothesis,
        }
      : null;
  for (const p of columnPeople(view)) {
    const w = whyPlaced(st, p.id, t);
    const at = placesAt(st, p.id, t);
    if (w && at.length === 1) {
      column[p.id] = {
        what: `${name(p.id)} was at ${place(at[0] as Id)} at ${clockOf(t)}.`,
        rules: ruleLines(view, whyIds(st, w)),
        depth: w.depth,
        hypothesis: w.hyp,
      };
      continue;
    }
    const off = whyNot(st, p.id, t, view.sceneId);
    column[p.id] = off
      ? {
          what: `${name(p.id)} was not at ${place(view.sceneId)} at ${clockOf(t)}.`,
          rules: ruleLines(view, whyIds(st, off)),
          depth: off.depth,
          hypothesis: off.hyp,
        }
      : null;
  }
  return { who, when, column };
}

function clockOf(t: Tick): string {
  const h = 6 + Math.floor(t / 2);
  return `${h}:${t % 2 === 0 ? '00' : '30'}`;
}

export type { Description };
