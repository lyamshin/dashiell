/**
 * The clock. The client is in the office at midnight; at eight the DA files
 * whatever there is, or the client wants an answer. Eight hours, `budget`
 * calls.
 *
 * Each call moves the clock `480 / budget` minutes, to the nearest five.
 * Rounding each step on its own and stacking the error would put the last
 * call past eight, so the rounding is applied to the running total instead:
 * the step is right on average, and the last call lands on 8:00 AM exactly.
 */

/** The eight hours between midnight and the DA, in minutes. */
export const NIGHT_MINUTES = 480;

const round5 = (m: number): number => Math.round(m / 5) * 5;

/** Minutes past midnight after `used` calls. Never past 8:00 AM. */
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

const HOUR_NAMES = ['midnight', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const PAST = ['', 'five past', 'ten past', 'a quarter past', 'twenty past', 'twenty-five past', 'half past', 'twenty-five to', 'twenty to', 'a quarter to', 'ten to', 'five to'];

/**
 * Round 7, B8: the clock's own time, said: "eight", "a quarter to eight", "twenty past five". The
 * verdict's ending says only the time the head of the page showed ("I closed the case at a quarter to
 * eight" came at 8:00 AM).
 */
export function clockWords(minutesPastMidnight: number): string {
  const total = ((round5(minutesPastMidnight) % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60) % 12;
  const m = (total % 60) / 5;
  const name = (x: number) => HOUR_NAMES[x % 12 === 0 && x !== 0 ? 12 : x % 12] as string;
  if (m === 0) return name(h);
  return m <= 6 ? `${PAST[m]} ${name(h)}` : `${PAST[m]} ${name(h + 1)}`;
}

export function callsLeft(used: number, budget: number): number {
  return Math.max(0, budget - used);
}

/** The DA is at the door. */
export function isOver(used: number, budget: number): boolean {
  return used >= budget;
}

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
  /** "Six actions left. The DA charges somebody at eight." (docs/64: an action, never a "call") */
  left: string;
}

/**
 * The strip under the running head: one notch per call in the night's budget,
 * the spent ones filled, the next one amber, and how many are left in words.
 */
export function clockStrip(
  used: number,
  budget: number,
  /** Who is waiting at eight: the DA, or a client who wants an answer. */
  deadline = 'the DA charges somebody at eight',
): ClockStrip {
  const spent = Math.max(0, Math.min(used, budget));
  const notches: Notch[] = Array.from({ length: Math.max(0, budget) }, (_, i) =>
    i < spent ? 'spent' : i === spent ? 'next' : 'left',
  );
  const n = callsLeft(used, budget);
  const word = countWord(n);
  const Deadline = `${deadline.charAt(0).toUpperCase()}${deadline.slice(1)}`;
  const left = n === 0 ? `No actions left. ${Deadline}.` : `${word.charAt(0).toUpperCase()}${word.slice(1)} action${n === 1 ? '' : 's'} left. ${Deadline}.`;
  return { time: clockAfter(used, budget), notches, left };
}

/** Calls spent by the end of page `n` of a log: what the strip shows on that page. */
export function usedByPage(log: readonly { cost: number }[], n: number): number {
  return log.slice(0, n + 1).reduce((sum, p) => sum + p.cost, 0);
}
