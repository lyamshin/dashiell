/**
 * M14 — cases that aren't murder (docs/33-m14-cases.md).
 *
 * Three new case types: a lost pet, a lost item and an affair. Every tier
 * deals every type, murder about a third; debts are one tie among many; the
 * affair ends on what the player tells the client, which is recorded and
 * never scored.
 */
import { describe, expect, it } from 'vitest';
import { generateCase, type Case, type CaseType } from '../src/gen/index.js';
import { CASE_TYPES, isTheft } from '../src/gen/types.js';
import { CASE_MIX, TIERS } from '../src/gen/shape.js';
import { TROPES } from '../src/gen/tropes/index.js';
import { buildView, peopleHere, victimReachable, type CaseView } from '../src/game/derive.js';
import { fieldsFor, truthReport, withAnswer } from '../src/game/report-form.js';
import { fileReport, newRun } from '../src/game/reducer.js';
import { playOracle } from '../src/game/oracle.js';
import { scoreReport } from '../src/game/scoring.js';
import { storyOf, storyParagraphs } from '../src/game/story.js';
import { emptyProfile, recordRun, sanitizeProfile } from '../src/game/profile.js';
import { renderPageText } from '../src/game/transcript.js';
import { TOLD_CHOICES } from '../src/game/types.js';

const MUNDANE: CaseType[] = ['lost-pet', 'lost-item', 'affair'];
const TIER_IDS = [0, 1, 2, 3, 4, 5] as const;

function viewOf(seed: number, tier: (typeof TIER_IDS)[number], type: CaseType): CaseView {
  return buildView(generateCase(seed, { tier, level: tier === 0 ? 1 : 2, type }));
}

