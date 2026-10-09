/**
 * docs/43: `npm run play -- … --engine board`, the board night played blind,
 * one choice at a time, in plain text. The same commands as the v1/v2 tool
 * (docs/37), on the board engine:
 *
 *   new --seed N --tier 0..5 --engine board [--type murder|lost-item|lost-pet] [--no-teach] --save F
 *   look · do <n|words> · page <n> · notebook · grid · pencil "<Name> <hour> at|not|clear [place]"
 *   report · file "who=…; when=…; how=…; why=…; where=…" · story · curtain · help
 *
 * A page lists the people here (choosing one opens their topics, free),
 * then what to search and where to go. "Put it to X" opens the picker: at
 * Raw and Coddled the pairs ready-made, from Poached up the claim and then
 * the line. Nothing printed before filing shows the truth, par, the path or
 * the solver.
 */

import { parseTier, type CaseType } from '../gen/board/index.js';
import { clockStrip, usedByPage } from '../game/clock.js';
import { boardChoices, pickerFor, type Picker } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { boardGridText, placeCodes } from '../game/board/grid.js';
import { BOARD_TEACH_LINES, BOARD_TEACH_TITLE, BOARD_RULES } from '../game/board/teach.js';
import { OFFICE, budgetCalls, dealBoard, deadlineWords, nameOf, placeName, tierName, type BoardDeal, type BoardReport, type BoardRun } from '../game/board/model.js';
import { boardFields, curtainOfBoard, reportFrom, scoreBoard, storyOfBoard, type FieldKey } from '../game/board/report.js';
import { costText, notebookText, pageBodyText } from '../game/board/text.js';
import { wrap } from '../game/transcript.js';
import type { OfferedChoice, OfferedGroup } from '../game/types.js';
import type { PlayIo, PlayResult } from './play-lib.js';

const WIDTH = 76;
const RULE = '─'.repeat(WIDTH);
const DOUBLE = '═'.repeat(WIDTH);

type Event = { do: string } | { mark: { person: string; hour: number; action: 'at' | 'not' | 'clear'; place?: string } } | { file: BoardReport };

export interface BoardSave {
  game: 'dashiell-play';
  version: 1;
  engine: 'board';
  seed: number;
  tier: number;
  type?: CaseType;
  detective: string;
  events: Event[];
  /** Whose topics are open. Free; not a page. */
  person: string | null;
  /** Whose picker is open, and from Poached up the claim's hour picked. */
  picker: string | null;
  claim: number | null;
}

class Fail extends Error {}
const fail = (m: string): never => {
  throw new Fail(m);
};

interface Night {
  save: BoardSave;
  d: BoardDeal;
  run: BoardRun;
  /** The run as each page left it, for its choices. */
  pages: BoardRun[];
}

function deal(save: BoardSave): Night {
  const d = dealBoard(save.seed, save.tier as 0, save.type);
  let run = newBoardRun(d, { detectiveName: save.detective, ...(save.type ? { type: save.type } : {}) });
  const pages: BoardRun[] = [run];
  for (const e of save.events) {
    run = apply(d, run, e);
    pages[run.log.length - 1] = run;
  }
  return { save, d, run, pages };
}

function apply(d: BoardDeal, run: BoardRun, e: Event): BoardRun {
  if ('do' in e) return stepBoard(d, run, e.do).run;
  if ('mark' in e) return markRun(run, e.mark);
  return { ...run, reportOpen: true, filed: e.file };
}

function markRun(run: BoardRun, m: { person: string; hour: number; action: 'at' | 'not' | 'clear'; place?: string }): BoardRun {
  const marks = { ...run.marks, [m.person]: { ...(run.marks[m.person] ?? {}) } };
  const cell = { ...(marks[m.person]?.[String(m.hour)] ?? {}) };
  if (m.action === 'clear') delete (marks[m.person] as Record<string, unknown>)[String(m.hour)];
  else if (m.action === 'at' && m.place) (marks[m.person] as Record<string, unknown>)[String(m.hour)] = { ...cell, at: m.place };
  else if (m.action === 'not' && m.place) (marks[m.person] as Record<string, unknown>)[String(m.hour)] = { ...cell, notAt: [...(cell.notAt ?? []), m.place] };
  return { ...run, marks };
}

/* ------------------------------------------------------------ the page */

