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
 * docs/66, clarity-4 (the round-6 testers' joining text):
 *
 * - **unsettled** (P1): at the link and the walk (Raw to Medium), a thought that sees the dead or the pet
 *   at one of the client's two hours and doesn't say the hour it leaves ("At nine, Fritz was still at the
 *   Delmonico rooms, and Hauck had said nine or ten." and nothing after it: "So he went at ten.").
 * - **hedge** (P1): the window said again after a fact that settles it: "when it could have happened" at
 *   the link once a thought has said the hour, or at Hard-boiled after a sighting on the same page; and
 *   at Hard-boiled the hour's reason ("when it could have happened", "when Carbone could have been given
 *   the chloral") more than once a night.
 * - **restated** (P3): a way in that says again where somebody had been seen or said they'd been, for a
 *   person in the room ("Mrs. Kowalski had seen Bellucci and Steinbach at Kowalski’s at eight and nine.",
 *   the notebook a third time): the ask says it to their face.
 * - **find** (P3): "I'd find X at Y" more than once a night.
 * - **presumes** (P3): a hand-off that takes as known what isn't ("I wanted to know who Pickering had
 *   passed on the way over at ten"), and an agreement whose "though" contrasts with nothing ("Hauck did
 *   see him at the Hauck flat at eight, though.").
 * - **newcomer** (P4): somebody "come back in" (from where?), "the woman Alfano had named" in the line
 *   after Alfano named her, or a newcomer said after the thought instead of after the answer that named
 *   them.
 * - **office** (P5): the client's "Ask about Elsa Steinbach" (a menu's verb), "was found … The body was
 *   found by" (found twice), "behind on the rent" (whose?).
 * - **alone** (P6): an evening that says it was alone in two different words ("by myself", "alone", "on
 *   my own"), "After that" twice in one answer, or "After that" before a leaving ("After that, at nine, I
 *   left the meeting early").
 * - **walk** (P7): "a fair few" (it reads British); one distance said three times a night.
 * - **log** (P9): the narration as a ledger: "I noted that", "Before Carbone was given the chloral,
 *   somebody had been at the Delmonico rooms for it", "would check out where … hadn't", "had been at it".
 * - **papers** (P10): the papers' page saying "the dead man" more than three times (five, on main), or
 *   "papers" or "grudge" more than twice.
 * - **staging** (P8): a card against the clock or the room: "a late supper" after four in the morning,
 *   "the DA's man was on the stairs", "the whole point of the place" at a picture house.
 * - **retired** (P12): the witness lines the testers stopped on: "nobody left out because…", "take it
 *   untidy", "kept my hand off the rail", "Ask me where I was at ten again in the morning".
 *
 * docs/68, round 7 (wrong facts: a line that says what the board doesn't have):
 *
 * - **moved** (B2): a telling by change that says somebody came in or left where the board has them
 *   stay, a face and its owner's name at one place counted as one person ("Somebody in a fur collar …
 *   was gone by ten. Mosley came in at ten.").
 * - **agrees** (B3, `nightIssues`): the curtain's "What gave it away", the story's "said otherwise" or
 *   a clash's list citing a line that says what the liar said, as a pair's partner does.
 * - **star** (B4, B5): a star's reason, or a fastest-solve step, asking who somebody passed outside
 *   Medium, taking a walk "over" as known, or putting somebody at the supper who wasn't at the table.
 * - **party** (B5): the narration putting somebody at the supper who wasn't, or "one of his guests"
 *   where the lodger knew the way in too.
 * - **deadline** (B6): a windowed murder's find not saying the hour the means had to be had by, or a
 *   "hadn't" for somebody there only after it, without why.
 * - **clock**, **pet-it**, **gossip**, **number**, **both** (B8): the close at a time the clock didn't
 *   show; a named pet "it" in the crack; the neighbors' word on what the client was party to; a plural
 *   place with "was"; "had all been" of two.
 *
 * Pure: it reads the night and returns what it found.
 */

import type { Page } from './types.js';
import type { BoardDeal, BoardRun } from './model.js';
import { OFFICE, budgetCalls, clientOf, hourWord, isMurder, victimOf, type BoardCase, type Hour } from './model.js';
import { clockWords, minutesAfter, usedByPage } from './clock.js';
import type { Prop } from './bones/types.js';
import { voicingById } from './bones/voice.js';
import { accountOf, agreesWith, linesHeld, lineShown, listOf, meansBy, meansLate, shutAt } from './knowledge.js';
import { pageStars } from './choices.js';
import { namePlural } from './pages.js';
import { boardGrid } from './grid.js';
import { curtainOfBoard, heldBreakers, scoreBoard, storyOfBoard, truthReport } from './report.js';
import { officeLines } from './text.js';

type P<K extends Prop['k']> = Extract<Prop, { k: K }>;

/**
 * docs/68: what the round-7 rules read the night with, by default this tree's own. A measure of another
 * tree (main's nights, read with this tree's lint) hands that tree's in, so its stars, its curtain and
 * its grid are what's read.
 */
export interface LintEnv {
  pageStars?: typeof pageStars;
  heldBreakers?: typeof heldBreakers;
  storyOfBoard?: typeof storyOfBoard;
  boardGrid?: typeof boardGrid;
  scoreBoard?: typeof scoreBoard;
  truthReport?: typeof truthReport;
  officeLines?: typeof officeLines;
  curtainOfBoard?: typeof curtainOfBoard;
}
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
  | 'vocab'
  | 'unsettled'
  | 'hedge'
  | 'restated'
  | 'find'
  | 'presumes'
  | 'newcomer'
  | 'office'
  | 'alone'
  | 'walk'
  | 'log'
  | 'papers'
  | 'staging'
  | 'retired'
  | 'moved'
  | 'agrees'
  | 'star'
  | 'party'
  | 'deadline'
  | 'clock'
  | 'pet-it'
  | 'gossip'
  | 'number'
  | 'both';

export const HINGE_RULES: HingeRule[] = ['said-place', 'gloss', 'bare', 'put-lead', 'put-speech', 'thought-who', 'orphan', 'shift', 'telling', 'form', 'epilogue', 'dose', 'unwatched', 'pointer', 'connector', 'tail', 'locative', 'reason', 'vocab', 'unsettled', 'hedge', 'restated', 'find', 'presumes', 'newcomer', 'office', 'alone', 'walk', 'log', 'papers', 'staging', 'retired', 'moved', 'agrees', 'star', 'party', 'deadline', 'clock', 'pet-it', 'gossip', 'number', 'both'];

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

/** docs/66, P4: whether a quotation before `s` on the page named them (an owning up naming its witness). */
function spokenOnPage(p: Page, block: string, s: string, re: RegExp): boolean {
  const before: string[] = [];
  for (const b of prose(p)) {
    if (b.text === block) {
      before.push(b.text.slice(0, Math.max(0, b.text.indexOf(s))));
      break;
    }
    before.push(b.text);
  }
  return before.some((t) => [...t.matchAll(/“[^”]*”?/g)].some((q) => re.test(q[0])));
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
          // (docs/66, P4: somebody an owning up has just named, said in the line after it: the confession met them.)
          if (p.board?.job === 'confront' && spokenOnPage(p, b.text, s, re)) continue;
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

const AGREE = /\bsaid the same\b|\bmatched what\b|\bhad seen the same\b|\bchecked out\b|\btold it the same\b|\bhad it the same\b|\bbore (?:\S+ ){1,3}?out\b|\btold me too\b|\bwhat (?:he|she|they)’d told me\b|\bbacked\b|\bagreed\b|\bsame as\b|\bjust as\b|\bjust like\b|\bsaid so too\b|\btold it straight\b|\bhad it right\b|\bwas right\b|\bsaid so\b|\bsaw (?:him|her|them)\b/;
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

/* ------------------------------------------------------------------ *
 * docs/66, clarity-4: the round-6 testers' joining text.
 * ------------------------------------------------------------------ */

/** A thought's sentences on a page (the thought voice, before any turn heading). */
function thoughtSentences(p: Page): string[] {
  return own(p).filter((b) => b.voice === 'thought').flatMap((b) => sentencesOf(narr(b.text)).map((s) => s.trim()));
}

const SIGHTED = new RegExp(`\\bwas still (?:alive )?at [^.]*? at ${H}\\b|\\b[Aa]t ${H}, [A-Z][\\w’.]+(?: [A-Z][\\w’]+)? was still (?:alive )?at\\b`);
const WINDOW_REASON = /\bwhen it could have happened\b|\bwhen \S+(?: \S+)? could have (?:been given|died|gone)\b/;

/** P1: the hour a sighting settles, said; the window not said again after it. */
function settled(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const tier = c.tier;
  let hourSaid = false;
  let reasons = 0;
  run.log.forEach((p, i) => {
    const ts = thoughtSentences(p);
    const k = ts.findIndex((s) => SIGHTED.test(s) && / had (?:said|given me) \w+ or \w+\b/.test(s));
    const hourSaidAfter = (s: string) => /\b(?:it (?:had )?happened|went|was taken|whoever came for \w+ came|the hour was) at (?:seven|eight|nine|ten|eleven|twelve)\b/.test(s);
    if (tier >= 1 && tier <= 4 && k >= 0 && !ts.slice(k).some((s) => hourSaidAfter(s.slice(Math.max(0, s.search(/\bstill\b/)))))) out.push({ page: i, rule: 'unsettled', detail: `“${(ts[k] as string).slice(0, 110)}”` });
    for (const s of ts) {
      if (tier >= 1 && tier <= 4 && hourSaid && /\bwhen it could have happened\b/.test(s)) out.push({ page: i, rule: 'hedge', detail: `the hour was said already: “${s.slice(0, 110)}”` });
      if (tier === 5 && WINDOW_REASON.test(s)) {
        reasons++;
        if (reasons > 1) out.push({ page: i, rule: 'hedge', detail: `the window's reason again (${reasons} tonight): “${s.slice(0, 110)}”` });
      }
    }
    if (tier === 5 && ts.some((s) => SIGHTED.test(s))) {
      const j = ts.findIndex((s) => SIGHTED.test(s));
      for (const s of ts.slice(j + 1)) if (new RegExp(`\\b${H} and ${H}, when\\b`).test(s)) out.push({ page: i, rule: 'hedge', detail: `the window after the sighting: “${s.slice(0, 110)}”` });
    }
    if (ts.some((s) => /^So (?:it happened|it had happened|\S+(?: \S+)? (?:went|was taken)) at \w+\.$/.test(s))) hourSaid = true;
  });
  return out;
}

/** P3: the way in says why the place, never where a person had been seen or said they'd been. */
function restated(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /^(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’-]+ had (?:seen [A-Z]|said (?:he|she) was with\b)/;
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'arrive') return;
    const units = (p.board?.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'why-here');
    for (const u of units) for (const s of sentencesOf(narr(strip(u.text)))) if (RE.test(s.trim())) out.push({ page: i, rule: 'restated', detail: `“${s.trim().slice(0, 110)}”` });
  });
  return out;
}

/** P3: "I'd find X at Y", once a night; a hand-off or an agreement that takes for granted what isn't. */
function presumes(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  let finds = 0;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      if (b.voice === 'answer') continue;
      for (const s of sentencesOf(narr(b.text))) {
        if (/\bI’d find (?:him|her|(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’-]+) at\b/.test(s)) {
          finds++;
          if (finds > 1) out.push({ page: i, rule: 'find', detail: `“${s.trim().slice(0, 100)}” (${finds} tonight)` });
        }
        if (/\bI wanted to know who \S+(?: \S+)? had passed\b/.test(s)) out.push({ page: i, rule: 'presumes', detail: `“${s.trim().slice(0, 100)}”` });
        if (/\bdid see\b[^.]*, though\.$/.test(s.trim())) out.push({ page: i, rule: 'presumes', detail: `“${s.trim().slice(0, 100)}”` });
      }
    }
  });
  return out;
}

