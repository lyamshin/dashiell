/**
 * docs/67: hints. No star appears on a page by itself; a Hint button gives one: unlimited at Raw,
 * three at Coddled, one at Poached, none from Soft-boiled up. A hinted step stays starred until it's
 * taken; a tie between suspects the evidence treats the same goes to the first by name; with nothing
 * left to find a hint says the case can be closed (at Raw, with the elimination the walk thought used
 * to say). The verdict says how many were taken, a perfect report earns a star and a perfect one with
 * no hints a gold star, and the profile counts both. The CLI has `hint`, and a save replays its hints.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices, pageStars } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { HINTS_A_NIGHT, hasHints, hintLabel, hintsLeft, hintsLine, hintsNote, hintsUsed, takeHint } from '../src/game/board/hints.js';
import { levelIssues } from '../src/game/board/lint.js';
import { dealBoard, thoughtLevel, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { bestAt, emptyProfile, goldsAt, recordRun, sanitizeProfile, starsAt } from '../src/game/board/profile.js';
import { scoreBoard, tallyWords, truthReport } from '../src/game/board/report.js';
import { completions, hintStep, isOpen, reportReady, sameStanding, starCommand, starReason, starredSteps } from '../src/game/board/stars.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { FACE_MARK } from '../src/game/board/grid.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

const TIERS = [0, 1, 2, 3, 4, 5] as TierIndex[];

/** A hint, which must work. */
function hinted(d: BoardDeal, run: BoardRun): { run: BoardRun; said: Exclude<ReturnType<typeof takeHint>, { error: string }>['said'] } {
  const h = takeHint(d, run);
  if ('error' in h) throw new Error(h.error);
  return h;
}

/** The prose a page shows, every block. */
const prose = (run: BoardRun): string => run.log.map((p) => p.blocks.map((b) => b.text).join('\n')).join('\n');

