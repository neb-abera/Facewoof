/*
 * The playdates the caller created, over HTTP, with the database stubbed
 * out. The pack calendar (GET /api/playdates) and adding to it are pinned
 * against a real database in tests/e2e/authz.spec.ts; this is the one
 * calendar route nothing asked for. It takes no id: whose playdates is
 * decided by the session alone.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Api } from "./helpers/api-harness.ts";

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

const db = vi.hoisted(() => ({
  getUserPlaydatesAllPacks: vi.fn(),
}));
vi.mock("../../server/db/index.ts", () => db);

const { ctrlUserPlaydatesAllPacks } = await import(
  "../../server/controllers/calendar.ts"
);
const { startApi } = await import("./helpers/api-harness.ts");

let api: Api;
beforeAll(async () => {
  api = await startApi([ctrlUserPlaydatesAllPacks]);
});
afterAll(() => api.close());

describe("GET /api/getUserPlaydates", () => {
  it("answers 401 with no session", async () => {
    expect((await api.visitor().call("/api/getUserPlaydates")).status).toBe(
      401,
    );
    expect(db.getUserPlaydatesAllPacks).not.toHaveBeenCalled();
  });

  it("is the caller's own playdates, with pg's Dates as ISO strings", async () => {
    db.getUserPlaydatesAllPacks.mockResolvedValueOnce({
      rows: [
        {
          playdate_id: 11,
          pack_id: 3,
          user_id: 7,
          body: "Fetch at the park",
          start_date: new Date("2026-09-20T15:00:00Z"),
          end_date: new Date("2026-09-20T16:00:00Z"),
        },
      ],
    });
    const me = await api.signedInAs(7);
    const res = await me.call("/api/getUserPlaydates?userId=8");
    expect(res.status).toBe(200);
    expect(db.getUserPlaydatesAllPacks).toHaveBeenCalledWith(7);
    expect(await res.json()).toEqual([
      {
        playdate_id: 11,
        pack_id: 3,
        user_id: 7,
        body: "Fetch at the park",
        start_date: "2026-09-20T15:00:00.000Z",
        end_date: "2026-09-20T16:00:00.000Z",
      },
    ]);
  });
});
