#!/usr/bin/env node
/**
 * Validate content/drafts/scene/*.json — the eight M8 "scene" decks
 * (docs/17-m8-the-scene.md §9) written on branch m8-scene-content.
 *
 * These decks don't have entries in content/deck-schema.json yet: the
 * engine branch (m8-scene) owns adding them there and moving the files
 * into content/decks/. Until then, this script is the schema, kept in
 * sync with §9 by hand. It checks:
 *
 *   - every file parses as an array of card objects with the fields the
 *     rest of the pipeline expects (id, deck, text, tags, motifs, status);
 *   - ids are unique, both within a deck and across all eight files;
 *   - every tag key/value pair is one §9 actually defines;
 *   - every {slot} used in a card's text is in that deck's slot list;
 *   - motifs (if any) are drawn from content/motifs.json;
 *   - card counts per key meet or exceed the §9 count target.
 *
 * Shape/id/tag/slot problems are errors (exit 1). A count shortfall is
 * reported but not fatal, the same way scripts/validate-decks.mjs treats
 * coverage gaps: the engine has to be able to run on a deck that's a
 * little thin in one cell without the build breaking.
 *
 *   node scripts/check-scene-drafts.mjs
 *   node scripts/check-scene-drafts.mjs --quiet   # errors and shortfalls only
 *   node scripts/check-scene-drafts.mjs --json
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DRAFTS_DIR = join(ROOT, 'content', 'drafts', 'scene');
const MOTIFS_PATH = join(ROOT, 'content', 'motifs.json');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const AS_JSON = argv.includes('--json');

/* ------------------------------------------------------------- vocab --- */

const motifsDoc = JSON.parse(readFileSync(MOTIFS_PATH, 'utf8'));
const MOTIF_VOCAB = new Set(Object.values(motifsDoc.groups ?? {}).flat());
const STATUSES = new Set(['generated', 'kept', 'tuned', 'cut', 'placeholder']);

// The 35 place template ids in src/gen/data/places.ts, plus 'office'
// (docs/17-m8-the-scene.md §9: establish is "keyed by place: every place
// template id ..., plus office"). Kept as a literal list rather than
// imported so this script has no dependency on the TypeScript build.
const PLACE_IDS = [
  'res-apartment', 'res-brownstone', 'res-walkup', 'res-suite', 'res-backhouse',
  'rooftop', 'back-alley', 'office-over-tailor', 'pier-shed', 'laundry-yard',
  'walkup-flat', 'hallam-vestibule', 'rooming-house-room',
  'dolans-bar', 'speakeasy', 'hotel-lobby', 'corner-newsstand', 'automat',
  'movie-house', 'dance-hall', 'drugstore', 'cab-stand', 'tenement-stairwell',
  'pool-hall', 'pawnshop', 'chop-suey', 'boarding-parlor', 'barber-shop',
  'hotel-garage', 'el-platform', 'square-benches', 'ferry-slip', 'subway-kiosk',
  'side-chapel', 'union-hall',
  'office',
];

const FIXTURE_ROLES = [
  'bartender', 'doorman', 'newsstand', 'counterman', 'ticket-taker',
  'elevator-man', 'landlady', 'beat-cop', 'cabbie', 'druggist',
];

// The 27 suspect archetype ids in src/gen/data/cast.ts.
const SUSPECT_ARCHETYPES = [
  'arch-heir', 'arch-widow', 'arch-broker', 'arch-society', 'arch-blockowner',
  'arch-lawyer', 'arch-bookkeeper', 'arch-nurse', 'arch-dentist', 'arch-secretary',
  'arch-reporter', 'arch-piano-teacher', 'arch-adjuster',
  'arch-chambermaid', 'arch-longshoreman', 'arch-seamstress', 'arch-hackman',
  'arch-tailor', 'arch-stagehand', 'arch-switchboard', 'arch-nightman', 'arch-chorus',
  'arch-bookmaker', 'arch-heeler', 'arch-pawnman', 'arch-bouncer', 'arch-runner',
];

