/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/no-array-index-key */
import React, { useState } from 'react';
import DateTimePicker from 'react-datetime-picker';
import useUserContext from '../../hooks/useUserContext';
import axios from 'axios';
import './Playdate.css';

const AddPlaydate = ({ closeAddModal, playStartTime, setStartTime, playEndTime, setEndTime }) => {
  const [packChoiceId, setPackChoiceID] = useState();
  const [packChoiceName, setPackChoiceName] = useState();
  const [playdateInfo, setPlaydateInfo] = useState('');
  const { packs } = useUserContext();

  const handlePackChoice = (e) => {
    const packObj = JSON.parse(e.target.value);
    setPackChoiceID(packObj.pack_id);
    setPackChoiceName(packObj.name);
  };

  const handlePlaydateInfo = (e) => {
    setPlaydateInfo(e.target.value);
  };

  const handleSubmit = () => {
    return axios
      .post('http://localhost:3001/api/addplaydate', {
        packId: packChoiceId,
        userId: 7, // change later to by whatever user is logged in
        playdateBody: playdateInfo,
        startTime: playStartTime,
        endTime: playEndTime
      })
      .then(() => {
        console.log('playdate added!');
        closeAddModal();
      });
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
        <option disabled>Pack Name</option>
        {packs.map((packObj, index) => (
          <option key={index} value={JSON.stringify(packObj)}>
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
      <button type="submit" className="btn btn-active btn-ghost" onClick={handleSubmit}>
        Add Playdate! 🐾
      </button>
    </div>
  );
};

export default AddPlaydate;
