/**
 * The weather on the window (docs/27).
 *
 * Every night rolls its weather (`run.weather`) and the prose already says what it is. This makes the
 * screen agree, quietly, as if the book were read at a window: rain runs down the glass, frost grows
 * in from its edges, fog pools low, now and then a wisp of steam rises off a manhole cover. And a sign
 * outside, at the window's left edge, every night: argon-blue light that hums and now and then
 * flickers, read through the night's weather (crisp when it's clear, smeared by the rain, haloed by
 * the fog, caught in the frost).
 *
 * Only on the glass around the book. The layer measures the pages' text columns and cuts one strip
 * for each margin they leave (the window's margins beside the book, the pages' padding, the gutter
 * between them), each feathered toward the text, so the text column, the choices and every button
 * stay clear and crisp. It sits under them, at the bottom of the spread's stacking context, and never
 * takes a click.
 *
 * All of it CSS: what moves moves on transform or opacity, on the compositor. The textures are seeded
 * SVG masks drawn once per window size. The only script that runs is a timer for the next wisp and
 * the next flicker, and neither runs while the tab is hidden.
 *
 * `prefers-reduced-motion`: the still version. The frost is there, formed; the fog is there, not
 * drifting; the sign is steady; no rain, no steam, no flicker. A quiet toggle in the pager turns the
 * whole of it off, the sign included, remembered in the store.
 *
 * The lab (`?wxlab=1`, dev only, src/ui/weather-lab.ts): the frost, the neon and the rain each have
 * versions for the designer to choose between by watching. The choice is a small option object
 * (`WeatherLook`) and data attributes on the layer; the versions not chosen come out before merge.
 */

import type { KeyValueStore } from '../game/board/profile.js';
import type { Weather } from '../game/board/types.js';

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

/* ------------------------------------------------------------- the looks */

/** The frost: fern dendrites; Deco fans etched in the glass; a rime band whose crystals glint. */
export const FROSTS = ['fern', 'etched', 'rime'] as const;
/** The sign: HOTEL, its tubes cropped by the window's edge; its light only; its light in the wet glass. */
export const NEONS = ['hotel', 'light', 'wet'] as const;
/** The tube's colour: argon blue (the 1920s' blue tubes), or a rose to compare. */
export const HUES = ['argon', 'rose'] as const;
/** The rain: streaks falling beyond the glass; drops running down it; both. */
export const RAINS = ['streaks', 'runs', 'both'] as const;

export type FrostLook = (typeof FROSTS)[number];
export type NeonLook = (typeof NEONS)[number];
export type NeonHue = (typeof HUES)[number];
export type RainLook = (typeof RAINS)[number];

export interface WeatherLook {
  frost: FrostLook;
  neon: NeonLook;
  hue: NeonHue;
  rain: RainLook;
}

export const DEFAULT_LOOK: WeatherLook = { frost: 'fern', neon: 'hotel', hue: 'argon', rain: 'both' };

/* ------------------------------------------------------------- the mapping */

export interface Steam {
  /** Seconds between wisps, the least and the most. */
  minGap: number;
  maxGap: number;
  /** How white a wisp is, 1 for an ordinary night. */
  strength: number;
}

export interface Flicker {
  /** Seconds between the sign's flickers, the least and the most. */
  minGap: number;
  maxGap: number;
}

export interface Effects {
  /** The night the layer is showing, or null for none. */
  weather: Weather | null;
  /** Rain falling beyond the glass, in slanted streaks. Never under reduced motion. */
  rain: boolean;
  /** Drops beading on the glass and running down it. Never under reduced motion. */
  drops: boolean;
  /** Frost on the glass, grown in from the edges over the first seconds (or formed, still). */
  frost: boolean;
  /** Fog pooled low in the margins, drifting (or still). */
  fog: boolean;
  /** The sign outside the window: every night, read through its weather. */
  neon: boolean;
  /** How often the sign flickers. Never under reduced motion. */
  flicker: Flicker | null;
  /** Now and then a wisp from the bottom edge. Never under reduced motion. */
  steam: Steam | null;
  /** Whether anything moves at all. */
  motion: boolean;
}

