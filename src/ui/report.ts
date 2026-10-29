/** The verdict page: the report scored, the closing, and what the ending can open. */

import { pointsText, starWords, type Verdict } from '../game/board/report.js';
import { TIER_NAMES, type TierIndex } from '../gen/board/types.js';
import { el } from './dom.js';
import { MARK_HALF, MARK_RIGHT, MARK_WRONG, STAMP_RIGHT, STAMP_WRONG, crest, starSvg } from './deco.js';

/**
 * What a filed report did for the player's record, for the closing page (docs/77): it named the right
 * culprit at a tier above any before, so tonight's case moves up to `next` (null past the last).
 */
export interface TierNews {
  done: TierIndex;
  next: TierIndex | null;
}

/** The closing page's word on the tiers, in the book's plain voice. */
export function tierNewsLines(news: TierNews): string[] {
  const done = TIER_NAMES[news.done];
  return news.next === null ? [`${done} is cleared, and that is the last of them.`] : [`${done} is cleared. **${TIER_NAMES[news.next]} is next.**`];
}

/**
 * What the closing page can open, once the verdict is read: the crime told as
 * a story, and the whole truth behind the curtain. Paragraphs for the one;
 * the curtain is asked for only when somebody opens it.
 */
export interface Endings {
  story: string[];
  /** book-look, item 5: the night's actions against the fastest solve, said after the story. */
  fastest?: string[];
  /** curtain (docs/76): the solved board, how it came together, the report against the truth and the lies. */
  curtain: () => HTMLElement;
}

/**
 * A button that shows and hides the panel under it. Either can be open, both
 * can, and a second press closes it again.
 */
function disclosure(id: string, label: string, fill: (panel: HTMLElement) => void): {
  button: HTMLButtonElement;
  panel: HTMLElement;
} {
  const button = el('button', {
    class: 'plain-button ending-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': id,
    text: label,
  });
  const panel = el('section', { id, class: 'ending-panel', hidden: true, 'aria-label': label });
  let filled = false;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    if (open && !filled) {
      fill(panel);
      filled = true;
    }
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
  return { button, panel };
}

/** book-look, item 5: the verdict's plaque: the caption the report went in under, and the case's line. */
export interface VerdictFrame {
  court: string;
  against: string;
  caseLine: string;
}

/**
 * The verdict, as the DA's copy comes back (book-look, item 5): the plaque with the name you charged,
 * typed, and the stamp across its corner ("Case closed" for the right name, "Dismissed" if not); then
 * the ledger, your answers in carbon with a word for each (right, wrong, half), a wrong one struck
 * through and corrected. Everything is there at once; `.ceremony` only animates it.
 */
