import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PackName from './PackName.jsx';

const PackList = ({ setViewing }) => {
  var listNames = ['Woofram Alpha', 'Barkalona', 'Bark Simpson'];

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
        <li>
          <PackName name={listNames[0]} setViewing={setViewing} />
        </li>
        <li>
          <PackName name={listNames[1]} setViewing={setViewing} />
        </li>
        <li>
          <PackName name={listNames[2]} setViewing={setViewing} />
        </li>
      </div>
    </>
  );
};

export default PackList;
