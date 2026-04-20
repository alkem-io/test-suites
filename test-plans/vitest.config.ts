import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (...segments: string[]) => path.resolve(__dirname, ...segments);

export default defineConfig({
  resolve: {
    alias: {
      '@src': resolve('src'),
      '@test': resolve('test'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.spec.ts'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './html-report/index.html',
      json: './test-results/cli.json',
    },
  },
});
