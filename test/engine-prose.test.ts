/**
 * docs/25's read-through, fixed in the engine (docs/26-engine-prose-notes.md).
 *
 * - A search find that is a statement, not a thing, is told: a secret
 *   explained is what the detective found and where it put them, and an hour
 *   written down is where it was written.
 * - No verdict from Poached up: an explained secret explains a lie.
 * - Two sightings tied to one anchor are two clauses.
 * - A search thought names nobody its find did not.
 * - An anchor's hour is told once a night.
 * - The question matches what the answer tells; a topic that names nobody is
 *   asked as a place or a thing.
 * - The hiring's {dashiell} is supplied; first sight is a description.
 * - The reader lint holds all of it at zero on the runs the notes read.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import type { Clue, Id } from '../src/gen/types.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { lintRun, verdictsIn } from '../src/game/reader-lint.js';
import { askKindFor, topicSlots } from '../src/game/reducer.js';
import { candidateThoughts } from '../src/game/scene/thought.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { checkRunCoverage } from '../src/game/scene/coverage.js';
import { HIRING_DASHIELL } from '../src/game/voice-data.js';
import { Dealer } from '../src/game/voice/cards.js';
import type { Page, RunState } from '../src/game/types.js';
import { maskPlaces, placeFormsOf } from '../src/game/scene/place-names.js';

const tiered = (seed: number, tier: 0 | 1 | 2 | 3 | 4 | 5): CaseView =>
  buildView(generateCase(seed, { difficulty: 2, detectiveName: 'Dashiell', tier, classic: true }));

const prose = (page: Page): string =>
  page.blocks
    .map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : ''))
    .join('\n')
    .replace(/\s+/g, ' ');

/** The four runs docs/26 reads, page by page. */
const READ: { label: string; view: CaseView; state: RunState }[] = [
  [5, 3],
  [7, 5],
  [3, 4],
  [11, 0],
].map(([seed, tier]) => {
  const view = tiered(seed as number, tier as 0 | 3 | 4 | 5);
  return { label: `seed ${seed} tier ${tier}`, view, state: playOracle(view, 'Dashiell').state };
});

describe('docs/26: search finds told, not printed', () => {
  const r = READ[1] as (typeof READ)[number];
  const disqualifier = r.state.log.find((p) =>
    p.found.some((id) => r.view.findableById.get(id)?.role === 'disqualifier'),
  ) as Page;

  it('a secret explained is what he found and where it put them, never the record', () => {
    expect(disqualifier).toBeDefined();
    const text = prose(disqualifier);
    expect(text).not.toMatch(/The bank confirm/);
    expect(text).not.toMatch(/It was theft, and it was not murder/);
    expect(text).toMatch(/bank book/);
    expect(text).toMatch(/It (?:had|put) Brennan here at eleven o’clock\./);
  });

  it('and the thought on it explains a lie, and clears nobody (Hard-boiled)', () => {
    const text = prose(disqualifier);
    expect(text).not.toMatch(/was out of it/);
    const thought = (disqualifier.beats ?? []).find((b) => b.kind === 'thought' && b.rendered);
    expect(thought?.tag).toBe('secret');
    expect(verdictsIn(text, ['Brennan'])).toEqual([]);
  });

  it('an hour the night has told is not told again (Soft-boiled seed 5, pages 2 and 3)', () => {
    const s = READ[0] as (typeof READ)[number];
    const search = s.state.log[2] as Page;
    expect(prose(search)).toMatch(/the hour I already had/);
    expect(prose(search)).not.toMatch(/half past seven/);
  });

  it('a search thought does not name somebody its find did not (seed 7, the register)', () => {
    const page = r.state.log.find((p) => /The register had a room paid for/.test(prose(p))) as Page;
    expect(page).toBeDefined();
    const thought = (page.beats ?? []).find(
      (b) => b.kind === 'thought' && (b.clueIds ?? []).some((id) => r.view.findableById.get(id)?.kind === 'document' && /register/.test(r.view.findableById.get(id)?.text ?? '')),
    );
    expect(thought?.text).toBeDefined();
    // Place names (content/places): Renfro's address is "Renfro’s place" now,
    // which names the place and not the man; his name anywhere else is the fault.
    expect(maskPlaces(thought?.text ?? '', placeFormsOf(r.view.kase.places))).not.toMatch(/Renfro/);
  });
});

