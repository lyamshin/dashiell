/**
 * docs/72: the sums. A sum is a sentence that joins facts into a conclusion the player should draw from
 * the facts and the grid. From Poached up (`sumsSaid`) the narration before the report never says one;
 * Raw and Coddled, the teaching tiers, keep theirs. Five kinds:
 *
 * 1. **settled**, the settled hour: "So it happened at ten.", the turn's "It happened at ten o’clock.
 *    Abramowitz had said nine or ten, and at nine…" (only where the office gave two hours: one hour the
 *    office gave, said again, settles nothing);
 * 2. **frame**, the crime hour as a frame: "at ten, when Feeney was given the laudanum", "when it could
 *    have happened", "the earliest it could have happened";
 * 3. **partition**, who was still there at the hour and who had gone: "Mosley was at the Bijou at ten…,
 *    and by then Kavanagh had left.", "That put Wehrle at the Odessa at ten", "Dandridge was at the Bijou
 *    at ten; Schilling said so.", "Tramonti didn’t see Bidwell, Margolis or Feldman at Moe’s";
 * 4. **means**, the means tie on people: "So Kavanagh, Hauck and Mosley had each been at the Delmonico
 *    rooms earlier, where the laudanum was kept", "Dandridge hadn’t been at the Delmonico rooms before
 *    nine, when the laudanum was there to take" (somebody named, and the way to the means: the way in
 *    said as a fact of the scene, "The laudanum had come from the Delmonico rooms.", names nobody);
 * 5. **gap**, the gap pointer: "Nobody else had said where Hochstetter was at nine", "I still didn’t know
 *    where Hauck was at ten.", "…, and nobody had backed it up.", "I still had to ask Sweeney and Brennan
 *    about their evenings."
 *
 * Read in the narration outside quotation marks, on every page before the report but the office (the
 * office says why the hours matter), leaving out the hand-off (the star said aloud), and in the notebook's
 * "How it adds up" as it stood after each page that asked something. Pure: it reads the night and
 * returns what it found.
 */

import type { Page } from './types.js';
import { isMurder, type BoardCase, type BoardRun } from './model.js';
import { wayKnown, whyHours } from './bones/phrase.js';
import { sentencesOf } from './plan/sentences.js';

export type SumKind = 'settled' | 'frame' | 'partition' | 'means' | 'gap';

export const SUM_KINDS: SumKind[] = ['settled', 'frame', 'partition', 'means', 'gap'];

export interface SumHit {
  page: number;
  kind: SumKind;
  /** Where it was read: a page's narration, or the notebook as it stood after that page. */
  where: 'page' | 'notebook';
  text: string;
}

const H = '(?:seven|eight|nine|ten|eleven|twelve|midnight)';
const strip = (s: string): string => s.replace(/⁣\d+⁤/g, '');
const narr = (s: string): string => s.replace(/“[^”]*”?/g, ' … ');
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The placements' words: "That put…", "…; Schilling said so.", "according to Schilling", "By the same telling, …". */
const PLACED = new RegExp(
  [
    '\\bThat put\\b',
    '\\bI could (?:put|place)\\b',
    '\\bvouched for\\b',
    '\\bnone of the people\\b',
    '\\bwould swear to it\\b',
    '\\bwould say so to anybody\\b',
    '\\bsaw it with (?:his|her|their) own eyes\\b',
    '\\bby (?:his|her|their) own telling\\b',
    '\\bgoing by (?:the same telling|what I’d just been told)\\b',
    '\\b[Bb]y the same telling\\b',
    '\\bThe same answer said\\b',
    '\\bwas plain about it:',
    '\\bhad it that\\b',
    '\\bit came to this:',
  ].join('|'),
);

