# Importing your school information

The app renders one prepared version of each item. It does not show raw
extraction, a second summary and an original notice simultaneously. Originals
are optional private downloads attached to the same web guide.

Copy `examples/catalogue.json` into the ignored `private/` directory. Replace
the fictional profile and content with information you are entitled to store.
Do not put real catalogues, documents or child information into a Git repository.

The complete runtime contract is `lib/schema.ts`. Unknown fields are rejected.

## Profile

Configure the school, child, class, house (optional), IANA timezone, evening
planning cutoff (0–23) and weekend days (0=Sunday, 6=Saturday). After the cutoff,
the overview advances to the next non-weekend day. A school closure remains
visible on that day because care planning matters.

The first release presents one selected child. Multiple independent children
in one deployment would need an explicit child selector and scoped views;
adding arbitrary child IDs to imports alone does not provide that experience.

## Content

- `sources`: stable ID, human label, actual `checkedAt` time, and kind. A source
  timestamp describes when it was checked, not when the catalogue was uploaded.
- `events`: stable ID, title, date, optional last date/time, kind (`school`, `club`
  or `closure`), concise body, source ID and optional attached document IDs.
  Supply actual club sessions rather than assuming weekly attendance forever.
- `documents`: one prepared web body, category, source ID and optional original.
- `notices`: one concise version of a class update with optional document IDs.
- `actions`: stable ID, practical instructions, optional due date, source ID and
  a material revision. Keep the revision for editorial changes; change it when
  a completed action really needs attention again.
- `week`: regular focus by weekday, with no guessed club dates.
- `media`: an image/video ID, title, date, source ID and private uploaded asset ID.

Bodies support paragraphs, headings, bullet/numbered lists, bold, inline code
and simple tables. Raw HTML is escaped. Remote images, embedded HTML and links
inside bodies are not fetched or executed. This constrained renderer avoids
arbitrary code and broken imported layouts.

Read the original before preparing an item. Keep useful instructions and exact
dates/times. Resolve contradictions with the source or leave the disputed item
out until clarified. The importer checks structure and references; it **cannot
verify facts or certify an extraction’s visual quality**. It does not pretend
that a schema pass is a source review.

## Originals and media

An owner can upload a file in Updates & settings. Copy its returned checksum,
name and MIME type into a document’s `original` object. For gallery media, use
the returned checksum as `assetId`. Upload first, then import; missing assets
cause the import to fail. Files are stored in the family database and served
only after a membership check. Supported originals: PDF, text, PNG, JPEG and
WebP. Media adds MP4 and WebM. The server validates signatures for binary types.

The first release limits each file to 3 MB. It has no external-media proxy,
ClassOwl signed-URL storage, bulk downloader or large-video archive. Keep larger
originals in your existing private archive until a reviewed connector exists.
This template does not copy originals out of another family’s archive.

## Import and independent sync

Local database import:

```sh
npm run import -- private/catalogue.json
```

Remote import (settings remain in your ignored environment file):

```sh
# SCHOOLDESK_SYNC_URL=https://your-schooldesk.example
# SCHOOLDESK_SYNC_TOKEN=<the deployment's random sync token>
npm run sync -- private/catalogue.json
```

The command reads the current version, sends the candidate and verifies the
published readback. It neither touches notes nor installs a scheduler. Identical
imports are recorded as unchanged. A conflicting concurrent publication returns
409 so the caller can re-read and reconcile, rather than blindly overwrite.

The browser import uses the same version check and requires owner access. The
service bearer is limited to catalogue read/import and asset upload; it cannot
read or edit family notes or administer accounts. Keep it out of command-line
arguments, Git, public issue reports and URLs. Remote transport refuses redirects
so a different host cannot receive the bearer.
