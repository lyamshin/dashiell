/**
 * Night Hone 1 — the designer's read after M8: "too dense and disjointed
 * still". Each fix is held here.
 *
 * 1. Pages carry the golden's length from real content: the search's act
 *    paragraph and the room's texture; the question's stop, follow-up and
 *    "I saw her there".
 * 2. Every thought says something the reader did not have.
 * 3. A crowded room is not a roll call, and everybody in it stays askable.
 * 4. Plural place names agree; no "room" out of doors; no broken generator
 *    sentences in a witness's mouth.
 * 5. The decision after a catch.
 *
 * And the coordinator's rules: one appositive a sentence, a relation said
 * once, plain words for the trade.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type CaseType, type Difficulty } from '../src/gen/index.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { choicesFor } from '../src/game/choices.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import type { Page, RunState } from '../src/game/types.js';
import { DECKS, tagOf } from '../src/game/voice/cards.js';
import {
  OUTDOOR_PLACES,
  appositivesIn,
  isPluralPlace,
  nameables,
  proseTexts,
  sentencesOf,
  wordCount,
} from '../src/game/scene/index.js';
import { stoppedDoing, thereWas } from '../src/game/scene/realize.js';

function play(view: CaseView, commands: string[]): RunState {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  for (const command of commands) state = stepInput(state, command, view).state;
  return state;
}

function oracleRun(seed: number, difficulty: Difficulty = 2, type?: CaseType): { view: CaseView; state: RunState } {
  const view = buildView(generateCase(seed, { difficulty, ...(type ? { type } : {}) }));
  return { view, state: play(view, playOracle(view, 'Dashiell').steps.map((s) => s.command)) };
}

const runs = (() => {
  const out: { label: string; view: CaseView; state: RunState }[] = [];
  for (const d of [1, 2, 3] as Difficulty[]) {
    for (let seed = 1; seed <= 20; seed++) {
      const view = buildView(generateCase(seed, { difficulty: d }));
      out.push({ label: `d${d} oracle ${seed}`, view, state: play(view, playOracle(view, 'Dashiell').steps.map((s) => s.command)) });
      out.push({
        label: `d${d} wander ${seed}`,
        view,
        state: play(view, playWandering(view, seed, 'Dashiell').steps.map((s) => s.command)),
      });
    }
  }
  return out;
})();

const text = (page: Page): string => proseTexts(page).join('\n\n');

/* ------------------------------------------------------------------ §1 */

describe('Night Hone 1 §1: length from real content', () => {
  it('a search goes through the place in its own terms, and names what the buttons offer', () => {
    for (const card of DECKS['search-act']) {
      expect(card.text, card.id).not.toMatch(/\{/);
      // Never what was or was not there: the finds carry every fact.
      expect(card.text, card.id).not.toMatch(/\b(nothing|found|missing|moved|taken)\b/i);
      if (OUTDOOR_PLACES.has(String(tagOf('search-act', card, 'place')))) expect(card.text, card.id).not.toMatch(/\broom\b/);
    }
  });

  it('the room’s texture names no people, no weather, no hour and nothing that matters', () => {
    for (const card of DECKS['place-ambient']) {
      expect(card.text, card.id).not.toMatch(/\b(nobody|somebody|someone|a man|a woman|rain|fog|snow|midnight|blood|revolver|ledger|body)\b/i);
      expect(card.text, card.id).not.toMatch(/\b(like a|like an|like the|as if|as though|the way a|the way the)\b/i);
    }
  });

  it('the room’s texture is dealt at most once a visit, so no card comes round twice in a night', () => {
    for (const r of runs) {
      const seen = new Map<string, number>();
      for (const page of r.state.log) {
        for (const b of page.beats ?? []) {
          if (b.kind !== 'texture' || b.tag !== 'place' || !b.rendered || !b.text) continue;
          seen.set(b.text, (seen.get(b.text) ?? 0) + 1);
        }
      }
      for (const [t, n] of seen) expect(n, `${r.label}: ${t}`).toBe(1);
    }
  });

  it('the golden’s question: the name, what the witness knows of them, where, and "I saw her there"', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const state = play(view, ['go the suite', 'examine the suite', 'go the speakeasy', 'ask Kreuzer about Hanrahan']);
    const page5 = text(state.log[4] as Page);
    expect(page5).toContain('“Nora Hanrahan. She keeps Sweeney’s diary');
    expect(page5).toContain('I saw her there.');
  });

  it('spoken to, they stop what they were in the middle of', () => {
    expect(stoppedDoing('Lefkowitz was racking a set of cues along the wall, straightening each one.', 'Lefkowitz')).toBe(
      'Lefkowitz stopped racking a set of cues along the wall and looked up as I came over.',
    );
    expect(stoppedDoing('Salerno was at a table with a cup of coffee going cold.', 'Salerno')).toBeNull();
    expect(stoppedDoing('Kreuzer was waiting, and not for me.', 'Kreuzer')).toBeNull();
  });

  it('searches and questions average the golden’s length', () => {
    const words: Record<string, number[]> = { search: [], ask: [] };
    for (const r of runs.filter((x) => x.label.includes('oracle'))) {
      for (const page of r.state.log) {
        if (page.shape === 'search' || page.shape === 'ask') words[page.shape]?.push(wordCount(text(page)));
      }
    }
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(words.search as number[])).toBeGreaterThanOrEqual(140);
    expect(mean(words.ask as number[])).toBeGreaterThanOrEqual(110);
  });
});

