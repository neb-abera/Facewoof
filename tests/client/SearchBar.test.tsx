import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import SearchBar from "../../src/components/Discover/SearchBar";

test("the radius reaches the caller as a number, not the option's text", async () => {
  const onSetRadius = vi.fn();
  render(
    <SearchBar
      radius={5}
      onSetRadius={onSetRadius}
      location="10011"
      onSetLocation={() => {}}
      onSearch={() => {}}
    />,
  );

  await userEvent.selectOptions(screen.getByRole("combobox"), "25");
  expect(onSetRadius).toHaveBeenCalledWith(25);
});

test("submitting the form searches once, without reloading the page", async () => {
  const onSearch = vi.fn();
  render(
    <SearchBar
      radius={5}
      onSetRadius={() => {}}
      location="Hoboken"
      onSetLocation={() => {}}
      onSearch={onSearch}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: /search/i }));
  expect(onSearch).toHaveBeenCalledTimes(1);
});
