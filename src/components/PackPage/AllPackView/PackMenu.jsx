import React, { useState, useEffect, useContext, useRef } from 'react';

import PackList from './PackList.jsx';
import Playdates from './Playdates.jsx';
// import AllPacksModal from '../PackModals/AllPacksModal.jsx';
import CreatePackModal from '../PackModals/CreatePackModal.jsx';
import FriendsListCopy from '../PackModals/FriendsListCopy.jsx';

const PackMenu = ({ viewing, setViewing, userIdentity, setViewingName }) => {
  const buttonModal = useRef();

  // var dummyFunc =
  var styles = {
    packList: {
      display: 'flex',
      flexDirection: 'column',
      height: '40vh',
      overflowY: 'scroll'
    },
    parent: {
      // border: '1px solid grey',
      width: '25vw',
      height: '100vh',
      // paddingTop: '50px',
      position: 'sticky',
      top: '0px',
      bottom: '0px',
      alignItems: 'stretch',
      overflowY: 'auto'
    },
    yourPacks: {
      // paddingTop: '25px'
      // border: '1px solid black',
      // height: '25px',
      display: 'flex',
      justifyContent: 'center'
    },
    // packList: {
    //   // border: '2px solid grey',
    // },
    calendar: {
      height: '50vh',
      overflowY: 'scroll',
      padding: '15px'
    },
    menuButtons: {
      // border: '2px solid grey',
      display: 'flex',
      justifyContent: 'space-between'
    }
  };

  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* <AllPacksModal /> */}
      <CreatePackModal userIdentity={{ user_id: userIdentity }} />
      {/* <FriendsListCopy currentUser={{ user_id: userIdentity }} /> */}
      <aside className="bg-base-200" style={styles.parent}>
        <ul className="menu p-1 w-full bg-base-100 text-base-content">
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
          <div style={styles.menuButtons}>
            <label htmlFor="create-pack-modal" className="btn">
              Create Pack
            </label>
            {viewing !== '-1' ? (
              <button
                className="btn"
                onClick={() => {
                  setViewing('-1');
                }}
              >
                View All
              </button>
            ) : null}
          </div>
          <div style={styles.calendar}>
            Calendar
            <Playdates userIdentity={userIdentity} />
          </div>
        </ul>
      </aside>
    </>
  );
};

export default PackMenu;
