/**
 * docs/48 §2: the generator casts a night from the bible.
 *
 * The puzzle is built exactly as for a dealt cast (`generate.ts`): the same
 * roles, rows, lies, lists and checks. What the bible changes is who and where.
 * Before the rows are drawn, `castNight` picks:
 *
 * - the scene: the dead man's flat (a murder) or the owner's (a lost thing), in
 *   a building nobody watches, since a watcher at the door would have seen who
 *   went up;
 * - the night place (a bar, club, restaurant or theatre with its watcher), and
 *   the second place: a watched house whose shelf holds the means, or a
 *   workplace whose hours end when the means stops being there (Coddled and
 *   Medium), or for a small case a second watched place or the neighbours'
 *   house;
 * - the suspects, from people whose homes and works fit: a lodger lodges where
 *   the generator has them lodge, and nobody lives or works at a place in play
 *   unless the night puts them there (flats in an unwatched building are each
 *   their own);
 * - motives from ties: the suspect's own tie to the dead man or the owner, or
 *   one through somebody they're both tied to (`motives.ts`), never two alike;
 * - the innocent liar's secret from their own list, at its own place: the card
 *   room, or a back room or a booth inside a place the night doesn't otherwise
 *   use, which becomes the unwatched place of the night;
 * - the watchers fixed to their places, the fence fixed to the venue, and the
 *   fences kept out of the suspect pool;
 * - continuity: nobody the profile is keeping off tonight.
 *
 * It returns the pools' shapes (`VenueDef`, `HouseDef`, `UDef`, `WorkDef`) filled
 * from the bible, and the people, so the generator reads them where it would
 * have read a dealt draw. A night the bible can't cast is refused, and the
 * generator tries its next attempt.
 */

import * as K from '../content.js';
import type { Rng } from '../rng.js';
import type { CaseType, Hour, TierIndex } from '../types.js';
import { meansOfDetail, type MeansKey } from './means.js';
import { motivesFor, ofVictim, type Motive } from './motives.js';
import { boardOpen, shortName, worksOpen, type Bible, type BiblePerson, type BiblePlace, type TieKind } from './types.js';

export interface WorldCtx {
  /** The world's name, as the case records it: "neighbourhood". */
  name: string;
  bible: Bible;
  /** docs/48 §2, continuity: bible ids not to cast as the culprit, and not as the one wronged. */
  avoid?: { culprits?: string[]; victims?: string[] };
}

/** A person as the generator holds a name: the dealt fields, and the bible's own forms. */
export interface CastName {
  given: string;
  family: string;
  female: boolean;
  /** The bible id, which is also the case's person id. */
  id: string;
  /** "Nora Rafferty". */
  full: string;
  /** "Mrs. Rafferty", "Sokol". */
  short: string;
  /** "Mrs. Nora Rafferty": how the office introduces them. */
  title: string;
}

export interface CastIn {
  rng: Rng;
  tier: TierIndex;
  type: CaseType;
  /** The roles, by suspect index: C, L, R, N, I. */
  tags: string[];
  variant?: 'pair' | 'face';
  secretLiar: boolean;
  refuses: boolean;
  admits: boolean;
  hours: Hour[];
  hc: Hour;
  windowed: boolean;
  wantWork: boolean;
  wantSecond: boolean;
}

export type SmallMeansDef = (typeof K.SMALL_MEANS)[number];
export type RoomingMeansDef = (typeof K.ROOMING_MEANS)[number];
export type HolderDef = (typeof K.HOLDERS)[number] & { person?: string };

export type Slot = 'S' | 'B' | 'X' | 'U' | 'H' | 'YH';

export interface Cast {
  venue: K.VenueDef;
  rooming: K.HouseDef;
  u: K.UDef;
  work?: K.WorkDef;
  second?: K.VenueDef;
  sm?: SmallMeansDef;
  rm?: RoomingMeansDef;
  /** The bible's places in play, by the generator's slot (S, H and YH are buildings; the rooms are somebody's). */
  at: Partial<Record<Slot, BiblePlace>>;
  /** U is somewhere inside a place the night doesn't otherwise use: "the back booth behind the flour sacks". */
  uHide?: string;
  /** Case places, ready made: name, short, street, and the key the book reads them by. */
  placeNames: Partial<Record<Slot, { name: string; short: string; street: string; key: string; world: string; stage?: boolean }>>;
  suspects: BiblePerson[];
  /** Each suspect's reason, by index. */
  motives: Motive[];
  victim?: BiblePerson;
  client: BiblePerson;
  barkeep: BiblePerson;
  xwatcher?: BiblePerson;
  ukeeper?: BiblePerson;
  company?: BiblePerson;
  company2?: BiblePerson;
  keeper?: BiblePerson;
  y?: BiblePerson;
  /** Suspect indices. */
  worker?: number;
  resident?: number;
  lodges: Set<number>;
  fence: HolderDef;
  /** The liar's secret, from their own list. */
  secret?: string;
}

const VENUE_KINDS = new Set(['bar', 'club', 'restaurant', 'theatre']);

/**
 * docs/48 Bible 2: may a woman be found dead? The bible, the board's cards, the reasons (`ofVictim`)
 * and the shelf's words already say a dead woman as one, but the engine's own lines still say "him":
 * docs/25, "Bible 2", lists every file and line, starting with the victim's `female: false` in
 * `generate.ts`. Off until that gender pass lands; until then only men are found dead, and women
 * are clients, owners, suspects and culprits.
 */
