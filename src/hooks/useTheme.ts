import { useLayoutEffect, useState } from 'react';
import { applyTheme, loadThemeId, saveThemeId } from '../lib/themes';

export function useTheme() {
  const [themeId, setThemeId] = useState<string>(() => loadThemeId());

  // useLayoutEffect (not useEffect) so the saved theme's CSS custom
  // properties are set before the browser paints, matching the legacy app's
  // guarantee (it called applyTheme() synchronously before the board ever
  // rendered) -- useEffect fires after paint and could flash Classic's
  // colors first for anyone with a different saved theme.
  useLayoutEffect(() => {
    applyTheme(themeId);
    saveThemeId(themeId);
  }, [themeId]);

  return { themeId, setThemeId };
}
