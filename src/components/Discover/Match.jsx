/* eslint-disable react/prop-types */
import React from 'react';
import './match.css';

export default function Match({ user1, user2, handleContinue }) {
  user1 = user1 || {
    userId: 3,
    profile_photo: 'https://i.ibb.co/k4rMVRK/dog-puppy-on-garden-royalty-free-image-1586966191.jpg',
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
    bio: 'If a dog chews shoes whose shoes does he choose?'
  };
  user2 = user2 || {
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
    bio: 'If a dog chews shoes whose shoes does he choose?'
  };

  return (
    <div className="match-parent">
      <h1 className="match-title">It&apos;s a match!</h1>
      <h2 className="match-subtitle">Now you can add {user2.dogName} to a pack!</h2>
      <div className="match-images">
        <img className="w-full primary-user" src={user1.profile_photo} alt="Doggy" />
        <img className="w-full secondary-user" src={user2.profile_photo} alt="Doggy" />
      </div>
      <div className="match-buttons">
        <button className="btn btn-active btn-primary" type="button" onClick={handleContinue}>
          Keep searching
        </button>
        <button className="btn btn-active btn-primary" type="button">
          Add to Pack
        </button>
      </div>
    </div>
  );
}
