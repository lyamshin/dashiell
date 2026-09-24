import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { CASE_TYPES, type Case, type CaseType } from '../src/gen/types.js';
import {
  CUSTOMERS_OF,
  HOME_HAS,
  OWNER_HAS,
  coherenceFlags,
  homeFits,
  standingsFor,
  tieFits,
  tradeFits,
} from '../src/gen/coherence.js';
import { ARCHETYPE_BY_ID, RELATIONSHIP_BY_ID, VICTIM_ARCHETYPES } from '../src/gen/data/cast.js';
import { TIE_WORDS, tieWordsFor } from '../src/gen/data/tie-words.js';
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

  it('finds nothing out of place in the mix as the title page deals it, or in the classic draw', () => {
    const problems: string[] = [];
    for (const tier of TIERS) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const classic of [false, true]) {
          const c = generateCase(seed, { tier, level: 2, ...(classic ? { classic } : {}) });
          for (const f of coherenceFlags(c)) problems.push(`T${tier} seed ${seed}${classic ? ' classic' : ''}: ${f.rule} ${f.detail}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('says a kept classic tie in the owner’s words, and moves no draw (Raw seed 1, a theatrical agent)', () => {
    const c = generateCase(1, { tier: 0, level: 2 });
    const victim = c.people.find((p) => p.kind === 'victim');
    expect(victim?.archetypeId).toBe('vic-agent');
    const customers = c.people.filter((p) => p.relationshipId === 'rel-customer');
    expect(customers.length).toBeGreaterThan(0);
    for (const p of customers) {
      expect(p.dossier?.tie.text).toMatch(/an act on .*’s books/);
      expect(`${p.dossier?.tie.backstory} ${p.dossier?.tie.backstoryFirst ?? ''}`).not.toMatch(/bought from|Everybody on the block/);
    }
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

  it('a customer of somebody who sells nothing, said in the card’s words', () => {
    const c = copy(lost);
    const victim = c.people.find((p) => p.kind === 'victim');
    if (victim) victim.archetypeId = 'vic-inspector';
    const s = c.people.find((p) => p.kind === 'suspect');
    if (s?.dossier) {
      s.relationshipId = 'rel-customer';
      s.dossier.tie.text = `a customer of ${victim?.surname}’s`;
      s.dossier.tie.backstory = `${s.surname} has bought from ${victim?.surname} for years and settled at the end of every month.`;
    }
    expect(coherenceFlags(c).map((f) => f.rule)).toContain('tie-words');
  });

  it('the husband of an heiress between marriages', () => {
    const c = copy(lost);
    const victim = c.people.find((p) => p.kind === 'victim');
    if (victim) victim.archetypeId = 'vic-heiress';
    const s = c.people.find((p) => p.kind === 'suspect');
    if (s) s.relationshipId = 'rel-wed';
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

  it('has words for every tie a classic draw can deal to an owner the card does not fit', () => {
    const missing: string[] = [];
    for (const v of VICTIM_ARCHETYPES) {
      for (const aid of v.allowedSuspects) {
        const a = ARCHETYPE_BY_ID[aid];
        for (const rel of a?.relationships ?? []) {
          if (!tradeFits(rel, v.id, aid) && !tieWordsFor(rel, v.id)) missing.push(`${rel} × ${v.id} (${aid})`);
          for (const home of Object.keys(HOME_HAS)) {
            if (!homeFits(rel, home) && !tieWordsFor(rel, '', home)) missing.push(`${rel} @ ${home}`);
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it('writes the owner’s words one for one with the card, so the dossier takes the same draws', () => {
    for (const [rel, byOwner] of Object.entries(TIE_WORDS)) {
      const card = RELATIONSHIP_BY_ID[rel];
      expect(card, rel).toBeDefined();
      if (!card) continue;
      for (const [owner, words] of Object.entries(byOwner)) {
        const where = `${rel} × ${owner}`;
        for (const [list, base] of [
          [words.backstory, card.backstory],
          [words.backstoryFirst, card.backstoryFirst],
        ] as const) {
          if (!list) continue;
          expect(list.length, where).toBe(base.length);
          list.forEach((t, i) => expect(t.includes('{third}'), `${where} #${i}`).toBe((base[i] as string).includes('{third}')));
        }
        if (words.since) expect(words.since.length, where).toBe(card.since.length);
        if (words.backstoryAlt) {
          expect(words.backstoryAlt.map((a) => a === null), where).toEqual((card.backstoryAlt ?? []).map((a) => a === null));
        }
      }
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
