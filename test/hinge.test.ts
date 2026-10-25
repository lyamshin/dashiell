/**
 * docs/62: the hinge lints, a rule at a time: each catches the line the round-5 testers stopped on, and
 * passes the line this build says instead. (Over whole nights they run in `round3.test.ts`'s prose
 * lints, every tier and type, both routes, and in `board-prose`.)
 */

import { describe, expect, it } from 'vitest';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { epilogueIssues, hingeIssues, type HingeRule } from '../src/game/board/hinge-lint.js';
import type { Block, Page, PageJob, ProseVoice } from '../src/game/board/types.js';

const d = dealBoard(5, 2, 'murder');
const run = playBoardOracle(d).run;
const base = run.log[1] as Page;

type B = { text: string; voice?: ProseVoice };
const pg = (job: PageJob, blocks: B[], extra: Partial<Page['board']> = {}): Page => ({
  ...base,
  blocks: blocks.map((b) => ({ kind: 'prose', text: b.text, voice: b.voice ?? 'narrator' }) as Block),
  board: { ...base.board, job, q: undefined, units: undefined, ...extra },
});
const night = (...pages: Page[]): BoardRun => ({ ...run, log: pages.map((p, n) => ({ ...p, n })) });
const rules = (r: BoardRun, dd = d): HingeRule[] => hingeIssues(dd, r).map((x) => x.rule);