/** P4: who turns out to be in the room is met after the answer that named them, plainly. */
function newcomer(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      if (b.voice === 'answer') continue;
      for (const s of sentencesOf(narr(b.text))) {
        if (/\b(?:had )?come back in\b/.test(s)) out.push({ page: i, rule: 'newcomer', detail: `come back from where: “${s.trim().slice(0, 100)}”` });
        if (/\bthe (?:woman|man) [A-Z][\w’.]+(?: [A-Z][\w’]+)? had named\b/.test(s) && p.board?.job === 'confront') out.push({ page: i, rule: 'newcomer', detail: `named again: “${s.trim().slice(0, 100)}”` });
      }
    }
    // (A newcomer after the thought: the answer named them, and the thought came between.)
    const units = p.board?.units ?? [];
    const firstThought = units.findIndex((u) => u.kind === 'fact' && u.beat === 'thought' && u.voice === 'thought');
    if (firstThought >= 0 && p.board?.job !== 'confront') for (const u of units.slice(firstThought + 1)) if (u.kind === 'fact' && u.voice === 'presence') out.push({ page: i, rule: 'newcomer', detail: `after the thought: “${strip(u.text).slice(0, 100)}”` });
  });
  return out;
}

/** P5: the office as a conversation, not a menu or a form. */
function office(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const p = run.log[0];
  if (!p || p.board?.job !== 'office') return out;
  const all = prose(p).map((b) => b.text).join(' ');
  // (Somebody by name: "Ask about Monday" is a day, and says what happened on it.)
  for (const m of all.matchAll(/“Ask about ((?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+(?: [A-Z][\w’]+)?)/g)) if (c.people.some((x) => x.name === m[1] || x.short === m[1] || (m[1] ?? '').endsWith(x.short))) out.push({ page: 0, rule: 'office', detail: `a menu's verb: “${all.slice(m.index ?? 0, (m.index ?? 0) + 50)}”` });
  for (const s of sentencesOf(all)) if (/\bwas found in\b/.test(s) && /\bThe body was found by\b/.test(all)) out.push({ page: 0, rule: 'office', detail: `found twice: “${s.slice(0, 80)}”` });
  if (/\bbehind on the rent\b/.test(all)) out.push({ page: 0, rule: 'office', detail: 'behind on whose rent?' });
  return out;
}

/** P6: alone in one word an evening, and "After that" once. */
function alone(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'account' && p.board?.job !== 'confront') return;
    const said = own(p).filter((b) => b.voice === 'answer').map((b) => b.text).join(' ');
    if (!said) return;
    const words = new Set([...said.matchAll(/\b(by myself|on my own|alone)\b/g)].map((m) => m[1]));
    if (words.size >= 2) out.push({ page: i, rule: 'alone', detail: `alone as ${[...words].join(', ')}` });
    const after = [...said.matchAll(/\bAfter that\b/g)].length;
    if (after >= 2) out.push({ page: i, rule: 'alone', detail: `“After that” ×${after}` });
    if (/\bAfter that, at \w+(?: o’clock)?, I left\b/.test(said)) out.push({ page: i, rule: 'alone', detail: '“After that, … I left”' });
  });
  return out;
}

