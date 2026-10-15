/**
 * docs/55 6: a page may end on a thing in the room having a feeling about it ("The radiator knocked
 * again. I didn’t answer it.", "The samovar went on steaming, the only thing in the room in no
 * hurry at all"). One a page is a joke; every page is a pattern (Hard-boiled 8: "by page ten that is
 * a pattern, not a joke"). A night ends about half its pages on one at most: past that, a page's
 * close is traded for one that isn't, where the deck has one, and otherwise left off.
 */

import type { Page } from '../types.js';
import { stripMarks } from './refer.js';
import type { Item } from './types.js';

/** People and animals at the head of a sentence: not a thing with feelings. */
const LIVING = /^(?:The|A|An) (?:[\w’-]+ )?(?:man|woman|men|women|landlady|landlord|bartender|barman|cashier|usher|cop|policeman|kid|kids|boy|girl|fellow|cat|dog|old \w+|couple|waiter|waitress|druggist|doorman|clerk|client|lodger|tenant|drunk)\b/;

/** A close whose first sentence is about a thing: the room, the weather, an object, a sound. */
export function thingClose(text: string): boolean {
  const t = stripMarks(text).trim().replace(/^“[^”]*”\s*/, '');
  if (!/^(?:The|A|An|Somewhere|Overhead|Outside|Upstairs|Downstairs|Across the|Behind me|Above|Below|Down the|Out on|Next door|In the|On the|Through the|From somewhere)\b/.test(t)) return false;
  return !LIVING.test(t);
}

/** The share of a night's pages so far that ended on a thing. */
function thingShare(log: readonly Page[]): { things: number; pages: number } {
  let things = 0;
  let pages = 0;
  for (const p of log) {
    if (p.board?.job === 'nothing' || p.board?.job === 'repeat') continue;
    const prose = p.blocks.filter((b) => b.kind === 'prose' && b.voice !== 'chapter');
    const last = prose[prose.length - 1];
    if (!last || last.kind !== 'prose') continue;
    pages++;
    if (thingClose(last.text)) things++;
  }
  return { things, pages };
}

/** At most this share of a night's pages end on a thing. */
export const THING_CLOSES = 0.5;

/**
 * The page's close, held to the night's share: when ending on another thing would take the night
 * past half its pages, the close is traded for one of its alternatives that isn't about a thing,
 * or left off.
 */
export function capThingClose(paras: Item[][], log: readonly Page[]): void {
  const items = paras.flat();
  const close = [...items].reverse().find((x) => x.kind === 'gap' && x.slot === 'close' && x.text.trim().length > 0);
  if (!close || close !== [...items].reverse().find((x) => x.text.trim().length > 0)) return;
  // (A pay-off, the callback a page set up, is the page's joke: it stays, and counts.)
  if (!thingClose(close.text) || close.tag === 'pay') return;
  const { things, pages } = thingShare(log);
  if (things + 1 <= Math.ceil((pages + 1) * THING_CLOSES)) return;
  const alt = (close.alts?.() ?? []).find((a) => !thingClose(a.text));
  if (alt) {
    alt.take();
    close.text = alt.text;
    return;
  }
  close.text = '';
}
