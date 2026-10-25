/**
 * docs/44: the thread. Each page opens on the pointer that sent the detective
 * there, the same one the star showed (`stars.ts`'s `starReason`): the latest
 * thing held that points at the question, or the office. Said as the detective
 * tells it to himself ("Coffin’s list had Ashby here at eleven"), and, where it
 * can't tip anybody off, to the person's face ("Coffin has you here at nine").
 *
 * The hand-off is the other end of the same thread: what this page makes him
 * want next, which is the page's first star.
 */

import { GIVENS, pointerIndex } from '../../gen/board/pointers.js';
import { SPARE_KEY } from '../../gen/board/content.js';
import { accountOf, confrontationOf, listOf } from './knowledge.js';
import { wayWhat } from './bones/phrase.js';
import { markPronoun } from './plan/refer.js';
import {
  andList,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  personOf,
  placeName,
  placeOf,
  pronOf,
  victimOf,
  type BoardCase,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
} from './model.js';

export interface Pointer {
  /** The question or `givens` that pointed, or `presence` when nothing did and they were simply there. */
  src: string;
  /** The pointer as the detective tells it to himself, lower case, no full stop: "Coffin’s list had Ashby here at eleven". */
  clause: string;
  /** Said to their face, a whole sentence, only where it can't tip them off: "Coffin has you here at nine." */
  face?: string;
  /** The held lines (or `givens:<kind>`) it rests on. */
  refs: string[];
  /** docs/66, P3: the question it points to (`placeThread`'s), when it's one of a place's. */
  q?: string;
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
}

/** docs/49: a pronoun as the thread writes it, marked with whom it means, for the planner's reference. */
function pm(c: BoardCase, p: PersonId, form: 'he' | 'him' | 'his'): string {
  return `${pronOf(c, p)[form]}${markPronoun(c, p)}`;
}

/** The source the star showed for `q`: the latest thing held that points at it, or the office. */
export function sourceOf(c: BoardCase, asked: readonly string[], q: string): string | null {
  const by = pointerIndex(c).by.get(q);
  if (!by) return null;
  for (let i = asked.length - 1; i >= 0; i--) if (by.has(asked[i] as string)) return asked[i] as string;
  return by.has(GIVENS) ? GIVENS : null;
}

/** "eleven", "eight and nine", or "all evening". */
function hoursSaid(c: BoardCase, hs: Hour[]): string {
  if (hs.length === c.board.hours.length && hs.length > 1) return 'all evening';
  return `at ${andList(hs.map(hourWord))}`;
}

/** The place by name (docs/53, the dial: never "here", even for the room I'm standing in). */
function at(c: BoardCase, place: PlaceId, _here: PlaceId): string {
  return `at ${placeName(c, place)}`;
}

/** Said to somebody's face, in the room itself, "here" is plain speech. */
function atFace(c: BoardCase, place: PlaceId, here: PlaceId): string {
  return place === here ? 'here' : `at ${placeName(c, place)}`;
}

/** The hours of a crime window the office gave: a face reason never names them (a liar would lie around it). */
function windowOf(c: BoardCase): Hour[] {
  return c.givens.window ?? c.crime.window;
}

/**
 * The pointer from `src` to the question `q`, said. `here` is where the
 * detective stands as the page is read.
 */
