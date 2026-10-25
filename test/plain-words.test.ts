/**
 * docs/64: the book's own words, plain. A "call" is an action, "Put it to" is "Confront", the report
 * asks what proves they lied and what you were told, the case is closed, a guess is marked, and the
 * turn's heading is a divider. This holds the chrome to it, in the CLI over a night at every tier and
 * both worlds, and in the book's own strings: none of the retired words, anywhere a player reads the
 * interface. (The pages' prose is clarity-3's and isn't read here.)
 *
 * Round 6 (docs/66): and the surfaces after the night, where "put to it", "filed", "file itself", "no
 * line to hang it on" and "the true board" were left: the report's answers, the verdict whole (its
 * score, what it says plainly, its endings), the notebook's "How it adds up", the story, the curtain
 * whole, and every ending card in `night.json`. What people said, inside quotation marks, is theirs.
 *
 * docs/67: and the hints' chrome: the button and its count, the first page's note, what a hint says, the
 * verdict's tally and star.
 */
import { readFileSync } from 'node:fs';
import { recapClauses } from '../src/game/board/pages.js';
import { describe, expect, it } from 'vitest';
import { typesFor, type TierIndex } from '../src/gen/board/index.js';
import { boardChoices, pickerFor, pickerNote } from '../src/game/board/choices.js';
import { clockStrip } from '../src/game/board/clock.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { boardGrid, gridKey, meansAsked } from '../src/game/board/grid.js';
import { dealBoard, deadlineWords, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { BREAKS_LABEL, CLEARED_LABEL, OTHER_QUESTION, WHERE_BY_LABEL, blankRule, boardFields, curtainOfBoard, lineGroupHeads, scoreBoard, starWords, storyOfBoard, tallyWords, truthReport, whereByOptions } from '../src/game/board/report.js';
import { hintLabel, hintsLine, hintsNote, takeHint } from '../src/game/board/hints.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { ACTION_KEY, TALK_HEADING, TURN_DIVIDER, chapterShown, costText } from '../src/game/board/text.js';
import { runPlay, type PlayIo } from '../src/cli/play-lib.js';

/** The retired words (docs/64's table), as the chrome must never say them. "Clear" stays. */
const RETIRED: [string, RegExp][] = [
  ['call', /\bcalls?\b/i],
  ['put it to', /\bput (?:it|nothing) to\b|\bread (?:him|her|them|one) (?:a |the )?line\b|\bread one to\b/i],
  ['line', /\b(?:the|a|this) line\b|\blines\b/i],
  ['breaks', /\bbreaks?\b/i], // ("the broken lock" is a lock)
  ['held / didn’t hold', /\bheld\b|\bdidn’t hold\b/i],
  ['pencil', /\bpencil/i],
  ['file', /\bFile (?:the report|it)\b|\bfiling\b|\bfiled\b|\bplay -- file\b/i],
  ['short way / par', /\bshort way\b|\bpar\b/i],
  ['the turn', /\bthe turn\b/i],
  ['go over', /\bgo over what I have\b/i],
  ['could get it', /\bcould get it\?|\bknew how\?/i],
  ['counts down', /\bcounts down\b/i],
  // Round 6: the leftovers after the night.
  ['put to it', /\bput to it\b|\bput to (?:him|her|them)\b/i],
  ['file itself', /\bfiles? itself\b/i],
  ['a line to hang it on', /\bline to hang\b/i],
  ['the true board', /\btrue board\b/i],
];

/** What people said, in quotation marks, is theirs: a line of the curtain or the story without it. */
const unquoted = (t: string): string => t.replace(/“[^”]*”?/g, '“”');

function retiredIn(text: string): string[] {
  return RETIRED.filter(([, re]) => re.test(text)).map(([name]) => `${name}: ${text.trim().slice(0, 120)}`);
}

/** A CLI, on a save in memory. */
function cli(d: BoardDeal, events: unknown[], world?: string) {
  const files = new Map<string, string>();
  const io: PlayIo = { read: (p) => files.get(p) ?? null, write: (p, s) => void files.set(p, s) };
  const save = { game: 'dashiell-play', version: 1, engine: 'board', seed: d.kase.seed, tier: d.kase.tier, type: d.kase.type, ...(world ? { world } : {}), detective: 'Dashiell', events, person: null, picker: null, claim: null };
  files.set('s', JSON.stringify(save));
  return (...args: string[]) => runPlay([...args, '--save', 's'], io).out;
}

/**
 * The CLI's chrome: everything but the page's own prose and what people said. A page's head (the
 * place, the clock) and everything after the double rule; in the report, the form's words but not
 * its answers (a motive can say "file"); in the verdict, the score and what it says plainly; in the
 * curtain, its headings and the fastest solve; the notebook's headings and the grid's key.
 */
const DOUBLE = '═'.repeat(76);
const dropOptions = (t: string) => t.split('\n').filter((l) => !/^\s{3,}\d+\. /.test(l) && !/^\s{6,}\S/.test(l)).join('\n');

const NIGHTS: { d: BoardDeal; world?: string }[] = [];
for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
  for (const type of typesFor(tier)) NIGHTS.push({ d: dealBoard(2 + tier, tier, type) });
  NIGHTS.push({ d: dealBoard(3 + tier, tier, typesFor(tier)[0] as never, { world: 'neighbourhood' }), world: 'neighbourhood' });
}

