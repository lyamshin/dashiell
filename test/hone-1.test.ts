/**
 * Hone 1 — questions written with their answers, the breath form, the spoken
 * clock, the portrait pairs, and the two content bugs.
 *
 * `docs/12-hone-1.md` §A.4 states four of these outright: prompts on two or
 * three sentences a case, each answerable only by its own sentence, breaths
 * that join back to the facts they came from, no clock face anywhere a reader
 * reads, and correspondence at zero. The rest are §B's contracts: three of
 * Dashiell's lines on page one, two follow-ups a page and never a bare one,
 * and a portrait that is a detail followed rather than three listed.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../src/gen/index.js';
import { checkCase, formatViolations } from '../src/gen/correspond.js';
import { BREATH_MAX, breathCarries, breathe, wordsIn } from '../src/gen/breath.js';
import { DISCOVERY_PROMPTS } from '../src/gen/victim.js';
import { PROFESSION_PROMPTS, PURPOSE_PROMPTS } from '../src/gen/data/cast.js';
import { POINTER_PROMPTS } from '../src/gen/client.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun } from '../src/game/reducer.js';
import {
  ASK_FOLLOW,
  ASK_FOLLOW_NAMED,
  BRIEFING_ASK_CAP,
  FOLLOW_CAP,
  OFFICE_OPENERS,
  collapseArticles,
  describePerson,
  presenceClause,
  rollCast,
  shortShare,
  speechParagraphs,
  withDecks,
  type Card,
} from '../src/game/voice/index.js';
import type { Page } from '../src/game/types.js';

const viewOf = (seed: number, difficulty: Difficulty = 2): CaseView =>
  buildView(generateCase(seed, { difficulty }));

const textOf = (page: Page): string =>
  page.blocks
    .map((b) =>
      b.kind === 'prose' || b.kind === 'note' ? b.text : b.kind === 'presence' ? (b.text ?? '') : '',
    )
    .join('\n');

/** Every block on a page that is prose a reader reads, not a table of hours. */
const readableBlocks = (page: Page): string[] =>
  page.blocks.flatMap((b) =>
    b.kind === 'prose' || b.kind === 'note'
      ? [b.text]
      : b.kind === 'presence' && b.text
        ? [b.text]
        : [],
  );

/** A block that is one quoted line and nothing else. */
const quotedLines = (page: Page): string[] =>
  readableBlocks(page).filter((t) => /^[“"].*[”"]$/.test(t.trim()));

const CLOCK_FACE = /\b\d{1,2}:\d{2}\s(?:AM|PM)\b/;

/* ------------------------------------------------------------------ *
 * §A.1 — the question is written with the answer.
 * ------------------------------------------------------------------ */

