#!/usr/bin/env node
/**
 * M6 §5, as the review corrected it: read, then choose.
 *
 * Walks the oracle's route for seeds 1..N at one difficulty through the real
 * book in a real browser, clicking the button whose command is the oracle's
 * next one, and on every page, at 1280×800 and on a 390×844 phone, asserts:
 * the running head (time and strip) is on screen at the top and at the bottom
 * of the page's scroll; the prose is never clipped inside a box of its own;
 * the last button can be scrolled to; nothing scrolls sideways; and on the
 * phone every button is at least 44 pixels tall. Exits 1 on any failure.
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
// M7: `--tier 0..5|over-easy` opens the tiered case (`&t=`); print the routes
// with the same flags (`oracle-commands.ts --tier N --level L`).
const tier = arg('tier', '');
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', '');
if (shots) mkdirSync(shots, { recursive: true });

const SIZES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

/**
 * Measure the page as it stands, then scrolled to the bottom.
 *
 * The rule since the M6 review: read, then choose. The prose runs at its full
 * length and is never clipped inside a box of its own; the choices follow it;
 * the page scrolls as a whole; the running head, with the time and the strip,
 * stays on screen wherever the page is scrolled to.
 */
async function measure(page) {
  return page.evaluate(async () => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scroller = document.querySelector('.page--prose');
    const head = document.querySelector('.runhead--clock');
    const leaf = document.querySelector('.leaf');
    const panel = document.querySelector('.choices');
    const form = document.querySelector('form.report');
    if (!scroller || !head || !leaf) return { kind: 'none' };
    const headIn = () => {
      const r = head.getBoundingClientRect();
      return r.top >= -0.5 && r.bottom <= vh + 0.5 && r.height > 0;
    };
    const overflowY = getComputedStyle(leaf).overflowY;
    const clipped =
      overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden'
        ? leaf.scrollHeight > leaf.clientHeight + 1
        : false;
    const headAtTop = headIn();
    scroller.scrollTop = scroller.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const headAtBottom = headIn();
    // Everything on the page, the last button included, can be scrolled to.
    const last = [...document.querySelectorAll('.choices button, .pager button, form.report button')].at(-1);
    const lastReachable = last ? last.getBoundingClientRect().bottom <= vh + 0.5 : true;
    scroller.scrollTop = 0;
    const buttons = panel ? [...panel.querySelectorAll('button.choice, button.who-btn')] : [];
    return {
      kind: panel ? 'choices' : form ? 'report' : 'none',
      headAtTop,
      headAtBottom,
      clipped,
      lastReachable,
      scrollX:
        document.documentElement.scrollWidth > vw + 0.5 || scroller.scrollWidth > scroller.clientWidth + 0.5,
      scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
      choicesBelowFold: panel ? panel.getBoundingClientRect().top > vh : false,
      small: buttons.filter((b) => b.getBoundingClientRect().height < 44).length,
      minHeight: buttons.length ? Math.round(Math.min(...buttons.map((b) => b.getBoundingClientRect().height))) : 0,
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
      await page.goto(`${base}/?seed=${seed}&d=${difficulty}${tier ? `&t=${tier}` : ''}`);
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
  const mine = rows.filter((r) => r.size === size.name && r.kind !== 'none');
  const bad = (pred) => mine.filter(pred).map((r) => `seed ${r.seed} page ${r.page}`);
  summary[size.name] = {
    pages: mine.length,
    runningHeadAlwaysVisible: bad((r) => !r.headAtTop || !r.headAtBottom),
    proseClipped: bad((r) => r.clipped),
    lastButtonUnreachable: bad((r) => !r.lastReachable),
    horizontalScroll: bad((r) => r.scrollX),
    buttonsUnder44: size.name === 'phone' ? mine.reduce((n, r) => n + (r.small ?? 0), 0) : null,
    smallestButton: Math.min(...mine.filter((r) => r.kind === 'choices').map((r) => r.minHeight)),
    // Not a rule any more: how often the reader scrolls to reach the choices.
    pagesThatScroll: mine.filter((r) => r.scrolls).length,
    choicesStartBelowTheFold: mine.filter((r) => r.choicesBelowFold).length,
  };
}
const failed = Object.entries(summary).some(
  ([name, v]) =>
    v.runningHeadAlwaysVisible.length +
      v.proseClipped.length +
      v.lastButtonUnreachable.length +
      v.horizontalScroll.length >
      0 || (name === 'phone' && v.buttonsUnder44 > 0),
);
process.stdout.write(`${JSON.stringify(summary, null, 1)}\n${failed ? 'FAIL' : 'PASS'}\n`);
process.exit(failed ? 1 : 0);
