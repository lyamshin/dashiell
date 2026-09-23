import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../../src/game/storage.js';
import {
  effectsFor,
  loadWeatherOn,
  marginZones,
  NO_EFFECTS,
  saveWeatherOn,
  stripMask,
  WEATHER_KEY,
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

const ON = { enabled: true, reducedMotion: false };

describe('weather: the night to the screen', () => {
  it('rain falls, cold frosts, fog hazes, clear is (almost) nothing', () => {
    const rain = effectsFor('rain', ON);
    expect(rain).toMatchObject({ weather: 'rain', rain: true, frost: false, fog: false, motion: true });
    const cold = effectsFor('cold', ON);
    expect(cold).toMatchObject({ weather: 'cold', rain: false, frost: true, fog: false });
    const fog = effectsFor('fog', ON);
    expect(fog).toMatchObject({ weather: 'fog', rain: false, frost: false, fog: true });
    const clear = effectsFor('clear', ON);
    expect(clear).toMatchObject({ weather: 'clear', rain: false, frost: false, fog: false });
  });

  it('steam on any night, most often on a cold one, least on a clear one', () => {
    const gap = (w: 'clear' | 'rain' | 'fog' | 'cold'): number => effectsFor(w, ON).steam?.maxGap ?? Infinity;
    for (const w of ['clear', 'rain', 'fog', 'cold'] as const) expect(effectsFor(w, ON).steam).not.toBeNull();
    expect(gap('cold')).toBeLessThan(gap('rain'));
    expect(gap('cold')).toBeLessThan(gap('fog'));
    expect(gap('clear')).toBeGreaterThan(gap('rain'));
    expect(effectsFor('clear', ON).steam?.strength ?? 0).toBeLessThan(1);
  });

  it('the title page (no night) shows nothing', () => {
    expect(effectsFor(null, ON)).toEqual(NO_EFFECTS);
  });

  it('switched off shows nothing, whatever the night', () => {
    for (const w of ['clear', 'rain', 'fog', 'cold'] as const) {
      expect(effectsFor(w, { enabled: false, reducedMotion: false })).toEqual(NO_EFFECTS);
    }
  });

  it('reduced motion keeps the still things and drops the moving ones', () => {
    const still = { enabled: true, reducedMotion: true };
    expect(effectsFor('rain', still)).toMatchObject({ rain: false, steam: null, motion: false });
    expect(effectsFor('cold', still)).toMatchObject({ frost: true, steam: null, motion: false });
    expect(effectsFor('fog', still)).toMatchObject({ fog: true, steam: null, motion: false });
  });
});

describe('weather: the off switch', () => {
  it('is on until turned off, and remembers', () => {
    const store = memoryStore();
    expect(loadWeatherOn(store)).toBe(true);
    saveWeatherOn(store, false);
    expect(store.data.get(WEATHER_KEY)).toBe('off');
    expect(loadWeatherOn(store)).toBe(false);
    saveWeatherOn(store, true);
    expect(loadWeatherOn(store)).toBe(true);
  });

  it('survives a blocked store: reads as on, saving does not throw', () => {
    expect(loadWeatherOn(blocked)).toBe(true);
    expect(() => saveWeatherOn(blocked, false)).not.toThrow();
  });
});

describe('weather: only in the margins', () => {
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
