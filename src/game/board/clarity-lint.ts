/**
 * docs/59: the clarity build's lints, read over a whole night as a player reads it. Each is a rule
 * of `prose-lint.ts` (and so a column of `board-prose`), target 0:
 *
 * - **repeat** (item 1): two sentences on a page that say the same fact (their propositions share
 *   an atom, `plan/once.ts`), or that share five content words, outside the turn and the report;
 * - **slots** (item 2): three or more bare hour-slot clauses in one quotation ("Eight o’clock,
 *   Mosley and Hanrahan. Nine, Mosley. At ten I had…", "Hargrove was with me at eight; Steinbach
 *   was with me at nine; …"): a person tells an evening by what changed;
 * - **continuity** (item 4): the client sitting down twice in the office; arriving twice on one
 *   page (the walk says "and I was at Moskowitz’s" and the arrival "I went down to Moskowitz’s");
 *   asking somebody already sitting to sit; the client at the scene with nothing to say how they
 *   got there;
 * - **tic** (item 7): more than one simile frame on a page ("as if", "like somebody", "the way
 *   you’d"); the "as if the tables could help" family, "as it turned out" or "which I wrote down"
 *   more than once a night; a running gag (the radiator, the register) said more than twice a night;
 * - **assembly** (item 8): "would" before a past tense ("would spent"); a capital pronoun after a
 *   lower-case word ("but He threw"); one name twice in a sentence; a place said as a pronoun ("The
 *   table at her was set at eight", "Fritz lived at her, in a basket": the reference pass took
 *   "Kreuzer’s" for Kreuzer).
 *
 * `verdictIssues` holds the verdict's why to the same assembly rule: never "them" for one person.
 *
 * Pure: it reads the night and returns what it found.
 */

import type { Page } from './types.js';
import type { BoardDeal, BoardRun, BoardReport } from './model.js';
import { clientOf, isMurder } from './model.js';
import { sentencesOf } from './plan/sentences.js';
import { maskPlaces } from './plan/measure.js';
import { contentWords, factAtoms, sharedContent, saysAgain, SAME_WORDS } from './plan/once.js';
import { NIGHT_TICS, SIMILE } from './tics.js';
import type { Unit } from './plan/types.js';

export interface ClarityIssue {
  page: number;
  rule: 'repeat' | 'slots' | 'continuity' | 'tic' | 'assembly';
  detail: string;
}

const strip = (s: string): string => s.replace(/⁣\d+⁤/g, '');
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The page's own blocks and units, before the turn's chapter heading (the turn is the notebook said aloud). */
export function ownSection(p: Page): { blocks: Page['blocks']; units: Unit[] } {
  const bi = p.blocks.findIndex((b) => b.kind === 'prose' && b.voice === 'chapter');
  const units = p.board?.units ?? [];
  const ui = units.findIndex((u) => u.kind === 'gap' && u.slot === 'chapter');
  return { blocks: bi < 0 ? p.blocks : p.blocks.slice(0, bi), units: ui < 0 ? units : units.slice(0, ui) };
}

/** Pages the repeat rule reads: not the report, the notebook said aloud, or a question read back. */
function readsOwnFacts(p: Page): boolean {
  const job = p.board?.job;
  return job !== 'nothing' && job !== 'recap' && job !== 'repeat';
}

/* ------------------------------------------------------------------ *
 * 1. Said once.
 * ------------------------------------------------------------------ */

