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
import { entryOf, remarkProps } from './bones/extract.js';
import { andList, cap, hourWord, nameOf, oclock, personOf, placeName, type BoardCase } from './model.js';

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
    return !/\bwith [A-Z]/.test(r.reason ?? '');
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
      const tail = named || withSomebody ? '' : who.length ? `, with ${andList(who)}${house}` : alone;
      const company = named ? 'named' : withSomebody ? 'aside' : who.length ? 'with' : alone ? 'alone' : 'bare';
      push({ shape: 'CLAIM-SPAN', flags: [...flags, company], args: { ...args, with: tail }, manner }, runHours, runHours.map((h) => ({ k: 'CLAIM', person: p, place: r.place, hour: h, ...(said ? { company: [...(a.claims[h]?.company ?? [])] } : {}) }) as Prop));
    } else {
      push({ shape: 'CLAIM-SPAN', flags: [...flags, 'bare'], args: { ...args, with: '' }, manner }, runHours, runHours.map((h) => ({ k: 'CLAIM', person: p, place: r.place, hour: h }) as Prop));
      // Hours with the same company run together: "at seven and eight it was just me".
      const spans: { hs: Hour[]; who: PersonId[] }[] = [];
      for (const x of comps) {
        const last = spans[spans.length - 1];
        if (last && key(last.who) === key(x.who)) last.hs.push(x.h);
        else spans.push({ hs: [x.h], who: x.who });
      }
      push({ shape: 'CLAIM-SPAN', flags: ['company'], args: { bits: companyBits(c, spans) }, manner }, runHours, runHours.map((h) => ({ k: 'CLAIM', person: p, hour: h, company: [...(a.claims[h]?.company ?? [])] }) as Prop));
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

/** Who was with them at which hours of one stretch: "Abramowitz was there at eight; at nine it was just me". */
export function companyBits(c: BoardCase, spans: { hs: number[]; who: string[] }[]): string {
  return spans
    .map((x) => {
      const who = x.who.map((y) => nameOf(c, y));
      const at = andList(x.hs.map((h) => hourWord(h as Hour)));
      return who.length ? `${andList(who)} ${who.length > 1 ? 'were' : 'was'} there at ${at}` : `at ${at} it was just me`;
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
    const keep = /, (for (?:her|his|its) [^,]+), and put\b/.exec(t)?.[1] ?? '';
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
 * The same list, a line at a time, with the hours each line tells (docs/49). docs/52 build 2: each
 * line a LIST-HOUR composite (the hours, the people as the watcher calls them, whether that was
 * everybody), said in a voicing of the watcher's manner.
 */
export function spokenListLines(c: BoardCase, l: WatchList, rot = 0, manner: Manner = 'plain'): SaidLine[] {
  const hours = c.board.hours.filter((h) => l.entries[h] !== undefined);
  const out: SaidLine[] = [];
  const watcher = personOf(c, l.watcher);
  const landlady = /landlady/.test(watcher?.description ?? '');
  const push = (spec: SaySpec, hs: Hour[], props: Prop[], extra: Partial<SaidLine> = {}) => out.push({ text: lineText(c, spec, props), hours: hs, props, say: spec, ...extra });
  // Somebody there at every hour the watcher kept (the fence in his booth) is said once, first.
  const always = new Set<string>();
  const others = (c.others ?? []).filter((o) => hours.length > 1 && hours.every((h) => (l.entries[h] ?? []).some((e) => 'other' in e && e.other === o.id)));
  for (const o of others) {
    always.add(o.id);
    const all = hours.length === c.board.hours.length;
    // "Pardo was there all evening. He buys things." (Raw 11's #11), not "Pardo who buys things was there".
    const who = /^(\w+) who (.+)$/.exec(o.name);
    const booth = /^(.+?) in (his|her) (.+)$/.exec(o.name);
    const plural = /^(two|three|a couple)\b/i.test(o.name);
    const name = who ? (who[1] as string) : booth ? cap(booth[1] as string) : cap(o.name);
    const args: Args = { who: name, ...(who ? { does: `He ${who[2]}` } : {}), ...(booth ? { post: `in ${booth[2]} ${booth[3]}` } : {}) };
    // docs/52: somebody there at every hour the watcher kept.
    const props = hours.map((h) => ({ k: 'LIST', watcher: l.watcher, place: l.place, hour: h, people: [`other:${o.id}`] }) as Prop);
    push({ shape: 'LIST-HOUR', flags: ['always', all ? 'all' : 'shift', ...(who ? ['does'] : []), ...(booth ? ['post'] : []), ...(plural ? ['plural'] : [])], args, manner }, [...hours], props);
  }
  const shut = hours.filter((h) => shutAt(c, l.place, h));
  const open = hours.filter((h) => !shutAt(c, l.place, h));
  // Group runs of hours with the same entries.
  const groups: { hs: Hour[]; es: ListEntry[] }[] = [];
  for (const h of open) {
    const es = (l.entries[h] ?? []).filter((e) => !('other' in e && always.has(e.other)));
    const g = groups[groups.length - 1];
    if (g && g.hs[g.hs.length - 1] === h - 1 && entryKey(g.es) === entryKey(es)) g.hs.push(h);
    else groups.push({ hs: [h], es });
  }
  const told = new Set<string>();
  groups.forEach((g, i) => {
    const hs: Args = { hours: { t: 'hours', hs: [...g.hs] } };
    const at = i === 0 ? 'first' : 'next';
    if (g.es.length === 0) {
      // "Eight o’clock, just Benny" when the one who's always there was all there was (Medium 14's #12).
      const regulars = others.filter((o) => always.has(o.id)).map((o) => /^(Lou|Pardo|Benny)\b/.exec(o.name)?.[1]);
      const named = regulars.length > 0 && regulars.every(Boolean) ? (regulars as string[]) : [];
      const regs = named.length ? others.filter((o) => always.has(o.id)).map((o) => `other:${o.id}`) : [];
      const kind = landlady ? 'landlady' : named.length ? 'regular' : always.size ? 'else' : 'bare';
      push({ shape: 'LIST-HOUR', flags: ['empty', kind, at], args: { ...hs, ...(named.length ? { names: andList(named) } : {}) }, manner }, [...g.hs], g.hs.map((h) => ({ k: 'LIST', watcher: l.watcher, place: l.place, hour: h, people: regs, ...(regs.length ? { whole: true } : {}) }) as Prop));
      return;
    }
    const names = g.es.map((e) => {
      // docs/44: a standing fact is said once ("Mr. Prentiss telling the room about his key"), then "still at it".
      if ('other' in e) {
        const full = entryName(c, e);
        const head = full.replace(/ (telling|complaining) .*$/, '');
        if (head !== full && told.has(e.other)) return `${head}, still ${/complaining/.test(full) ? 'complaining' : 'telling it'}`;
        told.add(e.other);
        return full;
      }
      return entryName(c, e);
    });
    const whole = g.hs.every((h) => listExhaustive(c, l, h));
    const nobody = nobodyElse(i + rot);
    push(
      { shape: 'LIST-HOUR', flags: ['hour', whole ? 'whole' : 'part', at, ...(g.es.length > 1 ? ['many'] : ['one'])], args: { ...hs, names: andList(names) }, manner },
      [...g.hs],
      g.hs.map((h) => ({ k: 'LIST', watcher: l.watcher, place: l.place, hour: h, people: g.es.map(entryOf), ...(whole ? { whole: true } : {}) }) as Prop),
      { hour: { when: g.hs.length === 1 ? (i === 0 ? `${cap(hourWord(g.hs[0] as Hour))} o’clock` : cap(hourWord(g.hs[0] as Hour))) : cap(andList(g.hs.map(hourWord))), names: andList(names), whole, nobody } },
    );
  });
  if (shut.length > 0) push({ shape: 'LIST-HOUR', flags: ['shut'], args: { hour: { t: 'hour', h: shut[0] as Hour } }, manner }, [...shut], shut.map((h) => ({ k: 'LIST', watcher: l.watcher, place: l.place, hour: h, people: [], shut: true }) as Prop));
  l.remarks.forEach((r, i) => out.push(remarkLine(c, l.watcher, r, i, manner, l)));
  return out;
}

function nobodyElse(i: number): string {
  return ['Nobody else', 'Nobody else at all', 'Nobody else, that hour'][i % 3] as string;
}

function entryKey(es: readonly ListEntry[]): string {
  return es.map((e) => ('person' in e ? e.person : 'other' in e ? e.other : e.look)).sort().join(',');
}

/** An hour, for a list's line: "nine o’clock". */
export { oclock };
