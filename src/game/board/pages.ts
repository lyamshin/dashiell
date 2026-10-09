/**
 * docs/43 §2 and docs/44: pages, one job each, laid out on sheets.
 *
 * - the office: the givens, in the client's mouth, one quoted line a paragraph;
 * - arriving at a place: the walk, who's here, what they're doing, why I came;
 * - "Where were you tonight?": one whole account;
 * - "Who was here tonight?": one watcher's whole list;
 * - a search: one find;
 * - put it to: their line against the line that breaks it;
 * - the turn: a recap at the first lie caught, as a chapter break;
 * - the report: the form, and where I sat to fill it in.
 *
 * Each writer fills the beats it has (`sheets.ts`): why here, the walk, the
 * arrival, the staging, the ask, the reaction, the job, the thought, the close
 * and the hand-off. The sheet lays them out. About one joke a page (the hand
 * deals one card flagged `joke`, or a callback, and then only plain ones).
 * Every fact on a page is a line the player now holds, said the way that
 * person would say it; the thought (`thought.ts`) says only what those lines
 * add up to, never a verdict.
 */

import type { Card } from '../voice/cards.js';
import type { Block } from '../types.js';
import { tidyPunctuation } from '../voice/prose.js';
import { minutesAfter } from '../clock.js';
import type { Line } from './knowledge.js';
import {
  accountOf,
  candidateLines,
  collisionsOf,
  confrontationOf,
  crimeHourKnown,
  judgeLine,
  knownPeople,
  linesHeld,
  listOf,
  peopleAt,
  solveHeld,
  solveRun,
  type Judgement,
} from './knowledge.js';
import { Hand } from './decks.js';
import { spokenAccount, spokenList, type Manner } from './tell.js';
import {
  OFFICE,
  andList,
  budgetCalls,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  personOf,
  placeName,
  placeOf,
  pronOf,
  solverHeld,
  suspectsOf,
  victimOf,
  type BoardCase,
  type BoardDeal,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';
import { sourceName, starPlace, starredSteps } from './stars.js';
import { sheetsFor, type Beat, type SheetJob } from './sheets.js';
import { placeThread, sourceOf as sourceOfQ, threadFor, type Pointer } from './thread.js';
import { breakSaid, claimSaid, shortOther, thoughtOf, type Thought } from './thought.js';
import { walkBetween } from './walk.js';

export { breakSaid };

/* ------------------------------------------------------------------ *
 * The writer.
 * ------------------------------------------------------------------ */

type Voice = 'establish' | 'presence' | 'exchange' | 'thought' | 'find' | 'chapter' | 'recap' | 'answer' | 'act' | 'narrator' | 'errand';

interface Part {
  text: string;
  voice: Voice;
}

export interface Writer {
  d: BoardDeal;
  c: BoardCase;
  /** The run as it stands with this page's question asked. */
  run: BoardRun;
  /** The run as it stood before this page. */
  before: BoardRun;
  hand: Hand;
  blocks: Block[];
  /** The page paid off a role set up earlier (a callback). */
  callback?: boolean;
  told: Set<string>;
  hours: Set<number>;
  people: Set<string>;
  places: Set<string>;
  /** docs/44: the beats filled so far, waiting for the sheet. */
  parts: Partial<Record<Beat, Part[]>>;
  /** The sheet the page was laid out on, and the beats it filled, in order. */
  sheet?: string;
  beats: string[];
  thought?: { text: string; refs: string[] };
  /** The hand-off's words, so the next page needn't give the reason again. */
  handoff?: string;
  /** The recap's clauses: the notebook said aloud, which has to name people. */
  recap?: string;
}

export function writer(d: BoardDeal, before: BoardRun, run: BoardRun, page: number): Writer {
  return {
    d,
    c: d.kase,
    run,
    before,
    hand: new Hand(run.seed * 7 + run.tier, page, run.spent),
    blocks: [],
    told: new Set(),
    hours: new Set(),
    people: new Set(),
    places: new Set(),
    parts: {},
    beats: [],
  };
}

function tidy(text: string): string {
  return tidyPunctuation(text.replace(/\s+/g, ' ').trim());
}

/** Fill a beat. Several parts in one beat are several paragraphs, unless the sheet runs the beat into another. */
function put(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator'): void {
  if (!text) return;
  const t = tidy(text);
  if (!t) return;
  (w.parts[beat] ??= []).push({ text: t, voice });
}

/** Run a part onto the last one in the beat ("…in the doorway. Up close he was thin…"). */
function putOn(w: Writer, beat: Beat, text: string | null | undefined, voice: Voice = 'narrator'): void {
  if (!text) return;
  const ps = w.parts[beat];
  const last = ps?.[ps.length - 1];
  if (last) last.text = tidy(`${last.text} ${text}`);
  else put(w, beat, text, voice);
}

/**
 * Lay the page out on one of the job's sheets: paragraphs in the sheet's
 * order, beats that share a paragraph run together when they're short enough
 * to read as one.
 */
function lay(w: Writer, job: SheetJob): void {
  const sheets = sheetsFor(job);
  const sheet = sheets[sheets.length > 1 ? w.hand.rng.int(sheets.length) : 0];
  if (!sheet) return;
  w.sheet = w.sheet ? `${w.sheet}+${sheet.id}` : sheet.id;
  const placed = new Set<Beat>();
  for (const para of sheet.paras) {
    const filled = para.filter((b) => (w.parts[b] ?? []).length > 0);
    if (filled.length === 0) continue;
    for (const b of filled) {
      placed.add(b);
      w.beats.push(b);
    }
    if (filled.length === 1) {
      for (const p of w.parts[filled[0] as Beat] ?? []) w.blocks.push({ kind: 'prose', text: p.text, voice: p.voice });
      continue;
    }
    // Run the last part of one beat into the first of the next, when the two are short.
    const ps = filled.flatMap((b) => w.parts[b] ?? []);
    const out: Part[] = [];
    for (const p of ps) {
      const last = out[out.length - 1];
      if (last && words(last.text) + words(p.text) <= 70) last.text = `${last.text} ${p.text}`;
      else out.push({ ...p });
    }
    for (const p of out) w.blocks.push({ kind: 'prose', text: p.text, voice: p.voice });
  }
  // A beat the sheet hasn't room for still gets said, at the end.
  for (const b of Object.keys(w.parts) as Beat[]) {
    if (placed.has(b)) continue;
    w.beats.push(b);
    for (const p of w.parts[b] ?? []) w.blocks.push({ kind: 'prose', text: p.text, voice: p.voice });
  }
  w.parts = {};
}

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function words(t: string): number {
  return t.split(/\s+/).length;
}

/** Slots with a capitalised twin for every key: `{name}` and `{Name}`. */
export function withCaps(slots: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = { ...slots };
  for (const [k, v] of Object.entries(slots)) {
    const K = cap(k);
    if (K !== k && out[K] === undefined && v !== undefined) out[K] = cap(v);
  }
  return out;
}

/** A person's slots: name, pronouns, and how Dashiell addresses them ("Mr. Ashby", "Mrs. Cheatham"). */
function who(c: BoardCase, p: PersonId): Record<string, string | undefined> {
  const pr = pronOf(c, p);
  const short = nameOf(c, p);
  const female = personOf(c, p)?.female === true;
  const title = /^Mrs\.|^Mr\./.test(short) ? short : female ? undefined : `Mr. ${short}`;
  return { name: short, he: pr.he, him: pr.him, his: pr.his, title };
}

/** License what a pointer or a thought names, for the reader lint. */
function license(w: Writer, x: { hours: Hour[]; people: PersonId[]; places: PlaceId[] }): void {
  for (const h of x.hours) w.hours.add(h);
  for (const p of x.people) w.people.add(p);
  for (const p of x.places) if (p) w.places.add(p);
}

/* ------------------------------------------------------------------ *
 * Places and people, by kind.
 * ------------------------------------------------------------------ */

export type PlaceKind = 'bar' | 'club' | 'restaurant' | 'theatre' | 'rooming' | 'scene-murder' | 'scene-lost' | 'work' | 'shift' | 'unwatched' | 'flat' | 'rooms' | 'home';

export function placeKind(c: BoardCase, id: PlaceId): PlaceKind {
  const p = placeOf(c, id);
  if (!p) return 'home';
  const key = p.key ?? '';
  if (p.scene) return isMurder(c) ? 'scene-murder' : 'scene-lost';
  if (key.startsWith('rooming')) return 'rooming';
  if (key.startsWith('work')) return 'work';
  if (key.startsWith('shift')) return 'shift';
  if (key.startsWith('unwatched')) return 'unwatched';
  if (key === 'flat') return 'flat';
  if (key === 'rooms') return 'rooms';
  if (p.kind === 'bar' || p.kind === 'club' || p.kind === 'restaurant' || p.kind === 'theatre') return p.kind;
  return p.kind === 'work' ? 'work' : 'home';
}

/** The staging cards' kinds: where a person sits down to be asked. */
function stageKind(c: BoardCase, id: PlaceId): string {
  if (id === OFFICE) return 'office';
  const k = placeKind(c, id);
  if (k === 'club') return 'bar';
  if (k === 'rooming' || k === 'flat' || k === 'rooms' || k === 'home' || k === 'scene-lost' || k === 'scene-murder') return 'home';
  if (k === 'shift') return 'work';
  if (k === 'unwatched') return 'back';
  return k;
}

/** One more kind of card a draw mustn't deal, on top of what the page already avoids. */
function alsoAvoid(base: RegExp | null, more: RegExp): RegExp {
  return base ? new RegExp(`${base.source}|${more.source}`, 'i') : more;
}

/** A theatre with a stage has no pictures: a card that says otherwise isn't dealt there. */
function stageGuard(w: Writer, place: PlaceId): void {
  w.hand.avoid = placeOf(w.c, place)?.stage ? /\bpictures?\b|\bscreen\b|\bnewsreel\b/i : null;
}

/** A watcher's job, from the case's description: "the bartender at the Velvet Room" → `bartender`. */
export function jobKey(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('bartender')) return 'bartender';
  if (d.includes('doorkeeper')) return 'doorkeeper';
  if (d.includes('head waiter')) return 'waiter';
  if (d.includes('change booth')) return 'booth';
  if (d.includes('cashier')) return 'cashier';
  if (d.includes('usher') || d.includes('ticket seller') || d.includes('house manager')) return 'usher';
  if (d.includes('landlady')) return 'landlady';
  if (d.includes('receptionist')) return 'desk';
  if (d.includes('pharmacist') || d.includes('pawnbroker') || d.includes('at the counter')) return 'counter';
  if (d.includes('supervisor') || d.includes('foreman') || d.includes('night editor')) return 'boss';
  if (d.includes('runs the game')) return 'game';
  if (d.includes('slips')) return 'slips';
  if (d.includes('steward')) return 'steward';
  return 'counter';
}

