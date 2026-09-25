/**
 * docs/37 — the book, played blind, one choice at a time, in plain text.
 *
 * `npm run play` is for playtesters (people or agents) who must see exactly
 * what a player of the book sees and nothing of the truth: the page, the
 * running head (the clock and the calls left), the choices the page offers
 * with what each costs and the lead's star, the notebook, "Where they were",
 * the pencil, the "Put it to …" picker, the report form, and — only once the
 * report is filed — the verdict, the closing, what really happened and the
 * curtain.
 *
 * Nothing here prints the oracle's route, the solver, par, word counts, gap
 * diagnostics, the truth sheet or the story before the report is in.
 *
 * The save file holds what the player did and nothing the case knows: the
 * deal (seed, tier, level, engine, name) and the list of choices, pencil
 * marks, links and the filed report, in order. Every command replays it
 * through the same `stepInput` the book uses, so the night on the page is the
 * night the book would have written.
 *
 * All the work is in `runPlay`, which returns the text rather than printing
 * it, so the test can drive it in-process; `src/cli/play.ts` is the shell.
 */

import { generateCase, type Case } from '../gen/index.js';
import { LADDERS, type Level } from '../gen/shape.js';
import type { Id, Tick } from '../gen/types.js';
import { choicesFor, type Choice, type ChoiceGroup } from '../game/choices.js';
import { clockStrip, minutesPerAction, usedByPage } from '../game/clock.js';
import { buildView, gameBudget, type CaseView } from '../game/derive.js';
import { applyLink, applyMark, gridFrom, type MarkAction } from '../game/grid.js';
import { renderGridText } from '../game/grid-text.js';
import { displayName } from '../game/m9.js';
import { caseOptions, levelFor, shapeOf, type TierKey } from '../game/profile.js';
import { fileReport, newRun, stepInput } from '../game/reducer.js';
import { columnFor, fieldsFor, withAnswer } from '../game/report-form.js';
import { scoreReport, type Verdict } from '../game/scoring.js';
import { storyOf, storyParagraphs } from '../game/story.js';
import { renderNotebookText, renderPageBody, wrap } from '../game/transcript.js';
import { EMPTY_REPORT, TOLD_CHOICES, type Report, type RunState, type Told } from '../game/types.js';
import { HELP_LINES, HELP_NOTE, LIE_RULE, LIE_RULE_NOTE } from '../game/voice-data.js';
import { renderTruthSheet } from '../sheet/truthSheet.js';

const WIDTH = 76;
const RULE = '─'.repeat(WIDTH);
const DOUBLE = '═'.repeat(WIDTH);
const UNKNOWN = 'I don’t know';
const MUNDANE = ['lost-pet', 'lost-item', 'affair'];

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

/* ---------------------------------------------------------------- save */

type PlayEvent =
  | { do: string }
  | { mark: { personId: Id; tick: number; action: MarkAction } }
  | { link: { key: string; personId: Id | null } }
  | { file: Report };

export interface PlaySave {
  game: 'dashiell-play';
  version: 1;
  seed: number;
  tier: TierKey;
  level: Level;
  engine?: 'v2';
  detective: string;
  /** Everything the player did, in order. Replayed on every command. */
  events: PlayEvent[];
  /** Whose "Put it to …" picker is open, if one is. Not a page; free. */
  picker: Id | null;
  /** An affair's report, filled in, while the client waits to be told something. */
  pendingReport: Report | null;
}

interface Night {
  save: PlaySave;
  kase: Case;
  view: CaseView;
  state: RunState;
}

/** The last few cases dealt in this process, so a test's many commands deal each once. */
const dealt = new Map<string, { kase: Case; view: CaseView }>();

function deal(save: PlaySave): Night {
  const key = JSON.stringify([save.seed, save.tier, save.level, save.engine ?? null, save.detective]);
  let hit = dealt.get(key);
  if (!hit) {
    const kase = generateCase(save.seed, {
      ...caseOptions({ tier: save.tier, level: save.level, ...(save.engine ? { engine: save.engine } : {}) }),
      detectiveName: save.detective,
    });
    hit = { kase, view: buildView(kase) };
    if (dealt.size >= 4) dealt.delete(dealt.keys().next().value as string);
    dealt.set(key, hit);
  }
  const { kase, view } = hit;
  let state = newRun(view, { detectiveName: save.detective });
  for (const e of save.events) state = apply(state, view, e);
  return { save, kase, view, state };
}

function apply(state: RunState, view: CaseView, e: PlayEvent): RunState {
  if ('do' in e) return stepInput(state, e.do, view).state;
  if ('mark' in e) return applyMark(state, e.mark.personId, e.mark.tick as Tick, e.mark.action);
  if ('link' in e) return applyLink(state, e.link.key, e.link.personId);
  return fileReport(state, e.file);
}

class PlayError extends Error {}

function fail(message: string): never {
  throw new PlayError(message);
}

/* ---------------------------------------------------------------- args */

