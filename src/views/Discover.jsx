/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useOktaAuth } from '@okta/okta-react';
import CardStack from '../components/Discover/CardStack';

const Discover = () => {
  const [users, setUsers] = useState([]);
  const { authState, oktaAuth } = useOktaAuth();
  const [userInfo, setUserInfo] = useState(null);

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

  function getUsers(user) {
    // console.log('making request');
    axios
      .get('/api/discover', {
        params: {
          id: 1,
          zipcode: 10017,
          radius: 5,
          count: 1000
        }
      })
      .then((results) => {
        // console.log('User list:', results);
        setUsers(results);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  if (!userInfo) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <CardStack users={users} />
    </div>
  );
};

export default Discover;
