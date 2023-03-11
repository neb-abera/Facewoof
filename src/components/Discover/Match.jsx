/* eslint-disable react/prop-types */
import React from 'react';
import { useHistory } from 'react-router-dom';
import './match.css';

// eslint-disable-next-line react/function-component-definition
export default function Match({ user1, user2, handleContinue }) {
  const history = useHistory();

  function goToPack() {
    history.push('/packFeed');
  }

  return (
    <div className="match-parent">
      <h1 className="match-title">It&apos;s a match!</h1>
      <h2 className="match-subtitle">Now you can add {user2.dog_name} to a pack!</h2>
      <div className="match-images">
        <img className="w-full primary-user" src={user1.photos[0]} alt="Doggy" />
        <img className="w-full secondary-user" src={user2.photos[0]} alt="Doggy" />
      </div>
      <div className="match-buttons">
        <button className="btn btn-active btn-primary" type="button" onClick={handleContinue}>
          Keep searching
        </button>
        <button className="btn btn-active btn-primary" type="button" onClick={goToPack}>
          Add to Pack
        </button>
      </div>
    </div>
  );
}
