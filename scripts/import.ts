import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnvironment } from './env';
import { fatal } from './cli';
loadEnvironment();
try {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: npm run import -- private/catalogue.json');
  const bytes = await readFile(resolve(path));
  if (bytes.length > 2 * 1024 * 1024) throw new Error('Maximum catalogue size is 2 MB.');
  const { readSnapshot, publishCatalogue } = await import('../lib/store'),
    { migrateApp, closeDatabase } = await import('../lib/database');
  await migrateApp();
  const prior = await readSnapshot();
  const result = await publishCatalogue(JSON.parse(bytes.toString('utf8')), prior.version);
  const readback = await readSnapshot();
  if (
    readback.version !== result.version ||
    JSON.stringify(readback.catalogue) !== JSON.stringify(result.catalogue)
  )
    throw new Error('Publication readback failed.');
  console.log(
    JSON.stringify({
      status: result.run.status,
      version: result.version,
      publishedAt: result.publishedAt,
      message: result.run.message,
    }),
  );
  await closeDatabase();
} catch (error) {
  fatal(error);
}
