/**
 * The exchange (A.5). Dashiell's line, then a dialogue frame, and inside the
 * frame the fact as the person says it.
 *
 *   dashiell-lines × frames × utterances
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
import { genderHintOf, temperOf } from './cast.js';
import { Dealer, SCHEMA, knowsTheDetective, tagIs, tagOf, type Card, type Slots } from './cards.js';
import { bodyConflict, readMotifs, type MotifContext } from './motifs.js';
import { beatsOf, findKindOf, strippedQuote, type Beat } from './facts.js';
import { countSentences, deckKnows, plainBeat } from './plain.js';
import { knowsHim } from './roll.js';
import { COLOUR_LINES, RECORD_LEADS } from '../voice-data.js';
import { PLAIN_LEADS } from './plain.js';
import { tidyPunctuation } from './prose.js';

export type Register = 'truth' | 'lie' | 'evasion';

/**
 * Stand-ins put into a frame's `{business}` and `{colour}` slots while it is
 * dealt, so each occurrence can be given a card of its own afterwards. A
 * frame that asks for business twice means two gestures, not one gesture
 * printed twice. Control characters: nothing in any deck contains them, and
 * they never survive the function.
 */
const BUSINESS_MARK = 'business';
const COLOUR_MARK = 'colour';

/**
 * How a digression gets onto the page (the colour beat).
 *
 * A yapper's aside is something the *person* said, and half the frames set the
 * `{colour}` slot down outside the quotation marks, where it arrived as a
 * sentence attached to nobody: "'Vitale turned up at Mrs. Teague's near 9:00
 * PM.' A dog got into the bakery Tuesday and came out white to the shoulders."
 * That is narration, in the detective's own voice, about a dog he never saw.
 *
 * Outside the quotes it is framed: as the speaker's aside inside quotation
 * marks, or reported, with the person's gender on it. A frame that already has
 * the slot inside its own quotation marks needs none of this, because the line
 * is already in the speaker's mouth where the writer put it.
 */
export const COLOUR_FRAMES: string[] = [
  '“{colour}”',
  '{Pronoun} got onto something else for a minute: {colour}',
  '{Pronoun} told me, unasked, that {colour}',
];

/** Is the text that follows this much of a line inside quotation marks? */
export function insideQuotes(before: string): boolean {
  let curly = 0;
  let straight = 0;
  for (const ch of before) {
    if (ch === '“') curly++;
    else if (ch === '”') curly--;
    else if (ch === '"') straight++;
  }
  return curly > 0 || straight % 2 === 1;
}

/**
 * Words a sentence opens on that are capitalised only because the sentence is.
 * A reported beat puts the line mid-sentence, so those go back down; anything
 * else keeping a capital is a name, and a name keeps it.
 */
const SENTENCE_OPENERS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'they',
  'there',
  'that',
  'this',
  'it',
  'he',
  'she',
  'his',
  'her',
  'their',
  'somebody',
  'nobody',
  'everybody',
  'one',
  'two',
  'some',
  'every',
  'most',
  'half',
  'people',
  'when',
  'after',
  'before',
  'since',
  'if',
  'down',
  'up',
  'over',
  'across',
  'out',
]);

