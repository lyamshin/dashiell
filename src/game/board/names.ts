/**
 * docs/39 §4 and docs/44: a name twice at most a page. A person keeps their
 * name at the first mention and the last (the last is usually the hand-off or
 * the close, where the name does work); a mention between becomes "he" or
 * "she" when that is clear, or their role ("the house manager"), or keeps the
 * name when neither would be clear.
 *
 * A pronoun is clear when the person was named in this sentence or the one
 * before, and nobody else of the same pronoun was. A witness's list and a
 * person's own account (the answer itself) are left alone: they have to name
 * people. Speech is never rewritten, but it counts. A chapter break (the
 * turn) starts the count again: it is a page of its own.
 */

import type { Block } from '../types.js';
import type { BoardCase, Person } from './model.js';

interface Who {
  name: string;
  female: boolean;
  role?: string;
}

const VERB = /^(was|were|had|has|hadn’t|wasn’t|didn’t|did|does|doesn’t|would|wouldn’t|could|couldn’t|said|says|asked|told|tells|thought|minded|took|takes|kept|keeps|stood|stands|sat|sits|answered|answers|looked|looks|went|goes|came|comes|saw|sees|heard|never|put|passed|seemed|watched|nodded|shrugged|let|gave|made|counted|started|turned|knew|owned|named|wanted|got|gets|needed|found|lifted|isn’t|is|might|must|will|won’t|shut|opened|moved|left|stayed|held|meant|liked|lit|counted|tore|sat|stood)$/;
const OBJ = /\b(to|at|with|for|by|from|of|asked|told|thanked|had|put|passed|saw|over|beside|near|behind|let|gave|watched|named|left|caught|found|about|after|against|than|wanted|met|made|kept|back to|on|offered|pointed|showed|thanked|followed|joined|left)\s*$/;