interface Args {
  command: string;
  arg: string | undefined;
  values: Map<string, string>;
}

function parseArgv(argv: string[]): Args {
  const values = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] as string;
    if (token.startsWith('--')) {
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        values.set(token.slice(2), next);
        i++;
      } else values.set(token.slice(2), '');
      continue;
    }
    positional.push(token);
  }
  return { command: positional[0] ?? 'help', arg: positional.slice(1).join(' ') || undefined, values };
}

/* -------------------------------------------------------------- words */

function minutesText(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return '½ hr';
  return `${minutes} min`;
}

const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/^\*\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

function deadlineOf(view: CaseView): string | undefined {
  return MUNDANE.includes(view.kase.act.type) ? `${view.client.surname} wants an answer at eight` : undefined;
}

/** The notebook's header line: the case, and what it was dealt at. */
function caseLine(kase: Case): string {
  if (kase.shape !== undefined && kase.ladder !== undefined) {
    return `case ${kase.seed} · ${kase.shape.name} · ${kase.ladder.name}${kase.engine === 'v2' ? ` · v2 · ${kase.v2?.book.title ?? ''}` : ''}`;
  }
  return `case ${kase.seed} · difficulty ${kase.difficulty}`;
}

/* ------------------------------------------------------------ the page */

/** The running head: the place, the time, the page, and the strip of calls under them. */
function runningHead(night: Night, index: number): string {
  const { view, state } = night;
  const budget = gameBudget(view.kase);
  const used = usedByPage(state.log, index);
  const strip = clockStrip(used, budget, deadlineOf(view));
  const place = state.log[index]?.head ?? view.kase.neighborhood;
  const right = `${strip.time} · page ${index + 1} of ${state.log.length}`;
  const notches = strip.notches.map((n) => (n === 'spent' ? 'x' : n === 'next' ? 'o' : '.')).join('');
  return [
    `${place}${' '.repeat(Math.max(2, WIDTH - place.length - right.length))}${right}`,
    `[${notches}] ${strip.left}`,
    RULE,
  ].join('\n');
}

function pageText(night: Night, index: number): string {
  const page = night.state.log[index];
  if (!page) return '';
  return `${runningHead(night, index)}\n\n${renderPageBody(page, night.view)}`;
}

/* --------------------------------------------------------- the choices */

interface Numbered {
  n: number;
  choice: Choice;
  group: ChoiceGroup;
}

/** Every choice on the page, numbered in the order the book draws them. */
function numbered(groups: readonly ChoiceGroup[]): Numbered[] {
  const out: Numbered[] = [];
  let n = 1;
  for (const group of groups) {
    if (group.kind === 'confront') {
      // The one button that opens the picker. Free: it writes no page.
      out.push({
        n: n++,
        group,
        choice: { command: `confront ${group.personId ?? ''}`, label: group.heading, minutes: 0, lead: false, done: false },
      });
      continue;
    }
    for (const choice of [...group.choices, ...(group.more ?? [])]) out.push({ n: n++, choice, group });
  }
  return out;
}

function itemLine(n: number, c: Choice, extra = ''): string {
  const mark = c.lead ? '* ' : '  ';
  const label = `${c.label}${c.done ? ' ✓' : ''}${c.note ? ` — ${c.note}` : ''}${extra}`;
  const num = `${String(n).padStart(4)}. `;
  const cost = minutesText(c.minutes);
  const room = WIDTH - num.length - mark.length - cost.length - 2;
  const lines = wrap(label, room).split('\n');
  const first = `${num}${mark}${(lines[0] ?? '').padEnd(room)}  ${cost}`;
  return [first, ...lines.slice(1).map((l) => `${' '.repeat(num.length + mark.length)}${l}`)].join('\n');
}

function choicesText(night: Night): string {
  const { view, state } = night;
  const groups = choicesFor(view, state);
  const items = numbered(groups);
  const out: string[] = ['WHAT NEXT', ''];
  const asks = groups.filter((g) => g.kind === 'ask');
  if (asks.length > 1) {
    // §1.2: the book shows one person's topics at a time, behind a row of
    // names; here every one of them is listed. The star is the book's.
    const names = asks.map((g) => `${g.choices.some((c) => c.lead) ? '*' : ''}${displayName(view, state, g.personId as Id)}`);
    out.push(wrap(`In the room to talk to: ${names.join(' · ')}`), '');
  }
  let lastGroup: ChoiceGroup | null = null;
  let lastHeading = '';
  for (const item of items) {
    const g = item.group;
    if (g !== lastGroup) {
      // The confront button carries its own words; the free rows share one heading.
      const heading =
        g.kind === 'confront'
          ? ''
          : g.kind === 'ask' && g.personId
            ? `Ask ${displayName(view, state, g.personId)} about:`
            : g.heading.length > 0
              ? `${g.heading}:`
              : 'Free:';
      if (heading === '' || heading !== lastHeading) {
        if (lastGroup !== null) out.push('');
        if (heading !== '') out.push(heading);
      }
      lastHeading = heading;
      lastGroup = g;
    }
    if (g.kind === 'confront') {
      const fresh = g.choices.find((c) => !c.done);
      const cost = fresh ? minutesText(fresh.minutes) : 'free';
      out.push(
        itemLine(
          item.n,
          item.choice,
          ` (opens the list of ${g.choices.length} ${g.choices.length === 1 ? 'fact' : 'facts'} in the notebook; ${
            cost === 'free' ? 'a fact costs nothing' : `each fact costs ${cost}`
          })`,
        ),
      );
      continue;
    }
    const more = g.more ?? [];
    if (more.length > 0 && item.choice === more[0]) out.push('    Other topics:');
    out.push(itemLine(item.n, item.choice));
  }
  out.push('', 'A star is an open lead. ✓ is done already, and free to do again.');
  return out.join('\n');
}

