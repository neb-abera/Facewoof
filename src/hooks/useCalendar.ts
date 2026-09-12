import { useCallback } from "react";
import { api, unwrap } from "../api";
import useUserContext from "./useUserContext";

/* Load the calendar's events and the pack list into the shared context. */
const useCalendar = () => {
  const { setPlaydates, setPacks } = useUserContext();
  const getPacks = useCallback(async () => {
    const playdates = unwrap(await api.GET("/api/playdates"));
    setPlaydates(
      playdates.map((obj, i) => ({
        id: i,
        title: `${obj.pack_name}: ${obj.playdate_body ?? ""}`,
        start: new Date(obj.playdate_start_date),
        end: new Date(obj.playdate_end_date),
      })),
    );
    setPacks(unwrap(await api.GET("/api/getpacks")));
    // No userId dependency: these requests identify the caller by session
    // cookie now, so the callback does not close over it. Signing in or out
    // remounts the view that uses this.
  }, [setPlaydates, setPacks]);
  return { getPacks };
};

export default useCalendar;
