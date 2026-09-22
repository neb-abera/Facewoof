/*
 * Properties of the two parsers that read a stranger's text straight from a
 * request body, under generated input with fast-check. Example tests say
 * what a handful of inputs do. These say what every input does:
 *
 * - neither the location resolver nor the image URL checks ever throw;
 * - a resolved location is a five-digit zip the table knows, or null;
 * - needsOrigin keeps its promise: when it says the origin is not read, the
 *   answer is the same with any origin and with none;
 * - an image URL with a scheme other than https, a port, or user info is
 *   refused, whatever else it says; and so is any host the app does not
 *   name.
 *
 * Seeded and bounded. A failing run prints the seed and the shrunk input.
 */
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import zipcodes from "zipcodes";
import { isAllowedImageUrl, isUploadedImageUrl } from "../../server/media.ts";

// The controller imports the database module. Stubbed, as discover.test.ts
// does, so the SQL layer stays out of this suite and out of its coverage.
vi.mock("../../server/db/index.ts", () => ({
  getUserLocation: vi.fn(),
  discoverFeedPage: vi.fn(),
  setRelationship: vi.fn(),
  checkForMatchAndCreate: vi.fn(),
  canSwipeOn: vi.fn(),
  hasLikedBack: vi.fn(),
}));
const { needsOrigin, resolveZip } = await import(
  "../../server/controllers/discover.ts"
);

const runs = { numRuns: 300 };

const anyText = fc.string({ maxLength: 120 });

// Text shaped like what the search box gets: a zip, "City, ST", a bare
// name, with the punctuation and spacing a person types.
const searchText = fc.oneof(
  fc.stringMatching(/^\d{5}$/),
  fc.stringMatching(/^ ?[A-Za-z .'-]{1,20},? ?[A-Za-z]{0,3} ?$/),
  anyText,
);

describe("resolveZip and needsOrigin", () => {
  it("never throw, and answer a known zip or null", () => {
    fc.assert(
      fc.property(
        searchText,
        fc.option(fc.stringMatching(/^\d{5}$/), { nil: null }),
        (text, near) => {
          expect(() => needsOrigin(text)).not.toThrow();
          const zip = resolveZip(text, near);
          if (zip !== null) {
            expect(zip).toMatch(/^\d{5}$/);
            expect(zipcodes.lookup(zip)).toBeTruthy();
          }
        },
      ),
      runs,
    );
  });

  it("read the origin only when needsOrigin says so", () => {
    fc.assert(
      fc.property(searchText, fc.stringMatching(/^\d{5}$/), (text, near) => {
        if (!needsOrigin(text)) {
          expect(resolveZip(text, near)).toBe(resolveZip(text, null));
          expect(resolveZip(text, "99999")).toBe(resolveZip(text, null));
        }
      }),
      runs,
    );
  });
});

describe("image URL checks", () => {
  const env = {};

  it("never throw on any text, and refuse text that is not a URL", () => {
    fc.assert(
      fc.property(anyText, (text) => {
        expect(() => isAllowedImageUrl(text, env)).not.toThrow();
        expect(() => isUploadedImageUrl(text, env)).not.toThrow();
        if (!/^https:\/\//i.test(text.trim())) {
          expect(isAllowedImageUrl(text, env)).toBe(false);
        }
      }),
      runs,
    );
  });

  it("refuse a port, user info, or a host the app does not name", () => {
    const host = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}\.[a-z]{2,6}$/);
    const path = fc.stringMatching(/^(\/[a-z0-9_-]{0,12}){0,5}$/);
    fc.assert(
      fc.property(
        host,
        path,
        fc.integer({ min: 1, max: 65535 }),
        (h, p, port) => {
          expect(isAllowedImageUrl(`https://${h}${p}`, env)).toBe(false);
          expect(
            isAllowedImageUrl(
              `https://res.cloudinary.com:${port}/x/image/upload${p}`,
              env,
            ),
          ).toBe(false);
          expect(
            isAllowedImageUrl(
              `https://res.cloudinary.com@${h}/x/image/upload${p}`,
              env,
            ),
          ).toBe(false);
          expect(
            isAllowedImageUrl(
              `https://user:pw@res.cloudinary.com/x/image/upload${p}`,
              env,
            ),
          ).toBe(false);
          expect(
            isAllowedImageUrl(
              `http://res.cloudinary.com/x/image/upload${p}`,
              env,
            ),
          ).toBe(false);
        },
      ),
      runs,
    );
  });

  it("accept an upload under the cloud, whatever the object path", () => {
    // Segments start with a letter or digit: a segment of dots is a
    // traversal, the URL parser folds it away, and the check refuses what
    // is left. The first run of this property found that, which is right.
    const tail = fc.stringMatching(
      /^(\/[A-Za-z0-9][A-Za-z0-9_.-]{0,15}){1,4}$/,
    );
    fc.assert(
      fc.property(tail, (t) => {
        expect(
          isUploadedImageUrl(
            `https://res.cloudinary.com/cloud/image/upload${t}`,
            env,
          ),
        ).toBe(true);
        expect(
          isAllowedImageUrl(
            `https://res.cloudinary.com/cloud/image/upload${t}`,
            env,
          ),
        ).toBe(true);
        expect(
          isUploadedImageUrl(
            `https://res.cloudinary.com/cloud/video/upload${t}`,
            env,
          ),
        ).toBe(false);
      }),
      runs,
    );
  });
});
