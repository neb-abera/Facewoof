/* eslint-disable react/jsx-indent-props */
import React from 'react';
import { BrowserRouter as Router, Route, useHistory } from 'react-router-dom';
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security, LoginCallback, SecureRoute } from '@okta/okta-react';
import { oktaConfig } from '../oktaConfig';
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import Navbar from './components/Navbar/Navbar';
import './App.css';
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

  return (
    <div className="App">
      <header className="App-header">
        <Router>
          <Security
            oktaAuth={oktaAuth}
            onAuthRequired={customAuthHandler}
            restoreOriginalUri={restoreOriginalUri}
          >
            <Route path="/" exact component={Home} />
            <Route path="/login" render={() => <Login />} />
            <Route path={CALLBACK_PATH} componenet={LoginCallback} />
            <SecureRoute path="/locked" render={() => <Locked />} />
            <SecureRoute path="/discover" render={() => <Discover />} />
            {/* <SecureRoute path="/locked" exact componenet={Locked} />
            <SecureRoute path="/discover" exact componenet={Discover} /> */}
          </Security>
        </Router>
      </header>
    </div>
  );
};

export default App;
