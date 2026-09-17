/*
 * Where images may come from, in one place.
 *
 * Three things have to agree or one of them is decoration: the hosts the
 * Content-Security-Policy lets a page load images from (server/index.ts),
 * the URLs the API will store for a photo or a post (server/api/schemas.ts),
 * and where uploads actually go. They all read this module.
 *
 * Two hosts. res.cloudinary.com is where uploads land. placedog.net is the
 * demo roster: every seeded profile photo lives there, a demo account's own
 * photos are copies of those rows, and a post carries its author's profile
 * photo — so a post has to be allowed to name it even though nobody can
 * upload to it.
 */
import crypto from "node:crypto";

export const CLOUDINARY_HOST = "res.cloudinary.com";
const DEMO_HOST = "placedog.net";

/* For the CSP's img-src. */
export const IMAGE_SOURCES = [CLOUDINARY_HOST, DEMO_HOST].map(
  (host) => `https://${host}`,
);

const MAX_URL_LENGTH = 2048;

type Env = Record<string, string | undefined>;

/*
 * The deployment's Cloudinary cloud, when the server has been told it. With
 * it, a stored URL must be under that cloud's own image path rather than
 * anywhere on the shared host. (VITE_CLOUD_NAME is read too: it is the same
 * value, and in development both live in one .env.)
 */
const cloudName = (env: Env) =>
  env.CLOUDINARY_CLOUD_NAME || env.VITE_CLOUD_NAME || null;

const parse = (raw: string): URL | null => {
  if (raw.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(raw);
    // https, the default port, and no credentials smuggled in front of the
    // host (https://res.cloudinary.com@evil.example/ parses to evil.example,
    // and this is why the check is on the parsed host, not a prefix).
    if (url.protocol !== "https:" || url.port || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

/* A URL an upload could have produced: this deployment's Cloudinary images. */
export function isUploadedImageUrl(raw: string, env: Env = process.env) {
  const url = parse(raw);
  if (!url || url.hostname !== CLOUDINARY_HOST) return false;
  const cloud = cloudName(env);
  const [, first, second, third] = url.pathname.split("/");
  if (cloud && first !== cloud) return false;
  return Boolean(first) && second === "image" && third === "upload";
}

/* Any image the app may show: an upload, or the demo roster's host. */
export function isAllowedImageUrl(raw: string, env: Env = process.env) {
  if (isUploadedImageUrl(raw, env)) return true;
  return parse(raw)?.hostname === DEMO_HOST;
}

// ---- signed uploads ---------------------------------------------------------

/*
 * What every signed upload is held to. These are part of what gets signed,
 * so a browser cannot change them without invalidating the signature: the
 * folder, the formats Cloudinary will accept, and an incoming transformation
 * that bounds what is stored however large the original was.
 */
const UPLOAD_PARAMS = {
  allowed_formats: "jpg,png,webp,gif,heic",
  folder: "Facewoof",
  transformation: "c_limit,h_1600,w_1600",
} as const;

/*
 * Cloudinary honours a signature for one hour from its timestamp and offers
 * no shorter setting, so the timestamp is backdated: signed as if issued
 * fifty minutes ago, the ticket has ten minutes left to live.
 */
const CLOUDINARY_WINDOW_SECONDS = 60 * 60;
export const UPLOAD_TICKET_SECONDS = 10 * 60;

interface SigningConfig {
  cloud: string;
  apiKey: string;
  apiSecret: string;
  algorithm: "sha1" | "sha256";
}

export function signingConfig(env: Env = process.env): SigningConfig | null {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !apiSecret) return null;
  return {
    cloud,
    apiKey,
    apiSecret,
    // SHA-1 is what a Cloudinary product environment expects unless it has
    // been switched to SHA-256 in its security settings; it is their wire
    // format, not a choice made here.
    algorithm:
      env.CLOUDINARY_SIGNATURE_ALGORITHM === "sha256" ? "sha256" : "sha1",
  };
}

/* Cloudinary's scheme: the parameters sorted, joined as a query, secret appended. */
export function cloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string,
  algorithm: "sha1" | "sha256" = "sha1",
) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash(algorithm)
    .update(toSign + apiSecret)
    .digest("hex");
}

export interface UploadTicket {
  uploadUrl: string;
  /* Every form field to send alongside `file`, signature included. */
  fields: Record<string, string>;
  expiresAt: string;
}

export function createUploadTicket(
  config: SigningConfig,
  now = Date.now(),
): UploadTicket {
  const issued = Math.floor(now / 1000);
  const timestamp =
    issued - (CLOUDINARY_WINDOW_SECONDS - UPLOAD_TICKET_SECONDS);
  const signed = { ...UPLOAD_PARAMS, timestamp };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud)}/image/upload`,
    fields: {
      ...UPLOAD_PARAMS,
      timestamp: String(timestamp),
      api_key: config.apiKey,
      signature: cloudinarySignature(
        signed,
        config.apiSecret,
        config.algorithm,
      ),
    },
    expiresAt: new Date((issued + UPLOAD_TICKET_SECONDS) * 1000).toISOString(),
  };
}

/* Said once at start-up, so an unsigned production is a known state. */
export function warnIfUploadsUnsigned(env: Env = process.env) {
  if (env.NODE_ENV === "production" && !signingConfig(env)) {
    console.warn(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are not all set: " +
        "photo uploads, where offered, use the unsigned preset, which anyone can upload to. " +
        "See docs/DEPLOY.md to switch to signed uploads.",
    );
  }
}
