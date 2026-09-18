/*
 * Which image URLs the API will store, and the upload signature endpoint,
 * driven over HTTP through the real route definitions and the real adapter.
 * The photo route's body schema is mounted with a stand-in handler, so the
 * rule is tested where a request meets it without needing a database.
 */
import type { Server } from "node:http";
import cookieSession from "cookie-session";
import express from "express";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";

vi.mock("../../server/db/sessions.ts", () => ({
  sessionVersionOf: vi.fn(async () => 0),
  bumpSessionVersion: vi.fn(),
}));

import { buildRouter } from "../../server/api/express.ts";
import { defineRoute, reply } from "../../server/api/route.ts";
import { MakePostBody, PhotoBody } from "../../server/api/schemas.ts";
import {
  uploadConfig,
  uploadSignature,
} from "../../server/controllers/uploads.ts";
import {
  cloudinarySignature,
  IMAGE_SOURCES,
  isAllowedImageUrl,
  isUploadedImageUrl,
  warnIfUploadsUnsigned,
} from "../../server/media.ts";
import { establishSession } from "../../server/session.ts";

const Ok = z.object({ stored: z.string().nullable() });

const routes = [
  defineRoute({
    method: "post",
    path: "/api/test/sign-in",
    summary: "a session, the way guest sign-in makes one",
    auth: false,
    responses: { 200: z.object({}) },
    handler: async ({ session }) => {
      establishSession(session, 7, 0);
      return reply(200, {});
    },
  }),
  defineRoute({
    method: "post",
    path: "/api/photos",
    summary: "the real photo body, without the database behind it",
    auth: false,
    body: PhotoBody,
    responses: { 200: Ok },
    handler: async ({ body }) => reply(200, { stored: body.photoUrl }),
  }),
  defineRoute({
    method: "post",
    path: "/api/makePost",
    summary: "the real post body, without the database behind it",
    auth: false,
    body: MakePostBody,
    responses: { 200: Ok },
    handler: async ({ body }) =>
      reply(200, { stored: body.packet.photo_url || null }),
  }),
  uploadConfig,
  uploadSignature,
];

let server: Server;
let base: string;
let cookie: string;