/* ------------------------------------------------------------------ §2 */

describe('Night Hone 1 §2: every thought says something', () => {
  it('every thought card names at least one slot', () => {
    for (const card of DECKS.thought) expect(card.text, card.id).toMatch(/\{\w+\}/);
  });

  it('the designer’s two examples are gone, and no card says only that it did not matter', () => {
    const vacuous = [
      /consistent with how it had happened/i,
      /worth knowing, and it was worth setting aside/i,
      /did not (?:touch|move) the case/i,
      /beside the point/i,
      /honestly come by/i,
    ];
    for (const card of DECKS.thought) for (const re of vacuous) expect(card.text, card.id).not.toMatch(re);
  });

  it('no page falls back to the hand-written thought', () => {
    for (const r of runs) {
      for (const page of r.state.log) expect(text(page), r.label).not.toContain('I wrote it down and thought about it.');
    }
  });
});

/* ------------------------------------------------------------------ §3 */

describe('Night Hone 1 §3: a crowd is one sentence', () => {
  it('seed 12, page 3: the three nobody has singled out are said together, and all seven can still be asked', () => {
    const { view, state } = oracleRun(12);
    const page = state.log[2] as Page;
    const presence = (page.beats ?? []).find((b) => b.kind === 'presence');
    expect(presence?.personIds?.length).toBe(7);
    const prose = text(page);
    expect(prose).toMatch(/Two men and a woman /);
    for (const name of ['Salerno', 'Lanza', 'Hanrahan']) expect(prose).not.toContain(name);
    // Everybody present is still addressable.
    const before = play(view, playOracle(view, 'Dashiell').steps.slice(0, 2).map((s) => s.command));
    const asks = choicesFor(view, before).filter((g) => g.kind === 'ask');
    expect(asks.length).toBe(7);
  });

  it('no room gives more than five people a line of their own', () => {
    for (const r of runs) {
      for (const page of r.state.log) {
        const presence = (page.beats ?? []).find((b) => b.kind === 'presence');
        if (!presence) continue;
        const lines = page.blocks.filter(
          (b) =>
            b.kind === 'prose' &&
            b.voice === 'presence' &&
            (presence.personIds ?? []).some((id) => b.text.startsWith(`${r.view.personById.get(id)?.surname ?? '§'}`)),
        );
        expect(lines.length, `${r.label} p${page.n + 1}`).toBeLessThanOrEqual(5);
      }
    }
  });
});

/* ------------------------------------------------------------------ §4 */

