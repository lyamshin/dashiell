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
import { gameBudget, goneObjects, peopleHereNow } from './derive.js';
import { parse } from './parser.js';
import { accountRider, answersTo, askedBefore, followUpOf, pendingFor, priceOf, recapOpen, rundownOpen } from './reducer.js';
import type { Command, OfferedChoice, OfferedGroup, RunState } from './types.js';
import { buildNotebook, type Notebook } from './notebook.js';
import { possessiveOf, pronounOf } from './voice/cast.js';
import {
  clientPointerOnly,
  claimedNow,
  firstVisit,
  focusOn,
  graphStars,
  pickerFocus,
  readyConfronts,
  readyOn,
  softMarks,
  watcherOf,
  type StarCandidate,
} from './guidance.js';
import {
  accountClueOf,
  canConfront,
  displayName,
  nameKnown,
  partRef,
  partsOf,
  pickFacts,
  saidRecords,
  type PickFact,
} from './m9.js';

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
  /**
   * Shorter nights §2: marked only because the first question to somebody
   * brings their account, which a lead points at. Such a topic keeps its own
   * place in the list. Never drawn; dropped before the page keeps its groups.
   */
  riding?: boolean;
  /**
   * What it would bring, if taken now: for the star pass (docs/39 §2).
   * Dropped before the page keeps its groups.
   */
  gains?: Id[];
}

