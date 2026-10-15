/**
 * docs/55 1d: a place is named the same way everywhere. Somebody's "home" is said as home, but the
 * first time a page says it of somebody whose home isn't called after them ("the Delmonico rooms",
 * not "Renfro’s flat"), it says which place that is: "Grasso said home, the Delmonico rooms, at ten".
 * The grid and the notebook call it by its name; the page says once that home is that name.
 *
 * Run last on a page, over the narration (never a person's own answer, never inside quotation
 * marks), and over the page's skeleton the same way, so the two say the same words.
 */

import { placeName, type BoardCase, type PersonId } from './model.js';
import type { Block } from './types.js';
import type { Unit } from './plan/types.js';

const MARK = /⁣(\d+)⁤/g;
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether somebody's home is called after them ("Renfro’s flat", "the Thorndike flat"): then "home" says it. */
export function homeNamed(c: BoardCase, p: PersonId): boolean {
  const who = c.people.find((x) => x.id === p);
  if (!who?.home) return true;
  const name = placeName(c, who.home);
  const fam = who.short.replace(/^(?:Mrs\.|Miss|Dr\.|Mr\.) /, '');
  return name.includes(fam);
}

/** "home" where it says where somebody said they were: after said, says, told me, claimed, was, been, not. */
const HOME = /\b(said|says|told me|claimed|claims|was|been|not|stuck to|(?:seven|eight|nine|ten|eleven|twelve) and) home\b(?!, | at (?:the |[A-Z]))/g;

/**
 * One paragraph's "home"s, the first said of each person on the page named. `seen` is the page's:
 * the people whose home the page has named already. `subject` is whom a pronoun means when the
 * paragraph hasn't named anybody of that sex before it.
 */
export function nameHomes(c: BoardCase, text: string, seen: Set<PersonId>, subject?: PersonId): string {
  const people = c.people.filter((x) => !x.object && x.short.length > 1);
  let out = '';
  let at = 0;
  // Outside quotation marks only.
  const parts = text.split(/(“[^”]*”)/);
  for (const part of parts) {
    if (part.startsWith('“')) {
      out += part;
      at += part.length;
      continue;
    }
    out += part.replace(HOME, (m, verb: string, off: number) => {
      const before = (text.slice(0, at) + part.slice(0, off)).replace(/“[^”]*”/g, ' ');
      const p = whoseHome(c, people, before, subject);
      if (!p || seen.has(p) || homeNamed(c, p)) return m;
      seen.add(p);
      const home = c.people.find((x) => x.id === p)?.home as string;
      const next = part.slice(off + m.length);
      const tail = /^ (?:at|and|on|with|for|from|until|by|when|that)\b/.test(next) ? ',' : '';
      return `${verb} home, ${placeName(c, home)}${tail}`;
    });
    at += part.length;
  }
  return out;
}

/** Whose "home": the last person named (or meant by a marked pronoun) in the sentence before it, else the paragraph's, else the subject. */
function whoseHome(c: BoardCase, people: BoardCase['people'], before: string, subject?: PersonId): PersonId | undefined {
  const sentence = before.split(/(?<=[.!?;])\s+/).pop() ?? before;
  const named = (s: string): PersonId | undefined => {
    let best: { p: PersonId; i: number } | undefined;
    for (const x of people) {
      const m = [...s.matchAll(new RegExp(`\\b${esc(x.short)}\\b(?!’s)`, 'g'))].pop();
      if (m && (best === undefined || (m.index ?? 0) > best.i)) best = { p: x.id, i: m.index ?? 0 };
    }
    for (const m of s.matchAll(MARK)) {
      const p = c.people[Number(m[1])];
      if (p && (best === undefined || (m.index ?? 0) > best.i)) best = { p: p.id, i: m.index ?? 0 };
    }
    return best?.p;
  };
  const inSentence = named(sentence);
  if (inSentence) return inSentence;
  // A pronoun: the last name of that sex in the paragraph, or the page's subject.
  const pron = /\b(he|she)\b[^.!?;]*$/i.exec(sentence.replace(MARK, ''));
  if (!pron) return undefined;
  const female = (pron[1] as string).toLowerCase() === 'she';
  let best: { p: PersonId; i: number } | undefined;
  for (const x of people) {
    if (!!x.female !== female) continue;
    const m = [...before.matchAll(new RegExp(`\\b${esc(x.short)}\\b`, 'g'))].pop();
    if (m && (best === undefined || (m.index ?? 0) > best.i)) best = { p: x.id, i: m.index ?? 0 };
  }
  if (best) return best.p;
  const s = c.people.find((x) => x.id === subject);
  return s && !!s.female === female ? s.id : undefined;
}

/** The page's narration and skeleton, each "home" named the first time (docs/55 1d). */
export function nameHomesOnPage(c: BoardCase, blocks: Block[], units: Unit[] | undefined, subject?: PersonId): void {
  const seen = new Set<PersonId>();
  for (const b of blocks) {
    if (b.kind !== 'prose' || b.voice === 'answer' || b.voice === 'chapter') continue;
    b.text = nameHomes(c, b.text, seen, subject);
  }
  if (!units) return;
  const seenU = new Set<PersonId>();
  for (const u of units) {
    if (u.voice === 'answer' || u.voice === 'chapter') continue;
    u.text = nameHomes(c, u.text, seenU, subject);
  }
}

/**
 * docs/55 7: a widowed client keeps her "Mrs." in the narration ("Mrs. Marchetti", as Mrs. Kowalski
 * keeps hers): the case calls her by her surname, and the page says her title with it. Never inside
 * "the Marchetti flat", or after "Mr." ("the late Mr. Marchetti").
 */
export function titleClient(c: BoardCase, text: string): string {
  const cl = c.people.find((x) => x.id === c.client);
  if (!cl || !cl.female || !/\ba widow\b/.test(cl.description) || /^(?:Mrs\.|Miss|Mr\.|Dr\.) /.test(cl.short)) return text;
  return text.replace(new RegExp(`(?<!Mrs\\. |Mr\\. |Miss |the |The |[A-Z][a-z]+ )\\b${esc(cl.short)}\\b(?! flat)`, 'g'), `Mrs. ${cl.short}`);
}

/** The page's narration and skeleton with the widow's title (docs/55 7). */
export function titleClientOnPage(c: BoardCase, blocks: Block[], units: Unit[] | undefined): void {
  for (const b of blocks) if (b.kind === 'prose' || b.kind === 'note') b.text = titleClient(c, b.text);
  for (const u of units ?? []) u.text = titleClient(c, u.text);
}
