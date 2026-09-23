/**
 * M9 — the notebook's rules list.
 *
 * The pages dramatize; the notebook states. Every clue of a tiered case
 * carries `rule`: its facts as one plain line, no flavour and no conclusion,
 * the source last. "Hanrahan: the third floor, 10:00–10:30. Kreuzer saw her."
 * The engine prints these under the grid, and a tap on one highlights the
 * cells it touches.
 *
 * Times are the evening's clock without the PM (every one of them is PM),
 * spans joined with an en dash.
 */

import { DISTANCE_TEXT, type Fact, type Id, type Tick } from '../types.js';
import { TICKS } from '../types.js';

export interface LineNames {
  who: (id: Id) => string;
  place: (id: Id) => string;
  anchor: (id: Id) => string;
  method: (id: Id) => string;
  motive: (type: string) => string;
  object: (id: Id) => string;
  /** 'her' or 'him'. */
  them: (id: Id) => string;
  /** The victim's name and id, for "Sirkin was alive until at least 8:00". */
  victim?: string;
  victimId?: Id;
}

export function hm(t: Tick): string {
  const minutes = 18 * 60 + t * 30;
  const h = Math.floor(minutes / 60) - 12;
  const m = minutes % 60;
  return `${h}:${m === 0 ? '00' : '30'}`;
}

/** "9:00–10:30", or "10:00" for one half hour, or a list for scattered ones. */
export function span(ticks: Tick[]): string {
  const sorted = Array.from(new Set(ticks)).sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === TICKS) return 'all evening';
  const runs: Tick[][] = [];
  for (const t of sorted) {
    const last = runs[runs.length - 1];
    if (last && (last[last.length - 1] as Tick) === t - 1) last.push(t);
    else runs.push([t]);
  }
  return runs
    .map((r) => (r.length === 1 ? hm(r[0] as Tick) : `${hm(r[0] as Tick)}–${hm(r[r.length - 1] as Tick)}`))
    .join(', ');
}

function cap(s: string): string {
  return s.length === 0 ? s : `${s[0]?.toUpperCase()}${s.slice(1)}`;
}

/**
 * One fact of a rule line, as the confront picker offers it: a statement that
 * stands on its own ("Sirkin: the subway kiosk, 6:00–7:00", "Sirkin was alive
 * until at least 8:00"), the indices of the clue's facts it states, and whom
 * and where it is about, for grouping. Every fact a clue establishes that has
 * words is in exactly one part.
 */
export interface RulePart {
  text: string;
  facts: number[];
  /** The people it names, the one it is about first. */
  people: Id[];
  /** The place it is about, if it is about one. */
  place: Id | null;
  /** About the place first, the people it names only in passing: "the third floor, 9:00: nobody but Hauck". */
  byPlace?: boolean;
}

/** Who told it, for a stranger's sighting: "a stranger to Rafferty". */
export interface RuleContext {
  witness?: Id;
  strength?: 'stranger' | 'sight';
}

interface Draft {
  /** The grouping key: facts with one key become one statement. */
  key: string;
  facts: number[];
  /** "Hauck: " or "Hauck says: ": parts with one head share it in a rule line. */
  head?: string;
  /** The text after the head. */
  tail?: string;
  text: string;
  people: Id[];
  place: Id | null;
  byPlace?: boolean;
}

function lastOf(ticks: Tick[]): Tick {
  return ticks.reduce((a, b) => (b > a ? b : a), ticks[0] as Tick);
}

function firstOf(ticks: Tick[]): Tick {
  return ticks.reduce((a, b) => (b < a ? b : a), ticks[0] as Tick);
}

type PartDraft = RulePart & { head?: string; tail?: string };

/**
 * The facts of a clue as its parts, folding what repeats: one person in one
 * place over several half hours is one span; "still alive" at several half
 * hours is the last of them; a stranger seen at one place over several half
 * hours is one span; a count repeated is one span.
 */
