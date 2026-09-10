import { useState } from 'react';
import { LETTERS, letterFor } from '../lib/bingo';
import { ALL_LOCATIONS, computeTally, getDistinctLocations, getRoundsForFilter } from '../lib/history';
import type { Round } from '../state/boardState';

interface HistoryModalProps {
  isOpen: boolean;
  rounds: Round[];
  onClose: () => void;
  onClearLastRound: (filterValue: string) => void;
  onClearAllRounds: (filterValue: string) => void;
}

type Tab = 'numbers' | 'frequency';
type PendingClear = 'last' | 'all' | null;

export function HistoryModal({ isOpen, rounds, onClose, onClearLastRound, onClearAllRounds }: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('numbers');
  const [filterValue, setFilterValue] = useState<string>(ALL_LOCATIONS);
  const [pendingClear, setPendingClear] = useState<PendingClear>(null);

  const locations = getDistinctLocations(rounds);
  const filteredRounds = getRoundsForFilter(rounds, filterValue);
  const tally = computeTally(rounds, filterValue);
  const roundCount = filteredRounds.length;
  const totalRoundCount = rounds.length;
  const scoped = filterValue !== ALL_LOCATIONS;

  let roundsSummary: string;
  if (totalRoundCount === 0) {
    roundsSummary = 'No rounds logged yet — use Reset board after a game to log it';
  } else if (!scoped) {
    roundsSummary = `${roundCount} ${roundCount === 1 ? 'round' : 'rounds'} logged across all locations`;
  } else {
    roundsSummary = `${roundCount} ${roundCount === 1 ? 'round' : 'rounds'} logged at ${filterValue}`;
  }

  const ranked = Object.entries(tally)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxCount = Math.max(1, ...Object.values(tally));

  function showClearConfirm(mode: 'last' | 'all') {
    setPendingClear(mode);
  }

  function clearConfirmText(): string {
    if (pendingClear === 'last') {
      return scoped
        ? `Are you sure you would like to clear the last round logged at ${filterValue}? This cannot be undone, and you will lose that round’s history.`
        : 'Are you sure you would like to clear the last round? This cannot be undone, and you will lose that round’s history.';
    }
    return scoped
      ? `Are you sure you would like to clear all history for ${filterValue}? This cannot be undone, and you will lose all history for this location.`
      : 'Are you sure you would like to clear? This cannot be undone, and you will lose all history.';
  }

  function doClear() {
    if (pendingClear === 'last') onClearLastRound(filterValue);
    else if (pendingClear === 'all') onClearAllRounds(filterValue);
    setPendingClear(null);
  }

  function handleClose() {
    setPendingClear(null);
    onClose();
  }

  return (
    <div className={'modal-overlay' + (isOpen ? ' show' : '')} id="historyOverlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>Round history</h2>
          <button className="modal-close" id="closeHistory" onClick={handleClose}>
            &times;
          </button>
        </div>
        <p className="modal-sub" id="roundsSummary">
          {roundsSummary}
        </p>

        <div className="location-filter">
          <label htmlFor="locationFilter">Location</label>
          <select
            id="locationFilter"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          >
            <option value={ALL_LOCATIONS}>All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="tab-bar">
          <button
            className={'tab-btn' + (activeTab === 'numbers' ? ' active' : '')}
            id="tabNumberHistory"
            data-tab="numbers"
            onClick={() => setActiveTab('numbers')}
          >
            Number history
          </button>
          <button
            className={'tab-btn' + (activeTab === 'frequency' ? ' active' : '')}
            id="tabFrequencyStats"
            data-tab="frequency"
            onClick={() => setActiveTab('frequency')}
          >
            Frequency stats
          </button>
        </div>

        <div id="tabPanelNumbers" className="tab-panel" style={{ display: activeTab === 'numbers' ? '' : 'none' }}>
            <h3 className="modal-section-title">Times called</h3>
            <div className="tally-col-headers">
              {LETTERS.map((letter) => (
                <span key={letter}>{letter}</span>
              ))}
            </div>
            <div className="tally-grid" id="tallyGrid">
              {[1, 16, 31, 46, 61].map((start) => {
                const cells = [];
                for (let n = start; n < start + 15; n++) cells.push(n);
                return cells.map((n) => (
                  <div key={n} className={'tally-cell' + (tally[n] === 0 ? ' zero' : '')}>
                    <div className="num">{n}</div>
                    <div className="cnt">{tally[n]}</div>
                  </div>
                ));
              })}
            </div>
        </div>

        <div id="tabPanelFrequency" className="tab-panel" style={{ display: activeTab === 'frequency' ? '' : 'none' }}>
          <h3 className="modal-section-title">Most frequently called</h3>
          <div id="topNumbers" className="top-list">
            {ranked.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Log a few rounds to see which numbers come up most.
              </p>
            ) : (
              ranked.map(([numStr, cnt], i) => {
                const n = Number(numStr);
                const pct = Math.max(8, Math.round((cnt / maxCount) * 100));
                return (
                  <div className="top-row" key={n}>
                    <span className="rank">{i + 1}.</span>
                    <div className="bar-wrap">
                      <div className="bar" style={{ width: `${pct}%` }}></div>
                      <span className="bar-label">
                        {letterFor(n)}-{n}
                      </span>
                    </div>
                    <span className="count">{cnt}&times;</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="history-controls">
          <button
            className="action danger"
            id="clearLastRoundBtn"
            disabled={roundCount === 0}
            style={{ opacity: roundCount === 0 ? 0.4 : 1, cursor: roundCount === 0 ? 'not-allowed' : 'pointer' }}
            onClick={() => showClearConfirm('last')}
          >
            {scoped ? 'Clear last round at this location' : 'Clear last round'}
          </button>
          <button
            className="action danger"
            id="clearAllHistoryBtn"
            disabled={roundCount === 0}
            style={{ opacity: roundCount === 0 ? 0.4 : 1, cursor: roundCount === 0 ? 'not-allowed' : 'pointer' }}
            onClick={() => showClearConfirm('all')}
          >
            {scoped ? 'Clear history for this location' : 'Clear all history'}
          </button>
        </div>

        <div className={'confirm-bar' + (pendingClear ? ' show' : '')} id="clearConfirmBar">
          <span id="clearConfirmText">{clearConfirmText()}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="no" id="cancelClear" onClick={() => setPendingClear(null)}>
              Cancel
            </button>
            <button className="yes" id="doClear" onClick={doClear}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
