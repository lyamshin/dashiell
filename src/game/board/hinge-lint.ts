/**
 * docs/62: the hinge lines. Clarity-2 cut the pages by a third; what still stops a reader, and what
 * the round-5 blind testers called "database grammar", is the lines that carry the facts: a witness's
 * answer, the thought after it, the turn, the put, the pointer that opens a page. Each rule below is
 * one of those said as a person says it, read over a whole night as a player reads it, target 0.
 * Each is a rule of `prose-lint.ts` (`hinge`, a column of `board-prose` and a table of its own):
 *
 * - **said-place** (item 2, P3): a place as the object of "said" or "told": "She said home at the
 *   Delmonico rooms at eleven", "Bledsoe had said Moskowitz’s at ten", "“You told me home at ten.”"
 *   A person said they *were* somewhere: "Bledsoe said she was at Moskowitz’s at ten."
 * - **gloss** (item 1): the same gloss twice on a night ("Fritz, the dachshund," on three pages), or a
 *   pet's kind said again after the night has said it ("My dachshund" in the office).
 * - **bare** (item 4, P12): somebody's first sentence that doesn't say who they are: no job, no tie
 *   ("Hanrahan was at a table by the wall.", "Zeldin stood at the register end", "Vogel was in the
 *   corner."), in that sentence or the one before, where nothing earlier tonight said it.
 * - **put-lead** (item 3, P3): a put's page that says the collision before the put says it to their
 *   face ("Steinbach had told me home at eleven, and Mrs. Mulcahy said otherwise." then "“You told
 *   me…”").
 * - **put-speech** (P3): a put said like the notebook: "Alfano said only … were at Moe’s at ten
 *   o’clock", "says she herself was", "o’clock, alone".
 * - **thought-who** (item 5): a thought that opens on "she" or "he" (or "So she had it right") just
 *   after somebody else of that sex was named, speech included.
 * - **orphan** (docs/60 §6): "That much held." with no agreement before it.
 * - **shift** (item 6, P2): a watcher who came on late saying "all evening", "from the start" or "never
 *   left", or saying when they came on after what they saw.
 * - **telling** (item 7, P6): the turn telling the act of telling ("Mrs. Sirkin had told me who came
 *   in. Grasso had told me where the evening went.").
 * - **form** (item 9): "the form" for the report.
 * - **epilogue** (item 10): the client named twice in a sentence, or in two running, in the verdict's close.
 * - **dose** (P5): on a poisoning, "died" for the hour the dose went in ("when Carbone could have died").
 * - **unwatched** (P8): "nobody watching the stairs" and its kin more than once a night.
 * - **pointer** (P4): a page that opens on a pointer of its own ("Zeldin had seen Reinhardt at the
 *   Shamrock at seven and ten.") before I ask, instead of in the asking.
 * - **connector** (P7): an evening told with the machine's joins: "Next was ten.", "The next thing was
 *   at eight o’clock:", "I’ll start at seven:", "Started at eight:".
 * - **tail** (P7): company tacked on after the evening as a sentence of its own ("Alone at nine.", "On
 *   my own at seven, eight and ten.", "Nobody was with me at nine or ten.").
 * - **locative** (item 11): the same spot twice in one paragraph of who's there ("at a little table by
 *   the wall … in a booth by the wall").
 * - **vocab** (batch 3, the designer's plain words): a story that "held" or "didn't hold" ("That much
 *   held.", "whether that held any better", "the Palace held where the Odessa hadn't") for "checked out"
 *   or the fact; "put" as a noun ("the put", "a put"); the game's unit, "calls", in page prose; "file"
 *   for closing the case ("or file on what I had", "whatever I had was what got filed"); "a line" for what
 *   somebody said or for the report's questions ("I'd read him the wrong line", "every line on it").
 * - **reason** (item 12): the stock phrases the skim readers stopped on: "one of the two hours it could
 *   have happened", "none of the people with a reason was at", "as far as anybody had told me".
 *
 * Pure: it reads the night and returns what it found.
 */

import type { Page } from './types.js';
import type { BoardDeal, BoardRun } from './model.js';
import { clientOf, isMurder, victimOf, type BoardCase } from './model.js';
import { sentencesOf } from './plan/sentences.js';
import { glossedIn } from './gloss.js';
import { maskPlaces, narrationOf } from './plan/measure.js';
import { isPoison } from './when.js';
import { UNWATCHED } from './tics.js';
export { UNWATCHED };

