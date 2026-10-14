/**
 * docs/52 build 2: each shape's arguments, by name and type, and the flags
 * that pick its voicings. The writers fill these (`Item.say`), the voicings
 * say them (`content/board/voicings.json`), and the round trip reads them back
 * by type (`reread.ts`): a person by name, pronoun or role; an hour or hours
 * by word; a place by name, or "here"; a list's people by what a page calls
 * them. A `text` argument is a phrase the shape's reader reads whole (the
 * case's own words for a reason, a remark's street, a means; or a phrase the
 * engine builds, like a span of places and hours).
 *
 * The tests hold every voicing to its shape's schema: no slot the schema
 * doesn't have, and no form a type doesn't take.
 */

import type { Shape } from './types.js';

export type ArgType = 'person' | 'people' | 'hour' | 'hours' | 'place' | 'at' | 'text';

export interface ShapeSchema {
  /** The arguments a voicing of the shape may name. */
  args: Record<string, ArgType>;
  /** What the shape says, and its forms (the flags that pick a voicing), for the writers of voicings. */
  doc: string;
  /** Said by somebody (their manner picks the voicing), or by the detective. */
  speech?: boolean;
}

/** The forms a typed argument takes in a template: `{p:they}`, `{h:oclock}`, `{hs:or}`. */
export const FORMS: Record<ArgType, string[]> = {
  person: ['they', 'them', 'their', 'role', 'name'],
  people: ['or'],
  hour: ['oclock'],
  hours: ['or', 'oclock'],
  place: [],
  at: [],
  text: [],
};

const T = 'text' as const;

