/**
 * The report is the ending.
 *
 * M5 §5: one point per unknown, and the unknowns are `case.act.unknowns` —
 * three for a body found where it happened, four when it was moved, three
 * quite different ones for an inside job. Everything the briefing stated is a
 * given and is not scored, because it was never asked.
 *
 * Four ways for the night to close, keyed off the first unknown the case asks:
 * the one that names somebody, or, for a disappearance where nobody did
 * anything to anybody, where they went.
 */

import { clock } from '../gen/types.js';
import type { CaseType, Id, Tick, Unknown } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { gamePar, personName, placeName } from './derive.js';
import {
  answerFor,
  fieldsFor,
  missedPhrase,
  readable,
  truthFor,
} from './report-form.js';
import type { Report, RunState } from './types.js';
import { columnFor } from './report-form.js';
import { proofsFor, truthColumn, type Proof } from './m9.js';
import { Dealer, tagIs } from './voice/index.js';
import { nounOf, pronounOf } from './voice/cast.js';

export type Outcome = 'solved' | 'wrong-man' | 'thin' | 'cold';

export interface FieldResult {
  key: Unknown;
  label: string;
  given: string;
  truth: string;
  correct: boolean;
  answered: boolean;
}

/** M9 §5: one cell of the crime column, scored against where they truly were. */
export interface ColumnResult {
  personId: Id;
  name: string;
  given: string;
  truth: string;
  correct: boolean;
  answered: boolean;
}

export interface Verdict {
  /** M9 §5: the crime column, cell by cell; empty where the report does not ask it. */
  column: ColumnResult[];
  /** The half hour the column is about, as the clock says it. */
  columnTime?: string;
  /**
   * M9 §8: behind the curtain, the rule chain that proves each thing the
   * report asked — who, when, and each cell of the column.
   */
  proofs?: { label: string; proof: Proof }[];
  points: number;
  /** How many the case asked. `points` out of this. */
  asked: number;
  outcome: Outcome;
  fields: FieldResult[];
  actionsUsed: number;
  par: number;
  /** The closing page, in the book's voice. Paragraphs. */
  closing: string[];
  /** Where the engine wrote a closing the endings deck should have. */
  gaps: string[];
  /** The deck cards the closing page dealt, for the reader's history (docs/25). */
  cardsUsed?: string[];
}

export function scoreReport(
  view: CaseView,
  state: RunState,
  report: Report,
  /** The reader's history (docs/25): the last line is one they have not read. */
  history: Iterable<string> = [],
): Verdict {
  const fields: FieldResult[] = fieldsFor(view).map((spec) => {
    const given = answerFor(report, spec.key);
    const truth = truthFor(view, spec.key);
    return {
      key: spec.key,
      label: spec.label,
      given: readable(view, spec.key, given),
      truth: readable(view, spec.key, truth),
      correct: given !== null && given === truth,
      answered: given !== null,
    };
  });

  // M9 §5: the column, cell by cell, like Obra Dinn's fates.
  const truthCol = truthColumn(view);
  const column: ColumnResult[] = columnFor(view).map((spec) => {
    const given = report.column?.[spec.personId] ?? null;
    const truth = truthCol[spec.personId] ?? null;
    return {
      personId: spec.personId,
      name: spec.label,
      given: given === null ? 'I don’t know' : placeName(view, given),
      truth: placeName(view, truth),
      correct: given !== null && given === truth,
      answered: given !== null,
    };
  });
  const points = fields.filter((f) => f.correct).length + column.filter((c) => c.correct).length;
  const asked = fields.length + column.length;
  // The field the night turns on: the one that names a person where the case
  // asks for one, and otherwise the first thing it asks at all.
  const primary = (fields.find((f) => f.key === 'who') ?? fields[0]) as FieldResult | undefined;
  const outcome: Outcome =
    primary === undefined || !primary.answered
      ? 'cold'
      : !primary.correct
        ? 'wrong-man'
        : points === asked
          ? 'solved'
          : 'thin';

  const closing = closingFor(view, state, fields, outcome, points, report, column, history);
  const proofs = column.length > 0 || view.kase.logic ? proofLines(view) : undefined;
  return {
    column,
    ...(column.length > 0 ? { columnTime: clock(view.kase.solution.murderTick as Tick) } : {}),
    ...(proofs && proofs.length > 0 ? { proofs } : {}),
    points,
    asked,
    outcome,
    fields,
    actionsUsed: state.actionsUsed,
    // M4b §B.3, M5 §6: the night is judged against the game's par, which is the
    // case's plus the walk from the office and whatever the start costs.
    par: gamePar(view.kase),
    closing: closing.paragraphs,
    gaps: closing.gaps,
    cardsUsed: closing.cardsUsed,
  };
}

