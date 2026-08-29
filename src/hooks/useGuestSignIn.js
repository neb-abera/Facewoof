import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUserContext from "./useUserContext";

/*
 * Starting the demo, from wherever the visitor clicks.
 *
 * Shared by the landing page and the sign-in page so that the landing page's
 * button starts the demo outright. It used to be a link to /login, where the
 * only thing on offer was the same button again: two clicks and a page change
 * to do one thing.
 */
const useGuestSignIn = () => {
  const { signInAsGuest } = useUserContext();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  /*
   * Ask where the visitor is before creating the demo, so the roster can be
   * generated next to them.
   *
   * Asked on the click that starts the demo, so a permission prompt is
   * expected rather than a surprise. Declining costs a few seconds at most and
   * the demo falls back to its default city.
   */
  const askWhereTheyAre = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ lat: coords.latitude, lng: coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 600000 },
      );
    });

  const start = useCallback(async () => {
    setError(null);
    try {
      const where = await askWhereTheyAre();
      await signInAsGuest(where);
      navigate("/discover");
    } catch (err) {
      console.error("guest sign in failed", err);
      setError("Could not start a demo session. Please try again.");
    }
  }, [signInAsGuest, navigate]);

  return { start, error };
};

export default useGuestSignIn;
