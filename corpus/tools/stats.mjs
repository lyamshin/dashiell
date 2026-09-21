#!/usr/bin/env node
// corpus/tools/stats.mjs — Phase B style measurements. Zero deps.
//
// Reads the fiction corpus (Hammett + Daly + Hecht = "core fiction", the
// stylistic donors) and the period corpus (WPA Guide minus its bibliography,
// + the three Evening World years with masthead noise skipped) and computes
// every measurement docs/03-corpus-and-style.md's Phase B section asks for.
// Lardner (You Know Me Al) is loaded too but reported separately, as a
// vernacular contrast rather than a stylistic donor — see docs/03.
//
// Usage: node corpus/tools/stats.mjs
// Writes corpus/derived/*.json and corpus/derived/*.txt.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const FICTION_DIR = path.join(ROOT, 'corpus', 'raw', 'fiction');
const PERIOD_DIR = path.join(ROOT, 'corpus', 'raw', 'period');
const OUT_DIR = path.join(ROOT, 'corpus', 'derived');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) so "200 random sentences" is reproducible.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSample(arr, n, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// ---------------------------------------------------------------------------
// Text loading, with the OCR caveats from corpus/NOTES.md applied.
// ---------------------------------------------------------------------------

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

// WPA Guide: drop the "Books About New York" bibliography section (flagged
// in corpus/NOTES.md as noisier OCR, and not descriptive prose we want
// mixed into period cadence/noun stats).
function loadWpaGuide() {
  const raw = readFile(path.join(PERIOD_DIR, 'wpa-guide-new-york-city-1939.txt'));
  const cut = raw.indexOf('\nBooks About New York\n');
  return cut === -1 ? raw : raw.slice(0, cut);
}

// Evening World files: each page is a block starting with a line
// "=== The Evening World (New York), YYYY-MM-DD, p. N — <url> ===".
// The masthead/nameplate line immediately following the header OCRs badly
// (corpus/NOTES.md) — skip the first one or two non-blank lines of each
// block before collecting body text.
function loadEveningWorld(file) {
  const raw = readFile(path.join(PERIOD_DIR, file));
  const lines = raw.split('\n');
  const kept = [];
  let skipRemaining = 0;
  for (const line of lines) {
    if (/^===.*===\s*$/.test(line.trim())) {
      skipRemaining = 2; // masthead line(s) immediately after the header
      continue;
    }
    if (line.trim() === '') {
      kept.push(line);
      continue;
    }
    if (skipRemaining > 0) {
      skipRemaining--;
      continue;
    }
    kept.push(line);
  }
  return kept.join('\n');
}

function loadPeriodCorpus() {
  const parts = {
    'wpa-guide-new-york-city-1939': loadWpaGuide(),
    'evening-world-1920': loadEveningWorld('evening-world-1920-selected-pages.txt'),
    'evening-world-1921': loadEveningWorld('evening-world-1921-selected-pages.txt'),
    'evening-world-1922': loadEveningWorld('evening-world-1922-selected-pages.txt'),
  };
  return parts;
}

function loadFictionCorpus() {
  // Hammett's four PD works are one stylistic voice; keep per-file stats too.
  const parts = {
    'hammett-red-harvest': readFile(path.join(FICTION_DIR, 'hammett-red-harvest-1929.txt')),
    'hammett-dain-curse': readFile(path.join(FICTION_DIR, 'hammett-dain-curse-1929.txt')),
    'hammett-maltese-falcon': readFile(path.join(FICTION_DIR, 'hammett-maltese-falcon-1930.txt')),
    'hammett-continental-op': readFile(path.join(FICTION_DIR, 'hammett-continental-op-stories-1923-1930.txt')),
    'daly-white-circle': readFile(path.join(FICTION_DIR, 'daly-white-circle-1926.txt')),
    'hecht-thousand-one-afternoons': readFile(path.join(FICTION_DIR, 'hecht-thousand-one-afternoons-chicago-1922.txt')),
  };
  return parts;
}

function loadLardner() {
  return readFile(path.join(FICTION_DIR, 'lardner-you-know-me-al-1916.txt'));
}

// ---------------------------------------------------------------------------
// Tokenization: paragraphs -> sentences -> words.
// ---------------------------------------------------------------------------

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'st', 'mt', 'sr', 'jr', 'prof', 'rev', 'gen',
  'col', 'capt', 'lt', 'sgt', 'no', 'vs', 'etc', 'inc', 'co', 'ave', 'blvd',
  'ft', 'in', 'e', 'w', 'n', 's', 'u.s', 'a.m', 'p.m', 'ph.d',
]);

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0 && /[a-zA-Z]{2,}/.test(p));
}

