/*
 * The caller's own account, over HTTP, with the database stubbed out: the
 * one-element list the original client read it as, the profile edit, and
 * the photo rows. None of the three takes an id — the session decides whose
 * account is read or written — so "user B refused user A's object" here is
 * that an id in the request changes nothing.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Api } from "./helpers/api-harness.ts";

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

const db = vi.hoisted(() => ({
  getCurrentUserPromise: vi.fn(),
  editProfilePromise: vi.fn(),
  getPfp: vi.fn(),
}));
vi.mock("../../server/db/index.ts", () => db);

const { ctrlPfp, editProfile, getCurrentUser } = await import(
  "../../server/controllers/profile.ts"
);
const { startApi } = await import("./helpers/api-harness.ts");

let api: Api;
beforeAll(async () => {
  api = await startApi([getCurrentUser, editProfile, ctrlPfp]);
});
afterAll(() => api.close());
beforeEach(() => vi.clearAllMocks());

/* A users row as pg hands it back, bookkeeping column included. */
const account = {
  user_id: 7,
  dog_name: "Biscuit",
  owner_name: "Sam",
  dog_breed: null,
  age: 3,
  vaccination: true,
  discoverable: true,
  owner_email: "sam@example.com",
  location: "10011",
  likes_one: null,
  likes_two: null,
  likes_three: null,
  is_guest: false,
  created_at: new Date("2026-09-01T00:00:00Z"),
  demo_of: null,
  cloned_from: null,
  onboarded_at: null,
  size: null,
  energy: null,
  best_time: null,
  bio: null,
  session_version: 3,
};

describe("GET /api/currentuser", () => {
  it("answers 401 with no session", async () => {
    expect((await api.visitor().call("/api/currentuser")).status).toBe(401);
    expect(db.getCurrentUserPromise).not.toHaveBeenCalled();
  });

  it("is the caller's own account as a one-element list, whatever id the request names", async () => {
    db.getCurrentUserPromise.mockResolvedValueOnce({ rows: [account] });
    const me = await api.signedInAs(7);
    const res = await me.call("/api/currentuser?userId=8");
    expect(res.status).toBe(200);
    expect(db.getCurrentUserPromise).toHaveBeenCalledWith(7);

    const body = (await res.json()) as Record<string, unknown>[];
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      user_id: 7,
      owner_email: "sam@example.com",
      created_at: "2026-09-01T00:00:00.000Z",
    });
    // The schema does not declare it, so it never leaves.
    expect(body[0]).not.toHaveProperty("session_version");
  });
});

describe("PUT /api/edituser", () => {
  const edits = {
    dogName: "  Biscuit ",
    ownerName: "Sam",
    dogBreed: "Corgi",
    age: "3",
    vaccination: true,
    discoverable: false,
    likesOne: "fetch",
    likesTwo: "",
    likesThree: null,
    size: "small",
    energy: "",
    bestTime: "",
    bio: "  ",
  };

  it("answers 401 with no session, before reading the body", async () => {
    const res = await api
      .visitor()
      .call("/api/edituser", { method: "PUT", body: edits });
    expect(res.status).toBe(401);
    expect(db.editProfilePromise).not.toHaveBeenCalled();
  });

  it("is a 400 naming the field for a body the schema refuses", async () => {
    const me = await api.signedInAs(7);
    const nameless = await me.call("/api/edituser", {
      method: "PUT",
      body: { ...edits, dogName: " " },
    });
    expect(nameless.status).toBe(400);
    expect(await nameless.json()).toEqual({
      error: "invalid request body",
      issues: ["dogName: the dog needs a name"],
    });

    const ancient = await me.call("/api/edituser", {
      method: "PUT",
      body: { ...edits, age: 31 },
    });
    expect(ancient.status).toBe(400);

    // The playdate menus are closed lists: a value from outside one is
    // refused, not stored for the page to render back to everyone.
    const offMenu = await me.call("/api/edituser", {
      method: "PUT",
      body: { ...edits, bestTime: "never" },
    });
    expect(offMenu.status).toBe(400);
    const { issues } = (await offMenu.json()) as { issues: string[] };
    expect(issues).toEqual([expect.stringMatching(/^bestTime: /)]);
    expect(db.editProfilePromise).not.toHaveBeenCalled();
  });

  it("writes the normalised fields to the caller's own row, whatever id the body names", async () => {
    db.editProfilePromise.mockResolvedValueOnce({ rowCount: 1 });
    const me = await api.signedInAs(7);
    const res = await me.call("/api/edituser", {
      method: "PUT",
      body: { ...edits, user_id: 8, userId: 8 },
    });
    expect(res.status).toBe(204);
    // Trimmed, an empty field or menu means null, and the row is the
    // session's.
    expect(db.editProfilePromise).toHaveBeenCalledWith(
      {
        dogName: "Biscuit",
        ownerName: "Sam",
        dogBreed: "Corgi",
        age: 3,
        vaccination: true,
        discoverable: false,
        likesOne: "fetch",
        likesTwo: null,
        likesThree: null,
        size: "small",
        energy: null,
        bestTime: null,
        bio: null,
      },
      7,
    );
  });

  it("defaults a bare edit to vaccinated=false and discoverable=true", async () => {
    db.editProfilePromise.mockResolvedValueOnce({ rowCount: 1 });
    const me = await api.signedInAs(7);
    const res = await me.call("/api/edituser", {
      method: "PUT",
      body: { dogName: "Rex" },
    });
    expect(res.status).toBe(204);
    expect(db.editProfilePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        dogName: "Rex",
        age: null,
        vaccination: false,
        discoverable: true,
      }),
      7,
    );
  });
});

