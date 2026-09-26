import { createResizeOptions, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// App background (--bg in src/index.css) so maskable/apple icons match the
// dark board theme instead of the library's default white padding.
const APP_BG = '#1b2a2f';

// Generates public/pwa-192x192.png, public/pwa-512x512.png,
// public/maskable-icon-512x512.png, and public/apple-touch-icon-180x180.png
// from public/favicon.svg. Re-run `npm run pwa:assets` after changing the
// source SVG.
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: createResizeOptions(false, { background: APP_BG }),
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: createResizeOptions(false, { background: APP_BG }),
    },
  },
  images: ['public/favicon.svg'],
});