export const NO_EFFECTS: Effects = {
  weather: null,
  rain: false,
  drops: false,
  frost: false,
  fog: false,
  neon: false,
  flicker: null,
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

/** A buzz, a letter or the whole tube out for a beat, every 20 to 60 seconds. */
export const FLICKER: Flicker = { minGap: 20, maxGap: 60 };

/**
 * What the screen shows for a night. `weather` null is no night: nothing. Off is nothing, the sign
 * included. Reduced motion keeps what can be still (frost, fog, a steady sign) and drops what cannot
 * (rain, steam, the flicker). `narrow` is a phone, whose only margins are the 16 px gutters: there the
 * sign's light at the edge carries the night, and a cold night's rime; rain, fog and steam would be a
 * flicker of noise in a strip that thin, so they aren't drawn.
 */
export function effectsFor(
  weather: Weather | null,
  opts: { enabled: boolean; reducedMotion: boolean; narrow?: boolean; rain?: RainLook },
): Effects {
  if (weather === null || !opts.enabled) return NO_EFFECTS;
  const motion = !opts.reducedMotion;
  const wide = !opts.narrow;
  const rain = opts.rain ?? DEFAULT_LOOK.rain;
  const wet = weather === 'rain' && motion && wide;
  return {
    weather,
    rain: wet && rain !== 'runs',
    drops: wet && rain !== 'streaks',
    frost: weather === 'cold',
    fog: weather === 'fog' && wide,
    neon: true,
    flicker: motion ? FLICKER : null,
    steam: motion && wide ? STEAM[weather] : null,
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

/** A child of a page, as `pageColumn` sees it: its x-span, and whether it is out of the flow. */
export interface ChildBox {
  left: number;
  right: number;
  /** `position: absolute` or `fixed`, or nothing to see (no width or height). */
  out?: boolean;
}

/**
 * One page's text column, in window pixels, with two pixels of air either side (a strip that so much
 * as touches a column's box would count as overlapping it). It is the page's content box, widened to
 * any child that reaches out into the page's padding: the notebook's body does on a wide screen, for
 * the grid; the choices' lacquer panel does by 16 px. Two kinds of child don't count. One out of the
 * flow (the skip link, parked above the page until it has the focus) sits over the weather anyway.
 * And a band as wide as the page itself (on a phone, the choices' panel and the page's foot) has a
 * ground of its own: the weather is under the page, so the band covers it where it passes.
 */
export function pageColumn(page: Span, content: Span, children: readonly ChildBox[]): Span {
  let [left, right] = content;
  for (const c of children) {
    if (c.out) continue;
    if (c.left <= page[0] + 0.5 && c.right >= page[1] - 0.5) continue;
    left = Math.min(left, c.left);
    right = Math.max(right, c.right);
  }
  return [Math.floor(left) - 2, Math.ceil(right) + 2];
}

const px = (n: number): string => `${Math.round(n * 10) / 10}px`;

/**
 * The mask for one margin strip, left to right in the strip's own pixels: it fades out toward any
 * side that meets a content column (never a side that is the window's edge), so the weather thins
 * before the text begins.
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

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/**
 * An SVG as a CSS `url()`. Only what a data URI can't carry raw is escaped (the masks are large, and
 * spaces are fine inside a quoted `url("…")`).
 */
const svgUrl = (svg: string): string =>
  `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/[%#<>{}]/g, (c) => encodeURIComponent(c))}")`;
const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();
const r2 = (n: number): string => (Math.round(n * 100) / 100).toString();
const SVG = 'http://www.w3.org/2000/svg';

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
    `<svg xmlns="${SVG}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<g stroke="#fff" stroke-width="${stroke}" stroke-linecap="round">${lines.join('')}</g></svg>`,
  );
}

/**
 * A tile of drops beaded on the glass: each a faint lens with a bright rim low down (the room's light
 * through it) and a catch-light up and to the left.
 */
export function beadTile(w: number, h: number, count: number, seed: number): string {
  const rand = lcg(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = 0.9 + Math.pow(rand(), 2) * 2.6;
    const x = r + rand() * (w - 2 * r);
    const y = r + rand() * (h - 2 * r);
    const ry = r * (1 + rand() * 0.25);
    out.push(
      `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r)}" ry="${r1(ry)}" fill-opacity=".1"/>` +
        `<path d="M${r1(x - r * 0.8)} ${r1(y + ry * 0.35)}A${r1(r)} ${r1(ry)} 0 0 0 ${r1(x + r * 0.8)} ${r1(y + ry * 0.35)}" fill="none" stroke="#fff" stroke-width=".7" stroke-opacity=".45"/>` +
        `<circle cx="${r1(x - r * 0.35)}" cy="${r1(y - ry * 0.4)}" r="${r1(Math.max(0.45, r * 0.28))}" fill-opacity=".85"/>`,
    );
  }
  return svgUrl(`<svg xmlns="${SVG}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g fill="#fff">${out.join('')}</g></svg>`);
}

/* ------------------------------------------------------------- frost */

/** The frost forms in this many steps, outward from the edges, each fading in over `FROST_FADE`. */
export const STAGES = 9;
/** Seconds from the first rime to the frost's last reach. */
export const FROST_GROW = 13;
const FROST_FADE = 2.2;

/** When stage `i` begins to fade in: quick at first, slowing as the frost reaches out. */
export function stageDelay(i: number): number {
  return Math.round((FROST_GROW - FROST_FADE) * Math.pow(i / (STAGES - 1), 1.35) * 100) / 100;
}

/**
 * How a piece is drawn: `line` a stroke; `fill` a solid shape; `grain` a shape speckled like rime;
 * `satin` a shape with the soft even finish of acid-etched glass; `soft` a shape blurred at its edges
 * and grained, like a frosted band.
 */
export type FrostKind = 'line' | 'fill' | 'grain' | 'satin' | 'soft';
const KINDS: readonly FrostKind[] = ['soft', 'satin', 'grain', 'fill', 'line'];

/**
 * A piece of a frost drawing in window pixels: an SVG fragment for a mask, the stage of the growth it
 * forms in, and the x-span it covers, so a margin's mask holds only what can be seen in it.
 */
export interface FrostPiece {
  stage: number;
  x0: number;
  x1: number;
  kind: FrostKind;
  svg: string;
}

/** Defs every frost mask shares: the rime's edge gradients and the grain of frosted glass. */
const FROST_DEFS =
  '<linearGradient id="rT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<linearGradient id="rB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<linearGradient id="rL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<linearGradient id="rR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
  '<radialGradient id="rC"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
  // Grain: fine speckle (a crystal's scale, not a cloud's), multiplied into the shape.
  '<filter id="g" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" result="n"/>' +
  '<feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.4 -.62" result="s"/>' +
  '<feComposite in="SourceGraphic" in2="s" operator="arithmetic" k1=".95" k2=".3"/></filter>' +
  // Satin: etched glass, an even frosting with only a whisper of grain.
  '<filter id="s" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="n"/>' +
  '<feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -.4" result="s"/>' +
  '<feComposite in="SourceGraphic" in2="s" operator="arithmetic" k1=".35" k2=".72"/></filter>' +
  // Soft: a frosted band's edge, blurred, then grained.
  '<filter id="b" x="-.1" y="-.1" width="1.2" height="1.2"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="bl"/>' +
  '<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="n"/>' +
  '<feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2 -.45" result="s"/>' +
  '<feComposite in="bl" in2="s" operator="arithmetic" k1=".8" k2=".45"/></filter>';

const KIND_GROUP: Record<FrostKind, string> = {
  line: '<g fill="none" stroke="#fff" stroke-linecap="round">',
  fill: '<g fill="#fff">',
  grain: '<g fill="#fff" filter="url(#g)">',
  satin: '<g fill="#fff" filter="url(#s)">',
  soft: '<g fill="#fff" filter="url(#b)">',
};

/** The rime that hugs the window's four edges, and its corners, as stage-`stage` pieces. */
function rimeEdge(vw: number, vh: number, w: number, stage: number, o: number): FrostPiece[] {
  const g = (x0: number, x1: number, svg: string): FrostPiece => ({ stage, x0, x1, kind: 'grain', svg });
  const c = w * 4.5;
  return [
    g(0, vw, `<rect x="0" y="0" width="${r1(vw)}" height="${r1(w)}" fill="url(#rT)" fill-opacity="${o}"/>`),
    g(0, vw, `<rect x="0" y="${r1(vh - w)}" width="${r1(vw)}" height="${r1(w)}" fill="url(#rB)" fill-opacity="${o}"/>`),
    g(0, w, `<rect x="0" y="0" width="${r1(w)}" height="${r1(vh)}" fill="url(#rL)" fill-opacity="${o}"/>`),
    g(vw - w, vw, `<rect x="${r1(vw - w)}" y="0" width="${r1(w)}" height="${r1(vh)}" fill="url(#rR)" fill-opacity="${o}"/>`),
    ...[
      [0, 0],
      [vw, 0],
      [0, vh],
      [vw, vh],
    ].map(([x, y]) => g((x as number) - c, (x as number) + c, `<circle cx="${r1(x as number)}" cy="${r1(y as number)}" r="${r1(c)}" fill="url(#rC)" fill-opacity="${o}"/>`)),
  ];
}

/** The four corners: where each is, and which way is into the glass. */
const cornersOf = (vw: number, vh: number): [number, number, number, number][] => [
  [0, 0, 1, 1],
  [vw, 0, -1, 1],
  [0, vh, 1, -1],
  [vw, vh, -1, -1],
];

/**
 * Fern frost: dendrites grown in from the edges and the corners, crisp white-blue lines. Each fern
 * is a stem with pinnae at sixty degrees (ice's own angle), each pinna barbed with shorter needles,
 * longest at the base and tapering to the tip. A thin rime band hugs the edge first; the ferns then
 * reach in, stage by stage, by their distance from where they began.
 */
export function fernFrost(vw: number, vh: number, seed = 17): FrostPiece[] {
  const rand = lcg(seed);
  const short = Math.min(vw, vh);
  const reach = clamp(short * 0.36, 150, 380);
  const stageOf = (d: number): number => Math.min(STAGES - 1, 1 + Math.floor((d / reach) * (STAGES - 1)));
  const pieces: FrostPiece[] = rimeEdge(vw, vh, 9, 0, 0.7);
  // Barb, pinna, stem: finer and fainter toward the tips.
  const CLS = [
    { w: 0.55, o: 0.45 },
    { w: 0.8, o: 0.66 },
    { w: 1.2, o: 0.88 },
  ] as const;
  const SIXTY = Math.PI / 3;

  const fern = (sx: number, sy: number, ang0: number, len: number, d0: number, forks: number): void => {
    // One path per stage, stroke class and 64 px column of the window, so a margin's mask takes only
    // the parts of a fern that fall in it.
    const acc = new Map<number, { d: string; x0: number; x1: number; stage: number; cls: number }>();
    const seg = (cls: number, ax: number, ay: number, bx: number, by: number, dist: number): void => {
      const stage = stageOf(dist);
      const key = (Math.floor(ax / 64) + 100) * 1000 + stage * 3 + cls;
      let a = acc.get(key);
      if (!a) acc.set(key, (a = { d: '', x0: Infinity, x1: -Infinity, stage, cls }));
      a.d += `M${r1(ax)} ${r1(ay)}l${r1(bx - ax)} ${r1(by - ay)}`;
      a.x0 = Math.min(a.x0, ax, bx);
      a.x1 = Math.max(a.x1, ax, bx);
    };
    const pinna = (x: number, y: number, ang: number, pl: number, pd: number): void => {
      const n = Math.max(2, Math.round(pl / 7));
      const s = pl / n;
      let t = 0;
      let side = rand() < 0.5 ? 1 : -1;
      let nextBarb = 2 + rand() * 2;
      for (let i = 0; i < n; i++) {
        const nx = x + Math.cos(ang) * s;
        const ny = y + Math.sin(ang) * s;
        seg(1, x, y, nx, ny, pd + t + s);
        while (nextBarb <= t + s && nextBarb < pl - 1.5) {
          const bx = x + Math.cos(ang) * (nextBarb - t);
          const by = y + Math.sin(ang) * (nextBarb - t);
          const bl = Math.min(pl * 0.42, (pl - nextBarb) * 0.5 + 1.2) * (0.55 + rand() * 0.6);
          const ba = ang + side * (SIXTY + (rand() - 0.5) * 0.25);
          seg(0, bx, by, bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl, pd + nextBarb + bl);
          side = -side;
          nextBarb += 3 + rand() * 2.6;
        }
        x = nx;
        y = ny;
        t += s;
        ang += (rand() - 0.5) * 0.07;
      }
    };
    let x = sx;
    let y = sy;
    let ang = ang0;
    let t = 0;
    const bend = (rand() - 0.5) * 0.006;
    let nextPinna = 3 + rand() * 4;
    let side = rand() < 0.5 ? 1 : -1;
    while (t < len) {
      const s = Math.min(6, len - t);
      const nx = x + Math.cos(ang) * s;
      const ny = y + Math.sin(ang) * s;
      seg(2, x, y, nx, ny, d0 + t + s);
      x = nx;
      y = ny;
      t += s;
      ang += bend * s + (rand() - 0.5) * 0.035;
      while (nextPinna <= t && t < len - 2) {
        const left = len - t;
        const pl = Math.min(len * 0.34, left * 0.62 + 4) * (0.7 + rand() * 0.5);
        pinna(x, y, ang + side * (SIXTY + (rand() - 0.5) * 0.3), pl, d0 + t);
        if (rand() < 0.55) pinna(x, y, ang - side * (SIXTY + (rand() - 0.5) * 0.3), pl * (0.75 + rand() * 0.3), d0 + t);
        side = -side;
        nextPinna += 7 + rand() * 6;
        if (forks > 0 && t > len * 0.25 && rand() < 0.05) {
          fern(x, y, ang + side * (0.42 + rand() * 0.3), left * (0.5 + rand() * 0.35), d0 + t, forks - 1);
        }
      }
    }
    for (const a of acc.values()) {
      const cls = CLS[a.cls] as (typeof CLS)[number];
      pieces.push({ stage: a.stage, x0: a.x0, x1: a.x1, kind: 'line', svg: `<path d="${a.d}" stroke-width="${cls.w}" stroke-opacity="${cls.o}"/>` });
    }
  };

  // The corners: two or three long ferns from each, fanned out toward the middle of the glass.
  for (const [cx, cy, sx, sy] of cornersOf(vw, vh)) {
    const n = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < n; i++) {
      const along = 6 + rand() * 30;
      const onX = i % 2 === 0;
      const x = cx + (onX ? sx * along : 0);
      const y = cy + (onX ? 0 : sy * along);
      // Spread across the corner: in screen terms, from along one edge to along the other.
      const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.05;
      const ang = Math.atan2(sy * (1 + spread), sx * (1 - spread));
      fern(x, y, ang + (rand() - 0.5) * 0.2, reach * (0.6 + rand() * 0.4), 0, 1);
    }
  }
  // The edges: shorter ferns all along, longer toward the corners.
  const edge = (len: number, at: (u: number) => [number, number], normal: number): void => {
    let u = 14 + rand() * 30;
    while (u < len - 14) {
      const mid = Math.min(u, len - u) / (len / 2);
      const fl = (20 + rand() * 46) * (1 + (1 - mid) * 0.9) * clamp(short / 900, 0.75, 1.25);
      const [x, y] = at(u);
      fern(x, y, normal + (rand() - 0.5) * 1.0, fl, 0, 0);
      u += 28 + rand() * 46;
    }
  };
  edge(vw, (u) => [u, 0], Math.PI / 2);
  edge(vw, (u) => [u, vh], -Math.PI / 2);
  edge(vh, (u) => [0, u], 0);
  edge(vh, (u) => [vw, u], Math.PI);
  return pieces;
}

