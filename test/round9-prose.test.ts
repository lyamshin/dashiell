/**
 * docs/74, round9-prose: the round-9 blind playtest's narration slips and round 8's leftovers, each by
 * rule in the layer that makes the line: the turn says the office's hours, the means and the clash once,
 * and the notebook says what's held as a person says it (item 1); the means rule once, on the find (2);
 * the poison's vessel one thing everywhere (3); no "Cocoa is what you make for a friend" (4); the
 * notebook's pointer on what the office's rested on (5); the story's weapon as the scene had it (6); a lie
 * borrowing nothing from the truth (7); the victim topic said as the motive, and never "hadn’t mentioned
 * it" of what the office said (8, round 8's B7); the continuity list (9, B8 and round 9's). The testers'
 * nights on their routes, and the hinge rules over nights.
 */
import { describe, expect, it } from 'vitest';
import { typesFor, type CaseType, type TierIndex } from '../src/gen/board/index.js';
import { newBoardRun, stepBoard } from '../src/game/board/engine.js';
import { hingeIssues, nightIssues, type HingeRule } from '../src/game/board/hinge-lint.js';
import { levelIssues } from '../src/game/board/lint.js';
import { boardChoices } from '../src/game/board/choices.js';
import { dealBoard, type BoardDeal, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle, playReader, playWanderer } from '../src/game/board/oracle.js';
import { gossipSaidAs, recapClauses } from '../src/game/board/pages.js';
import { storyOfBoard } from '../src/game/board/report.js';
import { MEANS_RULE, sumsInSentence } from '../src/game/board/sum-lint.js';
import { notebookText, officeLines, pageBodyText } from '../src/game/board/text.js';
import { walkBetween } from '../src/game/board/walk.js';
import { vesselOf } from '../src/game/board/when.js';
import { OFFICE } from '../src/game/board/model.js';

const route = (d: BoardDeal, cmds: string[]): BoardRun => {
  let run = newBoardRun(d);
  for (const cmd of cmds) run = stepBoard(d, run, cmd).run;
  return run;
};
const flat = (s: string) => s.replace(/\s+/g, ' ');
const pageOf = (run: BoardRun, q: string) => flat(pageBodyText(run.log.find((p) => p.board?.q === q) ?? run.log[0]!));
const turnPage = (run: BoardRun) => run.log.find((p) => p.board?.turn);
/** The turn as the page says it: what follows its chapter heading. */
const turnOf = (run: BoardRun) => {
  const p = turnPage(run);
  if (!p) return '';
  const i = p.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'chapter');
  return flat(p.blocks.slice(i + 1).map((b) => (b.kind === 'prose' ? b.text : '')).join(' '));
};
const rules = (d: BoardDeal, run: BoardRun, rs: HingeRule[]) => [...hingeIssues(d, run), ...nightIssues(d, run)].filter((x) => rs.includes(x.rule));

// The round-9 testers' routes (their saves, the actions only), and round 8's two the brief names.
const POACHED37 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'ask vogel evening', 'put vogel 10 list:xwatcher@10', 'go bar', 'ask barkeep list', 'go u', 'ask brennan evening', 'put brennan 10 list:barkeep@10', 'ask schilling evening'];
const MEDIUM37 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask prentiss evening', 'ask broadnax evening', 'go u', 'ask sirkin evening', 'go h', 'ask ashby evening', 'put ashby 10 remark:account:broadnax#0', 'go u', 'put sirkin 10 list:xwatcher@10'];
const HB39 = ['go bar', 'ask barkeep list', 'ask obermann evening', 'go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go h', 'ask tillman evening', 'put tillman 10 list:barkeep@10', 'go u', 'ask thorndike evening', 'ask feldman evening'];
const HB34 = ['go scene', 'search scene', 'search papers', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'ask pickering evening', 'go u', 'ask steinbach evening', 'ask ukeeper list', 'go h', 'ask hargrove evening', 'put hargrove 10 list:barkeep@10'];
const MEDIUM33 = ['go scene', 'search papers', 'search scene', 'go rooming', 'ask xwatcher list', 'go bar', 'ask barkeep list', 'go u', 'ask kavanagh evening', 'put kavanagh 10 list:xwatcher@10', 'ask ainsworth evening', 'go h', 'ask hauck evening', 'ask hauck motive', 'go bar', 'ask dandridge motive'];

