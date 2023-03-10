import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import PackName from './PackName.jsx';
import axios from 'axios';
import Playdate from './Playdate.jsx';

const Playdates = ({ setViewing, userIdentity }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  var [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPlaydates', {
        params: { userId: userIdentity }
      })
      .then((data) => {
        var input = data.data;
        setPlaydates(input);
      });
  }, []);

  var styles = {
    playdates: {
      width: '100%',
      backgroundColor: 'pink'
      // flexGrow: 2
    }
  };

  return (
    <>
      <div>
        {playdates
          ? playdates.map((packName, key) => (
              <li key={key}>
                <a>
                  <Playdate dataPoint={packName} setViewing={setViewing} />
                </a>
              </li>
            ))
          : null}

        {/* <li>
          <PackName name={listNames[1]} setViewing={setViewing} />
        </li>
        <li>
          <PackName name={listNames[2]} setViewing={setViewing} />
        </li> */}
      </div>
    </>
  );
};

export default Playdates;