export function ruleParts(facts: Fact[], n: LineNames, ctx: RuleContext = {}): PartDraft[] {
  const drafts: Draft[] = [];
  const byKey = new Map<string, Draft>();
  const ticksOf = new Map<Draft, Tick[]>();
  const group = (key: string, i: number, t: Tick, about: { head?: string; people: Id[]; place: Id | null }): void => {
    let d = byKey.get(key);
    if (!d) {
      d = { key, facts: [], text: '', ...about };
      byKey.set(key, d);
      drafts.push(d);
      ticksOf.set(d, []);
    }
    d.facts.push(i);
    (ticksOf.get(d) as Tick[]).push(t);
  };
  const victim = n.victimId ? [n.victimId] : [];
  facts.forEach((f, i) => {
    switch (f.kind) {
      case 'personAt':
      case 'personNotAt':
        group(`${f.kind}|${f.personId}|${f.place}`, i, f.tick, { head: `${n.who(f.personId)}: `, people: [f.personId], place: f.place });
        break;
      case 'victimAliveAt':
        group('alive', i, f.tick, { people: victim, place: null });
        break;
      case 'victimDeadBy':
        group('dead', i, f.tick, { people: victim, place: null });
        break;
      case 'describedAt':
        group(`desc|${f.description.text}|${f.place}`, i, f.tick, { people: [], place: f.place });
        break;
      case 'countAt':
        group(`count|${f.place}|${f.count}`, i, f.tick, { people: [], place: f.place });
        break;
      default: {
        const d: Draft = { key: `=${i}`, facts: [i], text: single(f, n), ...aboutOf(f, n) };
        // A timed-by-anchor sighting sits beside the person's clock-timed
        // ones; an account's spans share "Hanrahan says: ".
        const head =
          f.kind === 'personAtAnchor' ? `${n.who(f.personId)}: ` : f.kind === 'claims' ? `${n.who(f.personId)} says: ` : '';
        if (head && d.text.startsWith(head)) {
          d.head = head;
          d.tail = d.text.slice(head.length);
        }
        if (d.text.length > 0) drafts.push(d);
      }
    }
  });
  for (const d of drafts) {
    const ticks = ticksOf.get(d);
    if (!ticks) continue;
    const f = facts[d.facts[0] as number] as Fact;
    switch (f.kind) {
      case 'personAt':
        d.tail = `${n.place(f.place)}, ${span(ticks)}`;
        d.text = `${d.head ?? ""}${d.tail}`;
        break;
      case 'personNotAt':
        d.tail = `not at ${n.place(f.place)}, ${span(ticks)}`;
        d.text = `${d.head ?? ""}${d.tail}`;
        break;
      case 'victimAliveAt':
        d.text = `${n.victim ?? 'The victim'} was alive until at least ${hm(lastOf(ticks))}`;
        break;
      case 'victimDeadBy':
        d.text = `Over by ${hm(firstOf(ticks))}`;
        break;
      case 'describedAt': {
        const w = ctx.witness ? n.who(ctx.witness) : '';
        const who =
          w && ctx.strength === 'stranger'
            ? `${cap(f.description.text)}, a stranger to ${w}`
            : w && ctx.strength === 'sight'
              ? `${cap(f.description.text)}, known to ${w} by sight only`
              : `Somebody who fits “${f.description.text}”`;
        d.text = `${who}: ${n.place(f.place)}, ${span(ticks)}`;
        break;
      }
      case 'countAt':
        d.text = `${cap(n.place(f.place))}, ${span(ticks)}: ${f.count === 1 ? 'one person' : `${f.count} people`} besides the one who works there`;
        break;
      default:
        break;
    }
  }
  return drafts
    .filter((d) => d.text.length > 0)
    .map((d) => ({
      text: d.text,
      facts: d.facts,
      people: d.people,
      place: d.place,
      ...(d.byPlace ? { byPlace: true } : {}),
      ...(d.head ? { head: d.head } : {}),
      ...(d.tail ? { tail: d.tail } : {}),
    }));
}

/** Whom and where a fact is about, for the picker's groups and its filter. */
function aboutOf(f: Fact, n: LineNames): { people: Id[]; place: Id | null; byPlace?: boolean } {
  const victim = n.victimId ? [n.victimId] : [];
  switch (f.kind) {
    case 'personAtAnchor':
      return { people: [f.personId], place: f.place };
    case 'absentFrom':
      return { people: f.except.slice(1), place: f.place, byPlace: true };
    case 'together':
    case 'apart':
    case 'acquainted':
      return { people: [f.personIds[0], f.personIds[1]], place: null };
    case 'anchorKnowledge':
      return { people: [], place: f.place };
    case 'knows':
    case 'hasMotive':
    case 'hadAccess':
    case 'secretExplained':
      return { people: [f.personId], place: null };
    case 'claims':
      return { people: f.with ? [f.personId, f.with] : [f.personId], place: f.place };
    case 'timeOfDeath':
    case 'methodEvidence':
      return { people: victim, place: null };
    case 'noiseAt':
      return { people: [], place: f.place };
    case 'objectMissing':
      return { people: [], place: f.fromPlace };
    default:
      return { people: [], place: null };
  }
}

/** The facts of a clue, as statements: one per part, a person's placements under their name once. */
export function factStatements(facts: Fact[], n: LineNames, ctx: RuleContext = {}): string[] {
  const parts = ruleParts(facts, n, ctx);
  const lines: string[] = [];
  const said = new Set<string>();
  for (const p of parts) {
    if (p.head && p.tail) {
      if (said.has(p.head)) continue;
      said.add(p.head);
      const tails = parts.filter((q) => q.head === p.head && q.tail).map((q) => q.tail as string);
      lines.push(`${p.head}${tails.join('; ')}`);
      continue;
    }
    lines.push(p.text);
  }
  return lines;
}

