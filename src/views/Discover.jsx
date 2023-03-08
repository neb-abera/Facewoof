/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import CardStack from '../components/Discover/CardStack';

export default function Discover() {
  const [users, setUsers] = useState([]);

  function getUsers(user) {
    console.log('making request');
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
      <CardStack users={users} />
    </div>
  );
}
