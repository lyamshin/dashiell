/**
 * docs/43 §2: pages, one job each.
 *
 * - the office: the givens, in the client's mouth;
 * - arriving at a place: who's here, what they're doing, what the detective thinks;
 * - "Where were you tonight?": one whole account;
 * - "Who was here tonight?": one watcher's whole list;
 * - a search: one find;
 * - put it to: their line against the line that breaks it;
 * - the turn: a recap at the first lie caught, as a chapter break.
 *
 * About one joke a page (the hand deals one card flagged `joke` and then only
 * plain ones). Every fact on a page is a line the player now holds, said the
 * way that person would say it; the detective's thoughts say only what those
 * lines add up to (the solver on what's held), never a verdict.
 */

import type { Card } from '../voice/cards.js';
import type { Block } from '../types.js';
import { tidyPunctuation } from '../voice/prose.js';
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
  listExhaustive,
  listOf,
  peopleAt,
  solveHeld,
  type Judgement,
} from './knowledge.js';
import { Hand } from './decks.js';
import { spokenAccount, spokenList, type Manner } from './tell.js';
import {
  OFFICE,
  andList,
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
import { sourceName } from './stars.js';

/* ------------------------------------------------------------------ *
 * The writer.
 * ------------------------------------------------------------------ */

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
  };
}

type Voice = 'establish' | 'presence' | 'exchange' | 'thought' | 'find' | 'chapter' | 'recap' | 'answer' | 'act' | 'narrator' | 'errand';