/**
 * Etched glass: the frost grows as the Deco fans of a speakeasy door's etched panel. A sunburst in
 * each corner (a frosted quarter-disc, alternate wedges frosted to a stepped double arc, the rest
 * stepped beyond it), a frosted border with a hairline inside it all round, and a small fan on the
 * edge every so often. It forms outward by radius, the fans unfolding.
 */
export function etchedFrost(vw: number, vh: number): FrostPiece[] {
  const short = Math.min(vw, vh);
  const R = clamp(short * 0.4, 170, 420);
  const S = STAGES - 1;
  const pieces: FrostPiece[] = [];
  const add = (stage: number, kind: FrostPiece['kind'], xs: number[], svg: string): void => {
    pieces.push({ stage, x0: Math.min(...xs), x1: Math.max(...xs), kind, svg });
  };

  /** A fan at (cx, cy): polar to window pixels, its quarter or half turned by `rot`, mirrored by sx, sy. */
  const fan = (cx: number, cy: number, sx: number, sy: number, rot: number) => {
    const P = (r: number, th: number): [number, number] => [cx + sx * r * Math.cos(th + rot), cy + sy * r * Math.sin(th + rot)];
    const sweep = sx * sy > 0 ? 1 : 0;
    const pt = (p: [number, number]): string => `${r1(p[0])} ${r1(p[1])}`;
    /** An annular wedge, split into the stages its radius crosses. */
    const wedge = (rA: number, rB: number, th0: number, th1: number, scale: number, first: number, o: number): void => {
      const bands = S - first + 1;
      for (let j = 0; j < bands; j++) {
        const lo = Math.max(rA, (scale * j) / bands);
        const hi = Math.min(rB, (scale * (j + 1)) / bands);
        if (hi <= lo) continue;
        const a = P(lo, th0);
        const b = P(hi, th0);
        const c = P(hi, th1);
        const d = P(lo, th1);
        const large = th1 - th0 > Math.PI ? 1 : 0;
        const path =
          lo < 0.5
            ? `M${pt(P(0, 0))}L${pt(b)}A${r1(hi)} ${r1(hi)} 0 ${large} ${sweep} ${pt(c)}Z`
            : `M${pt(a)}L${pt(b)}A${r1(hi)} ${r1(hi)} 0 ${large} ${sweep} ${pt(c)}L${pt(d)}A${r1(lo)} ${r1(lo)} 0 ${large} ${1 - sweep} ${pt(a)}Z`;
        add(first + j, 'satin', [a[0], b[0], c[0], d[0], P(hi, (th0 + th1) / 2)[0]], `<path d="${path}" fill-opacity="${o}"/>`);
      }
    };
    const ray = (rA: number, rB: number, th: number, scale: number, first: number, o: number, w: number): void => {
      const bands = S - first + 1;
      for (let j = 0; j < bands; j++) {
        const lo = Math.max(rA, (scale * j) / bands);
        const hi = Math.min(rB, (scale * (j + 1)) / bands);
        if (hi <= lo) continue;
        const a = P(lo, th);
        const b = P(hi, th);
        add(first + j, 'line', [a[0], b[0]], `<path d="M${pt(a)}L${pt(b)}" stroke-width="${w}" stroke-opacity="${o}"/>`);
      }
    };
    const arc = (r: number, th0: number, th1: number, stage: number, o: number, w: number): void => {
      const a = P(r, th0);
      const b = P(r, th1);
      const xs = [a[0], b[0], P(r, (th0 + th1) / 2)[0], P(r, th0 + (th1 - th0) * 0.25)[0], P(r, th0 + (th1 - th0) * 0.75)[0]];
      add(stage, 'line', xs, `<path d="M${pt(a)}A${r1(r)} ${r1(r)} 0 ${th1 - th0 > Math.PI ? 1 : 0} ${sweep} ${pt(b)}" stroke-width="${w}" stroke-opacity="${o}"/>`);
    };
    return { wedge, ray, arc };
  };

  // The corners: a sunburst each.
  for (const [cx, cy, sx, sy] of cornersOf(vw, vh)) {
    const f = fan(cx, cy, sx, sy, 0);
    const Q = Math.PI / 2;
    const r0 = R * 0.13;
    const stageAt = (r: number): number => Math.min(S, 1 + Math.floor((r / R) * S));
    f.wedge(0, r0, 0, Q, R, 1, 0.36);
    f.arc(r0 + 4, 0, Q, stageAt(r0 + 4), 0.8, 1.1);
    const N = 15;
    const da = Q / N;
    for (let k = 0; k < N; k++) {
      const th0 = k * da;
      const th1 = th0 + da;
      if (k % 2 === 0) f.wedge(r0 + 9, R * 0.5, th0 + 0.004, th1 - 0.004, R, 1, 0.2);
      else f.wedge(R * 0.57, R * (k % 4 === 1 ? 1 : 0.8), th0 + 0.004, th1 - 0.004, R, 1, 0.15);
      f.ray(r0 + 9, k % 2 === 0 ? R * 0.53 : R * 0.55, th0, R, 1, 0.6, 0.8);
    }
    f.arc(R * 0.53, 0, Q, stageAt(R * 0.53), 0.7, 1);
    f.arc(R * 0.555, 0, Q, stageAt(R * 0.555), 0.5, 0.7);
    f.arc(R * 1.02, 0, Q, S, 0.35, 0.7);
  }

  // The border: frosted, with a hairline inside it.
  const b = 6;
  const g = (x0: number, x1: number, svg: string): void => add(0, 'satin', [x0, x1], svg);
  g(0, vw, `<rect x="0" y="0" width="${r1(vw)}" height="${b}" fill-opacity=".4"/>`);
  g(0, vw, `<rect x="0" y="${r1(vh - b)}" width="${r1(vw)}" height="${b}" fill-opacity=".4"/>`);
  g(0, b, `<rect x="0" y="0" width="${b}" height="${r1(vh)}" fill-opacity=".4"/>`);
  g(vw - b, vw, `<rect x="${r1(vw - b)}" y="0" width="${b}" height="${r1(vh)}" fill-opacity=".4"/>`);
  const i = 11;
  add(1, 'line', [i, vw - i], `<rect x="${i}" y="${i}" width="${r1(vw - 2 * i)}" height="${r1(vh - 2 * i)}" stroke-width=".8" stroke-opacity=".55"/>`);

  // Small fans along the edges, clear of the corners' sunbursts.
  const rf = clamp(short * 0.075, 42, 82);
  const edgeFans = (len: number, at: (u: number) => [number, number, number, number, number]): void => {
    const from = R * 1.08 + rf;
    const span = len - 2 * from;
    if (span < 0) return;
    const n = Math.max(1, Math.round(span / 250) + 1);
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? len / 2 : from + (span * k) / (n - 1);
      const [x, y, sx, sy, rot] = at(u);
      const f = fan(x, y, sx, sy, rot);
      const H = Math.PI;
      const st = (r: number): number => Math.min(S, 1 + Math.floor((r / rf) * (S - 2)));
      f.wedge(0, rf * 0.22, 0, H, rf, 1, 0.36);
      const N = 9;
      for (let j = 0; j < N; j++) {
        const th0 = (j * H) / N;
        if (j % 2 === 0) f.wedge(rf * 0.3, rf * (j % 4 === 0 ? 1 : 0.78), th0 + 0.01, th0 + H / N - 0.01, rf, 2, 0.2);
        else f.ray(rf * 0.3, rf * 0.9, th0 + H / N / 2, rf, 2, 0.5, 0.7);
      }
      f.arc(rf * 1.08, 0, H, st(rf * 1.08), 0.5, 0.8);
    }
  };
  // (rot turns the half-fan to open into the glass: the top edge's opens down, and so on.)
  edgeFans(vw, (u) => [u, 0, 1, 1, 0]);
  edgeFans(vw, (u) => [u, vh, 1, -1, 0]);
  edgeFans(vh, (u) => [0, u, 1, 1, -Math.PI / 2]);
  edgeFans(vh, (u) => [vw, u, -1, 1, -Math.PI / 2]);
  return pieces;
}