/** P7: a walk says its distance plainly, and not the same way three times a night. */
function walks(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const seen = new Map<string, number>();
  const FAR = /\b(a couple of blocks|a few blocks|several blocks|a good walk|a long walk|a fair walk|a good ten blocks|a handful of blocks|two blocks over|a long way on foot|a fair stretch on foot)\b/;
  run.log.forEach((p, i) => {
    const units = (p.board?.units ?? []).filter((u) => (u.kind === 'gap' && u.slot === 'walk') || u.beat === 'walk');
    for (const u of units) {
      const t = strip(u.text);
      if (/\ba fair few\b/.test(t)) out.push({ page: i, rule: 'walk', detail: `“${t.slice(0, 80)}”` });
      const m = FAR.exec(t);
      if (m) {
        const n = (seen.get(m[1] as string) ?? 0) + 1;
        seen.set(m[1] as string, n);
        if (n >= 3) out.push({ page: i, rule: 'walk', detail: `“${m[1]}” ×${n} tonight` });
      }
    }
  });
  return out;
}

/** P9: the narration as a ledger. */
function ledger(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\bI noted that\b|^Before \S+(?: \S+)? was given the [\w ]+, somebody had been at\b|\bwould check out where\b|\bhad been at it\b/;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      if (b.voice === 'answer') continue;
      for (const s of sentencesOf(narr(b.text))) if (RE.test(s.trim())) out.push({ page: i, rule: 'log', detail: `“${s.trim().slice(0, 100)}”` });
    }
  });
  return out;
}

