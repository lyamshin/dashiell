/**
 * The clock. The body was found at midnight; the DA's office opens at eight
 * and files whatever the precinct has. Eight hours, `budget` actions.
 *
 * The spec says each action advances the clock by `480 / budget` minutes
 * rounded to the nearest five. Rounding each step independently and then
 * stacking the rounding error breaks the thing the clock is for: at a budget
 * of 17 the rounded step is 30 minutes, seventeen of those is 8:30 AM, and the
 * deadline would take an action the budget had already paid for. So the
 * rounding is applied to the running total instead. The step is `480 / budget`
 * to the nearest five on average and to the minute at the end: the last action
 * always lands on 8:00 AM exactly, for every budget from 13 to 20.
 */

import { NIGHT_MINUTES } from './types.js';

const round5 = (m: number): number => Math.round(m / 5) * 5;

/** The nominal step, for the running head's "about half an hour a call". */
export function minutesPerAction(budget: number): number {
  if (budget <= 0) return NIGHT_MINUTES;
  return round5(NIGHT_MINUTES / budget);
}

/** Minutes past midnight after `used` actions. Never past 8:00 AM. */
export function minutesAfter(used: number, budget: number): number {
  if (budget <= 0) return NIGHT_MINUTES;
  return Math.min(NIGHT_MINUTES, round5((used * NIGHT_MINUTES) / budget));
}

/** "12:00 AM", "3:25 AM", "8:00 AM". */
export function formatClock(minutesPastMidnight: number): string {
  const total = ((minutesPastMidnight % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function clockAfter(used: number, budget: number): string {
  return formatClock(minutesAfter(used, budget));
}

export function actionsLeft(used: number, budget: number): number {
  return Math.max(0, budget - used);
}

/** The DA is at the door. */
export function isOver(used: number, budget: number): boolean {
  return used >= budget;
}

/* ------------------------------------------------------------------ *
 * M6 §3 — the clock, always in view.
 * ------------------------------------------------------------------ */

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
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
];

/** A count in words up to twenty, and in figures past it. */
export function countWord(n: number): string {
  return n >= 0 && n < NUMBER_WORDS.length ? (NUMBER_WORDS[n] as string) : String(n);
}

export type Notch = 'spent' | 'next' | 'left';

export interface ClockStrip {
  /** "3:25 AM", large, in the running head. */
  time: string;
  /** One per call in the night's budget: spent, the next one, or still to come. */
  notches: Notch[];
  /** "Six calls left before the DA files at eight." */
  left: string;
}

/**
 * The strip under the running head: one notch per call in the night's budget,
 * the spent ones filled, the next one amber, and how many are left in words.
 */
export function clockStrip(
  used: number,
  budget: number,
  /** M14: who is waiting at eight — the DA, or a client who wants an answer. */
  deadline = 'the DA files at eight',
): ClockStrip {
  const spent = Math.max(0, Math.min(used, budget));
  const notches: Notch[] = Array.from({ length: Math.max(0, budget) }, (_, i) =>
    i < spent ? 'spent' : i === spent ? 'next' : 'left',
  );
  const n = actionsLeft(used, budget);
  const word = countWord(n);
  const left =
    n === 0
      ? `No calls left. ${deadline.charAt(0).toUpperCase()}${deadline.slice(1)}.`
      : `${word.charAt(0).toUpperCase()}${word.slice(1)} call${n === 1 ? '' : 's'} left before ${deadline}.`;
  return { time: clockAfter(used, budget), notches, left };
}

/** Actions spent by the end of page `n` of a log: what the strip shows on that page. */
export function usedByPage(log: readonly { cost: number }[], n: number): number {
  return log.slice(0, n + 1).reduce((sum, p) => sum + p.cost, 0);
}
