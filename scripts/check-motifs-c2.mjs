#!/usr/bin/env node
/**
 * Tagging C2 checker — content/08-m4b-coherence-and-the-office.md Part C.
 *
 * Verifies `motifs` and `weather` on the seven tagged decks (arrivals,
 * transitions, ambient, asides, places, endings, witness) and the three new
 * B.4 decks (office, entrances, hiring):
 *
 *   - every card has a `motifs` array, drawn only from the fixed A.2
 *     vocabulary, with 0-3 entries;
 *   - every `weather` field, when present, is one of the five values A.2
 *     allows (fog | rain | cold | clear | any);
 *   - a deck's card ids are unique and its `status` is a known value.
 *
 * The A.2 vocabulary is fixed and embedded here (not read from
 * content/motifs.json, which the engine track owns on branch m4b-engine and
 * had not landed on this branch at write time) — the validator rejects
 * anything outside it, per docs/08-m4b-coherence-and-the-office.md A.2.
 *
 * Node, zero dependencies.
 *
 *   node scripts/check-motifs-c2.mjs                 # all ten C2 files
 *   node scripts/check-motifs-c2.mjs content/decks/office.json
 *   node scripts/check-motifs-c2.mjs --quiet         # errors and summary only
 *   node scripts/check-motifs-c2.mjs --json
 *
 * Exit code is 1 if any card fails, 0 otherwise.
 */

import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DECK_DIR = join(ROOT, 'content', 'decks');

// --- A.2 motif vocabulary, fixed. ------------------------------------------
const MOTIF_GROUPS = {
  weather: ['fog', 'rain', 'cold', 'heat', 'clear', 'wind', 'snow'],
  time: ['late', 'dawn', 'midnight'],
  sound: ['radio', 'el', 'piano', 'bells', 'traffic', 'quiet', 'singing', 'footsteps'],
  props: [
    'drink', 'cigarette', 'money', 'keys', 'paper', 'ledger', 'glass', 'hat', 'coat',
    'telephone', 'clock', 'lamp', 'door', 'window', 'stairs', 'counter', 'mirror', 'photograph',
  ],
  body: ['hands', 'face', 'eyes', 'voice', 'mouth', 'shoulders', 'breath'],
  place: ['street', 'alley', 'room', 'bar', 'kitchen', 'office', 'roof', 'cellar', 'church', 'station'],
  theme: [
    'funeral', 'market', 'theater', 'baseball', 'boxing', 'gambling', 'law', 'medicine', 'sea',
    'machinery', 'animals', 'food', 'childhood', 'work', 'sleep', 'memory',
  ],
};
const MOTIF_VOCAB = new Set(Object.values(MOTIF_GROUPS).flat());

// The `weather` field's own enum (A.2): narrower than the weather *motif*
// group above, which also allows heat/wind/snow as imagery.
const WEATHER_VALUES = new Set(['fog', 'rain', 'cold', 'clear', 'any']);

const KNOWN_STATUSES = new Set(['generated', 'kept', 'tuned', 'cut', 'placeholder']);

// The ten files Tagging C2 owns: the seven tagged decks plus the three new
// B.4 decks (office, entrances, hiring).
const C2_FILES = [
  'arrivals.json',
  'transitions.json',
  'ambient.json',
  'asides.json',
  'places.json',
  'endings.json',
  'witness.json',
  'office.json',
  'entrances.json',
  'hiring.json',
];

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const explicitFiles = argv.filter((a) => !a.startsWith('--'));
const quiet = flags.has('--quiet');
const asJson = flags.has('--json');

const targets = (explicitFiles.length > 0 ? explicitFiles : C2_FILES.map((f) => join(DECK_DIR, f))).map(
  (f) => resolve(process.cwd(), f),
);

/* --------------------------------------------------------------- checker */

