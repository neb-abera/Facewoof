/* eslint-disable react/prop-types */
import React, { createContext, useState, useMemo, useCallback } from 'react';
// import axios from 'axios';

const PlaydateContext = createContext();

export const PlaydateProvider = ({ children }) => {
  const [playdates, setPlaydates] = useState([]);
  const [packs, setPacks] = useState([]);

  const handleAddPlaydate = (playdateObj) => {
    setPlaydates((prev) => [...prev, playdateObj]);
  };

  // if this doesn't work try useCallback on the axios call instead

  // const playdateMemo = useMemo(() => ({ playdates: playdates }));
  // const packMemo = useMemo(() => ({ packs: packs }));
  // const setPlaydateCallback = useCallback(() => ({ setPlaydates: setPlaydates }));
  // const handlePlaydateCallback = useCallback((playdateObj) => {
  //   setPlaydates((prev) => [...prev, playdateObj]);
  // });
  // const setPacksCallback = useCallback(() => ({ setPacks: setPacks }));
  // any componenet that we wrap around is going to have access to the value prop
  return (
    <PlaydateContext.Provider
        value={{
        playdates,
        setPlaydates,
        handleAddPlaydate: handleAddPlaydate,
        packs,
        setPacks
      }}
    >
      {children}
    </PlaydateContext.Provider>
  );
};

export default PlaydateContext;
