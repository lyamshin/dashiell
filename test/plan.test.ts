/**
 * docs/49: the microplanner. Its four operations (aggregation, connectives,
 * rhythm, reference), the skeleton it hands realization, and the measures it
 * answers to, held to on the oracle's nights in both worlds.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { PLAN, newBudget, planSection, realize, type Item, type PlanCtx } from '../src/game/board/plan/index.js';
import { factSentences, joinsIn, listSmell, pronounAmbiguity, restatedPointer } from '../src/game/board/plan/measure.js';
import { markPronoun } from '../src/game/board/plan/refer.js';
import { bandOf } from '../src/game/board/plan/sentences.js';
import type { Beat } from '../src/game/board/sheets.js';
import type { Page } from '../src/game/board/types.js';

const worlds = [undefined, 'neighbourhood'] as const;
const nights: { tier: TierIndex; type: CaseType; world?: 'neighbourhood' }[] = [];
for (const world of worlds) for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier) as CaseType[]) nights.push({ tier, type, ...(world ? { world } : {}) });

function oracle(s: number, tier: TierIndex, type: CaseType, world?: 'neighbourhood'): BoardRun {
  return playBoardOracle(dealBoard(s, tier, type, world ? { world } : {})).run;
}

function withPlan<T>(on: boolean, f: () => T): T {
  const was = PLAN.ops;
  PLAN.ops = on;
  try {
    return f();
  } finally {
    PLAN.ops = was;
  }
}

describe('docs/49: the skeleton', () => {
  it.each(nights)('realizes every page, unit by unit, and says what each unit is: tier $tier, $type, $world', ({ tier, type, world }) => {
    for (let s = 1; s <= 2; s++) {
      for (const p of oracle(s, tier, type, world).log) {
        const units = p.board?.units ?? [];
        expect(units.length, `seed ${s} p${p.n + 1}`).toBeGreaterThan(0);
        // Concatenated a paragraph at a time, the units are the page's prose, word for word.
        const prose = p.blocks.filter((b) => b.kind === 'prose');
        expect(realize(units).map((b) => b.text)).toEqual(prose.map((b) => b.text));
        units.forEach((u, i) => {
          if (u.kind === 'fact') {
            expect(u.locked).toBe(true);
            expect(['new', 'confirms', 'collides', 'narrows']).toContain(u.relation);
          } else {
            expect(u.slot).toBeTruthy();
            if (u.before !== undefined) expect(units[u.before]?.kind).toBe('fact');
            if (u.after !== undefined) expect(units[u.after]?.kind).toBe('fact');
            if (u.before !== undefined) expect(u.before).toBeLessThan(i);
            if (u.after !== undefined) expect(u.after).toBeGreaterThan(i);
          }
        });
      }
    }
  });

  it('a gap never carries the page’s new facts: every line an answer tells is in a fact unit', () => {
    for (const { tier, type, world } of nights.filter((x) => x.tier === 4)) {
      for (const p of oracle(1, tier, type, world).log) {
        if (p.board?.job !== 'account' && p.board?.job !== 'list') continue;
        const carried = new Set((p.board.units ?? []).flatMap((u) => (u.kind === 'fact' ? u.carries : [])));
        for (const id of p.board.told) if (/^(claim|list):/.test(id)) expect(carried.has(id), `${type} ${world} p${p.n + 1}: ${id}`).toBe(true);
      }
    }
  });
});

describe('docs/49: the same facts, planner on or off', () => {
  it.each(nights.filter((x) => x.tier % 2 === 0))('every page tells the same lines and ties to the same held lines: tier $tier, $type, $world', ({ tier, type, world }) => {
    const d = dealBoard(2, tier, type, world ? { world } : {});
    const off = withPlan(false, () => [playBoardOracle(d).run, playWanderer(d, 2).run]);
    const on = withPlan(true, () => [playBoardOracle(d).run, playWanderer(d, 2).run]);
    off.forEach((r, k) => {
      const o = on[k] as BoardRun;
      expect(o.log.length).toBe(r.log.length);
      r.log.forEach((p, i) => {
        const q = o.log[i] as Page;
        expect([...(q.board?.told ?? [])].sort(), `p${i + 1}`).toEqual([...(p.board?.told ?? [])].sort());
        expect([...(q.board?.thought?.refs ?? [])].sort(), `p${i + 1}`).toEqual([...(p.board?.thought?.refs ?? [])].sort());
        expect(q.board?.job).toBe(p.board?.job);
      });
    });
  });
});

describe('docs/49 §4: the measures', () => {
  it.each(nights)('no pronoun could be two people, and a page has at most one "but" and one "So" among its facts: tier $tier, $type, $world', ({ tier, type, world }) => {
    for (let s = 1; s <= 3; s++) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
      const run = playBoardOracle(d).run;
      run.log.forEach((p, i) => {
        expect(pronounAmbiguity(d.kase, p.blocks), `seed ${s} p${i + 1}`).toEqual([]);
        expect(restatedPointer(d.kase, run.log[i - 1], p), `seed ${s} p${i + 1}`).toBeNull();
        const js = joinsIn(p.board?.units ?? []);
        expect(js.filter((j) => j === 'but').length, `seed ${s} p${i + 1}`).toBeLessThanOrEqual(1);
        expect(js.filter((j) => j === 'so').length, `seed ${s} p${i + 1}`).toBeLessThanOrEqual(1);
      });
    }
  });

  it('fewer pages read like a list, and the facts take fewer sentences, than with the planner off', () => {
    const count = (on: boolean) =>
      withPlan(on, () => {
        let smell = 0;
        let sentences = 0;
        let units = 0;
        for (const { tier, type, world } of nights) {
          for (const p of oracle(3, tier, type, world).log) {
            const sm = listSmell(p.blocks);
            if (sm.band.length || sm.opening.length) smell++;
            const f = factSentences(p.board?.units ?? []);
            sentences += f.sentences;
            units += f.units;
          }
        }
        return { smell, ratio: sentences / units };
      });
    const off = count(false);
    const on = count(true);
    expect(on.smell).toBeLessThan(off.smell * 0.5);
    expect(on.ratio).toBeLessThan(off.ratio);
  });
});

/* ------------------------------------------------------------------ *
 * The operations, one at a time, on pages made by hand.
 * ------------------------------------------------------------------ */

