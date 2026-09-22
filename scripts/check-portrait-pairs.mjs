#!/usr/bin/env node
/**
 * Check content/decks/portrait-pairs.json (Hone 1, Track C).
 *
 * This deck is not yet registered in content/deck-schema.json (Track B owns
 * that file and adds the entry when the branches merge), so this script
 * hardcodes the Track C shape from docs/12-hone-1.md instead of reading the
 * shared schema. Once the deck is registered, scripts/validate-decks.mjs
 * should be able to check it too; until then this is the standalone check.
 *
 * Verifies, per card:
 *   - the six top-level fields are present and nothing else: id, deck, text,
 *     recall, tags, motifs, status
 *   - id matches ^pp-\d{3}$ and is unique; deck === "portrait-pairs"
 *   - tags.gender in {m, f, any}; tags.class in {money, working, underworld,
 *     professional}; tags.ageBand in {young, middle, old, any};
 *     tags.setting in {office, anywhere}
 *   - motifs is an array of 0-3 entries, each in content/motifs.json's
 *     vocabulary
 *   - recall is a 3-5 word noun phrase (no slot tokens, no terminal
 *     punctuation)
 *   - text uses only the five allowed slot tokens ({He} {he} {his} {him}
 *     {name}), any {He}/{he}/{his}/{him} at a sentence start is spelled
 *     {He} (capitalized), and no slot token appears with any other spelling
 *     or case
 *   - text has no bare "like a/an/the", "as if", "as though" (the deck's
 *     no-similes rule) and no digit-colon-digit clock times (the golden's
 *     spoken-clock rule extended on principle, though portraits rarely name
 *     a time at all)
 *   - text and recall are each unique across the deck (never the same
 *     detail twice)
 *
 * Then reports the distribution: cards per class band, gender, ageBand,
 * setting, and the top motifs used.
 *
 * Node, zero dependencies.
 *
 *   node scripts/check-portrait-pairs.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DECK_PATH = join(ROOT, 'content', 'decks', 'portrait-pairs.json');
const MOTIFS_PATH = join(ROOT, 'content', 'motifs.json');

const ALLOWED_TOP_FIELDS = ['id', 'deck', 'text', 'recall', 'tags', 'motifs', 'status'];
const GENDER_VALUES = new Set(['m', 'f', 'any']);
const CLASS_VALUES = new Set(['money', 'working', 'underworld', 'professional']);
const AGE_VALUES = new Set(['young', 'middle', 'old', 'any']);
const SETTING_VALUES = new Set(['office', 'anywhere']);
const STATUS_VALUES = new Set(['generated', 'kept', 'tuned', 'cut', 'placeholder']);
const ALLOWED_SLOTS = ['{He}', '{he}', '{his}', '{him}', '{name}'];

const motifsDoc = JSON.parse(readFileSync(MOTIFS_PATH, 'utf8'));
const MOTIF_VOCAB = new Set(Object.values(motifsDoc.groups ?? {}).flat());

let cards;
try {
  cards = JSON.parse(readFileSync(DECK_PATH, 'utf8'));
} catch (err) {
  console.error(`ERROR reading ${DECK_PATH}: ${err.message}`);
  process.exit(1);
}

let errors = 0;
const seenIds = new Set();
const seenTexts = new Set();
const seenRecalls = new Set();

const SIMILE_RE = /\bas if\b|\bas though\b|\blike a\b|\blike an\b|\blike the\b/i;
const CLOCK_RE = /\b\d{1,2}:\d{2}\s*(?:[AP]M)?\b/i;
// Any {word} token in the text, to catch a misspelled or unsupported slot.
const SLOT_TOKEN_RE = /\{[A-Za-z]+\}/g;
// A he/his/him/name slot sitting right after sentence-ending punctuation (or
// at the very start of the string) must be the capitalized {He} form.
const SENTENCE_START_LOWER_RE = /(^|[.!?]\s+)\{(he|his|him)\}/;
// A capitalized {He} token that is NOT at a sentence start is a
// capitalization bug (mid-sentence "He" reads as a stray capital).
function heNotAtSentenceStart(text) {
  const bad = [];
  for (const m of text.matchAll(/\{He\}/g)) {
    const start = m.index;
    if (start === 0) continue;
    const prefix = text.slice(0, start);
    if (/[.!?]\s*$/.test(prefix)) continue;
    bad.push(start);
  }
  return bad;
}

const distClass = {};
const distGender = {};
const distAge = {};
const distSetting = {};
const motifCounts = new Map();
let anyGenderCount = 0;
let officeCount = 0;

for (const card of cards) {
  const id = card.id ?? '(no id)';

  // ---- top-level shape ----
  const extraFields = Object.keys(card).filter((k) => !ALLOWED_TOP_FIELDS.includes(k));
  if (extraFields.length) {
    console.error(`ERROR ${id}: unexpected field(s) ${extraFields.join(', ')}`);
    errors++;
  }
  for (const f of ALLOWED_TOP_FIELDS) {
    if (!(f in card)) {
      console.error(`ERROR ${id}: missing field "${f}"`);
      errors++;
    }
  }

  if (!/^pp-\d{3}$/.test(card.id ?? '')) {
    console.error(`ERROR ${id}: id must match pp-NNN`);
    errors++;
  }
  if (seenIds.has(card.id)) {
    console.error(`ERROR ${id}: duplicate id`);
    errors++;
  }
  seenIds.add(card.id);

  if (card.deck !== 'portrait-pairs') {
    console.error(`ERROR ${id}: deck must be "portrait-pairs", got "${card.deck}"`);
    errors++;
  }

  if (card.status && !STATUS_VALUES.has(card.status)) {
    console.error(`ERROR ${id}: invalid status "${card.status}"`);
    errors++;
  }

  // ---- tags ----
  const tags = card.tags ?? {};
  if (!GENDER_VALUES.has(tags.gender)) {
    console.error(`ERROR ${id}: invalid tags.gender "${tags.gender}"`);
    errors++;
  } else {
    if (tags.gender === 'any') anyGenderCount++;
  }
  if (!CLASS_VALUES.has(tags.class)) {
    console.error(`ERROR ${id}: invalid tags.class "${tags.class}"`);
    errors++;
  }
  if (!AGE_VALUES.has(tags.ageBand)) {
    console.error(`ERROR ${id}: invalid tags.ageBand "${tags.ageBand}"`);
    errors++;
  }
  if (!SETTING_VALUES.has(tags.setting)) {
    console.error(`ERROR ${id}: invalid tags.setting "${tags.setting}"`);
    errors++;
  } else if (tags.setting === 'office') {
    officeCount++;
  }

  distClass[tags.class] = (distClass[tags.class] ?? 0) + 1;
  distGender[tags.gender] = (distGender[tags.gender] ?? 0) + 1;
  distAge[tags.ageBand] = (distAge[tags.ageBand] ?? 0) + 1;
  distSetting[tags.setting] = (distSetting[tags.setting] ?? 0) + 1;

  // ---- motifs ----
  const motifs = card.motifs;
  if (!Array.isArray(motifs)) {
    console.error(`ERROR ${id}: motifs must be an array`);
    errors++;
  } else {
    if (motifs.length > 3) {
      console.error(`ERROR ${id}: ${motifs.length} motifs, max is 3`);
      errors++;
    }
    for (const m of motifs) {
      if (!MOTIF_VOCAB.has(m)) {
        console.error(`ERROR ${id}: motif "${m}" is not in content/motifs.json`);
        errors++;
      }
      motifCounts.set(m, (motifCounts.get(m) ?? 0) + 1);
    }
  }

  // ---- text: slot spelling ----
  const text = card.text ?? '';
  for (const tok of text.match(SLOT_TOKEN_RE) ?? []) {
    if (!ALLOWED_SLOTS.includes(tok)) {
      console.error(`ERROR ${id}: unsupported slot token "${tok}" (allowed: ${ALLOWED_SLOTS.join(' ')})`);
      errors++;
    }
  }
  if (SENTENCE_START_LOWER_RE.test(text)) {
    console.error(`ERROR ${id}: a he/his/him slot opens a sentence in lowercase form`);
    errors++;
  }
  const strayCapitals = heNotAtSentenceStart(text);
  if (strayCapitals.length) {
    console.error(`ERROR ${id}: {He} used mid-sentence (should be {he}) at offset(s) ${strayCapitals.join(',')}`);
    errors++;
  }

  // ---- text: no similes, no clock digits ----
  if (SIMILE_RE.test(text)) {
    console.error(`ERROR ${id}: text contains a banned simile marker`);
    errors++;
  }
  if (CLOCK_RE.test(text)) {
    console.error(`ERROR ${id}: text contains a numeric clock time`);
    errors++;
  }
  if (/\bhimself\b|\bherself\b/i.test(text)) {
    console.error(`ERROR ${id}: text uses a reflexive pronoun with no matching slot`);
    errors++;
  }

  // ---- text/recall uniqueness ----
  if (seenTexts.has(text)) {
    console.error(`ERROR ${id}: duplicate text (same detail used twice)`);
    errors++;
  }
  seenTexts.add(text);

  // ---- recall shape ----
  const recall = card.recall ?? '';
  const recallWords = recall.trim().split(/\s+/).filter(Boolean);
  if (recallWords.length < 3 || recallWords.length > 5) {
    console.error(`ERROR ${id}: recall "${recall}" is ${recallWords.length} words, want 3-5`);
    errors++;
  }
  if (/[{}]/.test(recall)) {
    console.error(`ERROR ${id}: recall "${recall}" contains a slot token`);
    errors++;
  }
  if (/[.!?]$/.test(recall.trim())) {
    console.error(`ERROR ${id}: recall "${recall}" ends in terminal punctuation`);
    errors++;
  }
  if (seenRecalls.has(recall)) {
    console.error(`ERROR ${id}: duplicate recall "${recall}"`);
    errors++;
  }
  seenRecalls.add(recall);
}

// ---- deck-level counts from the Track C brief ----
if (cards.length !== 120) {
  console.error(`ERROR: deck has ${cards.length} cards, want 120`);
  errors++;
}
const wantClass = { money: 40, working: 40, underworld: 20, professional: 20 };
for (const [cls, want] of Object.entries(wantClass)) {
  if ((distClass[cls] ?? 0) !== want) {
    console.error(`ERROR: class "${cls}" has ${distClass[cls] ?? 0} cards, want ${want}`);
    errors++;
  }
}
if (officeCount < 30) {
  console.error(`ERROR: only ${officeCount} cards have setting "office", want at least 30`);
  errors++;
}
if (anyGenderCount < 25) {
  console.error(`ERROR: only ${anyGenderCount} cards have gender "any", want at least 25`);
  errors++;
}

// ---------------------------------------------------------------- report
console.log('');
console.log(`Checked ${cards.length} cards in content/decks/portrait-pairs.json`);
console.log('');
console.log('By class:', JSON.stringify(distClass));
console.log('By gender:', JSON.stringify(distGender), `(gender:any = ${anyGenderCount}, want >= 25)`);
console.log('By ageBand:', JSON.stringify(distAge));
console.log('By setting:', JSON.stringify(distSetting), `(office = ${officeCount}, want >= 30)`);
console.log('');
console.log('Motifs used (count, motif):');
const sortedMotifs = [...motifCounts.entries()].sort((a, b) => b[1] - a[1]);
for (const [motif, count] of sortedMotifs) {
  console.log(`  ${String(count).padStart(3)}  ${motif}`);
}
console.log(`  (${cards.filter((c) => (c.motifs ?? []).length === 0).length} cards carry zero motifs)`);

console.log('');
if (errors > 0) {
  console.log(`${errors} problem(s) found.`);
  process.exit(1);
} else {
  console.log('All clear: shape, tags, motifs, recall length, slot spelling, and deck-level distribution all pass.');
  process.exit(0);
}