function checkDeck(path) {
  const file = basename(path);
  const report = {
    file,
    exists: existsSync(path),
    count: 0,
    errors: [],
    withMotifs: 0,
    zeroMotifs: 0,
    withWeather: 0,
    motifCounts: new Map(),
    byStatus: {},
  };
  if (!report.exists) {
    report.errors.push(`${file} does not exist`);
    return report;
  }

  let cards;
  try {
    cards = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    report.errors.push(`${file} is not valid JSON: ${err.message}`);
    return report;
  }
  if (!Array.isArray(cards)) {
    report.errors.push(`${file} is not an array of cards`);
    return report;
  }
  report.count = cards.length;

  const seenIds = new Set();

  cards.forEach((card, i) => {
    const where = `${file}[${i}]${card && card.id ? ` (${card.id})` : ''}`;
    if (typeof card !== 'object' || card === null) {
      report.errors.push(`${where}: not an object`);
      return;
    }

    if (typeof card.id !== 'string' || card.id.length === 0) {
      report.errors.push(`${where}: missing id`);
    } else if (seenIds.has(card.id)) {
      report.errors.push(`${where}: duplicate id`);
    } else {
      seenIds.add(card.id);
    }

    if (typeof card.status !== 'string' || !KNOWN_STATUSES.has(card.status)) {
      report.errors.push(`${where}: status ${JSON.stringify(card.status)} is not a known status`);
    } else {
      report.byStatus[card.status] = (report.byStatus[card.status] ?? 0) + 1;
    }

    // motifs: required array, 0-3 entries, every entry from the fixed vocab.
    if (!Array.isArray(card.motifs)) {
      report.errors.push(`${where}: missing motifs array`);
    } else {
      if (card.motifs.length > 3) {
        report.errors.push(`${where}: motifs has ${card.motifs.length} entries, max is 3`);
      }
      const seen = new Set();
      for (const m of card.motifs) {
        if (!MOTIF_VOCAB.has(m)) {
          report.errors.push(`${where}: motif "${m}" is not in the A.2 vocabulary`);
          continue;
        }
        if (seen.has(m)) {
          report.errors.push(`${where}: motif "${m}" repeated`);
        }
        seen.add(m);
        report.motifCounts.set(m, (report.motifCounts.get(m) ?? 0) + 1);
      }
      if (card.motifs.length > 0) report.withMotifs++;
      else report.zeroMotifs++;
    }

    // weather: optional; when present must be one of the five values.
    if (card.weather !== undefined) {
      if (!WEATHER_VALUES.has(card.weather)) {
        report.errors.push(
          `${where}: weather ${JSON.stringify(card.weather)} is not one of fog | rain | cold | clear | any`,
        );
      } else {
        report.withWeather++;
      }
    }

    // A card whose own tags.weather (where that tag exists) contradicts a
    // specific top-level weather is a real coherence bug, not a style nit.
    const tagWeather = card.tags && card.tags.weather;
    if (
      card.weather &&
      card.weather !== 'any' &&
      tagWeather &&
      tagWeather !== 'any' &&
      tagWeather !== card.weather
    ) {
      report.errors.push(
        `${where}: top-level weather "${card.weather}" contradicts tags.weather "${tagWeather}"`,
      );
    }
  });

  return report;
}

/* ------------------------------------------------------------------- run */

const reports = targets.map(checkDeck);
const totalErrors = reports.reduce((n, r) => n + r.errors.length, 0);

if (asJson) {
  console.log(
    JSON.stringify(
      reports.map((r) => ({
        file: r.file,
        count: r.count,
        withMotifs: r.withMotifs,
        zeroMotifs: r.zeroMotifs,
        withWeather: r.withWeather,
        byStatus: r.byStatus,
        topMotifs: [...r.motifCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
        errors: r.errors,
      })),
      null,
      2,
    ),
  );
  process.exit(totalErrors > 0 ? 1 : 0);
}

let grandTotal = 0;
let grandWithMotifs = 0;
let grandZero = 0;
let grandWeather = 0;
const grandMotifCounts = new Map();

console.log('deck            file                 cards  motifs  zero  weather  top motifs');
console.log('-'.repeat(100));
for (const r of reports) {
  grandTotal += r.count;
  grandWithMotifs += r.withMotifs;
  grandZero += r.zeroMotifs;
  grandWeather += r.withWeather;
  for (const [m, n] of r.motifCounts) grandMotifCounts.set(m, (grandMotifCounts.get(m) ?? 0) + n);

  const top = [...r.motifCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m, n]) => `${m}(${n})`)
    .join(', ');
  const deckName = r.file.replace('.json', '');
  console.log(
    `${deckName.padEnd(16)}${r.file.padEnd(21)}${String(r.count).padEnd(7)}${String(r.withMotifs).padEnd(8)}${String(
      r.zeroMotifs,
    ).padEnd(6)}${String(r.withWeather).padEnd(9)}${top}`,
  );
  if (!quiet) {
    for (const e of r.errors) console.log(`  ERROR   ${e}`);
  } else if (r.errors.length) {
    console.log(`  ${r.errors.length} error(s) — rerun without --quiet to see them`);
  }
}

console.log('-'.repeat(100));
const zeroPct = grandTotal ? ((grandZero / grandTotal) * 100).toFixed(1) : '0.0';
const weatherPct = grandTotal ? ((grandWeather / grandTotal) * 100).toFixed(1) : '0.0';
console.log(
  `TOTAL: ${grandTotal} cards across ${reports.length} decks · ${grandWithMotifs} with motifs · ${grandZero} zero-motif (${zeroPct}%) · ${grandWeather} with weather (${weatherPct}%)`,
);
const grandTop = [...grandMotifCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([m, n]) => `${m}(${n})`)
  .join(', ');
console.log(`Top motifs overall: ${grandTop}`);
console.log(`${totalErrors} error(s)`);

process.exit(totalErrors > 0 ? 1 : 0);
