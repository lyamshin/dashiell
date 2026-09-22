#!/usr/bin/env node
/**
 * M7, the book half, in a real browser: a new player's first night.
 *
 * With empty storage, at 1280×800 and on a 390×844 phone:
 *
 *   1. The title page opens on Raw, at Beat, with Raw's rule, no difficulty
 *      choice, and the five tiers after it listed as locked.
 *   2. "Open the case" deals the Raw case (`&t=0&d=1` in the URL).
 *   3. Half-way through, a reload resumes the tiered case, and so does "Go
 *      back to it" on the title page.
 *   4. The oracle's commands are clicked as buttons, the report is filed with
 *      the right answers (the form asks only who), and the closing page says
 *      Coddled is open.
 *   5. "Open another case" is the title page again, on Coddled, with the
 *      difficulty choice back, Raw cleared and Coddled open; and it is still
 *      so after a reload.
 *
 * No horizontal scroll anywhere, and on the phone every title-page control
 * and verdict button is at least 44 pixels tall. Exits 1 on any failure.
 *
 *   npx vite --port 5186 &
 *   node --import tsx scripts/check-unlock.mjs --url http://localhost:5186 [--seed 1] [--shots out/unlock]
 */

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { generateCase } from '../src/gen/index.js';
import { RAW, CODDLED } from '../src/gen/shape.js';
import { buildView } from '../src/game/derive.js';
import { playOracle } from '../src/game/oracle.js';
import { fieldsFor, truthFor } from '../src/game/report-form.js';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const base = arg('url', 'http://localhost:5186');
const seed = Number(arg('seed', '1'));
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', '');
if (shots) mkdirSync(shots, { recursive: true });

const view = buildView(generateCase(seed, { tier: 0, level: 1 }));
const route = playOracle(view).steps.map((s) => s.command);
const answers = fieldsFor(view).map((f) => ({ label: f.label, value: truthFor(view, f.key) ?? '' }));

const SIZES = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

