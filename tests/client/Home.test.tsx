import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { LOCATION_WAIT_MS } from "../../src/hooks/useGuestSignIn";
import type { User } from "../../src/types";
import Home from "../../src/views/Home";
import { withUser } from "./withUser";

// A test that times out inside fake timers would leave them installed for
// the next one.
afterEach(() => vi.useRealTimers());

const routed = (element: React.ReactElement) => (
  <Routes>
    <Route path="/" element={element} />
    <Route path="/discover" element={<p>the feed</p>} />
  </Routes>
);

test("starts the demo in one click and lands on the feed", async () => {
  const signInAsGuest = vi.fn(async () => ({ user_id: 1 }) as unknown as User);
  // No geolocation in this browser: the demo falls back to its default city.
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });

  render(withUser(routed(<Home />), { loggedIn: false, signInAsGuest }));

  await userEvent.click(screen.getByRole("button", { name: /try the demo/i }));

  await waitFor(() => expect(screen.getByText("the feed")).toBeInTheDocument());
  expect(signInAsGuest).toHaveBeenCalledWith(null);
});

// A permission prompt nobody answers holds the geolocation call open for as
// long as the tab lives: the API's timeout covers acquiring a position, not
// the prompt. Headless Firefox showed it on 2026-09-23. The demo starts in
// its default city once the wait is up.
test("starts the demo in its default city when the location prompt is never answered", async () => {
  const signInAsGuest = vi.fn(async () => ({ user_id: 1 }) as unknown as User);
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: { getCurrentPosition: vi.fn() },
  });
  render(withUser(routed(<Home />), { loggedIn: false, signInAsGuest }));
  // Only the cap's own timer is faked, and the click is the plain event:
  // user-event's own waits would sit behind the same fake clock.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  fireEvent.click(screen.getByRole("button", { name: /try the demo/i }));
  expect(signInAsGuest).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(LOCATION_WAIT_MS));
  vi.useRealTimers();

  await waitFor(() => expect(screen.getByText("the feed")).toBeInTheDocument());
  expect(signInAsGuest).toHaveBeenCalledWith(null);
});

test("says so when the demo cannot start, and stays put", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const signInAsGuest = vi.fn(async () => {
    throw new Error("boom");
  });
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });

  render(withUser(routed(<Home />), { loggedIn: false, signInAsGuest }));

  await userEvent.click(screen.getByRole("button", { name: /try the demo/i }));

  expect(
    await screen.findByText(/could not start a demo session/i),
  ).toBeInTheDocument();
  expect(screen.queryByText("the feed")).toBeNull();
});

test("sends a signed-in visitor straight to the feed", () => {
  render(withUser(routed(<Home />), { loggedIn: true }));
  expect(screen.getByText("the feed")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /try the demo/i })).toBeNull();
});
