/**
 * docs/43 §2: "Where were you tonight?" and "Who was here tonight?", said the
 * way a person says them.
 *
 * An account is the whole evening, every hour, with company and reasons; a
 * list is every hour a watcher kept, with "nobody else" where it's true. The
 * facts are the case's own (`Account.claims`, `WatchList.entries`), every one
 * of them on the page; what changes from person to person is how they run
 * together. A plain run is said plainly ("home till nine"), and nobody reads
 * out a timetable.
 */

import type { Account, Claim, Hour, ListEntry, PersonId, PlaceId, Remark, WatchList } from '../../gen/board/types.js';
import { entryName, listExhaustive, shutAt } from './knowledge.js';
import type { Prop } from './bones/types.js';
import type { SaySpec } from './plan/types.js';
import type { Args } from './bones/voice.js';
import { sayFirst } from './bones/say.js';
import { plainComposite } from './bones/plain.js';
import { entryOf, listProp, remarkProps } from './bones/extract.js';
import { andList, cap, hourWord, nameOf, oclock, personOf, placeName, type BoardCase } from './model.js';
import { shortOther } from './bones/phrase.js';

/* ------------------------------------------------------------------ *
 * A reason, in the speaker's own mouth.
 * ------------------------------------------------------------------ */

/**
 * The generator writes a move's reason about the mover ("went home, because his
 * feet hurt"). Said by them, it's "I went home, because my feet hurt". The
 * reasons are a closed pool (`REASONS` in content.ts), and in every one of them
 * the pronouns are the mover's own.
 */
export function firstPerson(reason: string, female: boolean): string {
  let s = reason;
  if (female) {
    s = s.replace(/\bshe was\b/g, 'I was').replace(/\bshe\b/g, 'I').replace(/\bherself\b/g, 'myself').replace(/\bher\b/g, 'my');
  } else {
    s = s.replace(/\bhe was\b/g, 'I was').replace(/\bhe\b/g, 'I').replace(/\bhimself\b/g, 'myself').replace(/\bhis\b/g, 'my').replace(/\bhim\b/g, 'me');
  }
  // "hadn’t eaten, so went to …" → "hadn’t eaten, so I went to …"
  s = s.replace(/, so (went|met|stopped|had|took|called)\b/g, ', so I $1');
  s = s.replace(/ and (went|came|took|walked|kept|stopped)\b/g, ' and $1');
  return s;
}

/** "I went home" is how a person says it; "I went to Rafferty’s" when it isn't their home. */
export function wherePhrase(c: BoardCase, p: PersonId, place: PlaceId): string {
  const who = personOf(c, p);
  if (who?.home === place) {
    const pl = c.places.find((x) => x.id === place);
    return !pl?.scene && pl?.key?.startsWith('rooming') ? `home at ${placeName(c, place)}` : 'home';
  }
  if (who?.works === place) return `at work, at ${placeName(c, place)}`;
  return `at ${placeName(c, place)}`;
}

interface Run {
  from: Hour;
  to: Hour;
  place: PlaceId;
  reason?: string;
}

function runsOf(hours: Hour[], claims: Record<Hour, Claim>): Run[] {
  const out: Run[] = [];
  for (const h of hours) {
    const cl = claims[h];
    if (!cl) continue;
    const last = out[out.length - 1];
    if (last && last.place === cl.place && last.to === h - 1) last.to = h;
    else out.push({ from: h, to: h, place: cl.place, ...(cl.reason ? { reason: cl.reason } : {}) });
  }
  return out;
}

/**
 * docs/49, Planner 2: the hours a person's account gives a reason for ("At seven I went to the flats
 * over Lipsky’s to help write letters home, and stayed through nine" gives seven, eight and nine).
 * A voice line about an hour of theirs is never said for one of these: it would contradict the reason.
 */
export function hoursWithReason(c: BoardCase, a: Account): Set<Hour> {
  const out = new Set<Hour>();
  for (const r of runsOf(c.board.hours, a.claims)) if (r.reason) for (let h = r.from; h <= r.to; h++) out.add(h as Hour);
  return out;
}

/**
 * A turn of the speaker's own, from the night's: two people don't open alike. (How a person opens
 * an hour, "At nine", "Come nine,", is the voicing's now: docs/52 build 2.)
 */
