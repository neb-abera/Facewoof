import { useEffect, useState } from "react";
import { api } from "../../../api";
import type { Playdate as PlaydateRow } from "../../../types";
import Playdate from "./Playdate";

const Playdates = () => {
  const [playdates, setPlaydates] = useState<PlaydateRow[]>([]);

  useEffect(() => {
    api
      .GET("/api/getUserPlaydates")
      .then(({ data }) => setPlaydates(data ?? []))
      .catch((err: unknown) =>
        console.error("could not load your playdates", err),
      );
  }, []);

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
