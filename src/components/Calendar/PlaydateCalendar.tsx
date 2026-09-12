import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
// After the library's own stylesheet, so these overrides win.
import "./calendar-theme.css";
import useUserContext from "../../hooks/useUserContext";
import type { CalendarEvent } from "../../types";

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

interface PlaydateCalendarProps {
  calendarDate: Date;
  onCalendarNavigate: (date: Date) => void;
  openEditModal: () => void;
  openAddModal: () => void;
  setStartTime: (date: Date | null) => void;
  setEndTime: (date: Date | null) => void;
  setSelectedPlaydate: (event: CalendarEvent | null) => void;
}

const PlaydateCalendar = ({
  calendarDate,
  onCalendarNavigate,
  openEditModal,
  openAddModal,
  setStartTime,
  setEndTime,
  setSelectedPlaydate,
}: PlaydateCalendarProps) => {
  const { playdates } = useUserContext();

  const handleAddNewPlaydate = ({ start, end }: SlotInfo) => {
    openAddModal();
    setStartTime(start);
    setEndTime(end);
  };

  const handleSelectPlaydate = (playdate: CalendarEvent) => {
    setSelectedPlaydate(playdate);
    openEditModal();
  };

  return (
    <div className="items-center text-center">
      <button
        className="btn btn-active btn-primary"
        type="button"
        onClick={openAddModal}
      >
        Add Playdate
      </button>
      <Calendar<CalendarEvent>
        views={["day", "agenda", "week", "month"]}
        selectable
        localizer={localizer}
        date={calendarDate}
        onNavigate={onCalendarNavigate}
        defaultView="week"
        step={30}
        style={{ height: "90vh", width: "100vw" }}
        events={playdates}
        onSelectEvent={handleSelectPlaydate}
        onSelectSlot={handleAddNewPlaydate}
      />
    </div>
  );
};

export default PlaydateCalendar;
