/**
 * The lights lab (docs/27): `?wxlab=1` on the dev server, and nowhere else. Out before merge.
 *
 * The designer's question: should the view outside the window change as you move, or always be the
 * same? A small panel in the bottom right corner, out of the reading column, to switch between
 * A (one window all night), B (by place), C (by the hour) and D (both), and to preview any building
 * and any hour without playing to it; the night's weather, the lamp's electric or gas, and a car,
 * a train or the sign's flicker now. What it shows is in the URL (`wxview`, `wxplace`, `wxmin`,
 * `wx`, `wxlamp`), so a link opens the same view.
 */

import { formatClock } from '../game/board/clock.js';
import type { Weather } from '../game/board/types.js';
import { BUILDINGS, VARIATIONS, type Building, type Light, type Variation, type WeatherLayer } from './weather.js';

const WEATHERS: readonly Weather[] = ['clear', 'rain', 'fog', 'cold'];

const VIEW_NAMES: Record<Variation, string> = {
  A: 'A one window',
  B: 'B by place',
  C: 'C by the hour',
  D: 'D both',
};

const BUILDING_NAMES: Record<Building, string> = {
  office: 'the office',
  bar: 'a bar (speakeasy)',
  club: 'a club (speakeasy)',
  restaurant: 'a restaurant',
  theatre: 'a theatre',
  work: 'a workplace',
  transit: 'a station',
  rooming: 'a rooming house',
  home: 'a flat or home',
};

const HIDDEN_KEY = 'dashiell:wxlab-hidden';

const CSS = `
.wxlab{position:fixed;right:10px;bottom:10px;z-index:1000;max-width:calc(100vw - 20px);box-sizing:border-box;
  padding:8px 9px 9px;background:rgba(9,9,11,.94);border:1px solid #4a4d55;color:#b9b4aa;
  font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.wxlab-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 5px}
.wxlab-k{width:4.4em;color:#8a857c}
.wxlab button,.wxlab select{font:inherit;color:#d8d2c6;background:#1b1c20;border:1px solid #3c3f46;padding:3px 6px;cursor:pointer;border-radius:0}
.wxlab button:hover,.wxlab select:hover{border-color:#8a8e96}
.wxlab button[aria-pressed='true']{background:#d8d2c6;color:#111;border-color:#d8d2c6}
.wxlab :focus-visible{outline:2px solid #d8d2c6;outline-offset:2px}
.wxlab input[type=range]{width:12em;accent-color:#d8d2c6}
.wxlab-now{color:#8a857c;max-width:34em;margin:6px 0 0}
.wxlab-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 6px;color:#8a857c;letter-spacing:.06em}
.wxlab[data-hidden='true'] .wxlab-body{display:none}
.wxlab[data-hidden='true'] .wxlab-head{margin:0}
@media (max-width:599px){.wxlab{font-size:11px;padding:6px}.wxlab-k{width:3.8em}.wxlab input[type=range]{width:9em}}
`;

const pick = <T extends string>(all: readonly T[], v: string | null): T | undefined => all.find((x) => x === v);

/** A light, said plainly, for the panel's line about what's outside. */
function said(l: Light | null): string {
  if (!l) return 'dark';
  const dim = l.strength < 0.8 ? 'dim ' : '';
  if (l.kind === 'neon') return `${dim}${l.word} sign`;
  if (l.kind === 'glow') return `${dim}a sign's glow`;
  if (l.kind === 'bulb') return `${dim}a cold bulb over a door`;
  if (l.kind === 'marquee') return 'a marquee, chasing';
  if (l.kind === 'window') return 'lit windows across the way';
  return `${dim}${l.tone === 'gas' ? 'gas' : 'electric'} lamp`;
}

const clock = (m: number): string => formatClock(m).replace(' AM', ' a.m.').replace(' PM', ' p.m.');

