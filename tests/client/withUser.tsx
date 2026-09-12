/*
 * Render under a UserContext with the fields a test cares about, and a
 * fresh query client. The real provider talks to the API on mount;
 * components under test get a stub value instead, so a test says exactly
 * what the context holds. Server state (photos, packs, friends…) comes from
 * the queries, which a test feeds through fakeApi.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import UserContext, { type UserContextValue } from "../../src/context/user";

/* A client with no retries and no caching between tests. */
export const testQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

export const stubUser = (
  overrides: Partial<UserContextValue> = {},
): UserContextValue => ({
  userId: 7,
  setUserId: vi.fn(),
  userData: null,
  setUserData: vi.fn(),
  loggedIn: true,
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
  <QueryClientProvider client={testQueryClient()}>
    <MemoryRouter>
      <UserContext.Provider value={stubUser(overrides)}>
        {element}
      </UserContext.Provider>
    </MemoryRouter>
  </QueryClientProvider>
);
