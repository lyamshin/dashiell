/**
 * M13 — the moments, as sheets fill them.
 *
 * `sheets.ts` runs a sheet against a set of holes. This file supplies the
 * holes for each moment the spec names, from the planned beats and the decks:
 *
 *   arrival + company   a first visit with nobody's finds: the place, a thing
 *                       in it, and who is there — the whole page but the reason
 *                       (golden: `docs/golden/sheets-arrival.md`, Sheet A)
 *   ask, confront       the approach and the look before the question, and the
 *                       last word after the answer
 *   telling             a line before a family is told, and one after
 *   search              how he went through the room, and a last word
 *   recap, office       the frame round what the notebook holds; the office's
 *                       opening and its last line
 *
 * Every required beat still lands, in a hole or in the sheet's text, and the
 * trace says where: an arrival sheet claims the establish, the presence and the
 * thoughts, and marks each with the words that said it.
 */

import type { Rng } from '../../gen/rng.js';
import type { Id, Person } from '../../gen/types.js';
import { tierNumber } from '../m9.js';
import type { BeatTrace, ProseVoice, SheetUse } from '../types.js';
import { DECKS, shortOf, tagIs, tagOf, type Card, type CardExport, type Match } from '../voice/cards.js';
import { characterRole, characterSlots } from '../voice/character.js';
import { genderHintOf, pronounOf, temperOf } from '../voice/cast.js';
import type { Scene, Stage } from '../voice/page.js';
import { hourBandOf } from '../voice/page.js';
import type { Beat, Plan, PresencePerson } from './plan.js';
import { doingOf, foundWhat, hourSaid, plainAction } from './people.js';
import { relationPlain } from './lines.js';
import {
  WATCH_CLAUSE,
  approachOf,
  closeOf,
  crowdLine,
  lookOf,
  searchActOf,
  deal,
  endStop,
  placeKey,
  presenceLine,
  sightOf,
  thoughtLine,
  capitalize,
} from './realize.js';
import {
  callbackRoll,
  canPay,
  fillSheet,
  pluralThing,
  chooseSheet,
  fitsSense,
  newRun,
  rolesNeeded,
  runSheet,
  slotsIn,
  type Flags,
  type Holes,
  type Moment,
  type OutPara,
  type Piece,
  type Sheet,
  type SheetPart,
  type SheetRun,
} from './sheets.js';
import { bandOf, isSubjectless, sentencesOf } from './text.js';
import { settingOf } from './stage.js';
import { COUNT_WORDS } from './lines.js';

/**
 * One page's sheets: the roll (does this page pay anything off?), the roles
 * its sheets have bound so far — the arrival's prop is the company's to bring
 * back, the question's trait the last word's — and what it used.
 */
export interface PageSheets {
  rolled: boolean;
  /** A run for the next sheet on the page, sharing the page's roles. */
  start(moment: Moment, flags: Flags): SheetRun;
  /** Remember a sheet the page used (and the night, like the dealer). */
  used(id: string, moment: Moment, fitting?: number): void;
  /** Roles on the page, bound and in words. */
  roles(): SheetRun | null;
  traces(): SheetUse[];
}

export function newPageSheets(stage: Stage): PageSheets {
  const rolled = callbackRoll(stage.view.kase.seed, stage.pageIndex);
  let shared: SheetRun | null = null;
  const uses: { id: string; moment: Moment; fitting?: number }[] = [];
  return {
    rolled,
    start(moment, flags) {
      const run = newRun(moment, flags, rolled, shared ?? undefined);
      shared = run;
      return run;
    },
    used(id, moment, fitting) {
      uses.push({ id, moment, ...(fitting === undefined ? {} : { fitting }) });
      noteSheet(stage, id);
    },
    roles() {
      return shared;
    },
    traces() {
      const paid = (shared?.paid.length ?? 0) > 0;
      return uses.map((u) => ({ id: u.id, moment: u.moment, callback: paid, rolled, ...(u.fitting === undefined ? {} : { fitting: u.fitting }) }));
    },
  };
}

const CARD_BY_ID = new Map<string, Card>();
function cardById(id: string): Card | undefined {
  if (CARD_BY_ID.size === 0) for (const deck of Object.values(DECKS)) for (const c of deck) CARD_BY_ID.set(c.id, c);
  return CARD_BY_ID.get(id);
}

/**
 * What somebody was doing, as a sheet says it: the activity up to its card's
 * `cut` when it has one ("reading a folded newspaper"), the whole of it else.
 */
export function cutActivity(activity: { text: string; cardId: string } | undefined): string | undefined {
  if (!activity) return undefined;
  const card = activity.cardId ? cardById(activity.cardId) : undefined;
  if (!card?.cut) return activity.text;
  const at = activity.text.indexOf(card.cut);
  return at < 0 ? activity.text : `${activity.text.slice(0, at + card.cut.length).replace(/[,;:\s]+$/, '')}.`;
}

