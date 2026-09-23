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
import { pronounOf } from './voice/cast.js';
import { countWords } from './voice/page.js';
import type { Verdict } from './scoring.js';
import type { Block, OfferedGroup, Page, RunState } from './types.js';
import { EMPTY_ROOM, HELP_LINES, LIE_RULE, LIE_RULE_NOTE, PRESENCE_LEAD } from './voice-data.js';

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
      const head = `${personName(view, block.personId)} gave me the evening, and I wrote it down as told:`;
      const they = pronounOf(view.personById.get(block.personId));
      if (rows.length === 0) {
        return [wrap(`${head}\n  ${clock(0 as Tick)} onward: nothing ${they} will say.`)];
      }
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
      return [
        HELP_LINES.map((l) => `    ${l.command.padEnd(30)}${l.gloss}`).join('\n'),
        wrap(`${LIE_RULE} ${LIE_RULE_NOTE}`),
      ];
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

/** "½ hr", "25 min", "free". The same words the book puts on a button. */
function minutesText(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return '½ hr';
  return `${minutes} min`;
}

/**
 * M6 §7. A page's choices, one line per group, so a reviewer can read a run
 * without a browser: `*` marks a lead, `✓` a thing already done, and `>` the
 * command that was taken next. The minutes most of the group costs go on the
 * end of the line; a choice that costs something else says so beside itself.
 */
export function renderChoicesText(groups: readonly OfferedGroup[], chosen?: string): string {
  const out: string[] = [];
  const headWidth = Math.max(
    8,
    ...groups.map((g) => (g.kind === 'free' ? 'Free:' : `${g.heading}:`).length + 2),
  );
  for (const group of groups) {
    const all = [...group.choices, ...(group.more ?? [])];
    if (all.length === 0) continue;
    if (group.kind === 'confront') {
      // M9 §3: the picker is a list of every fact in the notebook; the
      // transcript says how many, and marks the one chosen.
      const picked = all.find((c) => c.command === chosen);
      const head = `${group.heading}:`.padEnd(headWidth);
      const mins = minutesText(all.find((c) => !c.done)?.minutes ?? 0);
      out.push(
        `  ${head}${all.length} ${all.length === 1 ? 'fact' : 'facts'} in the notebook (${mins} each)${
          picked ? ` · >${picked.label}` : ''
        }`,
      );
      continue;
    }
    const counts = new Map<number, number>();
    for (const c of all) counts.set(c.minutes, (counts.get(c.minutes) ?? 0) + 1);
    const usual = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0;
    const item = (c: (typeof all)[number]): string =>
      `${c.command === chosen ? '>' : ''}${c.lead ? '*' : ''}${c.label}${c.done ? ' ✓' : ''}${
        c.minutes === usual ? '' : ` (${minutesText(c.minutes)})`
      }`;
    const items = group.choices.map(item);
    if (group.more && group.more.length > 0) {
      items.push(`[other topics: ${group.more.map(item).join(' · ')}]`);
    }
    const head = (group.kind === 'free' ? 'Free:' : `${group.heading}:`).padEnd(headWidth);
    const tail =
      group.kind === 'free' ? '' : `   (${minutesText(usual)}${usual > 0 && all.length > 1 ? ' each' : ''})`;
    const body = wrap(`${items.join(' · ')}${tail}`, WIDTH - 2 - headWidth);
    const lines = body.split('\n');
    out.push(`  ${head}${lines[0] ?? ''}`);
    for (const line of lines.slice(1)) out.push(`  ${' '.repeat(headWidth)}${line}`);
  }
  return out.join('\n');
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
    // M9: somebody the detective has only seen is what anybody can see of
    // them, until somebody who knows them says the name.
    const title = person.display === person.surname ? `${person.surname}, ${person.role}` : person.display;
    out.push(
      `  ${title}${person.isClient ? ' — our client' : ''}${
        person.isVictim ? ' — the victim' : ''
      }${person.foundAt ? ` (${person.foundAt})` : ''}${person.done ? ' — told me all of it' : ''}`,
    );
    // M5 §4: the dossier, by the layer it was learned at. A layer with nothing
    // in it is not printed, because nothing has been learned at it yet.
    const layers: [string, string[]][] = [
      ['on sight', person.dossier.onSight],
      ['volunteered', person.dossier.volunteered],
      ['from others', person.dossier.fromOthers],
      ['documents', person.dossier.documents],
    ];
    for (const [label, lines] of layers) {
      if (lines.length === 0) continue;
      out.push(wrap(`${label}: ${lines.join(' ')}`, WIDTH, '    '));
    }
    // Third parties in italics: named, traceable, and not somebody you can go
    // and knock on the door of.
    for (const mention of person.mentions) {
      out.push(wrap(`_${mention.text}_`, WIDTH, '    '));
    }
    if (person.account) {
      out.push(wrap(`says: ${person.account.map((a) => `${a.span} ${a.place}`).join('; ')}`, WIDTH, '    '));
    }
    for (const fact of person.facts) {
      out.push(`    ${fact.contradicts ? '!' : '·'} ${fact.text} (${fact.source})`);
    }
    for (const record of person.records) out.push(wrap(`“ ${record.text}`, WIDTH, '      '));
    for (const said of person.said) out.push(wrap(`put to: ${said.text}`, WIDTH, '      '));
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
  out.push(`  ${book.established.deathLabel}: ${book.established.death}`);
  out.push(`  ${book.established.methodLabel}: ${book.established.method ?? 'nothing settled yet'}`);
  out.push(
    `  motives: ${book.established.motives.length > 0 ? book.established.motives.join('; ') : 'none known'}`,
  );
  out.push(
    `  ${book.established.accessLabel}: ${
      book.established.access.length > 0 ? book.established.access.join(', ') : 'nobody yet'
    }`,
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
  // M9 §5: the crime column, a line a suspect.
  if (verdict.column.length > 0) {
    out.push('', `  Where they were at ${verdict.columnTime ?? 'the hour'}:`);
    for (const c of verdict.column) {
      out.push(`    ${c.name.padEnd(24)}${c.given.padEnd(28)}${c.correct ? '✓' : `✗ ${c.truth}`}`);
    }
  }
  out.push(
    '',
    `  ${verdict.points} of ${verdict.asked} · ${verdict.outcome} · ${verdict.actionsUsed} actions against par ${verdict.par}`,
    '',
  );
  for (const paragraph of verdict.closing) out.push(wrap(paragraph), '');
  for (const gap of verdict.gaps) out.push(`[gap: ${gap}]`, '');
  // M9 §8: behind the curtain, the chain of rules that proves each answer.
  if (verdict.proofs && verdict.proofs.length > 0) {
    out.push('HOW IT COULD BE KNOWN', '═'.repeat(WIDTH), '');
    for (const { label, proof } of verdict.proofs) {
      out.push(wrap(`${label}: ${proof.what}${proof.hypothesis ? ' (it takes trying one answer and seeing it fail)' : ''}`));
      for (const r of proof.rules) out.push(wrap(`· ${r}`, WIDTH, '    '));
      out.push('');
    }
  }
  return out.join('\n');
}

/** The cast sheet, so a reader can see the roll the night was played on. */
export function renderCastText(view: CaseView, state: RunState): string {
  const cast = state.cast;
  const out: string[] = ['THE ROLL', '═'.repeat(WIDTH), ''];
  out.push(`  ${state.detectiveName}: ${cast.roll.circumstance}, ${cast.roll.relationship}, ${cast.roll.weather} night.`);
  out.push(`  The office: ${view.office.name}.`);
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
