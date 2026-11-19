import { defineConfig } from 'vitest/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwind()],
  test: { include: ['tests/**/*.test.ts'] },
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [{ name: 'react-runtime', test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
});