/* ----------------------------------------------------------- the picker */

function pickerGroup(night: Night): ChoiceGroup | null {
  const id = night.save.picker;
  if (!id) return null;
  return choicesFor(night.view, night.state).find((g) => g.kind === 'confront' && g.personId === id) ?? null;
}

function pickerText(night: Night, group: ChoiceGroup): string {
  const { view, state } = night;
  const whose = group.personId ? displayName(view, state, group.personId) : 'them';
  const fresh = group.choices.find((c) => !c.done);
  const cost = fresh ? minutesText(fresh.minutes) : 'free';
  const out: string[] = [group.heading.toUpperCase(), ''];
  out.push(
    wrap(
      group.follow
        ? `Which other fact do you read ${whose}? It costs nothing. If it does not touch what ${whose} told you, that is the end of it for now, and the story stands.`
        : `Which fact do you read ${whose}? ${cost === 'free' ? 'It costs nothing.' : `Each costs ${cost}.`} If it does not touch what ${whose} told you, the time is gone all the same.`,
    ),
  );
  if ((group.reference ?? []).length > 0) {
    out.push('', `What ${whose} told me:`);
    for (const line of group.reference ?? []) out.push(wrap(line, WIDTH, '    '));
  }
  let heading: string | undefined;
  let n = 1;
  for (const c of group.choices) {
    if (n === 1 || c.section !== heading) {
      heading = c.section;
      out.push('', heading ?? '');
    }
    out.push(itemLine(n++, c as Choice, c.source ? ` (${c.source})` : ''));
  }
  if (group.choices.length === 0) out.push('', 'Nothing in the notebook about them yet.');
  out.push('', itemLine(n, { command: '', label: 'Put nothing to them', minutes: 0, lead: false, done: false }));
  return out.join('\n');
}

/* ------------------------------------------------------------ the form */

function reportNote(night: Night): string {
  const { view, state } = night;
  return state.actionsUsed >= gameBudget(view.kase)
    ? MUNDANE.includes(view.kase.act.type)
      ? `Eight o’clock, and ${view.client.surname} is at the door wanting an answer. Whatever is on the page is what gets said.`
      : 'Eight o’clock, and the DA’s man is standing over the desk. Whatever is on the page is what gets filed.'
    : 'Filing is final. Leave a line blank and it goes in as I don’t know.';
}

function reportText(night: Night, savePath: string): string {
  const { view } = night;
  const out: string[] = ['THE REPORT', DOUBLE, '', wrap(reportNote(night)), ''];
  for (const spec of fieldsFor(view)) {
    out.push(`${spec.key} — ${spec.label}`);
    spec.options.forEach((o, i) => out.push(wrap(o.label, WIDTH, '').split('\n').map((l, j) => (j === 0 ? `${String(i + 1).padStart(6)}. ${l}` : `        ${l}`)).join('\n')));
    out.push(`        (left out: ${UNKNOWN})`, '');
  }
  const column = columnFor(view);
  if (column.length > 0) {
    const checker = MUNDANE.includes(view.kase.act.type) ? 'I check each myself' : 'the DA checks each';
    out.push('Where everybody was when it happened');
    out.push(wrap(`At the half hour it happened, by the hour above. One line a person; ${checker}.`, WIDTH, '  '));
    out.push(`  One line each for: ${column.map((c) => c.label).join(', ')}`);
    out.push(`  Each one of: ${(column[0]?.options ?? []).map((o) => o.label).join(' · ')}`);
    out.push(`        (left out: ${UNKNOWN})`, '');
  }
  const example = [
    ...fieldsFor(view).map((f) => `${f.key}=…`),
    ...column.slice(0, 1).map((c) => `${c.label}=…`),
  ].join('; ');
  out.push(
    wrap(
      `To file it: npm run play -- file "${example}" --save ${savePath}. An answer is an option's number or its words; a line left out is ${UNKNOWN}.`,
    ),
  );
  return out.join('\n');
}

