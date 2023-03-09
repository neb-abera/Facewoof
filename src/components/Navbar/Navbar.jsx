import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import useUserContext from '../../hooks/useUserContext';

const Navbar = () => {
  const location = useLocation();
  const [navBarStyle, setNavBarStyle] = useState(null);
  const { loggedIn, setLoggedIn } = useUserContext();

  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login');
  }, [loggedIn]);

  const logout = () => {
    setLoggedIn(false);
    navigate('/login');
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
    <div className="navbar bg-base-100 px-10" style={navBarStyle}>
      <div className="navbar-start">
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
