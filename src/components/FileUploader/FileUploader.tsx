import type { ChangeEventHandler } from "react";
import "./FileUploader.css";

const FileUploader = ({
  onChange,
}: {
  onChange: ChangeEventHandler<HTMLInputElement>;
}) => {
  return (
    <div className="uploader">
      <label htmlFor="file" className="file">
        <input
          id="file"
          className="custom-file-input"
          type="file"
          onChange={onChange}
        />
      </label>
    </div>
  );
};

export default FileUploader;