describe('docs/64: plain words in the chrome', () => {
  it('the shared words say none of the retired ones', () => {
    const d = dealBoard(5, 2, 'murder');
    const run = newBoardRun(d);
    const texts = [
      ACTION_KEY,
      TALK_HEADING,
      TURN_DIVIDER,
      chapterShown('The turn'),
      ...BOARD_RULES,
      ...BOARD_TEACH_LINES,
      BREAKS_LABEL,
      CLEARED_LABEL,
      OTHER_QUESTION,
      WHERE_BY_LABEL,
      blankRule(d, false),
      blankRule(d, true),
      ...Object.values(lineGroupHeads(d, run, 'reinhardt')),
      clockStrip(0, 14).left,
      clockStrip(14, 14).left,
      clockStrip(3, 10, deadlineWords(dealBoard(11, 0, 'lost-item').kase)).left,
    ];
    for (const t of texts) expect(retiredIn(t), t).toEqual([]);
    expect(clockStrip(0, 14).left).toBe('Fourteen actions left. The DA charges somebody at eight.');
    expect(clockStrip(7, 10, deadlineWords(dealBoard(11, 0, 'lost-item').kase)).left).toBe('Three actions left. Mrs. Marchetti wants an answer at eight.');
    expect(chapterShown('The turn')).toBe('Where things stood');
    expect(BOARD_TEACH_LINES).toContain('When two people lied, you also need what clears the innocent one.');
  });

  it('the CLI, over a night at every tier and both worlds, never says a retired word', { timeout: 240_000 }, () => {
    const found: string[] = [];
    for (const { d, world } of NIGHTS) {
      const where = `${world ?? 'dealt'} ${d.kase.id}`;
      const o = playBoardOracle(d);
      const events = o.commands.map((x) => ({ do: x }));
      // Every page's choices, the person's questions, and any picker's note, as the engine offers them.
      let run = newBoardRun(d);
      for (const cmd of o.commands) {
        for (const g of boardChoices(d, run)) {
          for (const ch of [...g.choices, ...(g.more ?? [])]) for (const t of [ch.label, ch.note ?? '', ch.why ?? '', costText(ch), g.heading ?? '']) found.push(...retiredIn(t).map((x) => `${where} choice: ${x}`));
          if (g.personId) {
            const pk = pickerFor(d, run, g.personId);
            if (pk) found.push(...retiredIn(pickerNote(d, pk)).map((x) => `${where} picker: ${x}`));
          }
        }
        run = stepBoard(d, run, cmd).run;
      }
      const at = cli(d, events, world);
      const page = (out: string) => {
        const [body, ...rest] = out.split(DOUBLE);
        return [(body ?? '').split('\n').slice(0, 3).join('\n'), ...rest].join('\n');
      };
      const first = cli(d, [], world)('look');
      found.push(...retiredIn(page(first)).map((x) => `${where} page one: ${x}`));
      found.push(...retiredIn(page(at('look'))).map((x) => `${where} last page: ${x}`));
      found.push(...retiredIn(at('help')).map((x) => `${where} help: ${x}`));
      const culprit = d.kase.people.find((p) => p.id === d.kase.crime.culprit)?.short ?? '';
      const closing = cli(d, [...events, { do: 'file' }], world);
      for (const out of [closing('report'), closing('report', culprit)]) found.push(...retiredIn(dropOptions(page(out))).map((x) => `${where} report: ${x}`));
      const nb = at('notebook')
        .split('\n')
        .filter((l) => !/^\s{2}/.test(l) && !/^[A-Z][\w’.]*(?: [A-Z][\w’.]*)*(?: †)?\s{2,}/.test(l));
      for (const l of nb) found.push(...retiredIn(l).map((x) => `${where} notebook: ${x}`));
      // The verdict and the curtain, on the true report.
      const filed = stepBoard(d, o.run, 'file').run;
      const truth = truthReport(d, filed);
      const v = scoreBoard(d, filed, truth);
      for (const t of [v.scoreLine, ...v.plain, ...v.closing.filter((x) => /^It took me /.test(x)), ...v.fields.map((f) => f.label)]) found.push(...retiredIn(t).map((x) => `${where} verdict: ${x}`));
      const done = cli(d, [...events, { do: 'file' }, { file: truth }], world);
      const curtain = done('curtain')
        .split('\n')
        .filter((l) => /^[A-Z ,’]+$/.test(l) || /^ {2}(?:What|You)/.test(l) || /^(?:\d+|\+)\. /.test(l) || /^THE FASTEST/.test(l));
      for (const l of curtain) found.push(...retiredIn(l.replace(/^ {2}(What [^:]+|You picked):.*/, '$1')).map((x) => `${where} curtain: ${x}`));
      const g = boardGrid(d.kase, filed);
      for (const t of [...gridKey(g), meansAsked(g.meansLabel)]) found.push(...retiredIn(t).map((x) => `${where} grid: ${x}`));
      // Round 6: the verdict whole, the answers it shows, the story, the recap and the curtain whole.
      for (const t of [...v.closing, ...v.fields.map((f) => `${f.label}: ${f.given}`)]) found.push(...retiredIn(unquoted(t)).map((x) => `${where} verdict: ${x}`));
      for (const o of whereByOptions(d, filed)) found.push(...retiredIn(unquoted(o.label)).map((x) => `${where} report answer: ${x}`));
      for (const t of storyOfBoard(d)) found.push(...retiredIn(unquoted(t)).map((x) => `${where} story: ${x}`));
      for (const cl of recapClauses(d, filed)) found.push(...retiredIn(unquoted(cl.text)).map((x) => `${where} recap: ${x}`));
      for (const l of curtainOfBoard(d, filed, truth).split('\n')) found.push(...retiredIn(unquoted(l)).map((x) => `${where} curtain: ${x}`));
      found.push(...retiredIn(unquoted(done('look'))).map((x) => `${where} verdict page: ${x}`));
    }
    expect([...new Set(found.map((x) => x.replace(/^\S+ \S+ /, '')))]).toEqual([]);
  });

  it('the verdict’s endings, every card in night.json, never say a retired word', () => {
    const deck = JSON.parse(readFileSync(new URL('../content/board/night.json', import.meta.url), 'utf8')) as { family: string; text: string }[];
    const endings = deck.filter((x) => x.family === 'ending');
    expect(endings.length).toBeGreaterThan(30);
    expect(endings.flatMap((x) => retiredIn(x.text.replace(/\*\*/g, '')))).toEqual([]);
  });

  it('round 6: the confront screen says what it costs and that it isn’t needed; the labels say what they do', () => {
    const d = dealBoard(5, 2, 'murder');
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask reinhardt evening']) run = stepBoard(d, run, cmd).run;
    const pk = pickerFor(d, run, 'reinhardt');
    expect(pk).not.toBeNull();
    const note = pickerNote(d, pk as NonNullable<typeof pk>);
    expect(note).toContain('Confronting her takes an action, whether she talks or not. You don’t have to: the report takes what proves she lied either way.');
    expect(note).not.toMatch(/\bit\b(?! either way)/);
    expect(pk?.claims.map((x) => x.said)).toEqual(['She said she was at the Shamrock at nine']);
    const g = boardChoices(d, run).find((x) => x.personId === 'reinhardt');
    const topics = (g?.choices ?? []).map((ch) => costText(ch));
    expect(topics).toEqual(['free to reread', '', 'free to open']);
  });

  it('docs/67: the hints’ chrome (the button, its count, the notes, what a hint says, the tally and the star) never says a retired word', () => {
    const found: string[] = [];
    const say = (where: string, t: string | null | undefined) => {
      if (t) found.push(...retiredIn(unquoted(t)).map((x) => `${where}: ${x}`));
    };
    for (const tier of [0, 1, 2, 3, 4, 5] as TierIndex[]) {
      const d = dealBoard(2 + tier, tier, typesFor(tier)[0] as never);
      let run = newBoardRun(d);
      say('first page', hintsNote(d, run));
      say('button', hintLabel(run));
      say('count', hintsLine(run));
      // A hint before every step of the oracle's route while any are left, then on the report page.
      for (const cmd of [...playBoardOracle(d).commands, 'file', '']) {
        const h = takeHint(d, run);
        if ('error' in h) say('hint error', h.error);
        else {
          say(`hint ${h.said.kind}`, h.said.text);
          run = h.run;
        }
        say('button', hintLabel(run));
        say('count', hintsLine(run));
        if (cmd) run = stepBoard(d, run, cmd).run;
      }
      const v = scoreBoard(d, run, truthReport(d, run));
      say('tally', v.tally);
      say('star', starWords(v.star));
      const out = cli(d, [])('hint');
      say('cli hint', out);
    }
    for (const t of [starWords('gold'), starWords('star'), tallyWords(0, 11, 2), tallyWords(4, 11, 0)]) say('verdict', t);
    expect([...new Set(found)]).toEqual([]);
  });

  it('the book’s own strings never say a retired word', () => {
    for (const file of ['src/ui/board-book.ts', 'src/ui/report.ts']) {
      const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\s\/\/ .*$/gm, '');
      // Every string literal a player could read: with a space in it, or a sentence's end.
      const literals = [...src.matchAll(/'([^'\n]*)'|`([^`]*)`|"([^"\n]*)"/g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ')).filter((t) => / /.test(t.trim()) || /[.?:!]$/.test(t.trim()))
        // (not a class list: "field field--lines")
        .filter((t) => !/^[a-z0-9 -]+$/.test(t.trim()) || !/-/.test(t));
      const hits = literals.flatMap((t) => retiredIn(t)).filter((h) => !/^pencil: .*bgrid-pencil|is-pencil/.test(h));
      expect(hits, file).toEqual([]);
    }
  });

  it('the CLI takes the new commands and keys, and the old ones still', () => {
    const d = dealBoard(11, 0, 'lost-item');
    const o = playBoardOracle(d);
    const events = o.commands.map((x) => ({ do: x }));
    const at = cli(d, events);
    const marked = at('mark', 'Bellucci ten at Moe’s');
    expect(marked).toContain('Your guess: Bellucci at Moe’s at ten.');
    expect(at('pencil', 'Bellucci ten clear')).toContain('Cleared your guess for Bellucci at ten.');
    const fields = boardFields(d);
    expect(fields.map((f) => f.key)).toEqual(['who', 'when', 'where', 'why']);
    // `close` with `proof` and `whereproof`; `file` with `breaks` and `whereBy`, the same verdict.
    const plain = cli(d, events)('close', 'who=Bellucci; proof=hunch; when=10; where=Pardo; evidence=hunch; why=rent');
    const old = cli(d, events)('file', 'who=Bellucci; breaks=hunch; when=10; where=Pardo; whereBy=hunch; why=rent');
    expect(plain).toBe(old);
    // (Round 6, U5: `evidence`, with `whereproof` still read.)
    expect(cli(d, events)('close', 'who=Bellucci; proof=hunch; when=10; where=Pardo; whereproof=hunch; why=rent')).toBe(old);
    expect(plain).toContain('What proves they lied: A hunch');
    expect(cli(d, events)('help')).toMatch(/close "who=…; proof=…;/);
  });
});
