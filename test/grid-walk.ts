/**
 * The grid's trace, shared by `grid.test.ts` and `grid-walk.test.ts` so
 * vitest can run the walks side by side (the M6 walk's pattern).
 */

import { generateCase, type Difficulty } from '../src/gen/index.js';
import { clock } from '../src/gen/types.js';
import type { Id } from '../src/gen/types.js';
import { buildView, establishedFrom, type CaseView } from '../src/game/derive.js';
import { ACCOUNT_PREFIX, BRIEF_DISCOVERY, BRIEF_LAST_SEEN, SAID_PREFIX, applyLink, gridEntries, gridFrom, isConflict } from '../src/game/grid.js';
import { saidRecords } from '../src/game/m9.js';
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
    // M9: what somebody said when a fact was put to them.
    ...book.people.flatMap((p) => p.said.map((r) => r.text)),
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
  const said = saidRecords(view, state);
  const tracesTo = (id: Id): boolean => {
    if (id.startsWith(ACCOUNT_PREFIX)) return state.accounts.includes(id.slice(ACCOUNT_PREFIX.length));
    if (id.startsWith(SAID_PREFIX)) return said.some((r) => r.id === id);
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
    } else if (entry.clueId.startsWith(SAID_PREFIX)) {
      // M9: their own words when a fact was put to them.
      const r = said.find((x) => x.id === entry.clueId);
      const ok =
        r !== undefined &&
        r.personId === row.personId &&
        entry.source === 'claimed' &&
        entry.present &&
        r.facts.some(
          (f) =>
            (f.kind === 'claims' && f.place === entry.placeId && f.ticks.includes(cell.tick)) ||
            (f.kind === 'personAt' && f.place === entry.placeId && f.tick === cell.tick),
        );
      if (!ok) problems.push(`${at}: not what they said when it was put to them`);
    } else {
      const clue = view.findableById.get(entry.clueId);
      if (!clue || !found.has(clue.id)) {
        problems.push(`${at}: clue not found yet`);
        continue;
      }
      if (entry.source === 'linked') {
        // M9: the player's own link, from a stranger's sighting in hand.
        const ok =
          entry.link !== undefined &&
          state.links?.[entry.link] === row.personId &&
          clue.establishes.some((f) => f.kind === 'describedAt' && f.place === entry.placeId && f.tick === cell.tick) &&
          entry.link === `${clue.id}|${cell.tick}`;
        if (!ok) problems.push(`${at}: a link the player did not make`);
        continue;
      }
      const anchorTimed = (anchorId: Id): number[] => {
        for (const id of state.found) {
          for (const f of view.findableById.get(id)?.establishes ?? []) if (f.kind === 'anchorAt' && f.anchorId === anchorId) return f.ticks;
        }
        // docs/38: an anchor that happens once is timed by a clue in hand
        // that names its hour in words (the scene's "…stopped at nine o'clock").
        const anchor = view.anchorById.get(anchorId);
        if (anchor && anchor.ticks.length === 1) {
          const t = anchor.ticks[0] as number;
          for (const id of state.found) {
            const c = view.findableById.get(id);
            if (c?.anchorId === anchorId && (c.textRecord ?? c.text).includes(clock(t as never))) return [t];
          }
        }
        return [];
      };
      const makes = clue.establishes.some(
        (f) =>
          ((f.kind === 'personAt' || f.kind === 'personNotAt') &&
            f.personId === row.personId &&
            f.place === entry.placeId &&
            f.tick === cell.tick &&
            (f.kind === 'personAt') === entry.present) ||
          // M9: an account's claim, the person's own word.
          (f.kind === 'claims' && f.personId === row.personId && f.place === entry.placeId && f.ticks.includes(cell.tick) && entry.present) ||
          // M9: a sighting timed by an anchor whose one hour is in hand.
          (f.kind === 'personAtAnchor' &&
            f.personId === row.personId &&
            f.place === entry.placeId &&
            entry.present &&
            JSON.stringify(anchorTimed(f.anchorId)) === JSON.stringify([cell.tick])) ||
          // M9: nobody but these came in: a strike for everybody else.
          (f.kind === 'absentFrom' &&
            !entry.present &&
            f.place === entry.placeId &&
            f.ticks.includes(cell.tick) &&
            !f.except.includes(row.personId)),
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
      if (cell.conflict !== (grid.flags && isConflict(cell.entries))) problems.push(`${where}: conflict flag wrong`);
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
      const timed = (clue?.establishes ?? []).some((f) => f.kind === 'anchorAt' && f.anchorId === a.anchorId && f.ticks.includes(a.tick));
      if (!clue || !found.has(id) || (!timed && (clue.anchorId !== a.anchorId || !(clue.textRecord ?? clue.text).includes(clock(a.tick))))) {
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
    if (rule.cells.length === 0 && rule.kind !== 'rule' && rule.kind !== 'said') problems.push(`${where}: rule "${rule.text}" touches nothing`);
    // M9: a clue's own rule is the generator's line for exactly that clue.
    if (rule.kind === 'rule' && view.findableById.get(rule.clueIds[0] ?? '')?.rule !== rule.text) {
      problems.push(`${where}: rule "${rule.text}" is not its clue's own line`);
    }
  }
  // Every entry is covered by some rule, so the list is the whole record.
  for (const { row, cell, entry } of gridEntries(grid)) {
    const covered = grid.rules.some(
      (r) =>
        r.clueIds.includes(entry.clueId) &&
        r.cells.some((c) => (c.personId === row.personId || c.personId === null) && c.tick === cell.tick),
    );
    if (!covered) problems.push(`${where}: ${row.name} ${clock(cell.tick)} ${entry.clueId} has no rule`);
  }
  // M9: margins, strangers' sightings, counts and links, each to a clue in hand.
  for (const m of grid.margins) {
    for (const e of m.entries) {
      const clue = view.findableById.get(e.clueId);
      const ok = clue && found.has(clue.id) && clue.establishes.some((f) => f.kind === 'personAtAnchor' && f.anchorId === m.anchorId && f.personId === e.personId && f.place === e.placeId);
      if (!ok) problems.push(`${where}: margin ${m.anchorId} ${e.clueId} does not trace`);
    }
  }
  for (const d of grid.descriptions) {
    const clue = view.findableById.get(d.clueId);
    const ok = clue && found.has(clue.id) && clue.establishes.some((f) => f.kind === 'describedAt' && f.place === d.placeId && f.tick === d.tick && f.description.text === d.text);
    if (!ok) problems.push(`${where}: description ${d.key} does not trace`);
    if (d.linkedTo !== undefined && state.links?.[d.key] !== d.linkedTo) problems.push(`${where}: description ${d.key} linked by nobody`);
  }
  for (const c of grid.counts) {
    const clue = view.findableById.get(c.clueId);
    // docs/38: "nobody (but X) came in" is a count too — playtest round 2: of
    // everybody it names, the patrolman on his round included, as its words do.
    const ok =
      clue &&
      found.has(clue.id) &&
      clue.establishes.some(
        (f) =>
          (f.kind === 'countAt' && f.place === c.placeId && f.tick === c.tick && f.count === c.count) ||
          (f.kind === 'absentFrom' &&
            f.place === c.placeId &&
            f.ticks.includes(c.tick) &&
            f.except.slice(1).length === c.count),
      );
    if (!ok) problems.push(`${where}: count ${c.clueId} does not trace`);
  }
  for (const l of grid.links) {
    const clue = view.findableById.get(l.clueId);
    const ok =
      clue &&
      found.has(clue.id) &&
      clue.establishes.some(
        (f) =>
          ((f.kind === 'together' || f.kind === 'apart') && f.kind === l.kind && f.personIds[0] === l.a && f.personIds[1] === l.b) ||
          (f.kind === 'claims' && l.kind === 'with' && f.personId === l.a && f.with === l.b),
      );
    if (!ok) problems.push(`${where}: link ${l.clueId} does not trace`);
  }
  // Ink never shows a fact the notebook does not flag: no "!" from Poached up.
  if (!grid.flags && [...grid.rows, ...grid.fixtures].some((r) => r.cells.some((c) => c.conflict))) {
    problems.push(`${where}: a flag at a tier with no verdicts`);
  }
  return problems;
}

/**
 * M9: the same walk over a tiered case — the oracle's route, then a fact put
 * to everybody whose account is in hand (one that lands and one that does
 * not, where the notebook has them), and every stranger's sighting linked to
 * the first person it fits.
 */
export function walkTiered(tier: 2 | 3 | 4 | 5, level: 1 | 2 | 3, seeds: number): { problems: string[]; pages: number; entries: number; said: number; linked: number; margins: number } {
  const problems: string[] = [];
  let pages = 0;
  let entries = 0;
  let saidCount = 0;
  let linked = 0;
  let marginCount = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const view = buildView(generateCase(seed, { tier, level }));
    const commands = playOracle(view).steps.map((s) => s.command);
    const states = statesOf(view, commands);
    let state = states[states.length - 1] as RunState;
    // Confront everybody here whose account is taken, with two facts each.
    for (const c of view.kase.logic?.confrontations ?? []) {
      if (!state.accounts.includes(c.personId)) continue;
      const person = view.personById.get(c.personId);
      if (!person?.foundAt) continue;
      const held = new Set(state.found);
      const right = c.contradictions.flat().filter((id) => held.has(id));
      for (const clueId of [...right.slice(0, 2), state.found[state.found.length - 1] as string]) {
        state = stepInput(state, `go ${view.placeById.get(person.foundAt)?.shortName}`, view).state;
        state = stepInput(state, `put ${clueId} to ${person.surname}`, view).state;
        states.push(state);
      }
    }
    for (const d of gridFrom(view, state).descriptions) {
      const who = view.kase.logic?.descriptions ? Object.entries(view.kase.logic.descriptions).find(([, x]) => x.text === d.text)?.[0] : undefined;
      if (who) state = applyLink(state, d.key, who);
    }
    states.push(state);
    for (const [n, st] of states.entries()) {
      pages++;
      problems.push(...problemsOf(view, st, `T${tier}L${level} seed ${seed} page ${n + 1}`));
      const grid = gridFrom(view, st);
      entries += gridEntries(grid).length;
    }
    const last = gridFrom(view, state);
    saidCount += saidRecords(view, state).length;
    linked += last.descriptions.filter((d) => d.linkedTo !== undefined).length;
    marginCount += last.margins.length;
  }
  return { problems, pages, entries, said: saidCount, linked, margins: marginCount };
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

