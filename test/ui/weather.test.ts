import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/game/board/profile.js';
import {
  BUILDINGS,
  BY_PLACE,
  DAWN_FROM,
  FIRST_LIGHT,
  SIGNS_OFF,
  VARIATIONS,
  buildingOf,
  hourOf,
  isWarm,
  lightLevel,
  viewFor,
  FLICKER,
  FROST_GROW,
  NO_EFFECTS,
  STAGES,
  TUBE_BLUR,
  WASH,
  WEATHER_KEY,
  effectsFor,
  frostMask,
  loadWeatherMode,
  marginZones,
  neonReach,
  nextMode,
  pageColumn,
  rimeFrost,
  rimeGlints,
  saveWeatherMode,
  shownMode,
  signFor,
  stageDelay,
  stripMask,
} from '../../src/ui/weather.js';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const blocked: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

const ON = { mode: 'on', reducedMotion: false } as const;
const NIGHTS = ['clear', 'rain', 'fog', 'cold'] as const;

describe('weather: the night to the screen', () => {
  it('rain runs, cold frosts, fog pools, and the sign is there every night', () => {
    expect(effectsFor('rain', ON)).toMatchObject({ weather: 'rain', rain: true, drops: true, frost: false, fog: false, neon: true, motion: true });
    expect(effectsFor('cold', ON)).toMatchObject({ weather: 'cold', rain: false, drops: false, frost: true, fog: false, neon: true });
    expect(effectsFor('fog', ON)).toMatchObject({ weather: 'fog', rain: false, drops: false, frost: false, fog: true, neon: true });
    // A clear night's main effect is the sign, crisp.
    expect(effectsFor('clear', ON)).toMatchObject({ weather: 'clear', rain: false, drops: false, frost: false, fog: false, neon: true });
  });

  it('the sign flickers every 20 to 60 seconds, on every night', () => {
    expect(FLICKER).toEqual({ minGap: 20, maxGap: 60 });
    for (const w of NIGHTS) expect(effectsFor(w, ON).flicker).toEqual(FLICKER);
  });

  it('steam on any night, most often on a cold one, least on a clear one', () => {
    const gap = (w: (typeof NIGHTS)[number]): number => effectsFor(w, ON).steam?.maxGap ?? Infinity;
    for (const w of NIGHTS) expect(effectsFor(w, ON).steam).not.toBeNull();
    expect(gap('cold')).toBeLessThan(gap('rain'));
    expect(gap('cold')).toBeLessThan(gap('fog'));
    expect(gap('clear')).toBeGreaterThan(gap('rain'));
    expect(effectsFor('clear', ON).steam?.strength ?? 0).toBeLessThan(1);
  });

  it('no night shows nothing', () => {
    expect(effectsFor(null, ON)).toEqual(NO_EFFECTS);
  });

  it('switched off shows nothing, whatever the night, the sign included', () => {
    for (const w of NIGHTS) {
      for (const reducedMotion of [false, true]) expect(effectsFor(w, { mode: 'off', reducedMotion })).toEqual(NO_EFFECTS);
      expect(effectsFor(w, { mode: 'off', reducedMotion: false }).neon).toBe(false);
    }
  });

  it('"weather still" is exactly the reduced-motion version, on every night and every screen', () => {
    for (const w of NIGHTS) {
      for (const narrow of [false, true]) {
        const still = effectsFor(w, { mode: 'still', reducedMotion: false, narrow });
        expect(still).toEqual(effectsFor(w, { mode: 'on', reducedMotion: true, narrow }));
        expect(still).toEqual(effectsFor(w, { mode: 'still', reducedMotion: true, narrow }));
        expect(still.motion).toBe(false);
      }
    }
  });

  it('reduced motion keeps the still things (rime, fog, a steady sign) and drops the moving ones', () => {
    const still = { mode: 'on', reducedMotion: true } as const;
    expect(effectsFor('rain', still)).toMatchObject({ rain: false, drops: false, steam: null, flicker: null, neon: true, motion: false });
    expect(effectsFor('cold', still)).toMatchObject({ frost: true, steam: null, flicker: null, neon: true, motion: false });
    expect(effectsFor('fog', still)).toMatchObject({ fog: true, steam: null, flicker: null, neon: true, motion: false });
    expect(effectsFor('clear', still)).toMatchObject({ neon: true, flicker: null, motion: false });
  });

  it('on a phone the gutters keep the sign and the frost; no rain, fog or steam in a strip that thin', () => {
    const phone = { ...ON, narrow: true };
    expect(effectsFor('rain', phone)).toMatchObject({ rain: false, drops: false, steam: null, neon: true, flicker: FLICKER });
    expect(effectsFor('fog', phone)).toMatchObject({ fog: false, steam: null, neon: true });
    expect(effectsFor('cold', phone)).toMatchObject({ frost: true, steam: null, neon: true });
  });
});

