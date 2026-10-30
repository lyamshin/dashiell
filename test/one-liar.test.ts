/**
 * docs/69: nights with one liar. From Poached up about one night in three (and about half the
 * Hard-boiled face nights) deals no innocent liar: the culprit lies and nobody else does. The night is
 * a night as the generator deals it with two, its second lie dropped; every gate holds on it; the path
 * checks every rival's evening. (docs/78: the report's "Nobody else" is gone with "Did anyone else
 * lie?", and with it what held the "first liar" shortcut under 10% perfect; see §3 below.)
 */
import { describe, expect, it } from 'vitest';
import {
  analyse,
  checkInvariants,
  generateBoard,
  invariantFailures,
  ONE_LIAR_SHARE,
  oneLiar,
  oneLiarNight,
  refusalShortcut,
  reject,
  solve,
  techniquesUpTo,
  typesFor,
  type BoardCase,
  type CaseType,
  type TierIndex,
} from '../src/gen/board/index.js';
import { buildCase } from '../src/gen/board/generate.js';
import { innocentLie, rate, rivalsOf } from '../src/gen/board/path.js';
import { dealBoard, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle, playFirstLiar, refusalShortcutCalls } from '../src/game/board/oracle.js';
import { curtainOfBoard, truthReport } from '../src/game/board/report.js';
import { parCalls } from '../src/game/board/model.js';

const HIGH = [2, 3, 4, 5] as TierIndex[];

/** The nights of a tier, seeds 1..n, every type it builds. */
function nightsOf(tier: TierIndex, n: number): { seed: number; type: CaseType; d: BoardDeal }[] {
  const out: { seed: number; type: CaseType; d: BoardDeal }[] = [];
  for (const type of typesFor(tier)) for (let seed = 1; seed <= n; seed++) out.push({ seed, type, d: dealBoard(seed, tier, type) });
  return out;
}

/** The first one-liar night at a tier (and type, if given), seeds 1 up. */
function firstOneLiar(tier: TierIndex, type?: CaseType, from = 1): BoardDeal {
  for (let seed = from; seed < from + 60; seed++) {
    for (const t of type ? [type] : typesFor(tier)) {
      const d = dealBoard(seed, tier, t);
      if (oneLiar(d.kase)) return d;
    }
  }
  throw new Error(`no one-liar night at ${tier}`);
}

describe('docs/69 §1.1: the share', () => {
  it('none at Raw or Coddled; about one in three from Poached to Medium; at Hard-boiled about half the face nights and no pair night', () => {
    expect(ONE_LIAR_SHARE[0]).toBe(0);
    expect(ONE_LIAR_SHARE[1]).toBe(0);
    for (const tier of [0, 1] as TierIndex[]) for (const { d } of nightsOf(tier, 12)) expect(oneLiar(d.kase)).toBe(false);
    for (const tier of [2, 3, 4] as TierIndex[]) {
      const ns = nightsOf(tier, 30);
      const share = ns.filter((x) => oneLiar(x.d.kase)).length / ns.length;
      expect(share, `tier ${tier}`).toBeGreaterThan(0.2);
      expect(share, `tier ${tier}`).toBeLessThan(0.5);
      // Every type gets them: no kind of night is always a night with two.
      for (const type of typesFor(tier)) expect(ns.some((x) => x.type === type && oneLiar(x.d.kase)), `tier ${tier} ${type}`).toBe(true);
    }
    const hb = nightsOf(5, 30);
    expect(hb.filter((x) => x.d.kase.variant === 'pair').every((x) => !oneLiar(x.d.kase))).toBe(true);
    const face = hb.filter((x) => x.d.kase.variant === 'face');
    const faceShare = face.filter((x) => oneLiar(x.d.kase)).length / face.length;
    expect(faceShare).toBeGreaterThan(0.25);
    expect(faceShare).toBeLessThan(0.75);
  });
});

