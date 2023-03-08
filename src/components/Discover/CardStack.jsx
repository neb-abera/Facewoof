/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import axios from 'axios';

import ProfileCard from './ProfileCard';
import Match from './Match';
import Blank from './Blank';
import './cardStack.css';

const CardStack = ({ users }) => {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);

  const [data, setData] = useState([]);
  const [stack, setStack] = useState([]);
  const [user, setUser] = useState(null);

  const [out, setOut] = useState(null);
  const [pass, setPass] = useState(null);

  const [choice, setChoice] = useState(null);
  const [match, setMatch] = useState(false);
  const [matchOut, setMatchOut] = useState(false);

  useEffect(() => {
    setData(users);
  }, []);

  useEffect(() => {
    if (data.length > 1 && (out !== null || pass !== null)) {
      setFront(data[1].user_id);
    }
    if (data.length > 2 && (out !== null || pass !== null)) {
      setBack(data[2].user_id);
    }
    setTimeout(() => {
      if (out !== null || pass !== null) {
        setData(data.slice(1));
      }
    }, 400);
  }, [out, pass]);

  useEffect(() => {
    setStack(data.slice(0, 3).reverse());
    setUser(data[0]);
  }, [data]);

  function handleVote(e) {
    if (e.target.id === 'digg') {
      setOut(user.user_id);
    } else {
      setPass(user.user_id);
    }
  }

  function handleContinue() {
    setMatch(false);
  }

  return (
    <div>
      {match ? (
        <div className={matchOut ? 'match-out' : ''}>
          <Match handleContinue={handleContinue} />
        </div>
      ) : null}
      <div className="discover-cardview-parent">
        {stack.length > 0 ? (
          <div className="card-stack">
            {stack.map((user, index) => (
              <div
                key={`user${user.user_id}`}
                className={`profile-card
                  ${out === user.user_id ? 'unmount' : ''}
                  ${pass === user.user_id ? 'pass-unmount' : ''}
                  ${front === user.user_id ? 'mount' : ''}
                  ${back === user.user_id ? 'back-mount' : ''}
                  `}
              >
                <div className="card-wrapper">
                  <ProfileCard user={user} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Blank />
        )}
        <div className="buttons">
          <button
            id="pass"
            type="button"
            className="btn btn-active btn-accent"
            onClick={handleVote}
          >
            Pass
          </button>
          <button
              id="digg"
              type="button"
              className="btn btn-active btn-primary"
              onClick={handleVote}
          >
            Digg &apos;em
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardStack;
