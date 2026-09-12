import type { FeedCard } from "../../types";
import "./profileCard.css";

interface ProfileCardProps {
  user: FeedCard;
  /* Miles from the search origin; 0 reads as "under half a mile". */
  distance: number | null | undefined;
}

export default function ProfileCard({ user, distance }: ProfileCardProps) {
  const miles = distance === 0 ? "< .5" : String(distance ?? "?");
  const photos = user.photos ?? [];
  const interests = user.interests.filter(
    (interest): interest is string => interest !== null,
  );

  return (
    <div className="profile-card-parent drop-shadow-lg">
      <div className="card w-96 bg-base-100 shadow-xl profileCard">
        <div className="card-header">
          <div className="card-header-title">
            <div className="avatar">
              <div className="w-24 rounded-contain profile-image">
                {/* draggable={false}: a native image drag would swallow the
                    pointer events the card's swipe listens for. */}
                <img
                  src={photos[0]}
                  draggable={false}
                  alt={`A dog named ${user.dog_name}`}
                />
              </div>
            </div>

            <div className="profile-details">
              <div className="card-body-top">
                <div className="names-parent">
                  <h2 className="card-title-text">{user.dog_name}</h2>
                  <div className="badge badge-secondary owner">
                    {user.owner_name}
                    &apos;s best friend
                  </div>
                </div>
                <p className="profile-card-details">
                  {user.age} • {user.dog_breed} • {miles} miles
                </p>
                {user.vaccination ? (
                  <div className="badge badge-secondary">
                    &#10004; Vaccinated
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="card-actions justify-start">
            {interests.map((interest) => (
              <div key={interest} className="badge badge-outline">
                {interest}
              </div>
            ))}
          </div>
        </div>
        <div className="carousel-container">
          <figure className="figure-carousel">
            <div className="carousel w-full">
              {photos.map((url, index) => (
                <div
                  key={url}
                  id={`item${user.user_id}${index}`}
                  className="carousel-item w-full"
                >
                  <img
                    className="w-full no-image-drag"
                    src={url}
                    draggable={false}
                    alt={`A dog named ${user.dog_name}`}
                  />
                </div>
              ))}
            </div>
          </figure>
          <div className="flex justify-center w-full py-2 gap-2 carousel-buttons">
            {photos.map((url, index) => (
              <a
                key={url}
                href={`#item${user.user_id}${index}`}
                className="btn btn-xs"
              >
                {index}
              </a>
            ))}
          </div>
        </div>
        <div className="card-body card-bottom">
          <p className="card-p" />
        </div>
      </div>
    </div>
  );
}
