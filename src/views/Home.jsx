/* eslint-disable jsx-a11y/img-redundant-alt */
/* eslint-disable react/jsx-indent-props */
import React from 'react';
import { Link } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
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
        <div className="loading-discover items-center justify-center">
          <FaDog className="loading-dog1" />
          <FaDog className="loading-dog2" />
        </div>
      </div>
    </div>
  );
};

export default Home;