function single(f: Fact, n: LineNames): string {
  switch (f.kind) {
    case 'personAt':
      return `${n.who(f.personId)}: ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'personNotAt':
      return `${n.who(f.personId)}: not at ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'personAtAnchor':
      return `${n.who(f.personId)}: ${n.place(f.place)}, when ${n.anchor(f.anchorId)} happened`;
    case 'anchorAt':
      return `${cap(n.anchor(f.anchorId))}: ${span(f.ticks)}`;
    case 'describedAt':
      return `Somebody who fits “${f.description.text}”: ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'absentFrom': {
      // The first of `except` is the one who works there, who says so; the
      // line leaves them to the source, as a count does.
      const others = f.except.slice(1).map((id) => n.who(id)).filter((s) => s.length > 0);
      return `${cap(n.place(f.place))}, ${span(f.ticks)}: nobody${others.length > 0 ? ` but ${others.join(' and ')}` : ''} besides the one who works there`;
    }
    case 'countAt':
      return `${cap(n.place(f.place))}, ${hm(f.tick)}: ${f.count === 1 ? 'one person' : `${f.count} people`} besides the one who works there`;
    case 'together':
      return `${n.who(f.personIds[0])} with ${n.who(f.personIds[1])}, ${span(f.ticks)}`;
    case 'apart':
      return `${n.who(f.personIds[0])} and ${n.who(f.personIds[1])}: never in the same place, ${span(f.ticks)}`;
    case 'anchorKnowledge':
      return `Anybody at ${n.place(f.place)} at ${span(f.ticks)} knows ${f.knowledge}`;
    case 'knows':
      return f.knows
        ? `${n.who(f.personId)} knows what happened when ${n.anchor(f.anchorId)} happened`
        : `${n.who(f.personId)} does not know what happened when ${n.anchor(f.anchorId)} happened`;
    case 'acquainted':
      return f.strength === 'stranger'
        ? `${n.who(f.personIds[0])} does not know ${n.who(f.personIds[1])}`
        : f.strength === 'sight'
          ? `${n.who(f.personIds[0])} knows ${n.who(f.personIds[1])} by sight only`
          : `${n.who(f.personIds[0])} knows ${n.who(f.personIds[1])}`;
    case 'claims':
      return `${n.who(f.personId)} says: ${n.place(f.place)}, ${span(f.ticks)}${f.with ? `, with ${n.who(f.with)}` : ''}`;
    case 'timeOfDeath':
      return f.ticks[0] === f.ticks[f.ticks.length - 1]
        ? `The crime: ${hm(f.ticks[0] as Tick)}`
        : `The crime: between ${hm(f.ticks[0] as Tick)} and ${hm(f.ticks[f.ticks.length - 1] as Tick)}`;
    case 'victimAliveAt':
      return `${n.victim ?? 'The victim'} was alive until at least ${hm(f.tick)}`;
    case 'victimDeadBy':
      return `Over by ${hm(f.tick)}`;
    case 'noiseAt':
      return `A noise from ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'methodEvidence':
      return `How: ${n.method(f.methodId)}`;
    case 'hasMotive':
      return `${n.who(f.personId)} had a reason: ${n.motive(f.motiveType)}`;
    case 'hadAccess':
      return `${n.who(f.personId)} could have got hold of it`;
    case 'objectMissing':
      return `${cap(n.object(f.objectId))}: gone from ${n.place(f.fromPlace)}`;
    case 'secretExplained':
      return `${n.who(f.personId)}'s secret is not the crime`;
  }
}

/** A distance, as the places list and the rules say it. */
export function distanceLine(a: string, b: string, d: 0 | 1 | 2): string {
  return `${cap(a)} and ${b}: ${DISTANCE_TEXT[d]}`;
}

/** A rule line and its parts: what the notebook lists, and what the confront picker offers one at a time. */
export interface RuleOut {
  rule: string;
  parts: RulePart[];
}

/**
 * The whole line: the statements, then where it came from. `source` is a
 * short sentence — "Kreuzer saw her." — or empty for a found thing.
 */
export function ruleOf(facts: Fact[], source: string, n: LineNames, ctx: RuleContext = {}): RuleOut {
  const statements = factStatements(facts, n, ctx);
  if (statements.length === 0) return { rule: '', parts: [] };
  const parts = ruleParts(facts, n, ctx).map(({ text, facts: fs, people, place, byPlace }) => ({
    text,
    facts: fs,
    people,
    place,
    ...(byPlace ? { byPlace } : {}),
  }));
  const body = statements.join('. ');
  return { rule: `${body}.${source ? ` ${source}` : ''}`, parts };
}

export function ruleLine(facts: Fact[], source: string, n: LineNames, ctx: RuleContext = {}): string {
  return ruleOf(facts, source, n, ctx).rule;
}

/** Write a clue's rule line and its parts from its facts. */
export function applyRule<C extends { establishes: Fact[]; rule?: string; ruleParts?: RulePart[] }>(
  c: C,
  source: string,
  n: LineNames,
  ctx: RuleContext = {},
): C {
  const out = ruleOf(c.establishes, source, n, ctx);
  c.rule = out.rule;
  if (out.parts.length > 0) c.ruleParts = out.parts;
  else delete c.ruleParts;
  return c;
}