// beat-cop is never a `watcher` for any place in src/gen/data/places.ts, so
// it has no reachable placeKind and the activity deck drops it entirely
// (coordinator review of PR #24 #6; noted in content/drafts/scene/README.md).
// It's still valid for the `watch` deck's fixtureRole vocabulary, which
// isn't scoped to places.ts assignments.
const ACTIVITY_FIXTURE_ROLES = FIXTURE_ROLES.filter((r) => r !== 'beat-cop');
const ACTIVITY_ROLES = [...ACTIVITY_FIXTURE_ROLES, ...SUSPECT_ARCHETYPES];

// Which placeKind(s) each fixture role is actually reachable at, per its
// `watcher` assignments in src/gen/data/places.ts. A suspect archetype can
// turn up at any of the three, so it isn't restricted here.
const FIXTURE_REACHABLE_PLACEKINDS = {
  bartender: ['semi'],
  doorman: ['semi'],
  newsstand: ['public'],
  counterman: ['public', 'semi'],
  'ticket-taker': ['public'],
  'elevator-man': ['private'],
  landlady: ['private', 'semi'],
  cabbie: ['public'],
  druggist: ['public'],
};
const ACTIVITY_REACHABLE_CELLS = ACTIVITY_ROLES.flatMap((role) => {
  const kinds = FIXTURE_REACHABLE_PLACEKINDS[role] ?? ['public', 'semi', 'private'];
  return kinds.map((placeKind) => [role, placeKind]);
});

const THOUGHT_CLASSES = [
  'clears', 'implicates', 'observer-placed', 'unmentioned', 'contradicts',
  'motive', 'method', 'window', 'not-robbery', 'robbery-shape', 'secret',
  'dead-end', 'context', 'nothing',
];

/**
 * Per §9. `target` is the count target FOR EACH VALUE of the listed key(s)
 * (a single string key, or an array for a compound key like activity's
 * role+placeKind). `slots` is every {slot} name the deck may use, beyond
 * the ones every card may carry (`motifs`, `weather` are fields, not
 * text slots, so they're not listed here).
 */
const SCENE_DECKS = {
  establish: {
    file: 'establish.json',
    idPrefix: 'est',
    tags: {
      place: { values: PLACE_IDS },
      visit: { values: ['first'] },
    },
    slots: ['place', 'watcher', 'owner'],
    countKey: ['place'],
    target: 4,
  },
  watch: {
    file: 'watch.json',
    idPrefix: 'wch',
    tags: {
      watcher: { values: [...FIXTURE_ROLES, 'none'] },
    },
    slots: ['watcher'],
    countKey: ['watcher'],
    target: 6,
  },
  return: {
    file: 'return.json',
    idPrefix: 'ret',
    tags: {
      placeKind: { values: ['public', 'semi', 'private', 'scene'] },
    },
    slots: ['place'],
    countKey: ['placeKind'],
    target: 10,
  },
  activity: {
    file: 'activity.json',
    idPrefix: 'act',
    tags: {
      role: { values: ACTIVITY_ROLES },
      placeKind: { values: ['public', 'semi', 'private'] },
      band: { values: ['after-midnight', 'small-hours', 'dawn'], optional: true },
    },
    slots: ['name', 'place'],
    countKey: ['role', 'placeKind'],
    reachableCells: ACTIVITY_REACHABLE_CELLS,
    target: 3,
  },
  thought: {
    file: 'thought.json',
    idPrefix: 'tht',
    tags: {
      class: { values: THOUGHT_CLASSES },
    },
    // {scene} added on the coordinator's review of PR #24 #3: the place
    // where it happened, distinct from {place} (an elsewhere a subject was
    // placed). Not in §9's original slot list for this deck -- see README.
    slots: ['subject', 'place', 'time', 'source', 'victim', 'other', 'scene'],
    countKey: ['class'],
    target: 12,
  },
  bridge: {
    file: 'bridge.json',
    idPrefix: 'brg',
    tags: {
      tie: { values: ['victim', 'place', 'time'] },
    },
    slots: ['who', 'subject', 'tie', 'where'],
    countKey: ['tie'],
    target: 15,
  },
  carry: {
    file: 'carry.json',
    idPrefix: 'cry',
    tags: {
      for: { values: ['ask-person', 'ask-thing', 'ask-place', 'ask-evening', 'ask-self', 'search-room', 'search-thing'] },
      lead: { values: ['yes', 'no'] },
    },
    slots: ['who', 'subject', 'name'],
    countKey: ['for', 'lead'],
    target: 10,
  },
  answer: {
    file: 'answer.json',
    idPrefix: 'ans',
    tags: {
      outcome: { values: ['found', 'dead-end', 'something-else'] },
    },
    slots: ['subject', 'name'],
    countKey: ['outcome'],
    target: 12,
  },
};