function head(night: Night, i: number): string {
  const { d, run } = night;
  const strip = clockStrip(usedByPage(run.log, i), budgetCalls(d), deadlineWords(d.kase));
  const place = run.log[i]?.head ?? '';
  const right = `${strip.time} · page ${i + 1} of ${run.log.length}`;
  const notches = strip.notches.map((n) => (n === 'spent' ? 'x' : n === 'next' ? 'o' : '.')).join('');
  return [`${place}${' '.repeat(Math.max(2, WIDTH - place.length - right.length))}${right}`, `[${notches}] ${strip.left}`, RULE].join('\n');
}

function pageText(night: Night, i: number): string {
  const page = night.run.log[i];
  return page ? `${head(night, i)}\n\n${pageBodyText(page)}` : '';
}

interface Item {
  n: number;
  choice: OfferedChoice;
  group: OfferedGroup;
  /** A person's row on the page: opens their topics. */
  person?: string;
}

function itemLine(n: number, c: OfferedChoice, cost: string): string {
  const mark = c.lead ? '* ' : '  ';
  const label = `${c.label}${c.done ? ' ✓' : ''}${c.note ? ` — ${c.note}` : ''}${c.lead && c.why ? ` — ${c.why}` : ''}`;
  const num = `${String(n).padStart(4)}. `;
  const room = WIDTH - num.length - mark.length - cost.length - 2;
  const lines = wrap(label, room).split('\n');
  return [`${num}${mark}${(lines[0] ?? '').padEnd(room)}  ${cost}`, ...lines.slice(1).map((l) => `${' '.repeat(num.length + mark.length)}${l}`)].join('\n');
}

/** The page's numbered items: a line a person, then searches, walks and the free row. */
function pageItems(night: Night): Item[] {
  const groups = boardChoices(night.d, night.run);
  const out: Item[] = [];
  let n = 1;
  for (const g of groups) {
    if (g.kind === 'ask') {
      const star = g.choices.find((c) => c.lead);
      out.push({ n: n++, group: g, person: g.personId as string, choice: { command: `person ${g.personId}`, label: nameOf(night.d.kase, g.personId as string), minutes: 0, lead: !!star, done: false, ...(star?.why ? { why: star.why } : {}) } });
      continue;
    }
    for (const c of [...g.choices, ...(g.more ?? [])]) out.push({ n: n++, group: g, choice: c });
  }
  return out;
}

function pageChoicesText(night: Night): string {
  const items = pageItems(night);
  const out: string[] = ['WHAT NEXT'];
  let last = '';
  for (const it of items) {
    const kind = it.group.kind;
    if (kind !== last) {
      out.push('');
      out.push(kind === 'ask' ? 'Talk to (choosing somebody opens what to ask them; that is free):' : kind === 'free' ? 'Free:' : `${it.group.heading}:`);
      last = kind;
    }
    if (it.person) {
      const g = it.group;
      out.push(itemLine(it.n, it.choice, `${g.choices.length} ${g.choices.length === 1 ? 'topic' : 'topics'}`));
      continue;
    }
    out.push(itemLine(it.n, it.choice, costText(it.choice)));
  }
  out.push('', wrap('A star is worth taking now (never more than three), and says why. ✓ is done already, and free to read again. Choosing somebody costs nothing: their topics open, and "back" shuts them.'));
  return out.join('\n');
}

function topicItems(night: Night, person: string): Item[] {
  const g = boardChoices(night.d, night.run).find((x) => x.kind === 'ask' && x.personId === person);
  if (!g) return [];
  return g.choices.map((c, i) => ({ n: i + 1, choice: c, group: g }));
}

function topicText(night: Night, person: string): string {
  const items = topicItems(night, person);
  const out = [`ASK ${nameOf(night.d.kase, person).toUpperCase()} ABOUT`, ''];
  for (const it of items) out.push(itemLine(it.n, it.choice, it.choice.command.startsWith('picker') ? 'opens' : costText(it.choice)));
  out.push('', itemLine(items.length + 1, { command: 'back', label: 'Back to the page', minutes: 0, lead: false, done: false }, 'free'));
  return out.join('\n');
}

/* ----------------------------------------------------------- the picker */