/** Every night, both worlds, a few a tier, on the oracle's, the wanderer's and the reader's routes. */
function overNights(tiers: TierIndex[], n: number, each: (d: BoardDeal, run: BoardRun, tag: string) => void): void {
  for (const world of [undefined, 'neighbourhood'] as const) {
    for (const tier of tiers) {
      const types = typesFor(tier);
      for (let s = 1; s <= n; s++) {
        const d = dealBoard(s, tier, types[s % types.length] as CaseType, world ? { world } : {});
        for (const [r, run] of [['oracle', playBoardOracle(d).run], ['wanderer', playWanderer(d, s).run], ['reader', playReader(d, s).run]] as const) each(d, run, `${world ?? 'dealt'} ${d.kase.id} ${r}`);
      }
    }
  }
}

describe('round 9, item 1: the turn says the hours, the means and the clash, once; the notebook says what’s held as a person would', () => {
  it('Poached 37: the turn after Vogel’s evening says the office’s hour and the laudanum, not the clash the thought just said, nor what’s held', () => {
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, POACHED37);
    const turn = turnOf(run);
    expect(turn).toContain('Rosenbaum had given me ten o’clock.');
    expect(turn).toMatch(/\blaudanum\b[^.]*Kowalski’s/);
    expect(turn).not.toMatch(/\btold it\b|\bcome and go\b|\bcame and went\b|\btheir evening\b/);
    expect(turn).not.toMatch(/said otherwise|home at ten/);
    // The clash, said once on the page: in the thought above the turn.
    expect(flat(pageBodyText(turnPage(run)!))).toContain('Vogel had said he was home at Kowalski’s at ten, and Mrs. Kowalski hadn’t seen him there.');
  });
  it('Medium 37 and Hard-boiled 34: the same, after Sirkin’s evening and after Hargrove’s refusal (the put said it to her face)', () => {
    const m = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    expect(turnOf(m)).toMatch(/^Lathrop had given me nine or ten o’clock\. The revolver had come from Mrs\. Nagy’s\./);
    expect(turnOf(m)).not.toMatch(/said otherwise|told them|come and go/);
    const h = route(dealBoard(34, 5, 'murder'), HB34);
    expect(turnOf(h)).toMatch(/^Hanrahan had given me nine or ten o’clock\. The chloral had come from Kowalski’s\./);
    expect(turnOf(h)).not.toMatch(/wouldn’t say|told them|come and go/);
  });
  it('the notebook keeps what’s held, said as a person says it, under "Where things stand"', () => {
    const d = dealBoard(37, 4, 'murder');
    const run = route(d, MEDIUM37);
    const nb = flat(notebookText(d, run));
    expect(nb).toContain('Where things stand:');
    expect(nb).not.toContain('How it adds up');
    expect(nb).toContain('Prentiss, Broadnax, Sirkin and Ashby had each told me their evening. Mrs. Nagy and Alfano had told me who came and went.');
    const one = route(dealBoard(37, 2, 'murder'), POACHED37.slice(0, 6));
    expect(recapClauses(dealBoard(37, 2, 'murder'), one).map((x) => x.text)).toContain('Vogel had told me his evening. Mrs. Kowalski had told me who came and went.');
  });
  it('"Go over what I have" says it as the notebook does, and the turn-says rule holds over nights from Poached up', () => {
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, [...POACHED37.slice(0, 6), 'recap']);
    const said = flat(pageBodyText(run.log[run.log.length - 1]!));
    expect(said).toMatch(/Vogel had (?:told me|walked me through) his evening[.,] (?:and )?Mrs\. Kowalski had told me who came and went\./);
    // (Never his name for "his": "Obermann had told me Obermann’s evening" where another man was in the sentence.)
    const hb = route(dealBoard(39, 5, 'murder'), [...HB39.slice(0, 8), 'recap']);
    expect(flat(pageBodyText(hb.log[hb.log.length - 1]!))).toMatch(/Obermann had (?:told me|walked me through) his evening/);
    overNights([2, 3, 4, 5], 3, (dd, r, tag) => expect(rules(dd, r, ['turn-says']), tag).toEqual([]));
  });
});

