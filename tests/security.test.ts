import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { demoCatalogue } from '../lib/demo';

test('private import, authentication and family-state boundaries', async (t) => {
  const temp = await mkdtemp(join(tmpdir(), 'schooldesk-test-'));
  process.env.SCHOOLDESK_DATABASE = join(temp, 'test.sqlite');
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('base64url');
  process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  process.env.SCHOOLDESK_SYNC_TOKEN = randomBytes(48).toString('base64url');
  process.env.SCHOOLDESK_MODE = 'private';
  const { migrateApp, closeDatabase, database } = await import('../lib/database');
  const { addMember, removeMember } = await import('../scripts/accounts');
  const { auth } = await import('../lib/auth');
  const { readSnapshot, readNotes, publishCatalogue, saveNote, saveAsset, readRuns } =
    await import('../lib/store');
  const { GET: snapshotGET } = await import('../app/api/snapshot/route');
  const { POST: importPOST } = await import('../app/api/import/route');
  const { PUT: notePUT } = await import('../app/api/notes/route');
  const { GET: assetGET } = await import('../app/api/assets/[id]/route');
  const { POST: authPOST } = await import('../app/api/auth/[...all]/route');
  const password = randomBytes(24).toString('base64url');
  try {
    await migrateApp();
    await addMember('owner@example.test', 'Owner', password, 'owner');
    await addMember('viewer@example.test', 'Viewer', password, 'viewer');
    const signIn = async (email: string) => {
      const response = await auth().handler(
        new Request('http://localhost:3000/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
          body: JSON.stringify({ email, password }),
        }),
      );
      assert.equal(response.status, 200);
      return response.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
    };
    const ownerCookie = await signIn('owner@example.test'),
      viewerCookie = await signIn('viewer@example.test');
    const request = (
      path: string,
      body?: unknown,
      cookie?: string,
      origin = 'http://localhost:3000',
    ) =>
      new Request('http://localhost:3000' + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          Origin: origin,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    const catalogue = { ...demoCatalogue(), media: [] };
    await t.test(
      'anonymous visitors and forged upstream identity headers cannot read private data',
      async () => {
        assert.equal((await snapshotGET(request('/api/snapshot'))).status, 401);
        assert.equal(
          (
            await snapshotGET(
              new Request('http://localhost:3000/api/snapshot', {
                headers: {
                  'oai-authenticated-user-email': 'owner@example.test',
                  'oai-authenticated-user-id': 'forged',
                },
              }),
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await assetGET(request('/api/assets/' + 'a'.repeat(64)), {
              params: Promise.resolve({ id: 'a'.repeat(64) }),
            })
          ).status,
          401,
        );
      },
    );
    await t.test('public signup is disabled', async () => {
      const response = await authPOST(
        request('/api/auth/sign-up/email', {
          email: 'unknown@example.test',
          name: 'Unknown',
          password,
        }),
      );
      assert.equal(response.status, 403);
    });
    await t.test('viewer cannot import; owner publishes with optimistic concurrency', async () => {
      assert.equal(
        (await importPOST(request('/api/import', { catalogue, expectedVersion: 0 }, viewerCookie)))
          .status,
        403,
      );
      const response = await importPOST(
        request('/api/import', { catalogue, expectedVersion: 0 }, ownerCookie),
      );
      assert.equal(response.status, 200);
      assert.equal((await readSnapshot()).version, 1);
      await assert.rejects(
        () =>
          publishCatalogue(
            { ...catalogue, profile: { ...catalogue.profile, title: 'Changed title' } },
            0,
          ),
        /catalogue changed/i,
      );
    });
    await t.test('notes and completed actions survive imports unchanged', async () => {
      const note = await saveNote({
        id: 'pack',
        note: 'A family plan',
        done: true,
        expectedVersion: 0,
      });
      assert.equal(note.version, 1);
      const before = await readNotes();
      await publishCatalogue(
        { ...catalogue, profile: { ...catalogue.profile, title: 'Our school days' } },
        1,
      );
      assert.deepEqual(await readNotes(), before);
      await assert.rejects(
        () => saveNote({ id: 'pack', note: 'Overwrite', expectedVersion: 0 }),
        /updated this note/i,
      );
      assert.deepEqual(await readNotes(), before);
    });
    await t.test(
      'failed imports retain the last good catalogue and appear in history',
      async () => {
        const before = await readSnapshot();
        await assert.rejects(
          () =>
            publishCatalogue(
              {
                ...catalogue,
                media: [
                  {
                    id: 'missing',
                    title: 'Missing',
                    date: catalogue.notices[0].date,
                    kind: 'image',
                    assetId: 'missing',
                    sourceId: 'demo',
                  },
                ],
              },
              2,
            ),
          /Upload the original/i,
        );
        assert.deepEqual(await readSnapshot(), before);
        assert.equal((await readRuns())[0].status, 'failed');
      },
    );
    await t.test('cross-origin browser writes are rejected', async () => {
      const r = new Request('http://localhost:3000/api/notes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://untrusted.example',
          Cookie: ownerCookie,
        },
        body: JSON.stringify({ id: 'pack', note: 'changed', expectedVersion: 1 }),
      });
      assert.equal((await notePUT(r)).status, 403);
    });
    await t.test(
      'service bearer can publish and read a catalogue but cannot read family notes',
      async () => {
        const headers = { Authorization: 'Bearer ' + process.env.SCHOOLDESK_SYNC_TOKEN };
        const r = await snapshotGET(new Request('http://localhost:3000/api/snapshot', { headers }));
        const body = await r.json();
        assert.equal(r.status, 200);
        assert.equal('notes' in body, false);
        assert.equal('access' in body, false);
        const before = await readNotes();
        const response = await importPOST(
          new Request('http://localhost:3000/api/import', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ catalogue, expectedVersion: 2 }),
          }),
        );
        assert.equal(response.status, 200);
        assert.deepEqual(await readNotes(), before);
        const noteResponse = await notePUT(
          new Request('http://localhost:3000/api/notes', {
            method: 'PUT',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
              Origin: 'http://localhost:3000',
            },
            body: JSON.stringify({ id: 'pack', note: 'bad', expectedVersion: 1 }),
          }),
        );
        assert.equal(noteResponse.status, 401);
      },
    );
    await t.test(
      'originals are private and checksum-addressed; invalid MIME is rejected',
      async () => {
        const asset = await saveAsset(
          Buffer.from('A fictional original'),
          'text/plain',
          'guide.txt',
        );
        assert.equal(asset.sha256.length, 64);
        const r = await assetGET(request('/api/assets/' + asset.sha256, undefined, viewerCookie), {
          params: Promise.resolve({ id: asset.sha256 }),
        });
        assert.equal(r.status, 200);
        assert.equal(await r.text(), 'A fictional original');
        assert.match(r.headers.get('cache-control')!, /private, no-store/);
        await assert.rejects(
          () => saveAsset(Buffer.from('<script>bad</script>'), 'image/png', 'image.png'),
          /do not match/i,
        );
        const range = await assetGET(
          new Request('http://localhost:3000/api/assets/' + asset.sha256, {
            headers: { Cookie: viewerCookie, Range: 'bytes=2-10' },
          }),
          { params: Promise.resolve({ id: asset.sha256 }) },
        );
        assert.equal(range.status, 206);
        assert.equal(await range.text(), 'fictional');
      },
    );
    await t.test(
      'removed family membership revokes access for an existing signed-in session',
      async () => {
        assert.equal(
          (await snapshotGET(request('/api/snapshot', undefined, viewerCookie))).status,
          200,
        );
        await removeMember('viewer@example.test');
        assert.equal(
          (await snapshotGET(request('/api/snapshot', undefined, viewerCookie))).status,
          403,
        );
        await assert.rejects(
          () => removeMember('owner@example.test'),
          /at least one family owner/i,
        );
      },
    );
    await t.test(
      'demo mode cannot reach or mutate private storage even with a valid owner cookie',
      async () => {
        const before = await readSnapshot();
        process.env.SCHOOLDESK_MODE = 'demo';
        const demo = await snapshotGET(request('/api/snapshot', undefined, ownerCookie));
        const data = await demo.json();
        assert.equal(data.mode, 'demo');
        assert.deepEqual(data.notes, []);
        assert.equal(data.snapshot.version, 1);
        assert.equal(
          (await importPOST(request('/api/import', { catalogue, expectedVersion: 3 }, ownerCookie)))
            .status,
          403,
        );
        assert.throws(() => database(), /cannot open private storage/i);
        process.env.SCHOOLDESK_MODE = 'private';
        assert.deepEqual(await readSnapshot(), before);
      },
    );
    await t.test(
      'invented forwarded addresses cannot bypass the shared login rate limit',
      async () => {
        let blocked = false;
        for (let i = 0; i < 8; i++) {
          const response = await authPOST(
            new Request('http://localhost:3000/api/auth/sign-in/email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Origin: 'http://localhost:3000',
                'X-Forwarded-For': '192.0.2.' + (i + 1),
              },
              body: JSON.stringify({
                email: 'owner@example.test',
                password: 'an-incorrect-test-password',
              }),
            }),
          );
          if (response.status === 429) blocked = true;
        }
        assert.equal(blocked, true);
      },
    );
  } finally {
    process.env.SCHOOLDESK_MODE = 'private';
    await closeDatabase();
    await rm(temp, { recursive: true, force: true });
  }
});
