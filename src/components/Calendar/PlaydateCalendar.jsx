/* eslint-disable react/jsx-boolean-value */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable import/no-extraneous-dependencies */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import { formatDate } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { initialEvent, createEventId } from './calendarUtils';
import Playdate from './EditPlaydate';

const PlaydateCalendar = ({ playdates, setPlaydates }) => {
  const [showPlaydateModal, setShowPlaydateModal] = useState(false);
  const location = useLocation();
  const background = location.state && location.state.background;

  const handleDateSelect = (selectInfo) => {
    // this is currently an alert need to change to modal window
    console.log(selectInfo);
    const title = prompt('Please enter a new title for your event');
    const calendarApi = selectInfo.view.calendar;

    calendarApi.unselect();

    if (title) {
      calendarApi.addEvent({
        id: createEventId(),
        title: title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      });
    }
  };

  const handleEventClick = (clickInfo, e) => {
    console.log(clickInfo, e);
    setShowPlaydateModal(true);
    // if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}`)) {
    //   clickInfo.event.remove();
    // }
  };

  const handleEvents = (events) => {
    setPlaydates(events);
  };

  const playdateContent = (playdateInfo) => (
    <>
      <b>{playdateInfo.timeText}</b>
      <i>{playdateInfo.event.title}</i>
    </>
  );

  return (
    <div>
      <div>
        <h2>All Events ({initialEvent.length})</h2>
        <ul>
          {initialEvent.map((event) => (
            <li key={event.id} onClick={(e) => handleEventClick(event, e)}>
              <b>{formatDate(event.start, { year: 'numberic', month: 'short', day: 'numeric' })}</b>
              <i>{event.title}</i>
            </li>
          ))}
        </ul>
        <Link to="/editplaydate" state={{ background: location }}>
          Edit Playdate Details
        </Link>
      </div>
      <div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridWeek"
          editable={true}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          dayMaxEvents={true}
          weekends={true}
          initialEvents={initialEvent}
          eventContent={playdateContent}
          eventClick={handleEventClick}
          eventsSet={handleEvents}
        />
      </div>
    </div>
  )
};

export default PlaydateCalendar;
