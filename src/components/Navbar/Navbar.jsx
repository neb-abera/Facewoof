/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import useUserContext from '../../hooks/useUserContext';
import useAuth from '../../hooks/useAuth';
import Logo from '../../assets/diggrLogo3.png';
import './nav.css';

const Navbar = () => {
  const location = useLocation();
  const [navBarStyle, setNavBarStyle] = useState(null);
  const { loggedIn, setLoggedIn, userId } = useUserContext();
  const { oktaAuth } = useOktaAuth();
  // const [userInfo, setUserInfo] = useState(null);
  const { checkAuth } = useAuth();

  useEffect(() => {
    console.log('check auth', userId);
    if (!loggedIn || !userId) checkAuth();
  }, [loggedIn, userId]);

  const logout = () => {
    oktaAuth
      .signOut()
      .then(() => setLoggedIn(false))
      .catch((err) => console.log(err));
  };
  useEffect(() => {
    if ((location.pathname === '/' && !loggedIn) || (location.pathname === '/login' && !loggedIn)) {
      setNavBarStyle({
        display: 'none'
      });
    } else {
      setNavBarStyle(null);
    }
  }, [location, loggedIn]);
  return (
    <div className="navbar bg-base-100 px-10 navbar" style={navBarStyle}>
      <div className="navbar-start">
        <img src={Logo} className="logo" />
        <a className="btn btn-ghost normal-case text-xl text-[#BB7C7C]">Diggr</a>
      </div>
      {loggedIn && (
        <div className="navbar-center lg:flex text-primary">
          <ul className="menu menu-horizontal px-3">
            <li>
              <Link to="/discover">Discover</Link>
            </li>
            <li>
              <Link to="/packFeed">Pack Feed</Link>
            </li>
            <li>
              <Link to="/calendar">Calendar</Link>
            </li>
            <li>
              <Link to="/profile">Profile</Link>
            </li>
          </ul>
        </div>
      )}
      <div className="navbar-end space-x-5">
        {!loggedIn ? (
          <>
            <Link to="/login" className="btn btn-secondary btn-sm">
              Login
            </Link>
            <Link to="/" className="btn btn-primary btn-sm">
              Sign Up
            </Link>
          </>
        ) : (
          <a className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </a>
        )}
      </div>
    </div>
  );
};
export default Navbar;
