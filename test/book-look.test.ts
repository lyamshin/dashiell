/**
 * book-look (docs/75): the web book's look and feel, from the impeccable critique of 2026-10-27.
 *
 * - Item 1, the Close-the-case trap: opening the report by choice is free and reversible (`back`),
 *   writes no page and leaves the log, its numbering and the cards dealt as they were; once the clock
 *   has run out it stays final. The charge is said back before the case is closed, a blank report
 *   says so, and the CLI says and does the same.
 * - Items 2 to 4: the chrome's accessibility, contrast and phone rules, held in the source.
 * - Item 5: the efficiency note under "What really happened" (round5.test.ts holds its words), and the
 *   Deco frame's constants.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boardChoices } from '../src/game/board/choices.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { budgetCalls, dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { BACK_TO_CASE, BLANK_REPORT, blankReport, canGoBack, chargeLines, reportFrom, scoreBoard, truthReport } from '../src/game/board/report.js';
import { hintsUsed } from '../src/game/board/hints.js';
import { CLOSE_HEADING, CLOSE_NOTE, CLOSE_TAG } from '../src/game/board/text.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';
import { clockParts } from '../src/ui/deco.js';

const route = (d: BoardDeal, cmds: readonly string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const c of cmds) {
    const r = stepBoard(d, run, c);
    expect(r.error, c).toBeUndefined();
    run = r.run;
  }
  return run;
};

/** What a page says, for comparing two runs' pages. */
const said = (run: BoardRun) => run.log.map((p) => p.blocks.map((b) => ('text' in b ? b.text : '')).join('\n'));

/** A CLI on a save in memory. */
function cli(seed: number, tier: number, events: unknown[] = []) {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  files.set('s', JSON.stringify({ game: 'dashiell-play', version: 1, engine: 'board', seed, tier, detective: 'Dashiell', events, person: null, picker: null, claim: null }));
  return (...args: string[]) => runPlay([...args, '--save', 's'], io);
}

const RAW12 = dealBoard(12, 0);
const RAW12_ROUTE = playBoardOracle(RAW12).commands;

