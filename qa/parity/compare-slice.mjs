// Formal Phase 0 parity check for the calling-board vertical slice (mark/
// unmark, undo, reset+archive). Drives the built React app through the
// subset of baseline.mjs steps this slice covers, then diffs the captured
// state against out/snapshot.json (recorded from legacy/index.html).
//
// Location tagging isn't in this slice yet, so any baseline field that
// depends on a location being set is intentionally excluded from
// comparison and called out as a known, expected gap rather than a failure.

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
      countVal: document.getElementById('countVal')?.textContent,
      lastBall: document.getElementById('lastBall')?.textContent,
      lastLabel: document.getElementById('lastLabel')?.textContent,
      confirmBarShown: document.getElementById('confirmBar')?.classList.contains('show'),
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

async function step(name, fields) {
  await page.waitForTimeout(250);
  const actual = await captureState(page);
  const expected = byName[name];
  for (const field of fields) {
    compareField(name, field, actual[field], expected[field]);
  }
  return actual;
}

await step('initial-empty-state', ['countVal', 'lastBall', 'lastLabel', 'confirmBarShown']);
compareField('initial-empty-state', 'board.called', (await captureState(page)).board.called, byName['initial-empty-state'].board?.called ?? []);

for (const n of [7, 20, 33, 50, 70]) await clickCell(page, n);
await step('five-called', ['countVal', 'lastBall', 'lastLabel']);
{
  const actual = await captureState(page);
  compareField('five-called', 'board.called', actual.board.called, byName['five-called'].board.called);
  compareField('five-called', 'board.history', actual.board.history, byName['five-called'].board.history);
}

await clickCell(page, 20);
await step('unmark-i20', ['countVal', 'lastBall', 'lastLabel']);
{
  const actual = await captureState(page);
  compareField('unmark-i20', 'board.called', actual.board.called, byName['unmark-i20'].board.called);
}

await page.click('#undoBtn');
await step('undo-last', ['countVal', 'lastBall', 'lastLabel']);
{
  const actual = await captureState(page);
  compareField('undo-last', 'board.called', actual.board.called, byName['undo-last'].board.called);
  compareField('undo-last', 'board.history', actual.board.history, byName['undo-last'].board.history);
}

// NOTE: baseline's 'location-set' step has no equivalent here (no location UI
// in this slice yet) -- intentionally skipped, not a failure.

await page.click('#resetBtn');
await step('reset-confirm-shown', ['confirmBarShown']);

await page.click('#cancelReset');
await step('reset-cancelled', ['confirmBarShown', 'countVal']);

await page.click('#resetBtn');
await page.click('#doReset');
await step('reset-confirmed', ['countVal', 'lastBall', 'lastLabel']);
{
  const actual = await captureState(page);
  compareField('reset-confirmed', 'board.called', actual.board.called, []);
  compareField('reset-confirmed', 'board.history', actual.board.history, []);
  // location comes from baseline's typed "Church Hall Tuesday"; this slice has
  // no location UI, so the archived round's location is always "" here.
  compareField('reset-confirmed', 'board.rounds[0].numbers', actual.board.rounds[0]?.numbers, byName['reset-confirmed'].board.rounds[0].numbers);
  compareField('reset-confirmed', 'board.rounds[0].location (expected "" - no location UI in this slice)', actual.board.rounds[0]?.location, '');
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} field checks, ${failed.length} failed.\n`);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.step} :: ${r.field}` + (r.pass ? '' : `  actual=${JSON.stringify(r.actual)} expected=${JSON.stringify(r.expected)}`));
}

await writeFile(path.join(__dirname, 'slice-parity-report.json'), JSON.stringify({ results, failedCount: failed.length }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