/** P10: the papers say "papers", "grudge" and "the dead man" twice at most. */
function papers(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'search' || !/\bpapers?\b|\bdesk\b/.test(p.board?.q ?? '') && !prose(p).some((b) => /\bgrudge\b/.test(b.text))) return;
    const all = prose(p).map((b) => narr(b.text)).join(' ');
    for (const [w, re] of [['the dead man', /\bthe dead (?:man|woman)\b/g], ['papers', /\bpapers\b/g], ['grudge', /\bgrudges?\b/g]] as const) {
      const n = [...all.matchAll(re)].length;
      // (The dead by their role three times at most: a page of grudges against a woman, by women, needs her
      // by role where "her" could be the one on the page.)
      if (n > (w === 'the dead man' ? 3 : 2)) out.push({ page: i, rule: 'papers', detail: `“${w}” ×${n}` });
    }
  });
  return out;
}

/** P8: a card against the clock or the room. */
function staging(d: BoardDeal, run: BoardRun): HingeIssue[] {
  const c = d.kase;
  const out: HingeIssue[] = [];
  const budget = budgetCalls(d);
  run.log.forEach((p, i) => {
    const all = [...prose(p), ...p.blocks.flatMap((b) => (b.kind === 'note' ? [{ text: strip(b.text), voice: 'note' }] : []))];
    // (Four in the morning on, by the night's clock.)
    const late = minutesAfter(usedByPage(run.log, i), budget) >= 240;
    for (const b of all) {
      if (b.voice === 'answer') continue;
      const t = narr(b.text);
      if (/\blate supper\b/.test(t) && late) out.push({ page: i, rule: 'staging', detail: `a late supper at ${p.head}` });
      if (/\bThe DA’s man was on the stairs\b/.test(t)) out.push({ page: i, rule: 'staging', detail: 'the DA’s man on the stairs' });
      if (/\bwhole point of the place\b/.test(t) && /\bunwatched:4\b/.test(c.places.find((x) => x.id === p.at)?.key ?? '')) out.push({ page: i, rule: 'staging', detail: 'the whole point of a picture house' });
      // (A watcher's line that puts her on her stairs, where the way in had her somewhere else.)
      if (/\bsits on (?:her|his) stairs\b/.test(t) && !all.some((x) => x !== b && /\bstairs?\b/.test(narr(x.text)))) out.push({ page: i, rule: 'staging', detail: 'on her stairs, where the page put her elsewhere' });
    }
  });
  return out;
}

