// Authored fictional fixtures. Never seed a private installation with this data.
import type { Catalogue } from './schema';
import { localDay, shiftDay, weekday } from './dates';
export function demoCatalogue(now = new Date()): Catalogue {
  const today = localDay(now, 'Europe/Zurich');
  const monday = shiftDay(today, -((weekday(today) + 6) % 7));
  const nextWeek = shiftDay(monday, 7);
  return {
    schemaVersion: 1,
    profile: {
      title: 'Alex’s school desk',
      school: 'Willow School',
      className: 'Oak class · Year 1',
      childName: 'Alex',
      house: 'Amber House',
      timezone: 'Europe/Zurich',
      eveningHour: 18,
      weekendDays: [0, 6],
    },
    sources: [
      {
        id: 'demo',
        label: 'Fictional school noticeboard',
        checkedAt: now.toISOString(),
        kind: 'manual',
      },
    ],
    week: [
      { day: 1, focus: 'Forest morning · bring waterproof boots' },
      { day: 2, focus: 'Library · bring your book bag' },
      { day: 3, focus: 'Art studio · wear clothes for painting' },
      { day: 4, focus: 'PE · trainers and a water bottle' },
      { day: 5, focus: 'Class circle · a quiet end to the week' },
    ],
    events: [
      ...Array.from({ length: 21 }, (_, i) => shiftDay(monday, i))
        .filter((d) => [2, 4].includes(weekday(d)))
        .map((date, i) => ({
          id: 'club-' + i,
          title: weekday(date) === 2 ? 'Dance club' : 'Young makers',
          date,
          start: '16:00',
          end: '16:45',
          kind: 'club' as const,
          body:
            weekday(date) === 2
              ? 'A playful movement session in the studio. Bring comfortable clothes and a water bottle.'
              : 'An afternoon of building and creating in the art room. Bring an apron.',
          sourceId: 'demo',
          documentIds: [],
        })),
      {
        id: 'house-day',
        title: 'House colour day · wear amber',
        date: shiftDay(monday, 1),
        kind: 'school',
        body: 'Wear something amber for the class’s house celebration. A T-shirt, scarf or socks are all welcome.',
        sourceId: 'demo',
        documentIds: [],
      },
      {
        id: 'nature',
        title: 'Woodland discovery walk',
        date: shiftDay(nextWeek, 2),
        start: '09:00',
        end: '11:30',
        kind: 'school',
        body: 'The class will explore the woodland trail with their teachers.\n\n## School bag\n- Waterproof jacket and boots\n- A filled water bottle\n- A small snack\n\nReturn to school before lunch.',
        sourceId: 'demo',
        documentIds: ['kit'],
      },
      {
        id: 'family-workshop',
        title: 'Family lantern workshop',
        date: shiftDay(nextWeek, 4),
        start: '15:00',
        end: '16:00',
        kind: 'school',
        body: 'Make a paper lantern together in the classroom. One adult may join each child. Materials are supplied.',
        sourceId: 'demo',
        documentIds: [],
      },
      {
        id: 'training-day',
        title: 'Teacher training day',
        date: shiftDay(nextWeek, 7),
        kind: 'closure',
        body: 'School is closed for staff training. Plan care for this weekday.',
        sourceId: 'demo',
        documentIds: [],
      },
      {
        id: 'break',
        title: 'Winter break',
        date: shiftDay(nextWeek, 14),
        last: shiftDay(nextWeek, 22),
        kind: 'closure',
        body: 'School is closed. Only weekdays are listed in care planning.',
        sourceId: 'demo',
        documentIds: [],
      },
      {
        id: 'past-walk',
        title: 'Apple orchard visit',
        date: shiftDay(monday, -5),
        start: '09:00',
        end: '12:00',
        kind: 'school',
        body: 'The class explored the orchard and pressed apple juice. This event has finished.',
        sourceId: 'demo',
        documentIds: [],
      },
    ],
    documents: [
      {
        id: 'kit',
        title: 'The school bag',
        category: 'Everyday',
        sourceId: 'demo',
        body: '## Every day\n- A filled water bottle\n- A small snack\n- A change of clothes\n\n## Outdoor days\nWaterproof boots and a weatherproof jacket. Label belongings with your child’s name.',
      },
      {
        id: 'care',
        title: 'Before and after school',
        category: 'Care',
        sourceId: 'demo',
        body: '## Morning care\nFrom 07:30 in the family room.\n\n## Afternoon care\nFrom the end of the school day until 18:00.\n\nCare requests are managed directly with the school. Saving a note here does not make a booking.',
      },
      {
        id: 'lunch',
        title: 'This week’s lunch',
        category: 'Meals',
        sourceId: 'demo',
        body: '| Day | Main meal | Vegetarian option |\n| --- | --- | --- |\n| Monday | Roast vegetables and rice | Same meal |\n| Tuesday | Chicken pasta | Tomato pasta |\n| Wednesday | Vegetable soup and bread | Same meal |\n| Thursday | Baked fish and potatoes | Vegetable bake |\n| Friday | Homemade pizza | Vegetable pizza |\n\nFruit and drinking water are available each day. This is a fictional demonstration menu.',
      },
      {
        id: 'policy',
        title: 'Absence and collection',
        category: 'Policies',
        sourceId: 'demo',
        body: '## Absence\nNotify the school office before the start of the school day.\n\n## Collection\nTell the class teacher if a different adult will collect your child.\n\nThis fictional policy demonstrates how a school document can become a concise web guide.',
      },
    ],
    notices: [
      {
        id: 'library',
        title: 'Our library week',
        date: today,
        body: 'The class discovered stories about woodland animals. On Tuesday, bring the book bag so everyone can choose a new book.',
        sourceId: 'demo',
        documentIds: [],
      },
      {
        id: 'outdoors',
        title: 'Ready for our woodland walk',
        date: shiftDay(today, -1),
        body: 'Next week’s walk is in the calendar. Pack waterproof boots, a jacket and a small snack.\n\nThe kit list brings everything together in one place.',
        sourceId: 'demo',
        documentIds: ['kit'],
      },
    ],
    actions: [
      {
        id: 'pack',
        title: 'Pack for the woodland walk',
        body: 'Waterproof boots, a jacket, water and a small snack.',
        due: shiftDay(nextWeek, 2),
        revision: '1',
        sourceId: 'demo',
      },
      {
        id: 'workshop',
        title: 'Choose who joins the lantern workshop',
        body: 'One adult may join Alex in the classroom. Save your family’s plan here.',
        due: shiftDay(nextWeek, 4),
        revision: '1',
        sourceId: 'demo',
      },
    ],
    media: [
      {
        id: 'art',
        title: 'Colours in the studio',
        date: today,
        kind: 'image',
        assetId: 'demo-art',
        sourceId: 'demo',
      },
      {
        id: 'woods',
        title: 'A morning outdoors',
        date: shiftDay(today, -1),
        kind: 'image',
        assetId: 'demo-woods',
        sourceId: 'demo',
      },
      {
        id: 'blocks',
        title: 'Little builders',
        date: shiftDay(today, -2),
        kind: 'image',
        assetId: 'demo-blocks',
        sourceId: 'demo',
      },
    ],
  };
}
