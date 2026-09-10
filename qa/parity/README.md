# Phase 0 parity baseline

Drives the legacy `index.html` through every feature documented in
`CLAUDE.md` and records screenshots + DOM/localStorage state snapshots. This
is the reference the Vite/React/TS rewrite gets diffed against in Phase 7 —
re-run the same script against the new app and compare `out/snapshot.json`
and the screenshots step-by-step.

## Run it

```
npm install
node baseline.mjs
```

Serves the repo root over a local HTTP server (not `file://`, to match how
the real app is served) and writes 32 numbered steps to `out/`:
`NN-name.png` + a consolidated `out/snapshot.json` with the captured DOM
text and `bingoCallerBoard` / `bingoCallerTheme` localStorage contents at
each step.

## Coverage

Mark/unmark, undo, reset (cancel + confirm, round archiving), location
tagging across three rounds (two named locations + one left blank, to cover
the "Unspecified location" bucket), the history modal (both tabs, the
all/scoped location filter, both clear-confirm flows with their scoped vs.
unscoped copy), all 11 color themes (verified via computed
`background-color`, not just class names), reload persistence, and the scan
flow's three distinct states: manual-entry fallback when OCR fails
mid-read, the separate fallback copy for when the Tesseract library never
loads at all, and the hot/warm/cold comparison legend.

## Note on transitions

`.cell` has a 150ms CSS transition on `background`/`border-color`/`transform`.
`record()` waits 250ms before every screenshot/state read so captures reflect
the settled state, not an in-flight transition — confirmed this mattered:
an early, un-waited capture showed called cells retaining their raw column
color instead of the documented panel-blend look, purely due to timing.
