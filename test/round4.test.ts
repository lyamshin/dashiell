/**
 * docs/55: what the fourth round of blind playtests found, held to. The testers' own nights (Raw 11
 * lost item, Poached 5 murder, Medium 14 lost pet, Hard-boiled 8 murder), along their own paths
 * where it matters, and the lints the round added.
 */
import { describe, expect, it } from 'vitest';
import { pageStars } from '../src/game/board/choices.js';
import { starCommand, starReason } from '../src/game/board/stars.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { nameHomes, titleClient } from '../src/game/board/home.js';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { capThingClose, thingClose } from '../src/game/board/plan/closers.js';
import type { Item } from '../src/game/board/plan/types.js';
import { dealtIds, emptyProfile, recordRun, sanitizeProfile, seenOf } from '../src/game/board/profile.js';
import { proseIssues } from '../src/game/board/prose-lint.js';
import { breakOptionsShown, curtainOfBoard, whereByOptions } from '../src/game/board/report.js';
import type { Page } from '../src/game/board/types.js';
import { runPlay } from '../src/cli/play-lib.js';

const prose = (p: Page) => p.blocks.map((b) => (b.kind === 'prose' ? b.text : '')).join('\n');
const night = (seed: number, tier: number, type: string, cmds: string[]): BoardRun => {
  const d = dealBoard(seed, tier as 0, type as 'murder');
  let run = newBoardRun(d);
  for (const c of cmds) run = stepBoard(d, run, c).run;
  return run;
};
const RAW11 = ['go scene', 'search scene', 'go neighbours', 'ask xwatcher list', 'go bar', 'ask bellucci evening', 'ask barkeep list', 'put bellucci 10 list:barkeep@10'];
const HB8 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'ask grasso evening', 'put grasso 10 list:xwatcher@10'];
const MED14 = ['go scene', 'search scene', 'go neighbours', 'ask whitfield evening', 'go bar', 'ask barkeep list'];

describe('round 4: the reasoning lines (docs/55 1)', () => {
  it('after a watcher’s list, the thought says who had gone out by the hour that mattered', () => {
    const run = night(11, 0, 'lost-item', RAW11.slice(0, 4));
    const page = prose(run.log[run.log.length - 1] as Page);
    // (docs/59 item 3: the consequence, never the list again.)
    expect(page).toMatch(/Steinbach and Bellucci had been at Kowalski’s at eight and nine, where the spare key was kept,\s+and (?:gone before|had left by) ten/);
    expect(page).not.toMatch(/hour that mattered|nobody else|’s list/);
    expect(page).not.toMatch(/it said Rafferty was at Kowalski’s at ten/);
  });

  it('a refusal points at a watched place from the liar’s own story, at the nearest hour', () => {
    const run = night(8, 5, 'murder', HB8);
    const page = prose(run.log[run.log.length - 1] as Page).replace(/\s+/g, ' ');
    expect(page).toMatch(/the Automat at nine/);
    // (docs/62, P13: "I’d ask at the Automat about ten too", not "the first place I’d ask".)
    expect(page).toMatch(/the Automat (?:might know|was the first place I’d ask|might know about) |I’d ask at the Automat about /);
  });

  it('docs/67: no hand-off, so nothing on the page says where to go next or what to ask there', () => {
    const run = night(14, 4, 'lost-pet', MED14);
    const page = prose(run.log[run.log.length - 1] as Page).replace(/\s+/g, ' ');
    // (Before: "Pickering had walked over from the Delmonico rooms at ten, and might have passed somebody on
    // the way." and "I wanted to know who else had been on the street then.": the star said aloud.)
    expect(page).not.toMatch(/I wanted to know who|might have passed somebody on the way|on the street then/);
    expect(page).not.toMatch(/place behind them|that ground for myself/);
    expect(run.log.every((p) => p.board?.handoff === undefined)).toBe(true);
  });

  it('the lints catch a thought against the grid, "it turned out" for somebody there all along, sitting twice and knocking inside', () => {
    const d = dealBoard(8, 5, 'murder');
    const run = night(8, 5, 'murder', HB8.slice(0, 6));
    const last = run.log.length - 1;
    const with_ = (text: string, at = last): BoardRun => ({ ...run, log: run.log.map((p, i) => (i === at ? { ...p, blocks: [{ kind: 'prose', text, voice: 'thought' }] } : p)) });
    const rules = (r: BoardRun) => proseIssues(d, r).map((x) => x.rule);
    // Grasso's ten o'clock collides with Mrs. Sirkin's list by the end of her page.
    expect(rules(with_('I had nothing to put against it and nothing to put under it, so I put it on the page and left it alone.'))).toContain('grid');
    expect(rules(with_('Grasso said home at ten, and I had nobody else’s word for it. The story squared with what I’d been told.'))).toContain('grid');
    expect(rules(with_('It turned out Thorndike was in the front room, in the good chair.'))).toContain('turned-out');
    expect(rules(with_('Thorndike, it turned out, had come back in and was in the front room.'))).not.toContain('turned-out');
    expect(rules(with_('I took the chair nearest the door. Then I stood on the mat with my hat in my hand.'))).toContain('posture');
    expect(rules(with_('I took the chair nearest the door. I got up. I stood on the mat with my hat in my hand.'))).not.toContain('posture');
    expect(rules(with_('I knocked, and the door took its time.'))).toContain('inside');
  });
});

