import { isTheft, speakTimes, type Act, type BriefingLine, type ClientBrief, type Id, type Person, type VictimBio } from './types.js';
import { breathe } from './breath.js';
import { PRECINCT_TEXT } from './victim.js';
import type { Cast } from './cast.js';

/**
 * M5 §4. The briefing, derived.
 *
 * Ten to seventeen plain declarative sentences, in the order the spec lays
 * down: who came in and what they are, what happened in the victim's own
 * terms, how the client stands to them, why they are hiring and what it costs
 * them, and who they would rather you looked at. (Hone 3 §1 moved the ceiling
 * by one: the death is a sentence of its own now, and the murder shapes whose
 * givens state four separate facts run to seventeen.) The retainer is the
 * engine's line, so
 * it is not here, and neither is whether Dashiell knows them: that is a roll
 * the engine makes, and the generator emits the sentence without it.
 *
 * This is the model of the plain register. Every sentence carries a fact and
 * none of them carries an image. Phase 2 measures pages against it.
 *
 * Every sentence comes out twice. `text` is the record's form — third person,
 * the client's own name in it — which is what the truth sheet prints and what
 * the notebook files. `spoken` is the form the client says out loud on page
 * one: the first person where the sentence is about them, the same words where
 * it is about somebody else, and nothing at all where the sentence is
 * Dashiell's own observation. The engine used to paper over the difference
 * with a line of narration about the third person; this is the difference
 * written down instead.
 */

export interface BriefingInput {
  cast: Cast;
  act: Act;
  bio: VictimBio;
  brief: ClientBrief;
}

/** The givens are capped at four in the briefing, to stay inside the ceiling. */
const GIVENS_IN_BRIEFING = 4;

