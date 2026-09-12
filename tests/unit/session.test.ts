/*
 * The session module's two refusals: it will not start in production without
 * a secret (replicas would each mint their own key and reject each other's
 * cookies), and sessionOf() will not hand back a session that is not there
 * (the middleware was not mounted in front of the route).
 */
import type { Request } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const load = () => import("../../server/session.ts");

describe("the session module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("refuses to start in production without SESSION_SECRET", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    await expect(load()).rejects.toThrow(/SESSION_SECRET must be set/);
  });

  it("starts in production once a secret is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "test-only-secret");
    const { session } = await load();
    expect(typeof session).toBe("function");
  });

  it("generates a key outside production rather than refusing", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SESSION_SECRET", "");
    const { session } = await load();
    expect(typeof session).toBe("function");
  });

  it("sessionOf throws when cookie-session is not in front of the route", async () => {
    const { sessionOf } = await load();
    expect(() => sessionOf({} as Request)).toThrow(
      /cookie-session is not mounted/,
    );
    const fake = { userId: 7 };
    expect(sessionOf({ session: fake } as unknown as Request)).toBe(fake);
  });
});
