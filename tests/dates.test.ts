import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalogue } from '../lib/demo';
import { CatalogueSchema } from '../lib/schema';
import { planningDay, eventsOn, upcomingCareDays } from '../lib/dates';
const profile = demoCatalogue().profile;
test('evening planning advances at 18:00 in the configured timezone', () => {
  assert.equal(planningDay(new Date('2026-10-26T16:59:00Z'), profile), '2026-10-26');
  assert.equal(planningDay(new Date('2026-10-26T17:00:00Z'), profile), '2026-10-27');
});
test('Friday evening and weekends show the next school weekday', () => {
  for (const date of ['2026-10-30T17:00:00Z', '2026-10-31T10:00:00Z', '2026-11-01T21:00:00Z'])
    assert.equal(planningDay(new Date(date), profile), '2026-11-02');
});
test('timezone, DST, cutoff and different weekends are configuration', () => {
  assert.equal(planningDay(new Date('2026-07-06T15:59:00Z'), profile), '2026-07-06');
  assert.equal(planningDay(new Date('2026-07-06T16:00:00Z'), profile), '2026-07-07');
  assert.equal(planningDay(new Date('2026-12-31T17:00:00Z'), profile), '2027-01-01');
  assert.equal(
    planningDay(new Date('2026-10-27T17:00:00Z'), { ...profile, timezone: 'America/New_York' }),
    '2026-10-27',
  );
  assert.equal(
    planningDay(new Date('2026-10-29T17:00:00Z'), { ...profile, weekendDays: [5, 6] }),
    '2026-11-01',
  );
});
test('all day events and clubs appear together; a closure suppresses clubs', () => {
  const data = demoCatalogue(new Date('2026-10-27T10:00:00Z'));
  const rows = eventsOn(data.events, '2026-10-27', profile);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, 'House colour day · wear amber');
  const closed = {
    ...data.events.find((e) => e.id === 'house-day')!,
    id: 'closed',
    kind: 'closure' as const,
  };
  assert.equal(
    eventsOn([...data.events, closed], '2026-10-27', profile).some((e) => e.kind === 'club'),
    false,
  );
});
test('care planning excludes weekends and past days, including multi-day breaks', () => {
  const data = demoCatalogue(new Date('2026-10-27T10:00:00Z'));
  const care = upcomingCareDays(data.events, '2026-11-18', profile);
  assert.ok(care.length > 0);
  assert.ok(
    care.every(
      (d) =>
        d.date >= '2026-11-18' && ![0, 6].includes(new Date(d.date + 'T12:00:00Z').getUTCDay()),
    ),
  );
});
test('fictional demo always validates', () => {
  assert.equal(CatalogueSchema.safeParse(demoCatalogue()).success, true);
});
test('invalid dates, references and duplicate versions fail validation', () => {
  const data = demoCatalogue();
  assert.equal(
    CatalogueSchema.safeParse({ ...data, events: [{ ...data.events[0], date: '2026-02-30' }] })
      .success,
    false,
  );
  assert.equal(
    CatalogueSchema.safeParse({ ...data, events: [{ ...data.events[0], sourceId: 'unknown' }] })
      .success,
    false,
  );
  assert.equal(
    CatalogueSchema.safeParse({
      ...data,
      events: [data.events[0], { ...data.events[0], id: 'another-id' }],
    }).success,
    false,
  );
  assert.equal(
    CatalogueSchema.safeParse({
      ...data,
      documents: [{ ...data.documents[0], unexpected: 'raw extraction' }],
    }).success,
    false,
  );
});
