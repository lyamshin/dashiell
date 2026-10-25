/**
 * docs/43: `npm run play`, the night played blind, one choice at a time, in
 * plain text:
 *
 *   new --seed N --tier 0..5 [--type murder|lost-item|lost-pet] [--name Dashiell] [--no-teach] --save F
 *   look · do <n|words> · page <n> · notebook · grid · pencil "<Name> <hour> at|not|clear [place]"
 *   confront <Name> · report [<Name>] · file "who=…; breaks=…; other=…; cleared=…; when=…; how=…; why=…; where=…; whereBy=…"
 *   story · curtain · help
 *
 * docs/46 §3: the report asks what proves they lied. `report <Name>` lists
 * what you know that names them or falls at the hour that mattered; `proof`
 * (docs/64; `breaks` before it, still read) is a number from that list, and
 * `proof=hunch` is a hunch.
 *
 * docs/61: from Poached up it asks whether anyone else lied (round 7, B9: on every night from
 * Poached up, "Nobody else" a real answer; `other`) and what cleared them (`cleared`), which counts down the same list
 * `report <Name>` shows for that person.
 *
 * A page lists the people here (choosing one opens their topics, free),
 * then what to search and where to go. "Put it to X" opens the picker: at
 * Raw and Coddled the pairs ready-made, from Poached up the claim and then
 * the line. Nothing printed before filing shows the truth, par, the path or
 * the solver.
 *
 * A save is the deal and every event, replayed on each command. A save from
 * the engines before the board is refused, plainly.
 */

import { parseTier, typesFor, type CaseType } from '../gen/board/index.js';
import { clockStrip, usedByPage } from '../game/board/clock.js';
import { boardChoices, pickerFor, pickerNote, type Picker } from '../game/board/choices.js';
import { newBoardRun, stepBoard } from '../game/board/engine.js';
import { boardGridText, placeCodes } from '../game/board/grid.js';
import { peopleAt } from '../game/board/knowledge.js';
import { BOARD_TEACH_TITLE, BOARD_RULES, teachLines } from '../game/board/teach.js';
import { isWorld } from '../gen/board/world/index.js';
import { SITUATED } from '../game/board/plan/situated.js';
import { setTexture } from '../game/board/plan/texture.js';

import { OFFICE, budgetCalls, dealBoard, deadlineWords, hourWord, nameOf, placeName, tierName, type BoardDeal, type BoardReport, type BoardRun } from '../game/board/model.js';
import {
  BREAKS_LABEL,
  CLEARED_LABEL,
  HUNCH,
  NOBODY,
  whereByLabel,
  asksOther,
  blankRule,
  boardFields,
  clearOptions,
  hoursWords,
  breakOptionsShown,
  lineGroupHeads,
  curtainOfBoard,
  reportFrom,
  scoreBoard,
  starWords,
  storyOfBoard,
  whereByOptions,
  type FieldKey,
  type LineOption,
} from '../game/board/report.js';
import { dealtIds, recordRun, sanitizeProfile, seenOf } from '../game/board/profile.js';
import { ACTION_KEY, TALK_HEADING, costText, notebookText, pageBodyText, questionsText, wrap } from '../game/board/text.js';
import { hintsLine, hintsNote, hintsUsed, takeHint } from '../game/board/hints.js';
import { starCommand } from '../game/board/stars.js';
import type { OfferedChoice, OfferedGroup } from '../game/board/types.js';

/* ------------------------------------------------------------------ io */

export interface PlayIo {
  read(path: string): string | null;
  write(path: string, data: string): void;
}

export interface PlayResult {
  out: string;
  /** Non-zero when the command could not be done; the save is unchanged. */
  code: number;
}

const WIDTH = 76;

/**
 * docs/64: the form's keys as a player types them; the engine's own (`breaks`, `whereBy`) still read.
 * Round 6, U5: what proves where it is, typed `evidence` ("whereproof" was a word nobody would use);
 * `whereproof` still reads, so notes and saves from before work.
 */
const KEY_SHOWN: Partial<Record<string, string>> = { breaks: 'proof', whereBy: 'evidence' };

