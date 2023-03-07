/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import './profileCard.css';

export default function ProfileCard({ user, distance }) {
  distance = distance || 5;

  return (
    <div className="profile-card-parent">
      <div className="card w-96 bg-base-100 shadow-xl profileCard">
        <div className="card-header">
          <div className="card-header-title">
            <div className="avatar">
              <div className="w-24 rounded-contain profile-image">
                <img src={user.profile_photo} />
              </div>
            </div>

            <div className="profile-details">
              <div className="card-body-top">
                <div className="names-parent">
                  <h2 className="card-title-text">{user.dogName}</h2>
                  <div className="badge badge-secondary owner">
                    {user.ownerName}
                    &apos;s best friend
                  </div>
                </div>
                <p className="profile-card-details">
                  {user.age} • {user.breed} • {distance} miles
                </p>
                {user.vaccination ? (
                  <div className="badge badge-secondary">&#10004; Vaccinated</div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="card-actions justify-start">
            {user.interests.map((interest, index) => (
              <div key={`interest${index}`} className="badge badge-outline">
                {interest}
              </div>
            ))}
          </div>
        </div>
        <div className="carousel-container">
          <figure className="figure-carousel">
            <div className="carousel w-full">
              {user.photos.map((url, index) => (
                <div
                  key={`photo${index}`}
                  id={`item${user.userId}${index}`}
                  className="carousel-item w-full"
                >
                  <img className="w-full" src={url} alt="Doggy" />
                </div>
              ))}
            </div>
          </figure>
          <div className="flex justify-center w-full py-2 gap-2 carousel-buttons">
            {user.photos.map((url, index) => (
              <a key={`button${index}`} href={`#item${user.userId}${index}`} className="btn btn-xs">
                {index}
              </a>
            ))}
          </div>
        </div>
        <div className="card-body card-bottom">
          <p className="card-p">{user.bio}</p>
        </div>
      </div>
    </div>
  );
}
