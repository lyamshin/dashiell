/**
 * docs/48 §3: on a night cast from the neighbourhood, the prose draws on the
 * bible first.
 *
 * - A place's arrival, its props and habits, and its gags are the place's own
 *   (`content/neighbourhood/places.json`): the arrival by the hour of the night
 *   and the weather, a prop set up on the first visit, a gag paid off on a later
 *   one, and no gag more than twice a night.
 * - A person's looks, what they're found doing, how they open an account, how
 *   they deflect, refuse and own up, a watcher's way of counting and what they
 *   can see, and a suspect's reason in their own words, are the person's own
 *   (`people.json`).
 * - Manners are the bible's, and the walk between two places is the bible's
 *   minutes.
 *
 * The hour-by-hour account and the list stay the engine's, so every hour and
 * name is exact; the person's voice frames them. Everything here is offered to
 * the page's hand first (`Hand.world`), and the board's own card families fill
 * whatever the bible doesn't.
 */

import { worldBible } from '../../gen/board/world/index.js';
import { meansOfDetail } from '../../gen/board/world/means.js';
import { worldFences } from '../../gen/board/world/cast.js';
import * as K from '../../gen/board/content.js';
import { voiceHour, type Bible, type BiblePerson, type BiblePlace } from '../../gen/board/world/types.js';
import { minutesAfter } from './clock.js';
import { BOARD_CARDS, type BoardCard, type Hand, type WorldDeck } from './decks.js';
import { budgetCalls, personOf, placeOf, type BoardCase, type BoardDeal, type BoardRun, type PersonId, type PlaceId } from './model.js';
import type { Manner } from './tell.js';
import { hoursNamed } from './lint.js';
import { machineryIn } from './reader-lint.js';

export function bibleOf(c: Pick<BoardCase, 'world'>): Bible | undefined {
  if (!c.world) return undefined;
  try {
    return worldBible(c.world);
  } catch {
    return undefined;
  }
}

export function biblePlace(c: BoardCase, id: PlaceId): BiblePlace | undefined {
  const b = bibleOf(c);
  const w = placeOf(c, id)?.world;
  return b && w ? b.places.find((p) => p.id === w) : undefined;
}

export function biblePerson(c: BoardCase, id: PersonId): BiblePerson | undefined {
  const b = bibleOf(c);
  const w = personOf(c, id)?.world;
  return b && w ? b.people.find((p) => p.id === w) : undefined;
}

/** The person the prose calls `name` tonight. */
function byName(c: BoardCase, name: string | undefined): PersonId | undefined {
  if (!name) return undefined;
  // Hard-boiled's faces are named with their look: "Doyle, in a camel coat,".
  const n = name.split(',')[0]?.trim();
  return c.people.find((p) => p.short === n && !p.object)?.id;
}

export function worldManner(c: BoardCase, p: PersonId): Manner | undefined {
  return biblePerson(c, p)?.manner;
}

/** The bible's minutes on foot between two places of the night, when both are the bible's and not one building. */
export function worldMinutes(c: BoardCase, from: PlaceId, to: PlaceId): number | undefined {
  const a = biblePlace(c, from);
  const b = biblePlace(c, to);
  if (!a || !b || a.id === b.id) return undefined;
  return a.minutes[b.id];
}

/** The hour band of the night, for the bible's arrivals: before half past two, before five, after. */
export function bandOf(d: BoardDeal, run: Pick<BoardRun, 'used'>): 'early' | 'mid' | 'late' {
  const m = minutesAfter(run.used, budgetCalls(d));
  // The bible's bands are the detective's night: midnight to two, two to four, four to eight.
  return m < 120 ? 'early' : m < 240 ? 'mid' : 'late';
}

/** A line of the bible as a person says it: in curly quotes, once. */
export function spoken(line: string): string {
  const t = line.trim().replace(/^["“]|["”]$/g, '');
  return `“${t}”`;
}

/**
 * Words a voice line mustn't carry onto a page where they could say something the board doesn't:
 * hours (unless it's an hour's own line), places (but a watcher's own post), other people.
 */
