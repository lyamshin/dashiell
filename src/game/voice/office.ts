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
import type { BriefingLine, Person } from '../../gen/types.js';
import { pronounWithinTurns } from '../../gen/briefing.js';
import {
  CLIENT_LEAVING,
  ENTRANCE_LINES,
  HIRING_LINES,
  OFFICE_LINES,
  RETAINERS,
} from '../voice-data.js';
import { Dealer, knowsTheDetective, tagIs, type Slots } from './cards.js';
import type { MotifContext } from './motifs.js';
import { tidyPunctuation } from './prose.js';
import type { Temper } from './cast.js';
import { pronounOf } from './cast.js';
import { pronounSubject } from './plain.js';
import { pastPredicate } from '../scene/text.js';
import { JOB_WORDS } from '../../gen/data/cast.js';
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
  // "she" is wrong on a man however well the rest of it fits. M10 §A.5: so is
  // acquaintance, one way round. A stranger who calls him by name, or says
  // "same as always", has met him; a card for an old acquaintance is never
  // dealt to somebody the roll says he does not know.
  const ok = (c: Parameters<typeof tagIs>[1]): boolean =>
    (client.gender === 'any' || tagIs('entrances', c, 'gender', client.gender)) &&
    (client.familiar || !knowsTheDetective('entrances', c));
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
  // M10 §A.5: "…same as always, Dashiell" from somebody he has never met.
  const met = (c: Parameters<typeof tagIs>[1]): boolean => client.familiar || !knowsTheDetective('hiring', c);
  const drawn = dealer.draw(
    'hiring',
    [
      (c) =>
        c.text.includes('{fact}') &&
        tagIs('hiring', c, 'temper', client.temper) &&
        tagIs('hiring', c, 'familiar', want),
      (c) => c.text.includes('{fact}') && met(c) && tagIs('hiring', c, 'temper', client.temper),
      (c) => c.text.includes('{fact}') && met(c),
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
 * M11 §A.1 — the office in the order a person tells it.
 * ------------------------------------------------------------------ */

/**
 * The detective's three questions on page one, each written for the line in
 * front of it. The generator's prompts were written one for one with a
 * sentence, and asked in the generator's order they came before the sentence
 * that invited them: "What happens if it is settled loudly?" before she had
 * said a word about quiet. These answer what she has just said.
 */
export const OFFICE_ASK_POLICE: readonly string[] = [
  'And the police?',
  'What did the police make of it?',
  'What did the precinct do about it?',
];

/** "Why me?", after she has said what the police did. By what they did. */
export const OFFICE_ASK_WHY: Readonly<Record<'called' | 'not-called' | 'none', readonly string[]>> = {
  called: ['Why me, and not the precinct again?', 'Then why come to me?', 'Why me?'],
  'not-called': ['Why me, and not the police?', 'Then why come to me?'],
  none: ['Why come to me?', 'What do you want me to do about it?'],
};

export const OFFICE_ASK_START: readonly string[] = [
  'Where would you start?',
  'Who would you start with?',
  'If it were yours to do, where would you start?',
];

/**
 * The beat after the first thing she says: she has told him who she is to
 * the dead man and that he is dead, and he lets her go on in her own time.
 */
export const OFFICE_FIRST_BEAT: readonly string[] = [
  'I let {him} sit before I asked anything.',
  'I let that sit, and waited for the rest of it.',
  'I didn’t say anything. {He} wasn’t finished.',
];

/**
 * Golden rule 5 of the office: the victim gets a sentence of life and
 * consequence after his standing. Opinion, never a case fact, and nobody by
 * name. By the victim's archetype; `{him}` and `{he}` are the victim's.
 */
export const VICTIM_CONSEQUENCE: Readonly<Record<string, readonly string[]>> = {
  'vic-inspector': ['You can imagine how many friends that made {him}.', 'Nobody on the street was sorry to see {him} go by.'],
  'vic-landlord': ['Nobody loves the one who collects the rent.', 'You can imagine how many friends that made {him}.'],
  'vic-bootlegger': ['A man in that line has customers, not friends.', 'Half the street drank what {he} sold, and the other half wished {he} would stop.'],
  'vic-heiress': ['People were always nice to {him} to {his} face.', 'Money like that has a lot of friends and no close ones.'],
  'vic-agent': ['Everybody who wanted work was nice to {him}. Nobody else bothered.', 'You can imagine how many people were waiting on {him}.'],
  'vic-union-treasurer': ['Men keep an eye on whoever holds the money.', 'You can imagine how many friends that made {him}.'],
  'vic-pawnbroker': ['Nobody is fond of the one who holds their things.', 'People only came to {him} when they had to.'],
  'vic-columnist': ['Half the city wanted to be in the column, and the other half wanted to stay out of it.', 'You can imagine how many friends that made {him}.'],
  'vic-bondsman': ['People only came to {him} on the worst night of their lives.', 'Nobody thanks the one who holds the bail.'],
  'vic-wholesaler': ['{He} was retired, but {he} never stopped counting.', 'People on the street still called {him} by {his} old trade.'],
};

/** One turn of what she says, and the question that opens it. */
export interface OfficeTurn {
  ask: 'police' | 'why' | 'start' | null;
  lines: SpokenLine[];
}

/**
 * Page one's speech, in the order the golden tells it:
 *
 *   who she is to him, and that he is dead        (unasked)
 *   who he was, where, and who found him          (she goes on)
 *   what the police did, what's wrong, and when   "And the police?"
 *   why she came to him, and what she wants       "Why me?"
 *   her trade, in his words                       (narration)
 *   who she would start with, and the money       "Where would you start?"
 *
 * Every briefing sentence she says is here, reordered and not reworded,
 * except the two the relation turn says better in the new order: "I am his
 * sister-in-law" becomes "I am Isidore Sirkin's sister-in-law", because it
 * comes first now and "his" has nothing in front of it; and the murder's
 * "Isidore Sirkin is dead" becomes "He is dead", because the name was just
 * said. Nothing is added to what she says but those, the victim's trade
 * ("Sirkin was a buildings inspector"), and one line of opinion about him.
 */
export interface OfficePlan {
  /** Her name, her relation, the death: the first thing she says. */
  relation: SpokenLine[];
  story: SpokenLine[];
  police: SpokenLine[];
  want: SpokenLine[];
  /** Her trade in his narration, past tense, a pronoun for a subject. Null when the dossier has none. */
  trade: string | null;
  close: SpokenLine[];
  /** What the precinct did, for the "Why me?" that follows it. */
  precinct: 'called' | 'not-called' | 'none';
}

/** The victim's surname, first time in a turn, where a pronoun would be the turn's first word for him. */
function nameFirst(lines: SpokenLine[], victim: Person): SpokenLine[] {
  const surname = victim.surname;
  const he = pronounOf(victim) === 'she' ? 'She' : 'He';
  let named = false;
  return lines.map((line) => {
    if (named) return line;
    if (new RegExp(`\\b${surname}\\b`).test(line.text)) {
      named = true;
      return line;
    }
    const re = new RegExp(`^${he}\\b`);
    if (re.test(line.text)) {
      named = true;
      const text = line.text.replace(re, surname);
      const { breath: _b, ...rest } = line;
      return { ...rest, text };
    }
    return line;
  });
}

export function officePlan(
  view: CaseView,
  familiar: boolean,
  rng: { pick<T>(xs: readonly T[]): T },
): OfficePlan {
  const kase = view.kase;
  const client = view.client;
  const victim = view.victim;
  const dossier = client.dossier;
  const topics = briefingTopics(view);
  type Said = { line: SpokenLine; record: string };
  const records: Said[] = kase.briefing
    .filter((line) => line.speaker === 'client')
    .map((line) => ({
      record: line.text,
      line: {
        topic: topics.get(tidyLine(line.text)) ?? 'other',
        text: line.spoken ?? line.text,
        ...(line.breath === undefined ? {} : { breath: line.breath }),
      },
    }));
  const used = new Set<number>();
  const take = (pred: (l: SpokenLine & { record: string }) => boolean): SpokenLine[] => {
    const out: SpokenLine[] = [];
    records.forEach((s, i) => {
      if (used.has(i) || !pred({ ...s.line, record: s.record })) return;
      used.add(i);
      out.push(s.line);
    });
    return out;
  };

  /* Her trade, which the golden gives in his words and not hers. */
  const detailRecord = dossier ? tidyLine(`${client.surname} ${dossier.profession.detail}.`) : '';
  take((l) => tidyLine(l.record) === detailRecord);
  // The designer's note: the plain fact first. "She wrote the pawn tickets
  // behind the grille" says what she does without saying what she is; where
  // the detail has no plain word for the job, the job goes in front of it.
  const job = JOB_WORDS[client.archetypeId ?? ''];
  const plainFirst =
    dossier !== undefined && job !== undefined && !job.test(dossier.profession.detail)
      ? `${pronounOf(client) === 'she' ? 'She' : 'He'} was ${dossier.profession.role.replace(/\.$/, '')}. `
      : '';
  const trade =
    dossier === undefined
      ? null
      : `${plainFirst}${pronounSubject(pastPredicate(detailRecord), client.surname, pronounOf(client))}`;

  /* 1. Who she is to him, and that he is dead. */
  const deathRecord = tidyLine(`${victim.name} is dead.`);
  const death = take((l) => kase.act.type === 'murder' && tidyLine(l.record) === deathRecord);
  const headline =
    kase.act.type === 'murder'
      ? death.length > 0
        ? [{ topic: 'given' as const, text: `${pronounOf(victim) === 'she' ? 'She' : 'He'} is dead.` }]
        : []
      : take((l) => l.topic === 'given' && tidyLine(l.record) === tidyLine(kase.act.givens.text[0] ?? '§'));
  const tieLines = take((l) => l.topic === 'tie');
  const relation: SpokenLine[] = [];
  if (!familiar) relation.push({ topic: 'other', text: `My name is ${client.name}.` });
  if (dossier) {
    const tie = dossier.tie.text;
    const full = tie.includes(victim.surname) ? tie.replace(victim.surname, victim.name) : tie;
    relation.push({ topic: 'tie', text: tidyLine(`I am ${full}`) });
  } else {
    relation.push(...tieLines);
  }
  relation.push(...headline);

  /* 2. Who he was, where, and who found him. */
  const role = victim.role.replace(/\.$/, '');
  const story: SpokenLine[] = [];
  if (kase.act.type === 'murder') story.push({ topic: 'standing', text: tidyLine(`${victim.surname} was ${role}`) });
  story.push(...take((l) => l.topic === 'standing'));
  const pool = VICTIM_CONSEQUENCE[victim.archetypeId ?? ''];
  if (pool && pool.length > 0 && kase.act.type === 'murder') {
    const she = pronounOf(victim) === 'she';
    const line = rng
      .pick(pool)
      .split('{him}')
      .join(she ? 'her' : 'him')
      .split('{his}')
      .join(she ? 'her' : 'his')
      .split('{He}')
      .join(she ? 'She' : 'He')
      .split('{he}')
      .join(she ? 'she' : 'he');
    story.push({ topic: 'other', text: line });
  }
  story.push(...take((l) => l.topic === 'backstory'));
  const policeWords = /\b(?:precinct|police)\b/i;
  const coroner = /\bcoroner\b/i;
  story.push(
    ...take((l) => l.topic === 'given' && /\bfound\b/i.test(l.record) && !policeWords.test(l.record) && !coroner.test(l.record)),
  );
  story.push(...take((l) => l.topic === 'discovery'));

  /* 3. What the police did, what is wrong with it, and when. */
  const police: SpokenLine[] = [];
  police.push(...take((l) => l.topic === 'precinct'));
  police.push(...take((l) => l.topic === 'given' && policeWords.test(l.record)));
  const precinctSaid = police.length > 0;
  police.push(...take((l) => l.topic === 'given' && !coroner.test(l.record)));
  police.push(...take((l) => l.topic === 'given'));
  const precinct = kase.victimBio.discovery?.precinct;
  const precinctKind: OfficePlan['precinct'] = !precinctSaid
    ? 'none'
    : precinct === 'not-yet-called'
      ? 'not-called'
      : 'called';

  /* 4. Why him, and what she wants. */
  const want = take((l) => l.topic === 'purpose' || l.topic === 'cost');
  /* 5. Where to start. */
  const close = take((l) => l.topic === 'pointer' || l.topic === 'reason');
  /* Anything the fields did not account for rides with the story. */
  story.push(...take(() => true));
  // With no word from the police, what is wrong and when it happened is the
  // rest of the story, and nobody asks about the precinct.
  if (!precinctSaid) story.push(...police.splice(0));

  return {
    relation,
    story: nameFirst(story, victim),
    police: nameFirst(police, victim),
    want,
    trade,
    close,
    precinct: precinctKind,
  };
}

/** The turns, with the question in front of each, from a plan. */
export function officeTurns(plan: OfficePlan, police: SpokenLine[] = plan.police): OfficeTurn[] {
  const turns: OfficeTurn[] = [{ ask: null, lines: plan.relation }, { ask: null, lines: plan.story }];
  if (police.length > 0) turns.push({ ask: 'police', lines: police });
  if (plan.want.length > 0) turns.push({ ask: 'why', lines: plan.want });
  return turns.filter((t) => t.lines.length > 0);
}

/**
 * Hone 3 §3's rule, on the turns as the office now groups them: inside one
 * turn a person is named once and then is "he". The generator ran it on its
 * own turns; regrouped, "Ashby was the last resort on the block… I live
 * across the airshaft from Ashby… Mulcahy found Ashby at the walk-up" came
 * back. A line the pass changes loses its breath form, which was written
 * with the name in it.
 */
export function pronounOfficeTurns(view: CaseView, turns: readonly OfficeTurn[]): void {
  const lines: BriefingLine[] = [];
  const back: { turn: OfficeTurn; i: number }[] = [];
  for (const turn of turns) {
    turn.lines.forEach((line, i) => {
      // Who he was and where he was found are two breaths of one turn: the
      // finder, named in the second, would otherwise keep every "he" in the
      // first from being said (the pass keeps a name wherever two men share
      // a turn).
      const prev = turn.lines[i - 1];
      const found = (l: SpokenLine | undefined): boolean => l !== undefined && (l.topic === 'discovery' || /\bfound\b/.test(l.text));
      const opens = i === 0 || (found(line) && !found(prev));
      lines.push({ text: line.text, spoken: line.text, speaker: 'client', ...(opens ? { prompt: '§' } : {}) });
      back.push({ turn, i });
    });
  }
  const castLike = {
    people: view.kase.people,
    mentions: { mentions: view.kase.mentions },
    client: view.client,
    dossiers: {},
  } as unknown as Parameters<typeof pronounWithinTurns>[1];
  pronounWithinTurns(lines, castLike);
  lines.forEach((line, k) => {
    const at = back[k] as { turn: OfficeTurn; i: number };
    const old = at.turn.lines[at.i] as SpokenLine;
    if (line.spoken !== null && line.spoken !== old.text) {
      const { breath: _breath, ...rest } = old;
      at.turn.lines[at.i] = { ...rest, text: line.spoken };
    }
  });
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.4 — stairs, door, sit, speak.
 * ------------------------------------------------------------------ */

/** How far into the room an entrance card has got by the time it ends. */
export type EntranceStage = 'stairs' | 'door' | 'sit' | 'speak';

const AT_THE_STAIRS = /\b(?:stairs|staircase|climbed|flight)\b/i;
const AT_THE_DOOR =
  /\b(?:door|doorway|knock(?:ed|s)?|came\s+in|come\s+in|walked\s+in|stepped\s+in|mat|threshold|landing)\b/i;
const IN_THE_CHAIR = /\b(?:sit|sits|sat|seat|seated|seating|chair)\b/i;

/**
 * The earliest stage an entrance card reaches.
 *
 * The order of an arrival is fixed and a reader knows it: stairs, then the
 * door, then the chair, then the first word. Seed 3 printed "A woman came up
 * the stairs after midnight, and sat down. Kreuzer shut the door soft" — she
 * was in the chair a sentence before she was through the door, which is the
 * page contradicting itself in consecutive sentences.
 *
 * The earliest stage is the one that matters, because the plain arrival atom
 * goes in front of the card and may not overtake it.
 */
export function entranceStage(text: string): EntranceStage {
  if (AT_THE_STAIRS.test(text)) return 'stairs';
  if (AT_THE_DOOR.test(text)) return 'door';
  if (IN_THE_CHAIR.test(text)) return 'sit';
  return 'speak';
}

/** The seating clause off the end of the arrival atom, and nothing else. */
function upToTheStairs(atom: string): string {
  const trimmed = atom.replace(/,?\s+and\s+(?:sat|seated|took)\b[^.!?]*/i, '').trim();
  if (trimmed.length === 0) return atom;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * The generator's arrival sentence, cut to fit in front of the entrance card.
 *
 * Three answers. A card that names the stairs itself has already said the
 * whole atom, better and with a name in it, so the atom goes. A card that
 * starts at the door or in the chair keeps the atom's stairs and loses its
 * seating, because the card is about to do the seating in the right order. A
 * card that only speaks takes the atom whole: stairs, chair, and then the
 * first word, which is the order the golden has.
 */
export function arrivalAtom(atom: string | null, cardText: string): string | null {
  if (atom === null || atom.trim().length === 0) return null;
  switch (entranceStage(cardText)) {
    case 'stairs':
      return null;
    case 'door':
    case 'sit':
      return upToTheStairs(atom);
    default:
      return atom;
  }
}

/* ------------------------------------------------------------------ *
 * Hone 2 §A.3 — the profession in the client's own mouth.
 * ------------------------------------------------------------------ */

/**
 * The profession detail as the client says it, when the generator has written
 * one.
 *
 * Hone 2's Track B writes `professionFirst` beside the archetype's
 * `professionDetails` — "I write the tickets at Feldman's. I know what things
 * are worth." — and until it lands the engine has to run without it. The field
 * is read wherever the generator ends up hanging it, and its absence is not an
 * error: the narration keeps the third-person sentence and pronouns it.
 */
export function professionSpoken(client: Person): string | null {
  const dossier = client.dossier as unknown as Record<string, unknown> | undefined;
  if (dossier === undefined) return null;
  const profession = dossier.profession as Record<string, unknown> | undefined;
  const candidates = [
    profession?.detailFirst,
    profession?.professionFirst,
    profession?.first,
    dossier.professionFirst,
    (client as unknown as Record<string, unknown>).professionFirst,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return tidyLine(value);
  }
  return null;
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
