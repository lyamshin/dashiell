import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { familyCards } from '../src/game/board/decks.js';
import { mannerOf } from '../src/game/board/pages.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { SHEETS } from '../src/game/board/sheets.js';
import { pageStars } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { walkBetween } from '../src/game/board/walk.js';
import { namesOverTwo, thinNames } from '../src/game/board/names.js';
import { levelIssues } from '../src/game/board/lint.js';
import { linesHeld } from '../src/game/board/knowledge.js';
import { boardFields } from '../src/game/board/report.js';
import type { Page } from '../src/game/board/types.js';

/**
 * docs/44: the connective tissue. Every page opens on why the detective is
 * there, or on the walk; every job ends on a thought that ties the new fact
 * to an earlier one by name; the beats come in the sheet's order; reactions
 * know nothing of who's lying; the office says one line a paragraph; and the
 * generator's nits stay fixed.
 */

const SEEDS = 3;
const cases: { tier: TierIndex; type: CaseType }[] = [];
for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) for (const type of typesFor(tier)) cases.push({ tier, type });

const JOBS = new Set(['account', 'list', 'search', 'confront', 'motive']);

function prose(p: Page, voice?: string): string {
  return p.blocks
    .filter((b) => b.kind === 'prose' && (!voice || b.voice === voice))
    .map((b) => (b.kind === 'prose' ? b.text : ''))
    .join('\n');
}

describe('board: the thread', () => {
  it.each(cases)('every page after the office has a why or a walk, or carries the one the page before said: tier $tier, $type', ({ tier, type }) => {
    for (let s = 1; s <= SEEDS; s++) {
      const d = dealBoard(s, tier, type);
      for (const run of [playBoardOracle(d).run, playWanderer(d, s).run] as BoardRun[]) {
        run.log.forEach((p, i) => {
          if (i === 0) return;
          const beats = p.board?.beats ?? [];
          // docs/47 C13: a page right after the arrival in its room, or after a hand-off that named
          // who it's about, carries that reason instead of a signpost ("So, Moe’s.").
          const prev = run.log[i - 1];
          const carried = p.board?.carried === true && !!prev && (prev.board?.job === 'arrive' || !!prev.board?.handoff || prev.at === p.at || (prev.board?.beats ?? []).includes('why'));
          expect(beats.includes('why') || beats.includes('walk') || carried, `seed ${s} page ${i + 1} (${p.board?.job}): ${beats.join(', ')}`).toBe(true);
        });
      }
    }
  });

  it('a hand-off agrees with the starred choice', () => {
    for (const { tier, type } of cases) {
      const d = dealBoard(1, tier, type);
      let run = newBoardRun(d);
      for (const cmd of playBoardOracle(d).commands) {
        run = stepBoard(d, run, cmd).run;
        const page = run.log[run.log.length - 1] as Page;
        if (!page.board?.beats?.includes('handoff') || page.board.turn) continue;
        const star = pageStars(d, run)[0];
        expect(star, `tier ${tier} ${type}: a hand-off with no star`).toBeDefined();
        // The hand-off names whoever (or wherever) the first star sends the detective to.
        const [kind, rest] = (star?.q ?? '').split(':') as [string, string];
        const who = d.kase.people.find((p) => p.id === rest.split('@')[0]);
        const text = prose(page);
        // docs/46 §1: at Medium a star is a walk, and the hand-off says only where to go.
        if (tier === 4) expect(text.toLowerCase(), `tier ${tier} ${type}`).toContain((d.kase.places.find((p) => `go ${p.id}` === star?.command)?.short ?? '\u0000').toLowerCase());
        else if ((kind === 'account' || kind === 'confront') && who) expect(text).toContain(who.short);
      }
    }
  });
});

