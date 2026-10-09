/**
 * docs/44: the board's prose, measured. `npx tsx scripts/board-prose.ts [--nights 30] [--tiers 0,1,2,3,4,5] [--show]`
 *
 * Over N nights a tier, mixing the case types the tier builds (seed s takes the
 * tier's types in turn), along the oracle's route (what `npm run read` shows):
 *
 * - **words a page**: median, and the 10th and 90th percentiles (target median 200–300);
 * - **why-here or walk**: the share of pages after the office that open on the
 *   pointer that sent the detective, or on the walk there (target 100%);
 * - **thought**: the share of job pages (an account, a list, a search, a put, a
 *   motive) whose thought names an earlier fact: a person, place or street
 *   already on an earlier page, and a held line it cites (target 100%);
 * - **callbacks**: the share of pages after the office that pay off a role set
 *   up earlier tonight (target about 70%);
 * - **reader lint, plain terms and correspondence**: findings over the oracle's
 *   and the wanderer's nights (target 0);
 * - **repeats**: a card dealt twice in a night, and a sentence of six words or
 *   more narrated twice in a night, outside speech, the answers and the recaps (target 0);
 * - **names over two** (docs/39 §4): pages where somebody is named more than
 *   twice, speech included, outside a witness's list, a person's own account
 *   and the recap's clauses (the notebook said aloud); the turn's chapter
 *   counts as a page of its own (target 0);
 * - **clues restated**: a remark or a find whose wording (a three-word run
 *   with two content words in it, not the office's own words, the means' or
 *   anybody's name) turns up in more than two paragraphs of a night, outside
 *   the notebook (target 0).
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { dealBoard, tierName, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import type { Block, Page } from '../src/game/types.js';
import { namesOverTwo } from '../src/game/board/names.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 30);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const show = args.includes('--show');
const terms = loadPlainTerms();

const JOBS = new Set(['account', 'list', 'search', 'confront', 'motive']);

function proseOf(p: Page, voices?: string[]): string {
  return p.blocks
    .filter((b) => b.kind === 'prose' && (!voices || voices.includes(b.voice)))
    .map((b) => (b.kind === 'prose' ? b.text : ''))
    .join('\n');
}

function words(t: string): number {
  return t.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
}

function pct(k: number, n: number): string {
  return n === 0 ? '—' : `${Math.round((100 * k) / n)}%`;
}

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
}

/** Names a night could mention: people, places and streets. */
function namesOf(run: BoardRun, d: ReturnType<typeof dealBoard>): string[] {
  const c = d.kase;
  const out = new Set<string>();
  for (const p of c.people) out.add(p.short);
  for (const p of c.places) {
    out.add(p.short);
    out.add(p.street);
  }
  void run;
  return [...out].filter((x) => x.length >= 3);
}