export function renderVerdict(verdict: Verdict, onAgain: () => void, endings: Endings, news?: TierNews, frame?: VerdictFrame): HTMLElement {
  // book-look, item 2: the verdict is a region of its own; its heading (the running head's "The
  // verdict", `#verdict-title`) takes the focus after closing.
  const wrap = el('section', { class: 'report verdict-page', 'aria-labelledby': 'verdict-title' });
  const who = verdict.fields[0];
  if (frame && who) {
    const plaque = el('div', { class: 'plaque verdict-plaque' });
    plaque.append(crest(), el('p', { class: 'court', text: frame.court }), el('p', { class: 'against', text: frame.against }), el('p', { class: 'typed-name', text: who.answered ? who.given : 'Nobody' }));
    plaque.append(el('p', { class: `stamp${who.correct ? '' : ' stamp--dismissed'}` }, el('span', { class: 'stamp-word', text: who.correct ? STAMP_RIGHT : STAMP_WRONG }), el('span', { class: 'stamp-time', text: '8:00 a.m.' })));
    wrap.append(plaque);
  } else wrap.append(el('h2', { id: 'verdict-title', tabindex: '-1', text: 'The verdict' }));

  const table = el('div', { class: 'verdict ledger' });
  for (const f of verdict.fields) {
    // docs/46 §3: a line asked under an answer (what breaks their story) sits under it, set as a line.
    const state = f.correct ? (f.half ? 'half' : 'right') : 'wrong';
    const row = el('div', { class: `verdict-row verdict-row--${state}${state === 'wrong' ? ' wrong' : state === 'half' ? ' half' : ''}${f.line ? ' verdict-row--line' : ''}` });
    const given = el('span', { class: 'given' }, el('span', { class: 'answer', text: f.given }));
    const correction = !f.correct ? (f.why ?? `it was ${f.truth}`) : f.half ? 'right, but you couldn’t have known' : null;
    if (correction) given.append(el('span', { class: 'correction', text: correction }));
    // (The mark is a word, never ✓, ✗ or ½: the eye and a screen reader read the same thing.)
    row.append(el('span', { class: 'label' }, f.label), given, el('span', { class: 'mark', text: state === 'right' ? MARK_RIGHT : state === 'half' ? MARK_HALF : MARK_WRONG }));
    table.append(row);
  }
  wrap.append(table);

  wrap.append(el('p', { class: 'score', text: verdict.scoreLine ?? `${pointsText(verdict.points)} out of ${verdict.asked}.` }));
  for (const line of verdict.plain) wrap.append(el('p', { class: 'score-plain', text: line }));
  // docs/67: the actions and the hints beside them, and the star a perfect report earns (gold with no
  // hints). The glyph is for the eye; the words beside it say it for a screen reader too.
  wrap.append(el('p', { class: 'score-plain tally', text: verdict.tally }));
  if (verdict.star) {
    wrap.append(el('p', { class: `verdict-star verdict-star--${verdict.star}` }, starSvg(), el('span', { class: 'star-words', text: starWords(verdict.star) })));
  }
  for (const paragraph of verdict.closing) {
    const p = el('p');
    // The only formatting in a closing line is a bold sentence.
    const parts = paragraph.split('**');
    parts.forEach((part, i) => {
      p.append(i % 2 === 1 ? el('strong', { text: part }) : document.createTextNode(part));
    });
    wrap.append(p);
  }

  const lines = news === undefined ? [] : tierNewsLines(news);
  if (lines.length > 0) {
    const box = el('div', { class: 'tier-news', role: 'status' });
    lines.forEach((line, i) => {
      const p = el('p', { class: i === 0 ? 'tier-news-head' : 'tier-rule' });
      line.split('**').forEach((part, j) => {
        p.append(j % 2 === 1 ? el('strong', { text: part }) : document.createTextNode(part));
      });
      box.append(p);
    });
    wrap.append(box);
  }

  // The crime as a story; and the true board, the lies and the path, behind the curtain.
  const story = disclosure('ending-story', 'What really happened', (panel) => {
    panel.classList.add('ending-story');
    // (curtain, docs/76: the verdict's h1 is the running head's, so the endings' heads are h2s and h3s.)
    panel.append(el('h2', { text: 'What really happened' }));
    for (const paragraph of endings.story) panel.append(el('p', { text: paragraph }));
    if (endings.fastest?.length) {
      panel.append(el('h3', { class: 'ending-fastest-head', text: 'The fastest solve' }));
      for (const paragraph of endings.fastest) panel.append(el('p', { class: 'ending-fastest', text: paragraph }));
    }
  });
  const curtain = disclosure('ending-curtain', 'Look behind the curtain', (panel) => {
    panel.classList.add('ending-curtain');
    panel.append(endings.curtain());
  });
  wrap.append(
    el('div', { class: 'endings' }, el('div', { class: 'ending-buttons' }, story.button, curtain.button), story.panel, curtain.panel),
  );

  const again = el('button', { class: 'open-case', type: 'button', text: 'Open another case' });
  again.addEventListener('click', onAgain);
  wrap.append(el('div', { class: 'after' }, again));
  return wrap;
}
