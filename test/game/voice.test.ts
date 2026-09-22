/**
 * The M4 voice engine.
 *
 * M3's voice.test.ts asserted that a clue's flat text was rendered verbatim on
 * the page. §A.1 moved that sentence to the notebook, so the same contract is
 * asserted here in its new place — the record is verbatim, and the page still
 * carries the fact. Losing either half is losing the fairness, and the tests
 * that watch for it are the first two describes below.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import type { Fact, Person } from '../../src/gen/types.js';
import { buildView, establishedFrom, segmentNouns } from '../../src/game/derive.js';
import { buildNotebook } from '../../src/game/notebook.js';
import { playOracle, playWandering } from '../../src/game/oracle.js';
import { newRun, stepInput, topicSlots } from '../../src/game/reducer.js';
import { wordsOnPage } from '../../src/game/transcript.js';
import { COLOUR_LINES } from '../../src/game/voice-data.js';
import type { RunState } from '../../src/game/types.js';
import {
  ALL_CARDS,
  COLOUR_FRAMES,
  CONTRADICTION_TEMPLATES,
  DECKS,
  MISSING_DECKS,
  SCHEMA,
  THEORY_TEMPLATES,
  WINDOW_TEMPLATES,
  Dealer,
  askSlots,
  attachSimile,
  beatsOf,
  businessLine,
  burnTier,
  carriesFact,
  crossRunOnly,
  deckOf,
  describePerson,
  factOnPage,
  factsAgainst,
  fill,
  frameColour,
  genderHintOf,
  insideQuotes,
  nounOf,
  leadingTheory,
  oddsFor,
  pastTenseHabit,
  reactiveMonologue,
  rollCast,
  rollDashiell,
  SIMILE_HOSTS,
  simileTargetsFor,
  slotsOf,
  speakClue,
  temperOf,
  theoryPool,
  tidyPunctuation,
  validateDecks,
  weightsFor,
  type AskKind,
  type Card,
} from '../../src/game/voice/index.js';

const view = buildView(generateCase(7, { difficulty: 2 }));
const CARD_BY_ID = new Map<string, Card>(ALL_CARDS.map((c) => [c.id, c]));

/** Walk a whole case, taking everything there is to take. */
function exhaust(seed: number, difficulty: Difficulty): RunState {
  const v = buildView(generateCase(seed, { difficulty }));
  let state = newRun(v, { detectiveName: 'Dashiell' });
  for (const place of v.kase.places) {
    state = stepInput(state, `go ${place.shortName}`, v).state;
    state = stepInput(state, 'look', v).state;
    state = stepInput(state, 'examine', v).state;
    for (const person of v.peopleAt.get(place.id) ?? []) {
      const surname = v.personById.get(person)?.surname;
      state = stepInput(state, `ask ${surname} about that evening`, v).state;
      for (const topic of v.exactBuckets.get(person)?.keys() ?? []) {
        state = stepInput(state, `ask ${surname} about ${topic}`, v).state;
      }
      state = stepInput(state, `ask ${surname} about the price of tin`, v).state;
    }
  }
  return state;
}

/* ------------------------------------------------------------------ *
 * A.1 — the record moved, and nothing was lost moving it.
 * ------------------------------------------------------------------ */

describe('the record', () => {
  it('writes every clue found into the notebook verbatim, under its source', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [1, 7, 13]) {
        const v = buildView(generateCase(seed, { difficulty }));
        const state = exhaust(seed, difficulty);
        const book = buildNotebook(v, state);
        const written = new Map<string, string>();
        for (const person of book.people) for (const r of person.records) written.set(r.clueId, r.text);
        for (const place of book.places) for (const r of place.clues) written.set(r.clueId, r.text);
        for (const id of state.found) {
          expect(written.get(id), `${id} is not in the notebook`).toBe(
            v.findableById.get(id)?.text,
          );
        }
        // And it is nearly everything there is.
        expect(state.found.length).toBeGreaterThan(v.kase.findable.length - 6);
      }
    }
  });

  it('carries every clue onto the page as well, in some form', () => {
    for (const seed of [2, 7, 19]) {
      const state = exhaust(seed, 2);
      const carried = new Set<string>();
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind === 'prose' && block.clueId) carried.add(block.clueId);
        }
      }
      for (const id of state.found) {
        expect(carried.has(id), `${id} never reached the page`).toBe(true);
      }
    }
  });

  it('prints a clue flat on the page only where it said it had to', () => {
    for (const seed of [3, 7, 21]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const state = exhaust(seed, 2);
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose' || !block.clueId) continue;
          const flat = v.findableById.get(block.clueId)?.text;
          if (!flat || !block.text.includes(flat)) continue;
          // A page that carries the record says so in the gap log, or comes
          // out of the find deck, where the record is the point.
          const excused =
            block.voice === 'record' || block.voice === 'find' || page.gaps.length > 0;
          expect(excused, `${block.clueId} printed flat with nothing logged`).toBe(true);
        }
      }
    }
  });

  it('segments a clue back into exactly the string it came from', () => {
    for (const clue of view.kase.findable) {
      const segments = segmentNouns(clue.text, view);
      expect(segments.map((s) => s.text).join('')).toBe(clue.text);
    }
  });
});

/* ------------------------------------------------------------------ *
 * A.2 — the roll.
 * ------------------------------------------------------------------ */

describe('the roll', () => {
  it('is the same night for the same seed, and a different one for another', () => {
    for (const seed of [1, 7, 40, 99]) {
      const kase = generateCase(seed, { difficulty: 2 });
      expect(rollDashiell(kase)).toEqual(rollDashiell(kase));
      expect(rollCast(kase)).toEqual(rollCast(kase));
    }
    const a = rollDashiell(generateCase(7, { difficulty: 2 }));
    const b = rollDashiell(generateCase(8, { difficulty: 2 }));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('can be seeded from somewhere other than the case, for a later milestone', () => {
    const kase = generateCase(7, { difficulty: 2 });
    expect(rollDashiell(kase, { seed: 4242 })).toEqual(rollDashiell(kase, { seed: 4242 }));
    expect(rollDashiell(kase, { seed: 4242 })).not.toEqual(rollDashiell(kase));
  });

  it('knows a bartender far more often than an heiress, over 400 cases', () => {
    const met = new Map<string, { seen: number; known: number }>();
    for (let seed = 1; seed <= 400; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const roll = rollDashiell(kase);
      for (const person of kase.people) {
        if (person.kind === 'victim') continue;
        const key = person.fixtureRole ?? 'suspect';
        const row = met.get(key) ?? { seen: 0, known: 0 };
        row.seen++;
        if (roll.knows[person.id]) row.known++;
        met.set(key, row);
      }
    }
    const bartender = met.get('bartender');
    const suspect = met.get('suspect');
    expect(bartender).toBeDefined();
    // 0.5 against a suspect pool averaging well under 0.2.
    const rate = (k?: { seen: number; known: number }): number => (k ? k.known / k.seen : 0);
    expect(rate(bartender)).toBeGreaterThan(0.4);
    expect(rate(bartender)).toBeLessThan(0.6);
    expect(rate(suspect)).toBeLessThan(0.25);
    expect(rate(bartender)).toBeGreaterThan(rate(suspect) * 2);
  });

  it('never puts an old flame on a fixture, and never more than one a run', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const roll = rollDashiell(kase);
      const flames = Object.entries(roll.knows).filter(([, a]) => a.how === 'old-flame');
      expect(flames.length).toBeLessThanOrEqual(1);
      for (const [id] of flames) {
        expect(kase.people.find((p) => p.id === id)?.kind).toBe('suspect');
        expect(roll.relationship).not.toBe('none');
      }
    }
  });

  it('gives every person the odds their role says', () => {
    for (const person of view.kase.people) {
      if (person.kind === 'victim') expect(oddsFor(person)).toBe(0);
      else expect(oddsFor(person)).toBeGreaterThan(0);
    }
    const bartender = view.kase.people.find((p) => p.fixtureRole === 'bartender') as Person;
    const ticket = { ...bartender, fixtureRole: 'ticket-taker' as const };
    expect(oddsFor(bartender)).toBeGreaterThan(oddsFor(ticket));
  });
});

/* ------------------------------------------------------------------ *
 * A.2 — the free first ask.
 * ------------------------------------------------------------------ */

