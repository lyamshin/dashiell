#!/usr/bin/env node
/**
 * Check the place-name drafts (content/drafts/places/names.json, streets.json).
 *
 * Errors (exit 1):
 *   - coverage: every template id in src/gen/data/places.ts has 6–10 name
 *     sets, and names.json has no template the place deck lacks
 *   - shape: id (unique across the file), proper, local (1–3), short (1–2
 *     words), epithets (3–5), sense (non-empty, from sound/sight/smell),
 *     fits (known neighbourhoods) and keeping (true) optional
 *   - slots: only {street} {avenue} {V} {W}; {W} only on landlady-watched
 *     templates; every residence set has {V} in proper, local and short;
 *     outside residences {V} appears only on keeping sets, and every keeping
 *     set has it in proper and short; each template keeps at least three sets
 *     any neighbourhood can draw that are not keeping sets
 *   - words: plain terms (content/plain-terms.json); clock times; case words;
 *     the words of evidence objects, lost pets and items, and timed anchors,
 *     which are case facts and must never be a place's description; family
 *     names the cast generator deals (src/gen/data/names.ts)
 *   - epithets start lower-case and carry no closing full stop
 *   - streets.json: all twelve neighbourhoods, at least three streets and
 *     three avenues each, no street in both lists
 *
 * Warnings (exit 0): the same local form on two templates (a night that deals
 * both would have two places answering to one name); a proper or epithet
 * repeated word for word.
 *
 *   node scripts/check-place-names.mjs [--table]
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TABLE = process.argv.includes('--table');
const DIR = join(ROOT, 'content', 'drafts', 'places');

const names = JSON.parse(readFileSync(join(DIR, 'names.json'), 'utf8'));
const streets = JSON.parse(readFileSync(join(DIR, 'streets.json'), 'utf8'));
const placesSrc = readFileSync(join(ROOT, 'src', 'gen', 'data', 'places.ts'), 'utf8');
const namesSrc = readFileSync(join(ROOT, 'src', 'gen', 'data', 'names.ts'), 'utf8');
const plain = loadPlainTerms();

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------ what the deck holds */
const templates = new Map();
for (const block of placesSrc.split(/\n  \{\n/).slice(1)) {
  const id = /id: '([^']+)'/.exec(block)?.[1];
  if (!id) continue;
  templates.set(id, {
    watcher: /watcher: '([^']+)'/.exec(block)?.[1],
    residence: /isResidence: true/.test(block),
  });
}
const hoods = [...(/NEIGHBORHOODS: string\[\] = \[([\s\S]*?)\]/.exec(placesSrc)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
  (m) => m[1],
);
const castFamilies = [...namesSrc.matchAll(/family: \[([^\]]+)\]/g)].flatMap((m) =>
  [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
);

/* ---------------------------------------------------------- word lists */
const SLOTS = new Set(['{street}', '{avenue}', '{V}', '{W}']);
const SENSES = new Set(['sound', 'sight', 'smell']);
const CLOCK =
  /\b(?:\d{1,2}(?::\d\d)?\s*(?:a\.?m\.?|p\.?m\.?|o[’']clock)|half past|quarter (?:past|to)|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) o[’']clock|midnight)\b/i;
const CASE =
  /\b(?:murder\w*|kill\w*|dead|death|died|dying|corpse|body|bodies|blood\w*|poison\w*|stab(?:s|bed|bing)?|strangl\w*|shot|shoot\w*|guns?|knife|knives|weapons?|suspects?|alibis?|witness\w*|detectives?|clues?|coroner|crime|police|cops?|thief|thieves|stolen|steal\w*|blackmail\w*)\b/i;
// Evidence objects (src/gen/data/objects.ts), the M14 pets and lost items, and
// the timed anchors (src/gen/data/anchors.ts). Each is a fact in some case.
const FACT =
  /\b(?:revolver|bookends?|cords?|chloral|cash ?box|typewriters?|photographs?|cigarette cases?|umbrellas?|overcoats?|suitcases?|pawn tickets?|timetables?|newspapers?|evening papers?|mops?|buckets?|seltzer|siphons?|flower ?pots?|tool ?box(?:es)?|hat ?box(?:es)?|ashtrays?|telephones?|phones?|ledgers?|roof[- ]door keys?|roof keys?|ice ?picks?|payroll|bonds|jewel\w*|rings?|watch|watches|medals?|false teeth|teeth|troph(?:y|ies)|terriers?|dogs?|cats?|tomcats?|parrots?|goats?|radios?|boxing|stools?|pianos?|bells?|fuses?|dumbwaiters?|milk ?wagons?|milkm[ae]n|ice|iceman|whistles?|sing|sings|singing|sang|last edition|rain\w*|shift change|beat cop|let out|letting out)\b/i;

/* ------------------------------------------------------------- checks */
const seenIds = new Set();
const localOwners = new Map();
const textSeen = new Map();
const counts = [];

function scanWords(where, text) {
  for (const h of findJargon(text, plain)) err(`${where}: plain terms: "${h.match}" (${h.term}) — write ${h.plain}`);
  if (CLOCK.test(text)) err(`${where}: clock time: ${text}`);
  const c = CASE.exec(text);
  if (c) err(`${where}: case word "${c[0]}": ${text}`);
  const f = FACT.exec(text);
  if (f) err(`${where}: a case fact's word "${f[0]}" (object, pet, lost item or anchor): ${text}`);
  for (const fam of castFamilies) {
    if (new RegExp(`\\b${fam}\\b`).test(text))
      err(`${where}: "${fam}" is a family name the cast generator deals: ${text}`);
  }
  for (const m of text.matchAll(/\{[^}]*\}/g)) if (!SLOTS.has(m[0])) err(`${where}: unknown slot ${m[0]}`);
}

const tmap = names.templates ?? {};
for (const id of templates.keys()) if (!tmap[id]) err(`template ${id}: no name sets`);
for (const [tid, sets] of Object.entries(tmap)) {
  const t = templates.get(tid);
  if (!t) {
    err(`template ${tid}: not in src/gen/data/places.ts`);
    continue;
  }
  if (!Array.isArray(sets) || sets.length < 6 || sets.length > 10)
    err(`template ${tid}: ${sets?.length} sets, want 6–10`);
  let open = 0;
  let keeping = 0;
  let fitted = 0;
  for (const s of sets) {
    const where = `${tid}/${s.id}`;
    if (typeof s.id !== 'string' || !s.id) err(`${tid}: a set without an id`);
    else if (seenIds.has(s.id)) err(`${where}: duplicate id`);
    else seenIds.add(s.id);
    for (const k of Object.keys(s)) {
      if (!['id', 'proper', 'local', 'short', 'epithets', 'sense', 'fits', 'keeping'].includes(k))
        err(`${where}: unknown field ${k}`);
    }
    if (typeof s.proper !== 'string' || !s.proper) err(`${where}: proper missing`);
    if (!Array.isArray(s.local) || s.local.length < 1 || s.local.length > 3) err(`${where}: local wants 1–3 forms`);
    if (typeof s.short !== 'string' || !s.short) err(`${where}: short missing`);
    else if (s.short.trim().split(/\s+/).length > 2) err(`${where}: short "${s.short}" is more than two words`);
    if (!Array.isArray(s.epithets) || s.epithets.length < 3 || s.epithets.length > 5)
      err(`${where}: epithets want 3–5`);
    if (!Array.isArray(s.sense) || s.sense.length < 1 || s.sense.some((x) => !SENSES.has(x)))
      err(`${where}: sense wants sound/sight/smell`);
    if (s.fits !== undefined) {
      if (!Array.isArray(s.fits) || s.fits.length === 0) err(`${where}: fits must be a non-empty list`);
      else for (const h of s.fits) if (!hoods.includes(h)) err(`${where}: unknown neighbourhood "${h}"`);
    }
    if (s.keeping !== undefined && s.keeping !== true) err(`${where}: keeping is true or absent`);

    const all = [s.proper, ...(s.local ?? []), s.short, ...(s.epithets ?? [])].filter((x) => typeof x === 'string');
    for (const x of all) scanWords(where, x);
    for (const e of s.epithets ?? []) {
      if (!/^[a-z]/.test(e)) err(`${where}: epithet should start lower-case: ${e}`);
      if (/[.]$/.test(e)) err(`${where}: epithet ends with a full stop: ${e}`);
      const prev = textSeen.get(e);
      if (prev) warn(`${where}: epithet also on ${prev}: ${e}`);
      else textSeen.set(e, where);
    }
    if (textSeen.has(`P:${s.proper}`)) warn(`${where}: proper repeated`);
    textSeen.set(`P:${s.proper}`, where);

    const hasV = all.some((x) => x.includes('{V}'));
    const hasW = all.some((x) => x.includes('{W}'));
    if (hasW && t.watcher !== 'landlady') err(`${where}: {W} on a template with no landlady`);
    if (t.residence) {
      for (const [k, v] of [
        ['proper', s.proper],
        ['short', s.short],
      ])
        if (!String(v).includes('{V}')) err(`${where}: residence ${k} lacks {V}`);
      if (!(s.local ?? []).some((l) => l.includes('{V}'))) err(`${where}: residence local lacks a {V} form`);
      if (s.keeping) err(`${where}: residences are {V}'s by definition; drop keeping`);
    } else if (s.keeping) {
      keeping++;
      if (!s.proper.includes('{V}') || !s.short.includes('{V}'))
        err(`${where}: keeping set needs {V} in proper and short`);
    } else if (hasV) {
      err(`${where}: {V} outside a residence or keeping set`);
    }
    if (s.fits) fitted++;
    if (!s.fits && !s.keeping) open++;

    if (!s.keeping && !t.residence) {
      for (const l of s.local ?? []) {
        const key = l.toLowerCase();
        // {V} and {W} forms carry a case person's name; one landlady per case.
        if (/\{[VW]\}/.test(l)) continue;
        const owners = localOwners.get(key) ?? new Set();
        owners.add(tid);
        localOwners.set(key, owners);
      }
    }
  }
  if (open < 3) err(`template ${tid}: only ${open} sets that any neighbourhood can draw, want at least 3`);
  counts.push({ tid, total: sets.length, open, fitted, keeping });
}
for (const [l, owners] of localOwners) {
  if (
    owners.size > 1 &&
    ![
      'the chapel',
      'the union hall',
      'the ferry',
      'the el',
      'the subway',
      'the kiosk',
      'the square',
      'the benches',
      'the stairwell',
      'the third floor',
      'the cab stand',
      'the automat',
      'the pier',
      'the slip',
      'the park',
      'the hall',
      'the garage',
      'the parlour',
      'the back room',
      'the station',
      'the platform',
      'the newsstand',
      'the corner stand',
      'the roof',
      'the drying yard',
      'the chop suey place',
      'the academy',
    ].includes(l)
  ) {
    warn(`local "${l}" on ${[...owners].join(', ')}`);
  }
}

/* ------------------------------------------------------------- streets */
for (const h of hoods) {
  const n = streets.neighbourhoods?.[h];
  if (!n) {
    err(`streets.json: no entry for ${h}`);
    continue;
  }
  if ((n.streets ?? []).length < 3) err(`streets.json ${h}: fewer than three streets`);
  if ((n.avenues ?? []).length < 3) err(`streets.json ${h}: fewer than three avenues`);
  for (const x of n.streets ?? []) if ((n.avenues ?? []).includes(x)) err(`streets.json ${h}: ${x} is in both lists`);
}
for (const h of Object.keys(streets.neighbourhoods ?? {}))
  if (!hoods.includes(h)) err(`streets.json: unknown neighbourhood ${h}`);

/* ------------------------------------------------------------- report */
if (TABLE) {
  console.log('| template | sets | any neighbourhood | fitted | keeping |');
  console.log('|---|---|---|---|---|');
  for (const c of counts) console.log(`| ${c.tid} | ${c.total} | ${c.open} | ${c.fitted} | ${c.keeping} |`);
  console.log(`| **total** | **${counts.reduce((a, c) => a + c.total, 0)}** | | | |`);
}
for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error: ${e}`);
console.log(
  `${counts.length} templates, ${counts.reduce((a, c) => a + c.total, 0)} name sets, ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
