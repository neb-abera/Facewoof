/*
 * Render under a UserContext with the fields a test cares about. The real
 * provider talks to the API on mount; components under test get a stub
 * value instead, so a test says exactly what the context holds.
 */
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import UserContext, { type UserContextValue } from "../../src/context/user";

export const stubUser = (
  overrides: Partial<UserContextValue> = {},
): UserContextValue => ({
  userId: 7,
  setUserId: vi.fn(),
  userData: null,
  setUserData: vi.fn(),
  loggedIn: true,
  photos: [],
  packs: [],
  setPacks: vi.fn(),
  playdates: [],
  setPlaydates: vi.fn(),
  firstLogin: false,
  setFirstLogin: vi.fn(),
  authenticating: false,
  signInAsGuest: vi.fn(),
  locationSource: "fallback",
  provideLocation: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

export const withUser = (
  element: ReactElement,
  overrides: Partial<UserContextValue> = {},
) => (
  <MemoryRouter>
    <UserContext.Provider value={stubUser(overrides)}>
      {element}
    </UserContext.Provider>
  </MemoryRouter>
);
