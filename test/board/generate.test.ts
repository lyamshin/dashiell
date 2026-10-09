import { describe, expect, it } from 'vitest';
import {
  analyse,
  checkInvariants,
  generateBoard,
  invariantFailures,
  questionsOf,
  refusalShortcut,
  solve,
  techniquesUpTo,
  TIERS,
  typesFor,
  type TierIndex,
} from '../../src/gen/board/index.js';
import { givensSignature, PAR_FLOOR, pointed, type BoardCase, type CaseType } from '../../src/gen/board/index.js';
import { renderCase } from '../../src/gen/board/render.js';
import { moves } from '../../src/gen/board/generate.js';
import { PAR_TARGET } from '../../src/gen/board/tiers.js';

/** docs/42 §1–2 and §5, on a small sweep: every tier, a dozen seeds. */

const SEEDS = Array.from({ length: 12 }, (_, i) => i + 1);
const TIER_LIST: TierIndex[] = [0, 1, 2, 3, 4, 5];

describe.each(TIER_LIST)('tier %i', (tier) => {
  const cases = SEEDS.map((s) => generateBoard(s, tier));

  it('generates every seed', () => {
    expect(cases.every((g) => g !== null)).toBe(true);
  });

  it('holds every invariant, the path’s motivation included', () => {
    for (const g of cases) expect(invariantFailures(checkInvariants(g!.kase, g!.analysis))).toEqual([]);
  });

  it('is the size docs/41 rule 1 says', () => {
    const spec = TIERS[tier];
    for (const g of cases) {
      const c = g!.kase;
      expect(c.people.filter((p) => p.role === 'suspect')).toHaveLength(spec.suspects);
      expect(c.board.hours).toHaveLength(spec.hours);
      // A company witness's own rooms, where nobody else goes, aren't one of rule 1's places.
      expect(c.places.filter((p) => !p.scene && !p.offBoard)).toHaveLength(spec.places);
      const used = new Set(Object.values(c.board.rows).flatMap((r) => Object.values(r)));
      for (const p of c.places) expect(used.has(p.id)).toBe(true);
    }
  });

  it('rates at its tier (Tatham): its techniques finish, the tier below’s don’t', () => {
    for (const g of cases) {
      const c = g!.kase;
      const all = questionsOf(c).map((q) => q.id);
      expect(solve(c, all, { techniques: techniquesUpTo(tier) }).done).toBe(true);
      if (tier > 0) expect(solve(c, all, { techniques: techniquesUpTo(tier - 1) }).done).toBe(false);
    }
  });

  it('has par in range and a budget of par plus the tier’s slack', () => {
    for (const g of cases) {
      const a = g!.analysis;
      expect(a.par).toBeGreaterThanOrEqual(PAR_FLOOR[tier]);
      expect(a.par).toBeLessThanOrEqual(PAR_TARGET[1]);
      expect(a.budget).toBe(a.par + TIERS[tier].slack);
    }
  });

  it('is wide at the bottom and narrow at the top (rule 17)', () => {
    for (const g of cases) {
      for (const r of g!.analysis.rivals) {
        if (tier <= 1) expect(r.routes.length).toBeGreaterThanOrEqual(2);
        if (tier === 5) expect(r.routes.length).toBe(1);
      }
    }
  });

  it('every clue on the path joins another, and no single question settles who (rule 15)', () => {
    for (const g of cases) expect(g!.analysis.interaction).toMatchObject({ ok: true, loners: [], settles: [] });
  });

  it('the path, replayed, solves it and names the culprit', () => {
    for (const g of cases) {
      const c = g!.kase;
      const s = solve(c, g!.analysis.path.map((p) => p.q), { techniques: techniquesUpTo(tier) });
      expect(s.done).toBe(true);
      expect(s.who).toBe(c.crime.culprit);
      expect(s.when).toBe(c.crime.hour);
    }
  });

  it('evenings are sensible: innocents move at most twice, and the scene’s first suggestion is the scene', () => {
    for (const g of cases) {
      const c = g!.kase;
      for (const p of c.people.filter((x) => x.role === 'suspect' && x.id !== c.crime.culprit)) {
        expect(moves(c.board.rows[p.id]!, c.board.hours)).toBeLessThanOrEqual(2);
      }
      expect(g!.analysis.suggested[0]?.q.startsWith('search:')).toBe(true);
      expect(g!.analysis.suggested.some((s) => s.q === `account:${c.client}`)).toBe(false);
    }
  });

  it('is deterministic by seed', () => {
    const again = generateBoard(1, tier);
    expect(JSON.stringify(again?.kase)).toBe(JSON.stringify(cases[0]?.kase));
  });

  it('renders every section the designer reads', () => {
    const g = cases[0]!;
    const text = renderCase(g.kase, g.analysis);
    for (const s of ['THE GIVENS', 'THE TRUE BOARD', 'THE MEANS', 'ACCOUNTS', "WATCHERS' LISTS", 'SCENE FINDS', 'THE LIES', 'THE DESIGNED PATH', 'RIVALS', 'TECHNIQUE RATING']) {
      expect(text).toContain(s);
    }
    expect(text).toContain('Invariants: all hold');
  });
});

