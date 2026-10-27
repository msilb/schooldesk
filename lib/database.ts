import Database from 'better-sqlite3';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { Pool } from 'pg';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isDemo } from './config';

interface Tables {
  sd_catalogue: { id: number; json: string; version: number; published_at: string | null };
  sd_notes: { id: string; json: string; version: number };
  sd_members: { email: string; role: 'owner' | 'viewer' };
  sd_runs: { id: string; json: string; started_at: string };
  sd_assets: { id: string; bytes: Buffer; mime: string; name: string };
}
let instance:
  | { db: Kysely<Tables>; authDatabase: Database.Database | Pool; dialect: 'sqlite' | 'postgres' }
  | undefined;
export function database() {
  if (isDemo()) throw new Error('Demo mode cannot open private storage.');
  if (instance) return instance;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
    instance = {
      db: new Kysely<Tables>({ dialect: new PostgresDialect({ pool }) }),
      authDatabase: pool,
      dialect: 'postgres',
    };
  } else {
    if (process.env.VERCEL)
      throw new Error(
        'A persistent DATABASE_URL is required on Vercel. SQLite is for local/container hosting.',
      );
    const file = resolve(
      /*turbopackIgnore: true*/ process.env.SCHOOLDESK_DATABASE || '.data/schooldesk.sqlite',
    );
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    const sqlite = new Database(file);
    chmodSync(file, 0o600);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');
    instance = {
      db: new Kysely<Tables>({ dialect: new SqliteDialect({ database: sqlite }) }),
      authDatabase: sqlite,
      dialect: 'sqlite',
    };
  }
  return instance;
}
export async function migrateApp() {
  const { db, dialect } = database();
  await db.schema
    .createTable('sd_catalogue')
    .ifNotExists()
    .addColumn('id', 'integer', (c) => c.primaryKey())
    .addColumn('json', 'text', (c) => c.notNull())
    .addColumn('version', 'integer', (c) => c.notNull())
    .addColumn('published_at', 'text')
    .execute();
  await db.schema
    .createTable('sd_notes')
    .ifNotExists()
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('json', 'text', (c) => c.notNull())
    .addColumn('version', 'integer', (c) => c.notNull())
    .execute();
  await db.schema
    .createTable('sd_members')
    .ifNotExists()
    .addColumn('email', 'text', (c) => c.primaryKey())
    .addColumn('role', 'text', (c) => c.notNull())
    .execute();
  await db.schema
    .createTable('sd_runs')
    .ifNotExists()
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('json', 'text', (c) => c.notNull())
    .addColumn('started_at', 'text', (c) => c.notNull())
    .execute();
  await db.schema
    .createTable('sd_assets')
    .ifNotExists()
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('bytes', dialect === 'postgres' ? 'bytea' : 'blob', (c) => c.notNull())
    .addColumn('mime', 'text', (c) => c.notNull())
    .addColumn('name', 'text', (c) => c.notNull())
    .execute();
}
export async function closeDatabase() {
  if (instance) {
    await instance.db.destroy();
    instance = undefined;
  }
}
