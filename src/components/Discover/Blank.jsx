/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';

import './cardStack.css';

export default function Blank() {
  return (
    <div className="blank">
      <div className="blank-content">
        <div className="dog-icon">
          <FaDog />
        </div>
        <h1 className="blank-title">That&apos;s all for now!</h1>
        <h1 className="blank-subtitle">Come back again later to see more potential matches...</h1>
      </div>
    </div>
  );
}
