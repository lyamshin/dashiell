/**
 * v2 — stage 3, the book (docs/35 §2, "The book").
 *
 * An arc chosen to fit the graph's shape. The acts are cuts through the
 * graph: the hook is the givens, the scene is what the scene settles, the
 * widening is every step that can be taken before a lie is caught, the turn
 * is the first lie caught, the narrowing is the confessions and the one left
 * with nowhere to stand, and the report is the targets.
 *
 * The book is chosen by the technique that does the most work:
 *
 * | book | when |
 * |---|---|
 * | The Count | a head count or an empty doorway (T4) catches two lies or more, or is the bottleneck |
 * | The Stranger | a description linked to a face (T7), or two of them tested (T10), is the bottleneck |
 * | The Alibi Web | together and apart (T6), or a companion's lie, carries the case |
 * | The Clock | an anchor (T3), or what anybody there would know (T9), carries it |
 * | The One Who Lied | otherwise: one lie, caught straight off (Raw's lesson) |
 *
 * Night-long roles: the motif is the anchor nearest the crime's half hour
 * (the whistle), planted at the scene and paid off at the turn and in the
 * ending; the running gag is the office's (the radiator), planted on page one
 * and paid off on the last page. The words for both live with the engine
 * (`content/books.json`); this chooses them.
 */

import type { Case, Id, Tick } from '../types.js';
import type { Tech } from '../logic/solver.js';
import type { DeductionGraph, GraphStep } from './graph.js';

export type BookId = 'count' | 'stranger' | 'web' | 'clock' | 'lied';

export const BOOK_TITLES: Record<BookId, string> = {
  count: 'The Count',
  stranger: 'The Stranger',
  web: 'The Alibi Web',
  clock: 'The Clock',
  lied: 'The One Who Lied',
};

export type ActId = 'hook' | 'scene' | 'widening' | 'turn' | 'narrowing' | 'report';

export interface BookAct {
  id: ActId;
  steps: string[];
}

export interface Book {
  id: BookId;
  title: string;
  acts: BookAct[];
  /** The lie steps the turn is: the first a player can catch, and any the same step catches with it. */
  turn: string[];
  /** The step that makes the case need the tier's technique, if the tier has one. */
  bottleneck: string | null;
  /** What the bottleneck step is, in the book's terms, for the sheets that carry it. */
  signature: Tech | null;
  /** The motif: an anchor of the night, nearest the crime's half hour. */
  motif: { anchorId: Id; name: string; ticks: Tick[] } | null;
  /** The running gag's id in `content/books.json`, chosen by the seed. */
  gag: string;
  /** Scores that chose the book, for the notes. */
  scores: Record<BookId, number>;
}

const GAGS = ['radiator', 'chair', 'window', 'coffee', 'typewriter', 'plant'];

function closure(graph: DeductionGraph, id: string): Set<string> {
  const byId = new Map(graph.steps.map((s) => [s.id, s]));
  const out = new Set<string>();
  const walk = (x: string): void => {
    if (out.has(x)) return;
    out.add(x);
    for (const n of byId.get(x)?.needs ?? []) walk(n);
  };
  walk(id);
  return out;
}