export function pointerSaid(c: BoardCase, src: string, q: string, here: PlaceId): Pointer | null {
  const [qk, qrest] = q.split(':') as [string, string];
  const [sk, srest] = src.split(':') as [string, string];
  const out = (clause: string, refs: string[], o: Partial<Pointer> = {}): Pointer => ({ src, clause, refs, hours: [], people: [], places: [], ...o });
  if (qk === 'account') {
    const p = qrest as PersonId;
    const P = nameOf(c, p);
    if (sk === 'list') {
      const l = listOf(c, srest);
      if (l) {
        const hs = c.board.hours.filter((h) => (l.entries[h] ?? []).some((e) => 'person' in e && e.person === p));
        if (hs.length > 0) {
          const safe = hs.filter((h) => !windowOf(c).includes(h));
          const W = nameOf(c, l.watcher);
          // (docs/66, P3: where the watcher saw them at an hour of the window too, the hours outside it alone
          // read as wrong to their face, "Ellery saw you here at eleven" when Ellery had her from ten: the
          // sighting without its hours, which never names the window either.)
          const partial = safe.length > 0 && safe.length < hs.length;
          return out(`${W} had seen ${P} ${at(c, l.place, here)} ${hoursSaid(c, hs)}`, hs.map((h) => `list:${l.watcher}@${h}`), {
            ...(safe.length > 0 ? { face: partial ? `${W} saw you ${atFace(c, l.place, here)} tonight.` : `${W} saw you ${atFace(c, l.place, here)} ${hoursSaid(c, safe)}.` } : {}),
            hours: hs,
            people: [p, l.watcher],
            places: [l.place],
          });
        }
        const r = l.remarks.findIndex((x) => x.facts.some((f) => f.p === p) || (x.mentions?.people ?? []).includes(p));
        if (r >= 0) return out(`${nameOf(c, l.watcher)} had mentioned ${P}`, [`remark:list:${l.watcher}#${r}`], { people: [p, l.watcher] });
      }
    }
    if (sk === 'account') {
      const a = accountOf(c, srest);
      if (a) {
        const A = nameOf(c, a.person);
        const pa = pronOf(c, a.person);
        const hs = c.board.hours.filter((h) => a.claims[h]?.company.includes(p));
        // docs/66, P3: a remark that puts them somewhere at an hour of the window ("Pickering had passed him
        // on Second Avenue at ten") is why they matter, more than company at an hour outside it ("Pickering
        // had said she was with him at eleven", which pointed at the hour that didn't matter).
        const rWin = a.remarks.findIndex((x) => x.facts.some((f) => f.p === p && windowOf(c).includes(f.h as Hour)));
        const inWin = hs.some((h) => windowOf(c).includes(h));
        if (rWin >= 0 && !inWin) {
          const rm = a.remarks[rWin];
          const m = /^Walking over to (.+?) at (\w+) I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on (.+?), (.+?)\.$/.exec(rm?.text ?? '');
          if (m) return out(`${A} had passed ${P} on ${m[4]} at ${m[2]}`, [`remark:account:${a.person}#${rWin}`], { hours: [rm?.facts[0]?.h as Hour], people: [p, a.person] });
        }
        if (hs.length > 0) {
          const h0 = [...hs].sort((x, y) => Number(windowOf(c).includes(y)) - Number(windowOf(c).includes(x)) || x - y)[0] as Hour;
          const pl = a.claims[h0]?.place as PlaceId;
          const own = personOf(c, a.person)?.home === pl;
          const where = own ? `${pm(c, a.person, 'his')} place` : placeName(c, pl);
          const safe = hs.filter((h) => !windowOf(c).includes(h) && a.claims[h]?.place === pl);
          // docs/55 8: at their own place, "with her at nine" says it (not "with her at Mrs. Whitfield’s place").
          // docs/59 item 8: "Grasso had said she was with Whitfield at the Delmonico rooms at nine": the
          // speaker's own pronoun, next to her name; "Whitfield was with her" left "her" to either woman,
          // and the reference pass said "with Grasso", her name twice in the sentence.
          // docs/59 item 1: who and when is the reason to come; where is the account's to say, once
          // ("Feeney had said he was home, the Delmonico rooms, with Brauer at eight", and then the
          // account and the thought said the Delmonico rooms at eight again).
          // docs/66, P2: the company they said, whole ("with Winslow and Dandridge at eight"), the one it points
          // at first: never one of two, which the reference pass could then make "him" of a man named a
          // sentence before.
          const others = (a.claims[h0]?.company ?? []).filter((x) => x !== p);
          const withWhom = andList([P, ...others.map((x) => nameOf(c, x))]);
          return out(`${A} had said ${pm(c, a.person, 'he')} was with ${withWhom} at ${hourWord(h0)}`, [`claim:${a.person}@${h0}`], {
            // To their face, only a watcher's word: "Coffin has you here at nine." Another suspect's would be one more name, and a story set against a story.
            ...(safe.length > 0 && personOf(c, a.person)?.role === 'watcher' ? { face: `${A} says you were with ${pa.him} ${pl === here && !own ? 'here' : `at ${where.replace(/\u2063\d+\u2064/g, '')}`} ${hoursSaid(c, safe)}.` } : {}),
            hours: [h0],
            people: [p, a.person, ...others],
            places: [pl],
          });
        }
        const r = a.remarks.findIndex((x) => x.facts.some((f) => f.p === p) || (x.mentions?.people ?? []).includes(p));
        if (r >= 0) {
          const rm = a.remarks[r];
          const m = /^Walking over to (.+?) at (\w+) I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on (.+?), (.+?)\.$/.exec(rm?.text ?? '');
          if (m) {
            const h = rm?.facts[0]?.h as Hour;
            // The remark's own words ("going fast, no hat") are its speaker's: a clue is said at most twice a night (docs/44).
            return out(`${A} had passed ${P} on ${m[4]} at ${m[2]}`, [`remark:account:${a.person}#${r}`], { hours: [h], people: [p, a.person] });
          }
          return out(`${A} had mentioned ${P}`, [`remark:account:${a.person}#${r}`], { people: [p, a.person] });
        }
      }
    }
    if (sk === 'confront') {
      const [x, hs] = srest.split('@') as [string, string];
      const h = Number(hs) as Hour;
      const lie = c.lies.find((l) => l.person === x && l.hour === h);
      const X = nameOf(c, x);
      if (lie) {
        // docs/59 item 1: the owning up was the page before; the next page says who named them, not the story again.
        // (docs/59, the skim test: what they were named for, "Margolis had said she was with Ashby at ten",
        // never a bare "Margolis had named Ashby".)
        return out(`${X} had said ${pm(c, x, 'he')} was with ${P} at ${hourWord(h)}`, [`admit:${x}@${h}`], { hours: [h], people: [p, x] });
      }
      return out(`${X} had named ${P}`, [], { people: [p, x] });
    }
    if (sk === 'search') {
      const f = c.finds.find((x) => x.id === srest);
      return out(`${f?.what ?? 'the room'} had named ${P}`, [`find:${srest}`], { people: [p] });
    }
    if (src === GIVENS) return givenPointer(c, p, here);
  }

  if (qk === 'list') {
    const l = listOf(c, qrest);
    if (!l) return null;
    const L = l.place;
    if (sk === 'search') {
      if (isMurder(c)) return out(`the ${c.means.name.replace(/^(a|an) /, '')} had come from ${placeName(c, L)}`, [`find:${srest}`], { places: [L] });
      return out(`whoever went into ${placeName(c, c.crime.scene)} had heard about ${wayWhat(c)} ${at(c, L, here)}`, [`find:${srest}`], { places: [L, c.crime.scene] });
    }
    if (sk === 'account') {
      const a = accountOf(c, srest);
      const hs = c.board.hours.filter((h) => a?.claims[h]?.place === L);
      if (a && hs.length > 0) {
        const A = nameOf(c, a.person);
        return out(`${A} had said ${pm(c, a.person, 'he')} was ${at(c, L, here)} ${hoursSaid(c, hs)}`, hs.map((h) => `claim:${a.person}@${h}`), { hours: hs, people: [a.person], places: [L] });
      }
      if (a) return out(`${nameOf(c, a.person)} had mentioned ${placeName(c, L)}`, [], { people: [a.person], places: [L] });
    }
    if (sk === 'list') return out(`${nameOf(c, srest)} had mentioned ${placeName(c, L)}`, [], { people: [srest], places: [L] });
    if (sk === 'confront') {
      const [x, hs] = srest.split('@') as [string, string];
      const h = Number(hs) as Hour;
      const k = confrontationOf(c, x, h);
      const X = nameOf(c, x);
      if (k?.secondLie?.place === L) return out(`${X} had taken it back and said ${pm(c, x, 'he')} was ${at(c, L, here)} at ${hourWord(h)}`, [`second:${x}@${h}`], { hours: [h], people: [x], places: [L] });
      return out(`${X} had owned up to ${placeName(c, L)}`, [`admit:${x}@${h}`], { people: [x], places: [L] });
    }
    if (src === GIVENS) return givenPlace(c, L, here);
  }

  if (qk === 'search') {
    const f = c.finds.find((x) => x.id === qrest);
    // Said as a detective would, never as the form asks it ("the report wanted a why", Poached 5's #11).
    // (docs/66, P10: the page says "papers" and "grudge" once each; the pointer, neither.)
    // (docs/66, skim round 3: "his desk" opening a page had nobody for the "his": the desk, at the dead's place.)
    if (f?.gives.why) return out(`if anybody had a reason, the desk would say so`, ['givens:found'], { places: [f.place] });
    if (isMurder(c)) return out(`${victimOf(c).short} had died ${at(c, c.crime.scene, here)}`, ['givens:found'], { people: [c.crime.victim], places: [c.crime.scene] });
    return out(`${victimOf(c).short} had gone from ${placeName(c, c.crime.scene)}`, ['givens:gone'], { places: [c.crime.scene] });
  }

  if (qk === 'confront') {
    const [p, hs] = qrest.split('@') as [string, string];
    const h = Number(hs) as Hour;
    return out(`what ${nameOf(c, p)} had told me about ${hourWord(h)} didn’t square with something I had`, [`claim:${p}@${h}`], { hours: [h], people: [p] });
  }
  return null;
}

