import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { privateReleasePath, contentFindings, binaryFinding } from '../lib/release-audit';

test('private environment files are refused, including dotted names and nested paths', () => {
  for (const path of [
    '.env',
    '.env.local',
    '.env.production',
    'nested/.env.local',
    '.env.example.bak',
    'private/file.json',
    '.data/family.sqlite',
  ])
    assert.equal(privateReleasePath(path), true, path);
  assert.equal(privateReleasePath('.env.example'), false);
  assert.equal(privateReleasePath('examples/catalogue.json'), false);
});
test('tokens and private namespaces are detected without embedding real credentials', () => {
  assert.ok(contentFindings('gh' + 'p_' + 'a'.repeat(36)).includes('access token'));
  assert.ok(contentFindings('ns:' + '123456//archive').includes('Dropbox namespace'));
  assert.deepEqual(contentFindings('BETTER_AUTH_SECRET=\nSCHOOLDESK_SYNC_TOKEN=\n'), []);
});
test('a private external denylist is case-insensitive and need not enter Git', () => {
  assert.ok(
    contentFindings('A PRIVATE EXAMPLE', ['private example']).includes('private denylist match'),
  );
  assert.deepEqual(contentFindings('Fictional school data', ['private example']), []);
});
test('scanner definitions do not exempt themselves or flag generic rule names', () => {
  assert.deepEqual(contentFindings(readFileSync(resolve('lib/release-audit.ts'), 'utf8')), []);
  assert.ok(
    contentFindings('/' + 'Users/' + 'private-user/document.txt').includes(
      'local/private environment reference',
    ),
  );
});
test('an approved image filename is not permission to replace its bytes', () => {
  const bytes = Buffer.from('fictional image bytes'),
    path = 'public/icon.png';
  const manifest = { [path]: createHash('sha256').update(bytes).digest('hex') };
  assert.equal(binaryFinding(path, bytes, manifest), undefined);
  assert.match(binaryFinding(path, Buffer.from('different bytes'), manifest)!, /differ/);
});

test('history mode catches a private file deleted from the latest tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'schooldesk-history-check-'));
  const cli = resolve('scripts/check-release.ts'),
    tsx = resolve('node_modules/.bin/tsx');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Fictional test');
    git('config', 'user.email', 'test@example.invalid');
    writeFileSync(join(root, '.env.local'), 'A fictional private fixture');
    git('add', '.');
    git('commit', '-m', 'A test-only private file');
    unlinkSync(join(root, '.env.local'));
    writeFileSync(join(root, 'README.md'), 'A clean public example');
    git('add', '-A');
    git('commit', '-m', 'Remove the test fixture');
    assert.equal(spawnSync(tsx, [cli], { cwd: root, encoding: 'utf8' }).status, 0);
    const historical = spawnSync(tsx, [cli, '--history'], { cwd: root, encoding: 'utf8' });
    assert.equal(historical.status, 1);
    assert.match(historical.stderr, /Git history: private\/runtime path: .env.local/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
