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
import { lean } from './plan/dial.js';

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
  // (Round 6, U6: the claim in their own mouth, which needs no pronoun: "promised them" read as more than one.)
  s6: 'Says “the late Mr. {client} promised me {thing}”',
  s7: 'Has wanted {thing} since the day {client} brought {pthem} home',
  s8: 'Always said {thing} was wasted on its owner',
  s9: 'Hasn’t spoken to {client} since the row over the coal bill',
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
 * docs/59 note 7: the papers' line for a dealt night, a plain sentence with the grudge's direction in
 * it and the suspect named once (`{name}`); "him" is the dead man, whose papers they are.
 */
// (An entry a suspect, opening on their name: the pronoun in it is theirs, the dead man is said as
// "the dead man", and three entries never open alike, "The dead man… The dead man… The dead man…".)
const PAPERS_SAID: Record<string, string> = {
  m0: '{name}: the dead man had kept a file on {him}.',
  m1: '{name}: the dead man had been squeezing {him} for years.',
  m2: '{name}: the dead man knew where {he} was in 1921.',
  m3: '{name}: {he} owed the dead man four hundred dollars.',
  m4: '{name}: {he} owed the dead man the rent on a shop, and it was being called in.',
  m5: '{name}: the dead man had put {him} out of business.',
  m6: '{name}: the dead man had thrown {him} out of a lease.',
  m7: '{name}: the dead man had testified against {his} brother.',
  m8: '{name}: the dead man had jilted {his} sister a week before the wedding.',
};

/**
 * docs/66, P10: the papers' lines as the page says them (lean): the suspect is the one each line is
 * about, who they are beside the name the first time the night meets them (`{g}`), and the dead man,
 * whose papers they are, is "him" ({dhim}, {dhis}) where the line can't make him anybody else, or his
 * name ({victim}) where it could: "Renfro, a milliner, owed him four hundred dollars. Grasso had been
 * paying him for years.", never "the dead man" five times running.
 */
