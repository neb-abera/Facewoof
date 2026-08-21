/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import useUserContext from './useUserContext';

// This file used to start with `require('dotenv').config({ path: ... })` and
// `require('path')`. Neither exists in a browser and neither is shimmed by
// vite, so importing this hook broke the build. Client configuration comes from
// import.meta.env, which vite substitutes at build time.

// The feed arrives a page at a time rather than all at once. Ten is enough to
// keep cards in hand while the next page is in flight.
const PAGE_SIZE = 10;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const { userId } = useUserContext();

  // Ids already delivered, so the server can page without an OFFSET. Held in a
  // ref rather than state: a page arriving must not re-run anything, and
  // loadMore has to see the newest value rather than a captured one.
  const seenRef = useRef([]);
  // A new search invalidates the queue. CardStack watches this to know when to
  // forget what has been swiped rather than filtering fresh results against it.
  const [searchKey, setSearchKey] = useState(0);
  // Guards against two top-ups firing while one request is in flight.
  const inFlight = useRef(false);
  const lastQuery = useRef(null);

  /* Ask the browser where we are and turn that into a zip code. */
  const getUserLocation = useCallback(async () => {
    const { coords } = await getCoordinates();
    const { data } = await axios.get('/api/resolve-location', {
      params: { lat: coords.latitude, lng: coords.longitude }
    });
    return data.zip;
  }, []);

  const fetchPage = useCallback(
    async (location, radius) => {
      const { data } = await axios.get('/api/discover', {
        params: {
          id: userId,
          zipcode: String(location).trim(),
          radius,
          limit: PAGE_SIZE,
          seen: seenRef.current.join(',')
        }
      });
      seenRef.current = seenRef.current.concat(data.users.map((u) => u.user_id));
      return data;
    },
    [userId]
  );

  /*
   * Start a new search: clears the queue and loads the first page.
   *
   * `location` may be a zip code or a place name; the server resolves either,
   * so the client no longer needs a geocoding key.
   */
  const getUsers = useCallback(
    async (location, radius = 5) => {
      if (!userId || !location) return;

      lastQuery.current = { location, radius };
      seenRef.current = [];
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPage(location, radius);
        setUsers(data.users);
        setDistances(data.distances);
        setHasMore(data.remaining > 0);
        setSearchKey((n) => n + 1);
      } catch (err) {
        console.error('could not load the discover feed', err);
        setError('Could not load nearby dogs. Try a different location.');
        setUsers([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [userId, fetchPage, setUsers, setDistances]
  );

  /*
   * Append the next page.
   *
   * Called while there are still cards left to swipe, so the request finishes
   * before the stack runs out and nobody waits on the network.
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || inFlight.current || !lastQuery.current) return;

    inFlight.current = true;
    setLoadingMore(true);
    try {
      const { location, radius } = lastQuery.current;
      const data = await fetchPage(location, radius);
      setUsers((prev) => prev.concat(data.users));
      setDistances((prev) => ({ ...prev, ...data.distances }));
      setHasMore(data.remaining > 0);
    } catch (err) {
      console.error('could not load more dogs', err);
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, fetchPage, setUsers, setDistances]);

  return {
    loading,
    setLoading,
    loadingMore,
    hasMore,
    loadMore,
    searchKey,
    error,
    getUserLocation,
    getUsers
  };
};

export default useUserLocation;