export const WOMEN_VICTIMS = false;

/** A bible place's name as the generator says it: whole the first time, short after. */
export function placeWords(p: BiblePlace): { name: string; short: string } {
  const short = (p.name.split(',')[0] as string).trim();
  return { name: p.name.includes(',') ? p.name : `${p.name} on ${p.street}`, short };
}

/** Rooms in a building: "in the Excelsior on East Houston Street". */
function within(p: BiblePlace): string {
  const short = (p.name.split(',')[0] as string).trim();
  return short.includes(p.street.replace(/ Street$| Avenue$/, '')) ? `in ${short}` : `in ${short} on ${p.street}`;
}

/** A theatre with a stage, not a screen. */
function isStage(p: BiblePlace): boolean {
  const s = `${p.name} ${p.details.map((d) => d.text).join(' ')} ${p.arrivals.map((a) => a.text).join(' ')}`.toLowerCase();
  if (/\bpicture house\b|\bpictures\b|\bmovie|\bnewsreel|\bfilm\b|\bscreen\b/.test(s)) return false;
  return p.kind === 'theatre';
}

export function nameOf(p: BiblePerson): CastName {
  const short = shortName(p);
  return {
    given: p.first,
    family: p.last,
    female: p.gender === 'f',
    id: p.id,
    full: `${p.first} ${p.last}`,
    short,
    title: `${p.honorific ? `${p.honorific} ` : ''}${p.first} ${p.last}`,
  };
}

/** The tie of `a` to `b`, if any. */
export function tieOf(a: BiblePerson, b: BiblePerson): { kind: TieKind; line: string } | undefined {
  return a.ties.find((t) => t.to === b.id);
}

/** Do these board hours, inclusive, run through the slice of the evening? */
function covers(open: [number, number], from: number, to: number): boolean {
  return open[0] <= from && open[1] >= to;
}

/**
 * What kind of business a workplace is, for the pools' own words: the dentist's surgery, the
 * pharmacy, the pawnshop, the photographer's studio (`WORKPLACES`), by what its name, its details
 * and its workers say. The means in its details must agree.
 */
function workKind(b: Bible, p: BiblePlace, key: MeansKey): K.WorkDef | undefined {
  const words = `${p.name} ${p.details.map((d) => `${d.id} ${d.text}`).join(' ')} ${b.people.filter((x) => x.works?.place === p.id).map((x) => x.job).join(' ')}`.toLowerCase();
  const by = (re: RegExp, i: number) => (re.test(words) ? (K.WORKPLACES[i] as K.WorkDef) : undefined);
  const def = by(/dent|surgery|tooth|teeth/, 0) ?? by(/pharmac|druggist|chemist|dispens/, 1) ?? by(/pawn|pledge/, 2) ?? by(/photograph|darkroom|studio/, 3);
  const kind = key === 'chloral' ? 'chloral' : key === 'revolver' ? 'gun' : key === 'cyanide' ? 'poison' : undefined;
  if (def && def.means === kind) return def;
  return K.WORKPLACES.find((w) => w.means === kind);
}

/** A workplace's means, in its details: one the pools' workplaces know. */
function workMeans(p: BiblePlace): MeansKey | undefined {
  return p.details.map(meansOfDetail).find((k): k is MeansKey => k === 'chloral' || k === 'revolver' || k === 'cyanide');
}

/** docs/48: the rat poison on the janitor's cellar shelf. The pools have no such means, so the bible's world brings its own. */
const RAT_POISON: RoomingMeansDef = {
  id: 'rat-poison',
  kind: 'poison',
  name: 'rat poison',
  shelf: 'the rat poison on the cellar shelf',
  origin: 'the tin of rat poison off the cellar shelf at {x}',
  scene: 'A cup of cocoa gone cold, bitter at the bottom. Beside it a tin with a skull on the label, from the cellar shelf at {x}. Somebody made him cocoa.',
  what: 'the table',
  police: 'his heart',
  delay: [20, 60],
};

/** A watched house's means, as the pools have it (`ROOMING_MEANS`): the chloral, the revolver, the knife, the laudanum; or the bible's rat poison. */
function roomingMeans(d: { id: string; text: string }): RoomingMeansDef | undefined {
  const k = meansOfDetail(d);
  if (k === 'rat-poison') return RAT_POISON;
  if (!k || k === 'cyanide') return undefined;
  return K.ROOMING_MEANS.find((m) => m.id === k);
}

