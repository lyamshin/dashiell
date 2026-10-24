/**
 * docs/53, the dial: the clarity check, beside the round trip. The plain sentence is the spine: a
 * voiced composite is clear when
 *
 * - every place and hour its propositions name is in its words, as the plain rendering says it: a
 *   place by its name (a person's own home may be "home"), an hour by its word (a run of hours may
 *   be "from eight through ten", the end of the evening "the rest of the evening"). Nothing folded
 *   into "here", "there", "what Coffin had";
 * - no pronoun stands for a place the same sentence doesn't name ("there", with no place before it
 *   in its sentence);
 * - a list is said as somebody's ("Coffin's list"), not "the list", unless its keeper is named in
 *   the same sentence;
 * - none of the oblique tags docs/53 names ("which was what X had", "with X's word under it", "where
 *   I could check it", "on her count", "the part worth keeping").
 *
 * The round trip asks whether the facts can be read back at all; this asks whether a reader skimming
 * the sentence gets them as fast as from the plain one. People may be pronouns: the reference pass
 * owns them (docs/49 §2).
 */

import type { BoardCase } from '../model.js';
import { hourWord, isMurder, personOf, placeName, type Hour } from '../model.js';
import { stripMarks } from '../plan/refer.js';
import { sentencesOf } from '../plan/sentences.js';
import type { Composite, Prop } from './types.js';
import { voicingById, type Args } from './voice.js';
import { engineWords } from '../jargon.js';

/** The oblique tags docs/53 names, and their kin: each makes a reader stop and translate. */
export const OBLIQUE: { name: string; re: RegExp }[] = [
  { name: 'which was what X had', re: /\bwhich was what\b|\bwhat (?!I\b)[A-Z{][^,.;:]*? had\b(?! (?:been|said|told|given|seen|heard|put|written|named))/ },
  { name: 'X’s word under it', re: /\bword under it\b|\bunder it\b[^.]*\bword\b|’s word under\b/ },
  { name: 'where I could check it', re: /\bwhere I could check\b/ },
  { name: 'on her count', re: /\b(?:on|by|as) (?:his|her|their|\{\w+(?::\w+)?\}|[A-Z{][\w’{}:]*’s) count\b/i },
  { name: 'the part worth keeping', re: /\bpart worth keeping\b|\bcame last\b/ },
  { name: 'that was a hole', re: /\bthat was a hole\b/i },
  { name: 'where X kept the pet', re: /\bwhere [A-Z{][^,.;]*? kept\b/ },
];

/** A "there" that points: not "there was", "there were", "there’s", "there had been". */
const POINTING_THERE = /\bthere\b(?! (?:was|were|is|are|had|has|will|would|wasn’t|weren’t|isn’t|aren’t|hadn’t|might|may|must|could|should|seemed|came|went))(?!’s)/i;

/** "the rest of the evening", "all evening": the hours to the evening's end, said without their words. */
const TO_THE_END = /\b(?:throughout|from (?:seven|eight|nine|ten|eleven) on|stayed(?: on)?\b(?! (?:till|until|through|for|at|in|home|with|put))|still here at the end|until the end|rest of (?:the|my) (?:evening|night)|all evening|all night|whole (?:evening|night)|whole of the evening|entire evening|every hour|each hour|start to finish|end of the evening|evening was over|remainder of the evening|till closing|stayed put|there the whole time|the whole time|all the while|as long as I was|(?:start|beginning) of the evening|throughout the evening|first hour to the last|from the time I came on|from the (?:time|moment) I sat down|(?:shut|closed|locked up)\b[^.;]*\bafter that)\b/i;

const WORDS: Record<string, number> = { seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, midnight: 12 };

/** The places and hours a proposition names. */
function placesAndHours(p: Prop): { places: string[]; hours: number[] } {
  const out = { places: [] as string[], hours: [] as number[] };
  const walk = (x: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(x)) {
      if (k === 'k') continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v as Record<string, unknown>);
      else if ((k === 'place' || k === 'via' || k === 'claimed') && typeof v === 'string' && v) out.places.push(v);
      else if ((k === 'hour' || k === 'from') && typeof v === 'number') out.hours.push(v);
      else if (k === 'hours' && Array.isArray(v)) out.hours.push(...(v as number[]));
    }
  };
  walk(p as unknown as Record<string, unknown>);
  return out;
}

/** The hours a sentence says: by word, the hours between two it joins with "through", "till", "to", and the rest of the evening after the last it names. */
function hoursSaid(text: string, all: readonly number[]): Set<number> {
  const out = new Set<number>();
  const said = [...text.toLowerCase().matchAll(/\b(seven|eight|nine|ten|eleven|twelve|midnight)\b/g)].map((m) => WORDS[m[1] as string] as number);
  for (const h of said) out.add(h);
  for (const m of text.toLowerCase().matchAll(/\b(seven|eight|nine|ten|eleven|twelve)(?: o’clock)?,? (?:through|till|until|to|and stayed (?:on )?(?:through|till|until)|and (?:I )?(?:was )?(?:still )?there (?:at|through|till)|right through to)\b[^.;]*?\b(seven|eight|nine|ten|eleven|twelve)\b/g)) {
    const a = WORDS[m[1] as string] as number;
    const b = WORDS[m[2] as string] as number;
    for (let h = a; h <= b; h++) out.add(h);
  }
  for (const m of text.toLowerCase().matchAll(/\bbetween (seven|eight|nine|ten|eleven|twelve)(?: o’clock)? and (seven|eight|nine|ten|eleven|twelve)\b/g)) {
    for (let h = WORDS[m[1] as string] as number; h <= (WORDS[m[2] as string] as number); h++) out.add(h);
  }
  // A span said as "stayed through ten" after "at eight": every hour from the first said to the last.
  if (said.length >= 2 && /\b(?:through|till|until|stayed|still there|remained)\b/i.test(text)) for (let h = Math.min(...said); h <= Math.max(...said); h++) out.add(h);
  // docs/59 item 2: "from the start", told by change: every hour from the evening's first to the last one said.
  if (/\bfrom the (?:start|beginning|first)\b|\bstart of the evening\b|\bat first\b/i.test(text)) for (const h of all) if (h <= (said.length ? Math.max(...said) : Math.max(...all))) out.add(h);
  if (TO_THE_END.test(text)) {
    const from = said.length ? Math.min(...said) : Math.min(...all);
    for (const h of all) if (h >= from) out.add(h);
  }
  return out;
}

/**
 * Whether a voicing is somebody's speech (their answer, their remark, what they said when it was put
 * to them, the client in the office), not the detective's narration. A speaker may leave out the room
 * they're standing in, or their own home, as anybody would ("Ten, Feeney, and nobody else"), and may
 * say "here" for the room they're in; never "there" for a place the sentence hasn't named.
 */
export function isSpeech(v: { shape: string; manner?: string; template: string; requires?: string[] }): boolean {
  const r = v.requires ?? [];
  if (/“/.test(v.template) || v.manner) return true;
  if (r.includes('thought') || r.includes('recap')) return false;
  if (v.shape === 'CLAIM-SPAN' || v.shape === 'LIST-HOUR' || v.shape === 'REMARK') return true;
  if (v.shape === 'HANDOVER') return r.includes('seen') || r.includes('coat');
  if (v.shape === 'REACTION') return r.some((x) => /-said$|^admit$/.test(x));
  return false;
}

/** The people a place is called after ("the Bledsoe flat", "Sokol’s back room"), and whether it's their home. */
function ownersOf(c: BoardCase, id: string): { short: string; home: boolean }[] {
  const name = placeName(c, id);
  return c.people
    .filter((p) => !p.object)
    .filter((p) => {
      const bare = p.short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '');
      return p.home === id || (bare.length > 2 && name.includes(bare));
    })
    .map((p) => ({ short: p.short, home: p.home === id }));
}