describe('board: the thought', () => {
  it.each(cases)('every job page thinks, by name, about something held before (below Hard-boiled): tier $tier, $type', ({ tier, type }) => {
    for (let s = 1; s <= SEEDS; s++) {
      const d = dealBoard(s, tier, type);
      const names = [...d.kase.people.map((p) => p.short), ...d.kase.places.flatMap((p) => [p.short, p.street])];
      const run = playBoardOracle(d).run;
      let earlier = '';
      for (const p of run.log) {
        if (p.board && JOBS.has(p.board.job)) {
          const t = p.board.thought;
          expect(t, `seed ${s} ${p.board.q}`).toBeDefined();
          expect(t?.refs.length, `seed ${s} ${p.board.q}`).toBeGreaterThan(0);
          // docs/46 §2: at fact level (Hard-boiled) the thought stays on its own page.
          if (tier < 5) expect(names.some((n) => t?.text.includes(n) && earlier.includes(n)), `seed ${s} ${p.board.q}: ${t?.text}`).toBe(true);
        }
        earlier += prose(p);
      }
    }
  });

  it('only Raw walks the elimination to its last step; above it no thought says who is left', () => {
    let walked = 0;
    for (let s = 1; s <= 6; s++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        for (const type of typesFor(tier)) {
          const run = playBoardOracle(dealBoard(s, tier, type)).run;
          const said = run.log.some((p) => /That left one person|That left \w+, and the clock/.test(prose(p)));
          if (tier === 0) walked += said ? 1 : 0;
          else expect(said, `tier ${tier} ${type} seed ${s}`).toBe(false);
        }
      }
    }
    expect(walked).toBeGreaterThan(0);
  });

  it('above Raw, the page that settles who reads like any other: no elimination, and the report doesn’t say it’s done', () => {
    for (let s = 1; s <= 4; s++) {
      for (const tier of [1, 2, 3, 4] as TierIndex[]) {
        for (const type of typesFor(tier)) {
          const d = dealBoard(s, tier, type);
          const run = playBoardOracle(d).run;
          const report = run.log[run.log.length - 1] as Page;
          expect(prose(report), `tier ${tier} ${type} seed ${s}`).not.toMatch(/Every line had an answer|nothing on it I couldn’t fill in|I could fill in all of it|Not every line on it/);
        }
      }
    }
  });

  it('the papers name every grievance, a page each, and put nobody on top, on the page and in the notebook (docs/47 B7)', () => {
    for (let s = 1; s <= 4; s++) {
      for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
        const d = dealBoard(s, tier, 'murder');
        const run = playBoardOracle(d).run;
        const suspects = d.kase.people.filter((p) => p.role === 'suspect');
        for (const p of run.log.filter((x) => x.board?.q === 'search:papers')) {
          // The hand-off says where the night goes next; the papers themselves name everybody once.
          const papers = prose(p).replace(p.board?.handoff ?? '\u0000', '');
          expect(papers, `tier ${tier} seed ${s}`).not.toMatch(/on top\b(?!,)|the one on top/i);
          for (const x of suspects) expect(papers, `tier ${tier} seed ${s}: ${x.short}`).toContain(`${x.short}: `);
        }
        const nb = linesHeld(d.kase, run).find((l) => l.id === 'find:papers')?.text ?? '';
        for (const x of suspects) expect(nb, `tier ${tier} seed ${s} notebook`).toContain(`${x.short}: `);
      }
    }
  });

  it('the why list says each reason without the suspect’s pronoun, in an order of its own (docs/47 B7)', () => {
    let reordered = 0;
    for (let s = 1; s <= 12; s++) {
      for (const tier of [2, 5] as TierIndex[]) {
        const d = dealBoard(s, tier, 'murder');
        const fields = boardFields(d);
        const who = fields.find((f) => f.key === 'who')?.options.map((o) => o.value) ?? [];
        const why = fields.find((f) => f.key === 'why')?.options ?? [];
        expect(why.map((o) => o.value).sort()).toEqual([...who].sort());
        if (why.map((o) => o.value).join() !== who.join()) reordered++;
        for (const o of why) expect(o.label, o.label).not.toMatch(/\b(her|she|hers|herself)\b/);
      }
    }
    expect(reordered).toBe(24);
  });

  it('the level lint catches a thought that oversteps: "that left", "only … left", "cleared", who did it', () => {
    const over = ['That left one person who had heard about the key.', 'Only Corrigan was left with no true account.', 'That cleared Feeney.', 'So Corrigan took it, and nobody else could have.'];
    for (const [tier, type] of [[4, 'lost-pet'], [0, 'lost-pet']] as [TierIndex, CaseType][]) {
      const d = dealBoard(1, tier, type);
      const run = playBoardOracle(d).run;
      const culprit = d.kase.people.find((p) => p.id === d.kase.crime.culprit)?.short ?? '';
      for (const text of over) {
        const said = text.replace('Corrigan', culprit);
        const page = run.log[3] as Page;
        const bent = { ...run, log: run.log.map((p) => (p === page ? { ...p, board: { ...(p.board as NonNullable<Page['board']>), thought: { text: said, refs: [] } } } : p)) };
        // Above walk level it's caught; at Raw (walk) the elimination is the thought's to walk.
        expect(levelIssues(d, bent).length, `${tier}: ${said}`).toBe(tier === 0 ? 0 : 1);
      }
    }
  });

  it('at Hard-boiled a thought ties to nothing but its own page and the office', () => {
    for (let s = 1; s <= 6; s++) {
      for (const type of typesFor(5)) {
        const d = dealBoard(s, 5, type);
        const run = playBoardOracle(d).run;
        expect(levelIssues(d, run), `seed ${s} ${type}`).toEqual([]);
        for (const p of run.log) {
          const refs = p.board?.thought?.refs ?? [];
          for (const r of refs) expect(r.startsWith('givens') || (p.board?.told ?? []).includes(r) || r.startsWith((p.board?.q ?? '\u0000').replace(/^account:/, 'claim:').replace(/^search:/, 'find:')) || r === p.board?.q, `seed ${s} ${type} ${p.board?.q}: ${r}`).toBe(true);
        }
      }
    }
  });

  it('never names the thing that went under the coat before the board says whose it was', () => {
    for (let s = 1; s <= 8; s++) {
      const d = dealBoard(s, 4, 'lost-pet');
      const run = playBoardOracle(d).run;
      const thing = d.kase.people.find((p) => p.id === d.kase.crime.victim)?.short ?? '';
      for (const p of run.log) {
        for (const line of prose(p).split(/(?<=\.)\s/)) if (/under a coat/.test(line) && /^And /.test(line)) expect(line).not.toContain(thing);
      }
    }
  });
});

