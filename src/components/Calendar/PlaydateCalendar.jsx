/* eslint-disable react/jsx-indent-props */
import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import defaultProps from 'prop-types';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('en-US');
const localizer = momentLocalizer(moment);

const PlaydateCalendar = ({ playdates }) => {
  const [showPlaydateModal, setShowPlaydateModal] = useState(false);
  const [eventsData, setEventsData] = useState(playdates);

  const location = useLocation();
  const background = location.state && location.state.background;

  const handleSelect = ({ start, end }) => {
    console.log(start);
    console.log(end);
    const title = window.prompt('New Event Name');
    if (title) {
      setEventsData((prev) => ([
        ...eventsData,
        {
          start: start,
          end: end,
          title: title
        }
      ]));
    }
  };

  return (
    <div>
      <Link to="/editplaydate" state={{ background: location }}>
        Edit Playdate Details
      </Link>
      <Calendar
        views={['day', 'agenda', 'week', 'month']}
        selectable
        localizer={localizer}
        defaultDate={new Date()}
        events={eventsData}
        onSelectEvent={(event) => alert(event.title)}
        inSelectSlot={handleSelect}
      />
    </div>
  );
};

PlaydateCalendar.defaultProps = {
  playdates: []
};

export default PlaydateCalendar;
