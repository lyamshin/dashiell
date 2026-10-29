/**
 * The weather on the window (docs/27).
 *
 * Every night rolls its weather (`run.weather`) and the prose already says what it is. The screen
 * agrees, as if the book were read at a window: on a rain night drops run down the glass and rain
 * falls beyond it; on a cold one rime creeps in from the window's edges and its crystals glint; fog
 * pools low; now and then a wisp of steam rises off a manhole cover. And every night a HOTEL sign
 * hangs just past the window's left edge, its argon-blue tubes cropped by the edge. It hums, now and
 * then it flickers, and the night changes how it reads: crisp when it's clear, smeared into streaks
 * and running down the wet glass in the rain, haloed by fog, caught in the rime.
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
 * The reader's one control is the pager's switch: weather on, still, or off. Still is the
 * reduced-motion version: the rime formed at once, the sign steady (no hum, no flicker), the fog
 * still; no rain, no steam. The system's `prefers-reduced-motion` makes "on" still.
 */

import type { KeyValueStore } from '../game/board/profile.js';
import type { Weather } from '../game/board/types.js';

/* ------------------------------------------------------------- the switch */

export const WEATHER_KEY = 'dashiell:weather';

/** The pager's switch: the weather moving, held still, or not there at all. */
export type WeatherMode = 'on' | 'still' | 'off';

/** On unless the reader chose still or off. Anything else, and a store that throws, reads as on. */
export function loadWeatherMode(store: KeyValueStore): WeatherMode {
  try {
    const v = store.getItem(WEATHER_KEY);
    return v === 'still' || v === 'off' ? v : 'on';
  } catch {
    return 'on';
  }
}

/** Remember the switch. A store that throws forgets it; the switch still works for the page's life. */
export function saveWeatherMode(store: KeyValueStore, mode: WeatherMode): void {
  try {
    store.setItem(WEATHER_KEY, mode);
  } catch {
    /* blocked or full storage: the setting lasts as long as the page */
  }
}

/** What the switch shows: the reader's choice, except that the system's reduced motion makes on still. */
export function shownMode(mode: WeatherMode, reducedMotion: boolean): WeatherMode {
  return reducedMotion && mode === 'on' ? 'still' : mode;
}

/**
 * The switch's next state, from what it shows: on, still, off, on. Under the system's reduced motion
 * there is no on to offer, so it goes between still and off.
 */
export function nextMode(mode: WeatherMode, reducedMotion: boolean): WeatherMode {
  const shown = shownMode(mode, reducedMotion);
  if (shown === 'on') return 'still';
  if (shown === 'still') return 'off';
  return reducedMotion ? 'still' : 'on';
}

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
  /** Rain falling beyond the glass, in slanted streaks. Only while it moves. */
  rain: boolean;
  /** Drops beading on the glass and running down it. Only while it moves. */
  drops: boolean;
  /** Rime on the glass, grown in from the edges over the first seconds (or formed, still). */
  frost: boolean;
  /** Fog pooled low in the margins, drifting (or still). */
  fog: boolean;
  /** The sign outside the window: every night, read through its weather. */
  neon: boolean;
  /** How often the sign flickers. Only while it moves. */
  flicker: Flicker | null;
  /** Now and then a wisp from the bottom edge. Only while it moves. */
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
 * included. Still, and the system's reduced motion, keep what can be still (rime, fog, a steady sign)
 * and drop what cannot (rain, steam, the flicker). `narrow` is a phone, whose only margins are the
 * 16 px gutters: there the sign's light at the edge carries the night, and a cold night's rime; rain,
 * fog and steam would be a flicker of noise in a strip that thin, so they aren't drawn.
 */
