/**
 * M6 §1 and §5 — the choices under the page.
 *
 * Big, plain buttons, grouped by what they do. Every one of them issues a
 * typed command through `stepInput`, which is the only way the book moves the
 * game. A turned-back page draws the choices it offered, greyed and inert.
 *
 * No hover cards on buttons: a card on a button sat over the buttons beside
 * it (M6 review). The names in the prose carry the cards.
 */

import type { Id } from '../game/types.js';
import type { OfferedChoice, OfferedGroup } from '../game/types.js';
import { el } from './dom.js';

/** "½ hr" when it is thirty, "25 min" otherwise, "free" when nothing. */
export function minutesText(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return '½ hr';
  return `${minutes} min`;
}

function spoken(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return 'half an hour';
  return `${minutes} minutes`;
}

export interface ChoicesOptions {
  /** A turned-back page: drawn, greyed, and does nothing. */
  inert: boolean;
  /** Whose topics are showing when the room holds more than one person. */
  selected: Id | null;
  /** Whether the collapsed topics are open. */
  showMore: boolean;
  onChoose: (choice: OfferedChoice, group: OfferedGroup) => void;
  onSelectPerson: (personId: Id) => void;
  onToggleMore: () => void;
  nameOf: (personId: Id) => string;
}

function choiceButton(
  choice: OfferedChoice,
  group: OfferedGroup,
  opts: ChoicesOptions,
): HTMLButtonElement {
  const classes = ['choice'];
  if (choice.lead) classes.push('choice--lead');
  if (choice.done) classes.push('choice--done');
  const label = [
    choice.label,
    choice.lead ? 'open lead' : '',
    choice.done ? 'already done' : '',
    spoken(choice.minutes),
  ]
    .filter((s) => s.length > 0)
    .join(', ');
  const button = el('button', {
    class: classes.join(' '),
    type: 'button',
    'aria-label': label,
    'data-command': choice.command,
  });
  if (opts.inert) button.disabled = true;
  if (choice.lead) button.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
  const text = el('span', { class: 'label', text: choice.label });
  if (choice.done) text.append(el('span', { class: 'check', 'aria-hidden': 'true', text: ' ✓' }));
  button.append(text);
  if (choice.note) button.append(el('span', { class: 'aside', text: choice.note }));
  button.append(el('span', { class: 'mins', text: minutesText(choice.minutes) }));
  if (!opts.inert) button.addEventListener('click', () => opts.onChoose(choice, group));
  return button;
}

export function renderChoices(groups: readonly OfferedGroup[], opts: ChoicesOptions): HTMLElement {
  const panel = el('nav', {
    class: `choices${opts.inert ? ' choices--inert' : ''}`,
    'aria-label': opts.inert ? 'What this page offered' : 'What next',
  });

  const asks = groups.filter((g) => g.kind === 'ask' && g.personId !== undefined);
  const selected =
    asks.find((g) => g.personId === opts.selected)?.personId ?? asks[0]?.personId ?? null;

  // §1.2: more than one person in the room, one person's topics at a time and
  // a free row of names to switch between them.
  if (asks.length > 1) {
    const row = el('div', { class: 'who-row', role: 'group', 'aria-label': 'Who to talk to' });
    for (const g of asks) {
      const id = g.personId as Id;
      const lead = g.choices.some((c) => c.lead);
      const button = el('button', {
        class: `who-btn${id === selected ? ' who-btn--on' : ''}${lead ? ' who-btn--lead' : ''}`,
        type: 'button',
        'aria-pressed': id === selected ? 'true' : 'false',
      });
      if (lead) button.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
      button.append(el('span', { class: 'label', text: opts.nameOf(id) }));
      if (opts.inert) button.disabled = true;
      else button.addEventListener('click', () => opts.onSelectPerson(id));
      row.append(button);
    }
    panel.append(row);
  }

  for (const group of groups) {
    if (group.kind === 'ask' && group.personId !== selected) continue;
    if (group.choices.length === 0) continue;
    const section = el('section', { class: `choice-group choice-group--${group.kind}` });
    if (group.kind === 'ask' && group.personId) {
      section.append(
        el('h3', { class: 'choice-heading', text: `Ask ${opts.nameOf(group.personId)} about` }),
      );
    } else if (group.heading.length > 0) {
      section.append(el('h3', { class: 'choice-heading', text: group.heading }));
    }
    const list = el('div', { class: 'choice-list' });
    for (const choice of group.choices) list.append(choiceButton(choice, group, opts));
    if (group.more && group.more.length > 0) {
      const toggle = el('button', {
        class: 'choice choice--more',
        type: 'button',
        'aria-expanded': opts.showMore ? 'true' : 'false',
      });
      toggle.append(
        el('span', { class: 'label', text: opts.showMore ? 'Fewer topics' : 'Other topics' }),
        el('span', { class: 'mins', text: 'free' }),
      );
      if (opts.inert) toggle.disabled = true;
      else toggle.addEventListener('click', () => opts.onToggleMore());
      list.append(toggle);
      if (opts.showMore) for (const choice of group.more) list.append(choiceButton(choice, group, opts));
    }
    section.append(list);
    panel.append(section);
  }
  return panel;
}
