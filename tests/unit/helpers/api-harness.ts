/*
 * The real app around a handful of real routes, on a random port.
 *
 * createApp() as production assembles it — the session, the body parsers
 * and their 32 kB cap, CSRF, the /api backstop limiter, the route adapter —
 * in front of the routes a test hands it, plus two test routes: one that
 * hands out the CSRF token cookie (the job /api/auth/me does for the real
 * client on load) and one that signs the caller in as any user id, the way
 * the real sign-in routes do (establishSession). A test mocks
 * server/db/sessions.ts and whatever of server/db/index.ts its routes read;
 * nothing here needs a database.
 *
 *   const api = await startApi([editProfile]);
 *   const me = await api.signedInAs(7);
 *   const res = await me.call("/api/edituser", { method: "PUT", body });
 */
import fs from "node:fs";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { buildRouter } from "../../../server/api/express.ts";
import {
  type AnyRoute,
  defineRoute,
  noContent,
} from "../../../server/api/route.ts";
import { createApp } from "../../../server/app.ts";
import { CSRF_COOKIE } from "../../../server/csrf.ts";
import { establishSession } from "../../../server/session.ts";

/* Any GET under /api leaves the token cookie behind; this one does nothing else. */
const csrfToken = defineRoute({
  method: "get",
  path: "/api/test/csrf",
  summary: "hand out the CSRF token cookie",
  auth: false,
  responses: { 204: null },
  handler: async () => noContent(204),
});

const signIn = defineRoute({
  method: "post",
  path: "/api/test/sign-in",
  summary: "sign in as the given user, the way the real sign-in routes do",
  auth: false,
  body: z.object({ as: z.number().int() }),
  responses: { 204: null },
  handler: async ({ body, session }) => {
    establishSession(session, body.as, 0);
    return noContent(204);
  },
});

export interface CallInit {
  method?: string;
  /* Sent as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  /* false leaves the CSRF header off, to show that it is demanded. */
  csrf?: boolean;
}

export interface Visitor {
  call(path: string, init?: CallInit): Promise<Response>;
  jar: Map<string, string>;
}

export interface Api {
  base: string;
  /* A browser's worth of state: cookies kept, the CSRF token echoed. */
  visitor(): Visitor;
  /* A visitor already signed in as `userId`. */
  signedInAs(userId: number): Promise<Visitor>;
  close(): void;
}

export async function startApi(routes: readonly AnyRoute[]): Promise<Api> {
  const clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "facewoof-client-"));
  fs.writeFileSync(path.join(clientDir, "index.html"), "<!doctype html>app");

  const app = createApp({
    router: buildRouter([...routes, csrfToken, signIn]),
    clientDir,
    checkDatabase: async () => {},
  });
  const server = await new Promise<Server>((resolve) => {
    const listening: Server = app.listen(0, () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  const base = `http://127.0.0.1:${address.port}`;

  const visitor = (): Visitor => {
    const jar = new Map<string, string>();
    const call = async (route: string, init: CallInit = {}) => {
      const method = init.method ?? "GET";
      // What the client does before its first write: one GET so the token
      // is in the jar (src/api.ts).
      if (method !== "GET" && !jar.has(CSRF_COOKIE))
        await call("/api/test/csrf");

      const headers: Record<string, string> = {
        cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
        ...init.headers,
      };
      if (init.body !== undefined) headers["content-type"] = "application/json";
      const token = jar.get(CSRF_COOKIE);
      if (init.csrf !== false && token) {
        headers["x-xsrf-token"] = decodeURIComponent(token);
      }

      const res = await fetch(base + route, {
        method,
        headers,
        body: init.body === undefined ? null : JSON.stringify(init.body),
        redirect: "manual",
      });
      for (const cookie of res.headers.getSetCookie()) {
        const [pair = ""] = cookie.split(";");
        const [name = "", ...value] = pair.split("=");
        jar.set(name, value.join("="));
      }
      return res;
    };
    return { call, jar };
  };

  const signedInAs = async (userId: number) => {
    const v = visitor();
    const res = await v.call("/api/test/sign-in", {
      method: "POST",
      body: { as: userId },
    });
    if (res.status !== 204) throw new Error(`sign-in answered ${res.status}`);
    return v;
  };

  const close = () => {
    server.close();
    fs.rmSync(clientDir, { recursive: true, force: true });
  };

  return { base, visitor, signedInAs, close };
}
