/**
 * docs/47 B7: why, findable and not given away.
 *
 * - The murder's papers name each person's grievance, one line each, and put
 *   nobody on top (docs/46 had them name nobody at all, which left the why a
 *   guess: Poached 5 matched the why list's order to the who list's, and
 *   Hard-boiled 8 tossed a coin between the two "he" motives).
 * - The report's why list says each reason without the suspect's pronoun
 *   ("He testified against their brother", never "her brother" for the only
 *   woman), in an order of its own, so neither the order nor a pronoun leaks it.
 *
 * Both are written per pool entry (`Person.motiveId`: `m3` is MOTIVES[3],
 * `s7` SMALL_MOTIVES[7]), so the papers' line and the form's line say the same
 * grievance in matching words. A motive from elsewhere (a hand-built fixture)
 * falls back to its own words.
 */

import { cap, clientOf, isMurder, nameOf, personOf, pronOf, victimOf, type BoardCase, type PersonId } from './model.js';

/** The report's why, without the suspect's pronoun. `{client}`, `{thing}`, `{breed}`, `{pthem}` are the night's. */
const FORMS: Record<string, string> = {
  m0: 'He had a file on them',
  m1: 'He had been squeezing them for years',
  m2: 'He knew where they were in 1921',
  m3: 'They owed him four hundred dollars',
  m4: 'They owed him the rent on a shop, and it was being called in',
  m5: 'He closed their business',
  m6: 'He threw them out of a lease',
  m7: 'He testified against their brother',
  m8: 'He jilted their sister a week before the wedding',
  s0: 'Owes Lou the bookmaker forty dollars, and Lou takes things in kind',
  s1: 'Three weeks behind on the rent, and heard to say what a {breed} with papers fetches',
  s2: 'Three weeks behind on the rent, and once asked what {thing} would pawn for',
  s3: 'Lost a job on Friday, and asked {client} what {thing} was worth',
  s4: 'Bitten by {thing} at Easter, and swore to see the back of {pthem}',
  s5: 'Woken by {thing} through the wall at five every morning, and said what they’d do about it',
  s6: 'Says {thing} was promised to them by the late Mr. {client}',
  s7: 'Has wanted {thing} since the day {client} brought {pthem} home',
  s8: 'Always said {thing} was wasted on its owner',
  s9: 'Hasn’t spoken to {client} since the business over the coal bill',
};

/** The papers' line for a murder's suspect: their grievance, with their name on it. `{he}`/`{his}`/`{him}` are theirs; "he" alone is the dead man. */
const PAPERS: Record<string, string> = {
  m0: 'a file he’d kept on {him}, thick enough to matter',
  m1: 'a column of payments, every month for years, and {his} name at the top',
  m2: 'one line, where {he} was in 1921, and an address',
  m3: 'an IOU for four hundred dollars, in {his} hand',
  m4: 'the lease on a shop, the rent owing, and a carbon of his letter calling it in',
  m5: 'the order that closed {his} business, with his signature on it',
  m6: 'a notice to quit, from when he put {him} out on the street',
  m7: 'a court transcript, his own testimony against {his} brother',
  m8: 'a wedding invitation nobody ever used; he jilted {his} sister a week before the wedding',
};

/**
 * docs/49: the same lines as the microplanner says them. In the dead man's papers a bare "he" is the
 * dead man, and on a man's page it sits beside the man's own "him": the dead man is said as his
 * role, so no pronoun on the page could be either of them.
 */
const PAPERS_PLANNED: Record<string, string> = {
  m0: 'a file the dead man had kept on {him}, thick enough to matter',
  m1: 'a column of payments, every month for years, and {his} name at the top',
  m2: 'one line, where {he} was in 1921, and an address',
  m3: 'an IOU for four hundred dollars, in {his} hand',
  m4: 'the lease on a shop, the rent owing, and a carbon of the dead man’s letter calling it in',
  m5: 'the order that closed {his} business, with the dead man’s signature on it',
  m6: 'a notice to quit, from when the dead man put {him} out on the street',
  m7: 'a court transcript, the dead man’s own testimony against {his} brother',
  m8: 'a wedding invitation nobody ever used; the dead man jilted {his} sister a week before the wedding',
};

function fill(t: string, vars: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? `{${k}}`);
}

function nightVars(c: BoardCase): Record<string, string> {
  const gone = c.givens.lines?.find((g) => g.kind === 'gone')?.vars ?? {};
  return { client: clientOf(c).short, thing: victimOf(c).short, breed: gone.breed ?? '', pthem: gone.pthem ?? 'it' };
}

/** The report form's why for a suspect: their reason, without their pronoun. */
export function motiveForm(c: BoardCase, p: PersonId): string {
  const who = personOf(c, p);
  // docs/48: a reason from the bible brings its own form.
  const t = who?.motiveForm ?? (who?.motiveId ? FORMS[who.motiveId] : undefined);
  if (!t) return cap(who?.motive ?? p);
  const out = fill(t, nightVars(c));
  return /\{\w+\}/.test(out) ? cap(who?.motive ?? p) : out;
}

/** The murder's papers, a line a suspect: "Reinhardt: a court transcript: his own testimony against her brother." */
export function papersLine(c: BoardCase, p: PersonId, planned = false): string {
  const who = personOf(c, p);
  // The dead man as his role only where his "he" could be read as theirs: on a man's page.
  // docs/55 2: on every page, since a woman's page with the dead man's "his" in it can't be read until
  // her sex is known ("his own testimony against her brother", Hard-boiled 8's #5).
  const role = planned;
  const t = who?.motivePapers ?? (who?.motiveId ? (role ? PAPERS_PLANNED : PAPERS)[who.motiveId]?.replace(/the dead man/g, victimOf(c).female ? 'the dead woman' : 'the dead man') : undefined);
  const pr = pronOf(c, p);
  if (!t || !isMurder(c)) return `${nameOf(c, p)}: ${who?.motive ?? ''}.`;
  return `${nameOf(c, p)}: ${fill(t, { he: pr.he, his: pr.his, him: pr.him })}.`;
}

/**
 * An order of the night's own for the why list: a shuffle seeded by the case, never the who
 * list's order (Poached 5 filed the fourth reason for the fourth name).
 */
export function whyOrder(c: BoardCase, ids: readonly PersonId[]): PersonId[] {
  const key = (p: PersonId) => {
    let h = 2166136261 ^ (c.seed * 31 + c.tier);
    for (const ch of `${c.id}|why|${p}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  const out = [...ids].sort((a, b) => key(a) - key(b));
  // Never the who list's own order, which is the leak itself.
  if (out.length > 1 && out.every((p, i) => p === ids[i])) out.push(out.shift() as PersonId);
  return out;
}
