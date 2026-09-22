/**
 * M6 §4 — names on hover.
 *
 * One card on the page at a time. A mouse shows it on hover and hides it on
 * leave; a keyboard shows it on focus; a finger shows it on a tap and hides it
 * on a tap anywhere else. What goes on the card is the notebook's business
 * (`personCard`, `placeHoverCard`); this file only puts it on the paper.
 */

import type { HoverCard } from '../game/notebook.js';
import { el } from './dom.js';

export type CardSource = () => HoverCard | null;

let card: HoverCard | null = null;
let node: HTMLElement | null = null;
let anchor: HTMLElement | null = null;
let pinned = false;
let lastPointer = 'mouse';
let wired = false;

function wireDocument(): void {
  if (wired) return;
  wired = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      lastPointer = event.pointerType || 'mouse';
      const target = event.target as Node | null;
      if (!node || !target) return;
      if (node.contains(target) || anchor?.contains(target)) return;
      hideCard();
    },
    true,
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideCard();
  });
  window.addEventListener('scroll', () => hideCard(), true);
  window.addEventListener('resize', () => hideCard());
}

export function hideCard(): void {
  node?.remove();
  node = null;
  anchor?.removeAttribute('aria-describedby');
  anchor = null;
  card = null;
  pinned = false;
}

function showCard(at: HTMLElement, source: CardSource): void {
  const next = source();
  if (!next) return;
  hideCard();
  card = next;
  anchor = at;
  const box = el('div', { class: 'hover-card', role: 'tooltip', id: 'hover-card' });
  box.append(el('div', { class: 'hc-title', text: card.title }));
  for (const line of card.lines) box.append(el('div', { class: 'hc-line', text: line }));
  document.body.append(box);
  node = box;
  at.setAttribute('aria-describedby', 'hover-card');
  place(at, box);
}

/** Below the anchor, or above it when there is no room, and never off the side. */
function place(at: HTMLElement, box: HTMLElement): void {
  const a = at.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const margin = 8;
  let top = a.bottom + 6;
  if (top + b.height > window.innerHeight - margin) top = Math.max(margin, a.top - b.height - 6);
  let left = a.left;
  if (left + b.width > window.innerWidth - margin) left = window.innerWidth - margin - b.width;
  box.style.top = `${Math.round(top)}px`;
  box.style.left = `${Math.round(Math.max(margin, left))}px`;
}

/**
 * Give `target` a hover card. `onTap` is what a tap does besides showing the
 * card, for a button that is also an action (a name in the switch row).
 */
export function attachCard(target: HTMLElement, source: CardSource): void {
  wireDocument();
  target.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && !pinned) showCard(target, source);
  });
  target.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !pinned && anchor === target) hideCard();
  });
  target.addEventListener('focus', () => {
    if (!pinned) showCard(target, source);
  });
  target.addEventListener('blur', () => {
    if (!pinned && anchor === target) hideCard();
  });
  target.addEventListener('click', () => {
    if (lastPointer === 'mouse') return;
    if (pinned && anchor === target) {
      hideCard();
      return;
    }
    showCard(target, source);
    pinned = true;
  });
}
