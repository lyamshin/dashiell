#!/usr/bin/env node
/**
 * The weather on the glass (docs/27), in a real browser.
 *
 * Opens a rain night, a cold night, a fog night and a clear night (untiered,
 * difficulty 2: seeds 4, 3, 1 and 9 by `npm run read -- --seed N --pages 1`)
 * at 1280×800 and on a 390×844 phone, light and dark, and still (reduced
 * motion), and for each:
 *
 *   - checks the layer shows the night the roll dealt, and nothing else;
 *   - screenshots it into `--shots` (default docs/screens/weather-*.png),
 *     with the frost fast-forwarded to formed;
 *   - turns the weather off with the pager's own switch (a real click with the
 *     layer on) and compares the two screenshots pixel by pixel: every pixel
 *     inside the pages' content boxes (the reading column, the choices, the
 *     notebook) must be identical, the switch's own label excepted, so the
 *     text's contrast cannot have changed; the margins must differ;
 *   - checks every visible button is what is under its own centre;
 *   - under reduced motion, checks no rain, no steam and no animation.
 *
 * Then: clicks a choice with the layer on (the page turns), turns back
 * (the same layer, still running), reloads with the switch off (still off),
 * and opens the title page (no weather). And measures the main thread with
 * CDP's Performance metrics, weather on against off, 10 s each.
 *
 *   npx vite --port 5217 &
 *   node scripts/check-weather.mjs --url http://localhost:5217
 *
 * Exits 1 on any failed check.
 */

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const base = arg('url', 'http://localhost:5217');
const chrome = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const shots = arg('shots', 'docs/screens');
const perfSeconds = Number(arg('perf-seconds', '10'));
const skipPerf = argv.includes('--no-perf');
const perfOnly = argv.includes('--perf-only');
mkdirSync(shots, { recursive: true });

const NIGHTS = [
  { weather: 'rain', seed: 4 },
  { weather: 'cold', seed: 3 },
  { weather: 'fog', seed: 1 },
  { weather: 'clear', seed: 9 },
];
const SIZES = [
  { name: '1280', width: 1280, height: 800, phone: false },
  { name: '390', width: 390, height: 844, phone: true },
];

const failures = [];
const fail = (what) => {
  failures.push(what);
  console.log(`  FAIL ${what}`);
};

const url = (seed) => `${base}/?seed=${seed}&d=2`;

async function open(browser, size, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    hasTouch: size.phone,
    colorScheme: opts.scheme ?? 'light',
    reducedMotion: opts.still ? 'reduce' : 'no-preference',
  });
  if (opts.off) {
    await context.addInitScript(() => localStorage.setItem('dashiell:weather', 'off'));
  }
  const page = await context.newPage();
  return { context, page };
}

/** Frost formed, fog and rain where they would be a while in, steam cleared. */
async function settle(page) {
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      const el = a.effect?.target;
      if (!el?.closest?.('.weather')) continue;
      if (el.classList.contains('wx-puff')) {
        a.cancel();
        continue;
      }
      // Frost: formed. Rain and fog: some way in, then held still for the shot.
      a.currentTime = t && Number.isFinite(t.endTime) ? t.endTime : 20_000;
      a.pause();
    }
    document.querySelectorAll('.wx-wisp').forEach((w) => w.remove());
  });
}

/** The content boxes of every page on screen, and the switch's own box. */
async function boxes(page) {
  return page.evaluate(() => {
    const cols = [];
    for (const p of document.querySelectorAll('.spread .page')) {
      const r = p.getBoundingClientRect();
      if (r.width === 0) continue;
      const cs = getComputedStyle(p);
      let x0 = r.left + p.clientLeft + parseFloat(cs.paddingLeft);
      let x1 = r.left + p.clientLeft + p.clientWidth - parseFloat(cs.paddingRight);
      // The notebook's body reaches into the page margin on a wide screen.
      for (const c of p.children) {
        const cr = c.getBoundingClientRect();
        if (cr.width === 0 || cr.height === 0) continue;
        x0 = Math.min(x0, cr.left);
        x1 = Math.max(x1, cr.right);
      }
      cols.push({
        prose: p.classList.contains('page--prose'),
        x0: Math.floor(x0),
        x1: Math.ceil(x1),
        y0: Math.max(0, Math.ceil(r.top)),
        y1: Math.min(innerHeight, Math.floor(r.bottom)),
      });
    }
    const t = document.querySelector('.wx-toggle')?.getBoundingClientRect();
    const toggle = t ? { x0: t.left - 2, x1: t.right + 2, y0: t.top - 2, y1: t.bottom + 2 } : null;
    return { cols, toggle, width: innerWidth, height: innerHeight };
  });
}

