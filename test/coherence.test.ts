import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { CASE_TYPES, type Case, type CaseType } from '../src/gen/types.js';
import {
  CUSTOMERS_OF,
  HOME_HAS,
  OWNER_HAS,
  coherenceFlags,
  standingsFor,
  tieFits,
} from '../src/gen/coherence.js';
import { CUSTOMER_WORDS, RELATIONSHIP_BY_ID, VICTIM_ARCHETYPES } from '../src/gen/data/cast.js';
import { PLACE_TEMPLATES } from '../src/gen/data/places.js';

/**
 * The world-coherence pass (stage 1, the solved world). The designer, reading
 * a lost-item case at Raw, seed 946572: "My name is Karl Hochstetter. I am a
 * customer of Daniel Feeney's. Feeney's gold pocket watch is gone from the
 * benches, where he keeps it." — "why would he keep a gold watch at the
 * benches; what did he buy from the victim — very odd."
 *
 * Where a thing is kept is the owner's own address; a tie follows the owner's
 * trade and address; the owner's standing fits the case. `coherenceFlags`
 * reads all of it off a finished case, and every tier deals zero.
 */

const TIERS = [0, 1, 2, 3, 4, 5] as const;
const SEEDS = 42;

describe('coherence: every tier, every case type', () => {
  it(`finds nothing out of place in ${SEEDS} seeds a tier, the case types in turn`, () => {
    const problems: string[] = [];
    const seen = new Set<CaseType>();
    for (const tier of TIERS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const type = CASE_TYPES[seed % CASE_TYPES.length] as CaseType;
        const c = generateCase(seed, { tier, level: 2, type });
        seen.add(c.act.type);
        for (const f of coherenceFlags(c)) problems.push(`T${tier} seed ${seed} ${type}: ${f.rule} ${f.detail}`);
      }
    }
    expect(problems).toEqual([]);
    expect([...seen].sort()).toEqual([...CASE_TYPES].sort());
  });

  it('finds nothing out of place in the mix as the title page deals it', () => {
    const problems: string[] = [];
    for (const tier of TIERS) {
      for (let seed = 100; seed < 106; seed++) {
        const c = generateCase(seed, { tier, level: 2 });
        for (const f of coherenceFlags(c)) problems.push(`T${tier} seed ${seed}: ${f.rule} ${f.detail}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('coherence: the Hochstetter night (Raw, seed 946572)', () => {
  const c = generateCase(946572, { tier: 0, level: 2 });

  it('keeps the lost thing at the owner’s own address, and says so', () => {
    expect(c.act.type).toBe('lost-item');
    const home = c.places.find((p) => p.isResidence);
    expect(c.act.place).toBe(home?.id);
    expect(c.briefingText.join(' ')).not.toMatch(/benches/);
    expect(coherenceFlags(c)).toEqual([]);
  });

  it('introduces the owner by a line that fits a lost watch', () => {
    const victim = c.people.find((p) => p.kind === 'victim');
    expect(standingsFor(victim?.archetypeId as string, 'lost-item')).not.toContain(
      'had lent money to four families on the block and forgiven none of it',
    );
  });
});

describe('coherence: the checker catches what it is for', () => {
  const lost = (() => {
    for (let seed = 1; seed < 40; seed++) {
      const c = generateCase(seed, { tier: 3, level: 2, type: 'lost-item' });
      if (c.act.type === 'lost-item') return c;
    }
    throw new Error('no lost item');
  })();
  const copy = (c: Case): Case => JSON.parse(JSON.stringify(c)) as Case;

  it('a watch kept on a public bench', () => {
    const c = copy(lost);
    const open = c.places.find((p) => p.kind === 'public') ?? c.places.find((p) => !p.isResidence);
    c.act.place = open?.id as string;
    expect(coherenceFlags(c).map((f) => f.rule)).toContain('keeping-place');
  });

  it('a customer of somebody who sells nothing', () => {
    const c = copy(lost);
    const victim = c.people.find((p) => p.kind === 'victim');
    if (victim) victim.archetypeId = 'vic-inspector';
    const s = c.people.find((p) => p.kind === 'suspect');
    if (s) s.relationshipId = 'rel-customer';
    expect(coherenceFlags(c).map((f) => f.rule)).toContain('tie-trade');
  });

  it('the neighbour over the backyard fence of a hotel suite', () => {
    const c = copy(lost);
    const home = c.places.find((p) => p.isResidence);
    if (home) home.id = 'res-suite';
    c.act.place = 'res-suite';
    const s = c.people.find((p) => p.kind === 'suspect');
    if (s) s.relationshipId = 'rel-fence';
    expect(coherenceFlags(c).map((f) => f.rule)).toContain('tie-home');
  });

  it('a cat’s owner introduced as the keeper of a file of what was never printed', () => {
    const c = copy(lost);
    const victim = c.people.find((p) => p.kind === 'victim');
    if (victim) victim.archetypeId = 'vic-columnist';
    c.victimBio.standing = `${victim?.surname} kept a file of what was not printed, and let it be known that it existed.`;
    expect(coherenceFlags(c).map((f) => f.rule)).toContain('standing');
  });
});

describe('coherence: the tables', () => {
  it('knows every victim and every residence the deck can deal', () => {
    for (const v of VICTIM_ARCHETYPES) {
      expect(OWNER_HAS[v.id], v.id).toBeDefined();
      expect(v.standingMundane, v.id).toHaveLength(3);
    }
    for (const t of PLACE_TEMPLATES.filter((p) => p.isResidence)) expect(HOME_HAS[t.id], t.id).toBeDefined();
  });

  it('gives every owner who sells a customer’s words, one for one with the card', () => {
    const card = RELATIONSHIP_BY_ID['rel-customer'];
    for (const v of VICTIM_ARCHETYPES) {
      const sells = (OWNER_HAS[v.id] ?? []).includes('sells');
      expect(CUSTOMER_WORDS[v.id] !== undefined, v.id).toBe(sells);
      const words = CUSTOMER_WORDS[v.id];
      if (!words || !card) continue;
      words.backstoryFirst.forEach((t, i) => {
        expect(t.includes('{third}'), `${v.id} #${i}`).toBe((card.backstory[i] as string).includes('{third}'));
      });
    }
    for (const [owner, who] of Object.entries(CUSTOMERS_OF)) {
      expect(OWNER_HAS[owner]).toContain('sells');
      expect(who.length).toBeGreaterThan(0);
    }
  });

  it('leaves every owner a tie beyond money, whatever the address', () => {
    for (const v of VICTIM_ARCHETYPES) {
      for (const home of Object.keys(HOME_HAS)) {
        expect(['rel-cousin', 'rel-childhood', 'rel-bowling'].every((r) => tieFits(r, v.id, home)), `${v.id} @${home}`).toBe(true);
      }
    }
  });
});
