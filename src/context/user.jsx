/* eslint-disable object-shorthand */
import React, { useState, createContext } from 'react';

const UserContext = createContext();

// eslint-disable-next-line react/prop-types
export const UserProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [friends, setFriends] = useState([]);
  const [packs, setPacks] = useState([]);

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const valueToShare = {
    loggedIn,
    setLoggedIn,
    photos,
    setPhotos,
    friends,
    setFriends,
    packs,
    setPacks
  };

  return <UserContext.Provider value={valueToShare}>{children}</UserContext.Provider>;
};

export default UserContext;
