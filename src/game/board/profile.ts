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
  /**
   * docs/77: tiers with at least one report that named the right culprit, perfect or not, in tier
   * order. The title page's "Open tonight's case" goes one above the highest of these (and of
   * `cleared`). Absent on a profile written before it.
   */
  named?: TierIndex[];
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
  /**
   * docs/55 6: what each of the last ten nights dealt (cards, voicings, the hand-written asides),
   * most recent last. The next night's hand prefers what none of them dealt, and never deals last
   * night's again while anything else fits.
   */
  dealt?: string[][];
  /**
   * Full-credit reports per tier, keyed by `String(tier)`. Absent on a profile written before the
   * title page chose the tier (a cleared tier there counts as cleared once: `clearsAt`).
   */
  clears?: Partial<Record<string, number>>;
  /**
   * docs/67: gold stars per tier, keyed by `String(tier)`: perfect reports with no hint taken. (A
   * star is a perfect report, which is what a clear always was: `starsAt` counts them.)
   */
  golds?: Partial<Record<string, number>>;
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
  /** docs/55 6: what the night dealt (`dealtIds` of its spent list). */
  dealt?: string[];
  /** docs/67: the hints taken. A full-credit report with none is a gold star. Absent is none. */
  hints?: number;
  /** docs/77: the report named the right culprit, whatever else it got. Absent: only if it won. */
  culprit?: boolean;
}

export interface RecordOutcome {
  profile: Profile;
  /** A full-credit report. */
  won: boolean;
  /**
   * docs/77: what this report did for tonight's tier. It named the right culprit at a tier above any
   * named before, so "Open tonight's case" moves up to `next` (null past Hard-boiled, the last).
   * Null when it didn't.
   */
  news: { done: TierIndex; next: TierIndex | null } | null;
}

/** Fold one filed report into the profile. Pure. */
export function recordRun(profile: Profile, result: RunResult): RecordOutcome {
  const won = result.asked > 0 && result.points === result.asked;
  const next: Profile = { ...profile, cleared: [...profile.cleared], best: { ...profile.best }, runs: profile.runs + 1, wins: profile.wins + (won ? 1 : 0) };
  if (result.cast) next.recent = remember(profile.recent, result.cast);
  if (result.dealt && result.dealt.length) next.dealt = [...(profile.dealt ?? []), result.dealt].slice(-RECENT);
  const tier = result.tier;
  // docs/77: the right culprit moves tonight's tier on, perfect or not (a full-credit report named them).
  let news: RecordOutcome['news'] = null;
  if (won || result.culprit) {
    const top = topNamed(profile);
    next.named = TIERS.filter((t) => t === tier || (profile.named ?? []).includes(t));
    if (tier > top) news = { done: tier, next: tier < 5 ? ((tier + 1) as TierIndex) : null };
  }
  if (!won) return { profile: next, won, news };
  next.clears = { ...(profile.clears ?? {}), [String(tier)]: clearsAt(profile, tier) + 1 };
  if (!result.hints) next.golds = { ...(profile.golds ?? {}), [String(tier)]: goldsAt(profile, tier) + 1 };
  if (!profile.cleared.includes(tier)) next.cleared = TIERS.filter((t) => t === tier || next.cleared.includes(t));
  const delta = result.actionsUsed - result.par;
  const old = next.best[String(tier)];
  next.best[String(tier)] = old === undefined ? delta : Math.min(old, delta);
  return { profile: next, won, news };
}

/** docs/77: the highest tier with the right culprit named on it (a cleared tier did), or -1 for none. */
function topNamed(profile: Pick<Profile, 'cleared' | 'named'>): number {
  return Math.max(-1, ...profile.cleared, ...(profile.named ?? []));
}

