/**
 * The voice kit's script (model/voice/README.md): about an hour of lines for
 * the designer to read aloud, in sittings, so a small local TTS model
 * (Piper-style: 22,050 Hz mono, one clip a line) can be fine-tuned on his
 * voice as the book's narrator.
 *
 *   npx tsx scripts/voice-script.ts             # writes model/voice/script.json and script.md
 *   npx tsx scripts/voice-script.ts --out DIR   # somewhere else
 *   npx tsx scripts/voice-script.ts --dry       # the counts and the coverage, nothing written
 *
 * `script.json` is `[{ id, text, section, note? }]` in recording order;
 * `script.md` is the same lines numbered, grouped by section, with the notes.
 * The sections, in the order they're recorded, so a short first sitting is
 * already useful:
 *
 * 1. **Warm-up and the fixed lines**: the title page and its tagline, the
 *    teach page's six lines, the four rules, the turn and the page headings,
 *    the clock, the report form and the verdict as the game renders them.
 * 2. **Names and places**: everybody in the neighbourhood bible twice, in two
 *    different short sentences; every place twice; the dealt world's commonest
 *    names and streets, counted over dealt nights; the egg tiers. A name that
 *    could go two ways carries a pronunciation hint in its note.
 * 3. **Hours, money and numbers**: seven to midnight in the game's own
 *    wordings ("at ten", "half past eleven", "nine or ten", "twenty minutes to
 *    an hour"), sums and counts.
 * 4. **Pages**: sentences off the rendered pages of twelve nights (both
 *    worlds, every tier, the oracle's route, the pages `npm run read --
 *    --no-choices` prints), deduplicated, 5 to 22 words, narration and speech,
 *    so that every composite shape and every texture slot is read at least
 *    once; and the lines the playtesters quoted back.
 * 5. **Phonetic coverage**: sounds the rest is thin on, and the voice's range:
 *    real questions, lists, the small words, the period's harder words.
 *
 * Every line passes the jargon lint (docs/53), the prose lint's phrases, the
 * plain-terms list, docs/56's hard gates and, outside the book's own help
 * text, the reader lint's machinery words; curly quotes, American spelling,
 * every number in words.
 *
 * A line's id is its section's prefix and a hash of its words (`pg-3fa9c2d1`),
 * so a script rebuilt after the content changes keeps the recordings of every
 * line that didn't change; the recorder holds each clip to the words it was
 * read from.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { typesFor } from '../src/gen/board/index.js';
import { TIER_NAMES, type CaseType, type TierIndex } from '../src/gen/board/types.js';
import { NAME_POOLS } from '../src/gen/board/names.js';
import { clientOf, dealBoard, deadlineWords, personOf, type BoardDeal, type BoardReport, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { boardFields, scoreBoard, storyOfBoard, truthReport, BREAKS_LABEL, CLEARED_LABEL, HUNCH, NOBODY_LABEL, OTHER_QUESTION, WHERE_BY_LABEL } from '../src/game/board/report.js';
import { BOARD_RULES, BOARD_TEACH_LINES, BOARD_TEACH_TITLE } from '../src/game/board/teach.js';
import { clockStrip } from '../src/game/board/clock.js';
import { engineWords } from '../src/game/board/jargon.js';
import { BANNED } from '../src/game/board/prose-lint.js';
import { machineryIn } from '../src/game/board/reader-lint.js';
import { markedSentences, sentencesOf, wordsIn } from '../src/game/board/plan/sentences.js';
import { SITUATED } from '../src/game/board/plan/situated.js';
import { SHAPES, type Composite } from '../src/game/board/bones/types.js';
import type { GapSlot } from '../src/game/board/plan/types.js';
import type { Page } from '../src/game/board/types.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';
import peopleJson from '../content/neighbourhood/people.json';
import placesJson from '../content/neighbourhood/places.json';

/* ------------------------------------------------------------------ *
 * Shapes.
 * ------------------------------------------------------------------ */

export interface ScriptLine {
  id: string;
  text: string;
  section: string;
  note?: string;
}

export type SectionKey = 'warm-up' | 'names' | 'hours' | 'pages' | 'phonetic';

export interface Section {
  key: SectionKey;
  title: string;
  prefix: string;
  /** How many lines the section aims at, and the range the test holds it to. */
  aim: number;
  range: [number, number];
  /** Read at the top of the section in script.md, and in the recorder on its first line. */
  intro: string;
}

export const SECTIONS: readonly Section[] = [
  {
    key: 'warm-up',
    title: 'Warm-up and the fixed lines',
    prefix: 'wu',
    aim: 62,
    range: [50, 75],
    intro: 'The game talking: the title page, the help, the headings, the report and the verdict. Still you, plain and friendly. A heading is said as a short sentence.',
  },
  {
    key: 'names',
    title: 'Names and places',
    prefix: 'nm',
    aim: 120,
    range: [105, 135],
    intro: 'Say each name the way you’d introduce the person to somebody: clear, not slow. A hint in the note is only where a name could go two ways; if you already say it another way, say it your way and keep it.',
  },
  {
    key: 'hours',
    title: 'Hours, money and numbers',
    prefix: 'hr',
    aim: 42,
    range: [35, 50],
    intro: 'The hours of the night as the game says them, and sums and counts, all written out the way they’re said.',
  },
  {
    key: 'pages',
    title: 'Pages',
    prefix: 'pg',
    aim: 430,
    range: [400, 460],
    intro: 'Sentences off the game’s own pages. The narrator is the detective telling it: unhurried, dry, warm. Words inside quotation marks get a light shift into the speaker, not an impression; “he said” is the narrator again.',
  },
  {
    key: 'phonetic',
    title: 'Phonetic coverage',
    prefix: 'ph',
    aim: 60,
    range: [55, 70],
    intro: 'Sentences that fill in the sounds and the tunes the rest is thin on. Read them as ordinary sentences, not as a test.',
  },
];

const sectionOf = (k: SectionKey): Section => SECTIONS.find((s) => s.key === k) as Section;

/** A line before it has an id. */
interface Draft {
  text: string;
  note?: string;
  /** Pages only: what it covers (`shape:…`, `slot:…`), for the report. */
  tags?: string[];
}

/** The pace the minutes are estimated at: an unhurried narrator, and the 150 ms of quiet the recorder keeps either side. */
export const WORDS_A_MINUTE = 145;
export const PAD_SECONDS = 0.3;

export function lineSeconds(text: string): number {
  return (wordsIn(text) / WORDS_A_MINUTE) * 60 + PAD_SECONDS;
}

/* ------------------------------------------------------------------ *
 * Small helpers.
 * ------------------------------------------------------------------ */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0 to 999 in words, American style ("one hundred four"). */
export function numberWords(n: number): string {
  if (n < 20) return ONES[n] as string;
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
  const h = Math.floor(n / 100);
  const r = n % 100;
  return `${ONES[h]} hundred${r ? ` ${numberWords(r)}` : ''}`;
}

const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

