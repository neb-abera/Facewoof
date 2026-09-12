import zipcodes from "zipcodes";
import { defineRoute, reply } from "../api/route.ts";
import { OnboardingBody, Placed } from "../api/schemas.ts";
import { completeOnboarding } from "../db/index.ts";
import { writeLimiter } from "../limits.ts";

/*
 * Finish setting up an account created by signing in with a provider.
 *
 * A demo account arrives cloned from the template, with a dog and a roster of
 * neighbours already around it. An account created by signing in has neither,
 * so without this it landed on an empty discover feed with nothing to do and
 * no explanation. This is the step that gives it both.
 */
export const finish = defineRoute({
  method: "put",
  path: "/api/onboarding",
  summary: "Finish setting up a newly signed-in account",
  auth: true,
  limit: writeLimiter,
  body: OnboardingBody,
  responses: { 200: Placed },
  handler: async ({ userId, body }) => {
    // Either a typed zip or the device's coordinates. Neither is required:
    // the feed falls back to a default city rather than coming back empty.
    let resolved: string | null =
      body.zip && zipcodes.lookup(body.zip) ? body.zip : null;
    if (!resolved && body.lat !== undefined && body.lng !== undefined) {
      const match = zipcodes.lookupByCoords(body.lat, body.lng);
      if (match) resolved = match.zip;
    }

    const { nearby } = await completeOnboarding({
      userId,
      dogName: body.dogName,
      dogBreed: body.dogBreed || null,
      age: body.age ?? null,
      vaccination: body.vaccination ?? null,
      zip: resolved,
    });

    return reply(200, { location: resolved, nearby });
  },
});
