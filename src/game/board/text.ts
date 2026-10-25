/**
 * The board night as plain text: a page, its choices, the notebook. Used by
 * `npm run play` and `npm run read`.
 */

import { titleClient } from './home.js';
import type { OfferedChoice, OfferedGroup, Page } from './types.js';
import { boardGridText } from './grid.js';
import { knownPeople, knownPlaces, lineShown, linesHeld } from './knowledge.js';
import { cap, clientOf, isMurder, nameOf, personOf, placeName, type BoardDeal, type BoardRun } from './model.js';
import { notebookWhen } from './when.js';
import { finderGloss, peopleLine } from './gloss.js';
import { recapClauses } from './pages.js';

const WIDTH = 76;

/** Words filled to `width` columns, a paragraph per line of the input. */
export function wrap(text: string, width = WIDTH, indent = ''): string {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter((w) => w.length > 0)) {
      if (line.length === 0) line = word;
      else if (line.length + 1 + word.length <= width - indent.length) line += ` ${word}`;
      else {
        out.push(indent + line);
        line = word;
      }
    }
    out.push(indent + line);
  }
  return out.join('\n');
}

/**
 * docs/64: everything a player does is an action, the night's one unit (docs/47 A1 called it a
 * "call"). Every question, search, walk and confrontation takes one, so a choice says nothing about
 * its cost unless it's free: "free", or nothing.
 */
export function actionsText(actions: number): string {
  if (actions <= 0) return 'free';
  return actions === 1 ? '1 action' : `${actions} actions`;
}

/** What a button says it costs: "free", or nothing (one action is the rule, docs/64). */
export function costLabel(ch: Pick<OfferedChoice, 'minutes'>): string {
  return ch.minutes > 0 ? '' : 'free';
}

/**
 * docs/64: the key to the choices, the same in the book and the CLI. (docs/67: no "A star marks a
 * good next step": a star is a hint now, and says why where it's given.)
 */
export const ACTION_KEY = 'Everything you do takes one action unless it says free.';

/**
 * Round 5, U1, and docs/64: the people on a page, as the book and the CLI both head them. Picking
 * somebody is free and says so ("free to pick", on the row's label for a screen reader); a person's
 * row counts the questions still open.
 */
export const TALK_HEADING = 'Talk to';

/** docs/64: the turn's divider, where the page used to print "The turn". */
export const TURN_DIVIDER = 'Where things stood';

/** A chapter block as the book and the CLI print it: the turn's heading is a plain divider (docs/64). */
export function chapterShown(text: string): string {
  return /^the turn$/i.test(text.trim()) ? TURN_DIVIDER : text;
}

/**
 * A person's row: how many questions are open to ask them, "1 question", "2 questions", or "nothing
 * left to ask", and whether they can be confronted. Round 6, U4: confronting isn't a question, so the
 * count goes down when one is asked, never up when "Confront" joins the list (two testers). U2: "all
 * asked" was a word nobody would use.
 */
export function questionsText(g: Pick<OfferedGroup, 'choices'>): string {
  const qs = g.choices.filter((c) => !c.command.startsWith('picker'));
  const open = qs.filter((c) => !c.done).length;
  const ask = open === 0 ? 'nothing left to ask' : `${open} ${open === 1 ? 'question' : 'questions'}`;
  return g.choices.some((c) => c.command.startsWith('picker')) ? `${ask} · can confront` : ask;
}

/**
 * Round 6, U2: what the confront row costs to open, the same in the book and the CLI. Opening it is
 * free; the confronting is the action, and the confront screen says so ("free to look" read as
 * whether the confronting was free).
 */
export const PICKER_COST = 'free to open';

/** Round 6, U2: a done question or search: ticked, and free to read again ("free ✓" read as a refund). */
export const DONE_COST = 'free to reread';

export function pageBodyText(page: Page): string {
  const out: string[] = [];
  for (const b of page.blocks) {
    if (b.kind === 'prose') {
      if (b.voice === 'chapter') out.push(`— ${chapterShown(b.text)} —`);
      else out.push(wrap(b.text));
    } else if (b.kind === 'note') out.push(wrap(`(${b.text})`));
  }
  return out.join('\n\n');
}

export function costText(ch: OfferedChoice): string {
  if (ch.done) return DONE_COST;
  if (ch.command.startsWith('picker')) return PICKER_COST;
  return costLabel(ch);
}

