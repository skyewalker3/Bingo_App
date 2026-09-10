import { useEffect, useState } from 'react';
import { type BoardState, loadBoardState, saveBoardState } from '../state/boardState';

export function useBoardState() {
  const [state, setState] = useState<BoardState>(() => loadBoardState());

  useEffect(() => {
    saveBoardState(state);
  }, [state]);

  function toggle(n: number) {
    setState((prev) => {
      const idx = prev.called.indexOf(n);
      if (idx === -1) {
        return { ...prev, called: [...prev.called, n], history: [...prev.history, n] };
      }
      return {
        ...prev,
        called: prev.called.filter((x) => x !== n),
        history: prev.history.filter((x) => x !== n),
      };
    });
  }

  function undo() {
    setState((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      return {
        ...prev,
        history: prev.history.slice(0, -1),
        called: prev.called.filter((x) => x !== last),
      };
    });
  }

  function reset() {
    setState((prev) => {
      const rounds =
        prev.called.length > 0
          ? [
              ...prev.rounds,
              {
                numbers: [...prev.called],
                endedAt: new Date().toISOString(),
                location: (prev.currentLocation || '').trim(),
              },
            ]
          : prev.rounds;
      return { ...prev, called: [], history: [], rounds };
    });
  }

  const latest = state.history[state.history.length - 1];

  return { state, latest, toggle, undo, reset };
}