describe('the prompts', () => {
  it('gives every template three variants to draw from', () => {
    for (const [shape, pool] of Object.entries(DISCOVERY_PROMPTS)) {
      expect(pool.length, shape).toBeGreaterThanOrEqual(3);
      expect(new Set(pool).size, shape).toBe(pool.length);
    }
    for (const [purpose, pool] of Object.entries(PURPOSE_PROMPTS)) {
      expect(pool.length, purpose).toBeGreaterThanOrEqual(3);
      expect(new Set(pool).size, purpose).toBe(pool.length);
    }
    expect(POINTER_PROMPTS.length).toBeGreaterThanOrEqual(3);
  });

  // Hone 2 §Track B added a fourth: what the client does for a living, which
  // she says first and unprompted, so the engine spends that question rather
  // than printing it. The generator writes it all the same, because a page
  // that opens on a question instead of on her is still a page this data can
  // make. Dashiell's own cap is `BRIEFING_ASK_CAP` and has not moved.
  it('puts a prompt on two to four sentences of every briefing', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const difficulty of [1, 2, 3] as Difficulty[]) {
        const kase = generateCase(seed, { difficulty });
        const prompted = kase.briefing.filter((line) => line.prompt !== undefined);
        expect(prompted.length, `seed ${seed} d${difficulty}`).toBeGreaterThanOrEqual(2);
        expect(prompted.length, `seed ${seed} d${difficulty}`).toBeLessThanOrEqual(4);
        // Never on a line Dashiell says himself: he does not ask himself things.
        for (const line of prompted) expect(line.speaker).toBe('client');
      }
    }
  });

  /**
   * "Answerable only by its sentence" is asserted by the template pairing, as
   * §A.4 asks: the prompt on the discovery line is one of the discovery
   * shapes and is the one the case wrote beside `foundTextFirst`, and the same
   * for the purpose and the pointer. A prompt that could sit in front of
   * another of the case's own sentences would be a prompt the generator wrote
   * twice, so no two lines of one briefing may carry the same one.
   */
  it('pairs each prompt with the one sentence its template was written for', () => {
    const fills = (template: string): RegExp =>
      new RegExp(`^${template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+')}$`);
    for (let seed = 1; seed <= 40; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const bio = kase.victimBio;
      const brief = kase.clientBrief;
      const seen = new Set<string>();
      for (const line of kase.briefing) {
        if (line.prompt === undefined) continue;
        expect(seen.has(line.prompt), `seed ${seed}: two sentences, one question`).toBe(false);
        seen.add(line.prompt);

        // Hone 2 §Track B: the profession question, written beside the detail
        // it asks for and drawn on the same index as that detail.
        const client = kase.people.find((p) => p.id === kase.clientId);
        const profession = client?.dossier?.profession;
        if (profession?.prompt !== undefined && line.prompt === profession.prompt) {
          expect(line.spoken, `seed ${seed}`).toBe(profession.detailFirst);
          expect(PROFESSION_PROMPTS, line.prompt).toContain(line.prompt);
          continue;
        }

        const discovery = bio.discovery?.foundPrompt ?? bio.lastSeen?.prompt;
        if (line.prompt === discovery) {
          const answer = bio.discovery?.foundTextFirst ?? bio.lastSeen?.textFirst;
          expect(line.spoken, `seed ${seed}`).toBe(answer);
          const pools = Object.values(DISCOVERY_PROMPTS).flat();
          expect(pools.some((t) => fills(t).test(line.prompt as string)), line.prompt).toBe(true);
          continue;
        }
        if (line.prompt === brief.purposePrompt) {
          expect(line.spoken, `seed ${seed}`).toBe(brief.purposeTextFirst);
          const pools = Object.values(PURPOSE_PROMPTS).flat();
          expect(pools.some((t) => fills(t).test(line.prompt as string)), line.prompt).toBe(true);
          continue;
        }
        expect(line.prompt, `seed ${seed}`).toBe(brief.pointerPrompt);
        expect(
          POINTER_PROMPTS.some((t) => fills(t).test(line.prompt as string)),
          line.prompt,
        ).toBe(true);
        expect(line.spoken, `seed ${seed}`).toMatch(/^Start with /);
      }
    }
  });

  it('does not ask forty seeds the same question', () => {
    const asked = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const line of generateCase(seed, { difficulty: 2 }).briefing) {
        if (line.prompt !== undefined) asked.add(line.prompt);
      }
    }
    expect(asked.size).toBeGreaterThan(8);
  });
});

/* ------------------------------------------------------------------ *
 * §A.2 — the breath-split form.
 * ------------------------------------------------------------------ */

