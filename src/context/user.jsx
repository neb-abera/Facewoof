/* eslint-disable object-shorthand */
import React, { useState, createContext } from 'react';

const UserContext = createContext();

// eslint-disable-next-line react/prop-types
export const UserProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(true);
  const [firstLogin, setFirstLogin] = useState(true); //set to true if first time logging in otherwise false
  const [userId, setUserId] = useState(null); // CHANGE TO NULL LATER
  const [userData, setUserData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [friends, setFriends] = useState([]); // friend Ids
  const [packs, setPacks] = useState([]); // packIds
  const [playdates, setPlaydates] = useState([]); // playDates Objects

  const handleSetPlaydates = (arr) => {
    setPlaydates((prev) => [...prev, arr]);
  };

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const valueToShare = {
    userId,
    setUserId,
    userData,
    setUserData,
    loggedIn,
    setLoggedIn,
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
    setFirstLogin
  };

  return <UserContext.Provider value={valueToShare}>{children}</UserContext.Provider>;
};

export default UserContext;
