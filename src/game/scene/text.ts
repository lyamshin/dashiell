/**
 * M8 §4 and §7 — the checks and repairs a night page's sentences go through.
 *
 * Everything here works on text and is shared by the realizer, which uses it
 * to write a page that passes, and by the beat coverage check (§10), which
 * uses the same tests to prove it did. One definition of an epithet, of a
 * subjectless fragment, of hour texture that disagrees with the clock and of a
 * name without its clause, so the writer and the checker cannot drift apart.
 */

import type { Id, Mention, Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import type { Page } from '../types.js';
import { RELATION_PLAIN } from './lines.js';

/* ------------------------------------------------------------------ *
 * Sentences.
 * ------------------------------------------------------------------ */

const ABBREVIATION = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|No)\.$/;

/** A run of prose as its sentences, closing quotation marks kept on. */
export function sentencesOf(text: string): string[] {
  const parts = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…][”’"']?)\s+(?=["“'A-Z])/);
  const out: string[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (last !== undefined && ABBREVIATION.test(last)) out[out.length - 1] = `${last} ${part}`;
    else if (part.length > 0) out.push(part);
  }
  return out;
}

/**
 * Sentences, with somebody's speech kept whole: a quotation of three
 * sentences is one unit, because a name said inside it is introduced, if at
 * all, where the speech stops — not in the middle of what they are saying.
 */
export function unitsOf(text: string): string[] {
  const out: string[] = [];
  let open = false;
  for (const s of sentencesOf(text)) {
    if (open && out.length > 0) out[out.length - 1] = `${out[out.length - 1] as string} ${s}`;
    else out.push(s);
    const opens = (s.match(/“/g)?.length ?? 0) - (s.match(/”/g)?.length ?? 0);
    if (opens > 0) open = true;
    else if (opens < 0) open = false;
  }
  return out;
}

export function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/** The figures `scripts/style-metrics.py` counts. The golden allows one a page. */
export const FIGURE = /\b(like a|like an|like the|as if|as though|the way a|the way the|as \w+ as)\b/gi;

export function figuresIn(text: string): number {
  return (text.match(FIGURE) ?? []).length;
}

/* ------------------------------------------------------------------ *
 * §7 — clue sentences are never pasted raw.
 * ------------------------------------------------------------------ */

/**
 * The generator writes a clue as a record in the present tense: "The rug at
 * the suite is rucked up under Sweeney." The page is a story told afterwards,
 * so the find goes down in the past: "The rug was rucked up under Sweeney."
 * Only the verbs the generator's templates actually use are turned, and only
 * outside quotation marks: what somebody said stays as they said it.
 */
