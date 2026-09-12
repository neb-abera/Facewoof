/*
 * The one place a photo leaves the browser.
 *
 * Uploads go straight to Cloudinary with an unsigned preset, and the URL that
 * comes back is what gets stored. Both the profile page's uploader and the
 * onboarding photo step go through here, so "how uploads work" is a fact
 * rather than two implementations.
 *
 * Vite substitutes these at build time; when the deployment was built without
 * them, uploads are simply not offered.
 */
const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET as string | undefined;
const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME as string | undefined;
const FOLDER_NAME = "Facewoof";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const uploadsConfigured = Boolean(UPLOAD_PRESET && CLOUD_NAME);

/* Upload one image file; resolves to its https URL. */
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET ?? "");
  data.append("cloud_name", CLOUD_NAME ?? "");
  data.append("folder", FOLDER_NAME);
  // No credentials: a credentialed cross-origin request is one Cloudinary's
  // CORS policy must refuse, and there is no cookie it should ever see.
  const res = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: data,
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`upload failed with ${res.status}`);
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("upload returned no URL");
  return json.secure_url;
};