/** The sums one sentence of narration says, by kind. */
export function sumsInSentence(c: BoardCase, s: string): SumKind[] {
  const out = new Set<SumKind>();
  const office = c.givens.window ?? c.crime.window;
  const victim = c.people.find((x) => x.id === c.crime.victim)?.short ?? '#';
  // (Anybody the night could place: suspects and the company they named, never the dead, the client or a keeper.)
  const people = c.people.filter((x) => !x.object && x.id !== c.crime.victim && x.id !== c.client && x.role !== 'watcher').map((x) => x.short);
  const named = people.some((n) => new RegExp(`(?<![\\w’])${esc(n)}(?![\\w])`).test(s));
  const aboutVictim = new RegExp(`(?<![\\w’])${esc(victim)}(?![\\w])`).test(s) || /\bstill alive\b/.test(s);

  // 1. The settled hour, where the office gave two.
  if (office.length > 1) {
    const one = `${H}(?: o’clock)?(?!,? or\\b)`;
    if (
      new RegExp(`\\b(?:it|whatever happened to \\S+) (?:had )?happened at ${one}`, 'i').test(s) ||
      new RegExp(`\\bit was ${H}(?: o’clock)? when it happened\\b`, 'i').test(s) ||
      new RegExp(`\\bthe hour (?:it happened |that counted )?was ${one}`, 'i').test(s) ||
      /\bput the hour at\b|\bthe other (?:of the two(?: hours)?|hour \S+ had given me)\b/i.test(s) ||
      new RegExp(`\\bwhoever came for \\S+ came at ${one}`, 'i').test(s) ||
      new RegExp(`(?:^|\\. |, )(?:So )?(?:${esc(victim)}|[Hh]e|[Ss]he|[Ii]t|[Tt]hey) (?:went|was taken|were taken)(?: missing)? at ${one}`).test(s) ||
      // (The premise pair, the office's two hours beside the sighting: it begs the hour it leaves, and cut
      // off from it, "At nine, Feeney was still alive at the Bijou, and Abramowitz had said nine or ten."
      // dangles.)
      (new RegExp(`\\b(?:had (?:said|given me)|[Tt]wo hours, \\S+ had said:?) ${H} or ${H}\\b`).test(s) && (aboutVictim || /\bstill (?:at|in)\b/.test(s)))
    )
      out.add('settled');
  }

  // 2. The crime hour as a frame.
  const reasons = new Set<string>([whyHours(c, office)]);
  for (const h of c.board.hours) reasons.add(whyHours(c, [h]));
  if ([...reasons].some((r) => s.includes(r)) || /\bit could have happened\b|\bthe hours? (?:that )?(?:mattered|counted)\b/i.test(s)) out.add('frame');

  // 3. The partition: who was there at the hour, and who had gone.
  if (
    PLACED.test(s) ||
    (named &&
      (/\bby then\b[^.]*\b(?:left|gone)\b|\bgone by then\b|\band gone before\b/i.test(s) ||
        // (Never "while I was gone", nor an evening "gone from his face".)
        /(?<!\bI )\b(?:had|were|was) (?:both |all |each |already )?(?:left|gone)(?=[,.;]|$| (?:by|before) | from (?!(?:his|her|their|my|its|your) ))/.test(s) ||
        /\bhad (?:already )?left (?:the )?[A-Z]/.test(s) ||
        /\b(?:every one|both) of them had gone\b/.test(s) ||
        (!aboutVictim && new RegExp(`\\b(?:was|were) still (?:in |at |there)[^.]*\\b${H}\\b`).test(s)) ||
        new RegExp(`\\b(?:was|were) in at ${H}\\b`).test(s) ||
        (!/\b(?:said|told)\b/.test(s) && new RegExp(`\\bdidn’t see\\b[^.]*\\b${H}\\b|\\b${H}\\b[^.]*\\bdidn’t see\\b`).test(s)) ||
        /; (?:[A-Z][\w’.]*\s?)+ said so\b|\baccording to [A-Z]|, and (?:[A-Z][\w’.]*\s?)+ (?:had said as much|said so)\.?$|\bI had (?:that|it) from\b/.test(s) ||
        (!/\bsaid (?:only|nobody)\b/.test(s) && /\b[A-Z][\w’.]+ said (?!he\b|she\b|they\b|so\b|otherwise\b)[A-Z][\w’.]+(?:,? (?:and )?[A-Z][\w’.]+)* (?:was|were) at\b/.test(s))))
  )
    out.add('partition');

  // 4. The means tie, on somebody named.
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars?.occasion;
  const way = wayKnown(c);
  if (
    named &&
    (/\bthere to (?:take|be had)\b|\bfor the taking\b|\btoo late for\b|\bcould(?:n’t)? have (?:got|had|taken) the\b|\bhad no way to the\b|\bheard about the (?:key|window)\b|\btell the room\b|\btold the room\b|\bwhere everybody heard\b|\bhad heard\b[^.]*\bat that table\b/.test(s) ||
      (isMurder(c) && /\bwhere the [\w ]+ was kept\b/.test(s)) ||
      new RegExp(`\\b(?:knew|know) ${esc(way)}`).test(s) ||
      (!!party && new RegExp(`\\b(?:had been|hadn’t been|was|were|wasn’t|weren’t) at the ${esc(party)}\\b`).test(s)))
  )
    out.add('means');

  // 5. The gap pointer.
  if (
    /\bnobody (?:else )?had (?:said|told me)(?: yet)? where\b|\bthe only one (?:who had said where|saying so)\b|\bnobody had told me yet where\b/i.test(s) ||
    /\b(?:nobody|I had nobody to) (?:had )?back(?:ed)? (?:it|that) up\b|\bnobody had backed up a word\b|\bnobody backed it up\b/i.test(s) ||
    /\bon nobody’s word but\b|\bnobody but each of them had said\b|\bthat one voice was all I had\b|\bnobody had said so (?:but|for)\b|\b[Oo]nly (?:he|she|they) said (?:he|she|they) was\b/i.test(s) ||
    /\bhadn’t told me where\b|\bI (?:still )?didn’t know (?:yet )?where\b|\b(?:was|were) a blank page\b|\bnot a word from\b/i.test(s) ||
    /\bstill had to ask\b|\bhadn’t asked [^.]*about (?:the|their|his|her) evening|\bevenings? (?:was|were) still to come\b|\bstill out there somewhere\b|\bI didn’t have [^.]*evenings? yet\b/i.test(s)
  )
    out.add('gap');
  return [...out];
}

