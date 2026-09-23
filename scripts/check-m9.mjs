#!/usr/bin/env node
/**
 * M9 — Deduction, in a real browser.
 *
 * Plays one tiered case to a filed report through the real book, at 1280×800
 * and on a 390×844 phone, clicking the buttons a player clicks:
 *
 *   - the route from `scripts/m9-routes.ts` (the oracle's, then the walk to
 *     somebody and their evening);
 *   - "Put it to …": opens the picker, reads them the fact that lands, then
 *     one that touches nothing, and checks the page says “That doesn’t touch
 *     anything I told you.”;
 *   - in the notebook's grid, taps a stranger's sighting and links it to a
 *     person ("That was …");
 *   - files the report with the full crime column filled, and opens the
 *     curtain's proofs;
 *   - checks the page never scrolls sideways and screenshots each step into
 *     `--shots` as m9-<label>-<size>-<n>-<what>.png.
 *
 *   npx tsx scripts/m9-routes.ts --seed 3 --tier 4 > out/m9-route-medium.json
 *   npx vite --port 5193 &
 *   node scripts/check-m9.mjs --route out/m9-route-medium.json --label medium --url http://localhost:5193
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
const plan = JSON.parse(readFileSync(arg('route', 'out/m9-route.json'), 'utf8'));
const label = arg('label', `t${plan.tier}`);
const base = arg('url', 'http://localhost:5193');
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', 'docs/screens');
mkdirSync(shots, { recursive: true });

const SIZES = [
  { name: '1280', width: 1280, height: 800, phone: false },
  { name: '390', width: 390, height: 844, phone: true },
];

const failures = [];
const report = {};

async function pageNumber(page) {
  const text = (await page.locator('.pager span').textContent()) ?? '';
  return Number(/page (\d+)/.exec(text)?.[1] ?? 0);
}

async function waitTurn(page, before) {
  await page.waitForFunction(
    (want) => Number(/page (\d+)/.exec(document.querySelector('.pager span')?.textContent ?? '')?.[1] ?? 0) >= want,
    before + 1,
  );
}

/** Click the button that issues `command`, opening whose topics or the picker first when it has to. */
async function issue(page, command, personId) {
  const selector = `button[data-command="${command.replace(/"/g, '\\"')}"]`;
  if ((await page.locator(selector).count()) === 0 && personId) {
    const who = page.locator(`button.who-btn[data-person="${personId}"]`);
    if ((await who.count()) > 0) await who.first().click();
  }
  if ((await page.locator(selector).count()) === 0) {
    const m = /^ask (\S+) about /.exec(command);
    if (m) {
      const who = page.locator('button.who-btn', { hasText: m[1] });
      if ((await who.count()) > 0) await who.first().click();
    }
  }
  if ((await page.locator(selector).count()) === 0 && command.startsWith('put ') && personId) {
    const toggle = page.locator(`button[data-command="picker ${personId}"]`);
    if ((await toggle.count()) > 0) await toggle.first().click();
  }
  if ((await page.locator(selector).count()) === 0) {
    const more = page.locator('button.choice--more');
    if ((await more.count()) > 0) await more.first().click();
  }
  const before = await pageNumber(page);
  await page.locator(selector).first().click();
  await waitTurn(page, before);
}

async function noSideways(page, where) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 0.5);
  if (wide) failures.push(`${where}: the page scrolls sideways`);
}

async function proseText(page) {
  return ((await page.locator('.page--prose .leaf').textContent()) ?? '').replace(/\s+/g, ' ');
}