export interface ChoiceGroup extends OfferedGroup {
  /**
   * `put` (docs/39 §1): at Raw and Coddled, the ready-made confrontation — a
   * fact in hand that truly breaks somebody's account, named on the button.
   */
  kind: 'ask' | 'search' | 'go' | 'free' | 'confront' | 'continue' | 'rundown' | 'recap' | 'put';
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

/**
 * What a button says it costs: its minutes, and, when it is free only by an
 * allowance, which one ("free — 1 left on the house"). The book and the play
 * tool both print this, so a label never promises more than the reducer gives.
 */
export function costLabel(choice: { minutes: number; freeNote?: string }): string {
  const base = minutesLabel(choice.minutes);
  return choice.minutes <= 0 && choice.freeNote ? `${base} — ${choice.freeNote}` : base;
}

/** The allowance a free price spends, in the button's words, if it spends one. */
function freeNoteOf(reason: string, state: RunState): string | undefined {
  if (reason === 'house') {
    const left = Math.max(0, 2 - state.clientAsks);
    return `${left === 1 ? 'the last one' : `${left} left`} on the house`;
  }
  if (reason === 'familiar') return 'first question only';
  return undefined;
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
  const gone = goneObjects(view.kase, state.found);
  return view.kase.objects
    .filter((o) => !gone.has(o.id))
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
    // M9, "Who knows whom": a person can be asked about by name only once
    // somebody who knows them has said it.
    if (p && p.id !== view.victim.id && met.has(p.id) && nameKnown(view, state, p.id)) out.push(p);
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
  // M10 §A.3: the whole answer, "Go on" and all — a question whose lead is
  // in its second page is still the question that takes the lead.
  const now = (clues: Clue[]): Id[] => clues.map((c) => c.id);
  const reason = priceOf(command, state, view).reason;
  if (reason === 'continue') {
    const going = pendingFor(view, state, command);
    if (!going) return [];
    const have = new Set(state.found);
    return now(
      going.item.clueIds
        .map((id) => view.findableById.get(id))
        .filter((c): c is Clue => c !== undefined && !have.has(c.id)),
    );
  }
  if (command.kind === 'examine') {
    if (reason === 'search-again') return [];
    return now((view.placeClues.get(state.at) ?? []).filter((c) => !state.found.includes(c.id)));
  }
  if (command.kind === 'ask') {
    if (reason === 'ask-again' || reason === 'nobody' || reason === 'self-told') return [];
    if (command.topic.kind === 'evening' && !view.kase.logic) return [];
    // Asked about themselves, a person tells no clue — but in a tiered case
    // the first question still brings their evening (shorter nights §2).
    return now(answersTo(view, command.personId, command.topic, state.found));
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
    price.reason === 'search-again' ||
    price.reason === 'ask-again' ||
    price.reason === 'self-told' ||
    price.reason === 'confront-again';
  const all = gainsOf(view, state, parsed.command);
  const gains = all.filter((id) => targets.has(id));
  const lead = gains.length > 0;
  // Shorter nights §2: a lead to somebody's account is taken by any first
  // question to them, so every such question carries the mark. `riding` says
  // the mark is the account's alone, and the topic keeps its own place.
  const asked = parsed.command.kind === 'ask' ? parsed.command : null;
  const rider = asked ? accountRider(view, asked.personId, asked.topic, state.found) : null;
  const riding = lead && rider !== null && gains.every((id) => id === rider.id);
  const freeNote = minutes === 0 ? freeNoteOf(price.reason, state) : undefined;
  return {
    command,
    label,
    minutes,
    lead,
    done,
    ...(freeNote ? { freeNote } : {}),
    ...(riding ? { riding: true } : {}),
    ...(all.length > 0 ? { gains: all } : {}),
  };
}

/** Would "why I was hired" bring anything the notebook lacks, their evening aside? */
function hireBrings(view: CaseView, state: RunState, person: Person): boolean {
  const rider = accountRider(view, person.id, { kind: 'hire' }, state.found);
  return answersTo(view, person.id, { kind: 'hire' }, state.found).some((c) => c.id !== rider?.id);
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
    const label = clue.kind === 'account' && view.kase.logic ? `${possessiveOf(person)} evening` : clue.source.topic;
    leads.push(choice(view, state, targets, thread.command, label));
  }

  // 2. Their evening, and themselves. 3. Why I was hired, for the client.
  // Honest mechanics (docs/38): in a tiered case somebody with no account
  // of their own (a watcher at their post) has no evening to give; the
  // button would only ever get "I can't help you there", so it is not offered.
  const hasEvening = !view.kase.logic || accountClueOf(view, person.id) !== null;
  const v2 = view.kase.engine === 'v2';
  const fixed: Choice[] = [
    ...(hasEvening ? [ask('that evening', `${possessiveOf(person)} evening`)] : []),
    ask('themselves', `${pronounOf(person) === 'she' ? 'herself' : 'himself'}`),
  ];
  // Guidance (docs/39): in v2 the client's reasons are on page one, and the
  // question brought nothing but "I've told you what I know" (and, first,
  // spent a question on the house on it). It is offered while it would
  // bring something the notebook lacks.
  if (person.id === view.client.id && (!v2 || hireBrings(view, state, person))) fixed.push(ask('why I was hired', 'why I was hired'));
  // Guidance (docs/39 §2): a watcher at their post is asked about the room
  // they watch — their counts, their doorway. In a tiered case no room is a
  // topic otherwise, and in v2 no lead ever pointed there, so the counts the
  // lie rule teaches were out of reach.
  const post = v2 && view.kase.logic ? watcherOf(view, state.at) : null;
  if (post && post.id === person.id) {
    const place = view.placeById.get(state.at);
    if (place) fixed.push(ask(place.shortName, place.shortName));
  }

  // 4. People, 5. places, 6. things the notebook knows.
  const rest: Choice[] = [];
  for (const other of knownPeople(view, state)) {
    if (other.id === person.id) continue;
    rest.push(ask(other.surname, other.surname));
  }
  // Only the places and things the notebook ties to this person (M6 review):
  // every room in the case put to every person was twenty topics a page.
  // M9 §4: a tiered case offers no places or things at all except as leads —
  // they were the main source of half hours spent for nothing.
  const tied = view.kase.logic ? { places: [], objects: [] } : tiedTo(view, state, person);
  for (const id of tied.places) {
    const place = view.placeById.get(id);
    if (place) rest.push(ask(place.shortName, place.shortName));
  }
  for (const id of tied.objects) {
    const object = view.objectById.get(id);
    if (object) rest.push(ask(object.name, object.name));
  }

  // A topic that would take an open lead is that lead, and it is already in
  // the lead position under its exact name. It appears once. A topic marked
  // only because their account rides on it (shorter nights §2) is not that
  // lead: it stays where it is, marked.
  const leadCommands = new Set(leads.map((c) => c.command));
  const plain = [...fixed, ...rest].filter((c) => (!c.lead || c.riding) && !leadCommands.has(c.command));
  const fixedKept = plain.filter((c) => fixed.includes(c));
  const restKept = plain.filter((c) => rest.includes(c));

  const shown = [...leads, ...fixedKept];
  const room = Math.max(0, TOPIC_LIMIT - shown.length);
  const bare = (c: Choice): Choice => {
    if (!c.riding) return c;
    const { riding: _riding, ...rest } = c;
    return rest;
  };
  const group: ChoiceGroup = {
    kind: 'ask',
    heading: `Ask ${displayName(view, state, person.id)} about`,
    personId: person.id,
    choices: [...shown, ...restKept.slice(0, room)].map(bare),
  };
  const more = restKept.slice(room).map(bare);
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

  // M10 §A.3: a page that stopped at three families ends on "Go on", free.
  const going = pendingFor(view, state, { kind: 'continue' });
  if (going) {
    const lead = gainsOf(view, state, { kind: 'continue' }).some((id) => targets.has(id));
    groups.push({
      kind: 'continue',
      heading: '',
      ...(going.item.personId ? { personId: going.item.personId } : {}),
      choices: [{ command: 'go on', label: 'Go on', minutes: 0, lead, done: false }],
    });
  }

  // M11 §A.5: with the client in the room and somebody else in it, the
  // client will say who they are. Free, once a visit, and never a lead.
  if (rundownOpen(view, state)) {
    groups.push({
      kind: 'rundown',
      heading: '',
      personId: view.client.id,
      choices: [
        {
          command: `ask ${view.client.surname} who's here`,
          label: `Ask ${displayName(view, state, view.client.id)} who’s here`,
          minutes: 0,
          lead: false,
          done: false,
        },
      ],
    });
  }

  for (const id of presentIds(view, state)) {
    const person = view.personById.get(id);
    if (person) groups.push(askGroup(view, state, person, targets));
  }
  // Guidance (docs/39 §1): at Raw and Coddled, a fact in hand that truly
  // breaks somebody's own account, offered ready-made with the fact named —
  // the reducer's own judgement, so it always lands. A fact behind a mark on
  // the grid first, so the mark and the button say the same thing.
  const ready = readyOn(view) ? readyConfronts(view, state, new Set(softMarks(view, state).flatMap((m) => m.clueIds))) : [];
  if (ready.length > 0) {
    groups.push({
      kind: 'put',
      heading: '',
      choices: ready.map((r) => ({ ...choice(view, state, targets, r.command, r.label), lead: false })),
    });
  }
  // M9 §3: "Put it to Hanrahan" — the facts in the notebook, for anybody here
  // whose own account is written down. Never marked: choosing the fact that
  // breaks what they said is the player's work, not the page's.
  for (const id of presentIds(view, state)) {
    const person = view.personById.get(id);
    if (person) {
      const group = confrontGroup(view, state, person);
      if (group) groups.push(group);
    }
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

  // M12 Part 2: taking stock of what the notebook holds. Free, anywhere but
  // the office, and never a lead.
  if (recapOpen(view, state)) {
    groups.push({
      kind: 'recap',
      heading: '',
      choices: [{ command: 'go over what I have', label: 'Go over what I have', minutes: 0, lead: false, done: false }],
    });
  }

  groups.push({
    kind: 'free',
    heading: '',
    choices: [
      { command: 'notebook', label: 'Notebook', minutes: 0, lead: false, done: false },
      { command: 'file', label: 'File the report', minutes: 0, lead: false, done: false },
    ],
  });
  restar(view, state, groups);
  return groups;
}

/**
 * Guidance (docs/39 §2): what carries the star.
 *
 * - **v2:** of the leads the notebook has opened (a question that takes one,
 *   a walk to where one waits), the ones that bring a fact an open step of
 *   the deduction graph or an open route against a rival rests on, at most
 *   three, a question here before a walk, nearest the bottleneck first
 *   (`graphStars`). A lead to a dead end is still offered, and not starred.
 *   The client's pointer is starred only when what it points at serves the
 *   graph, like anything else. On the first visit to a watched room, asking
 *   the watcher about it comes first.
 * - **v1:** the leads as before, less the ones only the client's pointer
 *   opened.
 *
 * Mutates the groups' choices, and drops what the pass read (`gains`).
 */
function restar(view: CaseView, state: RunState, groups: ChoiceGroup[]): void {
  const strip = (c: Choice): void => {
    delete c.gains;
  };
  const every = groups.flatMap((g) => [...g.choices, ...(g.more ?? [])]);
  if (view.kase.engine === 'v2' && view.kase.v2) {
    // The candidates are the leads the notebook has opened — a question that
    // takes one, a walk to where one is — and, on the first visit to a
    // watched room, asking the watcher about it. What each would bring is
    // weighed against the graph's open steps and open routes.
    const first = firstVisit(state);
    const post = watcherOf(view, state.at);
    const targets = openTargets(view, state.found);
    const leadPlaces = new Set(state.threads.map((t) => t.placeId));
    const cands: StarCandidate[] = [];
    for (const g of groups) {
      if (g.kind === 'confront' || g.kind === 'put' || g.kind === 'free' || g.kind === 'rundown' || g.kind === 'recap') continue;
      for (const c of [...g.choices, ...(g.more ?? [])]) {
        const isGo = g.kind === 'go';
        const place = isGo ? view.places.find((p) => `go ${p.shortName}` === c.command) : undefined;
        const watcherFirst =
          first && post !== null && g.personId === post.id && c.command === `ask ${post.surname} about ${view.placeById.get(state.at)?.shortName ?? ''}`;
        const gains = isGo
          ? place && leadPlaces.has(place.id)
            ? reachableAt(view, state, place.id).filter((id) => targets.has(id))
            : []
          : watcherFirst
            ? (c.gains ?? [])
            : (c.gains ?? []).filter((id) => targets.has(id));
        cands.push({ command: c.command, gains, go: isGo, evening: / about that evening$/.test(c.command), watcherFirst, done: c.done });
      }
    }
    const starred = graphStars(view, state.found, cands);
    for (const c of every) c.lead = starred.has(c.command);
  } else if (view.kase.logic) {
    const pointer = clientPointerOnly(view, state.found);
    if (pointer.size > 0) {
      const targets = openTargets(view, state.found);
      const kept = new Set([...targets].filter((t) => !pointer.has(t)));
      for (const g of groups) {
        for (const c of [...g.choices, ...(g.more ?? [])]) {
          if (!c.lead) continue;
          if (g.kind === 'go') {
            const place = view.places.find((p) => `go ${p.shortName}` === c.command);
            c.lead = state.threads.some((t) => t.placeId === place?.id && kept.has(t.clueId));
          } else if (g.kind !== 'continue') {
            c.lead = (c.gains ?? []).some((id) => kept.has(id));
          }
        }
      }
    }
  }
  every.forEach(strip);
}

/**
 * What a walk to `placeId` could bring: what the room gives up to a search,
 * and what the questions the page there would offer would fetch — the same
 * topic lists, priced from there. For the star pass only: a star on a walk
 * is never for something the page it leads to could not then offer.
 */
function reachableAt(view: CaseView, state: RunState, placeId: Id): Id[] {
  const have = new Set(state.found);
  const out = new Set<Id>();
  if (!(state.searched ?? []).includes(placeId)) {
    for (const c of view.placeClues.get(placeId) ?? []) if (!have.has(c.id)) out.add(c.id);
  }
  const there: RunState = { ...state, at: placeId };
  const none = new Set<Id>();
  for (const person of peopleHereNow(view, placeId, { clientInOffice: state.clientInOffice, found: state.found })) {
    const g = askGroup(view, there, person, none);
    for (const c of [...g.choices, ...(g.more ?? [])]) for (const id of c.gains ?? []) out.add(id);
  }
  return [...out];
}

/**
 * The picker behind "Put it to …": one choice per fact in the notebook — a
 * rule line split into the facts it states, each still the clue's
 * (`put x012 part 2 to Hauck`) — grouped under the person or place it is
 * about, the one being confronted first, then everybody else in the case's
 * order, then the places, then the rest; within a group, by the first half
 * hour it names. What they told the detective rides along as `reference`.
 * Nothing is marked or sorted by whether it breaks anything: choosing is the
 * player's work. Null when there is nothing of theirs to put anything to.
 */
export function confrontGroup(view: CaseView, state: RunState, person: Person): ChoiceGroup | null {
  if (!canConfront(view, state, person.id)) return null;
  const facts = pickFacts(view, state, person.id);
  const peopleOrder = [person.id, ...view.kase.people.map((p) => p.id).filter((id) => id !== person.id)];
  const placeOrder = view.places.map((p) => p.id);
  const nameOf = (id: Id): string => displayName(view, state, id);
  const placeTitle = (id: Id): string => {
    const s = view.placeById.get(id)?.shortName ?? id;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const subject = (f: PickFact): Id | undefined => (f.byPlace ? undefined : f.people[0]);
  const rank = (f: PickFact): number => {
    const who = subject(f);
    if (who !== undefined && peopleOrder.includes(who)) return peopleOrder.indexOf(who);
    if (f.place !== null) return 100 + Math.max(0, placeOrder.indexOf(f.place));
    return 1000;
  };
  const sectionOf = (f: PickFact): string => {
    const who = subject(f);
    if (who !== undefined && peopleOrder.includes(who)) return nameOf(who);
    if (f.place !== null) return placeTitle(f.place);
    return 'When things happened';
  };
  // Guidance (docs/39 §1): from Poached up the picker opens on the facts
  // about them at the half hours their own account covers, grouped by the
  // half hour, and the rest are one tap away. Nothing says which one breaks it.
  const claimed = focusOn(view) ? claimedNow(view, state, person.id) : new Map();
  const focusOf = (f: PickFact): { tick: number; section: string } | null => {
    if (claimed.size === 0) return null;
    const clue = view.findableById.get(f.clueId);
    return clue ? pickerFocus(view, state, person, clue, f.part, claimed) : null;
  };
  const focused = new Map(facts.map((f) => [f, focusOf(f)]));
  const sorted = facts
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const fa = focused.get(a.f);
      const fb = focused.get(b.f);
      if (fa && !fb) return -1;
      if (fb && !fa) return 1;
      if (fa && fb && fa.tick !== fb.tick) return fa.tick - fb.tick;
      return rank(a.f) - rank(b.f) || a.f.first - b.f.first || a.i - b.i;
    })
    .map((x) => x.f);
  const choices = sorted.map((f) => {
    const who = subject(f);
    const surname = who !== undefined ? view.personById.get(who)?.surname : undefined;
    // Under a person's own heading, "Sirkin: the subway kiosk, 6:00–7:00"
    // reads "the subway kiosk, 6:00–7:00", and "Hauck says: the speakeasy,
    // 9:00" reads "own word: the speakeasy, 9:00".
    const label =
      surname && f.text.startsWith(`${surname}: `)
        ? f.text.slice(surname.length + 2)
        : surname && f.text.startsWith(`${surname} says: `)
          ? `own word: ${f.text.slice(surname.length + 7)}`
          : f.text;
    const focus = focused.get(f);
    const { gains: _gains, ...plain } = choice(view, state, new Set(), `put ${partRef(f.clueId, f.part)} to ${person.surname}`, label);
    return {
      ...plain,
      section: focus ? focus.section : sectionOf(f),
      people: f.people,
      source: f.source,
      ...(focus ? { focus: true } : {}),
    };
  });
  // Their own word, for reference: the account's spans, and anything said since.
  const account = accountClueOf(view, person.id);
  const reference = [
    ...(account ? partsOf(account).map((p) => p.text.replace(new RegExp(`^${person.surname} says: `), '')) : []),
    ...saidRecords(view, state)
      .filter((r) => r.personId === person.id)
      .map((r) => `Put to: ${r.rule}`),
  ];
  const named = new Set(facts.flatMap((f) => f.people));
  const filters = peopleOrder.filter((id) => named.has(id)).map((id) => ({ personId: id, label: nameOf(id) }));
  // Shorter nights §1: right after a fact landed, the same picker puts a
  // second one to them, for nothing. Still nothing marked.
  const follow = followUpOf(view, state)?.personId === person.id;
  return {
    kind: 'confront',
    heading: follow ? `Put another fact to ${nameOf(person.id)}` : `Put it to ${nameOf(person.id)}`,
    personId: person.id,
    choices,
    reference,
    filters,
    ...(follow ? { follow: true } : {}),
  };
}

/** Every choice in a list of groups, the collapsed ones included. */
export function allChoices(groups: readonly ChoiceGroup[]): Choice[] {
  return groups.flatMap((g) => [...g.choices, ...(g.more ?? [])]);
}

/**
 * §1.2: whose topics the page opens on when the room holds more than one
 * person. The one a fact was just put to while a second can follow, else the
 * one with a marked lead, else the one most recently spoken to, else the
 * first to enter.
 */
export function defaultAskPerson(groups: readonly OfferedGroup[], state: RunState): Id | null {
  const asks = groups.filter((g) => g.kind === 'ask' && g.personId !== undefined);
  if (asks.length === 0) return null;
  // Shorter nights §1: right after a fact landed, the one it was put to, so
  // "Put another fact to her" is on the page.
  const follow = groups.find((g) => g.kind === 'confront' && g.follow === true && asks.some((a) => a.personId === g.personId));
  if (follow) return follow.personId as Id;
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

/**
 * Honest mechanics (docs/38): the choices after a free action, laid out as
 * the page before laid them out. A free action — the notebook, a question read
 * back, the client's rundown, "Go on", a question on the house — writes a new
 * page in the same room with the clock where it was, and a numbered plan made
 * on the page before must still mean the same buttons. So nothing moves:
 * every choice the page before offered keeps its place, one that would have
 * dropped out (the rundown once given, "Go on" once gone on) stays where it
 * was, priced again and marked done, and anything new goes at the end of its
 * group, or, a new group, at the end of the list before the free row.
 *
 * `previous` is what the page before offered, already laid out this way; the
 * book keeps it on the page (`Page.offered`), the play tool replays it. After
 * a page that cost something, or a walk, the page's own order stands.
 */
export function stableChoices(
  view: CaseView,
  state: RunState,
  previous: readonly OfferedGroup[] | undefined,
): ChoiceGroup[] {
  const fresh = choicesFor(view, state);
  if (!previous || previous.length === 0 || fresh.length === 0 || !freeStep(state)) return fresh;
  const targets = openTargets(view, state.found);
  const keyOf = (g: { kind: string; personId?: Id }): string => `${g.kind}|${g.personId ?? ''}`;
  const freshBy = new Map(fresh.map((g) => [keyOf(g), g]));
  // A choice that dropped out, priced as it stands now. What it would do now
  // is nothing new (a rundown given, nothing left to go on with), so it is
  // done, and choosing it writes the book's "already" page, free.
  const ghost = (c: OfferedChoice): Choice => {
    const { riding: _riding, gains: _gains, ...plain } = choice(view, state, targets, c.command, c.label);
    const done = plain.done || plain.minutes === 0;
    // docs/39 §2: in v2 the star is the star pass's alone, and a choice done is never starred.
    return { ...plain, done, lead: view.kase.engine === 'v2' ? false : plain.lead };
  };
  const merge = (old: readonly OfferedChoice[], now: readonly Choice[]): Choice[] => {
    const byCommand = new Map(now.map((c) => [c.command, c]));
    const out: Choice[] = old.map((c) => byCommand.get(c.command) ?? ghost(c));
    const kept = new Set(old.map((c) => c.command));
    for (const c of now) if (!kept.has(c.command)) out.push(c);
    return out;
  };
  const out: ChoiceGroup[] = [];
  const placed = new Set<string>();
  for (const old of previous) {
    const key = keyOf(old);
    const now = freshBy.get(key);
    if (now === undefined) {
      // A group that is gone entirely: the rundown and "Go on" stay, done.
      // Anybody's own group goes with them if they have left the room.
      if (old.kind === 'continue' || old.kind === 'rundown') {
        out.push({ ...(old as ChoiceGroup), choices: old.choices.map(ghost) });
        placed.add(key);
      }
      continue;
    }
    placed.add(key);
    if (now.kind === 'confront') {
      // The picker lists the notebook's facts as they stand; it is one button.
      out.push(now);
      continue;
    }
    const oldMore = old.more ?? [];
    const inOldMore = new Set(oldMore.map((c) => c.command));
    const nowAll = [...now.choices, ...(now.more ?? [])];
    const choices = merge(old.choices, nowAll.filter((c) => !inOldMore.has(c.command)));
    const more = oldMore.length > 0 ? merge(oldMore, nowAll.filter((c) => inOldMore.has(c.command))) : [];
    const { more: _more, ...head } = now;
    out.push({ ...head, choices, ...(more.length > 0 ? { more } : {}) });
  }
  // New groups, in the page's own order, ahead of the free row.
  const added = fresh.filter((g) => !placed.has(keyOf(g)));
  if (added.length > 0) {
    const freeAt = out.findIndex((g) => g.kind === 'free');
    out.splice(freeAt < 0 ? out.length : freeAt, 0, ...added);
  }
  return out;
}

/**
 * Did the newest page cost nothing and leave the detective where he was? Then
 * it is the same page's choices, and `stableChoices` keeps them in place.
 */
export function freeStep(state: RunState): boolean {
  const last = state.log[state.log.length - 1];
  const before = state.log[state.log.length - 2];
  return last !== undefined && before !== undefined && last.cost === 0 && last.at === before.at;
}
