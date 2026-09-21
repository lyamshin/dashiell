import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { renderTruthSheet } from '../src/sheet/truthSheet.js';

describe('truth sheet', () => {
  it('emits the spec sections in order', () => {
    const sheet = renderTruthSheet(generateCase(7));
    const headings = [
      '## 1. The Truth',
      '## 2. Dramatis Personae',
      '## 3. Map',
      '## 4. Timelines',
      '## 5. Secrets in play',
      '## 6. Clue list',
      '## 7. Deduction path',
      '## 8. Red herrings',
    ];
    let cursor = 0;
    for (const heading of headings) {
      const at = sheet.indexOf(heading, cursor);
      expect(at, `missing or out of order: ${heading}`).toBeGreaterThan(-1);
      cursor = at;
    }
  });

  it('names the hotel, the seed and the detective in the header', () => {
    const c = generateCase(11);
    const sheet = renderTruthSheet(c);
    expect(sheet.startsWith(`# ${c.hotelName} — case ${c.seed}`)).toBe(true);
    expect(sheet).toContain(`**Attempts** ${c.attempts}`);
    expect(sheet).toContain('**Detective** Humphrey');
  });

  it('marks the murder cell and bolds lies', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sheet = renderTruthSheet(generateCase(seed));
      expect(sheet).toContain('☠');
      expect(sheet).toMatch(/\| \*\*[^|]+\*\* \|/);
    }
  });

  it('lists withheld observations separately and struck through', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      expect(sheet).toContain('### Withheld — the player cannot get these');
      if (c.observations.some((o) => o.withheld)) expect(sheet).toContain('~~');
    }
  });

  it('renders every case in the sample range without throwing', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(renderTruthSheet(generateCase(seed)).length).toBeGreaterThan(2000);
    }
  });
});
