/**
 * The profile: what the player has done across nights. Reports filed, full
 * credit, the tiers cleared and the best par delta on each.
 *
 * Pure: the store is passed in. Every read and write is wrapped, so a blocked
 * or full store still plays; it just forgets. The board's profile has its own
 * key: a profile from the engines before the board (`dashiell:profile`) is
 * never read.
 */

import type { TierIndex } from '../../gen/board/types.js';

/** `localStorage`, or anything shaped like it. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PROFILE_KEY = 'dashiell:board-profile';

const TIERS: readonly TierIndex[] = [0, 1, 2, 3, 4, 5];

export interface Profile {
  version: 1;
  /** Tiers with at least one full-credit report, in tier order. */
  cleared: TierIndex[];
  /** The fewest calls over par on a clear, keyed by `String(tier)`. Negative is under. */
  best: Partial<Record<string, number>>;
  /** Reports filed. */
  runs: number;
  /** Full-credit reports. */
  wins: number;
  /**
   * docs/48 §2, continuity: on nights from the neighbourhood, the bible ids of the last culprits and
   * of the last people wronged (the dead man, or the owner), most recent last. The next night keeps
   * the last culprit and the last ten wronged off its cast, as far as the bible allows.
   */
  recent?: { culprits: string[]; victims: string[] };
}

export function emptyProfile(): Profile {
  return { version: 1, cleared: [], best: {}, runs: 0, wins: 0 };
}

export interface RunResult {
  tier: TierIndex;
  /** The verdict's points and how many were asked. */
  points: number;
  asked: number;
  actionsUsed: number;
  par: number;
  /** docs/48: who the night cast as the culprit and the wronged, by bible id, on a night from a world. */
  cast?: { culprit?: string; victim?: string };
}

export interface RecordOutcome {
  profile: Profile;
  /** A full-credit report. */
  won: boolean;
  /** The tier this report cleared for the first time, if it did. */
  firstClear: TierIndex | null;
}

/** Fold one filed report into the profile. Pure. */
export function recordRun(profile: Profile, result: RunResult): RecordOutcome {
  const won = result.asked > 0 && result.points === result.asked;
  const next: Profile = { ...profile, cleared: [...profile.cleared], best: { ...profile.best }, runs: profile.runs + 1, wins: profile.wins + (won ? 1 : 0) };
  if (result.cast) next.recent = remember(profile.recent, result.cast);
  if (!won) return { profile: next, won, firstClear: null };
  const tier = result.tier;
  const firstClear = profile.cleared.includes(tier) ? null : tier;
  if (firstClear !== null) next.cleared = TIERS.filter((t) => t === tier || next.cleared.includes(t));
  const delta = result.actionsUsed - result.par;
  const old = next.best[String(tier)];
  next.best[String(tier)] = old === undefined ? delta : Math.min(old, delta);
  return { profile: next, won, firstClear };
}

/** Take whatever is in the store and keep only what makes sense. Never throws. */
export function sanitizeProfile(value: unknown): Profile {
  const out = emptyProfile();
  if (typeof value !== 'object' || value === null) return out;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return out;
  if (Array.isArray(v.cleared)) out.cleared = TIERS.filter((t) => (v.cleared as unknown[]).includes(t));
  if (typeof v.best === 'object' && v.best !== null) {
    for (const t of out.cleared) {
      const b = (v.best as Record<string, unknown>)[String(t)];
      if (typeof b === 'number' && Number.isFinite(b)) out.best[String(t)] = b;
    }
  }
  const count = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);
  out.runs = count(v.runs);
  out.wins = Math.min(count(v.wins), out.runs);
  if (typeof v.recent === 'object' && v.recent !== null) {
    const ids = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string').slice(-RECENT) : []);
    const r = v.recent as Record<string, unknown>;
    out.recent = { culprits: ids(r.culprits), victims: ids(r.victims) };
  }
  return out;
}

/** How many nights the profile remembers who was cast. */
const RECENT = 10;

function remember(recent: Profile['recent'], cast: NonNullable<RunResult['cast']>): NonNullable<Profile['recent']> {
  const r = recent ?? { culprits: [], victims: [] };
  return {
    culprits: [...r.culprits, ...(cast.culprit ? [cast.culprit] : [])].slice(-RECENT),
    victims: [...r.victims, ...(cast.victim ? [cast.victim] : [])].slice(-RECENT),
  };
}

/**
 * docs/48 §2: who to keep off the next night from the neighbourhood: the last culprit (never twice
 * running) and the last ten people wronged.
 */
export function continuityOf(profile: Pick<Profile, 'recent'>): { culprits: string[]; victims: string[] } | undefined {
  if (!profile.recent) return undefined;
  return { culprits: profile.recent.culprits.slice(-1), victims: profile.recent.victims.slice(-RECENT) };
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

/**
 * docs/39 §5: the teach-once page shows before the office on a profile's
 * first nights: until the first full-credit report, on the first night, and
 * on any night at Raw.
 */
export function teachOn(profile: Pick<Profile, 'runs' | 'wins'>, tier: TierIndex): boolean {
  if (profile.wins > 0) return false;
  return profile.runs === 0 || tier === 0;
}
