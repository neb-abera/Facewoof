import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SoloPlaydate = ({ dataPoint }) => {
  var styles = {
    cal: {}
  };

  var currentDate = new Date(dataPoint.date);
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

export default SoloPlaydate;
