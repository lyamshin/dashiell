/**
 * The reader lint's word lists (M10 §A.4, docs/26): the page is a story, and
 * the book's machinery belongs in the notebook. `lint.ts` runs them over a
 * board night, with the board's own checks.
 *
 * - **Words that never appear in narration or dialogue:** grid, margin, rule,
 *   lead, beat, card (in the sense of the book's own machinery), "the
 *   notebook had…", "put it on the grid", "the coroner's hours".
 * - **No verdict:** "Brennan was out of it", "That cleared Weisglass", "I
 *   crossed Zeldin off".
 *
 * Pure.
 */

/**
 * The machinery, as patterns. Each word is banned in the sense the book uses
 * it; the plain senses a noir page needs — the patrolman on the beat, a
 * business card, a card case, "led", a lead pipe — are not.
 */
export const MACHINERY: { name: string; re: RegExp }[] = [
  { name: 'grid', re: /\bgrids?\b/i },
  { name: 'margin', re: /\bmargins?\b/i },
  { name: 'rule', re: /\brules?\b(?! of thumb)/i },
  {
    name: 'lead',
    re: /\b(?:a|the|that|this|one|another|no|any|new|open|next|other|first|second|good|every|each|my|his|her|their|two|three) leads?\b(?! (?:pipe|weight|singer|actor|role))|\bleads? (?:to follow|that|pointed|opened|went)\b/i,
  },
  { name: 'beat', re: /\b(?:a|this|that|next|one|every|each|the) beats?\b(?<!on the beat)(?! cop| patrolman)/i },
  {
    // The book's own cards — dealt, drawn, in a deck — never a business card
    // or the one a man turns down the corner of.
    name: 'card',
    re: /\b(?:the|this|that) cards? (?:said|says|told|gave|dealt|was dealt)\b|\bcards? in the (?:notebook|deck)\b|\bdea(?:l|lt|ls) (?:a|the|another) card\b/i,
  },
  { name: 'the notebook had', re: /\bthe notebook had\b/i },
  { name: 'put it on the grid', re: /\bput (?:it|them|\w+) (?:on|in) the grid\b/i },
  { name: 'the coroner’s hours', re: /\bthe coroner[’']s hours\b/i },
];

/** Plain senses the patterns above would otherwise catch. */
const ALLOWED = [
  /\bon the beat\b/i,
  /\b(?:business|registration|calling|playing|union|index|dance|visiting|library|ration|punch|time) cards?\b/i,
  /\bcard case\b/i,
  // A patrolman walks his beat; an adjuster carries a folding rule.
  /\b(?:walks?|walked|walking) (?:a|the|his|her|my) beat\b/i,
  /\b(?:folding|steel|carpenter[’']s) rule\b/i,
  // The house's own rules on a card by the door.
  /\bhouse rules?\b/i,
  // A page's own margin, where somebody wrote on a paper.
  /\b(?:written|pencilled|scrawled|noted|jotted) in the margins?\b/i,
];

/** The book's machinery in a line of prose, less the plain senses and the words of `roles` (a job title, say). */
export function machineryIn(text: string, roles: readonly string[] = []): string[] {
  let bare = text;
  for (const re of ALLOWED) bare = bare.replace(new RegExp(re.source, 'gi'), ' ');
  for (const r of roles) bare = bare.split(r).join(' ');
  const out: string[] = [];
  for (const { name, re } of MACHINERY) {
    const m = re.exec(bare);
    if (m) out.push(`${name}: “…${bare.slice(Math.max(0, m.index - 40), m.index + 40)}…”`);
  }
  return out;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A verdict on somebody said in prose: "That cleared Weisglass", "I crossed Zeldin off". */
export function verdictsIn(text: string, surnames: readonly string[]): string[] {
  const out: string[] = [];
  if (/\bwas out of it\b/.test(text)) out.push('was out of it');
  for (const raw of surnames) {
    const s = esc(raw);
    const patterns = [
      new RegExp(`\\b(?:took|takes|taking) ${s} (?:out of it|off my list)\\b`),
      new RegExp(`\\b(?:That|It|This) cleared ${s}\\b`),
      new RegExp(`\\bcleared ${s} of\\b`),
      new RegExp(`\\bcrossed ${s} off\\b`),
      new RegExp(`\\bclosed ${s} off\\b`),
      new RegExp(`\\bclosed the door on ${s}\\b`),
      new RegExp(`\\bI let ${s} go\\b`),
      new RegExp(`\\bsettled ${s}, in the negative\\b`),
      new RegExp(`\\b${s} couldn[’']t have done it\\b`),
    ];
    for (const re of patterns) {
      const m = re.exec(text);
      if (m) out.push(m[0]);
    }
  }
  return out;
}
