/**
 * docs/47 C14: the round-three prose lints. Read over a whole night, as a
 * player reads it, and the report form's own words:
 *
 * - **place-tag:** a place's name bolted onto a sentence ("hung in the hall at
 *   the Delmonico rooms") after the paragraph has named it, or one place named
 *   three times in one paragraph of narration;
 * - **phrase:** the board read aloud, game talk and quest-log signposts that
 *   have no place on a page ("with the list under both", "had himself at",
 *   "Which brought me to", "So, Moe’s.", "the report wants", "The next place
 *   worth the walk"), and a British spelling in a New York voice;
 * - **signpost:** more than one where-next sentence on a page;
 * - **gag:** one running gag (a prop, a trait, the street) paid off more than
 *   `GAG_MAX` times a night;
 * - **pet:** a lost pet called "it" ("who took it", "it went at ten"), on a
 *   page or on the form.
 *
 * Pure: it reads the night and returns what it found.
 */

import type { Page } from './types.js';
import { isMurder, type BoardDeal, type BoardRun } from './model.js';
import { GAG_MAX } from './pages.js';
import { boardFields } from './report.js';

export interface ProseIssue {
  page: number;
  rule: 'place-tag' | 'phrase' | 'signpost' | 'gag' | 'pet';
  detail: string;
}

/** Phrases that read the board aloud, talk like the game, or signpost the route. */
export const BANNED: { name: string; re: RegExp }[] = [
  { name: 'with the list under', re: /\bwith the list under\b/i },
  { name: 'word under it', re: /\bword under (it|them|both)\b|\bwith [A-Z][\w.’]*(?: [A-Z][\w’]*)?’s word under\b/ },
  { name: 'under both', re: /\bunder (both|all of them)\b/ },
  { name: 'had himself at', re: /\bhad (him|her)self at\b/ },
  { name: 'Which brought me to', re: /\bWhich brought me to\b/ },
  { name: 'So, X.', re: /(?:^|[.!?”]\s+)So, (?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)?’?s?\.(?=\s|$)/m },
  { name: 'X it was.', re: /(?:^|[.!?”]\s+)(?!(?:There|That|This|Here|It|So|Which|What) it was)(?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)? it was\.(?=\s|$)/m },
  { name: 'X, then.', re: /(?:^|[.!?”]\s+)(?:the )?[A-Z][\w’.]*(?: [A-Z][\w’]*)?, then\.(?=\s|$)/m },
  { name: 'That was why I’d come', re: /\bThat was why I’d come\b|\bwas why I’d come\b/ },
  { name: 'the one I’d come for', re: /\bthe one I’d come for\b|\bI’d come for \w+, and \w+ was here\b/ },
  { name: 'reason I’d walked over', re: /\bThat was the reason I’d walked over\b/ },
  { name: 'next place worth the walk', re: /\bThe next place worth the walk\b/ },
  { name: 'next door to knock on', re: /\bthe next door to knock on\b/ },
  { name: 'next stop', re: /\bThe night’s next stop\b/ },
  { name: 'whatever came next', re: /\bWhatever came next, it was waiting\b/ },
  { name: 'the report wants', re: /\bthe report (?:wants|wanted|would want|asks)\b/i },
  { name: 'the where', re: /\bthe where\b/ },
  { name: 'The office had given me', re: /\bThe office had given me\b/ },
  { name: 'in this room', re: /\bhad [^.]* in this room\b/ },
  { name: 'says she says', re: /\bsays (?:she|he) says\b/ },
  { name: 'a man called', re: /\bgo(?:ne)? straight to a man called\b|\bstraight to a pawnbroker’s runner called\b/ },
  { name: 'back on its nail', re: /\bon its nail in the morning\b|\bback on its nail\b/ },
  { name: 'on the way out', re: /\bOn the way out\b/ },
  { name: 'found where I’d left', re: /\bwhere I’d left (?:him|her)\b/ },
  { name: 'British spelling', re: /\b(?:colours?|kerbs?|sympathis\w*|neighbours?|parlours?|programmes?|favours?|honours?|flavours?|apologis\w*|realis\w*|recognis\w*|pavements?|whisky|cosy)\b/i },
  { name: 'British spelling: theatre', re: /\btheatres?\b/ },
];

