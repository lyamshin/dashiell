/**
 * §A.2 — the breath-split form.
 *
 * The client's sentences are the generator's, and until now they were all one
 * length: twelve words, a comma, a subordinate clause. The golden's client
 * says "I found him. Half past eleven, in his rooms." Same facts, three
 * breaths, and the page gets its rhythm out of what she says rather than out
 * of what the engine puts around it.
 *
 * So every spoken sentence comes out a third time, split where a person would
 * breathe. Two rules govern:
 *
 * 1. **Every fact survives.** Nothing is dropped, nothing is invented, and
 *    correspondence is run over the joined form, which must carry every name,
 *    place and hour the unsplit sentence carried.
 * 2. **One to three pieces**, and at least one of six words or fewer where the
 *    sense allows. A split that cannot manage that is still worth having when
 *    it turns a twenty-word sentence into two ten-word ones.
 *
 * The splits are made at joints the generator itself writes — its own
 * discovery shapes first, then the conjunctions its templates use. Nothing
 * here rewrites English it has not been shown; a sentence with no joint in it
 * comes back as it went in, which is a one-piece breath and a no-op.
 */

/** As many pieces as a breath may have. Four is a list, not a turn. */
export const BREATH_MAX = 3;

/** Six words or fewer is what §A.2 calls short, and what the page counts. */
export const BREATH_SHORT = 6;

export function wordsIn(text: string): number {
  return (text.match(/[A-Za-z0-9’'—-]+/g) ?? []).length;
}

/** A piece of a split, as a sentence: capital at the front, stop at the back. */
function asSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim().replace(/^[,;:]\s*/, '');
  if (trimmed.length === 0) return '';
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

/**
 * The generator's own discovery sentences, split the way their writer would
 * say them out loud. These are the three shapes `victim.ts` writes, matched
 * whole so that a template change here is a template change there.
 */
const SHAPES: { re: RegExp; parts: (m: RegExpExecArray) => string[] }[] = [
  // "I found Sweeney at the suite at half past eleven."
  {
    re: /^I found (.+?) at (.+?) at ((?:half past|[a-z]+ o’clock).*?)\.$/,
    parts: (m) => [`I found ${m[1]}.`, `${m[3]}, at ${m[2]}.`],
  },
  // "I found the door at the office shut and the box gone, at ten o'clock."
  {
    re: /^I found the door at (.+?) shut and (.+?) gone, at (.+?)\.$/,
    parts: (m) => [`I found the door at ${m[1]} shut.`, `${m[2]} gone.`, `It was ${m[3]}.`],
  },
  // "I saw Sweeney at the pier at nine o'clock, and nobody has seen him since."
  {
    re: /^I saw (.+?) at (.+?) at (.+?), and nobody has seen (.+?) since\.$/,
    parts: (m) => [`I saw ${m[1]} at ${m[2]}.`, `${m[3]}.`, `Nobody has seen ${m[4]} since.`],
  },
];

/**
 * The joints a sentence can be broken at, in the order they are tried.
 *
 * Each one says where the break goes and what, if anything, the second piece
 * opens with instead of the conjunction. "…, which is two hours of nothing
 * useful" becomes "Two hours of nothing useful." — the relative pronoun is
 * scaffolding and the clause under it is a sentence.
 */
const JOINTS: { re: RegExp; lead: string }[] = [
  { re: /,\s+which (?:is|was|were|are)\s+/, lead: '' },
  { re: /,\s+and\s+/, lead: '' },
  { re: /,\s+but\s+/, lead: 'But ' },
  { re: /,\s+so\s+/, lead: 'So ' },
  { re: /\s+—\s+/, lead: '' },
];

/** What a second piece has to open on to stand as a sentence of its own. */
const STANDS_ALONE =
  /^(?:(?:I|he|she|it|they|we|you|nobody|somebody|everybody|there|that|this|the|a|an|his|her|their|my|its|one|two|three|four|five|six|half)\b|[A-Z])/;

/** Split once, at the first joint whose second half can stand up. */
function splitOnce(text: string): string[] | null {
  for (const joint of JOINTS) {
    const m = joint.re.exec(text);
    if (!m) continue;
    const head = text.slice(0, m.index);
    const tail = text.slice(m.index + m[0].length);
    if (wordsIn(head) < 3 || wordsIn(tail) < 3) continue;
    if (joint.lead.length === 0 && !STANDS_ALONE.test(tail)) continue;
    return [asSentence(head), asSentence(`${joint.lead}${tail}`)];
  }
  return null;
}

/**
 * One spoken sentence as one to three breaths. A sentence with no joint in it
 * comes back whole, which is the honest answer and costs the caller nothing.
 */
export function breathe(spoken: string): string[] {
  const text = spoken.replace(/\s+/g, ' ').trim();
  if (text.length === 0) return [];

  for (const shape of SHAPES) {
    const m = shape.re.exec(text);
    if (m) return shape.parts(m).map(asSentence).filter((p) => p.length > 0);
  }

  // A sentence that is already two sentences is already breathed.
  const sentences = text.split(/(?<=[.!?])\s+(?=[“"A-Z])/).filter((s) => s.trim().length > 0);
  if (sentences.length > 1) {
    return sentences.slice(0, BREATH_MAX).map(asSentence);
  }

  const first = splitOnce(text);
  if (!first) return [asSentence(text)];
  const out: string[] = [];
  for (const piece of first) {
    if (out.length >= BREATH_MAX - 1) {
      out.push(piece);
      continue;
    }
    const again = splitOnce(piece.replace(/\.$/, ''));
    if (again && out.length + again.length <= BREATH_MAX) out.push(...again);
    else out.push(piece);
  }
  return out.slice(0, BREATH_MAX);
}

/**
 * The words a breath must still carry, for the test and the checker: every
 * name, number and hour of the sentence it came from, ignoring the
 * punctuation and the capital a new sentence puts on its first letter.
 */
export function breathCarries(spoken: string, breath: readonly string[]): boolean {
  const bag = (text: string): string[] =>
    (text.toLowerCase().match(/[a-z0-9’']+/g) ?? []).filter(
      (w) => !['and', 'which', 'is', 'was', 'were', 'are', 'but', 'so', 'it', 'that'].includes(w),
    );
  const have = new Set(bag(breath.join(' ')));
  return bag(spoken).every((w) => have.has(w));
}
