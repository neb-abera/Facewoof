import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PackList from './PackList.jsx';
import Playdates from './Playdates.jsx';

const PackMenu = ({ setViewing, userIdentity, setViewingName }) => {
  var styles = {
    packList: {
      display: 'flex',
      flexDirection: 'column'
    },
    parent: {
      border: '1px solid grey',
      width: '20vw',
      height: '100vh',
      // paddingTop: '50px',
      position: 'sticky',
      top: '0px',
      bottom: '0px',
      alignItems: 'stretch',
      backgroundColor: 'grey'
      // borderRadius: '5%'
    },
    yourPacks: {
      // paddingTop: '25px'
      // border: '1px solid black',
      // height: '25px',
      display: 'flex',
      justifyContent: 'center'
    },
    packList: {
      // border: '2px solid grey',
      height: '50vh'
    },
    calendar: {
      height: '50vh'
    }
  };

  return (
    <>
      <div className="drawer " style={styles.parent}>
        <div className="drawer-content"></div>
        <div className="drawer-side">
          {/* <label for="my-drawer" className="drawer-overlay"></label> */}
          <ul className="menu p-1 w-100 bg-base-100 text-base-content">
            <div className="card shadow-xl">
              <div style={styles.yourPacks}>Your Packs</div>
            </div>
            <div style={styles.packList}>
              <PackList
                setViewing={setViewing}
                setViewingName={setViewingName}
                userIdentity={userIdentity}
              />
            </div>
            <div style={styles.calendar}>
              Calendar
              <Playdates userIdentity={userIdentity} />
            </div>
          </ul>
        </div>
      </div>
    </>
  );
};

export default PackMenu;
