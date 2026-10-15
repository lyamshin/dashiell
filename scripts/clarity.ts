/**
 * docs/53's clarity lint, shared by `situated-dial.ts` (the situated deck) and `decks-dial.ts` (the
 * other decks and the bible): "a texture may be pure flavor, but it must be legible on its own".
 *
 * - **pronoun**: "it", "that" or "this" as a sentence's (or a clause's) subject, with no noun before
 *   it in the line for it to mean. A determiner ("That story was news") is a noun, and so is a token
 *   for a thing. "It" with nothing to mean ("it was late", "it never hurts to ask") is let be;
 * - **place**: "here" or "there" standing for a place the line doesn't say; "there was", "there's
 *   nothing", and "here" in speech are let be;
 * - **long**: over 40 words;
 * - **tag**: the oblique tags docs/53 names.
 *
 * Options, for lines that aren't situated cards (`decks-dial.ts`): `anyToken` lets any token stand
 * for the noun before ("{Src}. That made {name} next": the token is the clause that "that" means),
 * and `speech` reads the whole line as said aloud (the bible's voice lines, which answer a question:
 * "That's one for the priest" means the question), so its pronoun rule is let be and "here" is the
 * speaker's room.
 */

export interface ClarityOptions {
  anyToken?: boolean;
  speech?: boolean;
}

/** Words that, after "it", "that" or "this", make it the subject of a verb. */
const VERBS = new Set(
  `is was isn’t wasn’t has had hasn’t hadn’t does did doesn’t didn’t do can could couldn’t can’t would wouldn’t will won’t shall should shouldn’t may might must ought
  seemed seems sounded sounds looked looks felt feels came comes went goes made makes took takes meant means stood stands sat sits told tells got gets
  left leaves kept keeps wanted wants needed needs held holds belonged belongs fitted fit fits squared squares matched matches added adds counted counts
  mattered matters happened happens showed shows said says read reads ran runs stayed stays gave gives covered covers put puts set sets turned turns lay lies
  rang rings used agreed agrees lasted lasts helped helps hurt hurts cost costs tied ties pointed points settled settles opened opens closed closes
  worked works carried carries stuck sticks hung hangs waited waits landed lands broke breaks moved moves weighed weighs
  never always still just only already also even hardly simply really certainly probably surely`.split(/\s+/),
);
/** "It" that means nothing: the hour, the weather, the air of a room, a thing said after it ("it never hurts to ask"). */
const DUMMY =
  /^it(?:’s| is| was| had been| would be| seemed| felt| took| takes| pays| never hurts| doesn’t hurt| didn’t hurt| does no harm| did no harm)\b(?:\s+\S+){0,4}?\s+(?:to|that|for)\b|^it(?:’s| is| was| had been| would be| seemed| felt| had got| had gone| had grown| got| was getting)\s+(?:very |too |a little |getting |nearly |almost |still |much )?(?:late|later|early|dark|darker|cold|colder|raining|quiet|quieter|warm|warmer|hot|close|still|loud|past|time|no use|the hour|that hour|an hour)\b/i;
/** A noun before the pronoun, for it to mean: a determiner and a word, a possessive and a word, a token for a thing. */
const NOUN =
  /\b(?:the|a|an|my|your|our|their|its|every|each|another|no|some|any|one|this|that|these|those|what|whose|which|both|either|neither)\s+(?!(?:is|was|had|has|would|could|did|does|were|are|and|but|of|to|in|on|I|it)\b)[a-z’]+|\b[a-z]+’s\s+[a-z]+|\{(?:thing|place|role|means|their)\}|\b(?:something|nothing|anything|everything)\b/i;
/** A place said before "here" or "there", for it to mean ("in my coat pockets, and left them there"). */
const PLACE_BEFORE =
  /\b(?:where|wherever|somewhere|anywhere|nowhere|place|places|room|rooms|bar|club|house|flat|hall|street|streets|theater|restaurant|kitchen|stairs|office|corner|building|city|town)\b|\{place\}|\b(?:in|on|at|to|under|over|behind|beside|into|onto|across|along|by|near|inside|outside|front of)\s+(?:the|a|an|my|your|our|their|\{their\}|its|this|that)\s+[a-z]/i;

