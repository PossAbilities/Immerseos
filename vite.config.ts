import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// ImmerseOS ships three browser surfaces from one codebase:
//  - index.html       → the operator Control application
//  - projection.html  → the full-screen output for the room's projectors
//  - remote.html      → the mobile remote (served over the LAN, reached via QR)
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projection: resolve(__dirname, 'projection.html'),
        remote: resolve(__dirname, 'remote.html'),
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
