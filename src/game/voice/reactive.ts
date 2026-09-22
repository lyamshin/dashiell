/**
 * The reactive monologue (A.6).
 *
 * Not a deck. These lines are derived from the established board, because
 * they have to be *about* it: which man's story just died, how wide the
 * coroner's window still is, who the detective is looking at tonight. The
 * templates are here so a writer can add variants without touching the
 * arithmetic above them.
 *
 * Two things in here are the milestone's whole thesis:
 *
 * - **The leading theory.** Dashiell names the suspect with the most against
 *   them, in the flat voice of a man who has decided. It is recomputed every
 *   page, it is very often wrong, and when it changes he says so.
 * - **Bias.** For an old flame or a warm acquaintance the mild contradiction
 *   does not land: he explains it away. It takes two independent facts against
 *   the same claim before he turns, and then he turns all at once.
 */

import type { Id, Tick } from '../../gen/types.js';
import { spokenClock } from '../../gen/types.js';
import { Rng } from '../../gen/rng.js';
import type { CaseView, Established } from '../derive.js';
import { personName, placeName } from '../derive.js';
import { nounOf } from './cast.js';
import { isWarm, type DashiellRoll } from './roll.js';
import { tidyPunctuation } from './prose.js';

export interface Board {
  established: Established;
  found: Id[];
  accounts: Id[];
}

/** How many independent clues put a person somewhere their claim does not. */
export function contradictionsAgainst(est: Established, personId: Id): Id[] {
  const out = new Set<Id>();
  for (const p of est.placements.get(personId) ?? []) {
    if (p.contradicts) out.add(p.clueId);
  }
  return [...out];
}

/**
 * How much is against each suspect: a contradiction of their own account, a
 * motive, access to the weapon. This is the detective's arithmetic, not the
 * case's, and it is allowed to be wrong.
 */
export function weightAgainst(view: CaseView, est: Established, personId: Id): number {
  let n = contradictionsAgainst(est, personId).length * 2;
  if (est.motives.some((m) => m.personId === personId)) n += 1;
  if (est.access.some((a) => a.personId === personId)) n += 1;
  if (est.secretsExplained.includes(personId)) n -= 3;
  void view;
  return n;
}

/** Who he is looking at. Null when nothing leans yet. */
export function leadingTheory(view: CaseView, est: Established): Id | null {
  let best: Id | null = null;
  let bestWeight = 0;
  for (const person of view.kase.people) {
    if (person.kind !== 'suspect') continue;
    const weight = weightAgainst(view, est, person.id);
    // Ties go to nobody: a theory needs a reason to prefer one man.
    if (weight > bestWeight) {
      best = person.id;
      bestWeight = weight;
    } else if (weight === bestWeight && best !== null && weight > 0) {
      best = null;
    }
  }
  return bestWeight > 0 ? best : null;
}

const MILD = [
  'That was not what {other} had said. I let it sit.',
  '{name}’s evening and {other}’s evening do not fit in the same night. Not yet a problem.',
  'One of the two of them has the hour wrong. People have the hour wrong.',
];

const MILD_BIASED = [
  '{name} would have the hour wrong before {name} would have it crooked.',
  'It does not sit with what {other} said. There will be a reason, and it will be a dull one.',
  'Anybody can lose a half hour. I have lost whole evenings and told the truth about all of them.',
];

const HARD = [
  'Two people, two hours, and {name} in neither of them. The story is dead.',
  '{name}’s account has been contradicted twice now by people who do not know each other. That is not a bad memory.',
  'There is no reading of the evening where {name} is where {name} says. None.',
];

const HARD_TURNED = [
  'I had been carrying {name} and I put {name} down. Twice is not a bad memory.',
  'The second one did it. Whatever I had been telling myself about {name}, I stopped telling it.',
  'I gave {name} a half hour, because of what {name} is to me. The second half hour I could not give.',
];

/**
 * The coroner's window, three ways, because three different things happen to
 * it and one pool said all three the same way.
 *
 * M4b's pool had "That is two fewer half hours to argue with" in it, with the
 * two written into the sentence. It went on a page that had knocked out one
 * half hour, on a page that had established the window rather than narrowed
 * it, and — worst — on a page that had closed the window to a single tick,
 * where the sentence to say is not how many were lost but that there is only
 * one left. The count is now counted, and a window closed to one tick and a
 * window first set both have a pool of their own.
 *
 * Each line carries an id so the run can decline to say the same thing twice.
 */
export interface Narrowing {
  id: string;
  text: string;
}

/** The window came down by some half hours, and more than one is left. */
const NARROWED: Narrowing[] = [
  {
    id: 'narrowed-window',
    text: 'The window is {window} now, and getting narrower is the only thing going right.',
  },
  {
    id: 'narrowed-count',
    text: 'Whatever happened, it happened {window}. That is {count} fewer half {hours} to argue with.',
  },
  { id: 'narrowed-rewrote', text: '{window}. I wrote the new hours in over the old ones.' },
];

