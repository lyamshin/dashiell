/**
 * M13 — sheets.
 *
 * The designer: "cards from the decks slot into known holes in each sheet.
 * Sheets should be mutable and have their own internal roles … it demand[s]
 * cards from specified decks in the correct places and … reuse[s], in the
 * same sheet, some of the info from those cards." And: "A 'page' [is]
 * multiple sheets."
 *
 * A sheet (`content/sheets/*.json`) is a short hand-written skeleton for one
 * part of a page. It holds three kinds of thing, in order:
 *
 *   sheet text   the joins, written with the setup in view ("Nobody looked up
 *                except the one person paid to."), with `{slots}` for people,
 *                the place and the roles
 *   holes        a card from a named deck, or a piece the realizer writes
 *                itself (the establish card, the watcher's activity, the
 *                finds, a telling), each optional or not
 *   roles        a thing a card exports (`prop`, `trait`, `thing`) and the
 *                sheet brings back later: the mirror introduced by one card
 *                and paid off by the closing line
 *
 * and a closing line with a callback variant (which needs a role) and a plain
 * one (which does not). Whether a page pays anything off is a seeded roll,
 * about seventy pages in a hundred (the designer: "not every page").
 *
 * This file is the machinery and nothing else: loading, choosing a sheet with
 * a memory like the dealer's, and running it against the holes a moment's
 * adapter (`sheet-pages.ts`) supplies. It knows no case and no deck.
 */

import type { Rng } from '../../gen/rng.js';
import type { Id } from '../../gen/types.js';
import type { ProseVoice } from '../types.js';
import type { CardExport } from '../voice/cards.js';
import { tidyPunctuation } from '../voice/prose.js';
import arrivalJson from '../../../content/sheets/arrival.json';
import companyJson from '../../../content/sheets/company.json';
import askJson from '../../../content/sheets/ask.json';
import tellingJson from '../../../content/sheets/telling.json';
import searchJson from '../../../content/sheets/search.json';
import confrontJson from '../../../content/sheets/confront.json';
import recapJson from '../../../content/sheets/recap.json';
import officeJson from '../../../content/sheets/office.json';

/* ------------------------------------------------------------------ *
 * The format.
 * ------------------------------------------------------------------ */

export const MOMENTS = ['arrival', 'company', 'ask', 'telling', 'search', 'confront', 'recap', 'office'] as const;
export type Moment = (typeof MOMENTS)[number];

/** A condition: a flag's truth, one of a list of values, or a number compared. */
export type WhenValue = boolean | string | string[] | number;

export interface SheetPart {
  /** Sheet text, with `{slots}`. On an engine hole, the frame its words go in (`{list}`). */
  text?: string;
  /** A hole: the realizer's own piece by name, or a card when `deck` is set. */
  hole?: string;
  /** The deck a card hole draws from. */
  deck?: string;
  /** Tags the card must carry (as the dealer matches them, `any` a wildcard). */
  tags?: Record<string, string>;
  /** Whose card, for a deck keyed by person (`character`, `look`, `greet`): a role name. */
  of?: string;
  /** The role this hole's card exports, bound for the rest of the page. */
  bind?: string;
  /** How an engine hole is written (`short`, `activity`, `placed`, `list`…); `bind` alone draws and says nothing. */
  form?: string;
  /** Phrases a `placed` hole puts people by, with `{prop}` and pronoun slots. */
  pool?: string[];
  /** Left out when there is nothing to put in it. */
  optional?: boolean;
  /** Written only when this flag holds (`!flag` when it does not). */
  if?: string;
  /** Starts a new paragraph. */
  para?: boolean;
  /** This is the sheet's one joke. */
  joke?: boolean;
  /** A beat this text says, so the realizer does not write it too (`watcher-view`). */
  says?: string;
  /** Roles sheet text introduces itself (with `bind`): "I turned to a clean page" offers the page. */
  exports?: Record<string, CardExport>;
}

