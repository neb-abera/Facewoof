import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import dogImage from '../assets/dog.jpg';
import '../components/Login/Login.css';
import useUserContext from '../hooks/useUserContext';

/*
 * Sign-in.
 *
 * The version this replaces fired an axios PUT for a hard coded account in the
 * component body, so it ran on every render and looped, and every visitor was
 * signed in as the same person. Signing in is now something the visitor asks
 * for, and each one gets their own throwaway account.
 */
const Login = () => {
  const { loggedIn, authenticating, signInAsGuest } = useUserContext();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  if (loggedIn) return <Navigate to="/discover" replace />;

  /*
   * Ask where the visitor is before creating the demo, so the roster can be
   * put next to them.
   *
   * Asked here rather than on the discover page because this is the click that
   * starts the demo, so a permission prompt is expected rather than a surprise.
   * Declining is fine and costs a few seconds at most: the demo falls back to
   * its default city.
   */
  const askWhereTheyAre = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 600000 }
      );
    });

  const handleGuestSignIn = async () => {
    setError(null);
    try {
      const where = await askWhereTheyAre();
      await signInAsGuest(where);
      navigate('/discover');
    } catch (err) {
      console.error('guest sign in failed', err);
      setError('Could not start a demo session. Please try again.');
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="relative w-[600px] shrink-0 max-lg:hidden">
        <Link to="/" className="absolute top-4 left-4 px-12 py-2 bg-[#8d5426] rounded text-white">
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
