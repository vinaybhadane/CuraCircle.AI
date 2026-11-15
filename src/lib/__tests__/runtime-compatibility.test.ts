import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('loads Firebase Admin auth in a serverless CommonJS runtime without require(ESM)', () => {
  const output = execFileSync(process.execPath, ['--no-experimental-require-module', '-e',
    "require('firebase-admin/app'); require('firebase-admin/auth'); process.stdout.write('auth-loaded');"],
  { cwd: process.cwd(), timeout: 10000, encoding: 'utf8', windowsHide: true });
  expect(output).toBe('auth-loaded');
});
