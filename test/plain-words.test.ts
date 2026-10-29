/**
 * docs/64: the book's own words, plain. A "call" is an action, "Put it to" is "Confront", the report
 * asks what proves they lied and what you were told, the case is closed, a guess is marked, and the
 * turn's heading is a divider. This holds the chrome to it, in the CLI over a night at every tier and
 * both worlds, and in the book's own strings: none of the retired words, anywhere a player reads the
 * interface. (The pages' prose is clarity-3's and isn't read here.)
 *
 * Round 6 (docs/66): and the surfaces after the night, where "put to it", "filed", "file itself", "no
 * line to hang it on" and "the true board" were left: the report's answers, the verdict whole (its
 * score, what it says plainly, its endings), the notebook's "Where things stand", the story, the curtain
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
import { boardGrid, boardGridText, gridKey, meansAsked, placeCodes, placesKey } from '../src/game/board/grid.js';
import { dealBoard, deadlineWords, type BoardDeal } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { BREAKS_LABEL, CLEARED_LABEL, OTHER_LABEL, OTHER_QUESTION, WHERE_BY_LABEL, blankRule, boardFields, breakOptionsShown, curtainOfBoard, curtainSheet, lineGroupHeads, lineNumbers, notebookLines, scoreBoard, starWords, storyOfBoard, tallyWords, truthReport, whereByOptions } from '../src/game/board/report.js';
import { hintLabel, hintsLine, hintsNote, takeHint } from '../src/game/board/hints.js';
import { BOARD_RULES, BOARD_TEACH_LINES } from '../src/game/board/teach.js';
import { ACTION_KEY, PICKER_COST, TALK_HEADING, TURN_DIVIDER, chapterShown, costText, notebookText, questionsText } from '../src/game/board/text.js';
import { linesHeld } from '../src/game/board/knowledge.js';
import { TRACK_NAMES, WHOLE_TRUTH, cellKnown, cellTruth, fastestTrack, nightTrack, positionWords } from '../src/game/board/replay.js';
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
    expect(BOARD_TEACH_LINES).toContain('When two people lied, you also need what clears the innocent one: somebody else’s word, not their own.');
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
    // (Round 7, B7: shorter, and true: confronting the innocent liar is how you learn who clears them.)
    expect(note).toContain('Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her.');
    expect(note).not.toMatch(/\bit\b/i);
    expect(pk?.claims.map((x) => x.said)).toEqual(['She said she was at the Shamrock at nine']);
    const g = boardChoices(d, run).find((x) => x.personId === 'reinhardt');
    const topics = (g?.choices ?? []).map((ch) => costText(ch));
    expect(topics).toEqual(['free to reread', '', 'free to look; an action if you go ahead']);
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

  it('the curtain’s replay never says a retired word: its steps, captions and what each cell says', () => {
    const found: string[] = [];
    for (const [seed, tier] of [[3, 0], [4, 2], [5, 3], [39, 5], [2, 4]] as [number, TierIndex][]) {
      for (const type of typesFor(tier)) {
        const d = dealBoard(seed, tier, type);
        const o = playBoardOracle(d);
        const sheet = curtainSheet(d, o.run, truthReport(d, o.run));
        for (const t of [fastestTrack(d, sheet), nightTrack(d, o.run)]) {
          const said = [t.caption, TRACK_NAMES[t.kind], WHOLE_TRUTH, ...t.steps.flatMap((s, i) => [s.label, s.why, positionWords(t, i)])];
          for (const r of sheet.board.rows) for (const x of r.cells) said.push(cellTruth(d, sheet, r.id, x.hour), cellKnown(d, sheet, t, r.id, x.hour));
          for (const x of said) found.push(...retiredIn(unquoted(x)).map((h) => `${seed}/${tier}/${type} ${t.kind}: ${h}`));
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('the book’s own strings never say a retired word', () => {
    // (curtain, docs/76: and the curtain's own, its replay's words in the game layer too.)
    for (const file of ['src/ui/board-book.ts', 'src/ui/report.ts', 'src/ui/curtain.ts', 'src/ui/cells.ts', 'src/game/board/replay.ts']) {
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

describe('round 7, B9: no chrome says or implies that somebody else lied', () => {
  /** "Someone else lied too", "who else lied", "the other liar", "when two people lied, it also asks": each says a second liar exists. */
  const TELLS = /\b(?:someone|somebody) else (?:lied|is lying)\b|\bwho else lied\b|\bthe other liar\b|\bwhen two people lied, (?:it|the report) (?:also )?asks\b|\banother liar\b|\bsecond liar\b/i;
  const tells = (t: string) => (TELLS.test(t) && !/^Did anyone else lie\?/.test(t) ? [t] : []);

  it('the question, its labels and the help ask; they never tell', () => {
    for (const t of [OTHER_QUESTION, OTHER_LABEL, CLEARED_LABEL, ...BOARD_RULES]) expect(tells(t), t).toEqual([]);
    expect(OTHER_QUESTION).toBe('Did anyone else lie? If so, who, and what clears them?');
    expect(BOARD_RULES.join(' ')).toContain('it also asks whether anyone else lied, and if so, what clears them');
  });

  it('the CLI’s form, a person’s list, the help and its refusals, on a night with another liar', () => {
    const d = dealBoard(17, 2, 'murder');
    const say = cli(d, playBoardOracle(d).commands.map((x) => ({ do: x })));
    const texts = [say('report'), say('report', 'Dandridge'), say('report', 'Callahan'), say('help'), say('close', 'who=Callahan; cleared=1')];
    for (const t of texts) for (const line of t.split('\n')) expect(tells(line), line).toEqual([]);
    expect(texts[0]).toContain('Did anyone else lie? If so, who, and what clears them? (other):');
  });

  it('the book’s own strings never tell either', () => {
    for (const file of ['src/ui/board-book.ts', 'src/ui/report.ts', 'src/game/board/teach.ts']) {
      const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\s\/\/ .*$/gm, '');
      const literals = [...src.matchAll(/'([^'\n]*)'|`([^`]*)`|"([^"\n]*)"/g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
      expect(literals.flatMap(tells), file).toEqual([]);
    }
  });
});

