import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import CardStack from "../../src/components/Discover/CardStack";
import type { FeedCard, User } from "../../src/types";
import { created, fakeApi, ok } from "./fakeApi";
import { withUser } from "./withUser";

const me = {
  user_id: 7,
  dog_name: "Biscuit",
  owner_name: "Guest",
} as unknown as User;

const dog = (id: number, name: string, likesMe: boolean | null): FeedCard => ({
  user_id: id,
  dog_name: name,
  owner_name: "Someone",
  dog_breed: "Pug",
  age: 3,
  vaccination: true,
  discoverable: true,
  owner_email: `${name}@example.com`,
  location: "10011",
  user1_choice: likesMe,
  photos: [`https://placedog.net/400?${id}`],
  interests: ["fetch", null, "naps"],
});

const renderStack = (users: FeedCard[], api = fakeApi()) => {
  render(
    withUser(
      <CardStack
        users={users}
        distances={{ "10011": 0 }}
        userData={me}
        photos={["https://placedog.net/400?me"]}
        onRunningLow={() => {}}
        hasMore={false}
        searchKey={1}
      />,
    ),
  );
  return api;
};

test("a Woof records the swipe against the dog on top of the stack", async () => {
  const api = fakeApi().on("POST", "/api/response", () =>
    created({ message: "Response updated" }),
  );
  renderStack([dog(1, "Rex", null), dog(2, "Luna", null)], api);

  await userEvent.click(screen.getByRole("button", { name: /^woof$/i }));

  await waitFor(() => expect(api.calls).toHaveLength(1));
  expect(api.calls[0]).toEqual({
    method: "POST",
    path: "/api/response",
    body: { otherUserId: 1, currentUserChoice: true, otherUserChoice: null },
  });
  // No match: the dog on top had not swiped yes on us.
  expect(screen.queryByText(/it's a match/i)).not.toBeInTheDocument();
});

test("a Woof on a dog that already likes you is a match", async () => {
  const api = fakeApi().on("POST", "/api/response", () =>
    ok({ message: "Match found", matchedUserId: 1 }),
  );
  renderStack([dog(1, "Rex", true)], api);

  await userEvent.click(screen.getByRole("button", { name: /^woof$/i }));

  expect(await screen.findByText(/it's a match/i)).toBeInTheDocument();
  expect(screen.getByText(/add rex to a pack/i)).toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("button", { name: /keep searching/i }),
  );
  expect(screen.queryByText(/it's a match/i)).not.toBeInTheDocument();
});

test("a Pass records a no and never shows a match", async () => {
  const api = fakeApi().on("POST", "/api/response", () =>
    created({ message: "Response updated" }),
  );
  renderStack([dog(1, "Rex", true)], api);

  await userEvent.click(screen.getByRole("button", { name: /^pass$/i }));

  await waitFor(() => expect(api.calls).toHaveLength(1));
  expect(api.calls[0]?.body).toMatchObject({
    otherUserId: 1,
    currentUserChoice: false,
  });
  expect(screen.queryByText(/it's a match/i)).not.toBeInTheDocument();
});

test("an empty stack says so rather than rendering nothing", () => {
  renderStack([]);
  expect(screen.getByText(/that's all for now/i)).toBeInTheDocument();
});
