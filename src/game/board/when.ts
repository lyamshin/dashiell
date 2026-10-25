/**
 * docs/59 item 6, the designer's note 9: what "when" means, said the same way everywhere.
 *
 * For a murder, **when is the hour it was done to him**: the hour the killer was with him. For a
 * poisoning that's the hour the dose went in, and he died after it, as the poison takes its time;
 * for a shooting or a knife it's the hour of the shot or the blow. The generator's crime hour is
 * that hour (the culprit is at the scene at it, with the means), and so are the office's hours.
 * A lost thing's when is the hour it went.
 *
 * The office says it once, plainly, in the client's answer to "when?", which opens on the hour
 * (`officeWhen`); the report asks it in the same words ("When was he poisoned?", `whenQuestion`);
 * the notebook, the verdict and the story say it the same way (`whenDone`).
 */

import type { GivenLine } from '../../gen/board/types.js';
import { cap, hourWord, isMurder, pronOf, type BoardCase, type Hour } from './model.js';
import { lean } from './plan/dial.js';

/** A poisoning: chloral, laudanum, rat poison. */
export function isPoison(c: BoardCase): boolean {
  return isMurder(c) && (c.means.kind === 'chloral' || c.means.kind === 'poison');
}

/** What was done to him, as "when" means it: "poisoned", "shot", "stabbed"; a lost thing "went". */
export function whenVerb(c: BoardCase): 'poisoned' | 'shot' | 'stabbed' | 'killed' | 'went' {
  if (!isMurder(c)) return 'went';
  const k = c.means.kind;
  return k === 'chloral' || k === 'poison' ? 'poisoned' : k === 'gun' ? 'shot' : k === 'blade' ? 'stabbed' : 'killed';
}

/** The report's question, exactly what it asks: "When was he poisoned?", "When did she go?", "When did it go?". */
export function whenQuestion(c: BoardCase): string {
  const pr = pronOf(c, c.crime.victim);
  if (isMurder(c)) return `When was ${pr.he} ${whenVerb(c)}?`;
  return `When did ${c.type === 'lost-pet' ? pr.he : 'it'} go?`;
}

/** "It happened at ten", said as what happened: "he was poisoned at ten o’clock", "the watch went at ten o’clock". */
export function whenDone(c: BoardCase, at: string): string {
  const pr = pronOf(c, c.crime.victim);
  const v = whenVerb(c);
  return v === 'went' ? `${pr.he} went ${at}` : `${pr.he} was ${v} ${at}`;
}

/** The means as a name with no article: "laudanum", "chloral", "rat poison". */
function bare(name: string): string {
  return name.replace(/^(?:a|an|the) /, '');
}

/**
 * A poisoning's death, after the dose: "laudanum takes twenty minutes to an hour, so he died within
 * the hour". Null when it isn't a poisoning.
 */
export function poisonAfter(c: BoardCase): string | null {
  if (!isPoison(c)) return null;
  const pr = pronOf(c, c.crime.victim);
  const m = bare(c.means.name);
  return (c.means.delay[1] ?? 0) > 15 ? `${m} takes twenty minutes to an hour, so ${pr.he} died within the hour` : `${m} acts in minutes, so ${pr.he} was dead soon after`;
}

/** The office's hours as the client opens on them: "Ten o’clock", "Nine or ten o’clock". */
export function whenWords(hours: readonly number[]): string {
  const ws = hours.map((h) => hourWord(h as Hour));
  return `${cap(ws.length > 1 ? `${ws.slice(0, -1).join(', ')} or ${ws[ws.length - 1]}` : (ws[0] ?? ''))} o’clock`;
}

/**
 * The client's answer to "when?": it opens on the hour, then says what fixes it, in plain words,
 * and for a poisoning that he was poisoned then and died after. Never the cause again: the office
 * said the police's word and the coroner's with the finding. Null for a line this doesn't know
 * (the case's own words are said instead).
 */
export function officeWhen(c: BoardCase, g: GivenLine, hours: readonly number[]): string | null {
  const two = hours.length > 1;
  const lead = `${whenWords(hours)}${two ? '' : ', near enough'}.`;
  if (isMurder(c)) {
    const what = murderWhat(c, g, hours);
    if (!what) return null;
    // A poisoning: that's when the dose went in, and the death came after.
    const pr = pronOf(c, c.crime.victim);
    const after = poisonAfter(c);
    // (docs/60: lean, two sentences: the skim readers stopped on the semicolon.)
    const sep = lean() ? '. ' : '; ';
    const tail = lean() && after ? `${after.charAt(0).toUpperCase()}${after.slice(1)}` : after;
    const done = after ? (two ? ` Whichever it was, that’s when ${pr.he} was poisoned${sep}${tail}.` : ` That’s when ${pr.he} was poisoned${sep}${tail}.`) : '';
    return `${lead} ${what}.${done}`;
  }
  const what = smallWhat(g, hours);
  if (what === null) return null;
  return what ? `${lead} ${what}.` : lead;
}

/**
 * The notebook's line for a poisoning's hour, said the way the office said it: "He was poisoned at ten
 * o’clock. He telephoned Steinbach at ten, cheerful, to say he had company; laudanum takes twenty
 * minutes to an hour, so he died within the hour." Null where the case's own words do (a shot, a
 * lost thing).
 */
