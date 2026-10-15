/**
 * docs/52 §2: joining the bones. The planner's aggregation, connectives and
 * ordering (docs/49), run on propositions: the writers hand over facts as
 * propositions (`Item.props`) with what they drew for the voice (`Item.flesh`),
 * and composition makes **composites**, a closed set of shapes
 * (`types.ts` `SHAPES`), before a word is chosen. Each composite is then said
 * in its voicing (`voice.ts`, `content/board/voicings.json`), or, where the
 * writer's own card or speech is the flesh, in those words.
 *
 * Three passes, where `plan/aggregate.ts`, `connect.ts` and `compose.ts` were:
 *
 * - **aggregate** (per beat): a watcher's hour and its "nobody else"
 *   (LIST-HOUR); the notebook's placements on one person's word (PLACED-SET)
 *   and the evenings nobody else has spoken for (OWN-WORD); who could get at
 *   the means with the exception last (ACCESS-SET); one place at two hours.
 * - **connect** (the section, in order): the connective the logic allows, from
 *   the relation: a collision's "but" or its two lines (COLLISION-PAIR); an
 *   agreement's "So … which was what" or "same as she said" (CONFIRMED); the
 *   hours that mattered (OWN-WORD); whose word a placement is (PLACED-SET); one
 *   "so" and one "but" a page.
 * - **compose** (the thought): the window and its sighting as one
 *   (WINDOW-ALIVE), the street's lead and link (STREET), two people one list
 *   confirms (CONFIRMED-WITH), who could get at the means said of the person
 *   (ATTACH), an evening that held and the hour on their word alone (PAIR,
 *   "but"), the admission and what it hangs on (ADMIT-CHECK), the rest side by
 *   side (PAIR, ", and" or "; ").
 *
 * docs/49's rules carry over: never across the crime hour; a collision keeps
 * its own composite; one "so" chain and one "but" a page; docs/46's levels
 * (the writers say only what the level allows; NARROWS only at a walk).
 *
 * The decisions read what a composite would say (its length, whether it opens
 * on a clause of its own): the rhythm is one of composition's inputs. They
 * never cut words out of a sentence to make another: every sentence is a
 * composite said whole.
 */

import { andList, hourWord, isMurder, nameOf, oclock, personOf, placeName, pronOf, victimOf, clientOf, type BoardCase, type Hour, type PersonId, type PlaceId } from '../model.js';
import { solveRun } from '../knowledge.js';
import type { Item, PageBudget } from '../plan/types.js';
import type { PlanCtx } from '../plan/index.js';
import { speakerOf } from '../plan/speaker.js';
import { markPronoun } from '../plan/refer.js';
import { herIsObject } from '../plan/measure.js';
import { sentencesOf, wordsIn } from '../plan/sentences.js';
import { accessPhrase, atWhere, claimSaid, listSaid, shortOther, whyHours, where } from './phrase.js';
import type { Composite, Prop, Shape, Src } from './types.js';
import { fitting, type Args, type Voicing } from './voice.js';
import { preview, SAMPLES, VARIETY, unpick, type Picked } from './say.js';
import { plainComposite } from './plain.js';
import { homeNamed } from '../home.js';

/** The longest sentence composition makes. */
const LONGEST = 40;
/** The most facts one sentence carries (aggregation). */
const MOST = 4;

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** The words a sentence opens on that go lower case after a comma or a semicolon: never a name. */
export const LOWER = /^(?:He|She|It|They|We|You|There|Nobody|Somebody|Everybody|Anybody|Nothing|Everything|That|This|The|A|An|His|Her|My|Their|Its|Every|Each|No|Some|All|Both|Most|One|By|For|At|In|On|Under|Over|Behind|Above|Below|Through|Outside|Inside|Across|Along|Beside|Near|Upstairs|Downstairs|Somewhere|Overhead|Down|Up|Whatever|Whoever|Whether|If|When|Fewer|Plenty|Two|Three|Like|As|Just|With|Past|Which|Then|Once)\b/;

/** "The", "By", "He" go lower case after a comma; "I", a name and "Mrs." keep their capitals. */
export function lowerFirst(s: string): string {
  if (LOWER.test(s)) return (s[0] as string).toLowerCase() + s.slice(1);
  return s;
}

/** The narration of a sentence, the engine's pronoun marks taken out. */
function plain(t: string): string {
  return t.replace(/⁣\d+⁤/g, '');
}

const ruleOf = (x: Item): string => (x.tag?.startsWith('thought:') ? x.tag.slice('thought:'.length) : '');

function isThoughtFact(x: Item): boolean {
  return x.kind === 'fact' && x.voice === 'thought' && x.beat === 'thought';
}

/** A person's pronouns, marked with whom they mean, for the planner's reference. */
function pr(c: BoardCase, p: string): { he: string; him: string; his: string } {
  const x = pronOf(c, p);
  const m = markPronoun(c, p);
  return { he: x.he + m, him: x.him + m, his: x.his + m };
}

/** People of `p`'s sex named in `text`, other than `p`. */
function sameSexIn(c: BoardCase, p: string, text: string): string[] {
  const female = pronOf(c, p).he === 'she';
  return c.people.filter((x) => x.id !== p && !x.object && (pronOf(c, x.id).he === 'she') === female && new RegExp(`\\b${esc(x.short)}\\b`).test(text)).map((x) => x.id);
}

/**
 * Whether the breaker's pronoun for `p` is still theirs with `p` named before it: an object after
 * the breaker's own subject is ("Mrs. Blau passed her"); a subject or a possessive, after somebody
 * of their sex, isn't ("Mrs. Mulcahy says she was…").
 */
