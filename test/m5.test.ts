/**
 * Milestone 5, phase 1. `docs/09-m5-world.md`, "Phase 1 tests".
 *
 * The world before the puzzle: every person is somebody in particular, the
 * victim had a life and was found by somebody, the client walked in for a
 * reason, and every sentence the generator writes traces to a field.
 */

import { describe, expect, it } from 'vitest';
import {
  TICKS,
  generateCase,
  type Case,
  type Difficulty,
  type Id,
  type Unknown,
} from '../src/gen/index.js';
import { ARCHETYPE_BY_ID, RELATIONSHIP_BY_ID, VICTIM_ARCHETYPE_BY_ID } from '../src/gen/data/cast.js';
import { NAME_POOLS } from '../src/gen/data/names.js';
import { TROPES, TROPE_BY_ID, TROPE_IDS } from '../src/gen/tropes/index.js';
import { checkCase, formatViolations, renderedFacts } from '../src/gen/correspond.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';

const SEEDS = 200;
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

const corpus: Case[] = [];
for (let seed = 1; seed <= SEEDS; seed++) corpus.push(generateCase(seed));

const everyDifficulty: Case[] = [];
for (const difficulty of DIFFICULTIES) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    everyDifficulty.push(
      difficulty === 2 ? (corpus[seed - 1] as Case) : generateCase(seed, { difficulty }),
    );
  }
}

const scheduleOf = (c: Case, id: Id) => c.schedules.find((s) => s.personId === id);

/* ------------------------------------------------------------------ *
 * Part 1 — dossiers.
 * ------------------------------------------------------------------ */