describe('docs/67 §1: no star by itself; a hint gives one', () => {
  it('no star on any page without a hint, at every tier, along the oracle’s route, the hint-taker’s without its hints, and the first choices', () => {
    const firstChoices = (d: BoardDeal): string[] => {
      const out: string[] = [];
      let run = newBoardRun(d);
      for (let i = 0; i < 20 && !run.reportOpen; i++) {
        const ch = boardChoices(d, run).flatMap((g) => [...g.choices, ...(g.more ?? [])]).find((x) => !x.done && !/^(?:picker|file|recap)/.test(x.command) && x.command !== 'go office');
        if (!ch) break;
        const r = stepBoard(d, run, ch.command);
        if (r.error) break;
        out.push(ch.command);
        run = r.run;
      }
      return out;
    };
    for (const tier of TIERS) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 3; s++) {
          const d = dealBoard(s, tier, type);
          for (const commands of [playBoardOracle(d).commands, playReader(d, s).commands.filter((x) => x !== 'hint'), firstChoices(d)]) {
            let run = newBoardRun(d);
            for (const cmd of ['', ...commands]) {
              if (cmd) run = stepBoard(d, run, cmd).run;
              if (run.reportOpen) break;
              expect(pageStars(d, run), `${d.kase.id} ${cmd}`).toEqual([]);
              for (const g of boardChoices(d, run)) for (const ch of [...g.choices, ...(g.more ?? [])]) expect(ch.lead, `${d.kase.id} ${ch.command}`).toBe(false);
            }
          }
        }
      }
    }
  });

  it('one hint stars one choice, an open step on a cheapest way, never the client, with its reason', () => {
    for (const tier of [0, 1, 2] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 4; s++) {
          const d = dealBoard(s, tier, type);
          let run = newBoardRun(d);
          for (const cmd of ['', ...playBoardOracle(d).commands]) {
            if (cmd) run = stepBoard(d, run, cmd).run;
            if (run.reportOpen || hintsLeft(run) === 0) break;
            if (pageStars(d, run).length > 0) continue;
            const before = pageStars(d, run).length;
            const h = hinted(d, run);
            if (h.said.kind !== 'step') continue;
            const stars = pageStars(d, h.run);
            expect(stars.length, `${d.kase.id} p${run.log.length}`).toBe(before + 1);
            const st = stars.find((x) => x.q === h.said.q);
            expect(st, `${d.kase.id} ${h.said.q}`).toBeDefined();
            expect(st?.command).not.toContain(d.kase.client);
            expect(isOpen(d.kase, h.run, h.said.q as string)).toBe(true);
            const ways = completions(d, h.run).flat();
            if (ways.length) expect(ways.includes(h.said.q as string) || (h.said.q as string).startsWith('account:'), `${d.kase.id} ${h.said.q}`).toBe(true);
            expect(st?.why.length).toBeGreaterThan(0);
            expect(st?.why).not.toMatch(/\bclear|\bleft\b|\bdid it\b|\bguilty\b|\bbreaks?\b|\bwill (show|say|tell)\b|\blying\b|\blie\b/i);
            expect(h.said.text).toContain(st?.why.split(' — ')[0] as string);
            // It costs no action and writes no page.
            expect(h.run.used).toBe(run.used);
            expect(h.run.log.length).toBe(run.log.length);
            // The book's choices star it.
            expect(boardChoices(d, h.run).some((g) => [...g.choices, ...(g.more ?? [])].some((ch) => ch.lead))).toBe(true);
            break;
          }
        }
      }
    }
  });

  it('counts by tier: unlimited at Raw, three at Coddled, one at Poached, and the button gone from Soft-boiled up', () => {
    expect(HINTS_A_NIGHT).toEqual([Infinity, 3, 1, 0, 0, 0]);
    expect(TIERS.map(hasHints)).toEqual([true, true, true, false, false, false]);
    for (const tier of TIERS) {
      const d = dealBoard(5, tier, 'murder');
      let run = newBoardRun(d);
      if (!hasHints(tier)) {
        expect(takeHint(d, run)).toHaveProperty('error');
        expect(stepBoard(d, run, 'hint').error).toMatch(/no hints/);
        expect(hintsLine(run)).toBeNull();
        continue;
      }
      // Spent on the oracle's route, a hint before every step, until none are left.
      const allowed = HINTS_A_NIGHT[tier] as number;
      expect(hintLabel(run)).toBe(allowed === Infinity ? 'Hint' : `Hint (${allowed} left)`);
      for (const cmd of playBoardOracle(d).commands) {
        if (hintsLeft(run) > 0) {
          const h = takeHint(d, run);
          if (!('error' in h)) run = h.run;
        }
        run = stepBoard(d, run, cmd).run;
      }
      if (allowed !== Infinity) {
        expect(hintsUsed(run)).toBe(allowed);
        expect(hintsLeft(run)).toBe(0);
        expect(hintLabel(run)).toBe('Hint (none left)');
        expect(takeHint(d, run)).toEqual({ error: 'No hints left tonight.' });
      } else expect(hintsUsed(run)).toBeGreaterThan(3);
    }
  });

  it('the first page says tonight’s count; Soft-boiled says there are none from here on; Medium and Hard-boiled nothing (round 7, U4: the mark line waits for the first coat)', () => {
    const note = (tier: TierIndex) => hintsNote(dealBoard(4, tier, 'murder'), newBoardRun(dealBoard(4, tier, 'murder')));
    expect(TIERS.map(note)).toEqual(['Hints are unlimited tonight.', 'You have three hints tonight.', 'You have one hint tonight.', 'No hints from here on.', null, null]);
    void FACE_MARK;
    const d = dealBoard(4, 0, 'murder');
    expect(hintsNote(d, stepBoard(d, newBoardRun(d), 'go scene').run)).toBeNull();
  });

  it('a hinted step stays starred until it’s taken, and a player never pays twice for it', () => {
    const d = dealBoard(11, 1, 'lost-item');
    let run = newBoardRun(d);
    const h = hinted(d, run);
    expect(h.said.kind).toBe('step');
    run = h.run;
    const q = h.said.q as string;
    const left = hintsLeft(run);
    // Walk somewhere else and back: still starred.
    for (const cmd of playBoardOracle(d).commands) {
      if (run.asked.includes(q)) break;
      expect(starredSteps(d, run), cmd).toContain(q);
      run = stepBoard(d, run, cmd).run;
    }
    expect(run.asked).toContain(q);
    expect(starredSteps(d, run)).not.toContain(q);
    expect(hintsLeft(run)).toBe(left);
  });

  it('pressing again gives the next step at Raw, and says the starred one again for free when nothing new can be starred', () => {
    const d = dealBoard(11, 0, 'lost-item');
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list', 'go bar']) run = stepBoard(d, run, cmd).run;
    const a = hinted(d, run);
    const b = hinted(d, a.run);
    expect(a.said.q).not.toBe(b.said.q);
    expect(hintsUsed(b.run)).toBe(2);
    expect(pageStars(d, b.run).map((x) => x.q)).toEqual(expect.arrayContaining([a.said.q, b.said.q]));
    // Nothing new on the cheapest ways from here: free, and nothing recorded.
    let r = b.run;
    for (let i = 0; i < 6; i++) {
      const h = hinted(d, r);
      if (h.said.kind === 'again') {
        expect(h.said.spent).toBe(false);
        expect(h.run).toBe(r);
        expect(h.said.text).toMatch(/^The starred choices? (?:is|are) still your best next steps?\./);
        return;
      }
      r = h.run;
    }
    throw new Error('never ran out of new steps');
  });

  it('a hint never picks out one of several suspects with the same standing: the first by name (docs/65 §4)', () => {
    let ties = 0;
    for (const tier of [0, 1, 2] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 8; s++) {
          const d = dealBoard(s, tier, type);
          let run = newBoardRun(d);
          for (const cmd of ['', ...playBoardOracle(d).commands]) {
            if (cmd) run = stepBoard(d, run, cmd).run;
            if (run.reportOpen) break;
            const q = hintStep(d, run, []);
            if (!q?.startsWith('account:')) continue;
            const group = sameStanding(d.kase, run, q.slice(8));
            if (group.length < 2) continue;
            ties++;
            // The first of the group by name a star can sit on from here: never chosen by whose evening the cheapest way needs.
            expect(q.slice(8), `${d.kase.id} ${q} of ${group.join(',')}`).toBe(group.find((p) => starCommand(d, run, `account:${p}`) !== null));
          }
        }
      }
    }
    expect(ties).toBeGreaterThan(5);
  });

  it('Raw 11: after Mrs. Kowalski’s list, the hint names Bellucci and Steinbach together and stars the first by name', () => {
    const d = dealBoard(11, 0, 'lost-item');
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list']) run = stepBoard(d, run, cmd).run;
    const h = hinted(d, run);
    expect(h.said.q).toBe('account:bellucci');
    expect(h.said.text).toBe('Hint: Bellucci and Steinbach could have had the spare key, and nobody had said where either of them was at ten — ask them where they were.');
    expect(pageStars(d, h.run).map((x) => x.command)).toEqual(['go bar']);
  });
});