export function clearAfter(c: BoardCase, p: string, breaker: string): boolean {
  if (sameSexIn(c, p, breaker).length === 0) return true;
  const t = plain(breaker);
  for (const m of t.matchAll(/\b(he|she|him|her|his)\b/g)) {
    const w = m[1] as string;
    if (w === 'him') continue;
    if (w === 'her' && herIsObject(t.slice((m.index ?? 0) + 3), t.slice(0, m.index ?? 0))) continue;
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Composites, and saying them.
 * ------------------------------------------------------------------ */

/** A composite as the planner holds it while composing: what it said, with which arguments, and the use it spent. */
export interface Held extends Composite {
  said?: string;
  args?: Args;
  /** docs/52 build 2: the hand's record of the voicing's use (`v:<id>#<n>`), given back if it's voiced again. */
  noted?: string;
  /** docs/52 build 2: the flags and the manner it was voiced by (the tools' samples). */
  flags?: string[];
  manner?: string;
}

/** The shape a writer's fact is, by what it says and where (its flesh is the writer's own words). */
export function shapeOf(it: Item): Shape {
  if (it.say) return it.say.shape;
  const rule = ruleOf(it);
  const ks = (it.props ?? []).map((p) => p.k);
  const has = (k: Prop['k']) => ks.includes(k);
  if (rule === 'collision' || has('COLLIDES')) return has('ADMIT') ? 'ADMIT-CHECK' : 'COLLISION-PAIR';
  if (rule === 'street') return 'STREET';
  if (rule === 'hours' && has('CLAIM')) return 'OWN-WORD';
  if ((it.carries ?? []).some((x) => x.startsWith('givens:')) && it.beat === 'job') return 'OFFICE';
  if (has('CONFIRMS')) return 'CONFIRMED';
  if (has('ALIVE') || has('NARROWS')) return 'WINDOW-ALIVE';
  if (has('LEFT')) return 'LEFT';
  if (has('ACCESS')) return 'ACCESS-SET';
  if (has('PLACED')) return 'PLACED-SET';
  if (has('UNSPOKEN')) return 'UNSPOKEN';
  if (has('HOLD') || has('MISSING')) return 'HOLD';
  if (has('ADMIT') || has('REFUSE') || has('SECOND') || has('CRACK') || has('HELD')) return 'REACTION';
  if (has('MOTIVE')) return 'MOTIVE-SET';
  if (has('HANDOVER')) return 'HANDOVER';
  if (has('PRESENT')) return 'PRESENT';
  if (has('FIND')) return 'FIND';
  if (has('WINDOW') || has('MEANS')) return 'WINDOW-MEANS';
  if (has('LIST')) return 'LIST-HOUR';
  if (has('CLAIM')) return 'CLAIM-SPAN';
  if (has('REMARK') || has('SHIFT')) return 'REMARK';
  if (has('POINTER')) return 'OFFICE';
  return 'OFFICE';
}

/** A writer's fact as a leaf composite, said in the writer's own words until the planner voices it. */
export function leafOf(it: Item): Composite {
  return { shape: shapeOf(it), props: [...(it.props ?? [])], voicing: 'flesh' };
}

function held(it: Item): Held {
  if (!it.comp) it.comp = { ...leafOf(it), said: it.text } as Held;
  return it.comp as Held;
}

/** low (Raw, Coddled), mid (Poached, Soft-boiled), high (Medium, Hard-boiled). */
export function tierBand(ctx: PlanCtx): 'low' | 'mid' | 'high' {
  return ctx.c.tier <= 1 ? 'low' : ctx.c.tier <= 3 ? 'mid' : 'high';
}

/** The voicings of a shape that fit the flags, the speaker's manner and the tier band, the most specific of them. */
export function choose(shape: Shape, flags: string[], ctx: PlanCtx, manner?: string): Voicing[] {
  return fitting(shape, new Set(flags), { manner, tierBand: tierBand(ctx) });
}

/** docs/52 build 2: the voicing a composite would take (least recently used tonight), not yet spent. */
export function pickFor(shape: Shape, flags: readonly string[], args: Args, ctx: PlanCtx, manner?: string, prefer?: (text: string) => boolean): Picked | null {
  return preview(shape, flags, { manner, tierBand: tierBand(ctx) }, args, prefer ? { ...ctx, prefer } : ctx);
}

/** Give back the voicing an item spent, when it goes into another composite. */
function unspend(it: Item, ctx: PlanCtx): void {
  const n = (it.comp as Held | undefined)?.noted;
  if (n && ctx.hand) {
    ctx.hand.forget(n);
    unpick(n);
  }
}

/** Spend a voicing on a composite: a composite voiced again gives back the use it had. */
export function spend(comp: Held, p: Picked, ctx: PlanCtx): void {
  const key = p.commit();
  if (comp.noted && comp.noted !== key && ctx.hand) {
    ctx.hand.swap(comp.noted, key);
    unpick(comp.noted);
  }
  if (key) comp.noted = key;
}

/**
 * Say a composite in a voicing: the shape's voicings that fit the flags, least recently used. Nothing
 * fits: the plain rendering (docs/52 §4, "voicing → plain fallback").
 */
function voice(it: Item, comp: Held, flags: string[], args: Args, ctx: PlanCtx, manner?: string): string {
  comp.flags = flags;
  comp.manner = manner;
  const p = pickFor(comp.shape, flags, args, ctx, manner);
  if (!p) return sayPlain(it, comp, ctx);
  return sayWith(it, comp, p, args, ctx);
}

/** The tools' samples: the composite as voiced, with what it was voiced from. */
function sample(comp: Held, it: Item | undefined, ctx: PlanCtx): void {
  if (!SAMPLES.on || !comp.args || !comp.voicing) return;
  const speaker = it ? speakerOf(it, ctx.c) : undefined;
  SAMPLES.list.push({ shape: comp.shape, flags: comp.flags ?? [], args: comp.args, ...(comp.manner ? { manner: comp.manner } : {}), props: comp.props, said: comp.said ?? '', voicing: comp.voicing, c: ctx.c, ...(speaker ? { speaker } : {}), here: ctx.run?.at ?? '' });
}

/** The composite said plainly, where no voicing fits it. */
function sayPlain(it: Item, comp: Held, ctx: PlanCtx): string {
  const text = plainComposite(ctx.c, comp);
  comp.voicing = 'plain';
  comp.args = undefined;
  comp.said = text;
  it.comp = comp;
  it.text = text;
  return text;
}

function sayWith(it: Item, comp: Held, p: Picked, args: Args, ctx: PlanCtx): string {
  spend(comp, p, ctx);
  comp.voicing = p.v.id;
  comp.args = args;
  comp.said = p.text;
  sample(comp, it, ctx);
  it.comp = comp;
  it.text = p.text;
  // docs/52 build 2: the rhythm may trade it for another voicing that fitted as well, of another length.
  it.alts = it.opener || it.speech ? undefined : altsFor(comp, p, ctx);
  return p.text;
}

/**
 * docs/52 build 2: the rhythm's trades for a voiced composite: the others that fitted as well and
 * haven't been said tonight, each spent only when the rhythm takes it.
 */
export function altsFor(comp: Held, p: Picked, ctx: PlanCtx): Item['alts'] {
  const hand = ctx.hand;
  if (!hand || p.others.length === 0) return undefined;
  return () =>
    p.others
      .filter((o) => hand.lastUse(`v:${o.v.id}`) < 0)
      .map((o) => ({
        text: o.text,
        take: () => {
          const key = `v:${o.v.id}#${hand.uses(`v:${o.v.id}`) + 1}`;
          if (comp.noted) {
            hand.swap(comp.noted, key);
            unpick(comp.noted);
          } else hand.note(key);
          // (Only a voicing unsaid tonight is offered: the trade is never one said again.)
          if (VARIETY.on) VARIETY.picks.push({ id: o.v.id, key, shape: comp.shape, pool: p.others.length + 1, again: false, unsaidLeft: false });
          comp.noted = key;
          comp.voicing = o.v.id;
          comp.said = o.text;
        },
      }));
}

/**
 * The trades for a composite said after the page's "So" or "But" (`Item.opener`): the same others,
 * with the opener before them while the page keeps it (`connect` drops a second one).
 */
function openerAlts(it: Item, comp: Held, p: Picked, ctx: PlanCtx): Item['alts'] {
  const alts = altsFor(comp, p, ctx);
  const op = it.opener;
  if (!alts || !op) return alts;
  return () => {
    const kept = it.text.startsWith(`${op} `);
    return alts().map((o) => ({
      text: kept ? `${op} ${lowerFirst(o.text)}` : o.text,
      take: () => {
        o.take();
        it.flesh = { ...(it.flesh ?? {}), bare: o.text };
      },
    }));
  };
}

/** Two composites, one sentence: the parts' bones in order, under a join. */
function pairOf(shape: Shape, a: Composite, b: Composite, join: string): Held {
  return { shape, props: [...a.props, ...b.props], parts: [a, b], join };
}

/** Two facts become one item: the composite given, and what both carried. */
function merge(a: Item, b: Item, comp: Held, text: string, join?: string): void {
  a.text = text;
  a.comp = comp;
  a.carries = [...new Set([...(a.carries ?? []), ...(b.carries ?? [])])];
  a.about = [...new Set([...(a.about ?? []), ...(b.about ?? [])])];
  if ((a.relation ?? 'new') === 'new' && b.relation && b.relation !== 'new') a.relation = b.relation;
  a.n = (a.n ?? 1) + (b.n ?? 1);
  a.joined = join ?? a.joined ?? b.joined;
  a.composed = true;
  a.alts = undefined;
  a.props = [...(a.props ?? []), ...(b.props ?? [])];
}

/** Say two side by side with a join: "{a}, and {b}", "{a}; {b}", "{a}, but {b}" (plainly, where no voicing has the join). */
function sayPair(a: Item, b: Item, join: 'and' | 'semi' | 'but', ctx: PlanCtx, shape: Shape = 'PAIR'): { comp: Held; text: string; commit: () => void } {
  const comp = pairOf(shape, held(a), held(b), join);
  const args = { a: a.text.replace(/\.$/, ''), b: lowerFirst(b.text) };
  const p = pickFor(shape, [join], args, ctx);
  if (!p) {
    const text = plainComposite(ctx.c, comp);
    comp.voicing = 'plain';
    comp.said = text;
    return { comp, text, commit: () => undefined };
  }
  comp.voicing = p.v.id;
  comp.args = args;
  comp.said = p.text;
  comp.flags = [join];
  return { comp, text: p.text, commit: () => (spend(comp, p, ctx), sample(comp, undefined, ctx)) };
}

/* ------------------------------------------------------------------ *
 * The arguments a voicing is filled with, from the propositions.
 * ------------------------------------------------------------------ */

/** "Coffin had", "Prentiss had said": whose word a confirmation is. */
function srcHad(c: BoardCase, by: Src): string {
  if (by.k === 'given') return `${clientOf(c).short} had said`;
  if (by.k === 'list') return `${nameOf(c, by.who as PersonId)} had`;
  return `${nameOf(c, by.who as PersonId)} had said`;
}

/**
 * docs/53, the dial and its addendum: whose word a confirmation is, said as the person who said it:
 * "Coffin", "Mrs. Cheatham", the client by name (never "Coffin’s list", "her account", "the office").
 * The voicing says what they did ("Coffin said", "Coffin backed him up"); a search is "what the room said".
 */
export function srcWhose(c: BoardCase, by: Src): string {
  if (by.k === 'given') return clientOf(c).short;
  if (by.k === 'find') return 'what the room said';
  return nameOf(c, by.who as PersonId);
}

/** The name a source goes by in the notebook: "Coffin", the client by name, "what the room said". */
function srcName(c: BoardCase, by: Src): string {
  return srcWhose(c, by);
}

function props<K extends Prop['k']>(ps: readonly Prop[], k: K): Extract<Prop, { k: K }>[] {
  return ps.filter((p): p is Extract<Prop, { k: K }> => p.k === k);
}

/** A collision's claim and breaker, from the propositions, as the detective says them to himself. */
function collisionArgs(c: BoardCase, col: Extract<Prop, { k: 'COLLIDES' }>, _here: PlaceId): { claim: string; breaker: string; subtle: boolean } {
  const p = col.person;
  const claim = `${nameOf(c, p)} said ${claimSaid(c, p, col.hour)}`;
  const w = col.with as Prop;
  let said0 = '';
  let sp: PersonId | undefined;
  let wPlace: PlaceId | undefined;
  if (w.k === 'LIST') {
    // The list as the proposition has it: who was on it, whether that was everybody, the faces known.
    wPlace = w.place;
    const names = w.people
      .map((e) => (e.startsWith('other:') ? (c.others?.find((o) => o.id === e.slice(6))?.name ?? '') : e.startsWith('look:') ? `somebody ${e.slice(5)}` : nameOf(c, e)))
      .filter(Boolean)
      .map((n) => shortOther(n));
    const faces = w.people.flatMap((e) => (e.startsWith('look:') && w.faces?.[e.slice(5)] ? [`${e.slice(5).replace(/^(in|with) an? /, 'the ')} was ${nameOf(c, w.faces[e.slice(5)] as PersonId)}’s`] : []));
    const faceTail = faces.length ? `; ${faces.join('; ')}` : '';
    const at = placeName(c, w.place);
    const onIt = w.people.includes(p);
    // docs/53, addendum: as a person says it ("Coffin saw him at", "Coffin said only … were at"), never "Coffin had".
    said0 = listSaid(c, w.watcher, onIt ? p : null, names, at, w.hour as Hour, !!w.whole, faceTail);
  } else if (w.k === 'CLAIM') {
    sp = w.person;
    wPlace = w.place;
    const comp = (w.company ?? []).map((x) => nameOf(c, x));
    said0 = `${nameOf(c, sp)} says ${pronOf(c, sp).he} was at ${placeName(c, w.place ?? '')} at ${oclock(w.hour)}, ${comp.length ? `with ${andList(comp)}` : 'alone'}`;
  } else if (w.k === 'REMARK') {
    said0 = w.how === 'passed' ? `${nameOf(c, w.speaker)} passed ${nameOf(c, w.saw)} on ${w.where} at ${hourWord(w.hour)}` : `${nameOf(c, w.speaker)} had ${nameOf(c, w.saw)} at ${pronOf(c, w.speaker).his} place at ${hourWord(w.hour)}`;
  } else if (w.k === 'PLACED') {
    wPlace = w.place;
    said0 = `${nameOf(c, w.person)} was at ${placeName(c, w.place)} at ${oclock(w.hour)}`;
  }
  const P = pr(c, p);
  // (Somebody of their sex: "Mrs. Bledsoe’s own answer was …", so "she" can't be read as the other.)
  const ownAccount = sp && sp !== p && pronOf(c, sp).he === pronOf(c, p).he ? said0.replace(`${nameOf(c, sp)} says ${pronOf(c, sp).he} was at `, `${nameOf(c, sp)}’s own answer was `) : said0;
  const breaker = ownAccount.replace(new RegExp(`\\b(had|passed|put|saw) ${esc(nameOf(c, p))}\\b`), `$1 ${P.him}`);
  void wPlace;
  const subtle = w.k === 'CLAIM' && w.place === col.place;
  return { claim, breaker, subtle };
}

/** The spans an agreement says: "here at eleven, with Feeney", "the Automat at eight and nine". */
function agreeSpans(c: BoardCase, cs: Extract<Prop, { k: 'CONFIRMS' }>[], here: PlaceId, merged: boolean): { bits: string; parts: { at: string; hs: string; comp: string }[] } {
  const groups: Extract<Prop, { k: 'CONFIRMS' }>[][] = merged ? [cs] : cs.map((x) => [x]);
  const parts = groups.map((g) => {
    const x = g[0] as Extract<Prop, { k: 'CONFIRMS' }>;
    const own = personOf(c, x.person)?.home === x.place && x.place !== here;
    return { at: own ? 'home' : where(c, x.place, here), hs: andList(g.map((y) => hourWord(y.hour))), comp: andList((x.company ?? []).map((y) => nameOf(c, y))) };
  });
  return { bits: andList(parts.map((y) => `${y.at} at ${y.hs}${y.comp ? `, with ${y.comp}` : ''}`)), parts };
}

/** The way-in's sentences from its propositions: who could (by the hour they heard, when told), and who couldn't. */
function accessArgs(c: BoardCase, as: Extract<Prop, { k: 'ACCESS' }>[], here: PlaceId): { yes?: string; no?: string; nobody?: string; short?: string; of?: string; one?: PersonId } {
  const yes = as.filter((a) => a.had).map((a) => a.person);
  const no = as.filter((a) => !a.had).map((a) => a.person);
  const mode = c.setup?.means ?? '';
  const out: { yes?: string; no?: string; nobody?: string; short?: string; of?: string; one?: PersonId } = {};
  const hourOf = new Map(as.filter((a) => a.had && a.hour !== undefined).map((a) => [a.person, a.hour as Hour]));
  if (yes.length > 0 && yes.every((p) => hourOf.has(p))) {
    const thing = mode === 'told-window' ? 'the window' : 'the key';
    const byHour = new Map<Hour, PersonId[]>();
    for (const p of yes) byHour.set(hourOf.get(p) as Hour, [...(byHour.get(hourOf.get(p) as Hour) ?? []), p]);
    const gs = [...byHour.entries()].sort((u, v) => u[0] - v[0]);
    out.yes = gs.map(([h, ps], i) => (i === 0 ? `${andList(ps.map((y) => nameOf(c, y)))} heard about ${thing} at ${hourWord(h)}` : `${andList(ps.map((y) => nameOf(c, y)))} at ${hourWord(h)}`)).join(', and ');
  } else if (yes.length > 0) {
    out.yes = `${andList(yes.map((p) => nameOf(c, p)))} ${accessPhrase(c, true, false, here).replace(/^was\b/, yes.length > 1 ? 'were' : 'was')}`;
  }
  if (no.length > 0) out.no = `${andList(no.map((p) => nameOf(c, p)))} ${accessPhrase(c, false, false, here).replace(/^was\b/, no.length > 1 ? 'were' : 'was').replace(/^wasn’t\b/, no.length > 1 ? 'weren’t' : 'wasn’t')}`;
  const neg = accessPhrase(c, false, false, here);
  const short = /^hadn’t\b/.test(neg) ? 'hadn’t' : /^wasn’t\b/.test(neg) ? (no.length > 1 ? 'weren’t' : 'wasn’t') : /^never heard\b/.test(neg) ? 'never did' : undefined;
  if (yes.length > 0 && no.length > 0 && short && !/, and /.test(out.yes ?? '')) {
    out.nobody = andList(no.map((p) => nameOf(c, p)));
    out.short = short;
  }
  // One person alone: what it says of them without their name, so it can be said where another fact names them.
  const one = yes.length + no.length === 1 ? (yes[0] ?? no[0]) : undefined;
  const said = out.yes ?? out.no ?? '';
  if (one !== undefined && said.startsWith(`${nameOf(c, one)} `) && !/[.!?] [A-Z]/.test(`${said}.`.replace(/\b(?:Mrs?|Dr|St)\. /g, ''))) {
    out.one = one;
    out.of = said.slice(nameOf(c, one).length + 1);
  }
  return out;
}

/** The way-in said in one of its forms: two sentences, or the planner's joins. */
function sayAccess(it: Item, ctx: PlanCtx, form: string[]): string | null {
  const comp = held(it);
  const a = accessArgs(ctx.c, props(comp.props, 'ACCESS'), ctx.run?.at ?? '');
  const flags = [...(a.yes ? ['yes'] : []), ...(a.no ? ['no'] : []), ...form];
  return voice(it, comp, flags, { yes: a.yes ?? '', no: a.no ?? '', nobody: a.nobody ?? '', short: a.short ?? '' }, ctx);
}

/* ------------------------------------------------------------------ *
 * Aggregation (per beat): facts that share a predicate, said together.
 * ------------------------------------------------------------------ */

/** The crime hour, when the player holds it; otherwise null. */
function crimeHour(ctx: PlanCtx): number | null {
  const s = ctx.run ? solveRun(ctx.c, ctx.run) : undefined;
  return s && s.possibleHours.length === 1 ? (s.possibleHours[0] as number) : null;
}

/** Whether facts at these hours may share a sentence: all at the crime hour, or none of them. */
function sameSide(hours: number[], hc: number | null): boolean {
  if (hc === null) return true;
  const at = hours.map((h) => h === hc);
  return at.every((x) => x === at[0]);
}

/** A notebook placement, from its propositions: who, where at what hours, and on whose word. */
function placedClause(it: Item, c: BoardCase): { who: string; at: string; by: string; hours: number[] } | null {
  if (it.tag !== 'clause:placed') return null;
  const ps = props(it.props ?? [], 'PLACED');
  if (ps.length === 0) return null;
  const same = ps.every((x) => x.place === ps[0]?.place);
  const at = same ? `${placeName(c, (ps[0] as Extract<Prop, { k: 'PLACED' }>).place)} at ${andList(ps.map((x) => hourWord(x.hour)))}` : andList(ps.map((x) => `${placeName(c, x.place)} at ${hourWord(x.hour)}`));
  const by = andList([...new Set(ps.map((x) => srcName(c, x.by)))]);
  return { who: nameOf(c, (ps[0] as Extract<Prop, { k: 'PLACED' }>).person), at, by, hours: ps.map((x) => x.hour) };
}

/** A notebook evening on their own word, from its propositions: who, and what they said. */
function ownClause(it: Item, c: BoardCase): { who: string; said: string } | null {
  if (it.tag !== 'clause:own') return null;
  const cs = props(it.props ?? [], 'CLAIM');
  if (cs.length === 0) return null;
  const p = (cs[0] as Extract<Prop, { k: 'CLAIM' }>).person;
  const wh = cs.map((x) => claimSaid(c, p, x.hour).replace(/ at \w+$/, ''));
  const said = wh.every((x) => x === wh[0]) ? `${wh[0]} at ${andList(cs.map((x) => hourWord(x.hour)))}` : andList(cs.map((x) => claimSaid(c, p, x.hour)));
  return { who: nameOf(c, p), said };
}

/** Keep an answer line's quotation marks where they were. */
function inQuotes(old: string, said: string): string {
  return `${old.startsWith('“') ? '“' : ''}${said}${old.endsWith('”') ? '”' : ''}`;
}

/**
 * docs/52 build 2: the writers' composites, voiced. A fact the writer handed over as a composite
 * (`Item.say`: its shape, flags, typed arguments and the speaker's manner) is said in a voicing of
 * its shape, least recently used tonight; where none fits, a person's answer keeps its own words and
 * the narration is said plainly. An answer's line keeps its quotation marks; a fact that opens on
 * the page's "So" or "But" (`Item.opener`) is voiced bare, and the join is put before it (`connect`
 * keeps it or doesn't).
 */
export function sayAll(items: Item[], ctx: PlanCtx): void {
  // An answer says "o’clock" twice at most: after that, a voicing without it, where one fits.
  let oclock = 0;
  for (const it of items) {
    if (!it.speech || !it.runOn) oclock = 0;
    if (it.speech) oclock += (it.comp ? it.text.match(/o’clock/g)?.length : 0) ?? 0;
    if (it.kind !== 'fact' || !it.say || it.comp) continue;
    const s = it.say;
    const comp: Held = { shape: s.shape, props: [...(it.props ?? [])] };
    const p = pickFor(s.shape, s.flags, s.args, ctx, s.manner, it.speech && oclock >= 2 ? (t) => !/o’clock/.test(t) : undefined);
    if (it.speech) oclock += (p ? p.text : it.text).match(/o’clock/g)?.length ?? 0;
    if (!p) {
      if (it.speech || s.keep) it.comp = { ...comp, voicing: 'flesh', said: it.text } as Held;
      else {
        sayPlain(it, comp, ctx);
        if (it.opener) {
          it.flesh = { ...(it.flesh ?? {}), bare: it.text };
          it.text = `${it.opener} ${lowerFirst(it.text)}`;
        }
      }
      continue;
    }
    spend(comp, p, ctx);
    comp.voicing = p.v.id;
    comp.args = s.args;
    comp.said = p.text;
    comp.flags = s.flags;
    comp.manner = s.manner;
    sample(comp, it, ctx);
    it.comp = comp;
    // (The office's pointer's reason, said in the same breath: inside the voicing's closing quotation mark.)
    const said = it.sayAfter ? (/”$/.test(p.text) ? `${p.text.slice(0, -1)}${it.sayAfter}”` : `${p.text}${it.sayAfter}`) : p.text;
    if (it.speech) it.text = inQuotes(it.text, said);
    else if (it.sayAfter) it.text = said;
    else if (it.opener) {
      it.flesh = { ...(it.flesh ?? {}), bare: p.text };
      it.text = `${it.opener} ${lowerFirst(p.text)}`;
      it.alts = openerAlts(it, comp, p, ctx);
    } else {
      it.text = p.text;
      it.alts = altsFor(comp, p, ctx);
    }
  }
}

export function aggregate(items: Item[], ctx: PlanCtx): Item[] {
  const c = ctx.c;
  const hc = crimeHour(ctx);
  const out: Item[] = [];
  const used = new Set<Item>();
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Item;
    if (used.has(it)) continue;
    // The notebook's placements on one person's word: one sentence, wherever they come in it.
    const p0 = placedClause(it, c);
    if (p0) {
      const run = [it];
      for (let k = i + 1; k < items.length && run.length < MOST; k++) {
        const x = items[k] as Item;
        if (!x.tag?.startsWith('clause:')) break;
        const q = placedClause(x, c);
        if (!q || q.by !== p0.by || !sameSide([...p0.hours, ...q.hours], hc)) continue;
        run.push(x);
      }
      if (run.length > 1) {
        for (const x of run.slice(1)) used.add(x);
        for (const x of run) unspend(x, ctx);
        const ps = run.map((x) => placedClause(x, c) as { who: string; at: string });
        // One place and hour for all of them is said once: "Kavanagh and Renfro at the Velvet Room at eleven".
        const byAt = new Map<string, string[]>();
        for (const x of ps) byAt.set(x.at, [...(byAt.get(x.at) ?? []), x.who]);
        const nu: Item = { ...it, about: [...new Set(run.flatMap((x) => x.about ?? []))], carries: run.flatMap((x) => x.carries ?? []), props: run.flatMap((x) => x.props ?? []), joined: 'aggregated' };
        const comp: Held = { shape: 'PLACED-SET', props: [...(nu.props ?? [])] };
        voice(nu, comp, ['recap'], { by: p0.by, groups: andList([...byAt.entries()].map(([at, who]) => `${andList(who)} at ${at}`)) }, ctx);
        out.push(nu);
        continue;
      }
    }
    // The evenings nobody else has spoken for: one sentence.
    const o0 = ownClause(it, c);
    if (o0) {
      const run = [it];
      for (let k = i + 1; k < items.length && run.length < MOST; k++) {
        if (!ownClause(items[k] as Item, c)) break;
        run.push(items[k] as Item);
      }
      if (run.length > 1) {
        for (const x of run) unspend(x, ctx);
        const os = run.map((x) => ownClause(x, c) as { who: string; said: string });
        const nu: Item = { ...it, about: [...new Set(run.flatMap((x) => x.about ?? []))], carries: run.flatMap((x) => x.carries ?? []), props: run.flatMap((x) => x.props ?? []), joined: 'aggregated' };
        const comp: Held = { shape: 'OWN-WORD', props: [...(nu.props ?? [])] };
        voice(nu, comp, ['recap'], { owns: andList(os.map((x, j) => (j === 0 ? `${x.who} said ${x.said}` : `${x.who} ${x.said}`))) }, ctx);
        out.push(nu);
        i += run.length - 1;
        continue;
      }
    }
    // Who could get at it, and the exception last: "Hauck and Rosenbaum had been here earlier, when the
    // laudanum was there for the taking, and Vogel hadn’t."
    if (ruleOf(it) === 'way-in') {
      const a = accessArgs(c, props(it.props ?? [], 'ACCESS'), ctx.run?.at ?? '');
      it.comp = { ...leafOf(it), shape: 'ACCESS-SET' } as Held;
      sayAccess(it, ctx, []);
      const one = `${cap(a.yes ?? '')}, and ${a.nobody} ${a.short}.`;
      if (a.nobody && !/;/.test(a.yes ?? '') && one.split(/\s+/).length <= 30) {
        sayAccess(it, ctx, ['agg']);
        it.joined = 'aggregated';
      }
      out.push(it);
      continue;
    }
    // (A watcher's hour and its "nobody else" is one composite now, LIST-HOUR `whole`, voiced whole
    // by the watcher's voicings: docs/52 build 2.)
    out.push(it);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Connectives (the section, in order): the join says what the fact does.
 * ------------------------------------------------------------------ */

/** The sentences of a fact that open on "So" or "But": a join, whoever wrote it. */
function opensOn(text: string, word: 'So' | 'But'): boolean {
  return new RegExp(`(?:^|[.!?]\\s+)${word}\\b`).test(text.replace(/“[^”]*”/g, ' '));
}

/** The window said in one of its forms, from its propositions. */
function sayWindow(it: Item, ctx: PlanCtx, one: boolean, so: boolean): string | null {
  const c = ctx.c;
  const comp = held(it);
  comp.shape = 'WINDOW-ALIVE';
  const w = props(comp.props, 'WINDOW')[0];
  const al = props(comp.props, 'ALIVE')[0];
  const nw = props(comp.props, 'NARROWS')[0];
  if (!w || !al) return null;
  const here = ctx.run?.at ?? '';
  const walk = !!nw;
  const flags = [one ? 'one' : 'two', isMurder(c) ? 'murder' : 'small', ...(walk ? ['walk'] : []), ...(walk && so ? ['so'] : [])];
  const args = {
    client: clientOf(c).short,
    opts: `${hourWord(w.hours[0] as Hour)} or ${hourWord(w.hours[1] as Hour)}`,
    victim: victimOf(c).short,
    place: placeName(c, al.place),
    at: atWhere(c, al.place, here),
    hour: hourWord(al.hour),
    him: pr(c, c.crime.victim).him,
    narrowed: nw ? oclock(nw.hour) : '',
    narrowword: nw ? hourWord(nw.hour) : '',
  };
  return voice(it, comp, flags, args, ctx);
}

export function connect(items: Item[], ctx: PlanCtx): void {
  const c = ctx.c;
  const b = ctx.budget;
  const here = ctx.run?.at ?? '';
  items.forEach((it, i) => {
    if (it.kind !== 'fact') return;
    if (!it.comp) it.comp = { ...leafOf(it), said: it.text } as Held;
    const rule = ruleOf(it);
    const before = items
      .slice(0, i)
      .filter((x) => x.kind === 'fact')
      .map((x) => x.text)
      .join(' ');
    const ps = it.props ?? [];
    if (rule === 'collision') {
      const col = props(ps, 'COLLIDES')[0];
      if (!col) return;
      const comp = held(it);
      const d = collisionArgs(c, col, here);
      const fl = it.flesh as { two: string; twos: string[] };
      const one = `${d.claim}, but ${d.breaker}.`;
      // One sentence only when its pronouns stay clear (an object after the breaker's own subject is clear).
      const clash = !clearAfter(c, col.person, d.breaker);
      if (b.but === 0 && wordsIn(one) <= 26 && !/;/.test(d.breaker) && !clash && !d.subtle) {
        voice(it, comp, ['but'], { claim: d.claim, breaker: d.breaker }, ctx);
        comp.join = 'but';
        it.joined = 'but';
        b.but++;
        b.joins++;
        return;
      }
      // Two lines side by side, and one short join: never "him" where the breaker named another man.
      const clash2 = sameSexIn(c, col.person, d.breaker).length > 0;
      const ok = fl.twos.filter((t) => !(clash2 && /\b(him|her|his)⁣/.test(t)));
      const two = ok.includes(fl.two) ? fl.two : (ok[0] ?? fl.two);
      voice(it, comp, ['two'], { claim: d.claim, breaker: d.breaker, two }, ctx);
      comp.join = 'two';
      it.joined = 'two';
      b.joins++;
      return;
    }
    if (rule === 'agree') {
      const cs = props(ps, 'CONFIRMS');
      const by = cs[0]?.by as Src;
      const fl = (it.flesh ?? {}) as { merged?: boolean };
      const sp = agreeSpans(c, cs, here, !!fl.merged);
      // One place at two hours with different company is said once: "the Lyric at nine, with Doyle, and at eight".
      const [p0, p1] = sp.parts;
      const bits = p0 && p1 && sp.parts.length === 2 && p0.at === p1.at ? `${p0.at} at ${p0.hs}${p0.comp ? `, with ${p0.comp},` : ''} and at ${p1.hs}${p1.comp ? `, with ${p1.comp}` : ''}` : sp.bits;
      // Not "So" before a line that opens on it ("So far as it went, it stood up.").
      const next = items[i + 1];
      const so = b.so === 0 && !(next && /^So\b/.test(next.text));
      const comp = held(it);
      comp.shape = 'CONFIRMED';
      // docs/53: where the line is somebody of their sex ("Coffin’s list had Ashby…, just like he said"), no pronoun for them.
      const twosome = !!by?.who && pronOf(c, by.who as PersonId).he === pronOf(c, cs[0]?.person as PersonId).he;
      voice(it, comp, ['agree', so ? 'so' : 'which', ...(twosome ? ['twosome'] : [])], { spans: bits, src: srcHad(c, by), whose: srcWhose(c, by), person: { t: 'person', id: cs[0]?.person as PersonId } }, ctx);
      comp.join = so ? 'so' : 'which';
      it.joined = comp.join;
      if (so) b.so++;
      b.joins++;
      return;
    }
    if (rule === 'agree-rest') {
      const cs = props(ps, 'CONFIRMS');
      const p = cs[0]?.person as PersonId;
      const by = cs[0]?.by as Src;
      const src = srcHad(c, by).replace(/ had( said)?$/, '');
      // One place at two hours, with nobody named and on one side of the crime hour, is said once.
      const hc = crimeHour(ctx);
      const parts = cs.map((x) => ({ at: atWhere(c, x.place, here), h: x.hour, hs: [x.hour], comp: andList((x.company ?? []).map((y) => nameOf(c, y))) }));
      const [r0, r1] = parts;
      const merged = r0 && r1 && parts.length === 2 && r0.at === r1.at && !r0.comp && !r1.comp && sameSide([r0.h, r1.h], hc) ? [{ ...r0, hs: [r0.h, r1.h] }] : parts;
      const [q0, q1] = merged;
      const bits =
        q0 && q1 && merged.length === 2 && q0.at === q1.at
          ? `${q0.at} at ${hourWord(q0.h as Hour)}${q0.comp ? `, with ${q0.comp},` : ''} and at ${hourWord(q1.h as Hour)}${q1.comp ? `, with ${q1.comp}` : ''}`
          : andList(merged.map((y) => `${y.at} at ${andList(y.hs.map((h) => hourWord(h as Hour)))}${y.comp ? `, with ${y.comp}` : ''}`)).replace(/(\w), (with [^,]+) and (here|at|home)\b/, '$1, $2, and $3');
      const P = pr(c, p);
      const comp = held(it);
      comp.shape = 'CONFIRMED';
      // After a collision that named somebody of their sex, "same as she said" could be either of them.
      if (sameSexIn(c, p, `${before} ${src}`).length > 0) {
        voice(it, comp, ['rest', 'held'], { name: nameOf(c, p), by: src, whose: srcWhose(c, by), person: { t: 'person', id: p }, him: P.him, spans: bits }, ctx);
        comp.join = 'held';
        it.joined = 'held';
      } else {
        voice(it, comp, ['rest', 'same'], { by: src, whose: srcWhose(c, by), person: { t: 'person', id: p }, him: P.him, he: P.he, spans: bits }, ctx);
        comp.join = 'same';
        it.joined = 'same';
      }
      b.joins++;
      return;
    }
    if (rule === 'list-agree') {
      const cs = props(ps, 'CONFIRMS');
      const comp = held(it);
      comp.shape = 'CONFIRMED';
      const watcher = (cs[0]?.by as Src).who as PersonId;
      const W = nameOf(c, watcher);
      if (cs.length === 1) {
        const y = cs[0] as Extract<Prop, { k: 'CONFIRMS' }>;
        const P = pr(c, y.person);
        const at = atWhere(c, y.place, here);
        const clear = !!(it.flesh as { clear?: boolean } | undefined)?.clear;
        if (pronOf(c, watcher).he === pronOf(c, y.person).he) {
          voice(it, comp, ['list', 'too'], { name: nameOf(c, y.person), person: { t: 'person', id: y.person }, at, hour: hourWord(y.hour as Hour), watcher: W, him: P.him, there: at === 'here' ? 'here' : 'there' }, ctx);
          comp.join = 'too';
          it.joined = 'too';
        } else {
          voice(it, comp, ['list', 'same'], { watcher: W, them: clear ? P.him : nameOf(c, y.person), person: { t: 'person', id: y.person }, at, hour: hourWord(y.hour as Hour), he: P.he }, ctx);
          comp.join = 'same';
          it.joined = 'same';
        }
        b.joins++;
        return;
      }
      voice(it, comp, ['list', 'many'], { watcher: W, pairs: andList(cs.map((y) => `${nameOf(c, y.person)} at ${hourWord(y.hour as Hour)}`)) }, ctx);
    }
    if (rule === 'hours' && props(ps, 'CLAIM').length > 0) {
      // What they said for the hours that mattered, plain (no join: it's new), said one of two ways
      // so two pages don't say it word for word.
      const cl = props(ps, 'CLAIM');
      const p = (cl[0] as Extract<Prop, { k: 'CLAIM' }>).person;
      const hs = cl.map((x) => x.hour);
      const said = hs.map((h) => claimSaid(c, p, h));
      const same = said.every((s) => s.replace(/ at \w+$/, '') === (said[0] ?? '').replace(/ at \w+$/, ''));
      const homeAt = cl[0]?.place ?? '';
      const what = same ? ((said[0] ?? '').startsWith('home') && homeAt && !homeNamed(c, p) ? `home at ${placeName(c, homeAt)}` : (said[0] ?? '').replace(/ at \w+$/, '')) : andList(said);
      const named = !!(it.flesh as { named?: boolean } | undefined)?.named;
      const who = named ? nameOf(c, p) : pr(c, p).he;
      const listy = what.includes(',') || / at (?:seven|eight|nine|ten|eleven|twelve|midnight)\b/.test(what);
      const comp = held(it);
      comp.shape = 'OWN-WORD';
      const args = { hs: andList(hs.map((h) => hourWord(h as Hour))), hourword: hs.length > 1 ? 'hours' : 'hour', who, what, reason: whyHours(c, hs) };
      const v = pickFor('OWN-WORD', ['hours', ...(listy ? ['listy'] : [])], args, ctx);
      if (!v) {
        sayPlain(it, comp, ctx);
        return;
      }
      comp.flags = ['hours', ...(listy ? ['listy'] : [])];
      sayWith(it, comp, v, args, ctx);
      it.alts = altsFor(comp, v, ctx);
      return;
    }
    if (rule === 'placed') {
      // The one who gave their word says it, as the subject: "He put Tillman here at ten." The keeper
      // of a list counts: "By her count, Margolis and Grasso were here at ten."
      const pl = props(ps, 'PLACED');
      const fl = (it.flesh ?? {}) as { swear?: string; him?: boolean; self?: string; keeper?: string };
      const runs = new Map<string, { ps: PersonId[]; place: PlaceId; h: number }>();
      for (const y of pl) {
        const r = runs.get(`${y.place}@${y.hour}`) ?? { ps: [], place: y.place, h: y.hour };
        r.ps.push(y.person);
        runs.set(`${y.place}@${y.hour}`, r);
      }
      const only = pl.length === 1 ? pl[0]?.person : undefined;
      const bits = [...runs.values()].map((r) => `${fl.him && only ? pr(c, only).him : andList(r.ps.map((y) => nameOf(c, y)))} ${atWhere(c, r.place, here)} at ${hourWord(r.h as Hour)}`);
      const runsSaid = andList([...runs.values()].map((r) => `${andList(r.ps.map((y) => nameOf(c, y)))} ${r.ps.length > 1 ? 'were' : 'was'} ${atWhere(c, r.place, here)} at ${hourWord(r.h as Hour)}`));
      const comp = held(it);
      comp.shape = 'PLACED-SET';
      voice(it, comp, ['swear'], { bits: andList(bits), swear: fl.swear ?? '' }, ctx);
      if (fl.him) return;
      if (fl.self) {
        voice(it, comp, ['self'], { he: pr(c, fl.self).he, bits: andList(bits) }, ctx);
        it.joined = 'self';
        comp.join = 'self';
        // Where "he" would be read as somebody else, the same fact without them in it.
        const v = pickFor('PLACED-SET', ['self', 'plain'], { runs: runsSaid }, ctx);
        if (v) it.alts = () => [{ text: v.text, take: () => (spend(comp, v, ctx), (comp.voicing = v.v.id), (comp.args = { runs: runsSaid }), (comp.said = v.text)) }];
      } else if (fl.keeper) {
        voice(it, comp, ['count'], { his: pr(c, fl.keeper).his, keeper: { t: 'person', id: fl.keeper }, runs: runsSaid }, ctx);
        it.joined = 'count';
        comp.join = 'count';
      }
      return;
    }
    if (rule === 'window' || rule === 'street') {
      if (rule === 'window') sayWindow(it, ctx, false, true);
      else sayStreet(it, ctx, false);
    }
    // Whoever wrote it: a page has one "so" chain and one "but". The writer's own words say where
    // theirs is (`opener`), and a second one goes.
    const comp = held(it);
    if (rule === 'window' && props(ps, 'NARROWS').length > 0) {
      if (b.so > 0) sayWindow(it, ctx, false, false);
      else {
        b.so++;
        b.joins++;
        it.joined ??= 'so';
        comp.join = 'so';
      }
      return;
    }
    if (it.opener) {
      const word = it.opener;
      const spent = word === 'So' ? b.so > 0 : b.but > 0;
      if (spent) {
        it.text = String((it.flesh as { bare?: string } | undefined)?.bare ?? it.text);
        comp.said = it.text;
      } else {
        if (word === 'So') b.so++;
        else b.but++;
        b.joins++;
        it.joined ??= word === 'So' ? 'so' : 'but';
        comp.join = it.joined;
      }
      return;
    }
    // (The writers mark their openers; anything else opening on "So" or "But" is a writer's slip.)
    if (opensOn(it.text, 'So') || opensOn(it.text, 'But')) throw new Error(`docs/52: an unmarked opener in a fact: ${it.text.slice(0, 80)}`);
  });
}

/** The street's lead and its link, from its proposition. */
function sayStreet(it: Item, ctx: PlanCtx, one: boolean): string | null {
  const c = ctx.c;
  const comp = held(it);
  comp.shape = 'STREET';
  const street = c.places.find((p) => p.id === c.crime.scene)?.street ?? '';
  return voice(it, comp, [one ? 'one' : 'two', isMurder(c) ? 'murder' : 'small'], { street, victim: victimOf(c).short, client: clientOf(c).short }, ctx);
}

/* ------------------------------------------------------------------ *
 * Composition (the thought): its facts joined by what they do to each other.
 * ------------------------------------------------------------------ */

/** A fact and the asides that came after it. */
interface Seg {
  fact: Item;
  glosses: Item[];
}

/**
 * Clauses a sentence has joined already: ", but", a semicolon, a colon, and ", and" before a clause
 * of its own ("…, and Russo hadn’t"), not before a list's next item ("…, and at seven, with Amato").
 */
function joined(t: string): number {
  const p = plain(t).replace(/“[^”]*”/g, ' ');
  const and = /, and (?:I|he|she|they|it|there|nobody|somebody|everybody|(?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+(?: and (?:(?:Mrs\.|Mr\.|Miss|Dr\.) )?[A-Z][\w’]+)? (?:had|hadn’t|was|wasn’t|were|weren’t|said|says|passed|put|heard|never|did|didn’t))\b/g;
  return (p.match(/, but |; |: /g) ?? []).length + (p.match(and) ?? []).length;
}

/**
 * Whether a sentence opens on a clause the planner may run on after ", and": a subject and its verb
 * near the front, or a short lead ("By her count,", "For ten,") and then one.
 */
function runsOn(t: string, c: BoardCase): boolean {
  const p = plain(t);
  if (/^(?:So|But|And|Then|Here’s|That left|Like|As if|Which)\b/.test(p)) return false;
  if (/^(?:By [^,]+ count|For [^,]+|At [^,]+|If [^,]+|Whatever [^,]+), /.test(p)) return true;
  const names = c.people.filter((x) => !x.object && x.short.length > 2).map((x) => esc(x.short));
  const subject = new RegExp(`^(?:I|He|She|It|They|There|Nobody|Somebody|Everybody|That|This|Fewer|Plenty|The [a-z]+|A [a-z]+${names.length ? `|${names.join('|')}` : ''})\\b`);
  if (!subject.test(p)) return false;
  return /\b(?:was|were|had|hadn’t|wasn’t|weren’t|did|didn’t|said|says|put|passed|heard|never|could|would|is|isn’t|takes|came|went|saw|told|kept|lived)\b/.test(p.split(/\s+/).slice(1, 8).join(' '));
}

function single(t: string): boolean {
  return sentencesOf(plain(t)).length === 1 && /\.$/.test(t.trim()) && !/[“”]/.test(t);
}

/**
 * The fact said as one sentence, where its voicing has a form for it: the window and its sighting,
 * the street's lead and its link, the way in, a collision's two lines once the page's "but" has gone.
 */
function oneSentence(it: Item, ctx: PlanCtx): void {
  const rule = ruleOf(it);
  const comp = held(it);
  if (rule === 'window' && comp.shape === 'WINDOW-ALIVE') {
    const walk = props(comp.props, 'NARROWS').length > 0;
    // At a walk the "so" is the page's; when it went to an earlier fact, the two sentences stay.
    if (walk && comp.join !== 'so') return;
    sayWindow(it, ctx, true, walk);
    if (walk) it.joined = 'so';
    it.composed = true;
    return;
  }
  if (rule === 'street') {
    sayStreet(it, ctx, true);
    it.composed = true;
    return;
  }
  if (rule === 'way-in') {
    // Who could and who couldn't, as one: "Belkin heard about the window at eight, and Miss Moskin
    // at nine, but Glick never heard Mrs. Krantz tell the room."
    const xs = sentencesOf(it.text);
    if (xs.length === 2 && wordsIn(plain(it.text)) <= LONGEST) {
      const but = ctx.budget.but === 0 && !/, but /.test(it.text);
      sayAccess(it, ctx, ['one', but ? 'but' : 'semi']);
      if (but) {
        ctx.budget.but++;
        ctx.budget.joins++;
        it.joined = 'but';
      }
      it.composed = true;
    } else if (it.joined === 'aggregated') {
      // Who could, and the one who couldn't, is a contrast: "…, but Vogel hadn’t", where the page's "but" is free.
      if (ctx.budget.but === 0) {
        sayAccess(it, ctx, ['agg', 'but']);
        it.joined = 'but';
        ctx.budget.but++;
        ctx.budget.joins++;
      }
      it.composed = true;
    }
    return;
  }
  if (rule === 'collision' && it.joined === 'two') {
    const col = props(comp.props, 'COLLIDES')[0];
    if (!col) return;
    const d = collisionArgs(ctx.c, col, ctx.run?.at ?? '');
    const two = (sentencesOf(it.text).pop() ?? '').trim();
    const one = `${d.claim}, and ${d.breaker}: ${lowerFirst(two)}`;
    if (/;/.test(d.breaker) || wordsIn(plain(one)) > 34 || !clearAfter(ctx.c, col.person, d.breaker)) return;
    voice(it, comp, ['colon'], { claim: d.claim, breaker: d.breaker, two: lowerFirst(two) }, ctx);
    comp.join = 'colon';
    it.composed = true;
  }
}

const HOURS: Record<number, string> = { 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' };

/**
 * Two people one list confirms, one sentence: the list's agreement with somebody's own word, and the
 * same list's count of somebody else ("…, and with him Mrs. Blau").
 */
function confirmPair(segs: Seg[], ctx: PlanCtx): void {
  const c = ctx.c;
  const here = ctx.run?.at ?? '';
  for (let i = 0; i + 1 < segs.length; i++) {
    const L = (segs[i] as Seg).fact;
    const P = (segs[i + 1] as Seg).fact;
    if (ruleOf(L) !== 'list-agree' || ruleOf(P) !== 'placed' || L.composed || P.composed) continue;
    const ls = props(L.props ?? [], 'CONFIRMS');
    const watcher = (ls[0]?.by as Src | undefined)?.who;
    const pf = (P.flesh ?? {}) as { keeper?: string };
    const pl = props(P.props ?? [], 'PLACED');
    if (!watcher || pf.keeper !== watcher || !single(L.text) || !single(P.text)) continue;
    const runs = new Map<string, { ps: PersonId[]; place: PlaceId; h: number }>();
    for (const y of pl) {
      const r = runs.get(`${y.place}@${y.hour}`) ?? { ps: [], place: y.place, h: y.hour };
      r.ps.push(y.person);
      runs.set(`${y.place}@${y.hour}`, r);
    }
    const one = ls.length === 1 ? (ls[0] as Extract<Prop, { k: 'CONFIRMS' }>) : undefined;
    const sameAll = !!one && [...runs.values()].every((r) => r.place === one.place && r.h === one.hour);
    const names = [...runs.values()].map((r) => andList(r.ps.map((y) => nameOf(c, y))));
    const lat = atWhere(c, (ls[0] as Extract<Prop, { k: 'CONFIRMS' }>).place, here);
    const comp: Held = { shape: 'CONFIRMED-WITH', props: [...(L.props ?? []), ...(P.props ?? [])], parts: [held(L), held(P)] };
    const confirmed = L.text.replace(/\.$/, '');
    let v: Picked | null;
    let args: Record<string, string>;
    if (sameAll && one) {
      // "had him here too, with Teitel": "too" said it already; otherwise "and with him Mrs. Blau".
      args = { confirmed, others: names.join(' and '), him: pr(c, one.person).him };
      v = pickFor('CONFIRMED-WITH', [L.joined === 'too' ? 'too' : 'same'], args, ctx);
    } else {
      const bits = [...runs.values()].map((r) => `${andList(r.ps.map((y) => nameOf(c, y)))}${atWhere(c, r.place, here) === lat ? '' : ` ${atWhere(c, r.place, here)}`} at ${HOURS[r.h] ?? String(r.h)}`);
      args = { confirmed, placed: bits.join(' and ') };
      v = pickFor('CONFIRMED-WITH', ['apart'], args, ctx);
    }
    const text = v ? v.text : plainComposite(c, comp);
    if (wordsIn(plain(text)) > LONGEST) continue;
    if (v) spend(comp, v, ctx);
    comp.voicing = v?.v.id ?? 'plain';
    if (v) comp.args = args;
    comp.said = text;
    comp.flags = sameAll && one ? [L.joined === 'too' ? 'too' : 'same'] : ['apart'];
    sample(comp, undefined, ctx);
    merge(L, P, comp, text, 'with');
    (segs[i] as Seg).glosses.push(...(segs[i + 1] as Seg).glosses);
    segs.splice(i + 1, 1);
  }
}

/**
 * Who could get at the means, said of the one person it's about where another fact names them at
 * the end of its sentence ("…and with him Mrs. Blau, who hadn’t been at…"), or opens on them ("By
 * her count, Mrs. Blau was here at ten, and she hadn’t been at…").
 */
function accessAttach(segs: Seg[], ctx: PlanCtx): void {
  const c = ctx.c;
  const k = segs.findIndex((s) => ruleOf(s.fact) === 'way-in' && !s.fact.composed);
  if (k < 0) return;
  const W = (segs[k] as Seg).fact;
  const a = accessArgs(c, props(W.props ?? [], 'ACCESS'), ctx.run?.at ?? '');
  if (!a.one || !a.of || !single(W.text) || (segs[k] as Seg).glosses.length > 0) return;
  const name = nameOf(c, a.one);
  const nm = esc(name);
  for (let j = 0; j < segs.length; j++) {
    if (j === k) continue;
    const F = (segs[j] as Seg).fact;
    if (ruleOf(F) === 'collision' || !single(F.text) || !/[.]$/.test(F.text)) continue;
    const t = F.text;
    let form: 'who' | 'and-he' | undefined;
    // The name ends the sentence: a relative clause after it.
    if (new RegExp(`\\b${nm}\\.$`).test(t)) form = 'who';
    // The sentence is about them: "and she…" after it, when nobody else of their sex is named in it.
    else if (new RegExp(`^(?:By [^,]+, )?${nm} (?:was|were|had)\\b`).test(plain(t)) && sameSexIn(c, a.one, t).length === 0 && joined(t) === 0) form = 'and-he';
    if (!form) continue;
    const comp: Held = { shape: 'ATTACH', props: [...(F.props ?? []), ...(W.props ?? [])], parts: [held(F), held(W)], join: form };
    const args = { host: t.replace(/\.$/, ''), of: a.of, he: pr(c, a.one).he };
    const v = pickFor('ATTACH', [form], args, ctx);
    const text = v ? v.text : plainComposite(c, comp);
    if (wordsIn(plain(text)) > LONGEST) continue;
    if (v) spend(comp, v, ctx);
    comp.flags = [form];
    comp.voicing = v?.v.id ?? 'plain';
    if (v) comp.args = args;
    comp.said = text;
    sample(comp, undefined, ctx);
    merge(F, W, comp, text, 'who');
    // Said where they're named, it's no longer said where it was.
    segs.splice(k, 1);
    return;
  }
}

/** An evening that held, and the hour that mattered on their word alone: one sentence, with the "but". */
function heldBut(segs: Seg[], ctx: PlanCtx): void {
  for (let i = 0; i + 1 < segs.length; i++) {
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (ruleOf(A) !== 'agree' || ruleOf(B) !== 'hours' || A.composed || B.composed) continue;
    if (ctx.budget.but > 0 || !single(A.text) || !single(B.text) || /^(?:So|But)\b/.test(B.text)) continue;
    const { comp, text, commit } = sayPair(A, B, 'but', ctx);
    if (wordsIn(plain(text)) > LONGEST) continue;
    commit();
    merge(A, B, comp, text, 'but');
    ctx.budget.but++;
    ctx.budget.joins++;
    // The aside after the agreement ("So far as it went, it stood up.") is what the "but" says.
    (segs[i] as Seg).glosses = [...(segs[i + 1] as Seg).glosses];
    segs.splice(i + 1, 1);
  }
}

/** The rest, side by side, where they'll go: ", and", or a semicolon once a page. */
function sideBySide(segs: Seg[], ctx: PlanCtx, n: number): void {
  const budget = ctx.budget;
  const target = Math.ceil(n / 2);
  const sentences = () => segs.reduce((k, s) => k + sentencesOf(plain(s.fact.text)).length, 0);
  /** How two side by side would go, and what it costs: the joins already in them, and the length. */
  const option = (i: number): { comp: Held; text: string; join?: string; cost: number; commit: () => void } | null => {
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (!single(A.text) || !single(B.text) || /^(?:So|But)\b/.test(plain(B.text)) || ruleOf(B) === 'collision') return null;
    let made: { comp: Held; text: string; commit: () => void } | undefined;
    let join: string | undefined;
    // A collision keeps a clause of its own (docs/49 §2): after it, only a semicolon.
    if (ruleOf(A) === 'collision') {
      if ((budget.semi ?? 0) === 0 && !/;/.test(A.text + B.text) && joined(B.text) === 0) [made, join] = [sayPair(A, B, 'semi', ctx), 'semi'];
    } else if ((A.comp as Held | undefined)?.flags?.includes('hole') && (B.comp as Held | undefined)?.flags?.includes('if-held') && budget.but === 0) {
      // The hole, and the story owned up to in its place: "but if it held, …".
      [made, join] = [sayPair(A, B, 'but', ctx, 'ADMIT-CHECK'), 'but'];
    } else if (ruleOf(B) === 'street' && A.relation === 'confirms' && budget.but === 0 && joined(A.text) === 0) {
      // A confirmed evening, and the thing worth keeping after it: "but".
      [made, join] = [sayPair(A, B, 'but', ctx), 'but'];
    } else if (joined(A.text) + joined(B.text) === 0 && runsOn(B.text, ctx.c)) {
      made = sayPair(A, B, 'and', ctx);
    } else if ((budget.semi ?? 0) === 0 && joined(A.text) + joined(B.text) <= 2 && !/;/.test(A.text + B.text) && (runsOn(B.text, ctx.c) || ruleOf(B) === 'street' || ruleOf(B) === 'hours')) {
      [made, join] = [sayPair(A, B, 'semi', ctx), 'semi'];
    }
    if (!made || wordsIn(plain(made.text)) > LONGEST) return null;
    // The plainest join first: fewest joins already in the two, a semicolon last, then the shorter.
    return { ...made, ...(join ? { join } : {}), cost: (joined(A.text) + joined(B.text)) * 20 + (join === 'semi' ? 30 : 0) + wordsIn(plain(made.text)) };
  };
  while (sentences() > target) {
    let best: { i: number; comp: Held; text: string; join?: string; cost: number; commit: () => void } | null = null;
    for (let i = 0; i + 1 < segs.length; i++) {
      const o = option(i);
      if (o && (!best || o.cost < best.cost)) best = { i, ...o };
    }
    if (!best) return;
    const { i, comp, text, join, commit } = best;
    commit();
    const A = (segs[i] as Seg).fact;
    const B = (segs[i + 1] as Seg).fact;
    if (join === 'but') {
      budget.but++;
      budget.joins++;
    }
    if (join === 'semi') budget.semi = (budget.semi ?? 0) + 1;
    merge(A, B, comp, text, join === 'semi' ? undefined : join);
    // The asides come after the sentence both facts went into; an agreement's ("So far as it went,
    // it stood up.") is what the join says, and goes.
    (segs[i] as Seg).glosses = [...(ruleOf(A) === 'agree' ? [] : (segs[i] as Seg).glosses), ...(segs[i + 1] as Seg).glosses];
    segs.splice(i + 1, 1);
  }
}

/**
 * Compose the thought beat's facts, in place. Items before the first fact (an arrival's aside) and
 * after the thought (somebody who turned out to be in the room) stay where they are.
 */
export function compose(items: Item[], ctx: PlanCtx): Item[] {
  const first = items.findIndex(isThoughtFact);
  if (first < 0) return items;
  const head = items.slice(0, first);
  const segs: Seg[] = [];
  const tail: Item[] = [];
  for (const it of items.slice(first)) {
    if (isThoughtFact(it)) segs.push({ fact: it, glosses: [] });
    else if (it.kind === 'gap' && it.slot === 'gloss' && tail.length === 0 && segs.length) (segs[segs.length - 1] as Seg).glosses.push(it);
    else tail.push(it);
  }
  const n = segs.reduce((k, s) => k + (s.fact.n ?? 1), 0);
  for (const s of segs) oneSentence(s.fact, ctx);
  confirmPair(segs, ctx);
  accessAttach(segs, ctx);
  heldBut(segs, ctx);
  sideBySide(segs, ctx, n);
  const out = [...head, ...segs.flatMap((s) => [s.fact, ...s.glosses]), ...tail];
  // The thought is one paragraph: everything after its first item runs on.
  const at = out.indexOf((segs[0] as Seg).fact);
  out.forEach((x, i) => {
    if (i > at && x.beat === 'thought' && (isThoughtFact(x) || (x.kind === 'gap' && x.slot === 'gloss'))) x.runOn = true;
  });
  return out;
}

/**
 * The skeleton's bones for a fact item: its composite, without the planner's working notes (`said`,
 * the words the voicing gave it before the reference and the rhythm, is kept when the round trip
 * asks for it).
 */
export function bonesOf(it: Item, keepSaid = false): Composite[] | undefined {
  if (it.kind !== 'fact') return undefined;
  const strip = (x: Composite & { said?: string }): Composite => ({
    shape: x.shape,
    props: x.props,
    ...(x.parts ? { parts: x.parts.map(strip) } : {}),
    ...(x.join ? { join: x.join } : {}),
    ...(x.voicing ? { voicing: x.voicing } : {}),
    ...(keepSaid && x.said !== undefined ? { said: x.said } : {}),
  });
  if (it.comp) return [strip(it.comp)];
  if (it.props) return [strip({ ...leafOf(it), said: it.text })];
  return undefined;
}

export type { PageBudget };
