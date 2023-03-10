import React, { useState } from 'react';
import axios from 'axios';
import FileUploader from './FileUploader';
import './UploadFileWidget.css';
import useUserContext from '../../hooks/useUserContext';

const UPLOAD_PRESET = 'fkvl2mpr';
const CLOUD_NAME = 'dji28yqki';
const FOLDER_NAME = 'Diggr';
const URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const API_URL = import.meta.env.VITE_APP_API_URL;

// eslint-disable-next-line react/prop-types
const UploadFileWidget = () => {
  const [urls, setUrls] = useState([]);
  const { userId } = useUserContext();

  const uploadImage = (img) => {
    const data = new FormData();
    data.append('file', img);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    data.append('folder', FOLDER_NAME);

    axios.post(URL, data).then((res) => {
      setUrls((prev) => [...urls, res.data.secure_url]);
      // onSetPhotos((prev) => [...prev, res.data.secure_url]);
      return axios.post(`${API_URL}/api/photos/${userId}/new`, {
        photoUrl: res.data.secure_url
      });
    });
  };

  const handleChange = (e) => {
    uploadImage(e.target.files[0]);
  };

  return (
    <div className="widget-container space-y-4">
      <div className="uploadfile-widget">
        <div className="file-uploaders">
          <FileUploader onChange={handleChange} />
        </div>
      </div>
      {urls.length > 0 && (
        <div className="flex space-x-3">
          {urls.map((url) => (
            <img key={url} src={url} className="h-[80px]" alt={url} />
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadFileWidget;
