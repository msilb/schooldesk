import type { Profile, SchoolEvent } from './schema';
export function localDay(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
export function shiftDay(date: string, n: number) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(date + 'T12:00:00Z').getUTCDay();
}
export function planningDay(
  now: Date,
  profile: Pick<Profile, 'timezone' | 'eveningHour' | 'weekendDays'>,
) {
  let date = localDay(now, profile.timezone);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: profile.timezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
  if (hour >= profile.eveningHour) date = shiftDay(date, 1);
  for (let i = 0; i < 7 && profile.weekendDays.includes(weekday(date)); i++)
    date = shiftDay(date, 1);
  return date;
}
export function dateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(
    new Date(date + 'T12:00:00Z'),
  );
}
export function onDate(event: SchoolEvent, date: string) {
  return event.date <= date && (event.last || event.date) >= date;
}
export function eventsOn(events: SchoolEvent[], date: string, profile: Profile) {
  const on = events.filter(
    (e) =>
      onDate(e, date) && !(e.kind === 'closure' && profile.weekendDays.includes(weekday(date))),
  );
  const off = on.some((e) => e.kind === 'closure');
  return on
    .filter((e) => !(off && e.kind === 'club'))
    .sort(
      (a, b) =>
        (a.start || '00:00').localeCompare(b.start || '00:00') || a.title.localeCompare(b.title),
    );
}
export function upcomingCareDays(events: SchoolEvent[], from: string, profile: Profile) {
  const rows: { date: string; title: string; event: SchoolEvent }[] = [],
    seen = new Set<string>();
  for (const event of events.filter((e) => e.kind === 'closure'))
    for (
      let date = event.date < from ? from : event.date;
      date <= (event.last || event.date);
      date = shiftDay(date, 1)
    ) {
      if (!profile.weekendDays.includes(weekday(date)) && !seen.has(date)) {
        rows.push({ date, title: event.title, event });
        seen.add(date);
      }
    }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
