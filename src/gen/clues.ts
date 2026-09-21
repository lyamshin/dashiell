import {
  TICKS,
  clock,
  type Anchor,
  type Clue,
  type Fact,
  type GameObject,
  type Id,
  type Method,
  type Observation,
  type Person,
  type Tick,
} from './types.js';
import type { Cast } from './cast.js';
import type { Setting } from './setting.js';
import type { ScheduleBuild } from './schedule.js';
import { MOTIVE_BY_TYPE } from './data/motives.js';
import { SECRET_BY_TYPE } from './data/secrets.js';
import type { Rng } from './rng.js';

export function deriveObservations(cast: Cast, build: ScheduleBuild): Observation[] {
  const out: Observation[] = [];
  for (let t = 0; t < TICKS; t++) {
    for (const observer of cast.people) {
      const oPlace = (build.truth[observer.id] as (Id | null)[])[t];
      if (!oPlace) continue;
      const withheld = (build.lies[observer.id] as Tick[]).includes(t);
      for (const subject of cast.people) {
        if (subject.id === observer.id) continue;
        const sPlace = (build.truth[subject.id] as (Id | null)[])[t];
        if (!sPlace || sPlace !== oPlace) continue;
        out.push({ observerId: observer.id, subjectId: subject.id, place: sPlace, tick: t, withheld });
      }
    }
  }
  return out;
}

function runs(ticks: Tick[]): Tick[][] {
  const out: Tick[][] = [];
  for (const t of ticks) {
    const last = out[out.length - 1];
    if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
    else out.push([t]);
  }
  return out;
}

/** "9:00 PM" or "9:00 PM to 9:30 PM" — no preposition, so templates supply one. */
function bareSpan(ticks: Tick[]): string {
  const sorted = ticks.slice().sort((a, b) => a - b);
  const first = sorted[0] as Tick;
  const last = sorted[sorted.length - 1] as Tick;
  return first === last ? clock(first) : `${clock(first)} to ${clock(last)}`;
}

/**
 * Consecutive lied-about ticks that carry the same false alibi. A killer whose
 * cover secret abuts the murder block lies twice in a row about two different
 * rooms, and describing that as one run would put the denials in the wrong one.
 */
function claimBlocks(ticks: Tick[], claimed: (Id | null)[]): Tick[][] {
  const out: Tick[][] = [];
  for (const t of ticks) {
    const last = out[out.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev === t - 1 && claimed[prev] === claimed[t]) last.push(t);
    else out.push([t]);
  }
  return out;
}

function span(ticks: Tick[]): string {
  const first = ticks[0] as Tick;
  const last = ticks[ticks.length - 1] as Tick;
  return first === last ? `at ${clock(first)}` : `from ${clock(first)} to ${clock(last)}`;
}

export interface SecretBranchMaterial {
  personId: Id;
  secretType: string;
  hints: Clue[];
  traces: Clue[];
  disqualifiers: Clue[];
}

export interface CandidateSet {
  clues: Clue[];
  scene: Clue;
  morgue: Clue;
  client: Clue;
  material: SecretBranchMaterial[];
}

export interface ClueContext {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  build: ScheduleBuild;
  method: Method;
  methodEvidenceNote: string;
  sceneTrace: string;
  soundNote: string;
  objects: GameObject[];
  observations: Observation[];
  anchors: Anchor[];
  lowAnchor: Anchor;
  highAnchor: Anchor;
  coronerWindow: [Tick, Tick];
}

