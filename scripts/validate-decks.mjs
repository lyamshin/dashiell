#!/usr/bin/env node
/**
 * Validate the fragment decks against the M4 Part B schema, and report which
 * tag combinations have no cards in them.
 *
 * Node, zero dependencies. The schema is data — `content/deck-schema.json` —
 * and the engine's loader reads the same file, so a deck that passes here is a
 * deck the engine can deal.
 *
 *   node scripts/validate-decks.mjs                      # every deck
 *   node scripts/validate-decks.mjs content/decks/frames.json
 *   node scripts/validate-decks.mjs --deck utterances
 *   node scripts/validate-decks.mjs --quiet              # errors and gaps only
 *   node scripts/validate-decks.mjs --json
 *
 * Exit code is 1 if any card fails the schema, 0 otherwise. A coverage gap is
 * reported, never fatal: the engine is required to degrade through one.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DECK_DIR = join(ROOT, 'content', 'decks');
const SCHEMA_PATH = join(ROOT, 'content', 'deck-schema.json');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

/**
 * M4b §A.2 — a vocabulary too long to keep in two places lives in its own
 * file, and the schema says which. `content/motifs.json` is the only one so
 * far: seventy words in seven groups, and it is closed. A word outside it is
 * an error and not a warning, because scoring on a word nothing else uses is
 * scoring on nothing.
 */
for (const [name, file] of Object.entries(schema.vocabFiles ?? {})) {
  const path = join(ROOT, 'content', file);
  const loaded = JSON.parse(readFileSync(path, 'utf8'));
  schema.vocab[name] = Object.values(loaded.groups ?? {}).flat();
}
const MOTIF_VOCAB = new Set(schema.vocab.motifs ?? []);

/**
 * "Say what it is" (docs/style-guide.md): no card may use a term on the
 * banned list in `content/plain-terms.json`, in any field a player reads. A
 * hit is an error, except in a deck the list names as pending another pass's
 * rewrite, where it is a warning until that pass lands.
 */
const PLAIN_TERMS = loadPlainTerms();
const PLAIN_PENDING = new Set(PLAIN_TERMS.pendingDecks?.decks ?? []);
const PLAYER_FIELDS = ['text', 'recall', 'recallAction'];
let plainErrors = 0;
let plainPending = 0;
const MOTIF_MAX = schema.commonFields?.motifs?.max ?? 3;
const WEATHER_VALUES = new Set([
  ...(schema.vocab.weather ?? []),
  ...(schema.commonFields?.weather?.extraValues ?? []),
]);

/** A deck's tags, with the schema's `commonTags` underneath its own. */
function tagsOf(deckName) {
  return { ...(schema.commonTags ?? {}), ...schema.decks[deckName].tags };
}

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2)));
const wantedDecks = [];
const files = [];
for (let i = 0; i < argv.length; i++) {
  const token = argv[i];
  if (token === '--deck') {
    wantedDecks.push(argv[++i]);
    continue;
  }
  if (token.startsWith('--')) continue;
  files.push(token);
}

/** Which deck a file belongs to, by its basename. */
function deckOfFile(file) {
  const name = basename(file);
  for (const [deckName, spec] of Object.entries(schema.decks)) {
    if (spec.file === name) return deckName;
  }
  return null;
}

function decksToCheck() {
  if (files.length > 0) {
    return files.map((f) => {
      const path = resolve(process.cwd(), f);
      const deckName = deckOfFile(path);
      if (!deckName) {
        console.error(`no deck in the schema owns ${basename(path)}`);
        process.exit(2);
      }
      return { deckName, path };
    });
  }
  const names =
    wantedDecks.length > 0 ? wantedDecks : Object.keys(schema.decks);
  return names.map((deckName) => {
    const spec = schema.decks[deckName];
    if (!spec) {
      console.error(`no such deck: ${deckName}`);
      process.exit(2);
    }
    return { deckName, path: join(DECK_DIR, spec.file) };
  });
}

