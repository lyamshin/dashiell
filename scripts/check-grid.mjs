#!/usr/bin/env node
/**
 * "Where they were" in a real browser.
 *
 * Plays one seed's oracle route through the real book (clicking the button
 * whose command is the oracle's next, as `check-layout.mjs` does), then opens
 * the notebook's grid at 1280×800 and on a 390×844 phone and:
 *
 *   - checks the page never scrolls sideways, the grid scrolls inside itself,
 *     and the names stay put when it does;
 *   - pencils two cells in through the grid's own menu, opens a cell's
 *     sources, lights a rule, folds a row, turns to a person's entry;
 *   - checks a reload keeps the pencil (it is saved with the run);
 *   - screenshots each step into `--shots` (default docs/screens).
 *
 *   npx tsx scripts/oracle-commands.ts --seeds 3 --difficulty 2 > out/routes-grid.json
 *   npx vite --port 5193 &
 *   node scripts/check-grid.mjs --routes out/routes-grid.json --seed 3 --url http://localhost:5193
 *
 * Exits 1 on any failed check.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const routes = JSON.parse(readFileSync(arg('routes', 'out/routes-grid.json'), 'utf8'));
const seed = arg('seed', '3');
const difficulty = Number(arg('difficulty', '2'));
const base = arg('url', 'http://localhost:5193');
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', 'docs/screens');
const scheme = arg('scheme', 'light');
// `--measure-only`: play the route, measure and screenshot the end, skip the
// seed-3 interactions (the pencil, the Hanrahan rule), so any seed can be run.
const measureOnly = argv.includes('--measure-only');
mkdirSync(shots, { recursive: true });
const commands = routes[seed];
if (!commands) throw new Error(`no route for seed ${seed}`);

const SIZES = [
  { name: '1280', width: 1280, height: 800, phone: false },
  { name: '390', width: 390, height: 844, phone: true },
];

async function click(page, command) {
  const selector = `button[data-command="${command.replace(/"/g, '\\"')}"]`;
  if ((await page.locator(selector).count()) === 0) {
    const m = /^ask (\S+) about /.exec(command);
    if (m) {
      const who = page.locator('button.who-btn', { hasText: m[1] });
      if ((await who.count()) > 0) await who.first().click();
    }
  }
  if ((await page.locator(selector).count()) === 0) {
    const more = page.locator('button.choice--more');
    if ((await more.count()) > 0) await more.first().click();
  }
  await page.locator(selector).first().click();
}

/** A cell's button, by the row's surname and the column's label. */
function cell(page, surname, tickIndex) {
  return page
    .locator('tr.dgrid-row', { has: page.locator('.dgrid-surname', { hasText: surname }) })
    .locator('td.dgrid-cell')
    .nth(tickIndex)
    .locator('button');
}

async function measure(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const scroller = document.querySelector('.dgrid-scroll');
    const name = document.querySelector('tr.dgrid-row .dgrid-name');
    const before = name?.getBoundingClientRect().left ?? 0;
    const max = scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
    if (scroller) scroller.scrollLeft = max;
    const after = name?.getBoundingClientRect().left ?? 0;
    if (scroller) scroller.scrollLeft = 0;
    const table = document.querySelector('table.dgrid');
    return {
      pageScrollsSideways: document.documentElement.scrollWidth > vw + 0.5,
      gridOverflow: Math.round(max),
      gridWidth: scroller ? Math.round(scroller.clientWidth) : 0,
      tableWidth: table ? Math.round(table.getBoundingClientRect().width) : 0,
      namesStick: Math.abs(before - after) < 1,
      rows: document.querySelectorAll('tr.dgrid-row').length,
      entries: document.querySelectorAll('.dchip').length,
      rules: document.querySelectorAll('.dgrid-rule').length,
    };
  });
}

