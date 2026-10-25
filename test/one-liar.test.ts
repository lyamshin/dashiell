/**
 * docs/69: nights with one liar. From Poached up about one night in three (and about half the
 * Hard-boiled face nights) deals no innocent liar: the culprit lies and nobody else does. The night is
 * a night as the generator deals it with two, its second lie dropped; every gate holds on it; the path
 * checks every rival's evening; "Nobody else" counts the full point only on what's held, half on a
 * hunch, and nothing on a night with two; and "first liar, nobody else" stays under 10% perfect.
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
import { NOBODY, boardFields, breakOptionsShown, curtainOfBoard, heldBreakers, nobodyElseProved, otherLie, scoreBoard, truthReport } from '../src/game/board/report.js';
import { parCalls } from '../src/game/board/model.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

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

describe('docs/69 §1.5: "Nobody else" needs proof', () => {
  it('full on what the oracle holds; half before everyone is checked; nothing on a night with two', () => {
    for (const tier of HIGH) {
      const d = firstOneLiar(tier);
      const o = playBoardOracle(d);
      expect(o.ok, `${tier}`).toBe(true);
      const truth = truthReport(d, o.run);
      expect(truth.other).toBe(NOBODY);
      expect(nobodyElseProved(d, o.run)).toBe(true);
      const v = scoreBoard(d, structuredClone(o.run), truth);
      expect(v.fields.find((f) => f.key === 'other')).toMatchObject({ given: 'Nobody else', correct: true });
      expect(v.fields.find((f) => f.key === 'other')?.half).toBeUndefined();
      expect(v.outcome).toBe('solved');
      expect(v.star).not.toBeNull();
    }
    // Half: "Nobody else" on a night with one liar, before everybody else was checked.
    let halves = 0;
    for (const tier of HIGH) {
      for (const { seed, d } of nightsOf(tier, 12)) {
        if (!oneLiar(d.kase)) continue;
        const f = playFirstLiar(d, seed);
        if (nobodyElseProved(d, f.run)) continue;
        halves++;
        const v = scoreBoard(d, f.run, f.report);
        const other = v.fields.find((x) => x.key === 'other');
        expect(other).toMatchObject({ given: 'Nobody else', correct: true, half: true });
        expect(v.plain).toContain('Right, but you hadn’t checked everyone: half credit on whether anyone else lied.');
        expect(v.outcome).not.toBe('solved');
        expect(v.star).toBeNull();
      }
    }
    expect(halves).toBeGreaterThan(5);
    // Zero: "Nobody else" where somebody else did lie.
    const two = dealBoard(17, 2, 'murder');
    expect(otherLie(two)).not.toBeNull();
    const run = playBoardOracle(two).run;
    const v = scoreBoard(two, structuredClone(run), { ...truthReport(two, run), other: NOBODY, cleared: null });
    expect(v.fields.find((f) => f.key === 'other')?.correct).toBe(false);
    expect(v.points).toBe(v.asked - 1);
  });

  it('the curtain says nobody else lied, with what was filed', () => {
    const d = firstOneLiar(2);
    const o = playBoardOracle(d);
    const truth = truthReport(d, o.run);
    const curtain = curtainOfBoard(d, o.run, truth);
    expect(curtain).toContain('DID ANYONE ELSE LIE?\nNobody else lied.\n  You picked: nobody else.  ✓');
    expect(curtain).not.toContain('WHO ELSE LIED');
    // THE LIES has the culprit's lie only.
    expect(curtain.split('THE LIES\n')[1]?.split('\n\n')[0]?.split('\n').length).toBe(1);
    const someone = d.kase.people.find((p) => p.role === 'suspect' && p.id !== d.kase.crime.culprit)?.id as string;
    expect(curtainOfBoard(d, o.run, { ...truth, other: someone })).toMatch(/You picked: [A-Z][^\n]*\.  ✗/);
    // Before everybody was checked: half, as the verdict has it.
    for (let seed = 1; seed <= 30; seed++) {
      const x = dealBoard(seed, 3, 'murder');
      if (!oneLiar(x.kase)) continue;
      const f = playFirstLiar(x, seed);
      if (nobodyElseProved(x, f.run)) continue;
      expect(curtainOfBoard(x, f.run, f.report)).toContain('  You picked: nobody else, but you hadn’t checked everyone.  ½');
      return;
    }
    throw new Error('no unproved night found');
  });

  it('the CLI closes on "Nobody else", with the proof and without', () => {
    // A one-liar murder the shortcut reader closes before everybody is checked.
    let d: BoardDeal | null = null;
    let short: ReturnType<typeof playFirstLiar> | null = null;
    for (let seed = 1; seed <= 40 && !short; seed++) {
      const x = dealBoard(seed, 4, 'murder');
      if (!oneLiar(x.kase)) continue;
      const f = playFirstLiar(x, seed);
      if (f.report.who === x.kase.crime.culprit && !nobodyElseProved(x, f.run)) {
        d = x;
        short = f;
      }
    }
    if (!d || !short) throw new Error('no night found');
    const deal = d;
    const c = deal.kase;
    const close = (commands: string[]) => {
      const files = new Map<string, string>();
      const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
      files.set('s', JSON.stringify({ game: 'dashiell-play', version: 1, engine: 'board', seed: c.seed, tier: c.tier, type: c.type, detective: 'Dashiell', events: commands.map((x) => ({ do: x })), person: null, picker: null, claim: null }));
      const run = playBoardOracle(deal).run;
      const fields = boardFields(deal, run);
      const n = (k: string, v: string) => (fields.find((f) => f.key === k)?.options.findIndex((o) => o.value === v) ?? -1) + 1;
      return (proof: number) => {
        const out = runPlay(['close', `who=${c.people.find((p) => p.id === c.crime.culprit)?.short}; proof=${proof}; other=nobody; when=${c.crime.hour}; how=${n('how', c.means.name)}; why=${n('why', c.crime.culprit)}`, '--save', 's'], io).out;
        return { out, curtain: runPlay(['curtain', '--save', 's'], io).out };
      };
    };
    const o = playBoardOracle(deal);
    const proofOf = (run: typeof o.run) => breakOptionsShown(deal, run, c.crime.culprit).findIndex((x) => heldBreakers(deal, run).some((l) => l.id === x.value)) + 1;
    const full = close(o.commands)(proofOf(o.run));
    expect(full.out).toMatch(/5 out of 5/);
    expect(full.out).toMatch(/Did anyone else lie\? Nobody else +✓/);
    expect(full.curtain).toContain('DID ANYONE ELSE LIE?\nNobody else lied.\n  You picked: nobody else.  ✓');
    const half = close(short.commands)(proofOf(short.run));
    expect(half.out).toMatch(/4½ out of 5/);
    expect(half.out.replace(/\s+/g, ' ')).toMatch(/Did anyone else lie\? Nobody else +½ — right, but you couldn’t have known/);
    expect(half.out.replace(/\s+/g, ' ')).toContain('Right, but you hadn’t checked everyone: half credit on whether anyone else lied.');
    expect(half.curtain).toContain('  You picked: nobody else, but you hadn’t checked everyone.  ½');
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
    expect(all).toContain('At ten I went round to Sokol’s for coffee, and Brennan was there.');
    expect(all).toContain('Brennan was in the corner.');
    expect(all).not.toMatch(/\bthe (?:man|woman) Rosenbaum had named\b/);
    // The turn reads back what's held, and what's still open; nothing about how many lied.
    expect(all).toContain('Nobody had told me yet where Rosenbaum was at ten.');
    expect(all).not.toMatch(/\b(?:other|second|another) liar\b|\bboth (?:of them )?lied\b|\btwo (?:people|of them) lied\b/i);
    const curtain = curtainOfBoard(d, o.run, truthReport(d, o.run));
    expect(curtain).not.toMatch(/WHO ELSE LIED|What cleared (?:him|her)/);
    expect(curtain).not.toMatch(/Confront Rosenbaum/);
  });
});

describe('docs/69 §3: "first liar, nobody else" stays under 10% perfect', () => {
  it('from Poached up', () => {
    for (const tier of HIGH) {
      const ns = nightsOf(tier, 16);
      const perfect = ns.filter(({ seed, d }) => playFirstLiar(d, seed).ok).length;
      expect(perfect / ns.length, `tier ${tier}`).toBeLessThan(0.1);
    }
  });
});
