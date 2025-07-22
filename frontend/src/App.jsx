import React, { useState } from 'react';
import axios from 'axios';

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
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-950 min-h-screen text-white flex flex-col items-center justify-center p-6">
      <div className="backdrop-blur-md bg-white/10 border border-white/30 shadow-xl rounded-2xl px-6 py-10 w-full max-w-md text-center">
        <h1 className="text-3xl font-extrabold mb-4 text-white drop-shadow">
          📸 Smart Camera Upload
        </h1>

        <label className="w-full">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="bg-white/10 border border-white/20 rounded-xl py-3 px-6 text-white font-medium shadow backdrop-blur-sm cursor-pointer hover:scale-105 hover:bg-white/20 active:scale-95 transition-all">
            {uploading ? 'Uploading...' : '📷 Tap to Open Camera'}
          </div>
        </label>

        {message && (
          <p className="mt-4 text-sm text-white/80">{message}</p>
        )}

        {imageUrl && (
          <div className="mt-6">
            <img
              src={imageUrl}
              alt="Uploaded"
              className="w-64 h-auto rounded-lg mx-auto shadow-lg border border-white/20"
            />
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-blue-300 underline break-all hover:text-blue-400"
            >
              {imageUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