describe('M14: the three new case types', () => {
  it('every tier deals every case type, and each asks at least who', () => {
    for (const tier of TIER_IDS) {
      for (const type of CASE_TYPES) {
        for (let seed = 1; seed <= 3; seed++) {
          const kase = generateCase(seed, { tier, level: tier === 0 ? 1 : 2, type });
          expect(kase.act.type).toBe(type);
          expect(kase.act.unknowns.length, `${type} T${tier}`).toBeGreaterThan(0);
          if (MUNDANE.includes(type)) expect(kase.act.unknowns).toContain('who');
        }
      }
    }
  });

  it('has at least two tropes for each new type', () => {
    for (const type of MUNDANE) expect(TROPES.filter((t) => t.type === type).length).toBeGreaterThanOrEqual(2);
  });

  it('deals murder about a third of the time at every tier, and every type', () => {
    const total = Object.values(CASE_MIX).reduce((a, b) => a + b, 0);
    expect(CASE_MIX.murder / total).toBeGreaterThan(0.28);
    expect(CASE_MIX.murder / total).toBeLessThan(0.4);
    for (const tier of [0, 3] as const) {
      const n = new Map<CaseType, number>();
      const SEEDS = 120;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const t = generateCase(seed, { tier, level: tier === 0 ? 1 : 2 }).act.type;
        n.set(t, (n.get(t) ?? 0) + 1);
      }
      const murder = (n.get('murder') ?? 0) / SEEDS;
      expect(murder, `T${tier} murder`).toBeGreaterThan(0.22);
      expect(murder, `T${tier} murder`).toBeLessThan(0.45);
      for (const type of CASE_TYPES) expect(n.get(type) ?? 0, `T${tier} ${type}`).toBeGreaterThan(0);
    }
    for (const shape of Object.values(TIERS)) expect(shape.caseTypes).toEqual(CASE_TYPES);
  });

  it('keeps debts and loans to at most about fifteen per cent of ties', () => {
    let ties = 0;
    let debt = 0;
    for (const tier of [2, 5] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const p of generateCase(seed, { tier, level: 2 }).people) {
          if (p.kind !== 'suspect') continue;
          ties++;
          const words = `${p.relationshipToVictim ?? ''} ${p.dossier?.tie.backstory ?? ''}`;
          if (['rel-creditor', 'rel-debtor'].includes(p.relationshipId ?? '') || /\b(lent|loan|owe[sd]?|debt|IOU)\b/i.test(words)) debt++;
        }
      }
    }
    expect(debt / ties).toBeLessThanOrEqual(0.15);
  });

  it('gives an affair a client married or engaged to the one it is about, who is never the one they were with', () => {
    for (const tier of TIER_IDS) {
      for (let seed = 1; seed <= 4; seed++) {
        const kase = generateCase(seed, { tier, level: tier === 0 ? 1 : 2, type: 'affair' });
        const client = kase.people.find((p) => p.id === kase.clientId);
        const victim = kase.people.find((p) => p.kind === 'victim');
        expect(['rel-wed', 'rel-intended']).toContain(client?.relationshipId);
        expect(client?.isKiller).toBe(false);
        expect(client?.gender).not.toBe(victim?.gender);
        expect(kase.act.claimedAt).toBeDefined();
        expect(kase.act.claimedAt).not.toBe(kase.act.place);
      }
    }
  });

  it('asks the right questions, in words that fit the case', () => {
    const lost = viewOf(2, 4, 'lost-pet');
    expect(lost.kase.act.unknowns).toEqual(['who', 'when', 'goods', 'why']);
    const labels = fieldsFor(lost).map((f) => f.label).join(' | ');
    expect(labels).toMatch(/let .* out/);
    expect(labels).not.toMatch(/killed|took/i);
    const affair = viewOf(2, 4, 'affair');
    expect(affair.kase.act.unknowns).toEqual(['who', 'when', 'where']);
    expect(fieldsFor(affair).map((f) => f.label).join(' | ')).toMatch(/was with/);
    // Below Medium the report asks who, and only who.
    expect(viewOf(2, 1, 'lost-item').kase.act.unknowns).toEqual(['who']);
    // The why of a lost thing offers the small reasons, and the truth is one of them.
    const why = fieldsFor(viewOf(3, 4, 'lost-item')).find((f) => f.key === 'why');
    expect(why?.options.map((o) => o.value)).toContain(viewOf(3, 4, 'lost-item').kase.solution.motiveType);
    expect(why?.options.map((o) => o.value)).not.toContain('inheritance');
  });

  it('lets the owner of a lost thing be asked, and never puts the one an affair is about in a room', () => {
    for (const type of ['lost-pet', 'lost-item'] as CaseType[]) expect(victimReachable(viewOf(1, 2, type).kase, [])).toBe(true);
    const view = viewOf(1, 2, 'affair');
    expect(victimReachable(view.kase, [])).toBe(false);
    for (const place of view.kase.places) expect(peopleHere(view, place.id, []).some((p) => p.kind === 'victim')).toBe(false);
    // An affair opens where they said they would be.
    expect(view.startId).toBe(view.kase.act.claimedAt);
  });
});

// "The kitchen noise had died down" and "the ring it hangs on" are not deaths;
// a character who was "robbed once" is somebody's history, not the case.
const DEATH = /\b(died(?! down)|killed|killer|murder|murdered|corpse|the body|slab|hanged|coroner|jury|weapon)\b/i;
const THEFT = /\b(robbery|thief|stolen goods)\b/i;

