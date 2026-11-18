import { defineConfig } from 'vitest/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwind()],
  test: { include: ['tests/**/*.test.ts'] },
});
