import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AllPostTiles from '../components/PackPage/AllPackView/AllPostTiles.jsx';
import PackMenu from '../components/PackPage/AllPackView/PackMenu.jsx';
import SoloPostTiles from '../components/PackPage/SoloPostView/SoloPostTiles.jsx';

const PackFeed = () => {
  var styles = {
    PackLayout: {
      display: 'flex',
      flexDirection: 'row'
      // border: '3px solid black'
    }
  };
  var [viewing, setViewing] = useState('all');
  return (
    <>
      <div style={styles.PackLayout}>
        <PackMenu setViewing={setViewing} />
        {viewing === 'all' ? <AllPostTiles /> : <SoloPostTiles viewing={viewing} />}
      </div>
    </>
  );
};

export default PackFeed;
