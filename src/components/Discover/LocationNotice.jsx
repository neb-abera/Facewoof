import React, { useState } from 'react';
import PropTypes from 'prop-types';

/*
 * Says plainly that the feed is a sample, and offers the one action that fixes
 * it.
 *
 * Someone who declines the location prompt still gets a working app, because
 * dogs are generated for them somewhere. They should know that is what they are
 * looking at rather than believing these are dogs down the road.
 */
const LocationNotice = ({ onProvide, searchingFrom }) => {
  const [asking, setAsking] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const ask = () => {
    setAsking(true);
    setBlocked(false);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await onProvide({ lat: coords.latitude, lng: coords.longitude });
        } finally {
          setAsking(false);
        }
      },
      () => {
        // A hard denial cannot be re-prompted from script: the browser only
        // shows the dialog again once the site's permission is reset, so
        // saying "allow it" without saying where would be a dead end.
        setAsking(false);
        setBlocked(true);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="alert bg-base-200 rounded-none flex-wrap gap-3 py-3 px-6 text-sm">
      <div className="flex-1">
        <strong>You&apos;re seeing a demo.</strong>{' '}
        {searchingFrom ? (
          <>
            These dogs are samples around {searchingFrom}, not dogs near you. Share your location to
            see real profiles in your area.
          </>
        ) : (
          <>
            These dogs are samples, not dogs near you. Share your location to see real profiles in
            your area.
          </>
        )}
        {blocked && (
          <div className="mt-1 opacity-80">
            Your browser is blocking location for this site. Allow it in the address bar or your
            browser&apos;s site settings, then try again.
          </div>
        )}
      </div>
      <button type="button" className="btn btn-sm btn-primary" onClick={ask} disabled={asking}>
        {asking ? 'Checking…' : 'Use my location'}
      </button>
    </div>
  );
};

LocationNotice.propTypes = {
  onProvide: PropTypes.func.isRequired,
  searchingFrom: PropTypes.string
};

LocationNotice.defaultProps = {
  searchingFrom: null
};

export default LocationNotice;
