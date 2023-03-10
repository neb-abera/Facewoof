import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PackName = ({ name, setViewing }) => {
  var styles = {};
  var click = () => {
    setViewing(name);
  };
  return (
    <>
      <div onClick={click}>{name}</div>
    </>
  );
};

export default PackName;
