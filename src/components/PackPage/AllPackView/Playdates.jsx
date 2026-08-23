import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Playdate from './Playdate';

const Playdates = ({ setViewing, userIdentity }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  const [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPlaydates')
      .then((data) => setPlaydates(data.data || []))
      .catch((err) => console.error('could not load your playdates', err));
  }, []);

  const styles = {
    playdates: {
      width: '100%',
      backgroundColor: 'transparent'
      // flexGrow: 2
    }
  };

  // An empty list said nothing at all, which reads as a broken panel rather
  // than as having nothing scheduled.
  if (!playdates.length) {
    return <p className="pack-menu__empty">No playdates scheduled yet.</p>;
  }

  return (
    <ul className="pack-menu__list">
      {playdates.map((playdate, key) => (
        <li key={`playdate-${key + 1}`}>
          <div>
            <Playdate dataPoint={playdate} setViewing={setViewing} />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default Playdates;