/** The window came down to one half hour. There is nothing left to narrow. */
const PINNED: Narrowing[] = [
  { id: 'pinned-flat', text: 'That pins it to {window}.' },
  {
    id: 'pinned-keyhole',
    text: 'One half hour left standing, and it is {window}. The window is a keyhole now.',
  },
  {
    id: 'pinned-nothing-either-side',
    text: '{window}, and nothing either side of it. Everything that matters happened inside it.',
  },
];

/** There was no window at all and now there is one. Nothing was taken away. */
const WINDOW_SET: Narrowing[] = [
  { id: 'set-ground', text: 'The window is {window}, and that is the ground to stand on.' },
  {
    id: 'set-accounted',
    text: 'Whatever happened, it happened {window}. That is the stretch every evening has to account for.',
  },
  { id: 'set-top-of-page', text: '{window}. I wrote the hours at the top of the page.' },
];

/** The three narrowing pools, exported so a test can tell which one it reached for. */
export const WINDOW_TEMPLATES = {
  narrowed: NARROWED,
  pinned: PINNED,
  set: WINDOW_SET,
} as const;

const NUMBER_WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];

/** A small count as a word, the way a man says it out loud. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

const CLEARED = [
  '{name} was doing something else, and the something else is worse for {name} than for me.',
  'So that is what {name} was covering. It takes {name} off the board and leaves the board emptier.',
  'One name off. The rest of them are still in the hat.',
];

/**
 * The leading theory, at the three strengths the evidence comes in.
 *
 * One fact is a lean. M4's integration said "It is Brauer. I have been round
 * the block on it and it comes back Brauer" on page one, off the client's word
 * and nothing else — which is not a man who has been round the block, it is a
 * man who has been told something once. The mechanic still fires on one fact,
 * and is still wrong as often as it was; it just says so in the voice of a man
 * who knows how little he has.
 */
const THEORY_LEAN = [
  'If I had to put money down tonight, {name}.',
  'Nothing is settled. If it is anybody yet, it is {name}.',
  '{name}, on what I have, which is one thing and somebody else’s word for it.',
];

const THEORY_CONVICTION = [
  'It is {name}. I have been round the block on it and it comes back {name}.',
  'Two things point at {name}, and neither of them came from {name}.',
  'I am looking at {name} now, and I have stopped looking politely.',
];

const THEORY_CERTAIN = [
  'Say it plainly: {name} did this.',
  'Everything on the page points one way tonight, and the way is {name}.',
  'There is no reading of the evening left where {name} walks out of it.',
];

const THEORY_CHANGED_LEAN = [
  'I had been leaning on {old}. Tonight I would lean on {name} instead, and not hard.',
  'Put {old} down for a minute. {name} is the one with something against them now.',
];

const THEORY_CHANGED = [
  'I had been looking at the wrong {oldNoun}. It is {name}.',
  'For two hours it was {old}. It is not {old}. It is {name}.',
  'I put {old} back in the hat and took out {name}.',
];

const CLOCK = [
  '{left} calls left before the DA opens the door, and a list that wants nine.',
  'The clock is the part of this I cannot argue with. {left} left.',
  '{left} more and then whatever I have is what they get.',
];

/**
 * The four contradiction pools, exported so a test can tell which one the
 * monologue reached for. Bias is only real if it is visible in the prose.
 */
export const CONTRADICTION_TEMPLATES = {
  mild: MILD,
  mildBiased: MILD_BIASED,
  hard: HARD,
  hardTurned: HARD_TURNED,
} as const;

/** The theory pools, by how much is actually against the man. */
export const THEORY_TEMPLATES = {
  lean: THEORY_LEAN,
  conviction: THEORY_CONVICTION,
  certain: THEORY_CERTAIN,
  changedLean: THEORY_CHANGED_LEAN,
  changed: THEORY_CHANGED,
} as const;

/**
 * How many separate things are against this person — not `weightAgainst`,
 * which is the detective's arithmetic and double-counts a contradiction on
 * purpose. This is the count a reader would make: each contradicting clue,
 * a motive, access to the weapon.
 */
export function factsAgainst(est: Established, personId: Id): number {
  let n = contradictionsAgainst(est, personId).length;
  if (est.motives.some((m) => m.personId === personId)) n += 1;
  if (est.access.some((a) => a.personId === personId)) n += 1;
  return n;
}

/** One fact is a lean, two a conviction, three or more a certainty. */
export function theoryPool(strength: number, changed: boolean): string[] {
  if (changed) return strength <= 1 ? THEORY_CHANGED_LEAN : THEORY_CHANGED;
  if (strength <= 1) return THEORY_LEAN;
  if (strength === 2) return THEORY_CONVICTION;
  return THEORY_CERTAIN;
}

export interface ReactiveInput {
  view: CaseView;
  roll: DashiellRoll;
  before: Established;
  after: Established;
  /** Whose claim the page's new facts speak to. */
  touched: Id[];
  actionsLeft: number;
  /** The theory as of the previous page, from the run state. */
  previousTheory: Id | null;
  seed: number;
  /** Whether this run has already said a narrowing line, by its id. */
  used?: ((id: string) => boolean) | undefined;
}

