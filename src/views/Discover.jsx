/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog, FaBone } from 'react-icons/fa';
import axios from 'axios';

import CardStack from '../components/Discover/CardStack';
import './discover.css';

// eslint-disable-next-line react/function-component-definition
export default function Discover() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  function getUsers(user) {
    // console.log('making request');
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
        // console.log('User list:', results);
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

  useEffect(() => {
    getUsers();
  }, []);

  if (loading) {
    return (
      <div className="loading-discover">
        <FaDog className="loading-dog1" />
        <FaDog className="loading-dog2" />
      </div>
    );
  }

  return (
    <div>
      <CardStack users={users} />
    </div>
  );
}
