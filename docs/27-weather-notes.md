# Weather on the window — notes

Branch `weather` first (2026-09): the designer, "can we have weather effects on screen? Rain,
frost, maybe some manhole cover steam? Nothing major." Branch `weather2` (2026-10): "I think we can
improve the weather effects."

Every night rolls its weather (`run.weather`: `clear`, `rain`, `fog` or `cold`,
`WEATHERS[(seed*13+tier) % 4]` in `src/game/board/engine.ts`; at tier 1, seed 1 is fog, 2 cold, 3
clear, 4 rain), and the prose already says what it is. The screen agrees, as if the book were read
at a window: rain runs down the glass, rime creeps in from its edges, fog pools low, steam rises off
a manhole cover now and then, and a HOTEL sign hangs just outside the window's left edge every
night.

## History

- **2026-09, `weather`.** Rain, frost, fog and steam in the margins only, under the text.
- **2026-09-24.** Designer: "let weather go over the text, assuming that it's mostly transparent
  anyway." The layer went to one full-window zone at `z-index: 5`, over the pages.
- **2026-10, `weather2`.** Over the text it read badly at 1280×800: the rain faint slanted
  scratches on the screen, the frost grey mottled smudges over the choices, the fog a grey film that
  mostly lowered the text's contrast, clear nothing at all. Designer: "As if you read the book at a
  window: rain runs down the glass, frost grows at the edges, fog pools low and in the margins. The
  text column stays clear and crisp." So the weather went back to the margins and under the page
  (`z-index: -1`), and the cold and clear nights were rebuilt around a new neon sign outside the
  window. Three frosts (fern dendrites, Deco etched glass, rime and glints) and three takes on the
  sign (HOTEL letters, its light only, its light in the wet glass), an argon blue and a rose, and
  three rains (streaks, drops running, both) were built side by side in a dev-only lab
  (`?wxlab=1`), for the designer to choose by watching them move.
- **2026-10-29, the designer's picks.** "rime, both hotel and the rain, argon blue, both. no
  buttons, I think? other than maybe 'reduce motion'." So: the **rime**; the **HOTEL** sign every
  night, with the wet-glass take's treatment on top on a **rain** night; **argon** blue; the rain
  **both** (drops running on the glass, streaks falling beyond it). The other takes and the lab are
  gone. The reader's one control is the pager's switch, which gains a still: **weather on, weather
  still, weather off**.

## What shipped

| | Where |
|---|---|
| The night → the screen, pure | `effectsFor(weather, { mode, reducedMotion, narrow })` in `src/ui/weather.ts` |
| The switch, pure | `loadWeatherMode`, `saveWeatherMode`, `shownMode`, `nextMode`; key `dashiell:weather` |
| The margins, pure | `pageColumn`, `marginZones`, `stripMask` |
| The rime, pure | `rimeFrost`, `rimeGlints`, `frostMask`, `stageDelay` |
| The sign, pure | `signFor`, `tubeMask`, `TUBE_BLUR`, `WASH`, `neonReach` |
| The layer | `createWeatherLayer({ mode })` in `src/ui/weather.ts`, styles in `src/ui/weather.css` |
| Wiring | `src/ui/board-book.ts`: the spread is kept across renders; `weather.show(run.weather)`; the switch in the pager |
| Tests | `test/ui/weather.test.ts` |

No dependencies, no canvas. `src/game` is untouched.

## What each night shows

| Night | On the glass | The sign | Steam (a wisp every …) |
|---|---|---|---|
| clear | nothing but the sign: its main effect | crisp tubes, a clean glow spilling in | 45–110 s, faint |
| rain | drops beaded and running down in fits; streaks falling beyond, at 60% | drawn into vertical streaks; in the wet glass, smears of its colour, its colour running down in rivulets, and riding in the drops near it | 22–50 s |
| fog | a haze pooled low, two sheets drifting over 70 s and 97 s | a wide soft halo, the tubes softened | 22–50 s |
| cold | rime grown in from the edges and corners over ~13 s, then still; its crystals glint | diffused by the rime, whose crystals near it take its colour | 7–18 s, a little whiter |
| title page | rain (as before) | through the rain | 22–50 s |
| weather off | nothing, the sign included | — | — |

