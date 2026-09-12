import { type FormEvent, type ReactNode, useState } from "react";
import { api, unwrap } from "../../api";
import useUserContext from "../../hooks/useUserContext";
import UploadFileWidget from "../FileUploader/UploadFileWidget";

/*
 * Editing the profile.
 *
 * The old form opened blank — its own comment said "if profile logged in,
 * render values in textinput as current values of profile // to do later" —
 * so saving meant retyping everything or silently blanking it. It also sent
 * `like2` where the server read nothing, posted the owner's email as an
 * editable field (it is the account's identity), and swallowed its own
 * validation into console.log. This one starts from what the profile says
 * now, saves what the server actually stores, and asks for the playdate
 * facts the display page leads with.
 */

type Option = readonly [value: string, text: string];

const SIZES: Option[] = [
  ["small", "Small (under 25 lb)"],
  ["medium", "Medium (25–60 lb)"],
  ["large", "Large (over 60 lb)"],
];
const ENERGY: Option[] = [
  ["low", "Easy-going"],
  ["medium", "Playful"],
  ["high", "High energy"],
];
const BEST_TIMES: Option[] = [
  ["mornings", "Mornings"],
  ["afternoons", "Afternoons"],
  ["evenings", "Evenings"],
  ["weekends", "Weekends"],
];

interface SelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

// htmlFor rather than a wrapping label: a label that wraps a <select> counts
// the option text as its own, so "Size" becomes "Size Not set Small…" to
// assistive tech and to anything that looks a control up by its label.
const Select = ({ id, label, value, onChange, options }: SelectProps) => (
  <div className="form-control w-full">
    <label className="label label-text" htmlFor={id}>
      {label}
    </label>
    <select
      id={id}
      className="select select-bordered w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Not set</option>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: the control is nested inside via children - daisyUI form-control pattern
  <label className="form-control w-full">
    <span className="label label-text">{label}</span>
    {children}
  </label>
);

interface ProfileForm {
  dogName: string;
  ownerName: string;
  dogBreed: string;
  age: string;
  vaccination: boolean;
  discoverable: boolean;
  likesOne: string;
  likesTwo: string;
  likesThree: string;
  size: string;
  energy: string;
  bestTime: string;
  bio: string;
  zip: string;
}

type TextKey = {
  [K in keyof ProfileForm]: ProfileForm[K] extends string ? K : never;
}[keyof ProfileForm];

const LIKES: [key: TextKey, placeholder: string][] = [
  ["likesOne", "Chasing squirrels"],
  ["likesTwo", "Playing fetch"],
  ["likesThree", "Long walks"],
];

const ProfilePage = () => {
  const { userData, setUserData, setFirstLogin } = useUserContext();

  const [form, setForm] = useState<ProfileForm>(() => ({
    dogName: userData?.dog_name || "",
    ownerName: userData?.owner_name || "",
    dogBreed: userData?.dog_breed || "",
    age:
      userData?.age === null || userData?.age === undefined
        ? ""
        : String(userData.age),
    vaccination: Boolean(userData?.vaccination),
    discoverable: userData?.discoverable !== false,
    likesOne: userData?.likes_one || "",
    likesTwo: userData?.likes_two || "",
    likesThree: userData?.likes_three || "",
    size: userData?.size || "",
    energy: userData?.energy || "",
    bestTime: userData?.best_time || "",
    bio: userData?.bio || "",
    zip: userData?.location || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    <K extends keyof ProfileForm>(key: K) =>
    (value: ProfileForm[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.dogName.trim()) {
      setError("What is your dog called?");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      unwrap(
        await api.PUT("/api/edituser", {
          body: {
            dogName: form.dogName,
            ownerName: form.ownerName,
            dogBreed: form.dogBreed,
            age: form.age === "" ? null : Number(form.age),
            vaccination: form.vaccination,
            discoverable: form.discoverable,
            likesOne: form.likesOne,
            likesTwo: form.likesTwo,
            likesThree: form.likesThree,
            size: form.size || null,
            energy: form.energy || null,
            bestTime: form.bestTime || null,
            bio: form.bio,
          },
        }),
      );

      // Moving is its own endpoint: it validates the zip and generates
      // neighbours there, which a column update could not.
      const zip = form.zip.trim();
      if (zip && zip !== (userData?.location || "")) {
        unwrap(await api.PUT("/api/location", { body: { zip } }));
      }

      // Re-read rather than patching locally: the server decides what the
      // profile now is, including what it refused.
      setUserData(unwrap(await api.GET("/api/auth/me")));
      setFirstLogin(false);
    } catch (err) {
      console.error("could not save the profile", err);
      setError(
        "That could not be saved. Please check the zip code and try again.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto my-4 max-w-3xl px-4">
      <form className="card bg-base-200 shadow-xl" onSubmit={handleSubmit}>
        <div className="card-body space-y-2">
          <h1 className="card-title text-2xl">Edit profile</h1>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dog's name">
              <input
                className="input input-bordered w-full"
                value={form.dogName}
                onChange={(e) => set("dogName")(e.target.value)}
              />
            </Field>
            <Field label="Breed">
              <input
                className="input input-bordered w-full"
                value={form.dogBreed}
                onChange={(e) => set("dogBreed")(e.target.value)}
              />
            </Field>
            <Field label="Age (years)">
              <input
                className="input input-bordered w-full"
                type="number"
                min="0"
                max="30"
                value={form.age}
                onChange={(e) => set("age")(e.target.value)}
              />
            </Field>
            <Field label="Owner's name">
              <input
                className="input input-bordered w-full"
                value={form.ownerName}
                onChange={(e) => set("ownerName")(e.target.value)}
              />
            </Field>
            <Field label="Zip code">
              <input
                className="input input-bordered w-full"
                value={form.zip}
                onChange={(e) => set("zip")(e.target.value)}
              />
            </Field>
          </div>

          <div className="divider my-1">For playdates</div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              id="profile-size"
              label="Size"
              value={form.size}
              onChange={set("size")}
              options={SIZES}
            />
            <Select
              id="profile-energy"
              label="Energy"
              value={form.energy}
              onChange={set("energy")}
              options={ENERGY}
            />
            <Select
              id="profile-best-time"
              label="Best time to play"
              value={form.bestTime}
              onChange={set("bestTime")}
              options={BEST_TIMES}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {LIKES.map(([key, placeholder], index) => (
              <Field key={key} label={`Loves ${index + 1}`}>
                <input
                  className="input input-bordered w-full"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => set(key)(e.target.value)}
                />
              </Field>
            ))}
          </div>

          <Field label="Anything a playdate should know">
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={400}
              placeholder="Great with small dogs, still learning recall, brings her own ball…"
              value={form.bio}
              onChange={(e) => set("bio")(e.target.value)}
            />
          </Field>

          <div className="flex flex-wrap gap-6 py-1">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.vaccination}
                onChange={(e) => set("vaccination")(e.target.checked)}
              />
              <span>Vaccinated</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="toggle"
                checked={form.discoverable}
                onChange={(e) => set("discoverable")(e.target.checked)}
              />
              <span>Show my profile in discover</span>
            </label>
          </div>

          <div>
            <span className="label label-text">Add photos</span>
            <UploadFileWidget />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="card-actions justify-end">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => setFirstLogin(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