const STOP = new Set('the a an and or but of to in on at by for with from was were had has have his her him he she it its i me my we you your they them their there here that this then than so as not no nobody somebody something anybody anything what who when where which if into out up down over about after before just only all one two three said says like be been is are did do does would could went came got door opened turned back each whoever'.split(' '));
const HOURS = new Set(['seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'o’clock', 'midnight']);

function tokens(t: string): string[] {
  return t
    .toLowerCase()
    .replace(/[“”"]/g, ' ')
    .split(/[^a-z’'-]+/)
    .filter(Boolean);
}

/** A clue's distinctive wording: its three-word runs with a content word in them. */
function cluesOf(d: ReturnType<typeof dealBoard>): { id: string; grams: Set<string> }[] {
  const c = d.kase;
  const names = new Set<string>();
  for (const p of c.people) for (const w of tokens(p.short)) names.add(w);
  for (const p of c.places) for (const w of tokens(`${p.short} ${p.street} ${p.name}`)) names.add(w);
  // The means and the thing are named all night; the office's own words aren't a clue restated.
  for (const w of tokens(`${c.means.name} ${c.means.originText}`)) names.add(w);
  const office = gramsOf(c.givens.text.join(' '));
  const texts: { id: string; text: string }[] = [];
  for (const a of c.accounts) a.remarks.forEach((r, i) => texts.push({ id: `remark:${a.person}#${i}`, text: r.text }));
  for (const l of c.lists) l.remarks.forEach((r, i) => texts.push({ id: `remark:${l.watcher}#${i}`, text: r.text }));
  for (const f of c.finds) texts.push({ id: `find:${f.id}`, text: f.text });
  return texts.map(({ id, text }) => {
    const ws = tokens(text);
    const grams = new Set<string>();
    for (let i = 0; i + 2 < ws.length; i++) {
      const g = ws.slice(i, i + 3);
      const content = g.filter((w) => w.length >= 3 && !STOP.has(w) && !names.has(w) && !HOURS.has(w)).length;
      if (content >= 2 && !office.has(g.join(' '))) grams.add(g.join(' '));
    }
    return { id, grams };
  });
}

function gramsOf(t: string): Set<string> {
  const ws = tokens(t);
  const out = new Set<string>();
  for (let i = 0; i + 2 < ws.length; i++) out.add(ws.slice(i, i + 3).join(' '));
  return out;
}

const rows: string[] = [];
rows.push('| tier | nights | pages | words a page, median [p10–p90] | why-here or walk | job pages with a thought naming an earlier fact | callbacks | lint (reader) | correspondence | plain terms | cards twice | sentences twice | pages naming somebody 3+ times | clues said 3+ times |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const examples: string[] = [];
for (const tier of tiers) {
  const types = typesFor(tier) as CaseType[];
  const counts: number[] = [];
  const byJob = new Map<string, number[]>();
  let pages = 0;
  let after = 0;
  let threaded = 0;
  let jobPages = 0;
  let thoughtful = 0;
  let callbacks = 0;
  let reader = 0;
  let corr = 0;
  let jargon = 0;
  let cardsTwice = 0;
  let sentTwice = 0;
  let namePages = 0;
  let cluesThrice = 0;
  for (let s = 1; s <= N; s++) {
    const type = types[s % types.length] as CaseType;
    const d = dealBoard(s, tier, type);
    const o = playBoardOracle(d);
    const run = o.run;
    const names = namesOf(run, d);
    const seenText: string[] = [];
    const sentences = new Map<string, number>();
    run.log.forEach((p, i) => {
      const text = proseOf(p);
      counts.push(words(text));
      const jk = p.board?.job ?? '?';
      byJob.set(jk, [...(byJob.get(jk) ?? []), words(text)]);
      pages++;
      const b = p.board;
      if (i > 0) {
        after++;
        const beats = (b as { beats?: string[] } | undefined)?.beats ?? [];
        if (beats.includes('why') || beats.includes('walk')) threaded++;
        else if (examples.length < 40) examples.push(`no why/walk: ${tierName(tier)} ${type} seed ${s} p${i + 1} (${b?.job})`);
        if (b?.callback) callbacks++;
      }
      if (b && JOBS.has(b.job)) {
        jobPages++;
        const th = (b as { thought?: { text: string; refs: string[] } }).thought;
        const thoughtText = th?.text ?? proseOf(p, ['thought']);
        const earlier = seenText.join('\n');
        const named = names.some((n) => thoughtText.includes(n) && earlier.includes(n));
        const refs = th ? th.refs.length > 0 : true;
        if (thoughtText && named && refs) thoughtful++;
        else if (examples.length < 40) examples.push(`no thought: ${tierName(tier)} ${type} seed ${s} p${i + 1} (${b.job}${b.q ? ` ${b.q}` : ''})`);
      }
      seenText.push(text);
      for (const blk of p.blocks) {
        if (blk.kind !== 'prose' || blk.voice === 'answer' || blk.voice === 'recap' || blk.voice === 'chapter') continue;
        // Speech reads facts back (a put quotes the line that breaks the story): only the narration counts.
        for (const sent of blk.text.replace(/“[^”]*”/g, ' ').split(/(?<!\bMrs?\.)(?<=[.!?][”’]?)\s+/)) {
          if (words(sent) < 6) continue;
          sentences.set(sent, (sentences.get(sent) ?? 0) + 1);
        }
      }
      cardsTwice += (b as { repeats?: number } | undefined)?.repeats ?? 0;
      const exempt = (blk: Block) => blk.kind === 'prose' && ((blk.voice === 'answer' && (b?.job === 'account' || b?.job === 'list')) || (blk.voice === 'recap' && blk.text === (b as { recap?: string } | undefined)?.recap));
      const over = namesOverTwo(d.kase, p.blocks, exempt);
      if (over.length) {
        namePages++;
        if (examples.length < 80) examples.push(`names: ${tierName(tier)} ${type} seed ${s} p${i + 1}: ${over.join(', ')}`);
        if (args.includes('--names-text') && examples.length < 80) examples.push(p.blocks.filter((x) => x.kind === 'prose' && !exempt(x)).map((x) => (x.kind === 'prose' ? `    | ${x.text}` : '')).join('\n'));
      }
    });
    // Clues: each remark's or find's wording, by the paragraphs it turns up in.
    const paras = run.log.flatMap((p, pi) => p.blocks.flatMap((blk) => (blk.kind === 'prose' ? [{ pi, g: gramsOf(blk.text) }] : [])));
    for (const cl of cluesOf(d)) {
      const hits = paras.filter((x) => [...cl.grams].some((y) => x.g.has(y)));
      if (hits.length > 2) {
        cluesThrice++;
        if (examples.length < 80) examples.push(`clue ×${hits.length}: ${tierName(tier)} ${type} seed ${s}: ${cl.id} [${hits.map((x) => `p${x.pi + 1} “${[...cl.grams].find((y) => x.g.has(y))}”`).join(', ')}]`);
      }
    }
    for (const [sent, n] of sentences) {
      if (n > 1) {
        sentTwice += n - 1;
        if (examples.length < 60) examples.push(`twice: ${tierName(tier)} ${type} seed ${s}: ${sent.slice(0, 100)}`);
      }
    }
    for (const r of [run, playWanderer(d, s).run] as BoardRun[]) {
      for (const issue of lintBoardRun(d, r)) {
        if (issue.rule === 'hour' || issue.rule === 'name' || issue.rule === 'whole') corr++;
        else reader++;
        if (examples.length < 60) examples.push(`lint ${tierName(tier)} ${type} seed ${s} p${issue.page + 1}: ${issue.rule} ${issue.detail}`);
      }
      for (const t of boardPlayerText(r)) {
        const hits = findJargon(t, terms) as { term: string; match: string }[];
        jargon += hits.length;
        if (hits.length && examples.length < 60) examples.push(`jargon ${tierName(tier)} ${type} seed ${s}: ${hits[0]?.term} "${hits[0]?.match}"`);
      }
    }
  }
  if (show) examples.push(`words by job, ${tierName(tier)}: ${[...byJob.entries()].map(([k, v]) => `${k} ${quantile(v, 0.5)} (${v.length})`).join(', ')}`);
  rows.push(
    `| ${tierName(tier)} | ${N} | ${pages} | ${quantile(counts, 0.5)} [${quantile(counts, 0.1)}–${quantile(counts, 0.9)}] | ${pct(threaded, after)} | ${pct(thoughtful, jobPages)} | ${pct(callbacks, after)} | ${reader} | ${corr} | ${jargon} | ${cardsTwice} | ${sentTwice} | ${namePages} | ${cluesThrice} |`,
  );
}
process.stdout.write(`${rows.join('\n')}\n`);
if (show && examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
