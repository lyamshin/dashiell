import { defineConfig } from 'vite';

/**
 * A static book. `base: './'` so that `dist/` works when it is served from a
 * subdirectory of any file server, not just from the root.
 */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsDir: 'assets',
  },
  server: {
    open: false,
  },
});
