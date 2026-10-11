/**
 * docs/40 §4 — `npm run trace`: a quoted line, traced back to what wrote it.
 *
 * A short night is played in-process through `npm run play`'s own commands,
 * and lines are read off its pages the way a playtester would quote them
 * (straight apostrophes, a fragment of a sentence). One line of each kind of
 * source must trace back right: a board card, a card from the old decks the
 * board deals from, a callback line, an engine string. The lines are chosen
 * from the pages themselves, off the page's own records, so a reworded card
 * does not break the test, only a wrong trace does.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replaySave, runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { pageBodyText } from '../src/game/board/text.js';
import { dealBoard } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { formatHits, lineKey, traceLine } from '../scripts/trace-line.js';

function memoryIo(): PlayIo & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** A save a tester might send: the office and the designed path's first steps, taken by their words. */
function night(seed: number, tier: number): string {
  const io = memoryIo();
  const save = ['--save', 'night.json'];
  const run = (...argv: string[]): void => {
    const r = runPlay([...argv, ...save], io);
    expect(r.code, `${argv.join(' ')}: ${r.out}`).toBe(0);
  };
  run('new', '--seed', String(seed), '--tier', String(tier), '--no-teach');
  const d = dealBoard(seed, tier as 0);
  for (const cmd of playBoardOracle(d).commands.slice(0, 6)) {
    if (cmd.startsWith('put ')) break;
    if (cmd.startsWith('ask ')) run('do', d.kase.people.find((p) => p.id === cmd.split(' ')[1])?.short as string);
    run('do', cmd);
  }
  return io.files.get('night.json') as string;
}

const SAVES = [night(3, 4), night(5, 0)];
const PAGES = SAVES.flatMap((save) => replaySave(save).run.log.map((page) => ({ save, page, text: pageBodyText(page).replace(/\s+/g, ' ') })));