/** The narration of a stretch of prose: outside quotation marks, a sentence at a time. */
export function narrationSentences(text: string): string[] {
  return sentencesOf(narr(strip(text)))
    .map((s) => s.trim())
    .filter((s) => s && s !== '…');
}

/** A page's narration: its prose but the answers, and not its hand-off. */
function pageNarration(p: Page): string[] {
  const hand = strip(p.board?.handoff ?? '');
  const units = (p.board?.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'hand-off').map((u) => strip(u.text));
  const handoff = (s: string) => (hand !== '' && hand.includes(s)) || units.some((u) => u.includes(s));
  return p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'answer' && b.voice !== 'chapter' ? narrationSentences(b.text) : [])).filter((s) => !handoff(s));
}

/** The pages after which the notebook may read differently: a question asked, a find, a put. */
const ASKS = new Set(['account', 'list', 'search', 'motive', 'confront']);

/**
 * The night's sums before the report: in each page's narration, and in the notebook's "How it adds up"
 * as it stood after each page that asked something (`notebook(i)`, its clauses).
 */
export function sumIssues(c: BoardCase, run: Pick<BoardRun, 'log'>, notebook?: (i: number) => string[]): SumHit[] {
  const out: SumHit[] = [];
  run.log.forEach((p, i) => {
    const b = p.board;
    if (!b || b.job === 'office' || b.job === 'nothing') return;
    for (const s of pageNarration(p)) for (const kind of sumsInSentence(c, s)) out.push({ page: i, kind, where: 'page', text: s });
    if (!notebook || !ASKS.has(b.job)) return;
    for (const cl of notebook(i)) for (const s of narrationSentences(cl)) for (const kind of sumsInSentence(c, s)) out.push({ page: i, kind, where: 'notebook', text: s });
  });
  return out;
}