/* ------------------------------------------------------------ helpers --- */

const errors = [];
const shortfalls = [];
const allIds = new Map(); // id -> deck it was first seen in

function fail(msg) {
  errors.push(msg);
}

function slotNamesIn(text) {
  const out = new Set();
  const re = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  return out;
}

function cellKey(tags, countKey) {
  return countKey.map((k) => tags[k] ?? '∅').join(' × ');
}

/* -------------------------------------------------------------- checks --- */

function checkDeck(deckName, spec) {
  const path = join(DRAFTS_DIR, spec.file);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    fail(`${deckName}: missing file ${spec.file}`);
    return;
  }
  let cards;
  try {
    cards = JSON.parse(raw);
  } catch (e) {
    fail(`${deckName}: ${spec.file} is not valid JSON (${e.message})`);
    return;
  }
  if (!Array.isArray(cards)) {
    fail(`${deckName}: ${spec.file} must be a JSON array`);
    return;
  }

  const seenIds = new Set();
  const counts = new Map();
  let bandTagged = 0;

  for (const [i, c] of cards.entries()) {
    const where = `${deckName}[${i}]`;

    // shape
    for (const field of ['id', 'deck', 'text', 'tags', 'motifs', 'status']) {
      if (!(field in c)) fail(`${where}: missing field "${field}"`);
    }
    if (c.deck !== deckName) fail(`${where} (${c.id}): tags.deck is "${c.deck}", expected "${deckName}"`);
    if (typeof c.id !== 'string' || !c.id.startsWith(`${spec.idPrefix}-`)) {
      fail(`${where} (${c.id}): id should start with "${spec.idPrefix}-"`);
    }
    if (c.status !== undefined && !STATUSES.has(c.status)) {
      fail(`${where} (${c.id}): status "${c.status}" is not one of ${[...STATUSES].join(', ')}`);
    }
    if (c.status !== 'generated') {
      fail(`${where} (${c.id}): status is "${c.status}", expected "generated" for a fresh draft`);
    }

    // ids unique within deck and across all eight decks
    if (seenIds.has(c.id)) fail(`${where}: duplicate id "${c.id}" within ${deckName}`);
    seenIds.add(c.id);
    if (allIds.has(c.id)) {
      fail(`${where}: id "${c.id}" also used in ${allIds.get(c.id)}`);
    } else {
      allIds.set(c.id, deckName);
    }

    // tags
    const tags = c.tags ?? {};
    for (const [key, val] of Object.entries(tags)) {
      const tagSpec = spec.tags[key];
      if (!tagSpec) {
        fail(`${where} (${c.id}): tag "${key}" is not in the §9 vocabulary for ${deckName}`);
        continue;
      }
      if (!tagSpec.values.includes(val)) {
        fail(`${where} (${c.id}): tags.${key} = "${val}" is not one of ${JSON.stringify(tagSpec.values)}`);
      }
    }
    for (const [key, tagSpec] of Object.entries(spec.tags)) {
      if (!tagSpec.optional && !(key in tags)) {
        fail(`${where} (${c.id}): missing required tag "${key}"`);
      }
    }
    if (tags.band) bandTagged += 1;

    // slots used in text must be declared for the deck
    if (typeof c.text === 'string') {
      for (const slot of slotNamesIn(c.text)) {
        if (!spec.slots.includes(slot)) {
          fail(`${where} (${c.id}): slot {${slot}} is not in ${deckName}'s slot list [${spec.slots.join(', ')}]`);
        }
      }
      // an article never precedes a slot that carries its own (style-guide,
      // task brief): "the {place}", "a {subject}", etc.
      const artRe = /\b(the|a|an)\s+\{([a-zA-Z][a-zA-Z0-9_]*)\}/gi;
      let m;
      while ((m = artRe.exec(c.text))) {
        fail(`${where} (${c.id}): "${m[1]} {${m[2]}}" — an article before a slot that carries its own`);
      }
      // no pronoun may stand in for a slotted person (task brief: slotted
      // people vary in gender; the detective's gender is never stated).
      const pronounRe = /\b(he|him|his|she|her|hers|himself|herself)\b/i;
      if (pronounRe.test(c.text)) {
        fail(`${where} (${c.id}): gendered pronoun in text — no slot may be referred to by pronoun`);
      }
    }

    // motifs
    if (Array.isArray(c.motifs)) {
      if (c.motifs.length > 3) fail(`${where} (${c.id}): motifs has more than 3 entries`);
      for (const mo of c.motifs) {
        if (!MOTIF_VOCAB.has(mo)) fail(`${where} (${c.id}): motif "${mo}" is not in content/motifs.json`);
      }
    } else {
      fail(`${where} (${c.id}): motifs must be an array`);
    }

    // count per key
    const key = cellKey(tags, spec.countKey);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // count targets: every reachable cell of the count key should exist.
  // Most decks reach every combination of their count-key tag values; a few
  // (activity, after the coordinator's review of PR #24 #6) only reach a
  // subset, given as `reachableCells` -- e.g. a bartender is only ever the
  // watcher of a `semi` place, so activity has no `bartender`/`public` or
  // `bartender`/`private` cell to fill, and checking for one would be
  // checking for a card the generator can never deal.
  const cells = spec.reachableCells ?? cartesian(
    spec.countKey.map((k) => spec.tags[k].values),
  );
  for (const combo of cells) {
    const key = combo.join(' × ');
    const n = counts.get(key) ?? 0;
    if (n < spec.target) {
      shortfalls.push(`${deckName}: ${key} has ${n} cards, target ${spec.target}`);
    }
  }

  // activity's "band on at least a third" rule (§9).
  if (deckName === 'activity' && cards.length > 0) {
    const frac = bandTagged / cards.length;
    if (frac < 1 / 3 - 1e-9) {
      shortfalls.push(`activity: only ${bandTagged}/${cards.length} cards (${(frac * 100).toFixed(1)}%) carry a band tag, target >= 1/3`);
    }
  }

  return { count: cards.length };
}