function say(w: Writer, text: string | null | undefined, voice: Voice = 'narrator'): void {
  if (!text) return;
  const t = tidyPunctuation(text.replace(/\s+/g, ' ').trim());
  if (t) w.blocks.push({ kind: 'prose', text: t, voice });
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

/** A person's slots: name and pronouns. */
function who(c: BoardCase, p: PersonId): Record<string, string> {
  const pr = pronOf(c, p);
  return { name: nameOf(c, p), he: pr.he, him: pr.him, his: pr.his };
}

function hourSet(w: Writer, ...hs: Hour[]): void {
  for (const h of hs) w.hours.add(h);
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

/* ------------------------------------------------------------------ *
 * The office.
 * ------------------------------------------------------------------ */

const CIRCUMSTANCES = ['behind-on-rent', 'flush', 'hungover', 'bruised', 'sleepless', 'just-paid'];

export function writeOffice(w: Writer): void {
  const { c } = w;
  const cl = clientOf(c);
  const cp = pronOf(c, c.client);
  const circ = CIRCUMSTANCES[(c.seed * 7 + c.tier) % CIRCUMSTANCES.length] as string;
  const open = w.hand.draw('office-open', {}, {}, { widen: true });
  const office = w.hand.drawOld('office', (card) => card.tags.circumstance === circ && (card.weather === undefined || card.weather === w.run.weather || card.weather === 'any'), {}, true);
  if (office?.card.exports?.prop) w.run.prop = { short: office.card.exports.prop.short, pay: office.card.exports.prop.pay ?? [] };
  say(w, [open, office?.text].filter(Boolean).join(' '), 'establish');
  say(w, w.hand.draw('knock', {}, {}, { widen: true }), 'establish');
  const entrance = w.hand.drawOld('entrances', (card) => (card.tags.gender === 'any' || card.tags.gender === (cl.female ? 'f' : 'm')) && card.tags.familiar !== 'yes' && ['working', 'professional', 'any'].includes(String(card.tags.class)) && !/\{detective\}/.test(card.text), { name: cl.short }, true);
  say(w, entrance?.text, 'establish');

  const base = { client: cl.short, cHe: cp.he, cHim: cp.him, cHis: cp.his };
  const lines = c.givens.lines ?? c.givens.text.map((t) => ({ kind: 'found' as const, id: 'text', text: t, vars: {} as Record<string, string> }));
  // The client's lines run together where one speech would: what's gone and how, then when, then who.
  const GROUP: Record<string, string> = { relation: 'who', found: 'found', gone: 'what', party: 'what', means: 'what', clock: 'when', window: 'when', keeper: 'when', venue: 'when', pointer: 'pointer' };
  const paras: { group: string; texts: string[]; voice: Voice }[] = [];
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
    // The client says it of themselves: "she and I haven’t spoken", "asked me what it was worth".
    if (g.kind === 'pointer' && v.motive) {
      const me = cl.short;
      v.motive = v.motive
        .replace(new RegExp(`\\band ${me} haven’t\\b`), 'and I haven’t')
        .replace(new RegExp(`\\basked ${me}\\b`), 'asked me')
        .replace(new RegExp(`\\bthe late Mr\\. ${me}\\b`), cl.female ? 'my late husband' : 'my late father')
        .replace(new RegExp(`\\bday ${me} brought\\b`), 'day I brought')
        .replace(new RegExp(`\\bwasted on its owner\\b`), 'wasted on me');
    }
    if (g.kind === 'pointer' && v.behaviour) v.behaviour = v.behaviour.replace(new RegExp(`\\b${cl.short}’s\\b`, 'g'), 'my');
    if (v.pthey) v.Pthey = cap(v.pthey);
    if (g.kind === 'means' && v.resident) {
      const res = c.people.find((p) => p.short === v.resident);
      if (res) v.rtheir = pronOf(c, res.id).his;
    }
    let kind: string = g.kind;
    if (g.kind === 'clock' && !isMurder(c)) kind = 'small-clock';
    const want = g.kind === 'pointer' || g.kind === 'gone' || g.kind === 'means' || g.kind === 'keeper' ? { kind, id: g.id } : { kind };
    const text = c.givens.lines ? w.hand.draw('setup', want, withCaps(v), { need: true }) : null;
    const group = GROUP[g.kind] ?? g.kind;
    const last = paras[paras.length - 1];
    if (last && last.group === group) last.texts.push(text ?? `“${g.text}”`);
    else paras.push({ group, texts: [text ?? `“${g.text}”`], voice: g.kind === 'found' ? 'narrator' : 'exchange' });
    // What the office names, the page may name.
    for (const p of c.people) if (g.text.includes(p.short)) w.people.add(p.id);
  }
  for (const para of paras) say(w, para.texts.join(' '), para.voice);
  for (const h of c.givens.window ?? c.crime.window) w.hours.add(h);
  for (const f of c.givens.facts) w.hours.add(f.h);
  const retainer = w.hand.draw('retainer', { type: isMurder(c) ? 'murder' : 'small' }, withCaps(base), { need: true });
  say(w, [retainer, w.hand.draw('office-close', {}, {}, { widen: true })].filter(Boolean).join(' '), 'exchange');
}

/* ------------------------------------------------------------------ *
 * Arriving.
 * ------------------------------------------------------------------ */

export function writeArrive(w: Writer, place: PlaceId): void {
  const { c } = w;
  const first = !w.before.visited.includes(place);
  const pl = placeOf(c, place);
  if (!pl) return;
  const kind = placeKind(c, place);
  // `{name}` is the whole name ("the Odessa, a café where the actors eat after the show"); as the
  // subject of a sentence it takes the closing comma its aside needs (`{nameSubj}`).
  const slots = withCaps({ name: pl.name, nameSubj: pl.name.includes(',') ? `${pl.name},` : pl.name, place: pl.short, street: pl.street });
  if (first) {
    const arrive = w.hand.draw('arrive', { kind, key: pl.key }, slots, { need: true }) ?? `I went to ${pl.name}.`;
    // M13's prop: something in the room a later page here can call back to.
    const prop = w.hand.drawCard('prop', { kind }, slots);
    const ex = prop?.card.exports?.prop;
    if (prop && ex?.pay?.length) w.run.props = { ...(w.run.props ?? {}), [place]: { short: ex.short, pay: ex.pay } };
    say(w, [arrive, prop?.text].filter(Boolean).join(' '), 'establish');
  } else {
    say(w, w.hand.draw('return', {}, slots, { widen: true }) ?? `Back at ${pl.short}.`, 'establish');
  }
  // A later visit: somebody here already has a trait, and the page's last word pays it off.
  const again = first ? undefined : peopleAt(c, w.run, place).find((x) => w.run.traits?.[x]);
  const callback = !first && (again !== undefined || !!w.run.props?.[place]);
  if (callback) w.hand.hold(true);
  const vict = victimOf(c);
  if (pl.scene && first) {
    if (isMurder(c)) say(w, w.hand.draw('scene-body', { means: c.means.kind }, withCaps({ victim: vict.short }), { need: true, widen: true }), 'establish');
    else say(w, w.hand.draw('scene-empty', { kind: c.type === 'lost-pet' ? 'pet' : 'item' }, withCaps({ client: clientOf(c).short, thing: vict.short }), { need: true, widen: true }), 'establish');
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
  if (sentences.length > 0) say(w, sentences.join(' '), 'presence');
  else if (!pl.scene) say(w, `There was nobody there to ask.`, 'presence');
  if (watcherLine) say(w, watcherLine, 'thought');
  else if (first && !c.lists.some((l) => l.place === place)) {
    const none = w.hand.drawOld('watch', (card) => card.tags.watcher === 'none', {}, true);
    say(w, none?.text, 'thought');
  }
  if (callback) say(w, payOff(w, again), 'thought');
  w.places.add(place);
}

function oldWatch(w: Writer, job: string, name: string): string | null {
  const role = WATCH_ROLE[job];
  if (!role) return null;
  return w.hand.drawOld('watch', (card) => card.tags.watcher === role, { watcher: name })?.text ?? null;
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

export function writeAccount(w: Writer, p: PersonId): void {
  const { c } = w;
  const a = accountOf(c, p);
  if (!a) return;
  const s = withCaps(who(c, p));
  const look = setUp(w, p);
  say(w, [w.hand.draw('account-ask', {}, s, { widen: true }), look].filter(Boolean).join(' '), 'act');
  const said = spokenAccount(c, a, mannerOf(c, p), c.seed % 4);
  say(w, `“${said.join(' ')}”`, 'answer');
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
  thoughtAfter(w, `account:${p}`, s);
}

/* ------------------------------------------------------------------ *
 * "Who was here tonight?"
 * ------------------------------------------------------------------ */

export function writeList(w: Writer, watcher: PersonId): void {
  const { c } = w;
  const l = listOf(c, watcher);
  if (!l) return;
  const s = withCaps(who(c, watcher));
  const look = setUp(w, watcher);
  say(w, [w.hand.draw('list-ask', {}, s, { widen: true }), look].filter(Boolean).join(' '), 'act');
  const said = spokenList(c, l, c.seed % 4);
  say(w, `“${said.join(' ')}”`, 'answer');
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
  thoughtAfter(w, `list:${watcher}`, s);
}

/* ------------------------------------------------------------------ *
 * What the detective thinks: only what the lines add up to.
 * ------------------------------------------------------------------ */

/** A breaking line, said as the detective would put it to himself. */
export function breakSaid(c: BoardCase, l: Line, p: PersonId, asked: readonly string[] = []): string {
  if (l.kind === 'list') {
    const lst = listOf(c, l.speaker as PersonId);
    const es = lst?.entries[l.hour as Hour] ?? [];
    // A face is somebody's once their look is known: "somebody with a cane (Bledsoe, by the cane)".
    // Only somebody met (their own evening taken) can be matched to a face.
    const faceOf = (look: string) => c.people.find((x) => x.look === look && x.role === 'suspect' && asked.includes(`account:${x.id}`));
    const names = es
      .map((e) => ('person' in e ? nameOf(c, e.person) : 'other' in e ? (c.others?.find((o) => o.id === e.other)?.name ?? '') : `somebody ${e.look}`))
      .filter(Boolean);
    const faces = es.flatMap((e) => ('look' in e && faceOf(e.look) ? [`the only one ${e.look} was ${nameOf(c, faceOf(e.look)?.id ?? '')}`] : []));
    const faceTail = faces.length ? `; ${faces.join('; ')}` : '';
    const at = placeName(c, l.place as PlaceId);
    const onIt = es.some((e) => 'person' in e && e.person === p);
    if (onIt) return `${nameOf(c, l.speaker as PersonId)} had ${nameOf(c, p)} at ${at} at ${oclock(l.hour as Hour)}`;
    if (names.length === 0) return `${nameOf(c, l.speaker as PersonId)} had nobody at ${at} at ${oclock(l.hour as Hour)}`;
    return `${nameOf(c, l.speaker as PersonId)} had ${andList(names)} at ${at} at ${oclock(l.hour as Hour)}${lst && listExhaustive(c, lst, l.hour as Hour) ? ', and nobody else' : ''}${faceTail}`;
  }
  if (l.kind === 'claim') {
    const sp = l.speaker as PersonId;
    const cl = accountOf(c, sp)?.claims[l.hour as Hour];
    const comp = (cl?.company ?? []).map((x) => nameOf(c, x));
    return `${nameOf(c, sp)} had ${pronOf(c, sp).self} at ${placeName(c, cl?.place ?? '')} at ${oclock(l.hour as Hour)}, ${comp.length ? `with ${andList(comp)}` : 'on ' + pronOf(c, sp).his + ' own'}`;
  }
  if (l.kind === 'remark') return remarkSaid(c, l);
  if (l.kind === 'given' || l.kind === 'find') return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
  return l.text.replace(/\.$/, '');
}

/** "the Odessa at ten", or "home at ten" when it's their own. */
function claimSaid(c: BoardCase, p: PersonId, h: Hour): string {
  const cl = accountOf(c, p)?.claims[h];
  const own = personOf(c, p)?.home === cl?.place;
  return `${own ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(h)}`;
}

/**
 * A remark that places somebody, said as the detective tells it to himself. The generator's
 * remarks are a closed few: the side remark ("Walking over to the Odessa at ten I passed Feldman
 * on Ludlow Street, going fast, no hat") and the neighbour who had the pet for an hour.
 */
function remarkSaid(c: BoardCase, l: Line): string {
  const sp = l.speaker as PersonId;
  const m = /^Walking over to (.+?) at (\w+) I passed (\S+) on (.+?), (.+?)\.$/.exec(l.text.replace(/^[^:]+: “/, '').replace(/”$/, ''));
  if (m) return `${nameOf(c, sp)} passed ${m[3]} on ${m[4]} at ${m[2]}, ${m[5]}, walking over to ${m[1]}`;
  const k = /^I had (.+?) at my place at (\w+)/.exec(l.text.replace(/^[^:]+: “/, ''));
  if (k) return `${nameOf(c, sp)} had ${k[1]} at ${pronOf(c, sp).his} place at ${k[2]}`;
  return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
}

function thoughtAfter(w: Writer, q: string, s: Record<string, string | undefined>): void {
  const { c } = w;
  const before = solveHeld(c, solverHeld(w.before));
  const after = solveHeld(c, solverHeld(w.run));
  const out: string[] = [];
  // A lie caught: their line and the line that breaks it, side by side. Never a verdict.
  const fresh = collisionsOf(c, w.run).filter((x) => before.status.get(`${x.person}@${x.hour}`)?.s !== 'broken');
  for (const col of fresh.slice(0, 2)) {
    const b = col.breakers[0];
    if (!b) continue;
    const p = col.person;
    const said = breakSaid(c, b, p, w.run.asked);
    for (const x of c.people) if (!x.object && said.includes(x.short)) w.people.add(x.id);
    out.push(`${nameOf(c, p)} said ${claimSaid(c, p, col.hour)}. ${cap(said)}.`);
    w.hours.add(col.hour);
    w.people.add(p);
    for (const x of b.about) w.people.add(x);
    if (b.speaker) w.people.add(b.speaker);
    if (b.place) w.places.add(b.place);
    w.places.add(accountOf(c, p)?.claims[col.hour]?.place ?? '');
    out.push(w.hand.pick('two-stories', [
      'One of them was wrong.',
      'Two stories, and only one of them could stand.',
      `They couldn’t both be true, and ${b.kind === 'list' ? `${nameOf(c, b.speaker as PersonId)} had no reason to be the wrong one` : 'I knew which one I’d bet on'}.`,
    ]));
  }
  // A second story told earlier, and this list is where it said: they aren't on it.
  if (q.startsWith('list:')) {
    const l = listOf(c, q.slice(5));
    for (const put of w.run.puts.filter((x) => x.landed && !x.again)) {
      const k = confrontationOf(c, put.person, put.hour);
      if (!l || k?.secondLie?.place !== l.place) continue;
      const es = l.entries[put.hour] ?? [];
      if (es.some((e) => 'person' in e && e.person === put.person) || !listExhaustive(c, l, put.hour)) continue;
      out.push(`${nameOf(c, put.person)}’s second story had ${pronOf(c, put.person).him} at ${placeName(c, l.place)} at ${oclock(put.hour)}. ${nameOf(c, l.watcher)} didn’t have ${pronOf(c, put.person).him}.`);
      w.hours.add(put.hour);
      w.people.add(put.person);
    }
  }
  // The window narrowed by somebody who saw him alive.
  if (before.possibleHours.length > 1 && after.possibleHours.length === 1) {
    const gone = before.possibleHours.filter((h) => !after.possibleHours.includes(h));
    const h1 = after.possibleHours[0] as Hour;
    const v = victimOf(c);
    const seen = gone.map((h) => ({ h, x: after.placed.get(`${c.crime.victim}@${h}`) })).find((y) => y.x);
    if (seen?.x) {
      out.push(isMurder(c)
        ? `${v.short} was at ${placeName(c, seen.x.place)} at ${hourWord(seen.h)}, alive. So whatever happened to him happened at ${oclock(h1)}.`
        : `${cap(v.short)} was at ${placeName(c, seen.x.place)} at ${hourWord(seen.h)}. So it went at ${oclock(h1)}.`);
      w.hours.add(seen.h);
      w.hours.add(h1);
      w.places.add(seen.x.place);
      w.people.add(c.crime.victim);
    }
  }
  // At the hour that matters, somebody placed by a word other than their own.
  if (out.length === 0 || (out.length === 1 && before.possibleHours.length > 1 && after.possibleHours.length === 1)) {
    const hc = crimeHourKnown(c, w.run);
    const hs = hc !== null ? [hc] : c.crime.window;
    const placedNow = after.placed;
    const placedThen = before.placed;
    // Grouped by place, hour and whose word: "So Tramonti and Lindemann were at the Odessa at ten, with Shapiro’s word under it."
    const groups = new Map<string, { place: PlaceId; h: Hour; src: string; who: PersonId[] }>();
    for (const p of suspectsOf(c)) {
      for (const h of hs) {
        const k = `${p}@${h}`;
        const now = placedNow.get(k);
        if (!now || placedThen.has(k) || now.place === c.crime.scene) continue;
        if (!now.deps.includes(q)) continue;
        const others = now.deps.filter((d) => d !== `account:${p}`);
        if (others.length === 0) continue;
        const src = (others.includes(q) ? sourceName(c, q) : sourceName(c, others[0] as string)).replace(/’s (list|story)$/, '’s word');
        const g = groups.get(`${now.place}|${h}|${src}`) ?? { place: now.place, h, src, who: [] };
        g.who.push(p);
        groups.set(`${now.place}|${h}|${src}`, g);
        break;
      }
    }
    for (const g of [...groups.values()].slice(0, 2)) {
      out.push(`${out.length > 0 ? `That put ${andList(g.who.map((x) => nameOf(c, x)))}` : `So ${andList(g.who.map((x) => nameOf(c, x)))} ${g.who.length > 1 ? "were" : "was"}`} at ${placeName(c, g.place)} at ${oclock(g.h)}, with ${g.src} under it.`);
      w.hours.add(g.h);
      for (const p of g.who) w.people.add(p);
      w.places.add(g.place);
    }
  }
  const who_ = q.split(':')[1] as PersonId;
  if (out.length > 0) {
    say(w, out.join(' '), 'thought');
    say(w, payOff(w, who_), 'thought');
  } else say(w, payOff(w, who_) ?? w.hand.draw(q.startsWith('list:') ? 'list-close' : 'account-close', {}, s, { widen: true }), 'thought');
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
  const what = f.gives.why ? 'papers' : /table/.test(f.what) ? 'table' : /floor/.test(f.what) ? 'floor' : 'parlour';
  if (hasRole(w)) w.hand.hold(true);
  say(w, w.hand.draw('search-act', { what }, withCaps({ client: clientOf(c).short, victim: vict.short }), { widen: true }), 'act');
  w.told.add(`find:${findId}`);
  if (f.gives.why) {
    const top = personOf(c, c.crime.culprit);
    say(w, w.hand.draw('find-papers', {}, withCaps({ top: top?.short, motive: top?.motive }), { widen: true, need: true }) ?? f.text, 'find');
    w.people.add(c.crime.culprit);
    w.people.add(c.crime.victim);
    say(w, w.hand.pick('papers-thought', ['A reason isn’t a hand on the bottle. But it was a reason, and it was on top.', 'Everybody in that box had a reason. Only one of them was on top.', 'I put the page in my pocket. A reason is half of what the report asks, and the easy half.']), 'thought');
    say(w, payOff(w), 'thought');
    return;
  }
  const origin = placeName(c, c.means.origin);
  const empty = isMurder(c) ? '' : pastTense(thingEmpty(c));
  const text = w.hand.draw('find', { means: c.setup?.means }, withCaps({ x: origin, victim: vict.short, empty, thing: vict.short }), { need: true });
  say(w, text ?? f.text, 'find');
  w.places.add(c.means.origin);
  // What it means: where it came from, and that whoever used it had been there first.
  const hs = c.means.available;
  if (isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    const lead =
      c.means.kind === 'gun'
        ? `So the gun came from ${origin}. Whoever fired it had been at ${origin} first, to take it.`
        : c.means.kind === 'blade'
          ? `So the knife came from ${origin}. Whoever used it had been at ${origin} first, to take it.`
          : `So the ${m} came from ${origin}, and ${m} takes ${c.means.delay[1] >= 60 ? 'twenty minutes to an hour' : 'a few minutes'} to do its work. Whoever brought it had been at ${origin} earlier, to get it.`;
    say(w, lead, 'thought');
  } else {
    const mode = c.setup?.means ?? '';
    const vars = c.givens.lines?.find((g) => g.kind === 'means')?.vars ?? {};
    const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
    let t: string;
    if (party) {
      t = `So whoever it was knew the way in, and the people who knew were the ones at the ${party.occasion} at ${party.h0}.`;
      hourSet(w, hs[0] as Hour);
    } else if (/^told/.test(mode)) {
      t = `So whoever it was had heard ${clientOf(c).short} at ${vars.venue ?? placeName(c, c.means.origin)}, between ${vars.h0} and ${vars.h2}.`;
      for (const h of hs) w.hours.add(h);
      w.hours.add(Math.max(...hs) + 1);
    } else {
      t = `So whoever it was had the spare key, and that meant somebody who’d been in at ${origin} earlier in the evening.`;
    }
    say(w, t, 'thought');
  }
  say(w, payOff(w), 'thought');
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
  const look = setUp(w, p);
  say(w, [w.hand.draw('motive-ask', {}, s, { widen: true }), look].filter(Boolean).join(' '), 'act');
  say(w, w.hand.draw('motive', { id: person.motiveId }, s, { need: true }) ?? `“${cap(person.motive ?? 'Nothing')}.”`, 'answer');
  say(w, payOff(w, p) ?? w.hand.draw('motive-close', {}, s, { widen: true }), 'thought');
  w.people.add(c.crime.victim);
  w.people.add(c.client);
}

/* ------------------------------------------------------------------ *
 * Put it to them.
 * ------------------------------------------------------------------ */

export function writeConfront(w: Writer, p: PersonId, h: Hour, line: Line, j: Judgement, again: boolean): void {
  const { c } = w;
  if (hasRole(w, p)) w.hand.hold(true);
  const s = withCaps({ ...who(c, p) });
  const claimLine = again ? `${placeName(c, confrontationOf(c, p, h)?.secondLie?.place ?? '')} at ${hourWord(h)}` : claimSaid(c, p, h);
  // Said to their face: "Tillman passed you on Avenue B", not "passed Hargrove".
  const toYou = (t: string) => t.replace(new RegExp(`\\b(passed|had|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '$1 you');
  const breaker = toYou(`${cap(breakSaid(c, line, p, w.run.asked))}.${(j.with ?? []).length > 0 ? ` ${cap(andList((j.with ?? []).map((x) => breakSaid(c, x, p, w.run.asked))))}.` : ''}`);
  say(w, w.hand.draw('put', {}, withCaps({ ...s, claim: claimLine, breaker }), { widen: true, plain: true }) ?? `“You told me ${claimLine},” I said. “${breaker}”`, 'exchange');
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
  if (!j.landed) {
    say(w, `${w.hand.draw('react', { response: 'held' }, s, { widen: true }) ?? `${nameOf(c, p)} heard me out.`} “That doesn’t touch anything I told you.”`, 'exchange');
    say(w, j.why, 'thought');
    say(w, payOff(w, p) ?? w.hand.draw('held-close', {}, s, { widen: true }), 'thought');
    return;
  }
  const k = confrontationOf(c, p, h);
  if (!k) return;
  const lie = c.lies.find((l) => l.person === p && l.hour === h);
  if (again) {
    // A second story put back: the culprit holds to it, as a refusal.
    say(w, `${w.hand.draw('react', { response: 'refuse' }, s, { widen: true }) ?? ''} ${w.hand.draw('refuse-words', { who: 'culprit' }, s, { widen: true }) ?? '“I’ve told you where I was.”'}`, 'exchange');
    say(w, payOff(w, p) ?? w.hand.draw('refuse-close', {}, s, { widen: true }), 'thought');
    return;
  }
  if (k.response === 'admit' && lie) {
    const y = (k.names ?? [])[0];
    const ys = y ? withCaps({ witness: nameOf(c, y), wthem: pronOf(c, y).him }) : {};
    const words = w.hand.draw('admit-words', { place: placeOf(c, lie.truth)?.key }, withCaps({ ...s, ...ys, claim: placeName(c, lie.claim), truth: placeName(c, lie.truth) }), { need: true });
    say(w, `${w.hand.draw('react', { response: 'admit' }, s, { widen: true }) ?? ''} ${words ?? ''}`, 'exchange');
    if (y) w.people.add(y);
    w.places.add(lie.truth);
    w.places.add(lie.claim);
    say(w, payOff(w, p) ?? w.hand.draw('admit-close', {}, withCaps({ ...s, ...ys }), { widen: true }), 'thought');
    return;
  }
  if (k.response === 'second-lie' && k.secondLie?.place) {
    const alt = placeName(c, k.secondLie.place);
    say(w, `${w.hand.draw('react', { response: 'second-lie' }, s, { widen: true }) ?? ''} “All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${alt}.”`, 'exchange');
    w.places.add(k.secondLie.place);
    say(w, payOff(w, p) ?? w.hand.draw('second-close', {}, s, { widen: true }), 'thought');
    return;
  }
  if (k.response === 'crack') {
    const holder = c.crime.whereNow?.text.replace(/, at .*$/, '').replace(/^with /, '') ?? 'somebody';
    const first = k.secondLie?.place ? `“All right, I wasn’t ${personOf(c, p)?.home === lie?.claim ? 'home' : `at ${placeName(c, lie?.claim ?? '')}`}. I was at ${placeName(c, k.secondLie.place)}.” It was thin, and ${pronOf(c, p).he} knew it. ` : '';
    say(w, `${w.hand.draw('react', { response: 'crack' }, s, { widen: true }) ?? ''} ${first}“All right. I took it. It’s with ${holder}. ${crackWhy(c, p)}”`, 'exchange');
    if (k.secondLie?.place) w.places.add(k.secondLie.place);
    w.places.add(c.crime.whereNow?.place ?? '');
    say(w, payOff(w, p) ?? w.hand.draw('crack-close', {}, s, { widen: true }), 'thought');
    return;
  }
  // A refusal: the same words and the same weight, guilty or not.
  // The pair's liar says whose flat it was, as the story had it; everybody else draws from one pool.
  const pairMate = lie?.kind === 'pair' ? accountOf(c, p)?.claims[h]?.company[0] : undefined;
  const partner = pairMate ? nameOf(c, pairMate) : undefined;
  const words = w.hand.draw('refuse-words', { who: partner ? 'pair' : 'any' }, withCaps({ ...s, crime: isMurder(c) ? 'kill anybody' : 'take anything', partner }), { need: true });
  say(w, `${w.hand.draw('react', { response: 'refuse' }, s, { widen: true }) ?? ''} ${words ?? '“I’ve told you where I was.”'}`, 'exchange');
  if (pairMate) w.people.add(pairMate);
  say(w, payOff(w, p) ?? w.hand.draw('refuse-close', {}, s, { widen: true }), 'thought');
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
  say(w, kind === 'search' ? 'I’d been over it already. What it had to say was in the notebook.' : `I’d asked ${nameOf(c, rest)} that already. It was in the notebook, as ${pronOf(c, rest).he} said it:`, 'narrator');
  const text = lines.map((l) => l.text).join(' ');
  if (text) say(w, text, 'narrator');
  for (const l of lines) {
    w.told.add(l.id);
    if (l.hour !== undefined) w.hours.add(l.hour);
    for (const p of l.about) w.people.add(p);
    if (l.speaker) w.people.add(l.speaker);
    if (l.place) w.places.add(l.place);
  }
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
    out.push({ key: 'where', text: `${cap(v)} ${/^the \w+s$/.test(v) ? 'were' : 'was'} ${c.crime.whereNow.text}.`, hours: [], people: [c.crime.victim], places: [c.crime.whereNow.place] });
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
  say(w, w.hand.draw('recap-open', {}, {}, { widen: true }), 'recap');
  const clauses = recapClauses(w.d, w.run);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  say(w, clauses.map((x) => x.text).join(' '), 'recap');
  if (starsLine) say(w, starsLine, 'recap');
}

/** docs/43 §2: the turn, at the first lie caught. A chapter break and a recap. */
export function writeTurn(w: Writer): void {
  const title = w.hand.draw('turn-title', {}, {}, { widen: true, plain: true }) ?? 'Two Stories';
  w.blocks.push({ kind: 'prose', text: `The Turn: ${title}`, voice: 'chapter' });
  say(w, w.hand.draw('turn-open', {}, {}, { widen: true }), 'recap');
  const clauses = recapClauses(w.d, w.run).filter((x) => x.key !== 'when' || true);
  for (const cl of clauses) {
    for (const h of cl.hours) w.hours.add(h);
    for (const p of cl.people) w.people.add(p);
    for (const p of cl.places) w.places.add(p);
  }
  say(w, clauses.map((x) => x.text).join(' '), 'recap');
}

/** For the confrontation picker: the lines held for that place and hour. */
export { candidateLines, judgeLine, knownPeople, OFFICE };
