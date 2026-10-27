# Security and privacy

Schooldesk is an early self-hosted project, not an audited school information
system. Run one private deployment per family. Test the access boundary before
importing real information, use HTTPS, maintain backups and apply dependency
updates. A public repository does not make a private family deployment public.

- Accounts are provisioned only through the trusted server CLI. Public signup
  and reset-email routes are disabled. Better Auth owns passwords and sessions.
- Every protected API/file request verifies a session **and** current family
  membership. Identity headers from another hosting platform are not trusted.
- Viewer members can read and save shared notes; only owners can import/upload.
- Browser mutations require a matching origin. Auth endpoints use Better Auth’s
  own CSRF/origin checks and persistent database-backed rate limits.
  Login attempts share one per-path budget for the family installation; caller
  supplied forwarded IP headers cannot create new buckets. The library may log
  a notice about using this conservative shared bucket.
- The separate sync bearer cannot read or edit notes or create family accounts.
- Demo mode cannot open the private database and permits no server writes.
- Imported HTML is never executed. Private originals are not in `public/` and
  cannot be downloaded without authentication. Uploads have size/type checks.
- Catalogue and note version checks prevent silent concurrent overwrites.
- `.data/`, environment files and private imports are excluded from Git, Docker
  build context and Next.js file tracing. These exclusions are not a substitute
  for inspecting your own deployment package and secret handling.
- No analytics, email service, AI calls, school credentials or external media
  fetcher is included. Login telemetry is disabled.

Do not post private catalogues, credentials, logs containing personal data,
children’s names or real screenshots in GitHub issues. Use synthetic reproductions.
For a suspected vulnerability, use GitHub’s private vulnerability reporting
on this repository when enabled. Do not disclose an exploitable issue publicly.

First-release limits: no MFA/passkeys UI, no public password recovery, no automatic
school sync, no automated retention/deletion policy, no shared multi-family
hosting and a 3 MB per-file limit. Database operators can access their own stored
content. At-rest encryption and backups depend on the selected storage/host.