describe('round 9, item 2: the means rule, said once from Poached up, on the find', () => {
  it('Medium 37’s find says the hour the revolver had to be had by, of the dead man; Poached (one hour) says none', () => {
    const m = route(dealBoard(37, 4, 'murder'), MEDIUM37.slice(0, 2));
    expect(pageOf(m, 'search:scene')).toContain('Whoever shot Tillman had to fetch the revolver from Mrs. Nagy’s before nine, the earliest he could have been shot.');
    const p = route(dealBoard(37, 2, 'murder'), POACHED37.slice(0, 2));
    expect(pageOf(p, 'search:scene')).not.toMatch(/\bbefore (?:nine|ten)\b|\bearliest\b/);
  });
  it('the sum lint reads it as a frame, and lets it stand once, on the find', () => {
    const d = dealBoard(37, 4, 'murder');
    const line = 'Whoever shot Tillman had to fetch the revolver from Mrs. Nagy’s before nine, the earliest he could have been shot.';
    expect(MEANS_RULE.test(line)).toBe(true);
    expect(sumsInSentence(d.kase, line)).toContain('frame');
    expect(levelIssues(d, route(d, MEDIUM37)).filter((x) => x.rule === 'sum')).toEqual([]);
  });
  it('over nights: every windowed murder’s find says it, and never "the earliest it could have happened"', () => {
    overNights([3, 4, 5], 3, (d, run, tag) => {
      expect(rules(d, run, ['deadline']), tag).toEqual([]);
      expect(levelIssues(d, run).filter((x) => x.rule === 'sum'), tag).toEqual([]);
      for (const p of run.log) expect(pageBodyText(p), tag).not.toContain('the earliest it could have happened');
    });
  });
});

describe('round 9, items 3 and 4: what carried the poison, and no friend in the cocoa', () => {
  it('Poached 37: the office, the notebook and the story all have the cocoa', () => {
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, POACHED37);
    expect(vesselOf(d.kase)).toBe('cocoa');
    expect(flat(pageBodyText(run.log[0]!))).toContain('The chop house sent up his supper at ten, and the laudanum was in the cocoa he had with it.');
    expect(officeLines(d).join(' ')).toContain('the laudanum was in the cocoa he had with it');
    expect(storyOfBoard(d).join(' ')).toContain('the laudanum went into the cocoa');
    expect(rules(d, run, ['vessel'])).toEqual([]);
  });
  it('a supper with chloral is a drink (two glasses on the table)', () => {
    const d = dealBoard(2, 2, 'murder');
    expect(d.kase.givens.lines?.some((g) => g.kind === 'clock' && g.id === 'supper')).toBe(true);
    expect(vesselOf(d.kase)).toBe('drink');
    expect(officeLines(d).join(' ')).toContain('the chloral was in the drink he had with it');
  });
  it('"Cocoa is what you make for a friend" is gone: the find says only that he let them in', () => {
    const run = route(dealBoard(39, 5, 'murder'), HB39);
    expect(pageOf(run, 'search:scene')).not.toMatch(/\bfriend\b/);
    overNights([1, 2, 4], 3, (d, r, tag) => expect(rules(d, r, ['vessel', 'retired']), tag).toEqual([]));
  });
});