/**
 * What's unclear in one voiced composite, by docs/53's rule; empty when it's clear. `speaker`: whose
 * words they are, where they're speech (their own home may go unsaid, or be "home", "my room").
 */
export function clarityOf(c: BoardCase, comp: Composite & { said?: string; args?: Args; voicing?: string }, here?: string, speaker?: string): string[] {
  const v = comp.voicing ? voicingById(comp.voicing) : undefined;
  if (!v || comp.said === undefined) return [];
  const out: string[] = [];
  const said = stripMarks(comp.said);
  const speech = isSpeech(v);
  // The narration: what's outside the quotation marks, or nothing, where all of it is somebody's speech.
  const narr = /“/.test(v.template) ? said.replace(/“[^”]*”/g, ' ') : speech ? '' : said;
  const lower = said.toLowerCase();
  const sents = sentencesOf(said.replace(/[“”]/g, ''));
  // Every place and hour its propositions name, said.
  const ph = comp.props.map(placesAndHours);
  const homes = new Set(comp.props.flatMap((p) => Object.values(p).filter((x): x is string => typeof x === 'string').map((id) => personOf(c, id)?.home).filter((x): x is string => !!x)));
  // (The office's lines are the client's.)
  const who = speaker ?? (comp.shape === 'OFFICE' ? c.client : undefined);
  const owns = new Set([who ? personOf(c, who)?.home : undefined, comp.shape === 'OFFICE' && !isMurder(c) ? c.crime.scene : undefined].filter((x): x is string => !!x));
  for (const id of new Set(ph.flatMap((x) => x.places))) {
    // (The detective may leave out the room I'm standing in, when it isn't pointed at: "The cushion by
    // the radiator was empty." So may a speaker, and their own home.)
    if (id === here) continue;
    if (speech && owns.has(id)) continue;
    const name = placeName(c, id);
    const short = name.replace(/^the /, '').toLowerCase();
    if (lower.includes(short)) continue;
    if (homes.has(id) && /\bhome\b/.test(lower)) continue;
    // A place called after somebody may be said as theirs: "the Bledsoe flat" is "Bledsoe’s"; and
    // somebody's own rooms, with their name in the sentence, "his own rooms" (docs/53: the place, or
    // who lives there).
    const owners = ownersOf(c, id);
    if (owners.some((o) => lower.includes(`${o.short.toLowerCase()}’s`) || new RegExp(`\\b${o.short.replace(/^(?:Mrs\.|Mr\.|Miss|Dr\.) /, '').toLowerCase()}(?:’s)? (?:flat|rooms|place|room)\\b`).test(lower))) continue;
    // (Somebody off the board the place is called after: "Sokol’s back room" is "Sokol’s".)
    const whose = /^(?:the )?((?:[A-Z][\w.]* )?[A-Z][\w]*’s)\b/.exec(name)?.[1];
    if (whose && lower.includes(whose.toLowerCase())) continue;
    if (owners.some((o) => sents.some((s) => s.includes(o.short) && /\b(?:his|her) own\b/i.test(s)))) continue;
    out.push(`the place not said: ${name}`);
  }
  const all = c.board.hours;
  const hs = hoursSaid(said, all);
  // (What was under the coat answers a question about the line before it, which said the hour.)
  const coat = comp.shape === 'HANDOVER' && (v.requires ?? []).includes('coat');
  // (docs/59 item 2: "Nobody else came in" after "…were here all evening": the clause before it in the
  // list said the span, once.)
  // (docs/62, P2: "Nobody else came in till eleven" says every hour before eleven.)
  const spanned = comp.shape === 'LIST-HOUR' && (((comp as { flags?: string[] }).flags ?? []).includes('span') || ((comp as { flags?: string[] }).flags ?? []).includes('till'));
  if (!coat && !spanned) for (const h of new Set(ph.flatMap((x) => x.hours))) if (!hs.has(h)) out.push(`the hour not said: ${hourWord(h as Hour)}`);
  // ("Here was the trouble", "Here’s what I had" point at what follows, not at a place.)
  if (/\bhere\b/i.test(narr.replace(/\bHere(?: was| is|’s)\b/g, ''))) out.push('"here" for a place');
  for (const s of sents) {
    const m = POINTING_THERE.exec(s);
    if (!m) continue;
    const before = s.slice(0, m.index).toLowerCase();
    // (A place the sentence has said, by name, by whose it is or by where in it: "in my medicine cupboard … was there".)
    if (!c.places.some((p) => before.includes(placeName(c, p.id).replace(/^the /, '').toLowerCase())) && !/\bhome\b|\b(?:in|on|at|under|behind|by|over|into) (?:my|the|his|her|a|its)\b|[a-z]’s\b|\bmy (?:room|rooms|place|flat)\b/.test(before)) out.push(`"there" with no place before it`);
  }
  if (/\bthe list\b/.test(narr) && !/’s list\b/.test(narr)) out.push('"the list", not whose');
  // docs/55 2: an account says it was with somebody only where its bones have them with it ("coffee
  // with Sokol" when the bones say alone).
  if (comp.shape === 'CLAIM-SPAN') {
    const company = new Set(comp.props.flatMap((p) => (p.k === 'CLAIM' ? (p.company ?? []) : [])).map((id) => personOf(c, id)?.short ?? id));
    for (const m of said.matchAll(/\bwith ((?:Mrs\.|Mr\.|Miss|Dr\.) )?([A-Z][\w’]+)/g)) {
      const n = `${m[1] ?? ''}${m[2] ?? ''}`;
      if (company.has(n)) continue;
      if (c.places.some((p) => placeName(c, p.id).includes(m[2] as string))) continue;
      out.push(`company not in the bones: ${n}`);
    }
  }
  for (const o of OBLIQUE) if (o.re.test(narr || said)) out.push(`oblique: ${o.name}`);
  // docs/53, addendum: no engine words in the narration ("Coffin’s list", "the hour that mattered",
  // "and nobody else"), and none of the board-speak in anybody's mouth either.
  for (const h of engineWords(speech && !/“/.test(v.template) ? `“${said}”` : said)) out.push(`engine word${h.speech ? ' (speech)' : ''}: ${h.name}: “${h.match}”`);
  return out;
}

/** The template's own oblique tags (for the voicings' lint), narration only. */
export function obliqueIn(template: string): string[] {
  const narr = template.replace(/“[^”]*”/g, ' ');
  return OBLIQUE.filter((o) => o.re.test(narr)).map((o) => o.name);
}
