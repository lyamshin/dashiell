/**
 * docs/53, addendum: the engine's words in the narration, counted by where they
 * come from. `npx tsx scripts/engine-words.ts [--nights 10] [--show 20] [--source voicings]`
 *
 * Static (every template, once):
 * - **voicings** (`content/board/voicings.json`): each template, its narration
 *   (a narrator's shape, or the text outside quotation marks) and its speech;
 * - **situated** (`content/board/situated.json`): each card.
 *
 * Rendered (N nights a tier, both worlds, the oracle's and the wanderer's routes),
 * by the unit that said it (`Page.board.units`):
 * - **voiced composites** (a fact said in a voicing), **plain fallback** (a fact said plainly where
 *   no voicing fitted), **writer: thought / thread / pages** (a fact in the writer's own words,
 *   by beat), **texture: situated / decks** (a gap, by whether the situated deck filled it);
 * - **plain page** (`?plain=1`, `bones/plain.ts`): every page's plain rendering;
 * - **stars**: every starred choice's reason, page by page along the route;
 * - **report**: the form's labels and line options, the verdict, the story and the curtain;
 * - **CLI**: the help, the notebook's headings and the grid's legend.
 *
 * A hit is a rule of `src/game/board/jargon.ts` in narration, or one of its speech rules in speech.
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardRun, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { engineWords, type EngineHit } from '../src/game/board/jargon.js';
import { voicings } from '../src/game/board/bones/voice.js';
import { SCHEMA } from '../src/game/board/bones/schema.js';
import { situatedDeck } from '../src/game/board/plan/situated.js';
import { plainPage } from '../src/game/board/bones/plain.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardChoices } from '../src/game/board/choices.js';
import { boardFields, curtainOfBoard, scoreBoard, storyOfBoard } from '../src/game/board/report.js';
import { notebookText } from '../src/game/board/text.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { runPlay } from '../src/cli/play-lib.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 10);
const SHOW = Number(val('show') ?? 0);
const ONLY = val('source');
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];

const counts = new Map<string, { hits: number; speech: number; texts: number; of: number; byRule: Map<string, number>; ex: string[] }>();
function tally(source: string, text: string, where = ''): void {
  const k = counts.get(source) ?? { hits: 0, speech: 0, texts: 0, of: 0, byRule: new Map(), ex: [] };
  counts.set(source, k);
  k.of++;
  const hits: EngineHit[] = engineWords(text);
  if (hits.length === 0) return;
  k.texts++;
  for (const h of hits) {
    if (h.speech) k.speech++;
    else k.hits++;
    const r = `${h.name}${h.speech ? ' (speech)' : ''}`;
    k.byRule.set(r, (k.byRule.get(r) ?? 0) + 1);
  }
  if (k.ex.length < 400) k.ex.push(`${where} [${hits.map((h) => `${h.name}${h.speech ? '/sp' : ''}: “${h.match}”`).join('; ')}] ${text.replace(/⁣\d+⁤/g, '').slice(0, 260)}`);
}

// Static: the voicings, narration or speech by their shape.
for (const v of voicings()) {
  const speech = SCHEMA[v.shape].speech && !(v.requires ?? []).includes('thought') && !(v.requires ?? []).includes('found');
  tally('static: voicings', speech ? `“${v.template}”` : v.template, v.id);
}
for (const card of situatedDeck()) tally('static: situated', card.text, card.id);

// The CLI's own words: the help, the teach page, the notebook's headings, the grid's legend.
const io = { read: () => null, write: () => undefined };
tally('CLI: help', runPlay(['help'], io as never).out);
for (const l of BOARD_TEACH_LINES) tally('CLI: teach page', l);

const seenStatic = new Set<string>();
function once(source: string, text: string, where: string): void {
  const key = `${source}|${text}`;
  if (seenStatic.has(key)) return;
  seenStatic.add(key);
  tally(source, text, where);
}

function stars(d: BoardDeal, commands: string[], where: string): void {
  let run = newBoardRun(d, {});
  const said = (r: BoardRun) => {
    for (const g of boardChoices(d, r)) for (const ch of [...g.choices, ...(g.more ?? [])]) if (ch.lead && ch.why) once('stars', ch.why, where);
  };
  said(run);
  for (const cmd of commands) {
    const r = stepBoard(d, run, cmd);
    if (r.error) break;
    run = r.run;
    said(run);
  }
}

for (const world of ['dealt', 'neighbourhood']) {
  for (const tier of tiers) {
    const types = typesFor(tier) as CaseType[];
    for (let s = 1; s <= N; s++) {
      const type = types[s % types.length] as CaseType;
      const d = dealBoard(s, tier, type, world === 'dealt' ? {} : { world });
      const o = playBoardOracle(d);
      const runs: BoardRun[] = [o.run, playWanderer(d, s).run];
      for (const [ri, run] of runs.entries()) {
        for (const p of run.log) {
          const where = `${world} t${tier} ${type} s${s} ${ri ? 'w' : 'o'} p${p.n + 1}`;
          for (const u of p.board?.units ?? []) {
            if (u.voice === 'chapter') continue;
            let src: string;
            if (u.kind === 'fact') {
              const vs = (u.bones ?? []).map((b) => b.voicing ?? 'flesh');
              if (vs.some((x) => x !== 'flesh' && x !== 'plain')) src = 'voiced composites';
              else if (vs.includes('plain')) src = 'plain fallback';
              else src = u.beat === 'thought' ? 'writer: thought' : u.beat === 'why' || u.beat === 'handoff' ? 'writer: thread' : 'writer: pages';
            } else src = u.card ? 'texture: situated' : 'texture: decks/writer';
            // A person's answer is speech, whole (the page sets it in quotation marks).
            tally(src, u.voice === 'answer' && !u.text.includes('“') ? `“${u.text}”` : u.text, where);
          }
          // The page as read, whole (what the prose lint reads).
          tally('page (whole)', p.blocks.map((b) => (b.kind === 'prose' && b.voice !== 'chapter' ? b.text : b.kind === 'note' ? b.text : '')).join('\n'), where);
          for (const b of plainPage(d.kase, p)) if (b.kind === 'prose') tally('plain page', b.text, where);
        }
        if (ri === 0) {
          const where = `${world} t${tier} ${type} s${s}`;
          // The report (docs/78): its five questions and their answers, the verdict, the story, the curtain.
          for (const f of boardFields(d, run)) {
            once('report', f.label, where);
            for (const o2 of f.options) once('report: answers', o2.label, where);
          }
          const v = scoreBoard(d, run, o.report);
          for (const t of [v.scoreLine, ...v.fields.flatMap((f) => (f.correction ? [f.correction] : [])), ...v.closing]) tally('report: verdict', t, where);
          for (const t of storyOfBoard(d)) tally('report: story', t, where);
          tally('report: curtain', curtainOfBoard(d, run, o.report), where);
          // The notebook's own words: its headings and the grid's legend, not the lines it lists.
          const nb = notebookText(d, run)
            .split('\n')
            .filter((l) => !/^\s{2}/.test(l) && !/^(?:[A-Z][\w’.-]+(?: [A-Z][\w’.-]+)*(?: †)?\s{2,})/.test(l) && !/^\s*$/.test(l) && !/^(?:Places:)/.test(l));
          for (const l of nb) once('CLI: notebook and grid', l, where);
          stars(d, o.commands, where);
        }
      }
    }
  }
}

const order = ['static: voicings', 'static: situated', 'voiced composites', 'plain fallback', 'writer: thought', 'writer: thread', 'writer: pages', 'texture: situated', 'texture: decks/writer', 'page (whole)', 'plain page', 'stars', 'report', 'report: answers', 'report: verdict', 'report: story', 'report: curtain', 'CLI: help', 'CLI: teach page', 'CLI: notebook and grid'];
process.stdout.write(`| source | texts with a hit / texts | narration hits | speech hits |\n|---|---|---|---|\n`);
for (const k of [...order, ...[...counts.keys()].filter((x) => !order.includes(x))]) {
  const x = counts.get(k);
  if (!x) continue;
  process.stdout.write(`| ${k} | ${x.texts} / ${x.of} | ${x.hits} | ${x.speech} |\n`);
}
process.stdout.write('\nBy rule:\n');
for (const k of order) {
  const x = counts.get(k);
  if (!x || x.byRule.size === 0) continue;
  process.stdout.write(`- ${k}: ${[...x.byRule.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ${n}`).join(', ')}\n`);
}
if (SHOW) {
  for (const [k, x] of counts) {
    if (ONLY && k !== ONLY) continue;
    if (!x.ex.length) continue;
    process.stdout.write(`\n## ${k}\n${x.ex.slice(0, SHOW).join('\n')}\n`);
  }
}
