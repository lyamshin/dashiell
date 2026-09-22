import {
  clock,
  spokenClock,
  type Act,
  type Dossier,
  type Id,
  type Person,
  type Precinct,
  type VictimBio,
} from './types.js';
import type { Cast } from './cast.js';
import type { Setting } from './setting.js';
import type { ScheduleBuild } from './schedule.js';
import type { Rng } from './rng.js';

/**
 * M5 §1.3. The victim had a life before the case and the case has a beginning:
 * somebody walked in and found it, and the precinct did or did not do
 * something about it. Both are constrained by the schedules — the one who
 * found the body was in the room, and the sheet can prove it.
 */

export const PRECINCT_TEXT: Record<Precinct, string> = {
  'came-and-went': 'The precinct came, walked through it, and went.',
  'called-it-a-fall': 'The precinct wrote it down as a fall and closed the book on it.',
  'took-a-statement': 'The precinct took a statement at the desk and filed it.',
  'not-yet-called': 'The precinct has not been called, and is not going to be.',
  'closed-it-in-an-hour': 'The precinct had somebody for it inside the hour.',
};

/**
 * §A.1 — the question the discovery sentence answers.
 *
 * Three per shape, so forty seeds do not open the same way. Every one of them
 * asks for the two things the sentence carries and nothing else carries: where
 * the client was standing when they found it, and at what hour. "And then?"
 * would do for any answer in the briefing; none of these would.
 *
 * `{V}` is the victim's surname, `{L}` the place, `{thing}` what was taken.
 */
export const DISCOVERY_PROMPTS: Record<'murder' | 'robbery' | 'missing', string[]> = {
  murder: [
    'Where did you find {V}, and when?',
    'Who found {V}?',
    'What time did you find {V} at {L}?',
  ],
  robbery: [
    'When did you find the door shut?',
    'Who found it gone, and at what hour?',
    'What time was it when you got to {L}?',
  ],
  missing: [
    'When did you last see {V}?',
    'Where did you see {V} last, and at what hour?',
    'Who saw {V} last?',
  ],
};

const PRECINCT_BY_TROPE: Record<Id, Precinct[]> = {
  'body-at-scene': ['came-and-went', 'took-a-statement'],
  'body-moved': ['called-it-a-fall'],
  'locked-room': ['came-and-went', 'called-it-a-fall'],
  'the-frame': ['closed-it-in-an-hour'],
  'inside-job': ['took-a-statement', 'came-and-went'],
  payroll: ['took-a-statement'],
  left: ['not-yet-called', 'took-a-statement'],
  taken: ['took-a-statement', 'not-yet-called'],
};

export interface VictimBioInput {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  build: ScheduleBuild;
  act: Act;
  /** The dossier already built for the victim, in cast order. */
  dossier: Dossier;
}

export function buildVictimBio(input: VictimBioInput): VictimBio {
  const { cast, setting, build, act, rng } = input;
  const PL = (id: Id | null | undefined): string =>
    id ? (setting.places.find((p) => p.id === id)?.shortName ?? id) : 'somewhere';
  const who = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? id;
  const V = cast.victim.surname;

  const precinct = rng.pick(PRECINCT_BY_TROPE[act.tropeId] ?? ['came-and-went']) as Precinct;

  const bio: VictimBio = {
    ...input.dossier,
    standing: input.dossier.tie.backstory,
  };

  if (act.type === 'missing') {
    const byId = build.lastSeenById ?? (cast.fixtures[0] as Person | undefined)?.id ?? cast.killer.id;
    bio.lastSeen = {
      byId,
      place: build.victimSeenPlace,
      tick: build.victimSeenAt,
      text: `${who(byId)} saw ${V} at ${PL(build.victimSeenPlace)} at ${clock(build.victimSeenAt)}, and nobody has seen ${V} since.`,
    };
    if (byId === cast.client.id) {
      bio.lastSeen.textFirst = `I saw ${V} at ${PL(build.victimSeenPlace)} at ${spokenClock(build.victimSeenAt)}, and nobody has seen ${V} since.`;
      bio.lastSeen.prompt = promptFor(rng, 'missing', {
        V,
        L: PL(build.victimSeenPlace),
        thing: 'it',
      });
    }
    return bio;
  }

  const discovery = build.discovery;
  if (discovery) {
    const taken = act.taken?.name;
    bio.discovery = {
      foundById: discovery.byId,
      foundAt: discovery.placeId,
      foundTick: discovery.tick,
      foundText:
        act.type === 'robbery'
          ? `${who(discovery.byId)} found the door at ${PL(discovery.placeId)} shut and ${taken ?? 'the box'} gone, at ${clock(discovery.tick)}.`
          : `${who(discovery.byId)} found ${V} at ${PL(discovery.placeId)} at ${clock(discovery.tick)}.`,
      precinct,
    };
    // The one who walked in on it is often the one who then walks up the
    // stairs to hire somebody, and on page one they are saying it themselves.
    if (discovery.byId === cast.client.id) {
      bio.discovery.foundTextFirst =
        act.type === 'robbery'
          ? `I found the door at ${PL(discovery.placeId)} shut and ${taken ?? 'the box'} gone, at ${spokenClock(discovery.tick)}.`
          : `I found ${V} at ${PL(discovery.placeId)} at ${spokenClock(discovery.tick)}.`;
      bio.discovery.foundPrompt = promptFor(
        rng,
        act.type === 'robbery' ? 'robbery' : 'murder',
        { V, L: PL(discovery.placeId), thing: taken ?? 'the box' },
      );
    }
  }
  return bio;
}

/** One of the three shapes, filled. A shape with an empty slot is skipped. */
function promptFor(
  rng: Rng,
  shape: 'murder' | 'robbery' | 'missing',
  slots: Record<string, string>,
): string {
  const pool = DISCOVERY_PROMPTS[shape];
  const start = rng.int(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const template = pool[(start + i) % pool.length] as string;
    let text = template;
    let ok = true;
    for (const name of new Set(template.match(/\{(\w+)\}/g) ?? [])) {
      const value = slots[name.slice(1, -1)];
      if (value === undefined || value.length === 0) {
        ok = false;
        break;
      }
      text = text.split(name).join(value);
    }
    if (ok) return text;
  }
  return '';
}
