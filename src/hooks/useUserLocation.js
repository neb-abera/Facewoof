/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable object-shorthand */
import { useState, useCallback } from 'react';
import axios from 'axios';
import useUserContext from './useUserContext';

const googleApiUrl = import.meta.env.VITE_GOOGLE_API_URL;
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const apiUrl = import.meta.env.VITE_APP_API_URL;

const getCoordinates = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

const useUserLocation = (setUsers, setDistances) => {
  const [loading, setLoading] = useState(false);
  const { userId } = useUserContext();

  const getUserLocation = useCallback(async (lat, lng) => {
    // eslint-disable-next-line one-var
    let latitude, longitude;
    if (!lat && !lng) {
      const coordinate = (await getCoordinates()).coords;
      latitude = coordinate.latitude;
      longitude = coordinate.longitude;
    } else {
      latitude = lat;
      longitude = lng;
    }

    return axios
      .get(`${googleApiUrl}/json?latlng=${latitude},${longitude}&key=${googleApiKey}`)
      .then((res) => {
        const filteredResult = res.data.results.filter(
          (result) => result.types[0] === 'postal_code'
        );
        return filteredResult[0].address_components[0].long_name;
      })
      .catch((err) => console.log(err));
  });

  const fetchNearbyUsers = (zipcode, radius) => {
    setLoading(true);
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
        setUsers(data.users);
        setDistances(data.distances);
      })
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getUsers = useCallback(
    (location, radius = 5) => {
      if (!userId) return;
      // eslint-disable-next-line no-param-reassign
      location = location.trim();
      if (!Number.isNaN(location)) {
        axios
          .get(`${googleApiUrl}/json?address=${location}&key=${googleApiKey}`)
          .then(({ data }) => {
            const { lat, lng } = data.results[0].geometry.location;
            return getUserLocation(lat, lng);
          })
          .then((userLocation) => fetchNearbyUsers(userLocation, radius))
          .catch((err) => console.log(err));
      } else {
        fetchNearbyUsers(location, radius);
      }
    },
    [userId, fetchNearbyUsers, getUserLocation]
  );

  return { loading, setLoading, getUserLocation, getUsers };
};

export default useUserLocation;