/** A where-next sentence: one a page may carry its reason in; two is a quest log. */
const SIGNPOST = /\bwas next\b|\bwanted [^.]* next\b|\bnext (?:question|person|place) to\b|\bThe one to ask was\b|\bwas worth the walk\b|\bthe next place\b|\bwas where I wanted to be\b/i;

function narration(p: Page): { text: string; voice: string }[] {
  return p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'answer' && b.voice !== 'recap' && b.voice !== 'chapter' ? [{ text: b.text.replace(/“[^”]*”/g, ' '), voice: b.voice }] : []));
}

function count(text: string, word: string): number {
  return (text.match(new RegExp(`(?<![\\w’])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w’])`, 'gi')) ?? []).length;
}

export function proseIssues(d: BoardDeal, run: BoardRun): ProseIssue[] {
  const c = d.kase;
  const out: ProseIssue[] = [];
  const places = c.places.map((p) => p.short).filter((s) => s.length >= 4);
  run.log.forEach((p, i) => {
    const paras = narration(p);
    // Place names: bolted onto a sentence after the paragraph has named the place, or three in a paragraph.
    for (const para of paras) {
      for (const pl of places) {
        const n = count(para.text, pl);
        if (n >= 3) out.push({ page: i, rule: 'place-tag', detail: `${pl} ×${n}: ${para.text.slice(0, 80)}` });
        const sentences = para.text.split(/(?<=[.!?])\s+/);
        sentences.forEach((s, k) => {
          if (k === 0 || !new RegExp(`\\bat ${pl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,.]?$`).test(s.trim())) return;
          if (sentences.slice(0, k).some((x) => x.toLowerCase().includes(pl.toLowerCase())) && /\b(hung|stood|sat|was|were|lay|leaned|ticked|knocked)\b/.test(s) && !/^(It was|I |From|Getting|The walk|[A-Z]\w+ (was|lay) )/.test(s)) out.push({ page: i, rule: 'place-tag', detail: s.trim() });
        });
      }
    }
    // Phrases, over everything the player reads on the page (speech included: a client can say "says she says").
    const all = p.blocks.map((b) => (b.kind === 'prose' || b.kind === 'note' ? b.text : '')).join('\n');
    for (const b of BANNED) {
      const m = b.re.exec(b.name === 'in this room' || b.name.startsWith('So,') || b.name.startsWith('X') ? paras.map((x) => x.text).join('\n') : all);
      if (m) out.push({ page: i, rule: 'phrase', detail: `${b.name}: “${m[0].trim()}”` });
    }
    // Where-next sentences: one a page.
    const sig = paras.flatMap((x) => x.text.split(/(?<=[.!?])\s+/)).filter((s) => SIGNPOST.test(s));
    if (sig.length > 1) out.push({ page: i, rule: 'signpost', detail: sig.join(' | ') });
    // A lost pet is "he" or "she".
    if (c.type === 'lost-pet') {
      const m = /\b(?:[Ii]t went (?:at|missing)|who took it\b|[Ww]here it is now|whoever took it\b|get it back\b)/.exec(all);
      if (m) out.push({ page: i, rule: 'pet', detail: m[0] });
    }
  });
  // Running gags: each role's payoffs tonight.
  const roles = [...Object.values(run.props ?? {}), ...Object.values(run.traits ?? {}), ...(run.street ? [run.street] : [])];
  for (const r of roles) {
    const n = r.pay.filter((l) => run.spent.includes(`pay:${l.slice(0, 40)}`)).length;
    if (n > GAG_MAX) out.push({ page: -1, rule: 'gag', detail: `${r.short} ×${n}` });
  }
  // The form says "him" or "her" for a pet too.
  if (c.type === 'lost-pet' && !isMurder(c)) {
    for (const f of boardFields(d)) if (/\bit\b/.test(f.label)) out.push({ page: -1, rule: 'pet', detail: `form: ${f.label}` });
  }
  return out;
}