describe('docs/26: thoughts', () => {
  const view = tiered(7, 5);
  const disq = view.kase.findable.find((c) => c.role === 'disqualifier') as Clue;

  it('a disqualifier is a secret explained from Poached up, never a dead end', () => {
    const start = view.kase.starting;
    const classes = candidateThoughts({
      view,
      newClues: [disq],
      foundBefore: start,
      foundAfter: [...start, disq.id],
      accountsBefore: [],
      accountsAfter: [],
    });
    expect(classes.map((t) => t.cls)).toContain('secret');
    expect(classes.map((t) => t.cls)).not.toContain('dead-end');
    expect(classes.find((t) => t.cls === 'secret')?.basis).toBe('explained');
  });
});

describe('docs/26: tellings', () => {
  it('two sightings tied to one anchor are two clauses, each with its place', () => {
    const r = READ[1] as (typeof READ)[number];
    const all = r.state.log.map(prose).join('\n');
    expect(all).not.toMatch(/\bonce and (?:here|at [^.]+) once\b/);
    expect(all).toMatch(/While the milk wagon was in the street, she was at the Automat\. Another time, she was here\./);
  });

  it('first sight is a description, not the relation stacked on it', () => {
    const r = READ[1] as (typeof READ)[number];
    const all = r.state.log.map(prose).join('\n');
    expect(all).not.toMatch(/He was in Renfro’s debt[:,] a man/);
    expect(all).toMatch(/Zeldin, a man in his fifties, was reading/);
  });
});

describe('docs/26: the question', () => {
  const view = tiered(3, 4);

  it('a topic that names nobody is asked as a place or a thing', () => {
    expect(askKindFor(view, { kind: 'exact', personId: 'p-s1', topic: 'the key' })).toBe('ask-object');
    expect(topicSlots(view, { kind: 'exact', personId: 'p-s1', topic: 'the key' })).toEqual({ object: 'key' });
    const place = view.places[0]?.shortName as string;
    expect(askKindFor(view, { kind: 'exact', personId: 'p-s1', topic: `${place} that evening` })).toBe('ask-place');
    expect(topicSlots(view, { kind: 'exact', personId: 'p-s1', topic: `${place} that evening` })).toEqual({ place });
    const person = view.kase.people.find((p) => p.kind === 'suspect')?.surname as string;
    expect(askKindFor(view, { kind: 'exact', personId: 'p-s1', topic: `${person} that evening` })).toBe('ask-person');
  });

  it('the hiring supplies {dashiell}, so a card that asks for it can be dealt', () => {
    const lines = [...HIRING_DASHIELL.yes, ...HIRING_DASHIELL.no];
    const given: (string | undefined)[] = [];
    const original = Dealer.prototype.draw;
    Dealer.prototype.draw = function (this: Dealer, ...args: Parameters<Dealer['draw']>) {
      if (args[0] === 'hiring') given.push(args[2]?.dashiell);
      return original.apply(this, args);
    };
    try {
      for (let seed = 1; seed <= 6; seed++) playOracle(buildView(generateCase(seed, { difficulty: 2 })));
    } finally {
      Dealer.prototype.draw = original;
    }
    expect(given.length).toBeGreaterThan(0);
    for (const d of given) expect(lines).toContain(d);
  });
});

describe('docs/26: the reader lint on the runs the notes read', () => {
  it('finds nothing, and correspondence and coverage stay clean', () => {
    const issues: string[] = [];
    for (const r of READ) {
      for (const run of [r.state, playWandering(r.view, 1, 'Dashiell').state]) {
        for (const i of lintRun(r.view, run)) issues.push(`${r.label} p${i.page + 1} ${i.rule}: ${i.detail}`);
        for (const v of checkRun(r.view, run)) issues.push(`${r.label} correspondence: ${JSON.stringify(v)}`);
        for (const c of checkRunCoverage(r.view, run).issues ?? []) issues.push(`${r.label} coverage: ${JSON.stringify(c)}`);
      }
    }
    expect(issues).toEqual([]);
  });

  it('catches what the read-through found', () => {
    expect(verdictsIn('It came down to embezzling from an employer. Brennan was out of it.', ['Brennan'])).toContain('was out of it');
    expect(verdictsIn('That cleared Weisglass.', ['Weisglass'])).toEqual(['That cleared Weisglass']);
    expect(verdictsIn('I crossed Zeldin off, and felt no better for it.', ['Zeldin'])).toEqual(['crossed Zeldin off']);
    expect(verdictsIn('I crossed it off.', ['Zeldin'])).toEqual([]);
  });
});

void (null as unknown as Id);
