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

import { TICKS, clock } from '../gen/types.js';
import type { Clue, Id, Tick } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { accountRuns, claimedAccount, establishedFrom, spanLabel } from './derive.js';
import { buildNotebook, type Notebook } from './notebook.js';
import type { CellMark, RunState } from './types.js';
import { pronounSlots } from './voice/cast.js';

export type { CellMark };

/* ------------------------------------------------------------------ *
 * The model.
 * ------------------------------------------------------------------ */

/**
 * Where a claim came from. `claimed` is the person's own word (an account
 * taken down, or a clue in which they place themselves); `witness` is somebody
 * else's word, and `by` says whose; `evidence` is a document or a physical
 * trace, and `from` says which room it came out of.
 */
export type GridSource = 'claimed' | 'witness' | 'evidence';

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
   * briefing sentences the notebook keeps under the victim.
   */
  clueId: Id;
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
  /** Unique across the case, at most eight characters. */
  abbrev: string;
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
export type GridRuleKind = 'placement' | 'account' | 'window' | 'anchor' | 'discovery' | 'last-seen';

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

/** Short, unique names for the cells: "third", "speak.", "Wyckoff". */
export function placeAbbrevs(names: { id: Id; shortName: string }[]): Map<Id, string> {
  const out = new Map<Id, string>();
  const taken = new Set<string>();
  for (const { id, shortName } of names) {
    const words = shortName.replace(/^(the|my) /i, '').replace(/’s$|'s$/, '').split(/\s+/);
    const first = words[0] ?? shortName;
    const cut = (w: string): string => (w.length <= 7 ? w : `${w.slice(0, 5)}.`);
    const candidates = [
      cut(first),
      words[1] ? cut(`${first.slice(0, 3)}${words[1].slice(0, 3)}`) : '',
      cut(words.join('')),
    ].filter((c) => c.length > 0);
    let pick = candidates.find((c) => !taken.has(c.toLowerCase())) ?? cut(first);
    for (let n = 2; taken.has(pick.toLowerCase()); n++) pick = `${cut(first).slice(0, 5)}${n}`;
    taken.add(pick.toLowerCase());
    out.set(id, pick);
  }
  return out;
}

/** The number of categorical colour slots the book defines. */
export const PLACE_SLOTS = 8;

export const ACCOUNT_PREFIX = 'account:';
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
  if (clue.kind === 'morgue') return view.kase.act.type === 'murder' ? 'the coroner' : 'the precinct report';
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
  const noteClue = (clue: Clue): void => {
    sources[clue.id] ??= { clueId: clue.id, text: clue.textRecord ?? clue.text, label: sourceLabelOf(view, clue) };
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
  for (const personId of state.accounts) {
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
    type === 'murder' ? 'time of death' : type === 'robbery' ? 'when it was taken' : 'when they were last seen';
  const window = est.deathTicks.length > 0 ? { ticks: [...est.deathTicks], label: deathLabel } : null;
  const life =
    type === 'murder'
      ? { before: 'alive', after: 'dead' }
      : type === 'missing'
        ? { before: 'about', after: 'gone' }
        : null;
  const crimeTick = est.deathTicks.length === 1 ? (est.deathTicks[0] as Tick) : null;
  const victimRowTouched = type !== 'robbery';
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
  anchors.sort((a, b) => a.tick - b.tick);

  /* Rows. */
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
          : type === 'robbery'
            ? 'the owner'
            : 'missing'
        : kind === 'client'
          ? 'our client'
          : (person?.role ?? '');
    const row = entries.get(personId);
    const cells: GridCell[] = Array.from({ length: TICKS }, (_, tick) => {
      const list = row?.[tick] ?? [];
      const mark = markOf(state, personId, tick);
      const cell: GridCell = { tick, entries: list, conflict: isConflict(list) };
      if (mark) cell.mark = mark;
      if (kind === 'victim' && life && window) {
        const lo = window.ticks[0] as Tick;
        const hi = window.ticks[window.ticks.length - 1] as Tick;
        cell.life = tick < lo ? 'before' : tick > hi ? 'after' : 'window';
      }
      return cell;
    });
    return { personId, name: person?.surname ?? personId, role, kind, cells };
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
  rules.push(
    ...headRules.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || firstTick(a) - firstTick(b)),
    ...[...accountRules, ...placementRules].sort(
      (a, b) => byRow(a) - byRow(b) || firstTick(a) - firstTick(b) || kindOrder(a.kind) - kindOrder(b.kind),
    ),
  );

  /* Places and the legend. */
  const abbrevs = placeAbbrevs(view.places);
  const whereAsked = kase.act.unknowns.includes('where');
  const sceneId = whereAsked ? view.startId : view.sceneId;
  const sceneLabel = whereAsked
    ? 'where the body was found'
    : type === 'murder'
      ? 'the scene'
      : type === 'robbery'
        ? 'where it was taken from'
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
      abbrev: abbrevs.get(p.id) ?? p.shortName,
      slot: index >= 0 && index < PLACE_SLOTS ? index + 1 : 0,
      scene: isScene ? (whereAsked ? 'found' : 'scene') : null,
      ...(isScene ? { sceneLabel } : {}),
      used: used.has(p.id),
    };
  });

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
      type === 'murder' ? 'when it happened' : type === 'robbery' ? 'when it was taken' : 'when they went',
    sources,
    rules,
  };
}

function kindOrder(kind: GridRuleKind): number {
  return ['window', 'anchor', 'discovery', 'last-seen', 'account', 'placement'].indexOf(kind);
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
