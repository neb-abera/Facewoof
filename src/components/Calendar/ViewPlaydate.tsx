import type { CalendarEvent } from "../../types";
import "./Playdate.css";

interface ViewPlaydateProps {
  selectedPlaydate: CalendarEvent;
  closeEditModal: () => void;
}

const ViewPlaydate = ({
  selectedPlaydate,
  closeEditModal,
}: ViewPlaydateProps) => {
  // The title is "<pack>: <what>", built by useCalendar.
  const [packName = "", ...rest] = selectedPlaydate.title.split(":");
  const description = rest.join(":").trim();
  const startTime = selectedPlaydate.start.toLocaleString();
  const endTime = selectedPlaydate.end.toLocaleString();
  return (
    <div className="card w-96 bg-primary text-primary-content top-[35vh] container mx-auto">
      <div className="card-body">
        <h3 className="card-title">
          <strong>{packName}</strong> has a playdate!
        </h3>
        <h4>
          on <strong>{startTime}</strong> until <strong>{endTime}</strong>
        </h4>
        <h3>{description}</h3>
        <div className="card-actions justify-end">
          <button className="btn" type="button" onClick={closeEditModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPlaydate;
