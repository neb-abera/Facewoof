/*
 * The route-table adapter, driven through a real Express app on a random
 * port with fake routes: no database, no real handlers. What it pins is the
 * contract machinery itself — a body that fails its schema is a 400 with the
 * field named, a reply that fails its own response schema is a 500 and never
 * reaches the wire, a status the route did not declare is a 500, a route
 * behind `auth: true` refuses a caller with no session, and an /api path no
 * route claims is a JSON 404.
 */
import type { Server } from "node:http";
import cookieSession from "cookie-session";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buildRouter } from "../../server/api/express.ts";
import {
  defineRoute,
  noContent,
  redirect,
  reply,
} from "../../server/api/route.ts";
import { actingUser } from "../../server/middleware/requireUser.ts";

const Echo = z.object({ name: z.string(), count: z.coerce.number().int() });

const routes = [
  defineRoute({
    method: "post",
    path: "/api/test/echo",
    summary: "echo the parsed body",
    auth: false,
    body: Echo,
    responses: { 200: Echo },
    handler: async ({ body }) => reply(200, body),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/query",
    summary: "parse the query string",
    auth: false,
    query: z.object({ packId: z.coerce.number().int() }),
    responses: { 200: z.object({ packId: z.number() }) },
    handler: async ({ query }) => reply(200, { packId: query.packId }),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/broken-contract",
    summary: "answer with a body that violates its own schema",
    auth: false,
    responses: { 200: z.object({ ok: z.literal(true) }) },
    // The cast is the point: a handler that lies about its body.
    handler: async () => reply(200, { ok: false as unknown as true }),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/undeclared",
    summary: "answer with a status the route does not declare",
    auth: false,
    responses: { 200: z.object({}) },
    handler: async () => reply(418 as unknown as 200, {}),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/private",
    summary: "needs a signed-in user",
    auth: true,
    responses: { 200: z.object({ userId: z.number() }) },
    handler: async ({ userId }) => reply(200, { userId }),
  }),
  defineRoute({
    method: "post",
    path: "/api/test/sign-in",
    summary: "put a user id in the session, the way guest sign-in does",
    auth: false,
    body: z.object({ as: z.number().int() }),
    responses: { 200: z.object({ wasSignedIn: z.boolean() }) },
    handler: async ({ body, session, userId }) => {
      session.userId = body.as;
      return reply(200, { wasSignedIn: userId !== null });
    },
  }),
  defineRoute({
    method: "post",
    path: "/api/test/sign-out",
    summary: "drop the session",
    auth: false,
    responses: { 204: null },
    handler: async ({ clearSession }) => {
      clearSession();
      return noContent(204);
    },
  }),
  defineRoute({
    method: "get",
    path: "/api/test/dates",
    summary: "a Date in the body becomes the ISO string the schema expects",
    auth: false,
    responses: { 200: z.object({ when: z.iso.datetime({ offset: true }) }) },
    handler: async () => reply(200, { when: new Date("2026-09-12T10:00:00Z") }),
  }),
  defineRoute({
    method: "post",
    path: "/api/test/empty",
    summary: "no body",
    auth: false,
    responses: { 204: null },
    handler: async () => noContent(204),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/away",
    summary: "a redirect",
    auth: false,
    responses: { 302: null },
    handler: async () => redirect(302, "/somewhere-else"),
  }),
  defineRoute({
    method: "get",
    path: "/api/test/throws",
    summary: "a handler that throws",
    auth: false,
    responses: { 200: z.object({}) },
    handler: async () => {
      throw new Error("boom");
    },
  }),
];

let server: Server;
let base: string;

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
});

afterAll(() => {
  server.close();
});

const post = (path: string, body: unknown) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("the route-table adapter", () => {
  it("parses the body and hands the handler the parsed value", async () => {
    const res = await post("/api/test/echo", { name: "Biscuit", count: "3" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    // "3" was coerced on the way in, so the handler saw a number.
    expect(await res.json()).toEqual({ name: "Biscuit", count: 3 });
  });

  it("refuses a body that fails its schema, naming the field", async () => {
    const res = await post("/api/test/echo", { count: "three" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("invalid request body");
    expect(body.issues.join("\n")).toMatch(/name/);
    expect(body.issues.join("\n")).toMatch(/count/);
  });

  it("parses the query string the same way", async () => {
    const ok = await fetch(`${base}/api/test/query?packId=7`);
    expect(await ok.json()).toEqual({ packId: 7 });
    const bad = await fetch(`${base}/api/test/query?packId=seven`);
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: string }).error).toBe(
      "invalid query string",
    );
  });

  it("never sends a reply that violates its own response schema", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fetch(`${base}/api/test/broken-contract`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal error" });
    expect(spy.mock.calls[0]?.[0]).toMatch(/did not match its contract/);
    spy.mockRestore();
  });

  it("treats a status the route did not declare as a bug", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fetch(`${base}/api/test/undeclared`);
    expect(res.status).toBe(500);
    expect(spy.mock.calls[0]?.[0]).toMatch(/does not declare/);
    spy.mockRestore();
  });

  it("refuses a route behind auth to a caller with no session", async () => {
    const res = await fetch(`${base}/api/test/private`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "sign in first" });
  });

  it("hands a route behind auth the user the session cookie names", async () => {
    // A route without auth sees `userId: null` for an anonymous caller, and
    // can sign them in by writing to the session.
    const signIn = await post("/api/test/sign-in", { as: 42 });
    expect(await signIn.json()).toEqual({ wasSignedIn: false });
    const cookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    expect(cookie).toContain("test.sid=");

    // With that cookie the private route knows who is calling.
    const res = await fetch(`${base}/api/test/private`, {
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 42 });

    // And clearing the session signs them out again.
    const out = await fetch(`${base}/api/test/sign-out`, {
      method: "POST",
      headers: { cookie },
    });
    expect(out.status).toBe(204);
    const cleared = out.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const after = await fetch(`${base}/api/test/private`, {
      headers: { cookie: cleared },
    });
    expect(after.status).toBe(401);
  });

  it("actingUser refuses to run on a route that was not put behind requireUser", () => {
    expect(() => actingUser({} as Parameters<typeof actingUser>[0])).toThrow(
      /not behind requireUser/,
    );
  });

  it("serialises a Date into the ISO string the schema describes", async () => {
    const res = await fetch(`${base}/api/test/dates`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ when: "2026-09-12T10:00:00.000Z" });
  });

  it("sends no body for a 204 and a Location for a redirect", async () => {
    const empty = await post("/api/test/empty", {});
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");

    const away = await fetch(`${base}/api/test/away`, { redirect: "manual" });
    expect(away.status).toBe(302);
    expect(away.headers.get("location")).toBe("/somewhere-else");
  });

  it("turns a thrown error into a JSON 500 with the route in the log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fetch(`${base}/api/test/throws`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal error" });
    expect(spy.mock.calls[0]?.[0]).toMatch(/GET \/api\/test\/throws/);
    spy.mockRestore();
  });

  it("answers an /api path no route claims with a JSON 404", async () => {
    const res = await fetch(`${base}/api/nothing-here`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });
});