/** A key as typed, to the form's own: `proof` is `breaks`, `evidence` (or `whereproof`) is `whereBy`. */
function keyOf(typed: string): string {
  const k = typed.toLowerCase();
  return k === 'proof' ? 'breaks' : k === 'evidence' || k === 'whereproof' ? 'whereBy' : typed;
}
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
  /** docs/48: the world the night was cast from, when it isn't the dealt cast. */
  world?: string;
  /** docs/51: false when the night was opened with the old decks only (`new --situated 0`). */
  situated?: false;
  /** docs/60: `full` when the night was opened with every line of texture (`new --texture full`). */
  texture?: 'full';
  detective: string;
  events: Event[];
  /** Whose topics are open. Free; not a page. */
  person: string | null;
  /** Whose picker is open, and from Poached up the claim's hour picked. */
  picker: string | null;
  claim: number | null;
  /** docs/55 6: a profile file (`new --profile F`): what its last nights dealt, as the night began; filing adds this night to it. */
  profile?: string;
  seen?: { recent: string[]; last: string[] };
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
  // docs/51: the deck the night was opened with, every time it's replayed.
  SITUATED.on = save.situated !== false;
  setTexture(save.texture);
  const d = dealBoard(save.seed, save.tier as 0, save.type, save.world ? { world: save.world } : {});
  let run = newBoardRun(d, { detectiveName: save.detective, ...(save.type ? { type: save.type } : {}), ...(save.seen ? { seen: save.seen } : {}) });
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
  // Round 5, U8: "page 9 of 9" counted nothing a tester could name. The head says the time; `page <n>`
  // turns back, and a page turned back to says which it is.
  const right = strip.time;
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
  return [`${num}${mark}${(lines[0] ?? '').padEnd(room)}  ${cost}`.trimEnd(), ...lines.slice(1).map((l) => `${' '.repeat(num.length + mark.length)}${l}`)].join('\n');
}

/** The page's numbered items: a line a person, then searches, walks and the free row. */
function pageItems(night: Night): Item[] {
  const groups = boardChoices(night.d, night.run);
  const out: Item[] = [];
  let n = 1;
  for (const g of groups) {
    if (g.kind === 'ask') {
      const star = g.choices.find((c) => c.lead);
      const name = nameOf(night.d.kase, g.personId as string);
      // docs/55 4: the row is the person, so the star's "ask Pickering who…" says "ask who…".
      const why = star?.why?.replace(new RegExp(`\\bask ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `), 'ask ');
      out.push({ n: n++, group: g, person: g.personId as string, choice: { command: `person ${g.personId}`, label: name, minutes: 0, lead: !!star, done: false, ...(why ? { why } : {}) } });
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
      out.push(kind === 'ask' ? `${TALK_HEADING}:` : kind === 'free' ? 'Free:' : `${it.group.heading}:`);
      last = kind;
    }
    if (it.person) {
      const g = it.group;
      // Round 5, U1: "2 questions", the ones still to ask (docs/55 7's "free · 2 questions" read as two
      // free questions to all four testers). Picking somebody is free; the key says so.
      out.push(itemLine(it.n, it.choice, questionsText(g)));
      continue;
    }
    out.push(itemLine(it.n, it.choice, costText(it.choice)));
  }
  // docs/47 A3: the key to the marks, once, on the first page; round 5, U10: and at Hard-boiled, that
  // its star is the night's only one.
  if (night.run.log.length === 1) out.push('', wrap(CHOICE_KEY));
  // docs/67: tonight's hints, said once on the first page (and Hard-boiled's mark line), and the count
  // under the choices on every page of a tier that has them.
  const note = hintsNote(night.d, night.run);
  const left = hintsLine(night.run);
  if (note) out.push('', wrap(left ? `${note} \`hint\` stars a good next step and says why.` : note));
  // (After a hint on the first page, how many are left, as on every page after.)
  if (left && (!note || hintsUsed(night.run) > 0)) out.push('', wrap(left));
  return out.join('\n');
}

/** The key to a page's marks, said once, on the first page (docs/47 A3), in docs/64's words; and the CLI's own two commands. */
// (Round 6, U2: "`back` shuts it" said what it does: takes you back to the page.)
const CHOICE_KEY = `${ACTION_KEY} Pick somebody to see what you can ask them; \`back\` takes you back to the page, and \`page <n>\` shows an earlier page.`;

function topicItems(night: Night, person: string): Item[] {
  const g = boardChoices(night.d, night.run).find((x) => x.kind === 'ask' && x.personId === person);
  if (!g) return [];
  return g.choices.map((c, i) => ({ n: i + 1, choice: c, group: g }));
}

function topicText(night: Night, person: string): string {
  const items = topicItems(night, person);
  const out = [`ASK ${nameOf(night.d.kase, person).toUpperCase()} ABOUT`, ''];
  for (const it of items) out.push(itemLine(it.n, it.choice, costText(it.choice)));
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
    for (const x of pk.claims) out.push({ n: n++, command: `claim ${x.hour}`, label: x.said, claim: x.hour });
    return out;
  }
  for (const l of cl.lines) out.push({ n: n++, command: l.command, label: l.label, source: l.source });
  return out;
}