function matchOption(options: { value: string; label: string }[], raw: string, what: string): string | null {
  const v = fold(raw);
  if (v === '' || v === '?' || v === fold(UNKNOWN) || v === "i don't know") return null;
  if (/^\d+$/.test(v)) {
    const hit = options[Number(v) - 1];
    if (hit) return hit.value;
  }
  const bare = (s: string): string => fold(s).replace(/^(the|a|an) /, '');
  const exact = options.filter(
    (o) => fold(o.label) === v || fold(o.value) === v || bare(o.label) === bare(v) || fold(o.label.split(' — ')[0] ?? '') === v,
  );
  if (exact.length === 1) return (exact[0] as { value: string }).value;
  const words = new RegExp(`(^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
  const partial = options.filter((o) => words.test(fold(o.label)));
  if (partial.length === 1) return (partial[0] as { value: string }).value;
  fail(
    `${partial.length > 1 ? 'More than one' : 'None'} of the options for ${what} fits "${raw}". The options:\n${options
      .map((o, i) => `  ${i + 1}. ${o.label}`)
      .join('\n')}`,
  );
}

function parseReport(night: Night, text: string): Report {
  const { view } = night;
  const fields = fieldsFor(view);
  const column = columnFor(view);
  let report: Report = { ...EMPTY_REPORT };
  const col: Record<string, string | null> = {};
  for (const c of column) col[c.personId] = null;
  for (const part of text.split(';').map((p) => p.trim()).filter((p) => p.length > 0)) {
    const eq = part.indexOf('=');
    if (eq < 0) fail(`"${part}" is not key=answer.`);
    const key = fold(part.slice(0, eq)).replace(/^column /, '');
    const value = part.slice(eq + 1).trim();
    if (key === 'told') {
      if (view.kase.act.type !== 'affair') fail('Only an affair asks what I tell the client.');
      if (!(TOLD_CHOICES as string[]).includes(fold(value))) fail(`told is one of ${TOLD_CHOICES.join(', ')}.`);
      report = { ...report, told: fold(value) as Told };
      continue;
    }
    const field = fields.find((f) => f.key === key || fold(f.label) === key);
    if (field) {
      report = withAnswer(report, field.key, matchOption(field.options, value, field.label));
      continue;
    }
    const line = column.find((c) => fold(c.label) === key);
    if (line) {
      col[line.personId] = matchOption(line.options, value, line.label);
      continue;
    }
    fail(
      `The form has no line "${part.slice(0, eq).trim()}". It asks: ${[
        ...fields.map((f) => f.key),
        ...column.map((c) => c.label),
      ].join(', ')}.`,
    );
  }
  if (column.length > 0) report = { ...report, column: col };
  return report;
}

/* ------------------------------------------------- after it is filed */

function tellText(night: Night): string {
  const client = night.view.client;
  const his = client.gender === 'f' ? 'her' : 'his';
  return [
    `WHAT I TELL ${client.surname.toUpperCase()}`,
    DOUBLE,
    '',
    wrap(
      `${client.surname} was waiting on my stairs with ${his} hat in ${his} hands, which is where people keep their hats when they are afraid of the answer. The report was written. What I said out loud was up to me.`,
    ),
    '',
    '   1. The truth, all of it — Where, when, and with whom, and what it was.',
    '   2. A kinder half of it — Enough to sleep on. Not the name.',
    '   3. Nothing at all — I found nothing. I keep the smaller half of the fee.',
    '',
    'The report is scored on the facts. This changes only what happens next.',
  ].join('\n');
}

function verdictOf(night: Night): Verdict {
  return scoreReport(night.view, night.state, night.state.filed as Report);
}

function verdictText(night: Night, savePath: string): string {
  const verdict = verdictOf(night);
  const out: string[] = ['THE VERDICT', DOUBLE, ''];
  for (const f of verdict.fields) {
    out.push(wrap(`${f.correct ? '✓' : '✗'} ${f.label}: ${f.correct ? f.given : `${f.given} — it was ${f.truth}`}`, WIDTH, ''));
  }
  if (verdict.column.length > 0) {
    out.push('', `Where they were at ${verdict.columnTime ?? 'the hour'}:`);
    for (const c of verdict.column) {
      out.push(`  ${c.correct ? '✓' : '✗'} ${c.name}: ${c.correct ? c.given : `${c.given} — it was ${c.truth}`}`);
    }
  }
  out.push('', `${verdict.points} out of ${verdict.asked}.`, '');
  for (const paragraph of verdict.closing) out.push(wrap(paragraph), '');
  out.push(
    'The closing page offers two more:',
    `  What really happened      npm run play -- story --save ${savePath}`,
    `  Look behind the curtain   npm run play -- curtain --save ${savePath}`,
  );
  return out.join('\n');
}

function storyText(night: Night): string {
  const report = night.state.filed as Report;
  const out = ['WHAT REALLY HAPPENED', DOUBLE, ''];
  for (const p of storyParagraphs(storyOf(night.kase, [], report.told))) out.push(wrap(p), '');
  return out.join('\n');
}

function curtainText(night: Night): string {
  const verdict = verdictOf(night);
  const out = ['BEHIND THE CURTAIN', DOUBLE, ''];
  if (verdict.proofs && verdict.proofs.length > 0) {
    out.push('How it could be known', '');
    for (const { label, proof } of verdict.proofs) {
      out.push(wrap(`${label}. ${proof.what}${proof.hypothesis ? ' It takes trying one answer and seeing it fail.' : ''}`));
      proof.rules.forEach((r, i) => out.push(wrap(`${i + 1}. ${r}`, WIDTH, '    ')));
      out.push('');
    }
    out.push('The whole sheet', '');
  }
  out.push(renderTruthSheet(night.kase));
  return out.join('\n');
}

/* ------------------------------------------------------------- views */

/** What the book shows right now. */
function lookText(night: Night, savePath: string): string {
  const { state } = night;
  if (state.filed) return verdictText(night, savePath);
  if (night.save.pendingReport) return tellText(night);
  const page = pageText(night, state.log.length - 1);
  if (state.reportOpen) {
    return `${page}\n\n${DOUBLE}\n\n${reportText(night, savePath)}`;
  }
  const picker = pickerGroup(night);
  if (picker) return `${page}\n\n${DOUBLE}\n\n${pickerText(night, picker)}`;
  return `${page}\n\n${DOUBLE}\n\n${choicesText(night)}`;
}

function titleText(save: Pick<PlaySave, 'tier' | 'level' | 'engine'> | null): string {
  const out: string[] = ['DASHIELL', '', 'A murder, an evening, and eight hours to write it down.', ''];
  if (save?.engine) {
    out.push(wrap('The new engine (v2): the puzzle is built first, and the night is told as a book around it. Murders and lost pets.'), '');
  }
  if (save) {
    const shape = shapeOf(save.tier);
    out.push(`${shape.name}, at ${LADDERS[levelFor(save.tier, save.level)].name}`, shape.rule);
    if (save.tier !== 0 && save.tier !== 1) out.push(LIE_RULE);
    out.push('');
  }
  out.push(
    wrap(
      `Every page ends in choices: ask, search, go. Each one says what it costs of the night, and a lead is marked with a star. The DA files at eight whether you have or not. A clean report opens the next tier. ${LIE_RULE}`,
    ),
  );
  return out.join('\n');
}

function helpText(night: Night | null, savePath: string | undefined): string {
  const out: string[] = [titleText(night?.save ?? null), '', 'THE BOOK’S HELP PAGE', DOUBLE, ''];
  for (const l of HELP_LINES) {
    const gloss = wrap(l.gloss, WIDTH - 36).split('\n');
    out.push(`    ${l.command.padEnd(31)} ${gloss[0] ?? ''}`, ...gloss.slice(1).map((g) => `${' '.repeat(36)}${g}`));
  }
  out.push('', wrap(HELP_NOTE), '', wrap(`${LIE_RULE} ${LIE_RULE_NOTE}`));
  if (night) {
    const budget = gameBudget(night.kase);
    out.push(
      '',
      wrap(
        `Tonight: ${budget} calls between midnight and eight, about ${minutesPerAction(budget)} minutes a call. ${clockStrip(night.state.actionsUsed, budget, deadlineOf(night.view)).left}`,
      ),
    );
  }
  const s = savePath ?? '<file>';
  out.push(
    '',
    'THIS TOOL',
    DOUBLE,
    '',
    wrap(
      'The book has no text box: every page ends in choices, and this tool prints them numbered, with what each costs. Pick one by its number, or by its words exactly as printed.',
    ),
    '',
    `  npm run play -- new --seed N --tier 0..5 [--level 1..4] [--engine v2] --save ${s}`,
    `  npm run play -- look --save ${s}              the page and its choices again`,
    `  npm run play -- do "<number or words>" --save ${s}`,
    `  npm run play -- page <n> --save ${s}          turn back to an earlier page`,
    `  npm run play -- notebook --save ${s}`,
    `  npm run play -- grid --save ${s}              "Where they were"`,
    `  npm run play -- pencil "<Name> <hour> at|not|clear [place]" --save ${s}`,
    `  npm run play -- link ["<n> <Name>|none"] --save ${s}   a stranger's sighting`,
    `  npm run play -- confront "<Name>" --save ${s}  then do a fact's number`,
    `  npm run play -- report --save ${s}            the form's questions`,
    `  npm run play -- file "who=…; when=…; …" --save ${s}`,
    `  npm run play -- story --save ${s}             after filing only`,
    `  npm run play -- curtain --save ${s}           after filing only`,
  );
  return out.join('\n');
}

