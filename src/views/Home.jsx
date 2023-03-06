import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/login`, {});
  }
  function handleDevPackFeed() {
    navigate(`/packFeed`);
  }

  return (
    <div>
      <div className="text-cyan-400">Welcome to faceWoof!</div>
      <button type="button" onClick={handleClick}>
        Log in
      </button>
      <button type="button" onClick={handleDevPackFeed}>
        Dev Pack Feed
      </button>
    </div>
  );
};

export default Home;
