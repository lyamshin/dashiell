/**
 * docs/52 build 2: the voicings' lint, for `scripts/voicings.ts check` and the tests. Every voicing
 * held to its shape: the slots its shape has, in the forms their types take, every fact its form
 * says (`mustSay`), none of its own (no name, place, street, hour or digit), the words a page may not
 * use (plain terms, banned phrases, the book's machinery, verdicts) and, in the detective's thought,
 * nothing over the thought's level.
 */

import { dealBoard } from '../src/game/board/model.js';
import type { TierIndex } from '../src/gen/board/index.js';
import { formsOf, slotsOf, type Voicing } from '../src/game/board/bones/voice.js';
import { FORMS, SCHEMA, mustSay } from '../src/game/board/bones/schema.js';
import { SHAPES, type Shape } from '../src/game/board/bones/types.js';
import { BANNED } from '../src/game/board/prose-lint.js';
import { MACHINERY } from '../src/game/board/reader-lint.js';
import { OVERSTEP } from '../src/game/board/lint.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

/** Every name and place the nights can have, for "none of its own". */
function namesOfNights(): string[] {
  const out = new Set<string>();
  for (const world of [undefined, 'neighbourhood'] as const) {
    for (let s = 1; s <= 12; s++) {
      const c = dealBoard(s, (s % 6) as TierIndex, undefined, world ? { world } : {}).kase;
      for (const p of c.people) if (p.short.length > 3) out.add(p.short);
      for (const p of c.places) out.add(p.short.replace(/^the /, ''));
      for (const p of c.places) if (p.street) out.add(p.street);
    }
  }
  return [...out].filter((x) => x.length > 3);
}

const LEVEL_SHAPES = new Set<Shape>(['UNSPOKEN', 'ACCESS-SET', 'COLLISION-PAIR', 'PLACED-SET', 'OWN-WORD', 'WINDOW-MEANS', 'HANDOVER', 'MOTIVE-SET', 'REACTION', 'HOLD', 'CONFIRMED', 'CONFIRMED-WITH', 'WINDOW-ALIVE', 'STREET', 'PRESENT', 'ADMIT-CHECK']);
const DID_IT = /\b(?:did it|done it|killed (?:him|her)|took (?:it|him|her)|was the one|had to be|must have|nobody else could|guilty|the one who)\b/i;

export function lintVoicings(vs: readonly Voicing[]): string[] {
  const out: string[] = [];
  const terms = loadPlainTerms();
  const names = namesOfNights();
  const ids = new Set<string>();
  for (const v of vs) {
    const bad = (why: string) => out.push(`${v.id}: ${why}\n    ${v.template}`);
    if (ids.has(v.id)) bad('a second voicing with this id');
    ids.add(v.id);
    if (!(SHAPES as readonly string[]).includes(v.shape)) {
      bad(`no shape ${v.shape}`);
      continue;
    }
    if (v.manner && !['plain', 'terse', 'careful', 'watcher'].includes(v.manner)) bad(`no manner ${v.manner}`);
    if (v.tierBand && !['low', 'mid', 'high'].includes(v.tierBand)) bad(`no tier band ${v.tierBand}`);
    const sch = SCHEMA[v.shape];
    for (const { key, form } of formsOf(v.template)) {
      const type = sch.args[key];
      if (!type) bad(`{${key}}: ${v.shape} has no such argument (${Object.keys(sch.args).join(', ')})`);
      else if (form && !FORMS[type].includes(form)) bad(`{${key}:${form}}: a ${type} takes ${FORMS[type].join(', ') || 'no form'}`);
    }
    const must = mustSay(v);
    for (const alts of must) if (!alts.some((k) => slotsOf(v.template).includes(k))) bad(`says nothing for ${alts.map((k) => `{${k}}`).join(' or ')}: that drops a fact`);
    const words = v.template.replace(/\{[^}]*\}/g, ' ');
    // (A count isn't an hour: "ten feet away", as the page lint takes it.)
    if (/\d|\b(?:seven|eight|nine|ten|eleven|twelve|midnight)\b(?!\s+(?:dollars|calls|minutes|years|days|weeks|months|of|people|men|women|feet|steps|flights|cents|times|lodgers|rooms|floors|blocks|hours))/i.test(words)) bad('an hour or a digit of its own');
    // (A voicing keyed to one place, "unwatched:3", may say it in its own words: the key folds it.)
    const keyed = (v.requires ?? []).some((r) => r.includes(':'));
    if (!keyed) for (const n of names) if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(words)) bad(`a name of its own: ${n}`);
    if (/["']/.test(words.replace(/[A-Za-z]'[A-Za-z]/g, ''))) bad('a straight quotation mark');
    if (/[A-Za-z]'[A-Za-z]/.test(words)) bad('a straight apostrophe (use ’)');
    if (/—|–| - /.test(words)) bad('a dash');
    if (/[{}]/.test(v.template.replace(/\{[A-Za-z][\w-]*(?::[a-z]+)?\}/g, ''))) bad('a brace that isn’t a slot');
    const filled = v.template.replace(/\{[^}]*\}/g, 'Ashby');
    for (const h of findJargon(filled, terms) as { term: string; match: string }[]) bad(`plain terms: "${h.match}" (${h.term})`);
    for (const b of BANNED) if (b.re.test(filled)) bad(`banned: ${b.name}`);
    for (const m of MACHINERY) if (m.re.test(filled)) bad(`machinery: ${m.name}`);
    if (/\bclear(?:ed|s)\b|\bout of it\b|\bcrossed (?:\w+ )?off\b/i.test(filled)) bad('a verdict word');
    // (What somebody says when it's put to them is theirs, not the detective's thought: "I took it" is a crack.)
    const spoken = (v.requires ?? []).some((r) => /-said$|^admit$|^put$/.test(r));
    if (LEVEL_SHAPES.has(v.shape) && !spoken) {
      for (const o of OVERSTEP) if (o.re.test(filled)) bad(`over the thought's level: ${o.name}`);
      if (DID_IT.test(filled.replace(/\bwhoever (?:did it|took it)\b/g, ''))) bad('says who did it');
    }
  }
  return out;
}

