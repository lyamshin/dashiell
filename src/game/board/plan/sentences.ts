/**
 * docs/49: sentences, as the microplanner and its measures count them.
 *
 * A sentence ends at a full stop, a question or an exclamation mark (a closing
 * quotation mark may follow), before the next one starts with a capital or an
 * opening quotation mark. "Mrs.", "Mr." and "Dr." don't end anything. Speech is
 * any sentence with a quotation mark in it, or inside one: the planner's
 * rhythm is the narration's, and a person talking breaks the run.
 */

/** Split prose into sentences. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<!\b(?:Mrs?|Dr|St)\.)(?<=[.!?…][”’]?)\s+(?=[“"A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Words, the way the measures count them: tokens with a letter or a digit. */
export function wordsIn(text: string): number {
  return text.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
}

export type Band = 'short' | 'medium' | 'long';

/** docs/49 §2: short ≤ 8 words, medium 9–20, long 21+. */
export function bandOf(text: string): Band {
  const n = wordsIn(text);
  return n <= 8 ? 'short' : n <= 20 ? 'medium' : 'long';
}

export interface Sentence {
  text: string;
  /** Speech: a quotation mark in it, or inside a quotation. */
  speech: boolean;
}

/**
 * The sentences of a run of prose, each marked speech or narration. A sentence
 * that opens inside a quotation (the quotation runs on from the last) is speech.
 */
export function markedSentences(text: string, startsInQuote = false): { sentences: Sentence[]; endsInQuote: boolean } {
  let inQ = startsInQuote;
  const out: Sentence[] = [];
  for (const s of sentencesOf(text)) {
    const was = inQ;
    let touched = false;
    for (const ch of s) {
      if (ch === '“') {
        inQ = true;
        touched = true;
      } else if (ch === '”') {
        inQ = false;
        touched = true;
      }
    }
    out.push({ text: s, speech: was || touched });
  }
  return { sentences: out, endsInQuote: inQ };
}

/** The first two words of a sentence, lower case, for the list-smell measure. */
export function openingOf(text: string): string {
  return text
    .replace(/^[“"(]+/, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
    .toLowerCase()
    .replace(/[,.;:!?”’]+$/, '');
}

/**
 * docs/59 item 8: the past participles a contraction may stand before ("he’d spent" is "Rafferty had
 * spent", never "would spent"): the irregular ones, and any word in -ed but "need" and its kin.
 */
export const PAST_PARTICIPLE = new RegExp(
  `^(?:${[
    'been', 'had', 'let', 'got', 'gotten', 'gone', 'done', 'seen', 'known', 'come', 'made', 'put', 'left', 'kept', 'told', 'said', 'found', 'heard', 'taken', 'given',
    'spent', 'sent', 'lost', 'met', 'brought', 'bought', 'thought', 'sat', 'stood', 'slept', 'eaten', 'drunk', 'run', 'begun', 'written', 'read', 'felt', 'held', 'built',
    'paid', 'won', 'caught', 'taught', 'sold', 'meant', 'dealt', 'fought', 'hung', 'shut', 'cut', 'hit', 'set', 'become', 'driven', 'ridden', 'fallen', 'forgotten',
    'hidden', 'broken', 'chosen', 'spoken', 'stolen', 'woken', 'worn', 'torn', 'sworn', 'thrown', 'grown', 'shown', 'flown', 'drawn', 'blown', 'lent', 'lit', 'led', 'fed',
    'swept', 'wept', 'crept', 'learnt', 'burnt', 'bent', 'understood', 'forgiven', 'beaten', 'bitten', 'risen',
  ].join('|')}|[a-z]+[^e\\s]ed|[a-z]+ied)$`,
);
