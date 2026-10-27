# Hosting

## Local development

Use Node 22.13+ and `npm ci`. `npm run demo` is a public fictional preview on
port 3210. For real data, use `npm run setup`, then `npm run dev` on port 3000.
No third-party account or hosted authentication service is needed.

Setup writes a mode-0600 `.env.local` with random secrets and creates a private
SQLite database. Keep `.env.local`, `.data/` and `private/` out of Git and out of
public backups. Before an internet deployment, set the real HTTPS origin in
`BETTER_AUTH_URL`. Never use your school-platform password as your dashboard
password.

## Container

```sh
docker build -t schooldesk .
docker run --rm -it --env-file .env.local -v schooldesk-data:/app/.data schooldesk npm run setup
docker run --rm --env-file .env.local -p 3000:3000 -v schooldesk-data:/app/.data schooldesk
```

Run `setup` once. The image defaults to private mode and contains no configured
accounts or secrets. It runs as the `node` user. A named volume is initialized
with the image’s directory ownership; for a bind mount, ensure the mounted path
is writable by container UID 1000. Put a TLS reverse proxy in front of it and
set `BETTER_AUTH_URL=https://your-domain.example`. Only the trusted proxy should
reach the container. If testing a production build over local HTTP, explicitly
set `SCHOOLDESK_ALLOW_HTTP=true`.

For a containerized demo, set only `SCHOOLDESK_MODE=demo`. Do not connect a family
volume or copy private files into the image.

## Vercel demo

Import the GitHub repository as a **Next.js** project. Set
`SCHOOLDESK_MODE=demo` in its environment and deploy. No auth secrets, private
catalogue or database are needed. Every visitor sees the fictional fixtures;
notes stay on that visitor’s device. Do not use demo mode for real family data.

## Private Vercel deployment

1. Create a separate project from the repository. Keep `SCHOOLDESK_MODE=private`.
2. Provide a persistent PostgreSQL database you control. Pick an appropriate
   region and verify the provider’s current free-plan terms, retention and limits.
   The repository provisions no infrastructure and assumes no specific vendor.
3. Set these server environment variables:
   - `DATABASE_URL`: the database’s PostgreSQL connection string.
   - `BETTER_AUTH_SECRET`: at least 32 cryptographically random characters.
   - `BETTER_AUTH_URL`: this installation’s exact HTTPS origin.
   - `SCHOOLDESK_SYNC_TOKEN`: an independent random token, if using remote import.
4. In a trusted local checkout, load those **same** database/auth settings in the
   ignored `.env.local`. Run `npm run db:migrate`, then `npm run member:add` to
   create the owner. Database CLI operations use TLS as specified by your
   connection string; the application does not disable certificate verification.
5. Deploy using the regular Next.js build. The build itself does not read private
   records or need database access. SQLite is explicitly refused on Vercel.
6. Verify the anonymous checks below before importing any real information.

Vercel’s free Hobby plan is for personal, non-commercial use. Its current free
cron offering runs daily with imprecise timing and functions have bounded
durations. The template installs no cron job. An actual school connector needs
a budgeted, resumable implementation; it cannot be made reliable merely by
putting a long crawl in one function.

Official references: [Hobby](https://vercel.com/docs/plans/hobby),
[cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[function limits](https://vercel.com/docs/functions/limitations).

## Verify access before adding real information

In a signed-out browser, `/` must redirect to `/sign-in`. `/api/snapshot`,
`/api/notes` and `/api/assets/<id>` must reject anonymous access. Invented
`oai-authenticated-user-*` headers confer no access. Public signup is disabled.
After signing in as a viewer, browsing and notes work but import/upload do not.
Removing a member with the CLI must revoke access in their existing session.

## Account recovery

There is intentionally no public password-reset email flow or mail provider.
From a trusted server CLI, create a temporary new **owner** with
`npm run member:add`, using a different email. Sign in, verify access, then
remove the lost owner’s membership with `npm run member:remove`. At least one
owner must remain. Do not hand-edit password hashes or expose the setup CLI as
a public endpoint. A removed email remains in the authentication database and
cannot currently be re-added using the simple add command; use a new account.

## Backups and upgrades

Back up the private database and environment secrets separately. With SQLite,
use SQLite’s online backup facility or stop the application before copying the
database; copying a live WAL database file alone is not a consistent backup.
With PostgreSQL, use your database provider’s backup/export tools. Test restores.

Before upgrading, back up, install with `npm ci`, run `npm run db:migrate`, run
tests and build, then deploy. Preserve secrets, database and stable content IDs.
There is no automatic upstream code update; review releases before deploying.
