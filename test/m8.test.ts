/**
 * M8 — the scene (`docs/17-m8-the-scene.md` §11).
 *
 * - The planner emits the shapes of §1 for every action over forty seeds,
 *   three difficulties, and all case types.
 * - Thoughts: each class fires on a constructed case where it should and never
 *   where it should not; `observer-placed` never fires when the truth
 *   timeline does not put the observer there.
 * - Bridges name only leads that are actually open, and the subject is a
 *   person the notebook now knows.
 * - The activity chosen for a person is stable across pages in one visit.
 * - The body is present at the scene in every body-at-scene trope.
 * - Every page has every required beat, and no required beat is cut.
 *
 * Plus the text rules §7 and §10 name, and the golden's own route.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type CaseType, type Difficulty } from '../src/gen/index.js';
import type { Clue, Fact, Id } from '../src/gen/types.js';
import { buildView, threadsFor, type CaseView } from '../src/game/derive.js';
import { checkRun } from '../src/game/correspond-pages.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import type { Page, RunState } from '../src/game/types.js';
import { wordsOnPage } from '../src/game/transcript.js';
import {
  NIGHT_CEILING,
  candidateThoughts,
  checkRunCoverage,
  epithetsIn,
  hourAgrees,
  impliedSpan,
  introduceNames,
  isSubjectless,
  nameables,
  namesWithoutClause,
  pastTense,
  thoughtsFor,
  viewOf,
  type ThoughtClass,
} from '../src/game/scene/index.js';

/* ------------------------------------------------------------------ *
 * Runs, replayed a step at a time so every page has the state after it.
 * ------------------------------------------------------------------ */

interface Walk {
  label: string;
  view: CaseView;
  states: RunState[];
  final: RunState;
}

function walk(view: CaseView, commands: string[], label: string): Walk {
  const states: RunState[] = [newRun(view, { detectiveName: 'Dashiell' })];
  for (const command of commands) states.push(stepInput(states[states.length - 1] as RunState, command, view).state);
  return { label, view, states, final: states[states.length - 1] as RunState };
}

const cache = new Map<string, Walk[]>();
function walks(key: string, make: () => Walk[]): Walk[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const made = make();
  cache.set(key, made);
  return made;
}

/** Forty seeds, three difficulties, the oracle and the wandering player. */
function sweep(): Walk[] {
  return walks('sweep', () => {
    const out: Walk[] = [];
    for (const d of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 40; seed++) {
        const view = buildView(generateCase(seed, { difficulty: d }));
        const o = playOracle(view, 'Dashiell');
        out.push(walk(view, o.steps.map((s) => s.command), `d${d} oracle ${seed}`));
        const w = playWandering(view, seed, 'Dashiell');
        out.push(walk(view, w.steps.map((s) => s.command), `d${d} wander ${seed}`));
      }
    }
    return out;
  });
}

/** Every case type, forced: murder, robbery, missing. */
function byType(): Walk[] {
  return walks('types', () => {
    const out: Walk[] = [];
    for (const type of ['murder', 'robbery', 'missing'] as CaseType[]) {
      for (let seed = 1; seed <= 15; seed++) {
        const view = buildView(generateCase(seed, { difficulty: 2, type }));
        const o = playOracle(view, 'Dashiell');
        out.push(walk(view, o.steps.map((s) => s.command), `${type} oracle ${seed}`));
        const w = playWandering(view, seed, 'Dashiell');
        out.push(walk(view, w.steps.map((s) => s.command), `${type} wander ${seed}`));
      }
    }
    return out;
  });
}

const kinds = (page: Page): string =>
  (page.beats ?? [])
    .filter((b) => b.kind !== 'texture')
    .map((b) => b.kind)
    .join(' ');

/** §1's table, as patterns over the beat kinds in order. */
const SHAPES: Record<string, RegExp> = {
  arrive: /^(clock )?errand establish presence( find)*( thought)*( bridge)?( answer)?$/,
  return: /^(clock )?errand return presence( thought)*( answer)?$/,
  look: /^(establish|return) presence( thought)*$/,
  search: /^(clock )?errand act( find)*( thought)+( bridge)?$/,
  ask: /^(clock )?(errand )?exchange( find)*( thought)+( bridge)?$/,
};

