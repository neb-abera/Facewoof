import { expect, test } from "vitest";
import { avatarUrl } from "../../src/images";

test("a placedog photo is requested as a square at twice the display size", () => {
  expect(avatarUrl("https://placedog.net/500/400?id=7", 96)).toBe(
    "https://placedog.net/192/192?id=7",
  );
  expect(avatarUrl("https://placedog.net/500/400?id=212", 40)).toBe(
    "https://placedog.net/80/80?id=212",
  );
  // The single-dimension form, and a fractional rem size.
  expect(avatarUrl("https://placedog.net/500?id=3", 72.5)).toBe(
    "https://placedog.net/145/145?id=3",
  );
});

test("a placedog URL with no id is left alone: resized, it would be another dog", () => {
  expect(avatarUrl("https://placedog.net/500/400", 96)).toBe(
    "https://placedog.net/500/400",
  );
  expect(avatarUrl("https://placedog.net/400?me", 96)).toBe(
    "https://placedog.net/400?me",
  );
});

test("every other URL comes back untouched", () => {
  for (const url of [
    "https://res.cloudinary.com/demo/image/upload/v1/dog.jpg",
    "https://example.com/500/400?id=7",
    // Not the host, only something that contains it.
    "https://placedog.net.evil.example/500/400?id=7",
    "http://placedog.net/500/400?id=7",
    "/assets/default-dog.svg",
    "data:image/png;base64,AAAA",
  ]) {
    expect(avatarUrl(url, 96)).toBe(url);
  }
});

test("no photo is no src, not an empty one", () => {
  expect(avatarUrl(undefined, 96)).toBeUndefined();
  expect(avatarUrl(null, 96)).toBeUndefined();
  expect(avatarUrl("", 96)).toBeUndefined();
});
