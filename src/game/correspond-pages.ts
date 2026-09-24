/**
 * M5 §8 — the correspondence checker, run over what the engine renders.
 *
 * Phase 1 proved that every sentence the *generator* writes traces to a field.
 * The engine writes sentences too — a page is three deck cards and a record
 * and a thought — and the same rule holds for them: **the engine must not
 * introduce names or times the model lacks.** A card that names somebody who
 * is not in the case is a card that cannot be traced, and a clock time on a
 * page that no fact on that page accounts for is the engine asserting an hour.
 *
 * What is checked, and what is allowed:
 *
 * - Every block of prose on every page, plus the notes and the presence roll.
 * - The names in it must be people, mentions, places, the detective or the
 *   neighbourhood — or one of the closed list of capitalized words the corpus
 *   is allowed to print, which is the generator's own `KNOWN_WORDS`.
 * - The times in it must be accounted for by a fact the page renders, by an
 *   anchor, or by the coroner's window. The page's facts are the clues it
 *   delivered plus the claimed schedules it printed, because a claimed
 *   timeline is somebody's account and the hours in it are theirs.
 * - The facts themselves are not re-checked: they are the generator's, and
 *   Phase 1 checked them. `check` is given the page's ticks as `allowTicks`
 *   rather than as `facts` for exactly that reason — the engine renders a
 *   claim, it does not make one.
 */

import { TICKS, clock, type Case, type Tick } from '../gen/types.js';
import { check, renderedFacts, type Violation } from '../gen/correspond.js';
import { establishedFrom, threadsFor, type CaseView } from './derive.js';
import { candidateThoughts } from './scene/thought.js';
import type { Block, Page, RunState } from './types.js';
import { recapKeys } from './recap.js';
import { namedIn } from './scene/text.js';
import { ALL_CARDS } from './voice/cards.js';
import * as VOICE_DATA from './voice-data.js';
import * as PLAIN from './voice/plain.js';
import * as OFFICE from './voice/office.js';
import { ROLE_CHARACTER } from '../gen/data/character.js';
import { FIXTURE_CARDS } from '../gen/data/cast.js';

/* ------------------------------------------------------------------ *
 * The engine's own closed vocabulary.
 * ------------------------------------------------------------------ */

/**
 * Every capitalized word the engine is allowed to print that is not a name.
 *
 * The generator's `KNOWN_WORDS` is the same idea and covers the generator's
 * own templates; it does not know about seventeen decks of hand-written noir.
 * A deck card opens on "Whatever", ends on "Don't", and names St. Malachy's
 * and the Woolworth Building, and none of those is a person anybody can trace
 * — they are content, written on purpose, and read by the deck validator.
 *
 * So the engine's list is **derived from the content itself**: every
 * capitalized token that appears literally in a card's text, in one of the
 * hand-written pools in `voice-data.ts`, or in the plain register's own
 * shapes. It is closed in exactly the way the generator's is. A new template
 * that reaches for a new proper noun fails this check until the noun is either
 * written into a card — where the validator can see it — or made into a
 * mention the case owns.
 *
 * `ENGINE_WORDS` is the short hand-written remainder: the words that only
 * appear in a sentence the engine assembles in code, where there is no pool to
 * read them out of.
 */
export const ENGINE_WORDS: readonly string[] = [
  // `page.ts`, the opening note and the notes the grammar writes.
  'Midnight',
  // M11: the client's rundown, in `realize.ts` ("Wait. Other way round.").
  'Wait',
  'Couldn’t',
  'Sit',
  'Two',
  'Eight',
  'Nobody',
  'Somebody',
  'DA',
  'No',
  'There',
  'Say',
  'Which',
  'Whatever',
  'Everything',
  'Go',
  'Ask',
  'Type',
  // The plain register's reported facts and the opening note.
  'Something',
  'People',
  'The',
  'It',
  'From',
  'What',
  'I',
  'This',
  'They',
  'He',
  'She',
  // M10: the pronouns a telling's cards fill in, contracted the way speech is.
  'He’d',
  'She’d',
  'He’s',
  'She’s',
  'He’ll',
  'She’ll',
  'A',
  'An',
];

export interface EngineVocabulary {
  /** Capitalized tokens the content already contains. */
  names: Set<string>;
  /**
   * Place short names a hand-written line uses as a figure of speech — "the
   * girl on the third floor", "the fellow who keeps the newsstand". A phrase a
   * writer wrote is the same in every case and is not a seventh room; what the
   * rule is about is a place name the engine *assembles*, and those all come
   * out of `view.placeById`.
   */
  places: Set<string>;
}

