import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SoloPackList = ({ setViewing, userIdentity }) => {
  const listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  const [packList, setPackList] = useState([]);

  useEffect(() => {
    axios
      .get('/api/getUserPacks', {
        params: { userId: userIdentity }
      })
      .then((data) => {
        // console.log('data', data.data);
        const input = data.data;
        const packs = [];
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < input.length; i++) {
          packs.push(input[i].name);
        }
        setPackList(packs);
        // console.log(packList);
      });
  }, []);

  const click = (packName) => {
    setViewing(packName);
    console.log('clicked', packName);
  };

  const styles = {
    packList: {
      width: '100vw',
      backgroundColor: 'pink'
      // flexGrow: 2
    }
  };

  return (
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
  );
};

export default SoloPackList;
