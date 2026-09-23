/**
 * What really happened: the story the closing page tells.
 *
 * Three things are checked here, and the first two are the point:
 *
 * 1. Correspondence. Every line carries the facts it asserts. Each fact is
 *    read back against the whole case, and the words on the line may name no
 *    person, place or hour its facts do not account for.
 * 2. By construction. `storyInput` is the only reader of the case, and it is
 *    run against a case that records every field it touches: no secret, no
 *    claimed evening, no lie, no clue, and nothing about any other suspect.
 * 3. Shape. Every case type and every trope tells a story, of 200 to 400
 *    words, in plain words, in the order the night went.
 */

import { describe, expect, it } from 'vitest';
import { generateCase, type Case, type Difficulty, type Id, type Tick } from '../src/gen/index.js';
import { TROPE_IDS } from '../src/gen/tropes/index.js';
import { RELATIONSHIPS, VICTIM_ARCHETYPES, VICTIM_ARCHETYPE_BY_ID, RELATIONSHIP_BY_ID } from '../src/gen/data/cast.js';
import { MOTIVE_TEMPLATES } from '../src/gen/data/motives.js';
import { METHOD_TEMPLATES } from '../src/gen/data/methods.js';
import { MISSING_MEANS, ROBBERY_MEANS } from '../src/gen/data/means.js';
import {
  STORY_CARDS,
  spanText,
  storyInput,
  storyOf,
  storyParagraphs,
  storyWords,
  tellStory,
  type StoryFact,
  type StoryLine,
} from '../src/game/story.js';

/* ------------------------------------------------------------ the cases */

const CASES: Case[] = [];
// `STORY_SEEDS=600 npx vitest run test/story.test.ts` reads further, for a sweep.
const SEEDS = Number(process.env.STORY_SEEDS ?? 120);
for (let seed = 1; seed <= SEEDS; seed++) CASES.push(generateCase(seed, { difficulty: 2 }));
for (const difficulty of [1, 3, 4] as Difficulty[]) {
  for (let seed = 1; seed <= 25; seed++) CASES.push(generateCase(seed, { difficulty }));
}
for (const tropeId of TROPE_IDS) {
  for (let seed = 200; seed < 215; seed++) CASES.push(generateCase(seed, { difficulty: 2, tropeId }));
}
// M7's tiers deal smaller and larger cases on other dials.
for (const tier of [0, 2, 4, 'over-easy'] as const) {
  for (let seed = 300; seed < 306; seed++) CASES.push(generateCase(seed, { tier }));
}

/* ------------------------------------------------------------ the checker */

function truthAt(kase: Case, id: Id, t: Tick): Id | null {
  return kase.schedules.find((s) => s.personId === id)?.truth[t] ?? null;
}

function victimOf(kase: Case) {
  return kase.people.find((p) => p.kind === 'victim')!;
}

/** Everybody the story may name: the culprit, the victim, the finder, the last to see them. */
function allowedPeople(kase: Case): Set<Id> {
  const out = new Set<Id>([kase.solution.killerId, victimOf(kase).id]);
  if (kase.victimBio.discovery) out.add(kase.victimBio.discovery.foundById);
  if (kase.victimBio.lastSeen) out.add(kase.victimBio.lastSeen.byId);
  return out;
}

