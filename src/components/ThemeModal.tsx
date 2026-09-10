import { THEMES } from '../lib/themes';

interface ThemeModalProps {
  isOpen: boolean;
  themeId: string;
  onSelect: (themeId: string) => void;
  onClose: () => void;
}

export function ThemeModal({ isOpen, themeId, onSelect, onClose }: ThemeModalProps) {
  return (
    <div
      className={'modal-overlay' + (isOpen ? ' show' : '')}
      id="themeOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>Color theme</h2>
          <button className="modal-close" id="closeTheme" onClick={onClose}>
            &times;
          </button>
        </div>
        <p className="modal-sub">Pick a color scheme for the B-I-N-G-O columns.</p>
        <div id="themeList" className="theme-list">
          {Object.entries(THEMES).map(([id, theme]) => (
            <div
              key={id}
              className={'theme-row' + (id === themeId ? ' active' : '')}
              data-theme-id={id}
              onClick={() => onSelect(id)}
            >
              <div className="theme-swatches">
                {theme.cols.map((col, i) => (
                  <span key={i} style={{ background: col.bg }}></span>
                ))}
              </div>
              <div className="theme-row-name">{theme.name}</div>
              <div className="check">&#10003;</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
