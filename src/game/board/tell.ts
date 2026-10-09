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

/** How a person opens an hour: "At nine", "Nine o’clock", "By nine". Never the same twice running. */
function opener(h: Hour, i: number, rot: number): string {
  const forms = [`At ${hourWord(h)}`, `${cap(hourWord(h))} o’clock`, `Then at ${hourWord(h)}`, `Come ${hourWord(h)},`];
  return forms[(i + rot) % forms.length] as string;
}

export type Manner = 'plain' | 'terse' | 'careful';

/**
 * A whole account, as the person says it. Every hour is in it, with who was
 * with them and why they moved. `others` is the company said by name; a
 * person alone says so.
 */
export function spokenAccount(c: BoardCase, a: Account, _manner: Manner, rot = 0): string[] {
  const p = a.person;
  const female = personOf(c, p)?.female === true;
  const hours = c.board.hours;
  const runs = runsOf(hours, a.claims);
  const last = hours[hours.length - 1] as Hour;
  const out: string[] = [];
  const nm = (x: PersonId) => nameOf(c, x);
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  runs.forEach((r, i) => {
    const comps = [] as { h: Hour; who: PersonId[] }[];
    for (let h = r.from; h <= r.to; h++) comps.push({ h, who: a.claims[h]?.company ?? [] });
    const same = comps.every((x) => key(x.who) === key(comps[0]?.who ?? []));
    const where = wherePhrase(c, p, r.place);
    // A reason that doesn't say where ("turned in early") takes the place after it.
    const short = placeName(c, r.place);
    const stem = short.replace(/^the /, '').split(' ')[0] ?? short;
    const says = (t: string) => t.includes(short) || (stem.length >= 4 && t.includes(stem)) || /\bhome\b|\bmy room\b/.test(t);
    const reason0 = r.reason ? firstPerson(r.reason, female) : undefined;
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
      out.push(`${s}${named ? '' : `, ${who.length ? `with ${andList(who)}` : 'on my own'}`}.`);
    } else {
      out.push(`${s}.`);
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
      out.push(`${cap(bits.join('; '))}.`);
    }
  });
  for (const r of a.remarks) out.push(r.text);
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
  const hours = c.board.hours.filter((h) => l.entries[h] !== undefined);
  const out: string[] = [];
  const watcher = personOf(c, l.watcher);
  const landlady = /landlady/.test(watcher?.description ?? '');
  // Somebody there at every hour the watcher kept (the fence in his booth) is said once, first.
  const always = new Set<string>();
  const others = (c.others ?? []).filter((o) => hours.length > 1 && hours.every((h) => (l.entries[h] ?? []).some((e) => 'other' in e && e.other === o.id)));
  for (const o of others) {
    always.add(o.id);
    const plural = /^(two|three|a couple)\b/i.test(o.name);
    out.push(`${cap(o.name)} ${plural ? 'were' : 'was'} there ${hours.length === c.board.hours.length ? `all evening, ${hours.length > 2 ? 'every hour of it' : 'both hours'}` : 'the whole time I was on'}.`);
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
      out.push(`${when}, nobody${landlady ? ' but me' : always.size ? ' else' : ''}.`);
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
    out.push(`${when}, ${andList(names)}.${whole ? ` ${nobodyElse(i + rot)}.` : ''}`);
  });
  if (shut.length > 0) out.push(`We shut at ${hourWord(shut[0] as Hour)}. Nobody after that.`);
  for (const r of l.remarks) out.push(r.text);
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
