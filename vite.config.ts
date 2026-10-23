/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJs from 'vite-plugin-css-injected-by-js';

// Module scripts can't load over file://, so the built page uses a classic deferred script instead.
function classicScriptTag(): Plugin {
  return {
    name: 'classic-script-tag',
    apply: 'build',
    transformIndexHtml: (html) => html.replace(/<script type="module" crossorigin/g, '<script defer'),
  };
}

// Builds the whole app into a single `dist/app.js` (CSS included), loaded by `dist/index.html`.
export default defineConfig({
  base: './',
  plugins: [react(), cssInjectedByJs(), classicScriptTag()],
  build: {
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rolldownOptions: {
      output: {
        format: 'iife',
        codeSplitting: false,
        entryFileNames: 'app.js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
