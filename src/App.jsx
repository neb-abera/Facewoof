import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Home from './views/Home';
import Login from './views/Login';
import Discover from './views/Discover';
import PackFeed from './views/PackFeed';
import PlaydateCalendar from './views/Calendar';
import Profile from './views/Profile';
import './App.css';
import Navbar from './components/Navbar/Navbar';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import useUserContext from './hooks/useUserContext';

/* Send anyone without a session to the sign-in page. */
const RequireUser = ({ children }) => {
  const { loggedIn } = useUserContext();
  if (!loggedIn) return <Navigate to="/login" replace />;
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
