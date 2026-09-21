/** The right-hand page. */

import type { Notebook } from '../game/notebook.js';
import type { Thread } from '../game/types.js';
import { el } from './dom.js';

export function renderNotebook(
  book: Notebook,
  onLead: (thread: Thread) => void,
  onFile: () => void,
): HTMLElement {
  const body = el('div', { class: 'body' });

  /* 1. The clock. */
  body.append(
    el('h2', { text: 'The clock' }),
    el(
      'div',
      { class: 'nb-clock' },
      el('span', { class: 'time', text: book.clock.time }),
      el(
        'span',
        {},
        `${book.clock.actionsLeft} of ${book.clock.budget} left`,
      ),
    ),
    el('p', {
      class: 'note',
      text:
        book.clock.actionsLeft === 0
          ? 'The DA is at the door.'
          : `About ${book.clock.perAction} minutes a call. ${book.foundCount} of ${book.findableCount} things written down.`,
    }),
  );

  /* 2. People. */
  body.append(el('h2', { text: 'People' }));
  if (book.people.length === 0) body.append(el('p', { class: 'note', text: 'Nobody yet.' }));
  for (const person of book.people) {
    const entry = el('div', { class: 'nb-entry' });
    const who = el('div', { class: 'who' });
    who.append(
      person.surname,
      el('span', {
        class: 'role',
        text: `, ${person.role}${person.isClient ? ' — our client' : ''}`,
      }),
    );
    entry.append(who);
    if (person.foundAt) {
      entry.append(el('div', { class: 'role', text: `found at ${person.foundAt}` }));
    }
    if (person.account) {
      entry.append(
        el('div', {
          class: 'nb-account',
          text:
            'says: ' + person.account.map((a) => `${a.span} ${a.place}`).join('; '),
        }),
      );
    }
    if (person.facts.length > 0) {
      const list = el('ul');
      for (const fact of person.facts) {
        const li = el('li', { class: fact.contradicts ? 'contradiction' : '' });
        li.append(fact.text, el('span', { class: 'src', text: ` (${fact.source})` }));
        list.append(li);
      }
      entry.append(list);
    }
    // The record (M4 §A.1): what they said, in the words the case wrote it in.
    for (const record of person.records) {
      entry.append(el('div', { class: 'nb-record', text: record.text }));
    }
    body.append(entry);
  }

  /* 3. Places. */
  body.append(el('h2', { text: 'Places' }));
  for (const place of book.places) {
    const entry = el('div', { class: `nb-place${place.visited ? '' : ' unvisited'}` });
    entry.append(place.shortName);
    entry.append(
      el('span', {
        class: 'meta',
        text:
          `${place.kind}${place.watcher ? `, watched by the ${place.watcher}` : ', unwatched'}` +
          (place.visited ? '' : ' — not been'),
      }),
    );
    if (place.objects.length > 0) {
      entry.append(el('span', { class: 'objects', text: place.objects.join(', ') }));
    }
    for (const record of place.clues) {
      entry.append(el('div', { class: 'nb-record', text: record.text }));
    }
    body.append(entry);
  }

  /* 4. Threads. */
  body.append(el('h2', { text: 'Leads' }));
  if (book.threads.length === 0) {
    body.append(el('p', { class: 'note', text: 'Nothing open. Go through a room.' }));
  }
  for (const group of book.threads) {
    const wrap = el('div', { class: 'nb-leads' });
    wrap.append(
      el('span', {
        class: 'where',
        text: group.here ? `${group.placeLabel} — here` : group.placeLabel,
      }),
    );
    const list = el('ul');
    for (const lead of group.leads) {
      const li = el('li');
      const button = el('button', { class: 'lead', type: 'button' });
      button.append(lead.label, el('span', { class: 'cost', text: group.here ? '' : ' ··' }));
      button.addEventListener('click', () => onLead(lead));
      li.append(button);
      list.append(li);
    }
    wrap.append(list);
    body.append(wrap);
  }

  /* 5. Established. */
  body.append(el('h2', { text: 'Established' }));
  const dl = el('dl', { class: 'nb-established' });
  const row = (term: string, value: string): void => {
    dl.append(el('dt', { text: `${term}:` }), el('dd', { text: value }));
  };
  row('time of death', book.established.death);
  row('method', book.established.method ?? 'nothing on the body yet');
  row(
    'motives',
    book.established.motives.length > 0 ? book.established.motives.join('; ') : 'none known',
  );
  row(
    'near the weapon',
    book.established.access.length > 0 ? book.established.access.join(', ') : 'nobody yet',
  );
  row(
    'accounted for',
    book.established.cleared.length > 0 ? book.established.cleared.join(', ') : 'nobody yet',
  );
  body.append(dl);

  body.append(
    el(
      'div',
      { class: 'after' },
      (() => {
        const b = el('button', { class: 'plain-button', type: 'button', text: 'File the report' });
        b.addEventListener('click', onFile);
        return b;
      })(),
    ),
  );

  return body;
}
