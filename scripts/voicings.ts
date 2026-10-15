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
 *   npx tsx scripts/voicings.ts variety [--nights 30]
 *     docs/52 §6, voicing variety, along the oracle's route, both worlds: the nights where a voicing
 *     was said again while another that fitted was still unsaid (target 0), and how often a voicing
 *     was said again at all, where three or more fitted.
 */

import { readFileSync } from 'node:fs';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardCase } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { SAMPLES, VARIETY } from '../src/game/board/bones/say.js';
import { tierName } from '../src/game/board/model.js';
import { fill, fitting, formsOf, slotsOf, useVoicings, voicings, type Voicing } from '../src/game/board/bones/voice.js';
import { FORMS, SCHEMA, mustSay } from '../src/game/board/bones/schema.js';
import { SHAPES, type Shape } from '../src/game/board/bones/types.js';
import { plainComposite } from '../src/game/board/bones/plain.js';
import { rereadVoiced } from '../src/game/board/bones/reread.js';
import { clarityOf } from '../src/game/board/bones/clarity.js';
import { canon } from '../src/game/board/bones/extract.js';
import { lintVoicings } from './voicing-lint.js';

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
  // `--whole`: the file is the whole set for every shape it has (what it leaves out is cut).
  const shapes = args.includes('--whole') ? new Set(extra.map((v) => v.shape)) : new Set<string>();
  return [...base.filter((v) => !ids.has(v.id) && !shapes.has(v.shape)), ...extra];
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
  const issues = lintVoicings(vs);
  process.stdout.write(issues.length ? `${issues.join('\n')}\n\n${issues.length} issues in ${vs.length} voicings.\n` : `${vs.length} voicings, no issues.\n`);
  if (issues.length) process.exitCode = 1;
} else if (cmd === 'samples') {
  const shape = val('shape');
  const n = Number(val('n') ?? 10);
  const shapes = shape ? shape.split(',') : undefined;
  const list = collect(Number(val('nights') ?? 4)).filter((x) => (!shapes || shapes.includes(x.shape)) && (!val('manner') || x.manner === val('manner')));
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
} else if (cmd === 'variety') {
  const n = Number(val('nights') ?? 30);
  const rows = ['| world | tier | nights | voicings chosen | said again while another fitting one was unsaid | nights with that | said again, where three or more fitted |', '|---|---|---|---|---|---|---|'];
  let bad = 0;
  for (const world of [undefined, 'neighbourhood'] as const) {
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
      const types = typesFor(tier) as CaseType[];
      let picks = 0;
      let early = 0;
      let nights = 0;
      let again3 = 0;
      let pool3 = 0;
      for (let s = 1; s <= n; s++) {
        VARIETY.on = true;
        VARIETY.picks = [];
        const d = dealBoard(s, tier, types[s % types.length] as CaseType, world ? { world } : {});
        playBoardOracle(d);
        VARIETY.on = false;
        picks += VARIETY.picks.length;
        const e = VARIETY.picks.filter((x) => x.unsaidLeft).length;
        early += e;
        if (e > 0) nights++;
        for (const x of VARIETY.picks) if (x.pool >= 3) {
          pool3++;
          if (x.again) again3++;
        }
      }
      bad += nights;
      rows.push(`| ${world ?? 'dealt'} | ${tierName(tier)} | ${n} | ${picks} | ${early} | ${nights} of ${n} | ${again3} of ${pool3} (${pool3 ? ((100 * again3) / pool3).toFixed(1) : '—'}%) |`);
    }
  }
  process.stdout.write(`${rows.join('\n')}\n`);
  if (bad) process.exitCode = 1;
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
    for (const r of rows) process.stdout.write(`${r.fit < 3 ? '!!' : r.fit > 6 ? '++' : '  '} ${String(r.fit).padStart(2)} voicings  ${String(r.n).padStart(5)}×  ${r.k}\n`);
    process.stdout.write(`\n${rows.filter((r) => r.fit < 3).length} of ${rows.length} forms have fewer than three, ${rows.filter((r) => r.fit > 6).length} more than six.\n`);
  } else {
    const file = val('file');
    const mine = file ? (JSON.parse(readFileSync(file, 'utf8')) as Voicing[]) : vs;
    const per = Number(val('n') ?? 2);
    let ok = 0;
    let bad = 0;
    let unclear = 0;
    for (const v of mine) {
      const fits = list.filter((x) => {
        const band = x.c.tier <= 1 ? 'low' : x.c.tier <= 3 ? 'mid' : 'high';
        return x.shape === v.shape && (v.manner === undefined || v.manner === x.manner) && (v.tierBand === undefined || v.tierBand === band) && (v.requires ?? []).every((r) => x.flags.includes(r)) && !(v.forbids ?? []).some((f) => x.flags.includes(f));
      });
      process.stdout.write(`## ${v.id}  ${v.template}\n`);
      if (fits.length === 0) process.stdout.write('   (no composite on these nights fits it)\n');
      if (/^(?:PAIR|ATTACH|ADMIT-CHECK|CONFIRMED-WITH)$/.test(v.shape)) {
        // (A join's words are its parts': the page's round trip, `scripts/roundtrip.ts`, reads them.)
        for (const x of fits.slice(0, per)) process.stdout.write(`   --- ${fill(v.template, x.args, x.c).replace(/⁣\d+⁤/g, '')}\n`);
        continue;
      }
      for (const x of fits.slice(0, per)) {
        const said = fill(v.template, x.args, x.c).replace(/⁣\d+⁤/g, '');
        const r = rereadVoiced({ shape: x.shape as Shape, props: x.props as never, voicing: v.id, said: fill(v.template, x.args, x.c), args: x.args as never }, { c: x.c, here: x.here, ...(x.speaker ? { speaker: x.speaker } : {}) });
        if (r.ok) ok++;
        else bad++;
        // docs/53: and clear, by the dial.
        const why = clarityOf(x.c, { shape: x.shape as Shape, props: x.props as never, voicing: v.id, said: fill(v.template, x.args, x.c), args: x.args as never }, x.here, x.speaker);
        if (why.length) unclear++;
        process.stdout.write(`   ${r.ok ? 'ok ' : 'BAD'} ${said}${r.ok ? '' : `\n       ${r.why}\n       bones: ${(x.props as never[]).map((p) => canon(p)).join(' ')}`}${why.length ? `\n       unclear: ${why.join('; ')}` : ''}\n`);
      }
    }
    process.stdout.write(`\n${ok} read back, ${bad} didn't; ${unclear} not clear by docs/53.\n`);
  }
}