describe('weather: the switch, on, still and off', () => {
  it('is on until changed, and remembers on, still and off under the same key', () => {
    const store = memoryStore();
    expect(loadWeatherMode(store)).toBe('on');
    for (const m of ['still', 'off', 'on'] as const) {
      saveWeatherMode(store, m);
      expect(store.data.get(WEATHER_KEY)).toBe(m);
      expect(loadWeatherMode(store)).toBe(m);
    }
  });

  it('reads anything it does not know as on (the old "on" and "off" still mean what they meant)', () => {
    const store = memoryStore();
    for (const [v, m] of [['off', 'off'], ['on', 'on'], ['still', 'still'], ['', 'on'], ['STILL', 'on'], ['true', 'on']] as const) {
      store.data.set(WEATHER_KEY, v);
      expect(loadWeatherMode(store), v).toBe(m);
    }
  });

  it('survives a blocked store: reads as on, saving does not throw', () => {
    expect(loadWeatherMode(blocked)).toBe('on');
    expect(() => saveWeatherMode(blocked, 'still')).not.toThrow();
  });

  it('cycles on, still, off, on', () => {
    expect(nextMode('on', false)).toBe('still');
    expect(nextMode('still', false)).toBe('off');
    expect(nextMode('off', false)).toBe('on');
    for (const m of ['on', 'still', 'off'] as const) expect(shownMode(m, false)).toBe(m);
  });

  it('under the system’s reduced motion it shows still for on, and goes between still and off', () => {
    expect(shownMode('on', true)).toBe('still');
    expect(shownMode('still', true)).toBe('still');
    expect(shownMode('off', true)).toBe('off');
    expect(nextMode('on', true)).toBe('off');
    expect(nextMode('still', true)).toBe('off');
    expect(nextMode('off', true)).toBe('still');
  });
});

describe('weather: only on the glass around the book', () => {
  it('the margins are what the columns leave', () => {
    expect(
      marginZones(
        [
          [65, 625],
          [724, 1215],
        ],
        1280,
      ),
    ).toEqual([
      [0, 65],
      [625, 724],
      [1215, 1280],
    ]);
    expect(marginZones([[16, 374]], 390)).toEqual([
      [0, 16],
      [374, 390],
    ]);
    // Overlapping and out-of-range columns are merged and clamped.
    expect(
      marginZones(
        [
          [-5, 100],
          [90, 200],
        ],
        300,
      ),
    ).toEqual([[200, 300]]);
  });

  it('a page’s column is its content box, widened to a child that reaches into its padding, with air', () => {
    // 1280: the prose page [0, 691], content [49.4, 641.8]; the choices' panel reaches to 33.
    expect(pageColumn([0, 691], [49.4, 641.8], [{ left: 49, right: 642 }, { left: 33, right: 658 }])).toEqual([31, 660]);
    // The skip link, parked out of the flow above the page, does not count.
    expect(pageColumn([0, 691], [49.4, 641.8], [{ left: 16, right: 238, out: true }])).toEqual([47, 644]);
  });

  it('a band as wide as the page (a phone’s choices panel) has its own ground: the gutters stay', () => {
    expect(pageColumn([0, 375], [16, 359], [{ left: 16, right: 359 }, { left: 0, right: 375 }])).toEqual([14, 361]);
    expect(marginZones([pageColumn([0, 375], [16, 359], [{ left: 0, right: 375 }])], 375)).toEqual([
      [0, 14],
      [361, 375],
    ]);
  });

  it('a strip feathers only on a side that meets a column, never at the window edge', () => {
    // The left margin of a desktop spread: the window edge, then the prose.
    expect(stripMask([0, 65], 1280, 18)).toBe('linear-gradient(to right, #000 0px, #000 47px, transparent 65px)');
    // The gutter between the pages meets text on both sides.
    expect(stripMask([625, 724], 1280, 18)).toBe(
      'linear-gradient(to right, transparent 0px, #000 18px, #000 81px, transparent 99px)',
    );
    // The right margin: text, then the window edge.
    expect(stripMask([1215, 1280], 1280, 18)).toBe('linear-gradient(to right, transparent 0px, #000 18px, #000 65px)');
    // A phone's 16 pixel gutter feathers over half its width at most.
    expect(stripMask([0, 16], 390, 10)).toBe('linear-gradient(to right, #000 0px, #000 8px, transparent 16px)');
    expect(stripMask([0, 390], 390)).toBe('none');
  });
});