**The sign** hangs just past the window's left edge (the wider side at 1280, where the notebook's
grid reaches nearly to the right edge): HOTEL, five letters of tube stacked downward, cropped by the
edge so you partly make them out. It hums, a slow breath of brightness (opacity 1 → 0.8 over 4.6 s,
alternate), and every 20–60 s it flickers: a buzz (half a second of stutter), one letter out for a
beat, or the whole tube out for a beat and back. The first comes 6–16 s in, so a short visit sees
one. Its light on the glass (the wash, the rivulets, the colour in the rime) goes out with it.

**Its colour** is argon blue (`--wx-neon: #4d8bff`, core `#e1ebff`), the 1920s' blue tube, and none
of the book's meanings: not the law's red, the clock's amber, the choices' jade and lacquer, or the
carbon violet. A test holds `--wx-neon` at a CIE76 ΔE over 30 from each of those tokens (it is 47
from carbon, its nearest, and 78–121 from the rest).

## The switch: on, still, off

A small faint button at the right of the pager (`‹ back · page 3 of 9 · forward ›`), saying what
the weather is doing: **weather on**, **weather still**, **weather off**. A press goes on → still →
off → on. Its accessible name says the state and the next one ("weather still. Weather effects:
still. Press for off."; the visible words come first, so a voice user can say them), not
`aria-pressed`, which has only two states.

- **Still** is exactly the reduced-motion version (`effectsFor` with `mode: 'still'` equals it, and
  a test holds that on every night and screen): the rime formed at once, the sign steady (no hum, no
  flicker), the fog still, the rain night's smear of the sign in the glass still; no drops, no
  streaks, no steam. The layer's `data-motion="false"` turns every animation in it off.
- **Off** is nothing at all, the sign included.
- **Remembered** under `dashiell:weather`: `on`, `still` or `off`. Absent, or anything else, reads as
  on (so the old `on` and `off` still mean what they meant). The store is the book's `safeStore()`,
  and the helpers catch a throwing store as well: it reads as on, and the switch still works for the
  page's life.
- **The system's `prefers-reduced-motion`** forces still, whatever the switch says. Then the switch
  shows what you see: "weather still" for a stored on, and a press goes between still and off (there
  is no on to offer). What you press is what's stored. If the system setting changes with a page
  open, the layer rebuilds and the switch relabels.

It is on every page of the book, including a page turned back to; not on the verdict page, where
the weather keeps what it was set to. The title page has none (its rain follows the stored mode).

**Turned-back pages**: the weather is the night's, not the page's. The book keeps the spread element
from one render to the next (clearing everything in it but the layer), so turning a page does not
restart the rain or regrow the rime.

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
  the window's edge. Inside each strip a window-sized view keeps the fog, the rime and the sign's
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
smeared, haloed, frosted, as on a wide screen), and a cold night has its rime along both edges.

**Why not `position: fixed`, and why strips.** The first version (2026-09) was one fixed full-window
layer with a single mask. It changed text pixels: a fixed element is composited over the whole
window, and Chrome then rasterizes the text painted after it in a layer of its own, a shade
differently. Strips that overlap no text leave the text as it was.

## How it is drawn (all CSS, compositor-driven)

- **The rime**: a seeded drawing in window pixels (`rimeFrost`): the band along each edge in 8
  layers each reaching a little further in (so it is thickest at the edge), uneven along its length
  (three incommensurate swells, not a wave), thicker in the corners, blurred at its inner edge and
  grained at a crystal's scale; and in it six-armed crystals, denser toward the edge. Its pieces
  carry the stage of the growth they form in and the x-span they cover (each edge cut into 240 px
  lengths). For each margin and each of the 9 stages, `frostMask` writes an SVG mask whose view box
  is the margin itself, holding only what falls in it; the stage's element is the margin's size,
  `background: var(--wx-frost)`, and fades in when its turn comes (`stageDelay`: 0 s to 10.8 s,
  quick at first and slowing, each over 2.2 s), so the rime creeps in and is still by ~13 s. The
  glints (`rimeGlints`) are four-pointed catch-lights in five sheets, each flashing on its own
  clock (6.3–13.9 s), from 4–11.5 s in. Near the sign each stage and glint sheet holds a second,
  neon-coloured layer under the same mask, inside the sign's flicker group, so the crystals there
  take its light and lose it when it goes out.