/**
 * Rime: a soft frosted band along the window's edges, thicker in the corners and uneven along its
 * length, built up in stages so it creeps inward; and in it fine six-armed crystals, some of which
 * catch the light (`rimeGlints`).
 */
export function rimeFrost(vw: number, vh: number, seed = 31): FrostPiece[] {
  const rand = lcg(seed);
  const short = Math.min(vw, vh);
  const base = clamp(short * 0.036, 16, 40);
  const S = STAGES - 1;
  const pieces: FrostPiece[] = [];
  const p1 = rand() * 6.3;
  const p2 = rand() * 6.3;
  const p3 = rand() * 6.3;
  // Uneven along its length, not a wave: three incommensurate swells.
  const width = (u: number): number =>
    base * (1 + 0.22 * Math.sin(u / 97 + p1) + 0.14 * Math.sin(u / 37.3 + p2) + 0.08 * Math.sin(u / 13.1 + p3));
  // The band, in S layers each reaching a little further: layered, it is thickest at the edge.
  for (let j = 0; j < S; j++) {
    const k = (j + 1) / S;
    const along = (len: number, pt: (u: number, d: number) => [number, number]): string => {
      let d = `M${r1(pt(0, 0)[0])} ${r1(pt(0, 0)[1])}`;
      for (let u = 0; u <= len + 12; u += 12) {
        const [x, y] = pt(Math.min(u, len), width(u) * k);
        d += `L${r1(x)} ${r1(y)}`;
      }
      const [ex, ey] = pt(len, 0);
      return `${d}L${r1(ex)} ${r1(ey)}Z`;
    };
    const o = 0.095;
    pieces.push({ stage: j, x0: 0, x1: vw, kind: 'soft', svg: `<path d="${along(vw, (u, d) => [u, d])}" fill-opacity="${o}"/>` });
    pieces.push({ stage: j, x0: 0, x1: vw, kind: 'soft', svg: `<path d="${along(vw, (u, d) => [u, vh - d])}" fill-opacity="${o}"/>` });
    pieces.push({ stage: j, x0: 0, x1: base * 1.6, kind: 'soft', svg: `<path d="${along(vh, (u, d) => [d, u])}" fill-opacity="${o}"/>` });
    pieces.push({ stage: j, x0: vw - base * 1.6, x1: vw, kind: 'soft', svg: `<path d="${along(vh, (u, d) => [vw - d, u])}" fill-opacity="${o}"/>` });
    const c = base * 2.8 * k;
    for (const [x, y] of cornersOf(vw, vh)) {
      pieces.push({ stage: j, x0: x - c, x1: x + c, kind: 'soft', svg: `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(c)}" fill="url(#rC)" fill-opacity="${o * 1.6}"/>` });
    }
  }
  // The crystals: six arms each, denser toward the edge.
  const star = (x: number, y: number, r: number, depth: number, o: number): void => {
    const a0 = rand() * Math.PI;
    let d = '';
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i * Math.PI) / 3;
      d += `M${r1(x - Math.cos(a) * r)} ${r1(y - Math.sin(a) * r)}L${r1(x + Math.cos(a) * r)} ${r1(y + Math.sin(a) * r)}`;
    }
    const stage = Math.min(S, Math.floor((depth / (base * 1.4)) * S) + 1);
    pieces.push({ stage, x0: x - r, x1: x + r, kind: 'line', svg: `<path d="${d}" stroke-width=".6" stroke-opacity="${r2(o)}"/>` });
  };
  const sprinkle = (len: number, pt: (u: number, d: number) => [number, number]): void => {
    for (let u = 4; u < len; u += 7 + rand() * 7) {
      const depth = width(u) * 1.35 * Math.pow(rand(), 1.7);
      const [x, y] = pt(u, depth);
      star(x, y, 1.2 + rand() * 2.6 * (1 - depth / (base * 2.2)), depth, 0.45 + rand() * 0.45);
    }
  };
  sprinkle(vw, (u, d) => [u, d]);
  sprinkle(vw, (u, d) => [u, vh - d]);
  sprinkle(vh, (u, d) => [d, u]);
  sprinkle(vh, (u, d) => [vw - d, u]);
  return pieces;
}