/** "the house manager", "the neighbour": a role clear enough to stand for a name. Suspects keep their names. */
function roleOf(p: Person, c?: BoardCase): string | undefined {
  if (p.role === 'client') return 'my client';
  if (p.role === 'victim' && c?.type === 'murder') return 'the dead man';
  // Hard-boiled's faces: everybody's look is said on first sight, so "the man in the grey fedora" is them.
  if (c?.variant === 'face' && p.role === 'suspect' && p.look) return `the ${p.female ? 'woman' : 'man'} ${p.look}`;
  if (p.role === 'watcher') {
    const j = p.description.split(/,| at /)[0]?.trim();
    return j && /^the /.test(j) ? j : undefined;
  }
  if (p.role === 'company' && /^a neighbour\b/.test(p.description)) return 'the neighbour';
  return undefined;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Sentence {
  block: number;
  text: string;
  quoteAtStart: boolean;
  barrier?: boolean;
}

interface Occ {
  s: number;
  at: number;
  len: number;
  who: Who;
  title: string;
  inQuote: boolean;
  /** "Coffin’s list": a possessive is no rival for a pronoun. */
  poss: boolean;
}

function people(c: BoardCase): Who[] {
  const ws = c.people
    .filter((p) => !p.object && p.short.length > 2)
    .map((p) => ({ name: p.short, female: p.female === true, ...(roleOf(p, c) ? { role: roleOf(p, c) } : {}) }) as Who);
  const roles = new Map<string, number>();
  for (const x of ws) if (x.role) roles.set(x.role, (roles.get(x.role) ?? 0) + 1);
  for (const x of ws) if (x.role && (roles.get(x.role) ?? 0) > 1) delete x.role;
  return ws;
}

/** Thin the names in a page's blocks, in place. `exempt` blocks are neither counted nor changed. */
export function thinNames(c: BoardCase, blocks: Block[], exempt: (b: Block) => boolean, barrier: (b: Block) => boolean = () => false): void {
  const ws = people(c);
  if (ws.length === 0) return;
  const placeNames = c.places.flatMap((p) => [p.name, p.short, cap(p.name), cap(p.short)]).filter(Boolean).sort((a, b) => b.length - a.length);
  const bare = (n: string) => n.replace(/^Mrs\. /, '');
  const placeLike = placeLikeRe(ws.map((x) => x.name));
  const nameRe = new RegExp(`(Mr\\. |Mrs\\. )?\\b(${ws.map((x) => esc(bare(x.name))).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
  // Sections: a chapter break starts a new count.
  let section: number[] = [];
  const sections: number[][] = [];
  blocks.forEach((b, i) => {
    if (b.kind !== 'prose') return;
    if (b.voice === 'chapter') {
      sections.push(section);
      section = [];
      return;
    }
    // A watcher's list between two mentions is somebody else talking: "he" after it could be him.
    if (!exempt(b)) section.push(i);
    else if (barrier(b)) section.push(-1 - i);
  });
  sections.push(section);
  for (const idxs of sections) {
    // Mask places, split into sentences.
    const masks: string[] = [];
    const sentences: Sentence[] = [];
    for (const i of idxs) {
      if (i < 0) {
        sentences.push({ block: -1, text: '', quoteAtStart: false, barrier: true });
        continue;
      }
      const b = blocks[i];
      if (!b || b.kind !== 'prose') continue;
      let text = b.text;
      for (const pn of placeNames) {
        if (!text.includes(pn)) continue;
        text = text.split(pn).join(`\u0001${masks.length}\u0002`);
        masks.push(pn);
      }
      text = text.replace(placeLike, (m0) => {
        masks.push(m0);
        return `\u0001${masks.length - 1}\u0002`;
      });
      let inQ = false;
      for (const part of text.split(/(?<!\bMrs?\.)(?<=[.!?][”’]?)\s+/)) {
        sentences.push({ block: i, text: part, quoteAtStart: inQ });
        for (const ch of part) {
          if (ch === '“') inQ = true;
          if (ch === '”') inQ = false;
        }
      }
    }
    // Every mention.
    const occs: Occ[] = [];
    sentences.forEach((s, si) => {
      let inQ = s.quoteAtStart;
      let last = 0;
      for (const m of s.text.matchAll(nameRe)) {
        for (const ch of s.text.slice(last, m.index ?? 0)) {
          if (ch === '“') inQ = true;
          if (ch === '”') inQ = false;
        }
        last = m.index ?? 0;
        const full = m[1] === 'Mrs. ' ? `Mrs. ${m[2]}` : (m[2] as string);
        const w = ws.find((x) => x.name === full) ?? ws.find((x) => x.name === m[2]);
        if (!w) continue;
        occs.push({ s: si, at: m.index ?? 0, len: m[0].length, who: w, title: m[1] ?? '', inQuote: inQ, poss: s.text.slice((m.index ?? 0) + m[0].length).startsWith('’s') });
      }
    });
    // Which to change: everything but the first and the last mention, when there are more than two, and never in speech.
    const byWho = new Map<Who, Occ[]>();
    for (const o of occs) byWho.set(o.who, [...(byWho.get(o.who) ?? []), o]);
    const edits = new Map<number, { at: number; len: number; rep: string }[]>();
    for (const [w, os] of byWho) {
      if (os.length <= 2) continue;
      let kept = os.length;
      // The middle mentions first; the last only when one between is speech and can't change.
      for (const o of [...os.slice(1, -1), ...os.slice(-1)]) {
        if (kept <= 2) break;
        if (o.inQuote || o.title === 'Mr. ') continue;
        const s = sentences[o.s] as Sentence;
        const prev = s.text.slice(0, o.at).trimEnd();
        const after = s.text.slice(o.at + o.len);
        const start = prev === '' || /[“—]$/.test(prev);
        const poss = /^’s\b/.test(after);
        const nextWord = (/^(?:’s)?\s+([^\s,.;]+)/.exec(after)?.[1] ?? '').toLowerCase();
        // A list of names ("Feeney and Ashby", "Feeney, Ashby"), not a clause joined with "and".
        const listy = /\b[A-Z][a-z’]+ and$/.test(prev) || /\b[A-Z][a-z’]+,$/.test(prev) || /^(?:’s)?(, [A-Z]| and [A-Z])/.test(after);
        // "That put Feeney here at ten and Ashby here at eleven": a clause joined by "and", not a list of names.
        const listObject = !listy && /\band$/.test(prev) && /\b(put|had|passed|saw)\b[^.;]*$/.test(prev);
        const subject = !poss && (start || VERB.test(nextWord));
        const object = !poss && !subject && OBJ.test(prev);
        // Clear: named just before (this sentence or the last), and nobody else of that pronoun there.
        // The last mention of anybody of that pronoun before this one, within three sentences, must be them.
        // The subject of this clause can't be "him" in it ("Alfano had him here"): skip it when this is an object.
        const sameClause = (x: Occ) => x.s === o.s && x.at < o.at && !/[,;:—“”]/.test(s.text.slice(x.at + x.len, o.at));
        const objPos = object || (listObject && !subject);
        const before = occs.filter(
          (x) => !x.inQuote && (!x.poss || x.who === w) && ((x.s === o.s && x.at < o.at) || (x.s < o.s && x.s >= o.s - 10)) && x.who.female === w.female && !(objPos && sameClause(x) && x.who !== w),
        );
        const lastSame = before[before.length - 1];
        // Nobody else talking between: a watcher's list between makes "he" his.
        const crossed = lastSame ? sentences.slice(lastSame.s + 1, o.s).some((y) => y.barrier) : true;
        // A speech's own "he said" is always the speaker.
        const attribution = (/”$/.test(prev) || (start && /”$/.test(sentences[o.s - 1]?.text ?? ''))) && /^(said|asked|went|added|told)$/.test(nextWord);
        // A sentence that opens on "he" carries on from the last one's subject: in a run of "X was … Y was …" it can't.
        const prevFirst = occs.find((x) => x.s === o.s - 1 && !x.inQuote && !x.poss && x.who.female === w.female);
        const topicOk = !(start && subject) || o.s === 0 || !prevFirst || prevFirst.who === w || (sentences[o.s - 1]?.text ?? '').trim() === '';
        // Anybody else of that pronoun in the same sentence, before or after, and "him" could be either.
        const sameSentence = occs.some((x) => x.s === o.s && x.who !== w && x.who.female === w.female && !x.inQuote);
        const clear = (lastSame?.who === w && !crossed && topicOk && !sameSentence) || attribution;
        let rep: string | null = null;
        if (clear && !listy) {
          if (poss) rep = w.female ? 'her' : 'his';
          else if (subject) rep = w.female ? 'she' : 'he';
          else if (object) rep = w.female ? 'her' : 'him';
        } else if (clear && listObject && !poss && !subject) rep = w.female ? 'her' : 'him';
        // Two people of one pronoun in a sentence ("She had her at Kowalski’s"): the pronoun would be anybody's.
        const prBefore = w.female ? /\b(she|her|hers|herself)\b/i : /\b(he|him|his|himself)\b/i;
        const prAfter = w.female ? /\bher (at|here|there|in|on|with)\b/ : /\bhim (at|here|there|in|on|with)\b/;
        if (rep !== null && /^(she|he|her|him|his)$/.test(rep) && (prBefore.test(s.text.slice(0, o.at)) || prAfter.test(s.text.slice(o.at + o.len)))) rep = null;
        if (rep === null && w.role && (poss || subject || object || listy)) rep = poss ? `${w.role}’s` : w.role;
        if (rep === null) continue;
        const len = o.len + (poss && rep !== `${w.role}’s` ? '’s'.length : poss ? '’s'.length : 0);
        const list = edits.get(o.s) ?? [];
        list.push({ at: o.at, len, rep: start ? cap(rep) : rep });
        edits.set(o.s, list);
        kept--;
      }
    }
    if (edits.size === 0) continue;
    for (const [si, es] of edits) {
      const s = sentences[si] as Sentence;
      let t = s.text;
      for (const e of [...es].sort((a, b) => b.at - a.at)) t = t.slice(0, e.at) + e.rep + t.slice(e.at + e.len);
      s.text = t;
    }
    // Put the blocks back together.
    for (const i of idxs) {
      if (i < 0) continue;
      const b = blocks[i];
      if (!b || b.kind !== 'prose') continue;
      b.text = sentences
        .filter((s) => s.block === i)
        .map((s) => s.text)
        .join(' ')
        .replace(/\u0001(\d+)\u0002/g, (_m, k: string) => masks[Number(k)] as string);
    }
  }
}

/** "the Prentiss parlour", "Corrigan’s flat": a place called after somebody isn't a mention of them. */
function placeLikeRe(names: string[]): RegExp {
  const alt = names.map((n) => esc(n.replace(/^Mrs\. /, ''))).join('|');
  return new RegExp(`\\b[Tt]he (?:${alt})\\b(?: [a-z]+)?|\\b(?:Mrs\\. )?(?:${alt})’s (?:flat|place|rooms|parlour|door)\\b`, 'g');
}

/** Names said more than twice on a page, outside the exempt blocks, counting speech: for the measure and the tests. */
export function namesOverTwo(c: BoardCase, blocks: Block[], exempt: (b: Block) => boolean): string[] {
  const ps = c.people.filter((p) => !p.object && p.short.length > 2).sort((a, b) => b.short.length - a.short.length);
  const placeNames = c.places.flatMap((p) => [p.name, p.short, cap(p.name), cap(p.short)]).filter(Boolean).sort((a, b) => b.length - a.length);
  const out: string[] = [];
  let count = new Map<string, number>();
  const flush = () => {
    for (const [k, v] of count) if (v > 2) out.push(`${k} ×${v}`);
    count = new Map();
  };
  for (const b of blocks) {
    if (b.kind !== 'prose') continue;
    if (b.voice === 'chapter') {
      flush();
      continue;
    }
    if (exempt(b)) continue;
    let text = b.text;
    for (const pn of placeNames) text = text.split(pn).join(' ');
    text = text.replace(placeLikeRe(ps.map((p) => p.short)), ' ');
    for (const p of ps) {
      const re = new RegExp(`\\b${esc(p.short)}\\b`, 'g');
      const n = (text.match(re) ?? []).length;
      if (n) count.set(p.short, (count.get(p.short) ?? 0) + n);
      text = text.replace(re, ' ');
    }
  }
  flush();
  return out;
}

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}
