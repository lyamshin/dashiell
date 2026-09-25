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
import { costLabel } from '../game/choices.js';

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
  /**
   * docs/40 §3 (v2): the page lists the people in the room, and a name opens
   * their topics (two clicks); a name chosen again shuts them. Nobody's
   * topics show until somebody is chosen.
   */
  peopleFirst?: boolean;
  /** Whose topics are showing when the room holds more than one person. */
  selected: Id | null;
  /** Whether the collapsed topics are open. */
  showMore: boolean;
  onChoose: (choice: OfferedChoice, group: OfferedGroup) => void;
  onSelectPerson: (personId: Id) => void;
  onToggleMore: () => void;
  nameOf: (personId: Id) => string;
  /** docs/40 §1: the picker's help says "her story" or "his story". */
  pronounOf?: (personId: Id) => 'he' | 'she';
  /** M9 §3: whether the "Put it to …" picker is open for the selected person. */
  pickerOpen?: boolean;
  onTogglePicker?: () => void;
  /** M9 polish: the picker narrowed to the facts about one person, or everybody. */
  pickerFilter?: Id | null;
  onPickerFilter?: (personId: Id | null) => void;
  /**
   * docs/39 §1: from Poached up the picker opens on the facts about them at
   * the half hours their own account covers; this is "Everything else in
   * the notebook", opened.
   */
  pickerAll?: boolean;
  onPickerAll?: () => void;
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
    choice.lead ? (choice.why ? `worth taking now: ${choice.why}` : 'open lead') : '',
    choice.done ? 'already done' : '',
    choice.nameCost ? `${spoken(choice.nameCost.full)}, or ${spoken(choice.nameCost.short)} if the name is new to them` : spoken(choice.minutes),
    choice.minutes <= 0 && choice.freeNote ? choice.freeNote : '',
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
  // docs/40 §2: a star says why, in a few words, under the label.
  if (choice.lead && choice.why) button.append(el('span', { class: 'aside why', text: choice.why }));
  button.append(el('span', { class: 'mins', text: costLabel(choice) }));
  if (!opts.inert) button.addEventListener('click', () => opts.onChoose(choice, group));
  return button;
}

/**
 * M9 polish — the "Put it to …" picker. What they told the detective at the
 * top, for reference and not to pick; a row of names to narrow the facts to
 * the ones about one person; then every fact in the notebook, one a line,
 * under the person or place it is about, with who said it. Nothing is marked
 * or ordered by whether it breaks anything.
 */
