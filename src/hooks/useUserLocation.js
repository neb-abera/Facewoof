/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback } from 'react';
import axios from 'axios';
import useUserContext from './useUserContext';

// This file used to start with `require('dotenv').config({ path: ... })` and
// `require('path')`. Neither exists in a browser, and vite has no shim for
// them, so importing this hook broke the build. Client configuration comes
// from import.meta.env, which vite substitutes at build time.

const getCoordinates = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('this browser cannot report a location'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
  });

const useUserLocation = (setUsers, setDistances) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { userId } = useUserContext();

  /* Ask the browser where we are and turn that into a zip code. */
  const getUserLocation = useCallback(async () => {
    const { coords } = await getCoordinates();
    const { data } = await axios.get('/api/resolve-location', {
      params: { lat: coords.latitude, lng: coords.longitude }
    });
    return data.zip;
  }, []);

  /*
   * Fetch the discover feed. `location` may be a zip code or a place name:
   * the server resolves either, so the client no longer needs a geocoding key.
   */
  const getUsers = useCallback(
    (location, radius = 5) => {
      if (!userId || !location) return Promise.resolve();

      setLoading(true);
      setError(null);
      return axios
        .get('/api/discover', {
          params: { id: userId, zipcode: String(location).trim(), radius, count: 100 }
        })
        .then(({ data }) => {
          setUsers(data.users);
          setDistances(data.distances);
        })
        .catch((err) => {
          console.error('could not load the discover feed', err);
          setError('Could not load nearby dogs. Try a different location.');
          setUsers([]);
        })
        .finally(() => setLoading(false));
    },
    [userId, setUsers, setDistances]
  );

  return { loading, setLoading, error, getUserLocation, getUsers };
};

export default useUserLocation;
