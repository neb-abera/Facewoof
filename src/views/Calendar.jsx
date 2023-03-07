import React, { useState } from 'react';
import PlaydateCalendar from '../components/Calendar/PlaydateCalendar';

const Calendar = () => {
  const [playdates, setPlaydates] = useState([]);

  return (
    <div>
      <h3>Playdate Calendar</h3>
      <PlaydateCalendar playdates={playdates} setPlaydates={setPlaydates} />
    </div>
  );
};

export default Calendar;