/** The colour beat, set down as something the person being asked said. */
export function frameColour(line: string, template: string, gender: 'm' | 'f' | 'any'): string {
  const quoted = template.startsWith('“');
  const first = /^([A-Z][A-Za-z']*)/.exec(line)?.[1];
  const lowered =
    quoted || first === undefined || !SENTENCE_OPENERS.has(first.toLowerCase())
      ? line
      : `${line.charAt(0).toLowerCase()}${line.slice(1)}`;
  return template
    .split('{Pronoun}')
    .join(gender === 'f' ? 'She' : 'He')
    .split('{colour}')
    .join(lowered);
}

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

/**
 * M8: can this utterance say a span in its `{time}`? A span brings its own
 * preposition ("from ten until half past"), so the slot has to stand free:
 * at the head of the card or after a comma or a stop, and followed by one.
 * "By {time}", "around {time}", "{time} on" take one hour and only one.
 */
export function takesSpan(text: string): boolean {
  const at = text.indexOf('{time}');
  if (at < 0) return true;
  const before = text.slice(0, at);
  const after = text.slice(at + '{time}'.length);
  const free = before.length === 0 || /[,.?:;]\s*$/.test(before);
  return free && /^[,.?!;]/.test(after);
}

/**
 * M8: a placement said as a list with no verb — "{subject}, {place}, {time}.
 * Gone before the next round." — reads as a broken sentence once a place
 * with a street in it and a span are in it. The golden's short answers have a
 * verb or stand whole ("At the walk-up on Ninth. From ten until half past.").
 */
export function verblessPlacement(text: string): boolean {
  return /\{subject\},\s*\{place\}/.test(text) || /^\{time\}\.\s*\{place\}\./.test(text);
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
  /**
   * The rest of what the same clue states, one utterance each.
   *
   * A clue that establishes two facts used to come out as both utterances
   * concatenated inside one frame — "Vitale came into Mrs. Teague's around
   * 9:00 PM and stayed a while. Somebody was moving around in there past 9:00
   * PM. Alive, I'd say." — which is two answers read as one breath. The page
   * grammar puts a follow-up between them instead: the primary fact answers
   * the question, and the second is something Dashiell had to ask again for.
   */
  rest: string[];
  /**
   * `plain` is M5 §1's third job: the utterance deck had no card for this fact
   * — because the fact is a robbery's or a disappearance's, and every card for
   * it is about a corpse — so the fact is said plainly in the detective's own
   * voice instead of the flat record being dropped on the page.
   */
  mode: 'utterance' | 'quote' | 'record' | 'plain';
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
    let plainOnly = false;
    for (const beat of beats) {
      // §1: a fact kind the deck does not know for this case type is not a
      // missing card, it is a card that would be a lie. Say it plainly.
      if (!deckKnows(view, beat.kind)) {
        plainOnly = true;
        break;
      }
      const drawn = utteranceFor(dealer, beat, temper, register, base);
      if (!drawn) {
        said.length = 0;
        gaps.push(`no-utterance: ${beat.kind} × ${temper} × ${register} (${clue.id})`);
        break;
      }
      cardIds.push(drawn.cardId);
      said.push(drawn.text);
    }
    if (plainOnly) {
      const lines = beats.map((b) => plainBeat(view, b)).filter((t) => t.length > 0);
      if (lines.length > 0) {
        gaps.push(
          `plain-register: ${view.kase.act.type} has no utterance for ${beats
            .map((b) => b.kind)
            .join(', ')} (${clue.id}); the plain register said it`,
        );
        return {
          clueId: clue.id,
          text: lines[0] as string,
          rest: lines.slice(1),
          mode: 'plain',
          cardIds,
        };
      }
    }
    if (said.length === beats.length) {
      // `beatsOf` has already put the placement first: where somebody was
      // comes before what it means, and the first beat is the answer to the
      // question that was actually asked.
      return {
        clueId: clue.id,
        text: said[0] as string,
        rest: said.slice(1),
        mode: 'utterance',
        cardIds,
      };
    }
  } else if (beats.length === 0) {
    gaps.push(`no-fact: ${clue.kind} (${clue.id}) states nothing structured; its own line stands`);
  } else {
    gaps.push(`too-many-facts: ${clue.kind} (${clue.id}) states ${beats.length} facts at once`);
  }

  const stripped = strippedQuote(clue, speaker);
  if (stripped !== null)
    return { clueId: clue.id, text: stripped, rest: [], mode: 'quote', cardIds };
  return { clueId: clue.id, text: clue.text, rest: [], mode: 'record', cardIds };
}

function utteranceFor(
  dealer: Dealer,
  beat: Beat,
  temper: Temper,
  register: Register,
  base: Slots,
): { text: string; cardId: string } | null {
  // An utterance reports a fact, so every slot in it belongs to that fact and
  // to nothing else. The page's own slots — the room they are standing in, the
  // person being spoken to, the tick the page opened on — would quietly turn a
  // true sentence into a false one, so only {detective} survives from them.
  const slots: Slots = { detective: base.detective, ...beat.slots };
  const kindIs = (c: Card): boolean =>
    tagOf('utterances', c, 'factKind') === beat.kind &&
    carriesFact(c, beat.kind) &&
    (beat.span !== true || takesSpan(c.text)) &&
    !verblessPlacement(c.text);
  const drawn = dealer.draw(
    'utterances',
    // A written card before a placeholder, at every rung (M8: the placeholders
    // are the ones that claim habits nobody established — "same as any night").
    ((rungs: ((c: Card) => boolean)[]) => [
      ...rungs.map((r) => (c: Card) => r(c) && c.status !== 'placeholder'),
      ...rungs,
    ])([
      (c) => kindIs(c) && tagIs('utterances', c, 'temper', temper) && tagIs('utterances', c, 'register', register),
      (c) => kindIs(c) && tagIs('utterances', c, 'temper', temper),
      (c) => kindIs(c) && tagIs('utterances', c, 'register', register),
      kindIs,
    ]),
    slots,
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/** Which of Dashiell's lines this question is. */
export type AskKind =
  | 'open'
  | 'ask-person'
  | 'ask-place'
  | 'ask-object'
  | 'ask-evening'
  | 'ask-hired'
  | 'follow-up'
  | 'close';

export function dashiellLine(
  dealer: Dealer,
  kind: AskKind,
  familiar: boolean,
  slots: Slots,
  opts: {
    /**
     * docs/26: what the answer tells about the one asked after — where they
     * were (`where`), or whether the witness knows them (`who`) — so that
     * "What's Renfro to you?" is never answered with where Renfro was.
     */
    asks?: 'where' | 'who';
    /**
     * docs/26: a line that takes something for granted that is not so here —
     * the witness at the place (`there`), the thing in hand (`held`).
     */
    avoid?: 'there' | 'held';
  } = {},
): { text: string; cardId: string } | null {
  const want = familiar ? 'yes' : 'no';
  const { asks, avoid } = opts;
  const fits = (c: Parameters<typeof tagIs>[1]): boolean =>
    (asks === undefined || tagIs('dashiell-lines', c, 'asks', asks)) &&
    (avoid === undefined || tagOf('dashiell-lines', c, 'presumes') !== avoid);
  const drawn = dealer.draw(
    'dashiell-lines',
    [
      (c) => tagIs('dashiell-lines', c, 'kind', kind) && tagIs('dashiell-lines', c, 'familiar', want) && fits(c),
      (c) => tagIs('dashiell-lines', c, 'kind', kind) && fits(c),
      (c) => tagIs('dashiell-lines', c, 'kind', kind) && tagIs('dashiell-lines', c, 'familiar', want) && (avoid === undefined || tagOf('dashiell-lines', c, 'presumes') !== avoid),
      (c) => tagIs('dashiell-lines', c, 'kind', kind),
    ],
    slots,
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/**
 * M11 §A.3: the question that asks somebody about their life — plain, and by
 * the kind of person they are: "How long have you had the house?" for a
 * landlady, "What's your line?" for anybody. Null where the deck has none.
 */
export function selfQuestion(
  dealer: Dealer,
  person: { kind: string; fixtureRole?: string; archetypeId?: string },
  family: string,
  familiar: boolean,
): { text: string; cardId: string } | null {
  const want = familiar ? 'yes' : 'no';
  const role = person.kind === 'fixture' ? (person.fixtureRole ?? 'any') : 'any';
  const is = (c: Parameters<typeof tagIs>[1]): boolean => tagIs('dashiell-lines', c, 'kind', 'ask-self');
  const roleIs = (c: Parameters<typeof tagIs>[1]): boolean => tagOf('dashiell-lines', c, 'role') === role;
  const familyIs = (c: Parameters<typeof tagIs>[1]): boolean => tagOf('dashiell-lines', c, 'family') === family;
  const anyRole = (c: Parameters<typeof tagIs>[1]): boolean => (tagOf('dashiell-lines', c, 'role') ?? 'any') === 'any';
  const drawn = dealer.draw(
    'dashiell-lines',
    [
      (c) => is(c) && role !== 'any' && roleIs(c) && tagIs('dashiell-lines', c, 'familiar', want),
      (c) => is(c) && familyIs(c) && anyRole(c) && tagIs('dashiell-lines', c, 'familiar', want),
      (c) => is(c) && tagOf('dashiell-lines', c, 'family') === 'any' && tagIs('dashiell-lines', c, 'familiar', want),
      (c) => is(c) && tagOf('dashiell-lines', c, 'family') === 'any',
    ],
    {},
    true,
  );
  return drawn ? { text: drawn.text, cardId: drawn.cardId } : null;
}

/**
 * What the person is doing with their hands while they answer.
 *
 * Role first, temper second, and never another fixture's role. A landlady
 * keeping the rag going over the same six inches of counter is a bartender's
 * card on a landlady, which is what the old temper-only rung produced: the
 * props are the role, and swapping them swaps the person.
 *
 * The only widening is onto cards tagged `role: any`, which are written to
 * belong to nobody in particular. A suspect's generic role is `suspect`
 * already, so that is where a suspect starts; a fixture with an empty role
 * gets no business at all and says so in the gap log.
 */
export function businessLine(
  dealer: Dealer,
  person: Person | undefined,
  temper: Temper,
  slots: Slots,
  exclude: ReadonlySet<string> = new Set(),
  gaps?: string[],
  ctx?: MotifContext,
  /**
   * Hone 2 §A.2. The parts and props another line on this page has already
   * claimed — the portrait pair's hands, its hat, its coat. A business card
   * that reaches for the same ones contradicts it, and the page would rather
   * have no gesture than two accounts of one pair of hands.
   */
  forbid: ReadonlySet<string> = new Set(),
): { text: string; cardId: string; motifs: string[] } | null {
  const role = person?.fixtureRole ?? 'suspect';
  const gender = person ? genderHintOf(person) : 'any';
  // Gender is a filter and not a rung: a card that says "she" is wrong on a
  // man however well it fits the role, so it is never reached for. Being one
  // temper out is a smaller wrong than calling a woman "he".
  const fitsGender = (c: Card): boolean =>
    gender === 'any' || tagIs('business', c, 'gender', gender);
  // `business` is a free deck — it may come round again on a later page — but
  // not twice on the same one, where a reader would see it.
  const ok = (c: Card): boolean =>
    !exclude.has(c.id) && fitsGender(c) && !bodyConflict(forbid, c.text, readMotifs(c));
  // Not `tagIs`: a card tagged `any` is a wildcard everywhere else, and here
  // it is its own rung, below anything written for the role itself.
  const roleIs = (c: Card, want: string): boolean => tagOf('business', c, 'role') === want;
  const drawn = dealer.draw(
    'business',
    [
      (c) => ok(c) && roleIs(c, role) && tagIs('business', c, 'temper', temper),
      (c) => ok(c) && roleIs(c, role),
      (c) => ok(c) && roleIs(c, 'any') && tagIs('business', c, 'temper', temper),
      (c) => ok(c) && roleIs(c, 'any'),
    ],
    slots,
    true,
    ctx,
  );
  if (!drawn) {
    gaps?.push(`no-business: ${role} × ${temper} × ${gender} has no card of its own to deal`);
    return null;
  }
  return { text: drawn.text, cardId: drawn.cardId, motifs: drawn.motifs };
}

export interface Answer {
  /** The finished paragraph: frame, business and the fact inside it. */
  text: string;
  mode: SpokenClue['mode'];
  cardIds: string[];
  /**
   * M5 §1: how many sentences of the finished paragraph came off an image
   * deck. The fact itself never does; the business beat and the colour beat
   * spliced into the frame always do.
   */
  imageSentences: number;
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
  dashiell: string,
  exclude: ReadonlySet<string> = new Set(),
  gaps?: string[],
  /**
   * Hone 2 §A.2. What the portrait pair on this page has already claimed, so
   * no gesture spliced into the frame reaches for the same hands.
   */
  forbid: ReadonlySet<string> = new Set(),
): Answer {
  const cardIds = [...spoken.cardIds];
  // A frame that asks for business twice — the gesture on the way in and the
  // one mid-answer — must get two different pieces of it, so the slots are
  // filled one at a time out of a widening exclusion list rather than all at
  // once with the same card. Twenty-eight of the frames ask twice.
  const spentBusiness = new Set(exclude);
  const nextBusiness = (): string => {
    const drawn = businessLine(dealer, person, temper, slots, spentBusiness, gaps, undefined, forbid);
    if (!drawn) return '';
    spentBusiness.add(drawn.cardId);
    cardIds.push(drawn.cardId);
    return drawn.text;
  };
  const spentColour = new Set<string>();
  const nextColour = (): string => {
    for (let i = 0; i < COLOUR_LINES.length; i++) {
      const line = COLOUR_LINES[dealer.random.int(COLOUR_LINES.length)] as string;
      if (spentColour.has(line)) continue;
      spentColour.add(line);
      return line;
    }
    return COLOUR_LINES[0] as string;
  };

  if (spoken.mode === 'record' || spoken.mode === 'plain') {
    const pool = spoken.mode === 'plain' ? PLAIN_LEADS : RECORD_LEADS;
    const lead = (pool[dealer.random.int(pool.length)] as string)
      .split('{name}')
      .join(person?.surname ?? 'He');
    const business = nextBusiness();
    const head = business.length > 0 ? `${business} ` : '';
    return {
      text: `${head}${lead} ${spoken.text}`,
      mode: spoken.mode,
      cardIds,
      imageSentences: business.length > 0 ? countSentences(business) : 0,
    };
  }

  const want = familiar ? 'yes' : 'no';
  // M10 §A.5: a stranger never calls him by name. The widening rungs keep to
  // that; only the acquaintance rung reaches for the familiar cards.
  const met = (c: Card): boolean => familiar || !knowsTheDetective('frames', c);
  const frame = dealer.draw(
    'frames',
    [
      (c) =>
        tagIs('frames', c, 'register', register) &&
        tagIs('frames', c, 'temper', temper) &&
        tagIs('frames', c, 'familiar', want),
      (c) => met(c) && tagIs('frames', c, 'register', register) && tagIs('frames', c, 'temper', temper),
      (c) => met(c) && tagIs('frames', c, 'register', register),
      (c) => met(c) && tagIs('frames', c, 'temper', temper),
      met,
    ],
    {
      ...slots,
      fact: spoken.text,
      // Sentinels: the frame is dealt with its business and colour slots
      // marked rather than filled, and each mark takes its own card below.
      business: BUSINESS_MARK,
      colour: COLOUR_MARK,
      dashiell,
    },
  );
  if (!frame) {
    const business = nextBusiness();
    const head = business.length > 0 ? `${business} ` : '';
    return {
      text: `${head}“${spoken.text}”`,
      mode: spoken.mode,
      cardIds,
      imageSentences: business.length > 0 ? countSentences(business) : 0,
    };
  }
  cardIds.push(frame.cardId);
  let text = frame.text;
  let imageSentences = 0;
  while (text.includes(BUSINESS_MARK)) {
    const beat = nextBusiness();
    imageSentences += beat.length > 0 ? countSentences(beat) : 0;
    text = text.replace(BUSINESS_MARK, beat);
  }
  // A colour beat outside the frame's quotation marks is not narration: it is
  // the person still talking, and it is framed as such.
  const gender = person ? genderHintOf(person) : 'any';
  // Where in the frame list this answer starts, so the same three templates
  // are not always used in the same order and a frame that asks for colour
  // twice never frames both the same way.
  const frameStart = dealer.random.int(COLOUR_FRAMES.length);
  for (let frame = frameStart; ; frame++) {
    const at = text.indexOf(COLOUR_MARK);
    if (at < 0) break;
    const line = nextColour();
    const said = insideQuotes(text.slice(0, at))
      ? line
      : frameColour(line, COLOUR_FRAMES[frame % COLOUR_FRAMES.length] as string, gender);
    imageSentences += countSentences(said);
    text = text.slice(0, at) + said + text.slice(at + COLOUR_MARK.length);
  }
  return { text: tidyPunctuation(text), mode: spoken.mode, cardIds, imageSentences };
}

/** Which of Dashiell's line kinds a topic asks for. */
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