export type HingeRule =
  | 'said-place'
  | 'gloss'
  | 'bare'
  | 'put-lead'
  | 'put-speech'
  | 'thought-who'
  | 'orphan'
  | 'shift'
  | 'telling'
  | 'form'
  | 'epilogue'
  | 'dose'
  | 'unwatched'
  | 'pointer'
  | 'connector'
  | 'tail'
  | 'locative'
  | 'reason'
  | 'vocab';

export const HINGE_RULES: HingeRule[] = ['said-place', 'gloss', 'bare', 'put-lead', 'put-speech', 'thought-who', 'orphan', 'shift', 'telling', 'form', 'epilogue', 'dose', 'unwatched', 'pointer', 'connector', 'tail', 'locative', 'reason', 'vocab'];

export interface HingeIssue {
  page: number;
  rule: HingeRule;
  detail: string;
}

const strip = (s: string): string => s.replace(/⁣\d+⁤/g, '');
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const narr = (s: string): string => s.replace(/“[^”]*”?/g, ' … ');
const H = '(?:seven|eight|nine|ten|eleven|twelve|midnight)';

/** The page's prose blocks as the player reads them, with their voices. */
function prose(p: Page): { text: string; voice: string }[] {
  return p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'chapter' ? [{ text: strip(b.text), voice: b.voice }] : []));
}

/* ------------------------------------------------------------------ *
 * The rules.
 * ------------------------------------------------------------------ */

/** A place as the object of "said" or "told": "said home at", "had told me Moskowitz’s at ten". */
function saidPlace(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const places = c.places.map((x) => x.short).filter((x) => x.length >= 3).sort((a, b) => b.length - a.length);
  if (!places.length) return out;
  const PL = places.map(esc).join('|');
  const VERB = String.raw`\b(?:said|says|told me|had said|had told me|still said)`;
  // (Not a place that's the subject of a clause after it: "said the Odessa was shut".)
  const re = new RegExp(`(?<!\\b(?:label|sign|card|note|paper|letter)(?: on it)? )${VERB} (?:home\\b(?! (?:was|is)\\b)|(?:at )?(?:${PL})(?! (?:was|were|is|had|kept|shut)\\b))`, 'g');
  // In speech, the put's "You told me home at ten", "You said Moe’s".
  const reYou = new RegExp(`\\b[Yy]ou (?:told me|said) (?:home\\b|(?:at )?(?:${PL})\\b)`, 'g');
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      if (b.voice === 'answer') continue;
      for (const m of narr(b.text).matchAll(re)) out.push({ page: i, rule: 'said-place', detail: `“${b.text.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 60)}”` });
      for (const q of b.text.matchAll(/“[^”]*”?/g)) for (const m of q[0].matchAll(reYou)) out.push({ page: i, rule: 'said-place', detail: `speech: “${m[0]}”` });
    }
  });
  return out;
}

/** The same gloss twice on a night, or a pet's kind said again. */
function glossTwice(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const seen = new Map<string, number>();
  const pet = c.type === 'lost-pet' ? victimOf(c) : undefined;
  const kind = pet ? /^[^,]+, (?:a|an) (.+)$/.exec(pet.name)?.[1]?.split(' ').slice(-1)[0] : undefined;
  let kindSaid = -1;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      const n = narr(b.text);
      for (const x of c.people) {
        if (x.short.length < 3) continue;
        for (const m of n.matchAll(new RegExp(`\\b${esc(x.short)}, (?:the|a|an) ([a-z][\\w’ -]{2,40}?)(?=[,.;:])`, 'g'))) {
          const head = (m[1] as string).split(' ').slice(-1)[0] as string;
          const k = `${x.id}|${head}`;
          const was = seen.get(k);
          if (was !== undefined) out.push({ page: i, rule: 'gloss', detail: `${x.short}, the ${head}: again (first on page ${was + 1})` });
          else seen.set(k, i);
          if (x === pet && kind && head === kind && kindSaid >= 0 && kindSaid < i) out.push({ page: i, rule: 'gloss', detail: `${x.short}, the ${kind}: said on page ${kindSaid + 1} already` });
        }
      }
      if (kind && kindSaid < 0 && new RegExp(`\\b${esc(kind)}\\b`, 'i').test(b.text)) kindSaid = i;
    }
  });
  return out;
}

