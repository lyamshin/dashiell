import type { Act, ClientBrief, Id, Person, VictimBio } from './types.js';
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
 */

export interface BriefingInput {
  cast: Cast;
  act: Act;
  bio: VictimBio;
  brief: ClientBrief;
}

/** The givens are capped at four in the briefing, to stay inside sixteen. */
const GIVENS_IN_BRIEFING = 4;

export function buildBriefing(input: BriefingInput): string[] {
  const { cast, act, bio, brief } = input;
  const client = cast.client;
  const dossier = client.dossier;

  const out: string[] = [];

  /* 1. Who came in. Layer 0 and the profession detail. -------------------- */
  const gender = dossier?.gender === 'f' ? 'A woman' : 'A man';
  out.push(`${gender} came up the stairs to the office after midnight.`);
  out.push(
    `${client.name} is ${dossier?.age ?? 40} years old and ${dossier?.profession.role ?? client.role}.`,
  );
  if (dossier) out.push(`${client.surname} ${dossier.profession.detail}.`);

  /* 2. What happened, in the victim's terms. ------------------------------ */
  out.push(bio.standing);
  for (const line of act.givens.text.slice(0, GIVENS_IN_BRIEFING)) out.push(line);
  if (bio.discovery) {
    out.push(bio.discovery.foundText);
    out.push(PRECINCT_TEXT[bio.discovery.precinct]);
  } else if (bio.lastSeen) {
    out.push(bio.lastSeen.text);
  }

  /* 3. How the client stands to the victim, with the specific. ------------ */
  if (dossier) {
    out.push(`${client.surname} is ${dossier.tie.text}.`);
    out.push(dossier.tie.backstory);
  }

  /* 4. Why they are hiring, and what it costs them. ----------------------- */
  out.push(brief.purposeText);
  out.push(brief.cost);

  /* 5. The pointer. ------------------------------------------------------- */
  const pointed = cast.people.find((p) => p.id === brief.points.personId) as Person;
  out.push(`${client.surname} wants us to start with ${pointed.surname}.`);
  out.push(`${brief.points.reason}.`);

  return out.map(tidy).filter((s) => s.length > 0);
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
