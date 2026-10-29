/**
 * A grid cell, as the notebook shows it and as a screen reader says it: shared by the notebook's grid
 * (`board-book.ts`) and the board behind the curtain (`curtain.ts`, docs/76), so the two speak alike.
 */

import { cellText, type BoardCell, type BoardGrid } from '../game/board/grid.js';
import { placeName, type BoardCase } from '../game/board/model.js';

/** The cell's label as the notebook sets it: the place, and ✓ or ✗ after it (never the CLI's quotes or arrow). */
export function cellLabel(g: BoardGrid, cell: BoardCell): string {
  return cellText(g, cell).replace(/["[\]]/g, '').replace(/→.*$/, '').replace(/([✓✗])/g, '​$1');
}

/** "Corrigan’s list" (the grid's source name) said as what happened: "Corrigan saw them at the Velvet Room". */
export function seenWords(by: string, place: string): string {
  const list = /^(.+)’s list$/.exec(by);
  if (list) return `${list[1]} saw them at ${place}`;
  const said = /^(.+)’s (?:story|word)$/.exec(by);
  if (said) return `${said[1]} says they were at ${place}`;
  return `${by} says they were at ${place}`;
}

/** What a cell holds, in words, for its button's label. */
export function cellWords(c: BoardCase, cell: BoardCell): string {
  const bits: string[] = [];
  if (cell.says) bits.push(`says ${placeName(c, cell.says)}`);
  if (cell.seen) bits.push(seenWords(cell.seen.by, placeName(c, cell.seen.place)));
  if (cell.collision) bits.push('the two don’t agree');
  // (Round 8, B9: the second story, and whether it clashes too.)
  if (cell.admitted) bits.push(`admitted ${placeName(c, cell.admitted)}`);
  else if (cell.second) bits.push(`then said ${placeName(c, cell.second)}${cell.secondClash ? ', and that doesn’t agree either' : ''}`);
  if (cell.pencil?.at) bits.push(`your guess: ${placeName(c, cell.pencil.at)}`);
  return bits.join('; ') || 'nothing yet';
}