describe('docs/67 §1: the hint when the report is ready, and on the report page', () => {
  it('says the case can be closed, once for the count, and at Raw the elimination the walk thought used to say', () => {
    for (const tier of [0, 1, 2] as TierIndex[]) {
      const d = dealBoard(2, tier, 'lost-pet');
      const o = playBoardOracle(d);
      let run = newBoardRun(d);
      for (const cmd of o.commands) run = stepBoard(d, run, cmd).run;
      expect(reportReady(d, run)).toBe(true);
      expect(completions(d, run)).toEqual([]);
      const h = hinted(d, run);
      expect(h.said.kind).toBe('ready');
      expect(h.said.text.startsWith('You have what you need to close the case.')).toBe(true);
      if (tier === 0) expect(h.said.text).toMatch(/That left one person who .+, with nobody to back up where they were at (?:nine|ten|eleven)\.$/);
      else expect(h.said.text).toBe('You have what you need to close the case.');
      expect(pageStars(d, h.run)).toEqual([]);
      // Poached's one hint is spent; elsewhere, asking again is free and says the same.
      if (hintsLeft(h.run) === 0) {
        expect(takeHint(d, h.run)).toEqual({ error: 'No hints left tonight.' });
        continue;
      }
      const again = hinted(d, h.run);
      expect(again.said.spent).toBe(false);
      expect(hintsUsed(again.run)).toBe(1);
      // The report page: the report can be filled from what you have.
      const filed = stepBoard(d, again.run, 'file').run;
      expect(hinted(d, filed).said.text.startsWith('You can fill in the report from what you have.')).toBe(true);
    }
  });

  it('on the report page, names what’s still missing', () => {
    const d = dealBoard(2, 0, 'lost-pet');
    const run = stepBoard(d, stepBoard(d, newBoardRun(d), 'go scene').run, 'file').run;
    const h = hinted(d, run);
    expect(h.said.kind).toBe('step');
    expect(h.said.text).toMatch(/^Still missing: .+\.$/);
    expect(h.said.text).toContain(starReason(d.kase, h.run, h.said.q as string));
    expect(stepBoard(d, h.run, 'go scene').error).toBeDefined();
  });

  it('out of reach of a cheapest way, it gives the designed path’s next open step: a hint always gives something', () => {
    for (const tier of [0, 1] as TierIndex[]) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 6; s++) {
          const d = dealBoard(s, tier, type);
          const w = playWanderer(d, s);
          let run = newBoardRun(d);
          for (const p of w.run.log.slice(1)) {
            if (run.reportOpen) break;
            const q = p.board?.q;
            const cmd = !q ? (p.board?.job === 'arrive' ? `go ${p.at}` : '') : q.startsWith('account:') ? `ask ${q.slice(8)} evening` : q.startsWith('list:') ? `ask ${q.slice(5)} list` : q.startsWith('search:') ? `search ${q.slice(7)}` : q.startsWith('motive:') ? `ask ${q.slice(7)} motive` : '';
            if (!cmd) continue;
            const r = stepBoard(d, run, cmd);
            if (r.error) continue;
            run = r.run;
            if (run.reportOpen || reportReady(d, run)) continue;
            const h = takeHint(d, run);
            expect('error' in h ? h.error : h.said.kind, `${d.kase.id} p${run.log.length}`).toBe('step');
          }
        }
      }
    }
  });
});