describe('board: sheets', () => {
  it('beats come in the sheet’s order', () => {
    const order = new Map(SHEETS.map((s) => [s.id, s.paras.flat()]));
    for (const { tier, type } of cases) {
      const run = playBoardOracle(dealBoard(2, tier, type)).run;
      for (const p of run.log) {
        const sheet = (p.board?.sheet ?? '').split('+')[0] as string;
        const want = order.get(sheet);
        if (!want) continue;
        const got = (p.board?.beats ?? []).filter((b) => want.includes(b as never));
        const idx = got.slice(0, want.length).map((b) => want.indexOf(b as never));
        const firstSheet = idx.slice(0, (p.board?.beats ?? []).indexOf('chapter') >= 0 ? (p.board?.beats ?? []).indexOf('chapter') : idx.length);
        expect([...firstSheet].sort((a, b) => a - b), `${sheet}: ${got.join(', ')}`).toEqual(firstSheet);
      }
    }
  });

  it('the office says one quoted line a paragraph', () => {
    for (const { tier, type } of cases) {
      const d = dealBoard(1, tier, type);
      const office = newBoardRun(d).log[0] as Page;
      const lines = d.kase.givens.lines ?? [];
      // Each line of the givens, and each of the detective's questions, is a paragraph of its own.
      const paras = office.blocks.filter((b) => b.kind === 'prose');
      expect(paras.length).toBeGreaterThanOrEqual(lines.length + 2);
      for (const b of paras) {
        if (b.kind !== 'prose') continue;
        // Two speakers never share a paragraph: the detective's questions stand alone.
        const opens = (b.text.match(/“/g) ?? []).length;
        if (/^“(And when|When|Who)/.test(b.text)) expect(opens).toBe(1);
      }
    }
  });
});

