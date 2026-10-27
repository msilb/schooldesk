import { z } from 'zod';

export const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/);
const text = z.string().trim().min(1).max(500);
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s + 'T12:00:00Z')) &&
      new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s,
    'Invalid date',
  );
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const timestamp = z.string().datetime({ offset: true });
const body = z.string().trim().min(1).max(60_000);
const sourceId = id;
const scope = z.string().max(80).optional();
export const ProfileSchema = z
  .object({
    title: text,
    school: text,
    className: text,
    childName: text,
    timezone: z.string().refine((t) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: t }).format();
        return true;
      } catch {
        return false;
      }
    }, 'Invalid timezone'),
    house: z.string().max(80).optional(),
    eveningHour: z.number().int().min(0).max(23).default(18),
    weekendDays: z.array(z.number().int().min(0).max(6)).min(1).max(6).default([0, 6]),
  })
  .strict();
export const EventSchema = z
  .object({
    id,
    title: text,
    date: isoDate,
    last: isoDate.optional(),
    start: time.optional(),
    end: time.optional(),
    kind: z.enum(['school', 'club', 'closure']),
    body,
    sourceId,
    childId: scope,
    documentIds: z.array(id).max(30).default([]),
  })
  .strict()
  .superRefine((e, c) => {
    if (e.last && e.last < e.date)
      c.addIssue({ code: 'custom', message: 'End date precedes start date' });
    if (e.last && Date.parse(e.last) - Date.parse(e.date) > 366 * 86400000)
      c.addIssue({ code: 'custom', message: 'Date range exceeds one year' });
    if (e.start && e.end && e.end <= e.start)
      c.addIssue({ code: 'custom', message: 'End time must follow start time' });
    if (e.kind === 'closure' && (e.start || e.end))
      c.addIssue({ code: 'custom', message: 'Closures use whole dates' });
  });
const SourceSchema = z
  .object({
    id,
    label: text,
    checkedAt: timestamp,
    kind: z.enum(['import', 'manual', 'connector']),
  })
  .strict();
export const DocumentSchema = z
  .object({
    id,
    title: text,
    category: text,
    body,
    sourceId,
    original: z
      .object({
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        name: text,
        type: z.enum(['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp']),
      })
      .strict()
      .optional(),
  })
  .strict();
const NoticeSchema = z
  .object({
    id,
    title: text,
    date: isoDate,
    body,
    sourceId,
    documentIds: z.array(id).max(30).default([]),
  })
  .strict();
const ActionSchema = z
  .object({
    id,
    title: text,
    body,
    revision: z.string().min(1).max(100),
    due: isoDate.optional(),
    sourceId,
  })
  .strict();
const MediaSchema = z
  .object({
    id,
    title: text,
    date: isoDate,
    kind: z.enum(['image', 'video']),
    assetId: id,
    sourceId,
  })
  .strict();
const RoutineSchema = z
  .object({ day: z.number().int().min(0).max(6), focus: z.string().max(500) })
  .strict();
export const CatalogueSchema = z
  .object({
    schemaVersion: z.literal(1),
    profile: ProfileSchema,
    sources: z.array(SourceSchema).max(100),
    events: z.array(EventSchema).max(3000),
    documents: z.array(DocumentSchema).max(500),
    notices: z.array(NoticeSchema).max(1000),
    actions: z.array(ActionSchema).max(500),
    media: z.array(MediaSchema).max(500),
    week: z.array(RoutineSchema).max(7),
  })
  .strict()
  .superRefine((data, c) => {
    for (const collection of [
      'sources',
      'events',
      'documents',
      'notices',
      'actions',
      'media',
    ] as const) {
      const seen = new Set<string>();
      for (const item of data[collection]) {
        if (seen.has(item.id))
          c.addIssue({ code: 'custom', path: [collection], message: 'Duplicate ID: ' + item.id });
        seen.add(item.id);
      }
    }
    const sources = new Set(data.sources.map((s) => s.id)),
      docs = new Set(data.documents.map((d) => d.id));
    for (const key of ['events', 'documents', 'notices', 'actions', 'media'] as const)
      for (const item of data[key]) {
        if (!sources.has(item.sourceId))
          c.addIssue({ code: 'custom', path: [key], message: 'Unknown source: ' + item.sourceId });
        if ('documentIds' in item)
          for (const ref of item.documentIds)
            if (!docs.has(ref))
              c.addIssue({ code: 'custom', path: [key], message: 'Unknown document: ' + ref });
      }
    const days = new Set<number>();
    for (const entry of data.week) {
      if (days.has(entry.day))
        c.addIssue({ code: 'custom', path: ['week'], message: 'Duplicate weekday' });
      days.add(entry.day);
    }
    const seenEvents = new Set<string>();
    for (const e of data.events) {
      const key = JSON.stringify([
        e.kind,
        e.date,
        e.start || '',
        e.title.toLowerCase().replace(/\s+/g, ' '),
      ]);
      if (seenEvents.has(key))
        c.addIssue({ code: 'custom', path: ['events'], message: 'Duplicate event: ' + e.title });
      seenEvents.add(key);
    }
  });
export type Catalogue = z.infer<typeof CatalogueSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type SchoolEvent = z.infer<typeof EventSchema>;
export type SchoolDocument = z.infer<typeof DocumentSchema>;
export type Action = Catalogue['actions'][number];
export type Notice = Catalogue['notices'][number];
export type Media = Catalogue['media'][number];
export type Note = {
  id: string;
  done: boolean;
  revision: string;
  note: string;
  version: number;
  updatedAt: string;
};
export type ImportRun = {
  id: string;
  status: 'published' | 'failed' | 'unchanged';
  startedAt: string;
  finishedAt: string;
  message: string;
  version: number;
};
export type Snapshot = { catalogue: Catalogue; version: number; publishedAt: string | null };
export type Access = { email: string; role: 'owner' | 'viewer' };
export const NotePatchSchema = z
  .object({
    id,
    done: z.boolean().optional(),
    note: z.string().max(5000).optional(),
    expectedVersion: z.number().int().min(0),
  })
  .strict()
  .refine((v) => v.done !== undefined || v.note !== undefined, 'Nothing to save');
