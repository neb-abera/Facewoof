import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, api, unwrap } from "../api";
import type { CalendarEvent, Pack, User, Whereabouts } from "../types";

// A signed-in guest survives a page refresh: without this every reload would
// mint a new throwaway account and lose whatever the visitor had swiped.
const STORAGE_KEY = "facewoof.userId";
// Whether the location we are searching from came from the device or is a
// stand-in. Persisted so a refresh does not silently forget that the feed is
// only a sample.
const SOURCE_KEY = "facewoof.locationSource";

export type LocationSource = "device" | "fallback";

/* Everything the provider shares. The setters are React's own. */
export interface UserContextValue {
  userId: number | null;
  setUserId: Dispatch<SetStateAction<number | null>>;
  userData: User | null;
  setUserData: Dispatch<SetStateAction<User | null>>;
  loggedIn: boolean;
  /* The signed-in user's own photo URLs, profile photo first. */
  photos: string[];
  packs: Pack[];
  setPacks: Dispatch<SetStateAction<Pack[]>>;
  playdates: CalendarEvent[];
  setPlaydates: Dispatch<SetStateAction<CalendarEvent[]>>;
  /* Whether the profile page shows the edit form rather than the display. */
  firstLogin: boolean;
  setFirstLogin: Dispatch<SetStateAction<boolean>>;
  authenticating: boolean;
  signInAsGuest: (where?: Whereabouts | null) => Promise<User>;
  locationSource: LocationSource;
  provideLocation: (where: Whereabouts) => Promise<string | null>;
  logout: () => void;
}

// No default: useUserContext throws outside the provider, so a component
// mounted without one fails at once rather than reading undefined.
const UserContext = createContext<UserContextValue | null>(null);

const readStoredUserId = (): number | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  } catch {
    // Private browsing modes can throw on localStorage access.
    return null;
  }
};

const readStoredSource = (): LocationSource => {
  try {
    return window.localStorage.getItem(SOURCE_KEY) === "device"
      ? "device"
      : "fallback";
  } catch {
    return "fallback";
  }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<number | null>(readStoredUserId);
  const [userData, setUserData] = useState<User | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [playdates, setPlaydates] = useState<CalendarEvent[]>([]);
  const [firstLogin, setFirstLogin] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [locationSource, setLocationSource] =
    useState<LocationSource>(readStoredSource);

  // `loggedIn` was a useState initialised to true, so the app rendered its
  // signed-in navigation to visitors who had never signed in. It follows from
  // whether there is a user now.
  const loggedIn = userId !== null;

  useEffect(() => {
    try {
      if (userId === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(userId));
    } catch {
      // Nothing to do: the session just will not survive a refresh.
    }
  }, [userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOURCE_KEY, locationSource);
    } catch {
      // As above.
    }
  }, [locationSource]);

  /*
   * Load the signed-in user's own photos.
   *
   * Nothing populated this, so anything rendering the current user's picture —
   * the match screen most visibly — got undefined for a src and fell back to
   * showing the alt text, which is why a dog's name appeared floating where
   * its photo should be.
   */
  useEffect(() => {
    if (userId === null) {
      setPhotos([]);
      return;
    }
    api
      .GET("/api/profilephoto")
      .then(({ data }) => setPhotos((data ?? []).map((row) => row.url)))
      .catch(() => setPhotos([]));
  }, [userId]);

  /*
   * Adopt a session the server already has, once, on first load.
   *
   * The session lives in an httpOnly cookie, so the client cannot read it and
   * has to ask. Signing in through a provider establishes that cookie during a
   * redirect and never touches localStorage, so without this the app came back
   * from a successful sign-in, found no stored id, decided it was signed out,
   * and bounced to /login — while /api/auth/me was answering 200 the whole
   * time. It also covers a browser that dropped localStorage but kept cookies.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately once, on mount — after this, sign-in and sign-out drive the id, and re-running on every change to it would undo signing out
  useEffect(() => {
    if (userId !== null) return;

    api
      .GET("/api/auth/me")
      .then(({ data }) => {
        if (!data?.user_id) return;
        setUserId(data.user_id);
        setUserData(data);
      })
      // 401 is the ordinary answer for a visitor who has not signed in.
      .catch(() => {});
  }, []);

  // Rehydrate the profile behind a stored id, and drop the id if the account
  // has since been swept up by the guest cleanup.
  useEffect(() => {
    if (userId === null || userData !== null) return;

    api
      .GET("/api/auth/me")
      .then((result) => setUserData(unwrap(result)))
      .catch((err: unknown) => {
        /*
         * Only 401 means the account is actually gone — an expired guest swept
         * up by the cleanup. Anything else is transient: a rate limit, a
         * restart mid-deploy, a dropped connection. Clearing the session on
         * those signed people out permanently for a blip, which is how a
         * single 429 during testing looked like the whole app forgetting you.
         */
        if (err instanceof ApiError && err.status === 401) setUserId(null);
        else
          console.error(
            "could not load the current user; keeping the session",
            err,
          );
      });
  }, [userId, userData]);

  // `where` is an optional { lat, lng } or { zip }: the demo roster is created
  // next to it, so the visitor sees dogs near them rather than in New York.
  const signInAsGuest = useCallback(async (where?: Whereabouts | null) => {
    setAuthenticating(true);
    try {
      // The response sets the session cookie; the body is the new profile.
      const data = unwrap(
        await api.POST("/api/auth/guest", { body: where ?? {} }),
      );
      setUserData(data);
      setUserId(data.user_id);
      setLocationSource(where ? "device" : "fallback");
      // Not firstLogin: that renders the edit form, so every demo visitor met
      // a form instead of the profile they came to look at. Editing is a thing
      // they choose from the profile page.
      setFirstLogin(false);
      return data;
    } finally {
      setAuthenticating(false);
    }
  }, []);

  /*
   * Move the account to where the device says it is.
   *
   * Someone who declined the prompt at sign-in is looking at a sample rather
   * than their own neighbourhood. This is how they fix that, without having to
   * type an address into their profile.
   */
  const provideLocation = useCallback(
    async (where: Whereabouts) => {
      if (!userId) return null;
      const data = unwrap(await api.PUT("/api/location", { body: where }));
      setUserData((prev) =>
        prev ? { ...prev, location: data.location } : prev,
      );
      setLocationSource("device");
      return data.location;
    },
    [userId],
  );

  const logout = useCallback(() => {
    // Tell the server to drop the cookie as well; clearing local state alone
    // would leave a valid session behind.
    api.POST("/api/auth/logout").catch(() => {});
    setUserId(null);
    setUserData(null);
    setPhotos([]);
    setPacks([]);
    setPlaydates([]);
    setFirstLogin(false);
  }, []);

  const valueToShare = useMemo<UserContextValue>(
    () => ({
      userId,
      setUserId,
      userData,
      setUserData,
      loggedIn,
      photos,
      packs,
      setPacks,
      playdates,
      setPlaydates,
      firstLogin,
      setFirstLogin,
      authenticating,
      signInAsGuest,
      locationSource,
      provideLocation,
      logout,
    }),
    [
      userId,
      userData,
      loggedIn,
      photos,
      packs,
      playdates,
      firstLogin,
      authenticating,
      signInAsGuest,
      locationSource,
      provideLocation,
      logout,
    ],
  );

  return (
    <UserContext.Provider value={valueToShare}>{children}</UserContext.Provider>
  );
};

export default UserContext;