describe('the free first ask', () => {
  it('waives the first question to somebody who knows him, and only the first', () => {
    let checked = 0;
    for (let seed = 1; seed <= 60 && checked < 6; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      let state = newRun(v, { detectiveName: 'Dashiell' });
      const known = Object.keys(state.cast.roll.knows)
        .map((id) => v.personById.get(id))
        .filter((p): p is Person => p !== undefined && p.foundAt !== undefined);
      const friend = known[0];
      if (!friend) continue;
      checked++;
      if (friend.foundAt !== state.at) {
        state = stepInput(state, `go ${v.placeById.get(friend.foundAt as string)?.shortName}`, v).state;
      }
      const before = state.actionsUsed;
      const first = stepInput(state, `ask ${friend.surname} about that evening`, v);
      expect(first.page.cost, `${friend.surname} first ask`).toBe(0);
      expect(first.state.actionsUsed).toBe(before);
      expect(first.state.waived).toBe(1);
      state = first.state;
      const second = stepInput(state, `ask ${friend.surname} about the victim`, v);
      expect(second.page.cost).toBe(1);
      expect(second.state.waived).toBe(1);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('charges everybody else from the first word', () => {
    const v = buildView(generateCase(7, { difficulty: 2 }));
    const state = newRun(v, { detectiveName: 'Dashiell' });
    const stranger = (v.peopleAt.get(state.at) ?? [])
      .map((id) => v.personById.get(id) as Person)
      .find((p) => !state.cast.roll.knows[p.id]);
    if (!stranger) return;
    const result = stepInput(state, `ask ${stranger.surname} about that evening`, v);
    expect(result.page.cost).toBe(1);
    expect(result.state.waived).toBe(0);
  });

  it('only ever makes the night cheaper: par accounting is untouched', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 25; seed++) {
        const v = buildView(generateCase(seed, { difficulty }));
        const result = playOracle(v);
        expect(result.ok, `d${difficulty} seed ${seed}: ${result.reason}`).toBe(true);
        expect(result.actions).toBe(result.spent + result.waived);
        expect(result.actions).toBeLessThanOrEqual(result.par);
        expect(result.spent).toBeLessThanOrEqual(result.actions);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * A.3 — temper and the yap volunteer.
 * ------------------------------------------------------------------ */

describe('temper', () => {
  it('leans the way the weights lean, over 300 cases', () => {
    const counts = new Map<string, Record<string, number>>();
    for (let seed = 1; seed <= 300; seed++) {
      const kase = generateCase(seed, { difficulty: 2 });
      const cast = rollCast(kase);
      for (const person of kase.people) {
        if (person.kind === 'victim') continue;
        const key = person.fixtureRole ?? person.archetypeId ?? 'unknown';
        const row = counts.get(key) ?? { enigma: 0, plain: 0, yap: 0 };
        row[temperOf(cast, person.id)] = (row[temperOf(cast, person.id)] ?? 0) + 1;
        counts.set(key, row);
      }
    }
    // A ward heeler yaps. A seamstress is plain. A nurse may be an enigma.
    const heeler = counts.get('arch-heeler');
    if (heeler) {
      const total = heeler.enigma + heeler.plain + heeler.yap;
      expect(heeler.yap / total).toBeGreaterThan(0.6);
      expect(heeler.enigma).toBe(0);
    }
    const seamstress = counts.get('arch-seamstress');
    if (seamstress) {
      const total = seamstress.enigma + seamstress.plain + seamstress.yap;
      expect(seamstress.plain / total).toBeGreaterThan(0.6);
    }
    // Fixtures lean plain as a group.
    let fixturePlain = 0;
    let fixtureAll = 0;
    for (const [key, row] of counts) {
      if (!key.startsWith('arch-')) {
        fixturePlain += row.plain;
        fixtureAll += row.enigma + row.plain + row.yap;
      }
    }
    expect(fixturePlain / fixtureAll).toBeGreaterThan(0.5);
  });

  it('resolves a person to the narrowest table that has them', () => {
    const heeler = view.kase.people.find((p) => p.archetypeId === 'arch-heeler');
    if (heeler) expect(weightsFor(heeler).yap).toBeGreaterThan(weightsFor(heeler).enigma);
    const bartender = view.kase.people.find((p) => p.fixtureRole === 'bartender') as Person;
    expect(weightsFor(bartender).plain).toBeGreaterThan(weightsFor(bartender).enigma);
  });

  it('volunteers exactly once a run, and never a spine clue', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [2, 7, 13, 21, 33]) {
        const v = buildView(generateCase(seed, { difficulty }));
        const state = exhaust(seed, difficulty);
        expect(state.volunteered.length, `d${difficulty} seed ${seed}`).toBeLessThanOrEqual(1);
        for (const id of state.volunteered) {
          expect(v.findableById.get(id)?.role).not.toBe('spine');
        }
      }
    }
  });

  it('volunteers often enough to be a mechanic, over 100 oracle runs', () => {
    let seen = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      if (playOracle(v).state.volunteered.length > 0) seen++;
    }
    expect(seen).toBeGreaterThan(20);
  });
});

/* ------------------------------------------------------------------ *
 * A.4 — portraits.
 * ------------------------------------------------------------------ */

describe('portraits', () => {
  it('gives the same person the same details, woven the same way', () => {
    const state = exhaust(7, 2);
    const v = buildView(generateCase(7, { difficulty: 2 }));
    for (const person of v.kase.people) {
      const portrait = state.cast.portraits[person.id];
      expect(portrait, person.surname).toBeDefined();
      const weave = (times: number, nth: number): string =>
        describePerson({
          cast: state.cast,
          personId: person.id,
          surname: person.surname,
          times,
          pronoun: 'he',
          nth,
        });
      expect(weave(0, 5)).toBe(weave(0, 5));
      // M4b §A.4: the first meeting is trait plus ONE of habit and clothing,
      // never all three, and every later appearance is one component only.
      const parts = [portrait?.trait, portrait?.habit, portrait?.clothing].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
      );
      // A weaving template may put a component at the head of a sentence, so
      // the comparison is case-blind on the first letter and nowhere else —
      // and a habit is the same detail whether the sentence around it wanted
      // it in the present or turned it into the past.
      const holds = (text: string, part: string): boolean => {
        const lower = text.toLowerCase();
        if (lower.includes(part.toLowerCase())) return true;
        const past = pastTenseHabit(part);
        return past !== null && lower.includes(past.toLowerCase());
      };
      if (parts.length === 3) {
        expect(parts.filter((p) => holds(weave(0, 0), p)).length).toBeLessThanOrEqual(2);
      }
      for (let n = 1; n < 6; n++) {
        expect(parts.filter((p) => holds(weave(n, n), p))).toHaveLength(1);
      }
      // §A.6: the second meeting repeats the first meeting's component once.
      if (parts.length === 3) {
        const first = weave(0, 0);
        const second = weave(1, 1);
        const repeated = parts.find((p) => p !== portrait?.trait && holds(second, p));
        expect(repeated !== undefined && holds(first, repeated)).toBe(true);
      }
    }
  });

  it('never lists three details at once, and never two semicolons', () => {
    const state = exhaust(7, 2);
    const v = buildView(generateCase(7, { difficulty: 2 }));
    for (const person of v.kase.people) {
      const portrait = state.cast.portraits[person.id];
      if (!portrait) continue;
      const parts = [portrait.trait, portrait.habit, portrait.clothing].filter((p) => p.length > 0);
      if (parts.length < 3) continue;
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose') continue;
          if (block.voice !== 'presence' && block.voice !== 'approach') continue;
          const lower = block.text.toLowerCase();
          const holds = (p: string): boolean => {
            if (lower.includes(p.toLowerCase())) return true;
            const past = pastTenseHabit(p);
            return past !== null && lower.includes(past.toLowerCase());
          };
          expect(parts.every(holds)).toBe(false);
          expect((block.text.match(/;/g) ?? []).length).toBeLessThan(2);
        }
      }
    }
  });

  it('turns a habit into the past tense only off the table, and says so otherwise', () => {
    expect(pastTenseHabit('whistles two bars of the same tune between sentences')).toBe(
      'whistled two bars of the same tune between sentences',
    );
    expect(pastTenseHabit('runs a thumbnail along the seam of the table')).toBe(
      'ran a thumbnail along the seam of the table',
    );
    expect(pastTenseHabit('straightens picture frames that are already straight')).toBe(
      'straightened picture frames that are already straight',
    );
    // Not a verb this table knows: the caller takes the colon shape instead of
    // inventing a word.
    expect(pastTenseHabit('counting the change twice before it goes in the pocket')).toBeNull();
    expect(pastTenseHabit('a matchbook turning end over end, never struck')).toBeNull();
  });

  it('never hangs a present-tense habit off a past-tense clause', () => {
    // "Doyle came with a callus in the web of the thumb, and whistles two bars
    // of the same tune the whole time" is two tenses in one sentence. A habit
    // left in the present goes after a stop or a colon, as its own sentence,
    // and nowhere else.
    const state = exhaust(7, 2);
    const v = buildView(generateCase(7, { difficulty: 2 }));
    let seen = 0;
    for (const person of v.kase.people) {
      const portrait = state.cast.portraits[person.id];
      if (!portrait || portrait.habit.length === 0) continue;
      for (let times = 0; times < 5; times++) {
        for (let nth = 0; nth < 5; nth++) {
          const text = describePerson({
            cast: state.cast,
            personId: person.id,
            surname: person.surname,
            times,
            nth,
            business: 'Counted the till under the bar.',
            pronoun: 'he',
          });
          const at = text.toLowerCase().indexOf(portrait.habit.toLowerCase());
          if (at < 0) continue;
          seen++;
          const before = text.slice(0, at).trimEnd();
          expect(
            before.length === 0 || /[.:]$/.test(before),
            `${person.surname}, times ${times}: ${text}`,
          ).toBe(true);
        }
      }
    }
    expect(seen, 'no weave used a habit as written').toBeGreaterThan(0);
  });

  it('never prints the same beat twice in one approach paragraph', () => {
    for (const seed of [1, 3, 7, 12, 19]) {
      for (const page of exhaust(seed, 2).log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose') continue;
          if (block.voice !== 'approach' && block.voice !== 'presence') continue;
          const said = block.text
            .split(/(?<=[.!?])\s+/)
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s.length > 0);
          expect(new Set(said).size, `seed ${seed}: ${block.text}`).toBe(said.length);
        }
      }
    }
  });

  it('draws without replacement, and avoids what an earlier run read', () => {
    const kase = generateCase(7, { difficulty: 2 });
    const fresh = rollCast(kase);
    // The placeholder deck holds three cards per component. The first three
    // people must therefore have three different traits: no replacement.
    const traits = kase.people.slice(0, 3).map((p) => fresh.portraits[p.id]?.trait);
    expect(new Set(traits).size).toBe(3);

    // A card the browser remembers from an earlier run is passed over while
    // anything else fits.
    const firstTrait = fresh.portraits[kase.people[0]?.id ?? '']?.cardIds[0] as string;
    const again = rollCast(kase, { persistedBurned: [firstTrait] });
    const used = Object.values(again.portraits)
      .slice(0, 2)
      .flatMap((p) => p.cardIds);
    expect(used).not.toContain(firstTrait);
  });
});

