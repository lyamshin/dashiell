/**
 * docs/52: bones and flesh. Every fact unit carries its propositions; the
 * planner composes on them; the plain page says them and reads back to them;
 * every voicing reads back to the composite it said.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { newBoardRun } from '../src/game/board/engine.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { newBudget, planSection, type Item, type PlanCtx } from '../src/game/board/plan/index.js';
import { PROP_KINDS, SHAPES, type Composite, type Prop } from '../src/game/board/bones/types.js';
import { canon } from '../src/game/board/bones/extract.js';
import { plainComposite, plainPage, roundTrip } from '../src/game/board/bones/plain.js';
import { VOICED, voicedTally } from '../src/game/board/bones/reread.js';
import { fill, fitting, useVoicings, voicingById, voicings, type Voicing } from '../src/game/board/bones/voice.js';
import { VARIETY, preview, type VoiceHand } from '../src/game/board/bones/say.js';
import { Hand } from '../src/game/board/decks.js';
import { mannerOf } from '../src/game/board/pages.js';
import { lintVoicings } from '../scripts/voicing-lint.js';
import type { Beat } from '../src/game/board/sheets.js';

const worlds = [undefined, 'neighbourhood'] as const;
const nights: { tier: TierIndex; type: CaseType; world?: 'neighbourhood' }[] = [];
for (const world of worlds) for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier) as CaseType[]) nights.push({ tier, type, ...(world ? { world } : {}) });

function oracle(s: number, tier: TierIndex, type: CaseType, world?: 'neighbourhood'): { run: BoardRun; d: ReturnType<typeof dealBoard> } {
  const d = dealBoard(s, tier, type, world ? { world } : {});
  return { run: playBoardOracle(d).run, d };
}

const walk = (x: Composite, f: (y: Composite) => void): void => {
  f(x);
  for (const y of x.parts ?? []) walk(y, f);
};

afterEach(() => {
  VOICED.check = false;
  useVoicings(null);
});

describe('docs/52 §1: the bones', () => {
  it.each(nights)('every fact unit carries its propositions, of the closed set, in the engine’s own ids: tier $tier, $type, $world', ({ tier, type, world }) => {
    const { run, d } = oracle(1, tier, type, world);
    const c = d.kase;
    const people = new Set(c.people.map((p) => p.id));
    const places = new Set([...c.places.map((p) => p.id), 'office']);
    for (const p of run.log) {
      for (const u of p.board?.units ?? []) {
        if (u.kind !== 'fact') continue;
        const bones = u.bones ?? [];
        const ps = bones.flatMap((b) => b.props);
        expect(ps.length, `p${p.n + 1}: ${u.text.slice(0, 80)}`).toBeGreaterThan(0);
        for (const b of bones) walk(b, (x) => expect(SHAPES as readonly string[]).toContain(x.shape));
        for (const x of ps) {
          expect(PROP_KINDS).toContain(x.k);
          const o = x as Record<string, unknown>;
          for (const k of ['person', 'watcher', 'speaker', 'victim', 'client', 'witness', 'finder']) if (typeof o[k] === 'string' && o[k] !== '*') expect(people.has(o[k] as string), `${x.k}.${k} ${String(o[k])}`).toBe(true);
          for (const k of ['place', 'via', 'claimed']) if (typeof o[k] === 'string') expect(places.has(o[k] as string), `${x.k}.${k} ${String(o[k])}`).toBe(true);
          if (typeof o.hour === 'number') expect(o.hour).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });
});

describe('docs/52 §3: the plain page, and the round trip', () => {
  it.each(nights)('every plain page reads back to its bones, in order: tier $tier, $type, $world', ({ tier, type, world }) => {
    for (let s = 1; s <= 2; s++) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
      for (const run of [playBoardOracle(d).run, playWanderer(d, s).run]) {
        for (const p of run.log) {
          const r = roundTrip(d.kase, p);
          expect(r.error ?? '', `seed ${s} p${p.n + 1}`).toBe('');
          expect(r.read, `seed ${s} p${p.n + 1}`).toEqual(r.bones);
        }
      }
    }
  });

  it('the golden’s page 8, plainly: every fact, no voice, a pronoun for the clause before’s subject', () => {
    const { run, d } = oracle(1, 4, 'lost-pet');
    const blocks = plainPage(d.kase, run.log[7] as (typeof run.log)[number]);
    expect(blocks.map((b) => b.text)).toEqual([
      'Ashby said he was at the Automat at eight and nine, alone. He said he was at the Delmonico rooms at ten, with Mrs. Cheatham. He said he was at the Thalia at eleven, with Feeney. He said he passed Corrigan on Stuyvesant Street at eleven on the way to the Thalia.',
      'Coffin backed up Ashby: he was at the Thalia at eleven, with Feeney; the Prentiss flat was on Stuyvesant Street.',
    ]);
  });

  it('never a pronoun another of that sex in the clause before could be: the name', () => {
    const c = dealBoard(1, 4, 'lost-pet').kase;
    const comp: Composite = {
      shape: 'PAIR',
      join: 'and',
      props: [],
      parts: [
        { shape: 'COLLISION-PAIR', props: [{ k: 'COLLIDES', person: 'abramowitz', place: 'bar', hour: 11, with: { k: 'list', who: 'barkeep' } }] },
        { shape: 'REACTION', props: [{ k: 'REFUSE', person: 'abramowitz', hour: 11 }] },
      ],
    };
    // Coffin (a man) is named in the clause before: "he" could be either.
    expect(plainComposite(c, comp)).toBe('Abramowitz said he was at the Thalia at eleven, which did not agree with what Coffin said, and Abramowitz would not say where he was at eleven.');
    // (Nobody else named: the search. The office is the client, by name, and would count.)
    const alone: Composite = { ...comp, parts: [{ shape: 'COLLISION-PAIR', props: [{ k: 'COLLIDES', person: 'abramowitz', place: 'bar', hour: 11, with: { k: 'find' } }] }, comp.parts?.[1] as Composite] };
    expect(plainComposite(c, alone)).toBe('Abramowitz said he was at the Thalia at eleven, which did not agree with what the search said, and he would not say where he was at eleven.');
  });
});

describe('docs/52 §4: the voicings', () => {
  const PLACEHOLDER = /\{[A-Za-z][\w-]*\}/g;

  it('every voicing is of a shape in the closed set, and its own words name no person, place, hour or digit', () => {
    const c = dealBoard(1, 4, 'lost-pet').kase;
    const names = [...c.people.map((p) => p.short), ...c.places.map((p) => p.short)];
    for (const v of voicings()) {
      expect(SHAPES as readonly string[], v.id).toContain(v.shape);
      const words = v.template.replace(PLACEHOLDER, ' ');
      expect(words, v.id).not.toMatch(/\d|\b(?:seven|eight|nine|ten|eleven|twelve|midnight)\b(?!\s+(?:feet|minutes|dollars))/i);
      // (A voicing keyed to one place, "unwatched:3", may say it: the key folds it.)
      if (!(v.requires ?? []).some((r) => r.includes(':'))) for (const n of names) expect(words.includes(n), `${v.id}: ${n}`).toBe(false);
    }
  });

  it('build 2: every voicing keeps its shape’s schema, says every fact its form says, and nothing a page may not', () => {
    expect(lintVoicings(voicings())).toEqual([]);
  });

  it('build 2: three voicings or more for every shape, and for every form the nights say often', () => {
    for (const sh of SHAPES) expect(voicings().filter((v) => v.shape === sh).length, sh).toBeGreaterThanOrEqual(3);
  });

  it('build 2: a typed argument is said in its form, and read back by its type', () => {
    const c = dealBoard(1, 4, 'lost-pet').kase;
    const coffin = c.people.find((p) => p.short === 'Coffin')?.id as string;
    const args = { p: { t: 'person' as const, id: coffin }, h: { t: 'hour' as const, h: 10 }, hs: { t: 'hours' as const, hs: [10, 11] }, ps: { t: 'people' as const, ids: ['feeney', 'ashby'].map((x) => c.people.find((p) => p.short.toLowerCase() === x)?.id as string) } };
    const said = fill('{P} said {p:they} saw {ps:or} at {h:oclock}; {p:role} had {hs:or}, {ps:poss} hours.', args, c).replace(/⁣\d+⁤/g, '');
    expect(said).toBe('Coffin said he saw Feeney or Ashby at ten o’clock; the house manager had ten or eleven, Feeney’s and Ashby’s hours.');
  });

  it('build 2: a voicing that names an argument the composite hasn’t doesn’t fit it', () => {
    const vs = voicings().filter((v) => v.shape === 'REMARK' && (v.requires ?? []).includes('shift'));
    expect(vs.length).toBeGreaterThan(0);
    expect(fitting('REMARK', new Set(['shift']), { manner: 'plain' }, { from: { t: 'hour', h: 10 } }).length).toBeGreaterThan(0);
    expect(fitting('REMARK', new Set(['shift']), { manner: 'plain' }, {}).length).toBe(0);
  });

  it('build 2: an account is said in its speaker’s manner, a line a voicing, and no line of it in the writer’s own words', () => {
    let lines = 0;
    for (const { tier, type, world } of nights) {
      const d = dealBoard(2, tier, type, world ? { world } : {});
      for (const p of playBoardOracle(d).run.log) {
        if (p.board?.job !== 'account') continue;
        const who = (p.board.q ?? '').slice('account:'.length);
        for (const u of p.board.units ?? []) {
          if (u.kind !== 'fact' || u.voice !== 'answer' || !u.carries.some((x) => x.startsWith('claim:'))) continue;
          lines++;
          const v = u.bones?.[0]?.voicing ?? '';
          expect(v, u.text).toMatch(/^claim\//);
          const vo = voicingById(v);
          expect([undefined, mannerOf(d.kase, who)], `${v}: ${u.text}`).toContain(vo?.manner);
        }
      }
    }
    expect(lines).toBeGreaterThan(50);
  });

  it('build 2: no voicing is said twice in a night while another that fits is still unsaid', () => {
    VARIETY.on = true;
    try {
      for (const { tier, type, world } of nights) {
        for (let s = 1; s <= 2; s++) {
          VARIETY.picks = [];
          playBoardOracle(dealBoard(s, tier, type, world ? { world } : {}));
          expect(VARIETY.picks.filter((x) => x.unsaidLeft).map((x) => x.id), `tier ${tier} ${type} ${world ?? ''} seed ${s}`).toEqual([]);
        }
      }
    } finally {
      VARIETY.on = false;
    }
  });

  it('build 2: the hand says when a voicing was last used tonight', () => {
    const h = new Hand(1, 3, ['a', 'v:x#1', 'b', 'v:y#1']);
    expect(h.lastUse('v:x')).toBe(1);
    expect(h.lastUse('v:z')).toBe(-1);
    h.note('v:x#2');
    expect(h.lastUse('v:x')).toBe(4);
    expect(h.uses('v:x')).toBe(2);
    h.forget('v:x#2');
    expect(h.uses('v:x')).toBe(1);
  });

  it('build 2: an answer’s third “o’clock” goes to a voicing without one, unless that would say a voicing twice', () => {
    const c = dealBoard(1, 4, 'lost-pet').kase;
    const flags = ['run', 'next', 'reason', 'one', 'bare'];
    const args = { from: { t: 'hour' as const, h: 10 }, reason: 'went to the Automat for coffee', with: '' };
    const o = { manner: 'careful', tierBand: 'high' };
    const all = fitting('CLAIM-SPAN', new Set(flags), o, args);
    expect(all.some((v) => v.template.includes(':oclock'))).toBe(true);
    expect(all.some((v) => !v.template.includes(':oclock'))).toBe(true);
    const handOf = (said: string[], n: number): VoiceHand => ({ lastUse: (id) => said.indexOf(id), uses: (id) => (said.includes(id) ? 1 : 0), note: () => {}, swap: () => {}, forget: () => {}, mayJoke: false, joke: () => {}, int: (k) => n % k });
    const prefer = (t: string) => !/o’clock/.test(t);
    for (let n = 0; n < 6; n++) expect(preview('CLAIM-SPAN', flags, o, args, { c, hand: handOf([], n), prefer })?.text).not.toMatch(/o’clock/);
    // Every voicing without it said tonight already, and one with it not: variety comes first.
    const without = all.filter((v) => !v.template.includes(':oclock')).map((v) => `v:${v.id}`);
    expect(preview('CLAIM-SPAN', flags, o, args, { c, hand: handOf(without, 0), prefer })?.text).toMatch(/o’clock/);
  });

  it('build 2: a typed voicing that drops a fact fails the round trip', () => {
    // An account's stretch said without who was with them.
    const dropped = voicings().map((v): Voicing => (v.shape === 'CLAIM-SPAN' && (v.requires ?? []).includes('run') ? { ...v, template: v.template.replace('{with}', '') } : v));
    useVoicings(dropped);
    VOICED.check = true;
    const before = voicedTally();
    for (const { tier, type, world } of nights.slice(0, 6)) playBoardOracle(dealBoard(1, tier, type, world ? { world } : {}));
    const after = voicedTally();
    expect(after.misses.slice(before.misses.length).filter((m) => m.includes('claim/')).length).toBeGreaterThan(0);
  });

  it.each(nights.filter((x) => x.tier % 2 === 0 || x.world === undefined))('every voiced composite reads back to its bones: tier $tier, $type, $world', ({ tier, type, world }) => {
    VOICED.check = true;
    const before = voicedTally();
    for (let s = 1; s <= 2; s++) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
      playBoardOracle(d);
      playWanderer(d, s);
    }
    const after = voicedTally();
    expect(after.misses.slice(before.misses.length)).toEqual([]);
    expect(after.voicedOk - before.voicedOk).toBe(after.voiced - before.voiced);
  });

  it.each(nights.filter((x) => x.tier % 2 === 1 || x.world === undefined))('docs/53: every voiced composite is clear (every place and hour said, no pronoun for a place, no oblique tag): tier $tier, $type, $world', ({ tier, type, world }) => {
    VOICED.check = true;
    const before = voicedTally();
    for (let s = 1; s <= 2; s++) {
      const d = dealBoard(s, tier, type, world ? { world } : {});
      playBoardOracle(d);
      playWanderer(d, s);
    }
    const after = voicedTally();
    expect(after.unclear.slice(before.unclear.length).map((u) => `${u.id}: ${u.why.join('; ')}: ${u.said}`)).toEqual([]);
    expect(after.clear - before.clear).toBe(after.voiced - before.voiced);
  });

  it('docs/53: the designer’s "too voiced" line fails the clarity check, though it reads back', () => {
    // Build 1's agreement: "So here at eleven, with Feeney, which was what Coffin had."
    const old = voicings().map((v): Voicing => (v.shape === 'CONFIRMED' && (v.requires ?? []).includes('agree') ? { ...v, template: (v.requires ?? []).includes('so') ? 'So {spans}, which was what {src}.' : '{Spans}, which was what {src}.' } : v));
    useVoicings(old);
    VOICED.check = true;
    const before = voicedTally();
    for (const { tier, type, world } of nights) playBoardOracle(dealBoard(1, tier, type, world ? { world } : {}));
    const after = voicedTally();
    const unclear = after.unclear.slice(before.unclear.length).filter((u) => u.id.startsWith('confirmed/'));
    expect(unclear.length).toBeGreaterThan(0);
    expect(unclear.every((u) => u.why.some((w) => w.includes('which was what X had')))).toBe(true);
    expect(after.misses.slice(before.misses.length).filter((m) => m.includes('confirmed/'))).toEqual([]);
  });

  it('a voicing that drops a fact fails the round trip', () => {
    const dropped = voicings().map((v): Voicing => (v.id === 'confirmed/list' ? { ...v, template: '{watcher} had {them} {at}, same as {he} said.' } : v));
    useVoicings(dropped);
    VOICED.check = true;
    const before = voicedTally();
    for (const { tier, type, world } of nights) {
      const d = dealBoard(1, tier, type, world ? { world } : {});
      playBoardOracle(d);
    }
    const after = voicedTally();
    const misses = after.misses.slice(before.misses.length).filter((m) => m.includes('confirmed/list:'));
    expect(misses.length).toBeGreaterThan(0);
  });

  it('where no voicing fits, the composite is said plainly, and still reads back', () => {
    useVoicings([]);
    const d = dealBoard(1, 4, 'lost-pet');
    const c = d.kase;
    const ctx: PlanCtx = { c, budget: newBudget(), pick: (_k, ls) => ls[0] as string, level: 'link', int: () => 0, run: { ...newBoardRun(d), at: 'bar' } };
    const col: Item = {
      kind: 'fact',
      beat: 'thought',
      voice: 'thought',
      text: '(the writer’s own words)',
      relation: 'collides',
      tag: 'thought:collision',
      carries: ['x'],
      about: ['corrigan'],
      props: [{ k: 'COLLIDES', person: 'corrigan', place: 'h', hour: 11, with: { k: 'REMARK', speaker: 'ashby', saw: 'corrigan', how: 'passed', where: 'Stuyvesant Street', hour: 11 } } as Prop],
      flesh: { two: 'One of them was wrong.', twos: ['One of them was wrong.'] },
    };
    const out = planSection({ thought: [col] } as Partial<Record<Beat, Item[]>>, [['thought']], ctx, 0);
    expect(out.blocks[0]?.kind === 'prose' ? out.blocks[0].text : '').toBe('Corrigan said she was at Corrigan’s flat at eleven, which did not agree with this: Ashby said he passed Corrigan on Stuyvesant Street at eleven.');
    const u = out.units[0];
    expect(u?.kind === 'fact' ? u.bones?.[0]?.voicing : '').toBe('plain');
    expect(u?.kind === 'fact' ? (u.bones ?? []).flatMap((b) => b.props).map(canon) : []).toEqual((col.props ?? []).map(canon));
  });
});
