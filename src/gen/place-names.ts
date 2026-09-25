import type { Id, Place, PlaceNames, PlaceSense } from './types.js';
import { PLACE_TEMPLATES } from './data/places.js';
import { Rng } from './rng.js';
import namesJson from '../../content/places/names.json';
import streetsJson from '../../content/places/streets.json';

/**
 * Place names (content/places/rules.md). The designer: "'benches' is not
 * sufficiently colorful and should have some level of description tied to
 * it." Every place in a tiered case gets one name set: a concrete identity
 * ("the benches by the dry fountain in Stuyvesant Square") with a proper form
 * for the first mention in a night, the forms people say, a label for the
 * grid, a few epithets and the senses the place is strongest in.
 *
 * Drawn on a stream of its own, after the cast, so no draw of the case moves:
 * the names are words on a case that is otherwise the case it was. The
 * untiered case is not named at all and keeps the deck's short names.
 */

interface NameSet {
  id: string;
  proper: string;
  local: string[];
  short: string;
  epithets: string[];
  sense: PlaceSense[];
  fits?: string[];
  keeping?: boolean;
}

const SETS = (namesJson as unknown as { templates: Record<Id, NameSet[]> }).templates;
const STREETS = (streetsJson as unknown as { neighbourhoods: Record<string, { streets: string[]; avenues: string[] }> })
  .neighbourhoods;

/** The words a local form opens on when it says where rather than what: "behind Rubin’s". */
const PREPOSITION = /^(?:behind|over|under|by|across|up|upstairs|in|at|on|near|round|around|beside)\b/i;

export interface NamingInput {
  seed: number;
  /** A salt per tier, so two tiers of one seed do not name alike. */
  salt: number;
  neighborhood: string;
  places: Place[];
  /** The one whose own address it is, or whose own room: `{V}`. */
  owner: string;
  /** A place that is `{V}`'s own besides the residence (an inside job's office). */
  owned?: Id;
  /** The landlady posted at a place, by place id: `{W}`. */
  landladyAt: Record<Id, string>;
  /** Every family name in the case, which no drawn name may carry. */
  surnames: string[];
}

/** FNV-1a, for a stream of the names' own. */
function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * What the place is called in running text: the first local form that is a
 * noun ("Rubin’s alley", not "behind Rubin’s"), else the label in lower case.
 * Everything that used to say the deck's short name says this.
 */
export function textNameOf(set: { local: string[]; short: string }): string {
  // "The office" is the detective's own, and a place called that is a prompt
  // nobody could type. "The square" in running text is "on the square",
  // which is somebody being honest: the square's own name says it instead.
  const nouns = set.local.filter((l) => !PREPOSITION.test(l) && !/^(?:the|my) office\b/i.test(l));
  const first = nouns[0];
  if (first === 'the square') {
    if (!/^the square$/i.test(set.short)) return set.short.replace(/^The /, 'the ');
    const next = nouns.find((l) => l !== 'the square');
    if (next) return next;
  }
  if (first) return first;
  return set.short.replace(/^The /, 'the ');
}

/** Every form a place answers to, for the parser and the checkers. */
export function formsOf(place: Place): string[] {
  const n = place.names;
  if (!n) return [place.shortName];
  return [...new Set([place.shortName, n.proper, n.short, ...n.local, n.bare])];
}