/** P12: the witness lines the testers stopped on. */
function retired(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const RE = /\bnobody left out because\b|\btake it untidy\b|\bhand off the rail\b|\bwhere I was at \w+ again in the morning\b/;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      const m = RE.exec(b.text);
      if (m) out.push({ page: i, rule: 'retired', detail: `“${m[0]}”` });
    }
  });
  return out;
}

/** Every hinge rule over a night (the verdict's close is `epilogueIssues`, read by the caller with the report). */
/* ------------------------------------------------------------------ *
 * docs/68, round 7: wrong facts. Each is a line that said something the board doesn't have.
 * ------------------------------------------------------------------ */

/** The run as it stood after page `i`: what was asked and where I'd been, for the stars a page offered. */
function runAt(run: BoardRun, i: number): BoardRun {
  const asked: string[] = [];
  const visited: string[] = [];
  for (let k = 0; k <= i; k++) {
    const pg = run.log[k];
    const b = pg?.board;
    if (!pg || !b) continue;
    if (b.job === 'arrive' && pg.at && pg.at !== OFFICE && !visited.includes(pg.at)) visited.push(pg.at);
    if (b.q && (b.job === 'account' || b.job === 'list' || b.job === 'motive' || b.job === 'search') && !asked.includes(b.q)) asked.push(b.q);
    if (b.q && b.job === 'confront') {
      const put = run.puts.find((x) => x.page === k);
      if (put?.landed && !put.again && !asked.includes(b.q)) asked.push(b.q);
    }
  }
  const last = run.log[i] as Page;
  return { ...run, asked, visited, at: last.at ?? run.at, log: run.log.slice(0, i + 1), puts: run.puts.filter((x) => x.page <= i), used: usedByPage(run.log, i), reportOpen: false, filed: undefined };
}

/** A list entry's person on the board: a name, or the face's owner. */
function ownerOf(c: BoardCase, e: string): string | undefined {
  if (e.startsWith('other:')) return undefined;
  if (e.startsWith('look:')) return c.people.find((x) => x.look === e.slice(5))?.id;
  return e;
}

/**
 * B2, **moved**: a telling by change (a watcher's list, a stretch of somebody's company) that says
 * somebody came in or left where the board has them stay: "Somebody in a fur collar came in for a bite
 * at nine and was gone by ten. Mosley came in at ten." of one man there both hours; "Renfro and Quill
 * were with me at first and left after eight" of a man at Moe's all evening. Read off the clauses'
 * voicings and propositions, each person (or the face's owner) against the board an hour either side.
 */
function moved(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  type Part = { shape: string; props: Prop[]; voicing?: string; parts?: Part[] };
  run.log.forEach((pg, i) => {
    for (const u of pg.board?.units ?? []) {
      if (u.kind !== 'fact') continue;
      for (const comp of (u.bones ?? []) as unknown as Part[]) {
        const whole = comp.props.flatMap((x) => ('hour' in x && typeof x.hour === 'number' ? [x.hour] : []));
        for (const part of comp.parts ?? []) {
          const vo = part.voicing ? voicingById(part.voicing) : undefined;
          if (!vo) continue;
          const f = new Set(vo.requires ?? []);
          const came = f.has('came') || f.has('mid') || f.has('outback') || f.has('singles') || (f.has('seen') && f.has('in'));
          const went = f.has('left') || f.has('mid') || f.has('outback');
          if (!came && !went) continue;
          let place: string | undefined;
          let hs: number[] = [];
          let open: number[] = [];
          const who = new Map<string, number[]>();
          if (part.shape === 'LIST-HOUR' && f.has('clause')) {
            const ps = part.props as P<'LIST'>[];
            const l = listOf(c, ps[0]?.watcher as string);
            if (!l) continue;
            place = l.place;
            open = c.board.hours.filter((h) => l.entries[h as Hour] !== undefined && !shutAt(c, l.place, h as Hour));
            for (const x of ps) for (const e of x.people) who.set(e, [...(who.get(e) ?? []), x.hour]);
          } else if (part.shape === 'CLAIM-SPAN' && f.has('who-with')) {
            const ps = part.props as P<'CLAIM'>[];
            const sp = ps[0]?.person as string;
            place = accountOf(c, sp)?.claims[ps[0]?.hour as Hour]?.place;
            open = [...new Set(whole)].sort((a, b) => a - b);
            for (const x of ps) for (const e of x.company ?? []) who.set(e, [...(who.get(e) ?? []), x.hour]);
          } else continue;
          if (!place) continue;
          for (const [e, hours] of who) {
            const o = ownerOf(c, e);
            if (!o) continue;
            hs = [...hours].sort((a, b) => a - b);
            // The runs of the clause's hours (out and back is two).
            const runs: number[][] = [];
            for (const h of hs) {
              const r = runs[runs.length - 1];
              if (r && open.indexOf(h) === open.indexOf(r[r.length - 1] as number) + 1) r.push(h);
              else runs.push([h]);
            }
            runs.forEach((r, k) => {
              const a = r[0] as number;
              const b = r[r.length - 1] as number;
              const before = open[open.indexOf(a) - 1];
              const after = open[open.indexOf(b) + 1];
              const arrives = came && (!f.has('outback') || k > 0) && before !== undefined;
              const leaves = went && (!f.has('outback') || k === 0) && after !== undefined;
              const who_ = e.startsWith('look:') ? `somebody ${e.slice(5)} (${nameOfIn(c, o)})` : nameOfIn(c, o);
              if (arrives && c.board.rows[o]?.[before as Hour] === place) out.push({ page: i, rule: 'moved', detail: `${who_} came in at ${a}, but was there at ${before}: “${strip(u.text).slice(0, 120)}”` });
              if (leaves && c.board.rows[o]?.[after as Hour] === place) out.push({ page: i, rule: 'moved', detail: `${who_} left after ${b}, but was there at ${after}: “${strip(u.text).slice(0, 120)}”` });
            });
          }
        }
      }
    }
  });
  return out;
}

