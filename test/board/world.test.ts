/**
 * docs/48: the neighbourhood. The bible is read and refused loudly when it
 * doesn't hold; a night is cast from it with every invariant the dealt cast
 * keeps; the prose draws on it first; continuity keeps the culprit fresh.
 */
import { describe, expect, it } from 'vitest';
import placesJson from '../../content/neighbourhood/places.json';
import peopleJson from '../../content/neighbourhood/people.json';
import stubPlaces from '../../content/neighbourhood/stub/places.json';
import stubPeople from '../../content/neighbourhood/stub/people.json';
import { checkInvariants, generateBoard, invariantFailures, typesFor, type BoardCase, type TierIndex } from '../../src/gen/board/index.js';
import { bibleProblems, parseBible } from '../../src/gen/board/world/load.js';
import { castPool, fenceOf, fencePeople, WOMEN_VICTIMS } from '../../src/gen/board/world/cast.js';
import { motivesFor, ofVictim } from '../../src/gen/board/world/motives.js';
import { worldBible, worldCtx } from '../../src/gen/board/world/index.js';
import { boardOpen, hoursOnBoard, voiceHour } from '../../src/gen/board/world/types.js';
import { castOf, dealBoard, keepsContinuity } from '../../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../../src/game/board/oracle.js';
import { lintBoardRun } from '../../src/game/board/lint.js';
import { proseIssues } from '../../src/game/board/prose-lint.js';
import { boardFields, truthReport, scoreBoard, storyOfBoard, curtainOfBoard } from '../../src/game/board/report.js';
import { accountOf } from '../../src/game/board/knowledge.js';
import { hoursWithReason } from '../../src/game/board/tell.js';
import { bibleShare, biblePerson } from '../../src/game/board/world.js';
import { mannerOf } from '../../src/game/board/pages.js';
import { walkBetween } from '../../src/game/board/walk.js';
import { teachLines, BOARD_TEACH_LINES } from '../../src/game/board/teach.js';
import { continuityOf, recordRun, sanitizeProfile, emptyProfile } from '../../src/game/board/profile.js';
import { runPlay, type PlayIo } from '../../src/cli/play-lib.js';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const bible = worldBible('neighbourhood');
const ctx = worldCtx('neighbourhood');
const TIERS: TierIndex[] = [0, 1, 2, 3, 4, 5];

