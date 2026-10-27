import { database } from '@/lib/database';
import { member, HttpError } from '@/lib/access';
import { failure } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await member(request.headers);
    const { id } = await params;
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'File not found.');
    const asset = await database()
      .db.selectFrom('sd_assets')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!asset) throw new HttpError(404, 'File not found.');
    const size = asset.bytes.length,
      headers = new Headers({
        'Content-Type': asset.mime,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes',
      });
    const download =
      new URL(request.url).searchParams.has('download') ||
      asset.mime === 'application/pdf' ||
      asset.mime === 'text/plain';
    headers.set(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(asset.name).replace(/'/g, '%27')}`,
    );
    const range = request.headers.get('range');
    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!match || (!match[1] && !match[2]))
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1]
        ? match[2]
          ? Math.min(Number(match[2]), size - 1)
          : size - 1
        : size - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start >= size ||
        end < start
      )
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
      headers.set('Content-Length', String(end - start + 1));
      return new Response(new Uint8Array(asset.bytes.subarray(start, end + 1)), {
        status: 206,
        headers,
      });
    }
    headers.set('Content-Length', String(size));
    return new Response(new Uint8Array(asset.bytes), { headers });
  } catch (error) {
    return failure(error);
  }
}
