import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import OktaAuth from '@okta/okta-auth-js';

const Home = () => {
  const { authState, oktaAuth } = useOktaAuth();
  const history = useHistory();

  const login = () => oktaAuth.signInWithRedirect({ originalUri: '/discover' });
  function handleClick() {
    history(`/login`, {});
  }

  // return <div>this is a test of the home page</div>;
  if (!authState) {
    return <div>Loading...</div>;
    // eslint-disable-next-line no-else-return
  }

  const handleLogin = async () => history.push('/login');
  const handleLogout = async () => oktaAuth.signOut();

  return (
    <div className="home">
      <Link to="/">Home</Link> | &nbsp;
      <Link id="locked" to="/locked">
        Locked
      </Link>{' '}
      | &nbsp;
      {authState.isAuthenticated ? (
        <button id="logout-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      ) : (
        <button id="login-button" type="button" onClick={handleLogin}>
          Login
        </button>
      )}
    </div>
  );
};

export default Home;
