import React, { useState, useEffect } from 'react';
import { useLocation, Link, useHistory } from 'react-router-dom';
import useUserContext from '../../hooks/useUserContext';
import Logo from '../../assets/diggrLogo3.png';
import './nav.css';

const Navbar = () => {
  const location = useLocation();
  const [navBarStyle, setNavBarStyle] = useState(null);
  const { loggedIn, setLoggedIn } = useUserContext();

  const history = useHistory();

  useEffect(() => {
    history.push('/login');
  }, [loggedIn]);

  const logout = () => {
    setLoggedIn(false);
    history.push('/login');
  };

  useEffect(() => {
    if (location.pathname === '/' && !loggedIn) {
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
        <a className="btn btn-ghost normal-case text-xl text-[#bb7c7c]">Diggr</a>
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