/**
 * The rime's glints: four-pointed catch-lights on some of its crystals, in `sheets` sheets (the
 * piece's `stage` is its sheet), each sheet flashing on its own slow clock.
 */
export function rimeGlints(vw: number, vh: number, sheets = 5, seed = 43): FrostPiece[] {
  const rand = lcg(seed);
  const base = clamp(Math.min(vw, vh) * 0.036, 16, 40);
  const pieces: FrostPiece[] = [];
  const glint = (x: number, y: number, sheet: number): void => {
    const L = 3.5 + rand() * 5.5;
    const k = L * 0.12;
    const d =
      `M${r1(x)} ${r1(y - L)}Q${r1(x + k)} ${r1(y - k)} ${r1(x + L)} ${r1(y)}Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + L)}` +
      `Q${r1(x - k)} ${r1(y + k)} ${r1(x - L)} ${r1(y)}Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - L)}Z`;
    pieces.push({ stage: sheet, x0: x - L, x1: x + L, kind: 'fill', svg: `<path d="${d}"/><circle cx="${r1(x)}" cy="${r1(y)}" r="1.1"/>` });
  };
  // Dealt round the sheets in turn, so every sheet has its share.
  let dealt = 0;
  const sprinkle = (len: number, pt: (u: number, d: number) => [number, number]): void => {
    for (let u = 20 + rand() * 120; u < len - 8; u += 90 + rand() * 170) {
      const [x, y] = pt(u, base * (0.15 + rand() * 0.9));
      glint(x, y, dealt++ % sheets);
    }
  };
  sprinkle(vw, (u, d) => [u, d]);
  sprinkle(vw, (u, d) => [u, vh - d]);
  sprinkle(vh, (u, d) => [d, u]);
  sprinkle(vh, (u, d) => [vw - d, u]);
  return pieces;
}

/** The pieces of the chosen frost for a window this size. */
export function frostFor(look: FrostLook, vw: number, vh: number): FrostPiece[] {
  return look === 'etched' ? etchedFrost(vw, vh) : look === 'rime' ? rimeFrost(vw, vh) : fernFrost(vw, vh);
}

/**
 * One margin's mask, of the pieces whose stage `pick` takes: an SVG whose view box is the margin, so
 * the element it masks is the margin's size, in window pixels. Null when nothing of it falls there.
 */
export function frostMask(pieces: readonly FrostPiece[], zone: Span, vh: number, pick: (stage: number) => boolean): string | null {
  const [a, b] = zone;
  const out: Record<FrostKind, string[]> = { line: [], fill: [], grain: [], satin: [], soft: [] };
  let any = false;
  for (const p of pieces) {
    if (!pick(p.stage) || p.x1 < a - 2 || p.x0 > b + 2) continue;
    out[p.kind].push(p.svg);
    any = true;
  }
  if (!any) return null;
  const w = b - a;
  return svgUrl(
    `<svg xmlns="${SVG}" width="${r1(w)}" height="${r1(vh)}" viewBox="${r1(a)} 0 ${r1(w)} ${r1(vh)}" preserveAspectRatio="none"><defs>${FROST_DEFS}</defs>` +
      KINDS.map((k) => (out[k].length ? `${KIND_GROUP[k]}${out[k].join('')}</g>` : '')).join('') +
      '</svg>',
  );
}

/* ------------------------------------------------------------- the sign */

/** The sign's letters, as single neon tubes in a 30 by 40 box. */
const GLYPHS: Record<string, string> = {
  H: 'M5 4V36M25 4V36M5 20H25',
  O: 'M15 4C8 4 5 10 5 20S8 36 15 36S25 30 25 20S22 4 15 4Z',
  T: 'M4 4H26M15 4V36',
  E: 'M25 4H5V36H25M5 20H21',
  L: 'M5 4V36H25',
};
export const SIGN_WORD = 'HOTEL';
/** Room around a letter's box for its glow to spread into, in the letter's own units. */
const GLOW_ROOM = 48;

/** How a night blurs the tubes: the core's blur, and the inner and outer glow's, [x, y] in letter units. */
export interface TubeBlur {
  core: [number, number];
  inner: [number, number];
  outer: [number, number];
}

/** Crisp on a clear night; drawn into vertical streaks by the rain; spread by fog; diffused by frost. */
export const TUBE_BLUR: Record<Weather, TubeBlur> = {
  clear: { core: [0.3, 0.3], inner: [1.6, 1.6], outer: [5.5, 5.5] },
  rain: { core: [0.7, 3.2], inner: [1.8, 8], outer: [4.5, 16] },
  fog: { core: [1.6, 1.6], inner: [4, 4], outer: [12, 12] },
  cold: { core: [1.1, 1.1], inner: [2.8, 2.8], outer: [8, 8] },
};