const d = dealBoard(1, 4, 'lost-pet');
const c = d.kase;
const id = (short: string) => c.people.find((p) => p.short === short)?.id as string;

function ctxOf(): PlanCtx {
  let k = 0;
  return { c, budget: newBudget(), pick: (_key, ls) => ls[k++ % ls.length] as string, level: 'link', int: () => 0 };
}

function plan(items: Partial<Record<Beat, Item[]>>, paras: Beat[][]): string[] {
  return withPlan(true, () => planSection(items, paras, ctxOf(), 0).blocks.map((b) => (b.kind === 'prose' ? b.text : '')));
}

const gap = (beat: Beat, text: string, about: string[] = [], runOn = false): Item => ({ kind: 'gap', beat, voice: 'narrator', text, slot: 'staging', about, runOn });
const fact = (beat: Beat, text: string, about: string[] = [], extra: Partial<Item> = {}): Item => ({ kind: 'fact', beat, voice: 'thought', text, relation: 'new', carries: ['x'], about, ...extra });

describe('docs/49 §2: reference', () => {
  it('somebody the page has just been about is a pronoun; the first mention is the name', () => {
    const [a, b] = plan({ staging: [gap('staging', 'I sat down near Ashby.', [id('Ashby')])], reaction: [gap('reaction', 'Ashby took a moment to put the evening in order.', [id('Ashby')])] }, [['staging'], ['reaction']]);
    expect(a).toBe('I sat down near Ashby.');
    expect(b).toBe('He took a moment to put the evening in order.');
  });

  it('never a pronoun that two people of one sex could be: the name instead', () => {
    const coffin = id('Coffin');
    const ashby = id('Ashby');
    const out = plan(
      { why: [gap('why', 'Coffin’s list had Ashby here at eleven.', [ashby])], staging: [gap('staging', `I sat one seat over, and he${markPronoun(c, ashby)} looked up.`, [ashby])] },
      [['why'], ['staging']],
    );
    expect(out[1]).toBe('I sat one seat over, and Ashby looked up.');
    void coffin;
  });

  it('a name a third time, where a pronoun won’t do, is the role', () => {
    const coffin = id('Coffin');
    const ashby = id('Ashby');
    const out = plan(
      {
        why: [gap('why', 'Coffin and Ashby were at the back.', [coffin])],
        staging: [gap('staging', 'Ashby looked at Coffin.', [ashby])],
        thought: [fact('thought', 'Ashby said the Thalia, and Coffin said nothing.', [ashby, coffin])],
      },
      [['why'], ['staging'], ['thought']],
    );
    expect(out[1]).toBe('Ashby looked at Coffin.');
    // Both of them a third time: the trade, and the job.
    expect(out[2]).toBe('The milliner said the Thalia, and the house manager said nothing.');
  });
});

