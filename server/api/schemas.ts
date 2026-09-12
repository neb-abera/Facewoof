/*
 * Every shape that crosses the HTTP boundary, as Zod schemas.
 *
 * Requests are parsed against these before a handler runs, so a handler
 * never sees a body it did not declare. Responses are checked against them
 * on the way out. And the OpenAPI document is generated from them, so the
 * client's types (src/api-types.d.ts) are these same shapes.
 *
 * Named schemas carry an `id` in Zod's global registry; the OpenAPI
 * generator lifts those into components/schemas so the client gets a `User`
 * type rather than an anonymous object repeated per endpoint.
 *
 * Dates: pg hands rows back with Date objects, and JSON turns them into ISO
 * strings. The response schemas describe the JSON, which is what the client
 * receives, so a timestamp is an ISO string here.
 */
import { z } from "zod";

// ---- building blocks --------------------------------------------------------

const named = <T extends z.ZodType>(id: string, schema: T): T =>
  schema.meta({ id }) as T;

/* An ISO-8601 timestamp, as JSON.stringify renders a Date. */
const timestamp = z.iso.datetime({ offset: true });

/* An integer id, as stored (serial) and as sent (a JSON number). */
export const id = z.coerce.number().int().positive();

/* A US zip code as the database stores it: five digits, leading zeros kept. */
const zip = z.string().regex(/^\d{5}$/);

/* Browser coordinates. Coerced: a form or a query string hands over text. */
const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

/* The uniform error body. `issues` is present when the request failed to
 * parse, so a client can say which field was wrong. */
export const ErrorBody = named(
  "Error",
  z.object({
    error: z.string(),
    issues: z.array(z.string()).optional(),
  }),
);

/* A plain acknowledgement for writes that have nothing to return. */
export const Message = named("Message", z.object({ message: z.string() }));

// ---- rows, as JSON ----------------------------------------------------------

export const User = named(
  "User",
  z.object({
    user_id: z.number().int(),
    dog_name: z.string().nullable(),
    owner_name: z.string().nullable(),
    dog_breed: z.string().nullable(),
    age: z.number().int().nullable(),
    vaccination: z.boolean(),
    discoverable: z.boolean(),
    owner_email: z.string(),
    location: z.string().nullable(),
    likes_one: z.string().nullable(),
    likes_two: z.string().nullable(),
    likes_three: z.string().nullable(),
    is_guest: z.boolean(),
    created_at: timestamp,
    demo_of: z.number().int().nullable(),
    cloned_from: z.number().int().nullable(),
    onboarded_at: timestamp.nullable(),
    size: z.string().nullable(),
    energy: z.string().nullable(),
    best_time: z.string().nullable(),
    bio: z.string().nullable(),
  }),
);

/* A friend: a user with their photos gathered up. */
export const Friend = named(
  "Friend",
  User.extend({ photos: z.array(z.string()).nullable() }),
);

/* One card in the discover feed. */
export const FeedCard = named(
  "FeedCard",
  z.object({
    user_id: z.number().int(),
    dog_name: z.string().nullable(),
    owner_name: z.string().nullable(),
    dog_breed: z.string().nullable(),
    age: z.number().int().nullable(),
    vaccination: z.boolean(),
    discoverable: z.boolean(),
    owner_email: z.string(),
    location: z.string().nullable(),
    /* Whether this dog has already swiped yes on the caller. */
    user1_choice: z.boolean().nullable(),
    photos: z.array(z.string()).nullable(),
    interests: z.array(z.string().nullable()),
  }),
);

export const Pack = named(
  "Pack",
  z.object({ pack_id: z.number().int(), name: z.string() }),
);

export const Post = named(
  "Post",
  z.object({
    post_id: z.number().int(),
    user_id: z.number().int(),
    pack_id: z.number().int(),
    body: z.string().nullable(),
    date: timestamp,
    photo_url: z.string().nullable(),
  }),
);

/* A post with its pack's name and its author's name joined in. */
export const PackPost = named(
  "PackPost",
  Post.extend({ name: z.string(), owner_name: z.string().nullable() }),
);

export const Playdate = named(
  "Playdate",
  z.object({
    playdate_id: z.number().int(),
    pack_id: z.number().int(),
    user_id: z.number().int(),
    body: z.string().nullable(),
    start_date: timestamp,
    end_date: timestamp,
  }),
);

/* A playdate as the calendar lists them: with its pack's name. */
export const PackPlaydate = named(
  "PackPlaydate",
  z.object({
    pack_id: z.number().int(),
    pack_name: z.string(),
    playdate_start_date: timestamp,
    playdate_end_date: timestamp,
    playdate_body: z.string().nullable(),
  }),
);

export const ProfilePhoto = named(
  "ProfilePhoto",
  z.object({
    photo_id: z.number().int(),
    user_id: z.number().int(),
    url: z.string(),
  }),
);

