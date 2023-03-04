import React from 'react';
import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

const Home = () => {
  return (
    <div className="container flex space-x-12 items-center">
      <div className="relative">
        <Link
          to="/"
          className="absolute top-4 left-4 border border-0 px-12 py-2 bg-[#7e22ce] text-white"
        >
          Diggr
        </Link>
        <img
          className="h-screen"
          src="https://images.unsplash.com/photo-1591608971358-f93643d11763?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=764&q=80"
          alt="dog-image"
        />
      </div>
      <div className="w-2/5 flex flex-col space-y-5">
        <h3 className="text-2xl text-center text-gray-800">Create An Account</h3>
        <AuthForm action="signup" />
        <p className="text-center">
          Already Have An Account? &nbsp;
          <Link to="/login" className="font-bold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Home;
