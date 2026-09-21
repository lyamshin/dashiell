/**
 * The designer's back door: the M2b truth sheet, exactly as the CLI prints it,
 * set as a typewritten appendix. No markdown renderer — a carbon copy is the
 * right register for it, and it is the same characters the sheet test reads.
 */

import type { Case } from '../gen/types.js';
import { renderTruthSheet } from '../sheet/truthSheet.js';
import { el } from './dom.js';

export function renderTruth(kase: Case, onBack: () => void): HTMLElement {
  const wrap = el('div', { class: 'appendix' });
  const back = el('button', { class: 'plain-button', type: 'button', text: 'Back to the book' });
  back.addEventListener('click', onBack);
  wrap.append(
    el('h1', { text: `Appendix — what actually happened, case ${kase.seed}` }),
    el('div', { class: 'after' }, back),
    el('pre', { text: renderTruthSheet(kase) }),
  );
  return wrap;
}
