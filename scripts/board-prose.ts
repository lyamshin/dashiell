/**
 * docs/44: the board's prose, measured. `npx tsx scripts/board-prose.ts [--nights 30] [--from 1] [--tiers 0,1,2,3,4,5] [--show] [--plan off] [--situated 0]`
 *
 * Over N nights a tier, mixing the case types the tier builds (seed s takes the
 * tier's types in turn), along the oracle's route (what `npm run read` shows):
 *
 * - **words a page**: median, and the 10th and 90th percentiles (target median 200–300);
 * - **why-here or walk**: the share of pages after the office that open on the
 *   pointer that sent the detective, or on the walk there (target 100%);
 * - **thought**: the share of job pages (an account, a list, a search, a put, a
 *   motive) whose thought names an earlier fact: a person, place or street
 *   already on an earlier page, and a held line it cites (target 100% below
 *   Hard-boiled; at Hard-boiled the thought stays on its own page, docs/46 §2);
 * - **thoughts over their level** (docs/46 §2, the lint's `level` rule): above
 *   Raw, a thought, turn or "Go over what I have" before the report that says
 *   "that left", "only … left", "cleared", how many remain or who did it; at
 *   Hard-boiled, a thought tied to an earlier page. Over the oracle's, the
 *   wanderer's and the reader's nights (target 0);
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
 *
 * docs/47 C14, over the oracle's, the wanderer's and the reader's nights (`prose-lint.ts`, target 0 each):
 *
 * - **place names bolted on**: "hung in the hall at the Delmonico rooms" after the paragraph named
 *   it, or one place three times in a paragraph of narration;
 * - **banned phrases**: the board read aloud ("with the list under both", "had himself at"), quest-log
 *   signposts ("Which brought me to", "So, Moe’s.", "The next place worth the walk"), game talk ("the
 *   report wants"), and British spellings in a New York voice;
 * - **pages with 2+ signposts**: more than one where-next sentence on a page;
 * - **gags paid off 3+ times**: one prop, trait or street paid off more than twice a night;
 * - **a pet called "it"**: "who took it", "it went at ten", on a page or on the form.
 *
 * "why-here or walk" counts a page whose reason the page before said (its hand-off, or the arrival
 * in this room) as carrying it (`Page.board.carried`): docs/47 cut the signposts that said it again.
 *
 * docs/49 §4, the microplanner's (`plan/measure.ts`), along the oracle's route; the two that are
 * lints (list smell, pronoun ambiguity) over the oracle's, the wanderer's and the reader's nights too:
 *
 * - **sentences per fact unit** (target ≤ 1.2);
 * - **list smell**: pages with three narration sentences in a row in one length band, or opening on
 *   the same two words (target 0);
 * - **pronoun ambiguity**: a pronoun with two possible referents in the last two sentences (target 0);
 * - **joins a page**: the connectives that say what a fact does, on pages with facts (report; 1–3);
 * - **restated pointer**: a why-here saying again the page before's hand-off (target 0);
 * - **thought sentences** (Planner 2): the sentences a thought's facts take, per fact, and the share
 *   of thought paragraphs whose N facts take at most ceil(N/2) sentences (all of them; and of those
 *   with two facts or more).
 *
 * `--plan off` measures the same nights with the microplanner's four operations off: the pages as
 * they read before docs/49, word for word, for the "before" column.
 *
 * docs/51, the situated deck, along the oracle's route:
 *
 * - **situated share**: of the gaps the deck may fill (texture dealt from a family, as dealt; not a
 *   fact, a bible line, a pay-off, a first look or a gap that carries a reason), the share it filled
 *   (target ≥ 80%); and the same over every gap in the deck's eight slots;
 * - how far each card had to let its key go (the exact key, or one, two, … fields let go).
 *
 * `--situated 0` measures the same nights with the old decks only, for the "before" column.
 */

