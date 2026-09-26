# Bingo Caller's Board

A bingo caller's tracker, currently a **Vite + React + TypeScript** app under
`src/`. It started life as a single-file, no-build-step `index.html` (markup,
CSS, and JS all in one file) — that original is preserved at
`legacy/index.html` as a reference and as the fixture the parity test suite
(`qa/parity/`) diffs the rewrite against. `index.html` at the repo root is now
just the Vite HTML shell that mounts `src/main.tsx`; it is not the app.

Migration history, oldest to newest: `0882b13` (original single-file v12) →
`0d21186` (CLAUDE.md added) → `ad63043` (Playwright parity baseline captured
against the legacy app) → `884f00d`/`1427102`/`14a3f4f` (Vite/React scaffold +
calling board ported, confirmed against the baseline) → `cc11a15`/`f576bb6`
(location tagging, round history, color themes ported) → `e2bca68` (card
scanner ported, OCR made fully self-hosted).

## Project goals

This app is used in real weekly bingo sessions and **must work offline** —
that's not aspirational, it's a hard constraint on any change. It's headed
toward a mobile-friendly web app and, eventually, an App Store / Play Store
release. Currently deployed as a GitHub Pages project site
(`base: '/Bingo_App/'` in `vite.config.ts`, target
`skyewalker3.github.io/Bingo_App/`) — changing the hosting target means
updating that `base` value. Treat the following as hard constraints, not
nice-to-haves, on any future work:

- **Touch target size** — controls need to stay comfortably tappable on a
  phone, not just clickable with a mouse.
- **Viewport behavior on phones** — layout must hold up on real phone
  viewports (safe areas, small screens, on-screen keyboard pushing content),
  not just a resized desktop browser window.
- **Offline capability** — the app must keep working with no network
  connection. This now includes OCR (see Card scanner below) — the last
  CDN dependency was removed in `e2bca68` — and, as of the PWA layer (see
  below), the app shell itself: a built app registers a service worker that
  precaches the JS/CSS/HTML/icons, so a cold reload with no network still
  loads the full app, not just the parts already resident in a live tab.

## Codebase layout

```
index.html            Vite HTML shell (mounts #root, loads src/main.tsx) — not the app itself
src/main.tsx           React entry point
src/App.tsx            Top-level component; owns modal open/close state, wires hooks to children
src/state/boardState.ts   BoardState/Round types + localStorage load/save (bingoCallerBoard key)
src/hooks/useBoardState.ts  toggle/undo/reset/location/clear actions over BoardState, persists on every change
src/hooks/useTheme.ts   Theme id state; applies + persists via lib/themes.ts
src/lib/bingo.ts        B-I-N-G-O letters, column ranges/classes, letterFor()
src/lib/themes.ts       THEMES table, applyTheme() (writes CSS custom properties), theme load/save
src/lib/history.ts      Location label/filter helpers, computeTally()
src/lib/scan.ts         classifyCount()/medianOf() for the hot/warm/cold scan comparison
src/lib/ocr.ts          Self-hosted Tesseract.js wrapper: recognizeCardImage(), parseOcrIntoCard()
src/components/*.tsx    Board, Controls, Header, LastCalled, LocationBar, HistoryModal, ThemeModal, ScanModal, icons
src/index.css           All app styling (ported from the legacy inline <style>)
legacy/index.html       Original single-file app; kept as the parity fixture, not maintained for new features
qa/parity/              Playwright-driven parity harness — see qa/parity/README.md and below
public/tesseract/       Self-hosted Tesseract.js worker + WASM core (plain/simd/relaxedsimd)
public/tessdata/        Self-hosted English trained-data (eng.traineddata.gz)
public/pwa-*.png, public/maskable-icon-*.png, public/apple-touch-icon-*.png, public/favicon.ico
                        Generated PWA icons — see PWA layer below, don't hand-edit
pwa-assets.config.ts    Icon-generation config for @vite-pwa/assets-generator (source: public/favicon.svg)
```

Build/dev commands (`package.json`): `npm run dev` (Vite dev server),
`npm run build` (`tsc -b && vite build`), `npm run lint` (oxlint), `npm run
preview`, `npm run pwa:assets` (regenerate PWA icons from `public/favicon.svg`
— see PWA layer below).

