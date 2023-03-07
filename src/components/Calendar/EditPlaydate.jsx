import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EditPlaydate.css';

const Playdate = ({ propTest }) => {
  const navigate = useNavigate();
  console.log('this is prop test', propTest);
  return (
    <div className="modalDiv">
      <div className="playdateModal">
        <h3>Create a PlayDate! this is a prop: {propTest}</h3>
        <button type="submit" onClick={() => navigate(-1)}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Playdate;
