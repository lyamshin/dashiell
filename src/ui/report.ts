/** Obra Dinn's form: five dropdowns, and then it is over. */

import type { CaseView } from '../game/derive.js';
import { gameBudget } from '../game/derive.js';
import { shapeOf, type TierKey } from '../game/profile.js';
import { columnFor, fieldsFor, withAnswer } from '../game/report-form.js';
import { clock } from '../gen/types.js';
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

  // M9 §5: from Medium up, where every suspect was at the half hour it
  // happened — the full crime column, scored a cell at a time.
  const column = columnFor(view);
  const columnUi = column.map((spec) => ({ spec, ui: field(spec.label, spec.options) }));
  if (column.length > 0) {
    const set = el('fieldset', { class: 'report-column' });
    const legend = el('legend', { text: 'Where everybody was when it happened' });
    const when = built.find((f) => f.spec.key === 'when');
    const note = el('p', { class: 'note', text: '' });
    const paintNote = (): void => {
      const t = when?.ui.select.value;
      note.textContent =
        t !== undefined && t !== ''
          ? `At ${clock(Number(t) as Parameters<typeof clock>[0])}, by the hour above. One line a person; the DA checks each.`
          : 'At the half hour it happened. One line a person; the DA checks each.';
    };
    when?.ui.select.addEventListener('change', paintNote);
    paintNote();
    set.append(legend, note);
    for (const f of columnUi) set.append(f.ui.wrap);
    form.append(set);
  }

  const submit = el('button', { class: 'open-case', type: 'submit', text: 'File it' });
  form.append(el('div', { class: 'after' }, submit));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let report: Report = { ...EMPTY_REPORT };
    for (const f of built) {
      report = withAnswer(report, f.spec.key, f.ui.select.value || null);
    }
    if (columnUi.length > 0) {
      const col: Record<string, string | null> = {};
      for (const f of columnUi) col[f.spec.personId] = f.ui.select.value || null;
      report = { ...report, column: col };
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
    return [`${done} is cleared, and that is the last of them. **Over easy is open now.**`, shapeOf('over-easy').rule];
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
  // M9 §5: the column, a row a suspect.
  if (verdict.column.length > 0) {
    wrap.append(el('h3', { class: 'verdict-column-head', text: `Where they were at ${verdict.columnTime ?? 'the hour'}` }));
    const col = el('div', { class: 'verdict verdict--column' });
    for (const c of verdict.column) {
      const row = el('div', { class: `verdict-row${c.correct ? '' : ' wrong'}` });
      row.append(
        el('span', {}, c.name),
        el('span', { class: 'given' }, c.correct ? c.given : `${c.given} — it was ${c.truth}`),
        el('span', { class: 'mark', text: c.correct ? '✓' : '✗' }),
      );
      col.append(row);
    }
    wrap.append(col);
  }

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
    // M9 §8: the rule chain that proves each answer, before the whole sheet.
    if (verdict.proofs && verdict.proofs.length > 0) {
      panel.append(el('h3', { text: 'How it could be known' }));
      for (const { label, proof } of verdict.proofs) {
        const block = el('div', { class: 'proof' });
        block.append(
          el('p', { class: 'proof-what' }, el('strong', { text: `${label}. ` }), proof.what,
            ...(proof.hypothesis ? [' It takes trying one answer and seeing it fail.'] : [])),
        );
        const list = el('ol', { class: 'proof-rules' });
        for (const r of proof.rules) list.append(el('li', { text: r }));
        block.append(list);
        panel.append(block);
      }
      panel.append(el('h3', { text: 'The whole sheet' }));
    }
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
