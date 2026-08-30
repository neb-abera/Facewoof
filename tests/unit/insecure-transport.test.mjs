/*
 * The flag that lets local HTTP runs work at all. It must only ever engage
 * on the exact string "true": anything looser and a stray value in a real
 * deployment would quietly ship an insecure session cookie.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  const m = await import("../../server/insecure-transport.js");
  return m.default ?? m;
};

describe("INSECURE_TRANSPORT", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.INSECURE_TRANSPORT;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("is off by default", async () => {
    expect((await load()).insecureTransport).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("engages only on the exact string true, and warns loudly", async () => {
    process.env.INSECURE_TRANSPORT = "true";
    expect((await load()).insecureTransport).toBe(true);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("stays off for near-misses", async () => {
    for (const value of ["TRUE", "1", "yes", ""]) {
      vi.resetModules();
      process.env.INSECURE_TRANSPORT = value;
      expect((await load()).insecureTransport, `for "${value}"`).toBe(false);
    }
  });
});