const PAPERS_LEAN: Record<string, string> = {
  m0: 'There was a file on {name}{g}, thick enough to matter.',
  m1: '{name}{g} had been paying {dhim} for years.',
  m2: 'There was a note of where {name}{g} had been in 1921.',
  m3: '{name}{g} owed {dhim} four hundred dollars.',
  m4: '{name}{g} owed {dhim} the rent on a shop, and it was being called in.',
  m5: '{name}{g} had lost {his} business to {dhim}.',
  m6: '{name}{g} had been put out of a lease by {dhim}.',
  m7: '{name}{g} had a brother {victim} had testified against.',
  m8: '{name}{g} had a sister {victim} jilted a week before the wedding.',
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

/**
 * docs/59 item 8: the reason as the verdict says it, of the one person the report named: their
 * pronoun where the form had "them" ("Rafferty threw her out of a lease"), and the dead man by name
 * where the form had "He" (the line follows "Who did it", so a bare "He" could be either of them).
 */
export function motiveSaid(c: BoardCase, p: PersonId): string {
  const form = motiveForm(c, p);
  const pr = pronOf(c, p);
  const v = victimOf(c);
  // docs/59 note 7: the grudge with its direction. "He owed him four hundred dollars" could be either
  // man's debt: where the suspect and the dead man are of one sex, the one who owed is said by name.
  // ("Abramowitz closed his business" is theirs: nobody closes their own business on somebody.)
  const same = isMurder(c) && pronOf(c, v.id).he === pr.he;
  let s = form
    .replace(/^Says “(.+?) promised me (.+)”$/, `Says $1 promised ${pr.him} $2`)
    .replace(/\bthemselves\b/g, pr.he === 'she' ? 'herself' : 'himself')
    .replace(/\bthey were\b/g, `${pr.he} was`)
    .replace(/\bthey’d\b/g, `${pr.he}’d`)
    .replace(/\bthey\b/g, pr.he)
    .replace(/\bthem\b/g, pr.him)
    .replace(/\btheir\b/g, pr.his)
    .replace(/\bThey owed\b/, `${same ? nameOf(c, p) : cap(pr.he)} owed`);
  if (isMurder(c)) s = s.replace(/^He\b/, v.short).replace(/^They\b/, same ? nameOf(c, p) : cap(pr.he));
  return s;
}

/**
 * The murder's papers, a line a suspect. docs/59 note 7: the grudge in one plain clause with its
 * direction said, never a document standing in for it ("Kavanagh: the lease on a shop, the rent
 * owing, and a carbon…" left the player to work out who owed whom): "Zeldin owed him four hundred
 * dollars." "Fairbanks: the dead man had a file on her." "Reinhardt: the dead man jilted
 * Reinhardt’s sister…" where "his sister" could be the dead man's own. The why form's words
 * (`motiveForm`), so the papers and the report say one grievance alike.
 */
export function papersLine(c: BoardCase, p: PersonId, planned = false, gloss?: string | null, prevSame = false): string {
  void planned;
  void PAPERS;
  void PAPERS_PLANNED;
  void fill;
  const who = personOf(c, p);
  if (!isMurder(c)) return `${nameOf(c, p)}: ${who?.motive ?? ''}.`;
  const nm = nameOf(c, p);
  const pr = pronOf(c, p);
  const v = victimOf(c);
  const same = pronOf(c, v.id).he === pr.he;
  const dead = v.female ? 'the dead woman' : 'the dead man';
  // (docs/66, P10: the page's own lines, lean; `gloss` is who they are, the first time the night meets them.)
  const leanSaid = gloss !== undefined && lean() && !who?.motiveForm && who?.motiveId ? PAPERS_LEAN[who.motiveId] : undefined;
  if (leanSaid) {
    const vp = pronOf(c, v.id);
    // (After a line about somebody of his sex, "him" could be them: the dead man by his role then.)
    const dhim = prevSame ? dead : vp.him;
    const dhis = prevSame ? `${dead}’s` : vp.his;
    const t = leanSaid.replace('{name}', nm).replace('{g}', gloss ? `, ${gloss},` : '').replace('{he}', pr.he).replace('{him}', pr.him).replace('{his}', pr.his).replace('{dhim}', dhim).replace('{dhis}', dhis).replace('{victim}', v.short);
    return t.replace(/,\s*([.,])/g, '$1').replace(/^./, (x) => x.toUpperCase());
  }
  // A dealt night's grudge, said as its own sentence.
  const said = !who?.motiveForm && who?.motiveId ? PAPERS_SAID[who.motiveId] : undefined;
  if (said) {
    const t = said.replace('{name}', nm).replace('{he}', pr.he).replace('{him}', pr.him).replace('{his}', pr.his);
    return v.female ? t.replace(/\bthe dead man\b/g, 'the dead woman') : t;
  }
  let f = motiveForm(c, p);
  // docs/60 (the skim readers): lean, where the dead and whoever had the grudge are of one sex, a pronoun
  // of the dead's is "the dead woman", and "their friend, Miss Gutman" is "a friend of hers": "Miss
  // Lowenthal: the dead woman’s old friend, and the dead woman knew things about her", not "her old
  // friend, and she knew things about her".
  if (lean() && same) {
    const vp = pronOf(c, v.id);
    f = f
      .replace(new RegExp(`\\b${vp.his}\\b(?= (?:old|rival|family|throat|own|business|books|letters)\\b)`, 'gi'), (m) => (m[0] === m[0]?.toUpperCase() ? `${dead.charAt(0).toUpperCase()}${dead.slice(1)}’s` : `${dead}’s`))
      .replace(new RegExp(`(?<=, and )${vp.he}\\b`, 'g'), dead)
      .replace(new RegExp(`\\b${vp.him}\\b(?! (?:old|rival|family|throat|own|business|books|letters)\\b)`, 'g'), dead)
      .replace(/\btheir (\w+), (?=[A-Z])/g, (_m, rel: string) => `a ${rel} of ${pr.he === 'she' ? 'hers' : 'his'}, `);
  }
  // "They owed him four hundred dollars": a sentence of their own, by name.
  const own = /^They\b/.test(f);
  f = f.replace(/^They\b\s*/, '');
  // The dead man as the one who did it, by his role: no pronoun on the line is his.
  f = f.replace(/^(?:He|She)\b/, dead);
  // (On a line that opens on their name, their pronoun is theirs: "Margolis: the dead man knew what he
  // got up to at the card room.")
  void same;
  f = f
    .replace(/\bthemselves\b/g, pr.he === 'she' ? 'herself' : 'himself')
    .replace(/\bthey were\b/g, `${pr.he} was`)
    .replace(/\bthey’d\b/g, `${pr.he}’d`)
    .replace(/\btheir\b/g, pr.his)
    .replace(/\bthem\b/g, pr.him)
    .replace(/\bthey\b/g, pr.he);
  return own ? `${nm} ${f}.` : `${nm}: ${f.charAt(0).toLowerCase() === f.charAt(0) ? f : f.charAt(0).toLowerCase() + f.slice(1)}.`;
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
