/**
 * "Where they were" — the deduction grid.
 *
 * Rows are people, columns are the evening's twelve half hours. A cell holds
 * what the notebook holds for that person at that time and nothing more: each
 * placement a found clue makes, each half hour of an account taken down, and
 * the two sentences of the briefing that put somebody somewhere. Where two of
 * them disagree the cell says so. An empty cell is an unknown.
 *
 * The grid is also the player's scratchpad (the designer: "the player
 * diagrams, the game supplies rules"). Pencil marks live in `RunState.marks`,
 * are drawn apart from every sourced entry, and are never read back as facts:
 * nothing here counts a mark towards a conflict, a rule or the report.
 *
 * Pure. Everything is derived from the case and the run, so it is never stale;
 * a test walks every page of forty seeds and traces every entry, every rule,
 * every anchor and the band back to a found clue, a told account or a line of
 * the briefing the notebook prints under the victim.
 */

import { TICKS, clock, isTheft } from '../gen/types.js';
import type { Clue, Fact, Id, Tick } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { accountRuns, claimedAccount, establishedFrom, spanLabel } from './derive.js';
import { buildNotebook, type Notebook } from './notebook.js';
import type { CellMark, RunState } from './types.js';
import { pronounSlots } from './voice/cast.js';
import { SAID_PREFIX, displayName, saidRecords, verdictsOn } from './m9.js';

export type { CellMark };
import { softMarks, type SoftMark } from './guidance.js';

/* ------------------------------------------------------------------ *
 * The model.
 * ------------------------------------------------------------------ */

/**
 * Where a claim came from. `claimed` is the person's own word (an account
 * taken down, or a clue in which they place themselves); `witness` is somebody
 * else's word, and `by` says whose; `evidence` is a document or a physical
 * trace, and `from` says which room it came out of.
 */
export type GridSource = 'claimed' | 'witness' | 'evidence' | 'linked';

export interface GridEntry {
  placeId: Id;
  /** `false` is a "not at": the source says they were not there. */
  present: boolean;
  source: GridSource;
  /** The person whose word it is, for `witness` (and for a self-placing clue). */
  by?: Id;
  /** The room a piece of evidence was found in. */
  from?: Id;
  /**
   * What the entry traces to: a found clue's id, `account:<personId>` for an
   * account taken down, or `brief:discovery` / `brief:last-seen` for the two
   * briefing sentences the notebook keeps under the victim. M9 adds
   * `said:<…>`, what somebody said when a fact was put to them.
   */
  clueId: Id;
  /**
   * M9: a stranger's sighting the player linked to this person — the player's
   * own work, drawn apart from the ink, with the link's key so it can be undone.
   */
  link?: string;
  /** M9: an anchor-timed sighting, placed once the anchor's hour is in hand. */
  anchorId?: Id;
}

/* ------------------------------------------------------------------ *
 * M9 — the logic game's pieces that are not a cell of one row.
 * ------------------------------------------------------------------ */

/**
 * A sighting timed by an anchor whose hour the notebook does not have yet:
 * it waits in a margin row under the anchor's name (spec §2.1).
 */
export interface GridMarginEntry {
  personId: Id;
  placeId: Id;
  clueId: Id;
  by?: Id;
}

export interface GridMargin {
  anchorId: Id;
  name: string;
  /** The hours it could be, when the notebook has them but they are more than one. */
  ticks: Tick[];
  /**
   * Honest mechanics (docs/38): what the notebook knows of its hours, in
   * words — "6:30 or 8:30 or 10:30", "8:30 was one of them; the others are
   * not known", or "hour not known" — the same on the grid and in the text.
   */
  when: string;
  entries: GridMarginEntry[];
}

/**
 * A stranger's sighting: somebody who fits a description at a place and a
 * half hour. Unlinked, it sits in its own row; the player's free tap links it
 * to a person ("That was Kreuzer"), and a wrong link is allowed.
 */
export interface GridDescription {
  /** `<clueId>|<tick>`, the key the link is saved under. */
  key: string;
  clueId: Id;
  text: string;
  placeId: Id;
  tick: Tick;
  by?: Id;
  /** Who the player linked it to, if anybody. */
  linkedTo?: Id;
}

/** "Two people at the speakeasy at ten, besides the one who works there." */
export interface GridCount {
  placeId: Id;
  tick: Tick;
  count: number;
  clueId: Id;
  by?: Id;
  /** Read off a "nobody (but …)" rather than a head count. */
  fromAbsence?: true;
}

/** Two rows tied together: the same room, never the same room, or somebody's claimed company. */
export interface GridLink {
  kind: 'together' | 'apart' | 'with';
  a: Id;
  b: Id;
  ticks: Tick[];
  clueId: Id;
  by?: Id;
}

/** The victim's row only: before the notebook's window, inside it, after it. */
export type GridLife = 'before' | 'window' | 'after';

export interface GridCell {
  tick: Tick;
  entries: GridEntry[];
  /** Two places present at once, or a "not at" against an "at". Marks never count. */
  conflict: boolean;
  /** The player's pencil. Never a fact. */
  mark?: CellMark;
  life?: GridLife;
  /**
   * Guidance (docs/39 §3): marks to think about, never verdicts — "? not
   * seen by Abramowitz", "counted 1, 3 claim it". At every tier.
   */
  hints?: GridHint[];
}

/** One soft mark on a cell (docs/39 §3). */
export interface GridHint {
  kind: 'unseen' | 'count';
  text: string;
  placeId: Id;
  by?: Id;
  clueIds: Id[];
}

export type GridRowKind = 'victim' | 'client' | 'suspect' | 'fixture';

