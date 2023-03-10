/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/jsx-indent-props */
import React from 'react';
// import { useNavigate } from 'react-router-dom';
import './Playdate.css';

const ViewPlaydate = ({ selectedPlaydate, closeEditModal }) => {
  // const navigate = useNavigate();
  // const [input, setInput] = useState({});
  // className="playdateModal"
  const packName = selectedPlaydate.title.split(':')[0];
  const description = selectedPlaydate.title.split(':')[1];
  const startTime = selectedPlaydate.start.toLocaleString();
  const endTime = selectedPlaydate.end.toLocaleString();
  return (
    <div className="card w-96 bg-primary text-primary-content top-[35vh] container mx-auto">
      <div className="card-body">
        <h3 className="card-title">
          <strong>{packName}</strong> has a playdate!
        </h3>
        <h4>
          on <strong>{startTime}</strong> until <strong>{endTime}</strong>
        </h4>
        <h3>{description}</h3>
        <div className="card-actions justify-end">
          <button className="btn" type="button" onClick={closeEditModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPlaydate;
