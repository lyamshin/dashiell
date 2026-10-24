/**
 * docs/52: the engine's own ways of saying a held line in the detective's head ("Coffin had Feeney
 * here at eleven", "home at ten", "hadn’t been at Rafferty’s while the chloral was on the hall
 * shelf"), shared by the thought's writer and the planner's voicings. Moved here from `thought.ts`
 * so the realizer (`bones/`) can use them without the writer.
 */

import type { Line } from '../knowledge.js';
import { accountOf, listExhaustive, listOf } from '../knowledge.js';
import { andList, clientOf, hourWord, isMurder, nameOf, oclock, personOf, placeName, pronOf, victimOf, type BoardCase, type Hour, type PersonId, type PlaceId } from '../model.js';
import { lean } from '../plan/dial.js';
import { isPoison } from '../when.js';

/** "the Odessa at ten", or "home at ten" when it's their own. */
export function claimSaid(c: BoardCase, p: PersonId, h: Hour): string {
  const cl = accountOf(c, p)?.claims[h];
  const own = personOf(c, p)?.home === cl?.place;
  return `${own ? 'home' : placeName(c, cl?.place ?? '')} at ${hourWord(h)}`;
}

/**
 * docs/62 item 2: where somebody said they were, as the clause a person says it in after "said" or
 * "told me": "at the Odessa at ten", "home at ten". Never a place as the object of "said" ("She said
 * home at the Delmonico rooms at eleven", "Bledsoe had said Moskowitz’s at ten").
 */
export function claimAt(c: BoardCase, p: PersonId, h: Hour): string {
  const s = claimSaid(c, p, h);
  return s.startsWith('home ') ? s : `at ${s}`;
}

/**
 * docs/62 item 2: what somebody said of their hours, as a clause: "she was at Moskowitz’s at ten", "he
 * was home at nine and ten", "she was at the Automat at nine and home at ten". The pronoun is marked
 * with whom it means, for the reference pass (`markPronoun`); `you` says it to their face ("you were
 * home at eleven"), and `hours: false` leaves the hours for the sentence to say ("she was at Moskowitz’s").
 */
export function claimWas(c: BoardCase, p: PersonId, hs: readonly Hour[], o: { you?: boolean; hours?: boolean; mark?: string } = {}): string {
  const subj = o.you ? 'you were' : `${pronOf(c, p).he}${o.mark ?? ''} was`;
  const parts = hs.map((h) => claimAt(c, p, h));
  const where = parts.map((x) => x.replace(/ at \w+$/, ''));
  const same = where.every((x) => x === where[0]);
  if (o.hours === false && same) return `${subj} ${where[0] ?? ''}`;
  return `${subj} ${same ? `${where[0]} at ${andList(hs.map(hourWord))}` : andList(parts)}`;
}

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
      .filter(Boolean)
      .map((n) => shortOther(n));
    // "the camel coat was Abramowitz’s": said as a person says it (Hard-boiled 8's #17).
    const faces = es.flatMap((e) => ('look' in e && faceOf(e.look) ? [`${e.look.replace(/^(in|with) an? /, 'the ')} was ${nameOf(c, faceOf(e.look)?.id ?? '')}’s`] : []));
    const faceTail = faces.length ? `; ${faces.join('; ')}` : '';
    const at = placeName(c, l.place as PlaceId);
    const onIt = es.some((e) => 'person' in e && e.person === p);
    return listSaid(c, l.speaker as PersonId, onIt ? p : null, names, at, l.hour as Hour, !!lst && listExhaustive(c, lst, l.hour as Hour), faceTail);
  }
  if (l.kind === 'claim') {
    const sp = l.speaker as PersonId;
    const cl = accountOf(c, sp)?.claims[l.hour as Hour];
    const comp = (cl?.company ?? []).map((x) => nameOf(c, x));
    // Plain speech, not the board read aloud ("Abramowitz had himself at…", Hard-boiled 8).
    // (docs/60: lean, where the one put to it is of the speaker's sex, "she herself": the skim readers read
    // the "she" as the other woman.)
    const self = lean() && pronOf(c, sp).he === pronOf(c, p).he && sp !== p ? (pronOf(c, sp).he === 'she' ? ' herself' : ' himself') : '';
    return `${nameOf(c, sp)} says ${pronOf(c, sp).he}${self} was at ${placeName(c, cl?.place ?? '')} at ${oclock(l.hour as Hour)}, ${comp.length ? `with ${andList(comp)}` : 'alone'}`;
  }
  if (l.kind === 'remark') return remarkSaid(c, l);
  if (l.kind === 'given' || l.kind === 'find') return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
  return l.text.replace(/\.$/, '');
}

