/**
 * docs/59: the skim test, the clarity build's gate (docs/58: preference reads favour the fuller page;
 * the question is whether a reader can take the facts in on one read). Twenty-four job pages (the
 * office, accounts, lists, finds, puts and turns) across both worlds and every tier, from the same
 * nights in two builds (this one, and a copy of main before it). Each page gets three factual
 * questions read off the engine's own facts (the same in both builds). Two blind readers each read
 * every page once, half of them in each build (the halves crossed between them), answer the
 * questions, and quote every sentence they had to read twice or found unclear.
 *
 * Gate: the after build's accuracy at least the before build's, and its sentences flagged cut by half.
 *
 *   npx tsx scripts/skim-test.ts pick --out DIR [--pages 24] [--seed 59] [--from 200]
 *     choose the pages and write their questions: DIR/ids.json
 *   npx tsx scripts/skim-test.ts dump --root ROOT --ids DIR/ids.json --out FILE
 *     those pages' prose, as the tree at ROOT writes them (this one, or a copy of main)
 *   npx tsx scripts/skim-test.ts packets --ids DIR/ids.json --before B.json --after A.json --out DIR [--seed 59]
 *     DIR/reader-1.md and DIR/reader-2.md (each page once a reader, a build each, crossed) and DIR/key.json
 *   npx tsx scripts/skim-test.ts score --key DIR/key.json --answers R1.json R2.json
 *     accuracy and sentences flagged, by build
 *
 * A reader's answers: `{"pages": [{"page": "P1", "answers": ["…", "…", "…"], "unclear": ["…"]}]}`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0];
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};

interface Question {
  q: string;
  /** Every group must be answered; a group is answered by any of its words. */
  key: string[][];
}

interface PageId {
  world: string;
  seed: number;
  tier: number;
  type: string;
  route: 'oracle' | 'wanderer';
  page: number;
  job: string;
  q?: string;
  questions: Question[];
}

/** A tiny seeded shuffle (the packets' order). */
function rng(seed: number): (n: number) => number {
  let s = seed >>> 0 || 1;
  return (n: number) => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return s % n;
  };
}

const HOUR: Record<number, string> = { 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };
const hourKey = (h: number): string[] => [HOUR[h] as string, String(h)];
/** A place's own word: "Mrs. Nagy’s" is "Nagy", "the Delmonico rooms" is "Delmonico". */
const placeKey = (name: string): string[] => {
  const w = name.replace(/^the /i, '').replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '').split(/[\s’']/)[0] ?? name;
  return [w];
};
const personKey = (short: string): string[] => [short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '')];

