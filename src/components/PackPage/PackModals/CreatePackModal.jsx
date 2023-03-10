import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
axios.defaults.baseURL = 'http://localhost:3001';

const CreatePackModal = () => {
  var styles = {};

  return (
    <>
      <div>
        <input type="checkbox" id="create-pack-modal" className="modal-toggle" />
        <div className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Congratulations random Internet user!</h3>
            <p className="py-4">
              You've been selected for a chance to get one year of subscription to use Wikipedia for
              free!
            </p>
            <div className="modal-action">
              <label htmlFor="create-pack-modal" className="btn">
                Yay!
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatePackModal;
