import moment from "moment";
import { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import { useLocation } from "react-router-dom";
import "react-big-calendar/lib/css/react-big-calendar.css";
// After the library's own stylesheet, so these overrides win.
import "./calendar-theme.css";
import useUserContext from "../../hooks/useUserContext";

moment.locale("en-US");
const localizer = momentLocalizer(moment);

const PlaydateCalendar = ({
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
        defaultDate={new Date()}
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