export interface SheetClose {
  /** Lines that pay a role off. The role's own `pay` lines come first. */
  callback?: string[];
  /** Lines that need no role. */
  plain?: string[];
  /** Also draw from the `close` deck, by moment and the role's kind. */
  deck?: boolean;
  /** Which roles the close may pay off, in order of preference (default: any bound). */
  roles?: string[];
  joke?: boolean;
}

export interface Sheet {
  id: string;
  moment: Moment;
  name: string;
  when?: Record<string, WhenValue>;
  parts: SheetPart[];
  close?: SheetClose;
  /** A sheet a moment should see more or less often than the rest (default 1). */
  weight?: number;
  notes?: string;
}

interface SheetFile {
  moment: string;
  sheets: Omit<Sheet, 'moment'>[];
}

const FILES: SheetFile[] = [
  arrivalJson,
  companyJson,
  askJson,
  tellingJson,
  searchJson,
  confrontJson,
  recapJson,
  officeJson,
] as unknown as SheetFile[];

export const SHEETS: Sheet[] = FILES.flatMap((f) => f.sheets.map((s) => ({ ...s, moment: f.moment as Moment })));

export function sheetsFor(moment: Moment): Sheet[] {
  return SHEETS.filter((s) => s.moment === moment);
}

export function sheetById(id: string): Sheet | undefined {
  return SHEETS.find((s) => s.id === id);
}

/* ------------------------------------------------------------------ *
 * Conditions.
 * ------------------------------------------------------------------ */

export type Flags = Record<string, boolean | string | number | undefined>;

/** Does one condition hold? `">=2"` and `"<3"` compare numbers; a list is any of. */
export function holds(have: Flags[string], want: WhenValue): boolean {
  if (typeof want === 'boolean') return Boolean(have) === want;
  if (typeof want === 'number') return Number(have ?? 0) === want;
  if (Array.isArray(want)) return want.includes(String(have));
  const m = /^(>=|<=|>|<|!=)\s*(-?\d+)$/.exec(want);
  if (m) {
    const n = Number(have ?? 0);
    const k = Number(m[2]);
    switch (m[1]) {
      case '>=':
        return n >= k;
      case '<=':
        return n <= k;
      case '>':
        return n > k;
      case '<':
        return n < k;
      default:
        return n !== k;
    }
  }
  if (want.startsWith('!')) return String(have) !== want.slice(1);
  return String(have) === want;
}

export function fitsWhen(sheet: Sheet, flags: Flags): boolean {
  return Object.entries(sheet.when ?? {}).every(([k, want]) => holds(flags[k], want));
}

/** A part's `if`: a flag, or `!flag`. */
function partOn(part: SheetPart, flags: Flags): boolean {
  if (part.if === undefined) return true;
  return part.if.startsWith('!') ? !flags[part.if.slice(1)] : Boolean(flags[part.if]);
}

/* ------------------------------------------------------------------ *
 * Choosing: at random among the sheets that fit, with a memory.
 * ------------------------------------------------------------------ */

/**
 * One sheet for a moment, from those whose conditions hold and that the
 * adapter can fill. Like the dealer: never the sheet this moment had last
 * time when another fits, then the least used tonight, then a weighted roll.
 * `history` is tonight's sheet ids, oldest first.
 */
