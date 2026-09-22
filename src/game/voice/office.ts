/**
 * The office (M4b §B). A private eye's case starts at his desk when somebody
 * comes in to hire him, and he always knows what the job pays.
 *
 * This file is the three cards of page one — the office at this hour, the
 * entrance, the hiring — and the two lines that end the client's visit. The
 * place itself is built in `derive.ts`, because it is a seventh room and not a
 * piece of prose; the page grammar in `page.ts` lays these out.
 *
 * All three decks are §B.4's and all three may be absent while the content
 * branch is writing them, so every one of them has a hand-written fallback
 * here and every fallback logs a gap. The engine runs before the decks land.
 */

import { Rng } from '../../gen/rng.js';
import { PRECINCT_TEXT } from '../../gen/victim.js';
import type { CaseView } from '../derive.js';
import {
  CLIENT_LEAVING,
  ENTRANCE_LINES,
  HIRING_LINES,
  OFFICE_LINES,
  RETAINERS,
} from '../voice-data.js';
import { Dealer, tagIs, type Slots } from './cards.js';
import type { MotifContext } from './motifs.js';
import { tidyPunctuation } from './prose.js';
import type { Temper } from './cast.js';
import type { Circumstance, Weather } from './roll.js';

/** What the retainer looks like on the desk, by the client's class (§B.2.3). */
export function retainerFor(klass: string): string {
  return RETAINERS[klass] ?? (RETAINERS.working as string);
}

export interface OfficeLine {
  text: string;
  motifs: string[];
  score: number;
  /** Set when the deck was missing and a hand-written line stood in. */
  gap: string | null;
}

function handwritten(pool: string[], rng: Rng, slots: Slots, deck: string): OfficeLine {
  let text = rng.pick(pool);
  for (const [k, v] of Object.entries(slots)) {
    if (v === undefined) continue;
    text = text.split(`{${k}}`).join(v);
  }
  return {
    text: tidyPunctuation(text.replace(/\{[a-z]+\}/g, '')),
    motifs: [],
    score: 0,
    gap: `missing-deck: ${deck} is not written yet; a hand-written line stood in`,
  };
}

/** 1. The office at this hour, by circumstance and weather. */
export function officeCard(
  dealer: Dealer,
  circumstance: Circumstance,
  weather: Weather,
  slots: Slots,
  ctx: MotifContext,
): OfficeLine {
  const drawn = dealer.draw(
    'office',
    [
      (c) => tagIs('office', c, 'circumstance', circumstance) && tagIs('office', c, 'weather', weather),
      (c) => tagIs('office', c, 'circumstance', circumstance),
      (c) => tagIs('office', c, 'weather', weather),
    ],
    slots,
    false,
    ctx,
  );
  if (drawn) return { text: drawn.text, motifs: drawn.motifs, score: drawn.score, gap: null };
  return handwritten(OFFICE_LINES, dealer.random, slots, 'office');
}

export interface ClientFacts {
  temper: Temper;
  klass: string;
  gender: 'm' | 'f' | 'any';
  familiar: boolean;
}

/** 2. The entrance, by the client's temper, class and gender. */
export function entranceCard(
  dealer: Dealer,
  client: ClientFacts,
  weather: Weather,
  slots: Slots,
  ctx: MotifContext,
): OfficeLine {
  const want = client.familiar ? 'yes' : 'no';
  // Gender is a filter and not a rung, as it is for business: a card that says
  // "she" is wrong on a man however well the rest of it fits.
  const ok = (c: Parameters<typeof tagIs>[1]): boolean =>
    client.gender === 'any' || tagIs('entrances', c, 'gender', client.gender);
  const drawn = dealer.draw(
    'entrances',
    [
      (c) =>
        ok(c) &&
        tagIs('entrances', c, 'temper', client.temper) &&
        tagIs('entrances', c, 'class', client.klass) &&
        tagIs('entrances', c, 'familiar', want),
      (c) =>
        ok(c) && tagIs('entrances', c, 'temper', client.temper) && tagIs('entrances', c, 'class', client.klass),
      (c) => ok(c) && tagIs('entrances', c, 'class', client.klass),
      (c) => ok(c) && tagIs('entrances', c, 'temper', client.temper),
      (c) => ok(c),
    ],
    slots,
    true,
    ctx,
  );
  void weather;
  if (drawn) return { text: drawn.text, motifs: drawn.motifs, score: drawn.score, gap: null };
  return handwritten(ENTRANCE_LINES, dealer.random, slots, 'entrances');
}

/**
 * 3. The hiring. One frame, carrying the client's own clue in `{fact}` and the
 * money in `{retainer}`. A hiring card with no `{fact}` in it does not fit —
 * the clue is the job, and the page has to say it.
 */
