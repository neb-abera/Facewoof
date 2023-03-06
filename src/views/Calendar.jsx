/* eslint-disable react/jsx-boolean-value */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable import/no-extraneous-dependencies */
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { formatDate } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { initialEvent, createEventId } from '../components/Calendar/calendarUtils';
// import Scheduler, { Calendar, dateFnsLocalizer } from 'react-big-calendar';
// import moment from 'moment';
// import format from 'date-fns/format';
// import parse from 'date-fns/parse';
// import startOfWeek from 'date-fns/startOfWeek';
// import setHours from 'date-fns/setHours';
// import getDay from 'date-fns/getDay';
// import enUs from 'date-fns/locale/en-US';
// import 'react-big-calendar/lib/css/react-big-calendar.css';

// const locales = {
//   'en-US': enUs
// };

// const localizer = dateFnsLocalizer({
//   format: format,
//   parse: parse,
//   startOfWeek: startOfWeek,
//   getDay: getDay,
//   setHours: setHours(getDay, 12),
//   locales: locales
// });

const PlaydateCalendar = () => {
  const [playdates, setPlaydates] = useState([initialEvent]);
  // let idCount = 0;
  // const createEventId = () => {
  //   // eslint-disable-next-line no-plusplus
  //   return String(idCount++);
  // };
  // const [viewModel, setViewModel] = useState(schedulerData);

  // const schedulerData = new SchedulerData(new Date(), ViewTypes.Week);
  // schedulerData.localeMoment.locale('en');

  const handleDateSelect = (selectInfo) => {
    //this is currently an alert need to change to modal window 
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

  const handleEventClick = (clickInfo) => {
    if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}`)) {
      clickInfo.event.remove();
    }
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

  const renderSidebar = (event) => (
    <li key={event.id}>
      <b>{formatDate(event.start, { year: 'numberic', month: 'short', day: 'numeric' })}</b>
      <i>{event.title}</i>
    </li>
  );

  return (
    <div>
      <h3>Playdate Calendar</h3>
      <div>
        <h2>Instructions</h2>
        <ul>
          <li>Select dates and you will be prompted to create a new event</li>
          <li>Drag, drop, and resize events</li>
          <li>click an event to delete it</li>
        </ul>
        <div>
          <h2>All Events ({playdates.length})</h2>
          <ul>{playdates.map(renderSidebar)}</ul>
        </div>
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
  );
};

export default PlaydateCalendar;

/* <Calendar
  localizer={localizer}
  defaultDate={new Date()}
  defaultView="week"
  playdates={playdates}
  startAccessor="start"
  endAccessor="end"
  style={{ height: '80vh' }}
/> */
