/**
 * docs/43 "Done means": the oracle's route, the refusal shortcut and a wanderer.
 *
 * - The oracle walks the designed path (docs/42) through the engine, walking
 *   where it must, and searches a murder's papers while it's at the scene.
 *   It must file a full report at par.
 * - The refusal shortcut catches every liar, puts it to each, and names the
 *   one who won't own up. It must never beat par.
 * - The wanderer takes random reasonable choices until the night runs out,
 *   and files whoever it caught lying. It should rarely solve from Poached up.
 * - docs/46 §4, the reader: it follows every star, otherwise takes the first
 *   choice, and files what the book told it. Its solved rate must fall by tier.
 */

import { Rng } from '../../gen/board/rng.js';
import { minimalSets } from '../../gen/board/path.js';
import { closure, pointerIndex } from '../../gen/board/pointers.js';
import { questionsOf, solve } from '../../gen/board/solver.js';
import { techniquesUpTo } from '../../gen/board/tiers.js';
import { boardChoices, pageStars, pickerFor } from './choices.js';
import { newBoardRun, stepBoard } from './engine.js';
import { collisionsOf, knownPlaces, solveRun } from './knowledge.js';
import { OFFICE, budgetCalls, isMurder, parCalls, suspectsOf, type BoardDeal, type BoardReport, type BoardRun, type Hour, type PersonId } from './model.js';
import { boardFields, breakOptions, heldWhereBy, truthReport, scoreBoard, whereByOptions } from './report.js';

export interface Played {
  run: BoardRun;
  commands: string[];
  /** Filed solved: the right name on the right line, and the rest right. */
  ok: boolean;
  reason?: string;
  report: BoardReport;
  /** The wanderer's report again, citing the line its collision showed instead of a random one. */
  alt?: BoardReport;
}

/** The command that asks a question, from wherever the detective is, or the walk to it first. */
function commandsFor(d: BoardDeal, run: BoardRun, q: string): string[] | null {
  const c = d.kase;
  const qq = questionsOf(c).find((x) => x.id === q);
  if (!qq) return null;
  const out: string[] = [];
  if (qq.at !== run.at) out.push(`go ${qq.at}`);
  const [kind, rest] = q.split(':') as [string, string];
  if (kind === 'search') out.push(`search ${rest}`);
  else if (kind === 'list') out.push(`ask ${rest} list`);
  else if (kind === 'account') out.push(`ask ${rest} evening`);
  else if (kind === 'confront') out.push(`CONFRONT ${rest}`);
  return out;
}

function step(d: BoardDeal, run: BoardRun, cmd: string, commands: string[]): BoardRun | string {
  let command = cmd;
  if (cmd.startsWith('CONFRONT ')) {
    const [p, hs] = cmd.slice(9).split('@') as [string, string];
    const col = collisionsOf(d.kase, run, p).find((x) => x.hour === Number(hs));
    const b = col?.breakers[0];
    if (!b) return `nothing breaks ${p} at ${hs}`;
    command = `put ${p} ${hs} ${b.id}`;
  }
  const r = stepBoard(d, run, command);
  if (r.error) return `${command}: ${r.error}`;
  commands.push(command);
  return r.run;
}

/** The designed path, through the engine. */
export function playBoardOracle(d: BoardDeal, name = 'Dashiell'): Played {
  const c = d.kase;
  let run = newBoardRun(d, { detectiveName: name });
  const commands: string[] = [];
  const order = d.analysis.path.map((s) => s.q);
  const motive = d.analysis.motive;
  for (const q of order) {
    const cmds = commandsFor(d, run, q);
    if (!cmds) return { run, commands, ok: false, reason: `no command for ${q}`, report: truthReport(d) };
    for (const cmd of cmds) {
      const r = step(d, run, cmd, commands);
      if (typeof r === 'string') return { run, commands, ok: false, reason: r, report: truthReport(d) };
      run = r;
    }
    // The papers, while the oracle is at the scene.
    if (motive && q.startsWith('search:') && run.at === c.crime.scene && !run.asked.includes(motive)) {
      const r = step(d, run, `search ${motive.slice(7)}`, commands);
      if (typeof r === 'string') return { run, commands, ok: false, reason: r, report: truthReport(d) };
      run = r;
    }
  }
  if (motive && !run.asked.includes(motive)) {
    for (const cmd of commandsFor(d, run, motive) ?? []) {
      const r = step(d, run, cmd, commands);
      if (typeof r === 'string') return { run, commands, ok: false, reason: r, report: truthReport(d) };
      run = r;
    }
  }
  // The true report, on the lines the path holds: what breaks the story, and what put it there.
  const report = truthReport(d, run);
  const r = stepBoard(d, run, 'file');
  run = r.run;
  const v = scoreBoard(d, run, report);
  const ok = v.outcome === 'solved' && v.points === v.asked && run.used <= parCalls(d);
  return { run, commands, ok, ...(ok ? {} : { reason: `${v.outcome}, points ${v.points}/${v.asked}, calls ${run.used} against par ${parCalls(d)}` }), report };
}

