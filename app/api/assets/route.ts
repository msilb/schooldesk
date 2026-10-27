import { ownerOrService, HttpError } from '@/lib/access';
import { saveAsset } from '@/lib/store';
import { failure, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    await ownerOrService(request);
    // Raw upload with a streaming size cap: parsing an unbounded multipart body
    // would allocate it before we could check the limit.
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Choose a file.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3 * 1024 * 1024) {
        await reader.cancel();
        throw new HttpError(413, 'Maximum file size is 3 MB.');
      }
      chunks.push(value);
    }
    const name = decodeURIComponent(request.headers.get('x-file-name') || 'original');
    return json(
      await saveAsset(Buffer.concat(chunks), request.headers.get('content-type') || '', name),
    );
  } catch (error) {
    return failure(error);
  }
}
