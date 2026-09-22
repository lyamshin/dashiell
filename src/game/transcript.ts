/**
 * A run, as prose, page by page — the designer's way of reading a case
 * without playing it. Pure: the CLI in `src/cli/read.ts` only prints what
 * comes out of here.
 *
 * What a page looks like on paper is the book's business; what it *says* is
 * this. The two agree because both read the same `Page.blocks`.
 */

import { clock } from '../gen/types.js';
import type { Id, Tick } from '../gen/types.js';
import { clockAfter } from './clock.js';
import type { CaseView } from './derive.js';
import { accountRuns, claimedAccount, gameBudget, personName, spanLabel } from './derive.js';
import { buildNotebook } from './notebook.js';
import { countWords } from './voice/page.js';
import type { Verdict } from './scoring.js';
import type { Block, Page, RunState } from './types.js';
import { EMPTY_ROOM, HELP_LINES, PRESENCE_LEAD } from './voice-data.js';

const WIDTH = 76;

export function wrap(text: string, width = WIDTH, indent = ''): string {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter((w) => w.length > 0)) {
      if (line.length === 0) line = word;
      else if (line.length + 1 + word.length <= width - indent.length) line += ` ${word}`;
      else {
        out.push(indent + line);
        line = word;
      }
    }
    out.push(indent + line);
  }
  return out.join('\n');
}

export function wordsOnPage(page: Page): number {
  return countWords(page.blocks);
}

function renderBlock(block: Block, view: CaseView): string[] {
  switch (block.kind) {
    case 'prose':
      return [wrap(block.text)];
    case 'note':
      return [wrap(block.text)];
    case 'presence': {
      // M4b §A.4: the engine writes the roll as one sentence so the book and
      // this print the same words. The list is the pre-M4b fallback.
      if (block.text) return [wrap(block.text)];
      if (block.personIds.length === 0) return [wrap(EMPTY_ROOM)];
      const names = block.personIds.map((id) => {
        const p = view.personById.get(id);
        return `  ${p?.surname ?? id}, ${p?.role ?? ''}${p?.isClient ? ' — our client' : ''}`;
      });
      return [[PRESENCE_LEAD, ...names].join('\n')];
    }
    case 'timeline': {
      const account = claimedAccount(view, block.personId);
      const rows = account
        ? accountRuns(account).filter((r) => r.placeId !== null)
        : block.rows.map((r) => ({ from: r.tick as Tick, to: r.tick as Tick, placeId: r.placeId }));
      const head = `${personName(view, block.personId)} gives me the evening, and I write it down as told:`;
      if (rows.length === 0) return [wrap(`${head}\n  ${clock(0 as Tick)} onward: nothing he will say.`)];
      return [
        [
          wrap(head),
          ...rows.map(
            (r) => `    ${spanLabel(r.from, r.to).padEnd(22)}${view.placeById.get(r.placeId ?? '')?.shortName ?? '—'}`,
          ),
        ].join('\n'),
      ];
    }
    case 'help':
      return [HELP_LINES.map((l) => `    ${l.command.padEnd(30)}${l.gloss}`).join('\n')];
  }
}

export interface TranscriptOptions {
  /** Print the gap log under each page. */
  gaps?: boolean;
  /** Stop after this many pages. */
  pages?: number;
}

export function renderPageText(
  page: Page,
  view: CaseView,
  state: RunState,
  opts: TranscriptOptions = {},
): string {
  const budget = gameBudget(view.kase);
  const usedBy = state.log.slice(0, page.n + 1).reduce((n, p) => n + p.cost, 0);
  const rule = '─'.repeat(WIDTH);
  const head = `${page.head}${' '.repeat(
    Math.max(1, WIDTH - page.head.length - 22),
  )}${clockAfter(usedBy, budget)}   page ${page.n + 1}`;
  const body = page.blocks.flatMap((b) => renderBlock(b, view)).join('\n\n');
  const foot: string[] = [];
  const cost = page.cost === 0 ? 'free' : `${page.cost} action`;
  const found = page.found.length > 0 ? `, ${page.found.length} written down` : '';
  foot.push(`[${cost}${found}, ${wordsOnPage(page)} words]`);
  if (opts.gaps !== false && page.gaps.length > 0) {
    for (const gap of page.gaps) foot.push(`[gap: ${gap}]`);
  }
  return [head, rule, '', body, '', foot.join('\n')].join('\n');
}