/** One letter's tube as a mask: its bright core, or the glow around it. */
export function tubeMask(ch: string, part: 'core' | 'glow', blur: TubeBlur): string {
  const d = GLYPHS[ch] ?? GLYPHS['O'];
  const P = GLOW_ROOM;
  const f = (id: string, [x, y]: [number, number]): string =>
    `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-P}" y="${-P}" width="${30 + 2 * P}" height="${40 + 2 * P}"><feGaussianBlur stdDeviation="${x} ${y}"/></filter>`;
  const body =
    part === 'core'
      ? `<path d="${d}" stroke-width="2" filter="url(#c)"/>`
      : `<path d="${d}" stroke-width="4.5" stroke-opacity=".85" filter="url(#i)"/><path d="${d}" stroke-width="9" stroke-opacity=".5" filter="url(#o)"/>`;
  return svgUrl(
    `<svg xmlns="${SVG}" width="${30 + 2 * P}" height="${40 + 2 * P}" viewBox="${-P} ${-P} ${30 + 2 * P} ${40 + 2 * P}">` +
      `<defs>${f('c', blur.core)}${f('i', blur.inner)}${f('o', blur.outer)}</defs>` +
      `<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`,
  );
}

/** Where the sign hangs, in window pixels: just past the left edge, its letters stacked downward. */
export interface Sign {
  /** The letter boxes' left edge (negative: most of each letter is beyond the window's edge). */
  x: number;
  top: number;
  /** A letter's height; a letter is three quarters as wide. */
  h: number;
  gap: number;
  /** Top to bottom of the five letters. */
  bottom: number;
  middle: number;
}

export function signFor(vh: number): Sign {
  const h = Math.round(clamp(vh * 0.05, 30, 46));
  const gap = Math.round(h * 0.3);
  const top = Math.round(vh * 0.19);
  const bottom = top + SIGN_WORD.length * h + (SIGN_WORD.length - 1) * gap;
  return { x: -Math.round(h * 0.42), top, h, gap, bottom, middle: (top + bottom) / 2 };
}

/** The sign's light on the glass, by night: how far it reaches (px), how tall (of the height), how bright. */
export const WASH: Record<Weather, { rx: number; ry: number; o: number }> = {
  clear: { rx: 220, ry: 0.34, o: 0.34 },
  rain: { rx: 160, ry: 0.56, o: 0.3 },
  fog: { rx: 480, ry: 0.72, o: 0.32 },
  cold: { rx: 200, ry: 0.4, o: 0.24 },
};

/** The light-only take is all wash; through the wet glass, less of it is on the glass and more in the wet. */
const WASH_TAKE: Record<NeonLook, number> = { hotel: 1, light: 1.45, wet: 0.65 };

/** How far into the window the sign's light can reach on a night: a margin past this has none. */
export function neonReach(weather: Weather): number {
  return WASH[weather].rx * 1.25;
}

/* ------------------------------------------------------------- the layer */

export interface WeatherLayer {
  /** The layer itself, for the book to put inside the spread. */
  readonly element: HTMLElement;
  /** Put the layer in `parent` if it is not there already (it keeps running). */
  attach(parent: HTMLElement): void;
  /** The night showing, or null for none. */
  show(weather: Weather | null): void;
  /** The reader's switch. */
  setEnabled(on: boolean): void;
  readonly enabled: boolean;
  /** Measure the columns again and re-cut the margins if they moved. */
  relayout(): void;
  /** What is showing now. */
  effects(): Effects;
  /** The night's own weather, as the book last showed it (the lab's "roll"). */
  readonly night: Weather | null;
  /** The versions showing (the lab). */
  readonly look: WeatherLook;
  /** The lab: choose a version. The frost grows again. */
  setLook(look: Partial<WeatherLook>): void;
  /** The lab: show this weather whatever the night rolled; null gives the night back. */
  force(weather: Weather | null): void;
  /** The lab: the reduced-motion version, whatever the system says. */
  still(on: boolean): void;
  /** The lab: start the night's weather again (the frost regrows). */
  restart(): void;
  /** The lab: flicker the sign now. */
  flicker(kind?: 'buzz' | 'letter' | 'drop'): void;
}

const TILES = {
  far: () => rainTile(180, 420, 24, 11, [12, 22], 0.8),
  near: () => rainTile(260, 560, 15, 29, [26, 46], 1.1),
  // The sign's light running down the glass in the wet: long, slow rivulets.
  rivulets: () => rainTile(90, 300, 7, 53, [50, 130], 1.4),
  beads: () => beadTile(220, 300, 30, 61),
  beadsB: () => beadTile(190, 340, 24, 67),
};

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

/** A neon colour at a strength, for a gradient. */
const neon = (pct: number, token = '--wx-neon'): string => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

/**
 * The layer is not one sheet over the window but one strip per margin, each clipped to its margin.
 * A sheet over the window would overlap the text, and the browser would lift the text over it into a
 * layer of its own and rasterize it differently; strips that never overlap a column leave every word
 * as it was. Inside each strip a window-sized view keeps the fog, the frost and the sign's light in
 * one coordinate system, so the margins read as one window.
 */
