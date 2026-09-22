/**
 * M6 §1 — the choice model. Everything a page offers, as data.
 *
 * The text box is gone from the book; the parser is not. Every choice here is
 * a typed command string, the same string a person would have typed, and the
 * book hands it to `stepInput` and nothing else. That is what keeps the oracle,
 * the transcript tool and the tests driving exactly the game a player plays.
 *
 * Pure. What a button costs comes from `priceOf`, the function `step` itself
 * charges by, so the minutes on a button are the minutes the clock will move.
 * Whether a button carries the lead mark is decided by what the command would
 * actually fetch, not by what it looks like: a choice is marked if and only if
 * it takes an open lead.
 */

import type { Clue, Id, Person } from '../gen/types.js';
import { minutesAfter } from './clock.js';
import type { CaseView } from './derive.js';
import { gameBudget, peopleHereNow } from './derive.js';
import { parse } from './parser.js';
import { answersTo, askedBefore, priceOf } from './reducer.js';
import type { Command, OfferedChoice, OfferedGroup, RunState } from './types.js';
import { buildNotebook, type Notebook } from './notebook.js';
import { possessiveOf, pronounOf } from './voice/cast.js';

export interface Choice extends OfferedChoice {
  /** The typed command this choice issues. The reducer sees nothing else. */
  command: string;
  /** Button text, sentence case, no verb when the group heading carries it. */
  label: string;
  /** Minutes this choice will move the clock. 0 means free. */
  minutes: number;
  /** Takes an open lead. Drawn with the mark. */
  lead: boolean;
  /** Already done. Still offered, and free (§1.4). */
  done: boolean;
  /** Small type under the label: "not been" on a place never visited. */
  note?: string;
}

export interface ChoiceGroup extends OfferedGroup {
  kind: 'ask' | 'search' | 'go' | 'free';
  /** "Ask Callahan about", "Search", "Go to". */
  heading: string;
  /** For `ask` only: whose topics these are. */
  personId?: Id;
  choices: Choice[];
  /**
   * §1.2: a topic list past twelve collapses under a free "Other topics"
   * button. These are the topics behind it. Leads, the evening and the person
   * themselves are never among them.
   */
  more?: Choice[];
}

/** §1.2: a person's topic list beyond this many collapses. */
export const TOPIC_LIMIT = 12;

/** "½ hr" for thirty minutes, "free" for none, "25 min" for anything else. */
export function minutesLabel(minutes: number): string {
  if (minutes <= 0) return 'free';
  if (minutes === 30) return '½ hr';
  return `${minutes} min`;
}

/** Clue ids an open lead points at: named by a found clue, not yet found. */
export function openTargets(view: CaseView, found: readonly Id[]): Set<Id> {
  const have = new Set(found);
  const out = new Set<Id>();
  for (const id of found) {
    for (const t of view.findableById.get(id)?.leadsTo ?? []) if (!have.has(t)) out.add(t);
  }
  return out;
}

/**
 * The places the notebook has been to: every page's room, and this one.
 * The notebook's Places section lists what is in exactly these.
 */
export function visitedPlaces(state: Pick<RunState, 'log' | 'at'>): Set<Id> {
  const out = new Set<Id>(state.log.map((p) => p.at));
  out.add(state.at);
  return out;
}

