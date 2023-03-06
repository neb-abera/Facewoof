let eventGuide = 0;
const todayStr = new Date().toDateString();

export const createEventId = () => {
  return String(eventGuide++);
};

export const initialEvent = [
  { id: createEventId(), title: 'All-day playdate', start: todayStr },
  { id: createEventId(), title: 'other Playdate', start: `${todayStr}T12:00:00` }
];
