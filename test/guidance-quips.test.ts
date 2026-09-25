/**
 * Guidance §4 (docs/39) — fewer quips, cleaner testimony.
 *
 * Three blind playtesters called three or four quips a page "padding between
 * facts", and quoted a telling that read like "machine output wearing a
 * fedora": "Not here from six until half past seven or from half past eight
 * until half past ten. Not at the El at eight o'clock." And a thought said
 * one name three times: "That was who Abramowitz said Abramowitz was."
 *
 * - About one joke a page: a card flagged `joke`, a sheet's joke line, a
 *   closing line, an activity's tail and a recap's aside all count, and once
 *   a page has told one it deals plain (`Dealer.jokes`). A callback that pays
 *   off the card that told the joke is the same joke.
 * - Where somebody was not is said the way the golden says it
 *   (docs/golden/seed3-testimony.md): the rest of the evening as the rest of
 *   the evening, never a list of half hours.
 * - A thought names one person twice at most, and says "he" after that.
 */
import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { buildView } from '../src/game/derive.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import type { Page, RunState } from '../src/game/types.js';
import { ALL_CARDS, DECKS, Dealer, JOKE_OPTIONAL, withDecks, type Card } from '../src/game/voice/cards.js';
import { newRun as newSheetRun, runSheet, type Holes, type JokeBudget, type Sheet } from '../src/game/scene/sheets.js';
import { Rng } from '../src/gen/rng.js';
import { NOT_HERE } from '../src/game/voice-data.js';
import { jokesOnPage } from './quips-helpers.js';

type Tier = 0 | 1 | 2 | 3 | 4 | 5;

interface Night {
  label: string;
  state: RunState;
  surnames: string[];
  /** The places by name: "Mrs. Bledsoe’s" is a room, not Bledsoe again. */
  places: string[];
}

/** v2 at Raw, Poached, Medium and Hard-boiled, and v1 at Raw and Medium: oracle and wandering nights. */
const NIGHTS: Night[] = (() => {
  const out: Night[] = [];
  const configs: { engine: 'v1' | 'v2'; tiers: Tier[]; seeds: number }[] = [
    { engine: 'v2', tiers: [0, 2, 4, 5], seeds: 5 },
    { engine: 'v1', tiers: [0, 4], seeds: 3 },
  ];
  for (const { engine, tiers, seeds } of configs) {
    for (const tier of tiers) {
      for (let seed = 1; seed <= seeds; seed++) {
        const view = buildView(generateCase(seed, { tier, ...(engine === 'v2' ? { engine: 'v2' as const } : {}) }));
        const surnames = view.kase.people.map((p) => p.surname);
        const places = view.places.flatMap((p) => [p.shortName, p.name]).sort((a, b) => b.length - a.length);
        out.push({ label: `${engine} T${tier} seed ${seed} oracle`, state: playOracle(view).state, surnames, places });
        out.push({ label: `${engine} T${tier} seed ${seed} wandering`, state: playWandering(view, seed).state, surnames, places });
      }
    }
  }
  return out;
})();

const pages = (): { night: Night; page: Page }[] => NIGHTS.flatMap((night) => night.state.log.map((page) => ({ night, page })));