export function deriveCandidates(ctx: ClueContext): CandidateSet {
  const { cast, setting, build, method, observations, anchors, rng } = ctx;
  const M = build.murderTick;
  const L = build.murderPlaceId;

  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.name ?? id;
  const personById = (id: Id): Person => cast.people.find((p) => p.id === id) as Person;
  const foundAt = (id: Id): Id => (personById(id).foundAt ?? L) as Id;
  const truthful = (id: Id, t: Tick): boolean => !(build.lies[id] as Tick[]).includes(t);
  const at = (id: Id, t: Tick): Id | null => (build.truth[id] as (Id | null)[])[t] ?? null;

  const clues: Clue[] = [];
  let counter = 0;
  const add = (
    kind: Clue['kind'],
    source: Clue['source'],
    place: Id,
    establishes: Fact[],
    text: string,
    extra?: Partial<Pick<Clue, 'anchorId' | 'aboutSecretOf'>>,
  ): Clue => {
    counter += 1;
    const clue: Clue = {
      id: `c${String(counter).padStart(3, '0')}`,
      kind,
      source,
      establishes,
      text,
      place,
      leadsTo: [],
      role: 'noise',
    };
    if (extra?.anchorId !== undefined) clue.anchorId = extra.anchorId;
    if (extra?.aboutSecretOf !== undefined) clue.aboutSecretOf = extra.aboutSecretOf;
    clues.push(clue);
    return clue;
  };

  /* 1. What people saw and will repeat. --------------------------------- */
  const reportable = cast.people.filter((p) => p.kind !== 'fixture');
  const witnesses = cast.people.filter((p) => p.kind !== 'victim');
  for (const observer of witnesses) {
    for (const subject of reportable) {
      if (subject.id === observer.id) continue;
      const mine = observations.filter(
        (o) => o.observerId === observer.id && o.subjectId === subject.id && !o.withheld,
      );
      if (mine.length === 0) continue;
      const byPlace = new Map<Id, Tick[]>();
      for (const o of mine) {
        const list = byPlace.get(o.place) ?? [];
        list.push(o.tick);
        byPlace.set(o.place, list);
      }
      for (const [place, ticks] of byPlace) {
        for (const run of runs(ticks.slice().sort((a, b) => a - b))) {
          const facts: Fact[] = run.map((t) => ({
            kind: 'personAt' as const,
            personId: subject.id,
            place,
            tick: t,
          }));
          if (place === build.accessPlaceId && run.some((t) => t < M) && subject.kind === 'suspect') {
            facts.push({ kind: 'hadAccess', personId: subject.id, methodId: method.id });
          }
          add(
            'observation',
            { type: 'person', personId: observer.id, topic: subject.name },
            foundAt(observer.id),
            facts,
            `${observer.name} says ${subject.name} was at ${placeName(place)} ${span(run)}.`,
          );
        }
      }
    }
  }

  /* 1b. Roll calls: who was in the room, all at once. -------------------- */
  for (const teller of cast.people) {
    if (teller.kind === 'victim') continue;
    for (let t = 0; t < TICKS; t++) {
      if (!truthful(teller.id, t)) continue;
      const where = at(teller.id, t);
      if (!where) continue;
      const present = cast.suspects.filter((p) => p.id !== teller.id && at(p.id, t) === where);
      if (present.length < 2) continue;
      add(
        'observation',
        { type: 'person', personId: teller.id, topic: `who was there at ${clock(t)}` },
        foundAt(teller.id),
        present.map((p) => ({ kind: 'personAt' as const, personId: p.id, place: where, tick: t })),
        `${teller.name} runs through it: at ${clock(t)} there were ${present.map((p) => p.name).join(', ')} at ${placeName(where)}, and nobody else worth naming.`,
      );
    }
  }

  /* 2. Flat contradictions of a claimed alibi. --------------------------- */
  for (const liar of cast.suspects) {
    const lieTicks = build.lies[liar.id] as Tick[];
    if (lieTicks.length === 0) continue;
    for (const block of claimBlocks(lieTicks, build.claimed[liar.id] as (Id | null)[])) {
      const claimPlace = (build.claimed[liar.id] as (Id | null)[])[block[0] as Tick];
      if (!claimPlace) continue;
      const named = (build.companions[liar.id] as (Id | null)[])[block[0] as Tick];

      for (const denier of cast.people) {
        if (denier.id === liar.id || denier.id === cast.victim.id) continue;
        const usable = block.filter(
          (t) => truthful(denier.id, t) && at(denier.id, t) === claimPlace && at(liar.id, t) !== claimPlace,
        );
        if (usable.length === 0) continue;
        for (const run of runs(usable.slice().sort((a, b) => a - b))) {
          const facts: Fact[] = run.map((t) => ({
            kind: 'personNotAt' as const,
            personId: liar.id,
            place: claimPlace,
            tick: t,
          }));
          add(
            'observation',
            { type: 'person', personId: denier.id, topic: `${liar.name}’s account` },
            foundAt(denier.id),
            facts,
            `${denier.name} was at ${placeName(claimPlace)} ${span(run)} and says ${liar.name} was not.`,
          );
        }
      }

      if (named) {
        const companion = personById(named);
        const usable = block.filter(
          (t) => truthful(named, t) && at(named, t) !== null && at(named, t) !== claimPlace,
        );
        if (usable.length > 0) {
          const byPlace = new Map<Id, Tick[]>();
          for (const t of usable) {
            const cPlace = at(named, t) as Id;
            const list = byPlace.get(cPlace) ?? [];
            list.push(t);
            byPlace.set(cPlace, list);
          }
          for (const [cPlace, ticks] of byPlace) {
            for (const run of runs(ticks.slice().sort((a, b) => a - b))) {
              const facts: Fact[] = run.map((t) => ({
                kind: 'personNotAt' as const,
                personId: liar.id,
                place: claimPlace,
                tick: t,
              }));
              add(
                'observation',
                { type: 'person', personId: named, topic: `${liar.name}’s account` },
                foundAt(named),
                facts,
                `${liar.name} says ${companion.name} was there for it. ${companion.name} says otherwise: ${companion.name} was at ${placeName(cPlace)} ${span(run)}, nowhere near ${placeName(claimPlace)}.`,
              );
            }
          }
        }
      }
    }
  }

  /* 3. The scene and the body. ------------------------------------------- */
  const high = ctx.highAnchor;
  const scene = add(
    'scene',
    { type: 'place', placeId: L },
    L,
    [
      { kind: 'victimDeadBy', tick: M },
      { kind: 'methodEvidence', methodId: method.id },
    ],
    `${cast.victim.name} was found at ${placeName(L)}. ${ctx.sceneTrace} ${high.name[0]?.toUpperCase()}${high.name.slice(1)} came at ${clock(M)}, and ${high.sceneTiming}. That puts the killing in that half hour and no later.`,
    { anchorId: high.templateId },
  );

  const morgue = add(
    'morgue',
    { type: 'place', placeId: L },
    L,
    [
      { kind: 'timeOfDeath', ticks: [ctx.coronerWindow[0], ctx.coronerWindow[1]] },
      { kind: 'methodEvidence', methodId: method.id },
    ],
    `The coroner puts death between ${clock(ctx.coronerWindow[0])} and ${clock(ctx.coronerWindow[1])} — two hours of nothing useful. ${method.bodyEvidence}`,
  );

  /* 4. The weapon. -------------------------------------------------------- */
  const evidence = ctx.objects.find((o) => o.id === method.evidenceObjectId) as GameObject;
  add(
    'physical',
    { type: 'place', placeId: evidence.homePlace },
    evidence.homePlace,
    [
      { kind: 'objectMissing', objectId: evidence.id, fromPlace: evidence.homePlace },
      { kind: 'methodEvidence', methodId: method.id },
    ],
    `${evidence.name[0]?.toUpperCase()}${evidence.name.slice(1)} is gone from ${placeName(evidence.homePlace)}. ${ctx.methodEvidenceNote}`,
  );

  /* 5. The victim, alive, timed by an anchor. ---------------------------- */
  const low = ctx.lowAnchor;
  const lowPlace = build.victimSeenPlace;
  const lowWitnesses = cast.people.filter(
    (p) =>
      p.kind !== 'victim' &&
      at(p.id, build.victimSeenAt) === lowPlace &&
      truthful(p.id, build.victimSeenAt),
  );
  for (const w of lowWitnesses) {
    add(
      'anchor',
      { type: 'person', personId: w.id, topic: `${cast.victim.name} that evening` },
      foundAt(w.id),
      [
        { kind: 'victimAliveAt', tick: build.victimSeenAt },
        { kind: 'personAt', personId: cast.victim.id, place: lowPlace, tick: build.victimSeenAt },
      ],
      `${w.name} puts ${cast.victim.name} at ${placeName(lowPlace)} ${low.timing}, which was ${clock(build.victimSeenAt)}, and alive enough to argue about the weather.`,
      { anchorId: low.templateId },
    );
  }

  /* 6. What the neighbours heard, timed by the same anchor as the scene. -- */
  const nearPlaces = new Set<Id>(setting.nearScene);
  for (const p of cast.people) {
    if (p.id === cast.killer.id || p.id === cast.victim.id) continue;
    const place = at(p.id, M);
    if (!place || !nearPlaces.has(place)) continue;
    if (!truthful(p.id, M)) continue;
    add(
      'anchor',
      { type: 'person', personId: p.id, topic: 'the noise that evening' },
      foundAt(p.id),
      [
        { kind: 'noiseAt', place: L, tick: M },
        { kind: 'victimDeadBy', tick: M },
        { kind: 'methodEvidence', methodId: method.id },
      ],
      `${p.name} was at ${placeName(place)} at ${clock(M)} and heard ${ctx.soundNote} from the direction of ${placeName(L)}, ${high.timing}.`,
      { anchorId: high.templateId },
    );
  }

  /* 7. The anchors themselves. -------------------------------------------- */
  for (const anchor of anchors) {
    for (const trace of anchor.traces) {
      if (trace.kind === 'sighting') {
        for (const [i, t] of anchor.ticks.entries()) {
          const place = anchor.route ? (anchor.route[i] as Id) : (anchor.placeId as Id | undefined);
          if (!place) continue;
          const present = cast.people.filter(
            (p) => p.kind === 'suspect' && at(p.id, t) === place,
          );
          if (present.length === 0) continue;
          const facts: Fact[] = present.map((p) => ({
            kind: 'personAt' as const,
            personId: p.id,
            place,
            tick: t,
          }));
          const reporter = cast.beatCop && anchor.route ? cast.beatCop : null;
          const source: Clue['source'] = reporter
            ? { type: 'person', personId: reporter.id, topic: `the ${clock(t)} round` }
            : { type: 'place', placeId: place };
          add(
            'anchor',
            source,
            reporter ? foundAt(reporter.id) : place,
            facts,
            `${anchor.name[0]?.toUpperCase()}${anchor.name.slice(1)} at ${clock(t)} puts ${present.map((p) => p.name).join(', ')} at ${placeName(place)}.`,
            { anchorId: anchor.templateId },
          );
        }
        continue;
      }
      if (trace.kind === 'mark') {
        for (const [i, t] of anchor.ticks.entries()) {
          const place = anchor.route ? (anchor.route[i] as Id) : anchor.placeId;
          const marked = cast.people.filter((p) => {
            if (p.kind !== 'suspect') return false;
            const where = at(p.id, t);
            if (!where) return false;
            return place === undefined ? true : where === place;
          });
          for (const p of marked.slice(0, 2)) {
            const where = at(p.id, t) as Id;
            add(
              'physical',
              { type: 'place', placeId: where },
              where,
              [{ kind: 'personAt', personId: p.id, place: where, tick: t }],
              `${p.name} carries the mark of it: ${trace.description}. That fixes ${p.name} at ${placeName(where)} at ${clock(t)}, when ${anchor.name} happened.`,
              { anchorId: anchor.templateId },
            );
          }
        }
        continue;
      }
      if (trace.kind === 'knowledge' && anchor.placeId) {
        const place = anchor.placeId;
        for (const t of anchor.ticks) {
          for (const p of cast.suspects) {
            const claim = (build.claimed[p.id] as (Id | null)[])[t];
            if (claim !== place || at(p.id, t) === place) continue;
            add(
              'anchor',
              { type: 'person', personId: p.id, topic: `${anchor.name}` },
              foundAt(p.id),
              [{ kind: 'personNotAt', personId: p.id, place, tick: t }],
              `${p.name} claims to have been at ${placeName(place)} at ${clock(t)} but cannot say that ${trace.description}, which everybody there can.`,
              { anchorId: anchor.templateId },
            );
          }
        }
      }
    }
  }

  /* 8. Motive, two sources each. ------------------------------------------ */
  const motiveHolders = cast.suspects.filter((p) => p.motive);
  for (const p of motiveHolders) {
    const template = MOTIVE_BY_TYPE[p.motive?.type as string];
    if (!template) continue;
    const fill = (s: string): string =>
      s.split('{V}').join(cast.victim.name).split('{P}').join(p.name);
    const residence = setting.places.find((pl) => pl.isResidence)?.id ?? L;
    const letterPlace = rng.chance(0.6) ? residence : rng.pick(setting.places).id;
    add(
      'document',
      { type: 'place', placeId: letterPlace },
      letterPlace,
      [{ kind: 'hasMotive', personId: p.id, motiveType: p.motive?.type as string }],
      `Found at ${placeName(letterPlace)}: ${fill(template.letter)}`,
    );
    const speakerPool = cast.people.filter(
      (q) => q.id !== p.id && q.kind !== 'victim' && (q.kind === 'fixture' || q.kind === 'suspect'),
    );
    const speaker = rng.pick(speakerPool);
    add(
      'overheard',
      { type: 'person', personId: speaker.id, topic: `${p.name} and ${cast.victim.name}` },
      foundAt(speaker.id),
      [{ kind: 'hasMotive', personId: p.id, motiveType: p.motive?.type as string }],
      `${speaker.name} says ${fill(template.overheard)}`,
    );
  }

  /* 9. The client. --------------------------------------------------------- */
  const pointedAt =
    motiveHolders.find((p) => p.id !== cast.client.id && p.isKiller && rng.chance(0.5)) ??
    motiveHolders.find((p) => p.id !== cast.client.id) ??
    (motiveHolders[0] as Person);
  const client = add(
    'client',
    { type: 'person', personId: cast.client.id, topic: 'why I was hired' },
    foundAt(cast.client.id),
    [{ kind: 'hasMotive', personId: pointedAt.id, motiveType: pointedAt.motive?.type as string }],
    `${cast.client.name} hired us. ${cast.client.name} wants it known that ${pointedAt.name} ${pointedAt.motive?.description ?? 'had reason'}, and would rather we started there.`,
  );

  /* 10. Everything the innocents are hiding. ------------------------------- */
  const material: SecretBranchMaterial[] = [];
  for (const p of cast.innocents) {
    const secret = build.secrets[p.id];
    if (!secret) continue;
    const template = SECRET_BY_TYPE[secret.type];
    if (!template) continue;
    const ticks = secret.cells.map((c) => c.tick);
    const place = (secret.cells[0]?.place ?? foundAt(p.id)) as Id;
    const partner = secret.partnerId ? personById(secret.partnerId) : null;
    const fill = (s: string): string =>
      s
        .split('{P}').join(p.name)
        .split('{Q}').join(partner?.name ?? 'somebody')
        .split('{L}').join(placeName(place))
        .split('{T}').join(ticks.length > 0 ? bareSpan(ticks) : 'that evening');

    const hintTellers = cast.people.filter(
      (q) =>
        q.id !== p.id &&
        q.kind !== 'victim' &&
        (q.kind === 'fixture' || ticks.every((t) => truthful(q.id, t))),
    );
    const hints: Clue[] = template.hints.map((h, i) => {
      const teller = hintTellers[(i + counter) % Math.max(1, hintTellers.length)] as Person;
      return add(
        'overheard',
        { type: 'person', personId: teller.id, topic: `${p.name}` },
        foundAt(teller.id),
        [],
        `${teller.name} on ${p.name}: ${fill(h)}`,
        { aboutSecretOf: p.id },
      );
    });
    const traces: Clue[] = template.traces.map((tr) =>
      add('physical', { type: 'place', placeId: place }, place, [], fill(tr), {
        aboutSecretOf: p.id,
      }),
    );
    const disqualifiers: Clue[] = template.disqualifiers.map((d) => {
      const facts: Fact[] = [{ kind: 'secretExplained', personId: p.id, secretType: secret.type }];
      for (const cell of secret.cells) {
        facts.push({ kind: 'personAt', personId: p.id, place: cell.place, tick: cell.tick });
      }
      return add('overheard', { type: 'place', placeId: place }, place, facts, fill(d), {
        aboutSecretOf: p.id,
      });
    });
    material.push({ personId: p.id, secretType: secret.type, hints, traces, disqualifiers });
  }

  return { clues, scene, morgue, client, material };
}