describe('book-look, item 1: the report taken out by choice goes back, free, and writes no page', () => {
  it('file then back leaves the night as it was: the log, its numbering, the cards, the clock', () => {
    for (const at of [0, 1, 3, RAW12_ROUTE.length]) {
      const before = route(RAW12, RAW12_ROUTE.slice(0, at));
      const out = stepBoard(RAW12, before, 'file').run;
      expect(out.reportOpen).toBe(true);
      expect(out.log).toHaveLength(before.log.length + 1);
      expect(canGoBack(RAW12, out)).toBe(true);
      const back = stepBoard(RAW12, out, 'back');
      expect(back.error).toBeUndefined();
      expect(back.run.reportOpen).toBe(false);
      expect(back.run.log).toHaveLength(before.log.length);
      expect(back.run.spent).toEqual(before.spent);
      expect(back.run.used).toBe(before.used);
      expect(back.run.log.map((p) => p.n)).toEqual(before.log.map((p) => p.n));
      expect(back.page).toBe(before.log[before.log.length - 1]);
    }
  });

  it('the night after a detour to the report reads exactly as the night without it', () => {
    const straight = route(RAW12, [...RAW12_ROUTE, 'file']);
    const detour = route(RAW12, [RAW12_ROUTE[0] as string, 'file', 'back', ...RAW12_ROUTE.slice(1), 'file', 'back', 'file']);
    expect(said(detour)).toEqual(said(straight));
    expect(detour.spent).toEqual(straight.spent);
    const v1 = scoreBoard(RAW12, straight, truthReport(RAW12, straight));
    const v2 = scoreBoard(RAW12, detour, truthReport(RAW12, detour));
    expect(v2.closing).toEqual(v1.closing);
  });

  it('back is only for a report that is out, and the report goes out once', () => {
    const run = route(RAW12, RAW12_ROUTE.slice(0, 2));
    expect(stepBoard(RAW12, run, 'back').error).toBe('The report isn’t out.');
    const out = stepBoard(RAW12, run, 'file').run;
    expect(stepBoard(RAW12, out, 'file').error).toBe('The report is out already.');
    expect(stepBoard(RAW12, out, RAW12_ROUTE[2] as string).error).toBe('The case is being closed: close it, or go back to the case.');
  });

  it('a hint taken on the report stays taken after going back', () => {
    const out = route(RAW12, [...RAW12_ROUTE.slice(0, 3), 'file', 'hint']);
    expect(hintsUsed(out)).toBe(1);
    const back = stepBoard(RAW12, out, 'back').run;
    expect(hintsUsed(back)).toBe(1);
    expect(back.log).toHaveLength(4);
  });

  it('once the clock runs out the report stays out: final', () => {
    // Walk between two places until the clock forces the report.
    let run = route(RAW12, ['go scene']);
    for (let i = 0; i < 40 && !run.reportOpen; i++) run = stepBoard(RAW12, run, i % 2 === 0 ? 'go office' : 'go scene').run;
    expect(run.reportOpen).toBe(true);
    expect(run.used).toBe(budgetCalls(RAW12));
    expect(canGoBack(RAW12, run)).toBe(false);
    expect(stepBoard(RAW12, run, 'back').error).toBe('No actions left: the case has to be closed now.');
    expect(stepBoard(RAW12, run, 'go bar').error).toBe('The case is being closed: close it.');
  });

  it('"Close the case" still offers itself, and nothing about it says free', () => {
    const groups = boardChoices(RAW12, newBoardRun(RAW12));
    const file = groups.flatMap((g) => g.choices).find((c) => c.command === 'file');
    expect(file?.label).toBe('Close the case');
    expect(`${CLOSE_HEADING} ${CLOSE_TAG} ${CLOSE_NOTE}`).not.toMatch(/\bfree\b/);
    expect(CLOSE_TAG).toBe('ends the night');
  });
});

describe('book-look, item 1: the charge, said back before the case is closed', () => {
  const run = route(RAW12, [...RAW12_ROUTE, 'file']);
  it('names who, when, how and why, and what proves they lied, in plain words', () => {
    expect(chargeLines(RAW12, run, truthReport(RAW12, run))).toEqual([
      'You’re charging Minnie Hurwitz: at ten o’clock, with a revolver.',
      'The reason: Petrosino testified against her brother.',
      'What proves she lied: Feldman: at ten o’clock, only Obermann and Schilling were at the Bijou.',
    ]);
  });

  it('says what’s blank, whose reason it is when it isn’t theirs, and a hunch as a hunch', () => {
    const lines = chargeLines(RAW12, run, reportFrom(RAW12, { who: 'hurwitz', why: 'obermann' }));
    expect(lines[0]).toBe('You’re charging Minnie Hurwitz.');
    expect(lines).toContain('The reason you give is Obermann’s: Petrosino threw her out of a lease.');
    expect(lines).toContain('What proves she lied: a hunch.');
    expect(lines[lines.length - 1]).toBe('You don’t know when and how.');
  });

  it('a report with every answer “I don’t know” says so, and nothing else', () => {
    const blank = reportFrom(RAW12, {});
    expect(blankReport(blank)).toBe(true);
    expect(chargeLines(RAW12, run, blank)).toEqual([BLANK_REPORT]);
    expect(blankReport(truthReport(RAW12, run))).toBe(false);
  });

  it('a lost thing says where it is now and what shows it; another liar, what clears them', () => {
    const d = dealBoard(14, 4, 'lost-pet');
    const r = route(d, [...playBoardOracle(d).commands, 'file']);
    const lines = chargeLines(d, r, truthReport(d, r));
    expect(lines[0]).toMatch(/^You’re charging Thaddeus Thorndike: he went at ten o’clock and he’s with Benny now\.$/);
    expect(lines.some((l) => /^What shows where he is: /.test(l))).toBe(true);
    expect(lines.some((l) => /^Lucia Alfano lied too\. What clears her: /.test(l) || /^Alfano lied too\. What clears her: /.test(l))).toBe(true);
  });
});