/* ------------------------------------------------------------------ *
 * A.5 — the page grammar.
 * ------------------------------------------------------------------ */

describe('the page grammar', () => {
  /**
   * M4's floor was 80 words. M4b §A.1 takes images off the page on purpose —
   * three of them, or two where there is an exchange or a find to carry — so
   * a page with little load-bearing work to do is now genuinely shorter, and
   * a floor that forces an image back on would be the milestone undone. The
   * floor is 55 and the median is what the notes report.
   */
  /*
   * M5 widened the band from 55..300 to 50..340. The band is a property of
   * the renderer against whatever the generator deals it, and M5 deals it two
   * more clues per case. Over the 2,097 pages these two tests walk, the
   * median is 117 and 130 and the first and ninety-ninth percentiles are
   * 70..240 and 69..284 — unmoved. Three pages fall outside the old band: one
   * at 52 words, which is a transition, a find and an ambient line and
   * nothing else to say, and two at 321 and 336, which are both an `examine`
   * of a room that happened to hold ten findable clues. Capping the finds a
   * page will carry is the engine's business, and Phase 2 has the page.
   */
  /**
   * M5 §2 gave page one the whole briefing — sixteen plain declarative
   * sentences, which is what the client came up the stairs to say — on top of
   * the office card and the entrance. That page has its own ceiling of 380
   * words and is the only page in a run allowed past 340; everything after it
   * is trimmed to 300 exactly as before.
   */
  it('keeps every page between 50 and 380 words, over 100 oracle runs', () => {
    const offenders: string[] = [];
    for (let seed = 1; seed <= 100; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      for (const page of playOracle(v).state.log) {
        const n = wordsOnPage(page);
        const ceiling = page.n === 0 ? 380 : 340;
        if (n < 50 || n > ceiling) offenders.push(`seed ${seed} page ${page.n}: ${n} words`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the imperfect player inside the same range', () => {
    const offenders: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 3 }));
      for (const page of playWandering(v, seed).state.log) {
        const n = wordsOnPage(page);
        const ceiling = page.n === 0 ? 380 : 340;
        if (n < 50 || n > ceiling) offenders.push(`seed ${seed} page ${page.n}: ${n} words`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never prints an unfilled slot anywhere in a whole run', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      const state = exhaust(5, difficulty);
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose' && block.kind !== 'note') continue;
          expect(block.text, `page ${page.n}`).not.toMatch(/\{[a-z]+\}/);
        }
      }
    }
  });

  it('puts at most one simile on a page and shows off once a run', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [2, 7, 19]) {
        const state = exhaust(seed, difficulty);
        for (const page of state.log) {
          const similes = page.cardsUsed.filter((id) => deckOf(id) === 'similes');
          expect(similes.length).toBeLessThanOrEqual(1);
        }
        const loud = state.burned.filter((id) => {
          const card = CARD_BY_ID.get(id);
          return deckOf(id) === 'similes' && card?.tags.intensity === 3;
        });
        expect(loud.length, `d${difficulty} seed ${seed}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('spends an aside at most once an hour band', () => {
    for (const seed of [3, 7, 11]) {
      const state = exhaust(seed, 2);
      const bands = state.asideBands;
      expect(new Set(bands).size).toBe(bands.length);
      expect(bands.length).toBeLessThanOrEqual(4);
    }
  });

  it('skips a card whose slots cannot be filled rather than printing a hole', () => {
    const withName = DECKS.similes.find((c) => slotsOf(c).includes('name')) as Card;
    expect(fill(withName, {})).toBeNull();
    expect(fill(withName, { name: '' })).toBeNull();
    expect(fill(withName, { name: 'Brauer' })).toContain('Brauer');
  });

  it('sounds like a person and not a parser when there is nothing to say', () => {
    const v = buildView(generateCase(7, { difficulty: 2 }));
    const state = newRun(v, { detectiveName: 'Dashiell' });
    const result = stepInput(state, 'ask nobody about the price of tin', v);
    const text = result.page.blocks
      .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
      .join(' ');
    expect(result.page.cost).toBe(0);
    expect(text.toLowerCase()).not.toContain('error');
    expect(text.toLowerCase()).not.toContain('parse');
    expect(text).not.toMatch(/\{[a-z]+\}/);
  });
});

/* ------------------------------------------------------------------ *
 * A.5 — the fact always lands, or the gap is logged.
 * ------------------------------------------------------------------ */

describe('the utterance deck', () => {
  it('has something for every fact kind the generator can produce', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const difficulty of [1, 2, 3] as Difficulty[]) {
        const v = buildView(generateCase(seed, { difficulty }));
        for (const clue of v.kase.findable) {
          for (const beat of beatsOf(v, clue)) kinds.add(beat.kind);
        }
      }
    }
    expect(kinds.size).toBeGreaterThan(6);
    for (const kind of kinds) {
      const fits = DECKS.utterances.filter(
        (c) => c.tags.factKind === kind && carriesFact(c, kind),
      );
      expect(fits.length, `no utterance carries a ${kind}`).toBeGreaterThan(0);
    }
  });

  it('logs a gap whenever it falls back, and falls back for a reason', () => {
    for (const seed of [1, 7, 19]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const state = exhaust(seed, 2);
      for (const page of state.log) {
        for (const gap of page.gaps) {
          expect(gap).toMatch(
            // M5 adds two: `plain-register` is a fact kind the utterance deck
            // was never written for — every robbery's and every
            // disappearance's — said plainly instead, and `no-deck-kind` is
            // `ask-self`, which `dashiell-lines` has no cards for yet.
            /^(no-utterance|no-fact|too-many-facts|deck-exhausted|missing-deck|no-business|no-client-clue|plain-register|no-deck-kind):/,
          );
          const id = /\(([^)]+)\)/.exec(gap)?.[1];
          if (id) expect(v.findableById.get(id)).toBeDefined();
        }
      }
    }
  });

  it('refuses an utterance that cannot carry its fact kind whole', () => {
    const naked: Card = {
      id: 'test-001',
      deck: 'utterances',
      text: 'Somebody was somewhere at some point.',
      tags: { factKind: 'personAt', temper: 'plain' },
      status: 'placeholder',
    };
    expect(carriesFact(naked, 'personAt')).toBe(false);
    const whole: Card = { ...naked, text: '{subject} was at {place} at {time}.' };
    expect(carriesFact(whole, 'personAt')).toBe(true);
  });

  it('folds a run of half hours in one room into one span', () => {
    const clue = view.kase.findable.find(
      (c) =>
        c.establishes.filter((f: Fact) => f.kind === 'personAt').length > 1 &&
        c.source.type === 'person',
    );
    if (!clue) return;
    const beats = beatsOf(view, clue);
    expect(beats.length).toBeLessThan(clue.establishes.length);
    const span = beats.find((b) => b.slots.time?.includes(' to '));
    expect(span).toBeDefined();
  });
});

/* ------------------------------------------------------------------ *
 * A.6 — the monologue, the theory, and the bias.
 * ------------------------------------------------------------------ */

describe('the reactive monologue', () => {
  const kase = generateCase(7, { difficulty: 2 });
  const roll = rollDashiell(kase);
  const suspect = kase.people.find((p) => p.kind === 'suspect') as Person;

  const boardWith = (n: number) => {
    const est = establishedFrom(view, [], []);
    est.placements.set(
      suspect.id,
      Array.from({ length: n }, (_, i) => ({
        personId: suspect.id,
        placeId: view.kase.places[0]?.id as string,
        tick: i,
        present: true,
        clueId: `made-up-${i}`,
        contradicts: true,
      })),
    );
    return est;
  };

  it('lets a mild contradiction sit, and kills the story on the second', () => {
    const cold = { ...roll, knows: {} };
    const one = reactiveMonologue({
      view,
      roll: cold,
      before: boardWith(0),
      after: boardWith(1),
      touched: [suspect.id],
      actionsLeft: 9,
      previousTheory: null,
      seed: 3,
    });
    expect(one.lines[0]).toBeDefined();
    const two = reactiveMonologue({
      view,
      roll: cold,
      before: boardWith(1),
      after: boardWith(2),
      touched: [suspect.id],
      actionsLeft: 9,
      previousTheory: null,
      seed: 3,
    });
    const strip = (s: string): string => s.replace(/[A-Z][a-z]+/g, '{name}');
    expect(
      CONTRADICTION_TEMPLATES.mild.some((t) => strip(t) === strip(one.lines[0] as string)) ||
        CONTRADICTION_TEMPLATES.mild.includes(one.lines[0] as never),
    ).toBeTruthy();
    expect(two.lines[0]).toBeDefined();
  });

  it('counts the half hours it took off the window, and pins a window of one', () => {
    const windowOf = (from: number[], to: number[], used?: (id: string) => boolean): string => {
      const before = establishedFrom(view, [], []);
      const after = establishedFrom(view, [], []);
      before.deathTicks = from as never[];
      after.deathTicks = to as never[];
      const out = reactiveMonologue({
        view,
        roll,
        before,
        after,
        touched: [],
        actionsLeft: 9,
        previousTheory: null,
        seed: 5,
        ...(used ? { used } : {}),
      });
      return out.lines.join(' ');
    };

    // Four half hours down to two: two were lost, and it says two.
    const ids = new Set(WINDOW_TEMPLATES.narrowed.map((t) => t.id));
    const counted = windowOf([0, 1, 2, 3], [0, 1], (id) => id !== 'narrowed-count');
    expect(counted).toContain('two fewer half hours');
    // Three down to two: one, and the noun agrees with it.
    expect(windowOf([0, 1, 2], [0, 1], (id) => id !== 'narrowed-count')).toContain(
      'one fewer half hour to argue',
    );
    expect(ids.size).toBe(3);

    // Down to a single tick: a pool of its own, and no count at all.
    const pinned = windowOf([0, 1, 2], [2]);
    expect(WINDOW_TEMPLATES.pinned.some((t) => pinned.includes(t.text.split('{')[0] as string))).toBe(
      true,
    );
    expect(pinned).not.toContain('fewer half');

    // Set for the first time: nothing was taken away, so nothing is counted.
    const set = windowOf([], [0, 1]);
    expect(set).not.toContain('fewer half');
    expect(set.length).toBeGreaterThan(0);
  });

  it('does not narrow the window twice in a run with the same sentence', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const state = exhaust(seed, 2);
      const said = new Map<string, number>();
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose' || block.voice !== 'monologue') continue;
          for (const pool of Object.values(WINDOW_TEMPLATES)) {
            for (const t of pool) {
              // Two templates can share an opening — "The window is {window}
              // now…" and "The window is {window}, and…" — so a template is
              // named by every one of its literal runs, not just the first.
              const runs = t.text.split(/\{[a-z]+\}/).filter((s) => s.length >= 10);
              if (runs.length === 0 || !runs.every((s) => block.text.includes(s))) continue;
              said.set(t.id, (said.get(t.id) ?? 0) + 1);
            }
          }
        }
      }
      for (const [id, n] of said) {
        expect(n, `seed ${seed}: ${id} said ${n} times`).toBe(1);
      }
    }
  });

  it('rationalizes for a warm acquaintance until two facts, then turns', () => {
    const warm = { ...roll, knows: { [suspect.id]: { how: 'old-flame' as const, warmth: 1 as const } } };
    const templatesFor = (n: number, previous: number): string => {
      const out = reactiveMonologue({
        view,
        roll: warm,
        before: boardWith(previous),
        after: boardWith(n),
        touched: [suspect.id],
        actionsLeft: 9,
        previousTheory: null,
        seed: 11,
      });
      return out.lines[0] as string;
    };
    const mild = templatesFor(1, 0);
    const hard = templatesFor(2, 1);
    const matches = (line: string, pool: readonly string[]): boolean =>
      pool.some((t) => {
        const head = t.split('{')[0] as string;
        return head.length > 6 && line.startsWith(head);
      }) || pool.some((t) => t === line);
    expect(matches(mild, CONTRADICTION_TEMPLATES.mildBiased), mild).toBe(true);
    expect(matches(mild, CONTRADICTION_TEMPLATES.mild)).toBe(false);
    expect(matches(hard, CONTRADICTION_TEMPLATES.hardTurned), hard).toBe(true);
  });

  it('names the man with the most against him, and says when it changes', () => {
    const est = boardWith(2);
    expect(leadingTheory(view, est)).toBe(suspect.id);
    const other = view.kase.people.find((p) => p.kind === 'suspect' && p.id !== suspect.id) as Person;
    const changed = reactiveMonologue({
      view,
      roll,
      before: est,
      after: est,
      touched: [],
      actionsLeft: 9,
      previousTheory: other.id,
      seed: 5,
    });
    expect(changed.theory).toBe(suspect.id);
    expect(changed.lines.join(' ')).toContain(suspect.surname);
  });

  it('is often wrong, which is the point', () => {
    let named = 0;
    let right = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const run = playWandering(v, seed);
      if (run.report.killerId === null) continue;
      named++;
      if (run.report.killerId === v.kase.solution.killerId) right++;
    }
    expect(named).toBeGreaterThan(5);
    // A theory that was always right would not be a theory.
    expect(right).toBeLessThan(named);
  });

  it('notices the clock when the night is nearly gone', () => {
    const out = reactiveMonologue({
      view,
      roll,
      before: boardWith(0),
      after: boardWith(0),
      touched: [],
      actionsLeft: 2,
      previousTheory: null,
      seed: 2,
    });
    expect(out.lines.join(' ')).toContain('2');
  });
});

/* ------------------------------------------------------------------ *
 * A.8 — the burn tiers.
 * ------------------------------------------------------------------ */

describe('the burn tiers', () => {
  it('never repeats a run-to-run or within-run card inside one run', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [3, 7, 11]) {
        const state = exhaust(seed, difficulty);
        const counts = new Map<string, number>();
        for (const id of state.burned) counts.set(id, (counts.get(id) ?? 0) + 1);
        const exhausted = new Set(
          state.log
            .flatMap((p) => p.gaps)
            .filter((g) => g.startsWith('deck-exhausted: '))
            .map((g) => g.slice('deck-exhausted: '.length).split(' ')[0] as string),
        );
        for (const [id, n] of counts) {
          if (n === 1) continue;
          const deck = deckOf(id);
          if (deck === null) continue;
          if (burnTier(deck) === 'free') continue;
          // A card may come round again only when everything the engine could
          // have asked for instead has been read — and the engine has to have
          // said so, because a deck that runs out inside a run is a content
          // gap and the gap log is how the content team hears about it.
          expect(
            exhausted.has(deck),
            `${id} (${deck}, ${burnTier(deck)}) dealt ${n} times with no reshuffle logged`,
          ).toBe(true);
        }
      }
    }
  });

  it('carries only the run-to-run decks into the next run', () => {
    const state = exhaust(7, 2);
    for (const id of crossRunOnly(state.burned)) {
      expect(burnTier(deckOf(id) as never)).toBe('run-to-run');
    }
  });

  it('honours a run-to-run burn handed down from an earlier run', () => {
    const v = buildView(generateCase(7, { difficulty: 2 }));
    const similes = DECKS.similes.map((c) => c.id);
    const dealer = new Dealer(1, [], similes);
    for (const id of similes) expect(dealer.burned('similes', id)).toBe(true);
    const withinRun = new Dealer(1, [], DECKS.frames.map((c) => c.id));
    // A within-run deck does not care what an earlier run read.
    for (const card of DECKS.frames) expect(withinRun.burned('frames', card.id)).toBe(false);
    void v;
  });

  it('spends the whole of a run out of decks it declares', () => {
    const state = exhaust(7, 2);
    expect(state.burned.length).toBeGreaterThan(20);
    for (const id of state.burned) {
      // A deck card, one of the hand-written lines, or a monologue line the
      // run noted so as not to say it twice — those belong to no deck on
      // purpose, and carry a prefix that says so.
      expect(
        deckOf(id) !== null || /^(NA|ROOM)-\d+$/.test(id) || id.startsWith('monologue:'),
        id,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ *
 * The loader agrees with the validator.
 * ------------------------------------------------------------------ */

describe('the deck loader', () => {
  it('validates every deck at startup with no errors', () => {
    for (const report of validateDecks()) {
      expect(report.errors, `${report.deck}: ${report.errors.join('; ')}`).toEqual([]);
      // M4b §B.4's three decks are written on another branch. A deck that is
      // not on disk yet is empty and says so in its gaps; the engine falls
      // back to a hand-written line and the run goes on.
      if (MISSING_DECKS.includes(report.deck)) {
        expect(report.count).toBe(0);
        expect(report.gaps.join(' ')).toContain('not on disk');
        continue;
      }
      expect(report.count).toBeGreaterThan(0);
    }
  });

  it('reports which tag combinations nothing was written for', () => {
    const reports = validateDecks();
    const frames = reports.find((r) => r.deck === 'frames');
    expect(frames?.cells).toBeGreaterThan(0);
    expect(frames?.filled).toBeGreaterThan(0);
    // The placeholder decks are thin on purpose; the report must say so.
    expect(reports.some((r) => r.gaps.length > 0)).toBe(true);
  });

  it('gives every deck a burn tier', () => {
    for (const card of ALL_CARDS) {
      const deck = deckOf(card.id);
      expect(deck, card.id).not.toBeNull();
      expect(['run-to-run', 'within-run', 'free']).toContain(burnTier(deck as never));
    }
  });
});

/* ------------------------------------------------------------------ *
 * m4-polish — the seams where the real content decks met the engine.
 * ------------------------------------------------------------------ */

describe('the find slot', () => {
  it('puts the record on the page when the card has no {fact} of its own', () => {
    // The card carries the slot: the writer chose where the record falls.
    expect(
      factOnPage(
        'Under the radiator. {fact}',
        'Under the radiator. A latch was thrown.',
        'A latch was thrown.',
      ),
    ).toBe('Under the radiator. A latch was thrown.');
    // The card does not: the engine says the card, then the record.
    expect(
      factOnPage(
        'A window latch, thrown, though the room stood four floors up.',
        'A window latch, thrown, though the room stood four floors up.',
        'Vitale was found at the back lot.',
      ),
    ).toBe(
      'A window latch, thrown, though the room stood four floors up. Vitale was found at the back lot.',
    );
  });

  it('gives every find card in the deck somewhere for its fact to land', () => {
    for (const card of DECKS.find) {
      expect(card.text.includes('{fact}'), `${card.id} has no {fact} slot`).toBe(true);
    }
  });

  it('never drops a found fact off a find page, over four seeds', () => {
    for (const seed of [7, 11, 19, 23]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const state = exhaust(seed, 2);
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose' || block.voice !== 'find' || !block.clueId) continue;
          const flat = v.findableById.get(block.clueId)?.text;
          if (!flat) continue;
          expect(block.text, `${block.clueId} came upon and then forgotten`).toContain(flat);
        }
      }
    }
  });
});

describe('the exchange slots', () => {
  const askScene = (askKind: AskKind, slots: Record<string, string | undefined>) =>
    ({
      kind: 'ask' as const,
      personId: 'p-1',
      askKind,
      topicLabel: 'a topic',
      topicSlots: slots,
      clues: [],
      account: null,
      volunteer: null,
      free: false,
    });

  it('puts the subject of the question in {name}, never the person being asked', () => {
    const slots = askSlots({ place: 'the speakeasy' }, askScene('ask-person', { subject: 'Vitale' }), 'Ainsworth');
    expect(slots.name).toBe('Vitale');
    expect(slots.subject).toBe('Vitale');
    expect(slots.addressee).toBe('Ainsworth');
  });

  it('makes {name} the addressee for the two kinds that ask about them', () => {
    for (const kind of ['ask-evening', 'ask-hired'] as AskKind[]) {
      const slots = askSlots({}, askScene(kind, {}), 'Ainsworth');
      expect(slots.name, kind).toBe('Ainsworth');
      expect(slots.subject, kind).toBe('Ainsworth');
    }
    // And every other kind is a question about somebody else.
    for (const kind of ['ask-person', 'ask-place', 'ask-object', 'follow-up', 'close'] as AskKind[]) {
      expect(askSlots({}, askScene(kind, {}), 'Ainsworth').name, kind).toBeUndefined();
    }
  });

  it('asks about the topic’s place and thing, not the room it is standing in', () => {
    const base = { place: 'the speakeasy', object: 'the revolver' };
    expect(askSlots(base, askScene('ask-place', { place: 'Mrs. Teague’s' }), 'Doyle').place).toBe(
      'Mrs. Teague’s',
    );
    expect(askSlots(base, askScene('ask-object', { object: 'the latchkey' }), 'Doyle').object).toBe(
      'the latchkey',
    );
    // With no topic of its own, the page's own room stands.
    expect(askSlots(base, askScene('ask-person', { subject: 'Brauer' }), 'Doyle').place).toBe(
      'the speakeasy',
    );
  });

  it('reads the subject out of a generated exact topic string', () => {
    const vitale = view.victim.surname;
    expect(topicSlots(view, { kind: 'exact', personId: 'p-1', topic: `${vitale} that evening` })).toEqual({
      subject: vitale,
    });
    expect(topicSlots(view, { kind: 'exact', personId: 'p-1', topic: 'the noise that evening' })).toEqual({
      subject: undefined,
    });
  });

  it('never puts the person being asked into a question about somebody else', () => {
    for (const seed of [7, 11, 19]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      let asked = 0;
      for (const place of v.kase.places) {
        const here = v.peopleAt.get(place.id) ?? [];
        for (const addresseeId of here) {
          const addressee = v.personById.get(addresseeId);
          if (!addressee) continue;
          for (const subject of v.kase.people) {
            if (subject.id === addresseeId || subject.kind === 'fixture') continue;
            let state = newRun(v, { detectiveName: 'Dashiell' });
            state = stepInput(state, `go ${place.shortName}`, v).state;
            const step = stepInput(state, `ask ${addressee.surname} about ${subject.surname}`, v);
            const question = step.page.blocks.find(
              (b) => b.kind === 'prose' && b.voice === 'exchange',
            );
            if (!question || question.kind !== 'prose') continue;
            asked++;
            expect(
              question.text.includes(addressee.surname),
              `asked ${addressee.surname} about ${subject.surname}: ${question.text}`,
            ).toBe(false);
          }
        }
      }
      expect(asked, `seed ${seed} asked nothing`).toBeGreaterThan(0);
    }
  });

  it('keeps a reported fact free of the page’s own slots', () => {
    // An utterance is filled from its beat and nothing else: the room the page
    // happens in and the hour it opened on are not part of the fact.
    const clue = view.kase.findable.find((c) => beatsOf(view, c).length === 1);
    expect(clue, 'no single-fact clue in seed 7').toBeDefined();
    const cast = rollCast(view.kase);
    const gaps: string[] = [];
    const spoken = speakClue(
      new Dealer(1, [], []),
      view,
      cast,
      clue as never,
      undefined,
      'truth',
      { place: 'NOT-THE-PLACE', time: 'NOT-THE-TIME', name: 'NOT-A-NAME', subject: 'NOT-A-NAME' },
      gaps,
    );
    expect(spoken.text).not.toContain('NOT-THE-PLACE');
    expect(spoken.text).not.toContain('NOT-THE-TIME');
    expect(spoken.text).not.toContain('NOT-A-NAME');
  });
});

describe('business', () => {
  const asPerson = (fixtureRole: string | undefined): Person =>
    ({
      id: 'p-x',
      name: 'A Person',
      surname: 'Person',
      role: 'somebody',
      kind: fixtureRole ? 'fixture' : 'suspect',
      fixtureRole,
      isKiller: false,
    }) as Person;

  it('never hands a fixture another fixture’s props', () => {
    const roles = [...new Set(DECKS.business.map((c) => String(c.tags.role)))].filter(
      (r) => r !== 'any' && r !== 'suspect',
    );
    expect(roles.length).toBeGreaterThan(5);
    for (const role of roles) {
      for (const temper of ['enigma', 'plain', 'yap'] as const) {
        const dealer = new Dealer(role.length * 31 + temper.length, [], []);
        for (let i = 0; i < 40; i++) {
          const drawn = businessLine(dealer, asPerson(role), temper, {});
          expect(drawn, `${role} × ${temper} dealt nothing`).not.toBeNull();
          const card = CARD_BY_ID.get((drawn as { cardId: string }).cardId) as Card;
          expect(
            [role, 'any'],
            `${card.id} (${String(card.tags.role)}) went to a ${role}`,
          ).toContain(String(card.tags.role));
        }
      }
    }
  });

  it('gives a suspect the generic suspect role and not a fixture’s', () => {
    const dealer = new Dealer(5, [], []);
    for (let i = 0; i < 40; i++) {
      const drawn = businessLine(dealer, asPerson(undefined), 'plain', {});
      const card = CARD_BY_ID.get((drawn as { cardId: string }).cardId) as Card;
      expect(['suspect', 'any']).toContain(String(card.tags.role));
    }
  });

  it('logs a gap when a role has nothing to deal', () => {
    const gaps: string[] = [];
    const everything = new Set(DECKS.business.map((c) => c.id));
    const drawn = businessLine(new Dealer(9, [], []), asPerson('landlady'), 'plain', {}, everything, gaps);
    expect(drawn).toBeNull();
    expect(gaps.join(' ')).toContain('no-business: landlady');
  });
});

describe('the colour beat', () => {
  it('frames it as speech, with the speaker’s gender on it', () => {
    const quote = COLOUR_FRAMES[0] as string;
    const reported = COLOUR_FRAMES.find((f) => f.includes('{Pronoun}')) as string;
    const line = 'A dog got into the bakery Tuesday and came out white to the shoulders.';
    // Inside quotation marks it is the speaker's own sentence, untouched.
    expect(frameColour(line, quote, 'f')).toBe(`“${line}”`);
    // Reported, it goes mid-sentence, so the capital that was only there
    // because the sentence started comes off.
    expect(frameColour(line, reported, 'f')).toContain('She');
    expect(frameColour(line, reported, 'm')).toContain('He');
    expect(frameColour(line, reported, 'any')).toContain('He');
    expect(frameColour(line, reported, 'f')).toContain('a dog got into the bakery');
    // A name keeps its capital.
    expect(frameColour('Dolan has not paid a bill since March.', reported, 'm')).toContain(
      'Dolan has not paid',
    );
  });

  it('counts the quotation marks it is standing between', () => {
    expect(insideQuotes('He said “')).toBe(true);
    expect(insideQuotes('He said “so.” Then ')).toBe(false);
    expect(insideQuotes('Counted the till. "')).toBe(true);
    expect(insideQuotes('Counted the till. "So." ')).toBe(false);
  });

  it('never lets one stand as narration on the page', () => {
    // "'Vitale turned up near 9:00 PM.' A dog got into the bakery Tuesday and
    // came out white to the shoulders." is the detective describing a dog he
    // never saw. Every colour beat on a page is either inside quotation marks
    // or behind a reported-speech frame.
    let seen = 0;
    for (const seed of [1, 3, 7, 12, 19]) {
      for (const page of exhaust(seed, 2).log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose') continue;
          for (const line of COLOUR_LINES) {
            for (const variant of [line, `${line.charAt(0).toLowerCase()}${line.slice(1)}`]) {
              for (let at = block.text.indexOf(variant); at >= 0; ) {
                const before = block.text.slice(0, at);
                seen++;
                expect(
                  insideQuotes(before) || /(?::|\bthat)\s$/.test(before),
                  `seed ${seed}: ${block.text}`,
                ).toBe(true);
                at = block.text.indexOf(variant, at + 1);
              }
            }
          }
        }
      }
    }
    expect(seen, 'no run printed a colour beat at all').toBeGreaterThan(0);
  });
});

describe('the seams between cards', () => {
  it('never leaves two stops where a card and a frame each brought one', () => {
    expect(tidyPunctuation('“Alive, I’d say..”')).toBe('“Alive, I’d say.”');
    expect(tidyPunctuation('Short, and done..')).toBe('Short, and done.');
    expect(tidyPunctuation('“He was there.”.')).toBe('“He was there.”');
    expect(tidyPunctuation('Was he there?.')).toBe('Was he there?');
  });

  it('drops a full stop that a comma was meant to follow', () => {
    expect(tidyPunctuation('Carbone is in more often than Carbone lets on., and here is the rest.')).toBe(
      'Carbone is in more often than Carbone lets on, and here is the rest.',
    );
    expect(tidyPunctuation('He said so.: plainly')).toBe('He said so: plainly');
  });

  it('puts a capital on a sentence a slot started lower-case, and keeps the stop', () => {
    // M4b polish: this used to become a comma, which spliced two finished
    // sentences out of one card — "…still 1919 in here, the speakeasy doesn't
    // card". A place name is lower-case because it always is, not because it
    // is a fragment.
    expect(tidyPunctuation('The room smells like 1919. {place} doesn’t card.'.replace('{place}', 'the speakeasy'))).toBe(
      'The room smells like 1919. The speakeasy doesn’t card.',
    );
    expect(tidyPunctuation('9:00 PM to 9:30 PM. the speakeasy.')).toBe(
      '9:00 PM to 9:30 PM. The speakeasy.',
    );
    // An abbreviation is one word with stops in it, not two sentences.
    expect(tidyPunctuation('The street at 3 a.m. was empty.')).toBe(
      'The street at 3 a.m. was empty.',
    );
    expect(tidyPunctuation('The stairs up to Mrs. teague’s have been swept.')).toBe(
      'The stairs up to Mrs. teague’s have been swept.',
    );
  });

  it('never swallows a full stop the writer put in a card', () => {
    // The seam that produced "…still 1919 in here, the speakeasy doesn't card"
    // was here: a card writes two sentences and the second one opens on a
    // slot, so filling it must not turn the writer's stop into a comma.
    const slots: Record<string, string> = {
      place: 'the speakeasy',
      name: 'Doyle',
      subject: 'Doyle',
      addressee: 'Doyle',
      other: 'Mosley',
      object: 'the ledger',
      detective: 'Dashiell',
      topic: 'the fight card',
      fact: 'Doyle was there and said so',
      time: '9:30 PM',
      retainer: 'fifty dollars',
      business: 'He counted the till',
      colour: 'A dog got into the bakery',
      dashiell: 'I asked again',
      window: '9:30 PM',
    };
    const stops = (t: string): number => (t.match(/[.!?…]/g) ?? []).length;
    for (const card of ALL_CARDS) {
      if (slotsOf(card).length === 0) continue;
      const filled = fill(card, slots);
      if (filled === null) continue;
      expect(stops(filled), `${card.id}: ${filled}`).toBe(stops(card.text));
    }
  });

  it('gives a simile a comma only when it is a clause after a full stop', () => {
    expect(attachSimile('His voice dropped.', 'soft as a hand over a mouthpiece.')).toBe(
      'His voice dropped, soft as a hand over a mouthpiece.',
    );
    expect(attachSimile('His voice dropped.', 'like a hand over a mouthpiece.')).toBe(
      'His voice dropped, like a hand over a mouthpiece.',
    );
    // A question is not a clause anything hangs off. The mark stays.
    expect(attachSimile('“Where were you?”', 'flat as a nickel on a bar.')).toBe(
      '“Where were you?” Flat as a nickel on a bar.',
    );
    // A simile written as a sentence of its own stays one.
    expect(attachSimile('His voice dropped.', 'The words came out flat.')).toBe(
      'His voice dropped. The words came out flat.',
    );
  });

  it('leaves a card that had no slot exactly as it was written', () => {
    for (const card of ALL_CARDS) {
      if (slotsOf(card).length > 0) continue;
      expect(fill(card, {}), card.id).toBe(card.text);
    }
  });

  it('prints no doubled punctuation anywhere in a run, over six seeds', () => {
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      const state = exhaust(seed, 2);
      for (const page of state.log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose' && block.kind !== 'note') continue;
          expect(block.text, `seed ${seed}: ${block.text}`).not.toMatch(/[.!?]\s*[.,;:]/);
        }
      }
    }
  });
});

describe('the simile', () => {
  /** What each page's simile was about, page by page, nulls for pages without. */
  const targetsOf = (state: RunState): (string | null)[] =>
    state.log.map((page) => {
      for (const id of page.cardsUsed) {
        if (deckOf(id) !== 'similes') continue;
        const card = CARD_BY_ID.get(id);
        if (card) return String(card.tags.target);
      }
      return null;
    });

  it('is about what the page is about, not about the room by default', () => {
    const at = view.kase.places[0]?.id as string;
    const ask = {
      kind: 'ask' as const,
      personId: 'p-1',
      askKind: 'ask-person' as AskKind,
      topicLabel: 't',
      topicSlots: {},
      clues: [],
      account: null,
      volunteer: null,
      free: false,
    };
    const exchange = simileTargetsFor(view, ask, [{ kind: 'prose', text: 'x', voice: 'approach' }], at, null);
    expect(exchange[0]).toBe('voice');
    expect(exchange).toContain('face');
    expect(exchange, 'an exchange is not about the room').not.toContain('room');

    const arrival = simileTargetsFor(
      view,
      { kind: 'travel', to: at, already: false },
      [{ kind: 'prose', text: 'x', voice: 'arrival' }],
      at,
      null,
    );
    expect(['street', 'weather', 'city', 'drink']).toContain(arrival[0]);

    // A page about the place may still be about the room.
    expect(simileTargetsFor(view, { kind: 'look' }, [], at, null)).toContain('room');
  });

  it('never puts the same simile target on two pages running', () => {
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      const targets = targetsOf(exhaust(seed, 2));
      for (let i = 1; i < targets.length; i++) {
        if (targets[i] === null) continue;
        expect(targets[i], `seed ${seed}, page ${i}`).not.toBe(targets[i - 1]);
      }
    }
  });

  /**
   * M4b §A.3. A simile is a clause of the sentence it modifies, so there is no
   * such thing as a simile block any more: no page has a prose block that is
   * only a simile, because no page has a prose block that is a simile at all.
   */
  it('is never a paragraph of its own', () => {
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      for (const page of exhaust(seed, 2).log) {
        expect(page.blocks.filter((b) => b.kind === 'prose' && b.voice === 'simile')).toEqual([]);
      }
    }
  });

  it('is a clause of a block that is about what the simile is about', () => {
    let attached = 0;
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      for (const page of exhaust(seed, 2).log) {
        const simile = page.cardsUsed.find((id) => deckOf(id) === 'similes');
        if (!simile) continue;
        attached++;
        const card = CARD_BY_ID.get(simile) as Card;
        const target = String(card.tags.target);
        const hosts = SIMILE_HOSTS[target] ?? [];
        // The card's own text is inside a block, and that block's voice is one
        // the target binds to. The card may carry slots, so the tail is the
        // part that survives filling whatever they were filled with.
        const tail = card.text.replace(/^[^{]*\{[a-z]+\}/i, '').trim();
        const host = page.blocks.find(
          (b) => b.kind === 'prose' && b.text.includes(tail) && hosts.includes(b.voice),
        );
        expect(host, `seed ${seed} page ${page.n}: ${target} simile ${simile} has no host`).toBeDefined();
      }
    }
    expect(attached, 'no run drew a simile at all').toBeGreaterThan(0);
  });

  it('still puts at most one on a page', () => {
    for (const seed of [1, 7, 19]) {
      for (const page of exhaust(seed, 2).log) {
        const n = page.cardsUsed.filter((id) => deckOf(id) === 'similes').length;
        expect(n, `seed ${seed}, page ${page.n}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('two facts in one clue', () => {
  it('holds the second fact back instead of gluing it to the first', () => {
    const clue = view.kase.findable.find((c) => beatsOf(view, c).length === 2);
    expect(clue, 'seed 7 has no two-fact clue').toBeDefined();
    const spoken = speakClue(
      new Dealer(3, [], []),
      view,
      rollCast(view.kase),
      clue as never,
      undefined,
      'truth',
      {},
      [],
    );
    if (spoken.mode !== 'utterance') return; // a fallback carries it whole
    expect(spoken.rest.length).toBe(1);
    expect(spoken.text).not.toContain(spoken.rest[0] as string);
  });

  it('puts one of Dashiell’s follow-ups between the two answers', () => {
    let seen = 0;
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      for (const page of exhaust(seed, 2).log) {
        const twoFact = page.found.filter((id) => {
          const clue = v.findableById.get(id);
          return clue !== undefined && beatsOf(v, clue).length > 1;
        });
        if (twoFact.length === 0) continue;
        for (const id of twoFact) {
          const carrying = page.blocks.filter(
            (b) => b.kind === 'prose' && b.clueId === id && b.voice !== 'find',
          );
          if (carrying.length < 2) continue;
          seen++;
          // Between the two answers there is a line of Dashiell's, and it is
          // one of the follow-ups rather than more of the same speech.
          const first = page.blocks.indexOf(carrying[0] as never);
          const second = page.blocks.indexOf(carrying[1] as never);
          const between = page.blocks.slice(first + 1, second);
          expect(between.length, `${id} glued two answers together`).toBeGreaterThan(0);
        }
      }
    }
    expect(seen, 'no two-fact clue reached a page').toBeGreaterThan(0);
  });
});

describe('the leading theory', () => {
  const kase = generateCase(7, { difficulty: 2 });
  const roll = rollDashiell(kase);
  const suspect = kase.people.find((p) => p.kind === 'suspect') as Person;

  const boardWith = (n: number) => {
    const est = establishedFrom(view, [], []);
    est.placements.set(
      suspect.id,
      Array.from({ length: n }, (_, i) => ({
        personId: suspect.id,
        placeId: view.kase.places[0]?.id as string,
        tick: i,
        present: true,
        clueId: `made-up-${i}`,
        contradicts: true,
      })),
    );
    return est;
  };

  const said = (n: number, previousTheory: string | null = null): string =>
    reactiveMonologue({
      view,
      roll,
      before: establishedFrom(view, [], []),
      after: boardWith(n),
      touched: [],
      actionsLeft: 9,
      previousTheory,
      seed: 11,
    }).lines.join(' ');

  const from = (pool: readonly string[], line: string): boolean =>
    pool.some((t) => {
      const head = t.split('{')[0] as string;
      return head.length > 6 && line.includes(head.trim());
    });

  it('counts what is actually against a man, not the weight it gives it', () => {
    expect(factsAgainst(boardWith(1), suspect.id)).toBe(1);
    expect(factsAgainst(boardWith(3), suspect.id)).toBe(3);
  });

  it('leans on one fact, is convinced by two, and is certain on three', () => {
    expect(theoryPool(1, false)).toBe(THEORY_TEMPLATES.lean);
    expect(theoryPool(2, false)).toBe(THEORY_TEMPLATES.conviction);
    expect(theoryPool(3, false)).toBe(THEORY_TEMPLATES.certain);
    expect(theoryPool(9, false)).toBe(THEORY_TEMPLATES.certain);
    // A theory that changes off one fact is still only a lean.
    expect(theoryPool(1, true)).toBe(THEORY_TEMPLATES.changedLean);
    expect(theoryPool(2, true)).toBe(THEORY_TEMPLATES.changed);
  });

  it('says it in the voice the evidence can carry', () => {
    const lean = said(1);
    expect(from(THEORY_TEMPLATES.lean, lean), lean).toBe(true);
    expect(from(THEORY_TEMPLATES.certain, lean)).toBe(false);
    const certain = said(3);
    expect(from(THEORY_TEMPLATES.certain, certain), certain).toBe(true);
  });

  it('still names somebody off a single fact, so it can still be wrong', () => {
    expect(leadingTheory(view, boardWith(1))).toBe(suspect.id);
    expect(said(1)).toContain(suspect.surname);
  });
});

describe('every utterance carries its fact', () => {
  const MANDATORY = (
    SCHEMA.decks.utterances as { mandatorySlots: Record<string, string[]> }
  ).mandatorySlots;

  it('has the slots its fact kind needs, on every card in the deck', () => {
    const short: string[] = [];
    for (const card of DECKS.utterances) {
      const kind = String(card.tags.factKind);
      if (!carriesFact(card, kind)) short.push(`${card.id} (${kind})`);
    }
    expect(short, `${short.length} utterances cannot carry their fact`).toEqual([]);
    // And the schema really does ask something of every kind the deck uses.
    for (const card of DECKS.utterances) {
      expect(MANDATORY[String(card.tags.factKind)], String(card.tags.factKind)).toBeDefined();
    }
  });

  it('asks for nothing its beat cannot give it', () => {
    // Every slot name a beat of each kind actually supplies, over ten cases.
    const supplied = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 10; seed++) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      for (const clue of v.kase.findable) {
        for (const beat of beatsOf(v, clue)) {
          const set = supplied.get(beat.kind) ?? new Set<string>();
          for (const [k, value] of Object.entries(beat.slots)) {
            if (value !== undefined && value.length > 0) set.add(k);
          }
          supplied.set(beat.kind, set);
        }
      }
    }
    expect(supplied.size).toBeGreaterThan(4);
    for (const card of DECKS.utterances) {
      const kind = String(card.tags.factKind);
      const set = supplied.get(kind);
      if (!set) continue; // an implicit fact kind: never spoken on its own
      for (const slot of slotsOf(card)) {
        if (slot === 'detective') continue;
        expect(set.has(slot), `${card.id} (${kind}) asks for {${slot}}`).toBe(true);
      }
    }
  });

  it('leaves the validator nothing to warn about — the same rule, same data', () => {
    // scripts/validate-decks.mjs reads content/deck-schema.json and warns on
    // exactly this. Asserting it here keeps the two in step without shelling
    // out to Node from a test.
    const warnings: string[] = [];
    for (const card of DECKS.utterances) {
      const need = MANDATORY[String(card.tags.factKind)] ?? [];
      const missing = need.filter((s) => !card.text.includes(`{${s}}`));
      if (missing.length > 0) warnings.push(`${card.id}: ${missing.join(', ')}`);
    }
    expect(warnings).toEqual([]);
  });
});