// Split a paragraph into sentences. Approximate: breaks on . ! ? (optionally
// followed by a closing quote) followed by whitespace and a capital letter,
// a quote, or an open-paren — but not after a known abbreviation or a single
// capital initial ("H. Jones").
function splitSentences(paragraph) {
  const sentences = [];
  let start = 0;
  const re = /([.!?]+["'”’]?)\s+(?=["'“‘]?[A-Z0-9(])/g;
  let m;
  while ((m = re.exec(paragraph))) {
    const end = m.index + m[1].length;
    const candidate = paragraph.slice(start, end).trim();
    const wordsBefore = candidate.split(/\s+/);
    const lastWord = wordsBefore[wordsBefore.length - 1] || '';
    const stripped = lastWord.replace(/[.!?"'”’]+$/, '').toLowerCase();
    const isAbbrev = ABBREVIATIONS.has(stripped) || /^[A-Z]$/.test(lastWord.replace(/\.$/, ''));
    if (isAbbrev && stripped.length <= 4) {
      continue; // don't break here; keep accumulating
    }
    sentences.push(candidate);
    start = end;
  }
  const tail = paragraph.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences.filter((s) => /[a-zA-Z]/.test(s));
}

function wordsOf(sentenceOrText) {
  const m = sentenceOrText.match(/[A-Za-z][A-Za-z'’\-]*/g);
  return m || [];
}

function wordCount(text) {
  return wordsOf(text).length;
}

// ---------------------------------------------------------------------------
// Finite-verb heuristic (for fragment detection).
// Zero-dep, no POS tagger: a sentence "has a finite verb" if it contains a
// token matching a broad hand-built list of common verb forms (base, -s,
// -ed, -ing, irregular past/participle) or an auxiliary contraction
// ('s/'re/'ve/'ll/'d/n't). This is a heuristic, not a parse — documented as
// such in docs/03-style-notes.md.
// ---------------------------------------------------------------------------
const VERB_STEMS = [
  'be', 'is', 'was', 'were', 'am', 'are', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  'say', 'said', 'says', 'saying',
  'go', 'goes', 'went', 'gone', 'going',
  'get', 'gets', 'got', 'gotten', 'getting',
  'make', 'makes', 'made', 'making',
  'know', 'knows', 'knew', 'known', 'knowing',
  'think', 'thinks', 'thought', 'thinking',
  'take', 'takes', 'took', 'taken', 'taking',
  'see', 'sees', 'saw', 'seen', 'seeing',
  'come', 'comes', 'came', 'coming',
  'want', 'wants', 'wanted', 'wanting',
  'look', 'looks', 'looked', 'looking',
  'give', 'gives', 'gave', 'given', 'giving',
  'use', 'uses', 'used', 'using',
  'find', 'finds', 'found', 'finding',
  'tell', 'tells', 'told', 'telling',
  'ask', 'asks', 'asked', 'asking',
  'work', 'works', 'worked', 'working',
  'seem', 'seems', 'seemed', 'seeming',
  'feel', 'feels', 'felt', 'feeling',
  'try', 'tries', 'tried', 'trying',
  'leave', 'leaves', 'left', 'leaving',
  'call', 'calls', 'called', 'calling',
  'put', 'puts', 'putting',
  'mean', 'means', 'meant', 'meaning',
  'keep', 'keeps', 'kept', 'keeping',
  'let', 'lets', 'letting',
  'begin', 'begins', 'began', 'begun', 'beginning',
  'show', 'shows', 'showed', 'shown', 'showing',
  'hear', 'hears', 'heard', 'hearing',
  'play', 'plays', 'played', 'playing',
  'run', 'runs', 'ran', 'running',
  'move', 'moves', 'moved', 'moving',
  'like', 'likes', 'liked', 'liking',
  'live', 'lives', 'lived', 'living',
  'believe', 'believes', 'believed', 'believing',
  'bring', 'brings', 'brought', 'bringing',
  'happen', 'happens', 'happened', 'happening',
  'write', 'writes', 'wrote', 'written', 'writing',
  'stand', 'stands', 'stood', 'standing',
  'lose', 'loses', 'lost', 'losing',
  'pay', 'pays', 'paid', 'paying',
  'meet', 'meets', 'met', 'meeting',
  'lead', 'leads', 'led', 'leading',
  'walk', 'walks', 'walked', 'walking',
  'turn', 'turns', 'turned', 'turning',
  'start', 'starts', 'started', 'starting',
  'stop', 'stops', 'stopped', 'stopping',
  'sit', 'sits', 'sat', 'sitting',
  'stay', 'stays', 'stayed', 'staying',
  'watch', 'watches', 'watched', 'watching',
  'open', 'opens', 'opened', 'opening',
  'close', 'closes', 'closed', 'closing',
  'reach', 'reaches', 'reached', 'reaching',
  'pull', 'pulls', 'pulled', 'pulling',
  'push', 'pushes', 'pushed', 'pushing',
  'drop', 'drops', 'dropped', 'dropping',
  'pick', 'picks', 'picked', 'picking',
  'answer', 'answers', 'answered', 'answering',
  'wait', 'waits', 'waited', 'waiting',
  'set', 'sets', 'setting',
  'talk', 'talks', 'talked', 'talking',
  'grin', 'grins', 'grinned', 'grinning',
  'nod', 'nods', 'nodded', 'nodding',
  'shrug', 'shrugs', 'shrugged', 'shrugging',
  'smile', 'smiles', 'smiled', 'smiling',
  'light', 'lights', 'lit', 'lighting',
  'lit',
  'drive', 'drives', 'drove', 'driven', 'driving',
  'read', 'reads', 'reading',
  'break', 'breaks', 'broke', 'broken', 'breaking',
  'throw', 'throws', 'threw', 'thrown', 'throwing',
  'shoot', 'shoots', 'shot', 'shooting',
  'kill', 'kills', 'killed', 'killing',
  'die', 'dies', 'died', 'dying',
  'sleep', 'sleeps', 'slept', 'sleeping',
  'wake', 'wakes', 'woke', 'woken', 'waking',
  'send', 'sends', 'sent', 'sending',
  'wonder', 'wonders', 'wondered', 'wondering',
  'grab', 'grabs', 'grabbed', 'grabbing',
  'hold', 'holds', 'held', 'holding',
  'point', 'points', 'pointed', 'pointing',
  'lean', 'leans', 'leaned', 'leaning',
  'step', 'steps', 'stepped', 'stepping',
  'wear', 'wears', 'wore', 'worn', 'wearing',
  'burn', 'burns', 'burned', 'burnt', 'burning',
  'cross', 'crosses', 'crossed', 'crossing',
  'need', 'needs', 'needed', 'needing',
  'wish', 'wishes', 'wished', 'wishing',
  'laugh', 'laughs', 'laughed', 'laughing',
  'cry', 'cries', 'cried', 'crying',
  'drink', 'drinks', 'drank', 'drunk', 'drinking',
  'eat', 'eats', 'ate', 'eaten', 'eating',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
];
const VERB_SET = new Set(VERB_STEMS);
const AUX_CONTRACTIONS = /(n't|'s|'re|'ve|'ll|'d|'m)$/i;

function hasFiniteVerb(sentence) {
  const words = wordsOf(sentence);
  for (const w of words) {
    const lower = w.toLowerCase();
    if (VERB_SET.has(lower)) return true;
    if (AUX_CONTRACTIONS.test(w)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Simile detection.
// ---------------------------------------------------------------------------
const SIMILE_PATTERNS = [
  /\blike a\b/i,
  /\blike an\b/i,
  /\blike the\b/i,
  /\bas a\b/i,
  /\bas if\b/i,
  /\bthe way a\b/i,
];
function isSimileSentence(sentence) {
  return SIMILE_PATTERNS.some((re) => re.test(sentence));
}

// ---------------------------------------------------------------------------
// Dialogue detection.
// ---------------------------------------------------------------------------
function hasQuote(sentence) {
  return /["“”]/.test(sentence);
}

const DIALOGUE_TAG_RE =
  /["”’']\s*,?\s*(he|she|I|they|we|it)?\s*(said|asked|cried|muttered|snapped|growled|whispered|replied|answered|shouted|demanded|murmured|grunted|sneered|drawled|laughed|went on|added|put in|broke in|told|called|said)/i;

function dialogueTagVerb(sentence) {
  const m = sentence.match(/["”’']\s*,?\s*(?:\w+\s+){0,2}?(said|asked|cried|muttered|snapped|growled|whispered|replied|answered|shouted|demanded|murmured|grunted|sneered|drawled|added|put in|broke in|told|called)\b/i);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  return verb === 'said' ? 'said' : 'other';
}

// ---------------------------------------------------------------------------
// Description-target tagging.
// ---------------------------------------------------------------------------
const DESCRIPTION_TARGETS = {
  face: ['face', 'faces', 'eyes', 'eye', 'cheek', 'cheeks', 'jaw', 'chin', 'brow', 'brows', 'forehead', 'mouth', 'lips', 'nose', 'complexion'],
  hands: ['hand', 'hands', 'finger', 'fingers', 'knuckles', 'fist', 'fists', 'palm', 'thumb', 'nails'],
  clothes: ['coat', 'hat', 'suit', 'dress', 'shoes', 'collar', 'tie', 'vest', 'gloves', 'overcoat', 'trousers', 'jacket', 'shirt', 'cuffs', 'stockings'],
  room: ['room', 'wall', 'walls', 'window', 'windows', 'floor', 'ceiling', 'door', 'lamp', 'desk', 'chair', 'table', 'rug', 'curtains', 'sofa'],
  street: ['street', 'streets', 'avenue', 'sidewalk', 'curb', 'alley', 'block', 'corner', 'gutter', 'pavement'],
  weather: ['rain', 'fog', 'snow', 'wind', 'heat', 'cold', 'sun', 'sunlight', 'drizzle', 'storm', 'mist'],
  drink: ['whiskey', 'gin', 'rye', 'beer', 'glass', 'bottle', 'bar', 'scotch', 'drink', 'drinks', 'cocktail', 'brandy'],
  money: ['dollar', 'dollars', 'grand', 'buck', 'bucks', 'cash', 'bill', 'bills', 'check', 'money', 'cent', 'cents'],
  weapon: ['gun', 'guns', 'pistol', 'revolver', 'knife', 'blackjack', 'automatic', 'rod', 'trigger', 'barrel'],
  voice: ['voice', 'tone', 'whisper', 'growl', 'drawl', 'murmur', 'accent', 'tones'],
};
function targetsInSentence(sentence) {
  const words = new Set(wordsOf(sentence).map((w) => w.toLowerCase()));
  const hits = [];
  for (const [target, keywords] of Object.entries(DESCRIPTION_TARGETS)) {
    if (keywords.some((k) => words.has(k))) hits.push(target);
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Noun-ish content word extraction (heuristic, for the concrete noun bank).
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(`
a an the and or but if of to in on at by for with from as is was were are
be been being have has had do does did not no nor so than then that this
these those he she it they we i you him her them his hers its their our
your my me us who whom whose which what when where why how all any both
each few more most other some such only own same just very can will would
could should shall may might must there here up down out off over under
again further once too very s t d ll m re ve don now
`.trim().split(/\s+/));

// Common adverbs, indefinite pronouns, and predicate adjectives that survive
// the STOPWORDS/VERB_SET filters but are not nouns. Hand-curated from a
// first pass's output (see docs/03-style-notes.md).
const NON_NOUN_EXTRA = new Set(`
right away much yes yeah no nothing anything something everything someone
somebody anyone everyone back before after again still even well too quite
rather almost already always never ever maybe perhaps probably certainly
indeed however though although because while until unless since whether
either neither both several various certain sure true false real whole
entire half fine bad good great little big small large long short old new
pretty enough many more most much less least own such same many tho
here there now then today tomorrow yesterday
`.trim().split(/\s+/));

function isNounish(word) {
  const lower = word.toLowerCase();
  if (lower.length < 3) return false;
  if (STOPWORDS.has(lower)) return false;
  if (VERB_SET.has(lower)) return false;
  if (NON_NOUN_EXTRA.has(lower)) return false;
  if (lower.endsWith('ly')) return false; // adverb
  if (/^(he|she|they|it|we|i|you)$/.test(lower)) return false;
  if (!/^[a-z][a-z'-]*$/.test(lower)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Per-corpus analysis.
// ---------------------------------------------------------------------------
function analyzeText(text) {
  const paragraphs = splitParagraphs(text);
  const sentenceLengths = [];
  const paragraphSentenceCounts = [];
  let fragments = 0;
  let totalSentences = 0;
  let quotedSentences = 0;
  let simileSentences = [];
  let tagSaid = 0;
  let tagOther = 0;
  const descriptionCounts = Object.fromEntries(Object.keys(DESCRIPTION_TARGETS).map((k) => [k, 0]));
  let longThenShort = 0;
  let longSentences = 0;
  const nounFreq = new Map();
  let totalWords = 0;

  for (const para of paragraphs) {
    const sentences = splitSentences(para);
    paragraphSentenceCounts.push(sentences.length);
    let prevLen = null;
    for (const sent of sentences) {
      const words = wordsOf(sent);
      const len = words.length;
      if (len === 0) continue;
      totalSentences++;
      sentenceLengths.push(len);
      totalWords += len;
      if (!hasFiniteVerb(sent)) fragments++;
      if (hasQuote(sent)) quotedSentences++;
      if (isSimileSentence(sent)) simileSentences.push(sent);
      const tag = dialogueTagVerb(sent);
      if (tag === 'said') tagSaid++;
      else if (tag === 'other') tagOther++;
      for (const target of targetsInSentence(sent)) {
        descriptionCounts[target]++;
      }
      if (prevLen !== null && prevLen > 25 && len < 8) longThenShort++;
      if (len > 25) longSentences++;
      prevLen = len;
      for (const w of words) {
        if (isNounish(w)) {
          const lower = w.toLowerCase();
          nounFreq.set(lower, (nounFreq.get(lower) || 0) + 1);
        }
      }
    }
  }

  sentenceLengths.sort((a, b) => a - b);
  return {
    totalWords,
    totalSentences,
    totalParagraphs: paragraphs.length,
    sentenceLengths,
    paragraphSentenceCounts,
    fragments,
    quotedSentences,
    simileSentences,
    tagSaid,
    tagOther,
    descriptionCounts,
    longThenShort,
    longSentences,
    nounFreq,
  };
}

function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.max(0, Math.ceil((p / 100) * sortedArr.length) - 1));
  return sortedArr[idx];
}
function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function median(sortedArr) {
  if (!sortedArr.length) return 0;
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

function summarize(name, a) {
  const sl = a.sentenceLengths;
  return {
    name,
    totalWords: a.totalWords,
    totalSentences: a.totalSentences,
    totalParagraphs: a.totalParagraphs,
    sentenceLength: {
      mean: round2(mean(sl)),
      median: median(sl),
      p10: percentile(sl, 10),
      p90: percentile(sl, 90),
    },
    fragmentRate: round4(a.fragments / a.totalSentences),
    paragraphLength: {
      meanSentences: round2(mean(a.paragraphSentenceCounts)),
      medianSentences: median([...a.paragraphSentenceCounts].sort((x, y) => x - y)),
    },
    simileRatePer1000Words: round3((a.simileSentences.length / a.totalWords) * 1000),
    simileCount: a.simileSentences.length,
    dialogueRatio: round4(a.quotedSentences / a.totalSentences),
    dialogueTags: {
      said: a.tagSaid,
      other: a.tagOther,
      saidShare: a.tagSaid + a.tagOther > 0 ? round4(a.tagSaid / (a.tagSaid + a.tagOther)) : null,
    },
    descriptionTargetsPer1000Words: Object.fromEntries(
      Object.entries(a.descriptionCounts).map(([k, v]) => [k, round3((v / a.totalWords) * 1000)])
    ),
    longThenShortRate: round4(a.longSentences > 0 ? a.longThenShort / a.longSentences : 0),
    longSentenceCount: a.longSentences,
    longThenShortCount: a.longThenShort,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round3(n) { return Math.round(n * 1000) / 1000; }
function round4(n) { return Math.round(n * 10000) / 10000; }

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
function combineNounFreq(maps) {
  const combined = new Map();
  for (const m of maps) {
    for (const [k, v] of m) combined.set(k, (combined.get(k) || 0) + v);
  }
  return combined;
}

function topFreqBank(fictionFreq, fictionWords, periodFreq, periodWords, minCount = 5) {
  // Words appearing in fiction at >=3x their per-word rate in period, and
  // vice versa. Minimum absolute count filters OCR noise / one-offs.
  const fictionOver = [];
  const periodOver = [];
  const vocab = new Set([...fictionFreq.keys(), ...periodFreq.keys()]);
  for (const word of vocab) {
    const fc = fictionFreq.get(word) || 0;
    const pc = periodFreq.get(word) || 0;
    const fRate = fc / fictionWords;
    const pRate = pc / periodWords;
    if (fc >= minCount && fRate >= pRate * 3 && pc < fc) {
      fictionOver.push({ word, fictionCount: fc, periodCount: pc, ratio: pRate > 0 ? round2(fRate / pRate) : null });
    }
    if (pc >= minCount && pRate >= fRate * 3 && fc < pc) {
      periodOver.push({ word, fictionCount: fc, periodCount: pc, ratio: fRate > 0 ? round2(pRate / fRate) : null });
    }
  }
  fictionOver.sort((a, b) => b.fictionCount - a.fictionCount);
  periodOver.sort((a, b) => b.periodCount - a.periodCount);
  return { fictionOver, periodOver };
}

function main() {
  console.log('Loading corpora...');
  const fictionParts = loadFictionCorpus();
  const periodParts = loadPeriodCorpus();
  const lardnerText = loadLardner();

  console.log('Analyzing fiction works...');
  const fictionAnalyses = {};
  for (const [name, text] of Object.entries(fictionParts)) {
    fictionAnalyses[name] = analyzeText(text);
  }

  console.log('Analyzing period works...');
  const periodAnalyses = {};
  for (const [name, text] of Object.entries(periodParts)) {
    periodAnalyses[name] = analyzeText(text);
  }

  console.log('Analyzing Lardner (contrast reference)...');
  const lardnerAnalysis = analyzeText(lardnerText);

  // Aggregate fiction (Hammett + Daly + Hecht = the stylistic donor corpus).
  const fictionCombinedText = Object.values(fictionParts).join('\n\n');
  const fictionCombined = analyzeText(fictionCombinedText);
  const periodCombinedText = Object.values(periodParts).join('\n\n');
  const periodCombined = analyzeText(periodCombinedText);

  const perWork = {};
  for (const [name, a] of Object.entries(fictionAnalyses)) perWork[name] = summarize(name, a);
  const perPeriodWork = {};
  for (const [name, a] of Object.entries(periodAnalyses)) perPeriodWork[name] = summarize(name, a);

  const fictionSummary = summarize('fiction-combined (Hammett+Daly+Hecht)', fictionCombined);
  const periodSummary = summarize('period-combined (WPA+Evening World)', periodCombined);
  const lardnerSummary = summarize('lardner-contrast (You Know Me Al)', lardnerAnalysis);

  // Concrete noun bank: fiction combined vs period combined.
  const { fictionOver, periodOver } = topFreqBank(
    fictionCombined.nounFreq, fictionCombined.totalWords,
    periodCombined.nounFreq, periodCombined.totalWords,
    5
  );

  // Simile sample: 200 random simile sentences from the fiction corpus.
  const rng = mulberry32(20260921); // today's date as seed, for reproducibility
  const allSimiles = fictionCombined.simileSentences;
  const sampleCount = Math.min(200, allSimiles.length);
  const sample = shuffleSample(allSimiles, sampleCount, rng);

  // --- Write outputs ---
  fs.writeFileSync(
    path.join(OUT_DIR, 'similes-sample.txt'),
    `# ${sampleCount} random simile sentences, sampled from the fiction corpus\n` +
    `# (Hammett + Daly + Hecht; seed 20260921). For reading, not quoting verbatim.\n\n` +
    sample.map((s, i) => `${i + 1}. ${s}`).join('\n\n') + '\n'
  );

  fs.writeFileSync(
    path.join(OUT_DIR, 'concrete-nouns-fiction-over-period.txt'),
    '# Words at >=3x their per-word rate in fiction vs. period corpus (min count 5)\n' +
    '# word\tfictionCount\tperiodCount\tratio\n' +
    fictionOver.map((r) => `${r.word}\t${r.fictionCount}\t${r.periodCount}\t${r.ratio}`).join('\n') + '\n'
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'concrete-nouns-period-over-fiction.txt'),
    '# Words at >=3x their per-word rate in period vs. fiction corpus (min count 5)\n' +
    '# word\tfictionCount\tperiodCount\tratio\n' +
    periodOver.map((r) => `${r.word}\t${r.fictionCount}\t${r.periodCount}\t${r.ratio}`).join('\n') + '\n'
  );

  const report = {
    generatedAt: new Date().toISOString(),
    fiction: {
      combined: fictionSummary,
      perWork,
    },
    period: {
      combined: periodSummary,
      perWork: perPeriodWork,
    },
    lardnerContrast: lardnerSummary,
    conreteNounBank: {
      fictionOverPeriodCount: fictionOver.length,
      periodOverFictionCount: periodOver.length,
      note: 'Full lists in concrete-nouns-fiction-over-period.txt and concrete-nouns-period-over-fiction.txt',
      topFictionOverPeriod: fictionOver.slice(0, 40),
      topPeriodOverFiction: periodOver.slice(0, 40),
    },
    methodologyNotes: [
      'Sentence splitting is regex-based (sentence-ender + whitespace + capital/quote/digit), with a short abbreviation list (Mr., Dr., St., etc.) to avoid false breaks. Approximate, not a parser.',
      'Fragment detection ("no finite verb") is a heuristic: a sentence counts as having a finite verb if it contains a token from a ~250-form hand-built list of common verb inflections (be/have/do/modals + ~90 common verb stems in base/-s/-ed/-ing/irregular forms) or an auxiliary contraction ("\'s", "\'re", "n\'t", etc). No POS tagger; zero deps per spec.',
      'Concrete noun bank uses a stopword+heuristic filter (excludes function words and known verb forms, drops -ly adverbs) rather than true POS tagging, so some adjectives/participles leak through both lists. Spot-check before using verbatim.',
      'Dialogue ratio counts sentences containing any quotation mark, which over-counts sentences that merely quote a name or title; treat as an upper bound.',
      'Period corpus excludes the WPA Guide\'s "Books About New York" bibliography section (noisy OCR, not descriptive prose) and skips the first two lines of each Evening World page block (masthead OCR noise) — see corpus/NOTES.md.',
    ],
  };

  fs.writeFileSync(path.join(OUT_DIR, 'stats.json'), JSON.stringify(report, null, 2) + '\n');

  console.log('Done. Wrote corpus/derived/stats.json, similes-sample.txt, concrete-nouns-*.txt');
  console.log('\n--- Fiction (Hammett+Daly+Hecht) summary ---');
  console.log(JSON.stringify(fictionSummary, null, 2));
  console.log('\n--- Period (WPA+Evening World) summary ---');
  console.log(JSON.stringify(periodSummary, null, 2));
  console.log('\n--- Lardner contrast summary ---');
  console.log(JSON.stringify(lardnerSummary, null, 2));
}

main();
