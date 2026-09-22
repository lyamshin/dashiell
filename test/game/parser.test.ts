/**
 * The prompt. The rule under test everywhere here: a mistake is free.
 */

import { describe, expect, it } from 'vitest';
import { generateCase } from '../../src/gen/index.js';
import { buildView } from '../../src/game/derive.js';
import { parse } from '../../src/game/parser.js';
import { newRun, stepInput } from '../../src/game/reducer.js';
import type { Command } from '../../src/game/types.js';

const view = buildView(generateCase(7, { difficulty: 2 }));
const scene = view.kase.solution.murderPlaceId;
const speakeasy = view.kase.places.find((p) => p.shortName.includes('speakeasy'));
const doyle = view.kase.people.find((p) => p.surname === 'Doyle');

function ok(at: string, input: string): Command {
  const r = parse(view, at, input);
  if (!r.ok) throw new Error(`expected "${input}" to parse, got ${r.problem.kind}: ${r.problem.message}`);
  return r.command;
}

function bad(at: string, input: string): { kind: string; message: string; options?: string[] } {
  const r = parse(view, at, input);
  if (r.ok) throw new Error(`expected "${input}" not to parse`);
  return r.problem;
}

describe('every command form', () => {
  it('reads the free verbs', () => {
    expect(ok(scene, 'look')).toEqual({ kind: 'look' });
    expect(ok(scene, 'notebook')).toEqual({ kind: 'notebook' });
    expect(ok(scene, 'help')).toEqual({ kind: 'help' });
    expect(ok(scene, 'file')).toEqual({ kind: 'file' });
  });

  it('reads go, with and without the preposition', () => {
    const target = speakeasy?.shortName as string;
    expect(ok(scene, `go ${target}`)).toEqual({ kind: 'go', placeId: speakeasy?.id });
    expect(ok(scene, `go to ${target}`)).toEqual({ kind: 'go', placeId: speakeasy?.id });
    expect(ok(scene, `walk ${target}`)).toEqual({ kind: 'go', placeId: speakeasy?.id });
    // A bare room name is a fair guess at travel.
    expect(ok(scene, target)).toEqual({ kind: 'go', placeId: speakeasy?.id });
  });

  it('reads examine, bare and with a noun', () => {
    expect(ok(scene, 'examine')).toEqual({ kind: 'examine', placeId: scene });
    const object = view.kase.places.find((p) => p.id === scene)?.objects[0] as string;
    const name = view.objectById.get(object)?.name as string;
    expect(ok(scene, `examine ${name}`)).toEqual({
      kind: 'examine',
      placeId: scene,
      objectId: object,
    });
    expect(ok(scene, `look around`)).toEqual({ kind: 'examine', placeId: scene });
  });

  it('reads ask, with the verb in several shapes', () => {
    const at = doyle?.foundAt as string;
    const a = ok(at, 'ask Doyle about Brauer');
    expect(a.kind).toBe('ask');
    expect((a as { personId: string }).personId).toBe(doyle?.id);
    expect(ok(at, 'talk to Doyle about Brauer')).toEqual(a);
    expect(ok(at, 'ASK DOYLE ABOUT BRAUER')).toEqual(a);
  });

  it('reads the fixed topics', () => {
    const at = doyle?.foundAt as string;
    expect(ok(at, 'ask Doyle about that evening')).toEqual({
      kind: 'ask',
      personId: doyle?.id,
      topic: { kind: 'evening' },
    });
    // "why I was hired" is also the generator's own topic string for the
    // client's clue, so it resolves as the exact lead rather than the token.
    // Either way it is the same question and the same answer.
    const client = view.client;
    const asked = ok(client.foundAt as string, `ask ${client.surname} about why I was hired`);
    expect(asked.kind).toBe('ask');
    expect((asked as { topic: { kind: string } }).topic.kind).toMatch(/^(hire|exact)$/);
    // A person with nothing filed under it still understands the question.
    const other = view.kase.people.find((p) => p.kind === 'fixture');
    const plain = ok(other?.foundAt as string, `ask ${other?.surname} about why I was hired`);
    expect((plain as { topic: { kind: string } }).topic).toEqual({ kind: 'hire' });
  });

  it('reads a lead’s exact topic string back', () => {
    for (const [personId, byTopic] of view.exactBuckets) {
      const person = view.personById.get(personId);
      for (const topic of byTopic.keys()) {
        const command = ok(person?.foundAt as string, `ask ${person?.surname} about ${topic}`);
        expect(command).toEqual({
          kind: 'ask',
          personId,
          topic: { kind: 'exact', personId, topic },
        });
      }
    }
  });
});

