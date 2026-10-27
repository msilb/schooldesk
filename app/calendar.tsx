'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Music, Sun } from 'lucide-react';
import { dateLabel, eventsOn, shiftDay, weekday } from '@/lib/dates';
import type { Catalogue, SchoolEvent } from '@/lib/schema';
export default function Calendar({
  catalogue,
  today,
  open,
}: {
  catalogue: Catalogue;
  today: string;
  open: (e: SchoolEvent) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7) + '-01'),
    [tab, setTab] = useState<'upcoming' | 'past'>('upcoming'),
    [day, setDay] = useState<string | null>(null);
  const start = shiftDay(month, -((weekday(month) + 6) % 7));
  const [year, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
  const move = (n: number) => {
    setMonth(new Date(Date.UTC(year, m - 1 + n, 1)).toISOString().slice(0, 10));
    setDay(null);
  };
  const rows = day
    ? eventsOn(catalogue.events, day, catalogue.profile)
    : catalogue.events
        .filter((e) => (tab === 'past' ? (e.last || e.date) < today : (e.last || e.date) >= today))
        .sort((a, b) =>
          tab === 'past'
            ? b.date.localeCompare(a.date)
            : a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''),
        );
  return (
    <div className="calendar-layout">
      <section>
        <div className="section-tools">
          <div className="segmented" role="group" aria-label="Event history">
            {(['upcoming', 'past'] as const).map((value) => (
              <button
                key={value}
                className={tab === value && !day ? 'selected' : ''}
                aria-pressed={tab === value && !day}
                onClick={() => {
                  setTab(value);
                  setDay(null);
                }}
              >
                {value === 'upcoming' ? 'Coming up' : 'Past events'}
              </button>
            ))}
          </div>
          {day && (
            <button className="text-button" onClick={() => setDay(null)}>
              Clear selected day
            </button>
          )}
        </div>
        <div className="panel event-list">
          <div className="panel-heading">
            <h2>
              {day
                ? dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long' })
                : tab === 'past'
                  ? 'School days remembered'
                  : 'All your school dates'}
            </h2>
            <span className="badge">{rows.length}</span>
          </div>
          {rows.length ? (
            rows.map((event) => <EventRow key={event.id} event={event} open={() => open(event)} />)
          ) : (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h3>
                No events {day ? 'on this day' : tab === 'past' ? 'have passed yet' : 'coming up'}
              </h3>
              <p>New imported dates will appear here.</p>
            </div>
          )}
        </div>
      </section>
      <aside className="calendar-aside">
        <div className="panel mini-calendar">
          <header>
            <h3>{dateLabel(month, { month: 'long', year: 'numeric' })}</h3>
            <div>
              <button className="icon-button" onClick={() => move(-1)} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <button className="icon-button" onClick={() => move(1)} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
            </div>
          </header>
          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span className="weekday" key={i}>
                {d}
              </span>
            ))}
            {Array.from({ length: 42 }, (_, i) => shiftDay(start, i)).map((date) => {
              const events = eventsOn(catalogue.events, date, catalogue.profile);
              return (
                <button
                  key={date}
                  className={[
                    date < month || date > last ? 'outside' : '',
                    date === today ? 'today' : '',
                    date === day ? 'chosen' : '',
                  ].join(' ')}
                  aria-label={
                    dateLabel(date, { day: 'numeric', month: 'long' }) + `, ${events.length} events`
                  }
                  aria-pressed={date === day}
                  onClick={() => setDay(date)}
                >
                  <span>{Number(date.slice(-2))}</span>
                  {events.length > 0 && (
                    <i className={events.some((e) => e.kind === 'closure') ? 'off' : ''} />
                  )}
                </button>
              );
            })}
          </div>
          <button
            className="text-button"
            onClick={() => {
              setMonth(today.slice(0, 7) + '-01');
              setDay(today);
            }}
          >
            Back to today
          </button>
        </div>
        <div className="calendar-key">
          <span>
            <i />
            School & clubs
          </span>
          <span>
            <i className="off" />
            Days off
          </span>
        </div>
      </aside>
    </div>
  );
}
export function EventRow({ event, open }: { event: SchoolEvent; open: () => void }) {
  const Icon = event.kind === 'club' ? Music : event.kind === 'closure' ? Sun : CalendarDays;
  return (
    <button className="event-row" onClick={open}>
      <span className={'date-square ' + event.kind}>
        <small>{dateLabel(event.date, { month: 'short' })}</small>
        <b>{Number(event.date.slice(-2))}</b>
      </span>
      <span className="event-info">
        <b>{event.title}</b>
        <small>
          <Icon size={13} />
          {event.start
            ? event.start + (event.end ? '–' + event.end : '')
            : event.last && event.last !== event.date
              ? 'Until ' + dateLabel(event.last)
              : 'All day'}
          <span>·</span>
          {event.kind === 'club'
            ? 'Club'
            : event.kind === 'closure'
              ? 'Off school'
              : 'School event'}
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
}
