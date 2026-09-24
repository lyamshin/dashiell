/**
 * M14: does every tier deal every case type? Generates seeds per tier × type
 * and prints failures, timing, par and the trope spread.
 *
 *   npx tsx scripts/m14-gen.ts [--seeds 30] [--types lost-pet,affair] [--tiers 0,1,2]
 *   npx tsx scripts/m14-gen.ts --mix [--seeds 200]     the case mix per tier
 *   npx tsx scripts/m14-gen.ts --ties [--seeds 200]    the share of debt ties
 */
import { generateCase, type Diagnostics } from '../src/gen/index.js';
import { generateCaseDiagnosed } from '../src/gen/generate.js';
import { CASE_TYPES, type CaseType } from '../src/gen/types.js';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SEEDS = Number(arg('seeds') ?? 30);
const types = (arg('types')?.split(',') ?? CASE_TYPES) as CaseType[];
const tiers = (arg('tiers')?.split(',').map(Number) ?? [0, 1, 2, 3, 4, 5]) as (0 | 1 | 2 | 3 | 4 | 5)[];
const LEVEL = Number(arg('level') ?? 2) as 1 | 2 | 3;

if (argv.includes('--mix')) {
  const out: string[] = ['| tier | ' + CASE_TYPES.join(' | ') + ' |', '| --- |' + CASE_TYPES.map(() => ' --- |').join('')];
  for (const tier of tiers) {
    const n = new Map<string, number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const k = generateCase(seed, { tier, level: tier === 0 ? 1 : LEVEL });
      n.set(k.act.type, (n.get(k.act.type) ?? 0) + 1);
    }
    out.push(`| ${tier} | ${CASE_TYPES.map((t) => `${Math.round((100 * (n.get(t) ?? 0)) / SEEDS)}%`).join(' | ')} |`);
  }
  process.stdout.write(out.join('\n') + '\n');
  process.exit(0);
}

if (argv.includes('--ties')) {
  for (const tier of tiers) {
    let ties = 0;
    let debt = 0;
    const rels = new Map<string, number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const k = argv.includes('--plain') ? generateCase(seed, { difficulty: 2 }) : generateCase(seed, { tier, level: tier === 0 ? 1 : LEVEL });
      for (const p of k.people) {
        if (p.kind !== 'suspect') continue;
        ties++;
        const id = p.relationshipId ?? '?';
        rels.set(id, (rels.get(id) ?? 0) + 1);
        const text = `${p.relationshipToVictim ?? ''} ${p.dossier?.tie.backstory ?? ''}`;
        if (id === 'rel-creditor' || id === 'rel-debtor' || /\b(lent|lend|loan|owe[sd]?|debt|IOU)\b/i.test(text)) debt++;
      }
    }
    process.stdout.write(`tier ${tier}: ${debt}/${ties} ties are debt or lending (${((100 * debt) / ties).toFixed(1)}%)\n`);
    if (argv.includes('--all')) {
      for (const [id, c] of [...rels.entries()].sort((a, b) => b[1] - a[1])) process.stdout.write(`   ${id} ${c}\n`);
    }
  }
  process.exit(0);
}

for (const type of types) {
  for (const tier of tiers) {
    const t0 = Date.now();
    let fail = 0;
    const pars: number[] = [];
    const tropes = new Map<string, number>();
    const reasons = new Map<string, number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const diagnostics: Diagnostics = { attempts: 0, rejections: [] };
      try {
        const k = generateCaseDiagnosed(seed, { tier, level: tier === 0 ? 1 : LEVEL, type }, diagnostics);
        pars.push(k.par);
        tropes.set(k.act.tropeId, (tropes.get(k.act.tropeId) ?? 0) + 1);
      } catch (e) {
        fail++;
        for (const r of diagnostics.rejections) {
          const key = r.replace(/\d+/g, '#').slice(0, 90);
          reasons.set(key, (reasons.get(key) ?? 0) + 1);
        }
      }
    }
    const ms = Date.now() - t0;
    pars.sort((a, b) => a - b);
    process.stdout.write(
      `${type} T${tier}: ${fail}/${SEEDS} failed, ${(ms / SEEDS).toFixed(0)} ms/case, par ${pars[0]}–${pars[pars.length - 1]} (median ${pars[Math.floor(pars.length / 2)]}), ${[...tropes.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}\n`,
    );
    if (fail > 0) {
      for (const [r, c] of [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) process.stdout.write(`    ${c} × ${r}\n`);
    }
  }
}
