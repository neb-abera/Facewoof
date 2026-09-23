/*
 * The unit layer's first resident. The e2e suite proves the app works from
 * the outside; nothing proved the small decisions inside. This pins the
 * env-driven guest limit that CI raises for its own traffic - the exact knob
 * that, misparsed, makes a whole browser suite time out at once.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Loaded per test: the limit is parsed when the module is evaluated, so the
// environment has to be set before a fresh copy is imported.
const loadLimits = () => import("../../server/limits.ts");

beforeEach(() => {
  vi.resetModules();
  delete process.env.GUEST_LIMIT_PER_HOUR;
  delete process.env.PUBLIC_LIMIT_PER_MINUTE;
  delete process.env.FEED_LIMIT_PER_MINUTE;
  delete process.env.API_LIMIT_PER_FIVE_MINUTES;
});

/* The same knob for the backstop over the whole API, the same three ways. */
describe("the API backstop", () => {
  it("defaults to six hundred requests in five minutes", async () => {
    expect((await loadLimits()).API_LIMIT_PER_FIVE_MINUTES).toBe(600);
  });

  it("honors API_LIMIT_PER_FIVE_MINUTES from the environment", async () => {
    process.env.API_LIMIT_PER_FIVE_MINUTES = "6000";
    expect((await loadLimits()).API_LIMIT_PER_FIVE_MINUTES).toBe(6000);
  });

  it("falls back to the default when the value is not a number", async () => {
    process.env.API_LIMIT_PER_FIVE_MINUTES = "lots";
    expect((await loadLimits()).API_LIMIT_PER_FIVE_MINUTES).toBe(600);
  });
});

/* The same knob for the feed's per-minute limit, the same three ways. */
describe("the feed limit", () => {
  it("defaults to sixty reads a minute", async () => {
    expect((await loadLimits()).FEED_LIMIT_PER_MINUTE).toBe(60);
  });

  it("honors FEED_LIMIT_PER_MINUTE from the environment", async () => {
    process.env.FEED_LIMIT_PER_MINUTE = "600";
    expect((await loadLimits()).FEED_LIMIT_PER_MINUTE).toBe(600);
  });

  it("falls back to the default when the value is not a number", async () => {
    process.env.FEED_LIMIT_PER_MINUTE = "lots";
    expect((await loadLimits()).FEED_LIMIT_PER_MINUTE).toBe(60);
  });
});

describe("the guest limit", () => {
  it("defaults to ten demo sessions an hour", async () => {
    expect((await loadLimits()).GUEST_LIMIT_PER_HOUR).toBe(10);
  });

  it("honors GUEST_LIMIT_PER_HOUR from the environment", async () => {
    process.env.GUEST_LIMIT_PER_HOUR = "200";
    expect((await loadLimits()).GUEST_LIMIT_PER_HOUR).toBe(200);
  });

  it("falls back to the default when the value is not a number", async () => {
    process.env.GUEST_LIMIT_PER_HOUR = "plenty";
    expect((await loadLimits()).GUEST_LIMIT_PER_HOUR).toBe(10);
  });
});

/* The same knob for the anonymous routes' per-minute limit, the same three ways. */
describe("the public limit", () => {
  it("defaults to sixty a minute", async () => {
    expect((await loadLimits()).PUBLIC_LIMIT_PER_MINUTE).toBe(60);
  });

  it("honors PUBLIC_LIMIT_PER_MINUTE from the environment", async () => {
    process.env.PUBLIC_LIMIT_PER_MINUTE = "600";
    expect((await loadLimits()).PUBLIC_LIMIT_PER_MINUTE).toBe(600);
  });

  it("falls back to the default when the value is not a number", async () => {
    process.env.PUBLIC_LIMIT_PER_MINUTE = "lots";
    expect((await loadLimits()).PUBLIC_LIMIT_PER_MINUTE).toBe(60);
  });
});
