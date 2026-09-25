/**
 * Playtest round 2 (docs/25, "After playtest round 2"). Four blind testers
 * solved their nights and hit bugs that break trust in the one rule: people
 * lie about themselves; nobody lies about what they saw. One block a bug, on
 * the nights the testers played (their own commands, replayed) and, where the
 * fix is a rule, over a sweep of nights.
 */
import { describe, expect, it } from 'vitest';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { acquaintanceOf, generateCase } from '../src/gen/index.js';
import { owedTheOtherWay } from '../src/gen/data/motives.js';
import type { Clue, Id } from '../src/gen/types.js';
import { choicesFor, costLabel } from '../src/game/choices.js';
import { minutesPerAction } from '../src/game/clock.js';
import { buildView, gameBudget, goneObjects, type CaseView } from '../src/game/derive.js';
import { gridFrom } from '../src/game/grid.js';
import { softMarks } from '../src/game/guidance.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { caseOptions, type TierKey } from '../src/game/profile.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import { storyOf, storyParagraphs } from '../src/game/story.js';
import { renderPageBody } from '../src/game/transcript.js';
import type { RunState } from '../src/game/types.js';
import { RECAP_NOTHING_NEW } from '../src/game/voice-data.js';

const views = new Map<string, CaseView>();
function viewOf(seed: number, tier: TierKey, level = 2): CaseView {
  const key = `${seed}|${tier}|${level}`;
  let v = views.get(key);
  if (!v) {
    v = buildView(generateCase(seed, { ...caseOptions({ tier, level: level as 1 | 2, engine: 'v2' }), detectiveName: 'Dashiell' }));
    views.set(key, v);
  }
  return v;
}

/** The testers' own commands, replayed; every state and the page each wrote. */
function replay(view: CaseView, commands: readonly string[]): { states: RunState[]; pages: string[] } {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  const states = [state];
  const pages = [renderPageBody(state.log[0]!, view).replace(/\s+/g, ' ')];
  for (const c of commands) {
    state = stepInput(state, c, view).state;
    states.push(state);
    pages.push(renderPageBody(state.log[state.log.length - 1]!, view).replace(/\s+/g, ' '));
  }
  return { states, pages };
}

const COUNT3 = [
  'ask Hauck about that evening', 'ask Hauck about Steinbach', 'go Sirkin’s place', 'examine Sirkin’s place', 'go the Velvet Room',
  "ask Hauck who's here", 'ask Marchetti about that evening', 'ask Hargrove about the Velvet Room', 'go over what I have',
  'go the third floor', 'ask Rafferty about the third floor', 'ask Rafferty about Marchetti', 'examine the third floor', 'go the Velvet Room',
  'put w108 part 0 to Marchetti', 'ask Hargrove about Hauck', 'put w108 part 0 to Marchetti', 'put x054 part 0 to Hauck',
  'put w108 part 0 to Hauck', 'ask Vitale about Marchetti', 'ask Marchetti about Sirkin', 'go the kiosk', 'ask Renfro about Marchetti',
];
const POACHED2 = [
  'ask Lathrop about that evening', 'ask Lathrop about Ruggiero', 'ask Lathrop about Rosenbaum', 'ask Lathrop about themselves',
  'go Mrs. Kessler’s', 'ask Reinhardt about Ruggiero', 'ask Reinhardt about Lathrop', 'ask Reinhardt about Kessler',
  'ask Reinhardt about Rosenbaum', "ask Lathrop who's here", 'ask Ruggiero about Lathrop', 'ask Kessler about Mrs. Kessler’s',
  'ask Rosenbaum about Ruggiero', 'go the Hallam', 'ask Obermann about the Hallam', 'ask Obermann about Rosenbaum',
  'ask Prentiss about Rosenbaum', 'go over what I have', 'go Reinhardt’s place', 'go the Hallam', 'ask Obermann about Prentiss',
  'put x035 part 0 to Prentiss', 'put x035 part 0 to Prentiss',
];
const MED21 = [
  'ask Bellucci about that evening', 'ask Bellucci about Quill', 'go Lefkowitz’s place', 'examine Lefkowitz’s place',
  'examine a framed photograph', 'examine a wall telephone', 'go the Keystone', 'ask Tramonti about the Keystone',
  'ask Tramonti about Bellucci', 'examine an ice pick', 'ask Quill about that evening', 'ask Petrosino about that evening',
  'ask Quill about Petrosino and Lefkowitz', 'ask Petrosino about the Keystone', 'ask Tramonti about Ruggiero', 'go the Lyric stand',
  "ask Bellucci who's here", 'ask Hargrove about the Lyric stand',
];
const RAW11 = [
  'ask Abramowitz about that evening', 'ask Abramowitz about Fairbanks', 'go the Garibaldi', "ask Abramowitz who's here",
  'ask Abramowitz about Rafferty', 'ask Fairbanks about that evening', 'ask Rafferty about Abramowitz', 'ask Tillman about the Garibaldi',
  'go over what I have', 'ask Fairbanks about Rafferty', 'put x002 part 0 to Rafferty', 'put c007 part 0 to Rafferty',
  'ask Tillman about Rafferty', 'put x016 part 2 to Rafferty', 'ask Tillman about Fairbanks',
];