describe('the breath form', () => {
  it('splits into one to three pieces and keeps every fact', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      for (const line of kase.briefing) {
        if (line.spoken === null) continue;
        const breath = line.breath ?? [];
        expect(breath.length, `seed ${seed}: ${line.spoken}`).toBeGreaterThan(0);
        expect(breath.length, `seed ${seed}: ${line.spoken}`).toBeLessThanOrEqual(BREATH_MAX);
        expect(
          breathCarries(line.spoken, breath),
          `seed ${seed}: "${line.spoken}" lost something in "${breath.join(' ')}"`,
        ).toBe(true);
        for (const piece of breath) expect(piece).toMatch(/^[“"A-Z].*[.!?][”"]?$/);
      }
    }
  });

  it('finds a short sentence in a sentence that has one in it', () => {
    expect(breathe('I found Sweeney at the suite at half past eleven.')).toEqual([
      'I found Sweeney.',
      'Half past eleven, at the suite.',
    ]);
    const window = breathe(
      'The coroner puts it between half past nine and eleven, which is two hours of nothing useful.',
    );
    expect(window).toEqual([
      'The coroner puts it between half past nine and eleven.',
      'Two hours of nothing useful.',
    ]);
    expect(Math.min(...window.map(wordsIn))).toBeLessThanOrEqual(6);
  });

  it('leaves a sentence with no joint in it alone', () => {
    expect(breathe('It was a blunt object.')).toEqual(['It was a blunt object.']);
  });

  it('never splits where the second half cannot stand up', () => {
    // "held the paper still" is a verb phrase, not a sentence, and the word it
    // starts with only looks like "he".
    expect(
      breathe('Lathrop had stood bail for most of the block at one time or another, and held the paper still.'),
    ).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ *
 * §A.3 — the spoken clock.
 * ------------------------------------------------------------------ */

describe('the spoken clock', () => {
  it('prints no clock face on any page a reader reads', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const difficulty of [1, 3] as Difficulty[]) {
        const view = viewOf(seed, difficulty);
        const state = playOracle(view, 'Dashiell').state;
        for (const page of state.log) {
          for (const text of readableBlocks(page)) {
            expect(CLOCK_FACE.test(text), `seed ${seed} page ${page.n}: ${text}`).toBe(false);
          }
        }
      }
    }
  });

  it('keeps the clock face on the clue the notebook and the sheet print', () => {
    let faces = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      for (const clue of kase.candidates) {
        expect(clue.textRecord, clue.id).toBeDefined();
        expect(CLOCK_FACE.test(clue.text), `${clue.id}: ${clue.text}`).toBe(false);
        if (CLOCK_FACE.test(clue.textRecord as string)) faces++;
      }
    }
    // And the record is not merely a copy: plenty of clues name an hour.
    expect(faces).toBeGreaterThan(100);
  });

  it('says the hours out loud in the briefing and keeps them in the record', () => {
    const kase = generateCase(3, { difficulty: 2 });
    const coroner = kase.briefing.find((l) => l.text.includes('coroner'));
    expect(coroner?.text).toContain('9:30 PM');
    expect(coroner?.spoken).toContain('half past nine');
    expect(coroner?.spoken).not.toMatch(CLOCK_FACE);
  });
});

/* ------------------------------------------------------------------ *
 * §A.4 — correspondence, everywhere, at zero.
 * ------------------------------------------------------------------ */

describe('correspondence', () => {
  it('finds nothing the generator wrote, over two hundred seeds at every difficulty', () => {
    const all: string[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      for (const difficulty of [1, 2, 3] as Difficulty[]) {
        const violations = checkCase(generateCase(seed, { difficulty }));
        if (violations.length > 0) all.push(`seed ${seed} d${difficulty}\n${formatViolations(violations, 3)}`);
      }
    }
    expect(all.slice(0, 5)).toEqual([]);
  }, 600_000);

  it('finds nothing the engine renders, oracle and wandering', () => {
    const all: string[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      const view = viewOf(seed);
      all.push(...checkRun(view, playOracle(view, 'Dashiell').state).map((v) => `${seed} ${v.where} ${v.detail}`));
      const wander = viewOf(seed, 3);
      all.push(...checkRun(wander, playWandering(wander, seed).state).map((v) => `w${seed} ${v.where} ${v.detail}`));
    }
    expect(all.slice(0, 5)).toEqual([]);
  }, 120_000);
});

/* ------------------------------------------------------------------ *
 * §B.1 and §B.2 — the questions on the page.
 * ------------------------------------------------------------------ */

