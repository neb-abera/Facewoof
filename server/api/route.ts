/*
 * The shape of a route, as the one table every HTTP endpoint lives in.
 *
 * A route declares its method and path, whether it needs a signed-in user,
 * its rate limiter, a Zod schema for the body and for the query string, and
 * a Zod schema for every status it can answer with. The handler receives the
 * input already parsed — it never sees `req.body` — and returns a reply whose
 * status and body are checked against the declared responses, by the type
 * system when it is written and by Zod when it runs.
 *
 * Two consumers read the table and nothing else does: express.ts turns it
 * into the Express router, openapi.ts turns it into the OpenAPI document.
 * That is what makes the document a contract rather than documentation: the
 * routes and their description are the same data, so they cannot drift.
 */
import type { RequestHandler } from "express";
import type { z } from "zod";

export type Method = "get" | "post" | "put" | "delete";

/*
 * What a route can answer with, by status. A schema describes a JSON body;
 * `null` marks a status with no body (204, or a redirect).
 */
export type Responses = Readonly<Partial<Record<number, z.ZodType | null>>>;

/*
 * A response body as a handler may build it: the declared JSON shape, except
 * that a Date is welcome wherever the schema says string. pg hands rows back
 * with Date objects and JSON.stringify turns them into the ISO strings the
 * schema describes, so the adapter serialises first and validates the JSON —
 * the handler need not convert timestamps by hand to satisfy the type.
 */
export type Loose<T> = T extends string
  ? string | Date
  : T extends (infer U)[]
    ? Loose<U>[]
    : T extends object
      ? { [K in keyof T]: Loose<T[K]> }
      : T;

/* One reply the handler may return, derived from the responses it declared. */
export type ReplyOf<R extends Responses> = {
  [S in keyof R & number]: R[S] extends z.ZodType
    ? { status: S; body: Loose<z.output<R[S]>> }
    : R[S] extends null
      ? { status: S; location?: string }
      : never;
}[keyof R & number];

export type Parsed<S extends z.ZodType | undefined> = S extends z.ZodType
  ? z.output<S>
  : undefined;

/* What a handler is handed. */
export interface Context<
  Body extends z.ZodType | undefined,
  Query extends z.ZodType | undefined,
  Auth extends boolean,
> {
  /* The acting user: a number behind `auth: true`, otherwise whoever the
   * session says, if anyone. */
  userId: Auth extends true ? number : number | null;
  body: Parsed<Body>;
  query: Parsed<Query>;
  /* The session, for the handful of routes that sign people in. */
  session: CookieSessionInterfaces.CookieSessionObject;
  /* Drop the session cookie: sign-out, and an account that no longer exists. */
  clearSession: () => void;
}

export interface RouteDef<
  Body extends z.ZodType | undefined,
  Query extends z.ZodType | undefined,
  R extends Responses,
  Auth extends boolean,
> {
  method: Method;
  path: `/api/${string}`;
  /* One line for the OpenAPI document and for the error log. */
  summary: string;
  /* Routes that need a signed-in user are mounted behind requireUser. */
  auth: Auth;
  /* A per-route rate limiter, on top of the /api backstop. */
  limit?: RequestHandler;
  body?: Body;
  query?: Query;
  responses: R;
  /*
   * Always async, even when nothing is awaited. With a `Promise<Reply> | Reply`
   * return type TypeScript stops contextually typing the returned object
   * literal, widens `status: 201` to number, and the check against the
   * declared responses is lost; one return shape keeps it.
   */
  handler: (ctx: Context<Body, Query, Auth>) => Promise<ReplyOf<R>>;
}

/*
 * The table's element type. The generics are erased here on purpose: the
 * adapters work on any route, and the handler's precise types were already
 * checked where the route was defined. `handler` is a method signature so
 * the parameter is checked bivariantly; as a function-typed property, a
 * route whose context demands `userId: number` would not be assignable.
 */
export interface AnyRoute {
  method: Method;
  path: `/api/${string}`;
  summary: string;
  auth: boolean;
  limit?: RequestHandler | undefined;
  body?: z.ZodType | undefined;
  query?: z.ZodType | undefined;
  responses: Responses;
  // biome-ignore lint/suspicious/noExplicitAny: erased; the precise types were checked by defineRoute
  handler(ctx: Context<any, any, boolean>): Promise<unknown>;
}

/*
 * Identity with inference. Writing `defineRoute({...})` rather than typing
 * the object literal as RouteDef is what lets TypeScript infer Body, Query
 * and the responses from the literal and then check the handler against
 * them, so a handler that returns a status it did not declare, or a body
 * that does not match the declared schema, does not compile.
 */
export const defineRoute = <
  Body extends z.ZodType | undefined = undefined,
  Query extends z.ZodType | undefined = undefined,
  const R extends Responses = Responses,
  Auth extends boolean = false,
>(
  def: RouteDef<Body, Query, R, Auth>,
): RouteDef<Body, Query, R, Auth> => def;

/*
 * Reply constructors. Written as functions rather than object literals so the
 * status keeps its literal type: `{ status: 201, body }` infers `number`
 * unless the literal is annotated, and then the check that a handler only
 * answers with statuses it declared would be lost. `reply(201, body)` infers
 * `201`.
 */
export const reply = <S extends number, B>(status: S, body: B) => ({
  status,
  body,
});

export const noContent = <S extends number>(status: S) => ({ status });

export const redirect = <S extends number>(status: S, location: string) => ({
  status,
  location,
});
