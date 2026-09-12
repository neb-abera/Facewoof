import type { RequestHandler } from "express";
import zipcodes from "zipcodes";
import { completeOnboarding } from "../db/index.ts";
import { actingUser } from "../middleware/requireUser.ts";

/*
 * Finish setting up an account created by signing in with a provider.
 *
 * A demo account arrives cloned from the template, with a dog and a roster of
 * neighbours already around it. An account created by signing in has neither,
 * so without this it landed on an empty discover feed with nothing to do and
 * no explanation. This is the step that gives it both.
 */
export const finish: RequestHandler = async (req, res) => {
  const { dogName, dogBreed, age, vaccination, zip, lat, lng } = req.body || {};

  if (!dogName || !String(dogName).trim()) {
    res.status(400).send("a dog name is required");
    return;
  }

  // Either a typed zip or the device's coordinates. Neither is required: the
  // feed falls back to a default city rather than coming back empty.
  let resolved: string | null =
    zip && zipcodes.lookup(zip) ? String(zip) : null;
  if (
    !resolved &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  ) {
    const match = zipcodes.lookupByCoords(Number(lat), Number(lng));
    if (match) resolved = match.zip;
  }

  const parsedAge = Number.isFinite(Number(age)) ? Number(age) : null;

  try {
    const { nearby } = await completeOnboarding({
      userId: actingUser(req),
      dogName: String(dogName).trim(),
      dogBreed: dogBreed ? String(dogBreed).trim() : null,
      age: parsedAge,
      vaccination: typeof vaccination === "boolean" ? vaccination : null,
      zip: resolved,
    });

    res.status(200).send({ location: resolved, nearby });
  } catch (err) {
    console.error("unable to finish onboarding", err);
    res.status(500).send("unable to finish setting up your profile");
  }
};
