/* eslint-disable react/no-array-index-key */
import React, { useState } from 'react';
import useUserContext from '../../hooks/useUserContext';

const AddPlaydate = () => {
  const [packChoice, setPackChoice] = useState({ id: '', name: '' });
  const { packs } = useUserContext();

  const handlePackChoice = (e) => {
    console.log(e.target);
    setPackChoice(e.target.value);
  };

  return (
    <div>
      <h2>Add a Playdate</h2>
      {/* <div className="dropdown">
        <label tabIndex={0} className="btn m-1">
         {packChoice === '' ? `Choose A Pack`: `${packChoice.name}`}
        </label> */}
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
      {/* <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
          {packs.map((packObj, index) => (
            <li key={index} onClick={() => setPackChoice(packObj)}>
              <a>{packObj.name}</a>
            </li>
          ))}
          {/* <li>
            <a>Pack 1</a>
          </li>
          <li>
            <a>Pack 2</a>
          </li> */}
      {/* </ul> */}
      {/* // </div> */}
    </div>
  );
};

export default AddPlaydate;
