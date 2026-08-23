import { useEffect, useState } from 'react';
import axios from 'axios';

/*
 * Which sign-in options this deployment actually offers.
 *
 * Asked for rather than assumed, so an install with no Entra tenant configured
 * — a local checkout, a fork, a preview environment — shows the demo button
 * and nothing that leads to a dead end.
 */
const useAuthProviders = () => {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let cancelled = false;

    axios
      .get('/api/auth/providers')
      .then(({ data }) => {
        if (!cancelled && data?.configured) setProviders(data.providers || []);
      })
      .catch((err) => {
        // Not being able to ask is the same as having none to offer.
        console.error('could not load the sign-in options', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return providers;
};

export default useAuthProviders;
