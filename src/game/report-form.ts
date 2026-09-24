/**
 * M5 §5 — the report asks the unknowns.
 *
 * The form used to have five fields because a murder has five things to work
 * out. A robbery has three and they are not the same three: who took it, how
 * they got in, and where it went. An inside job that asks "how" would be
 * asking the player to name the murder weapon in a case where nobody died.
 *
 * So the fields are `case.act.unknowns`, in the generator's own order, and
 * each one is a dropdown of that case's actual options: its suspects, its
 * places, its ticks, the five ways into a locked room. One point per unknown.
 * Everything the briefing stated is a given and is never asked.
 *
 * The labels and the option words for `entry` and `fate` are the engine's own
 * and are logged as a gap: a deck should eventually write them, the way the
 * endings deck should eventually carry a case type.
 */

import type { Entry, Id, Tick, Unknown } from '../gen/types.js';
import { clock } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { METHOD_POOL, MOTIVE_POOL, motivePoolFor, personName, placeName } from './derive.js';
import type { Report } from './types.js';
import { columnAsked, columnPeople, truthColumn } from './m9.js';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: Unknown;
  label: string;
  options: FieldOption[];
}

/** Where a thief got in. The generator's five, in the engine's words. */
export const ENTRY_OPTIONS: { value: Entry; label: string }[] = [
  { value: 'key', label: 'with a key' },
  { value: 'window', label: 'through a window' },
  { value: 'let-in', label: 'somebody let them in' },
  { value: 'never-left', label: 'they never left' },
  { value: 'combination', label: 'they knew the combination' },
];

/** What became of somebody who is not where they should be. */
export const FATE_OPTIONS: { value: 'left' | 'taken' | 'dead'; label: string }[] = [
  { value: 'left', label: 'they went of their own accord' },
  { value: 'taken', label: 'somebody took them' },
  { value: 'dead', label: 'they are dead' },
];

/** The one option a whereabouts has that a place does not. */
export const GONE = 'gone';

/** What the form calls each unknown, in the words this case makes true. */
export function labelFor(view: CaseView, key: Unknown): string {
  const type = view.kase.act.type;
  const victim = view.victim.surname;
  // M14: the thing, "the fox terrier", for the three questions that name it.
  const thing = view.kase.act.taken?.name.replace(/^(a|an) /, 'the ') ?? 'it';
  switch (key) {
    case 'who':
      return type === 'murder'
        ? `Who killed ${victim}`
        : type === 'robbery'
          ? 'Who took it'
          : type === 'lost-pet'
            ? `Who let ${thing} out`
            : type === 'lost-item'
              ? `Who had ${thing} last`
              : type === 'affair'
                ? `Who ${victim} was with`
                : `Who took ${victim}`;
    case 'why':
      return 'Why';
    case 'when':
      return 'When';
    case 'where':
      return type === 'affair' ? `Where ${victim} was` : 'Where it happened';
    case 'how':
      return 'How';
    case 'entry':
      return 'How they got in';
    case 'whereabouts':
      return `Where ${victim} is`;
    case 'fate':
      return `What became of ${victim}`;
    case 'goods':
      return type === 'lost-pet' || type === 'lost-item' ? `Where ${thing} is now` : 'Where it went';
  }
}

export function optionsFor(view: CaseView, key: Unknown): FieldOption[] {
  const kase = view.kase;
  const places = (): FieldOption[] => kase.places.map((p) => ({ value: p.id, label: p.name }));
  switch (key) {
    case 'who':
      return kase.people
        .filter((p) => p.kind === 'suspect')
        .map((p) => ({ value: p.id, label: `${p.name} — ${p.role}` }));
    case 'why':
      return motivePoolFor(kase.act.type).map((m) => ({ value: m.type, label: `${m.type} — ${m.description}` }));
    case 'when':
      return Array.from({ length: 12 }, (_, t) => ({ value: String(t), label: clock(t as Tick) }));
    case 'where':
      return places();
    case 'how':
      return METHOD_POOL.map((m) => ({ value: m.id, label: m.name }));
    case 'entry':
      return ENTRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
    case 'whereabouts':
      return [...places(), { value: GONE, label: 'gone — out of the city altogether' }];
    case 'fate':
      return FATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
    case 'goods':
      return places();
  }
}

/** Exactly what this case's report asks, in the generator's own order. */
export function fieldsFor(view: CaseView): FieldSpec[] {
  return view.kase.act.unknowns.map((key) => ({
    key,
    label: labelFor(view, key),
    options: optionsFor(view, key),
  }));
}

/**
 * M9 §5: from Medium up the report asks the full crime column — where every
 * suspect was at the half hour it happened — one dropdown of places each.
 */
export interface ColumnSpec {
  personId: Id;
  label: string;
  options: FieldOption[];
}

