/**
 * Guidance §4 — counting a page's jokes from what it printed, apart from the
 * dealer's own count: a card flagged `joke` whose words are on the page, a
 * sheet line flagged `joke`, a closing line (the last word is a joke by
 * design), a callback that pays off a card that was not itself the joke, an
 * activity's joking tail, and a recap's starred aside. A callback paying off
 * the card that told the joke is the same joke, set up and paid off.
 *
 * Used by test/guidance-quips.test.ts.
 */
import type { Page } from '../src/game/types.js';
import { ALL_CARDS, type Card } from '../src/game/voice/cards.js';
import { SHEETS } from '../src/game/scene/sheets.js';
import { plainAction } from '../src/game/scene/people.js';
import * as VOICE_DATA from '../src/game/voice-data.js';

const CARDS = new Map<string, Card>(ALL_CARDS.map((c) => [c.id, c]));

function norm(s: string): string {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/** A template as a pattern over the page's words: each slot is some words. */
function patternOf(template: string): RegExp {
  const parts = norm(template.replace(/^\*/, '')).split(/\{[^}]+\}/);
  const body = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.{1,80}?');
  return new RegExp(body);
}

/** The words a reader reads on the page. */
export function pageProse(page: Page): string {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose' || b.kind === 'note') out.push(b.text);
    if (b.kind === 'presence' && b.text) out.push(b.text);
  }
  return norm(out.join(' '));
}

type Line = { re: RegExp; text: string; kind: 'joke' | 'close' | 'callback'; binds?: boolean };

/** Sheet lines that tell a joke: joke parts, and every closing line (callbacks apart). */
const SHEET_LINES: Line[] = (() => {
  const out: Line[] = [];
  const add = (text: string, kind: Line['kind'], binds = false): void => {
    if (text.replace(/\{[^}]+\}/g, '').trim().length < 12) return;
    out.push({ re: patternOf(text), text, kind, ...(binds ? { binds } : {}) });
  };
  for (const sheet of SHEETS) {
    for (const part of sheet.parts) {
      if (!part.joke || part.hole !== undefined) continue;
      for (const t of [part.text ?? '', ...(part.alt ?? [])]) add(t, 'joke', part.bind !== undefined);
    }
    for (const t of sheet.close?.plain ?? []) add(t, 'close');
    for (const t of sheet.close?.callback ?? []) add(t, 'callback');
  }
  return out;
})();

/** The pay lines a card offers, by the card. */
const PAY_LINES: { card: Card; re: RegExp; text: string }[] = ALL_CARDS.flatMap((card) =>
  Object.values(card.exports ?? {}).flatMap((exp) => (exp.pay ?? []).map((text) => ({ card, re: patternOf(text), text }))),
);

/** The joking tail of an activity: what follows its plain action. */
const ACTIVITY_TAILS: { id: string; tail: string }[] = (() => {
  const out: { id: string; tail: string }[] = [];
  for (const card of ALL_CARDS) {
    if (card.deck !== 'activity' || !card.joke) continue;
    const doing = card.text.replace(/^\{name\} was /, '').replace(/\.$/, '');
    const plain = plainAction(doing);
    const tail = doing.slice(plain.length).replace(/^[,;\s]+/, '');
    // Two cards with one tail are one joke when the page prints it.
    if (tail.length >= 10 && !/\{/.test(tail) && !out.some((o) => o.tail === norm(tail))) out.push({ id: card.id, tail: norm(tail) });
  }
  return out;
})();

/** The recap's starred asides. */
const STARRED: Line[] = (() => {
  const out: Line[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      if (v.startsWith('*')) out.push({ re: patternOf(v), text: v, kind: 'joke' });
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(VOICE_DATA);
  return out;
})();

export interface PageJokes {
  count: number;
  /** What was counted, for a failure message. */
  told: string[];
}

/** How many jokes a page tells, read off what it printed. */
export function jokesOnPage(page: Page): PageJokes {
  const prose = pageProse(page);
  const told: string[] = [];
  const setups = new Set<string>();
  let count = 0;
  for (const id of new Set(page.cardsUsed)) {
    const card = CARDS.get(id);
    if (!card?.joke) continue;
    if (!patternOf(card.text).test(prose)) continue;
    count++;
    told.push(`${id}: ${card.text}`);
    if (card.exports) setups.add(id);
  }
  let paidOff = false;
  for (const line of SHEET_LINES) {
    if (!line.re.test(prose)) continue;
    if (line.kind === 'callback') {
      paidOff = true;
      continue;
    }
    count++;
    told.push(`sheet ${line.kind}: ${line.text}`);
    // A joke line that offers something to bring back is a setup, like a card.
    if (line.binds) setups.add(line.text);
  }
  for (const pay of PAY_LINES) {
    if (!pay.re.test(prose)) continue;
    // Paying off the card that told the joke is that joke, not another.
    if (setups.has(pay.card.id)) continue;
    paidOff = true;
  }
  // A callback on a card that was not the joke is the page's joke.
  if (paidOff && setups.size === 0) {
    count++;
    told.push('a callback');
  }
  for (const a of ACTIVITY_TAILS) {
    if (!prose.includes(a.tail)) continue;
    count++;
    told.push(`${a.id}'s tail: ${a.tail}`);
  }
  for (const line of STARRED) {
    if (!line.re.test(prose)) continue;
    count++;
    told.push(`recap: ${line.text}`);
  }
  return { count, told };
}
