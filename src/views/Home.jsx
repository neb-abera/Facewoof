import React from 'react';
import { Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm';
import dogImage from '../assets/dog.jpg';

const Home = () => {
  return (
    <div className="flex h-screen w-screen">
      <div className="relative w-[600px]">
        <Link
          to="/"
          className="absolute top-4 left-4 border border-0 px-12 py-2 bg-[#8d5426] rounded text-white"
        >
          Diggr
        </Link>
        <img className="w-full h-full" src={dogImage} alt="dog-image" />
      </div>
      <div
        className="flex flex-col space-y-5 px-12 items-center justify-center"
        style={{ width: `--webkit-calc(100% - 600px)` }}
      >
        <h3 className="text-2xl text-center text-[#bb7c7c] font-medium my-3">Create An Account</h3>
        <AuthForm action="signup" />
        <p className="text-center text-[#bb7c7c]">
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