export function buildBriefing(input: BriefingInput): BriefingLine[] {
  const { cast, act, bio, brief } = input;
  const client = cast.client;
  const dossier = client.dossier;

  const out: BriefingLine[] = [];
  /** Dashiell's own. Nobody says it; he saw it. */
  const seen = (text: string): void => {
    out.push({ text, spoken: null, speaker: 'narration' });
  };
  /**
   * The client's, with the words they use for it.
   *
   * §A.3: the spoken form never reads a clock face aloud, so every hour in it
   * is swapped for the hour as somebody says it. The record keeps the clock.
   * §A.1: a sentence may carry the question it answers, and at most three of
   * them do.
   */
  const said = (text: string, spoken?: string, prompt?: string): void => {
    // Hone 3 §2. A sentence the briefing has already said, or a shorter form
    // of one, is not said again. Two shapes reach here: `left` writes a given
    // that is word for word the victim's last sighting, and `taken` writes the
    // same sentence with its tail cut off — so the missing-person briefing
    // stated who saw them last, and then stated it again three sentences
    // later. Containment either way catches both, and it is deliberately
    // strict about it: nothing else the generator writes is a substring of
    // anything else it writes.
    if (alreadySaid(out, text)) return;
    const voice = speakTimes(spoken ?? asClient(text, client));
    out.push({
      text,
      spoken: voice,
      speaker: 'client',
      ...(prompt !== undefined && prompt.length > 0 ? { prompt } : {}),
    });
  };

  /* 1. Who came in. Layer 0 and the profession detail. -------------------- */
  const gender = dossier?.gender === 'f' ? 'A woman' : 'A man';
  // No room is named here: "the office" is Dashiell's own, and the generator
  // has never heard of it. The engine sets the scene; this states the fact.
  seen(`${gender} came up the stairs after midnight, and sat down.`);
  seen(
    `${client.name} is ${dossier?.age ?? 40} years old and ${dossier?.profession.role ?? client.role}.`,
  );
  /*
   * Hone 2 §A.3 and §Track B. What the client does for a living is the one
   * thing on this page they would say themselves, and the golden has them say
   * it in the second breath: "I write the tickets at Feldman's pawnshop on
   * Orchard Street. I know what things are worth." The record keeps the third
   * person, because the sheet files a person by name; the room gets the first.
   * A card with no written first-person form falls back to Dashiell saying it,
   * which is what every card did before.
   */
  if (dossier) {
    const detailText = `${client.surname} ${dossier.profession.detail}.`;
    const detailFirst = dossier.profession.detailFirst;
    if (detailFirst === undefined) seen(detailText);
    else said(detailText, detailFirst, dossier.profession.prompt);
  }

  /* 2. What happened, in the order the reader needs it. -------------------
   *
   * Hone 3 §1. The briefing used to open on the victim's standing — "Sweeney
   * was the reason four places on the street stayed open" — and only get round
   * to his being dead three sentences later. A reader who does not yet know
   * there is a body has nowhere to put the standing, so the standing reads as
   * a biography and the death, when it comes, reads as a correction.
   *
   * So the headline fact goes first, and it is a different fact per case type:
   *
   *   murder   the death, with the victim's full name, once — then who he was,
   *            then where and how he was found, then what the precinct did.
   *   robbery  the loss, then whose it was, then where and when.
   *   missing  who is gone, then who they are, then when they were last seen.
   *
   * After that the three run together again: the tie, the purpose and its
   * price, and the pointer. The record's order is the spoken order, so the
   * truth sheet's Briefing section prints exactly this.
   */
  const givens = act.givens.text.slice(0, GIVENS_IN_BRIEFING);
  const [headline, ...restOfGivens] = givens;
  if (act.type === 'murder') {
    // The one sentence the generator writes for the page rather than lifting
    // from a trope. The full name is said here and nowhere else: a stranger
    // names the dead man in full once, and after that he is a surname.
    said(`${cast.victim.name} is dead.`);
    said(bio.standing);
    for (const line of givens) said(line);
  } else if (isTheft(act.type)) {
    // The loss is the trope's own first given — "A jewel case was taken from
    // the suite, which is Sweeney's" — and it is already the headline. Whose
    // it was follows it, which is what the possessive in it was reaching for.
    if (headline !== undefined) said(headline);
    said(bio.standing);
    for (const line of restOfGivens) said(line);
  } else {
    if (headline !== undefined) said(headline);
    said(bio.standing);
  }

  if (bio.discovery) {
    said(bio.discovery.foundText, bio.discovery.foundTextFirst, bio.discovery.foundPrompt);
    said(PRECINCT_TEXT[bio.discovery.precinct]);
  } else if (bio.lastSeen) {
    // Missing: the last sighting comes straight after who they are, and the
    // rest of the trope's givens — the tidy rooms, the precinct's shrug —
    // follow it, because they are what happened after rather than what
    // happened. The givens carry their own precinct sentence in this shape.
    said(bio.lastSeen.text, bio.lastSeen.textFirst, bio.lastSeen.prompt);
    for (const line of restOfGivens) said(line);
  }

  /* 3. How the client stands to the victim, with the specific. ------------ */
  if (dossier) {
    said(`${client.surname} is ${dossier.tie.text}.`, `I am ${dossier.tie.text}.`);
    said(dossier.tie.backstory, dossier.tie.backstoryFirst);
  }

  /* 4. Why they are hiring, and what it costs them. ----------------------- */
  said(brief.purposeText, brief.purposeTextFirst, brief.purposePrompt);
  said(brief.cost, brief.costFirst);

  /* 5. The pointer. ------------------------------------------------------- */
  const pointed = cast.people.find((p) => p.id === brief.points.personId) as Person;
  // The record says whom the client named; the client, in the room, just says
  // the name. The pointer is the job and it is the shortest sentence on the
  // page for exactly that reason.
  said(
    `${client.surname} wants us to start with ${pointed.surname}.`,
    `Start with ${pointed.surname}.`,
    brief.pointerPrompt,
  );
  // A reason drawn from a secret's tell is a finished sentence already ("…and
  // came out without it."); a motive's is a clause. Only the clause gets a
  // stop, or the hiring card that quotes it ends on "without it..".
  const stopped = (s: string): string => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
  said(stopped(brief.points.reason), stopped(brief.points.reasonSpoken));

  // Hone 3 §3. Last, because it reads the whole of what she says at once: the
  // surname once a turn, and after that a pronoun. It runs before `breathe`,
  // so the split form inherits the pronouns rather than contradicting them.
  pronounWithinTurns(out, cast);

  return out
    .map((line) => {
      const spoken = line.spoken === null ? null : tidy(line.spoken);
      return {
        text: tidy(line.text),
        spoken,
        speaker: line.speaker,
        ...(line.prompt === undefined ? {} : { prompt: tidy(line.prompt) }),
        // §A.2: the third form. Every client sentence knows where it breathes,
        // and the page decides whether it needs it.
        ...(spoken === null ? {} : { breath: breathe(spoken) }),
      };
    })
    .filter((line) => line.text.length > 0);
}

/* ------------------------------------------------------------------ *
 * Hone 3 §3 — the surname once a turn, and then pronouns.
 * ------------------------------------------------------------------ */

