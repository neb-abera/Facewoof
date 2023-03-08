/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import CardStack from '../components/Discover/CardStack';
import { useOktaAuth } from '@okta/okta-react';

export default function Discover() {
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

  if (!userInfo) {
    return <div>Loading...</div>;
  }

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

  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div>
      // remove after testing
      <div>
        Welcome, &nbsp;{userInfo.name}! This is the discover page and you are here because you are
        logged in.
      </div>
      <CardStack users={users} />
    </div>
  );
}
