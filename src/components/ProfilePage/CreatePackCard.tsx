import { useState } from "react";
import "../Discover/profileCard.css";
import { useCreatePack } from "../../queries";
import type { Friend, User } from "../../types";

interface CreatePackCardProps {
  currentUser: User | null;
  friend: Friend;
}

/* Create a pack with one friend, from their entry in the friends list. */
const CreatePackCard = ({ currentUser, friend }: CreatePackCardProps) => {
  const [packName, setPackName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const create = useCreatePack();

  const createPack = async () => {
    try {
      await create.mutateAsync({
        pack_name: packName,
        users: [...(currentUser ? [currentUser.user_id] : []), friend.user_id],
      });
      setShowSuccess(true);
    } catch (err) {
      console.error("could not create the pack", err);
    }
  };

  // Named defensively: a missing profile should read as a generic label, never
  // as the word "undefined" in the middle of a sentence shown to a visitor.
  const mine = currentUser?.dog_name || "your dog";
  const theirs = friend.dog_name || "them";
  const submitText = `Create Pack with ${mine} and ${theirs}`;
  const successText = `${packName} with ${mine} and ${theirs} has been created!!`;
  return (
    <div>
      <div className="profile-card-parent">
        <div className="card">
          <div>
            {" "}
            {showSuccess ? (
              <div className="alert alert-success shadow-lg">
                <div>
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current flex-shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{successText}</span>
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
          <label className="" htmlFor="fname">
            Pack Name
          </label>
          <input
            onChange={(e) => setPackName(e.target.value)}
            type="text"
            id="fname"
            name="fname"
          />
          <br />
          <input
            onClick={() => createPack()}
            className="btn-secondary"
            type="submit"
            value={submitText}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatePackCard;
