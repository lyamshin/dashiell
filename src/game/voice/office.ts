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

/** 4. The client leaving, with the address he can be found at afterwards. */
export function clientLeavingLine(dealer: Dealer, surname: string, foundAt: string): string {
  let text = dealer.random.pick(CLIENT_LEAVING);
  text = text.split('{name}').join(surname).split('{place}').join(foundAt);
  return tidyPunctuation(text);
}
