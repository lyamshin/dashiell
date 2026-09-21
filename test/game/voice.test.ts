import { describe, expect, it } from 'vitest';
import { generateCase, type Difficulty } from '../../src/gen/index.js';
import { ALL_CARDS, SIMILE_DECK, fill, slotsOf, type Card } from '../../src/game/decks.js';
import { buildView, segmentNouns } from '../../src/game/derive.js';
import { newRun, stepInput } from '../../src/game/reducer.js';
import { Voice, voiceRoleOf } from '../../src/game/voice.js';
import type { RunState } from '../../src/game/types.js';

const view = buildView(generateCase(7, { difficulty: 2 }));
const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));

/** Walk a whole case, taking everything there is to take. */
function exhaust(seed: number, difficulty: Difficulty): RunState {
  const v = buildView(generateCase(seed, { difficulty }));
  let state = newRun(v, { detectiveName: 'Humphrey' });
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

describe('the decks', () => {
  it('never deals the same card twice in a run', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [3, 7, 11]) {
        const state = exhaust(seed, difficulty);
        const counts = new Map<string, number>();
        for (const id of state.burned) counts.set(id, (counts.get(id) ?? 0) + 1);
        const repeats = [...counts].filter(([, n]) => n > 1);
        // A card may come round again only once its own deck is exhausted.
        for (const [id, n] of repeats) {
          const card = CARD_BY_ID.get(id);
          const deckSize = card ? ALL_CARDS.filter((c) => c.deck === card.deck).length : 0;
          expect(
            state.burned.filter((x) => CARD_BY_ID.get(x)?.deck === card?.deck).length,
            `${id} dealt ${n} times before its deck ran out`,
          ).toBeGreaterThanOrEqual(deckSize);
        }
      }
    }
  });

  it('spends the whole of a run’s prose out of the decks it declares', () => {
    const state = exhaust(7, 2);
    expect(state.burned.length).toBeGreaterThan(10);
    for (const id of state.burned) {
      expect(id).toMatch(/^(PLACE|WIT|SIM|NA|ROOM)-\d+$/);
    }
  });

  it('skips a card whose slots cannot be filled rather than printing a hole', () => {
    const withName = SIMILE_DECK.find((c) => slotsOf(c).includes('name')) as Card;
    expect(fill(withName, {})).toBeNull();
    expect(fill(withName, { name: '' })).toBeNull();
    expect(fill(withName, { name: 'Brauer' })).toContain('Brauer');

    const voice = new Voice(view, 'Humphrey', [], 1);
    // Every target, with no slots offered at all: whatever comes back is
    // slotless, because the rest were skipped.
    for (let i = 0; i < 20; i++) {
      const drawn = voice.simile(['face', 'voice', 'room'], {});
      if (!drawn) break;
      expect(drawn.text).not.toMatch(/\{[a-z]+\}/);
    }
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

  it('shows off at most once a run', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [2, 7, 19]) {
        const state = exhaust(seed, difficulty);
        const loud = state.burned.filter((id) => {
          const card = CARD_BY_ID.get(id);
          return card?.deck === 'simile' && card.tags.intensity === 3;
        });
        expect(loud.length, `d${difficulty} seed ${seed}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('puts at most one simile on a page', () => {
    const state = exhaust(7, 2);
    for (const page of state.log) {
      const similes = page.cardsUsed.filter((id) => CARD_BY_ID.get(id)?.deck === 'simile');
      expect(similes.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('the clue is never rewritten', () => {
  it('renders every clue text verbatim, in every case it renders', () => {
    for (const difficulty of [1, 2, 3] as Difficulty[]) {
      for (const seed of [1, 7, 13]) {
        const v = buildView(generateCase(seed, { difficulty }));
        const state = exhaust(seed, difficulty);
        let printed = 0;
        for (const page of state.log) {
          for (const block of page.blocks) {
            if (block.kind !== 'clue') continue;
            printed++;
            expect(block.text).toBe(v.findableById.get(block.clueId)?.text);
          }
        }
        // And it renders essentially everything there is.
        expect(printed).toBeGreaterThan(v.kase.findable.length - 4);
      }
    }
  });

  it('segments a clue back into exactly the string it came from', () => {
    for (const clue of view.kase.findable) {
      const segments = segmentNouns(clue.text, view);
      expect(segments.map((s) => s.text).join('')).toBe(clue.text);
    }
  });

  it('finds the people, rooms and things in a clue to underline', () => {
    const clue = view.kase.findable.find((c) => c.kind === 'observation');
    const segments = segmentNouns(clue?.text ?? '', view);
    expect(segments.some((s) => s.noun?.kind === 'person')).toBe(true);
    expect(segments.some((s) => s.noun?.kind === 'place')).toBe(true);
  });
});

describe('who speaks in which voice', () => {
  it('gives a fixture its own post and a suspect the nearest archetype', () => {
    for (const person of view.kase.people) {
      if (person.kind === 'victim') continue;
      const role = voiceRoleOf(person);
      if (person.fixtureRole) expect(role).toBe(person.fixtureRole);
      else expect(['business-partner', 'neighbor', 'relative', 'secretary']).toContain(role);
    }
  });

  it('has a witness card for every voice it can ask for', () => {
    const voice = new Voice(view, 'Humphrey', [], 3);
    for (const person of view.kase.people) {
      if (person.kind === 'victim') continue;
      for (const register of ['truth', 'lie', 'evasion'] as const) {
        const drawn = voice.witnessCard(person.id, register, { name: person.surname });
        expect(drawn, `${person.surname} / ${register}`).not.toBeNull();
      }
    }
  });
});

describe('nothing-answers', () => {
  it('sounds like a person, not a parser', () => {
    const voice = new Voice(view, 'Humphrey', [], 9);
    for (const tag of ['present', 'elsewhere', 'meaningless'] as const) {
      const drawn = voice.nothingAnswer(tag, {
        name: 'Doyle',
        topic: 'the price of tin',
        place: 'the speakeasy',
        detective: 'Humphrey',
      });
      expect(drawn.text.length).toBeGreaterThan(20);
      expect(drawn.text).not.toMatch(/\{[a-z]+\}/);
      expect(drawn.text.toLowerCase()).not.toContain('error');
      expect(drawn.text.toLowerCase()).not.toContain('parse');
    }
  });
});
