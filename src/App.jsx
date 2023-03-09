/* eslint-disable react/jsx-indent-props */
import React from 'react';
import { BrowserRouter as Router, Route, useHistory, useLocation } from 'react-router-dom'; // useLocation was here
import { OktaAuth, toRelativeUrl } from '@okta/okta-auth-js';
import { Security, LoginCallback, SecureRoute } from '@okta/okta-react';
import { oktaConfig } from '../oktaConfig';
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import PlaydateCalendar from './views/Calendar';
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
// import Playdate from './components/Calendar/EditPlaydate';

  const location = useLocation();
  const background = location.state && location.state.background;

  return (
    <div className="App">
      <header className="App-header">
        {/* <Routes location={background || location}> */}
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
            {/* <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/calendar" element={<PlaydateCalendar />} /> */}
            {/* <SecureRoute path="/locked" exact componenet={Locked} />
            <SecureRoute path="/discover" exact componenet={Discover} /> */}
          </Security>
        </Router>
      </header>
    </div>
  );
};
};

export default App;