/**
 * B4 and B5, **star**: a star's reason that says what isn't so: who somebody "passed on the way" where
 * no passer-by's word can be had (outside Medium), "on the way over" for a walk home, or a group "at
 * the supper" with somebody in it who wasn't at the table.
 */
function starReasons(d: BoardDeal, run: BoardRun, env: LintEnv = {}): HingeIssue[] {
  const c = d.kase;
  const out: HingeIssue[] = [];
  const occasion = c.givens.lines?.find((g) => g.kind === 'party')?.vars.occasion;
  const h0 = c.board.hours[0] as Hour;
  const seen = new Set<string>();
  run.log.forEach((_, i) => {
    if (run.log[i]?.board?.job === 'nothing') return;
    for (const s of (env.pageStars ?? pageStars)(d, runAt(run, i))) {
      if (seen.has(s.why)) continue;
      seen.add(s.why);
      for (const x of starWrong(c, s.why, occasion, h0)) out.push({ page: i, rule: 'star', detail: `${x}: “${s.why}”` });
    }
  });
  return out;
}

/** What a star's reason (or a fastest-solve step) says that isn't so. */
export function starWrong(c: BoardCase, why: string, occasion = c.givens.lines?.find((g) => g.kind === 'party')?.vars.occasion, h0 = c.board.hours[0] as Hour): string[] {
  const out: string[] = [];
  if (/\bpassed on the way\b/.test(why) && c.tier !== 4) out.push('a passer-by’s question outside Medium');
  if (/\bpassed on the way over at\b/.test(why)) out.push('“on the way over”, taken as known');
  if (occasion) {
    const at = new RegExp(`^(.+?) (?:were|was) at the ${esc(occasion)}\\b`).exec(why);
    if (at) for (const p of c.people) if (new RegExp(`(?<![\\w’])${esc(p.short)}(?![\\w])`).test(at[1] as string) && c.board.rows[p.id]?.[h0] !== c.crime.scene) out.push(`${p.short} wasn’t at the ${occasion}`);
  }
  return out;
}

/**
 * B5, **party**: somebody said to have been at the client's supper who wasn't at the table, or the way
 * in said as the guests' alone ("one of his guests") where the office gave the lodger it too.
 */
function party(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const occasion = c.givens.lines?.find((g) => g.kind === 'party')?.vars.occasion;
  if (!occasion) return out;
  const h0 = c.board.hours[0] as Hour;
  run.log.forEach((p, i) => {
    for (const b of prose(p)) {
      if (b.voice === 'answer') continue;
      for (const s of sentencesOf(narr(b.text))) {
        const at = new RegExp(`(?:^|[,;] )((?:(?:Mrs\\.|Mr\\.|Miss|Dr\\.) )?[A-Z][^,;]*?) (?:were|was|had (?:all |both )?been) at the ${esc(occasion)}\\b`).exec(s);
        if (at) for (const x of c.people) if (x.role !== 'client' && new RegExp(`(?<![\\w’])${esc(x.short)}(?![\\w])`).test(at[1] as string) && c.board.rows[x.id]?.[h0] !== c.crime.scene) out.push({ page: i, rule: 'party', detail: `${x.short} wasn’t at the ${occasion}: “${s.trim().slice(0, 110)}”` });
        if (c.givens.access.length > 0 && /\bone of (?:his|her|[A-Z][\w’.]+’s) guests\b/.test(s) && !/\bor the lodger\b/.test(s)) out.push({ page: i, rule: 'party', detail: `the lodger knew it too: “${s.trim().slice(0, 110)}”` });
      }
    }
  });
  return out;
}

