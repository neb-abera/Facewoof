import { useCallback } from 'react';
import axios from 'axios';
import useUserContext from './useUserContext';

const useCalendar = () => {
  const { setPlaydates, setPacks } = useUserContext();
  const getPacks = useCallback(() => {
    axios
      .get('/api/playdates')
      .then((data) => {
        const arr = data.data;
        const playdateArr = [];
        arr.forEach((obj, i) => {
          const pdObj = {};
          pdObj.id = i;
          pdObj.title = `${obj.pack_name}: ${obj.playdate_body}`;
          const startTime = new Date(obj.playdate_start_date);
          pdObj.start = startTime;
          const endTime = new Date(obj.playdate_end_date);
          pdObj.end = new Date(endTime);
          playdateArr.push(pdObj);
        });
        setPlaydates(playdateArr);
      })
      .then(() => axios.get('/api/getpacks'))
      .then((packData) => {
        setPacks(packData.data);
      });
    // No userId dependency: these requests identify the caller by session
    // cookie now, so the callback does not close over it. Signing in or out
    // remounts the view that uses this.
  }, [setPlaydates, setPacks]);
  // eslint-disable-next-line object-shorthand
  return { getPacks };
};
export default useCalendar;