/* ------------------------------------------------------------------ *
 * §1 — the planner's shapes.
 * ------------------------------------------------------------------ */

describe('M8 §1: the page shapes', () => {
  it('lays out every page after the office in one of the shapes, over forty seeds, three difficulties and every case type', () => {
    const seen = new Map<string, number>();
    const offenders: string[] = [];
    for (const w of [...sweep(), ...byType()]) {
      for (const page of w.final.log.slice(1)) {
        const shape = page.shape;
        expect(shape, `${w.label} page ${page.n + 1} has no shape`).toBeDefined();
        seen.set(shape as string, (seen.get(shape as string) ?? 0) + 1);
        if (shape === 'repeat' || shape === 'other') continue;
        const pattern = SHAPES[shape as string];
        if (!pattern || !pattern.test(kinds(page))) offenders.push(`${w.label} p${page.n + 1} ${shape}: ${kinds(page)}`);
        const beats = page.beats ?? [];
        const thought = beats.some((b) => b.kind === 'thought');
        const answer = beats.some((b) => b.kind === 'answer');
        // §2: the answer closes a page no thought has already closed.
        if (answer) expect(thought, `${w.label} p${page.n + 1} answers and thinks`).toBe(false);
        if (shape === 'arrive' || shape === 'search') {
          expect(thought || answer, `${w.label} p${page.n + 1} leaves its errand hanging`).toBe(true);
        }
      }
    }
    expect(offenders.slice(0, 10)).toEqual([]);
    for (const shape of ['arrive', 'return', 'search', 'ask']) {
      expect(seen.get(shape) ?? 0, `no ${shape} page in the sweep`).toBeGreaterThan(0);
    }
  });

  it('opens every action page with its reason, or a question that carries it (§2)', () => {
    for (const w of sweep()) {
      for (const page of w.final.log.slice(1)) {
        if (page.shape !== 'arrive' && page.shape !== 'return' && page.shape !== 'search' && page.shape !== 'ask') continue;
        const first = page.blocks[0];
        const carried = (page.beats ?? []).some((b) => b.kind === 'exchange' && b.tag === 'carried');
        if (page.shape === 'ask' && carried) continue;
        expect(first?.kind === 'prose' && first.voice === 'errand', `${w.label} p${page.n + 1}`).toBe(true);
      }
    }
  });

  it('drops the carry line only when the question is the lead’s subject and the notebook knows why they matter', () => {
    let carried = 0;
    for (const w of sweep()) {
      for (const page of w.final.log.slice(1)) {
        const ex = (page.beats ?? []).find((b) => b.kind === 'exchange');
        if (!ex || ex.tag !== 'carried') continue;
        carried++;
        const subject = w.view.personById.get((ex.personIds ?? [])[1] ?? '');
        expect(subject?.relationshipToVictim, `${w.label} p${page.n + 1}`).toBeDefined();
        expect((page.beats ?? []).some((b) => b.kind === 'errand')).toBe(false);
      }
    }
    expect(carried).toBeGreaterThan(20);
  });
});

/* ------------------------------------------------------------------ *
 * §5 — the thought, class by class, on constructed cases.
 * ------------------------------------------------------------------ */

