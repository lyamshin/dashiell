/**
 * The weather on the glass (docs/27).
 *
 * Every night rolls its weather (`cast.roll.weather`) and the prose already
 * says what it is. This makes the screen agree, quietly: rain streaks in the
 * margins, rime in the corners on a cold night, a haze on a foggy one, and now
 * and then a wisp of steam off a manhole cover.
 *
 * One layer, and all of it CSS: the rain is a streak texture sliding down on a
 * transform, the fog two soft sheets drifting on a transform, the frost four
 * corner textures that grow once and stop, the steam an occasional puff on the
 * Web Animations API. Nothing is drawn on the main thread frame by frame; the
 * only script that runs is a timer for the next wisp, which does not run while
 * the tab is hidden.
 *
 * Where it sits: across the whole width of the window, but at `z-index: -1`
 * inside the spread's own stacking context, so it is painted on the paper and
 * under every word and button, and it never takes a click. It lives only in
 * the margins: one strip for each gap the pages' content boxes leave, clipped
 * to it and feathered on the side that meets the text, so nothing ever falls
 * across the reading column or the buttons.
 *
 * `prefers-reduced-motion`: a still version. The frost is there, formed; the
 * haze is there, not drifting; no rain falls and no steam rises. A quiet
 * toggle in the pager turns the whole of it off, remembered in the store.
 */

import type { KeyValueStore } from '../game/storage.js';
import type { Weather } from '../game/voice/roll.js';

/* ------------------------------------------------------------- the switch */

export const WEATHER_KEY = 'dashiell:weather';

