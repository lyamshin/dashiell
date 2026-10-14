/**
 * docs/52 build 2: the voicings, for whoever writes them.
 *
 *   npx tsx scripts/voicings.ts check [--file new.json]
 *     every voicing (the shipped set, with `new.json`'s laid over it by id) held to its shape:
 *     the slots its shape has, in the forms their types take, every fact its form says, none of
 *     its own (no name, place, hour or digit), and the words a page may not use.
 *   npx tsx scripts/voicings.ts samples --shape CLAIM-SPAN [--n 10] [--nights 4] [--manner terse]
 *     real composites of a shape from N nights a tier, both worlds: their flags, arguments,
 *     manner, plain rendering and how they're voiced now, a few of each form.
 *   npx tsx scripts/voicings.ts show --file new.json [--nights 4] [--n 2]
 *     each voicing in `new.json` said over real composites it fits, and read back (the round trip).
 *   npx tsx scripts/voicings.ts coverage [--file new.json] [--nights 4]
 *     every form the nights say, by shape and manner: how many voicings fit it.
 */

import { readFileSync } from 'node:fs';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardCase } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { SAMPLES } from '../src/game/board/bones/say.js';
import { fill, fitting, formsOf, slotsOf, useVoicings, voicings, type Voicing } from '../src/game/board/bones/voice.js';
import { FORMS, SCHEMA, mustSay } from '../src/game/board/bones/schema.js';
import { SHAPES, type Shape } from '../src/game/board/bones/types.js';
import { plainComposite } from '../src/game/board/bones/plain.js';
import { rereadVoiced } from '../src/game/board/bones/reread.js';
import { BANNED } from '../src/game/board/prose-lint.js';
import { MACHINERY } from '../src/game/board/reader-lint.js';
import { OVERSTEP } from '../src/game/board/lint.js';
import { canon } from '../src/game/board/bones/extract.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const args = process.argv.slice(2);
const cmd = args[0] ?? 'check';
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function merged(): Voicing[] {
  const file = val('file');
  const base = [...voicings()];
  if (!file) return base;
  const extra = JSON.parse(readFileSync(file, 'utf8')) as Voicing[];
  const ids = new Set(extra.map((v) => v.id));
  return [...base.filter((v) => !ids.has(v.id)), ...extra];
}

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

function check(vs: Voicing[]): string[] {
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
    if (/\d|\b(?:seven|eight|nine|ten|eleven|twelve|midnight)\b/i.test(words)) bad('an hour or a digit of its own');
    for (const n of names) if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(words)) bad(`a name of its own: ${n}`);
    if (/["']/.test(words.replace(/[A-Za-z]'[A-Za-z]/g, ''))) bad('a straight quotation mark');
    if (/[A-Za-z]'[A-Za-z]/.test(words)) bad('a straight apostrophe (use ’)');
    if (/—|–| - /.test(words)) bad('a dash');
    if (/[{}]/.test(v.template.replace(/\{[A-Za-z][\w-]*(?::[a-z]+)?\}/g, ''))) bad('a brace that isn’t a slot');
    const filled = v.template.replace(/\{[^}]*\}/g, 'Ashby');
    for (const h of findJargon(filled, terms) as { term: string; match: string }[]) bad(`plain terms: "${h.match}" (${h.term})`);
    for (const b of BANNED) if (b.re.test(filled)) bad(`banned: ${b.name}`);
    for (const m of MACHINERY) if (m.re.test(filled)) bad(`machinery: ${m.name}`);
    if (/\bclear(?:ed|s)\b|\bout of it\b|\bcrossed (?:\w+ )?off\b/i.test(filled)) bad('a verdict word');
    if (LEVEL_SHAPES.has(v.shape)) {
      for (const o of OVERSTEP) if (o.re.test(filled)) bad(`over the thought's level: ${o.name}`);
      if (DID_IT.test(filled)) bad('says who did it');
    }
  }
  return out;
}

/** Collect the composites of N nights a tier, both worlds, the oracle's and the wanderer's routes. */
function collect(n: number): typeof SAMPLES.list {
  SAMPLES.on = true;
  SAMPLES.list = [];
  for (const world of [undefined, 'neighbourhood'] as const) {
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
      const types = typesFor(tier) as CaseType[];
      for (let s = 1; s <= n; s++) {
        const d = dealBoard(s, tier, types[s % types.length] as CaseType, world ? { world } : {});
        playBoardOracle(d);
        playWanderer(d, s);
      }
    }
  }
  SAMPLES.on = false;
  return SAMPLES.list;
}

