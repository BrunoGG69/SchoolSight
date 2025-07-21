import React, { useState } from 'react';
import axios from 'axios';

const compressImage = (file, maxWidth) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      image.src = e.target.result;
    };

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scaleFactor = maxWidth / image.width;
      canvas.width = maxWidth;
      canvas.height = image.height * scaleFactor;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.7 // Compression quality
      );
    };

    image.onerror = (e) => reject("Image load error: " + e);
    reader.onerror = (e) => reject("File read error: " + e);
    reader.readAsDataURL(file);
  });
};

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
    setMessage("📉 Compressing...");

    try {
      const compressedBlob = await compressImage(file, 1024); // Resize to 1024px max width

      const formData = new FormData();
      formData.append("file", compressedBlob);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "captured_images");

      setMessage("☁️ Uploading to Cloudinary...");

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      if (res.data.secure_url) {
        setImageUrl(res.data.secure_url);
        setMessage("✅ Image uploaded successfully!");
        console.log("Image URL:", res.data.secure_url);
      } else {
        throw new Error("Upload failed: No URL returned.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setMessage("❌ Upload failed: " + (err.response?.data?.error?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold mb-6">Upload Classroom Photo</h1>

      <label className="w-full max-w-sm">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="w-full p-4 text-center border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400">
          {uploading ? "Uploading..." : "Tap to Open Camera"}
        </div>
      </label>

      {message && <p className="mt-4 text-sm">{message}</p>}

      {imageUrl && (
        <div className="mt-6 text-center">
          <img src={imageUrl} alt="Uploaded" className="w-64 h-auto rounded-md mx-auto shadow-lg" />
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-blue-400 underline break-all"
          >
            {imageUrl}
          </a>
        </div>
      )}
    </div>
  );
};

export default App;
