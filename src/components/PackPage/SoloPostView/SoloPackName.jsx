import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SoloPackName = ({ name, setViewing }) => {
  var styles = {};
  // console.log(name);
  var click = () => {
    setViewing(name);
    // console.log('clicked', name);
  };
  return (
    <>
      <div onClick={click}>{name}</div>
    </>
  );
};

export default SoloPackName;