function argsSaid(x: (typeof SAMPLES.list)[number]): string {
  return Object.entries(x.args)
    .map(([k, a]) => `${k}=${typeof a === 'string' ? JSON.stringify(a) : `${a.t}:${JSON.stringify(fill(`{${k}}`, { [k]: a }, x.c))}`}`)
    .join('  ');
}

const formKey = (x: { shape: string; flags: string[]; manner?: string }) => `${x.shape} [${[...x.flags].sort().join(' ')}]${x.manner ? ` (${x.manner})` : ''}`;

if (cmd === 'check') {
  const vs = merged();
  const issues = check(vs);
  process.stdout.write(issues.length ? `${issues.join('\n')}\n\n${issues.length} issues in ${vs.length} voicings.\n` : `${vs.length} voicings, no issues.\n`);
  if (issues.length) process.exitCode = 1;
} else if (cmd === 'samples') {
  const shape = val('shape');
  const n = Number(val('n') ?? 10);
  const list = collect(Number(val('nights') ?? 4)).filter((x) => (!shape || x.shape === shape) && (!val('manner') || x.manner === val('manner')));
  const byForm = new Map<string, typeof list>();
  for (const x of list) byForm.set(formKey(x), [...(byForm.get(formKey(x)) ?? []), x]);
  const forms = [...byForm.entries()].sort((a, b) => b[1].length - a[1].length);
  process.stdout.write(`${list.length} composites, ${forms.length} forms\n\n`);
  let shown = 0;
  for (const [k, xs] of forms) {
    process.stdout.write(`## ${k}: ${xs.length}\n`);
    for (const x of xs.slice(0, Math.max(1, Math.ceil((n * xs.length) / list.length)))) {
      shown++;
      process.stdout.write(`- args: ${argsSaid(x)}\n  plain: ${plainComposite(x.c, { shape: x.shape as Shape, props: x.props as never })}\n  now:   ${x.said}\n`);
    }
    process.stdout.write('\n');
  }
  void shown;
} else if (cmd === 'show' || cmd === 'coverage') {
  const vs = merged();
  useVoicings(vs);
  const list = collect(Number(val('nights') ?? 4));
  if (cmd === 'coverage') {
    const forms = new Map<string, { x: (typeof list)[number]; n: number }>();
    for (const x of list) {
      const k = formKey(x);
      const f = forms.get(k);
      if (f) f.n++;
      else forms.set(k, { x, n: 1 });
    }
    const rows = [...forms.entries()].map(([k, { x, n }]) => {
      const band = x.c.tier <= 1 ? 'low' : x.c.tier <= 3 ? 'mid' : 'high';
      const fit = fitting(x.shape as Shape, new Set(x.flags), { manner: x.manner, tierBand: band });
      return { k, n, fit: fit.length };
    });
    rows.sort((a, b) => a.k.localeCompare(b.k));
    for (const r of rows) process.stdout.write(`${r.fit < 3 ? '!!' : '  '} ${String(r.fit).padStart(2)} voicings  ${String(r.n).padStart(5)}×  ${r.k}\n`);
    process.stdout.write(`\n${rows.filter((r) => r.fit < 3).length} of ${rows.length} forms have fewer than three.\n`);
  } else {
    const file = val('file');
    const mine = file ? (JSON.parse(readFileSync(file, 'utf8')) as Voicing[]) : vs;
    const per = Number(val('n') ?? 2);
    let ok = 0;
    let bad = 0;
    for (const v of mine) {
      const fits = list.filter((x) => {
        const band = x.c.tier <= 1 ? 'low' : x.c.tier <= 3 ? 'mid' : 'high';
        return x.shape === v.shape && (v.manner === undefined || v.manner === x.manner) && (v.tierBand === undefined || v.tierBand === band) && (v.requires ?? []).every((r) => x.flags.includes(r)) && !(v.forbids ?? []).some((f) => x.flags.includes(f));
      });
      process.stdout.write(`## ${v.id}  ${v.template}\n`);
      if (fits.length === 0) process.stdout.write('   (no composite on these nights fits it)\n');
      for (const x of fits.slice(0, per)) {
        const said = fill(v.template, x.args, x.c).replace(/⁣\d+⁤/g, '');
        const r = rereadVoiced({ shape: x.shape as Shape, props: x.props as never, voicing: v.id, said: fill(v.template, x.args, x.c), args: x.args as never }, { c: x.c, here: '', ...(x.speaker ? { speaker: x.speaker } : {}) });
        if (r.ok) ok++;
        else bad++;
        process.stdout.write(`   ${r.ok ? 'ok ' : 'BAD'} ${said}${r.ok ? '' : `\n       ${r.why}\n       bones: ${(x.props as never[]).map((p) => canon(p)).join(' ')}`}\n`);
      }
    }
    process.stdout.write(`\n${ok} read back, ${bad} didn't.\n`);
  }
}
