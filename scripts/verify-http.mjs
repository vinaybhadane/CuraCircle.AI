import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 3100;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { windowsHide: true, stdio: 'ignore' });
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
} finally { server.kill(); }
