import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useLocation } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
// After the library's own stylesheet, so these overrides win.
import "./calendar-theme.css";
import useUserContext from "../../hooks/useUserContext";

// date-fns rather than moment: moment is in maintenance mode and ships as one
// locale-laden bundle, while date-fns is tree-shaken down to the four
// functions the localizer actually calls.
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

const PlaydateCalendar = ({
  calendarDate,
  onCalendarNavigate,
  openEditModal,
  openAddModal,
  setStartTime,
  setEndTime,
  setSelectedPlaydate,
}) => {
  const [_showPlaydateModal, _setShowPlaydateModal] = useState(false);
  const [eventsData, setEventsData] = useState([]);

  const { playdates } = useUserContext();

  useEffect(() => {
    setEventsData(playdates);
  }, [playdates]);

  const location = useLocation();
  const _background = location.state?.background;

  const handleAddNewPlaydate = ({ start, end }) => {
    // console.log(start);
    // console.log(end);
    openAddModal();
    setStartTime(start);
    setEndTime(end);

    // const title = window.prompt('New Event Name');
    // if (title) {
    //   setEventsData((prev) => [
    //     ...prev,
    //     {
    //       start: start,
    //       end: end,
    //       title: title
    //     }
    //   ]);
    // }
  };

  const handleSelectPlaydate = (playdateObj) => {
    // console.log(playdateObj);
    setSelectedPlaydate(playdateObj);
    openEditModal();
  };

  return (
    <div className="items-center text-center">
      {/* <Link to="/editplaydate" state={{ background: location }}>
        Edit Playdate Details
      </Link> */}
      <button
        className="btn btn-active btn-primary"
        type="button"
        onClick={openAddModal}
      >
        Add Playdate
      </button>
      <Calendar
        views={["day", "agenda", "week", "month"]}
        selectable
        localizer={localizer}
        date={calendarDate}
        onNavigate={onCalendarNavigate}
        defaultView="week"
        step="30"
        style={{ height: "90vh", width: "100vw" }}
        events={eventsData}
        onSelectEvent={handleSelectPlaydate}
        onSelectSlot={handleAddNewPlaydate}
      />
    </div>
  );
};

export default PlaydateCalendar;
