/**
 * M9 — the rule pool.
 *
 * Everything a tiered case can put in the notebook, as clues. Four families:
 *
 * 1. **Testimony**: one clue for every person who can be asked, about every
 *    suspect and the victim. Derived from the truth, the acquaintance graph
 *    and the lie rule, never a stock non-answer. A witness who knows the
 *    person by name says where they saw them (clock time, or an anchor at
 *    Soft-boiled up), and a posted witness says where they did not; one who
 *    saw nothing says so; one who knows only the face, or nothing, says that.
 *    A witness never says anything false about anybody else. The half hours
 *    they are lying about themselves, they leave out.
 * 2. **Accounts**: each suspect's own evening, span by span. Soft, and false
 *    where the lie rule allows.
 * 3. **Pieces** a person volunteers or a place holds: a stranger's
 *    description of somebody they did not know; a watcher's absences and
 *    counts at their own door; when an anchor happened; the conditional
 *    ("anybody there knew how the fight ended") and the test that meets it.
 * 4. **What M7 already dealt** that is still true to the model: the scene,
 *    the coroner, the client, the weapon, the motives, what the neighbours
 *    heard, and the innocents' secrets as noise.
 *
 * Every clue carries `rule`, its one plain line for the notebook.
 */

import { TICKS, clock, speakTimes, type Anchor, type CaseType, type Clue, type Fact, type Id, type Person, type Tick } from '../types.js';
import type { Cast } from '../cast.js';
import type { Setting } from '../setting.js';
import type { CandidateSet, SecretBranchMaterial } from '../clues.js';
import type { DeductionDials } from '../shape.js';
import type { Rng } from '../rng.js';
import { MOTIVE_BY_TYPE } from '../data/motives.js';
import { METHOD_TEMPLATES } from '../data/methods.js';
import type { Schedule9Build } from './schedule.js';
import { ambiguousDescription, canName, describeAs, edgeOf, genderOf, strengthOf } from './acquaint.js';
import { ruleLine, type LineNames } from './lines.js';

export interface Pool {
  starting: Clue[];
  testimony: Clue[];
  accounts: Clue[];
  descriptions: Clue[];
  watch: Clue[];
  timing: Clue[];
  knowledge: Clue[];
  /** Kept from the M7 derivation: weapon, motives, what was heard. */
  kept: Clue[];
  /** Secret material for noise, M7's shape, filtered to the M9 model. */
  material: SecretBranchMaterial[];
  names: LineNames;
}

export interface PoolInput {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  build: Schedule9Build;
  anchors: Anchor[];
  dials: DeductionDials;
  /** What `deriveCandidates` made; filtered here. */
  legacy: CandidateSet;
  /** Anchor knowledge tests are dealt. */
  knowledgeTests: boolean;
  caseType: CaseType;
}

const TOPIC_EVENING = 'their own evening';

export function accountTopic(): string {
  return TOPIC_EVENING;
}

function cap(s: string): string {
  return s.length === 0 ? s : `${s[0]?.toUpperCase()}${s.slice(1)}`;
}

function runs(ticks: Tick[]): Tick[][] {
  const out: Tick[][] = [];
  for (const t of ticks.slice().sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
    else out.push([t]);
  }
  return out;
}

function spanText(ticks: Tick[]): string {
  const rs = runs(ticks);
  return rs
    .map((r) => (r.length === 1 ? `at ${clock(r[0] as Tick)}` : `from ${clock(r[0] as Tick)} to ${clock(r[r.length - 1] as Tick)}`))
    .join(' and ');
}

