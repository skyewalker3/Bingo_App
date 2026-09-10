import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site (skyewalker3.github.io/Bingo_App/), not a
  // custom domain or user/org page — update if the hosting target changes.
  base: '/Bingo_App/',
  plugins: [react()],
})
