/**
 * docs/59 item 1: said once. A fact is said once on a page: a later sentence may draw a new
 * conclusion from it, but may not say it again. Two measures of "the same fact", both read off
 * what a page says:
 *
 * - **atoms** (`factAtoms`): what a proposition says, keyed by what makes it that fact: a person at
 *   a place at an hour (whoever's word it is), a list's hour, the window, the way in, a reason. A
 *   watcher's "at ten, only Reinhardt and Crowninshield" and a thought's "Reinhardt was at Mrs.
 *   Nagy’s at ten" share one: the same fact twice. A new conclusion is its own kind of atom (an
 *   agreement, a collision, who could get at the means), so a thought that draws one shares
 *   nothing with the line it was drawn from.
 * - **content words** (`contentWords`): the words a sentence carries once its function words,
 *   pronouns and light verbs are taken out. Two sentences sharing five of them say the same thing
 *   twice ("…knows the spare is in the sugar tin" and "…the spare lived in the sugar tin at the
 *   Delmonico rooms").
 *
 * The prose lint's `repeat` rule holds every page to both, outside the turn and the report; the
 * planner holds a piece of texture to the second before it lets it on the page.
 */

import type { Prop } from '../bones/types.js';

/** The words that carry no fact of their own: function words, pronouns, light verbs, the clock's "o’clock". */
export const STOP_WORDS = new Set(
  (
    'the a an and or but nor of to in on at by for with from into onto out up down over under about after before as than then so not no yes ' +
    'was were is are am be been being had has have having did do does done said says say saying told tell tells asked ask asks would could should will can might must shall ' +
    'he him his himself she her hers herself they them their themselves it its itself i me my mine myself we us our you your yours this that these those there here ' +
    'who whom whose what which when where why how all any some every each nobody somebody anybody everybody nothing something anything everything none ' +
    'one two own just only also still even back again too very more most much many like if because while till until since though although yet both either neither other another same such ' +
    'way went go goes going gone came come comes coming got get gets made make makes took take takes put puts let lets know knew known see saw seen look looked looks think thought ' +
    'oclock o’clock mr mrs miss dr around through upon off between against during without within along across behind beside near ever never always already now later earlier first last ' +
    'once twice well rather quite enough else whether ago tonight night evening hour hours time minute minutes thing things lot rest whole kind sort ' +
    'i’d i’m i’ll i’ve he’d he’s she’d she’s it’s that’s there’s didn’t wasn’t weren’t hadn’t couldn’t wouldn’t don’t doesn’t isn’t aren’t won’t can’t'
  ).split(/\s+/),
);

