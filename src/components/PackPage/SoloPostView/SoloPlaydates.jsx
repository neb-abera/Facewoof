import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SoloPackName from './SoloPackName.jsx';
import axios from 'axios';
import SoloPlaydate from './SoloPlaydate.jsx';

const SoloPlaydates = ({ setViewing, userIdentity }) => {
  // var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

  var [playdates, setPlaydates] = useState([]);

  useEffect(() => {
    axios
      .post('/getUserPlaydates', {
        userId: userIdentity
      })
      .then((data) => {
        // console.log('data', data.data);
        var input = data.data;
        // var packs = [];
        // for (var i = 0; i < input.length; i++) {
        //   packs.push({input[i], });
        // }
        setPlaydates(input);
        // console.log('playdates state', playdates);
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
        {/* {console.log('within code', typeof playdates)} */}
        {playdates
          ? playdates.map((packName, key) => (
              <li key={key}>
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
    </>
  );
};

export default SoloPlaydates;