/* ---------------------------------------------------------------- schema */

function allowedValues(deckName, tagName) {
  const tag = tagsOf(deckName)[tagName];
  const out = [];
  if (tag.vocab) out.push(...schema.vocab[tag.vocab]);
  if (tag.values) out.push(...tag.values);
  if (tag.extraValues) out.push(...tag.extraValues);
  return out;
}

/** Every tag value on a card, with legacy names folded onto modern ones. */
function readTags(deckName, card) {
  const spec = schema.decks[deckName];
  void spec;
  const raw = card.tags && typeof card.tags === 'object' ? card.tags : {};
  const out = {};
  for (const [tagName, tag] of Object.entries(tagsOf(deckName))) {
    let value = raw[tagName];
    if (value === undefined && tag.alias !== undefined) value = raw[tag.alias];
    if (value === undefined && tag.default !== undefined) value = tag.default;
    if (value !== undefined) out[tagName] = value;
  }
  return out;
}

const SLOT_RE = /\{(\w+)\}/g;
function slotsOf(text) {
  const out = new Set();
  for (const m in []) void m;
  let m;
  SLOT_RE.lastIndex = 0;
  while ((m = SLOT_RE.exec(String(text))) !== null) out.add(m[1]);
  return [...out];
}

function validateDeck(deckName, path) {
  const spec = schema.decks[deckName];
  const report = {
    deck: deckName,
    file: spec.file,
    exists: existsSync(path),
    burn: spec.burn,
    target: spec.target ?? null,
    legacy: spec.legacy ?? null,
    count: 0,
    byStatus: {},
    errors: [],
    warnings: [],
    gaps: [],
    thin: [],
    cells: 0,
    filled: 0,
    /** M4b §A.2 coverage: how many cards carry a motif, and which. */
    tagged: 0,
    motifCounts: {},
    unusedMotifs: [],
  };
  if (!report.exists) {
    // M4b §B.4's three decks are written on another branch. The engine is
    // required to run without them and falls back to a hand-written line, so
    // a missing optional deck is a gap and never fatal.
    if (spec.optional) report.gaps.push(`${spec.file} is not written yet`);
    else report.errors.push(`${spec.file} does not exist yet`);
    return report;
  }

  let cards;
  try {
    cards = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    report.errors.push(`${spec.file} is not JSON: ${err.message}`);
    return report;
  }
  if (!Array.isArray(cards)) {
    report.errors.push(`${spec.file} is not an array of cards`);
    return report;
  }
  report.count = cards.length;

  const seenIds = new Set();
  const knownSlots = new Set([...(schema.common.slots ?? []), ...(spec.slots ?? [])]);

  cards.forEach((card, i) => {
    const where = `${spec.file}[${i}]${card && card.id ? ` (${card.id})` : ''}`;
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
    if (typeof card.deck !== 'string') {
      report.errors.push(`${where}: missing deck`);
    } else if (!spec.deckValues.includes(card.deck)) {
      report.errors.push(
        `${where}: deck is "${card.deck}", expected one of ${spec.deckValues.join(' | ')}`,
      );
    } else if (card.deck !== spec.deckValues[0]) {
      report.warnings.push(`${where}: deck "${card.deck}" is the legacy name for "${spec.deckValues[0]}"`);
    }
    if (typeof card.text !== 'string' || card.text.trim().length === 0) {
      report.errors.push(`${where}: missing text`);
    }
    for (const field of PLAYER_FIELDS) {
      for (const hit of findJargon(card[field], PLAIN_TERMS)) {
        const say = `${where}: ${field} says "${hit.match}" — ${hit.term}; say what it is: ${hit.plain}`;
        if (PLAIN_PENDING.has(deckName)) {
          report.warnings.push(`${say} (pending that deck's rewrite)`);
          plainPending++;
        } else {
          report.errors.push(say);
          plainErrors++;
        }
      }
    }
    if (typeof card.status !== 'string' || !schema.common.statuses.includes(card.status)) {
      report.errors.push(
        `${where}: status is ${JSON.stringify(card.status)}, expected one of ${schema.common.statuses.join(' | ')}`,
      );
    }
    if (card.avoidNear !== undefined && !Array.isArray(card.avoidNear)) {
      report.errors.push(`${where}: avoidNear is not an array`);
    }
    if (card.notes !== undefined && typeof card.notes !== 'string') {
      report.errors.push(`${where}: notes is not a string`);
    }
    const status = typeof card.status === 'string' ? card.status : '?';
    report.byStatus[status] = (report.byStatus[status] ?? 0) + 1;

    const raw = card.tags && typeof card.tags === 'object' ? card.tags : null;
    if (raw === null) {
      report.errors.push(`${where}: missing tags`);
      return;
    }
    /* M4b: motifs and weather are top-level fields beside `tags`, and are
     * read from inside `tags` too so that a deck written the other way still
     * validates and still scores. */
    const rawMotifs = card.motifs !== undefined ? card.motifs : raw.motifs;
    if (rawMotifs !== undefined) {
      if (!Array.isArray(rawMotifs)) {
        report.errors.push(`${where}: motifs is not an array`);
      } else {
        if (rawMotifs.length > MOTIF_MAX) {
          report.errors.push(
            `${where}: ${rawMotifs.length} motifs; one to ${MOTIF_MAX} is the rule`,
          );
        }
        for (const m of rawMotifs) {
          if (typeof m !== 'string' || !MOTIF_VOCAB.has(m)) {
            report.errors.push(
              `${where}: motif ${JSON.stringify(m)} is not in content/motifs.json`,
            );
            continue;
          }
          report.motifCounts[m] = (report.motifCounts[m] ?? 0) + 1;
        }
        if (rawMotifs.length > 0) report.tagged++;
      }
    }
    const rawWeather = card.weather !== undefined ? card.weather : raw.weather;
    if (rawWeather !== undefined && !WEATHER_VALUES.has(rawWeather)) {
      report.errors.push(
        `${where}: weather = ${JSON.stringify(rawWeather)} is not one of ${[...WEATHER_VALUES].join(' | ')}`,
      );
    }

    for (const [tagName, tag] of Object.entries(tagsOf(deckName))) {
      const present = raw[tagName] !== undefined ? raw[tagName] : raw[tag.alias];
      if (present === undefined) {
        if (tag.required) report.errors.push(`${where}: missing required tag "${tagName}"`);
        continue;
      }
      const allowed = allowedValues(deckName, tagName);
      if (!allowed.includes(present)) {
        report.errors.push(
          `${where}: ${tagName} = ${JSON.stringify(present)} is not one of ${allowed.join(' | ')}`,
        );
      }
      if (raw[tagName] === undefined && tag.alias !== undefined) {
        report.warnings.push(`${where}: "${tag.alias}" is the legacy name for "${tagName}"`);
      }
    }
    const optional = schema.common.optionalTags ?? {};
    const deckTags = tagsOf(deckName);
    for (const tagName of Object.keys(raw)) {
      if (deckTags[tagName]) continue;
      if (tagName === 'motifs' || tagName === 'weather') continue;
      if (Object.values(deckTags).some((t) => t.alias === tagName)) continue;
      if (optional[tagName]) {
        if (!optional[tagName].values.includes(raw[tagName])) {
          report.errors.push(`${where}: ${tagName} = ${JSON.stringify(raw[tagName])} is out of range`);
        }
        continue;
      }
      report.warnings.push(`${where}: unknown tag "${tagName}"`);
    }

    if (typeof card.text === 'string') {
      for (const slot of slotsOf(card.text)) {
        if (!knownSlots.has(slot)) {
          report.errors.push(`${where}: slot {${slot}} is not one this deck can fill`);
        }
      }
      for (const slot of spec.requiredSlots ?? []) {
        if (!card.text.includes(`{${slot}}`)) {
          report.errors.push(`${where}: every ${deckName} card must carry the {${slot}} slot`);
        }
      }
      // Not fatal: the engine renders the card and then the record as its own
      // sentence. But a card that names its own place for the fact reads
      // better than one the engine has to staple a second sentence onto.
      for (const [slot, why] of Object.entries(spec.warnSlots ?? {})) {
        if (!card.text.includes(`{${slot}}`)) {
          report.warnings.push(`${where}: no {${slot}} slot — ${why}`);
        }
      }
      if (spec.mandatorySlots) {
        const kind = readTags(deckName, card).factKind;
        const need = spec.mandatorySlots[kind] ?? [];
        const missing = need.filter((s) => !card.text.includes(`{${s}}`));
        if (missing.length > 0) {
          report.warnings.push(
            `${where}: a ${kind} utterance without ${missing
              .map((s) => `{${s}}`)
              .join(', ')} cannot carry its fact — the engine will fall back to the flat clue text`,
          );
        }
      }
    }
  });

  /* Coverage: which tag tuples nothing was written for. */
  const min = spec.minPerCoverageCell ?? 1;
  for (const tuple of spec.coverage ?? []) {
    const axes = tuple.map((tagName) => ({
      tagName,
      values: allowedValues(deckName, tagName).filter((v) => v !== 'any'),
    }));
    const counts = new Map();
    for (const card of cards) {
      if (typeof card !== 'object' || card === null) continue;
      if (card.status === 'cut') continue;
      const tags = readTags(deckName, card);
      // A card tagged "any" on an axis counts for every value of that axis.
      const spread = [[]];
      let ok = true;
      for (const axis of axes) {
        const value = tags[axis.tagName];
        if (value === undefined) {
          ok = false;
          break;
        }
        const choices = value === 'any' ? axis.values : [value];
        const grown = [];
        for (const prefix of spread) for (const c of choices) grown.push([...prefix, c]);
        spread.length = 0;
        spread.push(...grown);
      }
      if (!ok) continue;
      for (const combo of spread) {
        const key = combo.join(' × ');
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const combos = axes.reduce(
      (acc, axis) => acc.flatMap((prefix) => axis.values.map((v) => [...prefix, v])),
      [[]],
    );
    for (const combo of combos) {
      const key = combo.join(' × ');
      const n = counts.get(key) ?? 0;
      report.cells++;
      if (n === 0) report.gaps.push(`${tuple.join(' × ')}: ${key}`);
      else {
        report.filled++;
        if (n < min) report.thin.push(`${tuple.join(' × ')}: ${key} — ${n} of ${min}`);
      }
    }
  }

  /* M6 §2.3: a deck whose tag space is mostly unreachable lists the pairs the
   * engine can actually deal, and only those are counted. */
  if (Array.isArray(spec.reachable)) {
    const tagNames = Object.keys(spec.tags ?? {}).slice(0, 2);
    for (const pair of spec.reachable) {
      const n = cards.filter((card) => {
        if (typeof card !== 'object' || card === null || card.status === 'cut') return false;
        const tags = readTags(deckName, card);
        return pair.every((v, i) => tags[tagNames[i]] === v || tags[tagNames[i]] === 'any');
      }).length;
      const key = `${tagNames.join(' × ')}: ${pair.join(' × ')}`;
      report.cells++;
      if (n === 0) report.gaps.push(key);
      else {
        report.filled++;
        if (n < min) report.thin.push(`${key} — ${n} of ${min}`);
      }
    }
  }

  report.unusedMotifs = [...MOTIF_VOCAB].filter((m) => report.motifCounts[m] === undefined);
  return report;
}

/* ---------------------------------------------------------------- output */

const reports = decksToCheck().map(({ deckName, path }) => validateDeck(deckName, path));

if (flags.has('json')) {
  process.stdout.write(JSON.stringify(reports, null, 2) + '\n');
} else {
  const quiet = flags.has('quiet');
  const pad = (s, n) => String(s).padEnd(n);
  const lines = [];
  lines.push('deck            file               cards  target  burn         status');
  lines.push('─'.repeat(78));
  for (const r of reports) {
    const status = Object.entries(r.byStatus)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ');
    lines.push(
      `${pad(r.deck, 15)} ${pad(r.file, 18)} ${pad(r.count, 6)} ${pad(r.target ?? '—', 7)} ${pad(
        r.burn,
        12,
      )} ${status}`,
    );
  }
  lines.push('');
  for (const r of reports) {
    const motifs = r.count === 0 ? '' : `, ${r.tagged}/${r.count} cards tagged with motifs`;
    const head = `${r.deck} — ${r.filled}/${r.cells} tag combinations covered${motifs}`;
    if (r.errors.length === 0 && r.gaps.length === 0 && r.thin.length === 0 && quiet) continue;
    lines.push(head);
    if (!quiet && r.count > 0) {
      const top = Object.entries(r.motifCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([m, n]) => `${m} ${n}`)
        .join(', ');
      lines.push(`  motifs  ${top.length > 0 ? top : 'none — this deck has not been tagged yet'}`);
    }
    if (r.legacy) lines.push(`  legacy: ${r.legacy}`);
    for (const e of r.errors) lines.push(`  ERROR   ${e}`);
    // One line per kind of warning, however many cards raised it: a legacy
    // tag name on all fifty cards is one fact, not fifty.
    if (!quiet) {
      const grouped = new Map();
      for (const w of r.warnings) {
        const gist = w.replace(/^\S+\[\d+\](?: \([^)]*\))?: /, '');
        const seen = grouped.get(gist) ?? { n: 0, first: w };
        seen.n++;
        grouped.set(gist, seen);
      }
      for (const [gist, { n, first }] of grouped) {
        if (gist.includes(' says "')) {
          lines.push(`  warn    ${first}${n === 1 ? '' : ` (and ${n - 1} more)`}`);
          continue;
        }
        lines.push(`  warn    ${n === 1 ? first : `${gist} — ${n} cards`}`);
      }
    }
    for (const g of r.gaps) lines.push(`  GAP     ${g}`);
    for (const t of r.thin) lines.push(`  thin    ${t}`);
    lines.push('');
  }
  const errors = reports.reduce((n, r) => n + r.errors.length, 0);
  const gaps = reports.reduce((n, r) => n + r.gaps.length, 0);
  const cards = reports.reduce((n, r) => n + r.count, 0);
  const tagged = reports.reduce((n, r) => n + r.tagged, 0);
  const usedMotifs = new Set();
  for (const r of reports) for (const m of Object.keys(r.motifCounts)) usedMotifs.add(m);
  lines.push(
    `${cards} cards across ${reports.length} decks · ${errors} error${
      errors === 1 ? '' : 's'
    } · ${gaps} empty tag combination${gaps === 1 ? '' : 's'}`,
  );
  lines.push(
    `motifs: ${tagged} of ${cards} cards tagged · ${usedMotifs.size} of ${MOTIF_VOCAB.size} ` +
      `vocabulary words used${
        usedMotifs.size === 0 ? ' — nothing scores until the tagging pass lands' : ''
      }`,
  );
  lines.push(
    `plain terms: ${plainErrors} banned term${plainErrors === 1 ? '' : 's'} in the checked decks · ` +
      `${plainPending} in decks pending another pass's rewrite (warnings) · content/plain-terms.json`,
  );
  process.stdout.write(lines.join('\n') + '\n');
}

process.exit(reports.some((r) => r.errors.length > 0) ? 1 : 0);