export function notebookWhen(c: BoardCase, g: GivenLine, hours: readonly number[], client: string): string | null {
  if (!isPoison(c) || (g.kind !== 'clock' && g.kind !== 'window')) return null;
  const what = murderWhat(c, g, hours);
  const after = poisonAfter(c);
  if (!what || !after) return null;
  const at = whenWords(hours).replace(/^[A-Z]/, (x) => x.toLowerCase());
  return `${cap(pronOf(c, c.crime.victim).he)} was poisoned at ${at}${hours.length > 1 ? ', one or the other' : ''}. ${what.replace(/\btelephoned me\b/, `telephoned ${client}`)}; ${after}.`;
}

/** What fixes a murder's hour, by the clock line's own id, in plain words (the hour itself is said before it). */
function murderWhat(c: BoardCase, g: GivenLine, hours: readonly number[]): string | null {
  const v = g.vars;
  const pr = pronOf(c, c.crime.victim);
  const He = cap(pr.he);
  const hc = hours.length ? hourWord(hours[hours.length - 1] as Hour) : (v.hc ?? '');
  const two = hours.length > 1;
  const prog = v.programme ?? 'the radio hour';
  const means = bare(c.means.name);
  switch (g.id) {
    case 'coroner':
      return two ? `It was in a drink, and nobody can say which hour ${pr.he} drank it` : `It was in a drink, and ${pr.he} drank it at ${hc}`;
    case 'supper':
      return `The chop house sent up ${pr.his} supper at ${hc}, and the ${means} was in it`;
    case 'telephone':
      return `${He} telephoned me at ${hc}, cheerful, to say ${pr.he} had company`;
    case 'radio':
      // (docs/66, P5: "laughing with somebody all through the Fleischmann Hour, which starts at nine" left
      // no moment for the dose: the laughing when the hour came on.)
      return isPoison(c) ? (lean() ? `The woman across the hall heard ${pr.him} laughing with somebody when ${prog} came on at ${hc}` : `The woman across the hall heard ${pr.him} laughing with somebody all through ${prog}, which starts at ${hc}`) : `${He} was shot in the middle of ${prog}, which starts at ${hc}; the family across the hall turned it up`;
    case 'heard':
      return 'The man downstairs heard the shot and looked at his clock';
    case 'el':
      return `The woman below took the shot for a backfire, just after the ${hc} o’clock el went by`;
    case 'watch':
      return `${pr.His} watch broke when ${pr.he} fell, and stopped at ten past ${hc}`;
    case 'cry':
      return `The woman across the hall heard ${pr.him} cry out once, in the middle of ${prog}, which starts at ${hc}`;
    case 'delivery':
      return `The boy from the delicatessen knocked at a quarter past ${hc} and heard a chair go over behind the door; he left the order on the mat`;
    case 'radios':
      return `${He} was shot at one or the other, and nobody heard it over the radios`;
    case 'surgeon':
      return `The police surgeon puts it at one or the other, by the warmth of ${pr.him}`;
    case 'clock':
      return `${pr.His} mantel clock was knocked over and stopped at five past, but it was never right`;
    case 'dozed': {
      // (docs/66, P5: "heard him laugh with somebody and then go quiet at one or the other" said the hour
      // in a clause nobody could find: what she heard, and then that she can't say which hour.)
      if (!lean()) return `The woman across the landing heard ${v.sound ?? 'something'} at one or the other; she’d dozed off over the radio and can’t say which`;
      const heard = (v.sound ?? 'something').replace(/^(him|her) laugh with somebody and then go quiet$/, '$1 laughing with somebody, and then nothing');
      const [a, b] = hours.map((h) => hourWord(h as Hour));
      return `The woman across the landing heard ${heard}, but she’d dozed off over the radio and can’t say if it was ${a ?? 'one'} or ${b ?? 'the other'}`;
    }
  }
  return null;
}

/** What fixes a small case's hour, by the line's own id: the line's own words, the hour said before them. */
function smallWhat(g: GivenLine, hours: readonly number[]): string | null {
  const v = g.vars;
  const hc = hours.length ? hourWord(hours[hours.length - 1] as Hour) : (v.hc ?? '');
  const two = hours.length > 1;
  const prog = v.programme ?? 'the radio hour';
  const at = two ? 'one or the other' : hc;
  switch (g.id) {
    case 'gone':
      return two ? 'I can’t say which' : '';
    case 'stairs':
      return `The woman downstairs heard the stairs creak at ${at}${two ? ', and she can’t say which' : ''}`;
    case 'radio':
      return g.kind === 'window' ? `The family across the hall heard the door during ${prog} or the hour after it` : `The woman upstairs heard feet on the stairs in the middle of ${prog}, which starts at ${hc}`;
    case 'janitor':
      return `The janitor heard the dog in the yard bark at ${at}, and found the door ajar at midnight`;
    case 'dog':
      return `The ${v.dog ?? 'dog'} next door went off at ${hc}, the way it does when somebody’s on the stairs`;
    case 'clock':
      return `Whoever it was knocked the parlor clock off the shelf, and it stopped at ten past ${hc}`;
    case 'delivery':
      return `The boy from the delicatessen came up with an order at a quarter past ${hc} and passed somebody on the dark stairs, going down in a hurry`;
    case 'el':
      return `The man below heard the door go just after the ${hc} o’clock el went by; he sets his watch by it`;
    case 'bell':
      return `St. Teresa’s was striking ${hc} when the woman across the hall heard the door`;
  }
  return null;
}
