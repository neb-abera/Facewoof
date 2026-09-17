/*
 * The contract, read as a privacy statement.
 *
 * owner_email is an account's identity and its owner's address. The friends
 * list and the discover feed once published it for every member because
 * their schemas were built by extending `User`. This pins the rule on the
 * generated document, so a schema that starts carrying the field again fails
 * here rather than in production: only `User` may hold it, and only the
 * routes that answer with the caller's OWN account may answer with `User`.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface Document {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
}

const document = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "../../server/openapi.json"),
    "utf8",
  ),
) as Document;

const OWN_ACCOUNT_ROUTES = [
  "/api/auth/guest",
  "/api/auth/me",
  "/api/currentuser",
];
const PRIVATE_FIELDS = ["owner_email", '"location"'];

describe("what the API publishes about other members", () => {
  it("keeps the email address and zip code on the User schema alone", () => {
    for (const [name, schema] of Object.entries(document.components.schemas)) {
      // Placed is the caller's own new location, answered to the caller.
      if (name === "User" || name === "Placed") continue;
      const text = JSON.stringify(schema);
      for (const field of PRIVATE_FIELDS) {
        expect(text, `${name} must not carry ${field}`).not.toContain(field);
      }
    }
  });

  it("answers with User only on the caller's own account routes", () => {
    for (const [route, operations] of Object.entries(document.paths)) {
      if (OWN_ACCOUNT_ROUTES.includes(route)) continue;
      const text = JSON.stringify(operations);
      expect(text, `${route} must not answer with User`).not.toContain(
        "#/components/schemas/User",
      );
      for (const field of PRIVATE_FIELDS) {
        if (route === "/api/location" || route === "/api/onboarding") continue;
        expect(text, `${route} must not carry ${field}`).not.toContain(field);
      }
    }
  });
});