describe('page one', () => {
  it('gives Dashiell three lines at most, and they are the prompts', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const state = newRun(view, { detectiveName: 'Dashiell' });
      const page = state.log[0] as Page;
      const prompts = new Set(
        view.kase.briefing
          .map((l) => l.prompt)
          .filter((p): p is string => p !== undefined)
          .map((p) => `“${p}”`),
      );
      const openers = new Set(OFFICE_OPENERS.map((o) => `“${o}”`));
      const his = quotedLines(page).filter((t) => prompts.has(t.trim()) || openers.has(t.trim()));
      const others = quotedLines(page).filter((t) => !prompts.has(t.trim()) && !openers.has(t.trim()));
      expect(his.length, `seed ${seed}`).toBeLessThanOrEqual(BRIEFING_ASK_CAP);
      expect(his.length, `seed ${seed}`).toBeGreaterThan(0);
      // Everything else in quotation marks on page one is the client's, and
      // the client's lines are never one-line questions of Dashiell's.
      for (const line of others) {
        expect(ASK_FOLLOW, `seed ${seed}: ${line}`).not.toContain(line.replace(/^[“]|[”]$/g, ''));
      }
    }
  });

  it('never prods: no bare follow-up on any page', () => {
    // "I am listening." is a prod at a paragraph break and an opening line at
    // a desk at midnight; §B.1 keeps the second and this is about the first.
    const openers = new Set(OFFICE_OPENERS);
    const bare = new Set(ASK_FOLLOW.filter((t) => !t.includes('{') && !openers.has(t)));
    for (let seed = 1; seed <= 25; seed++) {
      const view = viewOf(seed);
      for (const page of playOracle(view, 'Dashiell').state.log) {
        for (const line of quotedLines(page)) {
          expect(bare.has(line.trim().replace(/^[“"]|[”"]$/g, '')), `seed ${seed}: ${line}`).toBe(false);
        }
      }
    }
  });

  it('asks at most two follow-ups a page in an interview', () => {
    const shapes = ASK_FOLLOW_NAMED.map((t) =>
      new RegExp(`^[“"]${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+')}[”"]$`),
    );
    for (let seed = 1; seed <= 25; seed++) {
      const view = viewOf(seed);
      for (const page of playOracle(view, 'Dashiell').state.log) {
        const follows = quotedLines(page).filter((t) => shapes.some((re) => re.test(t.trim())));
        expect(follows.length, `seed ${seed} page ${page.n}: ${follows.join(' / ')}`).toBeLessThanOrEqual(
          FOLLOW_CAP,
        );
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §B.3 — breath and rhythm.
 * ------------------------------------------------------------------ */

describe('the client breathes', () => {
  it('measures the share of short sentences on a page under construction', () => {
    const laid = [
      { block: { kind: 'note' as const, text: 'Midnight. A long sentence that goes on for rather more than six words.' } },
      { block: { kind: 'note' as const, text: 'She sat.' } },
    ];
    expect(shortShare(laid as never)).toBeCloseTo(2 / 3, 5);
    expect(shortShare([])).toBe(0);
  });

  it('puts the breath form in the client\u2019s mouth when it is asked for', () => {
    const line = {
      topic: 'discovery' as const,
      text: 'I found Sweeney at the suite at half past eleven.',
      breath: ['I found Sweeney.', 'Half past eleven, at the suite.'],
    };
    expect(speechParagraphs([line], 3, false)).toEqual([
      '“I found Sweeney at the suite at half past eleven.”',
    ]);
    expect(speechParagraphs([line], 3, true)).toEqual([
      '“I found Sweeney. Half past eleven, at the suite.”',
    ]);
  });

  it('uses it on the pages that need it', () => {
    let breathed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const text = textOf(page);
      for (const line of view.kase.briefing) {
        const breath = line.breath ?? [];
        if (breath.length > 1 && text.includes(breath.join(' '))) breathed++;
      }
    }
    expect(breathed).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ *
 * §B.4 — portrait pairs.
 * ------------------------------------------------------------------ */

const PAIR: Card = {
  id: 'pp-001',
  deck: 'portrait-pairs',
  text: '{He} kept {his} left hand in the pocket until {he} sat down. When {he} took it out I saw why: the little finger had been broken once and never set.',
  recall: 'the broken finger',
  tags: { gender: 'any', class: 'any', ageBand: 'any', setting: 'office' },
  motifs: [],
  status: 'generated',
};

describe('portrait pairs', () => {
  it('is a detail followed, in the person\u2019s own pronouns, on the first meeting', () => {
    withDecks({ 'portrait-pairs': [PAIR] }, () => {
      const kase = generateCase(3, { difficulty: 2 });
      const cast = rollCast(kase);
      const client = kase.people.find((p) => p.isClient === true) as NonNullable<
        (typeof kase.people)[number]
      >;
      const pair = cast.portraits[client.id]?.pair;
      expect(pair?.recall).toBe('the broken finger');
      expect(pair?.text).not.toMatch(/\{/);
      const first = describePerson({
        cast,
        personId: client.id,
        surname: client.surname,
        times: 0,
        pronoun: 'she',
        nth: 0,
      });
      expect(first).toBe(pair?.text);
      expect(first.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      // And not the old list of three.
      expect(first).not.toContain(cast.portraits[client.id]?.clothing);
    });
  });

  it('calls them by the recall phrase every meeting after', () => {
    withDecks({ 'portrait-pairs': [PAIR] }, () => {
      const kase = generateCase(3, { difficulty: 2 });
      const cast = rollCast(kase);
      const client = kase.people.find((p) => p.isClient === true) as NonNullable<
        (typeof kase.people)[number]
      >;
      for (const times of [1, 2, 3]) {
        expect(
          describePerson({
            cast,
            personId: client.id,
            surname: client.surname,
            times,
            pronoun: 'she',
            nth: times,
          }),
        ).toBe(`${client.surname}, the woman with the broken finger.`);
      }
    });
  });

  it('uses a pair when one fits, and falls back to the three components, and says so, when none does', () => {
    // Track C's deck is on disk now, so both branches are exercised for real:
    // a client with a pair opens on it and logs no gap; a client without one
    // gets the three-component portrait and the page says so.
    let withPair = 0;
    let withoutPair = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const cast = rollCast(kase);
      const client = kase.people.find((p) => p.isClient === true) as NonNullable<
        (typeof kase.people)[number]
      >;
      const view = buildView(kase);
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const gaps = page.gaps.join(' ');
      const pair = cast.portraits[client.id]?.pair;
      if (pair) {
        withPair++;
        expect(gaps, `seed ${seed}`).not.toContain(`missing-pair: no portrait-pairs card fits ${client.surname}`);
      } else {
        withoutPair++;
        expect(gaps, `seed ${seed}`).toContain('missing-pair');
      }
    }
    // The deck has 16/16 tag cells covered, so the pair branch must be the common one.
    expect(withPair).toBeGreaterThan(withoutPair);
  });
});

/* ------------------------------------------------------------------ *
 * §B.6 — the two content bugs.
 * ------------------------------------------------------------------ */

describe('the two content bugs', () => {
  it('does not put an article in front of an article', () => {
    expect(collapseArticles('Behind the loose baseboard: the a bronze bookend, pushed in edgewise.')).toBe(
      'Behind the loose baseboard: the bronze bookend, pushed in edgewise.',
    );
    expect(collapseArticles('Where does the an ice pick belong?')).toBe(
      'Where does the ice pick belong?',
    );
    // A frame with its own indefinite article keeps it, and it agrees.
    expect(collapseArticles('a an ice pick')).toBe('an ice pick');
    expect(collapseArticles('a a bronze bookend')).toBe('a bronze bookend');
    // And nothing else is touched.
    expect(collapseArticles('an hour with a bottle of chloral drops')).toBe(
      'an hour with a bottle of chloral drops',
    );
  });

  it('does not say where somebody is standing twice', () => {
    expect(presenceClause('Bidwell', 'the hackman on the stand', 'on the stand')).toBe(
      'Bidwell, the hackman on the stand',
    );
    expect(presenceClause('Kreuzer', 'a pawnbroker’s clerk', 'near the door')).toBe(
      'Kreuzer, a pawnbroker’s clerk, near the door',
    );
  });

  it('prints neither on any page', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const view = viewOf(seed);
      for (const page of playOracle(view, 'Dashiell').state.log) {
        const text = textOf(page);
        expect(text, `seed ${seed}`).not.toMatch(/\b(?:the|a|an)\s+(?:the|an?)\s/i);
        expect(text, `seed ${seed}`).not.toMatch(/(, (?:on|in|at|behind|by|across|near) [^,.]+), \1/);
      }
    }
  });
});