/** The test's own template reader, independent of the story's. */
function fits(template: string, text: string): boolean {
  const pattern = template
    .split(/(\{\w+\})/)
    .map((part) => (/^\{\w+\}$/.test(part) ? '(.+?)' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${pattern}\\.?$`, 'i').test(text.trim());
}

/** Is this one fact true of this case? A string says why not. */
function check(kase: Case, f: StoryFact): string | null {
  const act = kase.act;
  const killer = kase.people.find((p) => p.id === kase.solution.killerId)!;
  const victim = victimOf(kase);
  const d = kase.victimBio.discovery;
  const ls = kase.victimBio.lastSeen;
  const person = (id: Id) => kase.people.find((p) => p.id === id);
  switch (f.kind) {
    case 'names':
      return allowedPeople(kase).has(f.personId) ? null : `names ${f.personId}, who is not in the crime`;
    case 'gender':
      return person(f.personId)?.gender === f.gender ? null : `gender of ${f.personId}`;
    case 'place':
      return kase.places.some((p) => p.id === f.placeId) ? null : `no place ${f.placeId}`;
    case 'time':
      return f.tick >= 0 && f.tick < 12 ? null : `no tick ${f.tick}`;
    case 'mention': {
      if (!kase.mentions.some((m) => m.name === f.name)) return `no mention ${f.name}`;
      const inTie = killer.dossier?.tie.backstory.includes(f.name) ?? false;
      const inMotive = killer.motive?.description.includes(f.name) ?? false;
      return inTie || inMotive ? null : `${f.name} is not the culprit’s tie or motive`;
    }
    case 'at':
      for (const t of f.ticks) {
        if (truthAt(kase, f.personId, t) !== f.placeId) return `${f.personId} not at ${f.placeId} at ${t}`;
      }
      return null;
    case 'arrived':
      if (truthAt(kase, f.personId, f.tick) !== f.placeId) return `${f.personId} not at ${f.placeId} at ${f.tick}`;
      return f.tick === 0 || truthAt(kase, f.personId, f.tick - 1) !== f.placeId ? null : `${f.personId} was already there`;
    case 'alone': {
      const there = kase.people.filter((p) => truthAt(kase, p.id, f.tick) === f.placeId).map((p) => p.id);
      const extra = there.filter((id) => !f.ids.includes(id));
      return extra.length === 0 ? null : `not alone at ${f.placeId}: ${extra.join(', ')}`;
    }
    case 'culprit':
      return f.personId === kase.solution.killerId ? null : 'wrong culprit';
    case 'act':
      return act.place === f.placeId && act.tick === f.tick && kase.solution.murderTick === f.tick ? null : 'wrong act';
    case 'caseType':
      return act.type === f.value ? null : 'wrong type';
    case 'trope':
      return act.tropeId === f.value ? null : 'wrong trope';
    case 'fate':
      return act.fate === f.value ? null : 'wrong fate';
    case 'method':
      return kase.method.id === f.value && kase.solution.methodId === f.value ? null : 'wrong method';
    case 'means': {
      const object = kase.objects.find((o) => o.id === f.objectId);
      return kase.method.accessRequirement.place === f.placeId &&
        kase.method.evidenceObjectId === f.objectId &&
        object?.homePlace === f.placeId
        ? null
        : 'wrong means';
    }
    case 'tie': {
      if (f.personId !== killer.id) return 'a tie that is not the culprit’s';
      const tie = killer.dossier?.tie;
      if (tie?.relationshipId !== f.relationshipId) return 'wrong relationship';
      if (f.variant === undefined) return null;
      const template = RELATIONSHIP_BY_ID[f.relationshipId]?.backstory[f.variant];
      return template !== undefined && fits(template, tie.backstory) ? null : 'wrong backstory';
    }
    case 'tieText':
      return f.personId === killer.id && killer.dossier?.tie.text === f.text ? null : 'wrong tie text';
    case 'motive':
      return f.personId === killer.id && killer.motive?.type === f.value && kase.solution.motiveType === f.value
        ? null
        : 'wrong motive';
    case 'role': {
      const p = person(f.personId);
      if (f.personId !== killer.id && f.personId !== victim.id) return 'role of a bystander';
      if (f.role !== undefined && p?.role !== f.role) return 'wrong role';
      if (f.archetypeId !== undefined && f.archetypeId !== '-' && p?.archetypeId !== f.archetypeId) return 'wrong archetype';
      return null;
    }
    case 'standing': {
      if (f.personId !== victim.id) return 'standing of somebody else';
      if (f.archetypeId === undefined) return null;
      if (victim.archetypeId !== f.archetypeId) return 'wrong victim archetype';
      const template = VICTIM_ARCHETYPE_BY_ID[f.archetypeId]?.standing[f.variant ?? -1];
      return template !== undefined && fits(`${victim.surname} ${template}`, kase.victimBio.standing)
        ? null
        : 'wrong standing';
    }
    case 'detail': {
      if (f.personId !== victim.id || victim.archetypeId !== f.archetypeId) return 'detail of somebody else';
      const template = VICTIM_ARCHETYPE_BY_ID[f.archetypeId]?.professionDetails[f.variant];
      return template !== undefined && fits(template, victim.dossier?.profession.detail ?? '') ? null : 'wrong detail';
    }
    case 'anchor':
      return kase.anchors.some((a) => a.templateId === f.templateId && a.ticks.includes(f.tick)) ? null : 'no such anchor then';
    case 'masked':
      return kase.soundMasked && kase.method.noise > 0 ? null : 'not masked';
    case 'taken':
      return act.taken?.id === f.objectId ? null : 'wrong goods';
    case 'weapon':
      return kase.method.evidenceObjectId === f.objectId ? null : 'wrong weapon';
    case 'moved':
      return act.bodyFoundAt === f.placeId && act.bodyFoundAt !== act.place && d?.foundTick === f.byTick
        ? null
        : 'not moved';
    case 'goods':
      return act.goodsWentTo === f.placeId ? null : 'wrong fence';
    case 'whereabouts':
      return act.whereabouts === f.value ? null : 'wrong whereabouts';
    case 'found':
      return d?.foundById === f.personId && d.foundAt === f.placeId && d.foundTick === f.tick ? null : 'wrong discovery';
    case 'precinct':
      return d?.precinct === f.value ? null : 'wrong precinct';
    case 'lastSeen':
      return ls?.byId === f.personId && ls.place === f.placeId && ls.tick === f.tick ? null : 'wrong last sighting';
    case 'client':
      return kase.clientId === f.personId && f.personId === killer.id ? null : 'not the client';
  }
}

const HOURS = '(six|seven|eight|nine|ten|eleven)';
const SPOKEN = new RegExp(`half past ${HOURS}|${HOURS} o’clock`, 'g');
const TICK_OF: Record<string, Tick> = {};
for (let t = 0; t < 12; t++) {
  const hour = ['six', 'seven', 'eight', 'nine', 'ten', 'eleven'][Math.floor(t / 2)];
  TICK_OF[t % 2 === 0 ? `${hour} o’clock` : `half past ${hour}`] = t;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** What the words on a line name, that its facts must account for. */
function surface(kase: Case, text: string): { people: Id[]; places: Id[]; ticks: Tick[]; mentions: string[] } {
  let rest = text;
  const mentions: string[] = [];
  for (const m of kase.mentions) {
    if (rest.includes(m.name)) {
      mentions.push(m.name);
      rest = rest.split(m.name).join('—');
    }
  }
  // A place can carry somebody's name — Ruggiero’s — and is a place first.
  for (const p of kase.places) rest = rest.split(p.shortName).join('the place');
  const people = kase.people
    .filter((p) => new RegExp(`(^|[^\\w])${escape(p.surname)}(?![\\w])`).test(rest))
    .map((p) => p.id);
  const places = kase.places
    .filter((p) => new RegExp(`(^|[^\\w])${escape(p.shortName)}(?![\\w-])`, 'i').test(rest))
    .map((p) => p.id);
  const ticks = [...rest.matchAll(SPOKEN)].map((m) => TICK_OF[m[0]] as Tick);
  return { people, places, ticks, mentions };
}

function lineProblems(kase: Case, line: StoryLine): string[] {
  const out: string[] = [];
  for (const f of line.facts) {
    const why = check(kase, f);
    if (why) out.push(`${line.cardId} ${f.kind}: ${why}`);
  }
  const s = surface(kase, line.text);
  const named = new Set(line.facts.flatMap((f) => (f.kind === 'names' ? [f.personId] : [])));
  const placed = new Set(line.facts.flatMap((f) => (f.kind === 'place' ? [f.placeId] : [])));
  const timed = new Set(line.facts.flatMap((f) => (f.kind === 'time' ? [f.tick] : [])));
  const mentioned = new Set(line.facts.flatMap((f) => (f.kind === 'mention' ? [f.name] : [])));
  for (const id of s.people) if (!named.has(id)) out.push(`${line.cardId} names ${id} without a fact`);
  for (const id of s.places) if (!placed.has(id)) out.push(`${line.cardId} names ${id} without a fact`);
  for (const t of s.ticks) if (!timed.has(t)) out.push(`${line.cardId} names tick ${t} without a fact`);
  for (const m of s.mentions) if (!mentioned.has(m)) out.push(`${line.cardId} names ${m} without a fact`);
  if (/\d{1,2}:\d{2}/.test(line.text)) out.push(`${line.cardId} reads a clock face`);
  if (/\{\w+\}/.test(line.text)) out.push(`${line.cardId} left a slot unfilled`);
  return out;
}

/* ------------------------------------------------------------ the tests */

describe('the story: correspondence', () => {
  it('every fact on every line is true of the case, and every name, place and hour on it is a fact', () => {
    const problems: string[] = [];
    for (const kase of CASES) {
      for (const line of storyOf(kase).paragraphs.flat()) {
        for (const p of lineProblems(kase, line)) problems.push(`case ${kase.seed}/${kase.difficulty} ${kase.act.tropeId}: ${p} — “${line.text}”`);
      }
    }
    expect(problems.slice(0, 20)).toEqual([]);
  });

  it('names nobody but the culprit, the victim, whoever found it and whoever saw them last', () => {
    for (const kase of CASES) {
      const allowed = allowedPeople(kase);
      let text = storyParagraphs(storyOf(kase)).join(' ');
      for (const p of kase.places) text = text.split(p.shortName).join('the place');
      for (const p of kase.people) {
        if (allowed.has(p.id)) continue;
        expect(new RegExp(`\\b${escape(p.surname)}\\b`).test(text), `case ${kase.seed}: ${p.surname}`).toBe(false);
      }
    }
  });

  it('never repeats a secret, a lie or a clue', () => {
    for (const kase of CASES) {
      const text = storyParagraphs(storyOf(kase)).join(' ');
      for (const p of kase.people) {
        for (const s of [p.secret, p.coverSecret]) {
          if (s && s.type !== 'murder') expect(text.includes(s.description), `case ${kase.seed}: ${s.label}`).toBe(false);
        }
      }
      for (const clue of kase.candidates) {
        if (clue.role === 'noise' || clue.role === 'disqualifier') {
          expect(text.includes(clue.text), `case ${kase.seed}: ${clue.id}`).toBe(false);
        }
      }
    }
  });
});

describe('the story: by construction', () => {
  /** The case, behind a proxy that writes down every path read off it. */
  function tracked(kase: Case): { proxy: Case; paths: string[][] } {
    const paths: string[][] = [];
    const wrap = (value: unknown, path: string[]): unknown => {
      if (value === null || typeof value !== 'object') return value;
      return new Proxy(value as object, {
        get(target, key, receiver) {
          const got = Reflect.get(target, key, receiver) as unknown;
          if (typeof key === 'symbol' || typeof got === 'function') return got;
          const next = [...path, key];
          paths.push(next);
          return wrap(got, next);
        },
      });
    };
    return { proxy: wrap(kase, []) as Case, paths };
  }

  const FORBIDDEN = new Set([
    'secret',
    'coverSecret',
    'claimed',
    'claimedCompanion',
    'lies',
    'observations',
    'candidates',
    'findable',
    'starting',
    'deduction',
    'clientBrief',
    'briefing',
    'briefingText',
    'givens',
    'selfAccount',
    'layers',
    'want',
    'mentions',
  ]);

  it('reads no secret, lie, clue or noise field, and nothing about anybody outside the crime', () => {
    for (const kase of CASES.slice(0, 60).concat(CASES.slice(-60))) {
      const { proxy, paths } = tracked(kase);
      storyInput(proxy);
      const allowed = allowedPeople(kase);
      const culprit = kase.solution.killerId;
      const victim = victimOf(kase).id;
      for (const path of paths) {
        const where = `case ${kase.seed}: ${path.join('.')}`;
        for (const part of path) expect(FORBIDDEN.has(part), where).toBe(false);
        if (path[0] === 'people' && path.length >= 3) {
          const person = kase.people[Number(path[1])]!;
          const field = path[2]!;
          if (!allowed.has(person.id)) expect(['id', 'kind'].includes(field), where).toBe(true);
          // A motive is the culprit's alone to be read; a dossier, the culprit's
          // tie and the victim's line of work, and nobody else's anything.
          if (field === 'motive') expect(person.id, where).toBe(culprit);
          if (field === 'dossier') {
            const part = path[3];
            const ok =
              part === undefined ||
              part === 'gender' ||
              (person.id === culprit && part === 'tie') ||
              (person.id === victim && part === 'profession' && (path[4] === undefined || path[4] === 'detail'));
            expect(ok, where).toBe(true);
          }
        }
        if (path[0] === 'schedules' && path.length >= 3) {
          const schedule = kase.schedules[Number(path[1])]!;
          if (schedule.personId !== culprit && schedule.personId !== victim) expect(path[2], where).toBe('personId');
          else expect(['personId', 'truth'].includes(path[2]!), where).toBe(true);
        }
      }
    }
  });

  it('tells the story from the input alone: the case itself is never handed to the teller', () => {
    const kase = CASES[2]!;
    const input = storyInput(kase);
    // Round-trips through JSON: plain data, nothing that reaches back into the case.
    const copy = JSON.parse(JSON.stringify(input)) as typeof input;
    expect(storyParagraphs(tellStory(copy))).toEqual(storyParagraphs(storyOf(kase)));
    const keys = Object.keys(input).sort();
    expect(keys).toEqual(
      [
        'act',
        'anchor',
        'culprit',
        'culpritIsClient',
        'culpritTruth',
        'discovery',
        'lastSeen',
        'means',
        'motive',
        'places',
        'seed',
        'soundMasked',
        'standing',
        'tie',
        'victimDetail',
        'tropeId',
        'type',
        'victim',
        'victimTruth',
      ].sort(),
    );
  });
});

describe('the story: shape', () => {
  it('runs 200 to 400 words, every case type and every trope', () => {
    const bad: string[] = [];
    const words: number[] = [];
    for (const kase of CASES) {
      const n = storyWords(storyOf(kase));
      words.push(n);
      if (n < 200 || n > 400) bad.push(`case ${kase.seed}/${kase.difficulty} ${kase.act.tropeId}: ${n}`);
    }
    // eslint-disable-next-line no-console
    console.log(
      `story words: min ${Math.min(...words)}, mean ${Math.round(words.reduce((a, b) => a + b, 0) / words.length)}, max ${Math.max(...words)} over ${words.length} cases`,
    );
    expect(bad).toEqual([]);
  });

  it('tells the crime in order: who, why, the means, the moment, and how it came out', () => {
    for (const kase of CASES) {
      const lines = storyOf(kase).paragraphs.flat();
      const beats = lines.map((l) => l.beat);
      const need = ['open', 'headline', 'motive', 'moment', 'act', 'close'];
      if (kase.act.type !== 'missing') need.push('found');
      else need.push('lastseen', 'whereabouts');
      if (kase.act.tropeId === 'body-moved') need.push('moved');
      if (kase.act.tropeId === 'locked-room') need.push('key');
      if (kase.act.type === 'robbery') need.push('goods');
      for (const beat of need) expect(beats, `case ${kase.seed} ${kase.act.tropeId}: ${beat}`).toContain(beat);
      expect(beats.includes('means') || beats.includes('key'), `case ${kase.seed}: means`).toBe(true);
      const order = ['headline', 'means', 'moment', 'act', 'found'].map((b) => beats.indexOf(b)).filter((i) => i >= 0);
      expect(order, `case ${kase.seed}`).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it('is the same story every time for the same case', () => {
    for (const kase of CASES.slice(0, 20)) {
      expect(storyParagraphs(storyOf(kase))).toEqual(storyParagraphs(storyOf(kase)));
    }
  });

  it('opens by closing the book, and closes on the last line', () => {
    for (const kase of CASES.slice(0, 40)) {
      const paragraphs = storyOf(kase).paragraphs;
      expect(paragraphs[0]![0]!.beat).toBe('open');
      expect(paragraphs.at(-1)!.at(-1)!.beat).toBe('close');
    }
  });

  it('never opens or closes two seeds running the same way, and has eight closers or more', () => {
    const family = (text: string) => text.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
    const closers = STORY_CARDS.filter((c) => c.tags.beat === 'close');
    expect(closers.length).toBeGreaterThanOrEqual(8);
    expect(new Set(closers.map((c) => family(c.text))).size).toBe(closers.length);
    const openers = STORY_CARDS.filter((c) => c.tags.beat === 'open');
    expect(new Set(openers.map((c) => family(c.text))).size).toBe(openers.length);
    for (const difficulty of [1, 2, 3, 4] as Difficulty[]) {
      let last: { open: string; close: string } | null = null;
      for (let seed = 1; seed <= 10; seed++) {
        const lines = storyOf(generateCase(seed, { difficulty })).paragraphs.flat();
        const now = { open: family(lines[0]!.text), close: family(lines.at(-1)!.text) };
        if (last) {
          expect(now.open, `seed ${seed} d${difficulty} opener`).not.toBe(last.open);
          expect(now.close, `seed ${seed} d${difficulty} closer`).not.toBe(last.close);
        }
        last = now;
      }
    }
  });

  it('says it in plain words: no genre jargon', () => {
    const JARGON =
      /\b(paper|papers|notes?|fence[ds]?|numbers|policy|policies|marker|vig|juice|the take|squares?|marks?|shaped up|shape up|heeler|stringer|hack|curb|books?|houses)\b/i;
    for (const card of STORY_CARDS) expect(JARGON.test(card.text), `${card.id}: ${card.text}`).toBe(false);
    for (const kase of CASES) {
      const text = storyParagraphs(storyOf(kase)).join(' ');
      const hit = JARGON.exec(text);
      expect(hit, `case ${kase.seed}: ${hit?.[0]} in “${text}”`).toBeNull();
    }
  });

  it('reads a length of time the way somebody says it', () => {
    expect(spanText(1)).toBe('half an hour');
    expect(spanText(2)).toBe('an hour');
    expect(spanText(3)).toBe('an hour and a half');
    expect(spanText(4)).toBe('two hours');
    expect(spanText(5)).toBe('two and a half hours');
  });
});

describe('the story deck', () => {
  const has = (beat: string, tags: Record<string, string | number>) =>
    STORY_CARDS.some(
      (c) => c.tags.beat === beat && Object.entries(tags).every(([k, v]) => c.tags[k] === v),
    );

  it('has a tie card for every backstory the generator can draw, keyed by its template', () => {
    for (const rel of RELATIONSHIPS) {
      rel.backstory.forEach((_t, variant) => {
        expect(has('tie', { relationship: rel.id, variant }), `${rel.id} #${variant}`).toBe(true);
      });
    }
  });

  it('has a standing card for every victim the generator can draw', () => {
    for (const v of VICTIM_ARCHETYPES) {
      v.standing.forEach((_t, variant) => {
        expect(has('standing', { archetype: v.id, variant }), `${v.id} #${variant}`).toBe(true);
      });
    }
  });

  it('has a detail card for every victim’s line of work', () => {
    for (const v of VICTIM_ARCHETYPES) {
      v.professionDetails.forEach((_t, variant) => {
        expect(has('vdetail', { archetype: v.id, variant }), `${v.id} #${variant}`).toBe(true);
      });
    }
  });

  it('has a motive card for every motive, and a means and an act card for every method', () => {
    for (const m of MOTIVE_TEMPLATES) {
      expect(has('motive', { motive: m.type }), m.type).toBe(true);
      expect(has('motive-color', { motive: m.type }), m.type).toBe(true);
    }
    for (const m of METHOD_TEMPLATES) {
      expect(has('means', { method: m.id }), m.id).toBe(true);
      expect(has('act', { method: m.id, caseType: 'murder' }), m.id).toBe(true);
    }
    for (const m of ROBBERY_MEANS) {
      expect(has('means', { method: m.id }), m.id).toBe(true);
      expect(has('act', { method: m.id, trope: 'inside-job' }), m.id).toBe(true);
      expect(has('act', { method: m.id, trope: 'payroll' }), m.id).toBe(true);
    }
    for (const m of MISSING_MEANS) {
      expect(has('means', { method: m.id }), m.id).toBe(true);
      expect(has('act', { method: m.id, fate: 'left' }), m.id).toBe(true);
      expect(has('act', { method: m.id, fate: 'taken' }), m.id).toBe(true);
    }
  });

  it('has a cover card for every anchor loud enough to bury a noise', () => {
    for (const id of ['el-train', 'bar-radio', 'theater-out']) expect(has('cover', { anchor: id }), id).toBe(true);
  });
});
