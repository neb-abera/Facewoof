import { defineRoute, reply } from "../api/route.ts";
import { ErrorBody, UploadConfig, UploadTicket } from "../api/schemas.ts";
import { uploadLimiter } from "../limits.ts";
import { createUploadTicket, signingConfig } from "../media.ts";

/* Whether this instance signs uploads, so the client knows which way to go. */
export const uploadConfig = defineRoute({
  method: "get",
  path: "/api/uploads/config",
  summary: "Whether photo uploads are signed by this server",
  auth: true,
  responses: { 200: UploadConfig },
  handler: async () => reply(200, { signed: signingConfig() !== null }),
});

/*
 * A short-lived permission to upload one image straight to Cloudinary.
 *
 * The unsigned preset this replaces is a public write endpoint: its name
 * ships in the bundle and anyone can upload anything to it. A signature is
 * only given to a signed-in caller, a limited number of times, and fixes the
 * folder, the formats and the stored size. The API secret never leaves the
 * server; the browser gets a hash it cannot extend to other parameters.
 */
export const uploadSignature = defineRoute({
  method: "post",
  path: "/api/uploads/signature",
  summary: "A short-lived signature for one direct-to-Cloudinary upload",
  auth: true,
  limit: uploadLimiter,
  responses: { 200: UploadTicket, 404: ErrorBody },
  handler: async () => {
    const config = signingConfig();
    if (!config) return reply(404, { error: "signed uploads are not enabled" });
    return reply(200, createUploadTicket(config));
  },
});