export function buildPool(input: PoolInput): Pool {
  const { rng, cast, setting, build, anchors, dials } = input;
  const M = build.murderTick;
  const L = build.murderPlaceId;
  const person = (id: Id): Person => cast.people.find((p) => p.id === id) as Person;
  const who = (id: Id): string => person(id)?.surname ?? id;
  const placeName = (id: Id): string => setting.places.find((p) => p.id === id)?.shortName ?? id;
  const at = (id: Id, t: Tick): Id | null => (build.truth[id] as (Id | null)[] | undefined)?.[t] ?? null;
  const lying = (id: Id, t: Tick): boolean => (build.lies[id] ?? []).includes(t);
  const foundAt = (id: Id): Id => (person(id).foundAt ?? L) as Id;
  const anchorById = new Map(anchors.map((a) => [a.templateId, a]));
  const isMurder = input.caseType === "murder";

  const names: LineNames = {
    who,
    place: placeName,
    anchor: (id) => anchorById.get(id)?.name ?? id,
    method: (id) => (id === setting.method.id ? setting.method.name : (METHOD_TEMPLATES.find((m) => m.id === id)?.name ?? id)),
    motive: (type) => MOTIVE_BY_TYPE[type]?.description ?? type,
    object: (id) => setting.objects.find((o) => o.id === id)?.name ?? id,
    them: (id) => (genderOf(person(id)) === 'f' ? 'her' : 'him'),
  };

  let counter = 0;
  const mint = (
    prefix: string,
    kind: Clue['kind'],
    source: Clue['source'],
    place: Id,
    establishes: Fact[],
    text: string,
    sourceLine: string,
    extra?: Partial<Clue>,
  ): Clue => {
    counter++;
    const clue: Clue = {
      id: `${prefix}${String(counter).padStart(3, '0')}`,
      kind,
      source,
      establishes,
      text: speakTimes(text),
      textRecord: text,
      place,
      leadsTo: [],
      role: 'testimony',
      rule: ruleLine(establishes, sourceLine, names),
      ...extra,
    };
    return clue;
  };

  /** An anchor the witness could have timed a sighting at this place and half hour by. */
  const anchorFor = (place: Id, t: Tick): Anchor | null => {
    const options = anchors.filter((a) => {
      if (!a.ticks.includes(t)) return false;
      if (a.route) {
        const i = a.ticks.indexOf(t);
        return a.route[i] === place;
      }
      return a.placeId === undefined || a.placeId === place;
    });
    return options.length > 0 ? rng.pick(options) : null;
  };

  /* --- 1. testimony -------------------------------------------------------- */
  const askers = cast.people.filter((p) => p.kind !== 'victim');
  // Everybody the notebook can name: the suspects, the victim, and the people
  // who stand at doors. Every question gets an answer.
  const subjects = cast.people.slice();
  const testimony: Clue[] = [];
  for (const x of askers) {
    for (const y of subjects) {
      if (x.id === y.id) continue;
      const strength = y.kind === 'victim' ? 'name' : strengthOf(build.acq, x.id, y.id);
      const source: Clue['source'] = { type: 'person', personId: x.id, topic: y.surname };
      const extra: Partial<Clue> = { about: y.id };
      const X = who(x.id);
      const Y = who(y.id);
      if (strength === 'stranger' || strength === 'sight') {
        const facts: Fact[] = [{ kind: 'acquainted', personIds: [x.id, y.id], strength }];
        const text =
          strength === 'stranger'
            ? `${X} does not know anybody called ${Y}.`
            : `${X} might know ${Y}'s face, but not the name.`;
        testimony.push(mint('x', 'testimony', source, foundAt(x.id), facts, text, '', extra));
        continue;
      }
      const co: Tick[] = [];
      for (let t = 0; t < TICKS; t++) {
        const here = at(x.id, t);
        if (!here || here !== at(y.id, t)) continue;
        if (y.kind === 'victim' && isMurder && t >= M) continue;
        co.push(t);
      }
      const told = co.filter((t) => !lying(x.id, t));
      const withheld = co.length - told.length;
      const facts: Fact[] = [];
      const sentences: string[] = [];
      const posted = x.kind === 'fixture';
      // What they saw, a run at a time, some of it timed by an anchor.
      const byPlace = new Map<Id, Tick[]>();
      for (const t of told) {
        const place = at(x.id, t) as Id;
        const list = byPlace.get(place) ?? [];
        list.push(t);
        byPlace.set(place, list);
      }
      for (const [place, ticks] of byPlace) {
        const clocked: Tick[] = [];
        for (const t of ticks) {
          // The victim is timed only by an anchor that happens once: "just as
          // the El went over" would not say which train, and the victim has
          // no row on the grid to settle it on.
          let anchor = dials.anchorTimed > 0 && rng.chance(dials.anchorTimed) ? anchorFor(place, t) : null;
          if (anchor && y.kind === 'victim' && anchor.ticks.length > 1) anchor = null;
          if (anchor) {
            facts.push({ kind: 'personAtAnchor', personId: y.id, place, anchorId: anchor.templateId });
            sentences.push(`${X} saw ${Y} at ${placeName(place)} ${anchor.timing}.`);
          } else {
            clocked.push(t);
            facts.push({ kind: 'personAt', personId: y.id, place, tick: t });
            // Seen alive is still alive. In a theft or a disappearance only
            // the last sighting before it says so: that is where the owner
            // still had it, or the one who went had not gone yet.
            if (y.kind === 'victim' && (isMurder || (t === build.victimSeenAt && place === build.victimSeenPlace))) {
              facts.push({ kind: 'victimAliveAt', tick: t });
            }
          }
          if (y.kind === 'suspect' && place === build.accessPlaceId && t < M) {
            if (!facts.some((f) => f.kind === 'hadAccess' && f.personId === y.id)) {
              facts.push({ kind: 'hadAccess', personId: y.id, methodId: setting.method.id });
            }
          }
        }
        if (clocked.length > 0) sentences.push(`${X} saw ${Y} at ${placeName(place)} ${spanText(clocked)}.`);
      }
      // A posted witness knows where they were all evening, so they can say
      // where the person was not.
      if (posted) {
        const absent: Tick[] = [];
        for (let t = 0; t < TICKS; t++) {
          const here = at(x.id, t);
          if (!here) continue;
          if (co.includes(t)) continue;
          if (y.kind === 'victim' && isMurder && t >= M) continue;
          facts.push({ kind: 'personNotAt', personId: y.id, place: here, tick: t });
          absent.push(t);
        }
        if (told.length === 0 && absent.length > 0) {
          sentences.push(`${X} says ${Y} did not come by ${placeName(foundAt(x.id))} all evening.`);
        } else if (absent.length > 0) {
          sentences.push(`${X} did not see ${Y} the rest of the evening.`);
        }
      } else if (co.length === 0 && y.kind === 'suspect') {
        facts.push({ kind: 'apart', personIds: [x.id, y.id], ticks: Array.from({ length: TICKS }, (_, i) => i) });
        sentences.push(`${X} did not see ${Y} anywhere all evening.`);
      } else if (co.length === 0) {
        sentences.push(`${X} did not see ${Y} that evening.`);
      }
      if (facts.length === 0 && withheld > 0) {
        sentences.push(`${X} will not say where ${X} saw ${Y}.`);
      }
      const line = facts.some((f) => f.kind === 'personAt' || f.kind === 'personAtAnchor')
        ? `${X} saw ${names.them(y.id)}.`
        : `${X} says so.`;
      testimony.push(mint('x', 'testimony', source, foundAt(x.id), facts, sentences.join(' '), line, extra));
    }
  }

  /* --- 2. accounts ---------------------------------------------------------- */
  const accounts: Clue[] = [];
  for (const p of cast.suspects) {
    const claimed = build.claimed[p.id] as (Id | null)[];
    const comp = build.companions[p.id] as (Id | null)[];
    const facts: Fact[] = [];
    const parts: string[] = [];
    // What the detective asks about: the hours around the crime, and any hour
    // they have something to hide in, which is what they talk their way round.
    const liesHere = (u: Tick): boolean => (build.lies[p.id] ?? []).includes(u);
    const covered = (u: Tick): boolean => (u >= M - 3 && u <= M + 2) || liesHere(u);
    let t = 0;
    while (t < TICKS) {
      const here = claimed[t];
      if (!here || !covered(t)) {
        t++;
        continue;
      }
      let end = t;
      // A span ends where the truth of it changes, so that a lie is always its own span.
      while (
        end + 1 < TICKS &&
        covered(end + 1) &&
        claimed[end + 1] === here &&
        comp[end + 1] === comp[t] &&
        liesHere(end + 1) === liesHere(t)
      ) {
        end++;
      }
      const ticks = Array.from({ length: end - t + 1 }, (_, i) => t + i);
      const withId = comp[t] ?? undefined;
      facts.push({ kind: 'claims', personId: p.id, place: here, ticks, ...(withId ? { with: withId } : {}) });
      parts.push(`${placeName(here)} ${spanText(ticks)}${withId ? `, with ${who(withId)}` : ''}`);
      t = end + 1;
    }
    const they = genderOf(p) === 'f' ? 'she' : 'he';
    accounts.push(
      mint(
        'a',
        'account',
        { type: 'person', personId: p.id, topic: TOPIC_EVENING },
        foundAt(p.id),
        facts,
        `${p.surname} says ${they} was at ${parts.join('; then ')}.`,
        '',
      ),
    );
  }

  /* --- 3a. descriptions: strangers seen by somebody who did not know them -- */
  const descriptions: Clue[] = [];
  if (dials.strangers > 0) {
    const pairAtM = new Set(build.pair ?? []);
    for (const x of askers) {
      for (const y of cast.suspects) {
        if (x.id === y.id) continue;
        const s = strengthOf(build.acq, x.id, y.id);
        if (s !== 'stranger' && s !== 'sight') continue;
        const byPlace = new Map<Id, Tick[]>();
        for (let t = 0; t < TICKS; t++) {
          const here = at(x.id, t);
          if (!here || here !== at(y.id, t) || lying(x.id, t)) continue;
          const list = byPlace.get(here) ?? [];
          list.push(t);
          byPlace.set(here, list);
        }
        for (const [place, ticks] of byPlace) {
          for (const run of runs(ticks)) {
            const desc =
              pairAtM.has(y.id) && run.includes(M) && build.pairGrain
                ? describeAs(y, cast.suspects, build.pairGrain)
                : ambiguousDescription(y, cast.suspects);
            const facts: Fact[] = run.map((t) => ({ kind: 'describedAt', description: desc, place, tick: t }));
            const seen = s === 'sight' ? `${edgeOf(build.acq, x.id, y.id)?.ref ?? desc.text}` : desc.text;
            descriptions.push(
              mint(
                'd',
                'observation',
                { type: 'person', personId: x.id, topic: placeName(place) },
                foundAt(x.id),
                facts,
                `${who(x.id)} says there was ${seen} at ${placeName(place)} ${spanText(run)}, and ${who(x.id)} did not know ${names.them(y.id)} by name.`,
                `${who(x.id)} saw ${names.them(y.id)}; did not know ${names.them(y.id)}.`,
              ),
            );
          }
        }
      }
    }
  }

  /* --- 3b. what a watcher can say about their own door ----------------------- */
  const watch: Clue[] = [];
  for (const f of cast.fixtures) {
    if (f.fixtureRole === 'beat-cop' || !f.foundAt) continue;
    const post = f.foundAt;
    const W = who(f.id);
    const suspectsAt = (t: Tick): Id[] => cast.suspects.filter((p) => at(p.id, t) === post).map((p) => p.id);
    const othersAt = (t: Tick): Id[] =>
      cast.fixtures.filter((g) => g.id !== f.id && at(g.id, t) === post).map((g) => g.id);
    const victimAt = (t: Tick): boolean => at(cast.victim.id, t) === post;
    const ticks = Array.from({ length: TICKS }, (_, i) => i).filter((t) => at(f.id, t) === post);
    // Nobody at all, for a run of two half hours or more.
    const empty = ticks.filter((t) => suspectsAt(t).length === 0 && !victimAt(t));
    for (const run of runs(empty)) {
      if (run.length < 2) continue;
      const except = [f.id, ...new Set(run.flatMap(othersAt))];
      watch.push(
        mint(
          'w',
          'watch',
          { type: 'person', personId: f.id, topic: placeName(post) },
          post,
          [{ kind: 'absentFrom', place: post, ticks: run, except }],
          `${W} says nobody came into ${placeName(post)} ${spanText(run)}.`,
          `${W} says so.`,
        ),
      );
    }
    // Nobody but one person the watcher knows.
    const onlyOne = ticks.filter((t) => suspectsAt(t).length === 1 && !victimAt(t));
    const byWho = new Map<Id, Tick[]>();
    for (const t of onlyOne) {
      const id = suspectsAt(t)[0] as Id;
      if (!canName(build.acq, f.id, id)) continue;
      const list = byWho.get(id) ?? [];
      list.push(t);
      byWho.set(id, list);
    }
    for (const [id, list] of byWho) {
      for (const run of runs(list)) {
        const except = [f.id, id, ...new Set(run.flatMap(othersAt))];
        watch.push(
          mint(
            'w',
            'watch',
            { type: 'person', personId: f.id, topic: placeName(post) },
            post,
            [{ kind: 'absentFrom', place: post, ticks: run, except }],
            `${W} says nobody but ${who(id)} came into ${placeName(post)} ${spanText(run)}.`,
            `${W} says so.`,
          ),
        );
      }
    }
    // How many, where the watcher counts.
    for (const t of ticks) {
      const n = suspectsAt(t).length;
      if (n === 0 || victimAt(t) || othersAt(t).length > 0) continue;
      watch.push(
        mint(
          'w',
          'watch',
          { type: 'person', personId: f.id, topic: placeName(post) },
          post,
          [{ kind: 'countAt', place: post, tick: t, count: n }],
          `${W} says ${n === 1 ? 'one person' : `${n} people`} came into ${placeName(post)} at ${clock(t)}, and nobody else.`,
          `${W} counted.`,
        ),
      );
    }
  }

  /* --- 3c. when the anchors happened ---------------------------------------- */
  const timing: Clue[] = [];
  for (const a of anchors) {
    const facts: Fact[] = [{ kind: 'anchorAt', anchorId: a.templateId, ticks: a.ticks.slice() }];
    const when =
      a.ticks.length === 1
        ? `${cap(a.name)} was at ${clock(a.ticks[0] as Tick)}.`
        : `${cap(a.name)} came at ${a.ticks.map((t) => clock(t)).join(', ')}.`;
    if (a.placeId) {
      timing.push(
        mint('k', 'timing', { type: 'place', placeId: a.placeId }, a.placeId, facts, when, `Written down at ${placeName(a.placeId)}.`, { anchorId: a.templateId }),
      );
    } else {
      const teller =
        (a.route && cast.beatCop) ||
        rng.pick(cast.fixtures.length > 0 ? cast.fixtures : cast.people.filter((p) => p.kind !== 'victim'));
      timing.push(
        mint(
          'k',
          'timing',
          { type: 'person', personId: teller.id, topic: a.name },
          foundAt(teller.id),
          facts,
          `${who(teller.id)} says it: ${when}`,
          `${who(teller.id)} says so.`,
          { anchorId: a.templateId },
        ),
      );
    }
  }

  /* --- 3d. the conditional, and the test that meets it ------------------------ */
  const knowledge: Clue[] = [];
  if (input.knowledgeTests) {
    for (const a of anchors) {
      const trace = a.traces.find((tr) => tr.kind === 'knowledge');
      if (!trace || trace.kind !== 'knowledge' || !a.placeId) continue;
      const P = a.placeId;
      for (const t of a.ticks) {
        const teller = cast.people.find((p) => p.kind === 'fixture' && at(p.id, t) === P) ??
          cast.people.find((p) => p.kind === 'suspect' && at(p.id, t) === P && !lying(p.id, t));
        const liars = cast.suspects.filter(
          (p) => (build.claimed[p.id] as (Id | null)[])[t] === P && at(p.id, t) !== P,
        );
        if (!teller || liars.length === 0) continue;
        knowledge.push(
          mint(
            'k',
            'anchor',
            { type: 'person', personId: teller.id, topic: a.name },
            foundAt(teller.id),
            [{ kind: 'anchorKnowledge', anchorId: a.templateId, place: P, ticks: [t], knowledge: trace.description }],
            `${who(teller.id)} says anybody at ${placeName(P)} at ${clock(t)} would know that ${trace.description}.`,
            `${who(teller.id)} says so.`,
            { anchorId: a.templateId },
          ),
        );
        for (const p of liars) {
          knowledge.push(
            mint(
              'k',
              'anchor',
              { type: 'person', personId: p.id, topic: a.name },
              foundAt(p.id),
              [{ kind: 'knows', personId: p.id, anchorId: a.templateId, knows: false }],
              `Asked about ${a.name}, ${who(p.id)} cannot say what happened.`,
              `Asked, ${who(p.id)} could not say.`,
              { anchorId: a.templateId },
            ),
          );
        }
      }
    }
  }

  /* --- 4. what M7 dealt that the model keeps ---------------------------------- */
  const legacy = input.legacy;
  const high = anchors[1];
  const withRule = (c: Clue, source: string): Clue => {
    c.rule = ruleLine(c.establishes, source, names);
    c.role = 'noise';
    return c;
  };
  const sourceOf = (c: Clue): string => {
    if (c.kind === 'scene') return 'Found at the scene.';
    if (c.kind === 'morgue') return 'The coroner says so.';
    if (c.source.type === 'place') return `Found at ${placeName(c.source.placeId)}.`;
    return `${who(c.source.personId)} says so.`;
  };
  // The scene states the time of a single anchor outright.
  if (high && high.ticks.length === 1) {
    legacy.scene.establishes.push({ kind: 'anchorAt', anchorId: high.templateId, ticks: high.ticks.slice() });
  }
  const starting = [legacy.scene, legacy.morgue, legacy.client].map((c) => withRule(c, sourceOf(c)));

  const keepIds = new Set<Id>();
  const kept: Clue[] = [];
  for (const c of legacy.clues) {
    if (c === legacy.scene || c === legacy.morgue || c === legacy.client) continue;
    const kinds = new Set(c.establishes.map((f) => f.kind));
    let keep = false;
    if (c.kind === 'physical' && (kinds.has('objectMissing') || kinds.has('methodEvidence'))) keep = true;
    if (c.kind === 'document' && kinds.has('hasMotive')) keep = true;
    if (c.kind === 'overheard' && kinds.has('hasMotive') && c.aboutSecretOf === undefined) keep = true;
    if (c.kind === 'anchor' && kinds.has('noiseAt')) keep = true;
    if (!keep) continue;
    keepIds.add(c.id);
    kept.push(withRule(c, sourceOf(c)));
  }

  // Secret material: an innocent whose secret covers the crime's half hour
  // gives it up only when confronted twice, so no disqualifier is dealt; the
  // anchor lead-ins of M7 are the conditional now.
  const coversM = (id: Id): boolean => (build.secrets[id]?.cells ?? []).some((c) => c.tick === M);
  const material: SecretBranchMaterial[] = legacy.material.map((m) => {
    const hints = m.hints.map((c) => withRule(c, sourceOf(c)));
    const traces = m.traces.map((c) => withRule(c, sourceOf(c)));
    const disqualifiers = m.personIds.some(coversM) ? [] : m.disqualifiers.map((c) => withRule(c, sourceOf(c)));
    return { ...m, leadIns: [], hints, traces, disqualifiers };
  });

  return { starting, testimony, accounts, descriptions, watch, timing, knowledge, kept, material, names };
}
