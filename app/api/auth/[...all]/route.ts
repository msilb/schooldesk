import { auth } from '@/lib/auth';
import { isDemo } from '@/lib/config';
import { failure, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) {
  try {
    if (isDemo()) return json({ error: 'Private login is disabled in the fictional demo.' }, 403);
    const path = new URL(request.url).pathname.replace('/api/auth/', '');
    // There is no public signup, password reset or invitation endpoint. Family
    // members are provisioned through the server CLI, outside the web handler.
    if (!['sign-in/email', 'sign-out', 'get-session', 'change-password', 'ok'].includes(path))
      return json({ error: 'This account operation is disabled.' }, 403);
    return await auth().handler(request);
  } catch (error) {
    return failure(error);
  }
}
export const GET = handle;
export const POST = handle;