/** Where a sentence's subject goes: the sentence's start (after a "So" or an "And"), or an independent clause's. */
function sentenceSubject(before: string): boolean {
  const sentence = before.split(/(?<=[.!?][”"]?)\s+/).pop() ?? '';
  if (/^[“"(]?\s*(?:(?:so|and|but|then|now|still|for now|well|yes|no|maybe|perhaps|besides|anyway)\s*,?\s*)?$/i.test(sentence)) return true;
  return /(?:[;:—]\s*|,\s+(?:and|but|so|or|yet)\s+|[“"]\s*)$/i.test(sentence);
}

/** Inside a quotation at this offset: speech. */
function inSpeech(t: string, at: number): boolean {
  const open = t.lastIndexOf('“', at);
  return open >= 0 && t.lastIndexOf('”', at) < open;
}

export interface Finding {
  rule: 'pronoun' | 'place' | 'long' | 'tag';
  detail: string;
}

/** docs/53's clarity lint for one texture card (its tokens left in). */
export function clarity(text: string, o: ClarityOptions = {}): Finding[] {
  const out: Finding[] = [];
  const t0 = text.replace(/'/g, '’');
  const t = o.speech ? `“${t0.replace(/^[“"]|[”"]$/g, '')}”` : t0;
  // pronoun: it, that, this as a sentence's subject, with no noun before it in the card
  for (const m of t.matchAll(/\b(it|that|this)\b(?=(?:’s|’d|’ll)\b|\s+([a-z’]+))/gi)) {
    const at = m.index as number;
    const word = (m[1] as string).toLowerCase();
    const next = (m[2] ?? '').toLowerCase();
    const contraction = /^(?:’s|’d|’ll)/.test(t.slice(at + word.length));
    if (!contraction && !VERBS.has(next)) continue;
    const before = t.slice(0, at);
    if (!sentenceSubject(before)) continue;
    if (word === 'it' && DUMMY.test(t.slice(at))) continue;
    if (NOUN.test(before) || (o.anyToken && /\{\w+\}/.test(before))) continue;
    if (o.speech) continue;
    out.push({ rule: 'pronoun', detail: `“${t.slice(at, at + 24).trim()}…”` });
  }
  // place: here or there for a place the card doesn't say (speech may say "here": the speaker is standing in it)
  for (const m of t.matchAll(/\b(here|there)\b/gi)) {
    const at = m.index as number;
    const word = (m[1] as string).toLowerCase();
    const before = t.slice(0, at);
    const after = t.slice(at + word.length);
    if (word === 'here' && (inSpeech(t, at) || /^’s\b/.test(after) || /^\s+and there\b/i.test(after))) continue;
    if (/\bneither here nor\s*$/i.test(before) || /\bthen and\s*$/i.test(before) || /^\s+and then\b/i.test(after)) continue;
    if (word === 'there') {
      // "there was", "is there", "all there was": nobody's place.
      const aux =
        /^(?:’s|’d|’ll|’re|’ve)\b|^\s+(?:(?:usually|always|never|still|often|sometimes|really|just|probably|certainly)\s+)?(?:is|was|were|are|had|has|have|would|will|might|could|may|must|should|can|seemed|seems|came|comes|used|wasn’t|weren’t|isn’t|aren’t|hadn’t|hasn’t|won’t|wouldn’t|couldn’t|being|be|ought|appeared|remained)\b/i;
      if (aux.test(after)) continue;
      if (/\b(?:is|was|were|are|isn’t|wasn’t|has|had|have|would|could|will|might)\s*$/i.test(before)) continue;
    }
    if (PLACE_BEFORE.test(before) || (o.anyToken && /\{(?:place|Place|scene|venue|where|dest|Dest|street|Street)\}/.test(before))) continue;
    out.push({ rule: 'place', detail: `“…${t.slice(Math.max(0, at - 14), at + word.length + 10).trim()}…”` });
  }
  // long: over 40 words
  const n = t.split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length;
  if (n > 40) out.push({ rule: 'long', detail: `${n} words` });
  // tag: docs/53's oblique tags
  const TAGS = [
    /\b(?:word|count|say-so) under (?:it|them)\b/i,
    /\bon (?:my|your|his|her|their|\{their\}|its|our) count\b/i,
    /\bthe part (?:worth keeping|that counted)\b|\bworth keeping\b/i,
    /\band (?:\{they\}|I|you|we) knew it\b/i,
    /\bwhere I could check it\b/i,
  ];
  for (const r of TAGS) {
    const m = t.match(r);
    if (m) out.push({ rule: 'tag', detail: `“${m[0]}”` });
  }
  return out;
}
