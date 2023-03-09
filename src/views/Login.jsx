import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
// import './node_modules@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { useOktaAuth } from '@okta/okta-react';
import '../components/Login.css';
import { Redirect } from 'react-router-dom';
import OktaSignInWidget from './OktaSignInWidget';
import { oktaConfig } from '../../oktaConfig';
// import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm/AuthForm';
import useUserContext from '../hooks/useUserContext';

const Login = ({ config }) => {
  const { oktaAuth, authState } = useOktaAuth();
  const onSuccess = (tokens) => {
    oktaAuth.handleLoginRedirect(tokens);
  };

  // const { loggedIn } = useUserContext();
  //  const navigate = useNavigate();

  //  useEffect(() => {
  //    if (loggedIn) {
  //      navigate('/discover');
  //    }
  //  }, [loggedIn]);

  const onError = (err) => {
    console.log('Sign in error', err);
  };

  if (!authState) {
    return <div>Loading...</div>;
  }

  return authState.isAuthenticated ? (
    <Redirect to={{ pathname: '/' }} />
  ) : (
    <OktaSignInWidget config={config} onSuccess={onSuccess} onError={onError} />
  );
};

export default Login;