function safeVoice(c: BoardCase, b: Bible, who: BiblePerson, line: string, o: { hours?: boolean; own?: Set<string> } = {}): boolean {
  const s = line.toLowerCase();
  const word = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}\\b`).test(s);
  if (!o.hours && /\b(seven|eight|nine|ten|eleven|twelve|midnight|o’clock|o'clock)\b/.test(s)) return false;
  for (const p of b.places) if (!o.own?.has(p.id) && word((p.name.split(',')[0] as string).toLowerCase().replace(/^the /, ''))) return false;
  for (const p of b.people) if (p !== who && (word(p.last.toLowerCase()) || word(p.first.toLowerCase()))) return false;
  for (const p of c.places) if (!(p.world && o.own?.has(p.world)) && word(p.short.toLowerCase().replace(/^the /, ''))) return false;
  return true;
}

/** Detail ids that are tonight's means, which has gone from its shelf by the time anybody looks. */
function tonightsMeans(c: BoardCase, bp: BiblePlace): Set<string> {
  const origin = placeOf(c, c.means.origin)?.world;
  if (origin !== bp.id || c.type !== 'murder') return new Set();
  const key = c.setup?.means ?? '';
  return new Set(
    bp.details
      .filter((d) => {
        const k = meansOfDetail(d);
        if (!k) return false;
        return key.startsWith('work:') ? (k === 'chloral' && c.means.kind === 'chloral') || (k === 'revolver' && c.means.kind === 'gun') || (k === 'cyanide' && c.means.kind === 'poison') : k === key;
      })
      .map((d) => d.id),
  );
}

/**
 * A bible line the page can carry as it is: it names no hour as a time (the reader lint holds every
 * hour a page names to a line that tells it, and the bible's "from seven till the last one’s in" isn't
 * one) unless the page tells every hour anyway, and none of the book's own machinery words.
 */
function clean(text: string, hours: readonly number[] = []): boolean {
  return hoursNamed(text).every((h) => hours.includes(h)) && machineryIn(text).length === 0;
}

/**
 * What somebody's doing here: the bible tags each line with where it happens, a place or "any".
 * In a back room, a line of the place's own only when it's about that room. In a building of flats
 * each flat is its own place, and a line about home is said only in their own.
 */
function doingHere(c: BoardCase, run: Pick<BoardRun, 'at'>, bp: BiblePerson): { text: string; i: number }[] {
  const here = biblePlace(c, run.at);
  const own = c.people.find((x) => x.world === bp.id)?.home === run.at;
  return bp.doing.flatMap((d, i) => {
    if (d.setting === 'any') return [{ text: d.text, i }];
    if (!here || d.setting !== here.id) return [];
    if (inHide(c, run.at)) return inThisRoom(c, run.at, d.text) ? [{ text: d.text, i }] : [];
    if (here.kind === 'home' && !here.watcher && !own) return [];
    return [{ text: d.text, i }];
  });
}

/**
 * A back room, a booth, a cellar inside somebody else's place: the bible's lines for the place are
 * about its front room, its counter and its watcher, none of which is where I'm standing.
 */
function inHide(c: BoardCase, at: PlaceId): boolean {
  return (placeOf(c, at)?.key ?? '').includes('#');
}

const HIDE_STOP = new Set(['behind', 'through', 'under', 'among', 'where', 'upstairs', 'below', 'above', 'there', 'their', 'which', 'every', 'about', 'other']);

/**
 * In a back room, a line of the place's own only when it's about that room: "The back booth, behind a
 * wall of flour sacks, where the bookmaker sits" in the back booth; "the smell of lilies coming down
 * from the undertaker’s" in the undertaker's cellar. Anywhere else, every line.
 */
function inThisRoom(c: BoardCase, at: PlaceId, text: string): boolean {
  const key = placeOf(c, at)?.key ?? '';
  const i = key.indexOf('#');
  if (i < 0) return true;
  const words = (key.slice(i + 1).toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 5 && !HIDE_STOP.has(w));
  const t = text.toLowerCase();
  return words.some((w) => new RegExp(`\\b${w}`).test(t));
}

/** What they were doing the last I saw of them: their own `doing`, as a page's last line. */
function payLine(x: string, female: boolean): string {
  return `${x.charAt(0).toUpperCase()}${x.slice(1).replace(/\.$/, '')}: that was the last I saw of ${female ? 'her' : 'him'}.`;
}

/** The last I saw of them, said already tonight (as `payOff` keeps it): then it isn't what they're doing later. */
function paidOff(spent: (id: string) => boolean, x: string, female: boolean): boolean {
  return spent(`pay:${payLine(x, female).slice(0, 40)}`);
}

/** Said of them now, it isn't the last I saw of them later: their `doing` line, off their pay lines. */
function spendDoing(c: BoardCase, run: BoardRun, bp: BiblePerson, i: number): void {
  const p = c.people.find((x) => x.world === bp.id)?.id;
  const t = p !== undefined ? run.traits?.[p] : undefined;
  const x = bp.doing[i]?.text;
  if (p === undefined || !t || x === undefined) return;
  const line = payLine(x, bp.gender === 'f');
  if (t.pay.includes(line)) run.traits = { ...run.traits, [p]: { ...t, pay: t.pay.filter((l) => l !== line) } };
}

/**
 * A line about a watcher the night doesn't have: the night's unwatched place is a back room or a
 * booth inside a place whose watcher isn't in the case, and the page there says nothing of them (the
 * barman counting his glasses), since nobody could ask them.
 */
function unseenWatcher(c: BoardCase, pl: BoardCase['places'][number] | undefined, text: string): boolean {
  const b = bibleOf(c);
  const bp = pl?.world ? b?.places.find((x) => x.id === pl.world) : undefined;
  if (!b || !bp?.watcher || c.people.some((p) => p.world === bp.watcher?.person)) return false;
  const w = b.people.find((p) => p.id === bp.watcher?.person);
  if (!w) return false;
  const job = w.job.replace(/^the /, '').split(/\s+/).pop() ?? '';
  const s = text.toLowerCase();
  // Their name, but not the place called after them ("Sokol’s").
  return [w.last, job, 'watcher'].some((x) => x && new RegExp(`\\b${x.toLowerCase()}\\b(?![’']s)`).test(s));
}

/** A finite verb in a clause: what makes a bible line a sentence and not a thing seen. */
const FINITE = /\b(is|are|was|were|has|have|had|gets|goes|comes|sits|sat|stands|stood|hangs|hung|knocks|knocked|says|said|keeps|kept|does|did|runs|ran|leans|smells|shakes|lies|lay|gives|holds|waits|turns|counts|looks|stays|opens|shuts|plays|sings|coos|swears|calls|waters|wears|reads|makes)\b/;

/** Is a bible line a thing seen ("A row of tin mailboxes in the hall…") rather than a sentence? */
function isPhrase(text: string): boolean {
  const t = text.trim();
  if (/^(There|It|He|She|They|I|We|You|Nobody|Everybody|Somebody|When|If|Once|After|Before)\b/.test(t)) return false;
  // The head of the line, before a comma or a clause of its own.
  const head = (t.split(/[,;]|\b(?:which|that|who|whom|where|so that|because|when|until)\b/)[0] ?? t).trim();
  // "A pencil mustache trimmed so thin it looks drawn on": a thing, with a clause hung on it late.
  if (/^(A|An)\b/.test(t)) return !FINITE.test(head.split(/\s+/).slice(0, 6).join(' '));
  return !FINITE.test(head);
}

/** The line's first letter put down, unless it starts with a name ("Parnell, a ginger cat"). */
function lowerFirst(t: string): string {
  return /^[A-Z][a-z’']+, (?:a|an|the)\b/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}

/**
 * A place's prop, habit or gag as a sentence on the page: "There was a row of tin mailboxes in the
 * hall…". The bible writes them as things seen; a line that's a sentence already stays as it is.
 */
export function detailSentence(text: string): string {
  const t = text.trim();
  if (!isPhrase(t)) return t;
  const head = (t.split(/[,;]|\s+(?:on|in|at|of|to|with|by|under|over|from|for|behind|beside|across|along|outside|inside|painted|hung|stood|kept|left|that|which|who|where)\s+/)[0] ?? t).trim();
  const last = head.split(/\s+/).pop() ?? '';
  const plural = !/^(A|An|One)\b/.test(head) && /[a-rt-z]s$/.test(last) && !/(ss|ous|us)$/.test(last);
  return `There ${plural ? 'were' : 'was'} ${lowerFirst(t)}`;
}

/** A look as a sentence about them: "She had a ring of keys at her belt…", "He was a square man in a cardigan…". */
export function lookSentence(text: string, female: boolean, name?: string): string {
  const t = text.trim();
  if (!isPhrase(t)) return t;
  const pr = name ?? (female ? 'She' : 'He');
  const body = lowerFirst(t);
  const was = /^(A|An)\b.{0,40}?\b(man|woman|girl|boy|fellow|figure|ruin)\b/.test(t) || /^(Pale|Thin|Tall|Short|Small|Old|Young|Stout|Lean)(?:,| under| in| and| with)\b/.test(t);
  return `${pr} ${was ? 'was' : 'had'} ${body}`;
}

/**
 * Two lines that see the same thing ("a wooden wedge holding the door", "the ashtrays not emptied"
 * and "ashtrays that are never emptied"): two content words running in both, or two of the longer
 * ones anywhere in both.
 */
export function echoes(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const words = (t: string): string[] => t.toLowerCase().match(/[a-z]+/g)?.filter((x) => x.length >= 4) ?? [];
  const pairs = (w: string[]): string[] => w.slice(1).map((x, i) => `${w[i]} ${x}`);
  const [wa, wb] = [words(a), words(b)];
  const seen = new Set(pairs(wa));
  if (pairs(wb).some((p) => seen.has(p))) return true;
  const long = (w: string[]) => new Set(w.filter((x) => x.length >= 5 && !ECHO_STOP.has(x)));
  const la = long(wa);
  return [...long(wb)].filter((x) => la.has(x)).length >= 2;
}

const ECHO_STOP = new Set(['there', 'their', 'which', 'where', 'every', 'night', 'about', 'other', 'after', 'before', 'still', 'nobody', 'somebody', 'anybody', 'never', 'always', 'would', 'could', 'should', 'these', 'those', 'being']);

/** "He was writing in a small book." from "writing in a small book"; a whole sentence stays as it is. */
function doingSentence(line: string): string {
  const t = line.trim().replace(/\.$/, '');
  if (/^[A-Z{]/.test(t)) return `${t}.`;
  return `{Name} was ${t}.`;
}

/**
 * The hand's world: for each draw, the bible's own lines that fit it, which the hand deals before
 * the board's families. Empty where the bible has nothing for that draw.
 */
export function worldDeck(d: BoardDeal, run: BoardRun): WorldDeck | undefined {
  const c = d.kase;
  const b = bibleOf(c);
  if (!b) return undefined;
  const band = bandOf(d, run);
  const here = biblePlace(c, run.at);
  const card = (id: string, family: string, text: string, extra: Partial<BoardCard> = {}): BoardCard => ({ id: `nb:${id}`, family, tags: {}, text, ...extra });
  const deck: WorldDeck = (family, want, slots) => {
    switch (family) {
      case 'arrive': {
        const pl = c.places.find((p) => p.key === want.key);
        // A back room inside somebody else's place: the room's own arrival, or the board's words for a
        // room with no name on it ("A gambling room doesn’t advertise" is the board's gambling room).
        if (pl && inHide(c, pl.id)) {
          const host = biblePlace(c, pl.id);
          const h = host?.hides.find((x) => x.name === (pl.key ?? '').split('#')[1]);
          if (host && h && clean(h.arrival) && !unseenWatcher(c, pl, h.arrival)) return [card(`${host.id}:hide:${host.hides.indexOf(h)}`, family, h.arrival)];
          return BOARD_CARDS.filter((x) => x.family === 'arrive' && x.tags.kind === 'unwatched' && !x.tags.key);
        }
        const bp = pl ? biblePlace(c, pl.id) : undefined;
        if (!bp) return [];
        const ok = bp.arrivals.filter((a) => clean(a.text) && !unseenWatcher(c, pl as BoardCase['places'][number], a.text));
        const fits = ok.filter((a) => a.band === band && (a.weather === 'any' || a.weather === run.weather));
        const near = fits.length ? fits : ok.filter((a) => a.band === band);
        const from = near.length ? near : ok;
        return from.map((a) => card(`${bp.id}:arrive:${bp.arrivals.indexOf(a)}`, family, a.text));
      }
      case 'prop': {
        if (!here) return [];
        const gone = tonightsMeans(c, here);
        const gags = here.details.filter((x) => x.kind === 'gag' && inThisRoom(c, run.at, x.text)).map((x) => x.text);
        return here.details
          .filter((x) => x.kind !== 'gag' && !gone.has(x.id) && clean(x.text) && !unseenWatcher(c, placeOf(c, run.at), x.text) && inThisRoom(c, run.at, x.text) && !echoes(slots.arrived, x.text))
          .map((x) => card(`${here.id}:${x.id}`, family, detailSentence(x.text), gags.length ? { exports: { prop: { text: x.text, short: x.id, pay: gags.map(detailSentence) } } } : {}));
      }
      case 'doing': {
        const p = byName(c, slots.name);
        const bp = p ? biblePerson(c, p) : undefined;
        if (!bp) return [];
        return doingHere(c, run, bp)
          .filter((x) => safeVoice(c, b, bp, x.text) && clean(x.text) && !paidOff((id) => run.spent.includes(id), x.text, bp.gender === 'f'))
          .map((x) => card(`${bp.id}:doing:${x.i}`, family, doingSentence(x.text)));
      }
      case 'watcher': {
        const p = byName(c, slots.name);
        const bp = p ? biblePerson(c, p) : undefined;
        const pl = bp ? b.places.find((x) => x.watcher?.person === bp.id) : undefined;
        // Somebody who keeps the unwatched place only when it mattered isn't a watcher of the bible's.
        if (bp && !pl && personOf(c, p as PersonId)?.id === 'ukeeper') return [card(`${bp.id}:keeper`, family, `{Name} had the room from the hour that mattered, and not before. Before that, {he} said, it was anybody’s.`)];
        if (!bp || !pl?.watcher || !clean(pl.watcher.sees)) return [];
        // How they count, in their own words, one of their three, unless it names an hour the page doesn't tell.
        const sees = `From {his} post {name} could see ${pl.watcher.sees.replace(/\.$/, '')}.`;
        const counts = pl.watcher.counts.flatMap((x, i) => (clean(x) ? [card(`${pl.id}:watcher:${i}`, family, `${sees} ${spoken(x)}`)] : []));
        return counts.length > 0 ? counts : [card(`${pl.id}:watcher`, family, sees)];
      }
      case 'motive': {
        // Their reason in their own words: the bible's line for the tie it runs through.
        const p = byName(c, slots.name);
        const says = p ? personOf(c, p)?.motiveSays : undefined;
        return p && says && clean(says) ? [card(`${personOf(c, p)?.world}:says`, family, spoken(says))] : [];
      }
      case 'reaction': {
        // How they deflect, asked about the dead man or the owner.
        if (want.job !== 'motive') return [];
        const p = byName(c, slots.name);
        const bp = p ? biblePerson(c, p) : undefined;
        if (!bp) return [];
        const says = p ? personOf(c, p)?.motiveSays : undefined;
        return bp.voice.deflect.filter((x) => x !== says && safeVoice(c, b, bp, x) && clean(x)).map((x, i) => card(`${bp.id}:deflect:${i}`, family, spoken(x)));
      }
      case 'refuse-words': {
        if (want.who !== 'any') return [];
        const p = byName(c, slots.name);
        const bp = p ? biblePerson(c, p) : undefined;
        if (!bp) return [];
        return bp.voice.refuse.filter((x) => clean(x)).map((x) => card(`${bp.id}:refuse:${bp.voice.refuse.indexOf(x)}`, family, attributed(x)));
      }
      case 'admit-words': {
        const p = byName(c, slots.name);
        const bp = p ? biblePerson(c, p) : undefined;
        if (!bp || bp.voice.ownUp.length === 0) return [];
        return bp.voice.ownUp.filter((x) => clean(x)).map((x, i) => card(`${bp.id}:ownup:${i}`, family, `“${x.trim().replace(/^[“"]|[”"]$/g, '')} I wasn’t at {claim}. I was at {truth}, with {witness}. Ask {wthem}.”`));
      }
      default:
        return [];
    }
  };
  deck.picked = (dealt) => {
    const m = /^nb:(.+):doing:(\d+)$/.exec(dealt.id);
    const bp = m ? b.people.find((x) => x.id === m[1]) : undefined;
    if (m && bp) spendDoing(c, run, bp, Number(m[2]));
  };
  return deck;
}

/** “That’s between me and the Sacred Heart,” {name} said. */
function attributed(line: string): string {
  const t = line.trim().replace(/^["“]|["”]$/g, '');
  if (/\.$/.test(t)) return `“${t.slice(0, -1)},” {name} said.`;
  if (/[!?]$/.test(t)) return `“${t}” {name} said.`;
  return `“${t},” {name} said.`;
}


/**
 * A first look at somebody: the bible's, for where they are now or anywhere. A look sets a trait
 * whose pay lines are their other looks, so a later page about them may close on one.
 */
export function worldLook(c: BoardCase, run: BoardRun, hand: Hand, p: PersonId): string | null | undefined {
  const bp = biblePerson(c, p);
  if (!bp) return undefined;
  const here = placeOf(c, run.at)?.world;
  const fits = bp.looks.filter((l) => (l.setting === 'any' || (l.setting === here && inThisRoom(c, run.at, l.text))) && clean(l.text));
  const unused = fits.filter((l) => !hand.used(`nb:${bp.id}:look:${bp.looks.indexOf(l)}`));
  // The page has just said what they were doing: a look of theirs here has them at it already
  // ("so still with his pipe" after "banging a pipe with a wrench"), so one from anywhere, if there is one.
  const busy = hand.spent.some((id) => id.startsWith(`nb:${bp.id}:doing:`));
  const anywhere = unused.filter((l) => l.setting === 'any');
  const fresh = busy && anywhere.length > 0 ? anywhere : unused;
  if (fresh.length === 0) return null;
  const l = fresh[hand.rng.int(fresh.length)] as (typeof fresh)[number];
  hand.note(`nb:${bp.id}:look:${bp.looks.indexOf(l)}`);
  // Looked at once a night. A later page about them may close on what they were doing the last I saw
  // (their own `doing`), which is how the board's callbacks land.
  const b = bibleOf(c);
  // Their `doing` here, or anywhere: a line for somewhere else isn't the last I saw of them.
  const female = bp.gender === 'f';
  const pay = b
    ? doingHere(c, run, bp).filter((x) => safeVoice(c, b, bp, x.text) && clean(x.text) && /^[a-z]/.test(x.text) && !hand.used(`nb:${bp.id}:doing:${x.i}`)).map((x) => payLine(x.text, female))
    : [];
  run.traits = { ...(run.traits ?? {}), [p]: { short: `${bp.last}’s look`, pay } };
  // "She had…" after a line about what she's doing; by name after a line about the room ("There were
  // sunflower-seed shells in the aisles… He had a right hand already out" was the shells' hand).
  return lookSentence(l.text, bp.gender === 'f', busy ? undefined : personOf(c, p)?.short);
}

/** One line of several, not said before tonight, noted as said. */
function fresh1(hand: Hand, xs: { l: string; id: string }[]): string | undefined {
  const fresh = xs.filter((x) => !hand.used(x.id));
  if (fresh.length === 0) return undefined;
  const x = fresh[hand.rng.int(fresh.length)] as { l: string; id: string };
  hand.note(x.id);
  return x.l.trim().replace(/^["“]|["”]$/g, '');
}

/** An hour's line of somebody's, for one of `hours`, in its own words. */
function hourLine(c: BoardCase, b: Bible, bp: BiblePerson, hand: Hand, hours: number[], licensed: readonly number[], own: Set<string> = new Set()): string | undefined {
  return fresh1(
    hand,
    Object.entries(bp.voice.hours)
      .filter(([h, l]) => hours.includes(voiceHour(h)) && safeVoice(c, b, bp, l, { hours: true, own }) && clean(l, licensed) && !/\b(left|leave|went|away|gone|stepped|asleep|bed|locked)\b/i.test(l))
      .map(([h, l]) => ({ l, id: `nb:${bp.id}:hour:${h}` })),
  );
}

/**
 * docs/48 §3: a person's own words around their account, which stays the engine's so every hour
 * and name is exact. They open it their way (an `ask` line that names no place, hour or person), and
 * frame it with their line for an hour of the evening, which the bible writes as a mood or a habit,
 * never a place or company. The hour is any of the evening's, never the one that matters by design.
 *
 * Planner 2: never an hour the account gives a reason for (`reasoned`): "At seven I went to the flats
 * over Lipsky’s to help write letters home… Seven, I add up the week" says two things of seven. The
 * page says it before the account or after it, never inside it.
 */
export function worldAccountVoice(c: BoardCase, hand: Hand, p: PersonId, reasoned: ReadonlySet<number> = new Set()): { open?: string; coda?: string; codaHour?: number } {
  const b = bibleOf(c);
  const bp = biblePerson(c, p);
  if (!b || !bp) return {};
  // An account page tells every hour of the evening, so an opener may name one ("From seven, then").
  const open = fresh1(hand, bp.voice.ask.map((l, i) => ({ l, id: `nb:${bp.id}:ask:${i}` })).filter((x) => safeVoice(c, b, bp, x.l, { hours: true }) && clean(x.l, c.board.hours)));
  const free = c.board.hours.filter((h) => !reasoned.has(h));
  const k = hand.rng.int(Math.max(1, free.length));
  const h = free[k];
  const coda = h === undefined ? undefined : hourLine(c, b, bp, hand, [h], c.board.hours);
  return { ...(open ? { open } : {}), ...(coda && h !== undefined ? { coda, codaHour: h } : {}) };
}

/**
 * docs/48 §3: a watcher's own words around their list. They open on their line for the first hour
 * they kept (they're at their post all night, so it may name the post), and say their last "nobody
 * else" their own way.
 */
export function worldListVoice(c: BoardCase, hand: Hand, watcher: PersonId, said: string[], hours: number[], remarks = 0): string[] {
  const b = bibleOf(c);
  const bp = biblePerson(c, watcher);
  if (!b || !bp || said.length === 0) return said;
  const post = b.places.find((x) => x.watcher?.person === bp.id || bp.works?.place === x.id);
  const own = new Set(post ? [post.id] : []);
  const open = hourLine(c, b, bp, hand, hours.slice(0, 1), hours, own);
  const out = [...said];
  // The last hour's "nobody else", said their way, before whatever they remark on after the list.
  const last = out.length - 1 - remarks;
  const line = out[last] ?? '';
  const theirs = /\bnobody else(?: at all|, that hour)?\.$/i.test(line)
    ? fresh1(hand, bp.voice.nobodyElse.map((l, i) => ({ l, id: `nb:${bp.id}:nobody:${i}` })).filter((x) => safeVoice(c, b, bp, x.l, { own }) && clean(x.l) && /\b(nobody|lot|everybody|all|no one)\b/i.test(x.l)))
    : undefined;
  if (theirs) out[last] = /\bNobody else(?: at all|, that hour)?\.$/.test(line) ? line.replace(/\bNobody else(?: at all|, that hour)?\.$/, theirs) : `${line} ${theirs}`;
  return open ? [open, ...out] : out;
}

/**
 * Staging from the bible: a habit or a prop of the place not dealt tonight, or something the person
 * is doing that hasn't been said. Said after where I sit down.
 */
export function worldStaging(c: BoardCase, run: BoardRun, hand: Hand, p: PersonId): string | undefined {
  const b = bibleOf(c);
  const here = biblePlace(c, run.at);
  const bp = biblePerson(c, p);
  if (!b) return undefined;
  const out: { text: string; id: string }[] = [];
  if (here) {
    const gone = tonightsMeans(c, here);
    for (const d of here.details) if (d.kind === 'habit' && !gone.has(d.id) && clean(d.text) && !unseenWatcher(c, placeOf(c, run.at), d.text) && inThisRoom(c, run.at, d.text)) out.push({ text: detailSentence(d.text), id: `nb:${here.id}:${d.id}` });
  }
  // What they're doing comes first: it's them I sit down with.
  const theirs: { text: string; id: string }[] = [];
  if (bp) {
    const name = personOf(c, p)?.short ?? bp.last;
    for (const x of doingHere(c, run, bp)) {
      if (!safeVoice(c, b, bp, x.text) || !clean(x.text) || paidOff((id) => hand.used(id), x.text, bp.gender === 'f')) continue;
      theirs.push({ text: doingSentence(x.text).replace('{Name}', name), id: `nb:${bp.id}:doing:${x.i}` });
    }
  }
  const mine = theirs.filter((x) => !hand.used(x.id) && !(hand.avoid && hand.avoid.test(x.text)));
  if (mine.length > 0 && hand.rng.int(10) < 7) {
    const x = mine[hand.rng.int(mine.length)] as { text: string; id: string };
    hand.note(x.id);
    spendDoing(c, run, bp as BiblePerson, Number(x.id.split(':').pop()));
    return x.text;
  }
  // A running gag belongs to its place, and lands at most twice a night: here once, and once more
  // as the place's callback (`prop`'s pay lines).
  const gags = here && hand.mayJoke ? here.details.filter((d) => d.kind === 'gag' && clean(d.text) && !unseenWatcher(c, placeOf(c, run.at), d.text) && inThisRoom(c, run.at, d.text)).map((d) => ({ text: detailSentence(d.text), id: `nb:${here.id}:${d.id}`, joke: true })) : [];
  const fresh = [...out, ...gags].filter((x) => !hand.used(x.id) && !(hand.avoid && hand.avoid.test(x.text)));
  if (fresh.length === 0) return undefined;
  const x = fresh[hand.rng.int(fresh.length)] as { text: string; id: string; joke?: boolean };
  hand.note(x.id);
  if (x.joke) hand.joke();
  return x.text;
}

/** docs/48 §1: what the dead man was found with, as the bible has it: "He had a fresh deck in his breast pocket…". */
export function worldFoundWith(c: BoardCase): string | undefined {
  const bp = biblePerson(c, c.crime.victim);
  if (!bp || !clean(bp.asVictim.foundWith)) return undefined;
  const t = bp.asVictim.foundWith.trim().replace(/\.$/, '');
  return `${bp.gender === 'f' ? 'She' : 'He'} had ${lowerFirst(t)}.`;
}

/**
 * docs/48 §4: how much of a stretch of prose is the bible's own words: the characters of it that
 * fall inside an arrival, a detail, a look, something somebody's doing, a watcher's counting or what
 * they can see, or a line of anybody's voice, as the bible wrote it. Fragments under a dozen
 * characters don't count.
 */
export function bibleShare(b: Bible, text: string): { bible: number; total: number } {
  // The bible's things seen are said as sentences on the page ("There was a…"): case doesn't count.
  const norm = (s: string) => s.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const t = norm(text);
  if (!t) return { bible: 0, total: 0 };
  const frags = bibleFragments(b);
  const covered = new Uint8Array(t.length);
  for (const f of frags) {
    let at = t.indexOf(f);
    while (at >= 0) {
      covered.fill(1, at, at + f.length);
      at = t.indexOf(f, at + 1);
    }
  }
  let n = 0;
  for (const x of covered) n += x;
  return { bible: n, total: t.length };
}

const FRAGMENTS = new WeakMap<Bible, string[]>();
function bibleFragments(b: Bible): string[] {
  const hit = FRAGMENTS.get(b);
  if (hit) return hit;
  const out: string[] = [];
  const add = (s: string) => {
    for (const part of s.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '').split(/(?<=[.!?])\s+/)) {
      const p = part.replace(/\.$/, '').toLowerCase();
      if (p.length >= 12) out.push(p);
    }
  };
  for (const p of b.places) {
    for (const a of p.arrivals) add(a.text);
    for (const d of p.details) add(d.text);
    for (const h of p.hides) add(h.arrival);
    if (p.watcher) {
      for (const l of p.watcher.counts) add(l);
      add(p.watcher.sees);
    }
  }
  for (const p of b.people) {
    for (const l of p.looks) add(l.text);
    for (const d of p.doing) add(d.text);
    add(p.asVictim.foundWith);
    for (const lines of [p.voice.ask, p.voice.deflect, p.voice.nobodyElse, p.voice.refuse, p.voice.ownUp, Object.values(p.voice.hours)]) for (const l of lines) add(l);
  }
  out.sort((x, y) => y.length - x.length);
  FRAGMENTS.set(b, out);
  return out;
}

/**
 * Who a lost thing could be with, as the report offers it: the pools' three on a dealt night; on a
 * night from a world, the fence fixed to each of its night places.
 */
export function holdersOf(c: BoardCase): { id: string; who: string; listed: string }[] {
  const b = bibleOf(c);
  return b ? worldFences(b) : K.HOLDERS;
}
