/*
 * The route table as an OpenAPI 3.1 document.
 *
 * Generated, never edited: `npm run openapi` writes server/openapi.json, and
 * scripts/check-contract.sh fails CI when the committed file is not what this
 * produces. The client's types (src/api-types.d.ts) are generated from the
 * document in turn, so a change to a schema in server/api/schemas.ts reaches
 * the client as a compile error rather than a runtime surprise.
 *
 * The Zod schemas are the source. Zod 4 emits JSON Schema itself; the named
 * schemas (those with an `id` in the global registry) are lifted into
 * components/schemas so the client gets a `User` type, not a dozen anonymous
 * copies of one.
 */
import fs from "node:fs";
import { z } from "zod";
import type { AnyRoute } from "./route.ts";
import { ErrorBody } from "./schemas.ts";

type JsonObject = Record<string, unknown>;

const DESCRIPTIONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No content",
  302: "Redirect",
  400: "The request did not match its schema; `issues` says where",
  401: "Sign in first",
  403: "Not allowed for this account",
  404: "Not found",
  429: "Rate limited; see the RateLimit-* headers",
  500: "Internal error",
  502: "The sign-in provider could not be reached",
  503: "Sign-in is not configured on this instance",
};

/*
 * Move Zod's `$defs` into OpenAPI's components/schemas and point every $ref
 * at the new home. Walks the whole value; a $ref can sit at any depth.
 */
const relocateRefs = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(relocateRefs);
  if (value && typeof value === "object") {
    const out: JsonObject = {};
    for (const [key, inner] of Object.entries(value as JsonObject)) {
      out[key] =
        key === "$ref" && typeof inner === "string"
          ? inner.replace(/^#\/\$defs\//, "#/components/schemas/")
          : relocateRefs(inner);
    }
    return out;
  }
  return value;
};

export function buildOpenApi(routes: readonly AnyRoute[]): JsonObject {
  const components: Record<string, unknown> = {};

  const toSchema = (schema: z.ZodType): JsonObject => {
    const json = z.toJSONSchema(schema, {
      target: "draft-2020-12",
      io: "output",
      metadata: z.globalRegistry,
      unrepresentable: "any",
    }) as JsonObject;
    const { $schema: _drop, $defs, ...rest } = json;
    if ($defs && typeof $defs === "object") {
      for (const [name, def] of Object.entries($defs as JsonObject)) {
        components[name] = relocateRefs(def);
      }
    }
    return relocateRefs(rest) as JsonObject;
  };

  const errorSchema = () => toSchema(ErrorBody);

  const jsonResponse = (status: number, schema: JsonObject) => ({
    description: DESCRIPTIONS[status] ?? "",
    content: { "application/json": { schema } },
  });

  const paths: Record<string, JsonObject> = {};

  for (const route of routes) {
    const responses: Record<string, unknown> = {};
    for (const [statusText, schema] of Object.entries(route.responses)) {
      const status = Number(statusText);
      responses[statusText] =
        schema === null || schema === undefined
          ? { description: DESCRIPTIONS[status] ?? "" }
          : jsonResponse(status, toSchema(schema as z.ZodType));
    }
    // What the adapter adds around every handler, so the document says it.
    if (route.body || route.query)
      responses["400"] ??= jsonResponse(400, errorSchema());
    if (route.auth) responses["401"] ??= jsonResponse(401, errorSchema());
    if (route.limit) responses["429"] ??= jsonResponse(429, errorSchema());
    responses["500"] ??= jsonResponse(500, errorSchema());

    const parameters: JsonObject[] = [];
    if (route.query) {
      const shape = (route.query as z.ZodObject).shape;
      for (const [name, field] of Object.entries(shape)) {
        parameters.push({
          name,
          in: "query",
          required: !(field as z.ZodType).safeParse(undefined).success,
          schema: toSchema(field as z.ZodType),
        });
      }
    }

    const operation: JsonObject = {
      summary: route.summary,
      operationId: `${route.method}${route.path
        .replace(/^\/api/, "")
        .replace(/[/-]+(\w)/g, (_m, c: string) => c.toUpperCase())}`,
      ...(parameters.length ? { parameters } : {}),
      ...(route.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: toSchema(route.body),
                },
              },
            },
          }
        : {}),
      responses: Object.fromEntries(
        Object.entries(responses).sort(([a], [b]) => Number(a) - Number(b)),
      ),
      // What a caller must present: the session cookie behind auth, and the
      // CSRF token on anything that is not a GET. Declared as security
      // schemes rather than parameters so the generated client does not ask
      // for the token on every call — src/api.ts adds it from the cookie.
      security: [
        {
          ...(route.auth ? { session: [] } : {}),
          ...(route.method !== "get" ? { xsrf: [] } : {}),
        },
      ].filter((requirement) => Object.keys(requirement).length > 0),
    };

    let entry = paths[route.path];
    if (!entry) {
      entry = {};
      paths[route.path] = entry;
    }
    entry[route.method] = operation;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Facewoof API",
      version: "1",
      description:
        "Generated from server/routes.ts by server/api/openapi.ts. Do not edit; run `npm run openapi`.",
    },
    paths,
    components: {
      schemas: Object.fromEntries(
        Object.entries(components).sort(([a], [b]) => a.localeCompare(b)),
      ),
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "facewoof.sid",
          description:
            "The signed session cookie set by POST /api/auth/guest or the OIDC callback.",
        },
        xsrf: {
          type: "apiKey",
          in: "header",
          name: "x-xsrf-token",
          description:
            "CSRF double-submit: the value of the XSRF-TOKEN cookie, echoed back on every request that is not a GET. A request without it is refused with 403 before any route runs.",
        },
      },
    },
  };
}

export const render = (routes: readonly AnyRoute[]) =>
  `${JSON.stringify(buildOpenApi(routes), null, 2)}\n`;

// `node server/api/openapi.ts [out]` writes the document; the default is the
// committed location.
if (import.meta.main) {
  const { routes } = await import("../routes.ts");
  const out = process.argv[2] ?? "server/openapi.json";
  fs.writeFileSync(out, render(routes));
  console.log(`wrote ${out}`);
}
