import { database, migrateApp } from '../lib/database';
import { makeAuth, authOptions } from '../lib/auth';
import { getMigrations } from 'better-auth/db/migration';
export async function addMember(
  email: string,
  name: string,
  password: string,
  role: 'owner' | 'viewer',
) {
  email = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!name.trim() || password.length < 12 || password.length > 128)
    throw new Error('Use a name and a password with 12–128 characters.');
  await migrateApp();
  await (await getMigrations(authOptions(true))).runMigrations();
  const signup = makeAuth(true);
  const db = database().db;
  if (
    await db.selectFrom('sd_members').select('email').where('email', '=', email).executeTakeFirst()
  )
    throw new Error('This family member already exists.');
  await signup.api.signUpEmail({ body: { email, name, password } });
  await db.insertInto('sd_members').values({ email, role }).execute();
}
export async function removeMember(email: string) {
  email = email.toLowerCase().trim();
  const db = database().db;
  await db.transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom('sd_members')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
    if (!row) throw new Error('This email is not a family member.');
    const owners = await trx
      .selectFrom('sd_members')
      .select('email')
      .where('role', '=', 'owner')
      .execute();
    if (row.role === 'owner' && owners.length <= 1)
      throw new Error('Keep at least one family owner.');
    await trx.deleteFrom('sd_members').where('email', '=', email).execute();
  });
  // Access checks consult membership on every request, including existing
  // sessions. Removing membership immediately removes dashboard/file access.
}
