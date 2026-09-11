import { useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { HistoryModal } from './components/HistoryModal';
import { CameraIcon, PaletteIcon } from './components/icons';
import { LastCalled } from './components/LastCalled';
import { LocationBar } from './components/LocationBar';
import { ScanModal } from './components/ScanModal';
import { ThemeModal } from './components/ThemeModal';
import { useBoardState } from './hooks/useBoardState';
import { useTheme } from './hooks/useTheme';
import { getDistinctLocationValues } from './lib/history';

function App() {
  const { state, latest, toggle, undo, reset, setLocation, clearLastRound, clearAllRounds } = useBoardState();
  const { themeId, setThemeId } = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const calledSet = new Set(state.called);

  return (
    <div className="wrap">
      <Header calledCount={state.called.length} />
      <LocationBar
        value={state.currentLocation}
        suggestions={getDistinctLocationValues(state.rounds)}
        onChange={setLocation}
      />
      <LastCalled latest={latest} />
      <Board calledSet={calledSet} latest={latest} onToggle={toggle} />
      <Controls onUndo={undo} onReset={reset} onOpenHistory={() => setHistoryOpen(true)} />
      <div className="controls" style={{ marginTop: '10px' }}>
        <button className="action gold" id="scanCardBtn" style={{ flex: 1 }} onClick={() => setScanOpen(true)}>
          <CameraIcon size={15} />
          <span style={{ marginLeft: '5px' }}>Scan my card vs. history</span>
        </button>
      </div>
      <div className="controls" style={{ marginTop: '10px' }}>
        <button className="action" id="themeBtn" style={{ flex: 1 }} onClick={() => setThemeOpen(true)}>
          <PaletteIcon />
          <span style={{ marginLeft: '5px' }}>Color theme</span>
        </button>
      </div>
      <footer>Your progress is saved automatically on this device</footer>

      <HistoryModal
        isOpen={historyOpen}
        rounds={state.rounds}
        onClose={() => setHistoryOpen(false)}
        onClearLastRound={clearLastRound}
        onClearAllRounds={clearAllRounds}
      />
      <ThemeModal isOpen={themeOpen} themeId={themeId} onSelect={setThemeId} onClose={() => setThemeOpen(false)} />
      <ScanModal isOpen={scanOpen} rounds={state.rounds} onClose={() => setScanOpen(false)} />
    </div>
  );
}

export default App;
