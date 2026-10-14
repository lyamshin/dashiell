/**
 * docs/49 §2, reference: what a person is called is decided by what the
 * sentences before were about (centering), not by a count.
 *
 * - The first mention on a page is the name (with the honorific the case
 *   gives: "Mrs. Cheatham", "Dr. Hirsch").
 * - Somebody the page has just been about, with nobody else in between, is a
 *   pronoun: "I asked him to tell me his evening. He took a moment…".
 * - After somebody else has come in between, the name again, or the role
 *   when there's only one of it ("the house manager", "my client", "the dead
 *   man"), and the role or a pronoun once the name has been said twice: the
 *   designer's cap, a name at most twice a page outside quotes and lists.
 * - Never a pronoun with two people of its sex named before it in the
 *   narration of its own sentence, or, when its own sentence names nobody, of
 *   the two narration sentences before (`measure.ts` counts the same); and
 *   never one that would be read as somebody else. A pronoun that would be is
 *   said as the name, or the role.
 *
 * The engine marks the pronouns it writes with whom they mean (`markPronoun`);
 * a card's pronouns mean the one person of that sex it was dealt about.
 * Speech is never rewritten, and it is somebody else talking: the people it
 * names are theirs, not the narration's, so they neither stand in a pronoun's
 * way nor take the page's attention from whoever it was about ("I sat down
 * near Abramowitz. “Coffin has you at the Thalia at nine.” He didn't seem to
 * mind being asked."). A watcher's list, a person's own account and the
 * notebook said aloud have to name people: their names neither change nor
 * count toward the cap.
 */

import { pronOf, type BoardCase } from '../model.js';
import type { Item } from './types.js';
import type { PlanCtx } from './index.js';
import { sentencesOf } from './sentences.js';
import { clauseHead, herIsObject, indefiniteFor, maskPlaces, narrationOf, opensOnRole } from './measure.js';

/** The engine's mark on a pronoun it wrote: whom it means, by their place in the case's people. */
export function markPronoun(c: BoardCase, id: string): string {
  const i = c.people.findIndex((p) => p.id === id);
  return i < 0 ? '' : `⁣${i}⁤`;
}

const MARKS = /⁣\d+⁤/g;

/** The words a player reads: the marks taken out. */
export function stripMarks(text: string): string {
  return text.replace(MARKS, '');
}

interface Who {
  idx: number;
  id: string;
  short: string;
  female: boolean;
  role?: string;
}

type Form = 'subj' | 'obj' | 'poss' | 'unknown';

interface Mention {
  who: Who;
  at: number;
  len: number;
  kind: 'name' | 'pronoun' | 'speech' | 'role';
  form: Form;
  listy: boolean;
  /** "Mr. " in front of the name, as a list says it: left alone. */
  titled: boolean;
  /** What it becomes, when the planner changes it. */
  rep?: string;
  /** A pronoun before it in its sentence hangs on it: the name, not the role. */
  wantName?: boolean;
}

interface Sent {
  item: number;
  text: string;
  narr: string;
  mentions: Mention[];
  /** People named in its narration, as decided so far, with where. */
  named: { who: Who; at: number }[];
}

const VERB = /^(was|were|had|has|hadn’t|wasn’t|didn’t|did|does|doesn’t|would|wouldn’t|could|couldn’t|said|says|asked|told|tells|thought|minded|took|takes|kept|keeps|stood|stands|sat|sits|answered|answers|looked|looks|went|goes|came|comes|saw|sees|heard|never|put|passed|seemed|watched|nodded|shrugged|let|gave|made|counted|started|turned|knew|owned|named|wanted|got|gets|needed|found|lifted|isn’t|is|might|must|will|won’t|shut|opened|moved|left|stayed|held|meant|liked|lit|tore|smoothed|lowered|raised|folded|unfolded|leaned|waited|reached|picked|stopped|closed|hasn’t|owed|lodged|minded|borrowed|swore|pointed|heard|still|already|always|only|also)$/;
const OBJ = /\b(to|at|with|for|by|from|of|asked|told|thanked|had|put|passed|saw|over|beside|near|behind|let|gave|watched|named|left|caught|found|about|after|against|than|wanted|met|made|kept|on|offered|pointed|showed|followed|joined|sent|minded|across from|next to)\s*$/;

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cap(s: string): string {
  return s ? (s[0] as string).toUpperCase() + s.slice(1) : s;
}

