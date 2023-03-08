import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PlaydateCalendar from '../components/Calendar/PlaydateCalendar';

const Calendar = () => {
  const [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios.get(`http://localhost:3001/playdates?userId=${1}`).then((data) => {
      // console.log(data.data);
      const arr = data.data;
      const playdateArr = [];
      arr.forEach((obj, i) => {
        const pdObj = {};
        pdObj.id = i;
        pdObj.title = obj.pack_name + ": " + obj.playdate_body;
        // pdObj.title = ;
        // pdObj.start = new Date(obj.playdate_date).toLocaleString();
        pdObj.start = Date.parse(new Date(obj.playdate_date));
        // console.log('this is date used for comparing: ', obj.playdate_date);
        // if (pdObj.start > Date.parse(new Date())) {
        //   console.log('this is  start', pdObj.start);
        playdateArr.push(pdObj);
        // }
      });
      // console.log(playdateArr);
      setPlaydates(playdateArr);
    });
  }, []);

  return (
    <div>
      <h3>Playdate Calendar</h3>
      <PlaydateCalendar playdates={playdates} setPlaydates={setPlaydates} />
    </div>
  );
};

export default Calendar;