/** The pools' words for the unwatched place, by what it is. */
const U_KINDS: { re: RegExp; keeper: string; companion?: string; honest: string; more: string[] }[] = [
  { re: /card|poker|pinochle|game|baize/, keeper: 'the man who runs the game', companion: 'two men off the docks I didn’t know', honest: 'went up to {p} to watch the game and not play', more: ['went up to {p} to collect what {they} was owed', 'went up to {p} to see who was winning'] },
  { re: /booth|flour|numbers|slips/, keeper: 'the man in the booth', companion: 'two men I didn’t know', honest: 'went round to {p} to see a man about a horse', more: ['went round to {p} to settle up for the week', 'went round to {p} to hear who’d won'] },
  { re: /curtain|dance floor/, keeper: 'the cigarette girl', companion: 'somebody in a good suit I didn’t know', honest: 'went through {p} to dance', more: ['went through {p} to hear the last set', 'went through {p} to sit where it was dark'] },
  { re: /boxes|wings|backstage|costume/, keeper: 'the stage door', companion: 'somebody in the next box I didn’t know', honest: 'went up to {p} to see the last act', more: ['went up to {p} to see a friend in the company', 'went up to {p} to watch the death scene again'] },
  { re: /alley|yard|roof|back stair|back hall/, keeper: 'the cook', companion: 'somebody having a smoke I didn’t know', honest: 'went out to {p} for a smoke and a quiet word', more: ['went out to {p} to meet somebody', 'went out to {p} for some air'] },
  { re: /kitchen|curtained booth/, keeper: 'the cook', companion: 'somebody at the next table I didn’t know', honest: 'went to {p} for a late plate', more: ['went to {p} for soup and a quiet word', 'went to {p} to settle a bill'] },
  { re: /coats|pledge|counter|cage/, keeper: 'the clerk', companion: 'a man from uptown I didn’t know', honest: 'went round to {p} to see about a pledge', more: ['went round to {p} to look at a coat', 'went round to {p} to ask about a ring'] },
  { re: /surgery|frosted|cabinet/, keeper: 'the dentist', companion: 'a man with his jaw tied up I didn’t know', honest: 'went round to {p} about a tooth', more: ['went round to {p} to pay a bill', 'went round to {p} about a loose filling'] },
  { re: /plaster/, keeper: 'the dentist', companion: 'a man with his jaw tied up I didn’t know', honest: 'went round to {p} about a set of teeth', more: ['went round to {p} to pay for a plate', 'went round to {p} about a new tooth'] },
  { re: /band room|dressing room/, keeper: 'the band', companion: 'a drummer I didn’t know', honest: 'went back to {p} to see the band between sets', more: ['went back to {p} to borrow a cigarette off the band', 'went back to {p} to ask for a song'] },
  { re: /cellar|storeroom|stock room|coal hole/, keeper: 'the porter', companion: 'somebody sitting on a crate I didn’t know', honest: 'went down to {p} for a quiet drink out of the way', more: ['went down to {p} to fetch something for somebody', 'went down to {p} to cool off'] },
];

/** A hide somebody can spend an hour in: a back room, a booth, a cellar, the wings. Not a drawer or a tray. */
export function roomHide(h: string): boolean {
  // And a thing you can be "at": "the back booth", not "behind the velvet curtain".
  if (/^(behind|under|in|inside|through|past|among|below|above|beside|up|down)\b/i.test(h.trim())) return false;
  // A door is a way in, not somewhere to spend an hour ("the alley door to the yard").
  if (/^(the )?(\w+ )?door\b/i.test(h.trim())) return false;
  return /\b(room|booth|cellar|kitchen|alley|yard|wings|boxes|backstage|curtain|stairs?|roof|hall|garage|attic|flat|surgery)\b/i.test(h) && !/\b(drawer|tray|box|case|cabinet|layer|chair|closet)\b/i.test(h);
}

function uWords(text: string): (typeof U_KINDS)[number] {
  const s = text.toLowerCase();
  return U_KINDS.find((k) => k.re.test(s)) ?? (U_KINDS[1] as (typeof U_KINDS)[number]);
}

/**
 * docs/48 §1: the fence is fixed per venue. Somebody who works there and buys things (a bookmaker
 * in the back booth, a cigarette girl who has bought off half the thieves on the street), or, where
 * the bible has nobody, one of the pools' three, always the same one at that place.
 */
