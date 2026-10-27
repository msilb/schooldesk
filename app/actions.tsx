'use client';
import { useRef, useState } from 'react';
import { Check, ChevronDown, MessageSquare, Plus } from 'lucide-react';
import { dateLabel } from '@/lib/dates';
import type { Action, Note } from '@/lib/schema';
export default function ActionCard({
  action,
  note,
  save,
}: {
  action: Action;
  note?: Note;
  save: (patch: {
    id: string;
    done?: boolean;
    note?: string;
    expectedVersion: number;
  }) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    input = useRef<HTMLTextAreaElement>(null);
  const done = note?.done && note.revision === action.revision,
    changed = note?.done && note.revision !== action.revision;
  const change = async (patch: { done?: boolean; note?: string }) => {
    setBusy(true);
    try {
      return await save({ id: action.id, ...patch, expectedVersion: note?.version || 0 });
    } finally {
      setBusy(false);
    }
  };
  const edit = () => {
    setDraft(note?.note || '');
    setEditing(true);
    setExpanded(true);
    setTimeout(() => input.current?.focus(), 0);
  };
  return (
    <article
      className={'action-card' + (done ? ' is-done' : '')}
      data-dirty={editing && draft !== (note?.note || '')}
    >
      <div className="action-heading">
        <button
          className="checkbox"
          aria-label={(done ? 'Reopen ' : 'Complete ') + action.title}
          aria-pressed={!!done}
          disabled={busy}
          onClick={() => change({ done: !done })}
        >
          {done && <Check size={17} />}
        </button>
        <button
          className="action-title"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <small>
            {changed
              ? 'Updated since completion'
              : action.due
                ? dateLabel(action.due, { weekday: 'short', day: 'numeric', month: 'short' })
                : 'Family reminder'}
          </small>
          <b>{action.title}</b>
        </button>
        <button
          className="icon-button"
          aria-label="Action details"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={18} />
        </button>
      </div>
      {note?.note && (
        <div className="saved-note">
          <span>
            <MessageSquare size={14} />
            Family note
            <button className="text-button" onClick={edit}>
              Edit
            </button>
          </span>
          <p>{note.note}</p>
        </div>
      )}
      {expanded && (
        <div className="action-body">
          <p>{action.body}</p>
          {editing ? (
            <div className="note-editor">
              <label>
                Family note
                <textarea
                  ref={input}
                  value={draft}
                  maxLength={5000}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={busy}
                />
              </label>
              <small>Shared with your family. This does not make a school booking.</small>
              <div className="button-row">
                <button
                  className="button small"
                  disabled={busy || draft === (note?.note || '')}
                  onClick={async () => {
                    if (await change({ note: draft })) {
                      setEditing(false);
                      setDraft('');
                    }
                  }}
                >
                  {busy ? 'Saving…' : 'Save note'}
                </button>
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setDraft('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            !note?.note && (
              <button className="text-button" onClick={edit}>
                <Plus size={15} />
                Add family note
              </button>
            )
          )}
        </div>
      )}
    </article>
  );
}
