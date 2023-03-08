import React, { useState } from 'react';
import axios from 'axios';
import FileUploader from './FileUploader';
import './UploadFileWidget.css';

const UPLOAD_PRESET = 'fkvl2mpr';
const CLOUD_NAME = 'dji28yqki';
const FOLDER_NAME = 'Diggr';
const URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

// eslint-disable-next-line react/prop-types
const UploadFileWidget = ({ onSetPhotos }) => {
  const [urls, setUrls] = useState([]);
  const [fileUploaders, setFileUploaders] = useState([]);

  const uploadImage = (img) => {
    const data = new FormData();
    data.append('file', img);
    data.append('upload_preset', UPLOAD_PRESET);
    data.append('cloud_name', CLOUD_NAME);
    data.append('folder', FOLDER_NAME);

    axios.post(URL, data).then((res) => {
      setUrls((prev) => [...urls, res.data.secure_url]);
      onSetPhotos((prev) => [...prev, res.data.secure_url]);
    });
  };

  const handleOnAddImage = () => {
    if (fileUploaders.length < 5) {
      setFileUploaders((prev) => [...prev, true]);
    } else if (fileUploaders.filter((el) => el === true).length < 5) {
      const uploaders = fileUploaders.slice();
      let uploader = uploaders.find((el) => el === false);
      uploader = true;
      setFileUploaders(uploaders);
    }
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
            <img src={url} className="h-[80px]" />
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadFileWidget;
