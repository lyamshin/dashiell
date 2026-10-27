/**
 * docs/43 §4: the grid is the board.
 *
 * Rows are the suspects the player knows of, then company-only witnesses once
 * met; columns are the hours, and one column is "could get the means". Each
 * cell shows what the player holds: what they say themselves, what somebody
 * else saw, a collision where those disagree (both lines on hover or tap),
 * and the player's own pencil. The crime hour is marked once known (Raw and Coddled; from Poached up the office's hours, round 9). Every
 * mark is read off the held lines and the solver on them, never the truth.
 */

import type { CellMark } from './types.js';
import { linesHeld, lineShown, accountOf, agreesWith, collisionsOf, solveRun, knownPeople, knownPlaces, faceUnmatched, listOf, meansLate, secondBreakers } from './knowledge.js';
import { cap, clientOf, hourWord, isMurder, nameOf, personOf, placeName, sumsSaid, suspectsOf, type BoardCase, type BoardRun, type Hour, type PersonId, type PlaceId } from './model.js';
import { isPoison } from './when.js';
import { sourceName } from './stars.js';
import { meansKnew } from './bones/phrase.js';

export interface BoardCell {
  /** Their own account's place at this hour. */
  says?: PlaceId;
  /** Where somebody else's word puts them: the place and whose word. */
  seen?: { place: PlaceId; by: string };
  /** Their own word agrees with somebody else's. */
  confirmed: boolean;
  /** Their own word and somebody else's disagree. */
  collision: boolean;
  /** A second story told when it was put to them, or what they owned up to. */
  second?: PlaceId;
  admitted?: PlaceId;
  /**
   * Round 8, B9: the second story clashes too: a keeper's list held for that place and hour, everybody
   * there and not them. The grid and the notebook stopped at "changed the answer" (Medium 37's Ashby,
   * "the Orpheum" after the put, never marked against Alfano's list).
   */
  secondClash?: boolean;
  /** The lines behind the cell, for the hover or tap. */
  lines: string[];
  pencil?: CellMark;
}

export interface BoardRow {
  id: PersonId;
  name: string;
  company: boolean;
  /** docs/47 A5: the dead man's row, or the lost pet's: where somebody's word puts them, hour by hour. */
  victim?: boolean;
  cells: Record<number, BoardCell>;
  /** Could get the means: yes, no, or not known yet. Empty on the victim's row. */
  means: 'yes' | 'no' | '?' | '';
  meansWhy?: string;
}

export interface BoardGrid {
  hours: Hour[];
  rows: BoardRow[];
  /** The crime hour, once the player can know it. */
  crimeHour: Hour | null;
  /** The hours it could still have been. From Poached up, the office's hours, never narrowed (round 9). */
  window: Hour[];
  /** Round 9, item 1: from Poached up, whose hours the marked ones are ("Lefkowitz"); null where the grid narrows them. */
  givenBy: string | null;
  /** A short label for every place the grid names, and the key to them. */
  codes: Record<PlaceId, string>;
  meansLabel: string;
}

/** A title before a name, never a label of its own ("Dr." and "Miss" were codes, round 7). */
const TITLE = /^(?:mrs\.|mr\.|miss|dr\.)$/i;
/** The kind of place a name ends on: said after a common word ("card room"), never alone. */
const KIND = new Set(['room', 'rooms', 'flat', 'place', 'shop', 'house', 'booth', 'cellar', 'yard', 'stair', 'surgery', 'studio']);

/**
 * Short labels, unique within the case: "Odessa", "Rafferty’s", "Sokol’s". Round 6, U3: a label is a
 * whole word ("Delmonico", "Thorndike’s", "Fairbanks’s"), never cut at eight letters ("Delmonic" read
 * as a bug to three testers). Round 7, U2: and a word a player would use. A place called after
 * somebody is their name with its "’s" ("Quill’s" for the scene at Quill’s place, never "scene";
 * "Hirsch’s", never "Dr."); a named place is its name ("Delmonico", "Blue Lantern", "Kit Kat", never
 * "Blue" or "Kit"); a common one says what kind of place it is ("card room", "chop house", "back
 * room", never "cards", "chop" or "at"). A lost thing's flat is "flat" ("Thorndike" alone, in
 * Thorndike's own row, read as the person).
 */
