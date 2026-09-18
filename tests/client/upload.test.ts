/*
 * The one place a photo leaves the browser, against a stand-in fetch: what
 * the form carries when the server signs, and that a refusal other than
 * "this server does not sign" never quietly downgrades.
 */
import { afterEach, expect, test, vi } from "vitest";
import { uploadToCloudinary } from "../../src/components/FileUploader/cloudinary";

const UPLOAD_URL = "https://api.cloudinary.com/v1_1/abera/image/upload";
const file = new File(["woof"], "dog.jpg", { type: "image/jpeg" });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

interface Seen {
  url: string;
  form: FormData | null;
  credentials: RequestCredentials | undefined;
}

const stubFetch = (signature: Response) => {
  const seen: Seen[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const form = init?.body instanceof FormData ? init.body : null;
      seen.push({ url, form, credentials: init?.credentials });
      if (new URL(url).pathname === "/api/uploads/signature") return signature;
      return json({
        secure_url:
          "https://res.cloudinary.com/abera/image/upload/v1/Facewoof/dog.jpg",
      });
    }),
  );
  return seen;
};

afterEach(() => vi.unstubAllGlobals());

test("a signed upload posts exactly the fields the server signed", async () => {
  const fields = {
    api_key: "1234567890",
    timestamp: "1700000000",
    signature: "abc123",
    folder: "Facewoof",
    allowed_formats: "jpg,png,webp,gif,heic",
    transformation: "c_limit,h_1600,w_1600",
  };
  const seen = stubFetch(
    json({ uploadUrl: UPLOAD_URL, fields, expiresAt: "2030-01-01T00:00:00Z" }),
  );

  const url = await uploadToCloudinary(file);
  expect(url).toContain("res.cloudinary.com/abera/image/upload");

  const upload = seen.find((call) => call.url === UPLOAD_URL);
  if (!upload?.form) throw new Error("nothing was posted to Cloudinary");
  const sent = Object.fromEntries(
    [...upload.form.entries()].filter(([name]) => name !== "file"),
  );
  expect(sent).toEqual(fields);
  expect(upload.form.get("file")).toBeInstanceOf(File);
  // The preset is the thing signing replaces; it must not ride along.
  expect(upload.form.has("upload_preset")).toBe(false);
  // Cloudinary never sees the session cookie.
  expect(upload.credentials).toBe("omit");
});

test("a server that does not sign, in a bundle with no preset, is an error", async () => {
  const seen = stubFetch(
    json({ error: "signed uploads are not enabled" }, 404),
  );
  await expect(uploadToCloudinary(file)).rejects.toThrow(/upload signature/);
  expect(seen.filter((call) => call.form)).toHaveLength(0);
});

test("a refused signature never falls back to the unsigned preset", async () => {
  const seen = stubFetch(json({ error: "Too many uploads" }, 429));
  await expect(uploadToCloudinary(file)).rejects.toThrow(/429/);
  expect(seen.filter((call) => call.form)).toHaveLength(0);
});
