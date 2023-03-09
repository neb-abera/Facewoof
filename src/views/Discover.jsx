/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'; // useNavigate was on incoming
import { FaDog, FaBone } from 'react-icons/fa';
import axios from 'axios';
import { useOktaAuth } from '@okta/okta-react';
import CardStack from '../components/Discover/CardStack';
import useUserContext from '../hooks/useUserContext';
import './discover.css';

// eslint-disable-next-line react/function-component-definition
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
  const [loading, setLoading] = useState(false);

  const userContext = useUserContext();

  function getUsers(user) {
    axios
      .get('https://localhost:3001/api/discover', {
        params: {
          id: 7,
          zipcode: 10017,
          radius: 5,
          count: 1000
        }
      })
      .then((results) => {
        setUsers(results);
      })
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(err);
      });
  }

  // if (!userInfo) {
  //   return <div>Loading...</div>;
  // }
  if (loading) {
    return (
      <div className="loading-discover">
        <FaDog className="loading-dog1" />
        <FaDog className="loading-dog2" />
      </div>
    );
  }

  return (
    <div className="discover-view">
      <CardStack users={users} />
    </div>
  );
};

export default Discover;
