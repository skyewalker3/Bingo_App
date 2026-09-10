import { useState } from 'react';

interface ControlsProps {
  onUndo: () => void;
  onReset: () => void;
}

export function Controls({ onUndo, onReset }: ControlsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="controls">
        <button className="action" id="undoBtn" onClick={onUndo}>
          Undo last
        </button>
        <button className="action danger" id="resetBtn" onClick={() => setConfirmOpen(true)}>
          Reset board
        </button>
      </div>
      <div className={'confirm-bar' + (confirmOpen ? ' show' : '')} id="confirmBar">
        <span>Clear all called numbers?</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="no" id="cancelReset" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
          <button
            className="yes"
            id="doReset"
            onClick={() => {
              onReset();
              setConfirmOpen(false);
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
}