/** Somebody's first sentence that doesn't say who they are. */
function bareFirst(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const who = c.people.filter((x) => !x.object && x.short.length >= 3 && (x.role === 'suspect' || x.role === 'company' || x.role === 'watcher'));
  const done = new Set<string>();
  const glossedSoFar = new Set<string>();
  run.log.forEach((p, i) => {
    let prevNarr = '';
    for (const b of prose(p)) {
      // (Quotation marks carried sentence to sentence: an answer's middle sentence is still speech.)
      let inQ = false;
      for (const s of sentencesOf(b.text)) {
        const sn = maskPlaces(c, narrationOf(s, inQ));
        for (const ch of s) {
          if (ch === '“') inQ = true;
          if (ch === '”') inQ = false;
        }
        for (const x of who) {
          if (done.has(x.id)) continue;
          const re = new RegExp(`(?<![\\w’])${esc(x.short)}(?![\\w])`);
          // (Inside a place's name, "the landlady at Mrs. Nagy’s", it's the place, not her.)
          const inSpeech = re.test(maskPlaces(c, s)) && !re.test(sn);
          if (inSpeech) {
            // Said in somebody's mouth with who they are: met.
            if (glossedIn(c, x.id, s)) glossedSoFar.add(x.id);
            continue;
          }
          if (!re.test(sn)) continue;
          // (A roll call of three names or more, "I still had to ask Thorndike, Grasso, Doyle and Vitale",
          // is nobody appearing: who they are waits for the sentence that meets them.)
          const n0 = esc(x.short);
          if (new RegExp(`(?:[A-Z][\\w’.-]+, (?:(?:Mrs\\.|Miss|Dr\\.) )?[A-Z][\\w’.-]+(?:,| and) ${n0}\\b|\\b${n0}, (?:(?:Mrs\\.|Miss|Dr\\.) )?[A-Z][\\w’.-]+(?:,| and) |[A-Z][\\w’.-]+, ${n0},? and )`).test(sn)) continue;
          done.add(x.id);
          if (glossedSoFar.has(x.id) || glossedIn(c, x.id, s) || glossedIn(c, x.id, prevNarr)) continue;
          out.push({ page: i, rule: 'bare', detail: `${x.short}: “${s.slice(0, 100)}”` });
        }
        if (sn.trim().replace(/…/g, '').trim()) prevNarr = s;
      }
    }
  });
  return out;
}

/** Text of a page before its turn heading. */
function own(p: Page): { text: string; voice: string }[] {
  const out: { text: string; voice: string }[] = [];
  for (const b of p.blocks) {
    if (b.kind !== 'prose') continue;
    if (b.voice === 'chapter') break;
    out.push({ text: strip(b.text), voice: b.voice });
  }
  return out;
}

const SAYS_OTHERWISE = /\b(?:said otherwise|said it wasn’t so|said no\b|didn’t see (?:him|her|them) there|hadn’t seen (?:him|her|them) there|didn’t bear it out|saw (?:him|her|them) (?:at|on) )/;

/** A put's page that says the collision before the put does. */
function putLead(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'confront') return;
    const bs = own(p);
    const k = bs.findIndex((b) => b.voice === 'exchange' && /\bI said\b/.test(narr(b.text)) && /“You (?:told me|said)\b/.test(b.text));
    if (k < 0) return;
    for (const b of bs.slice(0, k)) for (const s of sentencesOf(narr(b.text))) if (SAYS_OTHERWISE.test(s)) out.push({ page: i, rule: 'put-lead', detail: `“${s.trim().slice(0, 100)}”` });
  });
  return out;
}

/** The put said like the notebook. */
function putSpeech(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\bsaid only\b[^”]*\bo’clock\b|\bsays (?:she|he) (?:herself|himself)\b|\bo’clock, alone\b|\bsaid nobody was at\b[^”]*\bo’clock\b/;
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'confront') return;
    for (const b of own(p)) {
      if (b.voice !== 'exchange') continue;
      for (const q of b.text.matchAll(/“[^”]*”?/g)) {
        const m = RE.exec(q[0]);
        if (m) out.push({ page: i, rule: 'put-speech', detail: `“${q[0].slice(0, 110)}”` });
      }
    }
  });
  return out;
}