## PWA layer

The app is a installable PWA via `vite-plugin-pwa` (`vite.config.ts`), on top
of the Vite/React app — not a separate build. `npm run build` emits
`dist/manifest.webmanifest`, `dist/sw.js`, and a Workbox runtime bundle
alongside the normal JS/CSS.

- **App shell precache.** The service worker precaches only
  `**/*.{js,css,html,svg,png,ico}` at install time (`workbox.globPatterns` in
  `vite.config.ts`) — the built JS/CSS bundle, `index.html`, and the icon
  set. `workbox.globIgnores` explicitly excludes `tesseract/**` and
  `tessdata/**` from this precache.
- **OCR assets are runtime-cached, not precached.** The ~14MB Tesseract
  worker/core/language files (see Card scanner above) are deliberately left
  out of the install-time precache — most installs never open the scanner,
  so forcing that download upfront would be a bad tradeoff for an
  offline-first PWA. Instead, `workbox.runtimeCaching` registers a
  `CacheFirst` route for `/(tesseract|tessdata)/` requests: the first time
  `src/lib/ocr.ts` actually fetches them, the service worker caches the
  response (1-year expiration, up to 10 entries) so every OCR run after
  that — online or offline — is served from that cache. This makes the
  "works offline once fetched/cached once" comment in `src/lib/ocr.ts`
  durable (survives eviction of the browser's plain HTTP cache) rather than
  just an incidental side effect of it.
- **`registerType: 'autoUpdate'`** (not the Workbox/vite-plugin-pwa default
  of `'prompt'`) — a caller reopening the app between rounds always gets the
  latest deployed build with no manual "reload to update" step. Safe here
  because all real state lives in `localStorage`, not in memory that a
  silent reload would lose.
- **Manifest** (`vite.config.ts`'s `VitePWA({ manifest: {...} })`):
  `display: 'standalone'`, `theme_color`/`background_color` both
  `#1b2a2f` to match `src/index.css`'s `--bg`, and `start_url`/`scope` both
  `/Bingo_App/` to match the GitHub Pages `base`.
- **Icons are generated, not hand-drawn.** `pwa-assets.config.ts` (config
  for `@vite-pwa/assets-generator`) rasterizes `public/favicon.svg` into
  `public/pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, and
  `favicon.ico`. Maskable/Apple variants get 30% padding and a `#1b2a2f`
  background (overriding the library's white default) to match the app's
  dark theme — see `pwa-assets.config.ts`. Re-run `npm run pwa:assets`
  after changing the source SVG; don't hand-edit the generated PNGs.
- **`index.html`** carries the PWA-relevant `<meta>` tags by hand
  (`theme-color`, `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style`, and `viewport-fit=cover` so a
  standalone/fullscreen launch doesn't leave a stray bar under an iPhone
  notch) — `vite-plugin-pwa` injects the `<link rel="manifest">` and the
  service-worker registration `<script>` itself at build time; it does not
  add those meta tags for you.
- **Full `env(safe-area-inset-*)` CSS padding is not done yet** —
  `viewport-fit=cover` above only stops the browser chrome itself from
  clipping/misbehaving in standalone mode; the app's own layout doesn't yet
  reserve space around notches/home-indicators. That's a follow-on task, not
  covered by the PWA layer itself.
- Dev server (`npm run dev`) does **not** register a service worker by
  default (`devOptions.enabled` is unset/false) — test PWA/offline behavior
  against `npm run build && npm run preview`, not the dev server.

## Feature inventory

**Calling board** (`src/components/Board.tsx`, `src/lib/bingo.ts`)
- 75-cell B-I-N-G-O grid (1–15 / 16–30 / 31–45 / 46–60 / 61–75 per column).
- Tap a cell to mark it called; tap again to unmark (`useBoardState().toggle(n)`).
- "Last called" ball + label (`LastCalled.tsx`) shows the most recent call;
  the matching cell gets a `.latest` gold ring.
- Session counter (`Header.tsx`, `#countVal`) shows total numbers currently
  called.
- Per-column background/border/text colors are theme-driven (see Themes).
- Called cells intentionally render in the board's own background color
  (`.cell.called` uses `background: var(--panel)`, the same value `.board`
  itself uses) rather than a highlight color — a called number is meant to
  visually recede/fade into the board rather than stand out. This is a
  deliberate design decision, not a bug — do not "fix" it into a highlight
  color. The only visual marker retained on a called cell is the gold ring
  on whichever one was called most recently (`.cell.called.latest`).

**Undo**
- `Undo last` pops the most recent entry off `state.history` and un-marks it
  (`useBoardState().undo()`).
- This is a true call-order stack, separate from the archived round history
  (see Quirks below) — order matters, not just set membership.

**Reset**
- `Reset board` opens an in-page confirm bar (`Controls.tsx`'s `.confirm-bar`,
  not `window.confirm`).
- Confirming (`useBoardState().reset()`) archives the current `called` set as
  a completed round into `state.rounds` (tagged with the current location and
  a timestamp), then clears `called`/`history`.
- If nothing was called, resetting does not create an empty round.

**Location tagging** (`LocationBar.tsx`)
- Free-text input above the board (`#locationInput`), persisted live to
  `state.currentLocation` on every keystroke (`useBoardState().setLocation`).
- Backed by a `<datalist>` (`#locationSuggestions`), populated from
  `getDistinctLocationValues(state.rounds)` in `src/lib/history.ts` — distinct
  non-empty location strings actually used in past rounds. (In the legacy app
  this datalist existed in markup but nothing populated it; the React port
  fixed that.)
- Stamped onto each round when it's archived at reset time.

**Round history modal** (`HistoryModal.tsx`)
- Opened via `History` button; shows a summary line, a location filter
  (`__all__` or one specific location), two tabs:
  - **Number history**: 1–75 tally grid, count per number, filtered by the
    selected location.
  - **Frequency stats**: top-10 most-called numbers as horizontal bar rows,
    ranked by count, filtered the same way.
- `Clear last round` / `Clear all history` are scoped to the active location
  filter (label text and behavior change when a specific location is
  selected vs. "All locations"). Both go through the same in-page
  `#clearConfirmBar` confirm pattern, with `pendingClear` state tracking
  which action is pending.

**Color themes** (`ThemeModal.tsx`, `src/lib/themes.ts`)
- 11 built-in column-color themes (Classic, Rainbow, Murica, Grayscale, The
  Blues, Greenie, Valentines, Blackout, XMas, Sunset, Grape), each defining
  bg/border/optional text-override for columns B/I/N/G/O.
- Applying a theme (`applyTheme()`) writes CSS custom properties
  (`--col-b-bg`, etc.) onto `:root`; the actual cell coloring comes from CSS
  rules in `src/index.css` like `.cell.col-b` reading those variables, not
  from React setting inline styles per cell.
- Persisted independently of board state under its own `localStorage` key.
- `useTheme()` applies the saved theme in `useLayoutEffect` (not `useEffect`)
  specifically so it happens before first paint — see Quirks.

**Card scanner (OCR)** (`ScanModal.tsx`, `src/lib/ocr.ts`)
- `Scan my card vs. history` opens a 3-step modal:
  1. Upload/take a photo (`<input type="file" accept="image/*"
     capture="environment">`).
  2. Tesseract.js OCR reads the image; recognized words are bucketed into a
     5×5 grid by bounding-box position (`parseOcrIntoCard`), assuming a
     roughly evenly-spaced card and the standard center FREE space (index
     12). The user reviews/corrects every cell before proceeding.
  3. "Compare to history" cross-references the entered card numbers against
     the tally computed from `state.rounds` and buckets each as hot/warm/cold
     relative to the median count, with an explicit disclaimer that this is
     retrospective, not predictive.
- **OCR is fully self-hosted, not CDN-loaded.** `tesseract.js` is an npm
  dependency (`package.json`); its worker script, all three WASM core
  variants (plain/simd/relaxedsimd, LSTM-only), and the English
  trained-data file are vendored under `public/tesseract/` and
  `public/tessdata/` (~14MB total) and served from the app's own origin —
  see `src/lib/ocr.ts`'s `WORKER_PATH`/`CORE_PATH`/`LANG_PATH`. Recognition
  itself works fully offline once those assets have been fetched/cached once;
  this is the change described in commit `e2bca68`.
- All three WASM core variants are vendored deliberately — skipping the
  `relaxedsimd` variant to save ~4MB was tried and broke OCR outright on at
  least one real Chromium build that supports `relaxedSimd`; there is no safe
  way to guess device WASM feature support in advance.
- Two fallback paths, with distinct copy, mirrored from the legacy app:
  - `OcrUnavailableError` — the worker/core/language assets themselves fail
    to load (e.g. genuinely offline with nothing cached yet).
  - A plain `recognize()` throw — OCR ran but failed on this image.
  Either way the flow falls back to a blank manual-entry grid rather than
  failing outright.

## localStorage keys and data shapes

### `bingoCallerBoard`
Main app state (`src/state/boardState.ts`'s `BoardState`), JSON-serialized on
every mutation via `saveBoardState()` (called from a `useEffect` in
`useBoardState`).

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

Read defensively at startup (`loadBoardState()`): each field is individually
type-checked (`Array.isArray` / `typeof === 'string'`) before being adopted,
and a corrupt value silently falls back to the default rather than throwing.

### `bingoCallerTheme`
Plain string, one of the `THEMES` object keys (`classic`, `rainbow`, `murica`,
`grayscale`, `blues`, `greenie`, `valentines`, `blackout`, `xmas`, `sunset`,
`grape`). Falls back to `'classic'` if missing or unrecognized.

## Quirks worth knowing before touching this code

- **Confirmations are in-page UI, not `window.confirm`.** Both the board
  reset (`Controls.tsx`) and the two history-clear actions
  (`HistoryModal.tsx`) use a `.confirm-bar` element toggled with a `.show`
  class, with explicit Cancel/Yes buttons and, for clears, dynamically
  rewritten confirm text depending on the active location filter. There is
  no use of native `confirm()`/`alert()` anywhere in the app.
- **`state.history` is not the round history.** It's easy to conflate with
  `state.rounds` (which back the History modal) — `state.history` is only an
  undo stack of the current round's call order and gets wiped on reset.
- **CSS relies on compound selectors + CSS custom properties for theming.**
  Column color is applied via rules like `.cell.col-b { background:
  var(--col-b-bg); ... }` in `src/index.css`; switching themes only rewrites
  the `--col-*-bg / -border / -text` custom properties on `:root`
  (`applyTheme()`), it never touches cell inline styles or classes beyond the
  static `col-b`/`col-i`/etc. class each cell is born with. Any refactor that
  drops the `.cell.col-*` class combination or the custom-property
  indirection will silently break theming.
- **`useTheme()` uses `useLayoutEffect`, not `useEffect`, on purpose.** It
  applies the saved theme's CSS custom properties before the browser paints,
  matching the legacy app's guarantee (it called `applyTheme()` synchronously
  before the board ever rendered). `useEffect` fires after paint and would
  flash Classic's colors first for anyone with a different saved theme —
  this was a real bug, fixed in `33a98f6`; don't "simplify" it back to
  `useEffect`.
- **The board's DOM order is column-major by construction, not by a
  reflow step.** `.grid` uses `grid-template-columns: repeat(5, 1fr)`,
  `grid-template-rows: repeat(15, 1fr)`, and `grid-auto-flow: column`.
  `Board.tsx` maps `RANGES` (columns) outer and numbers inner specifically so
  JSX emits cells in column-then-row order already — there is no separate
  reflow step like the legacy app's `reflow()` (which existed there only in
  case cells were ever appended out of order). The tally grid
  (`HistoryModal.tsx`'s `.tally-grid`) follows the same column-major mapping
  for the same reason; if either grid's cell order stops matching
  column-then-row, the visual layout breaks silently.
- **Tesseract.js is an npm dependency, vendored under `public/`, not a CDN
  `<script>` tag.** There's no `<script src="https://...">` anywhere in this
  app. Offline-first behavior is done by catching a failure to load the
  worker/core/language assets (`OcrUnavailableError`) and falling back to a
  manual-entry grid — the app never blocks on those local asset fetches
  failing. See Card scanner above.
- **Two real `tesseract.js@7` API differences from the CDN `tesseract.js@5`
  the legacy app used** (both caught by actually running recognition, not by
  reading the types) — worth knowing before touching `src/lib/ocr.ts`:
  `recognize()`'s output param defaults to `{ text: true }` only, so `.blocks`
  (and word bounding boxes) comes back `null` unless you pass
  `{ blocks: true }`; and there's no flat `result.data.words` convenience
  array anymore — words nest under `blocks -> paragraphs -> lines -> words`
  and have to be flattened by hand (`flattenWords()`).
- **Tabler icon markup is gone.** The legacy app referenced Tabler Icons CSS
  classes (`<i class="ti ti-camera">` etc.) with no stylesheet actually
  linked anywhere, so those icons never rendered. The React port
  (`src/components/icons.tsx`) replaced them with small self-hosted inline
  SVG components instead of adding a CDN icon-font dependency, staying
  consistent with the offline-first goal.
- **The location `<datalist>` is populated now**, unlike the legacy app
  (see Location tagging above) — don't assume it's dead wiring if you're
  used to the legacy quirk.
- **OCR column/row bucketing has no perspective correction.** It assumes the
  card is reasonably axis-aligned and evenly spaced, using bounding-box
  min/max extents divided into 4 equal steps — skewed or cropped photos will
  misplace numbers into the wrong grid cell.
- **`computeTally()`'s filter argument is optional and behaves differently by
  caller.** `HistoryModal.tsx` always passes the current filter value
  explicitly; `ScanModal.tsx` calls `computeTally()` with no argument, which
  (via `getRoundsForFilter(rounds, undefined)`) is treated as "all
  locations." This is intentional (the scanner always compares against full
  history) but isn't obvious from the call site alone.
- **State and theming are React hooks now, not one global script block** —
  `useBoardState()` and `useTheme()` own their respective slices, and
  `src/lib/*.ts` holds pure logic with no DOM/React dependency. This is the
  opposite of the legacy app's "everything global" single `<script>` — don't
  assume top-level mutable state exists outside these hooks.

## Parity testing (`qa/parity/`)

The React rewrite was built incrementally against a Playwright-driven parity
harness, and that harness is still the regression check for this app, not
just migration scaffolding:

- `baseline.mjs` drives `legacy/index.html` through every documented feature
  and records screenshots + DOM/localStorage snapshots to `out/` (including
  `out/snapshot.json`), serving over local HTTP (not `file://`) to match how
  the real app is served.
- `compare-slice.mjs` / `compare-history.mjs` / `compare-themes.mjs` /
  `compare-scanner.mjs` each drive the *current* React app the same way and
  diff against that baseline, plus cover behavior the baseline never
  exercised (e.g. `compare-scanner.mjs` does a real end-to-end OCR pass
  through a synthetic card image and asserts zero non-localhost network
  requests, to actually prove the offline claim rather than assume it).
- Each comparison writes its own `*-parity-report.json` (checked in) with
  pass/fail per assertion.
- `.cell` has a 150ms CSS transition on `background`/`border-color`/
  `transform`; capture code waits ~250ms before every screenshot/state read
  so captures reflect settled state, not an in-flight transition — this
  mattered in practice (see `qa/parity/README.md`).

When changing a feature these scripts cover, re-run the relevant
`compare-*.mjs` against the running app (dev or preview server) rather than
assuming a code read is enough to confirm parity held.

## Development workflow

- **Browser caching has already cost significant debugging time here.**
  After making any change, verify it with a hard refresh (Cmd+Shift+R) or in
  a private/incognito window before concluding the change didn't work. A
  stale cached copy of the built assets looking identical to the "unfixed"
  version is a known trap in this project, not a hypothetical one.
- **Some real bugs in this app were invisible to code inspection** and were
  only found by actually rendering the page (Playwright, see Parity testing
  above) and inspecting what painted — e.g. the pre-paint theme flash fixed
  in `33a98f6`. When a visual/behavioral change doesn't show up the way the
  code says it should, prefer rendering the page and looking at the actual
  output over re-reading and reasoning about the CSS/JS harder.
