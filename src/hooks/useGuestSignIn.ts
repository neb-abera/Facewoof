import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import type { Whereabouts } from "../types";
import useUserContext from "./useUserContext";

/*
 * Ask where the visitor is before creating the demo, so the roster can be
 * generated next to them.
 *
 * Asked on the click that starts the demo, so a permission prompt is
 * expected rather than a surprise. Declining costs a few seconds at most and
 * the demo falls back to its default city.
 */
// The API's own timeout covers acquiring a position, not the permission
// prompt: a prompt nobody answers holds the call open for as long as the
// tab lives, and the demo behind it never starts. Firefox showed that in the
// browser suite on 2026-09-23, where headless has no prompt to answer. So
// the wait is capped here too, and the demo starts in its default city.
export const LOCATION_WAIT_MS = 8000;

const askWhereTheyAre = () =>
  new Promise<Whereabouts | null>((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const cap = setTimeout(() => resolve(null), LOCATION_WAIT_MS);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(cap);
        resolve({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        clearTimeout(cap);
        resolve(null);
      },
      { timeout: LOCATION_WAIT_MS, maximumAge: 600000 },
    );
  });

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
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const start = useCallback(async () => {
    setError(null);
    try {
      const where = await askWhereTheyAre();
      await signInAsGuest(where);
      navigate("/discover");
    } catch (err) {
      console.error("guest sign in failed", err);
      // A full demo (503) and a rate limit (429) come with a sentence written
      // for the visitor; anything else gets the generic one.
      setError(
        err instanceof ApiError && (err.status === 503 || err.status === 429)
          ? err.message
          : "Could not start a demo session. Please try again.",
      );
    }
  }, [signInAsGuest, navigate]);

  return { start, error };
};

export default useGuestSignIn;