describe('round 7, U1–U3: the report’s lists, the labels and the confront box (docs/70)', () => {
  /** A CLI list's entries, by number: "   12. Bidwell: at nine …" with its wrapped lines. */
  const numbered = (out: string): Map<number, string> => {
    const m = new Map<number, string>();
    let last: number | null = null;
    for (const l of out.split('\n')) {
      const hit = /^\s{2,}(\d+)\. (.*)$/.exec(l);
      if (hit) {
        last = Number(hit[1]);
        m.set(last, hit[2] as string);
      } else if (last !== null && /^\s{5,}\S/.test(l)) m.set(last, `${m.get(last)} ${l.trim()}`);
      else last = null;
    }
    return m;
  };

  it('U1: one numbering a night: the same thing has the same number on every person’s list, on the form and in the notebook', () => {
    const d = dealBoard(17, 2, 'murder');
    const o = playBoardOracle(d);
    const events = o.commands.map((x) => ({ do: x }));
    const say = cli(d, events);
    const nb = say('notebook');
    const told = numbered(nb.slice(nb.indexOf('What I was told:'), nb.indexOf('Where things stand:')));
    expect(told.size).toBeGreaterThan(10);
    const lists = d.kase.people.filter((p) => p.role === 'suspect').map((p) => numbered(say('report', p.short).split('`report` shows')[0] as string));
    const seen = new Map<number, string>();
    for (const list of lists) {
      for (const [n, label] of list) {
        if (seen.has(n)) expect(label, `#${n}`).toBe(seen.get(n));
        seen.set(n, label);
        // (The office's own facts and a crack aren't in "What I was told"; everything else is, by the same number.)
        if (told.has(n)) expect(told.get(n), `#${n}`).toBe(label);
      }
    }
    // Bledsoe's nine o'clock, the line round 7 found at #4 on one list and #8 on another, is one number on both.
    const bledsoe = (l: string) => l.startsWith('Bledsoe says she was at Sokol’s back room at nine');
    expect([...seen].filter(([, l]) => bledsoe(l)).length).toBe(1);
    expect(lists.filter((list) => [...list.values()].some(bledsoe)).length).toBeGreaterThan(1);
    // And the number closes the case: proof and cleared by the night's numbers.
    const truth = truthReport(d, o.run);
    const nums = lineNumbers(d, o.run);
    const filed = say('close', `who=Callahan; proof=${nums.get(truth.breaks as string)}; other=Dandridge; cleared=${nums.get(truth.cleared as string)}; when=nine; how=knife; why=lease`);
    expect(filed).toMatch(/5 out of 5/);
    // A number from somebody else's list is refused, with whose list to look at.
    const offList = [...nums].find(([id]) => !breakOptionsShown(d, o.run, 'callahan').some((x) => x.value === id))?.[1];
    expect(cli(d, events)('close', `who=Callahan; proof=${offList}; when=nine; how=knife; why=lease`)).toMatch(/isn’t on Callahan’s list for proof: `report Callahan` shows what is\./);
  });

  it('U1: every list the form offers, on a night at every tier and both worlds, has a number for everything on it', () => {
    for (const { d } of NIGHTS) {
      const run = playBoardOracle(d).run;
      const nums = lineNumbers(d, run);
      const opts = [...d.kase.people.filter((p) => p.role === 'suspect').flatMap((p) => breakOptionsShown(d, run, p.id)), ...(d.kase.type === 'murder' ? [] : whereByOptions(d, run))];
      for (const o of opts) expect(nums.get(o.value), `${d.kase.id} ${o.label}`).toBeGreaterThan(0);
      // One number each: no two things share one.
      expect(new Set(nums.values()).size).toBe(nums.size);
      // The notebook's "What I was told" is numbered 1 to n: the office's facts, then in the order it was
      // held (round 8, B1, docs/73: one list, a crack in its place).
      notebookLines(d, run).forEach((o, i) => expect(nums.get(o.value)).toBe(i + 1));
      expect(notebookLines(d, run).filter((o) => !o.value.startsWith('given#') && !o.value.startsWith('crack:')).map((o) => o.value)).toEqual(linesHeld(d.kase, run).filter((l) => l.kind !== 'given').map((l) => l.id));
    }
  });

  it('U1: the headings and the form say what a list holds, in plain words', () => {
    const d = dealBoard(17, 2, 'murder');
    const o = playBoardOracle(d);
    const heads = lineGroupHeads(d, o.run, 'dandridge');
    expect(heads.touching).toBe('About Dandridge, or anywhere he said he was tonight, at nine o’clock:');
    expect(heads.rest).toBe('About anybody else at nine o’clock, or Dandridge at other hours:');
    expect(lineGroupHeads(d, newBoardRun(d), 'dandridge').touching).toBe('About Dandridge at nine o’clock:');
    const hb = dealBoard(19, 5, 'murder');
    expect(lineGroupHeads(hb, newBoardRun(hb), 'grasso').rest).toBe('About anybody else at eight or nine o’clock, or Grasso at other hours:');
    const form = cli(d, o.commands.map((x) => ({ do: x })))('report').replace(/\s+/g, ' ');
    // (docs/73, round 9, item 7: the form's keys stay in the command's line, never in a sentence.)
    expect(form).toContain('Pick who first. Then `report <name>` shows what you were told about them and about nine o’clock, numbered as in the notebook. Give one of those numbers, or “hunch”.');
    expect(form).toContain('If you name somebody, `report <name>` shows what you were told about them. Pick what clears them from it: somebody else’s word, not their own. Give its number, or “hunch”.');
    expect(form).not.toMatch(/lists what you know about them, or about|the same list as for proof|Name them first:/);
    for (const t of [heads.touching, heads.rest]) expect(retiredIn(t), t).toEqual([]);
  });

  it('U2: the confront row, a person’s row, the grid’s key and an admission say it as a person would', () => {
    expect(PICKER_COST).toBe('free to look; an action if you go ahead');
    const d = dealBoard(17, 2, 'murder');
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'search papers', 'go bar', 'ask barkeep list', 'go rooming', 'ask xwatcher list', 'ask callahan evening']) run = stepBoard(d, run, cmd).run;
    const g = boardChoices(d, run).find((x) => x.personId === 'callahan') as NonNullable<ReturnType<typeof boardChoices>[number]>;
    expect(questionsText(g, d.kase)).toBe('1 question, or confront her');
    const asked = { ...g, choices: g.choices.map((ch) => ({ ...ch, done: !ch.command.startsWith('picker') })) };
    expect(questionsText(asked, d.kase)).toBe('nothing left to ask, but you can confront her');
    expect(cli(d, [])('help')).not.toMatch(/can confront|free to open/);
    // An admission, in the notebook, the form and the grid's clash list.
    const o = playBoardOracle(d);
    const nb = notebookText(d, o.run).replace(/\s+/g, ' ');
    expect(nb).toContain('Dandridge admits he was at Sokol’s back room at nine o’clock, with Bledsoe.');
    expect(nb).not.toMatch(/owns up:|owned up to being|owned up to (?:the |Mrs\. )?[A-Z]/);
    expect(nb).toContain('Dandridge admitted he was at Sokol’s back room, with Bledsoe');
    expect(gridKey(boardGrid(d.kase, o.run))).toContain('→Y where they admitted they were');
  });

  it('U2: the grid’s labels are words a player would use, and its key names only the ones that aren’t the place’s own name', () => {
    const bad = /^(?:scene|cards|print|chop|at|Dr\.|Miss|Mr\.|Mrs\.|Kit|Blue|little|curtained)$/;
    for (const { d } of NIGHTS) {
      const run = playBoardOracle(d).run;
      for (const code of Object.values(placeCodes(d.kase))) expect(code, d.kase.id).not.toMatch(bad);
      const grid = boardGridText(d.kase, run);
      expect(grid, d.kase.id).not.toMatch(/^Places: |\bscene = /m);
      const key = placesKey(d.kase, run);
      if (key) {
        expect(key).toMatch(/^In the grid, .+ is .+\.$/);
        for (const pair of key.replace(/^In the grid, |\.$/g, '').split(/, | and (?=[^,]+ is )/)) {
          const [code, name] = pair.split(' is ') as [string, string];
          expect(name.replace(/^the /, ''), `${d.kase.id}: ${pair}`).not.toBe(code);
        }
      }
    }
    const hb = dealBoard(19, 5, 'murder');
    expect(placeCodes(hb.kase)).toMatchObject({ scene: 'Vitale’s' });
    expect(Object.values(placeCodes(hb.kase))).toContain('card room');
    const p17 = dealBoard(17, 2, 'murder');
    expect(placesKey(p17.kase, playBoardOracle(p17).run)).toBe('In the grid, Sokol’s is Sokol’s back room.');
    // (The tester's own mark, "Callahan nine at scene", still finds the scene, now labelled by its name.)
    const marked = cli(p17, playBoardOracle(p17).commands.map((x) => ({ do: x })))('mark', 'Callahan nine at scene');
    expect(marked).toContain('Your guess: Callahan at Quill’s place at nine.');
    expect(marked).toContain('~Quill’s');
  });

  it('U3: the confront box is shorter, and still says both kinds of witness, its cost, and that it isn’t needed', () => {
    const d = dealBoard(5, 2, 'murder');
    let run = newBoardRun(d);
    for (const cmd of ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask reinhardt evening']) run = stepBoard(d, run, cmd).run;
    const pk = pickerFor(d, run, 'reinhardt');
    const note = pickerNote(d, pk as NonNullable<typeof pk>);
    expect(note).toBe('Pick the hour that doesn’t match, then who says otherwise: somebody who saw her somewhere else, or who saw everybody where she said she was, and not her. Confronting her takes an action and isn’t needed to prove she lied, but she may name somebody who can clear her.');
    expect(note.split(/\s+/).length).toBeLessThan(50);
  });
});
