/**
 * docs/53, addendum: no engine words in the narration. The narrator reports
 * what people said and saw, in the words a person would use; the engine's
 * nouns for its own structures (a watcher's list, a person's account or
 * claim, a story as a thing that stands or breaks, somebody's word or count,
 * "and nobody else", "the hour that mattered", the window, a line under
 * another, a collision, placed, cleared, access, the means, the way in, "put
 * it to", the office as the client's briefing, the board, the notebook) never
 * appear in it.
 *
 * `engineWords(text)` finds them in a piece of prose: in the narration (the
 * text outside quotation marks) every rule; in speech (inside them) only the
 * board-speak no person says ("nobody else at all", "the hour that mattered",
 * somebody's "list" for what they saw).
 *
 * Pure: a text in, the hits out. Read by `prose-lint.ts` (rule `jargon`),
 * `scripts/board-prose.ts` and `scripts/engine-words.ts` (the counts by source).
 */

export interface EngineWord {
  name: string;
  re: RegExp;
  /** Also caught inside quotation marks. */
  speech?: boolean;
}

const NAME = String.raw`(?:(?:Mrs?\.|Miss|Dr\.) )?(?:[A-Z][\w’-]+(?: [A-Z][\w’-]+)?|\{\w+(?::\w+)?\})`;
const POSS = String.raw`(?:${NAME}’s|[Hh]is|[Hh]er|[Tt]heir|[Ii]ts|[Ww]hose|\{\w+:(?:their|poss|orposs)\}|the (?:watcher|landlady|usher|barman|janitor|doorman)’s)`;
const H = '(?:seven|eight|nine|ten|eleven|twelve)';

