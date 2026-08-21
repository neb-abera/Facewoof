import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PackName from './PackName.jsx';
import axios from 'axios';

const PackList = ({ setViewing, userIdentity, setViewingName }) => {
  var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  var [packList, setPackList] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPacks', {
        params: { userId: userIdentity }
      })
      .then((data) => setPackList(data.data || []))
      .catch((err) => console.error('could not load the pack list', err));
  }, []);

  var click = (packData) => {
    // console.log('data in question', packData);
    setViewing(packData.pack_id);
    setViewingName(packData.name);
  };

  var styles = {
    packList: {
      width: '100%',
      backgroundColor: 'transparent'
    }
  };

  return (
    <>
      <div>
        {packList
          ? packList.map((packName, key) => (
              <li
                key={key}
                onClick={() => {
                  click(packName);
                }}
              >
                <a>
                  <PackName name={packName.name} setViewing={setViewing} />
                </a>
              </li>
            ))
          : null}
      </div>
    </>
  );
};

export default PackList;
