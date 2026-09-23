/**
 * The plain-terms sweep over generated text.
 *
 * `npx tsx scripts/plain-terms-sweep.ts [--seeds 40] [--verbose]`
 *
 * Generates every case type at difficulties 1–3 for seeds 1..N, plays each
 * with the oracle, and runs every string a player can read — briefing, clue
 * sentences, dossiers, notebook, rendered pages, verdict — through the
 * banned-terms list in `content/plain-terms.json`. Prints the hits by term,
 * counted once per distinct sentence and once per occurrence. The same check
 * is test/plain-terms.test.ts; this is the version that says where.
 */
import type { Difficulty } from '../src/gen/index.js';
import { CASE_TYPES, playerText } from '../test/plain-helpers.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const argv = process.argv.slice(2);
const seedsAt = argv.indexOf('--seeds');
const SEEDS = seedsAt >= 0 ? Number(argv[seedsAt + 1]) : 40;
const verbose = argv.includes('--verbose');

const list = loadPlainTerms();
const byTerm = new Map<string, { occurrences: number; examples: Map<string, string> }>();
let strings = 0;
for (const type of CASE_TYPES) {
  for (const difficulty of [1, 2, 3] as Difficulty[]) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const { where, text } of playerText(seed, difficulty, type)) {
        strings++;
        for (const hit of findJargon(text, list) as { term: string; match: string; index: number }[]) {
          const rec = byTerm.get(hit.term) ?? { occurrences: 0, examples: new Map() };
          rec.occurrences++;
          const sentence = text.slice(Math.max(0, hit.index - 70), hit.index + hit.match.length + 50);
          if (!rec.examples.has(hit.match.toLowerCase() + sentence.slice(60, 120))) {
            rec.examples.set(hit.match.toLowerCase() + sentence.slice(60, 120), `${type}/${difficulty}/${seed} ${where}: …${sentence}…`);
          }
          byTerm.set(hit.term, rec);
        }
      }
    }
  }
}

const total = [...byTerm.values()].reduce((n, r) => n + r.occurrences, 0);
process.stdout.write(`${strings} strings over ${SEEDS} seeds × 3 difficulties × ${CASE_TYPES.length} case types · ${total} hits\n`);
for (const [term, rec] of [...byTerm].sort((a, b) => b[1].occurrences - a[1].occurrences)) {
  process.stdout.write(`  ${String(rec.occurrences).padStart(6)}  ${term}  (${rec.examples.size} distinct)\n`);
  if (verbose) for (const ex of [...rec.examples.values()].slice(0, 6)) process.stdout.write(`            ${ex}\n`);
}
process.exit(total === 0 ? 0 : 1);
