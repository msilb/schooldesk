import { isDemo } from '@/lib/config';
import { member } from '@/lib/access';
import { json, failure } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (!isDemo()) await member(request.headers);
    return json({ build: process.env.NEXT_PUBLIC_BUILD_ID });
  } catch (e) {
    return failure(e);
  }
}
