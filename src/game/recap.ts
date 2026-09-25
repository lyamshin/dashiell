/**
 * M12 Part 2 — the recap: the detective taking stock.
 *
 * A paragraph or two in his voice, after something has shifted, laying out
 * what the notebook holds and what is still open: when and where it happened
 * and how, who has told their evening and whose has somebody else's word
 * under it, whose story has come apart and what it covered, who nobody has
 * placed at the half hour that matters, and what he means to do next. It says
 * nothing the grid does not hold — every clause is read off the grid, the
 * notebook's board and the open leads — plus the absence of a fact, which may
 * be named ("Nobody had told me where Marchetti was at half past eight"). It
 * never concludes: no verdict, no "cleared", no name for the crime.
 *
 * `recapFacts` is pure: the notebook at a moment, as keyed facts. The key
 * says exactly what a clause asserts, so the correspondence checker can run
 * the derivation again from the notebook alone and find it (M8's pattern for
 * the thoughts). `renderRecap` writes the facts no earlier recap has said,
 * between an opening line and a closing one off the `recap` deck, 80 to 180
 * words. `recapTrigger` says when one comes after a page.
 */

import type { Id, Person, Tick } from '../gen/types.js';
import { spokenClock } from '../gen/types.js';
import type { CaseView } from './derive.js';
import { establishedFrom, threadsFor } from './derive.js';
import { gridFrom, type GridEntry } from './grid.js';
import { buildNotebook } from './notebook.js';
import { displayName, lieKeyOf } from './m9.js';
import type { Page, PageShape, RecapClauseTrace, RecapMemory, RunState, SheetUse } from './types.js';
import { DECKS, tagOf, type Card, type Dealer } from './voice/cards.js';
import { lineMemory, recapFrame } from './scene/sheet-pages.js';
import { sheetsOn } from './scene/realize.js';
import { pronounOf } from './voice/cast.js';
import { tidyPunctuation } from './voice/prose.js';
import { namedIn, proseTexts } from './scene/text.js';
import {
  RECAP_ANCHOR,
  RECAP_ANCHOR_AGAIN,
  RECAP_CLAIMED_ALONE,
  RECAP_CLAIMED_WITH,
  RECAP_CLAIMED_ANON,
  RECAP_CONFLICT,
  RECAP_CONFLICT_ANON,
  RECAP_CONFLICT_FOUND,
  RECAP_CONFLICT_NOT,
  RECAP_METHOD,
  RECAP_NEXT_ASK,
  RECAP_NEXT_EVENING,
  RECAP_NEXT_PUT,
  RECAP_NEXT_SEARCH,
  RECAP_OTHERS,
  RECAP_OTHERS_ANON,
  RECAP_OTHERS_HOLE,
  RECAP_SEEN,
  RECAP_UNPLACED_AGAIN,
  RECAP_UNPLACED_MANY,
  RECAP_UNPLACED_ONE,
  RECAP_WHEN,
} from './voice-data.js';

/** What set a recap off. */
export type RecapTrigger = 'lie' | 'confront' | 'window' | 'link' | 'hour' | 'demand';

/** The recap's word count, both ends inclusive. */
export const RECAP_WORDS: readonly [number, number] = [80, 180];

/** Pages before the frame (when, where, how) may be said again to make a recap's length. */
export const RECAP_FRAME_GAP = 4;

type Part = 'when' | 'people' | 'next';

/** One thing the notebook holds (or lacks), keyed by exactly what a clause about it asserts. */
export interface RecapFact {
  key: string;
  part: Part;
  kind: 'when' | 'anchor' | 'method' | 'confronted' | 'conflict' | 'claimed' | 'others' | 'seen' | 'unplaced' | 'next';
  personIds: Id[];
  placeIds: Id[];
  ticks: Tick[];
  anchorIds: Id[];
  /** The one person the clause is about, for a pronoun in the clause after it. */
  subjectId?: Id;
  /** Lower goes first when a recap runs long and has to leave something for the next one. */
  keep: number;
  /** The clause's words, from a template the renderer picks. `prev` is who the clause before was about. */
  say: (pick: Picker, prev: Id | undefined) => string;
}

/** A template picker: one of the lines, a joke only when the paragraph has had none. */
export type Picker = (lines: readonly string[]) => string;

const cap = (s: string): string => (s.length === 0 ? s : `${s.charAt(0).toUpperCase()}${s.slice(1)}`);

function fillLine(line: string, slots: Record<string, string | undefined>): string {
  let out = line.replace(/^\*/, '');
  for (const m of new Set(out.match(/\{(\w+)\}/g) ?? [])) {
    const value = slots[m.slice(1, -1)];
    if (value === undefined) return '';
    out = out.split(m).join(value);
  }
  return cap(tidyPunctuation(out));
}

/** "between eight and half past eight", "at half past eight". */
export function spanSaid(ticks: readonly Tick[]): string {
  if (ticks.length === 0) return '';
  const a = ticks[0] as Tick;
  const b = ticks[ticks.length - 1] as Tick;
  if (a === b) return `at ${spokenClock(a)}`;
  return `between ${spokenClock(a).replace(/ o[’']clock$/, '')} and ${spokenClock(b)}`;
}