describe('Guidance §4: about one joke a page', () => {
  it('tells at most one joke on any page, and one on most of them', () => {
    let one = 0;
    let total = 0;
    const over: string[] = [];
    for (const { night, page } of pages()) {
      const j = jokesOnPage(page);
      total++;
      if (j.count === 1) one++;
      if (j.count > 1) over.push(`${night.label} p${page.n + 1}: ${j.told.join(' | ')}`);
    }
    expect(total).toBeGreaterThan(400);
    expect(over).toEqual([]);
    // Fewer, not none: the voice keeps its one.
    expect(one / total).toBeGreaterThan(0.6);
  });

  it('flags every closing card a joke, and leaves the plain lines plain', () => {
    expect(DECKS.close.every((c) => c.joke === true)).toBe(true);
    const flagged = ALL_CARDS.filter((c) => c.joke);
    expect(flagged.length).toBeGreaterThan(800);
    // A line that only carries the case is never a joke.
    const plain = ['cry-n08', 'err-b003', 'fol-006', 'tht-h059', 'grd-006', 'tai-018'];
    for (const id of plain) expect(ALL_CARDS.find((c) => c.id === id)?.joke, id).toBeUndefined();
    for (const id of ['tai-001', 'LOK-101', 'APR-032', 'err-075', 'act-001']) expect(ALL_CARDS.find((c) => c.id === id)?.joke, id).toBe(true);
  });

  const card = (id: string, joke: boolean): Card => ({ id, deck: 'tail', text: `${id} line.`, tags: { family: 'any' }, status: 'kept', ...(joke ? { joke: true } : {}) });

  it('deals plain once the page has told its joke; a flourish goes without, and a hole the page needs takes a joke rather than break', () => {
    withDecks({ tail: [card('j1', true), card('j2', true), card('p1', false)], errand: [{ ...card('e1', true), deck: 'errand' }] }, () => {
      const dealer = new Dealer(7, [], []);
      expect(dealer.mayJoke).toBe(true);
      const first = dealer.draw('tail', [(c) => c.joke === true]);
      expect(first?.cardId).toMatch(/^j/);
      expect(dealer.jokes).toBe(1);
      // Asked for a joke again, the dealer gives the plain card.
      expect(dealer.draw('tail', [() => true])?.cardId).toBe('p1');
      // Only jokes fit: a tail goes without.
      expect(JOKE_OPTIONAL.has('tail')).toBe(true);
      expect(dealer.draw('tail', [(c) => c.joke === true], {}, true)).toBeNull();
      // An errand the page needs is dealt all the same, and counted.
      expect(dealer.draw('errand', [() => true], {}, true)?.cardId).toBe('e1');
      expect(dealer.forcedJokes).toBe(1);
    });
  });

  const budget = (dealer: Dealer): JokeBudget => ({
    told: () => dealer.jokes,
    tell: () => dealer.joke(),
    reset: (n) => dealer.resetJokes(n),
    held: () => dealer.jokeHeld,
    hold: (on) => dealer.holdJoke(on),
  });
  const SHEET: Sheet = {
    id: 'test-sheet',
    moment: 'company',
    name: 'test',
    parts: [
      { text: 'A plain line.' },
      { hole: 'prop', bind: 'prop' },
      { text: 'The joke line.', joke: true },
    ],
    close: { roles: ['prop'], callback: ['The {prop} paid off.'], plain: ['The plain last word.'] },
  };
  const holesFor = (dealer: Dealer, propJoke: boolean): Holes => ({
    random: new Rng(1),
    slots: {},
    jokes: budget(dealer),
    engine: (part) => {
      if (part.hole !== 'prop') return null;
      if (propJoke && dealer.mayJoke) dealer.joke();
      return { text: 'A prop.', exports: { prop: { text: 'a prop', short: 'prop' } } };
    },
    deck: () => null,
    close: () => null,
  });
  const said = (out: ReturnType<typeof runSheet>): string =>
    [...(out?.pre ?? []), ...(out?.post ?? [])].map((p) => p.text).join(' ') + (out?.close ? ` ${out.close.text}` : '');

  it('says a sheet’s joke line and its last word only while the page has told none', () => {
    const fresh = new Dealer(1, [], []);
    const a = runSheet(SHEET, holesFor(fresh, false), newSheetRun('company', {}, false));
    expect(said(a)).toContain('The joke line.');
    expect(a?.close).toBeNull();
    expect(fresh.jokes).toBe(1);

    const joked = new Dealer(1, [], []);
    joked.joke();
    const b = runSheet(SHEET, holesFor(joked, false), newSheetRun('company', {}, false));
    expect(said(b)).not.toContain('The joke line.');
    expect(b?.close).toBeNull();
    expect(joked.jokes).toBe(1);
  });

  it('keeps the page’s joke for the payoff on a page that pays something off, and pays off the card that told it', () => {
    // The page keeps its joke: the joke line waits, and the last word is the joke.
    const kept = new Dealer(1, [], []);
    kept.holdJoke(true);
    const a = runSheet(SHEET, holesFor(kept, false), newSheetRun('company', {}, true));
    expect(said(a)).not.toContain('The joke line.');
    expect(a?.close?.text).toBe('The prop paid off.');
    expect(kept.jokes).toBe(1);
    // A setup that is itself the joke is paid off as the same joke.
    const setup = new Dealer(1, [], []);
    setup.holdJoke(true);
    const b = runSheet(SHEET, holesFor(setup, true), newSheetRun('company', {}, true));
    expect(b?.close?.text).toBe('The prop paid off.');
    expect(setup.jokes).toBe(1);
  });
});