/** Name every place of a tiered case. Returns null when no clash-free hand exists. */
export function drawPlaceNames(input: NamingInput): Record<Id, PlaceNames> | null {
  const rng = new Rng(hashText(`names|${input.seed}|${input.salt}|${input.neighborhood}`));
  const streets = STREETS[input.neighborhood] ?? { streets: ['Main Street'], avenues: ['the Avenue'] };
  const residence = input.places.find((p) => p.isResidence)?.id;
  const forbidden = input.surnames.filter((s) => s !== input.owner && !Object.values(input.landladyAt).includes(s));

  for (let attempt = 0; attempt < 30; attempt++) {
    const usedStreets = new Set<string>();
    const out: Record<Id, PlaceNames> = {};
    const said = new Set<string>();
    let ok = true;
    for (const place of input.places) {
      const own = place.id === residence || place.id === input.owned;
      const sets = (SETS[place.id] ?? []).filter((s) => {
        if (s.fits && !s.fits.includes(input.neighborhood)) return false;
        // A keeping set names the place as the owner's, and is drawn only
        // when it is, and then always (rules.md §3). A residence's every set
        // is the owner's.
        if (place.id !== residence && own !== (s.keeping === true)) return false;
        const text = JSON.stringify(s);
        if (text.includes('{W}') && input.landladyAt[place.id] === undefined) return false;
        return true;
      });
      if (sets.length === 0) {
        ok = false;
        break;
      }
      const set = rng.pick(sets);
      const pickStreet = (list: string[]): string => {
        const fresh = list.filter((s) => !usedStreets.has(s));
        const got = rng.pick(fresh.length > 0 ? fresh : list);
        usedStreets.add(got);
        return got;
      };
      const slots: Record<string, string> = {
        '{V}': input.owner,
        '{W}': input.landladyAt[place.id] ?? '',
      };
      const fill = (text: string): string => {
        let t = text;
        if (t.includes('{street}')) t = t.split('{street}').join((slots['{street}'] ??= pickStreet(streets.streets)));
        if (t.includes('{avenue}')) t = t.split('{avenue}').join((slots['{avenue}'] ??= pickStreet(streets.avenues)));
        return t.split('{V}').join(slots['{V}'] as string).split('{W}').join(slots['{W}'] as string);
      };
      const local = set.local.map(fill);
      const named: PlaceNames = {
        set: set.id,
        proper: fill(set.proper),
        local,
        short: fill(set.short),
        epithets: set.epithets.map(fill),
        sense: set.sense.slice(),
        bare: PLACE_TEMPLATES.find((t) => t.id === place.id)?.shortName ?? place.shortName,
      };
      // No two places answer to one name, and no name is somebody's in the cast.
      const forms = [textNameOf(named), named.short, ...local].map((f) => f.toLowerCase());
      const all = [named.proper, ...local, named.short, ...named.epithets].join(' ');
      if (forms.some((f) => said.has(f)) || forbidden.some((s) => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(all))) {
        ok = false;
        break;
      }
      for (const f of forms) said.add(f);
      out[place.id] = named;
    }
    if (ok) return out;
  }
  return null;
}

/** A place with its drawn names on it: `shortName` is what running text says. */
export function withNames(place: Place, names: PlaceNames): Place {
  return { ...place, name: names.proper, shortName: textNameOf(names), names };
}

/**
 * Does `text` name this place? The untiered case's short names are read as
 * they always were, a substring ("the benches"); a named place's running
 * name is read as a word ("the El" is not "the elevator man").
 */
export function saysPlace(text: string, place: Pick<Place, 'shortName' | 'names'>): boolean {
  const lower = text.toLowerCase();
  const name = place.shortName.toLowerCase();
  if (!place.names) return lower.includes(name);
  let from = 0;
  for (;;) {
    const i = lower.indexOf(name, from);
    if (i < 0) return false;
    const before = i === 0 ? '' : (lower[i - 1] ?? '');
    const after = lower[i + name.length] ?? '';
    if (!/[a-z]/.test(before) && !/[a-z-]/.test(after)) return true;
    from = i + 1;
  }
}

/**
 * docs/38: a sentence that has already named somebody says what is theirs
 * with a pronoun. "Lefkowitz was found at Lefkowitz’s place" is "…at his
 * place"; "Lefkowitz’s rooms at Lefkowitz’s place" is "Lefkowitz’s rooms".
 * Only where nobody else is named between the two, and only inside the same
 * voice (both in the narration, or both in one speech), so the pronoun can
 * only mean them.
 */
export function ownerOnce(text: string, people: readonly { surname: string; gender?: string }[]): string {
  let out = text;
  const escape = (x: string): string => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const p of people) {
    if (!out.includes(p.surname)) continue;
    const S = escape(p.surname);
    const his = p.gender === 'f' ? 'her' : 'his';
    // "S’s rooms at S’s place": the second says nothing the first did not.
    out = out.replace(new RegExp(`(\\b${S}[’']s [a-z]+(?: [a-z]+)?) at ${S}[’']s place\\b`, 'g'), '$1');
    const others = people.filter((q) => q.surname !== p.surname).map((q) => new RegExp(`\\b${escape(q.surname)}\\b`));
    const units = out.split(/(?<=[.!?:;])(\s+)/);
    for (let u = 0; u < units.length; u++) {
      const s = units[u] as string;
      const first = new RegExp(`\\b${S}\\b`).exec(s);
      if (!first) continue;
      const later = new RegExp(`\\b${S}[’']s (?=[a-z])`, 'g');
      later.lastIndex = first.index + p.surname.length;
      let rebuilt = '';
      let from = 0;
      for (let m = later.exec(s); m; m = later.exec(s)) {
        const between = s.slice(first.index + p.surname.length, m.index);
        const quotes = (between.match(/[“”]/g) ?? []).length;
        if (quotes > 0 || others.some((re) => re.test(between))) continue;
        rebuilt += `${s.slice(from, m.index)}${his} `;
        from = m.index + m[0].length;
      }
      if (from > 0) units[u] = rebuilt + s.slice(from);
    }
    out = units.join('');
  }
  return out;
}