function pickerText(night: Night, pk: Picker): string {
  const c = night.d.kase;
  const out = [`CONFRONT ${nameOf(c, pk.person).toUpperCase()}`, '', wrap(pickerNote(night.d, pk))];
  const items = pickerItems(night, pk);
  const picking = pk.ready.length === 0 && night.save.claim !== null;
  const his = pronWord(night, pk.person, 'his');
  out.push('');
  const she = his === 'her' ? 'she' : his === 'his' ? 'he' : 'they';
  // Round 6, U2: what they said, as a sentence, then what to tell them.
  out.push(pk.ready.length > 0 ? `What ${she} said, and what says otherwise:` : picking ? `${pk.claims.find((x) => x.hour === night.save.claim)?.said}. Tell ${pronWord(night, pk.person)}:` : `Which part of ${his} evening?`);
  for (const it of items) out.push(itemLine(it.n, { command: it.command, label: it.label, minutes: 0, lead: false, done: false }, it.claim !== undefined ? 'free' : '') + (it.source ? `\n          (${it.source})` : ''));
  out.push('', itemLine(items.length + 1, { command: 'back', label: picking ? `Back to ${his} evening` : `Don’t confront ${pronWord(night, pk.person)}`, minutes: 0, lead: false, done: false }, 'free'));
  return out.join('\n');
}

/** "her" or "him" ("his" or "her" for the possessive), for the person the picker is about (docs/47 A6). */
function pronWord(night: Night, p: string, form: 'him' | 'his' = 'him'): string {
  const female = night.d.kase.people.find((x) => x.id === p)?.female;
  return female ? 'her' : form;
}


/* ------------------------------------------------------------ the form */

/** The hours that mattered, as the notebook has them: "ten", "nine or ten". */
function hoursWord(night: Night): string {
  return hoursWords(night.d);
}

/**
 * A numbered list of line options, and the hunch after them. docs/47 A4: with `heads`, the lines
 * that touch the named person's story come first under the one heading, the rest under the other.
 */
function lineList(opts: LineOption[], heads?: { touching: string; rest: string }): string[] {
  const out: string[] = [];
  const touching = opts.filter((o) => o.touches).length;
  opts.forEach((o, i) => {
    if (heads && i === 0 && touching > 0) out.push(wrap(heads.touching, WIDTH, '   '));
    if (heads && i === touching && i < opts.length) out.push(wrap(touching > 0 ? heads.rest : heads.rest.replace(/^Other /, ''), WIDTH, '   '));
    out.push(wrap(o.label, WIDTH - 7).split('\n').map((l, j) => (j === 0 ? `   ${String(i + 1).padStart(2)}. ${l}` : `       ${l}`)).join('\n'));
  });
  out.push(`   ${String(opts.length + 1).padStart(2)}. ${HUNCH}`);
  return out;
}

/**
 * The command that closes the case, on a line of its own (round 6, U5: a save's path in the middle of
 * a sentence read as part of it), and how an answer is given.
 */
function closeLines(night: Night, path: string): string[] {
  const c = night.d.kase;
  const two = asksOther(night.d);
  const head = `who=…; proof=…; ${two ? 'other=…; cleared=…; ' : ''}when=…;`;
  const keys = c.type === 'murder' ? `${head} how=…; why=…` : `${head} where=…; evidence=…; why=…`;
  return [
    'To close the case:',
    `   npm run play -- close "${keys}" --save ${path}`,
    wrap(`Give an answer by its number or enough of its words. For ${two ? 'proof and cleared' : 'proof'}, give a number from that person’s list (\`report <name>\` shows it), or hunch.`),
  ];
}

