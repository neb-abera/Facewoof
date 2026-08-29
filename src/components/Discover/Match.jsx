import { useNavigate } from "react-router-dom";
import "./match.css";

/* An image when there is one, and a labelled circle when there is not. */
const Avatar = ({ className, src, name }) =>
  src ? (
    <img className={`w-full ${className}`} src={src} alt={name || "A dog"} />
  ) : (
    <div
      className={`${className} flex items-center justify-center bg-base-300 text-4xl font-bold`}
      role="img"
      aria-label={name || "A dog"}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );

export default function Match({ user1, user2, handleContinue, photos }) {
  const navigate = useNavigate();

  function goToPack() {
    navigate("/packFeed");
  }

  return (
    <div className="match-parent">
      <h1 className="match-title">It&apos;s a match!</h1>
      <h2 className="match-subtitle">
        Now you can add {user2.dog_name} to a pack!
      </h2>
      <div className="match-images">
        {/* A missing src makes the browser render the alt text in place of the
            image, which on a 25vh circle reads as a name floating in space.
            Falling back to an initial keeps the layout and says something. */}
        <Avatar
          className="primary-user"
          src={photos?.[0] || user1?.photos?.[0]}
          name={user1?.dog_name}
        />
        <Avatar
          className="secondary-user"
          src={user2.photos?.[0]}
          name={user2.dog_name}
        />
      </div>
      <div className="match-buttons">
        <button
          className="btn btn-active btn-primary"
          type="button"
          onClick={handleContinue}
        >
          Keep searching
        </button>
        <button
          className="btn btn-active btn-primary"
          type="button"
          onClick={goToPack}
        >
          Add to Pack
        </button>
      </div>
    </div>
  );
}
