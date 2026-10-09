/**
 * docs/43 §2, the report: who, when, how and why for a murder; who, when,
 * where it is now and why for a lost thing. Then the ending, "What really
 * happened" (the crime only), and the curtain: the true board, the path and
 * the lies.
 *
 * The verdict is v1's shape (`Verdict`), so the book's own verdict page
 * draws it.
 */

import { ROOMING_MEANS, WORKPLACES, HOLDERS } from '../../gen/board/content.js';
import { questionById, key } from '../../gen/board/solver.js';
import { minimalSets } from '../../gen/board/path.js';
import { techniquesUpTo } from '../../gen/board/tiers.js';
import { questionsOf, solve } from '../../gen/board/solver.js';
import type { Verdict, FieldResult, Outcome } from '../scoring.js';
import { Hand } from './decks.js';
import { accountOf } from './knowledge.js';
import {
  andList,
  cap,
  clientOf,
  hourWord,
  isMurder,
  nameOf,
  oclock,
  parCalls,
  personOf,
  placeName,
  pronOf,
  suspectsOf,
  victimOf,
  type BoardDeal,
  type BoardReport,
  type BoardRun,
  type Hour,
  type PersonId,
} from './model.js';
import { withCaps } from './pages.js';

export type FieldKey = 'who' | 'when' | 'how' | 'why' | 'where';

export interface FieldSpec {
  key: FieldKey;
  label: string;
  options: { value: string; label: string }[];
}

/** The means the form offers: the night's own, and the others a case of its kind could have had. */
function meansOptions(d: BoardDeal): { value: string; label: string }[] {
  const names = new Set<string>([d.kase.means.name]);
  for (const m of ROOMING_MEANS) names.add(m.name);
  for (const w of WORKPLACES) names.add(w.meansName);
  return [...names].map((n) => ({ value: n, label: cap(n.replace(/^(a|an) /, '')) }));
}

/** Where a lost thing could be: with whoever buys such things, in the places the night has. */
function whereOptions(d: BoardDeal): { value: string; label: string }[] {
  const c = d.kase;
  const out: { value: string; label: string }[] = HOLDERS.map((h) => ({ value: `holder:${h.id}`, label: cap(h.listed) }));
  out.push({ value: 'scene', label: `Still at ${placeName(c, c.crime.scene)}` });
  return out;
}

export function boardFields(d: BoardDeal): FieldSpec[] {
  const c = d.kase;
  const people = suspectsOf(c).map((p) => ({ value: p, label: personOf(c, p)?.name ?? p }));
  const hours = c.board.hours.map((h) => ({ value: String(h), label: `${cap(hourWord(h))} o’clock` }));
  const why = suspectsOf(c).map((p) => ({ value: p, label: cap(personOf(c, p)?.motive ?? p) }));
  const out: FieldSpec[] = [
    { key: 'who', label: isMurder(c) ? 'Who did it' : 'Who took it', options: people },
    { key: 'when', label: isMurder(c) ? 'When' : 'When it went', options: hours },
  ];
  if (isMurder(c)) out.push({ key: 'how', label: 'How', options: meansOptions(d) });
  else out.push({ key: 'where', label: 'Where it is now', options: whereOptions(d) });
  out.push({ key: 'why', label: 'Why', options: why });
  return out;
}

function truthOf(d: BoardDeal, k: FieldKey): string {
  const c = d.kase;
  if (k === 'who') return c.crime.culprit;
  if (k === 'when') return String(c.crime.hour);
  if (k === 'how') return c.means.name;
  if (k === 'why') return c.crime.culprit;
  const h = HOLDERS.find((x) => c.crime.whereNow?.text.includes(x.who.split(',')[0] as string));
  return h ? `holder:${h.id}` : 'scene';
}

export function truthReport(d: BoardDeal): BoardReport {
  return {
    who: truthOf(d, 'who'),
    when: Number(truthOf(d, 'when')),
    why: truthOf(d, 'why'),
    ...(isMurder(d.kase) ? { how: truthOf(d, 'how') } : { where: truthOf(d, 'where') }),
  };
}

function given(r: BoardReport, k: FieldKey): string | null {
  const v = k === 'when' ? r.when : (r as unknown as Record<string, string | null | undefined>)[k];
  return v === null || v === undefined ? null : String(v);
}

/** Read a report back from the form's answers: `who=Feldman; when=10; …`. */
export function reportFrom(d: BoardDeal, answers: Partial<Record<FieldKey, string | null>>): BoardReport {
  return {
    who: answers.who ?? null,
    when: answers.when ? Number(answers.when) : null,
    why: answers.why ?? null,
    ...(isMurder(d.kase) ? { how: answers.how ?? null } : { where: answers.where ?? null }),
  };
}

