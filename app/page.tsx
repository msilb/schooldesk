import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isDemo } from '@/lib/config';
import { member, HttpError } from '@/lib/access';
import { demoCatalogue } from '@/lib/demo';
import { readSnapshot, readNotes, readRuns } from '@/lib/store';
import Dashboard from './dashboard';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function Page() {
  if (isDemo())
    return (
      <Dashboard
        initial={{ catalogue: demoCatalogue(), version: 1, publishedAt: null }}
        initialNotes={[]}
        initialRuns={[]}
        mode="demo"
        access={null}
      />
    );
  try {
    const access = await member(await headers());
    const [snapshot, notes, runs] = await Promise.all([readSnapshot(), readNotes(), readRuns()]);
    return (
      <Dashboard
        initial={snapshot}
        initialNotes={notes}
        initialRuns={runs}
        mode="private"
        access={access}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && [401, 403].includes(error.status)) redirect('/sign-in');
    throw error;
  }
}