/** The office, pointing at a person. */
function givenPointer(c: BoardCase, p: PersonId, here: PlaceId): Pointer {
  const P = nameOf(c, p);
  const cl = clientOf(c).short;
  const base = (clause: string, refs: string[], extra: Partial<Pointer> = {}): Pointer => ({ src: GIVENS, clause, refs, hours: [], people: [p], places: [], ...extra });
  const lines = c.givens.lines ?? [];
  if (c.givens.pointer === p) {
    const pl = lines.find((g) => g.kind === 'pointer');
    const behaviour = pl?.vars.behaviour;
    // docs/49: a bare "she" or "him" in what they did is the dead man's, or the pet's, marked so.
    const vp = pronOf(c, c.crime.victim);
    const theirs = new RegExp(`\\b(${[vp.he, vp.him, vp.his].join('|')})\\b(?!\u2063)`, 'g');
    // docs/55 2: the office said its reason for pointing in its own words (a motive, or what they did);
    // the thread doesn't say a second one ("who asked twice where Fritz sleeps" after "asked me what Fritz was worth").
    void behaviour;
    void theirs;
    return base(`${cl} had pointed me at ${P}`, ['givens:pointer'], { people: [p, c.client] });
  }
  if (c.crime.finder === p) return base(`${P} had found ${victimOf(c).short}`, ['givens:found'], { people: [p, c.crime.victim] });
  if (c.givens.access.includes(p)) return base(`${P} lodged at ${at(c, c.crime.scene, here) === 'here' ? 'the flat' : placeName(c, c.crime.scene)}`, ['givens:means']);
  if ((c.givens.known ?? []).includes(p)) {
    const k = lines.find((g) => g.kind === 'keeper');
    const verb = k?.id === 'borrows' ? `borrowed ${victimOf(c).short} most evenings` : k?.id === 'looks-in' ? `looked in on ${victimOf(c).short} of an evening` : `minded ${victimOf(c).short}`;
    return base(`${cl} had said ${P} ${verb}`, ['givens:keeper'], { people: [p, c.client] });
  }
  const f = c.givens.facts.find((x) => x.k === 'at' && x.p === p);
  if (f) {
    const party = lines.find((g) => g.kind === 'party')?.vars;
    if (party && f.place === c.crime.scene) return base(`${P} had been at ${cl}’s at ${hourWord(f.h)}, for the ${party.occasion}`, ['givens:party'], { hours: [f.h], people: [p, c.client] });
    return base(`${cl} had said ${P} was at ${placeName(c, f.place)} at ${hourWord(f.h)}`, ['givens:facts'], { hours: [f.h], places: [f.place], people: [p, c.client] });
  }
  return base(`${cl} had named ${P}`, ['givens:pointer'], { people: [p, c.client] });
}

