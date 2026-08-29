import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import useUserContext from '../hooks/useUserContext';
import { uploadsConfigured, uploadToCloudinary } from '../components/FileUploader/cloudinary';
import defaultDog from '../assets/default-dog.svg';
import './welcome.css';

/*
 * Setting up an account created by signing in.
 *
 * A demo account is cloned from the template: it arrives with a dog, photos
 * and a roster of neighbours already scattered around it. An account created
 * by signing in with Google or Microsoft has none of that, so it used to land
 * on an empty discover feed with nothing to do and no explanation of why.
 *
 * Two things are asked for, because two things are needed: who the dog is, and
 * where they are — the second is what puts other dogs in the feed. Everything
 * else can be filled in later from the profile page.
 */
const Welcome = () => {
  const { userData, setUserData, loggedIn } = useUserContext();
  const navigate = useNavigate();

  const [dogName, setDogName] = useState('');
  const [dogBreed, setDogBreed] = useState('');
  const [age, setAge] = useState('');
  const [vaccination, setVaccination] = useState(false);
  const [zip, setZip] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!loggedIn) return <Navigate to="/login" replace />;
  // Anyone who has already been through this belongs in the app.
  if (userData && userData.onboarded_at) return <Navigate to="/discover" replace />;

  /* Ask the browser where they are, so they need not know their own zip code. */
  const askForLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocating(false);
          resolve({ lat: coords.latitude, lng: coords.longitude });
        },
        () => {
          setLocating(false);
          resolve(null);
        },
        { timeout: 8000, maximumAge: 600000 }
      );
    });

  const finish = async (where) => {
    if (!dogName.trim()) return setError('What is your dog called?');

    setSaving(true);
    setError(null);
    try {
      await axios.put('/api/onboarding', {
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim() || null,
        age: age === '' ? null : Number(age),
        vaccination,
        zip: zip.trim() || null,
        ...(where || {})
      });

      // The chosen photo, now that setup is real. A failure here is not worth
      // stopping for: the account is set up, and the profile page can add a
      // photo any time.
      if (photoUrl) {
        await axios.post('/api/photos', { photoUrl }).catch((err) => {
          console.error('could not attach the photo', err);
        });
      }

      // Re-read rather than patching it here: the server decides what the
      // profile now is, including the location it resolved.
      const { data } = await axios.get('/api/auth/me');
      setUserData(data);
      navigate('/discover');
    } catch (err) {
      console.error('could not finish setting up', err);
      setError('That could not be saved. Please try again.');
      setSaving(false);
    }
    return undefined;
  };

  /*
   * The photo, uploaded when chosen but attached when setup finishes.
   *
   * The first row in profile_photos is the profile photo, so posting every
   * choice as it was made would pin the avatar to the first attempt and make
   * "Change photo" a lie. Uploading immediately gives the preview; only the
   * final choice is attached to the profile. Before this the flow never asked
   * for a photo at all, and a provider account came out the other side
   * faceless — the profile page opened on a broken image.
   */
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setPhotoUrl(await uploadToCloudinary(file));
    } catch (err) {
      console.error('photo upload failed', err);
      setError('That photo could not be uploaded. You can add one later from your profile.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome__card">
        <h1 className="welcome__title">Welcome to Facewoof</h1>
        <p className="welcome__lead">
          Tell us about your dog and where you walk, and we&apos;ll show you dogs nearby.
        </p>

        {uploadsConfigured && (
          <div className="welcome__photo">
            <img
              className="welcome__photo-preview"
              src={photoUrl || defaultDog}
              alt={photoUrl ? 'Your dog' : 'No photo yet'}
            />
            <label className="btn btn-outline btn-sm">
              {uploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Add a photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhoto}
                disabled={uploading}
              />
            </label>
            <span className="welcome__photo-hint">Optional — it becomes their profile photo.</span>
          </div>
        )}

        <label className="welcome__field">
          <span>Your dog&apos;s name</span>
          <input
            className="input input-bordered"
            value={dogName}
            placeholder="Biscuit"
            onChange={(e) => setDogName(e.target.value)}
          />
        </label>

        <div className="welcome__row">
          <label className="welcome__field">
            <span>Breed</span>
            <input
              className="input input-bordered"
              value={dogBreed}
              placeholder="Golden Retriever"
              onChange={(e) => setDogBreed(e.target.value)}
            />
          </label>
          <label className="welcome__field welcome__field--narrow">
            <span>Age</span>
            <input
              className="input input-bordered"
              type="number"
              min="0"
              max="30"
              value={age}
              placeholder="3"
              onChange={(e) => setAge(e.target.value)}
            />
          </label>
        </div>

        <label className="welcome__check">
          <input
            type="checkbox"
            className="checkbox"
            checked={vaccination}
            onChange={(e) => setVaccination(e.target.checked)}
          />
          <span>Vaccinated</span>
        </label>

        <label className="welcome__field">
          <span>Zip code</span>
          <input
            className="input input-bordered"
            value={zip}
            placeholder="10011"
            onChange={(e) => setZip(e.target.value)}
          />
        </label>

        {error ? <p className="text-error text-sm">{error}</p> : null}

        <div className="welcome__actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || locating}
            onClick={() => finish(null)}
          >
            {saving ? 'Setting up…' : 'Start meeting dogs'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={saving || locating}
            onClick={async () => finish(await askForLocation())}
          >
            {locating ? 'Finding you…' : 'Use my location instead'}
          </button>
        </div>

        <p className="welcome__note">
          Without a location we&apos;ll show you a sample of dogs rather than nothing at all. You
          can change any of this later from your profile.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