function reportText(night: Night, path: string, who: string | null = null): string {
  // Round 6, U5: `report <Name>` shows that person's list and how to use it, not the whole form again.
  if (who) return personReportText(night, path, who);
  // Round 5, U6: what a blank goes in as, once, in one sentence, the book's words.
  const out = ['CLOSE THE CASE', '', wrap(blankRule(night.d, night.run.used >= budgetCalls(night.d))), ''];
  // docs/67: a hint here says what's still missing, or that the report can be filled from what you have.
  const left = hintsLine(night.run);
  if (left) out.push(wrap(left), '');
  const field = (f: ReturnType<typeof boardFields>[number]) => {
    out.push(`${f.label} (${KEY_SHOWN[f.key] ?? f.key}):`);
    f.options.forEach((o, i) => out.push(`   ${String(i + 1).padStart(2)}. ${o.label}`));
    out.push('');
  };
  for (const f of boardFields(night.d, night.run)) {
    field(f);
    if (f.key === 'who') {
      out.push(`${BREAKS_LABEL} (proof):`);
      out.push(wrap(`Name them first: \`report <name>\` lists what you know about them, or about ${hoursWord(night)}. Give proof as a number from that list, or proof=hunch.`, WIDTH, '   '));
      out.push('');
    }
    if (f.key === 'other') {
      // docs/61: what clears them is a number from the same list `report <name>` shows for that person.
      out.push(`${CLEARED_LABEL} (cleared):`);
      out.push(wrap('Name them first: `report <name>` lists what you know about them, the same list as for proof. Give cleared as a number from it, or cleared=hunch.', WIDTH, '   '));
      out.push('');
    }
    if (f.key === 'where') {
      out.push(`${whereByLabel(night.d)} (${KEY_SHOWN.whereBy}):`);
      out.push(...lineList(whereByOptions(night.d, night.run)));
      out.push('');
    }
  }
  // (Round 5, U6: what a blank goes in as is said once, at the top.)
  out.push(...closeLines(night, path));
  return out.join('\n');
}

/** Round 6, U5: one person's list, for proof (and cleared, if they're the other liar), and how to give it. */
function personReportText(night: Night, path: string, who: string): string {
  const c = night.d.kase;
  const N = nameOf(c, who);
  const out = [`CLOSE THE CASE: ${N.toUpperCase()}`, ''];
  out.push(`${BREAKS_LABEL} (proof):`);
  // Round 5, U3: the headings say what's under them, the book's words.
  out.push(...lineList(breakOptionsShown(night.d, night.run, who), lineGroupHeads(night.d, night.run, who)));
  // docs/61: the same list answers the other question. Round 5, U2: said as what to type.
  // (Round 7, B9: never "the other liar": the form asks whether there was one.)
  if (asksOther(night.d)) out.push(wrap(`If you say ${N} lied too, give “cleared” as a number from this list too.`, WIDTH, '   '));
  out.push('', wrap('`report` shows the whole form.'), '');
  out.push(...closeLines(night, path));
  return out.join('\n');
}

/** Whoever a word names on the form: a suspect, by name. */
function suspectNamed(night: Night, raw: string): string {
  const c = night.d.kase;
  const v = fold(raw);
  const hit = c.people.filter((p) => p.role === 'suspect' && (fold(p.short) === v || fold(p.name) === v || fold(p.name).includes(v)));
  if (hit.length !== 1) fail(hit.length === 0 ? `Nobody on the form called ${raw}.` : `"${raw}" fits more than one name.`);
  return (hit[0] as { id: string }).id;
}

function parseReport(night: Night, text: string): BoardReport {
  const fields = boardFields(night.d, night.run);
  const answers: Partial<Record<FieldKey, string | null>> = {};
  const lineAnswers: { key: 'breaks' | 'whereBy' | 'cleared'; raw: string }[] = [];
  for (const part of text.split(';').map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\w+)\s*=\s*(.+)$/.exec(part);
    if (!m) fail(`Can’t read "${part}". Write key=answer.`);
    // docs/64: `proof` and `whereproof`, with `breaks` and `whereBy` still read, so saves and old notes work.
    const key = keyOf((m as RegExpExecArray)[1] as string) as FieldKey;
    const raw = ((m as RegExpExecArray)[2] as string).trim();
    if (key === 'breaks' || fold(key) === 'whereby' || key === 'cleared') {
      if (fold(key) === 'whereby' && night.d.kase.type === 'murder') fail('The form asks where it is only for a lost thing.');
      if (key === 'cleared' && !asksOther(night.d)) fail('Tonight’s form doesn’t ask whether anyone else lied, so there’s nothing to clear.');
      lineAnswers.push({ key: key === 'breaks' ? 'breaks' : key === 'cleared' ? 'cleared' : 'whereBy', raw });
      continue;
    }
    const f = fields.find((x) => x.key === key);
    if (!f) fail(`The form doesn’t ask "${key}". It asks: ${[...fields.map((x) => x.key), 'proof', ...(asksOther(night.d) ? ['cleared'] : []), ...(night.d.kase.type === 'murder' ? [] : ['evidence'])].join(', ')}.`);
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
  // The proofs read against their lists: what proves they lied is a number from the named person's.
  for (const { key, raw } of lineAnswers) {
    const v = fold(raw);
    if (v === 'hunch' || v === fold(HUNCH)) {
      answers[key] = null;
      continue;
    }
    if (key === 'breaks' && !answers.who) fail('Name who first: proof is a number from the list `report <name>` shows for them.');
    if (key === 'cleared' && (!answers.other || answers.other === NOBODY)) fail('Name them first (other=…): cleared is a number from the list `report <name>` shows for them.');
    const opts = key === 'breaks' ? breakOptionsShown(night.d, night.run, answers.who as string) : key === 'cleared' ? clearOptions(night.d, night.run, answers.other as string) : whereByOptions(night.d, night.run);
    if (/^\d+$/.test(v)) {
      const n = Number(v);
      if (n === opts.length + 1) {
        answers[key] = null;
        continue;
      }
      const o = opts[n - 1];
      if (!o) fail(`${KEY_SHOWN[key] ?? key} is 1 to ${opts.length + 1}: \`report${key === 'breaks' ? ` ${nameOf(night.d.kase, answers.who as string)}` : key === 'cleared' ? ` ${nameOf(night.d.kase, answers.other as string)}` : ''}\` shows them.`);
      answers[key] = (o as LineOption).value;
      continue;
    }
    const hits = opts.filter((o) => fold(o.label).includes(v));
    if (hits.length !== 1) fail(hits.length === 0 ? `"${raw}" isn’t one of the ${KEY_SHOWN[key] ?? key} answers.` : `"${raw}" fits more than one ${KEY_SHOWN[key] ?? key} answer.`);
    answers[key] = (hits[0] as LineOption).value;
  }
  return reportFrom(night.d, answers);
}

