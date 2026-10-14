/**
 * docs/51 §1 and §3.1: the gaps the situated deck fills, their situations, and the sample the
 * deck is written from.
 *
 * `npx tsx scripts/situated-gaps.ts [--nights 40] [--sample 3000] [--out model/data/gaps-sample.jsonl] [--keys 15]`
 *
 * Plays N nights a tier in both worlds along all three routes (the oracle's, the wanderer's and the
 * reader's), with the situated deck off, and keys every gap the deck may fill (`plan/situated.ts`).
 * It prints the distribution: by slot, by (slot, page kind, before), and the commonest full keys.
 *
 * With `--sample`, it writes the stratified sample (docs/51 §3.1): every (slot, page kind, before)
 * that is more than 0.5% of the gaps gets at least 20, a rarer one at least 5 (or all there are),
 * and the rest of the budget goes by the square root of each one's count; inside a stratum, the
 * full keys take turns, commonest first, one page at most a stratum. One gap a line: the key, the
 * page so far (paragraphs joined by " ¶ "), the reason a why-here keeps (`lead`), the look a
 * staging keeps (`tail`), the next locked unit (`after`), the card it had (`card`, for the writer
 * not to copy), whom the tokens mean and which tokens there are.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, placeOf, pronOf, tierName, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { SITUATED, parseKey } from '../src/game/board/plan/situated.js';
import { roleOf } from '../src/game/board/plan/refer.js';
import { Rng } from '../src/gen/board/rng.js';
import type { Unit } from '../src/game/board/plan/types.js';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 40);
const SAMPLE = val('sample') !== undefined ? Number(val('sample')) : 0;
const OUT = val('out') ?? 'model/data/gaps-sample.jsonl';
const TOP = Number(val('keys') ?? 15);
SITUATED.on = false;

interface Gap {
  night: string;
  page: number;
  unit: number;
  key: string;
  stratum: string;
  before: string;
  lead?: string;
  tail?: string;
  after: string;
  card: string;
  who?: { sex: 'woman' | 'man'; role?: string; kind: string };
  tokens: string[];
  place: string;
}

const gaps: Gap[] = [];
let pages = 0;
let units = 0;
let allGaps = 0;

function prose(us: Unit[], upto: number): string {
  let out = '';
  let para = -1;
  for (let i = 0; i < upto; i++) {
    const u = us[i] as Unit;
    if (u.para !== para) {
      out += out ? ` ¶ ${u.text}` : u.text;
      para = u.para;
    } else out += ` ${u.text}`;
  }
  return out;
}

for (const world of [undefined, 'neighbourhood'] as const) {
  for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
    const types = typesFor(tier) as CaseType[];
    for (let s = 1; s <= N; s++) {
      const type = types[s % types.length] as CaseType;
      const d = dealBoard(s, tier, type, world ? { world } : {});
      const c = d.kase;
      const runs: [string, BoardRun][] = [
        ['oracle', playBoardOracle(d).run],
        ['wanderer', playWanderer(d, s).run],
        ['reader', playReader(d, s).run],
      ];
      for (const [route, run] of runs) {
        const night = `${world ?? 'dealt'}/${s}/${tier}/${type}/${route}`;
        run.log.forEach((p, pi) => {
          const us = p.board?.units ?? [];
          pages++;
          units += us.length;
          // The turn is a section of its own: a gap's page so far starts at the page, its after stays in its section.
          const chapterAt = us.findIndex((u) => u.kind === 'gap' && u.slot === 'chapter');
          us.forEach((u, ui) => {
            if (u.kind !== 'gap') return;
            allGaps++;
            if (!u.key) return;
            const k = parseKey(u.key);
            const end = chapterAt > ui ? chapterAt : us.length;
            const next = us.slice(ui + 1, end).find((x) => x.kind === 'fact');
            const nextAt = next ? us.indexOf(next) : -1;
            const after = next ? `${(next as Unit).para !== u.para || us.slice(ui + 1, nextAt).some((x) => x.para !== u.para) ? '¶ ' : ''}${next.text}` : '';
            const at = p.at;
            const place = at === 'office' ? 'the office' : (placeOf(c, at)?.short ?? '');
            const said = run.log.slice(0, pi).map((x) => x.blocks.map((b) => b.text).join(' ')).join(' ') + prose(us, ui);
            const tokens: string[] = [];
            let who: Gap['who'];
            if (u.who) {
              const person = c.people.find((x) => x.id === u.who);
              const role = roleOf(c, u.who);
              who = { sex: pronOf(c, u.who).he === 'she' ? 'woman' : 'man', ...(role ? { role } : {}), kind: person?.role ?? '' };
              tokens.push('they', 'them', 'their');
              if (role) tokens.push('role');
            }
            if (place) tokens.push('place');
            if (c.type !== 'murder') tokens.push('thing');
            const means = c.means.name.replace(/^(a|an|the) /, '');
            if (c.type === 'murder' && said.toLowerCase().includes(means.toLowerCase())) tokens.push('means');
            gaps.push({
              night,
              page: pi + 1,
              unit: ui,
              key: u.key,
              stratum: `${k.slot}|${k.page}|${k.before}`,
              before: prose(us, ui),
              ...(u.lead ? { lead: u.lead } : {}),
              ...(u.tail ? { tail: u.tail } : {}),
              after,
              card: u.text,
              ...(who ? { who } : {}),
              tokens,
              place,
            });
          });
        });
      }
    }
  }
}

const count = <T>(xs: T[], f: (x: T) => string) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const pct = (n: number) => `${((100 * n) / gaps.length).toFixed(1)}%`;

const out: string[] = [];
out.push(`${N} nights a tier, both worlds, three routes: ${pages} pages, ${units} units, ${allGaps} gaps, ${gaps.length} the situated deck may fill (${Math.round((100 * gaps.length) / allGaps)}%).`);
out.push('');
out.push('| slot | gaps | share |');
out.push('|---|---|---|');
for (const [k, n] of count(gaps, (g) => g.key.split('|')[0] as string)) out.push(`| ${k} | ${n} | ${pct(n)} |`);
out.push('');
const strata = count(gaps, (g) => g.stratum);
out.push(`${strata.length} (slot, page kind, before) strata; ${strata.filter(([, n]) => n / gaps.length > 0.005).length} over 0.5%.`);
out.push('');
out.push('| slot · page kind · before | gaps | share |');
out.push('|---|---|---|');
for (const [k, n] of strata) out.push(`| ${k.replace(/\|/g, ' · ')} | ${n} | ${pct(n)} |`);
out.push('');
const keys = count(gaps, (g) => g.key);
out.push(`${keys.length} distinct full keys; the commonest ${TOP}:`);
out.push('');
out.push('| key (slot · page · place · manner · tier · before · after · put · position) | gaps | share |');
out.push('|---|---|---|');
for (const [k, n] of keys.slice(0, TOP)) out.push(`| ${k.replace(/\|/g, ' · ')} | ${n} | ${pct(n)} |`);
process.stdout.write(`${out.join('\n')}\n`);

if (SAMPLE > 0) {
  const rng = new Rng(51);
  const shuffle = <T>(xs: T[]): T[] => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [a[i], a[j]] = [a[j] as T, a[i] as T];
    }
    return a;
  };
  const total = gaps.length;
  const quota = new Map<string, number>();
  let used = 0;
  for (const [k, n] of strata) {
    const q = Math.min(n, n / total > 0.005 ? 20 : 5);
    quota.set(k, q);
    used += q;
  }
  // The rest by the square root of each stratum's count.
  const rest = Math.max(0, SAMPLE - used);
  const weight = strata.reduce((a, [, n]) => a + Math.sqrt(n), 0);
  for (const [k, n] of strata) quota.set(k, Math.min(n, (quota.get(k) ?? 0) + Math.floor((rest * Math.sqrt(n)) / weight)));
  const picked: Gap[] = [];
  for (const [k] of strata) {
    const q = quota.get(k) ?? 0;
    const inS = gaps.filter((g) => g.stratum === k);
    const byKey = new Map<string, Gap[]>();
    for (const g of shuffle(inS)) byKey.set(g.key, [...(byKey.get(g.key) ?? []), g]);
    const order = [...byKey.entries()].sort((a, b) => b[1].length - a[1].length);
    const pagesSeen = new Set<string>();
    const take: Gap[] = [];
    for (let round = 0; take.length < q && round < 1000; round++) {
      let any = false;
      for (const [, xs] of order) {
        if (take.length >= q) break;
        const i = xs.findIndex((g) => !pagesSeen.has(`${g.night}#${g.page}`));
        const g = i >= 0 ? xs.splice(i, 1)[0] : round > 2 ? xs.shift() : undefined;
        if (!g) continue;
        any = true;
        pagesSeen.add(`${g.night}#${g.page}`);
        take.push(g);
      }
      if (!any) break;
    }
    picked.push(...take);
  }
  const lines = picked.map((g, i) => JSON.stringify({ id: `g${String(i + 1).padStart(4, '0')}`, ...g }));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${lines.join('\n')}\n`);
  // Each stratum's share of all the gaps, for the deck's coverage (common over 0.5%, rare under).
  writeFileSync(OUT.replace(/gaps-sample\.jsonl$/, 'gaps-strata.json'), `${JSON.stringify(Object.fromEntries(strata.map(([k, n]) => [k, Number((n / total).toFixed(5))])), null, 1)}\n`);
  process.stdout.write(`\n${OUT}: ${picked.length} gaps, ${new Set(picked.map((g) => g.stratum)).size} strata, ${new Set(picked.map((g) => g.key)).size} full keys.\n`);
}
void tierName;