/* ------------------------------------------------------------ commands */

function load(io: PlayIo, path: string | undefined): Night {
  if (!path) fail('Say which save: --save <file>.');
  const text = io.read(path);
  if (text === null) fail(`No save at ${path}. Start one with: npm run play -- new --seed N --tier T --save ${path}`);
  let save: PlaySave;
  try {
    save = JSON.parse(text) as PlaySave;
  } catch {
    fail(`${path} is not a save this tool wrote.`);
  }
  if (save.game !== 'dashiell-play') fail(`${path} is not a save this tool wrote.`);
  return deal(save);
}

function store(io: PlayIo, path: string, save: PlaySave): void {
  io.write(path, `${JSON.stringify(save, null, 1)}\n`);
}

function requirePlaying(night: Night): void {
  if (night.state.filed) fail('The report is filed; the night is over. `look` shows the verdict again.');
  if (night.save.pendingReport) fail(`The report is written, and ${night.view.client.surname} is waiting to be told something: do 1, 2 or 3.`);
}

/** One more thing done: saved, replayed, and the page it lands on. */
function commit(io: PlayIo, path: string, night: Night, events: PlayEvent[], changes: Partial<PlaySave> = {}): Night {
  const save: PlaySave = { ...night.save, ...changes, events: [...night.save.events, ...events] };
  let state = night.state;
  for (const e of events) state = apply(state, night.view, e);
  store(io, path, save);
  return { ...night, save, state };
}

