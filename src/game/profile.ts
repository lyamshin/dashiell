/**
 * M7 — the profile: what the player has done across runs.
 *
 * Tiers cleared, the best difficulty and the best par delta per tier, runs
 * played, wins, and the tier and level the title page opens on. It is the
 * object the detective's evolution will read later, so it is versioned and
 * sanitized on the way in rather than trusted.
 *
 * Pure, like `storage.ts`: the store is passed in. Every read and write is
 * wrapped, so a blocked or full store still plays; it just forgets.
 *
 * The rules:
 * - A tier is cleared by a full-credit report at any level.
 * - Clearing a tier unlocks the next one. Clearing Hard-boiled unlocks Over
 *   easy. Losing never locks anything.
 * - Raw is always played at Beat, whatever level is asked for.
 * - A case opened without a tier (the old `?seed=&d=` links) counts as a run,
 *   and as a win when it is full credit, but clears no tier.
 */

import type { Difficulty } from '../gen/types.js';
import { CAMPAIGN, TIERS, type CaseShape, type Level, type ShapeOptions } from '../gen/shape.js';
import type { KeyValueStore } from './storage.js';

export const PROFILE_KEY = 'dashiell:profile';

/** A tier the player can hold: the six of the campaign and Over easy. */
export type TierKey = 0 | 1 | 2 | 3 | 4 | 5 | 'over-easy';

export const TIER_ORDER: readonly TierKey[] = [0, 1, 2, 3, 4, 5, 'over-easy'];
export const LEVELS: readonly Level[] = [1, 2, 3, 4];

export interface TierBest {
  /** The highest level this tier was cleared at. */
  level: Level;
  /** The fewest calls over the game's par on a clear. Negative is under. */
  parDelta: number;
}

export interface Profile {
  version: 1;
  /** Tiers with at least one full-credit report, in tier order. */
  cleared: TierKey[];
  /** Keyed by `String(tier)`. Only cleared tiers have an entry. */
  best: Partial<Record<string, TierBest>>;
  /** Reports filed. */
  runs: number;
  /** Full-credit reports. */
  wins: number;
  /** What the title page opens on. */
  current: { tier: TierKey; level: Level };
}

export function emptyProfile(): Profile {
  return { version: 1, cleared: [], best: {}, runs: 0, wins: 0, current: { tier: 0, level: 1 } };
}

/* -------------------------------------------------------------- the tiers */

export function isTierKey(value: unknown): value is TierKey {
  return TIER_ORDER.includes(value as TierKey);
}

export function isLevel(value: unknown): value is Level {
  return LEVELS.includes(value as Level);
}

export function shapeOf(tier: TierKey): CaseShape {
  return TIERS[tier];
}

/** The tier a clear of this one opens, or null past the end. */
export function nextTier(tier: TierKey): TierKey | null {
  if (tier === 'over-easy') return null;
  if (tier === 5) return 'over-easy';
  return (tier + 1) as TierKey;
}

/** Where a tier sits in the order, for comparing. Over easy is last. */
function rank(tier: TierKey): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Raw is open from the start. Every other tier is open once the tier before it
 * has been cleared, or any tier past that: a clear is never taken back, and a
 * case opened straight from a link to a later tier still counts.
 */
export function isUnlocked(profile: Profile, tier: TierKey): boolean {
  if (tier === 0) return true;
  const needs = rank(tier) - 1;
  return profile.cleared.some((c) => rank(c) >= needs);
}

/** The campaign tiers the player may choose, and Over easy once it is open. */
export function unlockedTiers(profile: Profile): TierKey[] {
  return TIER_ORDER.filter((t) => isUnlocked(profile, t));
}

/** The campaign tiers still closed. Over easy is never listed as locked: it is a post-game surprise. */
export function lockedTiers(profile: Profile): TierKey[] {
  return CAMPAIGN.map((s) => s.tier as TierKey).filter((t) => !isUnlocked(profile, t));
}

/** The level a tier is actually played at. Raw is always Beat. */
export function levelFor(tier: TierKey, level: Level): Level {
  return shapeOf(tier).lockedLevel ?? level;
}

/* ------------------------------------------------------ opening a case */

/**
 * What a case is opened with. A tier means the tier's shape on the spec's
 * ladder; no tier is today's untiered case at a legacy difficulty, byte for
 * byte what the old links opened.
 */
export interface CasePick {
  tier?: TierKey;
  level: Level;
}

export function caseOptions(pick: CasePick): ShapeOptions {
  if (pick.tier === undefined) return { difficulty: pick.level as Difficulty };
  return { tier: pick.tier, level: levelFor(pick.tier, pick.level) };
}

/** The pick a saved run was dealt from. A save from before M7 has no tier. */
export function pickOfRun(run: { difficulty: Difficulty; tier?: TierKey; level?: Level }): CasePick {
  if (run.tier === undefined) return { level: run.difficulty };
  return { tier: run.tier, level: run.level ?? run.difficulty };
}

/** Whether a saved run is the case this pick would deal from this seed. */
export function runMatches(
  run: { seed: number; difficulty: Difficulty; tier?: TierKey; level?: Level },
  seed: number,
  pick: CasePick,
): boolean {
  if (run.seed !== seed) return false;
  const saved = pickOfRun(run);
  if (saved.tier !== pick.tier) return false;
  if (pick.tier === undefined) return saved.level === pick.level;
  return levelFor(pick.tier, saved.level) === levelFor(pick.tier, pick.level);
}

/**
 * The URL's case. `?seed=3&d=2` is today's untiered case, as it always was;
 * `&t=0` (0 to 5, or `over-easy`) makes it a tier. `d` is the level, 1 to 4.
 */
