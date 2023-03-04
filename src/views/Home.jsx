import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
const Home = () => {

  return (
    <div className="container flex space-x-12">
      <div className="relative">
        <Link to='/' className="absolute top-4 left-4 border border-0 px-12 py-2 bg-[#7e22ce] text-white">Diggr</Link>
        <img
          className="h-screen"
          src="https://images.unsplash.com/photo-1591608971358-f93643d11763?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=764&q=80"
          alt="dog-image"
        />
      </div>
      <AuthForm action="signup" />
    </div>
  );
};

export default Home;
