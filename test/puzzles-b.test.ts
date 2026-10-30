/**
 * docs/82: harder puzzles, phase 2a, B: two broken stories and one killer, behind a flag (`puzzles:
 * ['B']`, `?puzzles=B`, `play new --puzzles B`), off by default. From Soft-boiled up the innocent liar
 * was alone and unwatched at the hour they lie about, never owns up with a name, and is told from the
 * culprit only by the hour (Soft-boiled), the means (Medium), or either (Hard-boiled's face nights).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  checkInvariants,
  invariantFailures,
  oneLiar,
  parsePuzzles,
  questionsOf,
  refusalShortcut,
  solve,
  techniquesUpTo,
  typesFor,
  type BoardCase,
  type TierIndex,
} from '../src/gen/board/index.js';
import { innocentLie, rate } from '../src/gen/board/path.js';
import { closure } from '../src/gen/board/pointers.js';
import { dealBoard, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { linesHeld } from '../src/game/board/knowledge.js';
import { teachLines, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

const B = { puzzles: ['B'] } as const;
const HIGH = [3, 4, 5] as TierIndex[];

/** The nights of some tiers with the flag on, seeds 1..n, every type, in a world. */
function nightsB(tiers: TierIndex[], n: number, world?: string): BoardDeal[] {
  return tiers.flatMap((tier) => typesFor(tier).flatMap((type) => Array.from({ length: n }, (_, i) => dealBoard(i + 1, tier, type, { ...(world ? { world } : {}), ...B }))));
}

/** The B nights among them: every Soft-boiled and Medium night, and Hard-boiled's face nights. */
const isB = (c: BoardCase) => !!c.puzzles?.includes('B');

describe('docs/82: the flag', () => {
  it('is off by default, and reads only the flags there are', () => {
    expect(parsePuzzles(undefined)).toEqual([]);
    expect(parsePuzzles('b')).toEqual(['B']);
    expect(parsePuzzles(['B', 'Q'])).toEqual(['B']);
    expect(parsePuzzles('Z')).toEqual([]);
  });

  it('with it off the night is main’s, word for word; Raw to Poached are the same with it on', () => {
    const h = createHash('sha256');
    for (let s = 1; s <= 3; s++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (const type of typesFor(tier)) {
          const off = dealBoard(s, tier, type);
          h.update(JSON.stringify(off.kase));
          expect(off.kase.puzzles).toBeUndefined();
          expect(JSON.stringify(dealBoard(s, tier, type, { puzzles: [] }).kase)).toBe(JSON.stringify(off.kase));
          if (tier <= 2) expect(JSON.stringify(dealBoard(s, tier, type, B).kase), `${s} ${tier} ${type}`).toBe(JSON.stringify(off.kase));
        }
      }
    }
    // Main's deal at c99e5d1, seeds 1–3 (docs/71's whole hash is dealt 600 4fb4585bb4150adf, neighbourhood 600 6fac2173840f859a).
    expect(h.digest('hex').slice(0, 16)).toBe(MAIN_HASH);
  });
});

