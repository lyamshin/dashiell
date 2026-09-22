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
import { PURPOSE_TEXT, RELATIONSHIP_BY_ID } from './data/cast.js';
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
  const allowed = rel?.purposes[act.type] ?? ['find-the-killer-police-wont'];
  // A killer who hires a detective is buying cover, so out of whatever the
  // relationship allows, the killer takes the quietest option on offer.
  const preferred = client.isKiller
    ? allowed.filter((p) => p === 'keep-it-quiet' || p === 'clear-my-name')
    : [];
  const purpose = rng.pick(preferred.length > 0 ? preferred : allowed) as Purpose;
  const purposeText = `${client.surname} ${fillSlots(PURPOSE_TEXT[purpose], {
    victim: V,
    person: client.surname,
    place: '',
    year: '',
  })}.`;
  const cost = `${fillSlots(COST_TEXT[purpose], {
    victim: V,
    person: client.surname,
    place: '',
    year: '',
  })}`;

  /* --- the pointer ------------------------------------------------------ */
  const others = cast.suspects.filter((p) => p.id !== client.id);
  const motived = others.filter((p) => p.motive);
  const branchable = cast.innocents.filter(
    (p) => p.id !== client.id && p.secret && SECRET_BY_TYPE[p.secret.type],
  );

  let points: ClientBrief['points'];
  if (client.isKiller) {
    // The frame. A real person with a real motive, and the wrong one.
    const target =
      motived.find((p) => !p.isKiller) ??
      framedPerson(cast.innocents.filter((p) => p.id !== client.id), act.tick);
    points = {
      personId: target.id,
      reason: `${who(target.id)} ${target.motive?.description ?? 'was in and out of there all week'}`,
      honest: false,
    };
  } else if (difficulty === 3 && branchable.length > 0 && rng.chance(0.5)) {
    // The client's own red herring: the head of a noise branch, told straight.
    const target = rng.pick(branchable);
    const secret = target.secret as { type: string };
    const hint = (SECRET_BY_TYPE[secret.type]?.hints[0] ?? '{P} has been hard to find lately.')
      .split('{P}').join(who(target.id))
      .split('{Q}').join(V)
      .split('{V}').join(V)
      .split('{L}').join(PL(target.secret?.cells[0]?.place))
      .split('{T}').join(clock(act.tick));
    points = { personId: target.id, reason: hint, honest: false };
  } else {
    const pool = motived.length > 0 ? motived : others;
    const target =
      (rng.chance(0.5) ? pool.find((p) => p.isKiller) : undefined) ?? (rng.pick(pool) as Person);
    points = {
      personId: target.id,
      reason: `${who(target.id)} ${target.motive?.description ?? 'was in and out of there all week'}`,
      honest: target.motive !== undefined,
    };
  }

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
  const ownSecret = client.secret;
  if (ownSecret && !client.isKiller) {
    withholds.push({
      kind: 'secretExplained',
      personId: client.id,
      secretType: ownSecret.type,
    });
    withholdTexts.push(
      `${client.surname} does not mention it, but ${ownSecret.description}`,
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
    cost,
    tells,
    tellTexts,
    withholds,
    withholdTexts,
    points,
    ownEvening: ownEvening.slice(0, 4),
  };
}