let cachedVocabulary: EngineVocabulary | null = null;

function collectStrings(value: unknown, into: string[], depth = 0): void {
  if (depth > 4) return;
  if (typeof value === 'string') {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, into, depth + 1);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, into, depth + 1);
  }
}

export function engineVocabulary(): EngineVocabulary {
  if (cachedVocabulary) return cachedVocabulary;
  const strings: string[] = [];
  for (const card of ALL_CARDS) strings.push(card.text);
  collectStrings(VOICE_DATA, strings);
  collectStrings(PLAIN, strings);
  // M11: the office's own lines, and the dossier's character lines — the
  // words a person says about their life, written by hand for the type.
  collectStrings(OFFICE, strings);
  collectStrings(ROLE_CHARACTER, strings);
  collectStrings(FIXTURE_CARDS, strings);
  const names = new Set<string>(ENGINE_WORDS);
  const places = new Set<string>();
  for (const text of strings) {
    const rendered = renderedFacts(text);
    for (const token of rendered.names) names.add(token);
    for (const short of rendered.places) places.add(short);
    // The page grammar joins fragments and puts the first letter up: a card
    // written as "collar buttoned, no tie" reaches the page as "Collar
    // buttoned, no tie". The word is the writer's either way.
    const first = /[A-Za-z][A-Za-z'’-]*/.exec(text)?.[0];
    if (first) names.add(`${first.charAt(0).toUpperCase()}${first.slice(1)}`);
    // And the other way about. §5's carrying sentence turns a card's sentence
    // into a clause and puts its first letter down, so a card that opens "The
    // parlour held two boarders" reaches the page as "…, and the parlour held
    // two boarders" — the same phrase the writer wrote, in the same card, and
    // only now spelled the way the place templates spell it.
    const lowered = `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    for (const short of renderedFacts(lowered).places) places.add(short);
  }
  cachedVocabulary = { names, places };
  return cachedVocabulary;
}

/** Everything on a page that is words on paper, with where it came from. */
export function renderedText(view: CaseView, page: Page): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const [i, block] of page.blocks.entries()) {
    const where = `page ${page.n} block ${i}`;
    switch (block.kind) {
      case 'prose':
        out.push({ where: `${where} ${block.voice}`, text: block.text });
        break;
      case 'note':
        out.push({ where: `${where} note`, text: block.text });
        break;
      case 'presence':
        if (block.text) out.push({ where: `${where} presence`, text: block.text });
        break;
      case 'timeline': {
        // The rows are places and hours; the transcript prints them as a table
        // and the book as a list. Either way they are text on the page.
        const rows = block.rows
          .filter((r) => r.placeId !== null)
          .map((r) => view.placeById.get(r.placeId as string)?.shortName ?? '')
          .join(', ');
        out.push({ where: `${where} timeline`, text: rows });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/**
 * Which hours a page is allowed to print.
 *
 * A page may name any hour that a clue it delivered establishes, any hour of a
 * claimed account it took down, and — because a page is read in the context of
 * the run rather than on its own — any hour of a clue already in hand. The
 * coroner's window and the anchors are added by `check` itself.
 */
export function ticksOn(view: CaseView, page: Page, found: readonly string[]): Tick[] {
  const out = new Set<Tick>();
  const add = (t: number): void => {
    if (t >= 0 && t < TICKS) out.add(t as Tick);
  };
  for (const id of found) {
    for (const f of view.findableById.get(id)?.establishes ?? []) {
      if ('tick' in f) add(f.tick);
      // M9: a claim, an absence, a pair's half hours and an anchor's hours
      // are facts over several half hours at once.
      if ('ticks' in f) for (const t of f.ticks) add(t);
    }
    // A clue about somebody's secret may name the hours the secret runs over
    // ("somebody heard a drawer being worked some time after ten o'clock"),
    // which is how the generator checked it at source (`checkCase`). Told in
    // the witness's words it names the same hour.
    const about = view.findableById.get(id)?.aboutSecretOf;
    const owner = about ? view.personById.get(about) : undefined;
    for (const cell of owner?.secret?.cells ?? []) add(cell.tick);
    const partner = owner?.secret?.partnerId ? view.personById.get(owner.secret.partnerId) : undefined;
    for (const cell of partner?.secret?.cells ?? []) add(cell.tick);
  }
  for (const block of page.blocks) {
    if (block.kind !== 'timeline') continue;
    for (const row of block.rows) if (row.placeId !== null) add(row.tick);
  }
  // A page that prints somebody's whole claimed evening prints every hour of
  // the evening, and the evening is twelve half hours long.
  for (const block of page.blocks) {
    if (block.kind === 'timeline') {
      for (let t = 0; t < TICKS; t++) add(t);
      break;
    }
  }
  // The reactive monologue prints the window that is still open — "whatever
  // happened, it happened 9:00 PM to 11:30 PM" — and its two ends are the
  // board rather than any one fact. They are derived from what is in hand, and
  // `establishedFrom` is where they are derived.
  for (const t of establishedFrom(view, [...found], []).deathTicks) add(t);
  // A trope's givens name their own hours, and a given reaches the page in
  // the opening note as well as in the briefing. They are the generator's and
  // were checked at source; here they are what the page is allowed to print.
  for (const f of view.kase.act.givens.facts) {
    if ('tick' in f) add(f.tick);
    if (f.kind === 'timeOfDeath') for (const t of f.ticks) add(t);
  }
  // The briefing states the hour the body was found and the hour of the act,
  // and page one renders the briefing entire.
  const bio = view.kase.victimBio;
  if (bio.discovery) add(bio.discovery.foundTick);
  if (bio.lastSeen) add(bio.lastSeen.tick);
  add(view.kase.act.tick);
  return [...out];
}

/**
 * The spoken hours the content writes as images rather than as claims.
 *
 * §A.3 put the hours on the page in the form people say them, so the page
 * checker now reads spoken hours as claims about the evening — which it has to,
 * or a whole class of assertion stops being checked. Two cards in seventeen
 * decks say an hour out loud as writing rather than as evidence: a face that
 * shuts "like a rolltop desk at six o'clock", and a witness who heard a door
 * "at half past ten". Those were written by hand and are the same in every
 * case, so the phrase around them is matched literally and the hour inside it
 * is taken out before the times are read. Everything else on the page is the
 * engine's or the generator's and is checked.
 */
const IMAGE_HOURS: { phrase: string; hour: string }[] = (() => {
  const out: { phrase: string; hour: string }[] = [];
  const strings: string[] = [];
  for (const card of ALL_CARDS) strings.push(card.text);
  collectStrings(VOICE_DATA, strings);
  collectStrings(PLAIN, strings);
  // M11: the office's own lines, and the dossier's character lines — the
  // words a person says about their life, written by hand for the type.
  collectStrings(OFFICE, strings);
  collectStrings(ROLE_CHARACTER, strings);
  collectStrings(FIXTURE_CARDS, strings);
  const re =
    /(?:\S+\s){0,3}(half past (?:six|seven|eight|nine|ten|eleven)|(?:six|seven|eight|nine|ten|eleven) o['’]clock)(?:\s\S+){0,3}/gi;
  for (const text of strings) {
    for (const m of text.matchAll(re)) {
      out.push({ phrase: m[0], hour: m[1] as string });
    }
  }
  return out;
})();

/** The same text with the content's own spoken hours taken out of it. */
export function withoutImageHours(text: string): string {
  let out = text;
  for (const { phrase, hour } of IMAGE_HOURS) {
    const at = out.indexOf(phrase);
    if (at < 0) continue;
    out = `${out.slice(0, at)}${phrase.split(hour).join('')}${out.slice(at + phrase.length)}`;
  }
  return out;
}

/** Every violation on one rendered page. */
export function checkPage(
  kase: Case,
  view: CaseView,
  page: Page,
  found: readonly string[],
): Violation[] {
  const allowTicks = ticksOn(view, page, found);
  const vocabulary = engineVocabulary();
  const office = view.office.shortName;
  const out: Violation[] = [];
  for (const { where, text: raw } of renderedText(view, page)) {
    const text = withoutImageHours(raw);
    for (const violation of check(kase, text, { where, allowTicks, spoken: true })) {
      // A capitalized word the content already contains is content.
      const quoted = /"([^"]+)"/.exec(violation.detail)?.[1] ?? '';
      if (violation.rule === 'unknown-name' && vocabulary.names.has(quoted)) continue;
      if (violation.rule === 'foreign-place') {
        // §B.1: the office is the engine's seventh room and the generator has
        // never heard of it. It is a place in this case all the same.
        if (quoted === office) continue;
        if (vocabulary.places.has(quoted)) continue;
      }
      out.push(violation);
    }
  }
  return out;
}

/**
 * A violation on a rendered page. The generator's rules, plus the one M6 adds:
 * an errand line that does not trace back to the notebook.
 */
export type PageViolation = Omit<Violation, 'rule'> & {
  rule: Violation['rule'] | 'errand-untraced' | 'thought-untraced' | 'bridge-untraced' | 'telling-untraced' | 'recap-untraced';
};

/**
 * M12 Part 2 — a recap, traced clause by clause.
 *
 * Every clause carries the key of what it asserts, and the key must be one
 * the recap's own derivation finds when it is run again from the notebook as
 * it stood after this page (with everybody in it, so nothing the notebook held
 * is missed). A clause names nobody but the people its key is about (and the
 * victim), no hour but its own, no place but its own; a clause about somebody
 * names somebody the pages so far have put in front of the reader, and "only
 * seen" is said only of somebody a page has shown in person. The opening and
 * closing lines rest on nothing and name nothing at all.
 */
export function checkRecap(view: CaseView, page: Page, state: RunState, found: readonly string[], accounts: readonly string[]): PageViolation[] {
  const beat = (page.beats ?? []).find((b) => b.kind === 'recap' && b.rendered);
  if (!beat) return [];
  const out: PageViolation[] = [];
  const snapshot: RunState = {
    ...state,
    found: [...found],
    accounts: [...accounts],
    confronts: (state.confronts ?? []).filter((r) => r.page <= page.n),
    log: state.log.slice(0, page.n + 1),
  };
  const keys = recapKeys(view, snapshot, true);
  // Who the reader has met on a page so far, or read about in a find.
  const pages = state.log.slice(0, page.n + 1);
  const shown = new Set<string>();
  const known = new Set<string>([view.victim.id, view.client.id]);
  for (const pg of pages) {
    for (const b of pg.beats ?? []) {
      if (b.kind === 'recap') continue;
      for (const id of b.personIds ?? []) known.add(id);
      if (b.kind === 'presence' || b.kind === 'exchange' || b.kind === 'confront' || b.kind === 'rundown') {
        for (const id of b.personIds ?? []) shown.add(id);
      }
    }
  }
  // Named in the prose so far, the recap's own words aside.
  const prose = pages.flatMap((pg) =>
    pg.blocks.flatMap((b) => (b.kind === 'prose' && b.voice !== 'recap') || b.kind === 'note' ? [b.text] : []),
  );
  for (const id of namedIn(view, prose)) known.add(id);
  for (const id of found) {
    const clue = view.findableById.get(id);
    if (!clue) continue;
    if (clue.source.type === 'person') known.add(clue.source.personId);
    for (const f of clue.establishes) {
      if ('personId' in f) known.add(f.personId);
      if ('personIds' in f) for (const q of f.personIds) known.add(q);
    }
    for (const q of view.kase.people) if (new RegExp(`\\b${q.surname}\\b`).test(clue.text)) known.add(q.id);
  }
  const where = `page ${page.n} recap`;
  const surnames = view.kase.people.map((q) => ({ id: q.id, surname: q.surname }));
  for (const clause of beat.clauses ?? []) {
    const fail = (detail: string): void => {
      out.push({ where, rule: 'recap-untraced', detail, text: clause.text });
    };
    let bare = clause.text;
    for (const pl of view.places) bare = bare.split(pl.shortName).join('');
    const names = surnames.filter((q) => new RegExp(`\\b${q.surname}\\b`).test(bare)).map((q) => q.id);
    const times = renderedFacts(clause.text, { spoken: true }).times;
    const places = view.places.filter((pl) => clause.text.toLowerCase().includes(pl.shortName.toLowerCase())).map((pl) => pl.id);
    const hours = new Set(clause.ticks.map((t) => clock(t as Tick)));
    if (clause.key.startsWith('frame|')) {
      if (names.length > 0) fail('the frame names somebody');
      if (times.length > 0) fail('the frame names an hour');
      if (places.length > 0) fail('the frame names a place');
      continue;
    }
    for (const part of clause.key.split('+')) if (!keys.has(part)) fail(`asserts ${part}, which the notebook does not hold`);
    const allowed = new Set([...clause.personIds, view.victim.id]);
    for (const id of names) if (!allowed.has(id)) fail(`names somebody the clause is not about (${id})`);
    for (const id of clause.personIds) if (!known.has(id)) fail(`is about somebody no page has put in front of the reader (${id})`);
    if (clause.key.startsWith('seen|') && !clause.personIds.every((id) => shown.has(id))) fail('"only seen" of somebody no page has shown');
    for (const t of times) if (!hours.has(t)) fail(`says ${t}, which is not the clause's own hour`);
    for (const id of places) if (!clause.placeIds.includes(id)) fail(`names a place the clause is not about (${id})`);
  }
  return out;
}

/**
 * M10 §A.1 — a telling, traced. Its fact-bearing sentences may name only the
 * hours of the family's own facts and only the people those facts are about
 * (or that the clues name); the question, the grounding, the follow-up, the
 * tail, the frame and the note assert no case fact at all: no hour, no place
 * by name, nobody but the witness and the one the family is about.
 */
export function checkTelling(view: CaseView, page: Page): PageViolation[] {
  const out: PageViolation[] = [];
  const beats = page.beats ?? [];
  const surnames = view.kase.people.map((p) => ({ id: p.id, surname: p.surname }));
  const namesIn = (text: string): string[] => {
    let bare = text;
    for (const pl of view.places) bare = bare.split(pl.shortName).join('');
    return surnames.filter((p) => new RegExp(`\\b${p.surname}\\b`).test(bare)).map((p) => p.id);
  };
  const timesIn = (text: string): string[] => renderedFacts(text, { spoken: true }).times;
  const placesIn = (text: string): string[] =>
    view.places.filter((pl) => text.toLowerCase().includes(pl.shortName.toLowerCase())).map((pl) => pl.shortName);
  for (const [i, b] of beats.entries()) {
    if (!b.rendered || (b.kind !== 'telling' && b.kind !== 'note')) continue;
    const where = `page ${page.n} beat ${i} ${b.kind}`;
    const fail = (detail: string, text: string): void => {
      out.push({ where, rule: 'telling-untraced', detail, text });
    };
    // The victim, whom every page may name (as the thoughts and bridges may).
    const allowed = new Set<string>([...(b.personIds ?? []), view.victim.id]);
    const clean = (text: string | undefined, part: string): void => {
      if (!text) return;
      for (const t of timesIn(text)) fail(`${part} names an hour (${t})`, text);
      for (const pl of placesIn(text)) fail(`${part} names a place (${pl})`, text);
      for (const id of namesIn(text)) if (!allowed.has(id)) fail(`${part} names somebody the family is not about`, text);
    };
    if (b.kind === 'note') {
      clean(b.text, 'the note');
      continue;
    }
    for (const id of b.clueIds ?? []) if (!page.found.includes(id)) fail(`tells ${id}, which this page did not hand over`, b.text ?? '');
    const parts = b.parts;
    if (!parts) {
      fail('a telling with no parts', b.text ?? '');
      continue;
    }
    // The fact-bearing sentences: the family's hours, the family's people.
    const ticks = new Set((b.ticks ?? []).map((t) => clock(t as Tick)));
    const people = new Set<string>(allowed);
    for (const id of b.clueIds ?? []) {
      const clue = view.findableById.get(id);
      for (const f of clue?.establishes ?? []) {
        if ('personId' in f) people.add(f.personId);
        if ('personIds' in f) for (const p of f.personIds) people.add(p);
        if (f.kind === 'absentFrom') for (const p of f.except) people.add(p);
        if (f.kind === 'claims' && f.with) people.add(f.with);
      }
      for (const p of namesIn(clue?.text ?? '')) people.add(p);
    }
    for (const sentence of parts.told) {
      // A record's own sentence carries the record's hours; the page check holds those.
      if (!parts.fromRecord) {
        for (const t of timesIn(sentence)) if (!ticks.has(t)) fail(`says ${t}, which none of the family’s facts has`, sentence);
      }
      for (const id of namesIn(sentence)) if (!people.has(id)) fail('names somebody none of the family’s facts is about', sentence);
    }
    clean(parts.question, 'the question');
    clean(parts.grounding, 'the grounding');
    clean(parts.followup, 'the follow-up');
    clean(parts.tail, 'the tail');
    clean(parts.frame?.replace('{told}', ''), 'the frame');
  }
  return out;
}

/**
 * M6 §2.1 — the errand line, traced.
 *
 * The line is derived and never invented, so every part of it has somewhere
 * to go back to: the clue in the notebook that sent him (found before this
 * page, and naming the target in its `leadsTo`), the lead it opened (not yet
 * found, and in this room), the person who said it, the person he came to
 * ask, and what about — which is in the lead's own words, and the lead's own
 * words are printed in the notebook's list of leads. A line with no lead
 * behind it has to be a room nobody sent him to; a return has to be a return.
 * And no person the trace does not account for may be named in it at all.
 */
export function checkErrand(
  view: CaseView,
  page: Page,
  foundBefore: readonly string[],
  visitedBefore: ReadonlySet<string>,
): PageViolation[] {
  const trace = page.errand;
  if (!trace) return [];
  const out: PageViolation[] = [];
  const where = `page ${page.n} errand`;
  const fail = (detail: string): void => {
    out.push({ where, rule: 'errand-untraced', detail, text: trace.text });
  };
  const first = page.blocks[0];
  if (!first || first.kind !== 'prose' || first.voice !== 'errand' || first.text !== trace.text) {
    fail('the errand line is not the first thing on the page, word for word');
  }
  const here = view.placeById.get(page.at);
  if (trace.slots.place !== here?.shortName) fail(`{place} is "${trace.slots.place}", not here`);
  const have = new Set(foundBefore);
  const leadsHere = threadsFor(view, [...foundBefore]).filter((t) => t.placeId === page.at);

  const allowed = new Set<string>();
  switch (trace.kind) {
    case 'office':
      if (page.at !== view.office.id) fail('an office errand away from the office');
      break;
    case 'none':
    case 'return':
      if (leadsHere.length > 0) fail(`says nobody sent him, and ${leadsHere.length} lead(s) point here`);
      if (trace.kind === 'none' && visitedBefore.has(page.at)) fail('a first visit to a room already visited');
      if (trace.kind === 'return' && !visitedBefore.has(page.at)) fail('a return to a room never visited');
      break;
    case 'scene': {
      const source = trace.sourceId ? view.findableById.get(trace.sourceId) : undefined;
      if (!source || source.kind !== 'client' || !have.has(source.id)) {
        fail('the scene errand is not the client’s brief in hand');
      }
      if (trace.slots.name !== view.client.surname) fail(`{name} is not the client`);
      if (trace.targetId && !page.found.includes(trace.targetId)) {
        fail('the scene errand points at something this page did not hand over');
      }
      allowed.add(view.client.surname);
      break;
    }
    case 'lead': {
      const source = trace.sourceId ? view.findableById.get(trace.sourceId) : undefined;
      const target = trace.targetId ? view.findableById.get(trace.targetId) : undefined;
      if (!source || !have.has(source.id)) {
        fail('the clue that sent him is not in the notebook');
        break;
      }
      if (!target || !source.leadsTo.includes(target.id)) {
        fail('the clue that sent him does not lead where he went');
        break;
      }
      if (have.has(target.id)) fail('the lead was already taken');
      if (target.place !== page.at) fail('the lead is not in this room');
      if (leadsHere.length !== trace.leads) fail(`${trace.leads} leads claimed, ${leadsHere.length} open`);
      // §2.1 step 2: the newest opener among the leads here wins.
      const at = (id: string): number => foundBefore.lastIndexOf(id);
      for (const t of leadsHere) {
        for (let i = foundBefore.length - 1; i > at(source.id); i--) {
          const c = view.findableById.get(foundBefore[i] as string);
          if (c?.leadsTo.includes(t.clueId)) {
            fail(`a newer clue (${c.id}) opened a lead here`);
            break;
          }
        }
      }
      const other = trace.text.includes('And there was the other thing.');
      if (other !== (trace.leads === 2)) fail('"the other thing" without exactly two leads');
      if (source.source.type === 'person') {
        const said = view.personById.get(source.source.personId)?.surname;
        if (trace.because !== 'said' || trace.slots.name !== said) fail('{name} is not who said it');
        if (said) allowed.add(said);
      } else {
        if (trace.because === 'said') fail('a place clue is not something somebody said');
        const from = view.placeById.get(source.source.placeId)?.shortName;
        if (trace.slots.from !== undefined && trace.slots.from !== from) fail('{from} is not where it was found');
      }
      if (trace.for.startsWith('ask-')) {
        if (target.source.type !== 'person') {
          fail('an ask errand on a lead nobody answers');
          break;
        }
        const who = view.personById.get(target.source.personId)?.surname ?? '';
        if (trace.slots.who !== who) fail('{who} is not the person the lead says to ask');
        allowed.add(who);
        const subject = trace.slots.subject ?? '';
        const topic = target.source.topic.toLowerCase();
        const inTopic = topic.includes(subject.toLowerCase());
        if (!inTopic && !(trace.for === 'ask-evening' && subject === who)) {
          fail(`{subject} "${subject}" is not in the lead "${target.source.topic}"`);
        }
        if (trace.for === 'ask-person') allowed.add(subject);
      } else if (trace.for === 'search-room' || trace.for === 'search-thing') {
        if (target.source.type !== 'place') fail('a search errand on a lead somebody answers');
        if (trace.for === 'search-thing') {
          const subject = trace.slots.subject ?? '';
          const text = (source.textRecord ?? source.text).toLowerCase();
          if (!text.includes(subject.toLowerCase())) fail(`{subject} "${subject}" is not in the clue that sent him`);
        }
      }
      break;
    }
  }
  // M8 §7: a name on the page gets its clause, and the clause of anybody in
  // the case is their relation to the victim, whom every page may name.
  allowed.add(view.victim.surname);
  // Nobody the trace does not account for is named in the line. A room named
  // for somebody ("Ruggiero’s") is a place, not a person.
  let line = trace.text;
  for (const pl of view.places) line = line.split(pl.shortName).join('');
  for (const person of view.kase.people) {
    if (allowed.has(person.surname)) continue;
    if (new RegExp(`\\b${person.surname}\\b`).test(line)) {
      fail(`names ${person.surname}, whom the trace does not account for`);
    }
  }
  return out;
}

/**
 * M8 §5–§6 — the thoughts and the bridge, traced.
 *
 * A thought is a statement of inference and must trace to the clue facts and
 * the state that licensed it: every clue it cites is in the notebook, and the
 * planner's own derivation, run again from the notebook alone, produces the
 * same class about the same people. `observer-placed` is checked against the
 * truth timeline a second time, because it is the one class allowed to read
 * it. A bridge names only a lead that is actually open once the page is read,
 * opened by a clue this page delivered, asked of the lead's own source, about
 * somebody the notebook now knows. Neither may name a person its trace does
 * not account for, beyond the victim.
 */
export function checkBeats(
  view: CaseView,
  page: Page,
  foundBefore: readonly string[],
  accountsBefore: readonly string[],
  accountsAfter: readonly string[],
  metAfter: ReadonlySet<string>,
): PageViolation[] {
  const beats = page.beats ?? [];
  if (beats.length === 0) return [];
  const out: PageViolation[] = [];
  const foundAfter = [...foundBefore, ...page.found];
  const have = new Set(foundAfter);
  const newClues = page.found
    .map((id) => view.findableById.get(id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);
  const candidates = candidateThoughts({
    view,
    newClues,
    foundBefore,
    foundAfter,
    accountsBefore,
    accountsAfter,
  });
  const namedOnly = (text: string | undefined, ids: readonly string[], where: string, rule: PageViolation['rule']): void => {
    if (!text) return;
    // A room named for somebody ("Ruggiero’s") is a place, not a person.
    let bare = text;
    for (const pl of view.places) bare = bare.split(pl.shortName).join('');
    text = bare;
    const allowed = new Set<string>([view.victim.surname, ...ids.map((id) => view.personById.get(id)?.surname ?? '')]);
    for (const person of view.kase.people) {
      if (allowed.has(person.surname)) continue;
      // A clause the name pass put on somebody the trace names is the case's.
      if (new RegExp(`\\b${person.surname}\\b`).test(text)) {
        out.push({ where, rule, detail: `names ${person.surname}, whom the trace does not account for`, text });
      }
    }
  };
  for (const [i, b] of beats.entries()) {
    if (!b.rendered) continue;
    const where = `page ${page.n} beat ${i} ${b.kind}`;
    if (b.kind === 'thought') {
      const fail = (detail: string): void => {
        out.push({ where, rule: 'thought-untraced', detail, text: b.text ?? '' });
      };
      for (const id of b.clueIds ?? []) if (!have.has(id)) fail(`cites ${id}, which is not in the notebook`);
      const cls = b.tag ?? '';
      const [first, second] = b.personIds ?? [];
      if (cls === 'nothing') {
        if (page.found.length > 0) fail('"nothing" on a page that found something');
      } else if (cls === 'view') {
        // M11 §A.5: on the client's rundown, the room is the one she named.
        if (!beats.some((x) => (x.kind === 'presence' || x.kind === 'rundown') && (x.personIds ?? []).includes(first ?? ''))) {
          fail('a view of somebody who is not in the room');
        }
      } else if (cls === 'context') {
        // Context asserts nothing, which is its whole licence.
      } else if (cls === 'confronted') {
        // M9 §3: what the detective did with what was said, on the page that
        // put a fact to somebody — and about that somebody.
        const put = beats.find((x) => x.kind === 'confront');
        if (page.shape !== 'confront' || !put || (put.personIds ?? [])[0] !== first) {
          fail('a confrontation the page did not have');
        }
      } else if (cls === 'contradicts' && page.found.length === 0) {
        // An evening just taken down, against a placement already in hand.
        const clue = view.findableById.get((b.clueIds ?? [])[0] ?? '');
        const claimed = view.claimedOf.get(first ?? '') ?? [];
        const ok = (clue?.establishes ?? []).some(
          (f) =>
            (f.kind === 'personAt' || f.kind === 'personNotAt') &&
            f.personId === first &&
            (claimed[f.tick] ?? null) !== null &&
            (f.kind === 'personAt' ? claimed[f.tick] !== f.place : claimed[f.tick] === f.place),
        );
        if (!ok || !accountsAfter.includes(first ?? '')) fail('a contradiction the notebook does not hold');
      } else {
        const match = candidates.some(
          (c) =>
            c.cls === cls &&
            (c.subjectId === undefined || (b.personIds ?? []).includes(c.subjectId)) &&
            (c.sourceId === undefined || (b.personIds ?? []).includes(c.sourceId)),
        );
        if (!match) fail(`${cls} is not what the page's clues and the notebook license`);
        if (cls === 'observer-placed') {
          const cand = candidates.find((c) => c.cls === 'observer-placed' && (b.personIds ?? []).includes(c.sourceId ?? ''));
          const truth = cand ? view.truthOf.get(cand.sourceId ?? '')?.[cand.tick ?? -1] : undefined;
          if (!cand || truth !== cand.placeId) fail('observer-placed where the truth does not put the observer');
        }
      }
      void second;
      namedOnly(b.text, b.personIds ?? [], where, 'thought-untraced');
    }
    if (b.kind === 'bridge') {
      const fail = (detail: string): void => {
        out.push({ where, rule: 'bridge-untraced', detail, text: b.text ?? '' });
      };
      const target = view.findableById.get(b.targetId ?? '');
      const opener = (b.clueIds ?? [])[0];
      if (!target) {
        fail('bridges to nothing');
        continue;
      }
      if (have.has(target.id)) fail('bridges to a lead already taken');
      if (!opener || !page.found.includes(opener)) fail('the lead was not opened by this page');
      else if (!view.findableById.get(opener)?.leadsTo.includes(target.id)) fail('the opener does not lead there');
      const [who, subject] = b.personIds ?? [];
      if (target.source.type === 'person') {
        if (who !== target.source.personId) fail('{who} is not the lead’s source');
        if (subject !== undefined) {
          const named = target.source.topic.toLowerCase().includes((view.personById.get(subject)?.surname ?? '§').toLowerCase());
          const open = threadsFor(view, foundAfter).some((t) =>
            t.label.toLowerCase().includes((view.personById.get(subject)?.surname ?? '§').toLowerCase()),
          );
          if (!named) fail('{subject} is not in the lead');
          if (!metAfter.has(subject) && !open) fail('{subject} is somebody the notebook does not know');
        }
      }
      namedOnly(b.text, b.personIds ?? [], where, 'bridge-untraced');
    }
  }
  return out;
}

/** Every violation in a whole run, page by page as the player read them. */
export function checkRun(view: CaseView, state: RunState): PageViolation[] {
  const out: PageViolation[] = [];
  const found: string[] = [];
  const accounts: string[] = [];
  const visited = new Set<string>();
  for (const page of state.log) {
    out.push(...checkErrand(view, page, [...found], visited));
    const accountsAfter = [
      ...accounts,
      ...page.blocks.flatMap((b) => (b.kind === 'timeline' && !accounts.includes(b.personId) ? [b.personId] : [])),
      // M9: a tiered case's evening is a clue, and taking it down is an account
      // in hand exactly as the reducer counts one (M10: Raw's accounts are on
      // the route now, and at Raw a placement against one is still called a
      // contradiction).
      ...page.found.flatMap((id) => {
        const c = view.findableById.get(id);
        return c?.kind === 'account' && c.source.type === 'person' && !accounts.includes(c.source.personId)
          ? [c.source.personId]
          : [];
      }),
    ];
    const met = new Set<string>(state.met);
    out.push(...checkBeats(view, page, [...found], [...accounts], accountsAfter, met));
    out.push(...checkTelling(view, page));
    out.push(...checkRecap(view, page, state, [...found, ...page.found], [...new Set(accountsAfter)]));
    found.push(...page.found);
    accounts.splice(0, accounts.length, ...new Set(accountsAfter));
    visited.add(page.at);
    out.push(...checkPage(view.kase, view, page, found));
  }
  return out;
}

/** The blocks a page turns into, for a test that wants to count them. */
export function pageBlocks(page: Page): Block[] {
  return page.blocks;
}