/** "the house manager", "my client", "the dead man": a role clear enough to stand for a name. */
export function roleOf(c: BoardCase, id: string): string | undefined {
  const p = c.people.find((x) => x.id === id);
  if (!p) return undefined;
  if (p.role === 'client') return 'my client';
  if (p.role === 'victim' && c.type === 'murder') return p.female ? 'the dead woman' : 'the dead man';
  if ((c.variant === 'face' || c.variant === 'pair') && p.role === 'suspect' && p.look) return `the ${p.female ? 'woman' : 'man'} ${p.look}`;
  // A suspect's trade, when nobody else in the case has it: "the dentist", "the milliner" (the
  // office's aside and the notebook give everybody's).
  if (p.role === 'suspect' && p.job && c.people.filter((x) => x.job === p.job).length === 1) return `the ${p.job.replace(/^(?:a|an|the) /, '')}`;
  if (p.role === 'watcher') {
    const j = p.description.split(/,| at /)[0]?.trim();
    return j && /^the /.test(j) ? j : undefined;
  }
  if (p.role === 'company' && /^a neighbou?r\b/.test(p.description)) return 'the neighbor';
  return undefined;
}

function peopleOf(c: BoardCase, text: string): Who[] {
  const ws: Who[] = [];
  c.people.forEach((p, idx) => {
    if (p.short.length <= 2) return;
    if (p.object && c.type !== 'lost-pet') return;
    const role = roleOf(c, p.id);
    ws.push({ idx, id: p.id, short: p.short, female: pronOf(c, p.id).he === 'she', ...(role ? { role } : {}) });
  });
  // A role two people on the page share stands for neither ("the usher" at the Orpheum is
  // Obermann, when the Palace's usher isn't on the page).
  const n = new Map<string, number>();
  for (const w of ws) if (w.role && text.includes(w.short)) n.set(w.role, (n.get(w.role) ?? 0) + 1);
  for (const w of ws) if (w.role && (n.get(w.role) ?? 0) > 1) delete w.role;
  return ws;
}

const PRON = /\b(he|him|his|himself|she|her|hers|herself)\b(⁣(\d+)⁤)?/gi;

function pronounWord(w: Who, form: Form): string {
  if (form === 'subj') return w.female ? 'she' : 'he';
  if (form === 'obj') return w.female ? 'her' : 'him';
  return w.female ? 'her' : 'his';
}

/**
 * Plan what everybody is called in one section of a page (the page, or the
 * turn's chapter), in place.
 */