function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((prefix) => arr.map((v) => [...prefix, v])),
    [[]],
  );
}

/* ---------------------------------------------------------------- run --- */

const summary = {};
for (const [deckName, spec] of Object.entries(SCENE_DECKS)) {
  const result = checkDeck(deckName, spec);
  if (result) summary[deckName] = result.count;
}

// every file in the directory should belong to a known deck
try {
  const known = new Set(Object.values(SCENE_DECKS).map((s) => s.file));
  for (const f of readdirSync(DRAFTS_DIR)) {
    if (f.endsWith('.json') && !known.has(f)) {
      fail(`unexpected file content/drafts/scene/${f} — not one of the eight §9 decks`);
    }
  }
} catch {
  fail(`content/drafts/scene/ does not exist`);
}

if (AS_JSON) {
  console.log(JSON.stringify({ summary, errors, shortfalls }, null, 2));
} else {
  if (!QUIET) {
    console.log('Card counts:');
    for (const [deck, n] of Object.entries(summary)) console.log(`  ${deck}: ${n}`);
    console.log(`  total: ${Object.values(summary).reduce((a, b) => a + b, 0)}`);
  }
  if (shortfalls.length) {
    console.log(`\n${shortfalls.length} count shortfall(s) (reported, not fatal):`);
    for (const s of shortfalls) console.log(`  - ${s}`);
  } else if (!QUIET) {
    console.log('\nEvery §9 count target is met.');
  }
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  ! ${e}`);
  } else if (!QUIET) {
    console.log('No shape/id/tag/slot errors.');
  }
}

process.exit(errors.length > 0 ? 1 : 0);