describe('case types', () => {
  it('builds every type at the low tiers, and murder and lost pets from Soft-boiled', () => {
    expect(typesFor(0)).toEqual(['murder', 'lost-item', 'lost-pet']);
    expect(typesFor(4)).toEqual(['murder', 'lost-pet']);
    for (const t of TIER_LIST) {
      for (const type of typesFor(t)) {
        const g = generateBoard(7, t, { type });
        expect(g?.kase.type).toBe(type);
      }
    }
  });

  it('a small case says where the thing is now, and why', () => {
    const g = generateBoard(3, 2, { type: 'lost-item' })!;
    const s = solve(g.kase, g.analysis.path.map((p) => p.q), { techniques: techniquesUpTo(2) });
    expect(s.whereNow && s.why).toBe(true);
  });

  it('Hard-boiled builds both variants', () => {
    const variants = new Set(SEEDS.map((s) => generateBoard(s, 5)?.kase.variant));
    expect(variants).toEqual(new Set(['pair', 'face']));
  });

  it('analyse is stable on a generated case', () => {
    const g = generateBoard(5, 3)!;
    expect(analyse(g.kase).par).toBe(g.analysis.par);
  });
});

describe('the designer’s decisions of 2026-09-28', () => {
  const all = TIER_LIST.flatMap((t) => SEEDS.map((s) => generateBoard(s, t)!));

  it('refusing isn’t a tell: “name whoever refuses” never beats par', () => {
    for (const g of all) {
      const sc = refusalShortcut(g.kase, g.analysis.par);
      if (!sc.fails) expect(sc.gain as number).toBeLessThanOrEqual(0);
    }
  });

  it('innocent liars both refuse and admit, and an admission names someone to check it by', () => {
    const answers = new Set<string>();
    for (const g of all) {
      for (const k of g.kase.confrontations) {
        if (!g.kase.lies.some((l) => l.kind === 'secret' && l.person === k.person)) continue;
        answers.add(k.response);
        if (k.response === 'admit') {
          expect(k.facts).toEqual([]);
          expect(k.names?.length).toBe(1);
        }
      }
    }
    expect(answers).toEqual(new Set(['admit', 'refuse']));
  });

  it('Raw: two watchers, each clearing one rival', () => {
    for (const g of all.filter((x) => x.kase.tier === 0)) {
      const c = g.kase;
      expect(c.lists).toHaveLength(2);
      const cleared = c.lists.map((l) =>
        g.analysis.rivals.filter((r) => solve(c, [`list:${l.watcher}`], { techniques: techniquesUpTo(0), forceHours: [c.crime.hour] }).cleared.has(r.id)).map((r) => r.id),
      );
      expect(cleared.map((x) => x.length)).toEqual([1, 1]);
      expect(cleared[0]).not.toEqual(cleared[1]);
      expect(g.analysis.par).toBeGreaterThanOrEqual(4);
      expect(g.analysis.par).toBeLessThanOrEqual(5);
    }
  });

  it('Coddled: par 4 or more, and still Coddled', () => {
    for (const g of all.filter((x) => x.kase.tier === 1)) {
      expect(g.analysis.par).toBeGreaterThanOrEqual(4);
      expect(g.analysis.rating).toBe(1);
    }
  });

  it('varied evenings: theatres, restaurants and workplaces as well as homes and bars', () => {
    const kinds = new Set<string>(all.flatMap((g) => g.kase.places.filter((p) => !p.scene).map((p) => p.kind)));
    for (const k of ['home', 'bar', 'restaurant', 'theatre', 'work']) expect(kinds.has(k)).toBe(true);
    // Somebody works until the place shuts, and the reading says when it shuts, not "open 7–10".
    expect(all.some((g) => g.kase.places.some((p) => p.kind === 'work' && p.open[1] < (g.kase.board.hours.at(-1) as number)))).toBe(true);
    for (const g of all.slice(0, 12)) expect(renderCase(g.kase, g.analysis)).not.toMatch(/open \d+–\d+/);
  });

  it('the office gives the window in the board’s own hours', () => {
    for (const g of all) {
      expect(g.kase.givens.window).toEqual(g.kase.crime.window);
      for (const h of g.kase.crime.window) expect(g.kase.board.hours).toContain(h);
      expect(g.kase.givens.text.join(' ')).not.toMatch(/between \w+ and \w+/);
    }
  });
});

