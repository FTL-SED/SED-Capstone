import { useRef } from 'react'
import './AvatarUploadButton.css'

function AvatarUploadButton({ onFileSelected, uploading }) {
  const inputRef = useRef(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="avatar-upload-button__input"
        onChange={onFileSelected}
        hidden
      />
      <button
        className="avatar-upload-button"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "…" : "+"}
      </button>
    </>
  );
}

export default AvatarUploadButton;