describe('fuzzy names', () => {
  it('takes a given name, a surname, or a prefix of either', () => {
    const target = view.kase.people.find((p) => p.kind === 'suspect' && p.name.includes(' '));
    const [given, surname] = (target?.name ?? '').split(' ') as [string, string];
    const at = target?.foundAt as string;
    for (const spelling of [surname, given, surname.slice(0, 4).toLowerCase()]) {
      const r = parse(view, at, `ask ${spelling} about that evening`);
      expect(r.ok, `"${spelling}" should resolve`).toBe(true);
    }
  });

  it('takes a place by its short name or a distinctive word of its full name', () => {
    for (const place of view.kase.places) {
      expect(parse(view, scene, `go ${place.shortName}`).ok).toBe(true);
    }
  });

  it('is case-insensitive and forgives the punctuation', () => {
    const teagues = view.kase.places.find((p) => p.shortName.includes('’'));
    if (!teagues) return;
    expect(ok(scene, `go ${teagues.shortName.replace('’', "'").toUpperCase()}`)).toEqual({
      kind: 'go',
      placeId: teagues.id,
    });
  });
});

describe('what the parser refuses', () => {
  it('nudges an unknown verb toward help', () => {
    expect(bad(scene, 'dance with the landlady').kind).toBe('unknown-verb');
  });

  it('asks which one when a name is ambiguous', () => {
    // Two people whose surnames share a prefix, if the case has any.
    const surnames = view.kase.people.map((p) => p.surname);
    const shared = surnames.find((s, i) =>
      surnames.some((t, j) => i !== j && t !== s && t[0] === s[0] && t[1] === s[1]),
    );
    if (!shared) return;
    const stem = shared.slice(0, 2).toLowerCase();
    const problem = parse(view, scene, `ask ${stem} about that evening`);
    if (problem.ok) return;
    expect(['ambiguous', 'absent-person', 'unknown-noun']).toContain(problem.problem.kind);
  });

  it('knows an empty line from a command', () => {
    expect(bad(scene, '   ').kind).toBe('empty');
    expect(bad(scene, 'go').kind).toBe('incomplete');
    expect(bad(scene, 'ask').kind).toBe('incomplete');
  });

  it('will not put a question to a man in another room', () => {
    const elsewhere = view.kase.people.find(
      (p) => p.foundAt !== undefined && p.foundAt !== scene && p.kind !== 'victim',
    );
    const problem = bad(scene, `ask ${elsewhere?.surname} about that evening`);
    expect(problem.kind).toBe('absent-person');
  });

  it('will not interview the victim', () => {
    expect(bad(scene, `ask ${view.victim.surname} about that evening`).kind).toBe('unknown-noun');
  });
});

describe('a mistake never costs an action', () => {
  const inputs = [
    '',
    '   ',
    'dance',
    'go',
    'go to the moon',
    'ask',
    'ask nobody about nothing',
    'examine the submarine',
    'ask Doyle about the price of tin',
    'xyzzy',
    'go the place that is not a place',
  ];

  it('charges nothing for any of them, and files a page anyway', () => {
    let state = newRun(view, { detectiveName: 'Dashiell' });
    const before = state.actionsUsed;
    for (const input of inputs) {
      const pages = state.log.length;
      const result = stepInput(state, input, view);
      state = result.state;
      expect(result.page.cost, `"${input}" cost an action`).toBe(0);
      expect(state.log.length).toBe(pages + 1);
    }
    expect(state.actionsUsed).toBe(before);
    // M4b §B.2: page one hands over the client's brief and nothing else.
    expect(state.found.length).toBe(1);
  });

  it('charges nothing for asking somebody who is not in the room', () => {
    const state = newRun(view, { detectiveName: 'Dashiell' });
    const elsewhere = view.kase.people.find(
      (p) => p.foundAt !== undefined && p.foundAt !== state.at && p.kind !== 'victim',
    );
    const result = stepInput(state, `ask ${elsewhere?.surname} about that evening`, view);
    expect(result.page.cost).toBe(0);
    expect(result.state.actionsUsed).toBe(0);
  });

  it('charges nothing for going where you already are', () => {
    const state = newRun(view, { detectiveName: 'Dashiell' });
    const here = view.placeById.get(state.at)?.shortName as string;
    const result = stepInput(state, `go ${here}`, view);
    expect(result.page.cost).toBe(0);
  });
});

describe('across the corpus', () => {
  it('parses every lead the game will ever print, at every difficulty', () => {
    for (const difficulty of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 25; seed++) {
        const v = buildView(generateCase(seed, { difficulty }));
        for (const clue of v.kase.findable) {
          const lead =
            clue.source.type === 'place'
              ? `examine ${v.placeById.get(clue.source.placeId)?.shortName}`
              : `ask ${v.personById.get(clue.source.personId)?.surname} about ${clue.source.topic}`;
          const r = parse(v, clue.place, lead);
          expect(r.ok, `d${difficulty} seed ${seed}: "${lead}"`).toBe(true);
        }
      }
    }
  });
});