export function hiringFrame(
  dealer: Dealer,
  client: ClientFacts,
  slots: Slots,
  ctx: MotifContext,
): OfficeLine {
  const want = client.familiar ? 'yes' : 'no';
  const drawn = dealer.draw(
    'hiring',
    [
      (c) =>
        c.text.includes('{fact}') &&
        tagIs('hiring', c, 'temper', client.temper) &&
        tagIs('hiring', c, 'familiar', want),
      (c) => c.text.includes('{fact}') && tagIs('hiring', c, 'temper', client.temper),
      (c) => c.text.includes('{fact}'),
    ],
    slots,
    true,
    ctx,
  );
  if (drawn) return { text: drawn.text, motifs: drawn.motifs, score: drawn.score, gap: null };
  return handwritten(HIRING_LINES, dealer.random, slots, 'hiring');
}

/* ------------------------------------------------------------------ *
 * M5 §2 — the briefing, split into who said what.
 * ------------------------------------------------------------------ */

/**
 * What one of the client's sentences is *about*, so the page knows what
 * question to put in front of it (the golden loop, §3).
 *
 * The generator writes the briefing in a fixed order out of fields the engine
 * can read back — the victim's standing, the trope's givens, the discovery and
 * what the precinct did with it, the client's tie and its backstory, the
 * purpose and what it costs them, the pointer and its reason. Rather than
 * count positions, which would go wrong the first time a case has no body to
 * discover, each sentence is matched against the field it came out of. A
 * sentence that matches nothing is `other` and rides along with its neighbour.
 */
export type BriefingTopic =
  | 'standing'
  | 'given'
  | 'discovery'
  | 'precinct'
  | 'tie'
  | 'backstory'
  | 'purpose'
  | 'cost'
  | 'pointer'
  | 'reason'
  | 'other';

export interface SpokenLine {
  topic: BriefingTopic;
  text: string;
  /**
   * §A.1's question, when the generator wrote one for this sentence. A line
   * with a prompt opens a turn; a line without one runs on inside the turn it
   * arrived in, because the client is still talking.
   */
  prompt?: string;
  /** §A.2's split form, for a page whose short-sentence share is low. */
  breath?: string[];
}

export interface BriefingSplit {
  /**
   * The first sentence: a woman came up the stairs after midnight. Dashiell's,
   * and null when the roll says he knows her, because then the entrance card
   * has already said it, better and with a name in it.
   */
  entrance: string | null;
  /** The rest of what he saw: who she is, and what she does for money. */
  narration: string[];
  /**
   * What she said, in her own words: the standing, the givens, the tie, the
   * purpose. The first person where the sentence is about her.
   */
  speech: SpokenLine[];
  /** The last of it — the pointer — which the hiring frame carries. */
  close: string[];
  /** §A.1's question for the pointer, asked in front of the hiring frame. */
  closePrompt: string | null;
}