export function scoreBoard(d: BoardDeal, run: BoardRun, report: BoardReport): Verdict {
  const fields: FieldResult[] = boardFields(d).map((f) => {
    const g = given(report, f.key);
    const t = truthOf(d, f.key);
    const label = (v: string | null) => (v === null ? 'I don’t know' : (f.options.find((o) => o.value === v)?.label ?? v));
    return { key: f.key as never, label: f.label, given: label(g), truth: label(t), correct: g !== null && g === t, answered: g !== null };
  });
  const points = fields.filter((f) => f.correct).length;
  const asked = fields.length;
  const who = fields[0] as FieldResult;
  const outcome: Outcome = !who.answered ? 'cold' : !who.correct ? 'wrong-man' : points === asked ? 'solved' : 'thin';
  const par = parCalls(d);
  return {
    column: [],
    points,
    asked,
    outcome,
    fields,
    actionsUsed: run.used,
    par,
    closing: closingOf(d, run, outcome),
    gaps: [],
  };
}

function closingOf(d: BoardDeal, run: BoardRun, outcome: Outcome): string[] {
  const c = d.kase;
  const hand = new Hand(run.seed * 31 + 7, 999, run.spent);
  const cl = clientOf(c);
  const slots = withCaps({ client: cl.short, cHis: pronOf(c, c.client).his });
  const type = isMurder(c) ? 'murder' : 'small';
  const out: string[] = [];
  const end = hand.draw('ending', { outcome, type }, slots, { widen: true });
  if (end) out.push(end);
  const par = parCalls(d);
  if (outcome === 'solved') {
    out.push(run.used <= par ? `It took me ${run.used} calls. A better detective would have needed the same, and there aren’t many of those about.` : `It took me ${run.used} calls. A better detective would have done it in ${par}.`);
  }
  // The office's prop, paid off, unless the report page already paid it off with this line.
  const fresh = (run.prop?.pay ?? []).filter((l) => !run.spent.includes(`pay:${l.slice(0, 40)}`));
  if (fresh.length) out.push(hand.rng.pick(fresh));
  return out;
}

/* ------------------------------------------------------------------ *
 * What really happened: the crime only.
 * ------------------------------------------------------------------ */