export function columnFor(view: CaseView): ColumnSpec[] {
  if (!columnAsked(view)) return [];
  const options = view.kase.places.map((p) => ({ value: p.id, label: p.shortName }));
  return columnPeople(view).map((p) => ({ personId: p.id, label: p.surname, options }));
}

/** What the player filed for one unknown, as the option's value. */
export function answerFor(report: Report, key: Unknown): string | null {
  switch (key) {
    case 'who':
      return report.killerId;
    case 'why':
      return report.motiveType;
    case 'when':
      return report.tick === null || report.tick === undefined ? null : String(report.tick);
    case 'where':
      return report.placeId;
    case 'how':
      return report.methodId;
    case 'entry':
      return report.entry ?? null;
    case 'whereabouts':
      return report.whereabouts ?? null;
    case 'fate':
      return report.fate ?? null;
    case 'goods':
      return report.goodsPlaceId ?? null;
  }
}

/** The same, the other way: one dropdown's value into the filed report. */
export function withAnswer(report: Report, key: Unknown, value: string | null): Report {
  switch (key) {
    case 'who':
      return { ...report, killerId: value };
    case 'why':
      return { ...report, motiveType: value };
    case 'when':
      return { ...report, tick: value === null ? null : Number(value) };
    case 'where':
      return { ...report, placeId: value };
    case 'how':
      return { ...report, methodId: value };
    case 'entry':
      return { ...report, entry: (value as Entry | null) ?? null };
    case 'whereabouts':
      return { ...report, whereabouts: (value as Id | 'gone' | null) ?? null };
    case 'fate':
      return { ...report, fate: (value as 'left' | 'taken' | 'dead' | null) ?? null };
    case 'goods':
      return { ...report, goodsPlaceId: value };
  }
}

/** What the truth is, as the option's value, so the two compare directly. */
export function truthFor(view: CaseView, key: Unknown): string | null {
  const kase = view.kase;
  const act = kase.act;
  switch (key) {
    case 'who':
      return kase.solution.killerId;
    case 'why':
      return kase.solution.motiveType;
    case 'when':
      return String(kase.solution.murderTick);
    case 'where':
      return kase.solution.murderPlaceId;
    case 'how':
      return kase.solution.methodId;
    case 'entry':
      return act.entry ?? null;
    case 'whereabouts':
      return act.whereabouts ?? null;
    case 'fate':
      return act.fate ?? null;
    case 'goods':
      return act.goodsWentTo ?? null;
  }
}

/** One answer, in the words the verdict prints. */
export function readable(view: CaseView, key: Unknown, value: string | null): string {
  if (value === null) return 'I don’t know';
  switch (key) {
    case 'who':
      return personName(view, value);
    case 'why': {
      const hit = MOTIVE_POOL.find((m) => m.type === value);
      return hit ? `${hit.type} — ${hit.description}` : value;
    }
    case 'when':
      return clock(Number(value) as Tick);
    case 'where':
    case 'goods':
      return placeName(view, value);
    case 'how':
      return METHOD_POOL.find((m) => m.id === value)?.name ?? value;
    case 'entry':
      return ENTRY_OPTIONS.find((o) => o.value === value)?.label ?? value;
    case 'whereabouts':
      return value === GONE ? 'gone' : placeName(view, value);
    case 'fate':
      return FATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }
}

/**
 * The report a player who knew everything would file: every unknown answered
 * with the truth, and nothing else touched. `npm run read` files this for the
 * oracle, which is a player who knows the route and not the answer, so that a
 * transcript reads as a solved case.
 */
export function truthReport(view: CaseView): Report {
  let report: Report = {
    killerId: null,
    methodId: null,
    motiveType: null,
    tick: null,
    placeId: null,
    entry: null,
    whereabouts: null,
    fate: null,
    goodsPlaceId: null,
  };
  for (const key of view.kase.act.unknowns) {
    report = withAnswer(report, key, truthFor(view, key));
  }
  if (columnAsked(view)) report = { ...report, column: truthColumn(view) };
  return report;
}

/**
 * What an unknown is, said as a thing rather than as a question: the endings
 * deck's `{missed}` goes into sentences like "{missed} never made it into my
 * report", so it has to be a noun phrase.
 */
export function missedPhrase(view: CaseView, key: Unknown): string {
  const victim = view.victim.surname;
  const type = view.kase.act.type;
  switch (key) {
    case 'who':
      return type === 'affair' ? `who ${victim} was with` : 'the name of the one who did it';
    case 'why':
      return 'the reason for it';
    case 'when':
      return 'the hour it happened';
    case 'where':
      return type === 'affair' ? `where ${victim} was` : 'the room it happened in';
    case 'how':
      return 'how it was done';
    case 'entry':
      return 'the way they got in';
    case 'whereabouts':
      return `where ${victim} went`;
    case 'fate':
      return `what became of ${victim}`;
    case 'goods':
      return type === 'lost-pet' ? 'where the animal got to' : type === 'lost-item' ? 'where the thing had got to' : 'where the goods went';
  }
}