- **The sign**: five letters, each its own element (so one can drop out), each two masks of an SVG
  tube (`tubeMask`: the core, and the glow around it, blurred by the night's `TUBE_BLUR`;
  anisotropic in the rain); a radial wash of its colour from the left edge (`WASH`, by night); a
  faint line where it catches the window's edge. All inside `.wx-lit` (the hum, a CSS animation) >
  `.wx-flick` (the flicker, `Element.animate()` on opacity). On a rain night, over the glass, a
  second group: tall soft smears of its colour, and its colour running down in rivulets (a streak
  tile sliding on transform, 300 px in from the edge).
- **Rain**: drops beaded (two seeded tiles of lenses, one slowly fading in and out as drops form
  and run off) and one to five running down each margin in fits (`wx-run-a/b/c`, transform
  keyframes that gather, slide, catch and slide on; 6–13 s each), carrying the sign's colour within
  150 px of it; and the streaks falling beyond the glass, two depths at 13°, at 60%.
- **Fog**: a static haze, a pool low down, and two sheets of soft radial blobs drifting on
  `transform`, 70 s and 97 s.
- **Steam**: `Element.animate()` on two or three radial-gradient puffs per wisp, in a margin chosen
  by its width.

The only script that runs is a `setTimeout` for the next wisp and one for the next flicker; neither
is scheduled while the tab is hidden (`visibilitychange`), or when still, and the layer's CSS
animations are paused while hidden too.

## Checked in a real browser

Headless Chrome (playwright-core, the Chrome on the machine) against the dev server, each night at
1280×800, 1512×982, 1920×1080 and 375×812, the switch's three states by real clicks, and the
system's reduced motion:

