import { member, sameOrigin } from '@/lib/access';
import { saveNote } from '@/lib/store';
import { boundedJSON, failure, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function PUT(request: Request) {
  try {
    await member(request.headers);
    sameOrigin(request);
    return json(await saveNote(await boundedJSON(request, 12_000)));
  } catch (error) {
    return failure(error);
  }
}