/**
 * B6, **deadline**: on a windowed murder, the page that finds where the means came from says the
 * hour it had to be had by ("before nine, the earliest it could have happened"); and who's ruled out
 * on it, having come where it was kept only after, is said with why ("didn’t come till nine, too late
 * for it"), never a bare "hadn’t".
 */
function deadline(d: BoardDeal, run: BoardRun): HingeIssue[] {
  const c = d.kase;
  const out: HingeIssue[] = [];
  const by = meansBy(c);
  const find = c.finds.find((f) => f.gives.means);
  run.log.forEach((p, i) => {
    if (by !== undefined && find && p.board?.job === 'search' && p.board.q === `search:${find.id}`) {
      const said = prose(p).filter((b) => b.voice === 'thought').map((b) => b.text).join(' ');
      if (!new RegExp(`\\bbefore ${hourWord(by)}\\b`).test(said)) out.push({ page: i, rule: 'deadline', detail: `the find doesn’t say it had to be had before ${hourWord(by)}` });
    }
    const late = new Map<string, Hour | undefined>();
    for (const u of p.board?.units ?? []) {
      if (u.kind !== 'fact') continue;
      for (const comp of u.bones ?? []) {
        for (const x of comp.props) {
          if (x.k !== 'ACCESS' || x.had || x.hour !== undefined) continue;
          if (!late.has(x.person)) late.set(x.person, meansLate(c, runAt(run, i), x.person));
          const h = late.get(x.person);
          if (h !== undefined) out.push({ page: i, rule: 'deadline', detail: `${nameOfIn(c, x.person)} came at ${hourWord(h)}, and the line doesn’t say it was too late: “${strip(u.text).slice(0, 100)}”` });
        }
      }
    }
  });
  return out;
}

const nameOfIn = (c: BoardCase, p: string): string => c.people.find((x) => x.id === p)?.short ?? p;

/** B8, **pet-it**: a named pet called "it" in the speech that says where it went ("I took it. It’s with Pardo"). */
function petIt(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  if (c.type !== 'lost-pet') return out;
  run.log.forEach((p, i) => {
    if (p.board?.job !== 'confront') return;
    for (const b of prose(p)) for (const q of b.text.matchAll(/“[^”]*”?/g)) if (/\bI took it\b|\b[Ii]t’s with\b|\b[Ii]t went to\b/.test(q[0])) out.push({ page: i, rule: 'pet-it', detail: `“${q[0].slice(0, 90)}”` });
  });
  return out;
}

/** B8, **gossip**: the neighbors' word put on something the client was party to ("…, and asked me what Mimi was worth. I had it from the neighbors"). */
function gossip(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const p = run.log[0];
  if (!p) return out;
  for (const b of prose(p)) {
    for (const q of b.text.matchAll(/“([^”]*)”?/g)) {
      const ss = sentencesOf(q[1] as string);
      ss.forEach((s, k) => {
        if (!/\bneighbors\b/.test(s)) return;
        const said = /^(?:I had (?:it|that) from the neighbors|That’s what the neighbors say)/.test(s.trim()) ? ss[k - 1] : /\bI don’t like gossip, but\b/.test(s) ? s.replace(/^.*?\bbut\b/, '') : undefined;
        if (said && /\b(?:me|my)\b/.test(said)) out.push({ page: 0, rule: 'gossip', detail: `“${said.trim()} ${s.trim()}”` });
      });
    }
  }
  return out;
}

/** B8, **number**: a plural place name with "was" ("Mrs. Nagy’s rooms on East Fourth Street was a tall thin house"). */
function numberAgrees(c: BoardCase, run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const names = [...new Set(c.places.flatMap((x) => [x.name, x.short]))].filter((n) => namePlural(n)).sort((a, b) => b.length - a.length);
  if (!names.length) return out;
  const re = new RegExp(`(?:^|[.!?”] )(${names.map((n) => esc(n.charAt(0).toUpperCase() + n.slice(1))).join('|')})(?:,[^,]+,)? was\\b`);
  run.log.forEach((p, i) => {
    for (const b of prose(p)) for (const s of sentencesOf(b.text)) {
      const m = re.exec(` ${s.trim()}`.replace(/^ /, ''));
      if (m) out.push({ page: i, rule: 'number', detail: `“${s.trim().slice(0, 100)}”` });
    }
  });
  return out;
}

/** B8, **both**: "had all been" of two people ("So Salerno and Sweeney had all been at Kowalski’s"). */
function both(run: BoardRun): HingeIssue[] {
  const out: HingeIssue[] = [];
  const N = '(?:(?:Mrs\\.|Mr\\.|Miss|Dr\\.) )?[A-Z][\\w’-]+';
  const re = new RegExp(`(?:^|\\bSo |[;:] )${N} and ${N} had all\\b`);
  run.log.forEach((p, i) => {
    for (const b of prose(p)) for (const s of sentencesOf(narr(b.text))) if (re.test(s.trim())) out.push({ page: i, rule: 'both', detail: `“${s.trim().slice(0, 100)}”` });
  });
  return out;
}

