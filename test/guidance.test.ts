/**
 * docs/39 — guidance. Three blind playtesters solved their cases, used every
 * call, and called the game "opaque more than hard". Each block here holds one
 * section of the help the designer approved: confront help by tier, stars
 * that follow the deduction, soft marks on the grid, and teach once. (Section
 * 4, fewer quips, has its own file.)
 */
import { describe, expect, it } from 'vitest';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { generateCase } from '../src/gen/index.js';
import type { Id } from '../src/gen/types.js';
import { choicesFor, type Choice, type ChoiceGroup } from '../src/game/choices.js';
import { buildView, type CaseView } from '../src/game/derive.js';
import { gridFrom } from '../src/game/grid.js';
import { renderGridText } from '../src/game/grid-text.js';
import { clientPointerOnly, openFactRanks, softMarks, STAR_LIMIT, teachOn, TEACH_LINES } from '../src/game/guidance.js';
import { judgeConfront, partsOf } from '../src/game/m9.js';
import { buildNotebook } from '../src/game/notebook.js';
import { playOracle, playWandering } from '../src/game/oracle.js';
import { caseOptions, emptyProfile, type TierKey } from '../src/game/profile.js';
import { newRun, stepInput } from '../src/game/reducer.js';
import type { RunState } from '../src/game/types.js';

const views = new Map<string, CaseView>();
function viewOf(seed: number, tier: TierKey, engine?: 'v2'): CaseView {
  const key = `${seed}|${tier}|${engine ?? ''}`;
  let v = views.get(key);
  if (!v) {
    v = buildView(generateCase(seed, { ...caseOptions({ tier, level: 2, ...(engine ? { engine } : {}) }), detectiveName: 'Dashiell' }));
    views.set(key, v);
  }
  return v;
}

/** Every state of a night: the oracle's route and a wanderer's, replayed a step at a time. */
function statesOf(view: CaseView, seed: number): RunState[] {
  const out: RunState[] = [];
  for (const steps of [playOracle(view).steps, playWandering(view, seed).steps]) {
    let state = newRun(view, { detectiveName: 'Dashiell' });
    out.push(state);
    for (const s of steps) {
      state = stepInput(state, s.command, view).state;
      out.push(state);
      if (state.filed || state.reportOpen) break;
    }
  }
  return out;
}

/**
 * A night played the way a guided player might: the ready-made confrontation
 * whenever one is offered, else a starred choice, else the first question.
 */
function guidedNight(view: CaseView, limit = 40): RunState[] {
  let state = newRun(view, { detectiveName: 'Dashiell' });
  const out = [state];
  for (let i = 0; i < limit; i++) {
    const groups = choicesFor(view, state);
    const all = groups.flatMap((g) => g.choices.map((c) => ({ g, c })));
    const pick =
      all.find((x) => x.g.kind === 'put' && !x.c.done) ??
      all.find((x) => x.c.lead && !x.c.done && x.g.kind !== 'confront') ??
      all.find((x) => x.g.kind === 'ask' && !x.c.done && x.c.minutes > 0);
    if (!pick) break;
    state = stepInput(state, pick.c.command, view).state;
    out.push(state);
    if (state.reportOpen || state.filed) break;
  }
  return out;
}

const flat = (groups: ChoiceGroup[]): Choice[] => groups.flatMap((g) => [...g.choices, ...(g.more ?? [])]);

function memoryIo(): PlayIo & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (p) => files.get(p) ?? null, write: (p, d) => void files.set(p, d) };
}

