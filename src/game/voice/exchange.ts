/**
 * The exchange (A.5). Humphrey's line, then a dialogue frame, and inside the
 * frame the fact as the person says it.
 *
 *   humphrey-lines × frames × utterances
 *
 * Register is M3's: a fixture tells the truth; a suspect delivering a clue
 * about a tick they are lying about is evading; a suspect reciting their own
 * false account is lying. Temper is the cast sheet's. `familiar` is whether
 * this person already knows him.
 *
 * The fairness rule sits here and nowhere else: **the player never loses
 * information.** An utterance only fits if it carries every slot its fact kind
 * needs, and a clue is only spoken out of the utterance deck if every fact it
 * states has one. Otherwise the clue's own sentence goes on the page — as the
 * speaker's words where the record names its source in a way that can be
 * stripped, and as the record itself where it does not — and the gap is
 * logged so the content team can see it.
 */

import type { Clue, Id, Person } from '../../gen/types.js';
import type { CaseView } from '../derive.js';
import { clueTick } from '../derive.js';
import type { Tick } from '../../gen/types.js';
import type { CastSheet, Temper } from './cast.js';
import { temperOf } from './cast.js';
import { Dealer, SCHEMA, tagIs, tagOf, type Card, type Slots } from './cards.js';
import { beatsOf, findKindOf, strippedQuote, type Beat } from './facts.js';
import { knowsHim } from './roll.js';
import { COLOUR_LINES, RECORD_LEADS } from '../voice-data.js';

export type Register = 'truth' | 'lie' | 'evasion';

const MANDATORY = (SCHEMA.decks.utterances?.mandatorySlots ?? {}) as Record<string, string[]>;

/** Which register a speaker delivers a clue in. Pure, from the schedules. */
export function registerFor(view: CaseView, speakerId: Id, clue: Clue | null): Register {
  if (!clue) return 'truth';
  const tick = clueTick(clue);
  if (tick === null) return 'truth';
  const lies = view.liesOf.get(speakerId);
  if (lies?.has(tick as Tick)) return 'evasion';
  return 'truth';
}

/** Does this utterance carry everything its fact kind has to carry? */
export function carriesFact(card: Card, kind: string): boolean {
  for (const slot of MANDATORY[kind] ?? []) {
    if (!card.text.includes(`{${slot}}`)) return false;
  }
  return true;
}

export interface SpokenClue {
  clueId: Id;
  /** What goes inside the frame's quotation marks, or the record's paragraph. */
  text: string;
  mode: 'utterance' | 'quote' | 'record';
  cardIds: string[];
}

/**
 * One clue, as speech. Tries the utterance deck first, then the record's own
 * sentence with its attribution stripped, then the record itself.
 */
export function speakClue(
  dealer: Dealer,
  view: CaseView,
  cast: CastSheet,
  clue: Clue,
  speaker: Person | undefined,
  register: Register,
  base: Slots,
  gaps: string[],
): SpokenClue {
  const temper: Temper = speaker ? temperOf(cast, speaker.id) : 'plain';
  const beats = beatsOf(view, clue);
  const cardIds: string[] = [];

  if (beats.length > 0 && beats.length <= 3) {
    const said: string[] = [];
    for (const beat of beats) {
      const drawn = utteranceFor(dealer, beat, temper, register, base);
      if (!drawn) {
        said.length = 0;
        gaps.push(`no-utterance: ${beat.kind} × ${temper} × ${register} (${clue.id})`);
        break;
      }
      cardIds.push(drawn.cardId);
      said.push(drawn.text);
    }
    if (said.length === beats.length) {
      return { clueId: clue.id, text: said.join(' '), mode: 'utterance', cardIds };
    }
  } else if (beats.length === 0) {
    gaps.push(`no-fact: ${clue.kind} (${clue.id}) states nothing structured; its own line stands`);
  } else {
    gaps.push(`too-many-facts: ${clue.kind} (${clue.id}) states ${beats.length} facts at once`);
  }

  const stripped = strippedQuote(clue, speaker);
  if (stripped !== null) return { clueId: clue.id, text: stripped, mode: 'quote', cardIds };
  return { clueId: clue.id, text: clue.text, mode: 'record', cardIds };
}

