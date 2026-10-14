import { describe, expect, it } from 'vitest';
import { Tokenizer, verifyGap, type TokenizerData } from '../../src/game/board/model/index.js';
import { nameLexicon } from '../../src/game/board/model/verifier.js';
import { readFileSync } from 'node:fs';

/**
 * docs/50 §1: a gap is texture. It may not carry a name, an hour, a digit,
 * "nobody else", a banned phrase or a repeat, and it has to be one or two
 * whole sentences of a sensible length.
 */

const ok = (text: string, ctx = {}) => verifyGap(text, ctx);
const why = (text: string, ctx = {}) => verifyGap(text, ctx).reasons.join('; ');

describe('the verifier passes texture', () => {
  for (const t of [
    'The rain had found its way down my collar and decided to stay.',
    'He looked at the ceiling for the next one, and found it there.',
    'I took the stool beside him and let him finish his drink before I spoiled it.',
    '“Sit down,” she said. “Mind the basket.”',
    'The radiator knocked twice and thought better of it.',
    'It was quiet in the way that makes you lower your voice when there’s nobody to hear it.',
    'I said I’d think about it, and on Sunday I would.',
  ]) {
    it(t, () => expect(why(t)).toBe(''));
  }
});

describe('the verifier rejects', () => {
  it('a name of the night, or one either world can deal, or one made up', () => {
    expect(why('He said Corrigan was a fool about the dog.', { names: ['Corrigan'] })).toMatch(/name: Corrigan/);
    expect(why('Rafferty’s stairs were steep and the light was bad.')).toMatch(/name: Rafferty/);
    expect(why('Hanley’s was as quiet as a church on a Monday.')).toMatch(/name: Hanley/);
    expect(why('I asked him whether Bartholomew had been about.')).toMatch(/name: Bartholomew \(capitalised\)/);
    expect(why('Mrs. Hennessy was at the window, as she always is.')).toMatch(/name: Mrs\./);
    expect(nameLexicon().has('Rafferty')).toBe(true);
    expect(nameLexicon().has('Street')).toBe(false);
  });

  it('a place name the night passed in', () => {
    expect(why('I walked up past the Velvet Room without stopping.', { places: ['the Velvet Room'] })).toMatch(/name/);
  });

  it('an hour, as a word or a time', () => {
    expect(why('The bells were striking nine when I got there.')).toMatch(/hour: nine/);
    expect(why('It was past midnight and the street had emptied.')).toMatch(/hour: midnight/);
    expect(why('He said he would be back by two at the latest.')).toMatch(/hour: by two/);
    expect(why('I had two coffees and a bad feeling about the night.')).toBe('');
  });

  it('a means, or the night’s own clue words', () => {
    expect(why('The laudanum had come from here, and not long ago.')).toMatch(/means: laudanum/);
    expect(why('The revolver had come from here, I was sure of it.')).toMatch(/means: revolver/);
    expect(why('The brooch had been the only pretty thing in the room.', { facts: ['brooch'] })).toMatch(/fact: brooch/);
    expect(why('The cushion by the radiator was empty and still warm.', { facts: ['the pearl brooch'] })).toBe('');
  });

  it('a digit', () => {
    expect(why('The door had a brass 4 on it, hanging by one nail.')).toMatch(/digit/);
  });

  it('“nobody else”', () => {
    expect(why('There was nobody else on the stairs, and I was glad of it.')).toMatch(/nobody else/);
    expect(why('Not a soul else came up the stairs that I could hear.')).toMatch(/nobody else/);
  });

  it('a phrase the prose lints ban, the machinery, a verdict, a plain-terms word', () => {
    expect(why('Which brought me to the matter of the back door, again.')).toMatch(/banned: Which brought me to/);
    expect(why('I put it on the grid and looked at it for a while.')).toMatch(/machinery: grid/);
    expect(why('That left only one of them who could have managed it.')).toMatch(/verdict/);
    expect(why('The colour of the curtains was a mistake on purpose.')).toMatch(/banned: British spelling/);
  });

  it('a sentence already on the page, or said twice', () => {
    const page = ['I went down the stairs. The radiator knocked twice and thought better of it.'];
    expect(why('The radiator knocked twice and thought better of it.', { page })).toMatch(/repeat/);
    expect(why('The street was wet. The street was wet.')).toMatch(/repeat within/);
  });

  it('the wrong shape', () => {
    expect(why('He nodded.')).toMatch(/length/);
    expect(why('One sentence here, fine. Another one there, fine. And a third, which is one too many.')).toMatch(/sentences: 3/);
    expect(why('and then the door closed behind me with a sigh.')).toMatch(/start/);
    expect(why('The door closed behind me with a sigh and a')).toMatch(/end/);
    expect(why('“Sit down, she said, and mind the basket.')).toMatch(/quotes/);
    expect(why('The lamp was out. ¶ The street was dark as a pocket.')).toMatch(/mark/);
    expect(ok('').ok).toBe(false);
  });

  it('counts tokens when it is given the tokenizer’s count', () => {
    const tok = new Tokenizer(JSON.parse(readFileSync('model/tokenizer.json', 'utf8')) as TokenizerData);
    const countTokens = (s: string) => tok.encode(s).length;
    expect(why('The lamp went out.', { countTokens })).toMatch(/length: \d+ tokens/);
    expect(why('The lamp on the desk went out, and I let it stay out.', { countTokens })).toBe('');
  });
});
