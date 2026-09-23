#!/usr/bin/env node
/**
 * Check the M11 archetype character cards (docs/28-m11-people.md Part C).
 *
 * The deck is written into `content/drafts/character/character.json` while
 * the engine side registers `character` in content/deck-schema.json, so this
 * script carries the Part C shape itself rather than reading the schema.
 * When the drafts move into content/decks/, `npm run decks` takes over the
 * shape and this stays as the check for what only this deck needs: counts per
 * role and kind, the pairings, and the "true of the type" rules.
 *
 * Errors (exit 1):
 *   - shape: an array of cards with id, deck, text, tags, status (motifs
 *     optional); id `chr-NNN` and unique; deck "character"; status known
 *   - tags: role is a suspect archetype id (src/gen/data/cast.ts) or a
 *     fixture role (content/deck-schema.json vocab.fixtureRole); kind is one
 *     of look, street, talk, victim, client; victimRole on victim cards only,
 *     a victim archetype id or "any", and not a pairing the generator never
 *     deals (the victim's `allowedSuspects`); gender, if present, m/f/any
 *   - counts: at least 3 look, street, talk and client cards per role, at
 *     least 2 `any` victim cards per role, and at least 2 cards for every
 *     named pairing a role has
 *   - slots: only {name} {He} {he} {his} {him} {victim} {place}; the subject
 *     slots and {name} never in first-person kinds (talk, victim); {victim}
 *     only on victim cards; {place} only on fixture roles; a sentence never
 *     starts with a lower-case subject slot
 *   - plain terms (content/plain-terms.json), clock times, named places,
 *     case words (murder, killed, poison…), and on victim cards the motive
 *     words (hate, revenge, jealous, blackmail…)
 *   - the same text twice; two cards of one role and kind opening with the
 *     same two words
 *
 * Warnings (reported, exit 0), for a reader's eye:
 *   - a bare he/she/him/her/his outside a slot (fine when it is somebody
 *     generic — "a treasurer who counts alone" — never for the subject or
 *     the victim)
 *   - a gendered noun (man, woman, girl…) on a role whose gender the
 *     generator does not fix
 *   - more than one figure (like a / like the / as if / as though)
 *   - a card over 55 words
 *
 *   node scripts/check-character-drafts.mjs [path] [--table]
 *
 * `--table` prints the role × kind counts as a Markdown table.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const args = process.argv.slice(2);
const TABLE = args.includes('--table');
const DECK_PATH = resolve(args.find((a) => !a.startsWith('--')) ?? join(ROOT, 'content', 'drafts', 'character', 'character.json'));

/* ---------------------------------------------------------------- the roles */

const castSrc = readFileSync(join(ROOT, 'src', 'gen', 'data', 'cast.ts'), 'utf8');
const genSrc = readFileSync(join(ROOT, 'src', 'gen', 'cast.ts'), 'utf8');
const schema = JSON.parse(readFileSync(join(ROOT, 'content', 'deck-schema.json'), 'utf8'));

/** Split cast.ts into `{ id: '…', … }` blocks by id, so each field is read off its own archetype. */
function blocks(prefix) {
  const re = new RegExp(`id: '(${prefix}-[\\w-]+)'`, 'g');
  const hits = [...castSrc.matchAll(re)];
  return hits.map((m, i) => ({
    id: m[1],
    body: castSrc.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : castSrc.length),
  }));
}

const SUSPECTS = blocks('arch');
const VICTIMS = blocks('vic');
const FIXTURES = schema.vocab.fixtureRole;
if (SUSPECTS.length === 0 || VICTIMS.length === 0 || !Array.isArray(FIXTURES)) {
  console.error('could not read the roles from src/gen/data/cast.ts and content/deck-schema.json');
  process.exit(1);
}
const SUSPECT_IDS = SUSPECTS.map((s) => s.id);
const ROLES = [...SUSPECT_IDS, ...FIXTURES];
const ROLE_SET = new Set(ROLES);
const VICTIM_IDS = new Set(VICTIMS.map((v) => v.id));