/** Take whatever is in the store and keep only what makes sense. Never throws. */
export function sanitizeProfile(value: unknown): Profile {
  const out = emptyProfile();
  if (typeof value !== 'object' || value === null) return out;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return out;
  if (Array.isArray(v.cleared)) out.cleared = TIERS.filter((t) => (v.cleared as unknown[]).includes(t));
  if (Array.isArray(v.named)) {
    const named = TIERS.filter((t) => (v.named as unknown[]).includes(t));
    if (named.length) out.named = named;
  }
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
  if (typeof v.clears === 'object' && v.clears !== null) {
    const clears: Partial<Record<string, number>> = {};
    for (const t of out.cleared) {
      const n = (v.clears as Record<string, unknown>)[String(t)];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 1) clears[String(t)] = Math.floor(n);
    }
    if (Object.keys(clears).length) out.clears = clears;
  }
  // docs/67: gold stars, on cleared tiers only, never more than the tier's clears.
  if (typeof v.golds === 'object' && v.golds !== null) {
    const golds: Partial<Record<string, number>> = {};
    for (const t of out.cleared) {
      const n = (v.golds as Record<string, unknown>)[String(t)];
      if (typeof n === 'number' && Number.isFinite(n) && n >= 1) golds[String(t)] = Math.min(Math.floor(n), clearsAt(out, t));
    }
    if (Object.keys(golds).length) out.golds = golds;
  }
  if (Array.isArray(v.dealt)) {
    const nights = (v.dealt as unknown[]).filter((n): n is unknown[] => Array.isArray(n)).map((n) => n.filter((y): y is string => typeof y === 'string').slice(0, 2000));
    if (nights.length) out.dealt = nights.slice(-RECENT);
  }
  return out;
}

/**
 * docs/55 6: a night's spent list as the profile keeps it: each card, aside and voicing once (a
 * voicing's uses, `v:<id>#<n>`, are the voicing).
 */
export function dealtIds(spent: readonly string[]): string[] {
  return [...new Set(spent.map((x) => (x.startsWith('v:') ? x.replace(/#\d+$/, '') : x)))];
}

/** docs/55 6: what the next night's hand should know: the last ten nights' dealing, and the last night's alone. */
export function seenOf(profile: Pick<Profile, 'dealt'>): { recent: string[]; last: string[] } {
  const nights = profile.dealt ?? [];
  return { recent: [...new Set(nights.flat())], last: [...(nights[nights.length - 1] ?? [])] };
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

/** How many full-credit reports a tier has had: at least one if it is cleared, whatever the profile kept. */
export function clearsAt(profile: Pick<Profile, 'cleared' | 'clears'>, tier: TierIndex): number {
  const n = profile.clears?.[String(tier)] ?? 0;
  return Math.max(n, profile.cleared.includes(tier) ? 1 : 0);
}

/** docs/67: stars at a tier: its perfect reports (a clear is one). */
export function starsAt(profile: Pick<Profile, 'cleared' | 'clears'>, tier: TierIndex): number {
  return clearsAt(profile, tier);
}

/** docs/67: gold stars at a tier: its perfect reports with no hint taken. */
export function goldsAt(profile: Pick<Profile, 'golds'>, tier: TierIndex): number {
  return profile.golds?.[String(tier)] ?? 0;
}

/** docs/67: a tier's best, for the title page's list: a gold star, a star, or nothing yet. */
export function bestAt(profile: Pick<Profile, 'cleared' | 'clears' | 'golds'>, tier: TierIndex): 'gold' | 'star' | null {
  return goldsAt(profile, tier) > 0 ? 'gold' : starsAt(profile, tier) > 0 ? 'star' : null;
}

/**
 * The tier the title page's one button opens. docs/77 (2026-10-28): every tier is open from the first
 * night, and this is only a suggestion: Raw on a profile that has never named the right culprit, else
 * one above the highest tier where it has (Hard-boiled at most). Perfect isn't needed to move on;
 * the stars are for that.
 */
export function tonightTier(profile: Pick<Profile, 'cleared' | 'named'>): TierIndex {
  return Math.min(5, topNamed(profile) + 1) as TierIndex;
}
