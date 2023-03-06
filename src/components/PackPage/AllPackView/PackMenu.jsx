import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PackList from './PackList.jsx';

const PackMenu = ({ setViewing }) => {
  var styles = {
    packList: {
      display: 'flex',
      flexDirection: 'column'
    },
    parent: {
      // border: '3px solid grey',
      width: '35%',
      height: '100%',
      // paddingTop: '50px',
      position: 'sticky',
      top: '50px',
      borderRadius: '5%'
    },
    yourPacks: {
      paddingTop: '25px',
      // border: '1px solid black',
      height: '25px'
    }
  };

  return (
    <>
      <div className="drawer" style={styles.parent}>
        <div className="drawer-content"></div>
        <div className="drawer-side">
          {/* <label for="my-drawer" className="drawer-overlay"></label> */}
          <ul className="menu p-4 w-80 bg-base-100 text-base-content">
            <div className="card shadow-xl" style={styles.yourPacks}>
              Your Packs
            </div>
            <PackList setViewing={setViewing} />
            Calendar
          </ul>
        </div>
      </div>
    </>
  );
};

export default PackMenu;