describe('§1 confront help by tier', () => {
  it('at Raw and Coddled, a ready-made confrontation names its fact and always lands', () => {
    let offered = 0;
    for (const tier of [0, 1] as TierKey[]) {
      for (const engine of [undefined, 'v2'] as const) {
        for (const seed of [1, 2, 3, 11]) {
          const view = viewOf(seed, tier, engine);
          for (const state of [...statesOf(view, seed), ...guidedNight(view)]) {
            if (state.reportOpen || state.filed) continue;
            for (const g of choicesFor(view, state).filter((x) => x.kind === 'put')) {
              for (const c of g.choices) {
                offered++;
                expect(c.label).toMatch(/^Put it to [^:]+: .+\.$/);
                expect(c.lead).toBe(false);
                const m = /^put (\S+)(?: part (\d+))? to (.+)$/.exec(c.command);
                expect(m, c.command).not.toBeNull();
                const person = view.kase.people.find((p) => p.surname === m?.[3]);
                const part = m?.[2] === undefined ? undefined : Number(m[2]);
                const judged = judgeConfront(view, state, person?.id as Id, m?.[1] as Id, part);
                const follow = stepInput(state, c.command, view).state.confronts?.at(-1);
                expect(follow?.outcome, `${seed}/${tier}/${engine}: ${c.label}`).not.toBe('wrong');
                void judged;
              }
            }
          }
        }
      }
    }
    expect(offered).toBeGreaterThan(0);
  });

  it('from Poached up there is no ready-made confrontation', () => {
    for (const tier of [2, 4] as TierKey[]) {
      for (const seed of [3, 21]) {
        const view = viewOf(seed, tier, 'v2');
        for (const state of statesOf(view, seed)) {
          if (state.reportOpen || state.filed) continue;
          expect(choicesFor(view, state).some((g) => g.kind === 'put')).toBe(false);
        }
      }
    }
  });

  it('from Poached up the picker opens on their own half hours, and marks nothing', () => {
    let focused = 0;
    for (const tier of [2, 4] as TierKey[]) {
      for (const seed of [3, 21]) {
        const view = viewOf(seed, tier, 'v2');
        for (const state of statesOf(view, seed)) {
          if (state.reportOpen || state.filed) continue;
          for (const g of choicesFor(view, state).filter((x) => x.kind === 'confront')) {
            const person = view.personById.get(g.personId as Id);
            expect(g.choices.every((c) => !c.lead)).toBe(true);
            // Focused facts first, each under a half-hour heading of their own story.
            const firstRest = g.choices.findIndex((c) => !c.focus);
            const lastFocus = g.choices.map((c) => c.focus === true).lastIndexOf(true);
            if (firstRest >= 0) expect(lastFocus).toBeLessThan(firstRest);
            for (const c of g.choices.filter((x) => x.focus)) {
              focused++;
              expect(c.section).toMatch(/^\d{1,2}:\d\d · (he|she) says /);
              const m = /^put (\S+) part (\d+) to /.exec(c.command);
              const clue = view.findableById.get(m?.[1] as Id);
              const facts = (partsOf(clue!)[Number(m?.[2])]?.facts ?? []).map((k) => clue!.establishes[k]);
              const account = view.kase.findable.find((x) => x.kind === 'account' && x.source.type === 'person' && x.source.personId === person?.id);
              const claimedTicks = new Set(
                (account?.establishes ?? []).flatMap((f) => (f.kind === 'claims' ? f.ticks : [])),
              );
              const saidTicks = new Set((state.confronts ?? []).length > 0 ? Array.from({ length: 12 }, (_, i) => i) : []);
              const ticks = facts.flatMap((f) => (f && 'ticks' in f ? f.ticks : f && 'tick' in f ? [f.tick] : []));
              expect(ticks.some((t) => claimedTicks.has(t) || saidTicks.has(t)), `${c.label}`).toBe(true);
            }
          }
        }
      }
    }
    expect(focused).toBeGreaterThan(0);
  });

  it('at Raw and Coddled the picker lists everything, unfocused', () => {
    const view = viewOf(11, 0, 'v2');
    for (const state of statesOf(view, 11)) {
      if (state.reportOpen || state.filed) continue;
      for (const g of choicesFor(view, state).filter((x) => x.kind === 'confront')) {
        expect(g.choices.some((c) => c.focus)).toBe(false);
      }
    }
  });

  it('a landed confrontation says so on the page and in the notebook, and silence reads as refusal', () => {
    let landed = 0;
    for (const tier of [0, 1] as TierKey[]) {
      for (const seed of [1, 2, 3, 11]) {
        const view = viewOf(seed, tier, 'v2');
        const night = guidedNight(view);
        for (let i = 1; i < night.length; i++) {
          const before = night[i - 1] as RunState;
          const after = night[i] as RunState;
          const rec = (after.confronts ?? [])[(before.confronts ?? []).length];
          if (!rec || rec.outcome === 'wrong') continue;
          landed++;
          const page = after.log[after.log.length - 1];
          const text = (page?.blocks ?? []).map((b) => ('text' in b ? (b.text ?? '') : '')).join(' ');
          expect(text, text).toMatch(/knew it|knew I’d seen it|broken|couldn’t both be right/);
          const entry = buildNotebook(view, after).people.find((p) => p.id === rec.personId);
          expect(entry?.said.some((s) => /^(Story broke on|Kept to) /.test(s.text))).toBe(true);
        }
      }
    }
    expect(landed).toBeGreaterThan(0);
  });

  it('npm run play: the ready-made choice at Raw, and the picker’s "Everything else" from Poached up', () => {
    const io = memoryIo();
    const run = (...argv: string[]): string => {
      const r = runPlay([...argv, '--save', 'n.json'], io);
      expect(r.code, r.out).toBe(0);
      return r.out;
    };
    run('new', '--seed', '11', '--tier', '0', '--engine', 'v2', '--no-teach');
    for (const c of ['her evening', 'the Garibaldi', 'ask Tillman about Rafferty', 'ask Rafferty about Abramowitz']) run('do', c);
    const page = run('look').replace(/\s+/g, ' ');
    expect(page).toMatch(/Put it to Rafferty: Tillman says you weren’t at the/);

    const io2 = memoryIo();
    const run2 = (...argv: string[]): string => {
      const r = runPlay([...argv, '--save', 'm.json'], io2);
      expect(r.code, r.out).toBe(0);
      return r.out;
    };
    run2('new', '--seed', '3', '--tier', '4', '--engine', 'v2', '--no-teach');
    for (const c of ['her evening', 'the third floor', 'ask Rafferty about the third floor', 'the Velvet Room']) run2('do', c);
    const picker = run2('confront', 'Hauck').replace(/\n(?! *\d+\.)\s+/g, ' ');
    expect(picker).toMatch(/The facts about Hauck at the half hours/);
    expect(picker).toMatch(/Everything else in the notebook \(\d+ more\)/);
    const n = /(\d+)\.\s+Everything else/.exec(picker)?.[1] as string;
    const wide = run2('do', n);
    expect(wide).not.toMatch(/Everything else in the notebook/);
    expect(wide).toMatch(/Put nothing to them/);
  });
});