/** "the house manager", from "the house manager at the Thalia". */
function jobWords(desc: string): string {
  return desc.split(/,| at /)[0] ?? desc;
}

/** The old `watch` deck's fixture role for a watcher's job, when there is one. */
const WATCH_ROLE: Record<string, string> = { bartender: 'bartender', doorkeeper: 'doorman', waiter: 'counterman', cashier: 'counterman', usher: 'ticket-taker', landlady: 'landlady', counter: 'druggist' };

/** The character deck's archetype for a job, where one fits exactly (M11's look of a trade). */
const ARCHETYPE: [RegExp, string][] = [
  [/switchboard/, 'arch-switchboard'],
  [/piano teacher/, 'arch-piano-teacher'],
  [/bookmaker/, 'arch-bookmaker'],
  [/sewing-machine/, 'arch-seamstress'],
  [/cab driver/, 'arch-hackman'],
  [/typist/, 'arch-secretary'],
  [/dentist/, 'arch-dentist'],
  [/pawnbroker/, 'arch-pawnman'],
  [/copy reader/, 'arch-reporter'],
  [/bartender/, 'bartender'],
  [/landlady/, 'landlady'],
  [/usher|ticket seller/, 'ticket-taker'],
  [/doorkeeper/, 'doorman'],
  [/pharmacist/, 'druggist'],
  [/insurance agent|night-school teacher/, 'arch-bookkeeper'],
  [/milliner/, 'arch-seamstress'],
  [/takes the slips/, 'arch-runner'],
  [/runs the game/, 'arch-bouncer'],
  [/receptionist/, 'arch-secretary'],
];

function archetypeOf(desc: string): string | undefined {
  return ARCHETYPE.find(([re]) => re.test(desc))?.[1];
}

/** A first look at somebody, from the character deck, when their trade has a card. */
function lookAt(w: Writer, p: PersonId): string | null {
  const who_ = personOf(w.c, p);
  if (!who_) return null;
  const arch = archetypeOf(who_.job ?? who_.description);
  if (!arch) return null;
  const pr = pronOf(w.c, p);
  const drawn = w.hand.drawOld(
    'character',
    (card: Card) => card.tags.role === arch && card.tags.kind === 'look' && !/\{place\}|\{victim\}/.test(card.text) && !w.hand.used(card.id),
    { He: pr.He, he: pr.he, his: pr.his, him: pr.him, His: pr.His, name: who_.short },
    true,
  );
  const trait = drawn?.card.exports?.trait;
  if (trait?.pay?.length) w.run.traits = { ...(w.run.traits ?? {}), [p]: { short: trait.short, pay: trait.pay } };
  return drawn?.text ?? null;
}

/**
 * Set a page up to pay somebody off: their trait, from a first look now if
 * they haven't had one, and the page's joke kept for the last word. Returns
 * the look, when there is one to say.
 */
function setUp(w: Writer, p: PersonId): string | null {
  const look = w.run.traits?.[p] ? null : lookAt(w, p);
  if (hasRole(w, p)) w.hand.hold(true);
  return look;
}

/** Something on this page could be paid off: their trait, or the place's prop. */
function hasRole(w: Writer, p?: PersonId): boolean {
  return (p !== undefined && !!w.run.traits?.[p]) || !!w.run.props?.[w.run.at];
}

/**
 * A callback: a page closes on a line that pays off a role set up earlier
 * tonight (M13's roles): the trait of the person the page is about, or failing
 * that the prop of the place it's in. One a page, each line once a night, and
 * only while the page still has its joke to tell.
 */
