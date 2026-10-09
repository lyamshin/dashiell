/**
 * docs/43: the board engine's one way forward. A command in, a page out.
 *
 * Commands are plain strings, the same ones the book's buttons and the play
 * CLI's `do` hand in:
 *
 * - `go <place>`: a walk, a call;
 * - `ask <person> evening|list|motive`: a question, a call (free once asked: read back);
 * - `search <find>`: a search, a call (free once done);
 * - `put <person> <hour> <line> [again]`: a confrontation, a call, landed or not;
 * - `recap`: go over what I have, free;
 * - `file`: take out the report form, free.
 *
 * The clock is v1's: the night's calls spread across midnight to eight.
 */

import { isOver } from '../clock.js';
import type { Page } from '../types.js';
import type { Weather } from '../voice/roll.js';
import { boardChoices, pageStars, type BoardStar } from './choices.js';
import { collisionsOf, judgeLine, knownPeople, knownPlaces, linesHeld, peopleAt, solveRun } from './knowledge.js';
import {
  OFFICE,
  budgetCalls,
  nameOf,
  placeName,
  type BoardDeal,
  type BoardReport,
  type BoardRun,
  type CaseType,
  type Hour,
  type PersonId,
} from './model.js';
import {
  writeAccount,
  writeArrive,
  writeConfront,
  writeList,
  writeMotive,
  writeOffice,
  writeRecap,
  writeRepeat,
  writeSearch,
  writeTurn,
  writer,
  type Writer,
} from './pages.js';

const WEATHERS: Weather[] = ['clear', 'rain', 'fog', 'cold'];

export function newBoardRun(d: BoardDeal, opts: { detectiveName?: string; type?: CaseType } = {}): BoardRun {
  const c = d.kase;
  const base: BoardRun = {
    engine: 'board',
    seed: c.seed,
    tier: c.tier,
    ...(opts.type ? { type: opts.type } : {}),
    detectiveName: opts.detectiveName ?? 'Dashiell',
    at: OFFICE,
    used: 0,
    asked: [],
    puts: [],
    visited: [],
    log: [],
    marks: {},
    reportOpen: false,
    spent: [],
    weather: WEATHERS[(c.seed * 13 + c.tier) % WEATHERS.length] as Weather,
    visits: {},
  };
  const w = writer(d, base, base, 0);
  writeOffice(w);
  return finish(w, base, { job: 'office', cost: 0, head: 'the office', at: OFFICE });
}

export interface StepResult {
  run: BoardRun;
  page: Page;
  /** Set when the command couldn't be done; the run is unchanged. */
  error?: string;
}

