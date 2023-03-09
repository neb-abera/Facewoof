import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Playdate = ({ dataPoint }) => {
  var styles = {
    cal: {
      // height: '5vh'
    }
  };
  // console.log('datapoint', dataPoint);
  var currentDate = new Date(dataPoint.start_date);
  // console.log(dataPoint);
  return (
    <>
      <div
        tabIndex={0}
        className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box"
      >
        <div className="collapse-title text-s font-small">{currentDate.toLocaleString()}</div>
        <div className="collapse-content">
          <p>{dataPoint.body}</p>
        </div>
      </div>
    </>
  );
};

export default Playdate;
