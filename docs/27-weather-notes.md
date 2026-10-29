# Weather on the window — notes

Branch `weather` first (2026-09): the designer, "can we have weather effects on screen? Rain, frost,
maybe some manhole cover steam? Nothing major." Branch `weather2` (2026-10): "I think we can
improve the weather effects."

Every night rolls its weather (`run.weather`: `clear`, `rain`, `fog` or `cold`,
`WEATHERS[(seed*13+tier) % 4]` in `src/game/board/engine.ts`; at tier 1, seed 1 is fog, 2 cold, 3
clear, 4 rain), and the prose already says what it is. The screen agrees, as if the book were read
at a window: rain runs down the glass, frost grows in from its edges, fog pools low, steam rises off
a manhole cover now and then, and a neon sign outside the window's left edge hums every night.

## History

- **2026-09, `weather`.** Rain, frost, fog and steam in the margins only, under the text.
- **2026-09-24.** Designer: "let weather go over the text, assuming that it's mostly transparent
  anyway." The layer went to one full-window zone at `z-index: 5`, over the pages.
- **2026-10, `weather2`.** Over the text it read badly at 1280×800: the rain faint slanted
  scratches on the screen, the frost grey mottled smudges over the choices, the fog a grey film that
  mostly lowered the text's contrast, clear nothing at all. Designer: "As if you read the book at a
  window: rain runs down the glass, frost grows at the edges, fog pools low and in the margins. The
  text column stays clear and crisp." So the weather is back in the margins and under the page
  (`z-index: -1`), the frost and the clear night are rebuilt, and the sign is new. Cold and clear
  were the weakest; rain and fog keep their character.

## What was built

| | Where |
|---|---|
| The night → the screen, pure | `effectsFor(weather, { enabled, reducedMotion, narrow, rain })` in `src/ui/weather.ts` |
| The margins, pure | `pageColumn`, `marginZones`, `stripMask` |
| The frost, pure | `fernFrost`, `etchedFrost`, `rimeFrost`, `rimeGlints`, `frostMask`, `stageDelay` |
| The sign, pure | `signFor`, `tubeMask`, `TUBE_BLUR`, `WASH`, `neonReach` |
| The switch, pure | `loadWeatherOn(store)`, `saveWeatherOn(store, on)`, key `dashiell:weather` |
| The layer | `createWeatherLayer()` in `src/ui/weather.ts`, styles in `src/ui/weather.css` |
| Wiring | `src/ui/board-book.ts`: the spread is kept across renders; `weather.show(run.weather)`; the switch in the pager |
| The lab (dev only, comes out before merge) | `src/ui/weather-lab.ts`, `?wxlab=1` |
| Tests | `test/ui/weather.test.ts` |

No dependencies, no canvas. `src/game` is untouched.

## What each night shows

| Night | On the glass | The sign | Steam (a wisp every …) |
|---|---|---|---|
| clear | nothing but the sign: its main effect | crisp tubes, a clean glow spilling in | 45–110 s, faint |
| rain | drops beaded and running down; streaks falling beyond | drawn into vertical streaks; its colour runs down the glass in rivulets and rides in the drops near it | 22–50 s |
| fog | a haze pooled low, two sheets drifting over 70 s and 97 s | a wide soft halo, the tubes softened | 22–50 s |
| cold | frost grown in from the edges and corners over ~13 s, then still | diffused by the frost; the crystals near it take its colour | 7–18 s, a little whiter |
| title page | rain (as before) | through the rain | 22–50 s |
| switched off | nothing, the sign included | — | — |

**The sign** hangs just past the window's left edge (it's the wider side at 1280, where the
notebook's grid reaches nearly to the right edge). It hums, a slow breath of brightness (opacity
1 → 0.8 over 4.6 s, alternate), and every 20–60 s it flickers: a buzz (half a second of stutter),
one letter out for a beat, or the whole tube out for a beat and back. The first flicker comes 6–16 s
in, so a short visit sees one. The light on the glass goes with it.

**Its colour** is argon blue (`--wx-neon: #4d8bff`, core `#e1ebff`), the 1920s' blue tube, and none
of the book's meanings: not the law's red, the clock's amber, the choices' jade and lacquer, or the
carbon violet. A test holds every `--wx-neon` in `weather.css` at a CIE76 ΔE over 30 from each of
those tokens (argon is ~47 from carbon, its nearest). The lab has a rose (`#ff5fb4`) to compare; it
reads as a pink tube, not the stamp's salmon red.

