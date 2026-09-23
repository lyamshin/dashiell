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

/** The facts of a clue, as statements, folding runs of one person in one place. */
export function factStatements(facts: Fact[], n: LineNames): string[] {
  const out: string[] = [];
  const at = new Map<string, Tick[]>();
  const notAt = new Map<string, Tick[]>();
  const order: string[] = [];
  const push = (map: Map<string, Tick[]>, k: string, t: Tick): void => {
    if (!map.has(k)) {
      map.set(k, []);
      order.push(`${map === at ? '+' : '-'}${k}`);
    }
    (map.get(k) as Tick[]).push(t);
  };
  for (const f of facts) {
    switch (f.kind) {
      case 'personAt':
        push(at, `${f.personId}|${f.place}`, f.tick);
        break;
      case 'personNotAt':
        push(notAt, `${f.personId}|${f.place}`, f.tick);
        break;
      default:
        order.push(`=${out.length}`);
        out.push(single(f, n));
    }
  }
  const lines: string[] = [];
  for (const o of order) {
    if (o.startsWith('=')) {
      lines.push(out[Number(o.slice(1))] as string);
      continue;
    }
    const k = o.slice(1);
    const [who, place] = k.split('|') as [Id, Id];
    const ticks = (o.startsWith('+') ? at : notAt).get(k) as Tick[];
    lines.push(
      o.startsWith('+')
        ? `${n.who(who)}: ${n.place(place)}, ${span(ticks)}`
        : `${n.who(who)}: not ${n.place(place)}, ${span(ticks)}`,
    );
  }
  return lines.filter((l) => l.length > 0);
}

function single(f: Fact, n: LineNames): string {
  switch (f.kind) {
    case 'personAt':
      return `${n.who(f.personId)}: ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'personNotAt':
      return `${n.who(f.personId)}: not ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'personAtAnchor':
      return `${n.who(f.personId)}: ${n.place(f.place)}, when ${n.anchor(f.anchorId)} happened`;
    case 'anchorAt':
      return `${cap(n.anchor(f.anchorId))}: ${span(f.ticks)}`;
    case 'describedAt':
      return `Somebody who fits “${f.description.text}”: ${n.place(f.place)}, ${hm(f.tick)}`;
    case 'absentFrom': {
      const others = f.except.map((id) => n.who(id)).filter((s) => s.length > 0);
      return `${cap(n.place(f.place))}, ${span(f.ticks)}: nobody${others.length > 0 ? ` but ${others.join(' and ')}` : ''}`;
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
      return `Still alive at ${hm(f.tick)}`;
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

/**
 * The whole line: the statements, then where it came from. `source` is a
 * short sentence — "Kreuzer saw her." — or empty for a found thing.
 */
export function ruleLine(facts: Fact[], source: string, n: LineNames): string {
  const statements = factStatements(facts, n);
  if (statements.length === 0) return '';
  const body = statements.join('. ');
  return `${body}.${source ? ` ${source}` : ''}`;
}