import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { lintBoardRun, boardPlayerText } from '../src/game/board/lint.js';
import { dealBoard, tierName, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import type { Block, Page } from '../src/game/board/types.js';
import { namesOverTwo } from '../src/game/board/names.js';
import { proseIssues, type ProseIssue } from '../src/game/board/prose-lint.js';
import { isWorld, worldBible } from '../src/gen/board/world/index.js';
import { bibleShare } from '../src/game/board/world.js';
import { PLAN } from '../src/game/board/plan/index.js';
import { SITUATED, DROPS, parseKey, project, situatedDeck } from '../src/game/board/plan/situated.js';
import { factSentences, joinsIn, listSmell, pronounAmbiguity, restatedPointer, thoughtParagraphs } from '../src/game/board/plan/measure.js';
// @ts-expect-error — plain JavaScript module, no declarations.
import { findJargon, loadPlainTerms } from './plain-terms.mjs';

const args = process.argv.slice(2);
const val = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const N = Number(val('nights') ?? 30);
// docs/51: `--from 41` measures nights the situated deck’s sample (seeds 1–40) never saw.
const FROM = Number(val('from') ?? 1);
const tiers = (val('tiers') ?? '0,1,2,3,4,5').split(',').map(Number) as TierIndex[];
const show = args.includes('--show');
if (val('plan') === 'off') PLAN.ops = false;
if (val('situated') === '0') SITUATED.on = false;
const SIT_SLOTS = new Set(['why-here', 'walk', 'staging', 'ask', 'reaction', 'close', 'hand-off', 'gloss']);
const cardKey = new Map(situatedDeck().map((c) => [c.id, parseKey(c.key)]));
// docs/48 §4: `--world neighbourhood` reads nights cast from the bible, and adds the bible's share.
const world = val('world');
if (world !== undefined && !isWorld(world)) throw new Error(`No world called "${world}".`);
const bible = world ? worldBible(world) : undefined;
const rows2: string[] = [];
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
rows.push('| tier | nights | pages | words a page, median [p10–p90] | why-here or walk | job pages with a thought naming an earlier fact | callbacks | lint (reader) | correspondence | thoughts over their level | plain terms | cards twice | sentences twice | pages naming somebody 3+ times | clues said 3+ times | place names bolted on | banned phrases | pages with 2+ signposts | gags paid off 3+ times | a pet called “it” |');
rows.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const examples: string[] = [];
const rows3: string[] = [];
rows3.push('| tier | sentences per fact unit | list smell, pages (oracle) | pronoun ambiguity (oracle) | joins a page with facts, mean [share with 1–3] | restated pointer | list smell, pages (all three) | pronoun ambiguity (all three) | thought: fact sentences per fact [paragraphs within ceil(N/2); of those with 2+ facts] |');
rows3.push('|---|---|---|---|---|---|---|---|---|');
const examples3: string[] = [];
const rows4: string[] = [];
rows4.push(`| tier | gaps the deck may fill | filled | situated share | share of every gap in its eight slots | exact key | ${DROPS.map((_, i) => `${i + 1} let go`).join(' | ')} |`);
rows4.push(`|---|---|---|---|---|---|${DROPS.map(() => '---').join('|')}|`);
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
  let level = 0;
  let jargon = 0;
  let cardsTwice = 0;
  let sentTwice = 0;
  let namePages = 0;
  let cluesThrice = 0;
  const r3: Record<ProseIssue['rule'], number> = { 'place-tag': 0, phrase: 0, signpost: 0, gag: 0, pet: 0 };
  const share = { arrival: { bible: 0, total: 0 }, staging: { bible: 0, total: 0 } };
  // docs/49 §4.
  let factSent = 0;
  let factUnits = 0;
  let smellPages = 0;
  let ambiguous = 0;
  let joinPages = 0;
  let joinCount = 0;
  let joinInBand = 0;
  let restated = 0;
  let smellAll = 0;
  let ambiguousAll = 0;
  let worldGags = 0;
  // docs/51.
  let situable = 0;
  let situated = 0;
  let eight = 0;
  const levels = DROPS.map(() => 0).concat([0]);
  // docs/49, Planner 2: the thought's sentences against its facts.
  let thFacts = 0;
  let thSent = 0;
  let thParas = 0;
  let thWithin = 0;
  let thParas2 = 0;
  let thWithin2 = 0;
  for (let s = FROM; s < FROM + N; s++) {
    const type = types[s % types.length] as CaseType;
    const d = dealBoard(s, tier, type, world ? { world } : {});
    const o = playBoardOracle(d);
    const run = o.run;
    if (bible) {
      for (const p of run.log) {
        if (p.board?.job === 'office' || !p.board?.said) continue;
        for (const k of ['arrival', 'staging'] as const) {
          const x = bibleShare(bible, p.board.said[k]);
          share[k].bible += x.bible;
          share[k].total += x.total;
        }
      }
      // A running gag lands at most twice a night.
      const night = run.log.flatMap((p) => p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text] : [])));
      for (const pl of bible.places) {
        for (const g of pl.details.filter((x) => x.kind === 'gag')) {
          const key = g.text.slice(0, 40);
          const n = night.filter((t) => t.includes(key)).length;
          if (n > 2) {
            worldGags++;
            if (examples.length < 120) examples.push(`world gag ×${n}: ${tierName(tier)} ${type} seed ${s}: ${key}`);
          }
        }
      }
    }
    // docs/49 §4, along the oracle's route.
    run.log.forEach((p, i) => {
      const units = p.board?.units ?? [];
      for (const u of units) {
        if (u.kind !== 'gap') continue;
        if (SIT_SLOTS.has(u.slot)) eight++;
        if (!u.key) continue;
        situable++;
        if (!u.card) continue;
        situated++;
        const want = parseKey(u.key);
        const have = cardKey.get(u.card);
        if (have) {
          const at = [0, 1, 2, 3, 4, 5, 6].find((l) => project(want, l) === project(have, l)) ?? DROPS.length;
          levels[at] = (levels[at] ?? 0) + 1;
        }
      }
      const fs = factSentences(units);
      factSent += fs.sentences;
      factUnits += fs.units;
      const sm = listSmell(p.blocks);
      if (sm.band.length || sm.opening.length) {
        smellPages++;
        if (examples3.length < 200) examples3.push(`smell ${tierName(tier)} ${type} seed ${s} p${i + 1}: ${[...sm.band, ...sm.opening][0]}`);
      }
      const amb = pronounAmbiguity(d.kase, p.blocks);
      ambiguous += amb.length;
      for (const a of amb) if (examples3.length < 200) examples3.push(`pronoun ${tierName(tier)} ${type} seed ${s} p${i + 1}: ${a}`);
      if (fs.units > 0 && p.board?.job !== 'office' && p.board?.job !== 'nothing') {
        const js = joinsIn(units).length;
        joinPages++;
        joinCount += js;
        if (js >= 1 && js <= 3) joinInBand++;
      }
      for (const tp of thoughtParagraphs(units)) {
        thFacts += tp.n;
        thSent += tp.s;
        thParas++;
        const ok = tp.s <= Math.ceil(tp.n / 2);
        if (ok) thWithin++;
        if (tp.n >= 2) {
          thParas2++;
          if (ok) thWithin2++;
        }
        if (!ok && examples3.length < 400) examples3.push(`thought ${tierName(tier)} ${type} seed ${s} p${i + 1}: ${tp.n} facts in ${tp.s}: ${units.filter((u) => u.beat === 'thought' && u.voice === 'thought').map((u) => u.text).join(' ').slice(0, 300)}`);
      }
      const r = restatedPointer(d.kase, run.log[i - 1], p);
      if (r) {
        restated++;
        if (examples3.length < 200) examples3.push(`restated ${tierName(tier)} ${type} seed ${s} p${i + 1}: ${r}`);
      }
    });
    for (const r of [run, playWanderer(d, s).run, playReader(d, s).run] as BoardRun[]) {
      for (const p of r.log) {
        const sm = listSmell(p.blocks);
        if (sm.band.length || sm.opening.length) smellAll++;
        ambiguousAll += pronounAmbiguity(d.kase, p.blocks).length;
      }
    }
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
        // docs/47 C13: a page whose reason the page before said (its hand-off, or the arrival in this room) carries it.
        if (beats.includes('why') || beats.includes('walk') || (b as { carried?: boolean } | undefined)?.carried) threaded++;
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
        for (const sent of blk.text.replace(/“[^”]*”/g, ' ').split(/(?<!\b(?:Mrs?|Dr)\.)(?<=[.!?][”’]?)\s+/)) {
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
    for (const r of [run, playWanderer(d, s).run, playReader(d, s).run] as BoardRun[]) {
      for (const issue of lintBoardRun(d, r)) {
        if (issue.rule === 'hour' || issue.rule === 'name' || issue.rule === 'whole') corr++;
        else if (issue.rule === 'level') level++;
        else reader++;
        if (examples.length < 60) examples.push(`lint ${tierName(tier)} ${type} seed ${s} p${issue.page + 1}: ${issue.rule} ${issue.detail}`);
      }
      for (const t of boardPlayerText(r)) {
        const hits = findJargon(t, terms) as { term: string; match: string }[];
        jargon += hits.length;
        if (hits.length && examples.length < 60) examples.push(`jargon ${tierName(tier)} ${type} seed ${s}: ${hits[0]?.term} "${hits[0]?.match}"`);
      }
      // docs/47 C14: place names bolted on, banned phrases, signposts a page, running gags, a pet called "it".
      for (const issue of proseIssues(d, r)) {
        r3[issue.rule]++;
        if (examples.length < 120) examples.push(`${issue.rule} ${tierName(tier)} ${type} seed ${s} p${issue.page + 1}: ${issue.detail}`);
      }
    }
  }
  if (bible) {
    const all = share.arrival.bible + share.staging.bible;
    const tot = share.arrival.total + share.staging.total;
    rows2.push(`| ${tierName(tier)} | ${pct(all, tot)} | ${pct(share.arrival.bible, share.arrival.total)} | ${pct(share.staging.bible, share.staging.total)} | ${worldGags} |`);
  }
  if (show) examples.push(`words by job, ${tierName(tier)}: ${[...byJob.entries()].map(([k, v]) => `${k} ${quantile(v, 0.5)} (${v.length})`).join(', ')}`);
  rows4.push(`| ${tierName(tier)} | ${situable} | ${situated} | ${pct(situated, situable)} | ${pct(situated, eight)} | ${levels.map((n) => pct(n, situated)).join(' | ')} |`);
  rows3.push(
    `| ${tierName(tier)} | ${factUnits ? (factSent / factUnits).toFixed(2) : '—'} | ${smellPages} of ${pages} | ${ambiguous} | ${joinPages ? (joinCount / joinPages).toFixed(1) : '—'} [${pct(joinInBand, joinPages)}] | ${restated} | ${smellAll} | ${ambiguousAll} | ${thFacts ? (thSent / thFacts).toFixed(2) : '—'} [${pct(thWithin, thParas)}; ${pct(thWithin2, thParas2)}] |`,
  );
  rows.push(
    `| ${tierName(tier)} | ${N} | ${pages} | ${quantile(counts, 0.5)} [${quantile(counts, 0.1)}–${quantile(counts, 0.9)}] | ${pct(threaded, after)} | ${pct(thoughtful, jobPages)} | ${pct(callbacks, after)} | ${reader} | ${corr} | ${level} | ${jargon} | ${cardsTwice} | ${sentTwice} | ${namePages} | ${cluesThrice} | ${r3['place-tag']} | ${r3.phrase} | ${r3.signpost} | ${r3.gag} | ${r3.pet} |`,
  );
}
process.stdout.write(`${rows.join('\n')}\n`);
process.stdout.write(`\n${rows3.join('\n')}\n`);
process.stdout.write(`\n${rows4.join('\n')}\n`);
if (bible) {
  process.stdout.write('\n| tier | arrival, look and staging from the bible | arrivals and looks on the way in | staging | a gag 3+ times a night |\n|---|---|---|---|---|\n');
  process.stdout.write(`${rows2.join('\n')}\n`);
}
if (show && examples.length) process.stdout.write(`\n${examples.join('\n')}\n`);
if (args.includes('--show-plan') && examples3.length) process.stdout.write(`\n${examples3.join('\n')}\n`);
