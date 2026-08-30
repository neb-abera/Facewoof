/*
 * Graceful shutdown. On redeploy the container gets SIGTERM and Docker waits
 * only stop_grace_period before SIGKILL, so the handler must stop accepting
 * connections, drain in-flight requests inside that window, close the pg
 * pool, and exit — in that order. These tests drive the handler directly
 * with fakes; what a unit test cannot see (the real signal arriving inside
 * the container) is covered by the smoke job stopping the container in CI.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const load = async () => {
  const m = await import("../../server/shutdown.js");
  return m.default ?? m;
};

const makeFakes = () => {
  const server = {
    // close() stops accepting connections and calls back when the last
    // in-flight request finishes; the fake exposes the callback so a test
    // decides when draining completes.
    close: vi.fn(),
    closeIdleConnections: vi.fn(),
  };
  const pool = { end: vi.fn(() => Promise.resolve()) };
  const exit = vi.fn();
  const log = { log: vi.fn(), error: vi.fn() };
  return { server, pool, exit, log };
};

describe("registerShutdown", () => {
  let added;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    added = [];
    // Track listeners so each test leaves the process as it found it.
    const original = process.on.bind(process);
    vi.spyOn(process, "on").mockImplementation((event, fn) => {
      added.push([event, fn]);
      return original(event, fn);
    });
  });

  afterEach(() => {
    for (const [event, fn] of added) process.removeListener(event, fn);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("handles both SIGTERM and SIGINT", async () => {
    const { registerShutdown } = await load();
    registerShutdown({ ...makeFakes() });
    const events = added.map(([event]) => event);
    expect(events).toContain("SIGTERM");
    expect(events).toContain("SIGINT");
  });

  it("drains, closes the pool, then exits 0", async () => {
    const { registerShutdown } = await load();
    const { server, pool, exit, log } = makeFakes();
    const shutdown = registerShutdown({ server, pool, exit, log });

    shutdown("SIGTERM");
    // New connections are refused immediately, idle keep-alives are told to
    // go, but nothing exits while requests are still in flight.
    expect(server.close).toHaveBeenCalledOnce();
    expect(server.closeIdleConnections).toHaveBeenCalledOnce();
    expect(pool.end).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();

    // The last in-flight request finishes: pool closes, then exit(0).
    server.close.mock.calls[0][0]();
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("force-exits when draining outlives the grace timeout", async () => {
    const { registerShutdown } = await load();
    const { server, pool, exit, log } = makeFakes();
    const shutdown = registerShutdown({
      server,
      pool,
      exit,
      log,
      graceMs: 5000,
    });

    shutdown("SIGTERM");
    // The drain callback never fires; the deadline must.
    vi.advanceTimersByTime(4999);
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits non-zero when the pool does not close cleanly", async () => {
    const { registerShutdown } = await load();
    const { server, exit, log } = makeFakes();
    const pool = { end: vi.fn(() => Promise.reject(new Error("boom"))) };
    const shutdown = registerShutdown({ server, pool, exit, log });

    shutdown("SIGTERM");
    server.close.mock.calls[0][0]();
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  });

  it("ignores a second signal while already shutting down", async () => {
    const { registerShutdown } = await load();
    const { server, pool, exit, log } = makeFakes();
    const shutdown = registerShutdown({ server, pool, exit, log });

    shutdown("SIGTERM");
    shutdown("SIGINT");
    expect(server.close).toHaveBeenCalledOnce();
  });

  it("drains inside Docker's stop_grace_period by default", async () => {
    const { GRACE_MS } = await load();
    // compose.yaml pins stop_grace_period to 10s; the drain deadline must
    // leave margin inside it for the pool close and process exit.
    expect(GRACE_MS).toBeLessThan(10_000);
    expect(GRACE_MS).toBeGreaterThanOrEqual(5_000);
  });
});
