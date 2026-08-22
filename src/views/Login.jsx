import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import dogImage from '../assets/dog.jpg';
import '../components/Login/Login.css';
import useUserContext from '../hooks/useUserContext';
import useGuestSignIn from '../hooks/useGuestSignIn';

/*
 * Sign-in.
 *
 * The version this replaces fired an axios PUT for a hard coded account in the
 * component body, so it ran on every render and looped, and every visitor was
 * signed in as the same person. Signing in is now something the visitor asks
 * for, and each one gets their own throwaway account.
 */
const Login = () => {
  const { loggedIn, authenticating } = useUserContext();
  const { start: handleGuestSignIn, error } = useGuestSignIn();

  if (loggedIn) return <Navigate to="/discover" replace />;

  return (
    <div className="flex h-screen w-screen">
      <div className="relative w-[600px] shrink-0 max-lg:hidden">
        <Link
          to="/"
          className="absolute top-4 left-4 px-12 py-2 bg-primary rounded text-primary-content"
        >
          Facewoof
        </Link>
        <img className="w-full h-full object-cover" src={dogImage} alt="A dog in a park" />
      </div>

      <div className="flex flex-col flex-1 space-y-6 px-12 items-center justify-center">
        {authenticating ? (
          <div className="loading-discover items-center justify-center">
            <FaDog className="loading-dog1" />
            <FaDog className="loading-dog2" />
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6 max-w-md text-center">
            <h1 className="text-4xl font-bold">Welcome to Facewoof</h1>
            <p className="opacity-80">
              Find dogs near you, form a pack, and plan a playdate. Try the whole app with a demo
              account &mdash; no sign-up, nothing to remember.
            </p>
            <button type="button" className="btn btn-primary btn-wide" onClick={handleGuestSignIn}>
              Try the demo
            </button>
            {error && <p className="text-error text-sm">{error}</p>}
            <p className="text-xs opacity-60">
              We&apos;ll ask for your location so the demo can show dogs near you. Declining is
              fine. Demo accounts and anything posted from them are deleted after 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