function utteranceFor(
  dealer: Dealer,
  beat: Beat,
  temper: Temper,
  register: Register,
  base: Slots,
): { text: string; cardId: string } | null {
  const slots: Slots = { ...base, ...beat.slots };
  const kindIs = (c: Card): boolean =>
    tagOf('utterances', c, 'factKind') === beat.kind && carriesFact(c, beat.kind);
  const drawn = dealer.draw(
    'utterances',
    [
      (c) => kindIs(c) && tagIs('utterances', c, 'temper', temper) && tagIs('utterances', c, 'register', register),
      (c) => kindIs(c) && tagIs('utterances', c, 'temper', temper),
      (c) => kindIs(c) && tagIs('utterances', c, 'register', register),
      kindIs,
    ],
    slots,
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/** Which of Humphrey's lines this question is. */
export type AskKind =
  | 'open'
  | 'ask-person'
  | 'ask-place'
  | 'ask-object'
  | 'ask-evening'
  | 'ask-hired'
  | 'follow-up'
  | 'close';

export function humphreyLine(
  dealer: Dealer,
  kind: AskKind,
  familiar: boolean,
  slots: Slots,
): { text: string; cardId: string } | null {
  const want = familiar ? 'yes' : 'no';
  const drawn = dealer.draw(
    'humphrey-lines',
    [
      (c) => tagIs('humphrey-lines', c, 'kind', kind) && tagIs('humphrey-lines', c, 'familiar', want),
      (c) => tagIs('humphrey-lines', c, 'kind', kind),
    ],
    slots,
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/** What the person is doing with their hands while they answer. */
export function businessLine(
  dealer: Dealer,
  person: Person | undefined,
  temper: Temper,
  slots: Slots,
  exclude: ReadonlySet<string> = new Set(),
): { text: string; cardId: string } | null {
  const role = person?.fixtureRole ?? 'suspect';
  // `business` is a free deck — it may come round again on a later page — but
  // not twice on the same one, where a reader would see it.
  const ok = (c: Card): boolean => !exclude.has(c.id);
  const drawn = dealer.draw(
    'business',
    [
      (c) => ok(c) && tagIs('business', c, 'role', role) && tagIs('business', c, 'temper', temper),
      (c) => ok(c) && tagIs('business', c, 'role', role),
      (c) => ok(c) && tagIs('business', c, 'temper', temper),
      ok,
    ],
    slots,
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

export interface Answer {
  /** The finished paragraph: frame, business and the fact inside it. */
  text: string;
  mode: SpokenClue['mode'];
  cardIds: string[];
}

/**
 * Wrap what was said in a dialogue frame. A record-mode line never goes inside
 * quotation marks — the generator writes those sentences *about* the speaker,
 * and quoting them would put words in a man's mouth he did not say.
 */
export function frameAnswer(
  dealer: Dealer,
  spoken: SpokenClue,
  person: Person | undefined,
  temper: Temper,
  register: Register,
  familiar: boolean,
  slots: Slots,
  humphrey: string,
  exclude: ReadonlySet<string> = new Set(),
): Answer {
  const cardIds = [...spoken.cardIds];
  const business = businessLine(dealer, person, temper, slots, exclude);
  if (business) cardIds.push(business.cardId);
  const colour = COLOUR_LINES[dealer.random.int(COLOUR_LINES.length)] as string;

  if (spoken.mode === 'record') {
    const lead = RECORD_LEADS[dealer.random.int(RECORD_LEADS.length)] as string;
    const head = business ? `${business.text} ` : '';
    return { text: `${head}${lead} ${spoken.text}`, mode: spoken.mode, cardIds };
  }

  const want = familiar ? 'yes' : 'no';
  const frame = dealer.draw(
    'frames',
    [
      (c) =>
        tagIs('frames', c, 'register', register) &&
        tagIs('frames', c, 'temper', temper) &&
        tagIs('frames', c, 'familiar', want),
      (c) => tagIs('frames', c, 'register', register) && tagIs('frames', c, 'temper', temper),
      (c) => tagIs('frames', c, 'register', register),
      (c) => tagIs('frames', c, 'temper', temper),
    ],
    {
      ...slots,
      fact: spoken.text,
      business: business?.text ?? '',
      colour,
      humphrey,
    },
  );
  if (!frame) {
    const head = business ? `${business.text} ` : '';
    return { text: `${head}“${spoken.text}”`, mode: spoken.mode, cardIds };
  }
  cardIds.push(frame.cardId);
  return { text: frame.text.replace(/\s{2,}/g, ' ').trim(), mode: spoken.mode, cardIds };
}

/** Which of Humphrey's line kinds a topic asks for. */
export function askKindOf(topicKind: string): AskKind {
  switch (topicKind) {
    case 'person':
      return 'ask-person';
    case 'place':
      return 'ask-place';
    case 'object':
      return 'ask-object';
    case 'evening':
      return 'ask-evening';
    case 'hire':
      return 'ask-hired';
    default:
      return 'ask-person';
  }
}

export { findKindOf, knowsHim };
