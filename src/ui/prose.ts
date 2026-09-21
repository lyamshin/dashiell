/** Turning a page's blocks into paper. The only file that underlines a noun. */

import { clock } from '../gen/types.js';
import type { Tick } from '../gen/types.js';
import type { CaseView, Noun } from '../game/derive.js';
import { accountRuns, claimedAccount, segmentNouns, spanLabel } from '../game/derive.js';
import type { Block, Page } from '../game/types.js';
import { HELP_LINES, HELP_NOTE, EMPTY_ROOM, PRESENCE_LEAD } from '../game/voice-data.js';
import { el } from './dom.js';

export type NounClick = (noun: Noun, anchor: HTMLElement) => void;

/** A run of text with every person, room, thing and hour made clickable. */
export function proseWithNouns(text: string, view: CaseView, onNoun: NounClick): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const segment of segmentNouns(text, view)) {
    if (!segment.noun) {
      fragment.append(document.createTextNode(segment.text));
      continue;
    }
    const noun = segment.noun;
    const button = el('button', {
      class: 'noun',
      type: 'button',
      title: menuTitle(noun),
    });
    button.textContent = segment.text;
    button.addEventListener('click', () => onNoun(noun, button));
    fragment.append(button);
  }
  return fragment;
}

function menuTitle(noun: Noun): string {
  switch (noun.kind) {
    case 'person':
      return 'Ask about…';
    case 'place':
      return 'Go there';
    case 'object':
      return 'Go through it';
    case 'anchor':
      return 'Ask about that hour';
  }
}

export function renderPage(page: Page, view: CaseView, onNoun: NounClick): HTMLElement[] {
  return page.blocks.flatMap((block) => renderBlock(block, view, onNoun));
}

function renderBlock(block: Block, view: CaseView, onNoun: NounClick): HTMLElement[] {
  switch (block.kind) {
    case 'prose': {
      const p = el('p', {
        class: `prose--${block.voice}${block.clueId ? ' carries-clue' : ''}`,
      });
      p.append(proseWithNouns(block.text, view, onNoun));
      return [p];
    }
    case 'note': {
      const p = el('p', { class: 'note' });
      p.append(proseWithNouns(block.text, view, onNoun));
      return [p];
    }
    case 'presence': {
      const wrap = el('div', { class: 'presence' });
      if (block.personIds.length === 0) {
        wrap.append(el('p', { class: 'note', text: EMPTY_ROOM }));
        return [wrap];
      }
      wrap.append(el('div', { text: PRESENCE_LEAD }));
      const list = el('ul');
      for (const id of block.personIds) {
        const person = view.personById.get(id);
        if (!person) continue;
        const li = el('li');
        const button = el('button', { class: 'noun', type: 'button', title: 'Ask about…' });
        button.textContent = person.surname;
        button.addEventListener('click', () =>
          onNoun({ kind: 'person', id, text: person.surname }, button),
        );
        li.append(button, `, ${person.role}${person.isClient ? ' — our client' : ''}`);
        list.append(li);
      }
      wrap.append(list);
      return [wrap];
    }
    case 'timeline': {
      const person = view.personById.get(block.personId);
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
          proseWithNouns(
            view.placeById.get(row.placeId ?? '')?.shortName ?? 'nowhere he will say',
            view,
            onNoun,
          ),
        );
        tr.append(td);
        table.append(tr);
      }
      if (rows.length === 0) {
        return [heading, el('p', { class: 'note', text: `${clock(0)} onward: nothing he will say.` })];
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