if (cmd === 'pick') {
  const out = val('out') ?? 'skim';
  const want = Number(val('pages') ?? 24);
  const r = rng(Number(val('seed') ?? 59));
  const gen = await import('../src/gen/board/index.js');
  const model = await import('../src/game/board/model.js');
  const oracle = await import('../src/game/board/oracle.js');
  const knowledge = await import('../src/game/board/knowledge.js');
  type C = ReturnType<typeof model.dealBoard>['kase'];
  const nm = (c: C, id: string) => model.nameOf(c, id);
  const pn = (c: C, id: string) => model.placeName(c, id);
  const jobs = ['office', 'account', 'list', 'search', 'confront', 'turn'];
  const per = Math.ceil(want / jobs.length);
  const ids: PageId[] = [];
  // (`--from`: where the nights start, so a second round reads nights the first never saw.)
  let s = Number(val('from') ?? 200);
  for (const job of jobs) {
    let got = 0;
    for (let tries = 0; got < per && tries < 600; tries++) {
      s++;
      // Both worlds a tier at a time: every tier four times, each world twelve.
      const world = ids.length % 2 === 0 ? 'dealt' : 'neighbourhood';
      const tier = (Math.floor(ids.length / 2) % 6) as 0 | 1 | 2 | 3 | 4 | 5;
      const types = gen.typesFor(tier);
      const type = types[r(types.length)] as string;
      const route: 'oracle' | 'wanderer' = job === 'confront' ? 'wanderer' : 'oracle';
      const d = model.dealBoard(s, tier, type as never, world === 'neighbourhood' ? { world } : {});
      const c = d.kase;
      const run = (route === 'wanderer' ? oracle.playWanderer(d, s) : oracle.playBoardOracle(d)).run;
      const idx = run.log.map((_, i) => i).filter((i) => (job === 'turn' ? !!run.log[i]?.board?.turn : run.log[i]?.board?.job === job));
      if (idx.length === 0) continue;
      const i = idx[r(idx.length)] as number;
      const p = run.log[i];
      const q = p?.board?.q;
      const qs: Question[] = [];
      const hc = c.crime.window;
      const suspects = model.suspectsOf(c);
      if (job === 'office') {
        if (model.isMurder(c) && c.crime.finder) qs.push({ q: `Who found ${nm(c, c.crime.victim)}?`, key: [personKey(nm(c, c.crime.finder))] });
        else qs.push({ q: `What has gone missing?`, key: [[model.victimOf(c).short.replace(/^the /, '')]] });
        qs.push({ q: `At what hour does the client say it happened? (Give every hour the client gives.)`, key: (c.givens.window ?? hc).map((h) => hourKey(h)) });
        if (c.givens.pointer) qs.push({ q: `Who does the client name as somebody with a reason?`, key: [personKey(nm(c, c.givens.pointer))] });
      } else if (job === 'account' && q) {
        const who = q.slice('account:'.length);
        const a = knowledge.accountOf(c, who);
        const he = model.pronOf(c, who);
        const claimed = c.board.hours.filter((h) => a?.claims[h as never]);
        const h1 = (claimed.find((h) => hc.includes(h as never)) ?? claimed[0]) as number;
        const cl1 = a?.claims[h1 as never];
        // (A home is answered by "home" or "my room", the way an account says it: round 2's key took only the place's name.)
        const whereKey = (pl: string) => (model.personOf(c, who)?.home === pl ? ['home', 'room', ...placeKey(pn(c, pl))] : placeKey(pn(c, pl)));
        if (cl1) qs.push({ q: `Where does ${nm(c, who)} say ${he.he} was at ${HOUR[h1]}?`, key: [whereKey(cl1.place)] });
        const h2 = claimed.find((h) => (a?.claims[h as never]?.company ?? []).length > 0 && h !== h1) ?? claimed.find((h) => h !== h1);
        const cl2 = h2 !== undefined ? a?.claims[h2 as never] : undefined;
        if (cl2 && cl2.company.length) qs.push({ q: `Who does ${nm(c, who)} say was with ${he.him} at ${HOUR[h2 as number]}?`, key: cl2.company.map((x) => personKey(nm(c, x))) });
        else if (cl2) qs.push({ q: `Was anybody with ${nm(c, who)} at ${HOUR[h2 as number]}, by ${he.his} own account?`, key: [['nobody', 'no one', 'alone', 'no', 'own']] });
        const h3 = claimed.find((h) => h !== h1 && h !== h2);
        const cl3 = h3 !== undefined ? a?.claims[h3 as never] : undefined;
        const remark = a?.remarks.find((x) => /passed/.test(x.text));
        const passed = remark ? /I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on/.exec(remark.text)?.[1] : undefined;
        if (passed) qs.push({ q: `Who did ${nm(c, who)} pass on the way, by ${he.his} own account?`, key: [personKey(passed)] });
        else if (cl3) qs.push({ q: `Where does ${nm(c, who)} say ${he.he} was at ${HOUR[h3 as number]}?`, key: [whereKey(cl3.place)] });
      } else if (job === 'list' && q) {
        const w = q.slice('list:'.length);
        const l = knowledge.listOf(c, w);
        if (!l) continue;
        const at = (x: string, h: number) => (l.entries[h as never] ?? []).some((e) => 'person' in e && e.person === x);
        const hs = c.board.hours.filter((h) => l.entries[h as never] !== undefined);
        const h0 = (hs.find((h) => hc.includes(h as never)) ?? hs[hs.length - 1]) as number;
        const present = suspects.filter((x) => at(x, h0));
        const absent = suspects.filter((x) => !at(x, h0) && hs.some((h) => at(x, h)));
        const pickX = absent.length && (present.length === 0 || r(2) === 0) ? absent[r(absent.length)] : present[r(Math.max(1, present.length))];
        if (pickX) qs.push({ q: `According to ${nm(c, w)}, was ${nm(c, pickX)} at ${pn(c, l.place)} at ${HOUR[h0]}?`, key: [present.includes(pickX) ? ['yes'] : ['no', 'not', 'wasn’t', "wasn't", 'gone', 'left']] });
        const all = c.people.filter((x) => !x.object && hs.every((h) => at(x.id, h))).map((x) => x.id);
        if (all.length) qs.push({ q: `According to ${nm(c, w)}, who was at ${pn(c, l.place)} the whole evening?`, key: all.map((x) => personKey(nm(c, x))) });
        else {
          const came = c.people.filter((x) => !x.object && hs.some((h) => at(x.id, h))).map((x) => ({ id: x.id, first: hs.find((h) => at(x.id, h)) as number }));
          const y = came[r(Math.max(1, came.length))];
          // (In from the list's first hour is answered by "from the start", the way a list by change says it.)
          if (y) qs.push({ q: `According to ${nm(c, w)}, when did ${nm(c, y.id)} first come in?`, key: [y.first === hs[0] ? [...hourKey(y.first), 'start', 'beginning', 'all evening', 'whole evening', 'throughout'] : hourKey(y.first)] });
        }
        const left = c.people.filter((x) => !x.object && hs.some((h) => at(x.id, h)) && !at(x.id, hs[hs.length - 1] as number)).map((x) => ({ id: x.id, last: [...hs].reverse().find((h) => at(x.id, h)) as number }));
        const z = left[r(Math.max(1, left.length))];
        if (z) qs.push({ q: `According to ${nm(c, w)}, what was the last hour ${nm(c, z.id)} was there?`, key: [hourKey(z.last)] });
      } else if (job === 'search' && q) {
        const f = c.finds.find((x) => `search:${x.id}` === q);
        if (!f) continue;
        if (f.gives.why) {
          const two = suspects.slice(0, 3);
          for (const x of two) {
            const motive = (model.personOf(c, x)?.motive ?? '').toLowerCase();
            // (Round 4: "knew" and "friend" too, where the bible's motive ends "…only an old friend would".)
            const word = (/\b(lease|four hundred|rent|shop|file|squeezing|1921|business|brother|sister|letters|money|wedding|will|books|rival|roof|throat|knew|friend)\b/.exec(motive)?.[1] ?? motive.split(' ').slice(-1)[0]) as string;
            // (A lease is answered by the notice to quit too, the way main's papers put it: round 4.)
            qs.push({ q: `What grudge did ${nm(c, x)} have, by the papers?`, key: [word === 'lease' ? ['lease', 'quit', 'evict', 'street'] : [word]] });
          }
        } else if (model.isMurder(c)) {
          qs.push({ q: `What was found at the scene?`, key: [[c.means.name.replace(/^(a|an|the) /, '').split(' ').slice(-1)[0] as string]] });
          qs.push({ q: `Where did it come from?`, key: [placeKey(pn(c, c.means.origin))] });
          qs.push({ q: `So where must whoever did it have been, before?`, key: [placeKey(pn(c, c.means.origin))] });
        } else {
          qs.push({ q: `What was gone from the scene?`, key: [[model.victimOf(c).short.replace(/^the /, '')]] });
          qs.push({ q: `How did whoever it was get in?`, key: [['key', 'window', 'door', 'lock', 'latch']] });
          qs.push({ q: `Which place does the find point to?`, key: [placeKey(pn(c, c.means.origin))] });
        }
      } else if (job === 'confront' && q) {
        const [who, hs] = q.slice('confront:'.length).split('@') as [string, string];
        const h = Number(hs);
        const he = model.pronOf(c, who);
        const claim = knowledge.accountOf(c, who)?.claims[h as never];
        if (claim) qs.push({ q: `What had ${nm(c, who)} said about ${HOUR[h]}, before it was put to ${he.him}?`, key: [model.personOf(c, who)?.home === claim.place ? ['home', ...placeKey(pn(c, claim.place))] : placeKey(pn(c, claim.place))] });
        const put = run.puts.find((x) => x.person === who && x.hour === h);
        const line = put ? knowledge.linesHeld(c, run).find((l) => l.id === put.line) : undefined;
        if (line?.speaker) qs.push({ q: `Whose word was put against ${nm(c, who)}’s?`, key: [personKey(nm(c, line.speaker))] });
        const k = knowledge.confrontationOf(c, who, h);
        const lie = c.lies.find((l) => l.person === who && l.hour === h);
        if (put && !put.landed) qs.push({ q: `Did the put land?`, key: [['no', 'not', 'didn’t', "didn't", 'nothing']] });
        else if (k?.response === 'admit' && lie) qs.push({ q: `Where does ${nm(c, who)} now say ${he.he} was at ${HOUR[h]}?`, key: [placeKey(pn(c, lie.truth))] });
        else if (k?.secondLie?.place) qs.push({ q: `Where does ${nm(c, who)} now say ${he.he} was at ${HOUR[h]}?`, key: [placeKey(pn(c, k.secondLie.place))] });
        else qs.push({ q: `Does ${nm(c, who)} say where ${he.he} really was?`, key: [['no', 'not', 'won’t', "won't", 'refuse', 'nothing']] });
      } else if (job === 'turn') {
        const heldRun = { asked: run.asked.filter((x) => run.log.slice(0, i + 1).some((pg) => pg.board?.q === x)), puts: run.puts.filter((x) => x.page <= i) };
        const solved = knowledge.solveRun(c, heldRun);
        const hs2 = solved.possibleHours.length ? solved.possibleHours : (c.givens.window ?? hc);
        qs.push({ q: `At what hour did it happen, as far as the detective has it here? (Give every hour still possible.)`, key: hs2.map((h) => hourKey(h)) });
        const col = knowledge.collisionsOf(c, heldRun)[0];
        if (col) qs.push({ q: `Whose story doesn't agree with what somebody else said, and about what hour?`, key: [personKey(nm(c, col.person)), hourKey(col.hour)] });
        if (model.isMurder(c)) qs.push({ q: `Where did the ${c.means.name.replace(/^(a|an|the) /, '')} come from?`, key: [placeKey(pn(c, c.means.origin))] });
        else qs.push({ q: `Where could whoever did it have learned the way in?`, key: [placeKey(pn(c, c.means.origin))] });
      }
      if (qs.length < 3) continue;
      ids.push({ world, seed: s, tier, type, route, page: i, job, ...(q ? { q } : {}), questions: qs.slice(0, 3) });
      got++;
    }
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'ids.json'), `${JSON.stringify(ids.slice(0, want), null, 1)}\n`);
  process.stdout.write(`${Math.min(want, ids.length)} pages → ${join(out, 'ids.json')}\n`);
} else if (cmd === 'dump') {
  const root = resolve(val('root') ?? '.');
  const ids = JSON.parse(readFileSync(val('ids') as string, 'utf8')) as PageId[];
  const model = await import(`${root}/src/game/board/model.ts`);
  const oracle = await import(`${root}/src/game/board/oracle.ts`);
  const out: Record<string, string> = {};
  for (const [k, id] of ids.entries()) {
    const d = model.dealBoard(id.seed, id.tier, id.type, id.world === 'neighbourhood' ? { world: id.world } : {});
    const run = (id.route === 'wanderer' ? oracle.playWanderer(d, id.seed) : oracle.playBoardOracle(d)).run;
    const p = run.log[id.page];
    if (!p || (id.q && p.board?.q !== id.q && id.job !== 'turn')) throw new Error(`page ${k + 1}: not the same page in ${root} (${p?.board?.q} for ${id.q})`);
    out[`P${k + 1}`] = p.blocks.filter((b: { kind: string }) => b.kind === 'prose').map((b: { text: string }) => b.text).join('\n\n');
  }
  writeFileSync(val('out') as string, `${JSON.stringify(out, null, 1)}\n`);
  process.stdout.write(`${Object.keys(out).length} pages → ${val('out')}\n`);
} else if (cmd === 'packets') {
  const ids = JSON.parse(readFileSync(val('ids') as string, 'utf8')) as PageId[];
  const before = JSON.parse(readFileSync(val('before') as string, 'utf8')) as Record<string, string>;
  const after = JSON.parse(readFileSync(val('after') as string, 'utf8')) as Record<string, string>;
  const out = val('out') ?? 'skim';
  const r = rng(Number(val('seed') ?? 59));
  // Half the pages to reader 1 in the before build, the other half in the after build; reader 2 the reverse.
  const order = ids.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = r(i + 1);
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  const firstHalf = new Set(order.slice(0, Math.floor(order.length / 2)));
  const key: Record<string, { reader: number; page: string; build: 'before' | 'after'; questions: Question[]; label: string }[]> = { '1': [], '2': [] };
  for (const reader of [1, 2]) {
    const seq = ids.map((_, i) => i);
    for (let i = seq.length - 1; i > 0; i--) {
      const j = r(i + 1);
      [seq[i], seq[j]] = [seq[j] as number, seq[i] as number];
    }
    const md: string[] = [
      `# Reading test, reader ${reader}`,
      '',
      'These are pages from a detective game: a private eye in 1920s New York narrates one night of questions, page by page. Each page below is from a different night.',
      '',
      '**For each page: read it once, top to bottom, at your normal pace. Then answer its three questions from what you took in, without going back over the page.** Short answers are best (a name, a place, an hour, yes or no).',
      '',
      // (Round 3 on: "every sentence … you had to read twice" read as a quota, two a page whatever the page;
      // a sentence understood on the first pass isn't one, and many pages have none.)
      '**Then quote, exactly, each sentence you actually had to go back and read again, or whose meaning you are still unsure of (what it meant, who or what a word pointed at, or how it followed from the sentence before).** A sentence you understood on the first pass doesn’t count, even if it’s figurative or you’d have put it differently. You may look back at the page for this part only. Many pages will have none; then give an empty list.',
      '',
      'Answer in one JSON block at the end, in this shape: `{"pages": [{"page": "R1", "answers": ["…", "…", "…"], "unclear": ["…"]}]}`.',
      '',
    ];
    seq.forEach((i, n) => {
      const id = ids[i] as PageId;
      const build = (reader === 1) === firstHalf.has(i) ? 'before' : 'after';
      const text = (build === 'before' ? before : after)[`P${i + 1}`] ?? '';
      const label = `R${n + 1}`;
      key[String(reader)]?.push({ reader, page: label, build, questions: id.questions, label: `${id.world} seed ${id.seed} tier ${id.tier} ${id.type} p${id.page + 1} (${id.job})` });
      md.push(`## Page ${label}`, '', ...text.split('\n\n').map((x) => `> ${x}\n>`), '', '**Questions**', '', ...id.questions.map((q, k) => `${k + 1}. ${q.q}`), '');
    });
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `reader-${reader}.md`), `${md.join('\n')}\n`);
  }
  writeFileSync(join(out, 'key.json'), `${JSON.stringify(key, null, 1)}\n`);
  process.stdout.write(`packets → ${join(out, 'reader-1.md')}, ${join(out, 'reader-2.md')} (key in ${join(out, 'key.json')})\n`);
} else if (cmd === 'score') {
  const key = JSON.parse(readFileSync(val('key') as string, 'utf8')) as Record<string, { page: string; build: 'before' | 'after'; questions: Question[]; label: string }[]>;
  const files = args.slice(args.indexOf('--answers') + 1).filter((x) => !x.startsWith('--'));
  const tally = { before: { right: 0, asked: 0, flagged: 0, pages: 0 }, after: { right: 0, asked: 0, flagged: 0, pages: 0 } };
  const misses: string[] = [];
  files.forEach((f, k) => {
    const raw = readFileSync(f, 'utf8');
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as { pages: { page: string; answers: string[]; unclear: string[] }[] };
    const mine = key[String(k + 1)] ?? [];
    for (const kp of mine) {
      const a = json.pages.find((x) => x.page === kp.page);
      const t = tally[kp.build];
      t.pages++;
      t.flagged += a?.unclear?.length ?? 0;
      kp.questions.forEach((q, i) => {
        t.asked++;
        const ans = (a?.answers?.[i] ?? '').toLowerCase().replace(/'/g, '’');
        const ok = q.key.every((g) => g.some((w) => new RegExp(`(?<![a-z])${w.toLowerCase().replace(/'/g, '’').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(ans)));
        if (ok) t.right++;
        else misses.push(`reader ${k + 1} ${kp.page} [${kp.build}] ${kp.label}: “${q.q}” → “${a?.answers?.[i] ?? ''}” (want ${q.key.map((g) => g.join('/')).join(' + ')})`);
      });
    }
  });
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
  process.stdout.write(`| build | pages read | questions right | sentences flagged | flagged a page |\n|---|---|---|---|---|\n`);
  for (const b of ['before', 'after'] as const) {
    const t = tally[b];
    process.stdout.write(`| ${b} | ${t.pages} | ${t.right} of ${t.asked} (${pct(t.right, t.asked)}) | ${t.flagged} | ${t.pages ? (t.flagged / t.pages).toFixed(2) : '—'} |\n`);
  }
  const pass = tally.after.right / Math.max(1, tally.after.asked) >= tally.before.right / Math.max(1, tally.before.asked) && tally.after.flagged * 2 <= tally.before.flagged;
  process.stdout.write(`\ngate (after's accuracy ≥ before's, flagged sentences cut by half): ${pass ? 'PASS' : 'FAIL'}\n`);
  if (args.includes('--misses')) process.stdout.write(`\n${misses.join('\n')}\n`);
} else {
  process.stdout.write('usage: skim-test.ts pick | dump | packets | score (see the header)\n');
}