export function renderNotebookText(view: CaseView, state: RunState): string {
  const book = buildNotebook(view, state);
  const out: string[] = ['THE NOTEBOOK', '═'.repeat(WIDTH), ''];
  out.push(
    `The clock: ${book.clock.time}, ${book.clock.actionsLeft} of ${book.clock.budget} left. ` +
      `${book.foundCount} of ${book.findableCount} things written down.`,
  );
  out.push('', 'PEOPLE');
  for (const person of book.people) {
    out.push(
      `  ${person.surname}, ${person.role}${person.isClient ? ' — our client' : ''}${
        person.foundAt ? ` (${person.foundAt})` : ''
      }`,
    );
    if (person.account) {
      out.push(wrap(`says: ${person.account.map((a) => `${a.span} ${a.place}`).join('; ')}`, WIDTH, '    '));
    }
    for (const fact of person.facts) {
      out.push(`    ${fact.contradicts ? '!' : '·'} ${fact.text} (${fact.source})`);
    }
    for (const record of person.records) out.push(wrap(`“ ${record.text}`, WIDTH, '      '));
  }
  out.push('', 'PLACES');
  for (const place of book.places) {
    out.push(
      `  ${place.shortName} — ${place.kind}${
        place.watcher ? `, watched by the ${place.watcher}` : ', unwatched'
      }${place.visited ? '' : ' — not been'}`,
    );
    for (const record of place.clues) out.push(wrap(`“ ${record.text}`, WIDTH, '      '));
  }
  out.push('', 'LEADS');
  if (book.threads.length === 0) out.push('  Nothing open.');
  for (const group of book.threads) {
    out.push(`  ${group.placeLabel}${group.here ? ' — here' : ''}`);
    for (const lead of group.leads) out.push(`    · ${lead.label}`);
  }
  out.push('', 'ESTABLISHED');
  out.push(`  time of death: ${book.established.death}`);
  out.push(`  method: ${book.established.method ?? 'nothing on the body yet'}`);
  out.push(
    `  motives: ${book.established.motives.length > 0 ? book.established.motives.join('; ') : 'none known'}`,
  );
  out.push(
    `  near the weapon: ${book.established.access.length > 0 ? book.established.access.join(', ') : 'nobody yet'}`,
  );
  out.push(
    `  accounted for: ${book.established.cleared.length > 0 ? book.established.cleared.join(', ') : 'nobody yet'}`,
  );
  return out.join('\n');
}

export function renderVerdictText(verdict: Verdict): string {
  const out: string[] = ['THE REPORT', '═'.repeat(WIDTH), ''];
  for (const field of verdict.fields) {
    out.push(
      `  ${field.label.padEnd(26)}${field.given.padEnd(28)}${field.correct ? '✓' : `✗ ${field.truth}`}`,
    );
  }
  out.push('', `  ${verdict.points} of 5 · ${verdict.outcome} · ${verdict.actionsUsed} actions against par ${verdict.par}`, '');
  for (const paragraph of verdict.closing) out.push(wrap(paragraph), '');
  return out.join('\n');
}

/** The cast sheet, so a reader can see the roll the night was played on. */
export function renderCastText(view: CaseView, state: RunState): string {
  const cast = state.cast;
  const out: string[] = ['THE ROLL', '═'.repeat(WIDTH), ''];
  out.push(`  ${state.detectiveName}: ${cast.roll.circumstance}, ${cast.roll.relationship}, ${cast.roll.weather} night.`);
  const known = Object.entries(cast.roll.knows) as [Id, { how: string; warmth: number }][];
  if (known.length === 0) out.push('  Knows nobody in this neighbourhood.');
  for (const [id, acq] of known) {
    out.push(`  Knows ${personName(view, id)} — ${acq.how} (warmth ${acq.warmth >= 0 ? '+' : ''}${acq.warmth})`);
  }
  out.push('', '  TEMPER');
  for (const person of view.kase.people) {
    if (person.kind === 'victim') continue;
    out.push(`    ${person.surname.padEnd(14)}${(cast.temper[person.id] ?? 'plain').padEnd(8)}${person.role}`);
  }
  return out.join('\n');
}
