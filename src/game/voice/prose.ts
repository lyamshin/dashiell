/**
 * Joining prose that came out of three different decks.
 *
 * Every card in every deck is written as a finished sentence, or as a fragment
 * that expects something in front of it. The page grammar puts them next to
 * each other, and the seams are where the voice breaks: a period followed by a
 * period, a full stop swallowed by a comma, a fragment started with a capital
 * in the middle of a line.
 *
 * Nothing in here decides *what* goes on the page. It decides only how two
 * pieces of finished text are set down next to one another.
 */

const TERMINALS = '.!?…';

/** Does this text already end in something that closes a sentence? */
export function endsSentence(text: string): boolean {
  return /[.!?…][)"”’']*\s*$/.test(text.trimEnd());
}

/**
 * Give a piece of text a full stop, unless it already closes itself. Quotation
 * marks and brackets are allowed to sit outside the stop: `"Alive, I'd say."`
 * is finished, and so is `(he said so)`.
 */
export function endSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  if (endsSentence(trimmed)) return trimmed;
  // A closing quote or bracket takes the stop inside it, the way a typesetter
  // would: `"Alive, I'd say"` becomes `"Alive, I'd say."`
  const tail = /(["”’')\]]+)$/.exec(trimmed);
  if (tail) {
    const head = trimmed.slice(0, trimmed.length - tail[1].length);
    if (head.length === 0) return trimmed;
    if (endsSentence(head)) return trimmed;
    return `${head}.${tail[1]}`;
  }
  return `${trimmed}.`;
}

/** Is this a fragment that expects to be joined onto what came before it? */
export function startsLowerCase(text: string): boolean {
  const first = text.trim().replace(/^["“‘'(\[]+/, '').charAt(0);
  return first.length > 0 && first === first.toLowerCase() && first !== first.toUpperCase();
}

/** Does this text finish on a full stop — as opposed to a bang, a query or an ellipsis? */
export function endsInPeriod(text: string): boolean {
  return /\.["”’')\]]*$/.test(text.trim());
}

/** The same words, with the first letter put up. */
export function capitalizeFirst(text: string): string {
  const t = text.trim();
  if (t.length === 0) return '';
  // A quotation mark or bracket keeps its place; the letter behind it goes up.
  const m = /^(["“‘'(\[]*)(.)/.exec(t);
  if (!m) return t;
  return `${m[1]}${(m[2] as string).toUpperCase()}${t.slice((m[1] as string).length + 1)}`;
}

/**
 * A full stop that closes a sentence, with a lower-case word behind it.
 *
 * The lookbehinds spare an abbreviation: "3 a.m. was empty" is one word with
 * stops in it, and so are "Mrs. Teague's" and "St. Mark's Place".
 */
const STOP_THEN_LOWER =
  /(?<!\b[a-z])(?<!\b(?:[Mm]r|[Mm]rs|[Mm]s|[Dd]r|[Ss]t|[Jj]r|[Ss]r|[Nn]o))([.!?…])(\s+)([a-z])/g;

/**
 * Collapse the punctuation a join produced.
 *
 * Every card in every deck is a finished sentence with its own full stop, and
 * the frames were written around a `{fact}` that was not: `"{fact}."` with an
 * utterance in it gives `"Alive, I'd say.."`, and `{fact}, and the rest of it`
 * gives `on., and the rest of it`. The same seam, three ways.
 *
 * Nothing here invents punctuation. It only removes the second of two marks
 * where the deck and the frame each brought one, and puts up the first letter
 * of a sentence that a slot started lower-case.
 *
 * It used to turn that full stop into a comma, on the theory that a lower-case
 * word after a stop was a fragment wanting to join on. It is not: a place name
 * is lower-case because "the speakeasy" always is, and a card written as
 * "…still 1919 in here. {place} doesn't card and doesn't ask" is two finished
 * sentences with a slot at the head of the second. Comma-splicing them is the
 * M4b §A.3 seam applied where no simile was — so the stop stays, and the
 * letter behind it goes up. A comma is put in by `attachSimile` and by
 * `joinSentences`, each for a fragment it can see the whole of, and nowhere
 * else.
 */
export function tidyPunctuation(text: string): string {
  return (
    text
      // A full stop the card brought, followed by the mark the frame wanted.
      .replace(/\.\s*(?=[,;:])/g, '')
      // Two stops in a row, whichever way round.
      .replace(/([.!?…])\s*\1/g, '$1')
      .replace(/\.\s*([!?…])/g, '$1')
      .replace(/([!?…])\s*\./g, '$1')
      // A stop inside the quotation marks and another one outside them.
      .replace(/([.!?…])(["”’'])\s*\./g, '$1$2')
      // A sentence that a slot started lower-case — "the speakeasy" is always
      // lower-case — is still a sentence. It keeps its stop and gets a capital.
      .replace(STOP_THEN_LOWER, (_m, stop: string, gap: string, letter: string) =>
        `${stop}${gap}${letter.toUpperCase()}`)
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Two finished pieces of prose, one after the other, as two sentences.
 *
 * The first is given a full stop if it has none; a second that starts
 * lower-case is a fragment, and a fragment is joined on with a comma rather
 * than left stranded after a period.
 */
export function joinSentences(...parts: (string | undefined | null)[]): string {
  let out = '';
  for (const raw of parts) {
    const piece = (raw ?? '').trim();
    if (piece.length === 0) continue;
    if (out.length === 0) {
      out = piece;
      continue;
    }
    if (startsLowerCase(piece)) {
      out = `${out.replace(/[.\s]+$/, '')}, ${piece}`;
      continue;
    }
    out = `${endSentence(out)} ${piece}`;
  }
  return tidyPunctuation(out);
}

/**
 * Put `mark` — a comma, a full stop, anything the page grammar wants next —
 * after text that may already have punctuation of its own.
 */
export function appendMark(text: string, mark: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  if (mark.length === 0) return trimmed;
  if (TERMINALS.includes(mark) && endsSentence(trimmed)) return trimmed;
  return tidyPunctuation(`${trimmed.replace(/[.\s]+$/, '')}${mark}`);
}
