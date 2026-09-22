/**
 * Hone 3 — order, redundancy, pronouns in speech, breath tails.
 *
 * `docs/14-hone-3.md` asks five things of the generator, and this file holds
 * it to them over the corpus rather than over one seed:
 *
 * 1. The briefing runs death → standing → found → precinct → tie →
 *    purpose and cost → pointer, per case type, and the record's order is the
 *    spoken order, so the truth sheet prints the same thing.
 * 2. `body-at-scene` states where the body was found and where it happened in
 *    one sentence, and no briefing says the same thing twice.
 * 3. Inside one of the client's turns a person is named once and is a pronoun
 *    after that, unless the turn names somebody else of the same gender.
 * 4. A hand-written breath splits its sentence; it never appends to it.
 * 5. The three things the read of seeds 3, 7 and 12 turned up.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { TROPE_IDS } from '../src/gen/tropes/index.js';
import { PRECINCT_TEXT } from '../src/gen/victim.js';
import { renderTruthSheet } from '../src/sheet/truthSheet.js';
import hiringDeck from '../content/decks/hiring.json';
import type { BriefingLine, Case, Difficulty } from '../src/gen/types.js';

const SEEDS = 200;
/** Forcing a trope costs a generation each, so the odd shapes get fewer. */
const FORCED_SEEDS = 40;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

const everyDifficulty: Case[] = [];
for (const difficulty of DIFFICULTIES) {
  for (let seed = 1; seed <= SEEDS; seed++) everyDifficulty.push(generateCase(seed, { difficulty }));
}

/**
 * Every trope, forced, because the weights do not deal the rare ones often
 * enough for a rule about all eight to be tested by the natural corpus.
 */
const everyTrope: Case[] = [];
for (const tropeId of TROPE_IDS) {
  for (let seed = 1; seed <= FORCED_SEEDS; seed++) everyTrope.push(generateCase(seed, { tropeId }));
}

const clientLines = (c: Case): BriefingLine[] => c.briefing.filter((l) => l.speaker === 'client');

/**
 * The client's sentences grouped the way the page groups them: a turn begins
 * wherever the generator wrote a question, which is what the engine's
 * `briefingTurns` does with the same list.
 */
function turnsOf(c: Case): BriefingLine[][] {
  const turns: BriefingLine[][] = [];
  for (const line of clientLines(c)) {
    const opens = line.prompt !== undefined && line.prompt.length > 0;
    if (turns.length === 0 || opens) turns.push([]);
    (turns[turns.length - 1] as BriefingLine[]).push(line);
  }
  return turns;
}

const personOf = (c: Case, id: string): { name: string; surname: string } =>
  c.people.find((p) => p.id === id) as { name: string; surname: string };

/** Where a sentence sits in the record, or -1. Exact, because the order is. */
const at = (c: Case, text: string | undefined): number =>
  text === undefined ? -1 : c.briefingText.indexOf(text.trim());

const occurrences = (text: string, token: string): number => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text.match(new RegExp(`\\b${escaped}(?:[’']s)?\\b`, 'g')) ?? []).length;
};

/* ------------------------------------------------------------------ *
 * §1 — the order.
 * ------------------------------------------------------------------ */

