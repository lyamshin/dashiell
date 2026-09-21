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