const SECRET_DOING: Record<string, string> = {
  affair: 'seeing somebody on the quiet',
  embezzling: 'taking money that wasn’t hers to take',
  'gambling-debt': 'running up a gambling debt',
  fence: 'selling things that weren’t hers to sell',
  fencing: 'selling things that weren’t hers to sell',
  blackmail: 'blackmailing somebody',
  'secret-drinking': 'drinking where nobody could see',
  drinking: 'drinking where nobody could see',
  'forged-identity': 'living under a name that wasn’t hers',
  dope: 'buying morphine',
  'union-organizing': 'organizing a union',
  'hidden-family': 'visiting a child nobody was supposed to know about',
};

/** What somebody's secret was, said plainly, in their pronoun. */
function secretSaid(person: Person): string | null {
  const type = person.secret?.type;
  if (!type) return null;
  const line = SECRET_DOING[type];
  if (!line) return null;
  return pronounOf(person) === 'she' ? line : line.replace(/\bhers\b/g, 'his').replace(/\bher\b/g, 'his');
}

/** The notebook as it stands, for the recap: the run with the pencil left out. */
function inkOnly(view: CaseView, state: RunState, everyone: boolean): RunState {
  return {
    ...state,
    links: {},
    marks: {},
    ...(everyone ? { met: view.kase.people.map((p) => p.id) } : {}),
  };
}

/**
 * Everything a recap could say about the notebook in `state`, in the order a
 * recap says it. `everyone` puts every person in the notebook, which is how
 * the correspondence checker asks for a superset: a clause about one person
 * is keyed by that person alone, so what the notebook held is still found.
 */
