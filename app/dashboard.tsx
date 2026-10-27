'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileText,
  FolderOpen,
  Heart,
  Home,
  Image as ImageIcon,
  Leaf,
  ListChecks,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Music,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import type {
  Access,
  Action,
  Catalogue,
  ImportRun,
  Note,
  Notice,
  SchoolDocument,
  SchoolEvent,
  Snapshot,
} from '@/lib/schema';
import {
  dateLabel,
  eventsOn,
  localDay,
  planningDay,
  shiftDay,
  upcomingCareDays,
  weekday,
} from '@/lib/dates';
import ActionCard from './actions';
import Calendar, { EventRow } from './calendar';
import Dialog from './dialog';
import Markdown from './markdown';
import MediaGallery from './media-gallery';
import Settings from './settings';

type View = 'overview' | 'actions' | 'calendar' | 'library' | 'classroom' | 'settings';
type Detail = {
  title: string;
  body: string;
  date?: string;
  kind?: string;
  documentIds?: string[];
  original?: SchoolDocument['original'];
};
const links = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'actions', label: 'Action list', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'library', label: 'Guides & documents', icon: FolderOpen },
  { id: 'classroom', label: 'Classroom', icon: ImageIcon },
] as const;
const demoNotesKey = 'schooldesk.demo.notes.v1';
export default function Dashboard({
  initial,
  initialNotes,
  initialRuns,
  mode,
  access,
}: {
  initial: Snapshot;
  initialNotes: Note[];
  initialRuns: ImportRun[];
  mode: 'demo' | 'private';
  access: Access | null;
}) {
  const [snapshot, setSnapshot] = useState(initial),
    [notes, setNotes] = useState(initialNotes),
    [runs, setRuns] = useState(initialRuns);
  const [view, setView] = useState<View>('overview'),
    [mobile, setMobile] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(''),
    [detail, setDetail] = useState<Detail | null>(null),
    [toast, setToast] = useState(''),
    [filter, setFilter] = useState('all'),
    [classroomTab, setClassroomTab] = useState('stories'),
    [clock, setClock] = useState(() => new Date()),
    [updateReady, setUpdateReady] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    demo = mode === 'demo';
  const { catalogue: data } = snapshot,
    profile = data.profile;
  const today = localDay(clock, profile.timezone),
    planned = planningDay(clock, profile);
  const noteMap = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);
  const done = useCallback(
    (action: Action) => {
      const note = noteMap.get(action.id);
      return !!note?.done && note.revision === action.revision;
    },
    [noteMap],
  );
  const openActions = data.actions.filter((a) => !done(a));
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 6000);
  }, []);
  const reload = useCallback(async () => {
    if (demo) return;
    if (document.querySelector('[data-dirty="true"]')) return;
    const response = await fetch('/api/snapshot', { cache: 'no-store' });
    if (response.status === 401) {
      location.assign('/sign-in');
      return;
    }
    if (!response.ok) throw new Error('Unable to refresh.');
    const result = await response.json();
    setSnapshot(result.snapshot);
    if (!demo) setNotes(result.notes);
    setRuns(result.runs);
  }, [demo]);
  useEffect(() => {
    const views = new Set(['overview', 'actions', 'calendar', 'library', 'classroom', 'settings']);
    const hash = () => {
      const value = location.hash.slice(1);
      if (views.has(value)) setView(value as View);
    };
    hash();
    window.addEventListener('hashchange', hash);
    if (demo) {
      try {
        const stored = JSON.parse(localStorage.getItem(demoNotesKey) || '[]');
        if (Array.isArray(stored))
          setNotes(
            stored.filter(
              (n) =>
                typeof n.id === 'string' &&
                typeof n.note === 'string' &&
                typeof n.done === 'boolean' &&
                typeof n.version === 'number',
            ),
          );
      } catch {
        /* Browser storage is optional in the demo. */
      }
    }
    const refresh = () => {
      setClock(new Date());
      if (!document.hidden) void reload().catch(() => {});
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('hashchange', hash);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [demo, reload]);
  useEffect(() => {
    if (demo) return;
    const check = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        if (!r.ok) return;
        const { build } = await r.json();
        if (build && build !== process.env.NEXT_PUBLIC_BUILD_ID) {
          if (
            document.querySelector('[data-dirty="true"]') ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '') ||
            [...document.querySelectorAll('video')].some((video) => !video.paused)
          )
            setUpdateReady(true);
          else location.reload();
        }
      } catch {
        /* Retry when online again. */
      }
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 60000);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      clearInterval(timer);
    };
  }, [demo]);
  useEffect(() => {
    if (!mobile) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [mobile]);
  const go = (next: View) => {
    setView(next);
    setMobile(false);
    setSearchOpen(false);
    setQuery('');
    setFilter('all');
    location.hash = next;
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const save = async (patch: {
    id: string;
    done?: boolean;
    note?: string;
    expectedVersion: number;
  }) => {
    try {
      let next: Note;
      if (demo) {
        const old = noteMap.get(patch.id),
          action = data.actions.find((a) => a.id === patch.id)!;
        next = {
          id: patch.id,
          done: patch.done ?? old?.done ?? false,
          revision: patch.done === undefined ? old?.revision || action.revision : action.revision,
          note: patch.note?.trim() ?? old?.note ?? '',
          version: (old?.version || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      } else {
        const response = await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save this note.');
        next = result;
      }
      if (demo)
        localStorage.setItem(
          demoNotesKey,
          JSON.stringify([...notes.filter((n) => n.id !== next.id), next]),
        );
      setNotes((previous) => [...previous.filter((n) => n.id !== next.id), next]);
      notify(
        patch.note !== undefined
          ? 'Family note saved.'
          : next.done
            ? 'Marked as done.'
            : 'Action reopened.',
      );
      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save.');
      return false;
    }
  };
  const openEvent = (event: SchoolEvent) =>
    setDetail({
      title: event.title,
      body: event.body,
      date:
        dateLabel(event.date, { weekday: 'long', day: 'numeric', month: 'long' }) +
        (event.start ? ' · ' + event.start + (event.end ? '–' + event.end : '') : ''),
      kind:
        event.kind === 'club' ? 'Club' : event.kind === 'closure' ? 'Off school' : 'School event',
      documentIds: event.documentIds,
    });
  const openDocument = (doc: SchoolDocument) =>
    setDetail({ title: doc.title, body: doc.body, kind: doc.category, original: doc.original });
  const openNotice = (notice: Notice) =>
    setDetail({
      title: notice.title,
      body: notice.body,
      date: dateLabel(notice.date),
      kind: 'Class note',
      documentIds: notice.documentIds,
    });
  const agenda = eventsOn(data.events, planned, profile),
    off = agenda.some((e) => e.kind === 'closure'),
    focus = data.week.find((day) => day.day === weekday(planned))?.focus;
  const coming = data.events
    .filter((e) => e.kind !== 'club' && (e.last || e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const care = upcomingCareDays(data.events, today, profile);
  const labels = {
    overview: profile.childName + '’s school day',
    actions: 'A little planning ahead',
    calendar: 'Calendar & clubs',
    library: 'Everything, in its place',
    classroom: 'Life in the classroom',
    settings: 'Updates & settings',
  };
  const categories = [...new Set(data.documents.map((d) => d.category))];
  const docs = data.documents.filter(
    (d) =>
      (filter === 'all' || d.category === filter) &&
      (d.title + ' ' + d.body).toLowerCase().includes(query.toLowerCase()),
  );
  const searchResults = query.trim()
    ? [
        ...data.documents
          .filter((d) => (d.title + ' ' + d.body).toLowerCase().includes(query.toLowerCase()))
          .map((d) => ({
            id: 'doc-' + d.id,
            title: d.title,
            kind: d.category,
            open: () => openDocument(d),
          })),
        ...data.events
          .filter((e) => (e.title + ' ' + e.body).toLowerCase().includes(query.toLowerCase()))
          .map((e) => ({
            id: 'event-' + e.id,
            title: e.title,
            kind: dateLabel(e.date),
            open: () => openEvent(e),
          })),
        ...data.notices
          .filter((n) => (n.title + ' ' + n.body).toLowerCase().includes(query.toLowerCase()))
          .map((n) => ({
            id: 'notice-' + n.id,
            title: n.title,
            kind: 'Class note',
            open: () => openNotice(n),
          })),
      ].slice(0, 12)
    : [];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside
        className={'sidebar' + (mobile ? ' mobile-open' : '')}
        aria-label="School desk navigation"
      >
        <button
          className="icon-button close-menu"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <button className="brand" onClick={() => go('overview')}>
          <span className="logo">
            <BookOpen size={24} />
          </span>
          <span>
            Schooldesk<small>A calmer school day</small>
          </span>
        </button>
        <div className="family-badge">
          <span className="leaf-icon">
            <Leaf size={19} />
          </span>
          <div>
            <b>{profile.childName}</b>
            <small>{profile.className}</small>
          </div>
        </div>
        <span className="nav-label">YOUR SCHOOL DAYS</span>
        <nav>
          {links.map(({ id, label, icon: Icon }) => (
            <a
              href={'#' + id}
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(id);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === 'actions' && openActions.length > 0 && (
                <b className="nav-count">{openActions.length}</b>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={17} />
            <span>
              {demo ? 'Made for families' : 'Just for your family'}
              <small>{demo ? 'Fictional demonstration' : 'Private, signed-in access'}</small>
            </span>
          </div>
          <a
            href="#settings"
            className={'settings-link' + (view === 'settings' ? ' active' : '')}
            onClick={(e) => {
              e.preventDefault();
              go('settings');
            }}
          >
            <SettingsIcon size={17} />
            <span>Updates & settings</span>
            <ChevronRight size={16} />
          </a>
          {!demo && (
            <button
              className="sign-out"
              onClick={async () => {
                await fetch('/api/auth/sign-out', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: '{}',
                });
                location.assign('/sign-in');
              }}
            >
              <LogOut size={15} />
              Sign out
            </button>
          )}
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => go('overview')}>
            <span className="logo">
              <BookOpen size={22} />
            </span>
            <span>
              {profile.childName}
              <small>{profile.className}</small>
            </span>
          </button>
          <span className="breadcrumb">
            Schooldesk
            <ChevronRight size={14} />
            {links.find((l) => l.id === view)?.label || 'Updates & settings'}
          </span>
          <div className={'search-wrap' + (searchOpen ? ' search-open' : '')}>
            <label className="search">
              <Search size={18} />
              <input
                ref={searchInput}
                type="search"
                aria-label="Search school information"
                placeholder="Find something…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {query.trim() && view !== 'library' && (
              <div className="search-results">
                <div className="search-heading">
                  <span>School information</span>
                  <button
                    className="icon-button"
                    aria-label="Close search"
                    onClick={() => setQuery('')}
                  >
                    <X size={17} />
                  </button>
                </div>
                {searchResults.length ? (
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        r.open();
                        setQuery('');
                      }}
                    >
                      <FileText size={16} />
                      <span>
                        <b>{r.title}</b>
                        <small>{r.kind}</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))
                ) : (
                  <p>No matching information.</p>
                )}
              </div>
            )}
          </div>
          <ThemeButton />
          <button
            className="icon-button mobile-search-toggle"
            aria-label={searchOpen ? 'Close search' : 'Search school information'}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setQuery('');
            }}
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <button
            className="icon-button menu-toggle"
            aria-label="Open navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
        </header>
        <main id="main">
          {demo && (
            <div className="demo-banner">
              <span>
                <Leaf size={15} />A fictional school desk. Explore freely.
              </span>
              <a
                href="https://github.com/msilb/schooldesk"
                target="_blank"
                rel="noopener noreferrer"
              >
                Make it yours
                <ArrowRight size={14} />
              </a>
            </div>
          )}
          {updateReady && (
            <div className="update-banner">
              A new version is ready. Save any notes, then{' '}
              <button onClick={() => location.reload()}>refresh the app</button>.
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {profile.school} <span>/</span> {profile.className}
              </span>
              <h1>{labels[view]}</h1>
              {view !== 'overview' && (
                <p>
                  {
                    {
                      actions: 'Decisions, reminders and your family’s plan.',
                      calendar: 'School events, clubs and days off. All together.',
                      library: 'Practical guides and useful documents, without the hunt.',
                      classroom: 'Small discoveries. Lovely memories.',
                      settings: 'Your sources, import history and family access.',
                    }[view]
                  }
                </p>
              )}
            </div>
            <span className="day-stamp">
              {dateLabel(today, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          {view === 'overview' && (
            <>
              <div className="overview-grid">
                <section className="day-card">
                  <div className="day-card-heading">
                    <span className="eyebrow">
                      {planned === today ? 'TODAY' : 'LOOKING AHEAD'} · {dateLabel(planned)}
                      {profile.house ? ' · ' + profile.house : ''}
                    </span>
                    <span className="day-leaf">
                      <Leaf size={32} />
                    </span>
                  </div>
                  <h2>
                    {dateLabel(planned, { weekday: 'long' })}
                    {off ? ' off school' : ' at ' + profile.school}
                  </h2>
                  {focus && !off && <p className="day-focus">{focus}</p>}
                  {agenda.length ? (
                    <div className="day-agenda">
                      {agenda.map((event) => (
                        <button key={event.id} onClick={() => openEvent(event)}>
                          <span className={'agenda-icon ' + event.kind}>
                            {event.kind === 'club' ? (
                              <Music size={20} />
                            ) : event.kind === 'closure' ? (
                              <Sun size={20} />
                            ) : (
                              <CalendarDays size={20} />
                            )}
                          </span>
                          <span>
                            <b>{event.title}</b>
                            <small>
                              {event.start
                                ? event.start + (event.end ? '–' + event.end : '')
                                : event.kind === 'closure'
                                  ? 'Plan care for this day'
                                  : 'All day'}
                            </small>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    (!focus || off) && (
                      <p className="day-focus">
                        {data.sources.length
                          ? 'A regular school day.'
                          : 'Import your school information to fill your day.'}
                      </p>
                    )
                  )}
                  {openActions
                    .filter(
                      (a) =>
                        a.due === planned &&
                        !agenda.some((e) => e.title.toLowerCase().includes(a.title.toLowerCase())),
                    )
                    .map((action) => (
                      <button
                        className="day-reminder"
                        key={action.id}
                        onClick={() => go('actions')}
                      >
                        <ListChecks size={17} />
                        {action.title}
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  <button className="day-calendar-link" onClick={() => go('calendar')}>
                    Calendar & clubs
                    <ArrowRight size={18} />
                  </button>
                </section>
                <aside className="overview-aside">
                  <div className="section-head">
                    <h2>A little to remember</h2>
                    <button className="text-button" onClick={() => go('actions')}>
                      All actions
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  {openActions.length ? (
                    <div className="action-stack">
                      {openActions.slice(0, 3).map((action) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          note={noteMap.get(action.id)}
                          save={save}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="panel all-clear">
                      <CheckCircle2 size={28} />
                      <h3>All caught up</h3>
                      <p>No open actions for your family.</p>
                    </div>
                  )}
                  <div className="care-peek">
                    <Heart size={20} />
                    <div>
                      <b>
                        {care.length
                          ? dateLabel(care[0].date, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Care planning'}
                      </b>
                      <p>
                        {care.length ? care[0].title : 'Upcoming weekdays off school appear here.'}
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Open care planning"
                      onClick={() => {
                        setDetail({
                          title: 'Weekdays off school',
                          kind: 'Care planning',
                          body: care.length
                            ? care
                                .map(
                                  (c) =>
                                    '- **' +
                                    dateLabel(c.date, {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                    }) +
                                    '** · ' +
                                    c.title,
                                )
                                .join('\n')
                            : 'No upcoming weekdays off school are in the current catalogue.',
                        });
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </aside>
              </div>
              <section className="week-strip" aria-label="This school week">
                {[1, 2, 3, 4, 5].map((offset) => {
                  const monday = shiftDay(planned, -((weekday(planned) + 6) % 7)),
                    date = shiftDay(monday, offset - 1),
                    day = data.week.find((d) => d.day === offset),
                    events = eventsOn(data.events, date, profile);
                  return (
                    <button
                      key={date}
                      className={date === planned ? 'selected' : ''}
                      onClick={() =>
                        setDetail({
                          title: dateLabel(date, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          }),
                          kind: 'School day',
                          body:
                            [
                              day?.focus,
                              ...events.map(
                                (e) =>
                                  '## ' +
                                  e.title +
                                  '\n' +
                                  (e.start ? e.start + (e.end ? '–' + e.end : '') + '\n\n' : '') +
                                  e.body,
                              ),
                            ]
                              .filter(Boolean)
                              .join('\n\n') || 'No additional plans for this day.',
                        })
                      }
                    >
                      <span>
                        {dateLabel(date, { weekday: 'short' })}
                        <small>{Number(date.slice(-2))}</small>
                      </span>
                      <b>{day?.focus.split(' · ')[0] || 'School day'}</b>
                      <small>
                        {events
                          .filter((e) => e.kind === 'club')
                          .map((e) => e.title)
                          .join(' · ') ||
                          events[0]?.title ||
                          'Regular rhythm'}
                      </small>
                    </button>
                  );
                })}
              </section>
              <div className="lower-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>On the horizon</h2>
                    <button className="text-button" onClick={() => go('calendar')}>
                      Calendar
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {coming.length ? (
                    coming.map((event) => (
                      <EventRow key={event.id} event={event} open={() => openEvent(event)} />
                    ))
                  ) : (
                    <p className="panel-empty">No upcoming school events.</p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>From the classroom</h2>
                    <button className="text-button" onClick={() => go('classroom')}>
                      All notes
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {data.notices
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 3)
                    .map((notice) => (
                      <button
                        className="notice-short"
                        key={notice.id}
                        onClick={() => openNotice(notice)}
                      >
                        <span>{dateLabel(notice.date)}</span>
                        <b>{notice.title}</b>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!data.notices.length && (
                    <p className="panel-empty">Class notes will appear here.</p>
                  )}
                </section>
              </div>
            </>
          )}
          {view === 'actions' && (
            <>
              <div className="section-tools">
                <div className="segmented" role="group" aria-label="Action status">
                  {['all', 'open', 'done'].map((value) => (
                    <button
                      key={value}
                      className={filter === value ? 'selected' : ''}
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all' ? 'All actions' : value === 'open' ? 'To do' : 'Done'}
                    </button>
                  ))}
                </div>
                <span className="muted">
                  <ShieldCheck size={14} />
                  Notes stay with your family
                </span>
              </div>
              <div className="action-stack full-actions">
                {data.actions
                  .filter((a) => filter === 'all' || (filter === 'done' ? done(a) : !done(a)))
                  .map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      note={noteMap.get(action.id)}
                      save={save}
                    />
                  ))}
                {!data.actions.length && (
                  <Empty title="A fresh start" text="Imported reminders will appear here." />
                )}
              </div>
            </>
          )}
          {view === 'calendar' && <Calendar catalogue={data} today={today} open={openEvent} />}
          {view === 'library' && (
            <>
              <div className="section-tools library-tools">
                <div
                  className="segmented scroll-segments"
                  role="group"
                  aria-label="Document categories"
                >
                  {['all', ...categories].map((category) => (
                    <button
                      key={category}
                      className={filter === category ? 'selected' : ''}
                      aria-pressed={filter === category}
                      onClick={() => setFilter(category)}
                    >
                      {category === 'all' ? 'All guides' : category}
                    </button>
                  ))}
                </div>
              </div>
              <div className="library-grid">
                {docs.map((doc) => (
                  <button className="document-card" key={doc.id} onClick={() => openDocument(doc)}>
                    <span className="document-icon">
                      <FileText size={25} />
                    </span>
                    <span className="eyebrow">{doc.category}</span>
                    <h2>{doc.title}</h2>
                    <p>
                      {doc.body
                        .split('\n')
                        .filter((line) => line.trim() && !/^(?:#|\|)/.test(line.trim()))
                        .join(' ')
                        .replace(/^[-*] /, '')
                        .slice(0, 100)}
                    </p>
                    <span className="text-button">
                      Open guide
                      <ArrowRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              {!docs.length && (
                <Empty
                  title="No matching guides"
                  text="Try another category or import a school document."
                />
              )}
            </>
          )}
          {view === 'classroom' && (
            <>
              <div className="section-tools">
                <div className="segmented" role="group" aria-label="Classroom section">
                  {['stories', 'gallery'].map((tab) => (
                    <button
                      key={tab}
                      className={classroomTab === tab ? 'selected' : ''}
                      aria-pressed={classroomTab === tab}
                      onClick={() => setClassroomTab(tab)}
                    >
                      {tab === 'stories' ? 'Class notes' : 'Photos & videos'}
                    </button>
                  ))}
                </div>
              </div>
              {classroomTab === 'gallery' ? (
                <MediaGallery items={data.media} demo={demo} />
              ) : (
                <div className="notice-grid">
                  {data.notices
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((notice) => (
                      <button
                        className="notice-card"
                        key={notice.id}
                        onClick={() => openNotice(notice)}
                      >
                        <span className="eyebrow">{dateLabel(notice.date)}</span>
                        <h2>{notice.title}</h2>
                        <p>{notice.body.split('\n')[0].slice(0, 180)}</p>
                        <span className="text-button">
                          Read class note
                          <ArrowRight size={17} />
                        </span>
                      </button>
                    ))}
                  {!data.notices.length && (
                    <Empty
                      title="A quiet noticeboard"
                      text="Imported class notes will appear here."
                    />
                  )}
                </div>
              )}
            </>
          )}
          {view === 'settings' && (
            <Settings
              snapshot={snapshot}
              runs={runs}
              demo={demo}
              access={access}
              reload={reload}
              notify={notify}
            />
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={14} />
              More time for the little things.
            </span>
            <span>
              {profile.school} · {profile.className}
            </span>
          </footer>
        </main>
      </div>
      <nav className="phone-nav" aria-label="Quick navigation">
        {links.map(({ id, label, icon: Icon }) => (
          <a
            href={'#' + id}
            key={id}
            className={view === id ? 'active' : ''}
            aria-current={view === id ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              go(id);
            }}
          >
            <Icon size={21} />
            <span>
              {id === 'library'
                ? 'Guides'
                : id === 'actions'
                  ? 'To do'
                  : id === 'overview'
                    ? 'Home'
                    : label}
            </span>
          </a>
        ))}
      </nav>
      {detail && (
        <Dialog title={detail.title} close={() => setDetail(null)}>
          <div className="detail-meta">
            {detail.kind && <span className="badge">{detail.kind}</span>}
            {detail.date && <span>{detail.date}</span>}
          </div>
          <Markdown text={detail.body} />
          {detail.documentIds
            ?.map((id) => data.documents.find((d) => d.id === id))
            .filter((d): d is SchoolDocument => !!d)
            .map((doc) => (
              <button key={doc.id} className="related-document" onClick={() => openDocument(doc)}>
                <FileText size={19} />
                {doc.title}
                <ChevronRight size={17} />
              </button>
            ))}
          {detail.original && (
            <a
              className="button secondary download-original"
              href={'/api/assets/' + detail.original.sha256 + '?download=1'}
            >
              <ArrowDownToLine size={17} />
              Download original
            </a>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <BookOpen size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ThemeButton() {
  const { theme, setTheme } = useTheme(),
    [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const modes = ['system', 'light', 'dark'],
    next = modes[(modes.indexOf(theme || 'system') + 1) % 3],
    Icon = !mounted || theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;
  return (
    <button
      className="icon-button theme-button"
      onClick={() => setTheme(next)}
      aria-label={mounted ? 'Theme: ' + theme + '. Switch to ' + next : 'Change colour theme'}
      title="Light, dark or system theme"
    >
      <Icon size={20} />
    </button>
  );
}
