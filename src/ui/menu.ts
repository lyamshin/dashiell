/** The little menu a clickable noun opens. */

import type { CaseView, Noun } from '../game/derive.js';
import { peopleHereNow } from '../game/derive.js';
import type { RunState } from '../game/types.js';
import { el } from './dom.js';

let open: HTMLElement | null = null;

export function closeMenu(): void {
  open?.remove();
  open = null;
}

interface Entry {
  group?: string;
  label: string;
  command: string;
}

export function openNounMenu(
  noun: Noun,
  anchor: HTMLElement,
  view: CaseView,
  state: RunState,
  run: (command: string) => void,
): void {
  closeMenu();
  const entries = entriesFor(noun, view, state);
  if (entries.length === 0) return;
  if (entries.length === 1 && !entries[0]?.group) {
    run((entries[0] as Entry).command);
    return;
  }

  const menu = el('div', { class: 'noun-menu', role: 'menu' });
  let group: string | undefined;
  for (const entry of entries) {
    if (entry.group && entry.group !== group) {
      group = entry.group;
      menu.append(el('div', { class: 'group', text: group }));
    }
    const button = el('button', { type: 'button', role: 'menuitem', text: entry.label });
    button.addEventListener('click', () => {
      closeMenu();
      run(entry.command);
    });
    menu.append(button);
  }

  const host = anchor.closest('.page') ?? document.body;
  const hostBox = host.getBoundingClientRect();
  const box = anchor.getBoundingClientRect();
  menu.style.top = `${box.bottom - hostBox.top + host.scrollTop + 4}px`;
  menu.style.left = `${Math.max(8, box.left - hostBox.left)}px`;
  host.append(menu);
  open = menu;
  (menu.querySelector('button') as HTMLButtonElement | null)?.focus();

  const dismiss = (event: Event): void => {
    if (menu.contains(event.target as Node) || event.target === anchor) return;
    closeMenu();
    document.removeEventListener('mousedown', dismiss);
    document.removeEventListener('keydown', escape);
  };
  const escape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    closeMenu();
    anchor.focus();
    document.removeEventListener('mousedown', dismiss);
    document.removeEventListener('keydown', escape);
  };
  setTimeout(() => {
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', escape);
  }, 0);
}

function entriesFor(noun: Noun, view: CaseView, state: RunState): Entry[] {
  switch (noun.kind) {
    case 'place': {
      const place = view.placeById.get(noun.id);
      if (!place) return [];
      if (place.id === state.at)
        return [{ label: `Go through ${place.shortName}`, command: `examine ${place.shortName}` }];
      return [{ label: `Go to ${place.shortName}`, command: `go ${place.shortName}` }];
    }
    case 'object': {
      const object = view.objectById.get(noun.id);
      if (!object) return [];
      if (object.homePlace === state.at)
        return [{ label: `Go through ${object.name}`, command: `examine ${object.name}` }];
      const room = view.placeById.get(object.homePlace)?.shortName ?? 'the room';
      return [{ label: `Go to ${room}, where it was kept`, command: `go ${room}` }];
    }
    case 'anchor': {
      const anchor = view.anchorById.get(noun.id);
      if (!anchor) return [];
      return peopleHereNow(view, state.at, state).map((p) => ({
        group: `About ${anchor.name}`,
        label: `Ask ${p.surname}`,
        command: `ask ${p.surname} about ${anchor.name}`,
      }));
    }
    case 'person': {
      const person = view.personById.get(noun.id);
      if (!person) return [];
      if (person.kind === 'victim') {
        // Nobody asks the victim. Ask about him instead.
        return peopleHereNow(view, state.at, state).map((p) => ({
          group: `About ${person.surname}`,
          label: `Ask ${p.surname}`,
          command: `ask ${p.surname} about ${person.surname}`,
        }));
      }
      const here = peopleHereNow(view, state.at, state).some((p) => p.id === person.id);
      if (!here) {
        const room = view.placeById.get(person.foundAt ?? '')?.shortName;
        const out: Entry[] = [];
        if (room) out.push({ label: `Go to ${room}, where ${person.surname} is`, command: `go ${room}` });
        for (const p of peopleHereNow(view, state.at, state)) {
          out.push({
            group: `About ${person.surname}`,
            label: `Ask ${p.surname}`,
            command: `ask ${p.surname} about ${person.surname}`,
          });
        }
        return out;
      }

      const out: Entry[] = [
        {
          group: `Ask ${person.surname} about…`,
          label: 'that evening',
          command: `ask ${person.surname} about that evening`,
        },
      ];
      if (person.isClient)
        out.push({
          group: `Ask ${person.surname} about…`,
          label: 'why I was hired',
          command: `ask ${person.surname} about why I was hired`,
        });
      for (const other of view.kase.people) {
        if (other.id === person.id) continue;
        if (other.kind === 'fixture') continue;
        out.push({
          group: 'People',
          label: other.surname + (other.kind === 'victim' ? ' — the victim' : ''),
          command: `ask ${person.surname} about ${other.surname}`,
        });
      }
      for (const place of view.places) {
        out.push({
          group: 'Rooms',
          label: place.shortName,
          command: `ask ${person.surname} about ${place.shortName}`,
        });
      }
      for (const anchor of view.kase.anchors) {
        out.push({
          group: 'That hour',
          label: anchor.name,
          command: `ask ${person.surname} about ${anchor.name}`,
        });
      }
      for (const object of view.kase.objects) {
        out.push({
          group: 'Things',
          label: object.name,
          command: `ask ${person.surname} about ${object.name}`,
        });
      }
      return out;
    }
  }
}
