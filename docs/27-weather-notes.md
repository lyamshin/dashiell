# Weather on the glass — notes

Branch `weather`. The designer: "can we have weather effects on screen? Rain,
frost, maybe some manhole cover steam? Nothing major."

Every night already rolls its weather (`rollDashiell` in
`src/game/voice/roll.ts`: `clear`, `rain`, `fog` or `cold`, carried in the save
as `state.cast.roll.weather`), and the prose already says what it is. The
screen now agrees, quietly, in the margins only.

## What was built

| | Where |
|---|---|
| The night → the screen, pure | `effectsFor(weather, { enabled, reducedMotion })` in `src/ui/weather.ts` |
| The margins, pure | `marginZones(columns, width)`, `stripMask(zone, width, feather)` in `src/ui/weather.ts` |
| The switch, pure | `loadWeatherOn(store)`, `saveWeatherOn(store, on)`, key `dashiell:weather` |
| The layer | `createWeatherLayer()` in `src/ui/weather.ts`, styles in `src/ui/weather.css` |
| Wiring | `src/ui/book.ts`: the spread is kept across renders; `weather.show(state.cast.roll.weather)`; the switch in the pager |
| Tests | `test/ui/weather.test.ts` |
| Browser check | `scripts/check-weather.mjs` (playwright-core, the Chrome on the machine) |

No dependencies. `src/game` is untouched.

## What each night shows

| Night | On screen | Steam (a wisp every …) |
|---|---|---|
| rain | faint streaks, two depths, falling at 13° | 22–50 s |
| cold | rime in the corners, forming over the first ~11 s, then still | 7–18 s, a little whiter |
| fog | a soft haze, thickest low down, two sheets drifting over 70 s and 97 s | 22–50 s |
| clear | nothing | 45–110 s, faint |
| title page, no case | nothing (the layer is not in the document) | — |
| switched off | nothing | — |

A wisp is two or three soft puffs rising from below the bottom edge of the
window, 22–38% of its height, spreading and fading over 5–8 s. The first comes
2.5–14.5 s after a case opens, so a short visit still sees one.

