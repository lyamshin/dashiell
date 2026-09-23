export { generateCase, diagnoseCase, type Diagnostics } from './generate.js';
export { checkSolvability, type CheckResult, type CaseUnderTest } from './solvability.js';
export {
  sourceKey,
  computePar,
  buildRequirements,
  requirementInputForCase,
  type Requirement,
  type RequirementInput,
} from './select.js';
export { Rng } from './rng.js';
export * from './types.js';
/* M9: the logic game, for the engine (docs/20-m9-gen-notes.md). */
export {
  acquaintanceOf,
  clearedBy,
  clearedByTwo,
  contradicts,
  crimeFromHeld,
  knowsByName,
  referenceOf,
  solveHeld,
  type HeldOptions,
} from './logic/api.js';
export {
  solve,
  placesAt,
  crimeTicks,
  culpritOf,
  whyNot,
  whyPlaced,
  whyTick,
  type SolverProblem,
  type SolverRule,
  type SolverState,
  type Why,
} from './logic/solver.js';
export { distance, reachable } from './logic/travel.js';