/** Every choice, numbered, people first and then their topics, as the book draws them. */
export function choicesText(groups: readonly OfferedGroup[], taken?: string): string {
  const out: string[] = ['WHAT NEXT'];
  let n = 0;
  for (const g of groups) {
    if (g.choices.length === 0) continue;
    out.push(g.kind === 'ask' ? `  ${g.heading}:` : g.heading ? `  ${g.heading}:` : '  Free:');
    for (const ch of [...g.choices, ...(g.more ?? [])]) {
      n++;
      const mark = ch.command === taken ? '>' : ch.lead ? '*' : ' ';
      const cost = costText(ch);
      out.push(`   ${mark}${String(n).padStart(2)}. ${ch.label}${ch.note ? ` (${ch.note})` : ''}${cost ? ` — ${cost}` : ''}${ch.lead && ch.why ? `  [${ch.why}]` : ''}`);
    }
  }
  return out.join('\n');
}

/**
 * What the client said, as the notebook says it, the same in the book and the CLI (round 5: the book
 * printed the office's raw lines, the CLI these). docs/55 7, 8: the widow's title, and "says she says"
 * said once. docs/59 note 9: a poisoning's hour said as the office said it: when he was poisoned, and
 * that he died after. Round 5, U5: a small case's "He went at nine or ten o’clock", after a line about
 * the client, says whose going it was.
 */
export function officeLines(d: BoardDeal): string[] {
  const c = d.kase;
  const office = c.givens.lines ?? c.givens.text.map((t) => ({ kind: 'found' as const, id: 'text', text: t, vars: {} as Record<string, string> }));
  return office.map((g) => {
    let t = notebookWhen(c, g, c.givens.window ?? c.crime.window, clientOf(c).short) ?? g.text;
    // docs/59 note 4: the finder as the office said them ("Mosley, a bus conductor who owed the dead man
    // money and had come round about it"), never the errand that said the debt the other way round.
    const fp = g.kind === 'found' && g.vars?.finder && g.vars.finderWhy ? c.people.find((x) => x.short === g.vars?.finder) : undefined;
    if (fp && g.vars?.finderWhy) t = t.replace(`${g.vars.finder}, ${g.vars.finderWhy}`, `${g.vars.finder}, ${finderGloss(c, fp.id, g.vars.finderWhy)}`);
    // (docs/59: the neighbors' word, as the office says it now, not a woman downstairs nobody meets.)
    t = t.replace(/, on the word of the woman downstairs:/, ', on the neighbors’ word:').replace(/\. The woman downstairs says\b/, '. The neighbors say');
    if (!isMurder(c) && (g.kind === 'window' || g.kind === 'clock') && g.vars?.thing) t = t.replace(/^(?:He|She|It|They) (went|was taken|were taken|disappeared)\b/, `${cap(g.vars.thing)} $1`);
    return titleClient(c, t.replace(/\b(says|say) (she|he) says\b/, '$1 $2 insists'));
  });
}

/** The notebook: the people and places known, and every line held, by whose word. */
export function notebookText(d: BoardDeal, run: BoardRun): string {
  const c = d.kase;
  const out: string[] = ['NOTEBOOK'];
  out.push('');
  out.push('What my client said:');
  for (const t of officeLines(d)) out.push(`  ${wrap(t, 72).replace(/\n/g, '\n  ')}`);
  out.push('');
  out.push('People:');
  for (const p of knownPeople(c, run)) {
    const who = personOf(c, p);
    if (!who || who.role === 'victim') continue;
    // (Round 6, U6: who they are, never where they sat tonight: `peopleLine`, the book's too.)
    out.push(`  ${wrap(`${who.name}: ${peopleLine(c, p)}.`, 72).replace(/\n/g, '\n    ')}`);
  }
  out.push('');
  out.push('Places:');
  for (const [id, why] of knownPlaces(c, run)) out.push(`  ${cap(placeName(c, id))} (${why}).`);
  const lines = linesHeld(c, run).filter((l) => l.kind !== 'given');
  if (lines.length > 0) {
    out.push('');
    out.push('What I was told:');
    for (const l of lines) out.push(`  ${wrap(lineShown(c, run, l), 72).replace(/\n/g, '\n  ')}`);
  }
  const motives = run.asked.filter((q) => q.startsWith('motive:')).map((q) => q.slice(7));
  for (const p of motives) out.push(`  ${nameOf(c, p)}’s reason: ${personOf(c, p)?.motive}.`);
  out.push('');
  out.push('How it adds up:');
  for (const cl of recapClauses(d, run)) out.push(`  ${wrap(cl.text, 72).replace(/\n/g, '\n  ')}`);
  out.push('');
  out.push(boardGridText(c, run));
  return out.join('\n');
}