const fold = (s: string): string => s.toLowerCase().replace(/[’']/g, "'");

/**
 * Things the notebook holds: every object in a room it has been to, and any
 * object a record in it names. Nothing else is offered as a topic.
 */
export function knownObjects(view: CaseView, state: RunState): Id[] {
  const visited = visitedPlaces(state);
  const records = state.found
    .map((id) => view.findableById.get(id))
    .filter((c): c is Clue => c !== undefined)
    .map((c) => fold(c.textRecord ?? c.text));
  return view.kase.objects
    .filter((o) => visited.has(o.homePlace) || records.some((r) => r.includes(fold(o.name))))
    .map((o) => o.id);
}

/**
 * People the notebook holds: met, or heard named, and the victim, whose entry
 * the briefing wrote on page one.
 */
export function knownPeople(view: CaseView, state: RunState): Person[] {
  const met = new Set(state.met);
  const out: Person[] = [view.victim];
  for (const id of state.met) {
    const p = view.personById.get(id);
    if (p && p.id !== view.victim.id && met.has(p.id)) out.push(p);
  }
  return out;
}

/** Does `text` name `needle` as a whole phrase, ignoring case and apostrophe style? */
function names(text: string, needle: string): boolean {
  const hay = fold(text);
  const n = fold(needle);
  let from = 0;
  for (;;) {
    const i = hay.indexOf(n, from);
    if (i < 0) return false;
    if (!/[a-z0-9]/.test(hay.charAt(i - 1)) && !/[a-z0-9]/.test(hay.charAt(i + n.length))) return true;
    from = i + 1;
  }
}

/**
 * The places and things the notebook ties to one person: where they are
 * found, the rooms of their own account and of every placement written under
 * them, and any room or thing named in what they said, in a dossier line
 * about them, or in a found clue that names them. Nothing here is anything
 * the notebook does not already print beside their name.
 */
export function tiedTo(
  view: CaseView,
  state: RunState,
  person: Person,
  book: Notebook = buildNotebook(view, state),
): { places: Id[]; objects: Id[] } {
  const entry = book.people.find((p) => p.id === person.id);
  const places = new Set<Id>();
  const texts: string[] = [];
  if (entry) {
    if (person.foundAt && entry.foundAt) places.add(person.foundAt);
    texts.push(...entry.records.map((r) => r.text));
    texts.push(...entry.facts.map((f) => f.text));
    texts.push(...(entry.account ?? []).map((a) => a.place));
    const d = entry.dossier;
    texts.push(...d.onSight, ...d.volunteered, ...d.fromOthers, ...d.documents);
  }
  for (const id of state.found) {
    const clue = view.findableById.get(id);
    const text = clue ? (clue.textRecord ?? clue.text) : '';
    if (names(text, person.surname)) texts.push(text);
  }
  const blob = texts.join('\n');
  for (const place of view.places) {
    if (place.id === view.office.id) continue;
    if (names(blob, place.shortName)) places.add(place.id);
  }
  places.delete(view.office.id);
  const objects = knownObjects(view, state).filter((id) => {
    const o = view.objectById.get(id);
    return o !== undefined && names(blob, o.name);
  });
  // In the case's own order, so a person's list reads the same page to page.
  return { places: view.places.map((p) => p.id).filter((id) => places.has(id)), objects };
}

/** What a command would fetch, if it were run now. Nothing for a repeat. */
function gainsOf(view: CaseView, state: RunState, command: Command): Id[] {
  if (command.kind === 'examine') {
    if (priceOf(command, state, view).reason === 'search-again') return [];
    return (view.placeClues.get(state.at) ?? [])
      .filter((c) => !state.found.includes(c.id))
      .map((c) => c.id);
  }
  if (command.kind === 'ask') {
    const reason = priceOf(command, state, view).reason;
    if (reason === 'ask-again' || reason === 'nobody' || reason === 'self-told') return [];
    if (command.topic.kind === 'evening' || command.topic.kind === 'self') return [];
    return answersTo(view, command.personId, command.topic, state.found).map((c) => c.id);
  }
  return [];
}

/** The people standing here, as the reducer sees them. */
function presentIds(view: CaseView, state: RunState): Id[] {
  return peopleHereNow(view, state.at, {
    clientInOffice: state.clientInOffice,
    found: state.found,
  }).map((p) => p.id);
}

function stripArticle(name: string): string {
  return name.replace(/^(the|my|a|an)\s+/i, '');
}

/**
 * One choice, priced and marked by what it would do. `lead` is left to the
 * caller for travel, which fetches nothing and is marked by where it goes.
 */
function choice(
  view: CaseView,
  state: RunState,
  targets: Set<Id>,
  command: string,
  label: string,
): Choice {
  const parsed = parse(view, state.at, command, presentIds(view, state), state.found);
  const budget = gameBudget(view.kase);
  if (!parsed.ok) {
    return { command, label, minutes: 0, lead: false, done: false };
  }
  const price = priceOf(parsed.command, state, view);
  const minutes =
    minutesAfter(state.actionsUsed + price.cost, budget) - minutesAfter(state.actionsUsed, budget);
  const done =
    price.reason === 'search-again' || price.reason === 'ask-again' || price.reason === 'self-told';
  const lead = gainsOf(view, state, parsed.command).some((id) => targets.has(id));
  return { command, label, minutes, lead, done };
}

/** A person's topics, in §1.2's order, with the lead topics first and marked. */
function askGroup(view: CaseView, state: RunState, person: Person, targets: Set<Id>): ChoiceGroup {
  const s = person.surname;
  const ask = (topic: string, label: string): Choice =>
    choice(view, state, targets, `ask ${s} about ${topic}`, label);

  // 1. Open leads for this person: the exact generator topics.
  const leads: Choice[] = [];
  const seen = new Set<string>();
  for (const thread of state.threads) {
    const clue = view.findableById.get(thread.clueId);
    if (!clue || clue.source.type !== 'person' || clue.source.personId !== person.id) continue;
    if (seen.has(thread.command)) continue;
    seen.add(thread.command);
    leads.push(choice(view, state, targets, thread.command, clue.source.topic));
  }

  // 2. Their evening, and themselves. 3. Why I was hired, for the client.
  const fixed: Choice[] = [
    ask('that evening', `${possessiveOf(person)} evening`),
    ask('themselves', `${pronounOf(person) === 'she' ? 'herself' : 'himself'}`),
  ];
  if (person.id === view.client.id) fixed.push(ask('why I was hired', 'why I was hired'));

  // 4. People, 5. places, 6. things the notebook knows.
  const rest: Choice[] = [];
  for (const other of knownPeople(view, state)) {
    if (other.id === person.id) continue;
    rest.push(ask(other.surname, other.surname));
  }
  // Only the places and things the notebook ties to this person (M6 review):
  // every room in the case put to every person was twenty topics a page.
  const tied = tiedTo(view, state, person);
  for (const id of tied.places) {
    const place = view.placeById.get(id);
    if (place) rest.push(ask(place.shortName, place.shortName));
  }
  for (const id of tied.objects) {
    const object = view.objectById.get(id);
    if (object) rest.push(ask(object.name, object.name));
  }

  // A topic that would take an open lead is that lead, and it is already in
  // the lead position under its exact name. It appears once.
  const leadCommands = new Set(leads.map((c) => c.command));
  const plain = [...fixed, ...rest].filter((c) => !c.lead && !leadCommands.has(c.command));
  const fixedKept = plain.filter((c) => fixed.includes(c));
  const restKept = plain.filter((c) => rest.includes(c));

  const shown = [...leads, ...fixedKept];
  const room = Math.max(0, TOPIC_LIMIT - shown.length);
  const group: ChoiceGroup = {
    kind: 'ask',
    heading: `Ask ${s} about`,
    personId: person.id,
    choices: [...shown, ...restKept.slice(0, room)],
  };
  const more = restKept.slice(room);
  if (more.length > 0) group.more = more;
  return group;
}

/**
 * Everything a page offers, in the order the book draws it: one `ask` group
 * per person in the room, then `search`, then `go`, then the free row.
 * Empty once the report form is open: the form replaces the choices.
 */
export function choicesFor(view: CaseView, state: RunState): ChoiceGroup[] {
  if (state.reportOpen || state.filed) return [];
  const targets = openTargets(view, state.found);
  const groups: ChoiceGroup[] = [];

  for (const id of presentIds(view, state)) {
    const person = view.personById.get(id);
    if (person) groups.push(askGroup(view, state, person, targets));
  }

  // §1.3. His own office holds nothing findable and nothing to go through.
  const here = view.placeById.get(state.at);
  if (here && here.id !== view.office.id) {
    const search: Choice[] = [
      choice(view, state, targets, `examine ${here.shortName}`, 'the room'),
    ];
    for (const id of knownObjects(view, state)) {
      const object = view.objectById.get(id);
      if (object?.homePlace !== here.id) continue;
      search.push(choice(view, state, targets, `examine ${object.name}`, object.name));
    }
    groups.push({ kind: 'search', heading: 'Search', choices: search });
  }

  // §1.5. Every place, the office last, minus this one.
  const visited = visitedPlaces(state);
  const places = view.places
    .filter((p) => p.id !== state.at)
    .sort((a, b) => {
      if (a.id === view.office.id) return 1;
      if (b.id === view.office.id) return -1;
      return stripArticle(a.shortName).localeCompare(stripArticle(b.shortName));
    });
  const go: Choice[] = places.map((p) => {
    const c = choice(view, state, targets, `go ${p.shortName}`, p.shortName);
    const lead = state.threads.some((t) => t.placeId === p.id);
    return {
      ...c,
      lead,
      ...(visited.has(p.id) ? {} : { note: 'not been' }),
    };
  });
  groups.push({ kind: 'go', heading: 'Go to', choices: go });

  groups.push({
    kind: 'free',
    heading: '',
    choices: [
      { command: 'notebook', label: 'Notebook', minutes: 0, lead: false, done: false },
      { command: 'file', label: 'File the report', minutes: 0, lead: false, done: false },
    ],
  });
  return groups;
}

/** Every choice in a list of groups, the collapsed ones included. */
export function allChoices(groups: readonly ChoiceGroup[]): Choice[] {
  return groups.flatMap((g) => [...g.choices, ...(g.more ?? [])]);
}

/**
 * §1.2: whose topics the page opens on when the room holds more than one
 * person. The one with a marked lead, else the one most recently spoken to,
 * else the first to enter.
 */
export function defaultAskPerson(groups: readonly OfferedGroup[], state: RunState): Id | null {
  const asks = groups.filter((g) => g.kind === 'ask' && g.personId !== undefined);
  if (asks.length === 0) return null;
  const marked = asks.find((g) => g.choices.some((c) => c.lead));
  if (marked) return marked.personId as Id;
  for (let i = (state.asked ?? []).length - 1; i >= 0; i--) {
    const who = (state.asked[i] as { key: string }).key.split('|')[0];
    const hit = asks.find((g) => g.personId === who);
    if (hit) return hit.personId as Id;
  }
  return asks[0]?.personId ?? null;
}

/** Has this person been asked this topic before? Re-exported for the book. */
export { askedBefore };