describe('weather: the frost grows in from the edges, then is still', () => {
  it('forms in steps over the first seconds: quick at first, slowing as it reaches', () => {
    expect(stageDelay(0)).toBe(0);
    const delays = Array.from({ length: STAGES }, (_, i) => stageDelay(i));
    for (let i = 1; i < STAGES; i++) expect(delays[i] as number).toBeGreaterThan(delays[i - 1] as number);
    expect(delays[STAGES - 1] as number).toBeGreaterThan(8);
    expect(delays[STAGES - 1] as number).toBeLessThanOrEqual(FROST_GROW);
    expect(FROST_GROW).toBeGreaterThanOrEqual(10);
    expect(FROST_GROW).toBeLessThanOrEqual(15);
  });

  it('the rime has a piece in every stage, inside the window, and draws the same every time', () => {
    for (const [vw, vh] of [[1280, 800], [1512, 982], [1920, 1080], [375, 812]] as const) {
      const pieces = rimeFrost(vw, vh);
      const stages = new Set(pieces.map((p) => p.stage));
      for (let s = 0; s < STAGES; s++) expect(stages.has(s), `${vw} stage ${s}`).toBe(true);
      for (const p of pieces) {
        expect(p.x0).toBeGreaterThan(-200);
        expect(p.x1).toBeLessThan(vw + 200);
      }
      expect(rimeFrost(vw, vh)).toEqual(pieces);
    }
  });

  it('it begins at the window’s edges: the first stage touches them', () => {
    const first = rimeFrost(1920, 1080).filter((p) => p.stage === 0);
    expect(first.length).toBeGreaterThan(0);
    expect(first.some((p) => p.x0 <= 1)).toBe(true);
    expect(first.some((p) => p.x1 >= 1919)).toBe(true);
  });

  it('a margin’s mask is the margin’s own size, and holds only what falls in it', () => {
    const pieces = rimeFrost(1920, 1080);
    const left = frostMask(pieces, [0, 250], 1080, () => true) ?? '';
    expect(left).toContain("viewBox='0 0 250 1080'");
    const gutter = frostMask(pieces, [972, 1039], 1080, () => true) ?? '';
    expect(gutter).toContain("viewBox='972 0 67 1080'");
    // The left edge's rime is not in the gutter's mask, nor the top and bottom edges' beyond it.
    expect(gutter.length).toBeLessThan(left.length);
    expect(frostMask(pieces, [972, 1039], 1080, () => false)).toBeNull();
  });

  it('the rime’s glints flash in a handful of sheets', () => {
    const glints = rimeGlints(1512, 982);
    const sheets = new Set(glints.map((g) => g.stage));
    expect(sheets.size).toBe(5);
    expect(glints.length).toBeGreaterThan(10);
  });
});

