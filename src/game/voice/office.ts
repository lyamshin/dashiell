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
  speech: string[];
  /** The last of it — the pointer — which the hiring frame carries. */
  close: string[];
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
  const head = briefing.filter((line) => line.speaker === 'narration').map((line) => line.text);
  const body = briefing
    .filter((line) => line.speaker === 'client')
    .map((line) => line.spoken ?? line.text);
  // The pointer and its reason are the last two, and they are the job.
  const closeFrom = Math.max(0, body.length - 2);
  return {
    entrance: familiar ? null : (head[0] ?? null),
    narration: head.slice(1),
    speech: body.slice(0, closeFrom),
    close: body.slice(closeFrom),
  };
}

/**
 * The client's sentences, in paragraphs, as things they said out loud. Three
 * to a paragraph: sixteen plain sentences in one block of quotation marks is a
 * deposition, and four paragraphs of three or four is somebody talking.
 */
export function speechParagraphs(lines: string[], per = 3): string[] {
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
