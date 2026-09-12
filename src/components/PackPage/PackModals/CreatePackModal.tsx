import { useEffect, useState } from "react";
import Modal from "react-modal";
import { api, unwrap } from "../../../api";
import type { Friend } from "../../../types";
import "../../Shared/modal.css";
import "./createPack.css";

interface CreatePackModalProps {
  userIdentity: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void>;
}

/*
 * Create a pack with one of your friends.
 *
 * This was a hidden-checkbox dialog containing a friends table, and each row
 * of that table contained two more hidden-checkbox dialogs. Opening the outer
 * one revealed an inner one at the same time, over a transparent backdrop,
 * with an orphaned "Yay!" button below the page fold — three dialogs' worth of
 * markup fighting for the same screen.
 *
 * One dialog now: pick a friend, name the pack, create it. It uses react-modal
 * like the calendar's dialogs, so every dialog in the app looks and behaves
 * the same way.
 */
const CreatePackModal = ({
  userIdentity,
  isOpen,
  onClose,
  onCreated,
}: CreatePackModalProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [packName, setPackName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api
      .GET("/api/friends")
      .then(({ data }) => setFriends(data ?? []))
      .catch((err: unknown) => {
        console.error("could not load your friends", err);
        setError("Your friends could not be loaded.");
      });
  }, [isOpen]);

  // A dialog that remembers last time's half-finished input is worse than one
  // that starts clean.
  useEffect(() => {
    if (isOpen) return;
    setSelected(null);
    setPackName("");
    setError(null);
    setCreated(null);
  }, [isOpen]);

  const createPack = async () => {
    if (!selected) {
      setError("Choose a friend to start the pack with.");
      return;
    }
    if (!packName.trim()) {
      setError("Give the pack a name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      unwrap(
        await api.PUT("/api/createpack", {
          body: {
            pack_name: packName.trim(),
            users: [
              ...(userIdentity !== null ? [userIdentity] : []),
              selected.user_id,
            ],
          },
        }),
      );
      setCreated(packName.trim());
      if (onCreated) await onCreated();
    } catch (err) {
      console.error("could not create the pack", err);
      setError("That pack could not be created. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="app-modal"
      overlayClassName="app-modal__overlay"
      contentLabel="Create a pack"
    >
      <h2>Create a pack</h2>

      {created ? (
        <div className="create-pack__done">
          <p>
            <strong>{created}</strong> is ready.
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div>
            <h3>Who is it with?</h3>
            {friends.length ? (
              <ul className="create-pack__friends">
                {friends.map((friend) => (
                  <li key={friend.user_id}>
                    <button
                      type="button"
                      className={`create-pack__friend${
                        selected && selected.user_id === friend.user_id
                          ? " create-pack__friend--on"
                          : ""
                      }`}
                      onClick={() => setSelected(friend)}
                    >
                      {friend.dog_name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="create-pack__empty">
                No friends yet — match with a dog on Discover first.
              </p>
            )}
          </div>

          <div>
            <h3>Pack name</h3>
            <input
              className="input input-bordered"
              value={packName}
              placeholder="Chelsea Morning Crew"
              onChange={(e) => setPackName(e.target.value)}
            />
          </div>

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={createPack}
            disabled={saving || !friends.length}
          >
            {saving ? "Creating…" : "Create pack"}
          </button>
        </>
      )}
    </Modal>
  );
};

export default CreatePackModal;
