import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Playdate from './Playdate';

const Playdates = ({ setViewing, userIdentity }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  const [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPlaydates', {
        params: { userId: userIdentity }
      })
      .then((data) => {
        const input = data.data;
        setPlaydates(input);
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
      {playdates
        ? playdates.map((packName, key) => (
            <li key={`packName-${key + 1}`}>
              {/*  eslint-disable-next-line jsx-a11y/anchor-is-valid */}
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
  );
};

export default Playdates;
