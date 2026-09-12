import { render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import Navbar from "../../src/components/Navbar/Navbar";
import type { User } from "../../src/types";
import { fakeApi, ok } from "./fakeApi";
import { withUser } from "./withUser";

const providers = (configured: boolean) =>
  fakeApi().on("GET", "/api/auth/providers", () =>
    ok({
      configured,
      providers: configured ? [{ id: "email", label: "Email" }] : [],
    }),
  );

test("renders nothing for a signed-out visitor", () => {
  providers(false);
  const { container } = render(withUser(<Navbar />, { loggedIn: false }));
  expect(container).toBeEmptyDOMElement();
});

test("offers a guest a way to keep their account, only when sign-in exists", async () => {
  providers(true);
  render(
    withUser(<Navbar />, {
      userData: { is_guest: true } as unknown as User,
    }),
  );
  const save = await screen.findByRole("link", { name: /save your account/i });
  expect(save).toHaveAttribute("href", "/api/auth/oidc/start?provider=email");
});

test("does not offer a signed-in account the save link", async () => {
  providers(true);
  render(
    withUser(<Navbar />, {
      userData: { is_guest: false } as unknown as User,
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /log out/i }),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByRole("link", { name: /save your account/i })).toBeNull();
});
