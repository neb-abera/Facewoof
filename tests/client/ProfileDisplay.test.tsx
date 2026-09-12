import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import ProfileDisplay from "../../src/components/ProfilePage/ProfileDisplay";
import type { Friend, User } from "../../src/types";
import { fakeApi, ok } from "./fakeApi";
import { withUser } from "./withUser";

const biscuit = {
  user_id: 7,
  dog_name: "Biscuit",
  owner_name: "Sam",
  dog_breed: "Golden Retriever",
  age: 1,
  vaccination: true,
  discoverable: false,
  location: "10011",
  likes_one: "fetch",
  likes_two: null,
  likes_three: "belly rubs",
  size: "medium",
  energy: "high",
  best_time: null,
  bio: "Brings her own ball.",
} as unknown as User;

const friend = {
  user_id: 9,
  dog_name: "Rex",
  photos: ["https://placedog.net/300"],
} as unknown as Friend;

const api = () =>
  fakeApi()
    .on("GET", "/api/profilephoto", () =>
      ok([
        { url: "https://placedog.net/1" },
        { url: "https://placedog.net/2" },
      ]),
    )
    .on("GET", "/api/friends", () => ok([friend]))
    .on("GET", "/api/getpacks", () =>
      ok([{ pack_id: 1, name: "Morning Crew" }]),
    );

test("leads with who the dog is and what a playdate needs to know", async () => {
  api();
  render(withUser(<ProfileDisplay />, { userData: biscuit }));

  expect(screen.getByRole("heading", { name: "Biscuit" })).toBeInTheDocument();
  // Singular, because the age is one.
  expect(screen.getByText(/1 year old/)).toBeInTheDocument();
  expect(screen.getByText("Vaccinated")).toBeInTheDocument();
  expect(screen.getByText(/hidden from discover/i)).toBeInTheDocument();
  // The playdate facts, by their labels, skipping the one not set.
  expect(screen.getByText("Medium")).toBeInTheDocument();
  expect(screen.getByText("High energy")).toBeInTheDocument();
  expect(screen.queryByText(/best time to play/i)).toBeNull();
  expect(screen.getByText("fetch")).toBeInTheDocument();
  expect(screen.getByText("Brings her own ball.")).toBeInTheDocument();

  // The first photo is the avatar; the rest are the gallery.
  expect(
    await screen.findByRole("heading", { name: /more photos/i }),
  ).toBeInTheDocument();
  // And the friends list arrives from the API (the name appears on the
  // list's button and again in the friend's card).
  expect((await screen.findAllByText("Rex")).length).toBeGreaterThan(0);
});

test("opens the edit form from the profile", async () => {
  api();
  const setFirstLogin = vi.fn();
  render(withUser(<ProfileDisplay />, { userData: biscuit, setFirstLogin }));

  await userEvent.click(screen.getByRole("button", { name: /edit profile/i }));
  expect(setFirstLogin).toHaveBeenCalledWith(true);
});

test("renders nothing while the account is still loading", () => {
  api();
  const { container } = render(
    withUser(<ProfileDisplay />, { userData: null }),
  );
  expect(container).toBeEmptyDOMElement();
});