describe('Night Hone 1 §4: grammar and fit', () => {
  it('a plural place takes a plural verb', () => {
    expect(isPluralPlace('the benches')).toBe(true);
    expect(isPluralPlace('the speakeasy')).toBe(false);
    for (const r of runs) {
      for (const page of r.state.log) expect(text(page), r.label).not.toMatch(/\b[Tt]he benches (?:was|is|has)\b/);
    }
  });

  it('nobody is sent to look at "the room" out of doors', () => {
    for (const r of runs) {
      for (const page of r.state.log) {
        if (!OUTDOOR_PLACES.has(page.at)) continue;
        const errand = (page.beats ?? []).find((b) => b.kind === 'errand')?.text ?? '';
        expect(errand, `${r.label} p${page.n + 1}`).not.toMatch(/\b(the room|drawer)\b/);
      }
    }
  });

  it('no clue the generator writes breaks when its attribution is taken off ("…and that the people…")', () => {
    for (const type of ['murder', 'robbery', 'missing'] as CaseType[]) {
      for (let seed = 1; seed <= 30; seed++) {
        const kase = generateCase(seed, { difficulty: 2, type });
        for (const clue of kase.findable) expect(clue.text, `${type} ${seed} ${clue.id}`).not.toMatch(/, and that /);
      }
    }
  });

  it('a paper’s label is something that was there', () => {
    expect(thereWas('A policy on Grasso’s life for $10,000, twenty months old, with Lanza named on the face of it.')).toBe(
      'There was a policy on Grasso’s life for $10,000, twenty months old, with Lanza named on the face of it.',
    );
    expect(thereWas('Three letters in Grasso’s hand to Rosa, kept in Lanza’s drawer, the last one opened.')).toMatch(/^There were three letters/);
    expect(thereWas('A glass was on its side.')).toBe('A glass was on its side.');
  });
});

/* ------------------------------------------------------------------ §5 */

describe('Night Hone 1 §5: the decision after a catch', () => {
  it('golden page 5 ends on the client held, not a bridge to a noise lead', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const state = play(view, ['go the suite', 'examine the suite', 'go the speakeasy', 'ask Kreuzer about Hanrahan']);
    const beats = (state.log[4] as Page).beats ?? [];
    const decide = beats.find((b) => b.kind === 'decide');
    expect(decide?.tag).toBe('client-hold');
    expect(beats[beats.length - 1]?.kind).toBe('decide');
  });

  it('a decision follows only a catch: an observer never mentioned, or a contradiction', () => {
    let n = 0;
    for (const r of runs) {
      for (const page of r.state.log) {
        const beats = page.beats ?? [];
        const decide = beats.find((b) => b.kind === 'decide');
        if (!decide) continue;
        n++;
        const caught = beats.some(
          (b) =>
            b.kind === 'thought' &&
            (b.tag === 'unmentioned' || b.tag === 'contradicts') &&
            (b.personIds ?? []).includes((decide.personIds ?? [])[0] ?? '§'),
        );
        expect(caught, `${r.label} p${page.n + 1}`).toBe(true);
      }
    }
    expect(n).toBeGreaterThan(20);
  });
});

/* ---------------------------------------------------- the coordinator */

describe('Night Hone 1: who is who, said once and plainly', () => {
  it('no sentence sets two people off in commas', () => {
    for (const r of runs) {
      const people = nameables(r.view);
      for (const page of r.state.log.slice(1)) {
        for (const t of proseTexts(page)) for (const s of sentencesOf(t)) expect(appositivesIn(s, people), `${r.label}: ${s}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('a suspect’s relation to the victim is said on one night page, not every page after', () => {
    for (const r of runs) {
      for (const p of r.view.kase.people) {
        if (p.kind !== 'suspect' || !p.relationshipToVictim) continue;
        const said = r.state.log.slice(1).filter((page) => text(page).includes(`${p.surname}, ${p.relationshipToVictim}`));
        expect(said.length, `${r.label} ${p.surname}`).toBeLessThanOrEqual(1);
      }
    }
  });
});
