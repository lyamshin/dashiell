/** The verdict page: the report scored, the closing, and what the ending can open. */

import { pointsText, type Verdict } from '../game/board/report.js';
import { TIER_NAMES, type TierIndex } from '../gen/board/types.js';
import { el } from './dom.js';

/** What a filed report did for the player's record, for the closing page. */
export interface TierNews {
  /** The tier the report was filed at. */
  cleared: TierIndex;
  /** The first full-credit report at this tier. */
  firstClear: boolean;
}

/** The closing page's word on the tiers, in the book's plain voice. */
export function tierNewsLines(news: TierNews): string[] {
  if (!news.firstClear) return [];
  const done = TIER_NAMES[news.cleared];
  const next = TIER_NAMES[news.cleared + 1];
  return next === undefined ? [`${done} is cleared, and that is the last of them.`] : [`${done} is cleared. **${next} is next.**`];
}

/**
 * What the closing page can open, once the verdict is read: the crime told as
 * a story, and the whole truth behind the curtain. Paragraphs for the one;
 * the curtain is asked for only when somebody opens it.
 */
export interface Endings {
  story: string[];
  truthSheet: () => string;
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

export function renderVerdict(verdict: Verdict, onAgain: () => void, endings: Endings, news?: TierNews): HTMLElement {
  const wrap = el('div', { class: 'report' });
  wrap.append(el('h2', { text: 'The verdict' }));

  const table = el('div', { class: 'verdict' });
  for (const f of verdict.fields) {
    // docs/46 §3: a line asked under an answer (what breaks their story) sits under it, set as a line.
    const row = el('div', { class: `verdict-row${f.correct ? (f.half ? ' half' : '') : ' wrong'}${f.line ? ' verdict-row--line' : ''}` });
    row.append(
      el('span', { class: 'label' }, f.label),
      el('span', { class: 'given' }, f.correct ? (f.half ? `${f.given} — right, but you couldn’t have known` : f.given) : `${f.given} — it was ${f.truth}`),
      el('span', { class: 'mark', text: f.correct ? (f.half ? '½' : '✓') : '✗' }),
    );
    table.append(row);
  }
  wrap.append(table);

  wrap.append(el('p', { class: 'score', text: verdict.scoreLine ?? `${pointsText(verdict.points)} out of ${verdict.asked}.` }));
  for (const line of verdict.plain) wrap.append(el('p', { class: 'score-plain', text: line }));
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
    panel.append(el('h3', { text: 'What really happened' }));
    for (const paragraph of endings.story) panel.append(el('p', { text: paragraph }));
  });
  const curtain = disclosure('ending-curtain', 'Look behind the curtain', (panel) => {
    panel.classList.add('ending-curtain');
    panel.append(el('pre', { text: endings.truthSheet() }));
  });
  wrap.append(
    el('div', { class: 'endings' }, el('div', { class: 'ending-buttons' }, story.button, curtain.button), story.panel, curtain.panel),
  );

  const again = el('button', { class: 'open-case', type: 'button', text: 'Open another case' });
  again.addEventListener('click', onAgain);
  wrap.append(el('div', { class: 'after' }, again));
  return wrap;
}
