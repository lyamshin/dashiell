/**
 * docs/48 §2: motives come from ties, never dealt loose. A suspect's reason is
 * their tie to the dead man (or the owner), said four ways:
 *
 * - `text`, in the third person, for the office ("Krantz says, in passing: …");
 * - `form`, without the suspect's pronoun, for the report's why list (docs/47
 *   B7: a pronoun there gives the answer away);
 * - `papers`, what the dead man's papers held on them (`{he}`, `{his}`, `{him}`
 *   are the suspect's; "he" alone is the dead man);
 * - `says`, in their own mouth, for the page where they're asked about him: the
 *   tie's line as the bible wrote it.
 *
 * A tie's kind is what the other person is to this one ("my landlady"), except
 * `owes` (I owe them) and `owed` (they owe me). Where the bible has no tie
 * between them, the reason runs through somebody they're both tied to: a
 * friend, a sweetheart, a landlady of theirs whom the dead man was squeezing.
 * A night's reasons are never word for word alike.
 *
 * `{they}`, `{them}`, `{their}` are the suspect; `{victim}` and `{client}` the
 * other end; `{thing}` the lost thing; `{T}` the one in between. The forms are
 * written for a dead man; `ofVictim` says them of a dead woman.
 */

import type { BiblePerson, TieKind } from './types.js';

export interface MotiveForm {
  kind: string;
  text: string;
  form: string;
  papers?: string;
}

/** A murder's reasons, by what the dead man was to the suspect. Two where two suspects might share a kind. */
export const MURDER_TIE: Record<TieKind, MotiveForm[]> = {
  owes: [
    { kind: 'debt', text: '{they} owed {victim} money and couldn’t pay it', form: 'Owed him money and couldn’t pay it', papers: 'an IOU in {his} hand, and a note of what was still owing' },
    { kind: 'debt', text: '{they} was into {victim} for more than {they} could pay', form: 'Was into him for more than they could pay', papers: 'a tally of what {he} owed him, added up twice' },
  ],
  owed: [
    { kind: 'debt', text: '{victim} owed {them} money and wasn’t paying it', form: 'He owed them money and wasn’t paying it', papers: 'a letter from {him} asking for {his} money, never answered' },
    { kind: 'debt', text: '{victim} had borrowed from {them} and laughed about it', form: 'He borrowed from them and laughed about it', papers: 'a note of a loan from {him}, with nothing paid back on it' },
  ],
  landlady: [{ kind: 'debt', text: '{they} lodged with {victim}, and was behind on the rent', form: 'Lodged with him, and behind on the rent', papers: 'a rent book with {his} name in it and the arrears underlined' }],
  lodger: [{ kind: 'blackmail', text: '{victim} lodged under {their} roof, and knew {their} business', form: 'Had him under their roof, and he knew their business', papers: 'a page of notes on {his} household, in his hand' }],
  employer: [{ kind: 'ruin', text: '{they} worked for {victim}, and was about to be let go', form: 'Worked for him, and was about to be let go', papers: 'a letter letting {him} go, written and not yet sent' }],
  employee: [{ kind: 'blackmail', text: '{victim} worked for {them}, and knew what was in {their} books', form: 'He worked for them, and knew what was in their books', papers: 'a copy of {his} books, in his own hand' }],
  'old-flame': [{ kind: 'revenge', text: '{they} and {victim} were sweethearts once, and it ended badly', form: 'Sweethearts with him once, and it ended badly', papers: 'a bundle of {his} letters, tied with string and never given back' }],
  'in-law': [{ kind: 'revenge', text: '{they} married into {victim}’s family, and there was money in it', form: 'In his family by marriage, where there was money', papers: 'a copy of the family will, with {his} name underlined' }],
  rival: [{ kind: 'ruin', text: '{they} and {victim} were rivals, and only one of them was getting ahead', form: 'His rival, and losing', papers: 'a clipping about {him}, with a remark pencilled across it' }],
  feud: [{ kind: 'revenge', text: '{they} and {victim} had been at each other’s throats for years', form: 'At his throat for years', papers: 'a complaint he’d made against {him}, in triplicate' }],
  friend: [{ kind: 'blackmail', text: '{victim} knew things about {them} only an old friend would', form: 'His old friend, and he knew things about them', papers: 'a sealed envelope with {his} name on it' }],
};