describe('docs/67 §2: what comes off the pages', () => {
  it('no hand-off, no turn’s what-next, no stars read out, no walk thought, at any tier', () => {
    for (const tier of TIERS) {
      for (const type of typesFor(tier)) {
        for (let s = 1; s <= 3; s++) {
          const d = dealBoard(s, tier, type);
          for (const run of [playBoardOracle(d).run, playReader(d, s).run]) {
            const text = prose(run);
            expect(text, d.kase.id).not.toMatch(/I could (?:face|put it to) |Before I did anything about it|The next place worth the walk|would move it\.|That left\b/);
            for (const p of run.log) {
              expect(p.board?.handoff, `${d.kase.id} p${p.n + 1}`).toBeUndefined();
              const last = p.blocks.filter((b) => b.kind === 'prose').pop();
              // A page may end on its scene, never on a line that leads into something that isn't there.
              if (last) expect(last.text, `${d.kase.id} p${p.n + 1}`).not.toMatch(/(?::|—|,|\band|\bor)\s*$/);
            }
            expect(levelIssues(d, run), d.kase.id).toEqual([]);
          }
        }
      }
    }
  });

  it('Raw thinks at the link, like Coddled', () => {
    expect(TIERS.map((t) => thoughtLevel({ tier: t }))).toEqual(['link', 'link', 'link', 'link', 'link', 'fact']);
  });
});

describe('docs/67 §3: the verdict’s star, gold star and hint count', () => {
  it('a perfect report with no hints is gold; with a hint a star; a wrong one neither; the hints beside the actions', () => {
    const d = dealBoard(2, 1, 'lost-pet');
    const o = playBoardOracle(d);
    const filed = stepBoard(d, o.run, 'file').run;
    const truth = truthReport(d, filed);
    const gold = scoreBoard(d, filed, truth);
    expect(gold.outcome).toBe('solved');
    expect(gold).toMatchObject({ star: 'gold', hints: 0, tally: `${filed.used} actions, no hints.` });
    let run = newBoardRun(d);
    run = hinted(d, run).run;
    for (const cmd of o.commands) run = stepBoard(d, run, cmd).run;
    run = hinted(d, run).run;
    run = stepBoard(d, run, 'file').run;
    const star = scoreBoard(d, run, truthReport(d, run));
    expect(star).toMatchObject({ star: 'star', hints: 2, tally: `${run.used} actions, 2 hints.` });
    const wrong = scoreBoard(d, run, { ...truthReport(d, run), who: d.kase.people.find((p) => p.role === 'suspect' && p.id !== d.kase.crime.culprit)?.id ?? null });
    expect(wrong.star).toBeNull();
    expect(wrong.tally).toBe(`${run.used} actions, 2 hints.`);
  });

  it('from Soft-boiled up every perfect report is gold, and the tally says nothing of hints', () => {
    const d = dealBoard(3, 3, 'murder');
    const o = playBoardOracle(d);
    const filed = stepBoard(d, o.run, 'file').run;
    expect(scoreBoard(d, filed, truthReport(d, filed))).toMatchObject({ star: 'gold', tally: `${filed.used} actions.` });
    expect(tallyWords(0, 1, 1)).toBe('1 action, 1 hint.');
  });
});

