/** Obra Dinn's form: five dropdowns, and then it is over. */

import type { CaseView } from '../game/derive.js';
import { gameBudget } from '../game/derive.js';
import { shapeOf, type TierKey } from '../game/profile.js';
import { fieldsFor, withAnswer } from '../game/report-form.js';
import type { Verdict } from '../game/scoring.js';
import { EMPTY_REPORT, type Report, type RunState } from '../game/types.js';
import { el } from './dom.js';

const UNKNOWN = 'I don’t know';

function field(
  label: string,
  options: { value: string; label: string }[],
): { wrap: HTMLElement; select: HTMLSelectElement } {
  const select = el('select', { name: label });
  select.append(el('option', { value: '' }, UNKNOWN));
  for (const option of options) {
    select.append(el('option', { value: option.value }, option.label));
  }
  const wrap = el('div', { class: 'field' }, el('label', { text: label }), select);
  return { wrap, select };
}

export function renderReportForm(
  view: CaseView,
  state: RunState,
  onFile: (report: Report) => void,
): HTMLElement {
  const kase = view.kase;
  const form = el('form', { class: 'report' });

  form.append(
    el('h2', { text: 'The report' }),
    el('p', {
      class: 'note',
      text:
        state.actionsUsed >= gameBudget(kase)
          ? 'Eight o’clock, and the DA’s man is standing over the desk. Whatever is on the page is what gets filed.'
          : 'Filing is final. Leave a line blank and it goes in as I don’t know.',
    }),
  );

  // M5 §5: exactly `case.act.unknowns`, in the generator's own order, each a
  // dropdown of this case's actual options. What the briefing stated is a
  // given and is not on the form.
  const specs = fieldsFor(view);
  const built = specs.map((spec) => ({ spec, ui: field(spec.label, spec.options) }));
  for (const f of built) form.append(f.ui.wrap);

  const submit = el('button', { class: 'open-case', type: 'submit', text: 'File it' });
  form.append(el('div', { class: 'after' }, submit));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let report: Report = { ...EMPTY_REPORT };
    for (const f of built) {
      report = withAnswer(report, f.spec.key, f.ui.select.value || null);
    }
    onFile(report);
  });

  return form;
}

/** M7: what a filed report did to the ladder, for the closing page. */
export interface TierNews {
  /** The tier the report was filed at. */
  cleared: TierKey;
  /** The first full-credit report at this tier. */
  firstClear: boolean;
  /** The tier it opened, if it opened one. */
  unlocked: TierKey | null;
}

/** The closing page's word on the ladder, in the book's plain voice. */
export function tierNewsLines(news: TierNews): string[] {
  const done = shapeOf(news.cleared).name;
  if (news.unlocked === 'over-easy') {
    return [`${done} is cleared, and that is the book. **Over easy is open now.**`, shapeOf('over-easy').rule];
  }
  if (news.unlocked !== null) {
    const next = shapeOf(news.unlocked);
    return [`${done} is cleared. **${next.name} is open now.**`, next.rule];
  }
  return news.firstClear ? [`${done} is cleared.`] : [];
}

/**
 * What the closing page can open, once the verdict is read: the crime told as
 * a story, and the whole truth sheet behind the curtain. Paragraphs for the
 * one; the sheet is asked for only when somebody opens it.
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

export function renderVerdict(
  verdict: Verdict,
  onAgain: () => void,
  endings: Endings,
  news?: TierNews,
): HTMLElement {
  const wrap = el('div', { class: 'report' });
  wrap.append(el('h2', { text: 'The verdict' }));

  const table = el('div', { class: 'verdict' });
  for (const f of verdict.fields) {
    const row = el('div', { class: `verdict-row${f.correct ? '' : ' wrong'}` });
    row.append(
      el('span', {}, f.label),
      el('span', { class: 'given' }, f.correct ? f.given : `${f.given} — it was ${f.truth}`),
      el('span', { class: 'mark', text: f.correct ? '✓' : '✗' }),
    );
    table.append(row);
  }
  wrap.append(table);

  wrap.append(
    el('p', { class: 'score', text: `${verdict.points} out of ${verdict.asked}.` }),
  );
  for (const paragraph of verdict.closing) {
    const p = el('p');
    // The only formatting in a closing line is the one bold sentence the
    // wrong-man ending is allowed.
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

  // The crime as a story, in the book's own page; and the whole truth sheet,
  // secrets, lies and red herrings included, behind the curtain.
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