describe('docs/69 §1.2: what a one-liar night is', () => {
  it('a night the old generator accepts, its second lie dropped, and nothing else changed', () => {
    let seen = 0;
    for (const tier of HIGH) {
      for (const type of typesFor(tier)) {
        for (let seed = 1; seed <= 10; seed++) {
          const g = generateBoard(seed, tier, { type });
          if (!g || !oneLiar(g.kase)) continue;
          seen++;
          const c2 = buildCase(seed, tier, type, g.attempts - 1) as BoardCase;
          // The two-liar night at that attempt passes every gate the generator had before.
          const a2 = analyse(c2);
          expect(rate(c2), `${tier} ${type} ${seed}`).toBe(tier);
          expect(reject(c2, a2), `${tier} ${type} ${seed}`).toBeNull();
          expect(innocentLie(c2)).toBeDefined();
          expect(oneLiarNight(c2)).toEqual(g.kase);
          // What changed: the innocent's story at the lied hour (and the move back from it), their lie,
          // their confrontation, where a refuser is found after midnight, and the lead.
          const lie = c2.lies.find((l) => l.kind === 'secret');
          const L = lie?.person as string;
          const acc = g.kase.accounts.find((a) => a.person === L);
          expect(acc?.claims[lie?.hour as number]?.place).toBe(g.kase.board.rows[L]?.[lie?.hour as number]);
          expect(g.kase.confrontations.some((k) => k.person === L)).toBe(false);
          expect(g.kase.lies.map((l) => l.person)).toEqual([g.kase.crime.culprit]);
          expect(g.kase.lead).toBeUndefined();
          const strip = (c: BoardCase) => JSON.stringify({ ...c, accounts: c.accounts.filter((a) => a.person !== L), confrontations: c.confrontations.filter((k) => k.person !== L), lies: [], lead: null, people: c.people.map((p) => ({ ...p, foundAt: '' })) });
          expect(strip(g.kase)).toBe(strip(c2));
        }
      }
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('every invariant holds, the rival is checked by evidence, and the gates hold', () => {
    for (const tier of HIGH) {
      for (const { seed, type, d } of nightsOf(tier, 12)) {
        if (!oneLiar(d.kase)) continue;
        const c = d.kase;
        const at = `${tier} ${type} ${seed}`;
        expect(invariantFailures(checkInvariants(c, d.analysis)), at).toEqual([]);
        expect(checkInvariants(c, d.analysis).rivalsChecked, at).toEqual([]);
        // From Soft-boiled up it still needs its tier's technique; at Poached it's solvable there.
        if (tier >= 3) expect(rate(c), at).toBe(tier);
        else expect(rate(c) as number, at).toBeLessThanOrEqual(tier);
        expect(d.analysis.par, at).toBeGreaterThanOrEqual(5);
        expect(d.analysis.par, at).toBeLessThanOrEqual(9);
        // Every rival placed away from the scene by the path, at the hours that mattered.
        const s = solve(c, d.analysis.path.map((x) => x.q), { techniques: techniquesUpTo(tier) });
        for (const r of rivalsOf(c)) expect(s.cleared.get(r)?.how, `${at} ${r}`).toBe('placed away');
        // The refusal shortcut can't know one lie is all of them, so it never beats par.
        const sc = refusalShortcut(c, d.analysis.par, d.analysis.par - 1);
        expect(sc.fails || sc.capped, at).toBe(true);
        const calls = refusalShortcutCalls(d);
        if (calls) expect(calls.calls, at).toBeGreaterThanOrEqual(parCalls(d));
      }
    }
  });

  it('the rivals’ check is an invariant: a path that only catches the culprit fails it', () => {
    const d = firstOneLiar(3, 'murder');
    const c = d.kase;
    const caught = solve(c, d.analysis.path.map((x) => x.q), { techniques: techniquesUpTo(c.tier) }).status.get(`${c.crime.culprit}@${c.crime.hour}`);
    const short = d.analysis.path.filter((x) => (caught?.deps ?? []).includes(x.q) || x.q.startsWith('search:'));
    const r = checkInvariants(c, { path: short, suggested: d.analysis.suggested });
    expect(r.rivalsChecked.length).toBeGreaterThan(0);
    // And twoStories is a two-liar rule: nothing of it on a night with one.
    expect(checkInvariants(c, d.analysis).twoStories).toEqual([]);
  });
});

describe('docs/69 §5: the pages assume no second liar', () => {
  it('Poached 6: the company a true story names is met by the story, and the turn and the curtain say only what was found', () => {
    const d = dealBoard(6, 2, 'murder');
    expect(oneLiar(d.kase)).toBe(true);
    const o = playBoardOracle(d);
    const pages = o.run.log.map((p) => p.blocks.map((b) => b.text).join('\n'));
    const all = pages.join('\n');
    // Rosenbaum, who would have lied, tells it straight, and names Brennan; Brennan is in the room, no gloss.
    expect(all).toMatch(/(?:At ten|Ten sharp,) I went round to Sokol’s for coffee, and Brennan was there\./);
    expect(all).toContain('Brennan was in the corner.');
    expect(all).not.toMatch(/\bthe (?:man|woman) Rosenbaum had named\b/);
    // The turn reads back what's held; nothing about how many lied. (docs/72: and nothing open from Poached up:
    // where Rosenbaum was at ten is the grid's blank, the player's question.)
    expect(all).not.toMatch(/(?:Nobody had told me yet where|I still didn’t know where) Rosenbaum was at ten\./);
    expect(all).not.toMatch(/\b(?:other|second|another) liar\b|\bboth (?:of them )?lied\b|\btwo (?:people|of them) lied\b/i);
    const curtain = curtainOfBoard(d, o.run, truthReport(d, o.run));
    expect(curtain).not.toMatch(/WHO ELSE LIED|What cleared (?:him|her)/);
    expect(curtain).not.toMatch(/Confront Rosenbaum/);
  });
});

describe('docs/69 §3: the "first liar" shortcut', () => {
  // docs/78 §4: "Nobody else" was what held it under 10% perfect from Poached up. With the report's
  // question gone, nothing does on main; the second liar made a red herring inside the deduction is
  // the work that should. docs/82: with puzzles B (behind the flag), from Soft-boiled up, what B
  // achieves, as a gate: on a night with two liars the first one caught is a coin flip, and the
  // one-liar nights (one in six) it gets every time are what's left over (D's false clash is next).
  it('with puzzles B, from Soft-boiled up, files a perfect report on no more than three in five of nights, and three in five of nights with two liars', () => {
    let n = 0;
    let two = 0;
    let perfect = 0;
    let perfectTwo = 0;
    for (const tier of [3, 4, 5] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let seed = 1; seed <= 8; seed++) {
          const d = dealBoard(seed, tier, type, { puzzles: ['B'] });
          if (!d.kase.puzzles) continue;
          const ok = playFirstLiar(d, seed).ok;
          n++;
          if (ok) perfect++;
          if (!oneLiar(d.kase)) {
            two++;
            if (ok) perfectTwo++;
          }
        }
      }
    }
    expect(perfect / n).toBeLessThanOrEqual(0.6);
    expect(perfectTwo / two).toBeLessThanOrEqual(0.6);
  });
});