describe('weather: the sign outside the window', () => {
  it('hangs just past the left edge: its tubes partly in the window, partly beyond it', () => {
    for (const vh of [812, 982, 1080]) {
      const sign = signFor(vh);
      expect(sign.x).toBeLessThan(0);
      expect(sign.x + sign.h * 0.75).toBeGreaterThan(0);
      expect(sign.top).toBeGreaterThan(0);
      expect(sign.bottom).toBeLessThan(vh * 0.75);
    }
  });

  it('each night reads it differently: crisp clear, drawn down by rain, haloed by fog, diffused by frost', () => {
    const [cx, cy] = TUBE_BLUR.clear.core;
    const [rx, ry] = TUBE_BLUR.rain.core;
    expect(cx).toBe(cy);
    expect(ry).toBeGreaterThan(rx * 3);
    expect(TUBE_BLUR.fog.outer[0]).toBeGreaterThan(TUBE_BLUR.clear.outer[0] * 2);
    expect(TUBE_BLUR.cold.core[0]).toBeGreaterThan(TUBE_BLUR.clear.core[0]);
    // The rain draws its light into a tall streak; the fog spreads it widest.
    expect(WASH.rain.ry).toBeGreaterThan(WASH.clear.ry);
    expect(neonReach('fog')).toBeGreaterThan(neonReach('clear') * 1.8);
  });
});