function payOff(w: Writer, p?: PersonId): string | null {
  w.hand.hold(false);
  if (!w.hand.jokeFree) return null;
  const roles: { key: string; pay: string[] }[] = [];
  const t = p !== undefined ? w.run.traits?.[p] : undefined;
  if (t && p !== undefined) roles.push({ key: `pay:${p}`, pay: t.pay });
  const prop = w.run.props?.[w.run.at];
  if (prop) roles.push({ key: `prop:${w.run.at}`, pay: prop.pay });
  for (const r of roles) {
    const fresh = r.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` })).filter((x) => !w.hand.used(x.id));
    if (fresh.length === 0) continue;
    const x = fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string };
    w.hand.note(x.id);
    w.hand.joke();
    w.callback = true;
    return x.l;
  }
  return null;
}

/** The page's close: a callback when there's a role to pay off, or a close card (the joke, if it's still free). */
function closeWith(w: Writer, p: PersonId | undefined, family: string, want: Record<string, string | undefined>, slots: Record<string, string | undefined>): void {
  const pay = payOff(w, p);
  if (pay) {
    put(w, 'close', pay, 'thought');
    return;
  }
  // A name twice at most a page: a close that would say it a third time isn't dealt.
  const named = slots.name;
  const already = named ? Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0) : 0;
  const avoid = w.hand.avoid;
  if (already >= 2) w.hand.avoid = alsoAvoid(avoid, /\{[Nn]ame\}/);
  put(w, 'close', w.hand.draw(family, want, slots, { widen: true, joke: true }), 'thought');
  w.hand.avoid = avoid;
}

/* ------------------------------------------------------------------ *
 * The thread: why here, and what next.
 * ------------------------------------------------------------------ */

/** Why the detective asked this, from the pointer that sent him (the star's own reason). */
function whyHere(w: Writer, q: string, kind: string, slots: Record<string, string | undefined>): Pointer {
  const ptr = threadFor(w.c, w.before, q, w.run.at);
  license(w, ptr);
  // Straight after walking in, the arrival has said why already: say only that this is who (or what) I came for.
  const last = w.before.log[w.before.log.length - 1]?.board;
  // The last page's hand-off named them: the reason is said; just turn to them.
  const subject = q.split(':')[1] ?? '';
  const named = personOf(w.c, subject)?.short;
  if (last?.handoff && named && last.handoff.includes(named)) {
    put(w, 'why', w.hand.draw('why', { kind: 'short' }, withCaps(slots), { plain: true }) ?? `So, ${named}.`, 'narrator');
    return ptr;
  }
  // Said already tonight (the arrival joined it with others): don't say it twice.
  const saidBefore = !!ptr.clause && w.before.log.some((pg) => pg.blocks.some((b) => b.kind === 'prose' && b.text.includes(cap(ptr.clause))));
  if (((last?.job === 'arrive' && w.before.at === w.run.at) || saidBefore) && ptr.src !== 'presence') {
    const again = kind === 'search' || kind === 'papers' ? 'again-search' : 'again';
    put(w, 'why', w.hand.draw('why', { kind: again }, withCaps(slots), { plain: true }) ?? (again === 'again' && slots.name ? `${cap(slots.name)} was the one I’d come for.` : 'That was what I’d come for.'), 'narrator');
    return ptr;
  }
  if (ptr.clause) {
    // The pointer names them already: a frame that names them again says it twice.
    const k = ptr.src === 'presence' ? 'presence' : named && ptr.clause.includes(named) && (kind === 'account' || kind === 'check') ? `${kind}-named` : kind;
    put(w, 'why', w.hand.draw('why', { kind: k }, withCaps({ ...slots, src: ptr.clause }), { plain: true }) ?? `${cap(ptr.clause)}.`, 'narrator');
    // The reason is in the narration now: the ask needn't say it to their face as well.
    return { ...ptr, face: undefined } as Pointer;
  }
  return ptr;
}

/**
 * The hand-off: what this page makes the detective want next. It is the
 * page's first star, said in his voice, so it always agrees with the starred
 * choice. No star (Hard-boiled, after the first two steps), no hand-off.
 */
function handOff(w: Writer, always = false): void {
  const c = w.c;
  // The turn has its own what-next.
  if (w.run.turn === undefined && collisionsOf(c, w.run).length > 0) return;
  const steps = starredSteps(w.d, w.run);
  const q = steps[0];
  if (!q) return;
  void always;
  const [kind, rest] = q.split(':') as [string, string];
  const at = starPlace(c, q);
  // "That made …" says this page pointed there: only when it did.
  const fromHere = sourceOfQ(c, w.run.asked, q) === (w.run.asked[w.run.asked.length - 1] ?? '') && w.run.asked.length > w.before.asked.length;
  const away = at !== w.run.at ? 'yes' : 'no';
  const slots: Record<string, string | undefined> = { place: placeName(c, at) };
  let k = kind;
  if (kind === 'account' || kind === 'list') {
    const p = personOf(c, rest);
    if (!p) return;
    const known = knownPeople(c, w.run).has(rest);
    Object.assign(slots, who(c, rest));
    slots.job = jobWords(p.description);
    if (kind === 'list' && !known) k = 'list-job';
    if (kind === 'account' && threadFor(c, w.run, q, w.run.at).src.startsWith('confront:')) k = 'check';
    for (const x of [rest]) if (known) w.people.add(x);
    if (!known && kind === 'account') return;
  } else if (kind === 'confront') {
    const [p] = rest.split('@') as [string];
    Object.assign(slots, who(c, p));
    k = 'put';
    w.people.add(p);
  } else if (kind === 'search') {
    const f = c.finds.find((x) => x.id === rest);
    slots.what = f?.what;
    k = f?.gives.why ? 'papers' : 'search';
  }
  w.places.add(at);
  const avoid = w.hand.avoid;
  if (!fromHere) w.hand.avoid = alsoAvoid(avoid, /^That\b/);
  // A name twice at most a page (docs/39 §4): a hand-off that would say it a third time is left to the star.
  const named = slots.name;
  if (named) {
    const already = Object.values(w.parts).flat().reduce((n, x) => n + (x?.text.match(new RegExp(`\\b${esc(named)}\\b`, 'g')) ?? []).length, 0);
    if (already >= 2) return;
  }
  const said = w.hand.draw('handoff', { kind: k, away }, withCaps(slots), { plain: true });
  put(w, 'handoff', said, 'thought');
  if (said) w.handoff = said;
  w.hand.avoid = avoid;
}

/** The thought: the engine's, after the job. Recorded for the measure, and licensed for the lint. */
function think(w: Writer, q: string, extra: Thought | null = null): Thought {
  const lastStep = w.c.tier <= 4;
  const t = thoughtOf({ c: w.c, before: w.before, run: w.run, q, here: w.run.at, lastStep, pick: (k, ls) => w.hand.pick(k, ls) });
  if (extra) {
    t.sentences.unshift(...extra.sentences);
    t.refs.push(...extra.refs);
    t.hours.push(...extra.hours);
    t.people.push(...extra.people);
    t.places.push(...extra.places);
  }
  license(w, t);
  if (t.sentences.length) {
    const text = t.sentences.join(' ');
    put(w, 'thought', text, 'thought');
    w.thought = { text: tidy(text), refs: [...new Set(t.refs)] };
  }
  return t;
}

function thoughtOnly(sentences: string[], refs: string[], o: { hours?: Hour[]; people?: PersonId[]; places?: PlaceId[] } = {}): Thought {
  return { sentences, refs, hours: o.hours ?? [], people: o.people ?? [], places: o.places ?? [] };
}

/* ------------------------------------------------------------------ *
 * The office.
 * ------------------------------------------------------------------ */

const CIRCUMSTANCES = ['behind-on-rent', 'flush', 'hungover', 'bruised', 'sleepless', 'just-paid'];

/** A line about somebody, put in the client's own mouth: "asked me what it was worth", "she and I haven’t spoken". */
function inClientMouth(c: BoardCase, text: string): string {
  const cl = clientOf(c);
  const me = cl.short;
  // The dead man, in the client's mouth, is "he" once the office has named him.
  if (isMurder(c)) text = text.replace(new RegExp(`^${victimOf(c).short}\\b`), 'He');
  return text
    .replace(new RegExp(`\\band ${me} haven’t\\b`), 'and I haven’t')
    .replace(new RegExp(`\\basked ${me}\\b`), 'asked me')
    .replace(new RegExp(`\\bthe late Mr\\. ${me}\\b`), cl.female ? 'my late husband' : 'my late father')
    .replace(new RegExp(`\\bday ${me} brought\\b`), 'day I brought')
    .replace(new RegExp(`\\bwasted on its owner\\b`), 'wasted on me')
    .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my');
}

export function writeOffice(w: Writer): void {
  const { c } = w;
  const cl = clientOf(c);
  const cp = pronOf(c, c.client);
  const circ = CIRCUMSTANCES[(c.seed * 7 + c.tier) % CIRCUMSTANCES.length] as string;
  const open = w.hand.draw('office-open', {}, {}, { widen: true });
  const office = w.hand.drawOld('office', (card) => card.tags.circumstance === circ && (card.weather === undefined || card.weather === w.run.weather || card.weather === 'any'), {}, true);
  if (office?.card.exports?.prop) w.run.prop = { short: office.card.exports.prop.short, pay: office.card.exports.prop.pay ?? [] };
  put(w, 'arrival', [open, office?.text].filter(Boolean).join(' '), 'establish');
  const entrance = w.hand.drawOld('entrances', (card) => (card.tags.gender === 'any' || card.tags.gender === (cl.female ? 'f' : 'm')) && card.tags.familiar !== 'yes' && ['working', 'professional', 'any'].includes(String(card.tags.class)) && !/\{detective\}/.test(card.text), { name: cl.short }, true);
  put(w, 'arrival', [w.hand.draw('knock', {}, {}, { widen: true }), entrance?.text].filter(Boolean).join(' '), 'establish');

  const base = { client: cl.short, cHe: cp.he, cHim: cp.him, cHis: cp.his, thing: victimOf(c).short, victim: victimOf(c).short };
  const lines = c.givens.lines ?? c.givens.text.map((t) => ({ kind: 'found' as const, id: 'text', text: t, vars: {} as Record<string, string> }));
  const gone = lines.find((g) => g.kind === 'gone')?.vars;
  const pthem = gone?.pthem ?? 'it';
  let asked = { when: false, who: false };
  let chair = false;
  const aside = lines.some((g) => g.kind === 'aside');
  let pointerTold = false;
  // docs/44: one quoted line a paragraph. Between them, the detective's own questions and the chair.
  for (const g of lines) {
    // The client's own line, in the client's mouth: "nine or ten, I’d say", "he telephoned me".
    const me = cl.short;
    const line = g.kind === 'found' || g.kind === 'relation' ? g.text : g.text
      .replace(new RegExp(`,? ${me} says\\b`), ', I’d say')
      .replace(new RegExp(`\\btelephoned ${me}\\b`), 'telephoned me')
      .replace(new RegExp(`\\b${me}’s\\b`, 'g'), 'my')
      .replace(new RegExp(`\\b${me} is out\\b`), 'I’m out');
    const v: Record<string, string | undefined> = { ...base, ...g.vars, line };
    if (v.where) v.whereFrom = v.where.replace(/^(in|on) /, '');
    if (g.kind === 'pointer' && v.motive) v.motive = inClientMouth(c, v.motive);
    if (g.kind === 'pointer' && v.behaviour) v.behaviour = v.behaviour.replace(new RegExp(`\\b${cl.short}’s\\b`, 'g'), 'my');
    if (v.pthey) v.Pthey = cap(v.pthey);
    if (g.kind === 'means' && v.resident) {
      const res = c.people.find((p) => p.short === v.resident);
      if (res) v.rtheir = pronOf(c, res.id).his;
    }
    // What the office names, the page may name.
    for (const p of c.people) if (g.text.includes(p.short)) w.people.add(p.id);
    if (g.kind === 'aside') {
      // The report asks why: the client's aside gives every reason the pointer didn't, in passing.
      // It runs as talk: two at a time, the second with an "And", and a beat between. The one the
      // client pointed at has had their reason said with the pointer, so they aren't named again.
      const n = Number(v.n ?? 0);
      const pointed = c.givens.pointer ? nameOf(c, c.givens.pointer) : '';
      const said: string[] = [];
      for (let i = 0; i < n; i++) if (!(pointerTold && v[`p${i}`] === pointed)) said.push(`${cap(inClientMouth(c, v[`m${i}`] ?? ''))}.`);
      if (said.length === 0) continue;
      const groups = said.length <= 2 ? [said] : [said.slice(0, 2), said.slice(2)];
      const talk = (g: string[]) => g.map((x, i) => (i === 0 ? x : `And ${x}`)).join(' ');
      const cs = withCaps({ ...base, ...who(c, c.client) });
      groups.forEach((g, gi) => {
        if (gi === 0) {
          put(w, 'job', w.hand.draw('aside', {}, withCaps({ ...cs, said: talk(g) }), { widen: true, plain: true }) ?? `“${talk(g)}”`, 'exchange');
        } else {
          const beat = w.hand.draw('aside-beat', {}, cs, { widen: true, plain: true });
          put(w, 'job', `${beat ?? ''} “${talk(g)}”`, 'exchange');
        }
      });
      continue;
    }
    // The detective's questions, where a speech would want one.
    if (!asked.when && (g.kind === 'clock' || g.kind === 'window')) {
      asked = { ...asked, when: true };
      put(w, 'job', w.hand.draw('office-ask', { before: 'when', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true }), 'exchange');
    }
    if (!asked.who && g.kind === 'pointer') {
      asked = { ...asked, who: true };
      put(w, 'job', w.hand.draw('office-ask', { before: 'who', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...base, pthem }), { plain: true }), 'exchange');
    }
    let kind: string = g.kind;
    if (g.kind === 'clock' && !isMurder(c)) kind = 'small-clock';
    // A pointer said for what they did, not why: their reason follows in the same breath ("And he lost his job on Friday…").
    let pointerAlso = '';
    if (g.kind === 'pointer' && g.id === 'behaviour' && c.givens.pointer && aside) {
      const pp = personOf(c, c.givens.pointer);
      const reason = pp?.motive ? inClientMouth(c, pp.motive) : '';
      if (reason) pointerAlso = ` And ${reason}.`;
    }
    const want = g.kind === 'pointer' || g.kind === 'gone' || g.kind === 'means' || g.kind === 'keeper' ? { kind, id: g.id } : { kind };
    let text = c.givens.lines ? w.hand.draw('setup', want, withCaps(v), { need: true }) : null;
    if (text && pointerAlso && /”$/.test(text)) {
      text = `${text.slice(0, -1)}${pointerAlso}”`;
      pointerTold = true;
    }
    put(w, 'job', text ?? `“${g.text}”`, g.kind === 'found' ? 'narrator' : 'exchange');
    // The chair, once the client has said who they are and what's wrong.
    const sat = /\bchair\b|\bsitting\b|\bsat\b/.test(`${entrance?.text ?? ''} ${(w.parts.job ?? []).map((x) => x.text).join(' ')}`);
    if (!chair && (g.kind === 'gone' || g.kind === 'found') && !sat) {
      chair = true;
      put(w, 'job', w.hand.draw('office-chair', {}, withCaps({ ...base, ...who(c, c.client) }), { widen: true }), 'act');
    }
  }
  for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  for (const f of c.givens.facts) w.hours.add(f.h);
  const retainer = w.hand.draw('retainer', { type: isMurder(c) ? 'murder' : 'small' }, withCaps(base), { need: true });
  put(w, 'job', retainer, 'exchange');
  put(w, 'close', w.hand.draw('office-close', {}, {}, { widen: true }), 'exchange');
  w.beats.push('why');
  lay(w, 'office');
}

/* ------------------------------------------------------------------ *
 * The walk.
 * ------------------------------------------------------------------ */

/** The hours of the night, for cards that only fit some of them: "midnight-2", "2-4", "4-6", "6-8". */
function band(w: Writer): string {
  const m = minutesAfter(w.run.used, budgetCalls(w.d));
  return m < 120 ? 'midnight-2' : m < 240 ? '2-4' : m < 360 ? '4-6' : '6-8';
}

/** The street between: the distance, and a line of the night outside. The first walk sets the street's role up; a later one may pay it off. */
function writeWalk(w: Writer, from: PlaceId, to: PlaceId): void {
  const c = w.c;
  const wk = walkBetween(c, from, to);
  const dest = to === OFFICE ? 'the office' : placeName(c, to);
  const fromName = from === OFFICE ? 'the office' : placeName(c, from);
  // Where it matters: from the scene to where the way in was had, the night turns on who could walk it in an hour.
  const matters = (from === c.crime.scene && to === c.means.origin) || (to === c.crime.scene && from === c.means.origin);
  const way = wk.dir === 'round the corner' ? `round the corner from ${fromName}` : /town/.test(wk.dir) ? `${wk.dir} from ${fromName}` : `${wk.dir} of ${fromName}`;
  const slots = withCaps({ dest, from: fromName, said: wk.said, way, street: wk.street, place: dest });
  let frame = w.hand.draw('walk-frame', { matters: matters ? 'yes' : 'no' }, slots, { plain: true }) ?? `It was ${wk.said} to ${dest}, ${way}.`;
  // "The Delmonico rooms were", not "was".
  if (/\brooms$/i.test(dest)) frame = frame.replace(new RegExp(`(${esc(cap(dest))}|${esc(dest)}) was\\b`), '$1 were');
  // A later walk may pay the street's role off; the first sets it up.
  let line: string | null = null;
  const role = w.run.street;
  if (role && w.hand.jokeFree && w.hand.rng.int(10) < 6) {
    const fresh = role.pay.map((l) => ({ l, id: `pay:${l.slice(0, 40)}` })).filter((x) => !w.hand.used(x.id));
    const x = fresh.length ? (fresh[w.hand.rng.int(fresh.length)] as { l: string; id: string }) : undefined;
    if (x) {
      w.hand.note(x.id);
      w.hand.joke();
      w.callback = true;
      line = x.l;
    }
  }
  if (!line) {
    const drawn = w.hand.drawCard('walk', { weather: w.run.weather, band: band(w) }, slots, {});
    line = drawn?.text ?? null;
    const ex = drawn?.card.exports?.street;
    if (!role && ex?.pay?.length) w.run.street = { short: ex.short, pay: ex.pay };
  }
  put(w, 'walk', [frame, line].filter(Boolean).join(' '), 'establish');
  w.places.add(to);
  if (from !== OFFICE) w.places.add(from);
}

/* ------------------------------------------------------------------ *
 * Arriving.
 * ------------------------------------------------------------------ */

export function writeArrive(w: Writer, place: PlaceId): void {
  const { c } = w;
  const first = !w.before.visited.includes(place);
  const pl = placeOf(c, place);
  if (!pl) return;
  stageGuard(w, place);
  const kind = placeKind(c, place);
  // A later visit: somebody here already has a trait, and the page's last word pays it off.
  const again = first ? undefined : peopleAt(c, w.run, place).find((x) => w.run.traits?.[x]);
  const callback = (!first && (again !== undefined || !!w.run.props?.[place])) || (!!w.run.street && w.hand.rng.int(10) < 3);
  if (callback) w.hand.hold(true);
  writeWalk(w, w.before.at, place);
  // `{name}` is the whole name ("the Odessa, a café where the actors eat after the show"); as the
  // subject of a sentence it takes the closing comma its aside needs (`{nameSubj}`).
  const slots = withCaps({ name: pl.name, nameSubj: pl.name.includes(',') ? `${pl.name},` : pl.name, place: pl.short, street: pl.street });
  if (first) {
    const arrive = w.hand.draw('arrive', { kind, key: pl.key }, slots, { need: true }) ?? `I went to ${pl.name}.`;
    // M13's prop: something in the room a later page here can call back to.
    const prop = w.hand.drawCard('prop', { kind }, slots);
    const ex = prop?.card.exports?.prop;
    if (prop && ex?.pay?.length) w.run.props = { ...(w.run.props ?? {}), [place]: { short: ex.short, pay: ex.pay } };
    // The arrival has just named the place: the prop needn't say "at the Thalia" again (docs/25, 4b open).
    const propText = prop?.text && arrive.includes(pl.short) ? prop.text.replace(` at ${pl.short}`, '') : prop?.text;
    put(w, 'arrival', [arrive, propText].filter(Boolean).join(' '), 'establish');
  } else {
    put(w, 'arrival', w.hand.draw('return', {}, slots, { widen: true }) ?? `Back at ${pl.short}.`, 'establish');
  }
  const vict = victimOf(c);
  if (pl.scene && first) {
    if (isMurder(c)) put(w, 'arrival', w.hand.draw('scene-body', { means: c.means.kind }, withCaps({ victim: vict.short }), { need: true, widen: true }), 'establish');
    else put(w, 'arrival', w.hand.draw('scene-empty', { kind: c.type === 'lost-pet' ? 'pet' : 'item' }, withCaps({ client: clientOf(c).short, thing: vict.short }), { need: true, widen: true }), 'establish');
  }
  // Who's here, and what they're doing.
  const here = peopleAt(c, w.run, place);
  const sentences: string[] = [];
  let watcherLine: string | null = null;
  let looked = false;
  for (const p of here) {
    const person = personOf(c, p);
    if (!person) continue;
    w.people.add(p);
    const s = withCaps(who(c, p));
    if (person.role === 'client') {
      // At a lost thing's flat the client is already in the room's own line.
      if (pl.scene && !isMurder(c) && first) continue;
      sentences.push(w.hand.draw('client-here', {}, s, { widen: true, plain: true }) ?? `${person.short} was there.`);
      continue;
    }
    if (person.role === 'watcher') {
      const job = jobKey(person.description);
      sentences.push(w.hand.draw('doing', { job }, s, { plain: true }) ?? `${person.short} was there, ${person.description}.`);
      const met = w.before.visited.includes(place);
      if (!met) {
        const look = !looked ? lookAt(w, p) : null;
        if (look) {
          looked = true;
          sentences[sentences.length - 1] += ` ${look}`;
        }
        watcherLine = w.hand.draw('watcher', { job }, s) ?? oldWatch(w, job, person.short);
      }
      continue;
    }
    const k = kind === 'unwatched' ? 'back' : kind === 'rooming' || kind === 'flat' || kind === 'rooms' ? 'home' : kind === 'shift' ? 'work' : kind;
    // Hard-boiled's face: everybody's look is plain on first sight, so a face on a list can be matched.
    if (c.variant === 'face' && person.role === 'suspect' && person.look) {
      s.name = `${person.short}, ${person.look},`;
      s.Name = s.name;
    }
    const doing = w.hand.draw('doing', { kind: k }, s, { plain: true }) ?? `${person.short} was there.`;
    // One first look a page, at the first suspect met here: more is a parade.
    const look = first && person.role === 'suspect' && !looked ? lookAt(w, p) : null;
    if (look) looked = true;
    sentences.push(look ? `${doing} ${look}` : doing);
  }
  if (sentences.length > 0) put(w, 'arrival', sentences.join(' '), 'presence');
  else if (!pl.scene) put(w, 'arrival', `There was nobody there to ask.`, 'presence');
  // Why here: the pointers to what waits in this room, from what's held, the starred one first.
  const lastHand = w.before.log[w.before.log.length - 1]?.board?.handoff;
  const handed = !!lastHand && lastHand.includes(pl.short);
  const ptrs = (pl.scene && first) || handed ? [] : placeThread(c, w.before, place, starredSteps(w.d, w.before), place);
  const sameSubject = (clause: string, before: string) => sameSubjectIn(c, clause, before);
  if (handed) put(w, 'why', w.hand.draw('why', { kind: 'short-place' }, withCaps({ place: pl.short }), { plain: true }) ?? `So, ${pl.short}.`, 'narrator');
  for (const p of ptrs) license(w, p);
  if (ptrs.length > 0) {
    // Two lines from one list run together: "Mrs. Tramonti’s list had Lathrop there at nine, and Mulcahy at eight and nine."
    const [p0, p1] = ptrs as [Pointer, Pointer | undefined];
    const head = /^(.+?’s list had )/.exec(p0.clause)?.[1];
    const said = /^(.+? had said )/.exec(p0.clause)?.[1];
    const src = p1 && head && p1.src === p0.src && p1.clause.startsWith(head)
      ? `${p0.clause}, and ${p1.clause.slice(head.length).replace(/ at the [^,]+? at /, ' at ').replace(new RegExp(` at ${esc(pl.short)} at `), ' at ')}`
      : p1 && said && p1.src === p0.src && p1.clause.startsWith(said)
        ? `${p0.clause}, and that ${p1.clause.slice(said.length)}`
        : ptrs.map((p, i) => (i === 0 ? p.clause : cap(sameSubject(p.clause, p0.clause)))).join('. ');
    put(w, 'why', w.hand.draw('why', { kind: 'arrive' }, withCaps({ src, place: pl.short }), { plain: true }) ?? `${cap(src)}.`, 'narrator');
  } else if (pl.scene && !first) {
    put(w, 'why', w.hand.draw('why', { kind: 'scene', type: isMurder(c) ? 'murder' : 'small' }, withCaps({ victim: vict.short, thing: vict.short, client: clientOf(c).short, place: 'here' }), { plain: true }), 'narrator');
  }
  // What the detective thinks on the way in: what a watcher is good for, or the scene against the office's clock.
  if (watcherLine) put(w, 'thought', watcherLine, 'thought');
  else if (first && !c.lists.some((l) => l.place === place)) {
    const none = w.hand.drawOld('watch', (card) => card.tags.watcher === 'none', {}, true);
    put(w, 'thought', none?.text, 'thought');
  }
  if (pl.scene && first) {
    const hs = (c.givens.window ?? c.crime.window).map(hourWord);
    const mode = c.setup?.means ?? '';
    const venue = c.givens.lines?.find((g) => g.kind === 'means')?.vars.venue;
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    const t = isMurder(c)
      ? `If it happened at ${andList(hs).replace(' and ', ' or ')}, it happened in this room, and whoever did it had walked in here with ${c.means.name.replace(/^(a|an) /, 'the ')} already in hand.`
      : /^told/.test(mode) && venue
        ? `If it went at ${andList(hs).replace(' and ', ' or ')}, the flat had been empty, and anybody who’d heard ${clientOf(c).short} at ${venue} had known the way in. That was a room, more or less. It was a big room.`
        : party
          ? `If it went at ${andList(hs).replace(' and ', ' or ')}, it went after the ${party.occasion}, and everybody at the ${party.occasion} had known the way in.`
          : `If it went at ${andList(hs).replace(' and ', ' or ')}, whoever took it had a key, and the spare key hangs at ${placeName(c, c.means.origin)}.`;
    put(w, 'thought', t, 'thought');
    for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
    w.places.add(c.means.origin);
  }
  if (callback) put(w, 'close', payOff(w, again), 'thought');
  if (!(w.parts.close ?? []).length) put(w, 'close', w.hand.draw('arrive-close', { kind: pl.scene && first ? 'scene' : stageKind(c, place) }, withCaps({ place: pl.short }), { joke: true }), 'thought');
  w.places.add(place);
  lay(w, 'arrival');
  w.hand.avoid = null;
}

/** A second pointer that opens on somebody the first just named opens on "he" or "she" instead. */
function sameSubjectIn(c: BoardCase, clause: string, before: string): string {
  for (const p of c.people) {
    if (p.object || !clause.startsWith(`${p.short} `) || !before.includes(p.short)) continue;
    const others = c.people.filter((x) => x !== p && !x.object && x.female === p.female && before.includes(x.short));
    if (others.length) return clause;
    return `${pronOf(c, p.id).he}${clause.slice(p.short.length)}`;
  }
  return clause;
}

function oldWatch(w: Writer, job: string, name: string): string | null {
  const role = WATCH_ROLE[job];
  if (!role) return null;
  return w.hand.drawOld('watch', (card) => card.tags.watcher === role, { watcher: name })?.text ?? null;
}

/** Back to the office: the walk, the room, and why (there's nothing to ask there). */
export function writeReturn(w: Writer): void {
  writeWalk(w, w.before.at, OFFICE);
  put(w, 'arrival', 'I went back up to the office. It had kept my chair warm for nobody.', 'establish');
  put(w, 'why', w.hand.draw('why', { kind: 'return' }, {}, { plain: true }), 'narrator');
  lay(w, 'return');
}

/* ------------------------------------------------------------------ *
 * "Where were you tonight?"
 * ------------------------------------------------------------------ */

const MANNERS: Manner[] = ['plain', 'plain', 'terse', 'careful'];

export function mannerOf(c: BoardCase, p: PersonId): Manner {
  let h = 0;
  for (const ch of `${c.id}|${p}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MANNERS[h % MANNERS.length] as Manner;
}

/**
 * Staging, the ask and the reaction, the same for everybody of a manner in a
 * place of a kind: the reaction never knows whether they're about to lie.
 */
function stageAndAsk(w: Writer, p: PersonId, job: 'account' | 'check' | 'list' | 'motive', ptr: Pointer | null, extra: Record<string, string | undefined> = {}): void {
  const c = w.c;
  const s = withCaps({ ...who(c, p), ...extra });
  const manner = personOf(c, p)?.role === 'watcher' ? 'watcher' : mannerOf(c, p);
  const look = setUp(w, p);
  // Somebody met on an earlier page has moved, or hasn't: where they are now, before I sit down.
  const seenBefore = personOf(c, p)?.role !== 'watcher' && w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive') && !(w.before.log[w.before.log.length - 1]?.board?.job === 'arrive' && w.before.at === w.run.at);
  // The why has named them already: where they are now would be the second name before a word is asked.
  const namedInWhy = (w.parts.why ?? []).some((x) => x.text.includes(nameOf(c, p)));
  if (seenBefore && !namedInWhy) put(w, 'staging', w.hand.draw('still', { kind: stageKind(c, w.run.at) }, s), 'act');
  // A watcher is staged by the job: a club's doorkeeper isn't behind a bar.
  const watcher = personOf(c, p)?.role === 'watcher';
  const sk = stageKind(c, w.run.at);
  const kind = watcher && sk === 'bar' && jobKey(personOf(c, p)?.description ?? '') !== 'bartender' ? 'any' : sk;
  // Met on the way in: they've already opened the door to me.
  const metHere = w.before.log.some((pg) => pg.at === w.run.at && pg.board?.job === 'arrive');
  const avoidStage = w.hand.avoid;
  if (metHere) w.hand.avoid = alsoAvoid(avoidStage, /\bdoor\b/);
  put(w, 'staging', w.hand.draw('staging', { kind, who: watcher ? 'watcher' : 'person', manner }, s), 'act');
  w.hand.avoid = avoidStage;
  putOn(w, 'staging', look, 'act');
  const face = ptr?.face && job === 'account' ? ptr.face : undefined;
  // "Mr. Ashby." to his face is a name too: not when the why has said it.
  const avoid = w.hand.avoid;
  if (namedInWhy) w.hand.avoid = alsoAvoid(avoid, /\{Title\}/);
  put(w, 'ask', w.hand.draw('ask', { job, face: face ? 'yes' : 'no' }, withCaps({ ...s, reason: face })), 'exchange');
  w.hand.avoid = avoid;
  put(w, 'reaction', w.hand.draw('reaction', { job: job === 'check' ? 'account' : job, manner }, s), 'act');
}

export function writeAccount(w: Writer, p: PersonId): void {
  const { c } = w;
  const a = accountOf(c, p);
  if (!a) return;
  stageGuard(w, w.run.at);
  const q = `account:${p}`;
  const s = withCaps(who(c, p));
  const check = (sourceOfQ(c, w.before.asked, q) ?? '').startsWith('confront:');
  const ptr = whyHere(w, q, check ? 'check' : 'account', s);
  stageAndAsk(w, p, check ? 'check' : 'account', ptr);
  const said = spokenAccount(c, a, mannerOf(c, p), c.seed % 4);
  put(w, 'job', `“${said.join(' ')}”`, 'answer');
  for (const h of c.board.hours) {
    w.told.add(`claim:${p}@${h}`);
    w.hours.add(h);
    for (const x of a.claims[h]?.company ?? []) w.people.add(x);
    w.places.add(a.claims[h]?.place ?? '');
  }
  a.remarks.forEach((r, i) => {
    w.told.add(`remark:account:${p}#${i}`);
    for (const f of r.facts) {
      w.hours.add(f.h);
      w.people.add(f.p);
    }
  });
  think(w, q);
  handOff(w, check);
  closeWith(w, p, 'account-close', {}, s);
  lay(w, check ? 'check' : 'account');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * "Who was here tonight?"
 * ------------------------------------------------------------------ */

export function writeList(w: Writer, watcher: PersonId): void {
  const { c } = w;
  const l = listOf(c, watcher);
  if (!l) return;
  stageGuard(w, w.run.at);
  const q = `list:${watcher}`;
  const s = withCaps({ ...who(c, watcher), job: jobWords(personOf(c, watcher)?.description ?? '') });
  whyHere(w, q, 'list', s);
  stageAndAsk(w, watcher, 'list', null, { job: s.job });
  const said = spokenList(c, l, c.seed % 4);
  put(w, 'job', `“${said.join(' ')}”`, 'answer');
  // The handover: what was under the coat is the question anybody would ask, and the answer says no more than the watcher saw.
  if (l.remarks.some((r) => r.gives?.whereNow)) {
    const what = c.type === 'lost-pet' ? 'pet' : 'item';
    put(w, 'job', w.hand.draw('coat-q', {}, {}, { widen: true, plain: true }), 'exchange');
    put(w, 'job', w.hand.draw('coat-a', { what }, withCaps({ ...s }), { plain: true }), 'answer');
  }
  for (const h of c.board.hours) {
    if (!l.entries[h]) continue;
    w.told.add(`list:${watcher}@${h}`);
    w.hours.add(h);
    for (const e of l.entries[h] ?? []) if ('person' in e) w.people.add(e.person);
  }
  l.remarks.forEach((r, i) => {
    w.told.add(`remark:list:${watcher}#${i}`);
    for (const f of r.facts) w.hours.add(f.h);
    for (const p of r.mentions?.people ?? []) w.people.add(p);
    for (const p of r.mentions?.places ?? []) w.places.add(p);
  });
  // A remark may name hours of its own ("I came on at ten", "the chloral … at seven").
  for (const h of c.board.hours) if (l.remarks.some((r) => r.text.includes(hourWord(h)))) w.hours.add(h);
  w.places.add(l.place);
  // A second story told earlier, and this list is where it said: they aren't on it.
  const extra: string[] = [];
  const refs: string[] = [];
  for (const putx of w.run.puts.filter((x) => x.landed && !x.again)) {
    const k = confrontationOf(c, putx.person, putx.hour);
    if (k?.secondLie?.place !== l.place) continue;
    const es = l.entries[putx.hour] ?? [];
    if (es.some((e) => 'person' in e && e.person === putx.person)) continue;
    extra.push(`${nameOf(c, putx.person)}’s second story had ${pronOf(c, putx.person).him} ${l.place === w.run.at ? 'here' : `at ${placeName(c, l.place)}`} at ${oclock(putx.hour)}. ${nameOf(c, l.watcher)} didn’t have ${pronOf(c, putx.person).him}.`);
    refs.push(`second:${putx.person}@${putx.hour}`);
    w.hours.add(putx.hour);
    w.people.add(putx.person);
  }
  think(w, q, extra.length ? thoughtOnly(extra, refs) : null);
  handOff(w);
  closeWith(w, watcher, 'list-close', {}, s);
  lay(w, 'list');
  w.hand.avoid = null;
}

/* ------------------------------------------------------------------ *
 * A search.
 * ------------------------------------------------------------------ */

function pastTense(s: string): string {
  return s.replace(/\bis\b/g, 'was').replace(/There’s/g, 'There was').replace(/\bhangs\b/g, 'hung');
}

export function writeSearch(w: Writer, findId: string): void {
  const { c } = w;
  const f = c.finds.find((x) => x.id === findId);
  if (!f) return;
  const vict = victimOf(c);
  const q = `search:${findId}`;
  const what = f.gives.why ? 'papers' : /table/.test(f.what) ? 'table' : /floor/.test(f.what) ? 'floor' : 'parlour';
  if (hasRole(w)) w.hand.hold(true);
  whyHere(w, q, f.gives.why ? 'papers' : 'search', withCaps({ client: clientOf(c).short, victim: vict.short, thing: vict.short }));
  put(w, 'staging', w.hand.draw('search-act', { what }, withCaps({ client: clientOf(c).short, victim: vict.short }), { widen: true }), 'act');
  // The client is at the scene, and watches: the page's reaction beat.
  if (!f.gives.why) put(w, 'reaction', w.hand.draw('search-watch', { type: isMurder(c) ? 'murder' : 'small' }, withCaps({ ...who(c, c.client), client: clientOf(c).short, thing: vict.short })), 'act');
  w.told.add(`find:${findId}`);
  if (f.gives.why) {
    const top = personOf(c, c.crime.culprit);
    put(w, 'job', w.hand.draw('find-papers', {}, withCaps({ top: top?.short, motive: top?.motive }), { widen: true, need: true }) ?? f.text, 'find');
    w.people.add(c.crime.culprit);
    w.people.add(c.crime.victim);
    const known = knownPeople(c, w.before).has(c.crime.culprit);
    const pr = pronOf(c, c.crime.culprit);
    const tie = known
      ? `${top?.short} I had already, from ${sourceOfName(w, c.crime.culprit)}. Now I had ${pr.his} reason too, in ${vict.short}’s own hand.`
      : `${top?.short} was a name I hadn’t heard tonight, but it had been in a box at ${placeName(c, f.place)} all along.`;
    think(
      w,
      q,
      thoughtOnly([w.hand.pick('papers-thought', [`A reason isn’t a hand on the ${c.means.name.replace(/^(a|an) /, '')}. But it was a reason, and it was on top.`, 'Everybody in that box had a reason. Only one of them was on top.', 'I put the page in my pocket. A reason is half of what the report asks, and the easy half.']), tie], ['givens:found'], { people: [c.crime.culprit, c.crime.victim] }),
    );
    handOff(w);
    closeWith(w, undefined, 'search-close', {}, {});
    lay(w, 'search');
    return;
  }
  const origin = placeName(c, c.means.origin);
  const empty = isMurder(c) ? '' : pastTense(thingEmpty(c));
  const text = w.hand.draw('find', { means: c.setup?.means }, withCaps({ x: origin, victim: vict.short, empty, thing: vict.short }), { need: true });
  put(w, 'job', text ?? f.text, 'find');
  w.places.add(c.means.origin);
  // What it means: where it came from, and that whoever used it had been there first.
  const hs = c.means.available;
  const win = (c.givens.window ?? c.crime.window).map(hourWord);
  let lead: string;
  let refs: string[];
  if (isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    lead =
      c.means.kind === 'gun'
        ? `So the gun came from ${origin}. ${vict.short} died at ${andList(win).replace(' and ', ' or ')}, and whoever fired it had been at ${origin} before that, to take it.`
        : c.means.kind === 'blade'
          ? `So the knife came from ${origin}. ${vict.short} died at ${andList(win).replace(' and ', ' or ')}, and whoever used it had been at ${origin} before that, to take it.`
          : `So the ${m} came from ${origin}, and ${m} takes ${c.means.delay[1] >= 60 ? 'twenty minutes to an hour' : 'a few minutes'} to do its work. Whoever brought it to ${vict.short} had been at ${origin} earlier, to get it.`;
    refs = ['givens:clock', 'givens:found'];
    for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  } else {
    const mode = c.setup?.means ?? '';
    const vars = c.givens.lines?.find((g) => g.kind === 'means')?.vars ?? {};
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    if (party) {
      lead = `So whoever it was knew the way in, and the people who knew were the ones at the ${party.occasion} at ${party.h0}. ${clientOf(c).short} had given me their names.`;
      w.hours.add(hs[0] as Hour);
    } else if (/^told/.test(mode)) {
      lead = `So it was somebody who’d heard ${clientOf(c).short} at ${vars.venue ?? placeName(c, c.means.origin)} between ${vars.h0} and ${vars.h2}, and had come here after. That made ${vars.venue ?? placeName(c, c.means.origin)} the place to start counting.`;
      for (const h of hs) w.hours.add(h);
      w.hours.add(Math.max(...hs) + 1);
    } else {
      lead = `So whoever it was had the spare key, and that meant somebody who’d been in at ${origin} earlier in the evening.`;
    }
    refs = ['givens:means'];
  }
  think(w, q, thoughtOnly([lead], refs, { places: [c.means.origin] }));
  handOff(w);
  closeWith(w, undefined, 'search-close', {}, {});
  lay(w, 'search');
}

/** Whose word first named somebody: "Coffin’s list", "the office". */
function sourceOfName(w: Writer, p: PersonId): string {
  const c = w.c;
  for (const q of w.before.asked) {
    const [k, rest] = q.split(':') as [string, string];
    if (k === 'list' && Object.values(listOf(c, rest)?.entries ?? {}).some((es) => es.some((e) => 'person' in e && e.person === p))) {
      w.people.add(rest);
      return sourceName(c, q);
    }
    if (k === 'account' && (rest === p || Object.values(accountOf(c, rest)?.claims ?? {}).some((cl) => cl.company.includes(p)))) {
      w.people.add(rest);
      return rest === p ? `${nameOf(c, p)}’s own evening` : `${nameOf(c, rest)}’s evening`;
    }
  }
  return 'the office';
}

function thingEmpty(c: BoardCase): string {
  const line = c.finds.find((f) => f.gives.means)?.text ?? '';
  // The find's first sentence is the empty basket or dome.
  return line.split(/(?<=\.)\s/)[0] ?? '';
}

/* ------------------------------------------------------------------ *
 * The victim, or the thing: a suspect's reason, in their own words.
 * ------------------------------------------------------------------ */

export function writeMotive(w: Writer, p: PersonId): void {
  const { c } = w;
  const person = personOf(c, p);
  if (!person) return;
  const vict = victimOf(c);
  const cl = clientOf(c);
  const vars = c.givens.lines?.find((g) => g.kind === 'gone')?.vars ?? {};
  const s = withCaps({ ...who(c, p), victim: vict.short, thing: vict.short, client: cl.short, breed: vars.breed, pthem: vars.pthem ?? 'it' });
  const q = `motive:${p}`;
  const ptr = threadFor(c, w.before, `account:${p}`, w.run.at);
  license(w, ptr);
  put(w, 'why', w.hand.draw('why', { kind: 'motive' }, withCaps({ ...s, src: ptr.clause || `${person.short} was in the room` }), { plain: true }), 'narrator');
  const look = setUp(w, p);
  put(w, 'staging', w.hand.draw('staging', { kind: stageKind(c, w.run.at), who: 'person', manner: mannerOf(c, p) }, s), 'act');
  putOn(w, 'staging', look, 'act');
  put(w, 'ask', w.hand.draw('motive-ask', {}, s, { widen: true }), 'act');
  put(w, 'reaction', w.hand.draw('reaction', { job: 'motive', manner: mannerOf(c, p) }, s), 'act');
  put(w, 'job', w.hand.draw('motive', { id: person.motiveId }, s, { need: true }) ?? `“${cap(person.motive ?? 'Nothing')}.”`, 'answer');
  // The thought: the reason against what the office said, and against the hours that matter.
  const aside = c.givens.lines?.find((g) => g.kind === 'aside');
  const inAside = !!aside && Object.entries(aside.vars).some(([k, v]) => /^p\d+$/.test(k) && v === person.short);
  const pointerSaid = c.givens.pointer === p && /motive|gossip/.test(c.setup?.pointer ?? '');
  const sentences: string[] = [`That was ${person.short}’s reason, in ${pronOf(c, p).his} own words.`];
  const refs: string[] = [];
  if (inAside || pointerSaid) {
    sentences.push(`It was what ${cl.short} had said in the office, near enough. A reason isn’t an hour, though, and the report wants both.`);
    refs.push(pointerSaid ? 'givens:pointer' : 'givens:aside');
  } else {
    sentences.push(`${cl.short} hadn’t mentioned it. A reason isn’t an hour, though, and the report wants both.`);
    refs.push('givens:pointer');
  }
  w.people.add(c.client);
  if (w.run.asked.includes(`account:${p}`)) {
    const hc = crimeHourKnown(c, w.run);
    const hs = hc !== null ? [hc] : (c.givens.window ?? c.crime.window);
    sentences.push(`For ${andList(hs.map(hourWord))}, ${pronOf(c, p).he} had told me ${andList(hs.map((h) => claimSaid(c, p, h)))}.`);
    refs.push(...hs.map((h) => `claim:${p}@${h}`));
    for (const h of hs) w.hours.add(h);
    for (const h of hs) w.places.add(accountOf(c, p)?.claims[h]?.place ?? '');
  }
  think(w, q, thoughtOnly(sentences, refs));
  closeWith(w, p, 'motive-close', {}, s);
  w.people.add(c.crime.victim);
  lay(w, 'motive');
}

/* ------------------------------------------------------------------ *
 * Put it to them.
 * ------------------------------------------------------------------ */

export function writeConfront(w: Writer, p: PersonId, h: Hour, line: Line, j: Judgement, again: boolean): void {
  const { c } = w;
  if (hasRole(w, p)) w.hand.hold(true);
  const s = withCaps({ ...who(c, p) });
  const claimLine = again ? `${placeName(c, confrontationOf(c, p, h)?.secondLie?.place ?? '')} at ${hourWord(h)}` : claimSaid(c, p, h);
  // Why: their line and what's held against it.
  const src = line.q === 'givens' ? 'the office' : sourceName(c, line.q).replace(/’s story$/, '’s own evening');
  put(w, 'why', w.hand.draw('why', { kind: 'put' }, withCaps({ ...s, src: `${nameOf(c, p)} had told me ${claimLine}, and ${src} said otherwise`, claim: claimLine }), { plain: true }), 'narrator');
  put(w, 'staging', w.hand.draw('put-stage', {}, s), 'act');
  // Said to their face: "Tillman passed you on Avenue B", not "passed Hargrove".
  const toYou = (t: string) => t.replace(new RegExp(`\\b(passed|had|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '$1 you');
  // Two people who give each other for company are said once: "Rosenbaum and Broadnax had each other at the Blue Lantern at ten o’clock."
  const other = (j.with ?? [])[0];
  const mutual =
    (j.with ?? []).length === 1 && other && line.kind === 'claim' && other.kind === 'claim' && line.place === other.place && line.hour === other.hour && line.about.includes(other.speaker as string) && other.about.includes(line.speaker as string);
  const breaker = mutual
    ? `${nameOf(c, line.speaker as string)} and ${nameOf(c, other.speaker as string)} had each other at ${placeName(c, line.place as string)} at ${oclock(line.hour as Hour)}.`
    : toYou(`${cap(breakSaid(c, line, p, w.run.asked))}.${(j.with ?? []).length > 0 ? ` ${cap(andList((j.with ?? []).map((x) => breakSaid(c, x, p, w.run.asked))))}.` : ''}`);
  put(w, 'ask', w.hand.draw('put', {}, withCaps({ ...s, claim: claimLine, breaker }), { widen: true, plain: true }) ?? `“You told me ${claimLine},” I said. “${breaker}”`, 'exchange');
  w.hours.add(h);
  w.people.add(p);
  // A face the breaker names ("the only one in a fur collar was Steinbach") came from a held evening.
  for (const x of c.people) if (!x.object && breaker.includes(x.short)) w.people.add(x.id);
  for (const x of [line, ...(j.with ?? [])]) {
    for (const y of x.about) w.people.add(y);
    if (x.speaker) w.people.add(x.speaker);
    if (x.place) w.places.add(x.place);
    w.told.add(x.id);
  }
  const lineRef = [line.id];
  const done = (family: string, thought: string[], refs: string[]) => {
    think(w, `confront:${p}@${h}`, thoughtOnly(thought, refs));
    handOff(w);
    closeWith(w, p, family, {}, s);
    lay(w, 'put');
  };
  if (!j.landed) {
    put(w, 'reaction', `${w.hand.draw('react', { response: 'held' }, s, { widen: true }) ?? `${nameOf(c, p)} heard me out.`} “That doesn’t touch anything I told you.”`, 'exchange');
    done('held-close', [j.why ?? ''].filter(Boolean), lineRef);
    return;
  }
  const k = confrontationOf(c, p, h);
  if (!k) return;
  const lie = c.lies.find((l) => l.person === p && l.hour === h);
  const pr = pronOf(c, p);
  if (again) {
    // A second story put back: the culprit holds to it, as a refusal.
    put(w, 'reaction', `${w.hand.draw('react', { response: 'refuse' }, s, { widen: true }) ?? ''} ${w.hand.draw('refuse-words', { who: 'culprit' }, s, { widen: true }) ?? '“I’ve told you where I was.”'}`, 'exchange');
    done('refuse-close', [`${nameOf(c, p)}’s second story had a list against it now, and ${pr.he} had nothing to put in its place. Silence isn’t a confession. It isn’t an evening either.`], lineRef);
    return;
  }
  if (k.response === 'admit' && lie) {
    const y = (k.names ?? [])[0];
    const ys = y ? withCaps({ witness: nameOf(c, y), wthem: pronOf(c, y).him }) : {};
    const words = w.hand.draw('admit-words', { place: placeOf(c, lie.truth)?.key }, withCaps({ ...s, ...ys, claim: placeName(c, lie.claim), truth: placeName(c, lie.truth) }), { need: true });
    put(w, 'reaction', `${w.hand.draw('react', { response: 'admit' }, s, { widen: true }) ?? ''} ${words ?? ''}`, 'exchange');
    if (y) w.people.add(y);
    w.places.add(lie.truth);
    w.places.add(lie.claim);
    const claimWhere = personOf(c, p)?.home === lie.claim ? 'home' : placeName(c, lie.claim);
    done(
      'admit-close',
      y
        ? [`That was a hole, and ${pr.he} knew it, and I wasn’t sure yet it was the one I wanted. An owned-up story is only as good as whoever’s in it with you. If it held, ${pr.he} had been at ${placeName(c, lie.truth)} at ${hourWord(h)}, not ${claimWhere === 'home' ? 'home' : `at ${claimWhere}`}.`]
        : [`${nameOf(c, p)} owned up to ${placeName(c, lie.truth)} at ${hourWord(h)}. Nobody had said so but ${pr.him}.`],
      lineRef,
    );
    return;
  }
  if (k.response === 'second-lie' && k.secondLie?.place) {
    const alt = placeName(c, k.secondLie.place);
    put(w, 'reaction', `${w.hand.draw('react', { response: 'second-lie' }, s, { widen: true }) ?? ''} “All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${alt}.”`, 'exchange');
    w.places.add(k.secondLie.place);
    const watcher = c.lists.find((l) => l.place === k.secondLie?.place)?.watcher;
    const met = watcher ? knownPeople(c, w.run).has(watcher) : false;
    done('second-close', [`A second story, and ${alt} at ${hourWord(h)} was a place with somebody paid to watch it. ${met && watcher ? `${nameOf(c, watcher)} would know.` : `Whoever kept the room at ${alt} would know.`}`], lineRef);
    if (met && watcher) w.people.add(watcher);
    return;
  }
  if (k.response === 'crack') {
    const holder = c.crime.whereNow?.text.replace(/, at .*$/, '').replace(/^with /, '') ?? 'somebody';
    const first = k.secondLie?.place ? `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${placeName(c, k.secondLie.place)}.” It was thin, and ${pr.he} knew it. ` : '';
    put(w, 'reaction', `${w.hand.draw('react', { response: 'crack' }, s, { widen: true }) ?? ''} ${first}“All right. I took it. It’s with ${holder}. ${crackWhy(c, p)}”`, 'exchange');
    if (k.secondLie?.place) w.places.add(k.secondLie.place);
    w.places.add(c.crime.whereNow?.place ?? '');
    done('crack-close', [`So ${victimOf(c).short} was with ${shortOther(holder).replace(/,.*$/, '')}, at ${placeName(c, c.crime.whereNow?.place ?? '')}. That was the where ${clientOf(c).short} had paid for.`], ['givens:gone']);
    w.people.add(c.client);
    return;
  }
  // A refusal: the same words and the same weight, guilty or not.
  // The pair's liar says whose flat it was, as the story had it; everybody else draws from one pool.
  const pairMate = lie?.kind === 'pair' ? accountOf(c, p)?.claims[h]?.company[0] : undefined;
  const partner = pairMate ? nameOf(c, pairMate) : undefined;
  const words = w.hand.draw('refuse-words', { who: partner ? 'pair' : 'any' }, withCaps({ ...s, crime: isMurder(c) ? 'kill anybody' : 'take anything', partner }), { need: true });
  put(w, 'reaction', `${w.hand.draw('react', { response: 'refuse' }, s, { widen: true }) ?? ''} ${words ?? '“I’ve told you where I was.”'}`, 'exchange');
  if (pairMate) w.people.add(pairMate);
  done('refuse-close', [`${nameOf(c, p)}’s ${hourWord(h)} o’clock still had ${src} against it, and now nothing beside it. A refusal isn’t an answer. It isn’t a confession either.`], lineRef);
}

/** A small case's culprit, cracking: why, in a word or two of their own. */
function crackWhy(c: BoardCase, p: PersonId): string {
  const m = personOf(c, p)?.motive ?? '';
  const head = m.split(/, and /)[0] ?? m;
  const female = personOf(c, p)?.female === true;
  let s = head
    .replace(/^(he|she) is\b/, 'I’m')
    .replace(/^(he|she) owes\b/, 'I owe')
    .replace(/^(he|she) lost\b/, 'I lost');
  s = female ? s.replace(/\bher\b/g, 'my') : s.replace(/\bhis\b/g, 'my');
  return `${cap(s)}.`;
}

/* ------------------------------------------------------------------ *
 * A question already asked: read back, free.
 * ------------------------------------------------------------------ */

export function writeRepeat(w: Writer, q: string): void {
  const { c } = w;
  const [kind, rest] = q.split(':') as [string, string];
  const lines = linesHeld(c, w.run).filter((l) => l.q === q);
  put(w, 'why', kind === 'search' ? 'I’d been over it already. What it had to say was in the notebook.' : `I’d asked ${nameOf(c, rest)} that already. It was in the notebook, as ${pronOf(c, rest).he} said it:`, 'narrator');
  const text = lines.map((l) => l.text).join(' ');
  put(w, 'job', text, 'narrator');
  for (const l of lines) {
    w.told.add(l.id);
    if (l.hour !== undefined) w.hours.add(l.hour);
    for (const p of l.about) w.people.add(p);
    if (l.speaker) w.people.add(l.speaker);
    if (l.place) w.places.add(l.place);
  }
  lay(w, 'repeat');
}

/* ------------------------------------------------------------------ *
 * The report: the form, and where I sat to fill it in.
 * ------------------------------------------------------------------ */

export function writeReport(w: Writer): void {
  const c = w.c;
  const s = solveRun(c, w.run);
  const at = w.run.at;
  put(w, 'staging', w.hand.draw('report-stage', { kind: stageKind(c, at) }, withCaps({ place: at === OFFICE ? 'the office' : placeName(c, at) }), { plain: true }) ?? 'I sat down with the form.', 'act');
  put(w, 'why', w.hand.draw('report-why', { done: s.done ? 'yes' : 'no' }, {}, { plain: true }), 'narrator');
  // The office's prop, paid off: the night began there.
  const prop = w.run.prop;
  const fresh = prop?.pay.filter((l) => !w.hand.used(`pay:${l.slice(0, 40)}`)) ?? [];
  if (prop && fresh.length && w.hand.jokeFree) {
    const l = fresh[w.hand.rng.int(fresh.length)] as string;
    w.hand.note(`pay:${l.slice(0, 40)}`);
    w.hand.joke();
    w.callback = true;
    put(w, 'close', l, 'thought');
  } else put(w, 'close', w.hand.draw('report-close', {}, {}, { widen: true, joke: true }), 'thought');
  lay(w, 'report');
}


/* ------------------------------------------------------------------ *
 * The recap: "Go over what I have", and the turn.
 * ------------------------------------------------------------------ */

export interface Clause {
  key: string;
  text: string;
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
}

/** What the notebook adds up to, clause by clause. Never a verdict: placed, said, couldn't say. */
export function recapClauses(d: BoardDeal, run: BoardRun): Clause[] {
  const c = d.kase;
  const s = solveHeld(c, solverHeld(run));
  const out: Clause[] = [];
  const hc = s.possibleHours.length === 1 ? (s.possibleHours[0] as Hour) : null;
  const what = isMurder(c) ? 'It happened' : 'It went';
  out.push(
    hc !== null
      ? { key: 'when', text: `${what} at ${oclock(hc)}.`, hours: [hc], people: [], places: [] }
      : { key: 'when', text: `${what} at ${hourWord(s.possibleHours[0] as Hour)} or ${oclock(s.possibleHours[1] as Hour)}, and I didn’t know which yet.`, hours: [...s.possibleHours], people: [], places: [] },
  );
  const meansHeld = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means);
  if (meansHeld && isMurder(c)) {
    out.push({ key: 'means', text: `The ${c.means.name.replace(/^(a|an) /, '')} came from ${placeName(c, c.means.origin)}, so whoever used it had been there first.`, hours: [], people: [], places: [c.means.origin] });
  }
  if (c.tier >= 1 && (s.accessYes.size > 0 || s.accessNo.size > 0)) {
    const yes = suspectsOf(c).filter((p) => s.accessYes.has(p)).map((p) => nameOf(c, p));
    const no = suspectsOf(c).filter((p) => s.accessNo.has(p)).map((p) => nameOf(c, p));
    const at = placeName(c, c.means.origin);
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    const told = /^told/.test(c.setup?.means ?? '');
    const were = (xs: string[]) => (xs.length > 1 ? 'were' : 'was');
    const bits: string[] = [];
    if (isMurder(c)) {
      if (yes.length) bits.push(`${andList(yes)} had been at ${at} while the ${c.means.name.replace(/^(a|an) /, '')} was there`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    } else if (party) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at the ${party.occasion} and knew the way in`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else if (told) {
      if (yes.length) bits.push(`${andList(yes)} ${were(yes)} at ${at} while ${clientOf(c).short} told the room`);
      if (no.length) bits.push(`${andList(no)} ${no.length > 1 ? 'weren’t' : 'wasn’t'}`);
    } else {
      if (yes.length) bits.push(`${andList(yes)} had been in at ${at} while the spare key was there`);
      if (no.length) bits.push(`${andList(no)} hadn’t`);
    }
    if (bits.length) out.push({ key: 'access', text: `${cap(bits.join('; '))}.`, hours: [], people: suspectsOf(c).filter((p) => s.accessYes.has(p) || s.accessNo.has(p)), places: [c.means.origin] });
  }
  const hs = hc !== null ? [hc] : [...s.possibleHours];
  for (const p of suspectsOf(c)) {
    const placed = hs.map((h) => ({ h, x: s.placed.get(`${p}@${h}`) })).filter((y) => y.x && y.x.place !== c.crime.scene && y.x.deps.some((dq) => dq !== `account:${p}`));
    const st = hs.map((h) => ({ h, st: s.status.get(`${p}@${h}`) })).find((y) => y.st?.s === 'broken');
    if (st) {
      const cl = accountOf(c, p)?.claims[st.h];
      const by = st.st?.deps.find((dq) => dq !== `account:${p}` && !dq.startsWith('confront:'));
      out.push({ key: `broken:${p}`, text: `${nameOf(c, p)} had told me ${personOf(c, p)?.home === cl?.place ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(st.h)}, and ${by ? sourceName(c, by) : 'what I had'} said otherwise.`, hours: [st.h], people: [p, ...sourcePeople(by)], places: [cl?.place ?? ''] });
      const k = c.confrontations.find((x) => x.person === p && x.hour === st.h);
      if (k && run.asked.includes(`confront:${p}@${st.h}`)) {
        const lie = c.lies.find((l) => l.person === p && l.hour === st.h);
        if (k.response === 'admit' && lie) {
          const y = (k.names ?? [])[0];
          const checked = y ? run.asked.includes(`account:${y}`) : false;
          out.push({ key: `admit:${p}`, text: `${nameOf(c, p)} owned up to ${placeName(c, lie.truth)}${y ? `, with ${nameOf(c, y)}` : ''}${y && !checked ? `, and ${nameOf(c, y)} could say whether that was so` : ''}.`, hours: [], people: [p, ...(y ? [y] : [])], places: [lie.truth] });
        } else if (k.response === 'second-lie' && k.secondLie?.place) {
          const again = run.puts.some((x) => x.person === p && x.hour === st.h && x.again && x.landed);
          out.push({
            key: `second:${p}`,
            text: again
              ? `Put to it, ${nameOf(c, p)} had a second story, ${placeName(c, k.secondLie.place)}; that didn’t hold either, and ${pronOf(c, p).he} wouldn’t say more.`
              : `Put to it, ${nameOf(c, p)} had a second story: ${placeName(c, k.secondLie.place)}.`,
            hours: [],
            people: [p],
            places: [k.secondLie.place],
          });
        } else if (k.response !== 'crack') {
          out.push({ key: `refused:${p}`, text: `${nameOf(c, p)} wouldn’t say where ${pronOf(c, p).he} had been instead.`, hours: [], people: [p], places: [] });
        }
      }
      continue;
    }
    const pl = placed[0];
    if (pl?.x && placed.length === hs.length) {
      const by = pl.x.deps.find((dq) => dq !== `account:${p}`) as string;
      out.push({ key: `placed:${p}`, text: `${nameOf(c, p)} was at ${placeName(c, pl.x.place)} at ${hourWord(pl.h)}, with ${sourceName(c, by).replace(/’s (list|story)$/, '’s word')} under it.`, hours: [pl.h], people: [p, ...sourcePeople(by)], places: [pl.x.place] });
    } else if (hc !== null && !run.asked.includes(`account:${p}`)) {
      out.push({ key: `open:${p}`, text: `Nobody had told me where ${nameOf(c, p)} was at ${hourWord(hc)}, including ${nameOf(c, p)}.`, hours: [hc], people: [p], places: [] });
    } else if (hc !== null) {
      const cl = accountOf(c, p)?.claims[hc];
      out.push({ key: `own:${p}`, text: `${nameOf(c, p)} said ${placeName(c, cl?.place ?? '')} at ${hourWord(hc)}, and nobody else had said so yet.`, hours: [hc], people: [p], places: [cl?.place ?? ''] });
    }
  }
  if (!isMurder(c) && s.whereNow && c.crime.whereNow) {
    const v = victimOf(c).short;
    // Said only as far as it's held (docs/44): a crack says whose it is; the watcher saw a coat.
    const cracked = c.confrontations.some((k) => k.response === 'crack' && run.asked.includes(`confront:${k.person}@${k.hour}`));
    const holder = shortOther(c.crime.whereNow.text.replace(/^with /, '').replace(/, at .*$/, ''));
    const remark = c.lists.flatMap((l) => l.remarks).find((r) => r.gives?.whereNow);
    const hh = /^(\w+):/.exec(remark?.text ?? '')?.[1]?.toLowerCase();
    out.push(
      cracked || !hh
        ? { key: 'where', text: `${cap(v)} ${/^the \w+s$/.test(v) ? 'were' : 'was'} ${c.crime.whereNow.text}.`, hours: [], people: [c.crime.victim], places: [c.crime.whereNow.place] }
        : { key: 'where', text: `And whatever it was had gone to ${holder} at ${placeName(c, c.crime.whereNow.place)} at ${hh}.`, hours: hh === 'eleven' ? [11] : hh === 'ten' ? [10] : [], people: [], places: [c.crime.whereNow.place] },
    );
  }
  return out;
}

/** Whose word a question is: the watcher, or the person whose evening it is. */
function sourcePeople(q: string | undefined): PersonId[] {
  if (!q) return [];
  const [kind, rest] = q.split(':') as [string, string];
  return kind === 'list' || kind === 'account' ? [rest] : kind === 'confront' ? [rest.split('@')[0] as string] : [];
}

export function writeRecap(w: Writer, starsLine: string | null): void {
  put(w, 'why', w.hand.draw('recap-open', {}, {}, { widen: true }), 'recap');
  const clauses = recapClauses(w.d, w.run);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  put(w, 'job', clauses.map((x) => x.text).join(' '), 'recap');
  w.recap = (w.parts.job ?? [])[0]?.text;
  if (starsLine) put(w, 'handoff', starsLine, 'recap');
  lay(w, 'recap');
}

/**
 * docs/43 §2: the turn, at the first lie caught. A chapter break, a recap, and
 * what next: put it to them now, or find out first what the star points at.
 */
export function writeTurn(w: Writer): void {
  const c = w.c;
  const title = w.hand.draw('turn-title', {}, {}, { widen: true, plain: true }) ?? 'Two Stories';
  w.blocks.push({ kind: 'prose', text: `The Turn: ${title}`, voice: 'chapter' });
  w.beats.push('chapter');
  put(w, 'staging', w.hand.draw('turn-open', {}, {}, { widen: true }), 'recap');
  const clauses = recapClauses(w.d, w.run);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  put(w, 'job', `Here’s what I had. ${clauses.map((x) => x.text).join(' ')}`, 'recap');
  w.recap = (w.parts.job ?? [])[0]?.text;
  // What next: the one caught, put to it now, or the first star first.
  const caught = collisionsOfRun(w)[0];
  const steps = starredSteps(w.d, w.run).filter((q) => !q.startsWith('confront:'));
  const next = steps[0];
  if (caught) {
    const name = nameOf(c, caught);
    w.people.add(caught);
    let first = '';
    if (next) {
      const [k, rest] = next.split(':') as [string, string];
      const p = personOf(c, rest);
      if (k === 'account' && p && knownPeople(c, w.run).has(rest)) first = `find out first what ${p.short} had to say for ${pronOf(c, rest).self}`;
      else if (k === 'list' && p) first = `find out first who ${knownPeople(c, w.run).has(rest) ? p.short : jobWords(p.description)} had seen at ${placeName(c, starPlace(c, next))}`;
      else if (k === 'search') first = `go over ${c.finds.find((f) => f.id === rest)?.what ?? 'the room'} first`;
      if (p && knownPeople(c, w.run).has(rest)) w.people.add(rest);
      w.places.add(starPlace(c, next));
    }
    put(w, 'handoff', first ? `I could put it to ${name} now. Or I could ${first}.` : `I could put it to ${name} now.`, 'recap');
  }
  put(w, 'close', w.hand.draw('turn-close', {}, {}, { widen: true, joke: true }), 'recap');
  lay(w, 'turn');
}

function collisionsOfRun(w: Writer): PersonId[] {
  return [...new Set(collisionsOf(w.c, w.run).map((x) => x.person))];
}

/** For the confrontation picker: the lines held for that place and hour. */
export { candidateLines, judgeLine, knownPeople, OFFICE };
