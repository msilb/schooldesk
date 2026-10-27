import { timingSafeEqual } from 'node:crypto';
import { auth } from './auth';
import { database } from './database';
import { baseURL, isDemo } from './config';
import type { Access } from './schema';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function member(headers: Headers): Promise<Access> {
  if (isDemo()) throw new HttpError(403, 'The public demo has no private accounts.');
  const session = await auth().api.getSession({ headers });
  if (!session) throw new HttpError(401, 'Sign in to your family’s school desk.');
  const email = session.user.email.toLowerCase();
  const row = await database()
    .db.selectFrom('sd_members')
    .selectAll()
    .where('email', '=', email)
    .executeTakeFirst();
  if (!row) throw new HttpError(403, 'This account is not a member of this family.');
  return { email, role: row.role };
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== baseURL())
    throw new HttpError(403, 'Open this form on your school desk.');
}
export function serviceAccess(headers: Headers) {
  const expected = process.env.SCHOOLDESK_SYNC_TOKEN;
  const got = headers.get('authorization')?.replace(/^Bearer /, '');
  if (!expected || expected.length < 32 || !got) return false;
  const a = Buffer.from(got),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function ownerOrService(request: Request) {
  if (isDemo()) throw new HttpError(403, 'Import is disabled in the fictional demo.');
  if (serviceAccess(request.headers)) return;
  const access = await member(request.headers);
  if (access.role !== 'owner')
    throw new HttpError(403, 'Only the family owner can import content.');
  sameOrigin(request);
}