describe('round 9, item 5: the notebook’s pointer rests on what the office’s did', () => {
  it('Poached 37: the office said the reason as the client’s own, and the notebook has no neighbors', () => {
    const d = dealBoard(37, 2, 'murder');
    const g = d.kase.givens.lines?.find((x) => x.kind === 'pointer');
    expect(g && gossipSaidAs(d.kase, g).as).toBe('motive');
    expect(flat(pageBodyText(route(d, []).log[0]!))).not.toMatch(/\bneighbors\b/);
    const nb = officeLines(d).find((t) => /points at/.test(t)) ?? '';
    expect(nb).toBe('Rosenbaum points at Vogel: he owed Hargrove four hundred dollars.');
  });
  it('over nights, the notebook says the neighbors only where the office did', () => {
    overNights([1, 3, 5], 4, (d, r, tag) => expect(rules(d, r, ['gossip']), tag).toEqual([]));
  });
});

describe('round 9, item 6 and item 9’s story: the story says what play said', () => {
  it('Medium 37: the revolver from the hall-stand drawer, and no late husband', () => {
    const d = dealBoard(37, 4, 'murder');
    const story = storyOfBoard(d).join(' ');
    expect(story).toContain('took the revolver from the hall-stand drawer.');
    expect(story).not.toMatch(/husband/);
  });
  it('"as if he had never left" only of a place he had been before', () => {
    overNights([0, 1, 2, 3, 4, 5], 4, (d, r, tag) => expect(rules(d, r, ['story']), tag).toEqual([]));
  });
});

describe('round 9, item 7: a lie borrows nothing from the truth', () => {
  it('Medium 37: Sirkin at the print shop at ten says he went home, never that he closed up', () => {
    const run = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    const p = pageOf(run, 'account:sirkin');
    expect(p).toContain('At ten I turned in early, home at Mrs. Nagy’s');
    expect(p).not.toMatch(/closed up/);
  });
  it('a lie at an hour they were at work: "locked up at nine and went down to the Shamrock" goes to the Shamrock (Coddled 15)', () => {
    const d = dealBoard(15, 1, 'murder');
    const run = playBoardOracle(d).run;
    for (const p of run.log) expect(pageBodyText(p)).not.toMatch(/\blocked up at nine and went down to the Shamrock\b/);
    expect(rules(d, run, ['lie-leak'])).toEqual([]);
    overNights([1, 3, 4], 5, (dd, r, tag) => expect(rules(dd, r, ['lie-leak']), tag).toEqual([]));
  });
});

describe('round 9, item 8 (round 8, B7): the victim topic is the motive, and agrees with the office', () => {
  it('the topic is labelled as the motive', () => {
    const d = dealBoard(37, 2, 'murder');
    const run = route(d, ['go rooming']);
    const labels = boardChoices(d, run).flatMap((g) => g.choices.map((c) => c.label));
    expect(labels).toContain('Hargrove (the motive)');
  });
  it('Medium 33 on the tester’s route: Hauck’s reason was the office’s, Dandridge’s wasn’t, and the motive pages say so', () => {
    const d = dealBoard(33, 4, 'murder');
    const run = route(d, MEDIUM33);
    expect(pageOf(run, 'motive:hauck')).not.toMatch(/hadn’t (?:mentioned|brought it up|said a word)/);
    expect(pageOf(run, 'motive:dandridge')).toMatch(/hadn’t (?:mentioned|brought it up|said a word)|had left that out/);
    expect(rules(d, run, ['topic'])).toEqual([]);
  });
  it('over nights, never "hadn’t mentioned it" of what the office said, nor "in the office" of what it didn’t', () => {
    let asked = 0;
    overNights([1, 2, 3, 4, 5], 6, (d, run, tag) => {
      asked += run.log.filter((p) => p.board?.job === 'motive').length;
      expect(rules(d, run, ['topic']), tag).toEqual([]);
    });
    expect(asked).toBeGreaterThan(20);
  });
});