const PAST: [RegExp, string][] = [
  [/\bis not\b/g, 'was not'],
  [/\bisn[’']t\b/g, 'wasn’t'],
  [/\bis\b/g, 'was'],
  [/\bare\b/g, 'were'],
  [/\bhas been\b/g, 'had been'],
  [/\bhave been\b/g, 'had been'],
  [/\bhas not\b/g, 'had not'],
  [/\bhas\b/g, 'had'],
  [/\b(I|they|we|you|They|We|You) have\b/g, '$1 had'],
  [/\bdoes not\b/g, 'did not'],
  [/\bdoesn[’']t\b/g, 'didn’t'],
  [/\bdoes\b/g, 'did'],
  [/\bcan be\b/g, 'could be'],
  [/\bcannot\b/g, 'could not'],
  [/\bcan\b/g, 'could'],
  [/\bwill not\b/g, 'would not'],
  [/\bwill\b/g, 'would'],
  [/\bsays\b/g, 'said'],
  [/\bputs\b/g, 'put'],
  [/\bconfirms\b/g, 'confirmed'],
  [/\bcarries\b/g, 'carried'],
  [/\bturns up\b/g, 'turned up'],
  [/\bsettle it\b/g, 'settled it'],
  [/\bsettles it\b/g, 'settled it'],
  [/\bcomes\b/g, 'came'],
  [/\bgoes\b/g, 'went'],
  [/\bgets\b/g, 'got'],
  [/\breads\b/g, 'read'],
  [/\bwants\b/g, 'wanted'],
  [/\bknows\b/g, 'knew'],
  [/\bkeeps\b/g, 'kept'],
  [/\banswers\b/g, 'answered'],
  [/\bappears\b/g, 'appeared'],
  [/\bmeets\b/g, 'met'],
  [/\bsits\b/g, 'sat'],
  [/\bstands\b/g, 'stood'],
  [/\bholds\b/g, 'held'],
  [/\bruns\b/g, 'ran'],
  [/\bstays\b/g, 'stayed'],
  [/\bshows\b/g, 'showed'],
  [/\bsmells\b/g, 'smelled'],
  [/\bleaves\b/g, 'left'],
  [/\bI go\b/g, 'I went'],
  [/\bI get\b/g, 'I got'],
];

export function pastTense(text: string): string {
  // Split on quotation marks and turn only the runs outside them.
  const parts = text.split(/(“[^”]*”|"[^"]*")/);
  return parts
    .map((part) => {
      if (/^[“"]/.test(part)) return part;
      let out = part;
      for (const [re, to] of PAST) out = out.replace(re, to);
      return out;
    })
    .join('');
}

/**
 * "The rug at the suite" when the reader is standing in the suite is the
 * record's address, not a thing anybody says. Take it off where it follows the
 * sentence's own subject.
 */
export function stripHere(text: string, here: string): string {
  if (here.length === 0) return text;
  const at = here.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\b((?:The|A|An) [a-z]+(?: [a-z]+)?) at ${at}\\b`, 'g'), '$1');
}

/* ------------------------------------------------------------------ *
 * §4 — no subjectless fragments.
 * ------------------------------------------------------------------ */

const IRREGULAR_PAST = new Set([
  'Took', 'Kept', 'Held', 'Sat', 'Stood', 'Got', 'Gave', 'Made', 'Ran', 'Went',
  'Came', 'Saw', 'Shook', 'Drew', 'Threw', 'Wrote', 'Found', 'Left', 'Brought', 'Bought', 'Caught',
  'Thought', 'Tore', 'Wore', 'Broke', 'Spoke', 'Rose', 'Froze', 'Hung', 'Swung', 'Struck', 'Stuck',
  'Dug', 'Spun', 'Bit', 'Hid', 'Slid', 'Lit', 'Fed', 'Led', 'Bent', 'Sent', 'Spent', 'Lent', 'Slept',
  'Swept', 'Wept', 'Crept', 'Felt', 'Dealt', 'Knelt', 'Heard', 'Told', 'Sold', 'Paid', 'Laid',
  'Began', 'Ate', 'Drank', 'Sank', 'Rang', 'Sang', 'Blew', 'Grew', 'Knew', 'Flew', 'Chose', 'Woke',
]);

/** Words ending in -ed that open a sentence as something other than a verb. */
const ED_NOT_VERB = new Set([
  'Indeed', 'Hundred', 'Hundreds', 'Naked', 'Wicked', 'Sacred', 'Wretched', 'Beloved', 'Crooked',
  'Rugged', 'Ragged', 'Learned', 'Aged', 'Blessed', 'Bed', 'Red', 'Ned', 'Fred', 'Ted', 'Seed', 'Speed',
  'Need', 'Reed', 'Shed', 'Sled', 'Wed', 'Bled', 'Fled', 'Shred', 'Tweed', 'Creed', 'Greed', 'Weed',
]);

/**
 * A sentence that opens on a past-tense verb and has nobody doing it —
 * "Smoothed her skirt and glanced once at the door." The business deck writes
 * gestures as clauses to hang off a name, and a page that sets one down on its
 * own leaves the reader to guess whose skirt.
 */
export function isSubjectless(sentence: string): boolean {
  // Speech is not narration: "Took you long enough" is somebody talking.
  if (/^[“"‘']/.test(sentence.trim())) return false;
  const bare = sentence.replace(/^[(]+/, '').trim();
  // "Which put Kreuzer at the third floor too." is a relative clause with its
  // sentence missing; a question is not.
  if (/^Which\b/.test(bare) && !/\?$/.test(bare)) return true;
  const m = /^([A-Z][a-z]+)\s+([a-z][a-z’']*)/.exec(bare);
  if (!m) return false;
  const [, head] = m as unknown as [string, string, string];
  if (IRREGULAR_PAST.has(head)) return true;
  return /ed$/.test(head) && head.length > 4 && !ED_NOT_VERB.has(head);
}

/** Give a subjectless gesture its subject: "Smoothed her skirt" → "Kreuzer smoothed her skirt". */
export function subjectify(text: string, surname: string): string {
  return sentencesOf(text)
    .map((s) => {
      if (!isSubjectless(s)) return s;
      const lead = /^[“"‘'(]+/.exec(s)?.[0] ?? '';
      const rest = s.slice(lead.length);
      return `${lead}${surname} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
    })
    .join(' ');
}

/* ------------------------------------------------------------------ *
 * §5 — a thought claims no more than it is licensed to.
 * ------------------------------------------------------------------ */

/** What a thought resting on one person's word, or an anchor, has to carry. */
export const HEDGE = /\b(if|might|would|could|may|maybe|perhaps|possible|guess)\b/i;

export function hedged(text: string): boolean {
  return HEDGE.test(text);
}

const FILLER = new Set([
  'a', 'an', 'the', 'of', 'was', 'were', 'is', 'are', 'had', 'has', 'have', 'been', 'be', 'to', 'at', 'in', 'on',
  'it', 'and', 'that', 'so', 'o’clock', "o'clock", 'half', 'past', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
]);

function contentRun(text: string, names: readonly string[]): string[] {
  let t = text.toLowerCase();
  for (const n of names) t = t.split(n.toLowerCase()).join(' ');
  return (t.match(/[a-z’']+/g) ?? []).filter((w) => !FILLER.has(w));
}

/**
 * Does a thought say again what the find on the same page said? Three content
 * words in a row in common, once names, places, hours and the verbs of being
 * are taken out: "Nothing had been carried out" after "Nothing was carried
 * out of the room" is the find twice, not a conclusion.
 */
export function restates(thought: string, finds: readonly string[], names: readonly string[]): boolean {
  const a = contentRun(thought, names);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < a.length; i++) grams.add(`${a[i]} ${a[i + 1]} ${a[i + 2]}`);
  if (grams.size === 0) return false;
  for (const f of finds) {
    const b = contentRun(f, names);
    for (let i = 0; i + 2 < b.length; i++) if (grams.has(`${b[i]} ${b[i + 1]} ${b[i + 2]}`)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * §4 — no epithets.
 * ------------------------------------------------------------------ */

/**
 * "Kreuzer, the woman with the unlooked-at coin flip." A recall phrase is
 * something the person does, never a name for them.
 */
export const EPITHET = /\b[A-Z][a-z’']+, the (?:woman|man|girl|boy|fellow|lady) with\b/;

/** The epithet constructions on a page: the general form, and any recall phrase set as an appositive. */
export function epithetsIn(text: string, recalls: { surname: string; recall: string }[]): string[] {
  const out: string[] = [];
  const m = EPITHET.exec(text);
  if (m) out.push(m[0]);
  for (const { surname, recall } of recalls) {
    const phrase = recall.trim().replace(/[.!?]+$/, '');
    if (phrase.length === 0) continue;
    if (text.includes(`${surname}, ${phrase}`)) out.push(`${surname}, ${phrase}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * §7 — hour texture agrees with the clock.
 * ------------------------------------------------------------------ */

const HOUR_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

/**
 * The span of the night a piece of texture names, in minutes past midnight,
 * or null when it names none. "Four in the morning" is four to five; dawn and
 * first light are half past five onward; "it was midnight" is the first hour.
 * An hour of the *evening* — "at ten o'clock" — is a claim about the case and
 * not texture, and the correspondence checker reads those.
 */
export function impliedSpan(text: string): { from: number; to: number } | null {
  const lower = text.toLowerCase();
  const morning = /\b(one|two|three|four|five|six|seven|eight)(?: o[’']clock)? in the morning\b/.exec(lower);
  if (morning) {
    const h = HOUR_WORDS[morning[1] as string] as number;
    return { from: h * 60, to: h * 60 + 60 };
  }
  const am = /\b(one|two|three|four|five|six|seven|eight|[1-8])(?::\d\d)? ?a\.?m\.?(?![a-z])/.exec(lower);
  if (am) {
    const w = am[1] as string;
    const h = HOUR_WORDS[w] ?? Number(w);
    return { from: h * 60, to: h * 60 + 60 };
  }
  if (/\b(dawn|daybreak|sunrise|first light|sun (?:was|came|come|coming) up|the sky (?:was )?(?:going|getting) (?:grey|gray|light))\b/.test(lower)) {
    return { from: 330, to: 480 };
  }
  if (/\b(it was|it's|nearly|almost|just) midnight\b/.test(lower)) return { from: 0, to: 60 };
  return null;
}

/** Does texture that names an hour agree with a clock this many minutes past midnight? */
export function hourAgrees(text: string, minutes: number): boolean {
  const span = impliedSpan(text);
  if (span === null) return true;
  return minutes >= span.from - 30 && minutes < span.to + 30;
}

/** The activity deck's bands (§9), by minutes past midnight. */
export type Band = 'after-midnight' | 'small-hours' | 'dawn';

export function bandOf(minutes: number): Band {
  if (minutes < 180) return 'after-midnight';
  if (minutes < 360) return 'small-hours';
  return 'dawn';
}

/* ------------------------------------------------------------------ *
 * §7 — no unexplained names.
 * ------------------------------------------------------------------ */

/** The words of a page a reader reads as prose, in order. */
export function proseTexts(page: Page): string[] {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose' || b.kind === 'note') out.push(b.text);
    if (b.kind === 'presence' && b.text) out.push(b.text);
  }
  return out;
}

/** Who a run of text names, by id: people in the case and the backstory's mentions. */
export function namedIn(view: CaseView, texts: readonly string[]): Id[] {
  const all = texts.join(' ');
  const out: Id[] = [];
  for (const p of [...view.kase.people, ...view.kase.mentions]) {
    if (new RegExp(`\\b${p.surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(all)) out.push(p.id);
  }
  return out;
}

/** Somebody who can be named on a page: a person in the case or a mention. */
export interface Nameable {
  id: Id;
  surname: string;
  /** The clause that says who they are. Empty for somebody exempt. */
  clause: string;
  /** Other words that count as the clause when they are in the sentence. */
  also: string[];
  /**
   * The clause as a sentence of its own, in plain words — "Hochstetter rented
   * from Grasso." — for a sentence that already sets somebody off in commas.
   */
  plain: string;
}

/**
 * What the detective can see of somebody on first sight — "a woman in her
 * forties" — counts as saying who they are (golden page 4: "Callahan was
 * behind the bar, a woman in her forties").
 */
export const SIGHT = /\ba (?:wo)?man in (?:his|her) (?:teens|twenties|thirties|forties|fifties|sixties|seventies)\b/i;

function bareRole(role: string): string {
  return role.replace(/^(an?|the)\s+/i, '').replace(/\.$/, '').trim();
}

/**
 * The clause that says who somebody is (§7, rule 9 of the night golden).
 *
 * The victim and the client are exempt — the office page has already said
 * who both of them are, at length — and so is the detective. A suspect is
 * their relation to the victim, which §6 says is the minimum reason they are
 * in the case at all; a fixture is their job; a mention is the role the
 * backstory gave them.
 */
export function nameables(view: CaseView): Nameable[] {
  const out: Nameable[] = [];
  for (const p of view.kase.people) {
    const exempt = p.id === view.victim.id || p.id === view.client.id;
    const plain = exempt ? '' : plainOf(view, p);
    out.push({
      id: p.id,
      surname: p.surname,
      clause: exempt ? '' : clauseOf(view, p),
      also: exempt ? [] : [...alsoOf(p), ...(plain ? [plain.replace(/\.$/, '').slice(p.surname.length + 1)] : [])],
      plain,
    });
  }
  for (const m of view.kase.mentions) {
    const clause = mentionClause(m);
    out.push({ id: m.id, surname: m.surname, clause, also: [bareRole(m.role)], plain: `${m.surname} was ${clause}.` });
  }
  return out;
}

/** "Hochstetter rented from Grasso." — the relation in plain words, as a sentence. */
function plainOf(view: CaseView, p: Person): string {
  const verb = p.relationshipId ? RELATION_PLAIN[p.relationshipId] : undefined;
  if (p.kind === 'suspect' && verb) return `${p.surname} ${verb.split('{V}').join(view.victim.surname)}.`;
  const clause = clauseOf(view, p);
  return clause.length > 0 ? `${p.surname} was ${clause}.` : '';
}

export function clauseOf(view: CaseView, p: Person): string {
  if (p.kind === 'suspect' && p.relationshipToVictim) return p.relationshipToVictim;
  if (p.kind === 'fixture') {
    const post = view.placeById.get(p.foundAt ?? '')?.shortName;
    return post ? `${p.role} at ${post}` : p.role;
  }
  return p.role;
}

function alsoOf(p: Person): string[] {
  const out = [bareRole(p.role)];
  if (p.relationshipToVictim) {
    out.push(p.relationshipToVictim);
    // "Sweeney’s secretary" is also said "Sweeney had a secretary".
    const noun = /^[^’' ]+[’']s (.+)$/.exec(p.relationshipToVictim)?.[1];
    if (noun) out.push(noun);
  }
  if (p.fixtureRole) out.push(p.fixtureRole.replace('-', ' '));
  return out.filter((s) => s.length > 2);
}

function mentionClause(m: Mention): string {
  return m.role;
}

function nameRe(surname: string): RegExp {
  const s = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${s}\\b`);
}

/** Does this sentence, or the one either side of it, carry the clause? */
function carries(n: Nameable, sentences: string[], i: number): boolean {
  // M10: a name said inside somebody's speech is explained after the speech
  // closes, however long the telling ran — so the sentence after the closing
  // quotation mark counts as next to it.
  let balance = 0;
  let after = '';
  for (let k = 0; k < sentences.length; k++) {
    const s = sentences[k] as string;
    balance += (s.match(/“/g)?.length ?? 0) - (s.match(/”/g)?.length ?? 0);
    if (k >= i && balance <= 0) {
      // The clauses the name pass puts after a speech come one a person, in order.
      after = sentences.slice(k + 1, k + 4).join(' ');
      break;
    }
  }
  const here = `${sentences[i - 1] ?? ''} ${sentences[i] ?? ''} ${sentences[i + 1] ?? ''} ${after}`.toLowerCase();
  if (n.clause.length > 0 && here.includes(n.clause.toLowerCase())) return true;
  // First sight: what the detective can see of them, in their own sentence.
  if (SIGHT.test(sentences[i] ?? '')) return true;
  return n.also.some((w) => here.includes(w.toLowerCase()));
}

/**
 * How many people a sentence sets off in commas with who they are:
 * "Hochstetter, Grasso's tenant," and "Dandridge, Grasso's business partner"
 * are two, and the designer's rule is one at most.
 */
export function appositivesIn(sentence: string, people: readonly Nameable[]): number {
  const bare = sentence.replace(/“[^”]*”/g, '“…”');
  let n = 0;
  for (const p of people) {
    if (p.clause.length === 0) continue;
    if (bare.includes(`${p.surname}, ${p.clause}`)) n++;
  }
  const sight = bare.match(new RegExp(`, ${SIGHT.source}`, 'gi'));
  return n + (sight?.length ?? 0);
}

/**
 * The names on a page whose first appearance has no clause with it. The page
 * is read as one text in order; a clause in the sentence that names them, or
 * the sentence either side of it, counts — "Sweeney had a secretary.
 * Hanrahan." is the golden's own introduction.
 */
export function namesWithoutClause(
  texts: string[],
  people: Nameable[],
  /** People an earlier page already said who they were (the designer's rule: once). */
  namedBefore: ReadonlySet<Id> = new Set(),
): string[] {
  const sentences = texts.flatMap((t) => unitsOf(t));
  const out: string[] = [];
  for (const n of people) {
    if (n.clause.length === 0 || namedBefore.has(n.id)) continue;
    const re = nameRe(n.surname);
    const i = sentences.findIndex((s) => re.test(s));
    if (i < 0) continue;
    if (!carries(n, sentences, i)) out.push(n.surname);
  }
  return out;
}

/**
 * Put a clause on a name's first appearance in `text`: an appositive where the
 * name stands as a noun, and a sentence after it where it is a possessive.
 * `named` carries who the page has already introduced, and is updated.
 */
export function introduceNames(
  text: string,
  people: Nameable[],
  named: Set<Id>,
  /** Say who they are in a plain sentence of its own, never in commas (a bridge). */
  opts: { plainFirst?: boolean } = {},
): string {
  let out = text;
  for (const n of people) {
    if (n.clause.length === 0 || named.has(n.id)) continue;
    const re = nameRe(n.surname);
    const m = re.exec(out);
    if (!m) continue;
    named.add(n.id);
    const sentences = unitsOf(out);
    const i = sentences.findIndex((s) => re.test(s));
    if (i >= 0 && carries(n, sentences, i)) continue;
    const at = m.index + n.surname.length;
    const next = out.slice(at);
    const s = sentences[i] as string;
    // Inside somebody's speech a clause is the speaker's business, not ours.
    const inQuote = (out.slice(0, m.index).match(/“/g)?.length ?? 0) > (out.slice(0, m.index).match(/”/g)?.length ?? 0);
    const closes = /^[.!?]/.test(next);
    const comma = /^,/.test(next);
    // An appositive only where one reads cleanly — the name opening its
    // sentence ("Kreuzer, the client, looked up") or closing a clause
    // ("…it would be Hochstetter, Grasso's tenant.") — and only one a
    // sentence (the designer's rule). Anywhere else, and in a bridge, who
    // they are is a plain sentence of its own after the one that names them:
    // "…named on the face of it" never becomes "Callahan, named in the will,
    // named on the face of it".
    const opens = s.replace(/^[“"(]+/, '').startsWith(`${n.surname} `) && !/^[’']s\b/.test(next);
    const clean = !inQuote && opts.plainFirst !== true && appositivesIn(s, people) === 0 && (opens || closes || comma);
    if (!clean) {
      const plain = n.plain.length > 0 ? n.plain : `${n.surname} was ${n.clause}.`;
      // After the speech closes, when the name was said inside it.
      const close = inQuote ? out.indexOf('”', m.index) : -1;
      const sentenceAt = out.indexOf(s);
      const pos = close >= 0 ? close + 1 : sentenceAt >= 0 ? sentenceAt + s.length : out.length;
      out = `${out.slice(0, pos)} ${plain}${out.slice(pos)}`;
      continue;
    }
    const insert = closes || comma ? `, ${n.clause}` : `, ${n.clause},`;
    out = `${out.slice(0, at)}${insert}${next}`;
  }
  return out;
}