const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  for (const size of SIZES) {
    const where = `${label} ${size.name}`;
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 2,
      hasTouch: size.phone,
    });
    const page = await context.newPage();
    const shot = (n, what) => page.screenshot({ path: `${shots}/m9-${label}-${size.name}-${n}-${what}.png` });
    await page.goto(`${base}/?seed=${plan.seed}&d=${plan.level}&t=${plan.tier}`);
    await page.waitForSelector('.choices, form.report');
    const r = { confrontRight: null, confrontWrong: null, linked: false, filed: null };

    for (const command of plan.commands) {
      const isRight = plan.right && command === plan.right.command;
      const isWrong = plan.wrong && command === plan.wrong.command;
      const personId = isRight ? plan.right.personId : isWrong ? plan.wrong.personId : undefined;
      if (isRight) {
        // The picker, open, before the fact is chosen.
        const who = page.locator(`button.who-btn[data-person="${personId}"]`);
        if ((await who.count()) > 0) await who.first().click();
        await page.locator(`button[data-command="picker ${personId}"]`).first().click();
        await page.locator('.confront-picker').first().scrollIntoViewIfNeeded();
        await noSideways(page, `${where} picker`);
        await shot(1, 'picker');
      }
      await issue(page, command, personId);
      if (isRight) {
        const text = await proseText(page);
        r.confrontRight = text.slice(0, 400);
        if (/That doesn’t touch anything I told you/.test(text)) failures.push(`${where}: the right fact was turned away`);
        await page.locator('.page--prose').evaluate((el) => el.scrollTo?.(0, 0));
        await shot(2, 'confront-right');
      }
      if (isWrong) {
        const text = await proseText(page);
        r.confrontWrong = text.slice(0, 400);
        if (!/That doesn’t touch anything I told you\./.test(text)) failures.push(`${where}: the wrong fact did not get the line`);
        await shot(3, 'confront-wrong');
      }
    }

    // The grid: a stranger's sighting, linked.
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
    await noSideways(page, `${where} grid`);
    await shot(4, 'grid');
    if (plan.link && plan.link.name) {
      const row = page.locator('tr.dgrid-row--desc', { has: page.locator('.dgrid-role', { hasText: plan.link.text }) });
      const cellBtn = row.locator('td.dgrid-cell').nth(plan.link.tick).locator('button');
      if ((await cellBtn.count()) === 0) failures.push(`${where}: no stranger's sighting at ${plan.link.tick}`);
      else {
        await cellBtn.first().click();
        await page.locator('.dgrid-linkbtn', { hasText: plan.link.name }).first().click();
        const linked = await page.locator('.dchip--linked').count();
        r.linked = linked > 0;
        if (linked === 0) failures.push(`${where}: the link drew nothing in ${plan.link.name}'s row`);
        await page.locator('.dgrid-detail').first().scrollIntoViewIfNeeded();
        await shot(5, 'grid-linked');
      }
    }
    if (size.phone) await page.locator('.nb-back').click();

    // The report: the free "File the report", every field, the whole column.
    const before = await pageNumber(page);
    await page.locator('button[data-command="file"]').first().click();
    await waitTurn(page, before).catch(() => undefined);
    await page.waitForSelector('form.report');
    for (const f of plan.fields) {
      if (f.value !== null) await page.selectOption(`form.report select[name="${f.label}"]`, String(f.value));
    }
    for (const c of plan.column) {
      if (c.value !== null) await page.selectOption(`form.report fieldset.report-column select[name="${c.label}"]`, String(c.value));
    }
    const columnSelects = await page.locator('fieldset.report-column select').count();
    if (columnSelects !== plan.column.length) failures.push(`${where}: ${columnSelects} column rows, wanted ${plan.column.length}`);
    await page.locator('fieldset.report-column').scrollIntoViewIfNeeded();
    await noSideways(page, `${where} report`);
    await shot(6, 'report-form');
    await page.locator('form.report button[type="submit"]').click();
    await page.waitForSelector('.verdict');
    const score = (await page.locator('.report .score').textContent()) ?? '';
    r.filed = score.trim();
    const columnRows = await page.locator('.verdict--column .verdict-row').count();
    if (columnRows !== plan.column.length) failures.push(`${where}: the verdict shows ${columnRows} column rows`);
    await shot(7, 'verdict');
    await page.locator('button[aria-controls="ending-curtain"]').click();
    await page.locator('.proof').first().scrollIntoViewIfNeeded();
    const proofs = await page.locator('.proof').count();
    if (proofs === 0) failures.push(`${where}: no proofs behind the curtain`);
    await noSideways(page, `${where} curtain`);
    await shot(8, 'curtain-proofs');
    report[size.name] = r;
    await context.close();
  }
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
for (const f of failures) process.stdout.write(`FAIL ${f}\n`);
process.stdout.write(failures.length === 0 ? 'PASS\n' : 'FAIL\n');
process.exit(failures.length === 0 ? 0 : 1);
