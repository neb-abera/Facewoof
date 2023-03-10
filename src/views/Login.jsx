import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';
// import './node_modules@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { useOktaAuth } from '@okta/okta-react';
import '../components/Login.css';
import { Redirect } from 'react-router-dom';
import OktaSignInWidget from './OktaSignInWidget';
import { oktaConfig } from '../../oktaConfig';
// import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm';
import useUserContext from '../hooks/useUserContext';
import dogImage from '../assets/dog.jpg';

const Login = ({ config }) => {
  const { oktaAuth, authState } = useOktaAuth();
  const history = useHistory();
  const onSuccess = (tokens) => {
    oktaAuth.handleLoginRedirect(tokens);
  };
  const [userEmail, setUserEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { loggedIn, setLoggedIn, setUserId, setUserData } = useUserContext();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!authState || !authState.isAuthenticated) {
      // When user isn't authenticated, forget any user info
      setLoggedIn(false);
      setUserInfo(null);
    } else {
      oktaAuth
        .getUser()
        .then((info) => {
          setUserInfo(info);
          setLoggedIn(true);
          setUserEmail(info.email);
          setFirstName(info.given_name);
          setLastName(info.family_name);
          history.push('/discover');

          // check if there is a user with a matching email
          // if yes
          // set userId, send them to discover page
          // if no
          // create userId with info, send them to signup page
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
