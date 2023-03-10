import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';
import FriendsListCopy from '../PackModals/FriendsListCopy.jsx';

const CreatePackModal = ({ userIdentity }) => {
  var styles = {
    buttonFormat: {
      display: 'flex',
      flexDirection: 'column'
    },
    overallModal: {
      width: '100%',
      height: '100%'
      // padding: '50px'
    }
  };

  return (
    <>
      <div>
        <input type="checkbox" id="create-pack-modal" className="modal-toggle" />
        <div className="modal" style={styles.buttonFormat}>
          <div className="modal-box" style={styles.overallModal}>
            <FriendsListCopy currentUser={userIdentity} />
            <div className="modal-action"></div>
          </div>
          <label htmlFor="create-pack-modal" className="btn">
            Yay!
          </label>
        </div>
      </div>
    </>
  );
};

export default CreatePackModal;