/** The office, pointing at a place. */
function givenPlace(c: BoardCase, L: PlaceId, here: PlaceId): Pointer {
  const cl = clientOf(c).short;
  const base = (clause: string, refs: string[], extra: Partial<Pointer> = {}): Pointer => ({ src: GIVENS, clause, refs, hours: [], people: [], places: [L], ...extra });
  const lines = c.givens.lines ?? [];
  const means = lines.find((g) => g.kind === 'means');
  const mode = c.setup?.means ?? '';
  if (/^told/.test(mode)) {
    const what = mode === 'told-window' ? `${pm(c, c.client, 'his')} parlor window` : `${pm(c, c.client, 'his')} key`;
    return base(`${cl} had sat ${at(c, L, here)} telling the room about ${what}`, ['givens:means'], { people: [c.client] });
  }
  // docs/47 B9: the key is where the office said, in the office's words: a nail, or a sugar tin.
  if (/^spare/.test(mode)) return base(`the spare key lived ${(SPARE_KEY[mode]?.at ?? 'at {x}').replace(/ at \{x\}$/, '')} ${at(c, L, here)}`, ['givens:means']);
  if (lines.some((g) => g.kind === 'venue') && isMurder(c)) return base(`${victimOf(c).short} had been ${at(c, L, here)} earlier in the evening`, ['givens:venue'], { people: [c.crime.victim] });
  const f = c.givens.facts.find((x) => x.k === 'at' && x.place === L);
  if (f) return base(`${cl} had said ${nameOf(c, f.p)} was ${at(c, L, here)} at ${hourWord(f.h)}`, ['givens:facts'], { hours: [f.h], people: [f.p, c.client] });
  void means;
  return base(`${cl} had named ${placeName(c, L)}`, ['givens:means'], { people: [c.client] });
}

