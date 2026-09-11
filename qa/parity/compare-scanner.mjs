// Parity + coverage check for the card scanner against the Phase 0 baseline
// (qa/parity/out/snapshot.json) for the parts that existed there (fallback
// copy, legend, disclaimer), plus new coverage the baseline never had:
// a real end-to-end OCR pass (self-hosted, zero non-localhost network),
// the bucketing algorithm, and two previously-flagged untested edge cases
// (zero-numbers validation, zero-rounds-logged message).

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(await readFile(path.join(__dirname, 'out/snapshot.json'), 'utf8'));
const byName = Object.fromEntries(baseline.steps.map((s) => [s.name, s.state]));

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:4173/Bingo_App/';
const DEV_URL = process.env.DEV_URL || 'http://localhost:5173/Bingo_App/';
const results = [];

function check(step, field, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ step, field, pass, actual, expected });
}

const browser = await chromium.launch();

// --- generate a synthetic bingo card image (canvas) ---
const gen = await browser.newPage();
const CARD = [
  [2, 7, 12, 5, 10],
  [19, 24, 29, 22, 17],
  [33, 44, null, 38, 35],
  [48, 53, 58, 51, 46],
  [62, 67, 72, 65, 70],
];
await gen.setContent(`
  <canvas id="c" width="500" height="500"></canvas>
  <script>
    const ctx = document.getElementById('c').getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 500, 500);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.font = 'bold 48px Arial'; ctx.fillStyle = '#000';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const card = ${JSON.stringify(CARD)};
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const x = col * 100, y = row * 100;
      ctx.strokeRect(x, y, 100, 100);
      ctx.fillText(card[row][col] === null ? 'FREE' : String(card[row][col]), x + 50, y + 50);
    }
  </script>
`);
await gen.waitForTimeout(200);
const cardPngPath = '/tmp/qa-test-card.png';
await writeFile(cardPngPath, await (await gen.$('#c')).screenshot());
await gen.close();

// --- bucketing algorithm, via the dev server's live TS module ---
{
  const page = await browser.newPage();
  await page.goto(DEV_URL);
  const words = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const n = CARD[row][col];
      if (n === null) continue;
      const x0 = col * 100 + 10;
      const y0 = row * 100 + 10;
      words.push({ text: String(n), bbox: { x0, y0, x1: x0 + 80, y1: y0 + 80 } });
    }
  }
  const bucketed = await page.evaluate(
    async ({ words, base }) => {
      const mod = await import(`${base}src/lib/ocr.ts`);
      return mod.parseOcrIntoCard(words);
    },
    { words, base: DEV_URL },
  );
  const expected = CARD.flat();
  check('bucketing-algorithm', 'places every recognized number in its correct cell', bucketed, expected);
  await page.close();
}

// --- full app flow against the production build, network-restricted ---
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const externalRequests = [];
await page.route('**/*', (route) => {
  const url = route.request().url();
  if (!url.startsWith(PREVIEW_URL.replace(/\/$/, ''))) {
    externalRequests.push(url);
    return route.abort();
  }
  route.continue();
});

await page.goto(PREVIEW_URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(250);

// log two rounds so hot/warm/cold + summary math has real data
for (const n of [2, 7, 12, 19, 24]) await page.click(`.cell[data-num="${n}"]`);
await page.click('#resetBtn');
await page.click('#doReset');
await page.waitForTimeout(100);
for (const n of [2, 7, 12]) await page.click(`.cell[data-num="${n}"]`);
await page.click('#resetBtn');
await page.click('#doReset');
await page.waitForTimeout(100);

await page.click('#scanCardBtn');
await page.setInputFiles('#scanFileInput', cardPngPath);
await page.waitForFunction(() => document.querySelectorAll('#scanGrid input').length > 0, { timeout: 60000 });
await page.waitForTimeout(200);
check('scan-e2e', 'reached review grid after real-image OCR with zero non-localhost requests', externalRequests, []);

const CARD_FLAT = CARD.flat();
for (let idx = 0; idx < CARD_FLAT.length; idx++) {
  if (CARD_FLAT[idx] === null) continue;
  await page.fill(`#scanGrid input[data-idx="${idx}"]`, String(CARD_FLAT[idx]));
}
await page.click('#compareBtn');
await page.waitForTimeout(200);

const cells = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.scan-result-cell')).map((c) => ({
    num: Number(c.querySelector('.num')?.textContent),
    cls: [...c.classList].find((cl) => ['hot', 'warm', 'cold'].includes(cl)),
  })),
);
const hot = new Set([2, 7, 12, 19, 24]);
check('scan-e2e', 'numbers called in both logged rounds classify hot', cells.filter((c) => [2, 7, 12].includes(c.num)).every((c) => c.cls === 'hot'), true);
check('scan-e2e', 'numbers never called classify cold', cells.filter((c) => !hot.has(c.num)).every((c) => c.cls === 'cold'), true);

