import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SoloPackName from './SoloPackName.jsx';
import axios from 'axios';

const SoloPackList = ({ setViewing, userIdentity }) => {
  var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  var [packList, setPackList] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPacks', {
        params: { userId: userIdentity }
      })
      .then((data) => {
        // console.log('data', data.data);
        var input = data.data;
        var packs = [];
        for (var i = 0; i < input.length; i++) {
          packs.push(input[i].name);
        }
        setPackList(packs);
        // console.log(packList);
      });
  }, []);

  var click = (packName) => {
    setViewing(packName);
    console.log('clicked', packName);
  };

  var styles = {
    packList: {
      width: '100%',
      backgroundColor: 'pink'
      // flexGrow: 2
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
                  <PackName name={packName} setViewing={setViewing} />
                </a>
              </li>
            ))
          : null}
      </div>
    </>
  );
};

export default SoloPackList;
