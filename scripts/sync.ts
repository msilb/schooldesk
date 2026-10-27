// Host-independent JSON importer. This is not a ClassOwl crawler or scheduler.
import { readFile } from 'node:fs/promises';
import { CatalogueSchema } from '../lib/schema';
import { loadEnvironment } from './env';
import { fatal } from './cli';
loadEnvironment();
try {
  const file = process.argv[2],
    origin = process.env.SCHOOLDESK_SYNC_URL,
    token = process.env.SCHOOLDESK_SYNC_TOKEN;
  if (!file || !origin || !token || token.length < 32)
    throw new Error(
      'Set SCHOOLDESK_SYNC_URL and SCHOOLDESK_SYNC_TOKEN, then run npm run sync -- private/catalogue.json.',
    );
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Use an HTTPS school desk URL.');
  const bytes = await readFile(file);
  if (bytes.length > 2 * 1024 * 1024) throw new Error('Maximum catalogue size is 2 MB.');
  const catalogue = CatalogueSchema.parse(JSON.parse(bytes.toString('utf8')));
  const send = async (path: string, body?: unknown) => {
    const response = await fetch(new URL(path, url), {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
      redirect: 'error',
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        'Sync failed (' +
          response.status +
          '): ' +
          (result.error || 'Check the dashboard import history.'),
      );
    return result;
  };
  const prior = await send('/api/snapshot');
  const result = await send('/api/import', { catalogue, expectedVersion: prior.snapshot.version });
  const checked = await send('/api/snapshot');
  if (
    checked.snapshot.version !== result.version ||
    JSON.stringify(checked.snapshot.catalogue) !== JSON.stringify(catalogue)
  )
    throw new Error('Publication readback did not match.');
  console.log(
    JSON.stringify({
      status: result.run.status,
      version: result.version,
      publishedAt: result.publishedAt,
      message: result.run.message,
    }),
  );
} catch (error) {
  fatal(error);
}
