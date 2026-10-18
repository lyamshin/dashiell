/**
 * docs/59 item 5, the designer's note 4: every name the client drops in the office comes with who
 * they are, the first time: their job, and what they were to the dead man (or to the client). "Found
 * by a man called Zeldin, a bookmaker he owed money to, who’d come round to collect."
 *
 * The job is the case's own (`Person.job`, or the description's first clause); the tie is read off
 * what the office already says of them (the finder's errand), never invented.
 */

import { pronOf, victimOf, type BoardCase, type PersonId } from './model.js';

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "a bookmaker", "the pushcart man"; "a man", "a woman" when the case gives nothing. */
export function jobOf(c: BoardCase, id: PersonId): string {
  const p = c.people.find((x) => x.id === id);
  if (p?.job) return p.job;
  const first = p?.description.split(/;|,/)[0]?.trim();
  if (first && /^(?:a|an|the) /.test(first)) return first;
  return pronOf(c, id).he === 'she' ? 'a woman' : 'a man';
}

/** Who somebody is, as the client says it the first time: "a cafeteria cashier"; null when the case has no job for them. */
export function glossOf(c: BoardCase, id: PersonId): string | null {
  const p = c.people.find((x) => x.id === id);
  if (p?.job) return p.job;
  const first = p?.description.split(/;/)[0]?.trim();
  return first && /^(?:a|an|the) /.test(first) && !/\bclient\b/.test(first) ? first : null;
}

/**
 * The finder, glossed: their job, what they were to the dead, and why they came round, read off the
 * office's own errand ("who’d come round to collect a debt" is "a bus conductor he owed money to, who’d
 * come round to collect"). The dead are "he" or "she" here: the sentence is about them.
 */
export function finderGloss(c: BoardCase, finder: PersonId, finderWhy: string): string {
  const job = jobOf(c, finder);
  const v = victimOf(c);
  const pr = pronOf(c, v.id);
  // (On a world night the errand may say the dead by name, beside somebody of their sex.)
  // docs/59: where the finder and the dead are of one sex, "who owed him money" could be either's: the
  // dead by their role (and the reference pass leaves the finding as written).
  const same = pronOf(c, finder).he === pr.he;
  const dead = v.female ? 'the dead woman' : 'the dead man';
  const him = same ? dead : pr.him;
  const his = same ? `${dead}’s` : pr.his;
  const he = same ? dead : pr.he;
  const why = finderWhy.replace(new RegExp(`\\b${esc(v.short)}’s\\b`), his).replace(new RegExp(`\\b${esc(v.short)}\\b`), him);
  // A finder who owed the dead money (their own reason) came about it; the dead didn't owe them.
  const owes = /^m[34]$/.test(c.people.find((x) => x.id === finder)?.motiveId ?? '');
  if (/collect a debt/.test(why)) return owes ? `${job} who owed ${him} money and had come round about it` : `${job} ${he} owed money to, who’d come round to collect`;
  if (/card game/.test(why)) return `${job} ${he} played cards with on Thursdays, who’d come up for the game`;
  if (/radio still going/.test(why)) return `${job} who heard ${his} radio still going, and knocked`;
  if (/borrowed book/.test(why)) return `${job} who’d borrowed a book from ${him}, and came to give it back`;
  if (/settle a bet/.test(why)) return `${job} who’d had a bet with ${him}, and came to settle it`;
  return `${job}, ${why}`;
}

/**
 * The client's guests, each with their job the first time: "Doyle, a bus conductor, and Lathrop, a shoe
 * clerk"; three or more with semicolons, so a job never reads as another guest.
 */
export function guestsGlossed(c: BoardCase, ids: readonly PersonId[], glossed: Set<string>): string {
  const bits = ids.map((id) => {
    const p = c.people.find((x) => x.id === id);
    const g = !glossed.has(id) ? glossOf(c, id) : null;
    glossed.add(id);
    return g ? `${p?.short}, ${g}` : (p?.short ?? id);
  });
  if (bits.length <= 1) return bits[0] ?? '';
  const commas = bits.some((b) => b.includes(','));
  if (bits.length === 2) return commas ? `${bits[0]}, and ${bits[1]}` : `${bits[0]} and ${bits[1]}`;
  return commas ? `${bits.slice(0, -1).join('; ')}; and ${bits[bits.length - 1]}` : `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
}
