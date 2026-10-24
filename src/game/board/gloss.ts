/**
 * docs/59 item 5, the designer's note 4: every name the client drops in the office comes with who
 * they are, the first time: their job, and what they were to the dead man (or to the client). "Found
 * by a man called Zeldin, a bookmaker he owed money to, who’d come round to collect."
 *
 * The job is the case's own (`Person.job`, or the description's first clause); the tie is read off
 * what the office already says of them (the finder's errand), never invented.
 */

import { pronOf, victimOf, type BoardCase, type PersonId } from './model.js';
import { roleOf } from './plan/measure.js';

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
  if (/radio still going/.test(why)) return `${job} who heard ${his} radio still going and knocked`;
  if (/borrowed book/.test(why)) return `${job} who’d borrowed a book from ${him} and came to give it back`;
  if (/settle a bet/.test(why)) return `${job} who’d had a bet with ${him} and came to settle it`;
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

/* ------------------------------------------------------------------ *
 * docs/62 items 1, 4 and 11, P11 and P12: who somebody is, said once.
 * ------------------------------------------------------------------ */

/**
 * Who somebody is, as the notebook's People list says it: their job, where they live or what they
 * keep, and their tie to the night, but never where they sat tonight ("on a chair at the foot of her
 * stairs", "who sat up in the parlor"), which is the scene's to say (P11: the People line said the
 * chair while the arrival had her in the hall with a dustpan). A home called after its owner ("lives
 * at Thorndike’s flat") is said by its street (P12).
 */
export function whoTheyAre(c: BoardCase, id: PersonId): string {
  const p = c.people.find((x) => x.id === id);
  if (!p) return '';
  let d = p.description
    .replace(/, who sat up in the parlor$/, '')
    .replace(/, who sits through every show twice$/, '')
    .replace(/, at the same table every night$/, '')
    .replace(/^(the landlady), on a chair at the foot of (?:her|his) stairs at /, '$1 at ');
  const home = p.home ? c.places.find((x) => x.id === p.home) : undefined;
  if (home && home.name.includes(p.short.replace(/^(?:Mrs\.|Miss|Dr\.|Mr\.) /, ''))) d = d.replace(new RegExp(`\\blives at ${esc(home.short)}$`), `lives on ${home.street}`);
  return d;
}

/**
 * Who somebody is, in a few words beside their name the first time the night's narration meets them
 * ("Hanrahan, a regular, was at a table by the wall", "Zeldin, the barman, stood at the register end",
 * "Vogel, the woman Steinbach had named, was in the corner"): a watcher by their job, the
 * company by their tie to the night, a suspect by their trade. `here` is where the sentence is: a
 * regular here is "a regular". Null when the case gives nothing to say.
 */
export function introOf(c: BoardCase, id: PersonId, here?: string): string | null {
  const p = c.people.find((x) => x.id === id);
  if (!p) return null;
  const hereShort = here ? c.places.find((x) => x.id === here)?.short : undefined;
  const at = (s: string) => (hereShort ? s.replace(new RegExp(` at ${esc(hereShort)}$`), '') : s);
  const d = whoTheyAre(c, id);
  if (p.role === 'watcher') {
    const j = d.split(/,| at | in /)[0]?.trim() ?? '';
    return /^the /.test(j) ? j : null;
  }
  if (p.role === 'company') {
    const w = /^was with (.+?) at .+?; nobody else knows it$/.exec(d);
    // (Named in somebody's owning up: "the woman Steinbach had named", with no pronoun two people could be.)
    if (w) return `the ${p.female ? 'woman' : 'man'} ${w[1]} had named`;
    if (/^keeps /.test(d)) return `who ${d}`;
    if (/^works /.test(d)) return `who ${at(d)}`;
    const first = d.split(';')[0]?.trim() ?? '';
    if (/^a neighbou?r\b/.test(first)) return 'a neighbor';
    if (/^(?:a|an|the) /.test(first)) return at(first);
    return null;
  }
  if (p.role === 'suspect') return glossOf(c, id)?.split(';')[0]?.trim() ?? null;
  return null;
}

const strip = (s: string): string => s.replace(/⁣\d+⁤/g, '');

/** The words that say who somebody is, beside their name: their job, their role, their tie to the night. */
function glossWords(c: BoardCase, id: string): RegExp | null {
  const p = c.people.find((x) => x.id === id);
  if (!p) return null;
  const ws = new Set<string>();
  const role = roleOf(c, id);
  if (role) for (const w of role.replace(/^(?:the|my|a|an) /, '').split(/\s+/)) if (w.length > 3 && !/^(?:woman|with|camel|coat)$/.test(w)) ws.add(w);
  // (Their trade, never the place it's at: "the bartender at the Shamrock" is "bartender". A tie that
  // isn't a trade, "was with Steinbach at the print shop", says nothing on its own.)
  const first = (p.job ?? p.description.split(/[;,]/)[0] ?? '').split(/ at | in | on /)[0] ?? '';
  const job = /^(?:the|a|an) /.test(first) ? first.replace(/^(?:the|a|an) /, '') : '';
  for (const w of job.split(/\s+/)) if (w.length > 3 && !/^(?:with|from|that|this|who)$/.test(w)) ws.add(w.replace(/’s$/, ''));
  if (p.role === 'watcher') for (const w of ['landlady', 'bartender', 'barman', 'waiter', 'usher', 'cashier', 'janitor', 'doorman', 'clerk', 'keeper', 'manager']) if (p.description.includes(w)) ws.add(w);
  if (p.role === 'company') for (const w of ['regular', 'lodger', 'neighbor', 'tenant']) if (p.description.includes(w)) ws.add(w);
  if (ws.size === 0) return null;
  return new RegExp(`\\b(?:${[...ws].map(esc).join('|')})s?\\b`, 'i');
}

/**
 * Whether a sentence says who somebody is, where it names them: an apposition ("Hauck, the head
 * waiter,"), a clause ("Vogel, who Steinbach said…"), a role before the name ("the barman, Zeldin"),
 * the papers' "Reinhardt: …", or their job or role anywhere in it.
 */
export function glossedIn(c: BoardCase, id: string, sentence: string): boolean {
  const p = c.people.find((x) => x.id === id);
  if (!p) return false;
  const s = strip(sentence);
  const n = esc(p.short);
  if (new RegExp(`\\b${n}(?:’s)?, (?:the|a|an|my|our|his|her|their|who|whose|which|one of|[A-Z][\\w’]+’s)\\b`).test(s)) return true;
  if (new RegExp(`\\b${n}(?:\\s*\\(|: )`).test(s)) return true;
  // (A role or a tie before the name, set off by a comma: "the barman, Zeldin", "My client’s lodger, Rafferty".)
  if (new RegExp(`\\b(?:[Tt]he|[Aa]n?|[Mm]y|[Oo]ur|[Hh]is|[Hh]er) [\\w’ -]{2,40}?, ${n}\\b`).test(s)) return true;
  if (id === c.client && /\bmy (?:client|visitor)\b/.test(s)) return true;
  const g = glossWords(c, id);
  return !!g && g.test(s);
}

