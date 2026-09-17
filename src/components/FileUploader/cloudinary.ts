/*
 * The one place a photo leaves the browser.
 *
 * Uploads go straight to Cloudinary and the URL that comes back is what gets
 * stored. Both the profile page's uploader and the onboarding photo step go
 * through here, so "how uploads work" is a fact rather than two
 * implementations.
 *
 * Signed when the server can sign: it hands a signed-in caller a short-lived
 * signature that fixes the folder, the accepted formats and the stored size,
 * and this posts the file with exactly those fields. Until the deployment
 * has the API secret the server answers 404 and the old unsigned preset is
 * used instead — a preset anyone holding the bundle can upload to, which is
 * why it is the fallback and not the design (docs/DEPLOY.md).
 *
 * Vite substitutes the two unsigned settings at build time.
 */
import { api } from "../../api";

const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET as string | undefined;
const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME as string | undefined;
const FOLDER_NAME = "Facewoof";

/* Whether this bundle was built with an unsigned preset to fall back on. */
export const unsignedUploadsConfigured = Boolean(UPLOAD_PRESET && CLOUD_NAME);

const send = async (
  url: string,
  fields: Record<string, string>,
  file: File,
): Promise<string> => {
  const data = new FormData();
  data.append("file", file);
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  // No credentials: a credentialed cross-origin request is one Cloudinary's
  // CORS policy must refuse, and there is no cookie it should ever see.
  const res = await fetch(url, {
    method: "POST",
    body: data,
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`upload failed with ${res.status}`);
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("upload returned no URL");
  return json.secure_url;
};

/* Upload one image file; resolves to its https URL. */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const ticket = await api.POST("/api/uploads/signature");
  if (ticket.data) return send(ticket.data.uploadUrl, ticket.data.fields, file);

  // 404 is "this server does not sign"; anything else is a real refusal
  // (signed out, rate limited) and must not quietly downgrade.
  if (ticket.response.status !== 404 || !unsignedUploadsConfigured) {
    throw new Error(
      `could not get an upload signature (${ticket.response.status})`,
    );
  }
  return send(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { upload_preset: UPLOAD_PRESET ?? "", folder: FOLDER_NAME },
    file,
  );
};
