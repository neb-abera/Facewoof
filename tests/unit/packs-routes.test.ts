/*
 * The caller's packs, over HTTP, with the database stubbed out.
 *
 * Two routes answer the same question: GET /api/getpacks and
 * GET /api/getUserPacks share a summary and differ only in which SQL
 * function they call; the pack feed's sidebar asks by the second name. Both
 * are tested as they stand — the duplication is noted, not resolved here.
 * Neither takes an id: whose packs is decided by the session alone.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Api } from "./helpers/api-harness.ts";

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

const db = vi.hoisted(() => ({
  getPacks: vi.fn(),
  getUserPacksId: vi.fn(),
}));
vi.mock("../../server/db/index.ts", () => db);

const { ctrlUserPacksId, getUserPacks } = await import(
  "../../server/controllers/packs.ts"
);
const { startApi } = await import("./helpers/api-harness.ts");

let api: Api;
beforeAll(async () => {
  api = await startApi([getUserPacks, ctrlUserPacksId]);
});
afterAll(() => api.close());

describe.each([
  ["/api/getpacks", "getPacks"],
  ["/api/getUserPacks", "getUserPacksId"],
] as const)("GET %s", (path, query) => {
  it("answers 401 with no session", async () => {
    expect((await api.visitor().call(path)).status).toBe(401);
    expect(db[query]).not.toHaveBeenCalled();
  });

  it("is the caller's packs, unwrapped from json_agg, whatever id the request names", async () => {
    db[query].mockResolvedValueOnce({
      rows: [{ json_agg: [{ pack_id: 3, name: "Park crew", secret: "x" }] }],
    });
    const me = await api.signedInAs(7);
    const res = await me.call(`${path}?userId=8`);
    expect(res.status).toBe(200);
    expect(db[query]).toHaveBeenCalledWith(7);
    // Only the declared fields leave.
    expect(await res.json()).toEqual([{ pack_id: 3, name: "Park crew" }]);
  });

  it("is an empty list, not null, for someone in no pack", async () => {
    db[query].mockResolvedValueOnce({ rows: [{ json_agg: null }] });
    const me = await api.signedInAs(7);
    const res = await me.call(path);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
