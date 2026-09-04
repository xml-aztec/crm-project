/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Отдельный конфиг, а не секция в vite.config.ts: сборочный конфиг тянет
// svgr и прочие плагины, которые тестам не нужны и только замедляют запуск.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