const failures = [];
const report = {};
const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  for (const size of SIZES) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      hasTouch: size.phone,
      colorScheme: scheme,
    });
    const page = await context.newPage();
    await page.goto(`${base}/?seed=${seed}&d=${difficulty}`);
    await page.waitForSelector('.choices, form.report');
    for (let n = 0; n < commands.length; n++) {
      await click(page, commands[n]);
      await page.waitForFunction(
        (want) => document.querySelector('.pager span')?.textContent?.startsWith(`page ${want} `),
        n + 2,
      );
    }

    // To the notebook, and to the grid in it.
    if (size.phone) await page.locator('.nb-link').click();
    await page.waitForSelector('.dgrid-section');
    const toGrid = async () => {
      await page.evaluate(() => {
        const body = document.querySelector('.page--notebook .body');
        const h = [...document.querySelectorAll('.page--notebook h2')].find((x) => x.textContent === 'Where they were');
        if (body && h) body.scrollTop = h.offsetTop - body.offsetTop - 4;
      });
    };
    await toGrid();
    const m = await measure(page);
    report[size.name] = m;
    if (m.pageScrollsSideways) failures.push(`${size.name}: the page scrolls sideways`);
    if (!m.namesStick) failures.push(`${size.name}: the names scroll away with the hours`);
    // On a wide screen the whole evening fits without a scroll.
    if (!size.phone && m.gridOverflow > 0) failures.push(`${size.name}: the grid overflows by ${m.gridOverflow}px`);
    if (m.rows === 0 || m.entries === 0 || m.rules === 0) failures.push(`${size.name}: an empty grid`);
    await page.screenshot({ path: `${shots}/grid-${size.name}-1-end-of-run.png` });
    if (measureOnly) {
      await context.close();
      continue;
    }

    // The pencil: Grasso at the suite at ten; Coffin not at the suite at half past nine.
    await cell(page, 'Coffin', 7).click();
    await page.locator('.dgrid-pline', { hasText: 'not at' }).locator('button', { hasText: 'suite' }).click();
    await cell(page, 'Grasso', 8).click();
    await page.locator('.dgrid-pline', { hasText: 'was at' }).locator('button', { hasText: 'suite' }).click();
    await toGrid();
    const pencils = await page.locator('.dgrid-cell .dpencil').count();
    if (pencils !== 2) failures.push(`${size.name}: ${pencils} pencil marks drawn, wanted 2`);
    const sources = await page.locator('.dgrid-detail .dgrid-src').count();
    if (sources < 2) failures.push(`${size.name}: Grasso at ten shows ${sources} sources, wanted 2`);
    if (size.phone) {
      // Scroll the grid so ten o'clock is in view beside the names.
      await page.evaluate(() => {
        const s = document.querySelector('.dgrid-scroll');
        const col = document.querySelectorAll('.dgrid-ticks th')[8];
        const name = document.querySelector('.dgrid-corner');
        if (s && col && name) s.scrollLeft = col.offsetLeft - name.offsetWidth - 4;
      });
    }
    await page.screenshot({ path: `${shots}/grid-${size.name}-2-cell-and-pencil.png` });

    // A rule, lit.
    await page.locator('.dgrid-rule', { hasText: 'Hanrahan: third floor' }).click();
    const lit = await page.locator('.dgrid-cell.lit').count();
    if (lit !== 2) failures.push(`${size.name}: the Hanrahan rule lit ${lit} cells, wanted 2`);
    await page.locator('.dgrid-close').click();
    await page.evaluate(() => {
      const body = document.querySelector('.page--notebook .body');
      const rules = document.querySelector('.dgrid-rules');
      const grid = document.querySelector('.dgrid-scroll');
      if (body && rules && grid) {
        const top = grid.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
        body.scrollTop = top - 60;
      }
    });
    await page.screenshot({ path: `${shots}/grid-${size.name}-3-rule-lit.png` });

    // Fold a row, open the fixtures.
    await page
      .locator('tr.dgrid-row', { has: page.locator('.dgrid-surname', { hasText: 'Schilling' }) })
      .locator('.dgrid-fold')
      .click();
    await page.locator('.dgrid-fxbtn').click();
    const folded = await page.locator('tr.dgrid-row.collapsed').count();
    if (folded !== 1) failures.push(`${size.name}: ${folded} rows folded, wanted 1`);
    const fixtures = await page.locator('tr.dgrid-row--fixture').count();
    if (fixtures === 0) failures.push(`${size.name}: the fixtures did not open`);
    await toGrid();
    await page.screenshot({ path: `${shots}/grid-${size.name}-4-folded-and-fixtures.png` });

    // A name: the notebook turns to the entry.
    await page.locator('.dgrid-who', { hasText: 'Hanrahan' }).click();
    await page.waitForTimeout(700);
    const entryTop = await page.evaluate(() => {
      const e = document.querySelector('#nb-person-p-s3');
      const body = document.querySelector('.page--notebook .body');
      return e && body ? Math.round(e.getBoundingClientRect().top - body.getBoundingClientRect().top) : null;
    });
    if (entryTop === null || entryTop < -2 || entryTop > 40) failures.push(`${size.name}: Hanrahan's entry is at ${entryTop}, not turned to`);

    // The pencil survives a reload: it is saved with the run.
    await page.reload();
    if (size.phone) await page.locator('.nb-link').click();
    await page.waitForSelector('.dgrid-section');
    const kept = await page.locator('.dgrid-cell .dpencil').count();
    if (kept !== 2) failures.push(`${size.name}: ${kept} pencil marks after a reload, wanted 2`);
    report[size.name].pencilAfterReload = kept;
    await context.close();
  }
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
for (const f of failures) process.stdout.write(`FAIL ${f}\n`);
process.stdout.write(failures.length === 0 ? 'PASS\n' : 'FAIL\n');
process.exit(failures.length === 0 ? 0 : 1);