export interface GridRow {
  personId: Id;
  name: string;
  /** "the victim", "our client", "the bartender". */
  role: string;
  kind: GridRowKind;
  cells: GridCell[];
}

export interface GridPlace {
  id: Id;
  shortName: string;
  /**
   * The grid's label: a named place's `short` (content/places/rules.md §2.6),
   * else the short name without its article.
   */
  label: string;
  /** Unique across the case, at most eight characters. The typed grid's label. */
  abbrev: string;
  /**
   * M9 polish: two letters, unique across the case — "TF" the third floor,
   * "SP" the speakeasy — the label on the book's grid, where the full name is
   * on hover and in the legend.
   */
  tag: string;
  /** Categorical colour slot 1..8, fixed by the place's order in the case; 0 is neutral. */
  slot: number;
  /** The crime's place, as the notebook knows it; `found` when only the body's place is known. */
  scene: 'scene' | 'found' | null;
  sceneLabel?: string;
  /** Somewhere on the grid right now. */
  used: boolean;
}

export interface GridAnchor {
  anchorId: Id;
  name: string;
  tick: Tick;
  /** The found clues that put the anchor on this tick. */
  clueIds: Id[];
}

export interface GridSourceText {
  clueId: Id;
  /** Verbatim from the notebook: a clue's record, an account line, a briefing sentence. */
  text: string;
  /** Who or where it came from, as the notebook prints it in brackets. */
  label: string;
}

/** A cell a rule touches. `personId: null` is the whole column. */
export interface GridRuleCell {
  personId: Id | null;
  tick: Tick;
}

/**
 * Every fact the notebook holds, as one precise line. Later milestones add
 * kinds that are not placements (before/after an anchor, an absence over a
 * span, "together", a conditional); the list and the highlighting only read
 * `text` and `cells`, so a new kind needs no new drawing.
 */
export type GridRuleKind =
  | 'placement'
  | 'account'
  | 'window'
  | 'anchor'
  | 'discovery'
  | 'last-seen'
  /** M9: a clue's own one-line rule (`Clue.rule`). */
  | 'rule'
  /** M9: what somebody said when a fact was put to them. */
  | 'said';

export interface GridRule {
  id: string;
  kind: GridRuleKind;
  text: string;
  clueIds: Id[];
  cells: GridRuleCell[];
}

export interface GridTick {
  tick: Tick;
  /** "6", "6:30", … "11:30". */
  label: string;
  /** "6:00 PM". */
  clock: string;
}

export interface GridView {
  ticks: GridTick[];
  /** The victim, the client, the suspects the notebook holds. */
  rows: GridRow[];
  /** The fixtures the notebook holds, drawn in a section of their own. */
  fixtures: GridRow[];
  places: GridPlace[];
  /** The coroner's window as the notebook has it, which may be wider than the truth. */
  window: { ticks: Tick[]; label: string } | null;
  /** The words for the victim's row either side of the window. */
  life: { before: string; after: string } | null;
  anchors: GridAnchor[];
  /** The crime's half hour, once the notebook has it to one. */
  crimeTick: Tick | null;
  crimeLabel: string;
  sources: Record<Id, GridSourceText>;
  rules: GridRule[];
  /* M9: the logic game's pieces. Empty on a case without it. */
  margins: GridMargin[];
  descriptions: GridDescription[];
  counts: GridCount[];
  links: GridLink[];
  /** Whether the grid may flag a disagreement ("!"): Raw and Coddled only. */
  flags: boolean;
  /** Guidance (docs/39 §3): every soft mark, in the order found, for the key and the text grid. */
  hints: SoftMark[];
}

/* ------------------------------------------------------------------ *
 * Small helpers.
 * ------------------------------------------------------------------ */

/** "6", "6:30", "7" … the spoken label on a column. */
export function tickLabel(tick: Tick): string {
  const h = 6 + Math.floor(tick / 2);
  return tick % 2 === 0 ? String(h) : `${h}:30`;
}

/** "10:00", "10:30": a rule's hours, without the PM every one of them has. */
export function hm(tick: Tick): string {
  return clock(tick).replace(/ PM$/, '');
}

function span(from: Tick, to: Tick): string {
  return from === to ? hm(from) : `${hm(from)}–${hm(to)}`;
}