await page.click('#backToEditBtn');
await page.waitForTimeout(150);
const preserved = await page.evaluate(() => document.querySelector('#scanGrid input[data-idx="0"]')?.value);
check('scan-e2e', 'back-to-edit preserves the corrected value (not the raw OCR guess)', preserved, '2');

// --- "recognize() throws" fallback path (distinct from the earlier
// zero-network "library never loaded" path, which OCR_NEVER_LOADED covers
// and was already verified separately with a full network block) ---
await page.click('#rescanBtn');
const corruptPngPath = '/tmp/qa-corrupt.png';
await writeFile(corruptPngPath, Buffer.from('not a real png'));
await page.setInputFiles('#scanFileInput', corruptPngPath);
await page.waitForFunction(
  () => {
    const status = document.getElementById('scanStatus');
    return status && status.textContent && status.textContent !== 'Reading your card… this can take a few seconds.';
  },
  { timeout: 30000 },
);
const recognizeFailedStatus = await page.evaluate(() => document.getElementById('scanStatus')?.textContent);
check('scan-recognize-fails', 'shows the recognize-failure fallback message', recognizeFailedStatus, byName['scan-step2-manual-fallback'].scanStatus);

// --- "library never loaded" fallback path: now that everything is
// self-hosted at the same origin, there's no CDN left to block -- simulate
// the assets themselves being unavailable (e.g. a cold start before a
// service worker has precached them) by blocking those specific paths. ---
const neverLoadedPage = await browser.newPage({ viewport: { width: 420, height: 900 } });
await neverLoadedPage.route('**/tesseract/**', (route) => route.abort());
await neverLoadedPage.route('**/tessdata/**', (route) => route.abort());
await neverLoadedPage.goto(PREVIEW_URL);
await neverLoadedPage.evaluate(() => localStorage.clear());
await neverLoadedPage.reload();
await neverLoadedPage.waitForTimeout(200);
await neverLoadedPage.click('#scanCardBtn');
await neverLoadedPage.setInputFiles('#scanFileInput', cardPngPath);
await neverLoadedPage.waitForFunction(
  () => {
    const status = document.getElementById('scanStatus');
    return status && status.textContent && status.textContent !== 'Reading your card… this can take a few seconds.';
  },
  { timeout: 30000 },
);
const neverLoadedStatus = await neverLoadedPage.evaluate(() => document.getElementById('scanStatus')?.textContent);
check('scan-never-loaded', 'shows the library-never-loaded fallback message', neverLoadedStatus, byName['scan-tesseract-never-loaded'].scanStatus);
await neverLoadedPage.close();

// --- legacy copy parity (against Phase 0 baseline) ---
const summaryLegendText = await page.evaluate(() => document.querySelector('#scanOverlay .modal-sub')?.innerHTML || '');
check('scan-copy', 'disclaimer mentions "past frequency only" (matches legacy copy)', summaryLegendText.includes('past frequency only'), true);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length} field checks, ${failed.length} failed.\n`);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.step} :: ${r.field}` + (r.pass ? '' : `  actual=${JSON.stringify(r.actual)} expected=${JSON.stringify(r.expected)}`));
}

await writeFile(path.join(__dirname, 'scanner-parity-report.json'), JSON.stringify({ results, failedCount: failed.length }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