export function fenceOf(b: Bible, venue: BiblePlace): HolderDef {
  const watcher = venue.watcher?.person;
  const there = b.people.filter((p) => p.works?.place === venue.id && p.id !== watcher);
  const buys = there.find((p) => /\bfence\b|\bbuys\b|\bbought\b|bookmaker|bookie|receiver/i.test(`${p.job} ${p.asVictim.why} ${p.doing.map((d) => d.text).join(' ')}`));
  if (buys) {
    const n = nameOf(buys);
    const job = buys.job.replace(/^an? /, 'the ');
    // "Went straight to Marsh": the handover says the fence the way the room does.
    return { id: buys.id, who: `${buys.last}, ${job}`, listed: `${n.short} ${job}`, kinds: ['bar', 'club', 'restaurant', 'theatre'], person: buys.id };
  }
  const fits = K.HOLDERS.filter((h) => h.kinds.includes(venue.kind));
  let h = 0;
  for (const ch of venue.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return fits[h % fits.length] as HolderDef;
}

/** Every venue's fence in a world: where a lost thing could be, as the report offers it. */
export function worldFences(b: Bible): HolderDef[] {
  const out = new Map<string, HolderDef>();
  for (const p of b.places) if (VENUE_KINDS.has(p.kind) && p.watcher) out.set(fenceOf(b, p).id, fenceOf(b, p));
  return [...out.values()];
}

/** The people who are a venue's fence: kept out of the client and suspect pool. */
export function fencePeople(b: Bible): Set<string> {
  return new Set(worldFences(b).flatMap((f) => (f.person ? [f.person] : [])));
}

/** The people a night may cast as a suspect, the dead man, the client or company: not a watcher, not a fence. */
export function castPool(b: Bible): BiblePerson[] {
  const watchers = new Set(b.places.flatMap((p) => (p.watcher ? [p.watcher.person] : [])));
  const fences = fencePeople(b);
  return b.people.filter((p) => !watchers.has(p.id) && !fences.has(p.id));
}

/**
 * Cast the night, or say why it can't be. The generator vetoes the attempt and draws again.
 */
export function castNight(w: WorldCtx, i: CastIn): { cast: Cast } | { veto: string } {
  let last = 'nothing tried';
  for (let t = 0; t < 40; t++) {
    const r = tryCast(w, i);
    if ('cast' in r) return r;
    last = r.veto;
  }
  return { veto: `the bible: ${last}` };
}

function tryCast(w: WorldCtx, i: CastIn): { cast: Cast } | { veto: string } {
  const { rng, tier, tags } = i;
  const b = w.bible;
  const murder = i.type === 'murder';
  const h0 = i.hours[0] as number;
  const hL = i.hours[i.hours.length - 1] as number;
  const place = new Map(b.places.map((p) => [p.id, p]));
  const pool = castPool(b);
  const others = b.people.filter((p) => !pool.includes(p));
  const avoidC = new Set(w.avoid?.culprits ?? []);
  const avoidV = new Set(w.avoid?.victims ?? []);
  const pick = <T>(xs: T[]): T | undefined => (xs.length ? rng.pick(xs) : undefined);
  const evening = (p: BiblePlace) => covers(boardOpen(p), h0, hL);
  const unwatchedHome = (id: string | undefined) => {
    const p = id ? place.get(id) : undefined;
    return !!p && p.kind === 'home' && !p.watcher;
  };

  // --- The night place, and the second ---------------------------------------------------------
  const B = pick(b.places.filter((p) => VENUE_KINDS.has(p.kind) && p.watcher && evening(p)));
  if (!B) return { veto: 'no watched night place open all evening' };
  const availMurder = i.hours.filter((h) => h < (i.windowed ? i.hc - 1 : i.hc));
  const lastAvail = Math.max(...availMurder);
  let X: BiblePlace | undefined;
  let work: K.WorkDef | undefined;
  let rm: RoomingMeansDef | undefined;
  let second: BiblePlace | undefined;
  let workerCands: BiblePerson[] = [];
  if (murder) {
    if (i.wantWork) {
      // A workplace open while the means is there and shut when it's gone, with a worker for those hours.
      const ws = b.places.filter((p) => {
        if (p.kind !== 'work' || !p.watcher || p.id === B.id || !p.hours) return false;
        const k = workMeans(p);
        if (!k || !workKind(b, p, k)) return false;
        const o = boardOpen(p);
        if (!(o[0] <= h0 && o[1] === lastAvail)) return false;
        return pool.some((q) => q.works?.place === p.id && covers(worksOpen(q.works), h0, lastAvail));
      });
      X = pick(ws);
      if (X) {
        const def = workKind(b, X, workMeans(X) as MeansKey) as K.WorkDef;
        workerCands = pool.filter((q) => q.works?.place === (X as BiblePlace).id && covers(worksOpen(q.works as { open: number; close: number }), h0, lastAvail));
        const xw = placeWords(X);
        // The pools' words, less the pools' own names: "a pledge ticket from Kaplan’s" is from this place.
        const label = def.label.replace('a Weiss’s pharmacy label', 'a label from {place}').replace('Kaplan’s pledge ticket', 'a pledge ticket from {place}');
        work = { ...def, name: xw.name, short: xw.short, street: X.street, label, workerJob: '', job: (b.people.find((q) => q.id === X?.watcher?.person) as BiblePerson).job, poolId: `work:${def.short.replace('{owner}’s ', '')}` } as K.WorkDef;
      }
    }
    if (!X) {
      X = pick(b.places.filter((p) => p.kind === 'home' && p.watcher && p.details.some((d) => roomingMeans(d))));
      if (!X) return { veto: 'no watched house with a means on its shelf' };
      rm = pick(X.details.map((d) => roomingMeans(d)).filter((x): x is RoomingMeansDef => !!x));
    }
  } else if (i.wantSecond) {
    second = pick(b.places.filter((p) => p.id !== B.id && p.watcher && p.kind !== B.kind && (p.kind === 'restaurant' || p.kind === 'theatre' || p.kind === 'work') && evening(p)));
    X = second;
  }
  if (!X) {
    // A small case's neighbours: a watched house, with somebody living there.
    X = pick(b.places.filter((p) => p.kind === 'home' && p.watcher && pool.some((q) => q.home === p.id)));
    if (!X) return { veto: 'no house for the neighbours' };
  }
  const xRooming = !work && !second;
  const xIsHome = X.kind === 'home';

  // --- The dead man or the owner, and the scene --------------------------------------------------
  // A watcher at the street door would have seen who went up, so the scene is in a building nobody watches.
  let V: BiblePerson | undefined;
  let client: BiblePerson | undefined;
  if (murder) {
    V = pick(pool.filter((p) => (WOMEN_VICTIMS || p.gender === 'm') && !avoidV.has(p.id) && unwatchedHome(p.home)));
    if (!V) return { veto: 'nobody in the pool lives somewhere nobody watches' };
    // The shelf's words are written for a dead man ("Somebody made him cocoa"); a dead woman's are hers.
    if (rm && V.gender === 'f') rm = { ...rm, scene: ofVictim(rm.scene, true), police: ofVictim(rm.police, true) };
  } else {
    client = pick(pool.filter((p) => !avoidV.has(p.id) && unwatchedHome(p.home)));
    if (!client) return { veto: 'no owner lives somewhere nobody watches' };
  }
  const wronged = (V ?? client) as BiblePerson;
  const S = place.get(wronged.home) as BiblePlace;

  // --- The small case's way in --------------------------------------------------------------------
  let sm: SmallMeansDef | undefined;
  if (!murder) {
    // Somebody lodging with the owner: their tie says the owner is their landlady.
    const residents = pool.filter((p) => p.id !== wronged.id && tieOf(p, wronged)?.kind === 'landlady');
    sm = pick(K.SMALL_MEANS.filter((d) => (d.mode !== 'spare' || (xRooming && !!X?.watcher)) && (!d.resident || residents.length > 0)));
    if (!sm) return { veto: 'no way in fits' };
  }
  const mode = sm?.mode;

  // --- The suspects ------------------------------------------------------------------------------
  const used = new Set<string>([wronged.id]);
  const shorts = new Set<string>([shortName(wronged)]);
  // Places in play: the buildings with flats in them (S, H, YH) aren't anybody's but the flat's.
  const busy = new Set<string>([B.id, X.id]);
  const suspects: (BiblePerson | undefined)[] = tags.map(() => undefined);
  const motives: (Motive | undefined)[] = tags.map(() => undefined);
  const forms = new Set<string>();
  const lodges = new Set<number>();
  let H: BiblePlace | undefined;
  let worker: number | undefined;
  let resident: number | undefined;
  const take = (k: number, p: BiblePerson, m: Motive) => {
    suspects[k] = p;
    motives[k] = m;
    forms.add(m.form);
    used.add(p.id);
    shorts.add(shortName(p));
  };
  /** A suspect's best reason tonight, or none: the culprit's first, so the thief's is about money. */
  const reasonOf = (p: BiblePerson, t: string): Motive | undefined => {
    // The dead man's leverage (a secret of theirs) only for somebody whose secret isn't tonight's lie.
    const ms = motivesFor(b.people, p, wronged, murder, forms, shortName, { secrets: { placeName: (id) => (place.get(id) ? placeWords(place.get(id) as BiblePlace).short : undefined), noSecret: t === 'L' } });
    const fit = t === 'C' && !murder ? ms.filter((m) => m.kind === 'money') : ms;
    return fit[0];
  };
  const kOf = new Map<number, number>();
  {
    const seen = new Map<string, number>();
    tags.forEach((t, k) => {
      const n = seen.get(t) ?? 0;
      kOf.set(k, n);
      seen.set(t, n + 1);
    });
  }
  const order = tags.map((_, k) => k).sort((a, z) => rank(tags[a] as string) - rank(tags[z] as string));
  function rank(t: string): number {
    return t === 'C' ? 0 : t === 'L' ? 1 : t === 'I' ? 2 : t === 'R' ? 3 : 4;
  }
  /** Works somewhere the night has in play, at a post the night doesn't give them. */
  const busyWork = (p: BiblePerson) => !!p.works && busy.has(p.works.place);
  /** Lives at a place in play that isn't a house of flats or rooms (over the bar). */
  const livesInPlay = (p: BiblePerson) => busy.has(p.home) && p.home !== X?.id;

  // The worker (a murder's workplace): one of the suspects who aren't the outsider works there.
  if (work) {
    const k = pick(order.filter((x) => tags[x] !== 'N')) as number;
    const c = workerCands.filter((p) => !used.has(p.id) && !shorts.has(shortName(p)) && (tags[k] !== 'C' || !avoidC.has(p.id)) && (tags[k] !== 'C' || tier < 4 || unwatchedHome(p.home)) && reasonOf(p, tags[k] as string));
    const p = pick(c);
    if (!p) return { veto: 'nobody who works there has a reason' };
    take(k, p, reasonOf(p, tags[k] as string) as Motive);
    worker = k;
    (work as K.WorkDef).workerJob = p.job;
    if (tags[k] === 'C' && tier >= 4) H = place.get(p.home);
  }
  // A lodger with the owner, in a party where the door was left for them.
  if (sm?.resident) {
    const k = tier < 4 && rng.chance(0.5) ? tags.indexOf('C') : (pick(order.filter((x) => tags[x] !== 'N' && tags[x] !== 'C' && !suspects[x])) as number);
    const p = k === undefined || suspects[k] ? undefined : pick(pool.filter((q) => !used.has(q.id) && tieOf(q, wronged)?.kind === 'landlady' && (tags[k] !== 'C' || !avoidC.has(q.id)) && !busyWork(q) && reasonOf(q, tags[k] as string)));
    if (k === undefined || !p) return { veto: 'nobody lodges with the owner' };
    take(k, p, reasonOf(p, tags[k] as string) as Motive);
    resident = k;
  }

  let secret: { text: string; place: BiblePlace; hide?: string } | undefined;
  for (const k of order) {
    if (suspects[k]) continue;
    const t = tags[k] as string;
    const kk = kOf.get(k) as number;
    let lodge: 'may' | 'must' | 'not' = 'not';
    // At the second place at the crime hour, by the generator's design: Raw's second innocent,
    // Coddled's rival in a small case, and Hard-boiled's rival at the neighbours'. At a house they
    // lodge there; on a night shift they work it.
    const atX = (t === 'I' && kk === 1) || (!murder && t === 'R' && (tier === 1 || (tier === 5 && (i.variant === 'face' ? kk === 1 : kk === 0))));
    if (t === 'C') {
      if (murder) lodge = !work && tier < 4 ? 'may' : 'not';
      else lodge = tier < 4 && xRooming && (i.secretLiar || mode === 'spare') ? 'may' : 'not';
    } else if (t === 'R') {
      if (murder) lodge = !work ? 'may' : 'not';
    } else if (t === 'L') {
      if (i.variant === 'pair') lodge = murder && !work ? 'may' : 'not';
      else lodge = xRooming && ![...lodges].some((x) => tags[x] === 'C') ? 'may' : 'not';
    }
    if (atX && xIsHome) lodge = 'must';
    const shift = atX && X.kind === 'work';
    const ok = (p: BiblePerson): boolean => {
      if (used.has(p.id) || shorts.has(shortName(p))) return false;
      if (t === 'C' && avoidC.has(p.id)) return false;
      if (shift) {
        if (!(p.works?.place === X?.id && covers(worksOpen(p.works), i.hc, i.hc))) return false;
      } else if (busyWork(p)) return false;
      // From Medium up the culprit has a flat of their own, in a building nobody watches.
      if (t === 'C' && tier >= 4) return unwatchedHome(p.home) && (!H || p.home === H.id);
      if (p.home === X?.id) return lodge !== 'not';
      if (lodge === 'must') return false;
      return !livesInPlay(p);
    };
    let cands = pool.filter((p) => ok(p) && !!reasonOf(p, t));
    if (t === 'L' && i.variant !== 'pair') cands = cands.filter((p) => secretPlace(p) !== undefined);
    // Where a role may lodge, it lodges about as often as a dealt night draws it.
    if (lodge === 'may') {
      const share = t === 'R' ? 0.6 : t === 'C' && !murder && !i.secretLiar ? 0.4 : 0.5;
      const want = rng.chance(share);
      const side = cands.filter((p) => (p.home === X?.id) === want);
      if (side.length > 0) cands = side;
    }
    // A reason of their own beats one through somebody else.
    const direct = cands.filter((p) => reasonOf(p, t)?.id.startsWith('tie:'));
    if (direct.length > 0 && rng.chance(0.75)) cands = direct;
    const p = pick(cands);
    if (!p) return { veto: `nobody fits ${t}${kk ? kk + 1 : ''}` };
    take(k, p, reasonOf(p, t) as Motive);
    if (p.home === X.id) lodges.add(k);
    if (t === 'C' && tier >= 4) H = place.get(p.home);
    if (t === 'L' && i.variant !== 'pair') {
      secret = secretPlace(p);
      if (secret) busy.add(secret.place.id);
    }
  }
  if (tier >= 4 && !H) return { veto: 'the culprit has no flat of their own' };
  if ([...lodges].some((k) => tags[k] === 'C') && [...lodges].some((k) => tags[k] === 'L') && i.variant !== 'pair') return { veto: 'the culprit and the liar both lodge at the house' };

  /** The secret, from their own list, at a place the night can use as its unwatched place. */
  function secretPlace(p: BiblePerson): { text: string; place: BiblePlace; hide?: string } | undefined {
    for (const s of rng.shuffle(p.secrets)) {
      const pl = place.get(s.place);
      if (!pl || busy.has(pl.id) || pl.kind === 'home') continue;
      if (i.refuses && !keeperAt(pl, p)) continue;
      if (!pl.watcher) return { text: s.text, place: pl };
      const rooms = pl.hides.map((h) => h.name).filter(roomHide);
      if (rooms.length > 0) return { text: s.text, place: pl, hide: rng.pick(rooms) };
    }
    return undefined;
  }
  /** Somebody free tonight who works at a place at the crime hour, to keep it. Fences may. */
  function keeperAt(pl: BiblePlace, not?: BiblePerson): BiblePerson | undefined {
    const watcher = pl.watcher?.person;
    return [...pool, ...others].find((q) => q !== not && q.id !== watcher && !used.has(q.id) && !shorts.has(shortName(q)) && q.works?.place === pl.id && covers(worksOpen(q.works), i.hc, i.hc) && !livesInPlay(q));
  }

  // --- The unwatched place --------------------------------------------------------------------------
  let U: BiblePlace | undefined;
  let uHide: string | undefined;
  if (secret) {
    U = secret.place;
    uHide = secret.hide;
  } else if (tier >= 1) {
    // Hard-boiled's pair has somebody keep the place all evening, so it has to be somebody's work.
    const spots = b.places.filter((p) => !busy.has(p.id) && p.kind !== 'home' && (!p.watcher || p.hides.some((h) => roomHide(h.name))) && (i.variant !== 'pair' || !!keeperAt(p)));
    U = pick(spots);
    if (!U) return { veto: 'nowhere unwatched' };
    if (U.watcher) uHide = rng.pick(U.hides.map((h) => h.name).filter(roomHide));
    busy.add(U.id);
  }
  // The dead man's leverage is somewhere off tonight's map: a secret at a place in play would point
  // into the night (where the secret liar was, where the means was kept, the bar everybody was at).
  const inPlay = new Set([S.id, B.id, X.id, ...(U ? [U.id] : []), ...(H ? [H.id] : [])]);
  if (motives.some((m) => m?.id.startsWith('secret:') && inPlay.has(m.id.slice('secret:'.length)))) return { veto: 'a reason names a place in play' };
  // Somebody cast before the unwatched place was chosen mustn't work there.
  for (const p of suspects) if (p && U && p.works?.place === U.id && suspects.indexOf(p) !== worker) return { veto: `${p.id} works where the secret was` };

  // --- The rest of the people --------------------------------------------------------------------
  const barkeep = b.people.find((p) => p.id === B.watcher?.person) as BiblePerson;
  const xWatched = murder || tier <= 2;
  const xwatcher = xWatched ? b.people.find((p) => p.id === X?.watcher?.person) : undefined;
  if (xWatched && !xwatcher) return { veto: 'the second place has nobody to list who came in' };
  const takeOne = (ok: (p: BiblePerson) => boolean, from: BiblePerson[] = pool): BiblePerson | undefined => {
    const p = pick(from.filter((q) => !used.has(q.id) && !shorts.has(shortName(q)) && ok(q)));
    if (p) {
      used.add(p.id);
      shorts.add(shortName(p));
    }
    return p;
  };
  const offMap = (p: BiblePerson) => !livesInPlay(p) && !busyWork(p) && p.home !== X?.id;
  let company: BiblePerson | undefined;
  let company2: BiblePerson | undefined;
  let keeper: BiblePerson | undefined;
  let ukeeper: BiblePerson | undefined;
  let y: BiblePerson | undefined;
  // The company stays put all evening: somebody who works there all evening, a lodger at a house, or a regular.
  const stayer = (at: BiblePlace) => (p: BiblePerson) =>
    at.kind === 'home'
      ? p.home === at.id && !busyWork(p)
      : (p.works?.place === at.id && covers(worksOpen(p.works), h0, hL) && !livesInPlay(p)) || (at.kind !== 'work' && offMap(p));
  const stays = (at: BiblePlace) => takeOne((p) => at.kind !== 'home' && p.works?.place === at.id && covers(worksOpen(p.works), h0, hL) && !livesInPlay(p)) ?? takeOne(stayer(at));
  if (tier === 0) {
    company = stays(B);
    company2 = stays(X);
    if (!company || !company2) return { veto: 'no regulars to keep the rivals company' };
  }
  if (tier === 1) {
    // Coddled's regular sits with the rival at the crime hour: at the second place when it's open then.
    company = stays(work ? B : X);
    if (!company) return { veto: 'no regular for the rival' };
  }
  if (i.variant === 'pair') {
    company = U ? keeperAt(U) : undefined;
    if (!company) return { veto: 'nobody to keep the unwatched place' };
    used.add(company.id);
    shorts.add(shortName(company));
  }
  if (!murder && i.windowed) {
    // The office's lines about the neighbor who minds the pet are written for a woman.
    keeper = takeOne((p) => p.home === X?.id && p.gender === 'f' && !busyWork(p));
    if (!keeper) return { veto: 'nobody at the neighbors’ to mind the pet' };
  }
  if (i.refuses && U) {
    ukeeper = keeperAt(U);
    if (!ukeeper) return { veto: 'nobody works at the unwatched place to keep it' };
    used.add(ukeeper.id);
    shorts.add(shortName(ukeeper));
  }
  let YH: BiblePlace | undefined;
  if (i.admits) {
    y = takeOne((p) => place.get(p.home)?.kind === 'home' && p.home !== X?.id && !busyWork(p));
    if (!y) return { veto: 'nobody to have been with the liar' };
    YH = place.get(y.home);
  }
  if (murder) {
    // The client: somebody with a tie to the dead man, warm if it can be; a debt will do; else a
    // neighbor in the same building. Never one a suspect's reason runs through ("he had been at war
    // with Kaminsky’s old flame", said by the old flame), and never a sworn enemy.
    const tie = (p: BiblePerson) => tieOf(p, V as BiblePerson)?.kind ?? '';
    const free = (p: BiblePerson) => offMap(p) && !motives.some((m) => m?.via === p.id);
    const warm = (p: BiblePerson) => ['in-law', 'friend', 'old-flame', 'landlady', 'lodger', 'employer', 'employee'].includes(tie(p));
    client =
      takeOne((p) => warm(p) && free(p)) ??
      takeOne((p) => ['owes', 'owed'].includes(tie(p)) && free(p)) ??
      takeOne((p) => !tie(p) && p.home === S.id && free(p)) ??
      takeOne((p) => !tie(p) && free(p));
    if (!client) return { veto: 'no client' };
  }
  const fence = murder ? (K.HOLDERS[0] as HolderDef) : fenceOf(b, B);
  if (fence.person && used.has(fence.person)) return { veto: 'the venue’s fence is cast as somebody else' };

  // A reason through somebody else names them, except somebody in tonight's case, who'd be named
  // again where the night hasn't put them: then it's "her friend", and the reasons must still differ.
  const inCase = new Set([...suspects, V, client, barkeep, xwatcher, ukeeper, company, company2, keeper, y].flatMap((p) => (p ? [p.id] : [])));
  if (fence.person) inCase.add(fence.person);
  motives.forEach((m, k) => {
    if (m?.via && m.anon && inCase.has(m.via)) motives[k] = { ...m, ...m.anon, says: m.anon.says };
  });
  if (new Set(motives.map((m) => m?.form)).size < motives.length) return { veto: 'two reasons alike' };
  if (motives.some((m) => m?.id.startsWith('debt:') && m.via && inCase.has(m.via) && !(fence.person === m.via))) return { veto: 'a debt owed to somebody in the case' };

  // --- Words for the places --------------------------------------------------------------------------
  const vw = placeWords(B);
  const venue: K.VenueDef = { name: vw.name, short: vw.short, street: B.street, kind: B.kind as K.VenueDef['kind'], job: barkeep.job, ...(isStage(B) ? { stage: true } : {}) };
  const xw = placeWords(X);
  const rooming: K.HouseDef = { name: xw.name, short: xw.short, street: X.street };
  let secondDef: K.VenueDef | undefined;
  if (second) {
    const night = b.people.find((p) => p.works?.place === second?.id && p.id !== second?.watcher?.person);
    secondDef = { name: xw.name, short: xw.short, street: X.street, kind: X.kind as K.VenueDef['kind'], job: (xwatcher ?? barkeep).job, ...(X.kind === 'work' ? { workerJob: night?.job ?? 'on the night shift' } : {}), ...(isStage(X) ? { stage: true } : {}) };
  }
  let u: K.UDef = K.UNWATCHED[0] as K.UDef;
  const placeNames: Cast['placeNames'] = {};
  if (U) {
    const uw = placeWords(U);
    const name = uHide ? `${uHide} at ${uw.short}` : uw.name;
    // "The back booth behind the flour sacks" the first time, "the back booth at Sokol’s" after.
    const short = uHide ? `${(uHide.split(/,|\s+(?:behind|through|past|among|where|upstairs|under|below)\b/)[0] as string).trim()} at ${uw.short}` : uw.short;
    const words = uWords(`${uHide ?? ''} ${U.name}`);
    u = {
      name,
      short,
      street: U.street,
      kind: (uHide ? (U.kind === 'bar' ? 'club' : U.kind) : U.kind === 'bar' ? 'club' : U.kind) as K.UDef['kind'],
      secret: secret?.text ?? 'something private',
      honest: words.honest.replace(/\{p\}/g, short),
      more: words.more.map((m) => m.replace(/\{p\}/g, short)),
      keeper: ukeeper ? ukeeper.job : words.keeper,
      ...(words.companion ? { companion: words.companion } : {}),
    };
    placeNames.U = { name, short, street: U.street, key: `unwatched:nb:${U.id}${uHide ? `#${uHide}` : ''}`, world: U.id };
  }
  placeNames.B = { name: venue.name, short: venue.short, street: B.street, key: `venue:nb:${B.id}`, world: B.id, ...(venue.stage ? { stage: true } : {}) };
  placeNames.X = {
    name: xw.name,
    short: xw.short,
    street: X.street,
    key: work ? `work:nb:${X.id}` : second ? (X.kind === 'work' ? `shift:nb:${X.id}` : `venue:nb:${X.id}`) : `rooming:nb:${X.id}`,
    world: X.id,
    ...(secondDef?.stage ? { stage: true } : {}),
  };
  const owner = nameOf(wronged);
  // A dead woman's flat is "the Krantz flat": the office says a dead man's as "his own flat".
  placeNames.S = murder
    ? { name: wronged.gender === 'f' ? `the ${owner.family} flat ${within(S)}` : `${owner.short}’s flat ${within(S)}`, short: `${owner.short}’s place`, street: S.street, key: `scene:nb:${S.id}`, world: S.id }
    : { name: `the ${owner.family} flat ${within(S)}`, short: `the ${owner.family} flat`, street: S.street, key: `lost:nb:${S.id}`, world: S.id };
  if (H) {
    const c = nameOf(suspects[tags.indexOf('C')] as BiblePerson);
    placeNames.H = { name: `${c.short}’s flat ${within(H)}`, short: `${c.short}’s flat`, street: H.street, key: 'flat', world: H.id };
  }
  if (YH && y) {
    const yn = nameOf(y);
    placeNames.YH = { name: `${yn.short}’s rooms ${within(YH)}`, short: `${yn.short}’s rooms`, street: YH.street, key: 'rooms', world: YH.id };
  }

  return {
    cast: {
      venue,
      rooming,
      u,
      ...(work ? { work } : {}),
      ...(secondDef ? { second: secondDef } : {}),
      ...(sm ? { sm } : {}),
      ...(rm ? { rm } : {}),
      at: { S, B, X, ...(U ? { U } : {}), ...(H ? { H } : {}), ...(YH ? { YH } : {}) },
      ...(uHide ? { uHide } : {}),
      placeNames,
      suspects: suspects as BiblePerson[],
      motives: motives as Motive[],
      ...(V ? { victim: V } : {}),
      client: client as BiblePerson,
      barkeep,
      ...(xwatcher ? { xwatcher } : {}),
      ...(ukeeper ? { ukeeper } : {}),
      ...(company ? { company } : {}),
      ...(company2 ? { company2 } : {}),
      ...(keeper ? { keeper } : {}),
      ...(y ? { y } : {}),
      ...(worker !== undefined ? { worker } : {}),
      ...(resident !== undefined ? { resident } : {}),
      lodges,
      fence,
      ...(secret ? { secret: secret.text } : {}),
    },
  };
}