/** A thought that opens on a pronoun just after somebody else of that sex was named. */
function thoughtWho(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const people = c.people.filter((x) => !x.object && x.short.length >= 3);
  run.log.forEach((p, i) => {
    const bs = own(p);
    bs.forEach((b, k) => {
      if (b.voice !== 'thought' || k === 0) return;
      const first = sentencesOf(narr(b.text))[0] ?? '';
      const m = /^(?:So |But |And )?(she|he|her|his|him)\b/i.exec(first.trim());
      if (!m) return;
      const female = /^(?:she|her)$/i.test(m[1] as string);
      // Somebody else of that sex the same sentence names after it ("So she had it right, and Steinbach
      // said the same"), just after an answer.
      const before = (bs[k - 1] as { text: string }).text;
      // (As the subject of a clause of its own: "…, and Steinbach said the same", "She and Hargrove agreed".
      // An object, "She saw Dandridge at eight", is nobody but who she saw.)
      const rest = first.slice(m[0].length);
      const named = people.filter((x) => !!x.female === female && (new RegExp(`^ and ${esc(x.short)}\\b`).test(rest) || new RegExp(`, (?:and|but|while) ${esc(x.short)} (?:said|had|was|did|backed|saw|agreed|told|bore)\\b`).test(rest)));
      if (named.length >= 1 && /“/.test(before)) out.push({ page: i, rule: 'thought-who', detail: `“${first.slice(0, 80)}”, beside ${named.map((x) => x.short).join(', ')}` });
    });
  });
  return out;
}

const AGREE = /\bsaid the same\b|\bchecked out\b|\btold it the same\b|\bhad it the same\b|\bbore (?:\S+ ){1,3}?out\b|\btold me too\b|\bwhat (?:he|she|they)’d told me\b|\bbacked\b|\bagreed\b|\bsame as\b|\bjust as\b|\bjust like\b|\bsaid so too\b|\btold it straight\b|\bhad it right\b|\bwas right\b|\bsaid so\b|\bsaw (?:him|her|them)\b/;
/** "That much checked out." with nothing before it that it says checked out. */
function orphan(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    for (const b of own(p)) {
      const ss = sentencesOf(narr(b.text));
      ss.forEach((s, k) => {
        if (!/^(?:That much (?:held|checked out|of it stood up)|So far as it went, it stood up)\.$/.test(s.trim())) return;
        if (k === 0 || !AGREE.test(ss[k - 1] as string)) out.push({ page: i, rule: 'orphan', detail: `“${b.text.slice(0, 120)}”` });
      });
    }
  });
  return out;
}

/** A late watcher's "all evening", or their shift said after what they saw. */
function shift(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const late = c.lists.filter((l) => c.board.hours.some((h) => l.entries[h] === undefined) && l.entries[c.board.hours[0] as number] === undefined);
  const SHIFT = /\b(?:came on at|come on at|wasn’t on till|didn’t come on till|on at (?:seven|eight|nine|ten|eleven)\b|started at (?:seven|eight|nine|ten|eleven)\b)/i;
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'list') return;
    const q = p.board.q ?? '';
    const l = late.find((x) => q === `list:${x.watcher}`);
    if (!l) return;
    const said = own(p).filter((b) => b.voice === 'answer' || /“/.test(b.text)).map((b) => b.text).join(' ');
    const quote = [...said.matchAll(/“([^”]*)”?/g)].map((m) => m[1] as string).join(' ');
    const all = /\ball evening\b|\bfrom the start\b|\bstart to finish\b|\bnever left\b|\bthe whole evening\b/.exec(quote);
    if (all) out.push({ page: i, rule: 'shift', detail: `“${all[0]}” from a watcher who came on late` });
    const sm = SHIFT.exec(quote);
    const firstSentence = sentencesOf(quote.trim())[0] ?? '';
    if (sm && !SHIFT.test(firstSentence)) out.push({ page: i, rule: 'shift', detail: `the shift said after what they saw: “${quote.slice(0, 110)}”` });
  });
  return out;
}

/** The turn telling the act of telling. */
function telling(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\bhad told me (?:who came in|who came and went|where the evening went)\b|\bI had heard from\b[^.]*\babout\b/;
  run.log.forEach((p, i) => {
    for (const b of p.blocks) {
      if (b.kind !== 'prose' || b.voice === 'answer') continue;
      const m = RE.exec(narr(strip(b.text)));
      if (m) out.push({ page: i, rule: 'telling', detail: `“${m[0]}”` });
    }
  });
  return out;
}

/** "The form" for the report. */
function form(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      const m = /\bthe form\b/i.exec(narr(b.text));
      if (m) out.push({ page: i, rule: 'form', detail: `“${b.text.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 40)}”` });
    }
  });
  return out;
}