export function repeatIssues(run: BoardRun): ClarityIssue[] {
  const out: ClarityIssue[] = [];
  run.log.forEach((p, i) => {
    if (!readsOwnFacts(p)) return;
    const { blocks, units } = ownSection(p);
    // The same fact, by what it says.
    const facts = units.filter((u): u is Unit & { kind: 'fact' } => u.kind === 'fact');
    const atoms = facts.map((u) => new Set((u.bones ?? []).flatMap((b) => b.props.flatMap(factAtoms))));
    for (let a = 0; a < facts.length; a++) {
      for (let b = a + 1; b < facts.length; b++) {
        const shared = [...(atoms[a] as Set<string>)].find((x) => (atoms[b] as Set<string>).has(x));
        if (shared) out.push({ page: i, rule: 'repeat', detail: `${shared}: “${strip((facts[a] as Unit).text).slice(0, 90)}” / “${strip((facts[b] as Unit).text).slice(0, 90)}”` });
      }
    }
    // The same words. (A put reads the line that breaks the story back to their face, and their answer
    // is about it: on a put's page the talk is the put's, and only the narration counts, as docs/47's
    // "sentences twice" has it.)
    const put = p.board?.job === 'confront';
    // (One person's own evening names every hour's place and company, docs/43's "whole": going back to
    // the Delmonico rooms with the same three people at nine says them again, and that's two hours, not
    // one fact twice. Within one answer, the facts above tell them apart.)
    const said = blocks.flatMap((b, bi) => (b.kind === 'prose' && b.voice !== 'chapter' && !(put && b.voice === 'exchange') ? sentencesOf(strip(b.text)).map((t) => ({ t, bi, answer: b.voice === 'answer' })) : []));
    const sents = said.map((x) => x.t);
    const words = sents.map((s) => contentWords(s));
    for (let a = 0; a < sents.length; a++) {
      for (let b = a + 1; b < sents.length; b++) {
        if ((said[a] as { answer: boolean }).answer && (said[a] as { bi: number }).bi === (said[b] as { bi: number }).bi) continue;
        const shared = sharedContent(words[a] as Set<string>, words[b] as Set<string>);
        // (Unless the later one brings three words of its own the page hadn't said: it drew something new.)
        if (shared.length >= SAME_WORDS && saysAgain(sents[b] as string, sents.slice(0, b))) out.push({ page: i, rule: 'repeat', detail: `${shared.length} words (${shared.join(', ')}): “${(sents[a] as string).slice(0, 90)}” / “${(sents[b] as string).slice(0, 90)}”` });
      }
    }
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. Told by change: no recitation by hour slot.
 * ------------------------------------------------------------------ */

const H = '(?:seven|eight|nine|ten|eleven|twelve|midnight)';
const HP = `${H}(?: o’clock)?(?:(?:, | and | or )${H}(?: o’clock)?)*`;
/** A clause that opens on its hour ("Eight o’clock, …", "Then nine: …", "At ten I had …"), or says who was with them at one. */
const SLOT_OPEN = new RegExp(`^(?:(?:then|and|so|but|first(?: off)?|to begin(?: with)?|after that|later|now|well),? )*(?:(?:at|by|come|from|round|about|around) )?${HP}\\b`, 'i');
const SLOT_WITH = new RegExp(`\\b(?:was|were) with me at ${HP}\\b|\\bat ${HP},? it was (?:just|only) me\\b|\\bit was (?:just|only) me at ${HP}\\b`, 'i');
/** A clause that tells a change: somebody came, went, stayed, left or got back. */
const CHANGE = /\b(?:came|come|comes|coming|went|go|goes|going|gone|left|leave|leaves|leaving|stayed|stay|stays|staying|arrived|turned up|showed up|dropped (?:in|by|off)|stopped (?:in|by|off)|walked|got (?:in|back|home)|back|headed|moved|joined|until|till|through|after|before|since|on (?:till|to)|out)\b/i;

/**
 * A verb besides "was": what somebody did at the hour ("I had a ticket for the Bijou", "I dropped a
 * parcel off"). A clause with one says what happened, not only where they were: it isn't bare.
 */
const DID = /\b(?:had|took|saw|got|made|ran|sat|stood|kept|met|bought|brought|caught|read|wrote|spoke|ate|drank|heard|found|gave|told|said|thought|knew|slept|lay|did|put|set|paid|sent|spent|lost|won|rang|sang|drove|rode|fed|led|meant|sold|taught|wore|[a-z]{2,}ed)\b/i;

/** Somebody doing something: a subject and a verb besides "was" ("Eight, I start thinking about what to wear"). */
const DOES = /\bI (?!was\b|were\b|had (?:nobody|no one|somebody|(?:Mrs\.|Mr\.|Miss|Dr\.)? ?[A-Z]))[a-z’]+\b|\b(?:my|our) \w+ [a-z]+s\b/;
/** Somebody in it: a slot is who was where ("Ten, nobody", "Eight o’clock, Mosley"), not a thing ("At seven, the rat poison was there"). */
const PERSONISH = /\b(?:I|me|nobody|no one|everybody|somebody|anybody)\b|(?<=\S\s)[A-Z][a-z’]{2,}\b/;
/** An hour word that's a count: "Ten rounds, no decision". */
const COUNT = /^(?:seven|eight|nine|ten|eleven|twelve) (?:rounds|years|dollars|minutes|times|people|men|women|cents|blocks|feet|hours|days|weeks|cups|drinks)\b/i;

/** The bare hour-slot clauses of one quotation: an hour and where, or an hour and who, and nothing that happened. */
export function slotClauses(quote: string): string[] {
  return quote
    .split(/(?<!\b(?:Mrs?|Dr|St))[.!?;]\s*/)
    .map((x) => x.replace(/^[“”\s]+|[“”\s]+$/g, '').trim())
    .filter((x) => x.length > 0)
    // (Not what's always so: "Eight is when the mothers want me" is the speaker's habit, not tonight's hour.)
    .filter((x) => (SLOT_OPEN.test(x) || SLOT_WITH.test(x)) && !CHANGE.test(x) && !DID.test(x.replace(/\b(?:it was|I was|was|were)\b|\bhad (?=(?:Mrs\.|Mr\.|Miss|Dr\.)? ?[A-Z]|nobody|no one|somebody)/g, '')) && !DOES.test(x) && !COUNT.test(x) && !/\b(?:is|are)\b/.test(x) && PERSONISH.test(x));
}

export function slotIssues(run: BoardRun): ClarityIssue[] {
  const out: ClarityIssue[] = [];
  run.log.forEach((p, i) => {
    for (const b of p.blocks) {
      if (b.kind !== 'prose') continue;
      for (const m of strip(b.text).matchAll(/“([^”]*)”?/g)) {
        const xs = slotClauses(m[1] as string);
        if (xs.length >= 3) out.push({ page: i, rule: 'slots', detail: `${xs.length} hour slots: ${xs.map((x) => `“${x.slice(0, 50)}”`).join(' / ')}` });
      }
    }
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * 4. Continuity.
 * ------------------------------------------------------------------ */

/** The client sitting down (or being shown the chair, or told to sit), in the office's narration. */
export const VISITOR_SAT = /\b(?:sat|sitting|seated|sit (?:down|until))\b|\b(?:offered|pointed|showed)\b[^.]*\bthe chair\b|\b(?:to|at|into|in) the (?:good )?chair\b|\bthe chair I offered\b|\btook the chair\b|\bwait for my offer\b/;
/** …said of me, not the client. */
const I_SAT = /\bI (?:\w+ ){0,2}(?:sat|sit)\b|\bI (?:took|pulled up) (?:a|the) (?:chair|stool)\b|, and sat\b/;
/** The walk that has arrived already: "…, and I was at Moskowitz’s", "…, and there it was". */
export const WALK_ARRIVES = /\band I was (?:at|there)\b|\bthere it was\b|\bI was there before\b|^I went round the corner to\b/;
/** An arrival that walks in again: "I went down to Moskowitz’s…". */
export const ARRIVAL_MOVES = /^(?:I went|I came|I climbed|I found|I got)\b/;
/** Asking somebody to sit, or nodding them into a chair. */
export const ASK_SIT = /\b(?:asked|invited|told) (?:the [\w’-]+|her|him|[A-Z][\w’-]+) (?:if (?:she|he) would |to )sit\b|\bsit down with me\b|\bwould sit (?:down|a minute)\b/i;
/** Somebody already sitting, as the arrival put them. */
export const SITTING = /\b(?:sat|sitting|seated)\b|\bon a (?:kitchen |hard |straight )?chair\b|\bin the good chair\b|\bon (?:a|the|her|his) stool\b|\bin (?:a|the|her|his) (?:chair|armchair|rocker)\b/;
/** My feet coming down off the desk (the office's posture). */
export const FEET = /\bfeet\b[^.]*\b(?:off|down from|down off)\b[^.]*\bdesk\b|\bfeet (?:down|off)\b/i;
/** The client at the scene, and how they got there ahead of me. */
const AHEAD = /\bahead of me\b|\bhad (?:arrived|come|got) (?:there |in )?(?:first|ahead|before)\b|\bin a cab\b|\bhad taken a cab\b|\bbeaten me there\b/;

/** A knock at my door, not the radiator's, nor the finder's at the dead man's ("…who heard his radio still going, and knocked"). */
const DOOR_KNOCK = /^(?!.*\b(?:radiator|pipes?|heating|boiler|found|radio)\b).*\b(?:a knock|knocked|knocks)\b/i;

export function continuityIssues(d: BoardDeal, run: BoardRun): ClarityIssue[] {
  const c = d.kase;
  const out: ClarityIssue[] = [];
  const cl = clientOf(c);
  run.log.forEach((p, i) => {
    const narr = p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'chapter' && b.voice !== 'answer' ? [strip(b.text).replace(/“[^”]*”/g, ' ')] : []));
    if (p.board?.job === 'office') {
      // The client sits down once (after the opening paragraph, which is my own room).
      const sits = narr.slice(1).flatMap((t) => sentencesOf(t)).filter((s) => VISITOR_SAT.test(s) && !I_SAT.test(s) && !/\bhad sat\b|\bthe dark\b/.test(s));
      if (sits.length > 1) out.push({ page: i, rule: 'continuity', detail: `the client sat down twice: ${sits.map((s) => s.trim()).join(' / ')}` });
      // My feet come off the desk once.
      const feet = narr.flatMap((t) => sentencesOf(t)).filter((s) => FEET.test(s));
      if (feet.length > 1) out.push({ page: i, rule: 'continuity', detail: `my feet came off the desk twice: ${feet.map((s) => s.trim()).join(' / ')}` });
      // The door is knocked on once ("…and then a knock, so soft I nearly missed it. My visitor knocked once…").
      const knocks = narr.flatMap((t) => sentencesOf(t)).filter((s) => DOOR_KNOCK.test(s));
      if (knocks.length > 1) out.push({ page: i, rule: 'continuity', detail: `the door knocked on twice: ${knocks.map((s) => s.trim()).join(' / ')}` });
    }
    if (p.board?.job === 'arrive') {
      const units = p.board.units ?? [];
      const walk = units.filter((u) => u.kind === 'gap' && u.slot === 'walk').map((u) => strip(u.text)).join(' ');
      const arrival = units.filter((u) => u.kind === 'gap' && u.slot === 'arrival').map((u) => strip(u.text));
      if (WALK_ARRIVES.test(walk) && arrival.some((t) => ARRIVAL_MOVES.test(t))) out.push({ page: i, rule: 'continuity', detail: `arrived twice: “${walk.slice(0, 80)}” / “${(arrival.find((t) => ARRIVAL_MOVES.test(t)) ?? '').slice(0, 80)}”` });
      // The client at a murder's scene: how they got there, or not there at all.
      if (isMurder(c) && p.at === c.crime.scene && !run.log.slice(0, i).some((x) => x.at === p.at)) {
        const said = arrival.find((t) => new RegExp(`\\b${esc(cl.short)}\\b`).test(t) && !/\bmy client\b.*\bsaid\b/.test(t));
        if (said && !AHEAD.test(said)) out.push({ page: i, rule: 'continuity', detail: `the client at the scene, unexplained: “${said.slice(0, 100)}”` });
      }
    }
    // Asking somebody to sit who the arrival had sitting already, in this room.
    if (p.board?.job === 'list' || p.board?.job === 'account') {
      const who = (p.board.q ?? '').split(':')[1] ?? '';
      const person = c.people.find((x) => x.id === who);
      if (!person) return;
      const asked = narr.flatMap((t) => sentencesOf(t)).find((s) => ASK_SIT.test(s));
      if (!asked) return;
      // The arrival of this visit: the pages back to the walk in.
      let k = i - 1;
      while (k >= 0 && run.log[k]?.at === p.at && run.log[k]?.board?.job !== 'arrive') k--;
      const arrive = run.log[k];
      if (!arrive || arrive.at !== p.at || arrive.board?.job !== 'arrive') return;
      const line = (arrive.board.units ?? []).filter((u) => u.kind === 'gap' && u.slot === 'arrival').map((u) => strip(u.text)).flatMap((t) => sentencesOf(t)).find((s) => new RegExp(`^(?:${esc(person.short)}|${person.female ? 'She' : 'He'})\\b`).test(s) && SITTING.test(s));
      if (line) out.push({ page: i, rule: 'continuity', detail: `asked to sit, already sitting: “${line.slice(0, 80)}” / “${asked.slice(0, 80)}”` });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * 7. Tics.
 * ------------------------------------------------------------------ */

/** Once a night, each (`tics.ts`): "as it turned out", "which I wrote down" and kin, the room asked to help. */
export const ONCE_A_NIGHT: { name: string; re: RegExp }[] = NIGHT_TICS.map((t) => ({ name: t.name, re: new RegExp(t.re.source, 'gi') }));
export { SIMILE };

/** Narration: the page's prose with quoted speech taken out. */
function narrationOf(p: Page): string[] {
  return p.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'chapter' ? [strip(b.text).replace(/“[^”]*”?/g, ' … ')] : []));
}

export function ticIssues(run: BoardRun): ClarityIssue[] {
  const out: ClarityIssue[] = [];
  const night = { help: 0, once: new Map<string, number>() };
  run.log.forEach((p, i) => {
    const narr = narrationOf(p).join('\n');
    const sims = [...narr.matchAll(SIMILE)].map((m) => m[0]);
    if (sims.length > 1) out.push({ page: i, rule: 'tic', detail: `${sims.length} simile frames on a page: ${sims.join(', ')}` });
    void night.help;
    for (const o of ONCE_A_NIGHT) {
      for (const _m of narr.matchAll(o.re)) {
        const n = (night.once.get(o.name) ?? 0) + 1;
        night.once.set(o.name, n);
        if (n > 1) out.push({ page: i, rule: 'tic', detail: `“${o.name}” ${n} times a night` });
      }
    }
  });
  // Running gags: a prop, a trait or the street said at most twice a night: set up once, paid off once.
  const roles = [...Object.entries(run.props ?? {}).map(([k, r]) => ({ k: `the prop at ${k}`, r })), ...Object.entries(run.traits ?? {}).map(([k, r]) => ({ k: `${k}’s trait`, r })), ...(run.street ? [{ k: 'the street', r: run.street }] : []), ...(run.prop ? [{ k: 'the office’s prop', r: run.prop }] : [])];
  for (const { k, r } of roles) {
    const paid = r.pay.filter((l) => run.spent.includes(`pay:${l.slice(0, 40)}`)).length;
    if (paid + 1 > 2) out.push({ page: -1, rule: 'tic', detail: `${k} (${r.short}) said ${paid + 1} times a night` });
  }
  // …and by the thing itself, whoever's line says it ("the radiator", "the register"): on three pages
  // or more, outside the turn and the report, it's a running gag said too often.
  // (A prop called by one word, "the radiator", "the register": a phrase, "the clock over the door", is
  // its pay lines' to count.)
  const things = [...new Set([...Object.values(run.props ?? {}), ...(run.prop ? [run.prop] : [])].map((r) => (/^(?:the|my|a|an) ([a-z]{7,})$/i.exec(r.short.trim())?.[1] ?? '').toLowerCase()).filter((x) => x.length >= 7))];
  for (const t of things) {
    const pages = run.log.filter((p) => p.board?.job !== 'recap' && p.board?.job !== 'nothing' && new RegExp(`\\b${t}s?\\b`, 'i').test(narrationOf(p).join(' '))).length;
    if (pages > 2) out.push({ page: -1, rule: 'tic', detail: `“${t}” on ${pages} pages a night` });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 8. Assembly.
 * ------------------------------------------------------------------ */

/** "would" before a past tense or a past participle: "would spent", "would gone". */
export const WOULD_PAST = /\bwould (?!have\b|be\b|rather\b|not\b|never\b|always\b|just\b|still\b|only\b|also\b|soon\b)(?:been|spent|sent|lost|met|brought|bought|thought|sat|stood|slept|eaten|drunk|gone|done|seen|known|taken|given|written|begun|told|said|found|heard|kept|left|made|came|went|got|had|ran|run|took|gave|saw|knew|[a-z]{2,}[^e\s]ed)\b/;
/** A capital pronoun after a lower-case word or a comma: "but He threw", "and She said". */
export const CAP_PRONOUN = /(?<=[a-z,;]) (?:He|She|It|They|His|Her|Him|Them|Their|We|Its)\b/;
/** A place said as a pronoun: "The table at her was set at eight", "Fritz lived at her, in a basket". */
export const PLACE_PRONOUN = /(?<!\b(?:look|looked|looks|looking|glance|glanced|stare|stared|staring|smile|smiled|nod|nodded|laugh|laughed|wave|waved|point|pointed|shout|shouted|wink|winked|frown|frowned|grin|grinned|turn|turned|come|came|go|went|get|got|run|ran|walk|walked|talk|talked|aim|aimed|blink|blinked|squint|squinted|it|that|this|back|up|down|over|straight|right|me|us|you|them) )\bat (?:her|him)(?=,| was\b| were\b)|\bto (?:her|him)(?= was\b)/;

export function assemblyIssues(d: BoardDeal, run: BoardRun): ClarityIssue[] {
  const c = d.kase;
  const out: ClarityIssue[] = [];
  const names = c.people.filter((x) => !x.object && x.short.length > 2);
  run.log.forEach((p, i) => {
    for (const b of p.blocks) {
      if (b.kind !== 'prose' || b.voice === 'chapter') continue;
      const text = strip(b.text);
      const w = WOULD_PAST.exec(text);
      if (w) out.push({ page: i, rule: 'assembly', detail: `would + past: “${w[0]}”` });
      const k = CAP_PRONOUN.exec(text);
      if (k) out.push({ page: i, rule: 'assembly', detail: `capital pronoun mid-sentence: “${text.slice(Math.max(0, k.index - 30), k.index + 12)}”` });
      const pl = PLACE_PRONOUN.exec(text);
      if (pl) out.push({ page: i, rule: 'assembly', detail: `a place as a pronoun: “${text.slice(Math.max(0, pl.index - 30), pl.index + 16)}”` });
      for (const s of sentencesOf(text)) {
        const bare = maskPlaces(c, s);
        for (const x of names) {
          const n = (bare.match(new RegExp(`(?<![\\w’])${esc(x.short)}(?![\\w])`, 'g')) ?? []).length;
          if (n >= 2) out.push({ page: i, rule: 'assembly', detail: `${x.short} twice in a sentence: “${s.slice(0, 120)}”` });
        }
      }
    }
  });
  return out;
}

/** The verdict's why, said of one person: never "them" for somebody the report names. */
export function verdictIssues(why: string): ClarityIssue[] {
  return /\b(?:them|they|their)\b/.test(why) ? [{ page: -1, rule: 'assembly', detail: `“them” for one person in the why: “${why}”` }] : [];
}

/** Every clarity rule over a night. */
export function clarityIssues(d: BoardDeal, run: BoardRun): ClarityIssue[] {
  return [...repeatIssues(run), ...slotIssues(run), ...continuityIssues(d, run), ...ticIssues(run), ...assemblyIssues(d, run)];
}

export type { BoardReport };
