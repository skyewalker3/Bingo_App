import { createWorker, OEM } from 'tesseract.js';

// Self-hosted (not CDN) worker/core/language-data, so scanning works
// offline once these have been fetched/cached once -- see public/tesseract
// and public/tessdata. corePath is a *directory* so tesseract.js can still
// pick the SIMD-accelerated core when the device supports it.
const BASE = import.meta.env.BASE_URL;
const WORKER_PATH = `${BASE}tesseract/worker.min.js`;
const CORE_PATH = `${BASE}tesseract/`;
const LANG_PATH = `${BASE}tessdata/`;

export interface OcrBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: OcrBbox;
}

// Thrown when the worker/core/language assets themselves fail to load
// (e.g. genuinely offline with nothing cached yet) -- distinct from a
// failure during recognition itself, so the UI can show the same two
// distinct fallback messages the legacy app had.
export class OcrUnavailableError extends Error {}

// Minimal local shape for the slice of the recognize() result we actually
// read, rather than depending on tesseract.js's `export =` namespace typing.
interface RecognizePage {
  blocks: { paragraphs: { lines: { words: OcrWord[] }[] }[] }[] | null;
}

function flattenWords(data: RecognizePage): OcrWord[] {
  const words: OcrWord[] = [];
  (data.blocks || []).forEach((block) => {
    block.paragraphs.forEach((p) => {
      p.lines.forEach((l) => {
        l.words.forEach((w) => words.push({ text: w.text, bbox: w.bbox }));
      });
    });
  });
  return words;
}

export async function recognizeCardImage(file: File): Promise<OcrWord[]> {
  let worker;
  try {
    worker = await createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      gzip: true,
    });
  } catch (e) {
    throw new OcrUnavailableError(String(e));
  }

  try {
    await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
    // recognize()'s output param controls which data actually gets computed;
    // it defaults to { text: true } only -- without blocks: true, .blocks
    // comes back null and there are no bounding boxes to bucket into a grid.
    const { data } = await worker.recognize(file, {}, { blocks: true });
    return flattenWords(data);
  } finally {
    await worker.terminate();
  }
}

export function emptyCardGuess(): (number | null)[] {
  // 5 columns x 5 rows, row 2 col 2 (index 12) is FREE
  return Array.from({ length: 25 }, () => null);
}

// Pull recognized words with bounding boxes, keep ones that are plausible
// bingo numbers (1-75), then bucket into a 5x5 grid by position. Ported
// verbatim from the legacy app's parseOcrIntoCard, adapted to take an
// already-flattened word list instead of tesseract.js@5's ocrData.words.
export function parseOcrIntoCard(words: OcrWord[]): (number | null)[] {
  const parsed = words
    .map((w) => ({ text: w.text.replace(/[^0-9]/g, ''), bbox: w.bbox }))
    .filter((w) => w.text.length > 0)
    .map((w) => ({ num: parseInt(w.text, 10), bbox: w.bbox }))
    .filter((w) => Number.isInteger(w.num) && w.num >= 1 && w.num <= 75);

  if (parsed.length === 0) return emptyCardGuess();

  const xs = parsed.map((w) => (w.bbox.x0 + w.bbox.x1) / 2);
  const ys = parsed.map((w) => (w.bbox.y0 + w.bbox.y1) / 2);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const colWidth = (maxX - minX) / 4 || 1;
  const rowHeight = (maxY - minY) / 4 || 1;

  const card = emptyCardGuess();
  parsed.forEach((w) => {
    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    const cy = (w.bbox.y0 + w.bbox.y1) / 2;
    let col = Math.round((cx - minX) / colWidth);
    let row = Math.round((cy - minY) / rowHeight);
    col = Math.min(4, Math.max(0, col));
    row = Math.min(4, Math.max(0, row));
    const idx = row * 5 + col;
    if (card[idx] === null) card[idx] = w.num;
  });

  return card;
}