function pickerItems(night: Night, pk: Picker): { n: number; command: string; label: string; source?: string; claim?: number }[] {
  const out: { n: number; command: string; label: string; source?: string; claim?: number }[] = [];
  let n = 1;
  if (pk.ready.length > 0) {
    for (const r of pk.ready) out.push({ n: n++, command: r.command, label: r.label });
    return out;
  }
  const cl = night.save.claim === null ? null : pk.claims.find((x) => x.hour === night.save.claim);
  if (!cl) {
    for (const x of pk.claims) out.push({ n: n++, command: `claim ${x.hour}`, label: `${nameOf(night.d.kase, pk.person)} says ${x.label}`, claim: x.hour });
    return out;
  }
  for (const l of cl.lines) out.push({ n: n++, command: l.command, label: l.label, source: l.source });
  return out;
}

function pickerText(night: Night, pk: Picker): string {
  const c = night.d.kase;
  const out = [`PUT IT TO ${nameOf(c, pk.person).toUpperCase()}`, '', wrap(`${pk.help} Each costs ${pk.minutes} min. If it breaks nothing, the time is gone all the same, and I’ll say why.`)];
  const items = pickerItems(night, pk);
  const picking = pk.ready.length === 0 && night.save.claim !== null;
  out.push('');
  out.push(pk.ready.length > 0 ? 'Their line, and the line that breaks it:' : picking ? `Against “${pk.claims.find((x) => x.hour === night.save.claim)?.label}”, read ${pronWord(night, pk.person)}:` : 'Which of their claims?');
  for (const it of items) out.push(itemLine(it.n, { command: it.command, label: it.label, minutes: 0, lead: false, done: false }, it.claim !== undefined ? 'free' : `${pk.minutes} min`) + (it.source ? `\n          (${it.source})` : ''));
  out.push('', itemLine(items.length + 1, { command: 'back', label: picking ? 'Back to the claims' : 'Put nothing to them', minutes: 0, lead: false, done: false }, 'free'));
  return out.join('\n');
}

function pronWord(night: Night, p: string): string {
  return night.d.kase.people.find((x) => x.id === p)?.female ? 'her' : 'him';
}

/* ------------------------------------------------------------ the form */

function reportText(night: Night, path: string): string {
  const out = ['THE REPORT', '', wrap(night.run.used >= budgetCalls(night.d) ? (night.d.kase.type === 'murder' ? 'Eight o’clock, and the DA’s man is standing over the desk. Whatever is on the page is what gets filed.' : 'Eight o’clock, and the client is at the door wanting an answer.') : 'Filing is final. Leave a line blank and it goes in as I don’t know.'), ''];
  for (const f of boardFields(night.d)) {
    out.push(`${f.label} (${f.key}):`);
    f.options.forEach((o, i) => out.push(`   ${String(i + 1).padStart(2)}. ${o.label}`));
    out.push('');
  }
  out.push(wrap(`File it with: npm run play -- file "who=…; when=…; ${night.d.kase.type === 'murder' ? 'how' : 'where'}=…; why=…" --save ${path} — an answer is its number or enough of its words. A line left out is I don’t know.`));
  return out.join('\n');
}

function parseReport(night: Night, text: string): BoardReport {
  const fields = boardFields(night.d);
  const answers: Partial<Record<FieldKey, string | null>> = {};
  for (const part of text.split(';').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\w+)\s*=\s*(.+)$/.exec(part);
    if (!m) fail(`Can’t read "${part}". Write key=answer.`);
    const key = (m as RegExpExecArray)[1] as FieldKey;
    const raw = ((m as RegExpExecArray)[2] as string).trim();
    const f = fields.find((x) => x.key === key);
    if (!f) fail(`The form doesn’t ask "${key}". It asks: ${fields.map((x) => x.key).join(', ')}.`);
    const spec = f as (typeof fields)[number];
    const v = fold(raw);
    if (/^\d+$/.test(v) && spec.options[Number(v) - 1] && !(key === 'when' && spec.options.some((o) => o.value === v))) {
      answers[key] = (spec.options[Number(v) - 1] as { value: string }).value;
      continue;
    }
    const hits = spec.options.filter((o) => fold(o.label) === v || fold(o.value) === v || fold(o.label).includes(v));
    if (hits.length !== 1) fail(hits.length === 0 ? `"${raw}" isn’t one of the ${key} options.` : `"${raw}" fits more than one ${key} option.`);
    answers[key] = (hits[0] as { value: string }).value;
  }
  return reportFrom(night.d, answers);
}

