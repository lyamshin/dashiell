/**
 * docs/51: the situated deck. The deck as shipped, the keys the planner reads off a page, what
 * realization deals, and what it never touches: the facts, the boards, the old decks when off.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { verifyGap } from '../src/game/board/model/verifier.js';
import { DROPS, KEY_FIELDS, SITUATED, SIT_PAGES, SIT_SLOTS, fillCard, fits, keyString, parseKey, project, situatedDeck, useDeck, type SitCard } from '../src/game/board/plan/situated.js';
import { lintBoardRun } from '../src/game/board/lint.js';
import { proseIssues } from '../src/game/board/prose-lint.js';
import { pronounAmbiguity } from '../src/game/board/plan/measure.js';
import { namesOverTwo } from '../src/game/board/names.js';
import type { Page } from '../src/game/board/types.js';

const worlds = [undefined, 'neighbourhood'] as const;
const nights: { tier: TierIndex; type: CaseType; world?: 'neighbourhood' }[] = [];
for (const world of worlds) for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier) as CaseType[]) nights.push({ tier, type, ...(world ? { world } : {}) });

function play(on: boolean, s: number, tier: TierIndex, type: CaseType, world?: 'neighbourhood'): BoardRun[] {
  const was = SITUATED.on;
  SITUATED.on = on;
  try {
    const d = dealBoard(s, tier, type, world ? { world } : {});
    return [playBoardOracle(d).run, playWanderer(d, s).run];
  } finally {
    SITUATED.on = was;
  }
}

afterEach(() => {
  SITUATED.on = true;
  useDeck(null);
});

const PLACES = new Set(['bar', 'club', 'restaurant', 'theatre', 'rooming', 'scene-murder', 'scene-lost', 'work', 'shift', 'unwatched', 'flat', 'rooms', 'home', 'office', 'street']);
const FILL = { they: 'he', them: 'him', their: 'his', role: 'the barman', place: 'the place', thing: 'the dog', means: 'medicine' };

describe('docs/51: the deck as shipped', () => {
  const deck = situatedDeck();
  it('has unique ids, keys that parse, and only the flags the dealer reads', () => {
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
    const flags = new Set(['quote-before', 'woman', 'man', 'leaving', 'rain', 'fog', 'cold', 'clear', 'murder', 'lost-pet', 'lost-item', 'dead-man', 'dead-woman']);
    for (const c of deck) {
      const k = parseKey(c.key);
      expect(keyString(k), c.id).toBe(c.key);
      expect((SIT_SLOTS as readonly string[]).includes(k.slot), c.id).toBe(true);
      expect((SIT_PAGES as readonly string[]).includes(k.page), c.id).toBe(true);
      expect(PLACES.has(k.place), `${c.id} ${k.place}`).toBe(true);
      for (const f of [...(c.requires ?? []), ...(c.forbids ?? [])]) expect(flags.has(f), `${c.id} ${f}`).toBe(true);
      expect(c.source, c.id).toMatch(/^(dealt|neighbourhood)\/\d+\/\d\/[a-z-]+\/[a-z]+#\d+\.\d+$/);
    }
  });

  it('every card passes the verifier with its tokens filled, uses only the tokens there are, and no bare pronoun', () => {
    for (const c of deck) {
      expect(c.text, c.id).not.toMatch(/\b(?:he|she|him|her|his|hers|himself|herself)\b/i);
      const text = fillCard(c.text, FILL) as string;
      expect(text, c.id).not.toBeNull();
      expect(text, c.id).not.toMatch(/[{}]/);
      const v = verifyGap(text.replace(/^(“?)([a-z])/, (_m, q: string, a: string) => q + a.toUpperCase()), { minWords: 8, maxWords: 40, maxSentences: 2 });
      expect(v.reasons, `${c.id}: ${c.text}`).toEqual([]);
    }
  });

  it('tells about one joke in ten at most', () => {
    expect(deck.filter((c) => c.joke).length).toBeLessThanOrEqual(Math.floor(deck.length / 10) + 1);
  });
});

describe('docs/51: the key and the fallback', () => {
  it('lets fields go in docs/51’s order, the place only as far as its family, and keeps what says what a gap is for', () => {
    const k = parseKey('staging|account|club|terse|high|none|new|none|first');
    expect(DROPS).toEqual(['position', 'after', 'tier', 'manner', 'place', 'before']);
    expect(project(k, 0)).toBe('staging|account|club|terse|high|none|new|none|first');
    expect(project(k, 1)).toBe('staging|account|club|terse|high|none|new|none|*');
    expect(project(k, 5)).toBe('staging|account|~drink|*|*|none|*|none|*');
    expect(project(parseKey('staging|account|bar|plain|low|none|new|none|first'), 5)).toBe(project(k, 5));
    expect(project(k, 6)).toBe('staging|account|~drink|*|*|*|*|none|*');
    // The office's when and who, and a gloss's before, are never let go.
    expect(project(parseKey('ask|office|office|none|low|new|narrows|none|middle'), 6)).toBe('ask|office|~office|*|*|*|narrows|none|*');
    expect(project(parseKey('gloss|account|bar|none|low|confirms|new|none|middle'), 6)).toBe('gloss|account|~drink|*|*|confirms|*|none|*');
    expect(KEY_FIELDS.length).toBe(9);
  });

  it('reads a card’s requires and forbids against where it would go', () => {
    const c: SitCard = { id: 'x', key: 'reaction|account|bar|plain|low|none|new|none|middle', text: 'x', requires: ['quote-before'], forbids: ['leaving'] };
    expect(fits(c, new Set(['quote-before']))).toBe(true);
    expect(fits(c, new Set([]))).toBe(false);
    expect(fits(c, new Set(['quote-before', 'leaving']))).toBe(false);
  });

  it('fills tokens, capitalised where they open a sentence, and passes over a card with a token there’s nothing for', () => {
    expect(fillCard('{They} looked at {their} hands. I let {them} look.', { they: 'she', them: 'her', their: 'her' })).toBe('She looked at her hands. I let her look.');
    expect(fillCard('I asked {role} for the night.', {})).toBeNull();
  });
});

describe('docs/51: every gap the deck may fill has its situation', () => {
  it.each(nights.filter((x) => x.tier % 2 === 1))('keys the same gaps the same way, on or off: tier $tier, $type, $world', ({ tier, type, world }) => {
    const on = play(true, 3, tier, type, world);
    const off = play(false, 3, tier, type, world);
    on.forEach((r, k) => {
      const o = off[k] as BoardRun;
      expect(r.log.length).toBe(o.log.length);
      r.log.forEach((p, i) => {
        const q = o.log[i] as Page;
        const keys = (x: Page) => (x.board?.units ?? []).filter((u) => u.kind === 'gap' && u.key).map((u) => (u.kind === 'gap' ? u.key : ''));
        expect(keys(p), `p${i + 1}`).toEqual(keys(q));
        for (const u of p.board?.units ?? []) {
          if (u.kind !== 'gap' || !u.key) continue;
          const kk = parseKey(u.key);
          expect((SIT_SLOTS as readonly string[]).includes(kk.slot)).toBe(true);
          expect(kk.slot).toBe(u.slot);
          expect(PLACES.has(kk.place)).toBe(true);
          if (kk.slot === 'walk') expect(kk.place).toBe('street');
          expect(['first', 'middle', 'last']).toContain(kk.position);
          expect(kk.put === 'none').toBe(kk.page !== 'put');
        }
      });
    });
  });
});

describe('docs/51: the same facts, situated on or off', () => {
  it.each(nights.filter((x) => x.tier % 2 === 0))('every page tells the same lines, in the same fact units, and only gaps change: tier $tier, $type, $world', ({ tier, type, world }) => {
    const on = play(true, 2, tier, type, world);
    const off = play(false, 2, tier, type, world);
    on.forEach((r, k) => {
      const o = off[k] as BoardRun;
      expect(r.log.length).toBe(o.log.length);
      r.log.forEach((p, i) => {
        const q = o.log[i] as Page;
        const facts = (x: Page) => (x.board?.units ?? []).filter((u) => u.kind === 'fact').map((u) => (u.kind === 'fact' ? [u.carries, u.relation] : []));
        expect(facts(p), `p${i + 1}`).toEqual(facts(q));
        for (const f of ['job', 'q', 'told', 'hours', 'people', 'places', 'turn', 'callback'] as const) expect(p.board?.[f], `p${i + 1} ${f}`).toEqual(q.board?.[f]);
        expect(p.board?.thought?.refs, `p${i + 1}`).toEqual(q.board?.thought?.refs);
        // A gap's card is the deck's, filled: no token, no mark, said once a night.
        for (const u of p.board?.units ?? []) if (u.kind === 'gap') expect(u.text).not.toMatch(/[{}⁣⁤]/);
      });
      const cards = r.log.flatMap((p) => (p.board?.units ?? []).flatMap((u) => (u.kind === 'gap' && u.card ? [u.card] : [])));
      expect(new Set(cards).size, 'a situated card twice in a night').toBe(cards.length);
    });
  });

  it('off, a toy deck or an empty one changes nothing; on, an empty one changes nothing', () => {
    const base = play(false, 1, 4, 'lost-pet');
    useDeck([{ id: 'toy', key: 'reaction|account|theatre|plain|high|none|new|none|middle', text: 'Somebody somewhere was always taking a question badly, and tonight it was not this one.' }]);
    const offToy = play(false, 1, 4, 'lost-pet');
    useDeck([]);
    const onEmpty = play(true, 1, 4, 'lost-pet');
    const prose = (rs: BoardRun[]) => rs.map((r) => r.log.map((p) => p.blocks.map((b) => b.text).join('\n')));
    expect(prose(offToy)).toEqual(prose(base));
    expect(prose(onEmpty)).toEqual(prose(base));
  });
});

describe('docs/51: the lints hold with the deck on', () => {
  it.each(nights.filter((x) => x.tier === 1 || x.tier === 4))('reader lint, prose lints, names a page and pronouns: tier $tier, $type, $world', ({ tier, type, world }) => {
    for (const s of [1, 4]) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
      for (const [route, r] of [['oracle', playBoardOracle(d).run], ['wanderer', playWanderer(d, s).run]] as const) {
        expect(lintBoardRun(d, r).map((x) => `${x.rule} p${x.page + 1} ${x.detail}`)).toEqual([]);
        expect(proseIssues(d, r).map((x) => `${x.rule} p${x.page + 1} ${x.detail}`)).toEqual([]);
        for (const p of r.log) {
          expect(pronounAmbiguity(d.kase, p.blocks), `seed ${s} p${p.n + 1}`).toEqual([]);
          const exempt = (b: Page['blocks'][number]) => b.kind === 'prose' && ((b.voice === 'answer' && (p.board?.job === 'account' || p.board?.job === 'list')) || (b.voice === 'recap' && b.text === p.board?.recap));
          // (Names a page are measured along the oracle's route, as board-prose measures them.)
          if (route === 'oracle') expect(namesOverTwo(d.kase, p.blocks, exempt), `seed ${s} p${p.n + 1}`).toEqual([]);
        }
      }
    }
  });
});
