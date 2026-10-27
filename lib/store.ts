import { createHash, randomUUID } from 'node:crypto';
import { database } from './database';
import { HttpError } from './access';
import {
  CatalogueSchema,
  NotePatchSchema,
  type Catalogue,
  type Snapshot,
  type Note,
  type ImportRun,
} from './schema';

export const emptyCatalogue: Catalogue = {
  schemaVersion: 1,
  profile: {
    title: 'Our school desk',
    school: 'Your school',
    className: 'Your class',
    childName: 'Your child',
    timezone: 'Europe/Zurich',
    eveningHour: 18,
    weekendDays: [0, 6],
  },
  sources: [],
  events: [],
  documents: [],
  notices: [],
  actions: [],
  media: [],
  week: [],
};
export async function readSnapshot(): Promise<Snapshot> {
  const row = await database()
    .db.selectFrom('sd_catalogue')
    .selectAll()
    .where('id', '=', 1)
    .executeTakeFirst();
  return row
    ? {
        catalogue: CatalogueSchema.parse(JSON.parse(row.json)),
        version: row.version,
        publishedAt: row.published_at,
      }
    : { catalogue: emptyCatalogue, version: 0, publishedAt: null };
}
export async function readNotes() {
  return (await database().db.selectFrom('sd_notes').select('json').execute()).map(
    (r) => JSON.parse(r.json) as Note,
  );
}
export async function readRuns() {
  return (
    await database()
      .db.selectFrom('sd_runs')
      .select('json')
      .orderBy('started_at', 'desc')
      .limit(20)
      .execute()
  ).map((r) => JSON.parse(r.json) as ImportRun);
}
export async function saveNote(value: unknown) {
  const patch = NotePatchSchema.parse(value),
    db = database().db;
  return db.transaction().execute(async (trx) => {
    const snap = await trx
      .selectFrom('sd_catalogue')
      .select('json')
      .where('id', '=', 1)
      .executeTakeFirst();
    const action =
      snap && (JSON.parse(snap.json) as Catalogue).actions.find((a) => a.id === patch.id);
    if (!action) throw new HttpError(404, 'This action is no longer in the catalogue.');
    const row = await trx
      .selectFrom('sd_notes')
      .selectAll()
      .where('id', '=', patch.id)
      .executeTakeFirst();
    const prior: Note = row
      ? JSON.parse(row.json)
      : {
          id: patch.id,
          done: false,
          revision: action.revision,
          note: '',
          version: 0,
          updatedAt: '',
        };
    if (patch.expectedVersion !== prior.version)
      throw new HttpError(409, 'Another family member updated this note. Refresh before saving.');
    const next: Note = {
      ...prior,
      ...(patch.done === undefined ? {} : { done: patch.done, revision: action.revision }),
      ...(patch.note === undefined ? {} : { note: patch.note.trim() }),
      version: prior.version + 1,
      updatedAt: new Date().toISOString(),
    };
    if (row) {
      const result = await trx
        .updateTable('sd_notes')
        .set({ json: JSON.stringify(next), version: next.version })
        .where('id', '=', patch.id)
        .where('version', '=', prior.version)
        .executeTakeFirst();
      if (result.numUpdatedRows !== 1n)
        throw new HttpError(409, 'The note changed. Refresh before saving.');
    } else {
      const result = await trx
        .insertInto('sd_notes')
        .values({ id: patch.id, json: JSON.stringify(next), version: next.version })
        .onConflict((oc) => oc.column('id').doNothing())
        .executeTakeFirst();
      if (result.numInsertedOrUpdatedRows !== 1n)
        throw new HttpError(409, 'The note changed. Refresh before saving.');
    }
    return next;
  });
}
export async function publishCatalogue(value: unknown, expectedVersion: number) {
  const startedAt = new Date().toISOString(),
    runId = randomUUID(),
    db = database().db;
  try {
    const catalogue = CatalogueSchema.parse(value);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0)
      throw new HttpError(400, 'A current catalogue version is required.');
    if (catalogue.sources.some((s) => Date.parse(s.checkedAt) > Date.now() + 5 * 60 * 1000))
      throw new HttpError(400, 'A source-check time is in the future.');
    const published = await db.transaction().execute(async (trx) => {
      const prior = await trx
        .selectFrom('sd_catalogue')
        .selectAll()
        .where('id', '=', 1)
        .executeTakeFirst();
      if ((prior?.version || 0) !== expectedVersion)
        throw new HttpError(409, 'The catalogue changed. Re-read it before importing.');
      const json = JSON.stringify(catalogue);
      const unchanged = prior?.json === json;
      const publishedAt = unchanged ? prior.published_at! : new Date().toISOString(),
        version = unchanged ? prior.version : expectedVersion + 1;
      // Assets must exist before a catalogue can refer to them. Demo assets are
      // never accepted by a private installation.
      const assetIds = new Set([
        ...catalogue.documents.flatMap((d) => (d.original ? [d.original.sha256] : [])),
        ...catalogue.media.map((m) => m.assetId),
      ]);
      for (const assetId of assetIds) {
        const asset = await trx
          .selectFrom('sd_assets')
          .select('id')
          .where('id', '=', assetId)
          .executeTakeFirst();
        if (!asset)
          throw new HttpError(
            422,
            'Upload the original or media asset before importing: ' + assetId,
          );
      }
      if (!unchanged) {
        if (prior) {
          const result = await trx
            .updateTable('sd_catalogue')
            .set({ json, version, published_at: publishedAt })
            .where('id', '=', 1)
            .where('version', '=', expectedVersion)
            .executeTakeFirst();
          if (result.numUpdatedRows !== 1n)
            throw new HttpError(409, 'Another import completed first.');
        } else {
          const result = await trx
            .insertInto('sd_catalogue')
            .values({ id: 1, json, version, published_at: publishedAt })
            .onConflict((oc) => oc.column('id').doNothing())
            .executeTakeFirst();
          if (result.numInsertedOrUpdatedRows !== 1n)
            throw new HttpError(409, 'Another import completed first.');
        }
      }
      const run: ImportRun = {
        id: runId,
        status: unchanged ? 'unchanged' : 'published',
        startedAt,
        finishedAt: new Date().toISOString(),
        message: unchanged
          ? 'The imported content is unchanged.'
          : 'Validated content published. Family notes and completions were preserved.',
        version,
      };
      await trx
        .insertInto('sd_runs')
        .values({ id: runId, json: JSON.stringify(run), started_at: startedAt })
        .execute();
      return { catalogue, version, publishedAt, run };
    });
    return published;
  } catch (error) {
    const run: ImportRun = {
      id: runId,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      message:
        error instanceof HttpError
          ? error.message
          : 'Import validation failed. The last good catalogue was kept.',
      version: expectedVersion,
    };
    await db
      .insertInto('sd_runs')
      .values({ id: runId, json: JSON.stringify(run), started_at: startedAt })
      .execute();
    throw error;
  }
}
export const assetTypes = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
] as const;
export async function saveAsset(bytes: Buffer, mime: string, name: string) {
  if (bytes.length === 0 || bytes.length > 3 * 1024 * 1024)
    throw new HttpError(413, 'Upload a file between 1 byte and 3 MB.');
  if (!assetTypes.includes(mime as (typeof assetTypes)[number]))
    throw new HttpError(415, 'Use a PDF, plain text, PNG, JPEG, WebP, MP4 or WebM file.');
  const matches =
    mime === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-'
      : mime === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : mime === 'image/webp'
            ? bytes.subarray(0, 4).toString() === 'RIFF' &&
              bytes.subarray(8, 12).toString() === 'WEBP'
            : mime === 'video/mp4'
              ? bytes.subarray(4, 8).toString() === 'ftyp'
              : mime === 'video/webm'
                ? bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
                : !bytes.includes(0);
  if (!matches) throw new HttpError(415, 'The file contents do not match its type.');
  const id = createHash('sha256').update(bytes).digest('hex');
  await database()
    .db.insertInto('sd_assets')
    .values({ id, bytes, mime, name: name.replace(/[\r\n]/g, '').slice(0, 200) })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
  return { sha256: id, name, type: mime };
}