export function effectsFor(weather: Weather | null, opts: { mode: WeatherMode; reducedMotion: boolean; narrow?: boolean }): Effects {
  if (weather === null || opts.mode === 'off') return NO_EFFECTS;
  const motion = opts.mode === 'on' && !opts.reducedMotion;
  const wide = !opts.narrow;
  const wet = weather === 'rain' && motion && wide;
  return {
    weather,
    rain: wet,
    drops: wet,
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

/* ------------------------------------------------------------- the rime */

/** The rime forms in this many steps, inward from the edges, each fading in over `FROST_FADE`. */
export const STAGES = 9;
/** Seconds from the first rime to its last reach. */
export const FROST_GROW = 13;
const FROST_FADE = 2.2;

/** When stage `i` begins to fade in: quick at first, slowing as the rime reaches in. */
export function stageDelay(i: number): number {
  return Math.round((FROST_GROW - FROST_FADE) * Math.pow(i / (STAGES - 1), 1.35) * 100) / 100;
}

/** How a piece is drawn: `line` a stroke; `fill` a solid shape; `soft` a frosted shape, blurred and grained. */
export type FrostKind = 'line' | 'fill' | 'soft';
const KINDS: readonly FrostKind[] = ['soft', 'fill', 'line'];

/**
 * A piece of the rime in window pixels: an SVG fragment for a mask, the stage of the growth it forms
 * in, and the x-span it covers, so a margin's mask holds only what can be seen in it.
 */
export interface FrostPiece {
  stage: number;
  x0: number;
  x1: number;
  kind: FrostKind;
  svg: string;
}

/** Defs every rime mask shares: a corner's radial falloff, and the frosted band's blur and grain. */
const FROST_DEFS =
  '<radialGradient id="rC"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
  // Soft: blurred at its edge, then grained at a crystal's scale (fine speckle, not a cloud's mottle).
  '<filter id="b" x="-.1" y="-.1" width="1.2" height="1.2"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="bl"/>' +
  '<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="7" result="n"/>' +
  '<feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2 -.45" result="s"/>' +
  '<feComposite in="bl" in2="s" operator="arithmetic" k1=".8" k2=".45"/></filter>';

const KIND_GROUP: Record<FrostKind, string> = {
  line: '<g fill="none" stroke="#fff" stroke-linecap="round">',
  fill: '<g fill="#fff">',
  soft: '<g fill="#fff" filter="url(#b)">',
};

/** The four corners: where each is, and which way is into the glass. */
const cornersOf = (vw: number, vh: number): [number, number, number, number][] => [
  [0, 0, 1, 1],
  [vw, 0, -1, 1],
  [0, vh, 1, -1],
  [vw, vh, -1, -1],
];

/** The band's depth along an edge: 2.2% to 4% of the window's short side, uneven along its length. */
const rimeBase = (vw: number, vh: number): number => clamp(Math.min(vw, vh) * 0.036, 16, 40);

/**
 * Rime: a soft frosted band along the window's edges, thicker in the corners and uneven along its
 * length, built up in stages so it creeps inward; and in it fine six-armed crystals, some of which
 * catch the light (`rimeGlints`).
 */
export function rimeFrost(vw: number, vh: number, seed = 31): FrostPiece[] {
  const rand = lcg(seed);
  const base = rimeBase(vw, vh);
  const S = STAGES - 1;
  const pieces: FrostPiece[] = [];
  const p1 = rand() * 6.3;
  const p2 = rand() * 6.3;
  const p3 = rand() * 6.3;
  // Uneven along its length, not a wave: three incommensurate swells.
  const width = (u: number): number =>
    base * (1 + 0.22 * Math.sin(u / 97 + p1) + 0.14 * Math.sin(u / 37.3 + p2) + 0.08 * Math.sin(u / 13.1 + p3));
  // The band, in S layers each reaching a little further: layered, it is thickest at the edge. Each
  // edge is cut into 240 px lengths, so a margin's mask holds only the lengths that fall in it (the
  // stage's blur is over the whole group, so the cuts don't show).
  const CHUNK = 240;
  for (let j = 0; j < S; j++) {
    const k = (j + 1) / S;
    const o = 0.095;
    const band = (len: number, pt: (u: number, d: number) => [number, number]): void => {
      for (let c0 = 0; c0 < len; c0 += CHUNK) {
        const c1 = Math.min(len, c0 + CHUNK);
        const [sx, sy] = pt(c0, 0);
        let d = `M${r1(sx)} ${r1(sy)}`;
        let x0 = sx;
        let x1 = sx;
        for (let u = c0; ; u = Math.min(c1, u + 12)) {
          const [x, y] = pt(u, width(u) * k);
          d += `L${r1(x)} ${r1(y)}`;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          if (u >= c1) break;
        }
        const [ex, ey] = pt(c1, 0);
        pieces.push({ stage: j, x0: Math.min(x0, ex), x1: Math.max(x1, ex), kind: 'soft', svg: `<path d="${d}L${r1(ex)} ${r1(ey)}Z" fill-opacity="${o}"/>` });
      }
    };
    band(vw, (u, d) => [u, d]);
    band(vw, (u, d) => [u, vh - d]);
    band(vh, (u, d) => [d, u]);
    band(vh, (u, d) => [vw - d, u]);
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
  const base = rimeBase(vw, vh);
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

/**
 * One margin's mask, of the pieces whose stage `pick` takes: an SVG whose view box is the margin, so
 * the element it masks is the margin's size, in window pixels. Null when nothing of it falls there.
 */
export function frostMask(pieces: readonly FrostPiece[], zone: Span, vh: number, pick: (stage: number) => boolean): string | null {
  const [a, b] = zone;
  const out: Record<FrostKind, string[]> = { line: [], fill: [], soft: [] };
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

/** How far into the window the sign's light can reach on a night: a margin past this has none. */
export function neonReach(weather: Weather): number {
  return WASH[weather].rx * 1.25;
}

/* ------------------------------------------------------------- the layer */

/** The event the layer sends when what the switch should show changes under it (the system's setting). */
export const SHOWN_EVENT = 'wx-shown';

export interface WeatherLayer {
  /** The layer itself, for the book to put inside the spread. */
  readonly element: HTMLElement;
  /** Put the layer in `parent` if it is not there already (it keeps running). */
  attach(parent: HTMLElement): void;
  /** The night showing, or null for none. */
  show(weather: Weather | null): void;
  /** The reader's switch. */
  setMode(mode: WeatherMode): void;
  readonly mode: WeatherMode;
  /** What the switch shows: the reader's mode, or still when the system asks for reduced motion. */
  readonly shown: WeatherMode;
  /** Whether the system asks for reduced motion (then the switch offers still and off). */
  readonly reducedBySystem: boolean;
  /** Measure the columns again and re-cut the margins if they moved. */
  relayout(): void;
  /** What is showing now. */
  effects(): Effects;
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

/** The sign's colour at a strength, for a gradient. */
const neon = (pct: number): string => `color-mix(in srgb, var(--wx-neon) ${pct}%, transparent)`;

/**
 * The layer is not one sheet over the window but one strip per margin, each clipped to its margin.
 * A sheet over the window would overlap the text, and the browser would lift the text over it into a
 * layer of its own and rasterize it differently; strips that never overlap a column leave every word
 * as it was. Inside each strip a window-sized view keeps the fog, the rime and the sign's light in
 * one coordinate system, so the margins read as one window.
 */
export function createWeatherLayer(opts: { mode: WeatherMode }): WeatherLayer {
  const layer = div('weather');
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset['weather'] = 'none';
  layer.hidden = true;
  let weather: Weather | null = null;
  let mode = opts.mode;
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

  const reducedBySystem = (): boolean => reduce?.matches ?? false;
  const narrow = (): boolean => window.innerWidth < 600;
  const effects = (): Effects => effectsFor(weather, { mode, reducedMotion: reducedBySystem(), narrow: narrow() });

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
  function flicker(): void {
    if (!current.flicker) return;
    const groups = [...layer.querySelectorAll<HTMLElement>('.wx-flick')];
    if (groups.length === 0) return;
    const letters = [...layer.querySelectorAll<HTMLElement>('.wx-letter')];
    const r = Math.random();
    const kind = r < 0.45 ? 'buzz' : r < 0.8 && letters.length > 0 ? 'letter' : 'drop';
    if (kind === 'letter') {
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
      kind === 'drop'
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
    const duration = kind === 'drop' ? 1300 + Math.random() * 700 : 480 + Math.random() * 260;
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

  /** The sign itself, beyond the glass: five letters of tube, each a glow and a core. */
  function signEl(sign: Sign, w: Weather): HTMLElement {
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
      const core = div('wx-tube wx-tube--core');
      mask(core, tubeMask(ch, 'core', blur));
      letter.append(glow, core);
      s.append(letter);
    });
    return s;
  }

  /** The sign's light beyond the glass: the wash, the edge, the letters (in the first margin only). Hums; flickers. */
  function litOut(w: Weather, sign: Sign, vh: number, a: number): HTMLElement {
    const lit = div('wx-lit');
    const flick = div('wx-flick');
    lit.append(flick);
    const wash = div('wx-wash');
    const { rx, ry, o } = WASH[w];
    style(wash, {
      width: `${Math.round(rx * 1.3)}px`,
      opacity: r2(o),
      background: `radial-gradient(${rx}px ${Math.round(ry * vh)}px at ${-Math.round(rx * 0.06)}px ${Math.round(sign.middle)}px, ${neon(100)}, ${neon(46)} 26%, ${neon(14)} 58%, transparent)`,
    });
    flick.append(wash);
    // The edge and the tubes are at the window's edge: only a margin that starts there shows them.
    if (a < 1) {
      const edge = div('wx-edge');
      style(edge, { top: `${Math.round(sign.top - sign.h * 1.5)}px`, height: `${Math.round(sign.bottom - sign.top + sign.h * 3)}px` });
      flick.append(edge, signEl(sign, w));
    }
    return lit;
  }

  /**
   * A rain night: the sign's light in the wet glass itself, over everything beyond it. Smears of its
   * colour in the glass, longest below the sign, and its colour running down in rivulets. (It rides
   * in the drops near it too: `drops`.)
   */
  function litWet(sign: Sign, vh: number): HTMLElement {
    const reflect = div('wx-reflect');
    const y = sign.middle;
    const h = (sign.bottom - sign.top) * 0.55 * 1.9;
    const smear = (x: number, rw: number, rh: number, dy: number, pct: number): string =>
      `radial-gradient(${r1(rw)}px ${r1(rh)}px at ${r1(x)}px ${r1(y + dy)}px, ${neon(pct)}, ${neon(pct * 0.35)} 45%, transparent)`;
    style(reflect, {
      background: [smear(10, 9, h, h * 0.12, 70), smear(30, 6, h * 0.8, h * 0.3, 55), smear(52, 10, h * 0.65, h * 0.05, 34), smear(78, 7, h * 0.5, h * 0.4, 24)].join(', '),
    });
    const riv = div('wx-rivulets');
    style(riv, { width: '300px', top: `${Math.round(sign.top - sign.h)}px`, height: `${Math.round(vh - sign.top + sign.h)}px` });
    mask(riv, 'linear-gradient(to right, #000, rgba(0,0,0,.55) 35%, transparent)');
    const sheet = div('wx-rivulet');
    mask(sheet, tile('rivulets'));
    riv.append(sheet);
    const lit = div('wx-lit wx-lit--on');
    const flick = div('wx-flick');
    flick.append(reflect, riv);
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
      const key = `${vw}x${vh}`;
      if (frostCache?.key !== key) frostCache = { key, pieces: rimeFrost(vw, vh), glints: rimeGlints(vw, vh) };
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
      // On the glass: the rime, stage by stage; near the sign, its crystals take the light.
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
      if (near && w === 'rain') view.append(litWet(sign, vh));
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

  function build(): void {
    const next = effects();
    const key = JSON.stringify(next);
    if (key === effectsKey) return;
    effectsKey = key;
    current = next;
    since = performance.now();
    stopSteam();
    stopFlicker();
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
  reduce?.addEventListener?.('change', () => {
    build();
    layer.dispatchEvent(new Event(SHOWN_EVENT));
  });

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
    setMode(m) {
      mode = m;
      build();
    },
    get mode() {
      return mode;
    },
    get shown() {
      return shownMode(mode, reducedBySystem());
    },
    get reducedBySystem() {
      return reducedBySystem();
    },
    relayout,
    effects: () => current,
  };
}
