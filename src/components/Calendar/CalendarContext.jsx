/* eslint-disable react/prop-types */
import React, { createContext, useState } from 'react';

const PlaydateContext = createContext();

export const PlaydateProvider = ({ children }) => {
  const [playdates, setPlaydates] = useState([]);
  const [packs, setPacks] = useState([]);

  const handleAddPlaydate = (playdateObj) => {
    setPlaydates((prev) => [...prev, playdateObj]);
  };

  // any componenet that we wrap around is going to have access to the value prop
  return (
    <PlaydateContext.Provider
      value={{
      playdates,
      handleAddPlaydate: handleAddPlaydate,
      packs,
      setPacks
    }}>
      {children}
    </PlaydateContext.Provider>
  );
};

export default PlaydateContext;