function parLine(used: number, par: number): string {
  if (used < par) return `It took me ${used} calls. It could have been done in ${par}. I will not be telling anybody.`;
  if (used === par) return `${used} calls, which is exactly what the night was worth.`;
  return `It took me ${used} calls. A better detective would have done it in ${par}.`;
}

/**
 * M5 §5 — one closing paragraph per (type, outcome), in code.
 *
 * The endings deck is thirty cards and every one of them is about a hanging,
 * because until this milestone every case was a murder. The deck gains
 * `caseType` and `trope` tags and the content branch will write the other
 * eighteen cells; until then a robbery and a disappearance close on a
 * hand-written paragraph here, and the gap is logged so the list the content
 * team works from has it on it.
 */
type ClosingSet = Record<Outcome, (ctx: ClosingContext) => string[]>;

interface ClosingContext {
  actor: string;
  victim: string;
  where: string;
  when: string;
  named: string;
  /** Man or woman, and he or she, for the one the report named. */
  namedNoun: string;
  namedThem: string;
  taken: string;
  goods: string;
  whereabouts: string;
  wrong: string[];
  points: number;
  asked: number;
  par: string;
}

const MURDER: ClosingSet = {
  solved: (c) => [
    `The DA reads it twice and does not find anything to argue with. ${c.actor} killed ${c.victim} at ${c.where}, ${c.when}, and the jury takes ninety minutes over lunch.`,
    `${c.actor} hangs in the spring. I am told it rained. ${c.points} out of ${c.asked}, and ${lowerFirst(c.par)}`,
  ],
  'wrong-man': (c) => [
    `They take ${c.named} at the arraignment and nobody in the room looks surprised except ${c.named}.`,
    `It was ${c.actor}. ${c.actor} was at ${c.where} at ${c.when}. **The wrong ${c.namedNoun} hangs**, and I signed the page that hanged ${c.namedThem}.`,
  ],
  thin: (c) => [
    `They indict ${c.actor} on what I gave them, and what I gave them is thin. The ${c.wrong.join(', ')} never got nailed down, and the defence spends four days on it.`,
    `A conviction, in the end, and everybody agrees not to talk about how. ${c.points} out of ${c.asked}. ${c.par}`,
  ],
  cold: (c) => [
    `I hand over what I have, which is paper with holes in it. The DA files it with the others.`,
    `${c.victim} stays dead and the case goes cold. It was ${c.actor}, at ${c.where}, ${c.when}, and the file will say so in nineteen years when nobody is left to care.`,
  ],
};

const ROBBERY: ClosingSet = {
  solved: (c) => [
    `Nobody hangs for a robbery. ${c.actor} took ${c.taken} out of ${c.where} at ${c.when}, and ${c.goods} is where it went, and the precinct sends two men round before breakfast.`,
    `${c.victim} gets most of it back and thanks nobody. ${c.points} out of ${c.asked}, and ${lowerFirst(c.par)}`,
  ],
  'wrong-man': (c) => [
    `They put it on ${c.named}, who has no answer for where they were and no money to buy one.`,
    `It was ${c.actor}, and ${c.taken} went to ${c.goods} the same night. **The wrong ${c.namedNoun} does the time**, and my name is on the page that sent ${c.namedThem}.`,
  ],
  thin: (c) => [
    `They charge ${c.actor} with what I could prove, which is not the half of it. The ${c.wrong.join(', ')} never got settled, and a lawyer will make an afternoon of that.`,
    `A guilty plea, in the end, and ${c.victim} is still short. ${c.points} out of ${c.asked}. ${c.par}`,
  ],
  cold: (c) => [
    `I hand in a file with a hole where the name goes. Nobody is charged with anything.`,
    `${c.taken} does not come back. It was ${c.actor}, and it went to ${c.goods}, and the only man who knows that is me.`,
  ],
};

