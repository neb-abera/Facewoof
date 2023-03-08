/* eslint-disable react/jsx-indent-props */
import React, { useState, useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import useUserContext from '../../hooks/useUserContext';

moment.locale('en-US');
const localizer = momentLocalizer(moment);

const PlaydateCalendar = () => {
  const [showPlaydateModal, setShowPlaydateModal] = useState(false);
  const [eventsData, setEventsData] = useState([]);

  const { playdates, setPlaydates, handleSetPlaydates } = useUserContext();

  useEffect(() => {
    setEventsData(playdates);
  }, [playdates]);

  const location = useLocation();
  const background = location.state && location.state.background;

  const handleSelect = ({ start, end }) => {
    console.log(start);
    console.log(end);
    const title = window.prompt('New Event Name');
    if (title) {
      setEventsData((prev) => [
        ...prev,
        {
          start: start,
          end: end,
          title: title
        }
      ]);
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
        defaultView="week"
        step="30"
        events={eventsData}
        onSelectEvent={(event) => alert(event.title)}
        inSelectSlot={handleSelect}
      />
    </div>
  );
};

export default PlaydateCalendar;
