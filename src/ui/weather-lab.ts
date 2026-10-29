/**
 * The weather lab (docs/27): `?wxlab=1` on the dev server, and nowhere else.
 *
 * Motion doesn't come across in a screenshot, so the designer chooses the frost and the sign by
 * watching them. A small switcher in the bottom right corner, out of the reading column: the night's
 * weather (overriding the roll), the three frosts, the three takes on the sign, its colour, the rain,
 * and buttons to regrow the frost, flicker the sign now, and see the still (reduced-motion) version.
 * What it shows is in the URL (`wx`, `wxfrost`, `wxneon`, `wxhue`, `wxrain`, `wxstill`), so a link
 * opens the same view. It is a tool, not the book: it comes out, with the versions not chosen,
 * before merge.
 */

import type { Weather } from '../game/board/types.js';
import { FROSTS, HUES, NEONS, RAINS, type WeatherLayer, type WeatherLook } from './weather.js';

const WEATHERS: readonly Weather[] = ['clear', 'rain', 'fog', 'cold'];

const LABELS: Record<string, string> = {
  fern: '1 fern',
  etched: '2 etched',
  rime: '3 rime',
  hotel: '1 HOTEL',
  light: '2 light',
  wet: '3 wet glass',
  argon: 'argon',
  rose: 'rose',
  streaks: 'streaks',
  runs: 'runs',
  both: 'both',
};

const HIDDEN_KEY = 'dashiell:wxlab-hidden';

const CSS = `
.wxlab{position:fixed;right:10px;bottom:10px;z-index:1000;max-width:calc(100vw - 20px);box-sizing:border-box;
  padding:8px 9px 9px;background:rgba(9,9,11,.94);border:1px solid #4a4d55;color:#b9b4aa;
  font:12px/1.25 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.wxlab-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:0 0 5px}
.wxlab-row:last-child{margin:0}
.wxlab-k{width:4.6em;color:#8a857c}
.wxlab button{font:inherit;color:#d8d2c6;background:#1b1c20;border:1px solid #3c3f46;padding:3px 6px;cursor:pointer;border-radius:0}
.wxlab button:hover{border-color:#8a8e96}
.wxlab button[aria-pressed='true']{background:#d8d2c6;color:#111;border-color:#d8d2c6}
.wxlab button:focus-visible{outline:2px solid #d8d2c6;outline-offset:2px}
.wxlab-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 6px;color:#8a857c;letter-spacing:.06em}
.wxlab[data-hidden='true'] .wxlab-body{display:none}
.wxlab[data-hidden='true'] .wxlab-head{margin:0}
@media (max-width:599px){.wxlab{font-size:11px;padding:6px}.wxlab-k{width:3.8em}}
`;

function pick<T extends string>(all: readonly T[], v: string | null): T | undefined {
  return all.find((x) => x === v);
}

export function mountWeatherLab(layer: WeatherLayer): void {
  const q = new URLSearchParams(window.location.search);
  let forced: Weather | null = pick(WEATHERS, q.get('wx')) ?? null;
  let still = q.get('wxstill') === '1';
  const look: Partial<WeatherLook> = {};
  const frost = pick(FROSTS, q.get('wxfrost'));
  const neon = pick(NEONS, q.get('wxneon'));
  const hue = pick(HUES, q.get('wxhue'));
  const rain = pick(RAINS, q.get('wxrain'));
  if (frost) look.frost = frost;
  if (neon) look.neon = neon;
  if (hue) look.hue = hue;
  if (rain) look.rain = rain;
  if (Object.keys(look).length) layer.setLook(look);
  if (forced) layer.force(forced);
  if (still) layer.still(true);

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);

  const panel = document.createElement('aside');
  panel.className = 'wxlab';
  panel.setAttribute('aria-label', 'Weather lab');
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
    const set = (k: string, v: string | null): void => {
      if (v === null) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    };
    const l = layer.look;
    set('wxlab', '1');
    set('wx', forced);
    set('wxfrost', l.frost);
    set('wxneon', l.neon);
    set('wxhue', l.hue);
    set('wxrain', l.rain);
    set('wxstill', still ? '1' : null);
    window.history.replaceState(window.history.state, '', u);
  }

  function draw(): void {
    panel.replaceChildren();
    const l = layer.look;
    const head = document.createElement('div');
    head.className = 'wxlab-head';
    const title = document.createElement('span');
    title.textContent = 'WEATHER LAB';
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
    const roll = layer.night;
    body.append(
      row(
        'night',
        button(`roll${roll ? ` (${roll})` : ''}`, forced === null, () => {
          forced = null;
          layer.force(null);
        }),
        ...WEATHERS.map((w) =>
          button(w, forced === w, () => {
            forced = w;
            layer.force(w);
          }),
        ),
      ),
      row('frost', ...FROSTS.map((f) => button(LABELS[f] ?? f, l.frost === f, () => layer.setLook({ frost: f })))),
      row('neon', ...NEONS.map((n) => button(LABELS[n] ?? n, l.neon === n, () => layer.setLook({ neon: n })))),
      row('colour', ...HUES.map((h) => button(LABELS[h] ?? h, l.hue === h, () => layer.setLook({ hue: h })))),
      row('rain', ...RAINS.map((r) => button(LABELS[r] ?? r, l.rain === r, () => layer.setLook({ rain: r })))),
      row(
        'do',
        button('regrow', null, () => layer.restart()),
        button('flicker', null, () => layer.flicker()),
        button('still', still, () => {
          still = !still;
          layer.still(still);
        }),
      ),
    );
    panel.append(head, body);
    writeUrl();
  }

  // The roll is known once the book has shown its night; show it whenever the panel is reached.
  panel.addEventListener('pointerenter', () => {
    if (!panel.contains(document.activeElement)) draw();
  });
  draw();
  document.body.append(panel);
  window.setTimeout(draw, 0);
}
