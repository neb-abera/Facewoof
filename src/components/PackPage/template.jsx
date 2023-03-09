import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';

const template = () => {
  var styles = {};

  return (
    <>
      <div></div>
    </>
  );
};

export default template;