/** The client named twice in a sentence, or in two sentences running, in the verdict's close. */
export function epilogueIssues(c: BoardCase, closing: readonly string[]): HingeIssue[] {
  const out: HingeIssue[] = [];
  const cl = clientOf(c);
  const re = new RegExp(`(?<![\\w’])${esc(cl.short)}(?![\\w])`, 'g');
  for (const para of closing) {
    const ss = sentencesOf(para);
    ss.forEach((s, k) => {
      const n = (s.match(re) ?? []).length;
      const prev = k > 0 ? ((ss[k - 1] as string).match(re) ?? []).length : 0;
      if (n >= 2 || (n >= 1 && prev >= 1)) out.push({ page: -1, rule: 'epilogue', detail: `“${(k > 0 ? `${ss[k - 1]} ` : '') + s}”` });
    });
  }
  return out;
}

/** On a poisoning, "died" for the hour the dose went in. */
function dose(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  if (!isPoison(c)) return out;
  const v = victimOf(c).short;
  const RE = new RegExp(`\\b(?:when|after|before) ${esc(v)} (?:could have )?died\\b|\\b${esc(v)} (?:could have )?died at ${H}\\b|\\bwhen (?:he|she) (?:could have )?died\\b|\\bat ${H}(?: or ${H})?, when (?:he|she|the dead man|the dead woman) (?:could have )?died\\b`);
  run.log.forEach((p, i) => {
    for (const b of p.blocks) {
      if (b.kind !== 'prose') continue;
      const m = RE.exec(narr(strip(b.text)));
      if (m) out.push({ page: i, rule: 'dose', detail: `“${m[0]}”` });
    }
  });
  return out;
}

/** "Nobody watching the stairs" and its kin, more than once a night. */
function unwatched(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  let n = 0;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      // (A place's own description, "The Belvedere had no doorman", is what the place is, not the signpost.)
      if (b.voice === 'answer' || b.voice === 'recap' || b.voice === 'establish') continue;
      // (A line of two sentences, "Nobody kept the stairs here. Whoever came and went did it unseen.", is one saying.)
      const s = sentencesOf(narr(b.text)).find((x) => UNWATCHED.test(x));
      if (!s) continue;
      n++;
      if (n > 1) out.push({ page: i, rule: 'unwatched', detail: `“${s.trim().slice(0, 100)}” (${n} tonight)` });
    }
  });
  return out;
}

/** A page that opens on a pointer of its own before I ask. */
function pointer(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = new RegExp(`^(?:(?:Mrs?\\.|Miss|Dr\\.) )?[A-Z][\\w’-]+ had (?:seen|said|told me) [^“”]*\\bat ${H}(?: and ${H})?\\.$`);
  run.log.forEach((p, i) => {
    const job = p.board?.job;
    if (job !== 'account' && job !== 'list' && job !== 'motive') return;
    const bs = own(p);
    const first = bs[0];
    if (!first || first.voice === 'answer') return;
    const ss = sentencesOf(first.text);
    if (ss.length === 1 && RE.test((ss[0] as string).trim())) out.push({ page: i, rule: 'pointer', detail: `“${(ss[0] as string).trim()}”` });
  });
  return out;
}

/** The machine's joins in an evening, and company tacked on as a sentence of its own. */
function evening(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const JOIN = new RegExp(`(?:^|[.!?:;]\\s+|“)(?:Next was ${H}\\.|The next (?:thing|part of the evening) (?:was|began) at ${H}\\b|I’ll start at ${H}:|Started at ${H}:|Next, at ${H}:)`);
  const TAIL = new RegExp(`(?:^|[.!?]\\s+|“)(?:Alone at ${H}[^.”]*\\.|On my own at ${H}[^.”]*\\.|By myself at ${H}[^.”]*\\.|(?:Nobody|No one) was with me at ${H}[^.”]*\\.|I had nobody with me at ${H}[^.”]*\\.|I was by myself at ${H}[^.”]*\\.|At ${H}(?:(?:, | and )${H})* it was just me\\.)`);
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'account' && p.board?.job !== 'confront') return;
    for (const b of own(p)) {
      for (const q of b.text.matchAll(/“[^”]*”?/g)) {
        const j = JOIN.exec(q[0]);
        if (j) out.push({ page: i, rule: 'connector', detail: `“${j[0].replace(/^[.!?:;“\s]+/, '')}”` });
        const t = TAIL.exec(q[0]);
        if (t) out.push({ page: i, rule: 'tail', detail: `“${t[0].replace(/^[.!?“\s]+/, '')}”` });
      }
    }
  });
  return out;
}

