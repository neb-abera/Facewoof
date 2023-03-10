import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation, useHistory, Redirect } from 'react-router-dom';
// import './node_modules@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { useOktaAuth } from '@okta/okta-react';
import '../components/Login/Login.css';
import axios from 'axios';
import OktaSignInWidget from '../components/Login/OktaSignInWidget';
import { oktaConfig } from '../../oktaConfig';
// import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm';
import useUserContext from '../hooks/useUserContext';

const Login = () => {
  const { loggedIn } = useUserContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authState || !authState.isAuthenticated) {
      // When user isn't authenticated, forget any user info
      setLoggedIn(false);
      setUserId(null);
      setUserData(null); // should it be null or {}
      // setUserInfo(null);
    } else {
      oktaAuth
        .getUser()
        .then((info) => {
          setLoggedIn(true);

          // uncomment this axios request section to activate demo using user 7
          axios
            .put('/api/authuser', { email: 'pyekel6@marketwatch.com', name: 'Abdel Dandie' })
            .then((res) => {
              // console.log('response from db query', res.data);
              const user = {
                user_id: res.data.user_id,
                dog_name: res.data.dog_name,
                owner_name: res.data.owner_name,
                owner_first_name: info.given_name,
                owner_last_name: info.family_name,
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

          // uncomment the below to activate production (user creation and redirect to signup page)
          // const name = `${info.given_name} ${info.family_name}`;
          // // check if there is a user with a matching email
          // axios.put('/api/authuser', { email: info.email, name: name }).then((res) => {
          //   if (res.data.age !== null) {
          //     // need to verify what returns to indicate user exists and if it contains correct data
          //     setFirstLogin(false);
          //     // console.log('response from db query', res.data);
          //     setUserId(res.data.user_id);
          //     const user = {
          //       user_id: res.data.user_id,
          //       dog_name: res.data.dog_name,
          //       owner_name: res.data.owner_name,
          //       owner_first_name: info.given_name,
          //       owner_last_name: info.family_name,
          //       dog_breed: res.data.dog_breed,
          //       age: res.data.age,
          //       vaccination: res.data.vaccination,
          //       discoverable: res.data.discoverable,
          //       owner_email: res.data.owner_email,
          //       location: res.data.location,
          //       likes_one: res.data.likes_one,
          //       likes_two: res.data.likes_two,
          //       likes_three: res.data.likes_three
          //     };
          //     setUserData(user);
          //     history.push('/discover');
          //   } else {
          //     // if user hasn't filled signup form, redirect to signup page
          //     setFirstLogin(true);
          //     const user = {
          //       user_id: res.data.user_id,
          //       owner_name: name,
          //       owner_first_name: info.given_name,
          //       owner_last_name: info.family_name,
          //       owner_email: info.email
          //     };
          //     setUserId(res.data.user_id);
          //     setUserData(user);
          //     history.push('/signup');
          //   }
          // });
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [authState, oktaAuth, loggedIn]); // says setLoggedIn is missing from deps but it shouldn't be

  const onError = (err) => {
    console.log('Sign in error', err);
  };

  if (!authState) {
    return <div>Loading...</div>;
  }

  return authState.isAuthenticated ? (
    <Redirect to={{ pathname: '/' }} />
  ) : (
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
        <OktaSignInWidget config={config} onSuccess={onSuccess} onError={onError} />
      </div>
    </div>
  );
};

export default Login;
