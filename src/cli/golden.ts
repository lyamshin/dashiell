/**
 * The golden loop's page dump (docs/11-golden-loop.md).
 *
 * `npx tsx src/cli/golden.ts --out DIR [--seeds 40] [--pages 3] [--difficulty 2] [--tier 0..5] [--level 1..4]`
 *
 * M10: `--tier` deals the tiered case instead (at `--level`, Precinct by
 * default), so the night harness can read the logic game's question pages —
 * the ones the testimony golden is about.
 *
 * Renders the fixed measurement set — pages one to three of seeds 1..N at
 * difficulty 2 — through exactly the code path `npm run read` uses: the same
 * generator, the same oracle, the same `renderPageText`. What lands in DIR is
 * the *body* of each page, wrapped as the reader sees it, with the running
 * head, the rule and the `[free, 180 words]` footer stripped, because those
 * are furniture and not prose.
 *
 * `pages.json` beside them carries what the text cannot say: the engine's own
 * plain/image counts per page (M5 §1), the gap log, and the page's cost.
 *
 * `scripts/golden-loop.py` reads both and does the measuring.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateCase, type Difficulty } from '../gen/index.js';
import { buildView } from '../game/derive.js';
import { playOracle } from '../game/oracle.js';
import { renderPageText } from '../game/transcript.js';
import type { Page } from '../game/types.js';
import { parseArgs, parseTierLevel } from './args.js';

const { values } = parseArgs(process.argv.slice(2));
const out = values.get('out') ?? '.golden-pages';
const seeds = Number(values.get('seeds') ?? 40);
const pages = Number(values.get('pages') ?? 3);
const difficulty = Number(values.get('difficulty') ?? 2) as Difficulty;
const detective = values.get('detective') ?? 'Dashiell';
const dials = parseTierLevel(values) ?? {};
const tierOpts = dials.tier === undefined ? {} : { tier: dials.tier, level: dials.level ?? 2 };

/**
 * The prose of a rendered page. `renderPageText` puts the head and a rule on
 * the front and the cost/word/gap footer on the back; both are the transcript's
 * furniture rather than the page's writing, and neither is what the golden is.
 */
export function bodyOf(rendered: string): string {
  const lines = rendered.split('\n');
  let from = 0;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] as string).startsWith('───')) {
      from = i + 1;
      break;
    }
  }
  let to = lines.length;
  for (let i = lines.length - 1; i >= from; i--) {
    const line = lines[i] as string;
    if (line.trim().length === 0 || line.startsWith('[')) to = i;
    else break;
  }
  return lines.slice(from, to).join('\n').replace(/^\n+/, '').replace(/\n+$/, '') + '\n';
}

interface Row {
  seed: number;
  page: number;
  file: string;
  plain: number;
  image: number;
  cost: number;
  gaps: string[];
  words: number;
  /**
   * M8 §10. Which of the page shapes this page is — `office`, `arrive` (a
   * first visit), `return`, `search`, `ask`, `repeat` or `other` — so the
   * night harness can hold each page to the golden page of its own shape.
   */
  shape: string;
  /** The command that wrote the page. Empty for the office. */
  command: string;
}

/**
 * The page's shape. The planner writes it on the page since M8; a page from
 * before that is classified here from the command that wrote it, so the same
 * harness can measure a baseline and a branch.
 */
function shapeOf(page: Page, command: string, earlier: readonly Page[]): string {
  if (page.shape !== undefined) return page.shape;
  if (page.n === 0) return 'office';
  const verb = command.trim().split(/\s+/)[0] ?? '';
  if (verb === 'go') return earlier.some((p) => p.at === page.at) ? 'return' : 'arrive';
  if (page.cost === 0 && page.found.length === 0 && (verb === 'examine' || verb === 'ask')) {
    if (page.blocks.some((b) => b.kind === 'note' && /already/.test(b.text))) return 'repeat';
  }
  if (verb === 'examine') return 'search';
  if (verb === 'ask') return 'ask';
  return 'other';
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const rows: Row[] = [];
for (let seed = 1; seed <= seeds; seed++) {
  const kase = generateCase(seed, { difficulty, detectiveName: detective, ...tierOpts } as Parameters<typeof generateCase>[1]);
  const view = buildView(kase);
  const run = playOracle(view, detective);
  const state = run.state;
  const commands = ['', ...run.steps.map((s) => s.command)];
  for (const page of state.log.slice(0, pages)) {
    const text = bodyOf(renderPageText(page, view, state, { gaps: false }));
    const file = `seed${String(seed).padStart(2, '0')}-p${page.n + 1}.txt`;
    writeFileSync(join(out, file), text, 'utf8');
    rows.push({
      seed,
      page: page.n + 1,
      file,
      plain: page.plain,
      image: page.image,
      cost: page.cost,
      gaps: page.gaps,
      words: text.trim().split(/\s+/).filter((w) => w.length > 0).length,
      shape: shapeOf(page, commands[page.n] ?? '', state.log.slice(0, page.n)),
      command: commands[page.n] ?? '',
    });
  }
}

writeFileSync(join(out, 'pages.json'), `${JSON.stringify(rows, null, 1)}\n`, 'utf8');
process.stdout.write(`${rows.length} pages from ${seeds} seeds → ${out}\n`);