describe('round 4: facts and continuity (docs/55 2)', () => {
  it('a home is said as the place it is, the first time a page says it', () => {
    const d = dealBoard(8, 5, 'murder');
    expect(nameHomes(d.kase, 'Grasso said home at ten. She said home again.', new Set())).toBe('Grasso said home at the Delmonico rooms at ten. She said home again.');
    // Renfro's flat is called after him: "home" says it.
    expect(nameHomes(d.kase, 'Renfro said home at nine.', new Set())).toBe('Renfro said home at nine.');
  });

  it('nobody else, besides the one who was there all evening', () => {
    const run = night(11, 0, 'lost-item', RAW11.slice(0, 7));
    // (docs/59 item 2: told by what changed, and "nobody else" once for the span, after everybody it had.)
    const text = prose(run.log[run.log.length - 1] as Page).replace(/\s+/g, ' ');
    expect(text).toMatch(/Pardo was in the whole evening and never left\. He buys things\./);
    // (docs/62, P2: with somebody in later under a coat, nobody else came in till then.)
    expect(text).toMatch(/Steinbach came in at ten\. (?:Nobody|No one) else(?: came in (?:till|before) eleven)?/);
  });

  it('the pet’s basket is a basket, and the client is still the client', () => {
    const run = night(14, 4, 'lost-pet', []);
    const page = prose(run.log[0] as Page);
    expect(page).not.toMatch(/my client was gone|in my client’s basket/);
    expect(page).toMatch(/the burial society’s meeting/);
  });

  it('the office asks where the dead man had been before the client says, and the dead man isn’t "found dead"', () => {
    for (const [s, t] of [[5, 2], [8, 5]] as const) {
      const page = prose(night(s, t, 'murder', []).log[0] as Page).replace(/\s+/g, ' ');
      // (docs/60 item 3: lean, the dead man by name where "he" could be the finder.)
      expect(page).toMatch(/(?:I asked where (?:he’d|[A-Z][\w’]+ had) spent the evening\.|“Where had he been earlier(?: in the evening)?\?” I asked\.|“Where had he been tonight\?” I asked\.|“Was he out at all tonight\?” I asked\.) “(?:The|[^”]{0,30} the) (?:Shamrock|Odessa)/);
      expect(page).not.toMatch(/found dead/);
    }
  });

  it('a widowed client keeps her "Mrs."', () => {
    const d = dealBoard(11, 0, 'lost-item');
    expect(titleClient(d.kase, 'Marchetti came in. The Marchetti flat. The late Mr. Marchetti.')).toBe('Mrs. Marchetti came in. The Marchetti flat. The late Mr. Marchetti.');
    expect(prose(night(11, 0, 'lost-item', []).log[0] as Page)).toMatch(/Mrs\. Marchetti/);
  });
});