/** Decode two PNGs in a page and count differing pixels inside and outside the columns. */
async function diff(browser, a, b, box) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const out = await page.evaluate(
    async ({ a, b, box }) => {
      const load = async (b64) => {
        const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const g = c.getContext('2d');
        g.drawImage(bmp, 0, 0);
        return g.getImageData(0, 0, bmp.width, bmp.height);
      };
      const A = await load(a);
      const B = await load(b);
      const colAt = (x, y) => box.cols.find((c) => x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1);
      const onToggle = (x, y) =>
        box.toggle && x >= box.toggle.x0 && x < box.toggle.x1 && y >= box.toggle.y0 && y < box.toggle.y1;
      let colDiff = 0;
      let proseDiff = 0;
      let colMax = 0;
      let colPixels = 0;
      let marginDiff = 0;
      let maxDelta = 0;
      const bbox = [Infinity, Infinity, -Infinity, -Infinity];
      for (let y = 0; y < A.height; y++) {
        for (let x = 0; x < A.width; x++) {
          const i = (y * A.width + x) * 4;
          const d = Math.max(
            Math.abs(A.data[i] - B.data[i]),
            Math.abs(A.data[i + 1] - B.data[i + 1]),
            Math.abs(A.data[i + 2] - B.data[i + 2]),
          );
          const col = colAt(x, y);
          if (col) {
            if (onToggle(x, y)) continue;
            colPixels++;
            if (d > 0) {
              colDiff++;
              if (col.prose) proseDiff++;
              colMax = Math.max(colMax, d);
              bbox[0] = Math.min(bbox[0], x);
              bbox[1] = Math.min(bbox[1], y);
              bbox[2] = Math.max(bbox[2], x);
              bbox[3] = Math.max(bbox[3], y);
            }
          } else if (d > 0) {
            marginDiff++;
            maxDelta = Math.max(maxDelta, d);
          }
        }
      }
      return { colDiff, proseDiff, colMax, colPixels, marginDiff, maxDelta, bbox: colDiff ? bbox : null };
    },
    { a: a.toString('base64'), b: b.toString('base64'), box },
  );
  await ctx.close();
  return out;
}

/** Every visible button is what is under its own centre. */
async function buttonsHit(page) {
  return page.evaluate(() => {
    const missed = [];
    let n = 0;
    for (const b of document.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit) continue;
      // The sticky running head can cover a button scrolled under it; that is not the weather.
      if (hit.closest('.weather')) missed.push(b.textContent?.trim());
      else n++;
    }
    return { n, missed };
  });
}

/**
 * Nothing that carries text or takes a click is under a strip: every button,
 * link, field and line of text on screen, clipped to whatever scrolls it,
 * against every margin strip the layer has cut.
 */
