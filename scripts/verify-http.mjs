import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 3100;
const dataDir = mkdtempSync(join(tmpdir(), 'curacircle-http-'));
const server = spawn(process.execPath, ['--no-experimental-require-module', 'node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  windowsHide: true, stdio: 'ignore', env: { ...process.env, CURACIRCLE_DATA_DIR: dataDir, CURACIRCLE_STORAGE: '', VERCEL: '', JWT_SECRET: 'isolated-http-smoke-test-secret-at-least-32-characters', BREVO_API_KEY: '', SMTP_HOST: '' },
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { if ((await fetch(`http://localhost:${port}`)).ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'Production server did not start.');
  const results = [];
  for (const [path, expected] of [['/', 200], ['/demo-prescription.png', 200], ['/api/auth/session', 401], ['/api/medications', 401], ['/api/members', 401], ['/api/notifications', 401], ['/api/outbox', 401], ['/api/scheduler/tick', 401]]) {
    const response = await fetch(`http://localhost:${port}${path}`);
    assert.equal(response.status, expected, path);
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups', 'OAuth popup policy');
    if (path.startsWith('/api/')) {
      const body = await response.json();
      assert.equal(body.profile, undefined, 'Unauthenticated response disclosed a profile.');
    }
    if (path === '/demo-prescription.png') assert.equal(response.headers.get('content-type'), 'image/png');
    results.push(`${path}: ${response.status}`);
  }
  console.log(results.join('\n'));
  const invalidLogin = await fetch(`http://localhost:${port}/api/auth/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: 'invalid-smoke-test-token' }),
  });
  assert.equal(invalidLogin.status, 401, 'Invalid tokens must return a JSON auth failure, not a module-load 500.');
  assert.ok((await invalidLogin.json()).error);
  const signOut = await fetch(`http://localhost:${port}/api/auth/session`, { method: 'DELETE' });
  assert.equal(signOut.status, 200, 'Sign-out must not depend on Firebase Admin token verification.');
  console.log('POST invalid Google token: 401\nDELETE session: 200');
} finally {
  server.kill();
  // This path is the unique temporary directory created by this script.
  rmSync(dataDir, { recursive: true, force: true });
}
