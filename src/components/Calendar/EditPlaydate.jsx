/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/jsx-indent-props */
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './Playdate.css';

const Playdate = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState({});

  return (
    <div className="modalDiv">
      <div className="playdateModal">
        <h3>Playdate Details</h3>
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
