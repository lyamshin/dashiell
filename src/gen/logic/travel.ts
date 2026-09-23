/**
 * M9 — travel.
 *
 * The neighbourhood is three blocks on a line. Every place sits on one of
 * them, and the distance between two places is how many blocks apart they
 * are: the same block, a walk, or across the neighbourhood. Nobody gets from
 * one side of the neighbourhood to the other inside a half hour, so a person
 * at a place in one half hour and at a place across the neighbourhood from it
 * in the next is a person somebody is wrong about.
 *
 * That one rule is what lets two placements and a walk rule out a room: seen
 * at the pier at half past nine, the suite across the neighbourhood was out
 * of reach at ten.
 */

import type { Distance, Id } from '../types.js';
import type { Rng } from '../rng.js';

export type Blocks = Record<Id, 0 | 1 | 2>;

export function distance(blocks: Blocks, a: Id, b: Id): Distance {
  const x = blocks[a];
  const y = blocks[b];
  if (x === undefined || y === undefined) return 0;
  return Math.abs(x - y) as Distance;
}

/** Can somebody be at `a` in one half hour and at `b` in the next? */
export function reachable(blocks: Blocks, a: Id | null | undefined, b: Id | null | undefined): boolean {
  if (!a || !b) return true;
  return distance(blocks, a, b) <= 1;
}

/**
 * Deal the places onto the three blocks. The scene goes on an end, so that
 * something is across the neighbourhood from it; every pair in `near` ends up
 * within a walk of each other; at least one place is in the middle and, from
 * four places up, at least one is across from the scene.
 */
export function assignBlocks(
  rng: Rng,
  placeIds: Id[],
  sceneId: Id,
  near: [Id, Id][],
): Blocks | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const blocks: Blocks = {};
    blocks[sceneId] = 0;
    const others = rng.shuffle(placeIds.filter((p) => p !== sceneId));
    others.forEach((p, i) => {
      if (i === 0) blocks[p] = 1;
      else if (i === 1 && others.length >= 3) blocks[p] = 2;
      else blocks[p] = rng.pick([0, 1, 1, 2] as const);
    });
    if (near.every(([a, b]) => distance(blocks, a, b) <= 1)) return blocks;
  }
  return null;
}