export function recapFacts(
  view: CaseView,
  state: RunState,
  opts: { everyone?: boolean; prefer?: Id } = {},
): RecapFact[] {
  const kase = view.kase;
  const st = inkOnly(view, state, opts.everyone === true);
  const book = buildNotebook(view, st);
  const grid = gridFrom(view, st, book);
  const out: RecapFact[] = [];
  const name = (id: Id): string => displayName(view, st, id);
  // Somebody the pages so far have named — the reader knows who they are.
  // With `everyone`, the checker's superset, anybody.
  const read = new Set<Id>([view.victim.id, view.client.id, ...namedIn(view, st.log.flatMap(proseTexts))]);
  const readerKnows = (id: Id): boolean => opts.everyone === true || read.has(id);
  const named = (id: Id): boolean => name(id) === view.personById.get(id)?.surname && readerKnows(id);
  // Shown in person on a page so far: in a room with him, spoken to, put to.
  // Who a page has put in front of the reader, and where: everybody in a
  // room's roll or the client's rundown, and the one spoken to or confronted
  // (docs/38: not the one a question was about, who may be across town).
  const shownAt = shownPlaces(st.log);
  const shownIds = new Set<Id>(shownAt.keys());
  const place = (id: Id): string => view.placeById.get(id)?.shortName ?? id;
  const window = grid.window?.ticks ?? [];
  const matter: Tick[] = grid.crimeTick !== null ? [grid.crimeTick] : [...window];
  const when = spanSaid(matter);
  const victim = view.victim;
  const type = kase.act.type;

  /* When, where, and how. */
  const scene = grid.places.find((p) => p.scene !== null);
  if (scene) {
    const base =
      type === 'murder'
        ? scene.scene === 'found'
          ? 'found'
          : 'murder'
        : type === 'affair' && scene.scene === 'found'
          ? 'claimed'
          : type;
    const object = kase.act.taken?.name;
    if (type !== 'robbery' || object !== undefined) {
      const variant = `${base}-${matter.length > 0 ? 'span' : 'none'}`;
      out.push({
        key: `when|${base}|${scene.id}|${matter.join(',')}`,
        part: 'when',
        kind: 'when',
        personIds: [],
        placeIds: [scene.id],
        ticks: matter,
        anchorIds: [],
        keep: 0,
        say: (pick) =>
          fillLine(pick(RECAP_WHEN[variant] ?? []), {
            Victim: victim.surname,
            Object: object ? cap(object) : undefined,
            // "Tramonti died at his place", not at Tramonti's.
            place: base === 'murder' && (scene.shortName.startsWith(`${victim.surname}’s `) || scene.shortName.startsWith(`${victim.surname}'s `))
              ? `${pronounOf(victim) === 'she' ? 'her' : 'his'} ${scene.shortName.slice(victim.surname.length + 3)}`
              : scene.shortName,
            span: when,
          }),
      });
    }
  }
  const anchor = grid.anchors.find((a) => matter.includes(a.tick));
  if (anchor) {
    out.push({
      key: `anchor|${anchor.anchorId}|${anchor.tick}`,
      part: 'when',
      kind: 'anchor',
      personIds: [],
      placeIds: [],
      ticks: [anchor.tick],
      anchorIds: [anchor.anchorId],
      keep: 1,
      say: (pick) =>
        fillLine(pick((view.anchorById.get(anchor.anchorId)?.ticks.length ?? 1) > 1 ? RECAP_ANCHOR_AGAIN : RECAP_ANCHOR), {
          Anchor: cap(anchor.name),
          was: /^the bells\b/.test(anchor.name) ? 'were' : 'was',
          time: spokenClock(anchor.tick),
        }),
    });
  }
  if (type === 'murder' && book.established.method !== null) {
    out.push({
      key: `method|${kase.method.id}`,
      part: 'when',
      kind: 'method',
      personIds: [],
      placeIds: [],
      ticks: [],
      anchorIds: [],
      keep: 2,
      say: (pick) => fillLine(pick(RECAP_METHOD), { method: kase.method.name }),
    });
  }

  /* The people. */
  const suspects = grid.rows.filter((r) => r.kind === 'suspect' || r.kind === 'client');
  const unplaced: Id[] = [];
  const records = st.confronts ?? [];
  const confrontations = kase.logic?.confrontations ?? [];
  for (const row of suspects) {
    const P = row.personId;
    const person = view.personById.get(P) as Person;
    const pro = pronounOf(person) === 'she' ? { he: 'she', him: 'her', his: 'her' } : { he: 'he', him: 'him', his: 'his' };
    const ink = (t: number): GridEntry[] => (row.cells[t]?.entries ?? []).filter((e) => e.source !== 'linked');
    const claimAt = (t: number): GridEntry | undefined =>
      ink(t).find(
        (e) => e.source === 'claimed' && e.by === P && e.present && !e.clueId.startsWith('said:') && !e.clueId.startsWith('brief:'),
      );
    // Somebody else's word, or a thing found — never the briefing's line about
    // who found the body, which is not anybody's account of an evening.
    const othersAt = (t: number): GridEntry[] =>
      ink(t).filter(
        (e) => !e.clueId.startsWith('brief:') && ((e.source === 'witness' && e.by !== undefined && e.by !== P) || e.source === 'evidence'),
      );
    const covered = new Set<number>();
    let told = false;

    // Their story come apart, and what it covered: each lie a fact was put about.
    const byLie = new Map<string, typeof records>();
    for (const r of records) {
      if (r.personId !== P || r.lieKey === null || r.outcome === 'wrong') continue;
      byLie.set(r.lieKey, [...(byLie.get(r.lieKey) ?? []), r]);
    }
    for (const [lieKey, rs] of byLie) {
      const c = confrontations.find((x) => x.personId === P && lieKeyOf(x) === lieKey);
      if (!c || !named(P)) continue;
      for (const t of c.lie.ticks) covered.add(t);
      const places: Id[] = [c.lie.claimed];
      const bits: string[] = [];
      const outcomes: string[] = [];
      for (const r of rs) {
        const resp = c.responses[r.n ?? 0];
        outcomes.push(resp.kind);
        switch (resp.kind) {
          case 'second-lie':
            if (resp.claims) {
              places.push(resp.claims.place);
              bits.push(`then ${place(resp.claims.place)}`);
            }
            break;
          case 'hold':
            bits.push(`and stuck to it when I put it to ${pro.him}`);
            break;
          case 'quiet':
            bits.push(bits.length === 0 ? `and then wouldn’t say anything at all when I put it to ${pro.him}` : `and after that ${pro.he} wouldn’t say anything at all`);
            break;
          case 'admit':
          case 'withdraw': {
            const at = (resp.facts ?? []).find((f) => f.kind === 'personAt');
            const truth = at && at.kind === 'personAt' ? at.place : undefined;
            if (truth) places.push(truth);
            const doing = resp.kind === 'admit' ? secretSaid(person) : null;
            bits.push(
              resp.kind === 'admit'
                ? `and then the truth: ${pro.he}’d been at ${truth ? place(truth) : 'somewhere else'}${doing ? `, ${doing}` : ''}`
                : `then took it back: ${pro.he}’d been at ${truth ? place(truth) : 'somewhere else'}`,
            );
            break;
          }
        }
      }
      const ticks = [...c.lie.ticks];
      out.push({
        key: `confronted|${P}|${lieKey}|${outcomes.join('>')}`,
        part: 'people',
        kind: 'confronted',
        personIds: [P],
        placeIds: [...new Set(places)],
        ticks,
        anchorIds: [],
        subjectId: P,
        keep: 0,
        say: () => {
          const span = ticks.length === 1 ? `for ${spokenClock(ticks[0] as Tick)}` : spanSaid(ticks);
          return cap(tidyPunctuation(`${name(P)} had told me ${place(c.lie.claimed)} ${span}, ${bits.join(', ')}.`));
        },
      });
      told = true;
    }

    // Two words about one half hour that do not agree, where no fact has been put about it.
    const order = [...matter, ...Array.from({ length: 12 }, (_, t) => t as Tick).filter((t) => !matter.includes(t))];
    let conflict: RecapFact | null = null;
    for (const t of order) {
      if (conflict || covered.has(t)) continue;
      const claim = claimAt(t);
      if (!claim || !named(P)) continue;
      for (const e of othersAt(t)) {
        const disagrees = e.present ? e.placeId !== claim.placeId : e.placeId === claim.placeId;
        if (!disagrees) continue;
        const witness = e.source === 'witness' ? e.by : undefined;
        // A witness the reader has not met is "somebody else".
        const S = witness !== undefined && named(witness) ? witness : undefined;
        const at = spanSaid([t as Tick]);
        const slots = { P: name(P), A: place(claim.placeId), when: at, S: S ? name(S) : undefined, him: pro.him, he: pro.he, B: place(e.placeId), room: e.from ? place(e.from) : undefined };
        if (!e.present && !S) continue;
        const lines = !e.present ? RECAP_CONFLICT_NOT : S ? RECAP_CONFLICT : witness !== undefined ? RECAP_CONFLICT_ANON : RECAP_CONFLICT_FOUND;
        conflict = {
          key: `conflict|${P}|${t}|${claim.placeId}|${S ?? (witness !== undefined ? 'somebody' : `room:${e.from ?? ''}`)}|${e.placeId}|${e.present ? 'at' : 'not'}`,
          part: 'people',
          kind: 'conflict',
          personIds: [P, ...(S ? [S] : [])],
          placeIds: [...new Set([claim.placeId, e.placeId, ...(e.from && !witness ? [e.from] : [])])],
          ticks: [t as Tick],
          anchorIds: [],
          subjectId: P,
          keep: 0,
          say: (pick) => fillLine(pick(lines), slots),
        };
        break;
      }
    }
    if (conflict) {
      out.push(conflict);
      told = true;
    }

    // Their evening, and whose word is under it.
    const hasAccount = st.accounts.includes(P);
    if (!told && hasAccount && named(P)) {
      let under: Id | undefined;
      for (let t = 0; t < 12 && under === undefined; t++) {
        const claim = claimAt(t);
        if (!claim) continue;
        const agree = othersAt(t).find((e) => e.present && e.placeId === claim.placeId && e.source === 'witness' && e.by !== undefined);
        if (agree) under = agree.by;
      }
      const anon = under !== undefined && !named(under);
      out.push({
        key: under ? (anon ? `claimed|${P}|with|somebody` : `claimed|${P}|with|${under}`) : `claimed|${P}|alone`,
        part: 'people',
        kind: 'claimed',
        personIds: [P, ...(under && !anon ? [under] : [])],
        placeIds: [],
        ticks: [],
        anchorIds: [],
        subjectId: P,
        keep: 3,
        say: (pick) =>
          under && anon
            ? fillLine(pick(RECAP_CLAIMED_ANON), { P: name(P), his: pro.his })
            : under
              ? fillLine(pick(RECAP_CLAIMED_WITH), { P: name(P), S: name(under as Id), his: pro.his })
              : fillLine(pick(RECAP_CLAIMED_ALONE), { P: name(P), his: pro.his }),
      });
      told = true;
    }
    const anyClaim = Array.from({ length: 12 }, (_, t) => t).some((t) => claimAt(t) !== undefined);
    const inkAt = (t: number): boolean => ink(t).some((e) => e.present);
    const hole = matter.length > 0 && matter.every((t) => !inkAt(t));
    if (!told && !hasAccount && !anyClaim) {
      const sources: Id[] = [];
      for (let t = 0; t < 12; t++) {
        for (const e of othersAt(t)) {
          if (e.present && e.source === 'witness' && e.by && !sources.includes(e.by)) sources.push(e.by);
        }
      }
      if (sources.length > 0 && named(P)) {
        const known = sources.filter((x) => named(x));
        const shown = known.slice(0, 2);
        const list = shown.length > 0 ? shown.map((x) => name(x)).join(' and ') : undefined;
        out.push({
          key: `others|${P}|${shown.length > 0 ? shown.join(',') : 'somebody'}`,
          part: 'people',
          kind: 'others',
          personIds: [P, ...shown],
          placeIds: [],
          ticks: hole ? matter : [],
          anchorIds: [],
          subjectId: P,
          keep: 2,
          say: (pick) =>
            fillLine(pick(list === undefined ? RECAP_OTHERS_ANON : hole ? RECAP_OTHERS_HOLE : RECAP_OTHERS), {
              P: name(P),
              S: list,
              when,
              his: pro.his,
              hole: hole ? `, and it had a hole in it ${when}` : '',
            }),
        });
        told = true;
      } else if (
        sources.length === 0 &&
        !Array.from({ length: 12 }, (_, t) => t).some((t) => inkAt(t)) &&
        person.foundAt &&
        // The one paying him is not somebody he has "only seen".
        P !== view.client.id &&
        // Seen in person on a page, not only named in somebody's mouth.
        (opts.everyone === true || (shownIds.has(P) && readerKnows(P)))
      ) {
        // Where the reader saw them: their own room if a page showed them
        // there, else the room a page did show them in.
        const rooms = shownAt.get(P) ?? new Set<Id>();
        const at = rooms.has(person.foundAt) || rooms.size === 0 ? person.foundAt : ([...rooms][0] as Id);
        out.push({
          key: `seen|${P}|${at}`,
          part: 'people',
          kind: 'seen',
          personIds: [P],
          placeIds: [at],
          ticks: [],
          anchorIds: [],
          subjectId: P,
          keep: 2,
          say: (pick) => fillLine(pick(RECAP_SEEN), { P: name(P), place: place(at) }),
        });
      }
    }
    // Nobody has placed them at the half hour that matters. (When the clause
    // about whose word their evening is on says so too, the recap says it once.)
    // Somebody the reader knows by name, or has at least seen and can be told by sight.
    const sayable = named(P) || opts.everyone === true || (shownIds.has(P) && name(P) !== person.surname);
    if (hole && sayable) unplaced.push(P);
  }
  for (const P of unplaced) {
    const person = view.personById.get(P) as Person;
    out.push({
      key: `unplaced|${matter.join(',')}|${P}`,
      part: 'people',
      kind: 'unplaced',
      personIds: [P],
      placeIds: [],
      ticks: matter,
      anchorIds: [],
      subjectId: P,
      keep: 1,
      say: (pick, prev) =>
        prev === P
          ? fillLine(pick(RECAP_UNPLACED_AGAIN), { he: pronounOf(person), P: name(P), when })
          : fillLine(pick(RECAP_UNPLACED_ONE), { P: name(P), when }),
    });
  }

  /* What he means to do next: the first lead open, and an evening nobody has told. */
  const next: { key: string; ids: Id[]; places: Id[]; lines: readonly string[]; slots: Record<string, string | undefined> }[] = [];
  // The lead the page just named first, so the recap and the page agree on what comes next.
  const threads = threadsFor(view, st.found).sort((a, b) => Number(b.clueId === opts.prefer) - Number(a.clueId === opts.prefer));
  for (const t of threads) {
    if (next.length > 0) break;
    const ask = /^ask (\S+) about (.+)$/.exec(t.command);
    if (ask) {
      const who = kase.people.find((p) => p.surname === ask[1]);
      if (!who) continue;
      const topic = ask[2] as string;
      if (topic === 'that evening') {
        if (!readerKnows(who.id)) continue;
        next.push({ key: `next|evening|${who.id}`, ids: [who.id], places: [], lines: RECAP_NEXT_EVENING, slots: { P: name(who.id), his: pronounOf(who) === 'she' ? 'her' : 'his' } });
        continue;
      }
      const about = kase.people.filter((p) => new RegExp(`\\b${p.surname}\\b`).test(topic)).map((p) => p.id);
      if (!readerKnows(who.id) || !about.every((id) => readerKnows(id))) continue;
      next.push({ key: `next|${t.command}`, ids: [who.id, ...about], places: view.places.filter((pl) => topic.includes(pl.shortName)).map((pl) => pl.id), lines: RECAP_NEXT_ASK, slots: { who: name(who.id), topic } });
      continue;
    }
    const search = /^examine (.+)$/.exec(t.command);
    if (search) {
      const at = view.places.find((pl) => pl.shortName === search[1]);
      // A room named for somebody the reader has not met names them.
      const namesSomebody = at !== undefined && kase.people.some((q) => at.shortName.includes(q.surname) && !readerKnows(q.id));
      if (at && !namesSomebody) next.push({ key: `next|${t.command}`, ids: [], places: [at.id], lines: RECAP_NEXT_SEARCH, slots: { place: at.shortName } });
    }
  }
  const untold = unplaced.find((P) => !st.accounts.includes(P) && named(P));
  if (untold && !next.some((n) => n.ids[0] === untold)) {
    const who = view.personById.get(untold) as Person;
    next.push({ key: `next|evening|${untold}`, ids: [untold], places: [], lines: RECAP_NEXT_EVENING, slots: { P: name(untold), his: pronounOf(who) === 'she' ? 'her' : 'his' } });
  }
  if (next.length === 0) next.push({ key: 'next|put', ids: [], places: [], lines: RECAP_NEXT_PUT, slots: {} });
  if (opts.everyone === true) {
    // The checker's superset: every lead open, every evening untold, and the
    // plain fallback — each a key a `next` clause may carry.
    const alts = [
      ...threadsFor(view, st.found).map((t) => (/ about that evening$/.test(t.command) ? `next|evening|${kase.people.find((q) => t.command === `ask ${q.surname} about that evening`)?.id ?? ''}` : `next|${t.command}`)),
      ...unplaced.filter((P) => !st.accounts.includes(P)).map((P) => `next|evening|${P}`),
      'next|put',
      // docs/40 §2: the stars, which the page computes and the recap says.
      'next|stars',
    ];
    for (const key of alts) {
      out.push({ key, part: 'next', kind: 'next', personIds: [], placeIds: [], ticks: [], anchorIds: [], keep: 0, say: () => '' });
    }
  }
  const chosen = next.slice(0, 2);
  out.push({
    key: chosen.map((n) => n.key).join('+'),
    part: 'next',
    kind: 'next',
    personIds: [...new Set(chosen.flatMap((n) => n.ids))],
    placeIds: [...new Set(chosen.flatMap((n) => n.places))],
    ticks: [],
    anchorIds: [],
    keep: 0,
    say: (pick) => {
      const lines = chosen.map((n) => fillLine(pick(n.lines), n.slots)).filter((l) => l.length > 0);
      if (lines.length < 2) return lines[0] ?? '';
      // "I'd ask Rafferty about the key next, and then Marchetti's own account of her evening."
      const second = (lines[1] as string).replace(/^I(?:’d| wanted)\s+/, '').replace(/\.$/, '');
      const lower = /^(?:go|ask|a look)\b/.test(second.toLowerCase()) ? `${second.charAt(0).toLowerCase()}${second.slice(1)}` : second;
      return `${(lines[0] as string).replace(/\.$/, '')}, and then ${lower}.`;
    },
  });
  return out;
}

