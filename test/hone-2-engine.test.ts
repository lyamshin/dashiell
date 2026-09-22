/**
 * Hone 2, Track A — the beat budget, the pair's claim on a body, the pronouns,
 * and the order of an arrival.
 *
 * `docs/13-hone-2.md` §A.5 states five contracts and they are the five
 * `describe` blocks below: beats per page inside the budget over forty seeds
 * and three pages, no body-part or object conflict between a portrait pair and
 * a beat on the same page, no surname standing as the subject of two
 * consecutive sentences anywhere on a page, the entrance in the order stairs →
 * door → sit → speak on every page one, and correspondence at zero.
 *
 * Each rule is also unit-tested against the function that decides it, because
 * a page-level assertion says a fault did not happen on forty seeds and a unit
 * test says why it cannot.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../src/gen/index.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { playOracle } from '../src/game/oracle.js';
import { newRun } from '../src/game/reducer.js';
import {
  BEAT_BUDGET_EXCHANGES,
  BEAT_BUDGET_LONG,
  BRIEFING_ACK,
  BRIEFING_PAUSE,
  BRIEFING_SETTLE,
  CLIENT_CONTINUES,
  DECKS,
  PLAIN_BEATS,
  PLAIN_NOTED,
  PLAIN_STOCK,
  arrivalAtom,
  beatBudget,
  bodyConflict,
  bodyWordsOf,
  entranceStage,
  fillPlain,
  opensOnSubject,
  pairBodyWords,
  planBeats,
  pronounOf,
  pronounSubject,
  seenSentence,
  splitSentences,
  type BriefingTurn,
} from '../src/game/voice/index.js';
import type { Page, RunState } from '../src/game/types.js';

const viewOf = (seed: number, difficulty: Difficulty = 2): CaseView =>
  buildView(generateCase(seed, { difficulty }));

const readable = (page: Page): string[] =>
  page.blocks.flatMap((b) =>
    b.kind === 'prose' || b.kind === 'note'
      ? [b.text]
      : b.kind === 'presence' && b.text
        ? [b.text]
        : [],
  );

const textOf = (page: Page): string => readable(page).join('\n');

/** The oracle's first three pages of one seed, which is the harness's set. */
const pagesOf = (seed: number): { state: RunState; view: CaseView; pages: Page[] } => {
  const view = viewOf(seed);
  const state = playOracle(view, 'Dashiell').state;
  return { state, view, pages: state.log.slice(0, 3) };
};

/* ------------------------------------------------------------------ *
 * §A.1 — the beat budget.
 * ------------------------------------------------------------------ */

/**
 * Every sentence the three interstitial pools can produce for this case.
 *
 * The beats are atoms rather than cards, so there is nothing to look them up
 * by on the finished page: the pools are filled with every name and pronoun
 * the case has and the result is matched literally. `fuseParagraphs` may have
 * joined a beat onto the paragraph before it, so the count is over sentences
 * and not over blocks.
 */
const ELSEWHERE = new Set([...PLAIN_NOTED, ...PLAIN_BEATS, ...PLAIN_STOCK]);

const beatSentences = (view: CaseView): Set<string> => {
  const out = new Set<string>();
  for (const person of view.personById.values()) {
    const slots = {
      name: person.surname,
      Pronoun: pronounOf(person) === 'she' ? 'She' : 'He',
    };
    for (const pool of [CLIENT_CONTINUES, BRIEFING_ACK, BRIEFING_PAUSE]) {
      for (const shape of pool) {
        const line = fillPlain(shape, slots);
        // "I noted it." is a beat here and a note to himself in `PLAIN_NOTED`,
        // and on the finished page the two are one string. A sentence another
        // pool can also produce says nothing about this rule either way.
        if (line.length > 0 && !ELSEWHERE.has(line)) out.add(line);
      }
    }
  }
  return out;
};

const beatsOnPage = (view: CaseView, page: Page): string[] => {
  const pool = beatSentences(view);
  const found: string[] = [];
  for (const block of readable(page)) {
    for (const sentence of splitSentences(block)) {
      const bare = sentence.trim();
      if (pool.has(bare)) found.push(bare);
    }
  }
  return found;
};