/** The same spot twice in one paragraph of narration. */
function locative(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\b(?:by|at|in|near|against|under) the (?:wall|corner|window|door|bar|back row|back|stairs|counter|register|stove|mirror)\b/g;
  run.log.forEach((p, i) => {
    // (Who's there and where, on the way in: the people lines.)
    const units = (p.board?.units ?? []).filter((u) => u.voice === 'presence');
    const paras = new Map<number, string>();
    for (const u of units) paras.set(u.para, `${paras.get(u.para) ?? ''} ${strip(u.text)}`);
    for (const text of paras.values()) {
      const b = { text };
      const seen = new Map<string, number>();
      for (const m of narr(b.text).matchAll(RE)) {
        const k = (m[0] as string).replace(/^\w+ /, '');
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
      for (const [k, n] of seen) if (n > 1) out.push({ page: i, rule: 'locative', detail: `“${k}” ×${n}: ${b.text.slice(0, 100)}` });
    }
  });
  return out;
}

/** The stock phrases the skim readers stopped on. */
function reason(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\bone of the two hours it could have happened\b|\bnone of the people with a reason (?:was|were)\b|\bas far as anybody had told me\b/i;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      const m = RE.exec(narr(b.text));
      if (m) out.push({ page: i, rule: 'reason', detail: `“${m[0]}”` });
    }
  });
  return out;
}

/** The designer's plain words (batch 3): a story "held", "put" as a noun, the game's "calls". */
function vocab(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const HELD = /\bThat much held\b|\b(?:did|didn’t|did not|would|wouldn’t|might|still|it|that|this|which|story|evening|answer|one) (?:had )?(?:held|hold)(?: up)?(?=[.,:;”]| (?:where|any better|either|for a second|when|if|was|and|but)\b)|\bheld where\b|\bhold(?:s)? up\b(?= (?:either|for a second)|[.,:;”])/i;
  const PUT = /\b(?:the|a|my|that|this|your|another) put\b(?! (?:it|out|down|up|on|in|away|back|her|him|them|me|my|the|a)\b)|\b[Pp]ut to it\b/;
  // (The chrome says "Close the case": the page never "files" it.)
  // (A verb, never the noun: "he had kept a file on her".)
  const FILE = /(?<!\b(?:a|the|one|his|her|its|my|their|box) )\b(?:file|filed|filing) (?:on|it(?! away)|the case|what|without|most)\b|\b(?:got|was) filed\b|\benough to file\b/i;
  // ("a line" for something somebody said, or for the report's questions.)
  const LINE = /\b(?:every|each|one|the wrong|a|no|that|this) lines? (?:on (?:it|the report)|at a time|had an answer|to hang)\b|\blines on it\b|\b(?:read|put|gave|told) (?:him|her|them|me) the (?:\w+ )?line\b|\bthe line that\b/i;
  const CALLS = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|a) calls?\b(?= (?:left|to spare|I didn’t need|against par|over)\b)|\bcalls? I didn’t need\b/i;
  run.log.forEach((p, i) => {
    // (The page's notes too: "Eight o’clock. The DA’s man was on the stairs…")
    const notes = p.blocks.flatMap((b) => (b.kind === 'note' ? [{ text: strip(b.text), voice: 'note' }] : []));
    for (const b of [...prose(p), ...notes]) {
      for (const s of sentencesOf(b.text)) {
        for (const [what, re] of [['held', HELD], ['put', PUT], ['calls', CALLS], ['filed', FILE], ['line', LINE]] as const) {
          const m = re.exec(s);
          if (m) out.push({ page: i, rule: 'vocab', detail: `${what}: “${s.trim().slice(0, 110)}”` });
        }
      }
    }
  });
  return out;
}

/** Every hinge rule over a night (the verdict's close is `epilogueIssues`, read by the caller with the report). */
export function hingeIssues(d: BoardDeal, run: BoardRun): HingeIssue[] {
  const c = d.kase;
  void isMurder;
  return [
    ...saidPlace(c, run),
    ...glossTwice(c, run),
    ...bareFirst(c, run),
    ...putLead(run),
    ...putSpeech(run),
    ...thoughtWho(c, run),
    ...orphan(run),
    ...shift(c, run),
    ...telling(run),
    ...form(run),
    ...dose(c, run),
    ...unwatched(run),
    ...pointer(run),
    ...evening(run),
    ...locative(run),
    ...reason(run),
    ...vocab(run),
  ];
}
