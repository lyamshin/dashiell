/**
 * Turning a page's blocks into paper. The only file that marks a name.
 *
 * M6 §4: a person's name and a place's name carry a hover card, and nothing
 * else in the prose is a control any more. The buttons under the page are the
 * actions; a name is something to look up.
 */

import { clock } from '../gen/types.js';
import type { Tick } from '../gen/types.js';
import type { CaseView, Noun } from '../game/derive.js';
import { accountRuns, claimedAccount, segmentNouns, spanLabel } from '../game/derive.js';
import type { Block, Page } from '../game/types.js';
import { HELP_LINES, HELP_NOTE, EMPTY_ROOM, PRESENCE_LEAD } from '../game/voice-data.js';
import { pronounOf } from '../game/voice/cast.js';
import { el } from './dom.js';
import { attachCard, type CardSource } from './hover.js';

/** Where a name's card comes from. Null for a noun that has no card. */
export type CardFor = (noun: Noun) => CardSource | null;

/** A run of text with every person and room in it given a card. */
export function proseWithNames(text: string, view: CaseView, cardFor: CardFor): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const segment of segmentNouns(text, view)) {
    const noun = segment.noun;
    const source = noun && (noun.kind === 'person' || noun.kind === 'place') ? cardFor(noun) : null;
    if (!noun || !source) {
      fragment.append(document.createTextNode(segment.text));
      continue;
    }
    const name = el('span', { class: `noun noun--${noun.kind}`, tabindex: '0' });
    name.textContent = segment.text;
    attachCard(name, source);
    fragment.append(name);
  }
  return fragment;
}

export function renderPage(page: Page, view: CaseView, cardFor: CardFor): HTMLElement[] {
  return page.blocks.flatMap((block) => renderBlock(block, view, cardFor));
}

function renderBlock(block: Block, view: CaseView, cardFor: CardFor): HTMLElement[] {
  switch (block.kind) {
    case 'prose': {
      const p = el('p', {
        class: `prose--${block.voice}${block.clueId ? ' carries-clue' : ''}`,
      });
      p.append(proseWithNames(block.text, view, cardFor));
      return [p];
    }
    case 'note': {
      const p = el('p', { class: 'note' });
      p.append(proseWithNames(block.text, view, cardFor));
      return [p];
    }
    case 'presence': {
      const wrap = el('div', { class: 'presence' });
      if (block.personIds.length === 0) {
        wrap.append(el('p', { class: 'note', text: EMPTY_ROOM }));
        return [wrap];
      }
      // M4b §A.4: one sentence, written by the engine, with every name in it
      // carrying its card — `proseWithNames` finds the surnames on its own.
      if (block.text) {
        const p = el('p', { class: 'prose--presence' });
        p.append(proseWithNames(block.text, view, cardFor));
        wrap.append(p);
        return [wrap];
      }
      wrap.append(el('div', { text: PRESENCE_LEAD }));
      const list = el('ul');
      for (const id of block.personIds) {
        const person = view.personById.get(id);
        if (!person) continue;
        const li = el('li');
        li.append(proseWithNames(person.surname, view, cardFor));
        li.append(`, ${person.role}${person.isClient ? ' — our client' : ''}`);
        list.append(li);
      }
      wrap.append(list);
      return [wrap];
    }
    case 'timeline': {
      const person = view.personById.get(block.personId);
      // Whose evening this is, so the sentence about them agrees with them.
      const they = pronounOf(person);
      const account = claimedAccount(view, block.personId);
      const heading = el('p', {
        class: 'note',
        text: `${person?.surname ?? 'They'} gives me the evening, and I write it down as told:`,
      });
      const table = el('table', { class: 'timeline' });
      const rows = account
        ? accountRuns(account).filter((r) => r.placeId !== null)
        : block.rows.map((r) => ({ from: r.tick as Tick, to: r.tick as Tick, placeId: r.placeId }));
      for (const row of rows) {
        const tr = el('tr');
        tr.append(el('td', { text: spanLabel(row.from, row.to) }));
        const td = el('td');
        td.append(
          proseWithNames(
            view.placeById.get(row.placeId ?? '')?.shortName ?? `nowhere ${they} will say`,
            view,
            cardFor,
          ),
        );
        tr.append(td);
        table.append(tr);
      }
      if (rows.length === 0) {
        return [
          heading,
          el('p', { class: 'note', text: `${clock(0)} onward: nothing ${they} will say.` }),
        ];
      }
      return [heading, table];
    }
    case 'help': {
      const wrap = el('div');
      const table = el('table', { class: 'timeline' });
      for (const line of HELP_LINES) {
        const tr = el('tr');
        tr.append(el('td', { text: line.command }), el('td', { text: line.gloss }));
        table.append(tr);
      }
      wrap.append(table, el('p', { class: 'note', text: HELP_NOTE }));
      return [wrap];
    }
  }
}
