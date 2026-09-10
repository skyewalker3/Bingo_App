// Phase 0 parity baseline capture.
// Drives the legacy single-file app (../../legacy/index.html) through every feature
// documented in CLAUDE.md, saving screenshots + state snapshots under ./out.
// This is the diff target for the Vite/React/TS rewrite (Phase 7).

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const outDir = path.join(__dirname, 'out');
const snapshot = { steps: [] };

await import('node:fs/promises').then(fs => fs.mkdir(outDir, { recursive: true }));

// --- tiny static server for repoRoot, so we're on http:// not file:// ---
function contentType(p) {
  if (p.endsWith('.html')) return 'text/html';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'text/javascript';
  if (p.endsWith('.css')) return 'text/css';
  return 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url === '/' ? '/legacy/index.html' : req.url;
    const filePath = path.join(repoRoot, decodeURIComponent(urlPath.split('?')[0]));
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
console.log('Serving', repoRoot, 'at', baseUrl);

const browser = await chromium.launch();

async function record(page, name, note) {
  const file = `${String(snapshot.steps.length).padStart(2, '0')}-${name}.png`;
  // .cell has a 150ms background/border/transform transition; without this wait,
  // screenshots/computed-style reads can catch mid-transition colors instead of
  // the settled, actually-documented look (verified this was happening on the
  // first capture pass).
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, file) });
  const state = await page.evaluate(() => {
    const raw = localStorage.getItem('bingoCallerBoard');
    const theme = localStorage.getItem('bingoCallerTheme');
    return {
      board: raw ? JSON.parse(raw) : null,
      theme,
      countVal: document.getElementById('countVal')?.textContent,
      lastBall: document.getElementById('lastBall')?.textContent,
      lastLabel: document.getElementById('lastLabel')?.textContent,
      confirmBarShown: document.getElementById('confirmBar')?.classList.contains('show'),
      clearConfirmText: document.getElementById('clearConfirmText')?.textContent,
      roundsSummary: document.getElementById('roundsSummary')?.textContent,
      clearLastRoundLabel: document.getElementById('clearLastRoundBtn')?.textContent,
      clearAllHistoryLabel: document.getElementById('clearAllHistoryBtn')?.textContent,
      locationFilterOptions: Array.from(document.querySelectorAll('#locationFilter option')).map(o => o.textContent),
      topNumbersText: document.getElementById('topNumbers')?.innerText,
      scanResultSummary: document.getElementById('scanResultSummary')?.innerText,
      scanStatus: document.getElementById('scanStatus')?.textContent,
    };
  });
  snapshot.steps.push({ name, note, file, state });
  console.log('captured:', name, '-', note);
}

async function clickCell(page, n) {
  await page.click(`.cell[data-num="${n}"]`);
}

const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
await page.goto(baseUrl + '/legacy/index.html');
await page.evaluate(() => localStorage.clear());
await page.reload();

await record(page, 'initial-empty-state', 'fresh load, nothing called');

// --- marking / unmarking ---
await clickCell(page, 7);
await clickCell(page, 20);
await clickCell(page, 33);
await clickCell(page, 50);
await clickCell(page, 70);
await record(page, 'five-called', 'called B7, I20, N33, G50, O70 in order; O70 should be "latest"');

await clickCell(page, 20); // unmark I20
await record(page, 'unmark-i20', 'tapped I20 again to unmark it; count should drop, history should drop 20');

// --- undo ---
await page.click('#undoBtn');
await record(page, 'undo-last', 'Undo last pressed; should remove O70 (the last history entry), new latest should be N33');

// --- location tagging ---
await page.fill('#locationInput', 'Church Hall Tuesday');
await record(page, 'location-set', 'typed a location; should be live-persisted to state.currentLocation');

// --- reset flow: cancel first ---
await page.click('#resetBtn');
await record(page, 'reset-confirm-shown', 'Reset board clicked; in-page confirm bar should show, no native confirm() dialog');
await page.click('#cancelReset');
await record(page, 'reset-cancelled', 'Cancel clicked; confirm bar hidden, board state unchanged');

// --- reset flow: confirm, archives a round ---
await page.click('#resetBtn');
await page.click('#doReset');
await record(page, 'reset-confirmed', 'Reset confirmed; called/history cleared, one round archived with location "Church Hall Tuesday"');

// --- second round at a different location, for filter/tally coverage ---
await page.fill('#locationInput', 'VFW Friday');
for (const n of [7, 8, 9, 21, 22, 36, 51, 66]) await clickCell(page, n);
await record(page, 'second-round-called', 'second round called at VFW Friday, before reset');
await page.click('#resetBtn');
await page.click('#doReset');
await record(page, 'second-round-archived', 'second round archived at VFW Friday; two rounds now exist across two locations');

