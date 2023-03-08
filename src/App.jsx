/* eslint-disable react/jsx-indent-props */
import React from 'react';
import { BrowserRouter as Router, Switch, Route, useHistory } from 'react-router-dom';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security, LoginCallback, SecureRoute } from '@okta/okta-react';
import { oktaConfig } from '../oktaConfig';
import Home from './views/Home';
import Login from './views/Login';
import './App.css';
import Discover from './views/Discover';
import Locked from './views/Locked';

const oktaAuth = new OktaAuth(oktaConfig.oidc);

const App = () => {
  const history = useHistory();

  const customAuthHandler = () => {
    history.push('/login');
  };

  const restoreOriginalUri = async (_oktaAuth, originalUri) => {
    history.replace(toRelativeUrl(originalUri || '', window.location.origin));
  };

  const CALLBACK_PATH = '/login/callback';
  // console.log('oktaAuth', oktaAuth);
  return (
    <div className="App">
      <header className="App-header">
        <p>Diggr web application</p>
        <Security
          oktaAuth={oktaAuth}
          onAuthRquired={customAuthHandler}
          restoreOriginalUri={restoreOriginalUri}
        >
          <Route path="/" exact component={Home} />
          <Route path="/login" render={() => <Login />} />
          <Route path={CALLBACK_PATH} componenet={LoginCallback} />
          <SecureRoute path="/locked" componenet={Locked} />
          <SecureRoute path="/discover" componenet={Discover} />
        </Security>
      </header>
    </div>
  );
};

export default App;
