/**
 * docs/52 §3: the round trip. `npx tsx scripts/roundtrip.ts [--nights 30] [--tiers 0,1,2,3,4,5] [--routes oracle,wanderer,reader] [--show 10]`
 *
 * Every page of N nights a tier, both worlds (the tier's case types in turn,
 * along the oracle's route unless `--routes` says otherwise):
 *
 * - **plain**: the page's plain rendering (`bones/plain.ts`), read back to
 *   propositions, must be the page's bones, in order (target 100%);
 * - **voiced**: every composite the planner said in a voicing
 *   (`content/board/voicings.json`) is read back through that voicing's
 *   template to its arguments, and the arguments to propositions, which must
 *   be the composite's (target 100%); and every fact unit the writer's own
 *   words carry (a card, a person's answer) names, on the page, every person,
 *   place and hour its bones name (`bones/reread.ts`).
 *
 * Exits non-zero when a plain page or a voicing misses.
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, tierName, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { roundTrip } from '../src/game/board/bones/plain.js';
import { VOICED, rereadFlesh, tallyFlesh, voicedTally } from '../src/game/board/bones/reread.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 30);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const routes = (val('routes') ?? 'oracle').split(',');
const show = Number(val('show') ?? 10);
const worlds = (val('worlds') ?? 'dealt,neighbourhood').split(',');

VOICED.check = true;
const rows: string[] = [];
rows.push('| world | tier | pages | plain pages read back | propositions | voiced composites read back | voiced composites clear (docs/53) | flesh units naming all they say |');
rows.push('|---|---|---|---|---|---|---|---|');
const misses: string[] = [];
let bad = 0;
for (const world of worlds) {
  for (const tier of tiers) {
    const types = typesFor(tier) as CaseType[];
    let pages = 0;
    let ok = 0;
    let props = 0;
    const before = voicedTally();
    for (let s = 1; s <= N; s++) {
      const type = types[s % types.length] as CaseType;
      const d = dealBoard(s, tier, type, world === 'dealt' ? {} : { world });
      const runs: BoardRun[] = [];
      if (routes.includes('oracle')) runs.push(playBoardOracle(d).run);
      if (routes.includes('wanderer')) runs.push(playWanderer(d, s).run);
      if (routes.includes('reader')) runs.push(playReader(d, s).run);
      for (const run of runs) {
        for (const p of run.log) {
          pages++;
          // The writer's own words: the people their bones name are the people they name.
          for (const u of p.board?.units ?? []) {
            if (u.kind !== 'fact' || !(u.bones ?? []).every((b) => b.voicing === 'flesh')) continue;
            const q = u.carries[0] ?? '';
            const speaker = u.voice === 'answer' ? /^(?:claim|list|remark:account|remark:list|motive):([^@#]+)/.exec(q)?.[1] : u.beat === 'reaction' || u.beat === 'ask' ? u.about[0] : u.voice === 'exchange' ? d.kase.client : undefined;
            const f = rereadFlesh(d.kase, u, speaker);
            tallyFlesh(f.ok, `flesh ${world} ${tierName(tier)} ${type} seed ${s} p${p.n + 1} [${q}] ${f.why}: ${u.text.slice(0, 160)}`);
          }
          const r = roundTrip(d.kase, p);
          props += r.bones.length;
          if (r.ok) ok++;
          else {
            bad++;
            if (misses.length < show) {
              misses.push(`plain ${world} ${tierName(tier)} ${type} seed ${s} p${p.n + 1}: ${r.error ?? ''}`);
              const n = Math.max(r.bones.length, r.read.length);
              for (let i = 0; i < n; i++) if (r.bones[i] !== r.read[i]) {
                misses.push(`   bones: ${r.bones[i] ?? '—'}\n   read:  ${r.read[i] ?? '—'}`);
                break;
              }
            }
          }
        }
      }
    }
    const after = voicedTally();
    const vt = after.voiced - before.voiced;
    const vo = after.voicedOk - before.voicedOk;
    const ft = after.flesh - before.flesh;
    const fo = after.fleshOk - before.fleshOk;
    const vc = after.clear - before.clear;
    rows.push(`| ${world} | ${tierName(tier)} | ${pages} | ${ok} of ${pages} (${pages ? ((100 * ok) / pages).toFixed(1) : '—'}%) | ${props} | ${vo} of ${vt} (${vt ? ((100 * vo) / vt).toFixed(1) : '—'}%) | ${vc} of ${vt} (${vt ? ((100 * vc) / vt).toFixed(1) : '—'}%) | ${fo} of ${ft} (${ft ? ((100 * fo) / ft).toFixed(1) : '—'}%) |`);
  }
}
const t = voicedTally();
process.stdout.write(`${rows.join('\n')}\n`);
if (misses.length) process.stdout.write(`\n${misses.join('\n')}\n`);
if (t.misses.length) process.stdout.write(`\n${t.misses.slice(0, show).join('\n')}\n`);
// docs/53: what wasn't clear, by voicing, the most often first.
const byId = new Map<string, { n: number; why: string; said: string }>();
for (const u of t.unclear) {
  const x = byId.get(u.id) ?? { n: 0, why: u.why.join('; '), said: u.said };
  x.n++;
  byId.set(u.id, x);
}
if (byId.size && show) process.stdout.write(`\n${[...byId].sort((a, b) => b[1].n - a[1].n).slice(0, show).map(([id, x]) => `unclear ×${x.n} ${id}: ${x.why}\n   ${x.said}`).join('\n')}\n`);
if (bad > 0 || t.voicedOk < t.voiced) process.exitCode = 1;
