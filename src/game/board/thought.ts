/**
 * docs/44: the thought, from the engine and never from a card. After each job
 * the detective says, in one to three plain sentences, what the new fact
 * touches among the facts already held, by name: the same place, the same
 * hour, the means, the scene's street, an agreement, a collision. It's where
 * the player is shown which two facts touch.
 *
 * It says only what the solver makes of what's held (the solver run on the
 * questions asked, never the truth), and never more: "something under a
 * coat", not the dog's name, until the board says whose coat.
 *
 * docs/46 §2: how far it goes is the tier's level (`thoughtLevel`).
 * - walk (Raw): all of the above, and on the page that settles it the
 *   elimination, walked to its last step.
 * - link (Coddled to Medium): collisions, agreements, the link to the scene
 *   and the way in. Never who's cleared, who's left or how many; and the page
 *   that settles it reads like any other page, so its shape tells nothing.
 * - fact (Hard-boiled): this page's own fact, said again at the hours that
 *   matter, and a collision only when both its lines are on this page.
 */

import type { Solved } from '../../gen/board/solver.js';
import { accountOf, collisionsOf, knownPeople, linesHeld, listExhaustive, listOf, shutAt, solveHeld } from './knowledge.js';
import {
  andList,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  personOf,
  placeName,
  pronOf,
  solverHeld,
  suspectsOf,
  victimOf,
  type BoardCase,
  type BoardRun,
  type Hour,
  type PersonId,
  type PlaceId,
  type ThoughtLevel,
} from './model.js';
import { sourceName } from './stars.js';
import type { Relation, SaySpec } from './plan/types.js';
import type { Prop, Src } from './bones/types.js';
import { breakerProp, srcOfQ } from './bones/extract.js';
import type { Args } from './bones/voice.js';
import { accessPhrase, atWhere, breakSaid, claimSaid, claimWas, keptAt, remarkSaid, shortOther, wayWhat, where, whyHours } from './bones/phrase.js';

export { breakSaid, claimSaid, keptAt, remarkSaid, shortOther };
import { markPronoun } from './plan/refer.js';
import { PLAN } from './plan/index.js';
import { lean } from './plan/dial.js';

export interface Thought {
  sentences: string[];
  /** Held lines, questions or office lines (`givens:<kind>`) the thought ties the new fact to. */
  refs: string[];
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
  /**
   * docs/49: the same sentences, one fact each, with what each does (new, confirms, collides,
   * narrows), which rule said it, and what it rests on: the microplanner's facts.
   */
  parts?: ThoughtPart[];
}

/** One fact of a thought, for the microplanner (docs/49 §1). */
export interface ThoughtPart {
  text: string;
  relation: Relation;
  /** Which of the thought's rules said it: `collision`, `agree`, `list-agree`, `street`, `way-in`, `placed`, `handover`, `window`, `left`, `hours`, `elimination`, or the page's own. */
  rule: string;
  refs: string[];
  hours: Hour[];
  people: PersonId[];
  places: PlaceId[];
  /**
   * docs/49: the detective's aside after the fact, with no fact in it ("I wrote it down and left it
   * standing, for now."): a gap of its own after the fact unit. `text` is then the fact alone.
   */
  gloss?: string;
  /** docs/52: the bones, the propositions the sentence says. */
  props?: Prop[];
  /** docs/52: what the writer drew for the planner's voicing (a collision's "One of them was wrong."), and what it knew of the sentence before. */
  flesh?: Record<string, unknown>;
  /** docs/52: an opening "So" or "But", the page's join, said only when it's free (`flesh.bare` is the sentence without it). */
  opener?: 'So' | 'But';
  /** docs/52 build 2: the sentence as a composite to be voiced (its shape, flags and arguments). */
  say?: SaySpec;
  /** docs/60 item 1: an aside that carries something ("None of the people I was asking about was there"): kept by the texture budget. */
  tex?: 'keep';
}

function blank(): Thought {
  return { sentences: [], refs: [], hours: [], people: [], places: [], parts: [] };
}

/* ------------------------------------------------------------------ *
 * Lines said as the detective puts them to himself.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * The thought.
 * ------------------------------------------------------------------ */

export interface ThoughtCtx {
  c: BoardCase;
  before: BoardRun;
  run: BoardRun;
  /** The question the page asked: `account:p`, `list:w`, `search:f`, `motive:p`, `confront:p@h`. */
  q: string;
  /** Where the detective stands. */
  here: PlaceId;
  /** docs/46 §2: how far the thought may go. */
  level: ThoughtLevel;
  /** A shuffle for the few hand-written joins, so two pages don't say them alike. */
  pick: (key: string, lines: readonly string[]) => string;
}