describe('4a.2: the designer’s reading of seed 4 (Poached) and seed 2 (Raw)', () => {
  // Thirty seeds of each type, at a one-hour tier (Poached builds all three) and a windowed one.
  const byType = new Map<string, BoardCase[]>();
  for (const [tier, types] of [
    [2, ['murder', 'lost-item', 'lost-pet']],
    [3, ['murder', 'lost-pet']],
  ] as [TierIndex, CaseType[]][]) {
    for (const type of types) {
      byType.set(
        `${type}@${tier}`,
        Array.from({ length: 30 }, (_, i) => generateBoard(i + 1, tier, { type })!.kase),
      );
    }
  }

  it('every case type has at least four setups on each of the three axes', () => {
    for (const [k, cases] of byType) {
      const axes = { means: new Set<string>(), clock: new Set<string>(), pointer: new Set<string>(), all: new Set<string>() };
      for (const c of cases) {
        axes.means.add(c.setup!.means);
        axes.clock.add(c.setup!.clock);
        axes.pointer.add(c.setup!.pointer);
        axes.all.add(`${c.setup!.means}/${c.setup!.clock}/${c.setup!.pointer}`);
      }
      expect(axes.means.size, `${k} means`).toBeGreaterThanOrEqual(4);
      expect(axes.clock.size, `${k} clocks`).toBeGreaterThanOrEqual(4);
      expect(axes.pointer.size, `${k} pointers`).toBeGreaterThanOrEqual(4);
      expect(axes.all.size, `${k} setups`).toBeGreaterThanOrEqual(20);
    }
  });

  it('no two seeds’ givens match word for word, names aside', () => {
    const seen = new Map<string, string>();
    for (const [k, cases] of byType) {
      for (const c of cases) {
        const sig = givensSignature(c);
        expect(seen.get(sig), `${k} seed ${c.seed}`).toBeUndefined();
        seen.set(sig, `${k} seed ${c.seed}`);
      }
    }
  });

  it('motives fit the crime: a small case’s culprit sells it, and the motive says why they need the money', () => {
    for (const [k, cases] of byType) {
      if (k.startsWith('murder')) continue;
      for (const c of cases) {
        const why = c.crime.why;
        expect(why).toMatch(/owes|rent|lost (his|her) job/);
        expect(why).toMatch(/fetches|pawn|worth|in kind/);
        expect(c.crime.whereNow?.place).toBe('bar');
      }
    }
  });

  it('the fence, the client telling the room, and a companion nobody can name are all on the lists', () => {
    let fence = 0;
    let stranger = 0;
    for (const cases of byType.values()) {
      for (const c of cases) {
        expect(checkInvariants(c).listsComplete).toEqual([]);
        for (const o of c.others ?? []) {
          const listed = c.lists.some((l) => Object.values(l.entries).some((es) => es.some((e) => 'other' in e && e.other === o.id)));
          expect(listed, `${c.id}: ${o.name}`).toBe(true);
          if (o.id === 'fence') fence++;
          if (!o.known) stranger++;
        }
      }
    }
    expect(fence).toBeGreaterThan(0);
    expect(stranger).toBeGreaterThan(0);
  });

  it('a stranger on a list means "nobody else" doesn’t hold at that hour', () => {
    const c = [...byType.values()].flat().find((k) => k.others?.some((o) => !o.known))!;
    const o = c.others!.find((x) => !x.known)!;
    const l = c.lists.find((x) => Object.values(x.entries).some((es) => es.some((e) => 'other' in e && e.other === o.id)))!;
    const h = Number(Object.keys(o.at).find((x) => l.entries[Number(x)] !== undefined));
    // Somebody not on that list at that hour can't be ruled out of the place by it: an account
    // that claims the place then doesn't collide. Take the stranger off, and it does.
    const T = techniquesUpTo(c.tier);
    const claimant = c.people.find((p) => p.role === 'suspect' && !(l.entries[h] ?? []).some((e) => 'person' in e && e.person === p.id))!;
    const fake = (withStranger: boolean) => {
      const k: BoardCase = structuredClone(c);
      k.accounts.find((a) => a.person === claimant.id)!.claims[h] = { place: l.place, company: [] };
      if (!withStranger) {
        const kl = k.lists.find((x) => x.watcher === l.watcher)!;
        kl.entries[h] = kl.entries[h]!.filter((e) => !('other' in e));
      }
      return solve(k, [`list:${l.watcher}`, `account:${claimant.id}`], { techniques: T }).status.get(`${claimant.id}@${h}`)?.s;
    };
    expect(fake(true)).toBeUndefined();
    expect(fake(false)).toBe('broken');
    expect(renderCase(c, analyse(c))).toContain('I didn’t know');
  });

  it('errands last an hour, lies claim plausible places, and accounts give the truth’s reasons', () => {
    for (const cases of byType.values()) {
      for (const c of cases) {
        const r = checkInvariants(c);
        expect(r.errandsShort).toEqual([]);
        expect(r.liesPlausible).toEqual([]);
        expect(r.reasonsMatch).toEqual([]);
      }
    }
  });

  it('nobody claims an hour at a home they don’t live in, alone', () => {
    for (const cases of byType.values()) {
      for (const c of cases) {
        for (const l of c.lies) {
          const pl = c.places.find((p) => p.id === l.claim)!;
          if (pl.kind !== 'home') continue;
          const who = c.people.find((p) => p.id === l.person)!;
          const comp = c.accounts.find((a) => a.person === l.person)!.claims[l.hour]!.company;
          expect(who.home === l.claim || comp.some((x) => c.people.find((p) => p.id === x)?.home === l.claim), `${c.id}: ${l.person} at ${l.claim}`).toBe(true);
        }
      }
    }
  });

  it('every step of the path and every suggestion is pointed to by something already held, and says so', () => {
    for (const cases of byType.values()) {
      for (const c of cases) {
        const a = analyse(c, { routes: false });
        expect(checkInvariants(c, a).pathMotivated).toEqual([]);
        a.path.forEach((s, i) => {
          const before = a.path.slice(0, i).map((x) => x.q);
          expect(pointed(c, s.q, before)).toBe(true);
          if (i > 0) expect(s.why).toMatch(/\((step \d+|the office)\)|^The office|^Start at the scene/);
          if (s.pointedBy !== 'givens') expect(before).toContain(s.pointedBy);
        });
        // A watcher is suggested only once something points at their place.
        a.suggested.forEach((s, i) => expect(pointed(c, s.q, a.suggested.slice(0, i).map((x) => x.q))).toBe(true));
        expect(a.suggested.map((s) => s.why).join(' ')).not.toMatch(/a watcher\b|the rest of the people/);
      }
    }
  });
});
