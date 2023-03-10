import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
// import './node_modules@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { useOktaAuth } from '@okta/okta-react';
import '../components/Login.css';
import { Redirect } from 'react-router-dom';
import axios from 'axios';
import OktaSignInWidget from './OktaSignInWidget';
import { oktaConfig } from '../../oktaConfig';
// import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm';
import useUserContext from '../hooks/useUserContext';
import dogImage from '../assets/dog.jpg';

axios.defaults.baseURL = 'http://localhost:3001';

const Login = ({ config }) => {
  const { oktaAuth, authState } = useOktaAuth();
  const history = useHistory();
  const onSuccess = (tokens) => {
    oktaAuth.handleLoginRedirect(tokens);
  };

  const { loggedIn, setLoggedIn, setUserId, setUserData, setFirstLogin } = useUserContext();
  // const [userInfo, setUserInfo] = useState(null);

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
          // info.given_name, info.family_name, info.email are all available
          setLoggedIn(true);

          // comment this out to activate user creation and redirect to signup page
          const user = {
            user_id: 7,
            owner_name: `${info.given_name} ${info.family_name}`,
            owner_first_name: info.given_name,
            owner_last_name: info.family_name,
            owner_email: info.email,
            location: '10017'
          };
          setUserId(7);
          setUserData(user);
          history.push('/discover');

          // uncomment the below out to activate user creation and redirect to signup page
          // const name = `${info.given_name} ${info.family_name}`;
          // // check if there is a user with a matching email
          // axios.put('/api/authuser', { params: { email: info.email, name: name } }).then((res) => {
          //   if (res.data === 'user exists') {
          //     // need to verify what returns to indicate user exists and if it contains correct data
          //     setUserId(res.data.id);
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
          //     // if user doesn't exist, redirect to signup page
          //     const user = {
          //       user_id: res.data.user_id,
          //       owner_name: name,
          //       owner_first_name: info.given_name,
          //       owner_last_name: info.family_name,
          //       owner_email: info.email
          //     };
          //     setFirstLogin(true);
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
