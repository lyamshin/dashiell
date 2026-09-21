import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/gen/index.js';
import { renderCandidateSheet, renderTruthSheet } from '../src/sheet/truthSheet.js';

describe('truth sheet', () => {
  it('emits the spec sections in order', () => {
    const sheet = renderTruthSheet(generateCase(7));
    const headings = [
      '## 1. The Truth',
      '## 2. Dramatis Personae',
      '## 3. Places',
      '## 4. Anchors',
      '## 5. Timelines',
      '## 6. Secrets in play',
      '## 7. Clue list',
      '## 8. Clue graph',
      '## 9. Deduction path',
      '## 10. Red herrings',
    ];
    let cursor = 0;
    for (const heading of headings) {
      const at = sheet.indexOf(heading, cursor);
      expect(at, `missing or out of order: ${heading}`).toBeGreaterThan(-1);
      cursor = at;
    }
  });

  it('names the neighbourhood, the seed, the detective, par and budget in the header', () => {
    const c = generateCase(11);
    const sheet = renderTruthSheet(c);
    expect(sheet.startsWith(`# ${c.neighborhood} — case ${c.seed}`)).toBe(true);
    expect(sheet).toContain(`**Attempts** ${c.attempts}`);
    expect(sheet).toContain('**Detective** Humphrey');
    expect(sheet).toContain(`**Difficulty** ${c.difficulty}`);
    expect(sheet).toContain(`**Par** ${c.par} actions`);
    expect(sheet).toContain(`**Budget** ${c.budget}`);
    expect(sheet).toContain(`**Findable** ${c.findable.length}`);
    expect(sheet).toContain('**Noise ratio**');
  });

  it('marks the murder cell and bolds lies', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const sheet = renderTruthSheet(generateCase(seed));
      expect(sheet).toContain('☠');
      expect(sheet).toMatch(/\| \*\*[^|]+\*\* \|/);
    }
  });

  it('lists only the findable clues, never the rest of the pool', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      const findable = new Set(c.findable.map((cl) => cl.id));
      const section = sheet.slice(sheet.indexOf('## 7. Clue list'), sheet.indexOf('## 8. Clue graph'));
      for (const cl of c.findable) expect(section).toContain(`**${cl.id}**`);
      for (const cl of c.candidates) {
        if (findable.has(cl.id)) continue;
        expect(section, `${cl.id} leaked into the sheet`).not.toContain(`**${cl.id}**`);
      }
    }
  });

  it('draws a mermaid graph of the findable clues', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      const graph = sheet.slice(sheet.indexOf('## 8. Clue graph'), sheet.indexOf('## 9. Deduction'));
      expect(graph).toContain('```mermaid');
      expect(graph).toContain('graph LR');
      expect(graph).toContain('classDef noise');
      for (const cl of c.findable) expect(graph).toContain(cl.id);
      // Every edge in the graph is an edge in the data.
      const edges = [...graph.matchAll(/^ {2}(c\d+) (-->|-\.->) (c\d+)$/gm)];
      expect(edges.length).toBeGreaterThan(0);
      const real = new Set(c.findable.flatMap((cl) => cl.leadsTo.map((t) => `${cl.id}>${t}`)));
      for (const e of edges) expect(real.has(`${e[1]}>${e[3]}`)).toBe(true);
    }
  });

  it('spells out the anchors and what they let you fix', () => {
    const c = generateCase(13);
    const sheet = renderTruthSheet(c);
    const section = sheet.slice(sheet.indexOf('## 4. Anchors'), sheet.indexOf('## 5. Timelines'));
    for (const a of c.anchors) expect(section).toContain(a.name);
  });

  it('renders every case in the sample range without throwing', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(renderTruthSheet(generateCase(seed)).length).toBeGreaterThan(2000);
    }
  });
});

describe('candidate sheet', () => {
  it('carries the whole pool and stars the findable', () => {
    const c = generateCase(7);
    const sheet = renderCandidateSheet(c);
    for (const cl of c.candidates) expect(sheet).toContain(`**${cl.id}**`);
    for (const cl of c.findable) expect(sheet).toContain(`★ **${cl.id}**`);
    expect(sheet).toContain('## Withheld observations');
  });
});

describe('sheet hygiene — short names', () => {
  it('spells each place out in full exactly once, in the Places section', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      const places = sheet.slice(sheet.indexOf('## 3. Places'), sheet.indexOf('## 4. Anchors'));
      for (const p of c.places) {
        expect(sheet.split(p.name).length - 1, `${p.name} in seed ${seed}`).toBe(1);
        expect(places).toContain(p.name);
        expect(sheet).toContain(p.shortName);
      }
    }
  });

  it('uses surnames outside Dramatis Personae and the headline', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      const cast = sheet.slice(
        sheet.indexOf('## 2. Dramatis Personae'),
        sheet.indexOf('## 3. Places'),
      );
      for (const p of c.people) {
        expect(cast).toContain(p.name);
        // Once in the table; the killer and the victim get a second mention in
        // the headline paragraph, which is where the case is stated in full.
        const allowed = p.isKiller || p.kind === 'victim' ? 2 : 1;
        expect(sheet.split(p.name).length - 1, `${p.name} in seed ${seed}`).toBeLessThanOrEqual(
          allowed,
        );
      }
      const clues = sheet.slice(sheet.indexOf('## 7. Clue list'), sheet.indexOf('## 8. Clue graph'));
      for (const p of c.people) expect(clues.includes(p.name)).toBe(false);
    }
  });

  it('prints par, slack and budget, and the budget is the sum', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const c = generateCase(seed);
      const sheet = renderTruthSheet(c);
      expect(sheet).toContain(`**Par** ${c.par} actions`);
      expect(sheet).toContain(`**Slack** ${c.slack}`);
      expect(sheet).toContain(`**Budget** ${c.budget}`);
      expect(c.budget).toBe(c.par + c.slack);
    }
  });
});