describe('M8 §5: the thought classes', () => {
  // Seed 3 is the golden's case: Sweeney dead in the suite at ten; Kreuzer
  // the client and on Ninth Street (the third floor) at ten and half past;
  // Grasso the killer, in the suite and claiming the third floor.
  const view = buildView(generateCase(3, { difficulty: 2 }));
  const opening = ['c130', 'c117', 'c118'];
  let n = 0;
  const clue = (kind: Clue['kind'], source: Clue['source'], facts: Fact[], role: Clue['role'] = 'spine', place = 'speakeasy'): Clue => ({
    id: `x${++n}`,
    kind,
    source,
    establishes: facts,
    text: 'x',
    place,
    leadsTo: [],
    role,
  });
  const said = (personId: Id): Clue['source'] => ({ type: 'person', personId, topic: 'x' });
  const room = (placeId: Id): Clue['source'] => ({ type: 'place', placeId });
  const classes = (c: Clue, opts: { before?: Id[]; accounts?: Id[] } = {}): ThoughtClass[] => {
    const before = opts.before ?? opening;
    return candidateThoughts({
      view,
      newClues: [c],
      foundBefore: before,
      foundAfter: [...before, c.id],
      accountsBefore: opts.accounts ?? [],
      accountsAfter: opts.accounts ?? [],
    }).map((t) => t.cls);
  };
  const at = (personId: Id, place: Id, tick: number): Fact => ({ kind: 'personAt', personId, place, tick });

  it('knows the case it is testing on', () => {
    expect(view.client.id).toBe('p-s2');
    expect(view.sceneId).toBe('res-suite');
    expect(view.truthOf.get('p-s2')?.[8]).toBe('walkup-flat');
    expect(view.truthOf.get('p-s1')?.[8]).toBe('res-suite');
  });

  it('clears: a suspect elsewhere inside the window, and not outside it', () => {
    expect(classes(clue('observation', said('p-f1'), [at('p-s3', 'walkup-flat', 8)]))).toContain('clears');
    expect(classes(clue('observation', said('p-f1'), [at('p-s3', 'walkup-flat', 3)]))).not.toContain('clears');
    expect(classes(clue('observation', said('p-f1'), [at('p-f2', 'walkup-flat', 8)]))).not.toContain('clears');
  });

  it('implicates: a suspect at the scene inside the window, or with the means', () => {
    expect(classes(clue('observation', said('p-f1'), [at('p-s3', 'res-suite', 8)]))).toContain('implicates');
    expect(classes(clue('observation', said('p-f1'), [at('p-s3', 'res-suite', 8)]))).not.toContain('clears');
    expect(classes(clue('document', room('hotel-lobby'), [{ kind: 'hadAccess', personId: 'p-s1', methodId: 'blunt' }]))).toContain('implicates');
    expect(classes(clue('observation', said('p-f1'), [at('p-s3', 'res-suite', 2)]))).not.toContain('implicates');
  });

  it('observer-placed: only where the truth puts the observer there', () => {
    // Kreuzer was on the third floor at ten: her seeing Hanrahan there places her.
    expect(classes(clue('observation', said('p-s2'), [at('p-s3', 'walkup-flat', 8)]))).toContain('observer-placed');
    // Grasso was in the suite at ten: his "seeing" somebody on the third floor places nobody.
    expect(classes(clue('observation', said('p-s1'), [at('p-s3', 'walkup-flat', 8)]))).not.toContain('observer-placed');
    // Overheard is not seen.
    expect(classes(clue('overheard', said('p-s2'), [at('p-s3', 'walkup-flat', 8)]))).not.toContain('observer-placed');
    // A fixture at a post is not placed by it.
    expect(classes(clue('observation', said('p-f2'), [at('p-s3', 'walkup-flat', 8)]))).not.toContain('observer-placed');
  });

  it('never fires observer-placed against the truth, over every observation in forty seeds', () => {
    let fired = 0;
    for (const d of [1, 2, 3] as Difficulty[]) {
      for (let seed = 1; seed <= 40; seed++) {
        const v = buildView(generateCase(seed, { difficulty: d }));
        const start = v.kase.starting;
        for (const c of v.kase.findable) {
          if (c.kind !== 'observation') continue;
          for (const t of candidateThoughts({
            view: v,
            newClues: [c],
            foundBefore: start,
            foundAfter: [...start, c.id],
            accountsBefore: [],
            accountsAfter: [],
          })) {
            if (t.cls !== 'observer-placed') continue;
            fired++;
            expect(v.truthOf.get(t.sourceId as Id)?.[t.tick as number], `seed ${seed} ${c.id}`).toBe(t.placeId);
          }
        }
      }
    }
    expect(fired).toBeGreaterThan(50);
  });

  it('unmentioned: rides with observer-placed when the client kept it out of the office', () => {
    const c = clue('observation', said('p-s2'), [at('p-s3', 'walkup-flat', 8)]);
    expect(classes(c)).toContain('unmentioned');
    // Once her evening is taken down and it says the third floor, it was mentioned.
    expect(classes(c, { accounts: ['p-s2'] })).not.toContain('unmentioned');
    // And never without the observation it rides on.
    expect(classes(clue('observation', said('p-s1'), [at('p-s3', 'walkup-flat', 8)]))).not.toContain('unmentioned');
  });

  it('contradicts: a placement against an evening somebody gave, and only once it was given', () => {
    const c = clue('observation', said('p-f1'), [at('p-s1', 'res-suite', 8)]);
    expect(classes(c, { accounts: ['p-s1'] })).toContain('contradicts');
    expect(classes(c)).not.toContain('contradicts');
    expect(classes(clue('observation', said('p-f1'), [at('p-s1', 'walkup-flat', 8)]), { accounts: ['p-s1'] })).not.toContain(
      'contradicts',
    );
  });

  it('motive, method, secret and dead-end, from their facts', () => {
    expect(classes(clue('overheard', said('p-f3'), [{ kind: 'hasMotive', personId: 'p-s1', motiveType: 'revenge' }]))).toContain('motive');
    expect(classes(clue('overheard', said('p-f3'), [{ kind: 'hasMotive', personId: 'p-victim', motiveType: 'revenge' }]))).not.toContain('motive');
    // Seed 3's method is a given, so the evidence alone is not news...
    expect(classes(clue('physical', room('res-suite'), [{ kind: 'methodEvidence', methodId: 'blunt' }]))).not.toContain('method');
    // ...but the weapon gone from where it lived is.
    expect(
      classes(
        clue('physical', room('hotel-lobby'), [
          { kind: 'objectMissing', objectId: 'obj-bookend', fromPlace: 'hotel-lobby' },
          { kind: 'methodEvidence', methodId: 'blunt' },
        ]),
      ),
    ).toContain('method');
    const secret = { kind: 'secretExplained' as const, personId: 'p-s3', secretType: 'embezzling' };
    expect(classes(clue('overheard', room('walkup-flat'), [secret], 'corroboration'))).toContain('secret');
    expect(classes(clue('overheard', room('walkup-flat'), [secret], 'disqualifier'))).toContain('dead-end');
    expect(classes(clue('overheard', room('walkup-flat'), [secret], 'disqualifier'))).not.toContain('secret');
  });

  it('window: when the window narrows, on an anchor inside it where the clue names one', () => {
    const fresh = candidateThoughts({
      view,
      newClues: [view.findableById.get('c117') as Clue, view.findableById.get('c118') as Clue],
      foundBefore: ['c130'],
      foundAfter: opening,
      accountsBefore: [],
      accountsAfter: [],
    });
    const w = fresh.find((t) => t.cls === 'window');
    expect(w?.basis).toBe('anchor');
    expect(w?.anchorId).toBe('el-train');
    expect(w?.tick).toBe(8);
    // Nothing narrower: dead by eleven is already known.
    expect(classes(clue('morgue', room('res-suite'), [{ kind: 'victimDeadBy', tick: 10 }]))).not.toContain('window');
  });

  it('not-robbery: a murder’s room with nothing carried out, and never in a robbery', () => {
    expect(classes(clue('physical', room('res-suite'), [at('p-victim', 'res-suite', 8)]))).toContain('not-robbery');
    const robbery = buildView(generateCase(3, { difficulty: 2, type: 'robbery' }));
    const t = candidateThoughts({
      view: robbery,
      newClues: [clue('physical', room(robbery.sceneId), [at(robbery.victim.id, robbery.sceneId, 8)])],
      foundBefore: [],
      foundAfter: [],
      accountsBefore: [],
      accountsAfter: [],
    }).map((x) => x.cls);
    expect(t).not.toContain('not-robbery');
  });

  it('robbery-shape and goods: the thing gone, and where it went', () => {
    const robbery = buildView(generateCase(4, { difficulty: 2, type: 'robbery' }));
    const taken = robbery.kase.act.taken?.id as Id;
    const run = (c: Clue): ThoughtClass[] =>
      candidateThoughts({ view: robbery, newClues: [c], foundBefore: [], foundAfter: [c.id], accountsBefore: [], accountsAfter: [] }).map(
        (x) => x.cls,
      );
    const gone = { kind: 'objectMissing' as const, objectId: taken, fromPlace: robbery.sceneId };
    expect(run(clue('physical', room(robbery.sceneId), [gone], 'spine', robbery.sceneId))).toContain('robbery-shape');
    expect(run(clue('physical', room('office-over-tailor'), [gone], 'spine', 'office-over-tailor'))).toContain('goods');
  });

  it('last-seen and seen-after: a disappearance’s own facts, against the hour they were last seen', () => {
    const missing = buildView(generateCase(1, { difficulty: 2, type: 'missing' }));
    const last = missing.kase.victimBio.lastSeen?.tick as number;
    const run = (tick: number): ThoughtClass[] =>
      candidateThoughts({
        view: missing,
        newClues: [clue('overheard', said(missing.client.id), [at(missing.victim.id, 'hallam-vestibule', tick)])],
        foundBefore: [],
        foundAfter: [],
        accountsBefore: [],
        accountsAfter: [],
      }).map((x) => x.cls);
    expect(run(last)).toContain('last-seen');
    expect(run(last + 2)).toContain('seen-after');
    expect(run(last + 2)).not.toContain('last-seen');
    // A murder's victim placed is never either.
    expect(classes(clue('overheard', said('p-f2'), [at('p-victim', 'walkup-flat', 7)]))).not.toContain('last-seen');
  });

  it('context for a clue that establishes nothing, and nothing for a page with no find', () => {
    const noise = clue('overheard', said('p-f4'), [], 'noise');
    expect(
      thoughtsFor({ view, newClues: [noise], foundBefore: opening, foundAfter: [...opening, noise.id], accountsBefore: [], accountsAfter: [] }).map(
        (t) => t.cls,
      ),
    ).toEqual(['context']);
    expect(thoughtsFor({ view, newClues: [], foundBefore: opening, foundAfter: opening, accountsBefore: [], accountsAfter: [] })).toEqual([
      { cls: 'nothing', clueIds: [] },
    ]);
  });

  it('keeps two thoughts a page, the observer’s rider on top, in the golden’s order', () => {
    const c015 = view.findableById.get('c015') as Clue;
    const kept = thoughtsFor({
      view,
      newClues: [c015],
      foundBefore: [...opening, 't001'],
      foundAfter: [...opening, 't001', 'c015'],
      accountsBefore: [],
      accountsAfter: [],
    }).map((t) => t.cls);
    expect(kept).toEqual(['clears', 'observer-placed', 'unmentioned']);
  });

  it('view: the watcher watches, the client is the client, the notebook’s people are known', () => {
    const callahan = view.personById.get('p-f1');
    expect(callahan?.fixtureRole).toBe('bartender');
    expect(viewOf(view, callahan as never, false, opening, []).who).toBe('watcher');
    expect(viewOf(view, view.client, true, opening, []).who).toBe('client');
    expect(viewOf(view, view.personById.get('p-s1') as never, true, opening, []).who).toBe('known');
    expect(viewOf(view, view.personById.get('p-s4') as never, false, opening, []).who).toBe('stranger');
    // Caught in a lie: Grasso claims the third floor and a clue puts him in the suite.
    const c = clue('observation', said('p-f1'), [at('p-s1', 'res-suite', 8)]);
    const found = [...opening, c.id];
    const withClue = { ...view, findableById: new Map([...view.findableById, [c.id, c]]) } as CaseView;
    expect(viewOf(withClue, view.personById.get('p-s1') as never, true, found, ['p-s1']).lied).toBe(true);
    expect(viewOf(view, view.personById.get('p-s1') as never, true, opening, ['p-s1']).lied).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * §6 — the bridge.
 * ------------------------------------------------------------------ */

describe('M8 §6: bridges', () => {
  it('name only open leads, opened by the page, asked of their source, about somebody the notebook knows', () => {
    let bridges = 0;
    for (const w of sweep()) {
      for (let i = 1; i < w.states.length; i++) {
        const state = w.states[i] as RunState;
        const page = state.log[state.log.length - 1] as Page;
        for (const b of page.beats ?? []) {
          if (b.kind !== 'bridge') continue;
          bridges++;
          const target = w.view.findableById.get(b.targetId ?? '') as Clue;
          expect(state.found, `${w.label} p${page.n + 1}`).not.toContain(target.id);
          // Open: pointed at by a clue in hand, and not in hand itself.
          expect(state.found.some((id) => w.view.findableById.get(id)?.leadsTo.includes(target.id))).toBe(true);
          expect(page.found).toContain((b.clueIds ?? [])[0]);
          const [who, subject] = b.personIds ?? [];
          if (target.source.type === 'person') {
            expect(who).toBe(target.source.personId);
            if (subject) {
              const surname = w.view.personById.get(subject)?.surname ?? '§';
              const known =
                state.met.includes(subject) ||
                threadsFor(w.view, state.found).some((t) => t.label.includes(surname));
              expect(known, `${w.label} p${page.n + 1}: ${surname}`).toBe(true);
            }
          }
        }
        // At most one a page (§6).
        expect((page.beats ?? []).filter((b) => b.kind === 'bridge').length).toBeLessThanOrEqual(1);
      }
    }
    expect(bridges).toBeGreaterThan(100);
  });

  it('shortens the next errand when a bridge already named the lead', () => {
    let short = 0;
    for (const w of sweep()) {
      for (const page of w.final.log) {
        const errand = (page.beats ?? []).find((b) => b.kind === 'errand');
        if (errand?.tag !== 'short') continue;
        short++;
        const earlier = w.final.log.slice(0, page.n).flatMap((p) => p.beats ?? []);
        expect(earlier.some((b) => b.kind === 'bridge' && b.targetId === errand.targetId)).toBe(true);
      }
    }
    expect(short).toBeGreaterThan(10);
  });
});

/* ------------------------------------------------------------------ *
 * §3–§4 — the place and the people.
 * ------------------------------------------------------------------ */

describe('M8 §3–§4: presence', () => {
  it('keeps each person’s activity for the whole visit, and chooses again on the next', () => {
    let kept = 0;
    for (const w of [...sweep(), ...byType()]) {
      for (let i = 2; i < w.states.length; i++) {
        const before = w.states[i - 1] as RunState;
        const after = w.states[i] as RunState;
        const page = after.log[after.log.length - 1] as Page;
        const moved = page.shape === 'arrive' || page.shape === 'return';
        for (const [id, act] of Object.entries(before.scene?.activities ?? {})) {
          const now = after.scene?.activities[id];
          if (!now) continue;
          if (moved) {
            if (now.placeId === page.at) expect(now.visit).toBe(after.scene?.visit);
            continue;
          }
          if (act.visit !== before.scene?.visit) continue;
          kept++;
          expect(now.text, `${w.label} p${page.n + 1}`).toBe(act.text);
          expect(now.cardId).toBe(act.cardId);
          // It changes only by stopping: spoken to, they put it down.
          if (act.stopped) expect(now.stopped).toBe(true);
        }
      }
    }
    expect(kept).toBeGreaterThan(500);
  });

  it('names everyone present, with an activity, on every arrival', () => {
    for (const w of sweep()) {
      for (const page of w.final.log) {
        if (page.shape !== 'arrive' && page.shape !== 'return') continue;
        const presence = (page.beats ?? []).find((b) => b.kind === 'presence');
        expect(presence?.rendered).toBe(true);
        for (const id of presence?.personIds ?? []) {
          const surname = w.view.personById.get(id)?.surname as string;
          expect(presence?.text, `${w.label} p${page.n + 1}`).toContain(surname);
        }
      }
    }
  });

  it('puts the body at the scene in every trope that leaves one there, and keeps it there all night', () => {
    for (const tropeId of ['body-at-scene', 'locked-room', 'the-frame', 'body-moved']) {
      for (let seed = 1; seed <= 10; seed++) {
        const view = buildView(generateCase(seed, { difficulty: 2, tropeId }));
        const logs = [playOracle(view, 'Dashiell').state.log, playWandering(view, seed, 'Dashiell').state.log];
        const scenePages = logs.flatMap((log) =>
          log.filter((p) => p.at === view.startId && (p.shape === 'arrive' || p.shape === 'return')),
        );
        expect(scenePages.length, `${tropeId} ${seed}`).toBeGreaterThan(0);
        for (const page of scenePages) {
          const presence = (page.beats ?? []).find((b) => b.kind === 'presence');
          expect(presence?.tag, `${tropeId} ${seed} p${page.n + 1}`).toBe(page.shape === 'arrive' ? 'body' : 'body-again');
          expect(presence?.text).toContain(view.victim.surname);
          // "Nobody in here but the furniture" with a dead man on the rug is the bug.
          expect(presence?.text).not.toMatch(/nobody (?:in )?here but/i);
        }
      }
    }
  });

  it('establishes a place once, on the first visit, and gives a return one line', () => {
    for (const w of sweep()) {
      const established = new Set<string>();
      for (const page of w.final.log) {
        const est = (page.beats ?? []).some((b) => b.kind === 'establish');
        if (est) {
          expect(established.has(page.at), `${w.label} p${page.n + 1}`).toBe(false);
          established.add(page.at);
        }
        if (page.shape === 'return') expect((page.beats ?? []).some((b) => b.kind === 'return')).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * §7, §8, §10 — continuity, length, coverage, correspondence.
 * ------------------------------------------------------------------ */

describe('M8 §7 and §10: the text rules', () => {
  it('recognises what it forbids', () => {
    expect(isSubjectless('Smoothed her skirt and glanced once at the door.')).toBe(true);
    expect(isSubjectless('Kreuzer smoothed her skirt.')).toBe(false);
    expect(isSubjectless('“Took you long enough.”')).toBe(false);
    expect(epithetsIn('Kreuzer, the woman with the unlooked-at coin flip.', [])).toHaveLength(1);
    expect(epithetsIn('Kreuzer, the unlooked-at coin flip, at the far end.', [{ surname: 'Kreuzer', recall: 'the unlooked-at coin flip' }])).toHaveLength(1);
    // "Four in the morning" at 2:05 is the bug; at 4:10 it is the hour.
    expect(impliedSpan('Four in the morning is when a man reads his own handwriting.')).toEqual({ from: 240, to: 300 });
    expect(hourAgrees('Four in the morning is when a man reads his own handwriting.', 125)).toBe(false);
    expect(hourAgrees('Four in the morning is when a man reads his own handwriting.', 250)).toBe(true);
    expect(hourAgrees('The El went over at ten o’clock.', 125)).toBe(true);
    // The narration turns; the words inside the quotation marks are somebody's and do not.
    expect(pastTense('The rug is rucked up. “It is,” he says.')).toBe('The rug was rucked up. “It is,” he said.');
  });

  it('puts a clause on a name the first time a page names it', () => {
    const view = buildView(generateCase(3, { difficulty: 2 }));
    const people = nameables(view);
    const out = introduceNames('Coffin talked to the district attorney and Thorndike never spoke to Coffin again.', people, new Set());
    expect(out).toContain('Thorndike, the man who held the second mortgage,');
    expect(namesWithoutClause([out], people)).toEqual([]);
    expect(namesWithoutClause(['Thorndike was there.'], people)).toEqual(['Thorndike']);
  });

  it('covers every required beat on every night page, and breaks none of the rules, over forty seeds and every case type', () => {
    let pages = 0;
    let covered = 0;
    let required = 0;
    let written = 0;
    const issues: string[] = [];
    for (const w of [...sweep(), ...byType()]) {
      const r = checkRunCoverage(w.view, w.final);
      pages += r.pages;
      covered += r.covered;
      required += r.required;
      written += r.written;
      for (const i of r.issues) issues.push(`${w.label} p${i.page + 1} ${i.shape} ${i.rule}: ${i.detail}`);
    }
    // eslint-disable-next-line no-console
    console.log(`beat coverage: ${covered} of ${pages} night pages, ${written} of ${required} required beats written`);
    expect(issues.slice(0, 10)).toEqual([]);
    expect(covered).toBe(pages);
    expect(written).toBe(required);
  }, 120_000);

  it('traces every thought and every bridge, with zero correspondence violations', () => {
    const all: string[] = [];
    for (const w of [...sweep(), ...byType()]) {
      for (const v of checkRun(w.view, w.final)) all.push(`${w.label} ${v.where} ${v.rule}: ${v.detail}`);
    }
    expect(all.slice(0, 10)).toEqual([]);
  }, 120_000);

  it('never cuts past texture, and never runs a night page past the ceiling', () => {
    for (const w of sweep()) {
      for (const page of w.final.log.slice(1)) {
        for (const b of page.beats ?? []) if (b.required) expect(b.rendered).toBe(true);
        expect(wordsOnPage(page), `${w.label} p${page.n + 1}`).toBeLessThanOrEqual(NIGHT_CEILING);
      }
    }
  });

  it('never leaks the client’s goodbye onto the walk, and never tells the client not to leave town', () => {
    for (const w of sweep()) {
      for (const page of w.final.log.slice(1)) {
        const text = page.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join(' ');
        if (page.shape === 'arrive' || page.shape === 'return') expect(text).not.toMatch(/That[’']s where I[’']ll be/);
        expect(text).not.toMatch(/leave town/i);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * The golden's own route: seed 3, pages 2 to 5.
 * ------------------------------------------------------------------ */

describe('M8: the golden route, seed 3', () => {
  const view = buildView(generateCase(3, { difficulty: 2 }));
  const w = walk(view, ['go the suite', 'examine the suite', 'go the speakeasy', 'ask Kreuzer about Hanrahan'], 'golden');
  const page = (n: number): Page => w.final.log[n - 1] as Page;
  const tags = (p: Page, kind: string): (string | undefined)[] => (p.beats ?? []).filter((b) => b.kind === kind).map((b) => b.tag);

  it('page 2 is the arrival at the scene: errand, the place, the body, the two finds, the window, no bridge', () => {
    const p = page(2);
    expect(p.shape).toBe('arrive');
    expect(kinds(p)).toBe('errand establish presence find find thought');
    expect(tags(p, 'presence')).toEqual(['body']);
    expect(tags(p, 'thought')).toEqual(['window']);
  });

  it('page 3 is the search: carry, the rug and the chair, not a robbery, and the bridge to Hanrahan', () => {
    const p = page(3);
    expect(p.shape).toBe('search');
    expect(kinds(p)).toBe('errand act find thought bridge');
    expect(p.found).toEqual(['t001']);
    expect(tags(p, 'thought')).toEqual(['not-robbery']);
    const bridge = (p.beats ?? []).find((b) => b.kind === 'bridge');
    expect(bridge?.tag).toBe('victim');
    expect(bridge?.targetId).toBe('c015');
    expect(bridge?.personIds).toEqual(['p-s2', 'p-s3']);
  });

  it('page 4 is the speakeasy: the short errand, the place and its watcher, both people, and the view of each', () => {
    const p = page(4);
    expect(p.shape).toBe('arrive');
    expect(tags(p, 'errand')).toEqual(['short']);
    const presence = (p.beats ?? []).find((b) => b.kind === 'presence');
    expect(presence?.personIds).toEqual(['p-f1', 'p-s2']);
    expect(tags(p, 'thought')).toEqual(['view', 'view']);
    expect(w.final.scene?.activities['p-f1']?.text).toContain('Callahan');
  });

  it('page 5 is the question: carried, answered in her mouth, and the three thoughts the golden has', () => {
    const p = page(5);
    expect(p.shape).toBe('ask');
    expect(tags(p, 'errand')).toEqual([]);
    expect(tags(p, 'exchange')).toEqual(['carried']);
    expect(p.found).toEqual(['c015']);
    expect(tags(p, 'thought')).toEqual(['clears', 'observer-placed', 'unmentioned']);
    const text = p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
    expect(text).toContain('Sweeney had a secretary. Hanrahan.');
  });
});