describe('book-look, item 1: the CLI says and does the same', () => {
  const at = (events: unknown[] = []) => cli(12, 0, events);

  it('the page sets "Close the case" apart, says it ends the night, and never says free', () => {
    const out = at()('look').out;
    expect(out).toMatch(/\nThe report:\n\s+\d+\. {3}Close the case — ends the night\n/);
    expect(out.replace(/\s+/g, ' ')).toContain('It opens the report first. That costs nothing, and you can come back until you close it.');
    expect(out.split('\n').find((l) => /Close the case/.test(l))).not.toMatch(/\bfree\b/);
  });

  it('`do back` puts the report away, free; the report page says how', () => {
    const say = at([{ do: RAW12_ROUTE[0] }, { do: 'file' }]);
    const look = say('look').out;
    expect(look.replace(/\s+/g, ' ')).toContain('Not ready? `do back` puts the report away and goes back to the case. It costs nothing.');
    expect(say('do', RAW12_ROUTE[1] as string)).toMatchObject({ code: 1, out: 'The case is being closed: `report` shows the form, `close` closes it, and `do back` goes back to the case.' });
    const back = say('do', 'back');
    expect(back.code).toBe(0);
    expect(back.out).toContain('WHAT NEXT');
    expect(say('do', BACK_TO_CASE).code).toBe(1);
  });

  it('a blank `close` is said back and refused; `close "blank"` closes it; a charge is said back first', () => {
    const say = at(RAW12_ROUTE.map((c) => ({ do: c })));
    const blank = say('close', '');
    expect(blank.code).toBe(1);
    expect(blank.out).toBe(`${BLANK_REPORT} To close it anyway: \`close "blank"\`.`);
    const closed = at(RAW12_ROUTE.map((c) => ({ do: c })))('close', 'who=Hurwitz; proof=hunch; when=10; how=revolver; why=brother');
    expect(closed.code).toBe(0);
    expect(closed.out.split('\n')[0]).toBe('You’re charging Minnie Hurwitz: at ten o’clock, with a revolver.');
    expect(closed.out).toContain('THE VERDICT');
    const anyway = at(RAW12_ROUTE.map((c) => ({ do: c })))('close', 'blank');
    expect(anyway.code).toBe(0);
    expect(anyway.out.split('\n')[0]).toBe(BLANK_REPORT);
  });

  it('`story` tells the fastest solve after the story', () => {
    const say = at(RAW12_ROUTE.map((c) => ({ do: c })));
    say('close', 'who=Hurwitz; proof=hunch; when=10; how=revolver; why=brother');
    const story = say('story').out;
    expect(story).toContain('THE FASTEST SOLVE');
    expect(story).toMatch(/It took me \d+ actions?/);
  });
});

