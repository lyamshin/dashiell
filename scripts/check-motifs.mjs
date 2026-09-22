#!/usr/bin/env node
/**
 * Check the Tagging C1 decks: similes, portraits, business, frames,
 * utterances, find, dashiell.
 *
 * Verifies:
 *   - every `motifs` entry is in the fixed A.2 vocabulary
 *   - every `weather` value is valid (fog | rain | cold | clear | any)
 *   - every simile card carries a `gender` tag
 *
 * Then reports, per deck, how many cards carry 0/1/2/3 motifs, and the
 * top 15 motifs used across these seven decks.
 *
 * Node, zero dependencies.
 *
 *   node scripts/check-motifs.mjs
 *
 * The vocabulary below is copied from docs/08-m4b-coherence-and-the-office.md
 * A.2. It is fixed there; the engine track is separately adding the same
 * list as data at content/motifs.json. Keep this list and that file in sync
 * by eye until something reads content/motifs.json instead.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DECK_DIR = join(ROOT, 'content', 'decks');

const VOCAB = {
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
const MOTIF_VOCAB = new Set(Object.values(VOCAB).flat());
const WEATHER_VOCAB = new Set(['fog', 'rain', 'cold', 'clear', 'any']);

// Tagging C1's files, per docs/08-m4b-coherence-and-the-office.md Part C.
const DECKS = ['similes', 'portraits', 'business', 'frames', 'utterances', 'find', 'dashiell'];

let errors = 0;
const perDeckDist = {}; // deck -> {0: n, 1: n, 2: n, 3: n}
const motifCounts = new Map(); // motif -> count, across all seven decks

for (const deck of DECKS) {
  const path = join(DECK_DIR, deck + '.json');
  let cards;
  try {
    cards = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`ERROR  ${deck}.json: ${err.message}`);
    errors++;
    continue;
  }

  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  perDeckDist[deck] = dist;

  for (const card of cards) {
    const id = card.id ?? '(no id)';
    const motifs = card.motifs;

    if (!Array.isArray(motifs)) {
      console.error(`ERROR  ${deck}.json ${id}: missing "motifs" array`);
      errors++;
      continue;
    }
    if (motifs.length > 3) {
      console.error(`ERROR  ${deck}.json ${id}: ${motifs.length} motifs, max is 3`);
      errors++;
    }
    if (dist[motifs.length] !== undefined) {
      dist[motifs.length]++;
    } else {
      // Shouldn't happen given the >3 check above, but count it rather than lose it.
      dist[motifs.length] = (dist[motifs.length] ?? 0) + 1;
    }
    for (const m of motifs) {
      if (!MOTIF_VOCAB.has(m)) {
        console.error(`ERROR  ${deck}.json ${id}: motif "${m}" is not in the A.2 vocabulary`);
        errors++;
      }
      motifCounts.set(m, (motifCounts.get(m) ?? 0) + 1);
    }

    if (card.weather !== undefined) {
      if (!WEATHER_VOCAB.has(card.weather)) {
        console.error(`ERROR  ${deck}.json ${id}: weather "${card.weather}" is not fog|rain|cold|clear|any`);
        errors++;
      }
    }

    if (deck === 'similes') {
      const gender = card.tags && card.tags.gender;
      if (!['m', 'f', 'any'].includes(gender)) {
        console.error(`ERROR  ${deck}.json ${id}: missing or invalid gender tag ("${gender}")`);
        errors++;
      }
    }
  }
}

console.log('');
console.log('Motif count per deck (0 / 1 / 2 / 3 motifs):');
for (const deck of DECKS) {
  const dist = perDeckDist[deck];
  if (!dist) continue;
  const total = dist[0] + dist[1] + dist[2] + dist[3];
  console.log(
    `  ${deck.padEnd(11)} total ${String(total).padStart(3)}  ` +
      `0:${String(dist[0]).padStart(3)}  1:${String(dist[1]).padStart(3)}  ` +
      `2:${String(dist[2]).padStart(3)}  3:${String(dist[3]).padStart(3)}`
  );
}

console.log('');
console.log('Top 15 motifs across similes/portraits/business/frames/utterances/find/dashiell:');
const top15 = [...motifCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [motif, count] of top15) {
  console.log(`  ${String(count).padStart(4)}  ${motif}`);
}

console.log('');
if (errors > 0) {
  console.log(`${errors} problem(s) found.`);
  process.exit(1);
} else {
  console.log('All clear: motifs are in vocabulary, weather values are valid, every simile has a gender.');
  process.exit(0);
}