/** The longest run of a template's fixed words, from its first letter: what a tester would quote of it. */
function fixedRun(template: string): string {
  const runs = template
    .split(/\{[^{}]+\}/)
    .map((r) => r.trim().replace(/^[^A-Za-z“"]+/, '').trim())
    .sort((a, b) => b.length - a.length);
  return runs[0] ?? '';
}

/** As a tester types it: straight apostrophes and quotation marks. */
const typed = (s: string): string => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

interface CardRow {
  file: string;
  text: string;
  pay: string[];
}

const CARDS = new Map<string, CardRow>();
for (const dir of ['content/board', 'content/decks']) {
  for (const f of readdirSync(new URL(`../${dir}/`, import.meta.url)).filter((n) => n.endsWith('.json'))) {
    const cards = JSON.parse(readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8')) as {
      id: string;
      text: string;
      exports?: Record<string, { pay?: string[] }>;
    }[];
    for (const c of cards) CARDS.set(c.id, { file: `${dir}/${f}`, text: c.text, pay: Object.values(c.exports ?? {}).flatMap((x) => x.pay ?? []) });
  }
}

/** Trace the card lines a page dealt, from `dir`, and hold each to its card. */
function traceCards(dir: string): number {
  let tried = 0;
  for (const { save, page, text } of PAGES) {
    for (const id of page.cardsUsed) {
      const card = CARDS.get(id);
      const quote = card ? fixedRun(card.text) : '';
      if (!card || !card.file.startsWith(dir) || quote.length < 30 || !text.includes(quote)) continue;
      tried++;
      const hits = traceLine(save, typed(quote)).filter((h) => h.page === page.n + 1);
      expect(hits.length, `${id}: ${quote}`).toBeGreaterThan(0);
      const top = hits[0]?.sources[0];
      expect(top?.source.kind, `${id}: ${quote}\n${formatHits(hits)}`).toBe('deck');
      expect(top?.source.id).toBe(id);
      expect(top?.source.file).toBe(card.file);
      expect(top?.source.text).toBe(card.text);
      expect(top?.usedOnPage).toBe(true);
      expect(hits[0]?.job).toContain(page.board.job);
      if (tried >= 3) return tried;
    }
  }
  return tried;
}

describe('trace-line', () => {
  it('traces a board card the page dealt to its id and file', () => {
    expect(traceCards('content/board'), 'no board card said whole enough to quote').toBeGreaterThan(0);
  });

  it('traces a card from the old decks (the office, the entrance, the watcher, the look)', () => {
    expect(traceCards('content/decks'), 'no old-deck card said whole enough to quote').toBeGreaterThan(0);
  });

  it('traces a callback line to the card that exported it', () => {
    let tried = 0;
    for (const { save, page, text } of PAGES) {
      for (const key of page.cardsUsed.filter((id) => id.startsWith('pay:'))) {
        const hit = [...CARDS.entries()].flatMap(([id, c]) => c.pay.filter((l) => lineKey(l) === key).map((l) => ({ id, c, l })))[0];
        const quote = hit ? fixedRun(hit.l) : '';
        if (!hit || quote.length < 20 || !text.includes(quote)) continue;
        tried++;
        const hits = traceLine(save, typed(quote)).filter((h) => h.page === page.n + 1);
        const top = hits[0]?.sources[0];
        expect(top?.source.kind, `${hit.id}: ${quote}\n${formatHits(hits)}`).toBe('deck');
        expect(top?.source.id).toBe(hit.id);
        expect(top?.source.where).toMatch(/\.pay\[\d+\]$/);
        expect(top?.source.text).toBe(hit.l);
        expect(top?.usedOnPage).toBe(true);
      }
    }
    expect(tried, 'no callback line on these pages').toBeGreaterThan(0);
  });

  it('traces an engine line to the function that holds it', () => {
    // The papers' search writes one of a few lines of its own; one is on the page.
    // (Above Raw the papers put nobody on top, docs/46 §2, and say one of three lines of their own.)
    // (docs/47 B7: every page has its grievance by name, and the thought sets them against the way to the means.)
    const lines = [
      'had a reason. Fewer of them had been at',
      'A reason is the easy half. The other half was a way to the',
      'I put the pages back in their box. A grudge on paper is a long way from',
      'A grudge on paper is a long way from the',
      'had a reason. A reason isn’t a hand on the',
      'A reason is the easy half. Everybody in',
    ];
    const where = PAGES.flatMap((p) => lines.filter((l) => p.text.includes(l)).map((l) => ({ ...p, l })))[0];
    expect(where, 'no papers line on these pages').toBeDefined();
    const w = where as NonNullable<typeof where>;
    const hits = traceLine(w.save, typed(w.l)).filter((h) => h.page === w.page.n + 1);
    const top = hits[0]?.sources[0];
    expect(top?.source.kind, formatHits(hits)).toBe('engine');
    expect(top?.source.file).toBe('src/game/board/pages.ts');
    expect(top?.source.id).toMatch(/^function \w+/);
    expect(top?.source.line).toBeGreaterThan(0);
  });

  it('is forgiving of how a line is quoted, and honest when it is not there', () => {
    const { save, page, text } = PAGES.filter((p) => p.save === SAVES[0]).at(-1) as (typeof PAGES)[number];
    // A mid-sentence fragment, re-wrapped and in straight quotes, still finds its page.
    const words = text.split(' ').slice(8, 16).join('\n  ');
    const hits = traceLine(save, typed(words));
    expect(hits.some((h) => h.page === page.n + 1)).toBe(true);
    expect(traceLine(save, 'a line nobody ever wrote down anywhere')).toEqual([]);
    expect(() => traceLine('{"not":"a save"}', 'anything')).toThrow();
    // A save from the engines before the board says so, and doesn't replay.
    expect(() => traceLine(JSON.stringify({ game: 'dashiell-play', version: 1, seed: 3, tier: 4, level: 2, events: [] }), 'anything')).toThrow(/engine that’s gone/);
  });

  it('is never reachable from npm run play', () => {
    for (const file of ['../src/cli/play-lib.ts', '../src/cli/play.ts']) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(src, file).not.toMatch(/(?:from|import|require)\s*\(?\s*['"][^'"]*trace-line/);
    }
  });
});