function speakerRot(c: BoardCase, p: PersonId, rot: number): number {
  let h = rot;
  for (const ch of `${c.id}|${p}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 1000;
}

/**
 * docs/47 C13: being alone said once an account, not tacked onto every hour ("…, on my own" four
 * times). One hour alone keeps a short tag; several are said together at the end (a voicing of its
 * own: CLAIM-SPAN `solo`).
 */
const ALONE_TAG = [', on my own', ', by myself', ', alone'];

export type Manner = 'plain' | 'terse' | 'careful';

/**
 * docs/49: one line of an answer, and the facts it carries (the hours it tells; a remark), so the
 * microplanner can make each line a fact unit of its own.
 */
export interface SaidLine {
  /** The line as its first voicing says it (the planner chooses again, least recently used tonight). */
  text: string;
  hours: Hour[];
  remark?: number;
  /** A remark's people: whom it places, or names (docs/49: the skeleton's `about`). */
  people?: string[];
  /** A list's hour: who, when, and whether "nobody else" was said, for aggregation. */
  hour?: { when: string; names: string; whole: boolean; nobody: string };
  /** docs/52: what the line says, as propositions: the hours it tells, where, and with whom where it says so. */
  props: Prop[];
  /** docs/52 build 2: the line as a composite to be voiced (`content/board/voicings.json`). */
  say?: SaySpec;
}

/**
 * A whole account, as the person says it. Every hour is in it, with who was
 * with them and why they moved. `others` is the company said by name; a
 * person alone says so.
 */
export function spokenAccount(c: BoardCase, a: Account, manner: Manner, rot0 = 0): string[] {
  return spokenAccountLines(c, a, manner, rot0).map((x) => x.text);
}

/** A line's words: its first voicing, or plainly where none fits. */
function lineText(c: BoardCase, spec: SaySpec, props: Prop[]): string {
  return sayFirst(c, spec) ?? plainComposite(c, { shape: spec.shape, props });
}

/**
 * The same account, a line at a time, with the hours each line tells (docs/49). docs/52 build 2:
 * the writer no longer says the lines. It hands each over as a CLAIM-SPAN composite (where, when,
 * why in their own words, with whom), and a voicing in the speaker's manner says it.
 */
export function spokenAccountLines(c: BoardCase, a: Account, manner: Manner, rot0 = 0): SaidLine[] {
  const p = a.person;
  const female = personOf(c, p)?.female === true;
  const hours = c.board.hours;
  const runs = runsOf(hours, a.claims);
  const last = hours[hours.length - 1] as Hour;
  const out: SaidLine[] = [];
  const nm = (x: PersonId) => nameOf(c, x);
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  const rot = speakerRot(c, p, rot0);
  // The runs spent alone, said once (docs/47 C13): which they are, before any is told.
  const aloneRuns = runs.filter((r) => {
    for (let h = r.from; h <= r.to; h++) if ((a.claims[h]?.company ?? []).length > 0) return false;
    // (docs/55 2: a reason's "with Sokol" names nobody the night has with them: it's said without it, and the run is alone.)
    return true;
  });
  const aloneOnce = aloneRuns.length === 1 || (runs.length === 1 && aloneRuns.length === 1);
  const push = (spec: SaySpec, hs: Hour[], props: Prop[]) => out.push({ text: lineText(c, spec, props), hours: hs, props, say: spec });
  // Supper said at one hour, "couldn't eat" at another: an evening that eats twice says so (docs/47 B9).
  let ate = false;
  runs.forEach((r, i) => {
    const comps = [] as { h: Hour; who: PersonId[] }[];
    for (let h = r.from; h <= r.to; h++) comps.push({ h, who: a.claims[h]?.company ?? [] });
    const runHours = comps.map((x) => x.h);
    const same = comps.every((x) => key(x.who) === key(comps[0]?.who ?? []));
    const where = wherePhrase(c, p, r.place);
    // A reason that doesn't say where ("turned in early") takes the place after it.
    const short = placeName(c, r.place);
    const stem = short.replace(/^the /, '').split(' ')[0] ?? short;
    const says = (t: string) => t.includes(short) || (stem.length >= 4 && t.includes(stem)) || /\bhome\b|\bmy room\b/.test(t);
    let reason0 = r.reason ? firstPerson(r.reason, female) : undefined;
    // docs/55 2: a reason names nobody the account doesn't have with them ("for coffee with Sokol" when
    // the notebook says alone, Medium 14's #3), and says no change of plan it never told ("after all").
    if (reason0) {
      const company = new Set(Array.from({ length: r.to - r.from + 1 }, (_, k) => a.claims[(r.from + k) as Hour]?.company ?? []).flat().map((x) => nameOf(c, x)));
      reason0 = reason0.replace(/ with ((?:Mrs\.|Mr\.|Miss|Dr\.) )?([A-Z][\w’]+)$/, (m, t: string | undefined, n: string) => (company.has(`${t ?? ''}${n}`) ? m : ''));
      reason0 = reason0.replace(/ after all\b/, '');
      if (female) reason0 = reason0.replace(/\ba collar stud\b/, 'a hatpin');
    }
    // The office's gathering is called what it was: a burial society's meeting isn't "the party".
    if (reason0 && party?.occasion) reason0 = reason0.replace(/\bthe party\b/g, `the ${party.occasion}`);
    // Supper once a night: a second meal the same evening is coffee (docs/47 B9).
    if (reason0 && ate) reason0 = reason0.replace(/ for (the blue-plate )?supper\b/, ' for coffee');
    if (reason0 && /\bsupper\b|\bplate of\b|\bpie\b|\bbeans\b/.test(reason0)) ate = true;
    const reason = reason0 && !says(reason0) ? `${reason0}, ${where.replace(/^at /, 'at ')}` : reason0;
    const toEnd = r.to === last;
    const long = r.to > r.from;
    // The composite: which stretch of the evening it is, and how it's told.
    const span = long ? (toEnd ? 'end' : 'span') : 'one';
    const isParty = i === 0 && !!party && r.place === c.crime.scene && !reason;
    // "came off shift at eleven" says the hour already: the voicing doesn't say it again.
    const timed = !!reason && i > 0 && reason.includes(`at ${hourWord(r.from)}`);
    const flags = isParty ? ['party', 'first', span] : ['run', i === 0 ? 'first' : 'next', reason ? 'reason' : 'place', span, ...(timed ? ['timed'] : [])];
    const args: Args = {
      from: { t: 'hour', h: r.from },
      to: { t: 'hour', h: r.to },
      ...(isParty ? { client: { t: 'person', id: c.client }, occasion: party?.occasion ?? '' } : reason ? { reason } : { where }),
    };
    // Company: said with the run when it held the whole run, an hour at a time when it didn't.
    if (same) {
      const who = (comps[0]?.who ?? []).map(nm);
      // "went to the Automat to meet Abramowitz" says who was there already.
      const named = who.length > 0 && who.every((x) => (reason ?? '').includes(x));
      // "went round to Sokol's for coffee with Sokol" has company already: not "on my own" after it.
      const withSomebody = who.length === 0 && /\bwith [A-Z]/.test(reason ?? '');
      // Alone: a short tag when it's the evening's one hour alone; otherwise said once, after (docs/47 C13).
      const alone = who.length === 0 && !withSomebody ? (aloneOnce && runs.length > 1 ? (ALONE_TAG[rot % ALONE_TAG.length] as string) : '') : '';
      // "back to my room to write letters, with Abramowitz and Thorndike" put them in the room: in a
      // rooming house they were about the house (Hard-boiled 8).
      const house = who.length > 0 && /\bmy room\b/.test(reason ?? '') && !!c.places.find((x) => x.id === r.place)?.key?.startsWith('rooming') ? ' about the house' : '';
      // docs/52: where, for every hour of the run; with whom, where the line says it (by name, or alone).
      const said = named || who.length > 0 || alone !== '';
      // (docs/59 item 8: "went along with Salerno to Rafferty’s, with Ruggiero and Sirkin": whoever the reason names isn't named again after it.)
      const tail = named || withSomebody ? '' : who.length ? `, with ${andList(who.filter((x) => !(reason ?? '').includes(x)))}${house}` : alone;
      const company = named ? 'named' : withSomebody ? 'aside' : who.length ? 'with' : alone ? 'alone' : 'bare';
      push({ shape: 'CLAIM-SPAN', flags: [...flags, company], args: { ...args, with: tail }, manner }, runHours, runHours.map((h) => ({ k: 'CLAIM', person: p, place: r.place, hour: h, ...(said ? { company: [...(a.claims[h]?.company ?? [])] } : {}) }) as Prop));
    } else {
      push({ shape: 'CLAIM-SPAN', flags: [...flags, 'bare'], args: { ...args, with: '' }, manner }, runHours, runHours.map((h) => ({ k: 'CLAIM', person: p, place: r.place, hour: h }) as Prop));
      // docs/59 item 2: who was with them told by what changed, never "hour by hour".
      const cc = companyByChange(c, p, comps, manner);
      out.push({ text: cc.text, hours: runHours, props: cc.props, say: cc.say });
    }
  });
  // Several hours alone, or the whole evening: said once, at the end.
  if (aloneRuns.length > 0 && (aloneRuns.length === runs.length || !aloneOnce || runs.length === 1)) {
    const alone = aloneRuns.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, k) => r.from + k));
    const aloneProps = alone.map((h) => ({ k: 'CLAIM', person: p, hour: h, company: [] }) as Prop);
    push({ shape: 'CLAIM-SPAN', flags: ['solo', aloneRuns.length === runs.length ? 'all' : 'some'], args: { hours: { t: 'hours', hs: alone } }, manner }, alone, aloneProps);
  }
  a.remarks.forEach((r, i) => out.push(remarkLine(c, p, r, i, manner)));
  return out;
}

/**
 * docs/59 item 2: who was with somebody through one stretch of their evening at one place, told by
 * what changed, not hour by hour ("Hour by hour, Hargrove was with me at eight; Steinbach was with
 * me at nine; …"): who was there the whole time, who came and when, who left, and the hours on their
 * own. "Hargrove came by at eight, Steinbach at nine and Colquitt at ten. At eleven I was on my own."
 * Each clause a part of one `seq` composite; what they say adds up to one CLAIM an hour, with
 * everybody who was with them then (`bones/reread.ts` `mergeParts`).
 */
export function companyByChange(c: BoardCase, p: PersonId, comps: { h: Hour; who: PersonId[] }[], manner: Manner): { text: string; props: Prop[]; say: SaySpec } {
  const hs = comps.map((x) => x.h);
  const first = hs[0] as Hour;
  const last = hs[hs.length - 1] as Hour;
  const CL = (h: number, company: PersonId[]): Prop => ({ k: 'CLAIM', person: p, hour: h, company }) as Prop;
  // Each companion's hours in the stretch, grouped by the same hours.
  const order: PersonId[] = [];
  const at = new Map<PersonId, Hour[]>();
  for (const x of comps) {
    for (const y of x.who) {
      if (!at.has(y)) {
        order.push(y);
        at.set(y, []);
      }
      (at.get(y) as Hour[]).push(x.h);
    }
  }
  const groups: { who: PersonId[]; hs: Hour[] }[] = [];
  for (const y of order) {
    const yh = at.get(y) as Hour[];
    const g = groups.find((z) => z.hs.join() === yh.join());
    if (g) g.who.push(y);
    else groups.push({ who: [y], hs: [...yh] });
  }
  const parts: SaySpec[] = [];
  const add = (flags: string[], args: Args, props: Prop[]) => parts.push({ shape: 'CLAIM-SPAN', flags: ['who-with', ...flags], args, manner, props });
  // Somebody who looked in for one hour, each at an hour of their own: "Hargrove came by at eight, Steinbach at nine and Colquitt at ten".
  const singles = groups.filter((g) => g.who.length === 1 && g.hs.length === 1 && !(g.hs[0] === first && first === last));
  const singleHours = new Set(singles.map((g) => g.hs[0]));
  const asSingles = singles.length >= 2 && singleHours.size === singles.length;
  if (asSingles) {
    const sorted = [...singles].sort((a, b) => (a.hs[0] as number) - (b.hs[0] as number));
    const pairs = sorted.map((g, i) => `${nameOf(c, g.who[0] as PersonId)}${i === 0 ? ' came by' : ''} at ${hourWord(g.hs[0] as Hour)}`);
    add(['singles'], { pairs: `${pairs.slice(0, -1).join(', ')} and ${pairs[pairs.length - 1]}` }, sorted.map((g) => CL(g.hs[0] as Hour, [...g.who])));
  }
  for (const g of groups) {
    if (asSingles && singles.includes(g)) continue;
    const n = g.who.length > 1 ? 'many' : 'one';
    const names = andList(g.who.map((y) => nameOf(c, y)));
    // (Somebody who left and came back is two clauses; each says its own hours.)
    const runs: Hour[][] = [];
    for (const h of g.hs) {
      const r = runs[runs.length - 1];
      if (r && hs.indexOf(h) === hs.indexOf(r[r.length - 1] as Hour) + 1) r.push(h);
      else runs.push([h]);
    }
    for (const r of runs) {
      const a = r[0] as Hour;
      const b = r[r.length - 1] as Hour;
      const props = r.map((h) => CL(h, [...g.who]));
      if (a === first && b === last) add(['all', n], { names }, props);
      else if (a === first) add(['left', n], { names, to: { t: 'hour', h: b } }, props);
      else if (b === last) add(['came', n], { names, from: { t: 'hour', h: a } }, props);
      else if (a === b) add(['mid', 'hour', n], { names, from: { t: 'hour', h: a }, next: { t: 'hour', h: hs[hs.indexOf(b) + 1] as number } }, props);
      else add(['mid', 'span', n], { names, from: { t: 'hour', h: a }, to: { t: 'hour', h: b } }, props);
    }
  }
  // The hours on their own.
  const alone = comps.filter((x) => x.who.length === 0).map((x) => x.h);
  if (alone.length) add(['alone'], { hours: { t: 'hours', hs: alone } }, alone.map((h) => CL(h, [])));
  const props = comps.map((x) => CL(x.h, [...x.who]));
  const say: SaySpec = { shape: 'CLAIM-SPAN', flags: ['with-change'], args: {}, manner, parts, sep: ' ' };
  const text = parts.map((x) => sayFirst(c, x) ?? plainComposite(c, { shape: 'CLAIM-SPAN', props: x.props ?? [] })).join(' ');
  return { text, props, say };
}

/** Who was with them at which hours of one stretch: "Abramowitz was with me at eight; at nine it was just me" (docs/53: company, said as company, not "there"). */
export function companyBits(c: BoardCase, spans: { hs: number[]; who: string[] }[]): string {
  return spans
    .map((x) => {
      const who = x.who.map((y) => nameOf(c, y));
      const at = andList(x.hs.map((h) => hourWord(h as Hour)));
      return who.length ? `${andList(who)} ${who.length > 1 ? 'were' : 'was'} with me at ${at}` : `at ${at} it was just me`;
    })
    .join('; ');
}

function key(xs: readonly string[]): string {
  return [...xs].sort().join(',');
}

/* ------------------------------------------------------------------ *
 * A watcher's list.
 * ------------------------------------------------------------------ */

/**
 * Every hour the watcher kept, as they'd say it: the hours with the same
 * people run together ("Nine and ten, nobody but me"), "nobody else" where the
 * list is whole, and a face or a stranger said as one. Hours they weren't
 * there for are left to their own remark ("I came on at ten").
 */
export function spokenList(c: BoardCase, l: WatchList, rot = 0): string[] {
  return spokenListLines(c, l, rot).map((x) => x.text);
}

/**
 * docs/52 build 2: a remark, as a composite to be voiced (REMARK, or the handover a watcher saw):
 * the generator's remarks are a closed few, and their arguments are the remark's own facts. A remark
 * the voicings don't know is said in the speaker's own words.
 */
export function remarkLine(c: BoardCase, speaker: PersonId, r: Remark, i: number, manner: Manner, l?: WatchList): SaidLine {
  const props = remarkProps(c, speaker, r, l);
  const base = { hours: r.facts.map((f) => f.h), remark: i, people: [...r.facts.map((f) => f.p), ...(r.mentions?.people ?? [])], props };
  const x = props[0];
  let spec: SaySpec | undefined;
  const t = r.text;
  if (x?.k === 'HANDOVER') {
    const fence = x.to;
    spec = { shape: 'HANDOVER', flags: ['seen'], args: { hour: { t: 'hour', h: x.hour ?? c.crime.hour + 1 }, holder: { t: 'people', ids: [fence] } }, manner };
  } else if (x?.k === 'REMARK' && x.how === 'passed' && x.via) {
    spec = { shape: 'REMARK', flags: ['passed'], args: { via: { t: 'place', id: x.via }, hour: { t: 'hour', h: x.hour }, saw: { t: 'person', id: x.saw }, street: x.where }, manner };
  } else if (x?.k === 'REMARK' && x.how === 'had') {
    // (Why they had them: "for her supper", or the bible’s "to keep the mice down".)
    const keep = /, ((?:for (?:her|his|its)|to) [^,]+), and put\b/.exec(t)?.[1] ?? '';
    if (keep) spec = { shape: 'REMARK', flags: ['had'], args: { saw: { t: 'person', id: x.saw }, hour: { t: 'hour', h: x.hour }, keep, back: { t: 'hour', h: x.hour + 1 } }, manner };
  } else if (x?.k === 'REMARK' && x.how === 'there') {
    const m = /^(.+?) was (.+?) at (?:seven|eight|nine|ten|eleven|twelve)\. I didn’t look again\.$/.exec(t);
    if (m) spec = { shape: 'REMARK', flags: ['there'], args: { means: lc1(m[1] as string), still: m[2] as string, hour: { t: 'hour', h: x.hour } }, manner };
  } else if (x?.k === 'SHIFT') {
    spec = { shape: 'REMARK', flags: ['shift'], args: { from: { t: 'hour', h: x.from } }, manner };
  }
  if (!spec) return { text: r.text, ...base };
  return { text: sayFirst(c, spec) ?? r.text, ...base, say: spec };
}

const lc1 = (s: string): string => (/^(?:The|A|An|My|His|Her)\b/.test(s) ? (s[0] as string).toLowerCase() + s.slice(1) : s);

/**
 * docs/59 item 2: a watcher's list told by what changed, not hour by hour. Who was there the whole
 * time ("Mosley and Hanrahan were here all evening"), who came and when, who left and when ("Miss
 * Bledsoe ate at eight and left", "Rafferty came in at nine and was gone by ten"), an hour nobody was
 * in, the hour the place shut, and "nobody else" once for the span ("Nobody else came in all
 * evening"). The facts are the watcher's whole list, every hour of it (`props`, one LIST a kept hour);
 * each clause says its part (`parts`, read back by `bones/reread.ts` and merged into the whole).
 *
 * `own`: the watcher's own last words from the bible ("That's the lot."), said in place of the
 * clause that says nobody else came in.
 */
export function listByChange(c: BoardCase, l: WatchList, manner: Manner, own?: string): { text: string; props: Prop[]; say: SaySpec; hours: Hour[] } {
  const kept = c.board.hours.filter((h) => l.entries[h] !== undefined) as Hour[];
  const shut = kept.filter((h) => shutAt(c, l.place, h));
  const open = kept.filter((h) => !shutAt(c, l.place, h));
  const first = open[0] as Hour;
  const last = open[open.length - 1] as Hour;
  // (A watcher who came on late kept their own hours, not the evening's: "the whole time I was on".)
  const allEvening = kept[0] === c.board.hours[0];
  const kind = placeKindOf(c, l.place);
  const flavor = kind === 'restaurant' ? 'eat' : kind === 'bar' || kind === 'club' ? 'drink' : kind === 'rooming' || kind === 'flat' || kind === 'rooms' || kind === 'home' ? 'house' : undefined;
  const venue = c.givens.lines?.some((g) => g.kind === 'venue') && c.givens.points?.some((x) => x.kind === 'place' && x.ref === l.place && /had been at/.test(x.text));
  // Each entry's hours, in the order the watcher met them.
  const order: string[] = [];
  const at = new Map<string, Hour[]>();
  const said = new Map<string, ListEntry>();
  for (const h of open) {
    for (const e of l.entries[h] ?? []) {
      const k = entryOf(e);
      if (!at.has(k)) {
        order.push(k);
        at.set(k, []);
        said.set(k, e);
      }
      (at.get(k) as Hour[]).push(h);
    }
  }
  const LISTP = (h: number, people: string[], extra: Partial<Extract<Prop, { k: 'LIST' }>> = {}): Prop => ({ k: 'LIST', watcher: l.watcher, place: l.place, hour: h, people, ...extra }) as Prop;
  const parts: SaySpec[] = [];
  const add = (flags: string[], args: Args, props: Prop[]) => parts.push({ shape: 'LIST-HOUR', flags: ['clause', ...flags], args, manner, props });
  // The standing others (the fence in his booth) say themselves their own way, first.
  // (docs/59 item 2: one who was simply there all evening, like a name who was, goes in with them:
  // "Benny and Obermann were here all evening", never a clause each saying "all evening" twice.)
  const plainOther = (k: string): boolean => {
    const nm = (c.others ?? []).find((o) => `other:${o.id}` === k)?.name ?? k;
    return !/^(\w+) who (.+)$/.test(nm) && !/^(.+?) in (his|her) (.+)$/.test(nm) && !/^(two|three|a couple)\b/i.test(nm);
  };
  const namedAll = order.some((k) => !k.startsWith('other:') && (at.get(k) ?? []).length === open.length);
  const standing = shut.length > 0 ? [] : order.filter((k) => k.startsWith('other:') && (at.get(k) ?? []).length === open.length && open.length > 1 && (c.others ?? []).find((o) => `other:${o.id}` === k)?.known !== false && !(namedAll && plainOther(k)));
  for (const k of standing) {
    const o = (c.others ?? []).find((x) => `other:${x.id}` === k);
    const name = o?.name ?? k;
    const who = /^(\w+) who (.+)$/.exec(name);
    const booth = /^(.+?) in (his|her) (.+)$/.exec(name);
    const plural = /^(two|three|a couple)\b/i.test(name);
    const label = who ? (who[1] as string) : booth ? cap(booth[1] as string) : cap(name);
    parts.push({
      shape: 'LIST-HOUR',
      flags: ['always', allEvening ? 'all' : 'shift', ...(who ? ['does'] : []), ...(booth ? ['post'] : []), ...(plural ? ['plural'] : [])],
      args: { who: label, ...(who ? { does: `He ${who[2]}` } : {}), ...(booth ? { post: `in ${booth[2]} ${booth[3]}` } : {}) },
      manner,
      props: open.map((h) => LISTP(h, [k])),
    });
  }
  // Everybody else, grouped by the hours they were there, and each run of hours a clause.
  const groups: { ks: string[]; hs: Hour[] }[] = [];
  for (const k of order) {
    if (standing.includes(k)) continue;
    const hs = at.get(k) as Hour[];
    const g = groups.find((x) => x.hs.join() === hs.join());
    if (g) g.ks.push(k);
    else groups.push({ ks: [k], hs: [...hs] });
  }
  const name = (k: string) => {
    const e = said.get(k) as ListEntry;
    // (The client telling the room is said by name; what they were doing goes in a phrase of its own.)
    // (A face is "somebody in a grey fedora": the watcher saw a coat, not a name.)
    return 'other' in e ? shortOther(entryName(c, e)).replace(/ nobody could put a name to$/, ' I didn’t know') : 'look' in e ? `somebody ${e.look}` : entryName(c, e);
  };
  const doingOf = (k: string): string | undefined => {
    const e = said.get(k) as ListEntry;
    if (!('other' in e)) return undefined;
    return / ((?:telling|complaining) .*)$/.exec(entryName(c, e))?.[1];
  };
  // Clauses in the order the evening ran: by the hour each first came.
  groups.sort((a, b) => (a.hs[0] as number) - (b.hs[0] as number));
  groups.forEach((g) => {
    const names = andList(g.ks.map(name));
    const n = g.ks.length > 1 || /^(?:two|three|a couple)\b/i.test(names) ? 'many' : 'one';
    const doing = g.ks.length === 1 ? doingOf(g.ks[0] as string) : undefined;
    const usual = !!venue && g.ks.length === 1 && g.ks[0] === c.crime.victim;
    // The runs of hours (somebody who went out and came back is two runs).
    const runs: Hour[][] = [];
    for (const h of g.hs) {
      const r = runs[runs.length - 1];
      const prev = r ? (r[r.length - 1] as number) : -1;
      if (r && open.indexOf(h) === open.indexOf(prev as Hour) + 1) r.push(h);
      else runs.push([h]);
    }
    // Out after an hour and back for the rest of the evening: one clause.
    const r0 = runs[0] as Hour[];
    const r1 = runs[1];
    if (runs.length === 2 && r1 && r0[0] === first && r1[r1.length - 1] === last && !doing) {
      add(['outback', n, ...(flavor === 'house' ? ['house'] : [])], { names, to: { t: 'hour', h: r0[r0.length - 1] as Hour }, back: { t: 'hour', h: r1[0] as Hour } }, g.hs.map((h) => LISTP(h, [...g.ks])));
      return;
    }
    runs.forEach((r, i) => {
      const a = r[0] as Hour;
      const b = r[r.length - 1] as Hour;
      const props = r.map((h) => LISTP(h, [...g.ks]));
      const extra = [n, ...(flavor ? [flavor] : []), ...(i > 0 ? ['back'] : []), ...(doing ? ['doing'] : []), ...(usual ? ['usual'] : []), ...(!allEvening ? ['shift'] : [])];
      const base: Args = { names, ...(doing ? { doing } : {}) };
      if (a === first && b === last) add(['all', ...extra], base, props);
      else if (a === first) add(['left', a === b ? 'first' : 'after', ...extra], { ...base, to: { t: 'hour', h: b } }, props);
      else if (b === last) add(['came', a === b ? 'last' : 'stay', ...extra], { ...base, from: { t: 'hour', h: a } }, props);
      else if (a === b) add(['mid', 'hour', ...extra], { ...base, from: { t: 'hour', h: a }, next: { t: 'hour', h: open[open.indexOf(b) + 1] as number } }, props);
      else add(['mid', 'span', ...extra], { ...base, from: { t: 'hour', h: a }, to: { t: 'hour', h: b } }, props);
    });
  });
  // An hour nobody was in at all.
  const empty = open.filter((h) => (l.entries[h] ?? []).length === 0);
  if (empty.length) add(['empty', 'bare'], { hours: { t: 'hours', hs: empty } }, empty.map((h) => LISTP(h, [])));
  // "Nobody else", once for the span: every hour with somebody in it that the watcher could vouch for whole.
  const peopled = open.filter((h) => (l.entries[h] ?? []).length > 0);
  const whole = peopled.filter((h) => listExhaustive(c, l, h));
  if (whole.length > 0) {
    const marks = whole.map((h) => LISTP(h, [], { whole: true }));
    if (whole.length === peopled.length) {
      if (own) parts.push({ shape: 'LIST-HOUR', flags: ['clause', 'nobody', 'own'], args: {}, manner, props: marks, own });
      // (After "…were here all evening", "Nobody else came in": the span is said once.)
      else add(['nobody', ...(flavor === 'house' ? ['house'] : []), ...(!allEvening ? ['shift'] : []), ...(parts.some((x) => x.flags.includes('all')) ? ['span'] : [])], {}, marks);
    } else add(['nobody', 'some'], { hours: { t: 'hours', hs: whole } }, marks);
  }
  if (shut.length > 0) parts.push({ shape: 'LIST-HOUR', flags: ['shut'], args: { hour: { t: 'hour', h: shut[0] as Hour } }, manner, props: shut.map((h) => LISTP(h, [], { shut: true })) });
  // The whole list, an hour a proposition: what the parts add up to.
  const props = kept.map((h) => listProp(c, l.watcher, h, { whole: whole.length > 0 && whole.length === peopled.length ? 'auto' : whole.includes(h) }));
  const say: SaySpec = { shape: 'LIST-HOUR', flags: ['change'], args: {}, manner, parts, sep: ' ' };
  const text = parts.map((p) => (p.own ?? sayFirst(c, p) ?? plainComposite(c, { shape: 'LIST-HOUR', props: p.props ?? [] }))).join(' ');
  return { text, props, say, hours: kept };
}

/**
 * The same list, a line at a time, with the hours each line tells (docs/49): the list told by what
 * changed (`listByChange`, one line), then whatever the watcher remarks on.
 */
export function spokenListLines(c: BoardCase, l: WatchList, rot = 0, manner: Manner = 'plain', own?: string): SaidLine[] {
  void rot;
  const body = listByChange(c, l, manner, own);
  const out: SaidLine[] = [{ text: body.text, hours: body.hours, props: body.props, say: body.say }];
  l.remarks.forEach((r, i) => out.push(remarkLine(c, l.watcher, r, i, manner, l)));
  return out;
}

/** What kind of room a watcher keeps, for the clauses' flavor (a restaurant's "ate at eight and left"). */
function placeKindOf(c: BoardCase, id: PlaceId): string {
  const p = c.places.find((x) => x.id === id);
  const key = p?.key ?? '';
  if (key.startsWith('rooming')) return 'rooming';
  if (key === 'flat' || key === 'rooms') return key;
  return p?.kind ?? 'home';
}

/** An hour, for a list's line: "nine o’clock". */
export { oclock };