describe('docs/49 §2: aggregation and connectives', () => {
  it('a watcher’s hour and its "nobody else" are one sentence', () => {
    const out = plan(
      { job: [fact('job', '“Ten, Feeney. Nobody else.”', [id('Feeney')], { exempt: true, agg: { key: 'list-hour', data: { when: 'Ten', names: 'Feeney', whole: true, nobody: 'Nobody else' } } })] },
      [['job']],
    );
    expect(out[0]).toBe('“Ten, Feeney, and nobody else.”');
  });

  it('a collision takes the page’s one "but"; the second goes without', () => {
    const corrigan = id('Corrigan');
    const ashby = id('Ashby');
    const col = (claim: string, breaker: string) =>
      fact('thought', `${claim}. ${breaker}. One of them was wrong.`, [corrigan], { relation: 'collides', agg: { key: 'collision', alone: true, data: { p: corrigan, claim, breaker, twos: ['One of them was wrong.'], two: 'One of them was wrong.' } } });
    const out = plan({ thought: [col('Corrigan said home at eleven', 'Ashby passed her on Stuyvesant Street at eleven'), { ...col('Corrigan said home at ten', 'Coffin had nobody here at ten'), runOn: true }] }, [['thought']]);
    expect(out[0]).toMatch(/^Corrigan said home at eleven, but Ashby passed her on Stuyvesant Street at eleven\./);
    expect(out[0]).toMatch(/Coffin had nobody here at ten\. One of them was wrong\.$/);
    void ashby;
  });
});

describe('docs/49 §2: rhythm', () => {
  it('three sentences in a row of one length are mended, and a joke ends short', () => {
    const out = plan(
      {
        arrival: [gap('arrival', 'The lobby carpet was red and gold, worn to the threads in a path. The uniform coat had the theater’s name on the collar, and the cap had been reshaped by a hundred hot nights. A painted mask grinned down at everybody who came in, with its nose gone.')],
        close: [{ ...gap('close', 'The loose stair rod rattled whenever anybody used the stair, like a remark nobody had asked for.'), slot: 'close' }],
      },
      [['arrival'], ['close']],
    );
    const bands = out.join(' ').split(/(?<=\.)\s+/).map(bandOf);
    for (let i = 2; i < bands.length; i++) expect(bands[i] === bands[i - 1] && bands[i] === bands[i - 2]).toBe(false);
    expect(out[1]).toBe('The loose stair rod rattled whenever anybody used the stair. Like a remark nobody had asked for.');
  });
});
