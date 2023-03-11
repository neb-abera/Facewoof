/* eslint-disable prettier/prettier */
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import { FaDog } from 'react-icons/fa';
import OktaSignInWidget from '../components/Login/OktaSignInWidget';
import useAuth from '../hooks/useAuth';
import dogImage from '../assets/dog.jpg';
import '../components/Login/Login.css';
import '../components/oktaWidget/css/okta-sign-in.min.css';

// eslint-disable-next-line react/prop-types
const Login = ({ config }) => {
  const { oktaAuth, authState } = useOktaAuth();
  const onSuccess = (tokens) => {
    oktaAuth.handleLoginRedirect(tokens);
  };

  const { loading, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [authState, oktaAuth]); // says setLoggedIn is missing from deps but it shouldn't be

  const onError = (err) => {
    console.log('Sign in error', err);
  };

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
        {
          loading ? (
            <div className="loading-discover items-center justify-center">
              <FaDog className="loading-dog1" />
              <FaDog className="loading-dog2" />
            </div>
          ) : <OktaSignInWidget config={config} onSuccess={onSuccess} onError={onError} />
        }

      </div>
    </div>
  );
};

export default Login;