/** Which suspects each victim archetype can be dealt with (`except(…)` lists). */
const EXCLUDED = {};
for (const v of VICTIMS) {
  const m = v.body.match(/allowedSuspects:\s*except\(([^)]*)\)/);
  EXCLUDED[v.id] = new Set(m ? [...m[1].matchAll(/'([\w-]+)'/g)].map((x) => x[1]) : []);
}

/** Roles whose gender the generator fixes: genderHint on a suspect, FIXTURE_GENDER on a fixture. */
const FIXED_GENDER = new Set();
for (const s of SUSPECTS) {
  const m = s.body.match(/genderHint:\s*'([mf])'/);
  if (m && s.body.indexOf('genderHint') < s.body.indexOf('relationships')) FIXED_GENDER.add(s.id);
}
const fg = genSrc.match(/FIXTURE_GENDER[^=]*=\s*\{([\s\S]*?)\};/);
if (fg) for (const m of fg[1].matchAll(/'?([\w-]+)'?\s*:\s*'(?:male|female)'/g)) FIXED_GENDER.add(m[1]);

/* ---------------------------------------------------------------- the rules */

const KINDS = ['look', 'street', 'talk', 'client', 'victim'];
const COUNTED = ['look', 'street', 'talk', 'client'];
const FIRST_PERSON = new Set(['talk', 'victim']);
const MIN_PER_KIND = 3;
const MIN_ANY = 2;
const MIN_PER_PAIRING = 2;
const STATUSES = new Set(schema.common?.statuses ?? ['generated', 'kept', 'tuned', 'cut', 'placeholder']);
const TOP_FIELDS = new Set(['id', 'deck', 'text', 'tags', 'status', 'motifs']);
const TAG_KEYS = new Set(['role', 'kind', 'victimRole', 'gender']);
const SLOTS = new Set(['name', 'He', 'he', 'his', 'him', 'victim', 'place']);
const SUBJECT_SLOTS = ['{He}', '{he}', '{his}', '{him}', '{name}'];

