/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/no-array-index-key */
import React, { useState } from 'react';
import DateTimePicker from 'react-datetime-picker';
import useUserContext from '../../hooks/useUserContext';
import './Playdate.css';

const AddPlaydate = ({ playStartTime, setStartTime, playEndTime, setEndTime }) => {
  const [packChoice, setPackChoice] = useState({ id: '', name: '' });
  const [playdateInfo, setPlaydateInfo] = useState('');
  const { packs } = useUserContext();

  const handlePackChoice = (e) => {
    // console.log(e.target);
    setPackChoice(e.target.value);
  };

  const handlePlaydateInfo = (e) => {
    setPlaydateInfo(e.target.value);
  };

  const handleSubmit = () => {
    console.log('playdate added');
  };

  return (
    <div className="modal-box">
      <h2>Add a Playdate</h2>
      <select
        defaultValue="Pack Name"
        onChange={(e) => handlePackChoice(e)}
        className="select w-full max-w-xs"
      >
        {packs.map((packObj, index) => (
          <option key={index} value={packObj}>
            {packObj.name}
          </option>
        ))}
      </select>
      <div>
        <h3>Playdate start time:</h3>
        <DateTimePicker onChange={setStartTime} value={playStartTime} />
        <h3>Playdate end time:</h3>
        <DateTimePicker onChange={setEndTime} value={playEndTime} />
      </div>
      <div>
        <h3>Basic Playdate Info:</h3>
        <textarea
          className="textarea textarea-bordered"
          onChange={handlePlaydateInfo}
          placeholder="Let's go get muddy at our favorite park!"
          value={playdateInfo}
        />
      </div>
      <button type="submit" className="btn btn-active btn-ghost">
        Add Playdate! 🐾
      </button>
    </div>
  );
};

export default AddPlaydate;
