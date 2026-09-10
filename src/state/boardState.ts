export const STORAGE_KEY = 'bingoCallerBoard';

export interface Round {
  numbers: number[];
  endedAt: string;
  location: string;
}

export interface BoardState {
  called: number[];
  history: number[];
  rounds: Round[];
  currentLocation: string;
}

export function defaultBoardState(): BoardState {
  return { called: [], history: [], rounds: [], currentLocation: '' };
}

// Mirrors the legacy app's defensive per-field load: a corrupt or missing
// field falls back to its default instead of throwing, and unrecognized
// shapes (e.g. from a future/older version) don't wipe out the other fields.
export function loadBoardState(): BoardState {
  const state = defaultBoardState();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.called)) state.called = parsed.called;
      if (Array.isArray(parsed.history)) state.history = parsed.history;
      if (Array.isArray(parsed.rounds)) state.rounds = parsed.rounds;
      if (typeof parsed.currentLocation === 'string') state.currentLocation = parsed.currentLocation;
    }
  } catch (e) {
    console.warn('Could not read saved board', e);
  }
  return state;
}

export function saveBoardState(state: BoardState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