const MISSING: ClosingSet = {
  solved: (c) => [
    `${c.victim} is at ${c.whereabouts}, and has been since ${c.when}, and did not want finding.`,
    `I write the address down and I do not write down what it cost to get it. ${c.points} out of ${c.asked}, and ${lowerFirst(c.par)}`,
  ],
  'wrong-man': (c) => [
    `I put ${c.named} in the report and the precinct spends a week on ${c.named} for nothing.`,
    `${c.victim} is at ${c.whereabouts}. **I sent them looking in the wrong direction**, and the week is not coming back.`,
  ],
  thin: (c) => [
    `I file an address and not much round it. The ${c.wrong.join(', ')} is still open, and the family will ask me about it for years.`,
    `${c.victim} is found, which is the part that counts. ${c.points} out of ${c.asked}. ${c.par}`,
  ],
  cold: (c) => [
    `I hand back the retainer, most of it, and say what a man says.`,
    `${c.victim} was at ${c.whereabouts} the whole time. Nobody in this neighbourhood will know that for nineteen years.`,
  ],
};

const BY_TYPE: Record<CaseType, ClosingSet> = {
  murder: MURDER,
  robbery: ROBBERY,
  missing: MISSING,
  'lost-pet': ROBBERY,
  'lost-item': ROBBERY,
  affair: MISSING,
};

function closingFor(
  view: CaseView,
  state: RunState,
  fields: FieldResult[],
  outcome: Outcome,
  points: number,
  report: Report,
  column: ColumnResult[] = [],
  history: Iterable<string> = [],
): { paragraphs: string[]; gaps: string[]; cardsUsed: string[] } {
  const kase = view.kase;
  const act = kase.act;
  const gaps: string[] = [];
  const actor = personName(view, kase.solution.killerId);
  const namedId = answerFor(report, 'who');
  const namedPerson = namedId === null ? undefined : view.personById.get(namedId);
  const ctx: ClosingContext = {
    actor,
    victim: view.victim.surname,
    where: placeName(view, kase.solution.murderPlaceId),
    when: clock(kase.solution.murderTick as Tick),
    named: fields.find((f) => f.key === 'who')?.given ?? 'somebody',
    // Half the cast is not a man, and the report says which one it named.
    namedNoun: nounOf(namedPerson),
    namedThem: namedPerson === undefined ? 'them' : objectPronounOf(namedPerson),
    taken: act.taken?.name ?? 'what was taken',
    goods: act.goodsWentTo ? placeName(view, act.goodsWentTo) : 'wherever it went',
    whereabouts:
      act.whereabouts === undefined || act.whereabouts === 'gone'
        ? 'out of the city'
        : placeName(view, act.whereabouts),
    wrong: [
      ...fields.filter((f) => !f.correct).map((f) => f.label.toLowerCase()),
      ...(column.some((c) => !c.correct) ? ['column of where everybody was'] : []),
    ],
    points,
    asked: fields.length + column.length,
    par: parLine(state.actionsUsed, gamePar(kase)),
  };
  if (ctx.wrong.length === 0) ctx.wrong = ['rest of it'];

  const out = (BY_TYPE[act.type] ?? MURDER)[outcome](ctx);
  // M9 §8: the closing page says which ones the detective got.
  const got = columnLine(view, fields, column);
  if (got) out.splice(1, 0, got);

  // The deck's last paragraph, keyed by how the night went, by whether it beat
  // par, and by the case type. The deck now has two cards for each (type,
  // outcome) a robbery or a disappearance can reach, so the paragraphs above
  // are the body of the page and the card is its last line — which is what
  // they have always been for a murder. The gap is logged when the draw comes
  // back empty, and only then.
  const parDelta =
    state.actionsUsed < gamePar(kase) ? 'under' : state.actionsUsed === gamePar(kase) ? 'at' : 'over';
  const deckOutcome = outcome === 'thin' ? 'thin-case' : outcome;
  // Off the case seed and the reader's history, so one reader's one case
  // closes the same way however often the page is drawn (storage.ts keeps the
  // history as it stood when the page was first read).
  const dealer = new Dealer((kase.seed * 8191 + points) >>> 0, [], history);
  const fits = (c: Parameters<typeof tagIs>[1]): boolean =>
    tagIs('endings', c, 'caseType', act.type) && tagIs('endings', c, 'trope', act.tropeId);
  const ending = dealer.draw(
    'endings',
    [
      (c) =>
        fits(c) && tagIs('endings', c, 'outcome', deckOutcome) && tagIs('endings', c, 'parDelta', parDelta),
      (c) => fits(c) && tagIs('endings', c, 'outcome', deckOutcome),
    ],
    {
      detective: state.detectiveName,
      killer: actor,
      name: actor,
      place: ctx.where,
      time: ctx.when,
      // §5: the wrong-man ending names the unknown that was wrong.
      missed: missedList(view, fields) ?? missedLead(view, state),
    },
    true,
  );
  if (ending) out.push(ending.text);
  else {
    gaps.push(
      `missing-deck: endings has no ${act.type} × ${outcome} card; the hand-written closing stood alone`,
    );
  }
  return { paragraphs: out, gaps, cardsUsed: dealer.spent };
}

