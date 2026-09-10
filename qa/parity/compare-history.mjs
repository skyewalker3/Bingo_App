// Parity check for location tagging + round history modal against the
// Phase 0 baseline (qa/parity/out/snapshot.json), replaying the same
// sequence of interactions baseline.mjs used to produce those steps.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(await readFile(path.join(__dirname, 'out/snapshot.json'), 'utf8'));
const byName = Object.fromEntries(baseline.steps.map((s) => [s.name, s.state]));

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:4173/Bingo_App/';
const results = [];

function compareField(stepName, field, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ step: stepName, field, pass, actual, expected });
}

async function captureState(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('bingoCallerBoard');
    return {
      board: raw ? JSON.parse(raw) : null,
      roundsSummary: document.getElementById('roundsSummary')?.textContent,
      clearLastRoundLabel: document.getElementById('clearLastRoundBtn')?.textContent,
      clearAllHistoryLabel: document.getElementById('clearAllHistoryBtn')?.textContent,
      clearConfirmText: document.getElementById('clearConfirmText')?.textContent,
      locationFilterOptions: Array.from(document.querySelectorAll('#locationFilter option')).map((o) => o.textContent),
      topNumbersText: document.getElementById('topNumbers')?.innerText,
    };
  });
}

async function clickCell(page, n) {
  await page.click(`.cell[data-num="${n}"]`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto(PREVIEW_URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(250);

// --- location tagging ---
await page.fill('#locationInput', 'Church Hall Tuesday');
await page.waitForTimeout(150);
{
  const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoCallerBoard')).currentLocation);
  compareField('location-set', 'board.currentLocation', actual, byName['location-set'].board.currentLocation);
}

// --- round 1 ---
for (const n of [7, 33, 50]) await clickCell(page, n);
await page.click('#resetBtn');
await page.click('#doReset');
await page.waitForTimeout(150);
{
  // endedAt is a real wall-clock timestamp from whenever this script runs,
  // not from the Phase 0 capture -- comparing it would always "fail" for a
  // reason that has nothing to do with app behavior. Compare everything
  // else, and only check endedAt is a plausible ISO timestamp.
  const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoCallerBoard')).rounds);
  const { endedAt: _expectedEndedAt, ...expectedRest } = byName['reset-confirmed'].board.rounds[0];
  const { endedAt: actualEndedAt, ...actualRest } = actual[0];
  compareField('reset-confirmed', 'rounds[0] (excl. endedAt)', actualRest, expectedRest);
  compareField('reset-confirmed', 'rounds[0].endedAt is a valid ISO timestamp', !Number.isNaN(Date.parse(actualEndedAt)), true);
}

// --- round 2 at a different location ---
await page.fill('#locationInput', 'VFW Friday');
for (const n of [7, 8, 9, 21, 22, 36, 51, 66]) await clickCell(page, n);
await page.click('#resetBtn');
await page.click('#doReset');
await page.waitForTimeout(150);
{
  const strip = (rounds) => rounds.map(({ endedAt: _e, ...rest }) => rest);
  const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoCallerBoard')).rounds);
  compareField('second-round-archived', 'rounds (excl. endedAt)', strip(actual), strip(byName['second-round-archived'].board.rounds));
}

// --- round 3, no location ---
await page.fill('#locationInput', '');
for (const n of [7, 40, 60]) await clickCell(page, n);
await page.click('#resetBtn');
await page.click('#doReset');
await page.waitForTimeout(150);
{
  const strip = (rounds) => rounds.map(({ endedAt: _e, ...rest }) => rest);
  const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoCallerBoard')).rounds);
  compareField('third-round-no-location', 'rounds (excl. endedAt)', strip(actual), strip(byName['third-round-no-location'].board.rounds));
}

// --- history modal ---
await page.click('#historyBtn');
await page.waitForTimeout(200);
{
  const actual = await captureState(page);
  compareField('history-modal-open-all', 'roundsSummary', actual.roundsSummary, byName['history-modal-open-all'].roundsSummary);
  compareField('history-modal-open-all', 'locationFilterOptions', actual.locationFilterOptions, byName['history-modal-open-all'].locationFilterOptions);
}

await page.click('#tabFrequencyStats');
await page.waitForTimeout(150);
{
  const actual = await captureState(page);
  compareField('history-frequency-tab', 'topNumbersText (normalized)', actual.topNumbersText.replace(/\s+/g, '').trim(), byName['history-frequency-tab'].topNumbersText.replace(/\s+/g, '').trim());
}

await page.selectOption('#locationFilter', { label: 'VFW Friday' });
await page.waitForTimeout(150);
{
  const actual = await captureState(page);
  compareField('history-filtered-vfw', 'roundsSummary', actual.roundsSummary, byName['history-filtered-vfw'].roundsSummary);
  compareField('history-filtered-vfw', 'clearLastRoundLabel', actual.clearLastRoundLabel, byName['history-filtered-vfw'].clearLastRoundLabel);
  compareField('history-filtered-vfw', 'clearAllHistoryLabel', actual.clearAllHistoryLabel, byName['history-filtered-vfw'].clearAllHistoryLabel);
  compareField('history-filtered-vfw', 'topNumbersText (normalized)', actual.topNumbersText.replace(/\s+/g, '').trim(), byName['history-filtered-vfw'].topNumbersText.replace(/\s+/g, '').trim());
}

await page.click('#clearLastRoundBtn');
await page.waitForTimeout(150);
{
  const actual = await captureState(page);
  compareField('clear-last-scoped-confirm', 'clearConfirmText', actual.clearConfirmText, byName['clear-last-scoped-confirm'].clearConfirmText);
}
await page.click('#cancelClear');

await page.selectOption('#locationFilter', { value: '__all__' });
await page.click('#tabNumberHistory');
await page.waitForTimeout(150);
{
  const actual = await captureState(page);
  compareField('history-all-locations-numbers-tab', 'roundsSummary', actual.roundsSummary, byName['history-all-locations-numbers-tab'].roundsSummary);
  compareField('history-all-locations-numbers-tab', 'topNumbersText (normalized)', actual.topNumbersText.replace(/\s+/g, '').trim(), byName['history-all-locations-numbers-tab'].topNumbersText.replace(/\s+/g, '').trim());
}

// --- extra: actually execute a clear (baseline never did this -- documented
// gap in the Phase 0 summary). Not compared to baseline, just sanity-checked
// against the app's own now-current state. ---
await page.selectOption('#locationFilter', { label: 'VFW Friday' });
await page.click('#clearLastRoundBtn');
await page.click('#doClear');
await page.waitForTimeout(150);
{
  const roundsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('bingoCallerBoard')).rounds);
  const stillHasVfw = roundsAfter.some((r) => r.location === 'VFW Friday');
  results.push({ step: 'clear-last-scoped-EXECUTED (new coverage)', field: 'VFW round actually removed', pass: !stillHasVfw, actual: stillHasVfw, expected: false });
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} field checks, ${failed.length} failed.\n`);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.step} :: ${r.field}` + (r.pass ? '' : `  actual=${JSON.stringify(r.actual)} expected=${JSON.stringify(r.expected)}`));
}

await writeFile(path.join(__dirname, 'history-parity-report.json'), JSON.stringify({ results, failedCount: failed.length }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
