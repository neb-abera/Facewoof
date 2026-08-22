import React, { useState } from 'react';
import axios from 'axios';
import FileUploader from './FileUploader';
import './UploadFileWidget.css';
import useUserContext from '../../hooks/useUserContext';

// Was `require('dotenv').config()` plus `import path from 'path'`, neither of
// which works in a browser. Vite substitutes these at build time.
const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET;
const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME;
const FOLDER_NAME = 'Facewoof';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const isConfigured = Boolean(UPLOAD_PRESET && CLOUD_NAME);

const UploadFileWidget = () => {
  const [urls, setUrls] = useState([]);
  const [error, setError] = useState(null);
  const { userId } = useUserContext();

  const uploadImage = (img) => {
    const data = new FormData();
    data.append('file', img);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    data.append('folder', FOLDER_NAME);

    setError(null);
    axios
      .post(CLOUDINARY_URL, data)
      .then((res) => {
        // The original spread a stale `urls` into a functional update, so it
        // read the same snapshot twice and dropped uploads that overlapped.
        setUrls((prev) => [...prev, res.data.secure_url]);
        return axios.post('/api/photos', { photoUrl: res.data.secure_url });
      })
      .catch((err) => {
        console.error('photo upload failed', err);
        setError('That photo could not be uploaded.');
      });
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  // Cloudinary is optional. Without it the rest of the profile page still
  // works, rather than the upload silently posting to an undefined cloud.
  if (!isConfigured) {
    return (
      <div className="widget-container space-y-4">
        <p className="text-sm opacity-70">
          Photo uploads are turned off. Set VITE_CLOUD_NAME and VITE_UPLOAD_PRESET to enable them.
        </p>
      </div>
    );
  }

  return (
    <div className="widget-container space-y-4">
      <div className="uploadfile-widget">
        <div className="file-uploaders">
          <FileUploader onChange={handleChange} />
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {urls.length > 0 && (
        <div className="flex space-x-3">
          {urls.map((url) => (
            <img key={url} src={url} className="h-[80px]" alt="Newly uploaded" />
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadFileWidget;