describe('board: reactions are never a tell', () => {
  it('a reaction is drawn by manner and job alone', () => {
    for (const card of familyCards('reaction')) expect(Object.keys(card.tags).sort()).toEqual(['job', 'manner']);
  });

  it('liars and the truthful of one manner draw from one pool', () => {
    const pools = new Map<string, Set<string>>();
    const reactions = new Set(familyCards('reaction').map((c) => c.id));
    for (let s = 1; s <= 20; s++) {
      const d = dealBoard(s, 4, 'murder');
      const run = playBoardOracle(d).run;
      for (const p of run.log) {
        if (p.board?.job !== 'account') continue;
        const who = p.board.q?.slice('account:'.length) ?? '';
        const lies = d.kase.lies.some((l) => l.person === who);
        const ids = p.cardsUsed.filter((x) => reactions.has(x));
        const manner = mannerOf(d.kase, who);
        for (const id of ids) {
          const card = familyCards('reaction').find((c) => c.id === id);
          // The card fits the manner, whoever is speaking.
          expect([manner, 'any']).toContain(card?.tags.manner);
          const k = `${manner}|${lies}`;
          pools.set(k, new Set([...(pools.get(k) ?? []), id]));
        }
      }
    }
    expect(pools.size).toBeGreaterThan(0);
  });
});

describe('board: the walk', () => {
  it('distances are the same both ways and in five-minute steps', () => {
    for (let s = 1; s <= 5; s++) {
      const c = dealBoard(s, 4).kase;
      for (const a of c.places) {
        for (const b of c.places) {
          if (a.id === b.id) continue;
          const x = walkBetween(c, a.id, b.id);
          expect(x.minutes % 5).toBe(0);
          expect(walkBetween(c, b.id, a.id).minutes).toBe(x.minutes);
        }
      }
    }
  });
});

describe('board: a name twice at most a page (docs/39 §4)', () => {
  it.each(cases)('nobody is named more than twice on a page, outside a list or an account: tier $tier, $type', ({ tier, type }) => {
    for (let s = 1; s <= SEEDS; s++) {
      const d = dealBoard(s, tier, type);
      for (const p of playBoardOracle(d).run.log) {
        const exempt = (b: Page['blocks'][number]) =>
          b.kind === 'prose' && ((b.voice === 'answer' && (p.board?.job === 'account' || p.board?.job === 'list')) || (b.voice === 'recap' && b.text === p.board?.recap));
        expect(namesOverTwo(d.kase, p.blocks, exempt), `seed ${s} page ${p.n + 1}`).toEqual([]);
      }
    }
  });

  it('thins a third mention to a pronoun only when it is clear', () => {
    const d = dealBoard(12, 1, 'murder');
    const blocks: Page['blocks'] = [
      { kind: 'prose', voice: 'narrator', text: 'I’d come for Whitfield, and he was here. I sat one seat over.' },
      { kind: 'prose', voice: 'exchange', text: '“Mr. Whitfield. Where were you tonight?” Whitfield said he would tell me once.' },
    ];
    thinNames(d.kase, blocks, () => false);
    expect(blocks[1]?.kind === 'prose' ? blocks[1].text : '').toContain('He said he would tell me once.');
  });
});