function cmdNew(io: PlayIo, a: Args): string {
  const path = a.values.get('save');
  if (!path) fail('Say where to keep the night: --save <file>.');
  const seed = Number(a.values.get('seed'));
  if (!Number.isInteger(seed) || seed < 1) fail('--seed is a whole number, 1 or more.');
  const t = a.values.get('tier');
  const tier: TierKey | null =
    t === 'over-easy' ? 'over-easy' : t !== undefined && /^[0-5]$/.test(t) ? (Number(t) as TierKey) : null;
  if (tier === null) fail('--tier is 0, 1, 2, 3, 4, 5 or over-easy.');
  const l = a.values.get('level') ?? '2';
  if (!/^[1-4]$/.test(l)) fail('--level is 1, 2, 3 or 4.');
  const engineFlag = a.values.get('engine');
  if (engineFlag !== undefined && engineFlag !== 'v2') fail('--engine is v2, or left out.');
  const save: PlaySave = {
    game: 'dashiell-play',
    version: 1,
    seed,
    tier,
    level: levelFor(tier, Number(l) as Level),
    ...(engineFlag === 'v2' ? { engine: 'v2' as const } : {}),
    detective: a.values.get('name') || 'Dashiell',
    events: [],
    picker: null,
    pendingReport: null,
  };
  const night = deal(save);
  store(io, path, save);
  return [titleText(save), '', caseLine(night.kase), '', DOUBLE, '', lookText(night, path)].join('\n');
}

function resolveChoice(items: readonly Numbered[], raw: string): Numbered | null {
  const v = fold(raw);
  if (/^\d+$/.test(v)) return items.find((i) => i.n === Number(v)) ?? null;
  const byCommand = items.filter((i) => fold(i.choice.command) === v);
  if (byCommand.length >= 1) return byCommand[0] as Numbered;
  const byLabel = items.filter((i) => fold(i.choice.label) === v);
  if (byLabel.length === 1) return byLabel[0] as Numbered;
  if (byLabel.length > 1) fail(`More than one choice reads "${raw}": use its number.`);
  return null;
}

function cmdDo(io: PlayIo, a: Args, path: string): string {
  let night = load(io, path);
  const raw = a.arg;
  if (raw === undefined) fail('do what? A choice\'s number, or its words.');
  if (night.state.filed) fail('The report is filed; the night is over. `look` shows the verdict again.');

  // An affair: what I tell the client, the last thing the night asks.
  if (night.save.pendingReport) {
    const v = fold(raw);
    const told: Told | undefined =
      v === '1' || v.startsWith('the truth') || v === 'truth'
        ? 'truth'
        : v === '2' || v.startsWith('a kinder half') || v === 'half'
          ? 'half'
          : v === '3' || v.startsWith('nothing') ? 'nothing' : undefined;
    if (!told) fail('Tell them 1, 2 or 3.');
    const report = { ...night.save.pendingReport, told };
    night = commit(io, path, night, [{ file: report }], { pendingReport: null });
    return verdictText(night, path);
  }

  if (night.state.reportOpen) {
    fail(`The report form is open, and there is nothing else to do tonight. See it with: npm run play -- report --save ${path}`);
  }

  const groups = choicesFor(night.view, night.state);
  const picker = pickerGroup(night);
  if (picker) {
    const facts: Numbered[] = picker.choices.map((c, i) => ({ n: i + 1, choice: c as Choice, group: picker }));
    const nothing = facts.length + 1;
    const v = fold(raw);
    if (v === String(nothing) || v === 'put nothing to them') {
      night = commit(io, path, night, [], { picker: null });
      return lookText(night, path);
    }
    const hit = resolveChoice(facts, raw);
    if (hit) return take(io, path, night, hit.choice.command);
    // Anything else on the page can still be chosen by its words.
    const other = /^\d+$/.test(v) ? null : resolveChoice(numbered(groups), raw);
    if (!other) fail(`No fact ${raw} in the list. \`look\` shows it again.`);
    return chosen(io, path, night, other);
  }

  const items = numbered(groups);
  let hit = resolveChoice(items, raw);
  if (!hit) {
    // A fact put straight to somebody by its words: the picker opened and
    // the fact taken, in one.
    const facts = groups
      .filter((g) => g.kind === 'confront')
      .flatMap((g) => g.choices.map((c) => ({ n: 0, choice: c as Choice, group: g })));
    hit = /^\d+$/.test(fold(raw)) ? null : resolveChoice(facts, raw);
    if (hit) return take(io, path, night, hit.choice.command);
  }
  if (!hit) fail(`Nothing on this page is "${raw}". \`look\` shows the choices again.`);
  return chosen(io, path, night, hit);
}

