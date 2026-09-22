import { speakTimes, type Act, type BriefingLine, type ClientBrief, type Id, type Person, type VictimBio } from './types.js';
import { breathe } from './breath.js';
import { PRECINCT_TEXT } from './victim.js';
import type { Cast } from './cast.js';

/**
 * M5 §4. The briefing, derived.
 *
 * Ten to sixteen plain declarative sentences, in the order the spec lays down:
 * who came in and what they are, what happened in the victim's own terms, how
 * the client stands to them, why they are hiring and what it costs them, and
 * who they would rather you looked at. The retainer is the engine's line, so
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

/** The givens are capped at four in the briefing, to stay inside sixteen. */
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
  } else if (act.type === 'robbery') {
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
  said(`${brief.points.reason}.`, `${brief.points.reasonSpoken}.`);

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
