// A real production-server smoke test, using only an ephemeral fictional family.
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { demoCatalogue } from '../lib/demo';
const temp = await mkdtemp(join(tmpdir(), 'schooldesk-http-'));
const port = await new Promise<number>((resolve) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const port = (s.address() as { port: number }).port;
    s.close(() => resolve(port));
  });
});
const base = 'http://127.0.0.1:' + port,
  password = randomBytes(24).toString('base64url');
Object.assign(process.env, {
  SCHOOLDESK_MODE: 'private',
  SCHOOLDESK_DATABASE: join(temp, 'family.sqlite'),
  BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
  BETTER_AUTH_URL: base,
  SCHOOLDESK_SYNC_TOKEN: randomBytes(48).toString('base64url'),
  SCHOOLDESK_ALLOW_HTTP: 'true',
});
const { addMember } = await import('./accounts'),
  { closeDatabase } = await import('../lib/database');
await addMember('owner@example.test', 'Owner', password, 'owner');
await addMember('viewer@example.test', 'Viewer', password, 'viewer');
await closeDatabase();
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
  { env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] },
);
let diagnostics = '';
child.stderr.on('data', (b) => {
  diagnostics += b.toString();
});
child.stdout.on('data', () => {});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/sign-in')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, 'Production server starts');
  const request = async (path: string, method = 'GET', body?: unknown, cookie?: string) =>
    fetch(base + path, {
      method,
      headers: {
        Origin: base,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
  assert.equal((await request('/')).status, 307);
  assert.equal((await request('/api/snapshot')).status, 401);
  assert.equal(
    (
      await request('/api/auth/sign-up/email', 'POST', {
        email: 'stranger@example.test',
        name: 'Stranger',
        password,
      })
    ).status,
    403,
  );
  const login = async (email: string) => {
    const r = await request('/api/auth/sign-in/email', 'POST', { email, password });
    assert.equal(r.status, 200);
    return r.headers
      .getSetCookie()
      .map((s) => s.split(';')[0])
      .join('; ');
  };
  const owner = await login('owner@example.test'),
    viewer = await login('viewer@example.test');
  assert.equal((await request('/', 'GET', undefined, owner)).status, 200);
  const catalogue = { ...demoCatalogue(), media: [] };
  assert.equal(
    (await request('/api/import', 'POST', { catalogue, expectedVersion: 0 }, viewer)).status,
    403,
  );
  const published = await request('/api/import', 'POST', { catalogue, expectedVersion: 0 }, owner);
  assert.equal(published.status, 200);
  const note = await request(
    '/api/notes',
    'PUT',
    { id: 'pack', note: 'A shared fictional note', done: true, expectedVersion: 0 },
    viewer,
  );
  assert.equal(note.status, 200);
  const stale = await request(
    '/api/notes',
    'PUT',
    { id: 'pack', note: 'An old edit', expectedVersion: 0 },
    owner,
  );
  assert.equal(stale.status, 409);
  const changed = { ...catalogue, profile: { ...catalogue.profile, title: 'Our private desk' } };
  assert.equal(
    (await request('/api/import', 'POST', { catalogue: changed, expectedVersion: 1 }, owner))
      .status,
    200,
  );
  const readback = await (await request('/api/snapshot', 'GET', undefined, viewer)).json();
  assert.equal(readback.snapshot.version, 2);
  assert.equal(readback.notes[0].note, 'A shared fictional note');
  assert.equal(readback.notes[0].done, true);
  const invalid = await request(
    '/api/import',
    'POST',
    {
      catalogue: { ...changed, events: [{ ...changed.events[0], date: 'not-a-date' }] },
      expectedVersion: 2,
    },
    owner,
  );
  assert.equal(invalid.status, 422);
  const retained = await (await request('/api/snapshot', 'GET', undefined, owner)).json();
  assert.equal(retained.snapshot.version, 2);
  assert.equal(retained.runs[0].status, 'failed');
  const file = await fetch(base + '/api/assets', {
    method: 'POST',
    headers: {
      Origin: base,
      Cookie: owner,
      'Content-Type': 'text/plain',
      'X-File-Name': 'fictional.txt',
    },
    body: 'A fictional source original',
  });
  assert.equal(file.status, 200);
  const original = await file.json();
  assert.equal((await request('/api/assets/' + original.sha256)).status, 401);
  const download = await request('/api/assets/' + original.sha256, 'GET', undefined, viewer);
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'A fictional source original');
  assert.match(download.headers.get('cache-control')!, /private, no-store/);
  assert.equal((await request('/api/auth/sign-out', 'POST', {}, viewer)).status, 200);
  assert.equal((await request('/api/snapshot', 'GET', undefined, viewer)).status, 401);
  console.log(
    'Production HTTP smoke test passed: sign-in, private pages/files, viewer permissions, imports, conflict protection, retained notes, failed-run history and sign-out.',
  );
} catch (error) {
  console.error('Production HTTP smoke test failed.');
  if (diagnostics)
    console.error(
      diagnostics.replace(/owner@example\.test|viewer@example\.test/g, '[synthetic account]'),
    );
  throw error;
} finally {
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 2000).unref();
  });
  await rm(temp, { recursive: true, force: true });
}
