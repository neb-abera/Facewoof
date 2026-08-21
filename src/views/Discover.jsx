import React, { useState, useEffect } from 'react';
import { FaDog } from 'react-icons/fa';
import CardStack from '../components/Discover/CardStack';
import useUserContext from '../hooks/useUserContext';
import useUserLocation from '../hooks/useUserLocation';
import SearchBar from '../components/Discover/SearchBar';
import LocationNotice from '../components/Discover/LocationNotice';
import './discover.css';

// Where to look when the browser will not say and the profile has no zip
// code either. The seed data is clustered around lower Manhattan.
const FALLBACK_ZIP = '10011';

export default function Discover() {
  const [users, setUsers] = useState([]);
  const [searchLocation, setSearchLocation] = useState('');
  const [radius, setRadius] = useState(5);
  const [distances, setDistances] = useState({});
  const [resolving, setResolving] = useState(true);

  const { userId, userData, photos, locationSource, provideLocation } = useUserContext();
  const { loading, error, getUserLocation, getUsers, loadMore, hasMore, searchKey } =
    useUserLocation(setUsers, setDistances);

  /*
   * Work out where to search, once, when the user is known.
   *
   * The original called getUserLocation() on every radius change and gave up
   * silently if the browser denied geolocation, which left a permanently empty
   * feed and no explanation. Denial now falls back to the profile's own zip
   * code, so the feed always has somewhere to look.
   */
  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;
    setResolving(true);

    // The account already carries the location the demo was built around, so
    // prefer it: re-deriving from the browser can land on a different zip than
    // the one the roster was scattered near.
    Promise.resolve(userData?.location)
      .then((known) => known || getUserLocation())
      .catch(() => userData?.location || FALLBACK_ZIP)
      .then((zip) => {
        if (cancelled) return undefined;
        const resolved = zip || userData?.location || FALLBACK_ZIP;
        setSearchLocation(resolved);
        setResolving(false);
        return getUsers(resolved, radius);
      });

    return () => {
      cancelled = true;
    };
    // Deliberately mount-only: re-running would overwrite whatever the visitor
    // has since typed into the search box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Re-search when the radius changes, but not before a location is known.
  useEffect(() => {
    if (!resolving && searchLocation) getUsers(searchLocation, radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  const handleSearch = () => getUsers(searchLocation, radius);

  // Granting location moves the account and generates dogs there, so the feed
  // has to be reloaded from the new zip rather than the old one.
  const handleProvideLocation = async (where) => {
    const zip = await provideLocation(where);
    if (zip) {
      setSearchLocation(zip);
      await getUsers(zip, radius);
    }
  };

  return (
    <div className="discover-parent">
      {locationSource !== 'device' && (
        <LocationNotice onProvide={handleProvideLocation} searchingFrom={userData?.location} />
      )}
      <SearchBar
        radius={radius}
        location={searchLocation}
        onSetRadius={setRadius}
        onSetLocation={setSearchLocation}
        onSearch={handleSearch}
      />
      {loading || resolving ? (
        <div className="loading-discover">
          <FaDog className="loading-dog1" />
          <FaDog className="loading-dog2" />
        </div>
      ) : (
        <div className="discover-view">
          {error && <p className="text-error text-center py-2">{error}</p>}
          <CardStack
            users={users}
            distances={distances}
            userData={userData}
            photos={photos}
            onRunningLow={loadMore}
            hasMore={hasMore}
            searchKey={searchKey}
          />
        </div>
      )}
    </div>
  );
}