// ---- auth -------------------------------------------------------------------

/* Where the visitor is, if they said: a zip code, or device coordinates.
 * Neither is required; the demo falls back to its default city. */
export const Whereabouts = z.object({
  zip: z.string().optional(),
  lat: latitude.optional(),
  lng: longitude.optional(),
});

export const Providers = named(
  "Providers",
  z.object({
    configured: z.boolean(),
    providers: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
);

export const OidcStartQuery = z.object({ provider: z.string().optional() });

export const OidcCallbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

// ---- onboarding and location ------------------------------------------------

export const OnboardingBody = z.object({
  dogName: z.string().trim().min(1, "a dog name is required"),
  dogBreed: z.string().trim().nullish(),
  age: z.coerce.number().int().min(0).max(30).nullish(),
  vaccination: z.boolean().nullish(),
  zip: z.string().nullish(),
  lat: latitude.optional(),
  lng: longitude.optional(),
});

/* Where the account now is, and how many dogs were put there. */
export const Placed = named(
  "Placed",
  z.object({ location: zip.nullable(), nearby: z.number().int() }),
);

// ---- discover ---------------------------------------------------------------

export const DiscoverBody = z.object({
  /* A zip code or a place name; the server resolves either. */
  zipcode: z.string(),
  radius: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  /* Ids already delivered this session, comma separated. */
  seen: z.string().optional(),
});

export const DiscoverPage = named(
  "DiscoverPage",
  z.object({
    users: z.array(FeedCard),
    /* Miles from the origin, by zip code. */
    distances: z.record(z.string(), z.number().nullable()),
    origin: zip,
    remaining: z.number().int(),
  }),
);

export const Coordinates = z.object({ lat: latitude, lng: longitude });

export const ResolvedLocation = named(
  "ResolvedLocation",
  z.object({ zip: zip, city: z.string(), state: z.string() }),
);

export const SwipeBody = z.object({
  otherUserId: id,
  currentUserChoice: z.boolean(),
  otherUserChoice: z.boolean().nullish(),
});

export const MatchFound = named(
  "MatchFound",
  z.object({ message: z.string(), matchedUserId: z.number().int() }),
);

// ---- profile ----------------------------------------------------------------

export const SIZES = ["small", "medium", "large"] as const;
export const ENERGY = ["low", "medium", "high"] as const;
export const BEST_TIMES = [
  "mornings",
  "afternoons",
  "evenings",
  "weekends",
] as const;

/*
 * Text the profile form sends: trimmed, capped, and empty means "not set".
 * The playdate menus are closed lists; anything else that arrives in them — a
 * fetch from the console, an old client — becomes null rather than a stored
 * string the page would render back to everyone.
 */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish()
    .transform((v) => v ?? null);

const oneOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .or(z.literal(""))
    .nullish()
    .transform((v) => (v ? v : null));

export const EditProfileBody = z.object({
  dogName: z.string().trim().min(1, "the dog needs a name").max(60),
  ownerName: text(80),
  dogBreed: text(60),
  age: z.coerce.number().int().min(0).max(30).nullish(),
  vaccination: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  likesOne: text(40),
  likesTwo: text(40),
  likesThree: text(40),
  size: oneOf(SIZES),
  energy: oneOf(ENERGY),
  bestTime: oneOf(BEST_TIMES),
  bio: text(400),
});

export const PhotoBody = z.object({ photoUrl: z.url() });

export const PhotoUrl = named("PhotoUrl", z.object({ url: z.string() }));

// ---- packs ------------------------------------------------------------------

export const JoinPackBody = z.object({ pack_id: id });

/*
 * `users` arrives as a JSON array, or — from the older client — as a string
 * holding one. The original always JSON.parse'd and threw on a real array.
 */
export const CreatePackBody = z.object({
  pack_name: z.string().trim().min(1),
  users: z
    .union([
      z.array(id).min(1),
      z
        .string()
        .transform((raw, ctx) => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            ctx.addIssue({
              code: "custom",
              message: "users must be an array of user ids",
            });
            return z.NEVER;
          }
        })
        .pipe(z.array(id).min(1)),
    ])
    .describe("the members to add; the creator is always included"),
});

export const NewPackBody = z.object({ packName: z.string().trim().min(1) });

export const PackId = named("PackId", z.object({ pack_id: z.number().int() }));

// ---- pack feed --------------------------------------------------------------

export const PackIdQuery = z.object({ packId: id });

export const MakePostBody = z.object({
  packet: z.object({
    pack_id: id,
    body: z.string().nullish(),
    photo_url: z.string().nullish(),
  }),
});

// ---- calendar ---------------------------------------------------------------

export const NewPlaydateBody = z.object({
  packId: id,
  playdateBody: z.string().nullish(),
  startTime: z.iso.datetime({ offset: true }),
  endTime: z.iso.datetime({ offset: true }),
});