export function placeCodes(c: BoardCase): Record<PlaceId, string> {
  const out: Record<PlaceId, string> = {};
  const used = new Set<string>();
  for (const p of c.places) {
    // (The part before " at " is the place: "the back room at Wexler’s" is the back room.)
    const words = p.short.replace(/ at .*$/, '').split(/\s+/).filter((w) => w.length > 0 && w.toLowerCase() !== 'the' && !TITLE.test(w));
    const [w0 = p.short, w1] = words;
    let code: string;
    let longer: string | undefined;
    if (p.scene && !isMurder(c)) code = 'flat';
    else if (/exchange/.test(p.short)) code = 'exchange';
    else if (/night desk/.test(p.short)) code = 'Graphic';
    else if (/club office/.test(p.short)) code = 'Eagle';
    else if (/[’']s$/.test(w0)) {
      code = w0;
      if (w1) longer = `${w0} ${w1}`;
    } else if (/^[A-Z]/.test(w0)) code = w1 && /^[A-Z]/.test(w1) ? `${w0} ${w1}` : w0;
    else code = w1 && KIND.has(w1.toLowerCase()) ? `${w0} ${w1}` : w0;
    // (Two places called after one person: the second says which, "Hirsch’s surgery".)
    let k = used.has(code) && longer && !used.has(longer) ? longer : code;
    for (let i = 2; used.has(k); i++) k = `${code}${i}`;
    used.add(k);
    out[p.id] = k;
  }
  return out;
}

/**
 * Round 7, U2: the grid's places, said where a label isn't the place's own name ("Places: Moe’s =
 * Moe’s", "scene = Quill’s place" and "cards = the card room" read as a database): "In the grid,
 * Sokol’s is Sokol’s back room and Eagle is the Eagle club office." A label that is the name, or the
 * name with "the", a title or the kind of place ("Delmonico", the Delmonico rooms; "Nagy’s", Mrs.
 * Nagy’s; "Quill’s", Quill’s place), goes without saying. Null when every one does.
 */
export function placesKey(c: BoardCase, run: Pick<BoardRun, 'asked' | 'visited'>, codes: Record<PlaceId, string> = placeCodes(c), shown?: ReadonlySet<PlaceId>): string | null {
  const known = knownPlaces(c, run);
  const plain = (s: string) => s.replace(/^the /i, '').split(/\s+/).filter((w) => !TITLE.test(w)).join(' ').toLowerCase();
  // (clarity-5b, item 7: `shown`, only the labels the grid's cells show: at Mrs. Nagy's, "In the grid, Sokol’s
  // is Sokol’s back room." came before any cell said Sokol's.)
  const said = Object.entries(codes)
    .filter(([id]) => (shown ? shown.has(id) : known.has(id) || id === c.crime.scene))
    .filter(([id, code]) => {
      const name = plain(placeName(c, id));
      const k = code.toLowerCase();
      return !(name === k || (name.startsWith(`${k} `) && KIND.has(name.slice(k.length + 1))));
    })
    .map(([id, code]) => `${code} is ${placeName(c, id)}`);
  if (said.length === 0) return null;
  return `In the grid, ${said.length > 1 ? `${said.slice(0, -1).join(', ')} and ${said[said.length - 1]}` : said[0]}.`;
}

export function boardGrid(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'> & Partial<Pick<BoardRun, 'log'>>): BoardGrid {
  const s = solveRun(c, run);
  const hours = c.board.hours;
  const known = knownPeople(c, run);
  const lines = linesHeld(c, run);
  const codes = placeCodes(c);
  // docs/47 A5: the dead man, or the lost pet, has a row of his own: where somebody's word put him.
  const victim = personOf(c, c.crime.victim);
  const victimRow = isMurder(c) || c.type === 'lost-pet';
  const ids = [
    ...(victimRow && victim ? [victim.id] : []),
    ...suspectsOf(c).filter((p) => known.has(p)),
    ...c.people.filter((p) => p.role === 'company' && known.has(p.id)).map((p) => p.id),
  ];
  const placed = s.placed;
  // (Round 7, B3: what each clash rests on, its breakers, as the collision has them.)
  const clashes = collisionsOf(c, run, undefined, { all: true });
  /** A held line from somebody else that puts them at that place at that hour: a second source. */
  const support = (id: PersonId, h: Hour, place: PlaceId) => lines.find((l) => l.hour === h && l.place === place && l.speaker !== id && l.about.includes(id) && l.kind !== 'find');
  const rows: BoardRow[] = ids.map((id) => {
    const cells: Record<number, BoardCell> = {};
    const acc = run.asked.includes(`account:${id}`) ? accountOf(c, id) : undefined;
    for (const h of hours) {
      const k = `${id}@${h}`;
      const cell: BoardCell = { confirmed: false, collision: false, lines: [] };
      const says = acc?.claims[h]?.place;
      if (says) cell.says = says;
      const p = placed.get(k);
      const others = p ? p.deps.filter((d) => d !== `account:${id}`) : [];
      // Seen only on somebody else's held word for that place and hour, never on the solver's say alone,
      // so ✓ means two sources agree (docs/47 A5). Round 6, U3: the client's word is somebody else's
      // too: a guest the office put at the party is seen there ("·" read as nobody had placed them).
      const by = p && (others.length > 0 || p.deps.length === 0) ? support(id, h, p.place) : undefined;
      if (p && by) cell.seen = { place: p.place, by: sourceName(c, by.q) };
      const st = s.status.get(k);
      // docs/65 §3: a clash that rests on a face not yet matched to a name is the player's to find.
      if (st?.s === 'broken' && !faceUnmatched(c, run, id, h)) cell.collision = true;
      else if (says && cell.seen && cell.seen.place === says) cell.confirmed = true;
      // Admissions and second stories, once put.
      const k2 = c.confrontations.find((x) => x.person === id && x.hour === h);
      if (k2 && run.asked.includes(`confront:${id}@${h}`)) {
        const lie = c.lies.find((l) => l.person === id && l.hour === h);
        if (k2.response === 'admit' && lie) cell.admitted = lie.truth;
        if (k2.secondLie?.place) cell.second = k2.secondLie.place;
      }
      // (Round 8, B9: and where a list held says the second story wasn't so either, it clashes too.)
      const second = cell.second && !cell.admitted ? secondBreakers(c, run, id, h, lines) : [];
      if (second.length > 0) cell.secondClash = true;
      // The lines behind it.
      // (Round 7, B3: under a clash, what it clashes with: their own word, what broke it, and what came
      // of it; never a line that only says what they said, as a pair's partner does. Where the break
      // rests on a face, the player's own mark that put a name to it, too.)
      const col = cell.collision ? clashes.find((x) => x.person === id && x.hour === h) : undefined;
      for (const l of lines) {
        if (l.hour !== h) continue;
        if (col && l.speaker !== id && agreesWith(c, id, h as Hour, l) && !col.breakers.some((b) => b.id === l.id && !agreesWith(c, id, h as Hour, b))) continue;
        if (l.kind === 'claim' && l.speaker === id) cell.lines.push(lineShown(c, run, l));
        else if (l.about.includes(id) || (cell.says && l.place === cell.says && (l.kind === 'list' || l.kind === 'claim'))) cell.lines.push(lineShown(c, run, l));
      }
      if (col) {
        // (What touches the claim, them or the place they named, or a face that was theirs to match: not
        // every line of the answer the break rests on, a passer-by's own evening beside her remark.)
        const faceOf = (b: (typeof col.breakers)[number]) => b.kind === 'list' && (listOf(c, b.speaker as PersonId)?.entries[h as Hour] ?? []).some((e) => 'look' in e);
        const breaking = col.breakers.filter((b) => !agreesWith(c, id, h as Hour, b) && (b.about.includes(id) || b.place === col.claim.place || faceOf(b)));
        const at = cell.lines.findIndex((t) => t === lineShown(c, run, col.claim)) + 1;
        const extra = breaking.map((b) => lineShown(c, run, b)).filter((t) => !cell.lines.includes(t));
        cell.lines.splice(at, 0, ...extra);
        for (const b of breaking) {
          const looks = b.kind === 'list' ? (listOf(c, b.speaker as PersonId)?.entries[h as Hour] ?? []).flatMap((e) => ('look' in e ? [e.look] : [])) : [];
          if (looks.length === 0 || b.place === undefined) continue;
          for (const q of c.people) {
            const m = run.marks[q.id]?.[String(h)];
            if (m?.at === b.place) cell.lines.push(`Your guess: ${nameOf(c, q.id)} at ${placeName(c, b.place)} at ${hourWord(h as Hour)}.`);
          }
        }
      }
      // (Round 8, B9: under the second story, what says it wasn't so either.)
      for (const b of second) {
        const t = lineShown(c, run, b);
        if (!cell.lines.includes(t)) cell.lines.push(t);
      }
      if (run.marks[id]?.[String(h)]) cell.pencil = run.marks[id]?.[String(h)];
      cells[h] = cell;
    }
    // The means: the same for everybody on the grid who could have had it, a lodger or a regular as
    // much as a suspect (docs/47 A5). The victim's row has none.
    let means: BoardRow['means'] = id === c.crime.victim ? '' : '?';
    let meansWhy: string | undefined;
    if (id !== c.crime.victim) {
      const yes = c.givens.access.includes(id) || c.means.available.some((h) => placed.get(`${id}@${h}`)?.place === c.means.origin);
      const no = !c.givens.access.includes(id) && c.means.available.every((h) => {
        const x = placed.get(`${id}@${h}`);
        return (x && x.place !== c.means.origin) || s.notPlaced.get(`${id}@${h}`)?.has(c.means.origin);
      });
      const meansKnown = run.asked.some((q) => q.startsWith('search:') && c.finds.find((f) => `search:${f.id}` === q)?.gives.means) || !isMurder(c);
      if (meansKnown && yes) {
        means = 'yes';
        meansWhy = `${nameOf(c, id)} was at ${placeName(c, c.means.origin)} while it was there.`;
      } else if (meansKnown && no) {
        means = 'no';
        // (Round 7, B6: there, but only once it had to be gone, says so.)
        const late = meansLate(c, run, id);
        meansWhy = late !== undefined ? `${nameOf(c, id)} didn’t come to ${placeName(c, c.means.origin)} till ${hourWord(late)}, too late for it.` : `${nameOf(c, id)} was never at ${placeName(c, c.means.origin)} while it was there.`;
      }
    }
    const isVictim = id === c.crime.victim;
    return { id, name: isVictim && isMurder(c) ? `${nameOf(c, id)} †` : nameOf(c, id), company: personOf(c, id)?.role === 'company', ...(isVictim ? { victim: true } : {}), cells, means, ...(meansWhy ? { meansWhy } : {}) };
  });
  // docs/46 §2 marked the hours the office gave and left the narrowing to the player. docs/47 A5: the
  // victim's row shows the sighting, so the grid narrows with it: an hour the victim's row puts him
  // somewhere other than the scene is no longer one it could have been. The thought still stops at the link.
  const office = c.givens.window ?? c.crime.window;
  const vrow = rows.find((r) => r.victim);
  const away = (h: Hour) => {
    const seen = vrow?.cells[h]?.seen;
    return !!seen && seen.place !== c.crime.scene;
  };
  // Round 9, item 1: from Poached up (docs/72's `sumsSaid`), the grid marks the office's hours and never
  // narrows them: which one it was is the player's sum, as the narration leaves it (HB 39's "ten !" on the
  // first look at the grid, before anything had settled it). Raw and Coddled keep the narrowing.
  const narrows = sumsSaid(c);
  const window = !narrows ? [...office] : c.tier === 0 ? [...s.possibleHours] : office.filter((h) => !away(h)).length > 0 ? office.filter((h) => !away(h)) : [...office];
  const client = clientOf(c).short;
  return {
    hours,
    rows,
    crimeHour: narrows && window.length === 1 ? (window[0] as Hour) : null,
    window,
    givenBy: narrows ? null : client,
    codes,
    // (Case 2312, the owner's ruling: never the weapon's name, "carving knife?" from midnight answered
    // the report's How. Round 9, item 2: a poisoning's is "the poison": "Could they get the weapon?" was
    // asked of a medicine bottle.)
    meansLabel: isMurder(c) ? (isPoison(c) ? 'could have got the poison' : 'could have got the weapon') : meansKnew(c),
  };
}

/* ------------------------------------------------------------------ *
 * As text, for the play CLI and the read tool.
 * ------------------------------------------------------------------ */

/**
 * One cell in a few characters: `"Odessa"✓`, `"Odessa"✗`, `[Sokol]`, `~Odessa` (pencil). Round 6, U3:
 * their own word is in quotes wherever it's shown, so a ✓ (somebody saw them there too) and a ✗
 * (what somebody saw doesn't match) mark the same quotes, and `[X]` alone is somebody else's word.
 */
export function cellText(g: BoardGrid, cell: BoardCell): string {
  const code = (p: PlaceId) => g.codes[p] ?? p;
  // docs/47 A5: the pencil shows beside whatever else the cell holds, never under it.
  const pencil = cell.pencil?.at ? `~${code(cell.pencil.at)}` : cell.pencil?.notAt?.length ? `~not ${code(cell.pencil.notAt[0] as string)}` : '';
  let base = '';
  if (cell.collision) {
    const tail = cell.admitted ? `→${code(cell.admitted)}` : cell.second ? `→"${code(cell.second)}"${cell.secondClash ? '✗' : ''}` : '';
    base = `"${code(cell.says ?? '')}"✗${tail}`;
  } else if (cell.confirmed && cell.says) base = `"${code(cell.says)}"✓`;
  else if (cell.seen) base = `[${code(cell.seen.place)}]`;
  else if (cell.says) base = `"${code(cell.says)}"`;
  if (base && pencil) return `${base} ${pencil}`;
  return base || pencil || '·';
}

/**
 * clarity-5b, item 7: the places the grid's cells show, as `cellText` says them, for the key's labels.
 * `arrows`: and what they admitted or said the second time, after "→" (the CLI's; the book's cells leave it).
 */
export function shownPlaces(g: BoardGrid, arrows = true): Set<PlaceId> {
  const out = new Set<PlaceId>();
  for (const r of g.rows) {
    for (const h of g.hours) {
      const cell = r.cells[h];
      if (!cell) continue;
      if (cell.pencil?.at) out.add(cell.pencil.at);
      else if (cell.pencil?.notAt?.length) out.add(cell.pencil.notAt[0] as PlaceId);
      if (cell.collision) {
        if (cell.says) out.add(cell.says);
        if (arrows && cell.admitted) out.add(cell.admitted);
        else if (arrows && cell.second) out.add(cell.second);
      } else if (cell.confirmed && cell.says) out.add(cell.says);
      else if (cell.seen) out.add(cell.seen.place);
      else if (cell.says) out.add(cell.says);
    }
  }
  return out;
}

/**
 * Round 9, item 2: why the last column says "no", in the grid itself, the CLI's and the book's: "Why
 * “no”: Broadnax didn’t come to Mrs. Nagy’s till nine, too late for it." Medium 37's "Broadnax: no" from
 * the first look, with nothing on the page saying why, read as a leak. Null when nobody's is a no.
 */
export function meansReasons(g: BoardGrid): string | null {
  const why = g.rows.filter((r) => r.means === 'no' && r.meansWhy).map((r) => r.meansWhy as string);
  return why.length ? `Why “no”: ${why.join(' ')}` : null;
}

/**
 * docs/64: the last column, asked as a question: "Could they get the weapon?" ("the poison" on a poisoning, round 9), and a small case's
 * own means, "Could they get the spare key?", "Did they know where the key was?".
 */
export function meansAsked(label: string): string {
  const got = /^could have got (.+)$/.exec(label);
  if (got) return `Could they get ${got[1]}?`;
  const knew = /^knew (?:that )?(.+)$/.exec(label);
  return knew ? `Did they know ${knew[1]}?` : `${label.charAt(0).toUpperCase()}${label.slice(1)}?`;
}

/**
 * docs/64: the grid's key, cut to what matters (what they say, who saw them, where the two clash), and
 * the rest only when the grid shows it: both saying so, owning up, your own guess. Round 6, U3: "X✓
 * both say so" (both who?) says who: they, and somebody who saw them; an owning up and a second
 * story are each said for what they are.
 */
/**
 * docs/66 (docs/65's Hard-boiled faces): at Hard-boiled a clash that needs a face matched to a name
 * waits for the player's own mark. How to make one, as a rule about the grid, never about tonight.
 */
export const FACE_MARK = 'When somebody saw only a coat or a hat, mark on the grid who you think it was, and the grid will show who that leaves out.';

/**
 * Round 7, U4: the mark teach is said once a night, where it's needed: on the page that brings the
 * night's first sighting of only a coat or a hat ("somebody in a fur collar"), and on the grid while
 * that page is the one open. It printed under every grid, five times a night, and once on page one,
 * before any coat had been seen. The page's index, or -1 before one.
 */
export function faceMarkPage(c: BoardCase, run: Pick<BoardRun, 'log'>): number {
  return run.log.findIndex((p) => {
    const q = p.board?.q ?? '';
    if (!q.startsWith('list:')) return false;
    const l = listOf(c, q.slice('list:'.length) as PersonId);
    return !!l && Object.values(l.entries).some((es) => (es ?? []).some((e) => 'look' in e));
  });
}

/** Round 7, U4: whether the mark teach is due now: Hard-boiled, on the page of the night's first coat. */
export function faceMarkDue(c: BoardCase, run: Pick<BoardRun, 'log'>): boolean {
  if (c.tier !== 5) return false;
  const i = faceMarkPage(c, run);
  return i >= 0 && i === run.log.length - 1;
}

export function gridKey(g: BoardGrid): string[] {
  const cells = g.rows.flatMap((r) => g.hours.map((h) => r.cells[h] as BoardCell));
  const out = ['"X" they say so', '[X] somebody saw them there', '"X"✗ where they clash'];
  if (cells.some((x) => x.confirmed)) out.push('"X"✓ they say so, and somebody saw them there');
  if (cells.some((x) => x.admitted)) out.push('→Y where they admitted they were');
  if (cells.some((x) => x.second && !x.admitted)) out.push('→"Y" what they said the second time');
  // (Round 8, B9.)
  if (cells.some((x) => x.secondClash)) out.push('→"Y"✗ where that clashes too');
  if (cells.some((x) => x.pencil)) out.push('~X your own guess');
  return out;
}

export function boardGridText(c: BoardCase, run: Pick<BoardRun, 'asked' | 'puts' | 'visited' | 'marks'> & Partial<Pick<BoardRun, 'log'>>): string {
  const g = boardGrid(c, run);
  const out: string[] = [];
  out.push('WHERE THEY WERE');
  if (g.rows.length === 0) {
    out.push('', 'Nobody on it yet.');
    return out.join('\n');
  }
  const w0 = Math.max(6, ...g.rows.map((r) => r.name.length)) + 2;
  const cells = g.rows.flatMap((r) => g.hours.map((h) => cellText(g, r.cells[h] as BoardCell)));
  const cw = Math.max(9, ...cells.map((x) => x.length + 2));
  const head = g.hours.map((h) => `${hourWord(h)}${g.crimeHour === h ? ' !' : g.window.includes(h) && g.crimeHour === null ? ' ?' : ''}`.padEnd(cw)).join('');
  out.push(`${''.padEnd(w0)}${head}${meansAsked(g.meansLabel)}`);
  for (const r of g.rows) {
    out.push(`${r.name.padEnd(w0)}${g.hours.map((h) => cellText(g, r.cells[h] as BoardCell).padEnd(cw)).join('')}${r.means}`);
  }
  out.push('');
  out.push(gridKey(g).join('  ·  '));
  out.push(g.crimeHour !== null ? '! the hour it happened' : g.givenBy ? `? the ${g.window.length > 1 ? 'hours' : 'hour'} ${g.givenBy} gave` : '? the hours it could have been');
  // (Round 9, item 2: a "no" in the last column says why, in the grid itself: "Broadnax: no" from the
  // first look read as a leak.)
  const why = meansReasons(g);
  if (why) out.push(why);
  // (docs/66: at Hard-boiled, how a face's clash shows: the player's mark.)
  // (Round 7, U4: once a night, on the page of the first coat.)
  if (faceMarkDue(c, { log: run.log ?? [] })) out.push(`${FACE_MARK} (mark "<Name> <hour> at <place>")`);
  // docs/47 B8: the key names only the places the night has named; round 7, U2: and only where the
  // label isn't the place's own name.
  const places = placesKey(c, run, g.codes, shownPlaces(g));
  if (places) out.push(places);
  const coll = g.rows.flatMap((r) => g.hours.filter((h) => r.cells[h]?.collision).map((h) => ({ r, h })));
  if (coll.length > 0) {
    out.push('');
    out.push('WHERE THEY CLASH');
    for (const { r, h } of coll) {
      out.push(`${r.name}, ${hourWord(h)}:`);
      for (const l of r.cells[h]?.lines ?? []) out.push(`  ${l}`);
    }
  }
  return out.join('\n');
}

export { cap };
