import {
  TICKS,
  clock,
  type Act,
  type ClientBrief,
  type Difficulty,
  type Fact,
  type Id,
  type Person,
  type Purpose,
  type Tick,
} from './types.js';
import type { Cast } from './cast.js';
import type { Setting } from './setting.js';
import type { ScheduleBuild } from './schedule.js';
import {
  PURPOSE_PROMPTS,
  PURPOSE_TEXT,
  PURPOSE_TEXT_FIRST,
  PURPOSE_TEXT_LIVING,
  RELATIONSHIP_BY_ID,
  type PurposeWeights,
} from './data/cast.js';
import { SECRET_BY_TYPE } from './data/secrets.js';
import { fillSlots } from './dossier.js';
import { framedPerson } from './tropes/index.js';
import type { Rng } from './rng.js';

/**
 * M5 §1.4. Somebody walked up the stairs and asked for help, and until now
 * that somebody changed nothing. The brief says what they want, what they say,
 * what they keep back, who they would rather you looked at, and what they
 * claim they were doing themselves.
 *
 * The purpose is drawn by relationship × case type, so that it makes sense: a
 * cousin does not hire you to keep it quiet. The pointer is honest at the
 * lower difficulties — a real motive belonging to a real person — and at
 * difficulty 3 it may be the head of the client's own red herring. When the
 * client is the killer it is never honest: it is the frame.
 */

/** What hiring a detective costs the person who does it, by purpose. */
const COST_TEXT: Record<Purpose, string> = {
  'find-the-killer-police-wont':
    '{P} knows that asking questions on this block is a way of being asked some.',
  'clear-my-name':
    '{P} was near enough to it that night to know exactly how it looks, and says so first.',
  'keep-it-quiet': '{P} is paying to have something found and then not said.',
  'find-it-before-the-cops': '{P} would rather not explain to a sergeant what it was doing there.',
  'get-it-back': '{P} cannot report the loss without saying where the thing came from.',
  'bring-them-home': '{P} has been to the precinct twice already and was sent away twice.',
  'make-sure-they-stay-gone': '{P} does not want it known that this is what {P} is paying for.',
  'settle-a-debt-with-the-dead': '{P} is spending money {P} was owed and may never see.',
};

/** The same eight, as the client says them on page one. */
const COST_TEXT_FIRST: Record<Purpose, string> = {
  'find-the-killer-police-wont':
    'I know that asking questions on this block is a way of being asked some.',
  'clear-my-name':
    'I was near enough to it that night to know how it looks, so I am saying it first.',
  'keep-it-quiet': 'I am paying to have something found and then not said.',
  'find-it-before-the-cops': 'I would rather not explain to a sergeant what it was doing there.',
  'get-it-back': 'I cannot report the loss without saying where the thing came from.',
  'bring-them-home': 'I have been to the precinct twice already and was sent away twice.',
  'make-sure-they-stay-gone': 'I do not want it known that this is what I am paying for.',
  'settle-a-debt-with-the-dead': 'I am spending money I was owed and may never see.',
};

/**
 * §A.1 — the question the pointer answers.
 *
 * The shortest of the three, because the answer is a name and the page has
 * been waiting for it since the stairs. Anything here is answerable only by
 * the sentence that names somebody.
 */
export const POINTER_PROMPTS: string[] = [
  'Who do you like for it?',
  'Who would you have me start with?',
  'Give me a name.',
  'Who is it you are thinking of?',
  'Whose name have you got?',
];

/** How much heavier the quiet purposes weigh when the client did it. */
const KILLER_COVER_BIAS = 3;

/** The pronouns a sentence about somebody else needs, by their gender. */
function possessiveOf(person: Person | undefined): string {
  return person?.dossier?.gender === 'f' || person?.gender === 'f' ? 'her' : 'his';
}

function subjectOf(person: Person | undefined): string {
  return person?.dossier?.gender === 'f' || person?.gender === 'f' ? 'she' : 'he';
}

/**
 * A reason as somebody would say it out loud.
 *
 * The motive templates carry the holder's name twice — "blamed {V} for the
 * ruin of {P}'s business" — because a line of the sheet is read on its own and
 * a pronoun in it would point at nothing. In a sentence somebody says, the
 * second mention is a pronoun. Only mentions *after* the first are touched, so
 * the sentence still opens on a name.
 */
