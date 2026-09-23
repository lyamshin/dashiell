/**
 * M9 tuning aid: prints why the generator turned cases down, one attempt at a
 * time, with the solver's view of the innocents at the crime's half hour.
 *
 *   npx tsx scripts/m9-debug.ts --tier 4 --level 2 --seed 1 [--max 3] [--reason false]
 */
import { diagnoseCase } from '../src/gen/generate.js';
import { debug } from '../src/gen/logic/select.js';
import { placesAt } from '../src/gen/logic/solver.js';
import type { Difficulty, Id, Tick } from '../src/gen/types.js';

const argv = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const tier = Number(arg('tier') ?? 4) as 0 | 1 | 2 | 3 | 4 | 5;
const level = Number(arg('level') ?? 2) as Difficulty;
const seed = Number(arg('seed') ?? 1);
const max = Number(arg('max') ?? 3);
const only = arg('reason');
let shown = 0;

debug.hook = ({ reason, input, state, findable }) => {
  if (shown >= max) return;
  if (only && !reason.includes(only)) return;
  shown++;
  const { build, cast, setting } = input;
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const name = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? id;
  const pl = (id: Id | null | undefined): string => (id ? (setting.places.find((p) => p.id === id)?.shortName ?? id) : '-');
  console.log(`\n=== ${reason}  (M=${M}, scene ${pl(L)}, blocks ${JSON.stringify(Object.fromEntries(Object.entries(input.blocks).map(([k, v]) => [pl(k), v])))})`);
  console.log(`direct ${build.directId ? name(build.directId) : '-'}, pair ${build.pair?.map(name).join('+') ?? '-'}, liars ${build.mLiars.map(name).join(',')}`);
  for (const p of cast.suspects) {
    for (let t = 0; t < 12; t++) {
      const truth = (build.truth[p.id] as (Id | null)[])[t];
      const dom = placesAt(state, p.id, t as Tick);
      if (truth && !dom.includes(truth)) {
        const s = state.problem.suspects.indexOf(p.id);
        const pi = state.problem.places.indexOf(truth);
        const w = state.why[(s * 12 + t) * state.problem.places.length + pi];
        console.log(`  FALSE: ${name(p.id)} at ${t} truly ${pl(truth)}, domain ${dom.map(pl).join('|')}; struck by ${(w?.rules ?? []).map((r) => state.problem.rules[r]?.id).join(',')} depth ${w?.depth}`);
      }
    }
  }
  for (const d of build.lieDrafts) console.log(`  lie: ${name(d.personId)} ${d.ticks.join(',')} says ${pl(d.claimed)}${d.with ? ` with ${name(d.with)}` : ''} (${d.cover})`);
  const atCrime = input.pool.descriptions.filter((c) => c.establishes.some((f) => f.kind === 'describedAt' && f.tick === M));
  for (const c of atCrime) {
    const inHand = findable.some((x) => x.id === c.id);
    console.log(`  description at the crime: ${c.id} ${inHand ? '(dealt)' : '(NOT dealt)'} ${c.rule}`);
  }
  for (const p of cast.suspects) {
    const row: string[] = [];
    for (let t = Math.max(0, M - 3); t <= Math.min(11, M + 2); t++) {
      const truth = pl((build.truth[p.id] as (Id | null)[])[t]);
      const claim = pl((build.claimed[p.id] as (Id | null)[])[t]);
      const dom = placesAt(state, p.id, t as Tick).map(pl).join('|');
      row.push(`${t}:${truth}${claim !== truth ? `(says ${claim})` : ''} [${dom}]`);
    }
    console.log(`${p.isKiller ? 'K' : ' '} ${name(p.id).padEnd(12)} ${row.join('  ')}`);
  }
  const relevant = findable.filter((c) =>
    c.establishes.some((f) => ('tick' in f && Math.abs((f as { tick: number }).tick - M) <= 1) || f.kind === 'claims'),
  );
  for (const c of relevant.slice(0, 60)) console.log(`   ${c.id} ${c.rule}`);
};

try {
  const { case: c } = diagnoseCase(seed, level, { tier, level });
  console.log(`\naccepted after ${c.attempts} attempts`);
} catch (e) {
  console.log((e as Error).message);
}
