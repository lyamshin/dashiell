/**
 * The report is the ending. Five fields, one point each, and four ways for the
 * night to close.
 */

import { clock } from '../gen/types.js';
import type { Id } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { METHOD_POOL, MOTIVE_POOL, gamePar, personName, placeName } from './derive.js';
import type { Report, RunState } from './types.js';
import { Dealer, tagIs } from './voice/index.js';

export type Outcome = 'solved' | 'wrong-man' | 'thin' | 'cold';

export interface FieldResult {
  key: 'who' | 'how' | 'why' | 'when' | 'where';
  label: string;
  given: string;
  truth: string;
  correct: boolean;
  answered: boolean;
}

export interface Verdict {
  points: number;
  outcome: Outcome;
  fields: FieldResult[];
  actionsUsed: number;
  par: number;
  /** The closing page, in the book's voice. Paragraphs. */
  closing: string[];
}

function methodName(id: Id | null): string {
  if (!id) return '—';
  return METHOD_POOL.find((m) => m.id === id)?.name ?? id;
}

function motiveName(type: string | null): string {
  if (!type) return '—';
  const hit = MOTIVE_POOL.find((m) => m.type === type);
  return hit ? `${hit.type} — ${hit.description}` : type;
}

export function scoreReport(view: CaseView, state: RunState, report: Report): Verdict {
  const truth = view.kase.solution;
  const fields: FieldResult[] = [
    {
      key: 'who',
      label: 'Who killed the victim',
      given: report.killerId ? personName(view, report.killerId) : 'I don’t know',
      truth: personName(view, truth.killerId),
      correct: report.killerId === truth.killerId,
      answered: report.killerId !== null,
    },
    {
      key: 'how',
      label: 'How',
      given: report.methodId ? methodName(report.methodId) : 'I don’t know',
      truth: methodName(truth.methodId),
      correct: report.methodId === truth.methodId,
      answered: report.methodId !== null,
    },
    {
      key: 'why',
      label: 'Why',
      given: report.motiveType ? motiveName(report.motiveType) : 'I don’t know',
      truth: motiveName(truth.motiveType),
      correct: report.motiveType === truth.motiveType,
      answered: report.motiveType !== null,
    },
    {
      key: 'when',
      label: 'When',
      given: report.tick === null ? 'I don’t know' : clock(report.tick),
      truth: clock(truth.murderTick),
      correct: report.tick === truth.murderTick,
      answered: report.tick !== null,
    },
    {
      key: 'where',
      label: 'Where',
      given: report.placeId ? placeName(view, report.placeId) : 'I don’t know',
      truth: placeName(view, truth.murderPlaceId),
      correct: report.placeId === truth.murderPlaceId,
      answered: report.placeId !== null,
    },
  ];

  const points = fields.filter((f) => f.correct).length;
  const who = fields[0] as FieldResult;
  const outcome: Outcome = !who.answered
    ? 'cold'
    : !who.correct
      ? 'wrong-man'
      : points === 5
        ? 'solved'
        : 'thin';

  return {
    points,
    outcome,
    fields,
    actionsUsed: state.actionsUsed,
    // M4b §B.3: the night is judged against the game's par, which is the
    // case's plus the walk from the office.
    par: gamePar(view.kase),
    closing: closingFor(view, state, fields, outcome, points),
  };
}

function parLine(used: number, par: number): string {
  if (used < par) return `It took me ${used} calls. The book says ${par}. I will not be telling anybody.`;
  if (used === par) return `${used} calls, which is exactly what the night was worth.`;
  return `It took me ${used} calls. A better man would have done it in ${par}.`;
}

function closingFor(
  view: CaseView,
  state: RunState,
  fields: FieldResult[],
  outcome: Outcome,
  points: number,
): string[] {
  const kase = view.kase;
  const killer = personName(view, kase.solution.killerId);
  const victim = view.victim.surname;
  const where = placeName(view, kase.solution.murderPlaceId);
  const when = clock(kase.solution.murderTick);
  const out: string[] = [];

  // The endings deck (Part B) writes the last paragraph, keyed by how the
  // night went and by whether it beat par. It burns run to run like the
  // similes do, so a player who files four cases reads four last pages.
  const parDelta =
    state.actionsUsed < gamePar(kase) ? 'under' : state.actionsUsed === gamePar(kase) ? 'at' : 'over';
  const deckOutcome =
    outcome === 'solved' ? 'hanged' : outcome === 'thin' ? 'thin-case' : outcome;
  const dealer = new Dealer((kase.seed * 8191 + points) >>> 0, [], []);
  const ending = dealer.draw(
    'endings',
    [
      (c) => tagIs('endings', c, 'outcome', deckOutcome) && tagIs('endings', c, 'parDelta', parDelta),
      (c) => tagIs('endings', c, 'outcome', deckOutcome),
    ],
    {
      detective: state.detectiveName,
      killer,
      name: killer,
      place: where,
      time: when,
      missed: missedLead(view, state),
    },
    true,
  );

  switch (outcome) {
    case 'solved':
      out.push(
        `The DA reads it twice and does not find anything to argue with. ${killer} killed ${victim} at ${where}, ${when}, and the jury takes ninety minutes over lunch.`,
      );
      out.push(
        `${killer} hangs in the spring. I am told it rained. Five out of five, and ${parLine(
          state.actionsUsed,
          gamePar(kase),
        ).toLowerCase()}`,
      );
      break;
    case 'wrong-man': {
      const named = fields[0]?.given ?? 'somebody';
      out.push(
        `They take ${named} at the arraignment and nobody in the room looks surprised except ${named}.`,
      );
      out.push(
        `It was ${killer}. ${killer} was at ${where} at ${when} and the thing that would have told me so was ${missedLead(
          view,
          state,
        )}. **The wrong man hangs**, and I signed the page that hanged him.`,
      );
      break;
    }
    case 'thin': {
      const wrong = fields.filter((f) => !f.correct).map((f) => f.label.toLowerCase());
      out.push(
        `They indict ${killer} on what I gave them, and what I gave them is thin. The ${wrong.join(
          ', ',
        )} never got nailed down, and the defence spends four days on it.`,
      );
      out.push(
        `A conviction, in the end, and everybody agrees not to talk about how. ${points} out of five. ${parLine(
          state.actionsUsed,
          gamePar(kase),
        )}`,
      );
      break;
    }
    case 'cold':
      out.push(
        `I hand over what I have, which is paper with holes in it. The DA files it with the others.`,
      );
      out.push(
        `${victim} stays dead and the case goes cold. It was ${killer}, at ${where}, ${when}, and the file will say so in nineteen years when nobody is left to care.`,
      );
      break;
  }
  if (ending) out.push(ending.text);
  return out;
}

/** The spine clue that would have named the killer, and whether it was found. */
function missedLead(view: CaseView, state: RunState): string {
  const have = new Set(state.found);
  const path = view.kase.deduction.inculpation;
  const missed = path.find((id) => !have.has(id));
  const clue = view.findableById.get(missed ?? path[0] ?? '');
  if (!clue) return 'never written down anywhere I looked';
  const lead =
    clue.source.type === 'person'
      ? `${personName(view, clue.source.personId)}, on ${clue.source.topic}`
      : `${placeName(view, clue.source.placeId)}, if I had gone through it`;
  return have.has(clue.id) ? `in my own notebook — ${lead}` : lead;
}
