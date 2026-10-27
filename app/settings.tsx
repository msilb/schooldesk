'use client';
import { useRef, useState } from 'react';
import {
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  FileJson,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { Access, ImportRun, Snapshot } from '@/lib/schema';
import { CatalogueSchema } from '@/lib/schema';
export default function Settings({
  snapshot,
  runs,
  demo,
  access,
  reload,
  notify,
}: {
  snapshot: Snapshot;
  runs: ImportRun[];
  demo: boolean;
  access: Access | null;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [upload, setUpload] = useState('');
  const importInput = useRef<HTMLInputElement>(null),
    assetInput = useRef<HTMLInputElement>(null);
  const when = (value: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: snapshot.catalogue.profile.timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  const importFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('The import is too large. Maximum 2 MB.');
      const checked = CatalogueSchema.safeParse(JSON.parse(await file.text()));
      if (!checked.success)
        throw new Error(
          checked.error.issues
            .slice(0, 4)
            .map((i) => i.path.join('.') + ': ' + i.message)
            .join('\n'),
        );
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogue: checked.data, expectedVersion: snapshot.version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed.');
      await reload();
      notify(result.run.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
      if (importInput.current) importInput.current.value = '';
    }
  };
  const uploadFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      if (file.size > 3 * 1024 * 1024) throw new Error('The file is too large. Maximum 3 MB.');
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed.');
      setUpload(JSON.stringify(result, null, 2));
      notify('Original uploaded privately. Add its reference to your import.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (assetInput.current) assetInput.current.value = '';
    }
  };
  return (
    <div className="settings-stack">
      <section className="panel settings-card">
        <div className="section-title">
          <RefreshCw size={21} />
          <h2>Updates, at a glance</h2>
        </div>
        <dl className="status-list">
          <div>
            <dt>Latest publication</dt>
            <dd>
              {snapshot.publishedAt
                ? when(snapshot.publishedAt)
                : demo
                  ? 'Fictional demonstration'
                  : 'No content imported yet'}
            </dd>
          </div>
          <div>
            <dt>Catalogue version</dt>
            <dd>{snapshot.version}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{snapshot.catalogue.profile.timezone}</dd>
          </div>
          <div>
            <dt>Automatic sync</dt>
            <dd>Not configured in this template</dd>
          </div>
        </dl>
        <p className="muted">
          Imports are validated before publication. A failed import keeps the last good catalogue.
          Family notes are stored separately.
        </p>
      </section>
      <section className="panel settings-card">
        <div className="section-title">
          <ShieldCheck size={21} />
          <h2>{demo ? 'A fictional preview' : 'Your family’s private space'}</h2>
        </div>
        <p>
          {demo
            ? 'Every name, school, event and illustration in this demo is fictional. Try the calendar and notes; demo notes stay in this browser.'
            : 'Only provisioned family accounts can open this school desk. Members and passwords are managed with the server CLI; public registration is disabled.'}
        </p>
        {!demo && (
          <p className="member-status">
            <LockKeyhole size={15} />
            {access?.email}
            <span className="badge">{access?.role}</span>
          </p>
        )}
      </section>
      <section className="panel settings-card">
        <div className="section-title">
          <Database size={21} />
          <h2>Information sources</h2>
        </div>
        {snapshot.catalogue.sources.length ? (
          <div className="source-rows">
            {snapshot.catalogue.sources.map((source) => (
              <div key={source.id}>
                <span>
                  <b>{source.label}</b>
                  <small>
                    {source.kind === 'manual'
                      ? 'Manually prepared'
                      : source.kind === 'import'
                        ? 'Imported source'
                        : 'Connected source'}
                  </small>
                </span>
                <span>Checked {when(source.checkedAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No sources yet. Import a catalogue to get started.</p>
        )}
        <p className="muted">
          The template makes no school bookings or account changes. ClassOwl login and email access
          are not included.
        </p>
      </section>
      {access?.role === 'owner' && !demo && (
        <section className="panel settings-card">
          <div className="section-title">
            <ArrowUpFromLine size={21} />
            <h2>Import your information</h2>
          </div>
          <p>
            Upload a prepared catalogue JSON file. It replaces school content while preserving your
            family’s notes and completions.
          </p>
          <div className="button-row">
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
              }}
            />
            <button
              className="button small"
              disabled={busy}
              onClick={() => importInput.current?.click()}
            >
              <FileJson size={17} />
              {busy ? 'Working…' : 'Import catalogue'}
            </button>
            <input
              ref={assetInput}
              type="file"
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.mp4,.webm"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />
            <button
              className="button small secondary"
              disabled={busy}
              onClick={() => assetInput.current?.click()}
            >
              Upload original or media
            </button>
          </div>
          <small className="muted">
            Originals and media: up to 3 MB each. Larger media require a future storage connector.
          </small>
          {upload && (
            <details className="upload-reference" open>
              <summary>Reference for your catalogue</summary>
              <pre>{upload}</pre>
            </details>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}
      <section className="panel settings-card">
        <div className="section-title">
          <CheckCircle2 size={21} />
          <h2>Recent import attempts</h2>
        </div>
        {runs.length ? (
          <ol className="run-list">
            {runs.map((run) => (
              <li key={run.id}>
                <span className={'run-status ' + run.status} />
                <div>
                  <b>{run.message}</b>
                  <small>
                    {when(run.finishedAt)} · {run.status} · version {run.version}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            {demo
              ? 'The live import history appears here in a private installation.'
              : 'No import has run yet.'}
          </p>
        )}
      </section>
    </div>
  );
}