describe('round 9, item 9 (round 8, B8, and round 9): continuity', () => {
  it('the body-finder: never kept past the last hour, on a list or in their own evening', () => {
    const run = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    expect(pageOf(run, 'list:barkeep')).toContain('Broadnax was in early on, out after eight, and back at ten.');
    const h = route(dealBoard(34, 5, 'murder'), HB34);
    expect(pageOf(h, 'account:steinbach')).toContain('and stayed through ten');
    expect(pageOf(h, 'account:steinbach')).not.toMatch(/rest of the evening/);
    overNights([1, 2, 3, 4, 5], 4, (d, r, tag) => expect(rules(d, r, ['finder']), tag).toEqual([]));
  });
  it('the Orpheum is open when I’m in it: shows all night, the second feature, a friend who said the picture was good, one usher at the back', () => {
    const run = route(dealBoard(37, 2, 'murder'), POACHED37);
    const all = run.log.map((p) => flat(pageBodyText(p))).join(' ');
    expect(all).toContain('a picture house with continuous shows all night');
    expect(all).not.toMatch(/till midnight|the second show|in the show|front of the house/);
    expect(all).toContain('because a friend had said the picture was good');
    overNights([0, 2, 4, 5], 3, (d, r, tag) => expect(rules(d, r, ['picture']), tag).toEqual([]));
  });
  it('the small slips: a flat isn’t a rooming house, a first visit isn’t "again", the doorway or the knees, a fiancée is "Miss", a bench has no bar', () => {
    const d = dealBoard(37, 2, 'murder');
    expect(flat(notebookText(d, route(d, POACHED37)))).toContain('Miss Bella Rosenbaum: my client, Hargrove’s fiancée.');
    const m = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    expect(pageOf(m, 'search:scene')).not.toMatch(/from the doorway[\s\S]*my knees|my knees[\s\S]*from the doorway/);
    const hb = route(dealBoard(39, 5, 'murder'), HB39);
    expect(pageOf(hb, 'account:obermann')).not.toMatch(/\bthe bar\b/);
    overNights([0, 1, 2, 3, 4, 5], 3, (dd, r, tag) => expect(rules(dd, r, ['slips']), tag).toEqual([]));
  });
  it('a return visit refers back only to what was set up: no tin sign on a first visit, no "welcome"', () => {
    const m = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    const firstPrint = m.log.findIndex((p) => p.at === 'u');
    expect(flat(pageBodyText(m.log[firstPrint]!))).not.toMatch(/tin sign/);
    expect(m.log.map((p) => pageBodyText(p)).join(' ')).not.toMatch(/The welcome was about/);
    overNights([1, 2, 3, 4, 5], 3, (d, r, tag) => expect(rules(d, r, ['return']), tag).toEqual([]));
  });
  it('the walks: a bearing says the way that matters, no "It was…" twice running, no "from there" with nothing to point at', () => {
    const d = dealBoard(33, 4, 'murder');
    expect(walkBetween(d.kase, OFFICE, d.kase.crime.scene).dir).toBe('east');
    const m = route(dealBoard(37, 4, 'murder'), MEDIUM37);
    const walks = m.log.map((p) => (p.board?.units ?? []).find((u) => u.beat === 'walk')?.text ?? '').filter(Boolean);
    expect(walks.join(' ')).not.toMatch(/two blocks over east|from there, with|The next stop was/);
    overNights([0, 2, 3, 4, 5], 3, (dd, r, tag) => expect(rules(dd, r, ['walk-it']), tag).toEqual([]));
  });
  it('the keeper’s own place, from the agreement side: never "Sokol saw Belkin at Sokol’s" on Sokol’s own page', () => {
    const d = dealBoard(8, 2, 'lost-pet', { world: 'neighbourhood' });
    const run = playReader(d, 8).run;
    expect(rules(d, run, ['keeper'])).toEqual([]);
    expect(run.log.map((p) => flat(pageBodyText(p))).join(' ')).not.toMatch(/\bSokol saw Belkin at Sokol’s\b/);
  });
});