- At every desktop size no strip intersects any text-bearing element (paragraph, button, link,
  list item, cell, heading, label, the choices' panel, the running head, the pager), and the page
  never scrolls sideways (`scrollWidth` = the window). On a phone the only element over a gutter is
  the choices' panel, edge to edge, whose ground covers the weather under it.
- The switch: on → still → off → on by clicks, the label and the store following (`still`, `off`,
  `on`); still has `data-motion="false"` and, over 20 s, no running animation in the layer, no
  flicker and no wisp; off leaves nothing in the layer. Under the system's reduced motion a stored
  on shows "weather still", and presses go to off and back to still.
- On: the sign's own first flicker caught within 16 s; a steam wisp rising in the left margin of a
  cold night within 4 s; the rime's growth in a series of stills a second or two apart.

## Performance

A Chrome trace of 4 s in a steady state, at 1920 (main-thread frame work: style, layout, paint,
commit):

| | Commits/s | Style + paint |
|---|---|---|
| weather off | 0.8 | — |
| clear | 0.8 | — |
| rain | 0.8 | — |
| fog | 0.8 | — |
| cold, rime formed | 2.3 | 0.8 ms/s (a glint sheet starting its clock) |
| cold, rime growing | 8 | 3.4 ms/s (style 2.2, paint 0.8, pre-paint 0.4), for the 13 s it grows |
| 375, rain | 0.8 | — |

Once the rime has formed, nothing the weather does needs the main thread: the hum, the rain, the
drops, the fog and the glints all run on the compositor; a 60 Hz frame has 16.7 ms, and the worst
of it, while the rime grows, is under a twentieth of a millisecond a frame. Building a cold night's
masks is a one-off: at 1920, 3.3 ms to draw the rime and 2.0 ms to write its masks (110 KB of SVG
across the three margins); less at 1280 and on a phone.

## The lights outside (branch `lights`, in the lab)

The designer, after the weather shipped: "I think we should probably have some other lights to
balance beyond the neon — would there have been cars with lights? ambient light from another
building? It feels with it only on one side." Then, choosing a street lamp on the right and passing
headlights: "build it, but also build more variations — I wonder if we should have different
backgrounds when we move, or if it should always be the same."

Noir lighting is one hard key and a softer light from the other side, motivated by sources in the
scene (a street lamp, a window), with now and then slatted light through blinds. The 1920s give
them: electric headlamps on every car (about 7,000 yellow cabs), streets lit by electric lamps and
gas mantles (no sodium orange: that is the 1930s), neon from 1924, the El past apartment windows,
and Prohibition (a speakeasy lights no BAR sign; a bulb over a door).

**What's new on every night**

- **The street lamp**, just past the right edge: a soft warm white (`--wx-lamp: #f3e5c8`), steady,
  half as bright on the glass as the sign; its globe cropped by the edge. Fog shows its cone down to
  the street; rain runs its colour down the glass and carries it in the drops near it; the rime on
  that side warms. The lab's gas option is a mantle's greenish white (`--wx-gas: #f6f7e6`) with a
  faint shimmer.
- **Passing cars**: now and then (16–45 s on an ordinary street) a soft bar of headlamp light
  (`--wx-car`), slatted by blinds, sweeps across the whole window in one direction in two or three
  seconds, through every margin in turn. Wider and softer in fog. No cars when still, nor on a phone.

The pale lights are tested to stay low in chroma (≤ 18) and at least ΔE 27 from the book's red,
amber, jade, lacquer and carbon (the lamp is 47 from the clock's amber).

**The question, as four variations** (`viewFor(variation, scene)`; the layer's default on this
branch is D, the designer's leaning):

- **A. One window, all night.** The office's view always: HOTEL left, the lamp right, the cars.
- **B. By place.** The view is the building the reader is in, period-true, each with its own
  balance of a cool key at one edge and a warm, dimmer fill at the other:

  | Building | Left (key) | Right (fill) | And |
  |---|---|---|---|
  | the office | HOTEL, argon | electric lamp | |
  | bar, club (speakeasy) | a cold bare bulb over the door | a lamp, dimmer | a cab rank; more cars |
  | restaurant | CHOP SUEY, argon (Hopper's 1929 joint) | electric lamp | |
  | theatre | the marquee's warm chasing bulbs | the cool spill of the next theatre's sign | a cab rank; more cars |
  | work | a cold bulb over a loading door, dim | a dim lamp | the El nearby |
  | station (transit) | the El station's cold globe | a lamp under the tracks | the El, often |
  | rooming house | a small ROOMS, argon | lodgers' lit windows | few cars |
  | flat, home | a gas lamp's greenish white | a lit window across the way | few cars |

  A walk crossfades the view over 1.6 s (the old lights fade as the new come up), never a cut.
- **C. By the hour.** The office's view, with the night running on to eight on the book's clock
  (the night's, not a turned-back page's): cars thin after one; the margins start greying at 5:45
  (a New York winter's sunrise is about seven); the lamp goes out at first light, 6:45; the sign and
  every other light at seven; by eight the margins are morning grey, the deadline you can see. Dawn
  is the one big change; the rest is quiet.
- **D. Both**: the place's view, run through the hour.

**Guardrails** (the designer's, for D): nothing outside may read as a clue. The view comes only
from what the building is (`buildingOf`: `Place.kind`, or a rooming house), never its part in the
case: the scene, the night's unwatched place, a watched workplace all look like what they are. It
changes only with the clock and the place, that is on the player's actions, and only one way
through the night (a test walks every building from midnight to eight: the grey never lifts, a
light that goes out never comes back). No light event (a car, the El, a flicker, a wisp) comes
within 8 s of a new page, so nothing passes in the street just as something is found. Still and
reduced motion show the hour's state (the grey, the lights out) with the transitions instant.

**The lab** (`?wxlab=1` on the dev server; out before merge): the view (A / B / C / D), the place
(the book's, or any building), the hour (the book's, or a slider from midnight to eight), the night's
weather, the lamp (electric / gas), and a car, the El or the sign's flicker now; a line says what is
outside. Its settings ride in the URL (`wxview`, `wxplace`, `wxmin`, `wx`, `wxlamp`).

Checked in headless Chrome: every variation on every night at 1512 and 1920, D at 1280 and 375;
no strip over text, panels or buttons; no sideways scroll; a walk's crossfade; the hour stepped;
a car and the El caught going by; 75 s of page turns at a busy club with no light event closer than
8.6 s to a page. A steady-state trace shows no main-thread frame work for any building (the
marquee's chase and the gas shimmer run on the compositor).

## Not done

- The weather does not change through the night (one sky per case); nothing in `src/game` was
  touched.
- No canvas: none of this needs per-frame drawing.
- The sign is always at the left edge.
