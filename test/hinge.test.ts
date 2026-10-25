/**
 * docs/62 and docs/66: the hinge lints, a rule at a time: each catches the line the round-5 and round-6 testers stopped on, and
 * passes the line this build says instead. (Over whole nights they run in `round3.test.ts`'s prose
 * lints, every tier and type, both routes, and in `board-prose`.)
 */

import { describe, expect, it } from 'vitest';
import { dealBoard, type BoardRun } from '../src/game/board/model.js';
import { playBoardOracle } from '../src/game/board/oracle.js';
import { epilogueIssues, hingeIssues, type HingeRule } from '../src/game/board/hinge-lint.js';
import { pronounAmbiguity } from '../src/game/board/plan/measure.js';
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

describe('docs/66: the round-6 testers’ joining text, a rule at a time', () => {
  const unit = (text: string, o: Record<string, unknown> = {}) => ({ kind: 'gap', slot: 'why-here', text, beat: 'why', para: 0, voice: 'narrator', ...o }) as never;

  it('unsettled: at the link, a sighting that rules out an hour says the hour it leaves', () => {
    expect(rules(night(pg('list', [{ text: 'At nine, Dandridge was still alive at the Shamrock, and Moretti had said nine or ten.', voice: 'thought' }])))).toContain('unsettled');
    expect(rules(night(pg('list', [{ text: 'At nine, Dandridge was still alive at the Shamrock, and Moretti had said nine or ten. So it happened at ten.', voice: 'thought' }])))).not.toContain('unsettled');
  });

  it('hedge: no "when it could have happened" once the hour is said, and at Hard-boiled the window not again', () => {
    const settled = pg('list', [{ text: 'At nine, Dandridge was still alive at the Shamrock, and Moretti had said nine or ten. So it happened at ten.', voice: 'thought' }]);
    expect(rules(night(settled, pg('list', [{ text: 'So Hanrahan and Winslow were at the Shamrock at ten, when it could have happened.', voice: 'thought' }])))).toContain('hedge');
    expect(rules(night(settled, pg('list', [{ text: 'So Hanrahan and Winslow were at the Shamrock at ten, when Dandridge was given the laudanum.', voice: 'thought' }])))).not.toContain('hedge');
    const d8 = dealBoard(8, 5, 'murder');
    const r8 = playBoardOracle(d8).run;
    const at = (...texts: string[]): BoardRun => ({ ...r8, log: texts.map((text, n) => ({ ...(r8.log[1] as Page), n, blocks: [{ kind: 'prose', text, voice: 'thought' }], board: { ...(r8.log[1] as Page).board, job: 'list', units: undefined } })) });
    expect(rules(at('Carbone was still alive at the Odessa at nine, and Margolis had said nine or ten. So at nine and ten, when it could have happened, Grasso and Renfro had already left the Odessa.'), d8)).toContain('hedge');
    expect(rules(at('Carbone was still alive at the Odessa at nine.'), d8)).not.toContain('hedge');
    expect(rules(at('Grasso said she was at the Automat at nine, when Carbone could have been given the chloral, and nobody had backed it up.', 'He said he was at the Odessa at ten, when Carbone could have been given the chloral.'), d8)).toContain('hedge');
    expect(rules(at('Grasso said she was at the Automat at nine, when Carbone could have been given the chloral, and nobody had backed it up.', 'He said he was at the Odessa at ten.'), d8)).not.toContain('hedge');
  });

  it('restated: the way in says why the place, never where a person in it was seen', () => {
    const said = 'Mrs. Cheatham had seen Hanrahan at the Delmonico rooms at seven and eight.';
    expect(rules(night(pg('arrive', [{ text: said }], { units: [unit(said)] })))).toContain('restated');
    const place = 'Dandridge had been at the Shamrock earlier in the evening.';
    expect(rules(night(pg('arrive', [{ text: place }], { units: [unit(place)] })))).not.toContain('restated');
  });

  it('find and presumes: "I’d find X at Y" once a night; no hand-off that knows what it can’t; no "though" against nothing', () => {
    const find = pg('account', [{ text: 'Reinhardt hadn’t told me her evening yet, and I’d find her at the Shamrock.', voice: 'thought' }]);
    expect(rules(night(find, find))).toContain('find');
    expect(rules(night(find, pg('account', [{ text: 'Reinhardt was at the Shamrock, and still hadn’t told me where she’d been tonight.', voice: 'thought' }])))).not.toContain('find');
    expect(rules(night(pg('list', [{ text: 'I wanted to know who Pickering had passed on the way over at ten.', voice: 'thought' }])))).toContain('presumes');
    expect(rules(night(pg('list', [{ text: 'Pickering had walked over from the Delmonico rooms at ten, and might have passed somebody on the way.', voice: 'thought' }])))).not.toContain('presumes');
    expect(rules(night(pg('account', [{ text: 'Hauck did see him at the Hauck flat at eight, though.', voice: 'thought' }])))).toContain('presumes');
  });

  it('newcomer: somebody an owning up named is met plainly, after the answer', () => {
    const answer = { text: '“Fine. At nine I was at the Palace with Ashby. Ask her.”', voice: 'answer' as const };
    expect(rules(night(pg('confront', [answer, { text: 'Ashby, the woman Ruggiero had named, had come back in by then and was three rows back.', voice: 'thought' }])))).toContain('newcomer');
    expect(rules(night(pg('confront', [answer, { text: 'Ashby was in by then, three rows back.', voice: 'thought' }])))).toEqual([]);
  });

  it('office: a conversation, not a menu, a form or somebody else’s rent', () => {
    const office = (text: string) => night({ ...pg('office', [{ text, voice: 'exchange' }]) });
    expect(rules(office('“Ask about Winslow, a cafeteria cashier,” he said.'))).toContain('office');
    expect(rules(office('“If you want a name, try Winslow, a cafeteria cashier,” he said.'))).not.toContain('office');
    expect(rules(office('Dandridge was found in his own walk-up at half past eleven. The body was found by Ruggiero.'))).toContain('office');
    expect(rules(office('Dandridge was found in his own walk-up at half past eleven, by Ruggiero, a sewing-machine operator.'))).not.toContain('office');
    expect(rules(office('“And Winslow is three weeks behind on the rent.”'))).toContain('office');
    expect(rules(office('“And Winslow is three weeks behind on his rent.”'))).not.toContain('office');
  });

  it('alone: one word for it an evening, and "After that" once', () => {
    expect(rules(night(pg('account', [{ text: '“At nine I went round to Sokol’s for coffee, by myself. At ten I went to the chop house for tea, alone. At eleven I went back, on my own.”', voice: 'answer' }])))).toContain('alone');
    expect(rules(night(pg('account', [{ text: '“At nine I went round to Sokol’s for coffee, on my own. At ten I went to the chop house for tea, on my own again.”', voice: 'answer' }])))).not.toContain('alone');
    expect(rules(night(pg('account', [{ text: '“I was at the meeting at eight. After that, at nine, I left the meeting early.”', voice: 'answer' }])))).toContain('alone');
    expect(rules(night(pg('account', [{ text: '“I was at the meeting at eight. Then at nine I left the meeting early.”', voice: 'answer' }])))).not.toContain('alone');
  });

  it('walk: never "a fair few", and no distance three times a night', () => {
    const walk = (text: string) => pg('arrive', [{ text }], { units: [unit(text, { slot: 'walk', beat: 'walk' })] });
    expect(rules(night(walk('It was a fair few blocks to the Palace.')))).toContain('walk');
    const good = walk('It was a good walk to the Palace.');
    expect(rules(night(good, good, good))).toContain('walk');
    expect(rules(night(good, walk('It was a good ten blocks to the Shamrock.'), walk('I walked over to the Palace.')))).not.toContain('walk');
  });

  it('log: the narration says what happened, not what I noted', () => {
    for (const t of ['I noted that Winslow hadn’t been at the Delmonico rooms while the laudanum was in the medicine cupboard.', 'Before Dandridge was given the laudanum, somebody had been at the Delmonico rooms for it.', 'If Ashby said the same, the Palace would check out where the Delmonico rooms hadn’t.', 'Everybody at the meeting knew where the key was, and Alfano and Thorndike had been at it.'])
      expect(rules(night(pg('list', [{ text: t, voice: 'thought' }]))), t).toContain('log');
    for (const t of ['Winslow hadn’t been at the Delmonico rooms while the laudanum was in the medicine cupboard.', 'To give Dandridge the laudanum, somebody had to go to the Delmonico rooms for it first.', 'If Ashby said the same, Ruggiero had been at the Palace and not at the Delmonico rooms.', 'Alfano and Thorndike had been at the meeting, where everybody heard where the key was.'])
      expect(rules(night(pg('list', [{ text: t, voice: 'thought' }]))).filter((r) => r === 'log'), t).toEqual([]);
  });

  it('papers: "papers" and "grudge" twice at most on the page, the dead man three times', () => {
    const papers = (text: string) => pg('search', [{ text }], { q: 'search:papers' });
    expect(rules(night(papers('His papers would have the name of anybody with a grudge against him. I went through his papers. His papers held a page on everybody with a grudge, one grudge to a page.')))).toContain('papers');
    expect(rules(night(papers('If anybody had a reason, the desk would say so. Carbone had kept a page on everybody with a grudge.')))).not.toContain('papers');
    expect(rules(night(papers('Renfro: the dead man owed him. Grasso: the dead man squeezed her. Winslow: the dead man testified. Thorndike: the dead man kept a file.')))).toContain('papers');
    expect(rules(night(papers('Renfro, a milliner, owed him four hundred dollars. Grasso had been paying the dead man for years. Winslow had a brother Carbone had testified against.')))).not.toContain('papers');
  });

  it('staging: nobody finishing a late supper after four in the morning; the DA’s man at the door', () => {
    const pages = Array.from({ length: 10 }, () => pg('arrive', [{ text: 'It was cold out.' }]));
    const late = [...pages.slice(0, 9), pg('arrive', [{ text: 'Renfro was finishing a late supper at the kitchen table.' }])];
    expect(rules(night(...late))).toContain('staging');
    expect(rules(night(...pages.slice(0, 9), pg('arrive', [{ text: 'Renfro was at the kitchen table over eggs.' }])))).not.toContain('staging');
    expect(rules(night({ ...pg('confront', [{ text: 'It was eight.' }]), blocks: [{ kind: 'note', text: 'Eight o’clock. The DA’s man was on the stairs, and I’d close the case on whatever I had.' }] as Block[] }))).toContain('staging');
    expect(rules(night({ ...pg('confront', [{ text: 'It was eight.' }]), blocks: [{ kind: 'note', text: 'Eight o’clock. The DA’s man was at the door, and I’d close the case on whatever I had.' }] as Block[] }))).not.toContain('staging');
  });

  it('staging: a landlady on her stairs only where the way in put her there', () => {
    expect(rules(night(pg('arrive', [{ text: 'Mrs. Cheatham, the landlady, sat in the open door of the front room with a basket of mending.' }, { text: 'A landlady who sits on her stairs knows who used them.', voice: 'thought' }])))).toContain('staging');
    expect(rules(night(pg('arrive', [{ text: 'Mrs. Cheatham, the landlady, sat in the open door of the front room with a basket of mending.' }, { text: 'Nobody comes or goes in a rooming house without the landlady knowing.', voice: 'thought' }])))).not.toContain('staging');
  });

  it('retired: the witness lines the testers stopped on', () => {
    for (const t of ['I asked Zeldin for everybody he’d seen tonight, in order, and nobody left out because he liked them.', 'I asked Mrs. Sirkin who’d been in tonight, and said I’d take it untidy, the way it happened.', 'I stopped Grasso at the turn of the stairs, one step below, and kept my hand off the rail.', '“Ask me where I was at ten again in the morning,” he said.'])
      expect(rules(night(pg('list', [{ text: t }]))), t).toContain('retired');
    for (const t of ['I asked Zeldin for everybody he’d seen tonight, in order, friends included.', 'I asked Mrs. Sirkin who’d been in tonight, and told her not to tidy it up for me.', 'I caught Grasso at the turn of the stairs and stood a step below, so it wouldn’t look like a fight.', '“Ask me again in the morning where I was at ten,” he said.'])
      expect(rules(night(pg('list', [{ text: t }]))).filter((r) => r === 'retired'), t).toEqual([]);
  });
});

