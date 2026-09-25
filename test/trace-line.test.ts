/**
 * docs/40 §4 — `npm run trace`: a quoted line, traced back to what wrote it.
 *
 * A short night is played in-process through `npm run play`'s own commands,
 * and lines are read off its pages the way a playtester would quote them
 * (straight apostrophes, a fragment of a sentence). One line of each kind of
 * source must trace back right: a deck card, a sheet's line, an engine
 * constant. The lines are chosen from the pages themselves, off the page's own
 * records, so a reworded card does not break the test, only a wrong trace does.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replaySave, runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { renderPageBody } from '../src/game/transcript.js';
import * as VOICE from '../src/game/voice-data.js';
import { formatHits, lineKey, traceLine } from '../scripts/trace-line.js';

function memoryIo(): PlayIo & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

/** A save a tester might send: the office, a question, a walk, a question there, a search. */
function night(): string {
  const io = memoryIo();
  const save = ['--save', 'night.json'];
  const run = (...argv: string[]): void => {
    const r = runPlay([...argv, ...save], io);
    expect(r.code, `${argv.join(' ')}: ${r.out}`).toBe(0);
  };
  run('new', '--seed', '3', '--tier', '4', '--engine', 'v2', '--no-teach');
  run('do', 'go the third floor');
  run('do', 'ask Rafferty about the third floor');
  run('do', 'examine the third floor');
  return io.files.get('night.json') as string;
}

const SAVE = night();
const { view, state } = replaySave(SAVE);
const PAGES = state.log.map((page) => ({ page, text: renderPageBody(page, view).replace(/\s+/g, ' ') }));

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

const DECKS = new Map<string, { file: string; text: string }>();
for (const f of readdirSync(new URL('../content/decks/', import.meta.url)).filter((n) => n.endsWith('.json'))) {
  const cards = JSON.parse(readFileSync(new URL(`../content/decks/${f}`, import.meta.url), 'utf8')) as { id: string; text: string }[];
  for (const c of cards) DECKS.set(c.id, { file: `content/decks/${f}`, text: c.text });
}

describe('trace-line', () => {
  it('traces a deck card the page spent to its id and deck file', () => {
    let tried = 0;
    for (const { page, text } of PAGES) {
      for (const id of page.cardsUsed) {
        const card = DECKS.get(id);
        const quote = card ? fixedRun(card.text) : '';
        if (!card || quote.length < 30 || !text.includes(quote)) continue;
        tried++;
        const hits = traceLine(SAVE, typed(quote)).filter((h) => h.page === page.n + 1);
        expect(hits.length, `${id}: ${quote}`).toBeGreaterThan(0);
        const top = hits[0]?.sources[0];
        expect(top?.source.kind, `${id}: ${quote}\n${formatHits(hits)}`).toBe('deck');
        expect(top?.source.id).toBe(id);
        expect(top?.source.file).toBe(card.file);
        expect(top?.source.text).toBe(card.text);
        expect(top?.usedOnPage).toBe(true);
        if (tried >= 3) return;
      }
    }
    expect(tried, 'no deck card said whole enough to quote').toBeGreaterThan(0);
  });

  it('traces a sheet line to its sheet and the part of it', () => {
    // The dealer keeps a sheet's lines as `line:` keys among the page's cards.
    const lines = new Map<string, { sheet: string; file: string; where: string; text: string }>();
    for (const f of readdirSync(new URL('../content/sheets/', import.meta.url)).filter((n) => n.endsWith('.json'))) {
      const data = JSON.parse(readFileSync(new URL(`../content/sheets/${f}`, import.meta.url), 'utf8')) as {
        sheets: { id: string; parts: { text?: string; alt?: string[] }[]; close?: Record<string, string[] | undefined> }[];
      };
      for (const sheet of data.sheets) {
        const add = (where: string, text: string): void =>
          void lines.set(lineKey(text), { sheet: sheet.id, file: `content/sheets/${f}`, where, text });
        sheet.parts.forEach((p, i) => {
          if (p.text) add(`parts[${i}].text`, p.text);
          p.alt?.forEach((t, j) => add(`parts[${i}].alt[${j}]`, t));
        });
        for (const kind of ['callback', 'plain', 'quiet']) sheet.close?.[kind]?.forEach((t, j) => add(`close.${kind}[${j}]`, t));
      }
    }
    let tried = 0;
    for (const { page, text } of PAGES) {
      for (const key of page.cardsUsed.filter((id) => id.startsWith('line:'))) {
        const line = lines.get(key);
        const quote = line ? fixedRun(line.text) : '';
        if (!line || quote.length < 20 || !text.includes(quote)) continue;
        tried++;
        const hits = traceLine(SAVE, typed(quote)).filter((h) => h.page === page.n + 1);
        const top = hits[0]?.sources[0];
        expect(top?.source.kind, `${line.sheet}: ${quote}\n${formatHits(hits)}`).toBe('sheet');
        expect(top?.source.id).toBe(line.sheet);
        expect(top?.source.file).toBe(line.file);
        expect(top?.source.where.startsWith(line.where)).toBe(true);
        expect(top?.source.text).toBe(line.text);
        expect(top?.usedOnPage).toBe(true);
      }
    }
    expect(tried, 'no sheet line on these pages').toBeGreaterThan(0);
  });

  it('traces an engine line to its constant in src/game/voice-data.ts', () => {
    // A line of the engine's own, not a card's: one of voice-data's string lists, said whole on a page.
    const content = [...DECKS.values()].map((c) => c.text).join('\n');
    let tried = 0;
    for (const [name, value] of Object.entries(VOICE)) {
      if (!Array.isArray(value)) continue;
      (value as unknown[]).forEach((entry, i) => {
        if (tried >= 2 || typeof entry !== 'string' || /\{/.test(entry) || entry.length < 20 || content.includes(entry)) return;
        const where = PAGES.find((p) => p.text.includes(entry));
        if (!where) return;
        tried++;
        const hits = traceLine(SAVE, typed(entry)).filter((h) => h.page === where.page.n + 1);
        const top = hits[0]?.sources[0];
        expect(top?.source.kind, `${name}[${i}]: ${entry}\n${formatHits(hits)}`).toBe('engine');
        expect(top?.source.file).toBe('src/game/voice-data.ts');
        expect(top?.source.id).toBe(`const ${name}[${i}]`);
        expect(top?.source.line).toBeGreaterThan(0);
      });
    }
    expect(tried, 'no voice-data line said whole on these pages').toBeGreaterThan(0);
  });

  it('is forgiving of how a line is quoted, and honest when it is not there', () => {
    const { page, text } = PAGES[PAGES.length - 1] as (typeof PAGES)[number];
    // A mid-sentence fragment, re-wrapped and in straight quotes, still finds its page.
    const words = text.split(' ').slice(8, 16).join('\n  ');
    const hits = traceLine(SAVE, typed(words));
    expect(hits.some((h) => h.page === page.n + 1)).toBe(true);
    expect(traceLine(SAVE, 'a line nobody ever wrote down anywhere')).toEqual([]);
    expect(() => traceLine('{"not":"a save"}', 'anything')).toThrow();
  });

  it('is never reachable from npm run play', () => {
    for (const file of ['../src/cli/play-lib.ts', '../src/cli/play.ts']) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(src, file).not.toMatch(/(?:from|import|require)\s*\(?\s*['"][^'"]*trace-line/);
    }
  });
});
