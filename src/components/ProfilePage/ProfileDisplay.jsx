import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPen } from 'react-icons/fa';
import './profile.css';
import FriendsList from './FriendsList';
import useUserContext from '../../hooks/useUserContext';
import defaultDog from '../../assets/default-dog.svg';

/*
 * The profile as others would want to read it.
 *
 * The old version fetched /api/auth/me and read `data[0]` from what is an
 * object, so every field rendered blank; the avatar defaulted to a hotlinked
 * reddit image the CSP blocks, so the page opened on a broken picture with no
 * name next to it. It also said nothing anyone plans a playdate with. This
 * one leads with who the dog is, then the facts a playdate hangs on: size,
 * energy, when they're usually free, what they like, and anything the owner
 * wants to add.
 */

const LABELS = {
  size: { small: 'Small', medium: 'Medium', large: 'Large' },
  energy: { low: 'Easy-going', medium: 'Playful', high: 'High energy' },
  best_time: {
    mornings: 'Mornings',
    afternoons: 'Afternoons',
    evenings: 'Evenings',
    weekends: 'Weekends'
  }
};

const ProfileDisplay = () => {
  const { userData, setFirstLogin } = useUserContext();
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    axios
      .get('/api/profilephoto')
      .then(({ data }) => setPhotos((data || []).map((row) => row.url)))
      .catch((err) => console.error('could not load photos', err));
  }, []);

  // Context is still loading the account; there is nothing truthful to show.
  if (!userData) return null;

  const likes = [userData.likes_one, userData.likes_two, userData.likes_three].filter(Boolean);
  const playdateFacts = [
    { label: 'Size', value: LABELS.size[userData.size] },
    { label: 'Energy', value: LABELS.energy[userData.energy] },
    { label: 'Best time to play', value: LABELS.best_time[userData.best_time] }
  ].filter((fact) => fact.value);
  const hasPlaydateInfo = playdateFacts.length > 0 || likes.length > 0 || userData.bio;
  const gallery = photos.slice(1);

  return (
    <div className="profile container mx-auto my-4 grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr] items-start px-4">
      <div className="space-y-4">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="profile__header">
              <img
                className="profile__avatar"
                src={photos[0] || defaultDog}
                alt={photos[0] ? `${userData.dog_name || 'Your dog'}` : 'No photo yet'}
              />
              <div className="min-w-0 flex-1">
                <h1 className="card-title text-2xl">{userData.dog_name || 'Your dog'}</h1>
                <p className="opacity-70">
                  {[
                    userData.dog_breed,
                    Number.isFinite(Number(userData.age)) && userData.age !== null
                      ? `${userData.age} ${Number(userData.age) === 1 ? 'year' : 'years'} old`
                      : null,
                    userData.location
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {userData.owner_name && (
                  <p className="opacity-70">Out with {userData.owner_name}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {userData.vaccination ? (
                    <span className="badge badge-primary">Vaccinated</span>
                  ) : (
                    <span className="badge badge-outline opacity-70">
                      Vaccination not confirmed
                    </span>
                  )}
                  {userData.discoverable === false && (
                    <span className="badge badge-outline opacity-70">Hidden from discover</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFirstLogin(true)}
              >
                <FaPen aria-hidden="true" /> Edit profile
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Planning a playdate</h2>
            {hasPlaydateInfo ? (
              <>
                {playdateFacts.length > 0 && (
                  <dl className="profile__facts">
                    {playdateFacts.map(({ label, value }) => (
                      <div key={label} className="profile__fact">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {likes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {likes.map((like) => (
                      <span key={like} className="badge badge-outline badge-lg">
                        {like}
                      </span>
                    ))}
                  </div>
                )}
                {userData.bio && <p className="max-w-prose opacity-80">{userData.bio}</p>}
              </>
            ) : (
              <p className="opacity-60">
                Size, energy and when you&apos;re usually free help matches plan a playdate. Add
                them with Edit profile.
              </p>
            )}
          </div>
        </div>

        {gallery.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-lg">More photos</h2>
              <div className="carousel carousel-center gap-3 rounded-box">
                {gallery.map((url) => (
                  <div key={url} className="carousel-item">
                    <img src={url} className="profile__gallery-photo" alt="A dog" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <FriendsList currentUser={userData} />
    </div>
  );
};

export default ProfileDisplay;
