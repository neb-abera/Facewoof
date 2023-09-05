import React, { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import dogImage from '../assets/dog.jpg';
import '../components/Login/Login.css';
import { useHistory } from 'react-router-dom';
import useUserContext from '../hooks/useUserContext';
import axios from 'axios';

// eslint-disable-next-line react/prop-types
const Login = ({ config }) => {
  const { setUserData, setUserId, setFirstLogin } = useUserContext();
  const history = useHistory();

  axios
    .put('/api/authuser', { email: 'pyekel6@marketwatch.com', name: 'Abdel Dandie' })
    .then((res) => {
      const user = {
        user_id: res.data.user_id,
        dog_name: res.data.dog_name,
        owner_name: res.data.owner_name,
        owner_first_name: 'Abdel',
        owner_last_name: 'Dandie',
        dog_breed: res.data.dog_breed,
        age: res.data.age,
        vaccination: res.data.vaccination,
        discoverable: res.data.discoverable,
        owner_email: res.data.owner_email,
        location: res.data.location,
        likes_one: res.data.likes_one,
        likes_two: res.data.likes_two,
        likes_three: res.data.likes_three
      };
      setUserId(res.data.user_id);
      setUserData(user);
      setFirstLogin(false);
      history.push('/discover');
    });

  return (
    <div className="flex h-screen w-screen">
      <div className="relative w-[600px]">
        <Link
          to="/"
          className="absolute top-4 left-4 border border-0 px-12 py-2 bg-[#8d5426] rounded text-white"
        >
          Diggr
        </Link>
        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
        <img className="w-full h-full" src={dogImage} alt="dog-image" />
      </div>
      <div
        className="flex flex-col space-y-5 px-12 items-center justify-center"
        style={{ width: `--webkit-calc(100% - 600px)` }}
      >
        {true ? (
          <div className="loading-discover items-center justify-center">
            <FaDog className="loading-dog1" />
            <FaDog className="loading-dog2" />
          </div>
        ) : (
          <div>Here's where the login widget goes</div>
        )}
      </div>
    </div>
  );
};

export default Login;
