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
import { clock } from '../../gen/types.js';
import { Rng } from '../../gen/rng.js';
import type { CaseView, Established } from '../derive.js';
import { personName, placeName } from '../derive.js';
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

const NARROWED = [
  'The window is {window} now, and getting narrower is the only thing going right.',
  'Whatever happened, it happened {window}. That is two fewer half hours to argue with.',
  '{window}. I wrote the new hours in over the old ones.',
];

const CLEARED = [
  '{name} was doing something else, and the something else is worse for {name} than for me.',
  'So that is what {name} was covering. It takes {name} off the board and leaves the board emptier.',
  'One name off. The rest of them are still in the hat.',
];

const THEORY = [
  'It is {name}. I have been round the block on it and it comes back {name}.',
  'Say it plainly: {name} did this.',
  'Everything on the page points one way tonight, and the way is {name}.',
];

const THEORY_CHANGED = [
  'I had been looking at the wrong man. It is {name}.',
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
}

export interface ReactiveResult {
  lines: string[];
  theory: Id | null;
}

function pick(rng: Rng, pool: string[], slots: Record<string, string>): string {
  let text = rng.pick(pool);
  for (const [k, v] of Object.entries(slots)) text = text.split(`{${k}}`).join(v);
  return tidyPunctuation(text.replace(/\{[a-z]+\}/g, ''));
}

function windowLabel(ticks: Tick[]): string {
  if (ticks.length === 0) return 'anybody’s guess';
  if (ticks.length === 1) return clock(ticks[0] as Tick);
  return `${clock(ticks[0] as Tick)} to ${clock(ticks[ticks.length - 1] as Tick)}`;
}

/**
 * What the detective thinks, given what just changed. At most two lines: the
 * page has other work to do.
 */
export function reactiveMonologue(input: ReactiveInput): ReactiveResult {
  const { view, roll, before, after, touched, actionsLeft } = input;
  const rng = new Rng(input.seed >>> 0);
  const lines: string[] = [];

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

  /* The coroner's window, narrowed. */
  if (after.deathTicks.length > 0 && after.deathTicks.length < before.deathTicks.length) {
    lines.push(pick(rng, NARROWED, { window: windowLabel(after.deathTicks) }));
  } else if (before.deathTicks.length === 0 && after.deathTicks.length > 0) {
    lines.push(pick(rng, NARROWED, { window: windowLabel(after.deathTicks) }));
  }

  /* A secret explained: a red herring knocked down. */
  const newlyCleared = after.secretsExplained.filter((id) => !before.secretsExplained.includes(id));
  if (newlyCleared.length > 0) {
    lines.push(pick(rng, CLEARED, { name: personName(view, newlyCleared[0] as Id) }));
  }

  /* The leading theory, stated as fact. */
  const theory = leadingTheory(view, after);
  if (theory !== null && theory !== input.previousTheory) {
    lines.push(
      input.previousTheory === null
        ? pick(rng, THEORY, { name: personName(view, theory) })
        : pick(rng, THEORY_CHANGED, {
            name: personName(view, theory),
            old: personName(view, input.previousTheory),
          }),
    );
  }

  /* The clock. */
  if (actionsLeft > 0 && actionsLeft < 4) {
    lines.push(pick(rng, CLOCK, { left: String(actionsLeft) }));
  }

  return { lines: lines.slice(0, 2), theory };
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