describe('the beat budget', () => {
  it('is one a page, or two where the page has four or more exchanges', () => {
    expect(beatBudget(0)).toBe(1);
    expect(beatBudget(BEAT_BUDGET_EXCHANGES - 1)).toBe(1);
    expect(beatBudget(BEAT_BUDGET_EXCHANGES)).toBe(BEAT_BUDGET_LONG);
    expect(beatBudget(12)).toBe(BEAT_BUDGET_LONG);
  });

  it('spends no more than the budget, over 40 seeds and three pages', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { view, pages } = pagesOf(seed);
      for (const [i, page] of pages.entries()) {
        const found = beatsOnPage(view, page);
        expect(found.length, `seed ${seed} page ${i + 1}: ${found.join(' / ')}`).toBeLessThanOrEqual(
          BEAT_BUDGET_LONG,
        );
      }
    }
  });

  /**
   * The engine notes every beat it prints under an id no deck owns, so the
   * dealer refuses it for the rest of the night. Asserted where the beats are
   * — page one carries the whole briefing and is the only page with an
   * interstitial on it — and then against the run's own spend, which is what
   * the save carries and what the refusal is read off.
   */
  it('never says the same beat twice in one run', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { view, state } = pagesOf(seed);
      const said: string[] = [];
      for (const page of state.log) said.push(...beatsOnPage(view, page));
      expect(new Set(said).size, `seed ${seed}: ${said.join(' / ')}`).toBe(said.length);
      // And the refusal is the dealer's, which is what the save carries.
      for (const beat of said) expect(state.burned, `seed ${seed}`).toContain(`beat:${beat}`);
    }
  });

  /**
   * The refusal the rule is really about. A beat between two of the client's
   * turns narrates a pause nobody took, so a position is legal only where
   * Dashiell's next line stands between her and her next paragraph.
   */
  it('puts nothing between two consecutive client turns', () => {
    const line = (topic: BriefingTurn['lines'][number]['topic'], text: string, prompt?: string) => ({
      topic,
      text,
      ...(prompt === undefined ? {} : { prompt }),
    });
    const runOn: BriefingTurn[] = [
      { prompt: null, lines: [line('standing', 'He ran the block.')] },
      { prompt: null, lines: [line('given', 'He was found at the suite.')] },
      { prompt: null, lines: [line('purpose', 'I want it settled.')] },
    ];
    expect(planBeats(runOn, { closeIsSpeech: false, closePrompt: null })).toEqual([]);

    const asked: BriefingTurn[] = [
      { prompt: null, lines: [line('standing', 'He ran the block.')] },
      { prompt: 'Where did you find him?', lines: [line('discovery', 'I found him at eleven.')] },
    ];
    const planned = planBeats(asked, { closeIsSpeech: true, closePrompt: 'Who was no friend?' });
    expect(planned.length).toBeGreaterThan(0);
    // Every beat sits after a turn whose successor opens on one of his lines.
    for (const beat of planned) {
      const next = asked[beat.after + 1];
      if (next === undefined) expect('Who was no friend?').not.toBeNull();
      else expect(next.prompt).not.toBeNull();
    }
  });

  it('earns its beat: a one-word answer takes one before anything else does', () => {
    const turns: BriefingTurn[] = [
      { prompt: null, lines: [{ topic: 'standing', text: 'He ran the block for years.' }] },
      { prompt: 'What were you doing there?', lines: [{ topic: 'tie', text: 'Collecting.' }] },
      { prompt: 'And then?', lines: [{ topic: 'purpose', text: 'I want what I am owed.' }] },
    ];
    // Four exchanges — three turns and the close — so the budget is two, and
    // the one-word answer is the first of them whatever else is on offer.
    const planned = planBeats(turns, { closeIsSpeech: true, closePrompt: 'Who?' });
    expect(planned).toContainEqual({ after: 1, kind: 'pause' });
    expect(planned.length).toBeLessThanOrEqual(BEAT_BUDGET_LONG);
    // Two turns and no close: the budget is one, the short answer's position
    // is illegal because nothing of Dashiell's follows it, and what is left is
    // the acknowledgement after the turn he already knew the half of.
    const short = planBeats(turns.slice(0, 2), { closeIsSpeech: false, closePrompt: null });
    expect(short).toEqual([{ after: 0, kind: 'ack' }]);
    // Give the close a question and the short answer takes the one beat.
    const withAsk = planBeats(turns.slice(0, 2), { closeIsSpeech: true, closePrompt: 'Who?' });
    expect(withAsk).toEqual([{ after: 1, kind: 'pause' }]);
  });
});

/* ------------------------------------------------------------------ *
 * §A.2 — the pair and the beat cannot both have the hands.
 * ------------------------------------------------------------------ */

