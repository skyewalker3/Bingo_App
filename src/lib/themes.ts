export interface ThemeColumn {
  bg: string;
  border: string;
  text?: string;
}

export interface Theme {
  name: string;
  cols: [ThemeColumn, ThemeColumn, ThemeColumn, ThemeColumn, ThemeColumn];
}

// Each theme gives background + border for columns B, I, N, G, O (in that
// order). "text" overrides the cell's number color for that column when the
// background is light enough that the default cream text wouldn't be
// readable.
export const THEMES: Record<string, Theme> = {
  classic: {
    name: 'Classic',
    cols: [
      { bg: '#2a5aa8', border: '#3a6bc0' },
      { bg: '#2f7a3a', border: '#3c9349' },
      { bg: '#6a3f9e', border: '#7f4fb8' },
      { bg: '#a8352b', border: '#c24337' },
      { bg: '#b56a1a', border: '#cf7d22' },
    ],
  },
  rainbow: {
    name: 'Rainbow',
    cols: [
      { bg: '#c23b3b', border: '#dd5555' },
      { bg: '#c67a2c', border: '#e0913f' },
      { bg: '#c9a92e', border: '#e0c24a', text: '#16232a' },
      { bg: '#3f8f4f', border: '#52a862' },
      { bg: '#3260b0', border: '#4778c9' },
    ],
  },
  murica: {
    name: 'Murica',
    cols: [
      { bg: '#a8302b', border: '#c2453f' },
      { bg: '#eae3d3', border: '#ffffff', text: '#16232a' },
      { bg: '#2a4d8f', border: '#3d63aa' },
      { bg: '#eae3d3', border: '#ffffff', text: '#16232a' },
      { bg: '#a8302b', border: '#c2453f' },
    ],
  },
  grayscale: {
    name: 'Grayscale',
    cols: [
      { bg: '#5c5c5c', border: '#6e6e6e' },
      { bg: '#4d4d4d', border: '#5f5f5f' },
      { bg: '#3e3e3e', border: '#505050' },
      { bg: '#2e2e2e', border: '#404040' },
      { bg: '#1f1f1f', border: '#333333' },
    ],
  },
  blues: {
    name: 'The Blues',
    cols: [
      { bg: '#6fa6d9', border: '#87b8e3', text: '#16232a' },
      { bg: '#4a86c5', border: '#5f97d1' },
      { bg: '#2f66aa', border: '#417ac0' },
      { bg: '#204a80', border: '#325e96' },
      { bg: '#152f57', border: '#25406c' },
    ],
  },
  greenie: {
    name: 'Greenie',
    cols: [
      { bg: '#7fbf6f', border: '#94cc85', text: '#16232a' },
      { bg: '#5aa350', border: '#6bb562' },
      { bg: '#3d8140', border: '#4f9450' },
      { bg: '#2a6132', border: '#3a7442' },
      { bg: '#1a4324', border: '#295634' },
    ],
  },
  valentines: {
    name: 'Valentines',
    cols: [
      { bg: '#f2a6bd', border: '#f6bccf', text: '#16232a' },
      { bg: '#e5768f', border: '#eb8ea3' },
      { bg: '#c2456a', border: '#cf5c7d' },
      { bg: '#932a4d', border: '#a83e60' },
      { bg: '#5e1633', border: '#742746' },
    ],
  },
  blackout: {
    name: 'Blackout',
    cols: [
      { bg: '#161616', border: '#2c2c2c' },
      { bg: '#141414', border: '#2a2a2a' },
      { bg: '#121212', border: '#282828' },
      { bg: '#101010', border: '#262626' },
      { bg: '#0d0d0d', border: '#242424' },
    ],
  },
  xmas: {
    name: 'XMas',
    cols: [
      { bg: '#a8352b', border: '#c24337' },
      { bg: '#2f7a3a', border: '#3c9349' },
      { bg: '#a8352b', border: '#c24337' },
      { bg: '#2f7a3a', border: '#3c9349' },
      { bg: '#a8352b', border: '#c24337' },
    ],
  },
  sunset: {
    name: 'Sunset',
    cols: [
      { bg: '#e0b23f', border: '#eac35c', text: '#16232a' },
      { bg: '#dd8f3a', border: '#e6a457' },
      { bg: '#d8703f', border: '#e2874f' },
      { bg: '#c8503f', border: '#d56652' },
      { bg: '#8f2f3f', border: '#a34252' },
    ],
  },
  grape: {
    name: 'Grape',
    cols: [
      { bg: '#c9a8e0', border: '#d6bceb', text: '#16232a' },
      { bg: '#a97fd0', border: '#b895d9' },
      { bg: '#8757b8', border: '#9a6ec4' },
      { bg: '#63399c', border: '#7550ac' },
      { bg: '#3f1f6e', border: '#523282' },
    ],
  },
};

export const DEFAULT_THEME_ID = 'classic';
export const THEME_STORAGE_KEY = 'bingoCallerTheme';
export const COL_VAR_NAMES = ['col-b', 'col-i', 'col-n', 'col-g', 'col-o'] as const;

export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
  const root = document.documentElement;
  theme.cols.forEach((col, i) => {
    const varName = COL_VAR_NAMES[i];
    root.style.setProperty(`--${varName}-bg`, col.bg);
    root.style.setProperty(`--${varName}-border`, col.border);
    root.style.setProperty(`--${varName}-text`, col.text || 'var(--cream)');
  });
}

export function loadThemeId(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function saveThemeId(themeId: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (e) {
    console.warn('Could not save theme', e);
  }
}