describe('dossiers over seeds 1..200 at every difficulty', () => {
  it('gives every person in the case a complete one', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        const d = p.dossier;
        expect(d, `seed ${c.seed} ${p.id} has no dossier`).toBeDefined();
        if (!d) continue;
        expect(d.age).toBeGreaterThan(15);
        expect(d.gender === 'm' || d.gender === 'f').toBe(true);
        expect(d.profession.role.length).toBeGreaterThan(3);
        expect(d.profession.detail.length).toBeGreaterThan(10);
        expect(d.profession.detail).not.toContain('{');
        expect(d.want.length).toBeGreaterThan(2);
        expect(d.tie.text.length).toBeGreaterThan(3);
        expect(d.tie.backstory.length).toBeGreaterThan(10);
        expect(d.selfAccount.length).toBeGreaterThanOrEqual(2);
        expect(d.selfAccount.length).toBeLessThanOrEqual(3);
        expect(d.layers.length).toBeGreaterThanOrEqual(6);
        for (const layer of d.layers) {
          expect([0, 1, 2, 3]).toContain(layer.layer);
          expect(layer.text.length).toBeGreaterThan(3);
        }
        // Layer 0 is what shows on sight, and it always shows something.
        expect(d.layers.some((l) => l.layer === 0)).toBe(true);
      }
    }
  });

  it('keeps every age inside the band its card allows', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        const d = p.dossier;
        if (!d || p.archetypeId === undefined) continue;
        const card =
          p.kind === 'victim'
            ? VICTIM_ARCHETYPE_BY_ID[p.archetypeId]
            : ARCHETYPE_BY_ID[p.archetypeId];
        expect(card, `no card for ${p.archetypeId}`).toBeDefined();
        const [lo, hi] = card?.ageBand ?? [0, 200];
        expect(d.age, `seed ${c.seed} ${p.surname} is ${d.age}, band ${lo}..${hi}`)
          .toBeGreaterThanOrEqual(lo);
        expect(d.age).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('resolves gender, and it agrees with the pool the given name came out of', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        expect(p.gender, `${p.id} has no gender`).toBeDefined();
        expect(p.dossier?.gender).toBe(p.gender);
        const given = p.name.split(/\s+/)[0] as string;
        const pool = NAME_POOLS.find(
          (n) => n.given.male.includes(given) || n.given.female.includes(given),
        );
        expect(pool, `${given} is in no name pool`).toBeDefined();
        const inMale = pool?.given.male.includes(given) ?? false;
        expect(inMale ? 'm' : 'f', `${p.name} is drawn ${p.gender}`).toBe(p.gender);
      }
    }
  });

  it('draws every want from the card that owns it', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        if (!p.dossier || p.archetypeId === undefined) continue;
        const card =
          p.kind === 'victim'
            ? VICTIM_ARCHETYPE_BY_ID[p.archetypeId]
            : ARCHETYPE_BY_ID[p.archetypeId];
        expect(card?.wants).toContain(p.dossier.want);
      }
    }
  });

  it('ties every suspect to the victim with the relationship and a specific', () => {
    for (const c of everyDifficulty) {
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      for (const p of c.people) {
        if (p.kind !== 'suspect') continue;
        const tie = p.dossier?.tie;
        expect(tie?.relationshipId).toBe(p.relationshipId);
        const rel = RELATIONSHIP_BY_ID[p.relationshipId as Id];
        expect(tie?.text).toBe(rel?.text.split('{V}').join(victim.surname));
        // The specific: a backstory sentence, and it is not the bare card.
        expect(tie?.backstory.length ?? 0).toBeGreaterThan(rel?.text.length ?? 0);
        expect(tie?.backstory).toMatch(/[.!?]$/);
        expect(tie?.since?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('puts the secret in layer 3 and never in the self-account', () => {
    for (const c of everyDifficulty) {
      for (const p of c.people) {
        if (p.kind !== 'suspect' || !p.dossier) continue;
        const account = p.dossier.selfAccount.join(' ');
        const secretType = p.isKiller ? p.coverSecret?.type : p.secret?.type;
        if (secretType) expect(account).not.toContain(secretType);
        for (const layer of p.dossier.layers) {
          if (layer.kind === 'secret-hint') expect(layer.layer).toBe(3);
        }
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 1.2 — mentions.
 * ------------------------------------------------------------------ */

describe('mentions over seeds 1..200 at every difficulty', () => {
  it('names a third party identically everywhere they are named', () => {
    for (const c of everyDifficulty) {
      const ids = new Set(c.mentions.map((m) => m.id));
      expect(ids.size).toBe(c.mentions.length);
      // A role is invented once. Two sentences about the same role must not
      // produce two people.
      const roles = c.mentions.map((m) => m.role);
      expect(new Set(roles).size).toBe(roles.length);
      const surnames = c.mentions.map((m) => m.surname);
      expect(new Set(surnames).size).toBe(surnames.length);
      for (const m of c.mentions) {
        expect(c.people.some((p) => p.surname === m.surname)).toBe(false);
        expect(m.text).toContain(m.name);
      }
    }
  });

  it('never names a mention the case did not invent', () => {
    for (const c of everyDifficulty) {
      const known = new Set<string>();
      for (const p of c.people) for (const part of p.name.split(/\s+/)) known.add(part);
      for (const m of c.mentions) for (const part of m.name.split(/\s+/)) known.add(part);
      const texts: string[] = [
        ...c.people.flatMap((p) => p.dossier?.layers.map((l) => l.text) ?? []),
        ...c.people.map((p) => p.motive?.description ?? ''),
      ];
      for (const text of texts) {
        for (const name of renderedFacts(text).names) {
          if (!/^[A-Z]/.test(name)) continue;
          if (known.has(name)) continue;
          // Everything else has to be an ordinary word; the correspondence
          // sweep below is the authority on that.
        }
      }
      // A mention that is named at all is named in the case's own mention list.
      for (const p of c.people) {
        const third = p.dossier?.tie.third;
        if (!third) continue;
        const mention = c.mentions.find((m) => m.id === third);
        expect(mention, `seed ${c.seed}: ${p.id} names a third party nobody filed`).toBeDefined();
        expect(p.dossier?.tie.backstory).toContain(mention?.name as string);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 1.3 — the victim.
 * ------------------------------------------------------------------ */

describe('the victim bio over seeds 1..200 at every difficulty', () => {
  it('is complete, and says how the case came to light', () => {
    for (const c of everyDifficulty) {
      const bio = c.victimBio;
      expect(bio.standing.length).toBeGreaterThan(10);
      expect(bio.standing).toMatch(/[.!?]$/);
      expect(bio.age).toBeGreaterThan(15);
      expect(bio.profession.detail.length).toBeGreaterThan(10);
      const hasOne = bio.discovery !== undefined || bio.lastSeen !== undefined;
      expect(hasOne, `seed ${c.seed} has neither a discovery nor a last sighting`).toBe(true);
      if (c.act.type === 'missing') expect(bio.lastSeen).toBeDefined();
      else expect(bio.discovery).toBeDefined();
    }
  });

  it('finds the body after the act and before midnight, by somebody who was there', () => {
    for (const c of everyDifficulty) {
      const d = c.victimBio.discovery;
      if (!d) continue;
      expect(d.foundTick).toBeGreaterThan(c.solution.murderTick);
      expect(d.foundTick).toBeLessThanOrEqual(TICKS - 1);
      const line = scheduleOf(c, d.foundById)?.truth;
      const posted = c.people.find((p) => p.id === d.foundById)?.foundAt === d.foundAt;
      expect(
        line?.[d.foundTick] === d.foundAt || posted,
        `seed ${c.seed}: ${d.foundById} was not at ${d.foundAt} at tick ${d.foundTick}`,
      ).toBe(true);
      expect(d.foundById).not.toBe(c.solution.killerId);
    }
  });

  it('has somebody who will say when a missing person was last seen', () => {
    for (const c of everyDifficulty) {
      const seen = c.victimBio.lastSeen;
      if (!seen) continue;
      expect(seen.tick).toBe(c.solution.murderTick - 1);
      expect(scheduleOf(c, seen.byId)?.truth[seen.tick]).toBe(seen.place);
      expect(scheduleOf(c, seen.byId)?.lies).not.toContain(seen.tick);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 1.4 — the client.
 * ------------------------------------------------------------------ */

describe('the client brief over seeds 1..200 at every difficulty', () => {
  it('draws a purpose the relationship and the case type both allow', () => {
    const used = new Set<string>();
    for (const c of everyDifficulty) {
      const client = c.people.find((p) => p.id === c.clientId) as { relationshipId?: Id };
      const rel = RELATIONSHIP_BY_ID[client.relationshipId as Id];
      expect(rel, `seed ${c.seed}: the client has no relationship card`).toBeDefined();
      expect(
        rel?.purposes[c.act.type],
        `seed ${c.seed}: ${c.clientBrief.purpose} for ${client.relationshipId} × ${c.act.type}`,
      ).toContain(c.clientBrief.purpose);
      used.add(c.clientBrief.purpose);
    }
    // Every purpose in the table is reachable, or the table is decoration.
    expect(used.size).toBeGreaterThanOrEqual(7);
  });

  it('points honestly at the lower difficulties, and never when the client did it', () => {
    for (const c of everyDifficulty) {
      const client = c.people.find((p) => p.id === c.clientId);
      const points = c.clientBrief.points;
      expect(points.personId).not.toBe(c.clientId);
      if (client?.isKiller) {
        expect(points.honest, `seed ${c.seed}: the killer points honestly`).toBe(false);
      } else if (c.difficulty <= 2) {
        expect(points.honest, `seed ${c.seed} d${c.difficulty}`).toBe(true);
      }
    }
  });

  it('points at somebody who really has the fact it states', () => {
    for (const c of everyDifficulty) {
      const points = c.clientBrief.points;
      const target = c.people.find((p) => p.id === points.personId);
      expect(target, `seed ${c.seed}: the pointer names nobody`).toBeDefined();
      expect(points.reason).toContain(target?.surname as string);
      if (points.honest) {
        expect(target?.motive, `seed ${c.seed}: an honest pointer with no motive`).toBeDefined();
        expect(points.reason).toContain(target?.motive?.description as string);
        expect(
          c.clientBrief.tells.some(
            (f) => f.kind === 'hasMotive' && f.personId === target?.id,
          ),
          `seed ${c.seed}: the honest pointer is not among the tells`,
        ).toBe(true);
      } else {
        // A red herring is still a real fact about a real person: their
        // secret, or a motive that is not the one that mattered.
        const secretType = target?.secret?.type;
        const isMotive = target?.motive !== undefined && points.reason.includes(
          target.motive.description,
        );
        expect(isMotive || secretType !== undefined).toBe(true);
      }
    }
  });

  it('withholds at least the client’s own secret, and the act when they did it', () => {
    for (const c of everyDifficulty) {
      const client = c.people.find((p) => p.id === c.clientId);
      const withheld = c.clientBrief.withholds;
      if (client?.isKiller) {
        expect(
          withheld.some(
            (f) => f.kind === 'personAt' && f.personId === c.clientId && f.tick === c.act.tick,
          ),
        ).toBe(true);
      } else if (client?.secret) {
        expect(
          withheld.some((f) => f.kind === 'secretExplained' && f.personId === c.clientId),
        ).toBe(true);
      }
      expect(c.clientBrief.ownEvening.length).toBeGreaterThan(0);
      expect(c.clientBrief.ownEvening.length).toBeLessThanOrEqual(4);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 2 — the act and the tropes.
 * ------------------------------------------------------------------ */

describe('the tropes', () => {
  const DISTRIBUTION: Case[] = [];
  for (let seed = 1; seed <= 400; seed++) DISTRIBUTION.push(generateCase(seed));

  it('deals every one of the eight over seeds 1..400', () => {
    const counts = new Map<Id, number>();
    for (const c of DISTRIBUTION) {
      counts.set(c.act.tropeId, (counts.get(c.act.tropeId) ?? 0) + 1);
    }
    for (const id of TROPE_IDS) {
      expect(counts.get(id) ?? 0, `${id} never came up`).toBeGreaterThan(0);
    }
  });

  it('keeps body-at-scene the commonest thing that happens, at 35% or more', () => {
    const n = DISTRIBUTION.filter((c) => c.act.tropeId === 'body-at-scene').length;
    const share = n / DISTRIBUTION.length;
    expect(share, `body-at-scene is ${(share * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.35);
    for (const id of TROPE_IDS) {
      if (id === 'body-at-scene') continue;
      const other = DISTRIBUTION.filter((c) => c.act.tropeId === id).length;
      expect(other, `${id} is commoner than body-at-scene`).toBeLessThan(n);
    }
  });

  it('asks exactly the unknowns the table declares', () => {
    const TABLE: Record<Id, Unknown[]> = {
      'body-at-scene': ['who', 'why', 'when'],
      'body-moved': ['who', 'why', 'when', 'where'],
      'locked-room': ['who', 'why', 'when', 'entry'],
      'the-frame': ['who', 'why', 'when'],
      'inside-job': ['who', 'entry', 'goods'],
      payroll: ['who', 'goods', 'how'],
      left: ['whereabouts', 'why'],
      taken: ['who', 'whereabouts', 'why'],
    };
    for (const trope of TROPES) {
      expect(trope.unknowns.slice().sort()).toEqual((TABLE[trope.id] ?? []).slice().sort());
    }
    for (const c of everyDifficulty) {
      expect(c.act.unknowns.slice().sort()).toEqual(
        (TABLE[c.act.tropeId] ?? []).slice().sort(),
      );
      expect(c.act.type).toBe(TROPE_BY_ID[c.act.tropeId]?.type);
    }
  });

  it('asks where only when the body was moved', () => {
    for (const c of everyDifficulty) {
      const asksWhere = c.act.unknowns.includes('where');
      expect(asksWhere, `seed ${c.seed} ${c.act.tropeId}`).toBe(c.act.tropeId === 'body-moved');
      if (asksWhere) expect(c.act.bodyFoundAt).not.toBe(c.act.place);
    }
  });

  it('states givens that are facts, and never states an unknown', () => {
    for (const c of everyDifficulty) {
      expect(c.act.givens.text.length).toBeGreaterThanOrEqual(3);
      for (const line of c.act.givens.text) {
        expect(line).toMatch(/[.!?]$/);
        expect(line).not.toContain('{');
      }
      // Where `who` is an unknown, the givens never name the one who did it.
      // `left` is the exception: nobody did anything to them, and the person
      // who saw them off may perfectly well be the last one who saw them.
      if (!c.act.unknowns.includes('who')) continue;
      const killer = c.people.find((p) => p.id === c.solution.killerId) as { surname: string };
      for (const line of c.act.givens.text) {
        expect(line, `seed ${c.seed} gives the killer away`).not.toContain(killer.surname);
      }
    }
  });

  it('shapes each case type the way the machinery needs it', () => {
    for (const c of everyDifficulty) {
      expect(c.act.tick).toBe(c.solution.murderTick);
      expect(c.act.place).toBe(c.solution.murderPlaceId);
      if (c.act.type === 'robbery') {
        expect(c.act.taken).toBeDefined();
        expect(c.act.entry).toBeDefined();
        expect(c.act.goodsWentTo).toBeDefined();
        expect(c.act.actorId).toBe(c.solution.killerId);
      }
      if (c.act.type === 'missing') {
        expect(c.act.whereabouts).toBeDefined();
        expect(c.act.fate).toBe(c.act.tropeId === 'left' ? 'left' : 'taken');
        // `left` is the one case where the actor is the person themselves.
        const victimId = c.people.find((p) => p.kind === 'victim')?.id;
        expect(c.act.actorId).toBe(c.act.tropeId === 'left' ? victimId : c.solution.killerId);
      }
      if (c.act.type === 'murder') {
        expect(c.act.fate).toBe('dead');
        expect(c.act.bodyFoundAt).toBeDefined();
      }
    }
  });

  it('puts each trope’s signature in the player’s hands, from two sources', () => {
    for (const c of everyDifficulty) {
      const signature = c.findable.filter((cl) => cl.id.startsWith('t'));
      expect(
        signature.length,
        `seed ${c.seed} d${c.difficulty} ${c.act.tropeId}: ${signature.length} signature clues`,
      ).toBeGreaterThanOrEqual(2);
      const sources = new Set(
        signature.map((cl) =>
          cl.source.type === 'person' ? `p:${cl.source.personId}` : `l:${cl.source.placeId}`,
        ),
      );
      expect(sources.size, `seed ${c.seed}: one source carries the whole signature`)
        .toBeGreaterThanOrEqual(2);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 2 — solvability and par, for all three types.
 * ------------------------------------------------------------------ */

describe('solvability and par across the three case types', () => {
  it('computes a finite par inside the band for every type', () => {
    const seen = new Set<string>();
    for (const c of everyDifficulty) {
      seen.add(c.act.type);
      expect(Number.isFinite(c.par)).toBe(true);
      expect(c.par).toBeGreaterThanOrEqual(9);
      expect(c.par).toBeLessThanOrEqual(18);
      expect(c.budget).toBe(c.par + c.slack);
    }
    expect([...seen].sort()).toEqual(['missing', 'murder', 'robbery']);
  });

  it('lets the oracle walk a robbery and a disappearance inside par', () => {
    for (const type of ['robbery', 'missing'] as const) {
      let walked = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const kase = generateCase(seed, { type });
        expect(kase.act.type).toBe(type);
        const result = playOracle(buildView(kase));
        expect(result.ok, `seed ${seed} ${type}: ${result.reason}`).toBe(true);
        expect(result.actions).toBeLessThanOrEqual(result.par);
        walked++;
      }
      expect(walked).toBe(20);
    }
  });

  it('forces a trope on demand, for reading', () => {
    for (const id of TROPE_IDS) {
      const kase = generateCase(1, { tropeId: id });
      expect(kase.act.tropeId).toBe(id);
      expect(kase.act.type).toBe(TROPE_BY_ID[id]?.type);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Part 3 — correspondence.
 * ------------------------------------------------------------------ */

describe('correspondence over seeds 1..200 at every difficulty', () => {
  it('finds no violation anywhere the generator writes a sentence', () => {
    const violations = everyDifficulty.flatMap((c) =>
      checkCase(c).map((v) => ({ ...v, where: `seed ${c.seed} d${c.difficulty} ${v.where}` })),
    );
    expect(
      violations.length,
      violations.length === 0 ? '' : `\n${formatViolations(violations)}`,
    ).toBe(0);
  });

  it('never says "the victim" without naming them', () => {
    for (const c of everyDifficulty) {
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      for (const clue of c.candidates) {
        if (!/\bthe victim\b/i.test(clue.text)) continue;
        expect(clue.text, `${c.seed}: ${clue.id}`).toContain(victim.surname);
      }
    }
  });

  it('never writes a motive without its object', () => {
    for (const c of everyDifficulty) {
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      const objects = c.mentions.map((m) => m.name);
      for (const p of c.people) {
        if (!p.motive) continue;
        const has =
          p.motive.description.includes(victim.surname) ||
          objects.some((o) => p.motive?.description.includes(o));
        expect(has, `seed ${c.seed}: ${p.surname} — ${p.motive.description}`).toBe(true);
      }
    }
  });

  it('catches a sentence that names somebody who is not in the case', () => {
    // The checker is a filter, not a formality: damage a good sentence and it
    // has to notice.
    const c = corpus[6] as Case;
    const bad = checkCase({
      ...c,
      briefing: [...c.briefing, 'Thaddeus Ellery came by at 10:00 PM and said nothing.'],
    });
    expect(bad.some((v) => v.rule === 'unknown-name')).toBe(true);
  });

  it('catches a time that is not a half hour of the evening', () => {
    const c = corpus[6] as Case;
    const bad = checkCase({ ...c, briefing: [...c.briefing, 'It was over by 3:15 AM.'] });
    expect(bad.some((v) => v.rule === 'bad-time')).toBe(true);
  });

  it('catches a movement the schedules do not support', () => {
    const c = corpus[6] as Case;
    const victim = c.people.find((p) => p.kind === 'victim') as { id: Id };
    const reallyAt = scheduleOf(c, victim.id)?.truth[c.solution.murderTick];
    const elsewhere = c.places.find(
      (p) => p.id !== c.solution.murderPlaceId && p.id !== reallyAt,
    ) as { id: Id };
    const damaged: Case = {
      ...c,
      candidates: [
        ...c.candidates,
        {
          id: 'x999',
          kind: 'observation',
          source: { type: 'place', placeId: elsewhere.id },
          establishes: [
            {
              kind: 'personAt',
              personId: victim.id,
              place: elsewhere.id,
              tick: c.solution.murderTick,
            },
          ],
          text: 'Nobody says anything at all.',
          place: elsewhere.id,
          leadsTo: [],
          role: 'noise',
        },
      ],
    };
    expect(checkCase(damaged).some((v) => v.rule === 'fact-false')).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Part 4 — the briefing.
 * ------------------------------------------------------------------ */

describe('the briefing over seeds 1..200 at every difficulty', () => {
  it('runs to between ten and sixteen plain declarative sentences', () => {
    for (const c of everyDifficulty) {
      expect(
        c.briefing.length,
        `seed ${c.seed} d${c.difficulty}: ${c.briefing.length} sentences`,
      ).toBeGreaterThanOrEqual(10);
      expect(c.briefing.length).toBeLessThanOrEqual(16);
      for (const line of c.briefing) {
        expect(line).toMatch(/[.!?]$/);
        expect(line).not.toContain('{');
        expect(line.trim()).toBe(line);
        // Declarative: no questions, and nothing in the detective's voice.
        expect(line).not.toContain('?');
        expect(line).not.toMatch(/\bI\b/);
      }
    }
  });

  it('says the things the spec orders it to say, in that order', () => {
    for (const c of everyDifficulty) {
      const client = c.people.find((p) => p.id === c.clientId) as { name: string; surname: string };
      const victim = c.people.find((p) => p.kind === 'victim') as { surname: string };
      const text = c.briefing.join(' ');
      // 1. who came in
      expect(c.briefing[0]).toMatch(/^A (man|woman) came up the stairs/);
      expect(c.briefing[1]).toContain(client.name);
      // 2. what happened, in the victim's terms
      expect(text).toContain(victim.surname);
      expect(text).toContain(c.victimBio.standing);
      // 3-5
      expect(text).toContain(c.clientBrief.purposeText);
      expect(text).toContain(c.clientBrief.cost);
      const pointed = c.people.find((p) => p.id === c.clientBrief.points.personId) as {
        surname: string;
      };
      expect(text).toContain(`start with ${pointed.surname}`);
      // The retainer is the engine's line, and is not here.
      expect(text).not.toMatch(/\bretainer\b/i);
      // Whether Dashiell knows them is the engine's roll.
      expect(text).not.toMatch(/\bI knew\b|\bI have seen\b/);
    }
  });

  it('never states an unknown the report is going to ask for', () => {
    for (const c of everyDifficulty) {
      const killer = c.people.find((p) => p.id === c.solution.killerId) as { surname: string };
      const text = c.briefing.join(' ');
      if (!c.act.unknowns.includes('who')) continue;
      // The client may point at the killer — that is a suspicion, not a
      // given — and a client who is the killer introduces themselves.
      if (c.clientBrief.points.personId === c.solution.killerId) continue;
      if (c.clientId === c.solution.killerId) continue;
      expect(text, `seed ${c.seed} names the killer in the briefing`).not.toContain(
        killer.surname,
      );
    }
  });
});