**Reduced motion** (`prefers-reduced-motion: reduce`, or the lab's "still"): the still version. The
frost is there, formed; the fog is there, not drifting; the sign is steady (no hum, no flicker, and
the lab's flicker button does nothing); a rain night keeps the sign's smear, still; no drops, no
streaks, no steam. `effectsFor` drops what moves, and the stylesheet turns every animation in the
layer off as well (also under `data-motion="false"`), in case the preference changes mid-case (the
layer also rebuilds on the media query's `change`).

**The switch**: `weather on` / `weather off`, a small faint button at the right of the pager,
`aria-pressed`, labelled "Weather effects". Remembered under `dashiell:weather` (`off` or `on`;
absent is on). A store that throws reads as on and the switch still works for the page's life. Off
is nothing at all, the sign included.

**Turned-back pages**: the weather is the night's, not the page's. The book keeps the spread element
from one render to the next (clearing everything in it but the layer), so turning a page does not
restart the rain or regrow the frost.

## Where it sits, and why so

The layer is one element, `div.weather`, the first child of `.spread` (or of the title page's
`.title-sheet`), `aria-hidden`, `pointer-events: none`:

- **Under the page.** `.spread` is its own stacking context (`isolation: isolate`) and the layer is
  `position: absolute; z-index: -1` inside it: on the paper and the window's edge, under every
  word, panel, button, focus ring and hover card. (2026-09-24 had it at `z-index: 5`, over the
  pages; that's undone.)
- **Across the window.** It is `100vw` wide, centred on the spread, so on a screen wider than the
  book (78rem, 1482 px) it reaches the margins outside the book too. `.spread` lets it out sideways
  with `overflow-x: visible; overflow-y: clip`, only under `@supports (overflow: clip)`.
- **Only in the margins.** After every render, resize, and the phone's notebook class change, the
  layer measures each visible `.page` (and the title page's `.title-page`): `pageColumn` takes its
  content box, widened to any child that reaches into the page's padding (the notebook's body does,
  for the grid; the choices' lacquer panel does by 16 px), plus two pixels of air. Two kinds of child
  don't count: one out of the flow (the skip link, parked above the page), and a band as wide as the
  page itself (on a phone, the choices' panel and the page's foot), which has an opaque ground of
  its own and simply covers the weather under it as it scrolls past. What is left of the window is
  the margins, and the layer cuts one strip per margin, `overflow: hidden`, feathered by a
  `mask-image` gradient toward any side that meets text (30 px wide, 8 px on a phone), never toward
  the window's edge. Inside each strip a window-sized view keeps the fog, the frost and the sign's
  light in one coordinate system, so the margins read as one window. A re-cut (a resize) carries on
  from where the weather had got to (`--wx-age`, a negative `animation-delay`).

The margins, measured (headless Chrome, a night's first page):

| Window | Left | Gutter | Right |
|---|---|---|---|
| 1280×800 | 0–31 | 660–711 | 1269–1280 |
| 1512×982 | 0–46 | 768–835 | 1486–1512 |
| 1920×1080 | 0–250 | 972–1039 | 1690–1920 |
| 375×812 | 0–14 | — | 361–375 |
| title page, 1280 | 0–369 | — | 911–1280 |

So at 1280 the weather is slivers at the edges (the book fills the window); at 1512 a little more;
at 1920 the outer margins are wide and it is all there.

**Phones.** The only margins are the two 14 px gutters, and the choices' panel runs edge to edge
over them. Rain, fog and steam in a strip that thin were a flicker of noise beside the reading, so
`narrow` (under 600 px) drops them: the sign's light at the left gutter carries the night (crisp,
smeared, haloed, frosted, as on a wide screen), and a cold night has its frost along both edges.

**Why not `position: fixed`, and why strips.** The first version (2026-09) was one fixed full-window
layer with a single mask. It changed text pixels: a fixed element is composited over the whole
window, and Chrome then rasterizes the text painted after it in a layer of its own, a shade
differently. Strips that overlap no text leave the text as it was.

## How it is drawn (all CSS, compositor-driven)

- **The frost**: each version is a seeded drawing in window pixels (`fernFrost`, `etchedFrost`,
  `rimeFrost`), made of pieces tagged with the stage of the growth they form in and the x-span they
  cover. For each margin and each of the 9 stages, `frostMask` writes an SVG mask whose view box is
  the margin itself, holding only what falls in it; the stage's element is the margin's size,
  `background: var(--wx-frost)`, and fades in when its turn comes (`stageDelay`: 0 s to 10.8 s,
  quick at first and slowing, each over 2.2 s), so the frost advances in from the edges and is still
  by ~13 s. Near the sign each stage holds a second, neon-coloured layer under the same mask, inside
  the sign's flicker group, so the crystals there take its light and lose it when it goes out.
- **The sign**: five letters, each its own element (so one can drop out), each two masks of an SVG
  tube (`tubeMask`: the core, and the glow around it, blurred by the night's `TUBE_BLUR`;
  anisotropic in the rain); a radial wash of its colour from the left edge (`WASH`, by night); a
  faint line where it catches the window's edge. All inside `.wx-lit` (the hum, a CSS animation) >
  `.wx-flick` (the flicker, `Element.animate()` on opacity).
- **Rain**: drops beaded (two seeded tiles of lenses, one slowly fading in and out as drops form
  and run off) and a few running down in fits (`wx-run-a/b/c`, transform keyframes that gather,
  slide, catch and slide on; 6–13 s each), and, with "both", the old streaks falling beyond the
  glass at 60%. Near the sign, its colour runs down in rivulets (a streak tile sliding on transform)
  and rides in the drops.
- **Fog**: a static haze, a pool low down, and two sheets of soft radial blobs drifting on
  `transform`, 70 s and 97 s.
- **Steam**: `Element.animate()` on two or three radial-gradient puffs per wisp, in a margin chosen
  by its width.

The only script that runs is a `setTimeout` for the next wisp and one for the next flicker; neither
is scheduled while the tab is hidden (`visibilitychange`), and the layer's CSS animations are paused
then too.

## The versions, and the lab

The designer chooses by watching, so each of the frost and the sign has three takes, and the rain
two ways, all in the same layer: a `WeatherLook` option object (`frost`, `neon`, `hue`, `rain`) and
data attributes on `.weather` (`data-frost`, `data-neon`, `data-hue`, `data-rain`). The takes not
chosen, and the lab, come out before merge.

| | 1 | 2 | 3 |
|---|---|---|---|
| Frost | **fern**: crisp white-blue dendrites, a stem with pinnae at 60° barbed with finer needles, long ones from the corners and short ones all along the edges, over a thin rime band hugging the edge | **etched**: Deco geometry, as a speakeasy door's etched panel: a sunburst in each corner (frosted quarter disc, alternate wedges to a double arc, stepped beyond), a frosted border with a hairline inside, small fans along the edges; it unfolds outward | **rime**: a soft frosted band along the edges, uneven and thicker in the corners, creeping inward; fine six-armed crystals in it, and four-pointed glints in five sheets that catch the light on their own clocks (6.3–13.9 s) |
| Sign | **HOTEL**: a vertical sign beside the window, its tubes cropped by the edge, the glow spilling in | **light**: no letters, the colour of a sign out of frame washing the edge of the glass (stronger wash, a brighter edge) | **wet glass**: the sign hardly there; its colour as smears in the glass, and on a rain night strong rivulets and drops carrying it |
| Colour | **argon** blue | rose, to compare | |
| Rain | streaks (falling, as before) | runs (drops on the glass) | **both** |

**The lab**: on the dev server, add `?wxlab=1` to a night's URL (or the title page's). A small panel
in the bottom right corner: the night (the roll, or clear / rain / fog / cold), the frost, the sign,
its colour, the rain, and `regrow` (the frost grows again), `flicker` (now), `still` (the reduced
motion version), `hide`. What it shows is in the URL (`wx`, `wxfrost`, `wxneon`, `wxhue`, `wxrain`,
`wxstill`) and survives a reload and the book's own URL rewrites, so a link opens the same view. It
is not in the build: the import is behind `import.meta.env.DEV`, and without the parameter there is
no lab.

## Checked in a real browser

Headless Chrome (playwright-core, the Chrome on the machine) against the dev server, every weather ×
every version at 1280×800, 1512×982, 1920×1080 and 375×812, stills in the session's scratchpad:

- In all 45 desktop configurations no strip intersects any text-bearing element (paragraph, button,
  link, list item, cell, heading, label, the choices' panel, the running head, the pager), and the
  page never scrolls sideways (`scrollWidth` = the window). On a phone the only element over a
  gutter is the choices' panel, edge to edge, whose ground covers the weather under it.
- The frost's growth, in series a second or two apart; the sign's own first flicker, caught as it
  ran (after 8–14 s) for each take; a steam wisp rising in the left margin of a cold night within
  4 s.
- Reduced motion: the frost formed at once, the fog still, the sign steady, no drops, streaks or
  steam. The switch, clicked: nothing in the layer at all.
- The lab: no panel without `?wxlab=1`; each button sets the layer's data attribute and the URL;
  a reload and a page turn keep it; "roll" gives the night back.

## Performance

A Chrome trace of 4 s in a steady state, at 1920 (main-thread frame work: style, layout, paint,
commit):

| | Commits/s | Style + paint |
|---|---|---|
| weather off | 0.8 | — |
| clear, HOTEL | 0.8 | — |
| rain, wet glass | 0.8 | — |
| fog, HOTEL | 0.3 | — |
| cold, fern, formed | 0.8 | — |
| cold, rime, formed | 2.8 | 0.8 ms/s (the glint sheets starting) |
| cold, fern, growing | 6.8 | 1.7 ms/s, for the 13 s it grows |
| 375, rain, wet glass | 0.8 | — |

That is: once the frost has formed nothing the weather does needs the main thread; the hum, the
rain, the drops, the fog and the glints all run on the compositor. Building a night's masks is a
one-off: the fern at 1920 is ~22 ms to draw and ~6 ms to write its masks (~560 KB of SVG across
the margins, culled to 64 px columns), the etched and rime a few ms; at 1280 and on a phone less.

## Not done

- The weather does not change through the night (one sky per case); nothing in `src/game` was
  touched.
- No canvas: none of this needs per-frame drawing.
- The neon is always at the left edge; it could move with the book's spread side if the designer
  wants it on the right.