export function mountWeatherLab(layer: WeatherLayer): void {
  const q = new URLSearchParams(window.location.search);
  const minutes = q.get('wxmin');
  layer.setLab({
    variation: pick(VARIATIONS, q.get('wxview')) ?? layer.lab.variation,
    building: pick(BUILDINGS, q.get('wxplace')) ?? null,
    minutes: minutes !== null && /^\d+$/.test(minutes) ? Math.min(480, Number(minutes)) : null,
    lamp: q.get('wxlamp') === 'gas' ? 'gas' : 'electric',
    weather: pick(WEATHERS, q.get('wx')) ?? null,
  });

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const panel = document.createElement('aside');
  panel.className = 'wxlab';
  panel.setAttribute('aria-label', 'Lights lab');
  let hidden = false;
  try {
    hidden = window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    /* no storage: open */
  }
  panel.dataset['hidden'] = String(hidden);

  const button = (text: string, pressed: boolean | null, on: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (pressed !== null) b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', () => {
      on();
      draw();
    });
    return b;
  };
  const row = (label: string, ...items: HTMLElement[]): HTMLElement => {
    const r = document.createElement('div');
    r.className = 'wxlab-row';
    const k = document.createElement('span');
    k.className = 'wxlab-k';
    k.textContent = label;
    r.append(k, ...items);
    return r;
  };

  function writeUrl(): void {
    const u = new URL(window.location.href);
    const l = layer.lab;
    const set = (k: string, v: string | null): void => {
      if (v === null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    };
    set('wxlab', '1');
    set('wxview', l.variation);
    set('wxplace', l.building);
    set('wxmin', l.minutes === null ? null : String(l.minutes));
    set('wx', l.weather);
    set('wxlamp', l.lamp === 'gas' ? 'gas' : null);
    window.history.replaceState(window.history.state, '', u);
  }

  /** The line under the controls: what's outside now. */
  function nowLine(): string {
    const v = layer.view();
    const parts = [`left: ${said(v.left)}`, `right: ${said(v.right)}`];
    if (v.cabs) parts.push('a cab rank');
    if (v.el) parts.push(v.el > 1 ? 'the El, often' : 'the El nearby');
    parts.push(`cars ×${Math.round(v.cars * 100) / 100}`);
    if (v.dawn > 0) parts.push(`dawn ${Math.round(v.dawn * 100)}%`);
    return parts.join(' · ');
  }

  function draw(): void {
    const keep = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement) ? document.activeElement.dataset['k'] : undefined;
    panel.replaceChildren();
    const l = layer.lab;
    const book = layer.bookScene;
    const head = document.createElement('div');
    head.className = 'wxlab-head';
    const title = document.createElement('span');
    title.textContent = 'LIGHTS LAB';
    head.append(
      title,
      button(hidden ? 'open' : 'hide', null, () => {
        hidden = !hidden;
        panel.dataset['hidden'] = String(hidden);
        try {
          window.localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
        } catch {
          /* no storage: for this page only */
        }
      }),
    );
    const body = document.createElement('div');
    body.className = 'wxlab-body';

    const place = document.createElement('select');
    place.dataset['k'] = 'place';
    place.setAttribute('aria-label', 'Place');
    const opt = (value: string, text: string): HTMLOptionElement => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      return o;
    };
    place.append(opt('', `the book's: ${book.building ? BUILDING_NAMES[book.building] : 'none'}`), ...BUILDINGS.map((b) => opt(b, BUILDING_NAMES[b])));
    place.value = l.building ?? '';
    place.addEventListener('change', () => {
      layer.setLab({ building: pick(BUILDINGS, place.value) ?? null });
      draw();
    });

    const hour = document.createElement('input');
    hour.type = 'range';
    hour.min = '0';
    hour.max = '480';
    hour.step = '5';
    hour.dataset['k'] = 'hour';
    hour.setAttribute('aria-label', 'Hour');
    const shown = l.minutes ?? book.minutes ?? 0;
    hour.value = String(shown);
    const readout = document.createElement('span');
    readout.textContent = l.minutes === null ? `the book's: ${book.minutes === null ? 'none' : clock(book.minutes)}` : clock(l.minutes);
    hour.addEventListener('input', () => {
      layer.setLab({ minutes: Number(hour.value) });
      readout.textContent = clock(Number(hour.value));
      now.textContent = nowLine();
      writeUrl();
    });

    const now = document.createElement('p');
    now.className = 'wxlab-now';
    now.textContent = nowLine();
    const roll = layer.night;
    body.append(
      row('view', ...VARIATIONS.map((v) => button(VIEW_NAMES[v], l.variation === v, () => layer.setLab({ variation: v })))),
      row('place', place),
      row('hour', hour, readout, button("the book's", l.minutes === null, () => layer.setLab({ minutes: null }))),
      row('night', button(`roll${roll ? ` (${roll})` : ''}`, l.weather === null, () => layer.setLab({ weather: null })), ...WEATHERS.map((w) => button(w, l.weather === w, () => layer.setLab({ weather: w })))),
      row('lamp', button('electric', l.lamp === 'electric', () => layer.setLab({ lamp: 'electric' })), button('gas', l.lamp === 'gas', () => layer.setLab({ lamp: 'gas' }))),
      row('now', button('a car', null, () => layer.trigger('car')), button('the El', null, () => layer.trigger('el')), button('a flicker', null, () => layer.trigger('flicker'))),
      now,
    );
    panel.append(head, body);
    writeUrl();
    if (keep) panel.querySelector<HTMLElement>(`[data-k="${keep}"]`)?.focus();
  }

  // The book's place and hour change as you play: show them whenever the panel is reached, and after
  // each page (the book renders, then the layer hears of it).
  panel.addEventListener('pointerenter', () => {
    if (!panel.contains(document.activeElement)) draw();
  });
  layer.element.addEventListener('wx-scene', () => {
    if (!panel.contains(document.activeElement)) draw();
  });
  draw();
  document.body.append(panel);
  window.setTimeout(draw, 0);
}