export function storyOfBoard(d: BoardDeal): string[] {
  const c = d.kase;
  const p = c.crime.culprit;
  const pr = pronOf(c, p);
  const name = personOf(c, p)?.name ?? nameOf(c, p);
  const short = nameOf(c, p);
  const v = victimOf(c);
  const out: string[] = [];
  const row = c.board.rows[p] ?? {};
  const atOrigin = c.means.available.find((h) => row[h] === c.means.origin);
  const lie = c.lies.find((l) => l.person === p);
  const claim = lie ? placeName(c, lie.claim) : undefined;
  const motive = personOf(c, p)?.motive;
  if (isMurder(c)) {
    out.push(`${name} did it. The reason was an old one: ${motive}.`);
    out.push(
      atOrigin !== undefined
        ? `At ${oclock(atOrigin)} ${short} was at ${placeName(c, c.means.origin)}, and took ${c.means.originText.replace(/, there from .*$/, '').replace(/, open from .*$/, '').replace(new RegExp(` (?:at|from) ${placeName(c, c.means.origin).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')}.`
        : `${cap(short)} took ${c.means.originText} while it sat there to be taken.`,
    );
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} went round to ${placeName(c, c.crime.scene)}, and ${v.short} let ${pr.him} in. ${meansMoment(c.means.kind, v.short)}`);
    const after = c.board.hours.find((h) => h > c.crime.hour);
    if (after !== undefined) out.push(`By ${oclock(after)} ${pr.he} was at ${placeName(c, row[after] ?? '')}, as if ${pr.he} had never left.`);
  } else {
    out.push(`${name} took ${v.short}. ${cap(pastOf(motive ?? ''))}.`);
    if (atOrigin !== undefined) out.push(`${cap(short)} learned the way in at ${placeName(c, c.means.origin)} at ${oclock(atOrigin)}: ${c.means.originText.replace(/^[^;]*; /, '')}.`);
    out.push(`At ${oclock(c.crime.hour)} ${pr.he} let ${pr.self} into ${placeName(c, c.crime.scene)} and came out with ${v.short}.`);
    if (c.crime.whereNow) out.push(`${cap(v.short)} ended up ${c.crime.whereNow.text}.`);
  }
  if (claim && lie) out.push(`Asked, ${pr.he} said ${pr.he} had been at ${claim} at ${hourWord(lie.hour)}. ${breakerOf(d)}`);
  return out;
}

function meansMoment(kind: string, victim: string): string {
  if (kind === 'gun') return `${cap(victim)} was shot across his own table.`;
  if (kind === 'blade') return `When ${victim} turned his back, that was the end of it.`;
  return `It went into ${victim}’s drink, and ${victim} never knew.`;
}

/** A motive said of tonight, told as a story afterwards: "he is three weeks behind" → "he was". */
function pastOf(s: string): string {
  return s.replace(/\b(he|she) is\b/g, '$1 was').replace(/\b(he|she) has been\b/g, '$1 had been').replace(/\b(he|she) has\b/g, '$1 had').replace(/\b(he|she) owes\b/g, '$1 owed').replace(/\b(he|she) says\b/g, '$1 said').replace(/\btakes things\b/g, 'took things').replace(/\bhaven’t spoken\b/g, 'hadn’t spoken').replace(/\bsings\b/g, 'sang');
}

/** How the lie came out: what it collided with. */
function breakerOf(d: BoardDeal): string {
  const c = d.kase;
  const lie = c.lies.find((l) => l.person === c.crime.culprit);
  if (!lie) return '';
  const T = techniquesUpTo(c.tier);
  const qs = questionsOf(c).map((q) => q.id).filter((q) => !q.startsWith('confront:'));
  const sets = minimalSets(qs, [], (held) => solve(c, held, { techniques: T }).status.get(key(lie.person, lie.hour))?.s === 'broken', 3, true);
  const first = sets[0]?.filter((q) => q !== `account:${lie.person}`) ?? [];
  if (first.length === 0) return 'Nothing true agreed with it.';
  const names = first.map((q) => questionById(c, q)).map((q) => (q?.kind === 'list' ? `${nameOf(c, q.subject)}’s list` : q?.kind === 'account' ? `${nameOf(c, q.subject)}’s own evening` : 'the room'));
  return `${cap(andList(names))} said otherwise.`;
}

/* ------------------------------------------------------------------ *
 * Behind the curtain: the true board, the path and the lies.
 * ------------------------------------------------------------------ */

export function curtainOfBoard(d: BoardDeal): string {
  const c = d.kase;
  const out: string[] = [];
  const hours = c.board.hours;
  const rows = [...suspectsOf(c), ...c.people.filter((p) => p.role === 'company').map((p) => p.id), ...(isMurder(c) ? [c.crime.victim] : [])];
  const w0 = Math.max(...rows.map((id) => nameOf(c, id).length)) + 3;
  const cw = Math.max(12, ...rows.flatMap((id) => hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').length + 2)));
  out.push('THE TRUE BOARD');
  out.push(`${''.padEnd(w0)}${hours.map((h) => `${hourWord(h)}`.padEnd(cw)).join('')}`);
  for (const id of rows) {
    const mark = id === c.crime.culprit ? ' *' : id === c.crime.victim ? ' †' : '';
    out.push(`${(nameOf(c, id) + mark).padEnd(w0)}${hours.map((h) => placeName(c, c.board.rows[id]?.[h] ?? '').padEnd(cw)).join('')}`);
  }
  out.push('(* who did it' + (isMurder(c) ? ', † the dead man)' : ')'));
  out.push('');
  out.push('THE LIES');
  for (const l of c.lies) {
    const k = c.confrontations.find((x) => x.person === l.person && x.hour === l.hour);
    const why = l.kind === 'culprit' || l.kind === 'pair' && l.person === c.crime.culprit ? 'to hide the crime' : l.kind === 'pair' ? 'to cover for a friend' : `to hide ${personOf(c, l.person)?.secret ?? 'something'}`;
    out.push(`- ${nameOf(c, l.person)} said ${placeName(c, l.claim)} at ${hourWord(l.hour)}; ${pronOf(c, l.person).he} was at ${placeName(c, l.truth)}, ${why}. Put to it: ${k?.response === 'admit' ? 'owned up' : k?.response === 'second-lie' ? 'a second story' : k?.response === 'crack' ? 'cracked' : 'refused'}.`);
  }
  out.push('');
  out.push(`THE PATH (par ${d.analysis.par} questions${d.analysis.motive ? ' and the motive search' : ''}, ${d.analysis.walks} walks)`);
  d.analysis.path.forEach((s, i) => out.push(`${i + 1}. ${s.label}. ${s.why.replace(/\s*\(step \d+\)/g, '')}`));
  if (d.analysis.motive) out.push(`+. ${questionById(c, d.analysis.motive)?.label ?? ''}.`);
  return out.join('\n');
}

export type { Hour, PersonId };
export { accountOf };
