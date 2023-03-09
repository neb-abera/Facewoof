/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog, FaBone } from 'react-icons/fa';
import axios from 'axios';

import CardStack from '../components/Discover/CardStack';
import useUserContext from '../hooks/useUserContext';
import './discover.css';

// eslint-disable-next-line react/function-component-definition
export default function Discover() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const userContext = useUserContext();

  function getUsers(user) {
    axios
      .get('http://localhost:3001/api/discover', {
        params: {
          id: 7,
          zipcode: 10017,
          radius: 5,
          count: 1000
        }
      })
      .then((results) => {
        setUsers(results.data);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(err);
      });
  }

  useEffect(() => {
    getUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      setLoading(false);
    }
  }, [users]);

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
}
