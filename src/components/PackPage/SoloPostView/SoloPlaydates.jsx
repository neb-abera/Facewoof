/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SoloPlaydate from './SoloPlaydate';

const SoloPlaydates = ({ setViewing, userIdentity }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  const [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPlaydates', {
        params: { userId: userIdentity }
      })
      .then((data) => {
        // console.log('data', data.data);
        const input = data.data;
        // var packs = [];
        // for (var i = 0; i < input.length; i++) {
        //   packs.push({input[i], });
        // }
        setPlaydates(input);
        // console.log('playdates state', playdates);
      });
  }, []);

  const styles = {
    playdates: {
      width: '100%',
      backgroundColor: 'pink'
      // flexGrow: 2
    }
  };

  return (
    <div>
      {/* {console.log('within code', typeof playdates)} */}
      {playdates
        ? playdates.map((packName, key) => (
            <li key={`packName-${key + 1}`}>
              <a>
                <SoloPlaydate dataPoint={packName} setViewing={setViewing} />
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
  );
};

export default SoloPlaydates;
