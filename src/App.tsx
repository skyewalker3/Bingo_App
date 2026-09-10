import { useState } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { HistoryModal } from './components/HistoryModal';
import { LastCalled } from './components/LastCalled';
import { LocationBar } from './components/LocationBar';
import { useBoardState } from './hooks/useBoardState';
import { getDistinctLocationValues } from './lib/history';

function App() {
  const { state, latest, toggle, undo, reset, setLocation, clearLastRound, clearAllRounds } = useBoardState();
  const [historyOpen, setHistoryOpen] = useState(false);
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
      <footer>Your progress is saved automatically on this device</footer>

      <HistoryModal
        isOpen={historyOpen}
        rounds={state.rounds}
        onClose={() => setHistoryOpen(false)}
        onClearLastRound={clearLastRound}
        onClearAllRounds={clearAllRounds}
      />
    </div>
  );
}

export default App;
