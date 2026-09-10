# Bingo Caller's Board

A single-file, no-build-step bingo caller's tracker. Everything — markup, CSS,
and JS — lives in `index.html`. There is no bundler, no package.json, no
framework; the file is opened directly in a browser.

## Project goals

This app is used in real weekly bingo sessions and **must work offline** —
that's not aspirational, it's a hard constraint on any change. It's headed
toward a mobile-friendly web app and, eventually, an App Store / Play Store
release. Treat the following as hard constraints, not nice-to-haves, on any
future work:

- **Touch target size** — controls need to stay comfortably tappable on a
  phone, not just clickable with a mouse.
- **Viewport behavior on phones** — layout must hold up on real phone
  viewports (safe areas, small screens, on-screen keyboard pushing content),
  not just a resized desktop browser window.
- **Offline capability** — the app must keep working with no network
  connection, including the parts that currently depend on a CDN (Tesseract.js).

## Feature inventory

**Calling board**
- 75-cell B-I-N-G-O grid (1–15 / 16–30 / 31–45 / 46–60 / 61–75 per column).
- Tap a cell to mark it called; tap again to unmark (`toggle(n)`).
- "Last called" ball + label shows the most recent call; the matching cell
  gets a `.latest` gold ring.
- Session counter (`#countVal`) shows total numbers currently called.
- Per-column background/border/text colors are theme-driven (see Themes).
- Called cells intentionally render in the board's own background color
  (`.cell.called` uses `background: var(--panel)`, the same value `.board`
  itself uses) rather than a highlight color — a called number is meant to
  visually recede/fade into the board rather than stand out. This is a
  deliberate design decision, not a bug — do not "fix" it into a highlight
  color. The only visual marker retained on a called cell is the gold ring
  on whichever one was called most recently (`.cell.called.latest`).

**Undo**
- `Undo last` pops the most recent entry off `state.history` and un-marks it.
- This is a true call-order stack, separate from the archived round history
  (see Quirks below) — order matters, not just set membership.

**Reset**
- `Reset board` opens an in-page confirm bar (not `window.confirm`).
- Confirming archives the current `called` set as a completed round into
  `state.rounds` (tagged with the current location and a timestamp), then
  clears `called`/`history`.
- If nothing was called, resetting does not create an empty round.

**Location tagging**
- Free-text input above the board (`#locationInput`), persisted live to
  `state.currentLocation` on every keystroke.
- Backed by a `<datalist>` (`#locationSuggestions`) in the markup, but nothing
  in the script currently populates it — see Quirks.
- Stamped onto each round when it's archived at reset time.

**Round history modal**
- Opened via `History` button; shows a summary line, a location filter
  (`__all__` or one specific location), two tabs:
  - **Number history**: 1–75 tally grid, count per number, filtered by the
    selected location.
  - **Frequency stats**: top-10 most-called numbers as horizontal bar rows,
    ranked by count, filtered the same way.
- `Clear last round` / `Clear all history` are scoped to the active location
  filter (label text and behavior change when a specific location is
  selected vs. "All locations"). Both go through the same in-page
  `#clearConfirmBar` confirm pattern, with `pendingClearAction` tracking which
  action is pending.

**Color themes**
- 11 built-in column-color themes (Classic, Rainbow, Murica, Grayscale, The
  Blues, Greenie, Valentines, Blackout, XMas, Sunset, Grape), each defining
  bg/border/optional text-override for columns B/I/N/G/O.
- Applying a theme writes CSS custom properties (`--col-b-bg`, etc.) onto
  `:root`; the actual cell coloring comes from CSS rules like `.cell.col-b`
  reading those variables, not from JS setting inline styles per cell.
- Persisted independently of board state under its own key.

**Card scanner (OCR)**
- `Scan my card vs. history` opens a 3-step modal:
  1. Upload/take a photo (`<input type="file" accept="image/*"
     capture="environment">`).
  2. Tesseract.js OCR (loaded from a CDN `<script>` tag) reads the image;
     recognized words are bucketed into a 5×5 grid by bounding-box position
     (`parseOcrIntoCard`), assuming a roughly evenly-spaced card and the
     standard center FREE space (index 12). The user reviews/corrects every
     cell before proceeding.
  3. "Compare to history" cross-references the entered card numbers against
     the tally computed from `state.rounds` and buckets each as hot/warm/cold
     relative to the median count, with an explicit disclaimer that this is
     retrospective, not predictive.
- If Tesseract fails to load (offline, e.g.) or OCR throws, the flow falls
  back to a blank manual-entry grid rather than failing outright.

## localStorage keys and data shapes

### `bingoCallerBoard`
Main app state, JSON-serialized on every mutation via `save()`.

