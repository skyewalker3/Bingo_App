# Prompt for Claude Code

Copy everything in the box below into Claude Code as your first message, in the same
folder as `bingo-tracker-final.html` (see instructions beneath the box for how to set
that up).

---

I have a working single-file HTML/JS/CSS web app (`bingo-tracker-final.html`, attached
in this folder) that I want turned into a real, installable mobile app for iOS and
Android. Please build it using **Expo (React Native)**, since that gives me one
codebase for both platforms and an easy path to a real App Store / Play Store build
later via EAS.

## What the app currently does (all of this needs to carry over)

It's a bingo caller's assistant with these features:

1. **Main board**: a 5×15 grid of numbers 1-75, arranged in true B/I/N/G/O columns
   (column B = 1-15, I = 16-30, N = 31-45, G = 46-60, O = 61-75), each column a
   different color. Tapping a number toggles it "called" — called numbers visually
   sink to a muted background color, and the most-recently-called number gets a
   gold ring around it.
2. **Last called display**: a large readout showing the most recent number and its
   letter (e.g. "B-1"), plus a running count of how many numbers have been called
   this round.
3. **Undo last**: pops the most recent call back off.
4. **Reset board**: clears the current round after a confirmation prompt. When
   confirmed, if any numbers were called, the round gets archived into history
   (see below) before clearing.
5. **Location field**: an optional text input near the top ("Where are you playing
   today?") that stays set across rounds until changed. Whatever's in it gets
   tagged onto each round archived via Reset.
6. **Round history / stats modal**, opened via a "History" button, with:
   - A location filter dropdown: "All locations" plus every distinct location the
     user has typed so far (alphabetized), plus an "Unspecified location" bucket
     for rounds logged with no location set. Filtering updates everything below it.
   - Two tabs:
     - **"Number history"**: the same 5×15 B/I/N/G/O column layout as the main
       board, but each cell shows how many times that number has been called
       across all logged rounds (filtered by the selected location).
     - **"Frequency stats"**: a horizontal bar chart of the top 10 most-called
       numbers, ranked, with counts.
   - **Clear last round** and **Clear all history** buttons, each scoped to the
     current location filter (e.g. "Clear last round at Legion Hall" vs "Clear
     last round" when "All locations" is selected), each requiring a confirmation
     screen with the exact wording: "Are you sure you would like to clear? This
     cannot be undone, and you will lose all history." (adapted slightly per scope
     — see the HTML for exact copy).
7. **"Scan my card vs. history"**: lets the user photograph a physical bingo card,
   attempts OCR (currently via Tesseract.js loaded from a CDN) to read the 24
   numbers into a 5×5 grid (with a FREE center space), always shows an **editable**
   grid for the user to correct before proceeding (OCR is best-effort, never
   silently trusted), then compares the entered numbers against the logged
   history and tags each as "called more than most / about average / called less
   than most," with an explicit, prominent disclaimer that bingo draws are random
   every game and this reflects **past frequency only, not a prediction**. This
   framing/disclaimer is important — please keep it front and center, not fine
   print.
8. **Color theme picker**: 11 named column color themes (Classic, Rainbow, Murica,
   Grayscale, The Blues, Greenie, Valentines, Blackout, XMas, Sunset, Grape), each
   shown with 5 swatches next to its name. Selecting one recolors the B/I/N/G/O
   columns and header letters everywhere in the app, and the choice persists
   across app restarts.
9. All state (called numbers, round history with locations, current location
   text, selected theme) currently persists via `localStorage` in the browser —
   in the native app this should persist locally the same way (e.g.
   `AsyncStorage` or a small SQLite/MMKV store — your call on what's simplest and
   most reliable in Expo), so a user's history is never lost between sessions.

## What "native-ifying" should mean here — please don't just wrap the HTML

Please don't just drop this into a WebView. I'd like it rebuilt as genuine React
Native screens/components so it feels like a native app: native buttons, native
modal/sheet presentation for the History and Theme pickers, native text input for
the location field, haptic feedback on tapping a number (a light tap), and a
native camera/photo-picker flow for "Scan my card" (using `expo-camera` and/or
`expo-image-picker`).

For OCR specifically: Tesseract.js (the CDN-loaded JS library the web version
uses) is a web-only approach and won't work well in React Native. Please use
whatever on-device or cloud OCR approach is idiomatic and reliable for Expo (for
example `expo-camera` output fed to `react-native-mlkit-ocr` or Apple's / Google's
native text recognition via a Expo-compatible wrapper, or another suitable
package). Same requirement as before: OCR is a convenience, and the user **must**
always get an editable grid to confirm/correct the numbers before anything is
compared against history — never silently trust OCR output. If no solid
Expo-compatible on-device OCR package is available, fall back gracefully to
manual entry and tell me so, don't force a fragile integration.

## Design / theming

The current visual design is a warm, low-contrast dark theme: deep teal-green
background (`#1b2a2f`), slightly lighter panel color (`#223842`), cream text
(`#f2ead9`), gold accents (`#d9a441`), serif display font for headings ("Georgia"
or similar) paired with a clean sans-serif for UI text and numbers. Please carry
this look over as the default app theme — it's meant to feel like a warm,
old-fashioned bingo hall rather than a generic tech app. All the specific hex
colors for the 11 column themes are in the attached HTML file's `THEMES` object
in the `<script>` section — please pull the exact values from there rather than
re-guessing them.

## Project setup

- Use Expo with TypeScript.
- Structure it as a normal multi-screen/component Expo app (not a single giant
  file) — organize into logical components (BingoBoard, NumberCell,
  HistoryModal, ThemePickerModal, ScanCardModal, etc.) and a small state module
  or context for the shared app state described above.
- Set up the project so it's ready to run with `npx expo start` and eventually
  buildable via `eas build` for both iOS and Android.
- Please ask me before adding any paid/metered third-party service (e.g. a cloud
  OCR API with a per-call cost) — prefer free/on-device options first.

Let me know if anything above is ambiguous or if you'd like to see a rough file/
component plan before you start writing code.

---

## Notes for you (not part of the Claude Code prompt above)

- Attach or place **`bingo-tracker-final.html`** in the same project folder before
  running the prompt — Claude Code needs to actually read it to pull exact colors,
  copy text, and logic, rather than working from the paraphrased description above.
- Claude Code will likely ask you a few clarifying questions before diving in
  (e.g. which OCR package to use, whether you want Expo Router vs. plain
  navigation) — that's expected and fine to answer as you see fit.
- If you don't already have it, you'll need Node.js installed and the Expo Go app
  on your phone (or a simulator) to preview the app as it's built.