export function spokenReason(reason: string, target: Person): string {
  const surname = target.surname;
  const at = reason.indexOf(surname);
  if (at < 0) return reason;
  const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cut = at + surname.length;
  const tail = reason
    .slice(cut)
    .replace(new RegExp(`\\b${escaped}[\u2019']s`, 'g'), possessiveOf(target))
    .replace(new RegExp(`\\b${escaped}\\b`, 'g'), subjectOf(target));
  return reason.slice(0, cut) + tail;
}

/**
 * One draw from a cell of the purpose table (M5 §1.4).
 *
 * A cell is eligibility and weight in one: a purpose is in it only when the
 * sentence about what it costs is true of that relationship, and the weight
 * says how much of the cell it takes. Before the weights the draw was uniform
 * over the eligible list, so `clear-my-name` — which almost every relationship
 * can honestly claim — was 46.5% of four hundred cases by arithmetic alone.
 */
export function drawPurpose(rng: Rng, weights: PurposeWeights): Purpose | null {
  const entries = (Object.entries(weights) as [Purpose, number][]).filter(([, w]) => w > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [purpose, weight] of entries) {
    roll -= weight;
    if (roll < 0) return purpose;
  }
  return entries[entries.length - 1]?.[0] ?? null;
}

export interface ClientBriefInput {
  rng: Rng;
  cast: Cast;
  setting: Setting;
  build: ScheduleBuild;
  act: Act;
  difficulty: Difficulty;
}