export function chooseSheet(
  moment: Moment,
  flags: Flags,
  history: readonly string[],
  random: Rng,
  can: (sheet: Sheet) => boolean = () => true,
  prefer: (sheet: Sheet) => boolean = () => true,
  /** Filled with how many sheets were in the running, for the measure. */
  out?: { fitting: number },
): Sheet | null {
  let pool = sheetsFor(moment).filter((s) => fitsWhen(s, flags) && can(s));
  if (pool.length === 0) return null;
  // A callback page wants a sheet that can pay something off, if one fits.
  const preferred = pool.filter(prefer);
  if (preferred.length > 0) pool = preferred;
  if (out) out.fitting = pool.length;
  const mine = history.filter((id) => pool.some((s) => s.id === id));
  const last = mine[mine.length - 1];
  if (pool.length > 1 && last !== undefined) pool = pool.filter((s) => s.id !== last);
  const uses = (s: Sheet): number => history.filter((id) => id === s.id).length;
  const least = Math.min(...pool.map(uses));
  pool = pool.filter((s) => uses(s) === least);
  const weights = pool.map((s) => Math.max(0, s.weight ?? 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random.next() * (total > 0 ? total : pool.length);
  for (let i = 0; i < pool.length; i++) {
    roll -= total > 0 ? (weights[i] as number) : 1;
    if (roll < 0) return pool[i] as Sheet;
  }
  return pool[pool.length - 1] as Sheet;
}

/** The share of pages that pay a role off (the designer: about seventy in a hundred). */
export const CALLBACK_SHARE = 0.7;

/** The page's roll: does it pay anything off? Seeded, so the same night reads the same. */
export function callbackRoll(seed: number, page: number): boolean {
  let h = 2166136261 ^ (seed >>> 0);
  for (const c of `callback:${page}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296 < CALLBACK_SHARE;
}

/* ------------------------------------------------------------------ *
 * Running a sheet.
 * ------------------------------------------------------------------ */

/** One paragraph a piece or a block writes. */
export interface OutPara {
  text: string;
  voice: ProseVoice;
  beats: number[];
  clueId?: Id;
  imageN?: number;
}

/** What a hole gives the sheet. */
export interface Piece {
  /** The words, run into the sheet's current paragraph. Empty for a silent bind. */
  text: string;
  beats?: number[];
  voice?: ProseVoice;
  /** Sentences off an image card (M5 §1). */
  imageN?: number;
  /** Roles the card offers. */
  exports?: Record<string, CardExport>;
  /** Roles this piece's words brought back (a `placed` hole: "under the bulbs"). */
  uses?: string[];
  /** People this piece put on the page. */
  presents?: Id[];
  /** Paragraphs of their own: the sheet breaks around them. */
  block?: OutPara[];
  /** The engine says this piece's roles elsewhere on the page, before the close. */
  introduces?: boolean;
}

export interface Holes {
  /** The realizer's own piece, or null when there is nothing to put in it. */
  engine(part: SheetPart, run: SheetRun): Piece | null;
  /** A card. `want` is the role the draw should export, on a callback page. */
  deck(part: SheetPart, want: string | null, run: SheetRun): Piece | null;
  /** A closing line off the close deck: for a role's kind, or (role null) a plain one. */
  close(role: string | null, exp: CardExport | null, run: SheetRun): string | null;
  /** The engine's plain close (M12's last word), when the moment has one. */
  plainClose?(run: SheetRun): string | null;
  /** Slots the sheet text may use: people, the place, the hour. */
  slots: Record<string, string | undefined>;
  /** Which slot prefixes put a person on the page (`tell` → the tell's id). */
  people?: Record<string, Id>;
  /** Engine holes the page must carry wherever the sheet did not put them. */
  musts?: string[];
  random: Rng;
}

/** The state of one page's sheets: the roles bound so far, and what was paid off. */
export interface SheetRun {
  moment: Moment;
  flags: Flags;
  callback: boolean;
  roles: Map<string, CardExport>;
  /** Roles already on the page in words, so a later mention is a payoff. */
  introduced: Set<string>;
  /** Roles paid off on this page. */
  paid: string[];
  /** Engine holes written. */
  written: Set<string>;
  /** People the sheet has put on the page. */
  presented: Set<Id>;
  /** Beats the sheet's own text said (a covered beat), with the words. */
  covered: Map<string, string>;
  /** Text parts that named a person, by slot prefix, with the words. */
  said: Map<string, string>;
  /** The sheets this page used, in order. */
  sheets: string[];
}

export function newRun(moment: Moment, flags: Flags, callback: boolean, carry?: SheetRun): SheetRun {
  return {
    moment,
    flags,
    callback,
    roles: carry?.roles ?? new Map(),
    introduced: carry?.introduced ?? new Set(),
    paid: carry?.paid ?? [],
    written: new Set(),
    presented: carry?.presented ?? new Set(),
    covered: new Map(),
    said: new Map(),
    sheets: carry?.sheets ?? [],
  };
}

const SLOT = /\{([A-Za-z@][\w-]*(?:\.[\w-]+)?)\}/g;

/** The slots a template names. */
export function slotsIn(template: string): string[] {
  return [...template.matchAll(SLOT)].map((m) => m[1] as string);
}

/**
 * A role's words by slot: `{prop}` its short form, `{prop.text}` the whole
 * noun phrase, `{prop.near}` where things stand by it, `{Prop}` put up.
 */
function roleValue(exp: CardExport, field: string | undefined): string | undefined {
  switch (field) {
    case undefined:
    case 'short':
      return exp.short;
    case 'text':
      return exp.text;
    case 'near':
      return exp.near;
    case 'it':
      return pluralThing(exp.short) ? 'them' : 'it';
    default:
      return undefined;
  }
}

/** "the globes" are them, "the glass" is it. */
export function pluralThing(short: string): boolean {
  const last = short.trim().split(/\s+/).pop() ?? '';
  return /s$/i.test(last) && !/(?:ss|us|is|ys)$/i.test(last);
}

/**
 * Fill sheet text. Null when a slot has nothing to put in it (a role not
 * bound, a person not in the room). `roles` are read only on a callback page.
 */
export function fillSheet(
  template: string,
  slots: Record<string, string | undefined>,
  run: SheetRun,
): { text: string; roles: string[]; prefixes: string[] } | null {
  const roles: string[] = [];
  const prefixes: string[] = [];
  let missing = false;
  const out = template.replace(SLOT, (_m, key: string, at: number, whole: string) => {
    const [head, field] = key.split('.') as [string, string | undefined];
    const lower = head.charAt(0).toLowerCase() + head.slice(1);
    const up = head !== lower;
    let value: string | undefined;
    const exp = run.callback ? run.roles.get(lower) : undefined;
    if (exp !== undefined) {
      value = roleValue(exp, field);
      if (value !== undefined) roles.push(lower);
    } else {
      value = slots[key] ?? (up ? cap(slots[`${lower}${field ? `.${field}` : ''}`]) : undefined);
      if (value !== undefined) prefixes.push(lower);
    }
    if (value === undefined || value.length === 0) {
      missing = true;
      return '';
    }
    const opens = at === 0 || /(?:\.[”"’)]+|[.!?:])\s+$/.test(whole.slice(0, at));
    return up || opens ? cap(value) as string : value;
  });
  if (missing) return null;
  return { text: tidyPunctuation(out), roles, prefixes };
}

function wordsIn(s: string): number {
  return s.split(/\s+/).filter((w) => w.length > 0).length;
}

function cap(s: string | undefined): string | undefined {
  return s === undefined || s.length === 0 ? s : `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}

/** Is this template a callback (does it name a role)? */
export function namesRole(template: string, roles: Iterable<string>): boolean {
  const set = new Set(roles);
  return slotsIn(template).some((k) => {
    const head = (k.split('.')[0] as string).replace(/^./, (c) => c.toLowerCase());
    return set.has(head);
  });
}

/** Roles the sheets use. A slot with one of these heads is a role, not a person. */
export const ROLE_NAMES = ['prop', 'trait', 'thing', 'figure', 'mark'] as const;

export interface SheetOut {
  /** Paragraphs before the body (or the whole sheet, for a moment with no body). */
  pre: OutPara[];
  /** Paragraphs after the body, before the close. */
  post: OutPara[];
  /** The closing line, and whether it paid a role off. */
  close: { text: string; callback: boolean; role?: string } | null;
}

/**
 * Run one sheet against a moment's holes. Null when a part the sheet needs
 * has nothing to go in it, before anything is dealt where that can be known;
 * the caller then tries another sheet or writes the page the old way.
 */
export function runSheet(sheet: Sheet, holes: Holes, run: SheetRun): SheetOut | null {
  const pre: OutPara[] = [];
  const post: OutPara[] = [];
  let target = pre;
  let cur: OutPara | null = null;
  const flush = (): void => {
    if (cur && cur.text.trim().length > 0) target.push(cur);
    cur = null;
  };
  const add = (text: string, beats: number[], voice: ProseVoice | undefined, imageN = 0): void => {
    const t = text.trim();
    if (t.length === 0) {
      if (beats.length > 0 && cur) cur.beats.push(...beats);
      return;
    }
    if (!cur) cur = { text: t, voice: voice ?? 'narrator', beats: [...beats], imageN };
    else {
      cur.text = `${cur.text} ${t}`;
      cur.beats.push(...beats);
      cur.imageN = (cur.imageN ?? 0) + imageN;
      if (cur.voice === 'narrator' && voice !== undefined) cur.voice = voice;
    }
  };
  const bindFrom = (part: SheetPart, piece: Piece): void => {
    if (!part.bind || !run.callback) return;
    const exp = piece.exports?.[part.bind];
    if (exp === undefined) return;
    run.roles.set(part.bind, exp);
    if (piece.text.trim().length > 0 || piece.introduces) run.introduced.add(part.bind);
  };
  const payoff = (roles: readonly string[]): void => {
    for (const r of roles) {
      if (run.introduced.has(r)) {
        if (!run.paid.includes(r)) run.paid.push(r);
      } else run.introduced.add(r);
    }
  };
  const person = (prefixes: readonly string[], text: string): void => {
    for (const p of new Set(prefixes)) {
      const id = holes.people?.[p];
      if (id !== undefined) {
        run.presented.add(id);
        run.said.set(p, run.said.has(p) ? `${run.said.get(p)} ${text}` : text);
      }
    }
  };

  for (const part of sheet.parts) {
    if (!partOn(part, run.flags)) continue;
    if (part.hole === 'body') {
      flush();
      target = post;
      continue;
    }
    if (part.para) flush();
    if (part.hole === undefined) {
      const filled = fillSheet(part.text ?? '', holes.slots, run);
      if (filled === null) {
        if (part.optional) continue;
        return null;
      }
      payoff(filled.roles);
      person(filled.prefixes, filled.text);
      if (part.says) run.covered.set(part.says, filled.text);
      if (part.bind && part.exports?.[part.bind] && run.callback) {
        run.roles.set(part.bind, part.exports[part.bind] as CardExport);
        run.introduced.add(part.bind);
      }
      add(filled.text, [], undefined);
      continue;
    }
    const want = part.bind && run.callback ? part.bind : null;
    const piece = part.deck !== undefined ? holes.deck(part, want, run) : holes.engine(part, run);
    if (piece === null) {
      if (part.optional) continue;
      return null;
    }
    if (part.deck === undefined) run.written.add(part.hole);
    bindFrom(part, piece);
    if (piece.uses) payoff(piece.uses);
    for (const id of piece.presents ?? []) run.presented.add(id);
    if (piece.block) {
      flush();
      for (const p of piece.block) target.push({ ...p, beats: [...p.beats] });
      if (piece.text.length > 0) add(piece.text, piece.beats ?? [], piece.voice, piece.imageN);
      continue;
    }
    if (part.form === 'bind') {
      add('', piece.beats ?? [], piece.voice);
      continue;
    }
    add(piece.text, piece.beats ?? [], piece.voice, piece.imageN);
  }
  flush();
  // Whatever the page must carry and the sheet did not place goes in before
  // the close, in the adapter's order.
  for (const name of holes.musts ?? []) {
    if (run.written.has(name)) continue;
    const piece = holes.engine({ hole: name }, run);
    run.written.add(name);
    if (piece === null) continue;
    for (const id of piece.presents ?? []) run.presented.add(id);
    if (piece.block) {
      for (const p of piece.block) target.push({ ...p, beats: [...p.beats] });
      continue;
    }
    if (piece.text.trim().length > 0 || (piece.beats ?? []).length > 0) {
      // Onto the paragraph before it while that is short; else one of its own.
      const prev = target[target.length - 1];
      if (!cur && prev && wordsIn(prev.text) + wordsIn(piece.text) <= 70 && prev.voice !== 'errand') {
        prev.text = `${prev.text} ${piece.text.trim()}`;
        prev.beats.push(...(piece.beats ?? []));
      } else {
        add(piece.text, piece.beats ?? [], piece.voice, piece.imageN);
        flush();
      }
    }
  }
  flush();

  const close = sheet.close ? closeLine(sheet, holes, run) : null;
  run.sheets.push(sheet.id);
  return { pre, post, close };
}

/**
 * The closing line. On a callback page, a role already on the page, paid off:
 * the card's own lines for it first ("I caught myself in the mirror behind
 * the bar…"), then the close deck's for its kind, then the sheet's. Otherwise
 * (or when nothing fits) the plain variant: the sheet's, the deck's, or the
 * engine's own last word.
 */
function closeLine(sheet: Sheet, holes: Holes, run: SheetRun): SheetOut['close'] {
  const spec = sheet.close as SheetClose;
  if (run.callback) {
    const bound = [...run.roles.keys()].filter((r) => run.introduced.has(r));
    const order = (spec.roles ?? bound).filter((r) => bound.includes(r));
    for (const role of holes.random.shuffle(order)) {
      const exp = run.roles.get(role) as CardExport;
      const own = (exp.pay ?? []).map((t) => fillSheet(t, holes.slots, run)).filter((x) => x !== null);
      if (own.length > 0) {
        const pick = holes.random.pick(own);
        if (!run.paid.includes(role)) run.paid.push(role);
        return { text: pick.text, callback: true, role };
      }
      const sheetLines = (spec.callback ?? [])
        .filter((t) => namesRole(t, [role]))
        .map((t) => fillSheet(t, holes.slots, run))
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const fromDeck = spec.deck ? holes.close(role, exp, run) : null;
      const choices = [...sheetLines.map((x) => x.text), ...(fromDeck ? [fromDeck] : [])];
      if (choices.length > 0) {
        const text = holes.random.pick(choices);
        if (!run.paid.includes(role)) run.paid.push(role);
        return { text, callback: true, role };
      }
    }
  }
  const plain = (spec.plain ?? [])
    .map((t) => fillSheet(t, holes.slots, { ...run, callback: false }))
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .map((x) => x.text);
  const deckPlain = spec.deck ? holes.close(null, null, run) : null;
  const engine = holes.plainClose ? holes.plainClose(run) : null;
  const choices = [...plain, ...(deckPlain ? [deckPlain] : [])];
  if (engine !== null && (choices.length === 0 || holes.random.chance(0.5))) return { text: engine, callback: false };
  if (choices.length === 0) return null;
  return { text: holes.random.pick(choices), callback: false };
}

/** Can a sheet pay anything off at all (a bound role, or a close that needs one)? */
export function canPay(sheet: Sheet): boolean {
  const binds = sheet.parts.some((p) => p.bind !== undefined);
  const uses = sheet.parts.some((p) => p.text !== undefined && namesRole(p.text, ROLE_NAMES)) ||
    (sheet.close?.callback ?? []).length > 0 ||
    sheet.close?.deck === true;
  return binds || uses;
}

/** Does a sheet need a role some earlier sheet on the page must bind? */
export function rolesNeeded(sheet: Sheet): string[] {
  const bound = new Set(sheet.parts.flatMap((p) => (p.bind ? [p.bind] : [])));
  const need = new Set<string>();
  for (const p of sheet.parts) {
    if (p.optional || p.if !== undefined) continue;
    for (const k of slotsIn(p.text ?? '')) {
      const head = (k.split('.')[0] as string).replace(/^./, (c) => c.toLowerCase());
      if ((ROLE_NAMES as readonly string[]).includes(head) && !bound.has(head)) need.add(head);
    }
    for (const t of p.pool ?? []) {
      for (const k of slotsIn(t)) {
        const head = (k.split('.')[0] as string).replace(/^./, (c) => c.toLowerCase());
        if ((ROLE_NAMES as readonly string[]).includes(head) && !bound.has(head)) need.add(head);
      }
    }
  }
  return [...need];
}