/**
 * The refusal shortcut, through the engine (decided 2026-09-28): catch every
 * liar, put it to each, and name the one who won't own up. Read as a player
 * would: an admission or a crack is owning up; a refusal is not; a second
 * story isn't a refusal yet, so it has to be broken (the list where it claims
 * to be) and put again first. Returns the cheapest calls, walks included, or
 * null when it names nobody (more than one holds out, or nobody does).
 */
export function refusalShortcutCalls(d: BoardDeal): { calls: number; names: PersonId | null } | null {
  const c = d.kase;
  const resp = (p: PersonId, h: number) => c.confrontations.find((k) => k.person === p && k.hour === h)?.response;
  const holdouts = new Set(c.lies.filter((l) => resp(l.person, l.hour) === 'refuse' || resp(l.person, l.hour) === 'second-lie').map((l) => l.person));
  if (holdouts.size !== 1) return null;
  const T = techniquesUpTo(c.tier);
  const motive = d.analysis.motive;
  const pool = questionsOf(c).map((q) => q.id).filter((q) => q !== motive);
  const goal = (held: string[]) => {
    const s = solve(c, closure(c, held), { techniques: T, tell: true });
    return s.done && s.who !== undefined;
  };
  const sets = minimalSets(pool, [], goal, d.analysis.par + 3, true);
  if (sets.length === 0) return null;
  let best: number | null = null;
  let names: PersonId | null = null;
  for (const set of sets.slice(0, 30)) {
    // A second story has to be broken and put again before it counts as holding out.
    const extra: Extra[] = [];
    for (const q of set) {
      if (!q.startsWith('confront:')) continue;
      const [p, hs] = q.slice(9).split('@') as [string, string];
      const k = c.confrontations.find((x) => x.person === p && x.hour === Number(hs));
      if (k?.response !== 'second-lie' || !k.secondLie?.place) continue;
      const w = c.lists.find((l) => l.place === k.secondLie?.place);
      if (!w) continue;
      extra.push({ id: `again:${p}`, at: c.people.find((x) => x.id === p)?.foundAt ?? '', after: [q, `list:${w.watcher}`] });
      if (!set.includes(`list:${w.watcher}`)) extra.push({ id: `list:${w.watcher}`, at: w.place, after: [q] });
    }
    const calls = cheapestCalls(d, set, extra);
    if (calls === null) continue;
    if (best === null || calls < best) {
      best = calls;
      names = solve(c, closure(c, set), { techniques: T, tell: true }).who ?? null;
    }
  }
  if (best === null) return null;
  return { calls: best + (motive ? 1 : 0), names };
}

/**
 * The confession route: in a small case at Raw to Poached the culprit cracks
 * when the lie is put ("All right. I took it."). The cheapest calls to hear
 * that and file: their story, what breaks it, the put. For the record only:
 * docs/42 has the crack give where it is and why, not who.
 */
export function confessionCalls(d: BoardDeal): number | null {
  const c = d.kase;
  const k = c.confrontations.find((x) => x.person === c.crime.culprit && x.response === 'crack');
  if (!k) return null;
  const T = techniquesUpTo(c.tier);
  const q = `confront:${k.person}@${k.hour}`;
  const pool = questionsOf(c).map((x) => x.id).filter((x) => !x.startsWith('confront:'));
  const goal = (held: string[]) => solve(c, closure(c, held), { techniques: T }).status.get(`${k.person}@${k.hour}`)?.s === 'broken';
  const sets = minimalSets(pool, [], goal, 5, true);
  let best: number | null = null;
  for (const set of sets.slice(0, 30)) {
    const calls = cheapestCalls(d, [...set, q], []);
    if (calls !== null && (best === null || calls < best)) best = calls;
  }
  return best;
}

interface Extra {
  id: string;
  at: string;
  after: string[];
}

/**
 * The fewest calls (walks included) to ask a set of questions in an order the
 * pointers allow, by an exact search over orders (the sets are small).
 */
