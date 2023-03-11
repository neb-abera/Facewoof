/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable react/jsx-indent-props */
/* eslint-disable object-shorthand */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaDog, FaBone } from 'react-icons/fa';
import axios from 'axios';
import { useOktaAuth } from '@okta/okta-react';
import CardStack from '../components/Discover/CardStack';
import useUserContext from '../hooks/useUserContext';
import useUserLocation from '../hooks/useUserLocation';
import SearchBar from '../components/Discover/SearchBar';
import './discover.css';

// eslint-disable-next-line react/function-component-definition
export default function Discover() {
  const [users, setUsers] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [radius, setRadius] = useState(5);
  const [distances, setDistances] = useState({});

  const { userData, photos } = useUserContext();
  const { loading, setLoading, getUserLocation, getUsers } = useUserLocation(
    setUsers,
    setDistances
  );

  useEffect(() => {
    if (searchLocation === '') {
      getUserLocation()
        .then((userLocation) => {
          getUsers(userLocation, radius);
        })
        .catch((err) => console.log(err));
    } else {
      getUsers(searchLocation, radius);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  const handleSearch = (event) => {
    getUsers(searchLocation, radius);
  };

  useEffect(() => {
    if (users?.length > 0) {
      setLoading(false);
    }
  }, [users]);

  return (
    <div className="discover-parent">
      <SearchBar
        radius={radius}
        location={searchLocation}
        onSetRadius={setRadius}
        onSetLocation={setSearchLocation}
        onSearch={handleSearch}
      />
      {loading ? (
        <div className="loading-discover">
          <FaDog className="loading-dog1" />
          <FaDog className="loading-dog2" />
        </div>
      ) : (
        <div className="discover-view">
          <CardStack users={users} distances={distances} userData={userData} photos={photos} />
        </div>
      )}
    </div>
  );
}
