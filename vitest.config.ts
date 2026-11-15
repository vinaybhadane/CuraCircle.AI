import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/lib/__tests__/setup.ts'],
    env: { CURACIRCLE_DATA_DIR: path.join(os.tmpdir(), `curacircle-tests-${process.pid}`), GEMINI_API_KEY: '', BREVO_API_KEY: '', SMTP_HOST: '', JWT_SECRET: 'test-only-isolated-session-signing-key-at-least-32-characters' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