/** On unless the reader has turned it off. A store that throws reads as on. */
export function loadWeatherOn(store: KeyValueStore): boolean {
  try {
    return store.getItem(WEATHER_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Remember the switch. A store that throws forgets it; the switch still works. */
export function saveWeatherOn(store: KeyValueStore, on: boolean): void {
  try {
    store.setItem(WEATHER_KEY, on ? 'on' : 'off');
  } catch {
    /* blocked or full storage: the setting lasts as long as the page */
  }
}

/* ------------------------------------------------------------- the mapping */

export interface Steam {
  /** Seconds between wisps, the least and the most. */
  minGap: number;
  maxGap: number;
  /** How white a wisp is, 1 for an ordinary night. */
  strength: number;
}

export interface Effects {
  /** The night the layer is showing, or null for none. */
  weather: Weather | null;
  /** Streaks falling in the margins. Never under reduced motion. */
  rain: boolean;
  /** Rime in the corners, formed over the first seconds (or at once, still). */
  frost: boolean;
  /** A haze in the margins, drifting (or still). */
  fog: boolean;
  /** Now and then a wisp from the bottom edge. Never under reduced motion. */
  steam: Steam | null;
  /** Whether anything moves at all. */
  motion: boolean;
}

export const NO_EFFECTS: Effects = {
  weather: null,
  rain: false,
  frost: false,
  fog: false,
  steam: null,
  motion: false,
};

/** Steam on any night, more of it on a cold one, hardly any on a clear one. */
const STEAM: Record<Weather, Steam> = {
  clear: { minGap: 45, maxGap: 110, strength: 0.6 },
  rain: { minGap: 22, maxGap: 50, strength: 0.9 },
  fog: { minGap: 22, maxGap: 50, strength: 0.8 },
  cold: { minGap: 7, maxGap: 18, strength: 1.2 },
};

/**
 * What the screen shows for a night. `weather` null is the title page, or no
 * case open: nothing. Off is nothing. Reduced motion keeps what can be still
 * (frost, haze) and drops what cannot (rain, steam).
 */
export function effectsFor(
  weather: Weather | null,
  opts: { enabled: boolean; reducedMotion: boolean },
): Effects {
  if (weather === null || !opts.enabled) return NO_EFFECTS;
  const motion = !opts.reducedMotion;
  return {
    weather,
    rain: weather === 'rain' && motion,
    frost: weather === 'cold',
    fog: weather === 'fog',
    steam: motion ? STEAM[weather] : null,
    motion,
  };
}

/* ------------------------------------------------------------- the margins */

export type Span = readonly [number, number];

/** Merge overlapping spans and clamp them to [0, width]. */
function tidy(columns: readonly Span[], width: number): Span[] {
  const sorted = columns
    .map(([a, b]) => [Math.max(0, Math.min(a, b)), Math.min(width, Math.max(a, b))] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** The margins: what is left of [0, width] once the content columns are out. */
export function marginZones(columns: readonly Span[], width: number): Span[] {
  const zones: Span[] = [];
  let at = 0;
  for (const [a, b] of tidy(columns, width)) {
    if (a > at) zones.push([at, a]);
    at = b;
  }
  if (width > at) zones.push([at, width]);
  return zones;
}

const px = (n: number): string => `${Math.round(n * 10) / 10}px`;

/**
 * The mask for one margin strip, left to right in the strip's own pixels: it
 * fades out toward any side that meets a content column (never a side that is
 * the window's edge), so the weather thins before the text begins.
 */
export function stripMask(zone: Span, width: number, feather = 14): string {
  const w = zone[1] - zone[0];
  const f = Math.min(feather, w / 2);
  const left = zone[0] > 0.5;
  const right = zone[1] < width - 0.5;
  if (!left && !right) return 'none';
  return `linear-gradient(to right, ${left ? `transparent 0px, #000 ${px(f)}` : '#000 0px'}, ${
    right ? `#000 ${px(w - f)}, transparent ${px(w)}` : `#000 ${px(w)}`
  })`;
}

/* ------------------------------------------------------------- textures */

/** A small seeded generator, so the textures are the same on every load. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const svgUrl = (svg: string): string => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** A tile of short vertical streaks, wrapping top to bottom so it repeats. */
export function rainTile(
  w: number,
  h: number,
  count: number,
  seed: number,
  len: [number, number],
  stroke: number,
): string {
  const rand = lcg(seed);
  const lines: string[] = [];
  const line = (x: number, y1: number, y2: number, o: number): void => {
    lines.push(`<line x1="${r1(x)}" y1="${r1(y1)}" x2="${r1(x)}" y2="${r1(y2)}" stroke-opacity="${r1(o)}"/>`);
  };
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rand() * w) + 0.5;
    const y = rand() * h;
    const l = len[0] + rand() * (len[1] - len[0]);
    const o = 0.35 + rand() * 0.65;
    if (y + l <= h) line(x, y, y + l, o);
    else {
      line(x, y, h, o);
      line(x, 0, y + l - h, o);
    }
  }
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<g stroke="#fff" stroke-width="${stroke}" stroke-linecap="round">${lines.join('')}</g></svg>`,
  );
}

/**
 * One corner of rime, drawn for the top left (the others are mirrored): a soft
 * mottled frost thickest in the corner, and a few fine needles with barbs
 * growing in from the two edges.
 */
export function frostCorner(seed: number): string {
  const rand = lcg(seed);
  const S = 320;
  const paths: string[] = [];
  const needle = (x: number, y: number, angle: number, length: number): void => {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const ex = x + dx * length;
    const ey = y + dy * length;
    let d = `M${r1(x)} ${r1(y)}L${r1(ex)} ${r1(ey)}`;
    const barbs = 2 + Math.floor(rand() * 4);
    for (let i = 1; i <= barbs; i++) {
      const t = (i / (barbs + 1)) * length;
      const bx = x + dx * t;
      const by = y + dy * t;
      const bl = (length - t) * (0.25 + rand() * 0.2);
      for (const side of [-1, 1]) {
        const a = angle + side * (0.9 + rand() * 0.3);
        d += `M${r1(bx)} ${r1(by)}L${r1(bx + Math.cos(a) * bl)} ${r1(by + Math.sin(a) * bl)}`;
      }
    }
    const reach = Math.hypot(x, y) / S;
    paths.push(`<path d="${d}" stroke-opacity="${r1(Math.max(0.25, 0.9 - reach))}"/>`);
  };
  for (let i = 0; i < 7; i++) {
    const along = Math.pow(rand(), 1.4) * S * 0.7;
    const len = 26 + rand() * 70 * (1 - along / S);
    if (i % 2 === 0) needle(along, 0, Math.PI / 2 + (rand() - 0.3) * 0.9, len);
    else needle(0, along, (rand() - 0.3) * 0.9, len);
  }
  const noiseSeed = Math.floor(rand() * 1000);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" preserveAspectRatio="none">` +
      '<defs>' +
      '<radialGradient id="g" cx="0" cy="0" r="1">' +
      '<stop offset="0" stop-opacity="1" stop-color="#fff"/>' +
      '<stop offset=".3" stop-opacity=".7" stop-color="#fff"/>' +
      '<stop offset=".62" stop-opacity=".18" stop-color="#fff"/>' +
      '<stop offset="1" stop-opacity="0" stop-color="#fff"/>' +
      '</radialGradient>' +
      `<filter id="n" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="3" seed="${noiseSeed}"/>` +
      '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.6 0 0 0 -0.95"/>' +
      '<feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<radialGradient id="h" cx="0" cy="0" r="1">' +
      '<stop offset="0" stop-opacity=".9" stop-color="#fff"/>' +
      '<stop offset=".75" stop-opacity="0" stop-color="#fff"/>' +
      '</radialGradient>' +
      '</defs>' +
      `<rect width="${S}" height="${S}" fill="url(#g)" opacity=".45"/>` +
      `<rect width="${S}" height="${S}" fill="url(#g)" filter="url(#n)"/>` +
      `<g fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round">${paths.join('')}</g>` +
      `<rect width="${S}" height="${S}" fill="url(#h)" opacity=".35"/>` +
      '</svg>',
  );
}

/* ------------------------------------------------------------- the layer */

export interface WeatherLayer {
  /** The layer itself, for the book to put inside the spread. */
  readonly element: HTMLElement;
  /** Put the layer in `parent` if it is not there already (it keeps running). */
  attach(parent: HTMLElement): void;
  /** The night showing, or null for none (the title page). */
  show(weather: Weather | null): void;
  /** The reader's switch. */
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  /** Measure the columns again and re-cut the margins if they moved. */
  relayout(): void;
  /** What is showing now. */
  effects(): Effects;
}

const TILES = {
  far: () => rainTile(180, 420, 24, 11, [12, 22], 0.8),
  near: () => rainTile(260, 560, 15, 29, [26, 46], 1.1),
};

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;

function style(node: HTMLElement, props: Record<string, string>): void {
  for (const [k, v] of Object.entries(props)) node.style.setProperty(k, v);
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

/** Masks need the prefixed property on WebKit still; set both. */
function mask(node: HTMLElement, image: string): void {
  style(node, { 'mask-image': image, '-webkit-mask-image': image });
}

/**
 * The layer is not one sheet over the window but one strip per margin, each
 * clipped to its margin. A full-window layer would overlap the text, and the
 * browser would lift the text over it into a layer of its own and rasterize it
 * differently; strips that never overlap a column leave every word exactly as
 * it was. Inside each strip a window-sized view keeps the fog and the frost in
 * one coordinate system, so the margins read as one weather.
 */
export function createWeatherLayer(opts: { enabled: boolean }): WeatherLayer {
  const layer = div('weather');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset['weather'] = 'none';
  layer.hidden = true;
  let weather: Weather | null = null;
  let enabled = opts.enabled;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let current: Effects = NO_EFFECTS;
  let effectsKey = '';
  /** When this night's weather began, so a re-cut carries on where it was. */
  let since = 0;
  let zones: Span[] = [];
  let zonesKey = '';
  let timer: number | undefined;
  const textures = { far: '', near: '', frost: [] as string[] };

  const effects = (): Effects =>
    effectsFor(weather, { enabled, reducedMotion: reduce?.matches ?? false });

  function stopSteam(): void {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  }

  function scheduleSteam(first: boolean): void {
    stopSteam();
    const steam = current.steam;
    if (!steam || document.hidden || !layer.isConnected) return;
    const gap = steam.minGap + Math.random() * (steam.maxGap - steam.minGap);
    // The first wisp comes sooner than the gap, so a short night still sees one.
    const wait = (first ? 2.5 + Math.random() * Math.min(gap, 12) : gap) * 1000;
    timer = window.setTimeout(() => {
      wisp(steam);
      scheduleSteam(false);
    }, wait);
  }

  /** One wisp: two or three soft puffs rising and spreading, a few seconds. */
  function wisp(steam: Steam): void {
    const strips = [...layer.querySelectorAll<HTMLElement>('.wx-strip')];
    if (strips.length === 0 || strips.length !== zones.length) return;
    // A margin, chosen by its width, and a place inside it.
    const total = zones.reduce((n, [a, b]) => n + (b - a), 0);
    let pick = Math.random() * total;
    let at = 0;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i] as Span;
      pick -= z[1] - z[0];
      at = i;
      if (pick <= 0) break;
    }
    const strip = strips[at] as HTMLElement;
    const zw = (zones[at] as Span)[1] - (zones[at] as Span)[0];
    const w = Math.max(56, Math.min(130, zw * 1.1));
    const x = zw * (0.3 + Math.random() * 0.4) - w / 2;
    const rise = window.innerHeight * (0.22 + Math.random() * 0.16);
    const drift = (Math.random() - 0.5) * 50;
    const duration = 5200 + Math.random() * 2600;
    const puffs = 2 + Math.floor(Math.random() * 2);
    const peak = Math.min(1, 0.75 * steam.strength);
    const wispEl = div('wx-wisp');
    style(wispEl, { left: `${Math.round(x)}px`, width: `${Math.round(w)}px` });
    strip.append(wispEl);
    let left = puffs;
    for (let i = 0; i < puffs; i++) {
      const puff = div('wx-puff');
      style(puff, { left: `${Math.round((Math.random() - 0.5) * w * 0.3)}px` });
      wispEl.append(puff);
      const anim = puff.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.55, 0.45)' },
          { opacity: peak, offset: 0.22 },
          { opacity: 0, transform: `translate3d(${r1(drift)}px, ${r1(-rise)}px, 0) scale(1.6, 1.7)` },
        ],
        { duration, delay: i * 650, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'both' },
      );
      const done = (): void => {
        left -= 1;
        if (left === 0) wispEl.remove();
      };
      anim.finished.then(done, done);
    }
  }

  /** Measure the pages' text; the margins are what it leaves. */
  function measure(): { zones: Span[]; width: number } {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const columns: Span[] = [];
    for (const page of document.querySelectorAll<HTMLElement>('.spread .page')) {
      const r = page.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(page);
      let left = r.left + page.clientLeft + parseFloat(cs.paddingLeft);
      let right = r.left + page.clientLeft + page.clientWidth - parseFloat(cs.paddingRight);
      // Anything that reaches out of the content box into the page's margin
      // (the notebook's body does, on a wide screen, to give the grid room)
      // is text too, and the weather keeps off it.
      for (const child of page.children) {
        const c = child.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) continue;
        left = Math.min(left, c.left);
        right = Math.max(right, c.right);
      }
      // Two pixels of air either side: a strip that so much as touches a
      // column's box would count as overlapping it.
      columns.push([Math.floor(left) - 2, Math.ceil(right) + 2]);
    }
    return { zones: marginZones(columns, width).filter(([a, b]) => b - a >= 6), width };
  }

  /** Cut one strip per margin and fill each with tonight's weather. */
  function cut(width: number): void {
    while (layer.firstChild) layer.firstChild.remove();
    // The strips are placed in the layer's own box, which starts at the window's left edge
    // (or, where the spread cannot let it out sideways, at the spread's).
    const origin = layer.getBoundingClientRect().left;
    // Everything that runs on a clock starts as far in as this night already is.
    style(layer, { '--wx-age': `${-Math.round(performance.now() - since) / 1000}s` });
    const vw = window.innerWidth;
    const corner = Math.max(140, Math.min(330, Math.min(vw, window.innerHeight) * 0.34));
    for (const zone of zones) {
      const [a, b] = zone;
      const strip = div('wx-strip');
      style(strip, { left: `${a - origin}px`, width: `${b - a}px` });
      // A wide feather: the weather is thickest at the window's edge and thins
      // all the way to the text, rather than stopping at a line.
      mask(strip, stripMask(zone, width, width < 600 ? 8 : 30));
      const view = div('wx-view');
      style(view, { left: `${-a}px`, width: `${vw}px` });
      if (current.fog) view.append(div('wx-haze'), div('wx-fog-a'), div('wx-fog-b'));
      if (current.frost) {
        CORNERS.forEach((c, i) => {
          // Only the corners this margin reaches.
          const x0 = c.endsWith('l') ? 0 : vw - corner;
          if (x0 + corner <= a || x0 >= b) return;
          const outer = div(`wx-corner wx-corner--${c}`);
          const inner = div('wx-rime');
          mask(inner, (textures.frost[i] ||= frostCorner(101 + i * 37)));
          outer.append(inner);
          view.append(outer);
        });
      }
      if (view.childNodes.length > 0) strip.append(view);
      if (current.rain) {
        const rain = div('wx-rain');
        for (const depth of ['far', 'near'] as const) {
          const sheet = div(`wx-sheet wx-sheet--${depth}`);
          mask(sheet, (textures[depth] ||= TILES[depth]()));
          rain.append(sheet);
        }
        strip.append(rain);
      }
      layer.append(strip);
    }
  }

  function build(): void {
    const next = effects();
    const key = JSON.stringify(next);
    if (key === effectsKey) return;
    effectsKey = key;
    current = next;
    since = performance.now();
    stopSteam();
    layer.dataset['weather'] = next.weather ?? 'none';
    layer.dataset['motion'] = String(next.motion);
    layer.dataset['steam'] = String(next.steam !== null);
    layer.hidden = next.weather === null;
    zonesKey = '';
    if (next.weather === null) {
      while (layer.firstChild) layer.firstChild.remove();
      return;
    }
    relayout();
    scheduleSteam(true);
  }

  function relayout(): void {
    if (!layer.isConnected || layer.hidden) return;
    const m = measure();
    const key = `${m.width}x${window.innerHeight}:${m.zones.map((z) => z.join('-')).join(',')}`;
    if (key === zonesKey) return;
    zonesKey = key;
    zones = m.zones;
    cut(m.width);
  }

  let pending = 0;
  const onResize = (): void => {
    if (pending) return;
    pending = window.requestAnimationFrame(() => {
      pending = 0;
      relayout();
    });
  };
  window.addEventListener('resize', onResize, { passive: true });
  // The phone's notebook is a class on the body, not a render.
  new MutationObserver(onResize).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    layer.dataset['paused'] = String(document.hidden);
    if (document.hidden) stopSteam();
    else scheduleSteam(false);
  });
  reduce?.addEventListener?.('change', () => build());

  return {
    element: layer,
    attach(parent) {
      if (layer.parentNode !== parent) {
        parent.prepend(layer);
        zonesKey = '';
      }
      build();
      relayout();
      if (timer === undefined) scheduleSteam(true);
    },
    show(w) {
      weather = w;
      build();
    },
    setEnabled(on) {
      enabled = on;
      build();
    },
    get enabled() {
      return enabled;
    },
    relayout,
    effects: () => current,
  };
}
