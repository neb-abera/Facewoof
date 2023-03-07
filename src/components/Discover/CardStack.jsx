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
  const exData = [
    {
      userId: 1,
      profile_photo:
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
      photos: [
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
        'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg'
      ],
      dogName: '1',
      ownerName: 'Jermain',
      age: '6 months',
      breed: 'Golden Retriever',
      vaccination: true,
      interests: ['squirrels', 'bones', 'long walks'],
      bio: 'If a dog chews shoes whose shoes does he choose?',
      user1Choice: null
    },
    {
      userId: 2,
      profile_photo: 'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg',
      photos: [
        'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg',
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg'
      ],
      dogName: '2',
      ownerName: 'Jermain',
      age: '6 months',
      breed: 'Golden Retriever',
      vaccination: true,
      interests: ['squirrels', 'bones', 'long walks'],
      bio: 'If a dog chews shoes whose shoes does he choose?',
      user1Choice: null
    },
    {
      userId: 3,
      profile_photo:
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
      photos: [
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
        'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg'
      ],
      dogName: '3',
      ownerName: 'Jermain',
      age: '6 months',
      breed: 'Golden Retriever',
      vaccination: true,
      interests: ['squirrels', 'bones', 'long walks'],
      bio: 'If a dog chews shoes whose shoes does he choose?',
      user1Choice: true
    },
    {
      userId: 4,
      profile_photo: 'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg',
      photos: [
        'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg',
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg'
      ],
      dogName: '4',
      ownerName: 'Jermain',
      age: '6 months',
      breed: 'Golden Retriever',
      vaccination: true,
      interests: ['squirrels', 'bones', 'long walks'],
      bio: 'If a dog chews shoes whose shoes does he choose?',
      user1Choice: null
    },
    {
      userId: 5,
      profile_photo:
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
      photos: [
        'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
        'https://i.ibb.co/VCX4GWs/KOA-Nassau-2697x1517.jpg'
      ],
      dogName: '5',
      ownerName: 'Jermain',
      age: '6 months',
      breed: 'Golden Retriever',
      vaccination: true,
      interests: ['squirrels', 'bones', 'long walks'],
      bio: 'If a dog chews shoes whose shoes does he choose?',
      user1Choice: null
    }
  ];

  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);

  const [data, setData] = useState(exData);
  const [stack, setStack] = useState([]);
  const [user, setUser] = useState(null);

  const [out, setOut] = useState(null);
  const [pass, setPass] = useState(null);

  const [choice, setChoice] = useState(null);
  const [match, setMatch] = useState(false);
  const [matchOut, setMatchOut] = useState(false);

  useEffect(() => {
    // if (users === undefined) {
    //   setData(exData);
    // } else {
    //   setData(users);
    // }
  }, []);

  useEffect(() => {
    if (data.length > 1 && (out !== null || pass !== null)) {
      setFront(data[1].userId);
    }
    if (data.length > 2 && (out !== null || pass !== null)) {
      setBack(data[2].userId);
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
      setOut(user.userId);
    } else {
      setPass(user.userId);
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
                  key={`user${user.userId}`}
                  className={`profile-card
                    ${out === user.userId ? 'unmount' : ''}
                    ${pass === user.userId ? 'pass-unmount' : ''}
                    ${front === user.userId ? 'mount' : ''}
                    ${back === user.userId ? 'back-mount' : ''}
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
