import React, { useState } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// ✅ Firebase Config using correct env variable names
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const App = () => {
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      setMessage("❌ No image selected.");
      return;
    }

    setUploading(true);
    setMessage("📤 Requesting signed upload...");

    try {
      const { data } = await axios.get('https://upload.brunogg.in/api/sign-uploads');
      const { signature, timestamp } = data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("folder", "captured_images");

      setMessage("📤 Uploading to Cloudinary...");

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      const secureUrl = res.data.secure_url;
      setImageUrl(secureUrl);
      setMessage("✅ Image uploaded.");

      const uploadedAt = new Date().toISOString();

      await addDoc(collection(db, 'uploads'), {
        image_url: secureUrl,
        uploaded_at: uploadedAt,
        user_id: 'anonymous',
        status: 'pending',
        processed_url: null,
      });

      setMessage("✅ Logged in Firestore.");
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
          📸 Smart Upload System
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
            {uploading ? 'Uploading...' : '📷 Tap to Capture'}
          </div>
        </label>

        {message && <p className="mt-4 text-sm text-white/80">{message}</p>}

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
