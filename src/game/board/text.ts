/**
 * The board night as plain text: a page, its choices, the notebook. Used by
 * `npm run play` and `npm run read` with `--engine board`.
 */

import { wrap } from '../transcript.js';
import type { OfferedChoice, OfferedGroup, Page } from '../types.js';
import { boardGridText } from './grid.js';
import { knownPeople, knownPlaces, linesHeld } from './knowledge.js';
import { cap, nameOf, personOf, placeName, type BoardDeal, type BoardRun } from './model.js';
import { recapClauses } from './pages.js';

/** "½ hr", "25 min", "free": the book's own words for a cost. */
export function minutesText(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return '½ hr';
  return `${minutes} min`;
}

export function pageBodyText(page: Page): string {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose') {
      if (b.voice === 'chapter') out.push(`— ${b.text.toUpperCase()} —`);
      else out.push(wrap(b.text));
    } else if (b.kind === 'note') out.push(wrap(`(${b.text})`));
  }
  return out.join('\n\n');
}

export function costText(ch: OfferedChoice): string {
  if (ch.done) return 'free ✓';
  const m = minutesText(ch.minutes);
  return ch.rounded ? `${m} (rounded)` : m;
}

/** Every choice, numbered, people first and then their topics, as the book draws them. */
export function choicesText(groups: readonly OfferedGroup[], taken?: string): string {
  const out: string[] = ['WHAT NEXT'];
  let n = 0;
  for (const g of groups) {
    if (g.choices.length === 0) continue;
    out.push(g.kind === 'ask' ? `  ${g.heading}:` : g.heading ? `  ${g.heading}:` : '  Free:');
    for (const ch of [...g.choices, ...(g.more ?? [])]) {
      n++;
      const mark = ch.command === taken ? '>' : ch.lead ? '*' : ' ';
      out.push(`   ${mark}${String(n).padStart(2)}. ${ch.label}${ch.note ? ` (${ch.note})` : ''} — ${costText(ch)}${ch.lead && ch.why ? `  [${ch.why}]` : ''}`);
    }
  }
  return out.join('\n');
}

/** The notebook: the people and places known, and every line held, by whose word. */
export function notebookText(d: BoardDeal, run: BoardRun): string {
  const c = d.kase;
  const out: string[] = ['NOTEBOOK'];
  out.push('');
  out.push('The office:');
  for (const t of c.givens.text) out.push(`  ${wrap(t, 72).replace(/\n/g, '\n  ')}`);
  out.push('');
  out.push('People:');
  for (const p of knownPeople(c, run)) {
    const who = personOf(c, p);
    if (!who || who.role === 'victim') continue;
    out.push(`  ${who.name}: ${who.role === 'client' ? 'my client, ' : ''}${who.description}.`);
  }
  out.push('');
  out.push('Places:');
  for (const [id, why] of knownPlaces(c, run)) out.push(`  ${cap(placeName(c, id))} (${why}).`);
  const lines = linesHeld(c, run).filter((l) => l.kind !== 'given');
  if (lines.length > 0) {
    out.push('');
    out.push('What I have:');
    for (const l of lines) out.push(`  ${wrap(l.text, 72).replace(/\n/g, '\n  ')}`);
  }
  const motives = run.asked.filter((q) => q.startsWith('motive:')).map((q) => q.slice(7));
  for (const p of motives) out.push(`  ${nameOf(c, p)}’s reason: ${personOf(c, p)?.motive}.`);
  out.push('');
  out.push('Where it stands:');
  for (const cl of recapClauses(d, run)) out.push(`  ${wrap(cl.text, 72).replace(/\n/g, '\n  ')}`);
  out.push('');
  out.push(boardGridText(c, run));
  return out.join('\n');
}
