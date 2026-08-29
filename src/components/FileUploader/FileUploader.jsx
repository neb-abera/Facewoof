import "./FileUploader.css";

const FileUploader = ({ onChange }) => {
  return (
    <div className="uploader">
      <label htmlFor="file" className="file">
        <input className="custom-file-input" type="file" onChange={onChange} />
      </label>
    </div>
  );
};

export default FileUploader;