/** The keys a clause may carry, whole. A `next` clause's key is its parts joined with `+`. */
export function recapKeys(view: CaseView, state: RunState, everyone = false): Set<string> {
  const keys = new Set<string>();
  for (const f of recapFacts(view, state, { everyone })) {
    keys.add(f.key);
    for (const k of f.key.split('+')) keys.add(k);
  }
  return keys;
}

function words(text: string): number {
  return text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
}

export interface RecapWritten {
  /** The paragraphs, in order. */
  paras: string[];
  /** Every clause, with what it rests on. The frame's lines carry `frame|…` keys and rest on nothing. */
  clauses: RecapClauseTrace[];
  /** The memory after it. */
  memory: RecapMemory;
  /** M13: the recap's sheet. */
  sheet?: SheetUse;
}

/** Why a recap was not written: nothing new, or not enough yet. */
export type RecapRefusal = 'nothing-new' | 'too-soon';

/**
 * Write the recap the notebook in `state` calls for: the facts no earlier
 * recap tonight has said, 80 to 180 words, between an opening line and a
 * closing one. The `when` facts are the frame of taking stock and may be said
 * again to make the length; nothing else is. Null (with why) when there is
 * nothing new or too little to be worth a paragraph.
 */
export function renderRecap(
  view: CaseView,
  state: RunState,
  dealer: Dealer,
  trigger: RecapTrigger,
  /** The lead this page named, so the recap's "next" agrees with the page. */
  prefer?: Id,
  /** docs/40 §2: asked for, in v2, it ends on the page's stars and their reasons. */
  stars?: { text: string; personIds: Id[]; placeIds: Id[]; ticks: number[] } | null,
): RecapWritten | RecapRefusal {
  const memory = state.scene?.recap;
  const said = new Set(memory?.said ?? []);
  const facts = recapFacts(view, state, prefer === undefined ? {} : { prefer });
  // Playtest round 2: asked for, "Go over what I have" goes over all of it —
  // what is settled and what is still open — however much was said before,
  // and never answers with a joke.
  const demand = trigger === 'demand';
  const fresh = demand ? facts : facts.filter((f) => f.part === 'next' || !said.has(f.key));
  const substance = fresh.filter((f) => f.part !== 'next');
  if (substance.length === 0 && !demand) return 'nothing-new';
  // After something happens, the thing that happened is enough to go over;
  // at the turn of the hour, or for a name pencilled in, two new things.
  if ((trigger === 'hour' || trigger === 'link') && substance.length < 2) return 'too-soon';
  const openLine = demand ? stillOpen(view, state) : '';

  // One joke a page, at most (guidance §4): the page's count is the dealer's,
  // and a recap after a page that has told one tells none.
  const jokesAtStart = dealer.jokes;
  let joked = !dealer.mayJoke;
  // No line said twice in one recap, where the pool has another.
  const usedLines = new Set<string>();
  const pick: Picker = (lines) => {
    const fresh = lines.filter((l) => !usedLines.has(l));
    const from = fresh.length > 0 ? fresh : lines;
    const plain = from.filter((l) => !l.startsWith('*'));
    // Once the page has had its joke, a plain line said again beats a new joke.
    const plainAny = lines.filter((l) => !l.startsWith('*'));
    const pool = joked ? (plain.length > 0 ? plain : plainAny.length > 0 ? plainAny : from) : from;
    const line = dealer.random.pick([...pool]);
    usedLines.add(line);
    if (line.startsWith('*')) {
      if (joked) dealer.forcedJokes++;
      else dealer.joke();
      joked = true;
    }
    return line;
  };
  const card = (kind: 'open' | 'close'): string | null => {
    const fits = (c: Card): boolean => tagOf('recap', c, 'kind') === kind;
    const drawn = dealer.draw(
      'recap',
      [(c) => fits(c) && tagOf('recap', c, 'trigger') === trigger, (c) => fits(c) && tagOf('recap', c, 'trigger') === 'any'],
      {},
      true,
    );
    return drawn?.text ?? null;
  };

  // Two or more nobody has placed are one sentence.
  const merged = (fs: RecapFact[]): RecapFact[] => {
    const holed = new Set(fs.filter((f) => f.kind === 'others' && f.ticks.length > 0).map((f) => f.subjectId));
  fs = fs.filter((f) => !(f.kind === 'unplaced' && holed.has(f.subjectId)));
  const loose = fs.filter((f) => f.kind === 'unplaced');
    if (loose.length < 2) return fs;
    const names = loose.map((f) => displayName(view, state, f.subjectId as Id));
    const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] as string}`;
    const when = spanSaid((loose[0] as RecapFact).ticks);
    const one: RecapFact = {
      key: loose.map((f) => f.key).join('+'),
      part: 'people',
      kind: 'unplaced',
      personIds: loose.flatMap((f) => f.personIds),
      placeIds: [],
      ticks: (loose[0] as RecapFact).ticks,
      anchorIds: [],
      keep: 1,
      say: (p) => fillLine(p(RECAP_UNPLACED_MANY), { list, when }),
    };
    return [...fs.filter((f) => f.kind !== 'unplaced'), one];
  };
  let include = new Set(fresh.map((f) => f.key));
  const body = (): RecapFact[] => facts.filter((f) => include.has(f.key));
  const count = (texts: string[]): number => texts.reduce((n, t) => n + words(t), 0);
  // M13: the recap's sheet lays out its frame: the opening line (which may
  // offer something to bring back) and the closing one.
  const withExports = (kind: 'open', want: string | null): { text: string; exports?: Card['exports'] } | null => {
    const fits = (c: Card): boolean => tagOf('recap', c, 'kind') === kind;
    const trig = (c: Card): boolean => tagOf('recap', c, 'trigger') === trigger;
    const anyT = (c: Card): boolean => tagOf('recap', c, 'trigger') === 'any';
    const ex = (c: Card): boolean => want === null || c.exports?.[want] !== undefined;
    const drawn = dealer.draw(
      'recap',
      [(c) => fits(c) && trig(c) && ex(c), (c) => fits(c) && anyT(c) && ex(c), (c) => fits(c) && trig(c), (c) => fits(c) && anyT(c)],
      {},
      true,
    );
    if (!drawn) return null;
    const c = (DECKS.recap ?? []).find((x) => x.id === drawn.cardId);
    return { text: drawn.text, ...(c?.exports ? { exports: c.exports } : {}) };
  };
  const tier = view.kase.shape?.tier;
  const framed = sheetsOn(null)
    ? recapFrame({
        seed: view.kase.seed,
        page: state.log.length - 1,
        trigger,
        flags: { caseType: view.kase.act.type, tier: tier === undefined ? 'none' : String(tier), n: memory?.n ?? 0 },
        random: dealer.random,
        history: dealer.notedLike('sheet:').map((id) => id.slice('sheet:'.length).split('#')[0] as string),
        memory: lineMemory(dealer),
        open: (want) => withExports('open', want),
        closeCard: () => card('close'),
        closeDeck: (role, exp) => {
          const c = (x: Card, tag: string, want: string): boolean => tagOf('close', x, tag) === want;
          const drawn = dealer.draw(
            'close',
            role === null || exp === null
              ? [(x) => c(x, 'outcome', 'sheet') && (c(x, 'moment', 'recap') || c(x, 'moment', 'any')) && c(x, 'callback', 'none')]
              : [
                  (x) => c(x, 'outcome', 'sheet') && (c(x, 'moment', 'recap') || c(x, 'moment', 'any')) && c(x, 'callback', role) && c(x, 'kind', exp.kind ?? 'thing'),
                  (x) => c(x, 'outcome', 'sheet') && (c(x, 'moment', 'recap') || c(x, 'moment', 'any')) && c(x, 'callback', role) && c(x, 'kind', 'any'),
                ],
            role === null || exp === null ? {} : { [role]: exp.short, [`${role}Text`]: exp.text },
            true,
          );
          return drawn?.text ?? null;
        },
      })
    : null;
  const opener = framed?.open ?? card('open') ?? 'I went over what I had.';
  const closer = framed?.close ?? card('close') ?? 'That was where things stood.';
  const frameWords = words(opener) + words(closer);
  // Measured without spending the dealer: the shortest way of saying each
  // clause for the floor, the longest for the ceiling, so the page is inside
  // both whichever lines are picked.
  const byLength = (longest: boolean): Picker => (l) =>
    [...l].sort((a, b) => (longest ? b.length - a.length : a.length - b.length))[0] as string;
  const measure = (fs: RecapFact[], longest: boolean): number =>
    frameWords + count(merged(fs).map((f) => f.say(byLength(longest), undefined)));
  // The frame of taking stock — when, where and how — may be said again, when
  // it was not said a page or three ago, when he asked for it, or when a
  // story has just been given up (golden §4).
  const pageNow = state.log.length - 1;
  const stale = (f: RecapFact): boolean =>
    trigger === 'demand' || trigger === 'confront' || pageNow - (memory?.saidAt?.[f.key] ?? -99) >= RECAP_FRAME_GAP;
  if (measure(body(), false) < RECAP_WORDS[0]) {
    for (const f of facts) if (f.part === 'when' && stale(f)) include.add(f.key);
  }
  if (measure(body(), false) < RECAP_WORDS[0] && !demand) {
    // Not written: its frame told no joke.
    dealer.resetJokes(jokesAtStart);
    return 'too-soon';
  }
  // Too long: leave the least of it for the next recap.
  const ceiling = RECAP_WORDS[1];
  const droppable = body()
    .filter((f) => f.part === 'people')
    .sort((a, b) => b.keep - a.keep);
  while (measure(body(), true) + words(openLine) > ceiling && droppable.length > 0) {
    const f = droppable.shift() as RecapFact;
    include = new Set([...include].filter((k) => k !== f.key));
  }

  const clauses: RecapClauseTrace[] = [];
  const trace = (f: RecapFact, text: string): void => {
    clauses.push({ key: f.key, text, personIds: f.personIds, placeIds: f.placeIds, ticks: f.ticks, anchorIds: f.anchorIds });
  };
  const paras: string[] = [opener];
  clauses.push({ key: 'frame|open', text: opener, personIds: [], placeIds: [], ticks: [] });
  for (const part of ['when', 'people'] as const) {
    joked = !dealer.mayJoke;
    let prev: Id | undefined;
    const lines: string[] = [];
    for (const f of merged(body().filter((x) => x.part === part))) {
      const text = f.say(pick, prev);
      if (text.length === 0) continue;
      lines.push(text);
      trace(f, text);
      prev = f.subjectId;
    }
    // Playtest round 2: asked for, the stock-taking says what is still open.
    if (part === 'when' && openLine.length > 0) {
      lines.push(openLine);
      clauses.push({ key: 'frame|open-questions', text: openLine, personIds: [], placeIds: [], ticks: [] });
    }
    if (lines.length > 0) paras.push(lines.join(' '));
  }
  joked = !dealer.mayJoke;
  const nextFact = body().find((f) => f.part === 'next');
  if (demand && stars) {
    // docs/40 §2: the starred questions that would move it, and why.
    paras.push(closer, stars.text);
    clauses.push({ key: 'frame|close', text: closer, personIds: [], placeIds: [], ticks: [] });
    clauses.push({ key: 'next|stars', text: stars.text, personIds: stars.personIds, placeIds: stars.placeIds, ticks: stars.ticks as Tick[] });
  } else {
    const nextText = nextFact ? nextFact.say(pick, undefined) : '';
    paras.push([closer, nextText].filter((t) => t.length > 0).join(' '));
    clauses.push({ key: 'frame|close', text: closer, personIds: [], placeIds: [], ticks: [] });
    if (nextFact && nextText.length > 0) trace(nextFact, nextText);
  }

  if (framed) dealer.note(framed.note);
  const kept = body()
    .filter((f) => f.part !== 'next')
    .map((f) => f.key);
  const saidAt = { ...(memory?.saidAt ?? {}) };
  for (const key of kept) saidAt[key] = pageNow;
  return {
    paras,
    clauses,
    ...(framed ? { sheet: framed.use } : {}),
    memory: {
      n: (memory?.n ?? 0) + 1,
      said: [...new Set([...(memory?.said ?? []), ...kept])],
      found: state.found.length,
      links: linksKey(state),
      saidAt,
    },
  };
}

/**
 * Playtest round 2: what the report asks that the notebook does not settle
 * yet, in one plain sentence: the half hour (where the report asks it and
 * the window is still more than one), how, why, and who.
 */
export function stillOpen(view: CaseView, state: RunState): string {
  const kase = view.kase;
  const asks = new Set<string>(kase.act.unknowns);
  const est = establishedFrom(view, state.found, state.accounts);
  const open: string[] = [];
  if (asks.has('when') && est.deathTicks.length !== 1) {
    open.push(est.deathTicks.length > 1 ? 'which of those half hours it was' : 'when');
  }
  if (asks.has('how') && !est.methodEvidence) open.push('how it was done');
  if (asks.has('why') && est.motives.length === 0) open.push('why');
  if (asks.has('who')) open.push('who');
  if (open.length === 0) return '';
  const said = open.length === 1 ? open[0] : `${open.slice(0, -1).join(', ')}, or ${open[open.length - 1]}`;
  return `I still didn’t know ${said}.`;
}

/** The player's links, as the recap remembers them. */
export function linksKey(state: Pick<RunState, 'links'>): string[] {
  return Object.entries(state.links ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .sort();
}

/** Half hours of somebody's own account that a placement in hand disagrees with. */
function contradictions(view: CaseView, state: Pick<RunState, 'found' | 'accounts'>): number {
  let n = 0;
  for (const list of establishedFrom(view, [...state.found], [...state.accounts]).placements.values()) {
    n += list.filter((p) => p.contradicts).length;
  }
  return n;
}

/**
 * Whether a recap follows this page, and why: a confrontation that changed a
 * story, a placement that disagrees with somebody's own account, the hour
 * narrowed, a name pencilled to a face, or — at the turn of every second hour
 * — two or more new things in the notebook since the last one. Never in the
 * office, and never after a page that changed nothing (a look round, a
 * question read back).
 */
export function recapTrigger(
  view: CaseView,
  before: RunState,
  after: RunState,
  page: { shape?: PageShape; cost: number },
  minutes: { before: number; after: number },
): RecapTrigger | null {
  if (after.at === view.office.id || after.reportOpen) return null;
  const shape = page.shape;
  if (shape === undefined || !['arrive', 'return', 'search', 'ask', 'confront'].includes(shape)) return null;
  const memory = after.scene?.recap;
  if (shape === 'confront') {
    const last = (after.confronts ?? [])[after.confronts?.length ? after.confronts.length - 1 : 0];
    // Golden §4: after the second fact is put and the story is given up — a
    // confession, or a story taken back. A second story is not the end of it.
    if (last && (last.outcome === 'admit' || last.outcome === 'withdraw') && (after.confronts?.length ?? 0) > (before.confronts?.length ?? 0)) {
      return 'confront';
    }
  }
  if (after.found.length > before.found.length || after.accounts.length > before.accounts.length) {
    if (contradictions(view, after) > contradictions(view, before)) return 'lie';
    const was = establishedFrom(view, [...before.found], [...before.accounts]).deathTicks.length;
    const now = establishedFrom(view, [...after.found], [...after.accounts]).deathTicks.length;
    if (was > 0 && now > 0 && now < was) return 'window';
  }
  const links = linksKey(after);
  if (links.length > 0 && links.join('|') !== (memory?.links ?? []).join('|')) return 'link';
  const turned = Math.floor(minutes.after / 120) > Math.floor(minutes.before / 120) && minutes.after >= 120;
  if (turned && after.found.length - (memory?.found ?? 0) >= 2) return 'hour';
  return null;
}

/**
 * Who the pages have put in front of the reader, and in which rooms: the
 * people in a room's roll or the client's rundown, and the one spoken to or
 * confronted — never the one a question was only about.
 */
export function shownPlaces(log: readonly Page[]): Map<Id, Set<Id>> {
  const out = new Map<Id, Set<Id>>();
  const add = (id: Id, at: Id): void => {
    const rooms = out.get(id) ?? new Set<Id>();
    rooms.add(at);
    out.set(id, rooms);
  };
  for (const pg of log) {
    for (const b of pg.beats ?? []) {
      if (b.kind === 'presence' || b.kind === 'rundown') for (const id of b.personIds ?? []) add(id, pg.at);
      if (b.kind === 'exchange' || b.kind === 'confront') {
        const first = (b.personIds ?? [])[0];
        if (first !== undefined) add(first, pg.at);
      }
    }
  }
  return out;
}