export function buildClientBrief(input: ClientBriefInput): ClientBrief {
  const { rng, cast, setting, build, act, difficulty } = input;
  const client = cast.client;
  const V = cast.victim.surname;
  const PL = (id: Id | null | undefined): string =>
    id ? (setting.places.find((p) => p.id === id)?.shortName ?? id) : 'somewhere';
  const who = (id: Id): string => cast.people.find((p) => p.id === id)?.surname ?? id;

  /* --- purpose ---------------------------------------------------------- */
  const rel = RELATIONSHIP_BY_ID[client.relationshipId as Id];
  const allowed: PurposeWeights = rel?.purposes[act.type] ?? {
    'find-the-killer-police-wont': 1,
  };
  // A killer who hires a detective is buying cover, so the quiet two weigh
  // three times what the relationship gives them. They are not the only cover
  // there is — walking in and asking for the killer to be found is the oldest
  // one in the genre — so the rest of the cell stays in the draw. Restricting
  // it outright was the old rule, and with the client the killer in a quarter
  // of cases it put a quarter of every distribution on two purposes.
  const cell: PurposeWeights = { ...allowed };
  if (client.isKiller) {
    for (const p of ['keep-it-quiet', 'clear-my-name'] as Purpose[]) {
      const w = cell[p];
      if (w !== undefined) cell[p] = w * KILLER_COVER_BIAS;
    }
  }
  const purpose = (drawPurpose(rng, cell) ?? 'find-the-killer-police-wont') as Purpose;
  // A robbery's owner is alive and a missing person may be, so the one purpose
  // written around a death says it another way for them.
  const living = act.type === 'murder' ? undefined : PURPOSE_TEXT_LIVING[purpose];
  const slots = { victim: V, person: client.surname, place: '', year: '' };
  const purposeText = `${client.surname} ${fillSlots(living?.third ?? PURPOSE_TEXT[purpose], slots)}.`;
  const purposeTextFirst = `I ${fillSlots(living?.first ?? PURPOSE_TEXT_FIRST[purpose], slots)}.`;
  const cost = `${fillSlots(COST_TEXT[purpose], slots)}`;
  const costFirst = `${fillSlots(COST_TEXT_FIRST[purpose], slots)}`;
  // Three variants a purpose, drawn here beside the sentence they ask for.
  const purposePrompt = fillSlots(
    rng.pick(PURPOSE_PROMPTS[purpose] ?? PURPOSE_PROMPTS['find-the-killer-police-wont']),
    slots,
  );
  const pointerPrompt = rng.pick(POINTER_PROMPTS);

  /* --- the pointer ------------------------------------------------------ */
  const others = cast.suspects.filter((p) => p.id !== client.id);
  const motived = others.filter((p) => p.motive);
  const branchable = cast.innocents.filter(
    (p) => p.id !== client.id && build.secrets[p.id] && SECRET_BY_TYPE[build.secrets[p.id]!.type],
  );

  let pointsAt: Omit<ClientBrief['points'], 'reasonSpoken'>;
  if (client.isKiller) {
    // The frame. A real person with a real motive, and the wrong one.
    const target =
      motived.find((p) => !p.isKiller) ??
      framedPerson(cast.innocents.filter((p) => p.id !== client.id), act.tick);
    pointsAt = {
      personId: target.id,
      reason: `${who(target.id)} ${target.motive?.description ?? 'was in and out of there all week'}`,
      honest: false,
    };
  } else if (difficulty === 3 && branchable.length > 0 && rng.chance(0.5)) {
    // The client's own red herring: the head of a noise branch, told straight.
    const target = rng.pick(branchable);
    const secret = build.secrets[target.id] as { type: string; cells: { place: Id }[] };
    const hint = (SECRET_BY_TYPE[secret.type]?.hints[0] ?? '{P} has been hard to find lately.')
      .split('{P}').join(who(target.id))
      .split('{Q}').join(V)
      .split('{V}').join(V)
      .split('{L}').join(PL(secret.cells[0]?.place))
      .split('{T}').join(clock(act.tick));
    pointsAt = { personId: target.id, reason: hint, honest: false };
  } else {
    const pool = motived.length > 0 ? motived : others;
    const target =
      (rng.chance(0.5) ? pool.find((p) => p.isKiller) : undefined) ?? (rng.pick(pool) as Person);
    pointsAt = {
      personId: target.id,
      reason: `${who(target.id)} ${target.motive?.description ?? 'was in and out of there all week'}`,
      honest: target.motive !== undefined,
    };
  }

  // The sheet reads a reason on its own, so it carries the name twice where
  // the motive template does. In the client's mouth the second one is a
  // pronoun, and it is still somebody else's pronoun: "Grasso blamed Sweeney
  // for the ruin of his business."
  const suspected = cast.people.find((p) => p.id === pointsAt.personId) as Person;
  const points: ClientBrief['points'] = {
    ...pointsAt,
    reasonSpoken: spokenReason(pointsAt.reason, suspected),
  };

  /* --- what they say ---------------------------------------------------- */
  const tells: Fact[] = act.givens.facts.slice();
  const tellTexts: string[] = act.givens.text.slice();
  const pointed = cast.people.find((p) => p.id === points.personId) as Person;
  if (points.honest && pointed.motive) {
    tells.push({
      kind: 'hasMotive',
      personId: pointed.id,
      motiveType: pointed.motive.type,
    });
  }
  tellTexts.push(`${client.surname} would rather we started with ${who(pointed.id)}: ${points.reason}.`);

  /* --- what they do not say --------------------------------------------- */
  const withholds: Fact[] = [];
  const withholdTexts: string[] = [];
  // The cast's people are the pre-schedule copies, so the secret is read off
  // the build rather than off the person.
  const ownSecret = build.secrets[client.id];
  if (ownSecret && !client.isKiller) {
    withholds.push({
      kind: 'secretExplained',
      personId: client.id,
      secretType: ownSecret.type,
    });
    withholdTexts.push(
      `${client.surname} does not mention it, but ${ownSecret.description || 'there is something being kept back.'}`,
    );
  }
  if (client.isKiller) {
    withholds.push({
      kind: 'personAt',
      personId: client.id,
      place: act.place,
      tick: act.tick,
    });
    withholdTexts.push(
      `${client.surname} does not mention being at ${PL(act.place)} at ${clock(act.tick)}, which is where ${client.surname} was.`,
    );
  }

  /* --- their own evening, as they tell it -------------------------------- */
  const claimed = build.claimed[client.id] as (Id | null)[];
  const ownEvening: string[] = [];
  let t = 0;
  while (t < TICKS) {
    const here = claimed[t];
    if (!here) {
      t++;
      continue;
    }
    let end = t;
    while (end + 1 < TICKS && claimed[end + 1] === here) end++;
    const they = client.gender === 'f' ? 'she' : 'he';
    ownEvening.push(
      end === t
        ? `${client.surname} says ${they} was at ${PL(here)} at ${clock(t as Tick)}.`
        : `${client.surname} says ${they} was at ${PL(here)} from ${clock(t as Tick)} to ${clock(end as Tick)}.`,
    );
    t = end + 1;
  }

  return {
    purpose,
    purposeText,
    purposeTextFirst,
    purposePrompt,
    pointerPrompt,
    cost,
    costFirst,
    tells,
    tellTexts,
    withholds,
    withholdTexts,
    points,
    ownEvening: ownEvening.slice(0, 4),
  };
}