describe('round 4: stars, the report and the curtain (docs/55 4, 5, 7)', () => {
  it('a star names the person and the question, in the room with them (docs/67: no star at Medium unasked, and no hints there)', () => {
    const d = dealBoard(14, 4, 'lost-pet');
    const run = night(14, 4, 'lost-pet', MED14);
    expect(pageStars(d, run)).toEqual([]);
    expect(starCommand(d, run, 'account:pickering')).toBe('ask pickering evening');
    // (Round 7, B4: the walk said as what's known, then the question.)
    expect(starReason(d.kase, run, 'account:pickering')).toBe('Pickering walked over from the Delmonico rooms at ten — ask Pickering who she passed on the way');
  });

  it('the report doesn’t put the line that breaks the story first, alone', () => {
    const save = { game: 'dashiell-play', version: 1, engine: 'board', seed: 14, tier: 4, type: 'lost-pet', detective: 'Dashiell', events: ['go scene', 'search scene', 'go neighbours', 'ask whitfield evening', 'go bar', 'ask barkeep list', 'go h', 'ask thorndike evening', 'go u', 'ask alfano evening', 'put alfano 10 list:barkeep@10', 'ask fairbanks evening', 'go bar', 'ask pickering evening'].map((x) => ({ do: x })), person: null, picker: null, claim: null };
    const d = dealBoard(14, 4, 'lost-pet');
    let run = newBoardRun(d);
    for (const e of save.events) run = stepBoard(d, run, e.do).run;
    const opts = breakOptionsShown(d, run, 'thorndike');
    const touching = opts.filter((o) => o.touches);
    expect(touching.length).toBeGreaterThan(2);
    expect(touching[0]?.value).not.toBe('remark:account:pickering#0');
  });

  it('the report quotes what the page said', () => {
    const d = dealBoard(11, 0, 'lost-item');
    const run = night(11, 0, 'lost-item', RAW11);
    const crack = whereByOptions(d, run).find((o) => o.value.startsWith('crack:'));
    const quote = /“([^”]*)/.exec(crack?.label ?? '')?.[1]?.slice(0, 20) ?? '\u0000';
    expect(prose(run.log[run.log.length - 1] as Page).replace(/\s+/g, ' ')).toContain(quote);
  });

  it('the curtain says the shortest night in calls, the number the verdict uses', () => {
    const d = dealBoard(8, 5, 'murder');
    // (Round 8, B6, docs/73: by kind; the table's search isn't a question.)
    expect(curtainOfBoard(d)).toContain('THE FASTEST SOLVE: 13 actions (6 questions, a search, a look at the papers for the motive and 5 walks)');
  });

  it('the CLI says what picking somebody costs, not a count that reads as a price (round 5, U1)', () => {
    const files = new Map<string, string>();
    const io = { read: (p: string) => files.get(p) ?? null, write: (p: string, s: string) => void files.set(p, s) };
    runPlay(['new', '--seed', '14', '--tier', '4', '--type', 'lost-pet', '--save', 's', '--no-teach'], io);
    const save = JSON.parse(files.get('s') as string);
    files.set('s', JSON.stringify({ ...save, events: MED14.slice(0, 3).map((x) => ({ do: x })) }));
    const out = runPlay(['look', '--save', 's'], io).out;
    expect(out).toMatch(/\d questions?$/m);
    expect(out).not.toMatch(/free · /);
    expect(out).not.toMatch(/\d topics?\b/);
  });
});

describe('round 4: variety across nights (docs/55 6)', () => {
  it('the profile keeps the last ten nights’ dealing, and the hand never deals last night’s remembered lines again', () => {
    let profile = emptyProfile();
    let prev = false;
    for (const [s, t, ty] of [[11, 0, 'lost-item'], [5, 2, 'murder'], [14, 4, 'lost-pet'], [8, 5, 'murder'], [11, 0, 'lost-item'], [5, 2, 'murder']] as const) {
      const d = dealBoard(s, t, ty);
      let run = newBoardRun(d, { seen: seenOf(profile) });
      for (const c of playBoardOracle(d).commands) run = stepBoard(d, run, c).run;
      const coat = run.log.some((p) => /came off a rack/.test(prose(p)));
      expect(coat && prev, `seed ${s}`).toBe(false);
      prev = coat;
      profile = recordRun(profile, { tier: t, points: 4, asked: 4, actionsUsed: run.used, par: run.used, dealt: dealtIds(run.spent) }).profile;
    }
    expect(sanitizeProfile(JSON.parse(JSON.stringify(profile))).dealt?.length).toBe(6);
    expect(dealtIds(['v:list/x#1', 'v:list/x#2', 'bcn-1', 'two-stories#1'])).toEqual(['v:list/x', 'bcn-1', 'two-stories#1']);
  });

  it('no more than about half of a night’s pages end on a thing with feelings', () => {
    expect(thingClose('The radiator knocked again. I didn’t answer it.')).toBe(true);
    expect(thingClose('The landlady folded her hands.')).toBe(false);
    expect(thingClose('I buttoned my coat.')).toBe(false);
    const close = (text: string, alt?: string): Item[][] => [[{ kind: 'gap', slot: 'close', beat: 'close', voice: 'thought', text, ...(alt ? { alts: () => [{ text: alt, take: () => undefined }] } : {}) } as Item]];
    const thingPage = { n: 0, head: '', cost: 1, cardsUsed: [], at: 'x', board: { job: 'account', told: [], hours: [], people: [], places: [] }, blocks: [{ kind: 'prose', text: 'The samovar steamed.', voice: 'thought' }] } as Page;
    const a = close('The radiator knocked again.', 'I let myself out.');
    capThingClose(a, [thingPage, thingPage]);
    expect(a[0]?.[0]?.text).toBe('I let myself out.');
    const b = close('The radiator knocked again.');
    capThingClose(b, []);
    expect(b[0]?.[0]?.text).toBe('The radiator knocked again.');
  });
});
