#!/usr/bin/env node
/**
 * M6 §5 — is the first group of choices on the screen without scrolling?
 *
 * Walks the oracle's route for seeds 1..N at one difficulty through the real
 * book in a real browser, clicking the button whose command is the oracle's
 * next one, and on every page measures the first group of choices at two
 * window sizes: 1280×800 and a 390×844 phone. It also measures every button's
 * height on the phone, because §5 asks for a 44-pixel tap target.
 *
 *   npx tsx scripts/oracle-commands.ts --seeds 10 > out/routes.json
 *   npx vite --port 5186 &
 *   node scripts/check-layout.mjs --routes out/routes.json --url http://localhost:5186
 *
 * Uses `playwright-core` with the Chrome already on the machine; it downloads
 * no browser. `--chrome PATH` points it somewhere else.
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const routes = JSON.parse(readFileSync(arg('routes', 'out/routes.json'), 'utf8'));
const base = arg('url', 'http://localhost:5186');
const difficulty = Number(arg('difficulty', '2'));
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', '');
if (shots) mkdirSync(shots, { recursive: true });

const SIZES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

/** Measure the page as it stands. */
async function measure(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const panel = document.querySelector('.choices');
    const form = document.querySelector('form.report');
    if (!panel) return { kind: form ? 'report' : 'none' };
    const first = panel.querySelector('.choice-group');
    const who = panel.querySelector('.who-row');
    const lead = who ?? first;
    const pb = panel.getBoundingClientRect();
    const box = (el) => el.getBoundingClientRect();
    const inView = (r) => r.top >= 0 && r.bottom <= vh + 0.5 && r.left >= 0 && r.right <= vw + 0.5;
    const within = (r) => r.top >= pb.top - 0.5 && r.bottom <= pb.bottom + 0.5;
    const g = box(first);
    const heading = first.querySelector('.choice-heading');
    const button = first.querySelector('button.choice');
    const buttons = [...panel.querySelectorAll('button.choice, button.who-btn')];
    const small = buttons.filter((b) => b.getBoundingClientRect().height < 44).length;
    return {
      kind: 'choices',
      scrollX: document.documentElement.scrollWidth > vw,
      scrolled: document.scrollingElement ? document.scrollingElement.scrollTop : 0,
      panelTop: Math.round(pb.top),
      panelBottom: Math.round(pb.bottom),
      groupTop: Math.round(g.top),
      groupBottom: Math.round(g.bottom),
      whole: inView(g) && within(g) && (!who || (inView(box(who)) && within(box(who)))),
      headingVisible: heading ? inView(box(heading)) && within(box(heading)) : true,
      firstButtonVisible: button ? inView(box(button)) && within(box(button)) : false,
      leadVisible: lead ? inView(box(lead)) : false,
      buttons: buttons.length,
      groupButtons: first.querySelectorAll('button').length,
      groupButtonsVisible: [...first.querySelectorAll('button')].filter(
        (b) => inView(box(b)) && within(box(b)),
      ).length,
      leafHeight: Math.round(document.querySelector('.leaf')?.getBoundingClientRect().height ?? 0),
      small,
      minHeight: Math.round(Math.min(...buttons.map((b) => b.getBoundingClientRect().height))),
    };
  });
}

async function click(page, command) {
  const selector = `button[data-command="${command.replace(/"/g, '\\"')}"]`;
  if ((await page.locator(selector).count()) === 0) {
    // One person's topics at a time: switch to the person the command asks.
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

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const rows = [];
try {
  for (const size of SIZES) {
    for (const [seed, commands] of Object.entries(routes)) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 1,
        hasTouch: size.name === 'phone',
      });
      const page = await context.newPage();
      await page.goto(`${base}/?seed=${seed}&d=${difficulty}`);
      await page.waitForSelector('.choices, form.report');
      for (let n = 0; n <= commands.length; n++) {
        const m = await measure(page);
        rows.push({ size: size.name, seed: Number(seed), page: n + 1, ...m });
        if (shots && n < 3 && Number(seed) <= 3) {
          await page.screenshot({ path: `${shots}/${size.name}-s${seed}-p${n + 1}.png` });
        }
        if (n === commands.length) break;
        await click(page, commands[n]);
        await page.waitForFunction(
          (want) => document.querySelector('.pager span')?.textContent?.startsWith(`page ${want} `),
          n + 2,
        );
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const summary = {};
for (const size of SIZES) {
  const mine = rows.filter((r) => r.size === size.name && r.kind === 'choices');
  summary[size.name] = {
    pages: mine.length,
    reportPages: rows.filter((r) => r.size === size.name && r.kind === 'report').length,
    wholeFirstGroupVisible: mine.filter((r) => r.whole).length,
    headingAndFirstButtonVisible: mine.filter((r) => r.headingVisible && r.firstButtonVisible).length,
    pageScrolled: mine.filter((r) => r.scrolled > 0).length,
    horizontalScroll: mine.filter((r) => r.scrollX).length,
    buttonsUnder44: mine.reduce((n, r) => n + r.small, 0),
    smallestButton: Math.min(...mine.map((r) => r.minHeight)),
    fewestFirstGroupButtonsVisible: Math.min(...mine.map((r) => r.groupButtonsVisible)),
    meanShareOfFirstGroupVisible:
      Math.round(
        (100 * mine.reduce((n, r) => n + r.groupButtonsVisible / Math.max(1, r.groupButtons), 0)) /
          Math.max(1, mine.length),
      ) / 100,
    proseHeight: {
      min: Math.min(...mine.map((r) => r.leafHeight)),
      median: mine.map((r) => r.leafHeight).sort((a, b) => a - b)[Math.floor(mine.length / 2)],
    },
    failures: mine
      .filter((r) => !(r.headingVisible && r.firstButtonVisible))
      .map((r) => `seed ${r.seed} page ${r.page}`),
    partial: mine.filter((r) => !r.whole).map((r) => `seed ${r.seed} page ${r.page}`),
  };
}
process.stdout.write(`${JSON.stringify(summary, null, 1)}\n`);