**Reduced motion** (`prefers-reduced-motion: reduce`): the still version. The
frost is there, already formed; the fog's haze is there, not drifting; no rain,
no steam. `effectsFor` drops rain and steam, and the stylesheet turns every
animation in the layer off as well, in case the preference changes mid-case
(the layer also rebuilds on the media query's `change`).

**The switch**: `weather on` / `weather off`, a small faint button at the right
of the pager (`‹ back · page 3 of 9 · forward ›`), `aria-pressed`, labelled
"Weather effects". Remembered under `dashiell:weather` (`off` or `on`; absent
is on). The store is the book's `safeStore()`, and the two helpers catch a
throwing store as well: blocked storage reads as on and the switch still works
for the page's life. It is on every page of the book, including a page turned
back to; it is not on the verdict page, where the weather keeps whatever it was
set to.

**Turned-back pages**: the weather is the night's, not the page's, so it does
not change. The book now keeps the spread element from one render to the next
(clearing everything in it but the layer), so turning a page does not restart
the rain or re-grow the frost.

## Where it sits, and why so

The layer is one element, `div.weather`, the first child of `.spread`,
`aria-hidden`, `pointer-events: none`:

- **Behind the text, on the paper.** `.spread` gets `isolation: isolate` (its
  own stacking context) and `position: relative`; the layer is
  `position: absolute; z-index: -1` inside it, so it paints over the spread's
  paper and the margins' `--paper-edge`, and under every word and button.
- **Across the window.** It is `100vw` wide, centred on the spread, so on a
  screen wider than the book (78rem) it reaches the margins outside the book
  too. `.spread` lets it out sideways with `overflow-x: visible;
  overflow-y: clip`, only under `@supports (overflow: clip)`; without that the
  spread keeps `overflow: hidden` and the weather stays on the book.
- **Only in the margins.** After every render, resize, and the phone's
  notebook class change, the layer measures each visible `.page`: its content
  box, widened to any direct child that reaches into the page margin (the
  notebook's scrolling body does on a wide screen, for the grid), plus two
  pixels of air. What is left of the window's width is the margins, and the
  layer cuts one strip per margin, `overflow: hidden`, feathered by a
  `mask-image` gradient toward any side that meets text (30 px on a wide
  screen, 8 px on a phone), never toward the window's edge. Inside each strip a
  window-sized view keeps fog and frost in one coordinate system, so the
  margins read as one weather. Strips are re-cut only when the margins
  actually move; a re-cut carries on from where the weather had got to
  (`--wx-age`, a negative `animation-delay`).

At 1280×800 the margins are the left one (window edge to the prose, ~64 px),
the gutter between the pages (~67 px), and a thin right one (~12 px: the
notebook's body reaches into its own margin for the grid). On a 390 phone they
are the two 16 px gutters (14 px after the air), so the phone's weather is
genuinely faint — a rime along the edges, an occasional streak.

**Why not `position: fixed`, and why strips rather than one masked sheet.** The
first version was one fixed full-window layer with a single left-to-right
mask. It changed text pixels: a fixed element is composited over the whole
window, and Chrome then rasterizes the text painted after it in a transparent
layer of its own, a shade differently (the notebook's running head moved by
1/255 in 344–755 pixels). An absolute layer made of strips that overlap no
text leaves the text exactly as it was whenever nothing is animating. While
something *is* animating, a composited child under the spread's content still
makes Chrome give the spread's foreground its own layer, and the one piece of
text that is outside every scroller — the notebook's running head on a wide
screen — rounds by at most 1/255 in its antialiasing. The reading column, the
choices and the notebook's body are scrollers with layers of their own and do
not change at all. `scripts/check-weather.mjs` holds both lines: zero changed
pixels in the prose page, and no text pixel anywhere changed by more than 1.

## How it is drawn (all CSS, compositor-driven)

- **Rain**: two sheets per strip, each a solid `--wx-rain` masked by a seeded
  SVG tile of short vertical streaks (180×420 with 24, 260×560 with 15), inside
  a container turned 13°; each sheet slides down one tile height on
  `transform` (2.1 s far, 1.55 s near), `linear infinite`. The far sheet is at
  60% opacity.
- **Frost**: a corner element per window corner that a strip reaches, masked by
  a seeded SVG: a radial rime, `feTurbulence` mottling, and seven fine needles
  with barbs growing from the two edges; the fill is `--wx-frost` with a
  cooler `--wx-frost-edge` toward the corner. Mirrored for the other corners,
  and grown once from the corner (`scale` 0.45 → 1, `opacity` 0 → 1, 11 s,
  staggered 0–1.2 s), then still.
- **Fog**: a static haze (`--wx-fog` at the bottom to `--wx-haze` above) and two
  sheets of soft radial blobs, 136% of the window, drifting ±5%/±1.5% on
  `transform`, 70 s and 97 s, `alternate`.
- **Steam**: `Element.animate()` on two or three radial-gradient puffs per
  wisp; the only script is a `setTimeout` for the next wisp, not scheduled
  while the tab is hidden (`visibilitychange`), and the layer's CSS animations
  are paused when hidden too.

Colours are tokens on `:root` (`--wx-rain`, `--wx-frost`, `--wx-frost-edge`,
`--wx-fog`, `--wx-haze`, `--wx-steam`), redefined for dark under
`prefers-color-scheme: dark` guarded by `:root:not([data-theme='light'])` and
again under `:root[data-theme='dark']`, as `book.css` does. On the cream paper
the weather is cool and pale; on the dark paper it is a pale grey at low alpha.

## Checked in a real browser

`node scripts/check-weather.mjs --url http://localhost:5217` (after
`npx vite --port 5217`). Nights: untiered, difficulty 2 (`?seed=N&d=2`), seeds
by `npm run read -- --seed N --pages 1`, whose cast line prints the roll:

| Night | Seed |
|---|---|
| rain | 4 |
| cold | 3 (also 5, 8, 12) |
| fog | 1 (also 2, 6, 7) |
| clear | 9 (also 10, 11) |

For each night at 1280×800 and 390×844, light and dark, and still (reduced
motion) — 20 configurations — it checks the layer shows the rolled night and
nothing else, `pointer-events: none`, `z-index: -1`; every visible button is
what is under its own centre, at the top of the page and scrolled to the
switch; no text-bearing element (button, link, field, paragraph, list item,
cell, heading, span; clipped to its scroller) intersects a strip; and then it
turns the weather off **with a real click on the switch**, with the layer on,
and compares the before and after screenshots pixel by pixel.

Result: in every configuration, **0 pixels changed in the reading column**
(prose, choices, pager), and no text pixel anywhere changed by more than 1/255
(the notebook's running head at 1280 while an animation runs, as above; 0 when
still, 0 on the phone). The margins did change (e.g. fog at 1280: ~95 000
pixels; frost at 1280: ~28 000; rain at 1280: ~1 600, it is faint).

Also: a choice clicked with the layer on turns the page, and turning back keeps
the same layer element, still `cold`; the switch turned off survives a reload
(`weather off`, `aria-pressed="false"`) and turns back on; the title page has
no weather; with `localStorage` throwing on access the switch still works; and
on a cold night a wisp of steam rises within 25 s, at both sizes.

`scripts/check-layout.mjs` (seeds 1–3, the oracle's route, 42 pages at each
size, clicking through with the weather on) still passes.
`scripts/check-grid.mjs --seed 3` fails "Grasso at ten shows 1 sources, wanted
2" at both sizes — and fails identically with `src/ui/book.ts` from `main`, so
it is not this branch (the seed's content has moved since the check was
written).

Screenshots, `docs/screens/`:

- `weather-rain-{1280,390}-{light,dark,still}.png`
- `weather-cold-{1280,390}-{light,dark,still}.png`
- `weather-fog-{1280,390}-{light,dark,still}.png`
- `weather-steam-{1280,390}-light.png` (a cold night, a wisp caught mid-rise)

The screenshots fast-forward the frost to formed and hold rain and fog still
for the shot; `-still` is the reduced-motion version (rain there is, correctly,
nothing).

## Performance

Measured by `scripts/check-weather.mjs` with CDP `Performance.getMetrics`
(headless Chrome on this Mac, M-series): open the night, wait 1.5 s, then take
`TaskDuration` (all main-thread work), `RecalcStyleDuration`,
`LayoutDuration` and `ScriptDuration` over 10 s, with the weather on and again
with `dashiell:weather = off`. The phone is 390×844 with CDP's 4× CPU
throttle. Per frame is ms/s ÷ 60. (The full test suite was running alongside,
so these are, if anything, high.)

| | On: main thread | per 60 Hz frame | of which style / script | Off |
|---|---|---|---|---|
| 1280, rain | 1.36 ms/s | 0.02 ms | 0.05 / 0.07 ms/s | 0.05 ms/s |
| 1280, cold | 1.63 ms/s | 0.03 ms | 0.15 / 0.07 ms/s | 0.06 ms/s |
| 1280, fog | 1.16 ms/s | 0.02 ms | 0.07 / 0.06 ms/s | 0.06 ms/s |
| 390 ×4 throttle, rain | 3.71 ms/s | 0.06 ms | 0.23 / 0.61 ms/s | 0.08 ms/s |
| 390 ×4 throttle, cold | 4.25 ms/s | 0.07 ms | 0.59 / 0.27 ms/s | 0.43 ms/s |
| 390 ×4 throttle, fog | 3.79 ms/s | 0.06 ms | 0.36 / 0.48 ms/s | 0.23 ms/s |

Layout is ~0 throughout: nothing the weather does moves anything else. The
animations run on the compositor; the main thread only wakes for the steam
timer and the odd animation tick. Worst case, when something else forces a
main-thread frame every vsync (an earlier run with a `requestAnimationFrame`
counter in the page, which does exactly that): 0.32 ms a frame on, against
0.11 off, at 1280; 0.45–0.82 against 0.13–0.20 on the throttled phone — still
under 1 ms of a 16.7 ms frame. GPU and compositor cost is not in these numbers:
the layer is at most a handful of small composited layers, each clipped to a
margin strip, at the device's pixel ratio.

The tab hidden: CSS animations do not run (and the layer sets
`animation-play-state: paused` on `visibilitychange`), and no wisp is
scheduled until the tab is visible again.

## Not done

- No weather on the title page, by the brief. The verdict page keeps the
  night's weather but has no switch.
- The weather does not change through the night (the roll is one sky per
  case); nothing in `src/game` was touched.
- No canvas: none of this needs per-frame drawing.
