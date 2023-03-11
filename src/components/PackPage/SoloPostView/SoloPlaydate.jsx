/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/prop-types */
import React from 'react';

const SoloPlaydate = ({ dataPoint }) => {
  const styles = {
    cal: {}
  };

  const currentDate = new Date(dataPoint.date);
  return (
    <div
      tabIndex={0}
      className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box"
    >
      <div className="collapse-title text-s font-small">{currentDate.toLocaleString()}</div>
      <div className="collapse-content">
        <p>{dataPoint.body}</p>
      </div>
    </div>
  );
};

export default SoloPlaydate;
