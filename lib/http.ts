import { ZodError } from 'zod';
import { HttpError } from './access';
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
export async function boundedJSON(request: Request, max = 2 * 1024 * 1024) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'Send JSON content.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'The request has no body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, 'The import is too large. Maximum 2 MB.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'This file is not valid JSON.');
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      {
        error: 'The import did not pass validation.',
        issues: error.issues
          .map((i) => ({ path: i.path.join('.'), message: i.message }))
          .slice(0, 20),
      },
      422,
    );
  // Never return raw database errors, requests, credentials or content.
  console.error('Schooldesk request failed:', error instanceof Error ? error.name : 'UnknownError');
  return json(
    { error: 'The request could not be completed. Check the server setup and try again.' },
    503,
  );
}