const failures = [];
const log = [];
function check(size, what, ok, detail = '') {
  log.push(`${ok ? 'ok  ' : 'FAIL'} ${size} · ${what}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failures.push(`${size}: ${what} ${detail}`);
}

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

const pageNumber = (page) =>
  page.evaluate(() => Number(/page (\d+) of/.exec(document.querySelector('.pager span')?.textContent ?? '')?.[1] ?? 0));

const noSideScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 0.5);

async function shot(page, size, name) {
  if (shots) await page.screenshot({ path: `${shots}/${size}-${name}.png`, fullPage: true });
}

async function title(page) {
  return page.evaluate(() => {
    const visible = (el) => !!el && !el.hidden && el.getBoundingClientRect().height > 0;
    const levelSelect = document.querySelector('.title-page select[name="difficulty"]');
    const tierSelect = document.querySelector('.title-page select[name="tier"]');
    const controls = [...document.querySelectorAll('.title-page button, .title-page select, .title-page input')].filter(visible);
    return {
      now: document.querySelector('.tier-now')?.textContent ?? '',
      rule: document.querySelector('.title-page .tier-rule')?.textContent ?? '',
      levelChoice: visible(levelSelect),
      levelOptions: levelSelect ? [...levelSelect.options].map((o) => o.textContent) : [],
      tierOptions: tierSelect ? [...tierSelect.options].map((o) => o.textContent) : [],
      ladder: [...document.querySelectorAll('.ladder-row')].map((r) => ({
        name: r.querySelector('.ladder-name')?.textContent ?? '',
        status: r.querySelector('.ladder-status')?.textContent ?? '',
        locked: r.classList.contains('locked'),
      })),
      resume: document.querySelector('.title-page .resume p')?.textContent ?? '',
      smallest: Math.round(Math.min(...controls.map((c) => c.getBoundingClientRect().height))),
    };
  });
}

const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  for (const size of SIZES) {
    const s = size.name;
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: 1,
      hasTouch: s === 'phone',
    });
    const page = await context.newPage();

    // 1. A new player's title page.
    await page.goto(`${base}/`);
    await page.waitForSelector('.title-page');
    let t = await title(page);
    check(s, 'title opens on Raw at Beat', t.now === 'Raw, at Beat', t.now);
    check(s, 'title prints Raw’s rule', t.rule === RAW.rule, t.rule);
    check(s, 'Raw shows no difficulty choice', !t.levelChoice);
    check(s, 'no tier choice with one tier open', t.tierOptions.length === 0, t.tierOptions.join(','));
    const locked = t.ladder.filter((r) => r.locked).map((r) => r.name);
    check(
      s,
      'the five tiers after Raw are listed as locked',
      locked.join(',') === 'Coddled,Poached,Soft-boiled,Medium,Hard-boiled',
      locked.join(','),
    );
    check(s, 'Over easy is not listed', !t.ladder.some((r) => r.name === 'Over easy'));
    check(s, 'title: no horizontal scroll', await noSideScroll(page));
    if (s === 'phone') check(s, 'title controls at least 44px', t.smallest >= 44, `${t.smallest}px`);
    await shot(page, s, '1-title-new');

    // 2. Open the Raw case on the chosen seed.
    await page.fill('.title-page input[type="number"]', String(seed));
    await page.click('.title-page button[type="submit"]');
    await page.waitForSelector('.choices');
    const url = new URL(page.url());
    check(s, 'the URL carries the tier', url.searchParams.get('t') === '0' && url.searchParams.get('d') === '1', url.search);
    const head = await page.textContent('.page--notebook .runhead span:last-child');
    check(s, 'the notebook says Raw · Beat', head === `case ${seed} · Raw · Beat`, head ?? '');

    // 3. Play half the route, then reload: the tiered case resumes.
    const half = Math.max(1, Math.floor(route.length / 2));
    for (let n = 0; n < half; n++) {
      await click(page, route[n]);
      await page.waitForFunction((want) => document.querySelector('.pager span')?.textContent?.startsWith(`page ${want} `), n + 2);
    }
    const before = await pageNumber(page);
    await page.reload();
    await page.waitForSelector('.choices');
    check(s, 'a reload resumes the tiered run', (await pageNumber(page)) === before, `page ${before}`);

    // …and so does the title page's "Go back to it".
    await page.goto(`${base}/`);
    await page.waitForSelector('.title-page');
    t = await title(page);
    check(s, 'the title page offers the open case', t.resume.includes(`Case ${seed}`) && t.resume.includes('Raw, at Beat'), t.resume);
    await page.click('.title-page .resume button');
    await page.waitForSelector('.choices');
    check(s, '“Go back to it” resumes the tiered run', (await pageNumber(page)) === before, `page ${await pageNumber(page)}`);

    // 4. The rest of the route, then the report.
    for (let n = half; n < route.length; n++) {
      await click(page, route[n]);
      await page.waitForFunction((want) => document.querySelector('.pager span')?.textContent?.startsWith(`page ${want} `), n + 2);
    }
    await click(page, 'file');
    await page.waitForSelector('form.report');
    const labels = await page.$$eval('form.report .field label', (ls) => ls.map((l) => l.textContent));
    check(
      s,
      'the report asks only what the case asks',
      labels.join('|') === answers.map((a) => a.label).join('|') && labels.length === 1,
      labels.join('|'),
    );
    await shot(page, s, '2-report');
    const selects = page.locator('form.report select');
    for (let i = 0; i < answers.length; i++) await selects.nth(i).selectOption(answers[i].value);
    await page.click('form.report button[type="submit"]');
    await page.waitForSelector('.verdict');
    const score = await page.textContent('.report .score');
    check(s, 'full credit', score === `${answers.length} out of ${answers.length}.`, score ?? '');
    const news = (await page.textContent('.tier-news')) ?? '';
    check(s, 'the closing page says Coddled is open', news.includes('Raw is cleared.') && news.includes('Coddled is open now.'), news);
    check(s, 'the closing page prints Coddled’s rule', news.includes(CODDLED.rule));
    check(s, 'verdict: no horizontal scroll', await noSideScroll(page));
    if (s === 'phone') {
      const small = await page.$$eval('.report .after button', (bs) => Math.min(...bs.map((b) => b.getBoundingClientRect().height)));
      check(s, 'verdict buttons at least 44px', small >= 44, `${Math.round(small)}px`);
    }
    await page.locator('.tier-news').scrollIntoViewIfNeeded();
    await shot(page, s, '3-verdict');

    // 5. Another case: the title page, on Coddled.
    await page.click('.report .after button.open-case');
    await page.waitForSelector('.title-page');
    for (const pass of ['after the verdict', 'after a reload']) {
      if (pass === 'after a reload') {
        await page.reload();
        await page.waitForSelector('.title-page');
      }
      t = await title(page);
      check(s, `${pass}: title is on Coddled`, t.now === 'Coddled, at Beat', t.now);
      check(s, `${pass}: Coddled’s rule`, t.rule === CODDLED.rule, t.rule);
      check(s, `${pass}: the tier choice offers Raw and Coddled`, t.tierOptions.join(',') === 'Raw,Coddled', t.tierOptions.join(','));
      check(
        s,
        `${pass}: the difficulty choice is back, four rungs by name`,
        t.levelChoice && t.levelOptions.join('|') === 'Beat|Precinct|Homicide|The DA’s Office',
        t.levelOptions.join('|'),
      );
      const raw = t.ladder.find((r) => r.name === 'Raw');
      const cod = t.ladder.find((r) => r.name === 'Coddled');
      check(s, `${pass}: Raw cleared`, !!raw && raw.status.startsWith('cleared at Beat'), raw?.status ?? '');
      check(s, `${pass}: Coddled unlocked`, !!cod && !cod.locked && cod.status === 'open', cod?.status ?? '');
      const stillLocked = t.ladder.filter((r) => r.locked).map((r) => r.name).join(',');
      check(s, `${pass}: four still locked`, stillLocked === 'Poached,Soft-boiled,Medium,Hard-boiled', stillLocked);
      check(s, `${pass}: no open case on the desk`, t.resume === '', t.resume);
      check(s, `${pass}: no horizontal scroll`, await noSideScroll(page));
      if (s === 'phone') check(s, `${pass}: title controls at least 44px`, t.smallest >= 44, `${t.smallest}px`);
    }
    await shot(page, s, '4-title-coddled');

    // Choosing Raw again hides the difficulty choice and shows Raw's rule.
    await page.selectOption('.title-page select[name="tier"]', '0');
    t = await title(page);
    check(s, 'choosing Raw again: Beat, no choice', t.now === 'Raw, at Beat' && !t.levelChoice, t.now);
    await context.close();
  }
} finally {
  await browser.close();
}

process.stdout.write(`${log.join('\n')}\n${failures.length ? 'FAIL' : 'PASS'} (${log.length} checks, seed ${seed}, ${route.length} commands)\n`);
process.exit(failures.length ? 1 : 0);
