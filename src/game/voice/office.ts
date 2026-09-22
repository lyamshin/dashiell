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
import type { BriefingAsk } from './plain.js';
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

/**
 * The client's sentences grouped into turns, with the question that belongs in
 * front of each. One turn a subject: what happened, how it was found, where
 * she comes into it, what she wants. The first turn gets no question — she
 * came here to say it — and the pointer is not here at all, because the hiring
 * frame carries it.
 */
export interface BriefingTurn {
  ask: BriefingAsk | null;
  lines: string[];
}

const TURN_OF: Record<BriefingTopic, number> = {
  standing: 0,
  given: 0,
  discovery: 1,
  precinct: 1,
  tie: 2,
  backstory: 2,
  purpose: 3,
  cost: 3,
  pointer: 3,
  reason: 3,
  other: -1,
};

const ASK_OF: (BriefingAsk | null)[] = [null, 'discovery', 'tie', 'purpose'];

export function briefingTurns(speech: readonly SpokenLine[]): BriefingTurn[] {
  const turns: BriefingTurn[] = [];
  let current = -1;
  for (const line of speech) {
    const want = TURN_OF[line.topic];
    // A sentence the fields do not account for belongs to the turn it arrived
    // in, not to a turn of its own: the order is the generator's and it is the
    // order she said them in.
    const index = want < 0 ? Math.max(0, current) : want;
    if (index !== current || turns.length === 0) {
      turns.push({ ask: ASK_OF[index] ?? null, lines: [] });
      current = index;
    }
    (turns[turns.length - 1] as BriefingTurn).lines.push(line.text);
  }
  // The first thing she says is what she came to say; nobody asks for it.
  const first = turns[0];
  if (first) first.ask = null;
  return turns;
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
  const body = briefing
    .filter((line) => line.speaker === 'client')
    .map((line) => ({
      topic: topics.get(tidyLine(line.text)) ?? 'other',
      text: line.spoken ?? line.text,
    }));
  // The pointer and its reason are the last two, and they are the job.
  const closeFrom = Math.max(0, body.length - 2);
  return {
    entrance: familiar ? null : (head[0] ?? null),
    narration: head.slice(1),
    speech: body.slice(0, closeFrom),
    close: body.slice(closeFrom).map((line) => line.text),
  };
}

/**
 * The client's sentences, in paragraphs, as things they said out loud. Three
 * to a paragraph: sixteen plain sentences in one block of quotation marks is a
 * deposition, and four paragraphs of three or four is somebody talking.
 */
export function speechParagraphs(lines: readonly string[], per = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += per) {
    const chunk = lines.slice(i, i + per).join(' ').trim();
    if (chunk.length > 0) out.push(`“${chunk}”`);
  }
  return out;
}

/** 4. The client leaving, with the address he can be found at afterwards. */
export function clientLeavingLine(dealer: Dealer, surname: string, foundAt: string): string {
  let text = dealer.random.pick(CLIENT_LEAVING);
  text = text.split('{name}').join(surname).split('{place}').join(foundAt);
  return tidyPunctuation(text);
}