describe('docs/66, P2: the pronoun check catches a pronoun with nobody to be', () => {
  const blocks = (...xs: [string, ProseVoice?][]) => xs.map(([text, voice]) => ({ kind: 'prose', text, voice: voice ?? 'thought' }) as Block);
  it('parallel: "with Hanrahan at seven, and with him at eight", no man in the sentence', () => {
    const before = blocks(['Winslow was on a stool with his hat pushed back.', 'presence'], ['Ruggiero had said she was with Hanrahan at seven, and with him at eight.', 'narrator']);
    expect(pronounAmbiguity(d.kase, before).some((x) => x.startsWith('parallel'))).toBe(true);
    const after = blocks(['Winslow was on a stool with his hat pushed back.', 'presence'], ['Ruggiero had said she was with Hanrahan at seven, and with Winslow and Dandridge at eight.', 'narrator']);
    expect(pronounAmbiguity(d.kase, after).some((x) => x.startsWith('parallel'))).toBe(false);
  });

  it('across speech: "and he hadn’t seen her there" after her answer named other men', () => {
    const page = (thought: string) => blocks(['Zeldin had seen Reinhardt at the Shamrock at seven and ten, so I asked her to walk me through her night.', 'narrator'], ['“At seven I was at the Shamrock, with Winslow and Dandridge. Nine o’clock, I went to the Shamrock.”', 'answer'], [thought]);
    expect(pronounAmbiguity(d.kase, page('One thing didn’t add up. She had said she was at the Shamrock at nine, and he hadn’t seen her there.'), { subject: 'reinhardt' }).some((x) => x.startsWith('across speech'))).toBe(true);
    expect(pronounAmbiguity(d.kase, page('One thing didn’t add up. She had said she was at the Shamrock at nine, and Zeldin hadn’t seen her there.'), { subject: 'reinhardt' })).toEqual([]);
  });

  it('speaker card: a card about the barman after the hand-off to somebody else', () => {
    const d14 = dealBoard(14, 4);
    const g = (text: string, o: Record<string, unknown> = {}) => ({ kind: 'gap', slot: 'close', text, beat: 'close', para: 1, voice: 'thought', ...o }) as never;
    const handoff = g('Alfano hadn’t told me her evening yet. I’d find her at Sokol’s back room.', { slot: 'hand-off', beat: 'handoff', para: 0 });
    const card = (text: string) => [handoff, g(text, { who: 'barkeep' })];
    const b = blocks(['Alfano hadn’t told me her evening yet. I’d find her at Sokol’s back room.'], ['She gave me the night the way a good waiter brings the check.']);
    expect(pronounAmbiguity(d14.kase, b, { units: card('She gave me the night the way a good waiter brings the check.') }).some((x) => x.startsWith('speaker card'))).toBe(true);
    expect(pronounAmbiguity(d14.kase, b, { units: card('Ellery gave me the night the way a good waiter brings the check.') }).some((x) => x.startsWith('speaker card'))).toBe(false);
  });
});