export interface ReactiveResult {
  lines: string[];
  theory: Id | null;
  /**
   * Narrowing line ids this page reached for, each with the index of the line
   * it became. The page drops a second thought when it is already long, and a
   * line that was never printed was never said.
   */
  spent: { id: string; line: number }[];
}

function pick(rng: Rng, pool: string[], slots: Record<string, string>): string {
  return fillTemplate(rng.pick(pool), slots);
}

function fillTemplate(template: string, slots: Record<string, string>): string {
  let text = template;
  for (const [k, v] of Object.entries(slots)) text = text.split(`{${k}}`).join(v);
  return tidyPunctuation(text.replace(/\{[a-z]+\}/g, ''));
}

/**
 * A narrowing line the run has not used yet, if there is one. A night only
 * narrows the window two or three times and hearing the same sentence for
 * each of them is the tell that nothing is thinking behind it.
 */
function pickNarrowing(
  rng: Rng,
  pool: Narrowing[],
  used?: (id: string) => boolean,
): Narrowing {
  const fresh = used ? pool.filter((t) => !used(t.id)) : pool;
  return rng.pick(fresh.length > 0 ? fresh : pool) as Narrowing;
}

/**
 * §A.3. The monologue is the detective thinking, and he thinks in hours, not
 * in clock faces: "the window is half past nine to ten o'clock".
 */
function windowLabel(ticks: Tick[]): string {
  if (ticks.length === 0) return 'anybody’s guess';
  if (ticks.length === 1) return spokenClock(ticks[0] as Tick);
  return `${spokenClock(ticks[0] as Tick)} to ${spokenClock(ticks[ticks.length - 1] as Tick)}`;
}

/**
 * What the detective thinks, given what just changed. At most two lines: the
 * page has other work to do.
 */
export function reactiveMonologue(input: ReactiveInput): ReactiveResult {
  const { view, roll, before, after, touched, actionsLeft } = input;
  const rng = new Rng(input.seed >>> 0);
  const lines: string[] = [];
  const spent: { id: string; line: number }[] = [];

  /* A story that just died, or just wobbled. */
  for (const personId of touched) {
    const now = contradictionsAgainst(after, personId);
    const then = contradictionsAgainst(before, personId);
    if (now.length === then.length) continue;
    const name = personName(view, personId);
    const other = otherVoice(view, after, personId) ?? 'somebody else';
    const warm = isWarm(roll, personId);
    if (now.length >= 2) {
      lines.push(pick(rng, warm && then.length < 2 ? HARD_TURNED : HARD, { name, other }));
    } else {
      lines.push(pick(rng, warm ? MILD_BIASED : MILD, { name, other }));
    }
    break;
  }

  /* The coroner's window: set, narrowed, or closed to a single half hour. */
  const narrowed = after.deathTicks.length > 0 && after.deathTicks.length < before.deathTicks.length;
  const firstSet = before.deathTicks.length === 0 && after.deathTicks.length > 0;
  if (narrowed || firstSet) {
    const lost = firstSet ? 0 : before.deathTicks.length - after.deathTicks.length;
    const pool =
      after.deathTicks.length === 1 ? PINNED : firstSet ? WINDOW_SET : NARROWED;
    const chosen = pickNarrowing(rng, pool, input.used);
    spent.push({ id: chosen.id, line: lines.length });
    lines.push(
      fillTemplate(chosen.text, {
        window: windowLabel(after.deathTicks),
        count: numberWord(lost),
        hours: lost === 1 ? 'hour' : 'hours',
      }),
    );
  }

  /* A secret explained: a red herring knocked down. */
  const newlyCleared = after.secretsExplained.filter((id) => !before.secretsExplained.includes(id));
  if (newlyCleared.length > 0) {
    lines.push(pick(rng, CLEARED, { name: personName(view, newlyCleared[0] as Id) }));
  }

  /* The leading theory, stated at the strength the evidence can carry. */
  const theory = leadingTheory(view, after);
  if (theory !== null && theory !== input.previousTheory) {
    const strength = factsAgainst(after, theory);
    const slots = {
      name: personName(view, theory),
      old: input.previousTheory === null ? '' : personName(view, input.previousTheory),
      // "The wrong man" is only right about half the cast, and the case says
      // which: the one Dashiell had been looking at until this page.
      oldNoun:
        input.previousTheory === null
          ? 'one'
          : nounOf(view.personById.get(input.previousTheory)),
    };
    lines.push(pick(rng, theoryPool(strength, input.previousTheory !== null), slots));
  }

  /* The clock. */
  if (actionsLeft > 0 && actionsLeft < 4) {
    lines.push(pick(rng, CLOCK, { left: String(actionsLeft) }));
  }

  return { lines: lines.slice(0, 2), theory, spent };
}

/** Who else put this person somewhere: the name the contradiction is against. */
function otherVoice(view: CaseView, est: Established, personId: Id): string | null {
  for (const p of est.placements.get(personId) ?? []) {
    if (!p.contradicts) continue;
    const clue = view.findableById.get(p.clueId);
    if (clue?.source.type === 'person') return personName(view, clue.source.personId);
    if (clue?.source.type === 'place') return `what was left at ${placeName(view, clue.source.placeId)}`;
  }
  return null;
}