describe('a portrait pair and a beat', () => {
  it('reads the same word off a motif tag and off the prose', () => {
    expect(bodyWordsOf('She flipped a coin off her thumb.')).toEqual(new Set(['hands', 'money']));
    expect(bodyWordsOf('The rag keeps going over the counter.', ['hands'])).toEqual(
      new Set(['hands']),
    );
    // A motif that is neither a body part nor a thing held is not a claim.
    expect(bodyWordsOf('The El went over at ten.', ['el', 'late'])).toEqual(new Set());
    expect(bodyConflict(new Set(['hands']), 'She sat with both hands folded.')).toBe(true);
    expect(bodyConflict(new Set(['hands']), 'She did not lean back.')).toBe(false);
    expect(bodyConflict(new Set(), 'She sat with both hands folded.')).toBe(false);
  });

  /**
   * On the page: where a pair card is printed, nothing the engine chose as a
   * beat — the settle beat on page one, or a business card anywhere — may
   * reach for what the pair already has.
   */
  it('claims nothing once the pair has become a recall phrase', () => {
    const view = viewOf(3);
    const cast = newRun(view, { detectiveName: 'Dashiell' }).cast;
    const client = view.client;
    if (cast.portraits[client.id]?.pair !== undefined) {
      expect(pairBodyWords(cast, client.id, 0).size).toBeGreaterThan(0);
    }
    // Every meeting after the first prints "Kreuzer, the woman with the broken
    // finger", which claims nothing, because the detail is not being read out.
    expect(pairBodyWords(cast, client.id, 1).size).toBe(0);
  });

  it('never contradicts itself on any page of forty seeds', () => {
    const settleShapes = (surname: string, pronoun: 'he' | 'she'): string[] =>
      BRIEFING_SETTLE.map((shape) =>
        fillPlain(shape, { name: surname, Pronoun: pronoun === 'she' ? 'She' : 'He' }),
      ).filter((s) => s.length > 0);
    // A business card with a slot in it is not matched literally, and the ones
    // without are the whole deck bar a handful.
    const business = (DECKS.business ?? []).filter((c) => !c.text.includes('{'));
    const pairs = DECKS['portrait-pairs'] ?? [];
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const state = playOracle(view, 'Dashiell').state;
      for (const page of state.log) {
        const text = textOf(page);
        for (const person of view.personById.values()) {
          const pair = state.cast.portraits[person.id]?.pair;
          if (pair === undefined || !text.includes(pair.text)) continue;
          const card = pairs.find((c) => c.id === pair.cardId);
          const claimed = bodyWordsOf(
            pair.text,
            ((card?.motifs as string[] | undefined) ?? []),
          );
          if (claimed.size === 0) continue;
          checked++;
          for (const beat of settleShapes(person.surname, pronounOf(person))) {
            if (!text.includes(beat)) continue;
            expect(
              bodyConflict(claimed, beat),
              `seed ${seed}: "${beat}" contradicts ${person.surname}'s pair`,
            ).toBe(false);
          }
          for (const gesture of business) {
            if (!text.includes(gesture.text)) continue;
            expect(
              bodyConflict(claimed, gesture.text, (gesture.motifs as string[] | undefined) ?? []),
              `seed ${seed}: ${gesture.id} contradicts ${person.surname}'s pair`,
            ).toBe(false);
          }
        }
      }
    }
    // The assertion is worth nothing if no pair with a claim ever reached a page.
    // M8 §4: the pair is printed on the page a person is first portrayed on —
    // the office, for the client — and afterwards only its recall phrase is,
    // once a visit, so forty seeds reach about one checked page each.
    expect(checked).toBeGreaterThan(10);
  });
});

/* ------------------------------------------------------------------ *
 * §A.3 — pronouns after the first mention.
 * ------------------------------------------------------------------ */

