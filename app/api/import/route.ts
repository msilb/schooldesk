import { ownerOrService, HttpError } from '@/lib/access';
import { publishCatalogue } from '@/lib/store';
import { boundedJSON, failure, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    await ownerOrService(request);
    const body = (await boundedJSON(request)) as { catalogue?: unknown; expectedVersion?: number };
    if (!body || typeof body !== 'object' || typeof body.expectedVersion !== 'number')
      throw new HttpError(400, 'Send catalogue and expectedVersion.');
    const result = await publishCatalogue(body.catalogue, body.expectedVersion);
    return json({ version: result.version, publishedAt: result.publishedAt, run: result.run });
  } catch (error) {
    return failure(error);
  }
}