export function refer(paras: Item[][], ctx: PlanCtx): { item: Item; who: string }[] {
  const c = ctx.c;
  const ws = peopleOf(c, paras.flat().map((x) => x.text).join(' '));
  const breaks: { item: Item; who: string }[] = [];
  if (ws.length === 0) return breaks;
  const byIdx = new Map(ws.map((w) => [w.idx, w]));
  const nameRe = new RegExp(`(Mr\\. )?\\b(${ws.map((x) => esc(x.short)).sort((a, b) => b.length - a.length).join('|')})\\b`, 'g');
  const items = paras.flat();
  // Sentences, the quotation carried through a paragraph, and the narration of each.
  const sents: Sent[] = [];
  for (const para of paras) {
    let inQ = false;
    for (const it of para) {
      const i = items.indexOf(it);
      for (const s of sentencesOf(it.text)) {
        sents.push({ item: i, text: s, narr: narrationOf(s, inQ), mentions: [], named: [] });
        for (const ch of s) {
          if (ch === '“') inQ = true;
          if (ch === '”') inQ = false;
        }
      }
    }
  }
  // Every mention: names in the narration, names in speech (they count toward the cap, and
  // nothing else), the pronouns whose referent is known, and a role the engine marked.
  for (const s of sents) {
    const it = items[s.item] as Item;
    const m = maskPlaces(c, s.narr);
    for (const x of m.matchAll(nameRe)) {
      const w = ws.find((y) => y.short === x[2]);
      if (!w) continue;
      const at = (x.index ?? 0) + (x[1] ?? '').length;
      const prev = s.text.slice(0, x.index ?? 0).trimEnd();
      const after = s.text.slice(at + w.short.length);
      const poss = /^’s\b/.test(after);
      const nextWord = (/^(?:’s)?\s+([^\s,.;:]+)/.exec(after)?.[1] ?? '').toLowerCase();
      const start = prev === '' || /[“—]$/.test(prev);
      // After a preposition it's an object ("brought it to Carbone had been…" is no subject), whatever follows.
      const form: Form = poss ? 'poss' : OBJ.test(prev) && !start ? 'obj' : start || VERB.test(nextWord) ? 'subj' : 'unknown';
      const listy = /\b[A-Z][\w’.]+ and$/.test(prev) || /\b[A-Z][\w’.]+,$/.test(prev) || /^(?:’s)?(?:, [A-Z]| and [A-Z]|, and [A-Z])/.test(after) || /\bboth$/.test(prev);
      s.mentions.push({ who: w, at, len: w.short.length + (poss ? 2 : 0), kind: 'name', form, listy, titled: !!x[1] });
    }
    // Speech: the names said in it, for the cap.
    const speech = maskPlaces(c, s.text.split('').map((ch, i) => (s.narr[i] === ' ' && ch !== ' ' ? ch : ' ')).join(''));
    for (const x of speech.matchAll(nameRe)) {
      const w = ws.find((y) => y.short === x[2]);
      if (w) s.mentions.push({ who: w, at: (x.index ?? 0) + (x[1] ?? '').length, len: w.short.length, kind: 'speech', form: 'unknown', listy: false, titled: !!x[1] });
    }
    for (const x of s.narr.matchAll(PRON)) {
      const word = (x[1] as string).toLowerCase();
      if (word === 'himself' || word === 'herself' || word === 'hers') continue;
      const female = word === 'she' || word === 'her';
      const at = x.index ?? 0;
      let who: Who | undefined;
      if (x[3] !== undefined) who = byIdx.get(Number(x[3]));
      else if (indefiniteFor(s.narr.slice(0, at), female) && !s.mentions.some((y) => y.kind === 'name' && y.at < at && y.who.female === female)) continue;
      else {
        // A card's pronoun is the one person of that sex it was dealt about. (A fact the engine wrote marks
        // its own; one about several people, unmarked, could mean any of them, or nobody in it.)
        const of = [...new Set((it.kind === 'gap' || (it.about ?? []).length === 1 ? (it.about ?? []) : []).map((id) => ws.find((y) => y.id === id)).filter((y): y is Who => !!y && y.female === female))];
        if (of.length === 1) who = of[0];
      }
      if (!who || who.female !== female) continue;
      const form: Form = word === 'he' || word === 'she' ? 'subj' : word === 'him' ? 'obj' : word === 'his' ? 'poss' : herIsObject(s.narr.slice(at + word.length), s.narr.slice(0, at)) ? 'obj' : 'poss';
      s.mentions.push({ who, at, len: (x[0] as string).length, kind: 'pronoun', form, listy: false, titled: false });
    }
    // A role the engine marked ("my witness"): somebody the narration is about, without a name.
    for (const x of s.narr.matchAll(/(?<!\b(?:he|him|his|she|her))⁣(\d+)⁤/gi)) {
      const who = byIdx.get(Number(x[1]));
      if (who) s.mentions.push({ who, at: x.index ?? 0, len: 0, kind: 'role', form: 'unknown', listy: false, titled: false });
    }
    // "The body", on a murder, is the dead man: "found the body in his own flat".
    const dead = c.type === 'murder' ? ws.find((y) => y.id === c.crime.victim) : undefined;
    if (dead) for (const x of s.narr.matchAll(/\bthe body\b/g)) s.mentions.push({ who: dead, at: x.index ?? 0, len: 0, kind: 'role', form: 'unknown', listy: false, titled: false });
    s.mentions.sort((a, b) => a.at - b.at);
  }

  // Decide, sentence by sentence, mention by mention.
  const count = new Map<number, number>();
  const introduced = new Set<number>();
  /** The people of each sex the narration has mentioned, latest last: the chain a nameless pronoun follows. */
  const chain = new Map<boolean, Who[]>();
  /** When each sex's last mention was, in narration sentences. */
  const lastAtOf = new Map<boolean, number>();
  /** Narration sentences so far: the one before is a pronoun's window. */
  const narrIdx: number[] = [];

  /**
   * A sentence in the room that opens on somebody by their job and names nobody of that sex ("The
   * barman counts the glasses onto a towel at closing…"): a pronoun after it is read as theirs. (Not
   * a hand-off's "The janitor at the flats would know who’d been in": he isn't here.)
   */
  const roleOpens = (x: Sent, female: boolean): boolean =>
    (items[x.item] as Item).slot !== 'hand-off' && opensOnRole(x.narr, female) && !x.mentions.some((m) => m.kind !== 'speech' && m.who.female === female);
  /** Names a pronoun before them hangs on ("From her post Mrs. Rafferty…"): they stay names. */
  const anchors = new Set<Mention>();
  /** Would a pronoun for `w` at `at` in sentence `si` be read as `w`, and as nobody else? */
  const resolves = (si: number, at: number, w: Who, form: Form, written = false): boolean => {
    const s = sents[si] as Sent;
    // Who its own sentence has already put before it: by name, or by a role the engine marked ("my witness").
    const local = new Set([...s.named, ...s.mentions.filter((m) => m.kind === 'role').map((m) => ({ who: m.who, at: m.at }))].filter((n) => n.at < at && n.who.female === w.female).map((n) => n.who));
    if (form === 'obj') {
      const head = clauseHead(s.narr, s.named.map((n) => ({ id: n.who.id, at: n.at })), at);
      const hw = ws.find((y) => y.id === head);
      if (hw) {
        // "Hauck passed Hauck" would want "herself"; a pronoun the writer put there ("Margolis turned her back") is the writer's.
        if (hw === w) return written;
        local.delete(hw);
      }
    }
    // Just after somebody said without a name, a role or "the body", a few words before it: theirs
    // ("found the body in his own flat").
    const near = [...s.named.map((n) => ({ who: n.who, at: n.at, role: false })), ...s.mentions.filter((m) => m.kind === 'role').map((m) => ({ who: m.who, at: m.at, role: true }))]
      .filter((n) => n.at < at && n.who.female === w.female)
      .sort((a, b) => b.at - a.at)[0];
    if (near && near.role && near.who === w && s.narr.slice(near.at, at).split(/\s+/).length <= 5) return true;
    if (local.size >= 2) return false;
    if (local.size === 1) return local.has(w);
    const backward = (): boolean => {
      // The sentence before opened on somebody by their job, without a name, and named nobody of
      // that sex: a pronoun now is read as theirs ("The barman counts the glasses onto a towel at
      // closing… He had a little black notebook" was Doyle's look).
      const before = narrIdx.length ? (sents[narrIdx[narrIdx.length - 1] as number] as Sent) : undefined;
      if (before && roleOpens(before, w.female)) return false;
      const win = new Set<Who>();
      for (const k of narrIdx.slice(-1)) for (const n of (sents[k] as Sent).named) if (n.who.female === w.female) win.add(n.who);
      if (win.size >= 2) return false;
      // The sentence before kept them as a pronoun, and nobody else of that sex: the pronoun goes on
      // ("Doyle had her at the flat at eight, with Mrs. Krantz. … the last I saw of her."). A name
      // said in passing doesn't take the page from whoever it's been about.
      const prev = narrIdx.length ? (sents[narrIdx[narrIdx.length - 1] as number] as Sent) : undefined;
      const chained = [...new Set((prev?.mentions ?? []).filter((m) => m.kind === 'pronoun' && m.rep === undefined && m.who.female === w.female).map((m) => m.who))];
      if (chained.length === 1 && !(prev?.named ?? []).some((n) => n.who === w)) return chained[0] === w;
      if (win.size === 1) return win.has(w);
      // Nobody of that sex named near it: it's whoever of that sex the page last spoke of (never the
      // subject of its own clause, when it's an object).
      const head = form === 'obj' ? ws.find((y) => y.id === clauseHead(s.narr, s.named.map((n) => ({ id: n.who.id, at: n.at })), at)) : undefined;
      const prior = (chain.get(w.female) ?? []).filter((y) => y !== head);
      return prior[prior.length - 1] === w;
    };
    if (backward()) return true;
    // A pronoun the writer put before its name, in a sentence that names nobody else of that sex,
    // with nothing before it to be read as: "From her post Mrs. Rafferty could see the stairs." (One
    // that reads back to them already, "I didn’t waste Fishel’s time. He looked like somebody who
    // kept count of it, and Fishel had a fedora…", hangs on nothing after it.)
    if (written) {
      const after = new Set(s.mentions.filter((m) => m.kind === 'name' && m.at > at && m.who.female === w.female).map((m) => m.who));
      if (after.size === 1 && after.has(w)) {
        // The name it hangs on stays a name.
        for (const m of s.mentions) if (m.kind === 'name' && m.at > at && m.who === w) anchors.add(m);
        return true;
      }
    }
    return false;
  };
  /**
   * Nobody else of `w`'s sex for a pronoun at `at` to be read as, by the measure's window: named
   * before it in its sentence, or in the sentence before, or a job without a name opening that one.
   */
  const unclaimed = (s: Sent, at: number, w: Who): boolean => {
    if (s.named.some((n) => n.at < at && n.who.female === w.female && n.who !== w)) return false;
    const prev = narrIdx.length ? (sents[narrIdx[narrIdx.length - 1] as number] as Sent) : undefined;
    if ((prev?.named ?? []).some((n) => n.who.female === w.female && n.who !== w)) return false;
    return !(prev && roleOpens(prev, w.female));
  };
  /** Two people of one sex as pronouns in one sentence ("She had her at Kowalski’s") read as anybody's. */
  const otherPronoun = (s: Sent, w: Who): boolean =>
    s.mentions.some((m) => m.who !== w && m.who.female === w.female && (m.kind === 'pronoun' ? m.rep === undefined || /^(he|him|his|she|her)$/i.test(m.rep) : /^(he|him|his|she|her)$/i.test(m.rep ?? '')));
  const roleFor = (w: Who, form: Form) => (form === 'poss' ? `${w.role}’s` : (w.role as string));
  // What the thought names that an earlier page named too, besides a given person.
  const thoughtText = items.filter((x) => x.kind === 'fact' && x.voice === 'thought').map((x) => x.text).join(' ');
  const earlier = ctx.earlier ?? '';
  const ties = [...c.people.map((p) => p.short), ...c.places.flatMap((p) => [p.short, p.street])].filter((n) => n.length >= 3 && thoughtText.includes(n) && earlier.includes(n));
  const tiedElsewhere = (w: Who): boolean => ties.some((n) => n !== w.short);
  // A name the thought keeps for its tie is held back for it: before the thought, the cap comes one
  // mention sooner (docs/39's first and last, where the last is the one that does the work).
  const thoughtItems = new Set(items.filter((x) => x.kind === 'fact' && x.voice === 'thought'));
  const reserved = new Set<number>();
  for (const s of sents) {
    // (At Hard-boiled the thought stays on its own page, docs/46: it ties back to nothing, so holds back nothing.)
    if (!thoughtItems.has(items[s.item] as Item) || ctx.level === 'fact') continue;
    for (const m of s.mentions) if (m.kind === 'name' && earlier.includes(m.who.short) && !tiedElsewhere(m.who)) reserved.add(m.who.idx);
  }
  let inThought = false;
  // Names still to come that nothing can change (said in a quotation, in a hand-off, "Mr." on a
  // list): the cap counts them before they come.
  const fixed = (it: Item, m: Mention) => !it.exempt && (m.kind === 'speech' || (m.kind === 'name' && (m.titled || !!it.keepNames || !!it.speech)));
  const ahead = new Map<number, number>();
  for (const s of sents) for (const m of s.mentions) if (fixed(items[s.item] as Item, m)) ahead.set(m.who.idx, (ahead.get(m.who.idx) ?? 0) + 1);

  sents.forEach((s, si) => {
    inThought = thoughtItems.has(items[s.item] as Item);
    const it = items[s.item] as Item;
    const frozen = !!it.exempt;
    const here = narrIdx.length;
    for (const m of s.mentions) {
      const w = m.who;
      const note = (asName: boolean) => {
        if (asName) s.named.push({ who: w, at: m.at });
        chain.set(w.female, [...(chain.get(w.female) ?? []), w]);
        lastAtOf.set(w.female, here);
      };
      if (fixed(it, m)) ahead.set(w.idx, (ahead.get(w.idx) ?? 1) - 1);
      const n = count.get(w.idx) ?? 0;
      // The cap, sooner for somebody named later where nothing can change it, or whom the thought
      // will want by name.
      const later = (ahead.get(w.idx) ?? 0) + (!inThought && reserved.has(w.idx) ? 1 : 0);
      const pressed = n + later >= 2;
      if (m.kind === 'speech') {
        // Said in a quotation, a name counts toward the cap, and the reader has met it.
        if (!frozen) count.set(w.idx, n + 1);
        introduced.add(w.idx);
        continue;
      }
      if (m.kind === 'role') {
        note(false);
        continue;
      }
      if (m.kind === 'name') {
        if (frozen || m.titled || it.speech) {
          note(true);
          if (!frozen) count.set(w.idx, n + 1);
          introduced.add(w.idx);
          continue;
        }
        // Who the narration was about a sentence or two ago, with nobody else in between: "Mrs. Krantz
        // had a table near the bandstand. Russo sat on the bench. Wojcik’s list had her…" has Russo
        // in between.
        const last = lastAtOf.get(w.female) ?? -10;
        const between = narrIdx.slice(Math.max(0, last + 1)).some((k) => (sents[k] as Sent).mentions.some((x) => x.kind !== 'speech' && x.who !== w));
        const recent = (chain.get(w.female) ?? []).slice(-1)[0] === w && here - last <= 2 && !between;
        const canPron = introduced.has(w.idx) && !anchors.has(m) && !it.keepNames && !m.listy && m.form !== 'unknown' && !otherPronoun(s, w) && resolves(si, m.at, w, m.form);
        // The thought ties back by name (docs/44): when nothing else in it names somebody or somewhere
        // from an earlier page, a name there turns to a pronoun only when the cap asks it to.
        const link = it.kind === 'fact' && it.voice === 'thought' && !tiedElsewhere(w);
        if (canPron && ((recent && !link) || pressed)) {
          m.rep = pronounWord(w, m.form);
          note(false);
          continue;
        }
        if (pressed && introduced.has(w.idx) && w.role && !m.listy) {
          m.rep = roleFor(w, m.form);
          note(false);
          continue;
        }
        introduced.add(w.idx);
        count.set(w.idx, n + 1);
        if (n >= 2) breaks.push({ item: it, who: w.id });
        note(true);
        continue;
      }
      // A pronoun: kept when it's read as whom it means; otherwise the name, or the role.
      if (it.speech || (resolves(si, m.at, w, m.form, true) && !otherPronoun(s, w))) {
        note(false);
        continue;
      }
      // Theirs again later in the sentence, and nobody else of that sex in it: this one waits for the
      // name the last one becomes ("…under her breath, with one eye open: that was the last I saw of
      // Mrs. Rafferty").
      const last = s.mentions.find((x) => x !== m && x.kind === 'pronoun' && x.who === w && x.at > m.at && /: that was the last I saw of (?:him|her)⁣?\d*⁤?\.$/.test(s.narr.slice(0, x.at + x.len + 1)));
      if (!frozen && last && !s.mentions.some((x) => x.who !== w && x.who.female === w.female && x.kind !== 'speech')) {
        last.wantName = true;
        continue;
      }
      // (The role as soon as the cap is pressed, counting the names still to come: "who heard the dead
      // man’s radio", when the client will name him again. A role that would read as a place, "Mrs.
      // Rafferty’s", is better than the name.)
      const placeLike = m.form === 'poss' && c.places.some((pl) => `${w.short}’s`.endsWith(pl.short));
      if (!m.wantName && (n >= 2 || (pressed && introduced.has(w.idx)) || placeLike) && w.role && !frozen) {
        m.rep = roleFor(w, m.form);
        note(false);
      } else if (n >= 2 && !frozen && it.kind === 'gap' && it.slot === 'close' && unclaimed(s, m.at, w)) {
        // The page's last line, about whom the page is about, where the name would be a third time
        // and nobody else of that sex is near enough to take the pronoun: it stays ("Counting out
        // change for a horse she likes: that was the last I saw of her.").
        note(false);
      } else {
        m.rep = m.form === 'poss' ? `${w.short}’s` : w.short;
        if (!frozen) count.set(w.idx, n + 1);
        if (!frozen && n >= 2) breaks.push({ item: it, who: w.id });
        introduced.add(w.idx);
        note(true);
      }
    }
    if (/[A-Za-z]/.test(s.narr)) narrIdx.push(si);
  });

  // Write the decisions back, sentence by sentence, and the sentences back into their items.
  const texts = new Map<number, string[]>();
  const write = (s: Sent, ms: Mention[]): string => {
    let t = s.text;
    for (const m of [...ms].sort((a, b) => b.at - a.at)) {
      const before = t.slice(0, m.at);
      const start = m.at === 0 || /[“—]\s*$/.test(before);
      const rep = start ? cap(m.rep as string) : (m.rep as string);
      let after = t.slice(m.at + m.len);
      // A pronoun's contraction said out with a name: "he’d let" is "Dandridge had let", "she’ll" is "Ruth will".
      if (m.kind === 'pronoun' && !/^(?:he|him|his|she|her)$/i.test(rep)) {
        after = after
          .replace(/^’d (been|had|let|got|gone|done|seen|known|come|made|put|left|kept|told|said|found|heard|taken|given|\w+ed)\b/, ' had $1')
          .replace(/^’d\b/, ' would')
          .replace(/^’ll\b/, ' will')
          .replace(/^’s (been)\b/, ' has $1')
          .replace(/^’s\b/, ' was');
      }
      t = before + rep + after;
    }
    return t;
  };
  for (const s of sents) {
    let t = write(s, s.mentions.filter((x) => x.rep !== undefined));
    // A name turned "he" can make a sentence said word for word on an earlier page: keep the name.
    if (ctx.said?.has(stripMarks(t).trim())) t = write(s, s.mentions.filter((x) => x.rep !== undefined && x.kind !== 'name'));
    texts.set(s.item, [...(texts.get(s.item) ?? []), t]);
  }
  items.forEach((it, i) => {
    const ts = texts.get(i);
    if (ts) it.text = ts.join(' ');
  });
  return breaks;
}