describe('the surname', () => {
  it('goes for a pronoun as a subject, and stays where it is as an appositive', () => {
    expect(pronounSubject('Kreuzer writes the tickets.', 'Kreuzer', 'she')).toBe(
      'She writes the tickets.',
    );
    expect(pronounSubject('Kreuzer’s hands were still.', 'Kreuzer', 'she')).toBe(
      'Her hands were still.',
    );
    // An appositive is what that sentence is for, and it keeps the name.
    expect(pronounSubject('Kreuzer, the woman with the broken finger.', 'Kreuzer', 'she')).toBe(
      'Kreuzer, the woman with the broken finger.',
    );
    expect(opensOnSubject('Kreuzer kept the coat on.', 'Kreuzer')).toBe(true);
    expect(opensOnSubject('I did not press Kreuzer.', 'Kreuzer')).toBe(false);
  });

  it('is never the subject of two consecutive sentences, over 40 seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { view, state } = pagesOf(seed);
      const surnames = [...view.personById.values()].filter((p) => p.surname.length > 0);
      for (const [n, page] of state.log.entries()) {
        let last: string | null = null;
        for (const block of readable(page)) {
          for (const sentence of splitSentences(block)) {
            const bare = sentence.trim();
            if (/^[“"]/.test(bare)) {
              last = null;
              continue;
            }
            const who = surnames.find((p) => opensOnSubject(bare, p.surname));
            if (who === undefined) {
              last = null;
              continue;
            }
            expect(last, `seed ${seed} page ${n + 1}: "${bare}"`).not.toBe(who.surname);
            last = who.surname;
          }
        }
      }
    }
  });

  it('says what he can see, and not what the dossier holds, on page one', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const text = textOf(page);
      const client = view.client;
      const dossier = client.dossier;
      if (!dossier) continue;
      // The record sentence is gone, whatever the rest of the page does.
      const record = `${client.name} is ${dossier.age} years old`;
      expect(text.includes(record), `seed ${seed}: the dossier record`).toBe(false);
      // And one of the two forms of the look is there in its place.
      const looks = [seenSentence(client, true), seenSentence(client, false)];
      expect(
        looks.some((line) => text.includes(line)),
        `seed ${seed}: what he can see`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §A.4 — stairs, door, sit, speak.
 * ------------------------------------------------------------------ */

describe('the entrance', () => {
  it('reads a stage off every card in the deck, and never a later one first', () => {
    for (const card of DECKS.entrances ?? []) {
      const stage = entranceStage(card.text);
      expect(['stairs', 'door', 'sit', 'speak'], card.id).toContain(stage);
    }
    expect(entranceStage('{name} shut the door soft.')).toBe('door');
    expect(entranceStage('{name} came up the stairs slow.')).toBe('stairs');
    expect(entranceStage('{name} took the chair before I could offer it.')).toBe('sit');
    expect(entranceStage('“Dashiell.” {name} said it easy.')).toBe('speak');
  });

  it('cuts the arrival atom to whatever fits in front of the card', () => {
    const atom = 'A woman came up the stairs after midnight, and sat down.';
    // The card climbs the stairs itself, so the atom has nothing left to say.
    expect(arrivalAtom(atom, '{name} came up the stairs slow.')).toBeNull();
    // The card is about to shut the door, so the seating comes off.
    expect(arrivalAtom(atom, '{name} shut the door soft.')).toBe(
      'A woman came up the stairs after midnight.',
    );
    expect(arrivalAtom(atom, '{name} took the chair.')).toBe(
      'A woman came up the stairs after midnight.',
    );
    // The card only speaks, so stairs, chair, first word is already the order.
    expect(arrivalAtom(atom, '“Dashiell.” {name} said it easy.')).toBe(atom);
    expect(arrivalAtom(null, '{name} shut the door soft.')).toBeNull();
  });

  const SEATED = /\b(?:sat down|took the chair|sat in the chair|sitting himself down)\b/i;
  const THROUGH_THE_DOOR =
    /\b(?:shut the door|knocked|came in|came all the way in|stood in the doorway|filled the doorway|wiped his boots)\b/i;

  it('never seats the client before she is through the door, on 40 page ones', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const sentences = readable(page)
        .flatMap((b) => splitSentences(b))
        .map((s) => s.trim())
        .filter((s) => !/^[“"]/.test(s));
      for (let i = 1; i < sentences.length; i++) {
        const before = sentences[i - 1] as string;
        const here = sentences[i] as string;
        expect(
          SEATED.test(before) && THROUGH_THE_DOOR.test(here),
          `seed ${seed}: "${before}" then "${here}"`,
        ).toBe(false);
      }
    }
  });

  it('says once that somebody came up the stairs, and not twice', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      const page = newRun(view, { detectiveName: 'Dashiell' }).log[0] as Page;
      const hits = (textOf(page).match(/\bcame up the stairs\b/gi) ?? []).length;
      expect(hits, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §A.5 — correspondence is still zero on the page.
 * ------------------------------------------------------------------ */

describe('correspondence', () => {
  it('finds nothing on any page the engine renders, over 40 oracle runs', () => {
    const all: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const view = viewOf(seed);
      all.push(
        ...checkRun(view, playOracle(view, 'Dashiell').state).map(
          (v) => `seed ${seed} ${v.where}: ${v.detail}`,
        ),
      );
    }
    expect(all).toEqual([]);
  });
});
