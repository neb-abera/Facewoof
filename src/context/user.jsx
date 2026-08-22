import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const UserContext = createContext();

// A signed-in guest survives a page refresh: without this every reload would
// mint a new throwaway account and lose whatever the visitor had swiped.
const STORAGE_KEY = 'facewoof.userId';
// Whether the location we are searching from came from the device or is a
// stand-in. Persisted so a refresh does not silently forget that the feed is
// only a sample.
const SOURCE_KEY = 'facewoof.locationSource';

const readStoredUserId = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  } catch {
    // Private browsing modes can throw on localStorage access.
    return null;
  }
};

export const UserProvider = ({ children }) => {
  const [userId, setUserId] = useState(readStoredUserId);
  const [userData, setUserData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [friends, setFriends] = useState([]);
  const [packs, setPacks] = useState([]);
  const [playdates, setPlaydates] = useState([]);
  const [firstLogin, setFirstLogin] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [locationSource, setLocationSource] = useState(() => {
    try {
      return window.localStorage.getItem(SOURCE_KEY) || 'fallback';
    } catch {
      return 'fallback';
    }
  });

  // `loggedIn` was a useState initialised to true, so the app rendered its
  // signed-in navigation to visitors who had never signed in. It follows from
  // whether there is a user now.
  const loggedIn = userId !== null;

  useEffect(() => {
    try {
      if (userId === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(userId));
    } catch {
      // Nothing to do: the session just will not survive a refresh.
    }
  }, [userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOURCE_KEY, locationSource);
    } catch {
      // As above.
    }
  }, [locationSource]);

  // Rehydrate the profile behind a stored id, and drop the id if the account
  // has since been swept up by the guest cleanup.
  useEffect(() => {
    if (userId === null || userData !== null) return;

    axios
      .get('/api/auth/me')
      .then(({ data }) => {
        if (data && data.length) setUserData(data[0]);
        else setUserId(null);
      })
      .catch(() => setUserId(null));
  }, [userId, userData]);

  // `where` is an optional { lat, lng } or { zip }: the demo roster is created
  // next to it, so the visitor sees dogs near them rather than in New York.
  const signInAsGuest = useCallback(async (where) => {
    setAuthenticating(true);
    try {
      // The response sets the session cookie; the body is the new profile.
      const { data } = await axios.post('/api/auth/guest', where || {});
      setUserData(data);
      setUserId(data.user_id);
      setLocationSource(where ? 'device' : 'fallback');
      setFirstLogin(true);
      return data;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  /*
   * Move the account to where the device says it is.
   *
   * Someone who declined the prompt at sign-in is looking at a sample rather
   * than their own neighbourhood. This is how they fix that, without having to
   * type an address into their profile.
   */
  const provideLocation = useCallback(
    async (where) => {
      if (!userId || !where) return null;
      const { data } = await axios.put('/api/location', where);
      setUserData((prev) => (prev ? { ...prev, location: data.location } : prev));
      setLocationSource('device');
      return data.location;
    },
    [userId]
  );

  const logout = useCallback(() => {
    // Tell the server to drop the cookie as well; clearing local state alone
    // would leave a valid session behind.
    axios.post('/api/auth/logout').catch(() => {});
    setUserId(null);
    setUserData(null);
    setPhotos([]);
    setFriends([]);
    setPacks([]);
    setPlaydates([]);
    setFirstLogin(false);
  }, []);

  const handleSetPlaydates = useCallback((arr) => {
    setPlaydates((prev) => [...prev, arr]);
  }, []);

  const valueToShare = useMemo(
    () => ({
      userId,
      setUserId,
      userData,
      setUserData,
      loggedIn,
      photos,
      setPhotos,
      friends,
      setFriends,
      packs,
      setPacks,
      playdates,
      setPlaydates,
      handleSetPlaydates,
      firstLogin,
      setFirstLogin,
      authenticating,
      signInAsGuest,
      locationSource,
      provideLocation,
      logout
    }),
    [
      userId,
      userData,
      loggedIn,
      photos,
      friends,
      packs,
      playdates,
      handleSetPlaydates,
      firstLogin,
      authenticating,
      signInAsGuest,
      locationSource,
      provideLocation,
      logout
    ]
  );

  return <UserContext.Provider value={valueToShare}>{children}</UserContext.Provider>;
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default UserContext;