/**
 * A turn is a paragraph of the client's speech, and inside one a person is
 * named once.
 *
 * "Sweeney was the reason four places stayed open. Sweeney was found dead at
 * the suite. Sweeney was killed at the suite." is a record being read out, and
 * the giveaway is the name at the head of every sentence. A person says the
 * name once and then says "he", and that is the whole rule. Across turns the
 * surname may come back, because a new turn is a new answer to a new question
 * and the reader has had Dashiell's voice in between.
 *
 * Only the client's own words are touched. The record's form keeps every name
 * in it, because the sheet files a person by name and the notebook is read out
 * of order.
 *
 * The guard is ambiguity: if the turn names anybody else of the same gender,
 * "he" has two possible antecedents and the surname stays. That is why the
 * pointer's turn — "Start with Grasso." / "Grasso blamed Sweeney for the ruin
 * of his business." — keeps both names: two men, one pronoun, and a reader who
 * has to work out which.
 */
export function pronounWithinTurns(lines: BriefingLine[], cast: Cast): void {
  /** Everybody a turn can name, as the briefing spells them. */
  const everyone: Named[] = [];
  for (const p of cast.people) {
    const gender = p.dossier?.gender ?? cast.dossiers[p.id]?.gender;
    if (gender === undefined) continue;
    everyone.push({ token: p.surname, gender, target: p.id !== cast.client.id });
  }
  // A mention is written in full — "Domenico Tramonti" — and never otherwise.
  for (const m of cast.mentions.mentions) {
    everyone.push({ token: m.name, gender: m.gender, target: true });
  }

  for (const turn of clientTurns(lines)) {
    const here = everyone.filter((n) => turn.some((l) => countsOf(l.spoken ?? '', n.token) > 0));
    for (const target of here) {
      if (!target.target) continue;
      // Somebody else of the same gender is in this turn, so a pronoun would
      // have two people to point at. The name stays.
      if (here.some((n) => n !== target && n.gender === target.gender)) continue;
      pronounAfterFirst(turn, target);
    }
  }
}

interface Named {
  /** The string the briefing writes: a surname for a person, a full name for a mention. */
  token: string;
  gender: 'm' | 'f';
  /** False for the client, who is talking and says "I". She is only a guard. */
  target: boolean;
}

/**
 * The client's sentences grouped the way the page groups them: a turn begins
 * wherever the generator wrote a question, because that is what the engine's
 * `briefingTurns` does with the same list.
 */
function clientTurns(lines: readonly BriefingLine[]): BriefingLine[][] {
  const turns: BriefingLine[][] = [];
  for (const line of lines) {
    if (line.speaker !== 'client' || line.spoken === null) continue;
    const opens = line.prompt !== undefined && line.prompt.length > 0;
    if (turns.length === 0 || opens) turns.push([]);
    (turns[turns.length - 1] as BriefingLine[]).push(line);
  }
  return turns;
}

