import { useMyPlaydates } from "../../../queries";
import Playdate from "./Playdate";

const Playdates = () => {
  const { data: playdates = [] } = useMyPlaydates();

  // An empty list said nothing at all, which reads as a broken panel rather
  // than as having nothing scheduled.
  if (!playdates.length) {
    return <p className="pack-menu__empty">No playdates scheduled yet.</p>;
  }

  return (
    <ul className="pack-menu__list">
      {playdates.map((playdate) => (
        <li key={playdate.playdate_id}>
          <div>
            <Playdate dataPoint={playdate} />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default Playdates;
