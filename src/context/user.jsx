import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const UserContext = createContext();

// A signed-in guest survives a page refresh: without this every reload would
// mint a new throwaway account and lose whatever the visitor had swiped.
const STORAGE_KEY = 'facewoof.userId';

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

  // Rehydrate the profile behind a stored id, and drop the id if the account
  // has since been swept up by the guest cleanup.
  useEffect(() => {
    if (userId === null || userData !== null) return;

    axios
      .get('/api/currentuser', { params: { userId } })
      .then(({ data }) => {
        if (data && data.length) setUserData(data[0]);
        else setUserId(null);
      })
      .catch(() => setUserId(null));
  }, [userId, userData]);

  const signInAsGuest = useCallback(async () => {
    setAuthenticating(true);
    try {
      const { data } = await axios.post('/api/auth/guest');
      setUserData(data);
      setUserId(data.user_id);
      setFirstLogin(true);
      return data;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
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
      logout
    ]
  );

  return <UserContext.Provider value={valueToShare}>{children}</UserContext.Provider>;
};

UserProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default UserContext;
