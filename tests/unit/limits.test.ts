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

describe("the guest limit", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.GUEST_LIMIT_PER_HOUR;
  });

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