export const ENGINE_WORDS: EngineWord[] = [
  // Whose word: a watcher's list, an account, a claim, a story as a thing, somebody's word or count.
  { name: 'list', re: new RegExp(String.raw`(?<![\w’])(?:${POSS} (?:own )?lists?\b|[Tt]he (?:same )?list\b|[Aa] list\b(?! of)|lists from\b|on (?:the|that|this) list\b|(?:that|this|each|every|one|no|any) list\b|lists (?:said|had|put|showed|agreed))`), speech: true },
  { name: 'account', re: new RegExp(String.raw`(?<![\w’])(?:${POSS} (?:own )?account\b(?<!(?:on|for) (?:my|his|her|your|their) account)|[Tt]he account\b|[Aa]n account\b(?! of)|(?:true|whole|first|second|new|other) account\b|[Aa]ccounts (?:look|agree|agreed|match))`) },
  { name: 'claim', re: /(?<![{\w])claim(?:s|ed|ing)?\b(?<!to claim)(?!\})/i },
  { name: 'story', re: new RegExp(String.raw`(?<![\w’])(?:${POSS} (?:own )?story,? (?:said|says|put|placed|went|backed|agreed|which said|at ${H})\b|(?:a|the|that|this|his|her|their|[A-Z][\w’-]+’s|\{\w+:their\}) second story\b|br(?:eak|eaks|oke|oken|eaking) (?:the|his|her|their|[A-Z][\w’-]+’s) story|the line that breaks|${POSS} own story)`) },
  { name: 'word', re: new RegExp(String.raw`(?<![\w’])(?:${POSS} (?:own )?word\b(?! for it)|on (?:the |somebody’s |anybody’s |one person’s )?word\b|word (?:under|alone)\b|nobody else’s word)`) },
  { name: 'count', re: new RegExp(String.raw`(?<![\w’])(?:(?:on|by) ${POSS} count\b|[Tt]he count\b(?! came)|start counting\b|when it counted\b|the hours? that counted\b)`) },
  { name: 'evening (as an account)', re: new RegExp(String.raw`(?<![\w’])(?:${POSS} (?:own )?evening,? (?:said|says|had|put|agreed|confirmed|backed|placed|went against|against|under)\b|${NAME}’s own evening\b|evenings from\b)`) },
  // (A list's tail, in narration or in a watcher's mouth: "…, and nobody else", "Nobody else.", "no one else at all".)
  { name: 'and nobody else', re: /\b(?:and|but) (?:nobody|no one) else\b(?! (?:had|has|could|would|was|were|saw|knew|said|did|came|in|on|at|that|who|I|either|besides|but))|\b(?:nobody|no one) else at all\b|,? (?:nobody|no one) else[.”;]|\b(?:nobody|no one) besides\b|\band (?:nobody|no one) else(?=[;,.])|(?:^|[.;:!?]\s+|“)(?:Nobody|No one) else(?:, either)?[.”;]/, speech: true },
  // When: the hour and why, never the engine's name for it.
  { name: 'the hour that mattered', re: /\bhours? that mattered\b|\bthe hours? I cared about\b|\bthe one hour that\b|\bthe crime hour\b|\bthe hour of the crime\b/i, speech: true },
  { name: 'the window', re: /\b(?:inside|within) the window\b|\bthe window (?:narrowed|closed on)\b|\b(?:two|one|three)-hour window\b|\bwindow of (?:time|hours)\b/i },
  // How it stood: a line under another, against it.
  { name: 'under it', re: /\b(?:word|nothing|list|evening|account|story)\b[^.;]{0,16}?\bunder (?:it|them|both|hers|his|theirs)\b|\bto put under\b|\bput (?:it )?under (?:it|them)\b/ },
  { name: 'had him at', re: new RegExp(String.raw`\bha[ds] (?:him|her|them|nobody|(?:${NAME})(?:(?:, | and )(?:${NAME}|somebody [^,.;]+))*) (?:at|in at|here|there)\b(?! (?:home for|the door|arm’s|gunpoint|the bar\b|the table|(?:his|her|their|my) place))`) },
  { name: 'collides', re: /\bcollid(?:e|es|ed|ing)\b|\bcollisions?\b/i },
  { name: 'placed', re: /\b(?:had|nobody|been|was|were|be|having) placed\b|\bplaced (?:him|her|them|[A-Z])/ },
  { name: 'cleared', re: /\bclear(?:ed|s)\b(?! (?:his|her|my|the|a) (?:throat|table|desk|plate|glass|counter|bar))/i },
  { name: 'access', re: /(?<![{\w])access\b(?!\})/i },
  { name: 'means', re: /\bthe means\b|\b(?:had|have|has|no|any) means\b/i },
  { name: 'the way in', re: /(?<!\bon )\bthe way in\b/i },
  { name: 'put it to', re: /\bput (?:it|that|the line|this|them|the story) to\b|\bput to (?:him|her|them|[A-Z])|\bline put\b|\bwhen it was put\b/ },
  { name: 'the line (as a fact)', re: new RegExp(String.raw`(?<![\w’])(?:the|that|this|whose|one|no|any|each|every) lines? (?:that|put|I put|about|against|from|on(?! (?:the form|it\b))|said|says|broke|breaks|held|agreed|touched|didn’t|changed)\b|\bheard the line\b|\bthrough the line\b|\b(?:[A-Z][\w’-]+’s|his|her|their) (?:own )?line\b`) },
  { name: 'the office (the briefing)', re: /\b[Tt]he office (?:had(?! (?:kept|been|gone|stayed))|said|says|gave|given|named|pointed|put|told|hadn’t|had not|didn’t)\b|\bwhat the office\b|\bthe office’s\b/ },
  { name: 'the board', re: /\bthe board\b(?! (?:floor|walk))/i },
  { name: 'the notebook (as a record)', re: /\b(?:the|my) notebook (?:had|has|said|says|showed|shows|held|holds)\b|\bwhat the notebook\b|\bthe notebook’s\b/i },
];

export interface EngineHit {
  name: string;
  match: string;
  speech: boolean;
}

/** The engine words in a piece of prose: every rule outside quotation marks, the board-speak inside them. */
export function engineWords(text: string): EngineHit[] {
  const out: EngineHit[] = [];
  const clean = text.replace(/⁣\d+⁤/g, '');
  const narration = clean.replace(/“[^”]*”?/g, ' ¶ ');
  const speech = [...clean.matchAll(/“([^”]*)”?/g)].map((m) => m[1] as string).join(' ¶ ');
  for (const w of ENGINE_WORDS) {
    const re = new RegExp(w.re.source, w.re.flags.includes('g') ? w.re.flags : `${w.re.flags}g`);
    for (const m of narration.matchAll(re)) out.push({ name: w.name, match: m[0], speech: false });
    if (w.speech) for (const m of speech.matchAll(re)) out.push({ name: w.name, match: m[0], speech: true });
  }
  return out;
}
