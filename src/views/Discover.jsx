/* eslint-disable react/jsx-indent-props */
/* eslint-disable object-shorthand */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaDog, FaBone } from 'react-icons/fa';
import axios from 'axios';

import CardStack from '../components/Discover/CardStack';
import useUserContext from '../hooks/useUserContext';
import SearchBar from '../components/Discover/SearchBar';
import './discover.css';

const googleApiUrl = import.meta.env.VITE_GOOGLE_API_URL;
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const apiUrl = import.meta.env.VITE_APP_API_URL;

const getCoordinates = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

const getUserLocation = async () => {
  const { latitude, longitude } = (await getCoordinates()).coords;

  return axios
    .get(`${googleApiUrl}/json?latlng=${latitude},${longitude}&key=${googleApiKey}`)
    .then((res) => {
      const filteredResult = res.data.results.filter((result) => result.types[0] === 'postal_code');
      return filteredResult[0].address_components[0].long_name;
    })
    .catch((err) => console.log(err));
};

// eslint-disable-next-line react/function-component-definition
export default function Discover() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(5);

  const { userId } = useUserContext();

  function getUsers(zipcode, radius = 5) {
    axios
      .get(`${apiUrl}/api/discover`, {
        params: {
          id: userId,
          zipcode,
          radius,
          count: 1000
        }
      })
      .then(({ data }) => {
        setUsers(data);
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
    if (users.length > 0) {
      setLoading(false);
    }
  }, [users]);

  return (
    <div>
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
          <CardStack users={users} />
        </div>
      )}
    </div>
  );
}
