import {
  isMundane,
  TICKS,
  clock,
  type Act,
  type Anchor,
  type ClientBrief,
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

/**
 * Deriving the candidate pool.
 *
 * Two rules from M2b govern everything below.
 *
 * **One subject per clue.** No roll call. A watcher who can name five people
 * in his bar at half past nine is five questions, not one, and the clue for
 * each of them names only that one. This is the change that makes the spine
 * long enough for the budget to bite.
 *
 * **Clues state facts.** What somebody saw, heard or found; what a document
 * says. Never what it adds up to. "The lesson overhead stopped at 9:30 PM" is
 * a clue. "That puts the killing in that half hour" is the player's job, and
 * the truth sheet's deduction path.
 */

export function deriveObservations(cast: Cast, build: ScheduleBuild): Observation[] {
  const out: Observation[] = [];
  // M5 §2.1: a missing person's true schedule carries on after the tick, and
  // nobody observes it. The one who took them is the exception, and that one
  // observation is the trope's signature clue rather than a derived one.
  const goneAfter = build.whereabouts !== undefined ? build.murderTick : undefined;
  for (let t = 0; t < TICKS; t++) {
    for (const observer of cast.people) {
      const oPlace = (build.truth[observer.id] as (Id | null)[])[t];
      if (!oPlace) continue;
      const withheld = (build.lies[observer.id] as Tick[]).includes(t);
      for (const subject of cast.people) {
        if (subject.id === observer.id) continue;
        if (goneAfter !== undefined && subject.id === cast.victim.id && t > goneAfter) continue;
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
 *
 * The companion splits a block too: two abutting lies can name the same room
 * and only one of them name somebody who was supposedly there, and reading the
 * companion off the first tick of the merged block loses the other one.
 */
function claimBlocks(
  ticks: Tick[],
  claimed: (Id | null)[],
  companions: (Id | null)[],
): Tick[][] {
  const out: Tick[][] = [];
  for (const t of ticks) {
    const last = out[out.length - 1];
    const prev = last?.[last.length - 1];
    const same =
      prev !== undefined && claimed[prev] === claimed[t] && companions[prev] === companions[t];
    if (last && prev === t - 1 && same) last.push(t);
    else out.push([t]);
  }
  return out;
}

function span(ticks: Tick[]): string {
  const first = ticks[0] as Tick;
  const last = ticks[ticks.length - 1] as Tick;
  return first === last ? `at ${clock(first)}` : `from ${clock(first)} to ${clock(last)}`;
}

function cap(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase()}${text.slice(1)}`;
}

/**
 * The raw material for one noise branch: one secret *activity*, however many
 * people are in it. An affair is one activity and one branch, with a single
 * disqualifier that clears both partners at once.
 */
export interface SecretBranchMaterial {
  /** Everybody the activity covers. One entry, or two for an affair. */
  personIds: Id[];
  secretType: string;
  /** Leads worth opening a branch with, best first. Anchor knowledge tests. */
  leadIns: Clue[];
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
  /** The scene-timing anchor buried the noise: nobody heard anything. */
  soundMasked: boolean;
  /** M5: what the case is about. The scene report and the client clue read it. */
  act: Act;
  /** M5: the client's brief. The `client` clue states its pointer. */
  brief: ClientBrief;
  /**
   * M7: knowledge tests arrive at Hard-boiled. Absent is true, as before.
   * Without them a liar who claims a room with something memorable in it is
   * never asked what it was.
   */
  knowledgeTests?: boolean;
  /**
   * M7: the client's pointer states a motive. Absent is true. Below Medium it
   * never does, so the client clue puts only the name on the table.
   */
  pointerMotive?: boolean;
  /** M9: testimony replaces the sightings and the denials; skip them. */
  m9?: boolean;
}

export function deriveCandidates(ctx: ClueContext): CandidateSet {
  const { cast, setting, build, method, observations, anchors, rng } = ctx;
  const M = build.murderTick;
  const L = build.murderPlaceId;

  /** Places are named short everywhere but the sheet's Places section. */
  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.shortName ?? id;
  const personById = (id: Id): Person => cast.people.find((p) => p.id === id) as Person;
  /** People are named by surname everywhere but Dramatis Personae. */
  const who = (id: Id): string => personById(id)?.surname ?? id;
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

  /* 1. What people saw and will repeat. One subject per clue. ------------ */
  const reportable = cast.people.filter((p) => p.kind !== 'fixture');
  const witnesses = cast.people.filter((p) => p.kind !== 'victim');
  // M9 deals testimony instead (logic/rules.ts); nothing below draws from the rng.
  for (const observer of ctx.m9 ? [] : witnesses) {
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
            { type: 'person', personId: observer.id, topic: who(subject.id) },
            foundAt(observer.id),
            facts,
            `${who(observer.id)} says ${who(subject.id)} was at ${placeName(place)} ${span(run)}.`,
          );
        }
      }
    }
  }

  /* 2. Flat contradictions of a claimed alibi. --------------------------- */
  for (const liar of ctx.m9 ? [] : cast.suspects) {
    const lieTicks = build.lies[liar.id] as Tick[];
    if (lieTicks.length === 0) continue;
    const blocks = claimBlocks(
      lieTicks,
      build.claimed[liar.id] as (Id | null)[],
      build.companions[liar.id] as (Id | null)[],
    );
    for (const block of blocks) {
      const claimPlace = (build.claimed[liar.id] as (Id | null)[])[block[0] as Tick];
      if (!claimPlace) continue;
      const named = (build.companions[liar.id] as (Id | null)[])[block[0] as Tick];

      for (const denier of cast.people) {
        if (denier.id === liar.id || denier.id === cast.victim.id) continue;
        if (denier.id === named) continue;
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
            { type: 'person', personId: denier.id, topic: `${who(liar.id)}’s account` },
            foundAt(denier.id),
            facts,
            `${who(denier.id)} was at ${placeName(claimPlace)} ${span(run)} and says ${who(liar.id)} was not.`,
          );
        }
      }

      /*
       * The named companion. This is the strongest contradiction there is,
       * because it comes out of the alibi itself — and it does not need the
       * companion to be truthful about her own evening. Denying that you were
       * with somebody admits nothing about where you were, so a liar will say
       * it as readily as anybody. That is why this clue is a `denial` and not
       * an `observation`: the observation rules do not apply to it.
       */
      if (named && named !== cast.victim.id) {
        const usable = block.filter((t) => at(liar.id, t) !== claimPlace);
        if (usable.length > 0) {
          for (const run of runs(usable.slice().sort((a, b) => a - b))) {
            const facts: Fact[] = run.map((t) => ({
              kind: 'personNotAt' as const,
              personId: liar.id,
              place: claimPlace,
              tick: t,
            }));
            const elsewhere = run.every(
              (t) => truthful(named, t) && at(named, t) !== null && at(named, t) !== claimPlace,
            );
            const cPlace = at(named, run[0] as Tick);
            const text = elsewhere && cPlace
              ? `${who(liar.id)} names ${who(named)} as the company for it. ${who(named)} was at ` +
                `${placeName(cPlace)} ${span(run)}, and says ${who(liar.id)} was not there.`
              : `${who(liar.id)} names ${who(named)} as the company for ${placeName(claimPlace)} ` +
                `${span(run)}. ${who(named)} says they were not together that evening.`;
            add(
              'denial',
              { type: 'person', personId: named, topic: `${who(liar.id)}’s account` },
              foundAt(named),
              facts,
              text,
            );
          }
        }
      }
    }
  }

  /* 3. The scene and what was found there. ------------------------------- *
   *
   * M5 §2.1: one report, three cases. A body, an empty shelf, or a room with
   * the lamp still burning in it. The facts it establishes are the same three
   * in every case, because the machinery behind them is the same machinery.
   */
  const high = ctx.highAnchor;
  const act = ctx.act;
  const V = who(cast.victim.id);
  const foundPlace = act.bodyFoundAt ?? L;
  const claimed = placeName(act.claimedAt ?? build.victimSeenPlace);
  const sceneOpening =
    act.type === 'robbery' || act.type === 'lost-item'
      ? `${cap(act.taken?.name ?? 'the box')} is gone from ${placeName(L)}, which is ${V}’s.`
      : act.type === 'lost-pet'
        ? `${cap(act.taken?.name ?? 'the animal')} is gone from ${placeName(L)}, which is ${V}’s, and has not come home.`
        : act.type === 'affair'
          ? `${V} said ${cast.victim.gender === 'f' ? 'she' : 'he'} would be at ${claimed} all evening, and was not there for the whole of it.`
          : act.type === 'missing'
        ? `${V} is not at ${placeName(L)} and has not been since that evening.`
        : `${V} was found at ${placeName(foundPlace)}.`;
  const scene = add(
    'scene',
    { type: 'place', placeId: L },
    L,
    [
      { kind: 'victimDeadBy', tick: M },
      { kind: 'methodEvidence', methodId: method.id },
    ],
    // M14: an affair's report is handed over where they said they would be,
    // and the room the pair of them were in is not described until it is found.
    act.type === 'affair'
      ? `${sceneOpening} ${aliveFact(high.sceneFact).split('{T}').join(clock(M))}`
      : `${sceneOpening} ${ctx.sceneTrace} ${(isMundane(act.type) ? aliveFact(high.sceneFact) : high.sceneFact).split('{T}').join(clock(M))}`,
    { anchorId: high.templateId },
  );

  const windowText = `${clock(ctx.coronerWindow[0])} and ${clock(ctx.coronerWindow[1])}`;
  /*
   * Hone 3 §5. "Two hours of nothing useful" used to be here as well as in
   * `body-at-scene`'s coroner given, so on those seeds the client said it on
   * page one and the note on the table said it again on page two — the same
   * six words, in two different mouths, about the same window.
   *
   * It is the client's. It is a judgement about whether the hour helps, which
   * is what somebody hiring a detective is thinking about, and a coroner
   * pencilling the back of an intake form is not. So the note states the
   * window and stops, in all three shapes: a stock phrase is worth keeping
   * once and is worth nothing twice.
   */
  // M7: the coroner who can name the half hour says it as one.
  const exact = ctx.coronerWindow[0] === ctx.coronerWindow[1];
  const morgueOpening = exact
    ? act.type === 'murder'
      ? `The coroner puts death at ${clock(ctx.coronerWindow[0])}.`
      : act.type === 'lost-pet' || act.type === 'lost-item'
        ? `It went at ${clock(ctx.coronerWindow[0])}, as near as anybody in the house can say.`
        : act.type === 'affair'
          ? `The half hour that matters is ${clock(ctx.coronerWindow[0])}, by ${who(cast.client.id)}’s own reckoning.`
          : act.type === 'robbery'
        ? `The desk sergeant's report puts it at ${clock(ctx.coronerWindow[0])}.`
        : `Nobody can put it closer than ${clock(ctx.coronerWindow[0])}.`
    : act.type === 'murder'
      ? `The coroner puts death between ${windowText}.`
      : act.type === 'lost-pet' || act.type === 'lost-item'
        ? `It went between ${windowText}, as near as anybody in the house can say.`
        : act.type === 'affair'
          ? `It was between ${windowText}, by ${who(cast.client.id)}’s own reckoning.`
          : act.type === 'robbery'
        ? `The desk sergeant's report puts it between ${windowText}.`
        : `Nobody can put it closer than between ${windowText}.`;
  const morgue = add(
    'morgue',
    { type: 'place', placeId: L },
    L,
    [
      { kind: 'timeOfDeath', ticks: [ctx.coronerWindow[0], ctx.coronerWindow[1]] },
      { kind: 'methodEvidence', methodId: method.id },
    ],
    `${morgueOpening} ${method.bodyEvidence}`,
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
    `${cap(evidence.name)} is gone from ${placeName(evidence.homePlace)}. ${ctx.methodEvidenceNote}`,
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
      { type: 'person', personId: w.id, topic: `${who(cast.victim.id)} that evening` },
      foundAt(w.id),
      [
        { kind: 'victimAliveAt', tick: build.victimSeenAt },
        { kind: 'personAt', personId: cast.victim.id, place: lowPlace, tick: build.victimSeenAt },
      ],
      `${who(w.id)} puts ${V} at ${placeName(lowPlace)} ${low.timing}, which was ${clock(build.victimSeenAt)}, ${
        act.type === 'murder'
          ? 'and alive enough to argue about the weather'
          : act.type === 'affair'
            ? 'and looking at the clock'
            : act.type === 'lost-pet' || act.type === 'lost-item'
              ? 'and everything at home was where it should be then'
          : act.type === 'robbery'
            ? 'and nothing had been touched then'
            : 'and in no hurry to be anywhere'
      }.`,
      { anchorId: low.templateId },
    );
  }

  /* 6. What the neighbours heard. ----------------------------------------
   *
   * Only when the anchor timing the scene did not bury it. A radio turned up
   * for a fight card and five people hearing the shot through it cannot both
   * be true, and M2 printed both in the same case.
   */
  if (!ctx.soundMasked) {
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
        `${who(p.id)} was at ${placeName(place)} at ${clock(M)} and heard ${ctx.soundNote} from the direction of ${placeName(L)}, ${high.highTiming}.`,
        { anchorId: high.templateId },
      );
    }
  }

  /* 7. The anchors themselves. -------------------------------------------- */
  /** Innocent liars caught out by an anchor, filed under whose branch they head. */
  const knowledgeTests = new Map<Id, Clue[]>();
  for (const anchor of anchors) {
    for (const trace of anchor.traces) {
      if (trace.kind === 'sighting') {
        for (const [i, t] of anchor.ticks.entries()) {
          const place = anchor.route ? (anchor.route[i] as Id) : (anchor.placeId as Id | undefined);
          if (!place) continue;
          const present = cast.people.filter((p) => p.kind === 'suspect' && at(p.id, t) === place);
          const reporter = cast.beatCop && anchor.route ? cast.beatCop : null;
          // One name per clue. The cop who walks past a bar and sees four
          // people in it is four answers, and the player pays for each.
          for (const subject of present) {
            const source: Clue['source'] = reporter
              ? { type: 'person', personId: reporter.id, topic: who(subject.id) }
              : { type: 'place', placeId: place };
            add(
              'anchor',
              source,
              reporter ? foundAt(reporter.id) : place,
              [{ kind: 'personAt', personId: subject.id, place, tick: t }],
              reporter
                ? `${who(reporter.id)} came round at ${clock(t)} and had ${who(subject.id)} at ${placeName(place)}.`
                : `${cap(anchor.name)} was at ${clock(t)}, and ${who(subject.id)} was at ${placeName(place)} for it.`,
              { anchorId: anchor.templateId },
            );
          }
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
              `${who(p.id)} still carries it: ${trace.description}. ${cap(anchor.name)} was at ${clock(t)}, at ${placeName(where)}.`,
              { anchorId: anchor.templateId },
            );
          }
        }
        continue;
      }
      if (trace.kind === 'knowledge' && anchor.placeId && ctx.knowledgeTests !== false) {
        const place = anchor.placeId;
        for (const t of anchor.ticks) {
          for (const p of cast.suspects) {
            const claim = (build.claimed[p.id] as (Id | null)[])[t];
            if (claim !== place || at(p.id, t) === place) continue;
            // The payoff of the anchor system: a liar who claims a room with
            // something memorable in it has to know the memorable thing.
            //
            // Against the killer this is a route to the contradiction, and the
            // selector reaches for it on its own. Against an innocent it is
            // the head of that innocent's noise branch: the most damning thing
            // in the hand until the disqualifier says what the lie was for.
            const innocent = p.id !== cast.killer.id;
            const clue = add(
              'anchor',
              { type: 'person', personId: p.id, topic: anchor.name },
              foundAt(p.id),
              [{ kind: 'personNotAt', personId: p.id, place, tick: t }],
              `${who(p.id)} claims ${placeName(place)} at ${clock(t)}, which is when ${anchor.name} was on. ` +
                `Asked about it, ${who(p.id)} cannot say that ${trace.description} — and everybody who was there can.`,
              innocent
                ? { anchorId: anchor.templateId, aboutSecretOf: p.id }
                : { anchorId: anchor.templateId },
            );
            if (innocent) {
              const list = knowledgeTests.get(p.id) ?? [];
              list.push(clue);
              knowledgeTests.set(p.id, list);
            }
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
    // M5 §3: the object of a motive is named, here as everywhere else.
    const object = cast.motiveObject[p.id]?.name;
    const fill = (s: string): string =>
      s
        .split('{V}').join(who(cast.victim.id))
        .split('{P}').join(who(p.id))
        .split('{O}').join(object ?? 'somebody');
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
      { type: 'person', personId: speaker.id, topic: `${who(p.id)} and ${who(cast.victim.id)}` },
      foundAt(speaker.id),
      [{ kind: 'hasMotive', personId: p.id, motiveType: p.motive?.type as string }],
      `${who(speaker.id)} says ${fill(template.overheard)}`,
    );
  }

  /* 9. The client. --------------------------------------------------------- *
   *
   * M5 §1.4: the opening exchange is the briefing now, and the briefing is
   * derived. The clue kind stays, because it still carries the one fact the
   * client puts on the table, and because the engine reaches for it by kind.
   */
  const brief = ctx.brief;
  const pointedAt =
    (cast.people.find((p) => p.id === brief.points.personId) as Person | undefined) ??
    motiveHolders.find((p) => p.id !== cast.client.id) ??
    (motiveHolders[0] as Person);
  // The pointer is only a fact when it is a motive. A client who points at
  // their own red herring puts nothing on the table but the name.
  const clientFacts: Fact[] =
    pointedAt.motive && ctx.pointerMotive !== false
      ? [{ kind: 'hasMotive', personId: pointedAt.id, motiveType: pointedAt.motive.type }]
      : [];
  const client = add(
    'client',
    { type: 'person', personId: cast.client.id, topic: 'why I was hired' },
    foundAt(cast.client.id),
    clientFacts,
    // One sentence, in the shape it has always had, because the office page
    // strips this exact opening off it to make the hiring line. The rest of
    // what the client says is the briefing now, and the briefing is not a clue.
    `${who(cast.client.id)} hired us, and wants it known that ${brief.points.reason.replace(/\.$/, '')}, and would rather we started there.`,
  );

  /* 10. Everything the innocents are hiding. -------------------------------
   *
   * One activity, one pile of material, however many people share it. M2 dealt
   * an affair twice — once per partner — and the two branches ended in the
   * same sentence with the names swapped.
   */
  const material: SecretBranchMaterial[] = [];
  const handled = new Set<Id>();
  for (const p of cast.innocents) {
    if (handled.has(p.id)) continue;
    const secret = build.secrets[p.id];
    if (!secret) continue;
    const template = SECRET_BY_TYPE[secret.type];
    if (!template) continue;
    handled.add(p.id);

    // A partner who is another suspect shares the activity, so they share the
    // branch. A partner who is the victim does not: he has no secret of his own.
    const partner =
      secret.partnerId && secret.partnerId !== cast.victim.id
        ? (cast.innocents.find((q) => q.id === secret.partnerId) ?? null)
        : null;
    if (partner) handled.add(partner.id);
    const personIds = partner ? [p.id, partner.id] : [p.id];

    const ticks = secret.cells.map((c) => c.tick);
    const place = (secret.cells[0]?.place ?? foundAt(p.id)) as Id;
    const fill = (s: string): string =>
      s
        .split('{P}').join(who(p.id))
        .split('{Q}').join(partner ? who(partner.id) : secret.partnerId ? who(secret.partnerId) : 'somebody')
        .split('{V}').join(who(cast.victim.id))
        .split('{L}').join(placeName(place))
        .split('{T}').join(ticks.length > 0 ? bareSpan(ticks) : 'that evening');

    const hintTellers = cast.people.filter(
      (q) =>
        !personIds.includes(q.id) &&
        q.kind !== 'victim' &&
        (q.kind === 'fixture' || ticks.every((t) => truthful(q.id, t))),
    );
    const hints: Clue[] = template.hints.map((h, i) => {
      const teller = hintTellers[(i + counter) % Math.max(1, hintTellers.length)] as Person;
      return add(
        'overheard',
        { type: 'person', personId: teller.id, topic: who(p.id) },
        foundAt(teller.id),
        [],
        `${who(teller.id)} on ${who(p.id)}: ${fill(h)}`,
        { aboutSecretOf: p.id },
      );
    });
    const traces: Clue[] = template.traces.map((tr) =>
      add('physical', { type: 'place', placeId: place }, place, [], fill(tr), {
        aboutSecretOf: p.id,
      }),
    );
    // Anything an anchor already caught this person out on belongs to their
    // branch as well, and it is the best lead in it.
    const caught: Clue[] = personIds.flatMap((id) => knowledgeTests.get(id) ?? []);
    // One disqualifier, clearing everybody the activity covers.
    const disqualifiers: Clue[] = template.disqualifiers.map((d) => {
      const facts: Fact[] = [];
      for (const id of personIds) {
        facts.push({ kind: 'secretExplained', personId: id, secretType: secret.type });
        for (const cell of (build.secrets[id]?.cells ?? secret.cells)) {
          facts.push({ kind: 'personAt', personId: id, place: cell.place, tick: cell.tick });
        }
      }
      return add('overheard', { type: 'place', placeId: place }, place, facts, fill(d), {
        aboutSecretOf: p.id,
      });
    });
    material.push({ personIds, secretType: secret.type, leadIns: caught, hints, traces, disqualifiers });
  }

  return { clues, scene, morgue, client, material };
}

/**
 * M14: an anchor's fact about the scene, for a case with no body in it. The
 * rain's says the wet stopped spreading "by the time the body was found".
 */
function aliveFact(fact: string): string {
  return fact.split('by the time the body was found').join('by the time anybody looked');
}
