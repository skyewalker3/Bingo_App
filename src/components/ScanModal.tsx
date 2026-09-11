import { useRef, useState } from 'react';
import { computeTally } from '../lib/history';
import { emptyCardGuess, OcrUnavailableError, parseOcrIntoCard, recognizeCardImage } from '../lib/ocr';
import { classifyCount, medianOf } from '../lib/scan';
import type { Round } from '../state/boardState';
import { CameraIcon } from './icons';

interface ScanModalProps {
  isOpen: boolean;
  rounds: Round[];
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const OCR_READ_FAILED = 'Couldn’t read that photo automatically. You can still enter your card’s numbers by hand below.';
const OCR_NEVER_LOADED = 'Couldn’t load the photo-reading library (needs an internet connection the first time). You can still enter your card’s numbers by hand below.';

function toCardValues(guess: (number | null)[]): string[] {
  return guess.map((n) => (n === null ? '' : String(n)));
}

export function ScanModal({ isOpen, rounds, onClose }: ScanModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState('');
  const [cardValues, setCardValues] = useState<string[]>(() => toCardValues(emptyCardGuess()));
  const [hasBlank, setHasBlank] = useState(false);
  const [cardNumbers, setCardNumbers] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetFlow() {
    setStep(1);
    setStatus('');
    setCardValues(toCardValues(emptyCardGuess()));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    resetFlow();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Reading your card… this can take a few seconds.');
    try {
      const words = await recognizeCardImage(file);
      const guess = parseOcrIntoCard(words);
      setStatus('');
      setCardValues(toCardValues(guess));
      setStep(2);
    } catch (err) {
      setStatus(err instanceof OcrUnavailableError ? OCR_NEVER_LOADED : OCR_READ_FAILED);
      setCardValues(toCardValues(emptyCardGuess()));
      setStep(2);
    }
  }

  function handleCompare() {
    const numbers: number[] = [];
    let blank = false;
    cardValues.forEach((v, i) => {
      if (i === 12) return; // FREE space
      const val = parseInt(v, 10);
      if (Number.isInteger(val) && val >= 1 && val <= 75) numbers.push(val);
      else blank = true;
    });

    if (numbers.length === 0) {
      setStatus('Enter at least a few numbers before comparing.');
      return;
    }

    setCardNumbers(numbers);
    setHasBlank(blank);
    setStep(3);
  }

  const tally = computeTally(rounds);
  const roundCount = rounds.length;
  const counts = Object.values(tally);
  const maxCount = Math.max(...counts, 0);
  const median = medianOf(counts);

  let hotCount = 0;
  let coldCount = 0;
  const resultRows = cardNumbers.map((n) => {
    const cnt = tally[n] || 0;
    const cls = classifyCount(cnt, median, maxCount);
    if (cls === 'hot') hotCount++;
    if (cls === 'cold') coldCount++;
    return { n, cnt, cls };
  });

  return (
    <div
      className={'modal-overlay' + (isOpen ? ' show' : '')}
      id="scanOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>Scan my card</h2>
          <button className="modal-close" id="closeScan" onClick={handleClose}>
            &times;
          </button>
        </div>
        <p className="modal-sub">
          This checks your card's numbers against how often each one has come up in your logged rounds so far. Bingo
          draws are random every game — this reflects <em>past frequency only</em>, not a prediction of what will be
          drawn next.
        </p>

        {step === 1 && (
          <div id="scanStep1">
            <label className="scan-upload" id="scanUploadLabel">
              <CameraIcon />
              <span>Take or choose a photo of your card</span>
              <input
                ref={fileInputRef}
                type="file"
                id="scanFileInput"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            <div id="scanStatus" className="scan-status">
              {status}
            </div>
          </div>
        )}

        {step === 2 && (
          <div id="scanStep2">
            <h3 className="modal-section-title">Confirm your card's numbers</h3>
            <p className="modal-sub" style={{ marginBottom: '10px' }}>
              We did our best to read the photo — check each square and fix anything that's wrong before comparing.
            </p>
            <div className="scan-grid" id="scanGrid">
              {cardValues.map((v, i) =>
                i === 12 ? (
                  <div key={i} className="scan-cell free-space">
                    <span>FREE</span>
                  </div>
                ) : (
                  <div key={i} className="scan-cell">
                    <input
                      type="number"
                      min={1}
                      max={75}
                      data-idx={i}
                      value={v}
                      onChange={(e) => {
                        const next = [...cardValues];
                        next[i] = e.target.value;
                        setCardValues(next);
                      }}
                    />
                  </div>
                ),
              )}
            </div>
            {status && <div id="scanStatus" className="scan-status">{status}</div>}
            <button className="action gold" id="compareBtn" style={{ marginTop: '14px', width: '100%' }} onClick={handleCompare}>
              Compare to history
            </button>
            <button
              className="action"
              id="rescanBtn"
              style={{ marginTop: '8px', width: '100%' }}
              onClick={resetFlow}
            >
              Try a different photo
            </button>
          </div>
        )}

        {step === 3 && (
          <div id="scanStep3">
            <h3 className="modal-section-title">How this card compares</h3>
            <p className="modal-sub" id="scanResultSummary">
              {roundCount === 0 ? (
                <>
                  You haven&rsquo;t logged any rounds yet, so there&rsquo;s no history to compare against. Play and
                  log a few games, then come back and scan again.
                </>
              ) : (
                <>
                  Based on <strong>{roundCount}</strong> logged round{roundCount === 1 ? '' : 's'}:{' '}
                  <strong>{hotCount}</strong> of this card's numbers have come up more than most, and{' '}
                  <strong>{coldCount}</strong> have come up less than most. Every game is a fresh random draw — this
                  is a look back at your history, not a forecast for tonight.
                  {hasBlank && ' (Some squares were left blank and skipped.)'}
                </>
              )}
            </p>
            {roundCount > 0 && (
              <div className="legend">
                <span>
                  <span className="dot" style={{ background: '#db4437' }}></span>Called more than most
                </span>
                <span>
                  <span className="dot" style={{ background: '#e68c28' }}></span>About average
                </span>
                <span>
                  <span className="dot" style={{ background: '#4285f4' }}></span>Called less than most
                </span>
              </div>
            )}
            <div className="scan-grid" id="scanResultGrid">
              {roundCount > 0 &&
                resultRows.map(({ n, cnt, cls }) => (
                  <div key={n} className={`scan-result-cell ${cls}`}>
                    <div className="num">{n}</div>
                    <div className="cnt">{cnt}&times; called</div>
                  </div>
                ))}
            </div>
            <button
              className="action"
              id="backToEditBtn"
              style={{ marginTop: '14px', width: '100%' }}
              onClick={() => setStep(2)}
            >
              Back to edit numbers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
