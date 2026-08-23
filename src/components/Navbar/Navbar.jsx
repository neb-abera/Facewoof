import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import useUserContext from '../../hooks/useUserContext';
import useAuthProviders from '../../hooks/useAuthProviders';
import Logo from '../../assets/facewoofLogo.png';
import './nav.css';

const links = [
  { to: '/discover', label: 'Discover' },
  { to: '/packFeed', label: 'Pack Feed' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/profile', label: 'Profile' }
];

// NavLink hands its className a match flag, which plain <Link> could not do,
// so the current page was never marked.
const navClass = ({ isActive }) => (isActive ? 'active' : undefined);

const Navbar = () => {
  const { loggedIn, logout, userData } = useUserContext();
  const providers = useAuthProviders();
  const navigate = useNavigate();

  // The original rendered a logout button that only console.logged, and hid
  // the whole bar by writing display:none into inline state from an effect.
  // Signed out visitors get the landing page's own header instead.
  if (!loggedIn) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="navbar bg-base-100 px-4 sm:px-10">
      <div className="navbar-start min-w-0">
        {/* Below lg the four links do not fit beside the brand and the logout
            button: the bar used to overlap itself and spill off the screen.
            They collapse into this menu instead. */}
        <div className="dropdown lg:hidden">
          <button type="button" tabIndex={0} className="btn btn-ghost px-2" aria-label="Menu">
            <FaBars />
          </button>
          <ul className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            {links.map(({ to, label }) => (
              <li key={to}>
                <NavLink to={to} className={navClass}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <img src={Logo} className="logo" alt="" />
        {/* The wordmark is the first thing to go when the bar runs out of
            room. A guest carries two buttons on the right rather than one, and
            below sm those plus the brand overlapped — the same spilling the
            links were collapsed to avoid. The logo still marks the way home. */}
        <Link
          to="/discover"
          className="btn btn-ghost normal-case text-xl text-primary px-2 hidden sm:inline-flex"
        >
          Facewoof
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex text-primary">
        <ul className="menu menu-horizontal px-3">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} className={navClass}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-end flex-none gap-2">
        {/*
          A demo visitor's only route to a real account.
          /login sends anyone already signed in to /discover, so without this a
          guest had no way to reach sign-in at all and their swipes, packs and
          playdates were always going to be deleted after 24 hours. Signing in
          from here claims the account they are already using.
        */}
        {userData?.is_guest && providers.length > 0 && (
          <a
            className="btn btn-primary btn-sm"
            href={`/api/auth/oidc/start?provider=${providers[0].id}`}
          >
            Save your account
          </a>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
};

export default Navbar;