describe('docs/82: two broken stories, one killer', () => {
  const all = [...nightsB(HIGH, 6), ...nightsB(HIGH, 3, 'neighbourhood')];
  const b = all.filter((d) => isB(d.kase));

  it('deals B on every Soft-boiled and Medium night, and on Hard-boiled’s face nights; the hour at Soft-boiled, the means at Medium', () => {
    for (const d of all) {
      const c = d.kase;
      if (c.tier === 5 && c.variant === 'pair') expect(isB(c), c.id).toBe(false);
      else expect(isB(c), c.id).toBe(true);
      if (c.tier === 3) expect(c.discriminator).toBe('hour');
      if (c.tier === 4) expect(c.discriminator).toBe('means');
    }
    expect(b.filter((d) => d.kase.tier === 5).length).toBeGreaterThan(0);
  });

  it('every invariant holds, the discriminator’s too, and the oracle solves at par; par is 5 to 9 questions (4 on a night with one liar) and the night rates its tier', () => {
    for (const d of b) {
      const c = d.kase;
      expect(invariantFailures(checkInvariants(c, d.analysis)), c.id).toEqual([]);
      expect(rate(c), c.id).toBe(c.tier);
      expect(d.analysis.par, c.id).toBeGreaterThanOrEqual(oneLiar(c) ? 4 : 5);
      expect(d.analysis.par, c.id).toBeLessThanOrEqual(9);
      expect(playBoardOracle(d).ok, c.id).toBe(true);
    }
  });

  it('the innocent liar was alone and unwatched at the hour they lie about, has nobody to name, and never owns up', () => {
    for (const d of b) {
      const c = d.kase;
      const il = innocentLie(c);
      if (!il) continue;
      const k = c.confrontations.find((x) => x.person === il.person && x.hour === il.hour);
      expect(['refuse', 'second-lie'], c.id).toContain(k?.response);
      expect(k?.names ?? []).toEqual([]);
      const truth = c.board.rows[il.person]?.[il.hour];
      const others = c.people.filter((p) => p.id !== il.person && (p.role === 'suspect' || p.role === 'company')).filter((p) => c.board.rows[p.id]?.[il.hour] === truth);
      expect(others.map((p) => p.id), c.id).toEqual([]);
      expect(c.lists.some((l) => l.place === truth && l.entries[il.hour] !== undefined), c.id).toBe(false);
      // With the hour, at the window's other hour; with the means, at the crime's.
      if (c.discriminator === 'hour') expect(il.hour).not.toBe(c.crime.hour);
      else expect(il.hour).toBe(c.crime.hour);
      expect(c.crime.window).toContain(il.hour);
    }
  });

  it('without the discriminator both liars are left; with it the solver names the culprit', () => {
    for (const d of b) {
      const c = d.kase;
      const il = innocentLie(c);
      if (!il) continue;
      const all2 = [...c.finds.map((f) => `search:${f.id}`), ...c.lists.map((l) => `list:${l.watcher}`), ...c.accounts.map((a) => `account:${a.person}`), ...c.confrontations.map((k) => `confront:${k.person}@${k.hour}`)];
      const T = new Set(techniquesUpTo(c.tier));
      T.delete(c.discriminator === 'hour' ? 'time-window' : 'access');
      const s0 = solve(c, all2, { techniques: T });
      expect(s0.cleared.has(c.crime.culprit), c.id).toBe(false);
      expect(s0.cleared.has(il.person), c.id).toBe(false);
      expect(solve(c, all2, { techniques: techniquesUpTo(c.tier) }).who, c.id).toBe(c.crime.culprit);
    }
  });

  it('no other tell: both refuse or tell a second story alike, both are found where they said they were, both stories break on the same kind of answer', () => {
    for (const d of b) {
      const c = d.kase;
      const il = innocentLie(c);
      if (!il) continue;
      const lie = (p: string) => c.lies.find((l) => l.person === p) as BoardCase['lies'][number];
      for (const p of [c.crime.culprit, il.person]) expect(c.people.find((x) => x.id === p)?.foundAt, `${c.id} ${p}`).toBe(lie(p).claim);
      // The answer that breaks each story, on the designed path: a list (or a neighbour's evening) for both, or a passer-by for both.
      const o = playBoardOracle(d);
      const kindOf = (p: string) => {
        const l = lie(p);
        const s = solve(c, o.run.asked, { techniques: techniquesUpTo(c.tier) }).status.get(`${p}@${l.hour}`);
        return s?.tech;
      };
      expect(kindOf(c.crime.culprit), c.id).toBe(kindOf(il.person));
    }
  });

  it('the refusal shortcut names nobody on a night with two liars', () => {
    for (const d of b) if (!oneLiar(d.kase)) expect(refusalShortcut(d.kase, d.analysis.par).fails, d.kase.id).toBe(true);
  });

  it('the crime is at the window’s earlier hour on about half the nights, and a sighting on the night says so', () => {
    const ns = nightsB([3, 4], 15);
    const early = ns.filter((d) => d.kase.crime.hour === d.kase.crime.window[0]);
    expect(early.length / ns.length).toBeGreaterThan(0.3);
    expect(early.length / ns.length).toBeLessThan(0.7);
    for (const d of early) {
      // The boy (a murder) or the neighbour who keeps the pet: it was done by the window's later hour.
      const done = [...d.kase.lists.flatMap((l) => l.remarks), ...d.kase.accounts.flatMap((a) => a.remarks)].filter((r) => r.done !== undefined);
      expect(done.length, d.kase.id).toBeGreaterThan(0);
      for (const r of done) expect(r.done, d.kase.id).toBe(d.kase.crime.hour + 1);
      // Findable, not lucky: the list or the evening it's in is one something on the night points to.
      const c = d.kase;
      const all = questionsOf(c).map((q) => q.id);
      const reach = new Set(closure(c, all));
      const where = [...c.lists.filter((l) => l.remarks.some((r) => r.done !== undefined)).map((l) => `list:${l.watcher}`), ...c.accounts.filter((a) => a.remarks.some((r) => r.done !== undefined)).map((a) => `account:${a.person}`)];
      expect(where.every((q) => reach.has(q)), c.id).toBe(true);
      expect(linesHeld(c, { asked: where, puts: [] }).some((l) => l.kind === 'remark' && /sent the boy round|looked in on/.test(l.text)), c.id).toBe(true);
    }
  });

  it('one night in six or so has one liar from Soft-boiled up', () => {
    for (const tier of [3, 4] as TierIndex[]) {
      const ns = nightsB([tier], 30);
      const share = ns.filter((d) => oneLiar(d.kase)).length / ns.length;
      expect(share, `tier ${tier}`).toBeGreaterThan(0.06);
      expect(share, `tier ${tier}`).toBeLessThan(0.3);
    }
  });
});

describe('docs/82: what the player is told', () => {
  it('the teach page says it, with the flag on and from Soft-boiled up only', () => {
    const sb = dealBoard(1, 3, 'murder', B).kase;
    expect(teachLines(undefined, sb)).toContain('When two people have lied, only one of them could have done it. Find out when it happened, and who could have got the weapon.');
    expect(teachLines(undefined, dealBoard(1, 3, 'lost-pet', B).kase).join(' ')).toContain('who could have known the way in');
    expect(teachLines(undefined, dealBoard(1, 3, 'murder').kase)).toEqual(BOARD_TEACH_LINES);
    expect(teachLines(undefined, dealBoard(1, 2, 'murder', B).kase)).toEqual(BOARD_TEACH_LINES);
  });

  it('`play new --puzzles B` keeps the flag with the night, and refuses one there isn’t', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
    const r = runPlay(['new', '--seed', '2', '--tier', '3', '--type', 'murder', '--puzzles', 'B', '--save', 's'], io);
    expect(r.code, r.out).toBe(0);
    expect(JSON.parse(files.get('s') as string).puzzles).toEqual(['B']);
    expect(r.out).toContain('When two people have lied, only one of them could have done it.');
    expect(runPlay(['look', '--save', 's'], io).code).toBe(0);
    expect(runPlay(['new', '--seed', '2', '--tier', '3', '--puzzles', 'Z', '--save', 't'], io).code).toBe(1);
  });
});

/** Main's deal, seeds 1–3, every tier and type, the dealt world (see above). */
const MAIN_HASH = 'c338c8d68e283ea7';