/**
 * docs/68, the night's after-pages, read with the report: B3, **agrees**: what gave the lie away (the
 * curtain), who said otherwise (the story) and what a clash is listed with (the grid) are never a line
 * that says what the liar said, as a pair's partner does; B8, **clock**: the verdict's close names only
 * the time the clock showed; **gossip** in the notebook's office lines; **star** in the curtain's fastest
 * solve (its steps are the stars' reasons).
 */
export function nightIssues(d: BoardDeal, run: BoardRun, env: LintEnv = {}): HingeIssue[] {
  const c = d.kase;
  const out: HingeIssue[] = [];
  const lie = c.lies.find((l) => l.person === c.crime.culprit && l.hour === c.crime.hour) ?? c.lies.find((l) => l.person === c.crime.culprit);
  const breaker = (env.heldBreakers ?? heldBreakers)(d, run)[0];
  if (lie && breaker && agreesWith(c, lie.person, lie.hour as Hour, breaker)) out.push({ page: -1, rule: 'agrees', detail: `what gave it away agrees with the lie: “${breaker.text}”` });
  if (lie) {
    const story = (env.storyOfBoard ?? storyOfBoard)(d).join(' ');
    const said = /\b([A-Z][^.]*?) said otherwise\./.exec(story);
    if (said) {
      for (const p of c.people) {
        if (!new RegExp(`(?<![\\w’])${esc(p.short)}(?![\\w])`).test(said[1] as string)) continue;
        const l = linesHeld(c, { asked: [`account:${p.id}`, `list:${p.id}`], puts: [] }).find((x) => x.hour === lie.hour && agreesWith(c, lie.person, lie.hour as Hour, x));
        if (l) out.push({ page: -1, rule: 'agrees', detail: `the story has ${p.short} saying otherwise: “${said[0]}”` });
      }
    }
  }
  const g = (env.boardGrid ?? boardGrid)(c, run);
  for (const r of g.rows) {
    for (const h of g.hours) {
      const cell = r.cells[h];
      if (!cell?.collision) continue;
      for (const l of linesHeld(c, run)) {
        if (l.hour !== h || l.speaker === r.id || !agreesWith(c, r.id, h, l)) continue;
        if (cell.lines.includes(lineShown(c, run, l))) out.push({ page: -1, rule: 'agrees', detail: `${r.name}, ${hourWord(h)}: the clash lists “${l.text}”` });
      }
    }
  }
  const copy = structuredClone(run) as BoardRun;
  const closing = (env.scoreBoard ?? scoreBoard)(d, copy, (env.truthReport ?? truthReport)(d, copy)).closing.join(' ');
  const at = minutesAfter(run.used, budgetCalls(d));
  const closed = /\bclosed the case at ((?:a quarter|half|twenty(?:-five)?|ten|five) (?:past|to) [a-z]+|[a-z]+)\b/.exec(closing);
  if (closed && closed[1] !== clockWords(at)) out.push({ page: -1, rule: 'clock', detail: `“${closed[0]}” at ${clockWords(at)}` });
  if (/\bEight o’clock came\b/.test(closing) && at < 480) out.push({ page: -1, rule: 'clock', detail: `“Eight o’clock came” at ${clockWords(at)}` });
  const cl = esc(clientOf(c).short);
  for (const t of (env.officeLines ?? officeLines)(d)) if (new RegExp(`\\bneighbors say\\b[^.]*(?<![\\w’])${cl}(?![\\w])`).test(t)) out.push({ page: -1, rule: 'gossip', detail: `notebook: “${t}”` });
  const occasion = c.givens.lines?.find((x) => x.kind === 'party')?.vars.occasion;
  for (const step of (env.curtainOfBoard ?? curtainOfBoard)(d, run).split('\n').filter((x) => /^\d+\. /.test(x))) for (const x of starWrong(c, step, occasion, c.board.hours[0] as Hour)) out.push({ page: -1, rule: 'star', detail: `fastest solve: ${x}: “${step.slice(0, 120)}”` });
  return out;
}

export function hingeIssues(d: BoardDeal, run: BoardRun, env: LintEnv = {}): HingeIssue[] {
  const c = d.kase;
  void isMurder;
  return [
    ...moved(c, run),
    ...starReasons(d, run, env),
    ...party(c, run),
    ...deadline(d, run),
    ...petIt(c, run),
    ...gossip(run),
    ...numberAgrees(c, run),
    ...both(run),
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
    ...settled(c, run),
    ...restated(run),
    ...presumes(run),
    ...newcomer(run),
    ...office(c, run),
    ...alone(run),
    ...walks(run),
    ...ledger(run),
    ...papers(run),
    ...staging(d, run),
    ...retired(run),
  ];
}
