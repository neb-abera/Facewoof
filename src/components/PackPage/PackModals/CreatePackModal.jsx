import React from 'react';
import axios from 'axios';
import FriendsListCopy from './FriendsListCopy.jsx';

axios.defaults.baseURL = 'http://localhost:3001';

const CreatePackModal = ({ userIdentity }) => {
  const styles = {
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
    <div>
      <input type="checkbox" id="create-pack-modal" className="modal-toggle" />
      <div className="modal" style={styles.buttonFormat}>
        <div className="modal-box" style={styles.overallModal}>
          <FriendsListCopy currentUser={userIdentity} />
          <div className="modal-action" />
        </div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="create-pack-modal" className="btn">
          Yay!
        </label>
      </div>
    </div>
  );
};

export default CreatePackModal;
