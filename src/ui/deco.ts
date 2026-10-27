/**
 * book-look, item 5: the Deco frame's few words and marks (scratchpad direction.md, "Deco noir": a
 * Deco frame around a noir page). The page you read stays Garamond on the night's paper; these are
 * the frame's: the clock's "a.m.", the setback ornament, the DA's caption and the stamp. Each word is
 * one constant, so the designer can change it in one place (direction.md §15).
 */

import { el } from './dom.js';

/** The report's and the verdict's caption on a murder, and the word under it. */
export const COURT = 'The People of the State of New York';
export const AGAINST = 'against';

/** A lost thing's or a lost pet's caption: the report goes to the client. */
export const reportTo = (client: string): string => `Report to ${client}`;
export const CONCERNING = 'concerning';

/** The plaque's foot: what the paper is. */
export const DETECTIVES_REPORT = 'Detective’s report';

/** The stamp on the verdict: the right name, or not. */
export const STAMP_RIGHT = 'Case closed';
export const STAMP_WRONG = 'Dismissed';

/** The ledger's marks, as words a screen reader says (no ✓, ✗ or ½ glyphs). */
export const MARK_RIGHT = 'Right';
export const MARK_WRONG = 'Wrong';
export const MARK_HALF = 'Half';

/** "12:35 AM" said as the period's "12:35 a.m.": the figures, and the lowercase small "a.m.". */
export function clockParts(time: string): { figures: string; ampm: string } {
  const m = /^(\d{1,2}:\d{2})\s*([AP])M$/i.exec(time.trim());
  if (!m) return { figures: time, ampm: '' };
  return { figures: m[1] as string, ampm: (m[2] as string).toLowerCase() === 'a' ? 'a.m.' : 'p.m.' };
}

/** The time as the running head sets it: the figures, then "a.m." in its own span. */
export function clockNode(time: string): HTMLElement {
  const { figures, ampm } = clockParts(time);
  const node = el('span', { class: 'time' }, figures);
  if (ampm) node.append(el('span', { class: 'ampm', text: ampm }));
  return node;
}

/**
 * The one ornament: the 1916 setback skyline, three stepped bars. As the break before the choices
 * (`setback`) and as the crest of the report's and the verdict's plaques (`crest`). Decorative only.
 */
const SETBACK_PATH = 'M21 0h12v2H21zM14 4h26v2H14zM5 8h44v2H5z';

function setbackSvg(cls: string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 54 10');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', cls);
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', SETBACK_PATH);
  svg.append(path);
  return svg;
}

export function setback(): HTMLElement {
  const node = el('div', { class: 'setback', 'aria-hidden': 'true' });
  node.append(setbackSvg('setback-mark'));
  return node;
}

export function crest(): SVGSVGElement {
  return setbackSvg('crest');
}

/**
 * A walk's route, for the transfer's stub: a ring for here, a dotted way, a dot for there, and the
 * walker who steps along it when the ticket is under a finger (chosen from impeccable's live variants).
 */
export function routeSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 44 12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'route');
  const part = (tag: string, cls: string, attrs: Record<string, string>): void => {
    const node = document.createElementNS(ns, tag);
    node.setAttribute('class', cls);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
  };
  part('circle', 'here', { cx: '4', cy: '6', r: '2.6' });
  part('line', 'path', { x1: '9', y1: '6', x2: '35', y2: '6' });
  part('circle', 'there', { cx: '40', cy: '6', r: '2.6' });
  part('circle', 'walker', { cx: '4', cy: '6', r: '1.7' });
  return svg;
}

/** A five-pointed star, drawn, for the verdict's star (amber for gold, red for a star). */
export function starSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'star-glyph');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', 'M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5L7 14.3l-5.3-5 7.2-.9z');
  svg.append(path);
  return svg;
}
