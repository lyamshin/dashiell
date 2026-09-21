/** Obra Dinn's form: five dropdowns, and then it is over. */

import type { CaseView } from '../game/derive.js';
import { METHOD_POOL, MOTIVE_POOL } from '../game/derive.js';
import { TICK_OPTIONS } from '../game/reducer.js';
import type { Verdict } from '../game/scoring.js';
import type { Report, RunState } from '../game/types.js';
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
        state.actionsUsed >= kase.budget
          ? 'Eight o’clock, and the DA’s man is standing over the desk. Whatever is on the page is what gets filed.'
          : 'Filing is final. Leave a line blank and it goes in as I don’t know.',
    }),
  );

  const who = field(
    'Who killed the victim',
    kase.people
      .filter((p) => p.kind === 'suspect')
      .map((p) => ({ value: p.id, label: `${p.name} — ${p.role}` })),
  );
  const how = field(
    'How',
    METHOD_POOL.map((m) => ({ value: m.id, label: m.name })),
  );
  const why = field(
    'Why',
    MOTIVE_POOL.map((m) => ({ value: m.type, label: `${m.type} — ${m.description}` })),
  );
  const when = field(
    'When',
    TICK_OPTIONS.map((t) => ({ value: String(t.tick), label: t.label })),
  );
  const where = field(
    'Where',
    kase.places.map((p) => ({ value: p.id, label: p.name })),
  );

  for (const f of [who, how, why, when, where]) form.append(f.wrap);

  const submit = el('button', { class: 'open-case', type: 'submit', text: 'File it' });
  form.append(el('div', { class: 'after' }, submit));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onFile({
      killerId: who.select.value || null,
      methodId: how.select.value || null,
      motiveType: why.select.value || null,
      tick: when.select.value === '' ? null : Number(when.select.value),
      placeId: where.select.value || null,
    });
  });

  return form;
}

export function renderVerdict(
  verdict: Verdict,
  onAgain: () => void,
  onTruth: () => void,
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

  wrap.append(el('p', { class: 'score', text: `${verdict.points} out of five.` }));
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

  const again = el('button', { class: 'open-case', type: 'button', text: 'Open another case' });
  again.addEventListener('click', onAgain);
  const truth = el('button', { class: 'plain-button', type: 'button', text: 'Read the truth' });
  truth.addEventListener('click', onTruth);
  wrap.append(el('div', { class: 'after' }, again, truth));
  return wrap;
}