// --- third round, no location set, to cover "Unspecified location" ---
await page.fill('#locationInput', '');
for (const n of [7, 40, 60]) await clickCell(page, n);
await page.click('#resetBtn');
await page.click('#doReset');
await record(page, 'third-round-no-location', 'third round archived with no location typed -> should bucket as "Unspecified location"');

// --- history modal ---
await page.click('#historyBtn');
await record(page, 'history-modal-open-all', 'History modal open, default "All locations" filter, Number history tab');

await page.click('#tabFrequencyStats');
await record(page, 'history-frequency-tab', 'switched to Frequency stats tab; top-10 bars should reflect combined tally (7 called 3x across rounds)');

await page.selectOption('#locationFilter', { label: 'VFW Friday' });
await record(page, 'history-filtered-vfw', 'location filter set to VFW Friday; summary + tally should be scoped to that round only');

await page.click('#clearLastRoundBtn');
await record(page, 'clear-last-scoped-confirm', 'Clear last round (scoped) clicked; confirm text should mention VFW Friday specifically');
await page.click('#cancelClear');

await page.selectOption('#locationFilter', { value: '__all__' });
await page.click('#tabNumberHistory');
await record(page, 'history-all-locations-numbers-tab', 'back to All locations, Number history tab, before any clears');

await page.click('#closeHistory');

// --- theme switching: capture computed color for every theme ---
await page.click('#themeBtn');
const themeIds = await page.evaluate(() => Array.from(document.querySelectorAll('.theme-row')).map(r => r.dataset.themeId));
for (const id of themeIds) {
  await page.click(`.theme-row[data-theme-id="${id}"]`);
  await page.waitForTimeout(250); // let the .cell background-color transition (150ms) finish before reading computed style
  const bColor = await page.evaluate(() => getComputedStyle(document.querySelector('.cell.col-b')).backgroundColor);
  await record(page, `theme-${id}`, `theme "${id}" selected; .cell.col-b computed background-color = ${bColor}`);
}
await page.click('#closeTheme');

// --- reload persistence check ---
await page.reload();
await record(page, 'after-reload', 'page reloaded; called/history should be empty (post-reset), rounds/theme should persist');

// --- scan modal: offline/no-Tesseract fallback path + comparison legend ---
await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
await page.click('#scanCardBtn');
await record(page, 'scan-step1-upload', 'Scan modal open, upload step');

// simulate a photo pick without network (Tesseract blocked) -> manual fallback grid
const fileInput = await page.$('#scanFileInput');
await fileInput.setInputFiles({ name: 'card.png', mimeType: 'image/png', buffer: Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'
) });
await page.waitForSelector('#scanStep2:not([style*="display: none"])', { timeout: 15000 }).catch(() => {});
await record(page, 'scan-step2-manual-fallback', 'Tesseract CDN blocked -> should show manual-entry grid + offline fallback status text');

// fill a plausible card (skip index 12, the FREE space) and compare
await page.evaluate(() => {
  const vals = [2,7,12,5,10, 19,24,29,22,17, 33,44,41,38,35, 48,53,58,51,46, 62,67,72,65,70];
  document.querySelectorAll('#scanGrid input').forEach((inp, i) => {
    const idx = Number(inp.dataset.idx);
    inp.value = vals[idx];
  });
});
await page.click('#compareBtn');
await record(page, 'scan-step3-results', 'compared card vs history; legend + hot/warm/cold labels should read exactly as documented');

// --- scan modal: true "library never loaded" path (block CDN before first navigation) ---
const offlinePage = await browser.newPage({ viewport: { width: 420, height: 900 } });
await offlinePage.route('https://cdn.jsdelivr.net/**', route => route.abort());
await offlinePage.goto(baseUrl + '/legacy/index.html');
await offlinePage.evaluate(() => localStorage.clear());
await offlinePage.reload();
await offlinePage.click('#scanCardBtn');
const offlineFileInput = await offlinePage.$('#scanFileInput');
await offlineFileInput.setInputFiles({ name: 'card.png', mimeType: 'image/png', buffer: Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'
) });
await offlinePage.waitForTimeout(500);
await record(offlinePage, 'scan-tesseract-never-loaded', 'CDN blocked from first navigation -> typeof Tesseract === "undefined" branch, different copy than the recognize()-throws case');
await offlinePage.close();

await browser.close();
server.close();

const fs = await import('node:fs/promises');
await fs.writeFile(path.join(outDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
console.log('\nWrote', snapshot.steps.length, 'steps to', outDir);