describe('§1 — the briefing says it in the order the reader needs it', () => {
  it('runs death, standing, found, precinct, tie, purpose, cost, pointer', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      const where = `seed ${c.seed} d${c.difficulty} ${c.act.tropeId}`;
      const client = personOf(c, c.clientId);
      const victim = c.people.find((p) => p.kind === 'victim') as { name: string; surname: string };
      const bio = c.victimBio;

      /** The steps, in the order the spec puts them, with the absent left out. */
      const steps: [string, number][] = [];
      if (c.act.type === 'murder') steps.push(['the death', at(c, `${victim.name} is dead.`)]);
      else steps.push([c.act.type === 'robbery' ? 'the loss' : 'gone', at(c, c.act.givens.text[0])]);
      steps.push(['the standing', at(c, bio.standing)]);
      steps.push(['found', at(c, bio.discovery?.foundText ?? bio.lastSeen?.text)]);
      if (bio.discovery) steps.push(['the precinct', at(c, PRECINCT_TEXT[bio.discovery.precinct])]);
      const tie = c.people.find((p) => p.id === c.clientId)?.dossier?.tie;
      if (tie) steps.push(['the tie', at(c, `${client.surname} is ${tie.text}.`)]);
      steps.push(['the purpose', at(c, c.clientBrief.purposeText)]);
      steps.push(['what it costs', at(c, c.clientBrief.cost)]);
      const pointed = personOf(c, c.clientBrief.points.personId);
      steps.push(['the pointer', at(c, `${client.surname} wants us to start with ${pointed.surname}.`)]);

      for (const [label, i] of steps) expect(i, `${where}: no ${label}`).toBeGreaterThanOrEqual(0);
      for (let i = 1; i < steps.length; i++) {
        const [beforeLabel, before] = steps[i - 1] as [string, number];
        const [label, after] = steps[i] as [string, number];
        expect(after, `${where}: ${label} comes before ${beforeLabel}`).toBeGreaterThan(before);
      }
    }
  });

  /**
   * The headline is the first thing she says about the case, whatever else the
   * engine puts in front of it. (It puts one thing there: her trade, which is
   * about her and not about the case, and which the golden has her volunteer.)
   */
  it('puts the headline fact first among the sentences about the case', () => {
    for (const c of everyTrope) {
      const headline =
        c.act.type === 'murder'
          ? `${(c.people.find((p) => p.kind === 'victim') as { name: string }).name} is dead.`
          : (c.act.givens.text[0] as string);
      const said = clientLines(c).map((l) => l.text);
      const detail = c.people.find((p) => p.id === c.clientId)?.dossier?.profession.detail ?? '';
      const aboutTheCase = said.filter((s) => !s.includes(detail) || detail.length === 0);
      expect(aboutTheCase[0], `seed ${c.seed} ${c.act.tropeId}`).toBe(headline.trim());
    }
  });

  it('gives the truth sheet the same order it gives the page', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      const section = sheet.slice(sheet.indexOf('## 6. The Briefing'), sheet.indexOf('## 7.'));
      let from = 0;
      for (const [i, line] of c.briefingText.entries()) {
        const found = section.indexOf(`${i + 1}. ${line}`, from);
        expect(found, `seed ${seed}: sheet line ${i + 1} out of order`).toBeGreaterThanOrEqual(from);
        from = found;
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §2 — one fact, one sentence.
 * ------------------------------------------------------------------ */

describe('§2 — the briefing does not state a given twice', () => {
  it('gives body-at-scene one sentence for where he was found and where it happened', () => {
    for (const c of everyTrope) {
      if (c.act.tropeId !== 'body-at-scene') continue;
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      const place = c.places.find((p) => p.id === c.act.place)?.shortName as string;
      const scene = c.act.givens.text.filter((t) => t.includes(place));
      expect(scene.length, `seed ${c.seed}: ${scene.join(' / ')}`).toBe(1);
      expect(scene[0]).toContain(`${victim.surname} was found dead at ${place}`);
      expect(scene[0]).toContain('that is where it happened');
      // Both givens' facts are still the case's: `Givens.facts` is one flat
      // list, and the two it carried are still in it.
      expect(c.act.givens.facts.some((f) => f.kind === 'timeOfDeath')).toBe(true);
      expect(c.act.givens.facts.some((f) => f.kind === 'methodEvidence')).toBe(true);
      // And the clause that carried a second fact is proved where it belongs.
      const carried = c.candidates.filter((k) => /carried|carrying/.test(k.text));
      expect(carried.length, `seed ${c.seed}: nothing says the room was not emptied`).toBeGreaterThan(0);
    }
  });

  it('never says one sentence inside another one', () => {
    const bare = (s: string): string =>
      s.toLowerCase().replace(/[.,;:!?’']/g, '').replace(/\s+/g, ' ').trim();
    for (const c of [...everyDifficulty, ...everyTrope]) {
      const said = clientLines(c).map((l) => bare(l.text));
      for (const [i, a] of said.entries()) {
        for (const [j, b] of said.entries()) {
          if (i >= j) continue;
          expect(
            a.includes(b) || b.includes(a),
            `seed ${c.seed} d${c.difficulty} ${c.act.tropeId}: "${a}" and "${b}"`,
          ).toBe(false);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §3 — the surname once a turn.
 * ------------------------------------------------------------------ */

describe('§3 — a person is named once inside one of her turns', () => {
  /**
   * The rule bites where the tic lives: at the head of a sentence. "Sweeney
   * was the reason. Sweeney was found dead. Sweeney was killed." is a record
   * being read out, and what gives it away is the name starting three
   * sentences running.
   *
   * A name kept somewhere else in a later sentence is not that, and the
   * substituter leaves those alone on purpose — "We grew up on the same block,
   * Bidwell and I." is where a person would say the name, and "him and I" for
   * it is worse than the name. So: after the first mention in a turn, the
   * surname never opens a sentence again, unless a pronoun there would have
   * two people to point at.
   */
  it('never opens a second sentence of a turn on a name it has already said', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      const victim = c.people.find((p) => p.kind === 'victim') as {
        surname: string;
        dossier?: { gender: 'm' | 'f' };
      };
      const gender = victim.dossier?.gender;
      const others = [
        ...c.people.filter((p) => p.kind !== 'victim' && p.id !== c.clientId),
        ...c.mentions,
      ].map((p) => ({
        token: 'kind' in p ? p.surname : p.name,
        gender: 'dossier' in p ? p.dossier?.gender : (p as { gender: 'm' | 'f' }).gender,
      }));
      for (const turn of turnsOf(c)) {
        const spoken = turn.map((l) => l.spoken ?? '').join(' ');
        if (occurrences(spoken, victim.surname) <= 1) continue;
        const clash = others.some(
          (o) => o.gender === gender && o.token.length > 0 && occurrences(spoken, o.token) > 0,
        );
        if (clash) continue;
        // Every sentence of the turn that opens on the surname, after the one
        // that introduced him. A name with a comma straight after it is not
        // the subject waiting for its verb — it heads an apposition or a list,
        // "Brennan, Sterling Ainsworth and I came over on the same boat" — and
        // there the name is doing work no pronoun does.
        const sentences = spoken.split(/(?<=[.!?])\s+/);
        const heads = new RegExp(`^${victim.surname}(?:[’']s)?\\b(?!,)`);
        const opensOn = sentences.filter((s) => heads.test(s.trim()));
        const introduced = sentences.findIndex((s) => occurrences(s, victim.surname) > 0);
        const firstOpens = heads.test((sentences[introduced] ?? '').trim());
        expect(
          opensOn.length,
          `seed ${c.seed} d${c.difficulty} ${c.act.tropeId}: ${victim.surname} opens ${opensOn.length} sentences of one turn\n  ${spoken}`,
        ).toBeLessThanOrEqual(firstOpens ? 1 : 0);
      }
    }
  });

  it('never leaves a turn that talks about him without naming him once', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      for (const turn of turnsOf(c)) {
        const named = turn.some((l) => occurrences(l.text, victim.surname) > 0);
        if (!named) continue;
        const spoken = turn.map((l) => l.spoken ?? '').join(' ');
        expect(
          occurrences(spoken, victim.surname),
          `seed ${c.seed} d${c.difficulty}: a turn about ${victim.surname} that never says so\n  ${spoken}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every name in the record, whatever the page says', () => {
    for (const c of everyTrope) {
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      const record = c.briefingText.join(' ');
      // The sheet files a person by name, so the third person never thins out.
      expect(occurrences(record, victim.surname), `seed ${c.seed}`).toBeGreaterThan(2);
    }
  });
});

/* ------------------------------------------------------------------ *
 * §4 — breath tails.
 * ------------------------------------------------------------------ */

/**
 * The only words `breathe` is allowed to put into a sentence that was not
 * already in it: the leads it writes on a second piece (`breath.ts`'s
 * `JOINTS`) and the copula its robbery discovery shape supplies for "It was
 * ten o'clock." Everything else in a breath has to have come from the spoken
 * form, because a breath is a way of saying the same sentence and not a way
 * of saying more of it.
 */
const BREATH_MAY_ADD = new Set(['but', 'so', 'because', 'it', 'was']);

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[a-z0-9’']+/g) ?? [];

describe('§4 — a breath splits, and never appends', () => {
  it('puts no word into the split that the spoken sentence did not have', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      for (const line of c.briefing) {
        if (line.spoken === null || line.breath === undefined) continue;
        const had = new Set(wordsOf(line.spoken));
        const added = wordsOf(line.breath.join(' ')).filter(
          (w) => !had.has(w) && !BREATH_MAY_ADD.has(w),
        );
        expect(
          added,
          `seed ${c.seed} d${c.difficulty}: the breath added ${added.join(', ')}\n  spoken: ${line.spoken}\n  breath: ${line.breath.join(' | ')}`,
        ).toEqual([]);
      }
    }
  });

  /**
   * The other half of the same rule, and the one Hone 1 already had: nothing
   * is dropped either. Together they say the breath and the sentence are the
   * same words in a different number of pieces.
   */
  it('keeps every word of the spoken sentence in the split', () => {
    const cheap = new Set(['and', 'which', 'is', 'was', 'were', 'are', 'but', 'so', 'it', 'that']);
    for (const c of everyTrope) {
      for (const line of c.briefing) {
        if (line.spoken === null || line.breath === undefined) continue;
        const have = new Set(wordsOf(line.breath.join(' ')));
        const lost = wordsOf(line.spoken).filter((w) => !have.has(w) && !cheap.has(w));
        expect(
          lost,
          `seed ${c.seed} ${c.act.tropeId}: the breath lost ${lost.join(', ')}\n  ${line.spoken}`,
        ).toEqual([]);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §5 — the spot checks from the read.
 * ------------------------------------------------------------------ */

describe('§5 — what the read of seeds 3, 7 and 12 turned up', () => {
  it('says "two hours of nothing useful" at most once in a case', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      // The record's form of a sentence and the client's own words for it are
      // one sentence rendered twice and only ever one of them is on the page,
      // so they are counted once. Same for a clue and its record.
      const everywhere = new Set<string>([
        ...c.briefingText,
        ...c.candidates.map((k) => k.text),
      ]);
      const times = [...everywhere].join(' ').match(/two hours of nothing useful/g)?.length ?? 0;
      expect(times, `seed ${c.seed} d${c.difficulty} ${c.act.tropeId}`).toBeLessThanOrEqual(1);
    }
  });

  it('never names the client twice in one hiring card', () => {
    for (const card of hiringDeck as { id: string; text: string }[]) {
      const named = (card.text.match(/\{name\}/g) ?? []).length;
      expect(named, `${card.id}: ${card.text}`).toBeLessThanOrEqual(1);
    }
  });

  it('never puts the standing in front of the word "dead"', () => {
    for (const c of [...everyDifficulty, ...everyTrope]) {
      if (c.act.type !== 'murder') continue;
      const standing = at(c, c.victimBio.standing);
      const dead = c.briefingText.findIndex((line) => /\bdead\b/.test(line));
      expect(
        dead,
        `seed ${c.seed} ${c.act.tropeId}: nothing says he is dead`,
      ).toBeGreaterThanOrEqual(0);
      expect(dead, `seed ${c.seed} ${c.act.tropeId}: the standing comes first`).toBeLessThan(
        standing,
      );
    }
  });
});