export function pickFromParams(params: URLSearchParams): { seed: number | null; pick: CasePick } {
  const rawSeed = params.get('seed');
  const rawLevel = Number(params.get('d') ?? 2);
  const level: Level = isLevel(rawLevel) ? rawLevel : 2;
  const rawTier = params.get('t');
  const asTier = rawTier === null ? undefined : rawTier === 'over-easy' ? rawTier : Number(rawTier);
  const tier = rawTier !== null && rawTier.trim() !== '' && isTierKey(asTier) ? asTier : undefined;
  const seed =
    rawSeed !== null && rawSeed.trim() !== '' && Number.isFinite(Number(rawSeed)) ? Number(rawSeed) : null;
  return { seed, pick: tier === undefined ? { level } : { tier, level: levelFor(tier, level) } };
}

/** The same, the other way. The level written is the one actually played. */
export function paramsForPick(seed: number, pick: CasePick): string {
  const level = pick.tier === undefined ? pick.level : levelFor(pick.tier, pick.level);
  return `?seed=${seed}&d=${level}${pick.tier === undefined ? '' : `&t=${pick.tier}`}`;
}

/* ------------------------------------------------------ filing a report */

export interface RunResult {
  /** The tier the case was dealt at; undefined for an untiered case. */
  tier?: TierKey;
  level: Level;
  /** The verdict's points and how many were asked. */
  points: number;
  asked: number;
  actionsUsed: number;
  /** The game's par, as the verdict holds the night to it. */
  par: number;
}

export interface RecordOutcome {
  profile: Profile;
  /** A full-credit report. */
  won: boolean;
  /** The tier this report cleared for the first time, if it did. */
  firstClear: TierKey | null;
  /** The tier this report opened, if it opened one. */
  unlocked: TierKey | null;
}

/** Fold one filed report into the profile. Pure. */
export function recordRun(profile: Profile, result: RunResult): RecordOutcome {
  const won = result.asked > 0 && result.points === result.asked;
  const next: Profile = {
    ...profile,
    cleared: [...profile.cleared],
    best: { ...profile.best },
    runs: profile.runs + 1,
    wins: profile.wins + (won ? 1 : 0),
    current: { ...profile.current },
  };
  if (!won || result.tier === undefined) {
    return { profile: next, won, firstClear: null, unlocked: null };
  }

  const tier = result.tier;
  const level = levelFor(tier, result.level);
  const delta = result.actionsUsed - result.par;
  const before = unlockedTiers(profile);
  const firstClear = profile.cleared.includes(tier) ? null : tier;
  if (firstClear !== null) {
    next.cleared = TIER_ORDER.filter((t) => t === tier || next.cleared.includes(t));
  }
  const key = String(tier);
  const old = next.best[key];
  next.best[key] = {
    level: old === undefined ? level : (Math.max(old.level, level) as Level),
    parDelta: old === undefined ? delta : Math.min(old.parDelta, delta),
  };

  const opened = unlockedTiers(next).filter((t) => !before.includes(t));
  // One clear opens one tier at most, but a link straight to a later tier can
  // open several; the title page moves to the furthest of them.
  const unlocked = opened.length > 0 ? (opened[opened.length - 1] as TierKey) : null;
  if (unlocked !== null) {
    next.current = { tier: unlocked, level: next.current.level };
  }
  return { profile: next, won, firstClear, unlocked };
}

/** The title page's choice, remembered. */
export function withCurrent(profile: Profile, tier: TierKey, level: Level): Profile {
  if (!isUnlocked(profile, tier)) return profile;
  // Raw plays at Beat, but the level the player chose for the tiers that let
  // them choose is kept, so that it is still there when they come back up.
  const keep = shapeOf(tier).lockedLevel !== undefined ? profile.current.level : level;
  return { ...profile, current: { tier, level: keep } };
}

/* ------------------------------------------------------------- storage */

/** Take whatever is in the store and keep only what makes sense. Never throws. */
export function sanitizeProfile(value: unknown): Profile {
  const out = emptyProfile();
  if (typeof value !== 'object' || value === null) return out;
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.cleared)) {
    out.cleared = TIER_ORDER.filter((t) => (v.cleared as unknown[]).includes(t));
  }
  if (typeof v.best === 'object' && v.best !== null) {
    for (const t of out.cleared) {
      const b = (v.best as Record<string, unknown>)[String(t)];
      if (typeof b !== 'object' || b === null) continue;
      const r = b as Record<string, unknown>;
      if (isLevel(r.level) && typeof r.parDelta === 'number' && Number.isFinite(r.parDelta)) {
        out.best[String(t)] = { level: r.level, parDelta: r.parDelta };
      }
    }
  }
  const count = (x: unknown): number =>
    typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
  out.runs = count(v.runs);
  out.wins = Math.min(count(v.wins), out.runs);
  if (typeof v.current === 'object' && v.current !== null) {
    const c = v.current as Record<string, unknown>;
    const level = isLevel(c.level) ? c.level : 1;
    const tier = isTierKey(c.tier) && isUnlocked(out, c.tier) ? c.tier : 0;
    out.current = { tier, level };
  }
  return out;
}

export function loadProfile(store: KeyValueStore): Profile {
  try {
    const raw = store.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(store: KeyValueStore, profile: Profile): void {
  try {
    store.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* a blocked store forgets; the game still plays */
  }
}

/** Load, fold one report in, save. What the book calls when a report is filed. */
export function fileToProfile(store: KeyValueStore, result: RunResult): RecordOutcome {
  const outcome = recordRun(loadProfile(store), result);
  saveProfile(store, outcome.profile);
  return outcome;
}
