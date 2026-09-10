import { useEffect, useState } from 'react';
import { applyTheme, loadThemeId, saveThemeId } from '../lib/themes';

export function useTheme() {
  const [themeId, setThemeId] = useState<string>(() => loadThemeId());

  useEffect(() => {
    applyTheme(themeId);
    saveThemeId(themeId);
  }, [themeId]);

  return { themeId, setThemeId };
}
