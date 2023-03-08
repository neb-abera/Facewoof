/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/jsx-indent-props */
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditPlaydate.css';
import PlaydateContext from './CalendarContext';

const Playdate = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState({});

  // const handleAddPlaydates = useContext(PlaydateContext);

  return (
    <div className="modalDiv">
      <div className="playdateModal">
        <h3>Create a PlayDate!</h3>
        <div className="dropdown">
          <label tabIndex={0} className="btn m-1">
            Click
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <a>Item 1</a>
            </li>
            <li>
              <a>Item 2</a>
            </li>
          </ul>
        </div>
        <button type="submit" onClick={() => navigate(-1)}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Playdate;