export function createWeatherLayer(opts: { enabled: boolean; look?: Partial<WeatherLook> }): WeatherLayer {
  const layer = div('weather');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset['weather'] = 'none';
  layer.hidden = true;
  let weather: Weather | null = null;
  let forced: Weather | null = null;
  let stillOn = false;
  let enabled = opts.enabled;
  let look: WeatherLook = { ...DEFAULT_LOOK, ...opts.look };
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let current: Effects = NO_EFFECTS;
  let effectsKey = '';
  /** When this night's weather began, so a re-cut carries on where it was. */
  let since = 0;
  let zones: Span[] = [];
  let zonesKey = '';
  let timer: number | undefined;
  let flickerTimer: number | undefined;
  const textures: Partial<Record<keyof typeof TILES, string>> = {};
  const tile = (k: keyof typeof TILES): string => (textures[k] ||= TILES[k]());
  let frostCache: { key: string; pieces: FrostPiece[]; glints: FrostPiece[] } | null = null;

  const narrow = (): boolean => window.innerWidth < 600;
  const effects = (): Effects =>
    effectsFor(forced ?? weather, {
      enabled,
      reducedMotion: stillOn || (reduce?.matches ?? false),
      narrow: narrow(),
      rain: look.rain,
    });

  /* ---- steam */

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

  /* ---- the sign's flicker */

  function stopFlicker(): void {
    if (flickerTimer !== undefined) window.clearTimeout(flickerTimer);
    flickerTimer = undefined;
  }

  function scheduleFlicker(first: boolean): void {
    stopFlicker();
    const f = current.flicker;
    if (!f || !current.neon || document.hidden || !layer.isConnected) return;
    // The first comes sooner, so a short visit still sees the sign stutter once.
    const wait = (first ? 6 + Math.random() * 10 : f.minGap + Math.random() * (f.maxGap - f.minGap)) * 1000;
    flickerTimer = window.setTimeout(() => {
      flicker();
      scheduleFlicker(false);
    }, wait);
  }

  /**
   * A flicker: a buzz (the tube stutters for half a second), one letter out for a beat, or the whole
   * tube out for a beat and back. The light on the glass goes with it: it is all in `.wx-flick`.
   */
  function flicker(kind?: 'buzz' | 'letter' | 'drop'): void {
    const groups = [...layer.querySelectorAll<HTMLElement>('.wx-flick')];
    if (groups.length === 0) return;
    const letters = [...layer.querySelectorAll<HTMLElement>('.wx-letter')];
    const r = Math.random();
    const k = kind ?? (r < 0.45 ? 'buzz' : r < 0.8 && letters.length > 0 ? 'letter' : 'drop');
    if (k === 'letter' && letters.length > 0) {
      const i = String(Math.floor(Math.random() * SIGN_WORD.length));
      const out = 900 + Math.random() * 1400;
      for (const el of letters) {
        if (el.dataset['i'] !== i) continue;
        el.animate(
          [
            { opacity: 1 },
            { opacity: 0.12, offset: 0.03 },
            { opacity: 1, offset: 0.06 },
            { opacity: 0.05, offset: 0.1 },
            { opacity: 0.05, offset: 0.82 },
            { opacity: 0.7, offset: 0.85 },
            { opacity: 0.15, offset: 0.88 },
            { opacity: 1, offset: 0.92 },
            { opacity: 1 },
          ],
          { duration: out + 400, easing: 'linear' },
        );
      }
      return;
    }
    const frames =
      k === 'drop'
        ? [
            { opacity: 1 },
            { opacity: 0.25, offset: 0.04 },
            { opacity: 1, offset: 0.08 },
            { opacity: 0.08, offset: 0.13 },
            { opacity: 0.08, offset: 0.7 },
            { opacity: 0.6, offset: 0.75 },
            { opacity: 0.2, offset: 0.8 },
            { opacity: 1, offset: 0.86 },
            { opacity: 1 },
          ]
        : [
            { opacity: 1 },
            { opacity: 0.35, offset: 0.12 },
            { opacity: 0.95, offset: 0.2 },
            { opacity: 0.25, offset: 0.34 },
            { opacity: 0.85, offset: 0.46 },
            { opacity: 0.45, offset: 0.6 },
            { opacity: 1, offset: 0.72 },
            { opacity: 1 },
          ];
    const duration = k === 'drop' ? 1300 + Math.random() * 700 : 480 + Math.random() * 260;
    for (const g of groups) g.animate(frames, { duration, easing: 'linear' });
  }

  /* ---- measuring */

  /** Measure the pages' text; the margins are what it leaves. */
  function measure(): { zones: Span[]; width: number } {
    const width = document.documentElement.clientWidth || window.innerWidth;
    const columns: Span[] = [];
    for (const page of document.querySelectorAll<HTMLElement>('.spread .page, .title-sheet .title-page')) {
      const r = page.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(page);
      const left = r.left + page.clientLeft + parseFloat(cs.paddingLeft);
      const right = r.left + page.clientLeft + page.clientWidth - parseFloat(cs.paddingRight);
      const children: ChildBox[] = [];
      for (const child of page.children) {
        const c = child.getBoundingClientRect();
        const pos = getComputedStyle(child).position;
        children.push({ left: c.left, right: c.right, out: c.width === 0 || c.height === 0 || pos === 'absolute' || pos === 'fixed' });
      }
      columns.push(pageColumn([r.left, r.right], [left, right], children));
    }
    // A margin under six pixels wide is not worth a strip.
    return { zones: marginZones(columns, width).filter(([a, b]) => b - a >= 6), width };
  }

  /* ---- building */

  /** The sign itself, beyond the glass: five letters of tube, or none. */
  function signEl(sign: Sign, w: Weather): HTMLElement | null {
    if (look.neon === 'light') return null;
    const s = div('wx-sign');
    const k = sign.h / 40;
    const P = GLOW_ROOM * k;
    const blur = TUBE_BLUR[w];
    [...SIGN_WORD].forEach((ch, i) => {
      const letter = div('wx-letter');
      letter.dataset['i'] = String(i);
      style(letter, {
        left: `${r1(sign.x - P)}px`,
        top: `${r1(sign.top + i * (sign.h + sign.gap) - P)}px`,
        width: `${r1((30 + 2 * GLOW_ROOM) * k)}px`,
        height: `${r1((40 + 2 * GLOW_ROOM) * k)}px`,
      });
      const glow = div('wx-tube wx-tube--glow');
      mask(glow, tubeMask(ch, 'glow', blur));
      letter.append(glow);
      // Through the wet glass the tube is hardly there: its glow only.
      if (look.neon === 'hotel') {
        const core = div('wx-tube wx-tube--core');
        mask(core, tubeMask(ch, 'core', blur));
        letter.append(core);
      }
      s.append(letter);
    });
    return s;
  }

  /** The sign's light beyond the glass: the wash, the edge, the letters (in the first margin only). */
  function litOut(w: Weather, sign: Sign, vh: number, a: number): HTMLElement {
    const lit = div('wx-lit');
    const flick = div('wx-flick');
    lit.append(flick);
    const wash = div('wx-wash');
    const { rx, ry, o } = WASH[w];
    const cy = sign.middle;
    style(wash, {
      width: `${Math.round(rx * 1.3)}px`,
      opacity: r2(o * WASH_TAKE[look.neon]),
      background: `radial-gradient(${rx}px ${Math.round(ry * vh)}px at ${-Math.round(rx * 0.06)}px ${Math.round(cy)}px, ${neon(100)}, ${neon(46)} 26%, ${neon(14)} 58%, transparent)`,
    });
    flick.append(wash);
    // The edge and the tubes are at the window's edge: only a margin that starts there shows them.
    if (a < 1) {
      const edge = div('wx-edge');
      style(edge, { top: `${Math.round(sign.top - sign.h * 1.5)}px`, height: `${Math.round(sign.bottom - sign.top + sign.h * 3)}px` });
      flick.append(edge);
      const s = signEl(sign, w);
      if (s) flick.append(s);
    }
    return lit;
  }

  /**
   * The sign's light in the glass itself, over the frost: its reflection (the wet-glass take's main
   * thing, a trace in the others), and on a rain night its colour running down in rivulets.
   */
  function litOn(w: Weather, sign: Sign, vh: number): HTMLElement | null {
    const parts: HTMLElement[] = [];
    if (look.neon === 'wet') {
      // Smears of the sign in the glass: tall soft strokes of its colour, longer when wet.
      const reflect = div('wx-reflect');
      const tall = w === 'rain' ? 1.9 : w === 'fog' ? 1.3 : w === 'cold' ? 0.8 : 1;
      const wide = w === 'fog' ? 3.2 : w === 'cold' ? 1.6 : 1;
      const y = sign.middle;
      const h = (sign.bottom - sign.top) * 0.55 * tall;
      const smear = (x: number, rw: number, rh: number, dy: number, pct: number): string =>
        `radial-gradient(${r1(rw * wide)}px ${r1(rh)}px at ${r1(x)}px ${r1(y + dy)}px, ${neon(pct)}, ${neon(pct * 0.35)} 45%, transparent)`;
      style(reflect, {
        background: [
          smear(10, 9, h, h * 0.12, 70),
          smear(30, 6, h * 0.8, h * 0.3, 55),
          smear(52, 10, h * 0.65, h * 0.05, 34),
          smear(78, 7, h * 0.5, h * 0.4, 24),
        ].join(', '),
      });
      parts.push(reflect);
    }
    if (w === 'rain') {
      const reach = look.neon === 'wet' ? 300 : 190;
      const riv = div('wx-rivulets');
      style(riv, { width: `${reach}px`, top: `${Math.round(sign.top - sign.h)}px`, height: `${Math.round(vh - sign.top + sign.h)}px` });
      mask(riv, `linear-gradient(to right, #000, rgba(0,0,0,.55) 35%, transparent)`);
      const sheet = div('wx-rivulet');
      mask(sheet, tile('rivulets'));
      riv.append(sheet);
      parts.push(riv);
    }
    if (parts.length === 0) return null;
    const lit = div('wx-lit wx-lit--on');
    const flick = div('wx-flick');
    flick.append(...parts);
    lit.append(flick);
    return lit;
  }

  /** The drops on the glass: beads, and a few running down. Near the sign they carry its colour. */
  function drops(zone: Span, origin: number): HTMLElement {
    const [a, b] = zone;
    const w = b - a;
    const box = div('wx-drops');
    const beads = div('wx-beads');
    mask(beads, tile('beads'));
    const beadsB = div('wx-beads wx-beads--b');
    mask(beadsB, tile('beadsB'));
    box.append(beads, beadsB);
    const rand = lcg(Math.round(a * 7 + w * 13));
    const n = clamp(Math.round(w / 60), 1, 5);
    for (let i = 0; i < n; i++) {
      const run = div(`wx-run wx-run--${'abc'[i % 3]}`);
      const x = ((i + 0.2 + rand() * 0.6) / n) * w;
      const wx = a + x - origin;
      const dur = 6 + rand() * 7;
      style(run, {
        left: `${r1(x)}px`,
        top: `${Math.round(rand() * 45)}%`,
        'animation-duration': `${r1(dur)}s`,
        'animation-delay': `${r1(-rand() * dur)}s`,
        '--trail': `${Math.round(50 + rand() * 110)}px`,
      });
      // Near the sign, its light rides down in the drop.
      if (wx < 150) {
        style(run, { '--run': `color-mix(in srgb, var(--wx-neon) ${Math.round(70 - (wx / 150) * 40)}%, var(--wx-drop))` });
      }
      run.append(div('wx-run-trail'), div('wx-run-head'));
      box.append(run);
    }
    return box;
  }

  /** Cut one strip per margin and fill each with tonight's weather. */
  function cut(width: number): void {
    while (layer.firstChild) layer.firstChild.remove();
    const w = current.weather;
    if (!w) return;
    // The strips are placed in the layer's own box, which starts at the window's left edge
    // (or, where the spread cannot let it out sideways, at the spread's).
    const origin = layer.getBoundingClientRect().left;
    // Everything that runs on a clock starts as far in as this night already is.
    style(layer, { '--wx-age': `${-Math.round(performance.now() - since) / 1000}s` });
    const vw = window.innerWidth;
    const vh = Math.round(layer.getBoundingClientRect().height || window.innerHeight);
    const sign = signFor(Math.min(vh, window.innerHeight));
    const reach = neonReach(w);
    let frost: FrostPiece[] = [];
    let glints: FrostPiece[] = [];
    if (current.frost) {
      const key = `${look.frost}:${vw}x${vh}`;
      if (frostCache?.key !== key) {
        frostCache = { key, pieces: frostFor(look.frost, vw, vh), glints: look.frost === 'rime' ? rimeGlints(vw, vh) : [] };
      }
      frost = frostCache.pieces;
      glints = frostCache.glints;
    }
    for (const zone of zones) {
      const [a, b] = zone;
      const near = current.neon && a < reach;
      const strip = div('wx-strip');
      style(strip, { left: `${a - origin}px`, width: `${b - a}px` });
      // A wide feather: the weather is thickest at the window's edge and thins all the way to the
      // text, rather than stopping at a line.
      mask(strip, stripMask(zone, width, width < 600 ? 8 : 30));
      const view = div('wx-view');
      style(view, { left: `${-a}px`, width: `${vw}px` });
      // Beyond the glass: the sign and its light, then the fog between it and us.
      if (near && a < WASH[w].rx * 1.3) view.append(litOut(w, sign, vh, a));
      if (current.fog) view.append(div('wx-haze'), div('wx-pool'), div('wx-fog-a'), div('wx-fog-b'));
      // On the glass: the frost, stage by stage; near the sign, its crystals take the light.
      const place = (el: HTMLElement): void => style(el, { left: `${a}px`, width: `${b - a}px` });
      const lit = (el: HTMLElement): void => {
        if (!near) return;
        const glow = div('wx-lit wx-frost-lit');
        const flick = div('wx-flick');
        style(flick, {
          background: `radial-gradient(${Math.round(reach * 1.1)}px ${Math.round(vh * 0.5)}px at ${-a}px ${Math.round(sign.middle)}px, ${neon(85)}, ${neon(45)} 35%, transparent 80%)`,
        });
        glow.append(flick);
        el.append(glow);
      };
      for (let s = 0; s < STAGES && frost.length; s++) {
        const m = frostMask(frost, zone, vh, (x) => x === s);
        if (!m) continue;
        const stage = div('wx-stage');
        place(stage);
        style(stage, { '--d': `${stageDelay(s)}s` });
        mask(stage, m);
        lit(stage);
        view.append(stage);
      }
      for (let s = 0; s < 5 && glints.length; s++) {
        const m = frostMask(glints, zone, vh, (x) => x === s);
        if (!m) continue;
        const g = div(`wx-glint wx-glint--${s}`);
        place(g);
        mask(g, m);
        lit(g);
        view.append(g);
      }
      if (near) {
        const on = litOn(w, sign, vh);
        if (on) view.append(on);
      }
      if (view.childNodes.length > 0) strip.append(view);
      if (current.rain) {
        const rain = div('wx-rain');
        for (const depth of ['far', 'near'] as const) {
          const sheet = div(`wx-sheet wx-sheet--${depth}`);
          mask(sheet, tile(depth));
          rain.append(sheet);
        }
        strip.append(rain);
      }
      if (current.drops) strip.append(drops(zone, origin));
      layer.append(strip);
    }
  }

  function build(force = false): void {
    const next = effects();
    const key = JSON.stringify(next) + JSON.stringify(look);
    if (key === effectsKey && !force) return;
    effectsKey = key;
    current = next;
    since = performance.now();
    stopSteam();
    stopFlicker();
    layer.dataset['weather'] = next.weather ?? 'none';
    layer.dataset['motion'] = String(next.motion);
    layer.dataset['steam'] = String(next.steam !== null);
    layer.dataset['frost'] = look.frost;
    layer.dataset['neon'] = look.neon;
    layer.dataset['hue'] = look.hue;
    layer.dataset['rain'] = look.rain;
    layer.hidden = next.weather === null;
    zonesKey = '';
    if (next.weather === null) {
      while (layer.firstChild) layer.firstChild.remove();
      return;
    }
    relayout();
    scheduleSteam(true);
    scheduleFlicker(true);
  }

  function relayout(): void {
    if (!layer.isConnected || layer.hidden) return;
    const m = measure();
    const vh = Math.round(layer.getBoundingClientRect().height);
    const key = `${m.width}x${window.innerHeight}x${vh}:${m.zones.map((z) => z.join('-')).join(',')}`;
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
      // Crossing into a phone's width changes what is drawn, not only where.
      if (current.weather !== null && effects().fog !== current.fog) build();
      else relayout();
    });
  };
  window.addEventListener('resize', onResize, { passive: true });
  // The phone's notebook is a class on the body, not a render.
  new MutationObserver(onResize).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => {
    layer.dataset['paused'] = String(document.hidden);
    if (document.hidden) {
      stopSteam();
      stopFlicker();
    } else {
      scheduleSteam(false);
      scheduleFlicker(false);
    }
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
      if (flickerTimer === undefined) scheduleFlicker(true);
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
    get night() {
      return weather;
    },
    get look() {
      return look;
    },
    setLook(l) {
      look = { ...look, ...l };
      build(true);
    },
    force(w) {
      forced = w;
      build(true);
    },
    still(on) {
      stillOn = on;
      build(true);
    },
    restart() {
      build(true);
    },
    flicker: (kind) => flicker(kind),
  };
}
