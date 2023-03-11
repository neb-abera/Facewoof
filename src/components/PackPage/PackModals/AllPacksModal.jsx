import React from 'react';
import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3001';

const AllPacksModal = () => {
  const styles = {};

  return (
    <div>
      <input type="checkbox" id="all-packs-modal" className="modal-toggle" />
      <div className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Congratulations random Internet user!</h3>
          <p className="py-4">
            You&#39;ve been selected for a chance to get one year of subscription to use Wikipedia
            for free!
          </p>
          <div className="modal-action">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="all-packs-modal" className="btn">
              Yay!
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllPacksModal;