function nameRe(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(?:[’']s)?\\b`, 'g');
}

function countsOf(text: string, token: string): number {
  return (text.match(nameRe(token)) ?? []).length;
}

/**
 * What a name can be doing in a sentence, told from the words either side of
 * it. The lists are short on purpose: where neither fits, the name stays, and
 * a sentence that keeps its surname is never wrong, only flat.
 */
const A_SUBJECT_FOLLOWS =
  /^(?:is|was|were|are|has|had|have|does|did|do|will|would|never|always|only|still|owed|owes|owns|owned|ran|runs|kept|keeps|rented|rents|carried|carries|paid|pays|said|says|wanted|wants|blamed|blames|knew|knows|came|comes|went|goes|left|leaves|lived|lives|died|dies|put|puts|gave|gives|took|takes|bought|buys|sold|sells|stopped|stops|sat|sits|stood|stands|worked|works|made|makes|held|holds|let|lets)\b/;
const AN_OBJECT_FOLLOWS =
  /\b(?:to|for|from|with|at|about|of|on|after|before|against|beside|near|behind|like|than|killed|kills|saw|sees|seen|found|finds|hit|hits|owed|owes|introduced|blamed|blames|ruined|ruins|asked|asks|told|tells|paid|pays|sent|sends|wanted|wants|carried|carries|met|meets|knew|knows|heard|hears|watched|watches)\s+$/;
/** The name is starting a sentence, so its replacement takes the capital. */
const A_SENTENCE_OPENS = /(?:^|[.!?][”"’']?\s+|[“"]\s*)$/;

const PRONOUNS: Record<'m' | 'f', { subject: string; object: string; possessive: string }> = {
  m: { subject: 'he', object: 'him', possessive: 'his' },
  f: { subject: 'she', object: 'her', possessive: 'her' },
};

/** Every mention of this person in this turn after the first, as a pronoun. */
function pronounAfterFirst(turn: readonly BriefingLine[], target: Named): void {
  const p = PRONOUNS[target.gender];
  let seen = 0;
  for (const line of turn) {
    if (line.spoken === null) continue;
    const whole = line.spoken;
    line.spoken = whole.replace(nameRe(target.token), (match, offset: number) => {
      seen += 1;
      // The first one is the introduction, and a turn that never introduces
      // anybody is a turn of pronouns with nothing behind them.
      if (seen === 1) return match;
      const before = whole.slice(0, offset);
      const rest = whole.slice(offset + match.length);
      const after = rest.replace(/^[\s,]+/, '');
      const possessive = /[’']s$/.test(match);
      const opens = A_SENTENCE_OPENS.test(before);
      // What comes before decides first. "I came to Sweeney and paid" has a
      // verb after the name and a preposition in front of it, and only the
      // preposition is telling the truth about which pronoun it takes.
      const word = possessive
        ? p.possessive
        : AN_OBJECT_FOLLOWS.test(before)
          ? p.object
          : // A bare name at the head of a sentence, with a small word after it
            // and no comma in between, is that sentence's subject: "He could
            // put a name on a bill", "He and I took the lease together". A
            // comma means an apposition or a relative clause is coming, and
            // then the name stays, because what follows is about to describe
            // it and a pronoun has nothing for it to describe.
            opens && /^\s+[a-z]/.test(rest)
            ? p.subject
            : A_SUBJECT_FOLLOWS.test(after)
              ? p.subject
              : null;
      if (word === null) return match;
      return opens ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    });
  }
}

/** The bare sentences, in order, for the sheet and the notebook. */
export function briefingStrings(lines: BriefingLine[]): string[] {
  return lines.map((line) => line.text);
}

/**
 * A sentence the client says about themselves, when the sentence was written
 * about them by name.
 *
 * Most of what the client says is about the victim and needs nothing done to
 * it. A few sentences are not: a given can name whoever last saw the missing
 * person or whoever the precinct found the weapon on, and that is sometimes
 * the person in the chair. This is the guard for those, and it is deliberately
 * narrow — it swaps the name where the name is the subject or a possessive,
 * and conjugates only the four verbs the trope givens can put after it.
 * Everything the client says *about themselves* by design has a written
 * first-person variant and never reaches here.
 */
export function asClient(text: string, client: Person): string {
  const surname = client.surname;
  const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`\\b${escaped}\\b`).test(text)) return text;
  const swapped = text
    .replace(new RegExp(`\\b${escaped}[’']s\\b`, 'g'), 'my')
    // The subject: the head of the sentence, or the head of a clause after it.
    .replace(new RegExp(`(^|, and |, | and |: )${escaped}\\b`, 'g'), '$1I')
    .replace(/(^|[\s(“"])I (is|has|does|says)\b/g, (_m, before: string, verb: string) => {
      const conjugated =
        verb === 'is' ? 'am' : verb === 'has' ? 'have' : verb === 'does' ? 'do' : 'say';
      return `${before}I ${conjugated}`;
    });
  return swapped.charAt(0).toUpperCase() + swapped.slice(1);
}

/**
 * Has the briefing said this already, or a longer sentence that contains it?
 *
 * Hone 3 §2. The comparison is on the record's form, because that is the one
 * the generator writes and the one the sheet files; two sentences that differ
 * only in the person speaking them are still one fact.
 */
function alreadySaid(out: readonly BriefingLine[], text: string): boolean {
  const bare = (s: string): string =>
    s.toLowerCase().replace(/[.,;:!?’']/g, '').replace(/\s+/g, ' ').trim();
  const now = bare(text);
  if (now.length === 0) return false;
  return out.some((line) => {
    if (line.speaker !== 'client') return false;
    const had = bare(line.text);
    return had.includes(now) || now.includes(had);
  });
}

/** One space between sentences, one full stop at the end, and no `{slots}`. */
function tidy(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Every id the briefing mentions, for the correspondence checker's context. */
export function briefingSubjects(cast: Cast): Id[] {
  return cast.people.map((p) => p.id);
}
