import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';

describe('determinism', () => {
  it('produces byte-identical JSON for the same seed', () => {
    for (const seed of [1, 7, 42, 199, 1000]) {
      const a = JSON.stringify(generateCase(seed));
      const b = JSON.stringify(generateCase(seed));
      expect(a).toBe(b);
    }
  });

  it('produces different cases for different seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      seen.add(JSON.stringify(generateCase(seed)));
    }
    expect(seen.size).toBe(30);
  });

  it('honours a custom detective name without changing the case', () => {
    const plain = generateCase(5);
    const named = generateCase(5, { detectiveName: 'Marlowe' });
    expect(named.detectiveName).toBe('Marlowe');
    expect(JSON.stringify({ ...named, detectiveName: 'Humphrey' })).toBe(JSON.stringify(plain));
  });
});
