import { isDemo } from '@/lib/config';
import { member, serviceAccess } from '@/lib/access';
import { demoCatalogue } from '@/lib/demo';
import { readNotes, readRuns, readSnapshot } from '@/lib/store';
import { failure, json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (isDemo())
      return json({
        snapshot: { catalogue: demoCatalogue(), version: 1, publishedAt: null },
        notes: [],
        runs: [],
        mode: 'demo',
        access: null,
      });
    // A sync bearer can read the catalogue/version, but never family notes.
    if (serviceAccess(request.headers)) return json({ snapshot: await readSnapshot() });
    const access = await member(request.headers);
    const [snapshot, notes, runs] = await Promise.all([readSnapshot(), readNotes(), readRuns()]);
    return json({ snapshot, notes, runs, mode: 'private', access });
  } catch (error) {
    return failure(error);
  }
}
