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
  people: ['or', 'poss', 'orposs'],
  hour: ['oclock'],
  hours: ['or', 'oclock'],
  place: [],
  at: [],
  text: [],
};

const T = 'text' as const;

/**
 * The slots a voicing must name, by its shape and the flags it asks for: each entry is a set of
 * alternatives, one of which must be there ("{him} or {name}"). A voicing that names none of an
 * entry's drops a fact (the round trip would fail it too, but only on a night that says that form).
 */
export function mustSay(v: { shape: Shape; requires?: string[]; template: string }): string[][] {
  const r = new Set(v.requires ?? []);
  const has = (k: string) => r.has(k);
  switch (v.shape) {
    case 'CLAIM-SPAN': {
      if (has('solo')) return has('all') ? [] : [['hours']];
      if (has('company')) return [['bits']];
      const out: string[][] = [];
      if (has('party')) out.push(['client'], ['occasion']);
      else if (has('reason')) out.push(['reason']);
      else if (has('place')) out.push(['where']);
      if (!(has('first') && has('end')) && !has('timed') && !(has('party') && has('end'))) out.push(['from']);
      if (has('span')) out.push(['to']);
      if (!has('alone') && !has('bare')) out.push(['with']);
      return out;
    }
    case 'LIST-HOUR':
      if (has('shut')) return [['hour']];
      if (has('always')) return [['who'], ...(has('does') ? [['does']] : []), ...(has('post') ? [['post']] : [])];
      if (has('empty')) return has('regular') ? [['hours'], ['names']] : [['hours']];
      if (has('thought')) return [['hours'], ['listed'], ...(has('unnamed') ? [['watcher']] : [])];
      if (has('hour')) return [['hours'], ['names']];
      return [['when'], ['names'], ['nobody']];
    case 'REMARK':
      if (has('passed')) return [['via'], ['hour'], ['saw'], ['street']];
      if (has('had')) return [['saw'], ['hour'], ['keep'], ['back']];
      if (has('there')) return [['means'], ['still'], ['hour']];
      if (has('shift')) return [['from']];
      return [];
    case 'HANDOVER':
      if (has('seen')) return [['hour'], ['holder']];
      if (has('recap')) return has('known') ? [['thing'], ['holder'], ['at']] : [['holder'], ['at'], ['hour']];
      if (has('thought')) return [['scene'], ['place'], ['hour'], ['holder']];
      if (has('crack')) return [['thing'], ['holder'], ...(has('away') ? [['at']] : [])];
      return [];
    case 'LEFT':
      return has('open') ? [['person'], ['from'], ['to']] : [['access'], ['hour'], ...(has('seen') ? [['street']] : [])];
    case 'MOTIVE-SET':
      if (has('own')) return [['person']];
      if (has('office') || has('not-office')) return [['client']];
      if (has('papers') && has('tied')) return [['means'], ['origin']];
      if (has('papers-list')) return [['lines']];
      return [];
    case 'FIND':
      return [];
    case 'OFFICE':
      if (has('relation')) return [['clientFull'], ['victimFull'], ['relation']];
      if (has('found')) return [['victim'], ['finder'], ['scene']];
      if (has('means')) return has('told-mat') || has('told-window') ? [['venue'], ['h0'], ['h2']] : has('spare-nail') || has('spare-tin') ? [['keeper'], ['x']] : has('latch-key') ? [['resident']] : [];
      if (has('clock') || has('window') || has('small-clock')) return [['line']];
      if (has('pointer')) return [['p'], has('behaviour') ? ['behaviour'] : ['motive']];
      if (has('venue')) return [['venue']];
      if (has('gone')) return has('pet') ? [['thing'], ['where', 'whereFrom']] : [['thingName'], ['where']];
      if (has('party')) return [['guests']];
      if (has('told-mat') || has('told-window')) return [['venue'], ['h0'], ['h2']];
      if (has('spare-nail') || has('spare-tin')) return [['keeper'], ['x']];
      if (has('latch-key')) return [['resident']];
      if (has('keeper')) return [['keeper'], ['thing', 'pthem']];
      if (has('aside')) return [['said']];
      return [];
    case 'PRESENT':
      return [['where'], ...(has('named') ? [['person']] : [])];
    case 'CONFIRMED':
      if (has('agree')) return [['spans'], ['src']];
      if (has('rest')) return [['by'], ['spans'], ['him', 'name']];
      if (has('many')) return [['watcher'], ['pairs']];
      if (has('list')) return [['watcher'], ['them', 'name', 'him'], ['at'], ['hour']];
      return [];
    case 'CONFIRMED-WITH':
      return has('apart') ? [['confirmed'], ['placed']] : [['confirmed'], ['others']];
    case 'COLLISION-PAIR':
      if (has('recap')) return [['person'], ...(has('home') ? [] : [['place']]), ['hour'], ['src']];
      if (has('hole') || has('second-refused')) return [['person']];
      if (has('put')) return [['claim'], ['breaker']];
      if (has('still')) return [['person'], ['hour'], ['src']];
      if (has('second-list')) return [['person'], ['at'], ['hour'], ['watcher']];
      return has('two') || has('colon') ? [['claim'], ['breaker'], ['two']] : [['claim'], ['breaker']];
    case 'OWN-WORD':
      if (has('recap')) return [['owns']];
      if (has('recap-one')) return [['person'], ['said']];
      if (has('told')) return [['person'], ['hours'], ['said']];
      return [['hs'], ['who'], ['what']];
    case 'PLACED-SET':
      if (has('swear')) return [['bits'], ['swear']];
      if (has('self') && has('plain')) return [['runs']];
      if (has('self')) return [['he'], ['bits']];
      if (has('count')) return [['his'], ['runs']];
      if (has('recap')) return [['by'], ['groups']];
      if (has('recap-one')) return [['person'], ['at'], ['src']];
      if (has('elim')) return [['people'], ['place'], ...(has('first') ? [['hour']] : []), ...(has('mutual') ? [] : [['src']])];
      return [];
    case 'ACCESS-SET': {
      if (has('recap')) return [...(has('yes') ? [['people']] : []), ...(has('no') ? [['none']] : [])];
      if (has('elim')) return [['none'], ['access']];
      const out: string[][] = [];
      if (has('yes')) out.push(['yes']);
      if (has('no')) out.push(has('agg') ? ['nobody'] : ['no']);
      if (has('agg')) out.push(['short']);
      return out;
    }
    case 'ATTACH':
      return [['host'], ['of'], ...(has('and-he') ? [['he']] : [])];
    case 'WINDOW-ALIVE':
      return [['client'], ['opts'], ['victim'], ['place', 'at'], ['hour'], ...(has('walk') ? [['narrowed', 'narrowword']] : [])];
    case 'STREET':
      return [['street'], ['victim'], ...(has('small') ? [['client']] : [])];
    case 'ADMIT-CHECK':
    case 'PAIR':
      return [['a'], ['b']];
    case 'UNSPOKEN':
      return [has('one') ? ['person'] : ['people'], ['hours']];
    case 'WINDOW-MEANS':
      if (has('when')) return [has('hour') && !has('office') ? ['hour'] : ['hours'], ...(has('office') ? [['client']] : [])];
      if (has('means')) return [['means'], ['origin']];
      if (has('scene')) return [['hours'], ...(has('murder-said') ? [['means']] : has('told') ? [['client'], ['origin']] : has('party') ? [['occasion']] : has('spare') ? [['key']] : [])];
      if (has('find')) {
        if (has('gun') || has('blade')) return [['origin'], ['victim'], ['hours']];
        if (has('poison')) return [['means'], ['origin'], ['delay'], ['victim']];
        if (has('party')) return [['occasion'], ['scene'], ['hour'], ['client']];
        if (has('told')) return [['client'], ['origin'], ['from'], ['till']];
        if (has('spare')) return [['key']];
      }
      return [];
    case 'REACTION':
      if (has('owned')) return [['person'], ['place'], ...(has('witness') ? [['witness']] : [])];
      if (has('second')) return [['person'], ['place']];
      if (has('refused')) return [['person']];
      if (has('admit')) return [['claim'], ['witness', 'truth']];
      if (has('refuse-said')) return [['person'], ...(has('pair') ? [['partner']] : [])];
      if (has('second-said')) return [['place'], ...(has('home') ? [] : [['claimed']])];
      if (has('crack-said')) return [['holder'], ['why'], ...(has('straight') ? [] : [['place']])];
      if (has('if-held')) return [['person'], ['place'], ['hour'], ...(has('home') ? [] : [['claimed']])];
      if (has('owned-hour')) return [['person'], ['place'], ['hour']];
      if (has('second-thought')) return [['place'], ['hour'], ...(has('met') ? [['watcher']] : [])];
      if (has('refuse-thought')) return [['person'], ['hour'], ...(has('home') ? [] : [['claimed']])];
      if (has('held')) {
        const out: string[][] = has('other-place') ? [] : [['person']];
        if (['agreed', 'strangers', 'elsewhere', 'company', 'other-place', 'untrusted'].some(has)) out.push(['by']);
        if (has('elsewhere') || has('other-place')) out.push(['place']);
        if (has('other-place')) out.push(['where']);
        if (['agreed', 'strangers', 'company', 'other-place', 'nowhere'].some(has) || (has('untouched') && !has('hourless'))) out.push(['hour']);
        return out;
      }
      return [];
    case 'HOLD':
      if (has('missing')) return [['people']];
      return [...(has('evening') || has('evenings') ? [['evenings']] : []), ...(has('list') || has('lists') ? [['lists']] : [])];
    default:
      return [];
  }
}

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
    args: { hours: 'hours', hour: 'hour', names: T, who: T, does: T, post: T, watcher: 'person', listed: T, when: T, nobody: T },
    speech: true,
    doc: 'A watcher’s list, an hour (or a run of hours with the same people) at a time, in the watcher’s mouth. hour: at {hours}, {names} (the people, as the watcher calls them: "Feeney, Corrigan and Mr. Prentiss telling the room about his key"); whole: and nobody else (the voicing says so in its own words); part: the voicing says nothing about anybody else. first: the list’s first hour ({hours:oclock} reads well); next: a later one. one | many: one person or several. empty: nobody at {hours} (landlady: nobody but me; regular: just {names}, the one who’s always there; else: nobody else; bare: nobody). always: {who} was there every hour the watcher kept (all: the whole evening; shift: the whole time the watcher was on), {post} where ("in his back booth"), {does} what they do ("He buys things"); plural: {who} is two people. shut: the place shut at {hour}, and nobody after. thought (the detective’s, not the watcher’s): the hours that mattered were {hours} (one | two), and {watcher} had {listed} ("Feeney and Ashby at both, and Pardo at eleven", "Feeney, Ashby and Pardo, at the Thalia"); named: {watcher} was named in the thought already, so the voicing says "the list" instead, and has no {watcher}.',
  },
  UNSPOKEN: {
    args: { people: 'people', person: 'person', hours: 'hours' },
    doc: 'Nobody, them included, had told me where these people were at these hours (the notebook said aloud). one: one {person} (with {person:they}, "he" or "she"); many: several {people} ("they"). hour | two: one hour or the office’s two (say them with {hours:or}).',
  },
  'ACCESS-SET': {
    args: { yes: T, no: T, nobody: T, short: T, people: 'people', none: 'people', origin: 'place', means: T, client: 'person', occasion: T, access: T },
    doc: 'Who had the way in, and who hadn’t. Thought (legacy): {yes}, {no}, {nobody} {short}. Recap: {people} had it, {none} hadn’t; murder: had been at {origin} while the {means} was there; told: were at {origin} while {client} told the room; party: were at the {occasion}; spare: had been in at {origin} when the spare key was there. Flags: yes, no, and the kind (murder | told | party | spare). Raw’s elimination (elim, no): {none} {access} ("had no way to the rat poison", "never learnt the way in").',
  },
  'WINDOW-ALIVE': {
    args: { client: T, opts: T, victim: T, place: T, at: T, hour: T, him: T, narrowed: T, narrowword: T },
    doc: 'The office’s two hours, and the victim (or the pet) seen at one of them. {client} had said {opts}; {victim} was at {place} / {at} at {hour}. At a walk the hour left: {narrowed}. Flags: one | two, murder | small, walk, so.',
  },
  'COLLISION-PAIR': {
    args: { claim: T, breaker: T, two: T, person: 'person', place: 'place', hour: 'hour', src: T, at: 'at', watcher: 'person' },
    doc: 'Somebody’s claim and the line that breaks it. Thought: {claim} "Abramowitz said the Thalia at eleven", {breaker} the line, {two} the closing line. Flags: but | two | colon. Recap: {person} had told me {place} at {hour}, and {src} said otherwise (home: "home", no {place}). After a put: hole: that was a hole in {person}’s story (where and when are the put’s, folded); second-refused: {person}’s second story had a list against it now, and {person:they} had nothing in its place; still: {person}’s {hour} o’clock still had {src} ("Coffin’s list", "Ashby’s own evening", "the office") against it; second-list (on a list page): {person}’s second story had {person:them} {at} at {hour}, and {watcher} didn’t have {person:them}.',
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
    args: { person: 'person', client: 'person', victim: 'person', means: T, origin: 'place', lines: T },
    doc: 'Somebody’s reason, in the detective’s thought. own: that was {person}’s reason, in {person:their} own words. office: it was what {client} had said in the office, near enough (whose reason is folded: the sentence before named them). not-office: {client} hadn’t mentioned it. papers-list: what each page said, already a list ({lines}: "Mrs. Blau: a bundle of her letters…. Russo: …"), read out whole. papers (after the papers): everybody in {victim}’s box had a reason (tied: but the {means} was at {origin}, and a reason isn’t a way to it; even: but a reason isn’t a hand on the {means}).',
  },
  HANDOVER: {
    args: { holder: 'people', place: 'at', hour: 'hour', scene: 'place', thing: 'person', at: 'place' },
    doc: 'The thing’s last move, to somebody who isn’t on the board. seen (a watcher’s remark, in the watcher’s mouth): at {hour} somebody came in with something under a coat and went straight to {holder}, and it changed hands; the watcher was watching the coat, not the face. coat (the watcher’s answer to what was under the coat; alive | small): no slots, all folded. thought: whatever went out of {scene}, something came in {place} under a coat at {hour} and went to {holder}. recap: whatever it was had gone to {holder} at {at} at {hour}. crack: {thing} was with {holder}, here (who hadn’t looked up) or away ({at}).',
  },
  'PLACED-SET': {
    args: { bits: T, swear: T, he: T, runs: T, his: T, by: T, groups: T, person: 'person', at: T, src: T, people: 'people', place: 'at', hour: 'hour' },
    doc: 'People placed at an hour on somebody else’s word. Thought (legacy): {bits} "Wehrle and Mulcahy here at ten" with {swear}; self: {he} put {bits}; count: by {his} count, {runs}; recap (several): {by} had {groups}. Raw’s elimination (elim): at {hour}, {people} was/were {place} ("here", "at the Thalia"), and {src} said so (first: the passage’s first, with the hour; next: a later one, the hour folded; one | many | mutual: mutual says "each said so of the other", no {src}). Recap (recap-one): {person} was at {at} ("the Thalia at ten and eleven", "the Thalia at ten and the Lyric at eleven"); {src} said so ("Coffin", "Coffin and Ashby", "the office").',
  },
  'OWN-WORD': {
    args: { hs: T, hourword: T, who: T, what: T, owns: T, person: 'person', said: T, hours: 'hours' },
    doc: 'The hours that mattered, on somebody’s word alone. hours: for {hs}, the {hourword} that mattered, {who} said {what}. recap: {owns}, and nobody else had said so yet; recap-one: {person} said {said} ("home at nine and ten", "the Thalia at ten"), and nobody else had said so yet. told (the motive page): for {hours}, {person:they} had told me {said}.',
  },
  STREET: {
    args: { street: T, victim: T, client: T },
    doc: 'A remark put somebody on the scene’s street: the part worth keeping, and what {street} is (murder: where {victim} lived; small: where {client} kept {victim}). Flags: one | two (one sentence, or two).',
  },
  'WINDOW-MEANS': {
    args: { hours: 'hours', hour: 'hour', client: 'person', victim: 'person', means: T, origin: 'place', delay: T, occasion: T, scene: 'place', key: T, from: 'hour', till: 'hour' },
    doc: 'The window and the way in, in the detective’s thought or the notebook. when (the notebook): hour: it happened at {hour} (small: {victim:they} went); two: at {hours:or}, and I didn’t know which; office: {client} had said {hours:or} (hour: {hours}). means: the {means} came from {origin} (link: so whoever used it had been there first; fact: only that). scene (on the way into the scene, the office’s window and what it means): murder: if it happened at {hours:or}, it happened in this room, so {victim:they}’d let whoever did it in; murder-said: … whoever did it had walked in with the {means} already in hand; told: if {victim:they} went at {hours:or}, anybody who’d heard {client} at {origin} had known the way in; party: … everybody at the {occasion} had known the way in; spare: … whoever took {victim:them} had a key, and the spare key lives {key}. find (after the search; the page’s "So" may be put before it, so it must read as a plain statement): gun | blade: the gun (the knife) came from {origin}, and since {victim} died at {hours:or}, whoever used it had been there before that, to take it; poison: the {means} came from {origin}, and since it takes {delay}, whoever brought it to {victim} had been there earlier; party: the people who knew the way in were the ones at the {occasion} in {scene} at {hour}, whose names {client} had given me; told: somebody who’d heard {client} at {origin} between {from} and {till}, which made {origin} the place to start counting; spare: the key was the spare, and the spare lived {key}.',
  },
  LEFT: {
    args: { person: 'person', from: 'hour', to: 'hour', access: T, hour: 'hour', street: T },
    doc: 'Raw’s elimination (the walk, Raw only: "that left" is allowed here). open: that left {person}, and the clock still open between {from} and {to}. last (the elimination’s last step): that left one person who {access} ("had heard about the window"), with no true account for {hour} (seen: and who’d been seen on {street} at {hour}).',
  },
  FIND: {
    args: { x: T, victim: T, empty: T, thing: T },
    doc: 'What a search turned up, the room’s own words. means (by the way in, the flag after it: chloral, revolver, told-mat, spare-tin…): the find as the case has it, with {x} where it came from ("the hall-stand drawer at Rafferty’s"), {empty} the empty cushion or dome ("The cushion by the radiator was empty."), {victim}, {thing}. papers: the dead man’s papers, a page on everybody with a grudge.',
  },
  REACTION: {
    args: { person: 'person', place: 'place', claimed: 'place', hour: 'hour', witness: 'person', by: 'person', where: 'place', watcher: 'person', claim: T, truth: T, crime: T, partner: 'person', holder: T, why: T },
    doc: 'What somebody said when their line was put to them, and what I made of it. The notebook: owned: {person} owned up to {place} (witness: with {witness}; unchecked: and {witness} could say whether that was so; alone); second: put to it, {person} had a second story, {place} (again: that didn’t hold either, and they wouldn’t say more); refused: {person} wouldn’t say where {person:they} had been instead. What they said (speech, with its own quotation marks): admit (the flag after it is where they were, "unwatched:N", folded into the voicing’s own words, or none: then {truth}): I wasn’t at {claim}, I was at {truth} with {witness}, ask {witness:them}; refuse-said (any | pair): they won’t say where they were ({crime}: "kill anybody", "take anything"; pair: they were with {partner}); second-said (home | away): I wasn’t at {claimed}, I was at {place}; crack-said (straight | second-home | second-away): I took it, it’s with {holder}, and why ({why}), after a second story (I wasn’t at {claimed}, I was at {place}) that was thin; held-said: the put didn’t touch anything they’d said. The thought after a put: if-held: if it held, {person:they} had been at {place} at {hour}, not at {claimed} (home: not home); owned-hour: {person} owned up to {place} at {hour}, and nobody had said so but {person:them}; second-thought: a second story, and {place} at {hour} was a place somebody was paid to watch, so {watcher} would know (met) or whoever kept the room there would (unmet); refuse-thought (the page’s "But" may go before it): if {person:they} wasn’t at {claimed} (home: home) at {hour}, somebody saw {person:them} where {person:they} was, and if nobody had, that would say something too. held (a put that didn’t land; the flag after it is why): untouched: nothing in it touched where {person} said {person:they} was (hour: at {hour}; hourless: no hour); agreed: {by} had {person} there at {hour}, which agreed with them; strangers: {by} had people there at {hour} nobody could name, and one could have been {person}; elsewhere: {by} could only say who was at {place}, and {person} hadn’t said they were there; face: a face nobody could put a name to isn’t a name (it might have been {person}’s); company: {by} had {person} with {by:them} at {hour}; other-place: {by} says {by:they} was at {place} at {hour}, which said nothing about who was at {where}; untrusted: that was {by}’s word against {person}’s, and nothing under {by}’s yet; nowhere: it didn’t put {person} anywhere at {hour} but where they said; second-time: it didn’t touch where {person} said {person:they} was the second time.',
  },
  OFFICE: {
    args: { client: T, clientFull: T, cHe: T, cHis: T, he: T, his: T, p: T, pthey: T, pthem: T, motive: T, behaviour: T, line: T, venue: T, where: T, whereFrom: T, relation: T, keeper: T, x: T, victim: T, victimFull: T, job: T, finder: T, finderWhy: T, scene: T, found: T, police: T, thing: T, thingName: T, breed: T, says: T, guests: T, h0: T, h2: T, resident: T, rtheir: T, said: T },
    speech: true,
    doc: 'A line of the office, the client’s (or, for found, the detective’s narration of what the client said). The arguments are the case’s own words for the line, by kind: relation ({clientFull}, {victimFull}’s {relation}); found ({Victim} was {job}; {finder}, {finderWhy}, found the body in {scene} at {found}; the police called it {police}); clock | window | small-clock ({line}, the client’s own words for when, said whole inside the quotation); pointer, by why ({P}, and {Motive}, or {Pthey} {behaviour}); venue ({venue}); gone (pet: {thing}, my {breed}, from {whereFrom} / lives {where}; item: {thingName}, kept {where}); party (people in at {h0} {says}: {Guests}, nobody else); means, by the way in (told-mat | told-window: sat in {venue} from {h0} until {h2}; spare-nail | spare-tin: {Keeper}, at {x}; latch-key: {Resident}, {rtheir} key); keeper ({Keeper} minds {thing}, at {x}); aside (first | more: {Said}, the client’s afterthoughts, a quotation; {He}, {his} are the client’s). {client} is the client’s name, {cHe} and {cHis} the client’s he and his.',
  },
  REMARK: {
    args: { via: 'place', hour: 'hour', saw: 'person', street: T, from: 'hour', means: T, still: T, keep: T, back: 'hour' },
    speech: true,
    doc: 'Something a person or a watcher mentions besides, in their mouth. passed: walking over to {via} at {hour} they passed {saw} on {street}, going fast, no hat. had: they had {saw} (the pet: {saw:them} is him or her) at their place at {hour}, {keep} ("for her supper"), and put {saw:them} back in the flat just before {back}. there: {means} ("the rat poison on the cellar shelf") was {still} ("there", "on its nail") at {hour}, and they didn’t look again. shift: the watcher came on at {from}; before that they can’t say.',
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