beforeAll(async () => {
  const app = express();
  app.use(cookieSession({ name: "test.sid", keys: ["test-only"] }));
  app.use(express.json());
  app.use(buildRouter(routes));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${address.port}`;
  const signIn = await fetch(`${base}/api/test/sign-in`, { method: "POST" });
  cookie = signIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
});

afterAll(() => server.close());
afterEach(() => vi.unstubAllEnvs());

const post = (path: string, body?: unknown, headers = {}) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? null : JSON.stringify(body),
  });

const GOOD = "https://res.cloudinary.com/abera/image/upload/v1/Facewoof/a.jpg";

describe("a stored photo URL", () => {
  it.each([
    ["plain http", "http://res.cloudinary.com/abera/image/upload/a.jpg"],
    ["another host", "https://evil.example/tracker.gif"],
    ["a script URL", "javascript:alert(1)"],
    ["a data URL", "data:image/png;base64,AAAA"],
    ["the host as userinfo", "https://res.cloudinary.com@evil.example/a.jpg"],
    [
      "a lookalike host",
      "https://res.cloudinary.com.evil.example/x/image/upload/a",
    ],
    [
      "another port",
      "https://res.cloudinary.com:8443/abera/image/upload/a.jpg",
    ],
    ["a non-image path", "https://res.cloudinary.com/abera/raw/upload/a.html"],
    // Nobody can upload to the demo host, so a NEW photo cannot be there.
    ["the demo host", "https://placedog.net/500/500?id=1"],
  ])("is refused as a profile photo when it is %s", async (_label, url) => {
    const res = await post("/api/photos", { photoUrl: url });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { issues: string[] };
    expect(body.issues.join()).toMatch(/photoUrl/);
  });

  it("is accepted when an upload could have produced it", async () => {
    const res = await post("/api/photos", { photoUrl: GOOD });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stored: GOOD });
  });

  it("must be under the configured cloud once the server knows it", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "abera");
    expect((await post("/api/photos", { photoUrl: GOOD })).status).toBe(200);
    const other = GOOD.replace("/abera/", "/somebody-else/");
    expect((await post("/api/photos", { photoUrl: other })).status).toBe(400);
  });

  it("on a post may also be the demo roster's host, and nothing else", async () => {
    const packet = (photo_url: unknown) => ({
      packet: { pack_id: 1, body: "hello", photo_url },
    });
    for (const fine of [GOOD, "https://placedog.net/500/500?id=1", "", null]) {
      const res = await post("/api/makePost", packet(fine));
      expect(res.status, String(fine)).toBe(200);
    }
    for (const bad of ["https://evil.example/a.gif", "javascript:alert(1)"]) {
      const res = await post("/api/makePost", packet(bad));
      expect(res.status, bad).toBe(400);
    }
  });

  it("shares its host list with the CSP's img-src", () => {
    expect(IMAGE_SOURCES).toEqual([
      "https://res.cloudinary.com",
      "https://placedog.net",
    ]);
    for (const source of IMAGE_SOURCES) {
      expect(isAllowedImageUrl(`${source}/x/image/upload/a.jpg`)).toBe(true);
    }
    expect(isUploadedImageUrl("https://placedog.net/1", {})).toBe(false);
  });
});

describe("the upload signature endpoint", () => {
  const configure = () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "abera");
    vi.stubEnv("CLOUDINARY_API_KEY", "1234567890");
    vi.stubEnv("CLOUDINARY_API_SECRET", "not-a-real-secret");
  };

  it("is for signed-in callers only", async () => {
    configure();
    expect((await post("/api/uploads/signature")).status).toBe(401);
  });

  it("says so, and signs nothing, while the secret is not provisioned", async () => {
    const config = await fetch(`${base}/api/uploads/config`, {
      headers: { cookie },
    });
    expect(await config.json()).toEqual({ signed: false });
    const res = await post("/api/uploads/signature", undefined, { cookie });
    expect(res.status).toBe(404);
  });

  it("hands back a ticket Cloudinary would accept, without the secret in it", async () => {
    configure();
    const config = await fetch(`${base}/api/uploads/config`, {
      headers: { cookie },
    });
    expect(await config.json()).toEqual({ signed: true });

    const res = await post("/api/uploads/signature", undefined, { cookie });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain("not-a-real-secret");

    const ticket = JSON.parse(text) as {
      uploadUrl: string;
      fields: Record<string, string>;
      expiresAt: string;
    };
    expect(ticket.uploadUrl).toBe(
      "https://api.cloudinary.com/v1_1/abera/image/upload",
    );
    const { signature, api_key, ...signed } = ticket.fields;
    expect(api_key).toBe("1234567890");
    // Fixed by the server, and covered by the signature.
    expect(signed.folder).toBe("Facewoof");
    expect(signed.allowed_formats).toBe("jpg,png,webp,gif,heic");
    expect(signed.transformation).toBe("c_limit,h_1600,w_1600");
    expect(signature).toBe(cloudinarySignature(signed, "not-a-real-secret"));

    // Cloudinary honours a timestamp for an hour; this one is backdated so
    // that about ten minutes of it are left.
    const remaining = Number(signed.timestamp) + 3600 - Date.now() / 1000;
    expect(remaining).toBeGreaterThan(9 * 60);
    expect(remaining).toBeLessThanOrEqual(10 * 60);
    const expires = (Date.parse(ticket.expiresAt) - Date.now()) / 1000;
    expect(expires).toBeGreaterThan(9 * 60);
    expect(expires).toBeLessThanOrEqual(10 * 60);
  });

  it("computes the signature Cloudinary documents", () => {
    // The worked example in Cloudinary's "generating authentication
    // signatures" guide.
    expect(
      cloudinarySignature(
        {
          timestamp: 1315060510,
          public_id: "sample_image",
          eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("warns at start-up when production is still on the unsigned preset", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfUploadsUnsigned({ NODE_ENV: "development" });
    expect(warn).not.toHaveBeenCalled();
    warnIfUploadsUnsigned({
      NODE_ENV: "production",
      CLOUDINARY_CLOUD_NAME: "abera",
      CLOUDINARY_API_KEY: "k",
      CLOUDINARY_API_SECRET: "s",
    });
    expect(warn).not.toHaveBeenCalled();
    warnIfUploadsUnsigned({ NODE_ENV: "production" });
    expect(warn.mock.calls[0]?.[0]).toMatch(/unsigned preset/);
    warn.mockRestore();
  });
});
