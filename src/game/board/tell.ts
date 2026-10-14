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

import type { Account, Claim, Hour, ListEntry, PersonId, PlaceId, WatchList } from '../../gen/board/types.js';
import { entryName, listExhaustive, shutAt } from './knowledge.js';
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
 * How a person opens an hour: "At nine", "Nine o’clock", "Around nine". Never the same twice running,
 * and (docs/47 C13) turned by the speaker as well as the night, so five accounts don't all open their
 * second hour on "Come nine".
 */
function opener(h: Hour, i: number, rot: number): string {
  const forms = [`At ${hourWord(h)}`, `${cap(hourWord(h))} o’clock`, `Then at ${hourWord(h)}`, `Come ${hourWord(h)},`, `Around ${hourWord(h)}`];
  return forms[(i + rot) % forms.length] as string;
}

/** A turn of the speaker's own, from the night's: two people don't open alike. */
function speakerRot(c: BoardCase, p: PersonId, rot: number): number {
  let h = rot;
  for (const ch of `${c.id}|${p}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 1000;
}

/** "seven", "seven or ten", "seven, eight or ten". */
function orList(xs: string[]): string {
  return xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : (xs[0] ?? '');
}

/**
 * docs/47 C13: being alone said once an account, not tacked onto every hour ("…, on my own" four
 * times). One hour alone keeps a short tag; several are said together at the end.
 */
const ALONE_TAG = [', on my own', ', by myself', ', alone'];
const ALONE_ALL = ['I was on my own all evening.', 'Nobody was with me, any of it.', 'All of it on my own.'];
const ALONE_SOME = ['Nobody was with me at {hs}.', 'At {hs} I was on my own.', 'I had nobody with me at {hs}.'];

export type Manner = 'plain' | 'terse' | 'careful';

/**
 * docs/49: one line of an answer, and the facts it carries (the hours it tells; a remark), so the
 * microplanner can make each line a fact unit of its own.
 */
export interface SaidLine {
  text: string;
  hours: Hour[];
  remark?: number;
  /** A list's hour: who, when, and whether "nobody else" was said, for aggregation. */
  hour?: { when: string; names: string; whole: boolean; nobody: string };
}

/**
 * A whole account, as the person says it. Every hour is in it, with who was
 * with them and why they moved. `others` is the company said by name; a
 * person alone says so.
 */
export function spokenAccount(c: BoardCase, a: Account, manner: Manner, rot0 = 0): string[] {
  return spokenAccountLines(c, a, manner, rot0).map((x) => x.text);
}

/** The same account, a line at a time, with the hours each line tells (docs/49). */
export function spokenAccountLines(c: BoardCase, a: Account, _manner: Manner, rot0 = 0): SaidLine[] {
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
    let s: string;
    if (i === 0 && party && r.place === c.crime.scene && !reason) {
      // The office's own gathering: everybody there knows what it was.
      s = `I was at ${party.client}’s at ${hourWord(r.from)}, for the ${party.occasion}${long ? `, till ${hourWord(r.to + 1)}` : ''}`;
    } else if (i === 0 && !reason) {
      // docs/44: "till ten" and then "at ten I went" says ten twice; the run says its own last hour.
      s = `I was ${where} ${long ? (toEnd ? 'all evening' : `from ${hourWord(r.from)} through ${hourWord(r.to)}`) : `at ${hourWord(r.from)}`}`;
    } else if (i === 0) {
      s = `At ${hourWord(r.from)} I ${reason}${long ? (toEnd ? ', and I was there all evening' : `, and stayed through ${hourWord(r.to)}`) : ''}`;
    } else {
      // "came off shift at eleven" says the hour already: the opener doesn't say it again.
      const open = reason && reason.includes(`at ${hourWord(r.from)}`) ? 'Then' : opener(r.from, i, rot);
      s = `${open} I ${reason ?? `was ${where}`}${long ? (toEnd ? ', and stayed the rest of the evening' : `, and stayed through ${hourWord(r.to)}`) : ''}`;
    }
    // Company: said with the run when it held the whole run, an hour at a time when it didn't.
    if (same) {
      const who = (comps[0]?.who ?? []).map(nm);
      // "went to the Automat to meet Abramowitz" says who was there already.
      const named = who.length > 0 && who.every((x) => s.includes(x));
      // "went round to Sokol's for coffee with Sokol" has company already: not "on my own" after it.
      const withSomebody = who.length === 0 && /\bwith [A-Z]/.test(reason ?? '');
      // Alone: a short tag when it's the evening's one hour alone; otherwise said once, after (docs/47 C13).
      const alone = who.length === 0 && !withSomebody ? (aloneOnce && runs.length > 1 ? (ALONE_TAG[rot % ALONE_TAG.length] as string) : '') : '';
      // "back to my room to write letters, with Abramowitz and Thorndike" put them in the room: in a
      // rooming house they were about the house (Hard-boiled 8).
      const house = who.length > 0 && /\bmy room\b/.test(s) && !!c.places.find((x) => x.id === r.place)?.key?.startsWith('rooming') ? ' about the house' : '';
      out.push({ text: `${s}${named || withSomebody ? '' : who.length ? `, with ${andList(who)}${house}` : alone}.`, hours: runHours });
    } else {
      out.push({ text: `${s}.`, hours: runHours });
      // Hours with the same company run together: "at seven and eight it was just me".
      const spans: { hs: Hour[]; who: PersonId[] }[] = [];
      for (const x of comps) {
        const last = spans[spans.length - 1];
        if (last && key(last.who) === key(x.who)) last.hs.push(x.h);
        else spans.push({ hs: [x.h], who: x.who });
      }
      const bits = spans.map((x) => {
        const who = x.who.map(nm);
        const at = andList(x.hs.map(hourWord));
        return who.length ? `${andList(who)} ${who.length > 1 ? 'were' : 'was'} there at ${at}` : `at ${at} it was just me`;
      });
      out.push({ text: `${cap(bits.join('; '))}.`, hours: runHours });
    }
  });
  // Several hours alone, or the whole evening: said once, at the end.
  if (aloneRuns.length > 0 && (aloneRuns.length === runs.length || !aloneOnce || runs.length === 1)) {
    const alone = aloneRuns.flatMap((r) => Array.from({ length: r.to - r.from + 1 }, (_, k) => r.from + k));
    if (aloneRuns.length === runs.length) out.push({ text: ALONE_ALL[rot % ALONE_ALL.length] as string, hours: alone });
    else {
      const hs = alone.map(hourWord);
      const t = ALONE_SOME[rot % ALONE_SOME.length] as string;
      // "Nobody was with me at eight or eleven", but "At eight and eleven I was on my own".
      out.push({ text: t.replace('{hs}', /^Nobody|^I had nobody/.test(t) ? orList(hs) : andList(hs)), hours: alone });
    }
  }
  a.remarks.forEach((r, i) => out.push({ text: r.text, hours: r.facts.map((f) => f.h), remark: i }));
  return out;
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

/** The same list, a line at a time, with the hours each line tells (docs/49). */
export function spokenListLines(c: BoardCase, l: WatchList, rot = 0): SaidLine[] {
  const hours = c.board.hours.filter((h) => l.entries[h] !== undefined);
  const out: SaidLine[] = [];
  const watcher = personOf(c, l.watcher);
  const landlady = /landlady/.test(watcher?.description ?? '');
  // Somebody there at every hour the watcher kept (the fence in his booth) is said once, first.
  const always = new Set<string>();
  const others = (c.others ?? []).filter((o) => hours.length > 1 && hours.every((h) => (l.entries[h] ?? []).some((e) => 'other' in e && e.other === o.id)));
  for (const o of others) {
    always.add(o.id);
    const plural = /^(two|three|a couple)\b/i.test(o.name);
    const span = hours.length === c.board.hours.length ? `all evening, ${hours.length > 2 ? 'every hour of it' : 'both hours'}` : 'the whole time I was on';
    // "Pardo was there all evening. He buys things." (Raw 11's #11), not "Pardo who buys things was there".
    const who = /^(\w+) who (.+)$/.exec(o.name);
    const booth = /^(.+?) in (his|her) (.+)$/.exec(o.name);
    if (who) out.push({ text: `${who[1]} was there ${span}. He ${who[2]}.`, hours: [...hours] });
    else if (booth) out.push({ text: `${cap(booth[1] as string)} was in ${booth[2]} ${booth[3]} ${span}.`, hours: [...hours] });
    else out.push({ text: `${cap(o.name)} ${plural ? 'were' : 'was'} there ${span}.`, hours: [...hours] });
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
    const when = g.hs.length === 1 ? (i === 0 ? `${cap(hourWord(g.hs[0] as Hour))} o’clock` : cap(hourWord(g.hs[0] as Hour))) : `${cap(andList(g.hs.map(hourWord)))}`;
    if (g.es.length === 0) {
      // "Eight o’clock, just Benny" when the one who's always there was all there was (Medium 14's #12).
      const regulars = others.filter((o) => always.has(o.id)).map((o) => /^(Lou|Pardo|Benny)\b/.exec(o.name)?.[1]);
      const named = regulars.length > 0 && regulars.every(Boolean) ? (regulars as string[]) : [];
      out.push({ text: landlady ? `${when}, nobody but me.` : named.length ? `${when}, just ${andList(named)}.` : `${when}, nobody${always.size ? ' else' : ''}.`, hours: [...g.hs] });
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
    out.push({ text: `${when}, ${andList(names)}.${whole ? ` ${nobody}.` : ''}`, hours: [...g.hs], hour: { when, names: andList(names), whole, nobody } });
  });
  if (shut.length > 0) out.push({ text: `We shut at ${hourWord(shut[0] as Hour)}. Nobody after that.`, hours: [...shut] });
  l.remarks.forEach((r, i) => out.push({ text: r.text, hours: r.facts.map((f) => f.h), remark: i }));
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
