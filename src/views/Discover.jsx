import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';

const Discover = () => {
  <h3 id="discovery">Discover</h3>;

  const { authState, oktaAuth } = useOktaAuth();
  const [userInfo, setUserInfo] = useState(null);
  // const [messages, setMessages] = useState(null);

  useEffect(() => {
    if (!authState || !authState.isAuthenticated) {
      setUserInfo(null);
    } else {
      oktaAuth
        .getUser()
        .then((info) => {
          setUserInfo(info);
          console.log(info);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [authState, oktaAuth]);

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      Welcome, &nbsp;{userInfo.name}! This is the discover page and you are here because you are
      logged in.
    </div>
  );
  // return <div>This is the discover page and you are here because you are logged in.</div>;
};

export default Discover;