describe('weather: its colours are none of the book’s meanings', () => {
  const src = (f: string): string => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  // sRGB to CIE Lab (D65), for a perceptual distance between two colours.
  const lab = (h: string): [number, number, number] => {
    const [r, g, b] = hex(h).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const dE = (a: string, b: string): number => {
    const [p, q] = [lab(a), lab(b)];
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };

  it('the sign is far from the law’s red, the clock’s amber, the choices’ jade and lacquer, and the carbon', () => {
    const root = /:root \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    const tok = (name: string): string => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1] as string;
    const meanings = ['accent', 'amber', 'jade', 'lacquer-line', 'carbon'].map(tok);
    const neons = [...src('src/ui/weather.css').matchAll(/--wx-neon: (#[0-9a-f]{6});/g)].map((m) => m[1] as string);
    expect(neons.length).toBeGreaterThan(0);
    for (const n of neons) for (const m of meanings) expect(dE(n, m), `${n} vs ${m}`).toBeGreaterThan(30);
  });

  it('the lamp, the gas mantle, the cold bulb and the headlamps are pale: low in chroma, far from every meaning', () => {
    const root = /:root \{([\s\S]*?)\n\}/.exec(src('src/ui/book.css'))?.[1] ?? '';
    const tok = (name: string): string => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(root)?.[1] as string;
    const meanings = ['accent', 'amber', 'jade', 'lacquer-line', 'carbon'].map(tok);
    const css = src('src/ui/weather.css');
    for (const name of ['lamp', 'gas', 'cold', 'car']) {
      const hex = new RegExp(`--wx-${name}: (#[0-9a-f]{6});`).exec(css)?.[1] as string;
      expect(hex, name).toBeDefined();
      const [, a, b] = lab(hex);
      expect(Math.hypot(a, b), `${name} chroma`).toBeLessThanOrEqual(18);
      for (const m of meanings) expect(dE(hex, m), `${name} vs ${m}`).toBeGreaterThanOrEqual(27);
    }
    // The warm lamp is nowhere near the clock's amber.
    expect(dE(new RegExp('--wx-lamp: (#[0-9a-f]{6});').exec(css)?.[1] as string, tok('amber'))).toBeGreaterThan(40);
  });

  it('the layer is under the page and never takes a click; reduced motion stills all of it', () => {
    const css = src('src/ui/weather.css');
    const layer = /\n\.weather \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(layer).toMatch(/z-index: -1;/);
    expect(layer).toMatch(/pointer-events: none;/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s+\.weather \*,[\s\S]*?animation: none !important;/);
  });
});

describe('the view outside: what the building is and what the clock says, never the case', () => {
  it('a place is its building: its kind, a rooming house, a home, and never its part in the case', () => {
    expect(buildingOf(undefined, true)).toBe('office');
    expect(buildingOf({ kind: 'bar', key: 'venue:2' }, false)).toBe('bar');
    expect(buildingOf({ kind: 'home', key: 'rooming:1' }, false)).toBe('rooming');
    expect(buildingOf({ kind: 'home', key: 'flat' }, false)).toBe('home');
    // The night's unwatched place, the scene, a watched workplace: what they are, not what they are for.
    expect(buildingOf({ kind: 'club', key: 'unwatched:0' }, false)).toBe('club');
    expect(buildingOf({ kind: 'home', key: 'unwatched:3' }, false)).toBe('home');
    expect(buildingOf({ kind: 'work', key: 'shift:1' }, false)).toBe('work');
    expect(buildingOf({ kind: 'restaurant', key: 'unwatched:1' }, false)).toBe('restaurant');
    expect(buildingOf(undefined, false)).toBe('home');
  });

  it('every building keeps the balance: a cool light one side, a warm one the other, the fill dimmer than the key', () => {
    for (const b of BUILDINGS) {
      const v = BY_PLACE[b];
      expect(v.left, b).not.toBeNull();
      expect(v.right, b).not.toBeNull();
      const [l, r] = [v.left, v.right] as [NonNullable<typeof v.left>, NonNullable<typeof v.right>];
      expect(isWarm(l) !== isWarm(r), `${b}: one cool, one warm`).toBe(true);
      for (const w of NIGHTS) expect(lightLevel(r, w), `${b} on a ${w} night`).toBeLessThan(lightLevel(l, w));
    }
    // The office's key is the HOTEL sign; a speakeasy lights no sign.
    expect(BY_PLACE.office.left).toMatchObject({ kind: 'neon', word: 'HOTEL' });
    for (const b of ['bar', 'club'] as const) expect(BY_PLACE[b].left?.kind).not.toBe('neon');
  });

  it('A is one window all night; B follows the place; C the hour; D both', () => {
    const late = { building: 'bar', minutes: 450 } as const;
    expect(viewFor('A', late)).toEqual({ ...BY_PLACE.office, dawn: 0 });
    expect(viewFor('B', late)).toEqual({ ...BY_PLACE.bar, dawn: 0 });
    expect(viewFor('C', late).left).toBeNull();
    expect(viewFor('C', late).dawn).toBeGreaterThan(0.5);
    expect(viewFor('C', { building: 'bar', minutes: 30 })).toEqual({ ...BY_PLACE.office, dawn: 0 });
    expect(viewFor('D', { building: 'bar', minutes: 30 })).toEqual({ ...BY_PLACE.bar, dawn: 0 });
    expect(viewFor('D', late).dawn).toBe(viewFor('C', late).dawn);
    // No scene (the title page): the office's window, at night.
    for (const v of VARIATIONS) expect(viewFor(v, { building: null, minutes: null })).toEqual({ ...BY_PLACE.office, dawn: 0 });
    // The lab's gas lamp: an electric lamp turns gas, nothing else changes.
    expect(viewFor('A', late, 'gas').right).toMatchObject({ kind: 'lamp', tone: 'gas' });
    expect(viewFor('A', late, 'gas').left).toEqual(BY_PLACE.office.left);
  });

  it('dawn is the one big change: the greying begins before six, the lamps go out at first light, the signs soon after', () => {
    expect(DAWN_FROM).toBeGreaterThanOrEqual(330);
    expect(FIRST_LIGHT).toBeLessThan(SIGNS_OFF);
    expect(hourOf(DAWN_FROM).dawn).toBe(0);
    expect(hourOf(480).dawn).toBe(1);
    expect(hourOf(FIRST_LIGHT - 5)).toMatchObject({ lampOn: true, keyOn: true });
    expect(hourOf(FIRST_LIGHT)).toMatchObject({ lampOn: false, keyOn: true });
    expect(hourOf(SIGNS_OFF)).toMatchObject({ lampOn: false, keyOn: false });
    // Cars thin after one.
    expect(hourOf(30).cars).toBe(1);
    expect(hourOf(180).cars).toBeLessThan(0.4);
  });

  it('through the night the outside only moves one way: the grey never lifts, a light out never comes back', () => {
    for (const b of BUILDINGS) {
      let dawn = 0;
      let left = true;
      let right = true;
      for (let m = 0; m <= 480; m += 5) {
        const v = viewFor('D', { building: b, minutes: m });
        expect(v.dawn, `${b} ${m}`).toBeGreaterThanOrEqual(dawn);
        if (!left) expect(v.left, `${b} ${m}`).toBeNull();
        if (!right) expect(v.right, `${b} ${m}`).toBeNull();
        dawn = v.dawn;
        left = v.left !== null;
        right = v.right !== null;
      }
      // By eight, nothing is lit: only the grey of the morning.
      expect(viewFor('D', { building: b, minutes: 480 })).toMatchObject({ left: null, right: null, dawn: 1 });
    }
  });
});