/**
 * What the report got, in the book's plain voice: the questions it answered
 * right, and down the column, who it had where. At Hard-boiled a right name
 * over a wrong column is partial credit, and the page says so.
 */
function columnLine(view: CaseView, fields: FieldResult[], column: ColumnResult[]): string | null {
  if (column.length === 0) return null;
  const right = column.filter((c) => c.correct);
  const wrong = column.filter((c) => !c.correct);
  const when = clock(view.kase.solution.murderTick as Tick);
  const who = fields.find((f) => f.key === 'who');
  const list = (xs: string[]): string =>
    xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
  const parts: string[] = [];
  parts.push(
    `The DA went down the column for ${when}. I had ${right.length} of ${column.length} where they were` +
      (right.length > 0 ? `: ${list(right.map((c) => `${c.name} at ${c.truth}`))}.` : '.'),
  );
  if (wrong.length > 0) {
    parts.push(
      `I had ${list(wrong.map((c) => (c.answered ? `${c.name} at ${c.given}, and it was ${c.truth}` : `nothing for ${c.name}, who was at ${c.truth}`)))}.`,
    );
    if (who?.correct) parts.push('The name was right. The column under it was not, and that is partial credit.');
  }
  return parts.join(' ');
}

/** The curtain's proofs, as label and chain. */
function proofLines(view: CaseView): { label: string; proof: Proof }[] {
  const proofs = proofsFor(view);
  const out: { label: string; proof: Proof }[] = [];
  if (proofs.who) out.push({ label: 'Who', proof: proofs.who });
  if (proofs.when) out.push({ label: 'When', proof: proofs.when });
  for (const p of columnFor(view)) {
    const proof = proofs.column[p.personId];
    if (proof) out.push({ label: `Where ${p.label} was`, proof });
  }
  return out;
}

/** Him or her, for a sentence where the person is what was done to. */
function objectPronounOf(person: Parameters<typeof pronounOf>[0]): string {
  return pronounOf(person) === 'she' ? 'her' : 'him';
}

/** The unknowns the report got wrong, as a noun phrase the deck can print. */
function missedList(view: CaseView, fields: FieldResult[]): string | null {
  const wrong = fields.filter((f) => !f.correct).map((f) => missedPhrase(view, f.key));
  if (wrong.length === 0) return null;
  if (wrong.length === 1) return wrong[0] as string;
  return `${wrong.slice(0, -1).join(', ')} and ${wrong[wrong.length - 1]}`;
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

export type { Id };

/** Lowercase only the first letter, so "I" and names inside the line survive. */
function lowerFirst(text: string): string {
  return text.startsWith('I ') ? text : `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
