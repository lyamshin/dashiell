#!/usr/bin/env node
// corpus/tools/overlap.mjs — flags any run of 5+ consecutive words shared
// between a card's `text` and any corpus file. Zero deps.
//
// Usage: node corpus/tools/overlap.mjs [content/decks/*.json ...]
// With no arguments, checks every file in content/decks/.
// Exit code 0 = clean (no hits). Exit code 1 = at least one hit found.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const FICTION_DIR = path.join(ROOT, 'corpus', 'raw', 'fiction');
const PERIOD_DIR = path.join(ROOT, 'corpus', 'raw', 'period');
const DECKS_DIR = path.join(ROOT, 'content', 'decks');

const N = 5; // minimum run length that counts as an overlap

function wordsOf(text) {
  const m = text.match(/[A-Za-z][A-Za-z'’]*/g);
  return m ? m.map((w) => w.toLowerCase().replace(/[’]/g, "'")) : [];
}

function listCorpusFiles() {
  const files = [];
  for (const dir of [FICTION_DIR, PERIOD_DIR]) {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.txt')) files.push(path.join(dir, f));
    }
  }
  return files;
}

// Build a Set of every N-word run in the corpus, as "w1 w2 w3 w4 w5" keys.
// A single Set across ~1.1M corpus words is fine memory-wise (a few hundred
// MB of short strings) and gives O(1) lookup per card n-gram.
function buildCorpusNgramIndex(files) {
  const index = new Set();
  let totalWords = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const words = wordsOf(text);
    totalWords += words.length;
    for (let i = 0; i + N <= words.length; i++) {
      index.add(words.slice(i, i + N).join(' '));
    }
  }
  return { index, totalWords };
}

function findOverlaps(text, index) {
  const words = wordsOf(text);
  const hits = [];
  for (let i = 0; i + N <= words.length; i++) {
    const gram = words.slice(i, i + N).join(' ');
    if (index.has(gram)) {
      // extend the run as far as it still matches, to report the full span
      let end = i + N;
      while (end < words.length) {
        const extended = words.slice(i, end + 1).join(' ');
        // check if this longer run still has a 5-word window fully inside the corpus
        // (cheap approximate extension: just check the trailing 5-gram)
        const trailing = words.slice(end - N + 1, end + 1).join(' ');
        if (index.has(trailing)) {
          end++;
        } else {
          break;
        }
      }
      hits.push({ start: i, end, run: words.slice(i, end).join(' ') });
      i = end - 1; // skip ahead past this run
    }
  }
  return hits;
}

function main() {
  const args = process.argv.slice(2);
  const deckFiles = args.length
    ? args.map((a) => path.resolve(a))
    : fs.readdirSync(DECKS_DIR).filter((f) => f.endsWith('.json')).map((f) => path.join(DECKS_DIR, f));

  console.log('Building corpus 5-gram index...');
  const corpusFiles = listCorpusFiles();
  const { index, totalWords } = buildCorpusNgramIndex(corpusFiles);
  console.log(`Indexed ${totalWords} words across ${corpusFiles.length} corpus files (${index.size} distinct 5-grams).`);

  let totalCards = 0;
  let totalHits = 0;
  const report = [];

  for (const deckFile of deckFiles) {
    const cards = JSON.parse(fs.readFileSync(deckFile, 'utf8'));
    for (const card of cards) {
      totalCards++;
      const hits = findOverlaps(card.text, index);
      if (hits.length) {
        totalHits += hits.length;
        report.push({ deck: path.basename(deckFile), id: card.id, text: card.text, hits });
      }
    }
  }

  console.log(`\nChecked ${totalCards} cards across ${deckFiles.length} deck file(s).`);
  if (totalHits === 0) {
    console.log('CLEAN: zero runs of 5+ consecutive words shared with the corpus.');
    process.exit(0);
  } else {
    console.log(`FAIL: ${totalHits} overlapping run(s) found in ${report.length} card(s):\n`);
    for (const r of report) {
      console.log(`  [${r.deck} ${r.id}] "${r.text}"`);
      for (const h of r.hits) {
        console.log(`      -> shared run (${h.end - h.start} words): "${h.run}"`);
      }
    }
    process.exit(1);
  }
}

main();