/**
 * The pointer that sent the detective to `q`, from what was held before the
 * page: the same source the star showed. When nothing points (a wanderer's
 * question), the plain truth: they were in the room.
 */
export function threadFor(c: BoardCase, before: Pick<BoardRun, 'asked'>, q: string, here: PlaceId): Pointer {
  const src = sourceOf(c, before.asked, q);
  const said = src ? pointerSaid(c, src, q, here) : null;
  if (said) return said;
  const [qk, qrest] = q.split(':') as [string, string];
  if (qk === 'account' || qk === 'list' || qk === 'motive') {
    const P = nameOf(c, qrest);
    const pr = pronOf(c, qrest);
    return {
      src: 'presence',
      clause: qk === 'list' ? `${P} had been ${here === personOf(c, qrest)?.foundAt ? 'here' : 'there'} all night, and nobody had asked ${pr.him} yet` : `${P} was in the room, and I hadn’t heard from ${pr.him} yet`,
      refs: [],
      hours: [],
      people: [qrest],
      places: [],
    };
  }
  return { src: 'presence', clause: '', refs: [], hours: [], people: [], places: [] };
}

/**
 * Why the detective walked into a place: the pointers to the questions that
 * wait there, from what's held, the starred one first. Up to two, joined, as
 * the golden's Delmonico rooms join three earlier lines.
 */
export function placeThread(c: BoardCase, before: Pick<BoardRun, 'asked'>, place: PlaceId, starred: readonly string[], here: PlaceId): Pointer[] {
  const idx = pointerIndex(c);
  const qs = [...idx.questions.values()].filter((q) => q.at === place && !before.asked.includes(q.id) && q.kind !== 'confront');
  qs.sort((a, b) => Number(starred.includes(b.id)) - Number(starred.includes(a.id)) || order(a.kind) - order(b.kind));
  const out: Pointer[] = [];
  const seen = new Set<string>();
  const asked = new Set<string>();
  const take = (src: string, q: string) => {
    if (out.length >= 2 || asked.has(q)) return;
    const p0 = pointerSaid(c, src, q, here);
    const p = p0 ? { ...p0, q } : null;
    if (!p || !p.clause || seen.has(p.clause)) return;
    // Two pointers from the office say the same office twice: one is enough.
    if (src === GIVENS && out.some((x) => x.src === GIVENS)) return;
    seen.add(p.clause);
    asked.add(q);
    out.push(p);
  };
  // The star's own reason first: the latest thing held that points into this room.
  for (const q of qs) {
    const src = sourceOf(c, before.asked, q.id);
    if (src) {
      take(src, q.id);
      break;
    }
  }
  // Then the other lines held that point here, latest first, and the office: the golden's Delmonico rooms join three.
  for (const q of qs) {
    const by = idx.by.get(q.id);
    if (!by) continue;
    for (let i = before.asked.length - 1; i >= 0; i--) if (by.has(before.asked[i] as string)) take(before.asked[i] as string, q.id);
    if (by.has(GIVENS)) take(GIVENS, q.id);
  }
  return out;
  function order(k: string): number {
    return k === 'list' ? 0 : k === 'search' ? 1 : 2;
  }
}

export { cap, placeOf };