describe('M14: on the page', () => {
  it('never speaks of a death, and a lost dog or an affair never of a robbery', () => {
    const offenders: string[] = [];
    for (const type of MUNDANE) {
      for (const tier of [0, 2, 4] as const) {
        for (let seed = 1; seed <= 3; seed++) {
          const view = viewOf(seed, tier, type);
          const state = playOracle(view).state;
          const text = state.log.map((p) => renderPageText(p, view, state)).join('\n');
          for (const sentence of text.split(/(?<=[.!?][”’"']?)\s+/)) {
            if (DEATH.test(sentence) || (type !== 'lost-item' && THEFT.test(sentence))) {
              offenders.push(`${type} T${tier} s${seed}: ${sentence.replace(/\s+/g, ' ')}`);
            }
          }
          const verdict = scoreReport(view, fileReport(state, truthReport(view)), truthReport(view));
          for (const p of [...verdict.closing, ...storyParagraphs(storyOf(view.kase))]) {
            if (DEATH.test(p)) offenders.push(`${type} T${tier} s${seed} closing: ${p}`);
          }
        }
      }
    }
    expect(offenders.slice(0, 8)).toEqual([]);
  });

  it('writes a closing page and a story for every type and outcome, with no hand-written gap', () => {
    for (const type of MUNDANE) {
      const view = viewOf(4, 4, type);
      const state = newRun(view, { detectiveName: 'Dashiell' });
      const truth = truthReport(view);
      const solved = scoreReport(view, state, truth);
      expect(solved.outcome).toBe('solved');
      expect(solved.gaps, type).toEqual([]);
      const cold = scoreReport(view, state, withAnswer(truth, 'who', null));
      expect(cold.outcome).toBe('cold');
      expect(cold.closing.join(' ')).not.toEqual(solved.closing.join(' '));
      expect(storyParagraphs(storyOf(view.kase)).join(' ').length).toBeGreaterThan(200);
    }
  });
});

describe('M14: the affair ends on what I tell the client', () => {
  const view = viewOf(6, 4, 'affair');
  const state = newRun(view, { detectiveName: 'Dashiell' });
  const truth = truthReport(view);

  it('changes the closing page and the story, and never the score', () => {
    const verdicts = TOLD_CHOICES.map((told) => scoreReport(view, state, { ...truth, told }));
    const pages = verdicts.map((v) => v.closing.join(' '));
    expect(new Set(pages).size).toBe(3);
    for (const v of verdicts) {
      expect(v.points).toBe(verdicts[0]?.points);
      expect(v.outcome).toBe(verdicts[0]?.outcome);
      expect(v.gaps).toEqual([]);
    }
    const stories = TOLD_CHOICES.map((told) => storyParagraphs(storyOf(view.kase, [], told)).join(' '));
    expect(new Set(stories).size).toBe(3);
    expect(stories.every((s) => s.includes(view.client.surname))).toBe(true);
  });

  it('is recorded in the profile, and survives a reload', () => {
    let profile = emptyProfile();
    for (const told of ['truth', 'nothing', 'nothing'] as const) {
      profile = recordRun(profile, { tier: 4, level: 2, points: 3, asked: 8, actionsUsed: 10, par: 10, told }).profile;
    }
    expect(profile.told).toEqual({ truth: 1, half: 0, nothing: 2 });
    expect(sanitizeProfile(JSON.parse(JSON.stringify(profile))).told).toEqual({ truth: 1, half: 0, nothing: 2 });
    // A profile from before M14 has no count, and gets none from a murder.
    expect(recordRun(emptyProfile(), { tier: 0, level: 1, points: 1, asked: 1, actionsUsed: 5, par: 6 }).profile.told).toBeUndefined();
  });
});

describe('M14: the three mundane machines', () => {
  it('puts a lost thing’s owner elsewhere, and the one an affair is about at the scene, alive after', () => {
    const at = (kase: Case, id: string, t: number) => kase.schedules.find((s) => s.personId === id)?.truth[t] ?? null;
    for (const type of MUNDANE) {
      for (let seed = 1; seed <= 4; seed++) {
        const kase = generateCase(seed, { tier: 3, level: 2, type });
        const victim = kase.people.find((p) => p.kind === 'victim')!;
        const M = kase.act.tick;
        if (isTheft(type)) {
          expect(at(kase, victim.id, M)).not.toBe(kase.act.place);
          expect(kase.act.taken?.homePlace).toBe(kase.act.place);
          expect(kase.act.goodsWentTo).toBeDefined();
        } else {
          expect(at(kase, victim.id, M)).toBe(kase.act.place);
          expect(at(kase, kase.solution.killerId, M)).toBe(kase.act.place);
          expect(M + 1 < 12 ? at(kase, victim.id, M + 1) : 'x').not.toBeNull();
        }
      }
    }
  });
});
