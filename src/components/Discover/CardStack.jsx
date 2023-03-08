/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import axios from 'axios';
import Draggable from 'react-draggable';

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

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const [currentUser, setCurrentUser] = useState({
    user_id: '27',
    dog_name: 'Murvyn',
    owner_name: 'Teodora Shearstone',
    dog_breed: 'Royal tern',
    age: 13,
    vaccination: true,
    discoverable: true,
    owner_email: 'sreapq@blogtalkradio.com',
    location: '10036',
    user1_choice: null,
    photos: [
      'http://dummyimage.com/122x100.png/5fa2dd/ffffff',
      'http://dummyimage.com/191x100.png/dddddd/000000',
      'http://dummyimage.com/181x100.png/ff4444/ffffff'
    ]
  });

  function setRelationship(user1, user2, choice) {
    axios
      .post('https://localhost:3001/api/response', {
        currentUserId: user1.user_id,
        otherUserId: user2.user_id,
        currentUserChoice: choice,
        otherUserChoice: user2.user1_choice
      })
      .catch((err) => {
        console.log(err);
      });
  }

  useEffect(() => {
    setData(users);
  }, [users]);

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
        setX(0);
        setY(0);
      }
    }, 300);
  }, [out, pass]);

  useEffect(() => {
    setStack(data.slice(0, 3).reverse());
    setUser(data[0]);
  }, [data]);

  function handleVote(e) {
    setChoice(user);
    if (e.target.id === 'digg') {
      setOut(user.user_id);
      setRelationship(currentUser, user, true);
      if (user.user1_choice === true) {
        setMatch(true);
      }
    } else {
      setRelationship(currentUser, user, false);
      setPass(user.user_id);
    }
  }

  function handleContinue() {
    setMatch(false);
  }

  function dragHandler(e, data) {
    setX(data.x);
    setY(data.y);
    if (data.x > 150) {
      handleVote({ target: { id: 'digg' } });
    } else if (data.x < -150) {
      handleVote({ target: { id: 'pass' } });
    }
  }

  function upHandler(e, data) {
    if (data.x < 150 && data.x > -150) {
      setX(0);
      setY(0);
    }
  }

  return (
    <div>
      {match ? (
        <div className={matchOut ? 'match-out' : ''}>
          <Match handleContinue={handleContinue} user1={currentUser} user2={choice} />
        </div>
      ) : null}
      <div className="discover-cardview-parent">
        {stack.length > 0 ? (
          <div className="card-stack">
            {stack.map((user, index) => {
              if (index === stack.length - 1) {
                return (
                  <Draggable
                    key={`user${user.user_id}`}
                    position={{ x: x, y: y }}
                    onDrag={dragHandler}
                    onStop={upHandler}
                    axis="x"
                  >
                    <div
                      id="test"
                      key={`user${user.user_id}`}
                      className={`profile-card
                        ${out === user.user_id ? 'unmount' : ''}
                        ${pass === user.user_id ? 'pass-unmount' : ''}
                        ${front === user.user_id ? 'mount' : ''}
                        ${back === user.user_id ? 'back-mount' : ''}
                        ${index === 0 ? 'back' : ''}
                      `}
                    >
                      <div className="card-wrapper">
                        <ProfileCard user={user} />
                      </div>
                    </div>
                  </Draggable>
                );
              }
              return (
                <div
                  key={`user${user.user_id}`}
                  className={`profile-card
                    ${out === user.user_id ? 'unmount' : ''}
                    ${pass === user.user_id ? 'pass-unmount' : ''}
                    ${front === user.user_id ? 'mount' : ''}
                    ${back === user.user_id ? 'back-mount' : ''}
                    ${index === 0 ? 'back' : ''}
                  `}
                >
                  <div className="card-wrapper">
                    <ProfileCard user={user} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Blank />
        )}
        <div className="buttons">
          <button
            id="pass"
            type="button"
            className="btn btn-active btn-accent vote-button pass"
            onClick={handleVote}
          >
            Pass
          </button>
          <button
              id="digg"
              type="button"
              className="btn btn-active btn-primary vote-button digg"
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