function chosen(io: PlayIo, path: string, night: Night, hit: Numbered): string {
  if (hit.group.kind === 'confront') {
    const opened = commit(io, path, night, [], { picker: hit.group.personId ?? null });
    return lookText(opened, path);
  }
  if (hit.choice.command === 'notebook') return renderNotebookText(night.view, night.state, { book: true });
  return take(io, path, night, hit.choice.command);
}

function take(io: PlayIo, path: string, night: Night, command: string): string {
  const next = commit(io, path, night, [{ do: command }], { picker: null });
  return lookText(next, path);
}

function cmdConfront(io: PlayIo, a: Args, path: string): string {
  const night = load(io, path);
  requirePlaying(night);
  if (night.state.reportOpen) fail('The report form is open; nobody is left to put anything to.');
  const name = fold(a.arg ?? '');
  if (name === 'off' || name === 'nothing') return lookText(commit(io, path, night, [], { picker: null }), path);
  const groups = choicesFor(night.view, night.state).filter((g) => g.kind === 'confront');
  const hit = groups.find((g) => {
    const person = night.view.personById.get(g.personId as Id);
    const shown = fold(displayName(night.view, night.state, g.personId as Id));
    return shown === name || (person !== undefined && shown.includes(fold(person.surname)) && fold(person.surname) === name);
  });
  if (!hit) {
    const offered = groups.map((g) => displayName(night.view, night.state, g.personId as Id));
    fail(
      offered.length === 0
        ? 'There is nobody here to put anything to.'
        : `Nobody here by that name to put anything to. This page offers: ${offered.join(', ')}.`,
    );
  }
  return lookText(commit(io, path, night, [], { picker: hit.personId ?? null }), path);
}

function gridPeople(night: Night): { id: Id; name: string }[] {
  const grid = gridFrom(night.view, night.state);
  return [...grid.rows, ...grid.fixtures].map((r) => ({ id: r.personId, name: r.name }));
}

function findRow(night: Night, raw: string, victimOk = true): Id {
  const v = fold(raw);
  const grid = gridFrom(night.view, night.state);
  const rows = [...grid.rows, ...grid.fixtures].filter((r) => victimOk || r.kind !== 'victim');
  const hit = rows.filter((r) => {
    const name = fold(r.name);
    return name === v || name.split(' ').pop() === v;
  });
  if (hit.length !== 1) {
    fail(`"${raw}" is not a row on the grid. The rows: ${rows.map((r) => r.name).join(', ')}.`);
  }
  return (hit[0] as { personId: Id }).personId;
}

function cmdPencil(io: PlayIo, a: Args, path: string): string {
  const night = load(io, path);
  requirePlaying(night);
  const spec = (a.arg ?? '').trim();
  const m = /^(.+?)\s+(\d{1,2})(?::(\d\d))?\s*(?:pm)?\s+(at|not|clear)\b\s*(.*)$/i.exec(spec);
  if (!m) fail('Pencil reads "<Name> <hour> at <place>", "<Name> <hour> not <place>" or "<Name> <hour> clear", e.g. "Grasso 9:30 at the suite".');
  const personId = findRow(night, m[1] as string);
  const h = Number(m[2]);
  const tick = (h - 6) * 2 + (m[3] === '30' ? 1 : 0);
  if (!(tick >= 0 && tick <= 11) || (m[3] !== undefined && m[3] !== '00' && m[3] !== '30')) {
    fail('The grid runs from 6 to 11:30, on the half hour.');
  }
  const verb = (m[4] as string).toLowerCase();
  let action: MarkAction;
  if (verb === 'clear') action = { kind: 'clear' };
  else {
    const grid = gridFrom(night.view, night.state);
    const want = fold(m[5] ?? '').replace(/^at /, '');
    const bare = (s: string): string => fold(s).replace(/^the /, '');
    const place = grid.places.find(
      (p) => bare(p.shortName) === bare(want) || fold(p.abbrev) === want || fold(p.label) === want,
    );
    if (!place) fail(`"${m[5] ?? ''}" is not a column's place. The places: ${grid.places.map((p) => p.shortName).join(', ')}.`);
    action = { kind: verb === 'at' ? 'at' : 'not', placeId: place.id };
  }
  const next = commit(io, path, night, [{ mark: { personId, tick, action } }]);
  return `(pencilled: ${spec}. Free; never a fact.)\n\n${renderGridText(next.view, next.state)}`;
}

