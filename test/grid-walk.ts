/**
 * The grid's trace, shared by `grid.test.ts` and `grid-walk.test.ts` so
 * vitest can run the walks side by side (the M6 walk's pattern).
 */

import { generateCase, type Difficulty } from '../src/gen/index.js';
import { clock } from '../src/gen/types.js';
import type { Id } from '../src/gen/types.js';
import { buildView, establishedFrom, type CaseView } from '../src/game/derive.js';
import { ACCOUNT_PREFIX, BRIEF_DISCOVERY, BRIEF_LAST_SEEN, gridEntries, gridFrom, isConflict } from '../src/game/grid.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import type { RunState } from '../src/game/types.js';

export const SEEDS = 40;

function statesOf(view: CaseView, commands: string[]): RunState[] {
  const states: RunState[] = [newRun(view, { detectiveName: 'Dashiell' })];
  for (const c of commands) states.push(stepInput(states[states.length - 1] as RunState, c, view).state);
  return states;
}

/** Every way the grid on this page could say more than the notebook does. */
export function problemsOf(view: CaseView, state: RunState, where: string): string[] {
  const problems: string[] = [];
  const book = buildNotebook(view, state);
  const grid = gridFrom(view, state, book);
  const found = new Set(state.found);
  const inBook = new Set(book.people.map((p) => p.id));
  const victim = book.people.find((p) => p.isVictim);
  const victimLines = victim
    ? [...victim.dossier.onSight, ...victim.dossier.volunteered, ...victim.dossier.fromOthers, ...victim.dossier.documents]
    : [];
  const noted = new Set<string>([
    ...book.people.flatMap((p) => p.records.map((r) => r.text)),
    ...book.places.flatMap((p) => p.clues.map((r) => r.text)),
    ...victimLines,
  ]);
  const accountLine = new Map(
    book.people
      .filter((p) => p.account)
      .map((p) => [p.id, `says: ${(p.account ?? []).map((a) => `${a.span} ${a.place}`).join('; ')}`]),
  );

  // Rows: only people the notebook holds.
  for (const row of [...grid.rows, ...grid.fixtures]) {
    if (!inBook.has(row.personId)) problems.push(`${where}: a row for ${row.personId}, who is not in the notebook`);
  }

  // Sources: every sentence is the notebook's, word for word.
  const tracesTo = (id: Id): boolean => {
    if (id.startsWith(ACCOUNT_PREFIX)) return state.accounts.includes(id.slice(ACCOUNT_PREFIX.length));
    if (id === BRIEF_DISCOVERY) return view.kase.victimBio.discovery !== undefined;
    if (id === BRIEF_LAST_SEEN) return view.kase.victimBio.lastSeen !== undefined;
    return found.has(id);
  };
  for (const [id, src] of Object.entries(grid.sources)) {
    if (!tracesTo(id)) problems.push(`${where}: source ${id} is not in hand`);
    if (id.startsWith(ACCOUNT_PREFIX)) {
      if (accountLine.get(id.slice(ACCOUNT_PREFIX.length)) !== src.text) {
        problems.push(`${where}: account line for ${id} is not the notebook's`);
      }
    } else if (!noted.has(src.text)) {
      problems.push(`${where}: source ${id} "${src.text}" is not in the notebook`);
    }
  }

  // Entries.
  for (const { row, cell, entry } of gridEntries(grid)) {
    const at = `${where} ${row.name} ${clock(cell.tick)} ${entry.clueId}`;
    if (!grid.sources[entry.clueId]) problems.push(`${at}: no source sentence`);
    if (entry.clueId.startsWith(ACCOUNT_PREFIX)) {
      const pid = entry.clueId.slice(ACCOUNT_PREFIX.length);
      const claim = view.claimedOf.get(pid)?.[cell.tick] ?? null;
      if (
        pid !== row.personId ||
        !state.accounts.includes(pid) ||
        entry.source !== 'claimed' ||
        !entry.present ||
        claim !== entry.placeId
      ) {
        problems.push(`${at}: not what the account says`);
      }
    } else if (entry.clueId === BRIEF_DISCOVERY) {
      const d = view.kase.victimBio.discovery;
      const ok =
        d !== undefined &&
        victimLines.includes(d.foundText) &&
        d.foundTick === cell.tick &&
        d.foundAt === entry.placeId &&
        entry.present &&
        (row.personId === d.foundById || (row.personId === view.victim.id && view.kase.act.type === 'murder'));
      if (!ok) problems.push(`${at}: not what the briefing's discovery says`);
    } else if (entry.clueId === BRIEF_LAST_SEEN) {
      const l = view.kase.victimBio.lastSeen;
      const ok =
        l !== undefined &&
        victimLines.includes(l.text) &&
        l.tick === cell.tick &&
        l.place === entry.placeId &&
        row.personId === view.victim.id &&
        entry.by === l.byId;
      if (!ok) problems.push(`${at}: not what the briefing's last sighting says`);
    } else {
      const clue = view.findableById.get(entry.clueId);
      if (!clue || !found.has(clue.id)) {
        problems.push(`${at}: clue not found yet`);
        continue;
      }
      const makes = clue.establishes.some(
        (f) =>
          (f.kind === 'personAt' || f.kind === 'personNotAt') &&
          f.personId === row.personId &&
          f.place === entry.placeId &&
          f.tick === cell.tick &&
          (f.kind === 'personAt') === entry.present,
      );
      if (!makes) problems.push(`${at}: the clue does not make this placement`);
      const expected =
        clue.source.type === 'place'
          ? 'evidence'
          : clue.source.personId === row.personId
            ? 'claimed'
            : 'witness';
      if (entry.source !== expected) problems.push(`${at}: source ${entry.source}, expected ${expected}`);
      if (entry.source === 'witness' && (clue.source.type !== 'person' || entry.by !== clue.source.personId)) {
        problems.push(`${at}: witness is not the speaker`);
      }
    }
  }

  // Conflicts are exactly the disagreements among entries; pencil never counts.
  for (const row of [...grid.rows, ...grid.fixtures]) {
    for (const cell of row.cells) {
      if (cell.conflict !== isConflict(cell.entries)) problems.push(`${where}: conflict flag wrong`);
    }
  }

  // The band is the notebook's window, and nothing is alive or dead without it.
  const est = establishedFrom(view, state.found, state.accounts);
  const band = grid.window?.ticks ?? [];
  if (JSON.stringify(band) !== JSON.stringify(est.deathTicks)) problems.push(`${where}: band is not the notebook's window`);
  if (grid.crimeTick !== null && (band.length !== 1 || band[0] !== grid.crimeTick)) {
    problems.push(`${where}: crime tick without a one-tick window`);
  }
  for (const row of [...grid.rows, ...grid.fixtures]) {
    for (const cell of row.cells) {
      if (cell.life && (row.kind !== 'victim' || band.length === 0)) problems.push(`${where}: life line without a window`);
    }
  }

  // Anchors: on the hours a found clue names them at.
  for (const a of grid.anchors) {
    for (const id of a.clueIds) {
      const clue = view.findableById.get(id);
      if (!clue || !found.has(id) || clue.anchorId !== a.anchorId || !(clue.textRecord ?? clue.text).includes(clock(a.tick))) {
        problems.push(`${where}: anchor ${a.anchorId} at ${a.tick} does not trace to ${id}`);
      }
    }
  }

  // Rules: every one traces, and touches only rows on the grid.
  const rowIds = new Set([...grid.rows, ...grid.fixtures].map((r) => r.personId));
  for (const rule of grid.rules) {
    for (const id of rule.clueIds) if (!tracesTo(id)) problems.push(`${where}: rule "${rule.text}" traces to ${id}, not in hand`);
    for (const c of rule.cells) {
      if (c.personId !== null && !rowIds.has(c.personId)) problems.push(`${where}: rule "${rule.text}" touches a missing row`);
    }
    if (rule.cells.length === 0) problems.push(`${where}: rule "${rule.text}" touches nothing`);
  }
  // Every entry is covered by some rule, so the list is the whole record.
  for (const { row, cell, entry } of gridEntries(grid)) {
    const covered = grid.rules.some(
      (r) => r.clueIds.includes(entry.clueId) && r.cells.some((c) => c.personId === row.personId && c.tick === cell.tick),
    );
    if (!covered) problems.push(`${where}: ${row.name} ${clock(cell.tick)} ${entry.clueId} has no rule`);
  }
  return problems;
}

export function walk(difficulty: Difficulty, wandering: boolean): { problems: string[]; pages: number; entries: number; conflicts: number } {
  const problems: string[] = [];
  let pages = 0;
  let entries = 0;
  let conflicts = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const view = buildView(generateCase(seed, { difficulty }));
    const commands = wandering
      ? playWandering(view, seed, 'Dashiell').steps.map((s) => s.command)
      : playOracle(view).steps.map((s) => s.command);
    for (const [n, state] of statesOf(view, commands).entries()) {
      pages++;
      problems.push(...problemsOf(view, state, `d${difficulty} seed ${seed} ${wandering ? 'wander' : 'oracle'} page ${n + 1}`));
      const grid = gridFrom(view, state);
      entries += gridEntries(grid).length;
      conflicts += [...grid.rows, ...grid.fixtures].flatMap((r) => r.cells).filter((c) => c.conflict).length;
    }
  }
  return { problems, pages, entries, conflicts };
}