async function textUnderStrips(page) {
  return page.evaluate(() => {
    const strips = [...document.querySelectorAll('.wx-strip')].map((s) => s.getBoundingClientRect());
    const clipOf = (el) => {
      let r = el.getBoundingClientRect();
      let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const ar = a.getBoundingClientRect();
        box = { l: Math.max(box.l, ar.left), t: Math.max(box.t, ar.top), r: Math.min(box.r, ar.right), b: Math.min(box.b, ar.bottom) };
      }
      return box;
    };
    const hits = [];
    let n = 0;
    const els = document.querySelectorAll(
      '.spread .page button, .spread .page a, .spread .page input, .spread .page select, .spread .page p, .spread .page li, .spread .page td, .spread .page th, .spread .page h1, .spread .page h2, .spread .page span',
    );
    for (const el of els) {
      const b = clipOf(el);
      if (b.r - b.l < 1 || b.b - b.t < 1 || b.b < 0 || b.t > innerHeight) continue;
      n++;
      for (const s of strips) {
        if (b.l < s.right - 0.5 && b.r > s.left + 0.5 && b.t < s.bottom && b.b > s.top) {
          hits.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent?.trim().slice(0, 30)}" x ${Math.round(b.l)}–${Math.round(b.r)} vs strip ${Math.round(s.left)}–${Math.round(s.right)}`);
          break;
        }
      }
    }
    return { n, hits };
  });
}

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const report = { shots: [], diffs: [], perf: [] };
try {
  /* ------------------------------------------- nights, sizes, schemes */
  if (!perfOnly) {
  const only = arg('nights', '');
  for (const night of NIGHTS.filter((n) => !only || only.split(',').includes(n.weather))) {
    const configs = [];
    for (const size of SIZES) {
      for (const scheme of ['light', 'dark']) configs.push({ size, scheme, still: false });
      configs.push({ size, scheme: 'light', still: true });
    }
    for (const { size, scheme, still } of configs) {
      if (night.weather === 'clear' && (still || scheme === 'dark')) continue;
      const tag = `weather-${night.weather}-${size.name}-${still ? 'still' : scheme}`;
      const { context, page } = await open(browser, size, { scheme, still });
      await page.goto(url(night.seed));
      await page.waitForSelector('.choices');
      await page.waitForTimeout(300);
      const layer = await page.evaluate(() => {
        const w = document.querySelector('.weather');
        return {
          weather: w?.getAttribute('data-weather'),
          motion: w?.getAttribute('data-motion'),
          hidden: w?.hidden,
          pe: w ? getComputedStyle(w).pointerEvents : null,
          z: w ? getComputedStyle(w).zIndex : null,
          rain: !!document.querySelector('.wx-rain'),
          frost: document.querySelectorAll('.wx-corner').length,
          fog: !!document.querySelector('.wx-haze'),
          steam: w?.getAttribute('data-steam') === 'true',
          strips: document.querySelectorAll('.wx-strip').length,
          running: document
            .getAnimations()
            .filter((a) => a.effect?.target?.closest?.('.weather') && a.playState === 'running').length,
        };
      });
      if (layer.weather !== night.weather) fail(`${tag}: layer says ${layer.weather}, roll says ${night.weather}`);
      if (layer.pe !== 'none') fail(`${tag}: pointer-events ${layer.pe}`);
      if (layer.z !== '-1') fail(`${tag}: z-index ${layer.z}`);
      if (layer.strips === 0) fail(`${tag}: no margin strips`);
      if (layer.rain !== (night.weather === 'rain' && !still)) fail(`${tag}: rain ${layer.rain}`);
      if ((layer.frost > 0) !== (night.weather === 'cold')) fail(`${tag}: frost ${layer.frost}`);
      if (layer.fog !== (night.weather === 'fog')) fail(`${tag}: fog ${layer.fog}`);
      if (still && (layer.steam || layer.running > 0 || layer.motion !== 'false')) {
        fail(`${tag}: reduced motion still moves (steam ${layer.steam}, ${layer.running} running)`);
      }
      if (!still && night.weather !== 'clear' && layer.running === 0) fail(`${tag}: nothing moving`);

      await settle(page);
      const hits = await buttonsHit(page);
      if (hits.missed.length) fail(`${tag}: layer over buttons ${hits.missed.join(', ')}`);

      if (night.weather !== 'clear') {
        const path = `${shots}/${tag}.png`;
        await page.screenshot({ path });
        report.shots.push(path);
      }
      // The pair to compare is taken with the switch in view, so the click
      // that follows does not scroll the page between the two.
      await page.locator('.wx-toggle').scrollIntoViewIfNeeded();
      await page.waitForTimeout(50);
      const hits2 = await buttonsHit(page);
      if (hits2.missed.length) fail(`${tag}: layer over buttons ${hits2.missed.join(', ')}`);
      const under = await textUnderStrips(page);
      if (under.hits.length) fail(`${tag}: text under the weather: ${under.hits.slice(0, 4).join('; ')}`);
      const box = await boxes(page);
      const on = await page.screenshot();
      // The switch, clicked for real with the layer on.
      await page.locator('.wx-toggle').click();
      const off = await page.evaluate(() => ({
        hidden: document.querySelector('.weather')?.hidden,
        stored: localStorage.getItem('dashiell:weather'),
        label: document.querySelector('.wx-toggle')?.textContent,
      }));
      if (!off.hidden || off.stored !== 'off' || off.label !== 'weather off') {
        fail(`${tag}: the switch did not turn it off (${JSON.stringify(off)})`);
      }
      await page.mouse.move(0, 0);
      await page.waitForTimeout(50);
      const offShot = await page.screenshot();
      const d = await diff(browser, on, offShot, box);
      report.diffs.push({ tag, ...d, buttons: hits.n + hits2.n, text: under.n });
      // The reading column and its choices: not one pixel. The rest of the
      // text (the notebook's running head, outside any scroller) may round a
      // single level while an animation runs under it, because the browser
      // then rasterizes the spread's foreground in a layer of its own; more
      // than 1/255 would be a change anybody could see, and fails.
      if (d.proseDiff > 0) fail(`${tag}: ${d.proseDiff} pixels changed in the reading column, in ${d.bbox}`);
      if (d.colMax > 1) fail(`${tag}: text changed by ${d.colMax}/255 inside the content columns, in ${d.bbox}`);
      if (night.weather !== 'clear' && d.marginDiff === 0) fail(`${tag}: nothing showed in the margins`);
      console.log(
        `${tag}: layer ${layer.weather}, reading column pixels changed ${d.proseDiff}, all columns ${d.colDiff}/${d.colPixels} (max Δ ${d.colMax}/255), margin pixels changed ${d.marginDiff} (max Δ ${d.maxDelta}), ${hits.n + hits2.n} buttons clear, ${under.n} text boxes clear of the strips`,
      );
      await context.close();
    }
  }

  /* ------------------------------ a click, a turn back, a reload, the title */
  {
    const { context, page } = await open(browser, SIZES[0]);
    await page.goto(url(3));
    await page.waitForSelector('.choices');
    await page.evaluate(() => {
      window.__layer = document.querySelector('.weather');
    });
    await page.locator('button.choice').first().click();
    await page.waitForFunction(() => document.querySelector('.pager span')?.textContent?.startsWith('page 2 '));
    await page.locator('.pager button', { hasText: 'back' }).click();
    await page.waitForFunction(() => document.querySelector('.pager span')?.textContent?.startsWith('page 1 '));
    const kept = await page.evaluate(() => ({
      same: window.__layer === document.querySelector('.weather'),
      weather: document.querySelector('.weather')?.getAttribute('data-weather'),
      frostRunning: document
        .getAnimations()
        .filter((a) => a.effect?.target?.classList?.contains('wx-corner')).length,
    }));
    if (!kept.same || kept.weather !== 'cold') fail(`turn back: layer not kept (${JSON.stringify(kept)})`);
    console.log(`click a choice, turn back: layer kept ${kept.same}, still ${kept.weather}`);

    await page.locator('.wx-toggle').click();
    await page.reload();
    await page.waitForSelector('.choices');
    const after = await page.evaluate(() => ({
      hidden: document.querySelector('.weather')?.hidden,
      label: document.querySelector('.wx-toggle')?.textContent,
      pressed: document.querySelector('.wx-toggle')?.getAttribute('aria-pressed'),
    }));
    if (!after.hidden || after.label !== 'weather off' || after.pressed !== 'false') {
      fail(`reload: the switch was not remembered (${JSON.stringify(after)})`);
    }
    await page.locator('.wx-toggle').click();
    const back = await page.evaluate(() => document.querySelector('.weather')?.getAttribute('data-weather'));
    if (back !== 'cold') fail(`switch back on: ${back}`);
    console.log(`reload with the switch off: ${after.label}; on again: ${back}`);

    await page.goto(`${base}/`);
    await page.waitForSelector('.title-page');
    const title = await page.evaluate(() => {
      const w = document.querySelector('.weather');
      return w === null || w.hidden || !w.isConnected;
    });
    if (!title) fail('title page shows weather');
    console.log(`title page: no weather ${title}`);
    await context.close();
  }

  /* ------------------------------------------------ blocked storage */
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    const page = await context.newPage();
    await page.goto(url(4));
    await page.waitForSelector('.choices');
    await page.locator('.wx-toggle').click();
    const ok = await page.evaluate(() => document.querySelector('.weather')?.hidden === true);
    if (!ok) fail('blocked storage: the switch does not work');
    console.log(`blocked storage: the switch works ${ok}`);
    await context.close();
  }

  /* ------------------------------------------------------------ steam */
  {
    // A cold night sends a wisp up within a few seconds; catch one mid-rise.
    for (const size of SIZES) {
      const { context, page } = await open(browser, size);
      await page.goto(url(3));
      await page.waitForSelector('.choices');
      const seen = await page
        .waitForSelector('.wx-wisp', { state: 'attached', timeout: 25_000 })
        .then(() => true)
        .catch(() => false);
      if (!seen) fail(`steam ${size.name}: no wisp in 25 s on a cold night`);
      else {
        await page.waitForTimeout(1800);
        await page.evaluate(() => {
          for (const a of document.getAnimations()) {
            const el = a.effect?.target;
            if (el?.classList?.contains('wx-corner')) a.finish();
            else if (el?.closest?.('.weather')) a.pause();
          }
        });
        const path = `${shots}/weather-steam-${size.name}-light.png`;
        await page.screenshot({ path });
        report.shots.push(path);
        const hits = await buttonsHit(page);
        if (hits.missed.length) fail(`steam ${size.name}: over buttons ${hits.missed.join(', ')}`);
        console.log(`steam ${size.name}: a wisp rose within 25 s, ${hits.n} buttons clear`);
      }
      await context.close();
    }
  }
  }

  /* --------------------------------------------------- the main thread */
  if (!skipPerf) {
    for (const size of SIZES) {
      for (const night of NIGHTS.slice(0, 3)) {
        const row = { size: size.name, weather: night.weather };
        for (const mode of ['on', 'off']) {
          const { context, page } = await open(browser, size, { off: mode === 'off' });
          const cdp = await context.newCDPSession(page);
          // A phone is slower than this laptop: throttle it 4×.
          if (size.phone) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await page.goto(url(night.seed));
          await page.waitForSelector('.choices');
          await page.waitForTimeout(1500);
          await cdp.send('Performance.enable');
          // No requestAnimationFrame counter here: one would force a main-thread
          // frame every vsync and measure itself. Main-thread time per second is
          // the number; per frame is that over 60.
          const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
          await page.waitForTimeout(perfSeconds * 1000);
          const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
          const d = (k) => (m1[k] - m0[k]) * 1000;
          row[mode] = {
            taskMsPerSec: d('TaskDuration') / perfSeconds,
            styleMsPerSec: d('RecalcStyleDuration') / perfSeconds,
            layoutMsPerSec: d('LayoutDuration') / perfSeconds,
            scriptMsPerSec: d('ScriptDuration') / perfSeconds,
            taskMsPerFrame: d('TaskDuration') / perfSeconds / 60,
          };
          await context.close();
        }
        report.perf.push(row);
        const f = (x) => x.toFixed(2);
        console.log(
          `perf ${size.name}${size.phone ? ' (4× CPU throttle)' : ''} ${night.weather}: ` +
            `on ${f(row.on.taskMsPerSec)} ms/s main thread (${f(row.on.taskMsPerFrame)} ms a 60 Hz frame; style ${f(row.on.styleMsPerSec)}, layout ${f(row.on.layoutMsPerSec)}, script ${f(row.on.scriptMsPerSec)} ms/s); ` +
            `off ${f(row.off.taskMsPerSec)} ms/s (${f(row.off.taskMsPerFrame)} ms/frame)`,
        );
      }
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${report.shots.length} screenshots in ${shots}/`);
if (failures.length) {
  console.log(`${failures.length} failures`);
  process.exit(1);
}
console.log('all weather checks passed');