function renderPicker(group: OfferedGroup, opts: ChoicesOptions): HTMLElement {
  const picker = el('div', { class: 'confront-picker', role: 'group', 'aria-label': group.heading });
  const fresh = group.choices.find((c) => !c.done);
  const cost = fresh ? minutesText(fresh.minutes) : 'free';
  const whose = group.personId ? opts.nameOf(group.personId) : 'them';
  picker.append(
    el('p', {
      class: 'note',
      // Shorter nights §1: the second fact of the same confrontation.
      // docs/40 §1: what the picker is for, in one sentence and an example.
      text: group.follow
        ? `Which other fact do you read ${whose}? It costs nothing. If it does not touch what ${whose} told you, that is the end of it for now, and the story stands.`
        : opts.peopleFirst
          ? `${putHelp(opts.pronounOf?.(group.personId ?? '') ?? 'he')} ${cost === 'free' ? 'It costs nothing.' : `Each costs ${cost}.`} If it breaks nothing, the time is gone all the same, and the page says why.`
          : `Which fact do you read ${whose}? ${cost === 'free' ? 'It costs nothing.' : `Each costs ${cost}.`} If it does not touch what ${whose} told you, the time is gone all the same.`,
    }),
  );
  if ((group.reference ?? []).length > 0) {
    const ref = el('div', { class: 'picker-ref' });
    ref.append(el('h4', { class: 'picker-head', text: `What ${whose} told me` }));
    const ul = el('ul');
    for (const line of group.reference ?? []) ul.append(el('li', { text: line }));
    ref.append(ul);
    picker.append(ref);
  }
  const focus = group.choices.filter((c) => c.focus === true);
  const narrow = focus.length > 0 && opts.pickerAll !== true;
  if (narrow) {
    picker.append(
      el('p', { class: 'note picker-focus-note', text: `The facts about ${whose} at the half hours ${whose}’s own story covers, by the half hour.` }),
    );
    let section: HTMLElement | null = null;
    let heading: string | undefined;
    for (const choice of focus) {
      if (section === null || choice.section !== heading) {
        heading = choice.section;
        section = el('section', { class: 'picker-sec' });
        if (heading) section.append(el('h4', { class: 'picker-head', text: heading }));
        picker.append(section);
      }
      section.append(factButton(choice, group, opts));
    }
    const rest = group.choices.length - focus.length;
    if (rest > 0) {
      const more = el('button', { type: 'button', class: 'choice choice--more picker-all', 'aria-expanded': 'false' });
      more.append(el('span', { class: 'label', text: `Everything else in the notebook (${rest} more)` }), el('span', { class: 'mins', text: 'free' }));
      more.addEventListener('click', () => opts.onPickerAll?.());
      picker.append(more);
    }
    return picker;
  }
  const filter = opts.pickerFilter ?? null;
  const filters = group.filters ?? [];
  if (filters.length > 1) {
    const row = el('div', { class: 'picker-filter', role: 'group', 'aria-label': 'Show the facts about' });
    const chip = (label: string, id: Id | null): HTMLElement => {
      const on = filter === id;
      const b = el('button', { type: 'button', class: `picker-chip${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', text: label });
      b.addEventListener('click', () => opts.onPickerFilter?.(on ? null : id));
      return b;
    };
    row.append(el('span', { class: 'picker-filter-label', text: 'About' }), chip('everybody', null));
    for (const f of filters) row.append(chip(f.label, f.personId));
    picker.append(row);
  }
  const shown = group.choices.filter((c) => filter === null || (c.people ?? []).includes(filter));
  let section: HTMLElement | null = null;
  let heading: string | undefined;
  for (const choice of shown) {
    if (section === null || choice.section !== heading) {
      heading = choice.section;
      section = el('section', { class: 'picker-sec' });
      if (heading) section.append(el('h4', { class: 'picker-head', text: heading }));
      picker.append(section);
    }
    section.append(factButton(choice, group, opts));
  }
  if (shown.length === 0) picker.append(el('p', { class: 'note', text: 'Nothing in the notebook about them yet.' }));
  return picker;
}

/** docs/40 §1: "Pick something you know that her story can't live with. Say, …" */
export function putHelp(she: 'he' | 'she'): string {
  const her = she === 'she' ? 'her' : 'his';
  const them = she === 'she' ? 'her' : 'him';
  return `Pick something you know that ${her} story can’t live with. Say, somebody who saw ${them} somewhere else at an hour ${she} named.`;
}

function factButton(choice: OfferedChoice, group: OfferedGroup, opts: ChoicesOptions): HTMLButtonElement {
  const button = el('button', {
    class: `choice choice--fact${choice.done ? ' choice--done' : ''}`,
    type: 'button',
    'aria-label': [choice.label, choice.source ? `from ${choice.source}` : '', choice.done ? 'already put' : '', spoken(choice.minutes)]
      .filter((s) => s.length > 0)
      .join(', '),
    'data-command': choice.command,
  });
  const text = el('span', { class: 'label', text: choice.label });
  if (choice.done) text.append(el('span', { class: 'check', 'aria-hidden': 'true', text: ' ✓' }));
  button.append(text);
  if (choice.source) button.append(el('span', { class: 'fact-src', text: choice.source }));
  button.addEventListener('click', () => opts.onChoose(choice, group));
  return button;
}

/** docs/40 §3: the people in the room, a button a name, with the star and its reason. */
function peopleRow(asks: readonly OfferedGroup[], selected: Id | null, opts: ChoicesOptions): HTMLElement {
  const section = el('section', { class: 'choice-group choice-group--people' });
  section.append(el('h3', { class: 'choice-heading', text: 'Talk to' }));
  const row = el('div', { class: 'choice-list who-list', role: 'group', 'aria-label': 'Who to talk to' });
  for (const g of asks) {
    const id = g.personId as Id;
    const all = [...g.choices, ...(g.more ?? [])];
    const star = all.find((c) => c.lead);
    const on = id === selected;
    const button = el('button', {
      class: `choice who-choice${on ? ' who-choice--on' : ''}${star ? ' choice--lead' : ''}`,
      type: 'button',
      'data-person': id,
      'aria-expanded': on ? 'true' : 'false',
      'aria-label': [opts.nameOf(id), star?.why ? `worth taking now: ${star.why}` : '', on ? 'topics open' : `${all.length} topics`, 'free'].filter((s) => s.length > 0).join(', '),
    });
    if (star) button.append(el('span', { class: 'mark', 'aria-hidden': 'true', text: '*' }));
    button.append(el('span', { class: 'label', text: opts.nameOf(id) }));
    if (star?.why) button.append(el('span', { class: 'aside why', text: star.why }));
    button.append(el('span', { class: 'mins', text: on ? 'close' : `${all.length} ${all.length === 1 ? 'topic' : 'topics'}` }));
    if (opts.inert) button.disabled = true;
    else button.addEventListener('click', () => opts.onSelectPerson(id));
    row.append(button);
  }
  section.append(row);
  return section;
}

export function renderChoices(groups: readonly OfferedGroup[], opts: ChoicesOptions): HTMLElement {
  const panel = el('nav', {
    class: `choices${opts.inert ? ' choices--inert' : ''}`,
    'aria-label': opts.inert ? 'What this page offered' : 'What next',
  });

  const asks = groups.filter((g) => g.kind === 'ask' && g.personId !== undefined);
  const selected = opts.peopleFirst
    ? (asks.find((g) => g.personId === opts.selected)?.personId ?? null)
    : (asks.find((g) => g.personId === opts.selected)?.personId ?? asks[0]?.personId ?? null);

  if (opts.peopleFirst && asks.length > 0) {
    // docs/40 §3: the people here, a name a button; a name opens what to ask
    // them, and the same name again shuts it. Free either way.
    panel.append(peopleRow(asks, selected, opts));
  }
  // §1.2: more than one person in the room, one person's topics at a time and
  // a free row of names to switch between them.
  if (asks.length > 1 && !opts.peopleFirst) {
    const row = el('div', { class: 'who-row', role: 'group', 'aria-label': 'Who to talk to' });
    for (const g of asks) {
      const id = g.personId as Id;
      const lead = g.choices.some((c) => c.lead);
      const button = el('button', {
        class: `who-btn${id === selected ? ' who-btn--on' : ''}${lead ? ' who-btn--lead' : ''}`,
        type: 'button',
        'data-person': id,
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

  const draw = (group: OfferedGroup): void => {
    if (group.choices.length === 0) return;
    if (group.kind === 'confront') {
      // M9 §3: one button opens a picker of every fact in the notebook. The
      // opening is free; the fact chosen costs the half hour.
      const section = el('section', { class: 'choice-group choice-group--confront' });
      const list = el('div', { class: 'choice-list' });
      const toggle = el('button', {
        class: 'choice choice--confront',
        type: 'button',
        'aria-expanded': opts.pickerOpen ? 'true' : 'false',
        'data-command': `picker ${group.personId ?? ''}`,
      });
      toggle.append(
        el('span', { class: 'label', text: opts.pickerOpen ? 'Put nothing to them' : group.heading }),
        el('span', { class: 'mins', text: 'free' }),
      );
      if (opts.inert) toggle.disabled = true;
      else toggle.addEventListener('click', () => opts.onTogglePicker?.());
      list.append(toggle);
      if (opts.pickerOpen && !opts.inert) list.append(renderPicker(group, opts));
      section.append(list);
      panel.append(section);
      return;
    }
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
    if (opts.peopleFirst && group.kind === 'ask') {
      // docs/40 §3: every topic is listed once the person is chosen.
      for (const choice of group.more ?? []) list.append(choiceButton(choice, group, opts));
      const notes: string[] = [];
      if ((group.unknown ?? []).length > 0) {
        notes.push(`${opts.nameOf(group.personId as Id)} doesn’t know by name: ${(group.unknown ?? []).join(', ')}. It’s in the notebook.`);
      }
      const named = [...group.choices, ...(group.more ?? [])].find((c) => c.nameCost);
      if (named) notes.push(`“${costLabel(named)}”: a name they turn out not to know costs five minutes, not a call, and goes in the notebook all the same.`);
      section.append(list);
      for (const n of notes) section.append(el('p', { class: 'note topic-note', text: n }));
      panel.append(section);
      return;
    }
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
  };
  if (opts.peopleFirst) {
    // docs/40 §3: the chosen person's topics, and putting a fact to them,
    // right under the row of names; then the rest of the page.
    for (const g of groups) if (g.kind === 'ask' && g.personId === selected) draw(g);
    for (const g of groups) if (g.kind === 'confront' && g.personId === selected && !g.follow) draw(g);
    for (const g of groups) {
      if (g.kind === 'ask') continue;
      // A confrontation waiting on its free second fact stays on the page.
      if (g.kind === 'confront' && !g.follow) continue;
      draw(g);
    }
    return panel;
  }
  for (const group of groups) {
    if (group.kind === 'ask' && group.personId !== selected) continue;
    if (group.kind === 'confront' && group.personId !== selected) continue;
    draw(group);
  }
  return panel;
}
