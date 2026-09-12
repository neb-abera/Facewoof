import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import type { User } from "../../src/types";
import Home from "../../src/views/Home";
import { withUser } from "./withUser";

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