/**
 * docs/62, P3: a breaking line said to the face of the one it's against, as a person says it, not as
 * the notebook has it: "Alfano saw Steinbach, Lanza and Pardo at Moe’s at ten, and not you", "Mrs.
 * Mulcahy says she was home at eleven, on her own, and you weren’t there", "Pickering passed you on
 * Second Avenue at ten", "Mrs. Cheatham says nobody was at the Delmonico rooms at nine, you included".
 */
export function breakToFace(c: BoardCase, l: Line, p: PersonId, asked: readonly string[] = []): string {
  const you = (t: string) => t.replace(new RegExp(`\\b(passed|had|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '$1 you');
  if (l.kind === 'list') {
    const lst = listOf(c, l.speaker as PersonId);
    const es = lst?.entries[l.hour as Hour] ?? [];
    const W = nameOf(c, l.speaker as PersonId);
    const at = placeName(c, l.place as PlaceId);
    const h = hourWord(l.hour as Hour);
    if (es.some((e) => 'person' in e && e.person === p)) return `${W} saw you at ${at} at ${h}`;
    const faceOf = (look: string) => c.people.find((x) => x.look === look && x.role === 'suspect' && asked.includes(`account:${x.id}`));
    const names = es.map((e) => ('person' in e ? nameOf(c, e.person) : 'other' in e ? shortOther(c.others?.find((o) => o.id === e.other)?.name ?? '') : `somebody ${e.look}`)).filter(Boolean);
    const faces = es.flatMap((e) => ('look' in e && faceOf(e.look) ? [`${e.look.replace(/^(in|with) an? /, 'the ')} was ${nameOf(c, faceOf(e.look)?.id ?? '')}’s`] : []));
    const tail = faces.length ? `. ${faces.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join('. ')}` : '';
    if (names.length === 0) return `${W} says nobody was at ${at} at ${h}, you included${tail}`;
    return `${W} saw ${andList(names)} at ${at} at ${h}, and not you${tail}`;
  }
  if (l.kind === 'claim') {
    const sp = l.speaker as PersonId;
    const cl = accountOf(c, sp)?.claims[l.hour as Hour];
    const comp = (cl?.company ?? []).filter((x) => x !== p).map((x) => nameOf(c, x));
    const mine = accountOf(c, p)?.claims[l.hour as Hour];
    const pr = pronOf(c, sp);
    const where = `${personOf(c, sp)?.home === cl?.place ? 'home' : `at ${placeName(c, cl?.place ?? '')}`} at ${hourWord(l.hour as Hour)}`;
    const company = comp.length ? `with ${andList(comp)}` : `on ${pr.his} own`;
    const tail = mine?.place === cl?.place ? ', and you weren’t there' : (mine?.company ?? []).includes(sp) ? ', and not with you' : '';
    return `${nameOf(c, sp)} says ${pr.he} was ${where}, ${company}${tail}`;
  }
  return you(breakSaid(c, l, p, asked)).replace(/ at (seven|eight|nine|ten|eleven|twelve) o’clock\b/g, ' at $1');
}

/**
 * docs/53, addendum: a watcher's hour as a person says it, never "Coffin had Ashby at": "Coffin saw
 * Ashby at the Thalia at eleven o’clock" (the person on it), "Coffin said nobody was at the Thalia at
 * eleven o’clock", "Coffin said only Feeney and Ashby were at the Thalia at eleven o’clock" (whole).
 * Read back by `reread.ts` (`breakerV`).
 */
export function listSaid(c: BoardCase, watcher: PersonId, onIt: PersonId | null, names: readonly string[], at: string, h: Hour, whole: boolean, faceTail = ''): string {
  const W = nameOf(c, watcher);
  if (onIt) return `${W} saw ${nameOf(c, onIt)} at ${at} at ${oclock(h)}`;
  if (names.length === 0) return `${W} said nobody was at ${at} at ${oclock(h)}`;
  return `${W} said ${whole ? 'only ' : ''}${andList(names)} ${names.length > 1 ? 'were' : 'was'} at ${at} at ${oclock(h)}${faceTail}`;
}

/**
 * docs/53, addendum: the hours that matter, said with why they matter, never "the hour that
 * mattered": "when the watch went", "when Carbone died", "when Fritz could have gone" (two hours).
 */
export function whyHours(c: BoardCase, hours: readonly number[]): string {
  const two = hours.length > 1;
  // (docs/62, P5, the designer's note 9: a poisoning's hour is the hour the dose went in, never "died":
  // "when Carbone could have been given the chloral".)
  if (isPoison(c)) return `when ${nameOf(c, c.crime.victim)} ${two ? 'could have been given' : 'was given'} the ${c.means.name.replace(/^(?:a|an|the) /, '')}`;
  if (isMurder(c)) return `when ${nameOf(c, c.crime.victim)} ${two ? 'could have died' : 'died'}`;
  return `when ${victimOf(c).short} ${two ? 'could have gone' : 'went'}`;
}

/**
 * docs/53, addendum: the way in, said as the thing it was, never "the way in": the key under the mat,
 * the parlor window that wouldn’t latch, the broken lock, the door left unlocked, the spare key; a
 * murder's, its means ("the chloral").
 */
export function wayWhat(c: BoardCase): string {
  if (isMurder(c)) return `the ${c.means.name.replace(/^(a|an|the) /, '')}`;
  const t = c.means.originText.replace(/^[^;]*; /, '').replace(/,? which .*$/, '');
  if (/^the spare key\b/.test(t)) return 'the spare key';
  return t.replace(/^the door, left unlocked for (.+)$/, 'the door left unlocked for $1').replace(/\bwon’t latch\b/, 'wouldn’t latch');
}

/** What knowing the way in was, after "knew" or "had known": "where the key was", "about the window", "that the door was left unlocked". */
export function wayKnown(c: BoardCase): string {
  const mode = c.setup?.means ?? '';
  if (isMurder(c)) return `where the ${c.means.name.replace(/^(a|an|the) /, '')} was kept`;
  if (/mat$/.test(mode)) return 'where the key was';
  if (/window$/.test(mode)) return 'about the window that wouldn’t latch';
  if (mode === 'broken-lock') return 'about the broken lock';
  if (mode === 'latch-key') return 'that the door was left unlocked';
  return 'where the spare key was';
}

/** The grid's word for the means column: "could have got the chloral", "knew where the key was". */
export function meansKnew(c: BoardCase): string {
  if (isMurder(c)) return `could have got the ${c.means.name.replace(/^(a|an|the) /, '')}`;
  if (/^spare/.test(c.setup?.means ?? '')) return 'could have got the spare key';
  return `knew ${wayKnown(c)}`;
}

/** A standing fact said once: "Mr. Prentiss telling the room about his key" is "Mr. Prentiss" in a later breath; "Lou the bookmaker in his back booth" is Lou. */
export function shortOther(name: string): string {
  return name
    // The watcher's "I didn't know", in the detective's mouth, is the detective's: say it plainly (Hard-boiled 8's #13).
    .replace(/ I didn’t know$/, ' nobody could put a name to')
    .replace(/, back to the room, I couldn’t swear who$/, ', back to the room')
    .replace(/ (telling|complaining) .*$/, '')
    .replace(/^(Lou|Pardo|Benny)\b.*$/, '$1')
    // docs/48: a fence from the neighbourhood is "Fishel the bookmaker" once, then Fishel.
    .replace(/^((?:Mrs\.|Miss|Dr\.) )?([A-Z][^\s,]+) the [a-z].*$/, '$1$2')
    .replace(/^a man called (\w+).*$/, '$1')
    .replace(/^a pawnbroker’s runner called (\w+).*$/, '$1');
}

/**
 * A remark that places somebody, said as the detective tells it to himself. The generator's
 * remarks are a closed few: the side remark ("Walking over to the Odessa at ten I passed Feldman
 * on Ludlow Street, going fast, no hat") and the neighbour who had the pet for an hour.
 */
export function remarkSaid(c: BoardCase, l: Line): string {
  const sp = l.speaker as PersonId;
  const m = /^Walking over to (.+?) at (\w+) I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on (.+?), (.+?)\.$/.exec(l.text.replace(/^[^:]+: “/, '').replace(/”$/, ''));
  // The remark's own words ("going fast, no hat") are its speaker's: the thought points at it, it doesn't say it again.
  if (m) return `${nameOf(c, sp)} passed ${m[3]} on ${m[4]} at ${m[2]}`;
  const k = /^I had (.+?) at my place at (\w+)/.exec(l.text.replace(/^[^:]+: “/, ''));
  if (k) return `${nameOf(c, sp)} had ${k[1]} at ${pronOf(c, sp).his} place at ${k[2]}`;
  return l.text.replace(/^[^:]+: /, '').replace(/[.”]+$/, '').replace(/^“/, '');
}

/** The place by name. (docs/53, the dial: never "here" for a place, even the one I'm standing in; `here` is kept for the callers.) */
export function where(c: BoardCase, pl: PlaceId, _here: PlaceId): string {
  return placeName(c, pl);
}

/** "at the Thalia" (docs/53: never "here"). */
export function atWhere(c: BoardCase, pl: PlaceId, _here: PlaceId): string {
  return `at ${placeName(c, pl)}`;
}

/** How the means was had, said of one person: "heard about the key", "been at Rafferty’s while the chloral was on the shelf". */
export function accessPhrase(c: BoardCase, yes: boolean, again = false, here?: PlaceId): string {
  const mode = c.setup?.means ?? '';
  const party = c.givens.lines?.find((g) => g.kind === 'party')?.vars;
  // docs/53, the dial: the place by name, even in the room itself (docs/47 C13's "here" retired).
  void here;
  const at = `at ${placeName(c, c.means.origin)}`;
  const inAt = `in at ${placeName(c, c.means.origin)}`;
  // `again`: the same fact a second time tonight, in other words (the elimination recaps it).
  if (isMurder(c)) {
    const m = c.means.name.replace(/^(a|an) /, '');
    if (again) return yes ? `could have had the ${m}` : `had no way to the ${m}`;
    // Plain speech, not the board read aloud ("while the laudanum was there", Poached 5's #27). The
    // no says the means and where it was kept, never "while it was there to take" (docs/49, Planner 2).
    return yes ? `had been ${at} earlier, when the ${m} was there for the taking` : `hadn’t been ${at} while the ${m} was ${keptAt(c)}`;
  }
  if (party) return yes ? (again ? `had been at the ${party.occasion} and knew ${wayKnown(c)}` : `was at the ${party.occasion}`) : again ? `never knew ${wayKnown(c)}` : `wasn’t at the ${party.occasion}`;
  if (/^told/.test(mode)) {
    const thing = mode === 'told-window' ? 'window' : 'key';
    if (again) return yes ? `had heard about the ${thing}` : `hadn’t heard about the ${thing} at all`;
    return yes ? `heard ${clientOf(c).short} tell the room about the ${thing}` : `never heard ${clientOf(c).short} tell the room`;
  }
  if (again) return yes ? `could have had the spare key` : `had no way to the spare key`;
  return yes ? `had been ${inAt} earlier, when the spare key was there for the taking` : `hadn’t been ${inAt} while the spare key was there to take`;
}

/**
 * Where tonight's means was kept, from its origin: "on the cellar shelf", "in the hall-stand drawer",
 * "in the medicine cupboard". "There to take" when the origin doesn't say.
 */
export function keptAt(c: BoardCase): string {
  const m = /\b(?:on|in|off|from)\s+(?:the|my|a)\s+((?:[\w’-]+\s+){0,2}?(shelf|shelves|drawer|cupboard|cabinet|case|darkroom|hook|nail|safe|desk|chest))\b/.exec(c.means.originText);
  if (!m) return 'there to take';
  return `${/^(?:shelf|shelves|hook|nail)$/.test(m[2] as string) ? 'on' : 'in'} the ${m[1]}`;
}