describe('docs/67 §3: the profile counts stars and gold stars per tier', () => {
  it('a star for every perfect report, a gold one for a perfect report with no hints, and each tier’s best', () => {
    let p = emptyProfile();
    p = recordRun(p, { tier: 0, points: 4, asked: 4, actionsUsed: 10, par: 7, hints: 3 }).profile;
    expect([starsAt(p, 0), goldsAt(p, 0), bestAt(p, 0)]).toEqual([1, 0, 'star']);
    p = recordRun(p, { tier: 0, points: 3, asked: 4, actionsUsed: 10, par: 7 }).profile;
    expect([starsAt(p, 0), goldsAt(p, 0)]).toEqual([1, 0]);
    p = recordRun(p, { tier: 0, points: 4, asked: 4, actionsUsed: 8, par: 7, hints: 0 }).profile;
    expect([starsAt(p, 0), goldsAt(p, 0), bestAt(p, 0)]).toEqual([2, 1, 'gold']);
    p = recordRun(p, { tier: 3, points: 5, asked: 5, actionsUsed: 14, par: 13 }).profile;
    expect(bestAt(p, 3)).toBe('gold');
    expect(bestAt(p, 1)).toBeNull();
    // Kept through the store's sanitizing, never more golds than clears, never on an uncleared tier.
    expect(sanitizeProfile(JSON.parse(JSON.stringify(p))).golds).toEqual({ 0: 1, 3: 1 });
    expect(sanitizeProfile({ version: 1, cleared: [0], clears: { 0: 1 }, golds: { 0: 5, 2: 1 }, runs: 1, wins: 1 }).golds).toEqual({ 0: 1 });
  });
});

describe('docs/67 §4: explaining it', () => {
  it('“How this works” has the hint line, and the help says what a hint and a star are', () => {
    expect(BOARD_TEACH_LINES).toContain('Stuck? The Hint button shows you a good next step and why. You get fewer as the cases get harder.');
    expect(BOARD_RULES).toContain('The Hint button stars a choice worth taking now and says why. A perfect report earns a star; a perfect one with no hints, a gold star.');
    expect(BOARD_RULES.join(' ')).not.toMatch(/A star marks/);
  });
});

/** A CLI on a save in memory. */
function cliFor(seed: number, tier: TierIndex, type: string) {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  const run = (...args: string[]) => runPlay([...args, '--save', 's'], io);
  run('new', '--seed', String(seed), '--tier', String(tier), '--type', type, '--no-teach');
  return { run, save: () => JSON.parse(files.get('s') as string) as { events: unknown[] }, files };
}

describe('docs/67 §5: the CLI and the save', () => {
  it('`hint` prints the starred choice with its reason and the hints left; `look` stars it and counts them', () => {
    const cli = cliFor(11, 1, 'lost-item');
    const first = cli.run('look').out;
    expect(first).toContain('You have three hints tonight. `hint` stars a good next step and says why.');
    const h = cli.run('hint');
    expect(h.code).toBe(0);
    expect(h.out).toMatch(/^HINT\n\nHint: .+\.\n\n\s+\d+\. \* .+/);
    expect(h.out).toContain('Hints: 2 left (`hint`).');
    expect(cli.save().events).toEqual([{ do: 'hint' }]);
    const look = cli.run('look').out;
    expect(look).toMatch(/\n\s+\d+\. \* /);
    expect(look).toContain('Hints: 2 left (`hint`).');
    // Soft-boiled: no hints, and `hint` says so.
    const sb = cliFor(5, 3, 'murder');
    expect(sb.run('look').out).toContain('No hints from here on.');
    expect(sb.run('look').out).not.toContain('`hint`');
    expect(sb.run('hint')).toEqual({ out: 'There are no hints at Soft-boiled.', code: 1 });
  });

  it('a save replayed with hints gives the same stars, and the verdict counts them', () => {
    const d = dealBoard(2, 0, 'lost-pet');
    const cli = cliFor(2, 0, 'lost-pet');
    cli.run('hint');
    cli.run('do', '1');
    cli.run('hint');
    const before = cli.run('look').out;
    // A fresh read of the same save is the same night, stars and all.
    expect(cli.run('look').out).toBe(before);
    expect(cli.save().events.filter((e) => JSON.stringify(e) === '{"do":"hint"}').length).toBe(2);
    // Play out the oracle's route and close the case on the truth.
    let run = newBoardRun(d);
    for (const e of cli.save().events as { do?: string }[]) if (e.do) run = e.do === 'hint' ? hinted(d, run).run : stepBoard(d, run, e.do).run;
    expect(hintsUsed(run)).toBe(2);
    const verdict = cli.run('close', 'who=1; proof=hunch');
    expect(verdict.out).toMatch(/\d+ actions?, 2 hints\./);
  });

  it('the help names `hint`, and the teach page says it as the CLI has it', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
    expect(runPlay(['help'], io).out).toContain('  hint (stars a good next step and says why; unlimited at Raw, three at Coddled, one at Poached, none after)');
    expect(runPlay(['help'], io).out).toContain('The `hint` command stars a choice worth taking now and says why.');
    const out = runPlay(['new', '--seed', '3', '--tier', '0', '--save', 'n'], io).out;
    expect(out).toContain('Stuck? The `hint` command shows you a good next step and why.');
  });
});
