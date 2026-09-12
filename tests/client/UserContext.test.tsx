import { render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { UserProvider } from "../../src/context/user";
import useUserContext from "../../src/hooks/useUserContext";
import type { User } from "../../src/types";
import { fakeApi, ok, refused } from "./fakeApi";

const account = {
  user_id: 42,
  dog_name: "Biscuit",
  onboarded_at: null,
} as unknown as User;

// Generous: the first test in a worker also pays for transforming the
// context module, and under a parallel full run that can outlast Testing
// Library's one-second default.
const patiently = { timeout: 5_000 };

/* Shows what the context believes, so a test can read it off the page. */
const Probe = () => {
  const { userId, userData, loggedIn } = useUserContext();
  return (
    <div>
      <span data-testid="userId">{String(userId)}</span>
      <span data-testid="dog">{userData?.dog_name ?? "-"}</span>
      <span data-testid="loggedIn">{String(loggedIn)}</span>
    </div>
  );
};

test("adopts a session the server already has, with nothing in storage", async () => {
  fakeApi()
    .on("GET", "/api/auth/me", () => ok(account))
    .on("GET", "/api/profilephoto", () => ok([]));

  render(
    <UserProvider>
      <Probe />
    </UserProvider>,
  );

  expect(screen.getByTestId("loggedIn")).toHaveTextContent("false");
  await waitFor(
    () => expect(screen.getByTestId("userId")).toHaveTextContent("42"),
    patiently,
  );
  expect(screen.getByTestId("dog")).toHaveTextContent("Biscuit");
  expect(localStorage.getItem("facewoof.userId")).toBe("42");
});

test("drops a stored id whose account is gone (401), and keeps it on any other error", async () => {
  localStorage.setItem("facewoof.userId", "42");
  fakeApi()
    .on("GET", "/api/auth/me", () => refused(401, "sign in first"))
    .on("GET", "/api/profilephoto", () => ok([]));

  render(
    <UserProvider>
      <Probe />
    </UserProvider>,
  );
  expect(screen.getByTestId("loggedIn")).toHaveTextContent("true");
  await waitFor(
    () => expect(screen.getByTestId("loggedIn")).toHaveTextContent("false"),
    patiently,
  );
  expect(localStorage.getItem("facewoof.userId")).toBeNull();
});

test("a transient error does not sign the visitor out", async () => {
  localStorage.setItem("facewoof.userId", "42");
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  fakeApi()
    .on("GET", "/api/auth/me", () => refused(500, "boom"))
    .on("GET", "/api/profilephoto", () => ok([]));

  render(
    <UserProvider>
      <Probe />
    </UserProvider>,
  );

  await waitFor(() => expect(spy).toHaveBeenCalled(), patiently);
  expect(screen.getByTestId("loggedIn")).toHaveTextContent("true");
  expect(localStorage.getItem("facewoof.userId")).toBe("42");
});

test("useUserContext refuses to run outside the provider", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow(/inside a UserProvider/);
});
