import { loadEnvironment } from './env';
import { fatal } from './cli';
loadEnvironment();
try {
  const { migrateApp, closeDatabase } = await import('../lib/database');
  const { authOptions } = await import('../lib/auth');
  const { getMigrations } = await import('better-auth/db/migration');
  await migrateApp();
  await (await getMigrations(authOptions())).runMigrations();
  await closeDatabase();
  console.log('Application and authentication tables are current.');
} catch (error) {
  fatal(error);
}