/**
 * A murder's reason said of a dead woman: the forms' bare he, him and his are the dead man's, and
 * become hers. `{he}`, `{his}` and `{him}` are the suspect's, and stay.
 */
export function ofVictim(t: string, female: boolean): string {
  if (!female) return t;
  return t
    .replace(/(?<![{\w])He\b(?!\})/g, 'She')
    .replace(/(?<![{\w])His\b(?!\})/g, 'Her')
    .replace(/(?<![{\w])himself\b/g, 'herself')
    .replace(/(?<![{\w])him\b(?!\})/g, 'her')
    .replace(/(?<![{\w])his\b(?!\})/g, 'her')
    .replace(/(?<![{\w])he\b(?!\})/g, 'she')
    .replace(/\bdead man\b/g, 'dead woman');
}

/** A murder's reason through somebody in between, by what the dead man was to them. */
export function murderVia(k2: TieKind): MotiveForm {
  switch (k2) {
    case 'owes':
      return { kind: 'blackmail', text: '{victim} was squeezing {T}, {their} {rel}, for money {T} didn’t have', form: 'He was squeezing their {rel}, {T}, for money', papers: 'an IOU from {T}, with {his} name pencilled beside it' };
    case 'owed':
      return { kind: 'debt', text: '{victim} owed {T}, {their} {rel}, and wasn’t paying', form: 'He owed their {rel}, {T}, and wasn’t paying', papers: 'a debt to {T}, with {his} name beside it' };
    case 'feud':
    case 'rival':
      return { kind: 'revenge', text: '{victim} had been at war with {T}, {their} {rel}', form: 'He was at war with their {rel}, {T}', papers: 'a complaint against {T}, with {his} name pencilled at the bottom' };
    case 'old-flame':
      return { kind: 'revenge', text: '{victim} had once thrown over {T}, {their} {rel}', form: 'He once threw over their {rel}, {T}', papers: 'letters from {T}, and {his} name on the last of them' };
    default:
      return { kind: 'blackmail', text: '{victim} knew something about {T}, {their} {rel}, and said so', form: 'He knew something about their {rel}, {T}', papers: 'a page on {T}, with {his} name at the bottom' };
  }
}

/** A small case's reasons, by what the owner is to the suspect. The thief sells the thing: `money`. */
export const SMALL_TIE: Record<TieKind, MotiveForm[]> = {
  owes: [{ kind: 'money', text: '{they} has had {client}’s money since Easter, and asked {client} for more on Friday', form: 'Has had {client}’s money since Easter, and asked for more on Friday' }],
  owed: [{ kind: 'money', text: '{they} says {client}’s IOU to {them} is overdue, and that {thing} would square it', form: 'Says {client}’s IOU to them is overdue, and that {thing} would square it' }],
  landlady: [{ kind: 'money', text: '{they} is three weeks behind on {client}’s rent', form: 'Three weeks behind on {client}’s rent' }],
  lodger: [{ kind: 'money', text: '{they} says {client}’s rent is late, and that {thing} would cover it', form: 'Says {client}’s rent is late, and that {thing} would cover it' }],
  employer: [{ kind: 'money', text: '{they} works in {client}’s business, and hasn’t been paid since the first of the month', form: 'Works in {client}’s business, and hasn’t been paid since the first of the month' }],
  employee: [{ kind: 'spite', text: '{they} fights over {client}’s wages every Friday', form: 'Fights over {client}’s wages every Friday' }],
  'old-flame': [{ kind: 'claim', text: '{they} says {thing} was promised to {them}, back in {client}’s courting days', form: 'Says {thing} was promised to them, back in {client}’s courting days' }],
  'in-law': [{ kind: 'claim', text: '{they} says {thing} should have stayed in the family', form: 'Says {thing} should have stayed in the family' }],
  rival: [{ kind: 'spite', text: '{they} and {client} haven’t been civil since school', form: 'Hasn’t been civil to {client} since school' }],
  feud: [{ kind: 'spite', text: '{they} and {client} haven’t spoken since the row over the coal bill', form: 'Hasn’t spoken to {client} since the row over the coal bill' }],
  friend: [{ kind: 'want', text: '{they} has always wanted {thing}, and asked {client} the price', form: 'Has always wanted {thing}, and asked the price' }],
};

/** A small case's reason through somebody in between: a grudge on their behalf. Never the thief's. */
export function smallVia(): MotiveForm {
  return { kind: 'spite', text: '{they} hasn’t forgotten what {client}’s family did to {T}, {their} {rel}', form: 'Hasn’t forgotten what {client}’s family did to their {rel}, {T}' };
}

/** The warm ties a grudge runs through: what the one in between is to the suspect. */
const VIA: Partial<Record<TieKind, (female: boolean) => string>> = {
  friend: () => 'friend',
  'old-flame': () => 'old flame',
  'in-law': () => 'in-law',
  landlady: (f) => (f ? 'landlady' : 'landlord'),
  lodger: () => 'lodger',
  employer: () => 'boss',
  employee: () => 'hired help',
};

/** A suspect's reason against the wronged, and the words they'd say it in. */
export interface Motive extends MotiveForm {
  /** `tie:owes`, or `via:<id>` for one through somebody in between. */
  id: string;
  /** In their own mouth: the bible's tie line. */
  says: string;
  /** The one in between, by bible id. */
  via?: string;
  /** The same reason without their name, for a night where they're a suspect too: "her friend". */
  anon?: MotiveForm & { says: string };
}

/**
 * The reasons a suspect could have, best first:
 *
 * - their own tie to the wronged;
 * - one through somebody they're warm with who has a tie to the wronged;
 * - in a small case, a debt of their own to anybody, which the thing would pay (the dealt nights'
 *   "owes Lou forty dollars, and Lou takes things in kind");
 * - in a murder, last, the dead man's leverage: he knew one of their secrets, from their own list,
 *   said by where it happens and never what it is. Not for somebody whose secret is tonight's lie
 *   (`noSecret`), and not at a place `hide` names.
 *
 * `taken` are the forms already used tonight; a night's reasons are never word for word alike.
 */
export function motivesFor(
  people: BiblePerson[],
  s: BiblePerson,
  wronged: BiblePerson,
  murder: boolean,
  taken: Set<string>,
  short: (p: BiblePerson) => string,
  o: { secrets?: { placeName: (id: string) => string | undefined; noSecret?: boolean } } = {},
): Motive[] {
  const out: Motive[] = [];
  // A dead woman's reasons say "her" where the forms say "him"; a tie line of the bible's is hers already.
  const her = murder && wronged.gender === 'f';
  const g = (t: string) => ofVictim(t, her);
  const gendered = (m: Motive): Motive =>
    her
      ? {
          ...m,
          text: g(m.text),
          form: g(m.form),
          ...(m.papers ? { papers: g(m.papers) } : {}),
          says: m.id.startsWith('tie:') ? m.says : g(m.says),
          ...(m.anon ? { anon: { ...m.anon, text: g(m.anon.text), form: g(m.anon.form), ...(m.anon.papers ? { papers: g(m.anon.papers) } : {}), says: g(m.anon.says) } } : {}),
        }
      : m;
  const push = (m0: Motive) => {
    const m = gendered(m0);
    if (!taken.has(m.form) && !out.some((x) => x.form === m.form)) out.push(m);
  };
  const direct = s.ties.find((t) => t.to === wronged.id);
  if (direct) for (const m of (murder ? MURDER_TIE : SMALL_TIE)[direct.kind]) push({ ...m, id: `tie:${direct.kind}`, says: direct.line });
  const byId = new Map(people.map((p) => [p.id, p]));
  for (const t1 of s.ties) {
    const rel = VIA[t1.kind];
    const T = byId.get(t1.to);
    if (!rel || !T || T.id === wronged.id) continue;
    const t2 = T.ties.find((x) => x.to === wronged.id);
    // A grudge on somebody's behalf needs a grudge to carry: not a friend's, not an in-law's.
    if (!t2 || t2.kind === 'friend' || t2.kind === 'in-law' || (!murder && !['feud', 'rival', 'owes', 'owed'].includes(t2.kind))) continue;
    const base = murder ? murderVia(t2.kind) : smallVia();
    const vars = (x: string) => x.replace(/\{T\}/g, short(T)).replace(/\{rel\}/g, rel(T.gender === 'f'));
    // Without the name: "{T}, {their} {rel}" is "{their} {rel}", and "their {rel}, {T}" is "their {rel}";
    // once said, they're "he" or "she" ("for money she didn’t have").
    const anon = (x: string) => {
      let y = x
        .replace(/, for money \{T\} didn’t have/, ' for money')
        .replace(/their \{rel\}, \{T\}, for money/, 'their {rel} for money')
        .replace(/\{T\}, \{their\} \{rel\}/g, '{their} {rel}')
        .replace(/their \{rel\}, \{T\}/g, 'their {rel}');
      if (!/\{rel\}/.test(y)) y = y.replace('{T}', '{their} {rel}');
      return vars(y.replace(/\{T\}/g, T.gender === 'f' ? 'she' : 'he'));
    };
    // Said of them by the office, a dead man's grudge is against "Doyle’s old flame" ("his" would be
    // the dead man's); a grudge of their own is against "her friend".
    const own = (x: string) => (x.startsWith('{they}') ? x : x.replace(/\{their\} /g, '{own} '));
    push({
      kind: base.kind,
      text: vars(base.text),
      form: vars(base.form),
      ...(base.papers ? { papers: vars(base.papers) } : {}),
      id: `via:${T.id}`,
      says: firstPerson(vars(base.text)),
      via: T.id,
      anon: { kind: base.kind, text: own(anon(base.text)), form: anon(base.form), ...(base.papers ? { papers: vars(base.papers.replace(/\{T\}/g, '{his} {rel}')) } : {}), says: firstPerson(anon(base.text)) },
    });
  }
  if (!murder) {
    for (const t of s.ties) {
      const T = byId.get(t.to);
      if (t.kind !== 'owes' || !T || T.id === wronged.id) continue;
      const name = short(T);
      const pr = T.gender === 'f' ? 'she' : 'he';
      let h = 0;
      for (const ch of `${s.id}${T.id}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const tail = [`${pr} has started asking for it`, `${pr} wants it by Saturday`, `${pr} isn’t a patient ${T.gender === 'f' ? 'woman' : 'man'}`][h % 3] as string;
      push({ kind: 'money', text: `{they} owes ${name} money, and ${tail}`, form: `Owes ${name} money, and ${tail}`, id: `debt:${T.id}`, says: firstPerson(`{they} owes ${name} money, and ${tail}`), via: T.id });
    }
  }
  if (murder && o.secrets && !o.secrets.noSecret) {
    for (const sec of s.secrets) {
      const where = o.secrets.placeName(sec.place);
      if (!where) continue;
      push({
        kind: 'blackmail',
        text: `{victim} knew what {they} got up to at ${where}, and let {them} know he knew`,
        form: `He knew what they got up to at ${where}`,
        papers: `a note about {him} and ${where}, in the dead man’s hand, with a date`,
        id: `secret:${sec.place}`,
        says: firstPerson(`{victim} knew what {they} got up to at ${where}, and let {them} know he knew`),
      });
    }
  }
  return out;
}

/**
 * A reason said by the suspect: "Doyle was squeezing Teitel, my friend, for money Teitel didn’t
 * have." Their own pronouns become I, me and my, with the verb that goes with I.
 */
export function firstPerson(t: string): string {
  const s = t
    .replace(/\{they\} owes\b/g, 'I owe')
    .replace(/\{they\} has\b/g, 'I have')
    .replace(/\{they\} hasn’t\b/g, 'I haven’t')
    .replace(/\{they\} is\b/g, 'I’m')
    .replace(/\{they\} was\b/g, 'I was')
    .replace(/\{they\} says\b/g, 'I say')
    .replace(/\{they\} works\b/g, 'I work')
    .replace(/\{they\} fights\b/g, 'I fight')
    .replace(/\{they\}/g, 'I')
    .replace(/\{them\}/g, 'me')
    .replace(/\{their\}/g, 'my');
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

/** What the client was to the dead man, by the client's tie to him (what he was to the client). */
export const RELATION_BY_TIE: Partial<Record<TieKind, { female: string; male: string }>> = {
  'in-law': { female: 'sister-in-law', male: 'brother-in-law' },
  friend: { female: 'friend', male: 'friend' },
  'old-flame': { female: 'old sweetheart', male: 'old sweetheart' },
  landlady: { female: 'lodger', male: 'lodger' },
  lodger: { female: 'landlady', male: 'landlord' },
  employer: { female: 'clerk', male: 'clerk' },
  employee: { female: 'employer', male: 'employer' },
  owes: { female: 'business partner', male: 'business partner' },
  owed: { female: 'business partner', male: 'business partner' },
};

export const NEIGHBOR = { female: 'neighbor', male: 'neighbor' };