/** The configurations the sweeps walk: v2, Raw to Hard-boiled. */
const SWEEP: [TierKey, number][] = [
  [0, 1],
  [2, 2],
  [4, 2],
  [5, 2],
];
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 11, 21];

/** Fact kinds a sighting is made of (or a person's own word): they name nobody the speaker cannot. */
const SEEN = new Set(['personAt', 'personNotAt', 'personAtAnchor', 'describedAt', 'apart', 'together', 'claims', 'acquainted', 'countAt', 'absentFrom']);

describe('1. nobody has "never heard of" somebody their own line names', () => {
  it('every line that names a suspect is said by somebody who knows the name', () => {
    let checked = 0;
    for (const [tier, level] of SWEEP) {
      for (const seed of SEEDS) {
        const view = viewOf(seed, tier, level);
        const k = view.kase;
        const knows = (from: Id, to: Id): boolean => {
          const e = acquaintanceOf(k, from, to);
          return !e || e.strength === 'name' || e.strength === 'relation' || e.heard === true;
        };
        const pointed = k.clientBrief.points.personId;
        if (view.personById.get(pointed)?.kind === 'suspect') expect(knows(k.clientId, pointed), `seed ${seed} tier ${tier}: the client's pointer`).toBe(true);
        for (const c of k.findable) {
          if (c.source.type !== 'person') continue;
          for (const f of c.establishes) {
            if (SEEN.has(f.kind) || !('personId' in f) || typeof f.personId !== 'string') continue;
            if (f.personId === c.source.personId || view.personById.get(f.personId)?.kind !== 'suspect') continue;
            checked++;
            expect(knows(c.source.personId, f.personId), `seed ${seed} tier ${tier}: ${c.id} ${c.text}`).toBe(true);
          }
          // And their answer about the person says so.
          if (c.kind === 'testimony' && c.about) {
            const e = acquaintanceOf(k, c.source.personId, c.about);
            if (e?.heard) {
              expect(c.text).not.toMatch(/does not know anybody called/);
              expect(c.establishes.some((f) => f.kind === 'acquainted' && f.heard)).toBe(true);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('seed 3: Hauck points at Steinbach and Rafferty names Marchetti, and neither says "never heard of"', () => {
    const view = viewOf(3, 4);
    expect(view.victim.surname).toBe('Sirkin');
    const { pages } = replay(view, COUNT3.slice(0, 12));
    expect(pages[1 + COUNT3.indexOf('ask Hauck about Steinbach')]).toMatch(/I know the name/);
    expect(pages[1 + COUNT3.indexOf('ask Rafferty about Marchetti')]).toMatch(/I know the name/);
    for (const p of pages) expect(p).not.toMatch(/Never heard of (?:him|her)/);
  });

  it('a landlady knows the owner of the block by name (seed 11, Raw)', () => {
    const view = viewOf(11, 0, 1);
    const { pages } = replay(view, RAW11);
    const last = pages[pages.length - 1] as string;
    expect(last).toMatch(/I know the name/);
    expect(last).not.toMatch(/I’d have remembered the name|Never heard/);
  });
});

describe('2. a debt runs one way, from the truth', () => {
  it('seed 21: Petrosino was owed the money, in the witness, the notebook, the story and the curtain', () => {
    const view = viewOf(21, 4);
    const petrosino = view.kase.people.find((p) => p.surname === 'Petrosino') as NonNullable<(typeof view.kase.people)[number]>;
    expect(owedTheOtherWay('debt', petrosino.relationshipId)).toBe(true);
    const { states, pages } = replay(view, MED21);
    const text = pages.join('\n');
    expect(text).not.toMatch(/Petrosino owed money/);
    expect(text).toMatch(/Petrosino was owed money/);
    const book = buildNotebook(view, states[states.length - 1] as RunState);
    expect(book.established.motives.join(' ')).toMatch(/Petrosino — was owed money/);
    const story = storyParagraphs(storyOf(view.kase)).join(' ');
    expect(story).not.toMatch(/Petrosino owed|He owed Lefkowitz/);
  });

  it('every hasMotive rule says the debt the way the tie has it', () => {
    for (const [tier, level] of SWEEP) {
      for (const seed of SEEDS) {
        const view = viewOf(seed, tier, level);
        for (const c of view.kase.findable) {
          for (const f of c.establishes) {
            if (f.kind !== 'hasMotive' || f.motiveType !== 'debt') continue;
            const owed = owedTheOtherWay('debt', view.personById.get(f.personId)?.relationshipId);
            if (owed) expect(c.rule ?? '').not.toMatch(/had a reason: owed money/);
          }
        }
      }
    }
  });
});

describe('3. a grid mark rests on ground', () => {
  it('"? not seen by X" only where X was shown there by something other than their own story, and knows the name', () => {
    let marks = 0;
    for (const [tier, level] of SWEEP) {
      for (const seed of SEEDS.slice(0, 6)) {
        const view = viewOf(seed, tier, level);
        for (const steps of [playOracle(view).steps, playWandering(view, seed).steps]) {
          let state = newRun(view, { detectiveName: 'Dashiell' });
          for (const s of steps) {
            state = stepInput(state, s.command, view).state;
            if (state.filed || state.reportOpen) break;
            const found = state.found.map((id) => view.findableById.get(id)).filter((c): c is Clue => c !== undefined);
            for (const m of softMarks(view, state)) {
              if (m.kind !== 'unseen' || !m.by) continue;
              marks++;
              const w = m.by;
              const shown = found.some(
                (c) =>
                  c.kind !== 'account' &&
                  c.establishes.some((f) =>
                    c.source.type === 'person' && c.source.personId === w
                      ? ((f.kind === 'countAt' || f.kind === 'describedAt' || (f.kind === 'personAt' && f.personId !== w)) && f.place === m.placeId && f.tick === m.tick) ||
                        (f.kind === 'absentFrom' && f.place === m.placeId && f.ticks.includes(m.tick))
                      : f.kind === 'personAt' && f.personId === w && f.place === m.placeId && f.tick === m.tick,
                  ),
              );
              expect(shown, `seed ${seed} tier ${tier}: ${m.text} at ${m.tick}`).toBe(true);
              const e = acquaintanceOf(view.kase, w, m.personId);
              expect(e === undefined || e.strength === 'name' || e.strength === 'relation', `${m.text}: the witness can name them`).toBe(true);
            }
          }
        }
      }
    }
    expect(marks).toBeGreaterThan(0);
  });

  it('seed 21: no mark from Bellucci’s own story; seed 3: Rafferty marks nobody she cannot name', () => {
    const med = viewOf(21, 4);
    const { states } = replay(med, MED21);
    for (const s of states) for (const m of softMarks(med, s)) expect(m.by === undefined || med.personById.get(m.by)?.surname !== 'Bellucci').toBe(true);
    const count = viewOf(3, 4);
    const { states: c3 } = replay(count, COUNT3);
    for (const s of c3) {
      for (const m of softMarks(count, s)) {
        if (m.kind === 'unseen') expect(`${count.personById.get(m.by as Id)?.surname} ${count.personById.get(m.personId)?.surname}`).not.toBe('Rafferty Marchetti');
      }
    }
  });

  it('a "nobody but" counts everybody it names, as its words do (seed 3: Hauck and the patrolman at half past seven)', () => {
    const view = viewOf(3, 4);
    const { states } = replay(view, COUNT3.slice(0, 8));
    const grid = gridFrom(view, states[states.length - 1] as RunState);
    const velvet = view.kase.places.find((p) => p.shortName === 'the Velvet Room')?.id;
    const at730 = grid.counts.filter((c) => c.placeId === velvet && c.tick === 3).map((c) => c.count);
    expect(at730).toContain(2);
    expect(at730).not.toContain(1);
  });
});

describe('4. a watcher’s count says every half hour at the door, and who was there', () => {
  it('seed 3: Hargrove says something of eight o’clock, and never "came in"', () => {
    const view = viewOf(3, 4);
    const { pages } = replay(view, COUNT3.slice(0, 8));
    const page = pages[pages.length - 1] as string;
    const counted = page.slice(page.indexOf('besides me'));
    expect(page).toMatch(/At six o’clock there were two in here, besides me/);
    expect(counted).toMatch(/At eight o’clock I couldn’t swear to a number/);
    expect(page).not.toMatch(/came in at|Two came in/);
  });

  it('every count telling covers every half hour the watcher kept the door', () => {
    let tellings = 0;
    for (const [tier, level] of SWEEP) {
      for (const seed of SEEDS.slice(0, 5)) {
        const view = viewOf(seed, tier, level);
        const watchers = view.kase.people.filter((p) => p.kind === 'fixture' && p.fixtureRole !== 'beat-cop' && p.foundAt);
        for (const w of watchers) {
          let state = newRun(view, { detectiveName: 'Dashiell' });
          state = stepInput(state, `go ${view.placeById.get(w.foundAt as Id)?.shortName}`, view).state;
          state = stepInput(state, `ask ${w.surname} about ${view.placeById.get(w.foundAt as Id)?.shortName}`, view).state;
          const page = state.log[state.log.length - 1]!;
          const trace = (page.beats ?? []).find((b) => b.kind === 'telling' && b.rendered && b.tag === 'counts');
          if (!trace) continue;
          tellings++;
          const said = new Set(trace.ticks ?? []);
          const truth = view.kase.schedules.find((s) => s.personId === w.id)?.truth ?? [];
          for (let t = 0; t < 12; t++) {
            if (truth[t] === w.foundAt) expect(said.has(t as never), `seed ${seed} tier ${tier} ${w.surname} at tick ${t}`).toBe(true);
          }
        }
      }
    }
    expect(tellings).toBeGreaterThan(10);
  });
});

const HOURS = ['six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
/** "six o’clock", "half past seven", and the bare "eight" / "half past" a span ends on. */
function tickOf(words: string, from?: number): number | null {
  const w = words.trim();
  let m = /^half past (\w+)$/.exec(w);
  if (m) return HOURS.indexOf(m[1] as string) * 2 + 1;
  m = /^(\w+)(?: o’clock)?$/.exec(w);
  if (m && HOURS.includes(m[1] as string)) return HOURS.indexOf(m[1] as string) * 2;
  if (w === 'half past' && from !== undefined) return from - (from % 2) + 1;
  return null;
}
/** The half hours a count answer says it "couldn't swear to a number" for. */
function unswornTicks(text: string): number[] {
  const out: number[] = [];
  const flat = text.replace(/\s+/g, ' ');
  for (const m of flat.matchAll(/(At|From) ([a-z’ ]+?)(?: until ([a-z’ ]+?))? I couldn’t swear to a number/g)) {
    const a = tickOf(m[2] as string);
    if (a === null) continue;
    const b = m[3] ? tickOf(m[3] as string, a) : a;
    for (let t = a; t <= (b ?? a); t++) out.push(t);
  }
  return out;
}

describe('4b. a watcher never contradicts their own count (coordinator, PR #56)', () => {
  it('seed 3 route: Rafferty’s part count and her whole count agree', () => {
    const view = viewOf(3, 4);
    let state = newRun(view, { detectiveName: 'Dashiell' });
    for (const s of playOracle(view).steps) {
      state = stepInput(state, s.command, view).state;
      if (state.filed || state.reportOpen) break;
    }
    const tellings = state.log.flatMap((p) => (p.beats ?? []).filter((b) => b.kind === 'telling' && b.rendered && b.tag === 'counts'));
    expect(tellings.length).toBeGreaterThan(1);
    const text = tellings.map((b) => b.text ?? '').join(' ');
    expect(text).not.toMatch(/From six until half past ten I couldn’t swear/);
  });

  it('no answer says a half hour is uncounted that any count of the same watcher covers, on the four playtest seeds', () => {
    const nights: [CaseView, string[][]][] = [
      [viewOf(3, 4), [COUNT3]],
      [viewOf(21, 4), [MED21]],
      [viewOf(2, 2), [POACHED2]],
      [viewOf(11, 0, 1), [RAW11]],
    ];
    let checked = 0;
    for (const [view, saves] of nights) {
      const routes = [...saves, playOracle(view).steps.map((s) => s.command), playWandering(view, view.kase.seed).steps.map((s) => s.command)];
      // And every watcher asked about every person and their own door, in turn.
      const watchers = view.kase.people.filter((p) => p.kind === 'fixture' && p.fixtureRole !== 'beat-cop' && p.foundAt);
      for (const w of watchers) {
        const place = view.placeById.get(w.foundAt as Id)?.shortName as string;
        routes.push([`go ${place}`, ...view.kase.people.filter((p) => p.id !== w.id).map((p) => `ask ${w.surname} about ${p.surname}`), `ask ${w.surname} about ${place}`, 'go on', 'go on']);
      }
      for (const commands of routes) {
        let state = newRun(view, { detectiveName: 'Dashiell' });
        for (const c of commands) {
          state = stepInput(state, c, view).state;
          if (state.filed || state.reportOpen) break;
        }
        for (const page of state.log) {
          for (const b of page.beats ?? []) {
            if (b.kind !== 'telling' || !b.rendered || b.tag !== 'counts') continue;
            const speaker = b.personIds?.[0] ? view.personById.get(b.personIds[0] as Id) : undefined;
            const post = speaker?.foundAt;
            if (!speaker || !post) continue;
            const counted = new Set<number>();
            for (const c of view.kase.findable) {
              if (c.source.type !== 'person' || c.source.personId !== speaker.id) continue;
              for (const f of c.establishes) {
                if (f.kind === 'countAt' && f.place === post) counted.add(f.tick);
                if (f.kind === 'absentFrom' && f.place === post) for (const t of f.ticks) counted.add(t);
              }
            }
            for (const t of unswornTicks(b.text ?? '')) {
              checked++;
              expect(counted.has(t), `seed ${view.kase.seed} ${speaker.surname} page ${page.n}: "couldn’t swear" at tick ${t}, which another answer counts: ${b.text}`).toBe(false);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });
});

describe('5. the page says what was chosen, and what is true', () => {
  it('seed 2: asked for her evening, Lathrop gives her evening first, and nothing about anybody else’s evening is asked', () => {
    const view = viewOf(2, 2);
    const { pages } = replay(view, POACHED2.slice(0, 1));
    const page = pages[1] as string;
    expect(page).not.toMatch(/about Rosenbaum’s evening/);
    const evening = page.search(/Mrs\. Kessler’s|the Hallam|Moe’s/);
    const rosenbaum = page.indexOf('I saw him');
    expect(evening).toBeGreaterThan(0);
    if (rosenbaum >= 0) expect(evening).toBeLessThan(rosenbaum);
  });

  it('seed 2: the confrontation names the half hour the story broke at', () => {
    const view = viewOf(2, 2);
    const { states, pages } = replay(view, POACHED2.slice(0, 22));
    const rec = (states[states.length - 1]!.confronts ?? []).at(-1);
    expect(rec?.outcome).toBe('second-lie');
    // Outside the fact read out (which names all its hours), the page speaks
    // only of the half hour the story broke at.
    const narration = (pages[pages.length - 1] as string).replace(/“[^”]*”/g, '');
    const hours = narration.match(/(?:half past )?(?:six|seven|eight|nine|ten|eleven)(?: o’clock)?/g) ?? [];
    expect(hours.length).toBeGreaterThan(0);
    for (const h of hours) expect(h).toBe('half past seven');
  });

  it('a thing a find says is gone is never in a room’s list to search (seed 3, the chloral)', () => {
    const view = viewOf(3, 4);
    const gone = goneObjects(view.kase, []);
    const chloral = view.kase.objects.find((o) => /chloral/.test(o.name));
    expect(chloral && gone.has(chloral.id)).toBe(true);
    const { states } = replay(view, COUNT3.slice(0, 10));
    const labels = choicesFor(view, states[states.length - 1] as RunState).flatMap((g) => g.choices.map((c) => c.label));
    expect(labels.some((l) => /chloral/.test(l))).toBe(false);
  });

  it('seed 3: no "never came in", no "It put her somewhere" of somebody not seen, no "It was there" of somebody to ask', () => {
    const view = viewOf(3, 4);
    const { pages } = replay(view, COUNT3);
    const text = pages.join('\n');
    expect(text).not.toMatch(/never came in/);
    expect(pages[pages.length - 1]).not.toMatch(/It put her somewhere/);
    expect(text).not.toMatch(/It was there, just as/);
  });
});

describe('6. a fact that broke one story may be put to the next', () => {
  it('seed 2: the fact that broke Prentiss’s first story is put to his second, and lands', () => {
    const view = viewOf(2, 2);
    const { states, pages } = replay(view, POACHED2);
    expect(pages[pages.length - 1]).not.toMatch(/I had put that to Prentiss already/);
    const recs = (states[states.length - 1]!.confronts ?? []).filter((r) => view.personById.get(r.personId)?.surname === 'Prentiss');
    expect(recs.length).toBe(2);
    expect(recs[1]?.outcome).not.toBe('wrong');
  });
});

describe('7. "Go over what I have" is a real summary', () => {
  it('never the joke, and says what is still open, on all four nights', () => {
    const nights: [CaseView, string[]][] = [
      [viewOf(3, 4), COUNT3],
      [viewOf(2, 2), POACHED2],
      [viewOf(11, 0, 1), RAW11],
      [viewOf(21, 4), MED21],
    ];
    for (const [view, commands] of nights) {
      const { states, pages } = replay(view, commands);
      commands.forEach((c, i) => {
        if (c !== 'go over what I have') return;
        const page = pages[i + 1] as string;
        expect(page).not.toContain(RECAP_NOTHING_NEW);
        expect(page).not.toMatch(/didn’t have the hour yet/);
        expect(page).toMatch(/I still didn’t know/);
      });
      // And asked for again straight away, it still goes over it.
      const last = states[states.length - 1] as RunState;
      if (last.filed || last.reportOpen || last.at === view.office.id) continue;
      const again = stepInput(stepInput(last, 'go over what I have', view).state, 'go over what I have', view).state;
      expect(renderPageBody(again.log[again.log.length - 1]!, view)).not.toContain(RECAP_NOTHING_NEW);
    }
  });
});

describe('8. the play CLI', () => {
  function memoryIo(): PlayIo {
    const files = new Map<string, string>();
    return { read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
  }
  it('`link` confirms the link, and links the whole sighting', () => {
    const io = memoryIo();
    runPlay(['new', '--seed', '3', '--tier', '4', '--engine', 'v2', '--save', 'n.json', '--no-teach'], io);
    for (const c of COUNT3.slice(0, 11)) expect(runPlay(['do', c, '--save', 'n.json'], io).code).toBe(0);
    const list = runPlay(['link', '--save', 'n.json'], io).out.replace(/\n(?!\d+\.)/g, ' ');
    expect(list).toMatch(/8:30–9:30 PM · at the third floor/);
    const n = (list.split('\n').find((l) => /8:30–9:30 PM · at the third floor/.test(l)) ?? '').split('.')[0];
    const out = runPlay(['link', `${n} Steinbach`, '--save', 'n.json'], io);
    expect(out.code).toBe(0);
    expect(out.out.replace(/\s+/g, ' ')).toMatch(/^Linked: a man in his thirties · 8:30–9:30 PM · at the third floor → Steinbach/);
    expect(out.out).not.toMatch(/RULES/);
    expect(runPlay(['link', '--save', 'n.json'], io).out.replace(/\s+/g, ' ')).toMatch(/8:30–9:30 PM · at the third floor → Steinbach/);
  });

  it('the notebook says a door’s counts once, a half hour once', () => {
    const view = viewOf(3, 4);
    const { states } = replay(view, COUNT3.slice(0, 12));
    const book = buildNotebook(view, states[states.length - 1] as RunState);
    for (const p of book.people) {
      const counts = p.records.filter((r) => /^Counted at /.test(r.text));
      const places = counts.map((r) => r.text.split(',')[0]);
      expect(new Set(places).size).toBe(places.length);
      expect(p.records.some((r) => /came into|one person came/.test(r.text))).toBe(false);
    }
    expect(book.people.some((p) => p.records.some((r) => /^Counted at the third floor, besides herself: .*7:00 PM Vitale, nobody else/.test(r.text)))).toBe(true);
  });
});

describe('9. a call five minutes off the usual says why', () => {
  it('every paid choice is the night’s usual minutes, or says it was rounded', () => {
    for (const [seed, tier, level] of [
      [3, 4, 2],
      [11, 0, 1],
      [2, 2, 2],
    ] as const) {
      const view = viewOf(seed, tier, level);
      const usual = minutesPerAction(gameBudget(view.kase));
      let state = newRun(view, { detectiveName: 'Dashiell' });
      let rounded = 0;
      for (const s of playOracle(view).steps) {
        for (const c of choicesFor(view, state).flatMap((g) => g.choices)) {
          if (c.minutes <= 0) continue;
          // docs/40 §3: a name says both its prices, and which is the call's.
          if (c.nameCost) {
            expect([c.nameCost.full, c.nameCost.short]).toContain(c.minutes);
            expect(costLabel(c)).toBe(`${c.nameCost.full} min${c.nameCost.full !== usual ? ' (rounded)' : ''} or 5`);
            continue;
          }
          if (c.minutes !== usual) {
            rounded++;
            expect(costLabel(c)).toBe(`${c.minutes} min (rounded)`);
          } else expect(costLabel(c)).not.toMatch(/rounded/);
        }
        state = stepInput(state, s.command, view).state;
        if (state.reportOpen || state.filed) break;
      }
      if (seed === 3) expect(rounded).toBeGreaterThan(0);
    }
  });
});