export function stepBoard(d: BoardDeal, run: BoardRun, input: string): StepResult {
  const c = d.kase;
  const fail = (error: string): StepResult => ({ run, page: run.log[run.log.length - 1] as Page, error });
  if (run.filed) return fail('The report is filed.');
  const words = input.trim().split(/\s+/);
  const verb = words[0];
  const next: BoardRun = { ...run, asked: [...run.asked], puts: [...run.puts], visited: [...run.visited], log: [...run.log], spent: [...run.spent], visits: { ...run.visits } };
  const n = run.log.length;

  if (verb === 'file') {
    next.reportOpen = true;
    const w = writer(d, run, next, n);
    w.blocks.push({ kind: 'prose', text: 'I sat down with the form.', voice: 'narrator' });
    return { run: finish(w, next, { job: 'nothing', cost: 0 }), page: next.log[n] as Page };
  }
  if (run.reportOpen) return fail('The report form is out. File it.');

  if (verb === 'recap') {
    if (run.at === OFFICE) return fail('Not in the office.');
    const w = writer(d, run, next, n);
    writeRecap(w, starsLine(d, next));
    return { run: finish(w, next, { job: 'recap', cost: 0 }), page: next.log[n] as Page };
  }

  if (verb === 'go') {
    const place = words[1] ?? '';
    if (place === run.at) return fail('Already here.');
    if (place === OFFICE) {
      next.at = OFFICE;
      next.used = run.used + 1;
      const w = writer(d, run, next, n);
      w.blocks.push({ kind: 'prose', text: 'I went back up to the office. It had kept my chair warm for nobody.', voice: 'establish' });
      return { run: finish(w, next, { job: 'arrive', cost: 1, head: 'the office' }), page: next.log[n] as Page };
    }
    if (!knownPlaces(c, run).has(place)) return fail(`I don’t know a place called ${place}.`);
    next.at = place;
    next.used = run.used + 1;
    next.visits[place] = (run.visits[place] ?? 0) + 1;
    const w = writer(d, run, next, n);
    writeArrive(w, place);
    if (!next.visited.includes(place)) next.visited.push(place);
    return { run: finish(w, next, { job: 'arrive', cost: 1 }), page: next.log[n] as Page };
  }

  if (verb === 'ask') {
    const p = words[1] as PersonId;
    const topic = words[2] ?? 'evening';
    if (!peopleAt(c, run, run.at).includes(p)) return fail(`${nameOf(c, p)} isn’t here.`);
    const person = c.people.find((x) => x.id === p);
    if (!person || person.role === 'client') return fail('The client has said what there is to say.');
    const q = topic === 'list' ? `list:${p}` : topic === 'motive' ? `motive:${p}` : `account:${p}`;
    if (topic === 'list' && person.role !== 'watcher') return fail(`${person.short} doesn’t keep a door.`);
    if (topic !== 'list' && person.role === 'watcher') return fail(`${person.short} keeps the place; ask who was there.`);
    if (topic === 'motive' && person.role !== 'suspect') return fail(`${person.short} has nothing to say about that.`);
    if (run.asked.includes(q)) {
      const w = writer(d, run, next, n);
      writeRepeat(w, q);
      return { run: finish(w, next, { job: 'repeat', cost: 0, q }), page: next.log[n] as Page };
    }
    next.asked.push(q);
    next.used = run.used + 1;
    const w = writer(d, run, next, n);
    if (topic === 'list') writeList(w, p);
    else if (topic === 'motive') writeMotive(w, p);
    else writeAccount(w, p);
    return { run: finish(w, next, { job: topic === 'list' ? 'list' : topic === 'motive' ? 'motive' : 'account', cost: 1, q }), page: next.log[n] as Page };
  }

  if (verb === 'search') {
    const id = words[1] ?? '';
    const f = c.finds.find((x) => x.id === id);
    if (!f || f.place !== run.at) return fail('Nothing like that to search here.');
    const q = `search:${id}`;
    if (run.asked.includes(q)) {
      const w = writer(d, run, next, n);
      writeRepeat(w, q);
      return { run: finish(w, next, { job: 'repeat', cost: 0, q }), page: next.log[n] as Page };
    }
    next.asked.push(q);
    next.used = run.used + 1;
    const w = writer(d, run, next, n);
    writeSearch(w, id);
    return { run: finish(w, next, { job: 'search', cost: 1, q }), page: next.log[n] as Page };
  }

  if (verb === 'put') {
    const p = words[1] as PersonId;
    const h = Number(words[2]) as Hour;
    const lineId = words[3] ?? '';
    const again = words[4] === 'again';
    if (!peopleAt(c, run, run.at).includes(p)) return fail(`${nameOf(c, p)} isn’t here.`);
    if (!run.asked.includes(`account:${p}`)) return fail(`I haven’t heard ${nameOf(c, p)}’s story yet.`);
    const line = linesHeld(c, run).find((l) => l.id === lineId);
    if (!line) return fail('I don’t have that line.');
    let j = judgeLine(c, run, p, h, line);
    if (again) {
      // The second story: the list where it claims to be, without them on it.
      const k = c.confrontations.find((x) => x.person === p && x.hour === h);
      const lands = line.kind === 'list' && line.place === k?.secondLie?.place && line.hour === h && !line.about.includes(p);
      j = lands ? { landed: true } : { landed: false, why: `It didn’t touch where ${nameOf(c, p)} said ${c.people.find((x) => x.id === p)?.female ? 'she' : 'he'} was the second time.` };
    }
    next.used = run.used + 1;
    next.puts.push({ person: p, hour: h, line: lineId, landed: j.landed, ...(again ? { again: true } : {}), page: n });
    if (j.landed && !again && !next.asked.includes(`confront:${p}@${h}`)) next.asked.push(`confront:${p}@${h}`);
    const w = writer(d, run, next, n);
    writeConfront(w, p, h, line, j, again);
    return { run: finish(w, next, { job: 'confront', cost: 1, q: `confront:${p}@${h}` }), page: next.log[n] as Page };
  }

  return fail(`No command "${input}".`);
}

/** Write the page into the run: the turn if this is the first lie caught, the clock, the head. */
function finish(w: Writer, next: BoardRun, o: { job: NonNullable<Page['board']>['job']; cost: number; q?: string; head?: string; at?: string }): BoardRun {
  const c = w.c;
  const n = next.log.length;
  // The turn: the first page on which a lie is caught.
  let turn = false;
  if (next.turn === undefined && o.job !== 'recap' && o.job !== 'repeat' && collisionsOf(c, next).length > 0) {
    writeTurn(w);
    next.turn = n;
    turn = true;
  }
  if (!next.reportOpen && isOver(next.used, budgetCalls(w.d))) {
    next.reportOpen = true;
    w.blocks.push({
      kind: 'note',
      text: c.type === 'murder' ? 'Eight o’clock. The DA’s man was on the stairs, and whatever I had was what got filed.' : `Eight o’clock, and ${c.people.find((p) => p.id === c.client)?.short ?? 'the client'} was at the door wanting an answer.`,
    });
  }
  const page: Page = {
    n,
    head: o.head ?? placeName(c, o.at ?? next.at),
    blocks: w.blocks,
    cost: o.cost,
    cardsUsed: [...w.hand.spent],
    found: o.q ? [o.q] : [],
    at: next.at,
    gaps: [],
    plain: 0,
    image: 0,
    imageMotifs: [],
    board: {
      job: o.job,
      ...(o.q ? { q: o.q } : {}),
      told: [...w.told],
      hours: [...w.hours].sort((a, b) => a - b),
      people: [...w.people],
      places: [...w.places].filter(Boolean),
      ...(turn ? { turn: true } : {}),
      ...(w.callback ? { callback: true } : {}),
    },
  };
  next.spent = [...next.spent, ...w.hand.spent];
  next.log = [...next.log, page];
  return next;
}

/** "Three things would move it. …": the page's stars, read out (the recap's last word). */
export function starsLine(d: BoardDeal, run: BoardRun): string | null {
  const stars: BoardStar[] = pageStars(d, run);
  if (stars.length === 0) return null;
  const words = ['', 'One thing', 'Two things', 'Three things'][stars.length] ?? 'A few things';
  return `${words} would move it. ${stars.map((s) => `${s.why.replace(/\s—\s/, ': ')}.`).join(' ')}`;
}

/** File the report. Final. */
export function fileBoard(run: BoardRun, report: BoardReport): BoardRun {
  return { ...run, reportOpen: true, filed: report };
}

export { boardChoices, knownPeople, solveRun };
