import React, { useState } from 'react';
import axios from 'axios';
import './index.css'; // make sure this is here

const App = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setMessage("❌ No image selected.");
      return;
    }

    setUploading(true);
    setMessage("📤 Uploading...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("folder", "captured_images");

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      if (res.data.secure_url) {
        setImageUrl(res.data.secure_url);
        setMessage("✅ Image uploaded successfully.");
        console.log("Image URL:", res.data.secure_url);
      } else {
        throw new Error("Upload failed. No secure URL returned.");
      }
    } catch (err) {
      console.error("Upload error:", err.response?.data || err.message);
      setMessage("❌ Upload failed: " + (err.response?.data?.error?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>📸 Smart Camera Upload</h1>

      <label className="w-full max-w-sm">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div>{uploading ? "Uploading..." : "Tap to Open Camera"}</div>
      </label>

      {message && <p className="message">{message}</p>}

      {imageUrl && (
        <div className="mt-6 text-center">
          <img src={imageUrl} alt="Uploaded" className="uploaded" />
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="image-link"
          >
            {imageUrl}
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