export function thoughtOf(x: ThoughtCtx): Thought {
  const { c, before, run, q, here } = x;
  const t = blank();
  const b = solveHeld(c, solverHeld(before));
  const a = solveHeld(c, solverHeld(run));
  const [kind, rest] = q.split(':') as [string, string];
  // docs/49: the pronouns the thought writes, marked with whom they mean, for the planner's reference.
  const P = (p: PersonId) => {
    const pr = pronOf(c, p);
    const m = markPronoun(c, p);
    return { he: pr.he + m, him: pr.him + m, his: pr.his + m, He: pr.He + m, His: pr.His + m };
  };
  const add = (s: string, refs: string[], o: { hours?: Hour[]; people?: PersonId[]; places?: PlaceId[]; rel?: Relation; rule?: string; gloss?: string; props?: Prop[]; flesh?: Record<string, unknown>; say?: SaySpec; opener?: 'So' | 'But'; tex?: 'keep' } = {}) => {
    t.sentences.push(s);
    t.refs.push(...refs);
    t.hours.push(...(o.hours ?? []));
    t.people.push(...(o.people ?? []));
    t.places.push(...(o.places ?? []));
    t.parts?.push({
      text: o.gloss !== undefined && s.endsWith(` ${o.gloss}`) ? s.slice(0, -o.gloss.length - 1) : s,
      ...(o.gloss !== undefined && s.endsWith(` ${o.gloss}`) ? { gloss: o.gloss } : {}),
      relation: o.rel ?? 'new',
      rule: o.rule ?? 'thought',
      refs: [...refs],
      hours: [...(o.hours ?? [])],
      people: [...(o.people ?? [])],
      places: [...(o.places ?? [])],
      ...(o.props ? { props: o.props } : {}),
      ...(o.flesh ? { flesh: o.flesh } : {}),
      ...(o.say ? { say: o.say } : {}),
      ...(o.tex ? { tex: o.tex } : {}),
      // docs/59 item 3: an opening "So", the page's join, said by the planner when it's free.
      ...(o.opener ? { opener: o.opener, flesh: { ...(o.flesh ?? {}), bare: s } } : {}),
    });
  };
  const before_ = linesHeld(c, before);
  const heldBefore = new Set(before_.map((l) => l.id));
  // People a sentence has already placed this page: a later one needn't place them again.
  const covered = new Set<PersonId>();
  const heldBeforeQs = new Set(solverHeld(before));
  const win = b.possibleHours.length ? b.possibleHours : c.crime.window;
  const winFirst = (hs: Hour[]) => [...hs].sort((u, v) => Number(win.includes(v)) - Number(win.includes(u)) || u - v);
  const walk = x.level === 'walk';
  const fact = x.level === 'fact';
  // docs/46 §2: above a walk, an hour that matters is one it could have happened at, never yet the
  // hour it happened: "at eleven, when Fritz went" is the walk's to say once the office's two hours
  // narrow ("at eleven, when Fritz could have gone"). (Never the client's say-so, "the hours Kreuzer had
  // given me": the skim readers didn't know whose hours they were.)
  const office = c.givens.window ?? c.crime.window;
  // (Said without a name: "when it could have happened". The dead man or the pet named there was one
  // more person a "she" after it could be.)
  // docs/66, P1: once the facts held settle the hour, the link says what happened at it ("at ten, when
  // Fritz went"), never "when it could have happened" of an hour already fixed; at Hard-boiled the
  // thought says the fact and the hours bare, and the hour's reason ("when it could have happened",
  // "when Carbone could have been given the chloral") once a night at most.
  const settledBefore = b.possibleHours.length === 1 && office.length > 1;
  const factReasonSpent = fact && lean() && reasonSaidBefore(c, before, office);
  const reasonFor0 = (hs: readonly number[]): string => (walk || office.length <= 1 || !hs.every((h) => office.includes(h as Hour)) ? whyHours(c, hs) : 'when it could have happened');
  const reasonFor = (hs: readonly number[]): string => (!lean() ? reasonFor0(hs) : fact ? (settledBefore || factReasonSpent ? '' : reasonFor0(hs)) : (settledBefore || settlesHere) && !walk ? whyHours(c, hs) : reasonFor0(hs));
  // The page that settles who. Only a walk says so; above it, that page reads like any other.
  // docs/47 B11: the walk's elimination is never on the page whose fact completes it. It moves to
  // the turn, or the page after (`eliminationOf`, said once a night by the page writer); the page
  // that settles who reads like any other page.
  const settles = false;

  // 1. A lie caught: their line and the line that breaks it, side by side. Never a verdict.
  // At fact level, only when both lines are on this page.
  const fresh = collisionsOf(c, run).filter((col) => b.status.get(`${col.person}@${col.hour}`)?.s !== 'broken');
  const caught = new Set<string>();
  // This page's own list, said whole beside a lie it breaks ("Shapiro had Tramonti and Lindemann at
  // the Odessa at ten"): who it puts there then needn't be said again.
  const listSaid = new Set<string>();
  for (const col of fresh.slice(0, 2)) {
    const br = col.breakers[0];
    if (!br) continue;
    if (fact && !(col.claim.q === q && br.q === q)) continue;
    const p = col.person;
    caught.add(`${p}@${col.hour}`);
    if (br.kind === 'list' && br.q === q && br.place !== undefined) listSaid.add(`${br.place}@${col.hour}`);
    // The line that breaks it is about them: once named, they're "her" in it ("Ashby passed her on Stuyvesant Street").
    const said0 = breakSaid(c, br, p, run.asked);
    // docs/49: "Miss Moskin said Sokol’s at ten. Dr. Hirsch says she was at Sokol’s…": the "she" could
    // be either woman. Their own account, without a pronoun in it.
    const sp = br.kind === 'claim' ? (br.speaker as PersonId) : undefined;
    const ownAccount = PLAN.ops && sp && sp !== p && pronOf(c, sp).he === pronOf(c, p).he ? said0.replace(`${nameOf(c, sp)} says ${pronOf(c, sp).he} was at `, `${nameOf(c, sp)}’s own account was `) : said0;
    const said = ownAccount
      .replace(new RegExp(`\\b(had|passed|put|saw) ${nameOf(c, p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), `$1 ${P(p).him}`)
      // In the room itself the list is "here", not the place's name again (docs/47 C13).
      ;
    const people = [p, ...br.about, ...(br.speaker ? [br.speaker] : []), ...c.people.filter((y) => !y.object && said.includes(y.short)).map((y) => y.id)];
    const two = x.pick('two-stories', [
      'One of them was wrong.',
      `Two stories about ${P(p).him} at the same hour, and only one of them could stand.`,
      `They couldn’t both be true, and ${br.kind === 'list' ? `${nameOf(c, br.speaker as PersonId)} had no reason to be the wrong one` : 'I knew which one I’d bet on'}.`,
    ]);
    const refs = [col.claim.id, br.id].filter((id) => heldBefore.has(id));
    const twos = [
      'One of them was wrong.',
      `Two stories about ${P(p).him} at the same hour, and only one of them could stand.`,
      `They couldn’t both be true, and ${br.kind === 'list' ? `${nameOf(c, br.speaker as PersonId)} had no reason to be the wrong one` : 'I knew which one I’d bet on'}.`,
    ];
    add(`${nameOf(c, p)} said ${claimWas(c, p, [col.hour], { mark: markPronoun(c, p) })}. ${cap(said)}. ${two}`, refs.length ? refs : [col.claim.id], {
      rel: 'collides',
      rule: 'collision',
      // docs/52: the claim and the line that breaks it, in full; the closing line is the writer's.
      props: [{ k: 'COLLIDES', person: p, place: accountOf(c, p)?.claims[col.hour]?.place ?? '', hour: col.hour, with: breakerProp(c, br, p, run.asked) }],
      flesh: { two, twos },
      hours: [col.hour],
      people,
      places: [accountOf(c, p)?.claims[col.hour]?.place ?? '', ...(br.place ? [br.place] : [])],
    });
  }

  // docs/59 item 3: on a list, who had been there and gone by the hour it happened, worked out before
  // the sentences that would otherwise say them (the way in, who it backs): the consequence says it.
  const thenList = kind === 'list' ? listOf(c, rest) : undefined;
  // (docs/66, P1: at the link, on the page whose own sighting settles the hour, the list's consequence is
  // at the hour it leaves, after the sighting and the hour: never the two hours again before them.)
  const settlesHere = lean() && !fact && !walk && sightingHere() !== undefined;
  const thenHs = thenList ? ((settlesHere ? a.possibleHours : win.slice(0, 2)) as Hour[]).filter((h) => thenList.entries[h] !== undefined || shutAt(c, thenList.place, h)) : [];
  const gone = thenList && thenHs.length ? goneOf(thenList, thenHs) : [];
  // (Who had been where the means was kept, while it was there for the taking, and gone: one
  // sentence, with the way in in it. Not at fact level, docs/46 §2.)
  const meansGone = !fact && thenList && thenList.place === c.means.origin && (isMurder(c) || /^spare/.test(c.setup?.means ?? '')) ? gone.filter((g) => g.was.some((h) => c.means.available.includes(h))) : [];
  // Whose claims this page's list backs, at which hours (rule 3).
  const listAgreed: { p: PersonId; h: Hour }[] = [];

  // 2. An account that says what something held already said: "So here at eleven, with Feeney, which was what Coffin had."
  if (kind === 'account' && !fact) {
    const ac = accountOf(c, rest);
    const bySrc = new Map<string, { hs: Hour[]; refs: string[]; place: PlaceId[]; by: Src }>();
    for (const h of winFirst(c.board.hours)) {
      const cl = ac?.claims[h];
      if (!cl || caught.has(`${rest}@${h}`)) continue;
      for (const l of before_) {
        if (l.hour !== h || l.place !== cl.place || !l.about.includes(rest) || l.speaker === rest) continue;
        if (l.kind !== 'list' && l.kind !== 'claim' && l.kind !== 'admit' && l.kind !== 'given') continue;
        const src = l.kind === 'given' ? `${clientOf(c).short} had said` : l.kind === 'list' ? `${nameOf(c, l.speaker as PersonId)} had` : `${nameOf(c, l.speaker as PersonId)} had said`;
        const by: Src = l.kind === 'given' ? { k: 'given' } : l.kind === 'list' ? { k: 'list', who: l.speaker as PersonId } : l.kind === 'admit' ? { k: 'admit', who: l.speaker as PersonId } : { k: 'claim', who: l.speaker as PersonId };
        const g = bySrc.get(src) ?? { hs: [], refs: [], place: [], by };
        if (!g.hs.includes(h)) {
          g.hs.push(h);
          g.place.push(cl.place);
        }
        g.refs.push(l.id);
        bySrc.set(src, g);
      }
    }
    const best = [...bySrc.entries()].sort((u, v) => Number(v[1].hs.some((h) => win.includes(h))) - Number(u[1].hs.some((h) => win.includes(h))) || v[1].hs.length - u[1].hs.length)[0];
    // The one who said so is placed by this evening in turn: that's the same agreement, not a second one.
    if (best) for (const y of c.people) if (best[0].startsWith(`${y.short} `)) covered.add(y.id);
    // (docs/66, P3: after a story that didn't check out, the part of it that did is said only at an hour
    // that matters: "Hauck did see him at the Hauck flat at eight, though." after "he said he was home at
    // ten, but Pickering passed him on Second Avenue" contrasted with nothing.)
    // (And once the facts have settled the hour, only at that hour: "Some of Glick’s evening checked out: …
    // at nine" when it happened at ten named him a third time for an hour that no longer mattered.)
    const restOutside = lean() && t.sentences.length > 0 && !!best && !best[1].hs.some((h) => win.includes(h) && (a.possibleHours.length !== 1 || a.possibleHours.includes(h as Hour)));
    if (best && !settles && !restOutside && !(t.sentences.length > 0 && t.sentences.some((x) => x.includes(best[0].replace(/ had( said)?$/, ''))))) {
      const [src, g] = best;
      const namedSoFar = new Set<string>();
      // docs/47 C13: the same place at both hours is said once ("Kowalski’s at eight and nine"), not
      // "Kowalski’s at eight, with …, and Kowalski’s at nine".
      const two = g.hs.slice(0, 2);
      const samePlace = two.length === 2 && g.place[0] === g.place[1] && key2(ac?.claims[two[0] as Hour]?.company) === key2(ac?.claims[two[1] as Hour]?.company);
      const bitParts: { at: string; hs: string; comp: string }[] = [];
      // docs/52: the claims as they're said, each with the company the sentence names.
      const confirms: Prop[] = [];
      const bits = (samePlace ? [two] : two.map((h) => [h])).map((hs) => {
        const h = hs[0] as Hour;
        const i = g.hs.indexOf(h);
        const cl = ac?.claims[h];
        // docs/59 item 3: where, not who with: the account has just said its company.
        const compIds: PersonId[] = [];
        const comp = compIds.map((y) => nameOf(c, y));
        for (const y of comp) namedSoFar.add(y);
        // (Company is said only where somebody is named: whoever says so isn't, and that isn't "alone".)
        if (t.sentences.length === 0) for (const x of hs) confirms.push({ k: 'CONFIRMS', person: rest, place: g.place[g.hs.indexOf(x)] as PlaceId, hour: x, ...(compIds.length ? { company: compIds } : {}), by: g.by });
        const own = personOf(c, rest)?.home === cl?.place && cl?.place !== here;
        bitParts.push({ at: own ? 'home' : where(c, g.place[i] as PlaceId, here), hs: andList(hs.map(hourWord)), comp: andList(comp) });
        return `${own ? 'home' : where(c, g.place[i] as PlaceId, here)} at ${andList(hs.map(hourWord))}${comp.length ? `, with ${andList(comp)}` : ''}`;
      });
      const ppl = g.hs.flatMap((h) => ac?.claims[h]?.company ?? []);
      const held = g.hs.some((h) => win.includes(h));
      const pr = P(rest);
      // First, the golden's "So … which was what Coffin had." After a lie caught, the same from the other side.
      const first = t.sentences.length === 0;
      const gloss = first ? (held ? x.pick('one-holds', ['That much of it stood up.', 'That much checked out.']) : x.pick('one-holds-early', ['So far as it went, it stood up.', 'That much checked out.'])) : undefined;
      const restParts = first
        ? []
        : (namedSoFar.clear(),
          g.hs.slice(0, 2).map((h, i) => {
            const cl = ac?.claims[h];
            // The source is the one saying so: "with" names only the others, and anybody named already isn't named again.
            void cl;
            const compIds: PersonId[] = [];
            const comp = compIds.map((y) => nameOf(c, y));
            for (const y of comp) namedSoFar.add(y);
            confirms.push({ k: 'CONFIRMS', person: rest, place: g.place[i] as PlaceId, hour: h, ...(compIds.length ? { company: compIds } : {}), by: g.by });
            return { at: atWhere(c, g.place[i] as PlaceId, here), h, comp: andList(comp) };
          }));
      const text = first
        ? `So ${andList(bits)}, which was what ${src}. ${gloss}`
        : `The rest checked out: ${src.replace(/ had( said)?$/, '')} had ${pr.him} ${andList(restParts.map((y) => `${y.at} at ${hourWord(y.h)}${y.comp ? `, with ${y.comp}` : ''}`))}, same as ${pr.he} said.`;
      const fixComma = (x: string) => x.replace(/(\w), (with [^,]+) and (here|at|home)\b/, '$1, $2, and $3');
      add(
        fixComma(text),
        g.refs,
        {
          rel: 'confirms',
          rule: first ? 'agree' : 'agree-rest',
          hours: g.hs.slice(0, 2),
          people: [rest, ...ppl, ...c.people.filter((y) => src.startsWith(`${y.short} `)).map((y) => y.id)],
          places: g.place,
          ...(gloss !== undefined && fixComma(text).endsWith(` ${gloss}`) ? { gloss } : {}),
          props: confirms,
          ...(first ? { flesh: { merged: samePlace } } : {}),
        },
      );
    }
  }

  // 6, on a list: the way in, first (see below).
  if (kind === 'list') wayIn();

  // 3. A list that says what an account held already said.
  if (kind === 'list' && !fact) {
    const l = listOf(c, rest);
    const agreed: { p: PersonId; h: Hour; id: string }[] = [];
    for (const ln of before_) {
      if (ln.kind !== 'claim' || ln.place !== l?.place || ln.hour === undefined) continue;
      const sp = ln.speaker as PersonId;
      // Somebody this page catches lying is the page's news; where their story agrees can wait (docs/39 §4).
      if ([...caught].some((k) => k.startsWith(`${sp}@`))) continue;
      // docs/59 item 3: somebody the consequence says had been there and gone is said there, once.
      if (gone.some((g) => g.p === sp)) continue;
      if ((l?.entries[ln.hour] ?? []).some((e) => 'person' in e && e.person === sp) && !agreed.some((y) => y.p === sp)) agreed.push({ p: sp, h: ln.hour, id: ln.id });
    }
    for (const y of agreed) covered.add(y.p);
    listAgreed.push(...agreed);
    if (agreed.length && l) {
      const one = agreed[0] as { p: PersonId; h: Hour };
      // "Him" only when the sentence before named them and nobody else it could be.
      const lastSaid = t.sentences[t.sentences.length - 1] ?? '';
      const clear = lastSaid.includes(nameOf(c, one.p)) && !c.people.some((y) => y.id !== one.p && !y.object && y.female === personOf(c, one.p)?.female && lastSaid.includes(y.short));
      add(
        agreed.length === 1
          ? `${nameOf(c, l.watcher)} had ${clear ? P(one.p).him : nameOf(c, one.p)} ${atWhere(c, l.place, here)} at ${hourWord(one.h)}, same as ${P(one.p).he} said.`
          : `${nameOf(c, l.watcher)} had ${andList(agreed.map((y) => `${nameOf(c, y.p)} at ${hourWord(y.h)}`))}, same as they’d said.`,
        agreed.map((y) => y.id),
        {
          rel: 'confirms',
          rule: 'list-agree',
          hours: agreed.map((y) => y.h),
          people: agreed.map((y) => y.p),
          places: [l?.place ?? ''],
          props: agreed.map((y) => ({ k: 'CONFIRMS', person: y.p, place: l.place, hour: y.h, by: { k: 'list', who: l.watcher } }) as Prop),
          flesh: { clear },
        },
      );
    }
  }

  // 5. The scene's street: a side remark puts somebody on it at an hour that matters.
  if (kind === 'account' && !fact) {
    const ac = accountOf(c, rest);
    const street = c.places.find((p) => p.id === c.crime.scene)?.street;
    for (const r of ac?.remarks ?? []) {
      if (!street || !r.text.includes(` on ${street}`)) continue;
      const m = /I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on .+? at (\w+)|at (\w+) I passed ((?:Mrs\.|Miss|Dr\.) \S+|\S+) on/.exec(r.text);
      const name = m?.[1] ?? m?.[4];
      const hh = m?.[2] ?? m?.[3];
      const tail = /, ([^,]+, [^,.]+)\.$/.exec(r.text)?.[1];
      const who = c.people.find((p) => p.short === name);
      void tail;
      void hh;
      const link = isMurder(c) ? `${street} was where ${victimOf(c).short} lived.` : `${street} was where ${clientOf(c).short} kept ${victimOf(c).short}.`;
      add(`The part worth keeping came last. ${link}`, ['givens:gone'], {
        rule: 'street',
        people: [c.client, c.crime.victim, ...(who ? [who.id] : [])],
        places: [c.crime.scene],
        hours: r.facts.map((f) => f.h),
        props: [{ k: 'POINTER', from: 'remark', to: c.crime.scene, why: 'street' }],
      });
    }
  }

  // 6. Who had the way in: new from this page, said by name and hour. (On a list it comes before the
  // list's agreements, rule 3, so that one about the same person can say "her" instead of the name again.)
  if (kind === 'account') wayIn();

  function wayIn(): void {
  if (!fact && (kind === 'list' || (kind === 'account' && t.sentences.length === 0)) && !settles) {
    // Somebody this page catches saying "home", where the means was kept, had it to hand: that goes
    // without saying, and their name has been said twice already (docs/39 §4).
    const atHome = (p: PersonId) => [...caught].some((k) => k.startsWith(`${p}@`)) && personOf(c, p)?.home === c.means.origin;
    const yes = suspectsOf(c).filter((p) => a.accessYes.has(p) && !b.accessYes.has(p) && !atHome(p) && !meansGone.some((g) => g.p === p));
    const no = suspectsOf(c).filter((p) => a.accessNo.has(p) && !b.accessNo.has(p));
    if (yes.length + no.length > 0) {
      const firstAt = (p: PersonId): Hour | undefined => c.means.available.find((h) => a.placed.get(`${p}@${h}`)?.place === c.means.origin);
      const mode = c.setup?.means ?? '';
      const parts: string[] = [];
      const hs: Hour[] = [];
      if (/^told/.test(mode) && yes.every((p) => firstAt(p) !== undefined) && yes.length > 0) {
        const thing = mode === 'told-window' ? 'the window' : 'the key';
        const byHour = new Map<Hour, PersonId[]>();
        for (const p of yes) byHour.set(firstAt(p) as Hour, [...(byHour.get(firstAt(p) as Hour) ?? []), p]);
        const gs = [...byHour.entries()].sort((u, v) => u[0] - v[0]);
        parts.push(`${gs.map(([h, ps], i) => (i === 0 ? `${andList(ps.map((y) => nameOf(c, y)))} heard about ${thing} at ${hourWord(h)}` : `${andList(ps.map((y) => nameOf(c, y)))} at ${hourWord(h)}`)).join(', and ')}.`);
        hs.push(...gs.map(([h]) => h));
      } else if (yes.length > 0) {
        parts.push(`${andList(yes.map((p) => nameOf(c, p)))} ${accessPhrase(c, true, false, here).replace(/^was\b/, yes.length > 1 ? 'were' : 'was')}.`);
      }
      // Round 7, B6: somebody there only once it had to be gone says why it rules them out: "Vitale
      // didn’t come till nine, too late for it", never a bare "Vitale hadn’t, though" about a woman the
      // landlady had in the house at nine.
      const after = Math.max(...c.means.available);
      const lateAt = (p: PersonId): Hour | undefined => (isMurder(c) || /^spare/.test(mode) ? (c.board.hours as Hour[]).find((h) => h > after && a.placed.get(`${p}@${h}`)?.place === c.means.origin) : undefined);
      const noPlain = no.filter((p) => lateAt(p) === undefined);
      if (noPlain.length > 0) parts.push(`${andList(noPlain.map((p) => nameOf(c, p)))} ${accessPhrase(c, false, false, here).replace(/^was\b/, noPlain.length > 1 ? 'were' : 'was').replace(/^wasn’t\b/, noPlain.length > 1 ? 'weren’t' : 'wasn’t')}.`);
      for (const p of no.filter((x) => lateAt(x) !== undefined)) parts.push(`${nameOf(c, p)} didn’t come till ${hourWord(lateAt(p) as Hour)}, too late for it.`);
      const said = parts.map((y) => cap(y)).join(' ');
      // docs/52: who could and who couldn't, each with the hour they had it, where it's said.
      const told = /^told/.test(mode) && yes.every((p) => firstAt(p) !== undefined) && yes.length > 0;
      const access: Prop[] = [...yes.map((p) => ({ k: 'ACCESS', person: p, had: true, ...(told ? { hour: firstAt(p) } : {}) }) as Prop), ...no.map((p) => ({ k: 'ACCESS', person: p, had: false, ...(lateAt(p) !== undefined ? { hour: lateAt(p) } : {}) }) as Prop)];
      add(said, ['givens:means'], { rel: 'narrows', rule: 'way-in', people: [...yes, ...no, c.client], hours: hs, places: [c.means.origin], props: access });
    }
  }
  }

  // 11, on a list (docs/59 item 3): what it means at the hour it happened.
  if (kind === 'list') sayThen();

  // 7. Placements: somebody put somewhere at an hour that matters, by this page and an earlier word, or by this page's word.
  if (!fact && t.sentences.length < 3 && !settles && (kind === 'account' || kind === 'list' || kind === 'confront')) {
    const hs = a.possibleHours.length === 1 ? a.possibleHours : win;
    const groups = new Map<string, { src: string; srcQ: string; items: { p: PersonId; place: PlaceId; h: Hour }[]; refs: string[] }>();
    for (const p of suspectsOf(c)) {
      if ((kind === 'account' && p === rest) || covered.has(p)) continue;
      for (const h of hs) {
        const k = `${p}@${h}`;
        const now = a.placed.get(k);
        if (!now || b.placed.has(k) || now.place === c.crime.scene) continue;
        if (!now.deps.includes(q)) continue;
        const others = now.deps.filter((d) => d !== `account:${p}`);
        if (others.length === 0) continue;
        const srcQ = others.includes(q) ? q : (others.find((d) => heldBeforeQs.has(d)) ?? (others[0] as string));
        if (srcQ === q && listSaid.has(`${now.place}@${h}`)) break;
        // docs/59 item 3: an account's own company is what it has just said, not a consequence of it.
        if (srcQ === q && kind === 'account') break;
        // Whose word it is, as a person: the keeper of this page's list, or whoever else said so (docs/47 C13:
        // "and Ellery would swear to it", not "with the list under both").
        // This page's own account is "he": its speaker is named on the page already (docs/39 §4).
        const src = srcQ === q && kind === 'list' ? `=list:${rest}` : srcQ === q && kind === 'account' ? `=self:${rest}` : sourceName(c, srcQ).replace(/’s (list|story|word)$/, '');
        const g = groups.get(src) ?? { src, srcQ, items: [], refs: [] };
        g.items.push({ p, place: now.place, h });
        g.refs.push(...now.deps.filter((d) => heldBeforeQs.has(d)));
        groups.set(src, g);
        break;
      }
    }
    for (const g of [...groups.values()].slice(0, 2)) {
      const by: Src = g.src.startsWith('=self:') ? { k: 'claim', who: g.src.slice(6) } : g.src.startsWith('=list:') ? { k: 'list', who: g.src.slice(6) } : srcOfQ(g.srcQ);
      // People at one place at one hour run together: "Wehrle and Mulcahy here at ten".
      const runs = new Map<string, { ps: PersonId[]; place: PlaceId; h: Hour }>();
      for (const y of g.items) {
        const r = runs.get(`${y.place}@${y.h}`) ?? { ps: [], place: y.place, h: y.h };
        r.ps.push(y.p);
        runs.set(`${y.place}@${y.h}`, r);
      }
      // Somebody the thought has just been about is "him" here, when they're the only one placed.
      const lastSaid = t.sentences[t.sentences.length - 1] ?? '';
      const only = g.items.length === 1 ? g.items[0]?.p : undefined;
      const sameSex = only ? suspectsOf(c).filter((y) => y !== only && personOf(c, y)?.female === personOf(c, only)?.female && lastSaid.includes(nameOf(c, y))) : [];
      const bits = [...runs.values()].map((r) => `${only && lastSaid.startsWith(`${nameOf(c, only)} `) && sameSex.length === 0 ? P(only).him : andList(r.ps.map((y) => nameOf(c, y)))} ${atWhere(c, r.place, here)} at ${hourWord(r.h)}`);
      // This page's own speaker or keeper is named on the page already: "by her count", "on his word" (docs/39 §4).
      const self = g.src.startsWith('=self:') ? g.src.slice(6) : undefined;
      const keeper = g.src.startsWith('=list:') ? g.src.slice(6) : undefined;
      const swear = self
        ? x.pick('swear-self', [`by ${P(self).his} own telling`, `and ${P(self).he} would swear to it`])
        : keeper
          ? `and ${nameOf(c, keeper)} saw it with ${P(keeper).his} own eyes`
          : x.pick('swear', [`and ${g.src} would swear to it`, `and ${g.src} would say so to anybody`, `and ${g.src} said so`]);
      const him = !!only && lastSaid.startsWith(`${nameOf(c, only)} `) && sameSex.length === 0;
      add(`That put ${andList(bits)}, ${swear}.`, g.refs.length ? g.refs : ['givens:clock'], {
        rule: 'placed',
        props: [...runs.values()].flatMap((r) => r.ps.map((y) => ({ k: 'PLACED', person: y, place: r.place, hour: r.h, by }) as Prop)),
        flesh: { swear, him, ...(self ? { self } : {}), ...(keeper ? { keeper } : {}) },
        hours: g.items.map((y) => y.h),
        people: g.items.map((y) => y.p),
        places: g.items.map((y) => y.place),
        // docs/49: whose word, for the planner to say it as the one who gave it ("He put Tillman here at ten").
      });
    }
  }

  /** docs/59 item 3: whether a list's hour rules somebody out: the place shut, or everybody it had named and no face it had theirs. */
  function sureAt(l: NonNullable<ReturnType<typeof listOf>>, p: PersonId, h: Hour): boolean {
    if (shutAt(c, l.place, h)) return true;
    const es = l.entries[h];
    if (!es) return false;
    const look = personOf(c, p)?.look;
    return listExhaustive(c, l, h) && !es.some((e) => 'look' in e && e.look === look);
  }

  /**
   * docs/59 item 3: who this page's list had earlier in the evening and at none of the hours it could
   * have happened: who had gone. Suspects only, and only where it's news (nobody had put them anywhere
   * else at those hours).
   */
  function goneOf(l: NonNullable<ReturnType<typeof listOf>>, hs: Hour[]): { p: PersonId; was: Hour[] }[] {
    const on = (p: PersonId, h: Hour) => (l.entries[h] ?? []).some((e) => 'person' in e && e.person === p);
    const earlier = (c.board.hours as Hour[]).filter((h) => h < (hs[0] as Hour) && l.entries[h] !== undefined);
    const out: { p: PersonId; was: Hour[] }[] = [];
    for (const p of suspectsOf(c)) {
      if ([...caught].some((k) => k.startsWith(`${p}@`))) continue;
      if (!hs.every((h) => !on(p, h) && sureAt(l, p, h))) continue;
      const was = earlier.filter((h) => on(p, h));
      if (!was.length || hs.every((h) => b.placed.has(`${p}@${h}`))) continue;
      out.push({ p, was });
    }
    return out;
  }

  /**
   * docs/59 item 3: a list's consequence at the hour it happened, never the list again. Who had been
   * where the means was kept and gone ("So Bledsoe had been at Mrs. Nagy’s at nine, where the revolver
   * was kept, and gone before ten; Reinhardt was still there at ten"), or who was there then and who
   * had gone ("So at ten, when Rafferty died, Mosley was still at Moskowitz’s and Bledsoe had gone").
   */
  function sayThen(force = false): void {
    const l = thenList;
    if (!l || !thenHs.length) return;
    const hs = thenHs;
    const on = (p: PersonId, h: Hour) => (l.entries[h] ?? []).some((e) => 'person' in e && e.person === p);
    const by: Src = { k: 'list', who: l.watcher };
    // (`force`: the page has said nothing else; who was there then, whether or not it's news.)
    const there = suspectsOf(c).filter(
      (p) =>
        (force || !covered.has(p)) &&
        ![...caught].some((k) => k.startsWith(`${p}@`)) &&
        (force || !listAgreed.some((y) => y.p === p && hs.includes(y.h))) &&
        hs.every((h) => on(p, h)) &&
        (force || !hs.every((h) => b.placed.get(`${p}@${h}`)?.place === l.place)),
    );
    for (const p of there) covered.add(p);
    for (const g of gone) covered.add(g.p);
    const prev = ((hs[0] as Hour) - 1) as Hour;
    const still = there.length > 0 && there.every((p) => on(p, prev));
    const thereFlags = there.length ? ['there', there.length > 1 ? 'many' : 'one', ...(still ? ['still'] : [])] : [];
    const thereArgs: Args = there.length ? { there: { t: 'people', ids: [...there] }, hours: { t: 'hours', hs: [...hs] } } : {};
    const thereProps = there.flatMap((p) => hs.map((h) => ({ k: 'PLACED', person: p, place: l.place, hour: h, by }) as Prop));
    const names = (ps: readonly PersonId[]) => andList(ps.map((p) => nameOf(c, p)));
    const where = placeName(c, l.place);
    const H = andList(hs.map(hourWord));
    const be = there.length > 1 ? 'were' : 'was';
    // Who had been where the means was kept (the same hours for all of them: one sentence).
    const was0 = meansGone[0]?.was.join();
    // (docs/62, P1: lean, everybody who had been where the means was kept, whatever their hours, in the one
    // sentence: "So Hanrahan, Ruggiero and Reinhardt had all been at the Delmonico rooms, where the laudanum
    // was kept, and had all left by nine", never Hanrahan alone of three. The hours each was there are the
    // landlady's answer, just said; the thought says what they add up to.)
    const allMeans = lean() && meansGone.length > 1 && meansGone.some((g) => g.was.join() !== was0);
    const withMeans = allMeans ? meansGone : meansGone.filter((g) => g.was.join() === was0);
    const plainGone = gone.filter((g) => !withMeans.includes(g));
    let opened = false;
    if (withMeans.length && allMeans) {
      const ps = withMeans.map((g) => g.p);
      const first = hs[0] as Hour;
      const access = ps.filter((p) => a.accessYes.has(p) && !b.accessYes.has(p));
      const kept = `where ${wayWhat(c)} was kept`;
      const tail = there.length ? `; ${names(there)} ${be}${still ? ' still' : ''} there at ${H}` : '';
      add(`${names(ps)} had ${ps.length === 2 ? 'both' : 'all'} been at ${where}, ${kept}, and had ${ps.length === 2 ? 'both' : 'all'} left by ${hourWord(first)}${tail}.`, ['givens:clock', 'givens:means'], {
        rule: 'then',
        ...(lean() && caught.size > 0 ? {} : { opener: 'So' as const }),
        hours: [...hs],
        people: [...ps, ...there],
        places: [l.place],
        props: [
          { k: 'MEANS', how: 'origin', place: l.place },
          ...(access.length ? ps : []).map((p) => ({ k: 'ACCESS', person: p, had: true }) as Prop),
          ...ps.map((p) => ({ k: 'AWAY', person: p, place: l.place, hour: first, by }) as Prop),
          ...thereProps,
        ],
        say: {
          shape: 'PLACED-SET',
          flags: ['then', 'means', 'all', ...(ps.length === 2 ? ['two'] : []), ...(access.length ? ['access'] : []), ...thereFlags],
          args: { gone: { t: 'people', ids: [...ps] }, where: { t: 'place', id: l.place }, first: { t: 'hour', h: first }, kept, ...thereArgs },
        },
      });
      opened = true;
    } else if (withMeans.length) {
      const ps = withMeans.map((g) => g.p);
      const was = withMeans[0]?.was ?? [];
      const first = hs[0] as Hour;
      const access = ps.filter((p) => a.accessYes.has(p) && !b.accessYes.has(p));
      const kept = `where ${wayWhat(c)} was kept`;
      const tail = there.length ? `; ${names(there)} ${be}${still ? ' still' : ''} there at ${H}` : '';
      add(`${names(ps)} had been at ${where} at ${andList(was.map(hourWord))}, ${kept}, and gone before ${hourWord(first)}${tail}.`, ['givens:clock', 'givens:means'], {
        rule: 'then',
        // (docs/60: lean, no "So" after a story that didn't hold: the readers took it to follow from that.)
        ...(lean() && caught.size > 0 ? {} : { opener: 'So' as const }),
        hours: [...was, ...hs],
        people: [...ps, ...there],
        places: [l.place],
        props: [
          ...ps.flatMap((p) => was.map((h) => ({ k: 'PLACED', person: p, place: l.place, hour: h, by }) as Prop)),
          { k: 'MEANS', how: 'origin', place: l.place },
          ...access.map((p) => ({ k: 'ACCESS', person: p, had: true }) as Prop),
          ...ps.map((p) => ({ k: 'AWAY', person: p, place: l.place, hour: first, by }) as Prop),
          ...thereProps,
        ],
        say: {
          shape: 'PLACED-SET',
          flags: ['then', 'means', ...(access.length ? ['access'] : []), ...thereFlags],
          args: { gone: { t: 'people', ids: [...ps] }, where: { t: 'place', id: l.place }, before: { t: 'hours', hs: [...was] }, first: { t: 'hour', h: first }, kept, ...thereArgs },
        },
      });
      opened = true;
    }
    const thereNow = withMeans.length ? [] : there;
    if (!thereNow.length && !plainGone.length) return;
    const goneIds = plainGone.map((g) => g.p);
    // docs/66, P1: at Hard-boiled, on the page whose own sighting rules out an hour, the window isn't
    // said again after it ("Carbone was still alive at the Odessa at nine. So at nine and ten, when it
    // could have happened, …" read as undoing it): the sighting is the page's fact, and its thought.
    if (fact && lean() && sightingHere() !== undefined) return;
    const reason = reasonFor(hs);
    // (docs/66, P1: an hour said bare, where its reason is spent or the hour is settled at Hard-boiled.)
    const rz = reason ? `, ${reason}` : '';
    const text = thereNow.length
      ? `At ${H}${rz}, ${names(thereNow)} ${be}${still ? ' still' : ''} at ${where}${goneIds.length ? `, and by then ${names(goneIds)} had left` : ''}.`
      : `At ${H}${rz}, ${names(goneIds)} had gone from ${where}.`;
    add(text, ['givens:clock'], {
      rule: 'then',
      ...(opened || (lean() && caught.size > 0) ? {} : { opener: 'So' as const }),
      hours: [...hs],
      people: [...thereNow, ...goneIds],
      places: [l.place],
      props: [...(thereNow.length ? thereProps : []), ...goneIds.flatMap((p) => hs.map((h) => ({ k: 'AWAY', person: p, place: l.place, hour: h, by }) as Prop))],
      say: {
        shape: 'PLACED-SET',
        flags: ['then', ...(thereNow.length ? thereFlags : []), ...(goneIds.length ? ['gone'] : []), ...(reason ? [] : ['bare'])],
        args: { where: { t: 'place', id: l.place }, hours: { t: 'hours', hs: [...hs] }, ...(reason ? { reason } : {}), ...(thereNow.length ? thereArgs : {}), ...(goneIds.length ? { gone: { t: 'people', ids: goneIds } } : {}) },
      },
    });
  }

  /** docs/66, P1: the hour this page's own fact saw the dead (or the pet) at, where it rules out one of the office's two. */
  function sightingHere(): Hour | undefined {
    if (!(b.possibleHours.length > 1 && a.possibleHours.length === 1)) return undefined;
    const lost = b.possibleHours.filter((h) => !a.possibleHours.includes(h));
    return lost.find((h) => (a.placed.get(`${c.crime.victim}@${h}`)?.deps ?? []).includes(q));
  }

  // 8. The handover: something under a coat. Not whose, not what, until the board says. docs/59 item 3:
  // the watcher has just said the coat; the thought is the link to what went, not the coat again.
  if (kind === 'list' && !fact) {
    const l = listOf(c, rest);
    const r = l?.remarks.find((y) => y.gives?.whereNow);
    if (r) {
      const scene = placeName(c, c.crime.scene);
      // (The coat's hour is the watcher's, said on this page: the page tells it.)
      const HOUR: Record<string, Hour> = { eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      const hh = HOUR[/^(\w+):/.exec(r.text)?.[1]?.toLowerCase() ?? ''] ?? r.facts[0]?.h;
      // (Of three lengths, so the page's rhythm has one to trade for: docs/49's list smell.)
      add(x.pick('handover-link', [`Whatever went out of ${scene} tonight had to end up somewhere.`, `Something had gone out of ${scene} tonight, and it had to go somewhere.`, 'Whatever went out had to go somewhere.', `I thought about what had gone out of ${scene} tonight, and about where a thing like that ends up at this hour of the night.`]), ['givens:gone'], {
        rule: 'gloss',
        people: [],
        places: [c.crime.scene],
        hours: hh !== undefined ? [hh as Hour] : [],
      });
    }
  }

  // 4. The window narrowed, by somebody who saw him alive, or had the dog. docs/59 item 3: what it
  // makes the hour, never the office's hours and the sighting said again. A walk says the hour ("So it
  // happened at eleven, the other hour Kreuzer had given me"); above it, the link only ("Ten was one
  // of the two hours Kreuzer had given me"), and the player says which is left (docs/46 §2).
  // (docs/62, P1: and at Hard-boiled too, where the sighting is this page's own fact: "So Carbone was
  // still at the Odessa at nine" is what the barman's answer means, and it's said first. Only the link,
  // never which hour is left.)
  if (b.possibleHours.length > 1 && a.possibleHours.length === 1) {
    const lost = b.possibleHours.filter((h) => !a.possibleHours.includes(h));
    const h1 = a.possibleHours[0] as Hour;
    const seen = lost.map((h) => ({ h, x: a.placed.get(`${c.crime.victim}@${h}`) })).find((y) => y.x && (!fact || (lean() && (y.x.deps ?? []).includes(q))));
    if (seen?.x) {
      const cl = clientOf(c).short;
      if (walk) {
        const what = isMurder(c) ? 'it happened' : `${victimOf(c).short} went`;
        add(`${cap(what)} at ${hourWord(h1)}, the other hour ${cl} had given me.`, ['givens:clock'], {
          rel: 'narrows',
          rule: 'narrows',
          opener: 'So',
          hours: [h1],
          people: [c.crime.victim, c.client],
          places: [],
          props: [{ k: 'NARROWS', hour: h1 }],
          say: { shape: 'WINDOW-ALIVE', flags: ['narrows', isMurder(c) ? 'murder' : 'small'], args: { client: { t: 'person', id: c.client }, victim: { t: 'person', id: c.crime.victim }, narrowed: { t: 'hour', h: h1 } } },
        });
      } else {
        // (Above a walk, the link: the sighting, at one of the hours it could have happened. Which one is left is the player's.)
        const at = seen.x.place;
        // (docs/62 item 12: the hours said as what happened, in a clause of their own: "Fritz was still at
        // the Delmonico rooms at ten, and he went at ten or eleven", never "one of the two hours it could have happened".)
        // (Without a pronoun the next sentence's "he" could be read as: "it happened at nine or ten".)
        // (docs/62, skim round 1: "…, and it happened at nine or ten" read as a non sequitur: whose hours they are.)
        const done = `${clientOf(c).short} had said ${office.map((h) => hourWord(h)).join(' or ')}`;
        // (docs/66, P1: at Hard-boiled the thought says the fact and nothing after it: the client's two
        // hours said again behind a sighting that rules one out read as undoing it.)
        add(fact && lean() ? `${cap(victimOf(c).short)} was still ${isMurder(c) ? 'alive ' : ''}at ${placeName(c, at)} at ${hourWord(seen.h)}.` : `${cap(victimOf(c).short)} was still ${isMurder(c) ? 'alive ' : ''}at ${placeName(c, at)} at ${hourWord(seen.h)}, and ${done}.`, ['givens:clock'], {
          rel: 'narrows',
          rule: 'alive',
          hours: [seen.h],
          people: [c.crime.victim],
          places: [at],
          props: [{ k: 'ALIVE', victim: c.crime.victim, place: at, hour: seen.h }],
          say: { shape: 'WINDOW-ALIVE', flags: ['link', isMurder(c) ? 'murder' : 'small', ...(fact && lean() ? ['fact'] : [])], args: { victim: { t: 'person', id: c.crime.victim }, place: { t: 'place', id: at }, hour: { t: 'hour', h: seen.h }, ...(fact && lean() ? {} : { done }) } },
        });
        // docs/66, P1: at the link (Coddled to Medium) the hour is a link, and the thought says it when
        // the page's facts settle it: "So he went at ten." (Never who: the hour is everybody's.)
        if (!fact && lean()) {
          const what = isMurder(c) ? 'it happened' : `${victimOf(c).short} went`;
          add(`${cap(what)} at ${hourWord(h1)}.`, ['givens:clock'], {
            rel: 'narrows',
            rule: 'narrows',
            opener: 'So',
            hours: [h1],
            people: [c.crime.victim],
            places: [],
            props: [{ k: 'NARROWS', hour: h1 }],
            say: { shape: 'WINDOW-ALIVE', flags: ['narrows', 'link', isMurder(c) ? 'murder' : 'small'], args: { victim: { t: 'person', id: c.crime.victim }, pet: { t: 'person', id: c.crime.victim }, narrowed: { t: 'hour', h: h1 } } },
          });
        }
      }
    }
  }

  // 9. Who's left, when somebody new is placed away and the clock is still open. A walk only.
  if (walk && a.who === undefined && a.possibleHours.length > 1 && a.cleared.size > b.cleared.size) {
    const left = suspectsOf(c).filter((p) => !a.cleared.has(p));
    if (left.length === 1) {
      const [h0, h1] = [a.possibleHours[0] as Hour, a.possibleHours[a.possibleHours.length - 1] as Hour];
      add(`That left ${andList(left.map((p) => nameOf(c, p)))}, and the clock still open between ${hourWord(h0)} and ${hourWord(h1)}.`, ['givens:clock'], { rel: 'narrows', rule: 'left', people: left, hours: a.possibleHours, props: [{ k: 'LEFT', people: left, hours: [h0, h1] }], say: { shape: 'LEFT', flags: ['open', 'one'], args: { person: { t: 'person', id: left[0] as PersonId }, from: { t: 'hour', h: h0 }, to: { t: 'hour', h: h1 } } } });
    }
  }

  // 11. The hours that matter, and whose word is under them: always on a list with room for it, and on anything else that touched nothing.
  // At fact level this is the thought: the page's own fact, said again at the hours that matter.
  hoursThatMatter();
  // docs/59 item 3: a list page that drew no consequence yet says what the list means then: who was
  // there (news or not), or that none of them was.
  if (kind === 'list' && t.sentences.length === 0 && thenList && thenHs.length) {
    sayThen(true);
    if (t.sentences.length === 0) {
      const where = placeName(c, thenList.place);
      const either = thenHs.length === 2 ? `${hourWord(thenHs[0] as Hour)} or ${hourWord(thenHs[1] as Hour)}` : andList(thenHs.map(hourWord));
      // (docs/60: lean, "the people with a reason": the skim readers didn't know whom I was asking about.)
      // (docs/62 item 12: the people by name, and whose word: "At nine or ten, when it could have happened,
      // Zeldin saw none of Ruggiero, Winslow or Hanrahan at the Shamrock", never "none of the people with a
      // reason", which one reader took to say a suspect seen there at another hour wasn't.)
      // (docs/62, skim round 1: "Mrs. Szabo saw none of Miss Moskin, Mrs. Blau, Glick, Kaminsky or Miss
      // Kahane at the Peacock at ten" stopped a reader: only the ones nothing held puts elsewhere then.)
      const known = suspectsOf(c).filter((p) => knownPeople(c, run).has(p));
      const loose = known.filter((p) => !thenHs.every((h) => { const at = a.placed.get(`${p}@${h}`)?.place; return !!at && at !== thenList.place; }));
      const asking = loose.length ? loose : known;
      const W = nameOf(c, thenList.watcher);
      // (docs/66, skim round 1: lean, "didn’t see A, B or C", never "saw none of A, B or C", which readers stopped on.)
      const nobody = asking.length === 1 || lean() ? `${W} didn’t see ${asking.length === 1 ? nameOf(c, asking[0] as PersonId) : `${asking.slice(0, -1).map((p) => nameOf(c, p)).join(', ')} or ${nameOf(c, asking[asking.length - 1] as PersonId)}`}` : asking.length === 2 ? `${W} saw neither ${nameOf(c, asking[0] as PersonId)} nor ${nameOf(c, asking[1] as PersonId)}` : `${W} saw none of ${asking.slice(0, -1).map((p) => nameOf(c, p)).join(', ')} or ${nameOf(c, asking[asking.length - 1] as PersonId)}`;
      // (docs/66, P1: an hour said bare where its reason is spent or settled, at Hard-boiled.)
      const rz = reasonFor(thenHs) ? `, ${reasonFor(thenHs)}` : '';
      const none = lean() && asking.length ? [`At ${either}${rz}, ${nobody} at ${where}.`, `${nobody} at ${where} at ${either}${rz}.`] : lean() ? [`None of the people with a reason was at ${where} at ${either}, ${reasonFor(thenHs)}.`, `At ${either}, ${reasonFor(thenHs)}, none of the people with a reason was at ${where}.`] : [`None of the people I was asking about was at ${where} at ${either}, ${reasonFor(thenHs)}.`, `At ${either}, ${reasonFor(thenHs)}, none of the people I was asking about was at ${where}.`];
      add(x.pick('then-none', none), ['givens:clock'], { rule: 'gloss', people: [], places: [thenList.place], hours: [...thenHs], tex: 'keep' });
    }
  }
  // docs/62, P1: the dead man (or the pet) seen alive at an hour it could have happened is what a
  // witness's answer means first: said before who else was where.
  const alive = (t.parts ?? []).findIndex((y) => y.rule === 'alive');
  // (Not where it would take the pronoun from somebody of the dead's sex the rest of the thought says
  // twice: said first, the dead would be whom a later "he" read as, and the name would be said again.)
  const vsex = pronOf(c, c.crime.victim).he;
  const twice = c.people.some((y) => y.id !== c.crime.victim && !y.object && pronOf(c, y.id).he === vsex && (t.parts ?? []).filter((x, i) => i !== alive && x.people.includes(y.id)).length >= 2) || (kind === 'list' && !!personOf(c, rest) && pronOf(c, rest).he === vsex && (t.parts ?? []).length > 3);
  if (lean() && alive > 0 && t.parts && t.parts.length === t.sentences.length && (!twice || settlesHere)) {
    // (docs/66, P1: and the hour it settles goes with it.)
    const n = t.parts[alive + 1]?.rule === 'narrows' ? 2 : 1;
    t.parts.unshift(...t.parts.splice(alive, n));
    t.sentences.unshift(...t.sentences.splice(alive, n));
  }
  t.refs = [...new Set(t.refs.filter(Boolean))];
  t.places = t.places.filter(Boolean);
  return t;

  function hoursThatMatter(): void {
  if (kind !== 'account') return;
  if (!((t.sentences.length === 0) || (t.sentences.length < 3 && !settles && !t.hours.some((h) => win.includes(h))))) return;
  const hs = win.slice(0, 2) as Hour[];
  const clockRef = c.givens.lines?.some((g) => g.kind === 'window' || g.kind === 'clock') ? ['givens:clock'] : ['givens:found'];
  // docs/59 item 3: not their word again ("At ten, when Rafferty died, she said Moskowitz’s"), but what
  // stands under it: nobody but them had said where they were then. Not where a line held goes against
  // it (that's a collision, said or not), nor where somebody else has put them.
  const lines = linesHeld(c, run);
  const crossed = new Set(collisionsOf(c, run, rest).map((col) => col.hour));
  // (Somebody else's word under it: a line about them at that hour, or the solver's placement resting
  // on more than their own account, an owning up that named them, say.)
  const backed = (h: Hour) => lines.some((l) => l.hour === h && l.speaker !== rest && l.about.includes(rest)) || (a.placed.get(`${rest}@${h}`)?.deps ?? []).some((d) => d !== `account:${rest}` && d !== q);
  const alone = hs.filter((h) => accountOf(c, rest)?.claims[h] && !backed(h) && !crossed.has(h) && !caught.has(`${rest}@${h}`));
  // docs/60 items 2 and 6: at Hard-boiled, the signpost the readers found the point by: what they said
  // for the hours it could have happened, and "nobody had backed it up" where nobody had. (The page's
  // own fact at the hours that matter, docs/46's fact level: it ties to nothing but this page.)
  if (fact && lean()) {
    const claimed = alone.length ? alone : hs.filter((h) => accountOf(c, rest)?.claims[h]);
    if (claimed.length) {
      const said = claimed.map((h) => claimSaid(c, rest, h));
      const same = said.every((y) => y.replace(/ at \w+$/, '') === (said[0] ?? '').replace(/ at \w+$/, ''));
      // (docs/62 item 2: what they said as a clause, "she was at the Automat at nine and home at ten".)
      const what = claimWas(c, rest, claimed, { mark: markPronoun(c, rest), ...(same ? { hours: false } : {}) });
      const listy = !same;
      const H = andList(claimed.map(hourWord));
      // (The dead man or the pet by name, as the office has it: "when Carbone could have died". At the
      // fact level the thought is the page's own, and the name is what it shares with the night.)
      // (docs/66, P1: said once a night at most, and never of an hour the facts have settled.)
      const reason = settledBefore || factReasonSpent ? '' : office.length > 1 ? whyHours(c, office) : whyHours(c, claimed);
      const rz = reason ? `, ${reason}` : '';
      const flags = ['hours', ...(listy ? ['listy'] : []), ...(alone.length ? [] : ['said-only']), ...(reason ? [] : ['bare'])];
      const text = alone.length ? (listy ? `${nameOf(c, rest)} said ${what}, and for ${H}${rz}, nobody had backed it up.` : `${nameOf(c, rest)} said ${what} at ${H}${rz}, and nobody had backed it up.`) : listy ? `${nameOf(c, rest)} said ${what}${rz}.` : `${nameOf(c, rest)} said ${what} at ${H}${rz}.`;
      add(text, clockRef, {
        rule: 'own-hours',
        hours: claimed,
        people: [rest],
        places: claimed.map((h) => accountOf(c, rest)?.claims[h]?.place ?? ''),
        props: [{ k: 'WINDOW', hours: [...claimed] }, ...claimed.map((h) => ({ k: 'CLAIM', person: rest, place: accountOf(c, rest)?.claims[h]?.place ?? '', hour: h }) as Prop)],
        say: { shape: 'OWN-WORD', flags, args: { hs: H, hourword: claimed.length > 1 ? 'hours' : 'hour', who: nameOf(c, rest), what, ...(reason ? { reason } : {}) } },
      });
      return;
    }
  }
  if (alone.length) {
    const reason = reasonFor(alone);
    add(`Nobody else had said where ${nameOf(c, rest)} was at ${andList(alone.map(hourWord))}${reason ? `, ${reason}` : ''}.`, clockRef, {
      rule: 'unbacked',
      hours: alone,
      people: [rest],
      places: [],
      props: [{ k: 'UNBACKED', person: rest, hours: [...alone] }],
      say: { shape: 'OWN-WORD', flags: ['unbacked', ...(reason ? [] : ['bare'])], args: { person: { t: 'person', id: rest }, hours: { t: 'hours', hs: [...alone] }, ...(reason ? { reason } : {}) } },
    });
    return;
  }
  // (Nothing new stands under it: an aside, no fact; where a line held goes against it, the aside never
  // says nothing does, docs/55 1c.)
  if (t.sentences.length > 0) return;
  const asides = [...crossed].some((h) => hs.includes(h))
    ? ['I wrote it down next to what else I had for that hour.', 'It went in the notebook as said, beside the rest of that hour.', 'I took it down as given and set it beside the rest.']
    : ['I wrote it down and left it standing, for now.', 'I took it down the way it was given.', 'I let it stand.', 'I wrote it down as said.', 'I took it as given.'];
  add(x.pick([...crossed].some((h) => hs.includes(h)) ? 'own-word-crossed' : 'own-word', asides), clockRef, { rule: 'gloss', people: [rest] });
  }
}

/**
 * docs/47 B11: the walk's elimination (Raw), as one passage: every rival placed by somebody else's
 * word, or without the way in, and "That left one person who…". Said once a night, by the turn or
 * by the page after the one whose fact completed it, never on that page. Null when who isn't
 * settled on what's held, or the hour isn't one.
 */
export function eliminationOf(c: BoardCase, run: BoardRun, here: PlaceId, heldBeforeQs: ReadonlySet<string> = new Set(solverHeld(run))): Thought | null {
  const t = blank();
  const a = solveHeld(c, solverHeld(run));
  if (a.who === undefined) return null;
  {
    const hc = a.possibleHours.length === 1 ? (a.possibleHours[0] as Hour) : undefined;
    const lines: string[] = [];
    const refs: string[] = [];
    const ppl: PersonId[] = [];
    const pls: PlaceId[] = [];
    if (hc !== undefined) {
      const placedBy = new Map<string, { place: PlaceId; who: PersonId[] }>();
      const noWay: PersonId[] = [];
      for (const p of suspectsOf(c)) {
        if (p === a.who) continue;
        const cl = a.cleared.get(p);
        if (!cl) continue;
        if (cl.how === 'no access') {
          noWay.push(p);
          continue;
        }
        const pl = a.placed.get(`${p}@${hc}`);
        if (!pl) continue;
        const by = pl.deps.find((d) => d !== `account:${p}` && !d.startsWith('confront:')) ?? pl.deps.find((d) => d !== `account:${p}`) ?? '';
        const src = sourceName(c, by);
        const k = `${pl.place}|${src}`;
        const g = placedBy.get(k) ?? { place: pl.place, who: [] };
        g.who.push(p);
        placedBy.set(k, g);
        refs.push(...pl.deps);
        ppl.push(p, ...sourcePeople(by));
        pls.push(pl.place);
      }
      const entries = [...placedBy.entries()];
      const ps: string[] = [];
      // docs/52: each placement's propositions, beside its words.
      const pps: Prop[][] = [];
      // docs/52 build 2: and each as a composite to be voiced.
      const says: SaySpec[] = [];
      const placedAt = (p: PersonId): Prop => {
        const pl = a.placed.get(`${p}@${hc}`);
        const by = pl?.deps.find((d) => d !== `account:${p}` && !d.startsWith('confront:')) ?? pl?.deps.find((d) => d !== `account:${p}`) ?? '';
        return { k: 'PLACED', person: p, place: pl?.place ?? '', hour: hc, by: srcOfQ(by) };
      };
      const done = new Set<string>();
      for (const [k, g] of entries) {
        if (done.has(k)) continue;
        // "Fairbanks was at the Shamrock, with Bellucci’s word. Bellucci was at the Shamrock, with Fairbanks’s word": one sentence.
        const [, src] = k.split('|') as [string, string];
        const mate = g.who.length === 1 ? entries.find(([k2, g2]) => k2 !== k && g2.place === g.place && g2.who.length === 1 && src === nameOf(c, g2.who[0] as PersonId) && k2.split('|')[1] === nameOf(c, g.who[0] as PersonId)) : undefined;
        const at = (ps.length === 0 ? 'first' : 'next') as string;
        if (mate) {
          done.add(mate[0]);
          ps.push(`${nameOf(c, g.who[0] as PersonId)} and ${nameOf(c, mate[1].who[0] as PersonId)} were ${atWhere(c, g.place, here)}, and each said so of the other`);
          pps.push([placedAt(g.who[0] as PersonId), placedAt(mate[1].who[0] as PersonId)]);
          says.push({ shape: 'PLACED-SET', flags: ['elim', at, 'mutual'], args: { people: { t: 'people', ids: [g.who[0] as PersonId, mate[1].who[0] as PersonId] }, place: { t: 'at', id: g.place, here }, hour: { t: 'hour', h: hc } } });
          continue;
        }
        // "and Alfano said so", not "with Alfano’s word" (docs/47 C13).
        ps.push(`${andList(g.who.map((y) => nameOf(c, y)))} ${g.who.length > 1 ? 'were' : 'was'} ${atWhere(c, g.place, here)}, and ${src.replace(/’s word$/, '')} said so`);
        pps.push(g.who.map(placedAt));
        says.push({ shape: 'PLACED-SET', flags: ['elim', at, g.who.length > 1 ? 'many' : 'one'], args: { people: { t: 'people', ids: [...g.who] }, place: { t: 'at', id: g.place, here }, hour: { t: 'hour', h: hc }, src: src.replace(/’s word$/, '') } });
      }
      // Each a sentence of its own, with its propositions (docs/52).
      const said: { text: string; props: Prop[]; say?: SaySpec }[] = [];
      ps.forEach((x, i) => said.push({ text: i === 0 ? `At ${hourWord(hc)} ${x}.` : `${x}.`, props: pps[i] as Prop[], say: says[i] as SaySpec }));
      if (ps.length) lines.push(`At ${hourWord(hc)} ${ps.join('. ')}.`);
      if (noWay.length) {
        lines.push(`${cap(andList(noWay.map((y) => nameOf(c, y))))} ${accessPhrase(c, false, true)}.`);
        said.push({ text: lines[lines.length - 1] as string, props: noWay.map((y) => ({ k: 'ACCESS', person: y, had: false }) as Prop), say: { shape: 'ACCESS-SET', flags: ['elim', 'no', noWay.length > 1 ? 'nones' : 'none'], args: { none: { t: 'people', ids: [...noWay] }, access: accessPhrase(c, false, true) } } });
        ppl.push(...noWay);
      }
      {
        // The scene's street, if somebody was seen on it then: the golden's last clause.
        const street = c.places.find((p) => p.id === c.crime.scene)?.street;
        const seen = street && linesHeld(c, run).some((l) => l.kind === 'remark' && l.text.includes(` on ${street}`) && l.about.includes(a.who as PersonId));
        lines.push(`That left one person who ${accessPhrase(c, true, true)}, with nobody to back up where they were at ${hourWord(hc)}${seen ? `, and who’d been seen on ${street} at ${hourWord(hc)}` : ''}.`);
        said.push({ text: lines[lines.length - 1] as string, props: [{ k: 'LEFT', hours: [hc], ...(seen ? { seen: true } : {}) }], say: { shape: 'LEFT', flags: ['last', seen ? 'seen' : 'unseen'], args: { access: accessPhrase(c, true, true), hour: { t: 'hour', h: hc }, ...(seen && street ? { street } : {}) } } });
      }
      if (lines.length) {
        t.sentences.push(lines.join(' '));
        // docs/49, Planner 2: each placement a fact of its own, for the planner to join.
        const parts = PLAN.ops ? said : [{ text: lines.join(' '), props: said.flatMap((x) => x.props) }];
        for (const x of parts) t.parts?.push({ text: x.text, relation: 'narrows', rule: 'elimination', refs: [...refs.filter((r) => heldBeforeQs.has(r)), 'givens:means'], hours: [hc], people: [...ppl], places: [...pls], props: x.props, ...('say' in x && x.say ? { say: x.say } : {}) });
        t.refs.push(...refs.filter((r) => heldBeforeQs.has(r)), 'givens:means');
        t.hours.push(hc);
        t.people.push(...ppl);
        t.places.push(...pls);
      }
    }
  }
  if (t.sentences.length === 0) return null;
  t.refs = [...new Set(t.refs.filter(Boolean))];
  t.places = t.places.filter(Boolean);
  return t;
}

/**
 * docs/66, P1: whether a page before this one tonight said the hour's reason as the window ("when it
 * could have happened", "when Carbone could have been given the chloral"): at Hard-boiled it's said
 * once a night.
 */
function reasonSaidBefore(c: BoardCase, before: BoardRun, office: readonly Hour[]): boolean {
  const said = ['when it could have happened', whyHours(c, office)];
  return before.log.some((pg) => pg.blocks.some((bl) => bl.kind === 'prose' && bl.voice !== 'answer' && said.some((x) => bl.text.includes(x))));
}

function key2(xs: readonly string[] | undefined): string {
  return [...(xs ?? [])].sort().join(',');
}

function sourcePeople(q: string | undefined): PersonId[] {
  if (!q) return [];
  const [kind, rest] = q.split(':') as [string, string];
  return kind === 'list' || kind === 'account' ? [rest] : kind === 'confront' ? [rest.split('@')[0] as string] : [];
}

export type { Solved };
