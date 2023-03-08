import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import useUserContext from '../../hooks/useUserContext';

const Navbar = () => {
  const location = useLocation();
  const [navBarStyle, setNavBarStyle] = useState(null);
  const { loggedIn } = useUserContext();

  const test = () => {
    axios
      .get(`/api/discover`, {
        params: {
          id: 7,
          zipcode: 10017,
          radius: 5,
          count: 5
        }
      })
      .then((res) => console.log(res))
      .catch((err) => console.log(err));
  };

  test();

  useEffect(() => {
    if (location.pathname === '/') {
      setNavBarStyle({
        display: 'none'
      });
    }
  }, [location]);

  return (
    <div className="navbar bg-base-100 px-10" style={navBarStyle}>
      <div className="navbar-start">
        <a className="btn btn-ghost normal-case text-xl text-[#bb7c7c]">Diggr</a>
      </div>
      <div className="navbar-center hidden lg:flex text-primary">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/discover">Discover</Link>
          </li>
          <li>
            <Link to="/discover">Pack Feed</Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end space-x-5">
        {!loggedIn ? (
          <>
            <a className="btn btn-secondary">Login</a>
            <a className="btn btn-primary">Sign Up</a>
          </>
        ) : (
          <a className="btn btn-secondary">Logout</a>
        )}
      </div>
    </div>
  );
};

export default Navbar;
