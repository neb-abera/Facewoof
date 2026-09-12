import { useState } from "react";
import DateTimePicker from "react-datetime-picker";
/*
 * The picker's own stylesheets, which were never imported. Without them the
 * widget renders completely unstyled: a white strip across the dialog, the
 * fields running together, and the clear and calendar buttons showing as a
 * bare "✕ □". It looked broken because, visually, it was.
 */
import "react-datetime-picker/dist/DateTimePicker.css";
import "react-calendar/dist/Calendar.css";
import "react-clock/dist/Clock.css";
import { api, unwrap } from "../../api";
import useUserContext from "../../hooks/useUserContext";
import "./Playdate.css";

interface AddPlaydateProps {
  closeAddModal: () => void;
  playStartTime: Date | null;
  setStartTime: (date: Date | null) => void;
  playEndTime: Date | null;
  setEndTime: (date: Date | null) => void;
  onAdded?: () => Promise<void>;
}

// The picker reports a single date, or a range; this form only ever asks for
// a single one.
type PickerValue = Date | null | [Date | null, Date | null];
const single = (value: PickerValue): Date | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

const AddPlaydate = ({
  closeAddModal,
  playStartTime,
  setStartTime,
  playEndTime,
  setEndTime,
  onAdded,
}: AddPlaydateProps) => {
  const [packChoiceId, setPackChoiceId] = useState<number | null>(null);
  const [playdateInfo, setPlaydateInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { packs } = useUserContext();

  const handleSubmit = async () => {
    // Every one of these was silently optional. Submitting without a pack or a
    // time posted an incomplete body, the server answered 400, and nothing
    // caught it: the modal stayed open with no explanation.
    if (!packChoiceId) {
      setError("Choose a pack first.");
      return;
    }
    if (!playStartTime || !playEndTime) {
      setError("Pick a start and an end time.");
      return;
    }
    if (playEndTime <= playStartTime) {
      setError("The end time has to be after the start time.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // No userId: it used to send a hardcoded 7 with a note to fix it later.
      // The server takes the acting user from the session and ignores anything
      // the client claims.
      unwrap(
        await api.POST("/api/addplaydate", {
          body: {
            packId: packChoiceId,
            playdateBody: playdateInfo,
            startTime: playStartTime.toISOString(),
            endTime: playEndTime.toISOString(),
          },
        }),
      );
      // The calendar only loaded on mount, so a saved playdate never appeared
      // and the whole feature looked broken.
      if (onAdded) await onAdded();
      closeAddModal();
    } catch (err) {
      console.error("could not add the playdate", err);
      setError("That playdate could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="playdate-form">
      <h2>Add a Playdate</h2>
      <select
        aria-label="Pack"
        value={packChoiceId ?? ""}
        onChange={(e) => setPackChoiceId(Number(e.target.value) || null)}
        className="select w-full max-w-xs"
      >
        <option value="" disabled>
          Pack Name
        </option>
        {packs.map((pack) => (
          <option key={pack.pack_id} value={pack.pack_id}>
            {pack.name}
          </option>
        ))}
      </select>
      <div>
        <h3>Playdate start time:</h3>
        <DateTimePicker
          onChange={(value) => setStartTime(single(value))}
          value={playStartTime}
        />
        <h3>Playdate end time:</h3>
        <DateTimePicker
          onChange={(value) => setEndTime(single(value))}
          value={playEndTime}
        />
      </div>
      <div>
        <h3>Basic Playdate Info:</h3>
        <textarea
          className="textarea textarea-bordered"
          onChange={(e) => setPlaydateInfo(e.target.value)}
          placeholder="Let's go get muddy at our favorite park!"
          value={playdateInfo}
        />
      </div>
      {error && <p className="text-error text-sm mt-2">{error}</p>}
      <button
        type="submit"
        className="btn btn-active btn-primary"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Adding…" : "Add Playdate! 🐾"}
      </button>
    </div>
  );
};

export default AddPlaydate;