const fold = (s: string): string => s.toLowerCase().replace(/[’']/g, "'").replace(/^\*\s*/, '').replace(/\s+/g, ' ').replace(/ o'clock$/, '').trim();

function verdictText(night: Night): string {
  const v = scoreBoard(night.d, night.run, night.run.filed as BoardReport);
  const out = ['THE VERDICT', ''];
  for (const f of v.fields) {
    // A line asked under an answer sits under it, indented: it counts with that answer (docs/47 A2).
    const pad = f.line ? '      ' : '  ';
    const ls = wrap(`${f.label}${/\?$/.test(f.label) ? '' : ':'} ${f.given}${f.correct ? (f.half ? '  ½ — right, but you couldn’t have known' : '  ✓') : `  ✗ — ${f.why ?? `it was ${f.truth}`}`}`, WIDTH - pad.length - 4).split('\n');
    out.push([`${pad}${ls[0]}`, ...ls.slice(1).map((l) => `${pad}    ${l}`)].join('\n'));
  }
  out.push('', wrap(v.scoreLine), ...v.plain.map((p) => wrap(p)));
  // docs/67: the actions and the hints taken, and the star a perfect report earns.
  out.push(wrap(v.tally));
  if (v.star) out.push(wrap(`★ ${starWords(v.star)}`));
  out.push('');
  for (const p of v.closing) out.push(wrap(p.replace(/\*\*/g, '')), '');
  // (docs/64: plain words. "The true board" was the builders'.)
  out.push(wrap('`story` tells what really happened; `curtain` shows where everybody really was, the lies and the fastest solve.'));
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

/**
 * A save's text as a save this tool wrote, or a plain error: not JSON, not a
 * save, or a night from the engines before the board (which have no
 * `engine: 'board'`), which can't be played any more.
 */
export function parseSave(text: string): BoardSave {
  let save: BoardSave;
  try {
    save = JSON.parse(text) as BoardSave;
  } catch {
    return fail('That file isn’t a save `npm run play` wrote.');
  }
  if (!save || save.game !== 'dashiell-play') fail('That file isn’t a save `npm run play` wrote.');
  if (save.engine !== 'board') fail('That save is a night from an engine that’s gone. Start a new one: npm run play -- new --seed N --tier T --save F');
  const tier = save.tier as number;
  if (!Number.isInteger(save.seed) || save.seed < 1 || !Number.isInteger(tier) || tier < 0 || tier > 5 || !Array.isArray(save.events)) fail('That save is damaged: its seed, tier or events don’t read.');
  if (save.type !== undefined && !typesFor(tier as 0).includes(save.type)) fail('That save is damaged: the board builds no such case at its tier.');
  if (save.world !== undefined && !isWorld(save.world)) fail('That save is damaged: it was cast from a world this book doesn’t have.');
  return save;
}

/** A save replayed: the deal, the run as it stands, and the run as each page left it. For tools (`npm run trace`). */
export function replaySave(text: string): { save: BoardSave; d: BoardDeal; run: BoardRun; pages: BoardRun[] } {
  try {
    const night = deal(parseSave(text));
    return { save: night.save, d: night.d, run: night.run, pages: night.pages };
  } catch (e) {
    if (e instanceof Fail) throw new Error(e.message);
    throw e;
  }
}

function load(io: PlayIo, path: string | undefined): Night {
  if (!path) fail('Say which save: --save <file>.');
  const text = io.read(path as string);
  if (text === null) fail(`No save at ${path}.`);
  return deal(parseSave(text as string));
}

function store(io: PlayIo, path: string, save: BoardSave): void {
  io.write(path, `${JSON.stringify(save, null, 1)}\n`);
}

function commit(io: PlayIo, path: string, night: Night, events: Event[], changes: Partial<BoardSave> = {}): Night {
  const save = { ...night.save, ...changes, events: [...night.save.events, ...events] };
  let run = night.run;
  const pages = [...night.pages];
  for (const e of events) {
    // Round 7, B1: a command the engine turns down is said, and the save keeps nothing of it (an
    // error used to be stored as an event and the page shown again without a word).
    if ('do' in e) {
      const r = stepBoard(night.d, run, e.do);
      if (r.error) fail(r.error);
      run = r.run;
    } else run = apply(night.d, run, e);
    pages[run.log.length - 1] = run;
  }
  store(io, path, save);
  return { ...night, save, run, pages };
}

/**
 * Round 7, B1: where somebody is, when it isn't here: "Mosley isn’t here. He’s at Moskowitz’s." Null
 * when they're in the room.
 */
function awayText(night: Night, p: string): string | null {
  const { d, run } = night;
  if (peopleAt(d.kase, run, run.at).includes(p)) return null;
  const who = d.kase.people.find((x) => x.id === p);
  if (!who) return null;
  const pr = who.female ? 'She' : 'He';
  return `${who.short} isn’t here. ${pr}’s at ${placeName(d.kase, who.foundAt)}, and confronting ${who.female ? 'her' : 'him'} takes a walk there first.`;
}

function titleText(save: BoardSave, type: CaseType): string {
  // The case's own kind: a stolen watch isn't a murder (docs/47, Raw 11's #25).
  const what = type === 'murder' ? 'A murder' : type === 'lost-pet' ? 'A missing pet' : 'A theft';
  return [
    'DASHIELL',
    `${what}, an evening, and eight hours to write it down.`,
    '',
    wrap(`${tierName(save.tier as 0)}. Ask anybody where they were and you get the whole evening; ask a barman who came in and you get everybody. Every lie runs into something true. Murders, lost pets and lost things.`),
  ].join('\n');
}

/** docs/67: the book's "Hint button", as the CLI has it: the `hint` command. */
function cliHint(l: string): string {
  return l.replace(/\bThe Hint button\b/g, 'The `hint` command');
}

function teachText(world?: string): string {
  const out = [BOARD_TEACH_TITLE.toUpperCase(), ''];
  for (const l of teachLines(world)) out.push(wrap(cliHint(l)), '');
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
  if (type !== undefined && !typesFor(tier as 0).includes(type)) fail(`--type: the board builds ${typesFor(tier as 0).join(', ')} at this tier.`);
  const world = values.get('world');
  if (world !== undefined && !isWorld(world)) fail('--world: the one world there is is neighbourhood.');
  // docs/55 6: a profile, when given, says what the last nights dealt; this night keeps it.
  const profilePath = values.get('profile');
  const prof = profilePath ? sanitizeProfile((() => { try { return JSON.parse(io.read(profilePath) ?? 'null'); } catch { return null; } })()) : null;
  const seen = prof ? seenOf(prof) : null;
  const save: BoardSave = { game: 'dashiell-play', version: 1, engine: 'board', seed, tier: tier as number, ...(type ? { type } : {}), ...(world ? { world } : {}), ...(values.get('situated') === '0' ? { situated: false as const } : {}), ...(values.get('texture') === 'full' ? { texture: 'full' as const } : {}), detective: values.get('name') || 'Dashiell', events: [], person: null, picker: null, claim: null, ...(profilePath ? { profile: profilePath } : {}), ...(seen && (seen.recent.length || seen.last.length) ? { seen } : {}) };
  const night = deal(save);
  store(io, path as string, save);
  const teach = flags.has('no-teach') ? [] : [teachText(save.world), '', DOUBLE, ''];
  return [titleText(save, night.d.kase.type), '', `case ${seed} · ${tierName(tier as 0)}${save.world ? ' · the neighborhood' : ''}`, '', DOUBLE, '', ...teach, lookText(night, path as string)].join('\n');
}

function cmdDo(io: PlayIo, raw: string | undefined, path: string): string {
  let night = load(io, path);
  if (raw === undefined) fail('do what? A choice’s number, or its words.');
  if (night.run.filed) fail('The case is closed; the night is over. `look` shows the verdict again.');
  if (night.run.reportOpen) fail('The case is being closed: `report` shows the form, `close` closes it.');
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
    if (v === 'back' || v === String(items.length + 1) || /^(?:put nothing to|don't confront) (them|her|him)$/.test(v)) {
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
  // (Round 7, B1: `commit` says whatever the engine turns down.)
  night = commit(io, path, night, [{ do: it.choice.command }], { person: null, picker: null, claim: null });
  return lookText(night, path);
}

function cmdPencil(io: PlayIo, raw: string | undefined, path: string): string {
  let night = load(io, path);
  // docs/47 A5: the hour as the grid says it ("ten") or as a number ("10"), with or without "o’clock".
  const HOURS: Record<string, number> = { five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const m = /^(\S+(?: \S+)?)\s+(\d{1,2}|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+o[’']clock)?\s+(at|not|clear)\s*(.*)$/i.exec((raw ?? '').trim());
  if (!m) fail('mark "<Name> <hour> at|not|clear [place]", e.g. mark "Feldman ten at Rafferty’s" or mark "Feldman 10 at Rafferty’s".');
  const [, who, hs, act, pl] = m as RegExpExecArray;
  const c = night.d.kase;
  const person = c.people.find((p) => fold(p.short) === fold(who as string) || fold(p.name) === fold(who as string));
  if (!person) fail(`Nobody in this case called ${who}.`);
  const h = /^\d+$/.test(hs as string) ? Number(hs) : (HOURS[(hs as string).toLowerCase()] as number);
  if (!c.board.hours.includes(h)) fail(`The hours are ${c.board.hours.map((x) => hourWord(x)).join(', ')}.`);
  let place: string | undefined;
  if (act !== 'clear') {
    const codes = placeCodes(c);
    const want = fold(pl ?? '').replace(/^the /, '');
    const hit = c.places.find((p) => fold(p.short).replace(/^the /, '') === want || fold(codes[p.id] ?? '') === want || (fold(p.short).includes(want) && want.length > 2));
    if (!hit) fail(`No place called "${pl}".`);
    place = (hit as { id: string }).id;
  }
  night = commit(io, path, night, [{ mark: { person: (person as { id: string }).id, hour: h, action: act as 'at' | 'not' | 'clear', ...(place ? { place } : {}) } }]);
  const said = act === 'clear' ? `Cleared your guess for ${nameOf(c, (person as { id: string }).id)} at ${hourWord(h)}.` : `Your guess: ${nameOf(c, (person as { id: string }).id)} ${act === 'not' ? 'not at' : 'at'} ${placeName(c, place as string)} at ${hourWord(h)}. It shows as ~ on the grid.`;
  return `${said}\n\n${boardGridText(c, night.run)}`;
}

/**
 * docs/67: `hint`. It stars a good next step and prints that choice with its reason, as `look` will
 * list it, and the hints left; with nothing left to find, that the case can be closed; on the report
 * page, what's still missing. The save records it (`{ do: 'hint' }`), so a replay gives the same
 * hints and the verdict counts them. Pressing again on a step already starred is free.
 */
function cmdHint(io: PlayIo, path: string): string {
  let night = load(io, path);
  if (night.run.filed) fail('The case is closed; the night is over. `look` shows the verdict again.');
  const h = takeHint(night.d, night.run);
  if ('error' in h) return fail(h.error);
  const { said } = h;
  // (The page's own list, so the starred choice's number is the one `do` takes.)
  night = commit(io, path, night, said.spent ? [{ do: 'hint' }] : [], { person: null, picker: null, claim: null });
  const out = ['HINT', '', wrap(said.text)];
  if (said.q && !night.run.reportOpen) {
    const cmd = starCommand(night.d, night.run, said.q);
    const who = cmd && /^(?:ask|picker) (\S+)/.exec(cmd)?.[1];
    const it = pageItems(night).find((x) => (who ? x.person === who : x.choice.command === cmd) && x.choice.lead);
    if (it) out.push('', itemLine(it.n, it.choice, it.person ? questionsText(it.group) : costText(it.choice)));
  }
  const left = hintsLine(night.run);
  if (left) out.push('', wrap(left));
  return out.join('\n');
}

function helpText(): string {
  const out = ['HOW IT PLAYS', ''];
  for (const l of BOARD_RULES) out.push(wrap(cliHint(l)), '');
  out.push(
    'COMMANDS',
    '  new --seed N --tier 0..5 [--type murder|lost-item|lost-pet] [--world neighbourhood] [--name <detective>] [--no-teach] [--profile P] --save F',
    '       (--profile P: a profile file; the night prefers what its last ten nights didn’t deal, and closing the case adds this night to it)',
    '  look · do <n|words> · page <n> · notebook · grid',
    '  hint (stars a good next step and says why; unlimited at Raw, three at Coddled, one at Poached, none after)',
    '  mark "<Name> <hour> at|not|clear [place]" (mark a guess on the grid: mark "Feldman ten at Rafferty’s") · confront <Name>',
    '  report [<Name>] (with a name, what you know about them: what could prove they lied, or clear them)',
    '  close "who=…; proof=…; other=…; cleared=…; when=…; how=…; why=…"',
    '       (a lost thing: where=…; evidence=… instead of how=…; proof=hunch for a hunch;',
    '        other and cleared from Poached up: whether anyone else lied (other=nobody if not), and what clears them)',
    '  story · curtain (once the case is closed)',
  );
  return out.join('\n');
}

export function runPlay(argv: string[], io: PlayIo): PlayResult {
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
      case 'hint':
        return { out: cmdHint(io, path), code: 0 };
      case 'look':
        return { out: lookText(load(io, path), path), code: 0 };
      case 'do':
        return { out: cmdDo(io, arg, path), code: 0 };
      case 'page': {
        const night = load(io, path);
        const n = Number(arg);
        if (!Number.isInteger(n) || n < 1 || n > night.run.log.length) fail(`page 1 to ${night.run.log.length}.`);
        return { out: n === night.run.log.length ? lookText(night, path) : `${pageText(night, n - 1)}\n\n(A page turned back to: page ${n} of ${night.run.log.length}. \`look\` shows the newest.)`, code: 0 };
      }
      case 'notebook': {
        const night = load(io, path);
        return { out: notebookText(night.d, night.run), code: 0 };
      }
      case 'grid': {
        const night = load(io, path);
        return { out: boardGridText(night.d.kase, night.run), code: 0 };
      }
      case 'mark':
      case 'pencil':
        return { out: cmdPencil(io, arg, path), code: 0 };
      case 'confront': {
        let night = load(io, path);
        const who = night.d.kase.people.find((p) => fold(p.short) === fold(arg ?? ''));
        if (!who) fail(`Nobody here called ${arg}.`);
        if (!pickerFor(night.d, night.run, (who as { id: string }).id)) fail(`Nothing I have disagrees with what ${(who as { short: string }).short} said.`);
        // Round 7, B1: confronting somebody is done to their face. Refused here, with where they are,
        // never opened and then dropped when the last pick finds them gone (the book offers it only
        // in the room with them).
        const away = awayText(night, (who as { id: string }).id);
        if (away) fail(away);
        night = commit(io, path, night, [], { picker: (who as { id: string }).id, claim: null, person: null });
        return { out: lookText(night, path), code: 0 };
      }
      case 'report': {
        const night = load(io, path);
        if (night.run.filed) return { out: verdictText(night), code: 0 };
        return { out: reportText(night, path, arg ? suspectNamed(night, arg) : null), code: 0 };
      }
      case 'close':
      case 'file': {
        let night = load(io, path);
        if (night.run.filed) fail('The case is closed already.');
        const report = parseReport(night, arg ?? '');
        if (!night.run.reportOpen) night = commit(io, path, night, [{ do: 'file' }]);
        night = commit(io, path, night, [{ file: report }]);
        // docs/55 6: the profile remembers what this night dealt.
        if (night.save.profile) {
          const v = scoreBoard(night.d, night.run, report);
          let old: unknown = null;
          try {
            old = JSON.parse(io.read(night.save.profile) ?? 'null');
          } catch {
            old = null;
          }
          const next = recordRun(sanitizeProfile(old), { tier: night.run.tier, points: v.points, asked: v.asked, actionsUsed: v.actionsUsed, par: v.par, dealt: dealtIds(night.run.spent), hints: v.hints }).profile;
          io.write(night.save.profile, JSON.stringify(next));
        }
        return { out: verdictText(night), code: 0 };
      }
      case 'story':
      case 'curtain': {
        const night = load(io, path);
        if (!night.run.filed) fail('Not until the case is closed.');
        return { out: command === 'story' ? storyOfBoard(night.d).map((p) => wrap(p)).join('\n\n') : curtainOfBoard(night.d, night.run, night.run.filed), code: 0 };
      }
      case 'help':
        return { out: helpText(), code: 0 };
      default:
        return fail(`No command "${command}". Try: npm run play -- help`);
    }
  } catch (e) {
    if (e instanceof Fail) return { out: e.message, code: 1 };
    throw e;
  }
}

export { OFFICE, placeName };
