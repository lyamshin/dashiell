/**
 * docs/47: what the third round of blind playtests found, held to.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, boardGridText } from '../src/game/board/grid.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playWanderer } from '../src/game/board/oracle.js';
import { proseIssues } from '../src/game/board/prose-lint.js';
import { boardFields, breakOptions, breakOptionsShown, scoreBoard, storyOfBoard } from '../src/game/board/report.js';
import { spokenAccount } from '../src/game/board/tell.js';
import { costText } from '../src/game/board/text.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import type { Page } from '../src/game/board/types.js';

const prose = (p: Page) => p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n');

describe('round 3: the interface (docs/47 A)', () => {
  it('every choice says nothing or "free" (docs/64: one action is the rule), never minutes', () => {
    for (const tier of [0, 2, 4] as TierIndex[]) {
      const d = dealBoard(3, tier);
      let run = newBoardRun(d);
      for (const cmd of playBoardOracle(d).commands.slice(0, 6)) {
        for (const g of boardChoices(d, run)) for (const ch of [...g.choices, ...(g.more ?? [])]) expect(costText(ch)).toMatch(/^(|free|free to reread|free to open)$/);
        run = stepBoard(d, run, cmd).run;
      }
    }
  });

  it('the walk says how far, never how many minutes', () => {
    for (let s = 1; s <= 8; s++) {
      for (const tier of [0, 3, 5] as TierIndex[]) {
        const run = playBoardOracle(dealBoard(s, tier)).run;
        for (const p of run.log) for (const b of p.blocks) if (b.kind === 'prose' && b.voice === 'establish') expect(b.text, b.text).not.toMatch(/\b(?:five|ten|fifteen|twenty|twenty-five|thirty|thirty-five|forty) minutes\b|quarter of an hour|half an hour/);
      }
    }
  });

  it('the verdict says what it scored, and the key to the marks is on the first page only', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, x) => void files.set(p, x) };
    const first = runPlay(['new', '--seed', '7', '--tier', '0', '--save', 's.json', '--no-teach'], io).out;
    expect(first.replace(/\s+/g, ' ')).toContain('A star marks a good next step');
    const d = dealBoard(7, 0);
    const second = runPlay(['do', '1', '--save', 's.json'], io).out;
    expect(second.replace(/\s+/g, ' ')).not.toContain('A star marks a good next step');
    const o = playBoardOracle(d);
    const v = scoreBoard(d, o.run, o.report);
    // (Round 6, P11: plainly, and what counts with it.)
    expect(v.scoreLine).toMatch(/^4 out of 4: who, when, (how|where) and why, with the proof for who( and for where)?\.$/);
  });

  it('the breaks list puts the lines that touch the named person’s story first, and keeps every line', () => {
    let touched = 0;
    for (let s = 1; s <= 8; s++) {
      const d = dealBoard(s, 4);
      const run = playBoardOracle(d).run;
      const all = breakOptions(d, run, d.kase.crime.culprit);
      const shown = breakOptionsShown(d, run, d.kase.crime.culprit);
      expect(shown.map((o) => o.value).sort()).toEqual(all.map((o) => o.value).sort());
      const n = shown.filter((o) => o.touches).length;
      expect(shown.slice(0, n).every((o) => o.touches)).toBe(true);
      touched += n > 0 ? 1 : 0;
    }
    expect(touched).toBeGreaterThan(4);
  });

  it('the grid has the dead man’s row, ✓ only on two sources, and the window narrows with a sighting', () => {
    for (let s = 1; s <= 6; s++) {
      const d = dealBoard(s, 5, 'murder');
      const run = playBoardOracle(d).run;
      const g = boardGrid(d.kase, run);
      expect(g.rows[0]?.victim).toBe(true);
      for (const r of g.rows) for (const h of g.hours) {
        const cell = r.cells[h];
        if (cell?.confirmed) expect(cell.seen, `${r.name} ${h}`).toBeDefined();
      }
      // An hour the dead man's row puts him away from the scene is no longer one it could have been.
      const v = g.rows[0];
      for (const h of g.window) expect(v?.cells[h]?.seen && v.cells[h]?.seen?.place !== d.kase.crime.scene).toBeFalsy();
    }
  });

  it('pencil takes "ten" as well as "10", and the mark shows beside what the cell holds', () => {
    const files = new Map<string, string>();
    const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, x) => void files.set(p, x) };
    runPlay(['new', '--seed', '14', '--tier', '4', '--type', 'lost-pet', '--save', 'p.json', '--no-teach'], io);
    const d = dealBoard(14, 4, 'lost-pet');
    for (const cmd of playBoardOracle(d).commands.slice(0, 4)) runPlay(['do', cmd, '--save', 'p.json'], io);
    const suspect = d.kase.people.find((p) => p.role === 'suspect')?.short as string;
    const scene = d.kase.places.find((p) => p.scene)?.short as string;
    const words = runPlay(['pencil', `${suspect} ten at ${scene}`, '--save', 'p.json'], io);
    expect(words.code, words.out).toBe(0);
    expect(words.out).toContain('Your guess:');
    expect(words.out).toMatch(/~flat/);
    const digits = runPlay(['pencil', `${suspect} 10 clear`, '--save', 'p.json'], io);
    expect(digits.code, digits.out).toBe(0);
  });
});

describe('round 3: the puzzle and its facts (docs/47 B)', () => {
  it('a lost pet is "he" or "she" on the form, and comes home in the ending', () => {
    const d = dealBoard(14, 4, 'lost-pet');
    const labels = boardFields(d).map((f) => f.label).join(' / ');
    expect(labels).not.toMatch(/\bit\b/);
    const o = playBoardOracle(d);
    const v = scoreBoard(d, o.run, o.report);
    expect(v.closing.join(' ')).toMatch(/was back in (his|her) /);
  });

  it('nobody is talkable before a page has put them in the room', () => {
    for (let s = 1; s <= 10; s++) {
      for (const tier of [2, 4] as TierIndex[]) {
        const d = dealBoard(s, tier);
        for (const run of [playBoardOracle(d).run, playWanderer(d, s).run] as BoardRun[]) {
          // A company witness asked on page i was put in that room by an earlier page there: the
          // arrival, or the line that placed them when the answer named them.
          run.log.forEach((p, i) => {
            const who = d.kase.people.find((x) => x.role === 'company' && p.board?.q === `account:${x.id}`);
            if (!who) return;
            const before = run.log.slice(0, i).filter((x) => x.at === p.at).map(prose).join('\n');
            expect(before, `tier ${tier} seed ${s}: ${who.short}`).toMatch(new RegExp(`${who.short}|my witness`));
          });
        }
      }
    }
  });

  it('an evening never eats supper twice, and says being alone in the clause of that hour (docs/62, P7)', () => {
    for (let s = 1; s <= 30; s++) {
      for (const tier of [2, 5] as TierIndex[]) {
        const c = dealBoard(s, tier).kase;
        for (const a of c.accounts) {
          const said = spokenAccount(c, a, 'plain').join(' ');
          expect((said.match(/\bfor (?:the blue-plate )?supper\b/g) ?? []).length, said).toBeLessThanOrEqual(1);
          // (docs/62, P7: never tacked on after the evening as a sentence of its own, "Alone at nine.",
          // "On my own at seven, eight and ten."; each hour alone says so in its own clause, once.)
          expect(said, said).not.toMatch(/(?:^|[.!?] )(?:Alone|On my own|By myself) at (?:seven|eight|nine|ten|eleven)\b/);
          expect(said, said).not.toMatch(/(?:on my own|by myself|alone)[^.]*\b(?:on my own|by myself|alone)\b/);
          expect(said).not.toMatch(/hadn’t eaten|met my sister|a lodger\b|sick friend/);
        }
      }
    }
  });

  it('the story says home, and the cup the scene had', () => {
    const d = dealBoard(5, 2, 'murder');
    expect(storyOfBoard(d).join(' ')).toMatch(/went into his (cocoa|drink|rye)/);
  });
});

describe('round 3: the prose lints (docs/47 C14)', () => {
  const tiers = [0, 1, 2, 3, 4, 5] as TierIndex[];
  it.each(tiers)('place names, banned phrases, signposts, gags and a pet called "it": none, tier %i', (tier) => {
    for (let s = 1; s <= 6; s++) {
      for (const type of typesFor(tier) as CaseType[]) {
        const d = dealBoard(s, tier, type);
        for (const run of [playBoardOracle(d).run, playWanderer(d, s).run] as BoardRun[]) {
          expect(proseIssues(d, run), `${type} seed ${s}`).toEqual([]);
        }
      }
    }
  });

  it('the lints catch what the testers flagged', () => {
    const d = dealBoard(5, 2, 'murder');
    const run = playBoardOracle(d).run;
    const page = (text: string): BoardRun => ({ ...run, log: [{ ...(run.log[1] as Page), blocks: [{ kind: 'prose', text, voice: 'thought' }] }] });
    const rules = (text: string) => proseIssues(d, page(text)).map((x) => x.rule);
    expect(rules('That put Hanrahan and Winslow here at nine, with the list under both.')).toContain('phrase');
    expect(rules('Which brought me to the Delmonico rooms.')).toContain('phrase');
    expect(rules('I went in. So, the Shamrock.')).toContain('phrase');
    expect(rules('The rain had let up. A holy picture hung in the hall at the Delmonico rooms. The Delmonico rooms was out of the night. Nobody at the Delmonico rooms said so.')).toContain('place-tag');
    expect(rules('The curb was wet and the colour had gone out of it.')).toContain('phrase');
    expect(rules('Marchetti was next. I wanted Feeney’s evening next, too.')).toContain('signpost');
  });
});

void boardGridText;