/** A sentence's content words: lower case, apostrophes curled, a possessive's "’s" taken off, three letters or more. */
export function contentWords(text: string): Set<string> {
  const out = new Set<string>();
  const t = text
    .replace(/⁣\d+⁤/g, '')
    .toLowerCase()
    .replace(/'/g, '’');
  for (const raw of t.split(/[^a-z’]+/)) {
    const w = raw.replace(/^’+|’+$/g, '').replace(/’s$/, '');
    if (w.length < 3 || STOP_WORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

/** The content words two sentences share. */
export function sharedContent(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  return [...a].filter((w) => b.has(w));
}

/** How many content words two sentences may share before they say the same thing twice. */
export const SAME_WORDS = 5;

/**
 * Whether a sentence says again what the sentences before it on the page said: it shares five content
 * words with one of them, and brings fewer than three of its own ("…the spare lived in the sugar tin at
 * the Delmonico rooms" after "…knows the spare is in the sugar tin" brings "let" and "lived"). A
 * sentence that draws something new from them says its new words ("East Houston Street was where Mrs.
 * Krantz lived, and that was what mattered").
 */
export function saysAgain(sentence: string, before: readonly string[]): boolean {
  const w = contentWords(sentence);
  const prior = before.map((b) => contentWords(b));
  if (!prior.some((p) => sharedContent(w, p).length >= SAME_WORDS)) return false;
  const seen = new Set(prior.flatMap((p) => [...p]));
  return [...w].filter((x) => !seen.has(x)).length < 3;
}

/**
 * What a proposition says, keyed by what makes it that fact. Somebody at a place at an hour is the
 * same fact whoever's word it is (a list's entry, an account's own hour or its company, a placement);
 * a conclusion drawn from it (an agreement, a collision, a narrowing) is a fact of its own.
 */
export function factAtoms(p: Prop): string[] {
  switch (p.k) {
    case 'LIST':
      // (Who a watcher had at an hour, entry by entry: the hour's other entries are other facts, and an empty hour is its own.)
      return p.shut ? [`shut|${p.place}|${p.hour}`] : p.people.length ? p.people.map((e) => `at|${p.place}|${p.hour}|${e}`) : [`empty|${p.place}|${p.hour}`];
    case 'CLAIM':
      if (p.place) return [`at|${p.place}|${p.hour}|${p.person}`, ...(p.company ?? []).map((x) => `at|${p.place}|${p.hour}|${x}`)];
      return (p.company ?? []).length ? (p.company ?? []).map((x) => `with|${p.person}|${p.hour}|${x}`) : [`alone|${p.person}|${p.hour}`];
    case 'PLACED':
      // (A placement a thought draws, "so Mosley was at Moskowitz’s at ten, when it happened", is what
      // an hour means; the watcher's own line is the fact it was drawn from.)
      return [`placed|${p.person}|${p.hour}`];
    case 'AWAY':
      return [`away|${p.person}|${p.place}|${p.hour}`];
    case 'UNBACKED':
      return [`unbacked|${p.person}|${[...p.hours].sort().join(',')}`];
    case 'CONFIRMS':
      return [`confirms|${p.person}|${p.hour}`];
    case 'COLLIDES': {
      // (Their story against a list, and against somebody's owning up, are two facts.)
      const w = p.with as { k: string; who?: string; watcher?: string; person?: string; speaker?: string };
      return [`collides|${p.person}|${p.hour}${p.second ? '|second' : ''}|${w.k}|${w.who ?? w.watcher ?? w.speaker ?? w.person ?? ''}`];
    }
    case 'ALIVE':
      return [`alive|${p.victim}|${p.hour}`];
    case 'WINDOW':
      return [`window|${[...p.hours].sort().join(',')}`];
    case 'NARROWS':
      return [`narrows|${p.hour}`];
    case 'ACCESS':
      return [`access|${p.person}`];
    case 'MEANS':
      return [`means|${p.how}|${p.place}`];
    case 'MOTIVE':
      return [`motive|${p.person}${p.said ? `|${p.said}` : ''}`];
    case 'FIND':
      return [`find|${p.find}`];
    case 'REMARK':
      return [`remark|${p.speaker}|${p.saw}|${p.how}|${p.hour}`];
    case 'HANDOVER':
      // (What it was, alive or small, and whose thing it might be, are facts of their own.)
      return [`handover|${p.to}|${p.place}${p.what ? `|${p.what}` : ''}${p.thing ? `|${p.thing}` : ''}`];
    case 'POINTER':
      return [`pointer|${p.to}|${p.why}`];
    case 'ADMIT':
      return [`admit|${p.person}|${p.place}`];
    case 'SECOND':
      return [`second|${p.person}|${p.place}`];
    case 'REFUSE':
      return [`refuse|${p.person}${p.hour !== undefined ? `|${p.hour}` : ''}`];
    case 'HELD':
      return [`held|${p.person}|${p.hour}${p.why ? `|${p.why}` : ''}`];
    case 'CRACK':
      return [`crack|${p.person}`];
    case 'PRESENT':
      return [`present|${p.person}`];
    case 'UNSPOKEN':
      return p.people.map((x) => `unspoken|${x}|${[...p.hours].sort().join(',')}`);
    case 'LEFT':
      return [`left|${p.hours.join(',')}|${(p.people ?? []).join(',')}`];
    case 'SHIFT':
      return [`shift|${p.watcher}`];
    case 'HOLD':
      return [`hold|${p.evenings.join(',')}|${p.lists.join(',')}`];
    case 'MISSING':
      return p.people.map((x) => `missing|${x}`);
    case 'RELATION':
      return ['relation'];
    case 'FOUND':
      return ['found'];
    case 'GONE':
      return ['gone'];
  }
  return [];
}