const src = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('book-look, items 2 to 4: the chrome, held in the source', () => {
  const book = src('src/ui/board-book.ts');
  const css = `${src('src/ui/book.css')}\n${src('src/ui/board.css')}\n${src('src/ui/weather.css')}`;

  it('item 2: a main landmark, the place as the h1, labels that name their selects, names that say they’re controls', () => {
    expect(book).toContain("el('main', { class: 'page page--prose', id: 'page' })");
    expect(book).toMatch(/el\('h1', \{ class: 'place'/);
    expect(book).toContain("el('label', { for: `rf-${f.key}`, text: f.label })");
    expect(book).toContain("el('select', { name: f.key, id: `rf-${f.key}` })");
    expect(book).toContain("role: 'button', text: m[0]");
    expect(book).toMatch(/class: 'nb-link nb-foot'[^\n]*'aria-expanded'/);
    expect(book).toContain("focusNext = { to: 'verdict' }");
  });

  it('item 2: one focus ring, 2px with an offset, and nothing that switches it off for a control', () => {
    expect(css).toMatch(/:where\(button, select, input, a\[href\], \[tabindex\]\):focus-visible \{\s+outline: 2px solid var\(--focus\);\s+outline-offset: 2px;/);
    expect(css).not.toMatch(/\.(?:noun|choice)[^{]*:focus-visible[^{]*\{[^}]*outline: none/);
    expect(css).not.toContain('#b8635400');
  });

  it('item 3: one palette, the night; no light branch, and the page says it is dark', () => {
    expect(css).not.toMatch(/prefers-color-scheme|data-theme|Cream paper/);
    expect(src('src/ui/book.css')).toMatch(/color-scheme: dark;/);
    const html = src('index.html');
    expect(html).not.toContain('data-theme');
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
  });

  it('item 3: every text token reads at 4.5:1 on the paper and on a raised sheet; a control’s edge at 3:1', () => {
    const root = /:root \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    const tok = (name: string) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1] as string;
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
      return (x + 0.05) / (y + 0.05);
    };
    for (const bg of ['paper', 'paper-raised']) {
      for (const t of ['ink', 'ink-soft', 'ink-faint', 'nickel', 'nickel-dim', 'accent', 'amber', 'carbon']) expect(ratio(tok(t), tok(bg)), `${t} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tok('line'), tok(bg)), `line on ${bg}`).toBeGreaterThanOrEqual(3);
    }
    // (Faint still reads as secondary: below soft.)
    expect(ratio(tok('ink-faint'), tok('paper'))).toBeLessThan(ratio(tok('ink-soft'), tok('paper')));
  });

  it('curtain (docs/76): the board behind the curtain reads at 4.5:1 on every wash it puts under a cell', () => {
    const root = /:root \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    const tok = (name: string) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1] as string;
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
      return (x + 0.05) / (y + 0.05);
    };
    // color-mix(in srgb, A p%, B), as the browser mixes it.
    const mix = (a: string, b: string, p: number) => `#${[1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * p + parseInt(b.slice(i, i + 2), 16) * (1 - p)).toString(16).padStart(2, '0')).join('')}`;
    const css = src('src/ui/board.css');
    const pct = (re: RegExp) => Number(re.exec(css)?.[1]) / 100;
    const added = pct(/td\.is-added,\s+\.curtain-key \.k-added \{[^}]*color-mix\(in srgb, var\(--jade\) (\d+)%, var\(--paper\)\)/);
    const pointed = pct(/td\.is-pointed \{[^}]*color-mix\(in srgb, var\(--ink\) (\d+)%, var\(--paper\)\)/);
    const crime = pct(/\.bgrid td\.is-crime \{[^}]*color-mix\(in srgb, var\(--accent\) (\d+)%, transparent\)/);
    expect([added, pointed, crime].every((x) => x > 0)).toBe(true);
    const paper = tok('paper');
    const washes: Record<string, string> = { paper, 'the crime hour': mix(tok('accent'), paper, crime), 'what a step added': mix(tok('jade'), paper, added), 'a lie pointed at': mix(tok('ink'), paper, pointed), 'the current step': tok('paper-raised') };
    // The truth not known yet (faint), what they said (soft, struck or not), a clash (red), the known truth (ink).
    for (const [where, bg] of Object.entries(washes)) for (const t of ['ink', 'ink-soft', 'ink-faint', 'accent']) expect(ratio(tok(t), bg), `${t} on ${where}`).toBeGreaterThanOrEqual(4.5);
    // The step numbers and the heads; the jade edge and the pointed cell's ink edge as edges.
    for (const t of ['nickel', 'nickel-dim']) expect(ratio(tok(t), paper), `${t} on the paper`).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tok('jade'), washes['what a step added'] as string)).toBeGreaterThanOrEqual(3);
    // (Faint still reads under soft: the truth behind the curtain is the quietest thing on the board.)
    expect(ratio(tok('ink-faint'), paper)).toBeLessThan(ratio(tok('ink-soft'), paper));
  });

  it('the lobby lacquer: the choices panel reads at 4.5:1 for text and 3:1 for edges, and the names are ink, not the law’s red', () => {
    const root = /:root \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    const tok = (name: string) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1] as string;
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
      return (x + 0.05) / (y + 0.05);
    };
    const panel = /nav\.choices--board \{([\s\S]*?)\n\}/.exec(src('src/ui/board.css'))?.[1] ?? '';
    const faint = /--ink-faint: (#[0-9a-f]{6});/.exec(panel)?.[1] as string;
    expect(panel).toMatch(/--paper: var\(--lacquer\);/);
    for (const bg of ['lacquer', 'lacquer-raised']) {
      for (const t of ['ink', 'ink-soft', 'nickel', 'nickel-dim', 'jade', 'accent']) expect(ratio(tok(t), tok(bg)), `${t} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(faint, tok(bg)), `the panel's ink-faint on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tok('lacquer-line'), tok(bg)), `lacquer-line on ${bg}`).toBeGreaterThanOrEqual(3);
    }
    const noun = /\n\.noun \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    expect(noun).toMatch(/color: var\(--ink\);/);
    expect(noun).not.toMatch(/--accent/);
  });

  it('item 4: on a phone the grid is 12px at the least, a cell a thumb’s height, and the key’s sample neutral', () => {
    const phone = /@media \(max-width: 480px\) \{\s+\.bgrid \{[\s\S]*?\n\}/.exec(src('src/ui/board.css'))?.[0] ?? '';
    expect(phone).toMatch(/\.bgrid \{\s+font-size: 12px;/);
    expect(phone).toMatch(/\.bgrid-btn \{\s+min-height: 44px;/);
    expect(phone).toMatch(/\.bgrid-key,[\s\S]*?font-size: 12px;/);
    expect(src('src/ui/board.css')).toMatch(/\.bgrid \.is-says \.bgrid-btn,[\s\S]*?text-decoration: underline dotted;/);
    expect(book).toContain("const KEY_SAMPLE = 'Place';");
  });

  it('item 4: the pager’s targets and the notebook’s button are a thumb’s, and the notebook keeps the clock', () => {
    expect(src('src/ui/book.css')).toMatch(/\.pager button \{\s+min-height: 44px;\s+min-width: 44px;/);
    expect(book).toContain("class: 'nb-clock'");
    expect(book).toContain("class: 'cue-below'");
  });
});

describe('book-look, item 5: the frame', () => {
  it('the clock says the period’s "a.m."', () => {
    expect(clockParts('12:35 AM')).toEqual({ figures: '12:35', ampm: 'a.m.' });
    expect(clockParts('8:00 AM')).toEqual({ figures: '8:00', ampm: 'a.m.' });
  });

  it('the verdict’s marks are words, the stamp a word for the right name and one for the wrong', () => {
    const ui = src('src/ui/report.ts');
    expect(ui).not.toMatch(/'[✓✗½]'/);
    expect(src('src/ui/deco.ts')).toMatch(/STAMP_RIGHT = 'Case closed';[\s\S]*STAMP_WRONG = 'Dismissed';/);
    expect(src('src/ui/board-book.ts')).not.toContain("text: ' ✓'");
  });

  it('one font request: Garamond, Josefin Sans and Courier Prime', () => {
    expect(src('index.html')).toContain('family=Courier+Prime&family=EB+Garamond:ital,wght@0,400;1,400&family=Josefin+Sans:wght@300..700&display=swap');
  });

  it('no side stripes on rows, the picker or the form', () => {
    const css = `${src('src/ui/book.css')}\n${src('src/ui/board.css')}`;
    expect(css).not.toMatch(/border-left: 2px solid/);
  });
});