/** One space between sentences and one full stop, as the generator tidies. */
function tidyLine(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Every briefing sentence the case's own fields account for, by topic. */
export function briefingTopics(view: CaseView): Map<string, BriefingTopic> {
  const kase = view.kase;
  const bio = kase.victimBio;
  const brief = kase.clientBrief;
  const client = view.client;
  const out = new Map<string, BriefingTopic>();
  const put = (topic: BriefingTopic, text: string | undefined): void => {
    const key = tidyLine(text ?? '');
    if (key.length > 0 && !out.has(key)) out.set(key, topic);
  };
  put('standing', bio.standing);
  for (const given of kase.act.givens.text) put('given', given);
  if (bio.discovery) {
    put('discovery', bio.discovery.foundText);
    put('precinct', PRECINCT_TEXT[bio.discovery.precinct]);
  }
  if (bio.lastSeen) put('discovery', bio.lastSeen.text);
  const tie = client.dossier?.tie;
  if (tie) {
    put('tie', `${client.surname} is ${tie.text}.`);
    put('backstory', tie.backstory);
  }
  put('purpose', brief.purposeText);
  put('cost', brief.cost);
  const pointed = view.personById.get(brief.points.personId);
  put('pointer', `${client.surname} wants us to start with ${pointed?.surname ?? ''}.`);
  put('reason', `${brief.points.reason}.`);
  return out;
}

export interface BriefingTurn {
  /** §A.1's question, or null where the client simply goes on talking. */
  prompt: string | null;
  lines: SpokenLine[];
}

/**
 * How many of Dashiell's lines page one is allowed (§B.1).
 *
 * The golden has four and two of them are not questions. The engine had eight
 * on a long case, because it put a prod at every paragraph break and a
 * question in front of every group — which is a questionnaire, and a reader
 * feels the form underneath it. Three, and they are the generator's prompts:
 * the discovery, the purpose, the pointer. "Sit down." takes the third only
 * when the briefing has left one.
 */
export const BRIEFING_ASK_CAP = 3;

/**
 * The client's sentences grouped into turns, one per question.
 *
 * The generator says which sentences are questionable: a prompt is written
 * beside the sentence it asks for and nowhere else. A turn therefore begins
 * wherever a prompt does, and everything after it — the precinct, the cost,
 * the backstory — runs on inside that turn, because nobody asked and she has
 * not stopped talking. The first turn has no question at all: it is what she
 * came up the stairs to say.
 */
export function briefingTurns(
  speech: readonly SpokenLine[],
  cap = BRIEFING_ASK_CAP,
): BriefingTurn[] {
  const turns: BriefingTurn[] = [];
  let asked = 0;
  for (const line of speech) {
    const prompt = line.prompt !== undefined && line.prompt.length > 0 && asked < cap
      ? line.prompt
      : null;
    if (prompt !== null || turns.length === 0) {
      if (prompt !== null) asked++;
      turns.push({ prompt: turns.length === 0 ? null : prompt, lines: [] });
      // The first thing she says is what she came to say; nobody asks for it,
      // and a prompt that lands on it is spent rather than printed.
      if (turns.length === 1 && prompt !== null) asked--;
    }
    (turns[turns.length - 1] as BriefingTurn).lines.push(line);
  }
  return turns;
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.1 — the beat budget.
 * ------------------------------------------------------------------ */

/**
 * How many interstitial beats a page may spend.
 *
 * An interstitial beat is a line of narration between two blocks of speech:
 * "She went straight on.", "I said nothing.", "I let her sit with it." One is
 * a pause; five are a tic, and seed 3's page one had five. The golden has two
 * on its office page — "I knew it." after the standing, and "She let that sit."
 * after a one-word answer — and both of them are about something.
 *
 * One a page, two where the page is long enough to have a middle: four or more
 * exchanges, counting the client's turns and the close.
 */
export const BEAT_BUDGET_BASE = 1;
export const BEAT_BUDGET_LONG = 2;
export const BEAT_BUDGET_EXCHANGES = 4;

/** A client answer this short is the golden's "Collecting." and earns a beat. */
export const SHORT_ANSWER_WORDS = 4;

export function beatBudget(exchanges: number): number {
  return exchanges >= BEAT_BUDGET_EXCHANGES ? BEAT_BUDGET_LONG : BEAT_BUDGET_BASE;
}

/**
 * Which beat goes where: what he registers, and what she sits with.
 *
 *   `ack`   Dashiell taking a fact without comment — the golden's "I knew it."
 *   `pause` the client stopping — the golden's "She let that sit."
 */
export type BeatKind = 'ack' | 'pause';

export interface BeatPlacement {
  /** The index of the turn this beat follows. */
  after: number;
  kind: BeatKind;
}

/** The words of a spoken line, for the one-word-answer rule. */
function wordsIn(text: string): number {
  const bare = text.replace(/[“”"]/g, '').trim();
  return bare.length === 0 ? 0 : bare.split(/\s+/).length;
}

/**
 * The beats a briefing has earned, best first and then in page order.
 *
 * Two rules, and they are both refusals.
 *
 * **Never between two consecutive client turns.** A beat there is the page
 * apologising for a paragraph break: she was not interrupted, nobody asked
 * her anything, and "She went straight on." says only what the quotation
 * marks already say. Those turns join with the attribution move — "…," she
 * said. "…" — or they simply run on. So a position is legal only when what
 * follows it is one of Dashiell's lines.
 *
 * **Only where the content earns a pause.** Three things earn one: a one-word
 * answer (the golden's "Collecting."), the purpose or the pointer — the two
 * questions a client answers slowly, because both of them are about what she
 * wants rather than about what happened — and the first turn, which is the one
 * he already knew the half of.
 */
export function planBeats(
  turns: readonly BriefingTurn[],
  opts: { closeIsSpeech: boolean; closePrompt: string | null },
): BeatPlacement[] {
  const exchanges = turns.length + (opts.closeIsSpeech ? 1 : 0);
  const budget = beatBudget(exchanges);
  if (budget === 0 || turns.length === 0) return [];
  /** Is the next thing on the page one of Dashiell's lines rather than hers? */
  const asked = (i: number): boolean => {
    const next = turns[i + 1];
    if (next !== undefined) return next.prompt !== null;
    // After the last turn comes the close, which the pointer's question opens.
    return opts.closeIsSpeech ? opts.closePrompt !== null : false;
  };
  const candidates: { at: BeatPlacement; rank: number }[] = [];
  for (const [i, turn] of turns.entries()) {
    if (!asked(i)) continue;
    const last = turn.lines[turn.lines.length - 1];
    if (last !== undefined && wordsIn(last.text) <= SHORT_ANSWER_WORDS) {
      candidates.push({ at: { after: i, kind: 'pause' }, rank: 0 });
      continue;
    }
    const topic = turn.lines[0]?.topic;
    if (topic === 'purpose' || topic === 'pointer' || topic === 'cost') {
      candidates.push({ at: { after: i, kind: 'pause' }, rank: 1 });
      continue;
    }
    if (i === 0) candidates.push({ at: { after: i, kind: 'ack' }, rank: 2 });
  }
  return candidates
    .sort((a, b) => a.rank - b.rank || a.at.after - b.at.after)
    .slice(0, budget)
    .sort((a, b) => a.at.after - b.at.after)
    .map((c) => c.at);
}

/**
 * The rule set, and the generator now carries it.
 *
 * Every sentence of `case.briefing` says who it belongs to and, when it is the
 * client's, what they actually say — the first person where the sentence is
 * about them, the same words where it is about somebody else. The engine used
 * to find the seam by matching the victim's standing and then apologise for
 * the register with a line of narration; it now reads `speaker` and prints
 * `spoken`.
 */
export function splitBriefing(view: CaseView, familiar: boolean): BriefingSplit {
  const briefing = view.kase.briefing;
  const topics = briefingTopics(view);
  const head = briefing.filter((line) => line.speaker === 'narration').map((line) => line.text);
  const body: SpokenLine[] = briefing
    .filter((line) => line.speaker === 'client')
    .map((line) => ({
      topic: topics.get(tidyLine(line.text)) ?? 'other',
      text: line.spoken ?? line.text,
      ...(line.prompt === undefined ? {} : { prompt: line.prompt }),
      ...(line.breath === undefined ? {} : { breath: line.breath }),
    }));
  // The pointer and its reason are the last two, and they are the job.
  const closeFrom = Math.max(0, body.length - 2);
  const close = body.slice(closeFrom);
  return {
    entrance: familiar ? null : (head[0] ?? null),
    narration: head.slice(1),
    speech: body.slice(0, closeFrom),
    close: close.map((line) => line.text),
    closePrompt: close.find((line) => line.prompt !== undefined)?.prompt ?? null,
  };
}

/**
 * The client's sentences, in paragraphs, as things they said out loud. Three
 * to a paragraph: sixteen plain sentences in one block of quotation marks is a
 * deposition, and four paragraphs of three or four is somebody talking.
 *
 * §B.3: where the page is short of short sentences, a line goes in as the
 * breath form the generator wrote for it — "I found him. Half past eleven, in
 * his rooms." — which carries the same facts in three breaths instead of one.
 */
export function speechParagraphs(
  lines: readonly (string | SpokenLine)[],
  per = 3,
  breath = false,
  attribution?: string,
  /**
   * Hone 2 §A.1. Which paragraph of the turn carries the attribution.
   *
   * Zero is the head of the turn, which is where the golden puts it when the
   * turn is one paragraph long. A turn that runs to two takes it at the seam
   * instead: that is the join the beat used to stand in for, and "…," she
   * said. "…" does the work the beat was doing without narrating a pause
   * nobody took.
   */
  attributeAt = 0,
): string[] {
  const said = lines.map((line) => {
    if (typeof line === 'string') return line;
    const split = line.breath ?? [];
    return breath && split.length > 1 ? split.join(' ') : line.text;
  });
  const out: string[] = [];
  for (let i = 0; i < said.length; i += per) {
    const chunk = said.slice(i, i + per).join(' ').trim();
    if (chunk.length === 0) continue;
    if (out.length === attributeAt && attribution !== undefined && attribution.length > 0) {
      const broken = attributed(chunk, attribution);
      if (broken !== null) {
        out.push(broken);
        continue;
      }
    }
    out.push(`“${chunk}”`);
  }
  return out;
}

/**
 * The golden's own move: "I found him," she said. "Half past eleven, in his
 * rooms." One turn, two sets of quotation marks, with who is talking said
 * once in the middle of it where it holds nothing up.
 *
 * It needs two sentences to work on, and it will not break one that ends in a
 * question or an exclamation, because neither of those becomes a clause in
 * front of "she said". Null when the turn has nothing to break.
 */
export function attributed(chunk: string, attribution: string): string | null {
  const at = chunk.search(/(?<=[.])\s+(?=[A-Z“"])/);
  if (at < 0) return null;
  const head = chunk.slice(0, at).trim().replace(/\.$/, '');
  const tail = chunk.slice(at).trim();
  if (head.length === 0 || tail.length === 0) return null;
  return `“${head},” ${attribution}. “${tail}”`;
}

/** 4. The client leaving, with the address he can be found at afterwards. */
export function clientLeavingLine(dealer: Dealer, surname: string, foundAt: string): string {
  let text = dealer.random.pick(CLIENT_LEAVING);
  text = text.split('{name}').join(surname).split('{place}').join(foundAt);
  return tidyPunctuation(text);
}
