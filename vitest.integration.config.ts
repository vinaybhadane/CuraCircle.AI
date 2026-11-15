import { defineConfig } from 'vitest/config';
import path from 'node:path';
import os from 'node:os';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'node', fileParallelism: false,
    include: ['src/**/*.integration.ts'], testTimeout: 30000, hookTimeout: 30000,
    env: { CURACIRCLE_DATA_DIR: path.join(os.tmpdir(), `curacircle-integration-${process.pid}`), JWT_SECRET: 'isolated-integration-test-secret-at-least-32-characters', BREVO_API_KEY: '', SMTP_HOST: '' },
  },
});