const fold = (s: string): string => s.toLowerCase().replace(/[’']/g, "'").replace(/^\*\s*/, '').replace(/\s+/g, ' ').replace(/ o'clock$/, '').trim();

function verdictText(night: Night): string {
  const v = scoreBoard(night.d, night.run, night.run.filed as BoardReport);
  const out = ['THE VERDICT', ''];
  for (const f of v.fields) out.push(`  ${f.label}: ${f.given}${f.correct ? '  ✓' : `  ✗ — it was ${f.truth}`}`);
  out.push('', `${v.points} out of ${v.asked}.`, '');
  for (const p of v.closing) out.push(wrap(p.replace(/\*\*/g, '')), '');
  out.push(wrap('`story` tells what really happened; `curtain` shows the true board, the path and the lies.'));
  return out.join('\n');
}

/* ------------------------------------------------------------ commands */

function lookText(night: Night, path: string): string {
  const { run, save } = night;
  if (run.filed) return verdictText(night);
  const body = pageText(night, run.log.length - 1);
  if (run.reportOpen) return `${body}\n\n${DOUBLE}\n\n${reportText(night, path)}`;
  if (save.picker) {
    const pk = pickerFor(night.d, run, save.picker);
    if (pk) return `${body}\n\n${DOUBLE}\n\n${pickerText(night, pk)}`;
  }
  if (save.person) return `${body}\n\n${DOUBLE}\n\n${topicText(night, save.person)}`;
  return `${body}\n\n${DOUBLE}\n\n${pageChoicesText(night)}`;
}

function load(io: PlayIo, path: string | undefined): Night {
  if (!path) fail('Say which save: --save <file>.');
  const text = io.read(path as string);
  if (text === null) fail(`No save at ${path}.`);
  const save = JSON.parse(text as string) as BoardSave;
  return deal(save);
}

function store(io: PlayIo, path: string, save: BoardSave): void {
  io.write(path, `${JSON.stringify(save, null, 1)}\n`);
}

function commit(io: PlayIo, path: string, night: Night, events: Event[], changes: Partial<BoardSave> = {}): Night {
  const save = { ...night.save, ...changes, events: [...night.save.events, ...events] };
  let run = night.run;
  const pages = [...night.pages];
  for (const e of events) {
    run = apply(night.d, run, e);
    pages[run.log.length - 1] = run;
  }
  store(io, path, save);
  return { ...night, save, run, pages };
}

function titleText(save: BoardSave): string {
  return [
    'DASHIELL',
    'A murder, an evening, and eight hours to write it down.',
    '',
    wrap(`The small board (the new engine, flag only): ${tierName(save.tier as 0)}. One question gets a whole evening or a whole list. Murders, lost pets and lost things.`),
  ].join('\n');
}

function teachText(): string {
  const out = [BOARD_TEACH_TITLE.toUpperCase(), ''];
  for (const l of BOARD_TEACH_LINES) out.push(wrap(l), '');
  out.push(wrap('(Shown on a first night. `new --no-teach` leaves it out.)'));
  return out.join('\n');
}

function cmdNew(io: PlayIo, values: Map<string, string>, flags: Set<string>): string {
  const path = values.get('save');
  if (!path) fail('Say where to keep the night: --save <file>.');
  const seed = Number(values.get('seed'));
  if (!Number.isInteger(seed) || seed < 1) fail('--seed is a whole number, 1 or more.');
  const tier = parseTier(values.get('tier'));
  if (tier === null) fail('--tier is 0 to 5.');
  const type = values.get('type') as CaseType | undefined;
  const save: BoardSave = { game: 'dashiell-play', version: 1, engine: 'board', seed, tier: tier as number, ...(type ? { type } : {}), detective: values.get('name') || 'Dashiell', events: [], person: null, picker: null, claim: null };
  const night = deal(save);
  store(io, path as string, save);
  const teach = flags.has('no-teach') ? [] : [teachText(), '', DOUBLE, ''];
  return [titleText(save), '', `case ${seed} · ${tierName(tier as 0)} · the small board`, '', DOUBLE, '', ...teach, lookText(night, path as string)].join('\n');
}

function cmdDo(io: PlayIo, raw: string | undefined, path: string): string {
  let night = load(io, path);
  if (raw === undefined) fail('do what? A choice’s number, or its words.');
  if (night.run.filed) fail('The report is filed; the night is over. `look` shows the verdict again.');
  if (night.run.reportOpen) fail('The report form is out: `report` shows it, `file` files it.');
  const v = fold(raw as string);
  const s = night.save;
  // The picker.
  if (s.picker) {
    const pk = pickerFor(night.d, night.run, s.picker);
    if (!pk) {
      night = commit(io, path, night, [], { picker: null, claim: null });
      return lookText(night, path);
    }
    const items = pickerItems(night, pk);
    if (v === 'back' || v === String(items.length + 1) || v === 'put nothing to them') {
      night = commit(io, path, night, [], s.claim !== null && pk.ready.length === 0 ? { claim: null } : { picker: null, claim: null });
      return lookText(night, path);
    }
    const hit = /^\d+$/.test(v) ? items.find((i) => i.n === Number(v)) : items.find((i) => fold(i.label) === v || fold(i.command) === v);
    if (!hit) fail(`No choice "${raw}" in the picker.`);
    const h = hit as (typeof items)[number];
    if (h.claim !== undefined) {
      night = commit(io, path, night, [], { claim: h.claim });
      return lookText(night, path);
    }
    night = commit(io, path, night, [{ do: h.command }], { picker: null, claim: null, person: null });
    return lookText(night, path);
  }
  // A person's topics.
  if (s.person) {
    const items = topicItems(night, s.person);
    if (v === 'back' || v === String(items.length + 1) || v === 'back to the page') {
      night = commit(io, path, night, [], { person: null });
      return lookText(night, path);
    }
    const hit = /^\d+$/.test(v) ? items.find((i) => i.n === Number(v)) : items.find((i) => fold(i.choice.label) === v || fold(i.choice.command) === v);
    if (!hit) fail(`No topic "${raw}". \`do back\` shuts the topics.`);
    const c = (hit as Item).choice;
    if (c.command.startsWith('picker ')) {
      night = commit(io, path, night, [], { picker: c.command.slice(7), claim: null });
      return lookText(night, path);
    }
    night = commit(io, path, night, [{ do: c.command }], { person: null });
    return lookText(night, path);
  }
  const items = pageItems(night);
  const hit = /^\d+$/.test(v) ? items.find((i) => i.n === Number(v)) : items.find((i) => fold(i.choice.label) === v || fold(i.choice.command) === v);
  if (!hit) fail(`No choice "${raw}" on this page.`);
  const it = hit as Item;
  if (it.person) {
    night = commit(io, path, night, [], { person: it.person });
    return lookText(night, path);
  }
  if (it.choice.command === 'file') {
    night = commit(io, path, night, [{ do: 'file' }]);
    return lookText(night, path);
  }
  const r = stepBoard(night.d, night.run, it.choice.command);
  if (r.error) fail(r.error);
  night = commit(io, path, night, [{ do: it.choice.command }], { person: null, picker: null, claim: null });
  return lookText(night, path);
}

function cmdPencil(io: PlayIo, raw: string | undefined, path: string): string {
  let night = load(io, path);
  const m = /^(\S+(?: \S+)?)\s+(\d{1,2})\s+(at|not|clear)\s*(.*)$/i.exec((raw ?? '').trim());
  if (!m) fail('pencil "<Name> <hour> at|not|clear [place]", e.g. pencil "Feldman 10 at Rafferty’s".');
  const [, who, hs, act, pl] = m as RegExpExecArray;
  const c = night.d.kase;
  const person = c.people.find((p) => fold(p.short) === fold(who as string) || fold(p.name) === fold(who as string));
  if (!person) fail(`Nobody on the board called ${who}.`);
  const h = Number(hs);
  if (!c.board.hours.includes(h)) fail(`The hours are ${c.board.hours.join(', ')}.`);
  let place: string | undefined;
  if (act !== 'clear') {
    const codes = placeCodes(c);
    const hit = c.places.find((p) => fold(p.short) === fold(pl ?? '') || fold(codes[p.id] ?? '') === fold(pl ?? '') || (fold(p.short).includes(fold(pl ?? '')) && (pl ?? '').length > 2));
    if (!hit) fail(`No place called "${pl}".`);
    place = (hit as { id: string }).id;
  }
  night = commit(io, path, night, [{ mark: { person: (person as { id: string }).id, hour: h, action: act as 'at' | 'not' | 'clear', ...(place ? { place } : {}) } }]);
  return boardGridText(c, night.run);
}

function helpText(): string {
  const out = ['HOW IT PLAYS', ''];
  for (const l of BOARD_RULES) out.push(wrap(l), '');
  out.push(
    'COMMANDS',
    '  new --seed N --tier 0..5 --engine board [--type murder|lost-item|lost-pet] --save F',
    '  look · do <n|words> · page <n> · notebook · grid',
    '  pencil "<Name> <hour> at|not|clear [place]"',
    '  report · file "who=…; when=…; how=… (or where=…); why=…"',
    '  story · curtain (after filing)',
  );
  return out.join('\n');
}

/** True when this argv belongs to the board engine: a new night with `--engine board`, or a board save. */
export function isBoardCall(argv: string[], io: PlayIo): boolean {
  const i = argv.indexOf('--engine');
  if (i >= 0 && argv[i + 1] === 'board') return true;
  const s = argv.indexOf('--save');
  const path = s >= 0 ? argv[s + 1] : undefined;
  if (!path) return false;
  const text = io.read(path);
  if (text === null) return false;
  try {
    return (JSON.parse(text) as { engine?: string }).engine === 'board';
  } catch {
    return false;
  }
}

export function runBoardPlay(argv: string[], io: PlayIo): PlayResult {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i] as string;
    if (t.startsWith('--')) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        values.set(t.slice(2), next);
        i++;
      } else flags.add(t.slice(2));
    } else pos.push(t);
  }
  const command = pos[0] ?? 'help';
  const arg = pos.slice(1).join(' ') || undefined;
  const path = values.get('save') as string;
  try {
    switch (command) {
      case 'new':
        return { out: cmdNew(io, values, flags), code: 0 };
      case 'look':
        return { out: lookText(load(io, path), path), code: 0 };
      case 'do':
        return { out: cmdDo(io, arg, path), code: 0 };
      case 'page': {
        const night = load(io, path);
        const n = Number(arg);
        if (!Number.isInteger(n) || n < 1 || n > night.run.log.length) fail(`page 1 to ${night.run.log.length}.`);
        return { out: n === night.run.log.length ? lookText(night, path) : `${pageText(night, n - 1)}\n\n(A page turned back to.)`, code: 0 };
      }
      case 'notebook': {
        const night = load(io, path);
        return { out: notebookText(night.d, night.run), code: 0 };
      }
      case 'grid': {
        const night = load(io, path);
        return { out: boardGridText(night.d.kase, night.run), code: 0 };
      }
      case 'pencil':
        return { out: cmdPencil(io, arg, path), code: 0 };
      case 'confront': {
        let night = load(io, path);
        const who = night.d.kase.people.find((p) => fold(p.short) === fold(arg ?? ''));
        if (!who) fail(`Nobody here called ${arg}.`);
        if (!pickerFor(night.d, night.run, (who as { id: string }).id)) fail(`Nothing I hold collides with ${(who as { short: string }).short}’s story.`);
        night = commit(io, path, night, [], { picker: (who as { id: string }).id, claim: null, person: null });
        return { out: lookText(night, path), code: 0 };
      }
      case 'report': {
        const night = load(io, path);
        return { out: night.run.filed ? verdictText(night) : reportText(night, path), code: 0 };
      }
      case 'file': {
        let night = load(io, path);
        if (night.run.filed) fail('Filed already.');
        const report = parseReport(night, arg ?? '');
        if (!night.run.reportOpen) night = commit(io, path, night, [{ do: 'file' }]);
        night = commit(io, path, night, [{ file: report }]);
        return { out: verdictText(night), code: 0 };
      }
      case 'story':
      case 'curtain': {
        const night = load(io, path);
        if (!night.run.filed) fail('Not until the report is filed.');
        return { out: command === 'story' ? storyOfBoard(night.d).map((p) => wrap(p)).join('\n\n') : curtainOfBoard(night.d), code: 0 };
      }
      case 'help':
        return { out: helpText(), code: 0 };
      default:
        return fail(`No command "${command}". Try: npm run play -- help --engine board`);
    }
  } catch (e) {
    if (e instanceof Fail) return { out: e.message, code: 1 };
    throw e;
  }
}

export { OFFICE, placeName };
