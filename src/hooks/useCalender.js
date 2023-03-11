import { useCallback } from 'react';
import axios from 'axios';
import useUserContext from './useUserContext';

const useCalendar = () => {
  const { userId, setPlaydates, setPacks } = useUserContext();
  const getPacks = useCallback(() => {
    axios
      .get(`http://localhost:3001/api/playdates?userId=${userId}`)
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
      .then(() => axios.get(`http://localhost:3001/api/getpacks?userId=${userId}`))
      .then((packData) => {
        setPacks(packData.data);
      });
  }, [userId]);
  // eslint-disable-next-line object-shorthand
  return { getPacks };
};
export default useCalendar;