describe('the bible: loading it, and refusing a bad one', () => {
  it('reads the neighbourhood whole, with every place kind the generator casts from', () => {
    expect(bibleProblems(placesJson, peopleJson)).toEqual([]);
    expect(bible.places.length).toBeGreaterThanOrEqual(10);
    expect(bible.people.length).toBeGreaterThanOrEqual(24);
  });

  it('reads the stub, whose three places can’t cast a night, and says so', () => {
    expect(bibleProblems(stubPlaces, stubPeople, { coverage: false })).toEqual([]);
    const problems = bibleProblems(stubPlaces, stubPeople);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.every((p) => p.startsWith('coverage:'))).toBe(true);
    expect(() => parseBible('stub', stubPlaces, stubPeople)).toThrow(/coverage: wants two watched night places/);
  });

  it('names the entry when the walk isn’t the same both ways, a tie isn’t returned, or a name or a job is twice', () => {
    const places = clone(placesJson) as unknown as { places: { id: string; minutes: Record<string, number> }[] };
    const people = clone(peopleJson) as unknown as { people: { id: string; first: string; job: string; ties: { to: string; kind: string; line: string }[] }[] };
    const [a, b] = places.places as [{ id: string; minutes: Record<string, number> }, { id: string; minutes: Record<string, number> }];
    a.minutes[b.id] = (a.minutes[b.id] ?? 5) + 5;
    const [p, q, r] = people.people as [(typeof people.people)[number], (typeof people.people)[number], (typeof people.people)[number]];
    const back = people.people.find((x) => x.id === p.ties[0]?.to);
    if (back) back.ties = back.ties.filter((t) => t.to !== p.id);
    q.first = p.first;
    r.job = p.job;
    const problems = bibleProblems(places, people);
    expect(problems.some((x) => x.startsWith(`places[${a.id}].minutes.${b.id}`) || x.startsWith(`places[${b.id}].minutes.${a.id}`))).toBe(true);
    expect(problems.some((x) => x.includes(`people[${p.id}].ties[0]`) && x.includes('no tie back'))).toBe(true);
    expect(problems.some((x) => x.startsWith(`people[${q.id}]`) && x.includes('first name'))).toBe(true);
    expect(problems.some((x) => x.startsWith(`people[${r.id}]`) && x.includes('job'))).toBe(true);
    expect(() => parseBible('broken', places, people)).toThrow(/The broken bible doesn’t hold/);
  });

  it('names an unknown place, kind or tie, and a watcher who neither lives nor works where they watch', () => {
    const places = clone(placesJson) as unknown as { places: { id: string; kind: string; watcher: { person: string } | null }[] };
    const people = clone(peopleJson) as unknown as { people: { id: string; home: string; works: unknown; ties: { kind: string }[] }[] };
    (places.places[0] as { kind: string }).kind = 'speakeasy';
    const watched = places.places.find((x) => x.watcher) as { id: string; watcher: { person: string } };
    const w = people.people.find((x) => x.id === watched.watcher.person) as { home: string; works: unknown };
    w.home = 'nowhere';
    w.works = null;
    ((people.people[5] as { ties: { kind: string }[] }).ties[0] as { kind: string }).kind = 'cousin';
    const problems = bibleProblems(places, people);
    expect(problems.some((x) => x.includes('kind "speakeasy"'))).toBe(true);
    expect(problems.some((x) => x.includes('home "nowhere" is not a place'))).toBe(true);
    expect(problems.some((x) => x.includes('kind "cousin"'))).toBe(true);
  });

  it('names the entry when a doing line, a back room or a watcher’s standing lines are the wrong shape', () => {
    const places = clone(placesJson) as unknown as { places: { id: string; watcher: { counts: unknown } | null; hides: unknown[] }[] };
    const people = clone(peopleJson) as unknown as { people: { id: string; doing: unknown[] }[] };
    const watched = places.places.find((x) => x.watcher) as { id: string; watcher: { counts: unknown }; hides: unknown[] };
    watched.watcher.counts = 'one line, not a list';
    watched.hides = ['the back room'];
    const p = people.people[0] as { id: string; doing: unknown[] };
    p.doing = [{ setting: 'atlantis', text: 'swimming' }, 'darning a sock'];
    const problems = bibleProblems(places, people);
    expect(problems.some((x) => x.startsWith(`places[${watched.id}].watcher.counts`))).toBe(true);
    expect(problems.some((x) => x.startsWith(`places[${watched.id}].hides[0]`) && x.includes('{ name, arrival }'))).toBe(true);
    expect(problems.some((x) => x.startsWith(`people[${p.id}].doing[0]`) && x.includes('"atlantis"'))).toBe(true);
    expect(problems.some((x) => x.startsWith(`people[${p.id}].doing[1]`) && x.includes('{ setting, text }'))).toBe(true);
  });

  it('is deep enough to cast from: arrivals for every hour and weather, back rooms, three standing lines a watcher, doing lines by setting', () => {
    for (const p of bible.places) {
      const flats = p.kind === 'home' && !p.watcher;
      expect(p.arrivals.length, p.id).toBeGreaterThanOrEqual(flats ? 8 : 6);
      for (const band of ['early', 'mid', 'late']) expect(p.arrivals.some((a) => a.band === band && (a.weather === 'any' || a.weather === 'clear')), `${p.id} ${band}`).toBe(true);
      for (const w of ['rain', 'cold']) expect(p.arrivals.some((a) => a.weather === w), `${p.id} ${w}`).toBe(true);
      expect(p.hides.length, p.id).toBeGreaterThan(0);
      for (const h of p.hides) expect(h.arrival.length, `${p.id} ${h.name}`).toBeGreaterThan(80);
      // A back room is the night's unwatched place when its watcher isn't in the case: its arrival can't speak of them.
      const w = bible.people.find((x) => x.id === p.watcher?.person);
      const job = w?.job.split(/\s+/).pop() ?? '∅';
      for (const h of p.hides) expect(new RegExp(`\\b(${job}|${w?.last ?? '∅'})\\b(?![’']s)`, 'i').test(h.arrival), `${p.id} ${h.name}`).toBe(false);
      if (p.watcher) expect(new Set(p.watcher.counts).size, p.id).toBe(3);
    }
    for (const p of bible.people) {
      expect(p.doing.length, p.id).toBeGreaterThanOrEqual(4);
      expect(p.doing.filter((d) => d.setting !== p.home).length, p.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('has two buildings nobody watches, each at least half women, and a fence of its own at every night place', () => {
    const flats = bible.places.filter((p) => p.kind === 'home' && !p.watcher);
    expect(flats.length).toBeGreaterThanOrEqual(2);
    for (const f of flats) {
      const live = bible.people.filter((p) => p.home === f.id);
      expect(live.length, f.id).toBeGreaterThanOrEqual(5);
      expect(live.filter((p) => p.gender === 'f').length * 2, f.id).toBeGreaterThanOrEqual(live.length);
    }
    for (const v of bible.places.filter((p) => ['bar', 'club', 'restaurant', 'theatre'].includes(p.kind))) {
      const f = fenceOf(bible, v);
      expect(f.person, v.id).toBeDefined();
      expect(bible.people.find((p) => p.id === f.person)?.works?.place, v.id).toBe(v.id);
    }
  });

  it('ties everybody to four or more on average, of every kind, and everybody in the pool to three others in it', () => {
    const pool = new Set(castPool(bible).map((p) => p.id));
    const ends = bible.people.reduce((n, p) => n + p.ties.length, 0);
    expect(ends / bible.people.length).toBeGreaterThanOrEqual(4);
    expect(new Set(bible.people.flatMap((p) => p.ties.map((t) => t.kind))).size).toBe(11);
    for (const p of bible.people.filter((x) => pool.has(x.id))) expect(p.ties.filter((t) => pool.has(t.to)).length, p.id).toBeGreaterThanOrEqual(3);
  });

  it('reads clock hours as the board’s: past midnight, a working day, and a place that never shuts', () => {
    expect(hoursOnBoard({ open: 19, close: 2 })).toEqual([7, 13]);
    expect(hoursOnBoard({ open: 9, close: 21 })).toEqual([-3, 8]);
    expect(hoursOnBoard({ open: 0, close: 24 })).toEqual([-99, 99]);
    expect(boardOpen({ hours: null })).toEqual([-99, 99]);
  });
});

describe('casting a night from the neighbourhood', () => {
  const nights: { tier: TierIndex; c: BoardCase }[] = [];
  for (const tier of TIERS) {
    for (const type of typesFor(tier)) {
      for (let s = 1; s <= 6; s++) {
        const g = generateBoard(s, tier, { type, world: ctx });
        if (g) nights.push({ tier, c: g.kase });
        it(`casts ${type} at tier ${tier}, seed ${s}, and holds every invariant`, () => {
          expect(g).not.toBeNull();
          expect(invariantFailures(checkInvariants(g!.kase, g!.analysis))).toEqual([]);
        });
      }
    }
  }

  it('casts only people and places the bible has, watchers at their own places, and no fence or watcher as a suspect', () => {
    const fences = fencePeople(bible);
    const pool = new Set(castPool(bible).map((p) => p.id));
    for (const { c } of nights) {
      expect(c.world).toBe('neighbourhood');
      for (const p of c.people) {
        if (p.object) continue;
        expect(p.world, `${c.id} ${p.id}`).toBeDefined();
        const bp = bible.people.find((x) => x.id === p.world);
        expect(bp, `${c.id} ${p.world}`).toBeDefined();
        if (p.role === 'suspect' || p.role === 'victim' || p.role === 'client') expect(pool.has(p.world as string), `${c.id} ${p.world} is in the pool`).toBe(true);
        if (p.role === 'suspect') expect(fences.has(p.world as string)).toBe(false);
        if (p.id === 'barkeep' || p.id === 'xwatcher') {
          const place = c.places.find((x) => x.id === p.foundAt);
          expect(bible.places.find((x) => x.id === place?.world)?.watcher?.person, `${c.id} ${p.id}`).toBe(p.world);
        }
      }
      for (const pl of c.places) expect(bible.places.some((x) => x.id === pl.world), `${c.id} ${pl.id}`).toBe(true);
    }
  });

  it('keeps homes true: a lodger lives at the house, the scene is the wronged party’s, a Medium culprit’s flat is unwatched', () => {
    for (const { tier, c } of nights) {
      const scene = c.places.find((p) => p.scene);
      const wronged = c.people.find((p) => p.id === (c.type === 'murder' ? c.crime.victim : c.client));
      expect(bible.people.find((x) => x.id === wronged?.world)?.home, c.id).toBe(scene?.world);
      expect(bible.places.find((x) => x.id === scene?.world)?.watcher, `${c.id}: nobody watches the scene`).toBeNull();
      for (const p of c.people.filter((x) => x.role === 'suspect')) {
        const bp = bible.people.find((x) => x.id === p.world);
        if (p.home && !c.places.find((x) => x.id === p.home)?.scene) expect(c.places.find((x) => x.id === p.home)?.world, `${c.id} ${p.id}`).toBe(bp?.home);
      }
      if (tier >= 4) {
        const cu = c.people.find((p) => p.id === c.crime.culprit);
        const flat = c.places.find((p) => p.id === cu?.home);
        expect(bible.places.find((x) => x.id === flat?.world)?.watcher ?? null, c.id).toBeNull();
      }
    }
  });

  it('gives every suspect a reason from the bible, and no two alike', () => {
    for (const { c } of nights) {
      const sus = c.people.filter((p) => p.role === 'suspect');
      for (const p of sus) expect(p.motiveId, `${c.id} ${p.id}`).toMatch(/^(tie|via|debt|secret):/);
      expect(new Set(sus.map((p) => p.motiveForm)).size, c.id).toBe(sus.length);
      // A small case's thief sells it: their reason is about money.
      if (c.type !== 'murder') expect(c.people.find((p) => p.id === c.crime.culprit)?.motiveId, c.id).toMatch(/^(tie:(owes|owed|landlady|lodger|employer)|debt:)/);
    }
  });

  it('fixes the fence to the venue, and the report knows where the thing went', () => {
    const small = nights.filter(({ c }) => c.type !== 'murder');
    expect(small.length).toBeGreaterThan(0);
    for (const { c } of small) {
      const d = { kase: c, analysis: generateBoard(c.seed, c.tier, { type: c.type, world: ctx })!.analysis };
      const where = boardFields(d).find((f) => f.key === 'where');
      const truth = truthReport(d).where;
      expect(truth, c.id).not.toBe('scene');
      expect(where?.options.some((o) => o.value === truth), c.id).toBe(true);
    }
  });

  it('leaves the dealt cast alone: no world, no bible ids', () => {
    for (const tier of TIERS) {
      const g = generateBoard(3, tier);
      expect(g?.kase.world).toBeUndefined();
      expect(g?.kase.people.some((p) => p.world)).toBe(false);
    }
  });
});

describe('continuity', () => {
  it('never deals the same culprit twice running, and keeps the last wronged off the next night where the bible lets it', () => {
    for (const tier of [2, 4] as TierIndex[]) {
      const recent = { culprits: [] as string[], victims: [] as string[] };
      let seed = 1;
      let last: { culprit?: string; victim?: string } = {};
      for (let k = 0; k < 12; k++) {
        const d = dealBoard(seed, tier, undefined, { world: 'neighbourhood', avoid: { culprits: recent.culprits.slice(-1), victims: recent.victims.slice(-10) } });
        const now = castOf(d.kase);
        expect(now.culprit, `${tier} night ${k}`).not.toBe(last.culprit);
        expect(now.victim, `${tier} night ${k}`).not.toBe(last.victim);
        if (now.culprit) recent.culprits.push(now.culprit);
        if (now.victim) recent.victims.push(now.victim);
        last = now;
        seed = d.kase.seed + 1;
      }
    }
  });

  it('remembers who was cast in the profile, and hands it back as who to keep off', () => {
    let p = emptyProfile();
    for (let i = 0; i < 12; i++) p = recordRun(p, { tier: 2, points: 4, asked: 4, actionsUsed: 10, par: 10, cast: { culprit: `c${i}`, victim: `v${i}` } }).profile;
    expect(p.recent?.culprits.length).toBe(10);
    expect(continuityOf(p)).toEqual({ culprits: ['c11'], victims: ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11'] });
    expect(sanitizeProfile(JSON.parse(JSON.stringify(p))).recent).toEqual(p.recent);
    expect(keepsContinuity(dealBoard(1, 0, 'murder', { world: 'neighbourhood' }).kase, undefined)).toBe(true);
    // A dealt night remembers nobody.
    expect(recordRun(emptyProfile(), { tier: 0, points: 4, asked: 4, actionsUsed: 8, par: 8 }).profile.recent).toBeUndefined();
  });
});

describe('the prose draws on the bible first', () => {
  const runs = [
    dealBoard(3, 4, 'murder', { world: 'neighbourhood' }),
    dealBoard(5, 1, 'lost-pet', { world: 'neighbourhood' }),
    dealBoard(2, 2, 'lost-item', { world: 'neighbourhood' }),
    dealBoard(4, 5, 'murder', { world: 'neighbourhood' }),
  ].map((d) => ({ d, run: playBoardOracle(d).run }));

  it('says a place’s own arrival on the way in, and most of what an arrival and a staging say is the bible’s', () => {
    for (const { d, run } of runs) {
      let bible_ = 0;
      let total = 0;
      const been = new Set<string>();
      for (const p of run.log) {
        if (p.board?.job !== 'arrive' || !p.board.said) continue;
        // The first time in: going back says "Back at Sokol’s", not the arrival again.
        if (been.has(p.at)) continue;
        been.add(p.at);
        // A back room inside somebody else's place has an arrival of its own (the test below).
        if (d.kase.places.find((x) => x.id === p.at)?.key?.includes('#')) continue;
        expect(bible.places.some((pl) => pl.arrivals.some((a) => p.board?.said?.arrival.includes(a.text))), `${d.kase.id} p${p.n}`).toBe(true);
      }
      for (const p of run.log) {
        if (p.board?.job === 'office' || !p.board?.said) continue;
        for (const k of ['arrival', 'staging'] as const) {
          const x = bibleShare(bible, p.board.said[k]);
          bible_ += x.bible;
          total += x.total;
        }
      }
      expect(bible_ / total, d.kase.id).toBeGreaterThan(0.5);
    }
  });

  it('gives people their bible manner, and the walk the bible’s minutes', () => {
    const { d } = runs[0] as (typeof runs)[number];
    const c = d.kase;
    for (const p of c.people.filter((x) => x.role === 'suspect')) expect(mannerOf(c, p.id)).toBe(biblePerson(c, p.id)?.manner);
    const [x, y] = c.places.filter((p) => p.world && !p.offBoard && c.places.filter((q) => q.world === p.world).length === 1) as [BoardCase['places'][number], BoardCase['places'][number]];
    const minutes = bible.places.find((p) => p.id === x.world)?.minutes[y.world as string] as number;
    expect(walkBetween(c, x.id, y.id).minutes).toBe(Math.max(5, Math.min(40, Math.round(minutes / 5) * 5)));
  });

  it('frames an account in the person’s own words, and the evening itself stays the engine’s', () => {
    let framed = 0;
    for (const { d, run } of runs) {
      for (const p of run.log.filter((x) => x.board?.job === 'account')) {
        const who = (p.board?.q ?? '').slice('account:'.length);
        const bp = biblePerson(d.kase, who);
        const answer = p.blocks.find((b) => b.kind === 'prose' && b.voice === 'answer');
        if (bp && answer?.kind === 'prose' && bp.voice.ask.some((l) => answer.text.includes(l.replace(/^[“"]|[”"]$/g, '')))) framed++;
      }
      expect(lintBoardRun(d, run).filter((x) => x.rule === 'whole')).toEqual([]);
    }
    expect(framed).toBeGreaterThan(0);
  });

  it('keeps the lints at zero, a running gag at most twice a night, over the oracle’s and the wanderer’s nights', () => {
    for (const { d, run } of runs) {
      for (const r of [run, playWanderer(d, d.kase.seed).run]) {
        expect(lintBoardRun(d, r), d.kase.id).toEqual([]);
        expect(proseIssues(d, r), d.kase.id).toEqual([]);
        const text = r.log.flatMap((p) => p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text] : [])));
        for (const pl of bible.places) for (const g of pl.details.filter((x) => x.kind === 'gag')) expect(text.filter((t) => t.includes(g.text.slice(0, 40))).length, g.id).toBeLessThanOrEqual(2);
      }
    }
  });

  it('walks into a back room on its own arrival', () => {
    let rooms = 0;
    for (let s = 1; s <= 40 && rooms < 3; s++) {
      const d = dealBoard(s, 4, 'murder', { world: 'neighbourhood' });
      const back = d.kase.places.find((x) => x.key?.includes('#'));
      if (!back) continue;
      const host = bible.places.find((x) => x.id === back.world);
      const hide = host?.hides.find((h) => h.name === back.key?.split('#')[1]);
      // The first time in, on whichever route goes there.
      for (const run of [playBoardOracle(d).run, playWanderer(d, s).run]) {
        const p = run.log.find((x) => x.at === back.id && x.board?.job === 'arrive' && x.board.said);
        if (!p?.board?.said) continue;
        rooms++;
        expect(p.board.said.arrival.includes(hide?.arrival ?? '∅'), `${d.kase.id} p${p.n}: ${back.name}`).toBe(true);
      }
    }
    expect(rooms).toBeGreaterThan(0);
  });

  it('finds women dead only when WOMEN_VICTIMS says so, and then says her reasons as hers', () => {
    const dead = new Map<string, number>();
    for (let s = 1; s <= 30; s++) {
      const d = dealBoard(s, 3, 'murder', { world: 'neighbourhood' });
      const v = biblePerson(d.kase, d.kase.crime.victim);
      dead.set(v?.gender ?? '?', (dead.get(v?.gender ?? '?') ?? 0) + 1);
      if (v?.gender !== 'f') continue;
      expect(d.kase.places.find((p) => p.scene)?.name, d.kase.id).toMatch(new RegExp(`^the ${v.last} flat`));
      for (const p of d.kase.people.filter((x) => x.role === 'suspect')) {
        expect(p.motiveForm ?? '', `${d.kase.id} ${p.id}`).not.toMatch(/(?<![{\w])(him|his|He|His)\b(?!\})|dead man/);
        expect(p.motivePapers ?? '', `${d.kase.id} ${p.id}`).not.toMatch(/(?<![{\w])(he|him|his)\b(?!\})|dead man/);
      }
    }
    // docs/25, Bible 2: off until the engine's own lines can say "her".
    if (WOMEN_VICTIMS) expect(dead.get('f') ?? 0).toBeGreaterThan(5);
    else expect(dead.get('f') ?? 0).toBe(0);
    expect(dead.get('m') ?? 0).toBeGreaterThan(5);
  });

  it('says a dead woman’s reasons as hers, ready for the day she can be found', () => {
    const pool = castPool(bible);
    let said = 0;
    for (const wronged of pool.filter((p) => p.gender === 'f')) {
      for (const s of pool.filter((p) => p !== wronged)) {
        for (const m of motivesFor(bible.people, s, wronged, true, new Set(), (p) => p.last, { secrets: { placeName: (id) => bible.places.find((x) => x.id === id)?.name } })) {
          said++;
          expect(m.form, `${s.id} → ${wronged.id}`).not.toMatch(/(?<![{\w])(him|his|He|His)\b(?!\})|dead man/);
          expect(m.papers ?? '', `${s.id} → ${wronged.id}`).not.toMatch(/(?<![{\w])(he|him|his)\b(?!\})|dead man/);
        }
      }
    }
    expect(said).toBeGreaterThan(50);
    expect(ofVictim('He owed them money, and he knew it', true)).toBe('She owed them money, and she knew it');
    expect(ofVictim('a tally of what {he} owed him', true)).toBe('a tally of what {he} owed her');
  });

  it('has a watcher stand three ways across the nights, not one', () => {
    const said = new Map<string, Set<string>>();
    for (let s = 1; s <= 40; s++) {
      const d = dealBoard(s, 2, undefined, { world: 'neighbourhood' });
      for (const p of playBoardOracle(d).run.log) {
        const pl = bible.places.find((x) => x.id === d.kase.places.find((y) => y.id === p.at)?.world);
        const text = p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text.replace(/\s+/g, ' ')] : [])).join(' ');
        for (const l of pl?.watcher?.counts ?? []) if (text.includes(l.slice(0, 40))) (said.get(pl?.id as string) ?? said.set(pl?.id as string, new Set()).get(pl?.id as string))?.add(l);
      }
    }
    expect([...said.values()].some((x) => x.size >= 2)).toBe(true);
  });

  it('says nothing of a place’s front room in the back room of it', () => {
    let hides = 0;
    for (let s = 1; s <= 8; s++) {
      const d = dealBoard(s, 3, 'murder', { world: 'neighbourhood' });
      for (const r of [playBoardOracle(d).run, playWanderer(d, s).run]) {
        for (const p of r.log) {
          const pl = d.kase.places.find((x) => x.id === p.at);
          const hide = pl?.key?.split('#')[1];
          if (!hide || !pl?.world) continue;
          hides++;
          const host = bible.places.find((x) => x.id === pl.world);
          const words = (hide.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 5 && !['behind', 'through', 'under', 'among', 'where', 'upstairs'].includes(w));
          const text = p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text.replace(/\s+/g, ' ')] : [])).join(' ');
          for (const x of [...(host?.details ?? []).map((y) => y.text), ...(host?.arrivals ?? []).map((y) => y.text)]) {
            if (words.some((w) => x.toLowerCase().includes(w))) continue;
            expect(text.includes(x.slice(1, 40)), `${d.kase.id} p${p.n} at ${pl.name}: ${x.slice(0, 40)}`).toBe(false);
          }
        }
      }
    }
    expect(hides).toBeGreaterThan(0);
  });

  it('closes on what somebody was doing only where the bible has them doing it, and never on what the page already said they were doing', () => {
    let closes = 0;
    for (const { d } of runs) {
      for (const r of [playBoardOracle(d).run, playWanderer(d, d.kase.seed).run, playWanderer(d, d.kase.seed + 1).run]) {
        const night = r.log.flatMap((p) => p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text] : []))).join(' ').replace(/\s+/g, ' ');
        for (const p of r.log) {
          const prose = p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text.replace(/\s+/g, ' ')] : []));
          for (const t of prose) {
            // (docs/49, Planner 2, docs/56 A22: "Mrs. Szabo was still counting bills when I left", or, on a question page, "Mrs. Szabo went back to counting bills".)
            const m = /(?:^|\. )(?:Mrs\. |Miss |Dr\. |Mr\. )?[A-Z][\w’]+ (?:was still (.+) when I left|went back to (.+))\.$/.exec(t);
            if (!m) continue;
            const line = ((m[1] ?? m[2]) as string).toLowerCase();
            const who = d.kase.people.find((x) => x.world && biblePerson(d.kase, x.id)?.doing.some((y) => y.text.toLowerCase().replace(/\.$/, '') === line));
            if (!who) continue;
            closes++;
            const bp = biblePerson(d.kase, who.id);
            const doing = bp?.doing.find((y) => y.text.toLowerCase().replace(/\.$/, '') === line);
            const here = d.kase.places.find((x) => x.id === p.at)?.world;
            expect(doing?.setting === 'any' || doing?.setting === here, `${d.kase.id} p${p.n}: ${t}`).toBe(true);
            expect(night.toLowerCase().split(line).length - 1, `${d.kase.id} p${p.n}: ${t}`).toBe(1);
          }
        }
      }
    }
    expect(closes).toBeGreaterThan(0);
  });

  it('says somebody’s line for an hour only around their account, never inside it, and never for an hour the account gives a reason for (Planner 2)', () => {
    let lines = 0;
    for (let s = 1; s <= 12; s++) {
      for (const tier of [2, 4] as TierIndex[]) {
        const d = dealBoard(s, tier, 'murder', { world: 'neighbourhood' });
        for (const p of playBoardOracle(d).run.log.filter((x) => x.board?.job === 'account')) {
          const who = (p.board?.q ?? '').slice('account:'.length);
          const bp = biblePerson(d.kase, who);
          const a = accountOf(d.kase, who);
          const answer = p.blocks.find((b) => b.kind === 'prose' && b.voice === 'answer');
          if (!bp || !a || answer?.kind !== 'prose') continue;
          const reasoned = hoursWithReason(d.kase, a);
          // (docs/52 build 2: the account's lines are voiced on the page, so they're found by their units.)
          const said = (p.board?.units ?? []).filter((u) => u.kind === 'fact' && u.carries.some((x) => x.startsWith('claim:'))).map((u) => u.text.replace(/^“|”$/g, ''));
          const first = answer.text.indexOf((said[0] ?? '').slice(0, 20));
          const last = answer.text.indexOf((said[said.length - 1] ?? '').slice(0, 20));
          expect(first, `${d.kase.id} p${p.n}`).toBeGreaterThanOrEqual(0);
          for (const [h, l] of Object.entries(bp.voice.hours)) {
            const at = answer.text.indexOf(l.replace(/^[“"]|[”"]$/g, '').slice(0, 30));
            if (at < 0) continue;
            lines++;
            expect(reasoned.has(voiceHour(h) as never), `${d.kase.id} p${p.n}: ${l}`).toBe(false);
            expect(at < first || at > last, `${d.kase.id} p${p.n}: ${l}`).toBe(true);
          }
        }
      }
    }
    expect(lines).toBeGreaterThan(0);
  });

  it('closes a question page on somebody still at it ("went back to"), never on the last I saw of them (Planner 2, docs/56 A22)', () => {
    for (const world of [undefined, 'neighbourhood'] as const) {
      for (let s = 1; s <= 6; s++) {
        for (const tier of TIERS) {
          const d = dealBoard(s, tier, typesFor(tier)[s % typesFor(tier).length], world ? { world } : {});
          for (const r of [playBoardOracle(d).run, playWanderer(d, s).run]) {
            for (const p of r.log) for (const b of p.blocks) if (b.kind === 'prose') expect(b.text, `${d.kase.id} p${p.n}`).not.toMatch(/\bwas still [^.]+ when I left\b/);
          }
        }
      }
    }
  });

  it('says a dead woman as her everywhere: the office, the pages, the notebook and the curtain (Planner 2)', () => {
    let nights = 0;
    for (let s = 1; s <= 30 && nights < 4; s++) {
      const d = dealBoard(s, 4, 'murder', { world: 'neighbourhood' });
      const v = d.kase.people.find((x) => x.id === d.kase.crime.victim);
      if (!v?.female) continue;
      nights++;
      const run = playBoardOracle(d).run;
      const text = [...d.kase.givens.text, ...d.kase.finds.map((f) => `${f.what}. ${f.text}`), ...run.log.flatMap((p) => p.blocks.flatMap((b) => (b.kind === 'prose' ? [b.text] : []))), ...storyOfBoard(d), curtainOfBoard(d, run)].join(' ');
      for (const bad of [/\bthe dead man\b/, /\bwhere he died\b/, /\ba man’s papers\b/, /\bhis heart\b/, /\bby the warmth of him\b/, /\bfound him\b/, /\bhis usual\b/, /\bHe’d been at\b/, /\bmade him cocoa\b/, /\binto his (?:cocoa|rye|drink)\b/, /\bhis own (?:flat|table|rooms|place)\b/, /\bswore at him\b/, /\bHis papers\b/]) {
        expect(text, `${d.kase.id}: ${bad}`).not.toMatch(bad);
      }
      expect(text).toMatch(/\b(?:she|her)\b/);
    }
    expect(nights).toBe(4);
  });

  it('files a world night’s report at par, with the right reason', () => {
    for (const { d } of runs) {
      const o = playBoardOracle(d);
      const v = scoreBoard(d, o.run, o.report);
      expect(v.points, d.kase.id).toBe(v.asked);
    }
  });

  it('teaches the same six plain lines on a night from the neighbourhood as on any other', () => {
    expect(teachLines()).toEqual(BOARD_TEACH_LINES);
    expect(teachLines('neighbourhood')).toEqual(BOARD_TEACH_LINES);
    expect(BOARD_TEACH_LINES).toHaveLength(6);
  });
});

describe('the tools take --world', () => {
  it('plays a night from the neighbourhood through the CLI, and the save remembers it', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
    const out = runPlay(['new', '--seed', '3', '--tier', '2', '--world', 'neighbourhood', '--save', 'n.json'], io);
    expect(out.code).toBe(0);
    expect(out.out).toContain('HOW THIS WORKS');
    expect(JSON.parse(files.get('n.json') as string).world).toBe('neighbourhood');
    expect(runPlay(['look', '--save', 'n.json'], io).code).toBe(0);
    expect(runPlay(['new', '--seed', '3', '--tier', '2', '--world', 'atlantis', '--save', 'x.json'], io).code).not.toBe(0);
  });
});
