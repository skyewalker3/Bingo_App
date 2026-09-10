import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { Header } from './components/Header';
import { LastCalled } from './components/LastCalled';
import { useBoardState } from './hooks/useBoardState';

function App() {
  const { state, latest, toggle, undo, reset } = useBoardState();
  const calledSet = new Set(state.called);

  return (
    <div className="wrap">
      <Header calledCount={state.called.length} />
      <LastCalled latest={latest} />
      <Board calledSet={calledSet} latest={latest} onToggle={toggle} />
      <Controls onUndo={undo} onReset={reset} />
      <footer>Your progress is saved automatically on this device</footer>
    </div>
  );
}

export default App;