/** A span of the evening as a telling says it: "at eight o'clock", "from eight until half past". */
const SPAN = /\b(?:at|from) (?:half past )?(?:six|seven|eight|nine|ten|eleven)\b/g;

describe('Guidance §4: no raw time lists in testimony', () => {
  it('says where somebody was not in one span a sentence at most, and never lists the rest of the evening', () => {
    let negatives = 0;
    const lists: string[] = [];
    for (const { night, page } of pages()) {
      for (const b of page.beats ?? []) {
        if (!b.rendered || b.kind !== 'telling' || !b.parts) continue;
        for (const sentence of b.parts.told) {
          if (!/\bNot\b|\bwasn[’']t\b|\bnever\b/.test(sentence)) continue;
          negatives++;
          const spans = (sentence.match(SPAN) ?? []).length;
          if (spans > 1 || / or (?:at|from) /.test(sentence)) lists.push(`${night.label} p${page.n + 1}: ${sentence}`);
        }
      }
    }
    expect(negatives).toBeGreaterThan(50);
    expect(lists).toEqual([]);
  });

  it('seed 21 at Medium: the counterman tells where Ruggiero was not as the rest of the evening, and the El on its own', () => {
    const view = buildView(generateCase(21, { difficulty: 2, tier: 4, engine: 'v2' }));
    const state = playOracle(view).state;
    const told = state.log.flatMap((p) => (p.beats ?? []).flatMap((b) => (b.kind === 'telling' && b.rendered ? (b.parts?.told ?? []) : [])));
    // Before: "Not here from six until half past or from half past eight until
    // half past eleven. Not at the El at eight o'clock."
    expect(told).toContain(NOT_HERE.rest);
    expect(told).toContain('At eight o’clock I was at the El, and he wasn’t there either.');
    expect(told.filter((s) => /^Not here (?:at|from) .* or /.test(s))).toEqual([]);
  });
});

describe('Guidance §4: a thought names somebody twice at most', () => {
  it('never says one surname three times in one thought, across the sweep', () => {
    let thoughts = 0;
    const repeats: string[] = [];
    for (const { night, page } of pages()) {
      for (const b of page.beats ?? []) {
        if (!b.rendered || b.kind !== 'thought' || !b.text) continue;
        thoughts++;
        let bare = b.text;
        for (const pl of night.places) bare = bare.split(pl).join('');
        for (const s of night.surnames) {
          const n = (bare.match(new RegExp(`\\b${s}\\b`, 'g')) ?? []).length;
          if (n >= 3) repeats.push(`${night.label} p${page.n + 1}: ${b.text}`);
        }
      }
    }
    expect(thoughts).toBeGreaterThan(500);
    expect(repeats).toEqual([]);
  });

  it('writes no thought card that names one slot three times', () => {
    for (const c of DECKS.thought) {
      for (const slot of ['subject', 'source', 'victim', 'name']) {
        const n = (c.text.match(new RegExp(`\\{${slot}\\}`, 'g')) ?? []).length + (slot === 'subject' && c.text.includes('{motive}') ? 1 : 0);
        expect(n, `${c.id}: ${c.text}`).toBeLessThan(3);
      }
    }
    expect(DECKS.thought.find((c) => c.id === 'tht-h037')?.text).toBe('That was who {subject} said {he} was. It was not where {he} had been, and that was the question.');
  });
});