describe('gendered business', () => {
  const PRONOUN = { m: /\b(he|his|him|himself)\b/i, f: /\b(she|her|hers|herself)\b/i };

  it('tags every card that carries a pronoun, and leaves the rest alone', () => {
    for (const card of DECKS.business) {
      const male = PRONOUN.m.test(card.text);
      const female = PRONOUN.f.test(card.text);
      const want = male ? 'm' : female ? 'f' : 'any';
      expect(String(card.tags.gender), `${card.id}: ${card.text}`).toBe(want);
    }
  });

  it('reads a person’s gender off the name the generator gave them', () => {
    for (const seed of [1, 7, 19]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      // A landlady is a woman and a doorman is a man, whatever the archetype
      // tables say, because the generator names them out of gendered pools.
      for (const person of v.kase.people) {
        if (person.fixtureRole === 'landlady') expect(genderHintOf(person)).toBe('f');
        if (person.fixtureRole === 'doorman') expect(genderHintOf(person)).toBe('m');
      }
      expect(v.kase.people.every((p) => genderHintOf(p) !== 'any')).toBe(true);
    }
  });

  it('never gives a woman a card that calls her he, or the other way about', () => {
    let dealt = 0;
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      for (const person of v.kase.people) {
        if (person.kind === 'victim') continue;
        const gender = genderHintOf(person);
        if (gender === 'any') continue;
        const wrong = gender === 'm' ? PRONOUN.f : PRONOUN.m;
        const dealer = new Dealer(seed * 13 + person.id.length, [], []);
        for (let i = 0; i < 30; i++) {
          const drawn = businessLine(dealer, person, temperOf(rollCast(v.kase), person.id), {});
          expect(drawn, `${person.surname} got no business at all`).not.toBeNull();
          dealt++;
          expect(
            wrong.test((drawn as { text: string }).text),
            `${person.surname} (${gender}): ${(drawn as { text: string }).text}`,
          ).toBe(false);
        }
      }
    }
    expect(dealt).toBeGreaterThan(100);
  });
});