/** A short stable key for a line of sheet text, for the dealer's memory. */
function lineKey(template: string): string {
  let h = 2166136261;
  for (let i = 0; i < template.length; i++) {
    h ^= template.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `line:${(h >>> 0).toString(36)}`;
}

/** The dealer remembers the sheets' own lines, as it does cards: said tonight or not. */
export function lineMemory(dealer: Stage['dealer']): Pick<Holes, 'fresh' | 'spend'> {
  return {
    fresh: (t) => !dealer.used(lineKey(t)),
    spend: (t) => dealer.note(lineKey(t)),
  };
}

/** Tonight's sheets, oldest first, off the dealer's memory. */
export function sheetHistory(stage: Stage): string[] {
  return stage.dealer.notedLike('sheet:').map((id) => id.slice('sheet:'.length).split('#')[0] as string);
}

/** Remember a sheet the way the dealer remembers a card: tonight, in order. */
export function noteSheet(stage: Stage, id: string): void {
  stage.dealer.note(`sheet:${id}#${stage.pageIndex}#${stage.dealer.notedLike('sheet:').length}`);
}

/** The flags every moment shares: the place, the case, the tier, the roll. */
export function baseFlags(stage: Stage, callback: boolean): Flags {
  const place = stage.view.placeById.get(stage.at);
  const tier = tierNumber(stage.view);
  return {
    place: stage.at,
    placeKind: place?.kind ?? 'semi',
    setting: settingOf(stage.view, stage.at),
    caseType: stage.view.kase.act.type,
    tier: tier === null ? 'none' : String(tier),
    band: tier === null ? 'none' : tier <= 1 ? 'easy' : tier <= 4 ? 'middle' : 'hard',
    hour: bandOf(stage.minutes),
    callback,
  };
}

/** A person's slots under a role name: `{tell}`, `{tell.He}`, `{tell.doing}`… */
export function personRoleSlots(
  stage: Stage,
  role: string,
  person: Person,
  activity?: string,
): Record<string, string | undefined> {
  const she = genderHintOf(person) === 'f';
  const doing = activity ? doingOf(activity, person.surname) : null;
  const plain = doing ? plainAction(doing.trim().replace(/\.$/, '')) : undefined;
  return {
    [role]: person.surname,
    [`${role}.he`]: she ? 'she' : 'he',
    [`${role}.He`]: she ? 'She' : 'He',
    [`${role}.him`]: she ? 'her' : 'him',
    [`${role}.his`]: she ? 'her' : 'his',
    [`${role}.His`]: she ? 'Her' : 'His',
    [`${role}.man`]: she ? 'woman' : 'man',
    [`${role}.doing`]: plain,
    [`${role}.act`]: plain ? `${person.surname} was ${plain}` : undefined,
    [`${role}.sight`]: sightOf(person),
    [`${role}.recall`]: stage.cast.portraits[person.id]?.pair?.action,
    [`${role}.hour`]: hourSaid(stage.minutes),
  };
}

/** The deck side of every moment: a card for a hole, preferring one that exports `want`. */
export function deckPiece(stage: Stage, part: SheetPart, want: string | null, who: Record<string, Person | undefined>, extraSlots: Record<string, string | undefined> = {}): Piece | null {
  const deck = part.deck as Parameters<typeof deal>[1];
  const pool = DECKS[deck];
  if (!pool || pool.length === 0) return null;
  const person = part.of ? who[part.of] : undefined;
  if (part.of && !person) return null;
  const tagsFit = (c: Card): boolean =>
    Object.entries(part.tags ?? {}).every(([k, v]) => tagIs(deck, c, k, v));
  const exports = (c: Card): boolean => want === null || c.exports?.[want] !== undefined;
  let ladder: Match[] = [];
  let slots: Record<string, string | undefined> = { place: stage.view.placeById.get(stage.at)?.shortName, ...extraSlots };
  switch (deck) {
    case 'place-ambient': {
      const band = bandOf(stage.minutes);
      // A card that opens on "It" or "Its" leans on an establish card before it;
      // anywhere else (the head of a question's page) it has nothing to lean on.
      const leans = (c: Card): boolean => extraSlots['§alone'] !== undefined && /^(?:It|Its|They|Their)\b/.test(c.text);
      // A room's texture is never read twice in a night (Night Hone 1): a card read tonight is not dealt again, and the hole goes empty.
      const at = (c: Card): boolean => tagIs('place-ambient', c, 'place', stage.at) && tagsFit(c) && !leans(c) && !stage.dealer.used(c.id);
      const exact = (c: Card): boolean => at(c) && tagOf('place-ambient', c, 'band') === band;
      const any = (c: Card): boolean => at(c) && tagOf('place-ambient', c, 'band') === 'any';
      ladder = [(c) => exact(c) && exports(c), (c) => any(c) && exports(c)];
      if (part.form !== 'bind' || want === null) ladder.push(exact, any);
      break;
    }
    case 'character': {
      if (!person) return null;
      const role = characterRole(person);
      if (role === null) return null;
      slots = { ...slots, ...characterSlots(stage.view, person) };
      const s = slots;
      const ok = (c: Card): boolean =>
        tagIs('character', c, 'role', role) &&
        tagsFit(c) &&
        !sentencesOf(c.text.replace(/\{(\w+)\}/g, (_m, k: string) => s[k] ?? k)).some(isSubjectless);
      ladder = [(c) => ok(c) && exports(c), ok];
      break;
    }
    case 'look': {
      if (!person) return null;
      const role = person.kind === 'fixture' && person.fixtureRole ? person.fixtureRole : (person.archetypeId ?? 'any');
      const she = pronounOf(person) === 'she';
      slots = { ...slots, name: person.surname, he: she ? 'she' : 'he', He: she ? 'She' : 'He', him: she ? 'her' : 'him', his: she ? 'her' : 'his', man: she ? 'woman' : 'man' };
      const l = (c: Card, tag: string, v: string): boolean => tagOf('look', c, tag) === v;
      ladder = [
        (c) => l(c, 'again', 'no') && l(c, 'role', role) && tagsFit(c) && exports(c),
        (c) => l(c, 'again', 'no') && l(c, 'role', role) && tagsFit(c),
        (c) => l(c, 'again', 'no') && l(c, 'role', 'any') && tagsFit(c),
      ];
      break;
    }
    case 'greet': {
      if (!person) return null;
      const purpose = stage.view.kase.clientBrief.purpose;
      const temper = temperOf(stage.cast, person.id);
      const she = pronounOf(person) === 'she';
      slots = { ...slots, name: person.surname, he: she ? 'she' : 'he', He: she ? 'She' : 'He', him: she ? 'her' : 'him', his: she ? 'her' : 'his', victim: stage.view.victim.surname };
      const g = (c: Card, tag: string, v: string): boolean => tagOf('greet', c, tag) === v;
      ladder = [
        (c) => g(c, 'purpose', purpose) && tagIs('greet', c, 'temper', temper) && tagsFit(c),
        (c) => g(c, 'purpose', 'any') && tagIs('greet', c, 'temper', temper) && tagsFit(c),
      ];
      break;
    }
    default: {
      if (person) {
        const she = pronounOf(person) === 'she';
        slots = { ...slots, name: person.surname, he: she ? 'she' : 'he', He: she ? 'She' : 'He', him: she ? 'her' : 'him', his: she ? 'her' : 'his' };
      }
      ladder = [(c) => tagsFit(c) && exports(c), tagsFit];
    }
  }
  if (part.form === 'named' && person) {
    // "The regulars said Hargrove poured an honest drink": the card's first
    // pronoun is the person's name, when other people stand between it and them.
    const s0 = slots;
    // Not "Fairbanks’d": a pronoun with something run on to it stays a pronoun, so the card is not dealt named.
    const firstSlot = (c: Card): string | undefined => {
      const m = /\{(He|he|him|his)\}([’']?)/.exec(c.text);
      return m && m[2] === '' ? m[1] : undefined;
    };
    ladder = ladder.map((m) => (c: Card) => m(c) && firstSlot(c) !== undefined);
    const drawnNamed = deal(stage, deck, ladder, s0);
    if (!drawnNamed) return null;
    const card = cardById(drawnNamed.cardId) as Card;
    const which = firstSlot(card) as string;
    const name = which === 'his' ? `${person.surname}’s` : person.surname;
    const once = card.text.replace(`{${which}}`, name);
    const text = once.replace(/\{(\w+)\}/g, (_m, k: string) => s0[k] ?? `{${k}}`);
    return {
      text: text.charAt(0).toUpperCase() + text.slice(1),
      voice: 'presence',
      ...(card.exports ? { exports: card.exports } : {}),
    };
  }
  const drawn = deal(stage, deck, ladder, slots);
  if (!drawn) return null;
  const card = cardById(drawn.cardId);
  const text = part.form === 'short' && card ? shortOf(card, drawn.text) : drawn.text;
  const image = deck === 'place-ambient' || deck === 'establish' || deck === 'arrivals';
  return {
    text: part.form === 'bind' ? '' : text,
    voice: deck === 'place-ambient' ? 'establish' : deck === 'character' ? 'presence' : 'narrator',
    ...(image ? { imageN: sentencesOf(text).length } : {}),
    ...(card?.exports ? { exports: card.exports } : {}),
  };
}

/** The close deck: a line for a role's kind, or a plain one, for this moment. */
export function closeDeckLine(stage: Stage, moment: Moment, role: string | null, exp: CardExport | null, slots: Record<string, string | undefined>): string | null {
  const c = (card: Card, tag: string, want: string): boolean => tagOf('close', card, tag) === want;
  const sheet = (card: Card): boolean => c(card, 'outcome', 'sheet');
  const m = (card: Card): boolean => tagIs('close', card, 'moment', moment);
  const fill: Record<string, string | undefined> = { ...slots };
  if (role !== null && exp !== null) {
    fill[role] = exp.short;
    fill[`${role}Text`] = exp.text;
  }
  const ladder: Match[] =
    role === null || exp === null
      ? [(card) => sheet(card) && m(card) && c(card, 'callback', 'none')]
      : [
          (card) => sheet(card) && m(card) && c(card, 'callback', role) && c(card, 'kind', exp.kind ?? 'thing'),
          (card) => sheet(card) && m(card) && c(card, 'callback', role) && c(card, 'kind', 'any'),
        ];
  const drawn = deal(stage, 'close', ladder, fill);
  return drawn?.text ?? null;
}

/* ------------------------------------------------------------------ *
 * Arrival and company.
 * ------------------------------------------------------------------ */

export interface SheetPage {
  /** Beats the sheets write; the realizer's loop leaves them alone. */
  claimed: Set<number>;
  /** The beat where the sheets' paragraphs go in. */
  at: number;
  paras: OutPara[];
}

type Mark = (i: number, patch: Partial<BeatTrace>) => void;

/**
 * An arrival with nobody's finds (the scene keeps its own page): an arrival
 * sheet for the place and a company sheet for who is there, the second chosen
 * knowing what the first has bound. Null when no sheet fits, and the realizer
 * writes the page the old way.
 */
export function arrivalPage(plan: Plan, stage: Stage, scene: Scene, mark: Mark, gaps: string[], ps: PageSheets): SheetPage | null {
  void scene;
  if (plan.shape !== 'arrive') return null;
  const beats = plan.beats;
  if (beats.some((b) => b.kind === 'find')) return null;
  const iE = beats.findIndex((b) => b.kind === 'establish');
  const iP = beats.findIndex((b) => b.kind === 'presence');
  if (iE < 0 || iP < 0) return null;
  const presence = beats[iP] as Extract<Beat, { kind: 'presence' }>;
  if (presence.scene !== undefined) return null;
  const iW = beats.findIndex((b) => b.kind === 'texture' && b.texture === 'weather');
  const iA = beats.findIndex((b) => b.kind === 'answer');
  const thoughts = beats.flatMap((b, j) => (b.kind === 'thought' ? [j] : []));
  const thoughtAt = (j: number): Extract<Beat, { kind: 'thought' }>['thought'] =>
    (beats[j] as Extract<Beat, { kind: 'thought' }>).thought;
  const { view } = stage;
  const people = presence.people.filter((p) => !p.seen);
  const byId = new Map(people.map((p) => [p.personId, p] as const));
  const personOf = (p: PresencePerson | undefined): Person | undefined => (p ? view.personById.get(p.personId) : undefined);
  const watcherP = people.find((p) => p.why === 'watcher');
  const iObs = thoughts.find((j) => thoughtAt(j).observe !== undefined);
  const obs = iObs === undefined ? undefined : thoughtAt(iObs);
  const tellP = obs?.subjectId ? byId.get(obs.subjectId) : undefined;
  const clientP = people.find((p) => p.why === 'client' && p !== tellP);
  const iWatchView = thoughts.find((j) => thoughtAt(j).cls === 'view' && thoughtAt(j).who === 'watcher');
  const watcher = personOf(watcherP);
  const client = personOf(clientP);
  const tell = personOf(tellP);
  const grouped = people.filter((p) => p.grouped);
  const place = view.placeById.get(stage.at);
  const rolled = ps.rolled;
  const propFresh = (DECKS['place-ambient'] ?? []).some(
    (c) => tagIs('place-ambient', c, 'place', stage.at) && c.exports?.prop !== undefined && !stage.dealer.used(c.id),
  );
  const others = people.filter((p) => p !== watcherP && p !== clientP && p !== tellP);
  const flags: Flags = {
    ...baseFlags(stage, rolled),
    watcher: watcher !== undefined,
    client: client !== undefined,
    tell: tell !== undefined,
    tellWatcher: tell !== undefined && tellP === watcherP,
    tellClient: tell !== undefined && tellP?.why === 'client',
    others: others.length,
    people: people.length,
    crowd: grouped.length >= 2,
    alone: people.length === 0,
    prop: propFresh,
    rundown:
      client !== undefined &&
      people.some((p) => p.personId !== view.client.id && p.personId !== view.victim.id) &&
      (stage.memory?.rundown ?? -1) !== plan.memory.visit,
  };
  const activityOf = (p: PresencePerson | undefined): string | undefined => cutActivity(p?.activity);
  const slots: Record<string, string | undefined> = {
    place: place?.shortName,
    Place: place ? capitalize(place.shortName) : undefined,
    // content/places/rules.md §2.4: a place's epithet, where a sheet has a hole for one.
    'place.epithet': stage.epithet,
    victim: view.victim.surname,
    hour: hourSaid(stage.minutes).replace(/^(?:at|past|after) /, ''),
    ...(watcher ? personRoleSlots(stage, 'watcher', watcher, activityOf(watcherP)) : {}),
    ...(client ? personRoleSlots(stage, 'client', client, activityOf(clientP)) : {}),
    ...(tell ? personRoleSlots(stage, 'tell', tell, activityOf(tellP)) : {}),
  };
  if (tell && obs?.observe) {
    // "the woman who had found Sirkin": the observation's who, as a noun phrase.
    // Not "the stagehand at the Selwyn Dettweiler had told me to start with":
    // a clause with no "who" takes the plain noun.
    const bare = pronounOf(tell) === 'she' ? 'woman' : 'man';
    const noun = obs.observe.tie === 'pointer' ? bare : (obs.observe.trade ?? bare);
    slots['tell.tie'] = `the ${noun} ${tieClauseOf(stage, tell, obs.observe.tie)}`;
  }
  const rolePeople: Record<string, Id> = {
    ...(watcher ? { watcher: watcher.id } : {}),
    ...(client ? { client: client.id } : {}),
    ...(tell ? { tell: tell.id } : {}),
  };
  const who: Record<string, Person | undefined> = { watcher, client, tell };

  // The pieces the page has written, for the trace.
  const presenceTexts: string[] = [];
  const usedPhrases = new Set<string>();
  const beatsClaimed = new Set<number>([iE, iP, ...thoughts]);
  if (iW >= 0) beatsClaimed.add(iW);
  if (iA >= 0) beatsClaimed.add(iA);
  let reserved = new Set<Id>();
  /** People a list said by count ("two men I didn't know"), not by name. */
  const counted = new Set<Id>();
  let viewsCovered = new Set<number>();

  const personLine = (p: PresencePerson, form: string | undefined, part: SheetPart, run: SheetRun): string | null => {
    const person = personOf(p) as Person;
    const act = slotsFor(p);
    switch (form) {
      case 'activity':
        return endStop(p.activity.text);
      case 'recall': {
        const action = stage.cast.portraits[p.personId]?.pair?.action;
        return action ?? null;
      }
      case 'placed': {
        const plain = act.plain;
        if (!plain) return presenceLine(stage, p);
        // The prop places two people at most: past that a room is a list of
        // distances from one lamp (the fan came up five times on one page).
        if (usedPhrases.size >= 2) return endStop(p.activity.text);
        const pool = (part.pool ?? []).filter((t) => !usedPhrases.has(t));
        const slotsHere: Record<string, string | undefined> = {
          ...slots,
          he: pronounOf(person),
          his: pronounOf(person) === 'she' ? 'her' : 'his',
          him: pronounOf(person) === 'she' ? 'her' : 'him',
        };
        const fillable = pool
          .map((t) => ({ t, filled: fillWithRoles(t, slotsHere, run) }))
          .filter((x) => x.filled !== null);
        if (fillable.length === 0) return presenceLine(stage, p);
        const pick = fillable[stage.dealer.random.int(fillable.length)] as { t: string; filled: { text: string; roles: string[] } };
        usedPhrases.add(pick.t);
        for (const r of pick.filled.roles) if (run.introduced.has(r) && !run.paid.includes(r)) run.paid.push(r);
        // Where they already are ("by the light that was there") and where
        // the prop puts them are two phrases, with a comma between.
        const placedAlready = /\b(?:by|at|in|on|under|behind|beside|near|over|against|along|across|inside|outside|through)\b/.test(plain);
        const sep = placedAlready ? ', ' : ' ';
        // First sight of somebody the case has: what anybody can see (M11 §A.2).
        const seen = p.firstSight && person.kind !== 'fixture' ? sightOf(person) : undefined;
        const who = seen ? `${person.surname}, ${seen},` : person.surname;
        // The one the page ties to the case is placed with the tie, and that
        // is the observation said once ("Crowninshield sat at the far end…,
        // the woman who had found Sirkin"), not a placed line and then it again.
        if (p === tellP && slots['tell.tie'] !== undefined && !run.said.has('tell')) {
          const line = `${person.surname} was ${plain}${sep}${pick.filled.text}, ${slots['tell.tie']}.`;
          run.said.set('tell', line);
          return line;
        }
        return `${who} was ${plain}${sep}${pick.filled.text}.`;
      }
      default:
        return presenceLine(stage, p);
    }
  };
  const slotsFor = (p: PresencePerson): { plain: string | undefined } => {
    const person = personOf(p) as Person;
    const doing = doingOf(cutActivity(p.activity) ?? p.activity.text, person.surname);
    return { plain: doing ? plainAction(doing.trim().replace(/\.$/, '')) : undefined };
  };

  const holes = (moment: Moment): Holes => ({
    random: stage.dealer.random,
    ...lineMemory(stage.dealer),
    slots,
    people: rolePeople,
    musts: moment === 'arrival' ? ['establish'] : ['people', 'tell', 'views', 'answer'],
    engine(part, run) {
      switch (part.hole) {
        case 'establish': {
          const key = placeKey(stage, stage.at);
          const drawn = deal(stage, 'establish', [(c) => tagIs('establish', c, 'place', key)], { place: place?.shortName });
          const card = drawn ? cardById(drawn.cardId) : undefined;
          let text = drawn?.text ?? `${capitalize(place?.name ?? place?.shortName ?? '')}.`;
          if (!drawn) gaps.push(`no-card: establish has nothing for ${key}; the place's own name stood in`);
          if (part.form === 'short' && card) text = shortOf(card, text);
          const watchRole = place?.watcher ?? 'none';
          const watch =
            watchRole === 'none' && !WATCH_CLAUSE.test(text)
              ? deal(stage, 'watch', [(c) => tagIs('watch', c, 'watcher', 'none')], { place: place?.shortName })
              : null;
          const full = [text, watch?.text].filter((x): x is string => !!x).join(' ');
          mark(iE, { tag: key, placeIds: [stage.at], personIds: [], text: full });
          return {
            text: full,
            beats: [iE],
            voice: 'establish',
            imageN: sentencesOf(text).length,
            ...(card?.exports ? { exports: card.exports } : {}),
          };
        }
        case 'weather': {
          if (iW < 0) return null;
          const band = hourBandOf(stage.minutes);
          const kind = place?.kind ?? 'semi';
          const sky = (c: Card): boolean =>
            tagOf('arrivals', c, 'weather') === stage.cast.roll.weather && tagIs('arrivals', c, 'hourBand', band);
          const w = deal(
            stage,
            'arrivals',
            [(c) => sky(c) && tagOf('arrivals', c, 'placeKind') === kind, (c) => sky(c) && tagIs('arrivals', c, 'placeKind', kind)],
            { place: place?.shortName },
          );
          if (!w || isSubjectless(w.text)) return null;
          mark(iW, { tag: 'weather', text: w.text });
          return { text: w.text, beats: [iW], voice: 'establish', imageN: sentencesOf(w.text).length };
        }
        case 'watcher':
        case 'client': {
          const p = part.hole === 'watcher' ? watcherP : clientP;
          if (!p || run.written.has(part.hole)) return null;
          const text = personLine(p, part.form, part, run);
          if (text === null) return null;
          presenceTexts.push(text);
          if ((part.form ?? 'full') === 'full' && p.firstSight && sentencesOf(text).length >= 3) {
            return { text: '', voice: 'presence', presents: [p.personId], beats: [iP], block: [{ text, voice: 'presence', beats: [iP] }] };
          }
          return { text, voice: 'presence', presents: [p.personId], beats: [iP] };
        }
        case 'tell': {
          if (iObs === undefined || !tellP || run.said.has('tell')) return null;
          const t = thoughtAt(iObs);
          const text = thoughtLine(stage, t, gaps);
          run.presented.add(tellP.personId);
          run.said.set('tell', text);
          return { text, voice: 'thought', presents: [tellP.personId], beats: [iObs] };
        }
        case 'others':
        case 'people': {
          const skip = part.hole === 'others' ? reserved : new Set<Id>();
          const todo = people.filter((p) => !run.presented.has(p.personId) && !skip.has(p.personId));
          if (todo.length === 0) return null;
          const lines: string[] = [];
          const loose = todo.filter((p) => !p.grouped);
          const crowd = todo.filter((p) => p.grouped);
          if (part.form === 'list') {
            // The frame may bring the page's prop back ("all of it, the mirror included").
            const frame = fillWithRoles((part.text ?? '{list}.').replace('{list}', '§LIST§'), slots, run);
            if (frame === null) return null;
            const text = listLine(stage, todo, frame.text.replace('§LIST§', '{list}'), slots, counted);
            if (text === null) return null;
            for (const r of frame.roles) if (run.introduced.has(r) && !run.paid.includes(r)) run.paid.push(r);
            presenceTexts.push(text);
            return { text, voice: 'presence', presents: todo.map((p) => p.personId), beats: [iP] };
          }
          // A first sight in full is a character, three to five sentences (M11
          // §A.2): a paragraph of its own. Short lines run on together.
          const block: OutPara[] = [];
          for (const p of loose) {
            const line = personLine(p, part.form, part, run);
            if (!line) continue;
            // The tell placed with their tie is the observation's line, not the room's.
            if (!(p === tellP && run.said.get('tell') === line)) presenceTexts.push(line);
            if ((part.form ?? 'full') === 'full' && p.firstSight && sentencesOf(line).length >= 3) {
              block.push({ text: line, voice: 'presence', beats: [iP] });
            } else lines.push(line);
          }
          if (crowd.length > 0) {
            const line = crowdLine(stage, crowd.map((p) => p.personId));
            presenceTexts.push(line);
            lines.push(line);
          }
          const text = lines.join(' ');
          if (block.length > 0) {
            if (text.length > 0) block.push({ text, voice: 'presence', beats: [iP] });
            return { text: '', voice: 'presence', presents: todo.map((p) => p.personId), beats: [iP], block };
          }
          return { text, voice: 'presence', presents: todo.map((p) => p.personId), beats: [iP] };
        }
        case 'views': {
          const todo = thoughts.filter((j) => j !== iObs && !viewsCovered.has(j) && !run.written.has(`view:${j}`));
          if (todo.length === 0) return null;
          const lines: string[] = [];
          for (const j of todo) {
            const t = thoughtAt(j);
            const text = thoughtLine(stage, t, gaps);
            run.written.add(`view:${j}`);
            lines.push(text);
            mark(j, {
              tag: t.cls,
              clueIds: t.clueIds,
              personIds: [t.subjectId, t.sourceId, t.secondId].filter((x): x is Id => x !== undefined),
              placeIds: [t.placeId, t.otherPlaceId].filter((x): x is Id => x !== undefined),
              text,
            });
          }
          return { text: lines.join(' '), voice: 'thought', beats: todo };
        }
        case 'answer': {
          if (iA < 0) return null;
          const b = beats[iA] as Extract<Beat, { kind: 'answer' }>;
          const drawn = deal(stage, 'answer', [(c) => tagIs('answer', c, 'outcome', b.outcome) && !/\blead\b/.test(c.text)], {
            subject: b.subject,
            name: b.name,
          });
          const text =
            drawn?.text ??
            (b.outcome === 'found' ? 'It was what I had come for.' : b.outcome === 'dead-end' ? 'It was a dead end.' : 'It was not what I came for.');
          mark(iA, { tag: b.outcome, ...(b.targetId ? { targetId: b.targetId } : {}), text });
          return { text, voice: 'narrator', beats: [iA] };
        }
        default:
          return null;
      }
    },
    deck(part, want) {
      return deckPiece(stage, part, want, who);
    },
    close(role, exp) {
      return closeDeckLine(stage, 'company', role, exp, slots);
    },
  });

  const history = sheetHistory(stage);
  const run = ps.start('arrival', flags);
  const random = stage.dealer.random;
  const arrivalOf = { fitting: 0 };
  const arrival = chooseSheet('arrival', flags, history, random, () => true, (s) => !rolled || canPay(s), arrivalOf);
  if (!arrival) return null;
  const first = runSheet(arrival, holes('arrival'), run);
  if (!first) return null;
  const bound = (r: string): boolean => run.roles.has(r) && run.introduced.has(r);
  const companyRun = ps.start('company', {
    ...flags,
    prop: bound('prop'),
    // A prop somebody can stand by ("under the bulbs"), not the far shore or a sound.
    propNear: bound('prop') && run.roles.get('prop')?.near !== undefined,
  });
  const companyOf = { fitting: 0 };
  const company = chooseSheet(
    'company',
    companyRun.flags,
    history,
    random,
    (s) => rolesNeeded(s).every(bound),
    (s) => !rolled || canPay(s) || (bound('prop') && s.close?.roles?.length !== 0),
    companyOf,
  );
  if (!company) return null;
  reserved = reservedBy(company, rolePeople);
  if (company.parts.some((p) => p.says === 'watcher-view') && iWatchView !== undefined) viewsCovered = new Set([iWatchView]);
  const second = runSheet(company, holes('company'), companyRun);
  if (!second) return null;
  ps.used(arrival.id, 'arrival', arrivalOf.fitting);
  ps.used(company.id, 'company', companyOf.fitting);

  const paras: OutPara[] = [...first.pre, ...first.post, ...second.pre, ...second.post];
  if (second.close) paras.push({ text: second.close.text, voice: 'thought', beats: [] });

  // The trace: every claimed beat, marked with the words that said it.
  const tellSaid = companyRun.said.get('tell');
  if (iObs !== undefined && obs) {
    const text = tellSaid ?? '';
    mark(iObs, {
      tag: obs.cls,
      clueIds: obs.clueIds,
      personIds: [obs.subjectId, obs.secondId].filter((x): x is Id => x !== undefined),
      text,
    });
    if (text.length === 0) gaps.push('sheet: the observation was not said');
  }
  if (iWatchView !== undefined && viewsCovered.has(iWatchView)) {
    const t = thoughtAt(iWatchView);
    const said = companyRun.covered.get('watcher-view') ?? '';
    mark(iWatchView, { tag: t.cls, clueIds: t.clueIds, personIds: [t.subjectId].filter((x): x is Id => x !== undefined), text: said });
  }
  for (const j of thoughts) {
    if (j === iObs || j === iWatchView) continue;
    if (!companyRun.written.has(`view:${j}`)) {
      // A view nobody placed: said with the last paragraph before the close.
      const t = thoughtAt(j);
      const text = thoughtLine(stage, t, gaps);
      const host = paras[paras.length - (second.close ? 2 : 1)];
      if (host) host.text = `${host.text} ${text}`;
      mark(j, { tag: t.cls, clueIds: t.clueIds, personIds: [t.subjectId, t.sourceId, t.secondId].filter((x): x is Id => x !== undefined), text });
    }
  }
  const everyone = people.map((p) => p.personId);
  mark(iP, {
    tag: people.length === 0 ? 'empty' : 'people',
    personIds: everyone,
    ...(grouped.length > 0 || counted.size > 0 ? { grouped: [...new Set([...grouped.map((p) => p.personId), ...counted])] } : {}),
    // Who is here, as the page said it. The tell is said by the observation,
    // and that beat's trace carries those words.
    text: [...presenceTexts, ...[...companyRun.said.entries()].filter(([k]) => k !== 'tell').map(([, v]) => v)].join(' '),
  });
  const nobody = companyRun.covered.get('nobody');
  if (people.length === 0 && nobody !== undefined) mark(iP, { tag: 'empty', personIds: [], text: nobody });
  else if (people.length === 0 && !paras.some((p) => p.beats.includes(iP))) {
    // Who is here is always said, if only that it is nobody (M8 §3).
    paras.splice(paras.length - (second.close ? 1 : 0), 0, { text: 'There was nobody else there.', voice: 'presence', beats: [iP] });
  }
  return { claimed: beatsClaimed, at: iE, paras };
}

/** People a sheet puts on the page by a hole or a slot of their own: `others` leaves them be. */
function reservedBy(sheet: Sheet, people: Record<string, Id>): Set<Id> {
  const out = new Set<Id>();
  for (const part of sheet.parts) {
    // The tell is theirs when sheet text names them; the observation (the
    // `tell` hole) says them without their name, so the room still does.
    const heads = [
      ...(part.hole && part.deck === undefined && part.hole !== 'tell' ? [part.hole] : []),
      ...(part.hole === undefined ? slotsIn(part.text ?? '').map((k) => (k.split('.')[0] as string).toLowerCase()) : []),
    ];
    for (const h of heads) if (people[h] !== undefined) out.add(people[h] as Id);
  }
  return out;
}

/** "who had found Sirkin", "Hauck had told me to start with": the tie as a clause. */
function tieClauseOf(stage: Stage, person: Person, tie: 'finder' | 'pointer' | 'relation' | 'client'): string {
  const victim = stage.view.victim.surname;
  switch (tie) {
    case 'finder':
      return `who had found ${foundWhat(stage.view)}`;
    case 'pointer':
      return `${stage.view.client.surname} had told me to start with`;
    case 'relation':
      return `who ${(relationPlain(stage.view.kase, person.relationshipId) ?? '').split('{V}').join(victim)}`;
    case 'client':
      return 'who was paying me';
  }
}

/** Sheet text with roles, as a pool phrase needs it. */
function fillWithRoles(
  template: string,
  slots: Record<string, string | undefined>,
  run: SheetRun,
): { text: string; roles: string[] } | null {
  const roles: string[] = [];
  let missing = false;
  const text = template.replace(/\{([A-Za-z][\w-]*(?:\.[\w-]+)?)\}/g, (_m, key: string) => {
    const [head, field] = key.split('.') as [string, string | undefined];
    const exp = run.callback ? run.roles.get(head) : undefined;
    let v: string | undefined;
    if (exp && !fitsSense(template, exp)) v = undefined;
    else if (exp) {
      v = field === 'near' ? exp.near : field === 'text' ? exp.text : field === 'it' ? (pluralThing(exp.short) ? 'them' : 'it') : exp.short;
      if (v !== undefined) roles.push(head);
    } else v = slots[key];
    if (v === undefined) missing = true;
    return v ?? '';
  });
  return missing ? null : { text, roles };
}

/**
 * Golden Sheet C: "Hargrove behind the bar with a towel, Crowninshield at the
 * end with a newspaper, and two people at the bar a few stools apart". The
 * room in one sentence, from the client's side of it: people the pages have
 * named by name, the rest by what anybody can see.
 */
function listLine(
  stage: Stage,
  todo: readonly PresencePerson[],
  frame: string,
  slots: Record<string, string | undefined>,
  counted: Set<Id>,
): string | null {
  const { view } = stage;
  const named = new Set(stage.namedBefore ?? []);
  const items: string[] = [];
  const strangers: Person[] = [];
  // Named exactly where the M8 page names people, so no sheet puts a name on
  // the page (and so in the choices) that the plan did not: everybody with a
  // line of their own, and a crowd by count unless an earlier page named them.
  for (const p of todo) {
    const person = view.personById.get(p.personId) as Person;
    const doing = doingOf(p.activity.text, person.surname);
    const plain = doing ? plainAction(doing.trim().replace(/\.$/, '')) : null;
    if (p.grouped && !named.has(person.id)) strangers.push(person);
    else items.push(plain ? `${person.surname} ${plain}` : person.surname);
  }
  for (const p of strangers) counted.add(p.id);
  if (strangers.length > 0) {
    const men = strangers.filter((p) => genderHintOf(p) !== 'f').length;
    const women = strangers.length - men;
    const count = (n: number, one: string, many: string): string =>
      n === 0 ? '' : n === 1 ? `a ${one}` : `${COUNT_WORDS[n] ?? String(n)} ${many}`;
    const group = [count(men, 'man', 'men'), count(women, 'woman', 'women')].filter((x) => x.length > 0).join(' and ');
    items.push(`${group} I didn’t know`);
  }
  // "You could see all of it" is two people at least.
  if (items.length < 2) return null;
  const list = items.length === 1 ? (items[0] as string) : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`;
  const text = frame.replace('{list}', list).replace(/\{([\w.]+)\}/g, (_m, k: string) => slots[k] ?? `{${k}}`);
  if (/\{[\w.]+\}/.test(text)) return null;
  return endStop(capitalize(text));
}

/** Voice for a paragraph a sheet wrote, when it wrote the words itself. */
export const SHEET_VOICE: ProseVoice = 'narrator';

/* ------------------------------------------------------------------ *
 * The frames: a question, a confrontation, a search.
 * ------------------------------------------------------------------ */

export interface Frame {
  /** Paragraphs before the body: the approach and the look, or the way through the room. */
  pre: string[];
  /** The last word, when the page has one. */
  close: string | null;
  /** A search's room texture, when the sheet put it in the first paragraph. */
  place?: string;
}

export interface Frames {
  ask?: Frame;
  search?: Frame;
}

/** The sheets that frame this page, if its shape has any. */
export function framesFor(plan: Plan, stage: Stage, scene: Scene, ps: PageSheets): Frames {
  if (plan.shape === 'ask' || plan.shape === 'confront') {
    const ask = askFrame(plan, stage, scene, ps);
    return ask ? { ask } : {};
  }
  if (plan.shape === 'search') {
    const search = searchFrame(plan, stage, ps);
    return search ? { search } : {};
  }
  return {};
}

/** Run one sheet for a moment, trying the next that fits when one cannot be filled. */
function runFor(
  moment: Moment,
  flags: Flags,
  stage: Stage,
  ps: PageSheets,
  holes: Holes,
): { sheet: Sheet; out: NonNullable<ReturnType<typeof runSheet>> } | null {
  const history = sheetHistory(stage);
  const tried = new Set<string>();
  for (let k = 0; k < 4; k++) {
    const of = { fitting: 0 };
    const sheet = chooseSheet(moment, flags, history, stage.dealer.random, (s) => !tried.has(s.id) && rolesNeeded(s).every((r) => {
      const run = ps.roles();
      return run !== null && run.callback && run.roles.has(r) && run.introduced.has(r);
    }), (s) => !ps.rolled || canPay(s), of);
    if (!sheet) return null;
    tried.add(sheet.id);
    const run = ps.start(moment, flags);
    const out = runSheet(sheet, holes, run);
    if (out) {
      ps.used(sheet.id, moment, of.fitting + tried.size - 1);
      return { sheet, out };
    }
  }
  return null;
}

function askFrame(plan: Plan, stage: Stage, scene: Scene, ps: PageSheets): Frame | null {
  const beat = plan.beats.find(
    (b): b is Extract<Beat, { kind: 'exchange' | 'confront' }> => (b.kind === 'exchange' || b.kind === 'confront') && b.stage !== undefined,
  );
  if (!beat || !beat.stage) return null;
  const staged = beat.stage;
  const { view } = stage;
  const person = view.personById.get(beat.personId) as Person;
  const moment: Moment = beat.kind === 'confront' ? 'confront' : 'ask';
  const closeBeat = plan.beats.find((b): b is Extract<Beat, { kind: 'close' }> => b.kind === 'close');
  const telling = plan.beats.find((b): b is Extract<Beat, { kind: 'telling' }> => b.kind === 'telling');
  const activity = stage.memory?.activities[person.id];
  const place = view.placeById.get(stage.at);
  const flags: Flags = {
    ...baseFlags(stage, ps.rolled),
    again: staged.again,
    reported: staged.reported,
    try: staged.try ?? 'none',
    posture: staged.posture,
    doing: staged.doing !== null,
    temper: temperOf(stage.cast, person.id),
    self: scene.kind === 'ask' && scene.self !== undefined,
    account: scene.kind === 'ask' && scene.account !== null,
    family: telling?.family.kind ?? 'none',
    outcome: closeBeat?.outcome ?? 'none',
    client: person.id === view.client.id,
    fixture: person.kind === 'fixture',
    close: closeBeat !== undefined,
    prop: (DECKS['place-ambient'] ?? []).some(
      (c) => tagIs('place-ambient', c, 'place', stage.at) && c.exports?.prop !== undefined && !stage.dealer.used(c.id),
    ),
  };
  const slots: Record<string, string | undefined> = {
    place: place?.shortName,
    Place: place ? capitalize(place.shortName) : undefined,
    victim: view.victim.surname,
    hour: hourSaid(stage.minutes).replace(/^(?:at|past|after) /, ''),
    ...personRoleSlots(stage, 'person', person, activity && activity.visit === stage.memory?.visit ? cutActivity(activity) : undefined),
  };
  let approachDone = false;
  const holes: Holes = {
    random: stage.dealer.random,
    ...lineMemory(stage.dealer),
    slots,
    people: { person: person.id },
    engine(part, run) {
      switch (part.hole) {
        case 'approach': {
          if (approachDone) return null;
          approachDone = true;
          const a = approachOf(stage, person, staged);
          return { text: a.text, voice: 'approach', ...(a.exports ? { exports: a.exports } : {}) };
        }
        case 'look': {
          const want = part.bind && run.callback ? part.bind : null;
          const l = lookOf(stage, person, staged, want);
          return l ? { text: l.text, voice: 'approach', ...(l.exports ? { exports: l.exports } : {}) } : null;
        }
        case 'thing': {
          // What they have in hand this visit, off their activity card: bound, not said.
          const card = activity?.cardId && activity.visit === stage.memory?.visit ? cardById(activity.cardId) : undefined;
          const exp = card?.exports?.thing;
          return exp ? { text: '', exports: { thing: exp } } : null;
        }
        default:
          return null;
      }
    },
    deck(part, want) {
      return deckPiece(stage, part, want, { person }, { '§alone': 'yes' });
    },
    close(role, exp) {
      return closeDeckLine(stage, moment, role, exp, slots);
    },
    plainClose() {
      return closeBeat ? closeOf(stage, person, closeBeat.outcome) : null;
    },
  };
  const done = runFor(moment, flags, stage, ps, holes);
  if (!done) return null;
  const pre = [...done.out.pre, ...done.out.post].map((p) => p.text);
  return { pre, close: closeBeat ? (done.out.close?.text ?? null) : null };
}

function searchFrame(plan: Plan, stage: Stage, ps: PageSheets): Frame | null {
  const act = plan.beats.find((b): b is Extract<Beat, { kind: 'act' }> => b.kind === 'act');
  if (!act || act.continued) return null;
  const { view } = stage;
  const place = view.placeById.get(stage.at);
  const finds = plan.beats.filter((b) => b.kind === 'find').length;
  const hasPlace = plan.beats.some((b) => b.kind === 'texture' && b.texture === 'place');
  const flags: Flags = {
    ...baseFlags(stage, ps.rolled),
    object: act.objectId !== undefined,
    finds,
    left: act.left.length > 0,
    texture: hasPlace,
    prop: (DECKS['place-ambient'] ?? []).some(
      (c) => tagIs('place-ambient', c, 'place', stage.at) && c.exports?.prop !== undefined && !stage.dealer.used(c.id),
    ),
  };
  const object = act.objectId ? view.objectById.get(act.objectId)?.name : undefined;
  const slots: Record<string, string | undefined> = {
    place: place?.shortName,
    Place: place ? capitalize(place.shortName) : undefined,
    victim: view.victim.surname,
    hour: hourSaid(stage.minutes).replace(/^(?:at|past|after) /, ''),
    object: object?.replace(/^(?:a|an) /, 'the '),
  };
  let placeText: string | undefined;
  const holes: Holes = {
    random: stage.dealer.random,
    ...lineMemory(stage.dealer),
    slots,
    engine(part, run) {
      switch (part.hole) {
        case 'act': {
          const a = searchActOf(stage, act.objectId, part.bind && run.callback ? part.bind : null);
          return { text: a.text, voice: 'act', ...(a.exports ? { exports: a.exports } : {}) };
        }
        case 'left': {
          // The first thing he leaves alone, which the page names after the first find.
          const name = act.left.map((id) => view.objectById.get(id)?.name).find((n): n is string => !!n);
          if (!name) return null;
          const short = name.replace(/^(?:a|an|some) /i, 'the ').replace(/,.*$/, '');
          return { text: '', introduces: true, exports: { prop: { text: name, short, kind: 'thing' } } };
        }
        default:
          return null;
      }
    },
    deck(part, want) {
      const piece = deckPiece(stage, part, want, {}, { '§alone': 'yes' });
      if (piece && part.deck === 'place-ambient' && hasPlace) placeText = piece.text;
      return piece;
    },
    close(role, exp) {
      return closeDeckLine(stage, 'search', role, exp, slots);
    },
  };
  const done = runFor('search', flags, stage, ps, holes);
  if (!done) return null;
  // The thing left alone is named on the page (after the first find), so a
  // close may bring it back even though the sheet's own words never said it.
  const pre = [...done.out.pre, ...done.out.post].map((p) => p.text);
  return { pre: [pre.join(' ')], close: done.out.close?.text ?? null, ...(placeText ? { place: placeText } : {}) };
}

/**
 * A telling framed by a sheet: a line before the family is told and one after
 * it, about the witness and nothing the case says (the correspondence check
 * holds them to that). Only the first family on a page, spoken aloud.
 */
export function tellingFrame(
  stage: Stage,
  scene: Extract<Scene, { kind: 'ask' }>,
  beat: Extract<Beat, { kind: 'telling' }>,
  ps: PageSheets,
  frameText: string,
): { before?: string; after?: string } | null {
  const { view } = stage;
  const speaker = view.personById.get(scene.personId) as Person;
  const activity = stage.memory?.activities[speaker.id];
  // What they have in hand this visit, not on an earlier one.
  const card = activity?.cardId && activity.visit === stage.memory?.visit ? cardById(activity.cardId) : undefined;
  const page = ps.roles();
  const flags: Flags = {
    ...baseFlags(stage, ps.rolled),
    family: beat.family.kind,
    temper: temperOf(stage.cast, speaker.id),
    volunteered: beat.volunteered,
    // Not a thing or a prop the question's last word has already brought back:
    // three mentions of the bulbs is a running joke nobody asked for.
    thing: card?.exports?.thing !== undefined && !(page?.paid.includes('thing') ?? false),
    prop: page !== null && page.callback && page.roles.has('prop') && page.introduced.has('prop') && !page.paid.includes('prop'),
    fixture: speaker.kind === 'fixture',
    // The deck's frame names the speaker ("Crowninshield didn't have to look anything up."):
    // a line before it that names them too is the name twice.
    named: new RegExp(`\\b${speaker.surname}\\b`).test(frameText),
  };
  const slots: Record<string, string | undefined> = {
    ...personRoleSlots(stage, 'speaker', speaker, activity && activity.visit === stage.memory?.visit ? cutActivity(activity) : undefined),
  };
  const holes: Holes = {
    random: stage.dealer.random,
    ...lineMemory(stage.dealer),
    slots,
    people: { speaker: speaker.id },
    engine(part) {
      if (part.hole !== 'thing') return null;
      const exp = card?.exports?.thing;
      return exp ? { text: '', exports: { thing: exp } } : null;
    },
    deck() {
      return null;
    },
    close() {
      return null;
    },
  };
  const done = runFor('telling', flags, stage, ps, holes);
  if (!done) return null;
  const before = done.out.pre.map((p) => p.text).join(' ');
  const after = [...done.out.post.map((p) => p.text), done.out.close?.text ?? ''].filter((t) => t.length > 0).join(' ');
  if (before.length === 0 && after.length === 0) return null;
  return { ...(before ? { before } : {}), ...(after ? { after } : {}) };
}

/** A line of sheet text with the page's roles, for a caller that writes its own. */
export function sheetLine(template: string, slots: Record<string, string | undefined>, run: SheetRun): string | null {
  return fillSheet(template, slots, run)?.text ?? null;
}

/* ------------------------------------------------------------------ *
 * The recap and the office: a frame round what the engine writes.
 * ------------------------------------------------------------------ */

export interface RecapFrameInput {
  seed: number;
  page: number;
  trigger: string;
  flags: Flags;
  random: Rng;
  history: string[];
  /** The dealer's memory of the sheets' own lines. */
  memory: Pick<Holes, 'fresh' | 'spend'>;
  /** The recap deck's opening line, preferring one that exports `want`. */
  open: (want: string | null) => { text: string; exports?: Record<string, CardExport> } | null;
  /** The recap deck's closing line. */
  closeCard: () => string | null;
  /** The close deck's line for a role, or a plain one. */
  closeDeck: (role: string | null, exp: CardExport | null) => string | null;
}

/**
 * The recap's frame: its opening line and its closing one (before the next
 * step), from a recap sheet. The recap's own roll, so a page's recap can pay
 * something off on a page that did not.
 */
export function recapFrame(input: RecapFrameInput): { open: string; close: string | null; use: SheetUse; note: string } | null {
  const rolled = callbackRoll(input.seed, 5000 + input.page);
  const flags: Flags = { ...input.flags, callback: rolled, trigger: input.trigger };
  const holes: Holes = {
    random: input.random,
    ...input.memory,
    slots: {},
    engine(part, run) {
      if (part.hole !== 'open') return null;
      const want = part.bind && run.callback ? part.bind : null;
      const drawn = input.open(want);
      return drawn ? { text: drawn.text, voice: 'recap', ...(drawn.exports ? { exports: drawn.exports } : {}) } : null;
    },
    deck() {
      return null;
    },
    close(role, exp) {
      return input.closeDeck(role, exp);
    },
    plainClose() {
      return input.closeCard();
    },
  };
  const tried = new Set<string>();
  for (let k = 0; k < 3; k++) {
    const of = { fitting: 0 };
    const sheet = chooseSheet('recap', flags, input.history, input.random, (s) => !tried.has(s.id), (s) => !rolled || canPay(s), of);
    if (!sheet) return null;
    tried.add(sheet.id);
    const run = newRun('recap', flags, rolled);
    const out = runSheet(sheet, holes, run);
    if (!out) continue;
    const open = [...out.pre, ...out.post].map((p) => p.text).join(' ');
    if (open.length === 0) continue;
    // Remembered only once the recap is written (the caller notes it then):
    // a recap refused for want of anything new used no sheet.
    return {
      open,
      close: out.close?.text ?? null,
      use: { id: sheet.id, moment: 'recap', callback: run.paid.length > 0, rolled, fitting: of.fitting + tried.size - 1 },
      note: `sheet:${sheet.id}#${input.page}#${input.history.length}`,
    };
  }
  return null;
}

export interface OfficeFrameInput {
  flags: Flags;
  slots: Record<string, string | undefined>;
  /** The office deck's card for the hour, preferring one that exports `want`. */
  office: (want: string | null) => { text: string; exports?: Record<string, CardExport>; motifs?: string[]; score?: number } | null;
  closeDeck: (role: string | null, exp: CardExport | null) => string | null;
}

/**
 * The office's frame: the room at this hour (the first paragraph, after
 * "Midnight."), and a last line before she is left in the chair.
 */
export function officeFrame(
  stage: Stage,
  input: OfficeFrameInput,
): { open: string; card: string; close: string | null; use: SheetUse; motifs: string[]; score: number } | null {
  const rolled = callbackRoll(stage.view.kase.seed, stage.pageIndex);
  const flags: Flags = { ...baseFlags(stage, rolled), ...input.flags };
  let motifs: string[] = [];
  let score = 0;
  let card = '';
  const holes: Holes = {
    random: stage.dealer.random,
    ...lineMemory(stage.dealer),
    slots: input.slots,
    engine(part, run) {
      if (part.hole !== 'office') return null;
      const want = part.bind && run.callback ? part.bind : null;
      const drawn = input.office(want);
      if (drawn) {
        motifs = drawn.motifs ?? [];
        score = drawn.score ?? 0;
        card = drawn.text;
      }
      return drawn ? { text: drawn.text, voice: 'place', ...(drawn.exports ? { exports: drawn.exports } : {}) } : null;
    },
    deck(part, want) {
      return deckPiece(stage, part, want, {});
    },
    close(role, exp) {
      return input.closeDeck(role, exp);
    },
  };
  const history = sheetHistory(stage);
  const tried = new Set<string>();
  for (let k = 0; k < 3; k++) {
    const of = { fitting: 0 };
    const sheet = chooseSheet('office', flags, history, stage.dealer.random, (s) => !tried.has(s.id), (s) => !rolled || canPay(s), of);
    if (!sheet) return null;
    tried.add(sheet.id);
    const run = newRun('office', flags, rolled);
    const out = runSheet(sheet, holes, run);
    if (!out) continue;
    noteSheet(stage, sheet.id);
    const open = [...out.pre, ...out.post].map((p) => p.text).join(' ');
    return { open, card, close: out.close?.text ?? null, use: { id: sheet.id, moment: 'office', callback: run.paid.length > 0, rolled, fitting: of.fitting + tried.size - 1 }, motifs, score };
  }
  return null;
}
