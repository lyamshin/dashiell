import {
  TICKS,
  clock,
  type Act,
  type ClientBrief,
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
import type { Dials } from './shape.js';

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

/**
 * The same eight, as the client says them on page one, three ways each.
 *
 * Hone 2 §Track B. The price of hiring somebody is the second thing the client
 * says without being asked, and it used to be one twenty-word clause. Two or
 * three sentences now, one of them short, and the variant is the same index as
 * the purpose it sits beside: a purpose and its price, written together.
 */
const COST_TEXT_FIRST: Record<Purpose, string[]> = {
  'find-the-killer-police-wont': [
    'I know that asking questions on this block is a way of being asked some. I know that much.',
    'On this block, asking questions is a way of being asked some. I know that. I came anyway.',
    'I know what it costs to ask questions on this block. A person who asks gets asked.',
  ],
  'clear-my-name': [
    'I was near enough to it that night. I know how it looks. I would rather say so myself.',
    'I know how it looks. I was near enough to it that night, and I would rather say so first.',
    'I was near enough that night. I know exactly how it looks, and I am saying so first.',
  ],
  'keep-it-quiet': [
    'I am paying to have something found. And then not said.',
    'I want it found. I do not want it said. That is what I am paying for.',
    'I am paying for two things. One is that it is found. The other is that nobody hears about it.',
  ],
  'find-it-before-the-cops': [
    'I would rather not explain to a sergeant what it was doing there. Or explain at all.',
    'A sergeant would want to know what it was doing there. I would rather not say. Not to him.',
    'I do not want a sergeant asking what it was doing there. I have no answer ready.',
  ],
  'get-it-back': [
    'I cannot report the loss. Not without saying where the thing came from.',
    'To report it I would have to say where it came from. I cannot do that.',
    'I cannot go to the police. They would ask where the thing came from. I would have to answer.',
  ],
  'bring-them-home': [
    'I have been to the precinct twice. I was sent away twice.',
    'The precinct has had me twice. They sent me away twice. That is why I came here.',
    'I went to the precinct twice. They sent me away twice. I am not going a third time.',
  ],
  'make-sure-they-stay-gone': [
    'I do not want it known that this is what I am paying for. Not by anybody.',
    'Nobody is to know what I am paying for. Not this. Not any of it.',
    'This is what I am paying for. I do not want it known. Not by anybody on the block.',
  ],
  'settle-a-debt-with-the-dead': [
    'I am spending money I was owed. I may never see it.',
    'The money I am spending is money I was owed. I may never see any of it. I am spending it anyway.',
    'I was owed this money. I am spending it to find out, and I may never see it back.',
  ],
};

/**
 * §A.1 — the question the pointer answers.
 *
 * The shortest of the three, because the answer is a name and the page has
 * been waiting for it since the stairs. Anything here is answerable only by
 * the sentence that names somebody.
 */
export const POINTER_PROMPTS: string[] = [
  'Who do you think did it?',
  'Who would do that to {V}?',
  'Who did {V} cross?',
  'Who was no friend of {V}?',
  'Who had a reason to want {V} out of the way?',
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
  /** M7: the ladder decides the red herring; the shape, whether motives are in play. */
  dials: Dials;
}

export function buildClientBrief(input: ClientBriefInput): ClientBrief {
  const { rng, cast, setting, build, act, dials } = input;
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
  /*
   * Hone 2 §Track B. One draw covers three things: what the client says she
   * wants, what she says it costs her, and the question Dashiell asks for it.
   * They were written as a set — the question asks for the fact that answer
   * gives, and the price is the same person's second breath — so drawing them
   * apart would only let the engine pair a question with an answer no writer
   * ever put behind it.
   */
  const prompts = PURPOSE_PROMPTS[purpose] ?? PURPOSE_PROMPTS['find-the-killer-police-wont'];
  const variant = rng.int(prompts.length);
  const firsts = living?.first ?? PURPOSE_TEXT_FIRST[purpose];
  const costs = COST_TEXT_FIRST[purpose];
  const purposeTextFirst = fillSlots(
    (firsts[variant] ?? firsts[0]) as string,
    slots,
  );
  const cost = `${fillSlots(COST_TEXT[purpose], slots)}`;
  const costFirst = fillSlots((costs[variant] ?? costs[0]) as string, slots);
  const purposePrompt = fillSlots((prompts[variant] ?? prompts[0]) as string, slots);
  // Most of them name the victim, which is also the noun her last sentence
  // ended on: the golden loop's §2 joiner, written into the question itself
  // rather than chosen for it afterwards.
  const pointerPrompt = fillSlots(rng.pick(POINTER_PROMPTS), slots);

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
  } else if (dials.ladder.clientRedHerring && branchable.length > 0 && rng.chance(0.5)) {
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
  } else if (dials.shape.innocentMotives === 0) {
    // M7: below Medium only the culprit has a motive, so a client who named a
    // motive would be naming the answer. The client names somebody and says
    // only what anybody on the block could say about them.
    // M9: and never at the culprit.
    const target = rng.pick(dials.plain ? others : others.filter((p) => !p.isKiller)) as Person;
    pointsAt = {
      personId: target.id,
      reason: `${who(target.id)} was in and out of there all week`,
      honest: false,
    };
  } else if (!dials.plain) {
    // M9 (spec, "What the diagnosis changed"): no coin that lands on the
    // culprit. Below Hard-boiled the client points at an innocent with a
    // motive; from Hard-boiled on at anybody but themselves, uniformly, which
    // is no more often the culprit than chance.
    const innocentMotived = motived.filter((p) => !p.isKiller);
    const target = dials.shape.clientMayBeCulprit
      ? (rng.pick(others) as Person)
      : (rng.pick(innocentMotived.length > 0 ? innocentMotived : others.filter((p) => !p.isKiller)) as Person);
    pointsAt = {
      personId: target.id,
      reason: `${who(target.id)} ${target.motive?.description ?? 'was in and out of there all week'}`,
      honest: target.motive !== undefined,
    };
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
