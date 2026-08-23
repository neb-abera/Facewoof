import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import PackFeed from './views/PackFeed';
import PlaydateCalendar from './views/Calendar';
import Profile from './views/Profile';
import Welcome from './views/Welcome';
import './App.css';
import Navbar from './components/Navbar/Navbar';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import useUserContext from './hooks/useUserContext';

/*
 * Send anyone without a session to the sign-in page, and anyone who has not
 * finished setting up to the welcome screen.
 *
 * Only an account created by signing in with a provider is ever unfinished: a
 * demo account is cloned from the template and arrives complete. Without this
 * they landed on an empty discover feed, because nothing had put any dogs near
 * them and nothing had asked where they were.
 *
 * userData is null while the profile is still loading, and sending someone to
 * onboarding on the strength of not knowing yet would flash the wrong screen
 * at every returning visitor.
 */
const RequireUser = ({ children }) => {
  const { loggedIn, userData } = useUserContext();
  if (!loggedIn) return <Navigate to="/login" replace />;
  if (userData && !userData.onboarded_at) return <Navigate to="/welcome" replace />;
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

RequireUser.propTypes = {
  children: PropTypes.node.isRequired
};

const App = () => (
  <div className="App">
    <header className="App-header">
      <Navbar />
      {/* react-router 5's <Route path> matched by prefix and rendered every
          match. v7 matches one route, so `exact` is gone and each route names
          its element. */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* Deliberately outside RequireUser's onboarding check, which would
            otherwise redirect this route to itself. */}
        <Route path="/welcome" element={<Welcome />} />
        <Route
          path="/discover"
          element={
            <RequireUser>
              <Discover />
            </RequireUser>
          }
        />
        <Route
          path="/packFeed"
          element={
            <RequireUser>
              <PackFeed />
            </RequireUser>
          }
        />
        <Route
          path="/calendar"
          element={
            <RequireUser>
              <PlaydateCalendar />
            </RequireUser>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireUser>
              <Profile />
            </RequireUser>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </header>
  </div>
);

export default App;