function andList(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** Seeded (mulberry32), so the script is the same every run on the same content. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], seed: number): T[] {
  const r = rng(seed);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** FNV-1a, 32 bits, over the UTF-16 code units: a line's id. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The words as said: "St. Teresa’s" is "Saint Teresa’s"; the book's bold marks go. */
function sayable(text: string): string {
  return text
    .replace(/\bSt\. (?=[A-Z])/g, 'Saint ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Small counts in words, where a rendered line has them in figures ("It took me 12 calls"). */
function spellNumbers(text: string): string {
  return text.replace(/\b(\d{1,3})½/g, (_m, d: string) => `${numberWords(Number(d))} and a half`).replace(/\b\d{1,3}\b/g, (d) => numberWords(Number(d)));
}

/* ------------------------------------------------------------------ *
 * The checks every line passes.
 * ------------------------------------------------------------------ */

const TERMS: unknown = loadPlainTerms();
const plainTerms = (text: string): { term: string }[] => findJargon(text, TERMS) as { term: string }[];

/** British spellings the prose lint's own list doesn't already catch. ("Centre Street" is the street's name.) */
const BRITISH = /\b(?:grey(?:s|ed|ing)?|whilst|amongst|learnt|spelt|metres?|litres?|centre[sd]?(?! Street)|fibres?|sombre|spectres?|lustre|calibre|meagre|sabres?|labour(?:s|ed|ing|er|ers)?|odours?|rumours?|harbours?|humours?|behaviours?|vigour|valour|armour|endeavours?|saviours?|splendour|clamour|savour(?:s|ed|y)?|catalogues?|cheques?|tyres?|storeys?|aluminium|ploughs?|draughts?|mould(?:s|y|ed)?|smoulder\w*|pyjamas|defence|offence|licence|practis(?:e|ed|es|ing)|jeweller(?:y|s)?|travell(?:ed|ing|er|ers)|cancell(?:ed|ing)|modell(?:ed|ing)|labell(?:ed|ing)|quarrell(?:ed|ing)|marvellous|woollen|enrol|fulfil|instalment|organis\w*|criticis\w*|emphasis(?:e|ed|es|ing)|memoris\w*|summaris\w*|authoris\w*|characteris\w*|specialis\w*|utilis\w*|finalis\w*|analys(?:e|ed|es|ing)|paralys(?:e|ed|es|ing)|aeroplanes?|manoeuvr\w*|sceptic\w*|lorr(?:y|ies)|mum)\b/i;

/** docs/56's hard gates (A03, A04, A07, A14, A17, A22, A28), as `scripts/claudisms.ts` has them. */
const GATES: { id: string; re: RegExp }[] = [
  { id: 'A03 “which is to say”', re: /\bwhich is to say\b/i },
  { id: 'A04 “in a way that”', re: /\bin a way (?:that|nobody|you|only|I)\b/i },
  { id: 'A07 tag-on', re: /\b(?:did|does|doing) (?:most|all|half|the rest|the bulk) of the (?:work|talking|lifting)\b|\bwhich suited (?:us|me|him|her|them|everybody)\b|\band (?:I|he|she|they) meant it\b|\b(?:and|but) (?:he|she|it|they|I) knew it\b|\bin that company\b|\b(?:I|he|she) meant it\b/i },
  { id: 'A14 restated-then-undercut', re: /\b(I|He|She|They|It) (?:didn[’']t|wasn[’']t|don[’']t|doesn[’']t|did not|was not) [^.!?“”]{1,60}[.!?] \1 (?:just|only|simply)\b|\b(I|He|She) (\w+) it\. \2 (\w+) it\./ },
  { id: 'A17 the narrator on his narrating', re: /\b(?:I[’']ll say (?:this|that|it)|I should say|I[’']ll be honest|to be honest|if I[’']m honest|as I say|as I said|so to speak|as it were|I won[’']t pretend|I[’']ll admit|Here[’']s what I had|I[’']ll put it|let me put it|put another way|to put it|I should mention)\b/i },
  { id: 'A22 colon-fronted aside', re: /^[A-Z][a-z]+ing\b[^:\n]{2,120}: I didn[’']t (?:interrupt|disturb|bother|stop)\b/ },
  { id: 'A28 “its own kind of”', re: /\b(\w+) that didn[’']t want to be (?:a |an )?\1\b|\bits own kind of\b/i },
];

/**
 * Why a line can't go in the script, or null. `help`: the book's own help text (the rules, the
 * report form), which may say "the grid" and "the notebook" as the book's parts, and (docs/61) ask
 * what cleared somebody and offer "Nobody else", the report's own question and answer; anything
 * else is held to the reader lint's machinery words too.
 */
export function lineProblem(text: string, opts: { help?: boolean } = {}): string | null {
  if (/["']/.test(text)) return 'straight quote';
  if (/[{}]/.test(text)) return 'template slot';
  if (/\d/.test(text)) return 'digit';
  if (/[·½✓✗★→←‹›\[\]<>|_*#&~@^=+\\/‘⁣⁤]/.test(text)) return 'symbol';
  if (/\s{2,}|^\s|\s$/.test(text)) return 'spacing';
  if ((text.match(/“/g) ?? []).length !== (text.match(/”/g) ?? []).length) return 'unbalanced quotation marks';
  if (/\b(?!IOU\b|DA\b)[A-Z]{3,}\b/.test(text)) return 'capitals';
  if (!/^[“A-Z(]/.test(text)) return 'starts lowercase';
  if (!/[.?!…”)]$/.test(text)) return 'no end stop';
  const jargon = engineWords(text).filter((j) => !(opts.help && (j.name === 'cleared' || (j.name === 'and nobody else' && text === `${NOBODY_LABEL}.`))));
  if (jargon.length > 0) return `engine word: ${jargon[0]?.name} (“${jargon[0]?.match}”)`;
  for (const b of BANNED) if (b.re.test(text)) return `prose lint: ${b.name}`;
  const pt = plainTerms(text);
  if (pt.length > 0) return `plain terms: ${pt[0]?.term}`;
  for (const g of GATES) if (g.re.test(text)) return `docs/56 gate: ${g.id}`;
  if (!opts.help) {
    const m = machineryIn(text);
    if (m.length > 0) return `machinery: ${m[0]}`;
  }
  if (BRITISH.test(text)) return 'British spelling';
  return null;
}

/* ------------------------------------------------------------------ *
 * The nights: both worlds, every tier, every kind of case.
 * ------------------------------------------------------------------ */

/** The twelve nights the pages are read off, and the verdict and the clock rendered from. */
export const NIGHTS: readonly { seed: number; tier: TierIndex; type: CaseType; world?: string }[] = [
  // The dealt city: the four the playtesters read in rounds three and four, and two more.
  { seed: 11, tier: 0, type: 'lost-item' },
  { seed: 4, tier: 1, type: 'lost-pet' },
  { seed: 5, tier: 2, type: 'murder' },
  { seed: 9, tier: 3, type: 'lost-pet' },
  { seed: 14, tier: 4, type: 'lost-pet' },
  { seed: 8, tier: 5, type: 'murder' },
  // The neighbourhood.
  { seed: 5, tier: 0, type: 'murder', world: 'neighbourhood' },
  { seed: 8, tier: 1, type: 'lost-item', world: 'neighbourhood' },
  { seed: 6, tier: 2, type: 'lost-pet', world: 'neighbourhood' },
  { seed: 2, tier: 3, type: 'murder', world: 'neighbourhood' },
  { seed: 5, tier: 4, type: 'murder', world: 'neighbourhood' },
  { seed: 10, tier: 5, type: 'lost-pet', world: 'neighbourhood' },
];

interface Night {
  label: string;
  d: BoardDeal;
  run: BoardRun;
}

function playNight(n: (typeof NIGHTS)[number]): Night {
  const d = dealBoard(n.seed, n.tier, n.type, n.world ? { world: n.world } : {});
  const p = playBoardOracle(d);
  return { label: `${n.world ?? 'dealt'} ${n.seed}, ${TIER_NAMES[n.tier]}, ${n.type}`, d, run: p.run };
}

/* ------------------------------------------------------------------ *
 * 1. Warm-up and the fixed lines.
 * ------------------------------------------------------------------ */

/** The title page's words (`src/ui/board-book.ts`, `titlePage` and `howDrawer`). */
const TITLE_PAGE = [
  'Dashiell.',
  'A murder, an evening, and eight hours to write it down.',
  'Open tonight’s case.',
  'Choose a case.',
  'Back to the case.',
  'Open a new case.',
  'Open this case.',
  'New? The first night teaches you as you go.',
  'How it plays.',
];

/** The book's headings: the running head, the turn, the notebook, the report and the closing page (`src/ui`). */
const HEADINGS = [
  'The office.',
  'The turn.',
  'Where they were.',
  'How it adds up.',
  'What I was told.',
  'What my client said.',
  'People and places.',
  'Back to the page.',
  'A page turned back to.',
  'Nothing new.',
  'File the report.',
  'The report.',
  'The verdict.',
  'What really happened.',
  'Look behind the curtain.',
  'Open another case.',
];

function fixedLines(nights: Night[]): Draft[] {
  const out: Draft[] = [];
  const push = (text: string, note?: string) => out.push({ text: sayable(text), ...(note ? { note } : {}) });
  for (const t of TITLE_PAGE) push(t, t === 'Dashiell.' ? 'The title: duh-SHEEL, as in Dashiell Hammett.' : undefined);
  push(`${BOARD_TEACH_TITLE}.`);
  for (const l of BOARD_TEACH_LINES) push(l);
  for (const r of BOARD_RULES) for (const s of sentencesOf(r)) push(s);
  // The clock under the running head, for the DA and for a client.
  const murder = nights.find((n) => n.d.kase.type === 'murder' && !n.d.kase.world) ?? nights[0];
  const small = nights.find((n) => n.d.kase.type === 'lost-pet' && !n.d.kase.world) ?? nights[1];
  if (murder) {
    push(clockStrip(0, 14, deadlineWords(murder.d.kase)).left);
    push(clockStrip(14, 14, deadlineWords(murder.d.kase)).left);
  }
  if (small) push(clockStrip(12, 13, deadlineWords(small.d.kase)).left);
  for (const h of HEADINGS) push(h);
  // The report form: each kind of case's questions, read as one line, and the line questions.
  for (const n of [murder, small]) {
    if (!n) continue;
    // (docs/61: the question about the other broken story is a sentence of its own, said below.)
    const labels = boardFields(n.d).filter((f) => f.key !== 'other').map((f) => f.label.replace(/^\w/, (c) => c.toLowerCase()));
    push(`${cap(andList(labels))}.`);
  }
  push(`${BREAKS_LABEL}.`);
  push(OTHER_QUESTION);
  push(`${CLEARED_LABEL}.`);
  push(`${NOBODY_LABEL}.`);
  push(`${WHERE_BY_LABEL}.`);
  push(`${HUNCH}.`);
  push('I don’t know.');
  push('Everything else I have.');
  push('File it.');
  // The verdict: the score, what counted half, the closing for each way a report comes out, the story.
  for (const n of [murder, small]) if (n) out.push(...verdictLines(n));
  return out;
}

/** The verdict of one night as it renders for each outcome: the score said in words, the plain line, the closing, the story. */
function verdictLines(n: Night): Draft[] {
  const out: Draft[] = [];
  const truth = truthReport(n.d, n.run);
  const fields = boardFields(n.d);
  const other = fields[0]?.options.map((o) => o.value).find((v) => v !== truth.who) ?? null;
  const wrongHour = fields.find((f) => f.key === 'when')?.options.map((o) => Number(o.value)).find((h) => h !== truth.when) ?? null;
  const reports: [string, BoardReport][] = [
    ['solved', truth],
    ['lucky', { ...truth, breaks: null }],
    ['thin', { ...truth, when: wrongHour }],
    ['wrong-man', { ...truth, who: other }],
    ['cold', { ...truth, who: null }],
  ];
  if (truth.where !== undefined) reports.push(['where-half', { ...truth, whereBy: null }]);
  // docs/61: the right name, and the other liar not ruled out.
  if (truth.other !== undefined) reports.push(['other-missed', { ...truth, cleared: null }], ['other-wrong', { ...truth, other: null }]);
  const seen = new Set<string>();
  const take = (text: string, max = 2) => {
    const sents = sentencesOf(sayable(spellNumbers(text))).slice(0, max);
    const line = cap(sents.join(' '));
    if (!line || seen.has(line) || wordsIn(line) > 22 || repeatsName(line)) return;
    seen.add(line);
    out.push({ text: line });
  };
  for (const [k, r] of reports) {
    const v = scoreBoard(n.d, n.run, r);
    if (k === 'solved') take(v.scoreLine);
    for (const p of v.plain) take(p);
    // The closing's first paragraph, a sentence or two of it.
    const first = v.closing[0];
    if (first) take(first, wordsIn(first) <= MAX_WORDS ? 3 : 1);
  }
  const story = storyOfBoard(n.d)[0];
  if (story) take(story, 2);
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. Names and places.
 * ------------------------------------------------------------------ */

interface BiblePerson {
  id: string;
  first: string;
  last: string;
  honorific: string | null;
  gender: string;
  job: string;
  home: string;
  works: { place: string } | null;
  doing: { setting: string; text: string }[];
  voice: { deflect: string[]; refuse: string[] };
}

interface BiblePlace {
  id: string;
  name: string;
  street: string;
}

const PEOPLE = (peopleJson as unknown as { people: BiblePerson[] }).people;
const PLACES = (placesJson as unknown as { places: BiblePlace[] }).places;
const placeById = new Map(PLACES.map((p) => [p.id, p]));

/**
 * Pronunciation hints: the hard names the brief named, and the others that could go two ways.
 * A note carries every hint for a name in its line.
 */
export const HINTS: Record<string, string> = {
  Hochstetter: 'HOKE-stet-er',
  Kaminsky: 'kuh-MIN-skee',
  Szabo: 'SAH-bo',
  Teitel: 'TIE-tl',
  Wojcik: 'WOY-chick',
  Ostrow: 'OSS-troh',
  Crowninshield: 'CROWN-in-sheeld',
  Stanislaw: 'STAN-ih-slaw',
  Demos: 'DEE-mohss',
  Ignatz: 'IG-nahts',
  Lieb: 'LEEB',
  Lazar: 'LAH-zar',
  Assunta: 'ah-SOON-tah',
  Kahane: 'kuh-HAH-nuh',
  Hyman: 'HY-mun',
  Blau: 'BLOW, to rhyme with how',
  Sobel: 'SO-bel',
  Nowak: 'NO-vak',
  Lowenthal: 'LOH-en-thall',
  Carmine: 'CAR-mine, like the color',
  Houston: 'HOW-stun, not the city',
  Bowery: 'BOW-er-ee, bow as in bow-wow',
  Chrystie: 'KRIS-tee',
  Stuyvesant: 'STY-vuh-sunt',
  Delancey: 'duh-LAN-see',
  Forsyth: 'for-SYTHE',
  Weisglass: 'WICE-glass',
  Dettweiler: 'DET-why-ler',
  Havemeyer: 'HAVE-my-er',
  Petrosino: 'pet-roh-SEE-no',
  Ruggiero: 'roo-JAIR-oh',
  Marchetti: 'mar-KET-ee',
  Bellucci: 'beh-LOO-chee',
  Wehrle: 'WAIR-lee',
  Kreuzer: 'KROY-tser',
  Colquitt: 'COLE-kwit',
  Cheatham: 'CHEET-um',
  Kavanagh: 'KAV-uh-nuh',
  Mulcahy: 'mul-KAH-hee',
  Abramowitz: 'uh-BRAM-uh-witz',
  Lefkowitz: 'LEFF-kuh-witz',
};

export function hintsFor(text: string): string | undefined {
  const hits = Object.entries(HINTS).filter(([w]) => new RegExp(`\\b${w}(?:’s)?\\b`).test(text));
  return hits.length ? hits.map(([w, h]) => `${w}: ${h}`).join('; ') : undefined;
}

const fullName = (p: BiblePerson): string => `${p.honorific ? `${p.honorific} ` : ''}${p.first} ${p.last}`;
const shortName = (p: BiblePerson): string => (p.honorific ? `${p.honorific} ${p.last}` : p.last);
const heOf = (p: BiblePerson): string => (p.gender === 'f' ? 'she' : 'he');
/** "at Rafferty’s", "in the flats over Lipsky’s". */
const atPlace = (id: string): string => {
  const name = placeById.get(id)?.name ?? id;
  return /^the (?:flats|card room)\b/.test(name) ? `in ${name}` : `at ${name}`;
};

/** A first line for each person: who they are and where, in one of four frames. */
function introLine(p: BiblePerson, i: number): string {
  const street = placeById.get(p.works?.place ?? p.home)?.street ?? 'the block';
  const work = placeById.get(p.works?.place ?? '')?.name ?? '';
  // "the card-room keeper in the card room", "the dentist at Dr. Hirsch’s surgery is Dr. Miriam Hirsch": said the fourth way.
  const echo = !!work && (work.includes(p.last) || p.job.split(/[\s-]+/).some((w) => w.length > 3 && work.toLowerCase().includes(w)));
  if (echo) return `${fullName(p)} is ${p.job}, and ${heOf(p)} lives ${atPlace(p.home)}.`;
  const frames = [
    () => (p.works ? `${fullName(p)} is ${p.job} ${atPlace(p.works.place)}.` : `${fullName(p)}, ${p.job}, lives ${atPlace(p.home)}.`),
    () => `Everybody on ${street} knows ${fullName(p)}, ${p.job}.`,
    () => (p.works ? `${cap(p.job)} ${atPlace(p.works.place)} is ${fullName(p)}.` : `${cap(p.job)} ${atPlace(p.home)} is ${fullName(p)}.`),
    () => `${fullName(p)} is ${p.job}, and ${heOf(p)} lives ${atPlace(p.home)}.`,
  ];
  return (frames[i % frames.length] as () => string)();
}

/** A second line: the short name, found at something of their own, or saying one of their own short lines. */
function secondLine(p: BiblePerson, i: number): Draft {
  const short = shortName(p);
  const doings = p.doing.filter((d) => (d.setting === 'any' || d.setting === p.works?.place) && wordsIn(d.text) <= 11 && !lineProblem(`I found ${short} ${d.text}.`));
  const sayings = [...p.voice.deflect, ...p.voice.refuse].filter((l) => wordsIn(l) <= 11 && wordsIn(l) >= 3);
  const quote = (l: string): string => {
    // "I fix radiators. I don’t fix that." → “I fix radiators. I don’t fix that,” Wojcik said.
    const said = /[.]$/.test(l) ? `${l.slice(0, -1)},` : l;
    return `“${said}” ${short} said.`;
  };
  if (i % 2 === 0 && doings.length > 0) return { text: `I found ${short} ${(doings[0] as { text: string }).text}.` };
  const s = sayings.find((l) => !lineProblem(quote(l)));
  if (s) return { text: quote(s), note: `Speech: ${short}, ${p.job}. A light shift into the character, not an impression.` };
  return { text: `I found ${short} ${(doings[0] ?? p.doing[0] ?? { text: 'at home' }).text}.` };
}

function personLines(): Draft[] {
  const out: Draft[] = [];
  PEOPLE.forEach((p, i) => {
    for (const d of [{ text: introLine(p, i) }, secondLine(p, i)]) {
      const hint = hintsFor(d.text);
      const note = [d.note, hint].filter(Boolean).join(' ');
      out.push({ text: d.text, ...(note ? { note } : {}) });
    }
  });
  return out;
}

/** What each place is, in a few plain words (the bible's README). */
const PLACE_IS: Record<string, string> = {
  raffertys: 'Rafferty’s is a rooming house on Eldridge Street, four floors of lodgers over one landlady.',
  lipskys: 'The flats over Lipsky’s are four floors of tenants on Orchard Street, over a cloth shop.',
  sokols: 'Sokol’s is a bakery on Rivington Street that sells gin through the door marked flour.',
  peacock: 'The Peacock is a club in a cellar on Chrystie Street, under an undertaker’s.',
  lyric: 'The Lyric is a theater on Second Avenue, in the twelfth week of the same play.',
  steinmetz: 'Steinmetz’s is a chop house on Grand Street, with an oyster bar.',
  surgery: 'Dr. Hirsch’s surgery is a dentist’s office on Clinton Street, over the bank.',
  wexlers: 'Wexler’s is a pawnshop on the Bowery, under the el.',
  cardroom: 'The card room over Feingold’s garage is on Allen Street, where the el rattles the windows.',
  excelsior: 'The Excelsior is a building of flats on East Houston Street that leaves its front door open an inch.',
  belvedere: 'The Belvedere is five floors of cold-water flats on Ludlow Street, over a pickle store.',
};

/** A second line for each place: its gag, or the thing everybody notices. */
const PLACE_AGAIN: Record<string, string> = {
  raffertys: 'At Rafferty’s a ginger cat named Parnell sleeps on a different stair every time.',
  lipskys: 'The boiler in the cellar of the flats over Lipsky’s knocks on the pipes when her name comes up.',
  sokols: 'The door from the bakery to the bar at Sokol’s has fooled nobody for years.',
  peacock: 'The stuffed peacock by the bar at the Peacock has only one glass eye.',
  lyric: 'At the Lyric the death scene runs eleven minutes, and Pinsky mouths every word of it.',
  steinmetz: 'At Steinmetz’s the soup is crossed off the slate at whatever hour you come in.',
  surgery: 'The magazines in Dr. Hirsch’s waiting room are old enough to read as history.',
  wexlers: 'A set of false teeth sits in Wexler’s window, and nobody has come back for them.',
  cardroom: 'Every man who lost a hand in the card room over Feingold’s garage blamed the el.',
  excelsior: 'A potted palm in the lobby of the Excelsior died long ago, and somebody still waters it.',
  belvedere: 'The Belvedere has a loop of string over a nail where the lock should be.',
};

function placeLines(): Draft[] {
  const out: Draft[] = [];
  for (const pl of PLACES) {
    const is = PLACE_IS[pl.id];
    const again = PLACE_AGAIN[pl.id];
    if (!is || !again) throw new Error(`voice-script: no lines for the place ${pl.id}; add it to PLACE_IS and PLACE_AGAIN`);
    for (const text of [is, again]) {
      const note = hintsFor(text);
      out.push({ text, ...(note ? { note } : {}) });
    }
  }
  return out;
}

interface DealtCounts {
  short: Map<string, number>;
  full: Map<string, number>;
  streets: Map<string, number>;
}

/** The dealt world's names and streets, counted over the first `seeds` seeds of every tier and kind of case. */
function countDealt(seeds: number): DealtCounts {
  const short = new Map<string, number>();
  const full = new Map<string, number>();
  const streets = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const given = new Set(NAME_POOLS.flatMap((p) => [...p.given.male, ...p.given.female]));
  for (let seed = 1; seed <= seeds; seed++) {
    for (let t = 0; t <= 5; t++) {
      for (const type of typesFor(t as TierIndex)) {
        let d: BoardDeal;
        try {
          d = dealBoard(seed, t as TierIndex, type);
        } catch {
          continue;
        }
        for (const p of d.kase.people) {
          if (p.object) continue;
          bump(short, p.short);
          if (given.has(p.name.split(' ')[0] ?? '')) bump(full, p.name);
        }
        for (const pl of d.kase.places) if (pl.street) bump(streets, pl.street);
      }
    }
  }
  return { short, full, streets };
}

const top = (m: Map<string, number>, n: number, keep: (k: string) => boolean = () => true): string[] =>
  [...m.entries()].filter(([k]) => keep(k)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k]) => k);

/** The frames the dealt names are said in: the game's own ways of naming people three at a time. */
const NAME_FRAMES: ((xs: string[]) => string)[] = [
  (xs) => `${andList(xs)} were at the supper at eight.`,
  (xs) => `I had three names to ask about: ${andList(xs)}.`,
  (xs) => `Only ${andList(xs)} were at the bar at ten.`,
  (xs) => `${xs[0]} sent me to ${xs[1]}, and ${xs[1]} sent me to ${xs[2]}.`,
  (xs) => `I found ${xs[0]} at the window, ${xs[1]} at the bar and ${xs[2]} by the door.`,
  (xs) => `${xs[0]} had seen ${xs[1]} and ${xs[2]} on the stairs.`,
  (xs) => `According to ${xs[0]}, ${xs[1]} and ${xs[2]} left together.`,
];

function dealtLines(counts: DealtCounts): Draft[] {
  const out: Draft[] = [];
  const push = (text: string) => {
    const note = hintsFor(text);
    out.push({ text, ...(note ? { note } : {}) });
  };
  const bible = new Set(PEOPLE.map(shortName));
  // The commonest, and the two hard names the brief named, whatever their counts.
  const names = top(counts.short, 36, (k) => !bible.has(k) && /^(?:(?:Mrs|Miss|Dr)\. )?[A-Z][a-z’-]+$/.test(k));
  const absent = ['Hochstetter', 'Crowninshield'].filter((h) => !names.includes(h));
  names.splice(names.length - absent.length, absent.length, ...absent);
  for (let i = 0; i + 3 <= names.length; i += 3) push((NAME_FRAMES[(i / 3) % NAME_FRAMES.length] as (xs: string[]) => string)(names.slice(i, i + 3)));
  // Given names with their families, as the office says them.
  const full = top(counts.full, 6);
  const fullFrames = [
    (a: string, b: string) => `“Look at ${a},” the client said. “And there’s ${b}.”`,
    (a: string, b: string) => `${a} and ${b} came in out of the rain together.`,
    (a: string, b: string) => `My client named ${a}, and then, almost as an afterthought, ${b}.`,
  ];
  for (let i = 0; i + 2 <= full.length; i += 2) push((fullFrames[(i / 2) % fullFrames.length] as (a: string, b: string) => string)(full[i] as string, full[i + 1] as string));
  // The hard names said on their own, twice each.
  push('Mrs. Hochstetter said she was home by ten, and nobody could say otherwise.');
  push('“Hochstetter was here at nine,” the barman said. “She always is.”');
  push('Crowninshield paid for the cab and didn’t wait for his change.');
  push('“Ask Crowninshield,” she said. “He was at the Thalia all evening.”');
  return out;
}

function streetLines(counts: DealtCounts): Draft[] {
  const bibleStreets = new Set(PLACES.map((p) => p.street));
  const dealt = top(counts.streets, 18, (s) => !bibleStreets.has(s) && !/^the /.test(s));
  const frames = [
    (xs: string[]) => `I walked down ${xs[0]}, across ${xs[1]} and up ${xs[2]}.`,
    (xs: string[]) => `I passed her on ${xs[0]}, and again on ${xs[1]}, near ${xs[2]}.`,
    (xs: string[]) => `The rain came down ${xs[0]} and across ${xs[1]} and ${xs[2]}.`,
    (xs: string[]) => `The cab took ${xs[0]} to ${xs[1]} and let me out on ${xs[2]}.`,
    (xs: string[]) => `From ${xs[0]} it was a short walk to ${xs[1]}, and a long one to ${xs[2]}.`,
  ];
  const out: Draft[] = [];
  for (let i = 0; i + 3 <= dealt.length && out.length < frames.length; i += 3) {
    const text = (frames[out.length] as (xs: string[]) => string)(dealt.slice(i, i + 3));
    const note = hintsFor(text);
    out.push({ text, ...(note ? { note } : {}) });
  }
  return out;
}

function tierLines(): Draft[] {
  const t = TIER_NAMES;
  const note = 'The tiers are eggs, from Raw to Hard-boiled.';
  return [
    { text: `${t[0]}, ${t[1]}, ${t[2]}, ${t[3]}, ${t[4]} and ${t[5]}.`, note },
    { text: `Clear ${t[2]} to open ${t[3]}.` },
    { text: `Tonight: ${t[4]}. Tomorrow, ${t[5]}, if it goes well.` },
  ];
}

function nameLines(counts: DealtCounts): Draft[] {
  return [...personLines(), ...placeLines(), ...tierLines(), ...dealtLines(counts), ...streetLines(counts)];
}

/* ------------------------------------------------------------------ *
 * 3. Hours, money and numbers: the game's own wordings, seven to midnight.
 * ------------------------------------------------------------------ */

const HOURS: Draft[] = [
  { text: 'At seven I was at Sokol’s, on the same stool as always.' },
  { text: '“Seven o’clock, only Mabry and the band.”', note: 'Speech: a doorkeeper, counting.' },
  { text: 'He had had people in at eight for a birthday supper.' },
  { text: '“Eight o’clock, Teitel, Mabry and Mrs. Sobel. That’s all.”', note: 'Speech: a watcher, counting.' },
  { text: 'Come nine, I went over to Hanley’s for a drink.' },
  { text: 'Nine sharp, I went up to the card room over Feingold’s garage.' },
  { text: 'At nine and ten it was only Doyle and Corrigan.' },
  { text: 'Carbone died at nine or ten.' },
  { text: 'She said the watch went at ten or eleven o’clock.' },
  { text: 'At ten, when the brooch went, she was home alone.' },
  { text: 'Ten sharp, I went to the Bijou, because a friend was in the show.' },
  { text: 'The parlor clock stopped at ten past ten.' },
  { text: 'The boy from the delicatessen came up at a quarter past ten.' },
  { text: 'At eleven I went in to the print shop to set type for the morning.' },
  { text: 'Eleven o’clock came, and nobody came with it.' },
  { text: 'He walked in at half past eleven and found the dead man.' },
  { text: 'Midnight. The office was where I’d left it.' },
  { text: 'Ludlow Street after midnight smelled of dill and coal smoke.' },
  { text: 'The Orpheum runs continuous shows till midnight.' },
  { text: 'I was in the Velvet Room from eight until ten.' },
  { text: 'Eight through ten, I was home, on my own.' },
  { text: 'Anybody at the supper between eight and ten knew about the window.' },
  { text: '“I didn’t come on till ten, so before that I couldn’t say.”', note: 'Speech: a watcher who came on late.' },
  { text: 'By nine the watch was back under its glass dome.' },
  { text: 'By ten o’clock he was at the Odessa, as if he had never left.' },
  { text: 'Laudanum takes twenty minutes to an hour to do its work.' },
  { text: 'Chloral takes a few minutes, and then it takes the rest of the night.' },
  { text: 'I filed it at a quarter to eight and went home the long way.' },
  { text: 'I gave up on bed around eleven and made my peace with the desk chair.' },
  { text: 'He put ten dollars on the desk, in ones, smoothed flat.' },
  { text: '“Fifty dollars,” she said, and put it on the desk.', note: 'Speech: a client.' },
  { text: '“Glick owes me sixty and pays me in nickels,” she said.', note: 'Speech: a landlady, put out.' },
  { text: '“I owe Lou the bookmaker forty dollars,” he said.', note: 'Speech: a suspect, not proud of it.' },
  { text: 'I owe Mr. Fishel sixty dollars on a horse called Sure Thing, which wasn’t.' },
  { text: 'Mrs. Krantz pays me twelve dollars a week and the coal.' },
  { text: 'Ten, I count the dues. Four dollars and sixty cents.' },
  { text: 'I bought a coffee to look like I belonged. It cost a nickel.' },
  { text: 'He sat in the front row with his mouth open, getting full value for a dime.' },
  { text: 'It took me eleven calls, and a better detective would have needed nine.' },
  { text: 'I’ve kept a respectable house for thirty-one years.' },
  { text: 'He’s three weeks behind on the rent, and two months behind with Mrs. Krantz.' },
  { text: 'The office is at the top of four flights on Mulberry Street.' },
  { text: 'The false teeth were pledged in nineteen nineteen and never redeemed.' },
  { text: 'The Reinhardt flat was on the third floor of forty Avenue B.' },
  { text: 'Rafferty’s is at fifty-one Eldridge Street, and the Belvedere is at one seventeen Ludlow.' },
];

/* ------------------------------------------------------------------ *
 * 4. Pages: sentences off the rendered nights.
 * ------------------------------------------------------------------ */

interface Candidate {
  text: string;
  /** Any quotation in it; and all of it inside one. */
  speech: boolean;
  whole: boolean;
  /** Who's talking, for the note: a name and a job, or the detective. */
  speaker?: string;
  detective?: boolean;
  words: number;
  tags: string[];
  /** The card or voicing that wrote it, and the sentence of it: one line a source. */
  source: string;
  night: number;
  /** A sentence too long to read in one breath, said as two or three: the pieces share a group, in order. */
  group?: string;
  /** Split at an ", and": the second piece may have no subject of its own, so it's read only where nothing shorter says its shape. */
  atAnd?: boolean;
}

const clean = (s: string): string => s.replace(/⁣\d+⁤/g, '').replace(/[⁣⁤]/g, '').replace(/\s+/g, ' ').trim();

function shapesOf(cs: readonly Composite[] | undefined): string[] {
  const out: string[] = [];
  const walk = (c: Composite): void => {
    out.push(`shape:${c.shape}`);
    for (const p of c.parts ?? []) walk(p);
  };
  for (const c of cs ?? []) walk(c);
  return out;
}

/**
 * A sentence cut out of its paragraph gets its own quotation marks: one that opens inside a
 * quotation starts with one, and one that leaves a quotation open is closed.
 */
export function balanceQuotes(s: string, startsInside: boolean): string {
  let t = s;
  const count = (x: string, ch: string): number => x.split(ch).length - 1;
  if (startsInside && !t.startsWith('“')) {
    const firstClose = t.indexOf('”');
    const firstOpen = t.indexOf('“');
    if (firstClose >= 0 && (firstOpen < 0 || firstClose < firstOpen)) t = `“${t}`;
    else if (firstClose < 0 && firstOpen < 0) t = `“${t}”`;
  }
  if (count(t, '“') > count(t, '”')) t = `${t}”`;
  return t;
}

/** Who a page's speech is, by what the page was for: the person asked, the watcher, the client. */
interface Speaker {
  name: string;
  job?: string;
  female: boolean;
}

function speakerOf(night: Night, page: Page): Speaker | null {
  const c = night.d.kase;
  const p = page.board.job === 'office' ? clientOf(c) : personOf(c, /^(?:account|list|motive|confront):([^@]+)/.exec(page.board.q ?? '')?.[1] ?? '');
  return p ? { name: p.short, female: !!p.female, ...(p.job ? { job: p.job } : {}) } : null;
}

/**
 * Who the quoted words in a sentence are: the narration around them names them ("Russo said"), or
 * says "he said" or "she said" of the page's own speaker; a "she said" of a man is somebody else.
 */
function speakerIn(text: string, who: Speaker | null): string | undefined {
  const around = text.replace(/“[^”]*”/g, ' ');
  const named = /\b((?:(?:Mrs|Miss|Dr)\. )?[A-Z][\w’-]+) said\b|\bsaid ((?:(?:Mrs|Miss|Dr)\. )?[A-Z][\w’-]+)/.exec(around);
  if (named) return named[1] ?? named[2];
  if (!who) return undefined;
  const pron = /\b(he|she) (?:said|asked|added|went on)\b|\bsaid (he|she)\b/.exec(around);
  if (pron && (pron[1] ?? pron[2]) !== (who.female ? 'she' : 'he')) return undefined;
  return `${who.name}${who.job ? `, ${who.job}` : ''}`;
}

/** The longest line, in words: about ten seconds at a narrator's pace, under the twelve a clip may run. */
export const MAX_WORDS = 22;

/**
 * Too long for one clip: a sentence of narration over `MAX_WORDS`, said at its semicolons, then at
 * its ", but", then at its ", and", as two or three sentences in the game's own words.
 */
export function splitLong(s: string): { pieces: string[]; atAnd: boolean } | null {
  if (/[“”]/.test(s) || wordsIn(s) <= MAX_WORDS) return null;
  const end = (x: string): string => (/[.!?…]$/.test(x) ? x : `${x}.`);
  const at = (xs: string[], re: RegExp, word: string): string[] => xs.flatMap((x) => (wordsIn(x) > MAX_WORDS ? x.split(re).map((y, i) => (i > 0 ? `${word} ${y}` : y)) : [x]));
  const before = at(s.split(/; /), /, but /, 'but');
  const pieces = at(before, /, and /, 'and');
  const out = pieces.map((x) => end(cap(x.trim())));
  return out.length > 1 && out.every((x) => wordsIn(x) >= 4 && wordsIn(x) <= MAX_WORDS) ? { pieces: out, atAnd: pieces.length > before.length } : null;
}

/** Words that start a sentence only when it's a piece of another one. */
const FRAGMENT = /^(?:With|Or|Which|As if|Though|Than|Because|Whereas|I said, and)\b/;

/** A place the reference pass said as a pronoun ("Fritz lived at her, in a basket"): not a line to read aloud. */
const SLIP = /\b(?:lived|living|table|stayed|staying) at (?:her|him|them)\b|\bat (?:her|him|them) (?:was|were)\b/;

/** A name, or a role standing for one, said twice in one sentence: the reference pass's slips ("the janitor’s pipe"), and lines that only make sense on their page. */
export function repeatsName(text: string): boolean {
  for (const sent of sentencesOf(text)) {
    const words = sent.replace(/[“”,.;:!?…()]/g, ' ').split(/\s+/).filter(Boolean);
    const seen = new Set<string>();
    for (let i = 0; i < words.length; i++) {
      const w = (words[i] as string).replace(/’s$/, '');
      const name = /^[A-Z][a-z]/.test(w) && !NOT_NAMES.test(w) && !/^(?:I|Mr|Mrs|Miss|Dr|Saint|Street|Avenue)$/.test(w);
      const role = /^(?:janitor|landlady|barman|bartender|usher|doorkeeper|watcher|client)$/.test(w);
      if (!name && !role) continue;
      const k = w.toLowerCase();
      if (seen.has(k)) return true;
      seen.add(k);
    }
  }
  return false;
}

function candidatesOf(night: Night, ni: number): Candidate[] {
  const out: Candidate[] = [];
  night.run.log.forEach((page, pi) => {
    const units = (page.board.units ?? []).map((u, ui) => ({ u, ui, text: clean(u.text) }));
    const who = speakerOf(night, page);
    for (const b of page.blocks) {
      if (b.kind !== 'prose' || b.voice === 'chapter') continue;
      let inside = false;
      for (const s of markedSentences(clean(b.text)).sentences) {
        const startsInside = inside;
        for (const ch of s.text) inside = ch === '“' ? true : ch === '”' ? false : inside;
        const core = s.text.replace(/^“/, '').replace(/”$/, '');
        const hits = units.filter((x) => x.text.length > 0 && (x.text.includes(core) || core.includes(x.text)));
        const tags = new Set<string>();
        const sources: string[] = [];
        let asked = false;
        for (const { u, ui } of hits) {
          if (u.kind === 'fact') {
            for (const t of shapesOf(u.bones)) tags.add(t);
            sources.push((u.bones ?? []).map((c) => c.voicing ?? 'plain').join('+') || `fact:${ni}:${pi}:${ui}`);
          } else {
            tags.add(`slot:${u.slot}`);
            if (u.slot === 'ask') asked = true;
            sources.push(u.card ?? `gap:${u.slot}:${ni}:${pi}:${ui}`);
          }
        }
        const text = sayable(balanceQuotes(s.text, startsInside));
        const source = `${sources.join('|') || `none:${ni}:${pi}`}#${core.slice(0, 24)}`;
        const quoted = /“/.test(text);
        const whole = quoted && text.startsWith('“') && text.endsWith('”') && text.indexOf('”') === text.length - 1;
        // The detective's own words: an asking card, or "I said" in the narration around the quotation.
        const detective = quoted && (asked || /\bI (?:said|asked|told \w+)\b/.test(text.replace(/“[^”]*”/g, ' ')));
        const speaker = quoted && !detective ? speakerIn(text, who) : undefined;
        const base = { speech: quoted, whole, tags: [...tags], night: ni, ...(detective ? { detective: true } : {}), ...(speaker ? { speaker } : {}) };
        const split = splitLong(text);
        if (split) split.pieces.forEach((x, k) => out.push({ ...base, text: x, words: wordsIn(x), source: `${source}/${k}`, group: source, ...(split.atAnd ? { atAnd: true } : {}) }));
        else out.push({ ...base, text, words: wordsIn(text), source });
      }
    }
  });
  return out.filter((c) => !FRAGMENT.test(c.text.replace(/^“/, '')) && !SLIP.test(c.text) && !repeatsName(c.text));
}

/**
 * The lines the playtesters quoted back in rounds three and four (the digests), as the game says
 * them now, with names in their slots. Two have since gone from the game with docs/56's stock lines
 * ("the whole trick", "promoted to furniture") and are read here as they were; "the sigh did most of
 * the work" is one of docs/56's hard gates and is left out.
 */
export const FAVORITES: Draft[] = [
  { text: 'I buttoned my coat. It came off a rack, and next to those clothes it looked it.' },
  { text: 'One of those folded hands came unfolded, set something straight, and folded away again. I’ve seen banks spend less carefully.' },
  { text: 'I put the money in my wallet, where it looked lonely and slightly surprised.' },
  { text: 'The glasses behind the bar caught the light and did nothing else with it.' },
  { text: 'My shoes had let the rain in two blocks back, and now they were just carrying it around for me.' },
  { text: 'Sokol was behind the register, doing the crossword in pencil and the day’s takings in ink.' },
  { text: 'Whoever it was had let themselves in and put the key back after, which is manners of a kind.' },
  { text: 'Mrs. Rafferty looked at the floor for a while, as if it had been the one to tell me.' },
  { text: 'I read the slate by the door again. Still no soup, which seemed about right for the night.' },
  { text: 'It was warmer in than out, which was the best thing I could say for it, and I said it.' },
  { text: 'Bellucci answered without looking at me, which is a way of answering.' },
  { text: '“I owed Carbone four hundred dollars,” Lieb said. “Everybody owed Carbone something. It was how he made friends.”', note: 'Speech: Lieb, a pawnbroker’s clerk. A light shift, not an impression.' },
  { text: 'Mrs. Krantz took the news the way people take good news at eight in the morning: suspiciously, and with coffee.' },
  { text: 'Somebody had made Doyle cocoa. Cocoa is what you make for a friend.' },
  { text: 'I wasn’t hungry and didn’t pretend to be. I went in to see who was.' },
  { text: 'Feeney answered straight off, the way you answer a census taker.' },
  { text: 'The Reinhardt flat was neat as a pin and twice as sharp about it.' },
  { text: 'A cat on a step watched me go by and decided I was nobody’s business. That is the most a cat will do for you.' },
  { text: 'I wiped my feet, late, and the landlady watched me do it.' },
  { text: 'He had a pleasant, forgettable face, which in that trade is the whole trick.', note: 'Since cut from the game; kept for the playtesters.' },
  { text: 'The eyes went to the door and came back, and I was glad to see I’d been promoted to furniture.', note: 'Since cut from the game; kept for the playtesters.' },
  { text: '“The brooch was promised to me,” Marchetti said. “The late Mr. Whitfield promised it, in front of witnesses, and they’re all dead too.”', note: 'Speech: Marchetti, aggrieved. A light shift, not an impression.' },
];

const FAVORITE_NOTE = 'A playtesters’ favorite.';

/** Capitalized words that aren't names: a sentence's first word, mostly. */
const NOT_NAMES = /^(?:The|A|An|And|But|So|Or|Then|Now|That|This|These|Those|It|Its|He|She|They|I|We|You|My|His|Her|Their|Our|Your|There|Here|Nobody|Somebody|Everybody|Anybody|Nothing|One|At|In|On|By|From|For|To|Of|With|If|When|Where|What|Who|Whoever|Why|How|Some|No|Not|Even|Only|Still|Just|After|Before|Once|All|Every|Each|Like|Up|Down|Over|Under|Through|Seven|Eight|Nine|Ten|Eleven|Twelve|Midnight)$/;

/** Every word of a name or a place on the twelve nights and in the bible: what the mask takes for a name at the start of a sentence. */
const NAME_WORDS = new Set<string>();

function learnNames(nights: readonly Night[]): void {
  const add = (s: string) => {
    for (const w of s.split(/[\s,]+/)) if (/^[A-Z][\w’-]+$/.test(w)) NAME_WORDS.add(w.replace(/’s$/, ''));
  };
  for (const n of nights) {
    for (const p of n.d.kase.people) add(`${p.name} ${p.short}`);
    for (const pl of n.d.kase.places) add(`${pl.name} ${pl.short}`);
  }
  for (const p of PEOPLE) add(`${p.first} ${p.last}`);
  for (const pl of PLACES) add(pl.name);
}

/**
 * A line with its names, pronouns and hours masked: two lines with one mask (or one inside the
 * other) are the same line. A capital in the middle of a sentence is a name; at the start of one,
 * only if it's somebody's or somewhere's ("Watched the coat" is not a name).
 */
const maskOf = (t: string): string =>
  t
    .replace(/(?:Mrs?\.|Miss|Dr\.) /g, '')
    .replace(/[A-Z][\w’-]+/g, (w, at: number, all: string) => {
      const first = at === 0 || /(?:[.!?…]”?\s+|“)$/.test(all.slice(Math.max(0, at - 3), at));
      return NOT_NAMES.test(w) || (first && !NAME_WORDS.has(w.replace(/’s$/, ''))) ? w.toLowerCase() : 'X';
    })
    .replace(/\b(?:seven|eight|nine|ten|eleven|twelve|midnight)\b/gi, 'H')
    .replace(/\b(?:he|she|him|her|his|hers|himself|herself|they|them|their)\b/gi, 'X')
    .replace(/[^A-Za-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normal = (t: string): string => t.replace(/[“”]/g, '').toLowerCase();

interface PagePick {
  lines: Draft[];
  covered: string[];
  missing: string[];
}

/** The tags every pages section must read: the composite shapes and the texture slots. */
const SLOTS: readonly GapSlot[] = ['why-here', 'walk', 'arrival', 'staging', 'ask', 'reaction', 'voice', 'gloss', 'close', 'hand-off'];

/**
 * ATTACH ("…, who hadn’t been at Rafferty’s while the revolver was there to be had") is in the
 * shape set, but the engine didn't say one over 720 nights read both ways; this is it said from its
 * own voicing (`attach/who-2`) over a placement and an access clause the pages do say.
 */
const ATTACH_LINE: Draft = {
  text: 'At nine the barman saw Kaminsky with Obermann, who hadn’t been at Rafferty’s while the revolver was there to be had.',
  tags: ['shape:ATTACH', 'shape:PLACED-SET', 'shape:ACCESS-SET'],
};

/**
 * Shapes the pages may stop saying on the fixed nights as the engine changes (clarity-1, docs/59,
 * folded CONFIRMED-WITH and ADMIT-CHECK into other sentences there). When the sample misses one,
 * it is read from a hand line said in its own voicing, so the script still covers every shape.
 */
const FALLBACK_LINES: Readonly<Record<string, Draft>> = {
  'shape:CONFIRMED-WITH': {
    text: 'Sokol saw Glick at the bar at ten, just as he said, and the same witness saw Mrs. Blau there too.',
    tags: ['shape:CONFIRMED-WITH', 'shape:CONFIRMED'],
  },
  'shape:ADMIT-CHECK': {
    text: 'Abramowitz owned up to the Automat at eleven, and Weisglass, who had been at the table with him, said the same.',
    tags: ['shape:ADMIT-CHECK'],
  },
};

function pickPages(nights: Night[], target: number, taken: Set<string>): PagePick {
  const all = nights.flatMap((n, i) => candidatesOf(n, i));
  const usable = all.filter((c) => c.words >= 5 && c.words <= MAX_WORDS && !lineProblem(c.text));
  // `--show shape:STREET`: every sentence carrying a tag, and why it can't go in.
  const show = process.argv.indexOf('--show');
  if (show >= 0) for (const c of all.filter((x) => x.tags.includes(process.argv[show + 1] ?? ''))) process.stderr.write(`[${c.words}w ${lineProblem(c.text) ?? 'ok'}] ${c.text}\n`);
  const chosen: Candidate[] = [];
  const seenSource = new Set<string>();
  const seenMask = new Set<string>();
  const perNight = new Map<number, number>();
  // Masks of every line taken anywhere: a page line that is part of one, or has one in it, is the same line.
  const masks = new Set<string>([...taken].map(maskOf));
  const take = (c: Candidate): boolean => {
    const k = normal(c.text);
    const m = maskOf(c.text);
    if (taken.has(k) || seenSource.has(c.source) || seenMask.has(m)) return false;
    // (Five words or more inside another line: "I wiped my feet, late." is the favorite's first half.)
    const inside = (a: string, b: string): boolean => a.split(' ').length >= 5 && ` ${b} `.includes(` ${a} `);
    if ([...masks].some((t) => inside(t, m) || inside(m, t))) return false;
    taken.add(k);
    masks.add(m);
    seenSource.add(c.source);
    seenMask.add(m);
    perNight.set(c.night, (perNight.get(c.night) ?? 0) + 1);
    chosen.push(c);
    return true;
  };
  /** A piece of a long sentence brings the rest of it, so the composite is read whole. */
  const takeWhole = (c: Candidate): boolean => {
    if (!c.group) return take(c);
    const pieces = usable.filter((x) => x.group === c.group);
    if (pieces.length !== all.filter((x) => x.group === c.group).length) return false;
    if (!pieces.every((x) => !taken.has(normal(x.text)) && !seenMask.has(maskOf(x.text)))) return false;
    for (const x of pieces) take(x);
    return true;
  };
  // The favorites first, as fixed lines; a page sentence that is one of them isn't taken again.
  const favoriteUnits: Draft[][] = FAVORITES.map((f) => {
    const note = [FAVORITE_NOTE, f.note].filter(Boolean).join(' ');
    if (wordsIn(f.text) <= MAX_WORDS) return [{ ...f, note }];
    // Two sentences too long for one clip: two lines, read one after the other.
    return sentencesOf(f.text).map((t, i) => ({ text: t, ...(i === 0 ? { note: `${note} The next line finishes it.` } : {}) }));
  });
  const favorites = favoriteUnits.flat();
  for (const f of [...favorites, ATTACH_LINE]) {
    const p = lineProblem(f.text);
    if (p) throw new Error(`voice-script: “${f.text}”: ${p}`);
    taken.add(normal(f.text));
    masks.add(maskOf(f.text));
    seenMask.add(maskOf(f.text));
  }
  // 1. Coverage: every shape and slot, read once as narration and once as speech where both exist,
  // the sentence nearest eleven words first.
  const required = [...SHAPES.filter((s) => s !== 'ATTACH').map((s) => `shape:${s}`), ...SLOTS.map((s) => `slot:${s}`)];
  const pref = (c: Candidate): number => Math.abs(c.words - 11) + (c.words > 16 ? 4 : 0);
  for (const tag of required) {
    for (const speech of [false, true]) {
      const pool = usable.filter((c) => c.tags.includes(tag) && c.speech === speech).sort((a, b) => pref(a) - pref(b) || a.night - b.night);
      for (const c of pool) if (takeWhole(c)) break;
    }
  }
  // 2. The rest: shuffled, spread over the nights, about a third speech, and at most two in five over twelve words.
  const want = target - favorites.length - 1;
  const speechCap = Math.round(want * 0.34);
  const longCap = Math.round(want * 0.35);
  const nightCap = Math.ceil(want / nights.length) + 6;
  for (const c of shuffle(usable, 1931)) {
    if (chosen.length >= want) break;
    if (c.speech && chosen.filter((x) => x.speech).length >= speechCap) continue;
    if (c.words > 12 && chosen.filter((x) => x.words > 12).length >= longCap) continue;
    if ((perNight.get(c.night) ?? 0) >= nightCap || c.atAnd) continue;
    takeWhole(c);
  }
  // A shape the sample didn't reach is read from its hand line (FALLBACK_LINES), if it has one.
  const sampled = new Set([...chosen.flatMap((c) => c.tags), ...(ATTACH_LINE.tags ?? [])]);
  const fallbacks = Object.entries(FALLBACK_LINES).filter(([tag]) => !sampled.has(tag)).map(([, d]) => d);
  for (const f of fallbacks) {
    const p = lineProblem(f.text);
    if (p) throw new Error(`voice-script: “${f.text}”: ${p}`);
  }
  const covered = [...new Set([...sampled, ...fallbacks.flatMap((f) => f.tags ?? [])])].sort();
  const missing = [...required, 'shape:ATTACH'].filter((t) => !covered.includes(t));
  // The order: round the nights, so any stretch of the section is a mix; a favorite every ten lines.
  // (A long sentence's pieces stay together, in order.)
  const groups: Candidate[][] = [];
  for (const c of chosen) {
    const last = groups[groups.length - 1];
    if (c.group && last && last[0]?.group === c.group) last.push(c);
    else groups.push([c]);
  }
  const byNight = new Map<number, Candidate[][]>();
  for (const g of shuffle(groups, 77)) byNight.set((g[0] as Candidate).night, [...(byNight.get((g[0] as Candidate).night) ?? []), g]);
  const rounds: Candidate[] = [];
  for (let k = 0; rounds.length < chosen.length; k++) for (let n = 0; n < nights.length; n++) {
    const g = byNight.get(n)?.[k];
    if (g) rounds.push(...g);
  }
  const blocks: Draft[][] = [];
  for (const c of rounds) {
    const d: Draft = { text: c.text, tags: c.tags, ...(noteOf(c) ? { note: noteOf(c) as string } : {}) };
    const last = blocks[blocks.length - 1];
    const prev = rounds[rounds.indexOf(c) - 1];
    if (c.group && last && prev?.group === c.group) last.push(d);
    else blocks.push([d]);
  }
  // A favorite every ten blocks or so, never inside a sentence said in pieces.
  [...favoriteUnits, [ATTACH_LINE], ...fallbacks.map((f) => [f])].forEach((u, i) => blocks.splice(Math.min(blocks.length, i * 10), 0, u));
  return { lines: blocks.flat(), covered, missing };
}

function noteOf(c: Candidate): string | undefined {
  if (!c.speech) return undefined;
  if (c.detective) return c.whole ? 'Speech: the detective himself, so your own voice.' : 'The quoted words are the detective’s own: your own voice throughout.';
  if (!c.speaker) return c.whole ? 'Speech: a light shift into the character, not an impression.' : 'The words in quotation marks are a character’s: a light shift. The rest is the narrator.';
  return c.whole ? `Speech: ${c.speaker}. A light shift into the character, not an impression.` : `The words in quotation marks are ${c.speaker}: a light shift. The rest is the narrator.`;
}

/* ------------------------------------------------------------------ *
 * 5. Phonetic coverage: original sentences, each for a sound or a tune.
 * ------------------------------------------------------------------ */

const PHONETIC: Draft[] = [
  { text: 'She measured the beige silk by eye and said it was a pleasure.', note: 'The zh sound: measured, beige, pleasure.' },
  { text: 'There was usually a casual vision of leisure about him.', note: 'zh again: usually, casual, vision, leisure.' },
  { text: 'The garage door rolled up on a mirage in a camel coat.', note: 'garage and mirage, said the American way.' },
  { text: 'Thirty thin men thought the theater was theirs on Thursday.', note: 'th, both kinds, without rushing.' },
  { text: 'They gathered there with their brothers and their fathers, whatever the weather.', note: 'The voiced th.' },
  { text: 'I took a breath and told him the truth, which was worth both of us.' },
  { text: 'The month was cold, and the mouth of the alley was colder.' },
  { text: 'The singer was hanging on to the long note at the end of the song.', note: 'ng, without adding a g.' },
  { text: 'Nothing was ringing, nobody was coming, and the evening was going.' },
  { text: 'The judge chose cheap cheese and a jar of strawberry jam.', note: 'ch and j.' },
  { text: 'Chester watched the kitchen clock and checked his change.' },
  { text: 'George kept a ledger under the bridge table, next to the gin.' },
  { text: 'She should have shown the sugar bowl to the chef.', note: 'sh, four ways of spelling it.' },
  { text: 'The ocean wind came up through the station and shook the shutters.' },
  { text: 'Yes, the young lawyer usually yawns in June.', note: 'y and the long u.' },
  { text: 'A few cute tunes on the music box, and a view of the yard.' },
  { text: 'Whether the weather was wet or not, the whistle blew at one.' },
  { text: 'Which way did the woman with the white umbrella walk?', note: 'A real question, falling at the end.' },
  { text: 'Who was hiding behind the hall door, holding his hat?' },
  { text: 'Red wagons and yellow lamps lined the lane down to the river.', note: 'r and l.' },
  { text: 'Laurel rolled the barrel along the railroad yard, really rather slowly.' },
  { text: 'Beat, bit, bait, bet, bat, but, boot, book, boat, bought.', note: 'The vowels in a row, evenly, like a list.' },
  { text: 'Pat, pet, pit, pot, putt, put.', note: 'Short vowels, evenly.' },
  { text: 'I like my lights bright and my nights quiet.', note: 'The long i.' },
  { text: 'How loud the crowd was, down in the town!', note: 'ow, and an exclamation.' },
  { text: 'The boy with the oily coin was loyal to nobody.', note: 'oy.' },
  { text: 'The nurse heard the first word of the third verse.', note: 'ur.' },
  { text: 'Here, near the pier, the beer was dear.', note: 'eer.' },
  { text: 'Their chairs were bare, and the stairs needed care.', note: 'air.' },
  { text: 'Go slow, and don’t throw the old coat over the stove.', note: 'The long o.' },
  { text: 'Father calmly parked the car in the dark yard.', note: 'The open ah.' },
  { text: 'The law saw the dog in the fog across the water.' },
  { text: 'The sixth sheriff’s sheep stood still in the street.', note: 'The clusters: sixth, sh, st.' },
  { text: 'He asked for the facts, the texts and the desks.', note: 'Clusters at the ends of words.' },
  { text: 'On the twelfth, he glimpsed the scripts and asked for the rest.' },
  { text: 'Ask the doctor if the hot water bottle is ready.', note: 'The American t in water and bottle.' },
  { text: 'A little kitten got a button lost in the cotton.', note: 'kitten, button, cotton: the t that almost isn’t there.' },
  { text: 'The middle of the bottle was a little muddled.' },
  { text: 'Is it true? Did she really say that?', note: 'Two real questions: let the pitch rise.' },
  { text: 'Where were you at ten, and who saw you there?', note: 'A question that knows the answer.' },
  { text: 'Well! That changes things.', note: 'A small surprise, kept dry.' },
  { text: 'No. No, I don’t think so.', note: 'Quietly sure.' },
  { text: 'Oh, I see. And who told you that?', note: 'An edge, not a sneer.' },
  { text: 'Wait. Say that again, slowly.' },
  { text: 'Hush now, the whole house is asleep.', note: 'h, sh and the long vowels; not a whisper.' },
  { text: '“Number, please,” said the operator, and waited.', note: 'Speech: a switchboard operator. A light shift.' },
  { text: 'One, two, three: that was the whole of it.' },
  { text: 'Chloral, laudanum, arsenic, and a little rat poison.', note: 'chloral: KLOR-ul; laudanum: LAWD-num.' },
  { text: 'The ingénue sang an aria in the foyer.', note: 'ingénue: AN-zhuh-noo; foyer: FOY-er.' },
  { text: 'A rendezvous at the café, and a croissant for the road.', note: 'rendezvous: RON-day-voo; café: ka-FAY.' },
  { text: 'The alderman’s clerk was anxious about the luxury of it.', note: 'anxious: ANK-shus; luxury: LUG-zhuh-ree or LUCK-shuh-ree, whichever is yours.' },
  { text: 'A spiritualist, a matchmaker and a wigmaker walked into a delicatessen.' },
  { text: 'Pawnbroker, prizefighter, piano teacher, pushcart man.', note: 'p after p, without popping the mic.' },
  { text: 'Switchboard operator, insurance agent, union organizer.' },
  { text: 'The el went over, and the windows shook in their frames.', note: 'The el is the elevated train: “the ell”.' },
  { text: 'We played pinochle over a knish and a glass of schnapps.', note: 'pinochle: PEE-nuck-ul; knish: kuh-NISH.' },
  { text: 'The Automat on Delancey Street kept the pie behind little glass doors.' },
  { text: 'He wore galoshes, a derby and a muffler, and still looked cold.' },
  { text: 'Mr. Feeney, Mrs. Nagy, Miss Gutman and Dr. Hirsch.', note: 'The titles: mister, missus, miss, doctor.' },
  { text: 'It isn’t, it wasn’t, and it won’t be, whatever they’re saying.' },
  { text: 'Pack my box with five dozen liquor jugs.', note: 'Every letter of the alphabet, in one sentence.' },
  { text: 'Quick, quiet, quite, and a quarter past.', note: 'kw.' },
];

/* ------------------------------------------------------------------ *
 * Putting it together.
 * ------------------------------------------------------------------ */

export interface ScriptBuild {
  lines: ScriptLine[];
  /** Pages: what the twelve nights' sentences covered, and what they didn't. */
  covered: string[];
  missing: string[];
  nights: string[];
}

export function buildScript(opts: { dealtSeeds?: number } = {}): ScriptBuild {
  const was = SITUATED.on;
  SITUATED.on = true;
  try {
    const nights = NIGHTS.map(playNight);
    learnNames(nights);
    const counts = countDealt(opts.dealtSeeds ?? 8);
    const bySection: Record<SectionKey, Draft[]> = {
      'warm-up': fixedLines(nights),
      names: nameLines(counts),
      hours: HOURS,
      pages: [],
      phonetic: PHONETIC,
    };
    // Every hand-made line through the checks; one that fails is a bug here, not a line to drop.
    for (const k of ['warm-up', 'names', 'hours', 'phonetic'] as const) {
      for (const d of bySection[k]) {
        const p = lineProblem(d.text, { help: k === 'warm-up' });
        if (p) throw new Error(`voice-script (${k}): “${d.text}”: ${p}`);
      }
    }
    const taken = new Set<string>();
    for (const k of ['warm-up', 'names', 'hours', 'phonetic'] as const) {
      bySection[k] = bySection[k].filter((d) => {
        const n = normal(d.text);
        if (taken.has(n)) return false;
        taken.add(n);
        return true;
      });
    }
    const pages = pickPages(nights, sectionOf('pages').aim, taken);
    bySection.pages = pages.lines;
    const lines: ScriptLine[] = [];
    const ids = new Set<string>();
    for (const s of SECTIONS) {
      bySection[s.key].forEach((d, i) => {
        let id = `${s.prefix}-${hashText(d.text)}`;
        for (let k = 2; ids.has(id); k++) id = `${s.prefix}-${hashText(`${d.text}#${k}`)}`;
        ids.add(id);
        // Speech is marked wherever it is, so a character always gets the light shift.
        const said = d.text.includes('“') && !/speech|quot/i.test(d.note ?? '') ? 'The words in quotation marks: a light shift into the speaker, not an impression.' : undefined;
        const own = [said, d.note].filter(Boolean).join(' ') || undefined;
        const note = i === 0 ? [`${s.title}: ${s.intro}`, own].filter(Boolean).join(' ') : own;
        lines.push({ id, text: d.text, section: s.title, ...(note ? { note } : {}) });
      });
    }
    return { lines, covered: pages.covered, missing: pages.missing, nights: nights.map((n) => n.label) };
  } finally {
    SITUATED.on = was;
  }
}

/* ------------------------------------------------------------------ *
 * The page to read from.
 * ------------------------------------------------------------------ */

export interface SectionStats {
  title: string;
  lines: number;
  words: number;
  minutes: number;
}

export function scriptStats(lines: readonly ScriptLine[]): { sections: SectionStats[]; lines: number; words: number; minutes: number; short: number; longest: number } {
  const sections = SECTIONS.map((s) => {
    const ls = lines.filter((l) => l.section === s.title);
    return { title: s.title, lines: ls.length, words: ls.reduce((n, l) => n + wordsIn(l.text), 0), minutes: ls.reduce((n, l) => n + lineSeconds(l.text), 0) / 60 };
  });
  const words = lines.map((l) => wordsIn(l.text));
  return {
    sections,
    lines: lines.length,
    words: words.reduce((a, b) => a + b, 0),
    minutes: lines.reduce((n, l) => n + lineSeconds(l.text), 0) / 60,
    short: words.filter((w) => w >= 4 && w <= 12).length,
    longest: Math.max(...words),
  };
}

export function scriptMarkdown(lines: readonly ScriptLine[]): string {
  const st = scriptStats(lines);
  const out: string[] = [];
  out.push('# The voice script');
  out.push('');
  out.push(`${st.lines} lines, ${st.words.toLocaleString('en-US')} words, about ${Math.round(st.minutes)} minutes read at a narrator’s pace (${WORDS_A_MINUTE} words a minute, with the ${Math.round((PAD_SECONDS / 2) * 1000)} ms of quiet the recorder keeps either side). Built by \`scripts/voice-script.ts\`; read aloud with \`record.html\` (see \`README.md\`). Don’t edit it by hand: rebuild it.`);
  out.push('');
  out.push('The recorder takes the lines in this order. Quotation marks are a character talking: a light shift, not an impression. A note under a line is for that line only.');
  out.push('');
  out.push('| | section | lines | minutes |');
  out.push('|---|---|---|---|');
  st.sections.forEach((s, i) => out.push(`| ${i + 1} | ${s.title} | ${s.lines} | ${s.minutes.toFixed(1)} |`));
  out.push(`| | all of it | ${st.lines} | ${st.minutes.toFixed(1)} |`);
  out.push('');
  let n = 0;
  SECTIONS.forEach((s, si) => {
    const ls = lines.filter((l) => l.section === s.title);
    out.push(`## ${si + 1}. ${s.title}`);
    out.push('');
    out.push(`*${s.intro}*`);
    out.push('');
    ls.forEach((l, i) => {
      n++;
      const note = i === 0 ? l.note?.replace(`${s.title}: ${s.intro}`, '').trim() : l.note;
      out.push(`${n}. ${l.text} \`${l.id}\`${note ? `  \n   *${note}*` : ''}`);
    });
    out.push('');
  });
  return out.join('\n');
}

/* ------------------------------------------------------------------ *
 * Main.
 * ------------------------------------------------------------------ */

const isMain = process.argv[1] !== undefined && /voice-script\.ts$/.test(process.argv[1]);
if (isMain) {
  const i = process.argv.indexOf('--out');
  const dir = i >= 0 ? (process.argv[i + 1] as string) : 'model/voice';
  const built = buildScript();
  const st = scriptStats(built.lines);
  for (const s of st.sections) process.stdout.write(`${s.title.padEnd(30)} ${String(s.lines).padStart(4)} lines ${String(s.words).padStart(6)} words ${s.minutes.toFixed(1).padStart(6)} min\n`);
  process.stdout.write(`${'all of it'.padEnd(30)} ${String(st.lines).padStart(4)} lines ${String(st.words).padStart(6)} words ${st.minutes.toFixed(1).padStart(6)} min\n`);
  process.stdout.write(`${st.short} of ${st.lines} lines are 4 to 12 words; the longest is ${st.longest}.\n`);
  process.stdout.write(`nights: ${built.nights.join('; ')}\n`);
  process.stdout.write(`pages cover ${built.covered.filter((t) => t.startsWith('shape:')).length} shapes and ${built.covered.filter((t) => t.startsWith('slot:')).length} slots${built.missing.length ? `; missing ${built.missing.join(', ')}` : ''}\n`);
  if (!process.argv.includes('--dry')) {
    writeFileSync(join(dir, 'script.json'), `${JSON.stringify(built.lines, null, 1)}\n`);
    writeFileSync(join(dir, 'script.md'), `${scriptMarkdown(built.lines)}\n`);
    process.stdout.write(`wrote ${join(dir, 'script.json')} and ${join(dir, 'script.md')}\n`);
  }
}
