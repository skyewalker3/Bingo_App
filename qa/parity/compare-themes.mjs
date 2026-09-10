// Parity check for color themes against the Phase 0 baseline
// (qa/parity/out/snapshot.json): for each of the 11 themes, select it and
// compare the computed .cell.col-b background-color against the recorded
// legacy value, plus verify persistence to bingoCallerTheme.

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(await readFile(path.join(__dirname, 'out/snapshot.json'), 'utf8'));
const noteByName = Object.fromEntries(baseline.steps.map((s) => [s.name, s.note]));

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:4173/Bingo_App/';
const results = [];

function compareField(stepName, field, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ step: stepName, field, pass, actual, expected });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto(PREVIEW_URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(250);

const EXPECTED_THEME_IDS = ['classic', 'rainbow', 'murica', 'grayscale', 'blues', 'greenie', 'valentines', 'blackout', 'xmas', 'sunset', 'grape'];

await page.click('#themeBtn');
await page.waitForTimeout(150);
const themeIds = await page.evaluate(() => Array.from(document.querySelectorAll('.theme-row')).map((r) => r.dataset.themeId));
compareField('theme-list', 'theme ids present (order + count)', themeIds, EXPECTED_THEME_IDS);

for (const id of themeIds) {
  await page.click(`.theme-row[data-theme-id="${id}"]`);
  await page.waitForTimeout(250); // let the .cell background-color transition finish
  const bColor = await page.evaluate(() => getComputedStyle(document.querySelector('.cell.col-b')).backgroundColor);
  const stepName = `theme-${id}`;
  // baseline's note text embeds the expected computed color for this theme
  const expectedNote = noteByName[stepName] ?? '';
  const expectedColor = expectedNote.match(/= (rgb\(.*\))$/)?.[1];
  compareField(stepName, '.cell.col-b computed background-color', bColor, expectedColor);

  const persisted = await page.evaluate(() => localStorage.getItem('bingoCallerTheme'));
  compareField(stepName, 'persisted bingoCallerTheme', persisted, id);

  const activeRowCount = await page.evaluate((themeId) => document.querySelectorAll(`.theme-row.active[data-theme-id="${themeId}"]`).length, id);
  compareField(stepName, 'exactly one active theme-row, matching selection', activeRowCount, 1);
}

// reload persistence
await page.click('#closeTheme');
const lastTheme = themeIds[themeIds.length - 1];
await page.reload();
await page.waitForTimeout(250);
{
  const bColor = await page.evaluate(() => getComputedStyle(document.querySelector('.cell.col-b')).backgroundColor);
  const expectedNote = noteByName[`theme-${lastTheme}`] ?? '';
  const expectedColor = expectedNote.match(/= (rgb\(.*\))$/)?.[1];
  compareField('after-reload-theme-persists', '.cell.col-b computed background-color survives reload', bColor, expectedColor);
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} field checks, ${failed.length} failed.\n`);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.step} :: ${r.field}` + (r.pass ? '' : `  actual=${JSON.stringify(r.actual)} expected=${JSON.stringify(r.expected)}`));
}

await writeFile(path.join(__dirname, 'themes-parity-report.json'), JSON.stringify({ results, failedCount: failed.length }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
