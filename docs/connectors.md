# Connector contract and scope

The first release has a prepared-file importer. There are no live ClassOwl,
Dropbox, email or AI connectors, and no background task is created.

A future connector should produce the same versioned catalogue contract and
keep school access separate from rendering and storage. Its own operator must
confirm permitted access with the school/platform before enabling it.

Minimum requirements:

1. Use the parent’s own authorized account and discover only their accessible
   children/classes. Do not share one parent’s credentials across families.
2. Restrict hosts and read-only paths. Never implement booking, registration,
   messaging, payments, cancellation or account changes as part of sync.
3. Encrypt retained school credentials/session data with a deployment-specific
   key. Never put them in the catalogue, URLs, browser bundles or logs. Provide
   disconnect and reconnection controls.
4. Observe request budgets, caching, incremental fingerprints, provider backoff
   and `Retry-After`. Stop on a block or login failure; do not bypass it.
5. Preserve stable item IDs and notes, follow provenance and merge duplicates.
   Check changed source facts before rewriting a prepared article. Keep the last
   good version of an individual item if a complex extraction cannot be reviewed.
6. Keep source-check time, publication time and attempted-run status distinct.
   Record actual coverage; an enabled schedule or cached page is not a fresh scan.
7. Use resumable stages and a single active run. Retry publication from a completed
   scan rather than crawling again. Do not automatically retry a login block.
8. Prefer provider-hosted media with short-lived access resolved on demand when
   permission and a safe integration permit it. Do not persist signed media URLs
   or turn the database into an unintended bulk media backup.
9. Use synthetic HTML/JSON fixtures in tests. Do not ship private source pages,
   school PDFs, child rosters, personal email or real media as examples.

Open-source code does not grant rights to redistribute school materials or
other children’s data. ClassOwl’s published terms include account secrecy,
authorized use and performance requirements. Permission for a third-party
connector has **not** been established by this project. Seek written
clarification and an official API/export route before a broader rollout.

Reference: [ClassOwl terms](https://classowl.com/terms/).
