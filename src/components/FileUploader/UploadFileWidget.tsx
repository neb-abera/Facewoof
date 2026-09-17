import { type ChangeEvent, useState } from "react";
import { useAddPhoto, useUploadsOffered } from "../../queries";
import FileUploader from "./FileUploader";
import "./UploadFileWidget.css";
import { uploadToCloudinary } from "./cloudinary";

const UploadFileWidget = () => {
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addPhoto = useAddPhoto();
  const uploadsOffered = useUploadsOffered();

  const uploadImage = (img: File) => {
    setError(null);
    uploadToCloudinary(img)
      .then((url) => {
        // The original spread a stale `urls` into a functional update, so it
        // read the same snapshot twice and dropped uploads that overlapped.
        setUrls((prev) => [...prev, url]);
        return addPhoto.mutateAsync(url);
      })
      .catch((err: unknown) => {
        console.error("photo upload failed", err);
        setError("That photo could not be uploaded.");
      });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  /*
   * Cloudinary is optional, and when it is not configured this renders nothing
   * at all.
   *
   * It used to tell the visitor to "set VITE_CLOUD_NAME and VITE_UPLOAD_PRESET",
   * which is an instruction to whoever deploys the app, shown to whoever is
   * using it. Someone trying the demo cannot act on it and should not be asked
   * to read it.
   */
  if (!uploadsOffered) return null;

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
            <img
              key={url}
              src={url}
              // Height is fixed; the width follows the photo's own ratio,
              // which is not known until it arrives.
              height={80}
              className="h-[80px] w-auto"
              decoding="async"
              alt="Newly uploaded"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadFileWidget;