function cheapestCalls(d: BoardDeal, set: string[], extra: Extra[]): number | null {
  const c = d.kase;
  const idx = pointerIndex(c);
  const qs = new Map(questionsOf(c).map((q) => [q.id, q]));
  const items = [...set.map((id) => ({ id, at: qs.get(id)?.at ?? '', after: [] as string[] })), ...extra.filter((e) => !set.includes(e.id) || e.id.startsWith('again:'))];
  const n = items.length;
  if (n > 14) return null;
  const T = techniquesUpTo(c.tier);
  const okAfter = (j: number, mask: number): boolean => {
    const it = items[j] as Extra;
    const doneIds = items.filter((_, i) => mask & (1 << i)).map((x) => x.id);
    if (!it.after.every((a) => doneIds.includes(a))) return false;
    if (it.id.startsWith('again:')) return true;
    if (it.id.startsWith('confront:')) {
      const p = it.id.slice(9).split('@')[0] as string;
      if (!doneIds.includes(`account:${p}`)) return false;
      return solve(c, doneIds.filter((x) => !x.startsWith('again:')), { techniques: T, tell: true }).status.get(it.id.slice(9))?.s === 'broken';
    }
    const by = idx.by.get(it.id);
    return !!by && [...by.keys()].some((s) => s === 'givens' || doneIds.includes(s));
  };
  const FULL = (1 << n) - 1;
  const memo = new Map<string, number>();
  const go = (mask: number, at: string): number => {
    if (mask === FULL) return 0;
    const key = `${mask}|${at}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j) || !okAfter(j, mask)) continue;
      const it = items[j] as Extra;
      const walk = it.at !== at ? 1 : 0;
      best = Math.min(best, walk + 1 + go(mask | (1 << j), it.at));
    }
    memo.set(key, best);
    return best;
  };
  const v = go(0, OFFICE);
  return Number.isFinite(v) ? v : null;
}

/**
 * A wanderer: random reasonable choices (anything a page offers that costs a
 * call and hasn't been done, puts included, with a random line) until the
 * night runs out; then it files whoever it caught lying, at the hour it caught
 * them, with the means and a motive it heard, if any.
 */
export function playWanderer(d: BoardDeal, seed: number): Played {
  const c = d.kase;
  const rng = new Rng((seed * 2246822519) >>> 0);
  let run = newBoardRun(d);
  const commands: string[] = [];
  const budget = budgetCalls(d);
  for (let guard = 0; guard < 80 && !run.reportOpen && run.used < budget; guard++) {
    const groups = boardChoices(d, run);
    const options: string[] = [];
    for (const g of groups) {
      for (const ch of [...g.choices, ...(g.more ?? [])]) {
        if (ch.done || ch.command === 'file' || ch.command === 'recap') continue;
        if (ch.command.startsWith('picker ')) {
          const pk = pickerFor(d, run, ch.command.slice(7));
          if (!pk) continue;
          const lines = [...pk.ready.map((r) => r.command), ...pk.claims.flatMap((cl) => cl.lines.map((l) => l.command))];
          if (lines.length) options.push(rng.pick(lines));
          continue;
        }
        if (ch.command.startsWith('go ') && !knownPlaces(c, run).has(ch.command.slice(3)) && ch.command !== `go ${OFFICE}`) continue;
        if (ch.command === `go ${OFFICE}`) continue;
        options.push(ch.command);
      }
    }
    if (options.length === 0) break;
    const r = stepBoard(d, run, rng.pick(options));
    if (r.error) continue;
    commands.push(r.run.log[r.run.log.length - 1]?.board?.q ?? '');
    run = r.run;
  }
  // What it files: whoever it caught lying, at that hour; the means if it searched for it; where
  // the thing is if the night told it; and the named one's reason. Otherwise a guess off the form.
  // docs/46 §4: what breaks their story is a line picked at random from what the form offers for
  // that name, and so is what puts it there; `alt` is the same report citing the collision instead.
  const caught = collisionsOf(c, run).filter((x) => suspectsOf(c).includes(x.person));
  const pick = caught.length > 0 ? (rng.pick(caught) as { person: PersonId; hour: Hour }) : null;
  const base = filedFrom(d, run, rng, pick);
  const opts = breakOptions(d, run, base.who);
  const wopts = whereByOptions(d, run);
  const report: BoardReport = {
    ...base,
    breaks: opts.length > 0 ? rng.pick(opts).value : null,
    ...(isMurder(c) ? {} : { whereBy: wopts.length > 0 ? rng.pick(wopts).value : null }),
  };
  const alt: BoardReport = { ...base, breaks: pick ? (collisionsOf(c, run, pick.person).find((x) => x.hour === pick.hour)?.breakers[0]?.id ?? null) : null, ...(isMurder(c) ? {} : { whereBy: heldWhereBy(d, run)[0]?.value ?? null }) };
  run = stepBoard(d, run, 'file').run;
  const v = scoreBoard(d, run, report);
  return { run, commands, ok: v.outcome === 'solved', report, alt };
}

/** A filed report's plain answers, as the wanderer and the reader give them: the person named, at the hour they were caught, and what the night told them. */
function filedFrom(d: BoardDeal, run: BoardRun, rng: Rng, pick: { person: PersonId; hour: Hour } | null): BoardReport {
  const c = d.kase;
  const s = solveRun(c, run);
  const fields = boardFields(d);
  const guess = (k: string) => rng.pick(fields.find((f) => f.key === k)?.options ?? [{ value: '', label: '' }]).value;
  const truth = truthReport(d);
  const who = pick?.person ?? guess('who');
  return {
    who,
    when: pick?.hour ?? Number(guess('when')),
    why: who,
    ...(isMurder(c) ? { how: s.how || run.asked.some((q) => q === `search:${c.finds.find((f) => f.gives.means)?.id}`) ? (truth.how ?? null) : guess('how') } : { where: s.whereNow ? (truth.where ?? null) : guess('where') }),
  };
}

/**
 * docs/46 §4: the reader. It follows every star and otherwise takes the first
 * choice a page offers (the first person's first topic not yet asked, the
 * first search, the first place), until the night runs out. It reads instead
 * of deducing, so it files what the book told it: the name a thought walked
 * it to, if one did; otherwise whoever the book caught lying (one of them, at
 * random), on the line the book set against them. The rest as the wanderer.
 */
export function playReader(d: BoardDeal, seed: number): Played {
  const c = d.kase;
  const rng = new Rng((seed * 2654435761 + 97) >>> 0);
  let run = newBoardRun(d);
  const commands: string[] = [];
  const budget = budgetCalls(d);
  for (let guard = 0; guard < 80 && !run.reportOpen && run.used < budget; guard++) {
    const cmd = readerNext(d, run);
    if (!cmd) break;
    const r = stepBoard(d, run, cmd);
    if (r.error) break;
    commands.push(cmd);
    run = r.run;
  }
  // The name the book walked it to: the elimination's last step, or "That left X".
  const told = toldWho(d, run);
  const caught = collisionsOf(c, run).filter((x) => suspectsOf(c).includes(x.person));
  const pick = told ? (caught.find((x) => x.person === told) ?? { person: told, hour: c.crime.hour }) : caught.length > 0 ? (rng.pick(caught) as { person: PersonId; hour: Hour }) : null;
  const base = filedFrom(d, run, rng, pick);
  // The line the book set against them: the line it put to them, if it landed; else the collision's.
  const put = pick ? run.puts.find((x) => x.person === pick.person && x.hour === pick.hour && x.landed && !x.again) : undefined;
  const col = pick ? collisionsOf(c, run, pick.person).find((x) => x.hour === pick.hour) : undefined;
  const report: BoardReport = {
    ...base,
    breaks: put?.line ?? col?.breakers[0]?.id ?? null,
    ...(isMurder(c) ? {} : { whereBy: heldWhereBy(d, run)[0]?.value ?? null }),
  };
  run = stepBoard(d, run, 'file').run;
  const v = scoreBoard(d, run, report);
  return { run, commands, ok: v.outcome === 'solved', report };
}

/** The reader's next command: the page's first star, or else its first choice. */
function readerNext(d: BoardDeal, run: BoardRun): string | null {
  const star = pageStars(d, run)[0];
  if (star) return star.command.startsWith('picker ') ? pickerCommand(d, run, star.command.slice(7), star.q) : star.command;
  for (const g of boardChoices(d, run)) {
    if (g.kind === 'free') continue;
    for (const ch of [...g.choices, ...(g.more ?? [])]) {
      if (ch.done) continue;
      if (ch.command.startsWith('picker ')) {
        const cmd = pickerCommand(d, run, ch.command.slice(7));
        if (cmd) return cmd;
        continue;
      }
      return ch.command;
    }
  }
  return null;
}

/** What the picker's first choice puts: the ready-made pair (the starred hour's, if a star sent it), or the first claim's first line. */
function pickerCommand(d: BoardDeal, run: BoardRun, p: PersonId, q?: string): string | null {
  const pk = pickerFor(d, run, p);
  if (!pk) return null;
  const hour = q?.startsWith('confront:') ? q.split('@')[1] : undefined;
  if (pk.ready.length > 0) return (pk.ready.find((r) => hour !== undefined && r.command.startsWith(`put ${p} ${hour} `)) ?? pk.ready[0])?.command ?? null;
  const claim = pk.claims.find((x) => hour !== undefined && String(x.hour) === hour) ?? pk.claims[0];
  return claim?.lines[0]?.command ?? null;
}

/** Whom the night's thoughts named as the one left, if they did. */
function toldWho(d: BoardDeal, run: BoardRun): PersonId | null {
  const c = d.kase;
  for (const page of run.log) {
    const text = page.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n');
    if (/That left one person who/.test(text)) {
      // The elimination's last step: the one nobody placed, and the solver agrees.
      const who = solveRun(c, run).who;
      if (who) return who;
    }
    const m = /That left (\S+?)(?:,| and)/.exec(text);
    const hit = m ? c.people.find((p) => p.role === 'suspect' && p.short === m[1]) : undefined;
    if (hit) return hit.id;
  }
  return null;
}