/*
 * The body cap. Nothing this API accepts is large: server/app.ts sets 32 kB
 * where express would allow 100, and the parser sits in front of requireUser,
 * so an anonymous caller cannot make the server read a large body either.
 * Both edges are pinned — the last byte that fits and the first that does
 * not — against a real authenticated JSON route.
 */
describe("the 32 kB body cap, at PUT /api/edituser", () => {
  const CAP = 32 * 1024;
  /* A profile edit whose JSON is exactly `bytes` long. */
  const editOf = (bytes: number) => {
    const shell = JSON.stringify({ dogName: "Rex", bio: "" }).length;
    return { dogName: "Rex", bio: "x".repeat(bytes - shell) };
  };

  it("reads a body at the cap, and refuses one byte over with 413 before any handler", async () => {
    const me = await api.signedInAs(7);
    const atCap = await me.call("/api/edituser", {
      method: "PUT",
      body: editOf(CAP),
    });
    // Read in full: it is the schema that refuses it, bio being capped at 400.
    expect(atCap.status).toBe(400);
    const { issues } = (await atCap.json()) as { issues: string[] };
    expect(issues.join()).toContain("bio: ");

    const over = await me.call("/api/edituser", {
      method: "PUT",
      body: editOf(CAP + 1),
    });
    expect(over.status).toBe(413);
    expect(db.editProfilePromise).not.toHaveBeenCalled();
  });

  it("applies before sign-in is checked: an anonymous caller gets 413, not 401", async () => {
    const res = await api
      .visitor()
      .call("/api/edituser", { method: "PUT", body: editOf(CAP + 1) });
    expect(res.status).toBe(413);
  });
});

describe("GET /api/getPfp", () => {
  it("answers 401 with no session", async () => {
    expect((await api.visitor().call("/api/getPfp")).status).toBe(401);
    expect(db.getPfp).not.toHaveBeenCalled();
  });

  it("is the caller's own photo rows, declared fields only", async () => {
    db.getPfp.mockResolvedValueOnce({
      rows: [
        {
          photo_id: 1,
          user_id: 7,
          url: "https://res.cloudinary.com/demo/image/upload/biscuit.jpg",
          uploaded_by_ip: "203.0.113.7",
        },
      ],
    });
    const me = await api.signedInAs(7);
    const res = await me.call("/api/getPfp?userId=8");
    expect(res.status).toBe(200);
    expect(db.getPfp).toHaveBeenCalledWith(7);
    expect(await res.json()).toEqual([
      {
        photo_id: 1,
        user_id: 7,
        url: "https://res.cloudinary.com/demo/image/upload/biscuit.jpg",
      },
    ]);
  });
});