function cmdLink(io: PlayIo, a: Args, path: string): string {
  const night = load(io, path);
  requirePlaying(night);
  const grid = gridFrom(night.view, night.state);
  const list = grid.descriptions;
  const spec = (a.arg ?? '').trim();
  if (spec === '') {
    if (list.length === 0) return 'No stranger’s sighting in the notebook to put a name to.';
    const out = ['STRANGERS SEEN', ''];
    list.forEach((d, i) => {
      const at = grid.places.find((p) => p.id === d.placeId)?.shortName ?? '';
      const linked = d.linkedTo ? ` → ${gridPeople(night).find((p) => p.id === d.linkedTo)?.name ?? ''} (my link, not a fact)` : '';
      out.push(wrap(`${i + 1}. Somebody who fits ${d.text} · ${grid.ticks[d.tick]?.clock ?? ''} · at ${at}${linked}`, WIDTH, ''));
    });
    out.push('', wrap(`That was …: npm run play -- link "<n> <Name>" --save ${path}, or "<n> none" to rub it out. Your link, not a fact. Free. The report is where a wrong one costs.`));
    return out.join('\n');
  }
  const m = /^(\d+)\s+(.+)$/.exec(spec);
  const d = m ? list[Number(m[1]) - 1] : undefined;
  if (!m || !d) fail('link reads "<n> <Name>" or "<n> none"; `link` alone lists the sightings.');
  const personId = fold(m[2] as string) === 'none' ? null : findRow(night, m[2] as string, false);
  const next = commit(io, path, night, [{ link: { key: d.key, personId: personId ?? d.linkedTo ?? null } }]);
  return renderGridText(next.view, next.state);
}

function cmdFile(io: PlayIo, a: Args, path: string): string {
  let night = load(io, path);
  requirePlaying(night);
  const report = parseReport(night, a.arg ?? '');
  // The notebook's "File the report": the typewriter first, if the form is not out yet.
  if (!night.state.reportOpen) night = commit(io, path, night, [{ do: 'file' }], { picker: null });
  if (night.view.kase.act.type === 'affair' && report.told === undefined) {
    night = commit(io, path, night, [], { pendingReport: report });
    return tellText(night);
  }
  night = commit(io, path, night, [{ file: report }]);
  return verdictText(night, path);
}

export function runPlay(argv: string[], io: PlayIo): PlayResult {
  const a = parseArgv(argv);
  const path = a.values.get('save');
  try {
    switch (a.command) {
      case 'new':
        return { out: cmdNew(io, a), code: 0 };
      case 'look':
        return { out: lookText(load(io, path), path as string), code: 0 };
      case 'do':
        return { out: cmdDo(io, a, path as string), code: 0 };
      case 'page': {
        const night = load(io, path);
        const n = Number(a.arg);
        if (!Number.isInteger(n) || n < 1 || n > night.state.log.length) fail(`page 1 to ${night.state.log.length}.`);
        const last = n === night.state.log.length;
        return { out: last ? lookText(night, path as string) : `${pageText(night, n - 1)}\n\n(A page turned back to.)`, code: 0 };
      }
      case 'notebook': {
        const night = load(io, path);
        return { out: `${caseLine(night.kase)}\n\n${renderNotebookText(night.view, night.state, { book: true })}`, code: 0 };
      }
      case 'grid': {
        const night = load(io, path);
        return { out: renderGridText(night.view, night.state), code: 0 };
      }
      case 'pencil':
        return { out: cmdPencil(io, a, path as string), code: 0 };
      case 'link':
        return { out: cmdLink(io, a, path as string), code: 0 };
      case 'confront':
        return { out: cmdConfront(io, a, path as string), code: 0 };
      case 'report': {
        const night = load(io, path);
        if (night.state.filed) return { out: verdictText(night, path as string), code: 0 };
        return { out: reportText(night, path as string), code: 0 };
      }
      case 'file':
        return { out: cmdFile(io, a, path as string), code: 0 };
      case 'story':
      case 'curtain': {
        const night = load(io, path);
        if (!night.state.filed) fail('Not until the report is filed.');
        return { out: a.command === 'story' ? storyText(night) : curtainText(night), code: 0 };
      }
      case 'help': {
        const night = path && io.read(path) !== null ? load(io, path) : null;
        return { out: helpText(night, path), code: 0 };
      }
      default:
        fail(`No command "${a.command}". Try: npm run play -- help`);
    }
  } catch (err) {
    if (err instanceof PlayError) return { out: err.message, code: 1 };
    throw err;
  }
}
