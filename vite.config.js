import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  css: {
    // Explicitly point to the PostCSS config file, which is now
    // correctly configured for Tailwind v3.
    postcss: './postcss.config.cjs',
  },
})
