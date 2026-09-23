/**
 * M8 — the scene: every page after the office, planned and then written.
 *
 *   plan.ts      the planner: action + notebook + case → beats (pure)
 *   thought.ts   §5, what the detective makes of it (pure)
 *   bridge.ts    §6, the next lead named and why (pure)
 *   realize.ts   the beats, rendered from the decks and the engine's templates
 *   text.ts      the sentence checks the realizer and the coverage check share
 *   coverage.ts  §10, every page has every required beat, and nothing broken
 *
 * `composePage` hands this every scene but the office opening and a parser's
 * nothing-page.
 */

import type { Id } from '../../gen/types.js';
import { establishedFrom } from '../derive.js';
import { markedTheory, verdictsOn } from '../m9.js';
import type { Composed, Scene, Stage } from '../voice/page.js';
import { reactiveMonologue } from '../voice/reactive.js';
import { planPage, type PlanAction } from './plan.js';
import { realize } from './realize.js';

export * from './plan.js';
export * from './thought.js';
export * from './bridge.js';
export * from './text.js';
export * from './coverage.js';
export { realize, pageFact, NIGHT_CEILING, NIGHT_TARGETS, CUT_ORDER, thoughtSlots } from './realize.js';

/** The scenes the planner writes. The office opening and parser pages keep their own path. */
export function isNightScene(scene: Scene): boolean {
  return (
    scene.kind === 'travel' ||
    scene.kind === 'examine' ||
    scene.kind === 'ask' ||
    scene.kind === 'look' ||
    scene.kind === 'confront'
  );
}

/** The reducer's scene, as the planner reads it. */
export function actionOf(scene: Scene, topic?: { kind: string; id?: Id; topic?: string }): PlanAction {
  switch (scene.kind) {
    case 'travel':
      return {
        kind: 'travel',
        to: scene.to,
        already: scene.already,
        ...(scene.openingClues ? { openingClues: scene.openingClues } : {}),
        ...(scene.errand ? { errand: scene.errand } : {}),
      };
    case 'examine':
      return {
        kind: 'examine',
        placeId: scene.placeId,
        clues: scene.clues,
        ...(scene.objectId === undefined ? {} : { objectId: scene.objectId }),
        ...(scene.continued ? { continued: true } : {}),
        ...(scene.more ? { more: true } : {}),
      };
    case 'ask':
      return {
        kind: 'ask',
        personId: scene.personId,
        topic: topic ?? scene.topicRef ?? { kind: 'exact', topic: scene.topicLabel },
        clues: scene.clues,
        account: scene.account !== null,
        self: scene.self !== undefined,
        volunteer: scene.volunteer,
        ...(scene.continued ? { continued: true } : {}),
        ...(scene.more ? { more: true } : {}),
      };
    case 'confront':
      return {
        kind: 'confront',
        personId: scene.personId,
        clue: scene.clue,
        judged: scene.judged,
        ...(scene.part === undefined ? {} : { part: scene.part }),
      };
    default:
      return { kind: 'look' };
  }
}

export function composeScene(stage: Stage, scene: Scene): Composed {
  const plan = planPage({
    view: stage.view,
    action: actionOf(scene),
    at: stage.at,
    minutes: stage.minutes,
    ...(stage.minutesBefore === undefined ? {} : { minutesBefore: stage.minutesBefore }),
    actionsLeft: stage.actionsLeft,
    cost: stage.cost,
    foundBefore: stage.foundBefore,
    foundAfter: stage.foundAfter,
    accountsBefore: stage.accountsBefore,
    accountsAfter: stage.accountsAfter,
    met: stage.met,
    here: stage.here,
    visitedBefore: stage.visitedBefore ?? [],
    ...(stage.memory ? { memory: stage.memory } : {}),
    seed: stage.view.kase.seed,
    weather: stage.cast.roll.weather,
    tempers: stage.cast.temper,
    portrayed: stage.portrayed,
    recallable: Object.entries(stage.cast.portraits)
      .filter(([, p]) => p.pair?.action !== undefined)
      .map(([id]) => id),
  });
  const written = realize(plan, stage, scene);

  // The theory the wandering player files on is still the monologue's; the
  // page no longer prints the monologue, it prints the thought.
  const before = establishedFrom(stage.view, stage.foundBefore, stage.accountsBefore);
  const after = establishedFrom(stage.view, stage.foundAfter, stage.accountsAfter);
  const touched = new Set<Id>();
  for (const id of stage.foundAfter.slice(stage.foundBefore.length)) {
    for (const f of stage.view.findableById.get(id)?.establishes ?? []) {
      if ('personId' in f) touched.add(f.personId);
    }
  }
  const reaction = reactiveMonologue({
    view: stage.view,
    roll: stage.cast.roll,
    before,
    after,
    touched: [...touched],
    actionsLeft: stage.actionsLeft,
    previousTheory: stage.previousTheory,
    seed: (stage.pageIndex + 1) * 7919 + stage.view.kase.seed,
    used: () => false,
    ...(verdictsOn(stage.view)
      ? {}
      : { pencilOnly: true, marked: markedTheory(stage.view, stage.marks, after.deathTicks) }),
  });

  // §1's measurement, kept for the harness: the place card and the texture
  // are a night page's image sentences, and everything else is plain.
  const plain = written.plain;
  const image = written.image;
  for (const deck of stage.dealer.takeReshuffles()) {
    written.gaps.push(`deck-exhausted: ${deck} came round again inside one run`);
  }

  const appeared = plan.beats.flatMap((b) =>
    b.kind === 'presence' ? b.people.map((p) => p.personId) : b.kind === 'exchange' ? [b.personId] : [],
  );
  return {
    blocks: written.blocks,
    ...(written.errand ? { errand: written.errand } : {}),
    gaps: written.gaps,
    asideBand: null,
    portrayed: appeared.filter((id) => !stage.portrayed.includes(id)),
    appeared,
    theory: reaction.theory,
    simileTarget: null,
    motifs: [],
    imageMotifs: [],
    plain,
    image,
    shape: plan.shape,
    beats: written.traces,
    memory: plan.memory,
  };
}
export * from './lines.js';