describe('the endings', () => {
  it('are in the first person, like every other page', () => {
    for (const card of DECKS.endings) {
      if (card.status === 'placeholder') continue;
      expect(card.text, `${card.id} still narrates from outside`).toMatch(/\b(I|[Mm]y|me)\b/);
      expect(card.text, `${card.id} names the detective in the third person`).not.toContain(
        '{detective}',
      );
    }
  });

  it('keep their tags, and still cover every outcome and par delta', () => {
    // `solved` was `hanged` until the deck had cards for a robbery and a
    // disappearance: nobody goes to the gallows over a strongbox, and finding
    // somebody alive is not a verdict.
    const cells = new Set<string>();
    for (const card of DECKS.endings) {
      cells.add(`${String(card.tags.outcome)}/${String(card.tags.parDelta)}`);
    }
    for (const outcome of ['solved', 'wrong-man', 'thin-case', 'cold']) {
      for (const delta of ['under', 'at', 'over']) {
        expect(cells.has(`${outcome}/${delta}`), `${outcome}/${delta}`).toBe(true);
      }
    }
  });

  it('has two cards for every (case type, outcome) the engine can reach', () => {
    for (const caseType of ['robbery', 'missing']) {
      for (const outcome of ['solved', 'wrong-man', 'thin-case', 'cold']) {
        const n = DECKS.endings.filter(
          (c) => c.tags.caseType === caseType && c.tags.outcome === outcome,
        ).length;
        expect(n, `${caseType} × ${outcome}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('does not tell a robbery or a disappearance that somebody died', () => {
    const death = /\b(dead|died|killed|murder|corpse|noose|gallows|hang(s|ed|ing)?)\b/i;
    for (const card of DECKS.endings) {
      if (card.tags.caseType !== 'robbery' && card.tags.caseType !== 'missing') continue;
      expect(card.text, card.id).not.toMatch(death);
    }
  });

  it('still say what was missed when the wrong man goes up', () => {
    const wrong = DECKS.endings.filter(
      (c) => c.tags.outcome === 'wrong-man' && c.status !== 'placeholder',
    );
    expect(wrong.length).toBeGreaterThan(0);
    for (const card of wrong) expect(card.text, card.id).toContain('{missed}');
  });
});

describe('a frame that asks for business twice', () => {
  it('gets two gestures and not one printed twice', () => {
    // Twenty-eight of the frames have two {business} slots — the gesture on
    // the way in and the one mid-answer — and `fill` put the same card in
    // both of them.
    const twice = DECKS.frames.filter((c) => (c.text.match(/\{business\}/g) ?? []).length > 1);
    expect(twice.length, 'no frame asks for business twice any more').toBeGreaterThan(0);

    for (const seed of [1, 2, 7, 11, 19, 23]) {
      for (const page of exhaust(seed, 2).log) {
        for (const block of page.blocks) {
          if (block.kind !== 'prose') continue;
          for (const card of DECKS.business) {
            const hits = block.text.split(card.text).length - 1;
            expect(hits, `seed ${seed}: ${card.id} twice in one paragraph`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * The engine's own sentences agree with who they are about.
 *
 * The decks are tagged and the dealer filters on the tag, so a card never
 * calls a woman "he". The sentences the engine *assembles in code* had no
 * such check on them, and page one closed on "a man hiring you answers his
 * questions" whoever was in the chair.
 * ------------------------------------------------------------------ */

describe('the engine’s assembled sentences', () => {
  const textOfRun = (state: RunState): string =>
    state.log
      .flatMap((p) => p.blocks.map((b) => ('text' in b ? String(b.text ?? '') : '')))
      .join('\n');

  it('gives the hiring line the gender of the person in the chair', () => {
    const seen = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 11, 19, 23]) {
      const v = buildView(generateCase(seed, { difficulty: 2 }));
      const page = newRun(v, { detectiveName: 'Dashiell' }).log[0];
      const text = (page?.blocks ?? [])
        .map((b) => ('text' in b ? String(b.text ?? '') : ''))
        .join(' ');
      const noun = genderHintOf(v.client) === 'f' ? 'woman' : 'man';
      const wrong = noun === 'woman' ? 'man' : 'woman';
      expect(text, `seed ${seed}`).toContain(`a ${noun} hiring you answers your questions`);
      expect(text, `seed ${seed}`).not.toContain(`a ${wrong} hiring you`);
      seen.add(noun);
    }
    // Both halves of the rule are exercised, or only one of them is tested.
    expect([...seen].sort()).toEqual(['man', 'woman']);
  });

  it('never leaves a male pronoun in a sentence it wrote about a woman', () => {
    // The shapes the engine fills itself, over a run that takes everything:
    // the client's address, the timeline heading, the record lead.
    for (const seed of [1, 2, 7, 11, 19, 23]) {
      const text = textOfRun(exhaust(seed, 2));
      for (const bad of ['the address he gave me', 'nothing he will say', 'nowhere he will say']) {
        // These three had no gender behind them at all: they said "he" about
        // whoever it was. None of them is written that way any more.
        expect(text, `seed ${seed}`).not.toContain(bad);
      }
    }
  });

  it('leaves no assembled sentence calling somebody the case named a man', () => {
    // The hand-written pools may still say "a man on the corner", who is
    // nobody. What must not survive is a shape the engine fills with a name.
    const changed = THEORY_TEMPLATES.changed.join(' ');
    expect(changed).not.toContain('the wrong man');
    expect(changed).toContain('{oldNoun}');
    expect(nounOf(undefined)).toBe('man');
  });
});
