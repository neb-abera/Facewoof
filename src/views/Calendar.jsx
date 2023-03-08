/* eslint-disable prefer-template */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useUserContext from '../hooks/useUserContext';
import PlaydateCalendar from '../components/Calendar/PlaydateCalendar';

const Calendar = () => {
  const { playdates, setPlaydates, handleSetPlaydates } = useUserContext();

  useEffect(() => {
    axios.get(`http://localhost:3001/playdates?userId=${1}`).then((data) => {
      // console.log(data.data);
      const arr = data.data;
      const playdateArr = [];
      arr.forEach((obj, i) => {
        const pdObj = {};
        pdObj.id = i;
        pdObj.title = obj.pack_name + ': ' + obj.playdate_body;
        const startTime = new Date(obj.playdate_date);
        pdObj.start = startTime;
        const startHour = startTime.getHours();
        const endTime = new Date(obj.playdate_date);
        endTime.setHours(startHour + 1);
        pdObj.end = new Date(endTime);
        playdateArr.push(pdObj);
      });
      setPlaydates(playdateArr);
    });
  }, []);

  return (
    <div>
      <h3>Playdate Calendar</h3>
      <PlaydateCalendar />
    </div>
  );
};

export default Calendar;