export const SCHEMA: Record<Shape, ShapeSchema> = {
  'CONFIRMED-WITH': {
    args: { confirmed: T, others: T, him: T, placed: T },
    doc: 'A list that confirms somebody, and the others it has at that hour. {confirmed} is the confirmation as said; {others} the names, {him} the confirmed person; or {placed}, "A here at ten and B at eleven". Flags: too | same | apart.',
  },
  CONFIRMED: {
    args: { spans: T, src: T, by: T, him: T, he: T, name: T, watcher: T, them: T, at: T, hour: T, there: T, pairs: T },
    doc: 'Somebody’s own word confirmed by another line. agree (so | which): {spans} "here at eleven, with Feeney", {src} "Coffin had". rest (same | held): {by} the source, {him}/{he} the person, {spans}; held adds {name}. list (same | too | many): {watcher}, {them}/{name}/{him}, {at} "here" | "at the Thalia", {hour}, {there}; many: {pairs} "A at ten and B at eleven".',
  },
  'LIST-HOUR': {
    args: { hours: 'hours', hour: 'hour', names: 'people', other: 'people', who: T, when: T, nobody: T },
    speech: true,
    doc: 'A watcher’s list, an hour (or a run of hours with the same people) at a time, in the watcher’s mouth. hour: {hours} and {names} (the people, as the watcher calls them); whole: and nobody else came in (the voicing says so in its own words); part: the voicing says nothing about anybody else. first: the first hour of the list (the voicing may say "{hours:oclock}"); next: a later one. empty: nobody at {hours} (landlady: "nobody but me"; regular: just {names}, the one who’s always there). always: {other} was there every hour the watcher kept (all: the whole evening; shift: from when the watcher came on), and {who} what they do, when the list says ("He buys things."). shut: the place shut at {hour}, nobody after. Legacy (aggregated): {when}, {names}, {nobody}.',
  },
  UNSPOKEN: {
    args: { people: 'people', hours: 'hours' },
    doc: 'Nobody, them included, had told me where these people were at these hours (the notebook said aloud). one: one person ({people:they} may be used); many: several. Say the hours with {hours:or}.',
  },
  'ACCESS-SET': {
    args: { yes: T, no: T, nobody: T, short: T, people: 'people', none: 'people', origin: 'place', means: T, client: 'person', occasion: T },
    doc: 'Who had the way in, and who hadn’t. Thought (legacy): {yes}, {no}, {nobody} {short}. Recap: {people} had it, {none} hadn’t; murder: had been at {origin} while the {means} was there; told: were at {origin} while {client} told the room; party: were at the {occasion}; spare: had been in at {origin} when the spare key was there. Flags: yes, no, and the kind (murder | told | party | spare).',
  },
  'WINDOW-ALIVE': {
    args: { client: T, opts: T, victim: T, place: T, at: T, hour: T, him: T, narrowed: T, narrowword: T },
    doc: 'The office’s two hours, and the victim (or the pet) seen at one of them. {client} had said {opts}; {victim} was at {place} / {at} at {hour}. At a walk the hour left: {narrowed}. Flags: one | two, murder | small, walk, so.',
  },
  'COLLISION-PAIR': {
    args: { claim: T, breaker: T, two: T, person: 'person', place: 'place', hour: 'hour', src: T },
    doc: 'Somebody’s claim and the line that breaks it. Thought: {claim} "Abramowitz said the Thalia at eleven", {breaker} the line, {two} the closing line. Flags: but | two | colon. Recap: {person} had told me {place} (or "home") at {hour}, and {src} said otherwise. Flags: recap, home.',
  },
  'ADMIT-CHECK': {
    args: { a: T, b: T },
    doc: 'The hole in their story, and the story owned up to in its place, as one sentence: {a}, but {b}.',
  },
  'CLAIM-SPAN': {
    args: { from: 'hour', to: 'hour', hours: 'hours', where: T, reason: T, with: T, client: 'person', occasion: T, bits: T },
    speech: true,
    doc: 'One stretch of a person’s own evening, in their mouth, first person. run: from {from} (to {to}) at {where} ("home", "at the Automat", "at work, at the Lyric", "home at Rafferty’s"), or doing {reason} (their own words, first person, already saying where: "went to the Automat for a plate of beans"; the voicing puts "I" before it); {with} is who was with them, said as a tail (", with Feeney", ", on my own", or nothing: put it straight after the place or the reason). Flags: first | next (the evening’s first stretch, or a later one); reason | place (a reason, or only where); one | span | end (one hour; from {from} through {to}; from {from} to the end of the evening: "all evening" at first, "the rest of the evening" later, folded, no {to}); timed: the reason already says the hour, so no {from}. party: at {client}’s for the {occasion}, from {from} (span: through {to}). alone: nobody was with them at {hours} (all: the whole evening, folded; some: say {hours} or {hours:or}). company: {bits}, who was with them at which hours of one stretch ("Abramowitz was there at eight; at nine it was just me").',
  },
  'MOTIVE-SET': {
    args: { person: 'person', client: 'person', victim: 'person', means: T, origin: 'place', said: T },
    doc: 'Somebody’s reason. own: that was {person}’s reason, in their own words. office: it was what {client} had said in the office. not-office: {client} hadn’t mentioned it. papers: the papers held a reason on everybody (tied: but the {means} was at {origin}).',
  },
  HANDOVER: {
    args: { holder: 'people', place: 'at', hour: 'hour', scene: 'place', thing: 'person', at: 'place' },
    doc: 'The thing’s last move, to somebody who isn’t on the board. thought: whatever went out of {scene}, something came in {place} under a coat at {hour} and went to {holder}. recap: whatever it was had gone to {holder} at {at} at {hour}. crack: {thing} was with {holder}, here (who hadn’t looked up) or away ({place}). coat: the watcher’s answer to what was under the coat (alive | small).',
  },
  'PLACED-SET': {
    args: { bits: T, swear: T, he: T, runs: T, his: T, by: T, groups: T, person: 'person', place: 'place', hours: 'hours', src: T },
    doc: 'People placed at an hour on somebody else’s word. Thought (legacy): {bits} "Wehrle and Mulcahy here at ten" with {swear}; self: {he} put {bits}; count: by {his} count, {runs}; recap (several): {by} had {groups}. Recap (one): {person} was at {place} at {hours}; {src} said so.',
  },
  'OWN-WORD': {
    args: { hs: T, hourword: T, who: T, what: T, owns: T, person: 'person', place: T, hours: 'hours' },
    doc: 'The hours that mattered, on somebody’s word alone. hours: for {hs}, the {hourword} that mattered, {who} said {what}. recap: {owns}, and nobody else had said so yet; one: {person} said {place} at {hours}, and nobody else had.',
  },
  STREET: {
    args: { street: T, victim: T, client: T },
    doc: 'A remark put somebody on the scene’s street: the part worth keeping, and what {street} is (murder: where {victim} lived; small: where {client} kept {victim}). Flags: one | two (one sentence, or two).',
  },
  'WINDOW-MEANS': {
    args: { hours: 'hours', client: 'person', victim: 'person', means: T, origin: 'place', delay: T, kept: T, occasion: T, scene: 'place', venue: 'place', key: T, what: T, hour: 'hour' },
    doc: 'The window and the way in. when: the office’s hours ({client} had said {hours:or}), or the hour it happened ({hour}), or two hours and I didn’t know which. means: the {means} came from {origin}. find (after the search): murder: the {means} came from {origin}, and (gun, knife) since {victim} died at {hours:or}, whoever used it had been there before, or (poison) since it takes {delay}, whoever brought it had been there earlier; small: told: somebody who’d heard {client} at {venue} between {hours} ; party: the people at the {occasion} in {scene}; spare: the spare key, which lived {key}. scene (on arrival at a small case’s scene): if it went at {hours:or}, whoever took it knew the way in.',
  },
  LEFT: {
    args: { hour: 'hour', access: T, street: T },
    doc: 'Raw’s elimination, its last step: that left one person who {access}, with no true account for {hour} (seen: and who’d been seen on {street} at {hour}).',
  },
  FIND: {
    args: { found: T, origin: 'place', victim: 'person', empty: T, thing: 'person' },
    doc: 'What a search turned up. {found} is the case’s own description; the voicing may frame it. Flags: the means (murder | told-mat | told-window | spare-tin | ...).',
  },
  REACTION: {
    args: { person: 'person', place: 'place', claimed: T, hour: 'hour', witness: 'person', said: T },
    doc: 'What somebody said when their line was put to them, and what I made of it. if-held: if it held, {person:they} had been at {place} at {hour}, not {claimed}. owned: {person} owned up to {place} at {hour}, and nobody had said so but them. said: their own words ({said}).',
  },
  OFFICE: {
    args: { client: 'person', line: T, said: T },
    speech: true,
    doc: 'A line of the office, in the client’s mouth.',
  },
  REMARK: {
    args: { via: 'place', hour: 'hour', saw: 'person', street: T, from: 'hour', means: T, keep: T, back: 'hour' },
    speech: true,
    doc: 'Something a person or a watcher mentions besides. passed: on the way to {via} at {hour} they passed {saw} on {street}, in a hurry, no hat. had: they had {saw} (the pet) at their place at {hour}, {keep}, and put it back just before {back}. there: {means} was there at {hour}, and they didn’t look again. shift: the watcher came on at {from}; before that they can’t say.',
  },
  PRESENT: {
    args: { person: 'person', where: T },
    doc: 'Somebody turned out to be in the room: {person} was {where} (back: had come back in).',
  },
  HOLD: {
    args: { evenings: 'people', lists: 'people', people: 'people' },
    doc: 'The notebook at Hard-boiled. hold: I had evenings from {evenings} and lists from {lists} (flags: evening | evenings, list | lists, and which there are). missing: I didn’t have {people}’s evenings yet.',
  },
  PAIR: {
    args: { a: T, b: T },
    doc: 'Two composites in one sentence. Flags: and | semi | but.',
  },
  ATTACH: {
    args: { host: T, of: T, he: T },
    doc: 'Who could get at the means, said of somebody another sentence names: {host}, who {of}; or {host}, and {he} {of}. Flags: who | and-he.',
  },
};
