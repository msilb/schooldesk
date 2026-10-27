# Architecture

Schooldesk is a standard Next.js App Router application with a React client UI.
It has no Sites build plugins, platform identity headers, connected-app bindings,
managed Git credentials, cloud-chat tasks or AI runtime dependency.

```text
Prepared catalogue JSON ──> validation ──> atomic publication ──> private dashboard
                                               │
                          SQLite / PostgreSQL ──┤
                                               ├── family notes (separate table)
                                               ├── invitation-only accounts/sessions
                                               ├── originals/media (private assets)
                                               └── import history
```

## Boundaries

- `lib/schema.ts`: the versioned data contract. Runtime validation is strict.
- `lib/dates.ts`: timezone-aware planning day, event and care-day logic.
- `lib/database.ts`: SQLite for a persistent machine/container or PostgreSQL for
  hosted deployments. Kysely makes application queries portable between both.
- `lib/auth.ts` and `lib/access.ts`: Better Auth sessions plus a family membership
  table. Authorization is checked on every page/API/file request. No incoming
  identity header is trusted as authentication.
- `lib/store.ts`: optimistic version checks, transactional publication, separate
  action notes, checksum-addressed private assets and recent attempts.
- `scripts/sync.ts`: optional transport for a prepared file; no school crawling.
- `lib/demo.ts` and `public/demo/`: authored fictional data and vector artwork.

One deployment is one family. There is one catalogue, one membership list, and
one private database. Do not turn this into a shared multi-family service by
merely adding a `familyId` field: tenant isolation, key management, authorization,
operational support and data lifecycle would need a separate design.

## Publication and notes

Catalogue imports never write the notes table. Stable action IDs keep notes
attached to the same action. An action revision changes only when its practical
meaning changes, so editorial corrections do not reopen completed work. A
changed revision marks an old completion as requiring another look, without
discarding its note. IDs and revisions must be supplied consistently by importers.

Notes have their own version counter. An edit based on an old version returns
409 instead of overwriting another parent’s changes. Catalogue imports similarly
require `expectedVersion` and use a conditional write inside a transaction.
Rejected imports preserve the last published catalogue and record a failed run.

## Privacy and cache behaviour

Only authored demo artwork and generic branding are in `public/`. Private files
are served through authenticated API routes, never a public object-store URL.
Private JSON/files use `Cache-Control: private, no-store`. The template has no
service worker or offline cache of private documents. Gallery preloading is
limited to adjacent images. The app checks a source build ID on foregrounding
and periodically; it postpones reload while an input, draft or playing video
needs attention.

Demo mode never opens private storage, even if database credentials happen to be
configured. Server writes and private auth are disabled. Demo notes use a
separate browser-local key; private family notes never use that key.