describe('board: a clue is said at most twice a night', () => {
  it('the side remark is pointed at, not repeated: the thought gives the street, not the words', () => {
    const run = playBoardOracle(dealBoard(1, 4, 'lost-pet')).run;
    const all = run.log.map((p) => prose(p)).join('\n');
    expect((all.match(/going fast, no hat/g) ?? []).length).toBe(1);
    // (docs/49, Planner 2: the street's lead and its link are one sentence, after the agreement's "but".)
    expect(all).toMatch(/[Tt]he part worth keeping came last: Stuyvesant Street was where Prentiss kept Duchess\./);
    expect((all.match(/under a coat/g) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('after a hand-off that named them, the next page turns to them without a signpost (docs/47 C13)', () => {
    let seen = 0;
    for (let s = 1; s <= 6; s++) {
      for (const tier of [0, 1, 2] as TierIndex[]) {
        const d = dealBoard(s, tier, 'lost-pet');
        const run = playBoardOracle(d).run;
        run.log.forEach((p, i) => {
          const next = run.log[i + 1];
          const who = next?.board?.q?.startsWith('account:') ? d.kase.people.find((x) => x.id === next.board?.q?.slice(8)) : undefined;
          if (!who || !p.board?.handoff?.includes(who.short) || next?.board?.job !== 'account' || p.board.job === 'arrive') return;
          seen++;
          // The reason was the hand-off's: this page carries it, and says neither it nor "So, Corrigan." again.
          expect(next.board?.carried, prose(next)).toBe(true);
          expect(next.board?.beats ?? []).not.toContain('why');
          expect(prose(next)).not.toMatch(/^(So, |Which brought me to |Next, |On to )/);
        });
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('board: the generator’s nits (docs/44)', () => {
  it('no two people in a case share a first name', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 12; s++) {
        const c = dealBoard(s, tier, type).kase;
        const given = c.people.filter((p) => !p.object && !/^Mrs\./.test(p.name)).map((p) => p.name.replace(/^(Mr\.|Mrs\.) /, '').split(' ')[0]);
        expect(new Set(given).size, `tier ${tier} ${type} seed ${s}: ${given.join(', ')}`).toBe(given.length);
      }
    }
  });

  it('a stage has plays and shows, never pictures', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 20; s++) {
        const d = dealBoard(s, tier, type);
        const stage = d.kase.places.filter((p) => p.stage).map((p) => p.id);
        if (stage.length === 0) continue;
        for (const a of d.kase.accounts) for (const cl of Object.values(a.claims)) if (stage.includes(cl.place)) expect(cl.reason ?? '').not.toMatch(/picture/);
        const run = playBoardOracle(d).run;
        for (const p of run.log) if (stage.includes(p.at)) expect(prose(p), `tier ${tier} seed ${s}`).not.toMatch(/\bpictures?\b/);
      }
    }
  });

  it('a watcher says a standing fact once, not every hour', () => {
    for (let s = 1; s <= 20; s++) {
      const run = playBoardOracle(dealBoard(s, 4, 'lost-pet')).run;
      for (const p of run.log) if (p.board?.job === 'list') expect((prose(p, 'answer').match(/telling the room about/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });

  it('nobody stays till an hour and then goes somewhere at it', () => {
    for (const { tier, type } of cases) {
      for (let s = 1; s <= 6; s++) {
        const run = playBoardOracle(dealBoard(s, tier, type)).run;
        for (const p of run.log) if (p.board?.job === 'account') expect(prose(p, 'answer')).not.toMatch(/till (\w+)[^.]*\.[^.]*\bat \1\b/);
      }
    }
  });

  it('the report asks why, and the path says it: every small case’s culprit has a reason in the office', () => {
    for (const { tier, type } of cases) {
      if (type === 'murder') continue;
      for (let s = 1; s <= 12; s++) {
        const c = dealBoard(s, tier, type).kase;
        const culprit = c.people.find((p) => p.id === c.crime.culprit);
        const office = c.givens.text.join(' ');
        expect(office, `tier ${tier} ${type} seed ${s}`).toContain(culprit?.short ?? '?');
        expect(c.givens.lines?.some((g) => g.kind === 'aside' || (g.kind === 'pointer' && c.givens.pointer === c.crime.culprit))).toBe(true);
      }
    }
  });
});
