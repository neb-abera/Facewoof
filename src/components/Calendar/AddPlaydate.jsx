/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/no-array-index-key */
import React, { useState } from 'react';
import DateTimePicker from 'react-datetime-picker';
/*
 * The picker's own stylesheets, which were never imported. Without them the
 * widget renders completely unstyled: a white strip across the dialog, the
 * fields running together, and the clear and calendar buttons showing as a
 * bare "✕ □". It looked broken because, visually, it was.
 */
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import useUserContext from '../../hooks/useUserContext';
import axios from 'axios';
import './Playdate.css';

const AddPlaydate = ({
  closeAddModal,
  playStartTime,
  setStartTime,
  playEndTime,
  setEndTime,
  onAdded
}) => {
  const [packChoiceId, setPackChoiceID] = useState();
  const [packChoiceName, setPackChoiceName] = useState();
  const [playdateInfo, setPlaydateInfo] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { packs } = useUserContext();

  const handlePackChoice = (e) => {
    const packObj = JSON.parse(e.target.value);
    setPackChoiceID(packObj.pack_id);
    setPackChoiceName(packObj.name);
  };

  const handlePlaydateInfo = (e) => {
    setPlaydateInfo(e.target.value);
  };

  const handleSubmit = async () => {
    // Every one of these was silently optional. Submitting without a pack or a
    // time posted an incomplete body, the server answered 400, and nothing
    // caught it: the modal stayed open with no explanation.
    if (!packChoiceId) return setError('Choose a pack first.');
    if (!playStartTime || !playEndTime) return setError('Pick a start and an end time.');
    if (new Date(playEndTime) <= new Date(playStartTime)) {
      return setError('The end time has to be after the start time.');
    }

    setSaving(true);
    setError(null);
    try {
      // No userId: it used to send a hardcoded 7 with a note to fix it later.
      // The server takes the acting user from the session and ignores anything
      // the client claims.
      await axios.post('/api/addplaydate', {
        packId: packChoiceId,
        playdateBody: playdateInfo,
        startTime: playStartTime,
        endTime: playEndTime
      });
      // The calendar only loaded on mount, so a saved playdate never appeared
      // and the whole feature looked broken.
      if (onAdded) await onAdded();
      closeAddModal();
    } catch (err) {
      console.error('could not add the playdate', err);
      setError('That playdate could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="playdate-form">
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
      {error && <p className="text-error text-sm mt-2">{error}</p>}
      <button
        type="submit"
        className="btn btn-active btn-primary"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? 'Adding…' : 'Add Playdate! 🐾'}
      </button>
    </div>
  );
};

export default AddPlaydate;