const CLOCK = /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?=\W|$)|\b\d{1,2}:\d{2}\b|o[’']clock|\bhalf past\b|\bquarter (?:past|to)\b|\bmidnight\b|\bnoon\b/i;
const PLACES = /\b(?:Broadway|Bowery|Brooklyn|Bronx|Harlem|Queens|Manhattan|Flushing|Newark|Jersey|Coney|Chinatown|Canal Street|Mulberry|Wall Street|Times Square|East Side|West Side|Hell[’']s Kitchen|Selwyn|France|Europe)\b|\b[A-Z][a-z]+ (?:Street|Avenue|Square|Park|Place|Pier)\b/;
const CASE_WORDS = /\b(?:murder\w*|kill(?:ed|er|ing|s)?|poison\w*|strangl\w*|stabb\w*|shot dead|corpse|body was)\b/i;
const MOTIVE_WORDS = /\b(?:hat(?:e|ed|red)|revenge|jealous\w*|blackmail\w*|grudge|motive|wanted \S+ dead|owed me|I owed|(?:dead|death|died)\b)/i;
const BARE_PRONOUN = /(?<![{\w])(?:he|she|him|her|his|hers)(?![}\w])/gi;
const GENDERED = /\b(?:man|men|woman|women|girl|girls|boy|lady|gentleman|husband|wife|mother|father|son|daughter|fellow)\b/i;
const FIGURE = /\blike (?:an?|the)\b|\bas if\b|\bas though\b/gi;

/* ----------------------------------------------------------------- checking */

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

let cards;
try {
  cards = JSON.parse(readFileSync(DECK_PATH, 'utf8'));
} catch (e) {
  console.error(`cannot read ${DECK_PATH}: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(cards)) {
  console.error(`${DECK_PATH}: expected an array of cards`);
  process.exit(1);
}

const plain = loadPlainTerms();
const ids = new Set();
const texts = new Map();
const openings = new Map(); // role|kind|w1 w2 -> id
const deckOpenings = new Map();
const count = {}; // role -> kind -> n
const pairings = {}; // role -> victimRole -> n
for (const r of ROLES) {
  count[r] = Object.fromEntries(KINDS.map((k) => [k, 0]));
  pairings[r] = {};
}

for (const [i, c] of cards.entries()) {
  const where = c?.id ?? `#${i}`;
  if (c === null || typeof c !== 'object') {
    err(where, 'not an object');
    continue;
  }
  for (const k of Object.keys(c)) if (!TOP_FIELDS.has(k)) err(where, `unexpected field "${k}"`);
  for (const k of ['id', 'deck', 'text', 'tags', 'status']) if (!(k in c)) err(where, `missing "${k}"`);

  if (typeof c.id !== 'string' || !/^chr-\d{3,4}$/.test(c.id)) err(where, 'id must be chr-NNN');
  else if (ids.has(c.id)) err(where, 'duplicate id');
  else ids.add(c.id);
  if (c.deck !== 'character') err(where, `deck must be "character", got ${JSON.stringify(c.deck)}`);
  if (!STATUSES.has(c.status)) err(where, `status ${JSON.stringify(c.status)} is not one of ${[...STATUSES].join(', ')}`);
  if (c.motifs !== undefined && !Array.isArray(c.motifs)) err(where, 'motifs must be a list');

  const t = c.tags ?? {};
  if (typeof t !== 'object') {
    err(where, 'tags must be an object');
    continue;
  }
  for (const k of Object.keys(t)) if (!TAG_KEYS.has(k)) err(where, `unexpected tag "${k}"`);
  const role = t.role;
  const kind = t.kind;
  if (!ROLE_SET.has(role)) err(where, `role ${JSON.stringify(role)} is not a suspect archetype or fixture role`);
  if (!KINDS.includes(kind)) err(where, `kind ${JSON.stringify(kind)} is not one of ${KINDS.join(', ')}`);
  if (t.gender !== undefined && !['m', 'f', 'any'].includes(t.gender)) err(where, `gender ${JSON.stringify(t.gender)}`);
  if (kind === 'victim') {
    const v = t.victimRole;
    if (v !== 'any' && !VICTIM_IDS.has(v)) err(where, `victimRole ${JSON.stringify(v)} is not a victim archetype or "any"`);
    else if (v !== 'any' && EXCLUDED[v]?.has(role)) err(where, `${role} is never dealt with ${v} (allowedSuspects)`);
  } else if (t.victimRole !== undefined) err(where, 'victimRole on a card that is not a victim card');

  if (ROLE_SET.has(role) && KINDS.includes(kind)) {
    count[role][kind]++;
    if (kind === 'victim' && typeof t.victimRole === 'string') {
      pairings[role][t.victimRole] = (pairings[role][t.victimRole] ?? 0) + 1;
    }
  }

  const text = c.text;
  if (typeof text !== 'string' || text.trim().length === 0) {
    err(where, 'empty text');
    continue;
  }

  // slots
  for (const m of text.matchAll(/\{([^}]*)\}/g)) {
    if (!SLOTS.has(m[1])) err(where, `slot {${m[1]}} is not allowed (${[...SLOTS].map((s) => `{${s}}`).join(' ')})`);
  }
  if (/[{}]/.test(text.replace(/\{[^{}]*\}/g, ''))) err(where, 'unbalanced brace');
  if (FIRST_PERSON.has(kind)) {
    for (const s of SUBJECT_SLOTS) if (text.includes(s)) err(where, `${s} in a first-person ${kind} card`);
  }
  if (text.includes('{victim}') && kind !== 'victim') err(where, '{victim} outside a victim card');
  if (text.includes('{place}') && !FIXTURES.includes(role)) err(where, '{place} on a suspect role (only a fixture has a post)');
  if (/(?:^|[.!?]\s+)\{(?:he|his|him)\}/.test(text)) err(where, 'sentence starts with a lower-case slot (write {He}, or recast)');
  if (/\{(?:He)\}/.test(text.replace(/(?:^|[.!?:—]\s*|[‘“]\s*)\{He\}/g, ''))) err(where, '{He} mid-sentence (write {he})');

  // words
  for (const hit of findJargon(text, plain)) err(where, `says "${hit.match}" — ${hit.term}; say what it is: ${hit.plain}`);
  if (CLOCK.test(text)) err(where, `clock time: "${text.match(CLOCK)[0]}"`);
  if (PLACES.test(text)) err(where, `named place: "${text.match(PLACES)[0]}" (only {place})`);
  if (CASE_WORDS.test(text)) err(where, `case word: "${text.match(CASE_WORDS)[0]}"`);
  if (kind === 'victim' && MOTIVE_WORDS.test(text)) err(where, `motive word on a victim card: "${text.match(MOTIVE_WORDS)[0]}"`);
  if (/"/.test(text)) err(where, 'straight double quote (the deck writes ‘ ’ inside speech)');

  // sameness
  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (texts.has(norm)) err(where, `same text as ${texts.get(norm)}`);
  else texts.set(norm, where);
  const open = text.split(/\s+/).slice(0, 2).join(' ').replace(/[,.:;]$/, '').toLowerCase();
  const key = `${role}|${kind}|${open}`;
  if (kind !== 'victim' || t.victimRole === 'any') {
    if (openings.has(key)) err(where, `opens "${open}" like ${openings.get(key)} (same role and kind)`);
    else openings.set(key, where);
  }
  deckOpenings.set(open, (deckOpenings.get(open) ?? 0) + 1);

  // for a reader's eye
  const bare = [...text.replace(/\{[^}]*\}/g, ' ').matchAll(BARE_PRONOUN)].map((m) => m[0]);
  if (bare.length) warn(where, `bare pronoun ${[...new Set(bare)].join('/')} — ${text}`);
  if (!FIXED_GENDER.has(role) && t.gender === undefined && GENDERED.test(text)) {
    warn(where, `"${text.match(GENDERED)[0]}" on ${role}, whose gender is not fixed — ${text}`);
  }
  const figures = text.match(FIGURE) ?? [];
  if (figures.length > 1) warn(where, `${figures.length} figures — ${text}`);
  const words = text.split(/\s+/).length;
  if (words > 55) warn(where, `${words} words`);
}

// counts
for (const r of ROLES) {
  for (const k of COUNTED) {
    if (count[r][k] < MIN_PER_KIND) err(r, `${count[r][k]} ${k} card(s), wants at least ${MIN_PER_KIND}`);
  }
  const any = pairings[r].any ?? 0;
  if (any < MIN_ANY) err(r, `${any} victim "any" card(s), wants at least ${MIN_ANY}`);
  const named = Object.entries(pairings[r]).filter(([v]) => v !== 'any');
  if (named.length === 0) err(r, 'no victim pairing');
  for (const [v, n] of named) if (n < MIN_PER_PAIRING) err(r, `${n} card(s) for the pairing with ${v}, wants at least ${MIN_PER_PAIRING}`);
}

/* ------------------------------------------------------------------ report */

const total = cards.length;
console.log(`character drafts: ${total} cards, ${ROLES.length} roles (${SUSPECT_IDS.length} suspect archetypes, ${FIXTURES.length} fixtures) · ${DECK_PATH.replace(ROOT + '/', '')}`);
const byKind = Object.fromEntries(KINDS.map((k) => [k, cards.filter((c) => c?.tags?.kind === k).length]));
console.log(`by kind: ${KINDS.map((k) => `${k} ${byKind[k]}`).join(' · ')}`);
const pairCount = ROLES.reduce((n, r) => n + Object.keys(pairings[r]).filter((v) => v !== 'any').length, 0);
console.log(`victim pairings: ${pairCount} across ${ROLES.length} roles`);
const top = [...deckOpenings.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`commonest openings: ${top.map(([o, n]) => `"${o}" ${n}`).join(' · ')}`);

if (TABLE) {
  console.log('\n| role | look | street | talk | client | victim (any) | victim pairings |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of ROLES) {
    const named = Object.entries(pairings[r])
      .filter(([v]) => v !== 'any')
      .map(([v, n]) => `${v.replace(/^vic-/, '')} ${n}`)
      .join(', ');
    console.log(`| ${r} | ${count[r].look} | ${count[r].street} | ${count[r].talk} | ${count[r].client} | ${pairings[r].any ?? 0} | ${named} |`);
  }
  console.log('');
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
console.log('\nOK');