/** "the third floor" → "third floor", as a rule line reads it. */
function bare(shortName: string): string {
  return shortName.replace(/^the /i, '');
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Short, unique names for the cells: "third", "suite", "garage", "Wyck.",
 * "spea.". Six characters at most, so the whole evening fits across the
 * notebook page at 1280 wide; the legend spells each one out.
 */
export function placeAbbrevs(names: { id: Id; shortName: string }[]): Map<Id, string> {
  const out = new Map<Id, string>();
  const taken = new Set<string>();
  for (const { id, shortName } of names) {
    const words = shortName.replace(/^(the|my) /i, '').replace(/’s$|'s$/, '').split(/\s+/);
    const first = words[0] ?? shortName;
    const cut = (w: string): string => (w.length <= 6 ? w : `${w.slice(0, 4)}.`);
    const candidates = [
      cut(first),
      words[1] ? cut(`${first.slice(0, 3)}${words[1].slice(0, 3)}`) : '',
      cut(words.join('')),
    ].filter((c) => c.length > 0);
    let pick = candidates.find((c) => !taken.has(c.toLowerCase())) ?? cut(first);
    for (let n = 2; taken.has(pick.toLowerCase()); n++) pick = `${cut(first).slice(0, 4)}${n}`;
    taken.add(pick.toLowerCase());
    out.set(id, pick);
  }
  return out;
}

/**
 * M9 polish: two-letter tags for the book's grid, the way a logic-game solver
 * writes a place on a diagram. Two words give their initials ("third floor" →
 * TF, "subway kiosk" → SK, "my office" → MO, "Mrs. Teague’s" → MT); one word
 * its first two letters ("speakeasy" → SP, "walk-up" → WU). A clash takes the
 * first letter and the next letter of the name that is free.
 */
export function placeTags(names: { id: Id; shortName: string }[]): Map<Id, string> {
  const out = new Map<Id, string>();
  const taken = new Set<string>();
  for (const { id, shortName } of names) {
    const words = shortName
      .replace(/^(the|a|an) /i, '')
      .replace(/[’']s\b/g, '')
      .split(/[\s-]+/)
      .map((w) => w.replace(/[^A-Za-z]/g, ''))
      .filter((w) => w.length > 0);
    const letters = words.join('').toUpperCase();
    const first = letters.charAt(0) || 'X';
    const candidates: string[] = [];
    if (words.length >= 2) candidates.push(`${first}${(words[1] as string).charAt(0).toUpperCase()}`);
    for (const ch of letters.slice(1)) candidates.push(`${first}${ch}`);
    for (let n = 2; n < 10; n++) candidates.push(`${first}${n}`);
    const pick = candidates.find((c) => !taken.has(c)) ?? `${first}?`;
    taken.add(pick);
    out.set(id, pick);
  }
  return out;
}

/** The number of categorical colour slots the book defines. */
export const PLACE_SLOTS = 8;

export const ACCOUNT_PREFIX = 'account:';
export { SAID_PREFIX };
export const BRIEF_DISCOVERY = 'brief:discovery';
export const BRIEF_LAST_SEEN = 'brief:last-seen';

/* ------------------------------------------------------------------ *
 * Marks — the player's pencil.
 * ------------------------------------------------------------------ */

export type MarkAction =
  /** "Was at": one per cell. The same place again rubs it out. */
  | { kind: 'at'; placeId: Id }
  /** "Not at": several per cell; toggles. */
  | { kind: 'not'; placeId: Id }
  | { kind: 'clear' };

export function markOf(state: RunState, personId: Id, tick: Tick): CellMark | undefined {
  const m = state.marks?.[personId]?.[String(tick)];
  if (!m || (m.at === undefined && (m.notAt ?? []).length === 0)) return undefined;
  return m;
}

/** A new run state with one cell's pencil changed. Free: the clock never sees it. */
export function applyMark(state: RunState, personId: Id, tick: Tick, action: MarkAction): RunState {
  const was = markOf(state, personId, tick) ?? {};
  let at = was.at;
  let notAt = [...(was.notAt ?? [])];
  switch (action.kind) {
    case 'at':
      at = at === action.placeId ? undefined : action.placeId;
      notAt = notAt.filter((p) => p !== action.placeId);
      break;
    case 'not':
      if (notAt.includes(action.placeId)) notAt = notAt.filter((p) => p !== action.placeId);
      else notAt.push(action.placeId);
      if (at === action.placeId) at = undefined;
      break;
    case 'clear':
      at = undefined;
      notAt = [];
      break;
  }
  const person = { ...(state.marks?.[personId] ?? {}) };
  const key = String(tick);
  if (at === undefined && notAt.length === 0) delete person[key];
  else person[key] = { ...(at === undefined ? {} : { at }), ...(notAt.length > 0 ? { notAt } : {}) };
  const marks = { ...(state.marks ?? {}) };
  if (Object.keys(person).length === 0) delete marks[personId];
  else marks[personId] = person;
  return { ...state, marks };
}

/**
 * M9: link a stranger's sighting to a person, or unlink it (`null`). Free and
 * never a fact: the grid draws it in pencil's company, and only the report
 * scores it.
 */
export function applyLink(state: RunState, key: string, personId: Id | null): RunState {
  const links = { ...(state.links ?? {}) };
  if (personId === null || links[key] === personId) delete links[key];
  else links[key] = personId;
  return { ...state, links };
}

/* ------------------------------------------------------------------ *
 * Building the grid.
 * ------------------------------------------------------------------ */

/**
 * Who or where a clue came from, as the notebook brackets it: the speaker's
 * surname, or the room. The morgue's report is the one exception, because
 * "(the suite)" on a time of death reads as if the room said it.
 */
function sourceLabelOf(view: CaseView, clue: Clue): string {
  if (clue.source.type === 'person') return view.personById.get(clue.source.personId)?.surname ?? clue.source.personId;
  if (clue.kind === 'morgue') {
    const type = view.kase.act.type;
    return type === 'murder'
      ? 'the coroner'
      : type === 'affair'
        ? view.client.surname
        : type === 'lost-pet' || type === 'lost-item'
          ? 'the household'
          : 'the precinct report';
  }
  return view.placeById.get(clue.source.placeId)?.shortName ?? clue.source.placeId;
}

/** Whose word or what room, for one placement fact out of one clue. */
function entrySource(clue: Clue, subjectId: Id): Pick<GridEntry, 'source' | 'by' | 'from'> {
  if (clue.source.type === 'place') return { source: 'evidence', from: clue.source.placeId };
  if (clue.source.personId === subjectId) return { source: 'claimed', by: subjectId };
  return { source: 'witness', by: clue.source.personId };
}

export function isConflict(entries: readonly GridEntry[]): boolean {
  const at = new Set(entries.filter((e) => e.present).map((e) => e.placeId));
  if (at.size > 1) return true;
  return entries.some((e) => !e.present && at.has(e.placeId));
}

export function gridFrom(view: CaseView, state: RunState, book: Notebook = buildNotebook(view, state)): GridView {
  const kase = view.kase;
  const type = kase.act.type;
  const found = state.found
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined);
  const est = establishedFrom(view, state.found, state.accounts);
  const inBook = new Set(book.people.map((p) => p.id));
  // M9, "No automatic verdicts from Poached up": the grid shows two sources
  // side by side and never flags them; the player decides.
  const flags = verdictsOn(view);
  const sources: Record<Id, GridSourceText> = {};
  const rules: GridRule[] = [];

  const nameOf = (id: Id): string => view.personById.get(id)?.surname ?? id;
  const placeOf = (id: Id): string => view.placeById.get(id)?.shortName ?? id;
  const him = (id: Id): string => {
    const p = view.personById.get(id);
    return p ? (pronounSlots(p).him ?? 'him') : 'him';
  };
  const his = (id: Id): string => {
    const p = view.personById.get(id);
    return p ? (pronounSlots(p).his ?? 'his') : 'his';
  };
  // Playtest round 2: a door's head counts are one notebook line, and the
  // grid quotes that line for each of them.
  const countLine = new Map<Id, string>();
  for (const p of book.people) for (const r of p.records) for (const id of r.clueIds ?? []) countLine.set(id, r.text);
  const noteClue = (clue: Clue): void => {
    sources[clue.id] ??= { clueId: clue.id, text: countLine.get(clue.id) ?? clue.textRecord ?? clue.text, label: sourceLabelOf(view, clue) };
  };

  /* Entries, by person and tick. */
  const entries = new Map<Id, GridEntry[][]>();
  const put = (personId: Id, tick: Tick, entry: GridEntry): void => {
    if (!inBook.has(personId) || tick < 0 || tick >= TICKS) return;
    const row = entries.get(personId) ?? Array.from({ length: TICKS }, () => [] as GridEntry[]);
    const cell = row[tick] as GridEntry[];
    const same = cell.some(
      (e) => e.clueId === entry.clueId && e.placeId === entry.placeId && e.present === entry.present,
    );
    if (!same) cell.push(entry);
    entries.set(personId, row);
  };

  // 1. Every placement a found clue makes. All of them, not the first: two
  //    sources for one fact stack.
  const placementGroups = new Map<string, { clue: Clue; personId: Id; placeId: Id; present: boolean; ticks: Tick[] }>();
  for (const clue of found) {
    for (const f of clue.establishes) {
      if (f.kind !== 'personAt' && f.kind !== 'personNotAt') continue;
      if (!inBook.has(f.personId)) continue;
      const present = f.kind === 'personAt';
      noteClue(clue);
      put(f.personId, f.tick, { placeId: f.place, present, ...entrySource(clue, f.personId), clueId: clue.id });
      const key = `${clue.id}|${f.personId}|${f.place}|${present}`;
      const g = placementGroups.get(key) ?? { clue, personId: f.personId, placeId: f.place, present, ticks: [] };
      g.ticks.push(f.tick);
      placementGroups.set(key, g);
    }
  }

  // 2. Every account taken down, half hour by half hour.
  const accountRules: GridRule[] = [];
  const logic = kase.logic !== undefined;
  for (const personId of logic ? [] : state.accounts) {
    if (!inBook.has(personId)) continue;
    const account = claimedAccount(view, personId);
    if (!account) continue;
    const runs = accountRuns(account).filter((r) => r.placeId !== null);
    const id = `${ACCOUNT_PREFIX}${personId}`;
    sources[id] = {
      clueId: id,
      text: `says: ${runs.map((r) => `${spanLabel(r.from, r.to)} ${placeOf(r.placeId as Id)}`).join('; ')}`,
      label: `${nameOf(personId)}’s own account`,
    };
    for (const row of account.rows) {
      if (row.placeId === null) continue;
      put(personId, row.tick, { placeId: row.placeId, present: true, source: 'claimed', by: personId, clueId: id });
    }
    for (const r of runs) {
      accountRules.push({
        id: `account|${personId}|${r.from}`,
        kind: 'account',
        text: `${nameOf(personId)}: ${bare(placeOf(r.placeId as Id))}, ${span(r.from, r.to)} (${his(personId)} own account)`,
        clueIds: [id],
        cells: range(r.from, r.to).map((tick) => ({ personId, tick })),
      });
    }
  }

  // 2b. M9: the logic game's pieces, from the found clues and what was said
  //     when a fact was put to somebody.
  const margins: GridMargin[] = [];
  const descriptions: GridDescription[] = [];
  const counts: GridCount[] = [];
  const links: GridLink[] = [];
  const clueRules: GridRule[] = [];
  if (logic) {
    const speakerOf = (clue: Clue): Id | undefined =>
      clue.source.type === 'person' ? clue.source.personId : undefined;
    // An anchor is timed once a clue in hand says when it happened.
    const anchorTicks = new Map<Id, Tick[]>();
    for (const clue of found) {
      for (const f of clue.establishes) if (f.kind === 'anchorAt') anchorTicks.set(f.anchorId, f.ticks);
    }
    // Honest mechanics (docs/38): a found clue that names the anchor and one
    // of its hours in so many words (the scene: "the whistle went at half
    // past eight") has told the page that hour. An anchor that happens once
    // is then timed; one that happens more than once has one hour known of
    // several, and the grid says so rather than "hour not known".
    const namedTicks = new Map<Id, Tick[]>();
    for (const clue of found) {
      if (!clue.anchorId) continue;
      const anchor = view.anchorById.get(clue.anchorId);
      if (!anchor) continue;
      const text = clue.textRecord ?? clue.text;
      const named = anchor.ticks.filter((t) => text.includes(clock(t)));
      if (named.length === 0) continue;
      namedTicks.set(anchor.templateId, [...new Set([...(namedTicks.get(anchor.templateId) ?? []), ...named])].sort((a, b) => a - b));
    }
    for (const [id, ticks] of namedTicks) {
      const anchor = view.anchorById.get(id);
      if (!anchorTicks.has(id) && anchor && anchor.ticks.length === 1 && ticks.length === 1) anchorTicks.set(id, ticks);
    }
    const hourOf = (t: Tick): string => hm(t);
    const whenOf = (anchorId: Id): { ticks: Tick[]; when: string } => {
      const known = anchorTicks.get(anchorId);
      if (known && known.length > 0) return { ticks: [...known], when: known.map(hourOf).join(' or ') };
      const named = namedTicks.get(anchorId) ?? [];
      if (named.length > 0) {
        return {
          ticks: [],
          when: `${named.map(hourOf).join(' and ')} ${named.length === 1 ? 'was one of its hours' : 'were among its hours'}; the others are not known`,
        };
      }
      return { ticks: [], when: 'hour not known' };
    };
    const everyone = [...book.people.map((p) => p.id)];
    for (const clue of found) {
      const cells: GridRuleCell[] = [];
      const by = speakerOf(clue);
      for (const f of clue.establishes) {
        switch (f.kind) {
          case 'personAt':
          case 'personNotAt':
            cells.push({ personId: f.personId, tick: f.tick });
            break;
          case 'claims':
            noteClue(clue);
            for (const t of f.ticks) {
              put(f.personId, t, { placeId: f.place, present: true, source: 'claimed', by: f.personId, clueId: clue.id });
              cells.push({ personId: f.personId, tick: t });
            }
            if (f.with) links.push({ kind: 'with', a: f.personId, b: f.with, ticks: f.ticks, clueId: clue.id, by: f.personId });
            break;
          case 'personAtAnchor': {
            noteClue(clue);
            const ticks = anchorTicks.get(f.anchorId);
            if (ticks && ticks.length === 1) {
              const t = ticks[0] as Tick;
              put(f.personId, t, {
                placeId: f.place,
                present: true,
                ...entrySource(clue, f.personId),
                clueId: clue.id,
                anchorId: f.anchorId,
              });
              cells.push({ personId: f.personId, tick: t });
            } else if (inBook.has(f.personId)) {
              const anchor = view.anchorById.get(f.anchorId);
              let m = margins.find((x) => x.anchorId === f.anchorId);
              if (!m) {
                m = { anchorId: f.anchorId, name: anchor?.name ?? f.anchorId, ...whenOf(f.anchorId), entries: [] };
                margins.push(m);
              }
              if (!m.entries.some((e) => e.clueId === clue.id && e.personId === f.personId && e.placeId === f.place)) {
                m.entries.push({ personId: f.personId, placeId: f.place, clueId: clue.id, ...(by ? { by } : {}) });
              }
            }
            break;
          }
          case 'describedAt': {
            noteClue(clue);
            const key = `${clue.id}|${f.tick}`;
            const linkedTo = state.links?.[key];
            descriptions.push({
              key,
              clueId: clue.id,
              text: f.description.text,
              placeId: f.place,
              tick: f.tick,
              ...(by ? { by } : {}),
              ...(linkedTo ? { linkedTo } : {}),
            });
            if (linkedTo) {
              put(linkedTo, f.tick, {
                placeId: f.place,
                present: true,
                source: 'linked',
                ...(by ? { by } : {}),
                clueId: clue.id,
                link: key,
              });
            }
            cells.push({ personId: null, tick: f.tick });
            break;
          }
          case 'absentFrom': {
            noteClue(clue);
            for (const personId of everyone) {
              if (f.except.includes(personId)) continue;
              const person = view.personById.get(personId);
              if (!person || person.kind === 'victim') continue;
              for (const t of f.ticks) {
                put(personId, t, {
                  placeId: f.place,
                  present: false,
                  source: 'witness',
                  by: f.except[0] ?? by ?? personId,
                  clueId: clue.id,
                });
              }
            }
            for (const t of f.ticks) cells.push({ personId: null, tick: t });
            // Honest mechanics (docs/38): "nobody came in" is a count of
            // none, and "nobody but Bellucci" a count of one, on the same
            // row as the watcher's other counts. Playtest round 2: everybody
            // it names counts, the patrolman on his round included, as the
            // words say ("Ilse Hauck and the patrolman on the beat").
            const named = f.except.slice(1).length;
            for (const t of f.ticks) {
              if (counts.some((c) => c.placeId === f.place && c.tick === t && c.clueId === clue.id)) continue;
              counts.push({ placeId: f.place, tick: t, count: named, clueId: clue.id, fromAbsence: true, ...(by ? { by } : {}) });
            }
            break;
          }
          case 'countAt':
            noteClue(clue);
            counts.push({ placeId: f.place, tick: f.tick, count: f.count, clueId: clue.id, ...(by ? { by } : {}) });
            cells.push({ personId: null, tick: f.tick });
            break;
          case 'together':
          case 'apart':
            noteClue(clue);
            links.push({ kind: f.kind, a: f.personIds[0], b: f.personIds[1], ticks: f.ticks, clueId: clue.id, ...(by ? { by } : {}) });
            for (const t of f.kind === 'together' ? f.ticks : []) {
              cells.push({ personId: f.personIds[0], tick: t }, { personId: f.personIds[1], tick: t });
            }
            break;
          case 'timeOfDeath':
          case 'anchorAt':
            for (const t of f.ticks) cells.push({ personId: null, tick: t });
            break;
          case 'victimAliveAt':
          case 'victimDeadBy':
          case 'noiseAt':
            cells.push({ personId: null, tick: f.tick });
            break;
          case 'anchorKnowledge':
            for (const t of f.ticks) cells.push({ personId: null, tick: t });
            break;
          default:
            break;
        }
      }
      if ((clue.rule ?? '').length > 0) {
        noteClue(clue);
        const seen = new Set<string>();
        clueRules.push({
          id: `rule|${clue.id}`,
          kind: 'rule',
          text: clue.rule as string,
          clueIds: [clue.id],
          cells: cells.filter((c) => {
            const k = `${c.personId}|${c.tick}`;
            if (seen.has(k) || (c.personId !== null && !inBook.has(c.personId))) return false;
            seen.add(k);
            return true;
          }),
        });
      }
    }
    // What somebody said when a fact was put to them: a second story, or where
    // they really were. Their own word, in their own row.
    for (const said of saidRecords(view, state)) {
      if (!inBook.has(said.personId)) continue;
      sources[said.id] = { clueId: said.id, text: said.text, label: `${nameOf(said.personId)}, when I put it to ${him(said.personId)}` };
      const cells: GridRuleCell[] = [];
      for (const f of said.facts) {
        const placed: { place: Id; ticks: Tick[] } | null =
          f.kind === 'claims' ? { place: f.place, ticks: f.ticks } : f.kind === 'personAt' ? { place: f.place, ticks: [f.tick] } : null;
        if (!placed) continue;
        const who = (f as Extract<Fact, { personId: Id }>).personId;
        for (const t of placed.ticks) {
          put(who, t, { placeId: placed.place, present: true, source: 'claimed', by: who, clueId: said.id });
          cells.push({ personId: who, tick: t });
        }
      }
      clueRules.push({ id: `said|${said.id}`, kind: 'said', text: said.rule, clueIds: [said.id], cells });
    }
  }

  // 3. The briefing's two sentences that put somebody somewhere, which the
  //    notebook keeps under the victim from page one.
  const bio = kase.victimBio;
  const victimId = view.victim.id;
  const headRules: GridRule[] = [];
  if (bio.discovery) {
    const d = bio.discovery;
    sources[BRIEF_DISCOVERY] = { clueId: BRIEF_DISCOVERY, text: d.foundText, label: 'the briefing' };
    const finderSource: Pick<GridEntry, 'source' | 'by'> =
      d.foundById === view.client.id
        ? { source: 'claimed', by: d.foundById }
        : { source: 'witness', by: view.client.id };
    put(d.foundById, d.foundTick, { placeId: d.foundAt, present: true, ...finderSource, clueId: BRIEF_DISCOVERY });
    const cells: GridRuleCell[] = [{ personId: d.foundById, tick: d.foundTick }];
    if (type === 'murder') {
      put(victimId, d.foundTick, {
        placeId: d.foundAt,
        present: true,
        source: 'evidence',
        from: d.foundAt,
        clueId: BRIEF_DISCOVERY,
      });
      cells.push({ personId: victimId, tick: d.foundTick });
    }
    // A finder the notebook has no entry for yet has no row to light; the
    // rule waits for one, as the entry does.
    const touched = cells.filter((c) => c.personId === null || inBook.has(c.personId));
    if (touched.length > 0) {
      headRules.push({
        id: 'discovery',
        kind: 'discovery',
        text:
          type === 'murder'
            ? `${nameOf(victimId)}: found at ${bare(placeOf(d.foundAt))}, ${hm(d.foundTick)}, by ${nameOf(d.foundById)} (the briefing)`
            : `${nameOf(d.foundById)}: ${bare(placeOf(d.foundAt))}, ${hm(d.foundTick)}, found it gone (the briefing)`,
        clueIds: [BRIEF_DISCOVERY],
        cells: touched,
      });
    }
  }
  if (bio.lastSeen) {
    const l = bio.lastSeen;
    sources[BRIEF_LAST_SEEN] = { clueId: BRIEF_LAST_SEEN, text: l.text, label: 'the briefing' };
    put(victimId, l.tick, { placeId: l.place, present: true, source: 'witness', by: l.byId, clueId: BRIEF_LAST_SEEN });
    headRules.push({
      id: 'last-seen',
      kind: 'last-seen',
      text: `${nameOf(victimId)}: ${bare(placeOf(l.place))}, ${hm(l.tick)}, last seen (${nameOf(l.byId)} saw ${him(victimId)}; the briefing)`,
      clueIds: [BRIEF_LAST_SEEN],
      cells: [{ personId: victimId, tick: l.tick }],
    });
  }

  /* The window, the life line, the crime's half hour. */
  const deathLabel =
    type === 'murder'
      ? 'time of death'
      : type === 'robbery'
        ? 'when it was taken'
        : type === 'lost-pet'
          ? 'when it got out'
          : type === 'lost-item'
            ? 'when it went'
            : type === 'affair'
              ? 'the half hour that matters'
              : 'when they were last seen';
  const window = est.deathTicks.length > 0 ? { ticks: [...est.deathTicks], label: deathLabel } : null;
  const life =
    type === 'murder'
      ? { before: 'alive', after: 'dead' }
      : type === 'missing'
        ? { before: 'about', after: 'gone' }
        : null;
  const crimeTick = est.deathTicks.length === 1 ? (est.deathTicks[0] as Tick) : null;
  const victimRowTouched = !isTheft(type);
  for (const clue of found) {
    for (const f of clue.establishes) {
      if (f.kind === 'timeOfDeath') {
        noteClue(clue);
        const [a, b] = [f.ticks[0] as Tick, f.ticks[f.ticks.length - 1] as Tick];
        headRules.push({
          id: `window|${clue.id}`,
          kind: 'window',
          text: `${cap(deathLabel)}: ${span(a, b)} (${sourceLabelOf(view, clue)})`,
          clueIds: [clue.id],
          cells: range(a, b).map((tick) => ({ personId: null, tick })),
        });
      } else if (f.kind === 'victimAliveAt') {
        noteClue(clue);
        headRules.push({
          id: `alive|${clue.id}`,
          kind: 'window',
          text: `${cap(deathLabel)}: after ${hm(f.tick)} (${sourceLabelOf(view, clue)})`,
          clueIds: [clue.id],
          cells: [{ personId: victimRowTouched ? victimId : null, tick: f.tick }],
        });
      } else if (f.kind === 'victimDeadBy') {
        noteClue(clue);
        headRules.push({
          id: `dead|${clue.id}`,
          kind: 'window',
          text: `${cap(deathLabel)}: ${hm(f.tick)} or earlier (${sourceLabelOf(view, clue)})`,
          clueIds: [clue.id],
          cells: [{ personId: victimRowTouched ? victimId : null, tick: f.tick }],
        });
      }
    }
  }

  /* Anchors: an anchor is on the grid at the hours a found clue names it at. */
  const anchors: GridAnchor[] = [];
  for (const clue of found) {
    if (!clue.anchorId) continue;
    const anchor = view.anchorById.get(clue.anchorId);
    if (!anchor) continue;
    const text = clue.textRecord ?? clue.text;
    for (const tick of anchor.ticks) {
      if (!text.includes(clock(tick))) continue;
      noteClue(clue);
      const had = anchors.find((a) => a.anchorId === anchor.templateId && a.tick === tick);
      if (had) {
        if (!had.clueIds.includes(clue.id)) had.clueIds.push(clue.id);
        continue;
      }
      anchors.push({ anchorId: anchor.templateId, name: anchor.name, tick, clueIds: [clue.id] });
      headRules.push({
        id: `anchor|${anchor.templateId}|${tick}`,
        kind: 'anchor',
        text: `${cap(anchor.name)}: ${hm(tick)} (${sourceLabelOf(view, clue)})`,
        clueIds: [clue.id],
        cells: [{ personId: null, tick }],
      });
    }
  }
  // M9: an anchor timed by a clue in hand is on the grid at its hours too.
  for (const clue of found) {
    for (const f of clue.establishes) {
      if (f.kind !== 'anchorAt') continue;
      const anchor = view.anchorById.get(f.anchorId);
      for (const tick of f.ticks) {
        noteClue(clue);
        const had = anchors.find((a) => a.anchorId === f.anchorId && a.tick === tick);
        if (had) {
          if (!had.clueIds.includes(clue.id)) had.clueIds.push(clue.id);
          continue;
        }
        anchors.push({ anchorId: f.anchorId, name: anchor?.name ?? f.anchorId, tick, clueIds: [clue.id] });
      }
    }
  }
  anchors.sort((a, b) => a.tick - b.tick);

  /* Rows. */
  const hints = logic ? softMarks(view, state).filter((h) => inBook.has(h.personId)) : [];
  const makeRow = (personId: Id): GridRow => {
    const person = view.personById.get(personId);
    const kind: GridRowKind =
      person?.kind === 'victim'
        ? 'victim'
        : person?.isClient
          ? 'client'
          : person?.kind === 'fixture'
            ? 'fixture'
            : 'suspect';
    const role =
      kind === 'victim'
        ? type === 'murder'
          ? 'the victim'
          : isTheft(type)
            ? 'the owner'
            : type === 'affair'
              ? 'the one it is about'
              : 'missing'
        : kind === 'client'
          ? 'our client'
          : (person?.role ?? '');
    const row = entries.get(personId);
    const cells: GridCell[] = Array.from({ length: TICKS }, (_, tick) => {
      const list = row?.[tick] ?? [];
      const mark = markOf(state, personId, tick);
      const cell: GridCell = { tick, entries: list, conflict: flags && isConflict(list) };
      if (mark) cell.mark = mark;
      const soft = hints.filter((h) => h.personId === personId && h.tick === tick);
      if (soft.length > 0) {
        cell.hints = soft.map((h) => ({ kind: h.kind, text: h.text, placeId: h.placeId, ...(h.by ? { by: h.by } : {}), clueIds: h.clueIds }));
      }
      if (kind === 'victim' && life && window) {
        const lo = window.ticks[0] as Tick;
        const hi = window.ticks[window.ticks.length - 1] as Tick;
        cell.life = tick < lo ? 'before' : tick > hi ? 'after' : 'window';
      }
      return cell;
    });
    // M9: somebody only seen is what anybody can see, until named.
    return { personId, name: displayName(view, state, personId), role, kind, cells };
  };

  const order = (kind: GridRowKind): number =>
    ({ victim: 0, client: 1, suspect: 2, fixture: 3 })[kind];
  const allRows = book.people
    .map((p) => makeRow(p.id))
    .sort((a, b) => order(a.kind) - order(b.kind));
  const rows = allRows.filter((r) => r.kind !== 'fixture');
  const fixtures = allRows.filter((r) => r.kind === 'fixture');

  /* Placement rules, in row order. */
  const placementRules: GridRule[] = [...placementGroups.values()].map((g) => {
    const ticks = [...g.ticks].sort((a, b) => a - b);
    const src = entrySource(g.clue, g.personId);
    const by = sourceLabelOf(view, g.clue);
    const saw = g.clue.kind === 'observation' || g.clue.kind === 'anchor' ? `saw ${him(g.personId)}` : 'says so';
    const phrase =
      src.source === 'evidence'
        ? `found at ${bare(by)}`
        : src.source === 'claimed'
          ? `${his(g.personId)} own word`
          : g.present
            ? `${by} ${saw}`
            : `${by} says not`;
    return {
      id: `placement|${g.clue.id}|${g.personId}|${g.placeId}|${g.present}`,
      kind: 'placement' as const,
      text: `${nameOf(g.personId)}: ${g.present ? '' : 'not at '}${bare(placeOf(g.placeId))}, ${spans(ticks)} (${phrase})`,
      clueIds: [g.clue.id],
      cells: ticks.map((tick) => ({ personId: g.personId, tick })),
    };
  });
  const rowIndex = new Map(allRows.map((r, i) => [r.personId, i]));
  const firstTick = (r: GridRule): number => Math.min(...r.cells.map((c) => c.tick));
  const byRow = (r: GridRule): number => rowIndex.get(r.cells[0]?.personId ?? '') ?? 99;
  if (logic) {
    // M9: every fact in the notebook as the generator's own one-line rule,
    // in the order found, after the briefing's two.
    rules.push(...headRules.filter((r) => r.kind === 'discovery' || r.kind === 'last-seen'), ...clueRules);
  } else {
    rules.push(
      ...headRules.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || firstTick(a) - firstTick(b)),
      ...[...accountRules, ...placementRules].sort(
        (a, b) => byRow(a) - byRow(b) || firstTick(a) - firstTick(b) || kindOrder(a.kind) - kindOrder(b.kind),
      ),
    );
  }

  /* Places and the legend. */
  // A named place is labelled by its `short`, and tagged from it.
  const labelled = view.places.map((p) => ({ id: p.id, shortName: p.names?.short ?? p.shortName }));
  const abbrevs = placeAbbrevs(labelled);
  const tags = placeTags(labelled);
  const whereAsked = kase.act.unknowns.includes('where');
  const sceneId = whereAsked ? view.startId : view.sceneId;
  const sceneLabel = whereAsked
    ? type === 'affair'
      ? 'where they said they would be'
      : 'where the body was found'
    : type === 'murder'
      ? 'the scene'
      : type === 'robbery'
        ? 'where it was taken from'
        : type === 'lost-pet'
          ? 'where it got out'
          : type === 'lost-item'
            ? 'where it was kept'
            : type === 'affair'
              ? 'where they were'
              : 'where they were missed from';
  const used = new Set<Id>();
  for (const r of allRows) {
    for (const c of r.cells) {
      for (const e of c.entries) used.add(e.placeId);
      if (c.mark?.at) used.add(c.mark.at);
      for (const p of c.mark?.notAt ?? []) used.add(p);
    }
  }
  const places: GridPlace[] = view.places.map((p) => {
    const index = kase.places.findIndex((q) => q.id === p.id);
    const isScene = p.id === sceneId;
    return {
      id: p.id,
      shortName: p.shortName,
      label: p.names?.short ?? p.shortName.replace(/^the /i, ''),
      abbrev: abbrevs.get(p.id) ?? p.shortName,
      tag: tags.get(p.id) ?? p.shortName.slice(0, 2).toUpperCase(),
      slot: index >= 0 && index < PLACE_SLOTS ? index + 1 : 0,
      scene: isScene ? (whereAsked ? 'found' : 'scene') : null,
      ...(isScene ? { sceneLabel } : {}),
      used: used.has(p.id),
    };
  });

  // A head count is exact; a "nobody but" over a run may name somebody who
  // was there for only part of it (the patrolman on his round), so where both
  // speak of one half hour, the count's number stands.
  const exact = new Set(counts.filter((c) => !c.fromAbsence).map((c) => `${c.placeId}|${c.tick}`));
  for (let i = counts.length - 1; i >= 0; i--) {
    const c = counts[i] as GridCount;
    if (c.fromAbsence && exact.has(`${c.placeId}|${c.tick}`)) counts.splice(i, 1);
  }

  return {
    ticks: Array.from({ length: TICKS }, (_, tick) => ({ tick, label: tickLabel(tick), clock: clock(tick) })),
    rows,
    fixtures,
    places,
    window,
    life,
    anchors,
    crimeTick,
    crimeLabel:
      type === 'murder'
        ? 'when it happened'
        : type === 'robbery'
          ? 'when it was taken'
          : type === 'lost-pet'
            ? 'when it got out'
            : type === 'lost-item'
              ? 'when it went'
              : type === 'affair'
                ? 'the half hour that matters'
                : 'when they went',
    sources,
    rules,
    margins,
    descriptions,
    counts,
    links,
    flags,
    hints,
  };
}

function kindOrder(kind: GridRuleKind): number {
  return ['window', 'anchor', 'discovery', 'last-seen', 'account', 'placement', 'rule', 'said'].indexOf(kind);
}

function range(a: Tick, b: Tick): Tick[] {
  const out: Tick[] = [];
  for (let t = a; t <= b; t++) out.push(t);
  return out;
}

/** "9:00–10:00", or "8:00, 9:30" when the ticks do not run on. */
function spans(ticks: Tick[]): string {
  const runs: [Tick, Tick][] = [];
  for (const t of ticks) {
    const last = runs[runs.length - 1];
    if (last && t === last[1] + 1) last[1] = t;
    else runs.push([t, t]);
  }
  return runs.map(([a, b]) => span(a, b)).join(', ');
}

/** Every entry in the grid, with where it sits. For the transcript and the tests. */
export function gridEntries(grid: GridView): { row: GridRow; cell: GridCell; entry: GridEntry }[] {
  return [...grid.rows, ...grid.fixtures].flatMap((row) =>
    row.cells.flatMap((cell) => cell.entries.map((entry) => ({ row, cell, entry }))),
  );
}