```ts
{
  called: number[];       // numbers currently marked on the board (set-like, order not meaningful)
  history: number[];       // call order, used only as an undo stack (toggle() pushes on mark,
                           // filters the value out on unmark — NOT an append-only log)
  rounds: {
    numbers: number[];     // the `called` set at the moment of reset
    endedAt: string;       // ISO 8601 timestamp
    location: string;      // free-text, may be '' (see locationLabel() -> "Unspecified location")
  }[];
  currentLocation: string; // live-bound to the location input, independent of any archived round
}
```

Read defensively at startup: each field is individually type-checked
(`Array.isArray` / `typeof === 'string'`) before being adopted, and a corrupt
value silently falls back to the default rather than throwing.

### `bingoCallerTheme`
Plain string, one of the `THEMES` object keys (`classic`, `rainbow`, `murica`,
`grayscale`, `blues`, `greenie`, `valentines`, `blackout`, `xmas`, `sunset`,
`grape`). Falls back to `'classic'` if missing or unrecognized.

## Quirks worth knowing before touching this code

- **Confirmations are in-page UI, not `window.confirm`.** Both the board
  reset and the two history-clear actions use a hidden `.confirm-bar` element
  toggled with a `.show` class, with explicit Cancel/Yes buttons and, for
  clears, dynamically-rewritten confirm text depending on the active location
  filter. There is no use of native `confirm()`/`alert()` anywhere in the app.
- **`state.history` is not the round history.** It's easy to conflate with
  `state.rounds` (which back the History modal) — `state.history` is only an
  undo stack of the current round's call order and gets wiped on reset.
- **CSS relies on compound selectors + CSS custom properties for theming.**
  Column color is applied via rules like `.cell.col-b { background:
  var(--col-b-bg); ... }`; switching themes only rewrites the `--col-*-bg /
  -border / -text` custom properties on `:root` (`applyTheme()`), it never
  touches cell inline styles or classes. Any refactor that drops the
  `.cell.col-*` class combination or the custom-property indirection will
  silently break theming.
- **The board's DOM order is column-major, not the order cells were
  created.** `.grid` uses `grid-template-columns: repeat(5, 1fr)`,
  `grid-template-rows: repeat(15, 1fr)`, and `grid-auto-flow: column`. Because
  of `grid-auto-flow: column`, the visual layout depends on DOM order
  matching column-then-row — `buildGrid()` already appends in that order, but
  `reflow()` exists as a separate step that re-appends all cells in the same
  column-major order (currently a no-op given how `buildGrid()` populates
  things, but present in case cells are ever appended out of order, e.g. by a
  future feature). The tally grid (`.tally-grid`) uses the identical
  grid/reflow convention for the same reason.
- **Tesseract.js is a CDN `<script>` tag, not a bundled dependency.** There's
  no npm install, no local vendoring, no integrity hash. Offline-first
  behavior is done by checking `typeof Tesseract === 'undefined'` at scan
  time and falling back to a manual-entry grid — the app never blocks on the
  script tag failing to load.
- **Tabler icon markup (`<i class="ti ti-camera">`, etc.) has no
  corresponding stylesheet link in `<head>`.** The icons used on the
  location bar, "Scan my card", and "Color theme" buttons reference Tabler
  Icons CSS classes, but nothing in `index.html` loads `tabler-icons.css` (or
  equivalent) from a CDN or locally. Unless something outside this file
  supplies that stylesheet, those icons render as empty/missing glyphs.
- **The location `<datalist>` (`#locationSuggestions`) is present in markup
  but never populated by script.** No code writes `<option>`s into it from
  `state.rounds`' distinct locations, so autocomplete suggestions currently
  never appear despite the wiring being half in place.
- **OCR column/row bucketing has no perspective correction.** It assumes the
  card is reasonably axis-aligned and evenly spaced, using bounding-box
  min/max extents divided into 4 equal steps — skewed or cropped photos will
  misplace numbers into the wrong grid cell.
- **`computeTally()`'s filter argument is optional and behaves differently by
  caller.** `renderHistory()` always passes the current filter value
  explicitly; `renderScanResults()` calls `computeTally()` with no argument,
  which (via `getRoundsForFilter(undefined)`) is treated as "all locations."
  This is intentional (the scanner always compares against full history) but
  isn't obvious from the call site alone.
- **Single monolithic file, everything global.** All state, DOM references,
  and event listeners live directly in one `<script>` block with no modules,
  no namespacing beyond variable names, and no build step — safe to assume
  any top-level `const`/`let` is accessible to any other code in the file.

## Development workflow

- **Browser caching has already cost significant debugging time here.**
  After making any change, verify it with a hard refresh (Cmd+Shift+R) or in
  a private/incognito window before concluding the change didn't work. A
  stale cached copy of `index.html` (or, once bundling exists, of built
  assets) looking identical to the "unfixed" version is a known trap in this
  project, not a hypothetical one.
- **Two real bugs in this app were invisible to code inspection** and were
  only found by actually rendering the page headless (Playwright) and
  inspecting what painted. When a visual/behavioral change doesn't show up
  the way the code says it should, prefer rendering the page and looking at
  the actual output over re-reading and reasoning about the CSS/JS harder.