export function chooseBook(kase: Case, graph: DeductionGraph): Book {
  const byId = new Map(graph.steps.map((s) => [s.id, s]));
  const techOf = (id: string): Tech | undefined => byId.get(id)?.tech;
  const endpoints = [...graph.lies, ...graph.rivals.map((r) => r.step)];
  const uses = (tech: Tech[]): number =>
    endpoints.filter((e) => [...closure(graph, e)].some((x) => tech.includes(techOf(x) as Tech))).length;
  const liesBy = (tech: Tech[]): number =>
    graph.lies.filter((e) => [...closure(graph, e)].some((x) => tech.includes(techOf(x) as Tech))).length;
  const companionLies = (kase.logic?.lies ?? []).filter((l) => l.cover === 'companion').length;
  const bottleneckTech = graph.bottleneckStep ? techOf(graph.bottleneckStep) ?? null : null;

  const scores: Record<BookId, number> = {
    count: uses(['T4']) + liesBy(['T4']),
    stranger: uses(['T7', 'T10']) + liesBy(['T7', 'T10']),
    web: uses(['T6']) + liesBy(['T6']) + companionLies * 2,
    clock: uses(['T3', 'T9']) + liesBy(['T3', 'T9']),
    lied: 1,
  };
  const bookOf = (tech: Tech | null | undefined): BookId | null =>
    tech === 'T4' ? 'count' : tech === 'T7' || tech === 'T10' ? 'stranger' : tech === 'T6' ? 'web' : tech === 'T3' || tech === 'T9' || tech === 'T5' ? 'clock' : null;
  // The book is what breaks the culprit's word: the lie with nowhere to stand
  // is the night's story, and the step that catches it names the book. Where
  // that is a plain read-off, the bottleneck names it; at Raw and Coddled it
  // is always the one who lied.
  const tier = typeof kase.shape?.tier === 'number' ? kase.shape.tier : 5;
  const killerId = kase.solution.killerId;
  const crimeLie = graph.lies.find((l) => byId.get(l)?.personId === killerId && (kase.logic?.lies ?? []).some((x) => x.personId === killerId && x.cover === 'crime' && `lie:${x.personId}:${x.ticks.join('.')}` === l));
  const catcher = crimeLie ? (byId.get(crimeLie)?.needs ?? []).map((n) => techOf(n)).filter((t): t is Tech => !!t) : [];
  const dearest = catcher.sort((x, y) => (bookOf(y) ? 1 : 0) - (bookOf(x) ? 1 : 0))[0] ?? null;
  let id: BookId = 'lied';
  if (tier >= 2) id = bookOf(dearest) ?? bookOf(bottleneckTech) ?? 'lied';

  /* --- the acts, as cuts through the graph --------------------------------- */
  const starting = new Set(kase.starting);
  const sceneIds = new Set(kase.findable.filter((c) => c.kind === 'scene' || c.kind === 'morgue' || c.source.type === 'place' && c.source.placeId === kase.solution.murderPlaceId).map((c) => c.id));
  const firstLie = graph.lies[0] ?? null;
  const turn: string[] = [];
  if (firstLie) {
    turn.push(firstLie);
    // Lies that fall with it: the same step under them.
    const under = closure(graph, firstLie);
    under.delete(firstLie);
    for (const l of graph.lies.slice(1)) {
      const theirs = closure(graph, l);
      if ([...under].some((x) => theirs.has(x) && (byId.get(x)?.tech ?? 'T1') !== 'T1')) turn.push(l);
    }
  }
  const afterTurn = new Set<string>();
  for (const s of graph.steps) {
    if (s.kind === 'confess' || s.kind === 'who' || (s.kind === 'lie' && !turn.includes(s.id))) afterTurn.add(s.id);
  }
  const acts: BookAct[] = [
    { id: 'hook', steps: graph.steps.filter((s) => s.leaves.length > 0 && s.leaves.every((x) => starting.has(x))).map((s) => s.id) },
    {
      id: 'scene',
      steps: graph.steps
        .filter((s) => (s.kind === 'when' || s.kind === 'leg' || s.kind === 'tick') && s.leaves.some((x) => sceneIds.has(x)))
        .map((s) => s.id),
    },
    { id: 'widening', steps: [] },
    { id: 'turn', steps: turn },
    { id: 'narrowing', steps: [...afterTurn] },
    { id: 'report', steps: graph.targets.slice() },
  ];
  const placed = new Set(acts.flatMap((a) => a.steps));
  (acts[2] as BookAct).steps = graph.steps.filter((s: GraphStep) => !placed.has(s.id)).map((s) => s.id);

  /* --- the motif: the anchor nearest the crime's half hour ------------------ */
  const M = kase.solution.murderTick;
  const anchors = kase.anchors.slice().sort((a, b) => {
    const da = Math.min(...a.ticks.map((t) => Math.abs(t - M)));
    const db = Math.min(...b.ticks.map((t) => Math.abs(t - M)));
    if (da !== db) return da - db;
    // One heard across the neighbourhood carries further than a room's.
    return (a.placeId ? 1 : 0) - (b.placeId ? 1 : 0);
  });
  const a = anchors[0];
  const motif = a ? { anchorId: a.templateId, name: a.name, ticks: a.ticks.slice() } : null;

  return {
    id,
    title: BOOK_TITLES[id],
    acts,
    turn,
    bottleneck: graph.bottleneckStep,
    signature: bottleneckTech,
    motif,
    gag: GAGS[(kase.seed * 7 + (tier as number) * 3) % GAGS.length] as string,
    scores,
  };
}