describe('docs/62: the hinge lints, a rule at a time', () => {
  it('said-place: a place as the object of said or told', () => {
    expect(rules(night(pg('account', [{ text: 'One thing didn’t add up. Reinhardt had said the Shamrock at nine, and Zeldin hadn’t seen her there.', voice: 'thought' }])))).toContain('said-place');
    expect(rules(night(pg('confront', [{ text: '“You told me home at nine,” I said.', voice: 'exchange' }])))).toContain('said-place');
    expect(rules(night(pg('account', [{ text: 'One thing didn’t add up. Reinhardt had said she was at the Shamrock at nine, and Zeldin hadn’t seen her there.', voice: 'thought' }])))).not.toContain('said-place');
  });

  it('gloss: who somebody is, once a night', () => {
    const p = pg('list', [{ text: 'Zeldin, the bartender, was behind the bar.' }]);
    expect(rules(night(p, p))).toContain('gloss');
    expect(rules(night(p, pg('list', [{ text: 'Zeldin was behind the bar.' }])))).not.toContain('gloss');
  });

  it('bare: nobody appears without who they are', () => {
    expect(rules(night(pg('list', [{ text: 'Zeldin was behind the bar.' }])))).toContain('bare');
    expect(rules(night(pg('list', [{ text: 'Zeldin, the bartender, was behind the bar.' }])))).not.toContain('bare');
  });

  it('put-lead and put-speech: the put says it to their face, as a person says it', () => {
    const lead = pg('confront', [
      { text: 'Reinhardt had told me she was at the Shamrock at nine, and Zeldin said otherwise.' },
      { text: '“You told me you were at the Shamrock at nine,” I said. “Zeldin said only Hanrahan and Winslow were at the Shamrock at nine o’clock.”', voice: 'exchange' },
    ]);
    expect(rules(night(lead))).toEqual(expect.arrayContaining(['put-lead', 'put-speech']));
    const plain = pg('confront', [
      { text: 'I went over to Reinhardt.' },
      { text: '“You told me you were at the Shamrock at nine,” I said. “Zeldin saw Hanrahan and Winslow at the Shamrock at nine, and not you.”', voice: 'exchange' },
    ]);
    expect(rules(night(plain)).filter((r) => r === 'put-lead' || r === 'put-speech')).toEqual([]);
  });

  it('thought-who and orphan: a thought says who, and "That much checked out." follows what checked out', () => {
    const answer = { text: '“Nine sharp, I went to the Palace to meet Ruggiero.”', voice: 'answer' as const };
    expect(rules(night(pg('account', [answer, { text: 'So she had it right, and Ruggiero said the same: the Palace at nine.', voice: 'thought' }])))).toContain('thought-who');
    expect(rules(night(pg('account', [answer, { text: 'So she told it the same as Ruggiero: the Palace at nine. That much checked out.', voice: 'thought' }])))).toEqual([]);
    expect(rules(night(pg('account', [answer, { text: 'That much checked out.', voice: 'thought' }])))).toContain('orphan');
  });

  it('shift: a watcher who came on late starts from the shift', () => {
    const d8 = dealBoard(8, 5, 'murder');
    const late = d8.kase.lists.find((l) => l.entries[d8.kase.board.hours[0] as number] === undefined);
    expect(late).toBeDefined();
    const q = `list:${late?.watcher}`;
    const r8 = playBoardOracle(d8).run;
    const at = (text: string): BoardRun => ({ ...r8, log: [{ ...(r8.log[1] as Page), n: 0, blocks: [{ kind: 'prose', text, voice: 'answer' }], board: { ...(r8.log[1] as Page).board, job: 'list', q } }] });
    expect(rules(at('“Grasso was in all evening. On at ten.”'), d8)).toContain('shift');
    expect(rules(at('“On at ten. Anything earlier, I can’t say. Grasso was in as long as I was.”'), d8)).not.toContain('shift');
  });

  it('telling, form, reason: the turn says what was said, the report is the report, no stock phrases', () => {
    expect(rules(night(pg('confront', [{ text: 'Mrs. Cheatham had told me who came in. Reinhardt had told me where the evening went.' }])))).toContain('telling');
    expect(rules(night(pg('confront', [{ text: 'I laid out the form on the bar.' }])))).toContain('form');
    expect(rules(night(pg('account', [{ text: 'At nine, one of the two hours it could have happened, Dandridge was still at the Shamrock.', voice: 'thought' }])))).toContain('reason');
    const clean = rules(night(pg('confront', [{ text: 'I knew from Mrs. Cheatham who had come and gone. I had the evening as Reinhardt told it.' }, { text: 'I laid out the report on the bar.' }])));
    expect(clean.filter((r) => r === 'telling' || r === 'form' || r === 'reason')).toEqual([]);
  });

  it('dose: a poisoning says when the dose went in, not "died"', () => {
    expect(rules(night(pg('list', [{ text: 'So Hanrahan and Winslow were at the Shamrock at nine, when Dandridge could have died.', voice: 'thought' }])))).toContain('dose');
    expect(rules(night(pg('list', [{ text: 'So Hanrahan and Winslow were at the Shamrock at nine, when Dandridge was given the laudanum.', voice: 'thought' }])))).not.toContain('dose');
  });

  it('unwatched: nobody watching, once a night', () => {
    const p = pg('arrive', [{ text: 'Nobody kept watch in a place like that.' }]);
    expect(rules(night(p, p))).toContain('unwatched');
    expect(rules(night(p, pg('arrive', [{ text: 'It was warmer in than out.' }])))).not.toContain('unwatched');
  });

  it('pointer: a page asks, and doesn’t open on a pointer of its own', () => {
    expect(rules(night(pg('account', [{ text: 'Zeldin had seen Reinhardt at the Shamrock at seven and ten.' }, { text: '“Start writing.”', voice: 'answer' }])))).toContain('pointer');
    expect(rules(night(pg('account', [{ text: 'Zeldin had seen Reinhardt at the Shamrock at seven and ten, so I asked her to walk me through her night.' }, { text: '“Start writing.”', voice: 'answer' }])))).not.toContain('pointer');
  });

  it('connector and tail: an evening without the machine’s joins, alone in the hour’s clause', () => {
    expect(rules(night(pg('account', [{ text: '“At eight I was home. Next was ten. I went to the Palace. Alone at ten.”', voice: 'answer' }])))).toEqual(expect.arrayContaining(['connector', 'tail']));
    expect(rules(night(pg('account', [{ text: '“At eight I was home. At ten I went to the Palace, on my own.”', voice: 'answer' }])))).toEqual([]);
  });

  it('locative: a spot of one’s own', () => {
    const unit = (text: string) => ({ kind: 'gap', slot: 'arrival', text, beat: 'arrive', para: 0, voice: 'presence' }) as never;
    const twice = 'Hanrahan, a regular, sat at a little table by the wall, and Winslow, a regular, was in a booth by the wall.';
    expect(rules(night(pg('list', [{ text: twice }], { units: [unit(twice)] })))).toContain('locative');
    const once = 'Hanrahan, a regular, sat at a little table by the wall, and Winslow, a regular, was in a booth.';
    expect(rules(night(pg('list', [{ text: once }], { units: [unit(once)] })))).not.toContain('locative');
  });

  it('vocab: a story checks out, and the game\u2019s own words stay out of the page', () => {
    for (const t of ['So Weisglass backed Tillman up: the Shamrock at eleven. That much held.', 'If Ashby said the same, the Palace held where the Delmonico rooms hadn\u2019t.', 'Some of his evening did hold: Wehrle saw him at eight.', 'I went over the put again.', 'That was two calls I didn\u2019t need.', 'I could face Bellucci with it, or file on what I had.', 'I had something for every line on it.', 'I\u2019d read him the wrong line.'])
      expect(rules(night(pg('account', [{ text: t, voice: 'thought' }]))), t).toContain('vocab');
    for (const t of ['So Weisglass backed Tillman up: the Shamrock at eleven. That much checked out.', 'Some of his evening checked out: Wehrle saw him at eight.', 'Pickering was at the window with the curtain held back an inch.', 'I put the pencil away.', 'At eight I went up to Kowalski\u2019s to pay a call.', 'I could face Bellucci with it, or close the case on what I had.', 'I watched him file it away.', 'Grasso: the dead man had kept a file on her.', '“He had a file on me,” she said.', 'I had an answer for every question on it.', 'In my line of work you don\u2019t say thank you.'])
      expect(rules(night(pg('account', [{ text: t, voice: 'thought' }]))).filter((r) => r === 'vocab'), t).toEqual([]);
  });

  it('epilogue: the verdict’s close names the client once', () => {
    expect(epilogueIssues(d.kase, ['I took Moretti through it over coffee, and Moretti listened.']).map((x) => x.rule)).toEqual(['epilogue']);
    expect(epilogueIssues(d.kase, ['I took Moretti through it over coffee, and he listened.'])).toEqual([]);
  });
});