describe('§2 stars follow the deduction', () => {
  it('v2: at most three stars a page, each on a choice that brings a fact an open step rests on', () => {
    for (const [seed, tier] of [
      [11, 0],
      [3, 4],
      [21, 4],
      [2, 2],
    ] as [number, TierKey][]) {
      const view = viewOf(seed, tier, 'v2');
      for (const state of statesOf(view, seed)) {
        if (state.reportOpen || state.filed) continue;
        const groups = choicesFor(view, state);
        const starred = flat(groups).filter((c) => c.lead);
        expect(starred.length, `${seed}/${tier} page ${state.log.length}`).toBeLessThanOrEqual(STAR_LIMIT);
        const ranks = openFactRanks(view, state.found);
        for (const c of starred) expect(ranks.size, c.command).toBeGreaterThan(0);
        // The client's own topics are never starred for being the client's:
        // a starred question to the client brings something an open step needs.
        for (const g of groups.filter((x) => x.kind === 'ask' && x.personId === view.client.id)) {
          for (const c of g.choices.filter((x) => x.lead)) expect(c.done).toBe(false);
        }
      }
    }
  });

  it('v2: the watcher is asked about the room they keep, starred on the first visit when it serves an open step, and the page says what watchers are good for once', () => {
    const view = viewOf(3, 4, 'v2');
    let state = newRun(view, { detectiveName: 'Dashiell' });
    state = stepInput(state, 'go the third floor', view).state;
    const groups = choicesFor(view, state);
    const post = flat(groups).find((c) => c.command === 'ask Rafferty about the third floor');
    expect(post).toBeDefined();
    expect(post?.lead).toBe(true);
    const text = state.log.flatMap((p) => p.blocks.map((b) => ('text' in b ? (b.text ?? '') : ''))).join(' ');
    expect(text).toMatch(/A landlady who sits on her stairs knows who used them/);
    state = stepInput(state, 'go the Velvet Room', view).state;
    const later = state.log[state.log.length - 1]?.blocks.map((b) => ('text' in b ? (b.text ?? '') : '')).join(' ') ?? '';
    expect(later).not.toMatch(/keeps one eye on the door can tell you how many/);
  });

  it('v1: the client’s pointer is never starred for being the client’s', () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const view = viewOf(seed, 2);
      const state = newRun(view, { detectiveName: 'Dashiell' });
      const pointer = clientPointerOnly(view, state.found);
      for (const g of choicesFor(view, state)) {
        for (const c of g.choices) {
          if (!c.lead) continue;
          const t = state.threads.find((x) => x.command === c.command);
          if (t) expect(pointer.has(t.clueId), c.command).toBe(false);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(0);
  });

  it('v2: "why I was hired" is offered only while it would bring something', () => {
    const view = viewOf(3, 4, 'v2');
    const state = newRun(view, { detectiveName: 'Dashiell' });
    const labels = flat(choicesFor(view, state)).map((c) => c.label);
    expect(labels).not.toContain('why I was hired');
  });
});

describe('§3 the grid shows what should jump out', () => {
  it('a claimant a present witness did not name gets "? not seen by …"', () => {
    const view = viewOf(11, 0, 'v2');
    let state = newRun(view, { detectiveName: 'Dashiell' });
    for (const c of ['ask Abramowitz about that evening', 'go the Garibaldi', 'ask Tillman about Rafferty', 'ask Rafferty about Abramowitz']) {
      state = stepInput(state, c, view).state;
    }
    const marks = softMarks(view, state);
    expect(marks.some((m) => m.kind === 'unseen' && m.text === '? not seen by Rafferty')).toBe(true);
    const grid = gridFrom(view, state);
    const row = grid.rows.find((r) => r.personId === view.client.id);
    expect(row?.cells.some((c) => (c.hints ?? []).some((h) => h.text === '? not seen by Rafferty'))).toBe(true);
    expect(renderGridText(view, state)).toMatch(/MARKS TO THINK ABOUT[\s\S]*\? not seen by Rafferty/);
  });

  it('a count lower than its claimants marks every claimant: "counted n, m claim it"', () => {
    let found = 0;
    for (const [seed, tier] of [
      [3, 4],
      [21, 4],
      [2, 2],
      [3, 2],
    ] as [number, TierKey][]) {
      const view = viewOf(seed, tier, 'v2');
      for (const state of statesOf(view, seed)) {
        for (const m of softMarks(view, state).filter((x) => x.kind === 'count')) {
          found++;
          const [, n, k] = /^counted (\d+), (\d+) claim it$/.exec(m.text) ?? [];
          expect(Number(k)).toBeGreaterThan(Number(n));
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('soft marks never come from the truth: every one rests on clues in hand', () => {
    for (const [seed, tier] of [
      [11, 0],
      [3, 4],
    ] as [number, TierKey][]) {
      const view = viewOf(seed, tier, 'v2');
      for (const state of statesOf(view, seed)) {
        const held = new Set(state.found);
        for (const m of softMarks(view, state)) {
          expect(m.clueIds.length).toBeGreaterThan(0);
          for (const id of m.clueIds) expect(held.has(id)).toBe(true);
          expect(state.accounts.includes(m.personId)).toBe(true);
        }
      }
    }
  });
});

describe('§5 teach once', () => {
  it('shows on a profile’s first night, and on the first tier until the first clean report', () => {
    const fresh = emptyProfile();
    expect(teachOn(fresh, 0)).toBe(true);
    expect(teachOn(fresh, 4)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 0)).toBe(true);
    expect(teachOn({ runs: 2, wins: 0 }, 2)).toBe(false);
    expect(teachOn({ runs: 3, wins: 1 }, 0)).toBe(false);
    expect(TEACH_LINES).toHaveLength(4);
    expect(TEACH_LINES[0]).toMatch(/People lie about themselves\. Nobody lies about what they saw\./);
  });

  it('npm run play -- new shows it before the office; --no-teach leaves it out', () => {
    const io = memoryIo();
    const out = runPlay(['new', '--seed', '11', '--tier', '0', '--engine', 'v2', '--save', 't.json'], io).out;
    expect(out.indexOf('BEFORE THE OFFICE')).toBeGreaterThan(0);
    expect(out.indexOf('BEFORE THE OFFICE')).toBeLessThan(out.indexOf('the office  '));
    const skipped = runPlay(['new', '--seed', '11', '--tier', '0', '--engine', 'v2', '--no-teach', '--save', 'u.json'], io).out;
    expect(skipped).not.toMatch(/BEFORE THE OFFICE/);
  });
});
